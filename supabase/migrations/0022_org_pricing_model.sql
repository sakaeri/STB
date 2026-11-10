-- New pricing model (30-day trial, then freeze if unpaid) applies only to
-- orgs created from here on. Existing orgs keep today's "N teams free
-- forever" behavior untouched — the column default backfills every
-- existing row as 'legacy' automatically, with zero data migration.
-- New orgs are stamped 'trial' explicitly at insert time (see
-- createOrgWithFirstTeam in src/state/dataLoader.ts). The 30-day window
-- itself is computed from created_at (no separate trial_ends_at column,
-- to avoid a second source of truth) — see fetchOrgData's freeze check.
alter table public.orgs add column pricing_model text not null default 'legacy' check (pricing_model in ('legacy', 'trial'));
