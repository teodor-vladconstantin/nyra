"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Formulare publice (contact + listă de așteptare) -> tabelul `leads`. Rolul anon poate doar insera.
const BACK = ["/contact", "/preturi"] as const;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function submitLead(formData: FormData) {
  const from = BACK.find((p) => p === formData.get("from")) ?? "/contact";
  const done = (type: "success" | "error", msg: string) =>
    redirect(`${from}?toast=${encodeURIComponent(msg)}&type=${type}`);

  // Honeypot: boții completează câmpul ascuns; le răspundem ca la succes, fără să salvăm nimic.
  if (String(formData.get("website") ?? "")) return done("success", "Mulțumim! Revenim în curând.");

  const kind = formData.get("kind") === "waitlist" ? "waitlist" : "contact";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!EMAIL.test(email) || email.length > 320) return done("error", "Adresa de email nu pare corectă.");
  if (name.length > 200) return done("error", "Numele este prea lung.");
  if (kind === "contact" && message.length < 5) return done("error", "Scrie-ne câteva cuvinte în mesaj.");
  if (message.length > 5000) return done("error", "Mesajul este prea lung (maximum 5000 de caractere).");

  // Fără .select(): rolul anon nu are politică de citire, deci un insert cu returning ar eșua.
  const { error } = await createClient().from("leads").insert({ kind, name, email, message });
  if (error) return done("error", "Nu am putut trimite. Încearcă din nou în câteva minute.");
  return done("success", kind === "waitlist" ? "Ești pe listă. Îți scriem când planurile sunt gata." : "Mulțumim! Revenim în curând.");
}
