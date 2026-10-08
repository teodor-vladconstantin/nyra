-- Corecturi după review: org_members (dispărută la curățarea de la resume_parser), cv_url/preview_path
-- legate de organizația candidatului, merge_candidates care păstrează etichetele.

-- ---------- 1. Membrii organizației (pagina Setări, filtrul din Jurnal) ----------
create or replace function org_members(p_org uuid)
returns table (user_id uuid, email text, role member_role, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from memberships m join auth.users u on u.id = m.user_id
  where m.organization_id = p_org and is_member(p_org)
  order by m.created_at;
$$;
revoke execute on function org_members(uuid) from public, anon;
grant execute on function org_members(uuid) to authenticated;

-- ---------- 2. Fișierele aparțin organizației candidatului ----------
-- Parserul descarcă cu cheia de serviciu (ocolește RLS din Storage): calea trebuie să înceapă cu organization_id/
-- și să nu conțină „..". NOT VALID: rândurile vechi nu se rescanează, orice insert/update nou se verifică.
alter table candidates
  drop constraint if exists candidates_cv_url_org,
  drop constraint if exists candidates_preview_path_org,
  add constraint candidates_cv_url_org
    check (cv_url is null or (left(cv_url, 37) = organization_id::text || '/' and position('..' in cv_url) = 0)) not valid,
  add constraint candidates_preview_path_org
    check (preview_path is null or (left(preview_path, 37) = organization_id::text || '/' and position('..' in preview_path) = 0)) not valid;

-- ---------- 3. Îmbinare: etichetele lui secondary trec la primary ----------
create or replace function merge_candidates(p_primary uuid, p_secondary uuid) returns jsonb
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

revoke execute on function merge_candidates(uuid, uuid) from public, anon;
grant execute on function merge_candidates(uuid, uuid) to authenticated, service_role;
