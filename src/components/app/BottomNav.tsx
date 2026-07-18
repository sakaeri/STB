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
        padding: '15px 8px calc(9px + env(safe-area-inset-bottom))',
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
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: 18 }}>
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
          <span style={{ height: 2, background: 'currentColor', borderRadius: 2 }} />
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700 }}>本部情報</span>
      </button>
    </nav>
  );
}
