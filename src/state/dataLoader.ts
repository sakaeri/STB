// Fetches & shapes Supabase data into the AppState pieces the UI already
// knows how to render (see types.ts). Kept separate from store.tsx so the
// large amount of query/mapping code doesn't crowd out the action logic.
import { supabase } from '../lib/supabase';
import type {
  Store, Member, HqMember, Transaction, EntryPreset, MemoTopic, TrashItem, CompanyInfo, Defaults, Org,
} from '../types';

export interface LoadedOrgData {
  companyInfo: CompanyInfo;
  defaults: Defaults;
  unitLabel: string | null;
  unitLabelPlural: string | null;
  orgStatus: 'active' | 'frozen';
  hasStripeSubscription: boolean;
  orgBilledStep: number;
  stores: Store[];
  hqMembers: HqMember[];
  members: Member[];
  transactions: Record<string, Transaction[]>;
  entryPresets: Record<string, EntryPreset[]>;
  memoTopics: MemoTopic[];
  trash: TrashItem[];
  confirmedPeriods: Record<string, boolean>;
  logoMap: Record<string, string>;
}

export async function fetchMyOrgs(userId: string): Promise<Org[]> {
  const [orgMembersRes, teamMembersRes] = await Promise.all([
    supabase.from('org_members').select('role, orgs(id, name)').eq('user_id', userId),
    supabase.from('team_members').select('role, teams(org_id)').eq('user_id', userId),
  ]);
  if (orgMembersRes.error) throw orgMembersRes.error;
  if (teamMembersRes.error) throw teamMembersRes.error;

  const byId = new Map<string, Org>();
  (orgMembersRes.data || []).forEach((row) => {
    const r = row as unknown as { role: string; orgs: { id: string; name: string } | { id: string; name: string }[] | null };
    // PostgREST sometimes resolves a to-one embed as a single-element array
    // rather than an object, depending on how it infers the relationship.
    const org = Array.isArray(r.orgs) ? r.orgs[0] : r.orgs;
    if (org) byId.set(org.id, { id: org.id, name: org.name, role: r.role as Org['role'] });
  });

  // team-only members (joined via an invite URL, never added to org_members
  // directly) don't show up above — surface their org too, since they can
  // still access it (see can_access_org in the RLS policies).
  const teamOnlyRows = (teamMembersRes.data || [])
    .map((row) => row as unknown as { role: string; teams: { org_id: string } | null })
    .filter((r) => r.teams && !byId.has(r.teams.org_id));
  if (teamOnlyRows.length) {
    const orgIds = Array.from(new Set(teamOnlyRows.map((r) => r.teams!.org_id)));
    const { data: orgRows, error } = await supabase.from('orgs').select('id, name').in('id', orgIds);
    if (error) throw error;
    const nameById = new Map((orgRows || []).map((o) => [o.id, o.name]));
    teamOnlyRows.forEach((r) => {
      const orgId = r.teams!.org_id;
      if (!byId.has(orgId)) byId.set(orgId, { id: orgId, name: nameById.get(orgId) || '', role: r.role as Org['role'] });
    });
  }

  return Array.from(byId.values());
}

export async function createOrgWithFirstTeam(params: {
  userId: string; userName: string; hqName: string; firstTeamName: string;
  address: string; rep: string; closingDay: string; fiscalStartMonth: number;
}): Promise<string> {
  const { userId, userName, hqName, firstTeamName, address, rep, closingDay, fiscalStartMonth } = params;

  // Generate the org id client-side and skip `.select()` on this insert:
  // right after creating the org there's no org_members row yet, so the
  // "orgs: select if accessible" policy can't see the new row — asking
  // PostgREST to return it (which INSERT...RETURNING requires under RLS)
  // fails with a misleading "violates row-level security policy" error.
  // Knowing the id upfront avoids ever needing to read it back here.
  const orgId = crypto.randomUUID();
  const { error: orgErr } = await supabase
    .from('orgs')
    .insert({ id: orgId, name: hqName, address, rep, closing_day: closingDay, fiscal_start_month: fiscalStartMonth, created_by: userId });
  if (orgErr) throw orgErr;

  const { error: memberErr } = await supabase
    .from('org_members')
    .insert({ org_id: orgId, user_id: userId, role: 'オーナー' });
  if (memberErr) throw memberErr;

  const { error: teamErr } = await supabase
    .from('teams')
    .insert({ org_id: orgId, name: firstTeamName, owner_name: userName });
  if (teamErr) throw teamErr;

  return orgId;
}

