import { Plus } from "lucide-react";
import type { Faq } from "./content";

// <details> nativ: accesibil de la tastatură, fără JS.
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-card">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-base font-medium">
            {f.q}
            <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden />
          </summary>
          <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
