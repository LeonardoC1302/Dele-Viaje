-- Dele Viaje — Phase 1: report tickets + super-admin moderation queue,
-- see docs/data-model.md §"report_tickets" and docs/api.md §8. Banning
-- (profiles.role/status) and trip suspension (trips.status) already have
-- admin-only RLS coverage from migrations 0001/0003 ("admin manage all" /
-- "admin" branches) — no new RPCs needed there, just admin-gated UI.

create table if not exists report_tickets (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('trip', 'user', 'message', 'review', 'agency', 'plan')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 200),
  description text check (char_length(description) <= 2000),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists report_tickets_status_created_idx
  on report_tickets (status, created_at desc);
create index if not exists report_tickets_reporter_idx on report_tickets (reporter_id);

alter table report_tickets enable row level security;

create policy "report_tickets: reporter create"
  on report_tickets for insert
  with check (reporter_id = auth.uid());

create policy "report_tickets: reporter read own or admin"
  on report_tickets for select
  using (reporter_id = auth.uid() or is_admin());

create policy "report_tickets: admin resolve"
  on report_tickets for update
  using (is_admin())
  with check (is_admin());
