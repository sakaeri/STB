import { useStore } from '../../state/store.tsx';
import { canCreateRole, canDeleteCompanyWide, myRole } from './rowHelpers';

export default function Fab() {
  const { state, actions } = useStore();

  const isHqView = state.viewRole === 'hq';
  // Frozen only restricts the HQ (aggregate) side — a team member acting
  // on their own store is unaffected, same as everywhere else frozen is
  // enforced.
  const frozenForHq = state.orgStatus === 'frozen' && isHqView;
  const showFab = state.page === 'list' && !state.selectedStoreId && !state.showEntry && !frozenForHq;
  if (!showFab) return null;

  const role = myRole(state);
  const canCreateTeamNow = canDeleteCompanyWide(role);
  const canCreate = canCreateRole(role);

  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '13px 18px',
    fontWeight: 700,
    fontSize: 13.5,
    color: '#3a4150',
    whiteSpace: 'nowrap',
    width: '100%',
    textAlign: 'left',
  };
  const menuIconStyle = (color: string): React.CSSProperties => ({
    width: 22,
    textAlign: 'center',
    fontSize: 16,
    color,
    flex: 'none',
  });
  const menuDividerStyle: React.CSSProperties = { borderTop: '1px solid #eef0f3' };

  const menuItems: { key: string; icon: string; color: string; label: string; onClick: () => void }[] = [];
  if (isHqView && canCreateTeamNow) {
    menuItems.push({
      key: 'store',
      icon: '🏬',
      color: '#3a4150',
      label: `${state.unitLabel || '店舗'}を作成`,
      onClick: () => { actions.closeFabMenu(); actions.openAdd(); },
    });
  }
  if (canCreate) {
    menuItems.push(
      { key: 'sales', icon: '💰', color: '#1f9d6b', label: '売上を入力', onClick: () => { actions.closeFabMenu(); actions.openEntry('sales'); } },
      { key: 'expense', icon: '🧾', color: '#c2566b', label: '経費を入力', onClick: () => { actions.closeFabMenu(); actions.openEntry('expense'); } },
      { key: 'csv', icon: '🏦', color: '#3a4150', label: '銀行CSVを取り込む', onClick: () => { actions.closeFabMenu(); actions.openBankCsvImport(); } },
    );
  }

  return (
    <>
      {state.showFabMenu && (
        <>
          <div onClick={actions.closeFabMenu} style={{ position: 'fixed', inset: 0, zIndex: 58 }} />
          <div
            style={{
              position: 'fixed',
              right: 28,
              bottom: state.isMobile ? 'calc(134px + env(safe-area-inset-bottom))' : 96,
              zIndex: 59,
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 6px 18px rgba(20,40,80,.16)',
              overflow: 'hidden',
              minWidth: 200,
              animation: 'scIn .16s ease both',
            }}
          >
            {menuItems.map((item, i) => (
              <button key={item.key} onClick={item.onClick} style={{ ...menuItemStyle, ...(i > 0 ? menuDividerStyle : undefined) }}>
                <span style={menuIconStyle(item.color)}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
      <button
        onClick={actions.toggleFabMenu}
        style={{
          position: 'fixed',
          right: 28,
          bottom: state.isMobile ? 'calc(66px + env(safe-area-inset-bottom))' : 28,
          zIndex: 59,
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: state.accent,
          color: '#fff',
          fontSize: 26,
          fontWeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 22px rgba(20,40,80,.28)',
          transform: state.showFabMenu ? 'rotate(45deg)' : 'none',
          transition: 'transform .18s',
        }}
      >
        ＋
      </button>
    </>
  );
}
