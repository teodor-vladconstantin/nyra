// Retenție automată, ștergere de cont, cereri ale candidaților, nota organizației și public_job cu datele de informare.
import assert from "assert";
import { db, one, count, as, su } from "./_pglite.mjs";

const A = "user_comp_a", B = "user_comp_b";
await as("authenticated", A, "a@x.ro");
const idA = (await one("select create_organization('Firma A') id")).id;
await as("authenticated", B, "b@x.ro");
const idB = (await one("select create_organization('Firma B') id")).id;

// Organizațiile noi au retenție 12 luni; nota se setează doar de admin.
await su();
assert.equal((await one("select retention_months from organizations where id = $1", [idA])).retention_months, 12);
await as("authenticated", A, "a@x.ro");
await db.query("select set_notice_settings($1, 'dpo@firma.ro', 'https://firma.ro/confidentialitate')", [idA]);
await assert.rejects(db.query("select set_notice_settings($1, 'x@y.ro', null)", [idB]), /Doar adminii/);
await assert.rejects(db.query("select set_notice_settings($1, 'nu-e-email', null)", [idA]));
await assert.rejects(db.query("select set_notice_settings($1, null, 'http://nesigur.ro')", [idA]));

// public_job întoarce datele de informare.
await su();
const job = await one("insert into jobs (organization_id, title, public_apply) values ($1, 'Dev', true) returning id", [idA]);
await as("anon");
const pj = await one("select * from public_job($1)", [job.id]);
assert.deepEqual([pj.company, pj.retention_months, pj.privacy_email, pj.notice_url], ["Firma A", 12, "dpo@firma.ro", "https://firma.ro/confidentialitate"]);

// Cereri: doar service_role scrie; membrii citesc, adminul marchează rezolvat; alte organizații nu văd.
await assert.rejects(db.query("insert into candidate_requests (organization_id, kind, email) values ($1,'erasure','c@x.ro')", [idA]));
await su();
await db.query("insert into candidate_requests (organization_id, kind, email, message) values ($1,'erasure','c@x.ro','sterge-ma')", [idA]);
await as("authenticated", B, "b@x.ro");
assert.equal(await count("select 1 from candidate_requests"), 0, "alt tenant nu vede");
await as("authenticated", A, "a@x.ro");
assert.equal(await count("select 1 from candidate_requests"), 1);
await db.query("update candidate_requests set handled_at = now()");
assert.equal(await count("select 1 from candidate_requests where handled_at is not null"), 1);
// (grantul pe coloană, doar handled_at, nu se poate testa aici: helperul dă `grant all` după migrări)

// Retenție automată: candidați peste termen, leads peste 12 luni, cereri rezolvate vechi, jurnal peste 24 de luni.
await su();
const old = await one("insert into candidates (organization_id, cv_url, preview_path, created_at) values ($1,$2,$3, now() - interval '13 months') returning id", [idA, `${idA}/old.pdf`, `${idA}/old.preview.pdf`]);
await db.query("insert into candidates (organization_id, cv_url, created_at) values ($1,$2, now() - interval '11 months')", [idA, `${idA}/new.pdf`]);
await db.query("insert into candidates (organization_id, cv_url, created_at) values ($1,$2, now() - interval '20 months')", [idB, `${idB}/b-old.pdf`]);
await db.query("update organizations set retention_months = 24 where id = $1", [idB]);
await db.query("insert into leads (kind, email, message, created_at) values ('contact','l@x.ro','salut', now() - interval '13 months'), ('contact','n@x.ro','nou', now())");
await db.query("update candidate_requests set handled_at = now() - interval '13 months'");
await db.query("alter table audit_log disable trigger audit_log_immutable");
await db.query("insert into audit_log (organization_id, action, entity_type, created_at) values ($1,'insert','x', now() - interval '25 months')", [idA]);
await db.query("alter table audit_log enable trigger audit_log_immutable");

await as("authenticated", A, "a@x.ro");
await assert.rejects(db.query("select * from purge_expired_all()"), "doar service_role");
await as("anon");
await assert.rejects(db.query("select * from purge_expired_all()"));
await as("service_role");
const purged = (await db.query("select * from purge_expired_all()")).rows;
assert.deepEqual(purged.map((r) => [r.candidate_id, r.files]), [[old.id, [`${idA}/old.pdf`, `${idA}/old.preview.pdf`]]], "doar candidatul de 13 luni din org cu 12 luni");
assert.equal(await count("select 1 from candidates where cv_url like '%/new.pdf'"), 1);
assert.equal(await count("select 1 from candidates where cv_url like '%/b-old.pdf'"), 1, "org B are 24 de luni");
assert.equal(await count("select 1 from leads"), 1);
assert.equal(await count("select 1 from candidate_requests"), 0);
assert.equal(await count("select 1 from audit_log where entity_type = 'x'"), 0, "jurnalul peste 24 de luni se șterge");
assert.equal(await count("select 1 from audit_log where action = 'purge' and (changes->>'automatic')::boolean"), 1);
await assert.rejects(db.query("delete from audit_log"), /doar pentru adăugare/, "fără funcție, jurnalul rămâne imuabil");

// Ștergerea contului: admin fără alți membri; întoarce fișierele; șterge organizația, jurnalul ei și profilul; B nu e afectat.
await su();
await db.query("insert into storage.objects (bucket_id, name) values ('cvs', $1), ('cvs', $2), ('cvs', $3)", [`${idA}/new.pdf`, `${idA}/x.pdf`, `${idB}/b-old.pdf`]);
await as("authenticated", "user_nimeni", "n@x.ro");
await assert.rejects(db.query("select delete_account()"), /admin/);
await su();
await db.query("insert into memberships (organization_id, user_id, role) values ($1, 'user_extra', 'viewer')", [idA]);
await as("authenticated", A, "a@x.ro");
await assert.rejects(db.query("select delete_account()"), /alți membri/);
await su();
await db.query("delete from memberships where user_id = 'user_extra'");
await as("authenticated", A, "a@x.ro");
await db.query("select accept_legal('0.1')");
const files = (await one("select delete_account() f")).f;
assert.deepEqual([...files].sort(), [`${idA}/new.pdf`, `${idA}/x.pdf`]);
await su();
assert.equal(await count("select 1 from organizations where id = $1", [idA]), 0);
assert.equal(await count("select 1 from candidates where organization_id = $1", [idA]), 0);
assert.equal(await count("select 1 from audit_log where organization_id = $1", [idA]), 0, "jurnalul organizației șters, inclusiv rândurile generate de cascadă");
assert.equal(await count("select 1 from profiles where user_id = $1", [A]), 0);
assert.equal(await count("select 1 from organizations where id = $1", [idB]), 1);
assert.equal(await count("select 1 from candidates where organization_id = $1", [idB]), 1);
assert.equal(await count("select 1 from legal_acceptances where user_id = $1", [A]), 3, "dovada acceptării rămâne");
