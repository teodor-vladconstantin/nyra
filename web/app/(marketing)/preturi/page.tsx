import Link from "next/link";
import { Check } from "lucide-react";
import { PageHero } from "@/components/marketing/cta";
import { FAQS } from "@/components/marketing/content";
import { FaqList } from "@/components/marketing/faq-list";
import { LeadForm } from "@/components/marketing/lead-form";
import { wrap } from "@/components/marketing/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Prețuri",
  description: "Nyra este gratuit în perioada de lansare. Planurile pentru echipe și business vin în curând.",
};

const PLANS = [
  {
    name: "Lansare", price: "Gratuit", note: "Pe durata lansării", soon: false,
    points: ["Toate funcțiile din pagina de produs", "Parsare PDF și DOCX", "Potrivire cu joburi și scorecard-uri", "GDPR: retenție, export, jurnal"],
  },
  {
    name: "Echipă", price: "În curând", note: "Pentru echipe de recrutare", soon: true,
    points: ["Mai mulți utilizatori și roluri", "Suport prioritar"],
  },
  {
    name: "Business", price: "În curând", note: "Pentru nevoi avansate", soon: true,
    points: ["Integrări", "Suport dedicat"],
  },
];

export default function Preturi() {
  return (
    <>
      <PageHero eyebrow="Prețuri" title={<>Gratuit acum. <span className="text-brand">Fără card.</span></>} intro="Nyra este gratuit în perioada de lansare. Planurile plătite vor fi anunțate din timp, înainte să intre în vigoare." />
      <div className={`${wrap} grid gap-6 py-16 md:grid-cols-3`}>
        {PLANS.map((p) => (
          <div key={p.name} className={`flex flex-col rounded-xl border bg-card p-6 shadow-card ${p.soon ? "border-border" : "border-primary"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-heading">{p.name}</h2>
              {p.soon && <Badge variant="secondary">În curând</Badge>}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-[-0.03em]">{p.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.points.map((x) => (
                <li key={x} className="flex gap-3 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />{x}</li>
              ))}
            </ul>
            {!p.soon && <Button asChild className="mt-8"><Link href="/contact">Cere acces</Link></Button>}
            {p.soon && <Button asChild variant="outline" className="mt-8"><a href="#asteptare">Intră pe listă</a></Button>}
          </div>
        ))}
      </div>

      <section id="asteptare" className="scroll-mt-20 border-t border-border bg-sidebar/40 py-16">
        <div className={`${wrap} grid gap-10 md:grid-cols-2`}>
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.03em]">Anunță-mă când apar planurile.</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">Lasă adresa de email. Îți scriem o singură dată, când planurile plătite sunt gata. Fără newsletter.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <LeadForm kind="waitlist" from="/preturi" submit="Intră pe listă" />
          </div>
        </div>
      </section>

      <section className={`${wrap} max-w-4xl py-16`}>
        <h2 className="mb-4 text-heading">Despre prețuri</h2>
        <FaqList items={FAQS.filter((f) => f.group === "Prețuri")} />
      </section>
    </>
  );
}
