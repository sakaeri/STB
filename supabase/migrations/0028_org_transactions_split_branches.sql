-- FC売上管理簿 — org_transactions (0027) still timed out for the affected
-- org even after the fix, just less often. Likely cause: its WHERE clause
-- used `is_hq or exists(...)`, with is_hq a plpgsql variable bound as a
-- query parameter. Postgres plans a function's queries fresh (a "custom
-- plan") for its first several calls, which can constant-fold is_hq=true
-- and skip the exists() entirely — but this function runs on every
-- single login, so after ~5 calls Postgres can switch to a cached
-- "generic plan" that no longer knows is_hq's value at plan time, and the
-- per-row exists() check comes back exactly like the original bug this
-- was meant to fix.
--
-- Fix: branch in plpgsql instead of an OR in SQL, so each branch is its
-- own simple query with no parameter-dependent condition to (not) fold.
-- HQ members (the common case, including the affected org) get a plain
-- org-scoped join with nothing per-row to evaluate; non-HQ members get a
-- second, separately-planned query that also joins team_members.
create or replace function public.org_transactions(p_org_id uuid, p_since date, p_before date default null)
returns setof public.transactions
language plpgsql security definer set search_path = public stable as $$
begin
  if public.is_org_member(p_org_id) then
    return query
      select tr.*
      from public.transactions tr
      join public.teams t on t.id = tr.team_id
      where t.org_id = p_org_id
        and tr.date >= p_since
        and (p_before is null or tr.date < p_before)
      order by tr.date desc;
  else
    return query
      select tr.*
      from public.transactions tr
      join public.teams t on t.id = tr.team_id
      join public.team_members tm on tm.team_id = tr.team_id and tm.user_id = auth.uid()
      where t.org_id = p_org_id
        and tr.date >= p_since
        and (p_before is null or tr.date < p_before)
      order by tr.date desc;
  end if;
end;
$$;
