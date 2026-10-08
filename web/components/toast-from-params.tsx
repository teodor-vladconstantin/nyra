"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

// Server actions redirecționează cu ?toast=...&type=error|success; aici devine toast și dispare din URL.
export function ToastFromParams() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // Textul vine din URL: îl limităm ca un link fabricat să nu poată afișa un mesaj lung înșelător.
    const msg = params.get("toast")?.slice(0, 160);
    if (!msg) return;
    // id = mesajul: sonner nu afișează de două ori același toast (efectele rulează dublu în dev/StrictMode).
    (params.get("type") === "error" ? toast.error : toast.success)(msg, { id: msg });
    const rest = new URLSearchParams(params);
    rest.delete("toast");
    rest.delete("type");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [params, pathname, router]);
  return null;
}
