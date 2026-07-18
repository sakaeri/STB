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
  isMobile,
}: {
  isHq: boolean;
  tSales: number;
  tProfit: number;
  tRoyalty: number;
  tSavings: number;
  storeCount: number;
  unitLabel: string;
  salesDelta: number | null;
  isMobile?: boolean;
}) {
  const cardStyle = {
    background: '#fff',
    border: `1px solid ${colors.border}`,
    borderRadius: isMobile ? 10 : 13,
    padding: isMobile ? '10px 9px' : '16px 17px',
    minWidth: 0,
  } as const;
  const margin = tSales ? (tProfit / tSales) * 100 : null;
  const labelSize = isMobile ? 10.5 : 12;
  const valueSize = isMobile ? 15 : 25;
  const subSize = isMobile ? 10 : 11.5;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(auto-fit,minmax(180px,1fr))',
        gap: isMobile ? 8 : 14,
        marginBottom: 20,
      }}
    >
      <div style={cardStyle}>
        <div style={{ fontSize: labelSize, color: colors.faint, fontWeight: 500, marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isHq ? '総売上' : '売上'}
        </div>
        <div style={{ fontSize: valueSize, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {yen(tSales)}
        </div>
        {!isMobile && (
          <div style={{ fontSize: subSize, color: colors.faint, marginTop: 5 }}>
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
        )}
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: labelSize, color: colors.faint, fontWeight: 500, marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isHq ? '総利益' : '利益'}
        </div>
        <div
          style={{
            fontSize: valueSize,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-.01em',
            color: tProfit < 0 ? colors.danger : '#181c22',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {yen(tProfit)}
        </div>
        {!isMobile && (
          <div style={{ fontSize: subSize, color: colors.faint, marginTop: 5 }}>
            利益率{' '}
            <span style={{ fontWeight: 700, color: tProfit < 0 ? colors.danger : colors.faint }}>{margin == null ? '—' : margin.toFixed(1) + '%'}</span>
          </div>
        )}
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: labelSize, color: colors.faint, fontWeight: 500, marginBottom: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          ロイヤリティ合計
        </div>
        <div style={{ fontSize: valueSize, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {yen(tRoyalty)}
        </div>
        {!isMobile && <div style={{ fontSize: subSize, color: colors.faint, marginTop: 5 }}>貯蓄合計 {yen(tSavings)}</div>}
      </div>
    </div>
  );
}
