"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase, Copy, Filter, Keyboard, KanbanSquare, LayoutDashboard, PanelLeft, Settings, Sparkles, Upload, FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { markTourSeen } from "@/app/admin/tour-actions";

export const OPEN_TOUR = "nyra:open-tour";

// `path`: pagina pe care se face pasul (turul navighează singur). `targets`: selectori CSS, primul element vizibil e scos în evidență;
// dacă nu există niciunul (rol viewer, pagină goală) cardul apare centrat.
type Step = { icon: LucideIcon; title: string; body: string; path?: string; targets?: string[]; points?: string[] };

const HEADER = '[data-tour="page-header"]';
const STEPS: Step[] = [
  {
    icon: Sparkles, path: "/admin",
    title: "Bun venit în Nyra",
    body: "Încarci CV-uri, Nyra le citește și le structurează, iar tu cauți, compari și duci candidații prin proces. Te plimbăm prin aplicație, pas cu pas.",
  },
  {
    icon: PanelLeft, path: "/admin", targets: ["aside nav"],
    title: "Meniul",
    body: "De aici ajungi la toate secțiunile: Panou, Candidați, Pipeline, Joburi, Dedupe și Setări. Le vizităm pe rând.",
  },
  {
    icon: LayoutDashboard, path: "/admin", targets: ['[data-tour="overview"]', HEADER],
    title: "Panou",
    body: "Imaginea de ansamblu: câți candidați ai, ce CV-uri se procesează, ce necesită verificare și ce competențe apar cel mai des.",
  },
  {
    icon: Upload, path: "/admin/candidati", targets: ['[data-tour="upload"]', HEADER],
    title: "Încarcă CV-uri",
    body: "Aici începi. Trage fișiere PDF sau DOCX (până la 10 MB, mai multe odată). Nyra extrage automat numele, experiența și competențele, iar starea procesării se actualizează singură.",
  },
  {
    icon: FileSpreadsheet, path: "/admin/candidati", targets: ['[data-tour="csv"]', HEADER],
    title: "Import din CSV",
    body: "Ai deja o listă de candidați în Excel sau în alt ATS? Importă-o din CSV, fără CV-uri.",
  },
  {
    icon: Filter, path: "/admin/candidati", targets: ['[data-tour="filters"]', HEADER],
    title: "Caută și filtrează",
    body: "Filtrezi după competențe, experiență, rol sau status. Poți salva filtrele folosite des și exporta rezultatul în CSV.",
  },
  {
    icon: KanbanSquare, path: "/admin/candidati/pipeline", targets: ['[data-tour="board"]', HEADER],
    title: "Pipeline",
    body: "Aceiași candidați, pe etape. Tragi un card dintr-o coloană în alta pe măsură ce avansează în proces.",
  },
  {
    icon: Briefcase, path: "/admin/joburi", targets: ['a[href="/admin/joburi/nou"]', HEADER],
    title: "Joburi",
    body: "Creezi un job, atașezi candidați și vezi cât de bine se potrivesc cu cerințele. Poți activa și un link public de aplicare.",
  },
  {
    icon: Copy, path: "/admin/candidati/dedupe", targets: [HEADER],
    title: "Duplicate",
    body: "Dacă același om ajunge de două ori în listă (același fișier, email sau telefon), apare aici și îl unifici.",
  },
  {
    icon: Settings, path: "/admin/setari", targets: ['[data-tour="retention"]', HEADER],
    title: "Setări",
    body: "Alegi cât timp păstrezi datele candidaților (GDPR) și poți șterge definitiv ce a expirat.",
  },
  {
    icon: Keyboard, path: "/admin/setari", targets: ['button[aria-label^="Caută candidați"]'],
    title: "Căutare și scurtături",
    body: "Ctrl+K caută rapid un candidat sau o pagină, de oriunde. Apasă „?” ca să vezi toate scurtăturile.",
    points: NAV_ITEMS.map((i) => `${i.label}: g apoi ${i.key.toUpperCase()}`),
  },
  {
    icon: Sparkles, path: "/admin/setari",
    title: "Gata de lucru",
    body: "Primul pas: încarcă câteva CV-uri. Turul îl poți relua oricând din Setări sau din Ctrl+K.",
  },
];

const PAD = 8;
const GAP = 12;
const FIND_TIMEOUT = 4000;

const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
const findTarget = (selectors?: string[]) => {
  for (const s of selectors ?? []) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(s)).find(visible);
    if (el) return el;
  }
  return null;
};

type Box = { top: number; left: number; width: number; height: number };
const same = <T extends object | null>(a: T, b: T) => (a === b) || (!!a && !!b && JSON.stringify(a) === JSON.stringify(b));

