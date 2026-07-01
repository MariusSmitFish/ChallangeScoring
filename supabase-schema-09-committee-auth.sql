-- Run after supabase-schema-08-gdsaa-development-2026.sql
-- Any signed-in committee account can manage scoring data.
-- Only the super-admin email can create/edit/delete competitions.

create or replace function public.is_competition_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select lower(u.email) = lower('mariussmitb@gmail.com')
      from auth.users u
      where u.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_competition_super_admin() from public;
grant execute on function public.is_competition_super_admin() to anon, authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

drop policy if exists "competitions_insert_admin" on public.competitions;
create policy "competitions_insert_admin" on public.competitions
  for insert to authenticated with check (public.is_competition_super_admin());

drop policy if exists "competitions_update_admin" on public.competitions;
create policy "competitions_update_admin" on public.competitions
  for update to authenticated
  using (public.is_competition_super_admin())
  with check (public.is_competition_super_admin());

drop policy if exists "competitions_delete_admin" on public.competitions;
create policy "competitions_delete_admin" on public.competitions
  for delete to authenticated using (public.is_competition_super_admin());
