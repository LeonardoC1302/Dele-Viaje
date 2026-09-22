-- Dele Viaje — rate limiting.
--
-- docs/architecture.md §12 commits to rate limits on invite generation,
-- chat send, review posting and RSVP flips. None existed: one script
-- could generate unlimited invites or flood a trip's chat.
--
-- WHY IN THE DATABASE RATHER THAN IN ROUTE HANDLERS
-- Two of the four paths never touch a route handler at all — chat
-- messages and reviews are inserted straight from the browser with the
-- user's own JWT (components/chat/chat-room.tsx,
-- components/agencies/tour-reviews.tsx). A limiter in a route handler
-- would not see them, and a limiter that only lives in application code
-- is bypassable by calling PostgREST directly with the same token. A
-- trigger is the only place that covers every caller.
--
-- WHY NOT AN IN-MEMORY COUNTER
-- The deploy target is serverless (Vercel), where each invocation has
-- its own memory, so an in-process counter resets constantly and
-- enforces nothing. Postgres is the only shared state this stack has,
-- and per the "free stack only" principle there is no Redis to reach
-- for.

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

-- The only access pattern: "how many of this action by this user since
-- T". created_at descending so the window scan stops early.
create index if not exists rate_limit_events_lookup_idx
  on rate_limit_events (profile_id, action, created_at desc);

-- RLS on with no policies at all: this table is infrastructure, not
-- content. Nothing should read or write it except the SECURITY DEFINER
-- function below, which bypasses RLS by design. Leaving it without
-- policies is the deny-all default, which is what we want.
alter table rate_limit_events enable row level security;

/**
 * Records one occurrence of `p_action` for the calling user, or raises
 * if they are already at the limit for the window.
 *
 * Raises `ERR_RATE_LIMITED`, matching the ERR_* convention the other
 * functions in this schema use (see join_trip in 0004/0005) so route
 * handlers and client code can branch on the message.
 */
create or replace function enforce_rate_limit(
  p_action text,
  p_max int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  -- Server-side work runs with the secret key and no JWT, so auth.uid()
  -- is null. Never throttle the platform's own operations (admin
  -- actions, triggers acting on someone else's behalf, seed scripts).
  if v_uid is null then
    return;
  end if;

  -- Opportunistic prune, so the table stays small without a cron job.
  -- Keeps a few windows of history rather than exactly one, which makes
  -- the counts below stable even if clocks wobble slightly.
  delete from rate_limit_events
   where profile_id = v_uid
     and action = p_action
     and created_at < now() - (p_window * 4);

  select count(*)
    into v_count
    from rate_limit_events
   where profile_id = v_uid
     and action = p_action
     and created_at > now() - p_window;

  if v_count >= p_max then
    raise exception 'ERR_RATE_LIMITED' using errcode = '53400';
  end if;

  insert into rate_limit_events (profile_id, action) values (v_uid, p_action);
end;
$$;

revoke all on function enforce_rate_limit(text, int, interval) from public;
grant execute on function enforce_rate_limit(text, int, interval) to authenticated;

/* ---------------------------------------------------------------------
   Chat: 20 messages per minute.
   Generous for a real conversation (a fast typer sends maybe 10), low
   enough that a script can't fill a room. Guarded on sender_id so a
   system event row written on someone's behalf isn't charged to them.
   --------------------------------------------------------------------- */
create or replace function rl_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_id = auth.uid() then
    perform enforce_rate_limit('chat_send', 20, interval '1 minute');
  end if;
  return new;
end;
$$;

drop trigger if exists messages_rate_limit on messages;
create trigger messages_rate_limit
  before insert on messages
  for each row execute function rl_messages();

/* ---------------------------------------------------------------------
   Reviews: 5 per hour. A reviewer can only review a tour they actually
   attended, so the realistic ceiling is already low; this stops a
   compromised account from carpet-bombing an agency's rating.
   --------------------------------------------------------------------- */
create or replace function rl_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reviewer_id = auth.uid() then
    perform enforce_rate_limit('review_post', 5, interval '1 hour');
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_rate_limit on reviews;
create trigger reviews_rate_limit
  before insert on reviews
  for each row execute function rl_reviews();

/* ---------------------------------------------------------------------
   Plan invites: 20 per hour. Invite tokens are the one thing here that
   grants access to private content, so unbounded generation is the
   highest-value abuse in the app.
   --------------------------------------------------------------------- */
create or replace function rl_plan_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by = auth.uid() then
    perform enforce_rate_limit('invite_create', 20, interval '1 hour');
  end if;
  return new;
end;
$$;

drop trigger if exists plan_invites_rate_limit on plan_invites;
create trigger plan_invites_rate_limit
  before insert on plan_invites
  for each row execute function rl_plan_invites();

/* ---------------------------------------------------------------------
   RSVP flips: 20 per hour.

   This one needs INSERT *and* UPDATE. join_trip() (0004/0005) updates an
   existing row when the user has joined before and only inserts on a
   first join — so an INSERT-only trigger would miss the join/leave/
   rejoin churn that "RSVP flips" actually names.

   Both guards matter:
     - `new.profile_id = auth.uid()` so waitlist auto-promotion, which
       updates OTHER people's rows inside the leaver's transaction, is
       not charged to the leaver.
     - the status-changed check so host-team check-in (attendance) and
       payment confirmation (payment_status), which update the same rows
       without touching status, are not counted as RSVP activity.
   --------------------------------------------------------------------- */
create or replace function rl_attendees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id = auth.uid()
     and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    perform enforce_rate_limit('rsvp_flip', 20, interval '1 hour');
  end if;
  return new;
end;
$$;

drop trigger if exists attendees_rate_limit on attendees;
create trigger attendees_rate_limit
  before insert or update on attendees
  for each row execute function rl_attendees();
