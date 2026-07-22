import { useStore } from '../../state/store.tsx';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import Fab from './Fab';
import SalesListPage from './SalesListPage';
import StoreDrawer from './StoreDrawer';
import MemoPage from '../memo/MemoPage';
import SettingsPage from '../settings/SettingsPage';
import ProfileModal from '../modals/ProfileModal';
import NewOrgModal from '../modals/NewOrgModal';
import UpgradeModal from '../modals/UpgradeModal';
import TxDetailModal from '../modals/TxDetailModal';
import LogoEditorModal from '../modals/LogoEditorModal';
import EntryModal from '../modals/EntryModal';
import BankCsvImportModal from '../modals/BankCsvImportModal';
import AddStoreModal from '../modals/AddStoreModal';
import MemberInviteModal from '../modals/MemberInviteModal';
import CheckoutModal from '../modals/CheckoutModal';

export default function MainApp() {
  const { state } = useStore();

  return (
    <div style={{ display: 'flex', width: '100%', height: '100dvh', overflow: 'hidden', background: '#fff' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', minWidth: 0, background: '#fff' }}>
        <div style={{ flex: 'none', background: '#fff', paddingTop: 'env(safe-area-inset-top)' }} />
        <Topbar />
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, background: '#eceef1' }}>
          {state.page === 'list' && <SalesListPage />}
          {state.page === 'memo' && <MemoPage />}
          {state.page === 'settings' && <SettingsPage />}
        </div>
        <BottomNav />
      </main>

      <Fab />
      <StoreDrawer />

      <ProfileModal />
      <NewOrgModal />
      <UpgradeModal />
      <TxDetailModal />
      <LogoEditorModal />
      <EntryModal />
      <BankCsvImportModal />
      <AddStoreModal />
      <MemberInviteModal />
      <CheckoutModal />
    </div>
  );
}
