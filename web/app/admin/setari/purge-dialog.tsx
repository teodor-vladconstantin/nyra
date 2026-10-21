"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { purgeExpired } from "./actions";

export function PurgeDialog({ expired, months }: { expired: number; months: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={expired === 0}><Trash2 /> Șterge acum ({expired})</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ștergi {expired} {expired === 1 ? "candidat" : "candidați"}?</DialogTitle>
          <DialogDescription>
            Candidații adăugați acum mai mult de {months} luni vor fi șterși definitiv, împreună cu CV-urile, experiențele
            și notele lor. Acțiunea nu poate fi anulată.
          </DialogDescription>
        </DialogHeader>
        <form action={async () => { setOpen(false); await purgeExpired(); }}>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <SubmitButton variant="destructive" pendingText="Se șterge…"><Trash2 /> Șterge definitiv</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
