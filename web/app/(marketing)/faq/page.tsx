import { Cta, PageHero } from "@/components/marketing/cta";
import { FAQS } from "@/components/marketing/content";
import { FaqList } from "@/components/marketing/faq-list";
import { wrap } from "@/components/marketing/section";

export const metadata = {
  title: "Întrebări frecvente",
  description: "Răspunsuri despre produs, date și GDPR, prețuri.",
};

const GROUPS = ["Produs", "Date și GDPR", "Prețuri"] as const;

export default function Faq() {
  // Date structurate pentru rezultatele de căutare (FAQPage).
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero eyebrow="Întrebări frecvente" title="Răspunsuri, fără ocolișuri." intro="Nu găsești ce cauți? Scrie-ne și îți răspundem." />
      <div className={`${wrap} max-w-4xl space-y-12 py-16`}>
        {GROUPS.map((g) => (
          <section key={g}>
            <h2 className="mb-4 text-heading">{g}</h2>
            <FaqList items={FAQS.filter((f) => f.group === g)} />
          </section>
        ))}
      </div>
      <Cta />
    </>
  );
}
