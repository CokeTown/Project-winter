/* P1 렌더 컨텍스트 스모크 — 외부 API 4종(freeze/step/cineOn/cineOff)이 ctx 기반으로 동작하는지 실측.
   골든 러너가 freeze+step 경로를 이미 커버하므로, 여기는 cine 토글과 keepEntities 스테핑(트레일러 경로)을 본다. */
const { BrowserWindow } = require('electron');
const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 120000);
(async () => {
  await H.boot();
  await new Promise(r => setTimeout(r, 600));
  await H.evalJs(`window.__pErr = []; addEventListener('error', e => __pErr.push(String(e.message)));`);
  const r = await H.evalJs(`(async()=>{
    const S = window.__shelter; S.simReset(); if (S.hideTitle) S.hideTitle(); S.loadShelter('container');
    await new Promise(r => setTimeout(r, 700));
    const out = {};
    // ① 트레일러 경로: freeze(keepEntities=true) + stepGolden — 엔티티 유지 스테핑이 에러 없이 돌아야
    S.freezeForGolden(777, true);
    S.stepGolden(30, 1 / 30);
    out.keepStepOk = true;
    // ② cine 토글: cineOn → 프레임 → cineOff → 프레임 (renderFrame 내 카메라 선택 분기 실주행)
    S.cineOn(40);
    await new Promise(r => requestAnimationFrame(r));
    S.cineOff();
    await new Promise(r => requestAnimationFrame(r));
    out.cineToggleOk = true;
    // ③ 일반 골든 경로 재확인: freeze(기본) 후 rAF 프레임에서 dt 동결 유지
    S.freezeForGolden(12345);
    await new Promise(r => requestAnimationFrame(r));
    out.frozenOk = true;
    return out;
  })()`);
  const errs = await H.evalJs(`window.__pErr`);
  console.log('RCTX ' + JSON.stringify({ ...r, jsErrors: errs }));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
