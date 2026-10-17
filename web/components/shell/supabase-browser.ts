"use client";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

// Client pentru browser cu token-ul Clerk al sesiunii curente. RLS rămâne granița reală de acces.
export function useBrowserClient() {
  const { getToken } = useAuth();
  return useMemo(
    () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { accessToken: () => getToken() }),
    [getToken],
  );
}
