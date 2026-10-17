import Link from "next/link";
import { Brand } from "@/components/shell/brand";
import { wrap } from "./section";

const COLS = [
  { title: "Produs", links: [["Funcții", "/produs"], ["Prețuri", "/preturi"], ["Întrebări frecvente", "/faq"]] },
  { title: "Companie", links: [["Despre", "/despre"], ["Contact", "/contact"], ["Autentificare", "/sign-in"]] },
  { title: "Legal", links: [["Confidențialitate", "/confidentialitate"], ["Termeni", "/termeni"]] },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className={`${wrap} grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <Brand href="/" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Recrutare, simplu. Parser de CV-uri cu aer de ATS, făcut de Joben.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="text-sm font-semibold">{c.title}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className={`${wrap} py-5 text-caption text-muted-foreground`}>© {new Date().getFullYear()} Joben. Toate drepturile rezervate.</p>
      </div>
    </footer>
  );
}
