// =====================================================
//  KST-safe timezone utilities (Code: EN, UI: KR)
// =====================================================

/**
 * Convert a Date to KST midnight (00:00:00 in Asia/Seoul timezone).
 * Returns a Date representing that KST midnight instant.
 */
export function toKSTMidnight(date: Date): Date {
  const ms = date.getTime();
  const KST_OFFSET = 9 * 60 * 60 * 1000; // +09:00
  const kst = new Date(ms + KST_OFFSET);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const kstMidnightAsUTC = Date.UTC(y, m, d) - KST_OFFSET;
  return new Date(kstMidnightAsUTC);
}

/**
 * Calculate KST-based day difference: a - b in whole days.
 * Uses KST calendar dates (ignores local timezone).
 */
export function diffDaysKST(a: Date, b: Date): number {
  const a0 = toKSTMidnight(a).getTime();
  const b0 = toKSTMidnight(b).getTime();
  return Math.round((a0 - b0) / 86400000);
}

/**
 * Format Date as KST ISO string (YYYY-MM-DDTHH:mm:ss+09:00).
 */
export function toKSTISOString(date: Date): string {
  const ms = date.getTime();
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const kst = new Date(ms + KST_OFFSET);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  const ss = String(kst.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`;
}
