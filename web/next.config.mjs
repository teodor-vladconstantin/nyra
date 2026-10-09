// Anteturi de securitate (vezi README, secțiunea Deploy). PDF-urile se afișează inline prin URL-uri semnate Supabase, deci originea Supabase e permisă pe frame/object/img/connect.
// 'unsafe-inline' pe script/style rămâne necesar pentru scripturile inline Next.js 14 (fără nonce).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase}${dev ? " ws:" : ""}`,
  `frame-src 'self' ${supabase} blob:`,
  `object-src ${supabase || "'none'"}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Un CV (max 10 MB) per server action.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // Browserele cer /favicon.ico chiar dacă pagina declară icon.svg.
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
