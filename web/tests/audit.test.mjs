// Jurnal de activitate + retenție GDPR: triggere, imutabilitate, izolare RLS, purge și erase.
import assert from "assert";
import { db, A, B, one, count, as, su } from "./_pglite.mjs";

const org1 = (await one("select id from organizations where name = 'Compania'")).id;
const org2 = (await one("insert into organizations (name) values ('Alta') returning id")).id;
await db.query("insert into auth.users values ($1,'a@x.ro'),($2,'b@x.ro')", [A, B]);
await db.query("insert into memberships (organization_id,user_id) values ($1,$2),($3,$4)", [org1, A, org2, B]);
const feed = (org, args = {}) =>
  db.query("select * from audit_feed($1, $2, $3, $4, $5)", [org, args.entity ?? null, args.actor ?? null, args.from ?? null, args.to ?? null]);

// ---- Triggerele scriu rânduri, cu actorul din auth.uid() ----
await as("authenticated", A);
const cand = await one("insert into candidates (organization_id, file_name, cv_url) values ($1, 'CV Ion.pdf', $2) returning id", [org1, `${org1}/ion.pdf`]);
let ins = await one("select * from audit_log where entity_id = $1 and action = 'insert'", [cand.id]);
assert.equal(ins.actor_id, A);
assert.equal(ins.entity_type, "candidates");
assert.deepEqual(ins.changes.file_name, { redacted: true });
assert.equal(ins.changes.status.new, "new");

// ---- Parserul (service_role): actor null, parsed_text nu ajunge în jurnal, PII e redactat ----
await as("service_role");
await db.query("update candidates set name='Ion Popescu', email='ion@ex.ro', parsed_text=$2, parsing_status='parsed' where id=$1", [cand.id, "x".repeat(50000)]);
const upd = await one("select * from audit_log where entity_id = $1 and action = 'update'", [cand.id]);
assert.equal(upd.actor_id, null);
assert.deepEqual(Object.keys(upd.changes).sort(), ["email", "name", "parsing_status"]);
assert.deepEqual(upd.changes.parsing_status, { old: "pending", new: "parsed" });
assert.ok(!JSON.stringify(upd.changes).includes("Ion Popescu") && !JSON.stringify(upd.changes).includes("xxxx"));
// Update fără diferențe relevante (doar updated_at / parsed_text) nu scrie nimic.
const before = await count("select 1 from audit_log");
await db.query("update candidates set parsed_text='altceva' where id=$1", [cand.id]);
assert.equal(await count("select 1 from audit_log"), before);

// Valorile lungi se trunchiază la 200 de caractere.
await db.query("update candidates set parse_error=$2 where id=$1", [cand.id, "e".repeat(5000)]);
const long = await one("select changes from audit_log where entity_id=$1 and changes ? 'parse_error' and action = 'update'", [cand.id]);
assert.equal(long.changes.parse_error.new.length, 200);

// ---- Notele și experiențele: conținutul nu apare în jurnal ----
await as("authenticated", A);
await db.query("insert into candidate_notes (organization_id, candidate_id, body) values ($1,$2,'secret medical')", [org1, cand.id]);
await su();
assert.equal(await count("select 1 from audit_log where entity_type = 'candidate_notes' and changes::text like '%secret%'"), 0);
assert.equal(await count("select 1 from audit_log where entity_type = 'candidate_notes' and action = 'insert'"), 1);
// Membrii: schimbarea de rol e vizibilă
await db.query("update memberships set role = 'viewer' where user_id = $1", [A]);
assert.deepEqual((await one("select changes->'role' r from audit_log where entity_type='memberships' and action='update'")).r, { old: "admin", new: "viewer" });
await db.query("update memberships set role = 'admin' where user_id = $1", [A]);

// ---- Imutabil: nici userii, nici superuserul nu pot modifica/șterge ----
await as("authenticated", A);
assert.equal((await db.query("update audit_log set action = 'x'")).affectedRows, 0); // RLS: fără politică de update
assert.equal((await db.query("delete from audit_log")).affectedRows, 0);
await assert.rejects(db.query("insert into audit_log (organization_id, action, entity_type) values ($1,'insert','x')", [org1]));
await su();
await assert.rejects(db.query("update audit_log set action = 'x'"), /doar pentru adăugare/);
await assert.rejects(db.query("delete from audit_log"), /doar pentru adăugare/);
await assert.rejects(db.query("truncate audit_log"), /doar pentru adăugare/);

// ---- Izolare RLS + funcția de citire ----
await as("authenticated", A);
assert.ok((await feed(org1)).rows.length > 3);
const all = (await feed(org1)).rows;
assert.ok(all.every((r) => Number(r.total) === all.length));
assert.equal((await feed(org1, { entity: "candidate_notes" })).rows[0].actor_email, "a@x.ro");
assert.equal((await feed(org1, { actor: A })).rows.every((r) => r.actor_id === A), true);
assert.equal((await feed(org1, { from: "2999-01-01" })).rows.length, 0);
assert.equal((await feed(org2)).rows.length, 0); // A nu e membru în org2
await as("authenticated", B);
assert.equal(await count("select 1 from audit_log where organization_id = $1", [org1]), 0);
assert.equal((await feed(org1)).rows.length, 0);
await assert.rejects(db.query("select audit_event($1,'export','candidates',null)", [org1]), /Acces interzis/);
await as("anon");
assert.equal(await count("select 1 from audit_log"), 0);

