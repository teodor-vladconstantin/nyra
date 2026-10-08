# Nyra

Parser de CV-uri cu aer de ATS: încarci CV-uri (PDF/DOCX), Nyra extrage datele de contact și experiența profesională,
iar candidații apar într-un tabel filtrabil, cu căutare după cuvinte cheie, status, note, export CSV și CV-ul afișat inline.

| Parte | Unde | Rulare locală |
|---|---|---|
| App (Next.js 14, shadcn/ui) | `web/` | `cd web && npm run dev` → http://localhost:3000 |
| Parsing CV (FastAPI + LlamaParse/LlamaExtract) | `parser/` | `cd parser && uv run --env-file .env uvicorn main:app --port 8000` |
| Schema DB (Supabase) | `supabase/migrations/` | aplicate în ordine în proiectul Supabase |

## Configurare

- `web/.env.local` (vezi `.env.local.example`): URL + cheie publică Supabase, `PARSER_URL`, `PARSER_TOKEN`.
- `parser/.env` (vezi `.env.example`): `SUPABASE_SECRET_KEY`, `LLAMA_CLOUD_API_KEY`, același `PARSER_TOKEN`.
- Acces: userul se creează în Supabase Auth, apoi un rând în `memberships` pentru organizația existentă (rol `admin` sau `viewer`).
- Producție: `parser/Dockerfile` include LibreOffice pentru previzualizarea CV-urilor DOCX (Railway/Fly). Next.js pe Vercel.

## Cum funcționează

1. Upload în admin (mai multe fișiere deodată): se validează tipul real al fișierului, se salvează în bucket-ul privat `cvs`
   și se creează candidatul cu status „În așteptare”.
2. Parserul primește `candidate_id`: în paralel, LlamaParse extrage textul, LlamaExtract extrage contactul și experiențele
   după o schemă, iar DOCX-ul e convertit în PDF pentru previzualizare.
3. `extract.py` validează și normalizează rezultatul (date în orice format uzual, tip angajare, skill-uri canonice,
   seniority dedus când lipsește); orice anomalie marchează candidatul „Necesită revizuire”.
4. Tabelul citește vederea `candidate_overview` (rol curent, ani de experiență fără suprapuneri, skill-uri) și caută
   full-text în CV, roluri și companii, fără diacritice.

## Audit și GDPR

- **Jurnal de activitate** (`/admin/jurnal`): triggere pe baza de date înregistrează cine a creat/modificat/șters candidați, experiențe, note, membri și
  setări. Nu se păstrează `parsed_text`; datele personale (nume, email, telefon, text note etc.) apar doar ca „date personale", iar valorile lungi se trunchiază la 200 de caractere.
  Jurnalul nu poate fi modificat sau șters (nici de admini). Un tabel nou intră în jurnal cu `select audit_attach(nume_tabel);` (sau `select audit_attach_all();`).
- **Retenție** (`/admin/setari`): perioadă în luni per organizație; „Șterge acum" rulează `purge_expired_candidates` (doar admini), care șterge candidații
  expirați și întoarce fișierele pentru bucket-ul `cvs`. Ștergerea unui singur candidat: `erase_candidate(id)` (helper `eraseCandidate` în `web/lib/audit.ts`).
- **Export date candidat**: `GET /admin/gdpr/export?id=<candidate_id>` întoarce JSON cu fișa, experiențele și notele (și înregistrează exportul în jurnal).

## Teste

- `cd web && npm run check` — lint + typecheck + testele DB (ce rulează și CI-ul, plus build-ul).
- `cd web && npm run test:db` — rulează fiecare `web/tests/*.test.mjs` pe Postgres WASM (PGlite) cu toate migrările aplicate: RLS/izolare, upload, căutare, audit, retenție.
  Un test nou: fișier `web/tests/<nume>.test.mjs` care importă `db` din `./_pglite.mjs`; se rulează automat.
- `cd parser && uv run python extract.py && uv run python tests/test_parser.py`
- CI (`.github/workflows/ci.yml`, la PR și push): web (lint, typecheck, test:db, build) și parser (uv). Nu cere secrete.

## Deploy

**1. Supabase** — migrările din `supabase/migrations/` se aplică **în ordine** (nume = timestamp): fie lipite una câte una în SQL Editor, fie cu
`supabase link --project-ref <ref> && supabase db push`. Sunt forward-only; nu edita una deja aplicată, adaugă una nouă.
Creează userii în Auth și rândurile din `memberships`. Bucket-ul privat `cvs` îl creează migrările.

**2. Parser (Railway sau Fly)** — build din `parser/Dockerfile` (include LibreOffice). Variabile: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `LLAMA_CLOUD_API_KEY`, `PARSER_TOKEN`.
Railway: serviciu nou din repo, Root Directory `parser`, health check `/health`. Fly: `cd parser && fly launch --dockerfile Dockerfile --internal-port 8000`.
Sweeper: rulează intern, în buclă. Dacă instanța scalează la zero (Fly `auto_stop_machines`, Railway serverless), adaugă un cron extern care reia rândurile blocate:
`curl -fsS -X POST -H "Authorization: Bearer $PARSER_TOKEN" $PARSER_URL/sweep` — la 5 minute (Railway Cron, cron-job.org sau GitHub Actions `schedule`).
Fiabilitate parsing: `/parse` revendică atomic candidatul (idempotent) și răspunde 202. Erorile tranzitorii (429/5xx/timeout) se reîncearcă de 3 ori cu backoff; eșecul final setează `parsing_status=failed` și `parse_error` în română. Sweeper-ul reia candidații blocați în `processing` > 15 min sau `pending` > 5 min, maximum 5 per organizație pe rulare; `/health` arată starea lui. La reprocesare, câmpurile și experiențele marcate `edited_manually` nu se suprascriu.
Variabile opționale: `PARSE_MAX_TRIES` (3), `PARSE_MAX_CLAIMS` (3), `PARSE_STALE_MINUTES` (15), `PARSE_PENDING_MINUTES` (5), `PARSE_SWEEP_SECONDS` (60), `PARSE_CONCURRENCY` (4). Limite CV: PDF/DOCX, maximum 10 MB. Teste: `cd parser && uv run python tests/test_parser.py`.

**3. Web (Vercel)** — import repo, Root Directory `web`, framework Next.js. Variabile (Production + Preview):

| Variabilă | Valoare |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL-ul proiectului Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cheia publică (anon/publishable); **nu** cheia secretă |
| `PARSER_URL` | URL-ul public al parserului, fără slash final |
| `PARSER_TOKEN` | același secret ca pe parser |

În Supabase → Authentication → URL Configuration setează Site URL la domeniul Vercel. Anteturile de securitate (CSP etc.) vin din `web/next.config.mjs`.
