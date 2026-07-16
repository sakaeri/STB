import type { CSSProperties } from 'react';
import { useStore } from '../../state/store.tsx';
import { CLOSING_DAY_OPTIONS, FISCAL_MONTH_OPTIONS } from '../../state/calc';

const outerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#eceef1',
  padding: 24,
  overflowY: 'auto',
};

const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#46505e',
  display: 'block',
  marginBottom: 7,
};

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1.5px solid #dfe3e8',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 14,
  outline: 'none',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  fontSize: 13.5,
  background: '#fff',
  cursor: 'pointer',
};

const errorBannerStyle: CSSProperties = {
  fontSize: 12,
  color: '#d6453d',
  background: '#fbe7e5',
  borderRadius: 8,
  padding: '8px 12px',
};

export default function HqSetupScreen() {
  const { state, actions } = useStore();
  const f = state.hqSetupForm;
  const isBasic = state.hqSetupStep === 'basic';
  const isOptional = state.hqSetupStep === 'optional';
  const canProceed = !!(f.hqName.trim() && f.firstTeamName.trim());

  return (
    <div style={outerStyle}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #e7e9ed',
          borderRadius: 16,
          boxShadow: '0 8px 30px rgba(20,40,80,.08)',
          overflow: 'hidden',
          margin: 'auto',
        }}
      >
        <div style={{ padding: '28px 28px 8px', textAlign: 'center' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: state.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: '#fff',
              fontSize: 21,
              fontWeight: 400,
            }}
          >
            ＋
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>本部を作成</h1>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>
            あなたが本部のオーナーになります。すでに管理者として参加する場合は、担当者から共有された招待URLを開いてください。
          </p>
          {isOptional && (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#3a4150', background: '#f7f8fa', borderRadius: 8, padding: '8px 12px' }}>
              本部名：{f.hqName}　/　最初のチーム名：{f.firstTeamName}
            </p>
          )}
        </div>

        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isBasic && (
            <>
              <div>
                <label style={labelStyle}>
                  本部名 <span style={{ color: '#d6453d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={f.hqName}
                  onChange={(e) => actions.onHqSetupField('hqName', e.target.value)}
                  placeholder="例：株式会社〇〇"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  最初のチーム名 <span style={{ color: '#d6453d' }}>*</span>
                </label>
                <input
                  type="text"
                  value={f.firstTeamName}
                  onChange={(e) => actions.onHqSetupField('firstTeamName', e.target.value)}
                  placeholder="例：渋谷店"
                  style={inputStyle}
                />
              </div>
              {!!state.authError && <div style={errorBannerStyle}>{state.authError}</div>}
              <button
                onClick={actions.goHqSetupOptionalStep}
                style={{
                  height: 44,
                  borderRadius: 10,
                  background: state.accent,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  marginTop: 4,
                  opacity: canProceed ? 1 : 0.5,
                }}
              >
                次へ
              </button>
            </>
          )}

          {isOptional && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: 11.5, color: '#9aa0a8' }}>
                以下は任意です。あとで「本部情報」の設定画面からいつでも変更できます。
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>本部所在地</label>
                  <input
                    type="text"
                    value={f.address}
                    onChange={(e) => actions.onHqSetupField('address', e.target.value)}
                    placeholder="例：東京都渋谷区〇〇1-2-3"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>代表者名</label>
                  <input
                    type="text"
                    value={f.rep}
                    onChange={(e) => actions.onHqSetupField('rep', e.target.value)}
                    placeholder="例：山田 太郎"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>締め日</label>
                    <select
                      value={f.closingDay}
                      onChange={(e) => actions.onHqSetupField('closingDay', e.target.value)}
                      style={selectStyle}
                    >
                      {CLOSING_DAY_OPTIONS.map((cd) => (
                        <option key={cd.value} value={cd.value}>{cd.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>決算期（開始月）</label>
                    <select
                      value={f.fiscalStartMonth}
                      onChange={(e) => actions.onHqSetupField('fiscalStartMonth', Number(e.target.value))}
                      style={selectStyle}
                    >
                      {FISCAL_MONTH_OPTIONS.map((fm) => (
                        <option key={fm.value} value={fm.value}>{fm.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {!!state.authError && <div style={{ ...errorBannerStyle, marginTop: 14 }}>{state.authError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  onClick={actions.doCreateHq}
                  style={{ height: 44, flex: 'none', padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 14, color: '#6b7280', background: '#f0f2f5' }}
                >
                  スキップ
                </button>
                <button
                  onClick={actions.doCreateHq}
                  style={{ height: 44, flex: 1, borderRadius: 10, background: state.accent, color: '#fff', fontWeight: 700, fontSize: 14 }}
                >
                  確定
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
