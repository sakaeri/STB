-- FC売上管理簿 — initial schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query → paste → Run).
-- Tables first, then helper functions, then RLS policies (so forward references resolve).

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  address text not null default '',
  rep text not null default '',
  closing_day text not null default 'eom',
  fiscal_start_month int not null default 4,
  unit_label text,
  unit_label_plural text,
  logo_url text,
  default_use_royalty boolean not null default true,
  default_royalty_mode text not null default 'rate' check (default_royalty_mode in ('rate','amount')),
  default_royalty_rate numeric not null default 5,
  default_royalty_amount numeric not null default 0,
  default_use_savings boolean not null default true,
  default_savings_mode text not null default 'amount' check (default_savings_mode in ('amount','rate')),
  default_savings numeric not null default 50000,
  default_savings_rate numeric not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('オーナー','編集者','閲覧者')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  owner_name text not null default '',
  bg_color text not null default '#3f6fb5',
  logo_url text,
  use_royalty boolean not null default true,
  royalty_mode text not null default 'rate' check (royalty_mode in ('rate','amount')),
  royalty_rate numeric not null default 5,
  royalty_amount numeric not null default 0,
  use_savings boolean not null default true,
  savings_mode text not null default 'amount' check (savings_mode in ('amount','rate')),
  savings numeric not null default 50000,
  savings_rate numeric not null default 0,
  created_period text not null default to_char(now(), 'YYYY-MM'),
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('管理者','編集者','閲覧者')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('sales','expense')),
  title text not null default '',
  amount numeric not null check (amount >= 0),
  date date not null,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index transactions_team_date_idx on public.transactions (team_id, date);

