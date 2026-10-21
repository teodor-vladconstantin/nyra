import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findMembership } from "@/lib/org";
import { createClient } from "@/lib/supabase";

export const metadata = { title: "Organizația ta" };

async function createOrganization(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const supabase = createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    redirect(`/onboarding?toast=${encodeURIComponent("Numele trebuie să aibă între 1 și 120 de caractere.")}&type=error`);
  }
  const { error } = await supabase.rpc("create_organization", { p_name: name });
  // „deja o organizație” (cursă / dublu-click): mergem oricum în aplicație.
  if (error && !/deja o organiza/.test(error.message)) {
    console.error("create_organization", error);
    redirect(`/onboarding?toast=${encodeURIComponent("Nu am putut crea organizația. Încearcă din nou.")}&type=error`);
  }
  redirect("/admin");
}

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const supabase = createClient();
  // Cont vechi sau organizație deja creată: nu are ce căuta aici.
  if (await findMembership(supabase, userId)) redirect("/admin");
  const { error } = await supabase.rpc("sync_user");
  if (error) throw error;
  if (await findMembership(supabase, userId)) redirect("/admin");

  return (
    <AuthShell>
      <Card className="w-full shadow-pop">
        <CardHeader>
          <CardTitle className="text-title">Cum se numește <span className="text-brand">organizația</span> ta?</CardTitle>
          <CardDescription>Compania sau echipa care recrutează.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createOrganization} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nume</Label>
              <Input id="name" name="name" required maxLength={120} autoFocus autoComplete="organization" />
            </div>
            <SubmitButton className="w-full" pendingText="Se creează…">Continuă</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
