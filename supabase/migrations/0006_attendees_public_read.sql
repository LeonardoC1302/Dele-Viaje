-- Let anyone see who's confirmed on a published public trip (the "who's
-- going" list), matching typical social-trip UX. Waitlisted/cancelled/
-- removed rows stay visible only to the attendee themselves, the
-- organizer, or an admin (no reason to broadcast waitlist status).

create policy "attendees: public read confirmed on public trips"
  on attendees for select
  using (
    status = 'confirmed'
    and exists (
      select 1 from trips
      where trips.id = attendees.trip_id
        and trips.visibility = 'public'
        and trips.status = 'published'
    )
  );
