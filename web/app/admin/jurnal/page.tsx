import Link from "next/link";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/native-select";
import { EmptyState, PageHeader } from "@/components/page-header";
import { getOrg } from "@/lib/org";
import { ACTION_LABELS, ENTITY_LABELS, summarizeChanges, type AuditRow } from "@/lib/audit";

export const metadata = { title: "Jurnal de activitate" };
const PAGE = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Params = { entity?: string; actor?: string; from?: string; to?: string; page?: string };

export default async function AuditPage({ searchParams: sp }: { searchParams: Params }) {
  const { supabase, orgId } = await getOrg();
  const page = Math.max(1, Number(sp.page) || 1);
  const from = sp.from && DAY.test(sp.from) ? sp.from : null;
  const to = sp.to && DAY.test(sp.to) ? sp.to : null;
  const entity = sp.entity && sp.entity in ENTITY_LABELS ? sp.entity : null;
  const actor = sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor) ? sp.actor : null;

  const [{ data, error }, { data: members }] = await Promise.all([
    supabase.rpc("audit_feed", {
      p_org: orgId,
      p_entity: entity,
      p_actor: actor,
      p_from: from ? `${from}T00:00:00` : null,
      // „până la" e inclusiv: limita superioară e începutul zilei următoare
      p_to: to ? new Date(Date.parse(`${to}T00:00:00Z`) + 864e5).toISOString().slice(0, 19) : null,
      p_limit: PAGE,
      p_offset: (page - 1) * PAGE,
    }),
    supabase.rpc("org_members", { p_org: orgId }),
  ]);
  if (error) throw error;

  const rows = (data ?? []) as AuditRow[];
  const total = Number(rows[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const filtered = Boolean(entity || actor || from || to);
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)), ...extra }).toString();
  const when = (d: string) => new Date(d).toLocaleString("ro-RO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader title="Jurnal de activitate" description={`${total} ${total === 1 ? "eveniment" : "evenimente"}${filtered ? " găsite" : ""}`} />

      <form className="mb-6 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <div className="space-y-1.5">
          <Label htmlFor="entity">Tip</Label>
          <NativeSelect id="entity" name="entity" defaultValue={entity ?? ""}>
            <option value="">Toate</option>
            {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="actor">Utilizator</Label>
          <NativeSelect id="actor" name="actor" defaultValue={actor ?? ""}>
            <option value="">Toți</option>
            {(members ?? []).map((m: { user_id: string; email: string }) => <option key={m.user_id} value={m.user_id}>{m.email}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">De la</Label>
          <DatePicker id="from" name="from" defaultValue={from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Până la</Label>
          <DatePicker id="to" name="to" defaultValue={to} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Filtrează</Button>
          {filtered && <Button variant="ghost" asChild><Link href="/admin/jurnal">Resetează</Link></Button>}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText />} title={filtered ? "Niciun eveniment pentru filtrele alese" : "Încă nu există activitate"}>
          {filtered ? "Încearcă alt interval sau resetează filtrele." : "Modificările candidaților, notelor și echipei apar aici."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Când</TableHead><TableHead>Cine</TableHead><TableHead>Acțiune</TableHead>
                <TableHead>Tip</TableHead><TableHead>Detalii</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{when(r.created_at)}</TableCell>
                  <TableCell className="max-w-[14rem] truncate">{r.actor_email ?? <span className="text-muted-foreground">Sistem</span>}</TableCell>
                  <TableCell>{ACTION_LABELS[r.action] ?? r.action}</TableCell>
                  <TableCell>
                    {r.entity_type === "candidates" && r.entity_id && r.action !== "delete" && r.action !== "erase" ? (
                      <Link href={`/admin/candidati/${r.entity_id}`} className="underline-offset-4 hover:underline">{ENTITY_LABELS[r.entity_type]}</Link>
                    ) : (ENTITY_LABELS[r.entity_type] ?? r.entity_type)}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground" title={summarizeChanges(r.changes, 20)}>
                    {summarizeChanges(r.changes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginare">
          <span className="text-muted-foreground">Pagina {page} din {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button variant="outline" size="sm" asChild><Link href={`?${qs({ page: String(page - 1) })}`}><ChevronLeft /> Înapoi</Link></Button>}
            {page < pages && <Button variant="outline" size="sm" asChild><Link href={`?${qs({ page: String(page + 1) })}`}>Înainte <ChevronRight /></Link></Button>}
          </div>
        </nav>
      )}
    </>
  );
}
