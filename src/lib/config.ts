// ✅ 환경변수 기반 설정
// .env.local / .env.production 에서 불러오기

export const KHOA_API_KEY =
  import.meta.env.VITE_KHOA_KEY || '';

export const KHOA_API_BASE =
  import.meta.env.VITE_KHOA_BASE ||
  (import.meta.env.DEV
    ? '/khoaapi' // dev: 프록시 베이스 (/api는 프록시가 붙여줌)
    : 'https://www.khoa.go.kr/api'); // prod: /api 포함