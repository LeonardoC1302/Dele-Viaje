-- Dele Viaje — Phase 2: check-in (manual, no camera/QR scanning this
-- pass — see PROJECT_STATUS.md). Marks a confirmed attendee's
-- `attendees.attendance` as 'attended' (column already existed since
-- migration 0004, just never had a write path). This is also what
-- reviews (migration 0024) gate on.
--
-- Real gap this closes: "attendees: organizer/admin manage" (migration
-- 0004) only ever checked is_organizer(trip_id) — fine when every trip's
-- host was a single person, but for a tour, any of the agency's staff
-- should be able to check someone in, not just whoever's profile happens
-- to be trips.owner_id. Same fix-forward shape as 0020/0022: drop and
-- recreate rather than editing the applied 0004 policy.
drop policy if exists "attendees: organizer/admin manage" on attendees;
create policy "attendees: host team or admin manage"
  on attendees for all
  using (is_host_team(trip_id) or is_admin())
  with check (is_host_team(trip_id) or is_admin());
