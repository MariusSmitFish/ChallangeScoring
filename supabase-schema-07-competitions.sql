-- Run after supabase-schema-03-admin-auth.sql (needs public.is_app_admin()).
-- Multi-competition: one active event at a time; all scoring data scoped by competition_id.

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null check (char_length(trim(name)) > 0),
  is_active boolean not null default false,
  year int,
  venue text,
  rules_config jsonb not null default '[]'::jsonb,
  scoring_config jsonb not null default '{}'::jsonb,
  schedule_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_slug_key unique (slug)
);

create unique index if not exists competitions_one_active_idx
  on public.competitions ((true))
  where is_active;

create or replace function public.active_competition_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.competitions where is_active = true limit 1;
$$;

revoke all on function public.active_competition_id() from public;
grant execute on function public.active_competition_id() to anon, authenticated;

-- ——— Backfill default competition for existing installs ———

insert into public.competitions (
  slug,
  name,
  is_active,
  year,
  venue,
  rules_config,
  scoring_config,
  schedule_config
)
select
  'challenge-2026',
  'THE CHALLENGE 2026',
  true,
  2026,
  'Barcos',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb
where not exists (select 1 from public.competitions where slug = 'challenge-2026');

-- ——— competition_id on scoped tables ———

alter table public.teams
  add column if not exists competition_id uuid references public.competitions (id) on delete cascade;

alter table public.competition_days
  add column if not exists competition_id uuid references public.competitions (id) on delete cascade;

alter table public.species_registry
  add column if not exists competition_id uuid references public.competitions (id) on delete cascade;

alter table public.committee_updates
  add column if not exists competition_id uuid references public.competitions (id) on delete cascade;

update public.teams t
set competition_id = c.id
from public.competitions c
where c.slug = 'challenge-2026' and t.competition_id is null;

update public.competition_days d
set competition_id = c.id
from public.competitions c
where c.slug = 'challenge-2026' and d.competition_id is null;

update public.species_registry s
set competition_id = c.id
from public.competitions c
where c.slug = 'challenge-2026' and s.competition_id is null;

update public.committee_updates u
set competition_id = c.id
from public.competitions c
where c.slug = 'challenge-2026' and u.competition_id is null;

alter table public.teams alter column competition_id set not null;
alter table public.competition_days alter column competition_id set not null;
alter table public.species_registry alter column competition_id set not null;
alter table public.committee_updates alter column competition_id set not null;

-- Drop global day uniques; scope per competition
alter table public.competition_days drop constraint if exists competition_days_day_date_key;
alter table public.competition_days drop constraint if exists competition_days_day_number_key;
alter table public.competition_days drop constraint if exists competition_days_day_number_check;

alter table public.competition_days
  add constraint competition_days_comp_day_date_key unique (competition_id, day_date);
alter table public.competition_days
  add constraint competition_days_comp_day_number_key unique (competition_id, day_number);
alter table public.competition_days
  add constraint competition_days_day_number_check check (day_number >= 1);

-- Species: composite primary key per competition
alter table public.species_registry drop constraint if exists species_registry_pkey;
alter table public.species_registry
  add constraint species_registry_pkey primary key (competition_id, key);

create index if not exists teams_competition_id_idx on public.teams (competition_id);
create index if not exists competition_days_competition_id_idx on public.competition_days (competition_id);
create index if not exists committee_updates_competition_id_idx on public.committee_updates (competition_id);

-- ——— competitions RLS ———

alter table public.competitions enable row level security;

drop policy if exists "competitions_select_all" on public.competitions;
create policy "competitions_select_all" on public.competitions
  for select using (true);

drop policy if exists "competitions_insert_admin" on public.competitions;
create policy "competitions_insert_admin" on public.competitions
  for insert to authenticated with check (public.is_app_admin());

drop policy if exists "competitions_update_admin" on public.competitions;
create policy "competitions_update_admin" on public.competitions
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "competitions_delete_admin" on public.competitions;
create policy "competitions_delete_admin" on public.competitions
  for delete to authenticated using (public.is_app_admin());

revoke all on public.competitions from public;
grant select on public.competitions to anon, authenticated;
grant select, insert, update, delete on public.competitions to authenticated;

-- ——— Scoped read: public sees active competition only; admins see all ———

drop policy if exists "teams_select_all" on public.teams;
create policy "teams_select_scoped" on public.teams
  for select using (
    public.is_app_admin()
    or competition_id = public.active_competition_id()
  );

drop policy if exists "team_members_select_all" on public.team_members;
create policy "team_members_select_scoped" on public.team_members
  for select using (
    public.is_app_admin()
    or exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.competition_id = public.active_competition_id()
    )
  );

drop policy if exists "competition_days_select_all" on public.competition_days;
create policy "competition_days_select_scoped" on public.competition_days
  for select using (
    public.is_app_admin()
    or competition_id = public.active_competition_id()
  );

drop policy if exists "catches_select_all" on public.catches;
create policy "catches_select_scoped" on public.catches
  for select using (
    public.is_app_admin()
    or exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.competition_id = public.active_competition_id()
    )
  );

drop policy if exists "team_day_overrides_select_all" on public.team_day_overrides;
create policy "team_day_overrides_select_scoped" on public.team_day_overrides
  for select using (
    public.is_app_admin()
    or exists (
      select 1 from public.teams t
      where t.id = team_id
        and t.competition_id = public.active_competition_id()
    )
  );

drop policy if exists "species_registry_select_all" on public.species_registry;
create policy "species_registry_select_scoped" on public.species_registry
  for select using (
    public.is_app_admin()
    or competition_id = public.active_competition_id()
  );

drop policy if exists "committee_updates_select_anon" on public.committee_updates;
create policy "committee_updates_select_anon" on public.committee_updates
  for select to anon
  using (
    published_at is not null
    and competition_id = public.active_competition_id()
  );

drop policy if exists "committee_updates_select_auth" on public.committee_updates;
create policy "committee_updates_select_auth" on public.committee_updates
  for select to authenticated
  using (
    published_at is not null and competition_id = public.active_competition_id()
    or public.is_app_admin()
  );

-- Admin inserts must set competition_id (enforced in app)
drop policy if exists "teams_insert_admin" on public.teams;
create policy "teams_insert_admin" on public.teams
  for insert to authenticated with check (public.is_app_admin());

drop policy if exists "committee_updates_insert_admin" on public.committee_updates;
create policy "committee_updates_insert_admin" on public.committee_updates
  for insert to authenticated with check (public.is_app_admin());

drop policy if exists "species_registry_insert_admin" on public.species_registry;
create policy "species_registry_insert_admin" on public.species_registry
  for insert to authenticated with check (public.is_app_admin());
