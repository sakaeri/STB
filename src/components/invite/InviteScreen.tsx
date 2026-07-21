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

  useEffect(() => {
    if (state.session && pendingInviteId && inviteInfo?.valid && !state.inviteRedeeming && !state.inviteError) {
      void actions.redeemPendingInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.session, inviteInfo]);

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

  return (
    <div style={outerStyle}>
      <div style={cardStyle(400)}>
        <div style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
            {errorText ? '参加できませんでした' : '参加処理中です…'}
          </h1>
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
