"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

export default function AuditError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Jurnalul nu s-a putut încărca">
      <Button variant="outline" className="mt-3" onClick={reset}>Încearcă din nou</Button>
    </EmptyState>
  );
}
