import { KHOA_API_BASE } from '@/lib/config';

// ✅ 공통 KHOA base (dev: /khoaapi, prod: https://www.khoa.go.kr/api)
const KHOA_BASE = KHOA_API_BASE;

export function khoaUrl(path: string, params: Record<string, string | number>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => usp.append(k, String(v)));

  // 기본 응답 포맷을 JSON으로 강제
  if (!usp.has('ResultType')) usp.set('ResultType', 'json');

  // --- 방탄 처리 시작 ---
  // 1) path에 실수로 '/api/...' 가 온 경우 제거 (프록시/BASE가 이미 처리)
  if (path.startsWith('/api/')) {
    console.warn('[khoaUrl] stripping leading /api from path:', path);
    path = path.replace(/^\/api\//, '/');
  }
  // 2) '/oceangrid' 앞에 중복 슬래시 정리
  path = path.replace(/\/{2,}/g, '/');
  // --- 방탄 처리 끝 ---

  const sep = path.startsWith('/') ? '' : '/';
  const url = `${KHOA_BASE}${sep}${path}?${usp.toString()}`;

  if (import.meta.env.DEV) {
    console.info('🌊 KHOA URL:', url);
  }

  return url;
}

export async function fetchJson(url: string) {
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error('❌ KHOA fetch error:', r.status, r.statusText);
      throw new Error(`KHOA API 응답 오류: ${r.status}`);
    }
    return await r.json();
  } catch (e: any) {
    console.error('❌ KHOA fetch error:', e?.message || e);
    throw e;
  }
}
