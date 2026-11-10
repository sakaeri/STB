// A small persistent log for the "orgDataLoaded=true with empty data"
// diagnostic (see orgLoadDebug in types.ts). The on-screen banner alone
// wasn't enough — the bug is intermittent, and by the time it's noticed
// and a screenshot is attempted, the state has often already self-healed
// (retries/reloads) and the banner is gone. Persisting each occurrence to
// localStorage means it can be checked later, from Settings, whenever is
// convenient — not just in the few seconds it happens to be on screen.
const STORAGE_KEY = 'fc_orgLoadDebugLog';
const MAX_ENTRIES = 8;

export interface DebugLogEntry {
  at: string; // ISO timestamp
  text: string;
}

export function logOrgLoadDebug(text: string): void {
  try {
    const existing = readOrgLoadDebugLog();
    const next = [{ at: new Date().toISOString(), text }, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* noop — best-effort diagnostic only */ }
}

export function readOrgLoadDebugLog(): DebugLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearOrgLoadDebugLog(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
