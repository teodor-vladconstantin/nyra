"use client";
import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/native-select";
import { EMPLOYMENT_LABELS, SENIORITY_LABELS, type FieldErrors } from "@/lib/experience";
import { deleteExperience, saveExperience } from "./edit-actions";
import { Field, fieldProps } from "./form-field";

export type ExperienceRow = {
  id: string; company_name: string; role_title: string; employment_type: string | null; start_date: string | null;
  end_date: string | null; description: string; seniority_level: string | null; extracted_skills: string[];
};

// Fără `experience` = formular de adăugare. Conținutul dialogului se montează doar cât e deschis, deci valorile
// inițiale se reiau din server la fiecare deschidere.
export function ExperienceDialog({ candidateId, experience: e }: { candidateId: string; experience?: ExperienceRow }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [current, setCurrent] = useState(false);
  const [pending, start] = useTransition();
  const p = `exp-${e?.id ?? "new"}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setErrors({});
        if (o) setCurrent(!!e && !e.end_date);
      }}
    >
      <DialogTrigger asChild>
        {e ? (
          <Button variant="ghost" size="icon" aria-label={`Editează ${e.role_title}`} title="Editează"><Pencil /></Button>
        ) : (
          <Button variant="outline" size="sm"><Plus /> Adaugă experiență</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{e ? "Editează experiența" : "Experiență nouă"}</DialogTitle>
          <DialogDescription>Rândurile editate manual nu sunt suprascrise la reprocesarea CV-ului.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            const data = new FormData(ev.currentTarget);
            start(async () => {
              try {
                const r = await saveExperience(candidateId, e?.id ?? null, data);
                if (r.ok) {
                  setOpen(false);
                  toast.success(e ? "Experiența a fost salvată" : "Experiența a fost adăugată");
                } else {
                  setErrors(r.errors ?? {});
                  if (r.error) toast.error(r.error);
                }
              } catch {
                toast.error("Experiența nu a putut fi salvată");
              }
            });
          }}
        >
          <Field prefix={p} name="role_title" label="Rol" errors={errors}>
            <Input {...fieldProps(p, "role_title", errors)} defaultValue={e?.role_title} required maxLength={200} autoComplete="off" />
          </Field>
          <Field prefix={p} name="company_name" label="Companie" errors={errors}>
            <Input {...fieldProps(p, "company_name", errors)} defaultValue={e?.company_name} required maxLength={200} autoComplete="off" />
          </Field>
          <Field prefix={p} name="employment_type" label="Tip angajare" errors={errors}>
            <NativeSelect {...fieldProps(p, "employment_type", errors)} defaultValue={e?.employment_type ?? ""}>
              <option value="">—</option>
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field prefix={p} name="seniority_level" label="Seniority" errors={errors}>
            <NativeSelect {...fieldProps(p, "seniority_level", errors)} defaultValue={e?.seniority_level ?? ""}>
              <option value="">—</option>
              {Object.entries(SENIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          <Field prefix={p} name="start_date" label="Început" errors={errors}>
            <Input {...fieldProps(p, "start_date", errors)} type="date" defaultValue={e?.start_date ?? ""} />
          </Field>
          <Field prefix={p} name="end_date" label="Final" errors={errors}>
            <Input {...fieldProps(p, "end_date", errors)} type="date" defaultValue={e?.end_date ?? ""} disabled={current} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="current" checked={current} onChange={(ev) => setCurrent(ev.target.checked)} className="size-4 accent-primary" />
            Loc de muncă actual (fără dată de final)
          </label>
          <Field prefix={p} name="extracted_skills" label="Competențe (separate prin virgulă)" errors={errors} className="sm:col-span-2">
            <Textarea {...fieldProps(p, "extracted_skills", errors)} rows={2} defaultValue={e?.extracted_skills.join(", ")} />
          </Field>
          <Field prefix={p} name="description" label="Descriere" errors={errors} className="sm:col-span-2">
            <Textarea {...fieldProps(p, "description", errors)} rows={5} maxLength={4000} defaultValue={e?.description} />
          </Field>
          <DialogFooter className="gap-2 pt-2 sm:col-span-2 sm:gap-0">
            <DialogClose asChild><Button type="button" variant="ghost">Anulează</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Se salvează…" : "Salvează"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExperience({ candidateId, experience: e }: { candidateId: string; experience: ExperienceRow }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Șterge ${e.role_title}`} title="Șterge"><Trash2 /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ștergi această experiență?</DialogTitle>
          <DialogDescription>{e.role_title}, {e.company_name}. Acțiunea nu poate fi anulată.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild><Button variant="ghost">Anulează</Button></DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  const r = await deleteExperience(candidateId, e.id);
                  if (r.ok) {
                    setOpen(false);
                    toast.success("Experiența a fost ștearsă");
                  } else toast.error(r.error ?? "Nu s-a putut șterge");
                } catch {
                  toast.error("Nu s-a putut șterge");
                }
              })
            }
          >
            {pending ? "Se șterge…" : "Șterge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
