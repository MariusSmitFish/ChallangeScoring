-- Run after supabase-schema-03-admin-auth.sql (needs public.is_app_admin()).
-- Replaces wide-open species RLS with the same pattern as catches / teams:
-- anyone can read; only app admins can insert, update, or delete.

alter table public.species_registry enable row level security;

drop policy if exists "species_registry_public_rw" on public.species_registry;

create policy "species_registry_select_all" on public.species_registry
  for select using (true);

create policy "species_registry_insert_admin" on public.species_registry
  for insert to authenticated with check (public.is_app_admin());

create policy "species_registry_update_admin" on public.species_registry
  for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create policy "species_registry_delete_admin" on public.species_registry
  for delete to authenticated using (public.is_app_admin());

revoke all on public.species_registry from anon;
grant select on public.species_registry to anon;

revoke all on public.species_registry from authenticated;
grant select, insert, update, delete on public.species_registry to authenticated;
