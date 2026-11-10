-- FC売上管理簿 — resolving member display names used to embed profiles(name)
-- directly on the org_members/team_members queries. profiles' own RLS
-- policy ("read own or shared-org member") calls shares_org_with(id) for
-- EVERY row returned by that embed — a function that does up to three
-- self-joins across org_members/team_members — so the cost scales with
-- how many members the org has, on top of everything else fetchOrgData
-- already does. And it's redundant work: by the time org_members/
-- team_members' own RLS has let a caller see a given member row at all,
-- they've already proven they can access that same org — there's nothing
-- left for a second, per-row check to actually decide.
--
-- This RPC checks access once (not once per row), then resolves every
-- name for the org in a single bypass-RLS lookup.
create function public.org_people(p_org_id uuid)
returns table(user_id uuid, name text)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.can_access_org(p_org_id) then
    return;
  end if;
  return query
    select p.id, p.name
    from public.profiles p
    where p.id in (
      select om.user_id from public.org_members om where om.org_id = p_org_id
      union
      select tm.user_id from public.team_members tm join public.teams t on t.id = tm.team_id where t.org_id = p_org_id
    );
end;
$$;
