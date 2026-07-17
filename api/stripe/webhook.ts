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
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.org_id;
        const active = sub.status === 'active' || sub.status === 'trialing';
        await setOrgStatus(orgId, active ? 'active' : 'frozen', active ? '凍結解除' : '凍結');
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await setOrgStatus(sub.metadata?.org_id, 'frozen', '凍結');
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
