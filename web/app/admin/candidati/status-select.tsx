"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, STATUS_TONES, type Status } from "@/lib/candidates";
import { setStatus } from "./actions";

export { STATUS_TONES };

export function StatusSelect({ id, value, className }: { id: string; value: Status; className?: string }) {
  const [status, set] = useState(value);
  const [pending, start] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(v) => {
        const next = v as Status;
        const prev = status;
        set(next);
        start(async () => {
          try {
            await setStatus(id, next);
            toast.success(`Status: ${STATUS_LABELS[next]}`, { id: `status-${id}` });
          } catch {
            set(prev);
            toast.error("Statusul nu a putut fi salvat");
          }
        });
      }}
    >
      <SelectTrigger
        aria-label="Status"
        className={cn(
          "relative z-10 h-auto w-auto gap-1 rounded-full border-0 px-2.5 py-0.5 text-xs font-medium shadow-none",
          STATUS_TONES[status],
          className,
        )}
      >
        <SelectValue>{STATUS_LABELS[status]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
