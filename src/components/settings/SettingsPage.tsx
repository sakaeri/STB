import { useState, type CSSProperties } from 'react';
import { useStore } from '../../state/store.tsx';
import { CLOSING_DAY_OPTIONS, FISCAL_MONTH_OPTIONS, trialDaysLeft } from '../../state/calc';
import { accentSoft, roleBg } from '../../tokens';
import type { Store, TrashItem } from '../../types';
import { myRole } from '../app/rowHelpers';
import { readOrgLoadDebugLog, clearOrgLoadDebugLog } from '../../state/debugLog';

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e7e9ed', borderRadius: 15, overflow: 'hidden' };
const cardHeaderStyle: CSSProperties = { padding: '17px 22px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 12 };
const cardTitleStyle: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 700 };
const cardSubStyle: CSSProperties = { margin: '3px 0 0', fontSize: 12, color: '#8a909a' };
const fieldLabelStyle: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: CSSProperties = { width: '100%', maxWidth: 340, border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '11px 13px', fontSize: 14, fontWeight: 500, outline: 'none', background: '#fff' };
const roTitleStyle: CSSProperties = { fontSize: 11.5, color: '#9aa0a8', marginBottom: 4 };
const roValueStyle: CSSProperties = { fontSize: 14, fontWeight: 700 };

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

function trashDetail(item: TrashItem, stores: Store[]): string {
  // Which team a trashed entry belonged to isn't obvious once it's sitting
  // in one flat list — prefix the team/store name (falling back to a note
  // if that team's since been permanently gone) wherever item.storeId
  // points at one.
  const storeName = item.storeId ? stores.find((s) => s.id === item.storeId)?.name || '削除済みの店舗' : null;
  const withStore = (s: string) => (storeName ? `${storeName} ・ ${s}` : s);
  try {
    if (item.type === 'team') {
      const raw = item.data as { store: { owner?: string } } | { owner?: string };
      const owner = 'store' in raw ? raw.store?.owner : raw.owner;
      return owner ? `担当：${owner}` : '';
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
      return withStore(`${d.entries.length}件の詳細`);
    }
    if (item.type === 'memoEntry') {
      const d = item.data as { entry: { records: unknown[] } };
      return withStore(`${d.entry.records.length}件の記録`);
    }
    if (item.type === 'memoRecord') {
      const d = item.data as { record: { text: string } };
      return withStore(d.record.text);
    }
    if (item.type === 'tx') {
      const d = item.data as { tx: { type: string; amount: number; date: string } };
      return withStore(`${d.tx.type === 'sales' ? '売上' : '経費'} ・ ¥${Math.round(d.tx.amount).toLocaleString('ja-JP')} ・ ${d.tx.date}`);
    }
  } catch { /* noop */ }
  return '';
}

