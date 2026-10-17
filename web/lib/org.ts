import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase";

type Client = ReturnType<typeof createClient>;

// Organizația utilizatorului (prima după dată). Fără ea: sync_user() (preia contul vechi / creează profilul), apoi /onboarding.
export async function findMembership(supabase: Client, userId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Userul curent + organizația lui (o singură dată per request). Organizația nu apare în UI:
// e doar granița de acces din baza de date (RLS), iar orice query o filtrează explicit.
export const getOrg = cache(async () => {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const supabase = createClient();
  let m = await findMembership(supabase, userId);
  if (!m) {
    const { error } = await supabase.rpc("sync_user");
    if (error) throw error;
    m = await findMembership(supabase, userId);
  }
  if (!m) redirect("/onboarding");
  const email = typeof sessionClaims?.email === "string" ? sessionClaims.email : "";
  return { supabase, user: { id: userId, email }, orgId: m.organization_id as string, role: m.role as "admin" | "viewer" };
});

export async function requireAdmin() {
  const ctx = await getOrg();
  if (ctx.role !== "admin") throw new Error("Doar adminii pot face această acțiune.");
  return ctx;
}
