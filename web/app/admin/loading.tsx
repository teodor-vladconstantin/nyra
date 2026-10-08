import { Skeleton } from "@/components/ui/skeleton";

// Schelet generic pentru paginile din /admin care nu au propriul loading.tsx.
export default function Loading() {
  return (
    <div role="status" aria-label="Se încarcă">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
      <span className="sr-only">Se încarcă…</span>
    </div>
  );
}
