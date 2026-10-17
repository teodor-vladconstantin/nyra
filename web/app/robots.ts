import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyra.joben.eu";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/sign-in", "/sign-up", "/onboarding", "/login"] }, sitemap: `${BASE}/sitemap.xml` };
}
