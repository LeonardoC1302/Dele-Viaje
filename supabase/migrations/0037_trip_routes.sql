-- Dele Viaje — hiking routes imported from GPX.
--
-- A creator uploads the GPX they already have (watch, Wikiloc, AllTrails
-- export). The server parses it, measures it at full resolution, and
-- stores a simplified line plus an elevation profile. See lib/gpx.ts for
-- why the file is read by hand rather than by an XML library, and why
-- the original upload is not retained.
--
-- WHY NO POSTGIS
-- Consistent with the rest of this schema (see lib/geo.ts and the feed's
-- "near me"): there is no PostGIS extension here, so geometry is stored
-- as jsonb and the arithmetic happens in app code. Nothing about a
-- route needs a spatial index — routes are only ever fetched by
-- trip_id, never searched by location.

create table if not exists trip_routes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,

  -- WHY AN INDEX AND NOT A FOREIGN KEY TO trip_waypoints
  -- Editing a trip replaces its waypoints wholesale — they are deleted
  -- and re-inserted with fresh ids on every save (app/api/trips/[id]/
  -- route.ts). A real FK would be nulled by `on delete set null` every
  -- time the host touched the form, silently unlinking every route. The
  -- waypoint's `sort` survives that, because waypoints are re-inserted
  -- in the order the host sees them. Reordering stops re-points a link,
  -- which is visible and fixable; a disappearing link is neither.
  stop_sort int check (stop_sort is null or stop_sort >= 0),

  name text not null check (char_length(name) between 1 and 160),

  -- [[lng, lat], ...] — simplified to a drawable size by lib/gpx.ts.
  geometry jsonb not null,
  -- [[distance_m, elevation_m], ...] resampled at even spacing, or null
  -- when the file carried no usable elevation.
  profile jsonb,

  -- Measured on the original points, before simplification.
  distance_m int not null check (distance_m >= 0),
  ascent_m int check (ascent_m is null or ascent_m >= 0),
  descent_m int check (descent_m is null or descent_m >= 0),
  min_ele_m int,
  max_ele_m int,
  point_count int not null check (point_count >= 2),
  -- [minLng, minLat, maxLng, maxLat], so the map can frame the route
  -- without walking the whole line.
  bbox jsonb not null,

  sort int not null default 0,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists trip_routes_trip_sort_idx on trip_routes (trip_id, sort);

alter table trip_routes enable row level security;

-- Same visibility rule as trip_custom_fields (migration 0018) and
-- trip_advisories (0033): a route is part of the trip it belongs to.
create policy "trip_routes: read with trip"
  on trip_routes for select
  using (
    exists (
      select 1 from trips
      where id = trip_routes.trip_id
        and (
          (status = 'published' and visibility = 'public')
          or owner_id = auth.uid()
          or is_member(id)
          or is_admin()
        )
    )
  );

create policy "trip_routes: host team manage"
  on trip_routes for all
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

-- A GPX import is the most expensive thing an ordinary user can ask this
-- server to do — parse, measure and simplify up to 200k points — so it
-- gets the same treatment as the other abusable paths in migration 0034.
-- Enforced in the route handler rather than as a trigger here, because
-- the cost is spent before any row is ever written.
