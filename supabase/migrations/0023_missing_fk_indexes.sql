-- FC売上管理簿 — add indexes on foreign-key columns that every page's
-- initial data load filters or joins by, but that Postgres never creates
-- automatically (only primary keys and UNIQUE constraints get one for
-- free). org_members/team_members' own unique constraints are (org_id,
-- user_id) / (team_id, user_id) — usable for org_id/team_id lookups, but
-- NOT for the "which orgs/teams am I in" lookup by user_id alone that
-- runs on every login. memo_topics/memo_entries/memo_records/trash_items/
-- entry_presets have no index at all on their filter/join column, so as
-- those tables grow past a trivial row count, the 3-level nested memo
-- embed and the rest of fetchOrgData degrade into sequential scans on
-- every single page load (list/memo/本部情報/dashboard all wait on the
-- same initial fetch). Run this once in the Supabase SQL Editor.
create index if not exists org_members_user_id_idx on public.org_members (user_id);
create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists memo_topics_org_id_idx on public.memo_topics (org_id);
create index if not exists memo_entries_topic_id_idx on public.memo_entries (topic_id);
create index if not exists memo_records_entry_id_idx on public.memo_records (entry_id);
create index if not exists trash_items_org_id_idx on public.trash_items (org_id);
create index if not exists entry_presets_team_id_idx on public.entry_presets (team_id);
