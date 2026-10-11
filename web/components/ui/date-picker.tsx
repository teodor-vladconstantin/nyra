"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/native-select";
import { cn } from "@/lib/utils";

const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const WEEKDAYS = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// „2024-03-05" -> {y, m (0-11), d}; orice altceva -> null. Doar șiruri, fără fusuri orare.
function parse(s: string) {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return r ? { y: +r[1], m: +r[2] - 1, d: +r[3] } : null;
}

// Înlocuiește <input type="date">: trimite în formular tot „aaaa-ll-zz" (input ascuns), dar arată „zz.ll.aaaa" și un calendar în stilul aplicației.
// Panoul e `absolute` (nu `fixed`): în dialoguri, transform-ul face din `fixed` un reper greșit.
export function DatePicker({ id, name, defaultValue, disabled, className, ...aria }: {
  id?: string; name: string; defaultValue?: string | null; disabled?: boolean; className?: string;
  "aria-invalid"?: boolean; "aria-describedby"?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const sel = parse(value);
  const now = new Date();
  const [view, setView] = useState({ y: sel?.y ?? now.getFullYear(), m: sel?.m ?? now.getMonth() });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Lista lunii/anului (Radix Select) e în portal, în afara `root`: un click acolo nu închide calendarul.
    const outside = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!root.current?.contains(t) && !t.closest?.('[role="listbox"]')) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const go = (delta: number) => setView(({ y, m }) => { const t = y * 12 + m + delta; return { y: Math.floor(t / 12), m: t % 12 }; });
  const pick = (v: string) => { setValue(v); setOpen(false); };

  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // luni = 0
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const years = Array.from({ length: now.getFullYear() + 2 - 1960 }, (_, i) => 1960 + i);
  if (!years.includes(view.y)) years.push(view.y);

  return (
    <div ref={root} className="relative" onKeyDown={(e) => { if (e.key === "Escape" && open && root.current?.contains(e.target as Node)) { e.stopPropagation(); setOpen(false); } }}>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
          className,
        )}
        {...aria}
      >
        <span className={cn(!sel && "text-muted-foreground")}>{sel ? `${pad(sel.d)}.${pad(sel.m + 1)}.${sel.y}` : "zz.ll.aaaa"}</span>
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div role="dialog" aria-label="Alege data" className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
          <div className="mb-2 flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => go(-1)} aria-label="Luna anterioară"><ChevronLeft /></Button>
            <div className="min-w-0 flex-1">
              <NativeSelect aria-label="Luna" value={view.m} onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))} className="h-8 pl-2 pr-6 text-xs capitalize">
                {MONTHS.map((n, i) => <option key={n} value={i}>{n}</option>)}
              </NativeSelect>
            </div>
            <div className="w-[4.75rem] shrink-0">
              <NativeSelect aria-label="Anul" value={view.y} onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))} className="h-8 pl-2 pr-6 text-xs">
                {years.sort((a, b) => b - a).map((y) => <option key={y} value={y}>{y}</option>)}
              </NativeSelect>
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => go(1)} aria-label="Luna următoare"><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
            {WEEKDAYS.map((w) => <span key={w} className="py-1 text-muted-foreground" aria-hidden>{w}</span>)}
            {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const v = iso(view.y, view.m, i + 1);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => pick(v)}
                  aria-pressed={v === value}
                  className={cn(
                    "h-8 rounded-md tabular-nums transition-colors hover:bg-accent",
                    v === todayIso && "ring-1 ring-inset ring-border",
                    v === value && "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setView({ y: now.getFullYear(), m: now.getMonth() }); pick(todayIso); }}>Azi</Button>
            <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => pick("")}>Șterge</Button>
          </div>
        </div>
      )}
    </div>
  );
}
