-- Explicabilitate: pentru candidații dați, ce cuvinte cheie ale jobului se regăsesc în skills-urile lor și care lipsesc.
-- Aceeași regulă ca job_matches (nyra_normalize pe ambele părți), deci scorul afișat și motivele nu pot diverge.
-- security invoker: RLS-ul vederii și al tabelelor decide ce se vede.
create function job_match_detail(p_job uuid, p_candidates uuid[])
returns table (candidate_id uuid, matched text[], missing text[])
language sql stable security invoker set search_path = public as $$
  select o.id,
         array(select btrim(k) from unnest(j.keywords) k where btrim(k) <> '' and o.skills ? nyra_normalize(btrim(k))),
         array(select btrim(k) from unnest(j.keywords) k where btrim(k) <> '' and not (o.skills ? nyra_normalize(btrim(k))))
  from jobs j
  join candidate_overview o on o.organization_id = j.organization_id and o.id = any (p_candidates)
  where j.id = p_job;
$$;
revoke execute on function job_match_detail(uuid, uuid[]) from public, anon;
grant execute on function job_match_detail(uuid, uuid[]) to authenticated;
