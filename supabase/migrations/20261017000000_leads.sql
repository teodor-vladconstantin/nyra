-- Formulare publice de pe site (contact + listă de așteptare). Leadurile aparțin operatorului Nyra, nu unei
-- organizații-client: anon/authenticated pot doar insera; citirea e doar pentru service_role (dashboard Supabase).
create table leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'waitlist')),
  name text not null default '' check (length(name) <= 200),
  email text not null check (length(email) <= 320 and email ~ '^[^@\s]+@[^@\s]+$'),
  message text not null default '' check (length(message) <= 5000),
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
create policy submit on leads for insert to anon, authenticated with check (true);
revoke all on leads from anon, authenticated;
grant insert on leads to anon, authenticated;
