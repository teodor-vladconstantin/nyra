import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase";

// Userul curent + organizația lui (o singură dată per request). Organizația nu apare în UI:
// e doar granița de acces din baza de date (RLS), iar orice query o filtrează explicit.
export const getOrg = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: m, error } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!m) throw new Error("Contul nu are acces la Nyra By Joben (lipsește rândul din memberships).");
  return { supabase, user, orgId: m.organization_id as string, role: m.role as "admin" | "viewer" };
});

export async function requireAdmin() {
  const ctx = await getOrg();
  if (ctx.role !== "admin") throw new Error("Doar adminii pot face această acțiune.");
  return ctx;
}
