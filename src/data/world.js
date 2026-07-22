/* ============================================================
   world.js — Nine Winters 세계 구역/지역 데이터 (콘텐츠 데이터 분리 Phase 1)
   ------------------------------------------------------------
   목적: 지도 구역(DISTRICTS)과 탐험 지역(REGIONS)의 "순수 수치·메타"를 분리.
         셸터(SHELTERS)의 3D 빌더(buildRoom/buildEnv)와 종이지도(MAP) 렌더는
         game.js에 그대로 둔다(Phase 2 대상) — 여기엔 값만.
   원칙: 순수 데이터 파일. 단, REGIONS.slum.pool 이 furniture.js의 DEFS 키 전체를
         참조하므로(원본 그대로) DEFS만 import한다. furniture.js는 world.js를
         import하지 않으므로 순환은 없다(data→data 단방향 허용).
         REGIONS[k].id 는 game.js가 로드 후 Object.entries 루프로 주입한다(원본 유지).
   출처: game.js DISTRICTS/REGIONS (원본 그대로 이동).
   ============================================================ */
import { DEFS } from './furniture.js';

// ---- 날씨 정의 (#73 Tier4: game.js에서 원본 그대로 이동 — 순수 데이터) ----
//   count/color/size/fall/sway = 파티클 렌더 파라미터(값만 — Points 생성은 game.js 잔류).
export const WEATHERS = {
  clear: { name: '맑음', nameEn: 'Clear', icon: '', penalty: 0 },
  snow:  { name: '눈',   nameEn: 'Snow', icon: '', penalty: 0.15, count: 850, color: 0xdde8f0, size: 3, fall: 1.6, sway: 0.7 },
  rain:  { name: '비',   nameEn: 'Rain', icon: '', penalty: 0.10, count: 1100, color: 0x8fa8c8, size: 2, fall: 10, sway: 0.12 },
  ash:   { name: '재',   nameEn: 'Ash', icon: '', penalty: 0.05, count: 380, color: 0x9a938a, size: 2.5, fall: 0.45, sway: 1.3 },
  storm: { name: '폭우', nameEn: 'Downpour', icon: '', penalty: 0.2, count: 2200, color: 0x7e97b8, size: 2, fall: 14, sway: 0.2 },
};

/* 2.0-α (§9.8.1): 도시 = 구역 위 파생 태그 1층. 저장하지 않는다(state.current에서 매번 파생) —
   구 §9.8이 지목한 currentCity 세이브 대변경을 파생으로 회피. 명칭은 가칭(디렉터 미결 §9.9-1) —
   id는 엔지니어링 태그라 표시명이 바뀌어도 세이브·코드 불변. */
export const CITIES = {
  home: { name: '첫 도시', nameEn: 'First City', emoji: '' },         // 잿빛 외곽~금지 구역 — 본편 지도 전체(불변)
  east: { name: '동부 항구도시', nameEn: 'Eastern Port City', emoji: '' }, // 세관 너머 신영토(부산형, 가칭) — 본편의 2편
};
export const CITY_OF = {}; // districtId → cityId 역인덱스 (아래 DISTRICTS의 city 태그에서 파생)

