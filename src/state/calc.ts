import type { Store, Transaction, CompanyInfo } from '../types';

export function yen(n: number): string {
  // Math.round(x) can return -0 (e.g. 0 * a negative factor), and
  // (-0).toLocaleString() renders as the string "-0" — normalize it away.
  return '¥' + (Math.round(n) || 0).toLocaleString('ja-JP');
}

export function yenShort(n: number): string {
  return Math.round(n / 10000) + '万';
}

export function barColor(a: number): string {
  return a >= 0 ? '#1f9d6b' : '#d6453d';
}

export function chipBg(a: number): string {
  return a >= 0 ? '#e4f5ee' : '#fbe7e5';
}

export function computeRoyalty(store: Store, sales: number): number {
  if (store.useRoyalty === false) return 0;
  if ((store.royaltyMode || 'rate') === 'amount') return Math.max(0, Math.round(store.royaltyAmount || 0));
  return Math.round((sales * (store.royaltyRate || 0)) / 100 / 1000) * 1000;
}

// Rate mode is a % of profit *before* savings (sales minus expense minus
// royalty) — savings is treated as a bonus set-aside on top of the normal
// profit figure, not another cost baked into how "profit" itself is
// derived from sales.
export function computeSavings(store: Store, preSavingsProfit: number): number {
  if (!store.useSavings) return 0;
  if ((store.savingsMode || 'amount') === 'rate') return Math.round((preSavingsProfit * (store.savingsRate || 0)) / 100 / 1000) * 1000;
  return store.savings || 0;
}

export interface PeriodResult {
  sales: number;
  expense: number;
  profit: number;
  royalty: number;
  savings: number;
  hasSavings: boolean;
  isManual: boolean;
  hasTx?: boolean;
}

export function monthData(store: Store, year: number, m: number, transactions: Record<string, Transaction[]>): PeriodResult {
  const totalMonths = year * 12 + m;
  const yr = Math.floor(totalMonths / 12);
  const mi = ((totalMonths % 12) + 12) % 12;
  const tx = (transactions[store.id] || []).filter(
    (t) => parseInt(t.date.slice(0, 4), 10) === yr && parseInt(t.date.slice(5, 7), 10) - 1 === mi,
  );
  const salesTx = tx.filter((t) => t.type === 'sales');
  const expTx = tx.filter((t) => t.type === 'expense');
  const sales = salesTx.reduce((a, t) => a + t.amount, 0);
  const expense = expTx.reduce((a, t) => a + t.amount, 0);
  const royalty = computeRoyalty(store, sales);
  const preSavingsProfit = sales - expense - royalty;
  const savings = computeSavings(store, preSavingsProfit);
  const profit = preSavingsProfit - savings;
  return { sales, expense, profit, royalty, savings, hasSavings: !!store.useSavings, isManual: true };
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const wd = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - wd);
  return d.toISOString().slice(0, 10);
}

export function txAgg(store: Store, fromStr: string, toStr: string, transactions: Record<string, Transaction[]>): PeriodResult {
  const tx = (transactions[store.id] || []).filter((t) => t.date >= fromStr && t.date <= toStr);
  const sales = tx.filter((t) => t.type === 'sales').reduce((a, t) => a + t.amount, 0);
  const expense = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const royalty = computeRoyalty(store, sales);
  const profit = sales - expense - royalty;
  return { sales, expense, profit, royalty, savings: 0, hasSavings: false, isManual: true, hasTx: tx.length > 0 };
}

export function yearAgg(store: Store, year: number, transactions: Record<string, Transaction[]>): PeriodResult {
  let sales = 0, expense = 0, royalty = 0, savings = 0;
  let anyManual = false;
  for (let m = 0; m < 12; m++) {
    const d = monthData(store, year, m, transactions);
    sales += d.sales; expense += d.expense; royalty += d.royalty; savings += d.savings;
    if (d.isManual) anyManual = true;
  }
  const profit = sales - expense - royalty - savings;
  return { sales, expense, profit, royalty, savings, hasSavings: !!store.useSavings, isManual: anyManual };
}

export function periodData(
  store: Store,
  aggUnit: string,
  month: number,
  year: number,
  periodDate: string,
  transactions: Record<string, Transaction[]>,
): PeriodResult {
  if (aggUnit === 'year') return yearAgg(store, year, transactions);
  if (aggUnit === 'week') {
    const from = mondayOf(periodDate);
    return txAgg(store, from, addDays(from, 6), transactions);
  }
  if (aggUnit === 'day') return txAgg(store, periodDate, periodDate, transactions);
  return monthData(store, year, month, transactions);
}

