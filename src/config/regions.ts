export type RegionKey = 'WEST'|'SOUTH'|'EAST'|'JEJU';

export const REGION_POLYGONS: Record<RegionKey, Array<[number, number]>> = {
  // [lat, lng] in WGS84. These are coarse geofences (not exact maritime boundaries).
  WEST: [
    [38.7, 124.5],[38.7, 126.9],[37.0, 126.9],[36.0, 126.5],[35.2, 126.0],[34.4, 125.0],[33.8, 124.5],[37.5, 124.5]
  ],
  SOUTH: [
    [35.6, 126.0],[35.6, 129.5],[34.5, 129.5],[34.0, 128.5],[33.9, 127.5],[34.2, 126.5],[34.6, 126.0]
  ],
  EAST: [
    [38.8, 129.6],[38.8, 131.0],[36.0, 131.0],[35.6, 129.6],[37.5, 129.6]
  ],
  JEJU: [
    [33.7, 126.0],[33.7, 127.2],[32.8, 127.2],[32.8, 126.0]
  ]
};

// Point-in-polygon (ray-casting)
export function insidePolygon(lat:number, lng:number, poly: Array<[number,number]>){
  let inside = false;
  for (let i=0,j=poly.length-1; i<poly.length; j=i++){
    const [yi, xi] = poly[i]; // lat, lng
    const [yj, xj] = poly[j];
    const intersect = ((xi>lng)!==(xj>lng)) &&
      (lat < (yj-yi)*(lng-xi)/(xj-xi) + yi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Robust region resolver ensuring Masan (35.2, 128.57) is always classified as SOUTH.
 * Uses conservative thresholds to prevent misclassification.
 */
export function resolveRegion(lat: number, lng: number): RegionKey {
  // Check Jeju first (southernmost islands)
  if (lat <= 34.0) return 'JEJU';
  
  // Check polygons
  if (insidePolygon(lat, lng, REGION_POLYGONS.JEJU)) return 'JEJU';
  if (insidePolygon(lat, lng, REGION_POLYGONS.SOUTH)) return 'SOUTH';
  if (insidePolygon(lat, lng, REGION_POLYGONS.WEST)) return 'WEST';
  if (insidePolygon(lat, lng, REGION_POLYGONS.EAST)) return 'EAST';
  
  // Fallback: conservative thresholds to ensure proper classification
  // Masan (35.2, 128.57) must always be SOUTH
  if (lng < 126.0) return 'WEST';   // West coast (more conservative than 127.0)
  if (lng >= 129.0) return 'EAST';  // East coast (more conservative than 129.5)
  return 'SOUTH';                   // Default to SOUTH for central/southern coast (126.0-129.0)
}

export const REGION_NAMES: Record<RegionKey, string> = {
  WEST: '서해',
  SOUTH: '남해',
  EAST: '동해',
  JEJU: '제주'
};
