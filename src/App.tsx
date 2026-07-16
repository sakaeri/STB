import { useEffect, useMemo } from 'react';
import { useStore } from './state/store.tsx';
import AuthScreen from './components/auth/AuthScreen';
import HqSetupScreen from './components/hqSetup/HqSetupScreen';
import MainApp from './components/app/MainApp';
import AdminDashboard from './components/admin/AdminDashboard';
import TermsModal from './components/modals/TermsModal';

export default function App() {
  const { state, set, actions } = useStore();

  // Restore session / unit label overrides / mobile flag on first mount.
  useEffect(() => {
    const onResize = () => set({ isMobile: window.innerWidth < 860 });
    onResize();
    window.addEventListener('resize', onResize);
    try {
      const savedUnit = localStorage.getItem('fc_unitLabel');
      const savedPlural = localStorage.getItem('fc_unitLabelPlural');
      if (savedUnit || savedPlural) set({ unitLabel: savedUnit || null, unitLabelPlural: savedPlural || null });
      const savedSession = localStorage.getItem('fc_session');
      if (savedSession) {
        set((s) => {
          const acc = s.accounts.find((a) => a.id === savedSession);
          if (!acc) return {};
          return { session: savedSession, ownerProfile: { name: acc.name, email: acc.email, password: acc.password } };
        });
      }
    } catch { /* noop */ }
    actions.purgeTrash();
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const account = useMemo(() => state.accounts.find((a) => a.id === state.session) || null, [state.accounts, state.session]);

  let screen: React.ReactNode;
  if (!state.session || !account) {
    screen = <AuthScreen />;
  } else if (account.isAdmin) {
    if (state.adminOwnHqSetup) {
      screen = account.hqCreated ? <MainApp /> : <HqSetupScreen />;
    } else {
      screen = <AdminDashboard />;
    }
  } else if (!account.hqCreated) {
    screen = <HqSetupScreen />;
  } else {
    screen = <MainApp />;
  }

  return (
    <>
      {screen}
      {state.showTermsModal && <TermsModal />}
    </>
  );
}
