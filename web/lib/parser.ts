// Declanșează parsing-ul unui CV în serviciul Python. Candidatul e deja salvat cu status „pending”:
// dacă serviciul nu răspunde, rămâne vizibil în tabel, sweeper-ul din serviciu îl reia, iar din fișa lui poate fi reprocesat.
// /parse e idempotent (revendicare atomică), deci o a doua încercare nu poate dubla procesarea.
export async function triggerParse(organizationId: string, candidateId: string): Promise<boolean> {
  const url = process.env.PARSER_URL;
  if (!url) return false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${url}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PARSER_TOKEN}` },
        body: JSON.stringify({ organization_id: organizationId, candidate_id: candidateId }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
      if (res.status < 500 && res.status !== 429) return false; // 4xx (token, UUID invalid): nu are rost reîncercat
    } catch (e) {
      console.error("parser trigger failed", candidateId, attempt, e);
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
