// 트레일러 클립 캡처 (인엔진 프레임 시퀀스 → PNG). ffmpeg가 별도로 MP4 인코딩.
//   디렉터 승인 3막 구조(온기→바깥→회색의 아름다움, CUT-SHEET.md)를 인엔진 머니샷으로 촬영.
//   kind별 처리: beauty(카메라 드리프트)·decorate(가구 타임랩스)·catcloseup(전용 캠)·
//                map(지도 모달)·signal(생존자 불빛 점등 클라이맥스)·vignette(금문교 노을)·coldsnap(회색 한파).
//   store-shot과 달리 setPaused(false)로 눈·고양이·불꽃 애니메이션을 살린다. dist(gd-2.0) 필요.
//   실행: electron tools/trailer-cap.cjs <outRoot> [clipIdFilter]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');
const OUTROOT = process.argv[2]; const FILTER = process.argv[3] ? process.argv[3].split(',') : null;
const DIST = path.resolve(__dirname, '..', 'dist');
const W = 1920, HGT = 1080, FPS = 30;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // 부드러운 카메라 감속

// 꾸민 거실 (store-shot/gameplay-shot에서 이식, 방 크기 상대 배치)
const cozyLiving = (w, d) => {
  const X = w / 2, Z = d / 2; const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3);
  const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => { const p = P(x, z); return { d: dd, x: p.x, z: p.z, r: r || 0, tier: 3 }; };
  return [
    it('rug', 0, 1.0), it('bed', -1.4, -0.9), it('bookshelf', 0.1, -1.6), it('sofa', 1.5, -0.6),
    it('teatable', 0, 1.0), it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.7, 0.7), it('cushion', -1.1, 1.0),
  ];
};

// 카메라 드리프트 프리셋 (t 0→1)
const drift = (o) => t => ({ yaw: lerp(o.yaw0, o.yaw1, ease(t)), pitch: lerp(o.pit0 ?? 0.45, o.pit1 ?? 0.46, ease(t)),
  zoom: lerp(o.z0, o.z1, ease(t)), pan: { x: lerp(o.px0 ?? -0.3, o.px1 ?? 0.2, ease(t)), z: o.pz ?? -0.3 } });

