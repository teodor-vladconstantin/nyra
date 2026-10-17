import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyra.joben.eu";
const PAGES = ["", "/produs", "/preturi", "/faq", "/contact", "/despre", "/confidentialitate", "/termeni"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
}
