import Link from "next/link";
import { Menu } from "lucide-react";
import { Brand } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { wrap } from "./section";

export const NAV = [
  { href: "/produs", label: "Produs" },
  { href: "/preturi", label: "Prețuri" },
  { href: "/faq", label: "Întrebări" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className={`${wrap} flex h-16 items-center gap-6`}>
        <Brand href="/" />
        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/sign-in">Autentificare</Link></Button>
          <Button asChild className="hidden sm:inline-flex"><Link href="/contact">Cere acces</Link></Button>
          {/* Meniu mobil fără JS: <details> */}
          <details className="group relative md:hidden">
            <summary className="grid size-9 cursor-pointer place-items-center rounded-md hover:bg-accent" aria-label="Meniu"><Menu className="size-5" /></summary>
            <div className="absolute right-0 top-11 w-56 rounded-lg border border-border bg-popover p-2 shadow-pop">
              {[...NAV, { href: "/sign-in", label: "Autentificare" }].map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">{n.label}</Link>
              ))}
              <Button asChild className="mt-2 w-full"><Link href="/contact">Cere acces</Link></Button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
