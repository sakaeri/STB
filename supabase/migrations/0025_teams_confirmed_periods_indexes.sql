-- FC売上管理簿 — teams.org_id has no index. fetchOrgData's very first
-- query (`teams` filtered by org_id, everything else waits on it) has been
-- sequentially scanning the ENTIRE teams table — across every org on the
-- whole platform, not just this one — on every single page load, for
-- every customer. As more orgs sign up this only gets slower, independent
-- of how much data any single org has. This is very likely why a "本部を
-- 削除する（statement timeout）" was seen: the underlying query the
-- retry logic was re-running 3 times was never going to get faster by
-- retrying it, only by indexing it. confirmed_periods.team_id has the
-- same gap (also fetched on every load) — smaller table today, but the
-- same missing-index class of problem as 0023 fixed for the others.
-- Run this once in the Supabase SQL Editor.
create index if not exists teams_org_id_idx on public.teams (org_id);
create index if not exists confirmed_periods_team_id_idx on public.confirmed_periods (team_id);
