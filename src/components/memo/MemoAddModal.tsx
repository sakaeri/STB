import { useStore } from '../../state/store.tsx';

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#46505e', display: 'block', marginBottom: 8 };
const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #dfe3e8',
  borderRadius: 11,
  padding: '12px 14px',
  fontSize: 14.5,
  fontWeight: 500,
  outline: 'none',
  background: '#fff',
};

export default function MemoAddModal() {
  const { state, actions } = useStore();
  const mm = state.memoModal;
  if (!mm) return null;

  const isHq = state.viewRole === 'hq';
  const topic = mm.topicId ? state.memoTopics.find((t) => t.id === mm.topicId) || null : null;
  const entry = topic && mm.entryId ? topic.entries.find((e) => e.id === mm.entryId) || null : null;

  let title = '';
  if (mm.kind === 'topic') title = '項目を追加';
  else if (mm.kind === 'entry') title = `${topic ? topic.name : ''}に詳細を追加`;
  else if (mm.kind === 'record') title = `${entry ? entry.name : ''}に記録を追加`;

  const valid =
    mm.kind === 'topic' || mm.kind === 'entry'
      ? !!(mm.name && mm.name.trim())
      : !!(mm.label && mm.label.trim() && mm.text && mm.text.trim());

  return (
    <div
      onClick={actions.closeMemoModal}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 420, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.28)', overflow: 'hidden', animation: 'scIn .24s ease both' }}
      >
        <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid #f0f2f5' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mm.kind === 'topic' && (
            <>
              <div>
                <label style={labelStyle}>項目名</label>
                <input
                  type="text"
                  value={mm.name || ''}
                  onChange={(e) => actions.onMemoModalName(e.target.value)}
                  placeholder="例：スタッフ情報、設備について、契約書雛形"
                  style={inputStyle}
                />
              </div>
              {isHq && (
                <div>
                  <label style={labelStyle}>対象チーム</label>
                  <select
                    value={mm.storeId === null ? (mm.hqOnly ? 'hq' : '') : mm.storeId || (state.stores[0]?.id ?? '')}
                    onChange={(e) => actions.onMemoModalScope(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">全体（本部＋全チームで共有）</option>
                    <option value="hq">本部のみ（チームには見えません）</option>
                    {state.stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: '#aab0b8', marginTop: 6 }}>
                    「全体」は本部・全チームで共有されます。「本部のみ」は本部だけが見られ、チームには表示されません。特定のチームを選んだ場合も、作成後にオーナーが「全チーム共通」に変更できます。
                  </div>
                </div>
              )}
            </>
          )}

          {mm.kind === 'entry' && (
            <div>
              <label style={labelStyle}>詳細</label>
              <input
                type="text"
                value={mm.name || ''}
                onChange={(e) => actions.onMemoModalName(e.target.value)}
                placeholder="例：山田 太郎、渋谷店"
                style={inputStyle}
              />
            </div>
          )}

          {mm.kind === 'record' && (
            <>
              <div>
                <label style={labelStyle}>見出し</label>
                <input
                  type="text"
                  value={mm.label || ''}
                  onChange={(e) => actions.onMemoModalLabel(e.target.value)}
                  placeholder="例：振込先、入院期間"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>日付</label>
                <input
                  type="date"
                  value={mm.date || ''}
                  onChange={(e) => actions.onMemoModalDate(e.target.value)}
                  style={{ ...inputStyle, padding: '11px 13px', fontSize: 14, color: '#3a4150' }}
                />
              </div>
              <div>
                <label style={labelStyle}>内容</label>
                <textarea
                  value={mm.text || ''}
                  onChange={(e) => actions.onMemoModalText(e.target.value)}
                  rows={4}
                  placeholder="詳細を入力"
                  style={{ ...inputStyle, padding: '11px 13px', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '0 24px 22px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={actions.closeMemoModal} style={{ height: 40, padding: '0 18px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#6b7280', background: '#f0f2f5' }}>
            取消
          </button>
          <button
            onClick={actions.saveMemoModal}
            style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: state.accent, boxShadow: '0 2px 6px rgba(20,40,80,.2)', opacity: valid ? 1 : 0.5 }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
