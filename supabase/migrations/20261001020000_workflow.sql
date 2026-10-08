-- Flux de recrutare: etape noi în pipeline, etichete, filtre salvate; vederea tabelului include etichetele și duplicatele.
-- Valorile noi de enum nu se folosesc în această migrare (Postgres nu permite asta în aceeași tranzacție).

-- ---------- 1. Etape: new -> to_contact -> shortlisted -> interview -> offer -> hired (+ rejected) ----------
alter type candidate_status add value if not exists 'interview' before 'rejected';
alter type candidate_status add value if not exists 'offer' before 'rejected';
alter type candidate_status add value if not exists 'hired' before 'rejected';

-- ---------- 2. Etichete (culoarea e un token de design, nu un hex) ----------
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  color text not null default 'neutral' check (color in ('neutral', 'brand', 'success', 'warning', 'destructive')),
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index if not exists tags_org_name on tags (organization_id, lower(btrim(name)));
alter table tags enable row level security;
drop policy if exists read on tags;
drop policy if exists write on tags;
drop policy if exists change on tags;
drop policy if exists remove on tags;
create policy read on tags for select using (is_member(organization_id));
create policy write on tags for insert with check (is_admin(organization_id));
create policy change on tags for update using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy remove on tags for delete using (is_admin(organization_id));

create table if not exists candidate_tags (
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (candidate_id, tag_id),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade,
  foreign key (tag_id, organization_id) references tags(id, organization_id) on delete cascade
);
create index if not exists candidate_tags_tag on candidate_tags (tag_id);
create index if not exists candidate_tags_org on candidate_tags (organization_id);
alter table candidate_tags enable row level security;
drop policy if exists read on candidate_tags;
drop policy if exists write on candidate_tags;
drop policy if exists remove on candidate_tags;
create policy read on candidate_tags for select using (is_member(organization_id));
create policy write on candidate_tags for insert with check (is_admin(organization_id));
create policy remove on candidate_tags for delete using (is_admin(organization_id));

-- ---------- 3. Filtre salvate: personale (fiecare user le vede doar pe ale lui) ----------
create table if not exists saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 60),
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object'),
  created_at timestamptz not null default now()
);
create unique index if not exists saved_filters_user_name on saved_filters (organization_id, user_id, lower(btrim(name)));
alter table saved_filters enable row level security;
drop policy if exists own on saved_filters;
create policy own on saved_filters for all
  using (user_id = auth.uid() and is_member(organization_id))
  with check (user_id = auth.uid() and is_member(organization_id));

-- ---------- 4. Vederea tabelului: aceleași coloane + duplicate_of + etichete ----------
drop view if exists candidate_overview;
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
