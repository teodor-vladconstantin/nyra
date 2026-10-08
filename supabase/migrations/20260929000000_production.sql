-- Producție: aplicare doar prin server (Turnstile + rate limit), consimțământ cu audit trail,
-- experiențe structurate + căutare full-text, administrare companii + invitații, jurnal emailuri.

-- =====================================================================
-- 1. Aplicarea publică trece DOAR prin serverul Next.js (cheie secretă).
--    Înainte, un anonim putea apela RPC-ul și urca fișiere direct, ocolind Turnstile.
-- =====================================================================
drop policy cv_upload on storage.objects;
drop function submit_application(uuid, text, text, text, text);

alter table applications add column created_at timestamptz not null default now();

-- ---------- Rate limiting (fereastră fixă, în Postgres) ----------
create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null,
  primary key (key, window_start)
);
alter table rate_limits enable row level security; -- fără politici: doar service_role

create function rate_limit_hit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  delete from rate_limits where window_start < now() - make_interval(secs => p_window_seconds * 2);
  insert into rate_limits values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  return n <= p_max;
end $$;

-- =====================================================================
-- 2. Termeni + politică de confidențialitate versionate, consimțământ imuabil.
-- =====================================================================
create table terms_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  content text not null check (length(btrim(content)) > 0),
  published_at timestamptz not null default now(),
  unique (id, organization_id)
);
create index on terms_versions (organization_id, published_at desc);
alter table terms_versions enable row level security;
create policy public_read on terms_versions for select using (true);
-- Versiunile nu se editează și nu se șterg: o schimbare = o versiune nouă.
create policy publish on terms_versions for insert with check (is_admin(organization_id));

create function current_terms_version(org uuid) returns uuid
language sql stable as $$
  select id from terms_versions where organization_id = org and published_at <= now()
  order by published_at desc limit 1;
$$;

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- candidate_id devine null la ștergerea candidatului (GDPR): dovada consimțământului rămâne.
  candidate_id uuid,
  candidate_email text not null,
  application_id uuid,
  terms_version_id uuid not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete set null (candidate_id),
  foreign key (application_id, organization_id) references applications(id, organization_id) on delete set null (application_id),
  foreign key (terms_version_id, organization_id) references terms_versions(id, organization_id)
);
create index on consent_records (candidate_id);
alter table consent_records enable row level security;
create policy read on consent_records for select using (is_member(organization_id));
-- fără insert/update/delete pentru useri: se scrie doar în submit_application

-- =====================================================================
-- 3. Parsing structurat: experiențe, status, preview PDF, căutare full-text.
-- =====================================================================
create type employment_type as enum ('full_time', 'part_time', 'contract', 'internship', 'freelance');
create type seniority_level as enum ('junior', 'mid', 'senior', 'lead');
create type parsing_status as enum ('pending', 'processing', 'parsed', 'needs_review', 'failed');

alter table candidates
  add column parsing_status parsing_status not null default 'pending',
  add column preview_path text,
  add column search_tsv tsvector;
update candidates set parsing_status = 'parsed' where parsed_text is not null;

create table candidate_experiences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null,
  position smallint not null default 0,
  company_name text not null,
  role_title text not null,
  employment_type employment_type,
  start_date date,
  end_date date, -- null = prezent
  description text not null default '',
  seniority_level seniority_level,
  extracted_skills jsonb not null default '[]' check (jsonb_typeof(extracted_skills) = 'array'),
  created_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  foreign key (candidate_id, organization_id) references candidates(id, organization_id) on delete cascade
);
create index on candidate_experiences (candidate_id);
create index on candidate_experiences (organization_id, role_title);
alter table candidate_experiences enable row level security;
create policy read on candidate_experiences for select using (is_member(organization_id));
create policy write on candidate_experiences for all using (is_admin(organization_id)) with check (is_admin(organization_id));

-- Normalizare pentru căutare: litere mici, fără diacritice (București = bucuresti).
create function nyra_normalize(t text) returns text
language sql immutable parallel safe as $$
  select translate(lower(coalesce(t, '')), 'ăâîșşțţáàäéèëíìïóòöúùüçñ', 'aaisssttaaaeeeiiiooouuucn');
$$;

