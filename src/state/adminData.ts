// Loaders/mutations for the operator/admin dashboard (see
// supabase/migrations/0002_invites_and_admin.sql). Kept separate from
// dataLoader.ts since it queries across every org, gated by profiles.is_admin
// via RLS admin-bypass policies rather than org/team membership.
import { supabase } from '../lib/supabase';
import { billedPlanFor, effectivePricing, DEFAULT_PRICING, type PricingConfig } from '../tokens';
import { currentPeriodKey } from './calc';
import type { AdminMockOrg, AuditLogEntry } from '../types';

export interface AdminSettingsData {
  logoUrl: string | null;
  billingProvider: 'stripe' | 'square';
  billingApiKeys: { stripe: string; square: string };
  pricingConfig: PricingConfig;
  settingsTerms: string;
  paymentGraceDays: number;
}

export async function fetchAdminOrgs(pricing: PricingConfig = DEFAULT_PRICING): Promise<AdminMockOrg[]> {
  const { data: orgs, error: orgsErr } = await supabase
    .from('orgs')
    .select('id, name, rep, reading, address, status, created_at, billed_step, signup_template_id, pricing_model')
    .order('created_at', { ascending: true });
  if (orgsErr) throw orgsErr;

  // One オーナー per org (by construction — see createOrgWithFirstTeam),
  // fetched separately since org_members/profiles aren't nested under orgs.
  const { data: owners, error: ownersErr } = await supabase
    .from('org_members')
    .select('org_id, profiles(name, email)')
    .eq('role', 'オーナー');
  if (ownersErr) throw ownersErr;
  const ownerByOrg = new Map((owners || []).map((row) => {
    const p = row.profiles as unknown as { name: string; email: string } | null;
    return [row.org_id, { name: p?.name || '', email: p?.email || '' }];
  }));

  const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, org_id');
  if (teamsErr) throw teamsErr;

  const teamOrgById = new Map((teams || []).map((t) => [t.id, t.org_id]));
  const teamCountByOrg = new Map<string, number>();
  (teams || []).forEach((t) => teamCountByOrg.set(t.org_id, (teamCountByOrg.get(t.org_id) || 0) + 1));

  const teamIds = (teams || []).map((t) => t.id);
  const { data: txs, error: txErr } = teamIds.length
    ? await supabase.from('transactions').select('team_id, amount, date').eq('type', 'sales').in('team_id', teamIds)
    : { data: [], error: null };
  if (txErr) throw txErr;

  // Separate from the sales-only query above (that one intentionally
  // excludes expenses) — CSV import can produce either type, so this just
  // asks "does this org have any CSV-sourced row at all" across both.
  const { data: csvTxs, error: csvTxErr } = teamIds.length
    ? await supabase.from('transactions').select('team_id').eq('source', 'csv').in('team_id', teamIds)
    : { data: [], error: null };
  if (csvTxErr) throw csvTxErr;
  const orgsUsingCsvImport = new Set<string>();
  (csvTxs || []).forEach((tx) => {
    const orgId = teamOrgById.get(tx.team_id);
    if (orgId) orgsUsingCsvImport.add(orgId);
  });

  const salesByOrgMonth = new Map<string, Map<string, number>>();
  (txs || []).forEach((tx) => {
    const orgId = teamOrgById.get(tx.team_id);
    if (!orgId) return;
    const month = tx.date.slice(0, 7);
    const m = salesByOrgMonth.get(orgId) || new Map<string, number>();
    m.set(month, (m.get(month) || 0) + Number(tx.amount));
    salesByOrgMonth.set(orgId, m);
  });

  const nowKey = currentPeriodKey();
  return (orgs || []).map((o) => {
    const teamCount = teamCountByOrg.get(o.id) || 0;
    const monthMap = salesByOrgMonth.get(o.id) || new Map<string, number>();
    const history: AdminMockOrg['history'] = {};
    monthMap.forEach((sales, month) => { history[month] = { teams: teamCount, sales }; });
    if (!history[nowKey]) history[nowKey] = { teams: teamCount, sales: 0 };
    const billedStep = Number(o.billed_step) || 0;
    const owner = ownerByOrg.get(o.id);
    const pricingModel = (o.pricing_model as 'legacy' | 'trial') || 'legacy';
    const orgPricing = effectivePricing(pricingModel, pricing);
    return {
      id: o.id, name: o.name, rep: o.rep, reading: o.reading || '',
      teams: teamCount, monthlySales: history[nowKey].sales,
      plan: billedPlanFor(teamCount, billedStep, orgPricing).label, billedStep, status: o.status as 'active' | 'frozen',
      joinedAt: (o.created_at as string).slice(0, 10), address: o.address, history,
      usesCsvImport: orgsUsingCsvImport.has(o.id),
      signupTemplateId: o.signup_template_id || null,
      ownerName: owner?.name || '', ownerEmail: owner?.email || '',
      pricingModel,
    };
  });
}

function formatAuditTs(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export async function fetchAuditLog(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.from('admin_audit_log').select('ts, text').order('ts', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map((row) => ({ ts: row.ts, label: formatAuditTs(row.ts), text: row.text }));
}

export async function addAuditLog(text: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  await supabase.from('admin_audit_log').insert({ text, created_by: userRes.user?.id });
}

function parsePricingConfig(raw: unknown): PricingConfig {
  const r = (raw as Partial<PricingConfig>) || {};
  return {
    freeTeams: typeof r.freeTeams === 'number' ? r.freeTeams : DEFAULT_PRICING.freeTeams,
    teamsPerStep: typeof r.teamsPerStep === 'number' ? r.teamsPerStep : DEFAULT_PRICING.teamsPerStep,
    pricePerStep: typeof r.pricePerStep === 'number' ? r.pricePerStep : DEFAULT_PRICING.pricePerStep,
  };
}

export async function fetchAppSettings(): Promise<AdminSettingsData> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    logoUrl: data.logo_url,
    billingProvider: data.billing_provider as 'stripe' | 'square',
    billingApiKeys: { stripe: data.billing_api_key_stripe || '', square: data.billing_api_key_square || '' },
    pricingConfig: parsePricingConfig(data.plan_prices),
    settingsTerms: data.terms || '',
    paymentGraceDays: data.payment_grace_days,
  };
}

export async function saveAppSettingsBilling(patch: {
  billingProvider: 'stripe' | 'square';
  billingApiKeys: { stripe: string; square: string };
  pricingConfig: PricingConfig;
  paymentGraceDays: number;
}): Promise<void> {
  const { error } = await supabase.from('app_settings').update({
    billing_provider: patch.billingProvider,
    billing_api_key_stripe: patch.billingApiKeys.stripe,
    billing_api_key_square: patch.billingApiKeys.square,
    plan_prices: patch.pricingConfig,
    payment_grace_days: patch.paymentGraceDays,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

export async function saveAppSettingsTerms(terms: string): Promise<void> {
  const { error } = await supabase.from('app_settings').update({ terms, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw error;
}

export async function fetchPublicTerms(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_public_terms');
  if (error) { console.error('fetchPublicTerms failed', error); return null; }
  return (data as string) || null;
}

export async function fetchPublicAppLogo(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_public_app_logo');
  if (error) { console.error('fetchPublicAppLogo failed', error); return null; }
  return (data as string) || null;
}

export async function fetchPublicPricing(): Promise<PricingConfig> {
  const { data, error } = await supabase.rpc('get_public_pricing');
  if (error) { console.error('fetchPublicPricing failed', error); return DEFAULT_PRICING; }
  return parsePricingConfig(data);
}
