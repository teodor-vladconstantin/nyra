import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă candidatul">
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="mb-6 space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-80" /></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[70vh] rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-72" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}
