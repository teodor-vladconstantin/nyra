"use server";
import { revalidatePath } from "next/cache";
import { getOrg, requireAdmin } from "@/lib/org";
import {
  STATUS_LABELS, TAG_COLORS, UUID, candidatesQuery, cleanParams, csvName, toCsv,
  type CandidateRow, type Filters, type Status, type Tag, type TagColor,
} from "@/lib/candidates";

// Acțiuni de flux (în masă, etichete, filtre salvate). Ca în actions.ts: rolul se verifică pe server,
// iar fiecare query e limitat explicit la organizația userului (RLS e a doua plasă de siguranță).
const MAX_BULK = 500;

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function pickIds(ids: string[]): string[] | null {
  const clean = Array.from(new Set(ids.filter((i) => UUID.test(i))));
  return clean.length && clean.length <= MAX_BULK ? clean : null;
}
const BAD_IDS = { ok: false, error: `Selectează între 1 și ${MAX_BULK} candidați` } as const;
const refresh = () => revalidatePath("/admin/candidati", "layout");

export async function bulkSetStatus(ids: string[], status: Status): Promise<Result<{ count: number }>> {
  const list = pickIds(ids);
  if (!list) return BAD_IDS;
  if (!(status in STATUS_LABELS)) return { ok: false, error: "Status invalid" };
  const { supabase, orgId } = await requireAdmin();
  const { data, error } = await supabase.from("candidates").update({ status }).in("id", list).eq("organization_id", orgId).select("id");
  if (error) return { ok: false, error: "Statusul nu a putut fi schimbat" };
  refresh();
  return { ok: true, count: data.length };
}

export async function bulkAddTag(ids: string[], tagId: string): Promise<Result<{ count: number }>> {
  const list = pickIds(ids);
  if (!list || !UUID.test(tagId)) return BAD_IDS;
  const { supabase, orgId } = await requireAdmin();
  // Candidații se verifică întâi în organizație; FK-ul compus din candidate_tags face același lucru pentru etichetă.
  const { data: own } = await supabase.from("candidates").select("id").in("id", list).eq("organization_id", orgId);
  if (!own?.length) return BAD_IDS;
  const { error } = await supabase
    .from("candidate_tags")
    .upsert(own.map((c) => ({ organization_id: orgId, candidate_id: c.id, tag_id: tagId })), { onConflict: "candidate_id,tag_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Eticheta nu a putut fi adăugată" };
  refresh();
  return { ok: true, count: own.length };
}

export async function bulkDelete(ids: string[]): Promise<Result<{ count: number }>> {
  const list = pickIds(ids);
  if (!list) return BAD_IDS;
  const { supabase, orgId } = await requireAdmin();
  const { data: rows } = await supabase.from("candidates").select("id, cv_url, preview_path").in("id", list).eq("organization_id", orgId);
  if (!rows?.length) return BAD_IDS;
  const { error } = await supabase.from("candidates").delete().in("id", rows.map((r) => r.id)).eq("organization_id", orgId);
  if (error) return { ok: false, error: "Ștergerea a eșuat" };
  // Fișierele se șterg după rânduri: dacă ștergerea din DB eșuează, CV-urile rămân vizibile.
  const files = Array.from(new Set(rows.flatMap((r) => [r.cv_url, r.preview_path]).filter(Boolean))) as string[];
  if (files.length) await supabase.storage.from("cvs").remove(files);
  refresh();
  return { ok: true, count: rows.length };
}

export async function exportSelected(ids: string[]): Promise<Result<{ csv: string; filename: string }>> {
  const list = pickIds(ids);
  if (!list) return BAD_IDS;
  const { supabase, orgId } = await requireAdmin();
  const { data, error } = await candidatesQuery(supabase, orgId, {}).in("id", list);
  if (error) return { ok: false, error: "Exportul a eșuat" };
  return { ok: true, csv: toCsv(data as unknown as CandidateRow[]), filename: csvName() };
}

// ---------- Etichete ----------
export async function createTag(name: string, color: TagColor): Promise<Result<{ tag: Tag }>> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean || clean.length > 40) return { ok: false, error: "Numele are între 1 și 40 de caractere" };
  if (!(color in TAG_COLORS)) return { ok: false, error: "Culoare invalidă" };
  const { supabase, orgId } = await requireAdmin();
  const { data, error } = await supabase.from("tags").insert({ organization_id: orgId, name: clean, color }).select("id, name, color").single();
  if (error) return { ok: false, error: error.code === "23505" ? "Există deja o etichetă cu acest nume" : "Eticheta nu a putut fi creată" };
  refresh();
  return { ok: true, tag: data as Tag };
}

export async function setCandidateTag(candidateId: string, tagId: string, on: boolean): Promise<Result> {
  if (!UUID.test(candidateId) || !UUID.test(tagId)) return { ok: false, error: "Date invalide" };
  const { supabase, orgId } = await requireAdmin();
  const { error } = on
    ? await supabase.from("candidate_tags").upsert(
        { organization_id: orgId, candidate_id: candidateId, tag_id: tagId },
        { onConflict: "candidate_id,tag_id", ignoreDuplicates: true },
      )
    : await supabase.from("candidate_tags").delete().eq("candidate_id", candidateId).eq("tag_id", tagId).eq("organization_id", orgId);
  if (error) return { ok: false, error: "Eticheta nu a putut fi salvată" };
  refresh();
  return { ok: true };
}

// ---------- Filtre salvate: personale, deci le poate folosi orice membru (și viewer-ul) ----------
export async function saveFilter(name: string, params: Filters): Promise<Result> {
  const clean = name.trim();
  if (!clean || clean.length > 60) return { ok: false, error: "Numele are între 1 și 60 de caractere" };
  const cleaned = cleanParams(params as Record<string, unknown>);
  if (!Object.keys(cleaned).length) return { ok: false, error: "Nu există filtre de salvat" };
  const { supabase, orgId, user } = await getOrg();
  const { error } = await supabase.from("saved_filters").insert({ organization_id: orgId, user_id: user.id, name: clean, params: cleaned });
  if (error) return { ok: false, error: error.code === "23505" ? "Ai deja un filtru cu acest nume" : "Filtrul nu a putut fi salvat" };
  refresh();
  return { ok: true };
}

export async function deleteFilter(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Date invalide" };
  const { supabase, orgId, user } = await getOrg();
  const { error } = await supabase.from("saved_filters").delete().eq("id", id).eq("organization_id", orgId).eq("user_id", user.id);
  if (error) return { ok: false, error: "Filtrul nu a putut fi șters" };
  refresh();
  return { ok: true };
}
