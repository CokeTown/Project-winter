// 광원 찐빠 전수 실측 (디렉터 2026-07-23: "창문이 아닌데 한낮의 햇살 광원이 들어온다")
//   전 셸터 × 정오·쾌청 × 표준 부감 — 빛기둥/착지광이 창과 무관한 자리에 뜨는지 육안 검거용 캡처.
//   실행: ./node_modules/.bin/electron.cmd tools/probe-shaft-audit.cjs
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const OUT = path.join(process.cwd(), 'scratchpad', 'shaftaudit');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 560000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const W = 1280, HGT = 720;

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(500);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  };
  const ids = await H.evalJs(`Object.keys(window.__shelter.SHELTERS)`);
  console.log('셸터 ' + ids.length + '종: ' + ids.join(','));
  await H.evalJs(`(()=>{const c=document.createElement('style');c.textContent='#hud,#res-bar,#action-bar,#cam-ctrl,#toolbar,#edge-dock,#quest-card,#tip-note,#toast,#exp-panel,.panel{display:none!important}';document.head.appendChild(c);return 1;})()`);
  for (const id of ids) {
    await H.evalJs(`(async()=>{const S=window.__shelter;
      S.simReset(); if(S.hideTitle)S.hideTitle();
      S.state.current='${id}'; S.loadShelter('${id}');
      await new Promise(r=>setTimeout(r,700));
      S.setWeather('clear'); S.setHour(12);
      S.setYaw&&S.setYaw(0.62); S.setPitch&&S.setPitch(0.5); S.setZoom&&S.setZoom(0.9); S.setPan&&S.setPan(0,0);
      for(let k=0;k<10;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}
      return 1;})()`);
    await shot(id + '_a.png');
    await H.evalJs(`(async()=>{const S=window.__shelter;S.setYaw&&S.setYaw(2.2);
      for(let k=0;k<8;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}return 1;})()`);
    await shot(id + '_b.png'); // 반대각 — 반대편 벽 창·기둥 확인
    console.log(id + ' OK');
  }
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
