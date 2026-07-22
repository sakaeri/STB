import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeEmbeddedCheckout } from '@stripe/stripe-js';
import { useStore } from '../../state/store.tsx';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
  return stripePromise;
}

export default function CheckoutModal() {
  const { state, actions } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const [loadError, setLoadError] = useState('');
  const clientSecret = state.checkoutClientSecret;

  useEffect(() => {
    if (!clientSecret) return;
    let cancelled = false;
    setLoadError('');
    getStripePromise().then(async (stripe) => {
      if (cancelled) return;
      if (!stripe) { setLoadError('決済フォームの読み込みに失敗しました（設定エラー）'); return; }
      try {
        const checkout = await stripe.createEmbeddedCheckoutPage({
          clientSecret,
          onComplete: () => {
            // Payment succeeded — the webhook flips the org back to
            // active on its own, but re-fetching here means the app
            // reflects it immediately instead of waiting for the user to
            // notice and reload manually.
            actions.closeCheckoutModal();
            void actions.reloadOrgData();
          },
        });
        if (cancelled) { checkout.destroy(); return; }
        checkoutRef.current = checkout;
        if (containerRef.current) checkout.mount(containerRef.current);
      } catch (e) {
        console.error('createEmbeddedCheckoutPage failed', e);
        setLoadError('決済フォームの読み込みに失敗しました');
      }
    });
    return () => {
      cancelled = true;
      checkoutRef.current?.destroy();
      checkoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  if (!clientSecret) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.3)', animation: 'scIn .24s ease both', padding: '16px 16px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button onClick={actions.closeCheckoutModal} style={{ color: '#8a909a', fontSize: 13, fontWeight: 700 }}>✕ 閉じる</button>
        </div>
        {loadError ? (
          <div style={{ padding: '24px 8px 32px', textAlign: 'center', fontSize: 12.5, color: '#d6453d' }}>{loadError}</div>
        ) : (
          <div ref={containerRef} />
        )}
      </div>
    </div>
  );
}
