-- Faza 2–5: career page publică, upload CV, note, setări per organizație, emailuri automate prin Resend.

create extension if not exists pg_net with schema extensions;

-- ---------- Organizații: slug public + setări + template-uri ----------
alter table organizations add column slug text unique check (slug ~ '^[a-z0-9-]+$');
update organizations set slug = 'compania' where slug is null;
alter table organizations alter column slug set not null;

-- Numele și slug-ul sunt publice (career page). Setările stau separat.
drop policy org_read on organizations;
create policy public_read on organizations for select using (true);

create table organization_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  -- Adresa de pe care pleacă emailurile (domeniu verificat în Resend); null = emailuri oprite.
  email_from text check (email_from ~ '^[^@\s<>"]+@[^@\s<>"]+$'),
  notify_email text,
  high_score_threshold smallint not null default 80 check (high_score_threshold between 0 and 100)
);

create type email_kind as enum ('applied', 'interview', 'rejected');

create table email_templates (
  organization_id uuid not null references organizations(id) on delete cascade,
  kind email_kind not null,
  subject text not null,
  body text not null,
  primary key (organization_id, kind)
);

alter table organization_settings enable row level security;
alter table email_templates enable row level security;
create policy read on organization_settings for select using (is_member(organization_id));
create policy write on organization_settings for all using (is_admin(organization_id)) with check (is_admin(organization_id));
create policy read on email_templates for select using (is_member(organization_id));
create policy write on email_templates for all using (is_admin(organization_id)) with check (is_admin(organization_id));

-- Organizație nouă = un rând în organizations; setările și template-urile implicite vin singure.
create function seed_organization_defaults(org uuid) returns void
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
$$;

create function organizations_after_insert() returns trigger
language plpgsql as $$
begin
  perform seed_organization_defaults(new.id);
  return null;
end $$;

create trigger organizations_defaults after insert on organizations
  for each row execute function organizations_after_insert();

-- Backfill pentru organizațiile existente.
select seed_organization_defaults(id) from organizations;
revoke execute on function seed_organization_defaults from public, anon, authenticated;

-- ---------- Joburi active sunt publice ----------
create policy public_active on jobs for select using (status = 'active');

-- ---------- Candidați: un rând per email per organizație ----------
update candidates set email = lower(btrim(email));
create unique index candidates_org_email on candidates (organization_id, email);

-- ---------- Storage: CV-uri private, calea începe cu organization_id ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 10485760, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]) on conflict (id) do nothing;

-- ponytail: oricine poate urca un CV într-un folder de organizație existent (necesar pentru aplicare anonimă);
-- adaugă rate limiting / captcha dacă apare spam.
create policy cv_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'cvs' and exists (
    select 1 from organizations where id::text = (storage.foldername(objects.name))[1]));

create policy cv_read on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and exists (
    select 1 from memberships
    where organization_id::text = (storage.foldername(objects.name))[1] and user_id = auth.uid()));

-- ---------- Aplicare publică ----------
-- Singura cale prin care un anonim scrie în candidates/applications; organizația vine din job, nu din client.
create function submit_application(p_job_id uuid, p_name text, p_email text, p_phone text, p_cv_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  cid uuid;
  aid uuid;
begin
  select * into j from jobs where id = p_job_id and status = 'active';
  if not found then raise exception 'job_not_available'; end if;

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

  -- ponytail: re-aplicarea cu același email înlocuiește CV-ul candidatului (ultimul CV câștigă);
  -- CV per aplicație dacă apare nevoia de istoric.
  insert into candidates (organization_id, name, email, phone, cv_url)
  values (j.organization_id, p_name, p_email, p_phone, p_cv_path)
  on conflict (organization_id, email) do update
    set name = excluded.name, phone = coalesce(excluded.phone, candidates.phone),
        cv_url = excluded.cv_url, parsed_text = null, extracted_keywords = null
  returning id into cid;

  begin
    insert into applications (organization_id, candidate_id, job_id)
    values (j.organization_id, cid, j.id) returning id into aid;
  exception when unique_violation then
    raise exception 'already_applied';
  end;
  return aid;
end $$;

revoke execute on function submit_application from public;
grant execute on function submit_application to anon, authenticated;

-- ---------- Note interne per etapă ----------
create table application_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  application_id uuid not null,
  stage app_stage not null,
  body text not null check (length(body) between 1 and 5000),
  author_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (application_id, organization_id) references applications(id, organization_id) on delete cascade
);
create index on application_notes (application_id);
alter table application_notes enable row level security;
create policy read on application_notes for select using (is_member(organization_id));
create policy write on application_notes for insert with check (is_admin(organization_id));

-- ---------- Emailuri automate (Resend, trimise din DB prin pg_net) ----------
-- Declanșate de schimbări pe applications, indiferent de unde vin (career page, kanban, serviciul Python).
-- Cheia Resend stă în Supabase Vault: select vault.create_secret('<cheia>', 'resend_api_key');
create function render_template(t text, cand candidates, j jobs, org organizations) returns text
language sql immutable as $$
  select replace(replace(replace(t, '{{candidate_name}}', cand.name), '{{job_title}}', j.title), '{{company}}', org.name);
$$;

create function send_email(api_key text, sender text, recipient text, subject text, body text) returns void
language sql as $$
  select net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || api_key),
    body := jsonb_build_object('from', sender, 'to', jsonb_build_array(recipient), 'subject', subject, 'text', body)
  );
$$;

create function notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s organization_settings;
  api_key text;
  sender text;
  v_kind email_kind;
  tpl email_templates;
  cand candidates;
  j jobs;
  org organizations;
  high boolean;
begin
  select * into s from organization_settings where organization_id = new.organization_id;
  if s.email_from is null then return null; end if;
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'resend_api_key';
  if api_key is null then return null; end if;

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
  sender := format('"%s" <%s>', replace(org.name, '"', ''), s.email_from);

  if v_kind is not null then
    select * into tpl from email_templates where organization_id = new.organization_id and kind = v_kind;
    if found then
      perform send_email(api_key, sender, cand.email,
        render_template(tpl.subject, cand, j, org), render_template(tpl.body, cand, j, org));
    end if;
  end if;

  if high and s.notify_email is not null then
    perform send_email(api_key, sender, s.notify_email,
      format('Candidat cu scor mare (%s%%): %s — %s', new.match_score, cand.name, j.title),
      format(E'%s a obținut un scor de potrivire de %s%% pentru postul %s.\n\nEmail: %s\nTelefon: %s\n\nVezi candidatul în Nyra, la jobul %s.',
        cand.name, new.match_score, j.title, cand.email, coalesce(cand.phone, '-'), j.title));
  end if;
  return null;
end $$;

revoke execute on function send_email from public, anon, authenticated;

create trigger applications_notify after insert or update on applications
  for each row execute function notify_application();
