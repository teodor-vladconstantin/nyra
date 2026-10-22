import { getOrg } from "@/lib/org";

// Exportul complet al organizației (portabilitate, schimbarea furnizorului): toate datele ca JSON, cu linkuri de descărcare
// a CV-urilor valabile 24 de ore. Doar adminii. Se înregistrează în auditul din baza de date.
const PAGE = 1000; // limita implicită PostgREST
const TABLES: [string, string[]][] = [
  ["candidates", ["created_at", "id"]], ["candidate_experiences", ["id"]], ["candidate_notes", ["id"]], ["candidate_scorecards", ["id"]],
  ["tags", ["id"]], ["candidate_tags", ["candidate_id", "tag_id"]], ["jobs", ["id"]], ["job_candidates", ["job_id", "candidate_id"]], ["candidate_requests", ["id"]],
]; // coloanele de ordonare: paginarea cere o ordine stabilă
const DERIVED = ["embedding", "search_tsv"]; // indexuri calculate, nu date ale persoanelor

export async function GET() {
  const { supabase, orgId, role } = await getOrg();
  if (role !== "admin") return new Response("Doar adminii pot exporta tot", { status: 403 });

  const out: Record<string, Record<string, unknown>[]> = {};
  for (const [table, order] of TABLES) {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from(table).select("*").eq("organization_id", orgId);
      for (const col of order) q = q.order(col);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) {
        console.error("export-all", table, error);
        return new Response("Exportul a eșuat", { status: 500 });
      }
      for (const r of data as Record<string, unknown>[]) for (const k of DERIVED) delete r[k];
      rows.push(...(data as Record<string, unknown>[]));
      if (data.length < PAGE) break;
    }
    out[table] = rows;
  }

  // Linkuri pentru originale (CV) și previzualizări, câte 200 odată.
  const withFile = out.candidates.filter((c) => c.cv_url);
  for (let i = 0; i < withFile.length; i += 200) {
    const batch = withFile.slice(i, i + 200);
    const { data } = await supabase.storage.from("cvs").createSignedUrls(batch.map((c) => c.cv_url as string), 86400);
    batch.forEach((c, j) => { c.cv_download_url = data?.[j]?.signedUrl ?? null; });
  }

  const { error } = await supabase.rpc("audit_event", { p_org: orgId, p_action: "export", p_entity_type: "organizations", p_entity_id: orgId });
  if (error) console.error("audit export-all", error);

  const exportedAt = new Date().toISOString();
  return new Response(JSON.stringify({ exported_at: exportedAt, cv_links_valid_hours: 24, ...out }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nyra-export-${exportedAt.slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
