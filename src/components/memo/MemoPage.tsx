import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../state/store.tsx';
import type { MemoTopic, MemoRecord } from '../../types';
import MemoAddModal from './MemoAddModal';
import { myRole } from '../app/rowHelpers';

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
  const { memoTopics, memoNav, viewRole, stores, accent, isMobile } = state;
  const isHq = viewRole === 'hq';
  const role = myRole(state);
  const [memoSearch, setMemoSearch] = useState('');

  const canDeleteCompanyWide = role === 'オーナー';
  const canDeleteForStore = (storeId: string) =>
    role === 'オーナー' || (role === '管理者' && !isHq && viewRole === storeId);
  const canCreate = role !== '閲覧者';

  const curTopic = memoNav.topicId ? memoTopics.find((t) => t.id === memoNav.topicId) || null : null;
  const curEntry = curTopic && memoNav.entryId ? curTopic.entries.find((e) => e.id === memoNav.entryId) || null : null;

  const memoLevel0 = !curTopic;
  const memoLevel1 = !!curTopic && !curEntry;
  const memoLevel2 = !!curEntry;

  useEffect(() => {
    if (!memoLevel0) setMemoSearch('');
  }, [memoLevel0]);

  // Most recently touched (topic itself, or any of its entries/records)
  // floats to the top within each group.
  const byRecency = (a: MemoTopic, b: MemoTopic) => (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '');

  const groups = useMemo(() => {
    // hqOnly is a genuinely separate scope from the "全体" (shared with HQ
    // + every team) case, even though both have storeId: null — RLS hides
    // hqOnly topics from team members entirely, so this split only ever
    // shows up for HQ viewers anyway.
    const hqOnlyGroup = { id: 'hqOnly', label: '本部のみ', items: memoTopics.filter((t) => !t.storeId && t.hqOnly).sort(byRecency) };
    const allGroup = { id: 'all', label: '全体（本部＋全チーム）', items: memoTopics.filter((t) => !t.storeId && !t.hqOnly).sort(byRecency) };
    const teamsInOrder = isHq ? stores : stores.filter((s) => s.id === viewRole);
    const teamGroups = teamsInOrder
      .map((s) => ({ id: s.id, label: s.name, items: memoTopics.filter((t) => t.storeId === s.id).sort(byRecency) }))
      .filter((g) => g.items.length > 0);
    // Groups themselves float to the top by whichever one was touched most
    // recently (its top item, since items within a group are already
    // sorted by byRecency), not a fixed 本部のみ→全体→チーム order.
    return [hqOnlyGroup, allGroup, ...teamGroups].sort(
      (a, b) => (b.items[0]?.lastActivityAt || '').localeCompare(a.items[0]?.lastActivityAt || ''),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoTopics, stores, isHq, viewRole]);
  const noMemoGroups = groups.every((g) => g.items.length === 0);

  const query = memoSearch.trim().toLowerCase();
  const searching = query.length > 0;
  interface MemoSearchHit {
    key: string;
    topicId: string;
    entryId: string | null;
    topicName: string;
    entryName?: string;
    snippet: string;
    scopeLabel: string;
  }
  const searchResults = useMemo(() => {
    if (!query) return [] as MemoSearchHit[];
    const hits: MemoSearchHit[] = [];
    groups.forEach((g) => {
      g.items.forEach((t) => {
        const scopeLabel = t.storeId ? stores.find((s) => s.id === t.storeId)?.name || '' : (t.hqOnly ? '本部のみ' : '全体');
        if (t.name.toLowerCase().includes(query)) {
          hits.push({ key: `t-${t.id}`, topicId: t.id, entryId: null, topicName: t.name, snippet: '', scopeLabel });
        }
        t.entries.forEach((e) => {
          if (e.name.toLowerCase().includes(query)) {
            hits.push({ key: `e-${e.id}`, topicId: t.id, entryId: e.id, topicName: t.name, entryName: e.name, snippet: '', scopeLabel });
          }
          e.records.forEach((r) => {
            const labelHit = r.label.toLowerCase().includes(query);
            const textHit = (r.text || '').toLowerCase().includes(query);
            if (labelHit || textHit) {
              hits.push({
                key: `r-${r.id}`,
                topicId: t.id,
                entryId: e.id,
                topicName: t.name,
                entryName: e.name,
                snippet: labelHit ? r.label : (r.text || '').slice(0, 60),
                scopeLabel,
              });
            }
          });
        });
      });
    });
    return hits;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, query]);

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
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, marginBottom: 10 }}>
              <input
                value={memoSearch}
                onChange={(e) => setMemoSearch(e.target.value)}
                placeholder="キーワードで検索"
                style={{ flex: 1, minWidth: 0, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #e7e9ed', fontSize: 13 }}
              />
              {canCreate && (
                <button
                  onClick={() => actions.openAddTopic(isHq ? (stores[0]?.id ?? null) : viewRole)}
                  style={{ ...addBtnStyle(accent), flex: 'none', justifyContent: isMobile ? 'center' : undefined }}
                >
                  <span style={{ fontSize: 16, fontWeight: 400 }}>＋</span>項目を追加
                </button>
              )}
            </div>
            {searching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((h) => (
                  <div
                    key={h.key}
                    className="fc-memo-row"
                    onClick={() => {
                      actions.openMemoTopic(h.topicId);
                      if (h.entryId) actions.openMemoEntry(h.entryId);
                    }}
                    style={rowStyle}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, color: '#9aa0a8', marginBottom: 3 }}>
                        {h.topicName}{h.entryName ? ` › ${h.entryName}` : ''} ・ <span style={{ fontWeight: 700 }}>{h.scopeLabel}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.snippet || h.entryName || h.topicName}
                      </div>
                    </div>
                    <span style={{ color: '#c3c8d0', fontSize: 16 }}>›</span>
                  </div>
                ))}
                {searchResults.length === 0 && (
                  <div style={emptyCardStyle}>「{memoSearch}」に一致する項目が見つかりませんでした。</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {groups.map((g) =>
                  g.items.length === 0 ? null : (
                    <div key={g.id}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9aa0a8', marginBottom: 8, letterSpacing: '.02em' }}>{g.label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {g.items.map((t: MemoTopic) => {
                          const canEditScope = role === 'オーナー' && isHq;
                          const canDelete = t.storeId ? canDeleteForStore(t.storeId) : canDeleteCompanyWide;
                          const scopeLabel = t.storeId ? stores.find((s) => s.id === t.storeId)?.name || '' : (t.hqOnly ? '本部のみ' : '全体');
                          const scopeColor = t.storeId ? '#2f8f6b' : (t.hqOnly ? '#c2453d' : '#9aa0a8');
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
                              {canEditScope && (
                                <select
                                  value={t.storeId === null ? (t.hqOnly ? 'hq' : '') : t.storeId}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => { e.stopPropagation(); actions.changeMemoTopicScope(t, e.target.value); }}
                                  style={{ fontSize: 11, fontWeight: 700, color: '#5a6b9e', background: '#eef0f7', padding: '5px 8px', borderRadius: 7, flex: 'none', border: 'none', outline: 'none' }}
                                  title="共有範囲を変更"
                                >
                                  <option value="">全体</option>
                                  <option value="hq">本部のみ</option>
                                  {stores.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
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
            )}
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
              {curTopic.entries
                .slice()
                .sort((a, b) => (b.lastActivityAt || '').localeCompare(a.lastActivityAt || ''))
                .map((e) => {
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
              {(() => {
                // Records sharing a 見出し stack inside one card (oldest on
                // top, newest added at the bottom) instead of each getting
                // its own separate card — that's the whole point of being
                // able to pick an existing heading rather than retyping it.
                const byLabel = new Map<string, typeof curEntry.records>();
                curEntry.records.forEach((r) => {
                  const arr = byLabel.get(r.label);
                  if (arr) arr.push(r); else byLabel.set(r.label, [r]);
                });
                // Sorted by actual creation timestamp, not the date field —
                // records created the same day (the common case, since
                // there's no manual date entry anymore) would otherwise tie
                // and not reliably land oldest-first / newest-first.
                const groups = Array.from(byLabel.entries()).map(([label, records]) => ({
                  label,
                  records: records.slice().sort((a, b) => (a.createdAt || a.date).localeCompare(b.createdAt || b.date)),
                }));
                // Whichever heading was updated most recently floats to the top.
                groups.sort((a, b) => {
                  const lastRec = (recs: MemoRecord[]) => recs[recs.length - 1];
                  const aLast = lastRec(a.records);
                  const bLast = lastRec(b.records);
                  return (bLast?.createdAt || bLast?.date || '').localeCompare(aLast?.createdAt || aLast?.date || '');
                });
                return groups.map((g) => (
                  <div key={g.label} style={{ background: '#fff', border: '1px solid #e7e9ed', borderRadius: 13, padding: '15px 17px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: accent, marginBottom: 10 }}>{g.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {g.records.map((r, i) => {
                        const dateFmt = `${r.date.slice(0, 4)}/${r.date.slice(5, 7)}/${r.date.slice(8, 10)}`;
                        return (
                          <div key={r.id} style={i > 0 ? { borderTop: '1px solid #f0f2f5', paddingTop: 12 } : undefined}>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                              <span style={{ fontSize: 11, color: '#aab0b8', whiteSpace: 'nowrap' }}>
                                {dateFmt}{r.authorName && ` ・ ${r.authorName}`}
                              </span>
                              {memoEntryCanDelete && (
                                <button
                                  className="fc-memo-delbtn"
                                  onClick={() => actions.requestDeleteMemoRecord(curTopic.id, curEntry.id, r)}
                                  style={{ width: 22, height: 22, borderRadius: 6, color: '#c3c8d0', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {!!r.text && <div style={{ fontSize: 13.5, color: '#2a2f38', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.text}</div>}
                            {!!r.images?.length && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                {r.images.map((src, idx) => (
                                  <a key={idx} href={src} target="_blank" rel="noreferrer" style={{ width: 84, height: 84, borderRadius: 10, overflow: 'hidden', border: '1px solid #e7e9ed', flex: 'none', display: 'block' }}>
                                    <img src={src} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
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
