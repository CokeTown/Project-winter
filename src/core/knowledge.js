/* ============================================================
   core/knowledge.js — 「지식」 테크트리 로직 (깊이 설계 DEPTH-DESIGN §9)
   ------------------------------------------------------------
   해금 판정(선행 티어 + 책 비용) · 해금 실행(책 소비) · 효과 게터(순수, state.knowledge 집계).
   효과는 game.js 훅이 기존 시스템(coldDefense/comfort/exp/연료/부패 등)에 먹인다 — 지식은 영구·전 셸터.
   중복 규정: coldDefense 등은 기존 개조와 합산될 수 있으나, game.js 훅에서 Math.max로 상위 대체 처리.
   의존: state(core) · KNOWLEDGE(data). 단방향(game.js를 import하지 않는다).
   ============================================================ */
import { state } from './state.js';
import { KNOWLEDGE } from '../data/knowledge.js';

// 해금 보유?
export function hasKnowledge(id) { return (state.knowledge || []).includes(id); }

// 같은 갈래에서 한 티어 아래 노드 id (선행). tier 1은 선행 없음.
function prereqOf(id) {
  const n = KNOWLEDGE[id];
  if (!n || n.tier <= 1) return null;
  return Object.keys(KNOWLEDGE).find(k => KNOWLEDGE[k].branch === n.branch && KNOWLEDGE[k].tier === n.tier - 1) || null;
}
// 선행 충족? (책 잔량 무관 — 순수 트리 게이트)
export function knowledgePrereqMet(id) {
  const pre = prereqOf(id);
  return !pre || hasKnowledge(pre);
}
// 지금 해금 가능? (미보유 + 선행 충족 + 책 충분)
export function knowledgeUnlockable(id) {
  const n = KNOWLEDGE[id];
  if (!n || hasKnowledge(id)) return false;
  return knowledgePrereqMet(id) && (state.res.book || 0) >= n.cost;
}
// 해금 실행. 성공 시 책 소비 + state.knowledge 등록. 반환 boolean.
export function unlockKnowledge(id) {
  if (!knowledgeUnlockable(id)) return false;
  const n = KNOWLEDGE[id];
  state.res.book = (state.res.book || 0) - n.cost;
  if (!Array.isArray(state.knowledge)) state.knowledge = [];
  state.knowledge.push(id);
  return true;
}

// ── 효과 게터 (순수 집계) — game.js 훅이 기존 시스템에 먹인다 ──
function sumEffect(key) { // 해금 노드들의 effect[key] 합
  let s = 0;
  for (const id of state.knowledge || []) { const e = KNOWLEDGE[id]?.effect; if (e && typeof e[key] === 'number') s += e[key]; }
  return s;
}
const anyEffect = (key) => (state.knowledge || []).some(id => KNOWLEDGE[id]?.effect?.[key]);

// 온기
export const knowColdDefense    = () => sumEffect('coldDefense');   // 단열(+1)+화덕(+1) = 최대 +2
export const knowInsulates      = () => anyEffect('insulates');     // 얇은 셸터 악천후 쾌적 페널티 무효
export const knowHearthAnywhere = () => anyEffect('hearthAnywhere');// 전 셸터 벽난로
export const knowWinterComfort  = () => sumEffect('winterComfort'); // 화덕 겨울 쾌적
export const knowHeatFuelMul    = () => anyEffect('heatFuelMul') ? 0.75 : 1; // 효율 난방 −25%
// 자급
export const knowWaterPerDay    = () => sumEffect('waterPerDay');   // 정수 +1/일
export const knowGardenAnywhere = () => anyEffect('gardenAnywhere');// 텃밭 전 셸터
export const knowGardenBonus    = () => sumEffect('gardenBonus');   // 수확 +1
export const knowSpoilMul       = () => anyEffect('spoilMul') ? 0.5 : 1; // 보존 부패 −50%
export const knowSaltCureBonus  = () => sumEffect('saltCureBonus'); // 염장 +1
// 살림
export const knowDirtReduce     = () => sumEffect('dirtReduce');    // 정리 일일 청결 감소 −0.5
export const knowCraftMul       = () => anyEffect('craftMul') ? 0.8 : 1; // 손재주 제작비 −20%
export const knowComfortBonus   = () => sumEffect('comfortBonus');  // 아늑함 쾌적 +6
// 앎
export const knowExpBonus       = () => sumEffect('expBonus');      // 정찰 성공률 +4%p
export const knowForecastLead   = () => sumEffect('forecastLead');  // 예보 리드 +1일
export const knowsForecast      = () => anyEffect('grantForecast'); // 예보/무전 = 예보 부여
export const knowBroadcastBonus = () => sumEffect('broadcastBonus');// 무전 송출 도달 +1
