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
         recordDistantLight,spawnCat,playSfx,runEndingSequence,doctorFragmentsComplete.
         (state/items는 const 참조 — game.js에서 재할당되지 않아 캡처가 안전하다.)
   출처: game.js EVENTS (원본 그대로 이동, 팩토리로 래핑).
   ============================================================ */
export function makeEvents(ctx) {
  const {
    t, LN, RESOURCES, DEFS, MEMOS, MEMOS_RESEARCH, BROADCASTS, BAL,
    state, items,
    resAdd, resConsume, addMoodBuff, applyInjury, seasonOf, coldSnapActive,
    dropMemo, dropBroadcast, recordDistantLight, spawnCat, playSfx,
    runEndingSequence, doctorFragmentsComplete,
    endingLeaning, // 2.0 §9.5: 엔딩 성향(누적 신호 기반 — 3분기 문안 뉘앙스)
    encCostMul, encBarterMul, // 밀수꾼 모드 배수 (교환 야박도 — 암시장과 캐논 공유)
  } = ctx;
  const EVENTS = {
    wanderer: {
      icon: '🚶', titleId: 'ev.wanderer.title', textId: 'ev.wanderer.text',
      choices: [
        { labelId: 'ev.wanderer.c0', cost: { food: 2 }, run() { state.buff = { exp: 0.10, labelId: 'buff.wanderer' }; return t('ev.wanderer.r0'); } },
        { labelId: 'ev.wanderer.c1', run() { return t('ev.wanderer.r1'); } },
      ],
    },
    trader: {
      icon: '🎒', titleId: 'ev.trader.title', textId: 'ev.trader.text',
      choices: [
        { labelId: 'ev.trader.c0', cost: { battery: 2 }, run() { resAdd('bandage', 1); resAdd('antiseptic', 1); return t('ev.trader.r0'); } },
        { labelId: 'ev.trader.c1', run() { return t('ev.trader.r1'); } },
      ],
    },
    dog: {
      icon: '🐕', titleId: 'ev.dog.title', textId: 'ev.dog.text',
      choices: [
        { labelId: 'ev.dog.c0', cost: { food: 1 }, run() { state.buff = { exp: 0.10, labelId: 'buff.dog' }; return t('ev.dog.r0'); } },
        { labelId: 'ev.dog.c1', run() { return t('ev.dog.r1'); } },
      ],
    },
    // 1.1 밀수꾼 행상인 — 항구 한정, 지나가는 존재(캐논: 타인은 흐른다). 계절 가격 극단(겨울 연료 프리미엄).
    smuggler: {
      icon: '🚢', titleId: 'ev.smuggler.title', textId: 'ev.smuggler.text',
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
      icon: '🌪️', titleId: 'ev.storm.title', textId: 'ev.storm.text',
      choices: [
        { labelId: 'ev.storm.c0', cost: { material: 1 }, run() { return t('ev.storm.r0'); } },
        { labelId: 'ev.storm.c1', run() { state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 10); return t('ev.storm.r1'); } },
      ],
    },
    broken: {
      icon: '🔩', titleId: 'ev.broken.title', textId: 'ev.broken.text',
      choices: [
        { labelId: 'ev.broken.c0', cost: { parts: 1 }, run() { return t('ev.broken.r0'); } },
        { labelId: 'ev.broken.c1', run() { state.buff = { exp: -0.05, labelId: 'buff.broken' }; return t('ev.broken.r1'); } },
      ],
    },
    thief: {
      icon: '👣', titleId: 'ev.thief.title', textId: 'ev.thief.text',
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
      icon: '🌱', titleId: 'ev.seeds.title', textId: 'ev.seeds.text',
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
      icon: '📡', titleId: 'ev.radio.title', textId: 'ev.radio.text',
      when: { needsRadio: true }, // (구 cond: 라디오 보유 시에만) — 동작 불변, 스키마 이관
      choices: [
        { labelId: 'ev.radio.c0', run() { state.buff = { loot: 2, labelId: 'buff.radio' }; return t('ev.radio.r0'); } },
        { labelId: 'ev.radio.c1', run() { return t('ev.radio.r1'); } },
      ],
    },
    /* ── Phase D 신규 인카운터 12종 (#12) — 조건은 when 스키마로 선언 ── */
    // 1. 겨울+한파: 문 밖에 쓰러진 낯선 이. 데워 보내기 / 못 본 척.
    coldsnap_stranger: {
      icon: '🧊', titleId: 'ev.coldstranger.title', textId: 'ev.coldstranger.text',
      when: { seasons: ['winter'] }, cond: () => coldSnapActive(),
      choices: [
        { labelId: 'ev.coldstranger.c0', cost: { fuel: 2 }, run() { addMoodBuff(3, 3); state.dayLog.notes.push(t('ev.coldstranger.note0')); return t('ev.coldstranger.r0'); } },
        { labelId: 'ev.coldstranger.c1', run() { addMoodBuff(-2, 2); state.dayLog.notes.push(t('ev.coldstranger.note1')); return t('ev.coldstranger.r1'); } },
      ],
    },
    // 2. 여름: 상한 것 반값에 떠넘기려는 행상. 간파 / 속아 삼(식중독).
    spoil_merchant: {
      icon: '🥴', titleId: 'ev.spoilmerchant.title', textId: 'ev.spoilmerchant.text',
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
      icon: '💧', titleId: 'ev.leakyroof.title', textId: 'ev.leakyroof.text',
      when: { weather: ['rain', 'storm'], shelters: ['container', 'rooftop', 'subway', 'ship'] },
      choices: [
        { labelId: 'ev.leakyroof.c0', cost: { material: 1 }, run() { return t('ev.leakyroof.r0'); } },
        { labelId: 'ev.leakyroof.c1', run() { state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 12); return t('ev.leakyroof.r1'); } },
      ],
    },
    // 4. 눈+아침: 밤새 셸터를 돌고 간 발자국. 따라가기(소득/부상) / 지우기(안정감+).
    snow_prints: {
      icon: '👣', titleId: 'ev.snowprints.title', textId: 'ev.snowprints.text',
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
      icon: '🚢', titleId: 'ev.lighthouseship.title', textId: 'ev.lighthouseship.text',
      when: { shelters: ['lighthouse'], night: true },
      choices: [
        { labelId: 'ev.lighthouseship.c0', cost: { fuel: 1 }, run() { addMoodBuff(2, 3); state.dayLog.notes.push(t('ev.lighthouseship.note0')); return t('ev.lighthouseship.r0'); } },
        { labelId: 'ev.lighthouseship.c1', run() { return t('ev.lighthouseship.r1'); } },
      ],
    },
    // 6. 온실 전용: 씨앗 훔치는 새들. 쫓기 / 나눠주기(분위기+, 반짝이).
    greenhouse_birds: {
      icon: '🐦', titleId: 'ev.greenhousebirds.title', textId: 'ev.greenhousebirds.text',
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
      icon: '🌆', titleId: 'ev.distantlight.title', textId: 'ev.distantlight.text',
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
      icon: '📻', titleId: 'ev.radioghost.title', textId: 'ev.radioghost.text',
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
    // 9. 무조건부 저확률: 벽에서 발견한 과거 달력. 메모 1 드랍.
    old_calendar: {
      icon: '📅', titleId: 'ev.oldcalendar.title', textId: 'ev.oldcalendar.text',
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
      icon: '🐾', titleId: 'ev.catgift.title', textId: 'ev.catgift.text',
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
      icon: '🚰', titleId: 'ev.frozenpipe.title', textId: 'ev.frozenpipe.text',
      when: { seasons: ['winter'] },
      choices: [
        { labelId: 'ev.frozenpipe.c0', cost: { parts: 1 }, run() { return t('ev.frozenpipe.r0'); } },
        { labelId: 'ev.frozenpipe.c1', run() { state.pipeFrozenUntil = state.day + 3; state.dayLog.notes.push(t('ev.frozenpipe.note1')); return t('ev.frozenpipe.r1'); } },
      ],
    },
    // 12. 봄/가을+낮: 멀리 지나가는 행렬. 관측만(만나지 않는다). 쌍안경 있으면 상세 노트.
    caravan_pass: {
      icon: '🛻', titleId: 'ev.caravanpass.title', textId: 'ev.caravanpass.text',
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
  
    /* ── 특수 인카운터 (일반 풀에서 제외) ── */
    cat: {
      special: true,
      icon: '🐈', titleId: 'ev.cat.title', textId: 'ev.cat.text',
      choices: [
        { labelId: 'ev.cat.c0', cost: { food: 1 }, run() {
          state.cat = 1;
          // 코트 랜덤(입양 시 1회 확정) — spawnCat 전에 정해야 메시가 해당 코트로 빌드된다.
          //   구세이브는 catCoat 미보유 → cat.js가 'tabby'로 폴백(외형 불변).
          const coats = ['tabby', 'black', 'siamese', 'ragdoll'];
          state.catCoat = coats[Math.floor(Math.random() * coats.length)];
          spawnCat();
          state.dayLog.notes.push(t('day.catJoined'));
          playSfx('meow1');
          // 결과 문구에 코트 1줄 분기(ko/en) — 어떤 털의 아이가 왔는지 알려준다.
          return t('ev.cat.r0') + '<br>' + t('ev.cat.coat.' + state.catCoat);
        } },
        { labelId: 'ev.cat.c1', run() { return t('ev.cat.r1'); } },
      ],
    },
    // ── 2.0 엔딩 3분기 (GD-2.0 §5·§9.5) — 아홉 번째 겨울을 넘긴 봄, 어디에 있든 구조가 온다 ──
    //   문안은 누적 성향(endingLeaning)으로 한 줄 변주되지만, 선택은 언제나 셋 다 열려 있다.
    //   '보류'는 4번째 문 — 다음 봄에 다시 온다(passWinter 재예약). 세 갈래 모두 런은 계속된다.
    ending_choice: {
      special: true,
      icon: '🚁', titleId: 'end3.title', textId: 'end3.text',
      textFn: () => t('end3.text', { winters: state.winters }) + '<br><br>' + t('end3.lean.' + endingLeaning()),
      choices: [
        { labelId: 'end3.c.escape', run() { state.endingType = 'escape'; setTimeout(() => runEndingSequence('escape'), 400); return t('end3.r.escape'); } },
        { labelId: 'end3.c.newworld', run() { state.endingType = 'newworld'; setTimeout(() => runEndingSequence('newworld'), 400); return t('end3.r.newworld'); } },
        { labelId: 'end3.c.rest', run() { state.endingType = 'rest'; setTimeout(() => runEndingSequence('rest'), 400); return t('end3.r.rest'); } },
        { labelId: 'end3.c.wait', run() { return t('end3.r.wait'); } },
      ],
    },
    // 2.0 조기 탈출 (§9.5) — 박사의 정기 교신에 닿은 사람에게만, 아홉 번째 겨울 전에 한 번 열리는 문.
    //   보류하면 이 문은 닫힌다(구조는 9겨울에 다시 온다). 진실을 다 보기 전에 떠나는 자의 엔딩.
    early_rescue: {
      special: true,
      icon: '📻', titleId: 'end3.early.title', textId: 'end3.early.text',
      choices: [
        { labelId: 'end3.early.c0', run() { state.endingType = 'escape'; setTimeout(() => runEndingSequence('escape'), 400); return t('end3.early.r0'); } },
        { labelId: 'end3.early.c1', run() { return t('end3.early.r1'); } },
      ],
    },
    ending: {
      special: true,
      icon: '🚁', titleId: 'ev.ending.title', textId: 'ev.ending.text',
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
      icon: '📻', titleId: 'ev.doctor.title', textId: 'ev.doctor.text',
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
      icon: '📡', titleId: 'ev.doctorReg.title', textId: 'ev.doctorReg.text',
      textFn: () => t('ev.doctorReg.text') + (state.memos && MEMOS_RESEARCH.every(id => state.memos[id]) ? '<br><br>' + t('ev.doctorReg.textTruth') : ''),
      choices: [
        { labelId: 'ev.doctorReg.c0', run() { state.doctorRegularSeen = true; return t('ev.doctorReg.r0'); } },
      ],
    },
  };
  return EVENTS;
}
