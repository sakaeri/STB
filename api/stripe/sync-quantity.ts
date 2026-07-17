import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userClient, bearerToken } from '../_lib/supabase';
import { getStripe } from '../_lib/stripe';
import { stepsForCount, parsePricingConfig } from '../_lib/pricing';

// Called (fire-and-forget) after a team is created or deleted, so a live
// subscription's billed quantity tracks the org's actual team count.
// No-ops silently if the org has never subscribed yet.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = bearerToken(req.headers.authorization);
  if (!token) { res.status(401).json({ error: 'ログインが必要です' }); return; }

  const orgId = (req.body || {}).orgId as string | undefined;
  if (!orgId) { res.status(400).json({ error: 'orgIdが必要です' }); return; }

  try {
    const supabase = userClient(token);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) { res.status(401).json({ error: 'ログインが必要です' }); return; }

    // Reading the org row at all already proves membership (RLS-scoped) —
    // any org/team member who could trigger a create/delete may sync.
    const { data: org, error: orgErr } = await supabase
      .from('orgs').select('id, stripe_subscription_id').eq('id', orgId).single();
    if (orgErr || !org) { res.status(404).json({ error: '本部が見つかりません' }); return; }
    if (!org.stripe_subscription_id) { res.status(200).json({ skipped: true }); return; }

    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const { data: pricingRaw } = await supabase.rpc('get_public_pricing');
    const pricing = parsePricingConfig(pricingRaw);
    // Once subscribed, never drop the billed quantity below 1 — a team
    // count back within the free range doesn't auto-cancel the
    // subscription (that's a separate, explicit unsubscribe action).
    const quantity = Math.max(1, stepsForCount(count || 0, pricing));

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) { res.status(200).json({ skipped: true }); return; }

    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: 'create_prorations',
    });

    res.status(200).json({ ok: true, quantity });
  } catch (e) {
    console.error('sync-quantity failed', e);
    res.status(500).json({ error: '数量の同期に失敗しました' });
  }
}
