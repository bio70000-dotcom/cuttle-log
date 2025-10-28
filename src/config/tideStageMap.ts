export type StageKey =
  | '무시' | '조금'
  | '1물' | '2물' | '3물' | '4물' | '5물' | '6물' | '7물' | '8물'
  | '9물' | '10물' | '11물' | '12물' | '13물' | '14물' | '15물';

export const TIDE_STAGE_FLOW_BASELINE: Record<StageKey, number> = {
  // Editable defaults - baseline flow% for each tidal stage
  '무시': 14,
  '조금': 30,
  '1물': 5,
  '2물': 8,
  '3물': 5,
  '4물': 2,
  '5물': 10,
  '6물': 18,
  '7물': 25,
  '8물': 35,
  '9물': 45,
  '10물': 55,
  '11물': 65,
  '12물': 75,
  '13물': 85,
  '14물': 95,
  '15물': 100
};
