import { AppShell } from "@/components/shell/app-shell";
import { getOrg } from "@/lib/org";
import { logout } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, orgId, role } = await getOrg();
  // Numele organizației e doar o etichetă în sidebar; dacă citirea eșuează, shell-ul se afișează fără ea.
  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle();
  return (
    <AppShell orgId={orgId} orgName={org?.name} email={user.email ?? ""} role={role} logout={logout}>
      {children}
    </AppShell>
  );
}
