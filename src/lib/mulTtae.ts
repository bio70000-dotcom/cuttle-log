import { PROFILE_BY_REGION, type RegionStageProfile } from '@/config/tideStageProfiles';
import type { RegionKey } from '@/config/regions';

// 월령 계산: phase01(0..1) * 29.530588
export function moonPhaseToAgeDays(phase01:number){ return phase01*29.530588; }

// 가장 가까운 네압일(quarter)을 구한다: 약 7.38일, 22.15일 (반복)
function nearestNeapAge(age:number){
  const half = 14.765;         // 반달 주기(~14.765일)
  const q1 = 7.3825;           // 1사분기 근사
  // q3는 q1 + half
  const k = Math.round((age - q1)/half);
  const n = q1 + k*half;       // 가장 가까운 네압 중심일
  return n;
}

// 스테이션별 보정(선택): { '마산': 1 } 형태로 정의 가능
const STATION_DAY_OFFSET: Record<string, number> = {
  // '마산': 0, // 필요 시 1로 바꿔 잡아당김
};

export function stageForRegionUsingNeap(
  phase01: number|undefined,
  region: RegionKey,
  stationName?: string
){
  if (phase01 == null) return { stage:'-', index: undefined, baselineFlow: undefined };

  const profile: RegionStageProfile = PROFILE_BY_REGION[region];
  const age = moonPhaseToAgeDays(phase01);          // 오늘 월령
  const neap = nearestNeapAge(age);                 // 가장 가까운 '네압 중심일'
  const daySize = 14.765 / 15;                      // 한 물당 폭(~0.9843일)
  const offsetStation = stationName ? (STATION_DAY_OFFSET[stationName] ?? 0) : 0;

  // 네압 당일 라벨(조금/무시) 폭: ±0.5일 (필요시 0.7로 조정)
  const neapWindow = 0.5;
  const delta = age - neap;

  if (Math.abs(delta) <= neapWindow) {
    // 네압 당일
    const label = profile.hasMusi ? profile.neapLabel : '조금';
    return { stage: label, index: undefined, baselineFlow: profile.baselineFlow[label as any] ?? undefined };
  }

  // 네압 다음날부터 1물 시작: delta>0 이면 다음날 기준
  // 앵커: 네압 다음날(= delta>neapWindow 의 시작점)에 대해
  // idx = floor( (delta - neapWindow + anchorOffsetDays + stationOffset) / daySize ) + 1
  const shifted = delta - neapWindow + profile.anchorOffsetDays + offsetStation;
  let idx = Math.floor( shifted / daySize ) + 1; // 1..15 범위
  if (idx < 1) idx = 1;
  if (idx > 15) idx = 15;

  const label = `${idx}물`;
  const baselineFlow = profile.baselineFlow[label as any] ?? undefined;
  return { stage: label, index: idx, baselineFlow };
}

// Legacy function for backward compatibility
export type MulTtae = { label: string; index?: number };
export function moonPhaseToMulTtae(phase01?: number): MulTtae {
  if (phase01 == null) return { label: '-' };
  const result = stageForRegionUsingNeap(phase01, 'WEST');
  return { label: result.stage, index: result.index };
}
