import { useStore } from '../../state/store.tsx';
import { bodyStyle, ErrorBanner, primaryButtonStyle } from './shared';

export default function VerifyView() {
  const { state, actions } = useStore();
  const pendingEmail = state.accounts.find((a) => a.id === state.pendingAccountId)?.email || '';

  return (
    <div style={{ ...bodyStyle, textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#eef6f1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          color: '#2f7a5c',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        @
      </div>
      <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>メールアドレスの確認</h2>
      <p style={{ margin: 0, fontSize: 12.5, color: '#8a909a', lineHeight: 1.7 }}>
        {pendingEmail} 宛に確認メールを送信しました。メール内のリンクを開くと認証が完了します。
      </p>
      {state.verifyResent && (
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1f9d6b' }}>✓ 確認メールを再送信しました</div>
      )}
      <button
        onClick={actions.doResendVerify}
        style={{ height: 38, borderRadius: 10, background: '#f0f2f5', color: '#3a4150', fontWeight: 700, fontSize: 13 }}
      >
        確認メールを再送信
      </button>
      <ErrorBanner error={state.authError} />
      <div style={{ borderTop: '1px dashed #e2e5ea', paddingTop: 14, marginTop: 2 }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, color: '#c3c8d0' }}>デモ用（実際のメール送信は行われません）</p>
        <button onClick={actions.doVerifyComplete} style={primaryButtonStyle(state.accent)}>
          メール内のリンクを開いた（認証完了）
        </button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8a909a', marginTop: 2 }}>
        <button onClick={actions.goLogin} style={{ color: state.accent, fontWeight: 700, display: 'inline' }}>ログイン画面に戻る</button>
      </div>
    </div>
  );
}
