-- Dele Viaje — Phase 3: private plans + workspace, see docs/prd.md §4.5 and
-- docs/data-model.md §5. A "private plan" is not a new entity — it's a
-- `trips` row with visibility='private'; membership reuses `attendees`
-- (status='confirmed'), exactly like a social trip, just gated by invite
-- instead of open RSVP (no waitlist, no capacity queue — join_trip()/
-- leave_trip() are NOT used here at all).

-- Private trips were always schema-ready (visibility column existed since
-- migration 0003) but POST /api/trips hardcoded visibility='public' and
-- nothing could ever read a private trip back. Fix the read side first.
drop policy if exists "trips: read published public, or own, or admin" on trips;
create policy "trips: read published public, own, member, or admin"
  on trips for select
  using (
    (status = 'published' and visibility = 'public')
    or owner_id = auth.uid()
    or is_member(id)
    or is_admin()
  );

-- Alias for the "host team" concept in docs/data-model.md (organizer OR,
-- once agencies exist, agency staff). No agency staff yet, so this is
-- just is_organizer() today — kept as its own function so the Phase 2
-- agency-staff addition is a one-line change here, not a find-and-replace
-- across every policy below.
create or replace function is_host_team(trip_id uuid)
returns boolean
language sql stable
as $$
  select is_organizer(trip_id);
$$;

-- Invite links (the "link with expiry" flow from the PRD). Direct
-- username/email invites are NOT implemented in this pass — see
-- PROJECT_STATUS.md.
create table if not exists plan_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_by uuid not null references profiles (id) on delete cascade,
  expires_at timestamptz not null,
  max_uses int,
  uses int not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists plan_invites_trip_idx on plan_invites (trip_id);

alter table plan_invites enable row level security;

-- No public select policy: a token is a bearer secret, looked up only by
-- accept_plan_invite() below (SECURITY DEFINER, bypasses RLS). The host
-- team still needs to list/manage their own trip's invites.
create policy "plan_invites: host team read"
  on plan_invites for select
  using (is_host_team(trip_id) or is_admin());

create policy "plan_invites: host team create"
  on plan_invites for insert
  with check (is_host_team(trip_id) and created_by = auth.uid() and is_active());

create policy "plan_invites: host team revoke"
  on plan_invites for update
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

-- Validates and redeems an invite token: joins the plan as a confirmed
-- member (no waitlist/capacity check — private plans don't have one).
-- Idempotent if already a member. SECURITY DEFINER because a non-member
-- has no RLS access to plan_invites or attendees for this trip yet.
create or replace function accept_plan_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_invite plan_invites%rowtype;
  v_existing attendees%rowtype;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_active() then
    raise exception 'ERR_ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_invite from plan_invites where token = p_token;
  if not found or v_invite.revoked_at is not null then
    raise exception 'ERR_INVITE_INVALID';
  end if;
  if now() > v_invite.expires_at then
    raise exception 'ERR_INVITE_EXPIRED';
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'ERR_INVITE_EXHAUSTED';
  end if;

  select * into v_existing from attendees
    where trip_id = v_invite.trip_id and profile_id = v_profile_id;

  if found and v_existing.status = 'confirmed' then
    return v_invite.trip_id;
  end if;

  if found then
    update attendees set status = 'confirmed', joined_at = now() where id = v_existing.id;
  else
    insert into attendees (trip_id, profile_id, status)
    values (v_invite.trip_id, v_profile_id, 'confirmed');
  end if;

  update plan_invites set uses = uses + 1 where id = v_invite.id;

  return v_invite.trip_id;
end;
$$;

grant execute on function accept_plan_invite(uuid) to authenticated;

-- Read-only preview for the invite-landing page: lets a not-yet-member see
-- "You're invited to X" (and why an invite can't be used, if it can't)
-- without granting general access to plan_invites/trips. SECURITY DEFINER,
-- read-only, no mutation.
create or replace function preview_plan_invite(p_token uuid)
returns table (trip_id uuid, title text, description text, is_valid boolean, reason text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_invite plan_invites%rowtype;
  v_trip trips%rowtype;
begin
  select * into v_invite from plan_invites where token = p_token;
  if not found then
    return query select null::uuid, null::text, null::text, false, 'invalid';
    return;
  end if;

  select * into v_trip from trips where id = v_invite.trip_id;

  if v_invite.revoked_at is not null then
    return query select v_trip.id, v_trip.title, v_trip.description, false, 'revoked';
  elsif now() > v_invite.expires_at then
    return query select v_trip.id, v_trip.title, v_trip.description, false, 'expired';
  elsif v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    return query select v_trip.id, v_trip.title, v_trip.description, false, 'exhausted';
  else
    return query select v_trip.id, v_trip.title, v_trip.description, true, null::text;
  end if;
end;
$$;

grant execute on function preview_plan_invite(uuid) to authenticated;

-- Packing list + "prerequisites" (a prerequisite is just an item with
-- assigned_to set — same table, per docs/data-model.md).
create table if not exists packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  done boolean not null default false,
  done_by uuid references profiles (id) on delete set null,
  assigned_to uuid references profiles (id) on delete set null,
  created_by uuid not null references profiles (id) on delete cascade,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists packing_items_trip_idx on packing_items (trip_id, sort);

alter table packing_items enable row level security;

create policy "packing_items: members read"
  on packing_items for select
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "packing_items: members create"
  on packing_items for insert
  with check (
    (is_member(trip_id) or is_host_team(trip_id))
    and created_by = auth.uid()
    and is_active()
  );

create policy "packing_items: members update (toggle done, reassign)"
  on packing_items for update
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin())
  with check (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "packing_items: host team delete"
  on packing_items for delete
  using (is_host_team(trip_id) or is_admin());

-- Expenses. Split is computed client-side from active members, never
-- stored (per docs/data-model.md — avoids it going stale as membership
-- changes).
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  paid_by uuid not null references profiles (id) on delete cascade,
  amount_crc int not null check (amount_crc > 0),
  description text not null check (char_length(description) between 1 and 200),
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_idx on expenses (trip_id);

alter table expenses enable row level security;

create policy "expenses: members read"
  on expenses for select
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "expenses: members create"
  on expenses for insert
  with check (
    (is_member(trip_id) or is_host_team(trip_id))
    and paid_by = auth.uid()
    and is_active()
  );

create policy "expenses: creator or host team delete"
  on expenses for delete
  using (paid_by = auth.uid() or is_host_team(trip_id) or is_admin());

-- Polls.
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  options jsonb not null,
  closes_at timestamptz,
  created_by uuid not null references profiles (id) on delete cascade,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint polls_options_shape check (jsonb_typeof(options) = 'array')
);

create index if not exists polls_trip_idx on polls (trip_id);

alter table polls enable row level security;

create policy "polls: members read"
  on polls for select
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "polls: members create"
  on polls for insert
  with check (
    (is_member(trip_id) or is_host_team(trip_id))
    and created_by = auth.uid()
    and is_active()
  );

create policy "polls: creator or host team close/delete"
  on polls for update
  using (created_by = auth.uid() or is_host_team(trip_id) or is_admin())
  with check (created_by = auth.uid() or is_host_team(trip_id) or is_admin());

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  option_key text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, profile_id)
);

