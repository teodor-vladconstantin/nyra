// Încredere în date (migrarea data_trust): find_duplicates, merge_candidates, marcajul „editat manual”, RLS.
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

const groups = async (org) => (await db.query("select kind, candidate_ids from find_duplicates($1) order by kind", [org])).rows;
const cand = async (name, o) => (await one(
  `insert into candidates (organization_id, name, email, phone, content_hash, created_at, status)
   values ($1,$2,$3,$4,$5,$6,$7) returning id`,
  [o.org ?? org1, name, o.email ?? null, o.phone ?? null, o.hash ?? null, o.at, o.status ?? "new"])).id;
const H = "a".repeat(64);

// ---- Setup ca parser/service: c1 original, c2 același fișier, c3 același email+telefon (formate diferite), c4 unic ----
await as("service_role");
const c1 = await cand("Maria Pop", { email: "Maria@ex.ro", phone: "0722 123 456", hash: H, at: "2026-01-01", status: "shortlisted" });
const c2 = await cand("Maria Pop (copie)", { hash: H, at: "2026-01-02" });
const c3 = await cand(null, { email: " maria@EX.ro ", phone: "+40 722-123-456", at: "2026-01-03", status: "rejected" });
const c4 = await cand("Ion Unic", { email: "ion@ex.ro", phone: "12345", at: "2026-01-04" });
const c9 = await cand("Alt Org", { org: org2, email: "maria@ex.ro", hash: H, at: "2026-01-05" });

// duplicate_of = cel mai vechi potrivit; originalul și unicul rămân null; altă organizație nu se amestecă
const dups = Object.fromEntries((await db.query("select id, duplicate_of from candidates")).rows.map((r) => [r.id, r.duplicate_of]));
assert.deepEqual([dups[c1], dups[c2], dups[c3], dups[c4], dups[c9]], [null, c1, c1, null, null]);

// ---- find_duplicates: hash, email normalizat, telefon normalizat; c3 se potrivește și fără content_hash ----
await as("authenticated", A);
const g = await groups(org1);
assert.deepEqual(g.map((r) => r.kind), ["email", "hash", "phone"]);
assert.deepEqual(g.find((r) => r.kind === "hash").candidate_ids, [c1, c2]);
assert.deepEqual(g.find((r) => r.kind === "email").candidate_ids, [c1, c3]);
assert.deepEqual(g.find((r) => r.kind === "phone").candidate_ids, [c1, c3]);
assert.equal(await count("select 1 from candidate_duplicates($1)", [c2]), 1);
assert.equal(await count("select 1 from candidate_duplicates($1)", [c4]), 0); // telefon scurt nu se potrivește

// ---- RLS: altă organizație nu vede nimic, viewerul vede dar nu poate îmbina ----
await as("authenticated", B);
assert.equal((await groups(org1)).length, 0);
assert.equal(await count("select 1 from candidate_duplicates($1)", [c1]), 0);
assert.equal((await groups(org2)).length, 0); // c9 e singurul din org2
await assert.rejects(db.query("select merge_candidates($1,$2)", [c1, c3]), /merge_not_found/);
await as("authenticated", V);
assert.equal((await groups(org1)).length, 3);
await assert.rejects(db.query("select merge_candidates($1,$2)", [c1, c3]), /merge_forbidden/);
await as("anon");
await assert.rejects(db.query("select merge_candidates($1,$2)", [c1, c3]), /permission denied/);
await su();
assert.equal(await count("select 1 from candidates where id = any($1)", [[c1, c3]]), 2); // nimic nu s-a schimbat

// ---- Marcaj „editat manual”: parserul nu marchează, utilizatorul da ----
await as("service_role");
await db.query(`insert into candidate_experiences (organization_id, candidate_id, position, company_name, role_title, start_date) values
  ($1,$2,0,'Acme','Developer','2020-01-01'),
  ($1,$3,0,'ACME ','developer','2020-01-01'),
  ($1,$3,1,'Beta','Tester','2018-01-01')`, [org1, c1, c3]);
await db.query(
  `insert into candidate_notes (organization_id, candidate_id, body, author_id, created_at)
   values ($1,$2,'Sunat',$4,now()),($1,$3,'Sunat',$4,now()),($1,$3,'Disponibil din martie',$4,now())`,
  [org1, c1, c3, A],
);
assert.equal(await count("select 1 from candidate_experiences where edited_manually"), 0);
assert.equal(await count("select 1 from candidates where edited_manually"), 0);
await as("authenticated", A);
await db.query("update candidates set location='Cluj' where id=$1", [c1]);
assert.equal((await one("select edited_manually from candidates where id=$1", [c1])).edited_manually, true);
await db.query("update candidates set status='to_contact' where id=$1", [c4]); // statusul nu e editare de date
assert.equal((await one("select edited_manually from candidates where id=$1", [c4])).edited_manually, false);
const added = await one(
  "insert into candidate_experiences (organization_id, candidate_id, company_name, role_title) values ($1,$2,'Nou','Rol') returning edited_manually",
  [org1, c4],
);
assert.equal(added.edited_manually, true);
await db.query("update candidate_experiences set seniority_level='senior' where candidate_id=$1 and company_name='Beta'", [c3]);
assert.equal((await one("select edited_manually from candidate_experiences where company_name='Beta'")).edited_manually, true);
assert.equal((await one("select edited_manually from candidate_experiences where company_name='Acme'")).edited_manually, false);
await as("service_role");
await db.query("update candidate_experiences set description='re-parse' where company_name='Nou'");
assert.equal((await one("select edited_manually from candidate_experiences where company_name='Nou'")).edited_manually, true); // rămâne marcat

