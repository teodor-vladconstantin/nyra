import { getOrg } from "@/lib/org";
import { candidatesQuery, csvName, toCsv, type CandidateRow, type Filters } from "@/lib/candidates";

const MAX_ROWS = 10000;

export async function GET(request: Request) {
  const { supabase, orgId } = await getOrg();
  const filters = Object.fromEntries(new URL(request.url).searchParams) as Filters;
  const { data, error } = await candidatesQuery(supabase, orgId, filters).range(0, MAX_ROWS - 1);
  if (error) return new Response("Exportul a eșuat", { status: 500 });

  return new Response(toCsv(data as unknown as CandidateRow[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
