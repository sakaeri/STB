import { useStore } from '../../state/store.tsx';

export default function TxDetailModal() {
  const { state, actions } = useStore();
  if (!state.txDetail) return null;

  const d = state.txDetail as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const hasPhoto = !!d.hasPhoto && !!d.photo;
  const typeBg = d.typeBg || '#eef0f3';
  const typeColor = d.typeColor || '#3a4150';
  const typeGlyph = d.typeGlyph ?? '?';
  const typeLabel = d.typeLabel ?? '';
  const dateFull = d.dateFull ?? '';
  const title = d.title ?? '';
  const signedAmountFmt = d.signedAmountFmt ?? '';
  const canDelete = !!d.canDelete;

  const handleDelete = () => {
    if (typeof d.onDelete === 'function') d.onDelete();
    else actions.closeTxDetail();
  };

  return (
    <div
      onClick={actions.closeTxDetail}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 75, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 380, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.3)', overflow: 'hidden', animation: 'scIn .24s ease both' }}
      >
        {hasPhoto ? (
          <div style={{ width: '100%', height: 180, backgroundImage: `url(${d.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        ) : (
          <div style={{ width: '100%', height: 110, background: typeBg, color: typeColor, fontSize: 34, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{typeGlyph}</div>
        )}
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: typeBg, color: typeColor }}>{typeLabel}</span>
            <span style={{ fontSize: 12, color: '#9aa0a8' }}>{dateFull}</span>
          </div>
          <h2 style={{ margin: '10px 0 2px', fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: typeColor, marginBottom: 18 }}>{signedAmountFmt}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={actions.closeTxDetail} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>閉じる</button>
            {canDelete && (
              <button onClick={handleDelete} style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: '#d6453d' }}>削除</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
