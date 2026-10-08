export const SENIORITY_LABELS = { junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead" } as const;
export type Seniority = keyof typeof SENIORITY_LABELS;

export const EMPLOYMENT_LABELS = {
  full_time: "Normă întreagă",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
} as const;
export type EmploymentType = keyof typeof EMPLOYMENT_LABELS;

const MONTH = new Intl.DateTimeFormat("ro-RO", { month: "short", year: "numeric" });

export function formatPeriod(start: string | null, end: string | null) {
  const f = (d: string) => MONTH.format(new Date(d));
  if (!start && !end) return "Perioadă necunoscută";
  return `${start ? f(start) : "?"} – ${end ? f(end) : "prezent"}`;
}

// ---- Validare pentru editarea manuală (server-side, fără bibliotecă): o eroare per câmp, în română ----
export type FieldErrors = Record<string, string>;
export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors };

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s && s >= "1950-01-01" && s <= "2100-12-31";

export type ContactInput = { name: string | null; email: string | null; phone: string | null; location: string | null };

export function validateContact(f: FormData): Validated<ContactInput> {
  const errors: FieldErrors = {};
  const name = text(f, "name"), email = text(f, "email").toLowerCase(), phone = text(f, "phone"), location = text(f, "location");
  if (name.length > 200) errors.name = "Maximum 200 de caractere";
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = "Adresă de email invalidă";
  if (phone && (!/^[+\d\s().\/-]+$/.test(phone) || phone.replace(/\D/g, "").length < 6 || phone.length > 30)) errors.phone = "Număr de telefon invalid";
  if (location.length > 200) errors.location = "Maximum 200 de caractere";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name: name || null, email: email || null, phone: phone || null, location: location || null } };
}

export type ExperienceInput = {
  company_name: string; role_title: string; employment_type: EmploymentType | null;
  start_date: string | null; end_date: string | null; description: string;
  seniority_level: Seniority | null; extracted_skills: string[];
};

// Competențe: separate prin virgulă sau rând nou, fără dubluri (indiferent de majuscule).
export function parseSkills(raw: string) {
  const seen = new Set<string>();
  return raw.split(/[,\n;]/).map((s) => s.trim()).filter((s) => s && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

export function validateExperience(f: FormData): Validated<ExperienceInput> {
  const errors: FieldErrors = {};
  const company_name = text(f, "company_name"), role_title = text(f, "role_title"), description = text(f, "description");
  const employment = text(f, "employment_type"), seniority = text(f, "seniority_level");
  const start = text(f, "start_date"), current = f.get("current") === "on", end = current ? "" : text(f, "end_date");
  const skills = parseSkills(text(f, "extracted_skills"));
  if (!company_name) errors.company_name = "Completează compania";
  else if (company_name.length > 200) errors.company_name = "Maximum 200 de caractere";
  if (!role_title) errors.role_title = "Completează rolul";
  else if (role_title.length > 200) errors.role_title = "Maximum 200 de caractere";
  if (employment && !(employment in EMPLOYMENT_LABELS)) errors.employment_type = "Tip invalid";
  if (seniority && !(seniority in SENIORITY_LABELS)) errors.seniority_level = "Nivel invalid";
  if (start && !isDate(start)) errors.start_date = "Dată invalidă";
  if (end && !isDate(end)) errors.end_date = "Dată invalidă";
  if (!errors.start_date && !errors.end_date && start && end && end < start) errors.end_date = "Data de final e înaintea celei de început";
  if (description.length > 4000) errors.description = "Maximum 4000 de caractere";
  if (skills.length > 50 || skills.some((s) => s.length > 60)) errors.extracted_skills = "Maximum 50 de competențe, câte 60 de caractere";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      company_name, role_title, description, extracted_skills: skills, start_date: start || null, end_date: end || null,
      employment_type: (employment || null) as EmploymentType | null, seniority_level: (seniority || null) as Seniority | null,
    },
  };
}
