-- Run after supabase-schema-03-admin-auth.sql (needs public.is_app_admin()).
-- Committee blog: anyone may read published posts; only app admins insert/update/delete.
-- Rows with published_at IS NULL are drafts (visible only to admins via RLS).

create table if not exists public.committee_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 500),
  body text not null default '' check (char_length(body) <= 20000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists committee_updates_published_at_idx
  on public.committee_updates (published_at desc nulls last);

alter table public.committee_updates enable row level security;

drop policy if exists "committee_updates_select_anon" on public.committee_updates;
create policy "committee_updates_select_anon" on public.committee_updates
  for select to anon
  using (published_at is not null);

drop policy if exists "committee_updates_select_auth" on public.committee_updates;
create policy "committee_updates_select_auth" on public.committee_updates
  for select to authenticated
  using (published_at is not null or public.is_app_admin());

drop policy if exists "committee_updates_insert_admin" on public.committee_updates;
create policy "committee_updates_insert_admin" on public.committee_updates
  for insert to authenticated
  with check (public.is_app_admin());

drop policy if exists "committee_updates_update_admin" on public.committee_updates;
create policy "committee_updates_update_admin" on public.committee_updates
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "committee_updates_delete_admin" on public.committee_updates;
create policy "committee_updates_delete_admin" on public.committee_updates
  for delete to authenticated
  using (public.is_app_admin());

revoke all on public.committee_updates from public;
grant select on public.committee_updates to anon;
grant select, insert, update, delete on public.committee_updates to authenticated;
