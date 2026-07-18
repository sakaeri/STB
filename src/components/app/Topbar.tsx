import { useStore } from '../../state/store.tsx';
import { periodLabel } from '../../state/calc';

export default function Topbar() {
  const { state, actions } = useStore();

  const isHq = state.viewRole === 'hq';
  const viewStore = isHq ? null : state.stores.find((s) => s.id === state.viewRole) || null;
  const unitLabel = state.unitLabel || '店舗';
  const unitLabelPlural = state.unitLabelPlural || '加盟店';
  const visibleCount = isHq ? state.stores.length : 1;

  const titles: Record<typeof state.page, string> = { list: '売上一覧', memo: '情報メモ', settings: '本部情報' };
  const subs: Record<typeof state.page, string> = {
    list: isHq
      ? `${unitLabelPlural} ${visibleCount}${unitLabel}の売上・経費・利益・貯蓄を管理`
      : `${viewStore ? viewStore.name : ''} の売上・経費・利益を管理`,
    memo: '店舗・本部間の連絡とメモ',
    settings: isHq ? 'デフォルト・権限・表示の設定' : '自社の店舗設定',
  };

  const label = periodLabel(state.aggUnit, state.month, state.year, state.periodDate, state.companyInfo.fiscalStartMonth || 4);
  const isAdmin = !!state.accounts.find((a) => a.id === state.session)?.isAdmin;
  const brandLogoUrl = state.logoMap['app-logo'] || state.logoMap['operator-logo'] || null;
  const isOrgMember = state.hqMembers.some((m) => m.userId === state.session);

  const periodNav = state.page === 'list' && (
    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e5ea', borderRadius: 10, overflow: 'hidden', flex: 'none' }}>
      <button
        onClick={actions.prevPeriod}
        aria-label="前の期間"
        style={{ width: 34, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6270' }}
      >
        <span style={{ width: 8, height: 8, borderLeft: '2px solid currentColor', borderBottom: '2px solid currentColor', transform: 'rotate(45deg)', marginLeft: 3 }} />
      </button>
      <div
        style={{
          minWidth: 104,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: 'tabular-nums',
          borderLeft: '1px solid #eef0f3',
          borderRight: '1px solid #eef0f3',
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 10px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <button
        onClick={actions.nextPeriod}
        aria-label="次の期間"
        style={{ width: 34, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6270' }}
      >
        <span style={{ width: 8, height: 8, borderRight: '2px solid currentColor', borderTop: '2px solid currentColor', transform: 'rotate(45deg)', marginRight: 3 }} />
      </button>
    </div>
  );

  return (
    <header
      style={{
        flex: 'none',
        display: 'flex',
        flexDirection: state.isMobile ? 'column' : 'row',
        alignItems: state.isMobile ? 'stretch' : 'center',
        gap: state.isMobile ? 9 : 14,
        padding: state.isMobile ? '11px 16px' : '16px 26px',
        background: '#fff',
        borderBottom: '1px solid #e7e9ed',
        minHeight: 64,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
        {state.isMobile && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: brandLogoUrl ? `#fff url("${brandLogoUrl}") center/cover no-repeat` : state.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            {!brandLogoUrl && <div style={{ width: 13, height: 13, border: '2.5px solid #fff', borderRadius: 3, borderBottomWidth: 5 }} />}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {titles[state.page]}
          </h1>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8a909a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subs[state.page]}
          </p>
        </div>
        {state.isMobile && isAdmin && (
          <button
            onClick={actions.goAdminDashboard}
            aria-label="運営ダッシュボードに戻る"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#f0f2f5',
              color: '#6b7280',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            ⚙
          </button>
        )}
        {state.isMobile && (
          <button
            onClick={actions.openProfileModal}
            aria-label="アカウント"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: state.accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            {(state.ownerProfile.name || '?').charAt(0)}
          </button>
        )}
      </div>

      {state.isMobile ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={state.viewRole}
            onChange={(e) => actions.setViewRole(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              border: '1.5px solid #e2e5ea',
              borderRadius: 9,
              padding: '8px 9px',
              fontSize: 12.5,
              fontWeight: 700,
              color: '#3a4150',
              background: '#fff',
              outline: 'none',
            }}
          >
            {isOrgMember && <option value="hq">本部（全{unitLabelPlural}）</option>}
            {state.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {periodNav}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {isAdmin && (
            <button
              onClick={actions.goAdminDashboard}
              style={{ height: 36, padding: '0 14px', borderRadius: 9, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}
            >
              ← 運営ダッシュボードに戻る
            </button>
          )}
          {periodNav}
        </div>
      )}
    </header>
  );
}
