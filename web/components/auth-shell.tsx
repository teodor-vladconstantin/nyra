import Link from "next/link";
import { Brand } from "@/components/shell/brand";

// Paginile de autentificare sunt mereu întunecate (tokenurile .dark), indiferent de tema aleasă.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 px-4 py-10">
        <Brand href="/" />
        {children}
        <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">← Înapoi la site</Link>
      </main>
    </div>
  );
}
