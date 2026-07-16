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
import ConfirmModal from '../modals/ConfirmModal';
import TxDetailModal from '../modals/TxDetailModal';
import LogoEditorModal from '../modals/LogoEditorModal';
import EntryModal from '../modals/EntryModal';
import AddStoreModal from '../modals/AddStoreModal';
import MemberInviteModal from '../modals/MemberInviteModal';

export default function MainApp() {
  const { state } = useStore();

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', background: '#eceef1' }}>
      <Sidebar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
        <Topbar />
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
      <ConfirmModal />
      <TxDetailModal />
      <LogoEditorModal />
      <EntryModal />
      <AddStoreModal />
      <MemberInviteModal />
    </div>
  );
}
