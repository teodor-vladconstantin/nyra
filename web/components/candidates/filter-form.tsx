import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { SuggestInput } from "@/components/suggest-input";
import { SENIORITY_LABELS } from "@/lib/experience";
import { SORTS, STATUS_LABELS, type Filters, type Tag } from "@/lib/candidates";

// Formularul de filtre comun tabelului și pipeline-ului (GET: filtrele stau în URL). La kanban statusul nu se filtrează:
// coloanele sunt chiar statusurile.
export function FilterForm({ sp, basePath, roleOptions, tags, filtered, showStatus = true }: {
  sp: Filters; basePath: string; roleOptions: string[]; tags: Tag[]; filtered: boolean; showStatus?: boolean;
}) {
  return (
    <form className="mb-6 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="q">Caută cuvinte cheie</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="q" name="q" defaultValue={sp.q} placeholder="ex. contabil București, python" className="pl-8" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Rol curent</Label>
        <SuggestInput id="role" name="role" defaultValue={sp.role} placeholder="Orice rol" options={roleOptions} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skill">Skill</Label>
        <Input id="skill" name="skill" defaultValue={sp.skill} placeholder="ex. Excel" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="seniority">Seniority</Label>
        <NativeSelect id="seniority" name="seniority" defaultValue={sp.seniority ?? ""}>
          <option value="">Oricare</option>
          {Object.entries(SENIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="min_years">Ani minimi</Label>
        <Input id="min_years" name="min_years" type="number" min={0} max={50} step={0.5} defaultValue={sp.min_years} placeholder="0" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 sm:col-span-2 lg:col-span-6">
        <div className="flex flex-wrap items-center gap-3">
          {showStatus && (
            <div className="flex items-center gap-2">
              <Label htmlFor="status" className="text-muted-foreground">Status</Label>
              <NativeSelect id="status" name="status" defaultValue={sp.status ?? ""} className="w-40">
                <option value="">Toate</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </NativeSelect>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="tag" className="text-muted-foreground">Etichetă</Label>
              <NativeSelect id="tag" name="tag" defaultValue={sp.tag ?? ""} className="w-44">
                <option value="">Toate</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="sort" className="whitespace-nowrap text-muted-foreground">Sortează</Label>
            <NativeSelect id="sort" name="sort" defaultValue={sp.sort ?? "recent"} className="w-44">
              {Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="flex gap-2">
          {filtered && <Button variant="ghost" asChild><Link href={basePath}>Resetează</Link></Button>}
          <Button type="submit">Caută</Button>
        </div>
      </div>
    </form>
  );
}
