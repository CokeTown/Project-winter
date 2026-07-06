/* ============================================================
   core/expedition.js — 탐험 판정 (game.js 모놀리스 분해 Tier 3)
   ------------------------------------------------------------
   districtOf(셸터→구역) · rateParts(성공률 분해) · expActualRate(숨은 pity 보정). 전부 순수 계산(RNG 없음).
   weather/WEATHERS는 렌더 결합이라 game.js 잔류 — 날씨 페널티 값만 setExpeditionWeather로 주입받는다(단방향).
   정산(resolveExpedition, RNG·전리품·UI)과 출발(departExpedition)은 game.js 잔류.
   의존: state/mode/coldsnap/comfort/knowledge(core) · world/shelters/items/balance(data).
   ============================================================ */
import { state } from './state.js';
import { isHard } from './mode.js';
import { coldSnapNetSeverity } from './coldsnap.js';
import { comfortExpBonus } from './comfort.js';
import { knowExpBonus } from './knowledge.js';
import { REGIONS, DISTRICTS } from '../data/world.js';
import { SHELTER_META } from '../data/shelters.js';
import { PREPS, INJURIES } from '../data/items.js';
import { BAL } from '../data/balance.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 날씨 페널티 주입 (WEATHERS+weather 객체는 파티클 등 렌더 결합이라 game.js 잔류 — 페널티 수치만 읽는다).
let _weatherPenalty = () => 0;
export function setExpeditionWeather(fn) { _weatherPenalty = fn; }

// 셸터 → 구역 (DISTRICTS.shelters 역참조). 없으면 outskirts.
export function districtOf(shelterId) {
  for (const [id, d] of Object.entries(DISTRICTS)) if (d.shelters.includes(shelterId)) return id;
  return 'outskirts';
}
// 성공률 체감 보정: 표기(rate) 불변, 실제 판정 확률만 몰래 올린다 (노말 +4%p 상시 + pity, 하드는 pity만). 상한 0.95.
export function expActualRate(rate, streak) {
  return Math.min(BAL.pity.ceiling, rate + (isHard() ? 0 : BAL.pity.normalBonus) + BAL.pity.perStreak * Math.min(BAL.pity.streakCap, streak || 0));
}
// 성공률 분해 (표기용). 각 요소 합산 후 0.05~0.95 클램프.
export function rateParts(regionId, prep = []) {
  const r = REGIONS[regionId];
  const sh = SHELTER_META[state.current];
  const comfort = comfortExpBonus();
  const shelter = state.upkeepOk ? (sh.perk?.expBonus || 0) : 0; // 유지비 미납 시 특성 정지
  const district = DISTRICTS[districtOf(state.current)].regionBonus?.[regionId] || 0;
  let weatherPen = _weatherPenalty();
  if (prep.includes('raincoat')) weatherPen *= 0.3;
  let gear = 0;
  for (const p of prep) {
    const b = PREPS[p].bonus;
    if (b && b[regionId]) gear += b[regionId];
  }
  const injuryPen = state.injury ? INJURIES[state.injury.type].pen : 0;
  const hungryPen = (state.hunger < BAL.exp.hungryPenGate || state.thirst < BAL.exp.hungryPenGate) ? BAL.exp.hungryPen : 0; // 허기/갈증
  const buff = state.buff?.exp || 0; // 인카운터 버프/디버프
  const know = knowExpBonus(); // 정찰 지식(§9): 전 지역 성공률 +4%p
  const coldPen = coldSnapNetSeverity() > 0 ? BAL.seasons.coldSnapExpPen : 0; // 한파: -10%p (방어 시 0)
  const avalanchePen = (state._avalancheDetour && regionId === 'resort') ? BAL.highland.avalancheDetourRatePen : 0; // 1.3 눈사태 우회로
  const eff = clamp(r.rate + comfort + shelter + district + gear + buff + know - weatherPen - injuryPen - hungryPen - coldPen - avalanchePen, 0.05, 0.95);
  return { base: r.rate, comfort, shelter, district, gear, buff, know, weatherPen, injuryPen, hungryPen, coldPen, avalanchePen, eff };
}
