import { useStore } from '../../state/store.tsx';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e' };
const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #dfe3e8',
  borderRadius: 11,
  padding: '12px 14px',
  fontSize: 14.5,
  fontWeight: 500,
  outline: 'none',
  background: '#fff',
};

function Switch({ on, onToggle, accent }: { on: boolean; onToggle: () => void; accent: string }) {
  return (
    <button
      onClick={onToggle}
      style={{ width: 42, height: 24, borderRadius: 12, background: on ? accent : '#cdd3da', position: 'relative', flex: 'none', transition: 'background .15s' }}
    >
      <span
        style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }}
      />
    </button>
  );
}

function modeSegStyle(active: boolean, accent: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 700,
    color: active ? accent : '#8a909a',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
  };
}

export default function AddStoreModal() {
  const { state, actions } = useStore();
  if (!state.showAdd) return null;

  const accent = state.accent;
  const unitLabel = state.unitLabel || '店舗';
  const af = state.addForm;

  const inviteUrl = state.createdToken ? `${window.location.origin}/invite/${state.createdToken}` : '';

  return (
    <div
      onClick={actions.closeAdd}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 460, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both' }}
      >
        {state.addStep === 'form' && af && (
          <>
            <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '18', color: accent, fontSize: 21, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ＋
                </div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{unitLabel}を追加</h2>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>
                {unitLabel}名と初期設定を入力すると、招待URLを発行します。各項目は後から{unitLabel}ごとに変更できます。
              </p>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 17 }}>
              <div>
                <label style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>
                  {unitLabel}名 <span style={{ color: '#d6453d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={af.name}
                  onChange={(e) => actions.setAddForm({ name: e.target.value })}
                  placeholder={`例：渋谷${unitLabel}`}
                  style={inputStyle}
                />
              </div>

              {/* royalty */}
              <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={labelStyle}>ロイヤリティを使う</label>
                    <Switch
                      on={af.useRoyalty !== false}
                      onToggle={() => actions.setAddForm({ useRoyalty: af.useRoyalty === false })}
                      accent={accent}
                    />
                  </div>
                  <div style={{ display: 'flex', background: '#eceef1', borderRadius: 9, padding: 3, width: 140, opacity: af.useRoyalty !== false ? 1 : 0.4 }}>
                    <button onClick={() => actions.setAddForm({ royaltyMode: 'rate' })} style={modeSegStyle((af.royaltyMode || 'rate') === 'rate', accent)}>率</button>
                    <button onClick={() => actions.setAddForm({ royaltyMode: 'amount' })} style={modeSegStyle(af.royaltyMode === 'amount', accent)}>金額</button>
                  </div>
                </div>
                <div style={{ opacity: af.useRoyalty !== false ? 1 : 0.4 }}>
                  {(af.royaltyMode || 'rate') === 'rate' ? (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 160 }}>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={af.royaltyRate || ''}
                        onChange={(e) => actions.setAddForm({ royaltyRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                      />
                      <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>%</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 230 }}>
                      <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>¥</span>
                      <input
                        type="number"
                        step={1000}
                        value={af.royaltyAmount || ''}
                        onChange={(e) => actions.setAddForm({ royaltyAmount: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0 11px 7px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                      />
                      <span style={{ fontSize: 11, color: '#aab0b8' }}>/月</span>
                    </div>
                  )}
                </div>
              </div>

              {/* savings */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={labelStyle}>貯蓄設定を使う</label>
                    <Switch on={!!af.useSavings} onToggle={() => actions.setAddForm({ useSavings: !af.useSavings })} accent={accent} />
                  </div>
                  <div style={{ display: 'flex', background: '#eceef1', borderRadius: 9, padding: 3, width: 140, opacity: af.useSavings ? 1 : 0.4 }}>
                    <button onClick={() => actions.setAddForm({ savingsMode: 'amount' })} style={modeSegStyle((af.savingsMode || 'amount') === 'amount', accent)}>金額</button>
                    <button onClick={() => actions.setAddForm({ savingsMode: 'rate' })} style={modeSegStyle(af.savingsMode === 'rate', accent)}>率</button>
                  </div>
                </div>
                <div style={{ opacity: af.useSavings ? 1 : 0.4 }}>
                  {(af.savingsMode || 'amount') === 'amount' ? (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 230 }}>
                      <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>¥</span>
                      <input
                        type="number"
                        step={1000}
                        value={af.savings || ''}
                        onChange={(e) => actions.setAddForm({ savings: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0 11px 7px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                      />
                      <span style={{ fontSize: 11, color: '#aab0b8' }}>/月</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 160 }}>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={af.savingsRate || ''}
                        onChange={(e) => actions.setAddForm({ savingsRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                      />
                      <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={actions.closeAdd} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>
                取消
              </button>
              <button
                onClick={actions.createStore}
                style={{ height: 40, padding: '0 20px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent, boxShadow: '0 2px 6px rgba(20,40,80,.2)', opacity: af.name.trim() ? 1 : 0.5 }}
              >
                作成して招待URLを発行
              </button>
            </div>
          </>
        )}

        {state.addStep === 'done' && (
          <>
            <div style={{ padding: '26px 24px 18px', textAlign: 'center', borderBottom: '1px solid #f0f2f5' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e4f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <span style={{ width: 14, height: 8, borderLeft: '3px solid #1f9d6b', borderBottom: '3px solid #1f9d6b', transform: 'rotate(-45deg)', marginTop: -4 }} />
              </div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>「{state.createdName}」を追加しました</h2>
              <p style={{ margin: '7px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>
                下の招待URLをオーナーに共有してください。{unitLabel}側で詳細情報（住所・営業時間など）を登録できます。
              </p>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 8 }}>招待URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#f7f8fa', border: '1px solid #e7e9ed', borderRadius: 10, padding: '11px 13px', fontSize: 12.5, color: '#3a4150', fontFamily: 'ui-monospace,Menlo,monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                  {inviteUrl}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => actions.copyInvite()); }}
                  style={{ height: 42, padding: '0 16px', borderRadius: 10, fontWeight: 700, fontSize: 12.5, flex: 'none', color: state.copied ? '#fff' : '#46505e', background: state.copied ? '#1f9d6b' : '#f0f2f5' }}
                >
                  {state.copied ? 'コピーしました' : 'コピー'}
                </button>
              </div>
              <div style={{ marginTop: 14, background: '#f7f8fa', borderRadius: 11, padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  i
                </div>
                <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.6 }}>
                  このリンクは7日間有効です。一覧に追加済みで、設定はいつでも{unitLabel}詳細から変更できます。
                </div>
              </div>
            </div>
            <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={actions.closeAdd} style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent }}>
                完了
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
