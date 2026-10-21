import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/org";
import { triggerParse } from "@/lib/parser";
import { hashFile } from "@/lib/duplicates";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_RECENT_UPLOADS = 300; // plafon per organizație / 10 minute: oprește un script sau un dublu-click scăpat de sub control
const TYPES = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [0x50, 0x4b, 0x03, 0x04] }, // ZIP
} as const;

// duplicate = există deja un CV identic (același sha256); încărcarea se face oricum.
export type UploadResult = { ok: true; duplicate?: { id: string; name: string } } | { ok: false; error: string };

// Route handler, nu Server Action: acțiunile Next rulează pe rând și țin la coadă și navigarea.
// Un fișier per cerere; clientul le trimite în paralel. Fără revalidatePath: clientul face un singur refresh la final.
export async function POST(request: Request) {
  let ctx: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    ctx = await requireAdmin();
  } catch {
    return NextResponse.json<UploadResult>({ ok: false, error: "Nu ai dreptul să încarci CV-uri" }, { status: 403 });
  }
  const { supabase, orgId } = ctx;
  const fail = (error: string) => NextResponse.json<UploadResult>({ ok: false, error });

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Fișier gol");
  if (file.size > MAX_BYTES) return fail("Mai mare de 10 MB");
  const ext = file.name.split(".").pop()?.toLowerCase() as keyof typeof TYPES;
  const type = TYPES[ext];
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!type || !type.magic.every((b, i) => head[i] === b)) return fail("Doar PDF sau DOCX");

  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: recent } = await supabase
    .from("candidates").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", since);
  if ((recent ?? 0) >= MAX_RECENT_UPLOADS) return fail("Prea multe încărcări; încearcă peste câteva minute");

  const contentHash = await hashFile(file);
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { contentType: type.mime });
  if (upErr) {
    console.error("cv upload", upErr);
    return fail("Încărcarea a eșuat");
  }
  const { data, error } = await supabase
    .from("candidates")
    .insert({ organization_id: orgId, file_name: file.name.slice(0, 255), cv_url: path, content_hash: contentHash })
    .select("id, duplicate_of")
    .single();
  if (error) {
    await supabase.storage.from("cvs").remove([path]);
    console.error("candidate insert", error);
    return fail("Salvarea a eșuat");
  }
  await triggerParse(orgId, data.id); // awaited: pe Vercel, munca după răspuns se oprește (Next 14 nu are after())
  if (!data.duplicate_of) return NextResponse.json<UploadResult>({ ok: true });
  const { data: orig } = await supabase
    .from("candidates").select("name, file_name").eq("id", data.duplicate_of).eq("organization_id", orgId).maybeSingle();
  return NextResponse.json<UploadResult>({ ok: true, duplicate: { id: data.duplicate_of, name: orig?.name ?? orig?.file_name ?? "un candidat existent" } });
}