const CLIPS = [
  // ── ACT 1 「온기」 ──
  { id: 'a1_cozy', kind: 'beauty', shelter: 'rooftop', hour: 22, weather: 'snow', cat: true, frames: 96,
    cam: drift({ yaw0: 0.52, yaw1: 0.66, z0: 1.28, z1: 1.5, px0: -1.0, px1: 0.4 }) },
  { id: 'a2_decorate', kind: 'decorate', shelter: 'rooftop', hour: 16, weather: 'clear', cat: false, frames: 108,
    cam: drift({ yaw0: 0.58, yaw1: 0.62, z0: 1.5, z1: 1.34, px0: -0.2, px1: -0.3 }) },
  { id: 'a3_cat', kind: 'catcloseup', shelter: 'rooftop', hour: 18, weather: 'clear', cat: true, frames: 96,
    cam: drift({ yaw0: 0.6, yaw1: 0.6, z0: 1.3, z1: 1.3 }) },
  // ── ACT 2 「바깥」 ──
  { id: 'b1_map', kind: 'map', shelter: 'rooftop', hour: 15, weather: 'clear', cat: false, frames: 78 },
  { id: 'b2_cabin', kind: 'beauty', shelter: 'cabin', hour: 17, weather: 'clear', cat: true, frames: 96,
    cam: drift({ yaw0: 0.68, yaw1: 0.56, z0: 1.5, z1: 1.3, px0: 0.4, px1: -0.5 }) },
  { id: 'b3_yacht', kind: 'beauty', shelter: 'tugboat', hour: 18, weather: 'clear', cat: false, frames: 96,
    cam: drift({ yaw0: 0.5, yaw1: 0.64, z0: 1.2, z1: 1.05, px0: -0.6, px1: 0.6 }) },
  { id: 'b4_greenhouse', kind: 'beauty', shelter: 'greenhouse', hour: 15, weather: 'snow', cat: true, frames: 96,
    cam: drift({ yaw0: 0.62, yaw1: 0.5, z0: 1.35, z1: 1.18, px0: 0.3, px1: -0.4 }) },
  { id: 'b5_bridge', kind: 'vignette', shelter: 'rooftop', hour: 17, weather: 'clear', cat: false, frames: 120, vigStart: 2600 },
  // ── ACT 3 「회색의 아름다움」 ──
  { id: 'c1_coldsnap', kind: 'coldsnap', shelter: 'lodge', hour: 12, weather: 'snow', cat: false, frames: 96, winter: true,
    cam: drift({ yaw0: 0.56, yaw1: 0.66, pit0: 0.6, pit1: 0.56, z0: 0.82, z1: 0.92, px0: -0.5, px1: 0.8, pz: -1.2 }) },
  { id: 'c2_signal', kind: 'signal', shelter: 'rooftop', hour: 23, weather: 'clear', cat: false, frames: 120, winter: true },
];

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-trailer-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);

  // 프리부트: 언어를 nw-opts(localStorage)에 영어로 저장 → 이후 리로드가 처음부터 완전 영어로 부팅
  //   (setLang 중간 주입은 패널 제목 거점/시계/자원·캐시된 퀘스트를 못 바꿔 한글 잔존 → 부팅 시점 적용이 정답)
  await win.loadFile(path.join(DIST, 'index.html'));
  await sleep(1200);
  await ev(`(()=>{try{const o=JSON.parse(localStorage.getItem('nw-opts')||'{}');o.lang='en';localStorage.setItem('nw-opts',JSON.stringify(o));}catch(e){}return 1;})()`);

  for (const sc of CLIPS) {
    if (FILTER && !FILTER.includes(sc.id)) continue;
    const outDir = path.join(OUTROOT, sc.id);
    fs.mkdirSync(outDir, { recursive: true });
    // 0) 클린 상태로 리로드
    await win.loadFile(path.join(DIST, 'index.html'));
    let ready = false;
    for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) { ready = true; break; } await sleep(400); }
    if (!ready) { console.log('SKIP ' + sc.id + ' (부팅 실패)'); continue; }

    // 1) 공통 셋업 — 계절(겨울 옵션)·셸터·날씨·시각. decorate는 뒤에서 개별 배치.
    const hideUI = !['map', 'signal', 'vignette'].includes(sc.kind);
    const setup = await ev(`(()=>{try{const S=window.__shelter;
      S.setLang&&S.setLang('en');S.applyStaticI18n&&S.applyStaticI18n();
      S.simReset&&S.simReset();S.hideTitle&&S.hideTitle();
      ${sc.winter ? 'const D=(S.BAL&&S.BAL.seasons&&S.BAL.seasons.daysPerSeason)||15;S.state.day=3*D+Math.ceil(D/2);' : ''}
      S.state.current=${JSON.stringify(sc.shelter)};S.loadShelter(${JSON.stringify(sc.shelter)});
      S.setWeather(${JSON.stringify(sc.weather)});S.setHour(${sc.hour});
      ${hideUI ? `let css=document.getElementById('shotcss')||document.createElement('style');css.id='shotcss';document.head.appendChild(css);css.textContent='body > *:not(#c):not(#fx){display:none!important}';` : `const oc=document.getElementById('shotcss');if(oc)oc.remove();`}
      return {season:(S.seasonOf&&S.seasonOf().nameEn)||'?'};}catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log(sc.id, 'setup:', JSON.stringify(setup));

    // 2) 꾸미기 (decorate 제외 — 전부 즉시 배치) + 고양이
    if (sc.kind !== 'decorate') {
      await ev(`(()=>{const S=window.__shelter;
        const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
        const L=(${cozyLiving.toString()})(R.w,R.d);for(const it of L){try{S.addItem(it.d,0,it.x,it.z,it.r,true,0,it.tier);}catch(e){}}
        ${sc.cat ? 'try{S.state.cat=true;S.spawnCat&&S.spawnCat();}catch(e){}' : ''}return 1;})()`);
    }
    await ev(`window.__shelter.setPaused&&window.__shelter.setPaused(false)`);
    await sleep(700);

    // 3) kind별 사전 액션
    if (sc.kind === 'catcloseup') {
      await sleep(600); // 고양이 안착. 카메라는 캡처 루프에서 매 프레임 고양이 월드좌표를 따라 프레이밍.
      const has = await ev(`(()=>{const S=window.__shelter;return !!(S.cat&&S.cat());})()`);
      console.log('  cat exists:', has);
    } else if (sc.kind === 'map' || sc.kind === 'signal') {
      await ev(`window.__shelter.openMapModal&&window.__shelter.openMapModal()`); await sleep(500);
    } else if (sc.kind === 'vignette') {
      await ev(`window.__shelter.playGoldenGateVignette&&window.__shelter.playGoldenGateVignette()`);
      await sleep(sc.vigStart || 2500); // 페이드인 + 도입 지나 리빌 구간부터 캡처
    }

    // 4) 캡처 루프
    const decoItems = sc.kind === 'decorate'
      ? await ev(`(()=>{const S=window.__shelter;const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};return (${cozyLiving.toString()})(R.w,R.d);})()`)
      : null;
    let decoAdded = 0;
    for (let f = 0; f < sc.frames; f++) {
      const t = sc.frames > 1 ? f / (sc.frames - 1) : 0;
      // decorate: 진행도에 맞춰 가구를 하나씩 추가 (타임랩스)
      if (sc.kind === 'decorate') {
        const want = Math.min(decoItems.length, Math.floor(t * (decoItems.length + 0.9)));
        while (decoAdded < want) { const it = decoItems[decoAdded++]; await ev(`(()=>{window.__shelter.addItem(${JSON.stringify(it.d)},0,${it.x},${it.z},${it.r},true,0,${it.tier});return 1;})()`); }
      }
      // 카메라 — catcloseup는 매 프레임 고양이 월드좌표로 팬/줌 프레이밍(따라가는 클로즈업), 그 외는 드리프트 프리셋
      if (sc.kind === 'catcloseup') {
        const yaw = 0.5 + 0.32 * ease(t), zoom = lerp(2.0, 2.5, t);
        await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(c){const v=new S.THREE.Vector3();c.g.getWorldPosition(v);S.setPan(v.x,v.z);}S.setZoom(${zoom});S.setPitch(0.34);S.setYaw(${yaw});return 1;})()`);
      } else if (sc.cam) {
        const c = sc.cam(t);
        await ev(`(()=>{const S=window.__shelter;S.setYaw(${c.yaw});S.setPitch(${c.pitch});S.setZoom(${c.zoom});S.setPan(${c.pan.x},${c.pan.z});return 1;})()`);
      }
      // catcloseup: 32% 지점에서 쓰다듬기(눈 감김·갸르릉)
      if (sc.kind === 'catcloseup' && f === Math.floor(sc.frames * 0.32)) await ev(`window.__shelter.petCat&&window.__shelter.petCat()`);
      // signal: 생존자 불빛을 0→12로 점등 (응답의 클라이맥스). renderSurvivorLights는 미노출이라
      //   .map-light 도트를 직접 DOM에 주입(게임 CSS가 앰버 글로우 렌더). 위치는 지역 마커를 피한 고정 스팟.
      if (sc.kind === 'signal') {
        const lit = Math.min(12, Math.floor(t * 13.5));
        await ev(`(()=>{const w=document.getElementById('map-wrap');if(!w)return 0;
          w.querySelectorAll('.map-light').forEach(e=>e.remove());
          const spots=[[63,40],[71,26],[52,64],[40,23],[26,55],[46,50],[58,72],[80,48],[34,42],[22,70],[68,60],[15,34]];
          for(let i=0;i<Math.min(${lit},spots.length);i++){const d=document.createElement('div');d.className='map-light';d.style.left=spots[i][0]+'%';d.style.top=spots[i][1]+'%';w.appendChild(d);}
          return ${lit};})()`);
      }
      await sleep(1000 / FPS); // 애니메이션 진행 시간
      const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
      const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
      fs.writeFileSync(path.join(outDir, 'f' + String(f).padStart(4, '0') + '.png'), PNG.sync.write(png));
    }
    console.log('CLIP_DONE ' + sc.id + ' frames=' + sc.frames);
    if (sc.kind === 'vignette') await ev(`document.querySelectorAll('div[style*="z-index:400"]').forEach(e=>e.remove())`).catch(() => {});
  }
  console.log('ALL_DONE');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('예외:', e); app.quit(); process.exit(1); });
