-- Acceptarea Termenilor, a DPA și a clauzelor cu acceptare expresă: cine, când, ce versiune (LEGAL_VERSION din web/lib/legal.ts).
-- Fără FK pe organizație: dovada acceptării supraviețuiește ștergerii contului sau a organizației.
-- Scrierea se face doar prin accept_legal (utilizatorul din token), nu direct din client.
create table legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default app_uid(),
  organization_id uuid not null,
  document text not null check (document in ('terms', 'dpa', 'express_clauses')),
  version text not null check (length(version) between 1 and 20),
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);
alter table legal_acceptances enable row level security;
create policy own on legal_acceptances for select using (user_id = app_uid());
revoke all on legal_acceptances from anon, authenticated;
grant select on legal_acceptances to authenticated;

create function accept_legal(p_version text) returns void language plpgsql security definer set search_path = public as $$
declare
  uid text := app_uid();
  org uuid;
begin
  if uid is null then raise exception 'Sesiune invalida' using errcode = '28000'; end if;
  select organization_id into org from memberships where user_id = uid order by created_at limit 1;
  if org is null then raise exception 'Utilizatorul nu are o organizatie' using errcode = 'P0002'; end if;
  insert into legal_acceptances (user_id, organization_id, document, version)
    select uid, org, d, p_version from unnest(array['terms', 'dpa', 'express_clauses']) d
    on conflict (user_id, document, version) do nothing;
end $$;
revoke execute on function accept_legal(text) from public, anon;
grant execute on function accept_legal(text) to authenticated;
