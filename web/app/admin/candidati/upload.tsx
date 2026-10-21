"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UploadResult } from "./upload/route";

type Item = { key: string; name: string; state: "waiting" | "uploading" | "done" | "error"; error?: string };
const CONCURRENCY = 3;
const MAX_FILES = 50; // per lot
const MAX_BYTES = 10 * 1024 * 1024; // aceeași limită ca pe server (actions.ts)
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function Upload() {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function start(picked: File[]) {
    if (!picked.length || busy) return;
    if (picked.length > MAX_FILES) toast.error(`Maxim ${MAX_FILES} fișiere deodată. Au fost luate primele ${MAX_FILES}; încarcă restul într-un al doilea lot.`);
    const files = picked.slice(0, MAX_FILES);
    const batch: Item[] = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, state: "waiting" }));
    setItems(batch);
    setBusy(true);
    const update = (key: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

    let next = 0, ok = 0;
    const dupes: string[] = [];
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        // Fișierele peste limită se resping local, fără să mai plece pe rețea.
        if (files[i].size > MAX_BYTES) { update(batch[i].key, { state: "error", error: "Mai mare de 10 MB" }); continue; }
        update(batch[i].key, { state: "uploading" });
        const fd = new FormData();
        fd.append("file", files[i]);
        try {
          const res: UploadResult = await (await fetch("/admin/candidati/upload", { method: "POST", body: fd })).json();
          if (res.ok) ok++;
          if (res.ok && res.duplicate) dupes.push(`${files[i].name} (la fel ca ${res.duplicate.name})`);
          update(batch[i].key, res.ok ? { state: "done" } : { state: "error", error: res.error });
        } catch {
          update(batch[i].key, { state: "error", error: "Eroare de rețea" });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
    setBusy(false);
    router.refresh();
    const failed = files.length - ok;
    if (ok) toast.success(`${ok} ${ok === 1 ? "CV încărcat" : "CV-uri încărcate"}. Extragerea datelor pornește automat.`);
    if (dupes.length) toast.warning(`${dupes.length === 1 ? "CV identic cu unul existent" : `${dupes.length} CV-uri identice cu unele existente`}: ${dupes.slice(0, 3).join("; ")}${dupes.length > 3 ? "…" : ""}. Au fost încărcate oricum; le poți șterge din tabel.`, { duration: 10000 });
    if (failed) toast.error(`${failed} ${failed === 1 ? "fișier nu a putut fi încărcat" : "fișiere nu au putut fi încărcate"}`);
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); start(Array.from(e.dataTransfer.files)); }}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-brand bg-brand/5" : "border-border hover:border-muted-foreground/40 hover:bg-accent/40",
          busy && "cursor-wait opacity-70",
        )}
      >
        {busy ? <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden /> : <FileUp className="size-6 text-muted-foreground" aria-hidden />}
        <span className="font-medium">{busy ? "Se încarcă…" : "Trage CV-uri aici sau apasă pentru a alege"}</span>
        <span className="text-xs text-muted-foreground">PDF sau DOCX, max 10 MB fiecare, până la {MAX_FILES} fișiere deodată.</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        aria-label="Alege CV-uri"
        onChange={(e) => { start(Array.from(e.target.files ?? [])); e.target.value = ""; }}
      />
      {items.length > 0 && (
        <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              {it.state === "done" ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Încărcat" />
                : it.state === "error" ? <XCircle className="size-4 shrink-0 text-destructive" aria-label="Eșuat" />
                : <Loader2 className={cn("size-4 shrink-0 text-muted-foreground", it.state === "uploading" && "animate-spin")} aria-label="În curs" />}
              <span className="min-w-0 flex-1 truncate">{it.name}</span>
              {it.error && <span className="shrink-0 text-xs text-destructive">{it.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
