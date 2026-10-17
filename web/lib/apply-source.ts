// ?src= din linkul de aplicare -> eticheta salvată pe candidat (a-z, 0-9, _ și -, max 40); orice altceva = fără sursă.
export function cleanSource(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  return /^[a-z0-9_-]{1,40}$/.test(s) ? s : null;
}
