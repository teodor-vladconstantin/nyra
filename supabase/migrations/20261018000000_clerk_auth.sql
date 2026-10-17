-- Clerk ca furnizor de identitate (Supabase Third-Party Auth). Utilizatorul vine din token: `sub` (text, ex. user_...)
-- și claim-ul `email` (semnat de Clerk). Id-urile de utilizator devin text; `auth.uid()` e înlocuit peste tot cu `app_uid()`.
-- Cont vechi (Supabase Auth): se preia la primul login prin sync_user(), după emailul din token.
-- Rollback (manual): coloanele înapoi la uuid doar dacă toate valorile sunt uuid-uri; practic: restaurare din backup.

create function app_uid() returns text language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '') $$;

-- Profil = emailul utilizatorului, scris EXCLUSIV de funcțiile de mai jos (din token), niciodată de client.
create table profiles (
  user_id text primary key,
  email text not null check (email <> ''),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
revoke all on profiles from anon, authenticated;
grant select on profiles to authenticated;

-- Politicile care depind de coloanele schimbate se recreează după conversie.
drop policy read on memberships;
drop policy remove on memberships;
drop policy cv_read on storage.objects;
drop policy own on saved_filters;
drop policy remove on candidate_notes;
drop policy remove on candidate_scorecards;

alter table memberships drop constraint memberships_user_id_fkey;
alter table candidate_notes drop constraint candidate_notes_author_id_fkey;
alter table saved_filters drop constraint saved_filters_user_id_fkey;
alter table candidate_scorecards drop constraint candidate_scorecards_author_id_fkey;

alter table memberships alter column user_id type text using user_id::text;
alter table candidate_notes alter column author_id drop default;
alter table candidate_notes alter column author_id type text using author_id::text;
alter table candidate_notes alter column author_id set default app_uid();
alter table saved_filters alter column user_id drop default;
alter table saved_filters alter column user_id type text using user_id::text;
alter table saved_filters alter column user_id set default app_uid();
alter table candidate_scorecards alter column author_id drop default;
alter table candidate_scorecards alter column author_id type text using author_id::text;
alter table candidate_scorecards alter column author_id set default app_uid();
-- audit_log: ALTER TYPE nu declanșează triggerul de imuabilitate; valorile vechi (uuid) se păstrează ca text.
alter table audit_log alter column actor_id drop default;
alter table audit_log alter column actor_id type text using actor_id::text;
alter table audit_log alter column actor_id set default app_uid();

create or replace function is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = app_uid());
$$;
create or replace function is_admin(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = app_uid() and role = 'admin');
$$;
-- Parserul rulează ca service_role (fără `sub`); orice modificare făcută de un utilizator marchează rândul.
create or replace function mark_edited_manually() returns trigger
language plpgsql as $$
begin
  if app_uid() is not null then new.edited_manually := true; end if;
  return new;
end $$;

create policy read on memberships for select using (user_id = app_uid() or is_member(organization_id));
create policy remove on memberships for delete using (is_admin(organization_id) and user_id <> app_uid());
create policy cv_read on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and exists (
    select 1 from memberships
    where organization_id::text = (storage.foldername(objects.name))[1] and user_id = app_uid()));
create policy own on saved_filters for all
  using (user_id = app_uid() and is_member(organization_id))
  with check (user_id = app_uid() and is_member(organization_id));
create policy remove on candidate_notes for delete using (is_admin(organization_id) and author_id = app_uid());
create policy remove on candidate_scorecards for delete using (is_admin(organization_id) and author_id = app_uid());

-- Profilurile se văd între membrii aceleiași organizații (după conversia memberships.user_id la text).
create function shares_org(p_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships a join memberships b on b.organization_id = a.organization_id
                 where a.user_id = p_user and b.user_id = app_uid());
$$;
create policy read on profiles for select using (user_id = app_uid() or shares_org(user_id));

