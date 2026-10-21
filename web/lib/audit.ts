import type { SupabaseClient } from "@supabase/supabase-js";

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
