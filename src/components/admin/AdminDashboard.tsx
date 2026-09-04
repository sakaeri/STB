import { useStore } from '../../state/store.tsx';
import { accentSoft } from '../../tokens';
import { adminMonthLabel, maxAdminMonth } from './shared';
import OrgsTab from './OrgsTab';
import AppSettingsTab from './AppSettingsTab';

export default function AdminDashboard() {
  const { state, actions } = useStore();

  const latestMonth = maxAdminMonth(state.adminMockOrgs);
  const nextDisabled = state.adminMonth >= latestMonth;

  return (
    <div style={{ minHeight: '100vh', background: '#eceef1', padding: '32px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>運営ダッシュボード</h1>
            <p style={{ margin: '5px 0 0', fontSize: 12.5, color: '#8a909a' }}>
              登録されている本部の一覧・利用状況・課金状況を管理します。
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e7e9ed',
                borderRadius: 10, padding: '6px 10px', width: 185, height: 42, flex: 'none',
              }}
            >
              <button
                onClick={() => actions.adminPrevMonth()}
                style={{ width: 26, height: 26, borderRadius: 7, background: '#f0f2f5', color: '#6b7280', fontWeight: 700 }}
              >
                ‹
              </button>
              <div style={{ fontSize: 13, fontWeight: 700, minWidth: 90, textAlign: 'center' }}>
                {adminMonthLabel(state.adminMonth)}
              </div>
              <button
                onClick={() => !nextDisabled && actions.adminNextMonth()}
                disabled={nextDisabled}
                style={{
                  width: 26, height: 26, borderRadius: 7, background: '#f0f2f5', color: '#6b7280', fontWeight: 700,
                  opacity: nextDisabled ? 0.4 : 1, cursor: nextDisabled ? 'default' : 'pointer',
                }}
              >
                ›
              </button>
            </div>
            <button
              onClick={() => actions.adminOpenOwnHq()}
              style={{
                height: 40, padding: '0 16px', borderRadius: 10, background: accentSoft(state.accent), color: state.accent,
                fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', flex: 'none',
              }}
            >
              自社の管理簿を開く / 作成
            </button>
            <button
              onClick={() => actions.logout()}
              style={{
                height: 40, padding: '0 16px', borderRadius: 10, background: '#fff', border: '1.5px solid #e2e5ea',
                color: '#6b7280', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', flex: 'none',
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, background: '#fff', border: '1px solid #e7e9ed', borderRadius: 11, padding: 5, width: 'fit-content' }}>
          <button
            onClick={() => actions.setAdminTabOrgs()}
            style={{
              height: 34, padding: '0 18px', borderRadius: 8, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', flex: 'none',
              background: state.adminTab === 'orgs' ? '#fff' : 'transparent',
              color: state.adminTab === 'orgs' ? state.accent : '#6b7280',
              boxShadow: state.adminTab === 'orgs' ? '0 1px 3px rgba(20,40,80,.12)' : 'none',
            }}
          >
            本部一覧
          </button>
          <button
            onClick={() => actions.setAdminTabSettings()}
            style={{
              height: 34, padding: '0 18px', borderRadius: 8, fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', flex: 'none',
              background: state.adminTab === 'settings' ? '#fff' : 'transparent',
              color: state.adminTab === 'settings' ? state.accent : '#6b7280',
              boxShadow: state.adminTab === 'settings' ? '0 1px 3px rgba(20,40,80,.12)' : 'none',
            }}
          >
            アプリ設定
          </button>
        </div>

        {state.adminTab === 'orgs' ? <OrgsTab /> : <AppSettingsTab />}
      </div>
    </div>
  );
}
