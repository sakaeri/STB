import type { AppState } from '../types';
import { currentPeriodKey } from './calc';
import { DEFAULT_PRICING } from '../tokens';

// Real org/team/transaction/memo data now comes from Supabase (see
// src/state/dataLoader.ts) — this only seeds pre-login UI state and the
// still-unconnected admin/operator dashboard's demo data.
export function createInitialState(): AppState {
  return {
    page: 'list',
    layout: 'table',
    viewRole: 'hq',
    isMobile: false,
    selectedStoreId: null,
    editingTeamSettings: false,
    teamNameError: false,
    teamNameSnapshot: '',

    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    aggUnit: 'month',
    periodDate: new Date().toISOString().slice(0, 10),
    closeBannerOpen: false,
    dailyCloseBannerOpen: false,

    hqTablePage: 1,
    hqTablePageSize: 20,

    unitLabel: null,
    unitLabelPlural: null,
    orgStatus: 'active',
    hasStripeSubscription: false,
    orgBilledStep: 0,

    stores: [],
    members: [],
    hqMembers: [],
    transactions: {},
    entryPresets: {},
    memoTopics: [],
    trash: [],
    companyInfo: { name: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4, dailyClosingEnabled: false },
    confirmedPeriods: {},
    defaults: { royaltyRate: 5, useSavings: true, savings: 50000 },

    showAdd: false,
    addStep: 'form',
    addForm: null,
    createdToken: '',
    createdName: '',
    copied: false,

    showMemberInvite: false,
    memberInviteToken: '',
    memberInviteStoreName: '',
    memberInviteCopied: false,

    showEntry: false,
    entryDraft: null,

    bankCsvImport: null,
    bankCsvImportLoading: false,

    showFabMenu: false,

    activeOrgId: null,
    hqNameOverride: null,
    orgMaxTeams: {},
    orgDowngradeDismissed: {},
    orgSnapshots: {},
    showNewOrgModal: false,
    hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 },
    hqSetupStep: 'basic',

    accounts: [],
    session: null,
    authView: 'login',
    authEmail: '',
    authPassword: '',
    authError: '',
    signupForm: null,
    pendingAccountId: null,
    forgotEmail: '',
    resetAccountId: null,
    resetPassword: '',
    resetPasswordConfirm: '',
    resetDone: false,
    verifyResent: false,
    loginFailCount: {},
    loginLockUntil: {},

    ownerProfile: { name: '', email: '', password: '' },
    profileDraft: null,
    profileEditing: false,
    profileSaved: false,
    profileError: '',
    showProfileModal: false,
    emailChangeStep: null,
    emailChangeCodeInput: '',
    emailChangeError: '',
    passwordConfirmStep: false,

    editingCompanyInfo: false,
    companyNameError: false,
    editingHqDefaults: false,

    confirmDelete: null,
    confirmChecked: false,

    pendingUpgrade: null,
    billingCheckoutLoading: false,
    checkoutModalOpen: false,
    checkoutClientSecret: null,
    planChangeLoading: false,
    planChangeSaved: false,

    memoNav: { topicId: null, entryId: null },
    memoModal: null,

    txDetail: null,

    showLogoEditor: false,
    logoMap: {},

    showTermsModal: false,
    termsModalText:
`第1条（本規約について）
本規約は、運営事務局（以下「当社」）が提供するFC売上管理サービス（以下「本サービス」）の利用条件を定めるものです。

第2条（利用料金）
本サービスの利用料金は加盟チーム数に応じたプランごとに定め、毎月自動で課金します。

第3条（禁止事項）
利用者は、法令違反、不正アクセス、その他当社が不適切と判断する行為を行ってはなりません。`,

    // ===== admin/operator dashboard — populated from Supabase on login for
    // accounts with profiles.is_admin = true (see src/state/adminData.ts) =====
    adminView: true,
    adminOwnHqSetup: false,
    adminSearch: '',
    adminPrefFilter: '',
    adminSelectedOrgId: null,
    auditLog: [],
    adminTab: 'orgs',
    adminMockOrgs: [],
    adminMonth: currentPeriodKey(),
    adminPage: 1,
    adminPageSize: 20,
    adminActionMenuOrgId: null,
    adminDetailOrgId: null,

    billingProvider: 'stripe',
    billingApiKeys: { stripe: '', square: '' },
    pricingConfig: DEFAULT_PRICING,
    settingsTerms: '',
    paymentGraceDays: 7,
    showLogoSaved: false,
    showBillingSaved: false,
    showTermsSaved: false,
    logoDirty: false,
    billingDirty: false,
    termsDirty: false,
    copiedWebhook: false,

    brandName: 'STB',
    accent: '#1f7a5a',

    pendingInviteId: null,
    inviteInfo: null,
    inviteRedeeming: false,
    inviteError: '',
  };
}
