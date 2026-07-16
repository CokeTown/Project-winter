// icon-mono-gen.mjs — pixelarticons(MIT) + 자작 24그리드 패스 → 단색 잉크 렌더 시트 HTML 생성
// 디렉터 오더: 플랫 아이콘·칙칙한 색 통일·바로 보이는 UI만·도움=?·탐험=지도·해 모양 금지
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets-src', 'art', 'pixelarticons');
const OUT = process.argv[2] || '.'; // 렌더 시트 출력 폴더 (캡처 하네스가 icon-mono.html을 읽는다)
const INK = '#e6efe4'; // 흰색(그린 캐스트) — 에일리언 그린 터미널의 흰 글씨와 동일 잉크

const pathOf = (name) => {
  const svg = fs.readFileSync(`${SRC}/${name}.svg`, 'utf8');
  return [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map(m => m[1]).join(' ');
};
const cloud = pathOf('cloud');

// 자작 패스 — pixelarticons 규칙 준수(24그리드·2px 스텝·rect 조합)
const CUSTOM = {
  question: 'M7 4h10v2H7V4zM5 6h2v2H5V6zM15 6h2v6h-2V6zM11 12h4v2h-4v-2zM11 14h2v2h-2v-2zM11 18h2v2h-2v-2z',
  broom: 'M11 2h2v10h-2V2zM9 12h6v2H9v-2zM8 14h8v2H8v-2zM7 16h3v2H7v-2zM11 16h2v2h-2v-2zM14 16h3v2h-3v-2zM6 18h3v2H6v-2zM10 18h4v2h-4v-2zM15 18h3v2h-3v-2zM6 20h2v2H6v-2zM10 20h2v2h-2v-2zM14 20h2v2h-2v-2zM16 20h2v2h-2v-2z',
  bowl: 'M8 3h2v2H8V3zM8 7h2v2H8V7zM14 5h2v2h-2V5zM14 9h2v2h-2V9zM4 12h16v2H4v-2zM5 14h14v2H5v-2zM6 16h12v2H6v-2zM8 18h8v2H8v-2z',
  'weather-snow': cloud + ' M5 20h2v2H5v-2zM11 20h2v2h-2v-2zM17 20h2v2h-2v-2z',
  'weather-rain': cloud + ' M5 19h2v4H5v-4zM11 19h2v4h-2v-4zM17 19h2v4h-2v-4z',
  'weather-storm': cloud + ' M12 19h2v2h-2v-2zM10 21h2v2h-2v-2z',
  'weather-ash': cloud + ' M5 19h2v2H5v-2zM10 21h2v2h-2v-2zM14 19h2v2h-2v-2zM18 21h2v2h-2v-2z',
  // ── P2 자작: 자원 (24그리드·2px 스텝) ──
  apple: 'M11 2h2v3h-2V2zM14 3h3v2h-3V3zM7 6h10v2H7V6zM6 8h12v8H6V8zM7 16h10v2H7v-2zM9 18h6v2H9v-2z',
  can: 'M7 3h10v2H7V3zM6 5h12v4H6V5zM6 9h2v4H6V9zM16 9h2v4h-2V9zM6 13h12v6H6v-6z',
  bottle: 'M9 2h6v2H9V2zM10 4h4v2h-4V4zM8 6h8v12H8V6zM9 18h6v2H9v-2z',
  spool: 'M6 4h12v4H6V4zM8 8h8v8H8V8zM6 16h12v4H6v-4z',
  'bandage-roll': 'M6 6h12v3H6V6zM6 15h12v3H6v-3zM6 9h3v6H6V9zM15 9h3v6h-3V9zM18 11h4v2h-4v-2z',
  flask: 'M10 2h4v6h-4V2zM8 8h8v2H8V8zM7 10h10v2H7v-2zM6 12h12v8H6v-8z',
  pills: 'M4 10h4v4H4v-4zM9 10h4v4H9v-4zM15 9h5v5h-5V9z',
  candle: 'M11 3h2v2h-2V3zM10 5h4v3h-4V5zM11 8h2v2h-2V8zM9 10h6v10H9V10z',
  jerrycan: 'M8 4h8v2H8V4zM8 6h2v2H8V6zM14 6h2v2h-2V6zM6 8h12v12H6V8z',
  gear: 'M10 2h4v3h-4V2zM10 19h4v3h-4v-3zM2 10h3v4H2v-4zM19 10h3v4h-3v-4zM4 4h3v3H4V4zM17 4h3v3h-3V4zM4 17h3v3H4v-3zM17 17h3v3h-3v-3zM7 7h10v3H7V7zM7 14h10v3H7v-3zM7 10h3v4H7v-4zM14 10h3v4h-3v-4z',
  bricks: 'M4 8h7v4H4V8zM12 8h8v4h-8V8zM4 13h8v4H4v-4zM13 13h7v4h-7v-4z',
  sack: 'M10 4h4v4h-4V4zM8 5h2v3H8V5zM14 5h2v3h-2V5zM7 8h10v12H7V8z',
  'book-closed': 'M6 3h10v18H6V3zM16 5h2v16h-2V5z',
  // ── P2 자작: 계절 ──
  sprout: 'M11 10h2v10h-2v-10zM6 9h5v2H6V9zM5 7h4v2H5V7zM13 8h2v3h-2V8zM13 6h5v2h-5V6zM15 4h4v2h-4V4zM6 20h12v2H6v-2z',
  leaf: 'M11 4h2v2h-2V4zM9 6h6v2H9V6zM8 8h8v2H8V8zM7 10h10v2H7v-2zM8 12h8v2H8v-2zM9 14h6v2H9v-2zM11 16h2v6h-2v-6z',
  'leaf-fall': 'M5 4h4v3H5V4zM9 5h2v2H9V5zM13 8h4v3h-4V8zM11 9h2v2h-2V9zM8 14h4v3H8v-3zM6 15h2v2H6v-2zM4 20h16v2H4v-2z',
  snowflake: 'M11 3h2v18h-2V3zM3 11h18v2H3v-2zM5 5h2v2H5V5zM7 7h2v2H7V7zM15 7h2v2h-2V7zM17 5h2v2h-2V5zM5 17h2v2H5v-2zM7 15h2v2H7v-2zM15 15h2v2h-2v-2zM17 17h2v2h-2v-2z',
  // ── P2 자작: 부상 ──
  plaster: 'M4 9h5v6H4V9zM15 9h5v6h-5V9zM9 10h6v4H9v-4z',
  scar: 'M11 4h2v16h-2V4zM7 7h10v2H7V7zM7 11h10v2H7v-2zM7 15h10v2H7v-2z',
  splint: 'M8 4h3v16H8V4zM13 4h3v16h-3V4zM6 8h12v2H6V8zM6 14h12v2H6v-2z',
  thermo: 'M10 3h4v13h-4V3zM9 16h6v5H9v-5z',
  'med-cross': 'M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z',
};

// 렌더 대상: [소스, 타깃 아이콘 id]
export const MAP = [
  ['map', 'icon_act_explore'],        // 오더: 탐험=지도
  ['question', 'icon_act_help'],      // 오더: 도움=?
  ['home', 'icon_act_move'],
  ['tool-case', 'icon_act_craft'],
  ['bed', 'icon_act_sleep'],
  ['broom', 'icon_act_clean'],
  ['book-open', 'icon_act_knowledge'],
  ['shirt', 'icon_act_wardrobe'],
  ['bowl', 'icon_g_hunger'],
  ['drop', 'icon_g_thirst'],
  ['zap', 'icon_g_energy'],
  ['alert', 'icon_cond_warn'],
  ['moon', 'icon_time_night'],
  ['weather-snow', 'icon_weather_snow'],
  ['weather-rain', 'icon_weather_rain'],
  ['weather-storm', 'icon_weather_storm'],
  ['weather-ash', 'icon_weather_ash'],
  // P2: 자원 14
  ['apple', 'icon_res_food'],
  ['can', 'icon_res_canned'],
  ['bottle', 'icon_res_water'],
  ['spool', 'icon_res_cloth'],
  ['bandage-roll', 'icon_res_bandage'],
  ['flask', 'icon_res_antiseptic'],
  ['pills', 'icon_res_painkiller'],
  ['candle', 'icon_res_candle'],
  ['battery-full', 'icon_res_battery'],
  ['jerrycan', 'icon_res_fuel'],
  ['gear', 'icon_res_parts'],
  ['bricks', 'icon_res_material'],
  ['sack', 'icon_res_salt'],
  ['book-closed', 'icon_res_book'],
  // P2: 계절 4
  ['sprout', 'icon_season_spring'],
  ['leaf', 'icon_season_summer'],
  ['leaf-fall', 'icon_season_autumn'],
  ['snowflake', 'icon_season_winter'],
  // P2: 툴바 시스템 6 (설정=기어 자작 재사용)
  ['pause', 'icon_sys_pause'],
  ['android', 'icon_sys_auto'],
  ['edit', 'icon_sys_edit'],
  ['gear', 'icon_sys_settings'],
  ['pin', 'icon_sys_pin'],
  ['eye', 'icon_sys_uihide'],
  // P2: 부상 5
  ['plaster', 'icon_inj_minor'],
  ['scar', 'icon_inj_deep'],
  ['splint', 'icon_inj_sprain'],
  ['thermo', 'icon_inj_infection'],
  ['med-cross', 'icon_inj_critical'],
];

const cells = MAP.map(([src, id], i) => {
  const d = CUSTOM[src] || pathOf(src);
  const col = i % 6, row = Math.floor(i / 6);
  return `<div class="cell" style="left:${col * 200 + 4}px;top:${row * 200 + 4}px" data-id="${id}">
    <svg width="192" height="192" viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="${d}" fill="${INK}"/></svg>
    <span>${id.replace('icon_', '')} ← ${src}</span></div>`;
}).join('\n');

const PAGE_H = Math.ceil(MAP.length / 6) * 200 + 40;
fs.writeFileSync(`${OUT}/icon-mono.html`, `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#14181c; width:1220px; height:${PAGE_H}px; position:relative; font:10px sans-serif; }
  .cell { position:absolute; width:192px; height:192px; }
  .cell span { position:absolute; left:0; bottom:-14px; color:#78909c; white-space:nowrap; }
</style><body>${cells}</body>`);
console.log('cells', MAP.length);
