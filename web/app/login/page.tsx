import { redirect } from "next/navigation";

// Linkuri vechi către /login: autentificarea e acum la /sign-in (Clerk).
export default function LoginPage() {
  redirect("/sign-in");
}
