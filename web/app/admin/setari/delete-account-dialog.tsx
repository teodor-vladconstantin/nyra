"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { deleteAccount } from "./actions";

export function DeleteAccountDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}><Trash2 /> Șterge contul și datele</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ștergi contul și toate datele?</DialogTitle>
          <DialogDescription>
            Se șterg definitiv organizația, toți candidații, CV-urile, notele, joburile și contul tău de autentificare. Acțiunea nu poate fi anulată.
            Exportă datele înainte, dacă ai nevoie de ele.
          </DialogDescription>
        </DialogHeader>
        <form action={deleteAccount} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Scrie STERGE ca să confirmi</Label>
            <Input id="confirm" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <SubmitButton variant="destructive" disabled={confirm.trim().toUpperCase() !== "STERGE"} pendingText="Se șterge…"><Trash2 /> Șterge definitiv</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
