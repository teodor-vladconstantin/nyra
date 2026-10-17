import { PageHero } from "@/components/marketing/cta";
import { wrap } from "@/components/marketing/section";

export const metadata = { title: "Politica de confidențialitate", description: "Cum tratăm datele personale în Nyra." };

// Schelet: de verificat cu un jurist înainte de lansarea comercială.
export default function Confidentialitate() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Politica de confidențialitate" intro="Ultima actualizare: 17 octombrie 2026." />
      <article className={`${wrap} max-w-3xl space-y-8 py-16 leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-heading [&_h2]:text-foreground`}>
        <section><h2>Cine suntem</h2><p>Nyra este un serviciu oferit de Joben. Pentru orice întrebare despre date personale, folosește pagina de contact.</p></section>
        <section><h2>Datele de pe acest site</h2><p>Dacă completezi formularul de contact sau intri pe lista de așteptare, păstrăm numele, adresa de email și mesajul tău, doar ca să-ți răspundem sau să te anunțăm când planurile plătite sunt gata.</p></section>
        <section><h2>Datele candidaților din aplicație</h2><p>Clienții Nyra sunt operatori ai datelor candidaților pe care îi încarcă, iar Nyra le prelucrează în numele lor. Fiecare organizație își vede doar propriile date. Perioada de retenție este stabilită de organizație, iar exportul și ștergerea unui candidat sunt disponibile în aplicație.</p></section>
        <section><h2>Drepturile tale</h2><p>Poți cere acces, rectificarea sau ștergerea datelor tale scriindu-ne prin pagina de contact.</p></section>
      </article>
    </>
  );
}
