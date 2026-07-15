/* ============================================================
   core/state.js — 공유 가변 런타임 상태 (game.js 모놀리스 분해 Phase 1)
   ------------------------------------------------------------
   목적: 온 게임이 참조하는 단일 가변 상태(state/opts)를 한 곳으로 모아
         "무엇이 세이브되고 무엇이 런타임 설정인지"를 명시하고,
         순수 로직 모듈(경제·세이브 등)이 game.js 없이 이 상태만 import하게 한다.
   원칙: import 0개(순수 리터럴) — 순환 의존 불가능. state/opts는 const(항상 in-place 변경,
         재할당 없음)라 모듈 경계를 넘어도 동일 참조가 유지된다(loadSave는 Object.assign).
   ============================================================ */

// ── 세이브되는 게임 상태 (새 게임 초기값) ──
export const state = {
  ver: 3,
  current: 'container',
  successes: 0,
  inventory: { bed: 1, rug: 1, candle: 1 },
  // 초기 자원 (기획서 밸런싱 권장값)
  res: { food: 2, canned: 2, water: 3, cloth: 2, bandage: 1, antiseptic: 0, painkiller: 0, candle: 2, battery: 1, fuel: 0, parts: 0, material: 0, salt: 0 },
  layouts: { container: [{ d: 'crate', c: 1, x: 2.5, z: -0.75, r: 0 }], bunker: [], rooftop: [], cabin: [] },
  exp: null,             // { region, end(실시간ms), rate, prep:[] }
  injury: null,          // { type, untilMin, }
  gameMin: 8 * 60,       // Day 1, 08:00 시작
  day: 1,
  savedAt: Date.now(),
  weatherType: 'clear',
  weatherUntil: 0,       // gameMin 기준
  cleanBy: { container: 70, bunker: 70, rooftop: 70, cabin: 70 },
  renovated: { container: true },   // 정비를 마친 셸터 (최초 입주 시 자원 소요)
  hunger: 80,   // 배고픔 (0=탈진)
  thirst: 80,   // 갈증 (0=탈진)
  energy: 100,  // 에너지 — 탐험/노동으로 소모, 취침으로 회복
  expToday: 0,  // 오늘 탐험 횟수 (하루 5회 제한)
  expFatigue: null, // #88 탐험 피로: 한도 소진일(day). 자면 해소 — 밤샘 취침 페널티 가중(강제 정산 대체)
  expFailStreak: 0, // 연속 탐험 실패 횟수 (성공률 체감 보정 pity용, 캡3)
  upkeepOk: true,
  dayLog: { gain: {}, spend: {}, notes: [] },
  helpSeen: false,
  stats: { exp: 0, success: 0 },
  buff: null,          // 인카운터 버프 { exp?:+0.1, loot?:2, label }
  pendingEvent: null,  // 표시 대기 중인 인카운터 id
  lastEventDay: 0,
  mods: {},            // 거처 개조 { shelterId: [modId] }
  knowledge: [],       // 「지식」 테크트리(§9): 해금한 노드 id 배열. 영구·전 셸터.
  deco: {},            // 꾸미기(#13): 셸터별 벽지/바닥재 { shelterId: { wall:id, floor:id } }
  stayDays: 0,         // 현재 거처 연속 거주일 (정든 집 보너스)
  cat: 0,              // 고양이 입양 여부 (Day 9+ 인카운터)
  catCoat: 'tabby',    // 고양이 코트(입양 시 랜덤: tabby/black/siamese/ragdoll). 구세이브=tabby 폴백.
  catMusicDay: 0,      // 고양이 인카운터가 뜬 날 — 그날은 Cat OST만 재생
  catEventSeen: false, // 고양이 인카운터가 이미 한 번 등장했는지 (거절해도 재등장 없음)
  catHungry: false,    // 유지비(3일마다 음식1)를 내지 못해 쾌적 보너스가 정지된 상태
  endingSeen: false,   // Day 10000 엔딩 감상 여부
  tutDay: 0,           // 신규 게임 첫 3일 튜토리얼 진행 단계 (0~3)
  tipsSeen: {},        // 찢어진 쪽지(1회성 팁) 열람 여부 { 'tip.rain': true, ... }
  pendingTutorial: null, // 표시 대기 중인 튜토리얼 수첩 페이지 단계 (day-report 뒤로 미룸)
  questIdx: 0,         // 퀘스트 체인 진행 인덱스 (QUESTS 배열 기준, -1=비활성/완료, QUESTS.length=전체 완료)
  mode: 'normal',      // 난이도 모드 'normal' | 'hard' (하드: 전리품 -30% · 게이지 소모 +50%)
  coldSnap: null,      // 한파 진행 상태 { until:day, severity } — 겨울 보스 이벤트 (Phase B)
  coldSnapForecast: 0, // 한파 발동 예정일 (day). 0=예보 없음. 예보 리드타임 동안 브리핑에 표시
  coldSnapsThisWinter: 0, // 이번 겨울 한파 발동 횟수 (겨울당 상한 제한용)
  coldSnapWinterKey: -1,  // 카운터가 속한 겨울 식별자 (계절 인덱스). 겨울이 바뀌면 리셋
  // ── 2.0 대한파 프론트 (GD-2.0 §9.4-③) ──
  frontWinterKey: -1,     // 이번 겨울 대한파를 이미 발령했는가 (계절 인덱스 — 겨울당 1회 확정)
  front: null,            // 진행 중 대한파 부속 { discipline:'ration'|'sleepless'|'emergency'|'none'|null } — null=하드 선택 대기(모달), 노말은 발동 즉시 'none'
  // ── 2.0 부상 서사화 (GD-2.0 §9.4-④) ──
  scars: [],              // 아문 부상의 기록 [{t:부상id, d:day}] — memoir 흉터 라인의 재료. 서사 전용(경제 무관), 상한 50
  // ── 2.0 총 (GD-2.0 §9.3 — 하드코어 도심 중심지 로드아웃) ──
  gun: null,              // { dur } — 조우 격퇴 1회당 1발 소모. null=미보유. 도심 중심지 파밍 드랍, 제작대 정비(방호복 문법)
  // ── 2.0 엔딩 3분기 (GD-2.0 §5·§9.5 — 탈출/신세계/안식) ──
  endingType: null,       // 선택한 엔딩 'escape'|'newworld'|'rest'|null. 시퀀스 후에도 런은 계속(방치형 정체성 — 엔딩은 서사 마침표)
  endingChoicePending: false, // 9겨울 구조 인카운터 예약 (passWinter가 세움 → 밤에 발화. '보류' 선택 시 다음 봄 재예약)
  earlyRescueDay: 0,      // 조기 탈출 제안일 (박사 정기 교신 +7일 확정 예약. 0=없음. 1회만 — 보류하면 9겨울에 다시)
  // ── 2.0 히든 루트 「침묵」 (GD-2.0 §5.1·§9.6 — UI 힌트 0, 커뮤니티 발견 콘텐츠) ──
  subwayHidden: false,    // 승강장 히든 지점(왼쪽 터널 개구부) 더블탭으로 통로 발견 — 발견 즉시 역사 조명이 붉은 비상등만으로(디렉터 확정)
  hiddenGateDone: false,  // 개척 대형 프로젝트(hiddenGate) 완공 — 사다리 등장, "네 번째 문"
  hiddenReachPending: false, // 개척 완공 후 첫 밤 박사 대면 인카운터 예약
  hiddenReached: false,   // 연구소 도달·선택 유보 — 이후 사다리 터치로 박사의 문서 열람
  siloFired: false,       // 사일로 버튼을 눌렀다 — 내부 전용(수첩·기록·업적 어디에도 안 씀. 완전 무기록 = 디렉터 확정). 재발화 방지만
  // ── 도료 (REWARD-LOOP ② — 디렉터 확정 2026-07-08) ──
  paints: {},             // 보유 도료 { 계열id: 통 수 } — 1통=1회 도색(소모품). 기본색은 도료 불요
  dyeOffer: null,         // 염료 상인 오퍼 [계열id ×3] — 슬럼 조우 시 세팅, 인카운터 본문·구매가 읽는다
  bagDur: 0,              // DDD-3 내구성 가방 — 남은 내구(0=미보유). 소지만 하면 자동 적용, 발동 시 1 마모
  blueprints: {},         // DDD-4 시그니처 도면 { 가구id: 1 } — 보유해야 제작 목록에 뜬다(지역 독점)
  sights: {},             // 비네트 「본 광경」 { id: 본 횟수 } — 발코니 조망 등 (2.0 동부)
  // ── Nine Winters 엔드게임 마일스톤 (#11) ──
  winters: 0,          // 넘긴 겨울 수 (봄으로 넘어가는 날 +1). 제목이 곧 장기 목표.
  demoEnded: false,    // #74 데모 빌드 전용: (구) 첫 겨울 통과로 데모가 끝난 세이브. 재설계 후 demoPhase 브리지로만 참조 (정식 빌드에선 항상 false)
  demoPhase: 'pre-credits', // #74 재설계: 데모 아크 단계 — 'pre-credits'(3지역 본편) → 'sandbox'(첫눈 크레딧 후 4계절 무한). 정식 빌드 무관.
  firstSnowSeen: false, // #74 재설계: 첫 겨울 '첫눈' 1회 감지 플래그 (크레딧 1회 트리거 게이트, 재입장 재발화 방지)
  winterSnap: null,    // 현재/직전 겨울 시작 시점 스냅샷 (memoir 차분 계산용)
  pendingWinterMemoir: [], // 표시 대기 중인 "그 해 겨울" 수첩 페이지 큐 (봄 첫 아침 보고 뒤로 미룸)
  doctorRadioPending: false, // 9겨울 마일스톤 후 박사 무전 대기 (라디오 미보유 시 다음 배치까지 보류)
  // ── Phase D (#12 · #35 · #36) ──
  evHistory: [],          // 최근 인카운터 발화 이력 [{id,day}] — 반복 억제(REQ-EVT-02)
  moodBuff: null,         // 인카운터 안정감 여운 { amt, until:day } — comfort 일시 가감
  memos: {},              // 수집한 세계관 메모/유서 { id: 수집일 } (#35)
  broadcasts: {},         // 수집한 라디오 방송 { id: 수집일 } (#12)
  distantLight: null,     // 먼 불빛 목격 기록 { count, lastDay, places:{} } (REQ-EVT-03)
  pendingMemoPopup: null, // 결산 뒤 열 메모 팝업 { id, will }
  pendingBroadcast: null, // 결산 뒤 열 방송 모달 id
  lastBroadcastDay: 0,    // 방송 청취한 마지막 날 (하루 1회 제한)
  pipeFrozenUntil: 0,     // 수도관 동파 방치 시 정수기 정지 기한 (day)
  bunkerRoof: 'hole',     // 돔 벙커 천장 상태: 'hole'(구멍)|'temp'(임시덮개)|'full'(완전수리) (#36)
  bunkerBackdoor: false,  // 절단기로 뒷문 저장고 개방 여부 (#36)
  hasCutter: false,       // 절단기 보유 (공업지대 드랍)
  rooftopSlate: 'gapped', // 옥탑 슬레이트 지붕: 'gapped'(2장 빠짐)|'full'(보수 완료) (#53)
  rooftopGardenStage: 0,  // 옥상 텃밭 성장 단계 0=새싹 1=줄기 2=결실 (겨울엔 휴면, 시각만) (#53)
  projects: {},           // 대형 프로젝트 진행 (1.1 ARC-02): { [id]: { stage, invested } }. 미착수 프로젝트는 키 없음.
  breakwaterHut: false,   // 1.1: 방파제 오두막 완공 여부 (항구 파밍 -25% + 얼음낚시 스팟 +1)
  icefishToday: 0,        // 1.1: 오늘 얼음낚시 횟수 (하루 스팟 제한)
  subwayHub: false,       // 1.2: 지하철 허브 승격 여부 (선로 복구·암시장 개방 게이트)
  subwayOpen: {},         // 1.2: 개통된 지하 노선 연결 지역 { [regionId]: true } (탐험 -50% + 폭설 봉쇄 예외)
  mushroomWaterTimer: 0,  // 1.2: 버섯 재배칸 물 소모 카운터 (mushroomWaterEvery일마다 물 1)
  marketToday: 0,         // 1.2: 오늘 암시장 교환 횟수 (하루 슬롯 제한)
  // ── 1.3 「고요한 고원」 ──
  cablecarDone: false,    // 1.3: 케이블카 복구 완공 (리조트 접근/탐험 시간 단축)
  observatoryDone: false, // 1.3: 관측소 완공 (맑은 밤 밤하늘 이벤트 개방)
  avalancheForecast: 0,   // 1.3: 눈사태 발령 예정일 (day). 0=예보 없음. 한파 예보 문법 재사용
  avalancheBlockUntil: 0, // 1.3: 미대비 눈사태로 리조트가 봉쇄된 기한 (day). 0=봉쇄 없음
  sketches: {},           // 1.3: 수집한 밤하늘 스케치 { id: 수집일 } (도감/기록 문법)
  nightSkyToday: 0,       // 1.3: 오늘 밤하늘 이벤트 발동 여부 (하루 1회 제한)
  pendingSketchPopup: null, // 1.3: 결산 닫은 뒤 열 스케치 팝업 id
  // ── 1.3.0 배치 D: 무력 상태 / 구제 / 끝난 기록 (GD-THESIS §4.5) ──
  rescueUsed: false,      // 이 런에서 1회 구제를 이미 받았는지 (노말/하드)
  runEnded: false,        // 런 종료(무력 두 번째 or 하드코어 무력) — 슬롯은 "끝난 기록"으로 보존, 이어하기 불가
  // ── 1.4 「금지 구역」 ──
  hazmat: null,           // 방호복 { dur } (제작 시 { dur: hazmatDur }). null=미제작. 금지 구역 진입 게이트+내구 소모.
  hazmatDone: false,      // 방호복을 한 번이라도 만든 적 있는가 (무전 기지 공사 노출 게이트 — 금지 구역에 닿았다는 증거)
  radioBaseDone: false,   // 1.4: 무전 기지 완공 (송출 행동 개방)
  broadcasts_sent: {},    // 1.4: 송출한 방송/기록 { id: 송출일 } — 지도 불빛 점등의 근거
  survivorLights: 0,      // 1.4: 종이 지도에 켜진 생존자 불빛 수 (송출 이력·수집률 비례로 갱신)
  doctorRegularSeen: false, // 1.4: 박사 정기 교신을 본 적 있는가 (모든 방송 송출 후 개방 — Day10000 다리)
  doctorRadioRegularPending: false, // 1.4: 정기 교신 발화 대기 (모든 수집물 송출 시 세워짐 → 밤 무전 1회)
};

