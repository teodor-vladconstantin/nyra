export const JOB_STATUS = { active: "Activ", closed: "Închis" } as const;
export type JobStatus = keyof typeof JOB_STATUS;

export type Job = {
  id: string; title: string; description: string; requirements: string; location: string; contract_type: string;
  keywords: string[]; status: JobStatus; created_at: string;
};

export type JobMatch = {
  candidate_id: string; name: string | null; last_role: string | null; seniority: string | null; years_experience: number | string;
  status: string; matched: number; total: number; attached: boolean;
};

// „react, SQL ,react" -> ["react", "SQL"]: fără goluri și dubluri, limitele din DB (30 × 50 caractere).
export function parseKeywords(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of raw.split(/[,\n]/).map((s) => s.trim().slice(0, 50))) {
    if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
  }
  return out.slice(0, 30);
}

// Textul din care se calculează embedding-ul jobului (la fel de „larg" ca textul candidatului, tăiat de serviciu la ~512 tokeni).
export function jobEmbeddingText(j: { title: string; description: string; requirements: string; location: string; keywords: string[] }): string {
  return [j.title, j.keywords.join(", "), j.description, j.requirements, j.location].filter(Boolean).join("\n");
}

export type JobSemantic = { candidate_id: string; similarity: number };
