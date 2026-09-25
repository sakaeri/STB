-- FC売上管理簿 — fetchOrgData's transactions query filters by
-- `.in('team_id', teamIds)`, which is fine on its own (there's an index on
-- (team_id, date)), but transactions' RLS policy then re-checks
-- can_access_team(team_id) for EVERY row the index scan finds — three
-- SECURITY DEFINER function calls (can_access_team -> is_org_member +
-- is_team_member, plus a teams lookup) per row, on top of the index scan
-- itself. That cost scales with row count, and unlike org_people's fix
-- (member count), there's no separate index/RLS fix for this one — the
-- per-row check is inherent to how PostgREST enforces RLS on a plain
-- select. This is very likely what's now timing out fetchOrgData's
-- [transactions] query even after bounding it to a trailing window
-- (see defaultTxFloor in dataLoader.ts) once an org's data volume grows.
--
-- Same fix shape as org_people: check access once, then do a single
-- bypass-RLS query. Since transactions access isn't uniform across an org
-- (HQ members see every team, a team-only member sees just their own
-- team — see can_access_team), this preserves that distinction as one
-- plain SQL condition the planner can evaluate directly against
-- team_members, instead of three per-row function calls.
create function public.org_transactions(p_org_id uuid, p_since date, p_before date default null)
returns setof public.transactions
language plpgsql security definer set search_path = public stable as $$
declare
  is_hq boolean;
begin
  is_hq := public.is_org_member(p_org_id);
  if not is_hq and not exists (
    select 1 from public.team_members tm join public.teams t on t.id = tm.team_id
    where t.org_id = p_org_id and tm.user_id = auth.uid()
  ) then
    return;
  end if;
  return query
    select tr.* from public.transactions tr
    join public.teams t on t.id = tr.team_id
    where t.org_id = p_org_id
      and tr.date >= p_since
      and (p_before is null or tr.date < p_before)
      and (
        is_hq
        or exists (select 1 from public.team_members tm2 where tm2.team_id = tr.team_id and tm2.user_id = auth.uid())
      )
    order by tr.date desc;
end;
$$;
