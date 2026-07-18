import { RowAvatar, type RowData } from './rowHelpers';
import { colors } from '../../tokens';
import './app.css';

export default function SalesCards({ rows, onOpen }: { rows: RowData[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(268px,1fr))', gap: 15 }}>
      {rows.map((r) => (
        <div
          key={r.id}
          className="stb-card"
          onClick={() => onOpen(r.id)}
          style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 17, cursor: 'pointer', transition: 'box-shadow .15s,border-color .15s' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
            <RowAvatar row={r} size={36} radius={9} fontSize={15} />
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: colors.faint2 }}>{r.owner}</div>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 20,
                background: r.achChipBg,
                color: r.achChipColor,
              }}
            >
              {r.chipText}
            </span>
          </div>
          <div style={{ marginBottom: 13 }}>
            <div style={{ fontSize: 11, color: colors.faint, marginBottom: 2 }}>売上</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em' }}>{r.salesFmt}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: colors.divider, borderRadius: 10, overflow: 'hidden', marginTop: 14 }}>
            <div style={{ background: '#fafbfc', padding: '9px 11px' }}>
              <div style={{ fontSize: 10.5, color: colors.faint }}>経費</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.expenseFmt}</div>
            </div>
            <div style={{ background: '#fafbfc', padding: '9px 11px' }}>
              <div style={{ fontSize: 10.5, color: colors.faint }}>利益</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: r.profitColor }}>{r.profitFmt}</div>
            </div>
            <div style={{ background: '#fafbfc', padding: '9px 11px' }}>
              <div style={{ fontSize: 10.5, color: colors.faint }}>ロイヤリティ</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.royaltyFmt}</div>
            </div>
            <div style={{ background: '#fafbfc', padding: '9px 11px' }}>
              <div style={{ fontSize: 10.5, color: colors.faint }}>貯蓄</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{r.savingsFmt}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
