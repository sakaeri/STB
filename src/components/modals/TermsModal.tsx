import { useStore } from '../../state/store.tsx';

export default function TermsModal() {
  const { state, actions } = useStore();
  return (
    <div
      onClick={actions.closeTermsModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 520, maxWidth: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3a4150' }}>利用規約</div>
          <button onClick={actions.closeTermsModal} style={{ width: 32, height: 32, borderRadius: 9, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', fontSize: 12.5, color: '#3a4150', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{state.termsModalText}</div>
      </div>
    </div>
  );
}
