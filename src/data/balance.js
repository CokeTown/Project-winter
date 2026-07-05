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

  /* ── 취침 / 에너지 (restEnergyValue) ── */
  rest: {
    bedEnergy: 90,       // 침대에서 취침 시 회복 에너지
    floorEnergy: 65,     // 바닥 취침 회복 에너지
    cozyThreshold: 75,   // comfort 이 값 이상이면 취침 보너스
    cozyBonus: 10,       // 취침 에너지 보너스 (cozy 달성 시)
  },

  /* ── 탐험 (startExpedition / _simDaysInner 탐험 비용) ── */
  exp: {
    perDay: 5,           // EXP_PER_DAY: 하루 탐험 가능 횟수
    energyCost: 20,      // 탐험 1회 에너지 소모
    hungerCost: 4,       // 탐험 1회 배고픔 소모 (sim 경로)
    thirstCost: 5,       // 탐험 1회 갈증 소모 (sim 경로)
    minEnergy: 20,       // 탐험 출발 최소 에너지 (startExpedition 게이트)
    midRest: 20,         // 탐험 사이 energy<20 시 간이 회복 (sim 경로)
    hungryPenGate: 25,   // hunger/thirst 이 값 미만이면 성공률 페널티 (rateParts)
    hungryPen: 0.10,     // 허기/갈증 성공률 페널티량
  },

  /* ── 하드 모드 (hardLoot / decayGauges / sim expMul) ── */
  hard: {
    lootMul: 0.7,        // 하드 전리품 배수 (기댓값 보존 확률 반올림)
    drainMul: 1.5,       // 하드 게이지 소모 배수
    expMul: 1.5,         // 하드 탐험 게이지 소모 배수 (sim)
    /* 하드 겨울 한파 강화 (v1.0.0, REQ-BAL-02 후속) — 광고 수치(loot/drain)와 별개로
       "첫 겨울이 진짜 시험" 카피를 체감시키는 압박 레버. 탈진 유발이 아니라
       한파일수 증가(쾌적 -12, 탐험 -10%p, 배고픔 ×1.5)로 겨울 긴장을 만든다. */
    coldSnapChanceMul: 1.6,    // 하드 한파 발동 확률 배수 (0.14 → 0.224/일)
    coldSnapExtraPerWinter: 1, // 하드 겨울당 한파 상한 +1 (2 → 3회)
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

  /* ── 인카운터 / 수집 (Phase D #12·#35) ── */
  events: {
    dailyChance: 0.60,     // 아침 결산 시 랜덤 인카운터 발동 확률 (기존 하드코딩 0.60 이관)
    midExpChance: 0.10,    // 탐험 중간(50% 지점) 인카운터 발동 확률 (기존 0.10 이관)
    memoDropChance: 0.12,  // 탐험 성공 시 지역 메모 1개 드랍 확률
    willDropChance: 0.02,  // 탐험 성공 시 생존자 유서 드랍 확률 (극저확률, REQ-LORE-01: 1.5~2.5% 밴드)
    radioListenChance: 0.18, // 라디오 ON 상태 하루 1회 방송 청취 확률
  },

  /* ── 입력 / 게임패드 (#14 REQ-INP-02) ── */
  input: {
    padDeadzone: 0.15,      // 스틱 데드존 (미만은 0 처리)
    padCursorSpeed: 780,    // 가상 커서 속도 (px/초, 스틱 최대 기울기 기준)
    padCameraSpeed: 2.6,    // 우스틱 카메라 회전 속도 (rad/초 계수)
    padZoomStep: 1.06,      // LB/RB 줌 스텝 (프레임당 배수, 홀드 연속 줌)
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
};
