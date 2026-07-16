import type { AppState } from '../types';

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

    month: 6,
    year: 2026,
    aggUnit: 'month',
    periodDate: '2026-07-05',
    closeBannerOpen: false,

    hqTablePage: 1,
    hqTablePageSize: 20,

    unitLabel: null,
    unitLabelPlural: null,

    stores: [
      { id: 'shibuya', name: '渋谷店', owner: '佐藤 健一', seed: 0, base: 8200000, expRatio: 0.64, bg: '#3f6fb5', royaltyRate: 5, useSavings: true, savings: 50000 },
      { id: 'shinjuku', name: '新宿店', owner: '鈴木 美咲', seed: 1, base: 9500000, expRatio: 0.63, bg: '#2f8f6b', royaltyRate: 5, useSavings: true, savings: 50000 },
      { id: 'ikebukuro', name: '池袋店', owner: '高橋 大輔', seed: 2, base: 7100000, expRatio: 0.67, bg: '#9a6bcf', royaltyRate: 5, useSavings: true, savings: 50000 },
      { id: 'yokohama', name: '横浜店', owner: '田中 由美', seed: 3, base: 6800000, expRatio: 0.66, bg: '#c77d3a', royaltyRate: 4, useSavings: true, savings: 30000 },
      { id: 'omiya', name: '大宮店', owner: '伊藤 翔太', seed: 4, base: 5400000, expRatio: 0.70, bg: '#c2566b', royaltyRate: 6, useSavings: false, savings: 50000 },
      { id: 'kawasaki', name: '川崎店', owner: '渡辺 彩', seed: 5, base: 6200000, expRatio: 0.65, bg: '#4a8fb8', royaltyRate: 5, useSavings: true, savings: 50000 },
      { id: 'chiba', name: '千葉店', owner: '山本 健', seed: 6, base: 4900000, expRatio: 0.69, bg: '#6b7f4a', royaltyRate: 5, useSavings: true, savings: 40000 },
      { id: 'machida', name: '町田店', owner: '中村 桜', seed: 7, base: 5700000, expRatio: 0.66, bg: '#b5853f', royaltyRate: 5, useSavings: true, savings: 50000 },
    ],
    members: [
      { name: '田中 由美', role: 'オーナー', store: '本部' },
      { name: '佐藤 健一', role: '管理者', store: '渋谷店' },
      { name: '鈴木 美咲', role: '管理者', store: '新宿店' },
      { name: '高橋 大輔', role: '管理者', store: '池袋店' },
      { name: '伊藤 翔太', role: '管理者', store: '大宮店' },
      { name: '渡辺 彩', role: '閲覧者', store: '川崎店' },
    ],
    hqMembers: [{ name: '田中 由美', role: 'オーナー' }],
    transactions: {},
    memoTopics: [
      {
        id: 't1', name: 'スタッフ情報', entries: [
          { id: 'e1', name: '山田 太郎', records: [
            { id: 'r1', label: '振込先', text: '◯◯銀行 ◯◯支店 普通1234567', date: '2026-04-02' },
            { id: 'r2', label: '入院期間', text: '2026/5/10〜5/20 産休のため休職。緊急連絡は配偶者まで。', date: '2026-05-10' },
          ] },
          { id: 'e2', name: '佐藤 花子', records: [
            { id: 'r3', label: '緊急連絡先', text: '090-xxxx-xxxx（配偶者）', date: '2026-03-15' },
          ] },
        ],
      },
      {
        id: 't2', name: '設備・什器', entries: [
          { id: 'e3', name: '渋谷店 エアコン', records: [
            { id: 'r4', label: '点検記録', text: 'フィルター交換済み。次回点検は10月予定。', date: '2026-06-01' },
          ] },
        ],
      },
    ],
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

    activeOrgId: 'org1',
    hqNameOverride: null,
    orgMaxTeams: {},
    orgDowngradeDismissed: {},
    orgSnapshots: {
      org2: {
        stores: [{ id: 'store_hb1', name: '中目黒本店', owner: '鈴木 大輔', seed: 4210, base: 3200000, expRatio: 0.6, bg: '#9a6bcf', royaltyRate: 5 }],
        members: [], hqMembers: [{ name: '田中 由美', role: 'オーナー' }], transactions: {}, memoTopics: [], trash: [],
        companyInfo: { name: 'ハミングバード珈琲', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 },
        confirmedPeriods: {}, unitLabel: '店舗', unitLabelPlural: '加盟店', defaults: { royaltyRate: 5, useSavings: true, savings: 30000 },
      },
    },
    showNewOrgModal: false,
    hqSetupForm: { hqName: '', firstTeamName: '', address: '', rep: '', closingDay: 'eom', fiscalStartMonth: 4 },
    hqSetupStep: 'basic',

    accounts: [
      { id: 'acc1', name: '田中 由美', email: 'owner@example.com', password: 'demo1234', verified: true, hqCreated: true, orgs: [{ id: 'org1', name: 'FC売上管理簿 本部', role: 'オーナー' }, { id: 'org2', name: 'ハミングバード珈琲', role: '管理者' }] },
      { id: 'admin1', name: '運営事務局', email: 'ops@fc-admin.example.com', password: 'admin1234', verified: true, hqCreated: false, orgs: [], isAdmin: true },
    ],
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

    ownerProfile: { name: '田中 由美', email: 'owner@example.com', password: 'demo1234' },
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
