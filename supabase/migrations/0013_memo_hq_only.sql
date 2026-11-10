-- A genuinely separate concept from the existing team_id-null "全体共有"
-- (shared with HQ + every team): hq_only topics are visible to HQ members
-- only, hidden from all team members, regardless of team_id being null.
alter table public.memo_topics add column hq_only boolean not null default false;

drop policy "memo_topics: select if accessible" on public.memo_topics;
create policy "memo_topics: select if accessible" on public.memo_topics for select
  using (
    public.is_org_member(org_id)
    or (team_id is null and not hq_only and public.can_access_org(org_id))
    or (team_id is not null and public.is_team_member(team_id))
  );

drop policy "memo_entries: select if accessible" on public.memo_entries;
create policy "memo_entries: select if accessible" on public.memo_entries for select
  using (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "memo_records: select if accessible" on public.memo_records;
create policy "memo_records: select if accessible" on public.memo_records for select
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));
