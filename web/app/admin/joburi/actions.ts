"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/org";
import { JOB_STATUS, parseKeywords, type JobStatus } from "@/lib/jobs";

const go = (path: string, msg: string, error = false) =>
  redirect(`${path}?toast=${encodeURIComponent(msg)}${error ? "&type=error" : ""}`);

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

function readJob(f: FormData, back: string) {
  const title = text(f, "title", 200);
  if (!title) go(back, "Titlul este obligatoriu", true);
  return {
    title,
    description: text(f, "description", 20000),
    requirements: text(f, "requirements", 20000),
    location: text(f, "location", 200),
    contract_type: text(f, "contract_type", 100),
    keywords: parseKeywords(String(f.get("keywords") ?? "")),
  };
}

export async function createJob(formData: FormData) {
  const row = readJob(formData, "/admin/joburi/nou");
  const { supabase, orgId } = await requireAdmin();
  const { data, error } = await supabase.from("jobs").insert({ organization_id: orgId, ...row }).select("id").single();
  if (error) {
    console.error("create job", error);
    go("/admin/joburi/nou", "Jobul nu a putut fi salvat", true);
  }
  revalidatePath("/admin/joburi");
  go(`/admin/joburi/${data!.id}`, "Jobul a fost creat");
}

export async function updateJob(id: string, formData: FormData) {
  const path = `/admin/joburi/${id}`;
  const row = readJob(formData, path);
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("jobs").update(row).eq("id", id).eq("organization_id", orgId);
  if (error) {
    console.error("update job", error);
    go(path, "Modificările nu au putut fi salvate", true);
  }
  revalidatePath("/admin/joburi", "layout");
  go(path, "Jobul a fost actualizat");
}

export async function setJobStatus(id: string, status: JobStatus) {
  if (!(status in JOB_STATUS)) throw new Error("Status invalid");
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("jobs").update({ status }).eq("id", id).eq("organization_id", orgId);
  if (error) throw error;
  revalidatePath("/admin/joburi", "layout");
}

export async function deleteJob(id: string) {
  const { supabase, orgId } = await requireAdmin();
  const { error } = await supabase.from("jobs").delete().eq("id", id).eq("organization_id", orgId);
  if (error) {
    console.error("delete job", error);
    go(`/admin/joburi/${id}`, "Jobul nu a putut fi șters", true);
  }
  revalidatePath("/admin/joburi");
  go("/admin/joburi", "Jobul a fost șters");
}

// Atașează candidatul la job dacă nu e atașat, altfel îl scoate.
export async function toggleCandidate(jobId: string, candidateId: string, attached: boolean) {
  const { supabase, orgId } = await requireAdmin();
  const q = attached
    ? supabase.from("job_candidates").delete().eq("job_id", jobId).eq("candidate_id", candidateId).eq("organization_id", orgId)
    : supabase.from("job_candidates").insert({ job_id: jobId, candidate_id: candidateId, organization_id: orgId });
  const { error } = await q;
  if (error) {
    console.error("toggle job candidate", error);
    go(`/admin/joburi/${jobId}`, "Acțiunea a eșuat", true);
  }
  revalidatePath(`/admin/joburi/${jobId}`);
}
