// icon-semiotic.mjs — 세미오틱 글리프 생성기 (UI-PIXEL-UNITY §5)
// MU/TH/UR 터미널 스킨(인광 단색) + 게임 문법 상징. 24 뷰박스.
// ★ 스타일: 솔리드 실루엣(론 콥 Semiotic Standard 원전 문법) — 라인 아님.
//   방향/기계류(화살표·자석기·회전)만 굵은 스트로크(2.4px, round).
// ★ CSS mask 규약: 글리프는 mask라 알파만 의미 있다. 내부 "홈/선"은 dark-fill로 칠하면
//   불투명(=꽉 찬 덩어리)이 되어 안 보인다. 반드시 fill-rule="evenodd" 서브패스로 뚫는다(투명 홀).
// 산출: public/img/glyphs/<name>.svg + src/data/glyphs.gen.js (런타임 명단)
// 실행: node tools/icon-semiotic.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img', 'glyphs');

// 굵은 스트로크 그룹 프리셋 (방향/기계 아이콘 전용)
//   ⚠️ 굵기 변경은 반드시 sw(n)으로 — `${S} stroke-width="3"`처럼 덧붙이면 속성이 중복돼
//   XML 파싱 에러 → 요소가 통째로 사라진다(빈 글리프, 대조표로 검거).
const sw = (n = 2.4) => `fill="none" stroke="#000" stroke-width="${n}" stroke-linecap="round" stroke-linejoin="round"`;
const S = sw();

// 초승달 = 큰 원 − 어긋난 작은 원(evenodd). 호 하나로 그리면 현=지름 퇴화 아크가 되어 렌더가 뭉갠다.
//   원은 반원 2개(a…a…) 관용구로 그린다 — 단일 대호는 시작=끝 모호성으로 불안정.
const crescent = (cx, cy, r, ox, oy, or_) =>
  `<path fill-rule="evenodd" d="M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`
  + ` M${ox - or_},${oy} a${or_},${or_} 0 1,0 ${or_ * 2},0 a${or_},${or_} 0 1,0 ${-or_ * 2},0"/>`;

