"use client";
import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Luminos", Icon: Sun },
  { value: "dark", label: "Întunecat", Icon: Moon },
  { value: "system", label: "Sistem", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme = "dark", setTheme } = useTheme();
  // Tema reală e cunoscută doar în browser; până atunci randăm o pictogramă neutră (evită mismatch la hidratare).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const Current = mounted ? OPTIONS.find((o) => o.value === theme)?.Icon ?? Monitor : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Schimbă tema">
          <Current />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon /> {label}
            {mounted && theme === value && <Check className="ml-auto" aria-label="Activă" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
