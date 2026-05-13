-- Run after supabase-schema.sql and supabase-schema-02-competition.sql
-- Public read access; writes only for users listed in app_admins (see below).
--
-- 1) Supabase Dashboard → Authentication → enable Email provider.
-- 2) Create admin user(s) under Authentication → Users (or invite).
-- 3) For each admin, copy their User UUID and run:
--      insert into public.app_admins (user_id) values ('<uuid-here>');
-- 4) Optional: disable "Sign ups" so only you create accounts.

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "app_admins_select_own" on public.app_admins;
create policy "app_admins_select_own" on public.app_admins
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select exists (
        select 1 from public.app_admins a where a.user_id = auth.uid()
      )
    ),
    false
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to anon, authenticated;

revoke all on public.app_admins from public;
grant select on public.app_admins to authenticated;

-- ——— teams ———
drop policy if exists "teams_public_rw" on public.teams;
create policy "teams_select_all" on public.teams for select using (true);
create policy "teams_insert_admin" on public.teams
  for insert to authenticated with check (public.is_app_admin());
create policy "teams_update_admin" on public.teams
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "teams_delete_admin" on public.teams
  for delete to authenticated using (public.is_app_admin());

revoke all on public.teams from anon;
grant select on public.teams to anon;
revoke all on public.teams from authenticated;
grant select, insert, update, delete on public.teams to authenticated;

-- ——— team_members ———
drop policy if exists "team_members_public_rw" on public.team_members;
create policy "team_members_select_all" on public.team_members for select using (true);
create policy "team_members_insert_admin" on public.team_members
  for insert to authenticated with check (public.is_app_admin());
create policy "team_members_update_admin" on public.team_members
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "team_members_delete_admin" on public.team_members
  for delete to authenticated using (public.is_app_admin());

revoke all on public.team_members from anon;
grant select on public.team_members to anon;
revoke all on public.team_members from authenticated;
grant select, insert, update, delete on public.team_members to authenticated;

-- ——— competition_days (read-only from the API) ———
drop policy if exists "competition_days_public_rw" on public.competition_days;
create policy "competition_days_select_all" on public.competition_days for select using (true);

revoke all on public.competition_days from anon;
grant select on public.competition_days to anon;
revoke all on public.competition_days from authenticated;
grant select on public.competition_days to authenticated;

-- ——— catches ———
drop policy if exists "catches_public_rw" on public.catches;
create policy "catches_select_all" on public.catches for select using (true);
create policy "catches_insert_admin" on public.catches
  for insert to authenticated with check (public.is_app_admin());
create policy "catches_update_admin" on public.catches
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "catches_delete_admin" on public.catches
  for delete to authenticated using (public.is_app_admin());

revoke all on public.catches from anon;
grant select on public.catches to anon;
revoke all on public.catches from authenticated;
grant select, insert, update, delete on public.catches to authenticated;

-- ——— team_day_overrides ———
drop policy if exists "team_day_overrides_public_rw" on public.team_day_overrides;
create policy "team_day_overrides_select_all" on public.team_day_overrides for select using (true);
create policy "team_day_overrides_insert_admin" on public.team_day_overrides
  for insert to authenticated with check (public.is_app_admin());
create policy "team_day_overrides_update_admin" on public.team_day_overrides
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create policy "team_day_overrides_delete_admin" on public.team_day_overrides
  for delete to authenticated using (public.is_app_admin());

revoke all on public.team_day_overrides from anon;
grant select on public.team_day_overrides to anon;
revoke all on public.team_day_overrides from authenticated;
grant select, insert, update, delete on public.team_day_overrides to authenticated;
