-- Run after supabase-schema-02-competition.sql
-- Admin-managed species catalogue for weighed and length-release entries.
--
-- If you use supabase-schema-03-admin-auth.sql, also run
-- supabase-schema-05-species-registry-rls.sql so species changes require an app
-- admin (same as catches/teams). Until then, the permissive policy below allows
-- anon/authenticated clients to mutate species (including delete).

create table if not exists public.species_registry (
  key text primary key check (
    key ~ '^[a-z][a-z0-9_]*$'
    and char_length(key) <= 64
  ),
  label text not null check (char_length(trim(label)) > 0),
  category text not null check (category in ('weighed_gamefish', 'length_release')),
  cap_group text not null check (char_length(trim(cap_group)) > 0),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists species_registry_category_sort_idx on public.species_registry (category, sort_order, key);

alter table public.species_registry enable row level security;

grant all on table public.species_registry to anon, authenticated;

drop policy if exists "species_registry_public_rw" on public.species_registry;
create policy "species_registry_public_rw" on public.species_registry for all using (true) with check (true);

insert into public.species_registry (key, label, category, cap_group, sort_order, active)
values
  ('yellowfin_tuna', 'Yellowfin tuna', 'weighed_gamefish', 'yellowfin_tuna', 10, true),
  ('bigeye_tuna', 'Bigeye tuna', 'weighed_gamefish', 'bigeye_tuna', 20, true),
  ('longfin_tuna', 'Longfin tuna', 'weighed_gamefish', 'longfin_tuna', 30, true),
  ('skipjack_tuna', 'Skipjack tuna', 'weighed_gamefish', 'skipjack_tuna', 40, true),
  ('wahoo', 'Wahoo', 'weighed_gamefish', 'wahoo', 50, true),
  ('dorado', 'Dorado / mahi-mahi', 'weighed_gamefish', 'dorado', 60, true),
  ('queenfish', 'Queenfish', 'weighed_gamefish', 'queenfish', 70, true),
  ('barracuda', 'Barracuda (any species)', 'weighed_gamefish', 'barracuda', 80, true),
  ('other_gamefish', 'Other gamefish (weighed)', 'weighed_gamefish', 'other_gamefish', 90, true),
  ('kingfish', 'Kingfish (all treated as one species)', 'length_release', 'kingfish', 10, true),
  ('kakaap', 'Green jobfish / kakaap', 'length_release', 'kakaap', 20, true)
on conflict (key) do nothing;
