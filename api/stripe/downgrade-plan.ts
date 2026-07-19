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
    if (orgErr || !org) {
      res.status(400).json({ error: '本部情報が見つかりませんでした' });
      return;
    }

    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const { data: pricingRaw } = await supabase.rpc('get_public_pricing');
    const pricing = parsePricingConfig(pricingRaw);
    // Unfloored — this is the actual target the client showed and
    // confirmed (downgradeCandidatePlan / the "◯◯に変更" button), which
    // can genuinely be Free (step 0). sync-quantity.ts floors at 1 because
    // *that* path runs automatically after every team change and must
    // never silently cancel anything; this path is a one-off, confirmed,
    // owner-initiated action, so 0 is allowed here.
    const targetStep = stepsForCount(count || 0, pricing);

    if (!org.stripe_subscription_id) {
      // Nothing is actually being billed right now (never subscribed, or
      // a past cancellation left billed_step stale) — there's no Stripe
      // subscription to adjust, so just correct the stored step directly
      // instead of erroring out with "no contract found" for an action
      // that, from the owner's point of view, is simply "go to Free".
      const service = serviceClient();
      await service.from('orgs').update({ billed_step: targetStep }).eq('id', orgId);
      const label = targetStep === 0 ? 'Free' : `¥${(targetStep * pricing.pricePerStep).toLocaleString('ja-JP')}/月`;
      await service.from('admin_audit_log').insert({ text: `本部が手動でプランを${label}に変更しました（契約なし・本部ID: ${orgId}）` });
      res.status(200).json({ ok: true, quantity: targetStep });
      return;
    }

    const stripe = getStripe();
    // Defensively re-verify the subscription is actually still live (the
    // webhook clears stripe_subscription_id on cancellation, but a stale
    // id or a Stripe-side inconsistency shouldn't hard-fail this action —
    // fall back to the "nothing to adjust" path above instead).
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id).catch(() => null);
    const item = subscription && subscription.status !== 'canceled' ? subscription.items.data[0] : null;
    if (!item) {
      const service = serviceClient();
      await service.from('orgs').update({ stripe_subscription_id: null, billed_step: targetStep }).eq('id', orgId);
      const label = targetStep === 0 ? 'Free' : `¥${(targetStep * pricing.pricePerStep).toLocaleString('ja-JP')}/月`;
      await service.from('admin_audit_log').insert({ text: `本部が手動でプランを${label}に変更しました（契約なし・本部ID: ${orgId}）` });
      res.status(200).json({ ok: true, quantity: targetStep });
      return;
    }

    if (targetStep === 0) {
      // Stripe subscription items can't have quantity 0 — reaching true
      // Free means ending the subscription, but not mid-period (already
      // paid for): schedule it to lapse at the current period's end
      // instead of canceling immediately.
      await stripe.subscriptions.update(org.stripe_subscription_id, { cancel_at_period_end: true });
    } else {
      // No proration: this takes effect for the next renewal, matching
      // how step-downs already behave — only step-ups are billed
      // immediately (see sync-quantity.ts).
      await stripe.subscriptions.update(org.stripe_subscription_id, {
        items: [{ id: item.id, quantity: targetStep }],
        proration_behavior: 'none',
        cancel_at_period_end: false,
      });
    }

    const service = serviceClient();
    await service.from('orgs').update({ billed_step: targetStep }).eq('id', orgId);
    const label = targetStep === 0 ? 'Free' : `¥${(targetStep * pricing.pricePerStep).toLocaleString('ja-JP')}/月`;
    await service.from('admin_audit_log').insert({ text: `本部が手動でプランを${label}に変更しました（本部ID: ${orgId}）` });

    res.status(200).json({ ok: true, quantity: targetStep });
  } catch (e) {
    console.error('downgrade-plan failed', e);
    res.status(500).json({ error: 'プラン変更に失敗しました' });
  }
}
