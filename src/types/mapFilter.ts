// src/types/mapFilter.ts

export interface MapFilterState {
  species: string[]           // [] = all; values: 'cuttle'|'webfoot'|'bigfin'
  period: '1m' | '3m' | '6m' | 'all'
  egiColors: string[]         // [] = all; dynamic from egiPresets
  tideGroup: string[]         // 'sari'|'middle'|'jogeum'
  fishingType: string         // ''|'walking'|'boat'
}

export const DEFAULT_FILTER: MapFilterState = {
  species: [],
  period: 'all',
  egiColors: [],
  tideGroup: [],
  fishingType: '',
}

export function activeFilterCount(f: MapFilterState): number {
  let count = 0
  if (f.species.length > 0) count++
  if (f.period !== 'all') count++
  if (f.egiColors.length > 0) count++
  if (f.tideGroup.length > 0) count++
  if (f.fishingType !== '') count++
  return count
}
