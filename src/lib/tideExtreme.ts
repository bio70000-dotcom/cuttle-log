import stations from "@/data/khoaStations.json";

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
  const key = import.meta.env.VITE_KHOA_API_KEY;
  const url = `/khoaapi/oceangrid/tideObsPreTab/search.do?ServiceKey=${key}&ObsCode=${stationCode}&Date=${yyyymmdd}&ResultType=json`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const r = await fetch(url, { signal: controller.signal });
    const json = await r.json();
    clearTimeout(timeout);

    const rows = (json?.result?.data ?? json?.data ?? []) as any[];
    const today = yyyymmdd.slice(0, 4) + '-' + yyyymmdd.slice(4, 6) + '-' + yyyymmdd.slice(6, 8);
    const norm: Array<{ type: 'HIGH' | 'LOW'; time: string; level: number }> = [];

    for (const r of rows) {
      const raw = (r.hl_code ?? '').toString();
      const t = String(r.tph_time ?? '');
      const v = Number(r.tph_level);
      if (!Number.isFinite(v) || !t.startsWith(today)) continue;
      
      const isHigh = raw.includes('고') || raw.toUpperCase() === 'H';
      const isLow = raw.includes('저') || raw.toUpperCase() === 'L';
      if (!isHigh && !isLow) continue;
      
      norm.push({
        type: isHigh ? 'HIGH' : 'LOW',
        time: new Date(t).toISOString(),
        level: v,
      });
    }

    const highs = norm.filter((n) => n.type === 'HIGH').sort((a, b) => a.time.localeCompare(b.time));
    const lows = norm.filter((n) => n.type === 'LOW').sort((a, b) => a.time.localeCompare(b.time));

    return { highs, lows };
  } catch (e: any) {
    clearTimeout(timeout);
    throw new Error('조석 극치 정보를 불러올 수 없습니다');
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