alter table poll_votes enable row level security;

-- Membership for a vote is checked via the parent poll's trip, not stored
-- redundantly on poll_votes itself.
create policy "poll_votes: members read"
  on poll_votes for select
  using (
    exists (
      select 1 from polls
      where polls.id = poll_votes.poll_id
        and (is_member(polls.trip_id) or is_host_team(polls.trip_id) or is_admin())
    )
  );

create policy "poll_votes: members vote (toggleable)"
  on poll_votes for all
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and is_active()
    and exists (
      select 1 from polls
      where polls.id = poll_votes.poll_id
        and (is_member(polls.trip_id) or is_host_team(polls.trip_id))
    )
  );

-- trip_docs: schema only in this pass. File upload UI + a private Storage
-- bucket with signed-URL access are NOT implemented yet — see
-- PROJECT_STATUS.md.
create table if not exists trip_docs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  size int not null,
  mime text not null,
  storage_path text not null,
  uploaded_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists trip_docs_trip_idx on trip_docs (trip_id);

alter table trip_docs enable row level security;

create policy "trip_docs: members read"
  on trip_docs for select
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "trip_docs: members upload"
  on trip_docs for insert
  with check (
    (is_member(trip_id) or is_host_team(trip_id))
    and uploaded_by = auth.uid()
    and is_active()
  );

create policy "trip_docs: host team delete"
  on trip_docs for delete
  using (is_host_team(trip_id) or is_admin());

-- Itinerary blocks — listed as a Phase 1 roadmap item but never built;
-- reused here since private plans need it too. UI NOT implemented yet for
-- either public trips or plans — see PROJECT_STATUS.md.
create table if not exists itinerary_blocks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  day_index int not null default 0 check (day_index >= 0),
  start_time time,
  label text not null check (char_length(label) between 1 and 160),
  description text,
  photo_url text,
  sort int not null default 0,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists itinerary_blocks_trip_idx on itinerary_blocks (trip_id, day_index, sort);

alter table itinerary_blocks enable row level security;

create policy "itinerary_blocks: read with trip"
  on itinerary_blocks for select
  using (
    exists (
      select 1 from trips
      where id = itinerary_blocks.trip_id
        and ((status = 'published' and visibility = 'public') or owner_id = auth.uid() or is_member(id) or is_admin())
    )
  );

-- Public social trips: host team only. Private plans: all members. Same
-- policy handles both since is_member()/is_host_team() cover each case.
create policy "itinerary_blocks: write per trip visibility"
  on itinerary_blocks for insert
  with check (
    created_by = auth.uid()
    and is_active()
    and (
      is_host_team(trip_id)
      or (is_member(trip_id) and exists (select 1 from trips where id = trip_id and visibility = 'private'))
    )
  );

create policy "itinerary_blocks: owner/cohost edit or delete"
  on itinerary_blocks for update
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

create policy "itinerary_blocks: owner/cohost delete"
  on itinerary_blocks for delete
  using (is_host_team(trip_id) or is_admin());
