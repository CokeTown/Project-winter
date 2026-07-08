/* ============================================================
   balance.js — Nine Winters 튜닝 테이블 (하드코딩 분리)
   ------------------------------------------------------------
   목적: 밸런스 수치를 한 곳으로 모아 개발/시뮬 튜닝을 쉽게 한다.
   원칙: 이 파일은 의존성 0의 순수 데이터다 (import 금지 — 순환 방지).
         로직/구조는 game.js에 그대로 두고, 여기엔 "숫자"만 둔다.
   출처 주석: 각 값 옆에 원래 game.js에서의 위치·의미를 남긴다.
   ============================================================ */
export const BAL = {
  /* ── 생존 게이지 (decayGauges / autoEat / eat·drink) ── */
  gauges: {
    hungerPerMin: 0.01326, // game.js decayGauges: 만복→0 약 5게임일 (v0.9.1 ×0.78 완화)
    thirstPerMin: 0.02106, // game.js decayGauges (v0.9.1 ×0.78 완화)
    winterMult: 1.25,      // 겨울 열량 소모 배수 (decayGauges)
    autoEatThreshold: 40,  // autoEat: hunger/thirst 이 값 미만이면 자동 섭취
    autoEatRestore: 45,    // autoEat 1회 회복량 (hunger/thirst)
    autoEatGuard: 9,       // autoEat while 루프 안전 상한 (무한루프 방지)
    eatRestore: 45,        // 수동 eatFood 회복량
    drinkRestore: 45,      // 수동 drinkWater 회복량
    eatFullGate: 85,       // hunger 이 값 초과면 수동 섭취 거부 ("배부름")
    drinkFullGate: 85,     // thirst 이 값 초과면 수동 음용 거부
  },

  /* ── 취침 / 에너지 (restEnergyValue / sleepUntilMorning) ── */
  rest: {
    bedEnergy: 90,       // 침대에서 취침 시 회복 에너지
    floorEnergy: 65,     // 바닥 취침 회복 에너지
    cozyThreshold: 75,   // comfort 이 값 이상이면 취침 보너스
    cozyBonus: 10,       // 취침 에너지 보너스 (cozy 달성 시)

    /* ── v1.2.0 취침 자율화 (디렉터 승인 설계) ──
       자정 강제 취침을 폐지하고, "몇 시에 자느냐"를 회복량으로 보상/처벌한다.
       기준 회복량(bedEnergy/floorEnergy + cozyBonus)에 아래 시각 보정을 가산한다.
       규칙: 21~23시 +earlyBonus / 00~00:59 보정 0 / lateStartHour(01시)부터 매 정시 -latePerHour 누적(하한 -lateCap) /
             collapseHour(05시)엔 자동으로 쓰러지듯 취침(회복은 floorEnergy 수준, 전용 문구). */
    earlyBonus: 5,       // 21~23시 취침 에너지 보너스 (일찍 자면 +5)
    earlyStartHour: 21,  // 이른 취침 보너스 시작 시각
    earlyEndHour: 23,    // 이른 취침 보너스 끝 시각(포함) — 24(자정)부터는 0
    lateStartHour: 1,    // 이 시각(01시)부터 늦잠 페널티 누적 시작
    latePerHour: 7,      // 01시 이후 매 1시간당 회복 -7
    lateCap: 28,         // 늦잠 페널티 누적 하한 (최대 -28)
    collapseHour: 5,     // 이 시각(05시)에 도달하면 자동으로 쓰러지듯 취침
    expFatigueLateMult: 2, // #88 탐험 피로: 한도까지 탐험한 날 밤샘 페널티 배수 (강제 정산 폐지의 대가 — 일찍 자면 무손해)
  },

  /* ── 탐험 (startExpedition / _simDaysInner 탐험 비용) ── */
  exp: {
    perDay: 5,           // EXP_PER_DAY: 하루 탐험 가능 횟수
    /* 탐험 시간 개편 (디렉터 2026-07-08): 탐험 소요(인게임) = expDuration(실대기 초) × timeScale(분).
       탐험 중엔 시계가 이 배속으로 흘러 대기가 끝나는 순간 소요시간이 정확히 다 흘러 있다 —
       귀환 순간의 시간 점프(구 +2~5시간 "그냥 지나는" 이슈) 폐지. 공업 45초 → 3시간, 도심 80초 → 5시간20분. */
    timeScale: 4,        // 탐험 중 시간 배속 (실1초 = 게임4분. 평상시 1분)
    energyCost: 20,      // 탐험 1회 에너지 소모
    hungerCost: 4,       // 탐험 1회 배고픔 소모 (sim 경로)
    thirstCost: 5,       // 탐험 1회 갈증 소모 (sim 경로)
    minEnergy: 20,       // 탐험 출발 최소 에너지 (startExpedition 게이트)
    midRest: 20,         // 탐험 사이 energy<20 시 간이 회복 (sim 경로)
    hungryPenGate: 25,   // hunger/thirst 이 값 미만이면 성공률 페널티 (rateParts)
    hungryPen: 0.10,     // 허기/갈증 성공률 페널티량
    // 가방(탐사 안전망, 디렉터 2026-07-07): 출발 시 천 소모, 실패/부분이어도 랜덤 자원 최소 회수 보장(failSalvage와 max).
    idleTimeScale: 3.2,   // 평시(비탐험) 시계 배속 — 탐험(timeScale 4)의 80% (디렉터 확정 2026-07-08)
    bagCost: { cloth: 3, parts: 1 }, // DDD-3 내구성 승격(REWARD-LOOP ③): 1회용 챙기기 → 제작 1회(내구 6회)
    bagDur: 6,                       // 가방 내구 — 안전망이 발동한 탐험에서만 1 마모(재제작=유지 루프)
    bagFloorMin: 1,        // 실패/부분 시 최소 확정 회수 (하한)
    bagFloorMax: 2,        // 최소 확정 회수 (상한)
  },

  /* ── 하드 모드 (hardLoot / decayGauges / sim expMul) ── */
  hard: {
    lootMul: 0.7,        // 하드 전리품 배수 (기댓값 보존 확률 반올림)
    drainMul: 1.5,       // 하드 게이지 소모 배수
    expMul: 1.5,         // 하드 탐험 게이지 소모 배수 (sim)
    /* 하드 겨울 한파 강화 (v1.0.0, REQ-BAL-02 후속) — 광고 수치(loot/drain)와 별개로
       "첫 겨울이 진짜 시험" 카피를 체감시키는 압박 레버. 탈진 유발이 아니라
       한파일수 증가(쾌적 -12, 탐험 -10%p, 배고픔 ×1.5)로 겨울 긴장을 만든다. */
    coldSnapChanceMul: 3.0,    // 하드 한파 발동 확률 배수 (0.14 → 0.42/일). v1.4.1: 1.6=실현 1.4회, 2.6=2.05회(오디트 E→실측 튜닝) — 의도 밴드 2.2~2.8 도달값(모드 카드는 "한파가 더 잦다"로 수치 미광고, 코디네이터 결정)
    coldSnapExtraPerWinter: 1, // 하드 겨울당 한파 상한 +1 (2 → 3회)
    /* v1.4.1 핫픽스(오디트 E P1-1): 하드 한정 예보 리드 단축. 겨울 12일에서
       발령 가능 창(seasonDay ≤ SEASON_DAYS - forecast - 1) + 리드 2일 + 지속 2~3일이
       물리적으로 한파 2회를 상한으로 만들어 snapCap=3(하드)이 사문화되던 문제를 해소.
       리드를 1일로 줄여 발령 창을 하루 넓히고 실현 사이클을 압축 → 하드 실현율 2.2~2.8회 밴드 진입.
       노말은 기존 coldSnapForecastDays(2) 유지 — 광고/노말 수치 불변. */
    coldSnapForecastDaysOverride: 1, // 하드 한정 예보 리드타임(일). 노말은 seasons.coldSnapForecastDays(2)
  },

  /* ── 무력 상태 구제 (v1.3.0 배치 D · GD-THESIS §4.5) ──
     노말/하드 런당 1회, 무력(식량·식수 0 + 게이지 바닥) 도달 시 지급되는 재기 물자.
     "재기 가능선" — 하루치 안전망이지 난이도가 아니다(노말 정상 플레이는 도달 0). */
  rescue: {
    food: 3, water: 4, fuel: 2, canned: 2,
    unlockDay: 150, // 배경화면 모드 해금: 노말 모드 누적 최고 생존일 도달 기준
  },

  /* ── 성공률 pity 보정 (expActualRate / resolveExpedition) ── */
  pity: {
    normalBonus: 0.04,   // 노말 상시 +4%p (하드는 0)
    perStreak: 0.08,     // 연속 실패당 +8%p
    streakCap: 3,        // pity 누적 캡
    ceiling: 0.95,       // 실제 판정 확률 상한
    partialFactor: 0.5,  // 실패~부분성공 경계 = actual + (1-actual)*0.5
    injuryPartialChance: 0.4, // 부분성공 시 부상 판정 확률
    glovesReduce: 0.3,   // 장갑 착용 시 부상 확률 -0.3
    failSalvageMult: 0.3,// failSalvage 특성 실패 회수 배수
  },

  /* ── 계절 (SEASONS / seasonOf) ── */
  seasons: {
    daysPerSeason: 12,   // SEASON_DAYS: 한 계절 길이 (게임일)

    /* 가을 비축 경고 (겨울 대비) */
    prepWarnDaysBefore: 3, // 겨울 시작 N일 전부터 경고 카드
    prepBufferMult: 1.3,   // 권장량 = 겨울일수 × 일소비 × 여유계수
    prepFuelPerDay: 1,     // 권장 계산용 연료 일소비 기준
    prepCannedPerDay: 1,   // 권장 계산용 보존식 일소비 기준

    /* 겨울 한파 (cold snap) */
    coldSnapChancePerDay: 0.14, // 겨울 하루당 한파 발동 확률 (계절당 ~1.5회 기대)
    coldSnapForecastDays: 2,    // 한파 예보 리드타임 (일)
    coldSnapMinDur: 2,          // 한파 지속 최소 (일)
    coldSnapMaxDur: 3,          // 한파 지속 최대 (일)
    coldSnapHungerMult: 1.5,    // 한파 중 배고픔 감소 가속 배수
    coldSnapComfortPen: 12,     // 한파 중 쾌적함 페널티 (무방비 기준)
    coldSnapExpPen: 0.10,       // 한파 중 탐험 성공률 -10%p
    coldSnapMaxPerWinter: 2,    // 겨울당 한파 최대 발동 횟수

    /* 여름 부패/갈증 압박 */
    summerSpoilMult: 1.5,   // 여름 신선식품 부패 가속 배수
    summerThirstMult: 1.25, // 여름 갈증 소모 가속 배수
  },

  /* ── 경제 (processDay 생산/소비 / 제작 / 개조 / 이주) ── */
  economy: {
    // ♾️ 무한(zen) 모드 시작 물자 증량 — 새 게임 생성 시 mode==='zen'이면 DEFAULT_STATE.res에 가산.
    zenStart: { food: 6, canned: 8, water: 10, cloth: 4, candle: 4, fuel: 4, material: 4, parts: 2, battery: 2 },
    // #76 후속(디렉터 "좀 challenging 해야지"): 난이도별 전리품 수급 배수. rollRes(실게임)+expectedLoot(시뮬) 공통.
    //   난이도가 높을수록 파밍이 야박하다. 노말도 소폭 조인다(구 1.0 → 0.85, "획득 손맛" 상향을 되돌림).
    //   ※ 하드 구 BAL.hard.lootMul(0.7) 대체.
    //   하드코어 0.28(디렉터 "진짜 죽는다"): 경제가 쌍안정이라 이 선에서 표본 5시드 중 2개가 아사(영구사망) —
    //     스킬·운이 없으면 완주 불가한 진짜 permadeath. "폐허는 두 번 묻지 않는다"의 실체.
    //   안전선(굶는 날 0)은 노말·하드에만 적용(코지 코어·REQ-BAL-01). 하드코어는 의도적으로 치명적 = 예외.
    incomeMul: { normal: 0.85, hard: 0.58, hardcore: 0.28, zen: 1.0 },
    dailyDirt: 1,          // 일일 청결 감소 기본값 (v0.9.1 2→1)
    foodSpoilPerDay: 1,    // 냉장고 없을 때 신선식품 일일 부패량
    catFeedEvery: 3,       // 고양이 먹이 주기 (일)
    catFeedFood: 1,        // 고양이 1회 급식량

    /* 이주 공통 물자 (구역 간 이동) */
    moveCrossFood: 1,      // 구역 간 이주 여정 식량
    moveCrossWater: 1,     // 구역 간 이주 여정 물
    moveCrossTimeMin: 180, // 구역 간 이주 소요 게임분 (3시간)

    /* 가전 일일 생산/소비 (기존 정수기/발전기 스타일) */
    purifierWaterPerDay: 1, // 정수기 일일 물 생산
    autoWaterPerDay: 2,     // [신규] 자동 급수기 일일 물 생산
    autoWaterBatteryPerDay: 1, // [신규] 자동 급수기 일일 배터리 소비
    heaterFuelPerDay: 1,    // [신규] 온풍기 일일 연료 소비
    heaterWinterComfort: 6, // [신규] 온풍기 겨울 쾌적 보너스 (comfortDetail)
    heaterColdDefense: 1,   // [신규] 온풍기 한파 방어 단계

    /* 개조 2단계 대형 빗물받이 */
    bigRaincatchWater: 2,  // [신규] 대형 빗물받이 비 오는 날 물 +2

    /* 지역 인센티브 확정 보장 */
    industrialGuaranteedFuel: 1, // 공업지대 fuel 최소 확정 획득

    /* 돔 벙커 리워크 (#36) */
    bunkerRoofCost: { material: 4 },  // 천장 수리 프로젝트 총비용 (2단계 합산: 임시 덮개 1 + 완전 수리 3) — v0.9.6 하향
    bunkerRoofStage1: { material: 1 },// 1단계 임시 덮개 (빗물 새기 멎음) — 2→1 (#55 디렉터: "건축재 1개면 될 것")
    bunkerRoofStage2: { material: 3 },// 2단계 완전 수리 (쾌적 +4) — 4→3
    bunkerBackdoorCost: { material: 3 },// 뒷문 개방(전실+계단) 건축재 비용 (#55)
    bunkerRoofComfort: 4,             // 천장 완전 수리 시 벙커 쾌적 가산
    bunkerStorageComfort: 4,          // 절단기 뒷문 전실(저장고) 개방 시 벙커 쾌적 가산
    bunkerRoofDirtPerDay: 1,          // 천장 구멍 방치 시 비 오는 날 청결 추가 감소

    /* 옥탑방 리워크 (#53) — 슬레이트 지붕 + 텃밭 마당 */
    rooftopSlateCost: { material: 1 },  // 슬레이트 보수 비용 (빠진 2장 채우기) — 벙커 1단계와 동일 눈높이
    rooftopSlateDirtPerDay: 2,          // 슬레이트 빠진 상태로 비/눈 오는 날 청결 추가 감소 (구 weatherDirt 3보다 완화 — 지붕 일부 존재)
    rooftopGardenFoodPerDay: 1,         // 옥상 텃밭 기본 일일 음식 생산 (겨울 0). 실제 생산 = 기본 × 셸터 perk.gardenMult
    rooftopGardenMult: 2,               // 옥탑 퍽: 텃밭 수확 배수 (옥탑 텃밭 food +2/일). 현재 텃밭은 rooftop 전용이라 이 배수가 곧 옥탑 정체성
  },

  /* ── #76 「지식과 사치」 — 장기 인플레 교정 + 책(지식)/사치 건축 싱크 ──
     문제(AUDIT-1.4 P1-3): 9겨울 완주(Day432) food+canned가 1291까지 무한 인플레 — 후반 자원이 의미를 잃는다.
     디렉터 결정: 목표 300~400 + 지식/사치 싱크. 방식(디렉터 승인): "암시장 확장".
     설계: 방치형 자동 경로 — 잉여 food+canned가 surplusCap 위로 넘치면 매일 암시장에 팔아 책(지식)으로.
       임계치가 곧 인플레 캡(파는 속도 sellPerDay가 후반 순증을 웃돌아 pile을 surplusCap 부근에 고정).
     밴드 불가침: surplusCap을 Day30/60 밴드(110~160 / 122~147) 상단보다 훨씬 높게 둬 초·중반은 절대 안 건드린다
       — 후반 폭주분만 깎는다. 책은 사치 가구 제작(사치 건축)의 재료 + 탐험 희귀 드랍(지식). */
  luxury: {
    // food+canned 합이 캡을 넘으면 초과분을 암시장에 판다 = 후반 안착선. 난이도별로 캡이 다르다:
    //   노말 340(목표 300~400 중앙). 하드/하드코어는 더 빡세게 — 후반 잉여 여유를 줄인다(캡은 잉여만
    //   깎으므로 생존/굶주림과 무관, 밴드보다 훨씬 높아 초·중반 불가침). 무한(zen)은 노말과 동일(압박 없는 모드).
    //   ※ 평평한 캡이면 하드도 결국 노말과 같은 후반 부를 갖는 결함(2026-07-06 측정 검거) → 난이도 티어링.
    surplusCap: { normal: 340, hard: 240, hardcore: 200, zen: 340 },
    surplusCapDefault: 340, // 미지정 모드 폴백
    sellPerDay: 40,    // 하루 판매 상한 — 총 생성(단일최고 ~20/일, 로테이션 ~10/일)을 넉넉히 웃돌아 임계치가 하드캡으로 작동
    perBook: 20,       // 누적 판매 이만큼마다 책(지식) 1권 산출 (로테이션 기준 후반 ~0.2권/일 = 완만 — 사치 가구 재료)
    bookDropChance: 0.03, // 탐험 성공 시 책 1권 드랍 확률 (메모 2%보다 살짝 위 — 지식은 종이 한 장보다 흔하다)
  },

  /* ── 인카운터 / 수집 (Phase D #12·#35) ── */
  events: {
    dailyChance: 0.30,     // 아침 결산 시 랜덤 인카운터 발동 확률 (디렉터 2026-07 2차: "탐험/하루마다 고정 1개 잦다" → 0.35→0.30. + 탐험 이벤트에 1일 쿨다운 부여로 같은 날 스택 제거 → 하루 최대 1회)
    midExpChance: 0.08,    // 탐험 중간(50% 지점) 인카운터 발동 확률. game.js:6896에서 일일 이벤트와 동일한 1일 쿨다운 게이트 공유(하루 최대 1회 하드캡)
    memoDropChance: 0.02,  // 탐험 성공 시 지역 메모 1개 드랍 확률 (디렉터 지시: 문서 희소화 12%→2% — 종이 한 장이 귀해야 한다)
    willDropChance: 0.02,  // 탐험 성공 시 생존자 유서 드랍 확률 (극저확률, REQ-LORE-01: 1.5~2.5% 밴드)
    radioListenChance: 0.18, // 라디오 ON 상태 하루 1회 방송 청취 확률
  },

  /* ── 인카운터/교환 모드 밸런스 (2026-07-07, 디렉터 "좀 더 하드하게") ──
     incomeMul 철학 계승(무한 > 노말 > 하드 > 하드코어). 인카운터도 난이도 철학에 편입 — 기존엔 5모드 flat이었다.
     freqMul   : 인카운터 발동 빈도 배수 (dailyChance/midExpChance에 곱). 배경화면=0(스테이크 없음).
     barterMul : scale 대상 교환에서 "받는 양" 배수 (높을수록 유리). 어려울수록 덜 받는다.
     costMul   : scale 대상 교환에서 "내는 자원" 배수 (높을수록 야박). 어려울수록 더 낸다.
     ※ 적용 대상: 암시장 marketOffers(scale:true) + 밀수꾼. 일반 인카운터(소량 플레이버 교환)와
       양성 싱크(foodToCanned 부패·book 지식)는 불변 — 난이도로 조일 대상이 아니다. */
  encounters: {
    freqMul:   { normal: 1.0, hard: 0.85, hardcore: 0.7, zen: 1.15, wallpaper: 0 },
    barterMul: { normal: 1.0, hard: 0.7,  hardcore: 0.5, zen: 1.25, wallpaper: 1.0 },
    costMul:   { normal: 1.0, hard: 1.25, hardcore: 1.5, zen: 0.85, wallpaper: 1.0 },
  },

  /* ── 게이트 코스트 난이도 스케일 (2026-07-07, 디렉터 "코어 콘텐츠 도달 코스트를 난이도로 늘리자") ──
     방호복(금지 구역=최종장 게이트) 제작/수리 + 허브 승격(암시장/선로 게이트)에 적용. gateCost(cost) 헬퍼가 각 자원 round·min1.
     대형 프로젝트는 제외(이미 정밀 캘리브 + 하드코어 벽 위험 — 캐비엇). encounters.costMul과 동일 값. */
  gateCostMul: { normal: 1.0, hard: 1.25, hardcore: 1.5, zen: 0.85, wallpaper: 1.0 },

  /* ── 입력 / 게임패드 (#14 REQ-INP-02) ── */
  input: {
    padDeadzone: 0.15,      // 스틱 데드존 (미만은 0 처리)
    padCursorSpeed: 780,    // 가상 커서 속도 (px/초, 스틱 최대 기울기 기준)
    padCameraSpeed: 2.6,    // 우스틱 카메라 회전 속도 (rad/초 계수)
    padZoomStep: 1.06,      // LB/RB 줌 스텝 (프레임당 배수, 홀드 연속 줌)
  },

  /* ── 자동 진행 지역 선택 (runAutoPlay, v1.2.0 다양화) ──
     기존 그리디(항상 최고 eff = 주거)를 결핍 기반 가중으로 교체한다.
     각 후보 지역의 가중 = eff (성공률) × (1 + 부족자원 산지 보너스) × 연속방문 감쇠.
     부족 판정: 자원 재고가 scarceThreshold 미만이면 "부족"으로 보고, 그 자원을 loot로 주는 지역에 보너스.
     ※ 신규 시스템(염장/얼음낚시/프로젝트/암시장)은 자동 대상 아님 — 설계 의도(수동 전략 레버). */
  auto: {
    scarceThreshold: 8,     // 이 값 미만이면 해당 자원을 "부족"으로 간주 (하루 소비 기준 여유분)
    scarceWeightPerRes: 0.6,// 부족 자원 1종을 산지로 주는 지역당 가중 보너스 (합산)
    revisitDecay: 0.5,      // 직전 방문 지역 재선택 가중 배수 (연속 편중 완화)
    minEnergy: 30,          // 자동 탐험 출발 최소 에너지 (기존 하드코딩 이관)
    maxExpPerDay: 4,        // 자동 탐험 일일 상한 (기존 하드코딩 이관 — 5회 중 4회까지 대행)
    // 부족 판정 대상 자원 (신선/물은 autoEat이 따로 관리하므로 제외 — 건축/제작/유지 자원 위주)
    scarceWatch: ['fuel', 'parts', 'material', 'salt', 'cloth', 'battery', 'canned'],
  },

  /* ── 고양이 클로즈업 카메라 (v1.2.0 디렉터 오더) ──
     비배치 모드에서 고양이 탭 → 카메라가 고양이로 글라이드 클로즈업. 드래그/ESC/빈곳 탭으로 복원.
     거리/각도는 얼굴 픽셀 텍스처 가독 기준 튜닝(화면 1/3 채움, 눈높이 살짝 위 3/4). */
  catCam: {
    // 직교 카메라라 화면상 크기는 zoom만 좌우한다(view height = 9/zoom). 고양이 몸통 ~0.35u가 화면 ~1/3을
    // 채우려면 view height ~1.1u → zoom ~8. dist는 각도/클리핑용(투영 크기엔 무영향).
    dist: 8,             // 클로즈업 궤도 거리 (각도·그림자용)
    zoom: 13.0,          // 클로즈업 직교 줌 — 실측 튜닝 v1.2.0: 8=전신 22%(과소), 25=얼굴만(과대) → 13=전신 ~36%
    elevDeg: 22,         // 클로즈업 앙각(도) — 눈높이 살짝 위 내려보기(3/4 각도)
    heightAbove: 0.22,   // 고양이 루트 위로 카메라 타겟을 올리는 높이 (얼굴/가슴 기준선)
    glideLerp: 0.16,     // 진입/추적 카메라 보간 계수 (급회전 금지 — 지연 추적)
    yawOffset: 0.9,      // 고양이 정면 대비 카메라 yaw 오프셋(rad) — 3/4 측면각
  },

  /* ── 쾌적함 4요소 분해 (Living Shelter #29) ──
     comfortDetail()의 기존 컴포넌트를 4개 축으로 "재분류"만 한다.
     총점(score) 계산식은 불변 — 여기 표는 오직 "어느 축에 귀속시킬지" 매핑이다.
     (밸런스 diff 0 보장: score는 기존 그대로, 이 표는 UI 원인표시용 버킷팅) */
  comfort: {
    /* 조명 가구의 comfort 값을 온기(warmth) vs 분위기(mood)로 배분.
       열원(불꽃/발열) 계열은 온기, 전기 조명은 분위기. (합계는 원래 light 총점과 동일) */
    lightAxis: {
      stove: 'warmth',    // 장작 난로 — 열원
      candle: 'warmth',   // 캔들 — 촛불 열
      lantern: 'warmth',  // 걸이 랜턴 — 등불 열
      lamp: 'mood',       // 스탠드 조명 — 전기, 분위기
    },
    lightAxisDefault: 'mood', // 표에 없는 조명은 분위기로
  },

  /* ── 꾸미기 (#13 REQ-DECO-01) ── */
  deco: {
    themeSetComfort: 3, // 테마 세트 1개 충족 시 분위기(mood) 축 쾌적 가산
  },

  /* ── 대형 프로젝트 (1.1 신규, ARC-02) ──
     투입 1회당 지불 자재. costKey는 projects.js PROJECTS[*].stages[*].costKey 와 짝.
     game.js 엔진이 BAL.projects[costKey]로 해석해 resConsumeAll에 넘긴다.
     파일럿(clearPassage)은 코스메틱 검증용이라 소량. 항구/선로 등 실제 콘텐츠 프로젝트의
     총 자재량 게이트(노말 12~20일치 잉여)는 각 확장 배치에서 시뮬 캘리브레이션한다. */
  projects: {
    // 파일럿: 벙커 통로 정리 — 1단계 큰 돌(건축재 1×3회=3), 2단계 잔해(건축재 1×2회=2). 총 건축재 5.
    clearPassage1: { material: 1 }, // 1단계 큰 돌 걷어내기 (투입 1회당)
    clearPassage2: { material: 1 }, // 2단계 잔해 쓸어내기 (투입 1회당)
    // 1.1 방파제 오두막 — 잔해정리→뼈대→마감. 항구 전초기지(파밍 -25% + 얼음낚시 스팟 +1).
    // 총 자재량 게이트(노말 12~20일치 잉여): 잔해 건축재 1×4=4, 뼈대 건축재 2×3=6, 마감 부품 1+천 1 ×3=부품3/천3.
    // 후반(항구 해금 successes 25+) 자원 기준 12~16일치 잉여분. 시뮬 인플레 시 이 수치를 낮춰 재캘리브레이션.
    breakwater1: { material: 1 },           // 1단계 잔해 정리 (투입 1회당) — 4회
    breakwater2: { material: 2 },           // 2단계 뼈대 세우기 (투입 1회당) — 3회
    breakwater3: { parts: 1, cloth: 1 },    // 3단계 마감(방수·지붕) (투입 1회당) — 3회

    /* 1.2 선로 복구 ×3 — 잔해제거→침목→개통. 개통 시 연결 지역 탐험 -50% + 폭설 봉쇄 무시.
       구간이 멀수록(residential→commercial→industrial) 총 자재량이 커진다(후반 잉여 싱크).
       seg1 총: 건축재 3+3 + (부품1)×2 = 건축재6/부품2.  ~후반 12~16일치 잉여.
       seg2 총: 건축재4+3 + (부품1)×3 = 건축재7/부품3.
       seg3 총: 건축재4+4 + (부품1+건축재1)×3 = 건축재11/부품3. 인플레 시 이 수치를 낮춰 재캘리브레이션. */
    subRail1a: { material: 1 },             // seg1 잔해 제거 — 3회
    subRail1b: { material: 1 },             // seg1 침목 깔기 — 3회
    subRail1c: { parts: 1 },                // seg1 개통(레일 체결) — 2회
    subRail2a: { material: 1 },             // seg2 잔해 제거 — 4회
    subRail2b: { material: 1 },             // seg2 침목 깔기 — 3회
    subRail2c: { parts: 1 },                // seg2 개통 — 3회
    subRail3a: { material: 1 },             // seg3 잔해 제거 — 4회
    subRail3b: { material: 1 },             // seg3 침목 깔기 — 4회
    subRail3c: { parts: 1, material: 1 },   // seg3 개통(가장 먼 구간) — 3회

    /* 1.3 케이블카 복구 — 잔해정리→지주→케이블→완성. 완공 시 리조트 접근/탐험 시간 단축.
       총: 건축재 1×3 + (건축재1+부품1)×3 + 부품1×3 = 건축재6/부품6. 로지 해금(successes 33+) 후반 12~16일치 잉여. */
    cablecar1: { material: 1 },             // 잔해 정리 → 지주 — 3회
    cablecar2: { material: 1, parts: 1 },   // 케이블 가설 — 3회
    cablecar3: { parts: 1 },                // 곤돌라 복구(개통) — 3회

    /* 1.3 관측소 — 기초→돔 골조→완성. 완공 시 밤하늘 이벤트(스케치 수집) 개방. 감상 보상(숫자 아님).
       총: 건축재 2×3 + (건축재1+부품1)×3 + (부품1+배터리1)×3 = 건축재9/부품6/배터리3. 로지 후반 잉여 싱크. */
    observatory1: { material: 2 },              // 기초 — 3회
    observatory2: { material: 1, parts: 1 },    // 돔 골조 — 3회
    observatory3: { parts: 1, battery: 1 },     // 완성(광학·구동) — 3회

    /* 1.4 무전 기지 복구 (최종 대형 프로젝트) — 안테나→송신기→전원 3단계.
       완공 효과(radio.broadcastAction): 수집 방송 송출 행동 개방 → 종이 지도 생존자 불빛 점등.
       연구동(방호복 필수) 거주/접근 후반 자원 기준 잉여 싱크. 전원 단계가 가장 값지다(배터리·연료).
       총: 건축재2+부품1 ×3 + 부품1+천1 ×3 + 부품1+배터리1+연료1 ×3 = 건축재6/부품9/천3/배터리3/연료3. */
    radioAntenna1: { material: 2, parts: 1 },   // 안테나 — 접시/마스트 세우기 — 3회
    radioTx1: { parts: 1, cloth: 1 },           // 송신기 — 회로 배선·절연 — 3회
    radioPower1: { parts: 1, battery: 1, fuel: 1 }, // 전원 — 발전·축전 계통 — 3회

    /* 2.0 §9.6 히든 통로 개척 (「침묵」) — 역대 최고 코스트(무전 기지 약 2배·투입 12회, 디렉터 확정 2026-07-08).
       총: 건축재3+부품1 ×4 + 부품2+천1+연료1 ×4 + 부품1+배터리1+연료1 ×4 = 건축재12/부품16/천4/배터리4/연료8. */
    hiddenGate1: { material: 3, parts: 1 },         // 벽을 허문다 — 4회
    hiddenGate2: { parts: 2, cloth: 1, fuel: 1 },   // 버팀목과 통로 — 4회
    hiddenGate3: { parts: 1, battery: 1, fuel: 1 }, // 개통(등불·사다리) — 4회
  },

  /* ── 도료 (REWARD-LOOP ② 1차 착지 — 디렉터 확정 2026-07-08: 소모품 1통=1회·12계열·지역 시그니처) ──
     성공 탐험 저확률 드랍(잭팟 층 — 감사의 "희귀 티어 부재" 처방). 기대 통 1개/약 6성공 —
     스와치 124색 완주는 초장기 수집 목표(도감·업적 3종이 스코어보드). 파워 아님(코지 안전선). */
  /* ── 시그니처 도면 (DDD-4 / REWARD-LOOP ② 2차 — 디렉터 확정 2026-07-09) ──
     지역 독점 가구의 제작 도면 — 성공 탐험 저확률(도료 10%보다 희귀), 그 지역에서만.
     노말 성공률 기준 슬럼 2종 기대 ~33성공, 도심 3종 ~50성공 — 장기 pull. */
  blueprint: {
    dropChance: 0.06,
    regionItems: {
      slum: ['barrelfire', 'graffiti'],
      resort: ['skis', 'skipoles', 'snowboard'],
      citycore: ['neonvip', 'neonair', 'suit'],
    },
    // 도면 선택 가중 (디렉터 2026-07-09): 기본 1. 그래피티는 더 희귀하게(다른 슬럼 시그니처 대비 1/3).
    weights: { graffiti: 0.35 },
  },

  paint: {
    dropChance: 0.10,     // 성공 탐험당 도료 1통 확률 (디렉터 하향 2026-07-08: 16%→10% — 희소해야 도파민이 돈다)
    neonDropChance: 0.05, // 네온 안료(도심 전용 최희귀) — citycore 성공 탐험당 별도 롤. 일반 도료 풀과 무관 (디렉터 2026-07-09)
    merchant: { chance: 0.05 }, // 염료 상인 — 슬럼 탐험당 조우 확률(성패 무관). 값은 dyeCost(모드별 통조림 2/3/4)
    signatureWeight: 0.7, // 그 지역 시그니처 계열에서 뽑힐 확률 (나머지 30%는 전 계열 균일 — 어디서든 가끔은)
    // 지역 → 시그니처 계열 ("그 색은 거기서 잘 나온다" — 어려운 곳에 갈 이유. 12계열 전부 최소 1지역 보유)
    regionFamilies: {
      residential: ['whitewash', 'sage', 'oakStain'],
      commercial: ['mustard', 'terracotta', 'slateBlue'],
      industrial: ['redOxide', 'ashgray', 'charcoal'],
      slum: ['walnutStain', 'olive', 'charcoal'],
      harborYard: ['slateBlue', 'whitewash'],
      fishMarket: ['sage', 'ashgray'],
      resort: ['lavender', 'whitewash', 'sage'],
      checkpoint: ['olive', 'ashgray'],
      lab: ['charcoal', 'slateBlue'],
      citycore: ['lavender', 'mustard', 'redOxide'],
    },
  },

  /* ── 1.4 「금지 구역」 (신규 섹션) ──
     방호복·체류·금지 구역 지역·무전 송출 수치. 전부 신규라 기존 BAL 불가침 원칙과 무관.
     경제 게이트: 금지 구역은 방호복(고급 제작 정점) 필수라 기본 시뮬(container)에 영향 없음 —
       Day60 노말 밴드는 구조적으로 불변. 방호복 계보(희귀부품·천·절단기)는 후반 자원 기준.
     아래 수치가 밴드를 침범할 여지 없음(신규 지역은 successes 게이트로 후반 진입). */
  forbidden: {
    /* 방호복 — 고급 제작 정점. 재료: 희귀부품 다수 + 천 + (절단기 계보). 내구제 — 탐험 1회당 소모, 수리 가능. */
    hazmatCost: { parts: 6, cloth: 4, material: 2 }, // 제작 비용 (희귀부품 다수 + 천 상위 조합)
    hazmatDur: 5,             // 방호복 최대 내구 (탐험 1회당 -1)
    hazmatRepairCost: { cloth: 2, parts: 1 }, // 내구 전량 수리 비용 (닳으면 다시 채운다)
    hazmatRepairPerDur: 0,    // (예약) 부분 수리 미사용 — 전량 수리만

    /* 금지 구역 지역 해금 게이트 — 방호복은 후반 제작 정점이므로, 지역 노출 자체는 successes 후반선. */
    unlockAt: 33,             // 금지 구역 구역 노출 successes (로지와 동일 후반선 — 최종장 진입 눈높이)

    /* 무전 송출 — 완공된 무전 기지에서 수집한 방송/기록을 송출 → 지도 불빛 점등. */
    broadcastEnergy: 15,      // 송출 1회 에너지 (작업 행동과 동일 눈높이)
    broadcastPerAction: 1,    // 송출 1회당 켜지는 불빛(응답)의 목표 증가분 — 수집률 비례로 실제 점등은 별도 계산

    /* 벙커 지하 통로 경로 (1.1 clearPassage 복선 회수) — 통로 정리 완공 + 벙커 거주 시,
       연구동(lab)까지 지하망으로 이어져 접근 시간 단축(2번째 접근 경로). 정공법(검문소)의 우회. */
    undercroftLabTimeMult: 0.6, // 벙커 통로 경로로 연구동 접근 시 탐험 시간 배수 (지하 지름길)

    /* ── 2.0 낙진 시계 (GD-2.0 §2) — 핵겨울 낙진은 2~3년이면 가라앉는다. 겨울 셋을 넘기면:
       ① 금지 구역(checkpoint/lab)이 맨몸 개방(방호복 없이 진입 가능 — 단 잔류 방사능 부상 롤)
       ② 그 너머 도심 중심지(citycore)가 노출된다.
       방호복 재프레임: "먼저 들어가는 자의 어드밴티지"(1~3겨울 선진입) + 걷힌 뒤에도 부상 방어로 가치 유지.
       경제 게이트: winters>=3은 Day 145+ 후반 — Day30/60 시뮬 밴드 구조적 불변. */
    falloutWinters: 3,          // 낙진이 걷히는 넘긴 겨울 수 (state.winters >= 이 값)
    barehandInjuryChance: 0.45, // 걷힌 뒤 맨몸(방호복 없이) 금지 구역 탐험 시 잔류 방사능 부상 확률 (성패 무관 롤)
  },

  /* ── 2.0 대한파 프론트 (GD-2.0 §9.4-③ · DEPTH-DESIGN §10.2③ — Frostpunk 프론트의 1인칭 번역) ──
     연례 대한파: 겨울당 1회 확정, 겨울 고정일 발령(sim 결정론 — 랜덤 없음), 기존 랜덤 한파 상한 밖 별도.
     노말 = 계절 의식(예보→그 밤→memoir). 하드/하드코어 = 자기 규율 선택 모달(1개 선택·기간 지속,
     디렉터 확정 2026-07-08). 고양이 몫 선택지 금지(캐논). 수치는 초안 — sim/실측 튜닝 대상. */
  greatColdSnap: {
    forecastSeasonDay: 5,   // 겨울 5일차 아침: 대한파 예보 (리드 3일 — 랜덤 한파 예보 2일보다 김)
    hitSeasonDay: 8,        // 겨울 8일차: 발동 (고정 결정론 — Math.random 없음)
    durDays: 3,             // 지속 3일 (8~10일차, 겨울 12일 안에 종료)
    severityNormal: 2,      // 노말 대한파 강도 (랜덤 한파 1보다 한 단계 위 — 방어 2단은 갖춰야 무풍)
    severityHard: 3,        // 하드/하드코어 강도 (완전 방어에 3단 필요 — 준비의 벼랑)
    discipline: {           // 자기 규율(하드/하드코어 전용) — 효과는 프론트 기간 지속
      rationHungerMul: 0.65,  // 배급 반: 배고픔 감소 -35% (덜 먹고 버틴다 → 자동/수동 섭취 빈도 자체가 줄어 실질 식량 절약)
      rationComfort: 3,       // 배급 반: 쾌적 -3 (허리띠를 조른 집)
      sleeplessRestPen: 15,   // 쪽잠: 취침 회복 -15. 대신 난방 연료 격일 소비(불침번이 불을 지킨다)
      emergencyCanned: 4,     // 비상식량 개봉: 즉시 통조림 +4
      emergencyComfort: 4,    // 비상식량: 쾌적 -4 (바닥 보이는 찬장)
    },
  },

  /* ── 2.0 지역 숙련 (GD-2.0 §9.4-② · REWARD-LOOP ① — 디렉터 확정 2026-07-08) ──
     같은 지역 반복(성공+실패 포함) → 지리 지식 티어 → 성공률 가산 + 가구 발견율 가산.
     디렉터 원문: "각 지역을 일정 횟수(실패 포함 50회라던지) 달성하면 지리 지식을 획득해서 확률이 비약적으로 오른다".
     경제 게이트: regionVisits는 !_simRunning 가드 안에서만 증가(#85 시뮬 순수성) → 시드 시뮬 항상 티어 0,
       Day30/60 밴드 구조적 불변. 가구 발견율은 자원 경제 밖(코스매틱) — surplusCap 무관. */
  mastery: {
    tiers: [20, 50, 100],  // 시도 임계 → ★1/★2/★3 (디렉터 "50회" = 중간 티어의 비약)
    ratePerTier: 0.12,     // 티어당 성공률 가산 (지역 캡까지)
    capGain: 0.40,         // 지역별 숙련 캡 = base + capGain — 저확률 지역일수록 성장 여지가 크다
    capMax: 0.85,          // 절대 상한 — 숙련만으로 pity 천장(0.95)에 닿지 못하게 (하드가 시시해지지 않게)
    furnPerTier: 0.01,     // 티어당 가구 발견율 가산 — "단골은 좋은 물건 자리를 안다" (시그니처 코스매틱 트랙의 발판)
  },

  /* ── 2.0 적대 존재 다이얼 + 총 (GD-2.0 §9.2·9.3 — 디렉터 확정 2026-07-08) ──
     도심 중심지 전용, 오프스크린 판정만(온스크린 전투 금지 — 캐논). 모드 다이얼:
     노말/무한 = 소리·흔적만(손실 0, "둘러싸였으나 혼자"의 앰비언스) / 하드 = 조우 시 전리품 일부 손실 /
     하드코어 = 총 없으면 중상(critical), 총 있으면 1발로 격퇴(손실 0 — 로드아웃·정비의 결정).
     sim 게이트: citycore는 sim 로테이션 밖 + 조우 블록 !_simRunning 가드 — Day30/60 밴드 불가침. */
  hostile: {
    encounterChance: 0.35,   // 도심 중심지 트립당 조우 확률 (전 모드 동일 — 결과만 모드별로 갈린다)
    lootLossFactor: 0.5,     // 하드+: 조우 시 이번 트립 전리품을 잃는 비율 (가방 최소회수 안전망은 그 뒤에 적용 — 계약 유지)
    gunDur: 6,               // 총 내구(발) — 조우 격퇴 1회당 1발. 다 쓰면 빈 총(정비 필요)
    gunDropChance: 0.30,     // 도심 중심지 성공 탐험 시 총 발견 확률 (하드코어 전용·미보유 시 1정)
    gunRepairCost: { parts: 3, material: 1 }, // 총 정비 비용 — gateCost 모드 스케일 적용 (방호복 수리 문법)
    // 하드코어 악화 사슬(§9.3 "다단계"): 기존 방치-악화 롤의 목적지만 바꾼다(신규 RNG 없음 — 스트림 불변).
    //   minor→deep→critical. 노말/하드는 기존 →infection 유지.
  },

  /* ── 1.1 「얼어붙은 항구」 (신규 섹션) ──
     항구 지역·소금·염장·얼음낚시·밀수꾼 수치. 전부 신규라 기존 BAL 불가침 원칙과 무관.
     경제 게이트: 노말 Day60 시뮬이 기존 밴드(food+canned 40~120, 굶는 날 0)를 벗어나면
     아래 수치를 낮춰 재캘리브레이션(기존 REGIONS/economy 수치는 손대지 않는다). */
  harbor: {
    /* 항만 야적장 — "오늘 바다가 준 것": 매일 전리품 1종을 가중 랜덤으로 부스트(복권 파밍).
       daily reroll은 (state.day + 야적장 seed)로 결정론적 — 왕복 저장/시뮬 재현성 유지. */
    yardBoostMult: 2,          // 그날 뽑힌 1종 전리품 수량 배수 (편중 드랍 체감)
    yardBoostPool: ['cloth', 'parts', 'material', 'salt', 'canned'], // 부스트 후보(그날 1종만)

    /* 수산시장 폐허 — 식량 특화 + 소금 산지. 겨울엔 결빙으로 드랍 절반. */
    marketWinterMult: 0.5,     // 겨울 수산시장 드랍 배수 (결빙)

    /* 염장(salt cure) — 신선식품 2 + 소금 1 → 보존식 2. 냉장고 없는 초반의 부패 카운터. */
    saltCureFood: 2,           // 소요 신선식품
    saltCureSalt: 1,           // 소요 소금
    saltCureOut: 2,            // 산출 보존식(canned)

    /* 얼음낚시(겨울 전용, 물가 셸터) — 겨울이 처음으로 '받는 계절'이 되는 장치. */
    icefishEnergy: 10,         // 낚시 1회 에너지 소모
    icefishTimeMin: 180,      // 낚시 1회 소요 게임분 (2게임시간 = 120분? → 넉넉히 180 = 3시간, GD "2게임시간" 근사)
    icefishFoodMin: 1,         // 수확 신선식품 최소
    icefishFoodMax: 3,         // 수확 신선식품 최대
    icefishSaltChance: 0.35,   // 얼음 구멍 주변 소금 결정 획득 확률
    icefishSalt: 1,            // 소금 획득량
    icefishBottleChance: 0.04, // 극저확률 "이상한 병"(메모 병 편지) — 미수집 메모 드랍 게이트

    /* 밀수꾼 행상인 — 항구 한정, 계절 가격 극단(겨울 연료 프리미엄). 희귀품 교환. */
    smugglerFuelWinter: 3,     // 겨울: 연료 1 받는 대가로 요구하는 배터리 (평시 대비 3배 프리미엄)
    smugglerFuelNormal: 1,     // 평시: 연료 1 대가 배터리
    smugglerPartsCost: { salt: 3 }, // 소금 3 → 희귀부품 1 (항구 특산 소금의 교환 가치)
    smugglerPartsGet: 2,       // 받는 부품
  },

  /* ── 1.2 「지하 노선도」 (신규 섹션) ──
     허브 승격·버섯 재배·암시장·폭설 봉쇄 수치. 전부 신규라 기존 BAL 불가침 원칙과 무관.
     경제 게이트: 노말 Day60 시뮬이 기존 밴드(food+canned 40~120, 굶는 날 0)를 벗어나면
     아래 수치(특히 mushroomFoodPerDay)를 낮춰 재캘리브레이션(기존 REGIONS/economy 수치는 손대지 않는다).
     ※ 버섯은 지하철 셸터 전용 개조라 기본 시뮬(container)에는 영향 없음 — 밴드 불변이 구조적으로 보장된다. */
  subway: {
    /* 허브 승격 — 지하철 셸터를 확장 거점으로. 승격 비용(1회성): 선로 정비의 첫 삽.
       승격해야 선로 복구 프로젝트(subRail1~3)·암시장이 열린다. */
    hubCost: { material: 3, parts: 1 }, // 허브 승격 비용 (핸드카 정비 + 노선도 복원)

    /* 버섯 재배칸(가구 개조) — 어둠에서 자라는 식량. 옥탑 텃밭(볕/여름)의 대칭축(어둠/연중).
       옥탑 텃밭 food +2/일·겨울 휴면과 대비: 지하 버섯은 연중 생산이되 양은 절반(+1/일). 물 소모. */
    mushroomFoodPerDay: 1,     // 버섯 재배칸 일일 음식 생산 (겨울 포함 연중 — 어둠은 계절이 없다)
    mushroomWaterEvery: 2,     // N일마다 물 1 소모 (습기 관리) — 옥탑 텃밭보다 낮은 유지비, 낮은 산출
    mushroomWater: 1,          // 물 소모량

    /* 선로 개통 효과 — 구간별 연결 지역. openSegN 효과가 이 매핑으로 state.subwayOpen을 세운다. */
    segRegions: { 1: 'residential', 2: 'commercial', 3: 'industrial' },
    openTimeMult: 0.5,         // 개통 구간 연결 지역 탐험 시간 배수 (-50%)

    /* 폭설 봉쇄(최소 구현) — 겨울 '눈' 날씨 중 지상 지역은 탐험 봉쇄. 개통 구간은 예외(지하 우회).
       계절 압박의 우회로를 "건설로 산다". 결정론: 날씨(snow)+겨울 조건만으로 판정(랜덤 없음 — 재현성). */
    blizzardBlocksExpedition: true, // 겨울 눈 날씨에 미개통 지상 지역 탐험 봉쇄 여부

    /* 암시장(허브 승격 후 개방) — 잉여 물물교환 = 후반 인플레의 최종 싱크. 화폐 없음(캐논: 교환만 남았다).
       캐논 연출: 상인도 흐르는 타인 — 얼굴 없는 교환대. 하루 교환 슬롯 제한 + 개통 구간 수로 슬롯/레이트 개선.
       레이트는 "잉여를 덜 흔한 것으로": 흔한 자원 다수 → 귀한 자원 소량. 겨울 연료 프리미엄(항구 밀수꾼과 캐논 공유). */
    marketBaseSlots: 2,        // 하루 기본 교환 횟수 (허브 승격 직후)
    marketSlotsPerSeg: 1,      // 개통 구간 1개당 +1 슬롯 (선로가 물류를 늘린다)
    marketRateBonusPerSeg: 1,  // 개통 구간 1개당 교환 산출 +1 (레이트 개선 — 아래 offers의 getBonus에 가산)
    // 교환대 품목: give(내는 잉여) → get(받는 것). 겨울 프리미엄은 winterGive로 대체 비용 명시.
    //   scale:true 오퍼는 BAL.encounters.{costMul,barterMul} 모드 배수 적용(암상인이 난이도로 인심을 가른다).
    //   양성 싱크(부패/지식)는 scale 없음 — 난이도로 조일 대상이 아님.
    //   2026-07-07 베이스 조임(디렉터 "천4→배터리1 교환비가 너무 좋다"): 흔한 자원→귀한 자원 4→6.
    marketOffers: [
      { id: 'foodToCanned', give: { food: 3 }, get: 'canned', getN: 2 },     // 남는 신선식품 → 통조림 (부패 싱크, 불변)
      { id: 'materialToParts', give: { material: 6 }, get: 'parts', getN: 1, scale: true }, // 흔한 건축재 → 귀한 부품 (4→6)
      { id: 'clothToBattery', give: { cloth: 6 }, get: 'battery', getN: 1, scale: true },   // 남는 천 → 배터리 (4→6, 디렉터 지적)
      { id: 'partsToFuel', give: { parts: 2 }, get: 'fuel', getN: 1, winterGive: { parts: 3 }, scale: true }, // 부품 → 연료 (겨울 프리미엄)
      // #76 「지식과 사치」 암시장 확장 — 넘치는 식량을 책(지식)으로. 지식 싱크라 scale 없음(불변).
      { id: 'foodToBook', give: { food: 10 }, get: 'book', getN: 1 },     // 남는 신선식품 → 책
      { id: 'cannedToBook', give: { canned: 10 }, get: 'book', getN: 1 }, // 남는 통조림 → 책
    ],
  },

  /* ── 1.3 「고요한 고원」 (신규 섹션) ──
     고도 페널티·눈사태·온천·밤하늘 수치. 전부 신규라 기존 BAL 불가침 원칙과 무관.
     경제 게이트: 로지는 successes 33+ 후반 셸터라 기본 시뮬(container)에 영향 없음 — Day60 밴드는 구조적으로 불변.
     아래 수치가 Day60 노말 밴드(110~160)를 침범하면 낮춰 재캘리브레이션(기존 REGIONS/economy 수치는 손대지 않는다). */
  highland: {
    /* 고도 페널티 — 스키 로지 거주 시. 연료 소모 +30% · 한파 빈도 +1(리스크). 로지의 최고 단열/벽난로가 상쇄(리워드). */
    altitudeFuelMult: 1.3,        // 로지 거주 시 연료 소모 배수 (벽난로 유지비 + 조명/가전 연료)
    altitudeColdSnapBonus: 1,     // 로지 거주 시 겨울 한파 발동 확률 가산 단계(coldSnapChancePerDay에 ×(1+이 값×보정))
    altitudeColdSnapChanceMul: 1.3, // 위 가산의 실제 확률 배수 (고원은 한파가 더 잦다)
    hearthWinterComfort: 8,       // 붙박이 벽난로 겨울 쾌적 보너스 (comfortDetail — 온풍기 6보다 큰 정점)

    /* 케이블카 복구 — 리조트(고원) 접근 시간. 완공 전 등반(×raw)에서 완공 후 곤돌라(×done)로 단축. */
    cablecarTimeRaw: 1.4,         // 케이블카 복구 전 리조트 접근 시간 배수 (등반)
    cablecarTimeDone: 0.7,        // 케이블카 복구 후 리조트 접근 시간 배수 (곤돌라 — 등반 대비 절반)

    /* 눈사태(겨울 고원 한정 재난 2호) — 예보(우르릉)→ 리조트 탐험 당일 우회 선택.
       한파 예보 문법 재사용. cozy 캐논: 사망 없음 — 결과는 부상/시간 손실 계열. */
    avalancheChancePerDay: 0.16,  // 겨울 하루당 눈사태 예보 발령 확률 (겨울에 리조트가 열려 있을 때만 의미)
    avalancheForecastDays: 1,     // 눈사태 예보 리드타임 (일) — 한파보다 짧다(즉각적 산악 재난)
    avalancheDur: 3,              // 예보 미대비 시 리조트 봉쇄 지속 (일) — GD "3일 봉쇄"
    avalancheDetourTimeMult: 1.6, // 위험 우회로 선택 시 탐험 시간 배수 (시간 증가)
    avalancheDetourRatePen: 0.15, // 위험 우회로 성공률 페널티 (-15%p, GD 준수)
    avalancheDetourLootMult: 1.5, // 위험 우회로 보상 배수 (1.5배, GD 준수 — 리스크·리워드)
    avalancheInjuryChance: 0.35,  // 우회 실패 시 부상 확률 (사망 없음 — 부상/시간 손실만)

    /* 온천(로지 전용 개조) — cozy의 정점. 쾌적 온기 축 대형 + 취침 에너지 회복 보너스. */
    onsenComfort: 10,             // 온천 쾌적 보너스 (온기 축, GD "+10")
    onsenRestBonus: 12,          // 온천 취침 에너지 회복 보너스 (restEnergyValue 가산 — 대형)

    /* 밤하늘 수집(관측소 완공 후, 맑은 밤) — 유성우/오로라 이벤트 → 수첩 스케치 6종. 감상 보상. */
    nightSkyChance: 0.30,         // 관측소 완공 후 맑은 밤 하루당 밤하늘 이벤트 발동 확률 (미수집 스케치 있을 때)
  },

  /* ── F-1a 야생동물 로밍 (systems/wildlife.js) ──
     디렉터 오더(TLOU 레퍼런스): 희소 조우 모델. 정적이 기본, 동물은 사건.
     정적이 기본값 — 동시 최대 1마리(새 떼만 예외로 2~3). 30~90 게임분에 1회 등장,
     20~60초 머물다 퇴장. 겨울엔 더 드묾. 발자국만 남는 아침(동물 없이 데칼)도 있다. */
  wildlife: {
    spawnGapMin: 30,          // 등장 최소 간격 (게임분) — 다음 조우까지 이 시간 이상
    spawnGapMax: 90,          // 등장 최대 간격 (게임분)
    stayMinSec: 20,           // 등장 후 최소 체류 (실초)
    stayMaxSec: 60,           // 등장 후 최대 체류 (실초)
    winterRareMult: 0.5,      // 겨울 등장 확률 배수 (더 드묾)
    flockChance: 0.35,        // 새 종 등장 시 무리(2~3마리) 확률 — 그 외엔 1마리
    flockMin: 2, flockMax: 3, // 무리 크기 범위
    lowSpecFlockMax: 2,       // 저사양 무리 상한
    printOnlyChance: 0.4,     // 아침(동틀녘) 등장 대신 발자국만 남을 확률 ("밤새 뭔가 지나갔다")
    printFadeSec: 220,        // 발자국 데칼 페이드아웃 시간 (실초)
  },
};
