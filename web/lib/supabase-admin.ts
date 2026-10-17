import { createClient } from "@supabase/supabase-js";

// Client service_role: ocolește RLS. Doar pentru acțiunile publice (aplicare) care au nevoie să scrie ca anonim,
// după ce au validat tot și au derivat organizația din date de încredere. Null dacă cheia lipsește (funcția se oprește).
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
