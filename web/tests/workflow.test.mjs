// Flux de recrutare (migrarea workflow): etape noi, etichete, filtre salvate, vederea candidate_overview reconstruită.
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

// ---- Enum: ordinea pipeline-ului ----
const statuses = (await one("select enum_range(null::candidate_status)::text[] s")).s;
assert.deepEqual(statuses, ["new", "to_contact", "shortlisted", "interview", "offer", "hired", "rejected"]);

// ---- Setup ca service/parser: doi candidați cu același CV (duplicate_of), unul în altă organizație ----
await as("service_role");
const H = "b".repeat(64);
const mk = async (o, name, hash) => (await one(
  "insert into candidates (organization_id, name, content_hash, created_at) values ($1,$2,$3,$4) returning id",
  [o, name, hash, name === "Ana" ? "2026-01-01" : "2026-01-02"])).id;
const ana = await mk(org1, "Ana", H);
const ion = await mk(org1, "Ion", H);
const strain = await mk(org2, "Străin", null);
await db.query(
  `insert into candidate_experiences (organization_id, candidate_id, position, company_name, role_title, start_date, extracted_skills, description)
   values ($1,$2,0,'Acme','QA Engineer','2023-01-01','["Cypress"]','')`, [org1, ana]);
const tag2 = (await one("insert into tags (organization_id, name) values ($1,'Alta') returning id", [org2])).id;

// ---- Tranziții de status: orice etapă -> orice etapă, valorile vechi rămân valide ----
await as("authenticated", A);
for (const s of ["to_contact", "shortlisted", "interview", "offer", "hired", "rejected", "interview", "new"]) {
  await db.query("update candidates set status=$1 where id=$2", [s, ana]);
  assert.equal((await one("select status from candidate_overview where id=$1", [ana])).status, s);
}
await assert.rejects(db.query("update candidates set status='archived' where id=$1", [ana]));
await db.query("update candidates set status='hired' where id=$1", [ion]);
assert.equal(await count("select 1 from candidates where status='hired'"), 1);

// ---- Etichete: RLS ----
const t1 = (await one("insert into tags (organization_id, name, color) values ($1,'Remote','success') returning id", [org1])).id;
const t2 = (await one("insert into tags (organization_id, name) values ($1,'Relocare') returning id", [org1])).id;
await assert.rejects(db.query("insert into tags (organization_id, name) values ($1,' remote ')", [org1]), /tags_org_name/); // unic, fără diferențe de majuscule/spații
await assert.rejects(db.query("insert into tags (organization_id, name, color) values ($1,'X','#ff0000')", [org1])); // doar tokeni
await assert.rejects(db.query("insert into tags (organization_id, name) values ($1,'')", [org1]));
await assert.rejects(db.query("insert into tags (organization_id, name) values ($1,'Intrus')", [org2])); // altă organizație
await db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3),($1,$2,$4)", [org1, ana, t1, t2]);
await assert.rejects(db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3)", [org1, ana, t1])); // dublură
// FK compus: nici eticheta, nici candidatul altei organizații nu pot fi legate
await assert.rejects(db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3)", [org1, ion, tag2]));
await assert.rejects(db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3)", [org1, strain, t1]));

// ---- Vederea reconstruită: coloanele vechi + duplicate_of + tags ----
const ov = await one("select * from candidate_overview where id=$1", [ana]);
for (const col of ["name", "email", "phone", "location", "file_name", "status", "parsing_status", "created_at", "search_tsv",
  "last_role", "last_company", "seniority", "years_experience", "skills", "duplicate_of", "tags"]) {
  assert.ok(col in ov, `lipsește coloana ${col}`);
}
assert.equal(ov.last_role, "QA Engineer");
assert.deepEqual(ov.skills, ["cypress"]);
assert.deepEqual(ov.tags.map((t) => t.name), ["Relocare", "Remote"]);
assert.equal(ov.tags.find((t) => t.name === "Remote").color, "success");
assert.deepEqual((await one("select tags from candidate_overview where id=$1", [ion])).tags, []);
assert.equal(ov.duplicate_of, null);
assert.equal((await one("select duplicate_of from candidate_overview where id=$1", [ion])).duplicate_of, ana);
// filtrul după etichetă (cel din candidatesQuery): tags @> [{id}]
const byTag = (id) => count("select 1 from candidate_overview where tags @> $1::jsonb", [JSON.stringify([{ id }])]);
assert.equal(await byTag(t1), 1);
assert.equal(await byTag(tag2), 0);

