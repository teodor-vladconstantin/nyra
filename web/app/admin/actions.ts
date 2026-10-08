"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

export async function logout() {
  await createClient().auth.signOut();
  redirect("/login");
}
