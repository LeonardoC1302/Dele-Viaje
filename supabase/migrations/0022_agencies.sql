-- Dele Viaje — Phase 2 (agencies/tours), core loop only: agency accounts +
-- admin approval, agency staff, and tours (`trips.type = 'tour'`). QR
-- check-in, reviews, badges beyond the manual `verified_agency` grant
-- (already seeded, migration 0012), and the feed's "Verified" tab are
-- explicitly deferred — see PROJECT_STATUS.md. Payments are Phase 4 and
-- untouched: a tour publishes with a price, but nothing here captures
-- money — same off-platform-payment posture the PRD describes for this
-- stage.
--
-- `trips.agency_id` and the `trips_tour_requires_fields` check constraint
-- (agency_id/price_crc/capacity all required when type='tour') already
-- existed since migration 0003 — this is the first migration that actually
-- creates the `agencies` table the column points at.

create table if not exists agencies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 3 and 120),
  legal_name text check (char_length(legal_name) <= 160),
  legal_id text check (char_length(legal_id) <= 60),
  description text check (char_length(description) <= 2000),
  location_name text check (char_length(location_name) <= 160),
  status text not null default 'pending' check (status in ('pending', 'approved', 'suspended', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agencies_owner_idx on agencies (owner_id);
create index if not exists agencies_status_idx on agencies (status);

alter table agencies enable row level security;

create trigger agencies_set_updated_at
  before update on agencies
  for each row execute function set_updated_at();

create table if not exists agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'staff')),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now(),
  unique (agency_id, profile_id)
);

create index if not exists agency_members_agency_idx on agency_members (agency_id);
create index if not exists agency_members_profile_idx on agency_members (profile_id);

alter table agency_members enable row level security;

