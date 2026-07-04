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
  },
};
