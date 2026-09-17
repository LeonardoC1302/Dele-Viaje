-- Dele Viaje — Phase 1: trip chat (messages), see docs/data-model.md §4 and
-- PRD §4.4. Editing is out of scope for this pass; delete is soft (sets
-- deleted_at) so history stays authoritative for other members.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_trip_created_idx on messages (trip_id, created_at);

alter table messages enable row level security;

-- Who can read/write a trip's chat: organizer + confirmed attendees can
-- send; waitlisted attendees can read only (per PRD §4.4).
create or replace function is_trip_participant(trip_id uuid)
returns boolean
language sql stable
as $$
  select
    is_organizer(trip_id)
    or exists (
      select 1 from attendees
      where trip_id = is_trip_participant.trip_id
        and profile_id = auth.uid()
        and status in ('confirmed', 'waitlisted')
    );
$$;

create policy "messages: participants read"
  on messages for select
  using (is_trip_participant(trip_id) or is_admin());

create policy "messages: organizer or confirmed member send"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and (is_organizer(trip_id) or is_member(trip_id))
  );

-- Soft-delete only (own message, or organizer/admin moderating). The
-- column grants below ensure this UPDATE can only ever touch deleted_at,
-- never body/sender_id, even though the row-level policy is broader.
create policy "messages: sender or organizer soft-delete"
  on messages for update
  using (sender_id = auth.uid() or is_organizer(trip_id) or is_admin())
  with check (sender_id = auth.uid() or is_organizer(trip_id) or is_admin());

revoke update on messages from authenticated;
grant update (deleted_at) on messages to authenticated;

-- Enable Realtime postgres_changes for this table (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
