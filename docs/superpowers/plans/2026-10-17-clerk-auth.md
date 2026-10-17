# Clerk auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Spec: `docs/superpowers/specs/2026-10-17-clerk-auth-design.md`.

**Goal:** Clerk înlocuiește Supabase Auth; RLS pe `jwt sub` (text); contul existent se leagă după email.
**Architecture:** `app_uid()` din JWT; `profiles` scris doar din funcții `security definer`; clientul Supabase primește token-ul Clerk (`accessToken`).
**Tech Stack:** Next 14.2, `@clerk/nextjs@6`, `@clerk/localizations`, supabase-js 2.117, PGlite.

## Global Constraints
- Migrare și `supabase/bootstrap/after_init.sql` identice (test de echivalență).
- Emailul vine doar din claim-ul `email` al token-ului; clientul nu poate scrie `profiles`.
- Cheile Clerk le pune utilizatorul; Claude nu le citește/introduce.

## Tasks
1. **DB**: `tests/_pglite.mjs` (stub `auth.jwt()`, `as()` setează `sub`+`email`), test `clerk-auth.test.mjs` (întâi, pică), migrarea `20261018000000_clerk_auth.sql`, secțiunea 13 în bootstrap. Commit.
2. **Clerk dashboard**: claim `email` în session token (Chrome).
3. **Aplicație**: deps; `ClerkProvider` + `roRO`; `middleware.ts`; `/sign-in`, `/sign-up`; `/login`→redirect; `lib/supabase.ts`; `lib/org.ts` (`sync_user` → `/onboarding`); `/onboarding`; sign-out în shell; linkuri marketing; `robots.ts`. Commit.
4. **Verificare**: `npm run check`, `npm run build` (marketing static), E2E după ce utilizatorul pune cheile și se înregistrează.
