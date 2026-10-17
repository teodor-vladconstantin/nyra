// Anteturi de securitate (vezi README, secțiunea Deploy). PDF-urile se afișează inline prin URL-uri semnate Supabase, deci originea Supabase e permisă pe frame/object/img/connect.
// 'unsafe-inline' pe script/style rămâne necesar pentru scripturile inline Next.js 14 (fără nonce).
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const dev = process.env.NODE_ENV !== "production";
// Clerk: domeniul Frontend API e codat în cheia publică (pk_test_/pk_live_ + base64 "host$"), deci același cod merge pe dev și producție.
const clerkHost = (() => {
  try {
    return Buffer.from((process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").split("_")[2] ?? "", "base64").toString().replace(/\$$/, "");
  } catch {
    return "";
  }
})();
const clerk = clerkHost ? `https://${clerkHost}` : "";
// Turnstile (Cloudflare) rulează în sign-up pentru protecție anti-bot.
const turnstile = "https://challenges.cloudflare.com";
// Clerk Protect (anti-bot) își încarcă scriptul și trimite semnale de la *.protect.clerk.com.
const protect = "https://*.protect.clerk.com https://*.protect.clerk.com:*";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${clerk} ${turnstile} ${protect}${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase} https://img.clerk.com`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${clerk} https://clerk-telemetry.com ${protect}${dev ? " ws:" : ""}`,
  `frame-src 'self' ${supabase} ${turnstile} blob:`,
  "worker-src 'self' blob:",
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
