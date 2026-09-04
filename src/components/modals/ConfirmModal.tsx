import { useStore } from '../../state/store.tsx';

export default function ConfirmModal() {
  const { state, actions } = useStore();
  if (!state.confirmDelete) return null;

  const cd = state.confirmDelete;
  const actionLabel = cd.actionLabel || '削除する';
  const isDestructive = actionLabel.includes('削除');
  const actionColor = isDestructive ? '#d6453d' : state.accent;
  const needsCheckbox = cd.requireCheckbox !== false;
  const canConfirm = !needsCheckbox || state.confirmChecked;

  return (
    <div
      onClick={actions.closeConfirm}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 400, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.3)', overflow: 'hidden', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fbe7e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: '#d6453d', fontSize: 20, fontWeight: 700 }}>!</div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cd.label}</h2>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.7 }}>{cd.note}</p>
        </div>
        {needsCheckbox && (
          <div style={{ padding: '16px 24px 4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: '#3a4150', fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={state.confirmChecked} onChange={actions.toggleConfirmChecked} style={{ width: 17, height: 17 }} />
              確認しました
            </label>
          </div>
        )}
        <div style={{ padding: '16px 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={actions.closeConfirm} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>取消</button>
          <button
            onClick={actions.runConfirm}
            disabled={!canConfirm}
            style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: actionColor, opacity: canConfirm ? 1 : 0.5, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
