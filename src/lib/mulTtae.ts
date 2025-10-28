// Derive tidal stage (물때) from moon_phase (0..1) for any date.
export type MulTtae = { label: string; index?: number };

// Map moon phase to lunar age (~29.53 days), then to stage.
// We treat ~1st/3rd quarter as '조금', near neap center as '무시', else 1~15물 indexing.
export function moonPhaseToMulTtae(phase01?: number): MulTtae {
  if (phase01 == null) return { label: '-' };
  const age = phase01 * 29.530588; // days since new moon

  // '조금' bands near quarters:
  if ((age >= 6.5 && age <= 8.5) || (age >= 21 && age <= 23)) return { label: '조금' };
  // '무시' band near neap center:
  if (age >= 14 && age <= 16) return { label: '무시' };

  // Map to 1..15 over ~half cycle
  const idx = Math.min(15, Math.max(1, Math.floor((age / 14.765) * 15) + 1));
  return { label: `${idx}물`, index: idx };
}
