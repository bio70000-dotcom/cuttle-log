// =====================================================
//  🌊 Tidal Flow Engine — Korea (4 Regions + Nearest)
//  Rule: Code in English; any UI/console texts in Korean
// =====================================================

// 1) Regional lookup tables (1~15물; 15=조금)
// Values are region "representative profiles" averaged over two cycles (when available).
const FLOW_TABLE = {
  "서해/인천": [4, 6, 16, 34, 54, 68, 79, 84, 82, 77, 68, 56, 40, 30, 21], // West
  "남해/마산": [3, 6, 12, 28, 44, 51, 65, 77, 82, 81, 74, 60, 42, 24, 6],  // South

  // East (속초) — from your data (labels normalized: 최소=1%, 최대=100%, "조금"=15물 값)
  // Cycle A(1..15): [17,13,13,13,13,13,30,52,73,91,100,95,82,65,43]
  // Cycle B(1..14): [21,4,1,1,13,30,39,47,56,60,60,52,47,39]
  // Averaged (rounded): 
  "동해/속초": [19, 8, 7, 7, 13, 22, 34, 50, 64, 76, 80, 74, 64, 52, 43],

  // Jeju — from your data (labels normalized)
  // Cycle A(1..15): [1,1,5,13,23,34,58,80,95,100,92,75,54,32,16]
  // Cycle B(1..14): [5,1,2,8,20,30,39,46,51,52,50,43,34,23]
  // Averaged (rounded):
  "제주/제주": [3, 1, 4, 10, 22, 32, 48, 63, 73, 76, 71, 59, 44, 28, 16],
};

// 2) Special labels (region-specific). Incheon has "무시" (slack before 1물).
const SPECIAL_FLOW: Record<string, Record<string, number>> = {
  "서해/인천": { "무시": 10 } // %
  // Add more if needed per-region (e.g., other slack states)
};

// 3) Region anchors (rough centroids) for nearest-by-coordinates fallback
const REGION_ANCHOR = {
  "서해/인천": { lat: 37.45, lon: 126.70 },
  "남해/마산": { lat: 35.20, lon: 128.57 },
  "동해/속초": { lat: 38.21, lon: 128.59 }, // near Sokcho
  "제주/제주": { lat: 33.50, lon: 126.50 },
};

// 4) Name aliases → canonical region keys
const REGION_ALIAS: Record<string, string> = {
  // West
  "인천": "서해/인천", "태안": "서해/인천", "안면도": "서해/인천",
  "보령": "서해/인천", "군산": "서해/인천", "목포": "서해/인천",
  // South
  "마산": "남해/마산", "창원": "남해/마산", "부산": "남해/마산",
  "통영": "남해/마산", "거제": "남해/마산", "여수": "남해/마산",
  // East
  "속초": "동해/속초", "강릉": "동해/속초", "동해시": "동해/속초",
  "울진": "동해/속초", "포항": "동해/속초",
  // Jeju
  "제주": "제주/제주", "서귀포": "제주/제주"
};

// ---------- Utilities ----------
const clampMul = (m: number) => Math.max(1, Math.min(15, Number(m) || 1));
const clamp01  = (x: number) => Math.max(0, Math.min(1, x));

function parseMul(mulOrLabel: string | number): number | null {
  if (typeof mulOrLabel === "number") return clampMul(mulOrLabel);
  const s = String(mulOrLabel).trim();
  if (s === "조금") return 15;
  if (/^\d+물?$/.test(s)) return clampMul(parseInt(s, 10));
  return null; // e.g., "무시"
}

function normalize(arr: number[]): number[] {
  const min = Math.min(...arr), max = Math.max(...arr), span = (max - min) || 1;
  return arr.map(v => (v - min) / span);
}

function rotateToPeak(arr: number[]): number[] {
  const peak = arr.indexOf(Math.max(...arr));
  const out = Array(15).fill(0);
  const shift = 6 - peak; // align peak to 7물 (index 6)
  for (let i = 0; i < 15; i++) out[(i + shift + 15) % 15] = arr[i];
  return out;
}

function buildBaseCurve(): number[] {
  const aligned = Object.values(FLOW_TABLE).map(a => rotateToPeak(normalize(a)));
  const base = Array(15).fill(0);
  aligned.forEach(a => a.forEach((v, i) => base[i] += v));
  for (let i = 0; i < 15; i++) base[i] /= aligned.length;
  return base; // 0..1
}

const BASE = buildBaseCurve();

// ---------- Region parameters (initial estimates) ----------
// alpha: floor, beta: scale, gamma: curvature, phi: phase shift (in "물" steps)
const REGION_PARAMS: Record<string, { alpha: number; beta: number; gamma: number; phi: number }> = {
  "서해/인천": { alpha: 2, beta: 80, gamma: 0.85, phi: -1 },
  "남해/마산": { alpha: 4, beta: 80, gamma: 1.20, phi: -2 },
  "동해/속초": { alpha: 3, beta: 78, gamma: 1.00, phi: -1 },
  "제주/제주": { alpha: 2, beta: 85, gamma: 1.10, phi: -2 },
};

// ---------- National neutral fallback ----------
const NATIONAL_BASE = (() => {
  const regs = Object.keys(FLOW_TABLE);
  const acc = Array(15).fill(0);
  regs.forEach(k => FLOW_TABLE[k as keyof typeof FLOW_TABLE].forEach((v, i) => acc[i] += v));
  return acc.map(v => Math.round(v / regs.length));
})();

