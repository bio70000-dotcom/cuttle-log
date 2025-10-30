import { 
  findNearestStation, 
  fetchTideExtremes, 
  fetchTideExtremesMultiDay,
  pickPrimary, 
  groupDailyRangeKST 
} from '@/lib/tideExtreme';
import { resolveStageByRollingMin } from '@/lib/stageResolver';
import { normalizeRangeRolling } from '@/lib/ampNormalizer';
import { formatKST } from '@/lib/time';
import { pickNearestTimeRow } from '@/lib/marineExtras';
import { stageForRegionUsingNeap } from '@/lib/mulTtae';
import { resolveRegion, type RegionKey } from '@/config/regions';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLocationStore } from '@/stores/locationStore';
import { KHOA_API_KEY } from '@/lib/config';
import { fetchDailyMoonPhases } from '@/lib/meteo';
import { getFlowRate, mapRegionKeyToEngine } from '@/lib/tidalFlowEngine';

// =====================================================
//  🌊 Engine Integration Helpers (Code: EN, UI: KR)
// =====================================================

/**
 * Convert tidal stage label to engine's mulOrLabel format
 */
function stageToMulOrLabel(stage: string): number | string {
  const s = stage.trim();
  if (s === "조금") return "조금";   // engine interprets as 15물
  if (s === "무시") return "무시";   // Incheon-specific
  if (/^\d+물?$/.test(s)) return s;  // e.g., "1물", "7물"
  return "일반";                     // fallback
}

/**
 * Build amplitude input from available signals
 */
function makeAmpInputFromSignals(signals?: {
  tideRangeNorm?: number;
  label?: "무시" | "조금" | "일반" | "최대";
}): any | undefined {
  if (!signals) return undefined;
  if (signals.label) return { type: "label", value: signals.label };
  if (typeof signals.tideRangeNorm === "number")
    return { type: "tide_range", value: signals.tideRangeNorm };
  return undefined;
}

/**
 * ✅ Single source of truth for flow percentage calculation
 * Computes tidal flow% using ONLY the engine result
 */
function computeFlowPercent(params: {
  regionArg: string | { lat: number; lon: number };
  stage: string;
  ampSignals?: { tideRangeNorm?: number; label?: "무시"|"조금"|"일반"|"최대" };
}): number {
  const mulOrLabel = stageToMulOrLabel(params.stage);
  const ampInput = makeAmpInputFromSignals(params.ampSignals);
  
  // ✅ Engine is the only source of truth
  const pct = getFlowRate(params.regionArg, mulOrLabel, ampInput);
  
  return pct;
}

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

// Moved to src/lib/meteo.ts

