"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { activeHref, NAV_ITEMS } from "./nav-items";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const active = activeHref(usePathname());
  return (
    <nav aria-label="Navigare principală" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              on && "bg-accent text-accent-foreground",
            )}
          >
            {on && <span className="absolute -left-4 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />}
            <Icon className={cn("size-4 shrink-0", on ? "text-brand" : "text-muted-foreground")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
