-- Run after supabase-schema-09-committee-auth.sql
-- Angler score divisions for category leaderboards (Men, Ladies, U/19, U/16).

alter table public.team_members
  add column if not exists score_category text
  check (
    score_category is null
    or score_category in ('men', 'ladies', 'u19', 'u16')
  );

create index if not exists team_members_score_category_idx
  on public.team_members (score_category)
  where score_category is not null;
