// Acceptarea documentelor legale: o înregistrare per (utilizator, document, versiune), doar prin accept_legal, vizibilă doar proprietarului.
import assert from "assert";
import { db, one, count, as, su } from "./_pglite.mjs";

await as("authenticated", "user_legal", "legal@x.ro");
await assert.rejects(db.query("select accept_legal('0.1')"), /organizatie/, "fără organizație nu se poate accepta");
await db.query("select create_organization('Firma Legal')");

await db.query("select accept_legal('0.1')");
await db.query("select accept_legal('0.1')");
assert.equal(await count("select 1 from legal_acceptances"), 3, "terms, dpa, express_clauses, o singură dată, idempotent");
await db.query("select accept_legal('0.2')");
assert.equal(await count("select 1 from legal_acceptances"), 6, "versiune nouă = acceptare nouă");

// Clientul nu scrie direct în tabel.
await assert.rejects(db.query("insert into legal_acceptances (document, version, organization_id) values ('terms', '9', gen_random_uuid())"));

await as("authenticated", "user_other", "other@x.ro");
assert.equal(await count("select 1 from legal_acceptances"), 0, "alt utilizator nu vede acceptările altuia");

await as("anon");
await assert.rejects(db.query("select accept_legal('0.1')"));
await su();
assert.equal((await one("select count(distinct user_id)::int n from legal_acceptances")).n, 1);
