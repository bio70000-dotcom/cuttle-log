// 4대 권역 판정 유틸
// 기준은 실사용 좌표 테스트를 우선으로 한 휴리스틱 경계값입니다.
// 필요 시 임계값만 조정하면 됩니다.

export type RegionKey = 'WEST' | 'SOUTH' | 'EAST' | 'JEJU'

export const REGION_NAMES: Record<RegionKey, string> = {
  WEST: '서해',
  SOUTH: '남해',
  EAST: '동해',
  JEJU: '제주',
}

// 제주도 대략 경계 (제주시~서귀포 포함 넉넉하게)
const JEJU_BOUNDS = {
  minLat: 32.8,
  maxLat: 34.2,
  minLng: 125.5,
  maxLng: 127.3,
}

// 남해/동해/서해 경계 임계값
const SOUTH_MAX_LAT = 35.3 // 이 남쪽은 남해로 분류
const EAST_MIN_LNG = 128.0 // 이 동쪽은 동해로 분류

export function resolveRegion(lat: number, lng: number): RegionKey {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'WEST'

  // 1) 제주 우선
  if (
    lat >= JEJU_BOUNDS.minLat &&
    lat <= JEJU_BOUNDS.maxLat &&
    lng >= JEJU_BOUNDS.minLng &&
    lng <= JEJU_BOUNDS.maxLng
  ) {
    return 'JEJU'
  }

  // 2) 남해 (제주 제외, 저위도)
  if (lat < SOUTH_MAX_LAT) {
    return 'SOUTH'
  }

  // 3) 동해 (고경도)
  if (lng >= EAST_MIN_LNG) {
    return 'EAST'
  }

  // 4) 나머지는 서해
  return 'WEST'
}
