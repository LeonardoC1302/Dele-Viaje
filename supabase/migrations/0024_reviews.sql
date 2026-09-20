-- Dele Viaje — Phase 2: tour reviews + agency responses. Scoped to
-- tours only (a review is always trip_id-based; an agency's aggregate
-- rating is computed by joining its tours, not a separate
-- reviewee_agency_id column) — simpler than the two-target shape
-- data-model.md sketches, and this app has no other reviewable entity yet
-- (organizer/participant reviews from the PRD aren't built either).
--
-- Gating note: the PRD says "gated to attended + completed", but nothing
-- in this app ever transitions trips.status to 'completed' (no cron, no
-- manual action) — requiring it would make reviews permanently
-- unreachable. Gated instead on the tour's start_at already being in the
-- past AND the reviewer's own attendees.attendance = 'attended' (set by
-- the check-in flow, migration 0025) — reachable today, same practical
-- effect.

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  reviewer_id uuid not null references profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 1000),
  response_text text check (response_text is null or char_length(response_text) between 1 and 1000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, reviewer_id)
);

create index if not exists reviews_trip_idx on reviews (trip_id);

alter table reviews enable row level security;

-- Same "read visibility mirrors the trip" shape as tour_questions —
-- reviews are meant to inform prospective buyers who haven't booked yet.
create policy "reviews: read with trip"
  on reviews for select
  using (
    exists (
      select 1 from trips
      where id = reviews.trip_id
        and (
          (status = 'published' and visibility = 'public')
          or owner_id = auth.uid()
          or is_host_team(id)
          or is_admin()
        )
    )
  );

create policy "reviews: attended reviewer creates"
  on reviews for insert
  with check (
    reviewer_id = auth.uid()
    and is_active()
    and exists (
      select 1 from trips t
      join attendees a on a.trip_id = t.id
      where t.id = trip_id
        and t.type = 'tour'
        and t.start_at < now()
        and a.profile_id = auth.uid()
        and a.attendance = 'attended'
    )
  );

-- Same column-restriction shape as tour_questions: only the response
-- fields are writable, and only by the tour's host team. A reviewer can't
-- edit their own review after posting (matches "no editing" chat/Q&A
-- precedent) and can't be pressured into changing a bad rating.
create policy "reviews: host team responds"
  on reviews for update
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

revoke update on reviews from authenticated;
grant update (response_text, responded_at) on reviews to authenticated;

-- Reviewer can retract their own (unlike tour_questions, where deleting
-- your own question was deliberately disallowed) — a review is a stronger
-- claim about a real experience, and forcing someone to live with a
-- review they regret serves no one. Admin can also remove for moderation.
create policy "reviews: own reviewer or admin deletes"
  on reviews for delete
  using (reviewer_id = auth.uid() or is_admin());
