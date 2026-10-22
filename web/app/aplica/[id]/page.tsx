import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyToJob } from "@/lib/apply";
import { cleanSource } from "@/lib/apply-source";
import { jobPostingJsonLd, toScriptJson } from "@/lib/job-posting";
import { createClient } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;
type PublicJob = { title: string; description: string; requirements: string; location: string; contract_type: string; company: string; posted_at: string; notice_url: string | null };
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyra.joben.eu";

async function loadJob(id: string) {
  if (!UUID.test(id)) notFound();
  const { data, error } = await createClient().rpc("public_job", { p_id: id });
  if (error) throw error;
  const job = (data as PublicJob[] | null)?.[0];
  if (!job) notFound();
  return job;
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const job = await loadJob(params.id);
  return { title: `${job.title} · ${job.company}`, description: `Aplică la ${job.title}, ${job.company}.` };
}

export default async function ApplyPage({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string; src?: string } }) {
  const job = await loadJob(params.id);
  const meta = [job.company, job.location, job.contract_type].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toScriptJson(jobPostingJsonLd({ id: params.id, ...job }, `${SITE}/aplica/${params.id}`)) }}
      />
      <header className="border-b border-border/60"><div className="mx-auto flex h-16 max-w-3xl items-center px-4"><Brand href="/" /></div></header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em]">{job.title}</h1>
          <p className="mt-2 text-muted-foreground">{meta}</p>
        </div>

        {(job.description || job.requirements) && (
          <div className="space-y-4 text-sm leading-relaxed">
            {job.description && <p className="whitespace-pre-line">{job.description}</p>}
            {job.requirements && (
              <div>
                <h2 className="mb-1 font-medium">Cerințe</h2>
                <p className="whitespace-pre-line text-muted-foreground">{job.requirements}</p>
              </div>
            )}
          </div>
        )}

        {searchParams.sent ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-card" role="status">
            <CheckCircle2 className="mt-0.5 size-5 text-brand" aria-hidden />
            <div>
              <h2 className="font-medium">Aplicația a fost trimisă</h2>
              <p className="mt-1 text-sm text-muted-foreground">Echipa {job.company} îți va scrie dacă profilul tău se potrivește.</p>
            </div>
          </div>
        ) : (
          <form action={applyToJob} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h2 className="text-lg font-semibold">Aplică</h2>
            <input type="hidden" name="job" value={params.id} />
            <input type="hidden" name="src" value={cleanSource(searchParams.src) ?? ""} />
            {/* Honeypot: ascuns pentru oameni și cititoare de ecran. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nume complet</Label>
              <Input id="name" name="name" required autoComplete="name" maxLength={200} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" maxLength={320} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (opțional)</Label>
                <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={50} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">CV (PDF sau DOCX, maximum 10 MB)</Label>
              <Input id="file" name="file" type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" name="consent" required className="mt-1 size-4 accent-primary" />
              <span>
                Am citit{" "}
                <Link href={`/aplica/${params.id}/informare`} target="_blank" className="text-brand underline-offset-4 hover:underline">informarea privind datele personale</Link>
                {" "}și sunt de acord ca {job.company} să îmi prelucreze datele din CV pentru acest proces de recrutare, cu ajutorul unui instrument care extrage și ordonează automat candidaturile (nicio decizie nu este luată automat).
              </span>
            </label>
            <SubmitButton pendingText="Se trimite…">Trimite aplicația</SubmitButton>
          </form>
        )}
        <p className="text-caption text-muted-foreground">
          Anunț ilegal sau înșelător?{" "}
          <a href={`mailto:hello@joben.eu?subject=${encodeURIComponent(`Raportare anunț ${params.id}`)}`} className="underline-offset-4 hover:underline">Raportează-l</a>.
        </p>
      </main>
    </div>
  );
}
