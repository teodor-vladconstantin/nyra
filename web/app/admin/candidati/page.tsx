import Link from "next/link";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader } from "@/components/page-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { CandidatesTable } from "@/components/candidates/candidates-table";
import { FilterForm } from "@/components/candidates/filter-form";
import { SavedFilters } from "@/components/candidates/saved-filters";
import { ViewToggle } from "@/components/candidates/view-toggle";
import { getOrg } from "@/lib/org";
import { candidatesQuery, cleanParams, isFiltered, loadFilterContext, type CandidateRow, type Filters } from "@/lib/candidates";
import { ImportCsv } from "./import-csv";
import { Upload } from "./upload";
import { markAllReviewed } from "./actions";

export const metadata = { title: "Candidați" };
const PAGE = 50;

export default async function CandidatesPage({ searchParams: sp }: { searchParams: Filters }) {
  const { supabase, orgId, role } = await getOrg();
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ data, count, error }, ctx] = await Promise.all([
    candidatesQuery(supabase, orgId, sp, { count: true }).range((page - 1) * PAGE, page * PAGE - 1),
    loadFilterContext(supabase, orgId),
  ]);
  if (error) throw error;
  const rows = data as unknown as CandidateRow[];

  const filtered = isFiltered(sp);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const current = cleanParams(sp as Record<string, unknown>);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(sp as Record<string, string>), ...extra }).toString();
  const processing = rows.some((r) => r.parsing_status === "pending" || r.parsing_status === "processing");

  return (
    <>
      <AutoRefresh active={processing} />
      <PageHeader
        title="Candidați"
        description={`${count ?? 0} ${count === 1 ? "candidat" : "candidați"}${filtered ? " găsiți" : ""}`}
        actions={
          <>
            <ViewToggle current="table" params={current} />
            {(count ?? 0) > 0 && (
              <Button variant="outline" asChild>
                <a href={`/admin/candidati/export?${qs({})}`} download><Download /> Export CSV</a>
              </Button>
            )}
          </>
        }
      />

      {role === "admin" && sp.parsing === "needs_review" && (count ?? 0) > 0 && (
        <form action={markAllReviewed} className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <p>După ce ai verificat datele extrase, scoate-i din această listă.</p>
          {Object.entries(current).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <SubmitButton variant="outline" pendingText="Se salvează…"><CheckCircle2 /> Marchează {count === 1 ? "candidatul" : `toți cei ${count}`} ca revizuiți</SubmitButton>
        </form>
      )}
      {role === "admin" && <Upload />}
      {role === "admin" && <ImportCsv />}

      <SavedFilters basePath="/admin/candidati" current={current} items={ctx.saved} />
      <FilterForm sp={sp} basePath="/admin/candidati" roleOptions={ctx.roleOptions} tags={ctx.tags} filtered={filtered} />

      {rows.length === 0 ? (
        <EmptyState icon={<FileText />} title={filtered ? "Niciun candidat nu corespunde filtrelor" : "Niciun CV încă"}>
          {filtered ? "Încearcă alt termen sau relaxează filtrele." : "Încarcă primele CV-uri mai sus; datele se extrag automat."}
        </EmptyState>
      ) : (
        <CandidatesTable rows={rows} tags={ctx.tags} isAdmin={role === "admin"} />
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginare">
          <span className="text-muted-foreground">Pagina {page} din {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button variant="outline" size="sm" asChild><Link href={`?${qs({ page: String(page - 1) })}`}>Înapoi</Link></Button>}
            {page < pages && <Button variant="outline" size="sm" asChild><Link href={`?${qs({ page: String(page + 1) })}`}>Înainte</Link></Button>}
          </div>
        </nav>
      )}
    </>
  );
}
