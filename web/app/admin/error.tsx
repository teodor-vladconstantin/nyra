"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/page-header";

// Granița de eroare pentru toată zona /admin; sidebar-ul și topbar-ul din layout rămân funcționale.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <EmptyState
      className="mt-8 border-solid"
      icon={<AlertTriangle />}
      title="A apărut o eroare"
      action={
        <div className="flex gap-2">
          <Button onClick={reset}><RotateCw /> Încearcă din nou</Button>
          <Button variant="outline" asChild><Link href="/admin">Înapoi la panou</Link></Button>
        </div>
      }
    >
      Nu am putut încărca pagina. Dacă problema persistă, spune-i administratorului
      {error.digest && <> și comunică codul <code className="rounded bg-muted px-1 font-mono text-caption">{error.digest}</code></>}.
    </EmptyState>
  );
}
