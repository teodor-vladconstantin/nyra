# Task-uri tehnice pentru conformitate

Sursa: auditul din Faza 1, `docs/legal-research.md` și `docs/legal-benchmark.md`. Starea la 22 octombrie 2026.

## FĂCUT (cod, necesită doar acțiunile marcate "TU")

- Pagini legale RO/EN, banner de cookies, acceptare T&C și DPA cu log (`legal_acceptances`), footer cu date legale.
- **Retenție automată:** implicit 12 luni, 1-24 luni, zilnic (`/api/cron/retention`, `vercel.json`), include leads (12 luni), cereri rezolvate (12 luni) și jurnal de activitate (24 luni). **TU:** setează `CRON_SECRET` în Vercel (valoare: `openssl rand -hex 32`; fără el, ruta rămâne închisă și nimic nu se șterge automat).
- **Ștergere cont:** Setări, "Șterge contul și datele" (organizație, candidați, fișiere, jurnal, profil, utilizator Clerk). Rămân acceptările legale ca dovadă. Doar pentru organizații cu un singur membru.
- **Export complet al organizației:** `/admin/gdpr/export-all` (JSON, cu linkuri la CV-uri valabile 24 de ore), din Setări.
- **Notă pentru candidați** generată per organizație (`/aplica/<job>/informare`), cu email de contact și link propriu opțional în Setări; versiunea textului acceptat se salvează în `candidates.consent_version`.
- **Cereri ale candidaților** (formular pe pagina de informare, listă și "Rezolvat" în Setări).
- **Raportare anunț** (link pe pagina de aplicare, DSA).
- **LlamaCloud:** endpoint UE în cod; după procesare se șterg jobul și fișierul de la furnizor (`parser/main.py`, best effort). **TU:** vezi mai jos.
- **Regiunea funcțiilor Vercel:** `dub1` (Dublin) în `vercel.json`, aproape de Supabase (eu-west-1).
- Procedură de incidente: `docs/legal/ro/procedura-incidente.md`.

## DE FĂCUT DE TINE (conturi, chei, facturare)

1. **Migrările:** `20261022000000_legal_acceptance.sql` (aplicată în producție) și `20261022010000_compliance.sql` (vezi starea în mesajul final).
2. **LlamaCloud EU:** cont și cheie nouă pe cloud.eu.llamaindex.ai (cheia din SUA nu merge pe endpoint-ul UE); pune-o în `LLAMA_CLOUD_API_KEY` pe VM-ul Oracle; redeploy parser; test cu un CV. Cere DPA la support@runllama.ai.
3. **Vercel:** `CRON_SECRET` (mai sus). După deploy, verifică în Project Settings, Functions că regiunea este Dublin.
4. **Clerk:** mod "Invite-only" (Dashboard, Access mode); instanță Production (acum `pk_test`); DPA; verifică certificarea DPF.
5. **Supabase:** plan Free (fără backup-uri zilnice, auto-pauză). Plan Pro pentru lansare comercială; apoi completează durata backup-urilor în documente.
6. **Oracle:** confirmă că VM-ul parserului este în regiunea eu-amsterdam-1.
7. **Documente:** rezolvă markerii (`grep -R "DE COMPLETAT\|DE VERIFICAT\|TO BE COMPLETED\|TO BE VERIFIED" web/content/legal`); apoi scoate `noindex` din `app/(marketing)/[doc]/page.tsx`. Consultație cu un avocat pe zonele din `docs/legal-research.md`.
8. **Cookies:** în DevTools, Application, pe site-ul live după sign-in: lista reală (Clerk, Turnstile, Clerk Protect, `theme`); completează tabelul din `cookies.md`.

## NEIMPLEMENTAT (decizii sau dependențe)

- **PostHog / Sentry / Resend:** nu sunt instalate. La adăugare: PostHog doar dacă `getConsent()?.analytics` (vezi `web/lib/consent.ts`), instanțe UE, CSP în `next.config.mjs`, mutare în tabelul "Activi" din `subprocesatori.md`, în cookies și în registru, anunț către clienți (DPA 3.5). Sentry: `sendDefaultPii: false`, scrubbing; Replay doar cu consimțământ. Resend: expeditor pe subdomeniu dedicat (nu joben.eu), adăugat în subprocesatori, DPA și nota pentru candidați.
- **Reînnoirea acordului candidatului prin email** (practică Teamtailor, Greenhouse, Recruitee): cere Resend.
- **Echipe multi-utilizator** (invitații în organizație): amânat; T&C 4.4 are un marcaj.
- **Pseudonimizarea `actor_id` din jurnal** la ștergerea unui singur utilizator dintr-o organizație cu mai mulți membri: nu e cazul cât timp organizațiile au un singur membru.
