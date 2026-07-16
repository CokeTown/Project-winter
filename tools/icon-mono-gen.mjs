// icon-mono-gen.mjs — pixelarticons(MIT) + 자작 24그리드 패스 → 단색 잉크 렌더 시트 HTML 생성
// 디렉터 오더: 플랫 아이콘·칙칙한 색 통일·바로 보이는 UI만·도움=?·탐험=지도·해 모양 금지
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets-src', 'art', 'pixelarticons');
const OUT = process.argv[2] || '.'; // 렌더 시트 출력 폴더 (캡처 하네스가 icon-mono.html을 읽는다)
const INK = '#b8b2a4'; // 칙칙한 웜 그레이 단색 — 전 아이콘 공통

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
];

const cells = MAP.map(([src, id], i) => {
  const d = CUSTOM[src] || pathOf(src);
  const col = i % 6, row = Math.floor(i / 6);
  return `<div class="cell" style="left:${col * 200 + 4}px;top:${row * 200 + 4}px" data-id="${id}">
    <svg width="192" height="192" viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="${d}" fill="${INK}"/></svg>
    <span>${id.replace('icon_', '')} ← ${src}</span></div>`;
}).join('\n');

fs.writeFileSync(`${OUT}/icon-mono.html`, `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#14181c; width:1220px; height:640px; position:relative; font:10px sans-serif; }
  .cell { position:absolute; width:192px; height:192px; }
  .cell span { position:absolute; left:0; bottom:-14px; color:#78909c; white-space:nowrap; }
</style><body>${cells}</body>`);
console.log('cells', MAP.length);
