# Task-uri tehnice pentru conformitate (neimplementate)

Sursa: auditul din Faza 1 și `docs/legal-research.md`. Nimic de aici nu e implementat, în afara punctelor marcate "FĂCUT". Ordinea e după impact asupra lansării comercială.

## Înainte de lansarea comercială

1. **Clerk: mod "Invite-only".** Dashboard Clerk, pagina Access mode (în docurile mai vechi: Restrictions, "Enable restricted mode"). Invitațiile se trimit din Users, Invite. Fără cod. Verifică pe instanța **Production**, nu pe cea de dev.
2. **Clerk: instanță Production** (acum e `pk_test`), DPA cu Clerk, verificarea certificării DPF.
3. **LlamaCloud: endpoint UE.** Schimbă `LLAMA_API` din `parser/main.py` la `https://api.cloud.eu.llamaindex.ai/api`, cu cheie de API din regiunea UE; verifică disponibilitatea (waitlist?). Adaugă `do_not_cache` sau ștergere după procesare. Cere DPA la support@runllama.ai. Apoi actualizează `subprocesatori.md` și DPA 4.3.
4. **Retenție automată.** Job programat (pg_cron sau cron extern) care apelează logica din `purge_expired_candidates` pentru toate organizațiile, cu valoare implicită de 12 luni (acum `retention_months` e `null`, adică nelimitat, și curățarea e manuală din Setări). Plafon în UI 24 luni cu avertisment peste 12 (acum 1 până la 120).
5. **Retenție `leads`:** ștergere automată la 12 luni de la ultimul contact; flux pentru cerere de ștergere.
6. **Ștergere cont și organizație.** Acum nu există flux, iar ștergerea în Clerk nu se propagă în Supabase. Minim: procedură documentată (email la privacy@joben.eu) plus script. Ideal: buton în Setări plus webhook Clerk `user.deleted`.
7. **Export complet al organizației** (Data Act, portabilitate): acum există export CSV al listei și JSON per candidat.
8. **Formularul public de aplicare** (`web/lib/apply.ts`, `web/app/aplica/[id]/page.tsx`): linkul din bifă duce la `/confidentialitate` (politica Nyra), nu la nota pentru candidați a recrutorului. Adaugă câmp în Setări pentru linkul sau textul notei recrutorului (model: `docs/legal/ro/nota-candidati.md`) și afișează-l pe formular. Loghează versiunea textului acceptat lângă `consent_at`. Dacă se păstrează consimțământul ca temei, adaugă retragere.
9. **Verifică regiunea funcțiilor Vercel** (Project Settings, Functions) și fixeaz-o pe UE (de exemplu `fra1`). Implicit poate fi SUA, iar CV-urile trec prin ele la încărcare.
10. **Supabase: plan Free** (vizibil în dashboard). Fără backup-uri zilnice și cu auto-pauză. Pentru lansare comercială, plan Pro; apoi completează durata backup-urilor în documente.
11. **Confirmă regiunea Oracle a VM-ului parserului** (consola nu a încărcat lista de resurse la verificare; regiunea afișată era eu-amsterdam-1).
12. **Procedură pentru încălcări de securitate** (DPA 3.7 promite 48 de ore) și registru de incidente și de cereri ale persoanelor vizate (`docs/legal/ro/registru-prelucrari.md`, secțiunea C).
13. **Audit log:** decide termenul de păstrare (conține `actor_id` și este imuabil). Posibil: pseudonimizare la ștergerea contului. Necesită modificarea trigger-ului `audit_immutable`.
14. **DSA, anunțuri publice:** mecanism simplu de raportare a unui anunț (acum doar emailul din T&C 10.2).

## La adăugarea PostHog și Sentry

15. **PostHog:** inițializează-l **doar** dacă `getConsent()?.analytics === true` (vezi `web/lib/consent.ts`; ascultă `CONSENT_EVENT` pentru schimbări). Instanța UE (`eu.posthog.com`). Actualizează CSP în `next.config.mjs` (script-src și connect-src). Mută PostHog în tabelul "Activi" din `subprocesatori.md`, în cookies și în registru, și anunță clienții înainte (DPA 3.5).
16. **Sentry:** instanța UE (`de.sentry.io`), `sendDefaultPii: false`, scrubbing pentru date personale în excepții (parserul poate include nume sau CV-uri). Replay doar cu consimțământ.
17. **Resend** (dacă îl adaugi): expeditor pe un **subdomeniu dedicat**, nu pe joben.eu direct, ca să nu fie confundat cu Joben; adaugă-l în subprocesatori, în DPA și în nota pentru candidați, pentru că Nyra ar trimite emailuri către candidați.

## Verificări în browser înainte de publicare

18. În DevTools, Application, pe site-ul live: lista reală de cookie-uri și localStorage după sign-in (Clerk, Turnstile, Clerk Protect, `theme`). Completează tabelul din `cookies.md`.
19. Rulează `grep -R "DE COMPLETAT\|DE VERIFICAT\|TO BE COMPLETED\|TO BE VERIFIED" web/content/legal`; paginile au markerii evidențiați și sunt `noindex`. Elimină `robots: noindex` din `app/(marketing)/[doc]/page.tsx` abia după ce sunt rezolvați.

## FĂCUT în Faza 4
- Pagini `/termeni`, `/confidentialitate`, `/cookies`, `/subprocesatori`, `/dpa` cu comutator RO/EN (`?lang=en`).
- Banner de cookies cu refuz la fel de ușor ca acceptul, preferințe, consimțământ cu dată și versiune, redeschidere din footer ("Setări cookie"). Nimic opțional nu se încarcă (nimic opțional nu există).
- Acceptare T&C, DPA și clauze exprese după înregistrare, cu log (utilizator, moment, versiune) în `legal_acceptances`; poartă în `/admin` pentru conturile fără acceptarea versiunii curente.
- Linkuri legale și datele prestatorului în footer; footerul apare pe landing.
