-- Aplicare publică pe job. Nimic nu devine public de la sine: adminul bifează `public_apply` pe fiecare job.
-- Anonimii nu citesc și nu scriu în tabele; pagina citește prin public_job(), iar scrierea o face serverul
-- (service_role) după validare, cu organizația luată din job, nu din client.
alter table jobs add column public_apply boolean not null default false;

alter table candidates
  add column source text not null default 'upload' check (source in ('upload', 'apply', 'import')),
  add column consent_at timestamptz, -- momentul în care candidatul a acceptat prelucrarea datelor (doar source = 'apply')
  add column apply_source text check (apply_source ~ '^[a-z0-9_-]{1,40}$'); -- ?src= din linkul de aplicare (linkedin, ejobs...)

-- Ce vede candidatul pe pagina de aplicare; numele companiei vine din organizație (tabel închis anonimilor).
create function public_job(p_id uuid)
returns table (title text, description text, requirements text, location text, contract_type text, company text, posted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.title, j.description, j.requirements, j.location, j.contract_type, o.name, j.created_at
  from jobs j join organizations o on o.id = j.organization_id
  where j.id = p_id and j.status = 'active' and j.public_apply;
$$;
revoke execute on function public_job(uuid) from public;
grant execute on function public_job(uuid) to anon, authenticated;

-- Joburile cu pagină publică (pentru sitemap): doar id și data; restul se citește prin public_job.
create function public_jobs()
returns table (id uuid, posted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.id, j.created_at from jobs j where j.status = 'active' and j.public_apply order by j.created_at desc limit 1000;
$$;
revoke execute on function public_jobs() from public;
grant execute on function public_jobs() to anon, authenticated;

-- De unde au venit aplicările la un job (candidații cu source = 'apply'); „direct” = link fără ?src=.
-- security invoker: RLS decide ce se vede.
create function job_apply_sources(p_job uuid)
returns table (source text, applications int)
language sql stable security invoker set search_path = public as $$
  select coalesce(c.apply_source, 'direct'), count(*)::int
  from job_candidates jc join candidates c on c.id = jc.candidate_id and c.organization_id = jc.organization_id
  where jc.job_id = p_job and c.source = 'apply'
  group by 1 order by 2 desc, 1;
$$;
revoke execute on function job_apply_sources(uuid) from public, anon;
grant execute on function job_apply_sources(uuid) to authenticated;
