/* ============================================================
   core/coldsnap.js — 한파(cold snap) 술어 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   겨울 보스 이벤트 "한파"의 방어단계·활성여부·순 페널티 강도. 일일 처리·쾌적·아침 보고가 읽는다.
   순수 판정만(렌더 무관). hearth는 SHELTER_META(데이터)에서 읽음 — game.js SHELTERS 병합본과 동일 값.
   의존: state/items(core/state) · seasonOf(core/season) · hasMod(core/shelter) · DEFS(data) · SHELTER_META(data).
   ============================================================ */
import { state, items } from './state.js';
import { seasonOf } from './season.js';
import { hasMod } from './shelter.js';
import { knowInsulates, knowHearthAnywhere } from './knowledge.js';
import { DEFS } from '../data/furniture.js';
import { SHELTER_META } from '../data/shelters.js';

// 한파 방어 수단이 몇 단계 갖춰졌는가: 단열 개조 + 난방 가동(장작 난로/온풍기 ON)
export function coldDefenseLevel() {
  let lv = 0;
  // 단열 지식(§9): 전 셸터 영구 단열 — insulation 개조와 OR(중복 아니라 상위 대체, +1만).
  if (hasMod('insulation') || hasMod('insulationPlus') || knowInsulates()) lv++;
  if (hasMod('insulationPlus')) lv++; // 강화 단열재는 한 단계 더
  // 난방 가동: 장작 난로(stove, 불빛 연료 fuel) 또는 온풍기(heater) ON
  const heating = items.some(i => {
    if (i.on === false) return false;
    if (i.defId === 'stove') return true;
    return DEFS[i.defId]?.appliance?.effect === 'heat';
  });
  if (heating) lv++;
  // 로지 붙박이 벽난로 또는 화덕 지식(§9, 전 셸터 벽난로) — 유지비만 내면(upkeepOk) 한 단계 방어.
  if ((SHELTER_META[state.current].hearth || knowHearthAnywhere()) && state.upkeepOk) lv++;
  return lv;
}
// 한파 활성 여부 (오늘이 coldSnap.until 이하이고 겨울)
export function coldSnapActive() {
  return !!(state.coldSnap && seasonOf().id === 'winter' && state.day <= state.coldSnap.until);
}
// 한파 순 페널티 강도 (0=완전 방어). severity - 방어단계, 0~severity로 클램프
export function coldSnapNetSeverity() {
  if (!coldSnapActive()) return 0;
  const sev = state.coldSnap.severity || 1;
  return Math.max(0, sev - coldDefenseLevel());
}
