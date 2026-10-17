// Helper comun pentru testele de bază de date: pornește Postgres în WASM (PGlite), aplică toate migrările din
// supabase/migrations în ordine și expune câteva scurtături. Fiecare tests/*.test.mjs îl importă.
// Stub-uri pentru ce oferă Supabase: auth, storage, vault, pg_net, rolurile anon/authenticated/service_role.
// NYRA_SCHEMA=bootstrap: în loc de cele 12 migrări se aplică doar init + supabase/bootstrap/after_init.sql.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "fs";

const BASE = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  -- auth.jwt() ca în Supabase (claims-urile token-ului); aici din setările request.jwt.claim.* puse de as().
  create function auth.jwt() returns jsonb language sql stable as
    $$ select jsonb_strip_nulls(jsonb_build_object(
         'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
         'email', nullif(current_setting('request.jwt.claim.email', true), ''))) $$;
  create role anon; create role authenticated; create role service_role bypassrls;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
`;
// vault + pg_net doar pentru migrările vechi (2-3 le folosesc înainte să le șteargă); bootstrap-ul nu are nevoie de ele.
const LEGACY = `
  create schema vault;
  create table vault.decrypted_secrets (name text, decrypted_secret text);
  create table vault.secrets (name text);
  create schema net;
  create table net._http_response (id bigint, status_code int, content text, error_msg text);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
    headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language sql as $$ select 1::bigint $$;
`;
const dir = new URL("../../supabase/migrations/", import.meta.url);
const bootstrap = new URL("../../supabase/bootstrap/after_init.sql", import.meta.url);
const run = async (d, url, name) => {
  try {
    await d.exec(readFileSync(url, "utf8").replace(/create extension[^;]*;/g, ""));
  } catch (e) {
    throw new Error(`${name}: ${e.message}`);
  }
};

// mode: "migrations" (implicit: toate migrările) sau "bootstrap" (init + supabase/bootstrap/after_init.sql).
export async function buildDb(mode = "migrations") {
  const d = new PGlite();
  await d.exec(BASE);
  const files = readdirSync(dir).sort();
  if (mode === "bootstrap") {
    await run(d, new URL(files[0], dir), files[0]);
    await run(d, bootstrap, "after_init.sql");
  } else {
    await d.exec(LEGACY);
    for (const f of files) await run(d, new URL(f, dir), f);
  }
  await d.exec(`
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant all on all tables in schema public, storage to anon, authenticated, service_role;
    grant execute on all functions in schema storage to anon, authenticated, service_role;
  `);
  return d;
}

export const db = await buildDb(process.env.NYRA_SCHEMA === "bootstrap" ? "bootstrap" : "migrations");

export const A = "00000000-0000-0000-0000-00000000000a";
export const B = "00000000-0000-0000-0000-00000000000b";
export const one = async (q, p) => (await db.query(q, p)).rows[0];
export const count = async (q, p) => (await one(`select count(*)::int n from (${q}) x`, p)).n;
// Rulează următoarele query-uri ca rolul dat, cu userul `uid` (claim `sub`) și emailul din token.
export const as = async (role, uid = "", email = "") => {
  await db.exec(`reset role; set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.email', $2, false)`, [uid, email]);
};
export const su = () => db.exec("reset role");
