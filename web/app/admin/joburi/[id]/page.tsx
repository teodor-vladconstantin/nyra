import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { getOrg } from "@/lib/org";
import { SENIORITY_LABELS } from "@/lib/experience";
import { JOB_STATUS, type Job, type JobMatch, type JobMatchDetail, type JobSemantic } from "@/lib/jobs";
import { deleteJob, embedJob, setJobStatus, toggleCandidate, updateJob } from "../actions";
import { JobForm } from "../job-form";

export const metadata = { title: "Job" };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function JobPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const { supabase, orgId, role } = await getOrg();
  const isAdmin = role === "admin";
  // Coloane explicite: embedding-ul (384 numere) nu trebuie să ajungă în componentele client.
  const [{ data: job, error }, { data: matches, error: mErr }, { data: semantic, error: sErr }, { data: embedded }] = await Promise.all([
    supabase.from("jobs").select("id, title, description, requirements, location, contract_type, keywords, status, public_apply, created_at")
      .eq("id", params.id).eq("organization_id", orgId).maybeSingle(),
    supabase.rpc("job_matches", { p_job: params.id, p_limit: 500 }),
    supabase.rpc("job_semantic_matches", { p_job: params.id, p_limit: 500 }),
    supabase.from("jobs").select("id").eq("id", params.id).eq("organization_id", orgId).not("embedding", "is", null).maybeSingle(),
  ]);
  if (error || mErr || sErr) throw error ?? mErr ?? sErr;
  if (!job) notFound();
  const j = job as Job;
  const sim = new Map(((semantic ?? []) as JobSemantic[]).map((s) => [s.candidate_id, s.similarity]));
  // Atașații primii, apoi cei mai apropiați semantic (dacă există), apoi după cuvintele cheie.
  const rows = ((matches ?? []) as JobMatch[])
    .sort((a, b) => Number(b.attached) - Number(a.attached) || (sim.get(b.candidate_id) ?? -1) - (sim.get(a.candidate_id) ?? -1) || b.matched - a.matched)
    .slice(0, 100);
  const attached = rows.filter((r) => r.attached).length;
  // Motivele scorului pentru rândurile afișate (cele 100 de mai sus), aceeași regulă ca job_matches.
  const { data: detailRows, error: dErr } = await supabase.rpc("job_match_detail", { p_job: params.id, p_candidates: rows.map((r) => r.candidate_id) });
  if (dErr) throw dErr;
  const detail = new Map(((detailRows ?? []) as JobMatchDetail[]).map((d) => [d.candidate_id, d]));

  return (
    <>
      <Link href="/admin/joburi" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Joburi
      </Link>
      <PageHeader
        title={j.title}
        description={[JOB_STATUS[j.status], j.location, j.contract_type].filter(Boolean).join(" · ")}
        actions={isAdmin ? (
          <>
            <form action={setJobStatus.bind(null, j.id, j.status === "active" ? "closed" : "active")}>
              <SubmitButton variant="outline">{j.status === "active" ? "Închide jobul" : "Redeschide"}</SubmitButton>
            </form>
            <form action={deleteJob.bind(null, j.id)}>
              <SubmitButton variant="outline" className="text-destructive">Șterge</SubmitButton>
            </form>
          </>
        ) : undefined}
      />

      {j.public_apply && (
        <p className="mb-6 rounded-lg border bg-card px-5 py-3 text-sm">
          Pagina publică de aplicare:{" "}
          <Link href={`/aplica/${j.id}`} target="_blank" className="break-all text-brand underline-offset-4 hover:underline">/aplica/{j.id}</Link>
          {j.status === "closed" && <span className="text-muted-foreground"> (jobul e închis, deci pagina nu mai primește aplicații)</span>}
        </p>
      )}

      {(j.description || j.requirements || j.keywords.length > 0) && (
        <div className="mb-6 space-y-3 rounded-lg border bg-card p-5 text-sm">
          {j.description && <p className="whitespace-pre-line">{j.description}</p>}
          {j.requirements && <p className="whitespace-pre-line text-muted-foreground">{j.requirements}</p>}
          {j.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {j.keywords.map((k) => <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-caption">{k}</span>)}
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <details className="group mb-6 rounded-lg border bg-card p-5">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Pencil className="size-4" /> Editează jobul
            <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-4 max-w-3xl"><JobForm action={updateJob.bind(null, j.id)} job={j} submit="Salvează" /></div>
        </details>
      )}

      <h2 className="mb-3 text-sm font-medium">
        Candidați potriviți <span className="text-muted-foreground">· {attached === 1 ? "1 atașat" : `${attached} atașați`}</span>
      </h2>
      {!embedded && isAdmin && (
        <form action={embedJob.bind(null, j.id)} className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          Potrivirea semantică nu e calculată pentru acest job.
          <SubmitButton size="sm" variant="outline" pendingText="Se calculează…">Calculează</SubmitButton>
        </form>
      )}
      <details className="mb-3 text-sm text-muted-foreground">
        <summary className="cursor-pointer">Cum e calculat scorul</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Cuvinte cheie:</b> câte dintre cuvintele cheie ale jobului apar în skills-urile extrase din CV. ✓ = găsit, ✗ = negăsit.</li>
          <li><b>Semantic:</b> cât de apropiat e textul CV-ului de descrierea jobului, de la 0 la 100%.</li>
          <li>Scorul ajută la ordonare, nu respinge pe nimeni: decizia o iei tu. Un ✗ poate însemna doar că skill-ul e formulat altfel în CV.</li>
        </ul>
      </details>
      {rows.length === 0 ? (
        <EmptyState title="Niciun candidat încă">Încarcă CV-uri la Candidați; apar aici clasate după potrivire.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead><TableHead>Rol curent</TableHead><TableHead>Experiență</TableHead>
                <TableHead>Status</TableHead><TableHead>Cuvinte cheie</TableHead><TableHead>Semantic</TableHead>{isAdmin && <TableHead className="w-0" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.candidate_id}>
                  <TableCell>
                    <Link href={`/admin/candidati/${r.candidate_id}`} className="font-medium underline-offset-4 hover:underline">{r.name ?? "(în procesare)"}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.last_role ?? "—"}{r.seniority ? ` · ${SENIORITY_LABELS[r.seniority as keyof typeof SENIORITY_LABELS] ?? r.seniority}` : ""}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{Number(r.years_experience) ? `${r.years_experience} ani` : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell>
                    <span className="tabular-nums">{r.total ? `${Math.round((r.matched / r.total) * 100)}% (${r.matched}/${r.total})` : "—"}</span>
                    {detail.get(r.candidate_id) && (
                      <div className="mt-1 flex max-w-xs flex-wrap gap-1">
                        {detail.get(r.candidate_id)!.matched.map((k) => (
                          <span key={k} className="rounded-full bg-primary/15 px-2 py-0.5 text-caption">✓ {k}</span>
                        ))}
                        {detail.get(r.candidate_id)!.missing.map((k) => (
                          <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">✗ {k}</span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{sim.has(r.candidate_id) ? `${Math.round(sim.get(r.candidate_id)! * 100)}%` : "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <form action={toggleCandidate.bind(null, j.id, r.candidate_id, r.attached)}>
                        <SubmitButton size="sm" variant={r.attached ? "secondary" : "outline"}>{r.attached ? "Atașat ✓" : "Atașează"}</SubmitButton>
                      </form>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
