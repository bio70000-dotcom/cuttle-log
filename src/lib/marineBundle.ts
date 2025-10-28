import { findNearestStation, fetchTideExtremes, pickPrimary } from '@/lib/tideExtreme';
import { pickNearestTimeRow, linearFlowPercent, cosineFlowPercent, moonToMulTtae } from '@/lib/marineExtras';
import { KHOA_API_KEY } from '@/lib/config';

type TideExtreme = {
  time: string;
  level: number;
};

export type MarineBundle = {
  stationName: string;
  tides: {
    high?: TideExtreme;
    low?: TideExtreme;
    range?: number;
    progressPct?: number;
    progressCosPct?: number;
  };
  sst?: number; // sea surface temperature in °C
  mulTtae?: string; // 물때 label
  updatedAt: string;
};

async function fetchKHOASST(stationCode: string, yyyymmdd: string): Promise<number | undefined> {
  if (!KHOA_API_KEY) return undefined;

  const url = new URL('/khoaapi/oceangrid/waterTempObs/search.do', window.location.origin);
  url.searchParams.set('ServiceKey', KHOA_API_KEY);
  url.searchParams.set('ObsCode', stationCode);
  url.searchParams.set('Date', yyyymmdd);
  url.searchParams.set('ResultType', 'json');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!res.ok) return undefined;

    const json = await res.json();
    const rows = (json?.result?.data ?? json?.data ?? []) as any[];
    
    // Pick row nearest to current hour
    const mapped = rows.map((r) => ({
      time: String(r.record_time ?? ''),
      value: Number(r.water_temp),
    })).filter((r) => r.time && Number.isFinite(r.value));

    const row = pickNearestTimeRow(mapped) as { time?: string; value?: number } | undefined;
    return row?.value;
  } catch (e) {
    console.error('❌ KHOA SST fetch error:', e);
    return undefined;
  }
}

async function fetchOpenMeteoSST(lat: number, lng: number): Promise<number | undefined> {
  try {
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&timezone=auto&hourly=sea_surface_temperature`;
    const res = await fetch(url);
    if (!res.ok) return undefined;

    const json = await res.json();
    const times = json?.hourly?.time ?? [];
    const temps = json?.hourly?.sea_surface_temperature ?? [];
    
    const arr = times.map((t: string, i: number) => ({
      time: t,
      value: temps[i],
    }));

    const row = pickNearestTimeRow(arr) as { time?: string; value?: number } | undefined;
    const v = Number(row?.value);
    return Number.isFinite(v) ? v : undefined;
  } catch (e) {
    console.error('❌ Open-Meteo SST fetch error:', e);
    return undefined;
  }
}

async function fetchMoonPhase(lat: number, lng: number): Promise<number | undefined> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=moon_phase&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return undefined;

    const json = await res.json();
    return json?.daily?.moon_phase?.[0];
  } catch (e) {
    console.error('❌ Moon phase fetch error:', e);
    return undefined;
  }
}

export async function loadMarineBundle(lat: number, lng: number): Promise<MarineBundle> {
  const station = findNearestStation(lat, lng);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Fetch all data in parallel
  const [tidesResult, sstKHOA, moonPhase] = await Promise.allSettled([
    fetchTideExtremes(station.code, dateStr),
    fetchKHOASST(station.code, dateStr),
    fetchMoonPhase(lat, lng),
  ]);

  // Process tides
  let high: TideExtreme | undefined;
  let low: TideExtreme | undefined;
  let range: number | undefined;
  let flowLinear: number | undefined;
  let flowCos: number | undefined;

  if (tidesResult.status === 'fulfilled') {
    const { highs, lows } = tidesResult.value;
    const primary = pickPrimary(highs, lows);
    high = primary.high;
    low = primary.low;
    range = primary.rangeToday;

    // Calculate flow percent - find prev and next extremes around current time
    const now = Date.now();
    const allExtremes = [...highs, ...lows].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
    
    let prev: TideExtreme | undefined;
    let next: TideExtreme | undefined;
    
    for (let i = 0; i < allExtremes.length; i++) {
      const t = new Date(allExtremes[i].time).getTime();
      if (t <= now) {
        prev = allExtremes[i];
      }
      if (t > now && !next) {
        next = allExtremes[i];
        break;
      }
    }
    
    if (prev && next) {
      flowLinear = linearFlowPercent(prev.time, next.time, now);
      flowCos = cosineFlowPercent(prev.time, next.time, now);
    }
  }

  // Process SST with fallback
  let sstFinal: number | undefined;
  if (sstKHOA.status === 'fulfilled' && sstKHOA.value != null) {
    sstFinal = sstKHOA.value;
  } else {
    // Fallback to Open-Meteo
    sstFinal = await fetchOpenMeteoSST(lat, lng);
  }

  // Process 물때 (mul-ttae)
  let mulTtae: string | undefined;
  if (moonPhase.status === 'fulfilled' && moonPhase.value != null) {
    const mt = moonToMulTtae(moonPhase.value, 'A');
    mulTtae = mt.label;
  }

  return {
    stationName: station.name,
    tides: {
      high,
      low,
      range,
      progressPct: flowLinear,
      progressCosPct: flowCos,
    },
    sst: sstFinal,
    mulTtae,
    updatedAt: new Date().toISOString(),
  };
}
