import type { Store, Transaction, CompanyInfo } from '../types';

export const FACTORS = [0.92, 0.95, 1.05, 1.10, 1.02, 0.98, 1.06, 1.08, 1.00, 1.03, 1.12, 1.20];

export function rnd(i: number, m: number): number {
  const x = Math.sin((i + 1) * 12.9898 + (m + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function yen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function yenShort(n: number): string {
  return Math.round(n / 10000) + '万';
}

export function barColor(a: number): string {
  return a >= 0.15 ? '#1f9d6b' : a >= 0.05 ? '#d99a2b' : '#d6453d';
}

export function chipBg(a: number): string {
  return a >= 0.15 ? '#e4f5ee' : a >= 0.05 ? '#fbf1dc' : '#fbe7e5';
}

export function computeRoyalty(store: Store, sales: number): number {
  if (store.useRoyalty === false) return 0;
  if ((store.royaltyMode || 'rate') === 'amount') return Math.max(0, Math.round(store.royaltyAmount || 0));
  return Math.round((sales * (store.royaltyRate || 0)) / 100 / 1000) * 1000;
}

export function computeSavings(store: Store, sales: number): number {
  if (!store.useSavings) return 0;
  if ((store.savingsMode || 'amount') === 'rate') return Math.round((sales * (store.savingsRate || 0)) / 100 / 1000) * 1000;
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

export function monthData(store: Store, m: number, transactions: Record<string, Transaction[]>): PeriodResult {
  const mi = ((m % 12) + 12) % 12;
  const tx = (transactions[store.id] || []).filter((t) => parseInt(t.date.slice(5, 7), 10) - 1 === mi);
  const salesTx = tx.filter((t) => t.type === 'sales');
  const expTx = tx.filter((t) => t.type === 'expense');
  let sales: number, expense: number, isManual: boolean;
  if (salesTx.length || expTx.length) {
    sales = salesTx.reduce((a, t) => a + t.amount, 0);
    expense = expTx.reduce((a, t) => a + t.amount, 0);
    isManual = true;
  } else {
    const f = FACTORS[mi];
    const r1 = rnd(store.seed, m);
    const r2 = rnd(store.seed + 40, m);
    sales = Math.round((store.base * f * (0.95 + 0.09 * r1)) / 1000) * 1000;
    expense = Math.round((sales * (store.expRatio + (r2 - 0.5) * 0.05)) / 1000) * 1000;
    isManual = false;
  }
  const royalty = computeRoyalty(store, sales);
  const savings = computeSavings(store, sales);
  const profit = sales - expense - royalty - savings;
  return { sales, expense, profit, royalty, savings, hasSavings: !!store.useSavings, isManual };
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

export function yearAgg(store: Store, transactions: Record<string, Transaction[]>): PeriodResult {
  let sales = 0, expense = 0, royalty = 0, savings = 0;
  let anyManual = false;
  for (let m = 0; m < 12; m++) {
    const d = monthData(store, m, transactions);
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
  periodDate: string,
  transactions: Record<string, Transaction[]>,
): PeriodResult {
  if (aggUnit === 'year') return yearAgg(store, transactions);
  if (aggUnit === 'week') {
    const from = mondayOf(periodDate);
    return txAgg(store, from, addDays(from, 6), transactions);
  }
  if (aggUnit === 'day') return txAgg(store, periodDate, periodDate, transactions);
  return monthData(store, month, transactions);
}

export function periodDataPrev(
  store: Store,
  aggUnit: string,
  month: number,
  periodDate: string,
  transactions: Record<string, Transaction[]>,
): PeriodResult {
  if (aggUnit === 'year') return { sales: 0, expense: 0, profit: 0, royalty: 0, savings: 0, hasSavings: false, isManual: false };
  if (aggUnit === 'week') {
    const from = addDays(mondayOf(periodDate), -7);
    return txAgg(store, from, addDays(from, 6), transactions);
  }
  if (aggUnit === 'day') {
    const d = addDays(periodDate, -1);
    return txAgg(store, d, d, transactions);
  }
  return monthData(store, month - 1, transactions);
}

export function toHiragana(str: string): string {
  return (str || '').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase();
}

export function adminMatchesSearch(o: { name: string; rep: string; reading: string }, q: string): boolean {
  if (!q) return true;
  const nq = toHiragana(q);
  return [o.name, o.rep, o.reading].some((s) => toHiragana(s || '').includes(nq));
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

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const CLOSING_DAY_OPTIONS = [
  { value: 'eom', label: '末日' },
  ...Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}日` })),
];

export const FISCAL_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }));
