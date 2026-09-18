-- Dele Viaje — Phase 1: in-app notifications. First slice of the
-- notifications item in docs/roadmap.md — in-app inbox only for now; Web
-- Push / Resend email / T-24h/T-2h reminders are separate follow-ups, not
-- covered here.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  type text not null check (type in ('trip_joined', 'waitlist_promoted', 'new_message')),
  trip_id uuid references trips (id) on delete cascade,
  actor_id uuid references profiles (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_created_idx
  on notifications (profile_id, created_at desc);
create index if not exists notifications_profile_unread_idx
  on notifications (profile_id) where read_at is null;

alter table notifications enable row level security;

-- Notifications are only ever created server-side (via the trigger
-- functions below, SECURITY DEFINER), never inserted directly by users —
-- so there's no insert policy for `authenticated`, only read + mark-as-read.
create policy "notifications: read own"
  on notifications for select
  using (profile_id = auth.uid());

create policy "notifications: mark own as read"
  on notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

revoke update on notifications from authenticated;
grant update (read_at) on notifications to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;

-- Notify the organizer when someone confirms a seat (waitlisted joins stay
-- quiet — the organizer already knows the trip is full).
create or replace function notify_trip_joined()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    return new;
  end if;

  select owner_id into v_owner_id from trips where id = new.trip_id;

  if v_owner_id is not null and v_owner_id <> new.profile_id then
    insert into notifications (profile_id, type, trip_id, actor_id)
    values (v_owner_id, 'trip_joined', new.trip_id, new.profile_id);
  end if;

  return new;
end;
$$;

create trigger attendees_notify_joined
  after insert or update on attendees
  for each row execute function notify_trip_joined();

-- Notify the attendee themselves when they're promoted off the waitlist.
create or replace function notify_waitlist_promoted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'waitlisted' and new.status = 'confirmed' then
    insert into notifications (profile_id, type, trip_id)
    values (new.profile_id, 'waitlist_promoted', new.trip_id);
  end if;

  return new;
end;
$$;

create trigger attendees_notify_promoted
  after update on attendees
  for each row execute function notify_waitlist_promoted();

-- Notify every other participant (organizer + confirmed/waitlisted
-- attendees) when a new chat message lands.
create or replace function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id from trips where id = new.trip_id;

  insert into notifications (profile_id, type, trip_id, actor_id, data)
  select recipient, 'new_message', new.trip_id, new.sender_id,
    jsonb_build_object('preview', left(new.body, 140))
  from (
    select v_owner_id as recipient
    union
    select profile_id from attendees
    where trip_id = new.trip_id and status in ('confirmed', 'waitlisted')
  ) recipients
  where recipient is not null and recipient <> new.sender_id;

  return new;
end;
$$;

create trigger messages_notify_new
  after insert on messages
  for each row execute function notify_new_message();
