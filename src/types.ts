export type Role = 'オーナー' | '管理者' | '編集者' | '閲覧者';
export type TeamRole = '管理者' | '編集者' | '閲覧者';

export interface Store {
  id: string;
  name: string;
  owner: string;
  seed: number;
  base: number;
  expRatio: number;
  bg: string;
  royaltyRate: number;
  useRoyalty?: boolean;
  royaltyMode?: 'rate' | 'amount';
  royaltyAmount?: number;
  useSavings?: boolean;
  savings?: number;
  savingsMode?: 'amount' | 'rate';
  savingsRate?: number;
  aggUnit?: string;
  createdPeriod?: string;
  adminName?: string;
  adminEmail?: string;
}

export interface Transaction {
  id: string;
  type: 'sales' | 'expense';
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  photo?: string | null;
}

export interface Member {
  name: string;
  role: Role;
  store: string;
}

export interface HqMember {
  name: string;
  role: Role;
}

export interface MemoRecord {
  id: string;
  label: string;
  text: string;
  date: string;
}

export interface MemoEntry {
  id: string;
  name: string;
  records: MemoRecord[];
}

export interface MemoTopic {
  id: string;
  name: string;
  storeId?: string | null;
  entries: MemoEntry[];
}

export interface TrashItem {
  id: string;
  type: 'team' | 'member' | 'hqMember' | 'memoTopic' | 'memoEntry' | 'memoRecord' | 'tx';
  label: string;
  deletedAt: number;
  data: unknown;
  storeId?: string | null;
}

export interface CompanyInfo {
  name: string;
  address: string;
  rep: string;
  closingDay: string; // 'eom' or day number as string
  fiscalStartMonth: number;
}

export interface Defaults {
  royaltyRate: number;
  useRoyalty?: boolean;
  royaltyMode?: 'rate' | 'amount';
  royaltyAmount?: number;
  useSavings: boolean;
  savings: number;
  savingsMode?: 'amount' | 'rate';
  savingsRate?: number;
}

export interface Org {
  id: string;
  name: string;
  role: Role;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  verified: boolean;
  hqCreated: boolean;
  orgs: Org[];
  isAdmin?: boolean;
}

export interface OrgSnapshot {
  stores: Store[];
  members: Member[];
  hqMembers: HqMember[];
  transactions: Record<string, Transaction[]>;
  memoTopics: MemoTopic[];
  trash: TrashItem[];
  companyInfo: CompanyInfo;
  confirmedPeriods: Record<string, boolean>;
  unitLabel: string | null;
  unitLabelPlural: string | null;
  defaults: Defaults;
}

export interface AuditLogEntry {
  ts: string;
  text: string;
}

export interface AdminMockOrg {
  id: string;
  name: string;
  rep: string;
  reading: string;
  teams: number;
  monthlySales: number;
  plan: string;
  status: 'active' | 'frozen';
  joinedAt: string;
  address: string;
  history: Record<string, { teams: number; sales: number }>;
}

export interface HqSetupForm {
  hqName: string;
  firstTeamName: string;
  address: string;
  rep: string;
  closingDay: string;
  fiscalStartMonth: number;
}

export interface AddStoreForm {
  name: string;
  royaltyRate: number;
  useRoyalty?: boolean;
  royaltyMode?: 'rate' | 'amount';
  royaltyAmount?: number;
  useSavings: boolean;
  savings: number;
  savingsMode?: 'amount' | 'rate';
  savingsRate?: number;
}

export interface EntryDraft {
  type: 'sales' | 'expense';
  storeId: string;
  date: string;
  title: string;
  amount: string;
  photo: string | null;
}

export interface MemoModalState {
  kind: 'topic' | 'entry' | 'record';
  topicId?: string | null;
  entryId?: string | null;
  storeId?: string | null;
  name?: string;
  label?: string;
  text?: string;
  date?: string;
}

export interface ConfirmDialogState {
  label: string;
  note: string;
  onConfirm: () => void;
  actionLabel?: string;
}

export interface PendingUpgrade {
  fromPlan: { name: string; color: string; min: number; max: number; price: number };
  toPlan: { name: string; color: string; min: number; max: number; price: number };
}

export interface PlanPriceOverride {
  min: number;
  max: number | null; // null = infinity
  price: number;
}

export type PageId = 'list' | 'memo' | 'settings';
export type LayoutId = 'table' | 'card' | 'detail';
export type AuthView = 'login' | 'signup' | 'forgot' | 'reset' | 'verify';
export type AdminTab = 'orgs' | 'settings';