// 새 게임용 초기 상태 스냅샷 (state에 함수 없음 전제 — 순수 JSON 복제)
export const DEFAULT_STATE = JSON.parse(JSON.stringify(state));

// ── 런타임 설정(세이브와 별개, opts 키로 별도 저장) ──
export const opts = { pixel: 3, quant: true, dither: true, ceil: true, autoEat: true, autoPlay: false, bgm: true, bgmVol: 0.15, sfxVol: 0.07, lang: 'ko', fpsCap: 60, lowSpec: false, bgIdle: true,
  // 렌더 품질: aa=MSAA 안티에일리어싱(도트 유지·엣지 매끄럽게) / ditherAmt=디더 도트 강도(0~1)
  aa: true, ditherAmt: 1,
  // 접근성 (REQ-ACC-01): 폰트 3단(1/1.12/1.25) · 색약 팔레트 · 흔들림/깜빡임 감소
  fontScale: 1, colorblind: false, reduceMotion: false,
  // 피드백 #2: 즉시 행동(먹기·마시기·청소) 확인창 — 기본 off(코지 무마찰 유지). 확인창 안에서 "다음부터 묻지 않기"로 끔.
  confirmActions: false };
// #52: 설정 창 [기본값] 버튼용 — 선언부 값의 스냅샷 (탭별 부분 복원)
export const OPTS_DEFAULT = { ...opts };

// 현재 셸터에 배치된 가구 인스턴스 배열 {defId,colorIdx,x,z,rot,on,y,group,support}.
//   세이브 시 state.layouts[shelter]로 직렬화(doSaveNow) — 여기 배열은 런타임 라이브(각 항목 .group=THREE 메시).
//   itemsRoot(THREE.Group) 등 렌더 컨테이너는 game.js에 잔류. const라 모듈 경계 넘어도 동일 참조.
export const items = [];

