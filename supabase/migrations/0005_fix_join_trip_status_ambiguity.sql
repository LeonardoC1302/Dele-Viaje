-- Fix "column reference status is ambiguous" in join_trip().
--
-- `returns table (status text)` implicitly declares a PL/pgSQL variable
-- named `status`, which then collides with every unqualified `status`
-- column reference inside the function body (e.g. `where ... and status =
-- 'confirmed'`). Returning a plain scalar removes the collision entirely.

drop function if exists join_trip(uuid);

create function join_trip(p_trip_id uuid)
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
