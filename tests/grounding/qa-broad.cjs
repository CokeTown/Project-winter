/* 광역 시스템 그라운딩 스윕 — 이번 세션 밖 핵심 시스템 실런타임 점검 (디렉터 "전반적 버그 점검").
   안전: 관측/판정 위주. 각 페이즈 try/catch 격리 + 전역 예외 수집. */
const path = require('path');
const H = require(path.join(__dirname, '..', 'harness.cjs'));
const { boot, evalJs, call, check, report } = H;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = async expr => JSON.parse(await evalJs(expr));

(async () => {
  await boot();
  await evalJs(`(()=>{ window.__qaErr=[];
    window.addEventListener('error', e=>window.__qaErr.push('err:'+(e.message||e.error)));
    window.addEventListener('unhandledrejection', e=>window.__qaErr.push('reject:'+e.reason)); return true; })()`);
  await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(false);`);
  await sleep(300);

  // ── 1) 세이브 왕복 (변조→loadSave 무손실 복원) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter;
      S.state.day=42; S.state.res.wood=99; S.state.res.book=7;
      S.flushSave();
      S.state.day=1; S.state.res.wood=0; S.state.res.book=0;  // 변조
      const loaded = S.loadSave ? S.loadSave() : null;
      return JSON.stringify({ day:S.state.day, wood:S.state.res.wood, book:S.state.res.book, loadedOk:!!loaded }); })()`);
    check('세이브 왕복 무손실 (변조→loadSave 복원)', r.day === 42 && r.wood === 99 && r.book === 7,
      `day=${r.day} wood=${r.wood} book=${r.book} loadedOk=${r.loadedOk}`);
  } catch (e) { check('세이브 왕복 페이즈', false, 'THROW: ' + e.message); }

  // ── 2) 날씨 5종 + 전이 시스템(#83) ──
  try {
    await call(`S.simReset(); if(S.hideTitle)S.hideTitle();`);
    let ok = true, detail = [];
    for (const w of ['clear', 'snow', 'rain', 'ash', 'storm']) {
      try { await call(`S.setWeather('${w}');`); detail.push(w); }
      catch (e) { ok = false; detail.push(w + '✗'); }
    }
    check('날씨 5종 순회 무예외', ok && detail.length === 5, `[${detail.join(',')}]`);
    if (await evalJs(`typeof window.__shelter.transitionWeather==='function'`)) {
      await call(`S.setWeather('clear'); S.transitionWeather('snow');`);
      await sleep(200);
      const ts = await J(`JSON.stringify(window.__shelter.weatherTransState())`);
      check('날씨 전이 시스템(#83) 활성', ts.prev != null, `prev=${ts.prev} k=${ts.k} birds=${ts.birds}`);
    } else { check('날씨 전이 훅 존재', false, 'transitionWeather 미노출'); }
  } catch (e) { check('날씨 페이즈', false, 'THROW: ' + e.message); }

  // ── 3) 인카운터 엔진 (drawEvent 자격·가중·3연속 금지) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter; S.simReset(); S.state.evHistory=[];
      const ids=Object.keys(S.EVENTS); let drawn=[], invalid=0, threePeat=0;
      for(let i=0;i<40;i++){ const id=S.drawEvent(S.eventCtx()); if(id){ drawn.push(id); if(!S.EVENTS[id])invalid++; } }
      // 3연속 동일 검사
      for(let i=2;i<drawn.length;i++) if(drawn[i]===drawn[i-1]&&drawn[i]===drawn[i-2]) threePeat++;
      const uniq=[...new Set(drawn)];
      return JSON.stringify({ count:drawn.length, invalid, threePeat, uniq:uniq.length, sample:uniq.slice(0,6) }); })()`);
    check('인카운터 drawEvent 유효 id만', r.invalid === 0, `${r.count}회 draw, 무효 ${r.invalid}, 종류 ${r.uniq}`);
    check('인카운터 3연속 금지(REQ-EVT-02)', r.threePeat === 0, `3연속 ${r.threePeat}건 [${r.sample.join(',')}]`);
  } catch (e) { check('인카운터 페이즈', false, 'THROW: ' + e.message); }

  // ── 4) 고양이 (async GLB 스폰 대기 → 쓰다듬 반응) ──
  try {
    await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); S.state.cat=true; S.spawnCat&&S.spawnCat();`);
    let spawned = false;
    for (let i = 0; i < 25; i++) { // isSpawning 폴링 (고양이 GLB 로드 대기)
      await sleep(200);
      const st = await J(`JSON.stringify({sp: window.__shelter.catSpawning?window.__shelter.catSpawning():false, has: !!(window.__shelter.cat&&window.__shelter.cat())})`);
      if (st.has) { spawned = true; break; }
      if (!st.sp && i > 3) break; // 로드 끝났는데도 없으면 중단
    }
    check('고양이 스폰 (async GLB 로드 대기)', spawned, `spawned=${spawned}`);
    if (spawned) {
      const pet = await J(`(()=>{ const S=window.__shelter; S.petCat&&S.petCat(); const ps=S.catPetState&&S.catPetState(); return JSON.stringify({petHappy:ps?ps.petHappy:null}); })()`);
      check('고양이 쓰다듬 반응(petHappy↑)', pet.petHappy != null && pet.petHappy > 0, `petHappy=${pet.petHappy}`);
    }
  } catch (e) { check('고양이 페이즈', false, 'THROW: ' + e.message); }

  // ── 5) 아바타(#86) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter;
      S.avatarRespawn && S.avatarRespawn();
      const d = S.avatarState ? S.avatarState() : null;
      let forced=true; try{ S.avatarForceNext && S.avatarForceNext(); }catch(e){ forced=false; }
      return JSON.stringify({ dbg: d?true:false, mode: d&&d.mode, forced }); })()`);
    check('아바타 스폰/디버그', r.dbg === true, `mode=${r.mode}`);
    check('아바타 행동 추첨 무예외', r.forced === true, '');
  } catch (e) { check('아바타 페이즈', false, 'THROW: ' + e.message); }

  // ── 6) 탐험 전주기 (가방 확정 파밍 정산) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle();
      const before = {...S.state.res};
      S.state.exp = { region:'residential', rate:0, prep:[], startGameMin: S.state.gameMin, bag:true };
      window.__autoConfirm = true;
      S.resolveExpedition();
      // 가방: 실패(rate 0)라도 확정 1~2 파밍 → 최소 1개 자원 증가
      let gained=0; for(const k in S.state.res) gained += Math.max(0,(S.state.res[k]||0)-(before[k]||0));
      return JSON.stringify({ gained, exp: S.state.exp?1:0 }); })()`);
    check('탐험 정산 무예외 + exp 소진', r.exp === 0, `exp정리=${r.exp === 0}`);
    check('가방 확정 파밍 (실패해도 최소 1)', r.gained >= 1, `획득합=${r.gained}`);
  } catch (e) { check('탐험 페이즈', false, 'THROW: ' + e.message); }

  // ── 7) 엔딩 시퀀스 무예외 (Day 10000 탈출) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter; S.simReset();
      let ok=true; try{ S.runEndingSequence && S.runEndingSequence(); }catch(e){ ok=false; }
      return JSON.stringify({ ok }); })()`);
    check('엔딩 시퀀스 무예외', r.ok === true, '');
  } catch (e) { check('엔딩 페이즈', false, 'THROW: ' + e.message); }
  await sleep(300);

  // ── 8) 런타임 예외 총점검 ──
  const errs = await J(`JSON.stringify(window.__qaErr||[])`);
  check('런타임 예외 0건 (전 페이즈)', errs.length === 0, errs.length ? errs.slice(0, 6).join(' | ') : '깨끗');

  const green = report();
  await sleep(150); H.app.quit(); process.exit(green ? 0 : 1);
})().catch(e => { console.error('하네스 치명:', e); H.app.quit(); process.exit(2); });
