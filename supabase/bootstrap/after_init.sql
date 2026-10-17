-- Nyra — bootstrap pentru un proiect Supabase nou.
--
-- Rulează ACEST fișier o singură dată, în SQL editor, DUPĂ migrarea 20260927000000_init.sql
-- (și numai după ea). Rezultatul este schema finală, echivalentă cu aplicarea migrărilor 2-11 în ordine,
-- fără partea publică (pagini, aplicare, notificări) care oricum a fost eliminată de migrarea resume_parser. Echivalența este verificată în web/tests/bootstrap-equivalence.test.mjs
-- (catalog comparat cu cel obținut din cele 11 migrări; singura diferență intenționată: bucket-ul `logos`).
--
-- Fără ALTER TYPE ... ADD VALUE: enum-ul candidate_status se creează direct cu toate valorile,
-- deci fișierul poate rula într-o singură tranzacție.
--
-- Secțiuni:
--   1. Curățarea a ceea ce a creat init și nu mai e folosit (joburi, aplicații, istoric de etape)
--   2. Memberships + organizations: politici pentru echipă, retenție
--   3. Storage: bucket `cvs` + politici
--   4. Candidați: coloane, enum-uri, constrângeri, indexuri
--   5. Experiențe și căutare full-text
--   6. Note, etichete, filtre salvate, vederea candidate_overview
--   7. Duplicate, îmbinare, marcaj „editat manual"
--   8. Jurnal de activitate (audit_log) + triggere
--   9. Retenție GDPR, membri, drepturi de execuție

-- =====================================================================
-- 1. Curățare: ce a creat init și nu mai există în produs
-- =====================================================================
drop table if exists stage_history, applications, jobs cascade;
drop function if exists track_application_stage();
drop type if exists app_stage, job_status;

-- =====================================================================
-- 2. Memberships: membrii unei organizații se văd între ei (pagina Echipă)
-- =====================================================================
drop policy own_memberships on memberships;
create policy read on memberships for select using (user_id = auth.uid() or is_member(organization_id));
create policy remove on memberships for delete using (is_admin(organization_id) and user_id <> auth.uid());

alter table organizations
  add column retention_months int check (retention_months is null or retention_months between 1 and 120);

-- =====================================================================
-- 3. Storage: CV-uri private, calea începe cu organization_id
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]) on conflict (id) do nothing;

create function storage_org_admin(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then is_admin(((storage.foldername(object_name))[1])::uuid) else false end;
$$;

create policy cv_read on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and exists (
    select 1 from memberships
    where organization_id::text = (storage.foldername(objects.name))[1] and user_id = auth.uid()));
-- Upload/ștergere de CV-uri: doar adminii, în folderul organizației lor.
create policy cv_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and storage_org_admin(objects.name));
create policy cv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and storage_org_admin(objects.name));

-- =====================================================================
-- 4. Candidați
-- =====================================================================
create type candidate_status as enum ('new', 'to_contact', 'shortlisted', 'interview', 'offer', 'hired', 'rejected');
create type employment_type as enum ('full_time', 'part_time', 'contract', 'internship', 'freelance');
create type seniority_level as enum ('junior', 'mid', 'senior', 'lead');
create type parsing_status as enum ('pending', 'processing', 'parsed', 'needs_review', 'failed');

alter table candidates
  alter column name drop not null,
  alter column email drop not null,
  add column parsing_status parsing_status not null default 'pending',
  add column preview_path text,
  add column search_tsv tsvector,
  add column file_name text,
  add column location text,
  add column status candidate_status not null default 'new',
  add column updated_at timestamptz not null default now(),
  add column parse_attempts int not null default 0 check (parse_attempts >= 0),
  add column parse_error text,
  add column parse_started_at timestamptz,
  add column content_hash text, -- sha256 hex al fișierului încărcat (setat la upload)
  add column duplicate_of uuid,
  add column edited_manually boolean not null default false,
  -- FK compusă: duplicatul rămâne în aceeași organizație; la ștergerea originalului se golește doar duplicate_of.
  add foreign key (duplicate_of, organization_id) references candidates(id, organization_id) on delete set null (duplicate_of),
  add check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  -- Fișierele aparțin organizației candidatului: calea începe cu organization_id/ și nu conține „..".
  -- NOT VALID ca în migrări: rândurile vechi nu se rescanează, orice insert/update nou se verifică.
  add constraint candidates_cv_url_org
    check (cv_url is null or (left(cv_url, 37) = organization_id::text || '/' and position('..' in cv_url) = 0)) not valid,
  add constraint candidates_preview_path_org
    check (preview_path is null or (left(preview_path, 37) = organization_id::text || '/' and position('..' in preview_path) = 0)) not valid;

