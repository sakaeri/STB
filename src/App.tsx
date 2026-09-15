import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './state/store.tsx';
import { isPasswordRecoveryLink } from './lib/supabase';
import AuthScreen from './components/auth/AuthScreen';
import HqSetupScreen from './components/hqSetup/HqSetupScreen';
import MainApp from './components/app/MainApp';
import AdminDashboard from './components/admin/AdminDashboard';
import InviteScreen from './components/invite/InviteScreen';
import TermsModal from './components/modals/TermsModal';
import ConfirmModal from './components/modals/ConfirmModal';

// Its own JS/CSS chunk, loaded only for anonymous visitors landing on "/" —
// everyone going straight into the app (the common case) skips the extra
// ~10KB of marketing markup and the two webfonts it pulls in entirely.
const LandingPage = lazy(() => import('./components/landing/LandingPage'));

// The marketing landing page only makes sense at the bare root, and only
// when the URL isn't secretly an auth callback (password recovery / email
// confirmation links also land on "/" with a hash Supabase parses itself).
function computeShowLanding(): boolean {
  if (window.location.pathname !== '/') return false;
  if (isPasswordRecoveryLink()) return false;
  if (window.location.hash.startsWith('#error=') || /access_token|type=/.test(window.location.hash)) return false;
  return true;
}