export const DISTRICTS = {
  outskirts: {
    city: 'home',
    name: '잿빛 외곽', nameEn: 'Ashen Outskirts', emoji: '', shelters: ['container', 'bus'],
    desc: '도시 밖 황무지. 고속도로가 지나가 이동이 편하다.',
    descEn: 'Wasteland beyond the city. A highway runs through, making travel easy.',
    regionBonus: { residential: 0.03 },
    bonusLabel: '주거지역 접근성 +3%p', bonusLabelEn: 'Residential access +3%p',
  },
  city: {
    city: 'home',
    name: '무너진 도심', nameEn: 'Fallen Downtown', emoji: '', shelters: ['rooftop', 'subway'],
    desc: '폐허가 된 시가지. 위험하지만 물자가 몰려 있다.',
    descEn: 'A ruined city center. Dangerous, but supplies are dense here.',
    regionBonus: { commercial: 0.05, slum: 0.05 },
    bonusLabel: '상업지구·슬럼가 접근성 +5%p', bonusLabelEn: 'Commercial & slum access +5%p',
  },
  meadow: {
    city: 'home',
    name: '초원 구릉지', nameEn: 'Meadow Hills', emoji: '', shelters: ['bunker', 'greenhouse'],
    desc: '들풀이 무성한 벌판. 조용하고 흙이 살아있다.',
    descEn: 'A field thick with wild grass. Quiet, and the soil is alive.',
    regionBonus: { residential: 0.05 },
    bonusLabel: '주거지역 접근성 +5%p', bonusLabelEn: 'Residential access +5%p',
  },
  forest: {
    city: 'home',
    name: '숲과 산기슭', nameEn: 'Forest & Foothills', emoji: '', shelters: ['cabin'],
    desc: '침엽수림 가장자리. 폐허에서 가장 먼 안식처.',
    descEn: 'The edge of a conifer forest. The refuge farthest from the ruins.',
    regionBonus: { industrial: 0.05 },
    bonusLabel: '공업지대 접근성 +5%p', bonusLabelEn: 'Industrial access +5%p',
  },
  coast: {
    city: 'home',
    name: '잿빛 해안', nameEn: 'Ashen Coast', emoji: '', shelters: ['ship', 'lighthouse'],
    desc: '안개 낀 바닷가. 바다가 주는 것과 빼앗는 것이 있다.',
    descEn: 'A fog-wrapped shore. The sea gives, and the sea takes.',
    regionBonus: { slum: 0.05 },
    bonusLabel: '슬럼가 접근성 +5%p', bonusLabelEn: 'Slum access +5%p',
  },
  // 1.1 「얼어붙은 항구」 — 강 하구를 따라 내려간 얼어붙은 항구. 예인선/관제탑 셸터가 이 구역.
  harbor: {
    city: 'home',
    name: '얼어붙은 항구', nameEn: 'Frozen Harbor', emoji: '', shelters: ['tugboat', 'controltower'],
    desc: '강 하구의 죽은 항만. 바다는 얼었어도 죽지 않았다.',
    descEn: 'A dead port at the river mouth. The sea is frozen, but not dead.',
    regionBonus: { harborYard: 0.05, fishMarket: 0.05 },
    bonusLabel: '항구 지역 접근성 +5%p', bonusLabelEn: 'Harbor region access +5%p',
  },
  // 1.3 「고요한 고원」 — 산 위로 올라간 고원. 스키 로지 셸터가 이 구역. 겨울 접근성이 나쁜 대신 보상이 좋다.
  highland: {
    city: 'home',
    name: '고요한 고원', nameEn: 'Silent Highland', emoji: '', shelters: ['lodge'],
    desc: '구름 위로 솟은 고원. 겨울이 더 혹독한 만큼, 남은 것도 더 값지다.',
    descEn: 'A plateau above the clouds. The winters bite harder here, and what remains is worth more for it.',
    regionBonus: { resort: 0.05 },
    bonusLabel: '리조트 폐허 접근성 +5%p', bonusLabelEn: 'Resort ruins access +5%p',
  },
  // 1.4 「금지 구역」 — 군이 마지막으로 지킨 곳. 전용 거주 셸터는 없다(어느 거처에서든 방호복으로 닿는 원정지).
  //   지도 상의 구역으로만 존재 — 검문소·연구동 지역이 여기 속한다. districtOf는 셸터로 판정하므로
  //   이 구역은 shelters:[] (거주 불가). 지역 접근성 보너스는 없음(금지 구역엔 우대가 없다).
  research: {
    city: 'home',
    name: '금지 구역', nameEn: 'Forbidden Zone', emoji: '', shelters: [],
    desc: '군이 마지막까지 봉쇄한 폭심지. 방호복 없이는 한 걸음도 들일 수 없다.',
    descEn: 'The blast core the army sealed to the last. Without a hazmat suit, not one step in.',
    regionBonus: {},
    bonusLabel: '', bonusLabelEn: '',
  },
  // ── 2.0-(c) 동부 신영토 4구역 (GD-2.0 §6.0.5 확정 로스터: 앵커 4 × 파밍 2) ──
  //   진행 축: 세관 == 다리(진입 층위) → 역 → 펜트하우스(도심 코어). 구역 분해로 이주 cross 비용도
  //   이 진행을 따른다(심부로 갈수록 짐이 무겁다). 구 eastcity 단일 구역은 여기서 4분할 — 세이브 무영향
  //   (구역은 셸터에서 파생, 저장 안 함).
  eastgate: {
    city: 'east',
    name: '동부 관문', nameEn: 'Eastern Gate', emoji: '', shelters: ['customs'],
    desc: '국경 검문소 너머, 동쪽 대도시의 문턱. 3년 만에 다시 열린 길이다.',
    descEn: 'Past the border checkpoint, the threshold of the eastern metropolis. The road has been shut for three years.',
    regionBonus: { customsyard: 0.05, containerport: 0.05 },
    bonusLabel: '세관·항만 접근성 +5%p', bonusLabelEn: 'Customs & port access +5%p',
  },
  eastbridge: {
    city: 'east',
    name: '다리 어귀', nameEn: 'Bridge Mouth', emoji: '', shelters: ['bridgehouse'],
    desc: '무너진 현수교 아래 강변. 끊긴 고속도로가 하늘에 걸려 있다.',
    descEn: 'The riverside beneath a fallen suspension bridge. A severed highway hangs in the sky.',
    regionBonus: { interchange: 0.05, uptown: 0.05 },
    bonusLabel: '인터체인지·주거단지 접근성 +5%p', bonusLabelEn: 'Interchange & uptown access +5%p',
  },
  eaststation: {
    city: 'east',
    name: '중앙역 일대', nameEn: 'Central Station', emoji: '', shelters: ['terminal'],
    desc: '거대한 아치 지붕의 역. 떠나지 못한 여행이 승강장마다 멈춰 있다.',
    descEn: 'A station under a vast arched roof. On every platform, a journey that never left.',
    regionBonus: { grandplatform: 0.05, outpost: 0.05 },
    bonusLabel: '승강장·아웃포스트 접근성 +5%p', bonusLabelEn: 'Platform & outpost access +5%p',
  },
  eastcore: {
    city: 'east',
    name: '마천루 심부', nameEn: 'Skyscraper Core', emoji: '', shelters: ['penthouse'],
    desc: '고성 첨탑처럼 둘러선 마천루의 한가운데. 도시의 가장 높은 침묵.',
    descEn: 'The heart of skyscrapers ringed like castle spires. The city\'s highest silence.',
    regionBonus: { megamall: 0.05, deptstore: 0.05 },
    bonusLabel: '상가·백화점 접근성 +5%p', bonusLabelEn: 'Mall & department store access +5%p',
  },
};

