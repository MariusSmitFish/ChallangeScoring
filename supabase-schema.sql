-- Run this in Supabase: SQL Editor → New query → Run
-- Creates tables + RLS so the browser anon key can read/write teams.
-- Anyone with your anon key and URL can modify data; for stricter control add Supabase Auth later.

create table if not exists public.teams (
  id uuid primary key,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists team_members_team_id_idx on public.team_members (team_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

grant usage on schema public to anon, authenticated;
grant all on table public.teams to anon, authenticated;
grant all on table public.team_members to anon, authenticated;

drop policy if exists "teams_public_rw" on public.teams;
create policy "teams_public_rw" on public.teams for all using (true) with check (true);

drop policy if exists "team_members_public_rw" on public.team_members;
create policy "team_members_public_rw" on public.team_members
  for all using (true) with check (true);