-- Sweeper-ul caută doar rândurile nefinalizate; indexul parțial rămâne mic.
create index candidates_parse_sweep
  on candidates (parsing_status, parse_started_at, created_at)
  where parsing_status in ('pending', 'processing');

-- =====================================================================
-- 5. Experiențe + căutare full-text
-- =====================================================================
create table candidate_experiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  position smallint not null default 0,
  company_name text not null,
  role_title text not null,
  employment_type employment_type,
  start_date date,
  end_date date, -- null = prezent
  description text not null default '',
  seniority_level seniority_level,
  extracted_skills jsonb not null default '[]' check (jsonb_typeof(extracted_skills) = 'array'),
  created_at timestamptz not null default now(),
  edited_manually boolean not null default false, -- re-parsarea nu suprascrie rândurile corectate de om
  check (end_date is null or start_date is null or end_date >= start_date),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade
);
create index on candidate_experiences (candidate_id);
create index on candidate_experiences (organization_id, role_title);
alter table candidate_experiences enable row level security;
create policy read on candidate_experiences for select using (is_member(organization_id));
create policy write on candidate_experiences for all using (is_admin(organization_id)) with check (is_admin(organization_id));

-- Normalizare pentru căutare: litere mici, fără diacritice (București = bucuresti).
create function nyra_normalize(t text) returns text
language sql immutable parallel safe as $$
  select translate(lower(coalesce(t, '')), 'ăâîșşțţáàäéèëíìïóòöúùüçñ', 'aaisssttaaaeeeiiiooouuucn');
$$;

create function candidates_search_tsv() returns trigger
language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple', nyra_normalize(concat_ws(' ',
    new.name, new.email, new.location, new.file_name, new.parsed_text,
    (select string_agg(concat_ws(' ', e.role_title, e.company_name, e.description), ' ')
       from candidate_experiences e where e.candidate_id = new.id))));
  return new;
end $$;
create trigger candidates_search before insert or update on candidates
  for each row execute function candidates_search_tsv();

create function experiences_touch_candidate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update candidates set search_tsv = null where id = coalesce(new.candidate_id, old.candidate_id);
  return null;
end $$;
create trigger experiences_search after insert or update or delete on candidate_experiences
  for each row execute function experiences_touch_candidate();

create index candidates_search_idx on candidates using gin (search_tsv);

-- =====================================================================
-- 6. Note, etichete, filtre salvate, vederea tabelului
-- =====================================================================
create table candidate_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  body text not null check (length(body) between 1 and 5000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade
);
create index on candidate_notes (candidate_id);
alter table candidate_notes enable row level security;
create policy read on candidate_notes for select using (is_member(organization_id));
create policy write on candidate_notes for insert with check (is_admin(organization_id));
create policy remove on candidate_notes for delete using (is_admin(organization_id) and author_id = auth.uid());

-- Culoarea e un token de design, nu un hex.
create table tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  color text not null default 'neutral' check (color in ('neutral', 'brand', 'success', 'warning', 'destructive')),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index tags_org_name on tags (organization_id, lower(btrim(name)));
alter table tags enable row level security;
create policy read on tags for select using (is_member(organization_id));
create policy write on tags for insert with check (is_admin(organization_id));
create policy change on tags for update using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy remove on tags for delete using (is_admin(organization_id));

create table candidate_tags (
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (candidate_id, tag_id),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade,
  foreign key (tag_id, organization_id) references tags(id, organization_id) on delete cascade
);
create index candidate_tags_tag on candidate_tags (tag_id);
create index candidate_tags_org on candidate_tags (organization_id);
alter table candidate_tags enable row level security;
create policy read on candidate_tags for select using (is_member(organization_id));
create policy write on candidate_tags for insert with check (is_admin(organization_id));
create policy remove on candidate_tags for delete using (is_admin(organization_id));

-- Filtre salvate: personale (fiecare user le vede doar pe ale lui).
create table saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object'),
  created_at timestamptz not null default now()
);
create unique index saved_filters_user_name on saved_filters (organization_id, user_id, lower(btrim(name)));
alter table saved_filters enable row level security;
create policy own on saved_filters for all
  using (user_id = auth.uid() and is_member(organization_id))
  with check (user_id = auth.uid() and is_member(organization_id));

-- Vederea tabelului: un rând per candidat.
create view candidate_overview with (security_invoker = true) as
select
  c.id, c.organization_id, c.name, c.email, c.phone, c.location, c.file_name, c.status,
  c.parsing_status, c.created_at, c.search_tsv, c.duplicate_of,
  cur.role_title as last_role, cur.company_name as last_company, cur.seniority_level as seniority,
  coalesce(yx.years, 0) as years_experience,
  coalesce(sk.skills, '[]'::jsonb) as skills,
  coalesce(tg.tags, '[]'::jsonb) as tags -- [{id, name, color}], filtrabil cu tags @> '[{"id": "..."}]'
