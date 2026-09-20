-- Dele Viaje — trip creation customization: longer (markdown) description,
-- custom key/value stat fields (distance, elevation gain, difficulty,
-- ...), and linked places (hotels/Airbnbs/restaurants) with a fetched
-- preview.

-- Descriptions now hold markdown (rendered client-side via react-markdown,
-- never raw HTML — see components/ui/markdown-content.tsx) and the editor
-- syntax (**bold**, lists, [links](url)) eats into the character budget,
-- so the old 2000-char cap was too tight.
alter table trips drop constraint trips_description_check;
alter table trips add constraint trips_description_check
  check (char_length(description) between 1 and 4000);

create table if not exists trip_custom_fields (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  value text not null check (char_length(value) between 1 and 200),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists trip_custom_fields_trip_idx on trip_custom_fields (trip_id, sort);

alter table trip_custom_fields enable row level security;

create policy "trip_custom_fields: read with trip"
  on trip_custom_fields for select
  using (
    exists (
      select 1 from trips
      where id = trip_custom_fields.trip_id
        and ((status = 'published' and visibility = 'public') or owner_id = auth.uid() or is_member(id) or is_admin())
    )
  );

create policy "trip_custom_fields: host team manage"
  on trip_custom_fields for all
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

-- Linked places (hotel/Airbnb/restaurant/etc). og_* columns are a
-- best-effort snapshot fetched server-side when the link is added (see
-- lib/link-preview.ts) — sites that block scraping or need JS to render
-- just won't have a preview, the raw link still works.
create table if not exists trip_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  url text not null check (char_length(url) between 1 and 2000),
  label text check (char_length(label) <= 160),
  og_title text,
  og_description text,
  og_image_url text,
  sort int not null default 0,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trip_links_trip_idx on trip_links (trip_id, sort);

alter table trip_links enable row level security;

create policy "trip_links: read with trip"
  on trip_links for select
  using (
    exists (
      select 1 from trips
      where id = trip_links.trip_id
        and ((status = 'published' and visibility = 'public') or owner_id = auth.uid() or is_member(id) or is_admin())
    )
  );

create policy "trip_links: host team manage"
  on trip_links for all
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());
