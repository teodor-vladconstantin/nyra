import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import type { Job } from "@/lib/jobs";

// Formular comun pentru creare și editare; `action` e o server action care primește FormData.
export function JobForm({ action, job, submit }: { action: (f: FormData) => void | Promise<void>; job?: Job; submit: string }) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="title">Titlu</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={job?.title} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Locație</Label>
        <Input id="location" name="location" maxLength={200} defaultValue={job?.location} placeholder="București / Remote" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contract_type">Tip contract</Label>
        <Input id="contract_type" name="contract_type" maxLength={100} defaultValue={job?.contract_type} placeholder="Normă întreagă" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="keywords">Cuvinte cheie (skills cerute, separate prin virgulă)</Label>
        <Input id="keywords" name="keywords" defaultValue={job?.keywords.join(", ")} placeholder="react, sql, docker" />
        <p className="text-xs text-muted-foreground">Candidații sunt clasați după câte dintre ele apar în skills-urile din CV.</p>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Descriere</Label>
        <Textarea id="description" name="description" rows={5} maxLength={20000} defaultValue={job?.description} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="requirements">Cerințe</Label>
        <Textarea id="requirements" name="requirements" rows={5} maxLength={20000} defaultValue={job?.requirements} />
      </div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="public_apply" defaultChecked={job?.public_apply} className="mt-0.5 size-4 accent-primary" />
        <span>
          Primește aplicații pe o pagină publică
          <span className="block text-xs text-muted-foreground">Oricine are linkul poate vedea jobul și își poate trimite CV-ul. Linkul apare pe pagina jobului după salvare.</span>
        </span>
      </label>
      <div className="sm:col-span-2"><SubmitButton pendingText="Se salvează…">{submit}</SubmitButton></div>
    </form>
  );
}
