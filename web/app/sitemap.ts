import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

// Fără asta sitemap-ul se prerandează la build și joburile devenite publice după aceea nu apar.
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyra.joben.eu";
const PAGES = ["", "/produs", "/preturi", "/faq", "/contact", "/despre", "/confidentialitate", "/termeni"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PAGES.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
  // Joburile cu pagină publică. Dacă baza de date nu răspunde (sau funcția încă nu există), sitemap-ul rămâne cu paginile fixe.
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await db.rpc("public_jobs");
    for (const j of (data ?? []) as { id: string; posted_at: string }[]) {
      pages.push({ url: `${BASE}/aplica/${j.id}`, lastModified: j.posted_at, changeFrequency: "weekly", priority: 0.7 });
    }
  } catch (e) {
    console.error("sitemap public jobs", e);
  }
  return pages;
}
