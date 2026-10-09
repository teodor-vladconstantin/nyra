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
