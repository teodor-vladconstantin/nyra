-- Nyra devine un parser de CV-uri: upload din admin -> extragere -> tabel filtrabil + CV inline.
-- Se elimină joburile, aplicațiile, pipeline-ul, emailurile automate, termenii, companiile multiple și invitațiile.
-- organizations/memberships rămân doar ca mecanism de acces (RLS: cine e membru vede CV-urile).

-- ---------- 1. Ce nu mai există ----------
drop view if exists application_overview;
drop trigger if exists applications_notify on applications;
drop trigger if exists organizations_defaults on organizations;

drop function if exists
  submit_application(uuid, text, text, text, text, uuid, inet),
  notify_application(), queue_email(uuid, uuid, text, text, text, text), sync_email_log(),
  render_template(text, candidates, jobs, organizations), track_application_stage(),
  create_invitation(uuid, text, member_role), get_invitation(text), accept_invitation(text),
  create_organization(text), org_members(uuid), rate_limit_hit(text, int, int),
  seed_organization_defaults(uuid), organizations_after_insert(), default_terms(text),
  current_terms_version(uuid), slugify(text), hash_token(text) cascade;

drop table if exists email_log, consent_records, terms_versions, application_notes, stage_history,
  applications, jobs, invitations, rate_limits, email_templates, organization_settings cascade;

drop type if exists app_stage, email_kind, job_status;

drop policy if exists logo_insert on storage.objects;
drop policy if exists logo_update on storage.objects;
drop policy if exists logo_delete on storage.objects;
-- Bucket-ul `logos` și fișierele din `cvs` se șterg prin Storage API (Supabase nu permite DELETE direct în storage).

-- Fără pagini publice: organizațiile nu mai sunt vizibile anonimilor.
drop policy if exists public_read on organizations;
create policy org_read on organizations for select using (is_member(id));

alter table organizations
  drop column if exists slug, drop column if exists logo_path, drop column if exists description,
  drop column if exists culture, drop column if exists benefits, drop column if exists accent_color;

-- ---------- 2. Candidați: intră din upload, datele de contact vin din CV ----------
create type candidate_status as enum ('new', 'to_contact', 'shortlisted', 'rejected');

delete from candidates; -- datele de test din fluxul vechi de aplicare

drop index if exists candidates_org_email;
alter table candidates
  alter column name drop not null,
  alter column email drop not null,
  add column file_name text,
  add column location text,
  add column status candidate_status not null default 'new',
  add column updated_at timestamptz not null default now();

-- Căutarea include și numele fișierului și locația.
create or replace function candidates_search_tsv() returns trigger
language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple', nyra_normalize(concat_ws(' ',
    new.name, new.email, new.location, new.file_name, new.parsed_text,
    (select string_agg(concat_ws(' ', e.role_title, e.company_name, e.description), ' ')
       from candidate_experiences e where e.candidate_id = new.id))));
  return new;
end $$;

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

-- Upload de CV-uri: doar adminii, în folderul organizației lor.
create policy cv_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and storage_org_admin(objects.name));
create policy cv_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and storage_org_admin(objects.name));

-- ---------- 3. Vederea tabelului: un rând per candidat ----------
create view candidate_overview with (security_invoker = true) as
select
  c.id, c.organization_id, c.name, c.email, c.phone, c.location, c.file_name, c.status,
  c.parsing_status, c.created_at, c.search_tsv,
  cur.role_title as last_role, cur.company_name as last_company, cur.seniority_level as seniority,
  coalesce(yx.years, 0) as years_experience,
  coalesce(sk.skills, '[]'::jsonb) as skills
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
) sk on true;
