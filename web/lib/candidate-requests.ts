"use server";
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase-admin";

// Cererile candidaților (acces, ștergere, rectificare, retragerea acordului) de pe pagina publică de informare.
// Scrie cu service_role, deci validează tot aici; organizația vine din job, niciodată din formular.
const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KINDS = ["access", "erasure", "rectification", "withdraw_consent", "other"];
const MAX_RECENT = 30; // plafon per organizație / 10 minute

export async function submitCandidateRequest(formData: FormData) {
  const jobId = String(formData.get("job") ?? "");
  if (!UUID.test(jobId)) redirect("/");
  const back = `/aplica/${jobId}/informare`;
  const done = (type: "success" | "error", msg: string) => redirect(`${back}?toast=${encodeURIComponent(msg)}&type=${type}`);

  if (String(formData.get("website") ?? "")) return done("success", "Cererea a fost trimisă."); // honeypot

  const kind = String(formData.get("kind") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const message = String(formData.get("message") ?? "").trim();
  if (!KINDS.includes(kind)) return done("error", "Alege tipul cererii.");
  if (!EMAIL.test(email) || email.length > 320) return done("error", "Adresa de email nu pare corectă.");
  if (message.length > 2000) return done("error", "Mesajul este prea lung (maximum 2000 de caractere).");

  const supabase = adminClient();
  if (!supabase) return done("error", "Cererea nu poate fi trimisă momentan. Scrie direct la adresa de contact.");
  const { data: job } = await supabase.from("jobs").select("organization_id").eq("id", jobId).eq("status", "active").eq("public_apply", true).maybeSingle();
  if (!job) return done("error", "Pagina nu mai este activă.");

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await supabase.from("candidate_requests").select("id", { count: "exact", head: true })
    .eq("organization_id", job.organization_id).gte("created_at", since);
  if ((count ?? 0) >= MAX_RECENT) return done("error", "Prea multe cereri în acest moment; încearcă peste câteva minute.");

  const { error } = await supabase.from("candidate_requests").insert({ organization_id: job.organization_id, kind, email, message });
  if (error) {
    console.error("candidate request", error);
    return done("error", "Cererea nu a putut fi trimisă. Încearcă din nou.");
  }
  return done("success", "Cererea a fost trimisă. Compania îți răspunde în cel mult o lună.");
}