(FLOW_TABLE as any)["전국"] = NATIONAL_BASE;
(REGION_PARAMS as any)["전국"] = { alpha: 3, beta: 80, gamma: 1.0, phi: -1 };

// ---------- Region resolving ----------
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * regionArg:
 *  - string: exact key ("서해/인천"|"남해/마산"|"동해/속초"|"제주/제주") or a station name containing alias keywords
 *  - object: {lat:number, lon:number} → choose nearest REGION_ANCHOR
 */
function resolveRegion(regionArg: string | { lat: number; lon: number }): string {
  if (typeof regionArg === "string" && FLOW_TABLE[regionArg as keyof typeof FLOW_TABLE]) return regionArg;

  if (typeof regionArg === "string") {
    for (const [kw, mapped] of Object.entries(REGION_ALIAS)) {
      if (regionArg.includes(kw)) return mapped;
    }
  }

  if (regionArg && typeof regionArg === "object" && "lat" in regionArg && "lon" in regionArg) {
    let bestKey = "전국", bestKm = Infinity;
    for (const [key, an] of Object.entries(REGION_ANCHOR)) {
      const d = haversineKm(regionArg.lat, regionArg.lon, an.lat, an.lon);
      if (d < bestKm) { bestKm = d; bestKey = key; }
    }
    return bestKey;
  }

  return "전국";
}

// ---------- Amplitude (amp) handling ----------
function remapTideRangeToAmp(x: number): number {
  const norm = clamp01(x);              // assume 0~1 if raw range is unknown
  return 0.35 + norm * (1.00 - 0.35);   // → [0.35, 1.00]
}

type AmpInput =
  | { type: "explicit"; value: number }
  | { type: "tide_range"; value: number; region?: any }
  | { type: "label"; value: "무시" | "조금" | "일반" | "최대" }
  | undefined;

function resolveAmp(regionKey: string, amp: AmpInput): number {
  if (!amp) return 0.85;
  if (amp.type === "explicit") return clamp01(amp.value);
  if (amp.type === "tide_range") return remapTideRangeToAmp(amp.value);
  if (amp.type === "label") {
    switch (amp.value) {
      case "무시": return 0.35;
      case "조금": return 0.50;
      case "최대": return 1.00;
      case "일반":
      default: return 0.85;
    }
  }
  return 0.85;
}

// ---------- Predictive model ----------
function basePredict(regionKey: string, mul: number): number {
  const p = REGION_PARAMS[regionKey];
  if (!p) throw new Error(`알 수 없는 지역: ${regionKey}`);
  const idx = ((mul - 1 + p.phi) % 15 + 15) % 15; // phase shift over 15-step cycle
  const b = Math.max(BASE[idx], 0); // in [0,1]
  return p.alpha + p.beta * Math.pow(b, p.gamma); // roughly 0..100 domain
}

// ---------- Public API ----------
/**
 * getFlowRate(regionArg, mulOrLabel, ampInput)
 * - regionArg: string region key / station name / {lat,lon}
 * - mulOrLabel: number 1..15 or "1물"/"조금"/"무시"
 * - ampInput:
 *    { type: "explicit",   value: number }              // 0..1
 *  | { type: "tide_range", value: number, region?:any } // normalized 0..1
 *  | { type: "label",      value: "무시"|"조금"|"일반"|"최대" }
 */
export function getFlowRate(
  regionArg: string | { lat: number; lon: number },
  mulOrLabel: string | number,
  ampInput?: AmpInput
): number {
  const regionKey = resolveRegion(regionArg);
  const table = FLOW_TABLE[regionKey as keyof typeof FLOW_TABLE];
  if (!table) throw new Error(`⚠️ 알 수 없는 지역: ${regionKey}`);

  // Special labels (e.g., "무시")
  if (typeof mulOrLabel === "string") {
    const spec = SPECIAL_FLOW[regionKey]?.[mulOrLabel.trim()];
    if (spec != null) {
      const amp = resolveAmp(regionKey, ampInput);
      const v = spec * amp;
      const out = Math.max(0, Math.min(100, Math.round(v)));
      console.log(`🌊 [${regionKey}] '${mulOrLabel}' 단계: ${out}% (진폭보정=${amp})`);
      return out;
    }
  }

  const mul = parseMul(mulOrLabel);
  if (!mul) throw new Error(`지원하지 않는 표기: ${mulOrLabel}`);

  const lookup = table[mul - 1];
  const model = basePredict(regionKey, mul);
  const blended = 0.6 * model + 0.4 * lookup;     // model:lookup = 60:40
  const amp = resolveAmp(regionKey, ampInput);
  const scaled = blended * amp;
  const result = Math.max(0, Math.min(100, Math.round(scaled)));

  // Console/UI in Korean
  console.log(`🌊 [${regionKey}] ${mul}물 예상 흐름률: ${result}% (진폭보정=${amp})`);
  return result;
}

// Map our RegionKey to engine region keys
export function mapRegionKeyToEngine(regionKey: 'WEST' | 'SOUTH' | 'EAST' | 'JEJU'): string {
  const map = {
    WEST: '서해/인천',
    SOUTH: '남해/마산',
    EAST: '동해/속초',
    JEJU: '제주/제주'
  };
  return map[regionKey];
}
