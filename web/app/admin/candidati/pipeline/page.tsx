import { KanbanSquare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { AutoRefresh } from "@/components/auto-refresh";
import { FilterForm } from "@/components/candidates/filter-form";
import { Kanban } from "@/components/candidates/kanban";
import { SavedFilters } from "@/components/candidates/saved-filters";
import { ViewToggle } from "@/components/candidates/view-toggle";
import { getOrg } from "@/lib/org";
import { candidatesQuery, cleanParams, isFiltered, loadFilterContext, type CandidateRow, type Filters } from "@/lib/candidates";

export const metadata = { title: "Pipeline" };
const LIMIT = 300; // câte carduri încarcă tabloul; peste asta se cere restrângerea filtrelor

export default async function PipelinePage({ searchParams }: { searchParams: Filters }) {
  const { supabase, orgId, role } = await getOrg();
  // Coloanele sunt statusurile, deci filtrul de status nu se aplică aici.
  const sp: Filters = { ...searchParams, status: undefined, page: undefined };

  const [{ data, count, error }, ctx] = await Promise.all([
    candidatesQuery(supabase, orgId, sp, { count: true }).range(0, LIMIT - 1),
    loadFilterContext(supabase, orgId),
  ]);
  if (error) throw error;
  const rows = data as unknown as CandidateRow[];

  const filtered = isFiltered(sp);
  const current = cleanParams(sp as Record<string, unknown>);
  const processing = rows.some((r) => r.parsing_status === "pending" || r.parsing_status === "processing");

  return (
    <>
      <AutoRefresh active={processing} />
      <PageHeader
        title="Pipeline"
        description={`${count ?? 0} ${count === 1 ? "candidat" : "candidați"}${filtered ? " găsiți" : ""}${role === "admin" ? ". Trage cardurile între coloane pentru a schimba statusul." : ""}`}
        actions={<ViewToggle current="pipeline" params={current} />}
      />
      <SavedFilters basePath="/admin/candidati/pipeline" current={current} items={ctx.saved} />
      <FilterForm sp={sp} basePath="/admin/candidati/pipeline" roleOptions={ctx.roleOptions} tags={ctx.tags} filtered={filtered} showStatus={false} />
      {rows.length === 0 ? (
        <EmptyState icon={<KanbanSquare />} title={filtered ? "Niciun candidat nu corespunde filtrelor" : "Niciun candidat încă"}>
          {filtered ? "Încearcă alt termen sau relaxează filtrele." : "Încarcă primele CV-uri din vizualizarea Tabel; apoi le poți muta aici între etape."}
        </EmptyState>
      ) : (
        <Kanban rows={rows} total={count ?? rows.length} isAdmin={role === "admin"} />
      )}
    </>
  );
}
