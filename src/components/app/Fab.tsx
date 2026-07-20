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

  const menuBtnStyle = (color: string) =>
    ({
      height: 44,
      padding: '0 18px',
      borderRadius: 12,
      background: '#fff',
      color,
      fontWeight: 700,
      fontSize: 13.5,
      boxShadow: '0 6px 18px rgba(20,40,80,.16)',
      whiteSpace: 'nowrap',
    }) as const;

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
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-end',
              animation: 'scIn .16s ease both',
            }}
          >
            {isHqView && canCreateTeamNow && (
              <button
                onClick={() => {
                  actions.closeFabMenu();
                  actions.openAdd();
                }}
                style={menuBtnStyle('#3a4150')}
              >
                {state.unitLabel || '店舗'}を作成
              </button>
            )}
            {canCreate && (
              <>
                <button
                  onClick={() => {
                    actions.closeFabMenu();
                    actions.openEntry('sales');
                  }}
                  style={menuBtnStyle('#1f9d6b')}
                >
                  売上を入力
                </button>
                <button
                  onClick={() => {
                    actions.closeFabMenu();
                    actions.openEntry('expense');
                  }}
                  style={menuBtnStyle('#c2566b')}
                >
                  経費を入力
                </button>
                <button
                  onClick={() => {
                    actions.closeFabMenu();
                    actions.openBankCsvImport();
                  }}
                  style={menuBtnStyle('#3a4150')}
                >
                  銀行CSVを取り込む
                </button>
              </>
            )}
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
