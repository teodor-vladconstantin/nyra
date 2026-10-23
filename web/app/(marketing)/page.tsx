import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Cta } from "@/components/marketing/cta";
import { DIFFERENCES, FAQS, FEATURES, STEPS } from "@/components/marketing/content";
import { FaqList } from "@/components/marketing/faq-list";
import { Section, wrap } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: { absolute: "Nyra · Recrutare, simplu" },
  description: "Nyra citește CV-urile și le transformă în candidați structurați: căutare, potrivire cu joburi, pipeline și GDPR integrat. Gratuit în perioada de lansare.",
};

const TRUST = ["PDF și DOCX", "Română și engleză", "GDPR integrat", "Audit imuabil"];

export default function Landing() {
  return (
    <>
      <section className="border-b border-border">
        <div className={`${wrap} grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center`}>
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-caption font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden /> Gratuit în perioada de lansare
            </p>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
              Recrutare, <span className="text-brand">simplu.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Încarci CV-uri, Nyra le citește și îți dă candidați structurați: contact, experiență, competențe. Apoi cauți, potrivești cu joburi și duci candidații mai departe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/contact">Cere acces <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/produs">Vezi cum funcționează</Link></Button>
            </div>
          </div>
          <figure className="overflow-hidden rounded-xl border border-border bg-card shadow-pop">
            <video src="/demo.webm" autoPlay muted loop playsInline preload="metadata" aria-label="Demonstrație Nyra: CV-uri încărcate, extrase automat și filtrate (date fictive)" className="aspect-video w-full" />
            <figcaption className="border-t border-border px-4 py-2 text-caption text-muted-foreground">Demonstrație cu date fictive.</figcaption>
          </figure>
        </div>
        <ul className={`${wrap} grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border py-5 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:justify-between`}>
          {TRUST.map((t) => (
            <li key={t} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" aria-hidden />{t}</li>
          ))}
        </ul>
      </section>

      <Section eyebrow="Cum funcționează" title="De la un teanc de CV-uri la o listă pe care o poți filtra.">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-card p-6">
              <span className="tabular text-3xl font-bold text-brand">0{i + 1}</span>
              <h3 className="mt-4 text-heading">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="functii" eyebrow="Funcții" title="Tot ce ai nevoie între primul CV și oferta de angajare." className="border-t border-border bg-sidebar/40">
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-card p-6">
              <f.icon className="size-5 text-brand" aria-hidden />
              <h3 className="mt-4 text-base font-semibold leading-snug">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.short}</p>
            </div>
          ))}
        </div>
        <Button asChild variant="link" className="mt-6 px-0"><Link href="/produs">Toate funcțiile în detaliu <ArrowRight /></Link></Button>
      </Section>

      <Section eyebrow="De ce Nyra" title="Un instrument mai mic decât un ATS, mai serios decât un tabel.">
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {DIFFERENCES.map((d) => (
            <div key={d.title} className="border-t border-border pt-5">
              <dt className="text-heading">{d.title}</dt>
              <dd className="mt-2 leading-relaxed text-muted-foreground">{d.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section eyebrow="Întrebări" title="Ce ne întreabă lumea" className="border-t border-border">
        <div className="max-w-3xl">
          <FaqList items={FAQS.slice(0, 5)} />
          <Button asChild variant="link" className="mt-4 px-0"><Link href="/faq">Toate întrebările <ArrowRight /></Link></Button>
        </div>
      </Section>

      <Cta />
    </>
  );
}
