import { useEffect } from 'react';
import { useStore } from '../../state/store.tsx';
import AuthScreen from '../auth/AuthScreen';
import { outerStyle, cardStyle, headerStyle, primaryButtonStyle } from '../auth/shared';

function inviteReasonText(reason?: string): string {
  if (reason === 'used') return 'このリンクは使用済みです。お手数ですが再度招待リンクを送付してもらってください。';
  if (reason === 'expired') return 'この招待URLの有効期限が切れています。お手数ですが再度招待リンクを送付してもらってください。';
  if (reason === 'not_found') return 'この招待URLは無効です。';
  return '招待情報の取得に失敗しました。';
}

export default function InviteScreen() {
  const { state, actions } = useStore();
  const { pendingInviteId, inviteInfo } = state;

  useEffect(() => {
    if (pendingInviteId) void actions.loadInvitePreview(pendingInviteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInviteId]);

  if (!state.session) {
    return (
      <div style={{ position: 'relative' }}>
        <AuthScreen />
        {inviteInfo && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '20px 24px 0' }}>
            <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: '1px solid #e7e9ed', borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 30px rgba(20,40,80,.08)' }}>
              {inviteInfo.valid ? (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>
                    {inviteInfo.scope === 'org' ? `「${inviteInfo.orgName}」への招待` : `「${inviteInfo.teamName}」への招待`}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.7 }}>
                    {inviteInfo.orgName} に「{inviteInfo.role}」として参加します。ログインまたは新規登録すると自動的に参加します。
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: '#d6453d', lineHeight: 1.7 }}>{inviteReasonText(inviteInfo.reason)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // A reused/expired/invalid link never gets to redeemPendingInvite at all
  // (that only fires when inviteInfo.valid), so inviteError alone never
  // covers this case — without also checking inviteInfo here, this stayed
  // stuck on "参加処理中です…" forever for an already-logged-in user
  // opening a dead link, reading as a bug rather than a clear error.
  const invalidReason = inviteInfo && !inviteInfo.valid ? inviteReasonText(inviteInfo.reason) : null;
  const errorText = state.inviteError || invalidReason;

  // Already logged in: confirm before joining, rather than silently
  // redeeming the instant the invite loads — unlike the not-logged-in
  // flow above (where logging in/signing up is itself the "yes, I want
  // this" action), a casual or accidental tap on the link here has no
  // such signal, so joining shouldn't happen without an explicit choice.
  if (inviteInfo?.valid && !state.inviteRedeeming && !errorText) {
    return (
      <div style={outerStyle}>
        <div style={cardStyle(400)}>
          <div style={headerStyle}>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {inviteInfo.scope === 'org' ? `「${inviteInfo.orgName}」への招待` : `「${inviteInfo.teamName}」への招待`}
            </h1>
          </div>
          <div style={{ padding: '8px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, color: '#6b7280', textAlign: 'center', lineHeight: 1.7 }}>
              {inviteInfo.orgName} に「{inviteInfo.role}」として参加しますか？
            </div>
            <button onClick={actions.redeemPendingInvite} style={primaryButtonStyle(state.accent)}>参加する</button>
            <button onClick={actions.dismissInvite} style={{ fontSize: 12.5, color: '#8a909a', textAlign: 'center' }}>キャンセル</button>
          </div>
        </div>
      </div>
    );
  }

  const title = errorText ? '参加できませんでした' : state.inviteRedeeming ? '参加処理中です…' : '読み込み中…';

  return (
    <div style={outerStyle}>
      <div style={cardStyle(400)}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h1>
        </div>
        <div style={{ padding: '8px 28px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {errorText && (
            <>
              <div style={{ fontSize: 12.5, color: '#d6453d', textAlign: 'center', lineHeight: 1.7 }}>{errorText}</div>
              <button onClick={actions.dismissInvite} style={primaryButtonStyle(state.accent)}>アプリに戻る</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
