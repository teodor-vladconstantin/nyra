import { AppShell } from "@/components/shell/app-shell";
import { ProductTour } from "@/components/tour/product-tour";
import { getOrg } from "@/lib/org";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, orgId, role } = await getOrg();
  // Numele organizației e doar o etichetă în sidebar; dacă citirea eșuează, shell-ul se afișează fără ea.
  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
  // Turul apare doar dacă profilul există și nu l-a închis încă; la eroare sau fără profil nu apare.
  const { data: profile } = await supabase.from("profiles").select("tour_seen_at").eq("user_id", user.id).maybeSingle();
  return (
    <AppShell orgId={orgId} orgName={org?.name} email={user.email ?? ""} role={role}>
      {children}
      <ProductTour autoOpen={!!profile && profile.tour_seen_at === null} />
    </AppShell>
  );
}
