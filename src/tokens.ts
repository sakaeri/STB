// Design tokens ported from the FC売上管理簿 design prototype.
// Accent is configurable per-brand; default matches the prototype's green.

export const ACCENT_OPTIONS = ['#2f6fb3', '#1f7a5a', '#5b4bd6', '#b5562f'] as const;

export function accentSoft(accent: string): string {
  return accent + '18';
}
export function accentBorder(accent: string): string {
  return accent + '40';
}

export const colors = {
  bg: '#eceef1',
  bgSoft: '#f7f8fa',
  card: '#fff',
  border: '#e7e9ed',
  borderSoft: '#f0f2f5',
  divider: '#eef0f3',
  text: '#1b1f27',
  heading: '#3a4150',
  label: '#46505e',
  body: '#2a2f38',
  muted: '#6b7280',
  faint: '#8a909a',
  faint2: '#9aa0a8',
  faint3: '#aab0b8',
  faint4: '#c3c8d0',
  inputBorder: '#dfe3e8',
  inputBorder2: '#e2e5ea',
  dashedBorder: '#d8dce2',
  warn: '#d99a2b',
  warnBg: '#fdf3e3',
  warnBorder: '#f0dcae',
  warnText: '#8a6a2a',
  danger: '#d6453d',
  dangerStrong: '#c2453d',
  dangerBg: '#fbe7e5',
  dangerBg2: '#fbeaea',
  dangerBorder: '#f3d4d0',
  dangerBorder2: '#f6d9d9',
  success: '#1f9d6b',
  successBg: '#e4f5ee',
  successText: '#2f7a5c',
  neutralChipBg: '#f0f2f5',
  neutralChipText: '#6b7280',
} as const;

export const roleBg: Record<string, string> = {
  オーナー: '#3f6fb5',
  管理者: '#c77d3a',
  編集者: '#5a6b9e',
  閲覧者: '#8a909a',
};

export const palette = [
  '#3f6fb5',
  '#2f8f6b',
  '#9a6bcf',
  '#c77d3a',
  '#c2566b',
  '#4a8fb8',
  '#6b7f4a',
  '#b5853f',
  '#5a6b9e',
  '#3a9a8f',
];

export interface PlanTier {
  min: number;
  max: number;
  name: string;
  color: string;
  price: number;
}

export const PLAN_TIERS: PlanTier[] = [
  { min: 1, max: 5, name: 'Free', color: '#8a909a', price: 0 },
  { min: 6, max: 10, name: 'Blue', color: '#2f6fb3', price: 2980 },
  { min: 11, max: 20, name: 'Emerald', color: '#1f9d6b', price: 5980 },
  { min: 21, max: 30, name: 'Gold', color: '#c79a2e', price: 9800 },
  { min: 31, max: Infinity, name: 'Black', color: '#2a2e35', price: 19800 },
];

export function planForCount(n: number): PlanTier {
  return PLAN_TIERS.find((t) => n >= t.min && n <= t.max) || PLAN_TIERS[PLAN_TIERS.length - 1];
}

export const radius = {
  card: 14,
  cardLg: 18,
  input: 10,
  button: 9,
};
