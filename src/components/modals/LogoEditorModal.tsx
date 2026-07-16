import { useRef, useState } from 'react';
import { useStore } from '../../state/store.tsx';

export default function LogoEditorModal() {
  const { state, actions } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!state.showLogoEditor) return null;

  const accent = state.accent;
  const key = state.selectedStoreId || 'app-logo';
  const current = state.logoMap[key];

  const readFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') actions.setLogo(key, reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={actions.closeLogoEditor}
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,28,42,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'scOver .2s ease both' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 18, width: 320, maxWidth: '100%', boxShadow: '0 24px 60px rgba(20,40,80,.3)', overflow: 'hidden', animation: 'scIn .24s ease both', padding: 22, textAlign: 'center' }}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>ロゴ画像を編集</h2>
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            readFile(e.dataTransfer.files?.[0]);
          }}
          style={{
            width: 160, height: 160, margin: '0 auto 18px', borderRadius: 16, overflow: 'hidden',
            background: current ? undefined : '#f0f2f5',
            backgroundImage: current ? `url(${current})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: dragOver ? `1.5px dashed ${accent}` : '1.5px dashed #d8dce2',
            cursor: 'pointer', color: '#9aa0a8', fontSize: 12.5, fontWeight: 700,
          }}
        >
          {!current && 'ロゴ'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => readFile(e.target.files?.[0])}
            style={{ display: 'none' }}
          />
        </div>
        <button onClick={actions.closeLogoEditor} style={{ height: 40, padding: '0 22px', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', background: accent }}>完了</button>
      </div>
    </div>
  );
}
