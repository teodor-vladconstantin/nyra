import type { SupabaseClient } from "@supabase/supabase-js";

// sha256 hex al fișierului (se trimite la upload ca `content_hash`); rulează pe server, unde `file` e un File/Blob.
export async function hashFile(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const DUPLICATE_REASONS = { hash: "același fișier", email: "același email", phone: "același telefon" } as const;
export type DuplicateKind = keyof typeof DUPLICATE_REASONS;
export type DuplicateGroup = { kind: DuplicateKind; key: string; candidate_ids: string[] };

// Candidatul existent cu același fișier (pentru avertizare la upload), sau null.
export async function findByHash(supabase: SupabaseClient, orgId: string, hash: string) {
  const { data } = await supabase.from("candidates").select("id, name, file_name")
    .eq("organization_id", orgId).eq("content_hash", hash).limit(1).maybeSingle();
  return data as { id: string; name: string | null; file_name: string | null } | null;
}

export async function duplicateGroups(supabase: SupabaseClient, orgId: string): Promise<DuplicateGroup[]> {
  const { data, error } = await supabase.rpc("find_duplicates", { p_org: orgId });
  if (error) throw error;
  return data as DuplicateGroup[];
}

export async function duplicatesOf(supabase: SupabaseClient, candidateId: string): Promise<DuplicateGroup[]> {
  const { data, error } = await supabase.rpc("candidate_duplicates", { p_id: candidateId });
  if (error) throw error;
  return data as DuplicateGroup[];
}

// Un candidat apare în mai multe grupuri (hash + email...): le contopim pe componente conexe,
// ca fiecare persoană să fie într-un singur grup, cu motivele combinate.
export function mergeGroups(groups: DuplicateGroup[]): { ids: string[]; reasons: DuplicateKind[] }[] {
  const parent = new Map<string, string>();
  const find = (x: string) => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; return r; };
  for (const g of groups) for (const id of g.candidate_ids) if (!parent.has(id)) parent.set(id, id);
  for (const g of groups) for (const id of g.candidate_ids.slice(1)) parent.set(find(id), find(g.candidate_ids[0]));
  const out = new Map<string, { ids: Set<string>; reasons: Set<DuplicateKind> }>();
  for (const g of groups) {
    const root = find(g.candidate_ids[0]);
    const o = out.get(root) ?? { ids: new Set(), reasons: new Set() };
    g.candidate_ids.forEach((i) => o.ids.add(i));
    o.reasons.add(g.kind);
    out.set(root, o);
  }
  return Array.from(out.values(), (o) => ({ ids: Array.from(o.ids), reasons: Array.from(o.reasons) }));
}
