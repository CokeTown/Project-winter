// icon-semiotic.mjs — 세미오틱 글리프 생성기 (UI-PIXEL-UNITY §5)
// MU/TH/UR 터미널 아이콘 언어: 24 뷰박스 · 2px 스트로크 · 기하 도형만 · 단색.
// 색은 SVG가 아니라 CSS(mask + currentColor)가 결정한다 — 여기선 알파만 의미 있음.
// 산출: public/img/glyphs/<name>.svg + src/data/glyphs.gen.js (런타임 글리프 명단)
// 실행: node tools/icon-semiotic.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img', 'glyphs');

// 채움 프리미티브 축약 (마스크라 색값 무의미 — #000 고정)
const F = 'fill="#000" stroke="none"';

// 글리프 정의 — 원·삼각·사각·직선·호의 조합만 사용 (Semiotic Standard 문법)
const G = {
  // ── 자원 (res) ──
  icon_res_canned: '<rect x="6" y="5" width="12" height="15"/><line x1="6" y1="9" x2="18" y2="9"/>',
  icon_res_food: '<path d="M4,13 H20 L17,20 H7 Z"/><line x1="9" y1="9" x2="9" y2="5"/><line x1="14" y1="9" x2="14" y2="5"/>',
  icon_res_water: '<path d="M12,3 L17,13 A5.6,5.6 0 1,1 7,13 Z"/>',
  icon_res_fuel: '<rect x="5" y="8" width="14" height="13"/><rect x="8" y="4" width="5" height="4"/><line x1="8" y1="18" x2="16" y2="11"/>',
  icon_res_material: '<rect x="4" y="15" width="16" height="5"/><rect x="6" y="10" width="12" height="5"/><rect x="8" y="5" width="8" height="5"/>',
  icon_res_cloth: '<rect x="4" y="7" width="16" height="10"/><line x1="4" y1="12" x2="20" y2="12"/>',
  icon_res_parts: '<path d="M12,3 L19.5,7.5 V16.5 L12,21 L4.5,16.5 V7.5 Z"/><circle cx="12" cy="12" r="3"/>',
  icon_res_battery: '<rect x="7" y="6" width="10" height="15"/><rect x="10" y="3" width="4" height="3"/><path d="M13,9 L10,13 H14 L11,17"/>',
  icon_res_candle: `<rect x="9" y="11" width="6" height="10"/><line x1="12" y1="9" x2="12" y2="11"/><path d="M12,3 C13.6,5 13.6,7 12,8.6 C10.4,7 10.4,5 12,3 Z" ${F}/>`,
  icon_res_book: '<rect x="6" y="4" width="12" height="16"/><line x1="9.5" y1="4" x2="9.5" y2="20"/>',
  icon_res_bandage: '<circle cx="11" cy="12" r="7"/><circle cx="11" cy="12" r="2.5"/><line x1="18" y1="12" x2="22" y2="12"/>',
  icon_res_antiseptic: '<rect x="8" y="9" width="8" height="12"/><rect x="10" y="4" width="4" height="3"/><line x1="10" y1="15" x2="14" y2="15"/>',
  icon_res_painkiller: '<circle cx="12" cy="12" r="7"/><line x1="5" y1="12" x2="19" y2="12"/>',
  icon_res_salt: '<path d="M12,3 L19,12 L12,21 L5,12 Z"/><line x1="12" y1="7" x2="12" y2="17"/>',
  // ── 액션 (act) ──
  icon_act_explore: `<circle cx="12" cy="12" r="8.5"/><path d="M8.5,15.5 L10.5,10.5 L15.5,8.5 L13.5,13.5 Z" ${F}/>`,
  icon_act_move: '<path d="M4,11 L11,4 L18,11"/><path d="M6,10 V19 H16 V10"/><line x1="12" y1="15" x2="21" y2="15"/><path d="M18.5,12.5 L21.5,15 L18.5,17.5"/>',
  icon_act_craft: '<rect x="4" y="5" width="16" height="5"/><line x1="12" y1="10" x2="12" y2="21"/>',
  icon_act_knowledge: '<path d="M12,6.5 C10,4.5 6.5,4.5 4,5.5 V18.5 C6.5,17.5 10,17.5 12,19 C14,17.5 17.5,17.5 20,18.5 V5.5 C17.5,4.5 14,4.5 12,6.5 Z"/><line x1="12" y1="6.5" x2="12" y2="19"/>',
  icon_act_clean: '<line x1="19" y1="3.5" x2="11.5" y2="11"/><path d="M11.5,11 L15,14.5 L9.5,20.5 L4.5,15.5 Z"/><line x1="7.5" y1="18" x2="10" y2="15.5"/>',
  icon_act_sleep: `<path d="M15,3.5 A8.8,8.8 0 1,0 15,20.5 A6.2,6.2 0 1,1 15,3.5 Z" ${F}/>`,
  icon_act_wardrobe: '<path d="M8,4 L4.5,7.5 L7,10.5 L9,9 V20 H15 V9 L17,10.5 L19.5,7.5 L16,4 C14.8,5.8 13.4,6.5 12,6.5 C10.6,6.5 9.2,5.8 8,4 Z"/>',
  icon_act_journal: '<rect x="6" y="4" width="12" height="16"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>',
  icon_act_help: `<path d="M8.5,8.5 A3.5,3.5 0 1,1 12,12 V14.5"/><circle cx="12" cy="18.5" r="1.4" ${F}/>`,
  // ── 시스템 (sys) ──
  icon_sys_settings: '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21.5" y2="12"/><line x1="5.3" y1="5.3" x2="7.4" y2="7.4"/><line x1="16.6" y1="16.6" x2="18.7" y2="18.7"/><line x1="16.6" y1="7.4" x2="18.7" y2="5.3"/><line x1="5.3" y1="18.7" x2="7.4" y2="16.6"/>',
  icon_sys_pause: `<rect x="7.5" y="5.5" width="3" height="13" ${F}/><rect x="13.5" y="5.5" width="3" height="13" ${F}/>`,
  icon_sys_play: `<path d="M8,5 L19,12 L8,19 Z" ${F}/>`,
  icon_sys_auto: `<path d="M19.5,12 A7.5,7.5 0 1,1 12,4.5"/><path d="M12,1.5 L12,7.5 L16,4.5 Z" ${F}/>`,
  icon_sys_edit: '<path d="M4,20 V15.5 L15,4.5 L19.5,9 L8.5,20 Z"/><line x1="13" y1="6.5" x2="17.5" y2="11"/>',
  icon_sys_locked: `<rect x="6" y="11" width="12" height="9"/><path d="M9,11 V8 A3,3 0 1,1 15,8 V11"/><circle cx="12" cy="15.5" r="1.4" ${F}/>`,
  icon_sys_pin: '<circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/>',
  icon_sys_check: '<path d="M4.5,13 L10,18.5 L19.5,6.5"/>',
  icon_sys_quest: '<rect x="6" y="5" width="12" height="16"/><rect x="9" y="3" width="6" height="4"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/>',
  icon_sys_zoomin: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/><line x1="10.5" y1="7.5" x2="10.5" y2="13.5"/><line x1="7.5" y1="10.5" x2="13.5" y2="10.5"/>',
  icon_sys_zoomout: '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/><line x1="7.5" y1="10.5" x2="13.5" y2="10.5"/>',
  icon_sys_rotl: '<path d="M5,4.5 V10 H10.5"/><path d="M5.2,10 A7.8,7.8 0 1,0 12,4.2"/>',
  icon_sys_rotr: '<path d="M19,4.5 V10 H13.5"/><path d="M18.8,10 A7.8,7.8 0 1,1 12,4.2"/>',
  icon_sys_camhome: '<path d="M4.5,11.5 L12,4.5 L19.5,11.5"/><path d="M7,9.5 V19.5 H17 V9.5"/>',
  icon_sys_uihide: '<path d="M2.5,12 C6.5,6 17.5,6 21.5,12 C17.5,18 6.5,18 2.5,12 Z"/><circle cx="12" cy="12" r="2.6"/>',
  icon_sys_collect: '<line x1="12" y1="3.5" x2="12" y2="13"/><path d="M8,9.5 L12,13.5 L16,9.5"/><path d="M4.5,15.5 V20.5 H19.5 V15.5"/>',
  icon_sys_arrowleft: '<line x1="20" y1="12" x2="5" y2="12"/><path d="M11,5.5 L4.5,12 L11,18.5"/>',
  icon_sys_save: '<path d="M4,4 H16 L20,8 V20 H4 Z"/><rect x="8" y="4" width="7" height="5"/><rect x="7" y="13" width="10" height="7"/>',
  icon_sys_import: '<path d="M3,6 H9 L11,8.5 H21 V19 H3 Z"/><line x1="12" y1="10.5" x2="12" y2="16"/><path d="M9.5,13.5 L12,16 L14.5,13.5"/>',
  // ── 상태 (cond) ──
  icon_cond_buff: '<line x1="12" y1="20.5" x2="12" y2="5"/><path d="M6,10.5 L12,4.5 L18,10.5"/>',
  icon_cond_comfort: '<path d="M6,10 H18 V20 H6 Z"/><path d="M18,12 H21 V16 H18"/><line x1="9.5" y1="7" x2="9.5" y2="4"/><line x1="14.5" y1="7" x2="14.5" y2="4"/>',
  icon_cond_warn: `<path d="M12,3.5 L21.5,19.5 H2.5 Z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="16.8" r="1.3" ${F}/>`,
  // ── 게이지 (g) ──
  icon_g_hunger: '<rect x="6" y="5" width="12" height="15"/><line x1="6" y1="9" x2="18" y2="9"/>',
  icon_g_thirst: '<path d="M12,3 L17,13 A5.6,5.6 0 1,1 7,13 Z"/>',
  icon_g_energy: '<path d="M13,2.5 L7,13 H11.5 L9.5,21.5 L17,10.5 H12.5 Z"/>',
  icon_g_clean: '<path d="M12,3.5 L13.8,10.2 L20.5,12 L13.8,13.8 L12,20.5 L10.2,13.8 L3.5,12 L10.2,10.2 Z"/>',
  // ── 날씨 (weather) — 구름 베이스 + 하단 변주 ──
  icon_weather_clear: '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="3" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21"/><line x1="3" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21" y2="12"/><line x1="5.6" y1="5.6" x2="7.4" y2="7.4"/><line x1="16.6" y1="16.6" x2="18.4" y2="18.4"/><line x1="16.6" y1="7.4" x2="18.4" y2="5.6"/><line x1="5.6" y1="18.4" x2="7.4" y2="16.6"/>',
  icon_weather_snow: `<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/><circle cx="8" cy="18" r="1.2" ${F}/><circle cx="12" cy="20.5" r="1.2" ${F}/><circle cx="16" cy="18" r="1.2" ${F}/>`,
  icon_weather_rain: '<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/><line x1="8.5" y1="17" x2="7" y2="21"/><line x1="12.5" y1="17" x2="11" y2="21"/><line x1="16.5" y1="17" x2="15" y2="21"/>',
  icon_weather_storm: '<path d="M6.5,13 A4,4 0 0,1 7.5,5.3 A5.2,5.2 0 0,1 17.5,6.5 A3.6,3.6 0 0,1 17.3,13 Z"/><path d="M13,15 L9.5,19.5 H12.5 L11,23"/>',
  icon_weather_ash: '<path d="M6.5,14 A4,4 0 0,1 7.5,6.3 A5.2,5.2 0 0,1 17.5,7.5 A3.6,3.6 0 0,1 17.3,14 Z"/><line x1="7" y1="18" x2="10" y2="18"/><line x1="11" y1="21" x2="14" y2="21"/><line x1="15" y1="18" x2="18" y2="18"/>',
  // ── 시간대 (time) ──
  icon_time_dawn: '<line x1="3" y1="16.5" x2="21" y2="16.5"/><path d="M7.5,16.5 A4.5,4.5 0 0,1 16.5,16.5"/><line x1="12" y1="9" x2="12" y2="4.5"/><path d="M9.5,7 L12,4.5 L14.5,7"/>',
  icon_time_day: '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="3" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="21"/><line x1="3" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="21" y2="12"/><line x1="5.6" y1="5.6" x2="7.4" y2="7.4"/><line x1="16.6" y1="16.6" x2="18.4" y2="18.4"/><line x1="16.6" y1="7.4" x2="18.4" y2="5.6"/><line x1="5.6" y1="18.4" x2="7.4" y2="16.6"/>',
  icon_time_dusk: '<line x1="3" y1="16.5" x2="21" y2="16.5"/><path d="M7.5,16.5 A4.5,4.5 0 0,1 16.5,16.5"/><line x1="12" y1="4.5" x2="12" y2="9"/><path d="M9.5,6.5 L12,9 L14.5,6.5"/>',
  icon_time_night: `<path d="M13,4 A8,8 0 1,0 13,20 A6.4,6.4 0 1,1 13,4 Z"/><circle cx="18.5" cy="6" r="1.2" ${F}/>`,
  // ── 계절 (season) ──
  icon_season_spring: `<line x1="12" y1="21" x2="12" y2="11"/><path d="M12,11 C6,11 5.5,5 5.5,5 C11.5,5 12,11 12,11 Z"/><path d="M12,14 C16.5,14 17,9.5 17,9.5 C12.5,9.5 12,14 12,14 Z"/>`,
  icon_season_summer: '<circle cx="12" cy="12" r="5.5"/><line x1="12" y1="2.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21.5" y2="12"/>',
  icon_season_autumn: '<path d="M12,3.5 C17,7 19,11 19,14.5 A7,7 0 0,1 5,14.5 C5,11 7,7 12,3.5 Z"/><line x1="12" y1="21" x2="12" y2="10"/>',
  icon_season_winter: '<line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" y1="7.5" x2="19.8" y2="16.5"/><line x1="19.8" y1="7.5" x2="4.2" y2="16.5"/><path d="M9.5,4.5 L12,7 L14.5,4.5"/><path d="M9.5,19.5 L12,17 L14.5,19.5"/>',
  // ── 부상 (inj) ──
  icon_inj_minor: `<rect x="3.5" y="9" width="17" height="6"/><circle cx="10.5" cy="12" r="0.9" ${F}/><circle cx="13.5" cy="12" r="0.9" ${F}/>`,
  icon_inj_deep: `<path d="M4,13 L8.5,8.5 L11,14 L14,8 L16.5,13.5 L20,9.5"/><circle cx="12" cy="19" r="1.3" ${F}/>`,
  icon_inj_sprain: '<line x1="4.5" y1="19.5" x2="10.5" y2="12.5"/><line x1="13.5" y1="10.5" x2="19.5" y2="4.5"/><circle cx="12" cy="11.5" r="2.2"/>',
  icon_inj_infection: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="4" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="20"/><line x1="4" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="20" y2="12"/><line x1="6.3" y1="6.3" x2="8.5" y2="8.5"/><line x1="15.5" y1="15.5" x2="17.7" y2="17.7"/><line x1="15.5" y1="8.5" x2="17.7" y2="6.3"/><line x1="6.3" y1="17.7" x2="8.5" y2="15.5"/>',
  icon_inj_critical: '<polyline points="2.5,12 8,12 10,6.5 13.5,17.5 15.5,12 21.5,12" fill="none"/>',
  // ── 기록 (rec) ──
  icon_rec_memo: '<rect x="6" y="4" width="12" height="16"/><path d="M13,20 V15 H18"/><line x1="9" y1="9" x2="15" y2="9"/>',
  icon_rec_radio: '<rect x="4" y="9" width="16" height="11"/><line x1="6" y1="9" x2="15" y2="3.5"/><circle cx="9" cy="14.5" r="2.4"/><line x1="14" y1="13" x2="17" y2="13"/><line x1="14" y1="16" x2="17" y2="16"/>',
  icon_rec_sketch: `<rect x="4.5" y="4.5" width="15" height="15"/><path d="M7,16 L11,11 L13.5,14 L15.5,12 L17,14"/><circle cx="9.5" cy="8.5" r="1.2" ${F}/>`,
  // ── 전리품 (loot) ──
  icon_loot_blueprint: '<rect x="4" y="5" width="16" height="14"/><path d="M9,15.5 L12,11.5 L15,15.5"/><line x1="7" y1="8" x2="11" y2="8"/>',
  icon_loot_paint: '<rect x="6.5" y="10" width="11" height="10"/><path d="M6.5,10 A5.5,5.5 0 0,1 17.5,10"/><line x1="12" y1="13" x2="12" y2="16"/>',
};

mkdirSync(OUT, { recursive: true });
const names = Object.keys(G).sort();
for (const name of names) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${G[name]}</svg>\n`;
  writeFileSync(join(OUT, `${name}.svg`), svg);
}

// 런타임 명단 — game.js icon()이 글리프 보유 여부를 동기 판정하는 데 쓴다
const gen = `// 자동 생성 파일 — tools/icon-semiotic.mjs가 만든다. 손으로 고치지 말 것.\nexport const GLYPH_NAMES = ${JSON.stringify(names, null, 0)};\n`;
writeFileSync(join(ROOT, 'src', 'data', 'glyphs.gen.js'), gen);
console.log(`glyphs: ${names.length} svg → public/img/glyphs + src/data/glyphs.gen.js`);
