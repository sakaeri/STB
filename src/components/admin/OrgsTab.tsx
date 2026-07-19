import type { ReactNode } from 'react';
import { useStore } from '../../state/store.tsx';
import { planForCount } from '../../tokens';
import { adminMatchesSearch } from '../../state/calc';
import { adminMonthLabel, monthDataFor, prefectureOf } from './shared';
import type { AdminMockOrg } from '../../types';

export default function OrgsTab() {
  const { state, actions } = useStore();
  const orgs = state.adminMockOrgs;
  const month = state.adminMonth;

  // Stats are always computed over the full unfiltered org set.
  const statOrgCount = orgs.length;
  const statTeamCount = orgs.reduce((sum, o) => sum + monthDataFor(o, month).teams, 0);
  const statFrozenCount = orgs.filter((o) => o.status === 'frozen').length;
  const statBillingTotal = orgs
    .filter((o) => o.status === 'active')
    .reduce((sum, o) => sum + planForCount(monthDataFor(o, month).teams, state.pricingConfig).price, 0);

  const prefOptions = Array.from(new Set(orgs.map((o) => prefectureOf(o.address)))).sort();

  const filtered = orgs.filter((o) => {
    if (state.adminPrefFilter && prefectureOf(o.address) !== state.adminPrefFilter) return false;
    if (!adminMatchesSearch(o, state.adminSearch)) return false;
    return true;
  });

  const pageSize = state.adminPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, state.adminPage), totalPages);
  const pageStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, filtered.length);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const showPagination = totalPages > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <StatCard label="登録本部数" value={statOrgCount.toLocaleString('ja-JP')} />
        <StatCard label="合計チーム数" value={statTeamCount.toLocaleString('ja-JP')} />
        <StatCard label="凍結中の本部" value={statFrozenCount.toLocaleString('ja-JP')} color="#c2453d" />
        <StatCard label="課金合計金額（月額）" value={`¥${statBillingTotal.toLocaleString('ja-JP')}`} color={state.accent} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e7e9ed', borderRadius: 15, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5', display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={state.adminSearch}
            onChange={(e) => actions.onAdminSearch(e.target.value)}
            placeholder="本部名・代表者名で検索"
            style={{ width: '100%', maxWidth: 320, border: '1.5px solid #dfe3e8', borderRadius: 9, padding: '9px 13px', fontSize: 13, outline: 'none' }}
          />
          <select
            value={state.adminPrefFilter}
            onChange={(e) => actions.onAdminPrefFilter(e.target.value)}
            style={{ border: '1.5px solid #dfe3e8', borderRadius: 9, padding: '9px 13px', fontSize: 13, outline: 'none', background: '#fff', color: '#3a4150' }}
          >
            <option value="">都道府県で絞り込み</option>
            {prefOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <Th>本部名</Th>
              <Th>代表者</Th>
              <Th>都道府県</Th>
              <Th align="right">チーム数</Th>
              <Th align="right">今月売上</Th>
              <Th>プラン</Th>
              <Th>状態</Th>
              <th style={{ padding: '11px 18px' }} />
            </tr>
          </thead>
          <tbody>
            {paged.map((o) => (
              <OrgRow key={o.id} org={o} month={month} />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 12.5, color: '#9aa0a8' }}>該当する本部がありません。</div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #f0f2f5' }}>
          <div style={{ fontSize: 11.5, color: '#9aa0a8' }}>
            {filtered.length}件中 {pageStart}-{pageEnd}件を表示
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#9aa0a8' }}>表示件数</span>
              <button
                onClick={() => actions.setAdminPageSize(20)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 7, fontWeight: 700, fontSize: 11.5,
                  background: pageSize === 20 ? state.accent : '#f0f2f5', color: pageSize === 20 ? '#fff' : '#6b7280',
                }}
              >
                20
              </button>
              <button
                onClick={() => actions.setAdminPageSize(50)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 7, fontWeight: 700, fontSize: 11.5,
                  background: pageSize === 50 ? state.accent : '#f0f2f5', color: pageSize === 50 ? '#fff' : '#6b7280',
                }}
              >
                50
              </button>
            </div>
            {showPagination && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => actions.adminPrevPage()}
                  disabled={page <= 1}
                  style={{ height: 28, padding: '0 12px', borderRadius: 7, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 11.5, opacity: page <= 1 ? 0.4 : 1 }}
                >
                  前へ
                </button>
                <div style={{ fontSize: 11.5, color: '#6b7280' }}>{page} / {totalPages}</div>
                <button
                  onClick={() => actions.adminNextPage()}
                  disabled={page >= totalPages}
                  style={{ height: 28, padding: '0 12px', borderRadius: 7, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 11.5, opacity: page >= totalPages ? 0.4 : 1 }}
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e7e9ed', borderRadius: 15, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f2f5', fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>
          操作ログ（凍結・削除）・{adminMonthLabel(month)}
        </div>
        {state.auditLog.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {state.auditLog.map((log, i) => (
              <div key={i} style={{ padding: '10px 20px', borderTop: '1px solid #f5f6f8', display: 'flex', gap: 14, fontSize: 12.5 }}>
                <span style={{ color: '#9aa0a8', flex: 'none' }}>{log.ts}</span>
                <span style={{ color: '#3a4150' }}>{log.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: 12, color: '#c3c8d0' }}>まだ操作履歴はありません。</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e7e9ed', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 11.5, color: '#8a909a', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || undefined }}>{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align?: 'right' }) {
  return (
    <th style={{ padding: '11px 18px', fontSize: 11.5, color: '#8a909a', fontWeight: 700, textAlign: align || 'left' }}>
      {children}
    </th>
  );
}

function OrgRow({ org, month }: { org: AdminMockOrg; month: string }) {
  const { state, actions } = useStore();
  const { teams, sales } = monthDataFor(org, month);
  const isFrozen = org.status === 'frozen';
  // Frozen orgs haven't completed Stripe payment, so no revenue is actually
  // being collected — show ¥0 rather than the team-count-derived plan price.
  const plan = isFrozen ? { label: '¥0/月（凍結中）', color: '#c2453d' } : planForCount(teams, state.pricingConfig);
  const showActionMenu = state.adminActionMenuOrgId === org.id;
  const showDetail = state.adminDetailOrgId === org.id;

  return (
    <>
      <tr onClick={() => actions.toggleAdminDetail(org.id)} style={{ borderTop: '1px solid #f0f2f5', cursor: 'pointer' }}>
        <td style={{ padding: '12px 18px', fontWeight: 700, fontSize: 13 }}>{org.name}</td>
        <td style={{ padding: '12px 18px', fontSize: 12.5, color: '#6b7280' }}>{org.rep}</td>
        <td style={{ padding: '12px 18px', fontSize: 12.5, color: '#6b7280' }}>{prefectureOf(org.address)}</td>
        <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{teams}</td>
        <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          ¥{sales.toLocaleString('ja-JP')}
        </td>
        <td style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: plan.color }}>{plan.label}</td>
        <td style={{ padding: '12px 18px' }}>
          <span
            style={{
              fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
              background: isFrozen ? '#fbeaea' : '#e4f5ee', color: isFrozen ? '#c2453d' : '#2f7a5c',
            }}
          >
            {isFrozen ? '凍結中' : '稼働中'}
          </span>
        </td>
        <td style={{ padding: '12px 18px', textAlign: 'right', position: 'relative' }}>
          <button
            onClick={(e) => { e.stopPropagation(); actions.toggleAdminActionMenu(org.id); }}
            style={{ width: 30, height: 30, borderRadius: 8, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 15, lineHeight: 1 }}
          >
            ⋮
          </button>
          {showActionMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 18, top: 38, zIndex: 5, background: '#fff', border: '1px solid #e2e5ea',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(20,40,80,.14)', overflow: 'hidden', minWidth: 120,
              }}
            >
              <button
                onClick={() => actions.toggleAdminFreeze(org.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12.5, fontWeight: 700, color: '#6b7280' }}
              >
                {isFrozen ? '凍結解除' : '凍結'}
              </button>
              <button
                onClick={() => actions.deleteAdminOrg(org.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12.5, fontWeight: 700, color: '#d6453d', borderTop: '1px solid #f0f2f5' }}
              >
                削除
              </button>
            </div>
          )}
        </td>
      </tr>
      {showDetail && (
        <tr style={{ borderTop: '1px solid #f0f2f5', background: '#f7f8fa' }}>
          <td colSpan={8} style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 28, fontSize: 12.5, color: '#6b7280' }}>
              <div><span style={{ color: '#9aa0a8' }}>所在地：</span>{org.address}</div>
              <div><span style={{ color: '#9aa0a8' }}>登録日：</span>{org.joinedAt}</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
