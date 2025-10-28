import { findNearestStation, fetchTideExtremes, pickPrimary } from '@/lib/tideExtreme';
import { pickNearestTimeRow, linearFlowPercent, cosineFlowPercent, moonToMulTtae, flowPercentFromExtremes } from '@/lib/marineExtras';
import { moonPhaseToMulTtae } from '@/lib/mulTtae';
import { TIDE_STAGE_FLOW_BASELINE } from '@/config/tideStageMap';
import { KHOA_API_KEY } from '@/lib/config';

type TideExtreme = {
  time: string;
  level: number;
};

export type StageDay = {
  date: string;
  stage: string;
  flowPct: number | null;
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
  stageForecast?: StageDay[]; // 7-day forecast
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

async function fetchDailyMoonPhases(lat: number, lng: number, days = 7): Promise<{ date: string; phase01: number }[]> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto&daily=moon_phase&forecast_days=${days}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    const times: string[] = json?.daily?.time ?? [];
    const phases: number[] = json?.daily?.moon_phase ?? [];
    return times.map((t, i) => ({ date: t, phase01: phases[i] }));
  } catch (e) {
    console.error('❌ Moon phase fetch error:', e);
    return [];
  }
}

export async function loadMarineBundle(lat: number, lng: number): Promise<MarineBundle> {
  const station = findNearestStation(lat, lng);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const now = Date.now();

  // Fetch all data in parallel
  const [tidesResult, sstKHOA, moonPhases] = await Promise.allSettled([
    fetchTideExtremes(station.code, dateStr),
    fetchKHOASST(station.code, dateStr),
    fetchDailyMoonPhases(lat, lng, 7),
  ]);

  // Process tides
  let high: TideExtreme | undefined;
  let low: TideExtreme | undefined;
  let range: number | undefined;
  let todayFlowPct: number | undefined;
  let allExtremeTimes: string[] = [];

  if (tidesResult.status === 'fulfilled') {
    const { highs, lows } = tidesResult.value;
    const primary = pickPrimary(highs, lows);
    high = primary.high;
    low = primary.low;
    range = primary.rangeToday;

    // Collect all extreme times for flow calculation
    allExtremeTimes = [...highs.map(h => h.time), ...lows.map(l => l.time)];
    todayFlowPct = flowPercentFromExtremes(allExtremeTimes, now);
  }

  // Process SST with fallback
  let sstFinal: number | undefined;
  if (sstKHOA.status === 'fulfilled' && sstKHOA.value != null) {
    sstFinal = sstKHOA.value;
  } else {
    // Fallback to Open-Meteo
    sstFinal = await fetchOpenMeteoSST(lat, lng);
  }

  // Process 물때 (mul-ttae) and 7-day forecast
  let mulTtae: string | undefined;
  let stageForecast: StageDay[] = [];

  if (moonPhases.status === 'fulfilled' && moonPhases.value.length > 0) {
    const phases = moonPhases.value;
    
    // Today's 물때
    if (phases[0]) {
      const mt = moonPhaseToMulTtae(phases[0].phase01);
      mulTtae = mt.label;
    }

    // 7-day forecast with baseline flow%
    stageForecast = phases.map((d, idx) => {
      const mt = moonPhaseToMulTtae(d.phase01);
      let baseline: number | null = null;
      
      if (mt.label === '조금' || mt.label === '무시') {
        baseline = TIDE_STAGE_FLOW_BASELINE[mt.label];
      } else if (mt.index) {
        baseline = TIDE_STAGE_FLOW_BASELINE[`${mt.index}물` as keyof typeof TIDE_STAGE_FLOW_BASELINE] ?? null;
      }
      
      // For today (idx 0), use live flow% if available
      const flowPct = (idx === 0 && todayFlowPct != null) ? todayFlowPct : baseline;
      
      return { date: d.date, stage: mt.label, flowPct };
    });
  }

  return {
    stationName: station.name,
    tides: {
      high,
      low,
      range,
      progressPct: todayFlowPct,
    },
    sst: sstFinal,
    mulTtae,
    stageForecast,
    updatedAt: new Date().toISOString(),
  };
}
