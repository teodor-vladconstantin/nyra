import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_VERSION } from "@/lib/legal";
import { getOrg } from "@/lib/org";

export const metadata = { title: "Acceptă termenii" };

async function accept(formData: FormData) {
  "use server";
  const { supabase } = await getOrg();
  if (!["terms", "dpa", "express"].every((k) => formData.get(k) === "on")) {
    redirect(`/acceptare?toast=${encodeURIComponent("Bifează toate cele trei căsuțe ca să continui.")}&type=error`);
  }
  const { error } = await supabase.rpc("accept_legal", { p_version: LEGAL_VERSION });
  if (error) {
    console.error("accept_legal", error);
    redirect(`/acceptare?toast=${encodeURIComponent("Nu am putut salva acceptarea. Încearcă din nou.")}&type=error`);
  }
  redirect("/admin");
}

const link = "text-brand underline underline-offset-4";

// Pasul obligatoriu după înregistrare (și la fiecare versiune nouă a documentelor): acceptarea se loghează cu utilizator, moment și versiune.
export default async function AcceptPage() {
  const { supabase, user } = await getOrg();
  const { count } = await supabase.from("legal_acceptances").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("version", LEGAL_VERSION);
  if ((count ?? 0) >= 3) redirect("/admin");

  return (
    <AuthShell>
      <Card className="w-full shadow-pop">
        <CardHeader>
          <CardTitle className="text-title">Înainte să începi</CardTitle>
          <CardDescription>Versiunea documentelor: {LEGAL_VERSION}. Acceptarea se înregistrează cu data și ora.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={accept} className="space-y-4 text-sm">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="terms" required className="mt-1 size-4 accent-primary" />
              <span>Am citit și accept <Link href="/termeni" target="_blank" className={link}>Termenii și condițiile</Link> și iau cunoștință de <Link href="/confidentialitate" target="_blank" className={link}>Politica de confidențialitate</Link>. Folosesc Nyra în scop profesional.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="dpa" required className="mt-1 size-4 accent-primary" />
              <span>Accept <Link href="/dpa" target="_blank" className={link}>Acordul de prelucrare a datelor (DPA)</Link> și declar că am autoritatea să angajez organizația mea.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="express" required className="mt-1 size-4 accent-primary" />
              <span>Accept în mod expres clauzele din secțiunea 20 a Termenilor (beta fără garanții, responsabilitatea Clientului, suspendare și încetare, limitarea răspunderii, modificarea termenilor, instanța competentă).</span>
            </label>
            <SubmitButton className="w-full" pendingText="Se salvează…">Continuă</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
