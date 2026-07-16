import type { AppState } from '../types';

// Real org/team/transaction/memo data now comes from Supabase (see
// src/state/dataLoader.ts) — this only seeds pre-login UI state and the
// still-unconnected admin/operator dashboard's demo data.
export function createInitialState(): AppState {
  return {
    page: 'list',
    layout: 'table',
    viewRole: 'hq',
    simRole: 'オーナー',
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

    hqTablePage: 1,
    hqTablePageSize: 20,

    unitLabel: null,
    unitLabelPlural: null,

    stores: [],
    members: [],
    hqMembers: [],
    transactions: {},
    memoTopics: [],
    trash: [],
    companyInfo: { name: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 },
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
    profilePasswordVisible: false,
    showProfileModal: false,
    emailChangeStep: null,
    emailChangeCodeInput: '',
    emailChangeError: '',
    passwordConfirmStep: false,

    editingCompanyInfo: false,
    companyNameError: false,
    editingUnitLabel: false,
    editingHqDefaults: false,

    confirmDelete: null,
    confirmChecked: false,

    pendingUpgrade: null,
    paymentFailed: false,

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

    // ===== everything below this line is still mock/local-only =====
    // (the operator/admin dashboard isn't wired to Supabase yet — see PR notes)
    adminView: true,
    adminOwnHqSetup: false,
    adminSearch: '',
    adminPrefFilter: '',
    adminSelectedOrgId: null,
    auditLog: [],
    adminTab: 'orgs',
    adminMockOrgs: [
      { id: 'mock_1', name: 'カフェ・ソレイユ本部', rep: '佐藤 健太', reading: 'かふぇそれいゆほんぶ さとうけんた', teams: 12, monthlySales: 8200000, plan: 'Emerald', status: 'active', joinedAt: '2025-02-10', address: '東京都渋谷区1-2-3',
        history: { '2026-05': { teams: 10, sales: 7100000 }, '2026-06': { teams: 11, sales: 7650000 }, '2026-07': { teams: 12, sales: 8200000 } } },
      { id: 'mock_2', name: 'クリーンサービス協会', rep: '山本 恵子', reading: 'くりーんさーびすきょうかい やまもとけいこ', teams: 34, monthlySales: 15400000, plan: 'Black', status: 'active', joinedAt: '2024-11-03', address: '大阪府大阪市北区4-5-6',
        history: { '2026-05': { teams: 31, sales: 14200000 }, '2026-06': { teams: 33, sales: 14900000 }, '2026-07': { teams: 34, sales: 15400000 } } },
      { id: 'mock_3', name: 'リノベ不動産FC', rep: '中村 大輔', reading: 'りのべふどうさんえふしー なかむらだいすけ', teams: 5, monthlySales: 3100000, plan: 'Free', status: 'frozen', joinedAt: '2025-06-21', address: '愛知県名古屋市中区7-8-9',
        history: { '2026-05': { teams: 5, sales: 3400000 }, '2026-06': { teams: 5, sales: 3250000 }, '2026-07': { teams: 5, sales: 3100000 } } },
      { id: 'mock_4', name: 'ベーカリーむぎ本部', rep: '小林 さくら', reading: 'べーかりーむぎほんぶ こばやしさくら', teams: 8, monthlySales: 5600000, plan: 'Blue', status: 'active', joinedAt: '2025-09-14', address: '福岡県福岡市博多区2-1-1',
        history: { '2026-05': { teams: 7, sales: 4900000 }, '2026-06': { teams: 7, sales: 5200000 }, '2026-07': { teams: 8, sales: 5600000 } } },
    ],
    adminMonth: '2026-07',
    adminPage: 1,
    adminPageSize: 20,
    adminActionMenuOrgId: null,
    adminDetailOrgId: null,

    billingProvider: 'stripe',
    billingApiKeys: { stripe: '', square: '' },
    settingsPlanPrices: null,
    settingsTerms:
`第1条（本規約について）
本規約は、運営事務局（以下「当社」）が提供するFC売上管理サービス（以下「本サービス」）の利用条件を定めるものです。

第2条（利用料金）
本サービスの利用料金は加盟チーム数に応じたプランごとに定め、毎月自動で課金します。

第3条（禁止事項）
利用者は、法令違反、不正アクセス、その他当社が不適切と判断する行為を行ってはなりません。`,
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
  };
}
