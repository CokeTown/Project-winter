/* 접지 QA — 이번 세션 시스템 실런타임 점검 (그물이 못 보는 렌더/로밍/모달/예외).
   harness.cjs 재사용. 각 페이즈 try/catch 격리 → 한 곳 실패가 나머지를 막지 않음. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow } = require('electron');
const H = require(path.join(__dirname, '..', 'harness.cjs'));
const { boot, evalJs, call, check, report } = H;

// 스크린샷은 휘발 임시 경로 (리포지 오염 금지). 콘솔에 출력 경로를 찍는다.
const SHOT_DIR = path.join(os.tmpdir(), 'nw-grounding-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shot(name) {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const img = await win.webContents.capturePage();
    const p = path.join(SHOT_DIR, name);
    fs.writeFileSync(p, img.toPNG());
    console.log('  📸 ' + p + ' (' + Math.round(img.toPNG().length / 1024) + 'KB)');
  } catch (e) { console.log('  ⚠️ 스크린샷 실패: ' + e.message); }
}

(async () => {
  await boot();
  // 0) 예외 수집기 설치 (모든 페이즈의 런타임 throw/reject 포착)
  await evalJs(`(()=>{ window.__qaErr=[];
    window.addEventListener('error', e=>window.__qaErr.push('err:'+(e.message||e.error)));
    window.addEventListener('unhandledrejection', e=>window.__qaErr.push('reject:'+e.reason)); return true; })()`);

  // 클린 뉴게임 + 가시/실행
  await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(false);`);
  await sleep(400);

  // ── 1) 야생동물 로밍 (프레임 경과 후 위치 변화 실측) ──
  try {
    await call(`S.wildlifeSpawn(false);`);
    await sleep(300);
    const a = await evalJs(`JSON.stringify(window.__shelter.wildlifeState())`);
    const A = JSON.parse(a);
    check('야생동물 강제 스폰 → 개체 존재', A.n > 0, `n=${A.n} [${A.list.map(x=>x.id).join(',')}]`);
    await sleep(1900); // animate 루프가 update(t,dt)를 30fps로 구동
    const b = await evalJs(`JSON.stringify(window.__shelter.wildlifeState())`);
    const B = JSON.parse(b);
    // 위치 이동량 합산 (로밍 실작동)
    let moved = 0;
    for (const ba of B.list) {
      const aa = A.list.find(x => x.id === ba.id);
      if (aa) moved += Math.abs(ba.x - aa.x) + Math.abs(ba.z - aa.z);
    }
    check('야생동물 로밍 (1.9s 경과 위치 변화)', moved > 0.05, `Δ합=${moved.toFixed(3)} modes=[${B.list.map(x=>x.mode).join(',')}]`);
  } catch (e) { check('야생동물 페이즈', false, 'THROW: ' + e.message); }

  // ── 2) 야간 발자국 ──
  try {
    const before = JSON.parse(await evalJs(`JSON.stringify(window.__shelter.wildlifeState())`)).prints;
    await call(`S.wildlifeNightPrints();`);
    const after = JSON.parse(await evalJs(`JSON.stringify(window.__shelter.wildlifeState())`)).prints;
    check('야간 발자국 생성', after > before || after > 0, `prints ${before}→${after}`);
  } catch (e) { check('야간 발자국 페이즈', false, 'THROW: ' + e.message); }

  // ── 3) 지식 해금 파이프라인 (§9) ──
  try {
    const setup = await evalJs(`(()=>{ const S=window.__shelter;
      S.state.knowledge=[]; S.state.res.book=5; S.state.upkeepOk=true;
      const ids=Object.keys(S.KNOWLEDGE);
      const t1=ids.find(id=>S.KNOWLEDGE[id].tier===1);
      return JSON.stringify({t1, cost:S.KNOWLEDGE[t1].cost, unlockable:S.knowledgeUnlockable(t1), name:S.KNOWLEDGE[t1].name}); })()`);
    const K = JSON.parse(setup);
    check('티어1 지식 해금 가능 판정', K.unlockable === true, `${K.t1}(${K.name}) cost=${K.cost}`);
    const res = await evalJs(`(()=>{ const S=window.__shelter; const id='${K.t1}';
      const ok=S.unlockKnowledge(id);
      return JSON.stringify({ok, has:S.hasKnowledge(id), book:S.state.res.book, reUnlockable:S.knowledgeUnlockable(id)}); })()`);
    const R = JSON.parse(res);
    check('지식 해금 실행 → 습득', R.has === true, `unlock반환=${R.ok}`);
    check('책 1권 차감', R.book === 4, `book=${R.book} (기대 4)`);
    check('중복 해금 차단', R.reUnlockable === false, `재해금가능=${R.reUnlockable}`);
  } catch (e) { check('지식 페이즈', false, 'THROW: ' + e.message); }

  // ── 4) 지식 모달 렌더 (DOM 실측) ──
  try {
    await call(`S.openKnowledgeModal();`);
    await sleep(500);
    const dom = await evalJs(`(()=>{
      // 모달 컨테이너 탐색: 표시된 오버레이 + 지식 카드
      const overlays=[...document.querySelectorAll('.modal, .modal-overlay, [id*=modal], [id*=knowledge], [class*=knowledge]')];
      const vis=overlays.filter(el=>{ const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>50&&r.height>50&&s.display!=='none'&&s.visibility!=='hidden'; });
      const cards=document.querySelectorAll('.prep-row, .know-card, [data-know], [data-branch]');
      return JSON.stringify({ visOverlays:vis.length, cards:cards.length,
        txt:(vis[0]?vis[0].innerText.slice(0,60).replace(/\\n/g,' '):'') }); })()`);
    const D = JSON.parse(dom);
    check('지식 모달 표시 (가시 오버레이)', D.visOverlays > 0, `overlays=${D.visOverlays} cards=${D.cards}`);
    await shot('qa-knowledge-modal.png');
    await call(`document.querySelectorAll('.modal-close, [data-close], .close-btn').forEach(b=>b.click&&b.click());`);
  } catch (e) { check('지식 모달 페이즈', false, 'THROW: ' + e.message); }

  // 게임 뷰 스크린샷 (야생동물 로밍 장면)
  await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); S.wildlifeSpawn(false);`);
  await sleep(1200);
  await shot('qa-game-wildlife.png');

  // ── 5) sim 안정성 (60일 무예외, 4모드) ──
  for (const mode of ['normal', 'hard', 'hardcore', 'zen']) {
    try {
      const r = await evalJs(`(()=>{ const S=window.__shelter; S.simReset();
        const a=S.simDays(60,{mode:'${mode}',seed:20260707});
        return JSON.stringify({ok:!!a, day:S.state.day}); })()`);
      const R = JSON.parse(r);
      check(`sim 60일 무예외 [${mode}]`, R.ok, `day=${R.day}`);
    } catch (e) { check(`sim 60일 [${mode}]`, false, 'THROW: ' + e.message); }
  }

  // ── 6) 런타임 예외 총점검 ──
  const errs = JSON.parse(await evalJs(`JSON.stringify(window.__qaErr||[])`));
  check('런타임 예외 0건 (전 페이즈)', errs.length === 0, errs.length ? errs.slice(0, 5).join(' | ') : '깨끗');

  const green = report();
  await sleep(200);
  H.app.quit();
  process.exit(green ? 0 : 1);
})().catch(e => { console.error('하네스 치명 오류:', e); H.app.quit(); process.exit(2); });
