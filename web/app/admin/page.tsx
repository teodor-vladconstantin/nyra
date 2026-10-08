import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, Inbox, Loader2, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/auto-refresh";
import { CANDIDATE_STATUS_LABELS, ParsingBadge, STATUS_DOT, StatusBadge, type CandidateStatus, type ParsingStatus } from "@/components/badges";
import { EmptyState, PageHeader } from "@/components/page-header";
import { DashboardSkeleton } from "@/components/shell/dashboard-skeleton";
import { getOrg } from "@/lib/org";
import { cn } from "@/lib/utils";

export const metadata = { title: "Panou" };

// Un CV „în procesare" mai vechi de atât e considerat blocat.
const STUCK_MINUTES = 15;
// ponytail: numărăm în aplicație pe cel mult 10.000 de rânduri; peste asta, trecem pe un RPC cu GROUP BY.
const SCAN_LIMIT = 10000;

const when = (d: string) => new Date(d).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const nf = new Intl.NumberFormat("ro-RO");

export default function AdminHome() {
  return (
    <>
      <PageHeader title="Panou" description="Situația curentă a candidaților și a procesării CV-urilor." />
      <Suspense fallback={<DashboardSkeleton />}>
        <Overview />
      </Suspense>
    </>
  );
}

async function Overview() {
  const { supabase, orgId, role } = await getOrg();
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();

  const [all, recent, stuck] = await Promise.all([
    supabase.from("candidates").select("status, parsing_status").eq("organization_id", orgId).limit(SCAN_LIMIT),
    supabase.from("candidates").select("id, name, file_name, status, parsing_status, created_at").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(6),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId)
      .in("parsing_status", ["pending", "processing"]).lt("created_at", cutoff),
  ]);
  if (all.error) throw all.error;
  if (recent.error) throw recent.error;
  if (stuck.error) throw stuck.error;

  const rows = all.data ?? [];
  const byStatus = new Map<string, number>();
  const byParsing = new Map<string, number>();
  for (const r of rows) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    byParsing.set(r.parsing_status, (byParsing.get(r.parsing_status) ?? 0) + 1);
  }
  const total = rows.length;
  const processing = (byParsing.get("pending") ?? 0) + (byParsing.get("processing") ?? 0);
  const review = byParsing.get("needs_review") ?? 0;
  const failed = byParsing.get("failed") ?? 0;
  const stuckCount = stuck.count ?? 0;

  if (total === 0) {
    return (
      <EmptyState
        icon={<Inbox />}
        title="Niciun CV încărcat încă"
        action={<Button asChild><Link href="/admin/candidati">Mergi la candidați <ArrowRight /></Link></Button>}
      >
        {role === "admin" ? "Încarcă primele CV-uri și vor apărea aici, cu datele extrase automat." : "Când un administrator încarcă CV-uri, le vei vedea aici."}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      <AutoRefresh active={processing > 0} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Candidați" value={total} icon={<FileText />} hint={total >= SCAN_LIMIT ? `Se afișează primii ${nf.format(SCAN_LIMIT)}` : "în total"} href="/admin/candidati" />
        <Kpi
          label="În procesare" value={processing} icon={<Loader2 className={processing ? "animate-spin" : ""} />}
          hint={stuckCount ? `${stuckCount} blocate de peste ${STUCK_MINUTES} min` : processing ? "se actualizează automat" : "coada e goală"}
          tone={stuckCount ? "warning" : undefined}
        />
        <Kpi
          label="Necesită revizuire" value={review} icon={<SearchCheck />} tone={review ? "warning" : undefined}
          hint={review ? "verifică datele extrase" : "nimic de verificat"}
          href={review ? "/admin/candidati?parsing=needs_review" : undefined}
        />
        <Kpi label="Eșuate" value={failed} icon={<AlertTriangle />} tone={failed ? "danger" : undefined} hint={failed ? "reîncarcă sau șterge fișierul" : "fără erori"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-heading">Pe statusuri</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(Object.keys(CANDIDATE_STATUS_LABELS) as CandidateStatus[]).map((s) => {
                const n = byStatus.get(s) ?? 0;
                return (
                  <li key={s}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{CANDIDATE_STATUS_LABELS[s]}</span>
                      <span className="tabular font-medium">{nf.format(n)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                      <div className={cn("h-full rounded-full transition-[width]", STATUS_DOT[s])} style={{ width: `${(n / total) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-heading">Încărcate recent</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/admin/candidati">Vezi toți <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="-mx-2 divide-y">
              {recent.data?.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/candidati/${c.id}`} className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name || c.file_name || "Candidat fără nume"}</p>
                      <p className="tabular truncate text-caption text-muted-foreground">
                        {c.name && c.file_name ? `${c.file_name} · ` : ""}{when(c.created_at)}
                      </p>
                    </div>
                    {c.parsing_status === "parsed"
                      ? <StatusBadge status={c.status} />
                      : <ParsingBadge status={c.parsing_status as ParsingStatus} />}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        {processing === 0 && failed === 0 && stuckCount === 0
          ? <><CheckCircle2 className="size-3.5 text-success" aria-hidden /> Procesarea funcționează normal.</>
          : <>Procesarea se actualizează automat cât timp există CV-uri în coadă.</>}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint, icon, href, tone }: {
  label: string; value: number; hint?: string; icon: React.ReactNode; href?: string; tone?: "warning" | "danger";
}) {
  const body = (
    <Card className={cn("h-full p-5 transition-colors", href && "hover:bg-accent/50")}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <span className={cn("[&_svg]:size-4", tone === "warning" && "text-warning", tone === "danger" && "text-danger")} aria-hidden>{icon}</span>
      </div>
      <p className="tabular mt-2 text-3xl font-bold tracking-tight text-brand">{nf.format(value)}</p>
      {hint && <p className={cn("mt-1 text-caption text-muted-foreground", tone === "warning" && "text-warning", tone === "danger" && "text-danger")}>{hint}</p>}
    </Card>
  );
  return href ? <Link href={href} className="block rounded-xl">{body}</Link> : body;
}
