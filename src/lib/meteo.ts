export type MoonDay = { date: string; phase01: number };

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Simple local lunar phase approximation (phase in [0,1))
function localMoonPhase01(date: Date): number {
  // Meeus-like rough approximation (good enough for stage labeling)
  const msPerDay = 86400000;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0); // 2000-01-06 18:14 UTC near new moon
  const synodic = 29.530588 * msPerDay;
  const diff = date.getTime() - knownNewMoon;
  const phase = ((diff % synodic) + synodic) % synodic;
  return phase / synodic;
}

export async function fetchDailyMoonPhases(lat: number | undefined, lng: number | undefined, days = 7): Promise<MoonDay[]> {
  if (lat == null || lng == null) {
    throw new Error('coords missing for moon_phase');
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&timezone=Asia%2FSeoul` +
    `&daily=moon_phase` +
    `&forecast_days=${days}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`⚠️ Open-Meteo daily failed: ${res.status}, using local fallback`);
      throw new Error('API failed');
    }

    const json = await res.json();
    const times: string[] = json?.daily?.time ?? [];
    const phases: number[] = json?.daily?.moon_phase ?? [];
    
    if (times.length && phases.length && times.length === phases.length) {
      console.log('✅ Open-Meteo moon phases:', times.length, 'days');
      return times.map((t, i) => ({ date: t, phase01: phases[i] }));
    }
    
    console.warn('⚠️ Open-Meteo returned empty arrays, using local fallback');
  } catch (e) {
    console.error('❌ Moon phase fetch error:', e, '- using local fallback');
  }

  // Local fallback: build N days starting today (KST)
  console.log('🌙 Using local moon phase calculation for', days, 'days');
  const base = new Date();
  const out: MoonDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
    out.push({ date: ymd(d), phase01: localMoonPhase01(d) });
  }
  return out;
}
