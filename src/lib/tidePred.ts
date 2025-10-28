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

export async function fetchTidePred(stationCode: string, dateStr: string) {
  const key = import.meta.env.VITE_KHOA_API_KEY;
  const url = `https://www.khoa.go.kr/api/oceangrid/tideCurPre/search.do?ServiceKey=${key}&ObsCode=${stationCode}&Date=${dateStr}&ResultType=json`;
  const r = await fetch(url);
  const j = await r.json();
  return j?.result?.data ?? [];
}

export function extractHighLow(data: any[]) {
  if (!data?.length) return { highs: [], lows: [] };
  const values = data.map((d) => ({ t: d.record_time, v: +d.pre_value }));
  const highs: string[] = [];
  const lows: string[] = [];
  for (let i = 1; i < values.length - 1; i++) {
    if (values[i - 1].v < values[i].v && values[i + 1].v < values[i].v) {
      highs.push(values[i].t);
    }
    if (values[i - 1].v > values[i].v && values[i + 1].v > values[i].v) {
      lows.push(values[i].t);
    }
  }
  return { highs, lows };
}