create function candidates_search_tsv() returns trigger
language plpgsql as $$
begin
  new.search_tsv := to_tsvector('simple', nyra_normalize(concat_ws(' ',
    new.name, new.email, new.parsed_text,
    (select string_agg(concat_ws(' ', e.role_title, e.company_name, e.description), ' ')
       from candidate_experiences e where e.candidate_id = new.id))));
  return new;
end $$;
create trigger candidates_search before insert or update on candidates
  for each row execute function candidates_search_tsv();

create function experiences_touch_candidate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update candidates set search_tsv = null where id = coalesce(new.candidate_id, old.candidate_id);
  return null;
end $$;
create trigger experiences_search after insert or update or delete on candidate_experiences
  for each row execute function experiences_touch_candidate();

update candidates set search_tsv = null; -- calculează indexul pentru rândurile existente
create index candidates_search_idx on candidates using gin (search_tsv);

-- Vederea din tabelul de candidați: un rând per aplicație, cu date derivate din experiențe.
create view application_overview with (security_invoker = true) as
select
  a.id, a.organization_id, a.job_id, j.title as job_title, a.stage, a.match_score, a.created_at,
  c.id as candidate_id, c.name, c.email, c.parsing_status, c.search_tsv,
  cur.role_title as last_role, cur.company_name as last_company, cur.seniority_level as seniority,
  coalesce(yx.years, 0) as years_experience,
  coalesce(sk.skills, '[]'::jsonb) as skills
from applications a
join jobs j on j.id = a.job_id
join candidates c on c.id = a.candidate_id
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
  select jsonb_agg(distinct nyra_normalize(s)) as skills
  from candidate_experiences e, jsonb_array_elements_text(e.extracted_skills) s
  where e.candidate_id = c.id
) sk on true;

-- ---------- Aplicare (doar service_role) ----------
create function submit_application(
  p_job_id uuid, p_name text, p_email text, p_phone text, p_cv_path text,
  p_terms_version_id uuid, p_ip inet
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  cid uuid;
  aid uuid;
begin
  select * into j from jobs where id = p_job_id and status = 'active';
  if not found then raise exception 'job_not_available'; end if;

  if p_terms_version_id is null or p_terms_version_id is distinct from current_terms_version(j.organization_id) then
    raise exception 'terms_outdated';
  end if;

  p_name := btrim(coalesce(p_name, ''));
  p_email := lower(btrim(coalesce(p_email, '')));
  p_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if p_name = '' or length(p_name) > 200
     or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 320
     or length(coalesce(p_phone, '')) > 50 then
    raise exception 'invalid_input';
  end if;
  if p_cv_path is null or p_cv_path not like j.organization_id::text || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'cvs' and name = p_cv_path) then
    raise exception 'invalid_cv';
  end if;

  -- ponytail: re-aplicarea cu același email înlocuiește CV-ul candidatului (ultimul CV câștigă).
  insert into candidates (organization_id, name, email, phone, cv_url)
  values (j.organization_id, p_name, p_email, p_phone, p_cv_path)
  on conflict (organization_id, email) do update
    set name = excluded.name, phone = coalesce(excluded.phone, candidates.phone),
        cv_url = excluded.cv_url, preview_path = null, parsed_text = null,
        extracted_keywords = null, parsing_status = 'pending'
  returning id into cid;

  begin
    insert into applications (organization_id, candidate_id, job_id)
    values (j.organization_id, cid, j.id) returning id into aid;
  exception when unique_violation then
    raise exception 'already_applied';
  end;

  insert into consent_records (organization_id, candidate_id, candidate_email, application_id, terms_version_id, ip_address)
  values (j.organization_id, cid, p_email, aid, p_terms_version_id, p_ip);
  return aid;
end $$;

-- =====================================================================
-- 4. Companii: profil public + brand, creare self-service, invitații.
-- =====================================================================
alter table organizations
  add column logo_path text,
  add column description text not null default '',
  add column culture text not null default '',
  add column benefits text not null default '',
  add column accent_color text not null default '#4f46e5' check (accent_color ~ '^#[0-9a-fA-F]{6}$');

