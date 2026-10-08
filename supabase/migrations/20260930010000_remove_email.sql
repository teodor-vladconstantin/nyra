-- Fără emailuri automate: se elimină cheia Resend, URL-ul din invitații și pg_net (folosit doar pentru trimiterea lor).
delete from vault.secrets where name in ('resend_api_key', 'app_base_url');
drop extension if exists pg_net;
