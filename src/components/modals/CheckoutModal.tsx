import { useEffect, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, StripeCheckoutElementsSdk, StripePaymentElement } from '@stripe/stripe-js';
import { useStore } from '../../state/store.tsx';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) stripePromise = publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
  return stripePromise;
}

type ConfirmAction = (args?: { redirect?: 'if_required' }) => Promise<
  { type: 'success' } | { type: 'error'; error: { message: string } }
>;

export default function CheckoutModal() {
  const { state, actions } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<StripeCheckoutElementsSdk | null>(null);
  const paymentElementRef = useRef<StripePaymentElement | null>(null);
  const confirmRef = useRef<ConfirmAction | null>(null);
  const [loadError, setLoadError] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const clientSecret = state.checkoutClientSecret;
  const accent = state.accent;
  const plan = actions.effectivePlan();

  useEffect(() => {
    if (!clientSecret) return;
    let cancelled = false;
    setLoadError('');
    setCanSubmit(false);
    setFormReady(false);
    getStripePromise().then(async (stripe) => {
      if (cancelled) return;
      if (!stripe) { setLoadError('決済フォームの読み込みに失敗しました（設定エラー）'); return; }
      try {
        const sdk = stripe.initCheckoutElementsSdk({
          clientSecret,
          elementsOptions: {
            appearance: {
              theme: 'stripe',
              variables: { colorPrimary: accent, borderRadius: '10px', fontSizeBase: '14px' },
            },
          },
        });
        sdkRef.current = sdk;
        const loaded = await sdk.loadActions();
        if (cancelled) return;
        if (loaded.type === 'error') { setLoadError(loaded.error.message); return; }
        confirmRef.current = loaded.actions.confirm as ConfirmAction;
        const paymentElement = sdk.createPaymentElement();
        paymentElement.on('change', (e) => setCanSubmit(e.complete));
        paymentElementRef.current = paymentElement;
        if (containerRef.current) paymentElement.mount(containerRef.current);
        setFormReady(true);
      } catch (e) {
        console.error('initCheckoutElementsSdk failed', e);
        setLoadError('決済フォームの読み込みに失敗しました');
      }
    });
    return () => {
      cancelled = true;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      sdkRef.current = null;
      confirmRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  if (!state.checkoutModalOpen) return null;

  const handleConfirm = async () => {
    if (!confirmRef.current) return;
    setSubmitting(true);
    setLoadError('');
    try {
      const result = await confirmRef.current({ redirect: 'if_required' });
      if (result.type === 'error') { setLoadError(result.error.message); return; }
      // The webhook flips the org back to active on its own, but
      // re-fetching here means the app reflects it immediately instead of
      // waiting for the user to notice and reload manually.
      actions.closeCheckoutModal();
      void actions.reloadOrgData();
    } catch (e) {
      console.error('checkout confirm failed', e);
      setLoadError('決済の確定に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}>
      <style>{`
        @keyframes fc-spin { to { transform: rotate(360deg); } }
        .fc-checkout-spinner { animation: fc-spin .7s linear infinite; }
      `}</style>
      <div style={{ background: '#fff', borderRadius: 18, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.3)', animation: 'scIn .24s ease both', padding: '22px 24px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>お支払い情報の入力</h2>
            <div style={{ fontSize: 12, color: '#8a909a', marginTop: 4 }}>月額 <span style={{ fontWeight: 700, color: '#3a4150' }}>¥{plan.price.toLocaleString('ja-JP')}</span> のお支払いが発生します</div>
          </div>
          <button onClick={actions.closeCheckoutModal} style={{ width: 30, height: 30, color: '#8a909a', fontSize: 16, fontWeight: 700, flex: 'none' }}>✕</button>
        </div>

        {loadError && (
          <div style={{ marginBottom: 12, fontSize: 12.5, color: '#d6453d', background: '#fbe7e5', borderRadius: 8, padding: '8px 12px' }}>{loadError}</div>
        )}

        {!formReady && !loadError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: 160, marginBottom: 18 }}>
            <div className="fc-checkout-spinner" style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${accent}33`, borderTopColor: accent }} />
            <div style={{ fontSize: 12, color: '#9aa0a8' }}>読み込み中…</div>
          </div>
        )}
        <div ref={containerRef} style={{ marginBottom: 18, display: formReady ? 'block' : 'none' }} />

        <button
          onClick={handleConfirm}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%', height: 46, borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#fff',
            background: accent, opacity: !canSubmit || submitting ? 0.5 : 1,
            cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
            display: formReady ? 'block' : 'none',
          }}
        >
          {submitting ? '処理中…' : `¥${plan.price.toLocaleString('ja-JP')}の支払いを確定する`}
        </button>
      </div>
    </div>
  );
}