// 2.0-α: CITY_OF 역인덱스 채움 — 태그 누락 구역은 home 폴백(신규 구역 추가 시 안전값)
for (const [did, d] of Object.entries(DISTRICTS)) CITY_OF[did] = d.city || 'home';

export const REGIONS = {
  residential: {
    name: '주거지역', nameEn: 'Residential', emoji: '', rate: 0.8, time: 20,
    pool: ['bed', 'chair', 'rug', 'dresser', 'candle', 'cushion', 'bookstack'], furnChance: 0.02,
    desc: '음식·물·천·양초 · 생활 가구', descEn: 'Food, water, cloth, candles · household furniture', risk: '낮음', riskEn: 'Low',
    // Phase B: 주거지역 food/water 소폭 하향(max -1) — "주거 단일 최적해" 해소
    // v1.2.0 경제 캘리브레이션: 신선식량 획득 손맛 상향(2,2→3,4) + 통조림 드랍확률 트림(0.6→0.45).
    lootRes: [['food', 4, 5], ['canned', 1, 2, 0.45], ['cloth', 1, 1], ['candle', 1, 1], ['water', 2, 2], ['bandage', 1, 1, 0.25]],
    injuries: ['minor'],
  },
  commercial: {
    name: '상업지구', nameEn: 'Commercial', emoji: '', rate: 0.6, time: 35,
    pool: ['sofa', 'table', 'bookshelf', 'radio', 'plant', 'fridge', 'teatable', 'clock', 'lantern'], furnChance: 0.02,
    desc: '배터리·의약품 · 상점 가구', descEn: 'Batteries, medicine · store furniture', risk: '보통', riskEn: 'Medium',
    // Phase B: 배터리/의약 특화 상향 (배터리 확정 1 + 의약 확률/양 상향)
    // v1.2.0: 통조림 드랍확률 트림(0.6→0.45).
    lootRes: [['battery', 1, 2], ['parts', 1, 1], ['canned', 1, 1, 0.45], ['water', 1, 1], ['antiseptic', 1, 1, 0.35], ['painkiller', 1, 1, 0.3]],
    injuries: ['minor', 'minor', 'sprain'],
  },
  industrial: {
    name: '공업지대', nameEn: 'Industrial', emoji: '', rate: 0.4, time: 50,
    pool: ['lamp', 'crate', 'radio', 'dresser', 'purifier', 'generator', 'stove'], furnChance: 0.01,
    desc: '부품·건축재·연료', descEn: 'Parts, building material, fuel', risk: '높음 — 장갑 권장', riskEn: 'High — gloves advised',
    // Phase B: parts/fuel 상향 + fuel 확정 1 보장 (parts/fuel 공급 목적성)
    // 디렉터(2026-07-08): 배터리 보조 소스 — 발전기·설비의 땅이라 공업 정합(주 소스는 상업 확정 1~2 유지)
    lootRes: [['parts', 2, 4], ['material', 2, 3], ['fuel', 2, 3], ['battery', 1, 1, 0.5]],
    injuries: ['deep', 'deep', 'sprain'],
  },
  slum: {
    name: '슬럼가', nameEn: 'Slums', emoji: '', rate: 0.25, time: 70,
    pool: Object.keys(DEFS), furnChance: 0.03,
    desc: '뭐든 나올 수 있다 · 희귀 가구', descEn: 'Anything might turn up · rare furniture', risk: '매우 높음 — 응급키트 권장', riskEn: 'Very high — first-aid kit advised',
    lootRes: [['parts', 2, 2], ['cloth', 2, 2], ['painkiller', 1, 1, 0.15], ['antiseptic', 1, 1, 0.15]],
    injuries: ['deep', 'sprain', 'infection'],
  },
  // #167 지역 2겹화 파일럿: 슬럼의 속 — 겉(슬럼 숙련 1)을 아는 사람에게만 열리는 안쪽 골목.
  //   신규 UI 개념 0: 지도 핀·탐험·숙련·컨디션 문법 전부 재사용. 기본율은 표층보다 낮고(제 숙련을
  //   따로 쌓는다), 전리품 플로어는 더 높다 — 아무도 못 턴 방들. 무너짐(#165)이 잦다(riskDeepMul).
  slumdeep: {
    name: '뒷골목 심부', nameEn: 'Back-Alley Depths', emoji: '', rate: 0.22, time: 85,
    pool: Object.keys(DEFS), furnChance: 0.05,
    desc: '슬럼의 안쪽 · 아무도 못 턴 방들', descEn: 'The inside of the slums · rooms no one has looted', risk: '극도로 높음 — 무너짐이 잦다', riskEn: 'Extreme — collapses are frequent',
    lootRes: [['parts', 2, 3], ['cloth', 2, 3], ['material', 1, 2], ['painkiller', 1, 1, 0.25], ['antiseptic', 1, 1, 0.25], ['canned', 1, 1, 0.2]],
    injuries: ['deep', 'infection'],
  },
  // ── 1.1 항구 지역 2종 (harbor 해금 = 항구 셸터 해금 이후. 지도 마커 항구 구역) ──
  harborYard: {
    name: '항만 야적장', nameEn: 'Harbor Yard', emoji: '', rate: 0.5, time: 45,
    pool: ['crate', 'dresser', 'radio', 'lamp', 'clock'], furnChance: 0.02,
    desc: '컨테이너 화물 · 오늘 바다가 준 것', descEn: 'Container cargo · what the sea gave today', risk: '보통', riskEn: 'Medium',
    // 랜덤 편중 드랍: 매일 1종이 부스트됨(rollRes의 yardBoost 훅). 기본은 얕고 넓게.
    lootRes: [['cloth', 1, 2], ['parts', 1, 2], ['material', 1, 2], ['salt', 1, 1, 0.5], ['canned', 1, 1, 0.3]],
    injuries: ['minor', 'sprain'],
    harborYard: true, // rollRes 일일 부스트 표식
  },
  fishMarket: {
    name: '수산시장 폐허', nameEn: 'Fish Market Ruins', emoji: '', rate: 0.7, time: 35,
    pool: ['crate', 'table', 'clock'], furnChance: 0.01,
    desc: '신선식품 · 소금 산지 (겨울엔 결빙)', descEn: 'Fresh food · salt source (frozen in winter)', risk: '낮음', riskEn: 'Low',
    lootRes: [['food', 4, 6], ['salt', 1, 2], ['water', 1, 1], ['canned', 1, 1, 0.3]],
    injuries: ['minor'],
    fishMarket: true, // 겨울 결빙 드랍 절반 표식
  },
  // ── 1.3 고원 지역: 리조트 폐허 (highland 해금 = 로지 셸터 해금 이후. 고위험·고보상 호텔 물자) ──
  //   먼 거리(고원)라 소요·위험이 크지만 전리품 양이 넓다. 겨울엔 눈사태 리스크가 얹힌다(예보→우회).
  resort: {
    name: '리조트 폐허', nameEn: 'Resort Ruins', emoji: '', rate: 0.4, time: 60,
    pool: ['sofa', 'bed', 'teatable', 'clock', 'lantern', 'bookshelf', 'plant'], furnChance: 0.03,
    desc: '산정 호텔의 잔해 · 두둑한 물자 (겨울엔 눈사태 위험)', descEn: 'Ruins of a summit hotel · rich supplies (avalanche risk in winter)', risk: '높음 — 응급키트 권장', riskEn: 'High — first-aid kit advised',
    lootRes: [['canned', 2, 3], ['cloth', 2, 3], ['fuel', 1, 2], ['battery', 1, 2], ['parts', 1, 2], ['painkiller', 1, 1, 0.3]],
    injuries: ['deep', 'sprain', 'minor'],
    resort: true, // 고원 지역 표식 (눈사태 판정 대상)
  },
  // ── 1.4 금지 구역 2단 진입 구조 (research 구역. 방호복 필수) ──
  //   ① 격리 검문소(중위험) — 첫 관문. 여기까지는 방호복 없이 닿을 수 없다(startExpedition 게이트).
  //   ② 지하 연구동(고위험) — 폭심지 폐허. 희귀부품 최다 + 기밀 문서(research 메모) 본진.
  //   두 지역 모두 forbidden:true — 방호복 미착용 차단·내구 소모 판정 대상.
  checkpoint: {
    name: '격리 검문소', nameEn: 'Quarantine Checkpoint', emoji: '', rate: 0.5, time: 55,
    pool: ['crate', 'dresser', 'lamp', 'clock', 'radio'], furnChance: 0.02,
    desc: '봉쇄선의 첫 관문 · 부품·건축재 (방호복 필수)', descEn: 'The first gate of the cordon · parts, material (hazmat required)', risk: '보통 — 방호복 필수', riskEn: 'Medium — hazmat required',
    lootRes: [['parts', 2, 3], ['material', 1, 2], ['battery', 1, 1], ['cloth', 1, 2], ['canned', 1, 1, 0.3]],
    injuries: ['minor', 'sprain'],
    forbidden: true, // 방호복 게이트·내구 소모 대상
  },
  lab: {
    name: '지하 연구동', nameEn: 'Underground Lab', emoji: '', rate: 0.35, time: 70,
    pool: ['bookshelf', 'crate', 'lamp', 'clock', 'radio', 'generator'], furnChance: 0.02,
    desc: '폭심지 연구소 폐허 · 희귀부품 최다 · 세상의 답이 있는 곳 (방호복 필수)', descEn: 'Ruins of the ground-zero lab · richest in rare parts · where the world’s answer lies (hazmat required)', risk: '매우 높음 — 방호복 필수', riskEn: 'Very high — hazmat required',
    lootRes: [['parts', 3, 5], ['material', 1, 2], ['battery', 1, 2], ['fuel', 1, 1]],
    injuries: ['deep', 'infection', 'sprain'],
    forbidden: true, // 방호복 게이트·내구 소모 대상
  },
  // ── 2.0 「응답」 도심 중심지 (GD-2.0 §2~3) — 낙진 시계 게이트: 겨울 셋을 넘긴 뒤(state.winters>=BAL.forbidden.falloutWinters)에만 노출 ──
  //   봉쇄선 너머 수도의 심장. 최상위 지역이되 "부품 더"가 아니라 질적 차별(책 뭉치·의약 정점·사치 가구 — REWARD-LOOP 교훈).
  //   forbidden 아님(낙진이 걷힌 뒤에만 열리므로 방호복 게이트 불요) — 대신 최장 소요·최고 부상 위험.
  citycore: {
    name: '도심 중심지', nameEn: 'City Core', emoji: '', rate: 0.3, time: 80,
    pool: ['bookshelf', 'sofa', 'teatable', 'clock', 'radio', 'lantern', 'plant', 'fridge'], furnChance: 0.04,
    desc: '수도의 심장 · 책 뭉치·의약 정점·희귀부품 (낙진이 걷힌 뒤에만)', descEn: 'The capital’s heart · book caches, peak meds, rare parts (only after the fallout clears)', risk: '매우 높음 — 응급키트 권장', riskEn: 'Very high — first-aid kit advised',
    lootRes: [['parts', 3, 5], ['book', 1, 2, 0.6], ['painkiller', 1, 1, 0.4], ['antiseptic', 1, 1, 0.4], ['battery', 1, 2], ['canned', 1, 2, 0.4]],
    injuries: ['deep', 'infection', 'sprain'],
  },
  /* ── 2.0-(c) 동부 신영토 파밍 8종 (GD-2.0 §6.0.5 로스터 — 구역당 2) ──
     해금: 전부 eastGateOpen(관문 「국경 길」 완공) — regionUnlocked의 city:'east' 일괄 게이트.
     rate·전리품은 Fable 초안(§6.0.5 "Fable 초안 → 디렉터 컨펌") — 후반 진입지라 홈 도시보다 전리품
     플로어를 높게, 질적 차별(REWARD-LOOP: '부품 더'가 아니라 지역마다 다른 이유)을 우선했다.
     진행 축 반영: 관문·다리(진입 층위) > 역 > 마천루 심부 순으로 소요·위험이 깊어진다. */
  customsyard: {
    city: 'east',
    name: '세관 압류창고', nameEn: 'Customs Impound', emoji: '', rate: 0.5, time: 45,
    pool: ['crate', 'dresser', 'clock', 'radio', 'lamp'], furnChance: 0.03,
    desc: '통관을 못 넘은 화물의 무덤 · 뭐가 나올지 모른다', descEn: 'A graveyard of cargo that never cleared customs · anything could surface', risk: '보통', riskEn: 'Medium',
    lootRes: [['canned', 1, 2], ['battery', 1, 2], ['cloth', 1, 2], ['parts', 1, 2], ['book', 1, 1, 0.25]],
    injuries: ['minor', 'sprain'],
  },
  containerport: {
    city: 'east',
    name: '컨테이너항', nameEn: 'Container Port', emoji: '', rate: 0.4, time: 60,
    pool: ['crate', 'lamp', 'generator', 'purifier'], furnChance: 0.02,
    desc: '컨테이너의 바다 · 건축재·부품의 광맥', descEn: 'A sea of containers · a vein of material and parts', risk: '높음 — 장갑 권장', riskEn: 'High — gloves advised',
    lootRes: [['material', 2, 4], ['parts', 2, 3], ['fuel', 1, 2], ['salt', 1, 1, 0.4]],
    injuries: ['deep', 'sprain'],
  },
  interchange: {
    city: 'east',
    name: '인터체인지', nameEn: 'Interchange', emoji: '', rate: 0.5, time: 50,
    pool: ['crate', 'lamp', 'radio', 'generator'], furnChance: 0.02,
    desc: '고가 위에 멈춘 차들 · 연료·부품 회수', descEn: 'Cars stalled on the overpass · fuel and parts salvage', risk: '보통', riskEn: 'Medium',
    lootRes: [['fuel', 2, 3], ['parts', 2, 3], ['battery', 1, 1, 0.5], ['material', 1, 2]],
    injuries: ['minor', 'sprain', 'deep'],
  },
  uptown: {
    city: 'east',
    name: '고급 주거단지', nameEn: 'Uptown Residences', emoji: '', rate: 0.55, time: 45,
    pool: ['bed', 'sofa', 'rug', 'dresser', 'cushion', 'teatable', 'plant'], furnChance: 0.04,
    desc: '강변의 부촌 · 좋은 살림과 좋은 찬장', descEn: 'Riverside wealth · fine households, fine pantries', risk: '낮음', riskEn: 'Low',
    lootRes: [['food', 3, 4], ['canned', 1, 2], ['cloth', 1, 2], ['painkiller', 1, 1, 0.35], ['candle', 1, 1, 0.5]],
    injuries: ['minor'],
  },
  grandplatform: {
    city: 'east',
    name: '대승강장', nameEn: 'Grand Platform', emoji: '', rate: 0.45, time: 55,
    pool: ['chair', 'table', 'clock', 'radio', 'bookstack', 'lantern'], furnChance: 0.03,
    desc: '떠나지 못한 기차와 짐가방들 · 매점과 대합실', descEn: 'Trains that never left, luggage that stayed · kiosks and waiting halls', risk: '보통', riskEn: 'Medium',
    lootRes: [['canned', 2, 3], ['water', 2, 3], ['cloth', 1, 2], ['book', 1, 1, 0.4], ['candle', 1, 1]],
    injuries: ['minor', 'sprain'],
  },
  outpost: {
    city: 'east',
    name: '군사 아웃포스트', nameEn: 'Military Outpost', emoji: '', rate: 0.3, time: 70,
    pool: ['crate', 'lamp', 'generator', 'radio', 'stove'], furnChance: 0.02,
    desc: '역을 지키던 부대의 마지막 진지 · 최상급 부품·의약', descEn: 'The last position of the unit that held the station · top-grade parts and meds', risk: '매우 높음 — 응급키트 권장', riskEn: 'Very high — first-aid kit advised',
    lootRes: [['parts', 3, 5], ['battery', 1, 2], ['fuel', 1, 2], ['painkiller', 1, 1, 0.4], ['antiseptic', 1, 1, 0.4], ['bandage', 1, 1, 0.5]],
    injuries: ['deep', 'infection', 'sprain'],
  },
  megamall: {
    city: 'east',
    name: '거대상가', nameEn: 'Grand Arcade', emoji: '', rate: 0.45, time: 55,
    pool: ['sofa', 'table', 'clock', 'plant', 'fridge', 'teatable', 'lantern'], furnChance: 0.04,
    desc: '몇 블록째 이어지는 아케이드 · 잡화의 바다', descEn: 'An arcade running block after block · a sea of goods', risk: '보통', riskEn: 'Medium',
    lootRes: [['canned', 2, 3], ['cloth', 2, 3], ['battery', 1, 1, 0.6], ['candle', 1, 1], ['book', 1, 1, 0.3]],
    injuries: ['minor', 'minor', 'sprain'],
  },
  deptstore: {
    city: 'east',
    name: '백화점', nameEn: 'Department Store', emoji: '', rate: 0.4, time: 60,
    pool: ['dresser', 'clock', 'lamp', 'rug', 'cushion', 'bookshelf'], furnChance: 0.05,
    desc: '마천루 아래 사치의 전당 · 천·사치 가구 정점', descEn: 'A palace of luxury beneath the towers · peak cloth and fine furniture', risk: '높음 — 응급키트 권장', riskEn: 'High — first-aid kit advised',
    lootRes: [['cloth', 3, 4], ['canned', 1, 2], ['book', 1, 1, 0.4], ['painkiller', 1, 1, 0.3], ['battery', 1, 1, 0.5]],
    injuries: ['sprain', 'deep'],
  },
};
