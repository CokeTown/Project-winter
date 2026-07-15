/* ============================================================
   core/comfort.js — 쾌적함 계산 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   #29 Living Shelter 쾌적 점수(comfortDetail) + 파생(레벨/탐험보너스/회복배수) + 테마세트 판정.
   순수 계산만. i18n 원인 로그(comfortBreakdown)·HTML(comfortBreakdownHtml)은 표시층이라 game.js 잔류.
   weather는 파티클 등 렌더 결합 객체라 game.js 잔류 — 현재 타입만 setComfortWeather로 주입받는다(단방향 유지).
   ============================================================ */
import { state, items } from './state.js';
import { seasonOf } from './season.js';
import { hasMod } from './shelter.js';
import { coldSnapNetSeverity, frontDiscipline } from './coldsnap.js';
import { knowInsulates, knowHearthAnywhere, knowComfortBonus } from './knowledge.js';
import { DEFS } from '../data/furniture.js';
import { SHELTER_META } from '../data/shelters.js';
import { BAL } from '../data/balance.js';
import { THEME_SETS } from '../data/items.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const DECO_THEME_COMFORT = BAL.deco.themeSetComfort;

// weather.type 주입 (weather 객체 자체는 렌더 결합이라 game.js 잔류 — 타입만 읽는다)
let _weatherType = () => 'clear';
export function setComfortWeather(fn) { _weatherType = fn; }

// #193: 조명 설비(개조) 급전 상태 주입 — lightingFacilityOn은 렌더 리그와 한 몸이라 game.js 잔류(단방향).
//   주입 전(하네스 초기 등)엔 false — 기존 계산과 동일해 무해.
let _facilityLight = () => false;
export function setComfortFacilityLight(fn) { _facilityLight = fn; }

// 테마 세트(#13): 필요한 defId 개수(중복 포함)를 배치된 가구가 모두 만족하면 true.
export function themeSetActive(ts) {
  const need = {};
  for (const id of ts.items) need[id] = (need[id] || 0) + 1;
  const have = {};
  for (const it of items) have[it.defId] = (have[it.defId] || 0) + 1;
  return Object.entries(need).every(([id, n]) => (have[id] || 0) >= n);
}
export function activeThemeSets() { return THEME_SETS.filter(themeSetActive); }

// 돔 벙커 리워크(#36): 천장 완전 수리(+4) + 절단기 뒷문 저장고(+4). 벙커에서만 유효.
export function bunkerComfortBonus() {
  if (state.current !== 'bunker') return 0;
  let b = 0;
  if (state.bunkerRoof === 'full') b += BAL.economy.bunkerRoofComfort;
  if (state.bunkerBackdoor) b += BAL.economy.bunkerStorageComfort;
  return b;
}

