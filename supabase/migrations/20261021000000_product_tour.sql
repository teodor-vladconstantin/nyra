-- Turul ghidat de la prima intrare în cont. Flag per utilizator (nu per organizație), pe profiles.
-- Conturile existente primesc data curentă: nu le arătăm turul forțat. Profilurile noi au null până îl închid.
alter table profiles add column tour_seen_at timestamptz;
update profiles set tour_seen_at = now();

-- profiles se scrie doar prin funcții security-definer; aici doar marcăm propriul profil (idempotent).
create function mark_tour_seen() returns void language sql security definer set search_path = public as $$
  update profiles set tour_seen_at = coalesce(tour_seen_at, now()) where user_id = app_uid();
$$;
revoke execute on function mark_tour_seen() from public, anon;
grant execute on function mark_tour_seen() to authenticated;
