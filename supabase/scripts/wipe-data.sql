-- ============================================================
--  DESTRUCTIVE — empties every table. There is no undo.
--  Supabase's automatic backups are the only way back.
--
--  Deliberately in supabase/scripts/, NOT supabase/migrations/:
--  anything under migrations/ runs on every `supabase db push`,
--  which would wipe production on the next deploy. Nothing runs
--  this file automatically.
--
--  Paste the whole file into the Supabase SQL editor (it contains
--  no psql meta-commands), or from a terminal:
--      psql "<connection string>" -f supabase/scripts/wipe-data.sql
--
--  CHECK WHICH PROJECT YOU ARE POINTED AT BEFORE RUNNING.
-- ============================================================

-- ------------------------------------------------------------
--  0. Look before you leap
-- ------------------------------------------------------------
-- Run this on its own first to see exactly what step 1 will empty.
--
--   select tablename from pg_tables where schemaname = 'public'
--    order by tablename;

-- ------------------------------------------------------------
--  1. Every table in `public`
-- ------------------------------------------------------------
-- Built from pg_tables rather than a hand-written list, so a table
-- added by a later migration is still covered. CASCADE because the
-- tables reference each other; RESTART IDENTITY so sequences
-- (rate_limit_events.id) start from 1 again rather than carrying on.
--
-- TRUNCATE rather than DELETE: no per-row triggers, no FK ordering
-- to get right, and it actually reclaims the space.

do $$
declare
  stmt text;
begin
  select 'truncate table '
       || string_agg(format('%I.%I', schemaname, tablename), ', ')
       || ' restart identity cascade'
    into stmt
    from pg_tables
   where schemaname = 'public';

  if stmt is null then
    raise notice 'No tables found in public — nothing to truncate.';
  else
    execute stmt;
  end if;
end $$;

-- ------------------------------------------------------------
--  2. The accounts
-- ------------------------------------------------------------
-- Step 1 already emptied `profiles`, so nothing cascades from here;
-- this just clears the auth schema itself (users, identities,
-- sessions, refresh tokens — those cascade from auth.users).
--
-- NOTE: this deletes YOUR login too. To keep it, swap this for:
--   delete from auth.users where email <> 'you@example.com';
-- and be aware step 1 has already deleted that account's profile
-- row, so the next sign-in has to recreate it.

delete from auth.users;

-- ------------------------------------------------------------
--  3. Storage
-- ------------------------------------------------------------
-- Not covered by anything above: storage is its own schema and does
-- not reference public.
--
-- Deleting these rows hides the files from the app, but Supabase
-- does not reliably garbage-collect the underlying objects when the
-- rows are deleted directly in SQL. To reclaim the bytes, empty both
-- buckets from the dashboard (Storage -> bucket -> select all ->
-- delete); use this as the follow-up for leftover rows.
--
-- The buckets themselves are left in place — they were created by
-- migrations 0026 and 0029 with `on conflict do nothing`, so a
-- `db push` will NOT recreate them if you drop them here.

delete from storage.objects
 where bucket_id in ('payment-evidence', 'trip-documents');

-- ------------------------------------------------------------
--  4. Re-seed the reference tables
-- ------------------------------------------------------------
-- `badges` (migration 0012) and `trip_advisory_types` (0033) are
-- seeded taxonomy, not user data — the app reads them to render the
-- advisory picker and profile badges. Step 1 emptied them along with
-- everything else, and `supabase db push` will NOT put them back,
-- because those migrations are already recorded as applied.
--
-- So they are re-inserted here, copied verbatim from those two
-- migrations. Without this, the advisory picker renders empty and
-- hosts silently lose the ability to tag a trip.

insert into badges (code, label_es, label_en, icon) values
  ('verified_agency', 'Agencia verificada', 'Verified agency', 'seal-check'),
  ('fast_responder', 'Responde rápido', 'Fast responder', 'lightning'),
  ('host_10', 'Organizó 10+ viajes', 'Hosted 10+ trips', 'mountains'),
  ('great_host', 'Gran anfitrión', 'Great host', 'star'),
  ('good_participant', 'Buen participante', 'Good participant', 'thumbs-up')
on conflict (code) do nothing;

insert into trip_advisory_types (code, label_es, label_en, icon, severity, sort) values
  -- danger: someone could get hurt
  ('venomous_wildlife', 'Fauna venenosa', 'Venomous wildlife', 'bug-beetle', 'danger', 10),
  ('strong_currents',   'Corrientes fuertes', 'Strong currents', 'waves', 'danger', 20),
  ('volcanic_gas',      'Gases volcánicos', 'Volcanic gas', 'warning-octagon', 'danger', 30),
  ('steep_exposed',     'Tramos expuestos', 'Steep, exposed sections', 'mountains', 'danger', 40),
  ('river_crossing',    'Cruce de río', 'River crossing', 'drop', 'danger', 50),
  -- caution: plan for it or don't come
  ('high_altitude',        'Altura elevada', 'High altitude', 'arrow-up', 'caution', 110),
  ('physically_demanding', 'Exigente físicamente', 'Physically demanding', 'person-simple-run', 'caution', 120),
  ('swimming_required',    'Requiere nadar', 'Swimming required', 'person-simple-swim', 'caution', 130),
  ('permit_required',      'Requiere permiso', 'Permit required', 'ticket', 'caution', 140),
  ('night_start',          'Salida de noche', 'Pre-dawn start', 'moon', 'caution', 150),
  ('weather_dependent',    'Depende del clima', 'Weather dependent', 'cloud-rain', 'caution', 160),
  -- info: bring this, expect that
  ('national_park',         'Parque nacional', 'National park', 'tree', 'info', 210),
  ('no_signal',             'Sin señal', 'No phone signal', 'wifi-slash', 'info', 220),
  ('cash_only',             'Solo efectivo', 'Cash only', 'money', 'info', 230),
  ('insect_exposure',       'Llevá repelente', 'Bring repellent', 'bug', 'info', 240),
  ('sun_exposure',          'Mucho sol', 'High sun exposure', 'sun', 'info', 250),
  ('limited_accessibility', 'Accesibilidad limitada', 'Limited accessibility', 'wheelchair', 'info', 260)
on conflict (code) do nothing;

-- ------------------------------------------------------------
--  5. Verify
-- ------------------------------------------------------------
-- Every row should read 0, except badges (5) and
-- trip_advisory_types (17), which step 4 just restored.

select 'auth.users'             as table_name, count(*) from auth.users
union all select 'storage.objects',      count(*) from storage.objects
union all select 'profiles',             count(*) from profiles
union all select 'trips',                count(*) from trips
union all select 'attendees',            count(*) from attendees
union all select 'agencies',             count(*) from agencies
union all select 'messages',             count(*) from messages
union all select 'notifications',        count(*) from notifications
union all select 'trip_routes',          count(*) from trip_routes
union all select 'tour_templates',       count(*) from tour_templates
union all select 'badges (expect 5)',    count(*) from badges
union all select 'trip_advisory_types (expect 17)', count(*) from trip_advisory_types
order by table_name;
