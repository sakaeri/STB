import type { CSSProperties } from 'react';
import { useStore } from '../../state/store.tsx';
import { accentSoft } from '../../tokens';
import './app.css';

export default function Sidebar() {
  const { state, actions } = useStore();

  if (state.isMobile) return null;

  const accent = state.accent;
  const unitLabelPlural = state.unitLabelPlural || '加盟店';
  const isHq = state.viewRole === 'hq';
  const viewStore = isHq ? null : state.stores.find((s) => s.id === state.viewRole) || null;
  const roleCaption = isHq ? `本部（全${unitLabelPlural}）` : viewStore ? `${viewStore.name}（${unitLabelPlural}）` : unitLabelPlural;
  const brandLogoUrl = state.logoMap['app-logo'] || state.logoMap['operator-logo'] || null;

  const navStyle = (active: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '10px 13px',
    borderRadius: 10,
    fontSize: 13.5,
    fontWeight: active ? 700 : 500,
    textAlign: 'left',
    color: active ? accent : '#5a6270',
    background: active ? accentSoft(accent) : 'transparent',
    transition: 'background .12s',
  });

  return (
    <aside
      style={{
        width: 248,
        flex: 'none',
        background: '#fff',
        borderRight: '1px solid #e7e9ed',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            flex: 'none',
            borderRadius: 9,
            background: brandLogoUrl ? `#fff url("${brandLogoUrl}") center/cover no-repeat` : accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!brandLogoUrl && <div style={{ width: 14, height: 14, border: '2.5px solid #fff', borderRadius: 3, borderBottomWidth: 5 }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {state.brandName}
          </span>
          <span style={{ fontSize: 11, color: '#9aa0a8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roleCaption}</span>
        </div>
      </div>

      <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button className="stb-nav-btn" onClick={actions.goList} style={navStyle(state.page === 'list')}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 17 }}>
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
          </span>
          売上一覧
        </button>
        <button className="stb-nav-btn" onClick={actions.goMemo} style={navStyle(state.page === 'memo')}>
          <span style={{ width: 17, height: 15, border: '2px solid currentColor', borderRadius: '5px 5px 5px 1px' }} />
          情報メモ
        </button>
        <button className="stb-nav-btn" onClick={actions.goSettings} style={navStyle(state.page === 'settings')}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 17 }}>
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -1.5, left: 3, width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            </span>
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -1.5, right: 3, width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            </span>
            <span style={{ height: 2, background: 'currentColor', borderRadius: 2, position: 'relative' }}>
              <span style={{ position: 'absolute', top: -1.5, left: 6, width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            </span>
          </span>
          本部情報
        </button>
      </nav>

      <div style={{ marginTop: 'auto', padding: '14px 16px', borderTop: '1px solid #eef0f3', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#aab0b8', letterSpacing: '.04em', marginBottom: 7, paddingLeft: 2 }}>表示権限</div>
          <select
            value={state.viewRole}
            onChange={(e) => actions.setViewRole(e.target.value)}
            style={{
              width: '100%',
              border: '1.5px solid #e2e5ea',
              borderRadius: 9,
              padding: '9px 10px',
              fontSize: 13,
              fontWeight: 700,
              color: '#3a4150',
              background: '#fff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="hq">本部（全{unitLabelPlural}）</option>
            {state.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={actions.openProfileModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            padding: '7px 9px',
            borderRadius: 9,
            background: '#f7f8fa',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: accent,
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
            }}
          >
            {state.ownerProfile.name.charAt(0)}
          </div>
          <span style={{ fontSize: 11.5, color: '#3a4150', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
            {state.ownerProfile.email}
          </span>
        </button>
      </div>
    </aside>
  );
}
