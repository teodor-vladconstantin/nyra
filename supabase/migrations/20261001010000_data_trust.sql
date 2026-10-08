-- Încredere în date: detectarea duplicatelor, îmbinarea lor și marcajul „editat manual”.
-- Fără tabele noi: RLS-ul existent (is_member la citire, is_admin la scriere) acoperă totul.

-- ---------- 1. Coloane ----------
alter table candidates
  add column content_hash text, -- sha256 hex al fișierului încărcat (setat la upload)
  add column duplicate_of uuid,
  add column edited_manually boolean not null default false,
  -- FK compusă: duplicatul rămâne în aceeași organizație; la ștergerea originalului se golește doar duplicate_of.
  add foreign key (duplicate_of, organization_id) references candidates(id, organization_id) on delete set null (duplicate_of),
  add check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');

-- Re-parsarea nu are voie să suprascrie rândurile corectate de om.
alter table candidate_experiences add column edited_manually boolean not null default false;

-- ---------- 2. Chei de potrivire ----------
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

-- ---------- 3. Grupuri de duplicate ----------
-- security invoker: RLS decide ce rânduri se văd, deci altă organizație primește mereu zero grupuri.
-- Funcționează și fără content_hash (CV-uri vechi / upload care încă nu trimite hash-ul).
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

-- ---------- 4. Marcajul „editat manual” ----------
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

-- ---------- 5. Îmbinare ----------
-- Doar admin: primary rămâne (cu statusul lui), din secondary se mută experiențele și notele care lipsesc,
-- câmpurile goale de contact se completează, apoi secondary se șterge. Totul într-o singură tranzacție.
-- security invoker: policy-urile de scriere ale adminului se aplică; verificarea is_admin dă o eroare clară viewerilor.
-- Întoarce căile fișierelor secondary, pe care aplicația le șterge din Storage (SQL nu poate).
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

-- Duplicatele existente (după email/telefon) primesc duplicate_of.
update candidates set email = email where email is not null;
update candidates set phone = phone where phone is not null and email is null;
