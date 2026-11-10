-- Needed to re-point still-pending trash items (e.g. a transaction deleted
-- before its team was) at a newly recreated team when that team is
-- restored from trash — see restoreTrashItem's 'team' branch.
create policy "trash_items: update if accessible" on public.trash_items for update
  using (public.is_org_member(org_id) or (team_id is not null and public.is_team_member(team_id)))
  with check (public.is_org_member(org_id) or (team_id is not null and public.is_team_member(team_id)));
