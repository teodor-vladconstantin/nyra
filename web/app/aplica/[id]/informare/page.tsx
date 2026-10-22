import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/shell/brand";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCandidateRequest } from "@/lib/candidate-requests";
import { createClient } from "@/lib/supabase";

// Nota de informare pentru candidați (art. 13 GDPR), generată din datele organizației. Organizația poate folosi în schimb propria notă (Setări).
const UUID = /^[0-9a-f-]{36}$/i;
type Notice = { title: string; company: string; retention_months: number; privacy_email: string | null; notice_url: string | null };

async function loadNotice(id: string) {
  if (!UUID.test(id)) notFound();
  const { data, error } = await createClient().rpc("public_job", { p_id: id });
  if (error) throw error;
  const job = (data as Notice[] | null)?.[0];
  if (!job) notFound();
  return job;
}

export const metadata = { title: "Informare privind datele personale", robots: { index: false } };

const link = "text-brand underline underline-offset-4";

export default async function NoticePage({ params }: { params: { id: string } }) {
  const n = await loadNotice(params.id);
  const contact = n.privacy_email
    ? <a className={link} href={`mailto:${n.privacy_email}`}>{n.privacy_email}</a>
    : <>formularul de mai jos (cererea ajunge la {n.company})</>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60"><div className="mx-auto flex h-16 max-w-3xl items-center px-4"><Brand href="/" /></div></header>
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground">Cum îți folosim datele</h1>
          <p className="mt-2">Aplicarea la <b className="text-foreground">{n.title}</b>, {n.company}.</p>
          {n.notice_url && (
            <p className="mt-2">{n.company} are și propria notă de confidențialitate: <a className={link} href={n.notice_url} target="_blank" rel="noopener noreferrer">citește-o aici</a>. Textul de mai jos completează nota respectivă.</p>
          )}
        </div>

        <section><h2>Cine îți prelucrează datele</h2>
          <p>{n.company} este operatorul datelor tale. Pentru întrebări despre date personale: {contact}. Platforma de recrutare Nyra (TETA ABC SRL, CUI 22404824, Str. Centrală nr. 169, sat Mărăcineni, jud. Buzău) prelucrează datele în numele companiei, ca împuternicit.</p></section>

        <section><h2>Ce date și de ce</h2>
          <p>Numele, emailul, telefonul și tot ce este în CV-ul tău, plus notele și evaluările făcute de echipa de recrutare. Le folosim ca să îți evaluăm candidatura și să te contactăm în legătură cu postul. Temei: pașii pe care îi faci la cererea ta înainte de un eventual contract și interesul legitim al companiei de a recruta. Nu include în CV date despre sănătate, origine, convingeri sau apartenență sindicală; dacă le incluzi, vor fi prelucrate odată cu documentul.</p></section>

        <section><h2>Procesare automată</h2>
          <p>Nyra extrage automat textul și datele din CV și poate ordona candidații după cât se potrivesc cu cerințele postului (cuvinte-cheie și similaritate de text). <b className="text-foreground">Nicio decizie de respingere sau selecție nu este luată automat</b>: fiecare candidatură este analizată de o persoană, care poate ignora ordinea sugerată. Poți cere intervenție umană, să îți exprimi punctul de vedere, să contești o decizie și explicații despre rolul instrumentului.</p></section>

        <section><h2>Cui transmitem datele</h2>
          <p>Echipei de recrutare și furnizorilor Nyra, enumerați pe pagina <Link className={link} href="/subprocesatori">Subprocesatori</Link> (Supabase în Irlanda, Vercel, Clerk, Cloudflare, LlamaIndex pentru extragerea datelor din CV și Oracle Cloud în Amsterdam). Unii aparțin unor grupuri din SUA; transferurile se bazează pe Cadrul de confidențialitate UE-SUA sau pe clauze contractuale standard.</p></section>

        <section><h2>Cât păstrăm datele</h2>
          <p>{n.retention_months} luni de la data aplicării, apoi sunt șterse automat. Le putem șterge mai devreme, la cererea ta.</p></section>

        <section><h2>Drepturile tale</h2>
          <p>Poți cere acces, rectificare, ștergere, restricționare, portabilitate, te poți opune prelucrării bazate pe interes legitim și îți poți retrage oricând acordul. {n.company} răspunde în cel mult o lună. Ai dreptul să depui plângere la ANSPDCP (dataprotection.ro).</p></section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2>Trimite o cerere</h2>
          <form action={submitCandidateRequest} className="mt-3 space-y-4">
            <input type="hidden" name="job" value={params.id} />
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <div className="space-y-2">
              <Label htmlFor="kind">Ce vrei să ceri?</Label>
              <select id="kind" name="kind" required defaultValue="" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="" disabled>Alege</option>
                <option value="access">Acces la datele mele</option>
                <option value="erasure">Ștergerea datelor mele</option>
                <option value="rectification">Rectificarea datelor</option>
                <option value="withdraw_consent">Retragerea acordului</option>
                <option value="other">Altceva</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Emailul cu care ai aplicat</Label>
              <Input id="email" name="email" type="email" required maxLength={320} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Detalii (opțional)</Label>
              <Textarea id="message" name="message" maxLength={2000} rows={4} />
            </div>
            <SubmitButton pendingText="Se trimite…">Trimite cererea</SubmitButton>
          </form>
        </section>

        <p><Link className={link} href={`/aplica/${params.id}`}>← Înapoi la aplicare</Link></p>
      </main>
    </div>
  );
}