// ---- Viewer: citește, dar nu modifică etichetele ----
await as("authenticated", V);
assert.equal(await count("select 1 from tags"), 2);
assert.equal((await one("select jsonb_array_length(tags) n from candidate_overview where id=$1", [ana])).n, 2);
await assert.rejects(db.query("insert into tags (organization_id, name) values ($1,'Viewer')", [org1]));
assert.equal((await db.query("delete from candidate_tags where candidate_id=$1", [ana])).affectedRows, 0);
await assert.rejects(db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3)", [org1, ion, t1]));
assert.equal((await db.query("update tags set name='Hack' where id=$1", [t1])).affectedRows, 0);

// ---- Altă organizație și anonim nu văd nimic ----
await as("authenticated", B);
assert.equal(await count("select 1 from tags where organization_id <> $1", [org2]), 0);
assert.equal(await count("select 1 from candidate_tags"), 0);
assert.equal((await db.query("delete from tags where id=$1", [t1])).affectedRows, 0);
assert.deepEqual((await one("select tags from candidate_overview where id=$1", [strain])).tags, []);
await as("anon");
assert.equal(await count("select 1 from tags"), 0);
assert.equal(await count("select 1 from candidate_tags"), 0);
assert.equal(await count("select 1 from saved_filters"), 0);

// ---- Filtre salvate: personale ----
await as("authenticated", A);
await db.query(`insert into saved_filters (organization_id, name, params) values ($1,'Seniori QA','{"q":"qa","min_years":"5"}')`, [org1]);
assert.equal((await one("select user_id from saved_filters")).user_id, A); // default auth.uid()
await assert.rejects(db.query(`insert into saved_filters (organization_id, name, params) values ($1,' seniori qa ','{}')`, [org1]), /saved_filters_user_name/);
await assert.rejects(db.query(`insert into saved_filters (organization_id, name, params) values ($1,'Lista','[]')`, [org1])); // params = obiect
await assert.rejects(db.query(`insert into saved_filters (organization_id, name, user_id, params) values ($1,'Pe numele lui B',$2,'{}')`, [org1, B])); // nu în numele altuia
await assert.rejects(db.query(`insert into saved_filters (organization_id, name) values ($1,'Intrus')`, [org2])); // nu într-o organizație străină

await as("authenticated", V); // viewer-ul își poate avea propriile filtre, dar nu le vede pe ale lui A
assert.equal(await count("select 1 from saved_filters"), 0);
await db.query(`insert into saved_filters (organization_id, name, params) values ($1,'Seniori QA','{"status":"hired"}')`, [org1]); // același nume, alt user: ok
assert.equal(await count("select 1 from saved_filters"), 1);
assert.equal((await db.query("delete from saved_filters where user_id=$1", [A])).affectedRows, 0);
assert.equal((await db.query("update saved_filters set name='x' where user_id=$1", [A])).affectedRows, 0);

await as("authenticated", B);
assert.equal(await count("select 1 from saved_filters"), 0);

// ---- Cascade: ștergerea etichetei / candidatului curăță legăturile ----
await as("authenticated", A);
assert.equal((await db.query("delete from tags where id=$1", [t2])).affectedRows, 1);
assert.equal((await one("select jsonb_array_length(tags) n from candidate_overview where id=$1", [ana])).n, 1);
await db.query("delete from candidates where id=$1", [ana]);
await su();
assert.equal(await count("select 1 from candidate_tags"), 0);
assert.equal((await one("select duplicate_of from candidates where id=$1", [ion])).duplicate_of, null); // originalul a dispărut

console.log("OK: etape noi, tranziții de status, etichete + RLS, filtre salvate + RLS, vederea candidate_overview");
