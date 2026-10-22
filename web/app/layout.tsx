import { ClerkProvider } from "@clerk/nextjs";
import { roRO } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromParams } from "@/components/toast-from-params";
import { ThemeProvider } from "@/components/shell/theme-provider";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });

// Paginile Clerk sunt mereu întunecate (vezi AuthShell): culorile brandului ca valori concrete (Clerk le derivă).
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: "#edb30a",
    colorTextOnPrimaryBackground: "#111113",
    colorBackground: "#1a1a1d",
    colorInputBackground: "#232326",
    colorInputText: "#f4f4f6",
    colorText: "#f4f4f6",
    colorTextSecondary: "#a1a1a6",
    colorNeutral: "#f4f4f6",
    colorDanger: "#f08a8a",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  },
  elements: { card: "shadow-pop border border-border", footerActionLink: "text-brand" },
};

export const metadata: Metadata = {
  title: { default: "Nyra · By Joben", template: "%s · Nyra By Joben" },
  description: "Recrutare, simplu.",
};

// Culoarea barei de adrese a browserului urmează tema.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes adaugă clasa .dark pe <html> înainte de hidratare.
    <html lang="ro" suppressHydrationWarning>
      <body className={`${poppins.variable} min-h-screen font-sans`}>
        <ClerkProvider
          localization={roRO}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/admin"
          signUpFallbackRedirectUrl="/onboarding"
          appearance={CLERK_APPEARANCE}
        >
          <ThemeProvider>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
            <Suspense>
              <ToastFromParams />
            </Suspense>
            <CookieConsent />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
