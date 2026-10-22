import { removeCvFiles } from "@/lib/audit";
import { adminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Retenția automată (vercel.json, zilnic): șterge candidații peste termenul organizației, leads, cereri rezolvate și jurnal vechi,
// apoi fișierele lor din bucket. Vercel trimite `Authorization: Bearer $CRON_SECRET`; fără CRON_SECRET setat, ruta rămâne închisă.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const admin = adminClient();
  if (!admin) return new Response("SUPABASE_SERVICE_ROLE_KEY lipsește", { status: 500 });

  const { data, error } = await admin.rpc("purge_expired_all");
  if (error) {
    console.error("retention purge", error);
    return new Response("Curățarea a eșuat", { status: 500 });
  }
  const files = ((data ?? []) as { files: string[] }[]).flatMap((r) => r.files);
  for (let i = 0; i < files.length; i += 500) await removeCvFiles(admin, files.slice(i, i + 500));
  return Response.json({ candidates: (data ?? []).length, files: files.length });
}
