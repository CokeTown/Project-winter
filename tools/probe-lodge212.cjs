/* #212 lodge 플레이키 조사 — 기준 PNG 대비 diff% + diff 마스크 PNG(다른 픽셀=적색).
   같은 프로세스 내 재셋업 3회(within-process) — cross-process는 이 프로브를 셸에서 반복 실행.
   골든 러너(tests/grounding/golden.cjs)의 lodge 셋업 문법을 그대로 복제한다(조건 동일성). */
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CW = 900, CH = 600, SEED = 12345, PIX_TOL = 6;
const bgra2rgba = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const diffPct = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > PIX_TOL || Math.abs(a[i + 1] - b[i + 1]) > PIX_TOL || Math.abs(a[i + 2] - b[i + 2]) > PIX_TOL) d++; return +(100 * d / (a.length / 4)).toFixed(3); };
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  const ref = PNG.sync.read(fs.readFileSync(path.join(process.cwd(), 'tests', 'grounding', 'golden', 'lodge.png'))).data;
  const cap = async () => bgra2rgba((await win.webContents.capturePage()).toBitmap());
  const setup = () => H.evalJs(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
    if(S.activeAerial){const a=S.activeAerial();if(a)a.close();} document.body.classList.remove('obs-mode');
    S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(true);
    S.state.current='lodge';
    if(S.freezeForGolden)S.freezeForGolden(${SEED});
    if(S.loadShelter)S.loadShelter('lodge');
    if(S.setHour)S.setHour(8);
    if(S.setWeather)S.setWeather('clear');
    if(S.setYaw)S.setYaw(0.6); if(S.setPitch)S.setPitch(0.42); if(S.setZoom)S.setZoom(1.7);
    return 1;})()`);
  async function settle() {
    await sleep(150); let prev = await cap(), stable = 0;
    for (let i = 0; i < 30; i++) { await sleep(150); const cur = await cap();
      if (diffPct(prev, cur) < 1.0) { if (++stable >= 2 && i >= 4) { await sleep(80); return await cap(); } } else stable = 0; prev = cur; }
    return prev;
  }
  // 시퀀스 재현: 단독 lodge는 6프로세스 안정(0.324%) — 러너에선 선행 11씬 뒤에만 튐.
  //   PRE 환경변수로 선행 셸터 목록을 주입해 이월 상태 의존을 이분 탐색한다.
  const PRE = (process.env.PRE || '').split(',').filter(Boolean);
  const setupShelter = (sh) => H.evalJs(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
    S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(true);
    S.state.current=${JSON.stringify(sh)};
    if(S.freezeForGolden)S.freezeForGolden(${SEED});
    if(S.loadShelter)S.loadShelter(${JSON.stringify(sh)});
    if(S.setHour)S.setHour(8); if(S.setWeather)S.setWeather('clear');
    if(S.setYaw)S.setYaw(0.6); if(S.setPitch)S.setPitch(0.42); if(S.setZoom)S.setZoom(1.7);
    return 1;})()`);
  const results = [];
  for (let r = 0; r < 3; r++) {
    for (const pre of PRE) { await setupShelter(pre); await settle(); }
    await setup();
    const cur = await settle();
    const p = diffPct(cur, ref);
    results.push(p);
    if (p > 0.1) { // 모드 차이 포착(임계 하향 — 0.324% 모드 마스크도 뜬다) — diff 마스크 저장(다른 픽셀=적색, 같은 픽셀=흐린 원본)
      const png = new PNG({ width: CW, height: CH });
      for (let i = 0; i < cur.length; i += 4) {
        const d = Math.abs(cur[i] - ref[i]) > PIX_TOL || Math.abs(cur[i + 1] - ref[i + 1]) > PIX_TOL || Math.abs(cur[i + 2] - ref[i + 2]) > PIX_TOL;
        if (d) { png.data[i] = 255; png.data[i + 1] = 30; png.data[i + 2] = 30; png.data[i + 3] = 255; }
        else { png.data[i] = cur[i] >> 2; png.data[i + 1] = cur[i + 1] >> 2; png.data[i + 2] = cur[i + 2] >> 2; png.data[i + 3] = 255; }
      }
      fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'lodge_diffmask.png'), PNG.sync.write(png));
      // 현재 캡처 원본도 저장 — 기준과 나란히 육안 대조
      const raw = new PNG({ width: CW, height: CH }); cur.copy(raw.data);
      fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'lodge_failcap.png'), PNG.sync.write(raw));
    }
  }
  console.log('LODGE212 ' + JSON.stringify({ withinProcess: results, maskSaved: results.some(p => p > 2.0) }));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
