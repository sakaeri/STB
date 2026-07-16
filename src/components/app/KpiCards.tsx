import { yen } from '../../state/calc';
import { colors } from '../../tokens';

export default function KpiCards({
  isHq,
  tSales,
  tProfit,
  tRoyalty,
  tSavings,
  storeCount,
  unitLabel,
  salesDelta,
}: {
  isHq: boolean;
  tSales: number;
  tProfit: number;
  tRoyalty: number;
  tSavings: number;
  storeCount: number;
  unitLabel: string;
  salesDelta: number | null;
}) {
  const cardStyle = { background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 13, padding: '16px 17px' } as const;
  const margin = tSales ? (tProfit / tSales) * 100 : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: colors.faint, fontWeight: 500, marginBottom: 7 }}>{isHq ? '総売上' : '売上'}</div>
        <div style={{ fontSize: 25, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em' }}>{yen(tSales)}</div>
        <div style={{ fontSize: 11.5, color: colors.faint, marginTop: 5 }}>
          {storeCount}
          {unitLabel} ・ 前月比{' '}
          {salesDelta == null ? (
            '—'
          ) : (
            <span style={{ fontWeight: 700, color: salesDelta >= 0 ? colors.success : colors.danger }}>
              {(salesDelta >= 0 ? '+' : '') + salesDelta.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: colors.faint, fontWeight: 500, marginBottom: 7 }}>{isHq ? '総利益' : '利益'}</div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-.01em',
            color: tProfit < 0 ? colors.danger : '#181c22',
          }}
        >
          {yen(tProfit)}
        </div>
        <div style={{ fontSize: 11.5, color: colors.faint, marginTop: 5 }}>
          利益率{' '}
          <span style={{ fontWeight: 700, color: tProfit < 0 ? colors.danger : colors.faint }}>{margin == null ? '—' : margin.toFixed(1) + '%'}</span>
        </div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: colors.faint, fontWeight: 500, marginBottom: 7 }}>ロイヤリティ合計</div>
        <div style={{ fontSize: 25, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em' }}>{yen(tRoyalty)}</div>
        <div style={{ fontSize: 11.5, color: colors.faint, marginTop: 5 }}>貯蓄合計 {yen(tSavings)}</div>
      </div>
    </div>
  );
}
