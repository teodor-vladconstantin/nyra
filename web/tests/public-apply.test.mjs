// Aplicare publică: public_job() arată doar joburi active + marcate public_apply; anonimii nu citesc tabelele;
// candidații din aplicare au source/consent_at, iar sursa e validată.
import assert from "assert";
import { db, one, count, as, su } from "./_pglite.mjs";

const org = (await one("select id from organizations where name = 'Compania'")).id;
const job = async (title, status, pub) =>
  (await one("insert into jobs (organization_id, title, status, public_apply) values ($1,$2,$3,$4) returning id", [org, title, status, pub])).id;
const open = await job("Deschis", "active", true);
const hidden = await job("Ne-public", "active", false);
const closed = await job("Închis", "closed", true);

await as("anon");
const pub = (await db.query("select * from public_job($1)", [open])).rows;
assert.equal(pub.length, 1);
assert.equal(pub[0].title, "Deschis");
assert.equal(pub[0].company, "Compania");
assert.equal(await count("select 1 from public_job($1)", [hidden]), 0, "job fără public_apply");
assert.equal(await count("select 1 from public_job($1)", [closed]), 0, "job închis");
assert.equal(await count("select 1 from jobs"), 0, "anon nu citește jobs (RLS)");
assert.equal(await count("select 1 from candidates"), 0, "anon nu citește candidates (RLS)");
await assert.rejects(db.query("insert into candidates (organization_id, source) values ($1,'apply')", [org]), "anon nu scrie candidates");

await as("service_role");
const c = await one(
  "insert into candidates (organization_id, name, email, source, consent_at) values ($1,'Ana','ana@x.ro','apply', now()) returning source, consent_at",
  [org],
);
assert.equal(c.source, "apply");
assert.ok(c.consent_at);
assert.equal((await one("insert into candidates (organization_id, name) values ($1,'Dan') returning source", [org])).source, "upload");
assert.equal((await one("insert into candidates (organization_id, name, source, parsing_status) values ($1,'Import','import','parsed') returning source", [org])).source, "import");
await assert.rejects(db.query("insert into candidates (organization_id, source) values ($1,'altceva')", [org]));
// ---- Sursa aplicării: format validat, agregare pe job (doar source = 'apply'; fără ?src= = direct) ----
await assert.rejects(db.query("insert into candidates (organization_id, apply_source) values ($1,'Are Spatii!')", [org]));
const cs = async (src) =>
  (await one("insert into candidates (organization_id, name, source, apply_source) values ($1,'C','apply',$2) returning id", [org, src])).id;
for (const id of [await cs("linkedin"), await cs("linkedin"), await cs("ejobs"), await cs(null)]) {
  await db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [open, id, org]);
}
const imported = (await one("insert into candidates (organization_id, name, source, apply_source) values ($1,'I','import','linkedin') returning id", [org])).id;
await db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [open, imported, org]);
await su(); // auth.users / memberships: ca superuser
const A = "00000000-0000-0000-0000-00000000000a";
await db.query("insert into auth.users values ($1,'a@x.ro')", [A]);
await db.query("insert into memberships (organization_id,user_id,role) values ($1,$2,'admin')", [org, A]);
await as("authenticated", A);
assert.deepEqual((await db.query("select source, applications from job_apply_sources($1)", [open])).rows, [
  { source: "linkedin", applications: 2 }, { source: "direct", applications: 1 }, { source: "ejobs", applications: 1 },
]);
await as("anon");
assert.equal(await count("select 1 from public_jobs()"), 1, "sitemap: doar joburi active + public_apply");
await as("service_role");
await su();
console.log("public-apply ok");