from candidates c
left join lateral (
  select e.role_title, e.company_name, e.seniority_level
  from candidate_experiences e where e.candidate_id = c.id
  order by (e.end_date is null) desc, e.end_date desc nulls first, e.start_date desc nulls last, e.position
  limit 1
) cur on true
left join lateral (
  -- ani reali: intervalele suprapuse se contopesc (range_agg), nu se adună de două ori
  select round(sum(upper(r) - lower(r)) / 365.25, 1) as years
  from unnest((
    select range_agg(daterange(e.start_date, least(coalesce(e.end_date, current_date), current_date)))
    from candidate_experiences e
    where e.candidate_id = c.id and e.start_date is not null and e.start_date <= current_date
  )) r
) yx on true
left join lateral (
  select jsonb_agg(distinct s) as skills from (
    select nyra_normalize(s) as s
    from candidate_experiences e, jsonb_array_elements_text(e.extracted_skills) s
    where e.candidate_id = c.id
    union
    select nyra_normalize(s) from jsonb_array_elements_text(coalesce(c.extracted_keywords -> 'skills', '[]'::jsonb)) s
  ) all_skills
) sk on true
left join lateral (
  select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color) order by lower(t.name)) as tags
  from candidate_tags ct join tags t on t.id = ct.tag_id and t.organization_id = ct.organization_id
  where ct.candidate_id = c.id
) tg on true;

-- =====================================================================
-- 7. Duplicate, îmbinare, marcajul „editat manual"
-- =====================================================================
-- Telefon: ultimele 9 cifre (0722 123 456 = +40 722 123 456); sub 9 cifre nu e destul de specific.
create function nyra_phone_key(p text) returns text
language sql immutable parallel safe as $$
  select case when length(d) >= 9 then right(d, 9) end from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create function nyra_email_key(e text) returns text
language sql immutable parallel safe as $$ select nullif(lower(btrim(coalesce(e, ''))), ''); $$;

create index candidates_org_hash on candidates (organization_id, content_hash) where content_hash is not null;
create index candidates_org_email_key on candidates (organization_id, nyra_email_key(email)) where email is not null;
create index candidates_org_phone_key on candidates (organization_id, nyra_phone_key(phone)) where phone is not null;
create index candidates_duplicate_of on candidates (duplicate_of) where duplicate_of is not null;

-- security invoker: RLS decide ce rânduri se văd, deci altă organizație primește mereu zero grupuri.
create function find_duplicates(p_org uuid)
returns table (kind text, key text, candidate_ids uuid[])
language sql stable security invoker set search_path = public as $$
  select k.kind, k.key, array_agg(k.id order by k.created_at, k.id)
  from (
    select 'hash'::text as kind, content_hash as key, id, created_at
      from candidates where organization_id = p_org and content_hash is not null
    union all
    select 'email', nyra_email_key(email), id, created_at
      from candidates where organization_id = p_org and nyra_email_key(email) is not null
    union all
    select 'phone', nyra_phone_key(phone), id, created_at
      from candidates where organization_id = p_org and nyra_phone_key(phone) is not null
  ) k
  group by k.kind, k.key
  having count(*) > 1;
$$;

-- Grupurile în care apare un candidat anume (bannerul din fișa lui).
create function candidate_duplicates(p_id uuid)
returns table (kind text, key text, candidate_ids uuid[])
language sql stable security invoker set search_path = public as $$
  select g.kind, g.key, g.candidate_ids
  from candidates c, lateral find_duplicates(c.organization_id) g
  where c.id = p_id and p_id = any (g.candidate_ids);
$$;

-- duplicate_of = cel mai vechi candidat care se potrivește (originalul); NULL pentru original.
create function candidates_set_duplicate_of() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  new.duplicate_of := (
    select o.id from candidates o
    where o.organization_id = new.organization_id and o.id <> new.id
      and (o.created_at, o.id) < (new.created_at, new.id)
      and ((new.content_hash is not null and o.content_hash = new.content_hash)
        or (nyra_email_key(new.email) is not null and nyra_email_key(o.email) = nyra_email_key(new.email))
        or (nyra_phone_key(new.phone) is not null and nyra_phone_key(o.phone) = nyra_phone_key(new.phone)))
    order by o.created_at, o.id
    limit 1);
  return new;
end $$;
create trigger candidates_duplicate_of before insert or update of content_hash, email, phone on candidates
  for each row execute function candidates_set_duplicate_of();

-- Parserul rulează ca service_role (auth.uid() null); orice modificare făcută de un utilizator marchează rândul.
create function mark_edited_manually() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null then new.edited_manually := true; end if;
  return new;
