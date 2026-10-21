import { Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";
import { getOrg } from "@/lib/org";
import { PurgeDialog } from "./purge-dialog";
import { setRetention } from "./actions";

export const metadata = { title: "Setări" };

const ROLE_LABELS = { admin: "Admin", viewer: "Doar citire" } as const;
type Member = { user_id: string; email: string; role: keyof typeof ROLE_LABELS; created_at: string };

export default async function SettingsPage() {
  const { supabase, orgId, role } = await getOrg();
  const [{ data: org, error: orgErr }, { data: members, error: memErr }] = await Promise.all([
    supabase.from("organizations").select("retention_months").eq("id", orgId).single(),
    supabase.rpc("org_members", { p_org: orgId }),
  ]);
  if (orgErr) throw orgErr;
  if (memErr) throw memErr;

  const months: number | null = org.retention_months;
  let expired = 0;
  if (months) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const { count } = await supabase
      .from("candidates").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).lt("created_at", cutoff.toISOString());
    expired = count ?? 0;
  }
  const isAdmin = role === "admin";
  const date = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <PageHeader title="Setări" description="Retenția datelor și echipa care are acces" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tur ghidat</CardTitle>
            <CardDescription>Prezentarea secțiunilor Nyra și a modului în care lucrezi cu ele.</CardDescription>
          </CardHeader>
          <CardContent><ReplayTourButton /></CardContent>
        </Card>

        <Card data-tour="retention">
          <CardHeader>
            <CardTitle>Păstrarea datelor (GDPR)</CardTitle>
            <CardDescription>
              Candidații mai vechi decât perioada aleasă pot fi șterși definitiv, cu tot cu CV. Lasă câmpul gol pentru păstrare nelimitată.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={setRetention} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="months">Perioadă de păstrare (luni)</Label>
                <Input
                  id="months" name="months" type="number" inputMode="numeric" min={1} max={120}
                  defaultValue={months ?? ""} placeholder="nelimitat" className="w-40" disabled={!isAdmin}
                />
              </div>
              {isAdmin && <SubmitButton pendingText="Se salvează…"><Save /> Salvează</SubmitButton>}
            </form>

            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Candidați expirați</p>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {months === null
                  ? "Nu este setată o perioadă de păstrare."
                  : expired === 0
                    ? `Niciun candidat mai vechi de ${months} luni.`
                    : `${expired} ${expired === 1 ? "candidat" : "candidați"} mai vechi de ${months} luni.`}
              </p>
              {isAdmin && months !== null && <div className="mt-3"><PurgeDialog expired={expired} months={months} /></div>}
            </div>
            {!isAdmin && <p className="text-sm text-muted-foreground">Doar adminii pot schimba aceste setări.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Echipă</CardTitle>
            <CardDescription>Conturile cu acces la Nyra By Joben. Se administrează din Supabase.</CardDescription>
          </CardHeader>
          <CardContent>
            {!members?.length ? (
              <EmptyState title="Niciun membru">Adaugă rânduri în memberships pentru a da acces.</EmptyState>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Din</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {(members as Member[]).map((m) => (
                      <TableRow key={m.user_id}>
                        <TableCell className="max-w-[16rem] truncate">{m.email}</TableCell>
                        <TableCell>{ROLE_LABELS[m.role] ?? m.role}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{date(m.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
