export function pickNearestTimeRow<T extends { time?: string }>(rows: T[], now = Date.now()) {
  let best: T | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const r of rows) {
    const t = r?.time ?? (r as any)?.obs_time ?? (r as any)?.record_time;
    const ms = t ? new Date(String(t)).getTime() : NaN;
    if (!Number.isFinite(ms)) continue;
    const d = Math.abs(ms - now);
    if (d < bestDiff) {
      best = r;
      bestDiff = d;
    }
  }
  return best;
}

export function linearFlowPercent(prevISO: string, nextISO: string, now = Date.now()) {
  const a = new Date(prevISO).getTime();
  const b = new Date(nextISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return undefined;
  const p = Math.max(0, Math.min(1, (now - a) / (b - a)));
  return Math.round(p * 100);
}

// Optional "cosine-eased" current curve (closer to sinusoidal flow)
export function cosineFlowPercent(prevISO: string, nextISO: string, now = Date.now()) {
  const a = new Date(prevISO).getTime();
  const b = new Date(nextISO).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return undefined;
  const x = Math.max(0, Math.min(1, (now - a) / (b - a))); // 0..1
  // ease: 0 -> 0, 0.5 -> ~1, 1 -> 0 (simulate slack at extremes, max mid-interval)
  const y = Math.sin(Math.PI * x); // 0..1..0
  return Math.round(y * 100);
}

import { getNationalTideLabelFromMoonAge } from '@/lib/tideLabels';

// Moon -> tidal stage (물때) using national standard labels
export type MulTtaeMode = 'A' | 'B'; // Kept for backward compatibility
export function moonToMulTtae(moonPhase01: number | undefined, mode: MulTtaeMode = 'A') {
  if (moonPhase01 == null) return { label: '-', idx: undefined };
  const age = moonPhase01 * 29.530588; // days since new moon
  
  // Use national standard label system (same for all regions)
  const label = getNationalTideLabelFromMoonAge(age);
  
  // Calculate index (1..15) for backward compatibility
  const idx = Math.min(15, Math.max(1, Math.floor((age / 14.765) * 15) + 1));
  
  return { label, idx };
}

// Flow percent from list of extreme times (ISO strings)
export function flowPercentFromExtremes(extISO: string[], now = Date.now()): number | undefined {
  if (extISO.length < 2) return undefined;
  const pts = extISO.map(t => new Date(t).getTime()).sort((a, b) => a - b);
  
  // Find bracket around now
  let prev = pts[0], next = pts[pts.length - 1];
  for (let i = 0; i < pts.length - 1; i++) {
    if (now >= pts[i] && now < pts[i + 1]) {
      prev = pts[i];
      next = pts[i + 1];
      break;
    }
  }
  
  const frac = Math.max(0, Math.min(1, (now - prev) / (next - prev)));
  // Cosine easing: 0..1..0 (max at mid-interval)
  const eased = Math.sin(Math.PI * frac);
  return Math.round(eased * 100);
}
