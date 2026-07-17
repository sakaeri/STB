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

// Linear, uncapped pricing: the first `freeTeams` teams are free, then the
// price steps up by `pricePerStep` for every additional `teamsPerStep`
// teams — no fixed named tiers, no upper bound. Mirrored server-side in
// api/_lib/pricing.ts (kept manually in sync; /api has no shared package
// boundary with src/).
export interface PricingConfig {
  freeTeams: number;
  teamsPerStep: number;
  pricePerStep: number;
}

export const DEFAULT_PRICING: PricingConfig = { freeTeams: 5, teamsPerStep: 5, pricePerStep: 3000 };

export interface PlanStep {
  step: number; // 0 = free
  price: number;
  label: string;
  color: string;
}

export function stepsForCount(n: number, pricing: PricingConfig): number {
  return Math.max(0, Math.ceil((n - pricing.freeTeams) / pricing.teamsPerStep));
}

export function planForCount(n: number, pricing: PricingConfig = DEFAULT_PRICING): PlanStep {
  const step = stepsForCount(n, pricing);
  const price = step * pricing.pricePerStep;
  return {
    step,
    price,
    label: step === 0 ? 'Free' : `¥${price.toLocaleString('ja-JP')}/月`,
    color: step === 0 ? '#8a909a' : '#1f7a5a',
  };
}

export const radius = {
  card: 14,
  cardLg: 18,
  input: 10,
  button: 9,
};
