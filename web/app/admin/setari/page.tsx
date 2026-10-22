import { Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ReplayTourButton } from "@/components/tour/replay-tour-button";
import { getOrg } from "@/lib/org";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { PurgeDialog } from "./purge-dialog";
import { markRequestHandled, setNoticeSettings, setRetention } from "./actions";

export const metadata = { title: "Setări" };

const ROLE_LABELS = { admin: "Admin", viewer: "Doar citire" } as const;
type Member = { user_id: string; email: string; role: keyof typeof ROLE_LABELS; created_at: string };
type Req = { id: string; kind: string; email: string; message: string; created_at: string };
const KIND_LABELS: Record<string, string> = {
  access: "Acces la date", erasure: "Ștergere", rectification: "Rectificare", withdraw_consent: "Retragerea acordului", other: "Altceva",
};

export default async function SettingsPage() {
  const { supabase, orgId, role } = await getOrg();
  const [{ data: org, error: orgErr }, { data: members, error: memErr }, { data: requests }] = await Promise.all([
    supabase.from("organizations").select("retention_months, privacy_email, candidate_notice_url").eq("id", orgId).single(),
    supabase.rpc("org_members", { p_org: orgId }),
    supabase.from("candidate_requests").select("id, kind, email, message, created_at").eq("organization_id", orgId).is("handled_at", null).order("created_at"),
  ]);
  if (orgErr) throw orgErr;
  if (memErr) throw memErr;

  const months: number = org.retention_months;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const soon = new Date(cutoff);
  soon.setDate(soon.getDate() + 30);
  const [{ count: expiredCount }, { count: soonCount }] = await Promise.all([
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId).lt("created_at", cutoff.toISOString()),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", cutoff.toISOString()).lt("created_at", soon.toISOString()),
  ]);
  const expired = expiredCount ?? 0;
  const expiring = soonCount ?? 0;
  const isAdmin = role === "admin";
  const alone = (members as Member[] | null)?.length === 1;
  const date = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <PageHeader title="Setări" description="Retenția datelor, informarea candidaților și contul" />

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
              Candidații mai vechi decât perioada aleasă sunt șterși automat în fiecare zi, cu tot cu CV, de la data adăugării lor. Perioada se poate seta între 1 și 24 de luni;
              12 luni e valoarea recomandată. Ce depășește durata procesului de recrutare trebuie să poți justifica în fața candidaților.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={setRetention} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="months">Perioadă de păstrare (luni)</Label>
                <Input id="months" name="months" type="number" inputMode="numeric" min={1} max={24} required defaultValue={months} className="w-40" disabled={!isAdmin} />
              </div>
              {isAdmin && <SubmitButton pendingText="Se salvează…"><Save /> Salvează</SubmitButton>}
            </form>

            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">Ștergere automată</p>
              <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
                {expiring === 0
                  ? "Niciun candidat nu expiră în următoarele 30 de zile."
                  : `${expiring} ${expiring === 1 ? "candidat va fi șters" : "candidați vor fi șterși"} în următoarele 30 de zile.`}
                {expired > 0 && ` ${expired} ${expired === 1 ? "candidat peste termen" : "candidați peste termen"} urmează să fie șterși la următoarea rulare.`}
              </p>
              {isAdmin && expired > 0 && <div className="mt-3"><PurgeDialog expired={expired} months={months} /></div>}
            </div>
            {!isAdmin && <p className="text-sm text-muted-foreground">Doar adminii pot schimba aceste setări.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informarea candidaților</CardTitle>
            <CardDescription>
              Pagina de aplicare afișează o notă de confidențialitate în numele organizației tale. Adaugă emailul la care candidații își pot exercita drepturile
              sau folosește propria notă (un link https://).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={setNoticeSettings} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email pentru date personale</Label>
                <Input id="email" name="email" type="email" maxLength={320} defaultValue={org.privacy_email ?? ""} placeholder="privacy@compania-ta.ro" disabled={!isAdmin} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url">Nota proprie de confidențialitate (opțional)</Label>
                <Input id="url" name="url" type="url" maxLength={258} defaultValue={org.candidate_notice_url ?? ""} placeholder="https://compania-ta.ro/confidentialitate" disabled={!isAdmin} />
              </div>
              {isAdmin && <SubmitButton pendingText="Se salvează…"><Save /> Salvează</SubmitButton>}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cereri ale candidaților</CardTitle>
            <CardDescription>
              Cereri trimise din pagina de informare (acces, ștergere, rectificare, retragerea acordului). Răspunde în cel mult o lună, după ce verifici identitatea persoanei.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!requests?.length ? (
              <EmptyState title="Nicio cerere deschisă">Cererile noi apar aici.</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Data</TableHead><TableHead>Tip</TableHead><TableHead>Email</TableHead><TableHead>Mesaj</TableHead>{isAdmin && <TableHead className="w-0" />}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {(requests as Req[]).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{date(r.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap">{KIND_LABELS[r.kind] ?? r.kind}</TableCell>
                        <TableCell className="max-w-[14rem] truncate">{r.email}</TableCell>
                        <TableCell className="max-w-[22rem] whitespace-pre-line text-sm">{r.message || "-"}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            <form action={markRequestHandled}>
                              <input type="hidden" name="id" value={r.id} />
                              <SubmitButton size="sm" variant="outline" pendingText="…">Rezolvat</SubmitButton>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Datele tale</CardTitle>
              <CardDescription>
                Exportă tot ce ai în Nyra (candidați, experiențe, note, evaluări, joburi, cereri) într-un fișier JSON, cu linkuri de descărcare a CV-urilor valabile 24 de ore.
                Sau șterge definitiv contul și datele.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button variant="outline" asChild><a href="/admin/gdpr/export-all"><Download /> Exportă toate datele</a></Button>
              <DeleteAccountDialog disabled={!alone} />
              {!alone && <p className="w-full text-sm text-muted-foreground">Contul se poate șterge doar când organizația are un singur membru.</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
