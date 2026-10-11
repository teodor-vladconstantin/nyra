"use client";
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Radix rezervă "" pentru „fără selecție", deci opțiunea cu value="" primește un înlocuitor intern.
const EMPTY = "__empty__";

type Props = {
  id?: string; name?: string; className?: string; disabled?: boolean;
  value?: string | number; defaultValue?: string | number;
  onChange?: (e: { target: { value: string; name: string } }) => void;
  children?: React.ReactNode;
  "aria-label"?: string; "aria-invalid"?: boolean; "aria-describedby"?: string;
};

// Același API ca un <select> nativ (copii <option>, value/defaultValue, name, onChange cu e.target.value),
// dar lista e dropdown-ul din tema aplicației. `name` => input ascuns, deci merge în formulare GET/server actions.
export function NativeSelect({ id, name, className, disabled, value, defaultValue, onChange, children, ...aria }: Props) {
  const options = React.Children.toArray(children).flatMap((c) =>
    React.isValidElement<{ value?: string | number; children?: React.ReactNode }>(c)
      ? [{ value: String(c.props.value ?? ""), label: c.props.children }]
      : [],
  );
  const [inner, setInner] = React.useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const pick = (v: string) => {
    const real = v === EMPTY ? "" : v;
    setInner(real);
    onChange?.({ target: { value: real, name: name ?? "" } });
  };

  return (
    <>
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      <Select value={current === "" ? EMPTY : current} onValueChange={pick} disabled={disabled}>
        <SelectTrigger id={id} className={cn("aria-[invalid=true]:border-destructive", className)} {...aria}>
          <SelectValue>{options.find((o) => o.value === current)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value === "" ? EMPTY : o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );
}
