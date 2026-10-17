"use client";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo, useRef } from "react";

// Client pentru browser cu token-ul Clerk al sesiunii curente. RLS rămâne granița reală de acces.
// supabase-js apelează accessToken chiar la construcție, inclusiv la randarea pe server, unde getToken încă nu e o funcție:
// de aceea citim getToken dintr-un ref și întoarcem null când lipsește (clientul se folosește doar din efecte, în browser).
export function useBrowserClient() {
  const { getToken } = useAuth();
  const ref = useRef(getToken);
  ref.current = getToken;
  return useMemo(
    () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      accessToken: async () => (typeof ref.current === "function" ? ref.current() : null),
    }),
    [],
  );
}
