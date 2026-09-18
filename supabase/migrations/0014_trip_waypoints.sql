-- Dele Viaje — Phase 1: additional trip stops beyond the meeting point.
--
-- `trips.location_name`/`lat`/`lng` stay as-is (the meeting point — where
-- people gather, used for card summaries and the feed's single-pin map).
-- This adds an ordered list of *additional* stops for trips that visit
-- more than one place (e.g. a multi-waterfall hike), so the map can show
-- a numbered route instead of forcing everything into one "location".
-- The meeting point is always visual stop #1; these are #2, #3, ...

create table if not exists trip_waypoints (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 160),
  lat numeric(9, 6) not null,
  lng numeric(9, 6) not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trip_waypoints_trip_sort_idx on trip_waypoints (trip_id, sort);

alter table trip_waypoints enable row level security;

create policy "trip_waypoints: read with trip"
  on trip_waypoints for select
  using (
    exists (
      select 1 from trips
      where id = trip_waypoints.trip_id
        and (
          (status = 'published' and visibility = 'public')
          or owner_id = auth.uid()
          or is_admin()
        )
    )
  );

create policy "trip_waypoints: organizer manage"
  on trip_waypoints for all
  using (is_organizer(trip_id) or is_admin())
  with check (is_organizer(trip_id) or is_admin());
