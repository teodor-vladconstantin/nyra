"use server";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";
import { removeCvFiles } from "@/lib/audit";
import { adminClient } from "@/lib/supabase-admin";

const back = (msg: string, error = false) =>
  redirect(`/admin/setari?toast=${encodeURIComponent(msg)}${error ? "&type=error" : ""}`);

// Perioadă obligatorie, 1-24 de luni (implicit 12). Peste 12 luni, justificarea rămâne în sarcina recrutorului.
export async function setRetention(formData: FormData) {
  const months = Number(String(formData.get("months") ?? "").trim());
  if (!Number.isInteger(months) || months < 1 || months > 24) back("Perioada trebuie să fie între 1 și 24 de luni", true);
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.rpc("set_retention", { p_org: orgId, p_months: months });
  if (error) {
    console.error("set_retention", error);
    back("Perioada nu a putut fi salvată", true);
  }
  revalidatePath("/admin/setari");
  back(`Retenție setată: ${months} luni`);
}

// Șterge acum candidații expirați (altfel se șterg automat în fiecare zi): DB, apoi fișierele lor din bucket.
export async function purgeExpired() {
  const { supabase, orgId } = await requireAdmin();
  const { data, error } = await supabase.rpc("purge_expired_candidates", { p_org: orgId });
  if (error) {
    console.error("purge", error);
    back("Curățarea a eșuat", true);
  }
  const rows = (data ?? []) as { candidate_id: string; files: string[] }[];
  await removeCvFiles(supabase, rows.flatMap((r) => r.files));
  revalidatePath("/admin/candidati");
  back(rows.length ? `${rows.length} ${rows.length === 1 ? "candidat șters" : "candidați șterși"}` : "Nimic de șters");
}

// Contactul și nota de confidențialitate afișate candidaților pe pagina de aplicare.
export async function setNoticeSettings(formData: FormData) {
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.rpc("set_notice_settings", {
    p_org: orgId, p_email: String(formData.get("email") ?? ""), p_url: String(formData.get("url") ?? ""),
  });
  if (error) {
    console.error("set_notice_settings", error);
    back("Nu am putut salva: verifică emailul și linkul (trebuie să înceapă cu https://)", true);
  }
  revalidatePath("/admin/setari");
  back("Datele pentru candidați au fost salvate");
}

export async function markRequestHandled(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) back("Cerere invalidă", true);
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidate_requests").update({ handled_at: new Date().toISOString() }).eq("id", id).eq("organization_id", orgId);
  if (error) {
    console.error("request handled", error);
    back("Nu am putut marca cererea", true);
  }
  revalidatePath("/admin/setari");
  back("Cerere marcată ca rezolvată");
}

// Ștergerea contului: organizația cu toate datele ei, fișierele din bucket, apoi utilizatorul din Clerk. Ireversibilă.
export async function deleteAccount(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "STERGE") return back("Scrie STERGE pentru confirmare", true);
  const admin = adminClient();
  if (!admin) return back("Ștergerea nu este disponibilă momentan", true);

  const { data, error } = await supabase.rpc("delete_account");
  if (error) {
    console.error("delete_account", error);
    return back(/alți membri/.test(error.message) ? "Organizația are și alți membri; scoate-i înainte." : "Contul nu a putut fi șters", true);
  }
  const files = (data ?? []) as string[];
  for (let i = 0; i < files.length; i += 500) await removeCvFiles(admin, files.slice(i, i + 500));
  try {
    await (await clerkClient()).users.deleteUser(user.id);
  } catch (e) {
    console.error("clerk deleteUser", e); // datele din Nyra sunt deja șterse; contul Clerk se poate șterge și manual din dashboard
  }
  redirect(`/?toast=${encodeURIComponent("Contul și datele au fost șterse.")}`);
}
