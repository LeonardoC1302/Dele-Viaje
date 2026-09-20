-- Dele Viaje — SINPE Móvil manual payment evidence flow (the v1.5 stage
-- the PRD describes, discussed with the user 2026-09-20): an agency posts
-- their SINPE phone number on the tour, a buyer pays bank-to-bank via
-- their own banking app (free, instant, no processor involved), uploads a
-- screenshot as evidence, and the agency reviews it and marks the
-- reservation paid. No card/wallet processor integration — that's the
-- whole point of this flow.

alter table agencies add column if not exists sinpe_phone text check (sinpe_phone is null or char_length(sinpe_phone) <= 20);

-- Same client-writable-columns grant as the rest of an agency's public
-- profile (migration 0022) — sinpe_phone is just another profile field,
-- not a status-like value that needs the set_agency_status() treatment.
grant update (sinpe_phone) on agencies to authenticated;

-- A different parameter count is a different function signature to
-- Postgres — `create or replace` wouldn't actually replace the 5-arg
-- version from 0022, it'd leave it sitting alongside this one as a dead
-- overload. Drop it explicitly first.
drop function if exists apply_for_agency(text, text, text, text, text);

create or replace function apply_for_agency(
  p_business_name text,
  p_legal_name text,
  p_legal_id text,
  p_description text,
  p_location_name text,
  p_sinpe_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_agency_id uuid;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if not is_active() then
    raise exception 'ERR_ACCOUNT_NOT_ACTIVE';
  end if;

  insert into agencies (owner_id, business_name, legal_name, legal_id, description, location_name, sinpe_phone)
  values (v_profile_id, p_business_name, p_legal_name, p_legal_id, p_description, p_location_name, p_sinpe_phone)
  returning id into v_agency_id;

  insert into agency_members (agency_id, profile_id, role, status)
  values (v_agency_id, v_profile_id, 'owner', 'active');

  return v_agency_id;
end;
$$;

grant execute on function apply_for_agency(text, text, text, text, text, text) to authenticated;

alter table attendees add column if not exists payment_evidence_path text;

-- Storage bucket for uploaded evidence images. Not public — every read
-- goes through the RLS policies below, same as every other access-
-- controlled table in this app.
insert into storage.buckets (id, name, public)
values ('payment-evidence', 'payment-evidence', false)
on conflict (id) do nothing;

-- Path convention: {attendeeId}/{filename}. storage.foldername(name)
-- returns the folder segments of the object path (everything but the
-- filename) — for this convention that's a one-element array, the
-- attendee row's id.
create policy "payment-evidence: uploader inserts own"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-evidence'
    and exists (
      select 1 from attendees
      where id::text = (storage.foldername(name))[1]
        and profile_id = auth.uid()
    )
  );

create policy "payment-evidence: uploader or host team reads"
  on storage.objects for select
  using (
    bucket_id = 'payment-evidence'
    and exists (
      select 1 from attendees a
      where a.id::text = (storage.foldername(name))[1]
        and (a.profile_id = auth.uid() or is_host_team(a.trip_id) or is_admin())
    )
  );

create policy "payment-evidence: uploader or host team deletes"
  on storage.objects for delete
  using (
    bucket_id = 'payment-evidence'
    and exists (
      select 1 from attendees a
      where a.id::text = (storage.foldername(name))[1]
        and (a.profile_id = auth.uid() or is_host_team(a.trip_id) or is_admin())
    )
  );

-- Writing payment_status/payment_evidence_path can't go through a normal
-- column grant the way agencies' profile fields do — a buyer marking
-- their own payment as submitted and a host team confirming/rejecting it
-- need *different* column access, but both act through the same shared
-- `authenticated` DB role, and GRANT can't condition on which policy
-- let the row through (same reasoning as set_agency_status(), migration
-- 0022). Routed through SECURITY DEFINER functions instead — no general
-- UPDATE grant on these columns needed at all.

create or replace function submit_payment_evidence(p_attendee_id uuid, p_storage_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_attendee attendees%rowtype;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;

  select * into v_attendee from attendees where id = p_attendee_id;
  if not found or v_attendee.profile_id <> v_profile_id then
    raise exception 'ERR_FORBIDDEN';
  end if;
  if v_attendee.status <> 'confirmed' then
    raise exception 'ERR_NOT_CONFIRMED';
  end if;

  update attendees
  set payment_status = 'pending', payment_evidence_path = p_storage_path
  where id = p_attendee_id;
end;
$$;

grant execute on function submit_payment_evidence(uuid, text) to authenticated;

create or replace function confirm_payment(p_attendee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee attendees%rowtype;
begin
  select * into v_attendee from attendees where id = p_attendee_id;
  if not found then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if not (is_host_team(v_attendee.trip_id) or is_admin()) then
    raise exception 'ERR_FORBIDDEN';
  end if;

  update attendees set payment_status = 'paid' where id = p_attendee_id;
end;
$$;

grant execute on function confirm_payment(uuid) to authenticated;

-- Sends the buyer back to 'none' (not a dedicated 'rejected' status — the
-- attendees.payment_status check constraint from migration 0001 only
-- allows none/pending/paid, and "please try again" reads the same as
-- "you haven't paid yet" from the buyer's side) so they can upload fresh
-- evidence. The old file is left in the bucket rather than deleted here —
-- host team/admin already has storage delete rights on it directly if
-- they want to clean it up, not wired into this function to keep it a
-- single, obviously-safe UPDATE rather than a cross-system delete inside
-- a function whose failure mode should never be "payment status changed
-- but storage delete silently failed".
create or replace function reject_payment(p_attendee_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attendee attendees%rowtype;
begin
  select * into v_attendee from attendees where id = p_attendee_id;
  if not found then
    raise exception 'ERR_NOT_FOUND';
  end if;
  if not (is_host_team(v_attendee.trip_id) or is_admin()) then
    raise exception 'ERR_FORBIDDEN';
  end if;

  update attendees set payment_status = 'none', payment_evidence_path = null where id = p_attendee_id;
end;
$$;

grant execute on function reject_payment(uuid) to authenticated;
