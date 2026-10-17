# Nyra marketing site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Site public de SaaS pentru Nyra (landing, produs, prețuri, FAQ, contact, despre, legale) în brandul existent.
**Architecture:** Grup de rute `web/app/(marketing)/` cu layout propriu; `/` devine landing (dispare redirectul la `/admin`). Formularele (contact/waitlist) scriu în `leads` prin server action cu clientul Supabase existent.
**Tech Stack:** Next 14 App Router, Tailwind (tokenuri existente), Radix/shadcn existent, Supabase, PGlite pentru teste. Zero dependențe noi.

## Global Constraints
- Română, `lang="ro"`; fără cifre/clienți/procente inventate.
- Brand: tokenuri din `globals.css` (dark-first, accent galben doar pentru accent), Poppins.
- `leads`: insert pentru anon/authenticated, FĂRĂ select pentru ei (citire doar service_role/dashboard; leadurile aparțin operatorului, nu organizațiilor-client). Corecție față de spec: „citire doar admin" = operator.
- Orice schimbare de schemă apare identic în migrare ȘI în `supabase/bootstrap/after_init.sql` (test de echivalență).

## Tasks
1. **`leads` (DB)**: `supabase/migrations/20261017000000_leads.sql` + secțiune 12 în `after_init.sql` + `web/tests/leads.test.mjs` (anon insert ok; anon select = 0 rânduri; kind invalid/email invalid/mesaj >5000 respinse). Commit.
2. **Shell**: `Brand` primește `href` (implicit `/admin`); `(marketing)/layout.tsx`, `components/marketing/{header,footer,section,faq-list}.tsx`; mută `/` în `(marketing)/page.tsx`. Commit.
3. **Pagini conținut**: `/`, `/produs`, `/preturi`, `/faq`, `/despre`, `/confidentialitate`, `/termeni`. Commit.
4. **Formulare**: `web/lib/leads.ts` (`submitLead` server action: validare, honeypot, insert, redirect cu `?toast=`), `components/marketing/{contact-form,waitlist-form}.tsx`, `/contact`. Commit.
5. **SEO**: `metadata` per pagină, `app/sitemap.ts`, `app/robots.ts` (disallow `/admin`). Commit.
6. **Verificare**: `npm run check` + `npm run build`; browser desktop/mobil, ambele teme; trimitere formular.
