// leads (formulare publice): anon/authenticated pot doar insera; nu pot citi. Constrângeri pe kind/email/lungimi.
import assert from "assert";
import { db, count, as, su } from "./_pglite.mjs";

await as("anon");
await db.query("insert into leads (kind, name, email, message) values ('contact','Ana','ana@x.ro','Salut')");
await db.query("insert into leads (kind, email) values ('waitlist','dan@x.ro')");
// Fără politică de select: anon nu vede nimic (nici ce a inserat).
assert.equal(await count("select 1 from leads"), 0);
// Fără politici de update/delete: ating 0 rânduri (verificat la final ca service_role).
await db.query("update leads set name = 'x'");
await db.query("delete from leads");

await assert.rejects(db.query("insert into leads (kind, email) values ('altceva','a@x.ro')"));
await assert.rejects(db.query("insert into leads (kind, email) values ('contact','fara-arond')"));
await assert.rejects(db.query("insert into leads (kind, email, message) values ('contact','a@x.ro',$1)", ["x".repeat(5001)]));

await as("authenticated", "00000000-0000-0000-0000-00000000000a");
await db.query("insert into leads (kind, email) values ('waitlist','c@x.ro')");
assert.equal(await count("select 1 from leads"), 0);

await as("service_role");
assert.equal(await count("select 1 from leads"), 3);
assert.equal(await count("select 1 from leads where name = 'x'"), 0);
await su();
console.log("leads ok");
