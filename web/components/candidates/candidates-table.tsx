"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Download, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/native-select";
import { ParsingBadge, type ParsingStatus } from "@/components/badges";
import { SENIORITY_LABELS } from "@/lib/experience";
import { STATUS_LABELS, type CandidateRow, type Status, type Tag } from "@/lib/candidates";
import { StatusSelect } from "@/app/admin/candidati/status-select";
import { bulkAddTag, bulkDelete, bulkSetStatus, exportSelected } from "@/app/admin/candidati/workflow-actions";
import { TagChips } from "./tag-chips";
import { TagMenu } from "./tag-menu";

const date = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function CandidatesTable({ rows, tags, isAdmin }: { rows: CandidateRow[]; tags: Tag[]; isAdmin: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  // Selecția trăiește doar cât pagina: rândurile dispărute (filtre, ștergere) ies din ea.
  const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
  const allOn = rows.length > 0 && ids.length === rows.length;
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  // Rulează o acțiune în masă: toast pe succes/eroare, selecția rămâne dacă a eșuat.
  const run = (job: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string, clear = false) =>
    start(async () => {
      const res = await job().catch(() => null);
      if (!res?.ok) return void toast.error(res?.error ?? "Acțiunea a eșuat. Încearcă din nou.");
      toast.success(done);
      if (clear) setSelected(new Set());
    });

  const download = () =>
    start(async () => {
      const res = await exportSelected(ids).catch(() => null);
      if (!res?.ok) return void toast.error(res?.error ?? "Exportul a eșuat");
      const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: res.filename });
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${plural(ids.length, "candidat exportat", "candidați exportați")}`);
    });

  return (
    <>
      {isAdmin && ids.length > 0 && (
        <div role="region" aria-label="Acțiuni pentru selecție" className="sticky top-[calc(var(--topbar-height)+0.5rem)] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-md">
          <span className="px-2 text-sm font-medium" aria-live="polite">{plural(ids.length, "selectat", "selectați")}</span>
          <NativeSelect
            aria-label="Schimbă statusul selecției"
            value=""
            disabled={pending}
            className="h-8 w-44 text-xs"
            onChange={(e) => {
              const status = e.target.value as Status;
              if (status) run(() => bulkSetStatus(ids, status), `Status „${STATUS_LABELS[status]}” pentru ${plural(ids.length, "candidat", "candidați")}`);
            }}
          >
            <option value="">Schimbă statusul…</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </NativeSelect>
          <TagMenu
            tags={tags}
            disabled={pending}
            onPick={(t) => run(() => bulkAddTag(ids, t.id), `Eticheta „${t.name}” a fost adăugată la ${plural(ids.length, "candidat", "candidați")}`)}
          />
          <Button variant="outline" size="sm" onClick={download} disabled={pending}><Download /> Exportă CSV</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={pending} className="text-destructive"><Trash2 /> Șterge</Button>
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Se lucrează" />}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelected(new Set())}><X /> Anulează selecția</Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Selectează toți candidații de pe pagină"
                    checked={allOn ? true : ids.length > 0 ? "indeterminate" : false}
                    onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())}
                  />
                </TableHead>
              )}
              <TableHead>Candidat</TableHead>
              <TableHead>Rol curent / ultim</TableHead>
              <TableHead className="text-right">Ani exp.</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>Locație</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Adăugat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="group relative" data-state={selected.has(r.id) ? "selected" : undefined}>
                {isAdmin && (
                  <TableCell className="relative z-10 w-10">
                    <Checkbox
                      aria-label={`Selectează ${r.name ?? r.file_name ?? "candidatul"}`}
                      checked={selected.has(r.id)}
                      onCheckedChange={(v) => toggle(r.id, v === true)}
                    />
                  </TableCell>
                )}
                <TableCell className="max-w-64">
                  <Link href={`/admin/candidati/${r.id}`} className="block truncate font-medium after:absolute after:inset-0 group-hover:underline">
                    {r.name ?? r.file_name ?? "Fără nume"}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">{r.email ?? r.file_name}</div>
                  {(r.duplicate_of || r.tags?.length > 0) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {r.duplicate_of && (
                        <Link
                          href={`/admin/candidati/${r.duplicate_of}`}
                          className="relative z-10 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning hover:underline"
                          title="Există deja un candidat cu același CV sau aceleași date de contact"
                        >
                          <Copy className="size-3" aria-hidden /> Posibil duplicat
                        </Link>
                      )}
                      <TagChips tags={r.tags} />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {r.last_role ? (
                    <>
                      <div>{r.last_role}</div>
                      <div className="text-xs text-muted-foreground">{r.last_company}</div>
                    </>
                  ) : (
                    <ParsingBadge status={r.parsing_status as ParsingStatus} />
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(r.years_experience) > 0 ? Number(r.years_experience).toLocaleString("ro-RO") : "—"}
                </TableCell>
                <TableCell>{r.seniority ? SENIORITY_LABELS[r.seniority as keyof typeof SENIORITY_LABELS] : "—"}</TableCell>
                <TableCell className="max-w-40 truncate">{r.location ?? "—"}</TableCell>
                <TableCell>
                  {isAdmin ? <StatusSelect key={`${r.id}:${r.status}`} id={r.id} value={r.status} /> : STATUS_LABELS[r.status]}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-muted-foreground">{date(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ștergi {plural(ids.length, "candidat", "candidați")}?</DialogTitle>
            <DialogDescription>
              Datele extrase, notele și fișierele CV se șterg definitiv. Acțiunea nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Renunță</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setConfirming(false);
                run(() => bulkDelete(ids), `${plural(ids.length, "candidat șters", "candidați șterși")}`, true);
              }}
            >
              Șterge definitiv
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