-- security definer from the outset (migration 0020's lesson): this reads
-- agency_members from inside a trips/agencies policy elsewhere, and vice
-- versa — a plain `stable sql` function here would reproduce the exact
-- cross-table RLS recursion already fixed once this session.
create or replace function is_agency_staff(agency_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from agency_members
    where agency_id = is_agency_staff.agency_id and profile_id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_agency_admin(agency_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from agency_members
    where agency_id = is_agency_admin.agency_id
      and profile_id = auth.uid()
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

-- Agencies: pending/suspended/rejected are only visible to their own
-- staff (and platform admins) — an unapproved agency shouldn't show up
-- publicly. Approved ones are readable by anyone, same as a published
-- public trip.
create policy "agencies: read approved, own staff, or admin"
  on agencies for select
  using (status = 'approved' or is_agency_staff(id) or is_admin());

create policy "agencies: authenticated user applies"
  on agencies for insert
  with check (owner_id = auth.uid() and is_active());

-- `status` is deliberately never writable through this policy — see the
-- column grant below. Every status change, including an admin's, goes
-- through set_agency_status() instead (SECURITY DEFINER, so it isn't
-- affected by the column-grant restriction: it runs as the function
-- owner, not as whichever role called it). A single shared `authenticated`
-- DB role can't be granted "these columns for staff, all columns for
-- admins" — role-conditional column access isn't a thing GRANT can
-- express — so this keeps the column grant simple (same restriction for
-- everyone) and puts the actual admin-only check inside the function.
create policy "agencies: staff edit profile, admin manage all"
  on agencies for update
  using (is_agency_admin(id) or is_admin())
  with check (is_agency_admin(id) or is_admin());

revoke update on agencies from authenticated;
grant update (business_name, legal_name, legal_id, description, location_name) on agencies to authenticated;

create policy "agency_members: staff read own agency"
  on agency_members for select
  using (is_agency_staff(agency_id) or is_admin());

-- No invite/accept flow (unlike private-plan direct invites) — an agency
-- owner adding a known colleague is closer to an organizer adding a
-- packing-list assignee than to inviting a stranger into their private
-- plan, so this goes straight to `active`. `add_agency_staff_by_email`
-- below is how the app actually does it (needs an auth.users email
-- lookup); this insert policy exists mainly so the owner's own founding
-- membership row (created by `apply_for_agency` below) has a clear policy
-- to satisfy, and so admin/owner-role staff can adjust an existing
-- member's role directly.
create policy "agency_members: admin staff manage"
  on agency_members for insert
  with check (is_agency_admin(agency_id) or is_admin());

create policy "agency_members: admin staff update"
  on agency_members for update
  using (is_agency_admin(agency_id) or is_admin())
  with check (is_agency_admin(agency_id) or is_admin());

-- Creates the agency and its owner membership atomically — doing this as
-- two separate client-side inserts would leave a window where the
-- agencies-insert policy succeeded but the founding agency_members row
-- didn't (or the reverse, which agency_members' own insert policy
-- wouldn't even allow yet, since is_agency_admin() has nothing to check
-- against until the row exists). SECURITY DEFINER sidesteps that
-- chicken-and-egg problem entirely.
create or replace function apply_for_agency(
  p_business_name text,
  p_legal_name text,
  p_legal_id text,
  p_description text,
  p_location_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_agency_id uuid;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_active() then
    raise exception 'ERR_ACCOUNT_NOT_ACTIVE';
  end if;

  insert into agencies (owner_id, business_name, legal_name, legal_id, description, location_name)
  values (v_profile_id, p_business_name, p_legal_name, p_legal_id, p_description, p_location_name)
  returning id into v_agency_id;

  insert into agency_members (agency_id, profile_id, role, status)
  values (v_agency_id, v_profile_id, 'owner', 'active');

  return v_agency_id;
end;
$$;

grant execute on function apply_for_agency(text, text, text, text, text) to authenticated;

-- Same email-lookup pattern as create_direct_plan_invite() (migration
-- 0019): profiles has no email/username column, so finding "the user with
-- this email" needs a definer function reading auth.users directly.
create or replace function add_agency_staff_by_email(p_agency_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_id uuid;
  v_member_id uuid;
begin
  if v_actor_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_agency_admin(p_agency_id) then
    raise exception 'ERR_FORBIDDEN';
  end if;
  if p_role not in ('admin', 'staff') then
    raise exception 'ERR_INVALID_ROLE';
  end if;

  select id into v_target_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_target_id is null then
    raise exception 'ERR_USER_NOT_FOUND';
  end if;

  insert into agency_members (agency_id, profile_id, role, status)
  values (p_agency_id, v_target_id, p_role, 'active')
  on conflict (agency_id, profile_id) do update set role = excluded.role, status = 'active'
  returning id into v_member_id;

  return v_member_id;
end;
$$;

grant execute on function add_agency_staff_by_email(uuid, text, text) to authenticated;

-- Platform-admin-only approval action. A plain `agencies` UPDATE through
-- RLS would technically work (admins pass the "staff edit or admin"
-- policy's `is_admin()` branch), but a dedicated function makes the admin
-- action explicit/auditable and is the natural place to reject an invalid
-- target status without duplicating that check in every caller.
create or replace function set_agency_status(p_agency_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'ERR_FORBIDDEN';
  end if;
  if p_status not in ('pending', 'approved', 'suspended', 'rejected') then
    raise exception 'ERR_INVALID_STATUS';
  end if;

  update agencies set status = p_status where id = p_agency_id;
end;
$$;

grant execute on function set_agency_status(uuid, text) to authenticated;

-- Now that `agencies` exists, wire up the FK migration 0003 deferred
-- ("FK added when agencies (Phase 2) land"). `on delete set null` rather
-- than cascade: an agency being removed shouldn't take its published
-- tours (and their attendees/reviews/chat history) down with it.
alter table trips add constraint trips_agency_id_fkey
  foreign key (agency_id) references agencies (id) on delete set null;

-- is_host_team() (migration 0016) was "just calls is_organizer() today —
-- kept as its own function [...] when agency staff exists (Phase 2), it's
-- a one-line change in this function instead of a find-and-replace" —
-- that day has come. Also switches it to security definer for the same
-- reason every helper in this migration is: it now queries `trips` and
-- `agency_members` directly rather than only delegating to is_organizer(),
-- and both of those tables' own policies could otherwise call back into
-- this one.
create or replace function is_host_team(trip_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select
    is_organizer(trip_id)
    or exists (
      select 1 from trips
      where trips.id = is_host_team.trip_id
        and trips.agency_id is not null
        and is_agency_staff(trips.agency_id)
    );
$$;

-- Tours are agency-owned, not personally owned the way a social trip is —
-- `owner_id` is still set (NOT NULL, whoever's staff account created it),
-- but the whole point of agency staff is that any of them should be able
-- to manage a tour regardless of who personally clicked "create". Same
-- fix-forward pattern as 0020: drop and recreate rather than edit the
-- applied 0003/0016 policies.
drop policy if exists "trips: owner updates own" on trips;
create policy "trips: owner or host team updates"
  on trips for update
  using (owner_id = auth.uid() or is_host_team(id) or is_admin())
  with check (owner_id = auth.uid() or is_host_team(id) or is_admin());

drop policy if exists "trips: owner deletes own" on trips;
create policy "trips: owner or host team deletes"
  on trips for delete
  using (owner_id = auth.uid() or is_host_team(id) or is_admin());

-- The insert policy (migration 0010) only ever checked `owner_id =
-- auth.uid() and is_active()` — fine when every trip was personally owned,
-- but it means anyone active could currently insert `type='tour',
-- agency_id=<someone else's agency>` with their own id as owner_id and
-- RLS would allow it; nothing checked that the inserter is actually that
-- agency's staff. Closing that gap here.
drop policy if exists "trips: owner creates" on trips;
create policy "trips: owner creates, tours require agency staff"
  on trips for insert
  with check (
    owner_id = auth.uid()
    and is_active()
    and (type <> 'tour' or is_agency_staff(agency_id))
  );

-- Read policy already covers a published public tour via the
-- "status='published' and visibility='public'" branch (tours are always
-- public) — the gap is a *draft* tour, which only the creator could read
-- before. Adding is_host_team() here lets any staff member see (and, via
-- the update/delete policies above, edit) their agency's draft tours.
drop policy if exists "trips: read published public, own, member, or admin" on trips;
create policy "trips: read published public, own, member, host team, or admin"
  on trips for select
  using (
    (status = 'published' and visibility = 'public')
    or owner_id = auth.uid()
    or is_member(id)
    or is_host_team(id)
    or is_admin()
  );
