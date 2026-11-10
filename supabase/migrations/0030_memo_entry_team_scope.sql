-- FC売上管理簿 — 詳細(memo_entries)はこれまで親の項目(memo_topics)の共有
-- 範囲(全体・本部のみ・特定チーム)をそのまま継承するだけで、詳細ごとに
-- 個別の閲覧制限をかける方法がなかった。「全体」で共有している項目の中
-- に、特定の店舗担当者だけに見せたい詳細を作りたいケース(例: 年末調整
-- の中にエリアごとの詳細)に対応するため、詳細自身にも任意のteam_id
-- 上書きを持たせる。
--
-- team_id が null のときは従来通り項目の範囲のみで判定(挙動は変わらな
-- い)。team_id が設定されている場合、本部メンバーは今まで通り常に見え
-- るが、チームメンバーは「項目が見える範囲に入っている」かつ「このteam_
-- id のメンバーである」の両方を満たさないと見えなくなる。
alter table public.memo_entries add column team_id uuid references public.teams(id) on delete set null;
create index if not exists memo_entries_team_id_idx on public.memo_entries (team_id);

drop policy "memo_entries: select if accessible" on public.memo_entries;
create policy "memo_entries: select if accessible" on public.memo_entries for select
  using (exists (
    select 1 from public.memo_topics t where t.id = topic_id and (
      public.is_org_member(t.org_id)
      or (
        (
          (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
          or (t.team_id is not null and public.is_team_member(t.team_id))
        )
        and (memo_entries.team_id is null or public.is_team_member(memo_entries.team_id))
      )
    )
  ));

drop policy "memo_records: select if accessible" on public.memo_records;
create policy "memo_records: select if accessible" on public.memo_records for select
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (
      public.is_org_member(t.org_id)
      or (
        (
          (t.team_id is null and not t.hq_only and public.can_access_org(t.org_id))
          or (t.team_id is not null and public.is_team_member(t.team_id))
        )
        and (e.team_id is null or public.is_team_member(e.team_id))
      )
    )
  ));
