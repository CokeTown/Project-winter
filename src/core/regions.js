/* ============================================================
   core/regions.js — 지역 게이트 + 자동 탐험 선택 (game.js 모놀리스 분해 Tier 3)
   ------------------------------------------------------------
   해금(regionUnlocked)·금지(isForbiddenRegion)·지하개통(subwayReaches)·폭설봉쇄(blizzardBlocks) 판정 +
   자동진행 지역 선택(pickAutoRegion). 순수 상태/결정 로직(RNG·렌더 없음).
   weather.type만 game.js 렌더 결합이라 setRegionsWeather로 주입받는다(blizzardBlocks 눈 판정용).
   의존: state/season/expedition(core, rateParts) · world/shelters/balance(data).
   ============================================================ */
import { state } from './state.js';
import { seasonOf } from './season.js';
import { rateParts } from './expedition.js';
import { REGIONS } from '../data/world.js';
import { SHELTER_META } from '../data/shelters.js';
import { BAL } from '../data/balance.js';

// weather.type 주입 (weather 객체는 파티클 등 렌더 결합이라 game.js 잔류 — 타입만 읽는다).
let _weatherType = () => 'clear';
export function setRegionsWeather(fn) { _weatherType = fn; }
// #74 데모 빌드 여부 주입 (regions.js는 순수 모듈 → game.js DEMO_ED를 못 봄, weather와 동일 주입 패턴).
let _demoLock = () => false;
export function setRegionsDemo(fn) { _demoLock = fn; }
const DEMO_REGIONS = new Set(['residential', 'industrial', 'slum']); // 데모 허용 파밍 지역 3종 (상업+확장 잠금)
// #159 데모 도전(하드) 한정 추가 개방 — "도전을 고르면 도시가 조금 더 열린다" (디렉터 2026-07-10)
const DEMO_HARD_REGIONS = new Set(['commercial']);

const BLIZZARD_EXEMPT_REGIONS = ['harborYard', 'fishMarket']; // 지상 폭설 봉쇄에서 제외되는 지역(항구)

// 지역 해금 여부 (성공 횟수 게이트). 항구·리조트·금지구역은 대응 셸터/후반선 도달 시 지도 노출.
export function regionUnlocked(rid) {
  if (_demoLock()) return DEMO_REGIONS.has(rid) || (state.mode === 'hard' && DEMO_HARD_REGIONS.has(rid)); // #74 데모 3지역 + #159 도전=상업지구
  if (rid === 'harborYard' || rid === 'fishMarket') return state.successes >= SHELTER_META.tugboat.unlockAt;
  if (rid === 'resort') return state.successes >= SHELTER_META.lodge.unlockAt; // 1.3: 리조트는 스키 로지 해금 후
  if (rid === 'checkpoint' || rid === 'lab') return state.successes >= BAL.forbidden.unlockAt; // 1.4 금지구역(진입은 방호복 게이트가 별도)
  return true;
}
export function isForbiddenRegion(regionId) {
  return !!REGIONS[regionId]?.forbidden;
}
export function subwayReaches(regionId) {
  return !!(state.subwayOpen && state.subwayOpen[regionId]);
}
// 1.2 폭설 봉쇄: 겨울·눈 오는 날 지상 지역을 막는다. 항구 면제 + 지하 개통 구간은 지하로 돌아가므로 무시.
export function blizzardBlocks(regionId) {
  if (!BAL.subway.blizzardBlocksExpedition) return false;
  if (seasonOf().id !== 'winter' || _weatherType() !== 'snow') return false;
  if (BLIZZARD_EXEMPT_REGIONS.includes(regionId)) return false;
  if (subwayReaches(regionId)) return false; // 개통 구간: 지하로 돌아가므로 봉쇄 무시
  return true;
}
// 자동진행 지역 선택: 해금·미봉쇄·미금지 중 성공률(eff) × 부족자원 보너스 가중 최고. 직전 지역은 감쇠(편중 완화).
export function pickAutoRegion() {
  const A = BAL.auto;
  const scarce = new Set(A.scarceWatch.filter(r => (state.res[r] || 0) < A.scarceThreshold)); // 임계 미만 자원
  let bestId = null, bestW = -1;
  for (const id of Object.keys(REGIONS)) {
    if (!regionUnlocked(id)) continue;      // 미해금 제외
    if (blizzardBlocks(id)) continue;       // 폭설 봉쇄 제외
    if (isForbiddenRegion(id)) continue;    // 금지 구역 제외(방호복·수동 전략 레버)
    const eff = rateParts(id, []).eff;
    if (eff <= 0) continue;
    let scarceHits = 0;
    for (const [rid] of REGIONS[id].lootRes) if (scarce.has(rid)) scarceHits++; // 부족 자원 종 수
    let w = eff * (1 + scarceHits * A.scarceWeightPerRes);
    if (id === state.lastAutoRegion) w *= A.revisitDecay; // 직전 방문 감쇠
    if (w > bestW) { bestW = w; bestId = id; }
  }
  return bestId;
}
