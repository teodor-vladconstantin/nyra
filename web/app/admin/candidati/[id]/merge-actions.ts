"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";

const ERRORS: Record<string, string> = {
  merge_same_candidate: "Alege doi candidați diferiți",
  merge_not_found: "Unul dintre candidați nu mai există",
  merge_forbidden: "Doar adminii pot îmbina candidați",
};

// Îmbină `secondaryId` în `primaryId` (o singură funcție SQL, tranzacțională), apoi șterge fișierele secondarului.
// Erorile se întorc ca valoare; la succes redirecționează cu toast (spre fișa primarului sau înapoi la lista de duplicate).
export async function mergeCandidates(
  primaryId: string, secondaryId: string, to: "candidate" | "dedupe" = "candidate",
): Promise<{ ok: false; error: string }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("merge_candidates", { p_primary: primaryId, p_secondary: secondaryId });
  if (error) {
    const known = Object.keys(ERRORS).find((k) => error.message.includes(k));
    if (!known) console.error("merge candidates", error);
    return { ok: false, error: known ? ERRORS[known] : "Îmbinarea a eșuat" };
  }
  // Storage nu se poate șterge din SQL; dacă ștergerea eșuează, rămân doar fișiere orfane (fără date personale în tabele).
  const files = (data as { files?: string[] }).files ?? [];
  if (files.length) {
    const { error: rmErr } = await supabase.storage.from("cvs").remove(files);
    if (rmErr) console.error("merge: remove files", rmErr);
  }
  revalidatePath("/admin/candidati", "layout");
  const msg = encodeURIComponent("Candidații au fost îmbinați");
  redirect(to === "dedupe" ? `/admin/candidati/dedupe?toast=${msg}` : `/admin/candidati/${primaryId}?toast=${msg}`);
}
