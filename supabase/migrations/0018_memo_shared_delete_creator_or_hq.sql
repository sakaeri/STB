-- Deletion of company-wide-shared (全体, team_id is null, hq_only false)
-- memo content was restricted to a true HQ member (is_org_member) only —
-- now widened to also allow whoever originally created that specific
-- topic/entry/record, regardless of role. HQ-level deletion of shared
-- content is further narrowed to editing roles (オーナー/編集者), excluding
-- 閲覧者, matching the org_members role set.

alter table public.memo_entries add column created_by uuid references public.profiles(id);

create or replace function public.is_org_editor(p_org_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and role in ('オーナー','編集者')
  );
$$;

drop policy "memo_topics: delete if can manage" on public.memo_topics;
create policy "memo_topics: delete if can manage" on public.memo_topics for delete
  using (
    (team_id is not null and public.can_manage_team(team_id))
    or (team_id is null and (public.is_org_editor(org_id) or created_by = auth.uid()))
  );

drop policy "memo_entries: delete if can manage" on public.memo_entries;
create policy "memo_entries: delete if can manage" on public.memo_entries for delete
  using (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      (t.team_id is not null and public.can_manage_team(t.team_id))
      or (t.team_id is null and (public.is_org_editor(t.org_id) or memo_entries.created_by = auth.uid()))
    )
  ));

drop policy "memo_records: delete if can manage" on public.memo_records;
create policy "memo_records: delete if can manage" on public.memo_records for delete
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      (t.team_id is not null and public.can_manage_team(t.team_id))
      or (t.team_id is null and (public.is_org_editor(t.org_id) or memo_records.created_by = auth.uid()))
    )
  ));
