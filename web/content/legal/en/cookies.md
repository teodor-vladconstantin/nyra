# Nyra Cookie Policy

> **Version:** 0.1 (draft) | **Effective from:** [TO BE COMPLETED at launch] | **Last updated:** 22 October 2026
> **Operator:** TETA ABC SRL, CUI 22404824, Trade Register no. J2007001135104, Str. Centrală no. 169, Mărăcineni village, Buzău county, postal code 127325, Romania | **Contact:** hello@joben.eu | **Data protection:** privacy@joben.eu
>
> Courtesy translation. The Romanian version prevails.
> **Internal note.** The table reflects what results from the code (Phase 1). Before publication, check names, duration and the exact set in the browser on the live site (DevTools, Application), especially for Clerk, Turnstile and Clerk Protect. [TO BE COMPLETED]

## What cookies are

Cookies and local storage are small files or values stored in your browser. We use them only as far as necessary. The optional ones (statistics) are not loaded without your consent. You can refuse as easily as you accept and change your choice at any time from the "Cookie settings" link in the page footer.

## Strictly necessary (no consent)

Without these, authentication and security do not work. Under Law 506/2004 Art. 4(5), they do not require consent.

| Name | Provider | Purpose | Duration |
|---|---|---|---|
| `__session` | Clerk | Keeps the session authenticated | Session [TO BE VERIFIED] |
| `__client_uat` | Clerk | Syncs authentication state between tabs | [TO BE VERIFIED, approx. 1 year] |
| `__clerk_db_jwt` | Clerk | Technical token (development only) | Session |
| Cloudflare Turnstile / Clerk Protect | Cloudflare / Clerk | Anti-bot check at registration, only on registration pages | [TO BE VERIFIED: what it stores, if anything] [TO BE VERIFIED BY LAWYER: whether strictly necessary] |
| `joben_nyra_consent` (to be implemented) | Nyra | Stores your cookie choice, with the date and policy version | 12 months |

## Preferences (local storage)

| Name | Provider | Purpose | Duration |
|---|---|---|---|
| `theme` | Nyra (next-themes) | Remembers your light or dark theme, at your choice | Until deleted [TO BE VERIFIED BY LAWYER: whether it can be treated as strictly necessary; TO BE VERIFIED in the browser when it is written] |

## Optional, only with your consent

**None is active at present.** If we add them, they will not load before you consent.

| Name | Provider | Purpose | Duration | Status |
|---|---|---|---|---|
| `ph_*` (cookie and localStorage) | PostHog (EU instance) | Product statistics and possibly session recordings | up to 1 year | Planned, not active |
| `sentryReplaySession` (sessionStorage) | Sentry (EU instance) | Session recording for diagnosing errors | session | Planned, not active |

Sentry error reporting without session recording does not use cookies and relies on legitimate interest, with personal data removed. [TO BE COMPLETED: confirm scrubbing setting.]

We do not use advertising or marketing cookies.

## How you manage your choice

- The first time you visit, we show a banner with "Reject all" and "Accept all" buttons with the same prominence, plus "Preferences".
- You can change your choice at any time from "Cookie settings" in the footer.
- We ask again after 12 months or if you clear the site's data in your browser.
- You can delete cookies at any time from your browser settings; authentication will then be lost.

We keep your choice (date and policy version) so that we can prove consent.

## Link with personal data

Processing of personal data through these technologies is described in the Privacy Policy. For questions: privacy@joben.eu.
