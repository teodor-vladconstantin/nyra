import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CopyCheck, Download, FileText, Mail, MapPin, Pencil, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/page-header";
import { ParsingBadge, type ParsingStatus } from "@/components/badges";
import { AutoRefresh } from "@/components/auto-refresh";
import { getOrg } from "@/lib/org";
import { EMPLOYMENT_LABELS, formatPeriod, type EmploymentType } from "@/lib/experience";
import { STATUS_LABELS, type Status } from "@/lib/candidates";
import { DUPLICATE_REASONS, duplicatesOf, type DuplicateKind } from "@/lib/duplicates";
import { addNote, addScorecard, deleteScorecard, reparse } from "../actions";
import { StatusSelect } from "../status-select";
import { ContactDialog } from "./contact-dialog";
import { DeleteButton } from "./delete-button";
import { DeleteExperience, ExperienceDialog, type ExperienceRow } from "./experience-dialog";
import { TagEditor } from "@/components/candidates/tag-editor";
import type { Tag } from "@/lib/candidates";
import { MergeDialog } from "./merge-dialog";
import { SenioritySelect } from "./seniority-select";
import { Scorecards } from "@/components/candidates/scorecards";
import type { Scorecard } from "@/lib/scorecards";

type Extracted = { skills?: string[]; education?: string[]; summary?: string } | null;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { supabase, orgId } = await getOrg();
  const { data } = await supabase.from("candidates").select("name, file_name").eq("id", params.id).eq("organization_id", orgId).maybeSingle();
  return { title: data?.name ?? data?.file_name ?? "Candidat" };
}

