// 스토어 스크린샷 컴포저 (#3, 게임 리뷰 레버3 "빈 방→꾸민 실내+고양이+골든아워").
//   정식판 셸터를 T3 가구로 꾸미고 골든아워 + 고양이로 1920×1080 촬영한다.
//   골든과 달리 freezeForGolden(고양이 숨김)을 쓰지 않는다 — 대신 setPaused로 게임시간만 멈추고
//   렌더 프레임을 돌려 정착시킨 뒤 capturePage. dist(gd-2.0 정식 빌드) 필요.
//   실행: npx electron tools/store-shot.cjs [shotId]   (인자 없으면 전체)
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT = path.resolve(__dirname, '..', 'docs', 'steam', 'shots', 'v2');
const W = 1920, HGT = 1080;
const only = process.argv[2] || null;

// 가구 레이아웃은 getROOM()의 실제 {w,d}에 상대 배치(셸터별 방 크기 다름). f(w,d)→[{d,x,z,r,tier,c}]
// 데코 세트: 아늑한 거실 — 침대·러그·소파·탁자·책장·화분·랜턴·난로(온기)·방석(고양이 자리).
const cozyLiving = (w, d) => {
  const X = w / 2, Z = d / 2; // 방은 원점 중심, x∈[-X,X] z∈[-Z,Z]. 뒷벽 z=-Z, 열린 앞면 z=+Z(카메라측).
  return [
    { d: 'bed', x: -X + 1.0, z: -Z + 1.25, r: 0, tier: 3, c: 0 },
    { d: 'rug', x: 0.2, z: 0.1, r: 0, tier: 3, c: 0 },
    { d: 'stove', x: X - 0.7, z: -Z + 0.6, r: 0, tier: 3, c: 0 },
    { d: 'sofa', x: 0.4, z: -Z + 0.7, r: 0, tier: 3, c: 0 },
    { d: 'teatable', x: 0.2, z: 0.1, r: 0, tier: 3, c: 0 },
    { d: 'bookshelf', x: -X + 0.5, z: 0.6, r: Math.PI / 2, tier: 3, c: 0 },
    { d: 'plant', x: X - 0.5, z: Z - 0.6, r: 0, tier: 3, c: 0 },
    { d: 'lamp', x: X - 0.5, z: -Z + 0.5, r: 0, tier: 3, c: 0 },
    { d: 'cushion', x: -0.6, z: 0.5, r: 0, tier: 3, c: 0 }, // 고양이 자리
  ];
};

const SHOTS = [
  { id: '01_rooftop_cozy_cat', shelter: 'rooftop', hour: 17, weather: 'clear', cat: true,
    yaw: 0.62, pitch: 0.44, zoom: 1.55, layout: cozyLiving },
];

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-shot-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(30);
  await win.loadFile(path.join(DIST, 'index.html'));
  const ev = e => win.webContents.executeJavaScript(e, true);
  for (let i = 0; i < 90; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) break; await sleep(500); }
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  for (const sc of SHOTS) {
    if (only && sc.id !== only) continue;
    // 1) 셸터 로드 + 게임시간 정지(고양이는 살아있게 — freezeForGolden 미사용)
    await ev(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
      S.simReset(); S.hideTitle&&S.hideTitle(); S.setPaused&&S.setPaused(true);
      S.state.current=${JSON.stringify(sc.shelter)};
      S.loadShelter&&S.loadShelter(${JSON.stringify(sc.shelter)});
      S.setWeather&&S.setWeather(${JSON.stringify(sc.weather)});
      S.setHour&&S.setHour(${sc.hour});
      return 1;})()`);
    await sleep(500);
    // 2) 가구 배치(실제 방 크기 기준) + 고양이
    const placed = await ev(`(()=>{try{const S=window.__shelter;
      const R=(S.SHELTERS&&S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
      const w=R.w,d=R.d;
      const items=(${sc.layout.toString()})(w,d);
      let n=0; for(const it of items){ try{ S.addItem(it.d, it.c||0, it.x, it.z, it.r||0, true, 0, it.tier||3); n++; }catch(e){} }
      ${sc.cat ? 'try{S.spawnCat&&S.spawnCat();}catch(e){}' : ''}
      S.setYaw&&S.setYaw(${sc.yaw}); S.setPitch&&S.setPitch(${sc.pitch}); S.setZoom&&S.setZoom(${sc.zoom});
      return {placed:n, room:{w,d}, itemCount:items.length};
    }catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log('  placed:', JSON.stringify(placed));
    // 3) UI 전부 숨김(캔버스 #c/#fx만 남김) — 스토어 샷은 깨끗해야 한다.
    await ev(`(()=>{let css=document.getElementById('shotcss');if(!css){css=document.createElement('style');css.id='shotcss';document.head.appendChild(css);}
      css.textContent='body > *:not(#c):not(#fx){display:none!important}';return 1;})()`); // 캔버스만 남기고 UI 전부 숨김
    // 4) 정착: 렌더 프레임을 돌려 지오/조명/고양이 안착 후 캡처
    for (let k = 0; k < 40; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(40); }
    const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    const file = path.join(OUT, sc.id + '.png');
    fs.writeFileSync(file, PNG.sync.write(png));
    console.log('WROTE ' + file);
  }
  await sleep(100); app.quit(); process.exit(0);
}
main().catch(e => { console.error(e); app.quit(); process.exit(1); });
