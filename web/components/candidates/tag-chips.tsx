import { cn } from "@/lib/utils";
import { TAG_TONES, type Tag } from "@/lib/candidates";

export function TagChip({ tag, className }: { tag: Tag; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-32 items-center truncate rounded-full px-2 py-0.5 text-xs font-medium", TAG_TONES[tag.color] ?? TAG_TONES.neutral, className)}>
      {tag.name}
    </span>
  );
}

// Primele `max` etichete + „+N”; lista completă e în title pentru cine trece cu mouse-ul.
export function TagChips({ tags, max = 3 }: { tags: Tag[]; max?: number }) {
  if (!tags?.length) return null;
  const rest = tags.slice(max);
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, max).map((t) => <TagChip key={t.id} tag={t} />)}
      {rest.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground" title={rest.map((t) => t.name).join(", ")}>
          +{rest.length}
        </span>
      )}
    </span>
  );
}
