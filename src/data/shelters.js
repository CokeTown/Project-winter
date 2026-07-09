/* ============================================================
   data/shelters.js — 셸터 데이터 필드 (game.js SHELTERS 분리 Phase 1)
   ------------------------------------------------------------
   셸터의 순수 데이터(이름·쾌적·날씨풀·퍽·방 크기·무드·유지비·이주비 등). 로직(한파/쾌적/경제/이주)이 읽는다.
   렌더 함수(buildRoom/buildEnv = THREE)는 game.js 스코프(roomGroup/wallPhong 등)가 필요해 game.js 잔류 —
   game.js가 SHELTERS[id] = { ...SHELTER_META[id], buildRoom, buildEnv } 로 병합한다.
   ※ 데이터 무결성은 tests/core.test.cjs의 SHELTER_HASH 가드(전 비-함수 필드 해시)가 보증한다.
   ============================================================ */
import { BAL } from './balance.js';

/* 해금 강화 (디렉터 2026-07-08): 수급량이 원 설계보다 후해져 열흘이면 전 셸터가 열리던 것을
   장기 사다리로 재조정 — unlockAt(탐험 성공 수) 옥탑 25·벙커 45 앵커(첫 두 이주 순서 교환),
   이후 25~30 간격으로 로지 290까지. moveCost(정비 자원)는 x5(초반)~x10(후반).
   지역 해금(REGIONS)·sim(이주 없음)은 무접점. 구세이브: 살던 집·정비 완료는 그대로, 신규 해금만 늦어진다. */
