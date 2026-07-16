import { useStore } from '../../state/store.tsx';
import { bodyStyle, Field, ErrorBanner, primaryButtonStyle } from './shared';

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
      <Field
        label="パスワード"
        type="password"
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
      <div style={{ textAlign: 'center', fontSize: 11, color: '#c3c8d0', marginTop: 2 }}>
        デモ用: owner@example.com / demo1234（空欄のままログインも可）
      </div>
      <button
        onClick={actions.quickAdminLogin}
        style={{
          height: 38,
          borderRadius: 10,
          background: '#f3f4f7',
          border: '1.5px dashed #c7cbd3',
          color: '#5b6270',
          fontWeight: 700,
          fontSize: 12,
          marginTop: 2,
        }}
      >
        🛠 運営管理画面をお試しログイン
      </button>
    </div>
  );
}
