import type { SupabaseClient } from "@supabase/supabase-js";
import { SENIORITY_LABELS } from "@/lib/experience";
import { normalize } from "@/lib/search";

// Ordinea = etapele pipeline-ului (și coloanele din kanban); „Respins” e ultima.
export const STATUS_LABELS = {
  new: "Nou",
  to_contact: "De contactat",
  shortlisted: "Potrivit",
  interview: "Interviu",
  offer: "Ofertă",
  hired: "Angajat",
  rejected: "Respins",
} as const;
export type Status = keyof typeof STATUS_LABELS;
export const STATUSES = Object.keys(STATUS_LABELS) as Status[];

export const STATUS_TONES: Record<Status, string> = {
  new: "bg-muted text-muted-foreground",
  to_contact: "bg-brand/10 text-brand",
  shortlisted: "bg-success/15 text-success",
  interview: "bg-warning/15 text-warning",
  offer: "bg-primary/10 text-primary",
  hired: "bg-success/25 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

// Culoarea unei etichete e un token de design (vezi check-ul din tabela tags), nu un hex.
export const TAG_COLORS = {
  neutral: "Neutru",
  brand: "Albastru",
  success: "Verde",
  warning: "Galben",
  destructive: "Roșu",
} as const;
export type TagColor = keyof typeof TAG_COLORS;
export const TAG_TONES: Record<TagColor, string> = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-brand/10 text-brand",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};
export type Tag = { id: string; name: string; color: TagColor };

export const SORTS = { recent: "Adăugați recent", years: "Experiență", name: "Nume" } as const;

export type Filters = {
  q?: string; role?: string; skill?: string; seniority?: string; min_years?: string; status?: string; tag?: string; parsing?: string; sort?: string; page?: string;
};
export const FILTER_KEYS = ["q", "role", "skill", "seniority", "min_years", "status", "tag", "parsing", "sort"] as const;

export const COLUMNS =
  "id, name, email, phone, location, file_name, status, parsing_status, created_at, last_role, last_company, seniority, years_experience, skills, duplicate_of, tags";

export type CandidateRow = {
  id: string; name: string | null; email: string | null; phone: string | null; location: string | null; file_name: string | null;
  status: Status; parsing_status: string; created_at: string; last_role: string | null; last_company: string | null;
  seniority: string | null; years_experience: number | string; skills: string[]; duplicate_of: string | null; tags: Tag[];
};

const PARSING = ["pending", "processing", "parsed", "needs_review", "failed"];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Aceleași filtre pentru tabel, kanban și exportul CSV.
export function candidatesQuery(supabase: SupabaseClient, orgId: string, f: Filters, opts: { count?: boolean } = {}) {
  let q = supabase
    .from("candidate_overview")
    .select(COLUMNS, opts.count ? { count: "exact" } : undefined)
    .eq("organization_id", orgId);
  if (f.q?.trim()) q = q.textSearch("search_tsv", normalize(f.q.trim()), { type: "websearch", config: "simple" });
  if (f.role?.trim()) q = q.ilike("last_role", `%${f.role.trim().replace(/[%_\\]/g, "")}%`);
  if (f.skill?.trim()) q = q.contains("skills", JSON.stringify([normalize(f.skill.trim())]));
  if (f.seniority && f.seniority in SENIORITY_LABELS) q = q.eq("seniority", f.seniority);
  if (Number(f.min_years) > 0) q = q.gte("years_experience", Number(f.min_years));
  if (f.status && f.status in STATUS_LABELS) q = q.eq("status", f.status);
  if (f.parsing && PARSING.includes(f.parsing)) q = q.eq("parsing_status", f.parsing);
  if (f.tag && UUID.test(f.tag)) q = q.contains("tags", JSON.stringify([{ id: f.tag }]));
  const sort = f.sort && f.sort in SORTS ? f.sort : "recent";
  return sort === "years" ? q.order("years_experience", { ascending: false }).order("created_at", { ascending: false })
    : sort === "name" ? q.order("name", { ascending: true, nullsFirst: false })
    : q.order("created_at", { ascending: false });
}

export function isFiltered(f: Filters) {
  return Object.entries(f).some(([k, v]) => v && k !== "sort" && k !== "page");
}

// Doar cheile cunoscute, valori scurte: ce se salvează într-un filtru nu poate fi altceva decât filtre.
export function cleanParams(raw: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const k of FILTER_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim() && v.length <= 200) out[k] = v.trim();
  }
  return out;
}

// ---- CSV (tabel, export complet și export selecție) ----
export const CSV_HEADERS = ["Nume", "Email", "Telefon", "Locație", "Rol curent", "Companie", "Ani experiență", "Seniority", "Skill-uri", "Etichete", "Status", "Fișier", "Adăugat"];

// CSV cu separator „;” și BOM UTF-8: se deschide corect (cu diacritice) în Excel cu setări românești.
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Neutralizează formulele (=, +, -, @) ca un CV rău-intenționat să nu execute nimic în Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: CandidateRow[]) {
  const lines = rows.map((r) => [
    r.name, r.email, r.phone, r.location, r.last_role, r.last_company,
    Number(r.years_experience) > 0 ? Number(r.years_experience).toLocaleString("ro-RO") : "",
    r.seniority ? SENIORITY_LABELS[r.seniority as keyof typeof SENIORITY_LABELS] : "",
    (r.skills ?? []).join(", "),
    (r.tags ?? []).map((t) => t.name).join(", "),
    STATUS_LABELS[r.status] ?? r.status, r.file_name,
    new Date(r.created_at).toLocaleDateString("ro-RO"),
  ].map(cell).join(";"));
  return "﻿" + [CSV_HEADERS.join(";"), ...lines].join("\r\n");
}

export const csvName = () => `candidati-${new Date().toISOString().slice(0, 10)}.csv`;

// Ce mai are nevoie formularul de filtre, în paralel cu query-ul principal: roluri (datalist), etichete și filtrele salvate ale userului.
export async function loadFilterContext(supabase: SupabaseClient, orgId: string) {
  const [roles, tags, saved] = await Promise.all([
    supabase.from("candidate_experiences").select("role_title").eq("organization_id", orgId).limit(2000),
    supabase.from("tags").select("id, name, color").eq("organization_id", orgId).order("name"),
    supabase.from("saved_filters").select("id, name, params").eq("organization_id", orgId).order("name"), // RLS: doar ale userului
  ]);
  if (roles.error) throw roles.error;
  if (tags.error) throw tags.error;
  if (saved.error) throw saved.error;
  return {
    roleOptions: Array.from(new Set((roles.data ?? []).map((r) => r.role_title.trim()))).sort((a, b) => a.localeCompare(b, "ro")),
    tags: (tags.data ?? []) as Tag[],
    saved: (saved.data ?? []) as { id: string; name: string; params: Record<string, string> }[],
  };
}
