import { Label } from "@/components/ui/label";
import type { FieldErrors } from "@/lib/experience";

// Eticheta + eroarea unui câmp; inputul primește `fieldProps(...)` ca să fie legat accesibil de ele.
export function fieldProps(prefix: string, name: string, errors: FieldErrors) {
  return {
    id: `${prefix}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${prefix}-${name}-err` : undefined,
  } as const;
}

export function Field({ prefix, name, label, errors, children, className }: {
  prefix: string; name: string; label: string; errors: FieldErrors; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
      {children}
      {errors[name] && <p id={`${prefix}-${name}-err`} role="alert" className="text-xs text-destructive">{errors[name]}</p>}
    </div>
  );
}
