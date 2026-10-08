"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { deleteCandidate } from "../actions";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Șterge candidatul" title="Șterge candidatul"><Trash2 /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ștergi {name}?</DialogTitle>
          <DialogDescription>
            Se șterg definitiv CV-ul, datele extrase și notele. Acțiunea nu poate fi anulată.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Anulează</Button></DialogClose>
          <form action={deleteCandidate.bind(null, id)}>
            <SubmitButton variant="destructive" pendingText="Se șterge…">Șterge definitiv</SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
