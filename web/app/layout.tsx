import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ToastFromParams } from "@/components/toast-from-params";
import { ThemeProvider } from "@/components/shell/theme-provider";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-sans" });

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
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
          <Suspense>
            <ToastFromParams />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
