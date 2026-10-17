import { PageHero } from "@/components/marketing/cta";
import { wrap } from "@/components/marketing/section";

export const metadata = { title: "Termeni și condiții", description: "Termenii de utilizare a serviciului Nyra." };

// Schelet: de verificat cu un jurist înainte de lansarea comercială.
export default function Termeni() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Termeni și condiții" intro="Ultima actualizare: 17 octombrie 2026." />
      <article className={`${wrap} max-w-3xl space-y-8 py-16 leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-heading [&_h2]:text-foreground`}>
        <section><h2>Serviciul</h2><p>Nyra este oferit în perioada de lansare gratuit și „așa cum este”. Funcțiile se pot schimba, iar planurile plătite vor fi anunțate înainte să intre în vigoare.</p></section>
        <section><h2>Contul și accesul</h2><p>Accesul se acordă pe bază de invitație. Ești responsabil pentru păstrarea în siguranță a datelor de autentificare.</p></section>
        <section><h2>Datele încărcate</h2><p>Declari că ai dreptul să încarci CV-urile și să prelucrezi datele candidaților, inclusiv temeiul legal necesar conform GDPR.</p></section>
        <section><h2>Încetarea</h2><p>Poți înceta folosirea serviciului oricând și poți cere ștergerea datelor organizației tale.</p></section>
      </article>
    </>
  );
}
