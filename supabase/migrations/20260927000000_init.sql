-- Nyra — schema inițială. Fiecare tabel de business are organization_id + RLS via memberships.

create type member_role as enum ('admin', 'viewer');
create type job_status as enum ('active', 'closed');
create type app_stage as enum ('applied', 'review', 'interview', 'offer', 'hired', 'rejected');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'admin',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  requirements text not null default '',
  location text not null default '',
  contract_type text not null default '',
  keywords text[] not null default '{}',
  status job_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  cv_url text,
  parsed_text text,
  extracted_keywords jsonb,
  created_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  job_id uuid not null,
  stage app_stage not null default 'applied',
  match_score smallint check (match_score between 0 and 100),
  notes text,
  updated_at timestamptz not null default now(),
  unique (candidate_id, job_id),
  unique (id, organization_id),
  -- FK compuse: candidatul și jobul trebuie să fie din aceeași organizație ca aplicația.
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade,
  foreign key (job_id, organization_id) references jobs(id, organization_id) on delete cascade
);

create table stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid not null,
  old_stage app_stage,
  new_stage app_stage not null,
  changed_at timestamptz not null default now(),
  foreign key (application_id, organization_id) references applications(id, organization_id) on delete cascade
);

create index on memberships (user_id);
create index on jobs (organization_id, status);
create index on candidates (organization_id);
create index on applications (organization_id, job_id);
create index on stage_history (application_id);

-- stage_history + updated_at se scriu din DB, nu din app: nu se pot uita.
create function track_application_stage() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into stage_history (organization_id, application_id, old_stage, new_stage)
    values (new.organization_id, new.id, case when tg_op = 'UPDATE' then old.stage end, new.stage);
  end if;
  return new;
end $$;

-- AFTER pentru INSERT (FK pe application_id), BEFORE pentru UPDATE (setează updated_at).
create trigger applications_stage_insert after insert on applications
  for each row execute function track_application_stage();
create trigger applications_stage_update before update on applications
  for each row execute function track_application_stage();

-- RLS: user vede doar rândurile organizațiilor din care face parte.
create function is_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = auth.uid());
$$;

create function is_admin(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = auth.uid() and role = 'admin');
$$;

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table jobs enable row level security;
alter table candidates enable row level security;
alter table applications enable row level security;
alter table stage_history enable row level security;

create policy org_read on organizations for select using (is_member(id));
create policy org_update on organizations for update using (is_admin(id));

-- memberships se gestionează din SQL/dashboard (fără UI de invitații în MVP).
create policy own_memberships on memberships for select using (user_id = auth.uid());

create policy read on jobs for select using (is_member(organization_id));
create policy write on jobs for all using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy read on candidates for select using (is_member(organization_id));
create policy write on candidates for all using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy read on applications for select using (is_member(organization_id));
create policy write on applications for all using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy read on stage_history for select using (is_member(organization_id));

-- Trigger-ul scrie în stage_history ca owner-ul funcției, nu ca user-ul.
alter function track_application_stage() security definer set search_path = public;

-- Seed: organizația unică de acum.
insert into organizations (name) values ('Compania');
