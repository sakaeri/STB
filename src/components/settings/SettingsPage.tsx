import { useState, type CSSProperties } from 'react';
import { useStore } from '../../state/store.tsx';
import { CLOSING_DAY_OPTIONS, FISCAL_MONTH_OPTIONS } from '../../state/calc';
import { accentSoft, roleBg } from '../../tokens';
import type { TrashItem } from '../../types';
import { myRole } from '../app/rowHelpers';

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e7e9ed', borderRadius: 15, overflow: 'hidden' };
const cardHeaderStyle: CSSProperties = { padding: '17px 22px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 12 };
const cardTitleStyle: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700 };
const cardSubStyle: CSSProperties = { margin: '3px 0 0', fontSize: 12, color: '#8a909a' };
const fieldLabelStyle: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: CSSProperties = { width: '100%', maxWidth: 340, border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '11px 13px', fontSize: 14, fontWeight: 500, outline: 'none', background: '#fff' };
const roTitleStyle: CSSProperties = { fontSize: 11.5, color: '#9aa0a8', marginBottom: 4 };
const roValueStyle: CSSProperties = { fontSize: 14, fontWeight: 700 };

function switchStyle(on: boolean, accent: string): [CSSProperties, CSSProperties] {
  return [
    { width: 42, height: 24, borderRadius: 12, background: on ? accent : '#cdd3da', position: 'relative', flex: 'none', transition: 'background .15s' },
    { position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' },
  ];
}

function modeSegStyle(active: boolean, accent: string): CSSProperties {
  return { flex: 1, padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, color: active ? accent : '#8a909a', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none' };
}

const TRASH_META: Record<TrashItem['type'], { icon: string; color: string }> = {
  team: { icon: '🏢', color: '#3f6fb5' },
  member: { icon: '👤', color: '#5a6b9e' },
  hqMember: { icon: '👤', color: '#3f6fb5' },
  memoTopic: { icon: '📝', color: '#9a6bcf' },
  memoEntry: { icon: '📄', color: '#9a6bcf' },
  memoRecord: { icon: '🗒', color: '#9a6bcf' },
  tx: { icon: '💴', color: '#2f8f6b' },
};

function trashTypeLabel(item: TrashItem, unitLabel: string): string {
  switch (item.type) {
    case 'team': return unitLabel;
    case 'member': return 'メンバー';
    case 'hqMember': return '本部メンバー';
    case 'memoTopic': case 'memoEntry': case 'memoRecord': return '情報メモ';
    case 'tx': return '取引記録';
    default: return '';
  }
}

function trashDetail(item: TrashItem): string {
  try {
    if (item.type === 'team') {
      const d = item.data as { owner?: string };
      return d.owner ? `担当：${d.owner}` : '';
    }
    if (item.type === 'member') {
      const d = item.data as { store: string; role: string };
      return `${d.store} ・ ${d.role}`;
    }
    if (item.type === 'hqMember') {
      const d = item.data as { role: string };
      return `本部 ・ ${d.role}`;
    }
    if (item.type === 'memoTopic') {
      const d = item.data as { entries: unknown[] };
      return `${d.entries.length}件の詳細`;
    }
    if (item.type === 'memoEntry') {
      const d = item.data as { entry: { records: unknown[] } };
      return `${d.entry.records.length}件の記録`;
    }
    if (item.type === 'memoRecord') {
      const d = item.data as { record: { text: string } };
      return d.record.text;
    }
    if (item.type === 'tx') {
      const d = item.data as { tx: { type: string; amount: number; date: string } };
      return `${d.tx.type === 'sales' ? '売上' : '経費'} ・ ¥${Math.round(d.tx.amount).toLocaleString('ja-JP')} ・ ${d.tx.date}`;
    }
  } catch { /* noop */ }
  return '';
}

export default function SettingsPage() {
  const { state, actions } = useStore();
  const [dangerOpen, setDangerOpen] = useState(false);

  const accent = state.accent;
  const isHqView = state.viewRole === 'hq';
  const role = myRole(state);
  const isOwner = role === 'オーナー';
  const isOwnerOrAdmin = role === 'オーナー' || role === '管理者';
  const unitLabel = state.unitLabel || '店舗';
  const unitLabelPlural = state.unitLabelPlural || '加盟店';

  const canEditCompanyInfo = isHqView && isOwner;
  const canManageHqMembers = isOwner;
  const canDeleteCompanyWide = isOwner;
  const canPermanentDelete = isOwnerOrAdmin;
  const canInviteHqMember = isOwnerOrAdmin && !state.paymentFailed;

  const plan = actions.effectivePlan();
  const downgradeCand = actions.downgradeCandidatePlan();
  const orgKey = state.activeOrgId ?? 'default';
  const showDowngradePrompt = isHqView && !!downgradeCand && state.orgDowngradeDismissed[orgKey] !== state.stores.length;

  const closingDayTxt = CLOSING_DAY_OPTIONS.find((o) => o.value === state.companyInfo.closingDay)?.label || '末日';
  const fiscalStartMonthTxt = FISCAL_MONTH_OPTIONS.find((o) => o.value === state.companyInfo.fiscalStartMonth)?.label || `${state.companyInfo.fiscalStartMonth}月`;

  return (
    <div style={{ padding: '24px 26px 90px', maxWidth: 880, margin: '0 auto', animation: 'scIn .25s ease both', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* 本部（会社）情報 */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={cardTitleStyle}>本部（会社）情報</h2>
            <p style={cardSubStyle}>この{unitLabel}が属する本部の情報です。</p>
          </div>
          {isHqView && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: plan.color, padding: '6px 12px', borderRadius: 8, flex: 'none' }}>
              {plan.name}プラン ・ {state.stores.length}{unitLabel}
            </span>
          )}
          {canEditCompanyInfo && !state.editingCompanyInfo && (
            <button onClick={actions.openCompanyInfoEdit} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5, flex: 'none' }}>変更</button>
          )}
          {showDowngradePrompt && downgradeCand && (
            <button onClick={actions.confirmDowngrade} title={`来月から${downgradeCand.name}プランに変更します`} style={{ fontSize: 11, fontWeight: 700, color: accent, background: accentSoft(accent), padding: '6px 10px', borderRadius: 8, flex: 'none' }}>{downgradeCand.name}に変更</button>
          )}
          {isHqView && isOwner && (
            <button onClick={actions.togglePaymentDemo} style={{ fontSize: 11, fontWeight: 700, color: '#aab0b8', background: '#f0f2f5', padding: '6px 10px', borderRadius: 8, flex: 'none' }}>
              {state.paymentFailed ? '(デモ)支払い成功にする' : '(デモ)支払い失敗を再現'}
            </button>
          )}
        </div>
        {canEditCompanyInfo && state.editingCompanyInfo ? (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={fieldLabelStyle}>本部名 <span style={{ color: '#d6453d' }}>*</span></label>
              <input type="text" value={state.companyInfo.name} onChange={(e) => actions.onCompanyName(e.target.value)} placeholder="例：株式会社〇〇" style={{ ...inputStyle, border: `1.5px solid ${state.companyNameError ? '#d6453d' : '#dfe3e8'}` }} />
              {state.companyNameError && <div style={{ fontSize: 11.5, color: '#d6453d', marginTop: 6 }}>会社名を入力してください</div>}
            </div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
              <label style={fieldLabelStyle}>本部所在地</label>
              <input type="text" value={state.companyInfo.address} onChange={(e) => actions.onCompanyAddress(e.target.value)} placeholder="例：東京都渋谷区〇〇1-2-3" style={{ ...inputStyle, maxWidth: 400 }} />
            </div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
              <label style={fieldLabelStyle}>代表者名</label>
              <input type="text" value={state.companyInfo.rep} onChange={(e) => actions.onCompanyRep(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
              <label style={fieldLabelStyle}>締め日</label>
              <select value={state.companyInfo.closingDay} onChange={(e) => actions.onCompanyClosingDay(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
                {CLOSING_DAY_OPTIONS.map((cd) => <option key={cd.value} value={cd.value}>{cd.label}</option>)}
              </select>
              <div style={{ fontSize: 11, color: '#aab0b8', marginTop: 8, lineHeight: 1.6 }}>請求書発行など会計処理のための締め日です。売上一覧の月別集計（暦月）には影響しません。</div>
            </div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
              <label style={fieldLabelStyle}>決算期（年度の開始月）</label>
              <select value={state.companyInfo.fiscalStartMonth} onChange={(e) => actions.onCompanyFiscalStartMonth(parseInt(e.target.value, 10))} style={{ ...inputStyle, maxWidth: 180 }}>
                {FISCAL_MONTH_OPTIONS.map((fm) => <option key={fm.value} value={fm.value}>{fm.label}</option>)}
              </select>
              <div style={{ fontSize: 11, color: '#aab0b8', marginTop: 8, lineHeight: 1.6 }}>売上一覧の「年間」表示に使う事業年度の起点です。</div>
            </div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
              <button onClick={actions.closeCompanyInfoEdit} style={{ height: 38, padding: '0 18px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5 }}>完了</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><div style={roTitleStyle}>本部名</div><div style={roValueStyle}>{state.companyInfo.name || '—'}</div></div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 14 }}><div style={roTitleStyle}>本部所在地</div><div style={roValueStyle}>{state.companyInfo.address || '—'}</div></div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 14 }}><div style={roTitleStyle}>代表者名</div><div style={roValueStyle}>{state.companyInfo.rep || '—'}</div></div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 14 }}><div style={roTitleStyle}>締め日</div><div style={roValueStyle}>{closingDayTxt}</div></div>
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 14 }}><div style={roTitleStyle}>決算期（年度の開始月）</div><div style={roValueStyle}>{fiscalStartMonthTxt}</div></div>
          </div>
        )}
      </section>

      {/* 本部メンバー */}
      {isHqView && (
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h2 style={cardTitleStyle}>本部メンバー</h2>
              <p style={cardSubStyle}>本部には複数人が所属できます。権限は下記から変更できます。</p>
            </div>
            {canInviteHqMember && (
              <button
                onClick={() => actions.inviteHqMember(state.companyInfo.name || state.brandName)}
                style={{ marginLeft: 'auto', height: 30, padding: '0 12px 0 9px', borderRadius: 8, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}
              >
                <span style={{ fontSize: 15, fontWeight: 400 }}>＋</span>招待
              </button>
            )}
          </div>
          <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.hqMembers.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f8fa', borderRadius: 11, padding: '9px 12px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleBg[m.role] || '#8a909a', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  {(m.name || '?').charAt(0)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                {canManageHqMembers ? (
                  <select
                    value={m.role}
                    onChange={(e) => {
                      const v = e.target.value as 'オーナー' | '編集者' | '閲覧者';
                      const ownerCount = state.hqMembers.filter((x) => x.role === 'オーナー').length;
                      if (m.role === 'オーナー' && v !== 'オーナー' && ownerCount <= 1) {
                        alert('オーナーは最低1人必要です。他のメンバーをオーナーにしてから変更してください。');
                        return;
                      }
                      actions.setHqMemberRole(m, v);
                    }}
                    style={{ border: '1.5px solid #e2e5ea', borderRadius: 8, padding: '6px 9px', fontSize: 12, fontWeight: 500, color: '#3a4150', background: '#fff', cursor: 'pointer', outline: 'none' }}
                  >
                    <option>オーナー</option>
                    <option>編集者</option>
                    <option>閲覧者</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: roleBg[m.role] || '#8a909a', background: '#eef0f3', padding: '6px 10px', borderRadius: 8 }}>{m.role}</span>
                )}
                {canDeleteCompanyWide && (
                  <button onClick={() => actions.requestDeleteHqMember(idx)} style={{ width: 26, height: 26, borderRadius: 7, color: '#c3c8d0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✕</button>
                )}
              </div>
            ))}
            {state.hqMembers.length === 0 && (
              <div style={{ background: '#f7f8fa', border: '1px dashed #d8dce2', borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: '#9aa0a8' }}>まだメンバーがいません。</div>
            )}
          </div>
        </section>
      )}

      {/* 呼び名の設定 */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={cardTitleStyle}>呼び名の設定</h2>
            <p style={cardSubStyle}>業態に合わせて呼び方を変更できます（例：FC＝店舗／協会＝支部／不動産＝物件）</p>
          </div>
          {isOwner && !state.editingUnitLabel && (
            <button onClick={actions.openUnitLabelEdit} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5, flex: 'none' }}>変更</button>
          )}
        </div>
        {isOwner && state.editingUnitLabel ? (
          <div style={{ padding: '20px 22px', display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={fieldLabelStyle}>拠点の呼び方（単数）</label>
              <input type="text" value={unitLabel} onChange={(e) => actions.setUnitLabels(e.target.value, unitLabelPlural)} placeholder="例：店舗・支部・物件" style={{ ...inputStyle, maxWidth: 260 }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={fieldLabelStyle}>グループの呼び方（複数形）</label>
              <input type="text" value={unitLabelPlural} onChange={(e) => actions.setUnitLabels(unitLabel, e.target.value)} placeholder="例：加盟店・支部・会員" style={{ ...inputStyle, maxWidth: 260 }} />
            </div>
            <div style={{ width: '100%' }}>
              <button onClick={actions.closeUnitLabelEdit} style={{ height: 38, padding: '0 18px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5 }}>完了</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 22px', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div><div style={roTitleStyle}>拠点の呼び方（単数）</div><div style={roValueStyle}>{unitLabel}</div></div>
            <div><div style={roTitleStyle}>グループの呼び方（複数形）</div><div style={roValueStyle}>{unitLabelPlural}</div></div>
          </div>
        )}
      </section>

      {/* 新規{unitLabel}のデフォルト設定 */}
      {isHqView && isOwner && (
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={cardTitleStyle}>新規{unitLabel}のデフォルト設定</h2>
              <p style={cardSubStyle}>{unitLabel}を招待する際の初期値。{unitLabel}ごとに後から変更できます。</p>
            </div>
            {!state.editingHqDefaults && (
              <button onClick={actions.openHqDefaultsEdit} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5, flex: 'none' }}>変更</button>
            )}
          </div>
          {!state.editingHqDefaults ? (
            (() => {
              const d = state.defaults;
              const royaltyMode = d.royaltyMode || 'rate';
              const savingsMode = d.savingsMode || 'amount';
              const royaltyTxt = d.useRoyalty === false ? '未使用' : (royaltyMode === 'rate' ? `${d.royaltyRate || 0}%` : `¥${Math.round(d.royaltyAmount || 0).toLocaleString('ja-JP')}/月`);
              const savingsTxt = !d.useSavings ? '未使用' : (savingsMode === 'rate' ? `${d.savingsRate || 0}%` : `¥${Math.round(d.savings || 0).toLocaleString('ja-JP')}/月`);
              return (
                <div style={{ padding: '20px 22px', display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                  <div><div style={roTitleStyle}>ロイヤリティ</div><div style={roValueStyle}>{royaltyTxt}</div></div>
                  <div><div style={roTitleStyle}>貯蓄設定</div><div style={roValueStyle}>{savingsTxt}</div></div>
                </div>
              );
            })()
          ) : (
            (() => {
              const d = state.defaults;
              const useRoyalty = d.useRoyalty !== false;
              const royaltyMode = d.royaltyMode || 'rate';
              const [roySw, royKn] = switchStyle(useRoyalty, accent);
              const [savSw, savKn] = switchStyle(!!d.useSavings, accent);
              const savingsMode = d.savingsMode || 'amount';
              return (
                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#46505e' }}>ロイヤリティを使う</label>
                        <button onClick={() => actions.setDefaults({ useRoyalty: d.useRoyalty === false })} style={roySw}><span style={royKn} /></button>
                      </div>
                      <div style={{ display: 'flex', background: '#eceef1', borderRadius: 9, padding: 3, width: 140, opacity: useRoyalty ? 1 : 0.4 }}>
                        <button onClick={() => actions.setDefaults({ royaltyMode: 'rate' })} style={modeSegStyle(royaltyMode === 'rate', accent)}>率</button>
                        <button onClick={() => actions.setDefaults({ royaltyMode: 'amount' })} style={modeSegStyle(royaltyMode === 'amount', accent)}>金額</button>
                      </div>
                    </div>
                    <div style={{ opacity: useRoyalty ? 1 : 0.4 }}>
                      {royaltyMode === 'rate' ? (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 180 }}>
                          <input type="number" min={0} step={0.5} value={d.royaltyRate} onChange={(e) => actions.setDefaults({ royaltyRate: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0', fontVariantNumeric: 'tabular-nums', background: 'transparent' }} />
                          <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>%</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 240 }}>
                          <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>¥</span>
                          <input type="number" step={1000} value={d.royaltyAmount || 0} onChange={(e) => actions.setDefaults({ royaltyAmount: Math.max(0, parseInt(e.target.value || '0', 10)) })} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0 11px 7px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }} />
                          <span style={{ fontSize: 11, color: '#aab0b8' }}>/月</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#46505e' }}>貯蓄設定を使う</label>
                        <button onClick={() => actions.setDefaults({ useSavings: !d.useSavings })} style={savSw}><span style={savKn} /></button>
                      </div>
                      <div style={{ display: 'flex', background: '#eceef1', borderRadius: 9, padding: 3, width: 140, opacity: d.useSavings ? 1 : 0.4 }}>
                        <button onClick={() => actions.setDefaults({ savingsMode: 'amount' })} style={modeSegStyle(savingsMode === 'amount', accent)}>金額</button>
                        <button onClick={() => actions.setDefaults({ savingsMode: 'rate' })} style={modeSegStyle(savingsMode === 'rate', accent)}>率</button>
                      </div>
                    </div>
                    <div style={{ opacity: d.useSavings ? 1 : 0.4 }}>
                      {savingsMode === 'amount' ? (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 240 }}>
                          <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>¥</span>
                          <input type="number" step={1000} value={d.savings} onChange={(e) => actions.setDefaults({ savings: Math.max(0, parseInt(e.target.value || '0', 10)) })} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0 11px 7px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }} />
                          <span style={{ fontSize: 11, color: '#aab0b8' }}>/月</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 14px', maxWidth: 180 }}>
                          <input type="number" min={0} step={0.5} value={d.savingsRate || 0} onChange={(e) => actions.setDefaults({ savingsRate: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontWeight: 700, padding: '11px 0', fontVariantNumeric: 'tabular-nums', background: 'transparent' }} />
                          <span style={{ fontSize: 15, color: '#8a909a', fontWeight: 700 }}>%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
                    <button onClick={actions.closeHqDefaultsEdit} style={{ height: 38, padding: '0 18px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5 }}>完了</button>
                  </div>
                </div>
              );
            })()
          )}
        </section>
      )}

      {/* ゴミ箱 */}
      <section style={cardStyle}>
        <div style={{ padding: '17px 22px', borderBottom: '1px solid #f0f2f5' }}>
          <h2 style={cardTitleStyle}>ゴミ箱</h2>
          <p style={cardSubStyle}>削除されたチーム・メンバー・情報メモは30日間ここに保存され、31日目に自動的に完全削除されます。</p>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.trash.map((item) => {
            const meta = TRASH_META[item.type];
            const daysAgo = Math.floor((Date.now() - item.deletedAt) / 86400000);
            const daysLeft = Math.max(0, 30 - daysAgo);
            return (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f8fa', borderRadius: 11, padding: '10px 13px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', background: '#eef0f3', color: meta.color, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#9aa0a8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trashDetail(item)}</div>
                  <div style={{ fontSize: 10.5, color: '#c3c8d0', marginTop: 2 }}>{trashTypeLabel(item, unitLabel)} ・ {daysAgo}日前削除 ・ 残り{daysLeft}日</div>
                </div>
                <button onClick={() => actions.restoreTrashItem(item)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #dfe3e8', color: '#3a4150', fontWeight: 700, fontSize: 11.5, flex: 'none' }}>元に戻す</button>
                {canPermanentDelete && (
                  <button onClick={() => actions.requestPermanentDelete(item)} style={{ height: 32, padding: '0 12px', borderRadius: 8, color: '#d6453d', fontWeight: 700, fontSize: 11.5, flex: 'none' }}>完全に削除</button>
                )}
              </div>
            );
          })}
          {state.trash.length === 0 && (
            <div style={{ background: '#f7f8fa', border: '1px dashed #d8dce2', borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: '#9aa0a8' }}>ゴミ箱は空です。</div>
          )}
        </div>
      </section>

      {/* Danger zone */}
      {isHqView && isOwner && (
        dangerOpen ? (
          <section style={{ background: '#fff', border: '1.5px solid #f6d9d9', borderRadius: 15, overflow: 'hidden' }}>
            <div style={{ padding: '17px 22px', borderBottom: '1px solid #fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#c2453d', display: 'flex', alignItems: 'center', gap: 7 }}>⚠ 本部を削除する</h2>
              <button onClick={() => setDangerOpen(false)} style={{ width: 28, height: 28, borderRadius: 8, color: '#8a909a', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✕</button>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: '#6b7280', lineHeight: 1.7 }}>
                本部を削除すると、この管理簿のすべてのデータが失われ、元に戻せません。
                {state.stores.length > 0 && `先にすべての${unitLabelPlural}（${unitLabel}）を削除または移動してください。`}
              </div>
              <button
                onClick={actions.requestDeleteHq}
                disabled={state.stores.length > 0}
                style={{ height: 38, padding: '0 16px', borderRadius: 9, fontWeight: 700, fontSize: 12.5, color: '#fff', background: '#d6453d', opacity: state.stores.length > 0 ? 0.5 : 1, flex: 'none', cursor: state.stores.length > 0 ? 'not-allowed' : 'pointer' }}
              >
                本部を削除する
              </button>
            </div>
          </section>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setDangerOpen(true)} style={{ height: 47, padding: '0 14px', borderRadius: 9, fontWeight: 700, fontSize: 12.5, color: '#c2453d', background: '#fbeaea', flex: 'none', width: 170 }}>本部を削除する</button>
          </div>
        )
      )}

    </div>
  );
}
