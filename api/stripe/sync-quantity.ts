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
    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const { data: pricingRaw } = await supabase.rpc('get_public_pricing');
    const pricing = parsePricingConfig(pricingRaw);

    // Shared by both "never subscribed" and "subscription turned out to be
    // stale/dead" below: nothing is actually being billed, so if team
    // count has grown past the free tier, freeze rather than silently
    // letting paid-tier usage continue unpaid. Freezing isn't a dead end
    // here: the frozen banner's "お支払い手続きへ" button already starts a
    // brand new Checkout whenever stripe_subscription_id is null, so this
    // is effectively "send them to sign up again", not a block.
    const freezeIfOverFreeTier = async (): Promise<boolean> => {
      if (stepsForCount(count || 0, pricing) > 0) {
        const service = serviceClient();
        const { data } = await service.from('orgs').update({ status: 'frozen' }).eq('id', orgId).select('name').single();
        if (data) await service.from('admin_audit_log').insert({ text: `「${data.name}」を凍結しました（無料枠を超えたが未契約）` });
        return true;
      }
      return false;
    };

    if (!org.stripe_subscription_id) {
      // No subscription at all — never started one, or it's fully ended
      // (e.g. an immediate Stripe-side cancellation, not just a scheduled
      // downgrade-to-Free).
      const frozen = await freezeIfOverFreeTier();
      // frozen tells the caller (e.g. right after creating a team) to
      // surface this immediately instead of it only showing up next time
      // Settings happens to reload — this endpoint is otherwise called
      // fire-and-forget with nothing checking its response.
      res.status(200).json({ skipped: true, frozen });
      return;
    }

    const quantity = Math.max(1, stepsForCount(count || 0, pricing));

    const stripe = getStripe();
    // Defensively re-verify the subscription is actually still live — a
    // stale id here (webhook never fired, or Stripe-side inconsistency)
    // would otherwise throw further down trying to update a subscription
    // that no longer accepts changes, which silently fails since this
    // whole endpoint is called fire-and-forget from the client and its
    // error never reaches anyone. Treat it exactly like "no subscription".
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id).catch(() => null);
    if (!subscription || subscription.status === 'canceled') {
      await serviceClient().from('orgs').update({ stripe_subscription_id: null, billed_step: 0 }).eq('id', orgId);
      const frozen = await freezeIfOverFreeTier();
      res.status(200).json({ skipped: true, frozen });
      return;
    }
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
    // cancel_at_period_end: false undoes a previously scheduled
    // downgrade-to-Free (downgrade-plan.ts) — actively adding enough
    // teams to trigger a real step-up is clear evidence of continued
    // intent to use (and pay for) the service, so a stale scheduled
    // cancellation shouldn't silently still take effect at period end.
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: 'none',
      cancel_at_period_end: false,
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
          // Defaults to 'exclude' if omitted — without this, the invoice
          // item just created above is left out, so the invoice comes back
          // empty and nothing actually gets charged. The pending item then
          // just sits there and gets swept into the *next* real renewal
          // invoice instead, silently defeating the entire point of
          // billing the step-up immediately.
          pending_invoice_items_behavior: 'include',
          metadata: { org_id: orgId },
        });
        if (invoice.id) {
          await stripe.invoices.finalizeInvoice(invoice.id);
          // Explicitly pass the subscription's own payment method rather
          // than relying on the customer's default_payment_method being
          // set — Checkout sets the former but not always the latter, and
          // without either, pay() has nothing to charge and always fails.
          const pmId = typeof subscription.default_payment_method === 'string'
            ? subscription.default_payment_method
            : subscription.default_payment_method?.id;
          await stripe.invoices.pay(invoice.id, pmId ? { payment_method: pmId } : undefined);
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
