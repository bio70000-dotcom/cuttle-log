import stations from "@/data/khoaStations.json";
import { KHOA_API_KEY } from "@/lib/config";
import { toKST, formatKST } from "@/lib/time";
import { khoaUrl, fetchJson } from "@/lib/khoa";

// KST 시간을 ISO 문자열로 변환 (시간대 정보 명시)
function toKstISO(localTime: string): string | undefined {
  if (!localTime) return undefined;
  // 'YYYY-MM-DD HH:mm:ss' -> 'YYYY-MM-DDTHH:mm:ss+09:00'
  const s = localTime.replace(' ', 'T') + '+09:00';
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function findNearestStation(lat: number, lng: number) {
  let nearest = stations[0];
  let min = 99999;
  for (const s of stations) {
    const d = haversine(lat, lng, s.lat, s.lng);
    if (d < min) {
      min = d;
      nearest = s;
    }
  }
  return nearest;
}

type TideExtreme = {
  time: string;
  level: number;
};

export async function fetchTideExtremes(
  stationCode: string,
  yyyymmdd: string
): Promise<{ highs: TideExtreme[]; lows: TideExtreme[] }> {
  const key = KHOA_API_KEY;
  if (!key) throw new Error('KHOA API 키가 설정되지 않았습니다');

  const url = khoaUrl('/api/oceangrid/tideObsPreTab/search.do', {
    ServiceKey: key,
    ObsCode: stationCode,
    Date: yyyymmdd,
  });

  try {
    const json = await fetchJson(url);
    console.log('📦 KHOA API 응답:', json);

    const rows = (json?.result?.data ?? json?.data ?? []) as any[];
    console.log(`📊 극치 데이터 레코드 수: ${rows.length}`);

    const today = yyyymmdd.slice(0, 4) + '-' + yyyymmdd.slice(4, 6) + '-' + yyyymmdd.slice(6, 8);
    const norm: Array<{ type: 'HIGH' | 'LOW'; time: string; level: number }> = [];

    for (const r of rows) {
      const raw = (r.hl_code ?? '').toString();
      const tLocal = String(r.tph_time ?? '');
      const tISO = toKstISO(tLocal);
      const v = Number(r.tph_level);
      
      // KST 시간대로 파싱된 ISO 문자열을 사용하여 날짜 필터링
      if (!tISO || !tLocal.startsWith(today) || !Number.isFinite(v)) continue;

      const isHigh = raw.includes('고') || raw.toUpperCase() === 'H';
      const isLow = raw.includes('저') || raw.toUpperCase() === 'L';
      if (!isHigh && !isLow) continue;

      norm.push({
        type: isHigh ? 'HIGH' : 'LOW',
        time: tISO,
        level: v,
      });
    }

    const highs = norm.filter((n) => n.type === 'HIGH').sort((a, b) => a.time.localeCompare(b.time));
    const lows = norm.filter((n) => n.type === 'LOW').sort((a, b) => a.time.localeCompare(b.time));

    console.log(`✅ 파싱 완료 - 만조: ${highs.length}개, 간조: ${lows.length}개`);

    return { highs, lows };
  } catch (e: any) {
    console.error('❌ 조석 극치 fetch 에러:', e);
    throw new Error(e.message || '조석 극치 정보를 불러올 수 없습니다');
  }
}

export function pickPrimary(highs: TideExtreme[], lows: TideExtreme[]) {
  const nowIso = new Date().toISOString();
  const nextHigh = highs.find((h) => h.time >= nowIso) ?? highs[0];
  const nextLow = lows.find((l) => l.time >= nowIso) ?? lows[0];
  
  const rangeToday =
    highs.length && lows.length
      ? Math.max(...highs.map((h) => h.level)) - Math.min(...lows.map((l) => l.level))
      : undefined;
  
  return { high: nextHigh, low: nextLow, rangeToday };
}

// =====================================================
//  Daily Range Grouping (KST-based)
// =====================================================

type Extreme = { time: string; type: "HIGH" | "LOW"; level: number };

export function groupDailyRangeKST(extremes: Extreme[]) {
  // 1) UTC→KST 변환
  const kst = extremes.map(x => ({ ...x, kst: toKST(x.time) }));

  // 2) KST 날짜별로 묶기
  const byDay = new Map<string, Extreme[]>();
  for (const e of kst) {
    const key = formatKST(e.kst); // "2025-10-30"
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(e);
  }

  // 3) 날짜별 range 계산
  const daily = Array.from(byDay.entries()).map(([date, arr]) => {
    const highs = arr.filter(a => a.type === "HIGH").map(a => a.level);
    const lows = arr.filter(a => a.type === "LOW").map(a => a.level);
    const maxHigh = highs.length ? Math.max(...highs) : NaN;
    const minLow = lows.length ? Math.min(...lows) : NaN;
    const range = (isFinite(maxHigh) && isFinite(minLow)) ? (maxHigh - minLow) : NaN;
    return { date, range, count: arr.length };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return daily; // [{date:"2025-10-29", range:...}, ...]
}

// =====================================================
//  Multi-day Fetch (15+ days for rolling analysis)
// =====================================================

export async function fetchTideExtremesMultiDay(
  stationCode: string,
  startYyyymmdd: string,
  days: number
): Promise<Extreme[]> {
  const all: Extreme[] = [];
  const start = new Date(
    parseInt(startYyyymmdd.slice(0, 4)),
    parseInt(startYyyymmdd.slice(4, 6)) - 1,
    parseInt(startYyyymmdd.slice(6, 8))
  );

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
    
    try {
      const { highs, lows } = await fetchTideExtremes(stationCode, yyyymmdd);
      all.push(...highs.map(h => ({ time: h.time, type: "HIGH" as const, level: h.level })));
      all.push(...lows.map(l => ({ time: l.time, type: "LOW" as const, level: l.level })));
    } catch (e) {
      console.warn(`⚠️ ${yyyymmdd} 조석 데이터 fetch 실패:`, e);
    }
  }

  return all;
}
