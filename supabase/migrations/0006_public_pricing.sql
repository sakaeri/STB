-- FC売上管理簿 — public read access to the linear pricing config
-- (freeTeams/teamsPerStep/pricePerStep), needed by every signed-in user to
-- show plan badges and upgrade-confirmation prices, and by the Stripe
-- checkout/quantity-sync server functions to compute billing quantity —
-- none of which are admins, so app_settings' admin-only RLS doesn't apply.
create function public.get_public_pricing()
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(plan_prices, '{}'::jsonb) from public.app_settings where id = 1;
$$;
grant execute on function public.get_public_pricing() to anon, authenticated;
