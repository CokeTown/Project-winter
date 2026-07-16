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
import { rateParts, masteryTier, cityOf } from './expedition.js';
import { REGIONS } from '../data/world.js';
import { SHELTER_META } from '../data/shelters.js';
import { BAL } from '../data/balance.js';

// weather.type 주입 (weather 객체는 파티클 등 렌더 결합이라 game.js 잔류 — 타입만 읽는다).
let _weatherType = () => 'clear';
export function setRegionsWeather(fn) { _weatherType = fn; }

const BLIZZARD_EXEMPT_REGIONS = ['harborYard', 'fishMarket']; // 지상 폭설 봉쇄에서 제외되는 지역(항구)

// 2.0 낙진 시계 (GD-2.0 §2): 겨울 셋을 넘기면 낙진이 걷힌다 — 금지 구역 맨몸 개방 + 도심 중심지 노출.
//   successes가 아니라 winters 파생(day 기반 결정론) — 시간이 지도 자체를 바꾼다.
export function falloutCleared() {
  return (state.winters || 0) >= BAL.forbidden.falloutWinters;
}
// 지역 해금 여부 (성공 횟수 게이트). 항구·리조트·금지구역은 대응 셸터/후반선 도달 시 지도 노출.
export function regionUnlocked(rid) {
  if (rid === 'harborYard' || rid === 'fishMarket') return state.successes >= SHELTER_META.tugboat.unlockAt;
  if (rid === 'resort') return state.successes >= SHELTER_META.lodge.unlockAt; // 1.3: 리조트는 스키 로지 해금 후
  if (rid === 'checkpoint' || rid === 'lab') return state.successes >= BAL.forbidden.unlockAt; // 1.4 금지구역(진입은 방호복 게이트가 별도)
  if (rid === 'citycore') return falloutCleared(); // 2.0: 봉쇄선 너머 수도의 심장 — 낙진이 걷혀야만
  // #167 2겹화 파일럿: 뒷골목 심부는 겉(슬럼)을 아는 사람에게만 — 숙련 ★1(20회 시도)이 곧 열쇠.
  //   "다시 마주칠 때 더 보인다"(DEPTH-DESIGN)의 공간 적용. 해금 전엔 지도에 아예 없다(소문조차 없음).
  if (rid === 'slumdeep') return masteryTier('slum') >= 1;
  // 2.0-(c): 동부 신영토 8지역 일괄 게이트 — 관문 「국경 길」 완공(eastGateOpen) 전엔 존재 자체가 없다
  //   (지도·자동 선택·원정 전부 이 술어를 거친다). cities.enabled와 무관 — 개통은 플레이어가 번 것.
  if (regionCityOf(rid) === 'east') return !!state.eastGateOpen;
  return true;
}
export function isForbiddenRegion(regionId) {
  return !!REGIONS[regionId]?.forbidden;
}
// 2.0-(b) (§9.8.3): 지역의 소속 도시 — REGIONS city 태그(누락=home, 기존 10지역 전부 해당).
export function regionCityOf(rid) {
  return REGIONS[rid]?.city || 'home';
}
// 2.0-(b): 현 도시에서 닿는 지역인가 — 원정 UI·자동 선택·출발 게이트 공용 술어.
//   기능 플래그 off = 현 전역 회귀(§9.8.3 격리 원칙): 동부 콘텐츠가 열리기 전까지 동작 변화 0.
export function regionReachable(rid) {
  if (!BAL.cities?.enabled) return true;
  return regionCityOf(rid) === cityOf(state.current);
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
// #193: 눈사태(1.3)·도심 적대 자동 회피 — 두 시스템 모두 game.js 결합이라 술어만 주입받는다(단방향, weather와 동일 문법).
//   눈사태: 봉쇄 중이거나 예보 당일(수동 선택 모달 필요)이면 자동은 그 지역을 건너뛴다.
//   도심 적대: 하드+에서 조우 손실(전리품 50%·중상)이 커 자동엔 금지 구역과 동일 취급 — 위험은 수동 전략 레버.
let _autoAvoid = () => false;
export function setRegionsAutoAvoid(fn) { _autoAvoid = fn; }

// 자동진행 지역 선택: 해금·미봉쇄·미금지 중 성공률(eff) × 부족자원 보너스 가중 최고. 직전 지역은 감쇠(편중 완화).
export function pickAutoRegion() {
  const A = BAL.auto;
  const scarce = new Set(A.scarceWatch.filter(r => (state.res[r] || 0) < A.scarceThreshold)); // 임계 미만 자원
  let bestId = null, bestW = -1;
  for (const id of Object.keys(REGIONS)) {
    if (!regionUnlocked(id)) continue;      // 미해금 제외
    if (!regionReachable(id)) continue;     // 2.0-(b): 타 도시 지역 제외 (플래그 off면 전부 통과)
    if (blizzardBlocks(id)) continue;       // 폭설 봉쇄 제외
    if (isForbiddenRegion(id)) continue;    // 금지 구역 제외(방호복·수동 전략 레버)
    if (_autoAvoid(id)) continue;           // #193 눈사태 봉쇄/예보 당일 + 하드 도심 적대 제외
    const eff = rateParts(id, []).eff;
    if (eff <= 0) continue;
    let scarceHits = 0;
    for (const [rid] of REGIONS[id].lootRes) if (scarce.has(rid)) scarceHits++; // 부족 자원 종 수
    let w = eff * (1 + scarceHits * A.scarceWeightPerRes);
    // #177 레버5: 활성 위시리스트(미수집 시그니처 도면 보유) 지역 넛지 — 정보판 트래커가 "여기서만"이라
    //   가리킨 곳으로 자동 탐험도 향한다(pull 실현). 전부 수집하면 조건이 풀려 자동 소멸.
    const sigs = BAL.blueprint.regionItems[id];
    if (sigs && sigs.some(bp => !(state.blueprints || {})[bp])) w *= A.wishlistWeight;
    // #195: #164 컨디션(풍/마름)·떠오른 자리 — 지도 배지와 자동 선택 가중의 비대칭 봉합(#177 레버5만 배선돼 있던 것)
    const cLv = (state.regionCond && state.regionCond.lv && state.regionCond.lv[id]) || 0;
    if (cLv > 0) w *= A.condRichWeight; else if (cLv < 0) w *= A.condLeanWeight;
    if (state.fieldSpot && state.fieldSpot.region === id) w *= A.spotWeight;
    if (id === state.lastAutoRegion) w *= A.revisitDecay; // 직전 방문 감쇠
    if (w > bestW) { bestW = w; bestId = id; }
  }
  return bestId;
}
