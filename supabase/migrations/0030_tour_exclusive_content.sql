-- Content only unlocked for attendees who've paid (WhatsApp group links,
-- meeting-point details you don't want public, etc.). Deliberately its
-- own table rather than a `trips.exclusive_content` column: the general
-- "trips: read published public..." policy lets anyone read a published
-- public tour's whole row, and RLS has no column-level granularity — a
-- plain column here would ride along with every public read regardless
-- of payment status. A separate table gets a genuinely row-conditional
-- policy instead (same reasoning that already produced tour_questions/
-- reviews/tour_templates as their own tables rather than trips columns).
create table if not exists tour_exclusive_content (
  trip_id uuid primary key references trips (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  updated_at timestamptz not null default now()
);

alter table tour_exclusive_content enable row level security;

create trigger tour_exclusive_content_set_updated_at
  before update on tour_exclusive_content
  for each row execute function set_updated_at();

create policy "tour_exclusive_content: host team or paid attendee reads"
  on tour_exclusive_content for select
  using (
    is_host_team(trip_id)
    or is_admin()
    or exists (
      select 1 from attendees
      where attendees.trip_id = tour_exclusive_content.trip_id
        and attendees.profile_id = auth.uid()
        and attendees.status = 'confirmed'
        and attendees.payment_status = 'paid'
    )
  );

create policy "tour_exclusive_content: host team inserts"
  on tour_exclusive_content for insert
  with check (is_host_team(trip_id) or is_admin());

create policy "tour_exclusive_content: host team updates"
  on tour_exclusive_content for update
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

create policy "tour_exclusive_content: host team deletes"
  on tour_exclusive_content for delete
  using (is_host_team(trip_id) or is_admin());
