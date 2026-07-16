import { useStore } from '../../state/store.tsx';

export default function MemberInviteModal() {
  const { state, actions } = useStore();
  if (!state.showMemberInvite) return null;

  const accent = state.accent;
  const inviteUrl = state.memberInviteToken ? `${window.location.origin}/invite/${state.memberInviteToken}` : '';

  return (
    <div
      onClick={actions.closeMemberInvite}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 440, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.28)', overflow: 'hidden', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '26px 24px 18px', textAlign: 'center', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: accent, fontSize: 21, fontWeight: 400 }}>
            ＋
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{state.memberInviteStoreName}にメンバーを招待</h2>
          <p style={{ margin: '7px 0 0', fontSize: 12.5, color: '#8a909a', lineHeight: 1.6 }}>
            下の招待URLを本人に共有してください。参加すると初期権限「閲覧者」でメンバー一覧に加わり、必要に応じて権限を変更できます。
          </p>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 8 }}>招待URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: '#f7f8fa', border: '1px solid #e7e9ed', borderRadius: 10, padding: '11px 13px', fontSize: 12.5, color: '#3a4150', fontFamily: 'ui-monospace,Menlo,monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
              {inviteUrl}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => actions.copyMemberInvite()); }}
              style={{ height: 42, padding: '0 16px', borderRadius: 10, fontWeight: 700, fontSize: 12.5, flex: 'none', color: state.memberInviteCopied ? '#fff' : '#46505e', background: state.memberInviteCopied ? '#1f9d6b' : '#f0f2f5' }}
            >
              {state.memberInviteCopied ? 'コピーしました' : 'コピー'}
            </button>
          </div>
          <div style={{ marginTop: 14, background: '#fbf1dc', borderRadius: 11, padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#d99a2b', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              !
            </div>
            <div style={{ fontSize: 11.5, color: '#8a6a2a', lineHeight: 1.6 }}>
              このリンクは1回限り使用できます。使用後は無効になり、使い回しできません。新しいメンバーを招待する場合は、その都度URLを発行してください。
            </div>
          </div>
        </div>
        <div style={{ padding: '0 24px 22px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={actions.closeMemberInvite} style={{ height: 36, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent, width: 108 }}>
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
