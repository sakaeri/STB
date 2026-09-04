import { useStore } from '../../state/store.tsx';
import { outerStyle, cardStyle, headerStyle } from './shared';
import LoginView from './LoginView';
import SignupView from './SignupView';
import ForgotView from './ForgotView';
import ResetView from './ResetView';
import VerifyView from './VerifyView';

export default function AuthScreen() {
  const { state } = useStore();
  const brandLogoUrl = state.logoMap['operator-logo'] || null;

  return (
    <div style={outerStyle}>
      <div style={cardStyle(400)}>
        <div style={headerStyle}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              background: brandLogoUrl ? `#fff url("${brandLogoUrl}") center/cover no-repeat` : state.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            {!brandLogoUrl && <div style={{ width: 19, height: 19, border: '2.5px solid #fff', borderRadius: 3, borderBottomWidth: 5 }} />}
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{state.brandName}</h1>
        </div>

        {state.authView === 'login' && <LoginView />}
        {state.authView === 'forgot' && <ForgotView />}
        {state.authView === 'reset' && <ResetView />}
        {state.authView === 'verify' && <VerifyView />}
        {state.authView === 'signup' && <SignupView />}
      </div>
    </div>
  );
}
