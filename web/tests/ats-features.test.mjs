// Matching semantic (job_semantic_matches) și scorecards: RLS, validări, izolare între organizații, jurnal.
import assert from "assert";
import { db, A, B, one, count, as } from "./_pglite.mjs";

const V = "00000000-0000-0000-0000-00000000000c";
const org1 = (await one("select id from organizations where name = 'Compania'")).id;
const org2 = (await one("insert into organizations (name) values ('Alta') returning id")).id;
await db.query("insert into auth.users values ($1,'a@x.ro'),($2,'b@x.ro'),($3,'v@x.ro')", [A, B, V]);
await db.query(
  "insert into memberships (organization_id,user_id,role) values ($1,$2,'admin'),($3,$4,'admin'),($1,$5,'viewer')",
  [org1, A, org2, B, V],
);

// Vectori normalizați de 384 dim.: e0 (axa 0), e1 (axa 1), mix (45° între ele).
const vec = (...xs) => `{${[...xs, ...Array(384 - xs.length).fill(0)].join(",")}}`;
const s = Math.SQRT1_2;
await as("service_role");
const cand = async (org, name, emb) =>
  (await one(
    "insert into candidates (organization_id, name, file_name, cv_url, embedding) values ($1,$2,$2,$3,$4) returning id",
    [org, name, `${org}/${name}.pdf`, emb],
  )).id;
const ana = await cand(org1, "Ana", vec(1, 0));
const dan = await cand(org1, "Dan", vec(s, s));
const eli = await cand(org1, "Eli", vec(0, 1));
await cand(org1, "FaraEmbedding", null);
await cand(org2, "Eva", vec(1, 0));

await as("authenticated", A);
const job = (await one("insert into jobs (organization_id, title, embedding) values ($1,'Dev',$2) returning id", [org1, vec(1, 0)])).id;
const rows = (await db.query("select c.name, m.similarity from job_semantic_matches($1) m join candidates c on c.id = m.candidate_id", [job])).rows;
assert.deepEqual(rows.map((r) => r.name), ["Ana", "Dan", "Eli"], "ordonat după similaritate; fără embedding și alt org nu apar");
assert.ok(Math.abs(rows[0].similarity - 1) < 1e-6 && Math.abs(rows[1].similarity - s) < 1e-6 && rows[2].similarity === 0);

// job fără embedding => niciun rezultat; dimensiune greșită => respinsă
const bare = (await one("insert into jobs (organization_id, title) values ($1,'Gol') returning id", [org1])).id;
assert.equal(await count("select 1 from job_semantic_matches($1)", [bare]), 0);
await assert.rejects(db.query("update jobs set embedding = '{1,2,3}' where id = $1", [job]));

// altă organizație nu vede candidații
await as("authenticated", B);
assert.equal(await count("select 1 from job_semantic_matches($1)", [job]), 0);

// ---- Scorecards ----
const card = (org, cand, extra = "") =>
  db.query(`insert into candidate_scorecards (organization_id, candidate_id, technical, communication, culture, recommendation${extra ? ", comment" : ""})
            values ($1,$2,4,5,3,'yes'${extra ? ",$3" : ""})`, extra ? [org, cand, extra] : [org, cand]);
await as("authenticated", A);
await card(org1, ana, "Foarte bun la React");
await assert.rejects(db.query("insert into candidate_scorecards (organization_id,candidate_id,technical,communication,culture,recommendation) values ($1,$2,6,1,1,'no')", [org1, ana]));
await as("authenticated", V);
assert.equal(await count("select 1 from candidate_scorecards"), 1, "viewer citește");
await assert.rejects(card(org1, ana), "viewer nu scrie");
await as("authenticated", B);
assert.equal(await count("select 1 from candidate_scorecards"), 0, "alt org nu vede");
await assert.rejects(card(org2, ana), "FK compus: candidat din alt org");

// Jurnal: comentariul e redactat, embedding-ul nu apare deloc
await as("service_role");
const log = (await db.query("select changes from audit_log where entity_type in ('candidate_scorecards','candidates','jobs')")).rows
  .map((r) => JSON.stringify(r.changes)).join("\n");
assert.ok(!log.includes("Foarte bun"), "comentariul nu e în jurnal");
assert.ok(!log.includes('"embedding"'), "embedding-ul nu e în jurnal");
console.log("ok");
