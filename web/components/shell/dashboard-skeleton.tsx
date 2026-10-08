import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Aceeași grilă ca panoul real, ca pagina să nu sară la încărcare.
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Se încarcă panoul">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-36" />
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </Card>
        <Card className="space-y-4 p-5 lg:col-span-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </Card>
      </div>
      <span className="sr-only">Se încarcă…</span>
    </div>
  );
}