// #157 가구 티어 → 쾌적 배수: 티어 가구는 T1=1/3, T2=2/3, T3=1. 비티어·구세이브(t=0)는 1.
export function tierComfortMult(it) {
  return DEFS[it.defId]?.tiered ? (it.tier || 3) / 3 : 1;
}
export function comfortDetail() {
  const types = new Set(items.map(i => i.defId));
  const furn = Math.min(45, items.reduce((a, i) => a + 3 * tierComfortMult(i), 0) + types.size * 3);
  let light = 0;
  for (const it of items) {
    const L = DEFS[it.defId].light;
    if (L && it.on !== false) light += (L.comfort ?? 5) * tierComfortMult(it);
  }
  // #193: 조명 설비(급전 중 전등)도 빛이다 — 지하철 "완전한 어둠 -12"가 전등 켜진 방을 어둠 취급하던 결함.
  if (_facilityLight()) light += BAL.lighting.facilityComfort;
  const lm = SHELTER_META[state.current].perk?.lightMult || 1;
  light = Math.min(24 * lm, light * lm);
  const clean = state.cleanBy[state.current] ?? 70;
  const cleanMod = clean >= 80 ? 5 : clean >= 50 ? 0 : clean >= 20 ? -5 : -10;
  const sh = SHELTER_META[state.current];
  const shelterMod = state.upkeepOk ? (sh.baseComfort || 0) : 0;
  const injuryMod = (state.injury ? -5 : 0) + ((state.hunger < 25 || state.thirst < 25) ? -5 : 0);
  // 정든 집: 한 거처에 연속으로 머물수록 아늑해진다 (하루 +1, 최대 +8)
  const settled = Math.min(8, state.stayDays || 0);
  const catMod = (state.cat && !state.catHungry) ? 6 : 0; // 고양이가 있는 집은 따뜻하다 (배고파하면 정지)
  // 현실 제약: 단열 취약(악천후 시) / 어둠(조명 필수)
  let limitMod = 0;
  const wt = _weatherType();
  // 단열 지식(§9): 얇은 셸터 악천후 쾌적 페널티 무효 (insulation 개조와 동급).
  //   customsSeal(세관 창구 봉쇄)·terminalPatch(대합실 지붕 틈 막기)도 동급 — "shelter는 응당 안전해야".
  if (sh.cold && (wt === 'rain' || wt === 'snow' || wt === 'storm') && !hasMod('insulation') && !hasMod('insulationPlus') && !hasMod('customsSeal') && !hasMod('terminalPatch') && !knowInsulates()) limitMod -= sh.cold;
  // #195: selfLit(네온 — 실광원 내장)은 어둠 페널티만 면제, 쾌적 가산은 0 유지(시그니처=파워 아님 코지 안전선)
  const anySelfLit = items.some(it => DEFS[it.defId].selfLit && it.on !== false);
  if (sh.needsLight && light <= 0 && !anySelfLit) limitMod -= sh.needsLight;
  // 한파: 방어 안 된 만큼 쾌적함 페널티 (완전 방어 시 0)
  if (coldSnapNetSeverity() > 0) limitMod -= BAL.seasons.coldSnapComfortPen;
  // 2.0 대한파 자기 규율(§9.4-③): 배급 반(-3)·비상식량 개봉(-4)의 살림 그늘 — 프론트 기간만
  const disc = frontDiscipline();
  if (disc === 'ration') limitMod -= BAL.greatColdSnap.discipline.rationComfort;
  if (disc === 'emergency') limitMod -= BAL.greatColdSnap.discipline.emergencyComfort;
  // 온풍기(heater) 가동 시 겨울 쾌적 보너스
  let heatMod = 0;
  if (seasonOf().id === 'winter' && items.some(i => i.on !== false && DEFS[i.defId]?.appliance?.effect === 'heat')) heatMod += BAL.economy.heaterWinterComfort;
  // 로지 붙박이 벽난로 또는 화덕 지식(§9, 전 셸터 벽난로) — 겨울 온기(온풍기와 별개). upkeepOk일 때만.
  if ((sh.hearth || knowHearthAnywhere()) && seasonOf().id === 'winter' && state.upkeepOk) heatMod += BAL.highland.hearthWinterComfort;
  // 1.3 온천 개조 — cozy 정점(계절 무관, 온천은 늘 따뜻하다).
  if (hasMod('onsen')) heatMod += BAL.highland.onsenComfort;
  // 인카운터 안정감 여운(moodBuff) — 며칠간 지속되는 일시 쾌적.
  const moodMod = (state.moodBuff && state.day <= state.moodBuff.until) ? (state.moodBuff.amt || 0) : 0;
  const bunkerMod = bunkerComfortBonus(); // 돔 벙커 천장/저장고 가산
  const themeMod = activeThemeSets().length * DECO_THEME_COMFORT; // 테마 세트(#13) 분위기 가산
  const knowMod = knowComfortBonus(); // 아늑함 지식(§9) 상시 쾌적 가산
  const score = clamp(18 + furn + light + cleanMod + shelterMod + injuryMod + limitMod + settled + catMod + heatMod + moodMod + bunkerMod + themeMod + knowMod, 0, 100);
  return { furn, light, cleanMod, shelterMod, injuryMod, limitMod, settled, catMod, heatMod, moodMod, bunkerMod, themeMod, knowMod, clean, score };
}

export function comfortLevel() { return Math.min(5, Math.round(comfortDetail().score / 20)); }
// 기획서 쾌적함 티어: 50+ → +3%, 75+ → +6%, 90+ → +10% (셸터 cozyMult 배수)
export function comfortExpBonus() {
  const s = comfortDetail().score;
  const base = s >= 90 ? 0.10 : s >= 75 ? 0.06 : s >= 50 ? 0.03 : 0;
  return base * (SHELTER_META[state.current].perk?.cozyMult || 1);
}
// 쾌적함이 높으면 부상 회복도 빨라짐
export function recoveryMult() {
  const s = comfortDetail().score;
  return s >= 90 ? 0.8 : s >= 75 ? 0.9 : 1;
}
