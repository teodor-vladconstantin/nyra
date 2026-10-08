"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommandPalette } from "./command-palette";
import { NAV_ITEMS } from "./nav-items";

const OPEN_PALETTE = "nyra:open-palette";

const isEditable = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};

// Paleta (Ctrl/Cmd+K), "/" pentru căutare, "?" pentru ajutor și secvențele "g apoi ...". Montat o singură dată în shell.
export function GlobalShortcuts({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const gAt = useRef(0);

  useEffect(() => {
    const openPalette = () => setPalette(true);
    window.addEventListener(OPEN_PALETTE, openPalette);

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isEditable(e.target)) return;
      // Nu interceptăm tastele cât un dialog (Radix) e deschis.
      if (document.querySelector('[role="dialog"]')) return;

      if (e.key === "/") {
        e.preventDefault();
        // Pagina cu filtre are un câmp #q; în rest deschidem paleta.
        const field = document.getElementById("q") as HTMLInputElement | null;
        if (field) { field.focus(); field.select(); } else setPalette(true);
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === "g") {
        gAt.current = Date.now();
      } else if (Date.now() - gAt.current < 1000) {
        gAt.current = 0;
        const target = NAV_ITEMS.find((i) => i.key === e.key);
        if (target) router.push(target.href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_PALETTE, openPalette);
      window.removeEventListener("keydown", onKey);
    };
  }, [router]);

  return (
    <>
      <CommandPalette orgId={orgId} open={palette} onOpenChange={setPalette} />
      <ShortcutsHelp open={help} onOpenChange={setHelp} />
    </>
  );
}

// Butonul din topbar: arată scurtătura și deschide paleta.
export function SearchTrigger() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.userAgent)), []);
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))}
      className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground shadow-card transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Caută candidați (Ctrl+K)"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate text-left">Caută candidați…</span>
      <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-caption sm:block">{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["Ctrl/⌘", "K"], label: "Căutare rapidă de candidați" },
  { keys: ["/"], label: "Focalizează căutarea din pagină" },
  { keys: ["?"], label: "Arată această listă" },
  { keys: ["Esc"], label: "Închide dialogul deschis" },
  ...NAV_ITEMS.map((i) => ({ keys: ["g", i.key.toUpperCase()], label: `Mergi la ${i.label}` })),
];

function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scurtături de tastatură</DialogTitle>
          <DialogDescription>Funcționează oriunde în zona de administrare, în afara câmpurilor de text.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y text-sm">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 py-2">
              <dt>{r.label}</dt>
              <dd className="flex items-center gap-1">
                {r.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-caption text-muted-foreground">apoi</span>}
                    <kbd className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center text-caption">{k}</kbd>
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