// 글리프 정의 — 솔리드 fill="#000" 기본. 홀은 evenodd. 스트로크 필요분만 <g ${S}>.
const G = {
  // ── 자원 (res) ── 게임 문법: 사물의 실루엣
  icon_res_canned: '<path fill-rule="evenodd" d="M6,4 H18 V20 H6 Z M8,7 H16 V9 H8 Z"/>', // 캔 + 뚜껑선(홀)
  icon_res_food: '<path d="M5.5,2.5 V8.5 A2.2,2.2 0 0,0 6.9,10.55 V21.5 H8.7 V10.55 A2.2,2.2 0 0,0 10.1,8.5 V2.5 H8.9 V8 H8.4 V2.5 H7.2 V8 H6.7 V2.5 Z"/><path d="M14.2,2.5 H17.6 L17,13 H15.4 V21.5 H14.2 Z"/>', // 포크+나이프(보편 급식 기호 — 그릇·김 일러 폐기, 직선 기하)
  icon_res_water: '<path d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z"/>', // 물방울
  icon_res_fuel: '<path d="M12,2 C15,6 17,8.5 17,12.5 A5,5 0 0,1 7,12.5 C7,10 8.5,9 9,7 C10,8.5 11,8 11,6 C11,4.5 11.5,3 12,2 Z"/>', // 불꽃
  icon_res_material: '<path d="M4,15 H20 V19.5 H4 Z"/><path d="M6,10 H18 V14 H6 Z"/><path d="M8,5 H16 V9 H8 Z"/>', // 적재 블록 3단
  icon_res_cloth: '<path fill-rule="evenodd" d="M4,6.5 H20 V17.5 H4 Z M4,11.5 H20 V12.7 H4 Z"/>', // 접힌 천 + 접선(홀)
  icon_res_parts: '<path fill-rule="evenodd" d="M10.3,2.3 H13.7 L14.2,4.6 L16.4,3.6 L18.9,6.1 L17.9,8.3 L20.2,8.8 V12.2 L17.9,12.7 L18.9,14.9 L16.4,17.4 L14.2,16.4 L13.7,18.7 H10.3 L9.8,16.4 L7.6,17.4 L5.1,14.9 L6.1,12.7 L3.8,12.2 V8.8 L6.1,8.3 L5.1,6.1 L7.6,3.6 L9.8,4.6 Z M12,8.5 A3,3 0 1,0 12,14.5 A3,3 0 1,0 12,8.5 Z"/>', // 톱니바퀴 + 중심 홀
  icon_res_battery: '<path fill-rule="evenodd" d="M7,6 H17 V21 H7 Z M10,3 H14 V6 H10 Z M12.6,8.5 L9.5,14 H11.6 L10.8,18.5 L14.6,12.5 H12 Z"/>', // 배터리 + 번개 홀
  icon_res_candle: '<path d="M9.5,10 H14.5 V21 H9.5 Z"/><path d="M12,3 C13.6,5.2 13.6,7.4 12,9 C10.4,7.4 10.4,5.2 12,3 Z"/>', // 초 + 불꽃
  icon_res_book: '<path fill-rule="evenodd" d="M6,4 H18 V20 H6 Z M9.2,4 H10.4 V20 H9.2 Z"/>', // 책 + 책등선(홀)
  icon_res_bandage: '<path d="M9.5,4 H14.5 V9.5 H20 V14.5 H14.5 V20 H9.5 V14.5 H4 V9.5 H9.5 Z"/>', // 의료 십자
  icon_res_antiseptic: '<path fill-rule="evenodd" d="M10,3 H14 V8 L19,17.5 A2,2 0 0,1 17.2,20.5 H6.8 A2,2 0 0,1 5,17.5 L10,8 Z M11.1,11 H12.9 V13 H15 V14.8 H12.9 V16.8 H11.1 V14.8 H9 V13 H11.1 Z"/>', // 플라스크+십자 홀(사물 묘사→의약 기호)
  icon_res_painkiller: '<g transform="rotate(45 12 12)"><path fill-rule="evenodd" d="M8,9 H16 A3,3 0 0,1 16,15 H8 A3,3 0 0,1 8,9 Z M11.5,9 H12.7 V15 H11.5 Z"/></g>', // 캡슐 + 분할선(홀)
  icon_res_salt: '<path fill-rule="evenodd" d="M8,8.5 H16 V20.5 H8 Z M9.5,3.5 H14.5 V8.5 H9.5 Z M11.2,11.5 h1.6 v1.6 h-1.6 Z M11.2,15.5 h1.6 v1.6 h-1.6 Z"/>', // 소금통 — 구멍 2로 환원·중심 대칭
  // ── 액션 (act) ── 게임 문법 필수
  // 탐험=돋보기 (디렉터 2026-07-22: "말이 탐험이지 수색에 가깝다" — 배낭 폐기).
  //   줌 버튼(스트로크 원)과의 구분: 솔리드 링(evenodd 홀) + 45° 굵은 손잡이 — 광학 무게가 다르다.
  icon_act_explore: '<path fill-rule="evenodd" d="M10,2.5 A7.5,7.5 0 1,0 10,17.5 A7.5,7.5 0 1,0 10,2.5 Z M10,6 A4,4 0 1,1 10,14 A4,4 0 1,1 10,6 Z"/><path d="M14.8,13 L21.5,19.7 L19.7,21.5 L13,14.8 Z"/>', // 돋보기: 렌즈 링+45° 손잡이
  icon_act_move: '<path fill-rule="evenodd" d="M12,3 L21,11 H18 V20 H6 V11 H3 Z M10,14 H14 V20 H10 Z"/>', // 집 + 문(홀)
  icon_act_craft: '<g transform="rotate(38 12 12)"><rect x="4.5" y="3" width="15" height="5" rx="1"/><rect x="10.5" y="8" width="3" height="13"/></g>', // 망치: 머리+자루
  icon_act_knowledge: '<path fill-rule="evenodd" d="M12,6 C9.5,4 5.5,4 3,5 V18 C5.5,17 9.5,17 12,19 C14.5,17 18.5,17 21,18 V5 C18.5,4 14.5,4 12,6 Z M11.3,6.4 H12.7 V18.6 H11.3 Z"/>', // 펼친 책 + 책등(홀)
  icon_act_clean: '<g transform="rotate(-28 12 12)"><rect x="10.6" y="2.5" width="2.6" height="11"/><path fill-rule="evenodd" d="M8,13.5 H16 L17.6,21 H6.4 Z M9.9,16.5 h0.9 v4 h-0.9 Z M12.4,16.5 h0.9 v4 h-0.9 Z"/></g>', // 빗자루: 자루+빗살(홀) — 구형 유지(디렉터 2026-07-22: 이전이 낫다)
  // 취침 = 침대(이 게임의 원 문법 🛌). 초승달+Z 안은 폐기 — 실캡처에서 화성 기호(♂)로 오독됐고,
  //   초승달은 time_night이 이미 쓰고 있어 의미도 충돌했다.
  icon_act_sleep: '<path d="M2,6.5 H4.6 V20.5 H2 Z"/><path d="M4.6,13.5 H19.5 A2.5,2.5 0 0,1 22,16 V20.5 H19.4 V16.8 H4.6 Z"/><rect x="6" y="9.8" width="5" height="3.7" rx="1.2"/>',

  icon_act_wardrobe: '<path fill-rule="evenodd" d="M9,3.5 L3.5,7 L5.5,10.5 L8,9 V20.5 H16 V9 L18.5,10.5 L20.5,7 L15,3.5 H13.8 A1.9,1.9 0 0,1 10.2,3.5 Z"/>', // 티셔츠 — 45° 직선 기하(유기 곡선 소거)·목선 홀
  icon_act_journal: '<path fill-rule="evenodd" d="M6,4 H18 V20 H6 Z M8.5,8 H15.5 V9.4 H8.5 Z M8.5,11.3 H15.5 V12.7 H8.5 Z M8.5,14.6 H13.5 V16 H8.5 Z"/>', // 노트 + 줄(홀)
  icon_act_help: '<g ' + S + '><path d="M8.5,8.5 A3.5,3.5 0 1,1 12,12 V14.2"/></g><circle cx="12" cy="18.3" r="1.5"/>', // 물음표
  // ── 시스템 (sys) ──
  icon_sys_settings: '<path fill-rule="evenodd" d="M10.3,2.3 H13.7 L14.2,4.6 L16.4,3.6 L18.9,6.1 L17.9,8.3 L20.2,8.8 V12.2 L17.9,12.7 L18.9,14.9 L16.4,17.4 L14.2,16.4 L13.7,18.7 H10.3 L9.8,16.4 L7.6,17.4 L5.1,14.9 L6.1,12.7 L3.8,12.2 V8.8 L6.1,8.3 L5.1,6.1 L7.6,3.6 L9.8,4.6 Z M12,8.5 A3,3 0 1,0 12,14.5 A3,3 0 1,0 12,8.5 Z"/>', // 톱니 + 중심 홀
  icon_sys_pause: '<rect x="7" y="5" width="3.5" height="14"/><rect x="13.5" y="5" width="3.5" height="14"/>',
  icon_sys_play: '<path d="M7,4.5 L20,12 L7,19.5 Z"/>',
  icon_sys_auto: '<g ' + S + '><path d="M19.5,12 A7.5,7.5 0 1,1 12,4.5"/></g><path d="M11.5,1 L11.5,8 L16,4.5 Z"/>', // 순환 화살표
  icon_sys_edit: '<path fill-rule="evenodd" d="M4,20 V15.5 L15,4.5 L19.5,9 L8.5,20 Z M14.2,7.3 L12.8,8.7 L15.3,11.2 L16.7,9.8 Z"/>', // 연필 + 촉 구분(홀)
  icon_sys_locked: '<g ' + S + '><path d="M9,10 V8 A3,3 0 1,1 15,8 V10"/></g><path fill-rule="evenodd" d="M6,10 H18 V20.5 H6 Z M12,13.5 A1.6,1.6 0 0,0 11,16.5 V18 H13 V16.5 A1.6,1.6 0 0,0 12,13.5 Z"/>', // 자물쇠 + 열쇠구멍(홀)
  icon_sys_pin: '<path fill-rule="evenodd" d="M12,2 A6,6 0 0,0 6,8 C6,13 12,21.5 12,21.5 C12,21.5 18,13 18,8 A6,6 0 0,0 12,2 Z M12,5.5 A2.5,2.5 0 1,0 12,10.5 A2.5,2.5 0 1,0 12,5.5 Z"/>', // 지도 핀 + 중심 홀
  icon_sys_check: '<g ' + sw(3) + '><path d="M4.5,13 L10,18.5 L19.5,6.5"/></g>', // 체크
  icon_sys_quest: '<path fill-rule="evenodd" d="M6,5 H18 V21 H6 Z M9,3 H15 V6.5 H9 Z M8.5,10 H15.5 V11.4 H8.5 Z M8.5,13.3 H15.5 V14.7 H8.5 Z M8.5,16.6 H13 V18 H8.5 Z"/>', // 클립보드 + 클립 + 줄(홀)
  icon_sys_zoomin: '<g ' + S + '><circle cx="10.5" cy="10.5" r="6"/><line x1="15" y1="15" x2="20.5" y2="20.5"/><line x1="10.5" y1="8" x2="10.5" y2="13"/><line x1="8" y1="10.5" x2="13" y2="10.5"/></g>',
  icon_sys_zoomout: '<g ' + S + '><circle cx="10.5" cy="10.5" r="6"/><line x1="15" y1="15" x2="20.5" y2="20.5"/><line x1="8" y1="10.5" x2="13" y2="10.5"/></g>',
  icon_sys_rotl: '<g ' + S + '><path d="M5.5,10 A7,7 0 1,0 8,4.5"/></g><path d="M3,3 V9.5 H9 Z"/>', // 좌회전
  icon_sys_rotr: '<g ' + S + '><path d="M18.5,10 A7,7 0 1,1 16,4.5"/></g><path d="M21,3 V9.5 H15 Z"/>', // 우회전
  icon_sys_camhome: '<path d="M12,4 L21,11.5 H17.5 V20 H6.5 V11.5 H3 Z"/>', // 홈(시점)
  icon_sys_uihide: '<path fill-rule="evenodd" d="M2.5,12 C6,7 18,7 21.5,12 C18,17 6,17 2.5,12 Z M12,9 A3,3 0 1,0 12,15 A3,3 0 1,0 12,9 Z"/><circle cx="12" cy="12" r="1.6"/>', // 눈 + 흰자(홀) + 동공
  icon_sys_collect: '<path d="M10.5,3 H13.5 V10.5 H17 L12,15.5 L7,10.5 H10.5 Z"/><path d="M4.5,16 H19.5 V20.5 H4.5 Z"/>', // 아래 화살표 + 받침
  icon_sys_arrowleft: '<path d="M11,4.5 L4,12 L11,19.5 V14 H20 V10 H11 Z"/>', // 좌 화살표
  icon_sys_save: '<path fill-rule="evenodd" d="M3,5 H21 V19 H3 Z M6,8 A2.4,2.4 0 1,0 6,12.8 A2.4,2.4 0 1,0 6,8 Z M18,8 A2.4,2.4 0 1,0 18,12.8 A2.4,2.4 0 1,0 18,8 Z M9.5,9 H14.5 V11 H9.5 Z M7,15.5 L8.5,19 H15.5 L17,15.5 Z" transform="translate(0 0)"/>', // 카세트 테이프(릴 2 홀) — 플로피 폐기, 카세트 퓨처리즘 정합
  icon_sys_import: '<path d="M11,3 H13 V11 L15.5,8.5 L17,10 L12,15 L7,10 L8.5,8.5 L11,11 Z"/><path d="M4,17 H20 V20.5 H4 Z"/>', // 아래로 + 트레이
  // ── 상태 (cond) ──
  icon_cond_buff: '<path d="M12,3 L20,12 H15.5 V21 H8.5 V12 H4 Z"/>', // 상승 화살표(솔리드)
  icon_cond_comfort: '<path d="M12,4 L20,11 H17 V20 H7 V11 H4 Z"/><path d="M14,4 H16.5 V7 L14,5 Z"/>', // 집 + 굴뚝
  icon_cond_warn: '<path fill-rule="evenodd" d="M12,3 L22,20 H2 Z M11,8.5 H13 V14 H11 Z M12,15.8 A1.2,1.2 0 1,0 12,18.2 A1.2,1.2 0 1,0 12,15.8 Z"/>', // 경고 삼각 + 느낌표(홀)
  // ── 게이지 (g) ── 자원과 동일 문법
  icon_g_hunger: '<path fill-rule="evenodd" d="M6,4 H18 V20 H6 Z M8,7 H16 V9 H8 Z"/>',
  icon_g_thirst: '<path d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z"/>',
  icon_g_energy: '<path d="M13,2 L6,13 H11 L9,22 L18,10 H13 Z"/>', // 번개
  icon_g_clean: '<g transform="rotate(-28 12 12)"><rect x="10.6" y="2.5" width="2.6" height="11"/><path d="M8,13.5 H16 L17.6,21 H6.4 Z"/></g>', // 빗자루(청결) — 구형 유지(act_clean과 동일 기하)
  // ── 날씨 (weather) ── 솔리드 구름 베이스
  icon_weather_clear: '<circle cx="12" cy="12" r="5"/><g ' + S + '><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.5" y1="5.5" x2="7.2" y2="7.2"/><line x1="16.8" y1="16.8" x2="18.5" y2="18.5"/><line x1="16.8" y1="7.2" x2="18.5" y2="5.5"/><line x1="5.5" y1="18.5" x2="7.2" y2="16.8"/></g>', // 해
  // 날씨 = 뭉게구름 원형 유지 (디렉터 2026-07-22: "캡슐은 symbolism 과축약 — 존재하는 아이콘에 기반").
  //   빗방울만 res_water 물방울의 미니어처로 통일 — 신형 발명이 아니라 기존 어휘 재사용.
  icon_weather_snow: '<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/><circle cx="8" cy="18" r="1.3"/><circle cx="12" cy="20.5" r="1.3"/><circle cx="16" cy="18" r="1.3"/>', // 구름 + 눈
  icon_weather_rain: '<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/>'
    + '<g transform="translate(5.9 15.7) scale(0.175)"><path d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z"/></g>'
    + '<g transform="translate(9.9 18.0) scale(0.175)"><path d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z"/></g>'
    + '<g transform="translate(13.9 15.7) scale(0.175)"><path d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z"/></g>', // 구름 + res_water 물방울 3
  icon_weather_storm: '<path d="M6.5,13 A4,4 0 0,1 7.5,5.3 A5.2,5.2 0 0,1 17.5,6.5 A3.6,3.6 0 0,1 17.3,13 Z"/><path d="M13,14 L8.5,20 H11 L9.5,23.5 L15.5,16 H12.5 L14,14 Z"/>', // 구름 + 번개
  icon_weather_ash: '<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/><circle cx="8" cy="18" r="1"/><circle cx="12" cy="20.5" r="1"/><circle cx="16" cy="18" r="1"/>', // 구름 + 재
  // ── 시간대 (time) ──
  icon_time_dawn: '<path d="M4,17 H20 V19 H4 Z"/><path d="M7,17 A5,5 0 0,1 17,17 Z"/><g ' + S + '><line x1="12" y1="8.5" x2="12" y2="5.5"/><path d="M9.5,7.5 L12,5 L14.5,7.5"/></g>', // 해 떠오름
  icon_time_day: '<circle cx="12" cy="12" r="5"/><g ' + S + '><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.5" y1="5.5" x2="7.2" y2="7.2"/><line x1="16.8" y1="16.8" x2="18.5" y2="18.5"/><line x1="16.8" y1="7.2" x2="18.5" y2="5.5"/><line x1="5.5" y1="18.5" x2="7.2" y2="16.8"/></g>',
  icon_time_dusk: '<path d="M4,17 H20 V19 H4 Z"/><path d="M7,17 A5,5 0 0,1 17,17 Z"/><g ' + S + '><line x1="12" y1="5" x2="12" y2="8"/><path d="M9.5,6 L12,8.5 L14.5,6"/></g>', // 해 짐
  icon_time_night: crescent(11.5, 12.5, 8.6, 16, 9, 7.2) + '<circle cx="19.5" cy="4.5" r="1.2"/>', // 초승달 + 별
  // ── 계절 (season) ──
  icon_season_spring: '<rect x="11" y="10" width="2" height="11"/><path d="M11.5,12 C4.5,12 4,4.5 4,4.5 C11.5,4.5 11.5,12 11.5,12 Z"/><path d="M12.5,15 C18.5,15 19,8.5 19,8.5 C12.5,8.5 12.5,15 12.5,15 Z"/>', // 새싹: 줄기+잎 2 — 유기 잎이 기존 어휘(디렉터 원칙: 존재 기반)
  icon_season_summer: '<circle cx="12" cy="12" r="5.5"/><g ' + S + '><line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/></g>',
  icon_season_autumn: '<path d="M12,3.5 C17,7 19,11 19,14.5 A7,7 0 0,1 5,14.5 C5,11 7,7 12,3.5 Z"/><rect x="11.2" y="12" width="1.6" height="9"/>', // 낙엽 — 유기 잎이 기존 어휘(디렉터 원칙: 존재 기반)
  icon_season_winter: '<g ' + S + '><line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" y1="7.5" x2="19.8" y2="16.5"/><line x1="19.8" y1="7.5" x2="4.2" y2="16.5"/><path d="M9.5,4.5 L12,7 L14.5,4.5"/><path d="M9.5,19.5 L12,17 L14.5,19.5"/><path d="M5,10.5 L5.3,7.2 L8.6,7"/><path d="M19,13.5 L18.7,16.8 L15.4,17"/></g>', // 눈송이
  // ── 부상 (inj) ──
  icon_inj_minor: '<g transform="rotate(45 12 12)"><path fill-rule="evenodd" d="M4,9 H20 V15 H4 Z M9,11 A1,1 0 1,0 9,13 A1,1 0 1,0 9,11 Z M12,11 A1,1 0 1,0 12,13 A1,1 0 1,0 12,11 Z M15,11 A1,1 0 1,0 15,13 A1,1 0 1,0 15,11 Z"/></g>', // 반창고
  icon_inj_deep: '<path fill-rule="evenodd" d="M12,2.5 C12,2.5 18.5,11 18.5,15.5 A6.5,6.5 0 0,1 5.5,15.5 C5.5,11 12,2.5 12,2.5 Z M11,10 H13 V17 H11 Z"/>', // 핏방울 + 세로 홀
  icon_inj_sprain: '<g ' + sw(3) + '><path d="M5,19 L10.5,13.5"/><path d="M13.5,10.5 L19,5"/></g><circle cx="12" cy="12" r="2.6"/>', // 접질림(관절)
  icon_inj_infection: '<path fill-rule="evenodd" d="M12,3 L14,8 L19,6 L16.5,11 L21,13 L16,14 L18,19 L13,16.5 L12,21.5 L11,16.5 L6,19 L8,14 L3,13 L7.5,11 L5,6 L10,8 Z M12,10 A2,2 0 1,0 12,14 A2,2 0 1,0 12,10 Z"/>', // 감염 발진 + 중심 홀
  icon_inj_critical: '<g ' + sw(2.6) + '><path d="M2.5,12 H7 L9,7 L12,17 L15,10 L16.5,12 H21.5"/></g>', // 심전도
  // ── 기록 (rec) ──
  icon_rec_memo: '<path fill-rule="evenodd" d="M6,4 H18 V15 L13,20 H6 Z M8,8 H16 V9.4 H8 Z M8,11 H14 V12.4 H8 Z"/><path d="M13,20 V15 H18 Z"/>', // 메모 + 접힘
  icon_rec_radio: '<path fill-rule="evenodd" d="M4,9 H20 V20 H4 Z M9,12.3 A2.2,2.2 0 1,0 9,16.7 A2.2,2.2 0 1,0 9,12.3 Z M13.8,13.8 H17.2 V15.2 H13.8 Z"/><path d="M6,9 L15,4 L15.8,5.5 L8.5,9 Z"/>', // 라디오 — 스피커 원+슬릿 1(다이얼 장식 소거)
  icon_rec_sketch: '<path fill-rule="evenodd" d="M4.5,4.5 H19.5 V19.5 H4.5 Z M7,16 L11,11 L13.5,14 L15.5,12 L17,15 V17 H7 Z M9.5,7.5 A1.5,1.5 0 1,0 9.5,10.5 A1.5,1.5 0 1,0 9.5,7.5 Z"/>', // 사진 프레임(산+해) — 구형 유지(디렉터: 이전이 좋다)
  // ── 지역 (region) — #216 리얼컬러 일러 도트 재제작 (디렉터 2026-07-22 승인).
  //    존재 어휘·보편 기호만: 집=act_move · 빌딩=district_city 도트 · 산=rec_sketch. 발명형 금지. ──
  icon_region_residential: '<path fill-rule="evenodd" d="M9,4.5 L16.5,11 H14.5 V19.5 H3.5 V11 H1.5 Z M7.5,14 H10.5 V19.5 H7.5 Z"/><path d="M16,9 L22.5,14.5 H21 V19.5 H15.5 V12.5 L13.5,12.5 Z"/>', // 집 2채(주거 군집) — 이주 집 어휘
  icon_region_commercial: '<path fill-rule="evenodd" d="M4,7 H11 V21 H4 Z M6,9.5 H9 V11 H6 Z M6,13 H9 V14.5 H6 Z M6,16.5 H9 V18 H6 Z"/><path fill-rule="evenodd" d="M13,3 H20 V21 H13 Z M15,5.5 H18 V7 H15 Z M15,9 H18 V10.5 H15 Z M15,12.5 H18 V14 H15 Z M15,16 H18 V17.5 H15 Z"/>', // 고층 2동+창 홀(도심)
  icon_region_industrial: '<path fill-rule="evenodd" d="M3,21 V10.5 L8.5,13.5 V10.5 L14,13.5 V10.5 L21,14 V21 Z M6,16.5 h2.4 v2.4 H6 Z M11,16.5 h2.4 v2.4 H11 Z"/><rect x="16.5" y="3.5" width="3" height="8"/>', // 톱니지붕 공장+굴뚝
  icon_region_slums: '<path fill-rule="evenodd" d="M3.5,20.5 V10 L13,5.5 L20.5,10.5 V20.5 Z M7,13.5 H10 V20.5 H7 Z M13.5,13 H17 V16 H13.5 Z"/><rect x="2" y="9.2" width="20" height="1.8" transform="rotate(-6 12 10)"/>', // 판잣집(기운 지붕) — REGION_ICON 매핑명(slums) 그대로
  icon_region_slumdeep: '<path fill-rule="evenodd" d="M3.5,20.5 V10 L13,5.5 L20.5,10.5 V20.5 Z M6.5,12.5 H17.5 V20.5 H6.5 Z"/><rect x="2" y="9.2" width="20" height="1.8" transform="rotate(-6 12 10)"/><path d="M9.5,14 H14.5 L12,17.5 Z"/>', // 판자촌 안쪽 — 같은 판잣집+큰 어둠 홀+하강 삼각 (#167 심부, 기존 공란 보완)
  icon_region_citycore: '<path fill-rule="evenodd" d="M9,21 V5 H15 V21 Z M10.8,7 h2.4 v1.6 h-2.4 Z M10.8,10.2 h2.4 v1.6 h-2.4 Z M10.8,13.4 h2.4 v1.6 h-2.4 Z M10.8,16.6 h2.4 v1.6 h-2.4 Z"/><rect x="11.4" y="1.5" width="1.2" height="3.5"/><path fill-rule="evenodd" d="M3.5,21 V11 H8 V21 Z M5,13 h1.5 v1.4 H5 Z M5,16 h1.5 v1.4 H5 Z"/><path fill-rule="evenodd" d="M16,21 V11 H20.5 V21 Z M17.5,13 h1.5 v1.4 h-1.5 Z M17.5,16 h1.5 v1.4 h-1.5 Z"/>', // 수도의 심장 — 중앙 타워+안테나+저층 2 (2.0, 기존 공란 보완)
  icon_region_checkpoint: '<rect x="3.5" y="3.5" width="3.4" height="18"/><path fill-rule="evenodd" d="M6.9,8.5 H21.5 V13 H6.9 Z M9.5,8.5 L13,13 H10.6 L7.1,8.5 Z M14.5,8.5 L18,13 H15.6 L12.1,8.5 Z"/><rect x="2" y="19.5" width="6.4" height="2"/>', // 검문소 차단기 — 지주+수평 바+사선 스트라이프 홀 2(1차 깃발 오독 재작업)
  icon_region_harborYard: '<rect x="3" y="19" width="18" height="2.5"/><rect x="5.5" y="4" width="2.6" height="15"/><path d="M5.5,4 H17.5 V6.6 H8.1 Z"/><rect x="15.8" y="6.6" width="1.4" height="4"/><path d="M14.8,10.6 H18.2 V13.4 H14.8 Z"/><path fill-rule="evenodd" d="M9.5,14 H14.5 V19 H9.5 Z"/>', // 크레인+컨테이너(야적장)
  icon_region_fishMarket: '<path fill-rule="evenodd" d="M3.5,12 C6,7.5 10.5,6 14.5,8.5 C16,6.5 18.5,5.5 20.5,5.5 C20,7.5 19,9.5 17.5,10.8 C19,12.1 20,14 20.5,16 C18.5,16 16,15 14.5,13 C10.5,15.5 6,14.5 3.5,12 Z M7.5,9.7 A1.1,1.1 0 1,0 7.5,11.9 A1.1,1.1 0 1,0 7.5,9.7 Z"/>', // 물고기(수산시장) — 눈은 evenodd 홀(mask 규약)
  icon_region_lab: '<circle cx="12" cy="12" r="2.2"/><path d="M12,3 A9,9 0 0,1 19.8,7.5 L15.2,10.2 A3.7,3.7 0 0,0 12,8.3 Z"/><path d="M19.8,16.5 A9,9 0 0,1 12,21 V15.7 A3.7,3.7 0 0,0 15.2,13.8 Z"/><path d="M4.2,16.5 A9,9 0 0,1 4.2,7.5 L8.8,10.2 A3.7,3.7 0 0,0 8.8,13.8 Z"/>', // 방사능 삼엽(금지구역 연구동 — 콥 원전 기호)
  icon_region_resort: '<path fill-rule="evenodd" d="M2,20 L9,7 L13.2,14.5 L16,10 L22,20 Z M9,9.4 L10.6,12.4 L9.4,13.6 L7.6,10.9 Z"/>', // 산 2봉(고원) — 설선은 evenodd 홀(mask 규약)
  // ── 전리품 (loot) ──
  icon_loot_blueprint: '<path fill-rule="evenodd" d="M4,5 H20 V19 H4 Z M8.5,16 L12,11 L15.5,16 Z M6.5,8 H11 V9.4 H6.5 Z"/>', // 도면
  icon_loot_paint: '<path d="M6.5,10 H17.5 L16.5,20.5 A1,1 0 0,1 15.5,21.5 H8.5 A1,1 0 0,1 7.5,20.5 Z"/><path fill-rule="evenodd" d="M6,8.5 A6,6 0 0,1 18,8.5 V10 H16 V8.5 A4,4 0 0,0 8,8.5 V10 H6 Z"/>', // 페인트 통 + 손잡이
};

mkdirSync(OUT, { recursive: true });
const names = Object.keys(G).sort();
for (const name of names) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000" stroke="none">${G[name]}</svg>\n`;
  writeFileSync(join(OUT, `${name}.svg`), svg);
}

const gen = `// 자동 생성 파일 — tools/icon-semiotic.mjs가 만든다. 손으로 고치지 말 것.\nexport const GLYPH_NAMES = ${JSON.stringify(names, null, 0)};\n`;
writeFileSync(join(ROOT, 'src', 'data', 'glyphs.gen.js'), gen);
console.log(`glyphs: ${names.length} svg → public/img/glyphs + src/data/glyphs.gen.js`);
