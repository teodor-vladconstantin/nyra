// Versiunea documentelor legale în vigoare. Se schimbă împreună cu fișierele din content/legal și cere re-acceptare (vezi /acceptare).
export const LEGAL_VERSION = "0.1";

export type Lang = "ro" | "en";

// slug-ul din URL -> fișierul pe limbă + titlul. Textele vin din web/content/legal/{ro,en}.
export const DOCS = {
  termeni: { file: { ro: "termeni.md", en: "terms.md" }, title: { ro: "Termeni și condiții", en: "Terms of Use" } },
  confidentialitate: { file: { ro: "confidentialitate.md", en: "privacy.md" }, title: { ro: "Politica de confidențialitate", en: "Privacy Policy" } },
  cookies: { file: { ro: "cookies.md", en: "cookies.md" }, title: { ro: "Politica de cookies", en: "Cookie Policy" } },
  subprocesatori: { file: { ro: "subprocesatori.md", en: "subprocessors.md" }, title: { ro: "Subprocesatori", en: "Subprocessors" } },
  dpa: { file: { ro: "dpa.md", en: "dpa.md" }, title: { ro: "Acord de prelucrare a datelor (DPA)", en: "Data Processing Agreement (DPA)" } },
} as const;

export type DocSlug = keyof typeof DOCS;

