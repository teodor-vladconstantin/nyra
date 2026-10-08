"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Cât timp există CV-uri în procesare, reîncarcă datele de pe server la câteva secunde.
export function AutoRefresh({ active, every = 4000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), every);
    return () => clearInterval(id);
  }, [active, every, router]);
  return null;
}
