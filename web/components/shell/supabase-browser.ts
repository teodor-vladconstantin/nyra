"use client";
import { createBrowserClient } from "@supabase/ssr";

// Client pentru browser (aceleași cookie-uri de sesiune ca serverul). RLS rămâne granița reală de acces.
let client: ReturnType<typeof createBrowserClient> | undefined;
export function browserClient() {
  client ??= createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
