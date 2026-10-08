import { cn } from "@/lib/utils";

const CHIP = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-medium";

export const PARSING_LABELS = {
  pending: "În așteptare",
  processing: "Se procesează",
  parsed: "Procesat",
  needs_review: "Necesită revizuire",
  failed: "Eșuat",
} as const;
export type ParsingStatus = keyof typeof PARSING_LABELS;

// Clase literale (nu construite din string) ca Tailwind să le vadă la build.
const PARSING_TONE: Record<ParsingStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-info/10 text-info",
  parsed: "bg-success/10 text-success",
  needs_review: "bg-warning/10 text-warning",
  failed: "bg-danger/10 text-danger",
};

export function ParsingBadge({ status, className }: { status: ParsingStatus; className?: string }) {
  const busy = status === "pending" || status === "processing";
  return (
    <span className={cn(CHIP, PARSING_TONE[status] ?? PARSING_TONE.pending, className)}>
      <span className={cn("size-1.5 rounded-full bg-current", busy && "animate-pulse")} aria-hidden />
      {PARSING_LABELS[status] ?? status}
    </span>
  );
}

// Toate valorile enum-ului candidate_status (inclusiv cele adăugate pentru pipeline).
export const CANDIDATE_STATUS_LABELS = {
  new: "Nou",
  to_contact: "De contactat",
  shortlisted: "Potrivit",
  interview: "Interviu",
  offer: "Ofertă",
  hired: "Angajat",
  rejected: "Respins",
} as const;
export type CandidateStatus = keyof typeof CANDIDATE_STATUS_LABELS;

const STATUS_TONE: Record<CandidateStatus, string> = {
  new: "bg-status-new/10 text-status-new",
  to_contact: "bg-status-to_contact/10 text-status-to_contact",
  shortlisted: "bg-status-shortlisted/10 text-status-shortlisted",
  interview: "bg-status-interview/10 text-status-interview",
  offer: "bg-status-offer/10 text-status-offer",
  hired: "bg-status-hired/10 text-status-hired",
  rejected: "bg-status-rejected/10 text-status-rejected",
};

// Culoarea „solidă" a statusului, pentru bare și puncte (ex. grafice, coloane kanban).
export const STATUS_DOT: Record<CandidateStatus, string> = {
  new: "bg-status-new",
  to_contact: "bg-status-to_contact",
  shortlisted: "bg-status-shortlisted",
  interview: "bg-status-interview",
  offer: "bg-status-offer",
  hired: "bg-status-hired",
  rejected: "bg-status-rejected",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const known = status in CANDIDATE_STATUS_LABELS;
  return (
    <span className={cn(CHIP, known ? STATUS_TONE[status as CandidateStatus] : "bg-muted text-muted-foreground", className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {known ? CANDIDATE_STATUS_LABELS[status as CandidateStatus] : status}
    </span>
  );
}
