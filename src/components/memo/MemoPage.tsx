import { useMemo } from 'react';
import { useStore } from '../../state/store.tsx';
import type { MemoTopic } from '../../types';
import MemoAddModal from './MemoAddModal';

const crumbBtnStyle = (active: boolean): React.CSSProperties => ({
  fontSize: 12.5,
  fontWeight: active ? 700 : 500,
  color: active ? '#3a4150' : '#8a909a',
  background: 'none',
  border: 'none',
  padding: 0,
});

const addBtnStyle = (accent: string): React.CSSProperties => ({
  height: 36,
  padding: '0 14px 0 11px',
  borderRadius: 10,
  background: accent,
  color: '#fff',
  fontWeight: 700,
  fontSize: 12.5,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 13,
  width: '100%',
  background: '#fff',
  border: '1px solid #e7e9ed',
  borderRadius: 13,
  padding: '15px 17px',
  textAlign: 'left',
  cursor: 'pointer',
};

const delBtnStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  color: '#c3c8d0',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
};

const emptyCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px dashed #d8dce2',
  borderRadius: 13,
  padding: 24,
  textAlign: 'center',
  fontSize: 12.5,
  color: '#9aa0a8',
};

export default function MemoPage() {
  const { state, actions } = useStore();
  const { memoTopics, memoNav, viewRole, simRole, stores, accent } = state;
  const isHq = viewRole === 'hq';

  const canDeleteCompanyWide = simRole === 'オーナー';
  const canDeleteForStore = (storeId: string) =>
    simRole === 'オーナー' || (simRole === '管理者' && !isHq && viewRole === storeId);
  const canCreate = simRole !== '閲覧者';

  const curTopic = memoNav.topicId ? memoTopics.find((t) => t.id === memoNav.topicId) || null : null;
  const curEntry = curTopic && memoNav.entryId ? curTopic.entries.find((e) => e.id === memoNav.entryId) || null : null;

  const memoLevel0 = !curTopic;
  const memoLevel1 = !!curTopic && !curEntry;
  const memoLevel2 = !!curEntry;

  const groups = useMemo(() => {
    const allGroup = { id: 'all', label: '全体', items: memoTopics.filter((t) => !t.storeId) };
    const teamsInOrder = isHq ? stores : stores.filter((s) => s.id === viewRole);
    const teamGroups = teamsInOrder
      .map((s) => ({ id: s.id, label: s.name, items: memoTopics.filter((t) => t.storeId === s.id) }))
      .filter((g) => g.items.length > 0);
    return [allGroup, ...teamGroups];
  }, [memoTopics, stores, isHq, viewRole]);
  const noMemoGroups = groups.every((g) => g.items.length === 0);

  const memoEntryCanDelete = curTopic ? (curTopic.storeId ? canDeleteForStore(curTopic.storeId) : canDeleteCompanyWide) : false;

  return (
    <div style={{ height: '100%', overflowY: 'auto', animation: 'scIn .25s ease both', background: '#f7f8fa' }}>
      <style>{`
        .fc-memo-row:hover { border-color: #d3d8de; }
        .fc-memo-delbtn:hover { background: #f3eef0; color: #d6453d; }
      `}</style>
      <div style={{ padding: '22px 26px 90px', maxWidth: 720, margin: '0 auto' }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#8a909a', marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={actions.memoBack0} style={crumbBtnStyle(memoLevel0)}>情報メモ</button>
          {curTopic && (
            <>
              <span>›</span>
              <button onClick={actions.memoBack1} style={crumbBtnStyle(memoLevel1)}>{curTopic.name}</button>
            </>
          )}
          {curEntry && (
            <>
              <span>›</span>
              <span style={{ fontWeight: 700, color: '#3a4150' }}>{curEntry.name}</span>
            </>
          )}
        </div>

        {/* level 0: topics */}
        {memoLevel0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              {canCreate && (
                <button
                  onClick={() => actions.openAddTopic(isHq ? (stores[0]?.id ?? null) : viewRole)}
                  style={addBtnStyle(accent)}
                >
                  <span style={{ fontSize: 16, fontWeight: 400 }}>＋</span>項目を追加
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groups.map((g) =>
                g.items.length === 0 ? null : (
                  <div key={g.id}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9aa0a8', marginBottom: 8, letterSpacing: '.02em' }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {g.items.map((t: MemoTopic) => {
                        const canPromote = simRole === 'オーナー' && !!t.storeId;
                        const canDelete = t.storeId ? canDeleteForStore(t.storeId) : canDeleteCompanyWide;
                        const scopeLabel = t.storeId ? stores.find((s) => s.id === t.storeId)?.name || '' : '全体';
                        const scopeColor = t.storeId ? '#2f8f6b' : '#9aa0a8';
                        return (
                          <div key={t.id} className="fc-memo-row" onClick={() => actions.openMemoTopic(t.id)} style={rowStyle}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + '18', color: accent, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                              {t.name.charAt(0)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.name}</div>
                              <div style={{ fontSize: 12, color: '#9aa0a8', marginTop: 2 }}>
                                {t.entries.length}件 ・ <span style={{ color: scopeColor, fontWeight: 700 }}>{scopeLabel}</span>
                              </div>
                            </div>
                            {canPromote && (
                              <button
                                onClick={(e) => { e.stopPropagation(); actions.requestPromoteTopic(t); }}
                                style={{ fontSize: 11, fontWeight: 700, color: '#5a6b9e', background: '#eef0f7', padding: '5px 9px', borderRadius: 7, flex: 'none' }}
                                title="全チーム共通にします"
                              >
                                全体共有にする
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="fc-memo-delbtn"
                                onClick={(e) => { e.stopPropagation(); actions.requestDeleteMemoTopic(t); }}
                                style={delBtnStyle}
                              >
                                ✕
                              </button>
                            )}
                            <span style={{ color: '#c3c8d0', fontSize: 16 }}>›</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
              {noMemoGroups && (
                <div style={emptyCardStyle}>
                  まだ項目がありません。「＋項目を追加」から作成できます。<br />例：スタッフ情報、設備・什器、契約書類
                </div>
              )}
            </div>
          </>
        )}

        {/* level 1: entries */}
        {memoLevel1 && curTopic && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              {canCreate && (
                <button onClick={() => actions.openAddEntry(curTopic.id)} style={addBtnStyle(accent)}>
                  <span style={{ fontSize: 16, fontWeight: 400 }}>＋</span>詳細を追加
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {curTopic.entries.map((e) => {
                const latest = e.records.slice().sort((x, y) => y.date.localeCompare(x.date))[0];
                const latestLabel = latest ? `${latest.label} ・ ${e.records.length}件の記録` : '記録なし';
                return (
                  <div key={e.id} className="fc-memo-row" onClick={() => actions.openMemoEntry(e.id)} style={rowStyle}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#eef0f3', color: '#5a6270', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      {e.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: '#9aa0a8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestLabel}</div>
                    </div>
                    {memoEntryCanDelete && (
                      <button
                        className="fc-memo-delbtn"
                        onClick={(ev) => { ev.stopPropagation(); actions.requestDeleteMemoEntry(curTopic.id, e); }}
                        style={delBtnStyle}
                      >
                        ✕
                      </button>
                    )}
                    <span style={{ color: '#c3c8d0', fontSize: 16 }}>›</span>
                  </div>
                );
              })}
              {curTopic.entries.length === 0 && (
                <div style={emptyCardStyle}>まだ詳細がありません。「＋詳細を追加」から作成できます。</div>
              )}
            </div>
          </>
        )}

        {/* level 2: records */}
        {memoLevel2 && curTopic && curEntry && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              {canCreate && (
                <button onClick={() => actions.openAddRecord(curTopic.id, curEntry.id)} style={addBtnStyle(accent)}>
                  <span style={{ fontSize: 16, fontWeight: 400 }}>＋</span>記録を追加
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {curEntry.records.slice().sort((x, y) => y.date.localeCompare(x.date)).map((r) => {
                const dateFmt = `${r.date.slice(0, 4)}/${r.date.slice(5, 7)}/${r.date.slice(8, 10)}`;
                return (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #e7e9ed', borderRadius: 13, padding: '15px 17px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: accent }}>{r.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
                        <span style={{ fontSize: 11, color: '#aab0b8', whiteSpace: 'nowrap' }}>{dateFmt}</span>
                        {memoEntryCanDelete && (
                          <button
                            className="fc-memo-delbtn"
                            onClick={() => actions.requestDeleteMemoRecord(curTopic.id, curEntry.id, r)}
                            style={{ width: 22, height: 22, borderRadius: 6, color: '#c3c8d0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, color: '#2a2f38', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.text}</div>
                  </div>
                );
              })}
              {curEntry.records.length === 0 && (
                <div style={emptyCardStyle}>まだ記録がありません。「＋記録を追加」から入力できます。</div>
              )}
            </div>
          </>
        )}
      </div>
      <MemoAddModal />
    </div>
  );
}
