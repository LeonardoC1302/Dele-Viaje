-- Dele Viaje — Phase 3 leftovers: direct (email) invites, leaving a plan,
-- owner transfer, and auto-archiving a plan that empties out. Itinerary UI
-- needed no schema changes (0016 already created itinerary_blocks + RLS).
-- Shared docs is still deliberately out of scope — see PROJECT_STATUS.md.

-- 'archived' is the new terminal state for a private plan whose last
-- member left. Nothing currently sets the other statuses on a plan (they
-- stay 'published' from creation, see POST /api/trips) — 'archived' is
-- additive, not a replacement for anything.
alter table trips drop constraint trips_status_check;
alter table trips add constraint trips_status_check
  check (status in ('draft', 'published', 'full', 'in_progress', 'completed', 'cancelled', 'suspended', 'archived'));

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('trip_joined', 'waitlist_promoted', 'new_message', 'new_follower', 'plan_direct_invite'));

-- Direct (email) invites reuse plan_invites end-to-end (same token, same
-- accept_plan_invite() flow, same expiry/revoke) — the only difference is
-- who's allowed to redeem it. NULL here (the existing behaviour) means "a
-- bearer link invite", same as before this column existed.
alter table plan_invites add column if not exists invited_profile_id uuid references profiles (id) on delete cascade;

-- A direct invite is only "for" the profile it names; without this check
-- accept_plan_invite() would treat it as a bearer token like a link invite.
-- create or replace targets the function created in 0016 — never editing
-- an applied migration, just layering a new definition on top of it, same
-- as every other fix-forward function change in this project.
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
  if v_invite.invited_profile_id is not null and v_invite.invited_profile_id <> v_profile_id then
    raise exception 'ERR_INVITE_NOT_FOR_YOU';
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

-- Host-team-only. Looks the invitee up by email in auth.users — profiles
-- has no email/username column (see PROJECT_STATUS.md), so this can't be
-- done as an RLS-scoped client query; a SECURITY DEFINER function running
-- as the table owner can read auth.users directly, no service-role key or
-- admin API call needed from the app. Reuses plan_invites/accept_plan_invite
-- rather than adding a second invite mechanism — a direct invite is just a
-- link invite pre-addressed to one profile, delivered via in-app
-- notification instead of a copy-pasted URL (no Resend/email yet).
create or replace function create_direct_plan_invite(p_trip_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_trip trips%rowtype;
  v_target_id uuid;
  v_token uuid;
begin
  if v_actor_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_active() then
    raise exception 'ERR_ACCOUNT_NOT_ACTIVE';
  end if;

  select * into v_trip from trips where id = p_trip_id;
  if not found or v_trip.visibility <> 'private' then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if not is_host_team(p_trip_id) then
    raise exception 'ERR_FORBIDDEN';
  end if;

  select id into v_target_id from auth.users where lower(email) = lower(p_email) limit 1;
  if v_target_id is null then
    raise exception 'ERR_USER_NOT_FOUND';
  end if;
  if v_target_id = v_actor_id then
    raise exception 'ERR_CANNOT_INVITE_SELF';
  end if;
  if exists (
    select 1 from attendees
    where trip_id = p_trip_id and profile_id = v_target_id and status = 'confirmed'
  ) then
    raise exception 'ERR_ALREADY_MEMBER';
  end if;

  insert into plan_invites (trip_id, created_by, expires_at, max_uses, invited_profile_id)
  values (p_trip_id, v_actor_id, now() + interval '30 days', 1, v_target_id)
  returning token into v_token;

  -- Stash the token *and* the trip title in `data`: the invitee can't read
  -- the private trip row via RLS until they accept, so the bell can't join
  -- against `trips` for a title the way it does for other notification
  -- types (same reasoning `new_message` already stashes a `preview`).
  insert into notifications (profile_id, type, trip_id, actor_id, data)
  values (
    v_target_id, 'plan_direct_invite', p_trip_id, v_actor_id,
    jsonb_build_object('token', v_token, 'tripTitle', v_trip.title)
  );

  return v_token;
end;
$$;

grant execute on function create_direct_plan_invite(uuid, text) to authenticated;

-- Leaving is only meaningful for private plans (public-trip attendance uses
-- leave_trip(), which also handles waitlist promotion that doesn't apply
-- here). The owner can't leave via this path — see the comment on
-- transfer_plan_ownership() below for why, and DeleteTripButton for the
-- "I'm the only one left" escape hatch.
create or replace function leave_plan(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_trip trips%rowtype;
  v_updated int;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  select * into v_trip from trips where id = p_trip_id;
  if not found or v_trip.visibility <> 'private' then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if v_trip.owner_id = v_profile_id then
    raise exception 'ERR_OWNER_MUST_TRANSFER';
  end if;

  update attendees set status = 'cancelled'
    where trip_id = p_trip_id and profile_id = v_profile_id and status = 'confirmed';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'ERR_NOT_MEMBER';
  end if;
end;
$$;

grant execute on function leave_plan(uuid) to authenticated;

-- Owner-only. The new owner must already be a confirmed member — this
-- hands off an existing relationship rather than inviting someone new into
-- the role. Deliberately doesn't touch the old owner's own attendees row:
-- they stay a regular confirmed member (and can now leave_plan() normally)
-- unless they leave separately.
create or replace function transfer_plan_ownership(p_trip_id uuid, p_new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_trip trips%rowtype;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  select * into v_trip from trips where id = p_trip_id;
  if not found or v_trip.visibility <> 'private' then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if v_trip.owner_id <> v_profile_id then
    raise exception 'ERR_FORBIDDEN';
  end if;
  if p_new_owner_id = v_profile_id then
    raise exception 'ERR_ALREADY_OWNER';
  end if;
  if not exists (
    select 1 from attendees
    where trip_id = p_trip_id and profile_id = p_new_owner_id and status = 'confirmed'
  ) then
    raise exception 'ERR_NOT_MEMBER';
  end if;

  update trips set owner_id = p_new_owner_id where id = p_trip_id;
end;
$$;

grant execute on function transfer_plan_ownership(uuid, uuid) to authenticated;

-- Auto-archive: a private plan that drops to zero confirmed members (in
-- practice, only reachable today via an admin/organizer directly clearing
-- attendees — the owner can't leave_plan() without transferring first, and
-- transferring always leaves the new owner confirmed) gets marked archived
-- rather than left as an invisible-to-everyone-but-the-owner zombie row.
-- Separate trigger from sync_trip_confirmed_count() (migration 0004) rather
-- than folding into it, since that trigger is already applied.
create or replace function archive_empty_private_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip trips%rowtype;
  v_confirmed_count int;
begin
  select * into v_trip from trips where id = coalesce(new.trip_id, old.trip_id);
  if not found or v_trip.visibility <> 'private' or v_trip.status = 'archived' then
    return null;
  end if;

  select count(*) into v_confirmed_count
    from attendees where trip_id = v_trip.id and status = 'confirmed';

  if v_confirmed_count = 0 then
    update trips set status = 'archived' where id = v_trip.id;
  end if;

  return null;
end;
$$;

create trigger attendees_archive_empty_plan
  after update or delete on attendees
  for each row execute function archive_empty_private_plan();
