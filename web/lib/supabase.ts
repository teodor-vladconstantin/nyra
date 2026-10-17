import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client Supabase cu token-ul Clerk (Third-Party Auth): RLS vede utilizatorul din `sub`/`email`.
// Fără sesiune, getToken() întoarce null și supabase-js folosește cheia anon (formularele publice, ex. `leads`).
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { accessToken: async () => (await auth()).getToken() },
  );
}
