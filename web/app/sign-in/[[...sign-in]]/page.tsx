import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Autentificare" };

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn />
    </AuthShell>
  );
}
