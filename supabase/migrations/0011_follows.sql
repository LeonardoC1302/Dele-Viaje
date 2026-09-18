-- Dele Viaje — Phase 1: follows, see docs/data-model.md §"follows" and
-- docs/api.md §"/api/follows". Following an agency's owner profile is the
-- same table (data-model note), no agency-specific column needed yet.

create table if not exists follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  followed_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists follows_followed_idx on follows (followed_id);

alter table follows enable row level security;

create policy "follows: read public"
  on follows for select
  using (true);

create policy "follows: create own"
  on follows for insert
  with check (follower_id = auth.uid() and is_active());

create policy "follows: delete own"
  on follows for delete
  using (follower_id = auth.uid());

-- Extend notifications.type to cover the new-follower event (PRD §"Social"
-- notification list already includes it; migration 0008 only had the three
-- trip/chat events that existed at the time).
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('trip_joined', 'waitlist_promoted', 'new_message', 'new_follower'));

create or replace function notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (profile_id, type, actor_id)
  values (new.followed_id, 'new_follower', new.follower_id);
  return new;
end;
$$;

create trigger follows_notify_new
  after insert on follows
  for each row execute function notify_new_follower();
