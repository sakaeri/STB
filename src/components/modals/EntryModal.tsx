import { useEffect, useState } from 'react';
import { useStore } from '../../state/store.tsx';
import { yen } from '../../state/calc';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #dfe3e8',
  borderRadius: 11,
  padding: '11px 13px',
  fontSize: 14,
  fontWeight: 500,
  color: '#3a4150',
  outline: 'none',
  background: '#fff',
};

export default function EntryModal() {
  const { state, actions } = useStore();
  const [titleLocal, setTitleLocal] = useState('');
  // Kept local while typing rather than pushed through global state on
  // every keystroke — the modal stays mounted while closed (returns
  // null), so this re-syncs from the fresh draft each time it opens.
  useEffect(() => {
    if (state.showEntry && state.entryDraft) setTitleLocal(state.entryDraft.title);
  }, [state.showEntry]);

  if (!state.showEntry || !state.entryDraft) return null;
  const draft = state.entryDraft;

  const isHq = state.viewRole === 'hq';
  const store = state.stores.find((s) => s.id === draft.storeId) || state.stores[0];
  const isSales = draft.type === 'sales';
  const typeColor = isSales ? '#1f9d6b' : '#c2566b';
  const typeSoft = isSales ? '#e4f5ee' : '#fbe7ec';
  const typeGlyph = isSales ? '↑' : '↓';
  const title = isSales ? '売上を入力' : '経費を入力';
  const titlePlaceholder = isSales ? '例：〇〇の売上' : '例：仕入れ、家賃';
  const unitLabel = state.unitLabel || '店舗';

  const mi = ((state.month % 12) + 12) % 12;
  const monthTotal = (state.transactions[draft.storeId] || [])
    .filter((t) => t.type === draft.type && parseInt(t.date.slice(5, 7), 10) - 1 === mi)
    .reduce((a, t) => a + t.amount, 0);
  const monthLabel = `${state.year}年 ${state.month + 1}月`;
  const totalLabel = `${isSales ? '売上' : '経費'}の月合計`;

  const amountNum = parseInt(draft.amount, 10) || 0;
  const valid = amountNum > 0;

  const presets = (state.entryPresets[draft.storeId] || []).filter((p) => p.type === draft.type);
  const presetExists = presets.some((p) => p.title === titleLocal.trim() && p.amount === amountNum);

  // Only fold the in-progress amount into the preview if its date actually
  // falls within the month being displayed — the date field is editable,
  // so it doesn't always match.
  const draftInThisMonth = draft.date
    ? parseInt(draft.date.slice(0, 4), 10) === state.year && parseInt(draft.date.slice(5, 7), 10) - 1 === mi
    : true;
  const previewTotal = monthTotal + (draftInThisMonth ? amountNum : 0);

  return (
    <div
      onClick={actions.closeEntry}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: typeSoft, color: typeColor, fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              {typeGlyph}
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a' }}>{store?.name}</p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isHq && (
            <div>
              <label style={labelStyle}>{unitLabel}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {state.stores.map((o) => {
                  const active = draft.storeId === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => actions.onEntryStoreId(o.id)}
                      style={{
                        padding: '8px 12px', borderRadius: 9,
                        border: `1.5px solid ${active ? state.accent : '#dfe3e8'}`,
                        background: active ? state.accent + '18' : '#fff',
                        color: active ? state.accent : '#3a4150', fontWeight: 700, fontSize: 12.5,
                      }}
                    >
                      {o.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>日付</label>
            {/* Native date inputs stretch their internal segments unevenly at
                width:100% on mobile — give it a natural, fixed width instead. */}
            <input type="date" value={draft.date} onChange={(e) => actions.onEntryDate(e.target.value)} style={{ ...inputStyle, width: 168 }} />
          </div>
          {presets.length > 0 && (
            <div>
              <label style={labelStyle}>よく使う項目</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {presets.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1.5px solid #dfe3e8', borderRadius: 9, background: '#fafbfc' }}>
                    <button
                      onClick={() => { setTitleLocal(p.title); actions.onEntryAmount(String(p.amount)); }}
                      style={{ padding: '7px 4px 7px 11px', fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}
                    >
                      {p.title} <span style={{ color: '#8a909a', fontWeight: 500 }}>¥{Math.round(p.amount).toLocaleString('ja-JP')}</span>
                    </button>
                    <button
                      onClick={() => actions.deleteEntryPreset(draft.storeId, p.id)}
                      title="削除"
                      style={{ padding: '7px 9px 7px 2px', fontSize: 13, color: '#c3c8d0' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label style={labelStyle}>項目名</label>
            <input
              type="text"
              value={titleLocal}
              onChange={(e) => setTitleLocal(e.target.value)}
              placeholder={titlePlaceholder}
              style={{ ...inputStyle, padding: '12px 14px', fontSize: 14.5 }}
            />
          </div>
          <div>
            <label style={labelStyle}>金額</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 11, padding: '0 15px' }}>
              <span style={{ fontSize: 17, color: '#8a909a', fontWeight: 700 }}>¥</span>
              <input
                type="number"
                step={100}
                value={draft.amount}
                onChange={(e) => actions.onEntryAmount(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 19, fontWeight: 700, padding: '13px 0 13px 8px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
              />
            </div>
            {titleLocal.trim() && amountNum > 0 && !presetExists && (
              <button
                onClick={() => actions.saveEntryPreset(draft.storeId, draft.type, titleLocal, amountNum)}
                style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: state.accent }}
              >
                ＋ この内容を「よく使う項目」に保存
              </button>
            )}
          </div>
          <div>
            <label style={labelStyle}>写真（任意）</label>
            {draft.photo ? (
              <div style={{ position: 'relative', width: '100%', borderRadius: 11, overflow: 'hidden', border: '1.5px solid #dfe3e8' }}>
                <img src={draft.photo} loading="lazy" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={actions.onRemovePhoto}
                  style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 9, background: 'rgba(20,28,42,.55)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 76, border: '1.5px dashed #d8dce2', borderRadius: 11, color: '#8a909a', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: '#fafbfc' }}>
                <span style={{ fontSize: 20 }}>📷</span>写真を追加
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => actions.onEntryPhoto(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: '#6b7280' }}>{totalLabel}（{monthLabel}）</span>
            <span style={{ fontWeight: 700, fontSize: 17, fontVariantNumeric: 'tabular-nums', color: typeColor }}>{yen(previewTotal)}</span>
          </div>
        </div>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={actions.closeEntry} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>
            取消
          </button>
          <button
            onClick={() => actions.saveEntry(titleLocal)}
            style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: typeColor, boxShadow: '0 2px 6px rgba(20,40,80,.2)', opacity: valid ? 1 : 0.5 }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