export const SHELTER_META = {
  container: {
    name: '버려진 컨테이너', nameEn: 'Abandoned Container', emoji: '📦', unlockAt: 0, viewH: 14, ceilY: 2.1,
    desc: '황무지 한가운데 버려진 화물 컨테이너. 좁지만 비바람은 막아준다.',
    descEn: 'A cargo container abandoned in the middle of the wasteland. Cramped, but it keeps out the wind and rain.',
    baseComfort: 2,
    cold: 8, limits: '🥶 얇은 철판 — 비/눈 오는 날 쾌적함 -8', limitsEn: '🥶 Thin steel — comfort -8 on rainy/snowy days',
    weatherPool: ['clear', 'ash', 'ash', 'snow'],
    perk: { expBonus: 0.05, label: '🧭 길목의 거점 — 탐험 성공률 +5%p', labelEn: '🧭 Crossroads outpost — expedition success +5%p' },
    room: { w: 6.4, d: 2.9, h: 2.4 },
    mood: { fog: 0x2e2820, fogNear: 20, fogFar: 52, skyH: 0x453a2d, skyZ: 0x15161e, hemiSky: 0x8a8272, hemiGround: 0x4c443a, hemiInt: 0.72, moonC: 0xc9c0a8, moonInt: 0.68, stars: 0.5 },
  },
  bunker: {
    name: '돔 벙커', nameEn: 'Dome Bunker', emoji: '🛖', unlockAt: 45, viewH: 17, ceilY: 2.6,
    baseComfort: 5,
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (환기·조명 전력)', labelEn: 'Battery 1 / day (ventilation & lighting)' },
    moveCost: { material: 12, battery: 6 }, limits: '🔌 밀폐 구조 — 전력이 끊기면 거처 보너스·특성 정지', limitsEn: '🔌 Sealed structure — losing power halts shelter bonuses & traits',
    desc: '반쯤 무너진 돔형 벙커. 갈라진 외피 사이로 별이 보이지만, 두꺼운 벽 안쪽은 의외로 아늑하다.',
    descEn: 'A half-collapsed dome bunker. Stars peek through the cracked shell, but inside the thick walls it is surprisingly snug.',
    room: { w: 8.5, d: 6, h: 3 },
    mood: { fog: 0x161c2c, fogNear: 22, fogFar: 60, skyH: 0x223048, skyZ: 0x0a0e1a, hemiSky: 0x8593b8, hemiGround: 0x3f3a34, hemiInt: 0.68, moonC: 0x9db4d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'snow', 'clear', 'rain'],
    perk: { injuryHalf: true, label: '🛡️ 두꺼운 외피 — 부상 회복 2배 빠름', labelEn: '🛡️ Thick shell — injuries heal twice as fast' },
  },
  rooftop: {
    name: '도시 옥탑방', nameEn: 'City Rooftop', emoji: '🏙️', unlockAt: 25, viewH: 19, ceilY: 2.5,
    desc: '무너진 도시의 빌딩 옥상. 콘크리트 슬래브 위, 주워 모은 판자로 잇댄 가벽 방과 텃밭으로 개조할 수 있는 마당이 있다.',
    descEn: 'Atop a fallen city building. A crude room walled with scavenged panels sits on the concrete slab, beside a yard you can turn into a garden.',
    // ROOM = 가벽 방 내부(가구 배치 영역)만. 마당은 방 밖 슬래브라 배치 불가. (구 9×7 → 5.6×4.4로 축소, 로드 시 클램프 마이그레이션)
    room: { w: 5.6, d: 4.4, h: 2.4 },
    baseComfort: 4,
    moveCost: { material: 10, parts: 5 }, limits: '🪨 슬레이트 지붕에 두 장이 빠져 있다 — 보수 전까지 비/눈 오는 날 청결 소폭 감소', limitsEn: '🪨 Two slates are missing from the roof — until repaired, cleanliness dips a little on rainy/snowy days',
    mood: { fog: 0x1c202c, fogNear: 22, fogFar: 62, skyH: 0x252c3d, skyZ: 0x0b0e18, hemiSky: 0x7d8bb0, hemiGround: 0x3a3733, hemiInt: 0.66, moonC: 0x9db4d8, moonInt: 0.8, stars: 0.75 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    // 옥탑 퍽: 텃밭 수확 배수(gardenMult). 텃밭은 현재 rooftop 전용이라 이 배수가 곧 옥탑의 정체성 —
    // 다른 셸터에 텃밭이 생기는 건 향후. 부분성공 회수(salvagePlus)는 유지.
    perk: { salvagePlus: true, gardenMult: BAL.economy.rooftopGardenMult, label: '📡 탁 트인 시야 — 부분 성공 시 가구 1개 회수 · 🌱 옥상 텃밭 수확 2배', labelEn: '📡 Clear vantage — salvage 1 furniture on partial success · 🌱 rooftop garden yields ×2' },
    // 슬래브는 방(ROOM)보다 훨씬 넓고, 방은 -x/-z 구석, 마당은 +x/+z. 방은 원점 중심(가구 배치 기준).
    // 슬래브 반폭/반깊이 (방 원점 기준 비대칭). YARD 오프셋으로 마당 중심을 잡는다.
    _slab: { backX: 3.4, frontX: 6.9, backZ: 2.9, frontZ: 6.1 }, // 방 원점에서 각 방향 슬래브 가장자리까지
  },
  cabin: {
    name: '숲속 오두막', nameEn: 'Forest Cabin', emoji: '🏡', unlockAt: 70, viewH: 16, ceilY: 2.45,
    baseComfort: 10,
    upkeep: { res: 'material', n: 1, every: 3, label: '건축재 1 / 3일', labelEn: 'Building material 1 / 3 days' },
    stormRepair: ['rain', 'snow', 'storm'], moveCost: { material: 24 },
    limits: '🪵 목조 지붕 — 악천후엔 매일 건축재 1로 누수 수리 (없으면 청결 -8)', limitsEn: '🪵 Timber roof — bad weather needs 1 material/day for leak repair (else cleanliness -8)',
    desc: '숲 가장자리의 오두막. 폐허가 된 세상에서 찾아낸 가장 아늑한 은신처.',
    descEn: 'A cabin on the forest’s edge. The coziest refuge you have found in this ruined world.',
    weatherPool: ['clear', 'snow', 'rain', 'clear'],
    perk: { cozyMult: 1.5, label: '🕯️ 아늑한 구조 — 쾌적함 효과 1.5배', labelEn: '🕯️ Cozy layout — comfort effects ×1.5' },
    room: { w: 10, d: 8, h: 2.7 },
    mood: { fog: 0x1a2233, fogNear: 24, fogFar: 58, skyH: 0x1a2233, skyZ: 0x0a0f1a, hemiSky: 0x8a98bd, hemiGround: 0x46403a, hemiInt: 0.7, moonC: 0x9db4d8, moonInt: 0.75, stars: 0.85 },
  },
  bus: {
    name: '버려진 스쿨버스', nameEn: 'Abandoned School Bus', emoji: '🚌', unlockAt: 95, viewH: 14, ceilY: 2.0,
    desc: '고속도로 위에 멈춰 선 스쿨버스. 좁지만 어디로든 갈 수 있을 것 같은 기분이 든다.',
    descEn: 'A school bus stalled on the highway. Cramped, but it feels like it could take you anywhere.',
    room: { w: 6.8, d: 2.4, h: 2.2 },
    baseComfort: 3,
    mood: { fog: 0x2a2622, fogNear: 20, fogFar: 54, skyH: 0x3d3830, skyZ: 0x14151d, hemiSky: 0x8a8272, hemiGround: 0x453d33, hemiInt: 0.66, moonC: 0xc9c0a8, moonInt: 0.6, stars: 0.55 },
    weatherPool: ['clear', 'ash', 'rain', 'clear'],
    perk: { timeMult: 0.75, label: '🚌 이동형 거점 — 탐험 소요 시간 -25%', labelEn: '🚌 Mobile base — expedition time -25%' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일', labelEn: 'Fuel 1 / 2 days' },
    maxItems: 8, moveCost: { fuel: 12, parts: 12 }, limits: '📦 좁은 실내 — 가구 최대 8개', limitsEn: '📦 Tight interior — max 8 furniture',
  },
  subway: {
    name: '지하철 역사', nameEn: 'Subway Station', emoji: '🚇', unlockAt: 120, viewH: 16, ceilY: 2.8, indoor: true,
    desc: '무너진 도시 아래 잠든 승강장. 날씨도 계절도 닿지 않는 곳 — 어둠만 잘 다스리면 최고의 요새다.',
    descEn: 'A platform sleeping beneath the fallen city. Untouched by weather or season — master the dark and it becomes the finest fortress.',
    room: { w: 11, d: 6, h: 3 },
    baseComfort: 6,
    mood: { fog: 0x121417, fogNear: 16, fogFar: 44, skyH: 0x0b0c0e, skyZ: 0x060708, hemiSky: 0x6e7684, hemiGround: 0x3a352e, hemiInt: 0.68, moonC: 0x8a96a6, moonInt: 0.45, stars: 0 },
    weatherPool: ['clear'],
    perk: { lightMult: 1.5, label: '🕯️ 어둠 속 안식 — 조명 쾌적함 효과 1.5배', labelEn: '🕯️ Rest in the dark — lighting comfort effect ×1.5' },
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (환기 팬)', labelEn: 'Battery 1 / day (ventilation fan)' },
    needsLight: 12, moveCost: { battery: 14, material: 21 }, limits: '🌑 완전한 어둠 — 켜진 조명이 하나도 없으면 쾌적함 -12', limitsEn: '🌑 Total darkness — comfort -12 if no light is lit',
  },
  greenhouse: {
    name: '온실', nameEn: 'Greenhouse', emoji: '🌿', unlockAt: 145, viewH: 16, ceilY: 2.6,
    desc: '기적처럼 남아 있는 유리 온실. 세상이 멸망해도 흙에서는 여전히 싹이 튼다.',
    descEn: 'A glass greenhouse that survived as if by miracle. Even at the end of the world, seeds still sprout from the soil.',
    room: { w: 9, d: 6, h: 2.4 },
    baseComfort: 8,
    mood: { fog: 0x1c2426, fogNear: 22, fogFar: 60, skyH: 0x22333a, skyZ: 0x0a1016, hemiSky: 0x8aa8a0, hemiGround: 0x3f4438, hemiInt: 0.72, moonC: 0xa8c4c0, moonInt: 0.7, stars: 0.8 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    perk: { produce: { food: 1 }, produceNote: '🌿 온실 텃밭에서 수확했습니다', produceNoteEn: '🌿 Harvested from the greenhouse garden', label: '🌿 텃밭 — 매일 음식 +1', labelEn: '🌿 Garden — food +1 daily' },
    upkeep: { res: 'water', n: 1, every: 1, label: '깨끗한 물 1 / 일 (급수)', labelEn: 'Clean water 1 / day (irrigation)' },
    stormRepair: ['snow'], moveCost: { material: 21, water: 14 },
    limits: '❄️ 유리 지붕 — 눈 오는 날엔 건축재 1로 보수 (없으면 청결 -8)', limitsEn: '❄️ Glass roof — snowy days need 1 material to patch (else cleanliness -8)',
    noWallpaper: true, // (B-①) 유리 벽 — 벽지 미대상. 바닥재만 가능.
  },
  ship: {
    name: '여객선 선실', nameEn: 'Liner Cabin', emoji: '🚢', unlockAt: 170, viewH: 17, ceilY: 2.5,
    desc: '해안에 좌초된 여객선의 갑판. 파도 소리와 함께 잠들고, 아침엔 낚싯대를 드리운다.',
    descEn: 'The deck of a passenger liner run aground on the coast. You sleep to the sound of waves and cast a line at dawn.',
    room: { w: 10, d: 7, h: 0.9 },
    baseComfort: 7,
    mood: { fog: 0x16222c, fogNear: 20, fogFar: 56, skyH: 0x1e3040, skyZ: 0x0a1018, hemiSky: 0x7d94b0, hemiGround: 0x3a3d40, hemiInt: 0.68, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.9 },
    weatherPool: ['clear', 'rain', 'rain', 'snow'],
    perk: { failSalvage: true, produce: { food: 1 }, produceNote: '🎣 밤낚시로 물고기를 잡았습니다', produceNoteEn: '🎣 Caught a fish with night fishing', label: '🎣 낚시 — 매일 음식 +1 · 탐험 실패에도 자원 일부 회수', labelEn: '🎣 Fishing — food +1 daily · salvage some resources even on failed expeditions' },
    upkeep: { res: 'parts', n: 1, every: 3, label: '부품 1 / 3일 (배수 펌프)', labelEn: 'Parts 1 / 3 days (bilge pump)' },
    dailyDirt: 2, moveCost: { parts: 24, material: 16 }, limits: '💧 바다의 습기 — 청결이 매일 2 더 빨리 떨어짐', limitsEn: '💧 Sea damp — cleanliness drops 2 faster each day',
  },
  lighthouse: {
    name: '등대 등탑 거실', nameEn: 'Lighthouse Lamp Room', emoji: '🗼', unlockAt: 200, viewH: 19, ceilY: 2.2,
    desc: '절벽 끝 등대의 꼭대기 층. 두꺼운 벽 안은 아늑하고, 옥상 랜턴 옆 빗물받이가 물을 모아준다.',
    descEn: 'The top floor of a lighthouse at the cliff’s edge. Snug within thick walls, with a rain catch beside the rooftop lantern.',
    room: { w: 7, d: 7, h: 2.6 },
    baseComfort: 9,
    mood: { fog: 0x1a2430, fogNear: 22, fogFar: 64, skyH: 0x223448, skyZ: 0x0a0f18, hemiSky: 0x8aa0c0, hemiGround: 0x3a3d40, hemiInt: 0.7, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'rain', 'snow', 'rain'],
    perk: { expBonus: 0.03, forecast: true, label: '🔦 탐조등 — 모든 지역 성공률 +3%p · 날씨 예보 제공', labelEn: '🔦 Searchlight — success +3%p in all regions · weather forecast' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일 (등불)', labelEn: 'Fuel 1 / 2 days (beacon)' },
    rainCatch: 2, moveCost: { fuel: 16, parts: 24 },
    limits: '🌧️ 옥상 빗물받이 — 비/눈 오는 날 깨끗한 물 +2 (자급 가능)', limitsEn: '🌧️ Rooftop rain catch — clean water +2 on rainy/snowy days (self-sufficient)',
  },
  tugboat: {
    name: '예인선', nameEn: 'Tugboat', emoji: '🚤', unlockAt: 230, viewH: 16, ceilY: 2.3,
    desc: '부두에 매인 작은 예인선. 발밑이 늘 흔들리지만, 물 위에서는 낚싯줄이 마르지 않는다.',
    descEn: 'A small tugboat moored at the pier. The deck always sways, but on the water the line never runs dry.',
    room: { w: 6.4, d: 4.2, h: 2.2 },
    baseComfort: 6,
    mood: { fog: 0x15222c, fogNear: 18, fogFar: 52, skyH: 0x1c2e3e, skyZ: 0x0a1018, hemiSky: 0x7a92ae, hemiGround: 0x36393c, hemiInt: 0.66, moonC: 0xa6bed6, moonInt: 0.78, stars: 0.85 },
    weatherPool: ['clear', 'snow', 'rain', 'snow'],
    perk: { produce: { food: 1 }, produceNote: '🎣 뱃전에서 물고기를 낚았습니다', produceNoteEn: '🎣 Caught a fish off the gunwale', label: '🎣 물 위의 거처 — 매일 음식 +1 (얼음낚시 가능)', labelEn: '🎣 Home on the water — food +1 daily (ice fishing available)' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일 (엔진 예열)', labelEn: 'Fuel 1 / 2 days (engine warmup)' },
    dailyDirt: 2, moveCost: { parts: 27, material: 18 }, limits: '💧 뱃전의 습기 — 청결이 매일 2 더 빨리 떨어짐', limitsEn: '💧 Deck damp — cleanliness drops 2 faster each day',
  },
  controltower: {
    name: '항만 관제탑', nameEn: 'Harbor Control Tower', emoji: '🗼', unlockAt: 260, viewH: 21, ceilY: 2.6,
    desc: '항구를 내려다보는 관제탑 꼭대기. 사방이 유리라 바람 소리가 크지만, 다가오는 날씨가 가장 먼저 보인다.',
    descEn: 'The top of a control tower over the harbor. Glass on all sides makes the wind loud, but the coming weather shows here first.',
    room: { w: 6.6, d: 6.6, h: 2.6 },
    baseComfort: 7,
    mood: { fog: 0x18242f, fogNear: 24, fogFar: 66, skyH: 0x203348, skyZ: 0x0a0f18, hemiSky: 0x8aa0c0, hemiGround: 0x3a3d40, hemiInt: 0.7, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'snow', 'rain', 'clear'],
    perk: { forecast: true, forecastLead: 1, expBonus: 0.02, label: '🔭 고층 전망 — 날씨 예보 · 한파 예보 +1일 · 성공률 +2%p', labelEn: '🔭 High vantage — weather forecast · cold-snap lead +1 day · success +2%p' },
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (관제 콘솔)', labelEn: 'Battery 1 / day (control console)' },
    moveCost: { parts: 27, material: 27 }, limits: '🌬️ 사방 유리 — 비/눈 오는 날 쾌적함 -6', limitsEn: '🌬️ Glass on all sides — comfort -6 on rainy/snowy days', cold: 6,
    noWallpaper: true, // (B-①) 사방 유리 전망 벽 — 벽지 미대상. 바닥재만 가능.
  },
  lodge: {
    name: '스키 로지', nameEn: 'Ski Lodge', emoji: '🏔️', unlockAt: 290, viewH: 20, ceilY: 3.0,
    desc: '고원 리조트의 통나무 로지. 바깥은 세상에서 가장 혹독한 겨울이지만, 벽난로 앞은 어디보다 따뜻하다.',
    descEn: 'A timber lodge at the highland resort. Outside is the harshest winter in the world; before the hearth, it is warmer than anywhere.',
    room: { w: 8.4, d: 6.4, h: 3.0 },
    baseComfort: 9,
    // cold 미설정 = 악천후 단열 페널티 없음(최고 단열, 기본 방어). 벽난로 무드는 fire mood + hearth 소품으로.
    altitude: true, // 고도 페널티 표식 (연료 소모 ×altitudeFuelMult · 한파 빈도 +altitudeColdSnapBonus)
    hearth: true,   // 붙박이 벽난로 — 겨울 온기 보너스(hearthWinterComfort) + 한파 방어 1단계(coldDefenseLevel)
    upkeep: { res: 'fuel', n: 1, every: 1, label: '연료 1 / 일 (벽난로·고도 난방)', labelEn: 'Fuel 1 / day (hearth & altitude heating)' },
    moveCost: { material: 30, parts: 20 },
    limits: '🏔️ 고도 — 연료 소모 +30% · 한파가 더 잦다 (로지 단열·벽난로가 상쇄)', limitsEn: '🏔️ Altitude — fuel use +30% · cold snaps more frequent (offset by lodge insulation & hearth)',
    weatherPool: ['clear', 'snow', 'snow', 'snow'], // 고원은 눈이 잦다
    mood: { fog: 0x1a2436, fogNear: 20, fogFar: 62, skyH: 0x22314a, skyZ: 0x0a1120, hemiSky: 0x94a6c8, hemiGround: 0x484038, hemiInt: 0.72, moonC: 0xaec4e0, moonInt: 0.82, stars: 1.0, fire: 0.9 },
    perk: { cozyMult: 1.3, forecast: true, label: '🔥 벽난로 로지 — 쾌적 효과 1.3배 · 날씨 예보', labelEn: '🔥 Hearth lodge — comfort effects ×1.3 · weather forecast' },
  },

  /* ── 2.0 동부 「대도시」 셸터 1: 세관 (GD-2.0 §6.0.5 — 심부 진행 관문) ──
     국경 검문소의 심사 홀. TLOU 3년차 식생 + 동부 노을 팔레트(mood). unlockAt 9999 = 동부 관문
     시스템 착지 전까지 이주 목록 비노출 — 기초 모델링 선제작분(QA loadShelter로만 진입).
     퍽·코스트는 자리값(밸런스는 동부 경제 설계와 함께 캘리브). */
  customs: {
    name: '세관', nameEn: 'Customs House', emoji: '🛃', unlockAt: 9999, viewH: 17, ceilY: 2.7,
    desc: '국경 검문소의 심사 홀. 통과하지 못한 짐들이 아직 컨베이어 위에 놓여 있다 — 이제 국경은 나 하나를 위해 열려 있다.',
    descEn: 'The inspection hall of a border checkpoint. Luggage that never cleared still sits on the belt — now the border stands open for one.',
    room: { w: 7.6, d: 6.2, h: 2.7 },
    baseComfort: 6,
    mood: { fog: 0x2a161a, fogNear: 22, fogFar: 62, skyH: 0x8a3040, skyZ: 0x160a12, hemiSky: 0xc08a70, hemiGround: 0x3a3028, hemiInt: 0.66, moonC: 0xd8a890, moonInt: 0.75, stars: 0.8 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    perk: { label: '🛃 관문의 집 — 동부 대도시의 문턱', labelEn: '🛃 Home at the gate — threshold of the eastern metropolis' },
    moveCost: { material: 32, parts: 24 },
    cold: 5, // 심사 창구가 뚫린 청사 — 외풍. 창구 봉쇄(customsSeal) 개조로 해소
    limits: '🏙️ 심사 창구로 바람이 든다 — 악천후 쾌적 -5 (창구 봉쇄로 해소)', limitsEn: '🏙️ Wind slips through the booths — comfort -5 in bad weather (fix by sealing them)',
  },

  /* ── 2.0 동부 「대도시」 셸터 2: 다리 관리소 (§6.0.5 — 세관==다리 진입 층위) ──
     무너진 현수교 옆 석조 관리소. 낮=끊어진 다리 조망, 밤=별의 집(stars 1.0 + 은하수 + 큰 달 — 밤하늘 확장 첫 사용자).
     석재 텍스처(stoneBlockTex — "텍스처 고급" 오더 1호). unlockAt 9999 = 관문 시스템 전 비노출. */
  bridgehouse: {
    name: '다리 관리소', nameEn: 'Bridge Keeper House', emoji: '🌉', unlockAt: 9999, viewH: 18, ceilY: 2.6,
    desc: '무너진 현수교 옆 석조 관리소. 낮에는 끊어진 다리가, 밤에는 온 하늘의 별이 창밖에 걸린다.',
    descEn: 'A stone keeper house beside the fallen span. By day the broken bridge hangs in the window; by night, every star in the sky.',
    room: { w: 6.8, d: 5.6, h: 2.6 },
    baseComfort: 7,
    mood: { fog: 0x1c1622, fogNear: 24, fogFar: 70, skyH: 0x3a2440, skyZ: 0x0a0a16, hemiSky: 0x9a90c0, hemiGround: 0x3a3430, hemiInt: 0.68, moonC: 0xd8e2f8, moonInt: 0.95, stars: 1.0, milkyway: true, moonScale: 2.3, moonPos: [-0.25, 0.6, -0.75] },
    weatherPool: ['clear', 'clear', 'clear', 'rain'], // 별의 집 — 맑은 밤이 잦다
    perk: { label: '🌌 별의 관측석 — 밤하늘이 온전히 보인다', labelEn: '🌌 A seat under the stars — the night sky, unbroken' },
    moveCost: { material: 34, parts: 26 },
    limits: '🌉 협곡의 집 — 겨울 바람 소리가 크다', limitsEn: '🌉 A house over the gorge — the winter wind is loud',
  },

  /* ── 2.0 동부 「대도시」 셸터 3: 역 대합실 (§6.0.5 — 심부 진행 2층위, 펜실베이니아 역 레퍼런스) ──
     거대한 아치 홀의 한구석이 거처. 무너진 천장으로 신광이 들고, 빛 웅덩이엔 나무가 자란다(TLOU 아트리움).
     석재 텍스처 공유(stoneBlockTex). unlockAt 9999 = 관문 시스템 전 비노출. */
  terminal: {
    name: '역 대합실', nameEn: 'Grand Terminal Hall', emoji: '🚉', unlockAt: 9999, viewH: 20, ceilY: 3.4,
    desc: '거대한 아치 천장 아래, 매표소 옆 한 칸이 나의 집. 무너진 지붕 틈으로 해가 들고, 그 빛 웅덩이에서 나무 한 그루가 자란다.',
    descEn: 'One corner beneath the great arched ceiling, beside the ticket booths. Sun falls through the broken roof, and in that pool of light a tree grows.',
    room: { w: 11, d: 7, h: 3.4 },
    baseComfort: 6,
    mood: { fog: 0x18120c, fogNear: 20, fogFar: 56, skyH: 0x2a1e14, skyZ: 0x0a0806, hemiSky: 0x8a7a64, hemiGround: 0x3a3228, hemiInt: 0.64, moonC: 0xc8b89a, moonInt: 0.6, stars: 0.3 },
    weatherPool: ['clear', 'clear', 'rain', 'snow'],
    perk: { label: '🚉 빛 웅덩이의 홀 — 도시 한가운데의 성소', labelEn: '🚉 A hall with a pool of light — a sanctuary mid-city' },
    moveCost: { material: 36, parts: 28 },
    cold: 4, limits: '🕳️ 무너진 천장 — 악천후 쾌적 -4 (지붕 틈을 막으면 해소)', limitsEn: '🕳️ Broken ceiling — comfort -4 in bad weather (fix by patching the gap)',
  },

  /* ── 2.0 동부 「대도시」 셸터 4: 펜트하우스 (§6.0.5 — 심부 진행 종점, "고성 첨탑들에 둘러싸인" 압도) ──
     마천루 꼭대기의 럭셔리 펜트하우스 잔해. 조망이 정체성 — env가 주역(둘러싼 초고층 + 아득한 아래 안개).
     unlockAt 9999 = 관문 시스템 전 비노출. */
  penthouse: {
    name: '펜트하우스', nameEn: 'Penthouse', emoji: '🏙️', unlockAt: 9999, viewH: 22, ceilY: 2.9,
    desc: '구름 높이의 펜트하우스. 사방의 마천루가 고성의 첨탑처럼 나를 둘러싸고, 발밑엔 안개에 잠긴 도시가 있다.',
    descEn: 'A penthouse at cloud height. The towers stand around you like castle spires, and below, a city drowned in fog.',
    room: { w: 11, d: 7.5, h: 2.9 },
    baseComfort: 8,
    // 발코니 배치 칸 (디렉터): 조망면(-z) 밖 데크 — 방석·양초·촛대만 놓을 수 있다 (clampToRoom 확장)
    balcony: { x0: -3.6, x1: 3.6, z0: -5.75, z1: -4.1, allow: ['cushion', 'candle', 'candelabra'] },
    mood: { fog: 0x1a1622, fogNear: 26, fogFar: 78, skyH: 0x2c2338, skyZ: 0x0b0a14, hemiSky: 0x9a92b8, hemiGround: 0x3a3630, hemiInt: 0.7, moonC: 0xccd4ec, moonInt: 0.9, stars: 0.9 },
    weatherPool: ['clear', 'clear', 'snow', 'rain'],
    perk: { label: '🏙️ 첨탑들의 왕좌 — 도시 전체가 창밖에 있다', labelEn: '🏙️ A throne among spires — the whole city hangs in the window' },
    moveCost: { material: 40, parts: 32 },
    limits: '🌬️ 고층 강풍 — 겨울 바람이 유리를 두드린다', limitsEn: '🌬️ High-rise wind — winter rattles the glass',
  },
};
