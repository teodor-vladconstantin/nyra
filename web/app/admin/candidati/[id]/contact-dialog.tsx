"use client";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { FieldErrors } from "@/lib/experience";
import { updateContact } from "./edit-actions";
import { Field, fieldProps } from "./form-field";

type Contact = { id: string; name: string | null; email: string | null; phone: string | null; location: string | null };

export function ContactDialog({ candidate: c }: { candidate: Contact }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, start] = useTransition();
  const p = "contact";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErrors({}); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Pencil /> Editează contact</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Date de contact</DialogTitle>
          <DialogDescription>Corectează ce a extras parserul. Câmpurile editate nu mai sunt suprascrise la reprocesare.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            start(async () => {
              try {
                const r = await updateContact(c.id, data);
                if (r.ok) {
                  setErrors({});
                  setOpen(false);
                  toast.success("Datele de contact au fost salvate");
                } else {
                  setErrors(r.errors ?? {});
                  if (r.error) toast.error(r.error);
                }
              } catch {
                toast.error("Datele nu au putut fi salvate");
              }
            });
          }}
        >
          <Field prefix={p} name="name" label="Nume" errors={errors}>
            <Input {...fieldProps(p, "name", errors)} defaultValue={c.name ?? ""} autoComplete="off" maxLength={200} />
          </Field>
          <Field prefix={p} name="email" label="Email" errors={errors}>
            <Input {...fieldProps(p, "email", errors)} type="email" defaultValue={c.email ?? ""} autoComplete="off" />
          </Field>
          <Field prefix={p} name="phone" label="Telefon" errors={errors}>
            <Input {...fieldProps(p, "phone", errors)} type="tel" defaultValue={c.phone ?? ""} autoComplete="off" />
          </Field>
          <Field prefix={p} name="location" label="Localitate" errors={errors}>
            <Input {...fieldProps(p, "location", errors)} defaultValue={c.location ?? ""} autoComplete="off" maxLength={200} />
          </Field>
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <DialogClose asChild><Button type="button" variant="ghost">Anulează</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Se salvează…" : "Salvează"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
