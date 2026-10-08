import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă pipeline-ul">
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-64" />
      <Skeleton className="mb-6 h-32 w-full rounded-lg" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, c) => (
          <div key={c} className="w-72 shrink-0 space-y-2 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between"><Skeleton className="h-5 w-24 rounded-full" /><Skeleton className="h-4 w-5" /></div>
            {Array.from({ length: 3 - (c % 3) }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-md border bg-card p-3">
                <Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-44" /><Skeleton className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
