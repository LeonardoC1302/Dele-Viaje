-- Dele Viaje — Phase 1: distinguish additional meeting points (e.g. a
-- rented bus doing several pickups across the country before the group
-- reaches the actual destination) from destination stops, within the same
-- ordered `trip_waypoints` list. The trip's required `location_name`/
-- `lat`/`lng` on `trips` stays as-is — always the first, primary meeting
-- point — this just lets the organizer add more of either kind after it,
-- freely reorderable relative to each other.

alter table trip_waypoints add column kind text not null default 'stop'
  check (kind in ('meeting_point', 'stop'));
