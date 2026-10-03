import { useState } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

// Shared visual building blocks for the auth-screen views (login / signup /
// forgot / reset / verify). Mirrors the design reference's centered white
// card, 400px max-width, inline-style approach.

export const outerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#eceef1',
  padding: 24,
};

export function cardStyle(maxWidth = 400): CSSProperties {
  return {
    width: '100%',
    maxWidth,
    background: '#fff',
    border: '1px solid #e7e9ed',
    borderRadius: 16,
    boxShadow: '0 8px 30px rgba(20,40,80,.08)',
    overflow: 'hidden',
  };
}

export const headerStyle: CSSProperties = { padding: '28px 28px 8px', textAlign: 'center' };

export const bodyStyle: CSSProperties = {
  padding: '20px 28px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

export const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#46505e',
  display: 'block',
  marginBottom: 7,
};

export const inputStyle: CSSProperties = {
  width: '100%',
  border: '1.5px solid #dfe3e8',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 14,
  outline: 'none',
};

export function primaryButtonStyle(accent: string, extra?: CSSProperties): CSSProperties {
  return {
    height: 44,
    borderRadius: 10,
    background: accent,
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    marginTop: 4,
    width: '100%',
    ...extra,
  };
}

export const errorBannerStyle: CSSProperties = {
  fontSize: 12,
  color: '#d6453d',
  background: '#fbe7e5',
  borderRadius: 8,
  padding: '8px 12px',
};

export function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return <div style={errorBannerStyle}>{error}</div>;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

export function Field({ label, required, style, ...rest }: FieldProps) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#d6453d' }}> *</span>}
      </label>
      <input style={{ ...inputStyle, ...style }} {...rest} />
    </div>
  );
}

// Masked by default with a 表示/隠す toggle, matching the pattern already
// used in ProfileModal — the auth screens' password fields never had one.
type PasswordFieldProps = Omit<FieldProps, 'type'>;

export function PasswordField({ label, required, style, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: '#d6453d' }}> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input type={visible ? 'text' : 'password'} style={{ ...inputStyle, paddingRight: 52, ...style }} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 40, height: 30, borderRadius: 7, color: '#8a909a', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {visible ? '隠す' : '表示'}
        </button>
      </div>
    </div>
  );
}