export async function loadMarineBundle(lat?: number, lng?: number): Promise<MarineBundle> {
  // 1) Resolve coordinates
  const loc = useLocationStore.getState();
  const LAT = lat ?? loc.lat;
  const LNG = lng ?? loc.lng;
  
  if (LAT == null || LNG == null) {
    throw new Error('좌표 없음: 위치를 먼저 설정해주세요.');
  }
  
  if (typeof window !== 'undefined') {
    (window as any).__lat = LAT;
    (window as any).__lng = LNG;
  }

  const station = findNearestStation(LAT, LNG);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const today = formatKST(new Date());

  // Resolve region from GPS or manual override
  const settings = useSettingsStore.getState();
  const region: RegionKey = settings.regionMode === 'AUTO'
    ? resolveRegion(LAT, LNG)
    : (settings.regionManual || resolveRegion(LAT, LNG));

  // Calculate start date for 15-day rolling window (14 days before today + today)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const startYyyymmdd = startDate.toISOString().slice(0, 10).replace(/-/g, '');

  // Fetch all data in parallel
  const [tidesResult, rollingExtremes, sstKHOA, moonPhases] = await Promise.allSettled([
    fetchTideExtremes(station.code, dateStr),
    fetchTideExtremesMultiDay(station.code, startYyyymmdd, 15),
    fetchKHOASST(station.code, dateStr),
    fetchDailyMoonPhases(LAT, LNG, 7).catch(() => []), // Always return array even on error
  ]);

  // Process tides
  let highs: TideExtreme[] = [];
  let lows: TideExtreme[] = [];
  let range: number | undefined;

  if (tidesResult.status === 'fulfilled') {
    highs = tidesResult.value.highs;
    lows = tidesResult.value.lows;
    
    // Calculate range from primary high/low
    const primary = pickPrimary(highs, lows);
    range = primary.rangeToday;
    
    const allExtremeTimes = [...highs.map(h => h.time), ...lows.map(l => l.time)];
    console.log('🌊 조석 극값 시각:', allExtremeTimes);
  }

  // Process SST with fallback
  let sstFinal: number | undefined;
  if (sstKHOA.status === 'fulfilled' && sstKHOA.value != null) {
    sstFinal = sstKHOA.value;
  } else {
    // Fallback to Open-Meteo
    sstFinal = await fetchOpenMeteoSST(LAT, LNG);
  }

  // =====================================================
  //  🌊 Stage Resolution Using Rolling 15-Day Analysis
  // =====================================================
  
  let mulTtae: string | undefined;
  let stageForecast: StageDay[] = [];
  let todayFlowPct: number | undefined;

  // Process rolling tide data for stage determination
  if (rollingExtremes.status === 'fulfilled' && rollingExtremes.value.length > 0) {
    const extremes = rollingExtremes.value;
    const daily = groupDailyRangeKST(extremes);
    
    console.log('📊 일별 조석 범위:', daily);
    
    if (daily.length >= 15) {
      // Determine today's stage using local minima detection
      const stageResult = resolveStageByRollingMin(daily, today, 15, 2);
      
      if (stageResult) {
        mulTtae = stageResult.label;
        console.log(`🧭 물때 결정: 앵커(${stageResult.anchorDate})=조금 → 오늘=${mulTtae}`);
        
        // Normalize amplitude using rolling 15-day range
        const tideRangeNorm = normalizeRangeRolling(daily, today);
        console.log('📏 조석 범위 (롤링 정규화):', tideRangeNorm?.toFixed(2) ?? 'N/A');
        
        // Map region to engine format
        const engineRegion = mapRegionKeyToEngine(region);
        
        // Calculate today's flow percentage using the engine
        todayFlowPct = computeFlowPercent({
          regionArg: engineRegion,
          stage: mulTtae,
          ampSignals: tideRangeNorm != null ? { tideRangeNorm } : undefined
        });
        
        // Generate 7-day forecast using moon phases as supplementary data
        const phases = moonPhases.status === 'fulfilled' ? moonPhases.value : [];
        if (phases.length > 0) {
          stageForecast = phases.map((d, idx) => {
            // For future days, use neap-based estimation from moon phases
            const st = stageForRegionUsingNeap(d.phase01, region, station.name);
            const flowPct = computeFlowPercent({
              regionArg: engineRegion,
              stage: st.stage,
              ampSignals: tideRangeNorm != null ? { tideRangeNorm } : undefined
            });
            return { date: d.date, stage: st.stage, flowPct, region };
          });
          
          // Override today's forecast with accurate rolling-based data
          if (stageForecast[0]) {
            stageForecast[0].stage = mulTtae;
            stageForecast[0].flowPct = todayFlowPct ?? null;
          }
        }
      } else {
        console.warn('⚠️ 물때 결정 실패: 국지 최소값을 찾을 수 없습니다');
      }
    } else {
      console.warn('⚠️ 데이터 부족: 15일 데이터가 필요합니다 (현재:', daily.length, '일)');
    }
  } else {
    console.error('❌ 롤링 조석 데이터를 불러올 수 없습니다');
  }

  // Fallback: if rolling analysis failed, use moon phases
  if (!mulTtae) {
    const phases = moonPhases.status === 'fulfilled' ? moonPhases.value : [];
    if (phases.length > 0) {
      console.log('⚠️ 롤링 분석 실패 → 달 위상 보조 사용');
      const tideRangeNorm = range ? Math.min(range / 300, 1.0) : undefined;
      const engineRegion = mapRegionKeyToEngine(region);
      
      stageForecast = phases.map((d) => {
        const st = stageForRegionUsingNeap(d.phase01, region, station.name);
        const flowPct = computeFlowPercent({
          regionArg: engineRegion,
          stage: st.stage,
          ampSignals: tideRangeNorm != null ? { tideRangeNorm } : undefined
        });
        return { date: d.date, stage: st.stage, flowPct, region };
      });
      
      if (stageForecast[0]) {
        mulTtae = stageForecast[0].stage;
        todayFlowPct = stageForecast[0].flowPct ?? undefined;
      }
    }
  }

  const bundle = {
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
  
  console.log('📦 해양정보 번들 생성 완료');
  
  // 디버그용: 개발 환경에서 브라우저 콘솔에서 확인 가능하도록 노출
  if (typeof window !== 'undefined') {
    const extremesISO = [...highs.map(h => h.time), ...lows.map(l => l.time)].sort();
    (window as any).__marineBundleDebug = {
      extremes: extremesISO,
      bundle,
      todayFlowPct,
      stageForecast
    };
    (window as any).__bundleData = bundle;
    console.log('🔍 디버그: window.__marineBundleDebug, window.__bundleData 저장 완료');
  }
  
  return bundle;
}
