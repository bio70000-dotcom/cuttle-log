// =====================================================
//  Tide Range Data Loader (ESM/fetch-based)
//  No CommonJS require(), pure ESM browser code
// =====================================================

/**
 * Tide range data row structure
 * @property date - KST calendar date (YYYY-MM-DD)
 * @property range - Tidal range amplitude in cm
 * @property count - Number of extremes (typically 3 or 4 per day)
 */
export type TideRangeRow = {
  date: string;
  range: number;
  count: number;
};

/**
 * Load tide range data from static JSON asset.
 * Uses fetch API - no require() or Node.js APIs.
 * @returns Promise resolving to array of tide range data
 * @throws Error if fetch fails or JSON is invalid
 */
export async function loadTideRange(): Promise<TideRangeRow[]> {
  const res = await fetch("/data/tideRange.json", { 
    cache: "no-store" 
  });
  
  if (!res.ok) {
    throw new Error(
      `Failed to load /data/tideRange.json: ${res.status} ${res.statusText}`
    );
  }
  
  const json = await res.json();
  
  if (!Array.isArray(json)) {
    throw new Error("Invalid tideRange.json: expected an array");
  }
  
  return json as TideRangeRow[];
}
