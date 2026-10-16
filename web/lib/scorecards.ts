export const CRITERIA = { technical: "Tehnic", communication: "Comunicare", culture: "Potrivire în echipă" } as const;
export type Criterion = keyof typeof CRITERIA;
export const RECOMMENDATION = { yes: "Recomand", maybe: "Poate", no: "Nu recomand" } as const;
export type Recommendation = keyof typeof RECOMMENDATION;

export type Scorecard = {
  id: string; technical: number; communication: number; culture: number;
  recommendation: Recommendation; comment: string; author_id: string | null; created_at: string;
};

export const average = (s: Pick<Scorecard, Criterion>) => (s.technical + s.communication + s.culture) / 3;

// Citește un scor 1..5 din formular; invalid => null.
export function readScore(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}
