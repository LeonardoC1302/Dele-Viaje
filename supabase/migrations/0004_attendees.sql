-- Dele Viaje — Phase 1: attendees (RSVP + waitlist), see docs/data-model.md §3.

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  profile_id uuid not null references profiles (id) on delete cascade,
  status text not null check (status in ('confirmed', 'waitlisted', 'cancelled', 'removed', 'no_show')),
  attendance text check (attendance in ('checked_in', 'attended')),
  joined_at timestamptz not null default now(),
  payment_status text not null default 'none' check (payment_status in ('none', 'pending', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, profile_id)
);

create index if not exists attendees_trip_status_idx on attendees (trip_id, status);
create index if not exists attendees_profile_idx on attendees (profile_id);

alter table attendees enable row level security;

create trigger attendees_set_updated_at
  before update on attendees
  for each row execute function set_updated_at();

-- Keep trips.confirmed_count in sync with actual confirmed attendees.
create or replace function sync_trip_confirmed_count()
returns trigger
language plpgsql
as $$
declare
  affected_trip uuid;
begin
  affected_trip := coalesce(new.trip_id, old.trip_id);

  update trips
  set confirmed_count = (
    select count(*) from attendees
    where trip_id = affected_trip and status = 'confirmed'
  )
  where id = affected_trip;

  return null;
end;
$$;

create trigger attendees_sync_confirmed_count
  after insert or update or delete on attendees
  for each row execute function sync_trip_confirmed_count();

-- RLS helper used by trips/chat/etc policies going forward.
create or replace function is_member(trip_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from attendees
    where trip_id = is_member.trip_id and profile_id = auth.uid() and status = 'confirmed'
  );
$$;

create policy "attendees: read own or organizer or admin"
  on attendees for select
  using (
    profile_id = auth.uid()
    or is_organizer(trip_id)
    or is_admin()
  );

-- Regular users never insert/update attendees directly; join_trip() and
-- leave_trip() below (SECURITY DEFINER) own that so seat-capping and
-- waitlist promotion stay race-free under concurrent joins. Organizers/
-- admins can still manage rows directly (e.g. manual removal later).
create policy "attendees: organizer/admin manage"
  on attendees for all
  using (is_organizer(trip_id) or is_admin())
  with check (is_organizer(trip_id) or is_admin());

-- Transactional join: confirms if a seat is free, else waitlists. Locked
-- per-trip so concurrent joins can't oversell the last seat.
create or replace function join_trip(p_trip_id uuid)
returns table (status text)
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

  return query select v_status;
end;
$$;

grant execute on function join_trip(uuid) to authenticated;

-- Cancel own spot; if it was confirmed, promote the longest-waiting
-- waitlisted attendee (by joined_at) into the freed seat, transactionally.
create or replace function leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_existing attendees%rowtype;
  v_next_waitlisted attendees%rowtype;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_trip_id::text));

  select * into v_existing from attendees
    where trip_id = p_trip_id and profile_id = v_profile_id;

  if not found or v_existing.status not in ('confirmed', 'waitlisted') then
    raise exception 'ERR_NOT_JOINED';
  end if;

  update attendees set status = 'cancelled' where id = v_existing.id;

  if v_existing.status = 'confirmed' then
    select * into v_next_waitlisted from attendees
      where trip_id = p_trip_id and status = 'waitlisted'
      order by joined_at asc
      limit 1;

    if found then
      update attendees set status = 'confirmed' where id = v_next_waitlisted.id;
    end if;
  end if;
end;
$$;

grant execute on function leave_trip(uuid) to authenticated;
