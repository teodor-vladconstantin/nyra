"use client";
import { useState, useTransition } from "react";
import { Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/native-select";
import { TAG_COLORS, type Tag, type TagColor } from "@/lib/candidates";
import { createTag } from "@/app/admin/candidati/workflow-actions";
import { TagChip } from "./tag-chips";

// Creare inline: un nume + o culoare din tokenii de design. După creare, eticheta se aplică direct (onPick).
function NewTagDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (t: Tag) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("neutral");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createTag(name, color).catch(() => null);
              if (!res?.ok) return void toast.error(res?.error ?? "Eticheta nu a putut fi creată");
              toast.success(`Eticheta „${res.tag.name}” a fost creată`);
              setName("");
              onOpenChange(false);
              onCreated(res.tag);
            });
          }}
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>Etichetă nouă</DialogTitle>
            <DialogDescription>Etichetele te ajută să grupezi candidații (ex. „Remote”, „Relocare”).</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-tag-name">Nume</Label>
            <Input id="new-tag-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-tag-color">Culoare</Label>
            <NativeSelect id="new-tag-color" value={color} onChange={(e) => setColor(e.target.value as TagColor)}>
              {Object.entries(TAG_COLORS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </div>
          <div aria-hidden className="text-sm text-muted-foreground">Previzualizare: <TagChip tag={{ id: "preview", name: name.trim() || "Etichetă", color }} /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Renunță</Button>
            <Button type="submit" disabled={pending || !name.trim()}>Creează</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Meniu de etichete existente + „Etichetă nouă…”. `disabled` blochează trigger-ul (ex. nimic selectat).
export function TagMenu({ tags, onPick, label = "Adaugă etichetă", disabled, variant = "outline" }: {
  tags: Tag[]; onPick: (t: Tag) => void; label?: string; disabled?: boolean; variant?: "outline" | "ghost" | "secondary";
}) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size="sm" disabled={disabled}><TagIcon /> {label}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          {tags.length > 0 && <DropdownMenuLabel>Etichete</DropdownMenuLabel>}
          {tags.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => onPick(t)}><TagChip tag={t} /></DropdownMenuItem>
          ))}
          {tags.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Etichetă nouă…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewTagDialog open={creating} onOpenChange={setCreating} onCreated={onPick} />
    </>
  );
}
