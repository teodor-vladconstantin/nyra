import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { wrap } from "./section";

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro: React.ReactNode }) {
  return (
    <div className="border-b border-border">
      <div className={`${wrap} py-16 sm:py-20`}>
        <p className="mb-3 text-caption font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-[-0.035em] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</p>
      </div>
    </div>
  );
}

export function Cta() {
  return (
    <section className="py-16 sm:py-24">
      <div className={wrap}>
        <div className="rounded-xl border border-border bg-card p-8 shadow-card sm:p-12">
          <div className="mb-6 h-1 w-12 rounded-full bg-primary" aria-hidden />
          <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">Încearcă Nyra pe CV-urile tale.</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">Gratuit în perioada de lansare. Scrie-ne și îți dăm acces.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/contact">Cere acces <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/produs">Vezi funcțiile</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
