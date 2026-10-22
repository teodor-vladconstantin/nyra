import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { DOCS, type DocSlug, type Lang } from "@/lib/legal";

export const loadDoc = (slug: DocSlug, lang: Lang) =>
  readFileSync(path.join(process.cwd(), "content", "legal", lang, DOCS[slug].file[lang]), "utf8");
