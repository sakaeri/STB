import { useStore } from '../../state/store.tsx';
import { bodyStyle, Field, ErrorBanner, primaryButtonStyle } from './shared';

export default function ForgotView() {
  const { state, actions } = useStore();

  if (state.resetDone) {
    return (
      <div style={bodyStyle}>
        <div style={{ background: '#eef6f1', borderRadius: 10, padding: '11px 13px', fontSize: 12, color: '#2f7a5c', lineHeight: 1.6 }}>
          {state.forgotEmail} 宛にパスワード再設定用のリンクを送信しました。メール内のリンクを開いて新しいパスワードを設定してください。
        </div>
        <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8a909a', marginTop: 2 }}>
          <button onClick={actions.goLogin} style={{ color: state.accent, fontWeight: 700, display: 'inline' }}>ログインに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div style={bodyStyle}>
      <p style={{ margin: 0, fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>
        登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>
      <Field
        label="メールアドレス"
        type="email"
        value={state.forgotEmail}
        onChange={(e) => actions.onForgotEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <ErrorBanner error={state.authError} />
      <button onClick={actions.doForgotSubmit} style={primaryButtonStyle(state.accent)}>再設定リンクを送信</button>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8a909a', marginTop: 2 }}>
        <button onClick={actions.goLogin} style={{ color: state.accent, fontWeight: 700, display: 'inline' }}>ログインに戻る</button>
      </div>
    </div>
  );
}