end $$;
create trigger candidates_edited before update of name, email, phone, location on candidates
  for each row execute function mark_edited_manually();
create trigger experiences_edited before insert or update of company_name, role_title, employment_type,
    start_date, end_date, description, seniority_level, extracted_skills on candidate_experiences
  for each row execute function mark_edited_manually();

-- Îmbinare (doar admin): primary rămâne, din secondary se mută experiențele, notele și etichetele care lipsesc,
-- câmpurile goale de contact se completează, apoi secondary se șterge. Întoarce căile fișierelor secondary,
-- pe care aplicația le șterge din Storage (SQL nu poate).
create function merge_candidates(p_primary uuid, p_secondary uuid) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  org uuid; a candidates; b candidates; base int; n_exp int; n_notes int;
begin
  if p_primary = p_secondary then raise exception 'merge_same_candidate'; end if;
  select organization_id into org from candidates where id = p_primary;
  if org is null or not exists (select 1 from candidates where id = p_secondary and organization_id = org) then
    raise exception 'merge_not_found';
  end if;
  if not is_admin(org) then raise exception 'merge_forbidden'; end if;

  select * into a from candidates where id = p_primary for update;
  select * into b from candidates where id = p_secondary for update;

  select coalesce(max(position), -1) into base from candidate_experiences where candidate_id = p_primary;
  with src as (
    select s.id, row_number() over (order by s.position, s.created_at) as rn
    from candidate_experiences s
    where s.candidate_id = p_secondary
      and not exists (
        select 1 from candidate_experiences p
        where p.candidate_id = p_primary
          and nyra_normalize(btrim(p.company_name)) = nyra_normalize(btrim(s.company_name))
          and nyra_normalize(btrim(p.role_title)) = nyra_normalize(btrim(s.role_title))
          and p.start_date is not distinct from s.start_date)
  )
  update candidate_experiences e set candidate_id = p_primary, position = (base + src.rn)::smallint
  from src where e.id = src.id;
  get diagnostics n_exp = row_count;

  -- Notele nu au policy de UPDATE: se copiază (cu autorul și data originale), originalele pleacă odată cu secondary.
  insert into candidate_notes (organization_id, candidate_id, body, author_id, created_at)
  select n.organization_id, p_primary, n.body, n.author_id, n.created_at
  from candidate_notes n
  where n.candidate_id = p_secondary
    and not exists (select 1 from candidate_notes m where m.candidate_id = p_primary and m.body = n.body);
  get diagnostics n_notes = row_count;

  insert into candidate_tags (organization_id, candidate_id, tag_id)
  select organization_id, p_primary, tag_id from candidate_tags where candidate_id = p_secondary
  on conflict do nothing;

  -- Ceilalți duplicați ai lui secondary indică acum spre primary.
  update candidates set duplicate_of = p_primary where duplicate_of = p_secondary and id <> p_primary;
  delete from candidates where id = p_secondary;

  update candidates set
    name = coalesce(a.name, b.name), email = coalesce(a.email, b.email),
    phone = coalesce(a.phone, b.phone), location = coalesce(a.location, b.location),
    content_hash = coalesce(a.content_hash, b.content_hash)
  where id = p_primary
    and (a.name, a.email, a.phone, a.location, a.content_hash) is distinct from
        (coalesce(a.name, b.name), coalesce(a.email, b.email), coalesce(a.phone, b.phone),
         coalesce(a.location, b.location), coalesce(a.content_hash, b.content_hash));

  return jsonb_build_object('experiences', n_exp, 'notes', n_notes, 'files',
    to_jsonb(array_remove(array[b.cv_url, b.preview_path], null)));
end $$;

revoke execute on function merge_candidates(uuid, uuid), find_duplicates(uuid), candidate_duplicates(uuid) from public, anon;
grant execute on function merge_candidates(uuid, uuid), find_duplicates(uuid), candidate_duplicates(uuid) to authenticated, service_role;

-- =====================================================================
-- 8. Jurnal de activitate (audit_log)
-- =====================================================================
-- Se scrie doar din triggere, nu se poate modifica și nu conține date personale ale candidaților:
-- câmpurile de tip PII apar doar ca „redacted", iar parsed_text / extracted_keywords / search_tsv nu se păstrează.
-- actor_id și organization_id sunt fără FK: jurnalul supraviețuiește ștergerii userului sau a organizației.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  actor_id uuid default auth.uid(), -- null = serviciul de parsing / SQL direct
  action text not null,             -- insert | update | delete | export | purge | erase
  entity_type text not null,        -- numele tabelului
  entity_id uuid,
  changes jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audit_log (organization_id, created_at desc);
create index on audit_log (organization_id, entity_type, created_at desc);
create index on audit_log (entity_type, entity_id);

