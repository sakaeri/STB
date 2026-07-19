import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useStore } from '../../state/store.tsx';
import { accentBorder, accentSoft } from '../../tokens';

const LOGO_ID = 'operator-logo';

function saveButtonStyle(accent: string, dirty: boolean) {
  return {
    height: 36,
    padding: '0 16px',
    borderRadius: 9,
    background: dirty ? accent : '#f0f2f5',
    color: dirty ? '#fff' : '#aab0b8',
    fontWeight: 700,
    fontSize: 12.5,
    flex: 'none' as const,
    cursor: dirty ? 'pointer' as const : 'default' as const,
  };
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #e7e9ed',
  borderRadius: 15,
  padding: '22px 24px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 14,
};

function CardHeader({ title, saved, accent, dirty, onSave }: { title: string; saved: boolean; accent: string; dirty: boolean; onSave: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#3a4150' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {saved && <span style={{ fontSize: 12, color: '#1f9d6b', fontWeight: 700 }}>保存しました</span>}
        <button onClick={onSave} disabled={!dirty} style={saveButtonStyle(accent, dirty)}>保存する</button>
      </div>
    </div>
  );
}

export default function AppSettingsTab() {
  const { state, actions } = useStore();
  const accent = state.accent;
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function readFileToLogo(file: File | undefined | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      actions.setLogo(LOGO_ID, reader.result as string);
      actions.markLogoDirty();
    };
    reader.readAsDataURL(file);
  }

  function onFilePick(e: ChangeEvent<HTMLInputElement>) {
    readFileToLogo(e.target.files?.[0]);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    readFileToLogo(e.dataTransfer.files?.[0]);
  }

  const logoUrl = state.logoMap[LOGO_ID];

  const providerApiKeyLabel = state.billingProvider === 'stripe' ? 'Stripe シークレットキー' : 'Square アクセストークン';
  const providerApiKeyPlaceholder = state.billingProvider === 'stripe' ? 'sk_live_...' : 'sq0atp-...';
  const providerName = state.billingProvider === 'stripe' ? 'Stripe' : 'Square';
  const providerWebhookUrl = `https://api.example.com/webhooks/${state.billingProvider}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720 }}>
      {/* ロゴ画像 */}
      <div style={cardStyle}>
        <CardHeader title="ロゴ画像" saved={state.showLogoSaved} accent={accent} dirty={state.logoDirty} onSave={() => actions.saveLogo()} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              width: 88, height: 88, borderRadius: 16, flex: 'none', cursor: 'pointer', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              background: logoUrl ? `#fff url("${logoUrl}") center/cover no-repeat` : '#f7f8fa',
              border: dragOver ? `1.5px dashed ${accent}` : '1.5px dashed #d8dce2',
              fontSize: 11, color: '#aab0b8', padding: 6, boxSizing: 'border-box',
            }}
          >
            {!logoUrl && 'ロゴを配置'}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFilePick} style={{ display: 'none' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#8a909a', lineHeight: 1.7 }}>
            ログイン画面・管理簿ヘッダーに表示されるロゴです。<br />推奨サイズ 256×256px（正方形）。
          </p>
        </div>
      </div>

      {/* 課金設定 */}
      <div style={cardStyle}>
        <CardHeader title="課金設定" saved={state.showBillingSaved} accent={accent} dirty={state.billingDirty} onSave={() => actions.saveBilling()} />

        <div>
          <div style={{ fontSize: 12, color: '#8a909a', marginBottom: 8 }}>決済プロバイダ</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['stripe', 'square'] as const).map((p) => {
              const active = state.billingProvider === p;
              return (
                <button
                  key={p}
                  onClick={() => actions.setBillingProvider(p)}
                  style={{
                    height: 38, padding: '0 16px', borderRadius: 9, fontWeight: 700, fontSize: 12.5,
                    background: active ? accentSoft(accent) : '#fff',
                    color: active ? accent : '#6b7280',
                    border: `1.5px solid ${active ? accentBorder(accent) : '#e2e5ea'}`,
                  }}
                >
                  {p === 'stripe' ? 'Stripe' : 'Square'}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <div style={{ fontSize: 11.5, color: '#8a909a' }}>{providerApiKeyLabel}</div>
            <input
              type="password"
              value={state.billingApiKeys[state.billingProvider]}
              onChange={(e) => actions.onProviderApiKeyChange(e.target.value)}
              placeholder={providerApiKeyPlaceholder}
              style={{
                width: '100%', maxWidth: 360, border: '1.5px solid #dfe3e8', borderRadius: 9, padding: '9px 13px',
                fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: 11.5, color: '#8a909a' }}>Webhookエンドポイント（{providerName}側に設定）</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={providerWebhookUrl}
                readOnly
                style={{
                  width: '100%', maxWidth: 360, border: '1.5px solid #dfe3e8', borderRadius: 9, padding: '9px 13px',
                  fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#f7f8fa', color: '#6b7280', fontFamily: 'monospace',
                }}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(providerWebhookUrl).catch(() => {}); actions.copyWebhookUrl(); }}
                style={{ height: 36, padding: '0 14px', borderRadius: 8, background: '#f0f2f5', color: '#6b7280', fontWeight: 700, fontSize: 12, flex: 'none' }}
              >
                {state.copiedWebhook ? 'コピーしました' : 'コピー'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#8a909a', marginBottom: 8 }}>料金設定（線形・上限なし）</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#f7f8fa', borderRadius: 9, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: '#3a4150' }}>最初の</span>
            <input
              type="number"
              min={0}
              value={state.pricingConfig.freeTeams || ''}
              onChange={(e) => actions.setPricingConfig({ freeTeams: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              style={{ width: 64, border: '1.5px solid #dfe3e8', borderRadius: 8, padding: '7px 8px', fontSize: 12.5, textAlign: 'right', outline: 'none' }}
            />
            <span style={{ fontSize: 12.5, color: '#3a4150' }}>チームまでは無料。以降、</span>
            <input
              type="number"
              min={1}
              value={state.pricingConfig.teamsPerStep || ''}
              onChange={(e) => actions.setPricingConfig({ teamsPerStep: Math.max(1, parseInt(e.target.value, 10) || 1) })}
              style={{ width: 64, border: '1.5px solid #dfe3e8', borderRadius: 8, padding: '7px 8px', fontSize: 12.5, textAlign: 'right', outline: 'none' }}
            />
            <span style={{ fontSize: 12.5, color: '#3a4150' }}>チーム増えるごとに月額</span>
            <input
              type="number"
              min={0}
              step={100}
              value={state.pricingConfig.pricePerStep || ''}
              onChange={(e) => actions.setPricingConfig({ pricePerStep: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              style={{ width: 90, border: '1.5px solid #dfe3e8', borderRadius: 8, padding: '7px 8px', fontSize: 12.5, textAlign: 'right', outline: 'none' }}
            />
            <span style={{ fontSize: 12.5, color: '#3a4150' }}>円ずつ加算（上限なし）</span>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: '#9aa0a8', lineHeight: 1.7 }}>
            例：{state.pricingConfig.freeTeams + 1}〜{state.pricingConfig.freeTeams + state.pricingConfig.teamsPerStep}チームで月額¥{state.pricingConfig.pricePerStep.toLocaleString('ja-JP')}、
            {state.pricingConfig.freeTeams + state.pricingConfig.teamsPerStep + 1}〜{state.pricingConfig.freeTeams + state.pricingConfig.teamsPerStep * 2}チームで月額¥{(state.pricingConfig.pricePerStep * 2).toLocaleString('ja-JP')}…と続きます。
            Stripe側の価格（1ステップ分の金額）と揃えてください。
          </p>
        </div>

        <div>
          <div style={{ fontSize: 12, color: '#8a909a', marginBottom: 8 }}>支払い遅延時の猶予日数</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              value={state.paymentGraceDays || ''}
              onChange={(e) => actions.onPaymentGraceDaysChange(parseInt(e.target.value, 10) || 0)}
              style={{ width: 80, border: '1.5px solid #dfe3e8', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, textAlign: 'right', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#8a909a' }}>日間の猶予後、自動的に凍結します</span>
          </div>
        </div>
      </div>

      {/* 利用規約 */}
      <div style={cardStyle}>
        <CardHeader title="利用規約" saved={state.showTermsSaved} accent={accent} dirty={state.termsDirty} onSave={() => actions.saveTerms()} />
        <textarea
          value={state.settingsTerms}
          onChange={(e) => actions.onSettingsTermsChange(e.target.value)}
          rows={8}
          style={{
            width: '100%', border: '1.5px solid #dfe3e8', borderRadius: 10, padding: '12px 14px', fontSize: 12.5,
            lineHeight: 1.8, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
