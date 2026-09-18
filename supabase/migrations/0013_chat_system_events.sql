-- Dele Viaje — Phase 1: chat system-event messages (join/left/promoted),
-- see docs/prd.md §"System events injected". Deliberately not covering
-- "cancelled"/"host announcements" here — trip cancellation and
-- host-initiated announcements don't have a triggering write yet.

alter table messages drop constraint messages_body_check;
alter table messages alter column sender_id drop not null;

alter table messages add column kind text not null default 'user'
  check (kind in ('user', 'system'));
alter table messages add column event_type text
  check (event_type in ('joined', 'left', 'promoted'));
alter table messages add column actor_id uuid references profiles (id) on delete set null;

alter table messages add constraint messages_body_required_for_user
  check (kind = 'system' or char_length(body) between 1 and 2000);

-- A system row has no sender and no user-authored body — only a canned
-- event_type + actor_id the client renders locally (so it's language-
-- neutral and doesn't need a translation snapshot baked into the row).
alter table messages add constraint messages_system_shape
  check (
    (kind = 'user' and sender_id is not null and body is not null and event_type is null)
    or
    (kind = 'system' and sender_id is null and body is null and event_type is not null and actor_id is not null)
  );

-- Regular users can only ever insert kind='user' rows; system rows only
-- ever come from the SECURITY DEFINER trigger below (which bypasses RLS).
drop policy if exists "messages: organizer or confirmed member send" on messages;
create policy "messages: organizer or confirmed member send"
  on messages for insert
  with check (
    kind = 'user'
    and sender_id = auth.uid()
    and (is_organizer(trip_id) or is_member(trip_id))
    and is_active()
  );

create or replace function post_chat_system_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'confirmed' then
    insert into messages (trip_id, kind, event_type, actor_id)
    values (new.trip_id, 'system', 'joined', new.profile_id);
  elsif tg_op = 'UPDATE' then
    if old.status = 'waitlisted' and new.status = 'confirmed' then
      insert into messages (trip_id, kind, event_type, actor_id)
      values (new.trip_id, 'system', 'promoted', new.profile_id);
    elsif old.status in ('confirmed', 'waitlisted') and new.status = 'cancelled' then
      insert into messages (trip_id, kind, event_type, actor_id)
      values (new.trip_id, 'system', 'left', new.profile_id);
    end if;
  end if;
  return new;
end;
$$;

create trigger attendees_chat_system_event
  after insert or update on attendees
  for each row execute function post_chat_system_event();
