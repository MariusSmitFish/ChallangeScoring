-- Run after supabase-schema.sql (same Supabase project → SQL Editor)
-- Competition calendar, scored catches, and per-team-per-day disqualifications.

create table if not exists public.competition_days (
  id uuid primary key default gen_random_uuid (),
  day_date date not null,
  day_number int not null check (day_number between 1 and 5),
  created_at timestamptz not null default now(),
  constraint competition_days_day_date_key unique (day_date),
  constraint competition_days_day_number_key unique (day_number)
);

insert into public.competition_days (day_date, day_number)
values
  ('2026-06-01', 1),
  ('2026-06-02', 2),
  ('2026-06-03', 3),
  ('2026-06-04', 4),
  ('2026-06-05', 5)
on conflict (day_date) do nothing;

create table if not exists public.team_day_overrides (
  id uuid primary key default gen_random_uuid (),
  team_id uuid not null references public.teams (id) on delete cascade,
  competition_day_id uuid not null references public.competition_days (id) on delete cascade,
  disqualified boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  constraint team_day_overrides_team_day_key unique (team_id, competition_day_id)
);

create index if not exists team_day_overrides_day_idx on public.team_day_overrides (competition_day_id);

create table if not exists public.catches (
  id uuid primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  angler_id uuid not null references public.team_members (id) on delete cascade,
  competition_day_id uuid not null references public.competition_days (id) on delete cascade,
  catch_kind text not null check (
    catch_kind in (
      'weighed_gamefish',
      'billfish_release',
      'length_release'
    )
  ),
  species_key text not null check (char_length(trim(species_key)) > 0),
  weight_kg numeric,
  length_cm numeric,
  billfish_variant text,
  points_total numeric not null check (points_total >= 0),
  notes text,
  created_at timestamptz not null default now (),
  constraint catches_billfish_variant_ck check (
    billfish_variant is null
    or billfish_variant in ('sailfish', 'marlin')
  )
);

create index if not exists catches_team_day_idx on public.catches (team_id, competition_day_id);
create index if not exists catches_angler_day_idx on public.catches (angler_id, competition_day_id);

alter table public.competition_days enable row level security;
alter table public.team_day_overrides enable row level security;
alter table public.catches enable row level security;

grant all on table public.competition_days to anon, authenticated;
grant all on table public.team_day_overrides to anon, authenticated;
grant all on table public.catches to anon, authenticated;

drop policy if exists "competition_days_public_rw" on public.competition_days;
create policy "competition_days_public_rw" on public.competition_days
  for all using (true) with check (true);

drop policy if exists "team_day_overrides_public_rw" on public.team_day_overrides;
create policy "team_day_overrides_public_rw" on public.team_day_overrides
  for all using (true) with check (true);

drop policy if exists "catches_public_rw" on public.catches;
create policy "catches_public_rw" on public.catches
  for all using (true) with check (true);
