-- Dele Viaje — Phase 1: trips (social trips only for now; `tour` type is
-- schema-ready but unused until agencies exist, see docs/data-model.md §3).

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'social' check (type in ('social', 'tour')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  owner_id uuid not null references profiles (id) on delete cascade,
  agency_id uuid, -- FK added when agencies (Phase 2) land
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  cover_url text,
  category text not null,
  location_name text not null,
  lat numeric(9, 6),
  lng numeric(9, 6),
  start_at timestamptz not null,
  end_at timestamptz not null,
  capacity int,
  min_participants int,
  join_deadline timestamptz,
  status text not null default 'draft' check (
    status in ('draft', 'published', 'full', 'in_progress', 'completed', 'cancelled', 'suspended')
  ),
  recurrence_id uuid,
  price_crc int,
  confirmed_count int not null default 0,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trips_end_after_start check (end_at > start_at),
  constraint trips_tour_requires_fields check (
    type <> 'tour' or (agency_id is not null and price_crc is not null and capacity is not null)
  ),
  constraint trips_min_participants_within_capacity check (
    min_participants is null or capacity is null or min_participants <= capacity
  )
);

create index if not exists trips_start_at_idx on trips (start_at);
create index if not exists trips_status_start_at_idx on trips (status, start_at);
create index if not exists trips_visibility_status_idx on trips (visibility, status);
create index if not exists trips_category_idx on trips (category);

alter table trips enable row level security;

create trigger trips_set_updated_at
  before update on trips
  for each row execute function set_updated_at();

-- RLS helper: is the current user the trip's owner (co-host support lands
-- with attendees/Phase 1 chat; this is owner-only for now).
create or replace function is_organizer(trip_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from trips
    where id = is_organizer.trip_id and owner_id = auth.uid()
  );
$$;

create policy "trips: read published public, or own, or admin"
  on trips for select
  using (
    (status = 'published' and visibility = 'public')
    or owner_id = auth.uid()
    or is_admin()
  );

create policy "trips: owner creates"
  on trips for insert
  with check (owner_id = auth.uid());

create policy "trips: owner updates own"
  on trips for update
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

create policy "trips: owner deletes own"
  on trips for delete
  using (owner_id = auth.uid() or is_admin());
