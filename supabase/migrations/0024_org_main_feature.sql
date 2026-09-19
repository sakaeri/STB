-- FC売上管理簿 — lets HQ choose which feature (売上管理 or 情報メモ) is
-- the org's main workflow. Drives which page is shown right after login,
-- for orgs that mainly use 情報メモ and shouldn't have to land on
-- 売上一覧 every time. Existing orgs default to 'sales' (today's behavior).
alter table public.orgs add column main_feature text not null default 'sales'
  check (main_feature in ('sales', 'memo'));
