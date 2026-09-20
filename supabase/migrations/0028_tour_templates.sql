-- Tour templates: agencies re-run the same tour on different dates far
-- more often than they invent a new one, so this lets staff save a tour's
-- content (everything except the dates/booking state) and reuse it.
-- Deliberately its own table rather than a `trips.is_template` flag —
-- a template isn't a trip (no attendees, no chat, no status/visibility
-- lifecycle, not feed-eligible) and reusing the trips table would mean
-- every trips RLS policy and every feed/query filtering on `type='tour'`
-- would need a template-awareness branch it doesn't otherwise need.
create table if not exists tour_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  created_by uuid references profiles (id) on delete set null,
  name text not null check (char_length(name) between 3 and 120),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 1 and 4000),
  category text not null,
  location_name text not null check (char_length(location_name) between 2 and 160),
  lat double precision,
  lng double precision,
  waypoints jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  capacity integer not null check (capacity between 1 and 500),
  min_participants integer check (min_participants between 1 and 500),
  price_crc integer not null check (price_crc between 1000 and 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tour_templates_agency_idx on tour_templates (agency_id);

alter table tour_templates enable row level security;

create trigger tour_templates_set_updated_at
  before update on tour_templates
  for each row execute function set_updated_at();

-- Same shape as the agencies/trips staff policies elsewhere: templates
-- are internal working documents for the agency, not public content, so
-- every action is staff-or-admin, no public/approved-status branch.
create policy "tour_templates: staff read own agency"
  on tour_templates for select
  using (is_agency_staff(agency_id) or is_admin());

create policy "tour_templates: staff create"
  on tour_templates for insert
  with check (is_agency_staff(agency_id) or is_admin());

create policy "tour_templates: staff update"
  on tour_templates for update
  using (is_agency_staff(agency_id) or is_admin())
  with check (is_agency_staff(agency_id) or is_admin());

create policy "tour_templates: staff delete"
  on tour_templates for delete
  using (is_agency_staff(agency_id) or is_admin());
