"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Tag } from "@/lib/candidates";
import { setCandidateTag } from "@/app/admin/candidati/workflow-actions";
import { TagChip, TagChips } from "./tag-chips";
import { TagMenu } from "./tag-menu";

// Pentru pagina candidatului: etichetele lui + adăugare/ștergere (admin) sau doar afișare (viewer).
// `all` = toate etichetele organizației (din tabela tags).
export function TagEditor({ candidateId, tags, all, canEdit }: { candidateId: string; tags: Tag[]; all: Tag[]; canEdit: boolean }) {
  const [current, setCurrent] = useState(tags);
  const [, start] = useTransition();
  const router = useRouter();
  if (!canEdit) return current.length ? <TagChips tags={current} max={20} /> : <span className="text-sm text-muted-foreground">Fără etichete</span>;

  const change = (tag: Tag, on: boolean) => {
    if (on === current.some((t) => t.id === tag.id)) return;
    const prev = current;
    setCurrent(on ? [...current, tag] : current.filter((t) => t.id !== tag.id));
    start(async () => {
      const res = await setCandidateTag(candidateId, tag.id, on).catch(() => null);
      if (res?.ok) return router.refresh();
      setCurrent(prev);
      toast.error(res?.error ?? "Eticheta nu a putut fi salvată");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {current.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-0.5">
          <TagChip tag={t} className="pr-1" />
          <button type="button" onClick={() => change(t, false)} aria-label={`Elimină eticheta ${t.name}`} className="-ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground">
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <TagMenu tags={all.filter((a) => !current.some((t) => t.id === a.id))} onPick={(t) => change(t, true)} label="Etichetă" variant="ghost" />
    </div>
  );
}
