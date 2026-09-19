import type { CSSProperties } from 'react';
import { useStore } from '../../state/store.tsx';

export default function BottomNav() {
  const { state, actions } = useStore();

  if (!state.isMobile) return null;

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '6px 0',
    color: active ? state.accent : '#9aa0a8',
  });

  return (
    <nav
      style={{
        flex: 'none',
        background: '#fff',
        borderTop: '1px solid #e7e9ed',
        display: 'flex',
        padding: '10px 8px calc(8px + env(safe-area-inset-bottom))',
      }}
    >
      <button onClick={actions.goList} style={tabStyle(state.page === 'list')}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: 18 }}>
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700 }}>一覧</span>
      </button>
      <button onClick={actions.goMemo} style={tabStyle(state.page === 'memo')}>
        <span style={{ width: 18, height: 16, border: '2px solid currentColor', borderRadius: '5px 5px 5px 1px' }} />
        <span style={{ fontSize: 10.5, fontWeight: 700 }}>メモ</span>
      </button>
      <button onClick={actions.goSettings} style={tabStyle(state.page === 'settings')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        <span style={{ fontSize: 10.5, fontWeight: 700 }}>本部情報</span>
      </button>
    </nav>
  );
}
