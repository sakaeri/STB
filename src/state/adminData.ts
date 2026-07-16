// Loaders/mutations for the operator/admin dashboard (see
// supabase/migrations/0002_invites_and_admin.sql). Kept separate from
// dataLoader.ts since it queries across every org, gated by profiles.is_admin
// via RLS admin-bypass policies rather than org/team membership.
import { supabase } from '../lib/supabase';
import { planForCount } from '../tokens';
import { currentPeriodKey } from './calc';
import type { AdminMockOrg, AuditLogEntry, PlanPriceOverride } from '../types';

export interface AdminSettingsData {
  logoUrl: string | null;
  billingProvider: 'stripe' | 'square';
  billingApiKeys: { stripe: string; square: string };
  settingsPlanPrices: Record<string, PlanPriceOverride> | null;
  settingsTerms: string;
  paymentGraceDays: number;
}

export async function fetchAdminOrgs(): Promise<AdminMockOrg[]> {
  const { data: orgs, error: orgsErr } = await supabase
    .from('orgs')
    .select('id, name, rep, reading, address, status, created_at')
    .order('created_at', { ascending: true });
  if (orgsErr) throw orgsErr;

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
    return {
      id: o.id, name: o.name, rep: o.rep, reading: o.reading || '',
      teams: teamCount, monthlySales: history[nowKey].sales,
      plan: planForCount(teamCount).name, status: o.status as 'active' | 'frozen',
      joinedAt: (o.created_at as string).slice(0, 10), address: o.address, history,
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
  return (data || []).map((row) => ({ ts: formatAuditTs(row.ts), text: row.text }));
}

export async function addAuditLog(text: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  await supabase.from('admin_audit_log').insert({ text, created_by: userRes.user?.id });
}

export async function fetchAppSettings(): Promise<AdminSettingsData> {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    logoUrl: data.logo_url,
    billingProvider: data.billing_provider as 'stripe' | 'square',
    billingApiKeys: { stripe: data.billing_api_key_stripe || '', square: data.billing_api_key_square || '' },
    settingsPlanPrices: (data.plan_prices as Record<string, PlanPriceOverride>) || null,
    settingsTerms: data.terms || '',
    paymentGraceDays: data.payment_grace_days,
  };
}

export async function saveAppSettingsBilling(patch: {
  billingProvider: 'stripe' | 'square';
  billingApiKeys: { stripe: string; square: string };
  settingsPlanPrices: Record<string, PlanPriceOverride> | null;
  paymentGraceDays: number;
}): Promise<void> {
  const { error } = await supabase.from('app_settings').update({
    billing_provider: patch.billingProvider,
    billing_api_key_stripe: patch.billingApiKeys.stripe,
    billing_api_key_square: patch.billingApiKeys.square,
    plan_prices: patch.settingsPlanPrices || {},
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
