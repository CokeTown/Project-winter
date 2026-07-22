/* ============================================================
   core/economy.js — 자원 연산 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   state.res를 읽고 쓰는 순수 자원 산술 + 일일 로그(gain/spend) 기록.
   렌더/UI 의존 없음(표시용 costLabel/reqChip은 resIcon 등 UI라 game.js 잔류).
   배경화면 모드는 자원 무한(차감·검사 통과). 하드/하드코어 loot 감산은 rollRes/expectedLoot 쪽.
   ============================================================ */
import { state } from './state.js';
import { isWallpaper } from './mode.js';
import { seasonOf } from './season.js';

// Nine Winters(#11): 겨울 중 연료 소모 집계 (winterSnap.acc — 봄 memoir 차분용). resConsume의 fuel 훅.
export function accWinterFuel(n) {
  if (seasonOf().id === 'winter' && state.winterSnap?.acc) state.winterSnap.acc.fuel += n;
}
export function resAdd(id, n) {
  if (n <= 0) return;
  state.res[id] = (state.res[id] || 0) + n;
  state.dayLog.gain[id] = (state.dayLog.gain[id] || 0) + n;
}
export function resConsume(id, n) {
  if (isWallpaper()) return true; // 배경화면: 자원 무한 — 차감하지 않는다(표시는 ∞)
  if ((state.res[id] || 0) < n) return false;
  state.res[id] -= n;
  state.dayLog.spend[id] = (state.dayLog.spend[id] || 0) + n;
  if (id === 'fuel') accWinterFuel(n); // Nine Winters(#11): 겨울 중 연료 소모 집계
  return true;
}
export function resHasAll(cost) {
  if (isWallpaper()) return true; // 배경화면: 항상 충족 (배치/이주 자유)
  return Object.entries(cost).every(([id, n]) => (state.res[id] || 0) >= n);
}
export function resConsumeAll(cost) {
  if (!resHasAll(cost)) return false;
  for (const [id, n] of Object.entries(cost)) resConsume(id, n);
  return true;
}
// 신선식품 우선 → 통조림 순으로 food n개를 대체 소비 (부족하면 아무것도 소비하지 않고 false)
export function hasAnyFood(n = 1) { return ((state.res.food || 0) + (state.res.canned || 0)) >= n; }
export function consumeAnyFood(n = 1) {
  if (!hasAnyFood(n)) return false;
  let remain = n;
  const fromFresh = Math.min(remain, state.res.food || 0);
  if (fromFresh > 0) { resConsume('food', fromFresh); remain -= fromFresh; }
  if (remain > 0) resConsume('canned', remain);
  return true;
}
