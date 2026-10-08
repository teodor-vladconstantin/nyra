"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_TONES, type Status } from "@/lib/candidates";
import { setStatus } from "./actions";

export { STATUS_TONES };

export function StatusSelect({ id, value, className }: { id: string; value: Status; className?: string }) {
  const [status, set] = useState(value);
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Status"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Status;
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
      className={cn(
        "relative z-10 cursor-pointer appearance-none rounded-full border-0 px-2.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        STATUS_TONES[status],
        className,
      )}
    >
      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
