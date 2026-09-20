-- Dele Viaje — Phase 3 fix: the organizer of a private plan was never
-- added to `attendees`, so they didn't show up as an assignable member in
-- the packing list, weren't counted in the budget split, and had no way
-- to appear in their own attendee list. Unlike a public trip (where
-- "organizing" is deliberately a separate role from "attending"), a
-- private plan's owner is a full participant by default.

-- Bug fix folded in here (caught when this migration was first pushed):
-- migration 0013 dropped `sender_id`'s NOT NULL for system chat messages
-- but missed `body`, even though the shape check added in that same
-- migration (`messages_system_shape`) already required `body is null` for
-- `kind = 'system'` rows. Every "joined the trip" system-message insert
-- (post_chat_system_event(), also from 0013) was therefore always
-- violating a NOT NULL constraint on body — including this migration's
-- own backfill below, which is what surfaced it. Fixing forward here
-- rather than editing 0013, which was already applied.
alter table messages alter column body drop not null;

-- Backfill: the one private plan created before this fix.
insert into attendees (trip_id, profile_id, status)
select id, owner_id, 'confirmed'
from trips
where visibility = 'private'
on conflict (trip_id, profile_id) do update set status = 'confirmed';

-- Going forward: auto-join the owner the moment a private plan is created.
create or replace function join_owner_to_private_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.visibility = 'private' then
    insert into attendees (trip_id, profile_id, status)
    values (new.id, new.owner_id, 'confirmed')
    on conflict (trip_id, profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trips_join_owner_to_private_plan
  after insert on trips
  for each row execute function join_owner_to_private_plan();
