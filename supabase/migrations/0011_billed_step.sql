-- Tracks the plan step Stripe is actually billing (subscription item
-- quantity), kept in sync by api/stripe/webhook.ts. UI plan/price displays
-- take max(billed_step, live-team-count step) so a team-count decrease
-- alone never shows a lower price than what Stripe is really charging —
-- Stripe's own subscription quantity never auto-drops back to 0 once
-- subscribed (see api/stripe/sync-quantity.ts).
alter table public.orgs add column billed_step integer not null default 0;