// ---- Îmbinare c3 -> c1 ----
await as("authenticated", A);
await assert.rejects(db.query("select merge_candidates($1,$1)", [c1]), /merge_same_candidate/);
await assert.rejects(db.query("select merge_candidates($1,$2)", [c1, c9]), /merge_not_found/); // altă organizație
await db.query("update candidates set cv_url=$2, preview_path=$3 where id=$1", [c3, `${org1}/c3.docx`, `${org1}/c3.pdf`]);
const res = (await one("select merge_candidates($1,$2) r", [c1, c3])).r;
assert.equal(res.experiences, 1); // Acme există deja (comparat fără majuscule/spații), Beta se mută
assert.equal(res.notes, 1); // „Sunat” există deja, „Disponibil din martie” se copiază
assert.deepEqual(res.files, [`${org1}/c3.docx`, `${org1}/c3.pdf`]);
assert.equal(await count("select 1 from candidates where id=$1", [c3]), 0);
const exps = (await db.query("select company_name, position from candidate_experiences where candidate_id=$1 order by position", [c1])).rows;
assert.deepEqual(exps, [{ company_name: "Acme", position: 0 }, { company_name: "Beta", position: 1 }]);
const notes = (await db.query("select body, author_id from candidate_notes where candidate_id=$1 order by body", [c1])).rows;
assert.deepEqual(notes, [{ body: "Disponibil din martie", author_id: A }, { body: "Sunat", author_id: A }]);
assert.deepEqual(await one("select status, name, email from candidates where id=$1", [c1]), { status: "shortlisted", name: "Maria Pop", email: "Maria@ex.ro" });
assert.deepEqual((await groups(org1)).map((r) => r.kind), ["hash"]); // c2 are încă același hash; c3 a dispărut din grupuri

// ---- Primarul fără nume îl preia pe cel din secondary; duplicate_of al celorlalți se repointează ----
const d1 = await cand(null, { email: "d@ex.ro", at: "2026-02-01" });
const d2 = await cand("Dan Dinu", { email: "d@ex.ro", at: "2026-02-02" });
const d3 = await cand("Dan D.", { email: "d@ex.ro", at: "2026-02-03" });
await db.query("update candidates set duplicate_of=$2 where id=$1", [d3, d2]);
await db.query("select merge_candidates($1,$2)", [d1, d2]);
assert.equal((await one("select duplicate_of from candidates where id=$1", [d3])).duplicate_of, d1);
assert.equal((await one("select name from candidates where id=$1", [d1])).name, "Dan Dinu");

// ---- Validarea formularelor de editare (lib/experience.ts, rulat direct de Node) ----
const { validateContact, validateExperience, parseSkills } = await import("../lib/experience.ts");
const form = (o) => Object.entries(o).reduce((f, [k, v]) => (f.set(k, v), f), new FormData());
assert.deepEqual(validateContact(form({ name: " Ana ", email: "ANA@Ex.ro", phone: "+40 722 123 456", location: "" })).value,
  { name: "Ana", email: "ana@ex.ro", phone: "+40 722 123 456", location: null });
assert.deepEqual(Object.keys(validateContact(form({ email: "nu-e-email", phone: "abc" })).errors), ["email", "phone"]);
assert.deepEqual(parseSkills("Python, python;SQL\n  , Docker"), ["Python", "SQL", "Docker"]);
const exp = validateExperience(form({ company_name: "Acme", role_title: "Dev", start_date: "2020-02-30", employment_type: "x" }));
assert.deepEqual(Object.keys(exp.errors).sort(), ["employment_type", "start_date"]);
assert.equal(validateExperience(form({ company_name: "A", role_title: "B", start_date: "2021-01-01", end_date: "2020-01-01" })).errors.end_date.length > 0, true);
const okExp = validateExperience(form({ company_name: "A", role_title: "B", start_date: "2020-01-01", end_date: "2021-01-01", current: "on", seniority_level: "senior" }));
assert.deepEqual([okExp.ok, okExp.value.end_date, okExp.value.seniority_level], [true, null, "senior"]); // „actual” ignoră data de final

console.log("OK: find_duplicates (hash/email/telefon), duplicate_of, îmbinare, editat manual, RLS (viewer, altă organizație, anon)");

// ---- Review: org_members, cv_url legat de organizație, merge păstrează etichetele ----
await as("authenticated", A);
assert.ok((await db.query("select * from org_members($1)", [org1])).rows.some((r) => r.user_id === A));
await as("authenticated", B);
assert.equal((await db.query("select * from org_members($1)", [org1])).rows.length, 0); // nemembru
await su();
await assert.rejects(db.query("update candidates set cv_url=$2 where id=$1", [c1, `${org2}/x.pdf`]), /candidates_cv_url_org/);
await assert.rejects(db.query("update candidates set preview_path=$2 where id=$1", [c1, `${org1}/../${org2}/x.pdf`]), /candidates_preview_path_org/);
const tg = (await one("insert into tags (organization_id, name) values ($1,'Remote') returning id", [org1])).id;
const tg2 = (await one("insert into tags (organization_id, name) values ($1,'Relocare') returning id", [org1])).id;
await db.query("insert into candidate_tags (organization_id, candidate_id, tag_id) values ($1,$2,$3),($1,$4,$3),($1,$4,$5)", [org1, c1, tg, c4, tg2]);
await as("authenticated", A);
await db.query("select merge_candidates($1,$2)", [c1, c4]);
assert.deepEqual((await db.query("select tag_id from candidate_tags where candidate_id=$1 order by tag_id", [c1])).rows.map((r) => r.tag_id).sort(), [tg, tg2].sort());