-- Membrii unei organizații se văd între ei (pagina Echipă).
drop policy own_memberships on memberships;
create policy read on memberships for select using (user_id = auth.uid() or is_member(organization_id));
create policy remove on memberships for delete using (is_admin(organization_id) and user_id <> auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create function storage_org_admin(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when (storage.foldername(object_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then is_admin(((storage.foldername(object_name))[1])::uuid) else false end;
$$;
create policy logo_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and storage_org_admin(objects.name));
create policy logo_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and storage_org_admin(objects.name));
create policy logo_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and storage_org_admin(objects.name));

create function slugify(t text) returns text
language sql immutable as $$
  select coalesce(nullif(btrim(regexp_replace(nyra_normalize(t), '[^a-z0-9]+', '-', 'g'), '-'), ''), 'companie');
$$;

create function create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  base text;
  s text;
  n int := 1;
  org uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  p_name := btrim(coalesce(p_name, ''));
  if p_name = '' or length(p_name) > 120 then raise exception 'invalid_input'; end if;
  base := left(slugify(p_name), 60);
  s := base;
  while exists (select 1 from organizations where slug = s) loop
    n := n + 1;
    s := base || '-' || n;
  end loop;
  insert into organizations (name, slug) values (p_name, s) returning id into org;
  insert into memberships (organization_id, user_id, role) values (org, auth.uid(), 'admin');
  return org;
end $$;

create function org_members(p_org uuid)
returns table (user_id uuid, email text, role member_role, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.created_at
  from memberships m join auth.users u on u.id = m.user_id
  where m.organization_id = p_org and is_member(p_org)
  order by m.created_at;
$$;

create table invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role member_role not null default 'admin',
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table invitations enable row level security;
create policy read on invitations for select using (is_admin(organization_id));
create policy revoke_invite on invitations for delete using (is_admin(organization_id));

create function hash_token(t text) returns text
language sql immutable as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;

-- =====================================================================
-- 5. Emailuri: coadă prin pg_net + jurnal cu status (email_log).
-- =====================================================================
create table email_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid,
  kind text not null,
  recipient text not null,
  subject text not null,
  request_id bigint,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  status_code int,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (application_id, organization_id) references applications(id, organization_id) on delete set null (application_id)
);
create index on email_log (application_id);
create index on email_log (status) where status = 'queued';
alter table email_log enable row level security;
create policy read on email_log for select using (is_member(organization_id));

drop trigger applications_notify on applications;
drop function notify_application();
drop function send_email(text, text, text, text, text);

create function queue_email(p_org uuid, p_application uuid, p_kind text, p_to text, p_subject text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  api_key text;
  s organization_settings;
  org organizations;
  req bigint;
begin
  select * into s from organization_settings where organization_id = p_org;
  select * into org from organizations where id = p_org;
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key';
  if s.email_from is null or api_key is null then
    insert into email_log (organization_id, application_id, kind, recipient, subject, status, error)
    values (p_org, p_application, p_kind, p_to, p_subject, 'skipped',
            case when api_key is null then 'Cheia Resend lipsește din Vault' else 'Emailurile sunt oprite (fără expeditor)' end);
    return;
  end if;
  req := net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object(
      'from', format('"%s" <%s>', replace(org.name, '"', ''), s.email_from),
      'to', jsonb_build_array(p_to), 'subject', p_subject, 'text', p_body)
  );
  insert into email_log (organization_id, application_id, kind, recipient, subject, request_id)
  values (p_org, p_application, p_kind, p_to, p_subject, req);
end $$;

-- pg_net e asincron: statusul HTTP apare în net._http_response; îl copiem în email_log.
create function sync_email_log() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update email_log l set
    status = case when r.status_code between 200 and 299 then 'sent' else 'failed' end,
    status_code = r.status_code,
    error = case when r.status_code between 200 and 299 then null
                 else coalesce(r.error_msg, left(r.content, 500), 'timeout') end,
    updated_at = now()
  from net._http_response r
  where l.status = 'queued' and r.id = l.request_id;
  get diagnostics n = row_count;
  return n;
end $$;

create function notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s organization_settings;
  v_kind email_kind;
  tpl email_templates;
  cand candidates;
  j jobs;
  org organizations;
  high boolean;
begin
  select * into s from organization_settings where organization_id = new.organization_id;
  if tg_op = 'INSERT' then
    v_kind := 'applied';
  elsif new.stage is distinct from old.stage then
    v_kind := case new.stage when 'interview' then 'interview'::email_kind when 'rejected' then 'rejected'::email_kind end;
  end if;
  high := coalesce(tg_op = 'UPDATE' and new.match_score >= s.high_score_threshold
          and (old.match_score is null or old.match_score < s.high_score_threshold), false);
  if v_kind is null and not high then return null; end if;

  select * into cand from candidates where id = new.candidate_id;
  select * into j from jobs where id = new.job_id;
  select * into org from organizations where id = new.organization_id;

  if v_kind is not null then
    select * into tpl from email_templates where organization_id = new.organization_id and kind = v_kind;
    if found then
      perform queue_email(new.organization_id, new.id, v_kind::text, cand.email,
        render_template(tpl.subject, cand, j, org), render_template(tpl.body, cand, j, org));
    end if;
  end if;

  if high and s.notify_email is not null then
    perform queue_email(new.organization_id, new.id, 'high_score', s.notify_email,
      format('Candidat cu scor mare (%s%%): %s — %s', new.match_score, cand.name, j.title),
      format(E'%s a obținut un scor de potrivire de %s%% pentru postul %s.\n\nEmail: %s\nTelefon: %s',
        cand.name, new.match_score, j.title, cand.email, coalesce(cand.phone, '-')));
  end if;
  return null;
end $$;

create trigger applications_notify after insert or update on applications
  for each row execute function notify_application();

-- ---------- Invitații (folosesc coada de emailuri) ----------
create function create_invitation(p_org uuid, p_email text, p_role member_role default 'admin') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  base_url text;
  inv uuid;
  org organizations;
begin
  if not is_admin(p_org) then raise exception 'forbidden'; end if;
  p_email := lower(btrim(coalesce(p_email, '')));
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_input'; end if;
  if exists (select 1 from memberships m join auth.users u on u.id = m.user_id
             where m.organization_id = p_org and lower(u.email) = p_email) then
    raise exception 'already_member';
  end if;
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'app_base_url';
  if base_url is null then raise exception 'app_url_missing'; end if;
  select * into org from organizations where id = p_org;

  delete from invitations where organization_id = p_org and email = p_email and accepted_at is null;
  insert into invitations (organization_id, email, role, token_hash, invited_by)
  values (p_org, p_email, p_role, hash_token(token), auth.uid()) returning id into inv;

  perform queue_email(p_org, null, 'invitation', p_email,
    format('Invitație în echipa %s pe Nyra', org.name),
    format(E'Ai fost invitat(ă) să te alături echipei %s pe Nyra, platforma de recrutare.\n\nAcceptă invitația (link valabil 7 zile):\n%s/invitatie/%s\n\nDacă nu te așteptai la acest email, îl poți ignora.',
      org.name, rtrim(base_url, '/'), token));
  return inv;
end $$;

create function get_invitation(p_token text)
returns table (organization_name text, email text, expired boolean, accepted boolean)
language sql stable security definer set search_path = public as $$
  select o.name, i.email, i.expires_at < now(), i.accepted_at is not null
  from invitations i join organizations o on o.id = i.organization_id
  where i.token_hash = hash_token(p_token);
$$;

create function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  i invitations;
  user_email text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into i from invitations where token_hash = hash_token(p_token) for update;
  if not found or i.accepted_at is not null or i.expires_at < now() then raise exception 'invalid_invitation'; end if;
  select lower(email) into user_email from auth.users where id = auth.uid();
  if user_email is distinct from i.email then raise exception 'wrong_account'; end if;
  insert into memberships (organization_id, user_id, role) values (i.organization_id, auth.uid(), i.role)
  on conflict (organization_id, user_id) do nothing;
  update invitations set accepted_at = now() where id = i.id;
  return i.organization_id;
end $$;

-- ---------- Setări implicite pentru organizații noi: + termeni ----------
create function default_terms(org_name text) returns text
language sql immutable as $$
  select format($t$Termeni și politica de confidențialitate pentru candidați — %1$s

1. Operatorul datelor
%1$s („noi”) este operatorul datelor tale personale transmise prin această pagină de cariere. Platforma Nyra procesează datele în numele nostru.

2. Ce date colectăm
Numele, adresa de email, numărul de telefon, CV-ul și informațiile din el (experiență profesională, studii, competențe), data aplicării și adresa IP de la momentul trimiterii.

3. Scopul și temeiul prelucrării
Folosim datele exclusiv pentru a evalua aplicația ta și a comunica cu tine în procesul de recrutare. Temeiul legal este consimțământul tău (art. 6 alin. (1) lit. a) GDPR) și demersurile făcute la cererea ta înainte de o eventuală încheiere a unui contract (art. 6 alin. (1) lit. b) GDPR).

