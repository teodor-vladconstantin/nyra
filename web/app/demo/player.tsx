"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Search } from "lucide-react";
import { ParsingBadge, StatusBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Animație scriptată pentru înregistrarea demo-ului de pe landing. Toate datele sunt fictive.
const LOOP = 20000;
const CANDIDATES = [
  { file: "CV_Andrei_Ionescu.pdf", name: "Andrei Ionescu", email: "andrei.ionescu@example.com", role: "Frontend Developer", company: "Nordlight Studio", years: "6", level: "Senior", city: "București", skills: ["react", "typescript"] },
  { file: "CV_Maria_Dumitrescu.pdf", name: "Maria Dumitrescu", email: "maria.dumitrescu@example.com", role: "Contabil șef", company: "Alba Consulting", years: "9", level: "Senior", city: "Cluj-Napoca", skills: ["saga", "excel"] },
  { file: "CV_Radu_Stan.docx", name: "Radu Stan", email: "radu.stan@example.com", role: "Data Analyst", company: "Fiscalia Tech", years: "3", level: "Mid", city: "Iași", skills: ["sql", "power bi"] },
  { file: "CV_Ioana_Georgescu.pdf", name: "Ioana Georgescu", email: "ioana.georgescu@example.com", role: "Full-Stack Developer", company: "Brașov Labs", years: "4", level: "Mid", city: "Brașov", skills: ["react", "node.js"] },
  { file: "CV_Vlad_Marin.pdf", name: "Vlad Marin", email: "vlad.marin@example.com", role: "Software Engineer", company: "Pixel Forge", years: "1", level: "Junior", city: "Timișoara", skills: ["react", "python"] },
];
const QUERY = "react";

export function Player() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setMs((performance.now() - start) % LOOP), 80);
    return () => clearInterval(id);
  }, []);

  const typed = ms < 17000 ? QUERY.slice(0, Math.max(0, Math.floor((ms - 9000) / 220))) : "";
  const rowsShown = ms >= 3400;
  const uploading = ms >= 600 && ms < 3400;
  const parsed = (i: number) => ms >= 4800 + i * 600;
  const shown = CANDIDATES.map((c, i) => ({ c, i })).filter(({ c, i }) => !typed || (parsed(i) && c.skills.some((s) => s.includes(typed))));
  const interview = ms >= 14500 && ms < 17000;

  return (
    <div className="min-h-screen bg-background px-10 py-8">
      <PageHeader title="Candidați" description={rowsShown ? `${shown.length} ${shown.length === 1 ? "candidat" : "candidați"}${typed ? " găsiți" : ""}` : "0 candidați"} />

      <div className="mb-6 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-6 text-center">
        {uploading ? <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden /> : <FileUp className="size-6 text-muted-foreground" aria-hidden />}
        <span className="font-medium">{uploading ? "Se încarcă…" : "Trage CV-uri aici sau apasă pentru a alege"}</span>
        {ms >= 600 && ms < 4600 ? (
          <ul className="mt-2 flex flex-wrap justify-center gap-2 text-sm">
            {CANDIDATES.map((c, i) => ms >= 600 + i * 450 && (
              <li key={c.file} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
                {ms >= 1500 + i * 450 ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
                {c.file}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">PDF sau DOCX, max 10 MB fiecare, până la 50 fișiere deodată.</span>
        )}
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
        <p className="mb-1.5 text-sm font-medium">Caută cuvinte cheie</p>
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <div className="flex h-10 items-center rounded-md border bg-background pl-8 text-sm">
            {typed || <span className="text-muted-foreground">ex. contabil București, python</span>}
            {ms >= 9000 && ms < 17000 && <span className="ml-px h-4 w-px animate-pulse bg-foreground" aria-hidden />}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidat</TableHead>
              <TableHead>Rol curent / ultim</TableHead>
              <TableHead className="text-right">Ani exp.</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>Locație</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsShown && shown.map(({ c, i }) => {
              const ready = parsed(i);
              const hot = i === 0 && interview;
              return (
                <TableRow key={c.file} className={hot ? "bg-brand/5" : undefined}>
                  <TableCell>
                    <div className="font-medium">{ready ? c.name : c.file}</div>
                    <div className="text-xs text-muted-foreground">{ready ? c.email : c.file}</div>
                  </TableCell>
                  <TableCell>
                    {ready ? <><div>{c.role}</div><div className="text-xs text-muted-foreground">{c.company}</div></> : <ParsingBadge status="processing" />}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{ready ? c.years : "—"}</TableCell>
                  <TableCell>{ready ? c.level : "—"}</TableCell>
                  <TableCell>{ready ? c.city : "—"}</TableCell>
                  <TableCell>{ready ? <StatusBadge status={hot ? "interview" : "new"} /> : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 text-caption text-muted-foreground">Date fictive, în scop demonstrativ.</p>
    </div>
  );
}
