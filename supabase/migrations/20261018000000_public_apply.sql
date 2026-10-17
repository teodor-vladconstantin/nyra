-- Aplicare publică pe job. Nimic nu devine public de la sine: adminul bifează `public_apply` pe fiecare job.
-- Anonimii nu citesc și nu scriu în tabele; pagina citește prin public_job(), iar scrierea o face serverul
-- (service_role) după validare, cu organizația luată din job, nu din client.
alter table jobs add column public_apply boolean not null default false;

alter table candidates
  add column source text not null default 'upload' check (source in ('upload', 'apply')),
  add column consent_at timestamptz; -- momentul în care candidatul a acceptat prelucrarea datelor (doar source = 'apply')

-- Ce vede candidatul pe pagina de aplicare; numele companiei vine din organizație (tabel închis anonimilor).
create function public_job(p_id uuid)
returns table (title text, description text, requirements text, location text, contract_type text, company text)
language sql stable security definer set search_path = public as $$
  select j.title, j.description, j.requirements, j.location, j.contract_type, o.name
  from jobs j join organizations o on o.id = j.organization_id
  where j.id = p_id and j.status = 'active' and j.public_apply;
$$;
revoke execute on function public_job(uuid) from public;
grant execute on function public_job(uuid) to anon, authenticated;
