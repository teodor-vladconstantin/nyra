// Turul ghidat: profilul nou are tour_seen_at null, mark_tour_seen îl setează o singură dată și doar pentru utilizatorul curent.
import assert from "assert";
import { db, one, as, su } from "./_pglite.mjs";

const seen = async (uid) => (await one("select tour_seen_at from profiles where user_id = $1", [uid])).tour_seen_at;

await as("authenticated", "user_tour", "tour@x.ro");
await db.query("select create_organization('Firma Tur')");
assert.equal(await seen("user_tour"), null, "cont nou: turul nu a fost văzut");

await as("authenticated", "user_other", "other@x.ro");
await db.query("select create_organization('Alta')");

await as("authenticated", "user_tour", "tour@x.ro");
await db.query("select mark_tour_seen()");
const first = await seen("user_tour");
assert.ok(first, "marcat ca văzut");
await db.query("select mark_tour_seen()");
assert.equal(String(await seen("user_tour")), String(first), "idempotent: data nu se mută");

// Clientul nu scrie direct în profiles (fără politică de update): 0 rânduri.
await db.query("update profiles set tour_seen_at = null where user_id = 'user_tour'");
assert.ok(await seen("user_tour"));

await su();
assert.equal(await seen("user_other"), null, "alt utilizator nu e afectat");

await as("anon");
await assert.rejects(db.query("select mark_tour_seen()"));
await su();
console.log("OK: tour");
