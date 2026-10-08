import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { safeNext } from "@/components/shell/safe-next";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { createClient } from "@/lib/supabase";

export const metadata = { title: "Autentificare" };

// Mesaje fixe, alese după un cod scurt din URL: nu reflectăm text liber și nu dezvăluim dacă emailul există.
const ERRORS: Record<string, string> = {
  invalid: "Email sau parolă incorectă.",
  rate: "Prea multe încercări. Așteaptă câteva minute și încearcă din nou.",
  unknown: "Autentificarea nu a reușit. Încearcă din nou.",
};

async function login(formData: FormData) {
  "use server";
  const next = safeNext(String(formData.get("next") ?? ""));
  const to = (code: string) => redirect(`/login?error=${code}&next=${encodeURIComponent(next)}`);

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return to("invalid");

  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) {
    // Aceeași eroare pentru email inexistent și parolă greșită.
    return to(error.status === 429 ? "rate" : error.status && error.status >= 500 ? "unknown" : "invalid");
  }
  redirect(next);
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const error = searchParams.error ? ERRORS[searchParams.error] ?? ERRORS.unknown : undefined;
  return (
    <main className="relative grid min-h-screen place-items-center p-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <Card className="w-full max-w-sm shadow-pop">
        <CardHeader>
          <div className="mb-3 flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={40} height={40} className="size-10" />
            <span className="text-2xl font-bold tracking-[-0.04em]">Nyra</span>
          </div>
          <CardTitle className="text-title">Intră în <span className="text-brand">Nyra</span></CardTitle>
          <CardDescription>Parser de CV-uri pentru echipa de recrutare.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <input type="hidden" name="next" value={safeNext(searchParams.next)} />
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus autoComplete="email" inputMode="email" aria-invalid={!!error} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Parolă</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" aria-invalid={!!error} />
            </div>
            <SubmitButton className="w-full" pendingText="Se verifică…">Intră</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
