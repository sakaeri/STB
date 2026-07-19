import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppState, Store, Transaction, TrashItem, ConfirmDialogState, MemoModalState, Member, HqMember, MemoTopic,
} from '../types';
import { createInitialState } from './mockData';
import { supabase } from '../lib/supabase';
import { fetchMyOrgs, fetchOrgData, createOrgWithFirstTeam } from './dataLoader';
import {
  fetchAdminOrgs, fetchAuditLog, fetchAppSettings, addAuditLog,
  saveAppSettingsBilling, saveAppSettingsTerms, fetchPublicTerms, fetchPublicAppLogo, fetchPublicPricing,
} from './adminData';
import { planForCount, billedPlanFor, type PlanStep } from '../tokens';

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function translateAuthError(err: { message?: string } | null | undefined): string {
  const msg = err?.message || '';
  if (/invalid login credentials/i.test(msg)) return 'メールアドレスまたはパスワードが正しくありません';
  if (/email not confirmed/i.test(msg)) return 'メールアドレスの確認が完了していません。届いた確認メールのリンクを開いてください。';
  if (/already registered|user already exists/i.test(msg)) return 'このメールアドレスは既に使用されています';
  if (/password should be at least/i.test(msg)) return 'パスワードは8文字以上で入力してください';
  if (/new password should be different/i.test(msg)) return '新しいパスワードは、現在のパスワードと違うものにしてください';
  if (/rate limit/i.test(msg)) return 'しばらく時間をおいてから再度お試しください';
  const cooldown = msg.match(/only request this after (\d+) seconds?/i);
  if (cooldown) return `連続で操作しすぎました。${cooldown[1]}秒ほど時間をおいてから再度お試しください`;
  return msg || '不明なエラーが発生しました';
}

