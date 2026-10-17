import { Check } from "lucide-react";
import { Cta, PageHero } from "@/components/marketing/cta";
import { FEATURES } from "@/components/marketing/content";
import { wrap } from "@/components/marketing/section";

export const metadata = {
  title: "Produs",
  description: "Parsare de CV-uri, căutare, potrivire semantică cu joburi, pipeline, scorecard-uri de interviu, tablou de bord și GDPR integrat.",
};

export default function Produs() {
  return (
    <>
      <PageHero
        eyebrow="Produs"
        title={<>Tot drumul unui candidat, <span className="text-brand">într-un singur loc.</span></>}
        intro="De la CV-ul încărcat la scorecard-ul de interviu, fără foi de calcul și fără copiat de mână."
      />
      <div className={`${wrap} divide-y divide-border`}>
        {FEATURES.map((f) => (
          <section key={f.title} className="grid gap-6 py-12 md:grid-cols-[1fr_1.2fr] md:gap-12">
            <div>
              <f.icon className="size-6 text-brand" aria-hidden />
              <h2 className="mt-4 text-2xl font-bold tracking-[-0.02em]">{f.title}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.long}</p>
            </div>
            <ul className="space-y-3 self-center rounded-lg border border-border bg-card p-6">
              {f.points.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />{p}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Cta />
    </>
  );
}
