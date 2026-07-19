import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userClient, serviceClient, bearerToken } from '../_lib/supabase.js';
import { getStripe } from '../_lib/stripe.js';
import { stepsForCount, parsePricingConfig } from '../_lib/pricing.js';

// The owner explicitly choosing to lower billing to match a reduced team
// count. Billing never does this on its own (sync-quantity.ts only ever
// raises billed_step) — this is the "separate, explicit" action that
// comment always pointed at.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const token = bearerToken(req.headers.authorization);
  if (!token) { res.status(401).json({ error: 'ログインが必要です' }); return; }

  const orgId = (req.body || {}).orgId as string | undefined;
  if (!orgId) { res.status(400).json({ error: 'orgIdが必要です' }); return; }

  try {
    const supabase = userClient(token);
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) { res.status(401).json({ error: 'ログインが必要です' }); return; }

    // Same ownership gate as starting billing in the first place.
    const { data: memberRow, error: memberErr } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userRes.user.id)
      .maybeSingle();
    if (memberErr || !memberRow || memberRow.role !== 'オーナー') {
      res.status(403).json({ error: 'オーナーのみプラン変更ができます' });
      return;
    }

    const { data: org, error: orgErr } = await supabase
      .from('orgs').select('id, stripe_subscription_id').eq('id', orgId).single();
    if (orgErr || !org || !org.stripe_subscription_id) {
      res.status(400).json({ error: '契約情報が見つかりませんでした' });
      return;
    }

    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const { data: pricingRaw } = await supabase.rpc('get_public_pricing');
    const pricing = parsePricingConfig(pricingRaw);
    // Floor at 1 here too — this lowers billing to match the current team
    // count, it doesn't cancel the subscription. A true ¥0 requires a
    // separate, explicit unsubscribe.
    const quantity = Math.max(1, stepsForCount(count || 0, pricing));

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) { res.status(400).json({ error: '契約情報が見つかりませんでした' }); return; }

    // No proration: this takes effect for the next renewal, matching how
    // step-downs already behave — only step-ups are billed immediately
    // (see sync-quantity.ts).
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: 'none',
    });

    const service = serviceClient();
    await service.from('orgs').update({ billed_step: quantity }).eq('id', orgId);
    await service.from('admin_audit_log').insert({ text: `本部が手動でプランを¥${(quantity * pricing.pricePerStep).toLocaleString('ja-JP')}/月に変更しました（本部ID: ${orgId}）` });

    res.status(200).json({ ok: true, quantity });
  } catch (e) {
    console.error('downgrade-plan failed', e);
    res.status(500).json({ error: 'プラン変更に失敗しました' });
  }
}
