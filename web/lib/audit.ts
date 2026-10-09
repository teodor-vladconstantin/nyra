import type { SupabaseClient } from "@supabase/supabase-js";

// Etichete românești pentru jurnalul de activitate (nume de tabele și acțiuni din audit_log).
export const ENTITY_LABELS: Record<string, string> = {
  candidates: "Candidat",
  candidate_experiences: "Experiență",
  candidate_notes: "Notă",
  memberships: "Membru",
  organizations: "Organizație",
  tags: "Etichetă",
  candidate_tags: "Etichetă candidat",
  saved_filters: "Filtru salvat",
  jobs: "Job",
  job_candidates: "Candidat la job",
};

export const ACTION_LABELS: Record<string, string> = {
  insert: "Creat",
  update: "Modificat",
  delete: "Șters",
  export: "Exportat",
  purge: "Curățare retenție",
  erase: "Ștergere GDPR",
};

export type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, { old?: string; new?: string; redacted?: true } | number>;
  total: number;
};

// Rezumat scurt al modificărilor: „status: new → shortlisted", iar câmpurile personale apar doar ca nume.
export function summarizeChanges(changes: AuditRow["changes"], max = 4): string {
  const parts = Object.entries(changes).map(([k, v]) => {
    if (typeof v !== "object" || v === null) return `${k}: ${v}`;
    if (v.redacted) return `${k} (date personale)`;
    return v.old !== undefined && v.new !== undefined ? `${k}: ${v.old} → ${v.new}` : `${k}: ${v.new ?? v.old}`;
  });
  return parts.slice(0, max).join(" · ") + (parts.length > max ? ` · +${parts.length - max}` : "");
}

// Fișierele (CV + previzualizare) se șterg din bucket cu clientul userului: politica cv_delete cere rol de admin.
export async function removeCvFiles(supabase: SupabaseClient, files: string[]) {
  if (!files.length) return;
  const { error } = await supabase.storage.from("cvs").remove(files);
  if (error) console.error("cv remove", files.length, error);
}

// GDPR: șterge candidatul din DB (erase_candidate) și apoi fișierele lui din storage.
export async function eraseCandidate(supabase: SupabaseClient, candidateId: string) {
  const { data, error } = await supabase.rpc("erase_candidate", { p_id: candidateId });
  if (error) throw error;
  await removeCvFiles(supabase, (data ?? []) as string[]);
}
