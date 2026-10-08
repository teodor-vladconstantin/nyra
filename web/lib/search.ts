// Aceeași normalizare ca nyra_normalize() din Postgres: litere mici, fără diacritice.
export function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
