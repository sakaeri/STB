import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  AppState, Store, TrashItem, ConfirmDialogState, MemoModalState,
} from '../types';
import { createInitialState } from './mockData';
import { currentPeriodKey } from './calc';
import { planForCount } from '../tokens';

type Patch = Partial<AppState> | ((s: AppState) => Partial<AppState>);

function randToken(len = 8): string {
  return Math.random().toString(36).slice(2, 2 + len);
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

  const orgKey = () => getState().activeOrgId || 'default';
  const activeTeamCount = () => getState().stores.length;
  const effectivePlan = () => {
    const st = getState();
    const k = orgKey();
    const stored = st.orgMaxTeams[k];
    const maxReached = stored == null ? activeTeamCount() : Math.max(stored, activeTeamCount());
    return planForCount(maxReached);
  };
  const downgradeCandidatePlan = () => {
    const active = activeTeamCount();
    const eff = effectivePlan();
    if (active >= eff.min) return null;
    const cand = planForCount(active);
    return cand.name === eff.name ? null : cand;
  };

  const snapshotOrgFields = (st: AppState) => ({
    stores: st.stores, members: st.members, hqMembers: st.hqMembers, transactions: st.transactions,
    memoTopics: st.memoTopics, trash: st.trash, companyInfo: st.companyInfo, confirmedPeriods: st.confirmedPeriods,
    unitLabel: st.unitLabel, unitLabelPlural: st.unitLabelPlural, defaults: st.defaults,
  });

  const addTrash = (type: TrashItem['type'], label: string, data: unknown, storeId?: string | null) => {
    set((st) => ({ trash: st.trash.concat([{ id: 'trash_' + randToken(7), type, label, deletedAt: Date.now(), data, storeId: storeId || null }]) }));
  };

  const openConfirm = (label: string, note: string, onConfirm: () => void, actionLabel?: string) => {
    const cd: ConfirmDialogState = { label, note, onConfirm, actionLabel: actionLabel || '削除する' };
    set({ confirmDelete: cd, confirmChecked: false });
  };

  const actions = {
    // ===== computed plan helpers (safe to call during render) =====
    effectivePlan,
    downgradeCandidatePlan,
    activeTeamCount,

    // ===== auth =====
    onAuthEmail: (v: string) => set({ authEmail: v }),
    onAuthPassword: (v: string) => set({ authPassword: v }),
    doLogin: () => {
      const st = getState();
      const email = (st.authEmail || '').trim().toLowerCase();
      const pass = st.authPassword || '';
      if (!email && !pass) {
        const demo = st.accounts[0];
        set({ session: demo.id, authError: '', ownerProfile: { name: demo.name, email: demo.email, password: demo.password } });
        try { localStorage.setItem('fc_session', demo.id); } catch { /* noop */ }
        return;
      }
      const lockUntil = st.loginLockUntil[email] || 0;
      if (lockUntil > Date.now()) {
        const secs = Math.ceil((lockUntil - Date.now()) / 1000);
        set({ authError: `ログイン試行回数が上限に達しました。${secs}秒後に再度お試しください。` });
        return;
      }
      const acc = st.accounts.find((a) => a.email.toLowerCase() === email && a.password === pass);
      if (!acc) {
        const fails = (st.loginFailCount[email] || 0) + 1;
        const locked = fails >= 5;
        set((s) => ({
          loginFailCount: { ...s.loginFailCount, [email]: locked ? 0 : fails },
          loginLockUntil: locked ? { ...s.loginLockUntil, [email]: Date.now() + 30000 } : s.loginLockUntil,
          authError: locked
            ? 'ログイン試行回数が上限に達しました。30秒後に再度お試しください。'
            : `メールアドレスまたはパスワードが正しくありません（あと${5 - fails}回で一時ロックされます）`,
        }));
        return;
      }
      if (!acc.verified) { set({ authView: 'verify', pendingAccountId: acc.id, authError: '' }); return; }
      set((s) => ({ session: acc.id, authError: '', ownerProfile: { name: acc.name, email: acc.email, password: acc.password }, loginFailCount: { ...s.loginFailCount, [email]: 0 } }));
      try { localStorage.setItem('fc_session', acc.id); } catch { /* noop */ }
    },
    quickAdminLogin: () => {
      const st = getState();
      const admin = st.accounts.find((a) => a.isAdmin);
      if (!admin) return;
      set({ session: admin.id, authError: '', ownerProfile: { name: admin.name, email: admin.email, password: admin.password } });
      try { localStorage.setItem('fc_session', admin.id); } catch { /* noop */ }
    },
    goForgot: () => set((s) => ({ authView: 'forgot', authError: '', forgotEmail: s.authEmail || '' })),
    onForgotEmail: (v: string) => set({ forgotEmail: v }),
    doForgotSubmit: () => {
      const st = getState();
      const email = (st.forgotEmail || '').trim().toLowerCase();
      if (!email) { set({ authError: 'メールアドレスを入力してください' }); return; }
      const acc = st.accounts.find((a) => a.email.toLowerCase() === email);
      set({ authView: 'reset', resetAccountId: acc ? acc.id : null, resetPassword: '', resetPasswordConfirm: '', authError: '' });
    },
    onResetPassword: (v: string) => set({ resetPassword: v }),
    onResetPasswordConfirm: (v: string) => set({ resetPasswordConfirm: v }),
    doResetPassword: () => {
      const st = getState();
      const p1 = st.resetPassword || '', p2 = st.resetPasswordConfirm || '';
      if (p1.length < 8) { set({ authError: 'パスワードは8文字以上で入力してください' }); return; }
      if (p1 !== p2) { set({ authError: 'パスワードが一致しません' }); return; }
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === s.resetAccountId ? { ...a, password: p1 } : a)),
        authView: 'login', authError: '', resetDone: true, resetAccountId: null, resetPassword: '', resetPasswordConfirm: '', authEmail: s.forgotEmail,
      }));
    },
    doResendVerify: () => flash('verifyResent', 2400),
    doVerifyComplete: () => {
      const st = getState();
      const id = st.pendingAccountId;
      if (!id) return;
      set((s) => {
        const accounts = s.accounts.map((a) => (a.id === id ? { ...a, verified: true } : a));
        const acc = accounts.find((a) => a.id === id)!;
        return { accounts, session: id, ownerProfile: { name: acc.name, email: acc.email, password: acc.password }, pendingAccountId: null, authError: '' };
      });
      try { localStorage.setItem('fc_session', id); } catch { /* noop */ }
    },
    goSignup: () => set({ authView: 'signup', authError: '', signupForm: { name: '', email: '', password: '' } }),
    goLogin: () => set({ authView: 'login', authError: '' }),
    onSignupName: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), name: v } })),
    onSignupEmail: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), email: v } })),
    onSignupPassword: (v: string) => set((s) => ({ signupForm: { ...(s.signupForm as NonNullable<AppState['signupForm']>), password: v } })),
    doSignup: () => {
      const st = getState();
      const f = st.signupForm;
      if (!f) return;
      if (!f.name.trim() || !f.email.trim() || !f.password.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      if (f.password.length < 8) { set({ authError: 'パスワードは8文字以上で入力してください' }); return; }
      if (st.accounts.find((a) => a.email.toLowerCase() === f.email.trim().toLowerCase())) { set({ authError: 'このメールアドレスは既に使用されています' }); return; }
      const id = 'acc_' + randToken(7);
      set((s) => ({
        accounts: s.accounts.concat([{ id, name: f.name.trim(), email: f.email.trim(), password: f.password, verified: false, hqCreated: false, orgs: [] }]),
        pendingAccountId: id, authView: 'verify', authError: '',
      }));
    },
    logout: () => {
      set({ session: null, authEmail: '', authPassword: '' });
      try { localStorage.removeItem('fc_session'); } catch { /* noop */ }
    },
    openTermsModal: () => set({ showTermsModal: true }),
    closeTermsModal: () => set({ showTermsModal: false }),

    // ===== HQ setup =====
    onHqSetupField: (key: keyof AppState['hqSetupForm'], val: string | number) => set((s) => ({ hqSetupForm: { ...s.hqSetupForm, [key]: val } })),
    goHqSetupOptionalStep: () => {
      const f = getState().hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      set({ hqSetupStep: 'optional', authError: '' });
    },
    backHqSetupBasicStep: () => set({ hqSetupStep: 'basic' }),
    doCreateHq: () => {
      const st = getState();
      const f = st.hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      const storeId = 'store_' + randToken(5);
      const newStore: Store = { id: storeId, name: f.firstTeamName.trim(), owner: '招待中', seed: Math.floor(Math.random() * 9000) + 100, base: 5500000, expRatio: 0.66, bg: '#3f6fb5', royaltyRate: 5, useSavings: true, savings: 50000, createdPeriod: currentPeriodKey() };
      const orgId = 'org_' + randToken(5);
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, hqCreated: true, orgs: (a.orgs || []).concat([{ id: orgId, name: f.hqName.trim(), role: 'オーナー' }]) } : a)),
        activeOrgId: orgId, hqNameOverride: f.hqName.trim(), stores: [newStore], members: [], hqMembers: [{ name: s.ownerProfile.name, role: 'オーナー' }], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: f.hqName.trim(), address: (f.address || '').trim(), rep: (f.rep || '').trim(), closingDay: f.closingDay || 'eom', fiscalStartMonth: f.fiscalStartMonth || 4 }, confirmedPeriods: {},
        viewRole: 'hq', selectedStoreId: null, authError: '', adminOwnHqSetup: false,
        hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic',
      }));
    },

    // ===== multi-org =====
    switchOrg: (id: string) => {
      const st = getState();
      const acc = st.accounts.find((a) => a.id === st.session);
      const org = acc && (acc.orgs || []).find((o) => o.id === id);
      if (!org) return;
      if (id === st.activeOrgId) { set({ showProfileModal: false }); return; }
      const curKey = orgKey();
      const savedSnapshot = snapshotOrgFields(st);
      const target = st.orgSnapshots[id] || {
        stores: [], members: [], hqMembers: [{ name: st.ownerProfile.name, role: 'オーナー' as const }], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: org.name, address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, confirmedPeriods: {}, unitLabel: null, unitLabelPlural: null,
        defaults: { royaltyRate: 5, useSavings: true, savings: 50000 },
      };
      const targetRole = org.role === 'オーナー' ? 'hq' : (target.stores[0] ? target.stores[0].id : 'hq');
      set((s) => ({
        ...target,
        activeOrgId: id, hqNameOverride: org.name, viewRole: targetRole, selectedStoreId: null, showProfileModal: false,
        orgSnapshots: { ...s.orgSnapshots, [curKey]: savedSnapshot },
      }));
    },
    openNewOrg: () => set({ showNewOrgModal: true, showProfileModal: false, hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic', authError: '' }),
    closeNewOrg: () => set({ showNewOrgModal: false }),
    createNewOrg: () => {
      const st = getState();
      const f = st.hqSetupForm;
      if (!f.hqName.trim() || !f.firstTeamName.trim()) { set({ authError: 'すべての必須項目を入力してください' }); return; }
      const storeId = 'store_' + randToken(5);
      const newStore: Store = { id: storeId, name: f.firstTeamName.trim(), owner: '招待中', seed: Math.floor(Math.random() * 9000) + 100, base: 5500000, expRatio: 0.66, bg: '#3f6fb5', royaltyRate: 5, useSavings: true, savings: 50000, createdPeriod: currentPeriodKey() };
      const orgId = 'org_' + randToken(5);
      const curKey = orgKey();
      const savedSnapshot = snapshotOrgFields(st);
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, hqCreated: true, orgs: (a.orgs || []).concat([{ id: orgId, name: f.hqName.trim(), role: 'オーナー' }]) } : a)),
        activeOrgId: orgId, hqNameOverride: f.hqName.trim(), stores: [newStore], members: [], hqMembers: [{ name: s.ownerProfile.name, role: 'オーナー' }], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: f.hqName.trim(), address: (f.address || '').trim(), rep: (f.rep || '').trim(), closingDay: f.closingDay || 'eom', fiscalStartMonth: f.fiscalStartMonth || 4 }, confirmedPeriods: {}, unitLabel: null, unitLabelPlural: null,
        viewRole: 'hq', selectedStoreId: null, showNewOrgModal: false,
        hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 }, hqSetupStep: 'basic',
        orgSnapshots: { ...s.orgSnapshots, [curKey]: savedSnapshot },
      }));
    },

    // ===== profile =====
    openProfileModal: () => set((s) => ({ showProfileModal: true, profileEditing: false, profileDraft: s.ownerProfile })),
    closeProfileModal: () => set({ showProfileModal: false }),
    openProfileEdit: () => set((s) => ({ profileEditing: true, profileDraft: { ...s.ownerProfile }, profileSaved: false, profileError: '', profilePasswordVisible: false })),
    cancelProfileEdit: () => set({ profileEditing: false }),
    onOwnerProfileName: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), name: v } })),
    onOwnerProfileEmail: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), email: v } })),
    onOwnerProfilePassword: (v: string) => set((s) => ({ profileDraft: { ...(s.profileDraft as NonNullable<AppState['profileDraft']>), password: v } })),
    toggleProfilePasswordVisible: () => set((s) => ({ profilePasswordVisible: !s.profilePasswordVisible })),
    saveOwnerProfile: () => {
      const st = getState();
      const d = st.profileDraft;
      if (!d) return;
      if (d.password.length < 6) { set({ profileError: 'パスワードは6文字以上で入力してください' }); return; }
      const emailChanged = d.email !== st.ownerProfile.email;
      const passwordChanged = d.password !== st.ownerProfile.password;
      if (emailChanged) { set({ emailChangeStep: 'code', emailChangeCodeInput: '', emailChangeError: '', profileEditing: false, profileError: '' }); return; }
      if (passwordChanged) { set({ passwordConfirmStep: true, profileEditing: false, profileError: '' }); return; }
      applyProfile(d);
    },
    onEmailChangeCodeInput: (v: string) => set({ emailChangeCodeInput: v }),
    confirmEmailChange: () => {
      const st = getState();
      if (st.emailChangeCodeInput.trim() !== '123456') { set({ emailChangeError: '確認コードが正しくありません（デモ用コード：123456）' }); return; }
      const d = st.profileDraft!;
      const passwordChanged = d.password !== st.ownerProfile.password;
      set({ emailChangeStep: null });
      if (passwordChanged) { set({ passwordConfirmStep: true }); return; }
      applyProfile(d);
    },
    cancelEmailChange: () => set({ emailChangeStep: null, profileEditing: true }),
    confirmPasswordChange: () => {
      const st = getState();
      applyProfile(st.profileDraft!);
      try { localStorage.removeItem('fc_session'); } catch { /* noop */ }
      set((s) => ({ passwordConfirmStep: false, session: null, authView: 'login', authEmail: s.profileDraft!.email, authPassword: '', authError: 'パスワードを変更しました。新しいパスワードで再度ログインしてください。' }));
    },
    cancelPasswordChange: () => set({ passwordConfirmStep: false, profileEditing: true }),

    // ===== unit label =====
    setUnitLabels: (unit: string, plural: string) => {
      set({ unitLabel: unit, unitLabelPlural: plural });
      try { localStorage.setItem('fc_unitLabel', unit); localStorage.setItem('fc_unitLabelPlural', plural); } catch { /* noop */ }
    },
    openUnitLabelEdit: () => set({ editingUnitLabel: true }),
    closeUnitLabelEdit: () => set({ editingUnitLabel: false }),

    // ===== company info =====
    openCompanyInfoEdit: () => set({ editingCompanyInfo: true }),
    closeCompanyInfoEdit: () => {
      const st = getState();
      if (!(st.companyInfo.name || '').trim()) { set({ companyNameError: true }); return; }
      set({ editingCompanyInfo: false, companyNameError: false });
    },
    onCompanyName: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, name: v }, companyNameError: false })),
    onCompanyAddress: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, address: v } })),
    onCompanyRep: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, rep: v } })),
    onCompanyClosingDay: (v: string) => set((s) => ({ companyInfo: { ...s.companyInfo, closingDay: v } })),
    onCompanyFiscalStartMonth: (v: number) => set((s) => ({ companyInfo: { ...s.companyInfo, fiscalStartMonth: v } })),

    // ===== hq defaults =====
    openHqDefaultsEdit: () => set({ editingHqDefaults: true }),
    closeHqDefaultsEdit: () => set({ editingHqDefaults: false }),
    setDefaults: (patch: Partial<AppState['defaults']>) => set((s) => ({ defaults: { ...s.defaults, ...patch } })),

    // ===== stores/teams =====
    updateStore: (id: string, patch: Partial<Store>) => set((s) => ({ stores: s.stores.map((st) => (st.id === id ? { ...st, ...patch } : st)) })),
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
      const currentMax = st.orgMaxTeams[orgKey()] == null ? st.stores.length : st.orgMaxTeams[orgKey()];
      const nextCount = st.stores.length + 1;
      const currentPlan = planForCount(currentMax);
      const nextPlan = planForCount(Math.max(currentMax, nextCount));
      if (nextPlan.name !== currentPlan.name) { set({ pendingUpgrade: { fromPlan: currentPlan, toPlan: nextPlan } }); return; }
      actuallyCreateStore();
    },
    confirmUpgradeAndCreate: () => { set({ pendingUpgrade: null }); actuallyCreateStore(); },
    cancelUpgrade: () => set({ pendingUpgrade: null }),
    togglePaymentDemo: () => set((s) => ({ paymentFailed: !s.paymentFailed })),
    retryPayment: () => set({ paymentFailed: false }),
    copyInvite: () => { flash('copied', 1600); },
    copyMemberInvite: () => { flash('memberInviteCopied', 1600); },
    closeMemberInvite: () => set({ showMemberInvite: false }),
    inviteMember: (storeName: string) => set({ showMemberInvite: true, memberInviteToken: randToken(8), memberInviteStoreName: storeName, memberInviteCopied: false }),

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
    setLogo: (id: string, dataUrl: string) => set((s) => ({ logoMap: { ...s.logoMap, [id]: dataUrl } })),

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
      const storeId = isHq ? st.stores[0].id : st.viewRole;
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
    saveEntry: () => {
      const st = getState();
      const d = st.entryDraft;
      if (!d) return;
      const amount = Math.max(0, parseInt(d.amount, 10) || 0);
      if (!amount) return;
      const tx = { id: 'tx_' + randToken(7), type: d.type, title: d.title.trim() || (d.type === 'sales' ? '売上' : '経費'), amount, date: d.date, photo: d.photo || null };
      set((s) => ({ transactions: { ...s.transactions, [d.storeId]: (s.transactions[d.storeId] || []).concat([tx]) }, showEntry: false, entryDraft: null }));
    },
    deleteTx: (storeId: string, id: string) => set((s) => ({ transactions: { ...s.transactions, [storeId]: (s.transactions[storeId] || []).filter((t) => t.id !== id) } })),
    requestDeleteTx: (storeId: string, tx: { id: string; title: string; amount: number; date: string }) => {
      openConfirm(`「${tx.title}」を削除`, `この記録をゴミ箱に移動します。金額：¥${Math.round(tx.amount).toLocaleString('ja-JP')}（${tx.date}）。`, () => {
        addTrash('tx', tx.title, { storeId, tx });
        actions.deleteTx(storeId, tx.id);
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
    onMemoModalStoreId: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), storeId: v || null } })),
    onMemoModalName: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), name: v } })),
    onMemoModalLabel: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), label: v } })),
    onMemoModalText: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), text: v } })),
    onMemoModalDate: (v: string) => set((s) => ({ memoModal: { ...(s.memoModal as MemoModalState), date: v } })),
    saveMemoModal: () => {
      const st = getState();
      const m = st.memoModal;
      if (!m) return;
      if (m.kind === 'topic') {
        const name = (m.name || '').trim();
        if (!name) return;
        const topic = { id: 'topic_' + randToken(7), name, storeId: m.storeId || null, entries: [] };
        set((s) => ({ memoTopics: s.memoTopics.concat([topic]), memoModal: null, memoNav: { topicId: topic.id, entryId: null } }));
      } else if (m.kind === 'entry') {
        const name = (m.name || '').trim();
        if (!name) return;
        const entry = { id: 'entry_' + randToken(7), name, records: [] };
        set((s) => ({ memoTopics: s.memoTopics.map((t) => (t.id === m.topicId ? { ...t, entries: t.entries.concat([entry]) } : t)), memoModal: null, memoNav: { topicId: m.topicId!, entryId: entry.id } }));
      } else if (m.kind === 'record') {
        const label = (m.label || '').trim(); const text = (m.text || '').trim();
        if (!label || !text) return;
        const rec = { id: 'rec_' + randToken(7), label, text, date: m.date! };
        set((s) => ({ memoTopics: s.memoTopics.map((t) => (t.id === m.topicId ? { ...t, entries: t.entries.map((e) => (e.id === m.entryId ? { ...e, records: e.records.concat([rec]) } : e)) } : t)), memoModal: null }));
      }
    },
    requestPromoteTopic: (topic: { id: string; name: string }) => {
      openConfirm(`「${topic.name}」を全体共有にする`, 'この項目を全チーム共通に変更します。他のすべてのチームから閲覧できるようになります。共有すべきでない情報が含まれていないか確認してください。', () => {
        set((s) => ({ memoTopics: s.memoTopics.map((mt) => (mt.id === topic.id ? { ...mt, storeId: null } : mt)) }));
      }, '共有する');
    },
    requestDeleteMemoTopic: (topic: { id: string; name: string; storeId?: string | null }) => {
      openConfirm(`「${topic.name}」を削除`, `項目「${topic.name}」とその中の詳細・記録をすべてゴミ箱に移動します。`, () => {
        addTrash('memoTopic', topic.name, topic, topic.storeId || null);
        set((s) => ({ memoTopics: s.memoTopics.filter((t) => t.id !== topic.id), memoNav: s.memoNav.topicId === topic.id ? { topicId: null, entryId: null } : s.memoNav }));
      });
    },
    requestDeleteMemoEntry: (topicId: string, entry: { id: string; name: string }) => {
      openConfirm(`「${entry.name}」を削除`, `詳細「${entry.name}」とその記録をすべてゴミ箱に移動します。`, () => {
        const st = getState();
        const t = st.memoTopics.find((x) => x.id === topicId);
        addTrash('memoEntry', entry.name, { topicId, entry }, t ? t.storeId || null : null);
        set((s) => ({
          memoTopics: s.memoTopics.map((x) => (x.id === topicId ? { ...x, entries: x.entries.filter((e) => e.id !== entry.id) } : x)),
          memoNav: s.memoNav.entryId === entry.id ? { ...s.memoNav, entryId: null } : s.memoNav,
        }));
      });
    },
    requestDeleteMemoRecord: (topicId: string, entryId: string, rec: { id: string; label: string }) => {
      openConfirm(`「${rec.label}」を削除`, `記録「${rec.label}」をゴミ箱に移動します。`, () => {
        const st = getState();
        const t = st.memoTopics.find((x) => x.id === topicId);
        addTrash('memoRecord', rec.label, { topicId, entryId, record: rec }, t ? t.storeId || null : null);
        set((s) => ({ memoTopics: s.memoTopics.map((x) => (x.id === topicId ? { ...x, entries: x.entries.map((e) => (e.id === entryId ? { ...e, records: e.records.filter((r) => r.id !== rec.id) } : e)) } : x)) }));
      });
    },

    // ===== members =====
    requestDeleteMember: (idx: number) => {
      const st = getState();
      const m = st.members[idx];
      const storeManagerCount = st.members.filter((x) => x.store === m.store && x.role === '管理者').length;
      if (m.role === '管理者' && storeManagerCount <= 1) { alert(`${m.store}には管理者が最低1人必要です。他のメンバーを管理者にしてから削除してください。`); return; }
      openConfirm(`「${m.name}」を削除`, `${m.name}様をこのチームから削除し、ゴミ箱に移動します。`, () => {
        const s2 = getState();
        const mm = s2.members[idx];
        const st2 = s2.stores.find((x) => x.name === mm.store);
        addTrash('member', mm.name, mm, st2 ? st2.id : null);
        set((s) => ({ members: s.members.filter((_, i) => i !== idx) }));
      });
    },
    requestDeleteHqMember: (idx: number) => {
      const st = getState();
      const m = st.hqMembers[idx];
      if (m.role === 'オーナー' && st.hqMembers.filter((x) => x.role === 'オーナー').length <= 1) { alert('オーナーは最低1人必要です。他のメンバーをオーナーにしてから削除してください。'); return; }
      openConfirm(`「${m.name}」を削除`, `${m.name}様を本部メンバーから削除し、ゴミ箱に移動します。`, () => {
        const s2 = getState();
        addTrash('hqMember', s2.hqMembers[idx].name, s2.hqMembers[idx]);
        set((s) => ({ hqMembers: s.hqMembers.filter((_, i) => i !== idx) }));
      });
    },

    // ===== trash / confirm =====
    purgeTrash: () => {
      const now = Date.now();
      set((s) => ({ trash: s.trash.filter((t) => now - t.deletedAt < 31 * 24 * 60 * 60 * 1000) }));
    },
    closeConfirm: () => set({ confirmDelete: null, confirmChecked: false }),
    toggleConfirmChecked: () => set((s) => ({ confirmChecked: !s.confirmChecked })),
    runConfirm: () => {
      const st = getState();
      const cd = st.confirmDelete;
      if (!cd || !st.confirmChecked) return;
      cd.onConfirm();
      set({ confirmDelete: null, confirmChecked: false });
    },
    restoreTrashItem: (item: TrashItem) => {
      if (item.type === 'team') {
        const k = orgKey();
        set((s) => ({ stores: s.stores.concat([item.data as Store]), orgMaxTeams: { ...s.orgMaxTeams, [k]: Math.max(s.orgMaxTeams[k] == null ? s.stores.length : s.orgMaxTeams[k], s.stores.length + 1) } }));
      } else if (item.type === 'member') {
        set((s) => ({ members: s.members.concat([item.data as AppState['members'][number]]) }));
      } else if (item.type === 'hqMember') {
        set((s) => ({ hqMembers: s.hqMembers.concat([item.data as AppState['hqMembers'][number]]) }));
      } else if (item.type === 'memoTopic') {
        set((s) => ({ memoTopics: s.memoTopics.concat([item.data as AppState['memoTopics'][number]]) }));
      } else if (item.type === 'memoEntry') {
        const d = item.data as { topicId: string; entry: AppState['memoTopics'][number]['entries'][number] };
        set((s) => ({ memoTopics: s.memoTopics.map((t) => (t.id === d.topicId ? { ...t, entries: t.entries.concat([d.entry]) } : t)) }));
      } else if (item.type === 'memoRecord') {
        const d = item.data as { topicId: string; entryId: string; record: AppState['memoTopics'][number]['entries'][number]['records'][number] };
        set((s) => ({ memoTopics: s.memoTopics.map((t) => (t.id === d.topicId ? { ...t, entries: t.entries.map((e) => (e.id === d.entryId ? { ...e, records: e.records.concat([d.record]) } : e)) } : t)) }));
      } else if (item.type === 'tx') {
        const d = item.data as { storeId: string; tx: AppState['transactions'][string][number] };
        set((s) => ({ transactions: { ...s.transactions, [d.storeId]: (s.transactions[d.storeId] || []).concat([d.tx]) } }));
      }
      set((s) => ({ trash: s.trash.filter((t) => t.id !== item.id) }));
    },
    requestPermanentDelete: (item: TrashItem) => {
      openConfirm(`「${item.label}」を完全に削除`, 'この操作は取り消せません。ゴミ箱からも完全に削除されます。', () => {
        set((s) => ({ trash: s.trash.filter((t) => t.id !== item.id) }));
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
      const k = orgKey();
      set((s) => ({ orgMaxTeams: { ...s.orgMaxTeams, [k]: activeTeamCount() }, orgDowngradeDismissed: { ...s.orgDowngradeDismissed, [k]: null } }));
    },
    dismissDowngrade: () => {
      const k = orgKey();
      set((s) => ({ orgDowngradeDismissed: { ...s.orgDowngradeDismissed, [k]: activeTeamCount() } }));
    },

    // ===== navigation =====
    goList: () => set({ page: 'list' }),
    goMemo: () => set({ page: 'memo' }),
    goSettings: () => set({ page: 'settings' }),
    setViewRole: (v: string) => {
      const st = getState();
      const s2 = st.stores.find((x) => x.id === v);
      set({ viewRole: v, selectedStoreId: null, aggUnit: v === 'hq' ? ((st.defaults as { aggUnit?: AppState['aggUnit'] }).aggUnit || 'month') : (s2 ? ((s2.aggUnit as AppState['aggUnit']) || 'month') : 'month') });
    },
    setSimRole: (v: AppState['simRole']) => set({ simRole: v }),
    setLayout: (v: AppState['layout']) => set({ layout: v }),
    setAggUnit: (v: AppState['aggUnit']) => set({ aggUnit: v }),
    toggleCloseBanner: () => set((s) => ({ closeBannerOpen: !s.closeBannerOpen })),
    confirmPeriod: (storeId: string, period: string) => set((s) => ({ confirmedPeriods: { ...s.confirmedPeriods, [`${storeId}|${period}`]: true } })),
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

    // ===== admin =====
    adminPrevMonth: () => set((s) => ({ adminMonth: shiftMonthLocal(s.adminMonth, -1), adminPage: 1 })),
    adminNextMonth: () => set((s) => ({ adminMonth: shiftMonthLocal(s.adminMonth, 1), adminPage: 1 })),
    setAdminTabOrgs: () => set({ adminTab: 'orgs' }),
    setAdminTabSettings: () => set({ adminTab: 'settings' }),
    onAdminSearch: (v: string) => set({ adminSearch: v, adminPage: 1 }),
    onAdminPrefFilter: (v: string) => set({ adminPrefFilter: v, adminPage: 1 }),
    toggleAdminActionMenu: (id: string) => set((s) => ({ adminActionMenuOrgId: s.adminActionMenuOrgId === id ? null : id })),
    toggleAdminDetail: (id: string) => set((s) => ({ adminDetailOrgId: s.adminDetailOrgId === id ? null : id, adminActionMenuOrgId: null })),
    toggleAdminFreeze: (id: string) => {
      const st = getState();
      const org = st.adminMockOrgs.find((o) => o.id === id);
      if (!org) return;
      const nextStatus = org.status === 'frozen' ? 'active' : 'frozen';
      const label = nextStatus === 'frozen' ? '凍結' : '凍結解除';
      set((s) => ({
        adminMockOrgs: s.adminMockOrgs.map((o) => (o.id === id ? { ...o, status: nextStatus } : o)),
        adminActionMenuOrgId: null,
        auditLog: [{ ts: nowLabel(), text: `「${org.name}」を${label}しました` }, ...s.auditLog],
      }));
    },
    deleteAdminOrg: (id: string) => {
      const st = getState();
      const org = st.adminMockOrgs.find((o) => o.id === id);
      if (!org) return;
      if (org.teams > 0) { alert('チーム数が0の本部のみ削除できます。'); return; }
      openConfirm(`「${org.name}」を削除`, 'この本部を運営一覧から完全に削除します。この操作は取り消せません。', () => {
        set((s) => ({
          adminMockOrgs: s.adminMockOrgs.filter((o) => o.id !== id),
          adminActionMenuOrgId: null,
          auditLog: [{ ts: nowLabel(), text: `「${org.name}」を削除しました` }, ...s.auditLog],
        }));
      });
    },
    setAdminPageSize: (n: number) => set({ adminPageSize: n, adminPage: 1 }),
    adminPrevPage: () => set((s) => ({ adminPage: Math.max(1, s.adminPage - 1) })),
    adminNextPage: () => set((s) => ({ adminPage: s.adminPage + 1 })),
    adminOpenOwnHq: () => set({ adminOwnHqSetup: true }),
    goAdminDashboard: () => set({ adminOwnHqSetup: false, showProfileModal: false }),

    // ===== app settings (admin) =====
    setBillingProvider: (p: 'stripe' | 'square') => set({ billingProvider: p, billingDirty: true }),
    onProviderApiKeyChange: (v: string) => set((s) => ({ billingApiKeys: { ...s.billingApiKeys, [s.billingProvider]: v }, billingDirty: true })),
    copyWebhookUrl: () => flash('copiedWebhook', 1600),
    setPlanPrice: (name: string, patch: Partial<{ min: number; max: number | null; price: number }>) => set((s) => ({
      settingsPlanPrices: { ...(s.settingsPlanPrices || {}), [name]: { ...(s.settingsPlanPrices?.[name] || { min: 0, max: null, price: 0 }), ...patch } },
      billingDirty: true,
    })),
    onPaymentGraceDaysChange: (v: number) => set({ paymentGraceDays: v, billingDirty: true }),
    onSettingsTermsChange: (v: string) => set({ settingsTerms: v, termsDirty: true }),
    saveLogo: () => { set({ logoDirty: false }); flash('showLogoSaved'); },
    saveBilling: () => { set({ billingDirty: false }); flash('showBillingSaved'); },
    saveTerms: () => { set({ termsDirty: false }); flash('showTermsSaved'); },
    markLogoDirty: () => set({ logoDirty: true }),
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

  function applyProfile(d: AppState['ownerProfile']) {
    set((s) => ({
      ownerProfile: { ...s.ownerProfile, ...d },
      accounts: s.accounts.map((a) => (a.id === s.session ? { ...a, name: d.name, email: d.email, password: d.password } : a)),
      profileEditing: false,
    }));
    flash('profileSaved');
  }

  function deleteHq() {
    const st = getState();
    const orgIdToRemove = st.activeOrgId;
    set((s) => {
      const accounts = s.accounts.map((a) => (a.id === s.session ? { ...a, orgs: (a.orgs || []).filter((o) => o.id !== orgIdToRemove) } : a));
      const orgMaxTeams = { ...s.orgMaxTeams }; if (orgIdToRemove) delete orgMaxTeams[orgIdToRemove];
      const orgDowngradeDismissed = { ...s.orgDowngradeDismissed }; if (orgIdToRemove) delete orgDowngradeDismissed[orgIdToRemove];
      const orgSnapshots = { ...s.orgSnapshots }; if (orgIdToRemove) delete orgSnapshots[orgIdToRemove];
      return {
        accounts, activeOrgId: null, hqNameOverride: null, showProfileModal: true,
        stores: [], members: [], hqMembers: [], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 },
        page: 'list' as const, selectedStoreId: null, orgMaxTeams, orgDowngradeDismissed, orgSnapshots,
      };
    });
  }

  function deleteTeam(store: Store) {
    addTrash('team', store.name, store, store.id);
    set((s) => ({ stores: s.stores.filter((s2) => s2.id !== store.id), selectedStoreId: null }));
  }

  function actuallyCreateStore() {
    const st = getState();
    const f = st.addForm;
    if (!f || !f.name.trim()) return;
    const id = 'store_' + randToken(5);
    const token = randToken(8);
    const seed = Math.floor(Math.random() * 9000) + 100;
    const base = 5500000;
    const store: Store = {
      id, name: f.name.trim(), owner: st.ownerProfile.name, seed, base, expRatio: 0.66, bg: paletteColor(st.stores.length),
      createdPeriod: currentPeriodKey(), royaltyRate: Math.max(0, f.royaltyRate || 0), useRoyalty: f.useRoyalty !== false,
      royaltyMode: f.royaltyMode || 'rate', royaltyAmount: f.royaltyAmount || 0, useSavings: f.useSavings, savings: f.savings,
      savingsMode: f.savingsMode || 'amount', savingsRate: f.savingsRate || 0,
    };
    const k = orgKey();
    set((s) => ({
      stores: s.stores.concat([store]), addStep: 'done', createdToken: token, createdName: store.name, copied: false,
      orgMaxTeams: { ...s.orgMaxTeams, [k]: Math.max(s.orgMaxTeams[k] == null ? s.stores.length : s.orgMaxTeams[k], s.stores.length + 1) },
    }));
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

  const value = useMemo<StoreApi>(() => ({ state, set, actions }), [state, set, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
