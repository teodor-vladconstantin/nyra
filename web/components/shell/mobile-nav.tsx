"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

// Sertar lateral pe mobil: același Dialog Radix (focus trap, Esc, aria) stilizat ca panou stânga.
export function MobileNav({ orgName }: { orgName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Deschide meniul">
          <Menu />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-full max-w-[17rem] translate-x-0 translate-y-0 content-start gap-6 rounded-none border-y-0 border-l-0 bg-sidebar p-4 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:rounded-none">
        <DialogTitle className="sr-only">Meniu</DialogTitle>
        <DialogDescription className="sr-only">Navigare între secțiunile Nyra By Joben</DialogDescription>
        <Brand orgName={orgName} />
        <NavLinks onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
