-- Dele Viaje — itinerary blocks get an optional `icon` (a key into a fixed
-- client-side icon set, see components/plans/itinerary-icons.ts), shown as
-- a colored fallback when a block has no `photo_url`. Same idea as
-- trip_links' no-preview-image fallback, just picked explicitly instead of
-- always being the same icon.
alter table itinerary_blocks add column if not exists icon text;
