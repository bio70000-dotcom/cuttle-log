import type { RegionKey } from './regions';

export type StageKey =
  | '조금' | '무시'
  | '1물'|'2물'|'3물'|'4물'|'5물'|'6물'|'7물'|'8물'
  | '9물'|'10물'|'11물'|'12물'|'13물'|'14물'|'15물';

export type RegionStageProfile = {
  neapLabel: '조금' | '무시' | '조금/무시'; // 네압 당일 표기
  hasMusi: boolean;          // '무시'를 별도로 쓰는지
  anchorOffsetDays: number;  // 네압 다음날을 1물로 셀 때 보정(±일)
  baselineFlow: Record<StageKey, number>;
};

// 서해: '무시'와 '조금' 모두 사용. 앵커는 네압 다음날이 1물(오프셋 0)
export const WEST_PROFILE: RegionStageProfile = {
  neapLabel: '무시',
  hasMusi: true,
  anchorOffsetDays: 0,
  baselineFlow: {
    '무시':14, '조금':30,
    '1물':5,'2물':8,'3물':5,'4물':2,'5물':10,'6물':18,'7물':25,'8물':35,
    '9물':45,'10물':55,'11물':65,'12물':75,'13물':85,'14물':95,'15물':100
  }
};

// 남해/동해/제주: 네압은 '조금'으로 표기, '무시' 비사용. 필요 시 스테이션별 offset으로 1일 보정 가능.
export const SOUTH_PROFILE: RegionStageProfile = {
  neapLabel: '조금',
  hasMusi: false,
  anchorOffsetDays: 0, // 마산에서 1물 하루 어긋나면 여기 1로 올려도 됨(스테이션 보정 권장)
  baselineFlow: {
    '무시':30, // 미사용. 안전하게 '조금'과 동일 수치
    '조금':30,
    '1물':5,'2물':8,'3물':5,'4물':2,'5물':10,'6물':18,'7물':25,'8물':35,
    '9물':45,'10물':55,'11물':65,'12물':75,'13물':85,'14물':95,'15물':100
  }
};

export const EAST_PROFILE: RegionStageProfile  = { ...SOUTH_PROFILE };
export const JEJU_PROFILE: RegionStageProfile  = { ...SOUTH_PROFILE };

export const PROFILE_BY_REGION: Record<RegionKey, RegionStageProfile> = {
  WEST: WEST_PROFILE, SOUTH: SOUTH_PROFILE, EAST: EAST_PROFILE, JEJU: JEJU_PROFILE
};
