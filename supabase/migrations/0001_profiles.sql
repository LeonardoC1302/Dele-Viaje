-- Dele Viaje — Phase 0: profiles table, auth trigger, RLS (see docs/data-model.md §1)

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text check (char_length(bio) <= 500),
  locale text not null default 'es' check (locale in ('es', 'en')),
  phone text,
  onboarding_done boolean not null default false,
  category_prefs text[] not null default '{}',
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'banned', 'suspended')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Keep updated_at current on every write.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, locale)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'locale', 'es'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS helper: platform admin check (used across future tables too).
create or replace function is_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- profiles RLS: full-row access is owner-or-admin only. Public-safe fields
-- are exposed separately via the profiles_public view below, not via a
-- blanket row policy (phone/role/status must never leak to other users).
create policy "profiles: read own or admin"
  on profiles for select
  using (auth.uid() = id or is_admin());

create policy "profiles: update own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: admin manage all"
  on profiles for all
  using (is_admin())
  with check (is_admin());

-- Public-safe read surface (no security_invoker: this view intentionally
-- bypasses the restrictive row policy above, but only exposes safe columns).
create view profiles_public as
  select id, display_name, avatar_url, bio, created_at
  from profiles;

grant select on profiles_public to anon, authenticated;
