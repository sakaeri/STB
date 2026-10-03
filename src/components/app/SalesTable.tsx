import { RowAvatar, type RowData } from './rowHelpers';
import { colors } from '../../tokens';
import './app.css';

export default function SalesTable({
  rows,
  unitLabel,
  onOpen,
  accent,
  showPagination,
  page,
  totalPages,
  pageSize,
  total,
  onPrevPage,
  onNextPage,
  onSetPageSize,
}: {
  rows: RowData[];
  unitLabel: string;
  onOpen: (id: string) => void;
  accent: string;
  showPagination: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSetPageSize: (n: number) => void;
}) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 740, fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#fafbfc', color: colors.faint, fontSize: 11.5, fontWeight: 700, textAlign: 'right' }}>
                <th style={{ textAlign: 'left', padding: '12px 18px', fontWeight: 700 }}>{unitLabel}</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>売上</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>経費</th>
                <th style={{ padding: '12px 14px', fontWeight: 700 }}>利益</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>利益率</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>貯蓄金額</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="stb-table-row" onClick={() => onOpen(r.id)} style={{ borderTop: '1px solid #f0f2f5', cursor: 'pointer' }}>
                  <td style={{ padding: '11px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <RowAvatar row={r} size={30} radius={8} fontSize={13} />
                      <div style={{ lineHeight: 1.25 }}>
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: colors.faint2 }}>{r.owner}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{r.salesFmt}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.expenseFmt}</td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: r.profitColor }}>
                    {r.profitFmt}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 12.5, color: r.achChipColor, minWidth: 38, textAlign: 'right' }}>
                        {r.achTxt}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.savingsFmt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #f0f2f5' }}>
          <div style={{ fontSize: 11.5, color: colors.faint2 }}>
            {total}件中 {from}-{to}件を表示
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: colors.faint2 }}>表示件数</span>
              <button
                onClick={() => onSetPageSize(20)}
                style={{
                  height: 26,
                  padding: '0 10px',
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 11.5,
                  background: pageSize === 20 ? accent : '#f0f2f5',
                  color: pageSize === 20 ? '#fff' : colors.muted,
                }}
              >
                20
              </button>
              <button
                onClick={() => onSetPageSize(50)}
                style={{
                  height: 26,
                  padding: '0 10px',
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 11.5,
                  background: pageSize === 50 ? accent : '#f0f2f5',
                  color: pageSize === 50 ? '#fff' : colors.muted,
                }}
              >
                50
              </button>
            </div>
            {showPagination && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={onPrevPage}
                  disabled={page <= 1}
                  style={{ height: 28, padding: '0 12px', borderRadius: 7, background: '#f0f2f5', color: colors.muted, fontWeight: 700, fontSize: 11.5, opacity: page <= 1 ? 0.4 : 1 }}
                >
                  前へ
                </button>
                <div style={{ fontSize: 11.5, color: colors.muted }}>
                  {page} / {totalPages}
                </div>
                <button
                  onClick={onNextPage}
                  disabled={page >= totalPages}
                  style={{
                    height: 28,
                    padding: '0 12px',
                    borderRadius: 7,
                    background: '#f0f2f5',
                    color: colors.muted,
                    fontWeight: 700,
                    fontSize: 11.5,
                    opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
