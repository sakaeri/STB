import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userClient, serviceClient, bearerToken } from '../_lib/supabase.js';
import { getStripe } from '../_lib/stripe.js';
import { stepsForCount, parsePricingConfig } from '../_lib/pricing.js';

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
    if (orgErr || !org) {
      console.error('sync-quantity: orgs lookup failed', orgErr);
      res.status(404).json({ error: `本部が見つかりません${orgErr ? `（${orgErr.message}）` : ''}` });
      return;
    }
    if (!org.stripe_subscription_id) { res.status(200).json({ skipped: true }); return; }

    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const { data: pricingRaw } = await supabase.rpc('get_public_pricing');
    const pricing = parsePricingConfig(pricingRaw);
    const quantity = Math.max(1, stepsForCount(count || 0, pricing));

    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const item = subscription.items.data[0];
    if (!item) { res.status(200).json({ skipped: true }); return; }
    const previousQuantity = item.quantity || 0;

    // Only a genuine step-up auto-applies here. A decrease never lowers
    // billing on its own — the owner has to press the explicit "◯◯円に
    // 変更" button (downgrade-plan.ts) for that. Nothing to do otherwise.
    if (quantity <= previousQuantity) {
      res.status(200).json({ ok: true, skipped: 'not-an-increase' });
      return;
    }

    // 'none' rather than the default 'create_prorations': day-fraction
    // proration on every single team create piles up confusing
    // partial-period charge line items on the upcoming invoice.
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: 'none',
    });
    await serviceClient().from('orgs').update({ billed_step: quantity }).eq('id', orgId);

    // Crossing into a new paid step is billed for immediately, in full —
    // a flat step price, not a day-based fraction of the current period —
    // rather than silently deferring the higher amount to next renewal
    // (which is what 'none' above would otherwise do on its own).
    const addedSteps = quantity - previousQuantity;
    const amount = addedSteps * pricing.pricePerStep;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    if (amount > 0 && customerId) {
      try {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount,
          currency: 'jpy',
          description: `プラン変更（${previousQuantity} → ${quantity}ステップ）`,
          metadata: { org_id: orgId },
        });
        const invoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: 'charge_automatically',
          metadata: { org_id: orgId },
        });
        if (invoice.id) {
          await stripe.invoices.finalizeInvoice(invoice.id);
          await stripe.invoices.pay(invoice.id);
        }
      } catch (invoiceErr) {
        // The card was actually declined (or some other payment failure)
        // for the extra step(s) just added — team creation and the
        // quantity sync above already succeeded, so don't fail the whole
        // request, but don't let the org keep running unpaid either.
        // invoice.paid (webhook) unfreezes once it's actually settled
        // (Stripe's automatic retries, or the customer paying the
        // invoice directly from Stripe).
        console.error('sync-quantity: immediate step-up invoice failed', invoiceErr);
        await serviceClient().from('orgs').update({ status: 'frozen' }).eq('id', orgId);
        await serviceClient().from('admin_audit_log').insert({ text: `プラン変更の請求に失敗したため凍結しました（本部ID: ${orgId}）` });
      }
    }

    res.status(200).json({ ok: true, quantity });
  } catch (e) {
    console.error('sync-quantity failed', e);
    res.status(500).json({ error: '数量の同期に失敗しました' });
  }
}
