/* ============================================================
   core/gauges.js — 생존 게이지 감소 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   배고픔/갈증 시간당 감소(계절·난이도·한파·여름 배수) + autoEat 자동 섭취. 순수 상태 변경(렌더 무관).
   eatFood/drinkWater(토스트·퀘스트·HUD UI)와 에너지 회복/취침(orchestration)은 game.js 잔류.
   ============================================================ */
import { state, opts } from './state.js';
import { isWallpaper, isHard } from './mode.js';
import { seasonOf } from './season.js';
import { coldSnapNetSeverity, frontDiscipline } from './coldsnap.js';
import { resConsume, hasAnyFood, consumeAnyFood } from './economy.js';
import { BAL } from '../data/balance.js';

// 시간(gm분)만큼 배고픔/갈증 감소. 겨울·하드·한파·여름 배수 적용. autoEat면 임계 이하 자동 섭취.
export function decayGauges(gm) {
  if (isWallpaper()) return; // 🖼️ 배경화면: 게이지 압박 off — 배고픔/갈증/에너지 정지(볼거리만 흐른다)
  const winterMult = seasonOf().id === 'winter' ? BAL.gauges.winterMult : 1; // 겨울엔 열량 소모가 크다
  const hardMul = isHard() ? BAL.hard.drainMul : 1; // 하드: 배고픔/갈증 소모 +50%
  // 한파: 방어가 안 된 만큼(netSeverity) 배고픔 감소를 가속 (완전 방어 시 1.0)
  const coldMult = coldSnapNetSeverity() > 0 ? BAL.seasons.coldSnapHungerMult : 1;
  const summerThirst = seasonOf().id === 'summer' ? BAL.seasons.summerThirstMult : 1; // 여름 갈증 압박
  // 2.0 대한파 배급 규율(§9.4-③, 하드 선택): 배고픔이 느리게 꺼진다 — 섭취 빈도가 줄어 실질 식량 절약
  const rationMul = frontDiscipline() === 'ration' ? BAL.greatColdSnap.discipline.rationHungerMul : 1;
  state.hunger = Math.max(0, state.hunger - gm * BAL.gauges.hungerPerMin * winterMult * hardMul * coldMult * rationMul); // v0.9.1: 22% 완화 (×0.78) — 만복 → 0까지 약 5게임일
  state.thirst = Math.max(0, state.thirst - gm * BAL.gauges.thirstPerMin * hardMul * summerThirst);          // v0.9.1: 22% 완화 (×0.78)
  if (opts.autoEat) {
    let g = 0;
    while (state.hunger < BAL.gauges.autoEatThreshold && hasAnyFood(1) && g++ < BAL.gauges.autoEatGuard) { consumeAnyFood(1); state.hunger = Math.min(100, state.hunger + BAL.gauges.autoEatRestore); }
    g = 0;
    while (state.thirst < BAL.gauges.autoEatThreshold && (state.res.water || 0) > 0 && g++ < BAL.gauges.autoEatGuard) { resConsume('water', 1); state.thirst = Math.min(100, state.thirst + BAL.gauges.autoEatRestore); }
  }
}
// 배고픔 또는 갈증이 바닥 — 탐험 등 활동 제약 판정
export function isExhausted() { return state.hunger <= 0 || state.thirst <= 0; }
