-- Dele Viaje — Phase 2: tour Q&A. Anyone can ask a public question about a
-- tour (visible to every other prospective buyer, unlike a private DM to
-- the agency); only the agency's own staff can answer. Tours only — social
-- trips already have chat for this, and private plans aren't a public
-- listing anyone browses in the first place.

create table if not exists tour_questions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  asked_by uuid not null references profiles (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  answer text check (answer is null or char_length(answer) between 1 and 1000),
  answered_by uuid references profiles (id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tour_questions_trip_idx on tour_questions (trip_id, created_at);

alter table tour_questions enable row level security;

-- Read visibility mirrors the trip itself: anyone who could read the tour
-- (published+public, or host team, or admin) can read its Q&A. Not scoped
-- to "did you book this tour" — the whole point is helping prospective
-- buyers who haven't booked yet.
create policy "tour_questions: read with trip"
  on tour_questions for select
  using (
    exists (
      select 1 from trips
      where id = tour_questions.trip_id
        and (
          (status = 'published' and visibility = 'public')
          or owner_id = auth.uid()
          or is_host_team(id)
          or is_admin()
        )
    )
  );

-- Any active user can ask, on a tour specifically (not a social trip or
-- private plan — those have chat instead).
create policy "tour_questions: ask on a tour"
  on tour_questions for insert
  with check (
    asked_by = auth.uid()
    and is_active()
    and exists (select 1 from trips where id = trip_id and type = 'tour')
  );

-- Only the answer/answered_by/answered_at columns are writable, and only
-- by the tour's host team — a question's own text is never editable by
-- anyone once posted, same "no editing" posture chat messages already
-- have. Column grant enforces this regardless of what the row policy
-- would otherwise allow through with_check.
create policy "tour_questions: host team answers"
  on tour_questions for update
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());

revoke update on tour_questions from authenticated;
grant update (answer, answered_by, answered_at) on tour_questions to authenticated;

-- Moderation only — the asker can't retract their own question (keeps the
-- public Q&A archive trustworthy: an agency can't have someone ask an
-- awkward question and then quietly delete it, and a buyer can't game the
-- record either). Same "host team delete" shape as packing_items/polls.
create policy "tour_questions: host team or admin delete"
  on tour_questions for delete
  using (is_host_team(trip_id) or is_admin());
