-- FC売上管理簿 — Stripe subscription billing
-- orgs.status ('active'/'frozen') already exists (0002); Stripe now drives
-- it via webhook instead of only being set by hand from the admin dashboard.
alter table public.orgs add column stripe_customer_id text;
alter table public.orgs add column stripe_subscription_id text;

create index orgs_stripe_customer_id_idx on public.orgs (stripe_customer_id);
create index orgs_stripe_subscription_id_idx on public.orgs (stripe_subscription_id);
