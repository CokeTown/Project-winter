// #73 장주행 메모리 soak — 전 셸터 순회 로드 ×5라운드 + 장기 sim. GPU 자원(geometries/textures)과
//   JS 힙이 라운드 간 정상상태(성장 ≈0)인지 측정. 라운드1은 웜업(캐시 채움) — 2라운드부터 판정.
const { app, BrowserWindow } = require('electron');
const path = require('path'), os = require('os');
const URL = process.env.CAP_URL || 'http://localhost:8420';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('js-flags', '--expose-gc');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-soak-' + process.pid));
  setTimeout(() => { console.log('WATCHDOG'); app.quit(); process.exit(7); }, 420000);
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { offscreen: true } });
  win.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);
  await win.loadURL(URL);
  for (let i = 0; i < 100; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.qaRenderInfo)`).catch(() => false)) break; await sleep(400); }

  await ev(`(()=>{const S=window.__shelter;S.setLang&&S.setLang('ko');S.simReset&&S.simReset();S.hideTitle&&S.hideTitle();S.opts.reduceMotion=true;S.applyOpts&&S.applyOpts();S.setPaused&&S.setPaused(false);return 1;})()`);

  const SHELTERS = ['container', 'bunker', 'rooftop', 'cabin', 'bus', 'subway', 'greenhouse', 'ship', 'lighthouse', 'tugboat', 'controltower', 'lodge'];
  const snap = () => ev(`(()=>{const S=window.__shelter;const inf=S.qaRenderInfo();
    return JSON.stringify({geo:inf.memory.geometries,tex:inf.memory.textures,prog:(inf.programs||[]).length,
      heap:Math.round((performance.memory?performance.memory.usedJSHeapSize:0)/1048576)});})()`);

  const rounds = [];
  for (let r = 0; r < 5; r++) {
    for (const sid of SHELTERS) {
      await ev(`(()=>{const S=window.__shelter;try{S.state.current='${sid}';S.loadShelter('${sid}');
        S.addItem('bed',0,-1,0,0,true,0,3);S.addItem('stove',0,1,0,0,true,0,3);S.addItem('lantern',0,0,1,0,true,0,2);
        S.setHour(12+${r});S.renderFrame&&S.renderFrame();}catch(e){}return 1;})()`);
      await sleep(60);
    }
    // 장기 sim 조각: 라운드당 300일 (탐험·이벤트·날씨 롤 포함 상태 성장 검사)
    await ev(`(()=>{const S=window.__shelter;try{S.simDays&&S.simDays(300,{mode:'normal',seed:777,regions:['residential','commercial','industrial','slum']});}catch(e){}return 1;})()`);
    await ev(`(()=>{try{window.gc&&window.gc();}catch(e){}return 1;})()`);
    await sleep(400);
    const s = JSON.parse(await snap());
    rounds.push(s);
    console.log(`round${r + 1}`, JSON.stringify(s));
  }
  // 판정: 라운드2→5 성장량
  const g = (f) => rounds[4][f] - rounds[1][f];
  console.log('GROWTH(r2→r5)', JSON.stringify({ geo: g('geo'), tex: g('tex'), prog: g('prog'), heapMB: g('heap') }));
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('FATAL', e && e.stack || e); app.quit(); process.exit(9); });