// Turul apare singur o dată per utilizator (`autoOpen`) și se poate redeschide oricând prin evenimentul OPEN_TOUR.
export function ProductTour({ autoOpen }: { autoOpen: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(autoOpen);
  const [i, setI] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [ready, setReady] = useState(false); // false cât timp se navighează / se așteaptă elementul
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const marked = useRef(!autoOpen);
  const startPath = useRef(pathname);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  const close = useCallback((finished = false) => {
    setOpen(false);
    if (!marked.current) { marked.current = true; void markTourSeen(); }
    // Sărit în mijloc: te întoarcem unde erai. Terminat: CTA-ul te duce la încărcare.
    if (finished) router.push("/admin/candidati");
    else if (window.location.pathname !== startPath.current) router.push(startPath.current);
  }, [router]);

  useEffect(() => {
    const show = () => { startPath.current = window.location.pathname; setI(0); setReady(false); setOpen(true); };
    window.addEventListener(OPEN_TOUR, show);
    return () => window.removeEventListener(OPEN_TOUR, show);
  }, []);

  // Navighează la pagina pasului, apoi așteaptă (cu timeout) elementul țintă.
  useEffect(() => {
    if (!open) return;
    setReady(false); setTarget(null); setBox(null); setPos(null);
    if (step.path && pathname !== step.path) { router.push(step.path); return; }
    if (!step.targets) { setReady(true); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const t0 = Date.now();
    const tick = () => {
      if (cancelled) return;
      const el = findTarget(step.targets);
      if (el) {
        // Ținte înalte (tabel, kanban): le aliniem sus, ca să rămână loc pentru card.
        el.scrollIntoView({ block: el.getBoundingClientRect().height > innerHeight * 0.6 ? "start" : "center" });
        setTarget(el); setReady(true);
      } else if (Date.now() - t0 > FIND_TIMEOUT) setReady(true);
      else timer = setTimeout(tick, 100);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, i, pathname, step, router]);

  // Poziția spotlight-ului și a cardului, recalculată la scroll / resize / schimbări de layout.
  const layout = useCallback(() => {
    const card = cardRef.current;
    if (!card || !ready) return;
    const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
    if (!target || !target.isConnected || !visible(target)) {
      setBox((b) => (b === null ? b : null));
      setPos((p) => { const n = { top: Math.max((vh - ch) / 2, 12), left: Math.max((vw - cw) / 2, 12) }; return same(p, n) ? p : n; });
      return;
    }
    const r = target.getBoundingClientRect();
    const top = Math.max(r.top - PAD, 4), left = Math.max(r.left - PAD, 4);
    const bottom = Math.min(r.bottom + PAD, vh - 4), right = Math.min(r.right + PAD, vw - 4);
    const nb = { top, left, width: right - left, height: bottom - top };
    let t: number, l = clamp(left, 12, vw - cw - 12);
    if (vh - bottom >= ch + GAP) t = bottom + GAP;
    else if (top >= ch + GAP) t = top - ch - GAP;
    else if (vw - right >= cw + GAP) { l = right + GAP; t = clamp(top, 12, vh - ch - 12); }
    else if (left >= cw + GAP) { l = left - cw - GAP; t = clamp(top, 12, vh - ch - 12); }
    else t = vh - ch - 12; // ținta ocupă tot ecranul: cardul stă peste ea, jos
    const np = { top: Math.max(t, 12), left: l };
    setBox((b) => (same(b, nb) ? b : nb));
    setPos((p) => (same(p, np) ? p : np));
  }, [target, ready]);

  useEffect(() => {
    if (!open) return;
    layout();
    const id = setInterval(layout, 250);
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", layout, true);
    return () => { clearInterval(id); window.removeEventListener("resize", layout); window.removeEventListener("scroll", layout, true); };
  }, [open, layout, i]);

  useEffect(() => {
    if (open && ready && pos) cardRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, [open, ready, i, pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc închide, săgețile merg înainte/înapoi, Tab rămâne în card.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight" && !last) setI((n) => n + 1);
      else if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
      else if (e.key === "Tab" && cardRef.current) {
        const f = Array.from(cardRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (!f.length) return;
        const first = f[0], lastEl = f[f.length - 1];
        if (!cardRef.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last, close]);

  if (!open) return null;
  const Icon = step.icon;
  return (
    <>
      {/* Blochează clicurile pe pagină cât rulează turul. */}
      <div className="fixed inset-0 z-[60]" aria-hidden />
      {box && ready ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[61] rounded-lg ring-2 ring-primary transition-[top,left,width,height] duration-200 motion-reduce:transition-none"
          style={{ ...box, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[61] bg-black/60" />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        aria-busy={!ready}
        style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: "min(22rem, calc(100vw - 1.5rem))" }}
        className={`fixed z-[62] rounded-lg border bg-background p-4 shadow-pop ${ready && pos ? "" : "invisible"}`}
      >
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <Icon className="size-4 text-primary" aria-hidden />
          <span>Pasul {i + 1} din {STEPS.length}</span>
        </div>
        <h2 id="tour-title" className="mt-2 text-base font-semibold">{step.title}</h2>
        <p id="tour-body" className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        {step.points && (
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-caption">
            {step.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          {last ? <span /> : <Button variant="ghost" size="sm" onClick={() => close()}>Sari peste</Button>}
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>Înapoi</Button>}
            {last
              ? <Button size="sm" data-autofocus onClick={() => close(true)}>Încarcă primele CV-uri</Button>
              : <Button size="sm" data-autofocus onClick={() => setI(i + 1)}>Continuă</Button>}
          </div>
        </div>
      </div>
    </>
  );
}

export const openTour = () => window.dispatchEvent(new Event(OPEN_TOUR));
