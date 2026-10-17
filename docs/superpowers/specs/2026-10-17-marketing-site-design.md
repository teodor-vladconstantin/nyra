# Nyra – site de marketing (design)

Data: 2026-10-17. Limba: română (`lang="ro"`). Faza 1 din 2 (faza 2: Clerk auth, în spec separat).

## Scop
Site public de SaaS pentru Nyra, în brandul existent (dark-first, #111113, accent #edb30a, Poppins), în aceeași aplicație Next 14 din `web/`.

## Decizii
- Grup de rute `web/app/(marketing)/` cu layout propriu (header + footer). Aplicația rămâne pe `/admin`; `/` nu mai redirecționează la `/admin`.
- Fără dependențe noi; reutilizare `components/shell/brand.tsx`, `components/ui/*`, tokenurile din `globals.css`.
- Prețuri: plan gratuit de lansare acum; Echipă și Business marcate „în curând" cu listă de așteptare.
- Formular de contact și listă de așteptare salvează în tabel Supabase `leads` (insert public prin server action, citire doar admin, RLS).
- Fără cifre/clienți/procente inventate; conținutul vine doar din ce există în cod.

## Pagini
| Rută | Conținut |
|---|---|
| `/` | hero, bandă încredere (GDPR, date în UE), problemă→soluție, 3 pași, preview produs, features pe scurt, „De ce Nyra", FAQ scurt, CTA |
| `/produs` | features detaliate: parsare CV (RO, diacritice, DOCX), căutare full-text, matching semantic multilingv, scorecard-uri interviu, kanban, jurnal imuabil, GDPR (retenție, export, ștergere) |
| `/preturi` | plan gratuit + Echipă/Business „în curând" + waitlist, FAQ facturare |
| `/faq` | întrebări pe categorii: date/GDPR, parsare, prețuri, integrări |
| `/contact` | formular (nume, email, mesaj) → `leads`, date de contact |
| `/despre` | misiune scurtă, Joben |
| `/confidentialitate`, `/termeni` | schelet, de verificat juridic |

## Diferențiatori (doar ce există)
Parser CV pentru română; matching semantic multilingv; GDPR din construcție; de la CV la candidat structurat fără ATS greoi.

## Date
Migrare nouă `leads(id, kind 'contact'|'waitlist', name, email, message, created_at)`; RLS: anon insert, admin select. Validare server-side (email, lungimi), honeypot anti-spam. Intră în audit doar fără date personale în jurnal (ca la restul tabelelor).

## Testare
`npm run check`; test DB pentru RLS pe `leads` (anon insert da, anon select nu); verificare vizuală mobil/desktop; test manual formulare.

## În afara scopului
Clerk (faza 2), blog, i18n/EN, analytics, plăți.
