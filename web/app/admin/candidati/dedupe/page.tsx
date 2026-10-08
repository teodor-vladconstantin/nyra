import Link from "next/link";
import { ArrowLeft, CopyCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/page-header";
import { getOrg } from "@/lib/org";
import { DUPLICATE_REASONS, duplicateGroups, mergeGroups } from "@/lib/duplicates";
import { STATUS_LABELS, type Status } from "@/lib/candidates";
import { MergeDialog } from "../[id]/merge-dialog";

export const metadata = { title: "Duplicate" };

export default async function DedupePage() {
  const { supabase, orgId, role } = await getOrg();
  const groups = mergeGroups(await duplicateGroups(supabase, orgId));
  const ids = Array.from(new Set(groups.flatMap((g) => g.ids)));
  const { data } = ids.length
    ? await supabase.from("candidates").select("id, name, file_name, email, phone, status, created_at").eq("organization_id", orgId).in("id", ids)
    : { data: [] };
  const byId = new Map((data ?? []).map((r) => [r.id as string, r]));
  const date = (d: string) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <Link href="/admin/candidati" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Candidați
      </Link>
      <PageHeader
        title="Duplicate"
        description={groups.length ? `${groups.length} ${groups.length === 1 ? "grup" : "grupuri"} de candidați care par aceeași persoană` : undefined}
      />
      {groups.length === 0 ? (
        <EmptyState icon={<CopyCheck />} title="Niciun duplicat găsit">
          Verificăm fișierul identic, emailul și telefonul. Dacă încarci același CV a doua oară, apare aici.
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => {
            const members = g.ids.map((id) => byId.get(id)).filter((m) => !!m).sort((a, b) => a!.created_at.localeCompare(b!.created_at));
            if (members.length < 2) return null;
            const side = (m: NonNullable<(typeof members)[number]>) =>
              ({ id: m.id as string, label: m.name ?? m.file_name ?? "Candidat", detail: `${m.file_name ?? "fără fișier"} · adăugat ${date(m.created_at)}` });
            const first = members[0]!;
            return (
              <li key={g.ids.join()} className="rounded-lg border bg-card">
                <p className="border-b px-4 py-2 text-xs text-muted-foreground">
                  Potrivire: {g.reasons.map((r) => DUPLICATE_REASONS[r]).join(", ")}
                </p>
                <ul className="divide-y">
                  {members.map((m, i) => (
                    <li key={m!.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <Link href={`/admin/candidati/${m!.id}`} className="font-medium underline-offset-2 hover:underline">{m!.name ?? m!.file_name ?? "Candidat"}</Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {[m!.email, m!.phone, STATUS_LABELS[m!.status as Status], `adăugat ${date(m!.created_at)}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {role === "admin" && i > 0 && <MergeDialog a={side(first)} b={side(m!)} to="dedupe" />}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
