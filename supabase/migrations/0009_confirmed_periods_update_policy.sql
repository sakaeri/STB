-- FC売上管理簿 — confirmed_periods was missing an UPDATE policy.
-- confirmPeriod() uses upsert(), which Postgres implements as
-- INSERT ... ON CONFLICT (team_id, period) DO UPDATE — the ON CONFLICT
-- branch requires UPDATE privilege via RLS, not just INSERT. Without this,
-- two people confirming the same period at nearly the same moment would
-- have the second request silently rejected by RLS (harmless today since
-- the row from the first request already has correct data, but worth
-- closing off).
create policy "confirmed_periods: update if team accessible" on public.confirmed_periods for update
  using (public.can_access_team(team_id))
  with check (public.can_access_team(team_id));
