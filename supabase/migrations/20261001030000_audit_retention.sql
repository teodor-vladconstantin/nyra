-- Jurnal de activitate (audit) + retenție GDPR.
-- audit_log se scrie doar din triggere, nu se poate modifica și nu conține date personale ale candidaților:
-- câmpurile de tip PII apar doar ca „redacted", iar parsed_text / extracted_keywords / search_tsv nu se păstrează deloc.
-- actor_id și organization_id sunt fără FK: jurnalul supraviețuiește ștergerii userului sau a organizației.

-- ---------- 1. audit_log ----------
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

-- ---------- 2. Triggerul generic ----------
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

-- ---------- 3. Citire: lista cu emailul actorului (auth.users nu e expus direct) ----------
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

-- ---------- 4. Retenție GDPR ----------
alter table organizations
  add column retention_months int check (retention_months is null or retention_months between 1 and 120);

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

revoke execute on function audit_feed(uuid, text, uuid, timestamptz, timestamptz, int, int), audit_event(uuid, text, text, uuid),
  set_retention(uuid, int), purge_expired_candidates(uuid), erase_candidate(uuid) from public, anon;
grant execute on function audit_feed(uuid, text, uuid, timestamptz, timestamptz, int, int), audit_event(uuid, text, text, uuid),
  set_retention(uuid, int), purge_expired_candidates(uuid), erase_candidate(uuid) to authenticated;
