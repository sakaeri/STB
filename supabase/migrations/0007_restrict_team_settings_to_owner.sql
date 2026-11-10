-- FC売上管理簿 — restrict team settings (royalty/savings/name/etc.) to the
-- org owner only.
--
-- "teams: update by org member or team manager" let any team member with
-- role 管理者/編集者 (via can_manage_team) update their own team's row —
-- including royalty_rate/royalty_amount/savings/savings_rate, which is HQ
-- franchise-agreement data, not something a local team manager should be
-- able to change on their own. The client already gates the settings-edit
-- UI to オーナー only; this brings the actual RLS enforcement in line so
-- it can't be bypassed by calling Supabase directly.
drop policy "teams: update by org member or team manager" on public.teams;
create policy "teams: update by org owner" on public.teams for update
  using (public.is_org_owner(org_id));
