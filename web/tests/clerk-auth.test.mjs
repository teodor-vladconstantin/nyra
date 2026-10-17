// Clerk: identitatea vine din token (sub text + email). Verifică RLS pe sub text, create_organization, sync_user
// (preluarea contului Supabase Auth vechi după email din token), imposibilitatea de a scrie profiles din client și audit.
import assert from "assert";
import { db, one, count, as, su } from "./_pglite.mjs";

const LEGACY = "00000000-0000-0000-0000-0000000000aa";
const org1 = (await one("select id from organizations where name = 'Compania'")).id;

// Cont vechi (Supabase Auth) cu membership admin, o notă, un filtru salvat și un rând în jurnal.
await db.query("insert into auth.users values ($1, 'Nyra@Joben.eu')", [LEGACY]);
await db.query("insert into memberships (organization_id, user_id, role) values ($1, $2, 'admin')", [org1, LEGACY]);
const cand = (await one("insert into candidates (organization_id, file_name, cv_url) values ($1,'a.pdf',$2) returning id", [org1, `${org1}/a.pdf`])).id;
await db.query("insert into candidate_notes (organization_id, candidate_id, body, author_id) values ($1,$2,'veche',$3)", [org1, cand, LEGACY]);
await db.query("insert into saved_filters (organization_id, user_id, name) values ($1,$2,'F')", [org1, LEGACY]);
await db.query("insert into audit_log (organization_id, actor_id, action, entity_type) values ($1,$2,'insert','candidates')", [org1, LEGACY]);

// ---- Utilizator Clerk fără membership: nu vede nimic; sync_user nu preia contul altcuiva ----
await as("authenticated", "user_evil", "evil@x.ro");
assert.equal(await count("select 1 from candidates"), 0);
await db.query("select sync_user()");
assert.equal(await count("select 1 from memberships"), 0, "email diferit: nu preia contul vechi");
await assert.rejects(db.query("insert into profiles (user_id, email) values ('user_evil','nyra@joben.eu')"), "profiles nu se scrie din client");
await db.query("update profiles set email = 'nyra@joben.eu' where user_id = 'user_evil'"); // fără politică de update: 0 rânduri
assert.equal((await one("select email from profiles where user_id = 'user_evil'")).email, "evil@x.ro");

// Fără email în token: refuz clar
await as("authenticated", "user_noemail", "");
await assert.rejects(db.query("select sync_user()"), /lipseste/);

// ---- Preluarea contului vechi: același email (case-insensitive) din token ----
await as("authenticated", "user_nyra", "nyra@joben.eu");
await db.query("select sync_user()");
await db.query("select sync_user()"); // idempotent
assert.equal((await one("select role from memberships where user_id = 'user_nyra'")).role, "admin");
assert.equal(await count("select 1 from memberships where user_id = $1", [LEGACY]), 0);
assert.equal(await count("select 1 from candidate_notes where author_id = 'user_nyra'"), 1);
assert.equal(await count("select 1 from saved_filters where user_id = 'user_nyra'"), 1);
assert.equal(await count("select 1 from candidates"), 1, "vede datele organizației");

// RLS pe sub text: admin scrie, nota nouă are autor = sub, jurnalul îl reține
await db.query("insert into candidate_notes (organization_id, candidate_id, body) values ($1,$2,'nouă')", [org1, cand]);
assert.equal(await count("select 1 from candidate_notes where author_id = 'user_nyra' and body = 'nouă'"), 1);
await su();
assert.equal(await count("select 1 from audit_log where actor_id = 'user_nyra' and entity_type = 'candidate_notes' and action = 'insert'"), 1);

// Istoricul vechi rămâne intact, iar emailul actorului vechi se rezolvă prin auth.users
await as("authenticated", "user_nyra", "nyra@joben.eu");
const feed = (await db.query("select actor_id, actor_email from audit_feed($1)", [org1])).rows;
assert.ok(feed.some((r) => r.actor_id === LEGACY && r.actor_email === "Nyra@Joben.eu"));
assert.ok(feed.some((r) => r.actor_id === "user_nyra" && r.actor_email === "nyra@joben.eu"));
const members = (await db.query("select user_id, email from org_members($1)", [org1])).rows;
assert.deepEqual(members, [{ user_id: "user_nyra", email: "nyra@joben.eu" }]);

// ---- create_organization: o singură dată, anon nu poate, profilul apare, izolare între organizații ----
await as("authenticated", "user_new", "nou@x.ro");
const newOrg = (await one("select create_organization('  Firma Nouă ') id")).id;
await assert.rejects(db.query("select create_organization('Alta')"), /deja o organiza/);
assert.equal((await one("select name from organizations where id = $1", [newOrg])).name, "Firma Nouă");
assert.equal(await count("select 1 from memberships where user_id = 'user_new' and role = 'admin'"), 1);
assert.equal(await count("select 1 from candidates"), 0, "altă organizație nu vede candidații Compania");
await db.query("insert into jobs (organization_id, title) values ($1,'J')", [newOrg]);
await assert.rejects(db.query("insert into jobs (organization_id, title) values ($1,'X')", [org1]));
await assert.rejects(db.query("select create_organization('')"), /1 si 120|deja/);
// profil vizibil doar în aceeași organizație
assert.equal(await count("select 1 from profiles where user_id = 'user_nyra'"), 0);
assert.equal(await count("select 1 from profiles where user_id = 'user_new'"), 1);
await as("authenticated", "user_nyra", "nyra@joben.eu");
assert.equal(await count("select 1 from profiles where user_id = 'user_new'"), 0);

await as("anon");
await assert.rejects(db.query("select sync_user()"));
await assert.rejects(db.query("select create_organization('x')"));
await su();
console.log("OK: clerk-auth");
