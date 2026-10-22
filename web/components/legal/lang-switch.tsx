"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Ambele limbi vin randate de server; comutatorul doar le ascunde. Limba se ia din ?lang=en și se pune înapoi în URL, ca linkul să se poată partaja.
export function LegalLangSwitch({ ro, en }: { ro: React.ReactNode; en: React.ReactNode }) {
  const [lang, setLang] = useState<"ro" | "en">("ro");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("lang") === "en") setLang("en");
  }, []);

  const choose = (l: "ro" | "en") => {
    setLang(l);
    const url = new URL(window.location.href);
    if (l === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <div className="mb-8 flex gap-2" role="group" aria-label="Limba / Language">
        {(["ro", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => choose(l)}
            aria-pressed={lang === l}
            className={cn("rounded-full border px-3 py-1 text-sm", lang === l ? "bg-accent font-medium" : "text-muted-foreground hover:bg-accent/50")}
          >
            {l === "ro" ? "Română" : "English"}
          </button>
        ))}
      </div>
      <div lang="ro" hidden={lang !== "ro"}>{ro}</div>
      <div lang="en" hidden={lang !== "en"}>{en}</div>
    </>
  );
}
