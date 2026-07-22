/* ============================================================
   events.js — Nine Winters 인카운터(EVENTS) 데이터 (콘텐츠 분리 Phase 1)
   ------------------------------------------------------------
   목적: 25종 인카운터 테이블을 game.js에서 분리한다. choices[].run()/cost()·textFn
         등 함수 필드는 game.js 내부 심볼(state·resAdd·t 등)을 참조하므로,
         팩토리 makeEvents(ctx)로 내보내고 game.js가 ctx를 넘겨 생성한다(의존성 주입).
   원칙: import 방향은 game→data 단방향(여긴 game.js를 import하지 않는다).
         함수 본문은 원본과 문자열 동일 — ctx를 동일 이름 지역변수로 구조분해해
         클로저 바디를 한 글자도 바꾸지 않는다(행동 보존).
   ctx 필드(모두 game.js가 소유·정의): 데이터 t,LN,RESOURCES,DEFS,MEMOS,
         MEMOS_RESEARCH,BROADCASTS,BAL / 상태참조 state,items / 함수 resAdd,resConsume,
         addMoodBuff,applyInjury,seasonOf,coldSnapActive,dropMemo,dropBroadcast,
         recordDistantLight,spawnCat,playSfx,runEndingSequence,runRebuildSequence,doctorFragmentsComplete.
         (state/items는 const 참조 — game.js에서 재할당되지 않아 캡처가 안전하다.)
   출처: game.js EVENTS (원본 그대로 이동, 팩토리로 래핑).
   ============================================================ */
