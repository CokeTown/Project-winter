/* ============================================================
   core/encounter.js — 인카운터 술어 (game.js 모놀리스 분해 Tier 3)
   ------------------------------------------------------------
   후보 자격(eventMatches)·반복억제 가중치(eventWeight)·3연속 하드가드(eventThreePeatBlocked)·
   발화 이력 push. 전부 순수 상태 술어(RNG 없음). 추첨(drawEvent, RNG)·컨텍스트(eventCtx, weather/
   gameHour 렌더 결합)는 game.js 잔류.
   EVENTS는 game.js makeEvents(ctx) 런타임 산물(함수 필드가 game.js 심볼 참조)이라 setEncounterEvents 주입.
   의존: state/items(core) · shelter(hasMod).
   ============================================================ */
import { state, items } from './state.js';
import { hasMod } from './shelter.js';

export const EV_HISTORY_MAX = 12; // 최근 발화 이력 보관 상한

// EVENTS 주입 — makeEvents 산물(game.js 심볼 참조 함수 필드)이라 game.js에서 생성 후 넘겨받는다.
let _EVENTS = {};
export function setEncounterEvents(ev) { _EVENTS = ev; }

// 선언적 조건 판정. when 이 없으면 무조건 후보. cond(레거시 자유함수)도 그대로 존중.
export function eventMatches(id, ctx) {
  const ev = _EVENTS[id];
  if (!ev || ev.special) return false;
  const w = ev.when;
  if (w) {
    if (w.seasons && !w.seasons.includes(ctx.season)) return false;
    if (w.shelters && !w.shelters.includes(ctx.shelter)) return false;
    if (w.districts && !w.districts.includes(ctx.district)) return false;
    if (w.weather && !w.weather.includes(ctx.weather)) return false;
    if (w.night === true && !ctx.night) return false;
    if (w.dayOnly === true && ctx.night) return false; // 낮 한정(caravan_pass 등)
    if (w.minDay != null && ctx.day < w.minDay) return false;
    if (w.needsRadio && !items.some(i => i.defId === 'radio')) return false;
    if (w.needsCat && !state.cat) return false;
    if (w.hasMod && !hasMod(w.hasMod)) return false;
    // #163b 절박 티어 (디렉터 2026-07-10): 겨울이 지날수록 세상이 야위는 네거티브 이벤트는
    //   생존·혹한 전용 — 코지에는 절대 오지 않는다. minWinters=발화 최소 경과 겨울 수.
    if (w.modes && !w.modes.includes(state.mode)) return false;
    if (w.minWinters != null && (ctx.winters || 0) < w.minWinters) return false;
  }
  if (ev.cond && !ev.cond()) return false; // 레거시/추가 자유조건
  return true;
}
// 반복 억제 가중치: 직전 발화면 강한 감쇄, 7일 창 2회 이상이면 사실상 제외.
export function eventWeight(id) {
  const hist = state.evHistory || [];
  const last = hist[hist.length - 1];
  if (last && last.id === id) return 0.15;              // 연속 등장 강한 억제
  const recent7 = hist.filter(h => state.day - h.day <= 7 && h.id === id).length;
  if (recent7 >= 2) return 0.05;                        // 7일 창 2회 이상 → 거의 안 뜸
  if (recent7 === 1) return 0.4;
  const base = _EVENTS[id].weight || 1;
  return base;
}
// 하드 가드 (REQ-EVT-02): ①최근 2건이 모두 같은 id면 3연속 금지, ②최근 7일 창에 이미 2회면 후보 제외.
export function eventThreePeatBlocked(id) {
  const hist = state.evHistory || [];
  const n = hist.length;
  if (n >= 2 && hist[n - 1].id === id && hist[n - 2].id === id) return true;
  // 7일 창(오늘 포함 직전 6일) 내 동일 이벤트가 이미 2회면 3번째 발화 차단 (REQ-EVT-02).
  const recent7 = hist.filter(h => state.day - h.day <= 6 && h.id === id).length;
  if (recent7 >= 2) return true;
  return false;
}
export function pushEvHistory(id) {
  if (!Array.isArray(state.evHistory)) state.evHistory = [];
  state.evHistory.push({ id, day: state.day });
  if (state.evHistory.length > EV_HISTORY_MAX) state.evHistory.shift();
}