export default function SettingsPage() {
  const { state, actions } = useStore();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [trashMenuOpenId, setTrashMenuOpenId] = useState<string | null>(null);
  // Read fresh on every render (not once on mount) — this page can be
  // reopened after a new entry was logged elsewhere in the same session,
  // and localStorage reads are cheap enough not to bother caching. The
  // tick exists purely to force a re-read after "記録を消す" clears
  // localStorage, since that alone wouldn't otherwise trigger a render.
  const [debugLogTick, setDebugLogTick] = useState(0);
  const debugLogEntries = readOrgLoadDebugLog();
  void debugLogTick; // forces re-read of localStorage after "記録を消す" clears it

  const accent = state.accent;
  const isHqView = state.viewRole === 'hq';
  const role = myRole(state);
  const isOwner = role === 'オーナー';
  const isOwnerOrAdmin = role === 'オーナー' || role === '管理者';
  const unitLabel = state.unitLabel || '店舗';

  const canEditCompanyInfo = isHqView && isOwner;
  const canManageHqMembers = isOwner;
  const canDeleteCompanyWide = isOwner;
  const canPermanentDelete = isOwnerOrAdmin;
  const canInviteHqMember = isOwnerOrAdmin;

  // Trial-model orgs have no free tier baked into the price math (see
  // effectivePricing) — so `plan` alone would show a yen amount from the
  // very first team, even though nothing is actually charged until the
  // owner subscribes. Show the trial countdown instead for as long as
  // that's true; once a real subscription exists (or the trial has run
  // out and frozen — its own banner already covers that case), fall back
  // to the normal price badge.
  const showTrialBadge = state.orgPricingModel === 'trial' && !state.hasStripeSubscription && state.orgStatus !== 'frozen';
  const daysLeft = showTrialBadge ? trialDaysLeft(state.orgCreatedAt) : null;
  // Freezing without warning at day 30 felt abrupt — surface a heads-up
  // banner (mirroring the frozen banner's style/CTA) once the trial is
  // close to running out, rather than showing it for the entire 30 days.
  const showTrialEndingBanner = isHqView && showTrialBadge && daysLeft !== null && daysLeft <= 7;

  const closingDayTxt = CLOSING_DAY_OPTIONS.find((o) => o.value === state.companyInfo.closingDay)?.label || '末日';
  const fiscalStartMonthTxt = FISCAL_MONTH_OPTIONS.find((o) => o.value === state.companyInfo.fiscalStartMonth)?.label || `${state.companyInfo.fiscalStartMonth}月`;

  return (
    <div style={{ padding: '24px 26px 90px', maxWidth: 880, margin: '0 auto', animation: 'scIn .25s ease both', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* 凍結中バナー */}
      {isHqView && state.orgStatus === 'frozen' && (
        <div style={{ background: '#fbe7e5', border: '1px solid #f3d4d0', borderRadius: 13, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#c2453d', fontWeight: 700 }}>
            💳 ご利用ありがとうございます。お支払い設定を完了すると、引き続きすべての機能をご利用いただけます。
          </div>
          {isOwner && (
            <button
              onClick={actions.startCheckout}
              disabled={state.billingCheckoutLoading}
              style={{ height: 40, padding: '0 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, color: '#fff', background: '#c2453d', flex: 'none', opacity: state.billingCheckoutLoading ? 0.6 : 1 }}
            >
              {state.billingCheckoutLoading ? '処理中…' : (state.isMobile ? 'お支払いへ' : 'お支払い手続きへ')}
            </button>
          )}
        </div>
      )}

      {/* お試し期間終了間近バナー */}
      {showTrialEndingBanner && (
        <div style={{ background: '#fdf3e3', border: '1px solid #f0dcae', borderRadius: 13, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20, flex: 'none' }}>⏰</span>
          <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5, color: '#8a6a2a' }}>お試し期間終了まであと{daysLeft}日</div>
          {isOwner && (
            <button
              onClick={actions.startCheckout}
              disabled={state.billingCheckoutLoading}
              style={{ height: 40, padding: '0 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, color: '#fff', background: '#d99a2b', flex: 'none', opacity: state.billingCheckoutLoading ? 0.6 : 1 }}
            >
              {state.billingCheckoutLoading ? '処理中…' : (state.isMobile ? 'プラン変更' : '有料プランへ変更はコチラ')}
            </button>
          )}
        </div>
      )}

      {/* 本部（会社）情報 */}
      <section style={cardStyle}>
        <div style={cardHeaderStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={cardTitleStyle}>本部（会社）情報</h2>
            <p style={cardSubStyle}>この{unitLabel}が属する本部の情報です。</p>
          </div>
          {canEditCompanyInfo && !state.editingCompanyInfo && (
            <button onClick={actions.openCompanyInfoEdit} style={{ height: 32, padding: '0 14px', borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 12.5, flex: 'none' }}>変更</button>
          )}
        </div>
        {canEditCompanyInfo && state.editingCompanyInfo ? (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
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
            <div><div style={roTitleStyle}>締め日</div><div style={roValueStyle}>{closingDayTxt}</div></div>
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
                  <button onClick={() => actions.requestDeleteHqMember(idx)} style={{ width: 30, height: 30, borderRadius: 8, color: '#c3c8d0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✕</button>
                )}
              </div>
            ))}
            {state.hqMembers.length === 0 && (
              <div style={{ background: '#f7f8fa', border: '1px dashed #d8dce2', borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: '#9aa0a8' }}>まだメンバーがいません。</div>
            )}
          </div>
        </section>
      )}

      {/* ゴミ箱 */}
      <section style={{ ...cardStyle, overflow: 'visible' }}>
        <div style={{ padding: '17px 22px', borderBottom: '1px solid #f0f2f5' }}>
          <h2 style={cardTitleStyle}>ゴミ箱</h2>
          <p style={cardSubStyle}>削除されたチーム・メンバー・情報メモは7日間ここに保存され、8日目に自動的に完全削除されます。</p>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {state.trash.map((item) => {
            const meta = TRASH_META[item.type];
            const daysAgo = Math.floor((Date.now() - item.deletedAt) / 86400000);
            const daysLeft = Math.max(0, 7 - daysAgo);
            const menuOpen = trashMenuOpenId === item.id;
            return (
              <div key={item.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, background: '#f7f8fa', borderRadius: 11, padding: '10px 13px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flex: 'none', background: '#eef0f3', color: meta.color, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{meta.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#9aa0a8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trashDetail(item, state.stores)}</div>
                  <div style={{ fontSize: 10.5, color: '#c3c8d0', marginTop: 2 }}>{trashTypeLabel(item, unitLabel)} ・ {daysAgo}日前削除 ・ 残り{daysLeft}日</div>
                </div>
                {state.isMobile ? (
                  <>
                    <button
                      onClick={() => setTrashMenuOpenId(menuOpen ? null : item.id)}
                      style={{ width: 32, height: 32, borderRadius: 8, flex: 'none', color: '#6b7280', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ⋯
                    </button>
                    {menuOpen && (
                      <>
                        <div onClick={() => setTrashMenuOpenId(null)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                        <div
                          style={{
                            position: 'absolute', top: '100%', right: 13, marginTop: 4, zIndex: 21,
                            background: '#fff', borderRadius: 10, boxShadow: '0 6px 20px rgba(20,40,80,.16)', border: '1px solid #eef0f3',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 128,
                          }}
                        >
                          <button
                            onClick={() => { setTrashMenuOpenId(null); actions.restoreTrashItem(item); }}
                            style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}
                          >
                            元に戻す
                          </button>
                          {canPermanentDelete && (
                            <button
                              onClick={() => { setTrashMenuOpenId(null); actions.requestPermanentDelete(item); }}
                              style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, color: '#d6453d', borderTop: '1px solid #f0f2f5' }}
                            >
                              完全に削除
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => actions.restoreTrashItem(item)} style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #dfe3e8', color: '#3a4150', fontWeight: 700, fontSize: 11.5, flex: 'none' }}>元に戻す</button>
                    {canPermanentDelete && (
                      <button onClick={() => actions.requestPermanentDelete(item)} style={{ height: 32, padding: '0 12px', borderRadius: 8, color: '#d6453d', fontWeight: 700, fontSize: 11.5, flex: 'none' }}>完全に削除</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {state.trash.length === 0 && (
            <div style={{ background: '#f7f8fa', border: '1px dashed #d8dce2', borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: '#9aa0a8' }}>ゴミ箱は空です。</div>
          )}
        </div>
      </section>

      {debugLogEntries.length > 0 && (
        <section style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={{ flex: 1 }}>
              <h2 style={cardTitleStyle}>読み込みエラーの記録（サポート用）</h2>
              <p style={cardSubStyle}>データが表示されないエラーが起きた際の記録です。エラーが出た際はここをコピーして開発者に送ってください。</p>
            </div>
            <button
              onClick={() => { clearOrgLoadDebugLog(); setDebugLogTick((t) => t + 1); }}
              style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #dfe3e8', color: '#3a4150', fontWeight: 700, fontSize: 11.5, flex: 'none' }}
            >
              記録を消す
            </button>
          </div>
          <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {debugLogEntries.map((entry, i) => (
              <div key={i} style={{ background: '#f7f8fa', border: '1px solid #eceff2', borderRadius: 9, padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#5a616c', wordBreak: 'break-all' }}>
                {entry.text}
              </div>
            ))}
            <button
              onClick={() => {
                const text = debugLogEntries.map((e) => e.text).join('\n');
                void navigator.clipboard?.writeText(text);
              }}
              style={{ alignSelf: 'flex-start', height: 32, padding: '0 12px', borderRadius: 8, border: '1.5px solid #dfe3e8', color: '#3a4150', fontWeight: 700, fontSize: 11.5 }}
            >
              すべてコピー
            </button>
          </div>
        </section>
      )}

      {/* Danger zone */}
      {isHqView && isOwner && (
        dangerOpen ? (
          <section style={{ background: '#fff', border: '1.5px solid #f6d9d9', borderRadius: 15, overflow: 'hidden' }}>
            <div style={{ padding: '17px 22px', borderBottom: '1px solid #fbeaea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#c2453d', display: 'flex', alignItems: 'center', gap: 7 }}>⚠ 本部を削除する</h2>
              <button onClick={() => setDangerOpen(false)} style={{ width: 32, height: 32, borderRadius: 9, color: '#8a909a', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✕</button>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, fontSize: 12.5, color: '#6b7280', lineHeight: 1.7 }}>
                本部を削除すると、この管理簿のすべてのデータが失われ、元に戻せません。
                {state.stores.length > 0 && `先にすべての${unitLabel}を削除または移動してください。`}
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
