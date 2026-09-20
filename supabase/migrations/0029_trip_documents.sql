-- Trip documents: lets the host team attach files (reservation
-- confirmations, plane tickets, etc.) to a trip for the group to see.
-- Built at the `trips` level (not scoped to visibility='private' in the
-- database) since the underlying membership model is identical for a
-- private plan and a public social trip — the UI only surfaces the
-- upload/list on private plans for now, but nothing here stops it being
-- shown elsewhere later. Same private-bucket + RLS-by-path-segment
-- pattern as payment-evidence (migration 0026).

create table if not exists trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  uploaded_by uuid references profiles (id) on delete set null,
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 200),
  file_size bigint,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists trip_documents_trip_idx on trip_documents (trip_id);

alter table trip_documents enable row level security;

create policy "trip_documents: member or host team reads"
  on trip_documents for select
  using (is_member(trip_id) or is_host_team(trip_id) or is_admin());

create policy "trip_documents: host team uploads"
  on trip_documents for insert
  with check ((is_host_team(trip_id) or is_admin()) and uploaded_by = auth.uid());

create policy "trip_documents: uploader or host team deletes"
  on trip_documents for delete
  using (uploaded_by = auth.uid() or is_host_team(trip_id) or is_admin());

insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

-- Path convention: {tripId}/{filename}, same shape as payment-evidence's
-- {attendeeId}/{filename}.
create policy "trip-documents: host team inserts"
  on storage.objects for insert
  with check (
    bucket_id = 'trip-documents'
    and (is_host_team((storage.foldername(name))[1]::uuid) or is_admin())
  );

create policy "trip-documents: member or host team reads"
  on storage.objects for select
  using (
    bucket_id = 'trip-documents'
    and (
      is_member((storage.foldername(name))[1]::uuid)
      or is_host_team((storage.foldername(name))[1]::uuid)
      or is_admin()
    )
  );

create policy "trip-documents: uploader or host team deletes"
  on storage.objects for delete
  using (
    bucket_id = 'trip-documents'
    and (is_host_team((storage.foldername(name))[1]::uuid) or is_admin())
  );