-- Jurnal și echipă: emailul vine din profiles; pentru istoricul vechi, fallback pe auth.users.
drop function audit_feed(uuid, text, uuid, timestamptz, timestamptz, int, int);
create function audit_feed(
  p_org uuid, p_entity text default null, p_actor text default null,
  p_from timestamptz default null, p_to timestamptz default null,
  p_limit int default 50, p_offset int default 0
) returns table (
  id uuid, created_at timestamptz, actor_id text, actor_email text, action text,
  entity_type text, entity_id uuid, changes jsonb, total bigint
) language sql stable security definer set search_path = public as $$
  select a.id, a.created_at, a.actor_id, coalesce(p.email, u.email::text), a.action, a.entity_type, a.entity_id, a.changes,
         count(*) over () as total
  from audit_log a
    left join profiles p on p.user_id = a.actor_id
    left join auth.users u on u.id::text = a.actor_id
  where is_member(p_org) and a.organization_id = p_org
    and (p_entity is null or a.entity_type = p_entity)
    and (p_actor is null or a.actor_id = p_actor)
    and (p_from is null or a.created_at >= p_from)
    and (p_to is null or a.created_at < p_to)
  order by a.created_at desc, a.id
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

drop function org_members(uuid);
create function org_members(p_org uuid)
returns table (user_id text, email text, role member_role, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, coalesce(p.email, u.email::text), m.role, m.created_at
  from memberships m
    left join profiles p on p.user_id = m.user_id
    left join auth.users u on u.id::text = m.user_id
  where m.organization_id = p_org and is_member(p_org)
  order by m.created_at;
$$;

-- Emailul verificat din token. Fără el (sau fără sub) nu se face nimic.
create function token_email() returns text language sql stable as
  $$ select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) $$;

-- Apelată când utilizatorul nu are încă organizație: creează profilul și preia contul vechi cu același email.
create function sync_user() returns void language plpgsql security definer set search_path = public as $$
declare
  uid text := app_uid();
  mail text := token_email();
  legacy uuid;
begin
  if uid is null or mail = '' then
    raise exception 'Sesiune invalidă: lipsește utilizatorul sau emailul din token' using errcode = '28000';
  end if;
  insert into profiles (user_id, email) values (uid, mail)
    on conflict (user_id) do update set email = excluded.email;
  select u.id into legacy from auth.users u
    where lower(u.email) = mail and exists (select 1 from memberships m where m.user_id = u.id::text) limit 1;
  if legacy is not null then
    update memberships set user_id = uid where user_id = legacy::text;
    update candidate_notes set author_id = uid where author_id = legacy::text;
    update saved_filters set user_id = uid where user_id = legacy::text;
    update candidate_scorecards set author_id = uid where author_id = legacy::text;
  end if;
end $$;

create function create_organization(p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid text := app_uid();
  mail text := token_email();
  org uuid;
begin
  if uid is null or mail = '' then
    raise exception 'Sesiune invalidă: lipsește utilizatorul sau emailul din token' using errcode = '28000';
  end if;
  if length(btrim(coalesce(p_name, ''))) not between 1 and 120 then
    raise exception 'Numele organizației trebuie să aibă între 1 și 120 de caractere' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid));
  if exists (select 1 from memberships where user_id = uid) then
    raise exception 'Utilizatorul are deja o organizație' using errcode = '23505';
  end if;
  insert into profiles (user_id, email) values (uid, mail)
    on conflict (user_id) do update set email = excluded.email;
  insert into organizations (name) values (btrim(p_name)) returning id into org;
  insert into memberships (organization_id, user_id, role) values (org, uid, 'admin');
  return org;
end $$;

revoke execute on function sync_user(), create_organization(text), shares_org(text), token_email() from public, anon;
grant execute on function sync_user(), create_organization(text), shares_org(text), token_email() to authenticated;
revoke execute on function audit_feed(uuid, text, text, timestamptz, timestamptz, int, int), org_members(uuid) from public, anon;
grant execute on function audit_feed(uuid, text, text, timestamptz, timestamptz, int, int), org_members(uuid) to authenticated;
