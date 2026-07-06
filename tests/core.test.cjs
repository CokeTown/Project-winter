// 코어 회귀 테스트 — 현재 동작을 핀으로 박제(characterization). 리팩토링이 이 값을 바꾸면 = 회귀.
//   경제 밴드(전 4모드) + 세이브 왕복 + i18n 패리티. 오프스크린 하네스 위, Python 불요.
//   실행: npm test  (dist 빌드 후 electron으로 이 파일 로드)
const { boot, evalJs, call, check, near, report, app } = require('./harness.cjs');

const ROT = "['residential','commercial','industrial','slum']";
// SHELTERS 데이터 시그니처 핀 (SHELTERS 분리 안전망). 불일치 시 SHELTER_SIG(actual) 로그로 재캡처.
const SHELTER_SIG = 'bunker:{"bc":5,"cold":0,"hearth":false,"needsLight":0,"unlock":2,"perkExp":0,"wpool":"clear,snow,clear,rain","rw":8.5,"rd":6,"rh":3}|bus:{"bc":3,"cold":0,"hearth":false,"needsLight":0,"unlock":9,"perkExp":0,"wpool":"clear,ash,rain,clear","rw":6.8,"rd":2.4,"rh":2.2}|cabin:{"bc":10,"cold":0,"hearth":false,"needsLight":0,"unlock":7,"perkExp":0,"wpool":"clear,snow,rain,clear","rw":10,"rd":8,"rh":2.7}|container:{"bc":2,"cold":8,"hearth":false,"needsLight":0,"unlock":0,"perkExp":0.05,"wpool":"clear,ash,ash,snow","rw":6.4,"rd":2.9,"rh":2.4}|controltower:{"bc":7,"cold":6,"hearth":false,"needsLight":0,"unlock":29,"perkExp":0.02,"wpool":"clear,snow,rain,clear","rw":6.6,"rd":6.6,"rh":2.6}|greenhouse:{"bc":8,"cold":0,"hearth":false,"needsLight":0,"unlock":15,"perkExp":0,"wpool":"clear,rain,clear,snow","rw":9,"rd":6,"rh":2.4}|lighthouse:{"bc":9,"cold":0,"hearth":false,"needsLight":0,"unlock":22,"perkExp":0.03,"wpool":"clear,rain,snow,rain","rw":7,"rd":7,"rh":2.6}|lodge:{"bc":9,"cold":0,"hearth":true,"needsLight":0,"unlock":33,"perkExp":0,"wpool":"clear,snow,snow,snow","rw":8.4,"rd":6.4,"rh":3}|rooftop:{"bc":4,"cold":0,"hearth":false,"needsLight":0,"unlock":4,"perkExp":0,"wpool":"clear,rain,clear,snow","rw":5.6,"rd":4.4,"rh":2.4}|ship:{"bc":7,"cold":0,"hearth":false,"needsLight":0,"unlock":18,"perkExp":0,"wpool":"clear,rain,rain,snow","rw":10,"rd":7,"rh":0.9}|subway:{"bc":6,"cold":0,"hearth":false,"needsLight":12,"unlock":12,"perkExp":0,"wpool":"clear","rw":11,"rd":6,"rh":3}|tugboat:{"bc":6,"cold":0,"hearth":false,"needsLight":0,"unlock":25,"perkExp":0,"wpool":"clear,snow,rain,snow","rw":6.4,"rd":4.2,"rh":2.2}';

