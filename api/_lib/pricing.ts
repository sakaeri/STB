// Mirrors src/tokens.ts's linear pricing model — kept in sync manually
// since /api has no shared package boundary with src/.
export interface PricingConfig {
  freeTeams: number;
  teamsPerStep: number;
  pricePerStep: number;
}

export const DEFAULT_PRICING: PricingConfig = { freeTeams: 5, teamsPerStep: 5, pricePerStep: 3000 };

export function stepsForCount(n: number, pricing: PricingConfig): number {
  return Math.max(0, Math.ceil((n - pricing.freeTeams) / pricing.teamsPerStep));
}

// 'legacy' = orgs that existed before the 2026-08 pricing overhaul — kept
// on the original "N teams free forever" config untouched. 'trial' =
// every org created since — same per-step rate, but no permanent free
// tier (30-day trial from signup instead; see src/state/dataLoader.ts).
export type PricingModel = 'legacy' | 'trial';

export function effectivePricing(pricingModel: PricingModel, base: PricingConfig): PricingConfig {
  return pricingModel === 'trial' ? { ...base, freeTeams: 0 } : base;
}

export function parsePricingConfig(raw: unknown): PricingConfig {
  const r = (raw as Partial<PricingConfig>) || {};
  return {
    freeTeams: typeof r.freeTeams === 'number' ? r.freeTeams : DEFAULT_PRICING.freeTeams,
    teamsPerStep: typeof r.teamsPerStep === 'number' ? r.teamsPerStep : DEFAULT_PRICING.teamsPerStep,
    pricePerStep: typeof r.pricePerStep === 'number' ? r.pricePerStep : DEFAULT_PRICING.pricePerStep,
  };
}
