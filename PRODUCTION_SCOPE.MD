# Nyra — Spec Producție (Faza 2)

Nu MVP, nu "merge și așa". Fiecare componentă de mai jos e la nivel de lansare reală, nu de demo. Se adaugă peste fundația deja implementată (organization_id, RLS, Supabase, Next.js 14, Python parsing, n8n).

---

## 1. Verificare anti-bot (Cloudflare Turnstile)

**Nu widget decorativ. Verificare reală, server-side.**

- Turnstile (nu reCAPTCHA — Turnstile e gratuit, mai rapid, fără cookie-uri de tracking Google, se integrează nativ cu Cloudflare dacă hostezi acolo)
- Widget pe formularul de aplicare, mod "managed" (Cloudflare decide dacă arată challenge vizual sau trece direct, bazat pe risc)
- **Critic**: token-ul Turnstile se verifică server-side la submit, în route handler-ul Next.js, prin siteverify API către Cloudflare, ÎNAINTE de a scrie orice în DB sau de a trece CV-ul la parsing. Fără verificare server-side, widget-ul e teatru — orice bot poate trimite POST direct la endpoint și ignora frontend-ul complet.
- Rate limiting suplimentar pe endpoint-ul de aplicare (ex. Upstash Redis, ai deja experiență cu el din Joben): max N aplicații per IP per oră, indiferent de Turnstile — apără și de useri reali care spam-ează accidental
- Fail closed: dacă verificarea Turnstile eșuează sau time-out, aplicația e respinsă cu mesaj clar, nu trece "silent" pe fallback

## 2. Parsing structurat de experiențe (tabel, nu blob de text)

**Asta e diferența dintre "am extras cuvinte cheie" și "am construit un ATS".**

Structură de date nouă, separată de `parsed_text` (care rămâne ca fallback/audit):

**candidate_experiences**
- id, organization_id, candidate_id (FK)
- company_name, role_title, employment_type (enum: full_time/part_time/contract/internship/freelance)
- start_date, end_date (nullable pentru "prezent")
- description (text liber, extras din CV)
- seniority_level (enum: junior/mid/senior/lead — inferat de AI, editabil manual)
- extracted_skills (jsonb array) — skill-urile specifice menționate în rolul respectiv, nu globale pe candidat

**Flux de parsing (Python + Claude API, structured output):**
1. LlamaParse extrage text curat din CV
2. Apel Claude API cu prompt de extragere structurată (JSON schema strict, nu text liber parsat manual) — output: listă de experiențe, fiecare cu company/role/perioada/tip/skills
3. Validare schema (Pydantic în Python) înainte de insert — dacă AI-ul dă output malformat, aplicația nu crapă, se marchează candidatul pentru revizuire manuală (`parsing_status: needs_review`), nu se pierde aplicația
4. Rezultatul se scrie în `candidate_experiences`, una sau mai multe rânduri per candidat

**UI de filtrare (panoul intern):**
- Vizualizare tip tabel (nu doar kanban) cu toți candidații, coloane: nume, rol curent/ultim, ani experiență totali (calculat din experiențe), seniority, scor match
- Filtre combinabile: rol (dropdown din `role_title` distinct, sau text search), seniority, ani minimi de experiență, skill specific
- Search full-text pe `parsed_text` + pe `role_title`/`company_name` din experiențe, un singur search bar care caută în toate (Postgres full-text search cu `tsvector`, indexat — nu `LIKE '%x%'` care nu scalează)

## 3. Termeni și condiții — consimțământ real, cu audit trail

**Nu doar un checkbox de UI. Trebuie să poți dovedi cine, ce versiune, când.**

- Textul T&C + politica de confidențialitate (GDPR — colectezi date personale de la candidați din UE) versionate: fiecare versiune are `id`, `content`, `published_at`
- Checkbox obligatoriu la submit, dezactivat vizual dacă nu e bifat (nu doar validare JS, și validare server-side — request-ul fără consimțământ e respins la nivel de API, nu doar de UI)
- **consent_records**: id, organization_id, candidate_id (FK), terms_version_id (FK), accepted_at (timestamp), ip_address
- Acesta e non-negociabil pentru un ATS real: dacă un candidat cere ștergerea datelor (drept GDPR), ai nevoie de dovada consimțământului și data exactă ca să răspunzi corect unei eventuale plângeri

## 4. Administrare companii + pagini publice (multi-tenant, cu UI acum)

Aici se activează UI-ul pentru structura `organizations`/`memberships` deja pregătită în schema.

