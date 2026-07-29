-- Fix: a plain team member could SEE a company-wide-shared (全体) memo
-- topic (team_id is null, hq_only false — granted by 0013's select
-- policy via can_access_org) but could not actually INSERT an entry or
-- record under it. The insert policies below were last touched in 0004
-- and never gained the matching (team_id is null and not hq_only)
-- allowance that 0013 added to the select policies, so they still only
-- permitted a true HQ member (is_org_member) or a member of the topic's
-- own team (team_id is not null). The UI's "＋詳細を追加"/"＋記録を追加"
-- buttons don't check topic scope, so a team member filling one in under
-- a 全体 topic had the insert silently rejected by RLS.

drop policy "memo_entries: insert if accessible" on public.memo_entries;
create policy "memo_entries: insert if accessible" on public.memo_entries for insert
  with check (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));

drop policy "memo_records: insert if accessible" on public.memo_records;
create policy "memo_records: insert if accessible" on public.memo_records for insert
  with check (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      public.is_org_member(t.org_id)
      or (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
      or (t.team_id is not null and public.is_team_member(t.team_id))
    )
  ));
