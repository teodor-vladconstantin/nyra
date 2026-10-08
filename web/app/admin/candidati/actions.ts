"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";
import { triggerParse } from "@/lib/parser";
import { SENIORITY_LABELS } from "@/lib/experience";
import { hashFile } from "@/lib/duplicates";
import { eraseCandidate } from "@/lib/audit";
import { STATUS_LABELS, type Status } from "@/lib/candidates";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_RECENT_UPLOADS = 300; // plafon per organizație / 10 minute: oprește un script sau un dublu-click scăpat de sub control
const TYPES = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [0x50, 0x4b, 0x03, 0x04] }, // ZIP
} as const;

// duplicate = există deja un CV identic (același sha256); încărcarea se face oricum.
export type UploadResult = { ok: true; duplicate?: { id: string; name: string } } | { ok: false; error: string };

// Un fișier per apel: clientul le trimite în paralel și arată progresul pe fiecare.
export async function uploadCv(formData: FormData): Promise<UploadResult> {
  const { supabase, orgId } = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Fișier gol" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Mai mare de 10 MB" };
  const ext = file.name.split(".").pop()?.toLowerCase() as keyof typeof TYPES;
  const type = TYPES[ext];
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!type || !type.magic.every((b, i) => head[i] === b)) return { ok: false, error: "Doar PDF sau DOCX" };

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recent } = await supabase
    .from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since);
  if ((recent ?? 0) >= MAX_RECENT_UPLOADS) return { ok: false, error: "Prea multe încărcări; încearcă peste câteva minute" };

  const contentHash = await hashFile(file);
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { contentType: type.mime });
  if (upErr) {
    console.error("cv upload", upErr);
    return { ok: false, error: "Încărcarea a eșuat" };
  }
  const { data, error } = await supabase
    .from("candidates")
    .insert({ organization_id: orgId, file_name: file.name.slice(0, 255), cv_url: path, content_hash: contentHash })
    .select("id, duplicate_of")
    .single();
  if (error) {
    await supabase.storage.from("cvs").remove([path]);
    console.error("candidate insert", error);
    return { ok: false, error: "Salvarea a eșuat" };
  }
  await triggerParse(orgId, data.id);
  revalidatePath("/admin/candidati");
  if (!data.duplicate_of) return { ok: true };
  const { data: orig } = await supabase
    .from("candidates").select("name, file_name").eq("id", data.duplicate_of).eq("organization_id", orgId).maybeSingle();
  return { ok: true, duplicate: { id: data.duplicate_of, name: orig?.name ?? orig?.file_name ?? "un candidat existent" } };
}

export async function setStatus(candidateId: string, status: Status) {
  if (!(status in STATUS_LABELS)) throw new Error("Status invalid");
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId).eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/admin/candidati", "layout");
}

export async function setSeniority(candidateId: string, experienceId: string, level: string) {
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase
    .from("candidate_experiences")
    .update({ seniority_level: level in SENIORITY_LABELS ? level : null })
    .eq("id", experienceId)
    .eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath(`/admin/candidati/${candidateId}`);
}

export async function addNote(candidateId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidate_notes").insert({ organization_id: orgId, candidate_id: candidateId, body });
  if (error) throw error;
  redirect(`/admin/candidati/${candidateId}?tab=note&toast=Nota+a+fost+adăugată`);
}

export async function reparse(candidateId: string) {
  const { supabase, orgId } = await requireAdmin();
  await supabase.from("candidates")
    .update({ parsed_text: null, extracted_keywords: null, parsing_status: "pending" })
    .eq("id", candidateId).eq("organization_id", orgId);
  const sent = await triggerParse(orgId, candidateId);
  redirect(`/admin/candidati/${candidateId}?toast=${encodeURIComponent(sent ? "CV-ul a fost trimis la reprocesare" : "Serviciul de parsing nu răspunde")}${sent ? "" : "&type=error"}`);
}

// Ștergere completă (inclusiv fișierele), ex. la cererea candidatului (GDPR).
export async function deleteCandidate(candidateId: string) {
  const { supabase, orgId } = await requireAdmin();
  const { data: c } = await supabase
    .from("candidates").select("cv_url, preview_path").eq("id", candidateId).eq("organization_id", orgId).maybeSingle();
  if (!c) redirect("/admin/candidati");
  // erase_candidate șterge rândurile (cu rând 'erase' în jurnal) și întoarce fișierele din bucket.
  await eraseCandidate(supabase, candidateId);
  revalidatePath("/admin/candidati");
  redirect("/admin/candidati?toast=Candidatul+și+CV-ul+au+fost+șterse");
}
