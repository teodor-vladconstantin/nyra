import { Cta, PageHero } from "@/components/marketing/cta";
import { DIFFERENCES } from "@/components/marketing/content";
import { wrap } from "@/components/marketing/section";

export const metadata = {
  title: "Despre",
  description: "Nyra este făcut de Joben, pentru echipe care recrutează în română și engleză.",
};

export default function Despre() {
  return (
    <>
      <PageHero
        eyebrow="Despre"
        title={<>Făcut de Joben, pentru cei care <span className="text-brand">chiar citesc CV-uri.</span></>}
        intro="Recrutarea începe cu un teanc de CV-uri în formate diferite. Nyra face partea plictisitoare, ca tu să te ocupi de oameni."
      />
      <div className={`${wrap} max-w-4xl space-y-6 py-16 text-base leading-relaxed text-muted-foreground`}>
        <p>Nyra a pornit de la o nevoie simplă: să nu mai copiezi manual numele, telefonul și experiența din fiecare CV. De acolo a crescut într-un instrument de recrutare complet, dar fără greutatea unui ATS clasic.</p>
        <p>Credem că un instrument de recrutare trebuie să respecte candidații la fel de mult ca recruiterii: datele lor sunt protejate, pot fi exportate și șterse, iar orice modificare lasă urme.</p>
      </div>
      <div className={`${wrap} pb-8`}>
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {DIFFERENCES.map((d) => (
            <div key={d.title} className="border-t border-border pt-5">
              <dt className="text-heading">{d.title}</dt>
              <dd className="mt-2 leading-relaxed text-muted-foreground">{d.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Cta />
    </>
  );
}
