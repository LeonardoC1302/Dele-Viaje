-- Waitlisting itself has existed since migration 0004 (join_trip()
-- confirms if a seat is free, else waitlists; leave_trip() promotes the
-- earliest waitlisted row when a seat frees up) — what's missing is
-- visibility: a waitlisted attendee has no way to know where they stand,
-- and the host team has no roster of who's waiting. The host-team roster
-- needs no new RPC (their existing "organizer/admin manage" / host-team
-- policy already lets them SELECT every waitlisted row directly) — only
-- an individual attendee's own position does, since the "read own or
-- organizer or admin" policy (migration 0004) only ever lets a regular
-- attendee see their *own* row, not the other waitlisted rows ahead of
-- them that a position number would require counting.
create or replace function get_my_waitlist_position(p_trip_id uuid)
returns int
language sql stable
security definer
set search_path = public
as $$
  select count(*)::int + 1
  from attendees a
  where a.trip_id = p_trip_id
    and a.status = 'waitlisted'
    and a.joined_at < (
      select joined_at from attendees
      where trip_id = p_trip_id and profile_id = auth.uid() and status = 'waitlisted'
    );
$$;

grant execute on function get_my_waitlist_position(uuid) to authenticated;