alter table audit_log enable row level security;
create policy read on audit_log for select using (is_member(organization_id));
-- Fără politici de insert/update/delete: scrierea se face doar din funcții security definer (triggere).
revoke insert, update, delete, truncate on audit_log from anon, authenticated;

create function audit_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log este doar pentru adăugare' using errcode = '42501';
end $$;
create trigger audit_log_immutable before update or delete on audit_log
  for each row execute function audit_immutable();
create trigger audit_log_no_truncate before truncate on audit_log
  for each statement execute function audit_immutable();

create function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  -- zgomot sau conținut mare: nu se păstrează
  skip text[] := array['parsed_text', 'extracted_keywords', 'search_tsv', 'updated_at', 'parse_attempts', 'parse_started_at'];
  -- date personale: se păstrează doar faptul că s-au schimbat
  pii text[] := array['name', 'email', 'phone', 'location', 'file_name', 'cv_url', 'preview_path',
                      'body', 'description', 'role_title', 'company_name'];
  diff jsonb := '{}';
  k text;
  org uuid := coalesce((r ->> 'organization_id')::uuid, case when tg_table_name = 'organizations' then (r ->> 'id')::uuid end);
begin
  if org is null then return null; end if;
  for k in select jsonb_object_keys(r) loop
    continue when k = any(skip);
    continue when tg_op <> 'UPDATE' and jsonb_typeof(r -> k) = 'null'; -- la insert/delete nu listăm coloanele goale
    continue when tg_op = 'UPDATE' and (o -> k) is not distinct from (n -> k);
    diff := diff || jsonb_build_object(k, case
      when k = any(pii) then jsonb_build_object('redacted', true)
      else jsonb_strip_nulls(jsonb_build_object('old', left(o #>> array[k], 200), 'new', left(n #>> array[k], 200)))
    end);
  end loop;
  if tg_op = 'UPDATE' and diff = '{}' then return null; end if;
  insert into audit_log (organization_id, action, entity_type, entity_id, changes)
  values (org, lower(tg_op), tg_table_name, nullif(r ->> 'id', '')::uuid, diff);
  return null;
end $$;

-- Atașează triggerul doar dacă tabelul există; idempotent. Rulează-l din nou după ce apare un tabel nou:
--   select audit_attach_all();
create function audit_attach(p_table text) returns boolean language plpgsql as $$
begin
  if to_regclass('public.' || quote_ident(p_table)) is null then return false; end if;
  execute format('drop trigger if exists audit_row on public.%I', p_table);
  execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function audit_row()', p_table);
  return true;
end $$;

create function audit_attach_all() returns int language sql as $$
  select count(*)::int from unnest(array[
    'organizations', 'memberships', 'candidates', 'candidate_experiences', 'candidate_notes',
    'tags', 'candidate_tags', 'saved_filters'
  ]) t where audit_attach(t);
$$;
revoke execute on function audit_attach(text), audit_attach_all(), audit_row(), audit_immutable() from public, anon, authenticated;

select audit_attach_all();

-- Lista cu emailul actorului (auth.users nu e expus direct).
create function audit_feed(
  p_org uuid, p_entity text default null, p_actor uuid default null,
  p_from timestamptz default null, p_to timestamptz default null,
  p_limit int default 50, p_offset int default 0
) returns table (
  id uuid, created_at timestamptz, actor_id uuid, actor_email text, action text,
  entity_type text, entity_id uuid, changes jsonb, total bigint
) language sql stable security definer set search_path = public as $$
  select a.id, a.created_at, a.actor_id, u.email::text, a.action, a.entity_type, a.entity_id, a.changes,
         count(*) over () as total
  from audit_log a left join auth.users u on u.id = a.actor_id
  where is_member(p_org) and a.organization_id = p_org
    and (p_entity is null or a.entity_type = p_entity)
    and (p_actor is null or a.actor_id = p_actor)
    and (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at < p_to)
  order by a.created_at desc, a.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- Evenimente care nu sunt modificări de rânduri (ex. exportul datelor unui candidat).
create function audit_event(p_org uuid, p_action text, p_entity_type text, p_entity_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_member(p_org) then raise exception 'Acces interzis' using errcode = '42501'; end if;
  if p_action <> 'export' then raise exception 'Acțiune necunoscută' using errcode = '22023'; end if;
  insert into audit_log (organization_id, action, entity_type, entity_id) values (p_org, p_action, p_entity_type, p_entity_id);
end $$;

-- =====================================================================
-- 9. Retenție GDPR, membri, drepturi de execuție
-- =====================================================================
create function set_retention(p_org uuid, p_months int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin(p_org) then raise exception 'Doar adminii pot schimba retenția' using errcode = '42501'; end if;
  update organizations set retention_months = p_months where id = p_org;
end $$;

-- Șterge candidații mai vechi decât retenția și întoarce fișierele lor; Supabase nu permite DELETE direct în
-- storage.objects, deci aplicația le șterge din bucket-ul `cvs` cu Storage API.
create function purge_expired_candidates(p_org uuid)
returns table (candidate_id uuid, files text[])
language plpgsql security definer set search_path = public as $$
declare months int;
begin
  if not is_admin(p_org) then raise exception 'Doar adminii pot șterge candidați' using errcode = '42501'; end if;
  select o.retention_months into months from organizations o where o.id = p_org;
  if months is null then return; end if;
  return query
  with gone as (
    delete from candidates c
    where c.organization_id = p_org and c.created_at < now() - make_interval(months => months)
    returning c.id, c.cv_url, c.preview_path
  ), summary as (
    insert into audit_log (organization_id, action, entity_type, changes)
    select p_org, 'purge', 'candidates', jsonb_build_object('deleted', count(*), 'retention_months', months)
    from gone having count(*) > 0
  )
  select g.id, array_remove(array[g.cv_url, g.preview_path], null) from gone g;
end $$;

-- „Dreptul de a fi uitat": șterge candidatul (experiențe și note în cascadă) și întoarce fișierele de șters din storage.
create function erase_candidate(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare c candidates%rowtype;
begin
  select * into c from candidates where id = p_id;
  if not found then raise exception 'Candidat inexistent' using errcode = 'P0002'; end if;
  if not is_admin(c.organization_id) then raise exception 'Doar adminii pot șterge candidați' using errcode = '42501'; end if;
  delete from candidates where id = p_id;
  insert into audit_log (organization_id, action, entity_type, entity_id) values (c.organization_id, 'erase', 'candidates', p_id);
  return array_remove(array[c.cv_url, c.preview_path], null);
end $$;

-- Membrii organizației (pagina Setări, filtrul din Jurnal).
create function org_members(p_org uuid)
returns table (user_id uuid, email text, role member_role, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from memberships m join auth.users u on u.id = m.user_id
  where m.organization_id = p_org and is_member(p_org)
  order by m.created_at;
$$;

revoke execute on function audit_feed(uuid, text, uuid, timestamptz, timestamptz, int, int), audit_event(uuid, text, text, uuid),
  set_retention(uuid, int), purge_expired_candidates(uuid), erase_candidate(uuid), org_members(uuid) from public, anon;
grant execute on function audit_feed(uuid, text, uuid, timestamptz, timestamptz, int, int), audit_event(uuid, text, text, uuid),
  set_retention(uuid, int), purge_expired_candidates(uuid), erase_candidate(uuid), org_members(uuid) to authenticated;

-- =====================================================================
-- 10. Joburi (identic cu migrarea 20261002000000_jobs.sql)
-- =====================================================================
-- Joburi: poziții deschise + candidați atașați manual. Scorul de potrivire nu se stochează:
-- se calculează la citire din skills-urile candidatului vs. cuvintele cheie ale jobului (job_matches).

create type job_status as enum ('active', 'closed');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 20000),
  requirements text not null default '' check (length(requirements) <= 20000),
  location text not null default '' check (length(location) <= 200),
  contract_type text not null default '' check (length(contract_type) <= 100),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 30),
  status job_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on jobs (organization_id, status);

create table job_candidates (
  job_id uuid not null,
  candidate_id uuid not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, candidate_id),
  -- FK compuse: jobul și candidatul trebuie să fie din aceeași organizație ca legătura.
  foreign key (job_id, organization_id) references jobs(id, organization_id) on delete cascade,
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade
);
create index on job_candidates (candidate_id);
create index on job_candidates (organization_id);

alter table jobs enable row level security;
alter table job_candidates enable row level security;
create policy read on jobs for select using (is_member(organization_id));
create policy write on jobs for all using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy read on job_candidates for select using (is_member(organization_id));
create policy write on job_candidates for all using (is_admin(organization_id)) with check (is_admin(organization_id));

-- Candidații organizației, cei atașați primii, apoi după câte cuvinte cheie ale jobului le au (matched din total).
-- security invoker: RLS-ul vederii și al tabelelor decide ce se vede.
create function job_matches(p_job uuid, p_limit int default 100)
returns table (
  candidate_id uuid, name text, last_role text, seniority seniority_level, years_experience numeric, status candidate_status,
  matched int, total int, attached boolean
) language sql stable security invoker set search_path = public as $$
  with j as (
    select id, organization_id,
           array(select distinct nyra_normalize(btrim(k)) from unnest(keywords) k where btrim(k) <> '') as kw
    from jobs where id = p_job
  )
  select o.id, o.name, o.last_role, o.seniority, o.years_experience, o.status,
         (select count(*)::int from unnest(j.kw) k where o.skills ? k),
         cardinality(j.kw),
         exists (select 1 from job_candidates jc where jc.job_id = j.id and jc.candidate_id = o.id)
  from j join candidate_overview o on o.organization_id = j.organization_id
  order by 9 desc, 7 desc, o.created_at desc
  limit least(greatest(p_limit, 1), 500);
$$;
revoke execute on function job_matches(uuid, int) from public, anon;
grant execute on function job_matches(uuid, int) to authenticated;

-- Jurnalul de activitate urmărește și tabelele noi.
create or replace function audit_attach_all() returns int language sql as $$
  select count(*)::int from unnest(array[
    'organizations', 'memberships', 'candidates', 'candidate_experiences', 'candidate_notes',
    'tags', 'candidate_tags', 'saved_filters', 'jobs', 'job_candidates'
  ]) t where audit_attach(t);
$$;
select audit_attach_all();

-- ============================================================================
-- 11. Matching semantic + scorecards (identic cu migrarea 20261003000000_ats_features.sql)
-- ============================================================================
-- Matching semantic (embeddings de 384 dim., produse de parser) + scorecards de interviu.
-- ponytail: embedding-urile stau în real[] și cosinusul se calculează în SQL (vectorii sunt normalizați => produs scalar).
-- Suficient pentru câteva mii de candidați; peste ~20.000 se trece pe pgvector + index HNSW.

alter table candidates add column embedding real[] check (embedding is null or cardinality(embedding) = 384);
alter table jobs add column embedding real[] check (embedding is null or cardinality(embedding) = 384);

-- Candidații organizației, cei mai apropiați semantic de job, cu scor 0..1. Fără embedding => nu apar.
-- security invoker: RLS-ul tabelelor decide ce se vede.
create function job_semantic_matches(p_job uuid, p_limit int default 100)
returns table (candidate_id uuid, similarity real)
language sql stable security invoker set search_path = public as $$
  select c.id,
         greatest(0, (select coalesce(sum(a * b), 0) from unnest(c.embedding, j.embedding) as t(a, b)))::real
  from jobs j
  join candidates c on c.organization_id = j.organization_id and c.embedding is not null
  where j.id = p_job and j.embedding is not null
  order by 2 desc
  limit least(greatest(p_limit, 1), 500);
$$;
revoke execute on function job_semantic_matches(uuid, int) from public, anon;
grant execute on function job_semantic_matches(uuid, int) to authenticated;

-- Scorecard: un evaluator notează 1–5 pe trei criterii fixe și dă o recomandare.
create type scorecard_recommendation as enum ('yes', 'maybe', 'no');

create table candidate_scorecards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  technical smallint not null check (technical between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  culture smallint not null check (culture between 1 and 5),
  recommendation scorecard_recommendation not null,
  comment text not null default '' check (length(comment) <= 5000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade
);
create index on candidate_scorecards (candidate_id);
alter table candidate_scorecards enable row level security;
create policy read on candidate_scorecards for select using (is_member(organization_id));
create policy write on candidate_scorecards for insert with check (is_admin(organization_id));
create policy remove on candidate_scorecards for delete using (is_admin(organization_id) and author_id = auth.uid());

-- Jurnalul: embedding-ul e zgomot (ca parsed_text), iar comentariul evaluatorului e conținut personal (redactat).
create or replace function audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  -- zgomot sau conținut mare: nu se păstrează
  skip text[] := array['parsed_text', 'extracted_keywords', 'search_tsv', 'updated_at', 'parse_attempts', 'parse_started_at', 'embedding'];
  -- date personale: se păstrează doar faptul că s-au schimbat
  pii text[] := array['name', 'email', 'phone', 'location', 'file_name', 'cv_url', 'preview_path',
                      'body', 'description', 'role_title', 'company_name', 'comment'];
  diff jsonb := '{}';
  k text;
  org uuid := coalesce((r ->> 'organization_id')::uuid, case when tg_table_name = 'organizations' then (r ->> 'id')::uuid end);
begin
  if org is null then return null; end if;
  for k in select jsonb_object_keys(r) loop
    continue when k = any(skip);
    continue when tg_op <> 'UPDATE' and jsonb_typeof(r -> k) = 'null'; -- la insert/delete nu listăm coloanele goale
    continue when tg_op = 'UPDATE' and (o -> k) is not distinct from (n -> k);
    diff := diff || jsonb_build_object(k, case
      when k = any(pii) then jsonb_build_object('redacted', true)
      else jsonb_strip_nulls(jsonb_build_object('old', left(o #>> array[k], 200), 'new', left(n #>> array[k], 200)))
    end);
  end loop;
  if tg_op = 'UPDATE' and diff = '{}' then return null; end if;
  insert into audit_log (organization_id, action, entity_type, entity_id, changes)
  values (org, lower(tg_op), tg_table_name, nullif(r ->> 'id', '')::uuid, diff);
  return null;
end $$;

create or replace function audit_attach_all() returns int language sql as $$
  select count(*)::int from unnest(array[
    'organizations', 'memberships', 'candidates', 'candidate_experiences', 'candidate_notes',
    'tags', 'candidate_tags', 'saved_filters', 'jobs', 'job_candidates', 'candidate_scorecards'
  ]) t where audit_attach(t);
$$;
select audit_attach_all();

-- ============================================================================
-- 12. Formulare publice: leads (identic cu migrarea 20261017000000_leads.sql)
-- ============================================================================
create table leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'waitlist')),
  name text not null default '' check (length(name) <= 200),
  email text not null check (length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+$'),
  message text not null default '' check (length(message) <= 5000),
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
create policy submit on leads for insert to anon, authenticated with check (true);
revoke all on leads from anon, authenticated;
grant insert on leads to anon, authenticated;

-- ============================================================================
-- 13. Aplicare publică (identic cu migrarea 20261018000000_public_apply.sql)
-- ============================================================================
-- Aplicare publică pe job. Nimic nu devine public de la sine: adminul bifează `public_apply` pe fiecare job.
-- Anonimii nu citesc și nu scriu în tabele; pagina citește prin public_job(), iar scrierea o face serverul
-- (service_role) după validare, cu organizația luată din job, nu din client.
alter table jobs add column public_apply boolean not null default false;

alter table candidates
  add column source text not null default 'upload' check (source in ('upload', 'apply', 'import')),
  add column consent_at timestamptz, -- momentul în care candidatul a acceptat prelucrarea datelor (doar source = 'apply')
  add column apply_source text check (apply_source ~ '^[a-z0-9_-]{1,40}$'); -- ?src= din linkul de aplicare (linkedin, ejobs...)

-- Ce vede candidatul pe pagina de aplicare; numele companiei vine din organizație (tabel închis anonimilor).
create function public_job(p_id uuid)
returns table (title text, description text, requirements text, location text, contract_type text, company text, posted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.title, j.description, j.requirements, j.location, j.contract_type, o.name, j.created_at
  from jobs j join organizations o on o.id = j.organization_id
  where j.id = p_id and j.status = 'active' and j.public_apply;
$$;
revoke execute on function public_job(uuid) from public;
grant execute on function public_job(uuid) to anon, authenticated;

-- Joburile cu pagină publică (pentru sitemap): doar id și data; restul se citește prin public_job.
create function public_jobs()
returns table (id uuid, posted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.id, j.created_at from jobs j where j.status = 'active' and j.public_apply order by j.created_at desc limit 1000;
$$;
revoke execute on function public_jobs() from public;
grant execute on function public_jobs() to anon, authenticated;

-- De unde au venit aplicările la un job (candidații cu source = 'apply'); „direct” = link fără ?src=.
-- security invoker: RLS decide ce se vede.
create function job_apply_sources(p_job uuid)
returns table (source text, applications int)
language sql stable security invoker set search_path = public as $$
  select coalesce(c.apply_source, 'direct'), count(*)::int
  from job_candidates jc join candidates c on c.id = jc.candidate_id and c.organization_id = jc.organization_id
  where jc.job_id = p_job and c.source = 'apply'
  group by 1 order by 2 desc, 1;
$$;
revoke execute on function job_apply_sources(uuid) from public, anon;
grant execute on function job_apply_sources(uuid) to authenticated;

-- ============================================================================
-- 14. Explicabilitate scor (identic cu migrarea 20261018010000_job_match_detail.sql)
-- ============================================================================
-- Explicabilitate: pentru candidații dați, ce cuvinte cheie ale jobului se regăsesc în skills-urile lor și care lipsesc.
-- Aceeași regulă ca job_matches (nyra_normalize pe ambele părți), deci scorul afișat și motivele nu pot diverge.
-- security invoker: RLS-ul vederii și al tabelelor decide ce se vede.
create function job_match_detail(p_job uuid, p_candidates uuid[])
returns table (candidate_id uuid, matched text[], missing text[])
language sql stable security invoker set search_path = public as $$
  select o.id,
         array(select btrim(k) from unnest(j.keywords) k where btrim(k) <> '' and o.skills ? nyra_normalize(btrim(k))),
         array(select btrim(k) from unnest(j.keywords) k where btrim(k) <> '' and not (o.skills ? nyra_normalize(btrim(k))))
  from jobs j
  join candidate_overview o on o.organization_id = j.organization_id and o.id = any (p_candidates)
  where j.id = p_job;
$$;
revoke execute on function job_match_detail(uuid, uuid[]) from public, anon;
grant execute on function job_match_detail(uuid, uuid[]) to authenticated;
