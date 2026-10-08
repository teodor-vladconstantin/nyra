"use client";
import { useState, useTransition } from "react";
import { GitMerge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { mergeCandidates } from "./merge-actions";

export type MergeSide = { id: string; label: string; detail: string };

// Alegi care candidat rămâne; celălalt se îmbină în el și se șterge. `a` e preselectat (de obicei cel mai vechi).
export function MergeDialog({ a, b, to = "candidate" }: { a: MergeSide; b: MergeSide; to?: "candidate" | "dedupe" }) {
  const [keep, setKeep] = useState(a.id);
  const [pending, start] = useTransition();
  const primary = keep === a.id ? a : b;
  const other = keep === a.id ? b : a;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><GitMerge /> Îmbină</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Îmbină candidații</DialogTitle>
          <DialogDescription>
            Rămâne statusul candidatului păstrat. Din celălalt se mută experiențele și notele care lipsesc, se completează
            datele de contact goale, apoi el și CV-ul lui se șterg definitiv.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Păstrează</legend>
          {[a, b].map((s) => (
            <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring">
              <input type="radio" name="keep" value={s.id} checked={keep === s.id} onChange={() => setKeep(s.id)} className="mt-1 size-4 accent-primary" />
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium">{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild><Button variant="ghost">Anulează</Button></DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const r = await mergeCandidates(primary.id, other.id, to);
                  if (r && !r.ok) toast.error(r.error); // la succes acțiunea redirecționează
                } catch (e) {
                  if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
                  toast.error("Îmbinarea a eșuat");
                }
              })
            }
          >
            {pending ? "Se îmbină…" : `Îmbină în ${primary.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
