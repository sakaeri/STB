// Best-effort parser for Japanese bank statement CSV exports. Column
// naming varies by bank, so this matches against a set of common header
// keywords rather than a single fixed schema — good enough for the major
// banks' standard formats, not a guarantee for every bank out there.
import type { BankCsvRow } from '../types';

const DATE_HEADERS = ['日付', '取引日', 'お取引日', '年月日'];
const DESC_HEADERS = ['摘要', '内容', 'お取引内容', '摘要内容', 'メモ'];
const WITHDRAWAL_HEADERS = ['出金金額', 'お支払金額', '出金', '引落金額', '払戻金額'];
const DEPOSIT_HEADERS = ['入金金額', 'お預り金額', '入金', '振込金額', 'お預かり金額'];
const AMOUNT_HEADERS = ['金額', '取引金額'];

function normalizeHeader(h: string): string {
  return h.replace(/["\s]/g, '');
}

function findColumn(headers: string[], candidates: string[]): number {
  return headers.findIndex((h) => candidates.some((c) => h.includes(c)));
}

// Bank CSVs almost always use YYYY/MM/DD, YYYY-MM-DD, or YYYY.MM.DD —
// normalize whichever shows up to the YYYY-MM-DD the rest of the app uses.
function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[,¥\s"]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Minimal RFC4180-ish CSV parser — handles quoted fields containing commas,
// which plain split(',') would break on (bank CSVs often quote 摘要 text).
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

// Shift-JIS is by far the most common encoding for Japanese bank CSV
// exports — decoding it as UTF-8 produces mojibake instead of an error, so
// detect via a round-trip: valid UTF-8 re-encodes to the same bytes,
// Shift-JIS text won't.
export async function decodeCsvFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  const reEncoded = new TextEncoder().encode(utf8);
  const original = new Uint8Array(buf);
  let matches = reEncoded.length === original.length;
  if (matches) {
    for (let i = 0; i < original.length; i++) {
      if (reEncoded[i] !== original[i]) { matches = false; break; }
    }
  }
  if (matches) return utf8;
  try {
    return new TextDecoder('shift-jis').decode(buf);
  } catch {
    return utf8;
  }
}

export function rowsFromCsvTable(table: string[][]): { rows: BankCsvRow[]; error: string | null } {
  if (table.length < 2) return { rows: [], error: 'データが見つかりませんでした。' };
  const headers = table[0].map(normalizeHeader);
  const dateCol = findColumn(headers, DATE_HEADERS);
  const descCol = findColumn(headers, DESC_HEADERS);
  const withdrawalCol = findColumn(headers, WITHDRAWAL_HEADERS);
  const depositCol = findColumn(headers, DEPOSIT_HEADERS);
  const amountCol = findColumn(headers, AMOUNT_HEADERS);

  if (dateCol === -1 || (withdrawalCol === -1 && depositCol === -1 && amountCol === -1)) {
    return { rows: [], error: '対応している列（日付・入出金金額）が見つかりませんでした。この銀行のCSV形式には対応していない可能性があります。' };
  }

  const rows: BankCsvRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const date = normalizeDate(cells[dateCol] || '');
    if (!date) return;
    const description = descCol !== -1 ? (cells[descCol] || '').trim() : '';

    let amount = 0;
    let kind: BankCsvRow['kind'] = 'ignore';
    if (depositCol !== -1 && parseAmount(cells[depositCol] || '') > 0) {
      amount = parseAmount(cells[depositCol]);
      kind = 'sales';
    } else if (withdrawalCol !== -1 && parseAmount(cells[withdrawalCol] || '') > 0) {
      amount = parseAmount(cells[withdrawalCol]);
      kind = 'expense';
    } else if (amountCol !== -1) {
      const raw = parseAmount(cells[amountCol] || '');
      amount = Math.abs(raw);
      kind = raw >= 0 ? 'sales' : 'expense';
    }
    if (amount <= 0) return;

    rows.push({ id: `csv-${i}-${date}-${amount}`, date, description, amount, title: description || (kind === 'sales' ? '売上' : '経費'), kind });
  });

  if (rows.length === 0) return { rows: [], error: '取り込める明細が見つかりませんでした。' };
  return { rows, error: null };
}
