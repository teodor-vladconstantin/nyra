import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalLangSwitch } from "@/components/legal/lang-switch";
import { LegalMarkdown } from "@/components/legal/markdown";
import { wrap } from "@/components/marketing/section";
import { DOCS, type DocSlug } from "@/lib/legal";
import { loadDoc } from "@/lib/legal-files";

// /termeni, /confidentialitate, /cookies, /subprocesatori, /dpa. Orice alt segment: 404.
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(DOCS).map((doc) => ({ doc }));

const slugOf = (doc: string) => (doc in DOCS ? (doc as DocSlug) : notFound());

// noindex cât timp documentele sunt ciorne (markerii [DE COMPLETAT] / [DE VERIFICAT]).
export function generateMetadata({ params }: { params: { doc: string } }): Metadata {
  return { title: DOCS[slugOf(params.doc)].title.ro, robots: { index: false, follow: true } };
}

export default function LegalPage({ params }: { params: { doc: string } }) {
  const slug = slugOf(params.doc);
  return (
    <article className={`${wrap} max-w-3xl py-12 sm:py-16`}>
      <LegalLangSwitch ro={<LegalMarkdown source={loadDoc(slug, "ro")} />} en={<LegalMarkdown source={loadDoc(slug, "en")} />} />
    </article>
  );
}
