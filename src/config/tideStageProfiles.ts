import type { RegionKey } from './regions';

export type StageKey =
  | '조금' | '무시'
  | '1물'|'2물'|'3물'|'4물'|'5물'|'6물'|'7물'|'8물'|'9물'|'10물'|'11물'|'12물'|'13물'|'14물'|'15물';

export type StageMap = { labelOf(ageDays:number): string; baselineFlow: Record<StageKey, number> };

// WEST: uses '무시' + '조금'
export const WEST_PROFILE: StageMap = {
  labelOf(age){
    if ((age>=6.5 && age<=8.5) || (age>=21 && age<=23)) return '조금';
    if (age>=14 && age<=16) return '무시';
    const idx = Math.min(15, Math.max(1, Math.floor((age/14.765)*15)+1));
    return `${idx}물`;
  },
  baselineFlow: {
    '무시':14, '조금':30,
    '1물':5,'2물':8,'3물':5,'4물':2,'5물':10,'6물':18,'7물':25,'8물':35,
    '9물':45,'10물':55,'11물':65,'12물':75,'13물':85,'14물':95,'15물':100
  }
};

// SOUTH/EAST: no '무시', treat that band as '조금' (or nearest index)
export const SOUTH_PROFILE: StageMap = {
  labelOf(age){
    if ((age>=6.5 && age<=8.5) || (age>=21 && age<=23) || (age>=14 && age<=16)) return '조금';
    const idx = Math.min(15, Math.max(1, Math.floor((age/14.765)*15)+1));
    return `${idx}물`;
  },
  baselineFlow: {
    '무시':30, // unused; keep same as 조금 to avoid '-'
    '조금':30,
    '1물':5,'2물':8,'3물':5,'4물':2,'5물':10,'6물':18,'7물':25,'8물':35,
    '9물':45,'10물':55,'11물':65,'12물':75,'13물':85,'14물':95,'15물':100
  }
};

export const EAST_PROFILE: StageMap = SOUTH_PROFILE;
export const JEJU_PROFILE: StageMap = SOUTH_PROFILE;

export const PROFILE_BY_REGION: Record<RegionKey, StageMap> = {
  WEST: WEST_PROFILE, SOUTH: SOUTH_PROFILE, EAST: EAST_PROFILE, JEJU: JEJU_PROFILE
};