export default function App() {
  const { state, set, actions } = useStore();
  const [showLanding, setShowLanding] = useState(computeShowLanding);
  const liveRef = useRef({ state, actions });
  liveRef.current = { state, actions };

  // Mobile Safari (and mobile Chrome to a lesser extent) can freeze the tab
  // — via the back/forward cache on navigation, or just suspending it in
  // the background — and resume it later without re-running any JS. If
  // that freeze happened to land mid-load or on a transient bad response,
  // reopening the tab just repaints whatever was frozen: no new auth event
  // fires, so none of the retry/race-guard logic in the org-load path ever
  // gets a chance to run again. Silently refetch the active org's data
  // whenever the tab comes back from being hidden a while, or is restored
  // from bfcache, so a stale/empty snapshot never just sits there.
  useEffect(() => {
    let hiddenAt = 0;
    const refreshIfStale = () => {
      const { state: s, actions: a } = liveRef.current;
      if (s.session && s.orgDataLoaded && s.activeOrgId) void a.reloadOrgData();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt && Date.now() - hiddenAt > 5000) refreshIfStale();
        hiddenAt = 0;
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refreshIfStale();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // Restore session / unit label overrides / mobile flag on first mount.
  useEffect(() => {
    // Default layout follows device at first load only (table on desktop,
    // card on mobile — table needs horizontal scroll on narrow screens);
    // later resizes don't fight the user's own toggle choice.
    const initialMobile = window.innerWidth < 860;
    set({ isMobile: initialMobile, layout: initialMobile ? 'card' : 'table' });
    const onResize = () => set({ isMobile: window.innerWidth < 860 });
    window.addEventListener('resize', onResize);
    const onPopState = () => setShowLanding(computeShowLanding());
    window.addEventListener('popstate', onPopState);
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
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('popstate', onPopState);
    };
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
    screen = showLanding ? (
      <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f6f7f4' }} />}>
        <LandingPage
          onNavigateToAuth={(view) => {
            window.history.pushState({}, '', '/login');
            setShowLanding(false);
            if (view === 'signup') actions.goSignup();
            else actions.goLogin();
          }}
        />
      </Suspense>
    ) : (
      <AuthScreen />
    );
  } else if (account.isAdmin) {
    if (state.adminOwnHqSetup) {
      // account.hqCreated flips true as soon as the light "which orgs am I
      // in" check comes back — well before the heavier per-org data fetch
      // does, so without this the app briefly renders MainApp over an
      // empty shell (no stores/sales yet) that reads as broken rather than
      // loading.
      screen = !account.hqCreated ? <HqSetupScreen /> : state.orgDataLoaded ? <MainApp /> : <BootLoading />;
    } else {
      screen = <AdminDashboard />;
    }
  } else if (!account.hqCreated) {
    screen = <HqSetupScreen />;
  } else if (!state.orgDataLoaded) {
    screen = <BootLoading />;
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
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#eceef1' }}>
      <style>{`
        /* Falls from higher up (more travel = more energy on impact) and
           the active fall/bounce/settle now fills most of the cycle —
           only a short hold at the end, rather than sitting still for as
           long as it moves. */
        @keyframes fc-boot-fall {
          0%   { transform: translateY(-220px) scale(.9); opacity: 0; }
          5%   { opacity: 1; }
          20%  { transform: translateY(-173px) scale(.94); }
          33%  { transform: translateY(0) scale(1); }
          36%  { transform: translateY(2px) scaleX(1.22) scaleY(.8); }
          42%  { transform: translateY(-16px) scaleX(.92) scaleY(1.12) rotate(-5deg); }
          47%  { transform: translateY(0) scaleX(1.08) scaleY(.95) rotate(4deg); }
          52%  { transform: translateY(-5px) scaleX(.97) scaleY(1.04) rotate(-2.5deg); }
          57%  { transform: translateY(0) scaleX(1.02) scaleY(.99) rotate(1.5deg); }
          65%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes fc-boot-shadow {
          0%, 5%  { transform: scale(.4); opacity: 0; }
          33%     { transform: scale(1); opacity: .16; }
          36%     { transform: scale(1.15); opacity: .2; }
          42%     { transform: scale(.75); opacity: .09; }
          47%     { transform: scale(1.05); opacity: .16; }
          65%, 100% { transform: scale(1); opacity: .14; }
        }
        /* Impact flourish, timed to the same landing moment (~33%) as the
           squash above: a fan of dust flecks kicks out past the mark's
           edges, invisible the rest of the loop. */
        @keyframes fc-boot-dust-1 {
          0%, 33% { transform: translate(0, 0) scale(0); opacity: 0; }
          38%     { transform: translate(-52px, -18px) scale(1); opacity: .85; }
          53%     { transform: translate(-68px, 2px) scale(.3); opacity: 0; }
          100%    { opacity: 0; }
        }
        @keyframes fc-boot-dust-2 {
          0%, 33% { transform: translate(0, 0) scale(0); opacity: 0; }
          40%     { transform: translate(-28px, -42px) scale(1); opacity: .85; }
          54%     { transform: translate(-36px, -22px) scale(.3); opacity: 0; }
          100%    { opacity: 0; }
        }
        @keyframes fc-boot-dust-3 {
          0%, 33% { transform: translate(0, 0) scale(0); opacity: 0; }
          37%     { transform: translate(0, -50px) scale(1); opacity: .85; }
          52%     { transform: translate(0, -26px) scale(.3); opacity: 0; }
          100%    { opacity: 0; }
        }
        @keyframes fc-boot-dust-4 {
          0%, 33% { transform: translate(0, 0) scale(0); opacity: 0; }
          40%     { transform: translate(28px, -42px) scale(1); opacity: .85; }
          54%     { transform: translate(36px, -22px) scale(.3); opacity: 0; }
          100%    { opacity: 0; }
        }
        @keyframes fc-boot-dust-5 {
          0%, 33% { transform: translate(0, 0) scale(0); opacity: 0; }
          38%     { transform: translate(52px, -18px) scale(1); opacity: .85; }
          53%     { transform: translate(68px, 2px) scale(.3); opacity: 0; }
          100%    { opacity: 0; }
        }
      `}</style>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="/icon-mark.png"
          alt=""
          style={{ width: 116, height: 95, transformOrigin: '50% 100%', animation: 'fc-boot-fall 3.5s ease-in-out infinite', position: 'relative', zIndex: 1 }}
        />
        <div style={{ position: 'relative', width: 64, height: 14, marginTop: 2 }}>
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(closest-side, rgba(20,40,32,.55), transparent)',
              animation: 'fc-boot-shadow 3.5s ease-in-out infinite',
            }}
          />
        </div>
        {/* Burst layer, centered on where the icon lands (its bottom edge) so
            the flecks fan out around the whole mark, not just the small
            shadow beneath it. */}
        <div style={{ position: 'absolute', left: '50%', top: 95, width: 0, height: 0 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              style={{
                position: 'absolute', left: 0, top: 0, width: 7, height: 7, marginLeft: -3.5, marginTop: -3.5,
                borderRadius: '50%', background: '#3cae7a',
                animation: `fc-boot-dust-${n} 3.5s ease-out infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
