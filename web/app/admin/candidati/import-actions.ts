"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/org";
import { MAX_IMPORT_BYTES, readImport } from "@/lib/csv-import";

export type ImportResult =
  | { ok: true; imported: number; duplicates: number; skipped: string[] }
  | { ok: false; error: string };

// Candidați din CSV, fără CV: intră ca „parsed” (nu au ce parsa), cu skills în extracted_keywords ca să conteze la potrivirea cu joburile.
export async function importCandidates(formData: FormData): Promise<ImportResult> {
  const { supabase, orgId } = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Alege un fișier CSV." };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: "Fișierul depășește 1 MB." };

  const { rows, skipped, error } = readImport(await file.text());
  if (error) return { ok: false, error };
  if (rows.length === 0) return { ok: false, error: "Niciun rând valid de importat." };

  const { data, error: dbErr } = await supabase.from("candidates").insert(rows.map((r) => ({
    organization_id: orgId, name: r.name, email: r.email, phone: r.phone, location: r.location,
    source: "import", parsing_status: "parsed", extracted_keywords: r.skills.length ? { skills: r.skills } : null,
  }))).select("duplicate_of");
  if (dbErr) {
    console.error("import candidates", dbErr);
    return { ok: false, error: "Importul a eșuat; nu s-a salvat nimic." };
  }
  revalidatePath("/admin/candidati");
  return { ok: true, imported: data.length, duplicates: data.filter((c) => c.duplicate_of).length, skipped };
}