async function dataUrlToPublicUrl(path: string, dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (blob.type.split('/')[1] || 'png').split('+')[0];
  const fullPath = `${path}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(fullPath, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  const { data } = supabase.storage.from('logos').getPublicUrl(fullPath);
  return `${data.publicUrl}?t=${Date.now()}`;
}

async function callBillingApi(path: string, orgId: string): Promise<{ url?: string; error?: string }> {
  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes.session?.access_token;
  if (!token) return { error: 'ログインが必要です' };
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orgId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { error: body.error || 'リクエストに失敗しました' };
  return body;
}

function syncStripeQuantity(orgId: string | null) {
  if (!orgId) return;
  callBillingApi('/api/stripe/sync-quantity', orgId).catch((e) => console.error('syncStripeQuantity failed', e));
}

const ACTIVE_ORG_STORAGE_KEY = 'stb_active_org_id';

// Client state (and so activeOrgId) resets to nothing on every full page
// reload, and the org_members query behind fetchMyOrgs has no defined row
// order — so for an account in more than one org, which one ends up
// "active" after a reload was effectively random, without this.
function saveActiveOrgId(orgId: string) {
  try { localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId); } catch { /* noop */ }
}
function loadSavedActiveOrgId(): string | null {
  try { return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY); } catch { return null; }
}

export interface StoreApi {
  state: AppState;
  set: (patch: Patch) => void;
  actions: ReturnType<typeof createActions>;
}

const StoreContext = createContext<StoreApi | null>(null);

function createActions(set: (patch: Patch) => void, getState: () => AppState) {
  const flashTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  const flash = (key: keyof AppState, ms = 1800) => {
    set({ [key]: true } as Patch);
    clearTimeout(flashTimers[key as string]);
    flashTimers[key as string] = setTimeout(() => set({ [key]: false } as Patch), ms);
  };

  const activeTeamCount = () => getState().stores.length;
  const effectivePlan = () => {
    const st = getState();
    return billedPlanFor(activeTeamCount(), st.orgBilledStep, st.pricingConfig);
  };
  // Billing never auto-lowers (see billedPlanFor) — this detects when the
  // live team count would justify a lower step than what's actually billed,
  // so the owner can choose to switch down manually (downgradePlan below).
  const downgradeCandidatePlan = (): PlanStep | null => {
    const st = getState();
    const billed = billedPlanFor(activeTeamCount(), st.orgBilledStep, st.pricingConfig);
    const liveOnly = planForCount(activeTeamCount(), st.pricingConfig);
    return liveOnly.step < billed.step ? liveOnly : null;
  };

  const addTrash = async (type: TrashItem['type'], label: string, data: unknown, storeId?: string | null) => {
    const st = getState();
    if (!st.activeOrgId) return;
    await supabase.from('trash_items').insert({ org_id: st.activeOrgId, team_id: storeId || null, type, label, data: data as never });
  };

  const openConfirm = (label: string, note: string, onConfirm: () => void, actionLabel?: string) => {
    const cd: ConfirmDialogState = { label, note, onConfirm, actionLabel: actionLabel || '削除する' };
    set({ confirmDelete: cd, confirmChecked: false });
  };

  // Team-only members (no org_members row) never have an "hq" view to fall
  // back to — RLS won't even return other teams for them — so default them
  // straight into their own (only) team instead of the HQ rollup.
  function initialViewRole(session: string | null, data: { hqMembers: { userId: string }[]; stores: { id: string }[] }): string {
    if (session && data.hqMembers.some((m) => m.userId === session)) return 'hq';
    return data.stores[0]?.id || 'hq';
  }

  async function reloadActiveOrg() {
    const st = getState();
    if (!st.activeOrgId) return;
    try {
      const data = await fetchOrgData(st.activeOrgId);
      // fetchOrgData's logoMap only covers the active org's own teams/logo —
      // merge rather than replace, so the operator-wide logo (loaded
      // separately, org-independent) doesn't get wiped out on every reload.
      set((s) => ({ ...data, logoMap: { ...s.logoMap, ...data.logoMap } }));
    } catch (e) {
      console.error('reloadActiveOrg failed', e);
    }
  }

  async function loadOrg(orgId: string) {
    try {
      const data = await fetchOrgData(orgId);
      const session = getState().session;
      saveActiveOrgId(orgId);
      set((s) => ({
        activeOrgId: orgId, hqNameOverride: data.companyInfo.name || null,
        viewRole: initialViewRole(session, data), selectedStoreId: null,
        page: 'list', ...data, logoMap: { ...s.logoMap, ...data.logoMap },
      }));
    } catch (e) {
      console.error('loadOrg failed', e);
      set({ authError: '本部データの読み込みに失敗しました' });
    }
  }

  async function loadAdminOverview() {
    try {
      const settings = await fetchAppSettings();
      const [orgs, auditLog] = await Promise.all([fetchAdminOrgs(settings.pricingConfig), fetchAuditLog()]);
      set((s) => ({
        adminMockOrgs: orgs, auditLog,
        billingProvider: settings.billingProvider, billingApiKeys: settings.billingApiKeys,
        pricingConfig: settings.pricingConfig, settingsTerms: settings.settingsTerms,
        paymentGraceDays: settings.paymentGraceDays,
        logoMap: settings.logoUrl ? { ...s.logoMap, 'operator-logo': settings.logoUrl } : s.logoMap,
      }));
    } catch (e) {
      console.error('loadAdminOverview failed', e);
    }
  }

  function clearSessionState() {
    set({
      session: null, accounts: [], activeOrgId: null, hqNameOverride: null,
      stores: [], members: [], hqMembers: [], transactions: {}, memoTopics: [], trash: [],
      companyInfo: { name: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4, dailyClosingEnabled: false },
      confirmedPeriods: {}, page: 'list', selectedStoreId: null,
      authEmail: '', authPassword: '',
    });
  }

  const actions = {
    // ===== computed plan helpers (safe to call during render) =====
    effectivePlan,
    downgradeCandidatePlan,
    activeTeamCount,

    // ===== auth =====
    onAuthEmail: (v: string) => set({ authEmail: v }),
    onAuthPassword: (v: string) => set({ authPassword: v }),
    doLogin: async () => {
      const st = getState();
      const email = (st.authEmail || '').trim();
      const pass = st.authPassword || '';
      if (!email || !pass) { set({ authError: 'メールアドレスとパスワードを入力してください' }); return; }
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) { set({ authError: translateAuthError(error) }); return; }
      set({ authError: '', authPassword: '' });
    },
    goForgot: () => set((s) => ({ authView: 'forgot', authError: '', forgotEmail: s.authEmail || '', resetDone: false })),
    onForgotEmail: (v: string) => set({ forgotEmail: v }),
    doForgotSubmit: async () => {
      const st = getState();
      const email = (st.forgotEmail || '').trim();
      if (!email) { set({ authError: 'メールアドレスを入力してください' }); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) { set({ authError: translateAuthError(error) }); return; }
      set({ authError: '', resetDone: true });
    },
    onResetPassword: (v: string) => set({ resetPassword: v }),
    onResetPasswordConfirm: (v: string) => set({ resetPasswordConfirm: v }),
    doResetPassword: async () => {
      const st = getState();
      const p1 = st.resetPassword || '', p2 = st.resetPasswordConfirm || '';
      if (p1.length < 8) { set({ authError: 'パスワードは8文字以上で入力してください' }); return; }
      if (p1 !== p2) { set({ authError: 'パスワードが一致しません' }); return; }
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) { set({ authError: translateAuthError(error) }); return; }
      set({ authView: 'login', authError: '', resetPassword: '', resetPasswordConfirm: '' });
    },
    doResendVerify: async () => {
      const st = getState();
      const email = st.pendingAccountId || '';
      if (!email) return;
      await supabase.auth.resend({ type: 'signup', email });
      flash('verifyResent', 2400);
    },
    goSignup: () => set({ authView: 'signup', authError: '', signupForm: { name: '', email: '', password: '' } }),
    goLogin: () => set({ authView: 'login', authError: '' }),
    onSignupName: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), name: v } })),
    onSignupEmail: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), email: v } })),
    onSignupPassword: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), password: v } })),
    doSignup: async () => {
      const st = getState();
      const f = st.signupForm;
      if (!f) return;
      if (!f.name.trim() || !f.email.trim() || !f.password.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      if (f.password.length < 8) { set({ authError: 'パスワードは8文字以上で入力してください' }); return; }
      const email = f.email.trim();
      const { data, error } = await supabase.auth.signUp({
        email, password: f.password, options: { data: { name: f.name.trim() } },
      });
      if (error) { set({ authError: translateAuthError(error) }); return; }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        set({ authError: 'このメールアドレスは既に使用されています' }); return;
      }
      set({ pendingAccountId: email, authView: 'verify', authError: '' });
    },
    logout: async () => {
      await supabase.auth.signOut();
      clearSessionState();
    },
    openTermsModal: () => set({ showTermsModal: true }),
    closeTermsModal: () => set({ showTermsModal: false }),
    loadPublicTerms: async () => {
      const terms = await fetchPublicTerms();
      if (terms) set({ termsModalText: terms });
    },
    loadPublicBranding: async () => {
      const logoUrl = await fetchPublicAppLogo();
      if (logoUrl) set((s) => ({ logoMap: { ...s.logoMap, 'operator-logo': logoUrl } }));
    },
    loadPublicPricing: async () => {
      const pricingConfig = await fetchPublicPricing();
      set({ pricingConfig });
    },

    // ===== HQ setup =====
    onHqSetupField: (key: keyof AppState['hqSetupForm'], val: string | number) => set((s) => ({ hqSetupForm: { ...s.hqSetupForm, [key]: val } })),
    goHqSetupOptionalStep: () => {
      const f = getState().hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      set({ hqSetupStep: 'optional', authError: '' });
    },
    backHqSetupBasicStep: () => set({ hqSetupStep: 'basic' }),
    doCreateHq: async () => {
      const st = getState();
      const f = st.hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      if (!st.session) return;
      try {
        const orgId = await createOrgWithFirstTeam({
          userId: st.session, userName: st.ownerProfile.name, hqName: f.hqName.trim(), firstTeamName: f.firstTeamName.trim(),
          address: (f.address || '').trim(), rep: (f.rep || '').trim(), closingDay: f.closingDay || 'eom', fiscalStartMonth: f.fiscalStartMonth || 4,
        });
        const myOrgs = await fetchMyOrgs(st.session);
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, hqCreated: true, orgs: myOrgs } : a)) }));
        await loadOrg(orgId);
        set({
          authError: '', adminOwnHqSetup: false,
          hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic',
        });
      } catch (e) {
        set({ authError: (e as Error).message || '本部の作成に失敗しました' });
      }
    },

    // ===== multi-org =====
    switchOrg: async (id: string) => {
      if (id === getState().activeOrgId) { set({ showProfileModal: false }); return; }
      await loadOrg(id);
      set({ showProfileModal: false });
    },
    openNewOrg: () => set({ showNewOrgModal: true, showProfileModal: false, hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic', authError: '' }),
    closeNewOrg: () => set({ showNewOrgModal: false }),
    createNewOrg: async () => {
      const st = getState();
      const f = st.hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      if (!st.session) return;
      try {
        const orgId = await createOrgWithFirstTeam({
          userId: st.session, userName: st.ownerProfile.name, hqName: f.hqName.trim(), firstTeamName: f.firstTeamName.trim(),
          address: (f.address || '').trim(), rep: (f.rep || '').trim(), closingDay: f.closingDay || 'eom', fiscalStartMonth: f.fiscalStartMonth || 4,
        });
        const myOrgs = await fetchMyOrgs(st.session);
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, hqCreated: true, orgs: myOrgs } : a)) }));
        await loadOrg(orgId);
        set({
          showNewOrgModal: false, authError: '',
          hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic',
        });
      } catch (e) {
        set({ authError: (e as Error).message || '本部の作成に失敗しました' });
      }
    },

    // ===== profile =====
    openProfileModal: () => set((s) => ({ showProfileModal: true, profileEditing: false, profileDraft: s.ownerProfile })),
    closeProfileModal: () => set({ showProfileModal: false }),
    // Email and password both start blank — like password, leaving email
    // empty means "keep as-is"; this also stops browsers autofilling the
    // saved password into what's meant to be a fresh "new password" field.
    openProfileEdit: () => set((s) => ({ profileEditing: true, profileDraft: { ...s.ownerProfile, email: '', password: '' }, profileSaved: false, profileError: '' })),
    cancelProfileEdit: () => set({ profileEditing: false }),
    onOwnerProfileName: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), name: v } })),
    onOwnerProfileEmail: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), email: v } })),
    onOwnerProfilePassword: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), password: v } })),
    saveOwnerProfile: async () => {
      const st = getState();
      const d = st.profileDraft;
      if (!d || !st.session) return;
      if (d.password && d.password.length > 0 && d.password.length < 6) { set({ profileError: 'パスワードは6文字以上で入力してください' }); return; }
      const name = d.name.trim();
      const nameChanged = name !== st.ownerProfile.name;
      const newEmail = d.email.trim();
      const emailChanged = !!newEmail;
      const passwordChanged = !!d.password;

      if (nameChanged) {
        const { error } = await supabase.from('profiles').update({ name }).eq('id', st.session);
        if (error) { set({ profileError: translateAuthError(error) }); return; }
      }
      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) { set({ profileError: translateAuthError(error) }); return; }
        set((s) => ({ emailChangeStep: 'code', profileEditing: false, profileError: '', ownerProfile: { ...s.ownerProfile, name } }));
        return;
      }
      if (passwordChanged) {
        const { error } = await supabase.auth.updateUser({ password: d.password });
        if (error) { set({ profileError: translateAuthError(error) }); return; }
      }
      set((s) => ({ ownerProfile: { ...s.ownerProfile, name }, profileEditing: false }));
      flash('profileSaved');
    },
    confirmEmailChange: () => set({ emailChangeStep: null }),
    cancelEmailChange: () => set({ emailChangeStep: null, profileEditing: false }),

    // ===== unit label =====
    setUnitLabels: (unit: string, plural: string) => set({ unitLabel: unit, unitLabelPlural: plural }),
    openUnitLabelEdit: () => set({ editingUnitLabel: true }),
    closeUnitLabelEdit: async () => {
      const st = getState();
      set({ editingUnitLabel: false });
      if (st.activeOrgId) {
        await supabase.from('orgs').update({ unit_label: st.unitLabel, unit_label_plural: st.unitLabelPlural }).eq('id', st.activeOrgId);
      }
    },

    // ===== company info =====
    openCompanyInfoEdit: () => set({ editingCompanyInfo: true }),
    closeCompanyInfoEdit: async () => {
      const st = getState();
      if (!(st.companyInfo.name || '').trim()) { set({ companyNameError: true }); return; }
      set({ editingCompanyInfo: false, companyNameError: false });
      if (st.activeOrgId) {
        const c = st.companyInfo;
        await supabase.from('orgs').update({
          name: c.name, address: c.address, rep: c.rep, closing_day: c.closingDay, fiscal_start_month: c.fiscalStartMonth,
          daily_closing_enabled: c.dailyClosingEnabled,
        }).eq('id', st.activeOrgId);
        set({ hqNameOverride: c.name });
      }
    },
    onCompanyName: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, name: v }, companyNameError: false })),
    onCompanyAddress: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, address: v } })),
    onCompanyRep: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, rep: v } })),
    onCompanyClosingDay: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, closingDay: v } })),
    onCompanyDailyClosingEnabled: (v: boolean) => set((s) => ({ companyInfo: { ...s.companyInfo, dailyClosingEnabled: v } })),
    onCompanyFiscalStartMonth: (v: number) => set((s) => ({ companyInfo: { ...s.companyInfo, fiscalStartMonth: v } })),

    // ===== hq defaults =====
    openHqDefaultsEdit: () => set({ editingHqDefaults: true }),
    closeHqDefaultsEdit: async () => {
      const st = getState();
      set({ editingHqDefaults: false });
      if (st.activeOrgId) {
        const d = st.defaults;
        await supabase.from('orgs').update({
          default_use_royalty: d.useRoyalty !== false, default_royalty_mode: d.royaltyMode || 'rate',
          default_royalty_rate: d.royaltyRate, default_royalty_amount: d.royaltyAmount || 0,
          default_use_savings: d.useSavings, default_savings_mode: d.savingsMode || 'amount',
          default_savings: d.savings, default_savings_rate: d.savingsRate || 0,
        }).eq('id', st.activeOrgId);
      }
    },
    setDefaults: (patch: Partial<AppState['defaults']>) => set((s) => ({ defaults: { ...s.defaults, ...patch } })),

    // ===== stores/teams =====
    updateStore: (id: string, patch: Partial<Store>) => {
      set((s) => ({ stores: s.stores.map((st) => (st.id === id ? { ...st, ...patch } : st)) }));
      const dbPatch: Record<string, unknown> = {};
      if (patch.name !== undefined) dbPatch.name = patch.name;
      if (patch.royaltyRate !== undefined) dbPatch.royalty_rate = patch.royaltyRate;
      if (patch.useRoyalty !== undefined) dbPatch.use_royalty = patch.useRoyalty;
      if (patch.royaltyMode !== undefined) dbPatch.royalty_mode = patch.royaltyMode;
      if (patch.royaltyAmount !== undefined) dbPatch.royalty_amount = patch.royaltyAmount;
      if (patch.useSavings !== undefined) dbPatch.use_savings = patch.useSavings;
      if (patch.savings !== undefined) dbPatch.savings = patch.savings;
      if (patch.savingsMode !== undefined) dbPatch.savings_mode = patch.savingsMode;
      if (patch.savingsRate !== undefined) dbPatch.savings_rate = patch.savingsRate;
      if (Object.keys(dbPatch).length) {
        supabase.from('teams').update(dbPatch).eq('id', id).then(({ error }) => { if (error) console.error('updateStore persist failed', error); });
      }
    },
    openAdd: () => {
      const d = getState().defaults;
      set({ showAdd: true, addStep: 'form', copied: false, addForm: { name: '', royaltyRate: d.royaltyRate, useRoyalty: d.useRoyalty, royaltyMode: d.royaltyMode, royaltyAmount: d.royaltyAmount, useSavings: d.useSavings, savings: d.savings, savingsMode: d.savingsMode, savingsRate: d.savingsRate } });
    },
    closeAdd: () => set({ showAdd: false }),
    setAddForm: (patch: Partial<NonNullable<AppState['addForm']>>) => set((s) => ({ addForm: s.addForm ? { ...s.addForm, ...patch } : s.addForm })),
    createStore: () => {
      const st = getState();
      const f = st.addForm;
      if (!f || !f.name.trim()) return;
      const currentPlan = billedPlanFor(st.stores.length, st.orgBilledStep, st.pricingConfig);
      const nextPlan = billedPlanFor(st.stores.length + 1, st.orgBilledStep, st.pricingConfig);
      if (nextPlan.price !== currentPlan.price) { set({ pendingUpgrade: { fromPlan: currentPlan, toPlan: nextPlan } }); return; }
      actuallyCreateStore();
    },
    // The very first step into paid territory needs a real Stripe Checkout
    // (no subscription exists yet); every later step-up just updates the
    // quantity on the subscription that's already running.
    confirmUpgradeAndCreate: () => {
      const st = getState();
      const needsCheckout = !st.hasStripeSubscription && !!st.pendingUpgrade && st.pendingUpgrade.toPlan.price > 0;
      set({ pendingUpgrade: null });
      actuallyCreateStore(needsCheckout);
    },
    cancelUpgrade: () => set({ pendingUpgrade: null }),
    copyInvite: () => { flash('copied', 1600); },
    copyMemberInvite: () => { flash('memberInviteCopied', 1600); },
    closeMemberInvite: () => set({ showMemberInvite: false }),
    inviteMember: async (storeName: string, teamId: string) => {
      const { data, error } = await supabase.rpc('create_invite', { p_team_id: teamId, p_role: '閲覧者' });
      if (error) { alert(error.message || '招待URLの発行に失敗しました'); return; }
      set({ showMemberInvite: true, memberInviteToken: data as string, memberInviteStoreName: storeName, memberInviteCopied: false });
    },
    inviteHqMember: async (hqName: string) => {
      const st = getState();
      if (!st.activeOrgId) return;
      const { data, error } = await supabase.rpc('create_org_invite', { p_org_id: st.activeOrgId, p_role: '閲覧者' });
      if (error) { alert(error.message || '招待URLの発行に失敗しました'); return; }
      set({ showMemberInvite: true, memberInviteToken: data as string, memberInviteStoreName: hqName, memberInviteCopied: false });
    },

    toggleTeamSettingsEdit: (canEdit: boolean) => {
      if (!canEdit) return;
      set((s) => {
        if (!s.editingTeamSettings) {
          const store = s.stores.find((x) => x.id === s.selectedStoreId);
          return { editingTeamSettings: true, teamNameError: false, teamNameSnapshot: store ? store.name : '' };
        }
        const store = s.stores.find((x) => x.id === s.selectedStoreId);
        if (store && !store.name?.trim()) {
          return { editingTeamSettings: false, teamNameError: false, stores: s.stores.map((x) => (x.id === s.selectedStoreId ? { ...x, name: s.teamNameSnapshot } : x)) };
        }
        return { editingTeamSettings: false, teamNameError: false };
      });
    },
    openStoreDrawer: (id: string) => set({ selectedStoreId: id, editingTeamSettings: false }),
    closeStoreDrawer: () => set({ selectedStoreId: null, editingTeamSettings: false }),
    openLogoEditor: () => set({ showLogoEditor: true }),
    closeLogoEditor: () => set({ showLogoEditor: false }),
    setLogo: (id: string, dataUrl: string) => {
      set((s) => ({ logoMap: { ...s.logoMap, [id]: dataUrl } }));
      const st = getState();
      const isTeam = st.stores.some((s2) => s2.id === id);
      const path = `${id}-${Date.now()}`;
      dataUrlToPublicUrl(path, dataUrl).then(async (publicUrl) => {
        set((s) => ({ logoMap: { ...s.logoMap, [id]: publicUrl } }));
        if (isTeam) {
          await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', id);
        } else if (id === 'operator-logo') {
          await supabase.from('app_settings').update({ logo_url: publicUrl }).eq('id', 1);
        } else if (id === 'app-logo' && st.activeOrgId) {
          await supabase.from('orgs').update({ logo_url: publicUrl }).eq('id', st.activeOrgId);
        }
      }).catch((e) => console.error('logo upload failed', e));
    },

    requestDeleteTeam: (store: Store) => openConfirm(`「${store.name}」を削除`, `${store.name}をゴミ箱に移動します。30日間はゴミ箱から復元できますが、31日目以降は自動的に完全削除されます。`, () => deleteTeam(store)),

    // ===== transactions =====
    defaultDateForMonth: (m: number) => {
      const st = getState();
      const mi = ((m % 12) + 12) % 12;
      const yr = st.year || 2026;
      const today = new Date();
      if (today.getFullYear() === yr && today.getMonth() === mi) return today.toISOString().slice(0, 10);
      return `${yr}-${String(mi + 1).padStart(2, '0')}-01`;
    },
    openEntry: (type: 'sales' | 'expense') => {
      const st = getState();
      const isHq = st.viewRole === 'hq';
      const storeId = isHq ? st.stores[0]?.id : st.viewRole;
      if (!storeId) return;
      set({ showEntry: true, entryDraft: { type, storeId, date: actions_defaultDateForMonth(st, st.month), title: '', amount: '', photo: null } });
    },
    closeEntry: () => set({ showEntry: false, entryDraft: null }),
    onEntryStoreId: (v: string) => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, storeId: v } : s.entryDraft })),
    onEntryDate: (v: string) => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, date: v } : s.entryDraft })),
    onEntryTitle: (v: string) => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, title: v } : s.entryDraft })),
    onEntryAmount: (v: string) => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, amount: v } : s.entryDraft })),
    onEntryPhoto: (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, photo: reader.result as string } : s.entryDraft }));
      reader.readAsDataURL(file);
    },
    onRemovePhoto: () => set((s) => ({ entryDraft: s.entryDraft ? { ...s.entryDraft, photo: null } : s.entryDraft })),
    saveEntry: async () => {
      const st = getState();
      const d = st.entryDraft;
      if (!d || !st.session) return;
      const amount = Math.max(0, parseInt(d.amount, 10) || 0);
      if (!amount) return;
      set({ showEntry: false, entryDraft: null });
      const { error } = await supabase.from('transactions').insert({
        team_id: d.storeId, type: d.type, title: d.title.trim() || (d.type === 'sales' ? '売上' : '経費'),
        amount, date: d.date, photo_url: d.photo || null, created_by: st.session,
      });
      if (error) { console.error('saveEntry failed', error); return; }
      await reloadActiveOrg();
    },
    deleteTx: async (storeId: string, id: string) => {
      set((s) => ({ transactions: { ...s.transactions, [storeId]: (s.transactions[storeId] || []).filter((t) => t.id !== id) } }));
      await supabase.from('transactions').delete().eq('id', id);
    },
    requestDeleteTx: (storeId: string, tx: { id: string; title: string; amount: number; date: string }) => {
      openConfirm(`「${tx.title}」を削除`, `この記録をゴミ箱に移動します。金額：¥${Math.round(tx.amount).toLocaleString('ja-JP')}（${tx.date}）。`, async () => {
        await addTrash('tx', tx.title, { storeId, tx }, storeId);
        await actions.deleteTx(storeId, tx.id);
        await reloadActiveOrg();
      });
    },
    openTxDetail: (detail: unknown) => set({ txDetail: detail }),
    closeTxDetail: () => set({ txDetail: null }),
    exportCsv: () => { /* implemented per-screen using calc.periodData + state, triggered from Sales List component */ },

    // ===== memo =====
    memoBack0: () => set({ memoNav: { topicId: null, entryId: null } }),
    memoBack1: () => set((s) => ({ memoNav: { topicId: s.memoNav.topicId, entryId: null } })),
    openMemoTopic: (topicId: string) => set({ memoNav: { topicId, entryId: null } }),
    openMemoEntry: (entryId: string) => set((s) => ({ memoNav: { ...s.memoNav, entryId } })),
    openAddTopic: (defaultStoreId: string | null) => set({ memoModal: { kind: 'topic', name: '', storeId: defaultStoreId } }),
    openAddEntry: (topicId: string | null) => set({ memoModal: { kind: 'entry', topicId, name: '' } }),
    openAddRecord: (topicId: string | null, entryId: string | null) => set({ memoModal: { kind: 'record', topicId, entryId, label: '', text: '', date: new Date().toISOString().slice(0, 10) } }),
    closeMemoModal: () => set({ memoModal: null }),
    // v is a team id, '' (全体 — shared with HQ + every team), or 'hq'
    // (本部のみ — HQ members only, hidden from every team). Both '' and
    // 'hq' store as storeId: null; hqOnly is what tells them apart.
    onMemoModalScope: (v: string) => set((s) => ({
      memoModal: { ...(s.memoModal as MemoModalState), storeId: v === '' || v === 'hq' ? null : v, hqOnly: v === 'hq' },
    })),
    onMemoModalName: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), name: v } })),
    onMemoModalLabel: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), label: v } })),
    onMemoModalText: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), text: v } })),
    onMemoModalDate: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), date: v } })),
    saveMemoModal: async () => {
      const st = getState();
      const m = st.memoModal;
      if (!m || !st.activeOrgId || !st.session) return;
      if (m.kind === 'topic') {
        const name = (m.name || '').trim();
        if (!name) return;
        set({ memoModal: null });
        const { error } = await supabase.from('memo_topics').insert({ org_id: st.activeOrgId, team_id: m.storeId || null, hq_only: !!m.hqOnly, name, created_by: st.session });
        if (error) { console.error(error); return; }
        await reloadActiveOrg();
      } else if (m.kind === 'entry') {
        const name = (m.name || '').trim();
        if (!name || !m.topicId) return;
        set({ memoModal: null });
        const { error } = await supabase.from('memo_entries').insert({ topic_id: m.topicId, name });
        if (error) { console.error(error); return; }
        await reloadActiveOrg();
      } else if (m.kind === 'record') {
        const label = (m.label || '').trim(); const text = (m.text || '').trim();
        if (!label || !text || !m.entryId) return;
        set({ memoModal: null });
        const { error } = await supabase.from('memo_records').insert({ entry_id: m.entryId, label, text, date: m.date! });
        if (error) { console.error(error); return; }
        await reloadActiveOrg();
      }
    },
    // Any scope change is possible after the fact, not a one-way "share
    // company-wide" promotion — e.g. undoing an accidental 全体共有 back
    // down to a single team. v is a team id, '' (全体), or 'hq' (本部の
    // み), matching onMemoModalScope's encoding.
    changeMemoTopicScope: (topic: MemoTopic, v: string) => {
      const apply = async () => {
        const patch = v === '' ? { team_id: null, hq_only: false } : v === 'hq' ? { team_id: null, hq_only: true } : { team_id: v, hq_only: false };
        await supabase.from('memo_topics').update(patch).eq('id', topic.id);
        await reloadActiveOrg();
      };
      const wasAlreadyShared = !topic.storeId && !topic.hqOnly;
      if (v === '' && !wasAlreadyShared) {
        openConfirm(`「${topic.name}」を全体共有にする`, 'この項目を全チーム共通に変更します。他のすべてのチームから閲覧できるようになります。共有すべきでない情報が含まれていないか確認してください。', apply, '共有する');
      } else {
        apply();
      }
    },
    requestDeleteMemoTopic: (topic: { id: string; name: string; storeId?: string | null }) => {
      openConfirm(`「${topic.name}」を削除`, `項目「${topic.name}」とその中の詳細・記録をすべてゴミ箱に移動します。`, async () => {
        await addTrash('memoTopic', topic.name, topic, topic.storeId || null);
        set((s) => ({ memoNav: s.memoNav.topicId === topic.id ? { topicId: null, entryId: null } : s.memoNav }));
        await supabase.from('memo_topics').delete().eq('id', topic.id);
        await reloadActiveOrg();
      });
    },
    requestDeleteMemoEntry: (topicId: string, entry: { id: string; name: string }) => {
      openConfirm(`「${entry.name}」を削除`, `詳細「${entry.name}」とその記録をすべてゴミ箱に移動します。`, async () => {
        const st = getState();
        const t = st.memoTopics.find((x) => x.id === topicId);
        await addTrash('memoEntry', entry.name, { topicId, entry }, t ? t.storeId || null : null);
        set((s) => ({ memoNav: s.memoNav.entryId === entry.id ? { ...s.memoNav, entryId: null } : s.memoNav }));
        await supabase.from('memo_entries').delete().eq('id', entry.id);
        await reloadActiveOrg();
      });
    },
    requestDeleteMemoRecord: (topicId: string, entryId: string, rec: { id: string; label: string }) => {
      openConfirm(`「${rec.label}」を削除`, `記録「${rec.label}」をゴミ箱に移動します。`, async () => {
        const st = getState();
        const t = st.memoTopics.find((x) => x.id === topicId);
        await addTrash('memoRecord', rec.label, { topicId, entryId, record: rec }, t ? t.storeId || null : null);
        await supabase.from('memo_records').delete().eq('id', rec.id);
        await reloadActiveOrg();
      });
    },

    // ===== members =====
    setMemberRole: async (member: Member, role: Member['role']) => {
      set((s) => ({ members: s.members.map((m) => (m.id === member.id ? { ...m, role } : m)) }));
      await supabase.from('team_members').update({ role }).eq('id', member.id);
    },
    setHqMemberRole: async (member: HqMember, role: HqMember['role']) => {
      set((s) => ({ hqMembers: s.hqMembers.map((m) => (m.id === member.id ? { ...m, role } : m)) }));
      await supabase.from('org_members').update({ role }).eq('id', member.id);
    },
    requestDeleteMember: (idx: number) => {
      const st = getState();
      const m = st.members[idx];
      const storeManagerCount = st.members.filter((x) => x.store === m.store && x.role === '管理者').length;
      if (m.role === '管理者' && storeManagerCount <= 1) { alert(`${m.store}には管理者が最低1人必要です。他のメンバーを管理者にしてから削除してください。`); return; }
      openConfirm(`「${m.name}」を削除`, `${m.name}様をこのチームから削除し、ゴミ箱に移動します。`, async () => {
        const s2 = getState();
        const mm = s2.members[idx];
        const st2 = s2.stores.find((x) => x.name === mm.store);
        await addTrash('member', mm.name, mm, st2 ? st2.id : null);
        set((s) => ({ members: s.members.filter((_, i) => i !== idx) }));
        await supabase.from('team_members').delete().eq('id', mm.id);
      });
    },
    requestDeleteHqMember: (idx: number) => {
      const st = getState();
      const m = st.hqMembers[idx];
      if (m.role === 'オーナー' && st.hqMembers.filter((x) => x.role === 'オーナー').length <= 1) { alert('オーナーは最低1人必要です。他のメンバーをオーナーにしてから削除してください。'); return; }
      openConfirm(`「${m.name}」を削除`, `${m.name}様を本部メンバーから削除し、ゴミ箱に移動します。`, async () => {
        const s2 = getState();
        await addTrash('hqMember', s2.hqMembers[idx].name, s2.hqMembers[idx]);
        set((s) => ({ hqMembers: s.hqMembers.filter((_, i) => i !== idx) }));
        await supabase.from('org_members').delete().eq('id', m.id);
      });
    },

    // ===== trash / confirm =====
    closeConfirm: () => set({ confirmDelete: null, confirmChecked: false }),
    toggleConfirmChecked: () => set((s) => ({ confirmChecked: !s.confirmChecked })),
    runConfirm: () => {
      const st = getState();
      const cd = st.confirmDelete;
      if (!cd || !st.confirmChecked) return;
      cd.onConfirm();
      set({ confirmDelete: null, confirmChecked: false });
    },
    restoreTrashItem: async (item: TrashItem) => {
      if (item.type === 'team') {
        const raw = item.data as { store: Store; transactions: Transaction[]; memoTopics: AppState['memoTopics']; members: Member[] } | Store;
        // Trash entries created before this bundling existed only ever
        // held the store's own settings, not its data.
        const store = 'store' in raw ? raw.store : raw;
        const txList = 'transactions' in raw ? raw.transactions : [];
        const topics = 'memoTopics' in raw ? raw.memoTopics : [];
        const members = 'members' in raw ? raw.members : [];
        const { data: newTeam, error } = await supabase.from('teams').insert({
          org_id: getState().activeOrgId!, name: store.name, owner_name: store.owner, bg_color: store.bg,
          use_royalty: store.useRoyalty !== false, royalty_mode: store.royaltyMode || 'rate', royalty_rate: store.royaltyRate,
          royalty_amount: store.royaltyAmount || 0, use_savings: !!store.useSavings, savings_mode: store.savingsMode || 'amount',
          savings: store.savings || 0, savings_rate: store.savingsRate || 0,
        }).select('id').single();
        if (error || !newTeam) { alert('店舗の復元に失敗しました'); return; }
        if (txList.length) {
          await supabase.from('transactions').insert(
            txList.map((t) => ({ team_id: newTeam.id, type: t.type, title: t.title, amount: t.amount, date: t.date, photo_url: t.photo || null })),
          );
        }
        if (members.length) {
          await supabase.from('team_members').insert(
            members.map((m) => ({ team_id: newTeam.id, user_id: m.userId, role: m.role })),
          );
        }
        for (const topic of topics) {
          const { data: newTopic } = await supabase.from('memo_topics').insert({ org_id: getState().activeOrgId!, team_id: newTeam.id, name: topic.name }).select('id').single();
          if (!newTopic) continue;
          for (const entry of topic.entries) {
            const { data: newEntry } = await supabase.from('memo_entries').insert({ topic_id: newTopic.id, name: entry.name }).select('id').single();
            if (!newEntry || !entry.records.length) continue;
            await supabase.from('memo_records').insert(
              entry.records.map((r) => ({ entry_id: newEntry.id, label: r.label, text: r.text, date: r.date })),
            );
          }
        }
        // Other still-pending trash items (e.g. a transaction deleted
        // *before* the team itself was) still reference the old team id,
        // which no longer exists — repoint them at the newly recreated
        // team so restoring them doesn't keep failing with "this team's
        // been deleted" now that it's back.
        const oldTeamId = store.id;
        if (oldTeamId) {
          const { data: dangling } = await supabase.from('trash_items').select('id, type, data').eq('team_id', oldTeamId).neq('id', item.id);
          for (const dItem of dangling || []) {
            const patch: { team_id: string; data?: unknown } = { team_id: newTeam.id };
            if ((dItem.type === 'tx' || dItem.type === 'memoTopic') && dItem.data && typeof dItem.data === 'object') {
              patch.data = { ...(dItem.data as object), storeId: newTeam.id };
            }
            await supabase.from('trash_items').update(patch).eq('id', dItem.id);
          }
        }
      } else if (item.type === 'tx') {
        const d = item.data as { storeId: string; tx: AppState['transactions'][string][number] };
        if (!getState().stores.some((s) => s.id === d.storeId)) {
          alert('この取引の店舗はすでに削除されているため復元できません。');
          return;
        }
        await supabase.from('transactions').insert({ team_id: d.storeId, type: d.tx.type, title: d.tx.title, amount: d.tx.amount, date: d.tx.date, photo_url: d.tx.photo || null });
      } else if (item.type === 'memoTopic') {
        const t = item.data as AppState['memoTopics'][number];
        if (t.storeId && !getState().stores.some((s) => s.id === t.storeId)) {
          alert('このメモの店舗はすでに削除されているため復元できません。');
          return;
        }
        await supabase.from('memo_topics').insert({ org_id: getState().activeOrgId!, team_id: t.storeId || null, hq_only: !!t.hqOnly, name: t.name });
      } else if (item.type === 'memoEntry') {
        const d = item.data as { topicId: string; entry: AppState['memoTopics'][number]['entries'][number] };
        await supabase.from('memo_entries').insert({ topic_id: d.topicId, name: d.entry.name });
      } else if (item.type === 'memoRecord') {
        const d = item.data as { topicId: string; entryId: string; record: AppState['memoTopics'][number]['entries'][number]['records'][number] };
        await supabase.from('memo_records').insert({ entry_id: d.entryId, label: d.record.label, text: d.record.text, date: d.record.date });
      }
      // member/hqMember restoration needs a real account to re-link (email-based); not supported from trash data alone.
      await supabase.from('trash_items').delete().eq('id', item.id);
      await reloadActiveOrg();
    },
    requestPermanentDelete: (item: TrashItem) => {
      openConfirm(`「${item.label}」を完全に削除`, 'この操作は取り消せません。ゴミ箱からも完全に削除されます。', async () => {
        await supabase.from('trash_items').delete().eq('id', item.id);
        await reloadActiveOrg();
      });
    },
    requestDeleteHq: () => {
      const st = getState();
      if (st.stores.length > 0) return;
      const acc = st.accounts.find((x) => x.id === st.session);
      const org = acc && (acc.orgs || []).find((o) => o.id === st.activeOrgId);
      const name = (org && org.name) || st.hqNameOverride || st.brandName || '本部';
      openConfirm(`「${name}」を削除`, 'この本部のすべてのデータ（メンバー・設定）が完全に削除されます。この操作は取り消せません。', () => deleteHq(), '本部を削除する');
    },

    // ===== plan =====
    confirmDowngrade: () => {
      const cand = downgradeCandidatePlan();
      if (!cand) return;
      openConfirm(
        'プランを変更',
        `次回の更新分から ${cand.label} になります。今すぐ変更しますか？`,
        () => actions.downgradePlan(),
        '変更する',
      );
    },
    downgradePlan: async () => {
      const st = getState();
      if (!st.activeOrgId) return;
      const { error } = await callBillingApi('/api/stripe/downgrade-plan', st.activeOrgId);
      if (error) { alert(error); return; }
      await reloadActiveOrg();
    },
    dismissDowngrade: () => { /* no-op */ },

    // ===== billing (Stripe) =====
    startCheckout: async () => {
      const st = getState();
      if (!st.activeOrgId) return;
      set({ billingCheckoutLoading: true });
      const { url, error } = await callBillingApi('/api/stripe/create-checkout-session', st.activeOrgId);
      set({ billingCheckoutLoading: false });
      if (error || !url) { alert(error || 'お支払い手続きの開始に失敗しました'); return; }
      window.location.href = url;
    },

    // ===== navigation =====
    goList: () => set({ page: 'list' }),
    goMemo: () => set({ page: 'memo' }),
    goSettings: () => set({ page: 'settings' }),
    setLayout: (v: AppState['layout']) => set({ layout: v }),
    setAggUnit: (v: AppState['aggUnit']) => set({ aggUnit: v }),
    toggleCloseBanner: () => set((s) => ({ closeBannerOpen: !s.closeBannerOpen })),
    toggleDailyCloseBanner: () => set((s) => ({ dailyCloseBannerOpen: !s.dailyCloseBannerOpen })),
    confirmPeriod: async (storeId: string, period: string) => {
      set((s) => ({ confirmedPeriods: { ...s.confirmedPeriods, [`${storeId}|${period}`]: true } }));
      const st = getState();
      const { error } = await supabase.from('confirmed_periods').upsert({ team_id: storeId, period, confirmed_by: st.session });
      if (error) console.error('confirmPeriod failed', error);
    },
    requestConfirmPeriod: (storeId: string, period: string, periodLabel: string) => {
      const st = getState();
      const tx = st.transactions[storeId] || [];
      const isDay = period.length === 10;
      const matching = tx.filter((t) => (isDay ? t.date === period : t.date.slice(0, 7) === period));
      const salesCount = matching.filter((t) => t.type === 'sales').length;
      const expenseCount = matching.filter((t) => t.type === 'expense').length;
      openConfirm(
        `${periodLabel}を確定`,
        `売上${salesCount}件、経費${expenseCount}件で確定します。確定後も編集・削除は可能ですが、この一覧では確定済みとして扱われます。`,
        () => actions.confirmPeriod(storeId, period),
        '確定する',
      );
    },
    prevPeriodMonth: () => set((s) => { const m = s.month - 1; return m < 0 ? { month: 11, year: (s.year || 2026) - 1 } : { month: m }; }),
    nextPeriodMonth: () => set((s) => { const m = s.month + 1; return m > 11 ? { month: 0, year: (s.year || 2026) + 1 } : { month: m }; }),
    prevPeriodWeek: () => set((s) => ({ periodDate: (function () { const d = new Date(s.periodDate + 'T00:00:00'); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })() })),
    nextPeriodWeek: () => set((s) => ({ periodDate: (function () { const d = new Date(s.periodDate + 'T00:00:00'); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })() })),
    prevPeriodDay: () => set((s) => ({ periodDate: (function () { const d = new Date(s.periodDate + 'T00:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })() })),
    nextPeriodDay: () => set((s) => ({ periodDate: (function () { const d = new Date(s.periodDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })() })),
    prevPeriodYear: () => set((s) => ({ year: (s.year || 2026) - 1 })),
    nextPeriodYear: () => set((s) => ({ year: (s.year || 2026) + 1 })),
    // Unified period nav: branches on state.aggUnit, matching the prototype's
    // single prevPeriod()/nextPeriod() header buttons.
    prevPeriod: () => {
      const st = getState();
      if (st.aggUnit === 'year') { actions.prevPeriodYear(); return; }
      if (st.aggUnit === 'week') { actions.prevPeriodWeek(); return; }
      if (st.aggUnit === 'day') { actions.prevPeriodDay(); return; }
      actions.prevPeriodMonth();
    },
    nextPeriod: () => {
      const st = getState();
      if (st.aggUnit === 'year') { actions.nextPeriodYear(); return; }
      if (st.aggUnit === 'week') { actions.nextPeriodWeek(); return; }
      if (st.aggUnit === 'day') { actions.nextPeriodDay(); return; }
      actions.nextPeriodMonth();
    },
    setHqTablePage: (p: number) => set({ hqTablePage: p }),
    setHqTablePageSize: (n: number) => set({ hqTablePageSize: n, hqTablePage: 1 }),

    // ===== fab =====
    toggleFabMenu: () => set((s) => ({ showFabMenu: !s.showFabMenu })),
    closeFabMenu: () => set({ showFabMenu: false }),

    // ===== admin (real Supabase data, gated by profiles.is_admin — see
    // supabase/migrations/0002_invites_and_admin.sql and loadAdminOverview) =====
    loadAdminOverview,
    adminPrevMonth: () => set((s) => ({ adminMonth: shiftMonthLocal(s.adminMonth, -1), adminPage: 1 })),
    adminNextMonth: () => set((s) => ({ adminMonth: shiftMonthLocal(s.adminMonth, 1), adminPage: 1 })),
    setAdminTabOrgs: () => set({ adminTab: 'orgs' }),
    setAdminTabSettings: () => set({ adminTab: 'settings' }),
    onAdminSearch: (v: string) => set({ adminSearch: v, adminPage: 1 }),
    onAdminPrefFilter: (v: string) => set({ adminPrefFilter: v, adminPage: 1 }),
    toggleAdminActionMenu: (id: string) => set((s) => ({ adminActionMenuOrgId: s.adminActionMenuOrgId === id ? null : id })),
    toggleAdminDetail: (id: string) => set((s) => ({ adminDetailOrgId: s.adminDetailOrgId === id ? null : id, adminActionMenuOrgId: null })),
    toggleAdminFreeze: async (id: string) => {
      const st = getState();
      const org = st.adminMockOrgs.find((o) => o.id === id);
      if (!org) return;
      const nextStatus = org.status === 'frozen' ? 'active' : 'frozen';
      const label = nextStatus === 'frozen' ? '凍結' : '凍結解除';
      const { error } = await supabase.from('orgs').update({ status: nextStatus }).eq('id', id);
      if (error) { alert(error.message || '更新に失敗しました'); return; }
      await addAuditLog(`「${org.name}」を${label}しました`).catch((e) => console.error(e));
      set((s) => ({
        adminMockOrgs: s.adminMockOrgs.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)),
        adminActionMenuOrgId: null,
        auditLog: [{ ts: new Date().toISOString(), label: nowLabel(), text: `「${org.name}」を${label}しました` }, ...s.auditLog],
      }));
    },
    deleteAdminOrg: (id: string) => {
      const st = getState();
      const org = st.adminMockOrgs.find((o) => o.id === id);
      if (!org) return;
      if (org.teams > 0) { alert('チーム数が0の本部のみ削除できます。'); return; }
      openConfirm(`「${org.name}」を削除`, 'この本部を運営一覧から完全に削除します。この操作は取り消せません。', async () => {
        const { error } = await supabase.from('orgs').delete().eq('id', id);
        if (error) { alert(error.message || '削除に失敗しました'); return; }
        await addAuditLog(`「${org.name}」を削除しました`).catch((e) => console.error(e));
        set((s) => ({
          adminMockOrgs: s.adminMockOrgs.filter((o) => o.id !== id),
          adminActionMenuOrgId: null,
          auditLog: [{ ts: new Date().toISOString(), label: nowLabel(), text: `「${org.name}」を削除しました` }, ...s.auditLog],
        }));
      });
    },
    setAdminPageSize: (n: number) => set({ adminPageSize: n, adminPage: 1 }),
    adminPrevPage: () => set((s) => ({ adminPage: Math.max(1, s.adminPage - 1) })),
    adminNextPage: () => set((s) => ({ adminPage: s.adminPage + 1 })),
    adminOpenOwnHq: () => set({ adminOwnHqSetup: true }),
    goAdminDashboard: () => set({ adminOwnHqSetup: false, showProfileModal: false }),

    // ===== app settings (admin, real Supabase data) =====
    setBillingProvider: (p: 'stripe' | 'square') => set({ billingProvider: p, billingDirty: true }),
    onProviderApiKeyChange: (v: string) => set((s) => ({ billingApiKeys: { ...s.billingApiKeys, [s.billingProvider]: v }, billingDirty: true })),
    copyWebhookUrl: () => flash('copiedWebhook', 1600),
    setPricingConfig: (patch: Partial<AppState['pricingConfig']>) => set((s) => ({
      pricingConfig: { ...s.pricingConfig, ...patch },
      billingDirty: true,
    })),
    onPaymentGraceDaysChange: (v: number) => set({ paymentGraceDays: v, billingDirty: true }),
    onSettingsTermsChange: (v: string) => set({ settingsTerms: v, termsDirty: true }),
    saveLogo: () => { set({ logoDirty: false }); flash('showLogoSaved'); },
    saveBilling: async () => {
      const st = getState();
      try {
        await saveAppSettingsBilling({
          billingProvider: st.billingProvider, billingApiKeys: st.billingApiKeys,
          pricingConfig: st.pricingConfig, paymentGraceDays: st.paymentGraceDays,
        });
        set({ billingDirty: false });
        flash('showBillingSaved');
      } catch (e) {
        alert((e as Error).message || '保存に失敗しました');
      }
    },
    saveTerms: async () => {
      const st = getState();
      try {
        await saveAppSettingsTerms(st.settingsTerms);
        set({ termsDirty: false, termsModalText: st.settingsTerms });
        flash('showTermsSaved');
      } catch (e) {
        alert((e as Error).message || '保存に失敗しました');
      }
    },
    markLogoDirty: () => set({ logoDirty: true }),

    // ===== invite redemption =====
    loadInvitePreview: async (id: string) => {
      const { data, error } = await supabase.rpc('get_invite_info', { p_id: id });
      if (error) { set({ inviteInfo: { valid: false, reason: 'error' } }); return; }
      set({ inviteInfo: data as AppState['inviteInfo'] });
    },
    redeemPendingInvite: async () => {
      const st = getState();
      if (!st.pendingInviteId || !st.session) return;
      set({ inviteRedeeming: true, inviteError: '' });
      try {
        const { data, error } = await supabase.rpc('redeem_invite', { p_id: st.pendingInviteId });
        if (error) throw error;
        const result = data as { orgId: string; teamId: string };
        const myOrgs = await fetchMyOrgs(st.session);
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, hqCreated: true, orgs: myOrgs } : a)) }));
        try { localStorage.removeItem('fc_pendingInvite'); } catch { /* noop */ }
        window.history.replaceState({}, '', '/');
        set({ pendingInviteId: null, inviteInfo: null, inviteRedeeming: false });
        await loadOrg(result.orgId);
      } catch (e) {
        set({ inviteRedeeming: false, inviteError: (e as Error).message || '招待の処理に失敗しました' });
      }
    },
    dismissInvite: () => {
      try { localStorage.removeItem('fc_pendingInvite'); } catch { /* noop */ }
      window.history.replaceState({}, '', '/');
      set({ pendingInviteId: null, inviteInfo: null, inviteError: '', inviteRedeeming: false });
    },
  };

  function actions_defaultDateForMonth(st: AppState, m: number) {
    const mi = ((m % 12) + 12) % 12;
    const yr = st.year || 2026;
    const today = new Date();
    if (today.getFullYear() === yr && today.getMonth() === mi) return today.toISOString().slice(0, 10);
    return `${yr}-${String(mi + 1).padStart(2, '0')}-01`;
  }

  function nowLabel() {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function shiftMonthLocal(ym: string, delta: number) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function deleteHq() {
    const st = getState();
    const orgIdToRemove = st.activeOrgId;
    if (!orgIdToRemove) return;
    supabase.from('orgs').delete().eq('id', orgIdToRemove).then(async ({ error }) => {
      if (error) { console.error('deleteHq failed', error); return; }
      if (st.session) {
        const myOrgs = await fetchMyOrgs(st.session);
        set((s) => ({ accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, orgs: myOrgs, hqCreated: myOrgs.length > 0 } : a)) }));
        if (myOrgs.length > 0) { await loadOrg(myOrgs[0].id); return; }
      }
      set({
        activeOrgId: null, hqNameOverride: null, showProfileModal: true,
        stores: [], members: [], hqMembers: [], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4, dailyClosingEnabled: false },
        page: 'list' as const, selectedStoreId: null,
      });
    });
  }

  function deleteTeam(store: Store) {
    const st = getState();
    // Deleting the team row cascades away its transactions/memos in the
    // database immediately — bundle a snapshot of them into the trash
    // item itself, or restoring the team later would bring back an empty
    // shell with none of its data.
    const snapshot = {
      store,
      transactions: st.transactions[store.id] || [],
      memoTopics: st.memoTopics.filter((t) => t.storeId === store.id),
      members: st.members.filter((m) => m.store === store.name),
    };
    addTrash('team', store.name, snapshot, store.id).then(() => {
      set((s) => ({ stores: s.stores.filter((s2) => s2.id !== store.id), selectedStoreId: null }));
      supabase.from('teams').delete().eq('id', store.id).then(({ error }) => {
        if (error) { console.error('deleteTeam failed', error); return; }
        syncStripeQuantity(getState().activeOrgId);
      });
    });
  }

  function actuallyCreateStore(andThenCheckout?: boolean) {
    const st = getState();
    const f = st.addForm;
    if (!f || !f.name.trim() || !st.activeOrgId) return;
    supabase.from('teams').insert({
      org_id: st.activeOrgId, name: f.name.trim(), owner_name: st.ownerProfile.name, bg_color: paletteColor(st.stores.length),
      use_royalty: f.useRoyalty !== false, royalty_mode: f.royaltyMode || 'rate', royalty_rate: Math.max(0, f.royaltyRate || 0),
      royalty_amount: f.royaltyAmount || 0, use_savings: f.useSavings, savings_mode: f.savingsMode || 'amount',
      savings: f.savings, savings_rate: f.savingsRate || 0,
    }).select('id').single().then(async ({ data, error }) => {
      if (error || !data) { set({ authError: 'チームの作成に失敗しました' }); return; }
      const { data: inviteId, error: inviteErr } = await supabase.rpc('create_invite', { p_team_id: data.id, p_role: '管理者' });
      if (inviteErr) console.error('create_invite failed', inviteErr);
      set({ addStep: 'done', createdToken: (inviteId as string) || '', createdName: f.name.trim(), copied: false });
      await reloadActiveOrg();
      if (andThenCheckout) {
        await actions.startCheckout();
      } else {
        syncStripeQuantity(st.activeOrgId);
      }
    });
  }

  return actions;
}

function paletteColor(i: number): string {
  const palette = ['#3f6fb5', '#2f8f6b', '#9a6bcf', '#c77d3a', '#c2566b', '#4a8fb8', '#6b7f4a', '#b5853f', '#5a6b9e', '#3a9a8f'];
  return palette[i % palette.length];
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createInitialState());
  const stateRef = useRef(state);
  stateRef.current = state;

  const set = useCallback((patch: Patch) => {
    setState((prev) => {
      const p = typeof patch === 'function' ? patch(prev) : patch;
      return { ...prev, ...p };
    });
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  const actions = useMemo(() => createActions(set, getState), [set, getState]);

  useEffect(() => {
    let cancelled = false;
    void actions.loadPublicTerms();
    void actions.loadPublicBranding();
    void actions.loadPublicPricing();
    // onAuthStateChange already fires once immediately on subscribe with
    // the current session (event 'INITIAL_SESSION') — a separate manual
    // getSession() call here used to run the same expensive profile/org
    // fetch sequence a second time, in parallel, on every load.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      void handleAuthChange(event, session);
    });

    async function handleAuthChange(event: string, session: { user: { id: string } } | null) {
      if (event === 'PASSWORD_RECOVERY') {
        set({ authView: 'reset', authError: '', resetPassword: '', resetPasswordConfirm: '' });
      }
      if (!session) {
        set({ session: null, accounts: [], activeOrgId: null, stores: [], members: [], hqMembers: [], transactions: {}, memoTopics: [], trash: [] });
        return;
      }
      // None of these three depend on each other's results — fetch them
      // together instead of as three sequential round trips.
      const [{ data: profile }, { data: userRes }, myOrgs] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.auth.getUser(),
        fetchMyOrgs(session.user.id),
      ]);
      const email = userRes.user?.email || '';
      const verified = !!userRes.user?.email_confirmed_at;
      // s.activeOrgId is always null right after a fresh page load (client
      // state resets), so without checking localStorage too, an account in
      // more than one org would land on whichever org happens to come back
      // first from the (unordered) org_members query — effectively random.
      const savedOrgId = loadSavedActiveOrgId();
      const preferredOrgId = getState().activeOrgId || savedOrgId;
      const resolvedOrgId = preferredOrgId && myOrgs.some((o) => o.id === preferredOrgId) ? preferredOrgId : (myOrgs[0]?.id ?? null);
      if (resolvedOrgId) saveActiveOrgId(resolvedOrgId);
      set({
        session: session.user.id,
        ownerProfile: { name: profile?.name || '', email, password: '' },
        accounts: [{
          id: session.user.id, name: profile?.name || '', email, password: '', verified,
          hqCreated: myOrgs.length > 0, orgs: myOrgs, isAdmin: !!profile?.is_admin,
        }],
        activeOrgId: resolvedOrgId,
      });
      // Not stateRef.current.activeOrgId here — the ref only reflects the
      // new state once StoreProvider re-renders, which doesn't necessarily
      // happen synchronously right after set() in this context (a Promise
      // continuation, not a React event handler). Reading it immediately
      // was a genuine race: sometimes the render had already flushed and
      // it worked, sometimes it hadn't and this read back the old (null)
      // value, skipping the org data fetch entirely. resolvedOrgId is the
      // value that was just set — no need to read it back at all.
      const target = resolvedOrgId;
      if (target) {
        try {
          const orgData = await fetchOrgData(target);
          const isOrgMember = orgData.hqMembers.some((m) => m.userId === session.user.id);
          set((s) => ({
            hqNameOverride: orgData.companyInfo.name || null,
            viewRole: isOrgMember ? 'hq' : (orgData.stores[0]?.id || 'hq'), selectedStoreId: null,
            ...orgData, logoMap: { ...s.logoMap, ...orgData.logoMap },
          }));
        } catch (e) {
          console.error('initial org load failed', e);
        }
      }
      if (profile?.is_admin) void actions.loadAdminOverview();
    }

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<StoreApi>(() => ({ state, set, actions }), [state, set, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
