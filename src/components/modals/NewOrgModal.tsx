import { useStore } from '../../state/store.tsx';
import { CLOSING_DAY_OPTIONS, FISCAL_MONTH_OPTIONS } from '../../state/calc';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #dfe3e8', borderRadius: 11, padding: '12px 14px', fontSize: 14.5, fontWeight: 500, outline: 'none' };
const selectStyle: React.CSSProperties = { ...inputStyle, fontSize: 13.5, background: '#fff', cursor: 'pointer' };

export default function NewOrgModal() {
  const { state, actions } = useStore();
  if (!state.showNewOrgModal) return null;

  const accent = state.accent;
  const f = state.hqSetupForm;
  const isBasicStep = state.hqSetupStep === 'basic';
  const canGoNext = !!f.hqName.trim() && !!f.firstTeamName.trim();

  return (
    <div
      onClick={actions.closeNewOrg}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 420, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.28)', overflow: 'hidden', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '18', color: accent, fontSize: 21, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>本部を作成</h2>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>新しい本部のオーナーとして、あなたのプロフィールで参加します。</p>
          {!isBasicStep && (
            <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#3a4150', background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
              本部名：{f.hqName}　/　最初のチーム名：{f.firstTeamName}
            </p>
          )}
        </div>

        {state.authError && (
          <div style={{ margin: '16px 24px 0', fontSize: 12, color: '#d6453d', background: '#fbe7e5', borderRadius: 8, padding: '8px 12px' }}>{state.authError}</div>
        )}

        {isBasicStep ? (
          <>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>本部名 <span style={{ color: '#d6453d' }}>*</span></label>
                <input type="text" value={f.hqName} onChange={(e) => actions.onHqSetupField('hqName', e.target.value)} placeholder="例：株式会社〇〇" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>最初のチーム名 <span style={{ color: '#d6453d' }}>*</span></label>
                <input type="text" value={f.firstTeamName} onChange={(e) => actions.onHqSetupField('firstTeamName', e.target.value)} placeholder="例：渋谷店" style={inputStyle} />
              </div>
            </div>
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={actions.closeNewOrg} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>取消</button>
              <button onClick={actions.goHqSetupOptionalStep} style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent, opacity: canGoNext ? 1 : 0.5 }}>次へ</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#9aa0a8' }}>以下は任意です。あとで「本部情報」の設定画面からいつでも変更できます。</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>本部所在地</label>
                  <input type="text" value={f.address} onChange={(e) => actions.onHqSetupField('address', e.target.value)} placeholder="例：東京都渋谷区〇〇1-2-3" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>代表者名</label>
                  <input type="text" value={f.rep} onChange={(e) => actions.onHqSetupField('rep', e.target.value)} placeholder="例：山田 太郎" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>締め日</label>
                    <select value={f.closingDay} onChange={(e) => actions.onHqSetupField('closingDay', e.target.value)} style={selectStyle}>
                      {CLOSING_DAY_OPTIONS.map((cd) => <option key={cd.value} value={cd.value}>{cd.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>決算期（開始月）</label>
                    <select value={f.fiscalStartMonth} onChange={(e) => actions.onHqSetupField('fiscalStartMonth', parseInt(e.target.value, 10))} style={selectStyle}>
                      {FISCAL_MONTH_OPTIONS.map((fm) => <option key={fm.value} value={fm.value}>{fm.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={actions.createNewOrg} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>スキップ</button>
              <button onClick={actions.createNewOrg} style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent }}>確定</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
