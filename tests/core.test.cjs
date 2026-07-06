// 코어 회귀 테스트 — 현재 동작을 핀으로 박제(characterization). 리팩토링이 이 값을 바꾸면 = 회귀.
//   경제 밴드(전 4모드) + 세이브 왕복 + i18n 패리티. 오프스크린 하네스 위, Python 불요.
//   실행: npm test  (dist 빌드 후 electron으로 이 파일 로드)
const { boot, evalJs, call, check, near, report, app } = require('./harness.cjs');

const ROT = "['residential','commercial','industrial','slum']";
// SHELTERS 전 필드 해시 핀 (SHELTERS 분리 안전망). 불일치 시 SHELTER_HASH(actual) 로그로 재핀.
const SHELTER_HASH = -1537463991;
// 구세이브 마이그레이션 정적 기본값 포괄 스냅샷 해시 (core/save.js 추출 안전망). 불일치 시 MIG_HASH(actual) 재핀.
const MIG_HASH = 779394296;
// 암시장(scale 오퍼) 모드별 해결값 스냅샷 해시 (인카운터 밸런스 안전망). 불일치 시 MARKET_HASH(actual) 재핀.
const MARKET_HASH = -1012304627;
// 「지식」 테크트리 시그니처 해시 (branch/tier/cost/effect). 노드/비용/효과 변경 시 KNOWLEDGE_HASH(actual) 재핀.
const KNOWLEDGE_HASH = -451536973;

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
    //   각 셸터의 "모든 비-함수 필드"(desc·mood·perk·upkeep·_slab 등 전부)를 deep stable 직렬화 → 해시로 핀.
    //   분리가 어느 필드 하나라도 바꾸거나 빠뜨리면 해시가 달라져 즉시 검거. build 함수 존재도 확인.
    const shel = await call(`
      const stable = (o) => {
        if (o === null || typeof o !== 'object') return JSON.stringify(o);
        if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
        return '{' + Object.keys(o).filter(k => typeof o[k] !== 'function').sort()
          .map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
      };
      const ids = Object.keys(S.SHELTERS).sort();
      const sig = ids.map(id => id + ':' + stable(S.SHELTERS[id])).join('|');
      let h = 0; for (let i = 0; i < sig.length; i++) h = (Math.imul(h, 31) + sig.charCodeAt(i)) | 0;
      const allBuild = ids.every(id => typeof S.SHELTERS[id].buildRoom === 'function' && typeof S.SHELTERS[id].buildEnv === 'function');
      return JSON.stringify({ count: ids.length, hash: h, allBuild });
    `);
    const shd = JSON.parse(shel);
    if (shd.hash !== SHELTER_HASH) console.log('SHELTER_HASH(actual) ' + shd.hash); // 불일치 시 재핀용
    check('SHELTERS 빌드 함수 전부 존재(렌더 game.js 잔류)', shd.allBuild, `셸터 ${shd.count}종`);
    check('SHELTERS 전 필드 해시 불변(분리 안전망)', shd.hash === SHELTER_HASH, `hash ${shd.hash}`);

    // ── 인카운터/암시장 모드 밸런스 (2026-07-07 하드 튜닝) — scale 오퍼 모드별 해결값 스냅샷 ──
    //   봄(겨울 프리미엄 배제)+subwayOpen 빈 상태에서 4모드 marketOfferCost/GetN 해결값을 해시로 핀.
    const mkt = await call(`
      S.simReset(); S.state.day = 1; S.state.subwayOpen = {};
      const offers = S.BAL.subway.marketOffers.filter(o => o.scale);
      const modes = ['normal','hard','hardcore','zen'];
      const snap = {};
      for (const m of modes) { S.state.mode = m;
        snap[m] = offers.map(o => { const c = S.marketOfferCost(o);
          return o.id + ':' + Object.entries(c).map(([k,v])=>k+v).join('+') + '>' + o.get + S.marketOfferGetN(o); }).join('|'); }
      const sig = JSON.stringify(snap);
      let h=0; for(let i=0;i<sig.length;i++) h=(Math.imul(h,31)+sig.charCodeAt(i))|0;
      const cb = {}; for (const m of modes){ S.state.mode=m; cb[m]=S.marketOfferCost(S.BAL.subway.marketOffers.find(o=>o.id==='clothToBattery')).cloth; }
      return JSON.stringify({ marketHash: h, cb });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const mk = JSON.parse(mkt);
    if (mk.error) { check('암시장 모드 밸런스(예외 없이 해결)', false, mk.error); }
    else {
      if (mk.marketHash !== MARKET_HASH) console.log('MARKET_HASH(actual) ' + mk.marketHash);
      check('암시장/천→배터리 난이도 단조(무한≤노말<하드<하드코어)',
        mk.cb.zen <= mk.cb.normal && mk.cb.normal < mk.cb.hard && mk.cb.hard < mk.cb.hardcore,
        `cloth zen ${mk.cb.zen} / normal ${mk.cb.normal} / hard ${mk.cb.hard} / hardcore ${mk.cb.hardcore}`);
      check('암시장 모드별 해결값 해시 불변(밸런스 안전망)', mk.marketHash === MARKET_HASH, `hash ${mk.marketHash}`);
    }

    // ── 「지식」 테크트리 (§9) — 트리 무결성 + 해금 로직 + 선행 게이트 + 마이그레이션 ──
    const kn = await call(`
      const K = S.KNOWLEDGE;
      const ids = Object.keys(K).sort();
      const branches = {}; let costOk = true;
      for (const id of ids) { const n = K[id]; (branches[n.branch] = branches[n.branch] || []).push(n.tier); if (n.cost !== n.tier) costOk = false; }
      const tiersPerBranch = Object.values(branches).every(ts => ts.slice().sort().join() === '1,2,3');
      const stable = (o)=>{ if(o===null||typeof o!=='object')return JSON.stringify(o); if(Array.isArray(o))return '['+o.map(stable).join(',')+']'; return '{'+Object.keys(o).sort().map(k=>JSON.stringify(k)+':'+stable(o[k])).join(',')+'}'; };
      const sig = ids.map(id => id+':'+stable({b:K[id].branch,t:K[id].tier,c:K[id].cost,e:K[id].effect})).join('|');
      let h=0; for(let i=0;i<sig.length;i++) h=(Math.imul(h,31)+sig.charCodeAt(i))|0;
      // 해금 로직 (fresh + 책 3 지급)
      S.simReset(); S.state.knowledge = []; S.state.res.book = 3;
      const t1ok = S.knowledgeUnlockable('insulation');
      const t2blocked = !S.knowledgeUnlockable('effHeating');
      const u1 = S.unlockKnowledge('insulation');
      const bookAfter = S.state.res.book, has1 = S.hasKnowledge('insulation'), cd = S.knowColdDefense();
      const t2now = S.knowledgeUnlockable('effHeating');
      const t3blocked = !S.knowledgeUnlockable('hearthCraft');
      // 효과 훅 (배치 A): 단열/화덕→coldDefense, 아늑함→comfort +6
      S.simReset(); S.state.knowledge = []; S.state.res.book = 30; S.state.upkeepOk = true;
      const cdBase = S.coldDefenseLevel();
      S.unlockKnowledge('insulation'); const cdIns = S.coldDefenseLevel();
      S.unlockKnowledge('effHeating'); S.unlockKnowledge('hearthCraft'); const cdHearth = S.coldDefenseLevel();
      const cmBefore = S.comfortDetail().score;
      S.unlockKnowledge('tidiness'); S.unlockKnowledge('handiness'); S.unlockKnowledge('coziness');
      const cd2 = S.comfortDetail(); const cmDelta = cd2.score - cmBefore; const knowMod = cd2.knowMod;
      // 효과 훅 (배치 B): 자급/정리 게터 (data→getter 정확성; processDay 무손상은 경제 밴드가 커버)
      S.simReset(); S.state.knowledge = []; S.state.res.book = 30;
      S.unlockKnowledge('purify'); S.unlockKnowledge('gardening'); S.unlockKnowledge('preserve'); S.unlockKnowledge('tidiness');
      const kWater = S.knowWaterPerDay(), kGardenA = S.knowGardenAnywhere(), kGardenB = S.knowGardenBonus();
      const kSpoil = S.knowSpoilMul(), kSalt = S.knowSaltCureBonus(), kDirt = S.knowDirtReduce();
      // 마이그레이션 (구세이브 = knowledge 필드 부재)
      S.simReset(); S.state.knowledge = undefined;
      const old = { state: { ver:3, day:5, mode:'normal', current:'container', res:{food:5} }, savedAt: Date.now() };
      localStorage.setItem(S.slotKey(1), JSON.stringify(old)); S.loadSave();
      const migOk = Array.isArray(S.state.knowledge) && S.state.knowledge.length === 0;
      return JSON.stringify({ count: ids.length, branchCount: Object.keys(branches).length, tiersPerBranch, costOk, hash: h,
        t1ok, t2blocked, u1, bookAfter, has1, cd, t2now, t3blocked, migOk,
        cdBase, cdIns, cdHearth, cmDelta, knowMod,
        kWater, kGardenA, kGardenB, kSpoil, kSalt, kDirt });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const kd = JSON.parse(kn);
    if (kd.error) { check('지식 트리 (예외 없이)', false, kd.error); }
    else {
      if (kd.hash !== KNOWLEDGE_HASH) console.log('KNOWLEDGE_HASH(actual) ' + kd.hash);
      check('지식/트리 무결성 (12노드·4갈래×3티어·티어=비용)', kd.count===12 && kd.branchCount===4 && kd.tiersPerBranch && kd.costOk, `노드 ${kd.count} 갈래 ${kd.branchCount}`);
      check('지식/해금 판정 (t1 가능·t2 선행 차단)', kd.t1ok && kd.t2blocked, `t1 ${kd.t1ok} t2blk ${kd.t2blocked}`);
      check('지식/해금 실행 (책 3→2·보유·효과 cd1)', kd.u1 && kd.bookAfter===2 && kd.has1 && kd.cd===1, `book ${kd.bookAfter} cd ${kd.cd}`);
      check('지식/선행 게이트 (t1 후 t2 열림·t3 차단)', kd.t2now && kd.t3blocked, `t2now ${kd.t2now} t3blk ${kd.t3blocked}`);
      check('지식/구세이브 마이그레이션 (knowledge=[])', kd.migOk, `migOk ${kd.migOk}`);
      check('지식/효과 단열→한파방어 (0→1)', kd.cdBase===0 && kd.cdIns===1, `base ${kd.cdBase} ins ${kd.cdIns}`);
      check('지식/효과 화덕→방어 +1 (→2)', kd.cdHearth===2, `cdHearth ${kd.cdHearth}`);
      check('지식/효과 아늑함→쾌적 +6', kd.cmDelta===6 && kd.knowMod===6, `Δ${kd.cmDelta} knowMod ${kd.knowMod}`);
      check('지식/효과B 정수→물+1·텃밭 수확1', kd.kWater===1 && kd.kGardenA===true && kd.kGardenB===1, `water ${kd.kWater} gardenA ${kd.kGardenA} gardenB ${kd.kGardenB}`);
      check('지식/효과B 보존→부패×0.5·염장+1·정리 청결−0.5', kd.kSpoil===0.5 && kd.kSalt===1 && kd.kDirt===0.5, `spoil ${kd.kSpoil} salt ${kd.kSalt} dirt ${kd.kDirt}`);
      check('지식 시그니처 해시 불변 (트리 안전망)', kd.hash === KNOWLEDGE_HASH, `hash ${kd.hash}`);
    }

    // ── 2) 구세이브 마이그레이션 — #76 신규 필드 없이 저장된 세이브가 안전하게 로드되나 ──
    //   (내가 book/bookProgress/demoEnded를 마이그레이션 테스트 없이 넣은 것 → 이 그물로 방어)
    //   포괄 스냅샷: 마이그레이션이 채우는 정적 기본값 ~40필드를 해시로 핀(save.js 추출 안전망).
    //   hunger/thirst는 오프라인 decay가 건드려 비결정론이라 제외. 불일치 시 MIG_HASH(actual) 재핀.
    const sv = await call(`
      S.simReset();
      // 구세이브 시뮬레이션: 현대 세이브(ver:3)인데 신규 필드만 없는 상태.
      //   (ver 없으면 v2→v3 마이그레이션이 res/day를 리셋함 — 그건 이 테스트 대상 아님)
      const oldSave = { state: { ver: 3, day: 42, winters: 3, mode: 'hard', current: 'container',
        res: { food: 10, canned: 55, water: 20, cloth: 3 } }, savedAt: Date.now() };
      localStorage.setItem(S.slotKey(1), JSON.stringify(oldSave));
      S.loadSave(); // currentSlot(=1) 읽어 마이그레이션 적용
      const st = S.state;
      const mig = {
        day: st.day, winters: st.winters, mode: st.mode, energy: st.energy, canned: st.res.canned||0,
        catCoat: st.catCoat, expToday: st.expToday, expFailStreak: st.expFailStreak, tutDay: st.tutDay,
        doctorRadioPending: st.doctorRadioPending, evHistoryLen: (Array.isArray(st.evHistory)?st.evHistory.length:-1),
        moodBuff: st.moodBuff, lastBroadcastDay: st.lastBroadcastDay, pipeFrozenUntil: st.pipeFrozenUntil,
        bunkerRoof: st.bunkerRoof, bunkerBackdoor: st.bunkerBackdoor, hasCutter: st.hasCutter,
        rooftopSlate: st.rooftopSlate, rooftopGardenStage: st.rooftopGardenStage,
        projects: typeof st.projects, breakwaterHut: st.breakwaterHut, icefishToday: st.icefishToday,
        salt: st.res.salt||0, subwayHub: st.subwayHub, subwayOpen: typeof st.subwayOpen,
        mushroomWaterTimer: st.mushroomWaterTimer, marketToday: st.marketToday,
        cablecarDone: st.cablecarDone, observatoryDone: st.observatoryDone,
        avalancheForecast: st.avalancheForecast, avalancheBlockUntil: st.avalancheBlockUntil,
        sketches: typeof st.sketches, nightSkyToday: st.nightSkyToday, deco: typeof st.deco,
        hazmat: st.hazmat, hazmatDone: st.hazmatDone, radioBaseDone: st.radioBaseDone,
        survivorLights: st.survivorLights, doctorRegularSeen: st.doctorRegularSeen,
        doctorRadioRegularPending: st.doctorRadioRegularPending, questIdx: st.questIdx,
        current: st.current, bookType: typeof st.res.book, demoType: typeof st.demoEnded,
        renovatedContainer: !!(st.renovated && st.renovated.container) };
      const sig = JSON.stringify(mig);
      let h = 0; for (let i=0;i<sig.length;i++) h=(Math.imul(h,31)+sig.charCodeAt(i))|0;
      return JSON.stringify({ day: mig.day, winters: mig.winters, canned: mig.canned, bookType: mig.bookType,
        demoType: mig.demoType, bunkerRoof: mig.bunkerRoof, hasCutter: mig.hasCutter, projects: mig.projects,
        hazmat: mig.hazmat, mode: mig.mode, energy: mig.energy, migHash: h });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const s = JSON.parse(sv);
    if (s.error) {
      check('구세이브 마이그레이션 (예외 없이 로드)', false, s.error);
    } else {
      if (s.migHash !== MIG_HASH) console.log('MIG_HASH(actual) ' + s.migHash); // 불일치 시 재핀용
      check('마이그레이션/구필드 보존(day 42)', s.day === 42, `day ${s.day}`);
      check('마이그레이션/구필드 보존(winters 3)', s.winters === 3, `winters ${s.winters}`);
      check('마이그레이션/구필드 보존(canned 55)', s.canned === 55, `canned ${s.canned}`);
      check('마이그레이션/신규 book 안전 기본값(number)', s.bookType === 'number', `book (${s.bookType})`);
      check('마이그레이션/신규 demoEnded 정의됨', s.demoType !== 'undefined', `demoEnded ${s.demoType}`);
      check('마이그레이션/기본값(bunkerRoof=hole)', s.bunkerRoof === 'hole', `bunkerRoof ${s.bunkerRoof}`);
      check('마이그레이션/기본값(hasCutter=false)', s.hasCutter === false, `hasCutter ${s.hasCutter}`);
      check('마이그레이션/기본값(projects=object)', s.projects === 'object', `projects ${s.projects}`);
      check('마이그레이션/기본값(hazmat=null)', s.hazmat === null, `hazmat ${s.hazmat}`);
      check('마이그레이션 전 필드 해시 불변(save 추출 안전망)', s.migHash === MIG_HASH, `hash ${s.migHash}`);
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
