import { useStore } from '../../state/store.tsx';
import { bodyStyle, Field, PasswordField, ErrorBanner, primaryButtonStyle } from './shared';

export default function LoginView() {
  const { state, actions } = useStore();
  return (
    <div style={bodyStyle}>
      <Field
        label="メールアドレス"
        type="email"
        value={state.authEmail}
        onChange={(e) => actions.onAuthEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <PasswordField
        label="パスワード"
        value={state.authPassword}
        onChange={(e) => actions.onAuthPassword(e.target.value)}
        placeholder="••••••••"
      />
      <ErrorBanner error={state.authError} />
      <button onClick={actions.doLogin} style={primaryButtonStyle(state.accent)}>ログイン</button>
      <div style={{ textAlign: 'center', fontSize: 12, marginTop: -4 }}>
        <button onClick={actions.goForgot} style={{ color: '#8a909a', fontWeight: 600 }}>パスワードをお忘れですか？</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8a909a', marginTop: 2 }}>
        アカウントをお持ちでない方は
        <button onClick={actions.goSignup} style={{ color: state.accent, fontWeight: 700, display: 'inline' }}>新規作成</button>
      </div>
    </div>
  );
}
