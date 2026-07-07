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
// ── 2.0 지역 숙련 (GD-2.0 §9.4-② · DEPTH-DESIGN §10.2② · REWARD-LOOP ①) ──
//   같은 지역 반복(성공+실패 모두 — regionVisits는 성패 무관 증가) → 지리 지식 티어 → 성공률 가산.
//   실패도 진행이 된다: 무서운 첫 도전을 견딜 이유. "단골 동네가 생긴다"(노말) / 생존 기술(하드).
//   시뮬 안전: regionVisits 증가가 !_simRunning 가드 안(#85 시뮬 순수성) → 시드 시뮬은 항상 티어 0 = 기준선 불변.
export function masteryTier(regionId) {
  const v = (state.regionVisits || {})[regionId] || 0;
  let tier = 0;
  for (let i = 0; i < BAL.mastery.tiers.length; i++) if (v >= BAL.mastery.tiers[i]) tier = i + 1;
  return tier;
}
// 성공률 가산분. 지역별 캡(base+capGain, 상한 capMax)을 향해 오른다 — 저확률 지역일수록 성장 여지가 크다:
//   slum 0.25 → t3 +0.36(캡 0.65 미달) · residential 0.80 → 캡 0.85까지 +0.05뿐. 하드 지역이 숙달로 신뢰 가능해지고,
//   안전 지역은 오를 데가 없다 = "왜 어려운 곳에 가나"의 구조적 답. 캡<1.0 유지(하드가 시시해지지 않게).
export function masteryBonus(regionId) {
  const tier = masteryTier(regionId);
  if (!tier) return 0;
  const base = REGIONS[regionId].rate;
  const cap = Math.min(base + BAL.mastery.capGain, BAL.mastery.capMax);
  return Math.max(0, Math.min(base + tier * BAL.mastery.ratePerTier, cap) - base);
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
  const mastery = masteryBonus(regionId); // 2.0 지역 숙련: 지리 지식 티어 가산 (시뮬은 visits 0 = 항상 0)
  const eff = clamp(r.rate + comfort + shelter + district + gear + buff + know + mastery - weatherPen - injuryPen - hungryPen - coldPen - avalanchePen, 0.05, 0.95);
  return { base: r.rate, comfort, shelter, district, gear, buff, know, mastery, weatherPen, injuryPen, hungryPen, coldPen, avalanchePen, eff };
}
