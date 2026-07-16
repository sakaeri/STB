-- FC売上管理簿 — invites + admin/operator dashboard schema
-- Run this once in the Supabase SQL Editor, after 0001_init.sql.

-- ============================================================
-- one-time-use invite URLs (team join links, shared manually e.g. via LINE)
-- ============================================================
-- team_id null = an HQ-level invite (redeems into org_members instead of
-- team_members); otherwise a per-team invite.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  role text not null check (role in ('オーナー','管理者','編集者','閲覧者')),
  created_by uuid references public.profiles(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
alter table public.invites enable row level security;
-- no policies: all access goes through the security-definer RPCs below.

create function public.create_invite(p_team_id uuid, p_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org_id uuid; v_id uuid;
begin
  select org_id into v_org_id from public.teams where id = p_team_id;
  if v_org_id is null then
    raise exception 'チームが見つかりません';
  end if;
  if not public.can_manage_team(p_team_id) then
    raise exception 'このオペレーションを行う権限がありません';
  end if;
  if p_role not in ('管理者','編集者','閲覧者') then
    raise exception '不正な権限です';
  end if;
  insert into public.invites (org_id, team_id, role, created_by)
  values (v_org_id, p_team_id, p_role, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function public.create_org_invite(p_org_id uuid, p_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_org_owner(p_org_id) then
    raise exception 'このオペレーションを行う権限がありません';
  end if;
  if p_role not in ('オーナー','編集者','閲覧者') then
    raise exception '不正な権限です';
  end if;
  insert into public.invites (org_id, team_id, role, created_by)
  values (p_org_id, null, p_role, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- public preview (callable before login) — never exposes anything beyond
-- what's needed to show "join X as Y" on the invite landing screen.
create function public.get_invite_info(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_row record;
begin
  select i.used_at, i.expires_at, i.role, i.team_id, o.name as org_name, t.name as team_name
    into v_row
    from public.invites i
    join public.orgs o on o.id = i.org_id
    left join public.teams t on t.id = i.team_id
   where i.id = p_id;

  if not found then
    return json_build_object('valid', false, 'reason', 'not_found');
  end if;
  if v_row.used_at is not null then
    return json_build_object('valid', false, 'reason', 'used');
  end if;
  if v_row.expires_at < now() then
    return json_build_object('valid', false, 'reason', 'expired');
  end if;
  return json_build_object(
    'valid', true, 'orgName', v_row.org_name, 'teamName', v_row.team_name, 'role', v_row.role,
    'scope', case when v_row.team_id is null then 'org' else 'team' end
  );
end;
$$;
grant execute on function public.get_invite_info(uuid) to anon, authenticated;

create function public.redeem_invite(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare v_row public.invites%rowtype; v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'ログインが必要です';
  end if;

  -- lock the row so two concurrent redemptions of the same one-time link
  -- can't both succeed
  select * into v_row from public.invites where id = p_id for update;
  if not found then
    raise exception 'この招待URLは無効です';
  end if;
  if v_row.used_at is not null then
    raise exception 'この招待URLはすでに使用されています';
  end if;
  if v_row.expires_at < now() then
    raise exception 'この招待URLの有効期限が切れています';
  end if;

  if v_row.team_id is null then
    insert into public.org_members (org_id, user_id, role)
    values (v_row.org_id, v_uid, v_row.role)
    on conflict (org_id, user_id) do update set role = excluded.role;
  else
    insert into public.team_members (team_id, user_id, role)
    values (v_row.team_id, v_uid, v_row.role)
    on conflict (team_id, user_id) do update set role = excluded.role;
  end if;

  update public.invites set used_by = v_uid, used_at = now() where id = p_id;

  return json_build_object('orgId', v_row.org_id, 'teamId', v_row.team_id);
end;
$$;
grant execute on function public.redeem_invite(uuid) to authenticated;

-- ============================================================
-- admin/operator dashboard
-- ============================================================
alter table public.orgs add column status text not null default 'active' check (status in ('active','frozen'));
alter table public.orgs add column reading text not null default '';

create function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- admins can see/manage every org regardless of membership (additional
-- permissive policies — combined with the existing ones via OR)
create policy "orgs: admin select" on public.orgs for select using (public.is_admin());
create policy "orgs: admin update" on public.orgs for update using (public.is_admin());
create policy "orgs: admin delete" on public.orgs for delete using (public.is_admin());
create policy "teams: admin select" on public.teams for select using (public.is_admin());
create policy "transactions: admin select" on public.transactions for select using (public.is_admin());

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  text text not null,
  created_by uuid references public.profiles(id)
);
alter table public.admin_audit_log enable row level security;
create policy "admin_audit_log: admin select" on public.admin_audit_log for select using (public.is_admin());
create policy "admin_audit_log: admin insert" on public.admin_audit_log for insert with check (public.is_admin());

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  logo_url text,
  billing_provider text not null default 'stripe' check (billing_provider in ('stripe','square')),
  billing_api_key_stripe text not null default '',
  billing_api_key_square text not null default '',
  payment_grace_days int not null default 7,
  terms text not null default '',
  plan_prices jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id, terms) values (1, $terms$第1条（本規約について）
本規約は、運営事務局（以下「当社」）が提供するFC売上管理サービス（以下「本サービス」）の利用条件を定めるものです。

第2条（利用料金）
本サービスの利用料金は加盟チーム数に応じたプランごとに定め、毎月自動で課金します。

第3条（禁止事項）
利用者は、法令違反、不正アクセス、その他当社が不適切と判断する行為を行ってはなりません。$terms$)
on conflict (id) do nothing;
alter table public.app_settings enable row level security;
create policy "app_settings: admin select" on public.app_settings for select using (public.is_admin());
create policy "app_settings: admin update" on public.app_settings for update using (public.is_admin());

-- terms text must be readable pre-login (shown from the signup screen), but
-- app_settings also holds billing secrets — so expose only the terms text,
-- not the whole row, to anon/authenticated callers.
create function public.get_public_terms()
returns text language sql security definer set search_path = public stable as $$
  select terms from public.app_settings where id = 1;
$$;
grant execute on function public.get_public_terms() to anon, authenticated;
