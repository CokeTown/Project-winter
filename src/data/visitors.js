/* ============================================================
   data/visitors.js — 방문자 교환·대사 밸런스 테이블 (Fable 관리)
   ------------------------------------------------------------
   #181 인엔진 방문자 인카운터. 교환(offers)·대사(voices)를 한 곳에서 관리한다.
   - 스폰 시 offers 중 랜덤 1개 → 콤팩트 카드 선택지(want를 내면 give를 받음). "고정 교환 → 다양"
   - voices 중 랜덤 1줄 → 라디오 버블 대사(얼굴 없이 목소리만).
   - 교환 없는 방문자(거지)는 beg:true — 대사만, 선택지는 events.js(음식 나눔/거절) 유지.

   ── 교환비 정합 기준 (게임 경제 실측, 2026-07-14) ──
   자원 가치(cu, 흔함=1): food·cloth·material·water·candle 1 · canned 1.5 · salt 4 ·
                          battery·parts 6 · fuel 8(겨울 16) · bandage 3 · antiseptic 5.
   기준 교환비: 흔한→희귀 6:1 등가 (암시장 material6→parts1 / cloth6→battery1).
               희귀↔희귀 (밀수꾼 salt3→parts2 / battery1→fuel1).
   원칙: 방문자 교환은 ~등가(가치in ≈ 가치out). 편의·계절 프리미엄은 소폭만.

   offer 필드:
     want      = 플레이어가 내는 것  { 자원: 수량 }
     give      = 플레이어가 받는 것  { 자원: 수량 }
     scale     = 난이도 배수 적용 → want ×costMul(하드1.25·하드코어1.5), give ×barterMul(하드0.7·하드코어0.5)
                 (암시장·밀수꾼과 동일. 하드/하드코어일수록 양방으로 야박. 생략=고정)
     winterWant= 겨울엔 이 want로 대체(연료 프리미엄). 생략=계절 무관.
     risk      = 'infection' 등 부작용(50%). 생략=없음. (risk 오퍼는 함정성이라 scale 미적용)
   대사 = { ko, en } 인라인(lore.js 방식). 톤: 단파 무전처럼 짧고 끊기게(…, — 활용).
   자원 id: food·canned·water·cloth·candle·fuel·material·parts·battery·salt·bandage·antiseptic
   ============================================================ */
export const VISITOR_TABLE = {
  trader: { // 행상 (foot · ALICE 대형백) — 잡화·의료·통화
    voices: [
      { ko: '물건 볼 텐가. 손해 보는 장사는 안 하지.', en: "Care to look? I don't trade at a loss." },
      { ko: '쓸 만한 게 있는데. 거래 트겠나?', en: 'Got something useful. Care to deal?' },
    ],
    offers: [
      { id: 'tr_med', want: { battery: 2 }, give: { bandage: 1, antiseptic: 1 }, scale: true }, // 의료 편의(프리미엄): 12cu→~8cu
      { id: 'tr_bat', want: { canned: 4 }, give: { battery: 1 }, scale: true },                 // 흔한→희귀 등가(6cu↔6cu)
      { id: 'tr_mat', want: { material: 6 }, give: { parts: 1 }, scale: true },                 // 시장 기준가 6:1
    ],
  },
  smuggler: { // 밀수꾼 (boat · 항구) — 연료·부품(정본 밀수 교환비)
    voices: [
      { ko: '…배 곧 뜬다. 살 거면 지금.', en: '…Boat leaves soon. Buy now or never.' },
      { ko: '조용히. 값만 맞으면 돼.', en: 'Quiet. Just meet the price.' },
    ],
    offers: [
      { id: 'sm_fuel', want: { battery: 1 }, winterWant: { battery: 3 }, give: { fuel: 1 }, scale: true }, // 정본 연료(겨울 3×)
      { id: 'sm_parts', want: { salt: 3 }, give: { parts: 2 }, scale: true },                    // 정본 소금→부품 등가
    ],
  },
  spoil_merchant: { // 상한물건상 (foot · 여름) — 싸 보이지만 상함(함정, 등가 무시·scale 없음)
    voices: [
      { ko: '반값이오. 안 볼 거요?', en: 'Half price. Not looking?' },
      { ko: '싸게 넘기지. 운은 알아서.', en: "Cheap. The luck's your own." },
    ],
    offers: [
      { id: 'sp_canned', want: { cloth: 2 }, give: { canned: 3 }, risk: 'infection' }, // 싸 보이는 통조림 — 50% 감염
      { id: 'sp_food', want: { cloth: 2 }, give: { food: 3 }, risk: 'infection' },
    ],
  },
  harsh_barter: { // 각박한 거래 (foot · 하드/하드코어 겨울) — 겨울 연료 폭리(scale로 가중)
    voices: [
      { ko: '값은 내가 정해. 싫으면 관두고.', en: 'I set the price. Take it or leave it.' },
      { ko: '겨울이 값을 올리지. 어쩌겠나.', en: 'Winter drives it up. Nothing to be done.' },
    ],
    offers: [
      { id: 'hb_fuel', want: { canned: 3 }, give: { fuel: 1 }, scale: true }, // 겨울 연료(하드코어 canned5→fuel1로 가중)
      { id: 'hb_bat', want: { canned: 3 }, give: { battery: 1 }, scale: true },
    ],
  },

  // ── 거지(교환 아님) — 대사만. 선택지는 events.js 유지. ──
  wanderer: { // 떠돌이 (door)
    beg: true,
    voices: [
      { ko: '…먹을 것 좀. 뭐든 좋소.', en: '…Some food. Anything at all.' },
      { ko: '…며칠을 굶었소. 조금만.', en: "…Haven't eaten in days. Just a little." },
    ],
  },
  desperate_knock: { // 절박한 노크 (door · 하드/밤)
    beg: true,
    voices: [
      { ko: '…아무거나. 먹을 수 있는 거면.', en: '…Anything. Anything you can eat.' },
      { ko: '…문 좀. 잠깐이면 되오.', en: '…Please. Just a moment.' },
    ],
  },
  // coldsnap_stranger = 쓰러진 채 무언 → 표 없음(버블 없이 카드만).
};

// 콤팩트 카드 공용 라벨/결과문 (인라인 ko/en — 표에서 관리)
export const VISITOR_UI = {
  decline: { ko: '고개를 젓는다', en: 'Shake your head' },
  tradeOk: { ko: '거래를 마쳤다.', en: 'The trade is done.' },
  tradeBad: { ko: '거래는 마쳤지만 — 나중에야 물건이 상한 걸 알았다.', en: 'The trade is done — but the goods turn out spoiled.' },
};
