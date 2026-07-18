import { useStore } from '../../state/store.tsx';
import { bodyStyle, Field, PasswordField, ErrorBanner, primaryButtonStyle } from './shared';

export default function SignupView() {
  const { state, actions } = useStore();
  const form = state.signupForm || { name: '', email: '', password: '' };
  const canSubmit = !!(form.name.trim() && form.email.trim() && form.password.trim());

  return (
    <div style={bodyStyle}>
      <Field
        label="お名前"
        required
        type="text"
        value={form.name}
        onChange={(e) => actions.onSignupName(e.target.value)}
        placeholder="例：山田 太郎"
      />
      <Field
        label="メールアドレス"
        required
        type="email"
        value={form.email}
        onChange={(e) => actions.onSignupEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <PasswordField
        label="パスワード"
        required
        value={form.password}
        onChange={(e) => actions.onSignupPassword(e.target.value)}
        placeholder="8文字以上"
      />
      <ErrorBanner error={state.authError} />
      <div style={{ textAlign: 'center', fontSize: 11, color: '#aab0b8', lineHeight: 1.6 }}>
        登録すると
        <button
          onClick={actions.openTermsModal}
          style={{ color: state.accent, fontWeight: 700, display: 'inline', textDecoration: 'underline' }}
        >
          利用規約
        </button>
        に同意したものとみなされます。
      </div>
      <button
        onClick={actions.doSignup}
        style={primaryButtonStyle(state.accent, { opacity: canSubmit ? 1 : 0.5 })}
      >
        プロフィールを作成
      </button>
      <div style={{ textAlign: 'center', fontSize: 11.5, color: '#aab0b8', lineHeight: 1.6 }}>
        作成後、本部を立ち上げるか、招待URLからチームの管理者として参加できます。
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8a909a', marginTop: 2 }}>
        すでにアカウントをお持ちの方は
        <button onClick={actions.goLogin} style={{ color: state.accent, fontWeight: 700, display: 'inline' }}>ログイン</button>
      </div>
    </div>
  );
}
