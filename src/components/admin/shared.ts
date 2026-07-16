import type { AdminMockOrg } from '../../types';
import { currentPeriodKey } from '../../state/calc';

// Small helpers shared between the admin orgs tab and app-settings tab.
// Kept local to this task's directory per the contract (no edits to src/state/*).

export function prefectureOf(address: string): string {
  const m = address.match(/^.+?[都道府県]/);
  return m ? m[0] : address;
}

export function monthDataFor(org: AdminMockOrg, month: string): { teams: number; sales: number } {
  return org.history[month] ?? { teams: org.teams, sales: org.monthlySales };
}

export function maxAdminMonth(orgs: AdminMockOrg[]): string {
  let max = currentPeriodKey(); // "now" — always considered available even with no history entry
  for (const org of orgs) {
    for (const k of Object.keys(org.history)) {
      if (k > max) max = k;
    }
  }
  return max;
}

export function adminMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${y}年${m}月`;
}
