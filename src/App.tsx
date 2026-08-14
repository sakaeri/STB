import { useEffect, useMemo } from 'react';
import { useStore } from './state/store.tsx';
import AuthScreen from './components/auth/AuthScreen';
import HqSetupScreen from './components/hqSetup/HqSetupScreen';
import MainApp from './components/app/MainApp';
import AdminDashboard from './components/admin/AdminDashboard';
import InviteScreen from './components/invite/InviteScreen';
import TermsModal from './components/modals/TermsModal';
import ConfirmModal from './components/modals/ConfirmModal';

export default function App() {
  const { state, set } = useStore();

  // Restore session / unit label overrides / mobile flag on first mount.
  useEffect(() => {
    // Default layout follows device at first load only (table on desktop,
    // card on mobile — table needs horizontal scroll on narrow screens);
    // later resizes don't fight the user's own toggle choice.
    const initialMobile = window.innerWidth < 860;
    set({ isMobile: initialMobile, layout: initialMobile ? 'card' : 'table' });
    const onResize = () => set({ isMobile: window.innerWidth < 860 });
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
      // Invite links (/invite/<id>) are captured into state + localStorage
      // immediately, then the URL is normalized — this lets the invite
      // survive a signup's email-confirmation round trip (which lands back
      // on "/", not the original link) in the same browser.
      const m = window.location.pathname.match(/^\/invite\/([0-9a-fA-F-]{36})$/);
      if (m) {
        localStorage.setItem('fc_pendingInvite', m[1]);
        set({ pendingInviteId: m[1] });
        window.history.replaceState({}, '', '/');
      } else {
        const savedInvite = localStorage.getItem('fc_pendingInvite');
        if (savedInvite) set({ pendingInviteId: savedInvite });
      }
      // Supabase appends auth errors (expired/used email links, etc.) as a
      // URL hash it never cleans up itself — left alone it sits in the
      // address bar indefinitely (and shows up, unhelpfully, in mobile
      // browsers' auto print footer). Surface a friendly message instead
      // and strip it from the URL.
      if (window.location.hash.startsWith('#error=')) {
        set({ authError: '認証リンクが無効か、有効期限が切れています。もう一度お試しください。' });
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch { /* noop */ }
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the browser-tab favicon (and the icon picked up if the user does
  // "add to home screen") in sync with whatever operator logo is currently
  // set — updates automatically since it just follows logoMap.
  useEffect(() => {
    const logoUrl = state.logoMap['app-logo'] || state.logoMap['operator-logo'];
    if (!logoUrl) return;
    const iconLink = (document.querySelector("link[rel='icon']") as HTMLLinkElement | null) || document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.href = logoUrl;
    if (!iconLink.parentNode) document.head.appendChild(iconLink);
    const touchLink = (document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null) || document.createElement('link');
    touchLink.rel = 'apple-touch-icon';
    touchLink.href = logoUrl;
    if (!touchLink.parentNode) document.head.appendChild(touchLink);
  }, [state.logoMap]);

  const account = useMemo(() => state.accounts.find((a) => a.id === state.session) || null, [state.accounts, state.session]);

  let screen: React.ReactNode;
  if (state.pendingInviteId) {
    screen = <InviteScreen />;
  } else if (!state.authChecked) {
    // Nothing rendered yet while the very first Supabase session check is
    // still in flight — showing AuthScreen here would flash the login form
    // for an already-logged-in user before their restored session lands.
    screen = <BootLoading />;
  } else if (!state.session || !account) {
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
      <ConfirmModal />
    </>
  );
}

function BootLoading() {
  const { state } = useStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#eceef1' }}>
      <style>{`@keyframes fc-boot-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%',
          border: `3px solid ${state.accent}33`, borderTopColor: state.accent,
          animation: 'fc-boot-spin .7s linear infinite',
        }}
      />
    </div>
  );
}
