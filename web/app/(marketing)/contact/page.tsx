import Link from "next/link";
import { PageHero } from "@/components/marketing/cta";
import { LeadForm } from "@/components/marketing/lead-form";
import { wrap } from "@/components/marketing/section";

export const metadata = {
  title: "Contact",
  description: "Cere acces la Nyra sau scrie-ne o întrebare.",
};

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Hai să vorbim." intro="Vrei acces la Nyra, ai o întrebare sau îți lipsește o funcție? Scrie-ne." />
      <div className={`${wrap} grid gap-12 py-16 md:grid-cols-[1.2fr_1fr]`}>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
          <LeadForm kind="contact" from="/contact" submit="Trimite mesajul" />
        </div>
        <aside className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-heading text-foreground">Ce se întâmplă după</h2>
            <p className="mt-2">Citim fiecare mesaj și răspundem pe email. Folosim adresa ta doar ca să-ți răspundem.</p>
          </div>
          <div>
            <h2 className="text-heading text-foreground">Ai deja cont?</h2>
            <p className="mt-2"><Link className="text-brand underline-offset-4 hover:underline" href="/sign-in">Intră în aplicație</Link>.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