export default async function CandidatePage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const { supabase, orgId, role, user } = await getOrg();
  const { data: c } = await supabase
    .from("candidates")
    .select("id, name, email, phone, location, file_name, cv_url, preview_path, parsed_text, extracted_keywords, parsing_status, status, created_at, edited_manually, parse_error")
    .eq("id", params.id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!c) notFound();

  const previewPath = c.preview_path ?? (c.cv_url?.toLowerCase().endsWith(".pdf") ? c.cv_url : null);
  const [{ data: experiences }, { data: notes }, preview, original, dupGroups, { data: overview }, { data: allTags }, { data: cards }] = await Promise.all([
    supabase.from("candidate_experiences").select("*").eq("organization_id", orgId).eq("candidate_id", c.id).order("position"),
    supabase.from("candidate_notes").select("id, body, created_at").eq("organization_id", orgId).eq("candidate_id", c.id)
      .order("created_at", { ascending: false }),
    previewPath ? supabase.storage.from("cvs").createSignedUrl(previewPath, 900) : Promise.resolve({ data: null }),
    c.cv_url ? supabase.storage.from("cvs").createSignedUrl(c.cv_url, 900, { download: c.file_name ?? true }) : Promise.resolve({ data: null }),
    duplicatesOf(supabase, c.id),
    supabase.from("candidate_overview").select("tags").eq("id", c.id).eq("organization_id", orgId).maybeSingle(),
    supabase.from("tags").select("id, name, color").eq("organization_id", orgId).order("name"),
    supabase.from("candidate_scorecards").select("id, technical, communication, culture, recommendation, comment, author_id, created_at")
      .eq("organization_id", orgId).eq("candidate_id", c.id).order("created_at", { ascending: false }),
  ]);

  // Alți candidați care se potrivesc (același fișier / email / telefon), cu motivele combinate.
  const reasons = new Map<string, Set<DuplicateKind>>();
  for (const g of dupGroups) for (const id of g.candidate_ids) if (id !== c.id) reasons.set(id, (reasons.get(id) ?? new Set()).add(g.kind));
  const { data: others } = reasons.size
    ? await supabase.from("candidates").select("id, name, file_name, created_at").eq("organization_id", orgId)
        .in("id", Array.from(reasons.keys())).order("created_at")
    : { data: [] };

  const ex = c.extracted_keywords as Extracted;
  const parsing = c.parsing_status as ParsingStatus;
  const processing = parsing === "pending" || parsing === "processing";
  const isAdmin = role === "admin";
  const title = c.name ?? c.file_name ?? "Candidat";
  const fmt = (d: string) => new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
  const tab = ["experienta", "note", "evaluari", "text"].includes(searchParams.tab ?? "") ? searchParams.tab! : "experienta";

  return (
    <>
      <AutoRefresh active={processing} />
      <Link href="/admin/candidati" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Candidați
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {isAdmin ? <StatusSelect id={c.id} value={c.status as Status} className="text-sm" /> : <span className="text-sm">{STATUS_LABELS[c.status as Status]}</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="size-3.5" />{c.email}</a>}
            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="size-3.5" />{c.phone}</a>}
            {c.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{c.location}</span>}
            <span>Adăugat {fmt(c.created_at)}</span>
            {c.edited_manually && <EditedBadge />}
          </div>
          <div className="mt-2"><TagEditor candidateId={c.id} tags={(overview?.tags ?? []) as Tag[]} all={(allTags ?? []) as Tag[]} canEdit={role === "admin"} /></div>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-1">
            <ContactDialog candidate={c} />
            <Button asChild variant="outline" size="sm"><a href={`/admin/gdpr/export?id=${c.id}`}><Download /> Export date</a></Button>
            <form action={reparse.bind(null, c.id)}>
              <SubmitButton variant="outline" size="sm" pendingText="Se trimite…"><RefreshCw /> Reprocesează</SubmitButton>
            </form>
            <DeleteButton id={c.id} name={title} />
          </div>
        )}
      </div>

      {(others ?? []).length > 0 && (
        <section aria-labelledby="dup-title" className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <h2 id="dup-title" className="flex items-center gap-2 text-sm font-medium"><CopyCheck className="size-4" /> Posibil duplicat</h2>
          <ul className="mt-2 divide-y divide-warning/20">
            {others!.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <Link href={`/admin/candidati/${o.id}`} className="font-medium underline-offset-2 hover:underline">{o.name ?? o.file_name ?? "Candidat"}</Link>
                  <span className="text-muted-foreground"> · {Array.from(reasons.get(o.id)!, (k) => DUPLICATE_REASONS[k]).join(", ")}</span>
                </span>
                {isAdmin && (() => {
                  const side = (x: { id: string; name: string | null; file_name: string | null; created_at: string }) =>
                    ({ id: x.id, label: x.name ?? x.file_name ?? "Candidat", detail: `${x.file_name ?? "fără fișier"} · adăugat ${fmt(x.created_at)}` });
                  const [first, second] = new Date(o.created_at) < new Date(c.created_at) ? [o, c] : [c, o];
                  return <MergeDialog a={side(first)} b={side(second)} />;
                })()}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="order-2 flex h-[75vh] flex-col overflow-hidden lg:order-1 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium"><FileText className="size-4 shrink-0" /><span className="truncate">{c.file_name ?? "CV original"}</span></span>
            {original.data?.signedUrl && (
              <Button variant="ghost" size="sm" asChild><a href={original.data.signedUrl}><Download /> Descarcă</a></Button>
            )}
          </div>
          {preview.data?.signedUrl ? (
            <iframe src={`${preview.data.signedUrl}#view=FitH`} title={`CV ${title}`} className="w-full flex-1 bg-muted" />
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState icon={<FileText />} title={processing ? "Previzualizarea se generează" : "Previzualizare indisponibilă"}>
                CV-urile DOCX sunt convertite în PDF la procesare. Între timp poți descărca fișierul original.
              </EmptyState>
            </div>
          )}
        </Card>

        <div className="order-1 min-w-0 lg:order-2">
          <p className="mb-4 text-sm">Extragere date: <ParsingBadge status={parsing} /></p>
          {parsing === "needs_review" && (
            <p role="status" className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              Extragerea automată nu a reușit complet. Verifică CV-ul și corectează datele cu butoanele de editare.
            </p>
          )}
          {parsing === "failed" && (
            <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              {c.parse_error ?? "Procesarea a eșuat."} Încearcă „Reprocesează”; dacă persistă, fișierul poate fi scanat sau protejat.
            </p>
          )}

          <Tabs defaultValue={tab}>
            <TabsList className="mb-4">
              <TabsTrigger value="experienta">Experiență ({experiences?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="note">Note ({notes?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="evaluari">Evaluări ({cards?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="text">Text CV</TabsTrigger>
            </TabsList>

            <TabsContent value="experienta" className="space-y-5">
              {ex?.summary && <p className="text-sm text-muted-foreground">{ex.summary}</p>}
              {!!ex?.skills?.length && (
                <section>
                  <h2 className="mb-2 text-sm font-medium">Competențe</h2>
                  <ul className="flex flex-wrap gap-1.5">
                    {ex.skills.map((s) => <li key={s} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{s}</li>)}
                  </ul>
                </section>
              )}
              {isAdmin && !processing && <div className="flex justify-end"><ExperienceDialog candidateId={c.id} /></div>}
              {(experiences ?? []).length === 0 ? (
                <EmptyState title={processing ? "Se extrag datele din CV…" : "Nicio experiență găsită"}>
                  {processing ? "Durează de obicei sub un minut." : "CV-ul nu conține experiență profesională identificabilă. Poți adăuga una manual."}
                </EmptyState>
              ) : (
                <ol className="relative space-y-3 border-l pl-5" aria-label="Experiență profesională">
                  {experiences!.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[26px] top-4 size-2.5 rounded-full border-2 border-background bg-brand" aria-hidden />
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{e.role_title}</p>
                            <p className="text-sm text-muted-foreground">
                              {e.company_name}
                              {e.employment_type && ` · ${EMPLOYMENT_LABELS[e.employment_type as EmploymentType]}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatPeriod(e.start_date, e.end_date)}</p>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              <SenioritySelect candidateId={c.id} experienceId={e.id} value={e.seniority_level} />
                              <ExperienceDialog candidateId={c.id} experience={e as ExperienceRow} />
                              <DeleteExperience candidateId={c.id} experience={e as ExperienceRow} />
                            </div>
                          )}
                        </div>
                        {e.edited_manually && <div className="mt-1"><EditedBadge /></div>}
                        {e.description && <p className="mt-2 whitespace-pre-line text-sm">{e.description}</p>}
                        {(e.extracted_skills as string[]).length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1">
                            {(e.extracted_skills as string[]).map((s) => (
                              <li key={s} className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">{s}</li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    </li>
                  ))}
                </ol>
              )}
              {!!ex?.education?.length && (
                <section>
                  <h2 className="mb-1 text-sm font-medium">Educație</h2>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm">{ex.education.map((ed) => <li key={ed}>{ed}</li>)}</ul>
                </section>
              )}
            </TabsContent>

            <TabsContent value="note" className="space-y-4">
              {isAdmin && (
                <form key={notes?.length ?? 0} action={addNote.bind(null, c.id)} className="space-y-2">
                  <label htmlFor="note" className="sr-only">Notă nouă</label>
                  <Textarea id="note" name="body" required maxLength={5000} rows={3} placeholder="Notă internă, ex. „Sunat, disponibil din martie”" />
                  <SubmitButton size="sm" pendingText="Se salvează…">Adaugă nota</SubmitButton>
                </form>
              )}
              {(notes ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nicio notă încă.</p>
              ) : (
                <ul className="space-y-3">
                  {notes!.map((n) => (
                    <li key={n.id} className="rounded-lg border p-3 text-sm">
                      <p className="mb-1 text-xs text-muted-foreground">{fmt(n.created_at)}</p>
                      <p className="whitespace-pre-line">{n.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="evaluari">
              <Scorecards
                cards={(cards ?? []) as Scorecard[]} canEdit={isAdmin} me={user.id}
                add={addScorecard.bind(null, c.id)} remove={deleteScorecard.bind(null, c.id)}
              />
            </TabsContent>

            <TabsContent value="text">
              {c.parsed_text ? (
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 font-sans text-sm">{c.parsed_text}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">Textul nu a fost extras încă.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function EditedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground" title="Corectat de un utilizator; reprocesarea nu îl suprascrie">
      <Pencil className="size-3" aria-hidden /> Editat manual
    </span>
  );
}
