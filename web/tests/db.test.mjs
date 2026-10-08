// Rulează toate migrările pe Postgres în WASM (PGlite) și verifică starea finală: RLS, storage, căutare, vederea tabelului.
import assert from "assert";
import { db, A, B, one, count, as, su } from "./_pglite.mjs";

// Schema veche a dispărut
for (const t of ["jobs", "applications", "email_log", "consent_records", "terms_versions", "invitations"]) {
  assert.equal((await one("select to_regclass($1) r", [`public.${t}`])).r, null, `${t} ar trebui șters`);
}

const org1 = (await one("select id from organizations where name = 'Compania'")).id;
const org2 = (await one("insert into organizations (name) values ('Alta') returning id")).id;
await db.query("insert into auth.users values ($1,'a@x.ro'),($2,'b@x.ro')", [A, B]);
await db.query("insert into memberships (organization_id,user_id) values ($1,$2),($3,$4)", [org1, A, org2, B]);

// ---- Admin A: upload CV + candidat fără date (vin din parsing) ----
await as("authenticated", A);
await db.query("insert into storage.objects (bucket_id, name) values ('cvs', $1)", [`${org1}/cv.pdf`]);
await assert.rejects(db.query("insert into storage.objects (bucket_id, name) values ('cvs', $1)", [`${org2}/cv.pdf`]));
const cand = (await one("insert into candidates (organization_id, file_name, cv_url) values ($1, 'CV Maria.pdf', $2) returning id, status, parsing_status", [org1, `${org1}/cv.pdf`]));
assert.deepEqual([cand.status, cand.parsing_status], ["new", "pending"]);

// ---- Parserul (service_role) completează datele ----
await as("service_role");
await db.query("update candidates set name='Maria Pop', email='maria@ex.ro', location='Cluj-Napoca', parsed_text='Backend developer', extracted_keywords='{\"skills\":[\"Docker\"]}' where id=$1", [cand.id]);
await db.query(`insert into candidate_experiences (organization_id, candidate_id, position, company_name, role_title, start_date, end_date, seniority_level, extracted_skills, description) values
  ($1,$2,0,'Acme București','Backend Developer','2022-01-01',null,'senior','["Python","PostgreSQL"]','API-uri'),
  ($1,$2,1,'Beta','Developer','2020-01-01','2022-06-30','mid','["Java"]',''),
  ($1,$2,2,'Gamma','Junior Developer','2021-01-01','2021-12-31','junior','["python"]','')`, [org1, cand.id]);

// ---- Vederea tabelului + căutare ----
await as("authenticated", A);
const ov = await one("select name, last_role, last_company, seniority, years_experience, skills, location from candidate_overview where id=$1", [cand.id]);
assert.equal(ov.last_role, "Backend Developer");
assert.equal(ov.seniority, "senior");
assert.equal(ov.location, "Cluj-Napoca");
const expectedYears = Math.round(((Date.now() - Date.UTC(2020, 0, 1)) / 864e5 / 365.25) * 10) / 10;
assert.ok(Math.abs(Number(ov.years_experience) - expectedYears) <= 0.1, `ani ${ov.years_experience} vs ${expectedYears}`);
assert.deepEqual([...ov.skills].sort(), ["docker", "java", "postgresql", "python"]); // skill-uri pe rol + globale
const search = (q) => db.query("select id from candidate_overview where search_tsv @@ websearch_to_tsquery('simple', nyra_normalize($1))", [q]);
assert.equal((await search("bucuresti")).rows.length, 1);
assert.equal((await search("cluj")).rows.length, 1);
assert.equal((await search("maria")).rows.length, 1);
assert.equal((await search("kubernetes")).rows.length, 0);

// ---- Status + note ----
await db.query("update candidates set status='shortlisted' where id=$1", [cand.id]);
assert.equal((await one("select status from candidate_overview where id=$1", [cand.id])).status, "shortlisted");
await db.query("insert into candidate_notes (organization_id, candidate_id, body) values ($1,$2,'De sunat luni')", [org1, cand.id]);
assert.equal((await one("select author_id from candidate_notes")).author_id, A);

// ---- Izolare: B (altă organizație) și anonim nu văd nimic ----
await as("authenticated", B);
assert.equal(await count("select 1 from candidate_overview"), 0);
assert.equal(await count("select 1 from candidate_notes"), 0);
assert.equal(await count("select 1 from storage.objects"), 0);
assert.equal(await count("select 1 from organizations"), 1);
assert.equal((await db.query("update candidates set status='rejected' where id=$1", [cand.id])).affectedRows, 0);
await as("anon");
assert.equal(await count("select 1 from candidates"), 0);
assert.equal(await count("select 1 from organizations"), 0);
await assert.rejects(db.query("insert into storage.objects (bucket_id, name) values ('cvs', $1)", [`${org1}/x.pdf`]));

// ---- Ștergerea candidatului curăță experiențele și notele ----
await as("authenticated", A);
await db.query("delete from candidates where id=$1", [cand.id]);
await su();
assert.equal(await count("select 1 from candidate_experiences"), 0);
assert.equal(await count("select 1 from candidate_notes"), 0);

console.log("OK: migrări, schema veche ștearsă, upload, vederea tabelului, căutare, status, note, izolare");
