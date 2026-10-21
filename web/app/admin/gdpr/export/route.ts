import { getOrg } from "@/lib/org";

// Export al datelor unui candidat (dreptul de acces, GDPR): fișa, experiențele, notele și evaluările, ca JSON.
// Fiecare export se înregistrează în auditul din baza de date.
export async function GET(request: Request) {
  const { supabase, orgId } = await getOrg();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Identificator invalid", { status: 400 });

  const [cand, exp, notes, cards] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", id).eq("organization_id", orgId).maybeSingle(),
    supabase.from("candidate_experiences").select("*").eq("candidate_id", id).eq("organization_id", orgId).order("position"),
    supabase.from("candidate_notes").select("*").eq("candidate_id", id).eq("organization_id", orgId).order("created_at"),
    supabase.from("candidate_scorecards").select("*").eq("candidate_id", id).eq("organization_id", orgId).order("created_at"),
  ]);
  if (cand.error || exp.error || notes.error || cards.error) return new Response("Exportul a eșuat", { status: 500 });
  if (!cand.data) return new Response("Candidat inexistent", { status: 404 });

  const candidate = { ...cand.data, search_tsv: undefined, embedding: undefined }; // indexul de căutare și vectorul de matching sunt derivate, nu date ale candidatului
  const { error } = await supabase.rpc("audit_event", { p_org: orgId, p_action: "export", p_entity_type: "candidates", p_entity_id: id });
  if (error) console.error("audit export", error);

  const body = JSON.stringify({ exported_at: new Date().toISOString(), candidate, experiences: exp.data, notes: notes.data, scorecards: cards.data }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidat-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
