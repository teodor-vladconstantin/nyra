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
