"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/native-select";
import { SENIORITY_LABELS } from "@/lib/experience";
import { setSeniority } from "../actions";

export function SenioritySelect({ candidateId, experienceId, value }: { candidateId: string; experienceId: string; value: string | null }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      aria-label="Seniority"
      defaultValue={value ?? ""}
      disabled={pending}
      className="h-7 w-28 text-xs"
      onChange={(e) => {
        const level = e.target.value;
        start(async () => {
          try {
            await setSeniority(candidateId, experienceId, level);
            toast.success("Seniority actualizat", { id: `sen-${experienceId}` });
          } catch {
            toast.error("Nu s-a putut salva");
          }
        });
      }}
    >
      <option value="">—</option>
      {Object.entries(SENIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </NativeSelect>
  );
}
