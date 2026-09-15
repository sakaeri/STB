-- FC売上管理簿 — restrict cross-team visibility for plain team members.
--
-- can_access_org() treats "member of ANY team in this org" as equivalent to
-- "HQ member", so it was used (too broadly) as the SELECT gate on
-- teams/memo_topics/memo_entries/memo_records/trash_items. That meant a
-- viewer invited into a single team could also read every OTHER team's
-- settings (royalty/savings rates), private memo topics, and trash — even
-- though transactions (the actual sales/expense figures) were already
-- correctly scoped to can_access_team (own team only, or HQ).
--
-- This tightens those tables to: HQ members (is_org_member) see everything,
-- as before; a plain team member sees only their own team's rows, plus
-- memo topics explicitly shared org-wide (team_id is null — the "本部が
-- 操作した情報メモ" broadcast case).

drop policy "teams: select if accessible" on public.teams;
create policy "teams: select if accessible" on public.teams for select
  using (public.is_org_member(org_id) or public.is_team_member(id));

drop policy "memo_topics: select if org accessible" on public.memo_topics;
create policy "memo_topics: select if accessible" on public.memo_topics for select
  using (
    public.is_org_member(org_id)
    or (team_id is null and public.can_access_org(org_id))
    or (team_id is not null and public.is_team_member(team_id))
  );

drop policy "memo_topics: insert if org accessible" on public.memo_topics;
create policy "memo_topics: insert if accessible" on public.memo_topics for insert
  with check (
    public.is_org_member(org_id)
    or (team_id is not null and public.is_team_member(team_id))
  );

drop policy "memo_entries: select if topic accessible" on public.memo_entries;
create policy "memo_entries: select if accessible" on public.memo_entries for select
  using (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "memo_entries: insert if topic accessible" on public.memo_entries;
create policy "memo_entries: insert if accessible" on public.memo_entries for insert
  with check (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "memo_records: select if entry accessible" on public.memo_records;
create policy "memo_records: select if accessible" on public.memo_records for select
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "memo_records: insert if entry accessible" on public.memo_records;
create policy "memo_records: insert if accessible" on public.memo_records for insert
  with check (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "trash_items: select if org accessible" on public.trash_items;
create policy "trash_items: select if accessible" on public.trash_items for select
  using (public.is_org_member(org_id) or (team_id is not null and public.is_team_member(team_id)));

drop policy "trash_items: insert if org accessible" on public.trash_items;
create policy "trash_items: insert if accessible" on public.trash_items for insert
  with check (public.is_org_member(org_id) or (team_id is not null and public.is_team_member(team_id)));

drop policy "trash_items: delete if org accessible" on public.trash_items;
create policy "trash_items: delete if accessible" on public.trash_items for delete
  using (public.is_org_member(org_id) or (team_id is not null and public.is_team_member(team_id)));
