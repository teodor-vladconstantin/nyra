import { BookOpenCheck, Briefcase, Copy, KanbanSquare, LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; key: string };

// `key` = a doua tastă din secvența "g apoi ..." (vezi shortcuts.tsx).
export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Panou", icon: LayoutDashboard, key: "h" },
  { href: "/admin/candidati", label: "Candidați", icon: Users, key: "c" },
  { href: "/admin/candidati/pipeline", label: "Pipeline", icon: KanbanSquare, key: "p" },
  { href: "/admin/joburi", label: "Joburi", icon: Briefcase, key: "o" },
  { href: "/admin/candidati/dedupe", label: "Dedupe", icon: Copy, key: "d" },
  { href: "/admin/jurnal", label: "Jurnal", icon: BookOpenCheck, key: "j" },
  { href: "/admin/setari", label: "Setări", icon: Settings, key: "s" },
];

// Cea mai specifică potrivire câștigă: /admin/candidati/pipeline nu activează și "Candidați".
export function activeHref(pathname: string): string | undefined {
  return NAV_ITEMS.filter((i) => (i.href === "/admin" ? pathname === "/admin" : pathname === i.href || pathname.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
