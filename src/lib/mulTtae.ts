import { PROFILE_BY_REGION } from '@/config/tideStageProfiles';
import type { RegionKey } from '@/config/regions';

export function moonPhaseToAgeDays(phase01:number){ return phase01*29.530588; }

export function stageForRegion(phase01:number|undefined, region:RegionKey){
  if (phase01==null) return { stage:'-', baselineFlow: undefined, index: undefined };
  const age = moonPhaseToAgeDays(phase01);
  const profile = PROFILE_BY_REGION[region];
  const label = profile.labelOf(age);
  const index = label.endsWith('물') ? Number(label.replace('물','')) : undefined;
  const baselineFlow = profile.baselineFlow[label as keyof typeof profile.baselineFlow] ?? undefined;
  return { stage: label, baselineFlow, index };
}

// Legacy function for backward compatibility
export type MulTtae = { label: string; index?: number };
export function moonPhaseToMulTtae(phase01?: number): MulTtae {
  if (phase01 == null) return { label: '-' };
  const result = stageForRegion(phase01, 'WEST');
  return { label: result.stage, index: result.index };
}
