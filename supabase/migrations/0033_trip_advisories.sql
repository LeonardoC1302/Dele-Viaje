-- Dele Viaje — trip advisories: host-declared safety and logistics tags
-- ("national park", "venomous wildlife", "no phone signal", "cash only").
--
-- WHY A SEEDED TAXONOMY RATHER THAN FREE TEXT
-- Two constraints this app already carries rule out a plain text field:
--   1. Every user-facing string ships in es and en. A tag an agency types
--      by hand ("¡Cuidado, terciopelos!") cannot be translated, so the
--      labels live as data columns here — the same pattern `badges`
--      (migration 0012) uses, and the one docs/frontend-migration-
--      reference.md §5 requires be preserved.
--   2. Tags need to be filterable and comparable across trips, which
--      only works against a stable set of codes.
-- The per-trip `note` is the escape hatch for the specifics a code can't
-- carry: code `venomous_wildlife` + note "se ha visto terciopelo en el
-- tramo alto de la quebrada".

create table if not exists trip_advisory_types (
  code text primary key,
  label_es text not null,
  label_en text not null,
  -- Phosphor icon name, resolved client-side (see
  -- lib/constants/advisories.tsx). Stored as a name rather than a glyph so
  -- an admin can add a type without a code change.
  icon text not null,
  -- Drives the visual treatment, which maps onto the existing StatusStamp
  -- tones: info -> inert, caution -> hold (dawn), danger -> void (red).
  -- Only `danger` surfaces on feed cards; showing info tags at card scale
  -- would bury the ones that matter.
  severity text not null check (severity in ('info', 'caution', 'danger')),
  sort int not null default 0
);

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

alter table trip_advisory_types enable row level security;

create policy "trip_advisory_types: read public"
  on trip_advisory_types for select
  using (true);

create policy "trip_advisory_types: admin manage"
  on trip_advisory_types for all
  using (is_admin())
  with check (is_admin());

-- on delete restrict: a type that trips already reference must not vanish
-- out from under them. Retiring a type is a deliberate migration, not a
-- side effect of an admin delete.
create table if not exists trip_advisories (
  trip_id uuid not null references trips (id) on delete cascade,
  code text not null references trip_advisory_types (code) on delete restrict,
  note text check (char_length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (trip_id, code)
);

create index if not exists trip_advisories_trip_idx on trip_advisories (trip_id);

alter table trip_advisories enable row level security;

-- Same visibility rule as trip_custom_fields (migration 0018): readable by
-- anyone who can read the trip, which keeps private plans private without
-- restating the logic.
create policy "trip_advisories: read with trip"
  on trip_advisories for select
  using (
    exists (
      select 1 from trips
      where id = trip_advisories.trip_id
        and (
          (status = 'published' and visibility = 'public')
          or owner_id = auth.uid()
          or is_member(id)
          or is_admin()
        )
    )
  );

create policy "trip_advisories: host team manage"
  on trip_advisories for all
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

-- Advisories belong to a tour template too, so an agency re-running the
-- same tour doesn't retype them. Matches how 0028 stores waypoints /
-- custom_fields / links: a jsonb array of {code, note}.
alter table tour_templates
  add column if not exists advisories jsonb not null default '[]'::jsonb;

-- Acknowledgement record. Set when someone joins a trip that carries at
-- least one `danger` advisory and confirms they've read the warnings.
--
-- This is evidence that the warning was shown and confirmed, which is what
-- an agency needs when a buyer says nobody told them. It is NOT a legal
-- waiver and nothing in the app treats it as one.
alter table attendees
  add column if not exists advisories_ack_at timestamptz;

-- Narrow self-write, via a function rather than a policy.
--
-- An RLS policy cannot restrict WHICH columns an update touches, so
-- `for update using (profile_id = auth.uid())` would have let any
-- attendee rewrite their own `status` ('waitlisted' -> 'confirmed',
-- skipping the queue) or their own `payment_status` ('none' -> 'paid').
-- Same reason the buyer's payment writes go through
-- submit_payment_evidence() in 0026 instead of a direct update: this is
-- the established shape for a narrow self-write here.
create or replace function ack_trip_advisories(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  update attendees
     set advisories_ack_at = now()
   where trip_id = p_trip_id
     and profile_id = auth.uid()
     -- Idempotent: the first acknowledgement is the one that counts, so a
     -- rejoin or a double-submit doesn't move the timestamp.
     and advisories_ack_at is null;
end;
$$;

revoke all on function ack_trip_advisories(uuid) from public;
grant execute on function ack_trip_advisories(uuid) to authenticated;
