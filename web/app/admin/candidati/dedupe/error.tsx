"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Nu am putut încărca duplicatele">
      <p className="mb-3">A apărut o eroare la citirea datelor. Încearcă din nou.</p>
      <Button variant="outline" onClick={reset}>Reîncearcă</Button>
    </EmptyState>
  );
}
