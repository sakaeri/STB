import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userClient, bearerToken } from '../_lib/supabase';
import { getStripe } from '../_lib/stripe';

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

    // Billing is an ownership-level action even though team CRUD is open to
    // any org member — only オーナー may start/manage the subscription.
    const { data: memberRow, error: memberErr } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userRes.user.id)
      .maybeSingle();
    if (memberErr || !memberRow || memberRow.role !== 'オーナー') {
      res.status(403).json({ error: 'オーナーのみお支払い手続きができます' });
      return;
    }

    const { data: org, error: orgErr } = await supabase
      .from('orgs').select('id, name, stripe_customer_id').eq('id', orgId).single();
    if (orgErr || !org) { res.status(404).json({ error: '本部が見つかりません' }); return; }

    const { count } = await supabase.from('teams').select('id', { count: 'exact', head: true }).eq('org_id', orgId);
    const quantity = Math.max(1, count || 1);

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) { res.status(500).json({ error: 'サーバー設定エラー（STRIPE_PRICE_ID未設定）' }); return; }

    const stripe = getStripe();

    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRes.user.email || undefined,
        name: org.name,
        metadata: { org_id: orgId },
      });
      customerId = customer.id;
      await supabase.from('orgs').update({ stripe_customer_id: customerId }).eq('id', orgId);
    }

    const origin = (req.headers.origin as string) || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity }],
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancel`,
      metadata: { org_id: orgId },
      subscription_data: { metadata: { org_id: orgId } },
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('create-checkout-session failed', e);
    res.status(500).json({ error: 'お支払い手続きの開始に失敗しました' });
  }
}
