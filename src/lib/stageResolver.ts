type DailyRange = { date: string; range: number };

function localMinIndex(arr: number[], idx: number, window = 2): boolean {
  // idx 기준 좌우 window 범위 내 최솟값인지 확인
  const s = Math.max(0, idx - window);
  const e = Math.min(arr.length - 1, idx + window);
  const val = arr[idx];
  for (let i = s; i <= e; i++) {
    if (i !== idx && arr[i] <= val) return false;
  }
  return true;
}

export function resolveStageByRollingMin(
  daily: DailyRange[],
  todayDate: string,                   // "yyyy-MM-dd" (KST)
  cycle = 15,                          // 1~15물
  windowLocalMin = 2                   // 국지최소 판정 반경(일)
): { label: string; stageNum: number; anchorDate: string } | null {
  // 유효값만
  const vals = daily.map(d => d.range).filter(v => isFinite(v));
  if (vals.length !== daily.length || vals.length < cycle) return null; // 데이터 부족

  // 국지 최소 후보들 인덱스
  const mins: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    if (localMinIndex(vals, i, windowLocalMin)) mins.push(i);
  }
  if (!mins.length) return null;

  // 가장 최근의 국지 최소(=조금 앵커) 선택
  const todayIdx = daily.findIndex(d => d.date === todayDate);
  if (todayIdx < 0) return null;
  
  const anchorIdx = mins.reduce((best, cur) => (cur <= todayIdx && cur > best ? cur : best), -1);
  const useIdx = anchorIdx >= 0 ? anchorIdx : mins[0]; // 없으면 첫 최소

  // 앵커 = 15물(조금). 앵커로부터 +1=1물, +2=2물...
  let offset = todayIdx - useIdx;
  while (offset < 0) offset += cycle; // 안전
  const stageNum = ((offset % cycle) + 1); // 1..15
  const label = (stageNum === 15) ? "조금" : `${stageNum}물`;

  return { label, stageNum, anchorDate: daily[useIdx].date };
}
