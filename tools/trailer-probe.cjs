// 트레일러 v3 사전 프로브 — 3가지 실증: ① 난로 소등→점등(setItemPower) ② 티어 가구 목록/모핑 ③ 탐험 정산(개봉 연출) 모달.
//   실행: electron tools/trailer-probe.cjs <outDir>
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');
const OUT = process.argv[2];
const DIST = path.resolve(__dirname, '..', 'dist');
function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-probe-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: 1920, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);
  const shot = async n => {
    const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: 1920, height: 1080 }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, n + '.png'), PNG.sync.write(png));
  };
  fs.mkdirSync(OUT, { recursive: true });
  await win.loadFile(path.join(DIST, 'index.html'));
  for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) break; await sleep(400); }

  // ── ① 티어 가구 목록
  const tiered = await ev(`Object.entries(window.__shelter.DEFS).filter(([k,d])=>d.tiered).map(([k])=>k)`);
  console.log('PROBE tiered =', JSON.stringify(tiered));

  // ── ② 난로 점화: 밤 옥탑 + 전 조명 소등 → 난로만 점등 (2프레임 비교)
  await ev(`(()=>{const S=window.__shelter;S.setLang('en');S.simReset&&S.simReset();S.hideTitle();
    S.state.current='rooftop';S.loadShelter('rooftop');S.setWeather('snow');S.setHour(23);
    S.addItem('stove',0,1.2,-1.2,0,true,0,3);S.addItem('bed',0,-1.4,-0.9,0,true,0,3);S.addItem('rug',0,0,0.6,0,true,0,3);
    let css=document.createElement('style');css.id='shotcss';document.head.appendChild(css);css.textContent='body > *:not(#c):not(#fx){display:none!important}';
    for(const it of S.items){try{S.setItemPower(it,false);}catch(e){}}
    S.setYaw(0.6);S.setPitch(0.4);S.setZoom(2.3);S.setPan(1.2,-1.2);S.setPaused(false);return 1;})()`);
  await sleep(900); await shot('p_stove_off');
  const st = await ev(`(()=>{const S=window.__shelter;const it=S.items.find(i=>i.defId==='stove');if(!it)return 'NO_STOVE';S.setItemPower(it,true);return {light:!!it.lightObj,glow:!!it.glowSprite,gm:(it.glowMeshes||[]).length};})()`);
  console.log('PROBE stove =', JSON.stringify(st));
  await sleep(600); await shot('p_stove_on');

  // ── ③ 탐험 정산: 자원/에너지 세팅 → startExpedition → 즉시 종료 → resolveExpedition (개봉 모달)
  const exp = await ev(`(()=>{try{const S=window.__shelter;
    const oc=document.getElementById('shotcss');if(oc)oc.remove();
    Object.assign(S.state.res,{fuel:30,food:25,canned:15,water:28,cloth:10,material:18,parts:10,battery:8});
    S.state.energy=100;S.updateHud&&S.updateHud();
    S.startExpedition&&S.startExpedition('residential');
    const r1={exp:!!S.state.exp};
    if(S.state.exp){S.finishExpNow&&S.finishExpNow();}
    return JSON.stringify({r1,exp2:!!S.state.exp});}catch(e){return 'ERR '+String(e&&e.stack||e).slice(0,300);}})()`);
  console.log('PROBE startExp =', exp);
  await sleep(800);
  const res = await ev(`(()=>{try{const S=window.__shelter;if(S.state.exp){S.resolveExpedition();return 'resolved';}return 'no exp — depart 필요?';}catch(e){return 'ERR '+String(e&&e.stack||e).slice(0,300);}})()`);
  console.log('PROBE resolve =', res);
  await sleep(1200); await shot('p_loot');
  // 모달 상태 덤프
  console.log('PROBE modal =', await ev(`(()=>{const mb=document.getElementById('modal-back');return mb?mb.className+' | '+(document.querySelector('#modal-title')||{}).textContent:'없음';})()`));

  app.quit(); process.exit(0);
})().catch(e => { console.error('예외:', e); app.quit(); process.exit(1); });
