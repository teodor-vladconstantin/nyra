import { LEGAL_VERSION } from "@/lib/legal";

// Consimțământul pentru cookie-uri opționale (statistici). Strict necesarele (sesiunea Clerk) nu depind de el.
// Stocat doar în browser, cu data și versiunea politicii. Un script opțional (PostHog etc.) se încarcă DOAR dacă getConsent()?.analytics e true
// și se reevaluează la evenimentul CONSENT_EVENT.
export const CONSENT_KEY = "nyra_consent";
export const CONSENT_EVENT = "nyra:consent";
export const OPEN_SETTINGS_EVENT = "nyra:cookie-settings";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export type Consent = { v: string; at: string; analytics: boolean };

// null = nu a ales (sau alegerea a expirat / e pentru altă versiune a politicii): se cere din nou.
export function getConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as Consent | null;
    if (!c || c.v !== LEGAL_VERSION || Date.now() - Date.parse(c.at) > MAX_AGE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean) {
  const c: Consent = { v: LEGAL_VERSION, at: new Date().toISOString(), analytics };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch {
    // storage blocat: alegerea nu se poate salva, bannerul reapare la următoarea vizită
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}
