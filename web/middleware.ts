import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/admin(.*)", "/onboarding(.*)"]);

// Aplicația cere sesiune Clerk; site-ul public rămâne deschis. Neautentificații ajung la /sign-in cu redirect_url înapoi.
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Tot, în afară de fișierele statice și internele Next
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
