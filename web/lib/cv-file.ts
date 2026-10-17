export const MAX_CV_BYTES = 10 * 1024 * 1024;
const TYPES = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: [0x50, 0x4b, 0x03, 0x04] }, // ZIP
} as const;

// Validează un CV încărcat (mărime, extensie, semnătura fișierului). Întoarce extensia + MIME sau mesajul de eroare.
export async function checkCv(file: unknown): Promise<{ ext: "pdf" | "docx"; mime: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Fișier gol" };
  if (file.size > MAX_CV_BYTES) return { error: "Mai mare de 10 MB" };
  const ext = file.name.split(".").pop()?.toLowerCase() as keyof typeof TYPES;
  const type = TYPES[ext];
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!type || !type.magic.every((b, i) => head[i] === b)) return { error: "Doar PDF sau DOCX" };
  return { ext, mime: type.mime };
}
