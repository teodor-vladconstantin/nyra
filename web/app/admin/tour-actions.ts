"use server";
import { getOrg } from "@/lib/org";

// Închiderea turului (terminat sau sărit) îl marchează ca văzut; la eșec turul reapare data viitoare.
export async function markTourSeen() {
  const { supabase } = await getOrg();
  const { error } = await supabase.rpc("mark_tour_seen");
  if (error) console.error("mark_tour_seen", error);
}
