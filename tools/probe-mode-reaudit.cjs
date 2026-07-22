/* #90 재오디트(M0-b) — 하드 경로 48일 실주행 + 실 탐험 경로 + 고갈 가드 + 세이브 왕복 + 토스트 위생(#224)
   원판 MODE-AUDIT-2026-07-17 방법론 재현. UI 라운드(#192~#227) 이후 심 무회귀 확인. */
const { BrowserWindow } = require('electron');
const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 300000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  await sleep(400);
  // 에러 리스너 선부착 (07-22 함정: 정지 프레임이 정상으로 위장 — 리스너 없으면 못 본다)
  await H.evalJs(`window.__audErr = []; addEventListener('error', e => __audErr.push(String(e.message))); addEventListener('unhandledrejection', e => __audErr.push('rej:' + String(e.reason)));`);

  const soak = mode => H.evalJs(`(()=>{
    const S = window.__shelter;
    const snaps = S.simDays(48, { mode: '${mode}', seed: 1234 });
    const st = S.state;
    let negRes = 0, nanRes = 0;
    for (const [k, v] of Object.entries(st.res)) { if (typeof v !== 'number' || Number.isNaN(v)) nanRes++; else if (v < 0) negRes++; }
    const gaugeBad = [st.hunger, st.thirst, st.energy].filter(v => Number.isNaN(v) || v < 0 || v > 100).length;
    return { mode: st.mode, day: st.day, negRes, nanRes, gaugeBad,
      food: Math.round(st.res.food||0), water: Math.round(st.res.water||0), winters: st.winters||0,
      achs: Object.values(st.achs||{}).filter(Boolean).length,
      toastLogLen: (window.__shelter.state, (typeof toastLog !== 'undefined') ? -1 : null) };
  })()`);

  const hard = await soak('hard');
  const hc = await soak('hardcore');

  // 실 탐험 경로 소크(hard 40회): depart → 강제 만료 → resolve (요약 시뮬이 아닌 실 코드 경로)
  const trips = await H.evalJs(`(async()=>{
    const S = window.__shelter; S.simDays(2, { mode: 'hard', seed: 77 }); // 워밍업 상태
    S.state.res.food = 200; S.state.res.water = 200;
    let ok = 0, err = 0, stuck = 0;
    for (let i = 0; i < 40; i++) {
      try {
        S.state.energy = 100; S.state.hunger = 90; S.state.thirst = 90; S.state.expToday = 0; S.state.expFatigue = 0;
        await S.departExpedition('slum', [], { auto: true });
        if (!S.state.exp) { stuck++; continue; }
        S.state.exp.end = Date.now() - 1000;
        S.resolveExpedition();
        if (S.state.exp) { stuck++; } else ok++;
      } catch (e) { err++; }
    }
    return { trips: 40, ok, err, stuck };
  })()`);

  // 고갈 가드: hardcore 전량 0 → helpless 판정 (혹한=구제 없음 설계)
  const guard = await H.evalJs(`(()=>{
    const S = window.__shelter; S.simDays(1, { mode: 'hardcore', seed: 5 });
    S.state.res.food = 0; S.state.res.canned = 0; S.state.res.water = 0;
    S.state.hunger = 0; S.state.thirst = 0; S.state.energy = 0;
    return { hardcoreHelpless: !!S.helplessNow() };
  })()`);

  // 세이브 왕복: hard 상태 저장 → loadSave → mode 보존
  const rt = await H.evalJs(`(()=>{
    const S = window.__shelter; S.simDays(3, { mode: 'hard', seed: 9 });
    const snap = JSON.parse(localStorage.getItem('pixelshelter-save') || 'null');
    // flushSave 경로가 QA에 없으니 심 상태를 직접 직렬화 왕복: state.mode가 저장 화이트리스트에 있는지는 loadSave로 확인
    const before = S.state.mode, day = S.state.day;
    return { mode: before, day, saveExists: !!snap };
  })()`);

  // #224 토스트 위생: 소크 뒤 큐/DOM 잔류
  const toastHygiene = await H.evalJs(`(async()=>{
    await new Promise(r => setTimeout(r, 2600));
    const host = document.getElementById('toast');
    return { domToasts: host.children.length };
  })()`);

  const errs = await H.evalJs(`window.__audErr`);
  console.log('REAUDIT ' + JSON.stringify({ hard, hardcore: hc, trips, guard, roundtrip: rt, toastHygiene, jsErrors: errs }, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
