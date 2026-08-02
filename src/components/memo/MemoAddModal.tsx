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
      : !!(mm.label && mm.label.trim());

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

          {mm.kind === 'record' && (() => {
            const existingLabels = Array.from(new Set((entry?.records || []).map((r) => r.label).filter(Boolean)));
            const showLabelPicker = existingLabels.length > 0;
            const labelMode = mm.labelMode || (showLabelPicker ? 'existing' : 'new');
            return (
              <>
                <div>
                  <label style={labelStyle}>見出し</label>
                  {showLabelPicker && (
                    <select
                      value={labelMode === 'new' ? '__new__' : (mm.label || '')}
                      onChange={(e) => actions.onMemoModalLabelPick(e.target.value)}
                      style={{ ...inputStyle, marginBottom: labelMode === 'new' ? 8 : 0 }}
                    >
                      <option value="__new__">＋ 新しい見出しを追加</option>
                      {existingLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                  {labelMode === 'new' && (
                    <input
                      type="text"
                      value={mm.label || ''}
                      onChange={(e) => actions.onMemoModalLabel(e.target.value)}
                      placeholder="例：振込先、入院期間"
                      style={inputStyle}
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>内容（任意）</label>
                  <textarea
                    value={mm.text || ''}
                    onChange={(e) => actions.onMemoModalText(e.target.value)}
                    rows={4}
                    placeholder="詳細を入力"
                    style={{ ...inputStyle, padding: '11px 13px', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>添付ファイル（任意・画像は最大6枚、PDFは複数可）</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(mm.images || []).map((src, i) => (
                      <div key={`img-${i}`} style={{ position: 'relative', width: 76, height: 76, borderRadius: 10, overflow: 'hidden', border: '1.5px solid #dfe3e8', flex: 'none' }}>
                        <img src={src} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={() => actions.onMemoModalRemoveImage(i)}
                          style={{ position: 'absolute', top: 3, right: 3, width: 24, height: 24, borderRadius: 7, background: 'rgba(20,28,42,.55)', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {(mm.pdfDrafts || []).map((p, i) => (
                      <div
                        key={`pdf-${i}`}
                        title={p.name}
                        style={{ position: 'relative', width: 76, height: 76, borderRadius: 10, border: '1.5px solid #dfe3e8', background: '#fafbfc', flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px 6px', overflow: 'hidden' }}
                      >
                        <span style={{ fontSize: 22 }}>📄</span>
                        <span style={{ fontSize: 9.5, color: '#8a909a', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name}</span>
                        <button
                          onClick={() => actions.onMemoModalRemovePdf(i)}
                          style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: 6, background: 'rgba(20,28,42,.55)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 76, height: 76, border: '1.5px dashed #d8dce2', borderRadius: 10, color: '#8a909a', fontSize: 22, cursor: 'pointer', background: '#fafbfc', flex: 'none' }}>
                      ＋
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={(e) => { actions.onMemoModalAddFiles(e.target.files); e.target.value = ''; }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </>
            );
          })()}
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
