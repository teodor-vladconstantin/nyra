"use server";
import { redirect } from "next/navigation";
import { cleanSource } from "@/lib/apply-source";
import { checkCv } from "@/lib/cv-file";
import { hashFile } from "@/lib/duplicates";
import { triggerParse } from "@/lib/parser";
import { adminClient } from "@/lib/supabase-admin";

// Aplicare publică la un job -> candidat nou (source = 'apply') atașat jobului. Scrie cu service_role, deci validează tot aici;
// organizația vine din job, niciodată din formular.
const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_RECENT_APPLICATIONS = 60; // plafon per organizație / 10 minute, ca să nu fie inundată de un script

export async function applyToJob(formData: FormData) {
  const jobId = String(formData.get("job") ?? "");
  if (!UUID.test(jobId)) redirect("/");
  const back = `/aplica/${jobId}`;
  const src = cleanSource(formData.get("src"));
  const done = (type: "success" | "error", msg: string, extra = "") =>
    redirect(`${back}?${extra}${type === "error" && src ? `src=${src}&` : ""}toast=${encodeURIComponent(msg)}&type=${type}`);

  // Honeypot: boții completează câmpul ascuns; le răspundem ca la succes, fără să salvăm nimic.
  if (String(formData.get("website") ?? "")) return done("success", "Aplicația a fost trimisă.", "sent=1&");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || name.length > 200) return done("error", "Completează numele.");
  if (!EMAIL.test(email) || email.length > 320) return done("error", "Adresa de email nu pare corectă.");
  if (phone.length > 50) return done("error", "Numărul de telefon este prea lung.");
  if (formData.get("consent") !== "on") return done("error", "Trebuie să accepți prelucrarea datelor.");

  const cv = formData.get("file");
  const checked = await checkCv(cv);
  if ("error" in checked) return done("error", checked.error);
  const file = cv as File;

  const supabase = adminClient();
  if (!supabase) {
    console.error("apply: lipsește SUPABASE_SERVICE_ROLE_KEY");
    return done("error", "Aplicarea nu este disponibilă momentan.");
  }
  const { data: job } = await supabase.from("jobs").select("organization_id")
    .eq("id", jobId).eq("status", "active").eq("public_apply", true).maybeSingle();
  if (!job) return done("error", "Jobul nu mai primește aplicații.");
  const orgId = job.organization_id as string;

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recent } = await supabase.from("candidates").select("id", { count: "exact", head: true })
    .eq("organization_id", orgId).eq("source", "apply").gte("created_at", since);
  if ((recent ?? 0) >= MAX_RECENT_APPLICATIONS) return done("error", "Prea multe aplicații în acest moment; încearcă peste câteva minute.");

  const path = `${orgId}/${crypto.randomUUID()}.${checked.ext}`;
  const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { contentType: checked.mime });
  if (upErr) {
    console.error("apply upload", upErr);
    return done("error", "Încărcarea CV-ului a eșuat. Încearcă din nou.");
  }
  const { data: cand, error } = await supabase.from("candidates").insert({
    organization_id: orgId, name, email, phone: phone || null, file_name: file.name.slice(0, 255), cv_url: path,
    content_hash: await hashFile(file), source: "apply", apply_source: src, consent_at: new Date().toISOString(),
  }).select("id").single();
  if (error) {
    await supabase.storage.from("cvs").remove([path]);
    console.error("apply insert", error);
    return done("error", "Aplicația nu a putut fi salvată. Încearcă din nou.");
  }
  const { error: linkErr } = await supabase.from("job_candidates").insert({ job_id: jobId, candidate_id: cand.id, organization_id: orgId });
  if (linkErr) console.error("apply attach", linkErr); // candidatul e salvat; recruiterul îl poate atașa manual
  await triggerParse(orgId, cand.id);
  return done("success", "Aplicația a fost trimisă. Mulțumim!", "sent=1&");
}
