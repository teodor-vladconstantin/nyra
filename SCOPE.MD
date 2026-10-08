# Nyra — Scope MVP

## Context
Tool ATS folosit acum de un singur business (compania tatălui lui Duku), fără billing, fără useri externi plătitori. Scop imediat: înlocuiește Excel/email cu un sistem real de recrutare, cu parsing automat de CV-uri și automatizări de comunicare. Scop de arhitectură: cod scris astfel încât adăugarea unui al doilea business/client mai târziu să fie o migrare de date, nu o rescriere. Asta înseamnă izolare pe organizație direct în schema DB și în cod de la prima linie, dar fără UI, billing sau features de multi-tenant construite acum. Regula: pregătit structural, simplu funcțional.

## Utilizatori
- Acum: 1-3 useri interni, toți sub aceeași organizație (tatăl + eventual 1-2 persoane HR/asistenți)
- Fără roluri complexe la început: toți sunt admin. Dacă apare nevoie reală de restricționare, se adaugă rol "viewer" mai târziu, fără schimbare de schemă (vezi tabelul `memberships` mai jos)
- Auth: Supabase Auth (email + parolă). Fără Clerk, dar structurat pe organizație de la început, nu pe user direct — vezi model de date

## Componente principale

### 1. Career page publică
- Pagină publică (`/cariere` sau subdomeniu) cu lista joburilor active
- Fiecare job: titlu, descriere, cerințe, locație, tip contract
- Formular de aplicare: nume, email, telefon, upload CV (PDF/DOCX)
- La submit: CV se salvează în Supabase Storage, se creează candidat + aplicație în DB, se declanșează parsing (vezi punct 3)

### 2. Panou intern (admin)
- Listă joburi (creare, editare, activare/dezactivare)
- Pentru fiecare job: listă candidați, cu status pipeline
- Pipeline simplu tip kanban: Aplicat → În review → Interviu → Ofertă → Angajat / Respins
- Vizualizare candidat: date de contact, CV original, text extras, cuvinte cheie găsite, scor de potrivire cu jobul
- Note interne pe candidat (comentarii libere, per etapă)

### 3. Parsing CV + matching (Python + LlamaParse)
- Serviciu separat în Python (poate rula ca funcție serverless sau microserviciu mic pe Vercel/Railway)
- Flux:
  1. CV nou încărcat → trigger către serviciul Python
  2. LlamaParse extrage text curat din PDF/DOCX (funcționează mult mai bine decât parsere clasice pe CV-uri cu layout variat)
  3. Extragere cuvinte cheie din text (skills, ani experiență, tehnologii) — fie regex/NLP simplu, fie un apel Claude API pentru extragere structurată (JSON cu skills, experiență, educație)
  4. Comparare cuvinte cheie candidat vs cerințe job → scor de potrivire (0-100), similar logicii din Joben dar aplicat invers (job → candidat, nu candidat → job generic)
  5. Rezultat salvat în DB: `parsed_text`, `extracted_keywords`, `match_score`

### 4. Automatizări email (n8n)
- n8n rulează separat (self-hosted pe un VPS mic, sau n8n cloud dacă vrei zero mentenanță)
- Comunicare: aplicația trimite webhook către n8n la evenimente cheie
- Automatizări de bază:
  - Candidat aplică → email automat de confirmare primire
  - Status schimbat în "Interviu" → email cu invitație (template editabil)
  - Status schimbat în "Respins" → email politicos de refuz
  - Reminder intern (Slack/email către tatăl tău) când apare candidat cu scor mare (ex. >80)

## Structură date (Supabase/Postgres) — pregătită pentru multi-tenant, folosită ca single-tenant

Regula de bază: fiecare tabel de business (nu tabelele de sistem) are `organization_id`. Acum există o singură organizație (seed fix la setup), dar coloana e acolo de la prima migrare. Adăugarea unui al doilea client mai târziu înseamnă un rând nou în `organizations` + RLS pe care deja îl ai, nu ALTER TABLE pe toate tabelele și nicio rescriere de query-uri.

**organizations**
- id, name, created_at
- (acum: un singur rând, compania tatălui tău)

**memberships**
- id, organization_id (FK), user_id (FK către auth.users), role (enum: admin/viewer), created_at
- Rezolvă și "toți sunt admin acum" și "rol viewer mai târziu" fără schimbare de schemă, doar adaugi rânduri

**jobs**
- id, organization_id (FK), title, description, requirements (text), keywords (array), status (active/closed), created_at

**candidates**
- id, organization_id (FK), name, email, phone, cv_url, parsed_text, extracted_keywords (jsonb), created_at

