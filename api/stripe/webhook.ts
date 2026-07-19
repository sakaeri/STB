import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { getStripe } from '../_lib/stripe.js';
import { serviceClient } from '../_lib/supabase.js';

// Stripe needs the raw, unparsed request body to verify the signature —
// Vercel's default JSON body parsing would break that.
export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || typeof sig !== 'string' || !webhookSecret) { res.status(400).send('Missing signature'); return; }

  const stripe = getStripe();
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed: ${(err as Error).message}`);
    return;
  }

  const supabase = serviceClient();

  async function setOrgStatus(orgId: string | null | undefined, status: 'active' | 'frozen', label: string) {
    if (!orgId) return;
    const { data } = await supabase.from('orgs').update({ status }).eq('id', orgId).select('name').single();
    if (data) {
      await supabase.from('admin_audit_log').insert({ text: `「${data.name}」を${label}しました（Stripe自動）` });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        if (orgId && subscriptionId) {
          await supabase.from('orgs').update({ stripe_subscription_id: subscriptionId, status: 'active' }).eq('id', orgId);

          // Checkout sets a default payment method on the *subscription*,
          // but step-up ad-hoc invoices (sync-quantity.ts) bill the
          // *customer* directly and resolve payment via the customer's own
          // invoice_settings.default_payment_method — which Checkout does
          // NOT set. Without this, every ad-hoc invoice has no payment
          // method to charge and fails, freezing the org every time.
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const pmId = typeof sub.default_payment_method === 'string' ? sub.default_payment_method : sub.default_payment_method?.id;
            const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
            if (pmId && customerId) {
              await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pmId } });
            }
          } catch (pmErr) {
            console.error('checkout.session.completed: failed to set customer default payment method', pmErr);
          }
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        const active = sub.status === 'active' || sub.status === 'trialing';
        if (orgId) {
          const quantity = sub.items.data[0]?.quantity ?? 0;
          await supabase.from('orgs').update({ billed_step: quantity }).eq('id', orgId);
        }
        await setOrgStatus(orgId, active ? 'active' : 'frozen', active ? '凍結解除' : '凍結');
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        // Clear stripe_subscription_id along with freezing — a canceled
        // subscription can't be paid via an "outstanding invoice" (there
        // isn't one), so create-checkout-session.ts needs to see this as
        // "never subscribed" and start a fresh Checkout next time, not
        // dead-end looking for an invoice that will never exist.
        if (orgId) await supabase.from('orgs').update({ stripe_subscription_id: null }).eq('id', orgId);
        await setOrgStatus(orgId, 'frozen', '凍結');
        break;
      }
      // A step-up's immediate ad-hoc invoice (see sync-quantity.ts) can fail
      // synchronously there (already frozen at that point) or settle later
      // via Stripe's own automatic retries — this unfreezes once it does.
      // Gated to invoice.subscription == null so this never fires for the
      // regular recurring subscription-cycle invoice, which is already
      // handled via customer.subscription.updated above.
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) await setOrgStatus(invoice.metadata?.org_id, 'active', '凍結解除');
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) await setOrgStatus(invoice.metadata?.org_id, 'frozen', '凍結');
        break;
      }
      default:
        break;
    }
    res.status(200).json({ received: true });
  } catch (e) {
    console.error('stripe webhook handling failed', e);
    res.status(500).json({ error: 'webhook processing failed' });
  }
}
