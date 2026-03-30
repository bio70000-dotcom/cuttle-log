import Dexie, { Table } from 'dexie'

export interface Trip {
  id?: number
  dateStart: Date
  dateEnd?: Date
  spotId?: string
  spotName?: string
  lat?: number
  lng?: number
  tideStage?: number // 1-12
  tideHighTimes?: string[]
  tideLowTimes?: string[]
  notes?: string
  fishingType?: 'walking' | 'boat'
  boatCompany?: string
  boatPosition?: 'bow' | 'stern' | 'middle'
  species?: 'cuttle' | 'webfoot' | 'bigfin'
}

export interface ConditionSnapshot {
  id?: number
  tripId: number
  at: Date
  waterTemp?: number
  windDir?: string
  windSpeed?: number
  waveHeight?: number
  clouds?: number
  currentStrength?: string
  waterColor?: string
}

/** RigPreset: step/custom + pair 저장 지원 */
export interface RigPreset {
  id?: number
  slot: 'A' | 'B' | 'C'
  name?: string

  // LEGACY
  sinkerDropLength?: string
  branchLineLength?: string

  // step/custom 모드
  sinkerMode?: 'step' | 'custom'
  sinkerValue?: number
  sinkerPair?: [number, number] | null

  branchMode?: 'step' | 'custom'
  branchValue?: number
  branchPair?: [number, number] | null

  // WBS 추가 필드
  sinkerWeight?: number // 봉돌 무게 (호수)
  sinkerType?: 'tungsten' | 'lead' // 텅스텐/일반
  lineStrength?: number // 합사 호수 (0.3~1.0)
  tackleMethod?: 'direct' | 'branch' // 직결/가지줄

  notes?: string
}

export interface EgiPreset {
  id?: number
  slot: 'A' | 'B' | 'C'
  name?: string
  egiType?: 'normal' | 'seu' | 'aji' // 일반형/세우형/애자형
  brand?: string
  model?: string
  size?: string // 호수
  color?: string // 구체적 색상명
  colorCategory?: string // 핑크계/오렌지계/레드계/내추럴계/올리브계/야광계/기타
  weight?: number // 무게 (g)
  finish?: string // 광택/무광/야광
  photoThumb?: string // base64 사진
  notes?: string
}

export interface TrackPoint {
  id?: number
  tripId: number
  at: Date
  lat: number
  lng: number
  accuracy?: number
  conditionId?: number
}

export interface CatchEvent {
  id?: number
  tripId: number
  at: Date
  spotId?: string
  lat?: number
  lng?: number
  rigSlot: 'A' | 'B' | 'C'
  egiSlot: 'A' | 'B' | 'C'
  sizeCm?: number
  weight?: number
  kept?: boolean
  photoThumb?: string
  depth?: number
  note?: string
  conditionId?: number
  species?: 'cuttle' | 'webfoot' | 'bigfin'
}

export interface Outbox {
  id?: number
  entityType: string
  payload: unknown // any 금지 → unknown
  createdAt: Date
  tryCount: number
  lastError?: string
}

export interface Spot {
  id?: number
  name?: string
  lat: number
  lng: number
  waterType?: string
  notes?: string
  createdAt: Date
  isPublic?: boolean
  userId?: string
}

export interface RodPreset {
  id?: number
  slot: 'A' | 'B' | 'C'
  brand?: string
  model?: string
  lengthFt?: number
  action?: 'fast' | 'medium' | 'slow'
  power?: 'UL' | 'L' | 'ML' | 'M' | 'MH'
  egiRange?: string
  notes?: string
}

export interface AppSettings {
  id?: number
  key: string
  value: string
}

export class FishingLogDB extends Dexie {
  trips!: Table<Trip>
  conditions!: Table<ConditionSnapshot>
  rigPresets!: Table<RigPreset>
  egiPresets!: Table<EgiPreset>
  catchEvents!: Table<CatchEvent>
  trackPoints!: Table<TrackPoint>
  outbox!: Table<Outbox>
  settings!: Table<AppSettings>
  spots!: Table<Spot>
  rodPresets!: Table<RodPreset>

