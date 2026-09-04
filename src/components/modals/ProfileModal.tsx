import { useStore } from '../../state/store.tsx';
import { accentSoft, roleBg } from '../../tokens';

const labelStyle: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#8a909a', display: 'block', marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: '100%', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, fontWeight: 500, outline: 'none', background: '#fff' };
const errorBannerStyle: React.CSSProperties = { fontSize: 12, color: '#d6453d', background: '#fbe7e5', borderRadius: 8, padding: '8px 12px' };

export default function ProfileModal() {
  const { state, actions } = useStore();
  if (!state.showProfileModal) return null;

  const accent = state.accent;
  const account = state.accounts.find((a) => a.id === state.session);
  const orgs = account?.orgs || [];
  const isAdmin = !!account?.isAdmin;
  const draft = state.profileDraft || { name: '', email: '', password: '' };
  const showEditForm = state.profileEditing && state.emailChangeStep !== 'code';
  const showEmailStep = state.emailChangeStep === 'code';

  return (
    <div
      onClick={actions.closeProfileModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 62, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 420, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(20,40,80,.28)', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: accent, color: '#fff', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            {(state.ownerProfile.name || '?').charAt(0)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{state.ownerProfile.name}</div>
            <div style={{ fontSize: 12, color: '#9aa0a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.ownerProfile.email}</div>
          </div>
          {!state.profileEditing && !state.profileSaved && (
            <button onClick={actions.openProfileEdit} style={{ height: 32, padding: '0 14px', borderRadius: 9, fontWeight: 700, fontSize: 12, color: accent, background: accentSoft(accent), flex: 'none', display: 'flex', alignItems: 'center', gap: 5, width: 80 }}>
              <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>✎</span>変更
            </button>
          )}
          {state.profileSaved && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1f9d6b', display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>✓ 保存しました</span>
          )}
        </div>

        {showEditForm && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>プロフィールを編集</div>
            <p style={{ margin: '-8px 0 0', fontSize: 11.5, color: '#9aa0a8', lineHeight: 1.6 }}>メールアドレス・パスワードを変更する場合は入力後に「変更を保存」を押してください。</p>
            <div>
              <label style={labelStyle}>名前</label>
              <input type="text" value={draft.name} onChange={(e) => actions.onOwnerProfileName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>メールアドレス</label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => actions.onOwnerProfileEmail(e.target.value)}
                placeholder={state.ownerProfile.email}
                style={inputStyle}
              />
              <div style={{ fontSize: 11, color: '#aab0b8', marginTop: 6 }}>変更する場合のみ、新しいメールアドレスを入力してください。</div>
            </div>
            <div>
              <label style={labelStyle}>パスワード（6文字以上）</label>
              <input
                type="text"
                value={draft.password}
                onChange={(e) => actions.onOwnerProfilePassword(e.target.value)}
                placeholder="変更する場合のみ入力してください"
                style={inputStyle}
              />
            </div>
            {state.profileError && <div style={errorBannerStyle}>{state.profileError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={actions.saveOwnerProfile} style={{ height: 33, borderRadius: 10, background: accent, color: '#fff', fontWeight: 700, fontSize: 12, padding: '0 20px', width: 140 }}>変更を保存</button>
              <button onClick={actions.cancelProfileEdit} style={{ height: 33, borderRadius: 10, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 12, padding: '0 20px', width: 122 }}>キャンセル</button>
            </div>
          </div>
        )}

        {showEmailStep && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>メールアドレスの確認</div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#9aa0a8', lineHeight: 1.6 }}>{draft.email} 宛に確認メールを送信しました。メール内のリンクを開くと変更が確定します。</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={actions.confirmEmailChange} style={{ height: 42, borderRadius: 10, background: accent, color: '#fff', fontWeight: 700, fontSize: 13.5, padding: '0 20px' }}>閉じる</button>
            </div>
          </div>
        )}

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3a4150' }}>管理簿のリスト</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orgs.map((o) => {
              const active = o.id === state.activeOrgId;
              return (
                <button
                  key={o.id}
                  onClick={() => actions.switchOrg(o.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 11, textAlign: 'left',
                    background: active ? accentSoft(accent) : '#f7f8fa',
                    border: active ? `1.5px solid ${accent}` : '1.5px solid transparent',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: accentSoft(accent), color: accent, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    {(o.name || '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: roleBg[o.role] || '#8a909a', background: '#eef0f3', padding: '3px 9px', borderRadius: 20, flex: 'none' }}>{o.role}</span>
                </button>
              );
            })}
            <button onClick={actions.openNewOrg} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', height: 44, borderRadius: 11, border: '1.5px dashed #d8dce2', color: '#6b7280', fontWeight: 700, fontSize: 12.5 }}>
              <span style={{ fontSize: 16, fontWeight: 400 }}>＋</span>本部を作成
            </button>
          </div>
        </div>
        {isAdmin && (
          <div style={{ padding: '0 24px 16px' }}>
            <button
              onClick={() => { actions.closeProfileModal(); actions.goAdminDashboard(); }}
              style={{ width: '100%', height: 38, borderRadius: 10, fontWeight: 700, fontSize: 12.5, color: '#6b7280', background: '#f0f2f5' }}
            >
              運営ダッシュボードへ
            </button>
          </div>
        )}
        <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={actions.logout} style={{ height: 32, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 12, color: '#c2453d', background: '#fbeaea', width: 112 }}>ログアウト</button>
          <button onClick={actions.closeProfileModal} style={{ height: 32, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 12, color: '#6b7280', background: '#f0f2f5', width: 112 }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