create table public.memo_topics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade, -- null = shared across all teams
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.memo_entries (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.memo_topics(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.memo_records (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.memo_entries(id) on delete cascade,
  label text not null,
  text text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create table public.trash_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  type text not null check (type in ('team','member','hqMember','memoTopic','memoEntry','memoRecord','tx')),
  label text not null,
  data jsonb not null,
  deleted_by uuid references public.profiles(id),
  deleted_at timestamptz not null default now()
);

create table public.confirmed_periods (
  team_id uuid not null references public.teams(id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  primary key (team_id, period)
);

alter table public.profiles enable row level security;
alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.transactions enable row level security;
alter table public.memo_topics enable row level security;
alter table public.memo_entries enable row level security;
alter table public.memo_records enable row level security;
alter table public.trash_items enable row level security;
alter table public.confirmed_periods enable row level security;

-- ============================================================
-- new-user bootstrap: auto-create a profile row on signup
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- RLS helper functions
-- ============================================================
create function public.is_org_member(p_org_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid()
  );
$$;

create function public.is_org_owner(p_org_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and role = 'オーナー'
  );
$$;

create function public.is_team_member(p_team_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create function public.can_access_team(p_team_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_org_member((select org_id from public.teams where id = p_team_id))
      or public.is_team_member(p_team_id);
$$;

create function public.can_manage_team(p_team_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_org_member((select org_id from public.teams where id = p_team_id))
      or exists (
        select 1 from public.team_members
        where team_id = p_team_id and user_id = auth.uid() and role in ('管理者','編集者')
      );
$$;

create function public.can_access_org(p_org_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_org_member(p_org_id)
      or exists (
        select 1 from public.team_members tm
        join public.teams t on t.id = tm.team_id
        where t.org_id = p_org_id and tm.user_id = auth.uid()
      );
$$;

-- can the caller see p_target's profile (name)? true for: fellow HQ
-- members of a shared org, HQ members looking at their org's team
-- members, and team members looking at their own teammates.
create function public.shares_org_with(p_target uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.org_members om1 join public.org_members om2 on om2.org_id = om1.org_id
    where om1.user_id = auth.uid() and om2.user_id = p_target
  ) or exists (
    select 1 from public.org_members om join public.teams t on t.org_id = om.org_id
    join public.team_members tm on tm.team_id = t.id
    where om.user_id = auth.uid() and tm.user_id = p_target
  ) or exists (
    select 1 from public.team_members tm1 join public.team_members tm2 on tm2.team_id = tm1.team_id
    where tm1.user_id = auth.uid() and tm2.user_id = p_target
  );
$$;

-- ============================================================
-- invite-by-email RPCs (the prototype's invite-URL was a UI mock only;
-- this looks up an existing account by email and adds real membership —
-- the invitee must already have signed up)
-- ============================================================
create function public.invite_org_member(p_org_id uuid, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  if not public.is_org_owner(p_org_id) then
    raise exception 'このオペレーションを行う権限がありません';
  end if;
  select id into v_user_id from public.profiles where email = p_email;
  if v_user_id is null then
    raise exception 'このメールアドレスのアカウントが見つかりません。招待する相手に先にアカウント作成してもらってください。';
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (p_org_id, v_user_id, p_role)
  on conflict (org_id, user_id) do update set role = excluded.role;
end;
$$;

create function public.invite_team_member(p_team_id uuid, p_email text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare v_user_id uuid; v_org_id uuid;
begin
  select org_id into v_org_id from public.teams where id = p_team_id;
  if not (public.is_org_member(v_org_id) or public.can_manage_team(p_team_id)) then
    raise exception 'このオペレーションを行う権限がありません';
  end if;
  select id into v_user_id from public.profiles where email = p_email;
  if v_user_id is null then
    raise exception 'このメールアドレスのアカウントが見つかりません。招待する相手に先にアカウント作成してもらってください。';
  end if;
  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, v_user_id, p_role)
  on conflict (team_id, user_id) do update set role = excluded.role;
end;
$$;

-- ============================================================
-- RLS policies
-- ============================================================

create policy "profiles: read own or shared-org member" on public.profiles for select
  using (id = auth.uid() or public.shares_org_with(id));
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid());

create policy "orgs: select if accessible" on public.orgs for select
  using (public.can_access_org(id));
create policy "orgs: insert own" on public.orgs for insert
  with check (created_by = auth.uid());
create policy "orgs: update by owner" on public.orgs for update
  using (public.is_org_owner(id));
create policy "orgs: delete by owner" on public.orgs for delete
  using (public.is_org_owner(id));

create policy "org_members: select if org accessible" on public.org_members for select
  using (public.can_access_org(org_id));
-- allow org owners to add members, OR the org's creator to bootstrap
-- themselves as the first オーナー (only while the org has zero members yet —
-- this prevents anyone else from self-inserting into an existing org)
create policy "org_members: insert by owner or self-bootstrap" on public.org_members for insert
  with check (
    public.is_org_owner(org_id)
    or (
      user_id = auth.uid()
      and exists (select 1 from public.orgs o where o.id = org_id and o.created_by = auth.uid())
      and not exists (select 1 from public.org_members m where m.org_id = org_members.org_id)
    )
  );
create policy "org_members: update by owner" on public.org_members for update
  using (public.is_org_owner(org_id));
create policy "org_members: delete by owner" on public.org_members for delete
  using (public.is_org_owner(org_id));

create policy "teams: select if accessible" on public.teams for select
  using (public.can_access_org(org_id) or public.is_team_member(id));
create policy "teams: insert by org member" on public.teams for insert
  with check (public.is_org_member(org_id));
create policy "teams: update by org member or team manager" on public.teams for update
  using (public.is_org_member(org_id) or public.can_manage_team(id));
create policy "teams: delete by org member" on public.teams for delete
  using (public.is_org_member(org_id));

create policy "team_members: select if team accessible" on public.team_members for select
  using (public.can_access_team(team_id));
-- direct inserts are HQ-manager-only; per-team invites go through the
-- invite_team_member() RPC below (security definer, permission-checked)
create policy "team_members: insert by org member" on public.team_members for insert
  with check (public.is_org_member((select org_id from public.teams where id = team_id)));
create policy "team_members: update by org member" on public.team_members for update
  using (public.is_org_member((select org_id from public.teams where id = team_id)));
create policy "team_members: delete by org member" on public.team_members for delete
  using (public.is_org_member((select org_id from public.teams where id = team_id)));

create policy "transactions: select if team accessible" on public.transactions for select
  using (public.can_access_team(team_id));
create policy "transactions: insert if team accessible" on public.transactions for insert
  with check (public.can_access_team(team_id));
create policy "transactions: update if can manage team" on public.transactions for update
  using (public.can_manage_team(team_id));
create policy "transactions: delete if can manage team" on public.transactions for delete
  using (public.can_manage_team(team_id));

create policy "memo_topics: select if org accessible" on public.memo_topics for select
  using (public.can_access_org(org_id));
create policy "memo_topics: insert if org accessible" on public.memo_topics for insert
  with check (public.can_access_org(org_id));
create policy "memo_topics: update if can manage" on public.memo_topics for update
  using (public.is_org_member(org_id) or (team_id is not null and public.can_manage_team(team_id)));
create policy "memo_topics: delete if can manage" on public.memo_topics for delete
  using (public.is_org_member(org_id) or (team_id is not null and public.can_manage_team(team_id)));

create policy "memo_entries: select if topic accessible" on public.memo_entries for select
  using (exists (select 1 from public.memo_topics t where t.id = topic_id and public.can_access_org(t.org_id)));
create policy "memo_entries: insert if topic accessible" on public.memo_entries for insert
  with check (exists (select 1 from public.memo_topics t where t.id = topic_id and public.can_access_org(t.org_id)));
create policy "memo_entries: update if can manage" on public.memo_entries for update
  using (exists (select 1 from public.memo_topics t where t.id = topic_id
    and (public.is_org_member(t.org_id) or (t.team_id is not null and public.can_manage_team(t.team_id)))));
create policy "memo_entries: delete if can manage" on public.memo_entries for delete
  using (exists (select 1 from public.memo_topics t where t.id = topic_id
    and (public.is_org_member(t.org_id) or (t.team_id is not null and public.can_manage_team(t.team_id)))));

create policy "memo_records: select if entry accessible" on public.memo_records for select
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and public.can_access_org(t.org_id)
  ));
create policy "memo_records: insert if entry accessible" on public.memo_records for insert
  with check (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and public.can_access_org(t.org_id)
  ));
create policy "memo_records: update if can manage" on public.memo_records for update
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (public.is_org_member(t.org_id) or (t.team_id is not null and public.can_manage_team(t.team_id)))
  ));
create policy "memo_records: delete if can manage" on public.memo_records for delete
  using (exists (
    select 1 from public.memo_entries e join public.memo_topics t on t.id = e.topic_id
    where e.id = entry_id and (public.is_org_member(t.org_id) or (t.team_id is not null and public.can_manage_team(t.team_id)))
  ));

create policy "trash_items: select if org accessible" on public.trash_items for select
  using (public.can_access_org(org_id));
create policy "trash_items: insert if org accessible" on public.trash_items for insert
  with check (public.can_access_org(org_id));
create policy "trash_items: delete if org accessible" on public.trash_items for delete
  using (public.can_access_org(org_id));

create policy "confirmed_periods: select if team accessible" on public.confirmed_periods for select
  using (public.can_access_team(team_id));
create policy "confirmed_periods: insert if team accessible" on public.confirmed_periods for insert
  with check (public.can_access_team(team_id));

-- ============================================================
-- storage: a public "logos" bucket for org/team logos and transaction photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: public read" on storage.objects for select
  using (bucket_id = 'logos');
create policy "logos: authenticated write" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos');
create policy "logos: authenticated update own" on storage.objects for update to authenticated
  using (bucket_id = 'logos');
