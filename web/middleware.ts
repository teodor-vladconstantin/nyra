import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/admin(.*)", "/onboarding(.*)", "/acceptare(.*)"]);

// Aplicația cere sesiune Clerk; site-ul public rămâne deschis. Neautentificații ajung la /sign-in cu redirect_url înapoi.
export default clerkMiddleware(
  async (auth, req) => {
    if (isProtected(req)) await auth.protect();
  },
  // Fără asta, protect() trimite la pagina Clerk găzduită (accounts.dev), nu la /sign-in din aplicație.
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Tot, în afară de fișierele statice și internele Next
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
