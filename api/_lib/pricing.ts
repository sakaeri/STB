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

export function parsePricingConfig(raw: unknown): PricingConfig {
  const r = (raw as Partial<PricingConfig>) || {};
  return {
    freeTeams: typeof r.freeTeams === 'number' ? r.freeTeams : DEFAULT_PRICING.freeTeams,
    teamsPerStep: typeof r.teamsPerStep === 'number' ? r.teamsPerStep : DEFAULT_PRICING.teamsPerStep,
    pricePerStep: typeof r.pricePerStep === 'number' ? r.pricePerStep : DEFAULT_PRICING.pricePerStep,
  };
}