export function makeEvents(ctx) {
  const {
    t, LN, RESOURCES, DEFS, MEMOS, MEMOS_RESEARCH, BROADCASTS, BAL,
    state, items,
    resAdd, resConsume, addMoodBuff, applyInjury, seasonOf, coldSnapActive,
    dropMemo, dropBroadcast, recordDistantLight, spawnCat, playSfx,
    runEndingSequence, runRebuildSequence, doctorFragmentsComplete,
    endingLeaning, // 2.0 §9.5: 엔딩 성향(누적 신호 기반 — 3분기 문안 뉘앙스)
    encCostMul, encBarterMul, // 밀수꾼 모드 배수 (교환 야박도 — 암시장과 캐논 공유)
    PAINT_FAMILIES, buyDye, dyeCost, // 염료 상인 (디렉터 2026-07-08 — 도료 교환 채널)
    collapseEntranceLoot, // #165 탐험 리스크 인카운터 — 보상 롤 (도료·도면·고양이·잡동사니)
    dlcOwns, // #119 서포터팩 DLC 소유 판정 (러시안블루 보장 지급)
  } = ctx;
  const EVENTS = {
    wanderer: {
      icon: '', titleId: 'ev.wanderer.title', textId: 'ev.wanderer.text',
      arrive: 'door', // #181 홀로 온 거지 — 계단으로 문 앞까지 (수레 아님)
      choices: [
        { labelId: 'ev.wanderer.c0', cost: { food: 2 }, run() { state.buff = { exp: 0.10, labelId: 'buff.wanderer' }; return t('ev.wanderer.r0'); } },
        { labelId: 'ev.wanderer.c1', run() { return t('ev.wanderer.r1'); } },
      ],
    },
    trader: {
      icon: '', titleId: 'ev.trader.title', textId: 'ev.trader.text',
      arrive: 'foot', // #181 수레 끄는 행상 — 지상 셸터만
      choices: [
        { labelId: 'ev.trader.c0', cost: { battery: 2 }, run() { resAdd('bandage', 1); resAdd('antiseptic', 1); return t('ev.trader.r0'); } },
        { labelId: 'ev.trader.c1', run() { return t('ev.trader.r1'); } },
      ],
    },
    dog: {
      icon: '', titleId: 'ev.dog.title', textId: 'ev.dog.text',
      choices: [
        { labelId: 'ev.dog.c0', cost: { food: 1 }, run() { state.buff = { exp: 0.10, labelId: 'buff.dog' }; return t('ev.dog.r0'); } },
        { labelId: 'ev.dog.c1', run() { return t('ev.dog.r1'); } },
      ],
    },
    // 1.1 밀수꾼 행상인 — 항구 한정, 지나가는 존재(캐논: 타인은 흐른다). 계절 가격 극단(겨울 연료 프리미엄).
    smuggler: {
      icon: '', titleId: 'ev.smuggler.title', textId: 'ev.smuggler.text',
      arrive: 'boat', // #181 배로 접안 — 물가 셸터만
      when: { districts: ['harbor'], dayOnly: true },
      choices: [
        // 겨울이면 연료 프리미엄(배터리 3), 평시엔 배터리 1 — 계절로 대가가 갈린다. 모드 배수(costMul)로 야박도 가산.
        { labelId: 'ev.smuggler.c0',
          cost() { return { battery: Math.max(1, Math.round((seasonOf().id === 'winter' ? BAL.harbor.smugglerFuelWinter : BAL.harbor.smugglerFuelNormal) * encCostMul())) }; },
          run() { resAdd('fuel', 1); return t(seasonOf().id === 'winter' ? 'ev.smuggler.r0winter' : 'ev.smuggler.r0'); } },
        // 소금 → 희귀부품 (항구 특산의 교환 가치). 모드 배수: 내는 소금 costMul, 받는 부품 barterMul.
        { labelId: 'ev.smuggler.c1',
          cost() { return { salt: Math.max(1, Math.round(BAL.harbor.smugglerPartsCost.salt * encCostMul())) }; },
          run() { resAdd('parts', Math.max(1, Math.round(BAL.harbor.smugglerPartsGet * encBarterMul()))); return t('ev.smuggler.r1'); } },
        { labelId: 'ev.smuggler.c2', run() { return t('ev.smuggler.r2'); } },
      ],
    },
    storm: {
      icon: '', titleId: 'ev.storm.title', textId: 'ev.storm.text',
      // #163 재게이트(아트 재분배): 일러스트가 무설(헐벗은 나무+강풍) = 환절기 돌풍 — 가을·봄으로 보낸다.
      when: { seasons: ['autumn', 'spring'] },
      choices: [
        { labelId: 'ev.storm.c0', cost: { material: 1 }, run() { return t('ev.storm.r0'); } },
        { labelId: 'ev.storm.c1', run() { state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 10); return t('ev.storm.r1'); } },
      ],
    },
    broken: {
      icon: '', titleId: 'ev.broken.title', textId: 'ev.broken.text',
      choices: [
        { labelId: 'ev.broken.c0', cost: { parts: 1 }, run() { return t('ev.broken.r0'); } },
        { labelId: 'ev.broken.c1', run() { state.buff = { exp: -0.05, labelId: 'buff.broken' }; return t('ev.broken.r1'); } },
      ],
    },
    thief: {
      icon: '', titleId: 'ev.thief.title', textId: 'ev.thief.text',
      arrive: 'trace', // #181 밤사이 흔적(발자국) — 지상 접근 가능한 곳만
      choices: [
        { labelId: 'ev.thief.c0', run() {
          const lit = items.some(it => DEFS[it.defId].light && it.on !== false);
          if (lit) return t('ev.thief.r.safe');
          for (const rid of ['bandage', 'battery', 'food']) {
            if ((state.res[rid] || 0) > 0) { resConsume(rid, 1); return t('event.stolen', { name: LN(RESOURCES[rid]) }); }
          }
          return t('ev.thief.r.none');
        } },
      ],
    },
    seeds: {
      icon: '', titleId: 'ev.seeds.title', textId: 'ev.seeds.text',
      // #163 재게이트: 씨앗=파종 — 봄 정체성으로. (일러스트는 중립 정물이라 그대로)
      when: { seasons: ['spring'] },
      choices: [
        { labelId: 'ev.seeds.c0', cost: { water: 2 }, run() {
          if (state.current === 'greenhouse') { resAdd('food', 3); return t('ev.seeds.r.green'); }
          resAdd('food', 1);
          return t('ev.seeds.r.plain');
        } },
        { labelId: 'ev.seeds.c1', run() { return t('ev.seeds.r1'); } },
      ],
    },
    radio_sig: {
      icon: '', titleId: 'ev.radio.title', textId: 'ev.radio.text',
      when: { needsRadio: true }, // (구 cond: 라디오 보유 시에만) — 동작 불변, 스키마 이관
      choices: [
        { labelId: 'ev.radio.c0', run() { state.buff = { loot: 2, labelId: 'buff.radio' }; return t('ev.radio.r0'); } },
        { labelId: 'ev.radio.c1', run() { return t('ev.radio.r1'); } },
      ],
    },
    /* ── Phase D 신규 인카운터 12종 (#12) — 조건은 when 스키마로 선언 ── */
    // 1. 겨울+한파: 문 밖에 쓰러진 낯선 이. 데워 보내기 / 못 본 척.
    coldsnap_stranger: {
      icon: '', titleId: 'ev.coldstranger.title', textId: 'ev.coldstranger.text',
      arrive: 'door', // #181 문 밖에 쓰러진 사람 — 계단 오를 수 있는 곳
      when: { seasons: ['winter'] }, cond: () => coldSnapActive(),
      choices: [
        { labelId: 'ev.coldstranger.c0', cost: { fuel: 2 }, run() { addMoodBuff(3, 3); state.dayLog.notes.push(t('ev.coldstranger.note0')); return t('ev.coldstranger.r0'); } },
        { labelId: 'ev.coldstranger.c1', run() { addMoodBuff(-2, 2); state.dayLog.notes.push(t('ev.coldstranger.note1')); return t('ev.coldstranger.r1'); } },
      ],
    },
    // 2. 여름: 상한 것 반값에 떠넘기려는 행상. 간파 / 속아 삼(식중독).
    spoil_merchant: {
      icon: '', titleId: 'ev.spoilmerchant.title', textId: 'ev.spoilmerchant.text',
      arrive: 'foot', // #181 수레 끄는 상인 — 지상 셸터만
      when: { seasons: ['summer'] },
      choices: [
        { labelId: 'ev.spoilmerchant.c0', run() { state.dayLog.notes.push(t('ev.spoilmerchant.note0')); return t('ev.spoilmerchant.r0'); } },
        { labelId: 'ev.spoilmerchant.c1', cost: { battery: 1 }, run() {
          resAdd('canned', 2);
          if (Math.random() < 0.5) { const msg = applyInjury('infection', false); state.dayLog.notes.push(msg); return t('ev.spoilmerchant.r1bad'); }
          return t('ev.spoilmerchant.r1ok');
        } },
      ],
    },
    // 3. 비/폭우 + 비 새는 셸터: 지붕 물 새기. 건축재 응급 / 방치(청결↓).
    leaky_roof: {
      icon: '', titleId: 'ev.leakyroof.title', textId: 'ev.leakyroof.text',
      when: { weather: ['rain', 'storm'], shelters: ['container', 'rooftop', 'subway', 'ship'] },
      choices: [
        { labelId: 'ev.leakyroof.c0', cost: { material: 1 }, run() { return t('ev.leakyroof.r0'); } },
        { labelId: 'ev.leakyroof.c1', run() { state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 12); return t('ev.leakyroof.r1'); } },
      ],
    },
    // 4. 눈+아침: 밤새 셸터를 돌고 간 발자국. 따라가기(소득/부상) / 지우기(안정감+).
    snow_prints: {
      icon: '', titleId: 'ev.snowprints.title', textId: 'ev.snowprints.text',
      when: { weather: ['snow'] },
      choices: [
        { labelId: 'ev.snowprints.c0', run() {
          if (Math.random() < 0.55) { resAdd('canned', 1); resAdd('cloth', 1); state.dayLog.notes.push(t('ev.snowprints.note0')); return t('ev.snowprints.r0good'); }
          const msg = applyInjury('minor', false); state.dayLog.notes.push(msg); return t('ev.snowprints.r0bad');
        } },
        { labelId: 'ev.snowprints.c1', run() { addMoodBuff(2, 2); return t('ev.snowprints.r1'); } },
      ],
    },
    // 5. 등대 전용+밤: 먼바다의 불빛 신호. 응답 점등 / 침묵. (1.1 항구 복선)
    lighthouse_ship: {
      icon: '', titleId: 'ev.lighthouseship.title', textId: 'ev.lighthouseship.text',
      when: { shelters: ['lighthouse'], night: true },
      choices: [
        { labelId: 'ev.lighthouseship.c0', cost: { fuel: 1 }, run() { addMoodBuff(2, 3); state.dayLog.notes.push(t('ev.lighthouseship.note0')); return t('ev.lighthouseship.r0'); } },
        { labelId: 'ev.lighthouseship.c1', run() { return t('ev.lighthouseship.r1'); } },
      ],
    },
    // 6. 온실 전용: 씨앗 훔치는 새들. 쫓기 / 나눠주기(분위기+, 반짝이).
    greenhouse_birds: {
      icon: '', titleId: 'ev.greenhousebirds.title', textId: 'ev.greenhousebirds.text',
      when: { shelters: ['greenhouse'] },
      choices: [
        { labelId: 'ev.greenhousebirds.c0', run() { return t('ev.greenhousebirds.r0'); } },
        { labelId: 'ev.greenhousebirds.c1', cost: { food: 1 }, run() {
          addMoodBuff(2, 3);
          if (Math.random() < 0.5) { resAdd('parts', 1); state.dayLog.notes.push(t('ev.greenhousebirds.note1')); return t('ev.greenhousebirds.r1shiny'); }
          return t('ev.greenhousebirds.r1');
        } },
      ],
    },
    // 7. 먼 불빛(REQ-EVT-03): 지상 도심계 셸터+맑음+밤. 보상 없음, 안정감 +2 1회, 목격 기록.
    distant_light: {
      icon: '', titleId: 'ev.distantlight.title', textId: 'ev.distantlight.text',
      when: { shelters: ['rooftop', 'cabin', 'bunker'], weather: ['clear'], night: true },
      choices: [
        { labelId: 'ev.distantlight.c0', run() {
          addMoodBuff(2, 2);
          recordDistantLight();
          // 장소별 문안 변형 3종 (옥탑/오두막/벙커)
          const key = { rooftop: 'ev.distantlight.r0.rooftop', cabin: 'ev.distantlight.r0.cabin', bunker: 'ev.distantlight.r0.bunker' }[state.current] || 'ev.distantlight.r0';
          return t(key);
        } },
      ],
    },
    // 8. 라디오 배치+밤: 주파수 사이의 목소리. 미수집 방송 드랍 연동.
    radio_ghost: {
      icon: '', titleId: 'ev.radioghost.title', textId: 'ev.radioghost.text',
      when: { needsRadio: true, night: true },
      choices: [
        { labelId: 'ev.radioghost.c0', run() {
          const b = dropBroadcast();
          if (b) { state.pendingBroadcast = b; return t('ev.radioghost.r0', { title: LN(BROADCASTS[b]) }); }
          return t('ev.radioghost.r0none');
        } },
        { labelId: 'ev.radioghost.c1', run() { return t('ev.radioghost.r1'); } },
      ],
    },
    // 데모 고립→응답 비트(리뷰 레버1·6, 디렉터 2026-07-12). 셸터/라디오 게이트에 막혀 데모에서 안 뜨던
    //   주제 조우들을 "확정 스크립트"로 승격 — processDay가 특정 데모일에 pendingEvent로 강제 예약(when 무시).
    //   서사 척추: "따뜻한 고독, 응답하는 불빛". Day7 먼 불빛 → Day11 지나가는 사람들 → Day14 라디오→응답.
    demo_far_light: {
      icon: '', titleId: 'ev.demofarlight.title', textId: 'ev.demofarlight.text',
      choices: [
        { labelId: 'ev.demofarlight.c0', run() { addMoodBuff(2, 2); recordDistantLight(); return t('ev.demofarlight.r0'); } },
      ],
    },
    demo_procession: {
      icon: '', titleId: 'ev.demoprocession.title', textId: 'ev.demoprocession.text',
      choices: [
        { labelId: 'ev.demoprocession.c0', run() { addMoodBuff(1, 2); return t('ev.demoprocession.r0'); } },
      ],
    },
    demo_radio_light: { // 시그니처: 부서진 라디오 → 한 번 송출 → 창 하나가 응답한다(첫 survivorLight).
      icon: '', titleId: 'ev.demoradiolight.title', textId: 'ev.demoradiolight.text',
      choices: [
        { labelId: 'ev.demoradiolight.c0', run() {
          state.survivorLights = Math.max(state.survivorLights || 0, 1); // 첫 응답 불빛(온기는 남는다)
          recordDistantLight();
          addMoodBuff(3, 3);
          return t('ev.demoradiolight.r0');
        } },
        { labelId: 'ev.demoradiolight.c1', run() { return t('ev.demoradiolight.r1'); } },
      ],
    },
    // 9. 무조건부 저확률: 벽에서 발견한 과거 달력. 메모 1 드랍.
    old_calendar: {
      icon: '', titleId: 'ev.oldcalendar.title', textId: 'ev.oldcalendar.text',
      weight: 0.5,
      choices: [
        { labelId: 'ev.oldcalendar.c0', run() {
          const m = dropMemo();
          if (m) return t('ev.oldcalendar.r0', { title: LN(MEMOS[m]) });
          return t('ev.oldcalendar.r0none');
        } },
      ],
    },
    // 10. 고양이 보유: 고양이가 물어온 것. 잡동사니/희귀부품/죽은 쥐.
    cat_gift: {
      icon: '', titleId: 'ev.catgift.title', textId: 'ev.catgift.text',
      when: { needsCat: true },
      choices: [
        { labelId: 'ev.catgift.c0', run() {
          const r = Math.random();
          if (r < 0.08) { resAdd('parts', 2); return t('ev.catgift.r0rare'); }
          if (r < 0.6) { resAdd('cloth', 1); return t('ev.catgift.r0junk'); }
          addMoodBuff(-1, 1); return t('ev.catgift.r0rat');
        } },
      ],
    },
    // 11. 겨울: 수도관 동파. 부품 수리 / 방치(정수기 3일 정지).
    frozen_pipe: {
      icon: '', titleId: 'ev.frozenpipe.title', textId: 'ev.frozenpipe.text',
      when: { seasons: ['winter'] },
      choices: [
        { labelId: 'ev.frozenpipe.c0', cost: { parts: 1 }, run() { return t('ev.frozenpipe.r0'); } },
        { labelId: 'ev.frozenpipe.c1', run() { state.pipeFrozenUntil = state.day + 3; state.dayLog.notes.push(t('ev.frozenpipe.note1')); return t('ev.frozenpipe.r1'); } },
      ],
    },
    // 12. 봄/가을+낮: 멀리 지나가는 행렬. 관측만(만나지 않는다). 쌍안경 있으면 상세 노트.
    caravan_pass: {
      icon: '', titleId: 'ev.caravanpass.title', textId: 'ev.caravanpass.text',
      arrive: 'view', // #181 멀리 지나가는 행렬 — 시야 트인 곳만 (다가오지 않음)
      when: { seasons: ['spring', 'autumn'], dayOnly: true },
      choices: [
        { labelId: 'ev.caravanpass.c0', run() {
          addMoodBuff(1, 2);
          // 망원경 계열 가구(telescope)를 두었다면 행렬을 더 오래 지켜본 상세 노트. 없으면 관측만.
          const detail = items.some(i => i.defId === 'telescope');
          return detail ? t('ev.caravanpass.r0detail') : t('ev.caravanpass.r0');
        } },
      ],
    },
  
    /* ── #163 계절 인카운터 확충 (디렉터 2026-07-10) — 봄6·여름6·가을6·겨울5 + 공용5 ──
       원칙: 접촉 스펙트럼(직접 대면 최소 — 흔적·거리·간접) · 보상 소폭(자원 ±1~2, 기분 1~3).
       아트: public/img/events/ev_<id>.png — 결손 시 일러스트 생략 폴백. */

    // ── 봄: 해빙·재생·젖은 흙 ──
    thaw_stream: {
      icon: '', titleId: 'ev.thawstream.title', textId: 'ev.thawstream.text',
      when: { seasons: ['spring'] },
      choices: [
        { labelId: 'ev.thawstream.c0', run() { resAdd('water', 2); return t('ev.thawstream.r0'); } },
        { labelId: 'ev.thawstream.c1', run() { addMoodBuff(2, 2); return t('ev.thawstream.r1'); } },
      ],
    },
    first_sprout: {
      icon: '', titleId: 'ev.firstsprout.title', textId: 'ev.firstsprout.text',
      when: { seasons: ['spring'] },
      choices: [
        { labelId: 'ev.firstsprout.c0', cost: { water: 1 }, run() {
          addMoodBuff(2, 3);
          if (Math.random() < 0.5) { resAdd('food', 1); return t('ev.firstsprout.r0grew'); }
          return t('ev.firstsprout.r0');
        } },
        { labelId: 'ev.firstsprout.c1', run() { addMoodBuff(1, 1); return t('ev.firstsprout.r1'); } },
      ],
    },
    returning_birds: {
      icon: '', titleId: 'ev.returningbirds.title', textId: 'ev.returningbirds.text',
      when: { seasons: ['spring'], dayOnly: true },
      choices: [
        { labelId: 'ev.returningbirds.c0', run() {
          addMoodBuff(2, 2);
          const detail = items.some(i => i.defId === 'telescope');
          return detail ? t('ev.returningbirds.r0detail') : t('ev.returningbirds.r0');
        } },
      ],
    },
    melt_reveal: {
      icon: '', titleId: 'ev.meltreveal.title', textId: 'ev.meltreveal.text',
      when: { seasons: ['spring'] },
      choices: [
        { labelId: 'ev.meltreveal.c0', run() {
          const pick = ['cloth', 'parts', 'canned'][Math.floor(Math.random() * 3)];
          resAdd(pick, 1);
          return t('ev.meltreveal.r0', { name: LN(RESOURCES[pick]) });
        } },
        { labelId: 'ev.meltreveal.c1', run() { return t('ev.meltreveal.r1'); } },
      ],
    },
    bee_swarm: {
      icon: '', titleId: 'ev.beeswarm.title', textId: 'ev.beeswarm.text',
      when: { seasons: ['spring'] },
      choices: [
        { labelId: 'ev.beeswarm.c0', run() {
          addMoodBuff(2, 3);
          if (Math.random() < 0.5) { resAdd('food', 1); state.dayLog.notes.push(t('ev.beeswarm.note0')); return t('ev.beeswarm.r0honey'); }
          return t('ev.beeswarm.r0');
        } },
        { labelId: 'ev.beeswarm.c1', run() { return t('ev.beeswarm.r1'); } },
      ],
    },
    mud_tracks: {
      icon: '', titleId: 'ev.mudtracks.title', textId: 'ev.mudtracks.text',
      when: { seasons: ['spring'], dayOnly: true },
      choices: [
        { labelId: 'ev.mudtracks.c0', run() {
          if (Math.random() < 0.55) { resAdd('canned', 1); return t('ev.mudtracks.r0good'); }
          const msg = applyInjury('minor', false); state.dayLog.notes.push(msg); return t('ev.mudtracks.r0bad');
        } },
        { labelId: 'ev.mudtracks.c1', run() { addMoodBuff(1, 1); return t('ev.mudtracks.r1'); } },
      ],
    },

    // ── 여름: 더위·부패·소나기·생명 소리 ──
    cicada_evening: {
      icon: '', titleId: 'ev.cicada.title', textId: 'ev.cicada.text',
      when: { seasons: ['summer'] },
      choices: [
        { labelId: 'ev.cicada.c0', run() { addMoodBuff(2, 2); return state.cat ? t('ev.cicada.r0cat') : t('ev.cicada.r0'); } },
      ],
    },
    mosquito_net: {
      icon: '', titleId: 'ev.mosquitonet.title', textId: 'ev.mosquitonet.text',
      when: { seasons: ['summer'] },
      choices: [
        { labelId: 'ev.mosquitonet.c0', cost: { cloth: 1 }, run() { return t('ev.mosquitonet.r0'); } },
        { labelId: 'ev.mosquitonet.c1', run() { addMoodBuff(-1, 2); return t('ev.mosquitonet.r1'); } },
      ],
    },
    wild_berries: {
      icon: '', titleId: 'ev.wildberries.title', textId: 'ev.wildberries.text',
      when: { seasons: ['summer'], dayOnly: true },
      choices: [
        { labelId: 'ev.wildberries.c0', run() { resAdd('food', 2); return t('ev.wildberries.r0'); } },
        { labelId: 'ev.wildberries.c1', run() { addMoodBuff(2, 2); return t('ev.wildberries.r1'); } },
      ],
    },
    sudden_shower: {
      icon: '', titleId: 'ev.suddenshower.title', textId: 'ev.suddenshower.text',
      when: { seasons: ['summer'], dayOnly: true },
      choices: [
        { labelId: 'ev.suddenshower.c0', run() { resAdd('water', 1); addMoodBuff(2, 2); return t('ev.suddenshower.r0'); } },
      ],
    },
    heat_haze: {
      icon: '', titleId: 'ev.heathaze.title', textId: 'ev.heathaze.text',
      when: { seasons: ['summer'], dayOnly: true },
      choices: [
        { labelId: 'ev.heathaze.c0', run() { addMoodBuff(1, 1); return t('ev.heathaze.r0'); } },
        { labelId: 'ev.heathaze.c1', cost: { water: 1 }, run() { addMoodBuff(2, 2); return t('ev.heathaze.r1'); } },
      ],
    },
    firefly_field: {
      icon: '', titleId: 'ev.firefly.title', textId: 'ev.firefly.text',
      when: { seasons: ['summer'], night: true },
      choices: [
        { labelId: 'ev.firefly.c0', run() { addMoodBuff(3, 2); return t('ev.firefly.r0'); } },
      ],
    },

    // ── 가을: 낙엽·갈무리·겨울의 예감 ──
    acorn_cache: {
      icon: '', titleId: 'ev.acorncache.title', textId: 'ev.acorncache.text',
      when: { seasons: ['autumn'] },
      choices: [
        { labelId: 'ev.acorncache.c0', run() { resAdd('food', 1); return t('ev.acorncache.r0'); } },
        { labelId: 'ev.acorncache.c1', run() { addMoodBuff(2, 2); return t('ev.acorncache.r1'); } },
      ],
    },
    leaf_drift: {
      icon: '', titleId: 'ev.leafdrift.title', textId: 'ev.leafdrift.text',
      when: { seasons: ['autumn'] },
      choices: [
        { labelId: 'ev.leafdrift.c0', run() { resAdd('fuel', 1); return t('ev.leafdrift.r0'); } },
        { labelId: 'ev.leafdrift.c1', run() { addMoodBuff(2, 2); return state.cat ? t('ev.leafdrift.r1cat') : t('ev.leafdrift.r1'); } },
      ],
    },
    first_frost: {
      icon: '', titleId: 'ev.firstfrost.title', textId: 'ev.firstfrost.text',
      when: { seasons: ['autumn'] },
      choices: [
        { labelId: 'ev.firstfrost.c0', cost: { cloth: 1 }, run() { addMoodBuff(1, 2); state.dayLog.notes.push(t('ev.firstfrost.note0')); return t('ev.firstfrost.r0'); } },
        { labelId: 'ev.firstfrost.c1', run() { addMoodBuff(1, 1); return t('ev.firstfrost.r1'); } },
      ],
    },
    geese_south: {
      icon: '', titleId: 'ev.geesesouth.title', textId: 'ev.geesesouth.text',
      when: { seasons: ['autumn'], dayOnly: true },
      choices: [
        { labelId: 'ev.geesesouth.c0', run() {
          addMoodBuff(2, 2);
          const detail = items.some(i => i.defId === 'telescope');
          return detail ? t('ev.geesesouth.r0detail') : t('ev.geesesouth.r0');
        } },
      ],
    },
    pickling_day: {
      icon: '', titleId: 'ev.picklingday.title', textId: 'ev.picklingday.text',
      when: { seasons: ['autumn'] },
      choices: [
        { labelId: 'ev.picklingday.c0', cost: { food: 2, water: 1 }, run() { resAdd('canned', 2); return t('ev.picklingday.r0'); } },
        { labelId: 'ev.picklingday.c1', run() { return t('ev.picklingday.r1'); } },
      ],
    },
    spider_web: {
      icon: '', titleId: 'ev.spiderweb.title', textId: 'ev.spiderweb.text',
      when: { seasons: ['autumn'] },
      choices: [
        { labelId: 'ev.spiderweb.c0', run() { addMoodBuff(2, 2); return t('ev.spiderweb.r0'); } },
        { labelId: 'ev.spiderweb.c1', run() { state.cleanBy[state.current] = Math.min(100, (state.cleanBy[state.current] ?? 70) + 5); return t('ev.spiderweb.r1'); } },
      ],
    },

    // ── 겨울: 신규 5 (기존 coldsnap_stranger·frozen_pipe·snow_prints 합류 → 8) ──
    icicle_row: {
      icon: '', titleId: 'ev.iciclerow.title', textId: 'ev.iciclerow.text',
      when: { seasons: ['winter'] },
      choices: [
        { labelId: 'ev.iciclerow.c0', run() { resAdd('water', 2); return t('ev.iciclerow.r0'); } },
        { labelId: 'ev.iciclerow.c1', run() { addMoodBuff(1, 1); return t('ev.iciclerow.r1'); } },
      ],
    },
    frozen_sparrow: {
      icon: '', titleId: 'ev.frozensparrow.title', textId: 'ev.frozensparrow.text',
      when: { seasons: ['winter'] },
      choices: [
        { labelId: 'ev.frozensparrow.c0', cost: { fuel: 1 }, run() { addMoodBuff(3, 3); state.dayLog.notes.push(t('ev.frozensparrow.note0')); return t('ev.frozensparrow.r0'); } },
        { labelId: 'ev.frozensparrow.c1', run() { addMoodBuff(-1, 1); return t('ev.frozensparrow.r1'); } },
      ],
    },
    snowman_scarf: {
      icon: '', titleId: 'ev.snowmanscarf.title', textId: 'ev.snowmanscarf.text',
      when: { seasons: ['winter'] },
      choices: [
        { labelId: 'ev.snowmanscarf.c0', run() { resAdd('cloth', 1); addMoodBuff(-1, 1); return t('ev.snowmanscarf.r0'); } },
        { labelId: 'ev.snowmanscarf.c1', run() { addMoodBuff(2, 2); return t('ev.snowmanscarf.r1'); } },
      ],
    },
    clear_winter_night: {
      icon: '', titleId: 'ev.winternight.title', textId: 'ev.winternight.text',
      when: { seasons: ['winter'], weather: ['clear'], night: true },
      choices: [
        { labelId: 'ev.winternight.c0', run() { addMoodBuff(3, 2); return t('ev.winternight.r0'); } },
      ],
    },
    blizzard_warning: {
      icon: '', titleId: 'ev.blizzardwarn.title', textId: 'ev.blizzardwarn.text',
      when: { seasons: ['winter'], needsRadio: true },
      choices: [
        { labelId: 'ev.blizzardwarn.c0', run() { addMoodBuff(1, 1); state.dayLog.notes.push(t('ev.blizzardwarn.note0')); return t('ev.blizzardwarn.r0'); } },
        { labelId: 'ev.blizzardwarn.c1', run() { return t('ev.blizzardwarn.r1'); } },
      ],
    },

    // ── 공용: 무계절 ──
    red_balloon: {
      icon: '', titleId: 'ev.redballoon.title', textId: 'ev.redballoon.text',
      weight: 0.6,
      choices: [
        { labelId: 'ev.redballoon.c0', run() { addMoodBuff(2, 2); return t('ev.redballoon.r0'); } },
      ],
    },
    doorstep_bundle: {
      icon: '', titleId: 'ev.doorstepbundle.title', textId: 'ev.doorstepbundle.text',
      weight: 0.6,
      choices: [
        { labelId: 'ev.doorstepbundle.c0', run() {
          const pick = ['canned', 'cloth', 'bandage'][Math.floor(Math.random() * 3)];
          resAdd(pick, 1);
          return t('ev.doorstepbundle.r0', { name: LN(RESOURCES[pick]) });
        } },
        { labelId: 'ev.doorstepbundle.c1', cost: { water: 1 }, run() {
          const pick = ['canned', 'cloth', 'bandage'][Math.floor(Math.random() * 3)];
          resAdd(pick, 1); addMoodBuff(3, 3); state.dayLog.notes.push(t('ev.doorstepbundle.note1'));
          return t('ev.doorstepbundle.r1', { name: LN(RESOURCES[pick]) });
        } },
      ],
    },
    music_box: {
      icon: '', titleId: 'ev.musicbox.title', textId: 'ev.musicbox.text',
      choices: [
        { labelId: 'ev.musicbox.c0', cost: { parts: 1 }, run() { addMoodBuff(3, 3); return t('ev.musicbox.r0'); } },
        { labelId: 'ev.musicbox.c1', run() { return t('ev.musicbox.r1'); } },
      ],
    },
    cat_dream: {
      icon: '', titleId: 'ev.catdream.title', textId: 'ev.catdream.text',
      when: { needsCat: true },
      choices: [
        { labelId: 'ev.catdream.c0', run() { addMoodBuff(2, 2); return t('ev.catdream.r0'); } },
      ],
    },
    old_photo: {
      icon: '', titleId: 'ev.oldphoto.title', textId: 'ev.oldphoto.text',
      weight: 0.7,
      choices: [
        { labelId: 'ev.oldphoto.c0', run() { addMoodBuff(2, 2); return t('ev.oldphoto.r0'); } },
        { labelId: 'ev.oldphoto.c1', run() { addMoodBuff(1, 1); return t('ev.oldphoto.r1'); } },
      ],
    },

    /* ── #163b 절박 티어 (디렉터 2026-07-10): 겨울이 지날수록 세상이 야윈다 ──
       생존·혹한 전용(modes) + 경과 겨울 게이트(minWinters). 코지에는 오지 않는다.
       자원은 해마다 줄어드는 세계 — 이벤트가 그 결핍을 서사로 보여준다. */
    silent_frequency: {
      icon: '', titleId: 'ev.silentfreq.title', textId: 'ev.silentfreq.text',
      when: { modes: ['hard', 'hardcore'], minWinters: 1, needsRadio: true },
      choices: [
        { labelId: 'ev.silentfreq.c0', run() { addMoodBuff(-1, 2); state.dayLog.notes.push(t('ev.silentfreq.note0')); return t('ev.silentfreq.r0'); } },
        { labelId: 'ev.silentfreq.c1', run() { return t('ev.silentfreq.r1'); } },
      ],
    },
    barren_traps: {
      icon: '', titleId: 'ev.barrentraps.title', textId: 'ev.barrentraps.text',
      when: { modes: ['hard', 'hardcore'], minWinters: 1 },
      choices: [
        { labelId: 'ev.barrentraps.c0', cost: { food: 1 }, run() {
          if (Math.random() < 0.5) { resAdd('food', 2); return t('ev.barrentraps.r0good'); }
          return t('ev.barrentraps.r0bad');
        } },
        { labelId: 'ev.barrentraps.c1', run() { addMoodBuff(-1, 1); return t('ev.barrentraps.r1'); } },
      ],
    },
    looted_cache: {
      icon: '', titleId: 'ev.lootedcache.title', textId: 'ev.lootedcache.text',
      when: { modes: ['hard', 'hardcore'], minWinters: 1 },
      choices: [
        { labelId: 'ev.lootedcache.c0', run() {
          const held = ['canned', 'fuel', 'battery', 'food'].filter(r => (state.res[r] || 0) > 0);
          if (!held.length) return t('ev.lootedcache.r0none');
          const pick = held[Math.floor(Math.random() * held.length)];
          resConsume(pick, 1); addMoodBuff(-1, 1);
          return t('ev.lootedcache.r0', { name: LN(RESOURCES[pick]) });
        } },
        { labelId: 'ev.lootedcache.c1', run() {
          if (Math.random() < 0.5) { addMoodBuff(1, 1); return t('ev.lootedcache.r1good'); }
          const held = ['canned', 'fuel', 'battery', 'food'].filter(r => (state.res[r] || 0) > 0);
          if (!held.length) return t('ev.lootedcache.r0none');
          const pick = held[Math.floor(Math.random() * held.length)];
          resConsume(pick, 1); addMoodBuff(-2, 2);
          return t('ev.lootedcache.r1bad', { name: LN(RESOURCES[pick]) });
        } },
      ],
    },
    desperate_knock: {
      icon: '', titleId: 'ev.desperateknock.title', textId: 'ev.desperateknock.text',
      arrive: 'door', // #181 문 너머의 목소리 — 계단 오를 수 있는 곳
      when: { modes: ['hard', 'hardcore'], minWinters: 2, night: true },
      choices: [
        { labelId: 'ev.desperateknock.c0', cost: { canned: 1 }, run() { addMoodBuff(2, 3); state.dayLog.notes.push(t('ev.desperateknock.note0')); return t('ev.desperateknock.r0'); } },
        { labelId: 'ev.desperateknock.c1', run() { addMoodBuff(-2, 2); state.dayLog.notes.push(t('ev.desperateknock.note1')); return t('ev.desperateknock.r1'); } },
      ],
    },
    stripped_district: {
      icon: '', titleId: 'ev.strippeddistrict.title', textId: 'ev.strippeddistrict.text',
      when: { modes: ['hard', 'hardcore'], minWinters: 2 },
      choices: [
        { labelId: 'ev.strippeddistrict.c0', run() {
          if (Math.random() < 0.5) { resAdd('parts', 1); return t('ev.strippeddistrict.r0good'); }
          const msg = applyInjury('minor', false); state.dayLog.notes.push(msg); return t('ev.strippeddistrict.r0bad');
        } },
        { labelId: 'ev.strippeddistrict.c1', run() { addMoodBuff(-1, 1); return t('ev.strippeddistrict.r1'); } },
      ],
    },
    harsh_barter: {
      icon: '', titleId: 'ev.harshbarter.title', textId: 'ev.harshbarter.text',
      arrive: 'foot', // #181 다리 밑 행상 — 지상 셸터만
      when: { modes: ['hard', 'hardcore'], minWinters: 2, seasons: ['winter'], dayOnly: true },
      choices: [
        { labelId: 'ev.harshbarter.c0', cost: { canned: 3 }, run() { resAdd('fuel', 1); return t('ev.harshbarter.r0'); } },
        { labelId: 'ev.harshbarter.c1', run() { return t('ev.harshbarter.r1'); } },
      ],
    },

    /* ── #165 탐험 리스크 인카운터 (디렉터 2026-07-10) — 특수: 탐험 진행률 35% 지점에서만 예약(tickExpeditionUI) ──
       "건물이 무너지며 새 입구가 생겼다. 들어가시겠습니까?" — Yes = 치장템 가중 드랍 + 부상 리스크(모드별). No = 안전.
       문안은 탐험 목적지(state.exp.region)별 변형. */
    collapsed_entrance: {
      special: true,
      icon: '', titleId: 'ev.collapse.title',
      textFn: () => {
        const rg = state.riskEventRegion || (state.exp && state.exp.region); // #193: 귀환 후 표시 — 박제 지역 우선
        if (rg === 'slumdeep') return t('ev.collapse.text.slum'); // #167 심부: 슬럼 문안 공유 (같은 골목의 안쪽)
        return t(['slum', 'residential', 'industrial', 'harbor'].includes(rg) ? `ev.collapse.text.${rg}` : 'ev.collapse.text');
      },
      choices: [
        { labelId: 'ev.collapse.c0', run() {
          let out = collapseEntranceLoot();
          const inj = (BAL.events.riskInjury && BAL.events.riskInjury[state.mode]) ?? 0.28;
          if (Math.random() < inj) {
            const msg = applyInjury('minor', false);
            state.dayLog.notes.push(msg);
            out += '<br>' + t('ev.collapse.rHurt');
          }
          return out;
        } },
        { labelId: 'ev.collapse.c1', run() { return t('ev.collapse.r1'); } },
      ],
    },

    /* ── 특수 인카운터 (일반 풀에서 제외) ── */
    cat: {
      special: true,
      icon: '', titleId: 'ev.cat.title', textId: 'ev.cat.text',
      choices: [
        { labelId: 'ev.cat.c0', cost: { food: 1 }, run() {
          state.cat = 1;
          // 코트 랜덤(입양 시 1회 확정) — spawnCat 전에 정해야 메시가 해당 코트로 빌드된다.
          //   구세이브는 catCoat 미보유 → cat.js가 'tabby'로 폴백(외형 불변).
          // #119 서포터팩 소유 시 러시안블루 보장 지급 — 아니면 기본 4종 랜덤.
          const coats = ['tabby', 'black', 'siamese', 'ragdoll'];
          state.catCoat = (dlcOwns && dlcOwns('supporter')) ? 'russianblue' : coats[Math.floor(Math.random() * coats.length)];
          spawnCat();
          state.dayLog.notes.push(t('day.catJoined'));
          playSfx('meow1');
          // 결과 문구에 코트 1줄 분기(ko/en) — 어떤 털의 아이가 왔는지 알려준다.
          return t('ev.cat.r0') + '<br>' + t('ev.cat.coat.' + state.catCoat);
        } },
        { labelId: 'ev.cat.c1', run() { return t('ev.cat.r1'); } },
      ],
    },
    // ── 문 두드리는 소리 (#170 REV3: ENDINGS-REV3 §3d) — 재건의 봄, 비네트의 종결부로만 발화 ──
    //   신세계 선택지는 제거: 초대장은 이미 흘렀다(그 문은 겨울 3~4의 것). 보류도 제거 — 아홉 번의
    //   겨울이 이미 답을 빚었다. 문안은 누적 성향(endingLeaning) 한 줄 변주 유지. 두 갈래 모두 런은 계속된다.
    ending_choice: {
      special: true,
      icon: '', titleId: 'end3.title', textId: 'end3.text',
      textFn: () => t('end3.text', { winters: state.winters }) + '<br><br>' + t('end3.lean.' + endingLeaning()),
      choices: [
        { labelId: 'end3.c.escape', run() { state.endingType = 'escape'; setTimeout(() => runEndingSequence('escape'), 400); return t('end3.r.escape'); } },
        { labelId: 'end3.c.rest', run() { state.endingType = 'rest'; setTimeout(() => runEndingSequence('rest'), 400); return t('end3.r.rest'); } },
      ],
    },
    // 2.0 조기 탈출 (§9.5) — 박사의 정기 교신에 닿은 사람에게만, 아홉 번째 겨울 전에 한 번 열리는 문.
    //   보류하면 이 문은 닫힌다(구조는 9겨울에 다시 온다). 진실을 다 보기 전에 떠나는 자의 엔딩.
    early_rescue: {
      special: true,
      icon: '', titleId: 'end3.early.title', textId: 'end3.early.text',
      choices: [
        { labelId: 'end3.early.c0', run() { state.endingType = 'escape'; setTimeout(() => runEndingSequence('escape'), 400); return t('end3.early.r0'); } },
        { labelId: 'end3.early.c1', run() { return t('end3.early.r1'); } },
      ],
    },
    // ── #170 REV3 초대장 (ENDINGS-REV3 §3a) — 진실 4단 완성 다음 아침, 종이가 그들의 노크다 ──
    //   그들은 오지 않는다(접촉 스펙트럼 §3: 재회는 엔딩뿐). 신세계는 내가 가는 엔딩.
    //   소각/마감 보류(endingStayed)가 안식의 능동 선언 — 이후 무전 조기 구조도 오지 않는다.
    invitation_choice: {
      special: true,
      icon: '', titleId: 'end3.inv.title', textId: 'end3.inv.text',
      choices: [
        { labelId: 'end3.inv.c0', run() { state.endingType = 'newworld'; state.invitationHeld = false; setTimeout(() => runEndingSequence('newworld'), 400); return t('end3.inv.r0'); } },
        { labelId: 'end3.inv.c1', run() { state.endingStayed = true; state.invitationHeld = false; state.dayLog.notes.push(t('end3.inv.note')); return t('end3.inv.r1'); } },
        { labelId: 'end3.inv.c2', run() { return t('end3.inv.r2'); } },
      ],
    },
    // 초대장 마감일 아침 — 서랍의 종이가 마지막으로 묻는다(1회). 흘려보내면 안식 확정.
    invitation_due: {
      special: true,
      icon: '', titleId: 'end3.due.title', textId: 'end3.due.text',
      choices: [
        { labelId: 'end3.due.c0', run() { state.endingType = 'newworld'; setTimeout(() => runEndingSequence('newworld'), 400); return t('end3.due.r0'); } },
        { labelId: 'end3.due.c1', run() { state.endingStayed = true; state.dayLog.notes.push(t('end3.inv.note')); return t('end3.due.r1'); } },
      ],
    },
    // ── #170 REV3 밤의 교신 (ENDINGS-REV3 §3c) — 사일로를 보고 돌아선 자에게, 박사의 마지막 물음 ──
    //   무기록 원칙: 사일로·버튼·문서를 직접 말하지 않는다("개방 기록"까지만). 박사도 게임도 판단하지 않는다.
    doctor_call: {
      special: true,
      icon: '', titleId: 'end3.call.title', textId: 'end3.call.text',
      choices: [
        { labelId: 'end3.call.c0', run() { state.endingType = 'escape'; setTimeout(() => runEndingSequence('escape'), 400); return t('end3.call.r0'); } },
        { labelId: 'end3.call.c1', run() { return t('end3.call.r1'); } },
      ],
    },
    // ── #170 REV3 재건의 봄 도입 (ENDINGS-REV3 §3d) — 카드 5장은 runRebuildSequence(ending-screen)가 맡는다 ──
    rebuilding: {
      special: true,
      icon: '', titleId: 'end3.rb.title', textId: 'end3.rb.text',
      choices: [
        { labelId: 'end3.rb.c0', run() { setTimeout(() => runRebuildSequence(), 400); return t('end3.rb.r0'); } },
      ],
    },
    // 염료 상인 (디렉터 2026-07-08): 슬럼 탐험 5% — 손수레 위 페인트 통 셋. 통조림 교환,
    //   모드별 값 차등(노말·무한 2 / 하드 3 / 하드코어 4). 만나는 건 운, 사는 건 선택 — 도료 드랍의 교환 채널.
    dye_merchant: {
      special: true,
      icon: '', titleId: 'dye.title', textId: 'dye.text',
      textFn: () => t('dye.text', {
        names: (state.dyeOffer || []).map((f, i) => `${i + 1}. ${LN(PAINT_FAMILIES[f])}`).join(' · '),
        n: dyeCost(),
      }),
      choices: [
        { labelId: 'dye.c0', run() { return buyDye(0); } },
        { labelId: 'dye.c1', run() { return buyDye(1); } },
        { labelId: 'dye.c2', run() { return buyDye(2); } },
        { labelId: 'dye.pass', run() { return t('dye.r.pass'); } },
      ],
    },
    // 2.0 §9.6 히든 루트 「침묵」 — 개척 완공 후 첫 밤, 통로 끝의 연구소에서 박사와 마주 앉는다.
    //   선택지는 하나: 유보. 떠나지도, 받아들이지도 않는다(§5.1 — 유보한 자만이 문서를 발견한다).
    hidden_reach: {
      special: true,
      icon: '', titleId: 'hidden.reach.title', textId: 'hidden.reach.text',
      choices: [
        { labelId: 'hidden.reach.c0', run() { state.hiddenReached = true; return t('hidden.reach.r0'); } },
      ],
    },
    ending: {
      special: true,
      icon: '', titleId: 'ev.ending.title', textId: 'ev.ending.text',
      // 1.4 다리: 무전 기지에서 방송을 송출한 적 있으면 구조 무전 문구가 달라진다(그들이 내 신호를 따라왔다).
      textFn: () => t('ev.ending.text') + ((state.survivorLights || 0) > 0 ? '<br><br>' + t('ev.ending.textSignal') : ''),
      choices: [
        { labelId: 'ev.ending.c0', run() { setTimeout(runEndingSequence, 400); return t('ev.ending.r0'); } },
        { labelId: 'ev.ending.c1', run() { return t('ev.ending.r1'); } },
      ],
    },
    // Nine Winters(#11): 9번째 겨울 이후 박사의 첫 무전 — Day 10000 엔딩의 첫 복선 (이름은 밝히지 않는다)
    doctor_radio: {
      special: true,
      icon: '', titleId: 'ev.doctor.title', textId: 'ev.doctor.text',
      // 박사 일지 조각 2종을 모두 수집했다면 무전 문안에 한 줄이 이어진다 (REQ-RADIO-01 연호).
      textFn: () => t('ev.doctor.text') + (doctorFragmentsComplete() ? '<br><br>' + t('ev.doctor.textFrag') : ''),
      choices: [
        { labelId: 'ev.doctor.c0', run() { return t('ev.doctor.r0'); } },
      ],
    },
    // 1.4: 모든 수집물을 무전 기지에서 송출한 뒤 개방되는 박사의 정기 교신 — 9겨울 무전과 Day10000 엔딩 사이의 다리.
    //   기밀 문서를 다 읽었다면 박사 정체를 알아본 뒤의 교신이다(문안에 한 줄이 더 이어진다).
    doctor_radio_regular: {
      special: true,
      icon: '', titleId: 'ev.doctorReg.title', textId: 'ev.doctorReg.text',
      textFn: () => t('ev.doctorReg.text') + (state.memos && MEMOS_RESEARCH.every(id => state.memos[id]) ? '<br><br>' + t('ev.doctorReg.textTruth') : ''),
      choices: [
        { labelId: 'ev.doctorReg.c0', run() { state.doctorRegularSeen = true; return t('ev.doctorReg.r0'); } },
      ],
    },
  };
  return EVENTS;
}
