import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { GlobalShortcuts, SearchTrigger } from "./shortcuts";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type Props = {
  orgId: string;
  orgName?: string;
  email: string;
  role: "admin" | "viewer";
  logout: () => Promise<void>;
  children: React.ReactNode;
};

// Sidebar fix de la lg în sus, sertar pe mobil. „Sari la conținut" e primul element focalizabil.
export function AppShell({ orgId, orgName, email, role, logout, children }: Props) {
  return (
    <div className="min-h-screen">
      <a
        href="#continut"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Sari la conținut
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Brand orgName={orgName} />
        <NavLinks />
        <p className="mt-auto px-2.5 text-caption text-muted-foreground">
          Apasă <kbd className="rounded border bg-muted px-1">?</kbd> pentru scurtături
        </p>
      </aside>

      <div className="lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <MobileNav orgName={orgName} />
          <SearchTrigger />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu email={email} role={role} logout={logout} />
          </div>
        </header>
        <main id="continut" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 outline-none md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <GlobalShortcuts orgId={orgId} />
    </div>
  );
}
