"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Filters } from "@/lib/candidates";
import { deleteFilter, saveFilter } from "@/app/admin/candidati/workflow-actions";

export type SavedFilter = { id: string; name: string; params: Record<string, string> };

// Filtrele salvate sunt personale. Aplicarea e un simplu link: aceleași query params ca formularul de căutare.
export function SavedFilters({ basePath, current, items }: { basePath: string; current: Filters; items: SavedFilter[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const hasCurrent = Object.keys(current).length > 0;
  const href = (p: Record<string, string>) => (Object.keys(p).length ? `${basePath}?${new URLSearchParams(p)}` : basePath);

  if (!items.length && !hasCurrent) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filtre salvate" role="group">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Bookmark className="size-4" aria-hidden /> Filtre salvate</span>
      {items.map((f) => (
        <span key={f.id} className="inline-flex items-center rounded-full border bg-card text-sm">
          <Link href={href(f.params)} className="rounded-l-full py-1 pl-3 pr-2 hover:bg-accent">{f.name}</Link>
          <button
            type="button"
            disabled={pending}
            aria-label={`Șterge filtrul ${f.name}`}
            onClick={() => start(async () => {
              const res = await deleteFilter(f.id).catch(() => null);
              if (res?.ok) toast.success(`Filtrul „${f.name}” a fost șters`);
              else toast.error(res?.error ?? "Filtrul nu a putut fi șters");
            })}
            className="rounded-r-full py-1 pl-1 pr-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </span>
      ))}
      {!items.length && <span className="text-sm text-muted-foreground">Niciun filtru salvat încă.</span>}
      <Button variant="outline" size="sm" disabled={!hasCurrent} onClick={() => setOpen(true)} title={hasCurrent ? undefined : "Aplică întâi niște filtre"}>
        Salvează filtrul curent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await saveFilter(name, current).catch(() => null);
                if (!res?.ok) return void toast.error(res?.error ?? "Filtrul nu a putut fi salvat");
                toast.success(`Filtrul „${name.trim()}” a fost salvat`);
                setName("");
                setOpen(false);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Salvează filtrul</DialogTitle>
              <DialogDescription>Îl găsești apoi la un click în această pagină. Filtrele salvate sunt vizibile doar pentru tine.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="filter-name">Nume</Label>
              <Input id="filter-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="ex. Seniori Python București" required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Renunță</Button>
              <Button type="submit" disabled={pending || !name.trim()}>Salvează</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
