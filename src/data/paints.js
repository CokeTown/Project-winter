/* ============================================================
   paints.js — 도료 12계열 (REWARD-LOOP ② 지역 시그니처의 1차 착지, 디렉터 확정 2026-07-08)
   ------------------------------------------------------------
   전환: 가구 스와치 공짜 클릭 → 도료 게이트. 폐허에서 주운 현실 페인트 통(계열 단위)이
   있어야 칠할 수 있다 — 도감이 클릭 체크리스트에서 장기 파밍 목표가 된다.
   규칙: 1통 = 1회 도색(소모품) · 기본색(colorIdx 0)은 영원히 무료 · 파워 아님(코지 안전선).
   분류: 가구 색 hex를 HSL 규칙으로 12계열에 자동 편입 — 신규 가구 색도 데이터 추가만으로 합류.
   이 파일은 의존성 0의 순수 데이터+순수 함수 (import 금지 — 순환 방지).
   ============================================================ */
export const PAINT_FAMILIES = {
  whitewash:   { name: '화이트워시',   nameEn: 'Whitewash',    swatch: 0xd8d3c8, icon: '' },
  ashgray:     { name: '재 그레이',    nameEn: 'Ash Gray',     swatch: 0x8a8f96, icon: '' },
  charcoal:    { name: '목탄',         nameEn: 'Charcoal',     swatch: 0x3a3d42, icon: '' },
  oakStain:    { name: '오크 스테인',  nameEn: 'Oak Stain',    swatch: 0xa07850, icon: '' },
  walnutStain: { name: '월넛 스테인',  nameEn: 'Walnut Stain', swatch: 0x64452e, icon: '' },
  redOxide:    { name: '방청 레드',    nameEn: 'Red Oxide',    swatch: 0xa8433f, icon: '' },
  terracotta:  { name: '테라코타',     nameEn: 'Terracotta',   swatch: 0xc9662f, icon: '' },
  mustard:     { name: '머스터드',     nameEn: 'Mustard',      swatch: 0xb08a3a, icon: '' },
  olive:       { name: '올리브',       nameEn: 'Olive Drab',   swatch: 0x6a7047, icon: '' },
  sage:        { name: '세이지',       nameEn: 'Sage',         swatch: 0x93b5a5, icon: '' },
  slateBlue:   { name: '슬레이트 블루', nameEn: 'Slate Blue',  swatch: 0x46557a, icon: '' },
  lavender:    { name: '라벤더',       nameEn: 'Lavender',     swatch: 0x9a8aa8, icon: '' },
};
// 희귀 안료 (디렉터 확정 2026-07-09) — 일반 12계열과 분리된 도시 전용 최희귀 도료.
//   일반 파밍 풀(rollPaintFamily)에 안 들어간다 — 지정 지역 전용 저확률 드랍으로만 나온다.
//   시그니처 발광 가구(네온)의 색은 이 안료로만 칠할 수 있어 "그 색은 그 도시에서만"이 한 층 깊어진다.
export const RARE_PAINTS = {
  neonPigment: { name: '네온 안료', nameEn: 'Neon Pigment', swatch: 0x9a5ad4, icon: '', region: 'citycore' },
};
// 시그니처 아이템별 도료 게이트 오버라이드: 기본색(0) 외 스와치는 hex 계열이 아니라 이 안료를 요구한다.
export const SIGNATURE_PAINT = { neonvip: 'neonPigment', neonair: 'neonPigment' };
// 이름/스와치 조회용 통합 맵 (일반 12 + 희귀). rollPaintFamily는 PAINT_FAMILIES만 쓴다(희귀는 별도 드랍).
export const PAINT_ALL = { ...PAINT_FAMILIES, ...RARE_PAINTS };
// hex → HSL (h: 0~360, s/l: 0~1)
function hslOf(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (mx !== mn) {
    const d = mx - mn;
    h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s, l };
}
// 가구 색 hex → 도료 계열 id. 규칙은 실제 124색 분포(2026-07-08 실측)에 맞춰 조정 — 전 색 편입·전 계열 비공집합.
export function paintFamilyOf(hex) {
  const { h, s, l } = hslOf(hex);
  if (l >= 0.68) return 'whitewash';                       // 빛바랜 밝은 톤 전부 (크림·파스텔 포함)
  if (s <= 0.14) return l >= 0.30 ? 'ashgray' : 'charcoal'; // 저채도 — 회색/근흑
  if (h < 18 || h >= 340) return 'redOxide';
  if (h < 33) return s >= 0.40 ? 'terracotta' : (l < 0.36 ? 'walnutStain' : 'oakStain');
  if (h < 50) return s >= 0.42 ? 'mustard' : (l < 0.36 ? 'walnutStain' : 'oakStain');
  if (h < 82) return 'olive';
  if (h < 190) return 'sage';
  if (h < 262) return 'slateBlue';
  return 'lavender';
}
// 도색에 실제로 요구되는 계열: 시그니처 아이템은 전용 안료를, 나머지는 hex 자동 분류를 따른다.
//   game.js showSelPanel이 스와치 게이트/툴팁/소모에 이걸 쓴다(기본색 0은 호출 전에 무료 처리).
export function paintFamilyRequired(defId, hex) {
  return SIGNATURE_PAINT[defId] || paintFamilyOf(hex);
}
