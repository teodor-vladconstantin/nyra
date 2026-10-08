// Fiabilitate parsing (migrarea parse_reliability): coloane, valori implicite, indexul de sweep, claim condiționat ca în serviciu.
import assert from "assert";
import { db, one, count, as } from "./_pglite.mjs";

const org = (await one("select id from organizations where name = 'Compania'")).id;
await as("service_role");
const id = (await one("insert into candidates (organization_id, name) values ($1,'Maria') returning id", [org])).id;

const row = await one("select parse_attempts, parse_error, parse_started_at, parsing_status from candidates where id = $1", [id]);
assert.deepEqual(row, { parse_attempts: 0, parse_error: null, parse_started_at: null, parsing_status: "pending" });

// Revendicare atomică (echivalentul PATCH ... ?parsing_status=eq.pending&parse_attempts=eq.0): doar prima reușește.
const claim = async () => (await db.query(
  `update candidates set parsing_status='processing', parse_attempts=1, parse_started_at=now(), parse_error=null
   where id=$1 and organization_id=$2 and parsing_status='pending' and parse_attempts=0 returning id`, [id, org])).rows.length;
assert.equal(await claim(), 1);
assert.equal(await claim(), 0);

// Contorul nu poate fi negativ.
await assert.rejects(db.query("update candidates set parse_attempts = -1 where id = $1", [id]));

// Interogarea sweeper-ului vede rândul blocat și folosește indexul parțial.
await db.query("update candidates set parse_started_at = now() - interval '1 hour' where id = $1", [id]);
assert.equal(await count(
  "select 1 from candidates where parsing_status='processing' and parse_started_at < now() - interval '15 minutes'"), 1);
assert.equal(await count("select 1 from pg_indexes where indexname = 'candidates_parse_sweep'"), 1);
console.log("OK: parse-reliability");
