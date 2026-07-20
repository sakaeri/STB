import { useStore } from '../../state/store.tsx';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };

function kindBtnStyle(active: boolean, color: string): React.CSSProperties {
  return {
    flex: 1, height: 36, borderRadius: 9, fontWeight: 700, fontSize: 12.5,
    color: active ? '#fff' : color, background: active ? color : color + '18',
  };
}

export default function BankCsvImportModal() {
  const { state, actions } = useStore();
  const imp = state.bankCsvImport;
  if (!imp) return null;

  const isHq = state.viewRole === 'hq';
  const unitLabel = state.unitLabel || '店舗';
  const checkedCount = imp.rows.filter((r) => r.checked).length;
  const checkedTotal = imp.rows.filter((r) => r.checked).reduce((a, r) => a + r.amount, 0);
  const batchColor = imp.batchKind === 'sales' ? '#1f9d6b' : '#c2566b';
  const targetStoreName = state.stores.find((s) => s.id === imp.batchStoreId)?.name || '';

  return (
    <div
      onClick={actions.closeBankCsvImport}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 580, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>銀行CSVの取り込み</h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8a909a', lineHeight: 1.6 }}>
            ネットバンキングからダウンロードした入出金明細のCSVを取り込みます。対象{unitLabel}と種別を選んで、該当する行に✓を入れて確定してください。1つのCSVに複数{unitLabel}分が混ざっていても、{unitLabel}・種別を変えながら繰り返し確定できます。
          </p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {imp.rows.length === 0 && (
            <div>
              <label style={labelStyle}>CSVファイル</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 60, border: '1.5px dashed #d8dce2', borderRadius: 11, color: '#8a909a', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: '#fafbfc' }}>
                <span style={{ fontSize: 18 }}>📄</span>
                {imp.fileName || 'CSVファイルを選択'}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => actions.onBankCsvFile(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>
              {imp.parseError && <div style={{ fontSize: 11.5, color: '#d6453d', marginTop: 8, lineHeight: 1.6 }}>{imp.parseError}</div>}
              {imp.fileName && !imp.parseError && (
                <div style={{ fontSize: 11.5, color: '#8a909a', marginTop: 8 }}>すべての行を取り込みました。別のファイルを続けて取り込むこともできます。</div>
              )}
            </div>
          )}

          {imp.rows.length > 0 && (
            <>
              <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isHq && (
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>対象{unitLabel}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {state.stores.map((s) => {
                        const active = imp.batchStoreId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => actions.onBankCsvBatchStoreId(s.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9,
                              border: `1.5px solid ${active ? state.accent : '#dfe3e8'}`,
                              background: active ? state.accent + '18' : '#fff',
                              color: active ? state.accent : '#3a4150', fontWeight: 700, fontSize: 12.5,
                            }}
                          >
                            <span style={{ fontSize: 13 }}>{active ? '◎' : '○'}</span>
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>種別</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => actions.onBankCsvBatchKind('sales')} style={kindBtnStyle(imp.batchKind === 'sales', '#1f9d6b')}>売上</button>
                    <button onClick={() => actions.onBankCsvBatchKind('expense')} style={kindBtnStyle(imp.batchKind === 'expense', '#c2566b')}>経費</button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => actions.onBankCsvCheckAll(true)} style={{ fontSize: 11.5, fontWeight: 700, color: '#3a4150', background: '#eceef1', borderRadius: 7, padding: '5px 10px' }}>全て選択</button>
                  <button onClick={() => actions.onBankCsvCheckAll(false)} style={{ fontSize: 11.5, fontWeight: 700, color: '#3a4150', background: '#eceef1', borderRadius: 7, padding: '5px 10px' }}>選択解除</button>
                  <span style={{ fontSize: 11.5, color: '#8a909a', marginLeft: 'auto' }}>{imp.rows.length}件が未処理</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {imp.rows.map((r) => {
                  const dateFmt = `${r.date.slice(5, 7)}/${r.date.slice(8, 10)}`;
                  const bankKindLabel = r.bankKind === 'deposit' ? '入金' : '出金';
                  const bankKindColor = r.bankKind === 'deposit' ? '#1f9d6b' : '#c2566b';
                  return (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 9, background: r.checked ? batchColor + '10' : '#fff', border: `1px solid ${r.checked ? batchColor + '55' : '#eef0f3'}`, borderRadius: 10, padding: '9px 11px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={r.checked} onChange={(e) => actions.onBankCsvRowChecked(r.id, e.target.checked)} style={{ width: 16, height: 16, flex: 'none' }} />
                      <span style={{ fontSize: 11, color: '#aab0b8', width: 34, flex: 'none' }}>{dateFmt}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: bankKindColor, background: bankKindColor + '18', borderRadius: 6, padding: '3px 6px', flex: 'none' }}>{bankKindLabel}</span>
                      <input
                        type="text"
                        value={r.title}
                        onClick={(e) => e.preventDefault()}
                        onChange={(e) => actions.onBankCsvRowTitle(r.id, e.target.value)}
                        style={{ flex: 1, minWidth: 0, border: '1px solid #e2e5ea', borderRadius: 7, padding: '6px 8px', fontSize: 12.5, outline: 'none', background: '#fff' }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150', fontVariantNumeric: 'tabular-nums', flex: 'none', width: 76, textAlign: 'right' }}>
                        ¥{Math.round(r.amount).toLocaleString('ja-JP')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '0 24px 22px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          {checkedCount > 0 && (
            <span style={{ fontSize: 12, color: '#8a909a', marginRight: 'auto' }}>
              {targetStoreName}の{imp.batchKind === 'sales' ? '売上' : '経費'}として ¥{Math.round(checkedTotal).toLocaleString('ja-JP')}（{checkedCount}件）
            </span>
          )}
          <button onClick={actions.closeBankCsvImport} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>
            閉じる
          </button>
          {imp.rows.length > 0 && (
            <button
              onClick={actions.confirmBankCsvBatch}
              disabled={checkedCount === 0 || state.bankCsvImportLoading}
              style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: batchColor, boxShadow: '0 2px 6px rgba(20,40,80,.2)', opacity: checkedCount === 0 || state.bankCsvImportLoading ? 0.5 : 1 }}
            >
              {state.bankCsvImportLoading ? '確定中…' : `${checkedCount}件を確定`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
