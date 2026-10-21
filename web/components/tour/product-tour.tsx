"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Briefcase, Copy, Keyboard, KanbanSquare, LayoutDashboard, Settings, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NAV_ITEMS } from "@/components/shell/nav-items";
import { markTourSeen } from "@/app/admin/tour-actions";

export const OPEN_TOUR = "nyra:open-tour";

type Step = { icon: LucideIcon; title: string; body: string; points?: string[] };

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Bun venit în Nyra",
    body: "Încarci CV-uri, Nyra le citește și le structurează, iar tu cauți, compari și duci candidații prin proces. Îți arătăm pe scurt fiecare secțiune.",
  },
  {
    icon: Users,
    title: "Candidați",
    body: "Aici începi. Încarci CV-uri și Nyra extrage automat numele, experiența și skill-urile.",
    points: [
      "Încarci PDF sau DOCX, până la 10 MB, mai multe odată.",
      "Ai deja o listă? Importă-o din CSV.",
      "Cauți și filtrezi după skill-uri, experiență sau status (de exemplu Deselectat).",
    ],
  },
  {
    icon: KanbanSquare,
    title: "Pipeline",
    body: "Aceiași candidați, pe etape. Muți un candidat de la o coloană la alta pe măsură ce avansează în proces.",
  },
  {
    icon: Briefcase,
    title: "Joburi",
    body: "Creezi un job, atașezi candidați și vezi cât de bine se potrivesc.",
    points: [
      "Potrivirea combină înțelegerea semantică a CV-ului cu cuvintele-cheie ale jobului.",
      "Poți activa un link public de aplicare și vezi de unde vin aplicările.",
    ],
  },
  {
    icon: Copy,
    title: "Dedupe",
    body: "Același om poate ajunge de două ori în listă. Aici găsești duplicatele și le unifici.",
  },
  {
    icon: LayoutDashboard,
    title: "Panou",
    body: "Imaginea de ansamblu: câți candidați ai, ce s-a adăugat recent și ce CV-uri se mai procesează.",
  },
  {
    icon: Settings,
    title: "Setări",
    body: "Alegi cât timp păstrezi datele candidaților (GDPR) și poți șterge definitiv ce a expirat.",
  },
  {
    icon: Keyboard,
    title: "Scurtături",
    body: "Ctrl+K caută rapid un candidat sau o pagină. „?” arată toate scurtăturile.",
    points: NAV_ITEMS.map((i) => `g apoi ${i.key.toUpperCase()}: ${i.label}`),
  },
];

// Turul apare singur o dată per utilizator (`autoOpen`) și se poate redeschide oricând prin evenimentul OPEN_TOUR.
export function ProductTour({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [i, setI] = useState(0);
  const marked = useRef(!autoOpen);

  useEffect(() => {
    const show = () => { setI(0); setOpen(true); };
    window.addEventListener(OPEN_TOUR, show);
    return () => window.removeEventListener(OPEN_TOUR, show);
  }, []);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && !marked.current) { marked.current = true; void markTourSeen(); }
  };

  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] max-w-md overflow-y-auto max-sm:h-full max-sm:max-w-none max-sm:content-start">
        <DialogHeader>
          <step.icon className="mb-1 size-8 text-primary" aria-hidden />
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription>{step.body}</DialogDescription>
        </DialogHeader>
        {step.points && (
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {step.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <div className="flex items-center justify-center gap-1.5" role="img" aria-label={`Pasul ${i + 1} din ${STEPS.length}`}>
          {STEPS.map((s, n) => (
            <span key={s.title} className={n === i ? "h-1.5 w-4 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground/30"} />
          ))}
        </div>
        <DialogFooter className="gap-2 sm:items-center sm:justify-between sm:space-x-0">
          {last ? <span /> : <Button variant="ghost" onClick={() => onOpenChange(false)}>Sari peste</Button>}
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>Înapoi</Button>}
            {last ? (
              <Button asChild onClick={() => onOpenChange(false)}>
                <Link href="/admin/candidati">Încarcă primele CV-uri</Link>
              </Button>
            ) : (
              <Button onClick={() => setI(i + 1)}>Continuă</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const openTour = () => window.dispatchEvent(new Event(OPEN_TOUR));
