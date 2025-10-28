import { findNearestStation, fetchTideExtremes, pickPrimary } from '@/lib/tideExtreme';
import { pickNearestTimeRow, flowPercentFromExtremes } from '@/lib/marineExtras';
import { stageForRegion } from '@/lib/mulTtae';
import { resolveRegion, type RegionKey } from '@/config/regions';
import { useSettingsStore } from '@/stores/settingsStore';
import { KHOA_API_KEY } from '@/lib/config';

type TideExtreme = {
  time: string;
  level: number;
};

export type StageDay = {
  date: string;
  stage: string;
  flowPct: number | null;
  region: RegionKey;
};

export type MarineBundle = {
  stationName: string;
  region: RegionKey;
  tides: {
    highs: TideExtreme[];
    lows: TideExtreme[];
    range?: number;
    progressPct?: number;
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

  // Resolve region from GPS or manual override
  const settings = useSettingsStore.getState();
  const region: RegionKey = settings.regionMode === 'AUTO'
    ? resolveRegion(lat, lng)
    : (settings.regionManual || resolveRegion(lat, lng));

  // Fetch all data in parallel
  const [tidesResult, sstKHOA, moonPhases] = await Promise.allSettled([
    fetchTideExtremes(station.code, dateStr),
    fetchKHOASST(station.code, dateStr),
    fetchDailyMoonPhases(lat, lng, 7),
  ]);

  // Process tides
  let highs: TideExtreme[] = [];
  let lows: TideExtreme[] = [];
  let range: number | undefined;
  let todayFlowPct: number | undefined;

  if (tidesResult.status === 'fulfilled') {
    highs = tidesResult.value.highs;
    lows = tidesResult.value.lows;
    
    // Calculate range from primary high/low
    const primary = pickPrimary(highs, lows);
    range = primary.rangeToday;

    // Collect all extreme times for flow calculation
    const allExtremeTimes = [...highs.map(h => h.time), ...lows.map(l => l.time)];
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

  // Process 물때 (mul-ttae) and 7-day forecast using region profile
  let mulTtae: string | undefined;
  let stageForecast: StageDay[] = [];

  if (moonPhases.status === 'fulfilled' && moonPhases.value.length > 0) {
    const phases = moonPhases.value;
    
    // 7-day forecast with region-aware stage & baseline flow%
    stageForecast = phases.map((d, idx) => {
      const st = stageForRegion(d.phase01, region);
      
      // For today (idx 0), use live flow% if available
      const flowPct = (idx === 0 && todayFlowPct != null) ? todayFlowPct : st.baselineFlow ?? null;
      
      return { date: d.date, stage: st.stage, flowPct, region };
    });
    
    // Today's 물때
    if (stageForecast[0]) {
      mulTtae = stageForecast[0].stage;
    }
  }

  return {
    stationName: station.name,
    region,
    tides: {
      highs,
      lows,
      range,
      progressPct: todayFlowPct,
    },
    sst: sstFinal,
    mulTtae,
    stageForecast,
    updatedAt: new Date().toISOString(),
  };
}
