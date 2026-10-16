import { Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { NativeSelect } from "@/components/native-select";
import { CRITERIA, RECOMMENDATION, average, type Criterion, type Recommendation, type Scorecard } from "@/lib/scorecards";

const SCORES = [5, 4, 3, 2, 1];
const TONE: Record<Recommendation, string> = { yes: "bg-success/15 text-success", maybe: "bg-warning/15 text-warning", no: "bg-danger/15 text-danger" };
const nf = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt = (d: string) => new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });

type Props = {
  cards: Scorecard[]; canEdit: boolean; me: string | null;
  add: (f: FormData) => void | Promise<void>; remove: (id: string) => void | Promise<void>;
};

export function Scorecards({ cards, canEdit, me, add, remove }: Props) {
  const overall = cards.length ? cards.reduce((a, c) => a + average(c), 0) / cards.length : null;
  return (
    <div className="space-y-5">
      {overall !== null && (
        <p className="text-sm">
          Medie generală <span className="tabular-nums text-lg font-semibold text-brand">{nf.format(overall)}</span>
          <span className="text-muted-foreground"> / 5 · {cards.length} {cards.length === 1 ? "evaluare" : "evaluări"}</span>
        </p>
      )}

      {canEdit && (
        <form action={add} className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {(Object.keys(CRITERIA) as Criterion[]).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={k}>{CRITERIA[k]}</Label>
                <NativeSelect id={k} name={k} defaultValue="3">{SCORES.map((n) => <option key={n} value={n}>{n}</option>)}</NativeSelect>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="recommendation">Recomandare</Label>
              <NativeSelect id="recommendation" name="recommendation" defaultValue="maybe">
                {(Object.keys(RECOMMENDATION) as Recommendation[]).map((r) => <option key={r} value={r}>{RECOMMENDATION[r]}</option>)}
              </NativeSelect>
            </div>
          </div>
          <label htmlFor="comment" className="sr-only">Comentariu</label>
          <Textarea id="comment" name="comment" rows={3} maxLength={5000} placeholder="Observații din interviu" />
          <SubmitButton size="sm" pendingText="Se salvează…">Salvează evaluarea</SubmitButton>
        </form>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nicio evaluare încă.</p>
      ) : (
        <ul className="space-y-3">
          {cards.map((c) => (
            <li key={c.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-base font-semibold">{nf.format(average(c))}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${TONE[c.recommendation]}`}>{RECOMMENDATION[c.recommendation]}</span>
                </span>
                <span className="text-xs text-muted-foreground">{fmt(c.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {(Object.keys(CRITERIA) as Criterion[]).map((k) => `${CRITERIA[k]} ${c[k]}`).join(" · ")}
              </p>
              {c.comment && <p className="mt-2 whitespace-pre-line">{c.comment}</p>}
              {canEdit && me && c.author_id === me && (
                <form action={remove.bind(null, c.id)} className="mt-2">
                  <SubmitButton size="sm" variant="ghost" className="text-destructive"><Trash2 /> Șterge</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
