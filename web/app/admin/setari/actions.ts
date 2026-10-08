"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";
import { removeCvFiles } from "@/lib/audit";

const back = (msg: string, error = false) =>
  redirect(`/admin/setari?toast=${encodeURIComponent(msg)}${error ? "&type=error" : ""}`);

// Câmp gol = păstrare nelimitată.
export async function setRetention(formData: FormData) {
  const raw = String(formData.get("months") ?? "").trim();
  const months = raw === "" ? null : Number(raw);
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 120)) {
    back("Perioada trebuie să fie între 1 și 120 de luni", true);
  }
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.rpc("set_retention", { p_org: orgId, p_months: months });
  if (error) {
    console.error("set_retention", error);
    back("Perioada nu a putut fi salvată", true);
  }
  revalidatePath("/admin/setari");
  back(months === null ? "Păstrare nelimitată" : `Retenție setată: ${months} luni`);
}

// Șterge candidații expirați (DB), apoi fișierele lor din bucket.
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
