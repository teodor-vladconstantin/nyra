"use client";
import { LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// `logout` e server action trimisă din layout.
export function UserMenu({ email, role, logout }: { email: string; role: "admin" | "viewer"; logout: () => Promise<void> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-semibold uppercase text-secondary-foreground transition-colors hover:bg-accent"
        aria-label={`Contul meu (${email})`}
      >
        {email.charAt(0) || "?"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-medium">{email}</span>
          <span className="block text-caption text-muted-foreground">{role === "admin" ? "Administrator" : "Vizualizare"}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full cursor-pointer">
              <LogOut /> Ieșire
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
