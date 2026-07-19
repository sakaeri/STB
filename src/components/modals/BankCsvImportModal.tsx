import { useStore } from '../../state/store.tsx';
import { yen } from '../../state/calc';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #dfe3e8', borderRadius: 11, padding: '11px 13px',
  fontSize: 14, fontWeight: 500, color: '#3a4150', outline: 'none', background: '#fff',
};

export default function BankCsvImportModal() {
  const { state, actions } = useStore();
  const imp = state.bankCsvImport;
  if (!imp) return null;

  const isHq = state.viewRole === 'hq';
  const unitLabel = state.unitLabel || '店舗';
  const toSaveCount = imp.rows.filter((r) => r.kind !== 'ignore').length;
  const salesTotal = imp.rows.filter((r) => r.kind === 'sales').reduce((a, r) => a + r.amount, 0);
  const expenseTotal = imp.rows.filter((r) => r.kind === 'expense').reduce((a, r) => a + r.amount, 0);

  return (
    <div
      onClick={actions.closeBankCsvImport}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 560, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>銀行CSVの取り込み</h2>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8a909a', lineHeight: 1.6 }}>
            ネットバンキングからダウンロードした入出金明細のCSVを取り込みます。1件ずつ「売上」「経費」「無視」を選んで、内容を確認してから保存してください。
          </p>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isHq && (
            <div>
              <label style={labelStyle}>対象{unitLabel}</label>
              <select value={imp.storeId} onChange={(e) => actions.onBankCsvImportStoreId(e.target.value)} style={inputStyle}>
                {state.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

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
          </div>

          {imp.rows.length > 0 && (
            <>
              <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '12px 14px', display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
                <span>売上候補 <b style={{ color: '#1f9d6b' }}>{yen(salesTotal)}</b></span>
                <span>経費候補 <b style={{ color: '#c2566b' }}>{yen(expenseTotal)}</b></span>
                <span style={{ color: '#8a909a' }}>{imp.rows.length}件中 {toSaveCount}件を保存</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
                {imp.rows.map((r) => {
                  const dateFmt = `${r.date.slice(5, 7)}/${r.date.slice(8, 10)}`;
                  const kindColor = r.kind === 'sales' ? '#1f9d6b' : r.kind === 'expense' ? '#c2566b' : '#aab0b8';
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #eef0f3', borderRadius: 10, padding: '9px 11px', opacity: r.kind === 'ignore' ? 0.55 : 1 }}>
                      <span style={{ fontSize: 11, color: '#aab0b8', width: 34, flex: 'none' }}>{dateFmt}</span>
                      <input
                        type="text"
                        value={r.title}
                        onChange={(e) => actions.onBankCsvRowTitle(r.id, e.target.value)}
                        style={{ flex: 1, minWidth: 0, border: '1px solid #e2e5ea', borderRadius: 7, padding: '6px 8px', fontSize: 12.5, outline: 'none' }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: kindColor, fontVariantNumeric: 'tabular-nums', flex: 'none', width: 76, textAlign: 'right' }}>
                        ¥{Math.round(r.amount).toLocaleString('ja-JP')}
                      </span>
                      <select
                        value={r.kind}
                        onChange={(e) => actions.onBankCsvRowKind(r.id, e.target.value as 'sales' | 'expense' | 'ignore')}
                        style={{ fontSize: 11.5, fontWeight: 700, color: kindColor, border: '1px solid #e2e5ea', borderRadius: 7, padding: '6px 7px', flex: 'none', outline: 'none', background: '#fff' }}
                      >
                        <option value="sales">売上</option>
                        <option value="expense">経費</option>
                        <option value="ignore">無視</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={actions.closeBankCsvImport} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>
            取消
          </button>
          <button
            onClick={actions.saveBankCsvImport}
            disabled={toSaveCount === 0 || state.bankCsvImportLoading}
            style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: state.accent, boxShadow: '0 2px 6px rgba(20,40,80,.2)', opacity: toSaveCount === 0 || state.bankCsvImportLoading ? 0.5 : 1 }}
          >
            {state.bankCsvImportLoading ? '取り込み中…' : `${toSaveCount}件を取り込む`}
          </button>
        </div>
      </div>
    </div>
  );
}
