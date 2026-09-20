-- Multi-date tours: an agency re-runs the same tour on several dates
-- without each date being a disconnected listing. Deliberately NOT a
-- shared-capacity-pool redesign (one `trips` row with several date/
-- capacity sub-rows attendees book against) — that would mean rewriting
-- join_trip()/leave_trip(), the confirmed_count trigger, check-in,
-- payments, and reviews to all understand "which date" for every
-- attendee, a lot of risk for what this needs. Instead, every date is
-- still its own completely independent `trips` row (own capacity, own
-- attendees, own chat, own reviews, own check-in/payment state) —
-- `tour_group_id` just links sibling dates together so the trip detail
-- page can offer a "choose a date" switcher between them. All existing
-- booking/capacity/payment machinery is untouched.
alter table trips add column if not exists tour_group_id uuid references trips (id) on delete set null;

create index if not exists trips_tour_group_idx on trips (tour_group_id);
