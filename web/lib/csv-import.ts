// Import de candidați din CSV (Excel / alt ATS), fără CV. Separatorul (virgulă sau punct și virgulă, cum exportă Excel-ul românesc)
// se alege după antet; antetele acceptă variante românești și englezești.
export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 1024 * 1024;

export type ImportRow = { name: string | null; email: string | null; phone: string | null; location: string | null; skills: string[] };

const ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["nume", "name", "nume complet", "full name", "candidat"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefon", "phone", "mobil", "numar de telefon"],
  location: ["locatie", "localitate", "oras", "location", "city"],
  skills: ["skills", "competente", "aptitudini", "abilitati"],
};
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

// Împarte textul în rânduri de celule; ghilimelele dublează ("") și pot conține separatorul sau rânduri noi.
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0];
  const delim = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); // și rândurile goale: numărul rândului din mesaje trebuie să fie cel din Excel
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// Întoarce rândurile valide și motivele pentru cele sărite (cu numărul rândului din fișier).
export function readImport(text: string): { rows: ImportRow[]; skipped: string[]; error?: string } {
  const [head, ...body] = parseCsv(text);
  if (!head) return { rows: [], skipped: [], error: "Fișierul este gol." };
  const col = {} as Record<keyof ImportRow, number>;
  for (const k of Object.keys(ALIASES) as (keyof ImportRow)[]) col[k] = head.findIndex((h) => ALIASES[k].includes(plain(h)));
  if (col.name < 0 && col.email < 0) return { rows: [], skipped: [], error: "Lipsește o coloană „Nume” sau „Email” în antet." };
  if (body.length > MAX_IMPORT_ROWS) return { rows: [], skipped: [], error: `Maximum ${MAX_IMPORT_ROWS} de rânduri într-un import.` };

  const rows: ImportRow[] = [], skipped: string[] = [], seen = new Set<string>();
  body.forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return; // rând gol
    const get = (k: keyof ImportRow, max: number) => (col[k] >= 0 ? (cells[col[k]] ?? "").trim().slice(0, max) : "") || null;
    const name = get("name", 200), email = get("email", 320)?.toLowerCase() ?? null;
    const at = `rândul ${i + 2}`;
    if (!name && !email) return skipped.push(`${at}: fără nume și fără email`);
    if (email && !EMAIL.test(email)) return skipped.push(`${at}: email invalid`);
    if (email && seen.has(email)) return skipped.push(`${at}: email repetat în fișier`);
    if (email) seen.add(email);
    const skills = (get("skills", 2000) ?? "").split(/[,;|\n]/).map((s) => s.trim().slice(0, 50)).filter(Boolean).slice(0, 50);
    rows.push({ name, email, phone: get("phone", 50), location: get("location", 200), skills });
  });
  return { rows, skipped };
}
