// 24시간 타임랩스 캡처 (디렉터 2026-07-23: "금문교(다리 관리소)와 펜트하우스 24시간 도는 영상 — 차용용")
//   0→24시를 프레임당 균등 전진하며 오프스크린 캡처 → ffmpeg로 mp4 조립(별도 명령).
//   UI는 전부 숨김(순수 씬 풋티지). 사용:
//     구도 시험: SHOT=bridgehouse MODE=still ./node_modules/.bin/electron.cmd tools/timelapse-24h.cjs
//     본촬영:   SHOT=bridgehouse FRAMES=720 ./node_modules/.bin/electron.cmd tools/timelapse-24h.cjs
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');

const SHOT = process.env.SHOT || 'bridgehouse';
const MODE = process.env.MODE || 'run';
const FRAMES = +(process.env.FRAMES || 720);            // 720f @30fps = 24s (1초=1시간)
const W = 1920, HGT = 1080;
// 구도 정본 — still 모드 육안 판단으로 확정한 값 (여러 후보를 아래 CAND에서 실측)
const VIEWS = { // still 육안 판정 확정(2026-07-23): 다리=cand1(주탑 2개가 프레임 좌우를 감싼다) · 펜트=cand0(방+발코니+운해)
  bridgehouse: { yaw: -1.4, pitch: 0.32, zoom: 0.36, panx: 2, panz: -6 },
  penthouse: { yaw: 0.62, pitch: 0.5, zoom: 0.5, panx: 0, panz: -1.5 },
};
const CAND = { // still 모드: 후보 3구도씩
  bridgehouse: [
    { yaw: -1.2, pitch: 0.38, zoom: 0.42, panx: 0, panz: -4 },
    { yaw: -1.4, pitch: 0.32, zoom: 0.36, panx: 2, panz: -6 },
    { yaw: -0.9, pitch: 0.44, zoom: 0.5, panx: -2, panz: -3 },
  ],
  penthouse: [
    { yaw: 0.62, pitch: 0.5, zoom: 0.5, panx: 0, panz: -1.5 },
    { yaw: 0.3, pitch: 0.42, zoom: 0.42, panx: 0, panz: -3 },
    { yaw: -0.3, pitch: 0.46, zoom: 0.46, panx: 1, panz: -2.5 },
  ],
};
const OUT = path.join(process.cwd(), 'scratchpad', 'timelapse', SHOT + (MODE === 'still' ? '_still' : ''));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 560000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(600);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  };
  const setView = v => H.evalJs(`(()=>{const S=window.__shelter;
    S.setYaw&&S.setYaw(${v.yaw});S.setPitch&&S.setPitch(${v.pitch});S.setZoom&&S.setZoom(${v.zoom});
    S.setPan&&S.setPan(${v.panx},${v.panz});return 1;})()`);

  await H.evalJs(`(async()=>{const S=window.__shelter;
    S.simReset(); if(S.hideTitle)S.hideTitle();
    S.state.cat=true; S.state.current='${SHOT}'; S.loadShelter('${SHOT}');
    await new Promise(r=>setTimeout(r,900));
    S.setWeather('clear'); S.clearGroundDrops&&S.clearGroundDrops();
    return 1;})()`);
  // UI 전부 숨김 — 순수 씬 풋티지 (토스트·HUD·도크·툴바·카드·팁)
  await H.evalJs(`(()=>{const c=document.createElement('style');c.id='tlClean';
    c.textContent='#hud,#res-bar,#action-bar,#cam-ctrl,#toolbar,#edge-dock,#quest-card,#tip-note,#toast,#exp-panel,#info-bar,.panel{display:none!important}';
    document.head.appendChild(c);return 1;})()`);

  if (MODE === 'still') {
    for (let i = 0; i < CAND[SHOT].length; i++) {
      await setView(CAND[SHOT][i]);
      for (const [tag, hr] of [['dawn', 6.2], ['noon', 12], ['dusk', 18], ['night', 23]]) {
        await H.evalJs(`(async()=>{const S=window.__shelter;S.setHour(${hr});
          for(let k=0;k<6;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}return 1;})()`);
        await shot(`cand${i}_${tag}.png`);
      }
    }
    console.log('STILLS WROTE ' + OUT);
  } else {
    await setView(VIEWS[SHOT]);
    for (let f = 0; f < FRAMES; f++) {
      const hr = (f / FRAMES) * 24;
      await H.evalJs(`(async()=>{const S=window.__shelter;S.setHour(${hr.toFixed(4)});
        S.renderFrame&&S.renderFrame();return 1;})()`);
      await shot('f' + String(f).padStart(4, '0') + '.png');
      if (f % 60 === 0) console.log(`frame ${f}/${FRAMES} (h=${hr.toFixed(1)})`);
    }
    console.log('FRAMES WROTE ' + OUT);
  }
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
