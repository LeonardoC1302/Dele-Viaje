-- Dele Viaje — trip cancellation with a reason.
--
-- `trips.cancellation_reason` has existed since migration 0003 and had
-- zero references anywhere in the app: a host's only option was deleting
-- the trip, which cascades the attendee rows away and strips it from
-- everyone's My Trips with no explanation at all. For outdoor trips
-- that's the common case, not the edge one — weather closes a trail, a
-- road washes out, the minimum group size isn't met.
--
-- Cancelling keeps the row, the roster, and the chat history, and tells
-- the people who signed up why.

-- Same drop-and-recreate shape 0011 and 0019 used to widen this.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'trip_joined',
    'waitlist_promoted',
    'new_message',
    'new_follower',
    'plan_direct_invite',
    'trip_cancelled'
  ));

/**
 * Cancels a trip and notifies everyone who had a seat or a waitlist spot.
 *
 * SECURITY DEFINER because it does three things a client cannot be
 * trusted to do in sequence: flip a column the grants deliberately
 * withhold, and write notification rows for OTHER profiles. Doing it in
 * one function also makes it atomic — there is no state where the trip
 * is cancelled but nobody was told.
 *
 * Host team only, matching every other write on a trip (is_host_team
 * covers the owner and, for a tour, the agency's active staff).
 */
create or replace function cancel_trip(p_trip_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  if not (is_host_team(p_trip_id) or is_admin()) then
    raise exception 'ERR_FORBIDDEN';
  end if;

  if p_reason is null or char_length(trim(p_reason)) < 3 then
    raise exception 'ERR_REASON_REQUIRED';
  end if;

  select status into v_status from trips where id = p_trip_id;

  if v_status is null then
    raise exception 'ERR_NOT_FOUND';
  end if;

  -- Idempotent: cancelling an already-cancelled trip is a no-op rather
  -- than a second round of notifications to everyone.
  if v_status = 'cancelled' then
    return;
  end if;

  update trips
     set status = 'cancelled',
         cancellation_reason = trim(p_reason),
         updated_at = now()
   where id = p_trip_id;

  -- Everyone who was counting on this trip, including the waitlist —
  -- someone waiting for a seat needs to know the seat will never come.
  insert into notifications (profile_id, type, trip_id, actor_id, data)
  select a.profile_id,
         'trip_cancelled',
         p_trip_id,
         v_uid,
         jsonb_build_object('reason', trim(p_reason))
    from attendees a
   where a.trip_id = p_trip_id
     and a.status in ('confirmed', 'waitlisted')
     and a.profile_id <> v_uid;
end;
$$;

revoke all on function cancel_trip(uuid, text) from public;
grant execute on function cancel_trip(uuid, text) to authenticated;
