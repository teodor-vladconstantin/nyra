-- Conformitate: retenție automată (12 luni implicit), ștergere de cont, notă pentru candidați per organizație,
-- cereri ale candidaților, termene pentru leads și jurnalul de activitate.

-- ---------- 1. Retenție: obligatorie, 1..24 luni, implicit 12 ----------
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'organizations'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%retention_months%'
  loop
    execute format('alter table organizations drop constraint %I', c);
  end loop;
end $$;
update organizations set retention_months = 12 where retention_months is null;
update organizations set retention_months = 24 where retention_months > 24;
alter table organizations
  alter column retention_months set default 12,
  alter column retention_months set not null,
  add constraint organizations_retention_months_check check (retention_months between 1 and 24);

create or replace function set_retention(p_org uuid, p_months int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin(p_org) then raise exception 'Doar adminii pot schimba retenția' using errcode = '42501'; end if;
  if p_months is null or p_months not between 1 and 24 then raise exception 'Retenția trebuie să fie între 1 și 24 de luni' using errcode = '22023'; end if;
  update organizations set retention_months = p_months where id = p_org;
end $$;

-- ---------- 2. Nota pentru candidați a organizației ----------
alter table organizations
  add column privacy_email text check (privacy_email is null or (length(privacy_email) <= 320 and privacy_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column candidate_notice_url text check (candidate_notice_url is null or candidate_notice_url ~ '^https://[^\s]{1,250}$');
alter table candidates add column consent_version text check (consent_version is null or length(consent_version) <= 20);

create function set_notice_settings(p_org uuid, p_email text, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin(p_org) then raise exception 'Doar adminii pot schimba aceste setări' using errcode = '42501'; end if;
  update organizations set privacy_email = nullif(btrim(p_email), ''), candidate_notice_url = nullif(btrim(p_url), '') where id = p_org;
end $$;
revoke execute on function set_notice_settings(uuid, text, text) from public, anon;
grant execute on function set_notice_settings(uuid, text, text) to authenticated;

drop function public_job(uuid);
create function public_job(p_id uuid)
returns table (title text, description text, requirements text, location text, contract_type text, company text, posted_at timestamptz,
               retention_months int, privacy_email text, notice_url text)
language sql stable security definer set search_path = public as $$
  select j.title, j.description, j.requirements, j.location, j.contract_type, o.name, j.created_at,
         o.retention_months, o.privacy_email, o.candidate_notice_url
  from jobs j join organizations o on o.id = j.organization_id
  where j.id = p_id and j.status = 'active' and j.public_apply;
$$;
revoke execute on function public_job(uuid) from public;
grant execute on function public_job(uuid) to anon, authenticated;

-- ---------- 3. Cereri ale candidaților (acces, ștergere, rectificare, retragerea acordului) ----------
-- Se scriu de server (service_role) de pe pagina publică de informare; recrutorul le vede și le marchează rezolvate.
create table candidate_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('access', 'erasure', 'rectification', 'withdraw_consent', 'other')),
  email text not null check (length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text not null default '' check (length(message) <= 2000),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index on candidate_requests (organization_id, created_at desc);
alter table candidate_requests enable row level security;
create policy read on candidate_requests for select using (is_member(organization_id));
create policy handle on candidate_requests for update using (is_admin(organization_id)) with check (is_admin(organization_id));
revoke all on candidate_requests from anon, authenticated;
grant select on candidate_requests to authenticated;
grant update (handled_at) on candidate_requests to authenticated;

-- ---------- 4. Jurnalul: ștergere permisă doar din funcțiile de retenție ----------
create or replace function audit_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and current_setting('nyra.purge', true) = 'on' then return old; end if;
  raise exception 'audit_log este doar pentru adăugare' using errcode = '42501';
end $$;

-- ---------- 5. Retenție automată pentru toate organizațiile (apelată zilnic de server, cu service_role) ----------
-- Candidați: după retenția organizației. leads: 12 luni. cereri rezolvate: 12 luni. audit_log: 24 de luni.
-- Întoarce fișierele de șters din bucket (Supabase nu permite DELETE direct în storage.objects).
create function purge_expired_all() returns table (candidate_id uuid, files text[])
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('nyra.purge', 'on', true);
  delete from leads where created_at < now() - interval '12 months';
  delete from candidate_requests where handled_at is not null and handled_at < now() - interval '12 months';
  delete from audit_log where created_at < now() - interval '24 months';
  return query
  with gone as (
    delete from candidates c using organizations o
    where o.id = c.organization_id and c.created_at < now() - make_interval(months => o.retention_months)
    returning c.id, c.organization_id, c.cv_url, c.preview_path
  ), summary as (
    insert into audit_log (organization_id, action, entity_type, changes)
    select organization_id, 'purge', 'candidates', jsonb_build_object('deleted', count(*), 'automatic', true)
    from gone group by organization_id
  )
  select g.id, array_remove(array[g.cv_url, g.preview_path], null) from gone g;
end $$;
revoke execute on function purge_expired_all() from public, anon, authenticated;
grant execute on function purge_expired_all() to service_role;

-- ---------- 6. Ștergerea contului și a organizației ----------
-- Doar adminul unei organizații fără alți membri. Șterge organizația (cascadă: candidați, joburi, note, cereri), jurnalul ei și profilul.
-- Rămân, intenționat, acceptările legale (dovadă) cu identificatorul pseudonim al utilizatorului.
-- Întoarce fișierele de șters din bucket; contul din Clerk îl șterge aplicația.
create function delete_account() returns text[]
language plpgsql security definer set search_path = public as $$
declare
  uid text := app_uid();
  org uuid;
  files text[];
begin
  if uid is null then raise exception 'Sesiune invalida' using errcode = '28000'; end if;
  select organization_id into org from memberships where user_id = uid and role = 'admin' order by created_at limit 1;
  if org is null then raise exception 'Doar un admin își poate șterge contul' using errcode = '42501'; end if;
  if exists (select 1 from memberships where organization_id = org and user_id <> uid) then
    raise exception 'Organizația are și alți membri; scoate-i înainte' using errcode = '23514';
  end if;
  select coalesce(array_agg(name), '{}') into files from storage.objects where bucket_id = 'cvs' and name like org::text || '/%';
  perform set_config('nyra.purge', 'on', true);
  delete from organizations where id = org;
  delete from audit_log where organization_id = org; -- după cascadă, ca să includă și rândurile generate de ea
  delete from profiles where user_id = uid;
  return files;
end $$;
revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;
