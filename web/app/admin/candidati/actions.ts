"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";
import { triggerParse } from "@/lib/parser";
import { SENIORITY_LABELS } from "@/lib/experience";
import { eraseCandidate } from "@/lib/audit";
import { STATUS_LABELS, type Status } from "@/lib/candidates";
import { RECOMMENDATION, readScore } from "@/lib/scorecards";

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
  redirect(`/admin/candidati/${candidateId}?tab=note&toast=${encodeURIComponent("Nota a fost adăugată")}`);
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
  redirect(`/admin/candidati?toast=${encodeURIComponent("Candidatul și CV-ul au fost șterse")}`);
}

export async function addScorecard(candidateId: string, formData: FormData) {
  const technical = readScore(formData.get("technical"));
  const communication = readScore(formData.get("communication"));
  const culture = readScore(formData.get("culture"));
  const recommendation = String(formData.get("recommendation") ?? "");
  const back = `/admin/candidati/${candidateId}?tab=evaluari`;
  if (!technical || !communication || !culture || !(recommendation in RECOMMENDATION)) {
    redirect(`${back}&toast=${encodeURIComponent("Completează toate notele și recomandarea")}&type=error`);
  }
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 5000);
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidate_scorecards")
    .insert({ organization_id: orgId, candidate_id: candidateId, technical, communication, culture, recommendation, comment });
  if (error) throw error;
  redirect(`${back}&toast=${encodeURIComponent("Evaluarea a fost salvată")}`);
}

export async function deleteScorecard(candidateId: string, id: string) {
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidate_scorecards").delete().eq("id", id).eq("organization_id", orgId);
  if (error) throw error;
  redirect(`/admin/candidati/${candidateId}?tab=evaluari&toast=${encodeURIComponent("Evaluarea a fost ștearsă")}`);
}
