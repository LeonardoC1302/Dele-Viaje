-- Dele Viaje — fixes a real production bug: "stack depth limit exceeded"
-- (Postgres error 54001) when a confirmed non-owner member of a private
-- plan tried to read the trip.
--
-- Root cause: every RLS helper function below (`is_admin`, `is_active`,
-- `is_organizer`, `is_member`, `is_trip_participant`) is a plain `stable
-- sql` function, NOT `security definer` — so when one of them queries a
-- table to answer its yes/no question, that query is itself subject to
-- RLS, which can call right back into another (or the same) helper
-- function. Concretely: `trips`' select policy calls `is_member()`, which
-- queries `attendees`; `attendees`' select policy calls `is_organizer()`,
-- which queries `trips` again — around and around. This stayed hidden as
-- long as the only person reading a private plan was its owner (the
-- policy's `owner_id = auth.uid()` branch short-circuits before ever
-- calling `is_member()`), and only surfaced once a plan actually had a
-- second (non-owner) confirmed member reading it — confirmed live via a
-- diagnostic dump showing the exact `tripError` with this Postgres code.
-- `is_admin()`/`is_active()` have the same shape (both query `profiles`,
-- whose own select policy calls `is_admin()`), so they're fixed too even
-- though this hasn't been observed failing for them yet.
--
-- The standard fix (and the reason Supabase's own docs recommend it for
-- every RLS helper function): mark them `security definer`. A definer
-- function's internal queries run with the *function owner's* privileges,
-- which bypasses RLS on the tables it touches entirely — so there's no
-- policy left to recurse into. `set search_path = public` is required
-- alongside `security definer` (without it, a security-definer function is
-- vulnerable to being tricked by a caller-controlled search_path).

create or replace function is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function is_active()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_organizer(trip_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from trips
    where id = is_organizer.trip_id and owner_id = auth.uid()
  );
$$;

create or replace function is_member(trip_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from attendees
    where trip_id = is_member.trip_id and profile_id = auth.uid() and status = 'confirmed'
  );
$$;

create or replace function is_trip_participant(trip_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select
    is_organizer(trip_id)
    or exists (
      select 1 from attendees
      where trip_id = is_trip_participant.trip_id
        and profile_id = auth.uid()
        and status in ('confirmed', 'waitlisted')
    );
$$;
