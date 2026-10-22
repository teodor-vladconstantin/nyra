"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, OPEN_SETTINGS_EVENT, setConsent } from "@/lib/consent";

// Refuzul are aceeași vizibilitate ca acceptul. Nimic opțional nu se încarcă înainte de alegere (vezi lib/consent.ts).
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const show = () => {
      setAnalytics(getConsent()?.analytics ?? false);
      setPrefs(true);
      setOpen(true);
    };
    if (!getConsent()) setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, []);

  if (!open) return null;
  const choose = (value: boolean) => {
    setConsent(value);
    setOpen(false);
    setPrefs(false);
  };

  return (
    <div role="dialog" aria-label="Cookie-uri" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-pop">
      <p className="text-sm leading-relaxed">
        Folosim cookie-uri strict necesare pentru autentificare, care nu cer acord. Momentan nu folosim cookie-uri opționale; dacă adăugăm statistici, nu se
        încarcă fără acordul tău. Detalii în <Link href="/cookies" className="text-brand underline underline-offset-4">Politica de cookies</Link>.
      </p>
      {prefs && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-muted-foreground"><b className="text-foreground">Strict necesare:</b> mereu active.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 size-4 accent-primary" />
            <span><b>Statistici</b> (PostHog, planificat, nu este activ încă).</span>
          </label>
          <Button variant="outline" onClick={() => choose(analytics)}>Salvează preferințele</Button>
        </div>
      )}
      {!prefs && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => choose(false)}>Refuz opționalele</Button>
          <Button variant="outline" onClick={() => choose(true)}>Accept toate</Button>
          <Button variant="ghost" onClick={() => setPrefs(true)}>Preferințe</Button>
        </div>
      )}
    </div>
  );
}

// Link de footer care redeschide preferințele.
export function CookieSettingsLink() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
      Setări cookie
    </button>
  );
}
