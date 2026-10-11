"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Înlocuiește <input list> + <datalist> (popup-ul nativ nu poate fi stilizat): același câmp text, sugestiile apar într-un panou în tema aplicației.
export function SuggestInput({ id, name, defaultValue, placeholder, options }: {
  id?: string; name: string; defaultValue?: string; placeholder?: string; options: string[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null);

  const q = value.trim().toLowerCase();
  const shown = options.filter((o) => o.toLowerCase().includes(q) && o !== value).slice(0, 8);
  const visible = open && shown.length > 0;

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const pick = (v: string) => { setValue(v); setOpen(false); setActive(-1); };

  return (
    <div ref={root} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-autocomplete="list"
        onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && shown.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % shown.length); }
          else if (e.key === "ArrowUp" && shown.length) { e.preventDefault(); setActive((a) => (a <= 0 ? shown.length - 1 : a - 1)); }
          else if (e.key === "Enter" && visible && active >= 0) { e.preventDefault(); pick(shown[active]); }
          else if (e.key === "Escape" && visible) { e.stopPropagation(); setOpen(false); }
        }}
      />
      {visible && (
        <ul role="listbox" className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {shown.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-default select-none rounded-sm px-2 py-1.5", i === active && "bg-accent text-accent-foreground")}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