**applications**
- id, organization_id (FK), candidate_id (FK), job_id (FK), stage (enum: applied/review/interview/offer/hired/rejected), match_score, notes, updated_at

**stage_history**
- id, organization_id (FK), application_id (FK), old_stage, new_stage, changed_at

**Row Level Security (RLS) pe Supabase**: activezi de la început policy de tip "user vede doar rândurile din organization_id-urile lui, via memberships". Cu o singură organizație, toată lumea vede tot (normal). Când apare a doua organizație, izolarea e deja garantată de DB, nu de logica din aplicație — asta e partea care contează cel mai mult pentru "scalabil", izolarea de date nu trebuie să fie corectă în cod, e corectă structural.

**De ce nu e overengineering**: e o singură coloană FK în plus per tabel + un tabel `organizations`/`memberships` mic. Cost aproape zero acum, dar elimină exact munca dureroasă (migrare de date live, rescriere de queries, risc de scurgere de date între clienți) care apare dacă adaugi multi-tenant pe un schema care n-a avut-o niciodată.

## Stack tehnic
- Frontend + backend: Next.js 14 (App Router), la fel ca Joben — refolosești cunoștințe direct
- DB + Storage + Auth: Supabase, cu RLS pe organization_id de la prima migrare
- Parsing: Python microserviciu (FastAPI simplu) + LlamaParse API, stateless — primește `organization_id` explicit în request, nu presupune un singur client hardcodat în cod
- AI extragere/scor: Claude API (ai deja integrare din Joben, refolosești logica)
- Automatizări: n8n (self-hosted sau cloud), workflow-uri parametrizate pe organization_id, nu hardcodate pentru un singur business
- Hosting: Vercel (Next.js) + Railway sau Fly.io pentru serviciul Python (Vercel nu e ideal pentru procese Python long-running)
- Email transactional (dacă nu totul trece prin n8n): Resend, la fel ca Joben

## Reguli de cod pentru reutilizare (aplică-le direct în Claude Code, nu ca refactor ulterior)
- Niciun query nu selectează direct din `jobs`/`candidates`/`applications` fără filtru pe `organization_id` — pune asta într-un helper/wrapper de query de la început, nu-l repeta manual în fiecare rută
- Config-uri specifice unui business (nume companie, logo, template-uri email) stau în tabelul `organizations` sau într-un tabel de settings legat de el, niciodată în variabile de mediu sau hardcodate în cod
- Componentele de UI (career page, kanban, formular aplicare) primesc `organizationId` ca parametru/context, nu-l presupun implicit
- Serviciul de parsing Python e apelat cu `organization_id` explicit în payload, nu are alt "assume single client"

## Faze de construcție (ordine recomandată pentru Claude Code)

**Faza 1 — Fundație**
- Schema DB completă (jobs, candidates, applications, stage_history)
- Auth simplu (login intern)
- CRUD joburi din panoul admin

**Faza 2 — Career page + aplicare**
- Pagină publică cu joburi active
- Formular aplicare + upload CV în Supabase Storage
- Candidat + aplicație create automat la submit

**Faza 3 — Parsing + scor**
- Microserviciu Python cu LlamaParse
- Extragere cuvinte cheie (regex sau Claude API structured output)
- Calcul scor de potrivire, salvat pe aplicație

**Faza 4 — Pipeline intern**
- Vizualizare kanban cu drag-and-drop între etape
- Vizualizare detaliu candidat (CV, text extras, scor, note)

**Faza 5 — Automatizări n8n**
- Webhook-uri din aplicație către n8n la schimbare de status
- Template-uri email (confirmare, interviu, respins)
- Notificare internă pentru scor mare

## Ce NU intră în scope acum (evită scope creep)
- Billing/planuri de preț (nu ai clienți plătitori pe Nyra momentan)
- UI de administrare organizații/invitat useri noi/switch între organizații
- Permisiuni granulare pe feature (rămâne admin/viewer simplu)
- Onboarding self-service pentru un business nou
- Integrare cu joburi boards externe (LinkedIn, eJobs etc.)
- Mobile app dedicat

Diferența față de multi-tenant "real": ai structura de date și codul pregătite (organization_id peste tot, RLS, fără hardcodări), dar zero UI sau flux de business pentru a adăuga un al doilea client. Când apare clientul 2, adaugi un rând în `organizations`, inviți userii lui în `memberships`, și restul funcționează fără migrare de schemă sau rescriere de query-uri. Asta e diferența dintre "scalabil" (ce ai cerut) și "construit ca SaaS de la ziua 1" (ce ar fi risipă de timp acum).