export function periodDataPrev(
  store: Store,
  aggUnit: string,
  month: number,
  year: number,
  periodDate: string,
  transactions: Record<string, Transaction[]>,
): PeriodResult {
  if (aggUnit === 'year') return yearAgg(store, year - 1, transactions);
  if (aggUnit === 'week') {
    const from = addDays(mondayOf(periodDate), -7);
    return txAgg(store, from, addDays(from, 6), transactions);
  }
  if (aggUnit === 'day') {
    const d = addDays(periodDate, -1);
    return txAgg(store, d, d, transactions);
  }
  return monthData(store, year, month - 1, transactions);
}

// The raw transactions behind periodData()'s totals, for CSV/PDF exports
// that need line-item detail rather than just the aggregate numbers.
export function periodTransactions(
  store: Store,
  aggUnit: string,
  month: number,
  year: number,
  periodDate: string,
  transactions: Record<string, Transaction[]>,
): Transaction[] {
  const tx = transactions[store.id] || [];
  let filtered: Transaction[];
  if (aggUnit === 'year') {
    filtered = tx.filter((t) => parseInt(t.date.slice(0, 4), 10) === year);
  } else if (aggUnit === 'week') {
    const from = mondayOf(periodDate);
    const to = addDays(from, 6);
    filtered = tx.filter((t) => t.date >= from && t.date <= to);
  } else if (aggUnit === 'day') {
    filtered = tx.filter((t) => t.date === periodDate);
  } else {
    const totalMonths = year * 12 + month;
    const yr = Math.floor(totalMonths / 12);
    const mi = ((totalMonths % 12) + 12) % 12;
    filtered = tx.filter((t) => parseInt(t.date.slice(0, 4), 10) === yr && parseInt(t.date.slice(5, 7), 10) - 1 === mi);
  }
  return [...filtered].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function toHiragana(str: string): string {
  return (str || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase();
}

export function adminMatchesSearch(o: { name: string; rep: string; reading: string }, q: string): boolean {
  if (!q) return true;
  const nq = toHiragana(q);
  return [o.name, o.rep, o.reading].some((s) => toHiragana(s || '').includes(nq));
}

// Trial-model orgs get a 30-day trial from signup instead of a permanent
// free tier (see src/state/dataLoader.ts's fetchOrgData) — this is the one
// place that math happens, shared by the settings-page badge/banner and
// the admin dashboard's org list.
export const TRIAL_DAYS = 30;

export function trialDaysLeft(createdAt: string | null): number {
  if (!createdAt) return 0;
  return Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000)));
}

export function getClosingDayNum(companyInfo: CompanyInfo): number | null {
  const cd = companyInfo.closingDay || 'eom';
  return cd === 'eom' ? null : parseInt(cd, 10);
}

export function closingDayPassedForCurrentMonth(companyInfo: CompanyInfo): boolean {
  const num = getClosingDayNum(companyInfo);
  if (num == null) return true;
  const today = new Date();
  return today.getDate() >= num;
}

export function currentPeriodKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

export function targetPeriodKey(): string {
  const today = new Date();
  let y = today.getFullYear();
  let m = today.getMonth();
  m -= 1;
  if (m < 0) { m = 11; y -= 1; }
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

export function targetPeriodLabel(): string {
  const [y, m] = targetPeriodKey().split('-');
  return `${y}年${parseInt(m, 10)}月`;
}

// Daily closing targets yesterday — today's entries are still in progress,
// so there's nothing to grace-period around like the monthly closing day.
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function yesterdayLabel(): string {
  const k = yesterdayKey();
  return `${k.slice(0, 4)}年${parseInt(k.slice(5, 7), 10)}月${parseInt(k.slice(8, 10), 10)}日`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodLabel(aggUnit: string, month: number, year: number, periodDate: string, fiscalStartMonth: number): string {
  if (aggUnit === 'year') return fiscalStartMonth === 1 ? `${year}年` : `${year}年度`;
  if (aggUnit === 'week') {
    const from = mondayOf(periodDate);
    const to = addDays(from, 6);
    return `${from.slice(5, 7)}/${from.slice(8, 10)} - ${to.slice(5, 7)}/${to.slice(8, 10)}`;
  }
  if (aggUnit === 'day') return `${periodDate.slice(0, 4)}/${periodDate.slice(5, 7)}/${periodDate.slice(8, 10)}`;
  return `${year}年 ${month + 1}月`;
}

export const CLOSING_DAY_OPTIONS = [
  { value: 'eom', label: '末日' },
  ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}日` })),
];

export const FISCAL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }));