// ---- Export: audit_event acceptă doar „export" ----
await as("authenticated", A);
await db.query("select audit_event($1,'export','candidates',$2)", [org1, cand.id]);
await assert.rejects(db.query("select audit_event($1,'delete','candidates',null)", [org1]), /necunoscută/);
assert.equal(await count("select 1 from audit_log where action = 'export' and actor_id = $1", [A]), 1);

// ---- Retenția: doar adminii o schimbă; purge șterge doar ce e mai vechi ----
await assert.rejects(db.query("select set_retention($1, 0)", [org1])); // check 1..120
await db.query("select set_retention($1, 12)", [org1]);
assert.deepEqual((await one("select changes->'retention_months' r from audit_log where entity_type='organizations' and action='update'")).r, { new: "12" });
await su();
const old = await one("insert into candidates (organization_id, cv_url, preview_path, created_at) values ($1,$2,$3, now() - interval '13 months') returning id", [org1, `${org1}/old.docx`, `${org1}/old.pdf`]);
await db.query("insert into candidates (organization_id, cv_url, created_at) values ($1,$2, now() - interval '11 months')", [org1, `${org1}/new.pdf`]);
await as("authenticated", B);
await assert.rejects(db.query("select * from purge_expired_candidates($1)", [org1]), /Doar adminii/);
await as("authenticated", A);
const purged = (await db.query("select * from purge_expired_candidates($1)", [org1])).rows;
assert.deepEqual(purged.map((r) => [r.candidate_id, r.files]), [[old.id, [`${org1}/old.docx`, `${org1}/old.pdf`]]]);
assert.equal(await count("select 1 from candidates where cv_url like $1", ["%/new.pdf"]), 1);
assert.deepEqual((await one("select changes from audit_log where action = 'purge'")).changes, { deleted: 1, retention_months: 12 });
assert.equal((await db.query("select * from purge_expired_candidates($1)", [org1])).rows.length, 0); // idempotent
// Fără retenție setată nu se șterge nimic
await db.query("select set_retention($1, null)", [org1]);
assert.equal((await db.query("select * from purge_expired_candidates($1)", [org1])).rows.length, 0);
assert.equal(await count("select 1 from candidates where cv_url like $1", ["%/new.pdf"]), 1);

// ---- GDPR erase: șterge candidatul în cascadă, întoarce fișierele, lasă urmă fără PII ----
await su();
await db.query("insert into candidate_experiences (organization_id, candidate_id, position, company_name, role_title) values ($1,$2,0,'Acme','Dev')", [org1, cand.id]);
await as("authenticated", B);
await assert.rejects(db.query("select erase_candidate($1)", [cand.id]), /Doar adminii/);
await as("authenticated", A);
assert.deepEqual((await one("select erase_candidate($1) f", [cand.id])).f, [`${org1}/ion.pdf`]);
await assert.rejects(db.query("select erase_candidate($1)", [cand.id]), /inexistent/);
assert.equal(await count("select 1 from candidates where id = $1", [cand.id]), 0);
assert.equal(await count("select 1 from candidate_experiences where candidate_id = $1", [cand.id]), 0);
assert.equal(await count("select 1 from audit_log where action = 'erase' and entity_id = $1", [cand.id]), 1);
await su();
assert.equal(await count("select 1 from audit_log where changes::text ~ 'Ion|Acme|Popescu|secret|ion@'"), 0); // nicio urmă PII

// ---- Tabelele create ulterior se atașează cu audit_attach, idempotent ----
await db.exec("create table zz_late (id uuid primary key default gen_random_uuid(), organization_id uuid not null, label text)");
assert.equal((await one("select audit_attach('zz_late') ok")).ok, true);
assert.equal((await one("select audit_attach('nu_exista') ok")).ok, false);
await db.exec("select audit_attach_all(); select audit_attach_all();"); // fără erori la rulări repetate
await db.query("insert into zz_late (organization_id, label) values ($1,'senior')", [org1]);
assert.equal((await one("select changes->'label'->>'new' l from audit_log where entity_type = 'zz_late'")).l, "senior");
// Tabelele altor workstream-uri (tags etc.) există deja la momentul migrării și sunt atașate
for (const t of ["tags", "candidate_tags", "saved_filters"]) {
  if ((await one("select to_regclass($1) r", ["public." + t])).r)
    assert.equal(await count("select 1 from pg_trigger where tgname = 'audit_row' and tgrelid = $1::regclass", ["public." + t]), 1, t);
}

console.log("OK: audit (triggere, redactare, imutabil, izolare), retenție, purge, erase");
