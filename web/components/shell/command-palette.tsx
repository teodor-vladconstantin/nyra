"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, FileText, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { useBrowserClient } from "./supabase-browser";

type Hit = { id: string; name: string | null; file_name: string | null };
type Option = { key: string; href: string; label: string; hint?: string; icon: React.ComponentType<{ className?: string }> };

// Scoate caracterele cu sens în filtrul PostgREST/LIKE ca textul tastat să rămână text.
const clean = (s: string) => s.replace(/[%_\\,()*"':]/g, " ").replace(/\s+/g, " ").trim();

export function CommandPalette({ orgId, open, onOpenChange }: { orgId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const supabase = useBrowserClient();
  const router = useRouter();
  const uid = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) { setQuery(""); setHits([]); setFailed(false); setActive(0); }
  }, [open]);

  // Căutare cu debounce; `seq` aruncă răspunsurile venite după o căutare mai nouă.
  useEffect(() => {
    const q = clean(query);
    const run = ++seq.current;
    if (q.length < 2) { setHits([]); setLoading(false); setFailed(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("id, name, file_name")
        .eq("organization_id", orgId)
        .or(`name.ilike.%${q}%,file_name.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (run !== seq.current) return;
      setLoading(false);
      setFailed(!!error);
      setHits(error ? [] : (data as Hit[]));
      setActive(0);
    }, 220);
    return () => clearTimeout(t);
  }, [query, orgId, supabase]);

  const q = clean(query);
  const needle = q.toLowerCase();
  const options: Option[] = [
    ...hits.map((h) => ({
      key: `c-${h.id}`, href: `/admin/candidati/${h.id}`, icon: FileText,
      label: h.name || h.file_name || "Candidat fără nume", hint: h.name ? h.file_name ?? undefined : undefined,
    })),
    ...NAV_ITEMS.filter((i) => !needle || i.label.toLowerCase().includes(needle))
      .map((i) => ({ key: `n-${i.href}`, href: i.href, icon: i.icon, label: i.label, hint: "Pagină" })),
    ...(q.length >= 2 ? [{ key: "all", href: `/admin/candidati?q=${encodeURIComponent(q)}`, icon: Search, label: `Caută „${q}" în toți candidații`, hint: undefined }] : []),
  ];

  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [active]);

  const go = (o: Option | undefined) => {
    if (!o) return;
    onOpenChange(false);
    router.push(o.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (options.length ? (i + 1) % options.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (options.length ? (i - 1 + options.length) % options.length : 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(options[active]); }
  };

  const listId = `${uid}-list`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 shadow-pop [&>button]:hidden">
        <DialogTitle className="sr-only">Căutare rapidă</DialogTitle>
        <DialogDescription className="sr-only">Caută un candidat sau sari la o pagină. Folosește săgețile și Enter.</DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : <Search className="size-4 text-muted-foreground" aria-hidden />}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={options[active] ? `${uid}-${active}` : undefined}
            aria-label="Caută candidat sau pagină"
            placeholder="Caută după nume sau fișier…"
            autoComplete="off"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-caption text-muted-foreground">Esc</kbd>
        </div>
        <ul id={listId} ref={listRef} role="listbox" aria-label="Rezultate" className="max-h-80 overflow-y-auto p-1.5">
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${uid}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(o)}
              className={cn("flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm", i === active && "bg-accent text-accent-foreground")}
            >
              <o.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.hint && <span className="truncate text-caption text-muted-foreground">{o.hint}</span>}
              {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
            </li>
          ))}
        </ul>
        <div className="border-t px-4 py-2 text-caption text-muted-foreground" aria-live="polite">
          {failed ? "Căutarea a eșuat. Încearcă din nou."
            : loading ? "Se caută…"
            : q.length >= 2 && hits.length === 0 ? "Niciun candidat găsit."
            : q.length < 2 ? "Scrie cel puțin 2 caractere pentru a căuta candidați."
            : `${hits.length} ${hits.length === 1 ? "candidat găsit" : "candidați găsiți"}`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
