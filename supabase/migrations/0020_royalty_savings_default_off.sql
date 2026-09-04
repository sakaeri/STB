-- Royalty and savings are FC-specific concepts that most business types
-- (now that HQ setup offers non-FC industry templates too) won't need —
-- new orgs/teams should start with both off and let the owner turn them
-- on, rather than the other way around. Existing rows are untouched;
-- this only changes the default applied to future inserts.
alter table public.orgs alter column default_use_royalty set default false;
alter table public.orgs alter column default_use_savings set default false;
alter table public.teams alter column use_royalty set default false;
alter table public.teams alter column use_savings set default false;
