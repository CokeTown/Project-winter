// 코어 회귀 테스트 — 현재 동작을 핀으로 박제(characterization). 리팩토링이 이 값을 바꾸면 = 회귀.
//   경제 밴드(전 4모드) + 세이브 왕복 + i18n 패리티. 오프스크린 하네스 위, Python 불요.
//   실행: npm test  (dist 빌드 후 electron으로 이 파일 로드)
const { boot, evalJs, call, check, near, report, app } = require('./harness.cjs');

const ROT = "['residential','commercial','industrial','slum']";
// SHELTERS 전 필드 해시 핀 (SHELTERS 분리 안전망). 불일치 시 SHELTER_HASH(actual) 로그로 재핀.
const SHELTER_HASH = 338379354; // 2026-07-09 재핀: 펜트하우스 확대(11x7.5)+발코니 배치 칸(balcony 필드) (직전: 펜트하우스 편입)
// 구세이브 마이그레이션 정적 기본값 포괄 스냅샷 해시 (core/save.js 추출 안전망). 불일치 시 MIG_HASH(actual) 재핀.
const MIG_HASH = -71013442; // 2026-07-09 재핀: 시그니처 도면 blueprints 편입 (직전: 내구성 가방)
// 암시장(scale 오퍼) 모드별 해결값 스냅샷 해시 (인카운터 밸런스 안전망). 불일치 시 MARKET_HASH(actual) 재핀.
const MARKET_HASH = -1012304627;
// 「지식」 테크트리 시그니처 해시 (branch/tier/cost/effect). 노드/비용/효과 변경 시 KNOWLEDGE_HASH(actual) 재핀.
const KNOWLEDGE_HASH = -451536973;

