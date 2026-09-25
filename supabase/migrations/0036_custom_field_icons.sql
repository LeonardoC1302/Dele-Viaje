-- Dele Viaje — an optional icon on each custom detail field.
--
-- Custom fields (migration 0018) are the host's own key/value stats:
-- "Distancia / 19,5 km", "Desnivel / 1.400 m", "Qué llevar / 3 L de
-- agua". As plain text they all read identically, so a page with eight
-- of them is a wall. An icon makes each one scannable and lets a host
-- give their trip some character.

-- Nullable, so every existing row stays valid and the field is opt-in.
-- The length cap is a backstop only: the real gate is the closed enum
-- in lib/validators/trip.ts, generated from the curated catalog in
-- lib/constants/custom-field-icons.tsx. A CHECK listing every key would
-- have to be migrated every time the catalog grows, and an unknown key
-- already degrades safely (customFieldIcon returns null, the field
-- renders without an icon).
alter table trip_custom_fields
  add column if not exists icon text
  check (icon is null or char_length(icon) between 1 and 40);

-- Agency tour templates (migration 0028) store their custom fields as a
-- jsonb array rather than rows, so nothing to alter there — the new
-- `icon` property just rides along inside the existing column.