(async () => {
  try {
    await boot();

    // ── 1) 경제 밴드 (로테이션 config, 시드 고정) — 밸런스 회귀 그물 ──
    //   기준선 = 2026-07-06 측정(#76 인플레 캡 + 난이도 income + 하드코어 0.28).
    //   주의: setWeather는 run() 안에서 딱 한 번만 — simReset이 weather 모듈을 안 리셋해서
    //     이중 호출 시 시뮬 결과가 흔들림(재현성 결함, 리팩토링 백로그에 기록). 단일 호출로 결정론화.
    const econ = await call(`
      const at = (snaps, d) => snaps.find(x => x.day === d) || snaps[snaps.length - 1];
      const fc = s => Math.round((s.res.food || 0) + (s.res.canned || 0));
      const run = (mode, seed) => { S.setWeather('clear');
        const a = S.simDays(432, { mode, seed, regions: ${ROT} });
        let run = 0, maxRun = 0; for (const x of a) { if (x.starving) { run++; maxRun = Math.max(maxRun, run); } else run = 0; }
        return { d30: fc(at(a, 30)), d60: fc(at(a, 60)), d432: fc(at(a, 432)),
          starve: a.filter(x => x.starving).length, maxRun }; };
      const hc = [11111,22222,33333,44444,55555].map(s => run('hardcore', s));
      return JSON.stringify({
        normal: run('normal', 11111), hard: run('hard', 11111), zen: run('zen', 11111),
        hcDeaths: hc.filter(r => r.maxRun > 30).length, hcSurvive: hc.filter(r => r.maxRun <= 30).length });
    `);
    const e = JSON.parse(econ);
    const band = (name, v, lo, hi) => check(name, v >= lo && v <= hi, `실측 ${v} / 밴드 ${lo}~${hi}`);
    // 노말: 굶는 날 0(코지 코어 불가침) + Day30 코지 밴드 + Day432 인플레 캡.
    //   ※ 중반(Day30/60) 정확값은 시뮬 비-헤르메틱성으로 harness마다 ±20 흔들려(105~126) 밴드로 핀.
    //     Day432 캡은 harness 무관 안정(339)이라 타이트하게. (헤르메틱 fix는 리팩토링 백로그 FINDINGS.md)
    check('경제/노말 굶는날 0 (코지 안전선)', e.normal.starve === 0, `굶는날 ${e.normal.starve}`);
    band('경제/노말 Day30 코지 밴드(100~160)', e.normal.d30, 100, 160);
    band('경제/노말 Day60(여유)', e.normal.d60, 160, 240);
    near('경제/노말 Day432(인플레 캡)', e.normal.d432, 339, 4);
    // 하드: 굶는 날 0 + 초·중반 빡셈(밴드)
    check('경제/하드 굶는날 0', e.hard.starve === 0, `굶는날 ${e.hard.starve}`);
    band('경제/하드 Day30(빡셈 35~55)', e.hard.d30, 35, 55);
    near('경제/하드 Day432', e.hard.d432, 239, 4);
    // 하드코어: 브루탈하되 완주 가능 — 5시드 중 일부 사망 + 일부 생존
    check('경제/하드코어 사망 존재(진짜 죽는다)', e.hcDeaths >= 1, `사망 ${e.hcDeaths}/5`);
    check('경제/하드코어 완주 가능(생존 존재)', e.hcSurvive >= 1, `생존 ${e.hcSurvive}/5`);
    // 무한: 노말과 동일 안착
    near('경제/무한 Day432', e.zen.d432, 339, 4);

    // ── SHELTERS 데이터 무결성 (SHELTERS 데이터/빌드 분리 리팩토링 안전망) ──
    //   로직(한파/쾌적/경제)이 읽는 데이터 필드 + 각 셸터의 build 함수 존재를 핀. 분리가 이걸 온전히 보존해야 한다.
    const shel = await call(`
      const ids = Object.keys(S.SHELTERS).sort();
      const sig = ids.map(id => { const s = S.SHELTERS[id];
        return id + ':' + JSON.stringify({ bc: s.baseComfort ?? 0, cold: s.cold ?? 0, hearth: !!s.hearth,
          needsLight: s.needsLight ?? 0, unlock: s.unlockAt ?? 0, perkExp: s.perk?.expBonus ?? 0,
          wpool: (s.weatherPool || []).join(','), rw: s.room?.w ?? 0, rd: s.room?.d ?? 0, rh: s.room?.h ?? 0 }); }).join('|');
      const allBuild = ids.every(id => typeof S.SHELTERS[id].buildRoom === 'function' && typeof S.SHELTERS[id].buildEnv === 'function');
      return JSON.stringify({ count: ids.length, sig, allBuild });
    `);
    const shd = JSON.parse(shel);
    if (shd.sig !== SHELTER_SIG) console.log('SHELTER_SIG(actual) ' + shd.sig); // 불일치 시 재핀용
    check('SHELTERS 빌드 함수 전부 존재(렌더 game.js 잔류)', shd.allBuild, `셸터 ${shd.count}종`);
    check('SHELTERS 데이터 시그니처 불변(분리 안전망)', shd.sig === SHELTER_SIG, `len ${shd.sig.length}`);

    // ── 2) 구세이브 마이그레이션 — #76 신규 필드 없이 저장된 세이브가 안전하게 로드되나 ──
    //   (내가 book/bookProgress/demoEnded를 마이그레이션 테스트 없이 넣은 것 → 이 그물로 방어)
    const sv = await call(`
      S.simReset();
      // 구세이브 시뮬레이션: 현대 세이브(ver:3)인데 #76 신규 필드만 없는 상태.
      //   (ver 없으면 v2→v3 마이그레이션이 res/day를 리셋함 — 그건 #76 마이그레이션 테스트가 아님)
      const oldSave = { state: { ver: 3, day: 42, winters: 3, mode: 'hard', current: 'container',
        res: { food: 10, canned: 55, water: 20, cloth: 3 } }, savedAt: Date.now() };
      localStorage.setItem(S.slotKey(1), JSON.stringify(oldSave));
      S.loadSave(); // currentSlot(=1) 읽어 마이그레이션 적용
      return JSON.stringify({
        day: S.state.day, winters: S.state.winters, canned: S.state.res.canned || 0,
        bookType: typeof S.state.res.book, bookVal: S.state.res.book,
        demoType: typeof S.state.demoEnded });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const s = JSON.parse(sv);
    if (s.error) {
      check('구세이브 마이그레이션 (예외 없이 로드)', false, s.error);
    } else {
      check('마이그레이션/구필드 보존(day 42)', s.day === 42, `day ${s.day}`);
      check('마이그레이션/구필드 보존(winters 3)', s.winters === 3, `winters ${s.winters}`);
      check('마이그레이션/구필드 보존(canned 55)', s.canned === 55, `canned ${s.canned}`);
      check('마이그레이션/신규 book 안전 기본값(number)', s.bookType === 'number', `book=${s.bookVal} (${s.bookType})`);
      check('마이그레이션/신규 demoEnded 정의됨', s.demoType !== 'undefined', `demoEnded ${s.demoType}`);
    }

    // ── 3) i18n ko/en 패리티 (런타임 확인 — check-i18n의 런타임 짝) ──
    const i18n = await call(`
      const KO = S.__i18nKeys ? S.__i18nKeys() : null;
      // 노출 훅이 없으면 대표 키 몇 개로 스모크
      const probe = ['title.ver','day.surplusSold','exp.note.book','demo.end.title'];
      const missing = probe.filter(k => { const v = S.t(k); return !v || v === k; });
      return JSON.stringify({ missing });
    `).catch(err => JSON.stringify({ missing: ['(t 훅 없음)'], error: String(err) }));
    const p = JSON.parse(i18n);
    check('i18n 대표 키 해석됨', p.missing.length === 0, p.missing.length ? '누락 ' + p.missing.join(',') : '');

    const green = report();
    app.exit(green ? 0 : 1);
  } catch (err) {
    console.error('HARNESS ERROR', err);
    app.exit(2);
  }
})();
app.on && app.on('window-all-closed', () => {});
