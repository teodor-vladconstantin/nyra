// Acceptă doar căi interne din /admin. Respinge //host, /\host, scheme:, caractere de control: fără open redirect.
export function safeNext(raw: string | null | undefined, fallback = "/admin"): string {
  if (!raw || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "http://nyra.invalid");
    if (u.origin !== "http://nyra.invalid") return fallback;
    if (u.pathname !== "/admin" && !u.pathname.startsWith("/admin/")) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
