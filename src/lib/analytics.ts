// Thin wrapper around the Google Ads conversion tag (gtag.js, loaded
// globally in index.html) — best-effort only, so an ad blocker or a
// missing window.gtag never breaks the action it's attached to.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackSignupConversion(): void {
  try {
    window.gtag?.('event', 'conversion', { send_to: 'AW-10788465028/qpYwCI2G-YIdEITTq5go' });
  } catch {
    /* noop — analytics only */
  }
}
