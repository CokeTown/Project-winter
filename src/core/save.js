/* ============================================================
   core/save.js — 세이브 마이그레이션 (game.js 모놀리스 분해 Phase 2)
   ------------------------------------------------------------
   로드된 세이브의 버전 마이그레이션(v2→v3) + 신규 필드 기본값 보정(누적 가드). 순수 상태 변형(렌더 무관).
   저장/로드 I/O(localStorage·Platform.cloud·손상복구·오프라인 정산)와 loadShelter(렌더)는 game.js 잔류.
   ※ 안전망: tests/core.test.cjs MIG_HASH(정적 기본값 포괄 스냅샷 해시)가 무손실 보증.
   호출: loadSave가 Object.assign(state,data.state) 후 migrateLoadedState(data.state, defaults, oldVer).
   ============================================================ */
import { state } from './state.js';
import { SEASON_DAYS } from './season.js';
import { SHELTER_META } from '../data/shelters.js';
import { RESOURCES } from '../data/items.js';

// rawState = 원본 data.state(필드 존재 여부 판정용) · defaults = 로드 전 pristine state 깊은복사 · oldVer = data.state.ver||2
export function migrateLoadedState(rawState, defaults, oldVer) {
  // 구버전(v2) 필드 보정
  if (oldVer < 3) {
    // v0.3 시절 옥상 캠프 레이아웃은 벙커로 이전 (v3의 rooftop은 새 셸터)
    if (state.layouts.rooftop?.length) {
      state.layouts.bunker = [...(state.layouts.bunker || []), ...state.layouts.rooftop];
    }
    state.layouts.rooftop = [];
    for (const k of ['res', 'gameMin', 'day', 'savedAt', 'weatherType', 'weatherUntil', 'cleanBy', 'upkeepOk', 'dayLog', 'stats'])
      state[k] = defaults[k];
    state.injury = null;
    delete state.injuredUntil;
    state.ver = 3;
  }
  if (!state.renovated) state.renovated = { container: true };
  for (const id of Object.keys(SHELTER_META)) {
    if (!state.layouts[id]) state.layouts[id] = [];
    if (state.cleanBy[id] == null) state.cleanBy[id] = 70;
    // 이미 살아봤던 셸터는 정비 완료로 인정 (구버전 세이브 보호)
    if (state.layouts[id].length > 0 || state.current === id) state.renovated[id] = true;
  }
  for (const id of Object.keys(RESOURCES)) if (state.res[id] == null) state.res[id] = 0;
  if (!state.mode) state.mode = 'normal'; // 구세이브는 전부 노말 취급
  if (state.hunger == null) state.hunger = 80;
  if (state.thirst == null) state.thirst = 80;
  if (state.energy == null) state.energy = 100;
  if (state.catCoat == null || !['tabby', 'black', 'siamese', 'ragdoll'].includes(state.catCoat)) state.catCoat = 'tabby'; // 배E-1: 구세이브 코트 폴백
  if (state.expToday == null) state.expToday = 0;
  state.expFailStreak = state.expFailStreak ?? 0; // 구세이브 마이그레이션
  if (state.tutDay == null) state.tutDay = 0;
  if (!state.tipsSeen) state.tipsSeen = {};
  if (state.pendingTutorial === undefined) state.pendingTutorial = null;
  // Nine Winters(#11) 마이그레이션: winters 필드가 아예 없던 구세이브면 day로 역산해 카운터만 맞춘다.
  //   (DEFAULT_STATE.winters=0이라 Object.assign 뒤 state.winters는 항상 존재하므로, "필드 유무"는 원본 rawState로 판정.)
  if (rawState.winters == null) state.winters = Math.floor((state.day - 1) / SEASON_DAYS / 4);
  if (rawState.winterSnap === undefined) state.winterSnap = null;   // 스냅샷 없음 → 다음 겨울 시작 때 생성
  if (!Array.isArray(state.pendingWinterMemoir)) state.pendingWinterMemoir = [];
  if (rawState.doctorRadioPending == null) state.doctorRadioPending = false;
  // 2.0 대한파 프론트 (§9.4-③): 구세이브 기본값 — 미발령/비활성
  if (rawState.frontWinterKey == null) state.frontWinterKey = -1;
  if (rawState.front === undefined) state.front = null;
  // 2.0 부상 서사화 (§9.4-④): 구세이브는 흉터 기록 없이 시작
  if (!Array.isArray(state.scars)) state.scars = [];
  // 2.0 총 (§9.3): 구세이브 미보유
  if (rawState.gun === undefined) state.gun = null;
  // 2.0 엔딩 3분기 (§9.5): 구세이브 미선택. endingSeen=true(Day10000 기감상) 세이브도 3분기는 새로 만난다(소급 없음).
  if (rawState.endingType === undefined) state.endingType = null;
  if (rawState.endingChoicePending == null) state.endingChoicePending = false;
  if (rawState.earlyRescueDay == null) state.earlyRescueDay = 0;
  // 2.0 히든 루트 「침묵」 (§9.6): 구세이브 전부 미발견 기본값
  if (rawState.subwayHidden == null) state.subwayHidden = false;
  if (rawState.hiddenGateDone == null) state.hiddenGateDone = false;
  if (rawState.hiddenReachPending == null) state.hiddenReachPending = false;
  if (rawState.hiddenReached == null) state.hiddenReached = false;
  if (rawState.siloFired == null) state.siloFired = false;
  // 도료 (REWARD-LOOP ②): 구세이브 빈 팔레트로 시작. 이미 칠한 가구·도감은 그대로(소급 몰수 없음 — 기득권 인정)
  if (state.paints == null || typeof state.paints !== 'object') state.paints = {};
  if (rawState.dyeOffer === undefined) state.dyeOffer = null; // 염료 상인 오퍼 — 구세이브 없음
  if (rawState.bagDur == null) state.bagDur = 0; // DDD-3 내구성 가방 — 구세이브 미보유(1회용 시절 세이브 포함)
  if (state.blueprints == null || typeof state.blueprints !== 'object') state.blueprints = {}; // DDD-4 도면 — 구세이브 빈 손
  if (state.sights == null || typeof state.sights !== 'object') state.sights = {}; // 비네트 「본 광경」 — 구세이브 빈 눈
  // Phase D 마이그레이션 (#12·#35·#36) — 구세이브에 없던 필드는 기본값으로 보정
  if (!Array.isArray(state.knowledge)) state.knowledge = []; // 「지식」 트리(§9) — 구세이브 안전
  if (!Array.isArray(state.evHistory)) state.evHistory = [];
  if (state.moodBuff === undefined) state.moodBuff = null;
  if (state.memos == null || typeof state.memos !== 'object') state.memos = {};
  if (state.broadcasts == null || typeof state.broadcasts !== 'object') state.broadcasts = {};
  if (state.distantLight === undefined) state.distantLight = null;
  if (state.pendingMemoPopup === undefined) state.pendingMemoPopup = null;
  if (state.pendingBroadcast === undefined) state.pendingBroadcast = null;
  if (state.lastBroadcastDay == null) state.lastBroadcastDay = 0;
  if (state.pipeFrozenUntil == null) state.pipeFrozenUntil = 0;
  if (state.bunkerRoof == null) state.bunkerRoof = 'hole';
  if (state.bunkerBackdoor == null) state.bunkerBackdoor = false;
  if (state.hasCutter == null) state.hasCutter = false;
  if (state.rooftopSlate == null) state.rooftopSlate = 'gapped'; // #53
  if (state.rooftopGardenStage == null) state.rooftopGardenStage = 0; // #53
  if (state.projects == null || typeof state.projects !== 'object') state.projects = {}; // 1.1 대형 프로젝트 (ARC-02): 구세이브(부재) → {}
  if (state.breakwaterHut == null) state.breakwaterHut = false; // 1.1 항구: 방파제 오두막 완공 플래그
  if (state.icefishToday == null) state.icefishToday = 0;       // 1.1 항구: 얼음낚시 하루 스팟
  if (state.res.salt == null) state.res.salt = 0;               // 1.1 항구: 신규 자원 소금 (구세이브)
  if (state.subwayHub == null) state.subwayHub = false;         // 1.2 지하: 허브 승격 (구세이브 → 미승격)
  if (state.subwayOpen == null || typeof state.subwayOpen !== 'object') state.subwayOpen = {}; // 1.2 지하: 개통 구간 맵
  if (state.mushroomWaterTimer == null) state.mushroomWaterTimer = 0; // 1.2 지하: 버섯 물 카운터
  if (state.marketToday == null) state.marketToday = 0;         // 1.2 지하: 암시장 하루 슬롯
  // 1.3 고원 (구세이브 → 미개방/미예보)
  if (state.cablecarDone == null) state.cablecarDone = false;
  if (state.observatoryDone == null) state.observatoryDone = false;
  if (state.avalancheForecast == null) state.avalancheForecast = 0;
  if (state.avalancheBlockUntil == null) state.avalancheBlockUntil = 0;
  if (state.sketches == null || typeof state.sketches !== 'object') state.sketches = {};
  if (state.nightSkyToday == null) state.nightSkyToday = 0;
  if (state.pendingSketchPopup === undefined) state.pendingSketchPopup = null;
  if (state.deco == null || typeof state.deco !== 'object') state.deco = {}; // #13 꾸미기
  // 1.4 금지 구역 (구세이브 → 미제작/미완공/미송출)
  if (state.hazmat === undefined) state.hazmat = null;
  if (state.hazmatDone == null) state.hazmatDone = false;
  if (state.radioBaseDone == null) state.radioBaseDone = false;
  if (state.broadcasts_sent == null || typeof state.broadcasts_sent !== 'object') state.broadcasts_sent = {};
  if (state.survivorLights == null) state.survivorLights = 0;
  if (state.doctorRegularSeen == null) state.doctorRegularSeen = false;
  if (state.doctorRadioRegularPending == null) state.doctorRadioRegularPending = false;
  if (rawState.questIdx === undefined) state.questIdx = (state.day > 1 || state.successes > 0) ? -1 : 0;
  if (!SHELTER_META[state.current]) state.current = 'container';
}
