# Politica de cookies Nyra

> **Versiune:** 0.1 (ciornă) | **În vigoare de la:** [DE COMPLETAT la lansare] | **Ultima actualizare:** 22 octombrie 2026
> **Operator:** TETA ABC SRL, CUI 22404824, Reg. Com. J2007001135104, Str. Centrală nr. 169, sat Mărăcineni, jud. Buzău, cod poștal 127325, România | **Contact:** hello@joben.eu | **Protecția datelor:** privacy@joben.eu
>
> **Notă internă.** Tabelul reflectă ce rezultă din cod (Faza 1). Înainte de publicare, se verifică în browser pe site-ul live (DevTools, Application) numele, durata și setul exact, mai ales pentru Clerk, Turnstile și Clerk Protect. [DE COMPLETAT]

## Ce sunt cookie-urile

Cookie-urile și stocarea locală sunt fișiere mici sau valori stocate în browserul tău. Le folosim doar cât e necesar. Cele opționale (statistici) nu se încarcă fără acordul tău. Poți refuza la fel de ușor cum accepți și poți schimba alegerea oricând din linkul "Setări cookie" din subsolul paginii.

## Strict necesare (fără acord)

Fără acestea nu funcționează autentificarea sau securitatea. Conform Legii 506/2004 art. 4 alin. (5), nu necesită consimțământ.

| Nume | Furnizor | Scop | Durată |
|---|---|---|---|
| `__session` | Clerk | Menține sesiunea autentificată | Sesiune [DE VERIFICAT] |
| `__client_uat` | Clerk | Sincronizează starea autentificării între file | [DE VERIFICAT, aprox. 1 an] |
| `__clerk_db_jwt` | Clerk | Token tehnic (doar în dezvoltare) | Sesiune |
| Cloudflare Turnstile / Clerk Protect | Cloudflare / Clerk | Verificare anti-bot la înregistrare, doar pe paginile de înregistrare | [DE VERIFICAT: ce stochează, dacă stochează] [DE VERIFICAT DE AVOCAT: dacă sunt strict necesare] |
| `joben_nyra_consent` (de implementat) | Nyra | Păstrează alegerea ta privind cookie-urile, cu data și versiunea politicii | 12 luni |

## Preferințe (stocare locală)

| Nume | Furnizor | Scop | Durată |
|---|---|---|---|
| `theme` | Nyra (next-themes) | Reține tema ta, deschisă sau întunecată, la alegerea ta | Până la ștergere [DE VERIFICAT DE AVOCAT: dacă poate fi tratată ca strict necesară; DE VERIFICAT în browser când se scrie] |

## Opționale, doar cu acordul tău

**În prezent nu este activ niciunul.** Dacă le adăugăm, nu se încarcă înainte de acordul tău.

| Nume | Furnizor | Scop | Durată | Stare |
|---|---|---|---|---|
| `ph_*` (cookie și localStorage) | PostHog (instanța UE) | Statistici de produs și, eventual, înregistrări de sesiune | până la 1 an | Planificat, nu este activ |
| `sentryReplaySession` (sessionStorage) | Sentry (instanța UE) | Înregistrare de sesiune pentru diagnosticarea erorilor | sesiune | Planificat, nu este activ |

Raportarea erorilor Sentry fără înregistrare de sesiune nu folosește cookie-uri și se bazează pe interesul legitim, cu eliminarea datelor personale. [DE COMPLETAT: confirmarea setării scrubbing.]

Nu folosim cookie-uri de publicitate sau de marketing.

## Cum îți gestionezi alegerea

- Prima dată când intri, afișăm un banner cu butoanele "Refuz tot" și "Accept tot" la aceeași vizibilitate, plus "Preferințe".
- Poți schimba oricând din "Setări cookie" din subsol.
- Reafișăm cererea după 12 luni sau dacă ștergi datele site-ului din browser.
- Poți șterge oricând cookie-urile din setările browserului; autentificarea va dispărea.

Păstrăm alegerea ta (data și versiunea politicii) pentru a putea dovedi consimțământul.

## Cum se leagă de datele personale

Prelucrarea datelor personale prin aceste tehnologii este descrisă în Politica de confidențialitate. Pentru întrebări: privacy@joben.eu.
