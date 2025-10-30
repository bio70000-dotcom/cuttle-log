// KHOA API base URL helper with dev/prod switching
const KHOA_BASE = import.meta.env.VITE_KHOA_BASE || (import.meta.env.DEV
  ? '/khoaapi'
  : 'https://www.khoa.go.kr');

export function khoaUrl(path: string, params: Record<string, string | number>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => usp.append(k, String(v)));
  
  // Ensure JSON by default
  if (!usp.has('ResultType')) usp.set('ResultType', 'json');
  
  // Normalize path separator
  const sep = path.startsWith('/') ? '' : '/';
  return `${KHOA_BASE}${sep}${path}?${usp.toString()}`;
}

export async function fetchJson(url: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🌊 KHOA URL:', url);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!r.ok) {
      console.error('❌ KHOA fetch error:', r.status, r.statusText);
      throw new Error(`KHOA API 응답 오류: ${r.status}`);
    }

    return await r.json();
  } catch (e: any) {
    clearTimeout(timeout);
    console.error('❌ KHOA fetch error:', e?.message);
    if (e.name === 'AbortError') {
      throw new Error('요청 시간 초과');
    }
    throw new Error(e.message || 'KHOA API 호출 실패');
  }
}