4. Prelucrare automată
CV-ul este procesat automat pentru extragerea textului și a experienței profesionale și pentru calcularea unui scor de potrivire cu cerințele postului. Scorul ajută echipa de recrutare, dar decizia finală este luată întotdeauna de o persoană.

5. Destinatari
Datele sunt accesibile doar echipei de recrutare a %1$s și furnizorilor care ne ajută tehnic, pe bază de contract: găzduire și bază de date, trimitere de emailuri, extragere de text din documente și analiză automată a CV-ului. Nu vindem datele tale.

6. Cât timp păstrăm datele
Până la finalul procesului de recrutare și încă cel mult 12 luni, pentru oportunități viitoare, apoi le ștergem. Poți cere ștergerea mai devreme oricând.

7. Drepturile tale
Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a-ți retrage consimțământul oricând, fără a afecta legalitatea prelucrării anterioare. Ai dreptul să depui plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP, www.dataprotection.ro).

8. Contact
Pentru orice cerere legată de datele tale, răspunde la emailul de confirmare primit după aplicare.$t$, org_name);
$$;

create or replace function seed_organization_defaults(org uuid) returns void
language sql security definer set search_path = public as $$
  insert into organization_settings (organization_id, email_from) values (org, 'nyra@joben.eu') on conflict do nothing;
  insert into email_templates (organization_id, kind, subject, body) values
    (org, 'applied', 'Am primit aplicația ta pentru {{job_title}}',
     E'Bună {{candidate_name}},\n\nÎți mulțumim pentru aplicația la postul {{job_title}}. Am primit CV-ul tău și revenim cu un răspuns după ce îl analizăm.\n\nEchipa {{company}}'),
    (org, 'interview', 'Invitație la interviu — {{job_title}}',
     E'Bună {{candidate_name}},\n\nNe-ar plăcea să discutăm cu tine despre postul {{job_title}}. Te rugăm să ne răspunzi cu câteva intervale în care ești disponibil(ă) pentru un interviu.\n\nEchipa {{company}}'),
    (org, 'rejected', 'Răspuns la aplicația pentru {{job_title}}',
     E'Bună {{candidate_name}},\n\nÎți mulțumim pentru interesul arătat postului {{job_title}}. După analiză, am decis să continuăm cu alți candidați. Îți dorim mult succes!\n\nEchipa {{company}}')
  on conflict do nothing;
  insert into terms_versions (organization_id, content)
  select org, default_terms(o.name) from organizations o
  where o.id = org and not exists (select 1 from terms_versions t where t.organization_id = org);
$$;
select seed_organization_defaults(id) from organizations;

-- =====================================================================
-- Drepturi de execuție: implicit Postgres dă EXECUTE tuturor; închidem ce e intern.
-- =====================================================================
revoke execute on function
  rate_limit_hit(text, int, int),
  submit_application(uuid, text, text, text, text, uuid, inet),
  queue_email(uuid, uuid, text, text, text, text),
  seed_organization_defaults(uuid)
from public, anon, authenticated;
grant execute on function rate_limit_hit(text, int, int), submit_application(uuid, text, text, text, text, uuid, inet)
to service_role;

revoke execute on function create_organization(text), create_invitation(uuid, text, member_role),
  accept_invitation(text), org_members(uuid), sync_email_log() from public, anon;
grant execute on function create_organization(text), create_invitation(uuid, text, member_role),
  accept_invitation(text), org_members(uuid), sync_email_log() to authenticated;
revoke execute on function get_invitation(text) from public;
grant execute on function get_invitation(text) to anon, authenticated;
