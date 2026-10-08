"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/org";
import { validateContact, validateExperience, type FieldErrors } from "@/lib/experience";

// Rezultat pentru formulare: erorile pe câmp se afișează lângă input, restul în toast.
export type EditResult = { ok: true } | { ok: false; error?: string; errors?: FieldErrors };

const refresh = (candidateId: string) => {
  revalidatePath(`/admin/candidati/${candidateId}`);
  revalidatePath("/admin/candidati");
};

// `edited_manually` se setează în baza de date (trigger), deci și setSeniority din ../actions.ts marchează rândul.
export async function updateContact(candidateId: string, formData: FormData): Promise<EditResult> {
  const { supabase, orgId } = await requireAdmin();
  const v = validateContact(formData);
  if (!v.ok) return v;
  const { data, error } = await supabase.from("candidates").update(v.value)
    .eq("id", candidateId).eq("organization_id", orgId).select("id");
  if (error) {
    console.error("update contact", error);
    return { ok: false, error: "Datele nu au putut fi salvate" };
  }
  if (!data?.length) return { ok: false, error: "Candidatul nu mai există" };
  refresh(candidateId);
  return { ok: true };
}

// experienceId null = experiență nouă, pusă la sfârșitul listei.
export async function saveExperience(candidateId: string, experienceId: string | null, formData: FormData): Promise<EditResult> {
  const { supabase, orgId } = await requireAdmin();
  const v = validateExperience(formData);
  if (!v.ok) return v;
  if (experienceId) {
    const { data, error } = await supabase.from("candidate_experiences").update(v.value)
      .eq("id", experienceId).eq("candidate_id", candidateId).eq("organization_id", orgId).select("id");
    if (error) {
      console.error("update experience", error);
      return { ok: false, error: "Experiența nu a putut fi salvată" };
    }
    if (!data?.length) return { ok: false, error: "Experiența nu mai există" };
  } else {
    const { data: last } = await supabase.from("candidate_experiences").select("position")
      .eq("candidate_id", candidateId).eq("organization_id", orgId).order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("candidate_experiences")
      .insert({ ...v.value, organization_id: orgId, candidate_id: candidateId, position: (last?.position ?? -1) + 1 });
    if (error) {
      console.error("insert experience", error);
      return { ok: false, error: "Experiența nu a putut fi adăugată" };
    }
  }
  refresh(candidateId);
  return { ok: true };
}

export async function deleteExperience(candidateId: string, experienceId: string): Promise<EditResult> {
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("candidate_experiences").delete()
    .eq("id", experienceId).eq("candidate_id", candidateId).eq("organization_id", orgId);
  if (error) {
    console.error("delete experience", error);
    return { ok: false, error: "Experiența nu a putut fi ștearsă" };
  }
  refresh(candidateId);
  return { ok: true };
}
