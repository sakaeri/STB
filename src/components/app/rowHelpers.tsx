// Shared business-logic + tiny presentational helpers for the Sales List page,
// the table/card/detail row layouts, and the store detail drawer.
// Mirrors the prototype's buildRow(store) / permission helpers exactly.

import type { CSSProperties } from 'react';
import type { AppState, Role, Store } from '../../types';
import { periodData, yen, barColor, chipBg } from '../../state/calc';

export interface RowData {
  id: string;
  name: string;
  owner: string;
  initial: string;
  avatarBg: string;
  logoUrl: string | null;
  sales: number;
  expense: number;
  profit: number;
  royalty: number;
  savings: number;
  salesFmt: string;
  expenseFmt: string;
  profitFmt: string;
  profitColor: string;
  achTxt: string;
  chipText: string;
  barWidth: string;
  barColor: string;
  achChipBg: string;
  achChipColor: string;
  royaltyFmt: string;
  savingsFmt: string;
  expRateTxt: string;
}

export function buildRow(store: Store, state: AppState): RowData {
  const d = periodData(store, state.aggUnit, state.month, state.periodDate, state.transactions);
  const marginPct = d.sales ? (d.profit / d.sales) * 100 : 0;
  const marginFrac = d.sales ? d.profit / d.sales : 0;
  const bc = d.sales ? barColor(marginFrac) : '#b8bec6';
  return {
    id: store.id,
    name: store.name,
    owner: store.owner,
    initial: store.name.charAt(0),
    avatarBg: store.bg,
    logoUrl: state.logoMap[store.id] || null,
    sales: d.sales,
    expense: d.expense,
    profit: d.profit,
    royalty: d.royalty,
    savings: d.savings,
    salesFmt: yen(d.sales),
    expenseFmt: yen(d.expense),
    profitFmt: yen(d.profit),
    profitColor: d.profit >= 0 ? '#1f9d6b' : '#d6453d',
    achTxt: d.sales ? marginPct.toFixed(0) + '%' : '—',
    chipText: d.sales ? marginPct.toFixed(0) + '%' : 'データなし',
    barWidth: d.sales ? Math.max(0, Math.min(marginPct, 100)).toFixed(1) + '%' : '0%',
    barColor: bc,
    achChipBg: d.sales ? chipBg(marginFrac) : '#eef0f3',
    achChipColor: d.sales ? bc : '#9aa0a8',
    royaltyFmt: yen(d.royalty),
    savingsFmt: d.hasSavings ? yen(d.savings) : '—',
    expRateTxt: d.sales ? ((d.expense / d.sales) * 100).toFixed(0) + '%' : '—',
  };
}

// 30x30 (table) / 36x36 (card) / 38x38 (detail) rounded-square avatar.
export function RowAvatar({
  row,
  size,
  radius,
  fontSize,
}: {
  row: RowData;
  size: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        background: row.avatarBg,
        color: '#fff',
        fontWeight: 700,
        fontSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {row.initial}
      </div>
      {row.logoUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${row.logoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
    </div>
  );
}

// The current viewer's real role, derived from their actual org_members/
// team_members row (not a self-selected simulation — that was only ever a
// design-prototype demo affordance and never reflected real permissions).
// HQ members implicitly manage every team (see can_manage_team in the RLS
// policies), so an org_members row always applies at store level too.
export function myRole(state: AppState): Role {
  const uid = state.session;
  if (!uid) return '閲覧者';
  const hq = state.hqMembers.find((m) => m.userId === uid);
  if (state.viewRole === 'hq') return hq?.role || '閲覧者';
  if (hq?.role === 'オーナー') return 'オーナー';
  const store = state.stores.find((s) => s.id === state.viewRole);
  const teamRole = store ? state.members.find((m) => m.userId === uid && m.store === store.name)?.role : undefined;
  return teamRole || hq?.role || '閲覧者';
}

// ===== permission helpers (mirror the prototype's inline canXxx bindings) =====
export function canDeleteRole(role: Role): boolean {
  return role === 'オーナー' || role === '管理者';
}
export function canManagePermissions(role: Role): boolean {
  return role === 'オーナー';
}
export function canDeleteCompanyWide(role: Role): boolean {
  return role === 'オーナー';
}
export function canPermanentDelete(role: Role): boolean {
  return role === 'オーナー' || role === '管理者';
}
export function canDeleteForStore(role: Role, isHq: boolean, viewRole: string, storeId: string): boolean {
  return role === 'オーナー' || (role === '管理者' && !isHq && viewRole === storeId);
}
export function canCreateRole(role: Role): boolean {
  return role !== '閲覧者';
}
// Team-settings edit gate: owner (anywhere), or admin viewing their own store.
export function canEditTeamSettings(role: Role, viewRole: string, storeId: string): boolean {
  return role === 'オーナー' || (role === '管理者' && viewRole === storeId);
}

export function isPeriodConfirmed(confirmedPeriods: Record<string, boolean>, storeId: string, period: string): boolean {
  return !!confirmedPeriods[`${storeId}|${period}`];
}

// on/off pill switch styles, mirrors the prototype's sw(on) helper.
export function switchStyles(on: boolean, accent: string): { track: CSSProperties; knob: CSSProperties } {
  return {
    track: {
      width: 42,
      height: 24,
      borderRadius: 12,
      background: on ? accent : '#cdd3da',
      position: 'relative',
      flex: 'none',
      transition: 'background .15s',
    },
    knob: {
      position: 'absolute',
      top: 3,
      left: on ? 21 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      transition: 'left .15s',
      boxShadow: '0 1px 2px rgba(0,0,0,.2)',
    },
  };
}

export function modeSegStyle(active: boolean, accent: string): CSSProperties {
  return {
    flex: 1,
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    color: active ? accent : '#8a909a',
    background: active ? '#fff' : 'transparent',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
    textAlign: 'center',
  };
}
