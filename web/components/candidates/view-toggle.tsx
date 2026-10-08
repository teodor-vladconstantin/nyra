import Link from "next/link";
import { KanbanSquare, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Comutator tabel / pipeline; păstrează filtrele (fără pagina și, la kanban, fără sortare/status care nu au sens acolo).
export function ViewToggle({ current, params }: { current: "table" | "pipeline"; params: Record<string, string> }) {
  const qs = (drop: string[]) => {
    const p = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && !drop.includes(k)));
    return p.size ? `?${p}` : "";
  };
  const items = [
    { key: "table", href: `/admin/candidati${qs(["page"])}`, label: "Tabel", icon: <Table2 /> },
    { key: "pipeline", href: `/admin/candidati/pipeline${qs(["page", "status"])}`, label: "Pipeline", icon: <KanbanSquare /> },
  ] as const;
  return (
    <nav aria-label="Mod de vizualizare" className="inline-flex rounded-md border bg-background p-0.5">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === current ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium [&_svg]:size-4",
            i.key === current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {i.icon} {i.label}
        </Link>
      ))}
    </nav>
  );
}
