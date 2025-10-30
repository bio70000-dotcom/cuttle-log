type DailyRange = { date: string; range: number };

export function normalizeRangeRolling(daily: DailyRange[], todayDate: string): number | null {
  const idx = daily.findIndex(d => d.date === todayDate);
  if (idx < 0 || daily.length < 15) return null;

  const head = Math.max(0, idx - 14);
  const win = daily.slice(head, idx + 1); // 최근 15일 창
  const vals = win.map(d => d.range).filter(v => isFinite(v));
  
  if (vals.length === 0) return null;
  
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = (max - min) || 1;
  
  return (daily[idx].range - min) / span; // 0~1
}
