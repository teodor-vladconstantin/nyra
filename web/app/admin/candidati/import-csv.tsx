"use client";
import { useState, useTransition } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importCandidates, type ImportResult } from "./import-actions";

export function ImportCsv() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <details className="group mb-6 rounded-lg border bg-card p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <FileSpreadsheet className="size-4" aria-hidden /> Importă candidați din CSV (fără CV)
        <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-muted-foreground">
          Un fișier CSV (din Excel sau alt ATS) cu antetul pe primul rând. Coloane recunoscute: <b>Nume</b>, <b>Email</b>, <b>Telefon</b>,
          <b> Locație</b>, <b>Skills</b> (separate prin virgulă). Maximum 1000 de rânduri și 1 MB. Pentru CV-uri folosește încărcarea de mai sus.
        </p>
        <form
          className="flex flex-wrap items-center gap-3"
          action={(fd) => start(async () => setResult(await importCandidates(fd)))}
        >
          <Input name="file" type="file" required accept=".csv,text/csv" className="max-w-xs" aria-label="Fișier CSV" />
          <Button type="submit" disabled={pending}>{pending ? "Se importă…" : "Importă"}</Button>
        </form>
        {result && !result.ok && <p role="alert" className="text-destructive">{result.error}</p>}
        {result?.ok && (
          <div role="status" className="space-y-1">
            <p>
              {result.imported} {result.imported === 1 ? "candidat importat" : "candidați importați"}
              {result.duplicates > 0 && ` (${result.duplicates} par duplicate ale unor candidați existenți; vezi Duplicate)`}.
            </p>
            {result.skipped.length > 0 && (
              <p className="text-muted-foreground">
                Sărite ({result.skipped.length}): {result.skipped.slice(0, 5).join("; ")}{result.skipped.length > 5 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
