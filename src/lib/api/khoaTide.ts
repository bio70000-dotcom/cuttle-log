// TODO: Implement KHOA (Korea Hydrographic and Oceanographic Agency) API
// Requires API key from https://www.khoa.go.kr/

export interface TideData {
  stage: number; // 1-12
  highTimes: string[];
  lowTimes: string[];
  lastFetched: Date;
}

export async function fetchKHOATide(lat: number, lng: number, date: Date, apiKey?: string): Promise<TideData> {
  // Stub implementation
  console.log('fetchKHOATide stub called', { lat, lng, date, apiKey });
  
  if (!apiKey) {
    throw new Error('KHOA API 키가 설정되지 않았습니다');
  }

  // TODO: Replace with actual KHOA API call
  // const response = await fetch(`KHOA_ENDPOINT?lat=${lat}&lng=${lng}&date=${date}&key=${apiKey}`);
  // const data = await response.json();
  
  return {
    stage: 8,
    highTimes: ['10:23'],
    lowTimes: ['04:15', '16:45'],
    lastFetched: new Date(),
  };
}
