-- Dele Viaje — Phase 1: badges, see docs/data-model.md §"badges" +
-- "user_badges" and docs/prd.md §4.7. Manual admin grant/revoke only for
-- now (auto-rules like fast_responder/great_host need chat-latency
-- tracking and reviews, neither of which exist yet — reviews are Phase 2).

create table if not exists badges (
  code text primary key,
  label_es text not null,
  label_en text not null,
  icon text not null
);

insert into badges (code, label_es, label_en, icon) values
  ('verified_agency', 'Agencia verificada', 'Verified agency', 'seal-check'),
  ('fast_responder', 'Responde rápido', 'Fast responder', 'lightning'),
  ('host_10', 'Organizó 10+ viajes', 'Hosted 10+ trips', 'mountains'),
  ('great_host', 'Gran anfitrión', 'Great host', 'star'),
  ('good_participant', 'Buen participante', 'Good participant', 'thumbs-up')
on conflict (code) do nothing;

alter table badges enable row level security;

create policy "badges: read public"
  on badges for select
  using (true);

create policy "badges: admin manage"
  on badges for all
  using (is_admin())
  with check (is_admin());

create table if not exists user_badges (
  profile_id uuid not null references profiles (id) on delete cascade,
  code text not null references badges (code) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (profile_id, code)
);

alter table user_badges enable row level security;

create policy "user_badges: read public"
  on user_badges for select
  using (true);

create policy "user_badges: admin manage"
  on user_badges for all
  using (is_admin())
  with check (is_admin());
