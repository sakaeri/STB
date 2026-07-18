-- FC売上管理簿 — optional daily closing, alongside the existing monthly
-- closing-day confirmation. HQ can turn it on per-org; when on, each team
-- confirms the previous day's sales/expenses (yesterday is always
-- closeable — no grace-period concept needed like the monthly closing day).
alter table public.orgs add column daily_closing_enabled boolean not null default false;
