// ✅ 환경변수 기반 설정
// .env.local / .env.production 에서 불러오기

export const KHOA_API_BASE =
  import.meta.env.VITE_KHOA_BASE ||
  (import.meta.env.DEV
    ? '/khoaapi' // dev: 프록시 베이스 (/api는 프록시가 붙여줌)
    : 'https://www.khoa.go.kr/api') // prod: /api 포함

/**
 * Unified KHOA API key resolver.
 * Priority: settingsStore (Zustand persist) → localStorage fallback → env var
 *
 * Zustand's persist middleware writes to localStorage under the store name,
 * but to avoid a circular dependency (config ← settingsStore ← config),
 * we read the localStorage key directly at call time.
 */
export function getKhoaApiKey(): string {
  // 1) localStorage key saved by SettingsPage (api_key_khoa)
  try {
    const fromStorage = localStorage.getItem('api_key_khoa')
    if (fromStorage && fromStorage.trim()) return fromStorage.trim()
  } catch {
    // localStorage unavailable (SSR / sandboxed context)
  }

  // 2) Build-time env var fallback
  return import.meta.env.VITE_KHOA_KEY || ''
}

/**
 * @deprecated Use getKhoaApiKey() instead.
 * Kept for backwards compatibility with existing imports.
 */
export const KHOA_API_KEY = import.meta.env.VITE_KHOA_KEY || ''
