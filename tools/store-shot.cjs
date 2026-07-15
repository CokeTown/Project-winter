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
  // 방 원점 중심 x∈[-X,X] z∈[-Z,Z], 뒷벽 z=-Z, 열린 앞면 z=+Z(카메라측).
  // 고정 크기 코지 클러스터(방 크기와 무관하게 밀도 일정) — 뒷좌 코너 앵커 + 카메라 팬으로 프레이밍.
  const X = w / 2, Z = d / 2;
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3); // 클러스터 중심(뒷좌 편향)
  const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => ({ d: dd, ...P(x, z), r: r || 0, tier: 3, c: 0 });
  return { pan: { x: cx, z: cz }, items: [
    it('bed', -1.4, -0.9), it('bookshelf', 0.1, -1.6), it('sofa', 1.5, -0.6), // 뒷줄
    it('rug', 0, 1.0), it('teatable', 0, 1.0), it('cushion', -1.1, 1.0),       // 앞줄(러그+찻상+방석=고양이)
    it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.7, 0.7),      // 난로(뒷우)·화분(앞좌)·램프
  ] };
};

const CAM = { yaw: 0.62, pitch: 0.44, zoom: 1.55 };
const SHOTS = [
  { id: '01_rooftop_cozy_cat', shelter: 'rooftop', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '03_cabin_cozy', shelter: 'cabin', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '04_lodge_hearth', shelter: 'lodge', hour: 17, weather: 'snow', cat: true, ...CAM, layout: cozyLiving },
  { id: '05_bunker_warm', shelter: 'bunker', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '07_greenhouse_glass', shelter: 'greenhouse', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '06_tugboat_cabin', shelter: 'tugboat', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '08_subway_home', shelter: 'subway', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  { id: '09_lighthouse_lamp', shelter: 'lighthouse', hour: 17, weather: 'clear', cat: true, ...CAM, layout: cozyLiving },
  // 응답 불빛 컷: 밤 옥탑(따뜻한 실내) + 어두운 도시 + 먼 곳 발광 창 1개(clamp 없는 extra 배치).
  { id: '02_answering_light', shelter: 'rooftop', hour: 22, weather: 'clear', cat: false,
    yaw: 0.62, pitch: 0.52, zoom: 0.92, pan: { x: 1.5, z: -3 }, layout: cozyLiving,
    extra: [{ d: 'lantern', x: 10, z: -7, y: 4.5 }] }, // 응답 불빛: 어둠 속 먼 창 하나
];

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-shot-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
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
      const L=(${sc.layout.toString()})(w,d); const items=L.items||L;
      let n=0; for(const it of items){ try{ S.addItem(it.d, it.c||0, it.x, it.z, it.r||0, true, 0, it.tier||3); n++; }catch(e){} }
      ${sc.extra ? `for(const e of (${JSON.stringify(sc.extra)})){ try{ S.addItem(e.d, e.c||0, e.x, e.z, e.r||0, true, e.y||0, e.tier||3); n++; }catch(err){} }` : ''}
      ${sc.cat ? 'try{S.spawnCat&&S.spawnCat();}catch(e){}' : ''}
      const PAN=${sc.pan ? JSON.stringify(sc.pan) : '(L.pan||null)'}; if(PAN&&S.setPan)S.setPan(PAN.x,PAN.z);
      S.setYaw&&S.setYaw(${sc.yaw}); S.setPitch&&S.setPitch(${sc.pitch}); S.setZoom&&S.setZoom(${sc.zoom});
      return {placed:n, room:{w,d}, itemCount:items.length, pan:L.pan};
    }catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log('  placed:', JSON.stringify(placed));
    // 겹침 검출(디렉터 피드백 2026-07-12): addItem은 충돌을 안 거른다 → 배치 후 fp AABB 쌍별 검사.
    //   회전 90/270도면 w,d 교환. rug 등 noCollide 제외. 겹침 있으면 로그로 경고(레이아웃 수정 신호).
    const overlaps = await ev(`(()=>{const S=window.__shelter;const its=S.items||[];
      const box=(it)=>{const def=S.DEFS[it.defId]||{};const fp=def.fp||{w:0.5,d:0.5};const rot=it.rot||0;
        const swap=Math.abs(Math.sin(rot))>0.5;const hw=(swap?fp.d:fp.w)/2,hd=(swap?fp.w:fp.d)/2;
        return {nc:!!def.noCollide,x0:it.x-hw,x1:it.x+hw,z0:it.z-hd,z1:it.z+hd,id:it.defId,y:it.y||0};};
      const bs=its.map(box);const out=[];
      for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],b=bs[j];
        if(a.nc||b.nc)continue; if(Math.abs(a.y-b.y)>0.3)continue; // 표면 스택(다른 높이) 제외
        const ox=Math.min(a.x1,b.x1)-Math.max(a.x0,b.x0),oz=Math.min(a.z1,b.z1)-Math.max(a.z0,b.z0);
        if(ox>0.03&&oz>0.03)out.push(a.id+'×'+b.id+'('+ox.toFixed(2)+'×'+oz.toFixed(2)+')');}
      return out;})()`);
    console.log('  overlaps:', overlaps.length ? '⚠ ' + overlaps.join(', ') : 'NONE ✓');
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
