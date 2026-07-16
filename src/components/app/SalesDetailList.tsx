import { RowAvatar, type RowData } from './rowHelpers';
import { colors } from '../../tokens';
import './app.css';

export default function SalesDetailList({ rows, onOpen }: { rows: RowData[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {rows.map((r) => (
        <div
          key={r.id}
          className="stb-detail-row"
          onClick={() => onOpen(r.id)}
          style={{
            background: '#fff',
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: '16px 18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 178, flex: 1 }}>
            <RowAvatar row={r} size={38} radius={10} fontSize={15} />
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: colors.faint2 }}>
                {r.owner} ・ 経費率 {r.expRateTxt}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: colors.faint, marginBottom: 1 }}>売上</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>{r.salesFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: colors.faint, marginBottom: 1 }}>経費</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.expenseFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: colors.faint, marginBottom: 1 }}>利益</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: r.profitColor }}>{r.profitFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: colors.faint, marginBottom: 1 }}>ロイヤリティ</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.royaltyFmt}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10.5, color: colors.faint, marginBottom: 1 }}>貯蓄</div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.savingsFmt}</div>
            </div>
          </div>
          <div style={{ minWidth: 190, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
              <span style={{ color: colors.faint }}>利益率</span>
              <span style={{ fontWeight: 700, color: r.achChipColor, fontVariantNumeric: 'tabular-nums' }}>{r.achTxt}</span>
            </div>
            <div style={{ height: 9, borderRadius: 5, background: colors.divider, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: r.barWidth, background: r.barColor, borderRadius: 5 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