export interface AppState {
  // navigation
  page: PageId;
  layout: LayoutId;
  viewRole: string; // 'hq' or store id
  simRole: Role;
  isMobile: boolean;
  selectedStoreId: string | null;
  editingTeamSettings: boolean;
  teamNameError: boolean;
  teamNameSnapshot: string;

  // period
  month: number; // 0-11
  year: number;
  aggUnit: 'day' | 'week' | 'month' | 'year';
  periodDate: string;
  closeBannerOpen: boolean;

  // hq table pagination
  hqTablePage: number;
  hqTablePageSize: number;

  // brand
  unitLabel: string | null;
  unitLabelPlural: string | null;

  // data
  stores: Store[];
  members: Member[];
  hqMembers: HqMember[];
  transactions: Record<string, Transaction[]>;
  memoTopics: MemoTopic[];
  trash: TrashItem[];
  companyInfo: CompanyInfo;
  confirmedPeriods: Record<string, boolean>;
  defaults: Defaults;

  // add store modal
  showAdd: boolean;
  addStep: 'form' | 'done';
  addForm: AddStoreForm | null;
  createdToken: string;
  createdName: string;
  copied: boolean;

  // member invite modal
  showMemberInvite: boolean;
  memberInviteToken: string;
  memberInviteStoreName: string;
  memberInviteCopied: boolean;

  // entry (sales/expense) modal
  showEntry: boolean;
  entryDraft: EntryDraft | null;

  // fab
  showFabMenu: boolean;

  // multi-org
  activeOrgId: string | null;
  hqNameOverride: string | null;
  orgMaxTeams: Record<string, number>;
  orgDowngradeDismissed: Record<string, number | null>;
  orgSnapshots: Record<string, OrgSnapshot>;
  showNewOrgModal: boolean;
  hqSetupForm: HqSetupForm;
  hqSetupStep: 'basic' | 'optional';

  // account / auth
  accounts: Account[];
  session: string | null;
  authView: AuthView;
  authEmail: string;
  authPassword: string;
  authError: string;
  signupForm: { name: string; email: string; password: string } | null;
  pendingAccountId: string | null;
  forgotEmail: string;
  resetAccountId: string | null;
  resetPassword: string;
  resetPasswordConfirm: string;
  resetDone: boolean;
  verifyResent: boolean;
  loginFailCount: Record<string, number>;
  loginLockUntil: Record<string, number>;

  // profile
  ownerProfile: { name: string; email: string; password: string };
  profileDraft: { name: string; email: string; password: string } | null;
  profileEditing: boolean;
  profileSaved: boolean;
  profileError: string;
  profilePasswordVisible: boolean;
  showProfileModal: boolean;
  emailChangeStep: 'code' | null;
  emailChangeCodeInput: string;
  emailChangeError: string;
  passwordConfirmStep: boolean;

  // company/hq settings editing flags
  editingCompanyInfo: boolean;
  companyNameError: boolean;
  editingUnitLabel: boolean;
  editingHqDefaults: boolean;

  // trash / confirm
  confirmDelete: ConfirmDialogState | null;
  confirmChecked: boolean;

  // plan / payment
  pendingUpgrade: PendingUpgrade | null;
  paymentFailed: boolean;

  // memo
  memoNav: { topicId: string | null; entryId: string | null };
  memoModal: MemoModalState | null;

  // tx detail modal
  txDetail: unknown | null;

  // logo editor
  showLogoEditor: boolean;
  logoMap: Record<string, string>;

  // terms modal
  showTermsModal: boolean;
  termsModalText: string;

  // admin
  adminView: boolean;
  adminOwnHqSetup: boolean;
  adminSearch: string;
  adminPrefFilter: string;
  adminSelectedOrgId: string | null;
  auditLog: AuditLogEntry[];
  adminTab: AdminTab;
  adminMockOrgs: AdminMockOrg[];
  adminMonth: string; // YYYY-MM
  adminPage: number;
  adminPageSize: number;
  adminActionMenuOrgId: string | null;
  adminDetailOrgId: string | null;

  // app settings (admin)
  billingProvider: 'stripe' | 'square';
  billingApiKeys: { stripe: string; square: string };
  settingsPlanPrices: Record<string, PlanPriceOverride> | null;
  settingsTerms: string;
  paymentGraceDays: number;
  showLogoSaved: boolean;
  showBillingSaved: boolean;
  showTermsSaved: boolean;
  logoDirty: boolean;
  billingDirty: boolean;
  termsDirty: boolean;
  copiedWebhook: boolean;

  brandName: string;
  accent: string;
}