  constructor() {
    super('FishingLogDB')

    // v2: 기존 인덱스
    this.version(2).stores({
      trips: '++id, dateStart, spotId, tideStage',
      conditions: '++id, tripId, at',
      rigPresets: '++id, slot',
      egiPresets: '++id, slot',
      catchEvents: '++id, tripId, at, rigSlot, egiSlot',
      trackPoints: '++id, tripId, at',
      outbox: '++id, createdAt, entityType',
      settings: '++id, key',
      spots: '++id, lat, lng, createdAt',
    })

    // v3: 데이터 마이그레이션만(인덱스 동일)
    this.version(3)
      .stores({
        trips: '++id, dateStart, spotId, tideStage',
        conditions: '++id, tripId, at',
        rigPresets: '++id, slot',
        egiPresets: '++id, slot',
        catchEvents: '++id, tripId, at, rigSlot, egiSlot',
        trackPoints: '++id, tripId, at',
        outbox: '++id, createdAt, entityType',
        settings: '++id, key',
        spots: '++id, lat, lng, createdAt',
      })
      .upgrade(async (tx) => {
        const table = tx.table<RigPreset>('rigPresets')

        const toNumber = (s?: string | null): number | undefined => {
          if (!s) return undefined
          const m = s.match(/(-?\d+)\s*cm/i)
          if (m) return parseInt(m[1], 10)
          return undefined
        }

        await table.toCollection().modify((rec) => {
          // 봉돌단차
          rec.sinkerMode ??= 'step'
          if (rec.sinkerDropLength) {
            const s = rec.sinkerDropLength.trim()
            if (s.toLowerCase() === 'custom') {
              rec.sinkerMode = 'custom'
              rec.sinkerPair ??= [0, 0]
              rec.sinkerValue = undefined
            } else {
              const n = toNumber(s)
              if (Number.isFinite(n)) {
                rec.sinkerMode = 'step'
                rec.sinkerValue = n as number
                rec.sinkerPair = null
              }
            }
          } else {
            if (rec.sinkerMode === 'step') rec.sinkerValue ??= 0
            if (rec.sinkerMode === 'custom') rec.sinkerPair ??= [0, 0]
          }

          // 가지줄길이 (레거시: branchLineLength)
          rec.branchMode ??= 'step'
          if (rec.branchLineLength) {
            const s = rec.branchLineLength.trim()
            if (s === '직결') {
              rec.branchMode = 'step'
              rec.branchValue = 0
              rec.branchPair = null
            } else if (s.toLowerCase() === 'custom') {
              rec.branchMode = 'custom'
              rec.branchPair ??= [0, 0]
              rec.branchValue = undefined
            } else {
              const n = toNumber(s)
              if (Number.isFinite(n)) {
                rec.branchMode = 'step'
                rec.branchValue = n as number
                rec.branchPair = null
              }
            }
          } else {
            if (rec.branchMode === 'step') rec.branchValue ??= 0
            if (rec.branchMode === 'custom') rec.branchPair ??= [0, 0]
          }
        })
      })

    // v4: fishingType/species/boatCompany/boatPosition on trips,
    //     species on catchEvents, isPublic/userId on spots,
    //     new rodPresets table — no data migration needed
    this.version(4).stores({
      trips: '++id, dateStart, spotId, tideStage, fishingType',
      conditions: '++id, tripId, at',
      rigPresets: '++id, slot',
      egiPresets: '++id, slot',
      catchEvents: '++id, tripId, at, rigSlot, egiSlot, species',
      trackPoints: '++id, tripId, at',
      outbox: '++id, createdAt, entityType',
      settings: '++id, key',
      spots: '++id, lat, lng, createdAt',
      rodPresets: '++id, slot',
    })

    // v5: add isPublic index to spots for community filtering
    this.version(5).stores({
      trips: '++id, dateStart, spotId, tideStage, fishingType',
      conditions: '++id, tripId, at',
      rigPresets: '++id, slot',
      egiPresets: '++id, slot',
      catchEvents: '++id, tripId, at, rigSlot, egiSlot, species',
      trackPoints: '++id, tripId, at',
      outbox: '++id, createdAt, entityType',
      settings: '++id, key',
      spots: '++id, lat, lng, createdAt, isPublic',
      rodPresets: '++id, slot',
    })

    // v6: EgiPreset 확장 (egiType/brand/model/colorCategory/weight/photoThumb)
    //     RigPreset 확장 (sinkerWeight/sinkerType/lineStrength/tackleMethod)
    //     인덱스 변경 없음, 인터페이스 필드만 추가
    this.version(6).stores({
      trips: '++id, dateStart, spotId, tideStage, fishingType',
      conditions: '++id, tripId, at',
      rigPresets: '++id, slot',
      egiPresets: '++id, slot',
      catchEvents: '++id, tripId, at, rigSlot, egiSlot, species',
      trackPoints: '++id, tripId, at',
      outbox: '++id, createdAt, entityType',
      settings: '++id, key',
      spots: '++id, lat, lng, createdAt, isPublic',
      rodPresets: '++id, slot',
    })
  }
}

export const db = new FishingLogDB()
