import { useStore } from '../../state/store.tsx';
import { bodyStyle, Field, ErrorBanner, primaryButtonStyle } from './shared';

export default function ResetView() {
  const { state, actions } = useStore();
  return (
    <div style={bodyStyle}>
      <div style={{ background: '#eef6f1', borderRadius: 10, padding: '11px 13px', fontSize: 12, color: '#2f7a5c', lineHeight: 1.6 }}>
        新しいパスワードを設定してください。
      </div>
      <Field
        label="新しいパスワード"
        type="text"
        value={state.resetPassword}
        onChange={(e) => actions.onResetPassword(e.target.value)}
        placeholder="8文字以上"
      />
      <Field
        label="新しいパスワード（確認）"
        type="text"
        value={state.resetPasswordConfirm}
        onChange={(e) => actions.onResetPasswordConfirm(e.target.value)}
        placeholder="8文字以上"
      />
      <ErrorBanner error={state.authError} />
      <button onClick={actions.doResetPassword} style={primaryButtonStyle(state.accent)}>パスワードを再設定</button>
    </div>
  );
}
