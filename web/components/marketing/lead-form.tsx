import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/lib/leads";

// kind="contact": nume + email + mesaj. kind="waitlist": doar email.
export function LeadForm({ kind, from, submit }: { kind: "contact" | "waitlist"; from: "/contact" | "/preturi"; submit: string }) {
  const contact = kind === "contact";
  return (
    <form action={submitLead} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="from" value={from} />
      {/* Honeypot: ascuns pentru oameni și cititoare de ecran. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {contact && (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-name`}>Nume</Label>
          <Input id={`${kind}-name`} name="name" autoComplete="name" maxLength={200} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${kind}-email`}>Email</Label>
        <Input id={`${kind}-email`} name="email" type="email" required autoComplete="email" maxLength={320} />
      </div>
      {contact && (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-message`}>Mesaj</Label>
          <Textarea id={`${kind}-message`} name="message" required rows={5} minLength={5} maxLength={5000} />
        </div>
      )}
      <SubmitButton pendingText="Se trimite…">{submit}</SubmitButton>
    </form>
  );
}
