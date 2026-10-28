-- =====================================================================
-- REDIE 969 — PHASE 2: DATABASE LOCK  (NOT EXECUTED — run manually)
-- =====================================================================
-- ΤΡΕΞΕ ΤΟ ΜΟΝΟ ΑΦΟΥ:
--   1. Έχουν μπει στο Vercel τα SUPABASE_SERVICE_ROLE_KEY + SESSION_SECRET
--   2. Έχει γίνει deploy το νέο dashboard (server-side auth)
--   3. Ο owner έχει κάνει login με επιτυχία στο /login
--      (και ιδανικά όλοι οι χρήστες/παραγωγοί μία φορά, ώστε τα passwords
--       να έχουν γίνει bcrypt αυτόματα)
-- Αν τρέξει πριν, το παλιό dashboard (που διαβάζει dashboard_users από τον
-- browser) θα σταματήσει να κάνει login.
--
-- Σημείωση: η παλιά Android εφαρμογή 1.0.6 κάνει producers select('*').
-- Μετά το column-level REVOKE το select('*') θα αποτύχει (permission denied)
-- και η εφαρμογή κάνει fallback στον πίνακα shows (graceful). Νεότερες
-- εκδόσεις πρέπει να ζητούν ρητές στήλες (id, name, photo_url, bio, ...).
--
-- service_role (server route handlers) παρακάμπτει RLS και ΔΕΝ επηρεάζεται
-- από τα REVOKE παρακάτω.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- dashboard_users: service role only (no policies => anon/authenticated denied)
-- ---------------------------------------------------------------------
alter table public.dashboard_users enable row level security;
revoke all on public.dashboard_users from anon, authenticated;

-- ---------------------------------------------------------------------
-- producers: public columns readable/writable by anon (dashboard producers page
-- still writes public fields with the anon key); username/password server-only.
-- ---------------------------------------------------------------------
alter table public.producers enable row level security;

drop policy if exists producers_select_all on public.producers;
drop policy if exists producers_insert_anon on public.producers;
drop policy if exists producers_update_anon on public.producers;
drop policy if exists producers_delete_anon on public.producers;

create policy producers_select_all on public.producers
  for select to anon, authenticated using (true);
create policy producers_insert_anon on public.producers
  for insert to anon, authenticated with check (true);
create policy producers_update_anon on public.producers
  for update to anon, authenticated using (true) with check (true);
create policy producers_delete_anon on public.producers
  for delete to anon, authenticated using (true);

-- Column privileges: hide username/password from the browser
revoke select, insert, update on public.producers from anon, authenticated;

grant select (id, created_at, name, photo_url, bio, is_admin, is_active, show_1, show_2, chat_color, chat_icon)
  on public.producers to anon, authenticated;

grant insert (name, photo_url, bio, is_admin, is_active, show_1, show_2, chat_color, chat_icon)
  on public.producers to anon, authenticated;

grant update (name, photo_url, bio, is_admin, is_active, show_1, show_2, chat_color, chat_icon)
  on public.producers to anon, authenticated;

grant delete on public.producers to anon, authenticated;

-- ---------------------------------------------------------------------
-- View: run with the caller's privileges (no bypass of the rules above).
-- Check after running: select * from public.producer_favorites_count;
-- (if the view references producers.username/password it will need editing)
-- ---------------------------------------------------------------------
alter view public.producer_favorites_count set (security_invoker = on);

commit;

-- ---------------------------------------------------------------------
-- Rollback (emergency):
-- begin;
--   grant select, insert, update on public.producers to anon, authenticated;
--   alter table public.producers disable row level security;
--   grant select, insert, update, delete on public.dashboard_users to anon, authenticated;
--   alter table public.dashboard_users disable row level security;
--   alter view public.producer_favorites_count set (security_invoker = off);
-- commit;
-- ---------------------------------------------------------------------
