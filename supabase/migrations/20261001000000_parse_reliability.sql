-- Fiabilitate parsing: serviciul revendică atomic un candidat (UPDATE condiționat), își înregistrează
-- încercările și eroarea, iar un sweeper reia rândurile blocate în pending/processing.
-- Coloanele se scriu doar din serviciul Python (cheie secretă); RLS-ul existent pe candidates rămâne neschimbat.
alter table candidates
  add column if not exists parse_attempts int not null default 0 check (parse_attempts >= 0),
  add column if not exists parse_error text,
  add column if not exists parse_started_at timestamptz;

-- Sweeper-ul caută doar rândurile nefinalizate; indexul parțial rămâne mic (aproape toate rândurile sunt parsed).
create index if not exists candidates_parse_sweep
  on candidates (parsing_status, parse_started_at, created_at)
  where parsing_status in ('pending', 'processing');
