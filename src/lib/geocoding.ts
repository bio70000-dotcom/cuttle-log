const VWORLD_API_KEY = import.meta.env.VITE_VWORLD_API_KEY;

interface VWorldResponse {
  response: {
    status: string;
    result?: {
      text?: string;
    };
  };
}

interface NominatimResponse {
  display_name?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  // Try VWorld first
  if (VWORLD_API_KEY) {
    try {
      const url = `https://api.vworld.kr/req/address?service=address&request=getaddress&version=2.0&crs=EPSG:4326&point=${lng},${lat}&type=ROAD&format=json&key=${VWORLD_API_KEY}`;
      const response = await fetch(url);
      const data: VWorldResponse = await response.json();
      
      if (data.response.status === 'OK' && data.response.result?.text) {
        return data.response.result.text;
      }
    } catch (error) {
      console.warn('VWorld geocoding failed:', error);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FishingApp/1.0'
      }
    });
    const data: NominatimResponse = await response.json();
    
    if (data.display_name) {
      return data.display_name;
    }
  } catch (error) {
    console.warn('Nominatim geocoding failed:', error);
  }

  return undefined;
}
