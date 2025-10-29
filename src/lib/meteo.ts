export async function fetchDailyMoonPhases(lat: number | undefined, lng: number | undefined, days = 7) {
  if (lat == null || lng == null) {
    throw new Error('coords missing for moon_phase');
  }
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto&daily=moon_phase&forecast_days=${days}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo daily fetch failed: ${res.status}`);
    }

    const json = await res.json();
    const times: string[] = json?.daily?.time ?? [];
    const phases: number[] = json?.daily?.moon_phase ?? [];
    return times.map((t, i) => ({ date: t, phase01: phases[i] }));
  } catch (e) {
    console.error('❌ Moon phase fetch error:', e);
    throw e;
  }
}
