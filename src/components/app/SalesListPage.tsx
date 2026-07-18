import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useStore } from '../../state/store.tsx';
import {
  periodData,
  periodDataPrev,
  periodLabel,
  closingDayPassedForCurrentMonth,
  targetPeriodKey,
  targetPeriodLabel,
} from '../../state/calc';
import { buildRow, isPeriodConfirmed } from './rowHelpers';
import KpiCards from './KpiCards';
import SalesTable from './SalesTable';
import SalesCards from './SalesCards';
import { colors } from '../../tokens';
import './app.css';

export default function SalesListPage() {
  const { state, actions } = useStore();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!appUrl) return;
    QRCode.toDataURL(appUrl, { width: 96, margin: 0, color: { dark: '#1b1f27', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [appUrl]);

  const isHq = state.viewRole === 'hq';
  const unitLabel = state.unitLabel || '店舗';
  const visible = isHq ? state.stores : state.stores.filter((s) => s.id === state.viewRole);
  const brandLogoUrl = state.logoMap['app-logo'] || state.logoMap['operator-logo'] || null;

  // ===== KPI totals =====
  let tSales = 0,
    tProfit = 0,
    tRoyalty = 0,
    tSavings = 0,
    tSalesPrev = 0;
  visible.forEach((s) => {
    const d = periodData(s, state.aggUnit, state.month, state.year || 2026, state.periodDate, state.transactions);
    const p = periodDataPrev(s, state.aggUnit, state.month, state.year || 2026, state.periodDate, state.transactions);
    tSales += d.sales;
    tProfit += d.profit;
    tRoyalty += d.royalty;
    tSavings += d.savings;
    tSalesPrev += p.sales || 0;
  });
  const salesDelta = state.aggUnit === 'year' ? null : tSalesPrev ? ((tSales - tSalesPrev) / tSalesPrev) * 100 : 0;

  // ===== closing confirmation banners =====
  const closingPassed = closingDayPassedForCurrentMonth(state.companyInfo);
  const targetPeriod = targetPeriodKey();
  const targetPeriodLbl = targetPeriodLabel();
  const pendingCloseList =
    isHq && closingPassed
      ? state.stores
          .filter((s) => !s.createdPeriod || s.createdPeriod <= targetPeriod)
          .filter((s) => !isPeriodConfirmed(state.confirmedPeriods, s.id, targetPeriod))
      : [];
  const currentStoreForClose = !isHq ? state.stores.find((s) => s.id === state.viewRole) || null : null;
  const showSelfCloseBanner =
    !isHq &&
    closingPassed &&
    !!currentStoreForClose &&
    (!currentStoreForClose.createdPeriod || currentStoreForClose.createdPeriod <= targetPeriod) &&
    !isPeriodConfirmed(state.confirmedPeriods, currentStoreForClose.id, targetPeriod);

  // ===== rows =====
  const allRows = visible.map((s) => buildRow(s, state));
  const pageSize = state.hqTablePageSize || 20;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const curPage = Math.min(state.hqTablePage, totalPages);
  const pagedRows = isHq ? allRows.slice((curPage - 1) * pageSize, curPage * pageSize) : allRows;
  const showTablePagination = isHq && visible.length > pageSize;

  // Only the HQ (aggregate) view is restricted when frozen — a team
  // member looking at only their own store is unaffected.
  const frozen = state.orgStatus === 'frozen' && isHq;
  const openStore = (id: string) => actions.openStoreDrawer(id);

  const doExportCsv = () => {
    const header = [unitLabel, '売上', '経費', '粗利', 'ロイヤリティ', '貯蓄'];
    const lines = [header.join(',')];
    visible.forEach((s) => {
      const d = periodData(s, state.aggUnit, state.month, state.year || 2026, state.periodDate, state.transactions);
      lines.push([s.name, d.sales, d.expense, d.profit, d.royalty, d.savings].join(','));
    });
    const unitTag = ({ day: '日別', week: '週別', month: '月別', year: '年間' } as Record<string, string>)[state.aggUnit] || state.aggUnit;
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `売上一覧_${unitTag}_${state.periodDate || state.year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const segStyle = (active: boolean) =>
    ({
      padding: '7px 16px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 700,
      color: active ? state.accent : '#7a818c',
      background: active ? '#fff' : 'transparent',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.07)' : 'none',
      transition: 'all .12s',
    }) as const;

  return (
    <div style={{ height: '100%', overflowY: 'auto', animation: 'scIn .25s ease both' }}>
      {/* 締め確認バナー（本部：未確定チーム一覧） */}
      {isHq && closingPassed && pendingCloseList.length > 0 && (
        <div style={{ margin: '16px 26px 0', background: colors.warnBg, border: `1px solid ${colors.warnBorder}`, borderRadius: 12, padding: '13px 16px' }}>
          <button
            onClick={actions.toggleCloseBanner}
            style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, fontSize: 13, color: colors.warnText, width: '100%', textAlign: 'left' }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: colors.warn,
                color: '#fff',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              !
            </span>
            <span style={{ flex: 1 }}>
              {targetPeriodLbl}分の確定が未完了のチームが{pendingCloseList.length}件あります
            </span>
            <span style={{ color: colors.warnText, fontSize: 11, transform: state.closeBannerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
              ▾
            </span>
          </button>
          {state.closeBannerOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {pendingCloseList.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 9, padding: '8px 11px' }}>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#3a4150' }}>{s.name}</div>
                  <button
                    onClick={() => actions.confirmPeriod(s.id, targetPeriod)}
                    style={{ height: 28, padding: '0 12px', borderRadius: 7, background: colors.warn, color: '#fff', fontWeight: 700, fontSize: 11.5, flex: 'none' }}
                  >
                    {targetPeriodLbl}を確定する
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 締め確認バナー（チーム側：自チームのみ） */}
      {showSelfCloseBanner && currentStoreForClose && (
        <div
          style={{
            margin: '16px 26px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: colors.warnBg,
            border: `1px solid ${colors.warnBorder}`,
            borderRadius: 12,
            padding: '12px 16px',
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: colors.warn,
              color: '#fff',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            !
          </span>
          <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: colors.warnText }}>
            {targetPeriodLbl}分の売上・経費がまだ確定されていません。0件でも内容を確認して確定してください。
          </div>
          <button
            onClick={() => actions.confirmPeriod(currentStoreForClose.id, targetPeriod)}
            style={{ height: 32, padding: '0 14px', borderRadius: 8, background: colors.warn, color: '#fff', fontWeight: 700, fontSize: 12, flex: 'none' }}
          >
            {targetPeriodLbl}を確定する
          </button>
        </div>
      )}

      <div style={{ padding: '22px 26px 90px', maxWidth: 1280, margin: '0 auto' }}>
        {frozen && (
          <div style={{ marginBottom: 14, background: colors.dangerBg, border: `1px solid ${colors.dangerBorder}`, borderRadius: 12, padding: '12px 16px', fontSize: 12.5, color: colors.danger, fontWeight: 700 }}>
            🔒 この本部は凍結されています。{unitLabel}別の一覧は「本部情報」からのお支払い手続き完了後に確認できます。
          </div>
        )}

        <KpiCards
          isHq={isHq}
          tSales={tSales}
          tProfit={tProfit}
          tRoyalty={tRoyalty}
          tSavings={tSavings}
          storeCount={visible.length}
          unitLabel={unitLabel}
          salesDelta={salesDelta}
          isMobile={state.isMobile}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 18, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3a4150' }}>{isHq ? `${unitLabel}別 売上一覧` : '売上明細'}</span>
          <div style={{ display: 'flex', background: colors.bg, borderRadius: 9, padding: 3 }}>
            <button onClick={() => actions.setAggUnit('day')} style={segStyle(state.aggUnit === 'day')}>
              日別
            </button>
            <button onClick={() => actions.setAggUnit('month')} style={segStyle(state.aggUnit === 'month')}>
              月別
            </button>
            <button onClick={() => actions.setAggUnit('year')} style={segStyle(state.aggUnit === 'year')}>
              年間
            </button>
          </div>
          <div style={{ display: 'flex', background: colors.bg, borderRadius: 9, padding: 3 }}>
            <button onClick={() => actions.setLayout('table')} style={segStyle(state.layout === 'table')}>
              表
            </button>
            <button onClick={() => actions.setLayout('card')} style={segStyle(state.layout === 'card')}>
              カード
            </button>
          </div>
          <div style={{ marginLeft: 'auto' }} />
          <button
            onClick={doExportCsv}
            disabled={frozen}
            style={{
              height: 29,
              padding: '0 14px',
              borderRadius: 8,
              background: frozen ? colors.neutralChipBg : state.accent,
              color: frozen ? colors.neutralChipText : '#fff',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              cursor: frozen ? 'not-allowed' : 'pointer',
            }}
          >
            📁 CSV
          </button>
          <button
            onClick={() => window.print()}
            disabled={frozen}
            style={{
              height: 29,
              padding: '0 14px',
              borderRadius: 8,
              background: frozen ? colors.neutralChipBg : '#fff',
              color: frozen ? colors.neutralChipText : '#3a4150',
              border: `1px solid ${frozen ? 'transparent' : colors.border}`,
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              justifyContent: 'center',
              cursor: frozen ? 'not-allowed' : 'pointer',
            }}
          >
            🖨 PDF
          </button>
        </div>

        {/* PDF出力用（印刷時のみ #print-root に表示され、画面には出ません） */}
        {createPortal(
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {brandLogoUrl && <img src={brandLogoUrl} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />}
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{state.companyInfo.name || state.brandName} 売上一覧</h1>
                  <p style={{ fontSize: 12, color: '#5a6270', margin: '2px 0 0' }}>
                    {periodLabel(state.aggUnit, state.month, state.year || 2026, state.periodDate, state.companyInfo.fiscalStartMonth || 4)}
                  </p>
                </div>
              </div>
              {qrDataUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 'none' }}>
                  <img src={qrDataUrl} style={{ width: 64, height: 64 }} />
                  <span style={{ fontSize: 9.5, color: '#8a909a' }}>{appUrl.replace(/^https?:\/\//, '')}</span>
                </div>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {[unitLabel, '売上', '経費', '利益', 'ロイヤリティ', '貯蓄'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', borderBottom: '1.5px solid #000', padding: '5px 8px' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.name}</td>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.salesFmt}</td>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.expenseFmt}</td>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.profitFmt}</td>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.royaltyFmt}</td>
                    <td style={{ borderBottom: '1px solid #ccc', padding: '5px 8px' }}>{r.savingsFmt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
          document.getElementById('print-root')!,
        )}

        <div style={{ filter: frozen ? 'blur(6px)' : 'none', userSelect: frozen ? 'none' : 'auto', pointerEvents: frozen ? 'none' : 'auto' }}>
          {state.layout === 'table' && (
            <SalesTable
              rows={pagedRows}
              unitLabel={unitLabel}
              onOpen={openStore}
              accent={state.accent}
              showPagination={showTablePagination}
              page={curPage}
              totalPages={totalPages}
              pageSize={pageSize}
              total={visible.length}
              onPrevPage={() => actions.setHqTablePage(Math.max(1, curPage - 1))}
              onNextPage={() => actions.setHqTablePage(Math.min(totalPages, curPage + 1))}
              onSetPageSize={(n) => actions.setHqTablePageSize(n)}
            />
          )}
          {state.layout === 'card' && <SalesCards rows={allRows} onOpen={openStore} />}
        </div>
      </div>
    </div>
  );
}
