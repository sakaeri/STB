import { useStore } from '../../state/store.tsx';

export default function UpgradeModal() {
  const { state, actions } = useStore();
  if (!state.pendingUpgrade) return null;

  const accent = state.accent;
  const unitLabel = state.unitLabel || '店舗';
  const { fromPlan, toPlan } = state.pendingUpgrade;
  const rangeTxt = toPlan.max === Infinity ? `${toPlan.min}〜` : `${toPlan.min}〜${toPlan.max}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}>
      <div style={{ background: '#fff', borderRadius: 18, width: 420, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.3)', overflow: 'hidden', animation: 'scIn .24s ease both' }}>
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: fromPlan.color, padding: '5px 11px', borderRadius: 7 }}>{fromPlan.name}</span>
            <span style={{ color: '#c3c8d0', fontSize: 14 }}>→</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: toPlan.color, padding: '5px 11px', borderRadius: 7 }}>{toPlan.name}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{toPlan.name}プランに変更されます</h2>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.7 }}>
            {unitLabel}を追加すると{toPlan.name}プランの範囲（{rangeTxt}）になります。月額 <span style={{ fontWeight: 700, color: '#3a4150' }}>¥{toPlan.price.toLocaleString('ja-JP')}</span> のお支払いが発生します。
          </p>
        </div>
        <div style={{ padding: '16px 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={actions.cancelUpgrade} style={{ height: 40, padding: '0 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, color: '#6b7280', background: '#f0f2f5' }}>キャンセル</button>
          <button onClick={actions.confirmUpgradeAndCreate} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, color: '#fff', background: accent }}>同意して{unitLabel}を作成</button>
        </div>
      </div>
    </div>
  );
}