**Panou "Companiile mele"**
- User autentificat vede lista organizațiilor unde e membru
- Poate crea o organizație nouă (devine automat admin al ei)
- Poate invita alți useri într-o organizație (email de invitație prin Resend, link cu token expirabil, la acceptare se creează `membership`)
- Switch între organizații dacă userul e membru în mai multe (context selector, nu URL hardcodat)

**Pagină de companie (publică, per organizație)**
- URL dedicat per companie: `nyra.app/c/[company-slug]` (slug unic, generat din nume, editabil)
- Conținut: logo, descriere companie, cultură/beneficii (câmpuri editabile din panou), lista joburilor active ale acelei companii
- Editor de brand minim: logo upload (Supabase Storage), culoare de accent (aplicată pe butoane/header-ul paginii publice), nu un theme builder complex — un set fix de câmpuri, suficient pentru identitate vizuală fără scope creep

**Joburi, scoped corect**
- Fiecare job apare doar sub compania lui, CRUD-ul de joburi filtrat automat de `organization_id` din context (RLS + query scoping deja pregătite din faza 1, acum au UI real peste ele)

## 5. Vizualizare CV inline (nu doar download)

- Viewer de PDF direct în pagina de detaliu candidat (react-pdf sau pdf.js embed), fără să deschizi tab nou sau să descarci fișierul
- Pentru CV-uri .docx: conversie la PDF la upload (server-side, ex. LibreOffice headless sau un serviciu de conversie) ca să ai mereu un preview consistent, indiferent de formatul original — nu încerci să faci preview nativ de .docx în browser, e fragil
- Split view în panoul de candidat: CV original (stânga) + experiențe extrase structurat (dreapta), ca recruiterul să verifice rapid corectitudinea parsării

## 6. Automatizare: email de refuz la schimbare status

- Trigger: la update `applications.stage` → `rejected`, webhook către n8n cu `application_id`, `candidate_id`, `organization_id`
- n8n: query date candidat + job + template de refuz al organizației (dacă vrei mesaj personalizabil per companie, adaugi `rejection_email_template` pe `organizations`, altfel un template global editabil)
- Email trimis prin Resend, din domeniul verificat al organizației dacă ai domenii custom per companie mai târziu, altfel domeniul Nyra
- Log: se scrie `email_sent_at` pe application sau într-un tabel `email_log` (organization_id, application_id, type, sent_at, status) — ca să poți debug dacă un email n-a ajuns, nu ghicești

## Bar de calitate UI — "premium", nu default

Ca să nu rămână la nivel de "funcționează dar arată a Bootstrap din 2015":

- Componente: shadcn/ui + Tailwind (control total pe stil, nu librărie cu look fix ca Material UI)
- Stare de loading/empty/error pe fiecare listă și formular — nu spinner generic, skeleton states care arată forma reală a conținutului
- Micro-interacțiuni: tranziții pe schimbare de stage în kanban (drag-and-drop cu feedback vizual, nu jump instant), toast-uri de confirmare pe acțiuni (nu alert() de browser)
- Dark mode dacă vrei coerență cu restul brand-ului tău (opțional, dar ieftin de adăugat cu Tailwind dacă design tokens sunt puse corect de la început)
- Design tokens centralizate (culori, spacing, typography într-un fișier de config), nu valori hardcodate în componente — condiție pentru brand-ul per companie de la punctul 4 să funcționeze fără să rescrii CSS de fiecare dată

## Ordine de implementare recomandată

1. **Securitate + compliance mai întâi** (Turnstile server-side + rate limiting + consimțământ T&C cu audit trail) — astea sunt tabelele/verificările pe care restul se bazează, și sunt exact partea care nu se poate "adăuga ulterior" ușor fără gaură de date deja colectate greșit
2. **Schema experiențe + parsing structurat** — extinde pipeline-ul Python existent, nu-l rescrie
3. **UI companii + pagini publice** — activează structura organization_id/memberships deja pregătită
4. **Viewer CV inline + tabel filtrabil candidați** — UI peste datele deja structurate la pasul 2
5. **Automatizare email refuz** — cel mai simplu punct, dar pus ultimul ca să ai deja `email_log` pattern-ul stabilit dacă adaugi și alte automatizări (confirmare, interviu) în același sistem

## Ce rămâne neschimbat din faza 1
Structura `organizations`/`memberships`/RLS, stack-ul (Next.js, Supabase, Python/LlamaParse, Claude API, n8n) — nu se rescrie nimic, se extinde. Exact de-asta a meritat să pui `organization_id` de la început.