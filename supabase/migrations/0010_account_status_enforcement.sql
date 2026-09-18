-- Dele Viaje — Phase 1: actually enforce banned/suspended accounts.
--
-- Migration 0009's admin queue could flip profiles.status to 'banned' /
-- 'suspended', but nothing checked that anywhere — a banned user's
-- existing session kept creating trips, joining trips, and sending chat
-- messages exactly as before. This closes that gap at the three points
-- that matter (create trip, join/leave, send message) without adding a
-- profile lookup to every request (no change to proxy.ts / RLS reads).
--
-- Deliberately not touched: profiles update (editing your own bio while
-- banned is harmless) and report_tickets insert (a banned user should
-- still be able to report something, e.g. to dispute the ban itself).

create or replace function is_active()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- Trip creation: banned/suspended users can't publish new trips.
drop policy if exists "trips: owner creates" on trips;
create policy "trips: owner creates"
  on trips for insert
  with check (owner_id = auth.uid() and is_active());

-- Chat: banned/suspended users can't send (soft-delete/read unaffected).
drop policy if exists "messages: organizer or confirmed member send" on messages;
create policy "messages: organizer or confirmed member send"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and (is_organizer(trip_id) or is_member(trip_id))
    and is_active()
  );

-- join_trip / leave_trip are SECURITY DEFINER (bypass RLS entirely), so
-- they need their own explicit check rather than relying on a policy.
create or replace function join_trip(p_trip_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_trip trips%rowtype;
  v_existing attendees%rowtype;
  v_existing_found boolean;
  v_confirmed_count int;
  v_status text;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_active() then
    raise exception 'ERR_ACCOUNT_NOT_ACTIVE';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_trip_id::text));

  select * into v_trip from trips where id = p_trip_id;
  if not found then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if v_trip.status <> 'published' then
    raise exception 'ERR_TRIP_NOT_JOINABLE';
  end if;
  if v_trip.join_deadline is not null and now() > v_trip.join_deadline then
    raise exception 'ERR_JOIN_DEADLINE_PASSED';
  end if;
  if now() > v_trip.start_at then
    raise exception 'ERR_TRIP_STARTED';
  end if;

  select * into v_existing from attendees
    where trip_id = p_trip_id and profile_id = v_profile_id;
  v_existing_found := found;

  if v_existing_found and v_existing.status in ('confirmed', 'waitlisted') then
    raise exception 'ERR_ALREADY_JOINED';
  end if;

  select count(*) into v_confirmed_count
    from attendees where trip_id = p_trip_id and status = 'confirmed';

  if v_trip.capacity is null or v_confirmed_count < v_trip.capacity then
    v_status := 'confirmed';
  else
    v_status := 'waitlisted';
  end if;

  if v_existing_found then
    update attendees
    set status = v_status, joined_at = now()
    where id = v_existing.id;
  else
    insert into attendees (trip_id, profile_id, status)
    values (p_trip_id, v_profile_id, v_status);
  end if;

  return v_status;
end;
$$;

grant execute on function join_trip(uuid) to authenticated;

-- leave_trip is intentionally NOT gated on is_active(): a banned/suspended
-- user should still be able to give up their seat so someone else can be
-- promoted off the waitlist.
