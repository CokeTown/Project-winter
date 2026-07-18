// 캡슐/스크린샷 마스터 캡처 — 야간·노을·주간 × 세로/가로. 인게임(현재 빌드) 아이소메트릭 아늑한 방.
//   store-shot의 cozy 데코 재사용 + 바닥 드랍 반짝임 제거(clearGroundDrops) + 생존자·고양이 유지.
//   실행: SHELTERS=rooftop,cabin TIMES=night,sunset,day ORIENT=portrait npx electron tools/capsule-shots.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os');
const req = require('module').createRequire('G:/Project_winter/package.json'); const { PNG } = req('pngjs');
const DIST = path.resolve(__dirname, '..', 'dist');
const OUT = process.env.OUT || 'C:/Users/mhdmj/AppData/Local/Temp/claude/G--Project-winter/2040f2ba-d833-4d87-93d4-93190ac461b9/scratchpad';
const SHELTERS = (process.env.SHELTERS || 'rooftop').split(',');
const TIMES = (process.env.TIMES || 'night,sunset,day').split(',');
const ORIENT = process.env.ORIENT || 'portrait';
const PORT = ORIENT === 'portrait';
const W = PORT ? 1200 : 2560, HGT = PORT ? 1800 : 1440;
// 시간대: 시각 + 날씨. 노을=맑은 하늘로 골든, 야간/주간=눈(겨울 정체성).
const TIME = { night: { h: 22, wx: 'snow' }, sunset: { h: 16, wx: 'clear' }, day: { h: 11, wx: 'snow' } };
// 카메라 프레이밍(오리엔트별)
const CAM = PORT ? { yaw: 0.62, pitch: +(process.env.PPITCH || 0.60), zoom: +(process.env.PZOOM || 1.2), panz: process.env.PPANZ } : { yaw: 0.62, pitch: 0.50, zoom: 1.5 };
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cozy = (w, d) => { const X = w / 2, Z = d / 2; const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3); const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => ({ d: dd, ...P(x, z), r: r || 0, tier: 3 });
  return { pan: { x: cx, z: cz }, items: [it('bed', -1.4, -0.9), it('bookshelf', 0.1, -1.6), it('sofa', 1.5, -0.6),
    it('rug', 0, 1.0), it('teatable', 0, 1.0), it('cushion', -1.1, 1.0),
    it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.7, 0.7)] }; };
async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-cshot-' + process.pid));
  setTimeout(() => { console.log('WATCHDOG'); process.exit(7); }, 300000);
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true); win.webContents.setFrameRate(30);
  await win.loadFile(path.join(DIST, 'index.html'));
  const ev = e => win.webContents.executeJavaScript(e, true);
  for (let i = 0; i < 90; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => 0)) break; await sleep(500); }
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  for (const shelter of SHELTERS) for (const time of TIMES) {
    const T = TIME[time];
    await ev(`(()=>{const S=window.__shelter;S.simReset();S.hideTitle&&S.hideTitle();S.setPaused&&S.setPaused(true);
      S.state.current=${JSON.stringify(shelter)};S.loadShelter(${JSON.stringify(shelter)});
      S.setWeather(${JSON.stringify(T.wx)});S.setHour(${T.h});return 1;})()`);
    await sleep(500);
    const info = await ev(`(()=>{try{const S=window.__shelter;
      const R=(S.SHELTERS&&S.SHELTERS[${JSON.stringify(shelter)}]&&S.SHELTERS[${JSON.stringify(shelter)}].room)||{w:5.6,d:4.4};
      const L=(${cozy.toString()})(R.w,R.d);
      for(const it of L.items){try{S.addItem(it.d,0,it.x,it.z,it.r||0,true,0,it.tier||3);}catch(e){}}
      try{S.state.cat=true;S.spawnCat&&S.spawnCat();}catch(e){}
      S.clearGroundDrops&&S.clearGroundDrops(); // 바닥 반짝임 얼룩 제거
      const panz=${CAM.panz!=null?CAM.panz:'null'};
      if(L.pan&&S.setPan)S.setPan(L.pan.x, panz!=null?panz:L.pan.z);
      S.setYaw&&S.setYaw(${CAM.yaw});S.setPitch&&S.setPitch(${CAM.pitch});S.setZoom&&S.setZoom(${CAM.zoom});
      return {room:R};}catch(e){return {error:String(e&&e.stack||e).slice(0,180)};}})()`);
    await ev(`(()=>{let c=document.getElementById('shotcss');if(!c){c=document.createElement('style');c.id='shotcss';document.head.appendChild(c);}c.textContent='body > *:not(#c):not(#fx){display:none!important}';return 1;})()`);
    // 1) 조명 정착(고양이·아바타는 이 동안 배회 — 무시)
    for (let k = 0; k < 16; k++) { await ev(`window.__shelter.clearGroundDrops&&window.__shelter.clearGroundDrops();window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(30); }
    // 2) 고양이=방석 위 고정 웅크림, 아바타=찻상 옆 고정 배치(정착 후 배회 방지)
    await ev(`(()=>{try{const S=window.__shelter,its=S.items||[];
      const find=id=>its.find(i=>i.defId===id);const cu=find('cushion'),tt=find('teatable');
      if(cu&&S.qaPlaceCat)S.qaPlaceCat(cu.x,cu.z,'sleep');
      const g=S.avatarSys&&S.avatarSys.getGroup&&S.avatarSys.getGroup();
      if(g&&tt){g.position.x=tt.x-0.55;g.position.z=tt.z+0.35;g.rotation.y=-0.5;}
      return 1;}catch(e){return 'ERR'+e;}})()`);
    for (let k = 0; k < 3; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(30); }
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    const name = `cshot-${shelter}-${time}-${ORIENT}.png`;
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
    console.log('WROTE ' + name + '  ' + JSON.stringify(info));
  }
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('FATAL', e && e.stack || e); process.exit(9); });
