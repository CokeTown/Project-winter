/* ============================================================
   data/visitors.js — 방문자 교환·대사 밸런스 테이블 (디렉터 관리용)
   ------------------------------------------------------------
   #181 인엔진 방문자 인카운터. 교환(offers)·대사(voices)를 한 곳에서 관리한다.
   - 스폰 시 offers 중 랜덤 1개 → 콤팩트 카드 선택지(want를 내면 give를 받음). "고정 교환 → 다양"
   - voices 중 랜덤 1줄 → 라디오 버블 대사(얼굴 없이 목소리만).
   - 교환 없는 방문자(거지)는 beg:true — 대사만, 선택지는 events.js(음식 나눔/거절) 유지.

   offer 필드 (밸런스 튜닝은 이 표에서):
     want  = 플레이어가 내는 것  { 자원: 수량 }
     give  = 플레이어가 받는 것  { 자원: 수량 }
     scale = 난이도 비용 배수(encCostMul) 적용 → 하드일수록 want ↑ (생략=고정)
     risk  = 'infection' 등 부작용 플래그 (50% 발동, 생략=없음)
   대사 = { ko, en } 인라인 (lore.js 방식). 톤: 단파 무전처럼 짧고 끊기게 (…, — 활용).
   자원 id 참고: food·canned·water·cloth·candle·fuel·material·parts·battery·salt·bandage·antiseptic
   ============================================================ */
export const VISITOR_TABLE = {
  trader: { // 행상 (foot · ALICE 대형백)
    voices: [
      { ko: '물건 볼 텐가. 손해 보는 장사는 안 하지.', en: "Care to look? I don't trade at a loss." },
      { ko: '쓸 만한 게 있는데. 거래 트겠나?', en: 'Got something useful. Care to deal?' },
    ],
    offers: [
      { id: 'tr_med', want: { battery: 2 }, give: { bandage: 1, antiseptic: 1 }, scale: true },
      { id: 'tr_bat', want: { canned: 3 }, give: { battery: 2 }, scale: true },
      { id: 'tr_cloth', want: { parts: 2 }, give: { cloth: 3 }, scale: true },
    ],
  },
  smuggler: { // 밀수꾼 (boat · 항구)
    voices: [
      { ko: '…배 곧 뜬다. 살 거면 지금.', en: '…Boat leaves soon. Buy now or never.' },
      { ko: '조용히. 값만 맞으면 돼.', en: 'Quiet. Just meet the price.' },
    ],
    offers: [
      { id: 'sm_fuel', want: { battery: 2 }, give: { fuel: 1 }, scale: true },
      { id: 'sm_parts', want: { salt: 3 }, give: { parts: 2 }, scale: true },
    ],
  },
  spoil_merchant: { // 상한물건상 (foot · 여름)
    voices: [
      { ko: '반값이오. 안 볼 거요?', en: 'Half price. Not looking?' },
      { ko: '싸게 넘기지. 운은 알아서.', en: "Cheap. The luck's your own." },
    ],
    offers: [
      { id: 'sp_canned', want: { battery: 1 }, give: { canned: 2 }, risk: 'infection' },
      { id: 'sp_food', want: { cloth: 2 }, give: { food: 2 }, risk: 'infection' },
    ],
  },
  harsh_barter: { // 각박한 거래 (foot · 하드/겨울)
    voices: [
      { ko: '값은 내가 정해. 싫으면 관두고.', en: 'I set the price. Take it or leave it.' },
      { ko: '겨울이 값을 올리지. 어쩌겠나.', en: 'Winter drives it up. Nothing to be done.' },
    ],
    offers: [
      { id: 'hb_fuel', want: { canned: 3 }, give: { fuel: 1 }, scale: true },
      { id: 'hb_bat', want: { canned: 2 }, give: { battery: 1 }, scale: true },
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