(async () => {
  try {
    await boot();

    // ── 1) 경제 밴드 (로테이션 config, 시드 고정) — 밸런스 회귀 그물 ──
    //   기준선 = 2026-07-06 측정(#76 인플레 캡 + 난이도 income + 하드코어 0.28).
    //   F1 해결(2026-07-07): sim이 헤르메틱해져 setWeather 이중 호출/순서와 무관하게 결정적.
    //     run()의 setWeather('clear')는 이제 명시성용(불필요하지만 무해). 헤르메틱 가드는 아래 §F1.
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
    //   ※ F1 해결로 중반(Day30/60)도 이제 결정적 — 밴드는 안전 마진으로 유지(정밀 near로 조일 수 있으나
    //     밸런스 튜닝 여지를 남긴다). Day432 캡은 harness 무관 안정(339)이라 타이트하게.
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

    // ── F1 헤르메틱 회귀 가드 (2026-07-07 해결) — sim이 완전 결정적임을 박제 ──
    //   해결: simReset이 weather.type/전 모듈상태를 완전 리셋 + tipOnce/wildlife 렌더부수효과를 _simRunning 가드
    //   (종이 팁 텍스처가 Math.random ~9600 소비·첫-run 캐시로 시드 desync시키던 게 주범). 같은 시드·config면
    //   (a)연속 재호출 동일 (b)시작 날씨 무관 동일이어야 한다 — 깨지면 비-헤르메틱 재발(밸런스 측정 신뢰 붕괴).
    const herm = await call(`
      const sig = a => JSON.stringify(a.map(s => [s.day, Math.round((s.res.food||0)+(s.res.canned||0)), s.hunger, s.thirst]));
      S.setWeather('clear'); const A = sig(S.simDays(432, { mode:'normal', seed:31337, regions:${ROT} }));
      S.setWeather('clear'); const B = sig(S.simDays(432, { mode:'normal', seed:31337, regions:${ROT} }));
      S.setWeather('storm'); const C = sig(S.simDays(432, { mode:'normal', seed:31337, regions:${ROT} }));
      return JSON.stringify({ ab: A === B, ac: A === C });
    `);
    const hm = JSON.parse(herm);
    check('F1 헤르메틱: 연속 재호출 동일(결정성)', hm.ab, hm.ab ? '' : 'run1≠run2 — 비-헤르메틱 재발');
    check('F1 헤르메틱: 시작 날씨 무관(누수 0)', hm.ac, hm.ac ? '' : 'clear≠storm — weather 누수 재발');

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
      // 효과 훅 (배치 C-1): 정찰/예보/무전 게터 + rateParts 통합
      S.simReset(); S.state.knowledge = []; S.state.res.book = 30;
      S.unlockKnowledge('scouting'); S.unlockKnowledge('forecasting'); S.unlockKnowledge('radioKnow');
      const kExp = S.knowExpBonus(), kFcLead = S.knowForecastLead(), kFcHas = S.knowsForecast(), kBcast = S.knowBroadcastBonus();
      const rpKnow = S.rateParts('residential').know;
      // 효과 훅 (배치 C-2): 효율난방/손재주 게터
      S.simReset(); S.state.knowledge = []; S.state.res.book = 30;
      S.unlockKnowledge('insulation'); S.unlockKnowledge('effHeating'); S.unlockKnowledge('tidiness'); S.unlockKnowledge('handiness');
      const kHeat = S.knowHeatFuelMul(), kCraft = S.knowCraftMul();
      // 마이그레이션 (구세이브 = knowledge 필드 부재)
      S.simReset(); S.state.knowledge = undefined;
      const old = { state: { ver:3, day:5, mode:'normal', current:'container', res:{food:5} }, savedAt: Date.now() };
      localStorage.setItem(S.slotKey(1), JSON.stringify(old)); S.loadSave();
      const migOk = Array.isArray(S.state.knowledge) && S.state.knowledge.length === 0;
      return JSON.stringify({ count: ids.length, branchCount: Object.keys(branches).length, tiersPerBranch, costOk, hash: h,
        t1ok, t2blocked, u1, bookAfter, has1, cd, t2now, t3blocked, migOk,
        cdBase, cdIns, cdHearth, cmDelta, knowMod,
        kWater, kGardenA, kGardenB, kSpoil, kSalt, kDirt,
        kExp, kFcLead, kFcHas, kBcast, rpKnow, kHeat, kCraft });
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
      check('지식/효과C 정찰→성공률+4%p (rateParts 통합)', kd.kExp===0.04 && kd.rpKnow===0.04, `exp ${kd.kExp} rpKnow ${kd.rpKnow}`);
      check('지식/효과C 예보→리드+1·예보부여·무전 도달+1', kd.kFcLead===1 && kd.kFcHas===true && kd.kBcast===1, `lead ${kd.kFcLead} has ${kd.kFcHas} bcast ${kd.kBcast}`);
      check('지식/효과C2 효율난방×0.75·손재주×0.8', kd.kHeat===0.75 && kd.kCraft===0.8, `heat ${kd.kHeat} craft ${kd.kCraft}`);
      check('지식 시그니처 해시 불변 (트리 안전망)', kd.hash === KNOWLEDGE_HASH, `hash ${kd.hash}`);
    }

    // ── 가방(§E) — bag이면 실패/부분이어도 최소 회수(빈손 없음) ──
    const bag = await call(`
      S.simReset();
      const zero = () => { S.state.res = { food:0,water:0,canned:0,cloth:0,battery:0,fuel:0,parts:0,material:0,salt:0 }; };
      let minWithBag = 999, sawZeroNoBag = false;
      for (let i=0;i<12;i++){
        zero(); S.state.expToday=0; S.state.injury=null; S.state.expFailStreak=0;
        S.state.exp = { region:'residential', rate:0, prep:[], startGameMin: S.state.gameMin, bag:true };
        try { S.resolveExpedition(); } catch(e){ return JSON.stringify({ error:String(e) }); }
        const g = Object.values(S.state.res).reduce((a,b)=>a+(b||0),0);
        minWithBag = Math.min(minWithBag, g);
      }
      for (let i=0;i<12;i++){
        zero(); S.state.expToday=0; S.state.injury=null; S.state.expFailStreak=0;
        S.state.exp = { region:'residential', rate:0, prep:[], startGameMin: S.state.gameMin, bag:false };
        S.resolveExpedition();
        if (Object.values(S.state.res).reduce((a,b)=>a+(b||0),0) === 0) sawZeroNoBag = true;
      }
      return JSON.stringify({ minWithBag, sawZeroNoBag });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const bg = JSON.parse(bag);
    if (bg.error) check('가방 floor (예외 없이)', false, bg.error);
    else {
      check('가방/챙기면 실패해도 빈손 없음 (최소 ≥1)', bg.minWithBag >= 1, `minWithBag ${bg.minWithBag}`);
      check('가방/없으면 실패 시 빈손 발생(대조군)', bg.sawZeroNoBag === true, `noBag zero ${bg.sawZeroNoBag}`);
    }
    // 가방 UI (DDD-3 내구성 승격): 미보유=제작 행(data-bag) → 클릭 제작 → 보유=내구 정보 행
    const bagUi = await call(`
      S.simReset(); if (S.hideTitle) S.hideTitle(); if (S.setPaused) S.setPaused(false);
      S.state.res.cloth = 5; S.state.res.parts = 3; S.state.bagDur = 0; S.state.energy = 100; S.state.exp = null; S.state.expToday = 0;
      S.startExpedition('residential');
      const h = document.getElementById('modal-body').innerHTML;
      const craftRow = h.includes('가방을 꿰맨다') && h.includes('data-bag');
      const el = document.querySelector('#modal-body [data-bag]');
      if (el) el.click();
      const h2 = document.getElementById('modal-body').innerHTML;
      return JSON.stringify({ craftRow, ownRow: h2.includes('가방 · 내구'), dur: S.state.bagDur, prepRows: (h.match(/data-prep=/g)||[]).length });
    `).catch(e => JSON.stringify({ error: String(e) }));
    const bu = JSON.parse(bagUi);
    if (bu.error) check('가방 UI (예외 없이)', false, bu.error);
    else check('가방 UI/prep 모달 (제작 행 → 클릭 제작 → 내구 정보 행)', bu.craftRow === true && bu.ownRow === true && bu.dur === 6 && bu.prepRows > 0,
      `craft ${bu.craftRow} own ${bu.ownRow} dur ${bu.dur} prepRows ${bu.prepRows}`);

    // ── 게이트 코스트 스케일(§F) — 방호복 수리비 모드별 (허브도 동일 헬퍼) ──
    const gate = await call(`
      S.simReset(); const modes=['zen','normal','hard','hardcore']; const rc = S.BAL.forbidden.hazmatRepairCost;
      const tot = {}; for (const m of modes){ S.state.mode=m; const c=S.gateCost(rc); tot[m]=Object.values(c).reduce((a,b)=>a+b,0); }
      return JSON.stringify(tot);
    `).catch(e=>JSON.stringify({error:String(e)}));
    const gt = JSON.parse(gate);
    if (gt.error) check('게이트 스케일 (예외 없이)', false, gt.error);
    else check('게이트/방호복 수리비 난이도 단조 (무한≤노말<하드≤하드코어)', gt.zen<=gt.normal && gt.normal<gt.hard && gt.hard<=gt.hardcore, `zen ${gt.zen} normal ${gt.normal} hard ${gt.hard} hardcore ${gt.hardcore}`);

    // ── 대한파 프론트 (GD-2.0 §9.4-③) — 발동/강도/규율 효과/종료/노말 분기 ──
    //   sim 제외(!_simRunning 가드)는 별도 명제가 아니라 위 경제 밴드+헤르메틱 핀이 그대로 지킨다
    //   (프론트가 sim에 새면 하드코어 사망 핀이 5%대로 붕괴 — 2026-07-08 20시드 실측으로 검거된 회귀).
    const fr = await call(`
      // 하드: 겨울 8일차(day 44) 발동 — 강도 3, until=day+2, 규율 선택 대기(null)
      S.simReset(); S.state.mode = 'hard'; S.state.day = 44;
      S.state.winterSnap = { day: 37, successStart: 0, acc: { coldSnaps: 0, defended: 0, fuel: 0 } };
      S.processDay();
      const hit = { front: !!(S.state.coldSnap && S.state.coldSnap.front), sev: S.state.coldSnap ? S.state.coldSnap.severity : 0,
        until: S.state.coldSnap ? S.state.coldSnap.until : 0, discNull: !!(S.state.front && S.state.front.discipline === null),
        accFront: !!S.state.winterSnap.acc.front };
      // 규율 효과: 쾌적(배급 -3 / 비상 -4) + 취침(쪽잠 -15) — none 대비 차분
      S.state.front.discipline = 'none';      const lmNone = S.comfortDetail().limitMod;
      const rNone = S.restEnergyValue(22, false).energy;
      S.state.front.discipline = 'ration';    const lmRation = S.comfortDetail().limitMod;
      S.state.front.discipline = 'emergency'; const lmEmg = S.comfortDetail().limitMod;
      S.state.front.discipline = 'sleepless'; const rSleepless = S.restEnergyValue(22, false).energy;
      // 종료(until 지남): coldSnap·front 접힘 + memoir acc에 규율 기록
      S.state.day = 47; S.processDay();
      const ended = { snap: S.state.coldSnap, front: S.state.front,
        accDisc: S.state.winterSnap ? S.state.winterSnap.acc.frontDiscipline : null };
      // 노말: 강도 2 + 규율 자동 'none'(모달 대기 없음)
      S.simReset(); S.state.day = 44;
      S.state.winterSnap = { day: 37, successStart: 0, acc: { coldSnaps: 0, defended: 0, fuel: 0 } };
      S.processDay();
      const nrm = { sev: S.state.coldSnap ? S.state.coldSnap.severity : 0, disc: S.state.front ? S.state.front.discipline : null };
      return JSON.stringify({ hit, lmNone, lmRation, lmEmg, rNone, rSleepless, ended, nrm });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const fd = JSON.parse(fr);
    if (fd.error) check('대한파 프론트 (예외 없이)', false, fd.error);
    else {
      check('프론트/하드 발동 (겨울 8일차·강도 3·3일·규율 대기)',
        fd.hit.front && fd.hit.sev === 3 && fd.hit.until === 46 && fd.hit.discNull && fd.hit.accFront,
        `sev ${fd.hit.sev} until ${fd.hit.until} discNull ${fd.hit.discNull}`);
      check('프론트/규율 쾌적 (배급 -3 · 비상 -4)', fd.lmRation === fd.lmNone - 3 && fd.lmEmg === fd.lmNone - 4,
        `none ${fd.lmNone} ration ${fd.lmRation} emg ${fd.lmEmg}`);
      check('프론트/규율 쪽잠 취침 -15', fd.rSleepless === Math.max(0, fd.rNone - 15), `none ${fd.rNone} sleepless ${fd.rSleepless}`);
      check('프론트/종료 (접힘 + memoir 규율 기록)', fd.ended.snap === null && fd.ended.front === null && fd.ended.accDisc === 'sleepless',
        `accDisc ${fd.ended.accDisc}`);
      check('프론트/노말 강도 2 · 규율 자동 none', fd.nrm.sev === 2 && fd.nrm.disc === 'none', `sev ${fd.nrm.sev} disc ${fd.nrm.disc}`);
    }

    // ── 부상 서사화 (GD-2.0 §9.4-④) — 겨울 부상 집계 + 흉터 기록 + memoir 라인 3분기 ──
    const sc = await call(`
      S.simReset(); S.state.day = 40; // 겨울 4일차 — winterSnap 활성 구간
      S.state.winterSnap = { day: 37, successStart: 0, acc: { coldSnaps: 0, defended: 0, fuel: 0, injuries: 0, lastInjury: null } };
      S.state.scars = []; S.state.pendingWinterMemoir = [];
      const it = Object.keys(S.INJURIES)[0];
      S.applyInjury(it, false);
      const a = { n: S.state.winterSnap.acc.injuries, last: S.state.winterSnap.acc.lastInjury === it, scars: S.state.scars.length };
      // memoir 1회 부상 → hurt.once (부상명 포함)
      S.state.day = 49; S.buildWinterMemoir(1);
      const p1 = S.state.pendingWinterMemoir[S.state.pendingWinterMemoir.length - 1];
      const hurtOnce = !!p1 && p1.bodyArgs.closing.includes('흉터가 하나');
      // 무부상 + 흉터 보유 → unhurt (안도의 한 줄)
      S.state.winterSnap = { day: 37, successStart: 0, acc: { coldSnaps: 0, defended: 0, fuel: 0, injuries: 0, lastInjury: null } };
      S.buildWinterMemoir(2);
      const p2 = S.state.pendingWinterMemoir[S.state.pendingWinterMemoir.length - 1];
      const unhurt = !!p2 && p2.bodyArgs.closing.includes('몸 성히');
      // 무부상 + 무흉터(첫 겨울류) → 부상 라인 없음
      S.state.scars = [];
      S.state.winterSnap = { day: 37, successStart: 0, acc: { coldSnaps: 0, defended: 0, fuel: 0, injuries: 0, lastInjury: null } };
      S.buildWinterMemoir(3);
      const p3 = S.state.pendingWinterMemoir[S.state.pendingWinterMemoir.length - 1];
      const noLine = !!p3 && !p3.bodyArgs.closing.includes('몸 성히') && !p3.bodyArgs.closing.includes('다쳤다');
      return JSON.stringify({ ...a, hurtOnce, unhurt, noLine });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const scd = JSON.parse(sc);
    if (scd.error) check('부상 서사화 (예외 없이)', false, scd.error);
    else {
      check('흉터/겨울 부상 집계 (acc.injuries·lastInjury·scars)', scd.n === 1 && scd.last && scd.scars === 1,
        `n ${scd.n} last ${scd.last} scars ${scd.scars}`);
      check('흉터/memoir 라인 3분기 (1회=부상명·무부상+흉터=안도·무흉터=무언)', scd.hurtOnce && scd.unhurt && scd.noLine,
        `once ${scd.hurtOnce} unhurt ${scd.unhurt} noLine ${scd.noLine}`);
    }

    // ── 적대 존재 다이얼 + 총·중상 (GD-2.0 §9.2·9.3) — 모드별 결과 + 총 정비 + 악화 사슬 ──
    //   조우는 확률(0.35)이라 반복 루프로 발생을 유도하되 상한 가드. citycore는 winters·successes 게이트 해제 후 진입.
    const ho = await call(`
      const H = S.BAL.hostile;
      const unlock = (mode) => { S.simReset(); S.state.mode = mode; S.state.winters = 3; S.state.successes = 99; S.state.res.canned = 50; };
      const trip = () => { S.state.expToday = 0; S.state.energy = 100; S.state.injury = null;
        S.state.exp = { region: 'citycore', rate: 1, prep: [], startGameMin: S.state.gameMin }; S.resolveExpedition(); };
      // 1) 노말 30트립: 총 미드랍(하드코어 전용) + 중상 없음 (조우=소리만, 손실 0 계약)
      unlock('normal');
      let normBad = false;
      for (let i = 0; i < 30; i++) { trip(); if (S.state.gun || (S.state.injury && S.state.injury.type === 'critical')) normBad = true; }
      // 2) 하드코어 + 총: 조우 발생 시 탄환만 줄고 중상 없음 (60트립 내 조우 기대 ~21회)
      unlock('hardcore'); S.state.gun = { dur: H.gunDur };
      let gunUsed = false, gunCrit = false;
      for (let i = 0; i < 60 && !gunUsed; i++) { trip(); if (S.state.gun.dur < H.gunDur) gunUsed = true; if (S.state.injury && S.state.injury.type === 'critical') gunCrit = true; }
      // 3) 하드코어 무총: 조우 시 중상 확정 + 흉터 기록
      unlock('hardcore'); S.state.gun = null; S.state.scars = [];
      let crit = false;
      for (let i = 0; i < 60 && !crit; i++) { trip(); if (S.state.injury && S.state.injury.type === 'critical') crit = true; }
      const scarOk = S.state.scars.some(s2 => s2.t === 'critical');
      // 4) 총 정비: 빈 총 + 재료 → 만충
      S.state.gun = { dur: 0 }; S.state.res.parts = 20; S.state.res.material = 20;
      const rep = S.repairGun(); const repDur = S.state.gun.dur;
      // 5) 악화 사슬: 하드코어 deep→critical / 노말 deep→infection (같은 롤, 목적지만 분기)
      const worsenTo = (mode) => { unlock(mode);
        // day=5 고정: processDay는 실게임/sim에서 day>=2로만 불린다 — day=1 직접 호출은 seasonOf(0) 엣지를 밟는다(테스트 사용법 준수)
        for (let i = 0; i < 80; i++) { S.state.day = 5; S.state.injury = { type: 'deep', untilMin: S.state.gameMin + 9999 }; S.processDay();
          if (S.state.injury && S.state.injury.type !== 'deep') return S.state.injury.type; } return '(no-worsen)'; };
      const hcNext = worsenTo('hardcore'); const nmNext = worsenTo('normal');
      return JSON.stringify({ normBad, gunUsed, gunCrit, crit, scarOk, rep, repDur, hcNext, nmNext });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const hd2 = JSON.parse(ho);
    if (hd2.error) check('적대 다이얼 (예외 없이)', false, hd2.error);
    else {
      check('적대/노말 계약 (총 미드랍·중상 없음 — 소리만)', hd2.normBad === false, `normBad ${hd2.normBad}`);
      check('적대/하드코어+총 (탄환 소모·중상 없음)', hd2.gunUsed && !hd2.gunCrit, `used ${hd2.gunUsed} crit ${hd2.gunCrit}`);
      check('적대/하드코어 무총 (중상 + 흉터 기록)', hd2.crit && hd2.scarOk, `crit ${hd2.crit} scar ${hd2.scarOk}`);
      check('총/정비 (빈 총 → 만충)', hd2.rep === true && hd2.repDur === 6, `rep ${hd2.rep} dur ${hd2.repDur}`);
      check('부상/악화 사슬 (하드코어 deep→critical · 노말 deep→infection)', hd2.hcNext === 'critical' && hd2.nmNext === 'infection',
        `hc ${hd2.hcNext} nm ${hd2.nmNext}`);
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
        gun: st.gun, scarsIsArr: Array.isArray(st.scars), frontWinterKey: st.frontWinterKey, front: st.front, // 2.0 §9.3·§9.4 신규 필드
        endingType: st.endingType, endingChoicePending: st.endingChoicePending, earlyRescueDay: st.earlyRescueDay, // 2.0 §9.5
        subwayHidden: st.subwayHidden, hiddenGateDone: st.hiddenGateDone, hiddenReachPending: st.hiddenReachPending, // 2.0 §9.6
        hiddenReached: st.hiddenReached, siloFired: st.siloFired,
        paints: typeof st.paints, dyeOffer: st.dyeOffer, bagDur: st.bagDur, blueprints: typeof st.blueprints, // 도료 + 염료 상인 + 가방 + 도면 (REWARD-LOOP ②③)
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

    // ── 엔딩 3분기 + 이관의 진실 (GD-2.0 §5·§9.5) — 스위트 끝 배치(엔딩 시퀀스 DOM 오염 회피) ──
    const e3 = await call(`
      // 1) 9겨울 트리거 (#170 REV3): winters 8→9 processDay → passWinter가 재건(rebuildPending) 예약 →
      //    같은 processDay 말미의 tryDoctorRadio가 그날 밤 재건의 봄(rebuilding) 발화(플래그 소진).
      //    노크(ending_choice)는 재건 비네트의 종결부가 세운다.
      S.simReset(); S.state.winters = 8; S.state.day = 49; S.state.pendingEvent = null;
      S.state.cat = 1; S.state.lastEventDay = 49; // 확률 인카운터 봉인(고양이 특수·일반 롤) — 당일 밤 발화 핀의 결정론 확보
      S.processDay();
      const nine = { w: S.state.winters, pend: S.state.rebuildPending };
      const fired = S.state.pendingEvent;
      // 2) 선택 기록: escape run → endingType (시퀀스는 0.4s 뒤 — 화면은 아래서 정리)
      const r0 = S.EVENTS.ending_choice.choices[0].run();
      const et = S.state.endingType;
      // 3) 성향 결정론 (랜덤 없음): 정든 집 신호 → rest / 진실 조각 14+ → newworld
      S.state.endingType = null; S.state.memos = {}; S.state.survivorLights = 0; S.state.doctorRegularSeen = false;
      S.state.cat = 1; S.state.stayDays = 40;
      const leanRest = S.endingLeaning();
      ['rsc1','rsc2','rsc3','rsc4','rsc5','rsc6','rsc7','rsc8','rsc9','rsc10','rsc11','rsc12','nw1','nw2'].forEach(id => S.state.memos[id] = 1);
      const leanNw = S.endingLeaning();
      // 4) 조기 탈출: 정기 교신 예약 시 +7일 확정 → 도래일 발화
      S.simReset(); S.state.doctorRadioRegularPending = true; S.state.doctorRegularSeen = false; S.state.pendingEvent = null; S.state.day = 100;
      S.tryDoctorRadio();
      const early1 = { pe: S.state.pendingEvent, d: S.state.earlyRescueDay };
      S.state.pendingEvent = null; S.state.day = 107;
      S.tryDoctorRadio();
      const early2 = S.state.pendingEvent;
      // 5) 이관의 진실 순차 드랍: citycore 반복 → nw1 → nw2 순서 (유서/일반 메모는 무시)
      S.simReset(); S.state.memos = {};
      const seq = [];
      for (let i = 0; i < 800 && seq.length < 2; i++) { const d = S.tryDropMemoOnExpedition('citycore'); if (d && d.id && d.id.slice(0, 2) === 'nw') seq.push(d.id); }
      // 6) 9겨울 밤 경합(§9.5 검수·#170 REV3): 라디오 보유 시 첫 무전이 먼저 — 복선이 재건보다 앞선다.
      //    무전 발화 밤엔 예약이 소진되지 않고, 이튿날 밤 구판 예약(endingChoicePending)이 재건의 봄으로 승격 발화.
      S.simReset(); S.addItem('radio', 0, 1, 1, 0);
      S.state.doctorRadioPending = true; S.state.endingChoicePending = true; S.state.endingType = null; S.state.pendingEvent = null;
      S.tryDoctorRadio();
      const clash1 = { pe: S.state.pendingEvent, pend: S.state.endingChoicePending };
      S.state.pendingEvent = null;
      S.tryDoctorRadio();
      const clash2 = S.state.pendingEvent;
      return JSON.stringify({ nine, fired, et, leanRest, leanNw, early1, early2, seq, clash1, clash2 });
    `).catch(err => JSON.stringify({ error: String(err) }));
    // 정리: escape run()의 0.4s 지연 시퀀스가 열어둔 엔딩 화면 닫기 (call 본문은 non-async라 밖에서)
    await evalJs(`new Promise(r => setTimeout(() => { const s = document.getElementById('ending-screen'); if (s) s.style.display = 'none'; r(1); }, 700))`);
    const ed = JSON.parse(e3);
    if (ed.error) check('엔딩 3분기 (예외 없이)', false, ed.error);
    else {
      check('엔딩/9겨울 트리거 (passWinter 재건 예약 → 당일 밤 rebuilding 발화·플래그 소진)', ed.nine.w === 9 && ed.nine.pend === false && ed.fired === 'rebuilding',
        `w ${ed.nine.w} pend ${ed.nine.pend} fired ${ed.fired}`);
      check('엔딩/선택 기록 (escape → endingType)', ed.et === 'escape', `et ${ed.et}`);
      check('엔딩/성향 결정론 (정든 집=rest · 진실 14+=newworld)', ed.leanRest === 'rest' && ed.leanNw === 'newworld',
        `rest ${ed.leanRest} nw ${ed.leanNw}`);
      check('엔딩/조기 탈출 (정기 교신 +7일 확정 예약·도래 발화)', ed.early1.pe === 'doctor_radio_regular' && ed.early1.d === 107 && ed.early2 === 'early_rescue',
        `pe ${ed.early1.pe} d ${ed.early1.d} then ${ed.early2}`);
      check('응답/이관의 진실 순차 드랍 (nw1 → nw2)', ed.seq[0] === 'nw1' && ed.seq[1] === 'nw2', `seq ${ed.seq.join(',')}`);
      check('엔딩/9겨울 밤 경합 (무전 먼저 → 이튿날 재건의 봄)', ed.clash1.pe === 'doctor_radio' && ed.clash1.pend === true && ed.clash2 === 'rebuilding',
        `pe ${ed.clash1.pe} pend ${ed.clash1.pend} then ${ed.clash2}`);
    }

    // ── 히든 루트 「침묵」 (GD-2.0 §5.1·§9.6) — 데이터·게이트 층위(터치 레이캐스트는 접지 프로브 몫) ──
    const hd = await call(`
      // 1) 노출 게이트: 발견 전엔 개척 카드가 존재하지 않는다 → 발견해도 지하철 거주에서만
      S.simReset();
      const g0 = S.projectAvailable('hiddenGate');
      S.state.subwayHidden = true;
      const g1 = S.state.current === 'subway' ? '(스킵: 기본 셸터가 지하철)' : S.projectAvailable('hiddenGate');
      S.state.current = 'subway';
      const g2 = S.projectAvailable('hiddenGate');
      // 2) 완공 효과: 사다리 플래그 + 대면 예약 → 그 밤 hidden_reach 발화 → 유보 기록
      S.applyProjectEffect('subway.hiddenGate');
      const eff = { done: S.state.hiddenGateDone, pend: S.state.hiddenReachPending };
      S.state.pendingEvent = null;
      S.tryDoctorRadio();
      const fired = S.state.pendingEvent;
      const r0 = S.EVENTS.hidden_reach.choices[0].run();
      const reached = S.state.hiddenReached;
      // 3) 완전 무기록: 유보·침묵 어느 쪽도 endingType을 건드리지 않는다 (siloFired는 내부 전용)
      const et = S.state.endingType;
      return JSON.stringify({ g0, g1, g2, eff, fired, reached, et, r0ok: !!r0 });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const hj = JSON.parse(hd);
    if (hj.error) check('침묵 (예외 없이)', false, hj.error);
    else {
      check('침묵/개척 노출 게이트 (발견 전 없음 → 지하철+발견=노출)', hj.g0 === false && hj.g1 === false && hj.g2 === true,
        `g0 ${hj.g0} g1 ${hj.g1} g2 ${hj.g2}`);
      check('침묵/완공→대면 (사다리+예약 → 그 밤 발화 → 유보 기록)', hj.eff.done === true && hj.eff.pend === true && hj.fired === 'hidden_reach' && hj.reached === true && hj.r0ok,
        `done ${hj.eff.done} pend ${hj.eff.pend} fired ${hj.fired} reached ${hj.reached}`);
      check('침묵/완전 무기록 (endingType 불변)', hj.et === null, `et ${hj.et}`);
    }

    // ── 도료 (REWARD-LOOP ② — 분류 전수·계열 비공집합·시그니처 커버·롤 유효) ──
    const pt = await call(`
      S.simReset();
      const fams = Object.keys(S.PAINT_FAMILIES);
      const count = {}; fams.forEach(f => count[f] = 0);
      let total = 0;
      for (const id of Object.keys(S.DEFS)) for (const c of (S.DEFS[id].colors || [])) { const f = S.paintFamilyOf(c); if (count[f] == null) return JSON.stringify({ orphan: c.toString(16) }); count[f]++; total++; }
      const empty = fams.filter(f => count[f] === 0);
      const cover = fams.filter(f => !Object.values(S.BAL.paint.regionFamilies).flat().includes(f));
      const roll = S.rollPaintFamily('industrial');
      return JSON.stringify({ nFam: fams.length, total, empty, cover, rollOk: fams.includes(roll), paintsType: typeof S.state.paints });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const pj = JSON.parse(pt);
    if (pj.error || pj.orphan) check('도료 (예외/미아 없이)', false, pj.error || ('미아 hex ' + pj.orphan));
    else {
      check('도료/분류 전수 (12계열·전 색 편입·비공집합)', pj.nFam === 12 && pj.total >= 120 && pj.empty.length === 0,
        `fam ${pj.nFam} total ${pj.total} empty ${pj.empty.join(',') || '-'}`);
      check('도료/시그니처 커버 (전 계열 최소 1지역) + 롤 유효', pj.cover.length === 0 && pj.rollOk && pj.paintsType === 'object',
        `cover ${pj.cover.join(',') || '-'}`);
    }
    // 네온 안료 + 그래피티 희귀도 (디렉터 2026-07-09): 네온=일반 풀 분리·시그니처 게이트, 그래피티=가중 하향
    const nb = await call(`
      const inCommon = 'neonPigment' in S.PAINT_FAMILIES, inAll = 'neonPigment' in S.PAINT_ALL;
      let rollLeak = false; for (let i = 0; i < 400; i++) if (S.rollPaintFamily('citycore') === 'neonPigment') { rollLeak = true; break; }
      const neonGate = S.paintFamilyRequired('neonvip', S.DEFS.neonvip.colors[1]) === 'neonPigment'
        && S.paintFamilyRequired('neonair', S.DEFS.neonair.colors[1]) === 'neonPigment';
      const normalGate = S.paintFamilyRequired('chair', S.DEFS.chair.colors[1]) === S.paintFamilyOf(S.DEFS.chair.colors[1]);
      S.simReset(); if (S.hideTitle) S.hideTitle();
      const it = S.addItem('neonvip', 0, 0, 0, 0); S.state.paints = {};
      S.showSelPanel(it);
      const lockedNoPigment = document.querySelectorAll('#sel-swatches .swatch')[1].classList.contains('locked');
      S.state.paints.neonPigment = 1; S.showSelPanel(it);
      document.querySelectorAll('#sel-swatches .swatch')[1].click();
      const painted = it.colorIdx === 1 && (S.state.paints.neonPigment || 0) === 0;
      const gw = (S.BAL.blueprint.weights || {}).graffiti;
      return JSON.stringify({ inCommon, inAll, rollLeak, neonGate, normalGate, lockedNoPigment, painted, gw });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const nbj = JSON.parse(nb);
    if (nbj.error) check('네온/그래피티 (예외 없이)', false, nbj.error);
    else {
      check('네온 안료 분리 (일반 풀 밖·PAINT_ALL 안·롤 무유출)', nbj.inCommon === false && nbj.inAll === true && nbj.rollLeak === false, JSON.stringify(nbj));
      check('네온 게이트 (시그니처=안료·일반=hex·무안료 잠금→소모)', nbj.neonGate && nbj.normalGate && nbj.lockedNoPigment && nbj.painted, JSON.stringify(nbj));
      check('그래피티 희귀도 (가중 < 1)', typeof nbj.gw === 'number' && nbj.gw < 1, `gw ${nbj.gw}`);
    }
    // 염료 상인: 오퍼 본문 렌더 + 구매(통조림 차감·도료 +1) + 부족 거부 (모드별 값: 노말 2)
    const dm = await call(`
      S.simReset(); S.state.mode = 'normal'; S.state.paints = {}; S.state.res.canned = 3;
      S.state.dyeOffer = ['redOxide', 'sage', 'mustard'];
      const txt = S.EVENTS.dye_merchant.textFn();
      const r0 = S.EVENTS.dye_merchant.choices[0].run(); // 2개 소비 → redOxide +1
      const after = { canned: S.state.res.canned, paint: S.state.paints.redOxide };
      const r1 = S.EVENTS.dye_merchant.choices[1].run(); // 잔여 1 < 2 → 거부
      return JSON.stringify({ hasNames: txt.includes('방청 레드') && txt.includes('2'), bought: /방청 레드/.test(r0), after, denied: /모자라다/.test(r1), sage: S.state.paints.sage || 0 });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const dj = JSON.parse(dm);
    if (dj.error) check('염료 상인 (예외 없이)', false, dj.error);
    else check('염료 상인 (오퍼 렌더·구매 차감·부족 거부)', dj.hasNames && dj.bought && dj.after.canned === 1 && dj.after.paint === 1 && dj.denied && dj.sage === 0,
      JSON.stringify(dj));
    // 내구성 가방 (DDD-3): 실패 탐험 + 보유 → 최소 회수 + 1 마모 / 미보유 → 미발동
    const bagRes = await call(`
      S.simReset(); if (S.hideTitle) S.hideTitle();
      // RNG 고정(0.99): rate 0 + pity(+4%p)여도 부분성공 경계(x0.5)에 안 걸리게 — 완전 실패 확정(결정론).
      //   도료/도면/책 드랍도 0.99 미만 확률이라 전부 미발화 → 자원 델타가 가방 floor만 남는다.
      const __or = Math.random; Math.random = () => 0.99;
      S.state.bagDur = 2;
      S.state.exp = { region: 'residential', end: Date.now() - 1000, dur: 1, rate: 0, prep: [], startGameMin: S.state.gameMin, durMin: 120, bag: true };
      const before = Object.entries(S.state.res).reduce((a, [k, v]) => a + v, 0);
      S.resolveExpedition();
      const gained = Object.entries(S.state.res).reduce((a, [k, v]) => a + v, 0) - before;
      const durAfter = S.state.bagDur;
      document.getElementById('modal-back').style.display = 'none';
      S.state.bagDur = 0;
      S.state.exp = { region: 'residential', end: Date.now() - 1000, dur: 1, rate: 0, prep: [], startGameMin: S.state.gameMin, durMin: 120, bag: false };
      const b2 = Object.entries(S.state.res).reduce((a, [k, v]) => a + v, 0);
      S.resolveExpedition();
      const gained2 = Object.entries(S.state.res).reduce((a, [k, v]) => a + v, 0) - b2;
      Math.random = __or;
      document.getElementById('modal-back').style.display = 'none';
      return JSON.stringify({ gained, durAfter, gained2 });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const bagJ = JSON.parse(bagRes);
    if (bagJ.error) check('가방 (예외 없이)', false, bagJ.error);
    else check('가방/내구 플로어 (실패+보유=회수·1마모 / 미보유=0)', bagJ.gained >= 1 && bagJ.durAfter === 1 && bagJ.gained2 <= 0,
      JSON.stringify(bagJ));

    // 시그니처 도면 (DDD-4): 8종 정의 무결(지역별 2~3·색 4종) + 제작 목록 도면 게이트
    const bp = await call(`
      S.simReset();
      const map = S.BAL.blueprint.regionItems;
      const ids = Object.values(map).flat();
      const defsOk = ids.every(id => S.DEFS[id] && S.DEFS[id].colors.length === 4);
      const perRegion = Object.values(map).every(a => a.length >= 2 && a.length <= 3);
      S.state.blueprints = {};
      S.openCraftModal();
      const h0 = document.getElementById('modal-body').innerHTML;
      const hidden = ids.every(id => !h0.includes(S.DEFS[id].name));
      S.state.blueprints = { neonvip: 1 };
      S.openCraftModal();
      const h1 = document.getElementById('modal-body').innerHTML;
      const shown = h1.includes(S.DEFS.neonvip.name) && !h1.includes(S.DEFS.suit.name);
      document.getElementById('modal-back').style.display = 'none';
      return JSON.stringify({ n: ids.length, defsOk, perRegion, hidden, shown });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const bpj = JSON.parse(bp);
    if (bpj.error) check('도면 (예외 없이)', false, bpj.error);
    else {
      check('도면/8종 정의 무결 (지역별 2~3·색 4종)', bpj.n === 8 && bpj.defsOk && bpj.perRegion, JSON.stringify(bpj));
      check('도면/제작 게이트 (미보유=비노출 → 보유만 노출)', bpj.hidden === true && bpj.shown === true, `hidden ${bpj.hidden} shown ${bpj.shown}`);
    }
    // 복귀 서프라이즈 (DDD-5): 게이트(240분+·35%)·고양이 분기·손실 없음 — RNG 고정으로 결정론
    const og = await call(`
      S.simReset();
      const or = Math.random;
      Math.random = () => 0.99; const none = S.rollOfflineGift(2880);          // 롤 미발화
      Math.random = () => 0.0;  const short = S.rollOfflineGift(100);          // 시간 미달
      const c0 = S.state.res.cloth || 0; S.state.cat = 1;
      const cat = S.rollOfflineGift(2880);                                      // 발화(고양이 60% 분기)
      const dCloth = (S.state.res.cloth || 0) - c0;
      S.state.cat = null; const f0 = S.state.res.food || 0;
      const bird = S.rollOfflineGift(300);                                      // 발화(새 분기)
      const dFood = (S.state.res.food || 0) - f0;
      Math.random = or;
      const notes = (S.state.dayLog.notes || []).filter(n => n.includes('🐈') || n.includes('🐦')).length;
      return JSON.stringify({ none, short, cat, dCloth, bird, dFood, notes });
    `).catch(err => JSON.stringify({ error: String(err) }));
    const oj = JSON.parse(og);
    if (oj.error) check('복귀 서프라이즈 (예외 없이)', false, oj.error);
    else check('복귀 서프라이즈 (게이트·고양이/새 분기·소액 지급·노트)', oj.none === false && oj.short === false && oj.cat === true && oj.dCloth === 1 && oj.bird === true && oj.dFood === 1 && oj.notes === 2,
      JSON.stringify(oj));

    const green = report();
    app.exit(green ? 0 : 1);
  } catch (err) {
    console.error('HARNESS ERROR', err);
    app.exit(2);
  }
})();
app.on && app.on('window-all-closed', () => {});
