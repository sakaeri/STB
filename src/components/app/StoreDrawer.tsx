import { useStore } from '../../state/store.tsx';
import { periodData, periodLabel, yen } from '../../state/calc';
import { accentSoft, colors, roleBg } from '../../tokens';
import {
  buildRow,
  canDeleteForStore,
  canEditTeamSettings,
  canManagePermissions,
  modeSegStyle,
  switchStyles,
  RowAvatar,
  myRole,
} from './rowHelpers';
import './app.css';
import type { Role } from '../../types';

export default function StoreDrawer() {
  const { state, actions } = useStore();

  if (!state.selectedStoreId) return null;
  const store = state.stores.find((s) => s.id === state.selectedStoreId);
  if (!store) return null;

  // Frozen orgs keep the sales-list rollup visible (so it's clear the
  // business is still running) but lose access to per-store detail —
  // meant as a nudge to resolve payment, not a hard data lockout.
  // Only the HQ view is restricted; a team member looking at their own
  // store is unaffected — freezing is HQ's payment problem, not theirs.
  if (state.orgStatus === 'frozen' && state.viewRole === 'hq') {
    const isOwner = myRole(state) === 'オーナー';
    return (
      <>
        <div onClick={actions.closeStoreDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.34)', zIndex: 40, animation: 'scOver .2s ease both' }} />
        <div
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '92vw', background: '#fff', zIndex: 41,
            boxShadow: '-8px 0 30px rgba(20,40,80,.16)', display: 'flex', flexDirection: 'column', animation: 'scDraw .26s cubic-bezier(.2,.8,.25,1) both',
          }}
        >
          <div style={{ padding: '20px 22px 18px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{store.name}</div>
            </div>
            <button className="stb-icon-btn" onClick={actions.closeStoreDrawer} style={{ width: 32, height: 32, borderRadius: 8, color: colors.faint, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: colors.dangerBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.danger, fontSize: 21 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>この本部は凍結されています</div>
            <p style={{ margin: 0, fontSize: 12.5, color: colors.faint, lineHeight: 1.8 }}>
              お支払いが確認できていないため、{store.name}の詳細はご確認いただけません。お支払いを完了すると自動的に解除されます。
            </p>
            {isOwner ? (
              <button
                onClick={actions.startCheckout}
                disabled={state.billingCheckoutLoading}
                style={{ height: 42, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: state.accent, opacity: state.billingCheckoutLoading ? 0.6 : 1 }}
              >
                {state.billingCheckoutLoading ? '処理中…' : 'お支払い手続きへ'}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: 11.5, color: colors.faint2 }}>お支払い手続きはオーナー権限のメンバーのみ行えます。</p>
            )}
          </div>
        </div>
      </>
    );
  }

  const isHq = state.viewRole === 'hq';
  const row = buildRow(store, state);
  const d = periodData(store, state.aggUnit, state.month, state.periodDate, state.transactions);
  const marginTxt = d.sales ? ((d.profit / d.sales) * 100).toFixed(0) + '%' : '—';
  const periodLbl = periodLabel(state.aggUnit, state.month, state.year, state.periodDate, state.companyInfo.fiscalStartMonth || 4);

  const role = myRole(state);
  const drawerCanDelete = canDeleteForStore(role, isHq, state.viewRole, store.id);
  const canEditSettings = canEditTeamSettings(role, state.viewRole, store.id);
  const canManagePerms = canManagePermissions(role);

  const royaltyMode = store.royaltyMode || 'rate';
  const savingsMode = store.savingsMode || 'amount';
  const up = (patch: Partial<typeof store>) => actions.updateStore(store.id, patch);

  // ===== this month's transactions =====
  const mi = ((state.month % 12) + 12) % 12;
  const storeTx = (state.transactions[store.id] || [])
    .filter((t) => parseInt(t.date.slice(5, 7), 10) - 1 === mi)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  const openTxDetail = (t: (typeof storeTx)[number]) => {
    actions.openTxDetail({
      title: t.title,
      dateFull: `${t.date.slice(0, 4)}年${t.date.slice(5, 7)}月${t.date.slice(8, 10)}日`,
      typeLabel: t.type === 'sales' ? '売上' : '経費',
      hasPhoto: !!t.photo,
      noPhoto: !t.photo,
      photo: t.photo,
      typeBg: t.type === 'sales' ? '#e4f5ee' : '#fbe7ec',
      typeColor: t.type === 'sales' ? '#1f9d6b' : '#c2566b',
      typeGlyph: t.type === 'sales' ? '¥' : '−',
      signedAmountFmt: (t.type === 'sales' ? '+' : '−') + yen(t.amount).slice(1),
      canDelete: drawerCanDelete,
      onDelete: () => {
        actions.closeTxDetail();
        actions.requestDeleteTx(store.id, t);
      },
    });
  };

  // ===== members for this store =====
  const storeMembers = state.members
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.store === store.name);

  const onMemberRole = (idx: number, v: string) => {
    const cur = state.members[idx];
    const storeManagerCount = state.members.filter((x) => x.store === store.name && x.role === '管理者').length;
    if (cur.role === '管理者' && v !== '管理者' && storeManagerCount <= 1) {
      alert(`${store.name}には管理者が最低1人必要です。他のメンバーを管理者にしてから変更してください。`);
      return;
    }
    actions.setMemberRole(cur, v as Role);
  };

  const roySwitch = switchStyles(store.useRoyalty !== false, state.accent);
  const savSwitch = switchStyles(!!store.useSavings, state.accent);

  return (
    <>
      <div onClick={actions.closeStoreDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.34)', zIndex: 40, animation: 'scOver .2s ease both' }} />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          maxWidth: '92vw',
          background: '#fff',
          zIndex: 41,
          boxShadow: '-8px 0 30px rgba(20,40,80,.16)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scDraw .26s cubic-bezier(.2,.8,.25,1) both',
        }}
      >
        <div style={{ padding: '20px 22px 18px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 13 }}>
          <div onClick={actions.openLogoEditor} style={{ cursor: 'pointer' }}>
            <RowAvatar row={row} size={44} radius={11} fontSize={17} />
          </div>
          <div style={{ flex: 1, lineHeight: 1.3, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{store.name}</div>
            <div style={{ fontSize: 12, color: colors.faint2 }}>
              {row.owner} ・ {periodLbl}
            </div>
          </div>
          <button className="stb-icon-btn" onClick={actions.closeStoreDrawer} style={{ width: 32, height: 32, borderRadius: 8, color: colors.faint, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 11, marginBottom: 20 }}>
            <span style={{ fontSize: 32, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em' }}>{row.salesFmt}</span>
            <span style={{ fontSize: 12, color: colors.faint, marginBottom: 7 }}>売上</span>
            <span
              style={{
                marginLeft: 'auto',
                marginBottom: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 20,
                background: row.achChipBg,
                color: row.achChipColor,
              }}
            >
              利益率 {row.achTxt}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
            <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: colors.faint, marginBottom: 3 }}>経費</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{row.expenseFmt}</div>
              <div style={{ fontSize: 10.5, color: colors.faint3 }}>経費率 {row.expRateTxt}</div>
            </div>
            <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: colors.faint, marginBottom: 3 }}>利益</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: row.profitColor }}>{row.profitFmt}</div>
              <div style={{ fontSize: 10.5, color: colors.faint3 }}>利益率 {marginTxt}</div>
            </div>
            <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: colors.faint, marginBottom: 3 }}>ロイヤリティ（{store.royaltyRate}%）</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{row.royaltyFmt}</div>
            </div>
            <div style={{ background: '#f7f8fa', borderRadius: 11, padding: '13px 15px' }}>
              <div style={{ fontSize: 11.5, color: colors.faint, marginBottom: 3 }}>貯蓄金額</div>
              <div style={{ fontWeight: 700, fontSize: 18, fontVariantNumeric: 'tabular-nums', color: colors.muted }}>{row.savingsFmt}</div>
            </div>
          </div>

          {/* 取引明細（今月） */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150', marginBottom: 13 }}>今月の取引明細</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {storeTx.map((t) => {
                const typeBg = t.type === 'sales' ? '#e4f5ee' : '#fbe7ec';
                const typeColor = t.type === 'sales' ? '#1f9d6b' : '#c2566b';
                const typeGlyph = t.type === 'sales' ? '¥' : '−';
                const signedAmountFmt = (t.type === 'sales' ? '+' : '−') + yen(t.amount).slice(1);
                const dateFmt = `${t.date.slice(5, 7)}/${t.date.slice(8, 10)}`;
                return (
                  <div
                    key={t.id}
                    className="stb-tx-row"
                    onClick={() => openTxDetail(t)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f8fa', borderRadius: 11, padding: '9px 12px', cursor: 'pointer' }}
                  >
                    {t.photo ? (
                      <div style={{ width: 36, height: 36, borderRadius: 8, backgroundImage: `url(${t.photo})`, backgroundSize: 'cover', backgroundPosition: 'center', flex: 'none' }} />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: typeBg,
                          color: typeColor,
                          fontSize: 15,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 'none',
                        }}
                      >
                        {typeGlyph}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      <div style={{ fontSize: 10.5, color: colors.faint2 }}>{dateFmt}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: 'tabular-nums', color: typeColor, whiteSpace: 'nowrap' }}>{signedAmountFmt}</div>
                    {drawerCanDelete && (
                      <button
                        className="stb-icon-btn-danger"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          actions.requestDeleteTx(store.id, t);
                        }}
                        style={{ width: 26, height: 26, borderRadius: 7, color: colors.faint3, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              {storeTx.length === 0 && (
                <div style={{ background: '#f7f8fa', border: `1px dashed ${colors.dashedBorder}`, borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: colors.faint2, lineHeight: 1.6 }}>
                  今月の取引がまだありません。
                  <br />
                  ヘッダーの「＋売上」「＋経費」から入力できます。
                </div>
              )}
            </div>
          </div>

          {/* 店舗設定 */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 18, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>{state.unitLabel || '店舗'}設定</span>
              {canEditSettings && (
                <button
                  onClick={() => actions.toggleTeamSettingsEdit(true)}
                  style={{
                    marginLeft: 'auto',
                    height: 29,
                    padding: '0 12px',
                    borderRadius: 8,
                    background: accentSoft(state.accent),
                    color: state.accent,
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                  }}
                >
                  {state.editingTeamSettings ? '完了' : '編集'}
                </button>
              )}
            </div>

            {state.editingTeamSettings && canEditSettings ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: colors.faint, display: 'block', marginBottom: 6 }}>
                    {state.unitLabel || '店舗'}名 <span style={{ color: colors.danger }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={store.name}
                    onChange={(e) => up({ name: e.target.value })}
                    style={{ width: '100%', border: `1.5px solid ${state.teamNameError ? colors.danger : '#dfe3e8'}`, borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontWeight: 500, outline: 'none', background: '#fff' }}
                  />
                  {state.teamNameError && <div style={{ fontSize: 11.5, color: colors.danger, marginTop: 5 }}>{state.unitLabel || '店舗'}名を入力してください</div>}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 700, color: colors.faint }}>ロイヤリティを使う</label>
                      <button onClick={() => up({ useRoyalty: store.useRoyalty === false })} style={roySwitch.track}>
                        <span style={roySwitch.knob} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', background: colors.bg, borderRadius: 8, padding: 2, width: 110, opacity: store.useRoyalty !== false ? 1 : 0.4 }}>
                      <button onClick={() => up({ royaltyMode: 'rate' })} style={modeSegStyle(royaltyMode === 'rate', state.accent)}>
                        率
                      </button>
                      <button onClick={() => up({ royaltyMode: 'amount' })} style={modeSegStyle(royaltyMode === 'amount', state.accent)}>
                        金額
                      </button>
                    </div>
                  </div>
                  <div style={{ opacity: store.useRoyalty !== false ? 1 : 0.4 }}>
                    {royaltyMode === 'rate' ? (
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 12px', width: 120 }}>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={store.royaltyRate}
                          onChange={(e) => up({ royaltyRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, fontWeight: 700, padding: '10px 0', fontVariantNumeric: 'tabular-nums', width: '100%', background: 'transparent' }}
                        />
                        <span style={{ fontSize: 13, color: colors.faint, fontWeight: 700 }}>%</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 12px', maxWidth: 200 }}>
                        <span style={{ fontSize: 14, color: colors.faint, fontWeight: 700 }}>¥</span>
                        <input
                          type="number"
                          step={1000}
                          value={store.royaltyAmount || 0}
                          onChange={(e) => up({ royaltyAmount: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, fontWeight: 700, padding: '10px 0 10px 6px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                        />
                        <span style={{ fontSize: 11, color: colors.faint3 }}>/月</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 700, color: colors.faint }}>貯蓄設定を使う</label>
                    <button onClick={() => up({ useSavings: !store.useSavings })} style={savSwitch.track}>
                      <span style={savSwitch.knob} />
                    </button>
                    <div style={{ display: 'flex', background: colors.bg, borderRadius: 8, padding: 2, width: 110, marginLeft: 'auto', opacity: store.useSavings ? 1 : 0.4 }}>
                      <button onClick={() => up({ savingsMode: 'rate' })} style={modeSegStyle(savingsMode === 'rate', state.accent)}>
                        率
                      </button>
                      <button onClick={() => up({ savingsMode: 'amount' })} style={modeSegStyle(savingsMode === 'amount', state.accent)}>
                        金額
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: store.useSavings ? 1 : 0.4 }}>
                    {savingsMode === 'amount' ? (
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 12px', maxWidth: 220 }}>
                        <span style={{ fontSize: 14, color: colors.faint, fontWeight: 700 }}>¥</span>
                        <input
                          type="number"
                          step={1000}
                          value={store.savings || 0}
                          onChange={(e) => up({ savings: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, fontWeight: 700, padding: '10px 0 10px 6px', fontVariantNumeric: 'tabular-nums', background: 'transparent' }}
                        />
                        <span style={{ fontSize: 11, color: colors.faint3 }}>/月</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '0 12px', width: 120 }}>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={store.savingsRate || 0}
                          onChange={(e) => up({ savingsRate: Math.max(0, parseFloat(e.target.value) || 0) })}
                          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, fontWeight: 700, padding: '10px 0', fontVariantNumeric: 'tabular-nums', width: '100%', background: 'transparent' }}
                        />
                        <span style={{ fontSize: 13, color: colors.faint, fontWeight: 700 }}>%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 16 }}>
                  <button
                    onClick={() => actions.requestDeleteTeam(store)}
                    style={{ height: 38, padding: '0 16px', borderRadius: 10, border: `1.5px solid ${colors.dangerBorder}`, color: colors.danger, fontWeight: 700, fontSize: 12.5 }}
                  >
                    {state.unitLabel || '店舗'}を削除
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#f7f8fa', borderRadius: 12, padding: '14px 16px' }}>
                <div>
                  <div style={{ fontSize: 11, color: colors.faint2, marginBottom: 3 }}>{state.unitLabel || '店舗'}名</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{store.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: colors.faint2, marginBottom: 3 }}>ロイヤリティ</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {store.useRoyalty === false ? '未使用' : royaltyMode === 'rate' ? `${store.royaltyRate || 0}%` : `¥${Math.round(store.royaltyAmount || 0).toLocaleString('ja-JP')}/月`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: colors.faint2, marginBottom: 3 }}>貯蓄設定</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {!store.useSavings ? '未使用' : savingsMode === 'rate' ? `${store.savingsRate || 0}%` : `¥${Math.round(store.savings || 0).toLocaleString('ja-JP')}/月`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: colors.faint2, lineHeight: 1.6 }}>その他の共有範囲の設定は、オーナーのみ変更できます。</div>
              </div>
            )}
          </div>

          {/* 権限・メンバー */}
          <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 18, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 13 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>権限・メンバー</span>
              {drawerCanDelete && (
                <button
                  onClick={() => actions.inviteMember(store.name, store.id)}
                  style={{
                    marginLeft: 'auto',
                    height: 30,
                    padding: '0 12px 0 9px',
                    borderRadius: 8,
                    background: accentSoft(state.accent),
                    color: state.accent,
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>メンバーを招待
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {storeMembers.map(({ m, idx }) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f7f8fa', borderRadius: 11, padding: '9px 12px' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: roleBg[m.role] || '#8a909a',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                  {canManagePerms ? (
                    <select
                      value={m.role}
                      onChange={(e) => onMemberRole(idx, e.target.value)}
                      style={{ border: '1.5px solid #e2e5ea', borderRadius: 8, padding: '6px 9px', fontSize: 12, fontWeight: 500, color: '#3a4150', background: '#fff', cursor: 'pointer', outline: 'none' }}
                    >
                      <option>管理者</option>
                      <option>編集者</option>
                      <option>閲覧者</option>
                    </select>
                  ) : (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: roleBg[m.role] || '#8a909a', background: colors.divider, padding: '6px 10px', borderRadius: 8 }}>{m.role}</span>
                  )}
                  {drawerCanDelete && (
                    <button
                      className="stb-icon-btn-danger"
                      onClick={() => actions.requestDeleteMember(idx)}
                      style={{ width: 26, height: 26, borderRadius: 7, color: colors.faint3, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {storeMembers.length === 0 && (
                <div style={{ background: '#f7f8fa', border: `1px dashed ${colors.dashedBorder}`, borderRadius: 11, padding: 16, textAlign: 'center', fontSize: 12, color: colors.faint2, lineHeight: 1.6 }}>
                  まだメンバーがいません。
                  <br />
                  「＋メンバーを招待」から追加できます。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
