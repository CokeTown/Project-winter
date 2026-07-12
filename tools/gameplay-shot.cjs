// 게임플레이 스크린샷 (디렉터: "UI 보이고 상호작용하는 것도 나와야지").
//   store-shot과 달리 UI를 숨기지 않는다. 대표 상태(자원·일수·꾸민 셸터+고양이)를 세팅하고,
//   샷별로 패널/모달(지도·제작·배치모드·인카운터·결산)을 열어 1920×1080 캡처. dist(gd-2.0) 필요.
//   실행: npx electron tools/gameplay-shot.cjs [shotId]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT = path.resolve(__dirname, '..', 'docs', 'steam', 'shots', 'gameplay');
const W = 1920, HGT = 1080;
const only = process.argv[2] || null;

// 꾸민 거실 (store-shot에서 이식, 방 크기 상대 배치)
const cozyLiving = (w, d) => {
  const X = w / 2, Z = d / 2;
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3);
  const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => ({ d: dd, ...P(x, z), r: r || 0, tier: 3, c: 0 });
  return { pan: { x: cx, z: cz }, items: [
    it('bed', -1.4, -0.9), it('bookshelf', 0.1, -1.6), it('sofa', 1.5, -0.6),
    it('rug', 0, 1.0), it('teatable', 0, 1.0), it('cushion', -1.1, 1.0),
    it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.7, 0.7),
  ] };
};

// 대표 자원(HUD가 의미있는 숫자를 보이게) + 중반 겨울 일수
const SETUP_RES = `(()=>{const S=window.__shelter;Object.assign(S.state.res,{fuel:34,food:26,canned:17,water:29,cloth:12,material:21,parts:13,battery:9,candle:11,salt:6,bandage:4,antiseptic:3,painkiller:3});
  S.state.day=46; S.updateHud&&S.updateHud(); return 1;})()`;

// 카메라 — HUD 뒤로 씬이 넉넉히 보이게 store-shot보다 살짝 당김
const CAM = 'S.setYaw&&S.setYaw(0.6); S.setPitch&&S.setPitch(0.46); S.setZoom&&S.setZoom(1.32); S.setPan&&S.setPan(-0.3,-0.3);';

const SHOTS = [
  { id: 'g1_home_hud', shelter: 'rooftop', hour: 17, weather: 'clear', decorate: true, cat: true, action: '' },
  { id: 'g2_placement', shelter: 'rooftop', hour: 15, weather: 'clear', decorate: true, cat: true, action: 'S.toggleEditMode&&S.toggleEditMode();' },
  { id: 'g3_map', shelter: 'rooftop', hour: 14, weather: 'clear', decorate: true, cat: true, action: 'S.openMapModal&&S.openMapModal();' },
  { id: 'g4_encounter', shelter: 'rooftop', hour: 20, weather: 'snow', decorate: true, cat: false, action: 'S.showEvent&&S.showEvent("cat");' },
  { id: 'g5_craft', shelter: 'rooftop', hour: 16, weather: 'clear', decorate: true, cat: true, unpause: true, action: 'S.openCraftModal&&S.openCraftModal();' },
  { id: 'g6_knowledge', shelter: 'rooftop', hour: 19, weather: 'snow', decorate: true, cat: true, unpause: true, action: 'S.openKnowledgeModal&&S.openKnowledgeModal();' },
];

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-gshot-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  // 언어를 nw-opts(localStorage)에 영어로 저장 → 이후 리로드가 처음부터 완전 영어로 부팅
  //   (setLang 중간 주입은 패널 제목·캐시된 퀘스트를 못 바꿔 한글 잔존 → 부팅 시점 적용이 정답)
  await win.loadFile(path.join(DIST, 'index.html'));
  await sleep(1500);
  const langSet = await ev(`(()=>{try{const o=JSON.parse(localStorage.getItem('nw-opts')||'{}');o.lang='en';localStorage.setItem('nw-opts',JSON.stringify(o));return o.lang;}catch(e){return 'ERR '+e;}})()`);
  console.log('nw-opts.lang =', langSet);

  for (const sc of SHOTS) {
    if (only && sc.id !== only) continue;
    // 0) 샷마다 페이지 리로드 — 클린 상태(배치모드·모달 누수 방지)
    await win.loadFile(path.join(DIST, 'index.html'));
    for (let i = 0; i < 90; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) break; await sleep(400); }
    // 0.5) 언어 영어 (스토어 메인 언어) — 정적 UI 라벨까지 갱신
    await ev(`(()=>{const S=window.__shelter;S.setLang&&S.setLang('en');S.applyStaticI18n&&S.applyStaticI18n();return 1;})()`);
    // 1) 셸터 로드 + 정지 + 상태 세팅
    await ev(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
      S.simReset&&S.simReset(); S.hideTitle&&S.hideTitle();
      S.state.current=${JSON.stringify(sc.shelter)}; S.loadShelter&&S.loadShelter(${JSON.stringify(sc.shelter)});
      S.setWeather&&S.setWeather(${JSON.stringify(sc.weather)}); S.setHour&&S.setHour(${sc.hour});
      return 1;})()`);
    await ev(SETUP_RES);
    await sleep(400);
    // 2) 꾸미기 + 고양이 + 카메라
    const placed = await ev(`(()=>{try{const S=window.__shelter;
      const R=(S.SHELTERS&&S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
      ${sc.decorate ? `const L=(${cozyLiving.toString()})(R.w,R.d); let n=0; for(const it of L.items){try{S.addItem(it.d,it.c||0,it.x,it.z,it.r||0,true,0,it.tier||3);n++;}catch(e){}}` : 'let n=0;'}
      ${sc.cat ? 'try{S.spawnCat&&S.spawnCat();}catch(e){}' : ''}
      ${CAM}
      S.setPaused&&S.setPaused(true);
      return {placed:n};}catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log(sc.id, 'placed:', JSON.stringify(placed));
    // 3) 정착 렌더 (모달 열기 전에 씬 안착)
    for (let k = 0; k < 30; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(35); }
    // 4) 패널/모달 액션
    if (sc.action) { const r = await ev(`(()=>{try{const S=window.__shelter;${sc.unpause ? 'S.setPaused&&S.setPaused(false);' : ''}${sc.action}return 'ok';}catch(e){return 'ERR '+String(e);}})()`); console.log('  action:', r); }
    // 5) 추가 정착 후 캡처 (UI 유지 — 숨기지 않음)
    for (let k = 0; k < 20; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(35); }
    await sleep(200);
    const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    const file = path.join(OUT, sc.id + '.png');
    fs.writeFileSync(file, PNG.sync.write(png));
    console.log('WROTE ' + file);
  }
  await sleep(100); app.quit(); process.exit(0);
}
main().catch(e => { console.error(e); app.quit(); process.exit(1); });
