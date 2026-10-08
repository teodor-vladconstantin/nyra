// supabase/bootstrap/after_init.sql (aplicat peste init) trebuie să dea același catalog ca cele 10 migrări.
// Se compară: tabele/coloane, constrângeri, indexuri, vederi, funcții (cod + proprietăți), triggere, politici
// (public + storage.objects), enum-uri, drepturi, RLS, extensii, bucket-uri și rândul seed din organizations.
// Singura diferență intenționată: bucket-ul `logos` (rămas din migrarea 3, mort după resume_parser).
import assert from "assert";
import { buildDb } from "./_pglite.mjs";

const sections = {
  extensions: `select extname::text from pg_extension where extname <> 'plpgsql'`,
  relations: `select c.relname || ':' || c.relkind::text || ':rls=' || c.relrowsecurity || ':force=' || c.relforcerowsecurity
      || ':opts=' || coalesce(c.reloptions::text, '') || ':acl=' || coalesce(c.relacl::text, '')
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','v','m','S','p')`,
  columns: `select c.relname || '.' || a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
      || ' notnull=' || a.attnotnull || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '')
      || ' gen=' || a.attgenerated::text || ' ord=' || (row_number() over (partition by c.oid order by a.attnum))
    from pg_class c join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','v')`,
  constraints: `select conrelid::regclass || ' ' || conname || ' ' || contype::text || ' validated=' || convalidated
      || ' ' || pg_get_constraintdef(oid) from pg_constraint where connamespace = 'public'::regnamespace`,
  indexes: `select indexdef from pg_indexes where schemaname = 'public'`,
  views: `select c.relname || ' ' || pg_get_viewdef(c.oid, true) from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'v'`,
  functions: `select p.oid::regprocedure || ' owner=' || pg_get_userbyid(p.proowner) || ' acl=' || coalesce(p.proacl::text, '')
      || E'\\n' || pg_get_functiondef(p.oid) from pg_proc p where p.pronamespace = 'public'::regnamespace`,
  triggers: `select t.tgrelid::regclass || ' ' || pg_get_triggerdef(t.oid) || ' enabled=' || t.tgenabled::text
    from pg_trigger t where not t.tgisinternal and t.tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)`,
  policies: `select schemaname::text || '.' || tablename || ' ' || policyname::text || ' ' || permissive || ' ' || cmd || ' roles=' || roles::text
      || ' using=' || coalesce(qual, '') || ' check=' || coalesce(with_check, '')
    from pg_policies where schemaname in ('public', 'storage')`,
  storage_rls: `select relname::text || ' rls=' || relrowsecurity from pg_class where relnamespace = 'storage'::regnamespace and relkind = 'r'`,
  types: `select t.typname::text || ':' || t.typtype::text || ':' || coalesce((select string_agg(e.enumlabel, ',' order by e.enumsortorder)
      from pg_enum e where e.enumtypid = t.oid), '') from pg_type t
    where t.typnamespace = 'public'::regnamespace and t.typtype in ('e', 'd')`,
  buckets: `select id || ' ' || name || ' public=' || public || ' limit=' || coalesce(file_size_limit::text, '')
      || ' mime=' || coalesce(allowed_mime_types::text, '') from storage.buckets`,
  organizations: `select name || ' retention=' || coalesce(retention_months::text, '') from organizations`,
  schema_acl: `select nspname::text || ' ' || coalesce(nspacl::text, '') from pg_namespace where nspname = 'public'`,
};

const dump = async (db) => {
  const out = {};
  for (const [k, q] of Object.entries(sections)) out[k] = (await db.query(q)).rows.map((r) => String(Object.values(r)[0]).replace(/\r/g, "")).sort();
  return out;
};

const [m, b] = await Promise.all([buildDb("migrations").then(dump), buildDb("bootstrap").then(dump)]);
// Intenționat: `logos` (bucket public pentru sigla career page) nu se creează în bootstrap.
m.buckets = m.buckets.filter((x) => !x.startsWith("logos "));

for (const k of Object.keys(sections)) {
  if (process.env.DBG) { for (const x of m[k].filter((y) => !b[k].includes(y))) console.log("MIG-ONLY", k, x.slice(0, 400)); for (const x of b[k].filter((y) => !m[k].includes(y))) console.log("BOOT-ONLY", k, x.slice(0, 400)); }
  const missing = m[k].filter((x) => !b[k].includes(x));
  const extra = b[k].filter((x) => !m[k].includes(x));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] }, `diferențe în secțiunea "${k}"`);
}
assert.ok(m.functions.length > 20 && m.columns.length > 60, "dump gol?");
