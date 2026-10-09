import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/page-header";
import { getOrg } from "@/lib/org";
import { JOB_STATUS, type Job } from "@/lib/jobs";
import { cn } from "@/lib/utils";

export const metadata = { title: "Joburi" };

type Row = Pick<Job, "id" | "title" | "location" | "contract_type" | "status" | "created_at"> & { job_candidates: { count: number }[] };

export default async function JobsPage() {
  const { supabase, orgId, role } = await getOrg();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, location, contract_type, status, created_at, job_candidates(count)")
    .eq("organization_id", orgId)
    .order("status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  const add = role === "admin" ? <Button asChild><Link href="/admin/joburi/nou"><Plus /> Job nou</Link></Button> : undefined;

  return (
    <>
      <PageHeader title="Joburi" description={`${rows.length} ${rows.length === 1 ? "job" : "joburi"}`} actions={add} />
      {rows.length === 0 ? (
        <EmptyState icon={<Briefcase />} title="Niciun job încă" action={add}>
          Adaugă o poziție deschisă și vezi ce candidați din CV-urile încărcate i se potrivesc.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titlu</TableHead><TableHead>Locație</TableHead><TableHead>Contract</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Candidați</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell><Link href={`/admin/joburi/${j.id}`} className="font-medium underline-offset-4 hover:underline">{j.title}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{j.location || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{j.contract_type || "—"}</TableCell>
                  <TableCell>
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", j.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                      {JOB_STATUS[j.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{j.job_candidates[0]?.count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
