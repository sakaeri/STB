-- Saved 項目名+金額 combos per team, so repeat sales/expense entries
-- (rent, a regular supply order, payroll, etc.) can be picked from a list
-- instead of retyped every time.
create table public.entry_presets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  type text not null check (type in ('sales', 'expense')),
  title text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.entry_presets enable row level security;

create policy "entry_presets: select if team accessible" on public.entry_presets for select
  using (public.can_access_team(team_id));
create policy "entry_presets: insert if team accessible" on public.entry_presets for insert
  with check (public.can_access_team(team_id));
create policy "entry_presets: delete if team accessible" on public.entry_presets for delete
  using (public.can_access_team(team_id));
