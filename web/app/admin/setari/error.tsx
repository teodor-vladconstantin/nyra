"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Setările nu s-au putut încărca">
      <Button variant="outline" className="mt-3" onClick={reset}>Încearcă din nou</Button>
    </EmptyState>
  );
}
