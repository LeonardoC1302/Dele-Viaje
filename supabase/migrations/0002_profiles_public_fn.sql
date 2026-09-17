-- Replace profiles_public view with a SECURITY DEFINER function.
--
-- A bare view that bypasses RLS (needed here to expose only safe columns
-- from the locked-down `profiles` table) is flagged by Supabase's linter as
-- "Security Definer View" because it's usually accidental. Functions using
-- the same underlying mechanism are not flagged, since SECURITY DEFINER is
-- the standard, explicit, auditable way to do controlled privilege
-- escalation in Postgres (same pattern as handle_new_user() in 0001).

drop view if exists profiles_public;

create or replace function profiles_public()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, display_name, avatar_url, bio, created_at from profiles;
$$;

grant execute on function profiles_public() to anon, authenticated;
