# Nyra – autentificare cu Clerk (design)

Data: 2026-10-17. Faza 2 din 2 (faza 1: site de marketing, livrată). Limba UI: română.

## Scop
Înlocuim Supabase Auth cu Clerk ca singur furnizor de identitate (înregistrare, login, parolă, sesiuni, reset). Organizațiile, rolurile și datele rămân în Supabase, iar RLS rămâne mecanismul de izolare între clienți.

## Stare deja făcută (configurare, 2026-10-17)
- Clerk: aplicația „Nyra", instanța **Development**, domeniu `https://promoted-starfish-3887.clerk.accounts.dev`; email + parolă + cod pe email active; integrarea Supabase pornită (adaugă claim-ul `role: authenticated` în token).
- Supabase (proiect `cfhkhcnbgfcdkxqxqvss`): Authentication → Third-Party Auth → Clerk, cu domeniul de mai sus, „Enabled".
- Rămâne la utilizator: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` și `CLERK_SECRET_KEY` în `web/.env.local` și pe Vercel (Claude nu le citește și nu le introduce).

## Decizii
- **Clerk doar pentru identitate.** Fără Clerk Organizations (nu legăm modelul de date de un serviciu plătit). Tenancy rămâne `organizations` + `memberships` (roluri `admin` / `viewer`).
- **Pachet:** `@clerk/nextjs@6.x` (6.39+ are peer `next ^14.2.25`; v7 cere Next ≥ 15.2.8, deci nu urcăm Next acum). `@clerk/localizations` pentru `roRO`. Se verifică versiunile cu `npm view` la implementare.
- **Clientul Supabase** folosește token-ul Clerk (`accessToken` din `@supabase/supabase-js`, deja 2.117) în loc de cookie-urile `@supabase/ssr`. Fără sesiune ⇒ fără token ⇒ rol `anon` (formularele publice `leads` merg ca acum).
- **Id utilizator = text** (`jwt sub`, forma `user_...`). O funcție SQL `app_uid() returns text` = `auth.jwt()->>'sub'` înlocuiește peste tot `auth.uid()`.
- **`profiles(user_id text pk, email text not null, created_at)`**: cine e utilizatorul (email pentru jurnal și echipă), pentru că `auth.users` nu mai e sursa. Se completează la prima cerere autentificată (server action `ensureProfile`).
- **Înregistrare restricționată (invitație)** în Clerk (Configure → Access mode) până decide proprietarul altfel. Motiv: textul site-ului e „Cere acces", iar upload-ul de CV costă (LlamaParse). Se schimbă din Clerk, fără cod.
- **Legarea contului existent:** `nyra@joben.eu` (uuid din Supabase Auth) devine utilizatorul Clerk cu același email verificat, automat, prin funcția `claim_legacy_user()`.
- **Instanța Development** acum. Pentru producție: instanță Clerk Production + domeniu custom + adăugarea domeniului de producție în Supabase Third-Party Auth (în afara acestui spec, dar notat în „Lansare").

## Schema (migrare `20261018000000_clerk_auth.sql` + secțiune 13 în `after_init.sql`)
1. `create function app_uid() returns text language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '') $$;`
2. `create table profiles (user_id text primary key, email text not null, created_at timestamptz default now())`, RLS: fiecare își vede propriul rând și membrii aceleiași organizații se văd între ei; insert/update doar pentru `user_id = app_uid()`.
3. Coloane `uuid → text`, fără FK la `auth.users`, cu FK la `profiles(user_id)` unde e cazul: `memberships.user_id`, `candidate_notes.author_id`, `saved_filters.user_id`, `candidate_scorecards.author_id`, `audit_log.actor_id` (fără FK: jurnalul rămâne imuabil și păstrează id-uri vechi). Default-urile `auth.uid()` devin `app_uid()`.
4. Politici și funcții care folosesc `auth.uid()`: `is_member`, `is_admin`, politicile pe `memberships`, `candidate_notes`, `saved_filters`, `candidate_scorecards`, storage `cvs` (folder = organization_id), trigger-ul `edited_manually` (`app_uid() is not null`). Vederile care făceau join pe `auth.users` (lista actorilor din jurnal, echipa din Setări) fac join pe `profiles`, cu fallback `coalesce(profiles.email, auth.users.email)` pentru istoricul vechi.
5. `create_organization(p_name text)` — `security definer`: creează organizația și `memberships(admin)` pentru `app_uid()`; refuză dacă utilizatorul are deja o organizație (1 organizație per utilizator în această fază); `revoke` de la `anon`.
6. `claim_legacy_user()` — `security definer`: dacă `profiles.email` al apelantului = email din `auth.users` și acel `id::text` apare în `memberships`, rescrie `memberships.user_id`, `candidate_notes.author_id`, `saved_filters.user_id`, `candidate_scorecards.author_id` la `app_uid()`. `audit_log` nu se rescrie (imuabil; vederea îl rezolvă prin fallback). Idempotentă.
7. Testele DB: stub `auth.jwt()` în `tests/_pglite.mjs` (`request.jwt.claims`), helperul `as()` setează `sub`; testele existente continuă cu id-uri text; test nou `clerk-auth.test.mjs` (RLS pe `sub` text, `create_organization` o singură dată, `claim_legacy_user`, profil vizibil doar în organizație, anon nu poate apela funcțiile). Testul de echivalență bootstrap ↔ migrări rămâne verde.

## Aplicație (`web/`)
- `app/layout.tsx`: `<ClerkProvider localization={roRO} appearance={...}>` cu tokenurile de brand (galben `#edb30a`, fundal `#111113`, Poppins).
- `middleware.ts`: `clerkMiddleware`; `/admin(.*)` și `/onboarding` cer sesiune (redirect la `/sign-in?redirect_url=`); ruta publică rămâne neatinsă. Redirect-ul păstrează `safeNext` ca acum.
- `app/sign-in/[[...sign-in]]/page.tsx` și `app/sign-up/[[...sign-up]]/page.tsx` cu `<SignIn/>` / `<SignUp/>` în stilul paginii de login actuale. `/login` redirecționează la `/sign-in` (linkuri vechi). Variabile `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `..._SIGN_UP_URL=/sign-up`, `..._SIGN_IN_FALLBACK_REDIRECT_URL=/admin`.
- `lib/supabase.ts`: `createClient()` devine client `supabase-js` cu `accessToken: async () => (await auth()).getToken()`; același nume și semnătură, deci apelanții nu se schimbă.
- `lib/org.ts`: `requireAdmin()` citește `auth().userId`, apelează `ensureProfile` + `claim_legacy_user()` (o dată pe sesiune), apoi caută `memberships`; fără organizație ⇒ redirect `/onboarding`.
- `app/onboarding/page.tsx` + server action: formular „Numele organizației" ⇒ `create_organization` ⇒ `/admin`.
- Ieșirea din cont: `UserButton` / `SignOutButton` în `app-shell` în locul acțiunii de signOut din `app/admin/actions.ts`.
- Site-ul de marketing: butoanele „Autentificare" → `/sign-in`, „Cere acces" rămâne `/contact`. Paginile marketing rămân statice (se verifică în output-ul build-ului).
- `robots.ts`: `disallow` pentru `/sign-in`, `/sign-up`, `/onboarding` în loc de `/login`.
- Se șterg: logica `signInWithPassword` din `/login`, importul `@supabase/ssr` din `middleware.ts`/`lib/supabase.ts` (pachetul rămâne dacă mai e folosit; altfel se scoate).

## Rulare în producție (ordine)
1. Utilizatorul pune cheile Clerk în Vercel și `.env.local`.
2. Se aplică migrarea în SQL Editor (compatibilă înainte: după ea, login-ul vechi nu mai merge).
3. Deploy pe Vercel (un singur `git push`).
4. Utilizatorul se înregistrează în Clerk cu `nyra@joben.eu` (email verificat) ⇒ `claim_legacy_user()` îi leagă organizația „Compania" și datele.
5. Rollback: revenire la commit-ul anterior + migrare inversă (un script `down` este inclus în comentarii în migrare).

## Testare
- `npm run check` (lint, typecheck, teste DB incl. echivalența) și `npm run build` (paginile marketing statice).
- E2E în browser: utilizatorul face sign-up/sign-in în fereastra deschisă de Claude (parola o introduce el), Claude rulează suita existentă (note, scorecard, job, upload, GDPR, jurnal) pe sesiunea Clerk, apoi șterge datele de test.

## În afara scopului
Invitații de colegi în organizație (echipa se administrează din Supabase), Clerk Organizations, plăți și planuri, login social și MFA (se pot porni din Clerk fără cod), instanța Clerk Production și domeniul custom.
