/* ============================================================
   data/knowledge.js — 「지식」 테크트리 데이터 (깊이 설계 DEPTH-DESIGN §9)
   ------------------------------------------------------------
   책(#76)으로 여는 영구 지식 트리. 4갈래(온기/자급/살림/앎) × 3티어.
   갈래당 비용 1→2→3권(아래일수록 선행 필수) = 6권/갈래, 전부 24권(여러 겨울 장기 목표).
   순수 데이터(의존성 0 — import 금지, 순환 방지). 해금 판정·효과 집계는 core/knowledge.js.
   effect = core 게터가 합산/판정해 game.js가 기존 시스템(coldDefense/comfort/exp 등)에 먹인다.
     지식은 영구·전 셸터 패시브. 기존 개조와 중복 아니라 max(합산 ✗) — 각 훅에서 규정.
   ============================================================ */
export const KNOWLEDGE_BRANCHES = [
  { id: 'warmth', name: '온기', nameEn: 'Warmth', emoji: '' },
  { id: 'supply', name: '자급', nameEn: 'Self-sufficiency', emoji: '' },
  { id: 'home',   name: '살림', nameEn: 'Homemaking', emoji: '' },
  { id: 'lore',   name: '앎',   nameEn: 'Knowing', emoji: '' },
];

// tier 1→2→3 = 책 1→2→3권 (선행 필수). effect 키는 core/knowledge.js 게터와 짝.
export const KNOWLEDGE = {
  // 온기 — 하드의 최대 압박(한파)에 대응
  insulation: { branch: 'warmth', tier: 1, cost: 1, name: '단열', nameEn: 'Insulation',
    desc: '벽과 창을 여며 냉기를 막는 법. 전 셸터가 단열된다.', descEn: 'Sealing walls and windows against the cold. Every shelter gains insulation.',
    effect: { coldDefense: 1, insulates: true } },
  effHeating: { branch: 'warmth', tier: 2, cost: 2, name: '효율 난방', nameEn: 'Efficient Heating',
    desc: '적은 연료로 오래 데우는 법. 난방 연료 소비 −25%.', descEn: 'More warmth from less fuel. Heating fuel use −25%.',
    effect: { heatFuelMul: 0.75 } },
  hearthCraft: { branch: 'warmth', tier: 3, cost: 3, name: '화덕', nameEn: 'Hearthcraft',
    desc: '어느 집에나 벽난로를 놓는 법. 겨울 온기와 한파 방어.', descEn: 'Building a hearth in any home. Winter warmth and cold defense.',
    effect: { hearthAnywhere: true, coldDefense: 1, winterComfort: 8 } },
  // 자급 — 탐험 의존을 줄인다
  purify: { branch: 'supply', tier: 1, cost: 1, name: '정수', nameEn: 'Purification',
    desc: '이슬과 빗물을 모아 거르는 법. 매일 깨끗한 물 +1.', descEn: 'Gathering and filtering dew and rain. Clean water +1 daily.',
    effect: { waterPerDay: 1 } },
  gardening: { branch: 'supply', tier: 2, cost: 2, name: '텃밭', nameEn: 'Gardening',
    desc: '어디서든 기르는 법. 소형 텃밭 식량 +1/일, 수확 +1.', descEn: 'Growing anywhere. A small garden yields food +1/day, harvests +1.',
    effect: { gardenAnywhere: 1, gardenBonus: 1 } },
  preserve: { branch: 'supply', tier: 3, cost: 3, name: '보존', nameEn: 'Preservation',
    desc: '상하지 않게 갈무리하는 법. 부패 −50%, 염장 +1.', descEn: 'Keeping food from spoiling. Spoilage −50%, salt-cure +1.',
    effect: { spoilMul: 0.5, saltCureBonus: 1 } },
  // 살림 — 코지의 심장
  tidiness: { branch: 'home', tier: 1, cost: 1, name: '정리', nameEn: 'Tidiness',
    desc: '집을 늘 갈무리하는 손. 일일 청결 감소 −0.5.', descEn: 'A hand that keeps a home in order. Daily grime −0.5.',
    effect: { dirtReduce: 0.5 } },
  handiness: { branch: 'home', tier: 2, cost: 2, name: '손재주', nameEn: 'Handiness',
    desc: '아껴 만드는 솜씨. 제작 재료 −20%.', descEn: 'Making do with less. Crafting materials −20%.',
    effect: { craftMul: 0.8 } },
  coziness: { branch: 'home', tier: 3, cost: 3, name: '아늑함', nameEn: 'Coziness',
    desc: '집을 집답게 하는 경지. 쾌적 +6.', descEn: 'The art of a home that feels like one. Comfort +6.',
    effect: { comfortBonus: 6 } },
  // 앎 — 탐험 + 엔딩 스파인
  scouting: { branch: 'lore', tier: 1, cost: 1, name: '정찰', nameEn: 'Scouting',
    desc: '길을 읽는 눈. 전 지역 탐험 성공률 +4%p.', descEn: 'An eye for the way. Expedition success +4%p everywhere.',
    effect: { expBonus: 0.04 } },
  forecasting: { branch: 'lore', tier: 2, cost: 2, name: '예보', nameEn: 'Forecasting',
    desc: '하늘을 미리 읽는 법. 한파·눈사태 예보 +1일.', descEn: 'Reading the sky ahead. Cold-snap and avalanche forecast +1 day.',
    effect: { forecastLead: 1, grantForecast: true } },
  radioKnow: { branch: 'lore', tier: 3, cost: 3, name: '무전', nameEn: 'Radiocraft',
    desc: '전파로 세상에 닿는 법. 송출 도달 +1, 날씨 예보.', descEn: 'Reaching the world by radio. Broadcast reach +1, weather forecast.',
    effect: { broadcastBonus: 1, grantForecast: true } },
};
