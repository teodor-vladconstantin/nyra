// Joburi: RLS (admin scrie, viewer citește, altă organizație nu vede), FK compuse, scor job_matches, jurnal.
import assert from "assert";
import { db, A, B, one, count, as, su } from "./_pglite.mjs";

const V = "00000000-0000-0000-0000-00000000000c";
const org1 = (await one("select id from organizations where name = 'Compania'")).id;
const org2 = (await one("insert into organizations (name) values ('Alta') returning id")).id;
await db.query("insert into auth.users values ($1,'a@x.ro'),($2,'b@x.ro'),($3,'v@x.ro')", [A, B, V]);
await db.query(
  "insert into memberships (organization_id,user_id,role) values ($1,$2,'admin'),($3,$4,'admin'),($1,$5,'viewer')",
  [org1, A, org2, B, V],
);

// Candidați cu skills (ca parserul): Ana știe react+sql, Dan doar sql, Eva e în altă organizație.
await as("service_role");
const cand = async (org, name, skills) =>
  (await one(
    "insert into candidates (organization_id, name, file_name, cv_url, extracted_keywords) values ($1,$2,$2,$3,$4) returning id",
    [org, name, `${org}/${name}.pdf`, JSON.stringify({ skills })],
  )).id;
const ana = await cand(org1, "Ana", ["React", "SQL"]);
const dan = await cand(org1, "Dan", ["SQL"]);
const eva = await cand(org2, "Eva", ["React"]);

// ---- Admin: creează job; viewer: doar citește ----
await as("authenticated", A);
const job = (await one(
  "insert into jobs (organization_id, title, keywords) values ($1,'Dev React',$2) returning id", [org1, ["react", " SQL ", "Docker"]],
)).id;
await as("authenticated", V);
assert.equal(await count("select 1 from jobs"), 1);
await assert.rejects(db.query("insert into jobs (organization_id, title) values ($1,'x')", [org1]));
await assert.rejects(db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [job, ana, org1]));

// ---- Altă organizație nu vede jobul și nu poate atașa candidați între organizații ----
await as("authenticated", B);
assert.equal(await count("select 1 from jobs"), 0);
assert.equal(await count("select 1 from job_matches($1)", [job]), 0);
await assert.rejects(db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [job, eva, org2]));

// ---- Scor: Ana 2/3, Dan 1/3; atașații primii; Eva (altă organizație) nu apare ----
await as("authenticated", A);
await assert.rejects(db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [job, eva, org1]));
let rows = (await db.query("select name, matched, total, attached from job_matches($1)", [job])).rows;
assert.deepEqual(rows, [
  { name: "Ana", matched: 2, total: 3, attached: false },
  { name: "Dan", matched: 1, total: 3, attached: false },
]);
// ---- Explicabilitate: ce s-a potrivit și ce lipsește (aceeași regulă ca scorul); Eva (altă organizație) nu apare ----
const detail = (await db.query(
  "select c.name, d.matched, d.missing from job_match_detail($1, $2) d join candidates c on c.id = d.candidate_id order by 1", [job, [ana, dan, eva]],
)).rows;
assert.deepEqual(detail, [
  { name: "Ana", matched: ["react", "SQL"], missing: ["Docker"] },
  { name: "Dan", matched: ["SQL"], missing: ["react", "Docker"] },
]);
await db.query("insert into job_candidates (job_id, candidate_id, organization_id) values ($1,$2,$3)", [job, dan, org1]);
rows = (await db.query("select name, attached from job_matches($1)", [job])).rows;
assert.deepEqual(rows, [{ name: "Dan", attached: true }, { name: "Ana", attached: false }]);

// ---- Job fără cuvinte cheie: total 0 ----
const bare = (await one("insert into jobs (organization_id, title) values ($1,'Fără taguri') returning id", [org1])).id;
assert.equal((await one("select max(total) t from job_matches($1)", [bare])).t, 0);

// ---- Jurnal + cascadă ----
await su();
assert.ok(await count("select 1 from audit_log where entity_type = 'jobs' and action = 'insert'") >= 1);
assert.equal(await count("select 1 from audit_log where entity_type = 'job_candidates' and action = 'insert'"), 1);
await db.query("delete from jobs where id = $1", [job]);
assert.equal(await count("select 1 from job_candidates"), 0);