export async function fetchOrgData(orgId: string): Promise<LoadedOrgData> {
  // orgs/teams don't depend on each other's results, so fetch them together
  // instead of as two sequential round trips.
  const [orgRes, teamsRes] = await Promise.all([
    supabase.from('orgs').select('*').eq('id', orgId).single(),
    supabase.from('teams').select('*').eq('org_id', orgId).order('created_at', { ascending: true }),
  ]);
  if (orgRes.error || !orgRes.data) throw orgRes.error || new Error('org not found');
  if (teamsRes.error) throw teamsRes.error;
  const orgRow = orgRes.data;
  const teams = teamsRes.data || [];
  const teamIds = teams.map((t) => t.id);
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const [orgMembersRes, teamMembersRes, txRes, presetsRes, topicsRes, trashRes, confirmedRes] = await Promise.all([
    supabase.from('org_members').select('id, user_id, role, profiles(name)').eq('org_id', orgId),
    teamIds.length
      ? supabase.from('team_members').select('id, user_id, team_id, role, profiles(name)').in('team_id', teamIds)
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? supabase.from('transactions').select('*').in('team_id', teamIds).order('date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? supabase.from('entry_presets').select('*').in('team_id', teamIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    // Nested embed pulls topics + their entries + those entries' records in
    // one round trip instead of three sequential ones (each still scoped by
    // its own RLS policy).
    supabase.from('memo_topics').select('*, memo_entries(*, memo_records(*, profiles(name)))').eq('org_id', orgId),
    supabase.from('trash_items').select('*').eq('org_id', orgId).order('deleted_at', { ascending: false }),
    teamIds.length
      ? supabase.from('confirmed_periods').select('*').in('team_id', teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (orgMembersRes.error) throw orgMembersRes.error;
  if (teamMembersRes.error) throw teamMembersRes.error;
  if (txRes.error) throw txRes.error;
  if (presetsRes.error) throw presetsRes.error;
  if (topicsRes.error) throw topicsRes.error;
  if (trashRes.error) throw trashRes.error;
  if (confirmedRes.error) throw confirmedRes.error;

  const topics = topicsRes.data || [];

  const stores: Store[] = teams.map((t) => ({
    id: t.id, name: t.name, owner: t.owner_name, seed: 0, base: 0, expRatio: 0, bg: t.bg_color,
    royaltyRate: Number(t.royalty_rate), useRoyalty: t.use_royalty, royaltyMode: t.royalty_mode as 'rate' | 'amount',
    royaltyAmount: Number(t.royalty_amount), useSavings: t.use_savings, savings: Number(t.savings),
    savingsMode: t.savings_mode as 'amount' | 'rate', savingsRate: Number(t.savings_rate), createdPeriod: t.created_period,
  }));

  const logoMap: Record<string, string> = {};
  teams.forEach((t) => { if (t.logo_url) logoMap[t.id] = t.logo_url; });
  if (orgRow.logo_url) logoMap['app-logo'] = orgRow.logo_url;

  const hqMembers: HqMember[] = (orgMembersRes.data || []).map((row) => {
    const r = row as unknown as { id: string; user_id: string; role: string; profiles: { name: string } | null };
    return { id: r.id, userId: r.user_id, name: r.profiles?.name || '(不明)', role: r.role as HqMember['role'] };
  });

  const members: Member[] = (teamMembersRes.data || []).map((row) => {
    const r = row as unknown as { id: string; user_id: string; role: string; team_id: string; profiles: { name: string } | null };
    return { id: r.id, userId: r.user_id, name: r.profiles?.name || '(不明)', role: r.role as Member['role'], store: teamNameById.get(r.team_id) || '' };
  });

  const transactions: Record<string, Transaction[]> = {};
  (txRes.data || []).forEach((row) => {
    const list = transactions[row.team_id] || (transactions[row.team_id] = []);
    list.push({
      id: row.id, type: row.type, title: row.title, amount: Number(row.amount), date: row.date, photo: row.photo_url,
      createdAt: row.created_at, source: row.source === 'csv' ? 'csv' : 'manual',
    });
  });

  const entryPresets: Record<string, EntryPreset[]> = {};
  (presetsRes.data || []).forEach((row) => {
    const list = entryPresets[row.team_id] || (entryPresets[row.team_id] = []);
    list.push({ id: row.id, type: row.type, title: row.title, amount: Number(row.amount) });
  });

  const memoTopics: MemoTopic[] = topics.map((t) => {
    const row = t as unknown as {
      created_at: string;
      memo_entries?: {
        id: string; name: string; created_at: string;
        memo_records?: { id: string; label: string; text: string; date: string; created_at: string; images: string[] | null; profiles: { name: string } | null }[];
      }[];
    };
    const entries = row.memo_entries || [];
    const lastActivityAt = [
      row.created_at,
      ...entries.map((e) => e.created_at),
      ...entries.flatMap((e) => (e.memo_records || []).map((r) => r.created_at)),
    ].sort().pop();
    return {
      id: t.id, name: t.name, storeId: t.team_id, hqOnly: !!t.hq_only, lastActivityAt,
      entries: entries.map((e) => ({
        id: e.id, name: e.name,
        records: (e.memo_records || []).map((r) => ({
          id: r.id, label: r.label, text: r.text, date: r.date, createdAt: r.created_at,
          images: r.images || [], authorName: r.profiles?.name || null,
        })),
      })),
    };
  });

  const trash: TrashItem[] = (trashRes.data || []).map((row) => ({
    id: row.id, type: row.type as TrashItem['type'], label: row.label, deletedAt: new Date(row.deleted_at).getTime(),
    data: row.data, storeId: row.team_id,
  }));

  const confirmedPeriods: Record<string, boolean> = {};
  (confirmedRes.data || []).forEach((row) => { confirmedPeriods[`${row.team_id}|${row.period}`] = true; });

  return {
    companyInfo: {
      name: orgRow.name, address: orgRow.address, rep: orgRow.rep,
      closingDay: orgRow.closing_day, fiscalStartMonth: orgRow.fiscal_start_month,
      dailyClosingEnabled: !!orgRow.daily_closing_enabled,
    },
    defaults: {
      royaltyRate: Number(orgRow.default_royalty_rate), useRoyalty: orgRow.default_use_royalty,
      royaltyMode: orgRow.default_royalty_mode as 'rate' | 'amount', royaltyAmount: Number(orgRow.default_royalty_amount),
      useSavings: orgRow.default_use_savings, savingsMode: orgRow.default_savings_mode as 'amount' | 'rate',
      savings: Number(orgRow.default_savings), savingsRate: Number(orgRow.default_savings_rate),
    },
    unitLabel: orgRow.unit_label, unitLabelPlural: orgRow.unit_label_plural,
    orgStatus: orgRow.status as 'active' | 'frozen',
    hasStripeSubscription: !!orgRow.stripe_subscription_id,
    orgBilledStep: Number(orgRow.billed_step) || 0,
    stores, hqMembers, members, transactions, entryPresets, memoTopics, trash, confirmedPeriods, logoMap,
  };
}
