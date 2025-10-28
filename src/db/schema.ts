import Dexie, { Table } from 'dexie';

// Type definitions
export interface Trip {
  id?: number;
  dateStart: Date;
  dateEnd?: Date;
  spotId?: string;
  spotName?: string;
  lat?: number;
  lng?: number;
  tideStage?: number; // 1-12
  tideHighTimes?: string[];
  tideLowTimes?: string[];
  notes?: string;
}

export interface ConditionSnapshot {
  id?: number;
  tripId: number;
  at: Date;
  waterTemp?: number;
  windDir?: string;
  windSpeed?: number;
  waveHeight?: number;
  clouds?: number;
  currentStrength?: string;
  waterColor?: string;
}

export interface RigPreset {
  id?: number;
  slot: 'A' | 'B' | 'C';
  name?: string;
  sinkerDropLength?: string; // 10cm / 15cm / 20cm / custom
  branchLineLength?: string; // 직결 / 10cm / 15cm / 20cm / custom
  notes?: string;
}

export interface EgiPreset {
  id?: number;
  slot: 'A' | 'B' | 'C';
  name?: string;
  size?: string; // 2.5 / 3.0 / custom
  color?: string; // 핑크 / 오렌지 / 네온 / 야광 / custom
  finish?: string; // 광택 / 무광 / 야광
  notes?: string;
}

export interface TrackPoint {
  id?: number;
  tripId: number;
  at: Date;
  lat: number;
  lng: number;
  accuracy?: number;
  conditionId?: number;
}

export interface CatchEvent {
  id?: number;
  tripId: number;
  at: Date;
  spotId?: string;
  lat?: number;
  lng?: number;
  rigSlot: 'A' | 'B' | 'C';
  egiSlot: 'A' | 'B' | 'C';
  sizeCm?: number;
  weight?: number;
  kept?: boolean;
  photoThumb?: string; // base64 or blob URL
  depth?: number;
  note?: string;
  conditionId?: number;
}

export interface Outbox {
  id?: number;
  entityType: string;
  payload: any;
  createdAt: Date;
  tryCount: number;
  lastError?: string;
}

export interface Spot {
  id?: number;
  name?: string;
  lat: number;
  lng: number;
  waterType?: string;
  notes?: string;
  createdAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
}

// Dexie database
export class FishingLogDB extends Dexie {
  trips!: Table<Trip>;
  conditions!: Table<ConditionSnapshot>;
  rigPresets!: Table<RigPreset>;
  egiPresets!: Table<EgiPreset>;
  catchEvents!: Table<CatchEvent>;
  trackPoints!: Table<TrackPoint>;
  outbox!: Table<Outbox>;
  settings!: Table<AppSettings>;
  spots!: Table<Spot>;

  constructor() {
    super('FishingLogDB');
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
    });
  }
}

export const db = new FishingLogDB();
