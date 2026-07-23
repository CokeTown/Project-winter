// 게임플레이 트레일러 V5 캡처 — 컷 시트 docs/steam/trailer/CUT-SHEET-V5.md
//   trailer-cap2의 두 축을 계승한다:
//     ① FX 컷: freezeForGolden(seed,keepEntities) + stepGolden(1,1/FPS) — 프레임당 정확히 1/30s (정속 보장)
//     ② UI 컷: CDP 가상 시간(Emulation.setVirtualTimePolicy) — DOM 타이머·CSS 애니가 프레임당 1000/FPS ms만 전진
//   자막은 인게임 DOM 오버레이(#tsub, 게임 폰트)로 촬영 시점에 얹고 프레임 인덱스로 페이드 — 결정론.
//   실행: electron tools/trailer-cap5.cjs <outRoot> [clipIdFilter,csv]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os');
const req = require('module').createRequire(path.join(process.cwd(), 'package.json'));
const { PNG } = req('pngjs');
const OUTROOT = process.argv[2] || path.join(process.cwd(), 'scratchpad', 'trailer5');
const FILTER = process.argv[3] ? process.argv[3].split(',') : null;
const DIST = path.resolve(__dirname, '..', 'dist');
const W = 1920, HGT = 1080, FPS = 30;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra2rgba = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };

// 옥탑 코지 레이아웃 (스토어 컷과 동일 — 에셋 전반의 "내 집" 연속성)
const COZY = `(S)=>{const R=(S.SHELTERS&&S.SHELTERS[S.state.current]&&S.SHELTERS[S.state.current].room)||{w:5.6,d:4.4};
  const X=R.w/2,Z=R.d/2,cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const cx=Math.min(-X+2.5,-0.3),cz=Math.min(-Z+2.0,-0.3);
  const P=(x,z)=>({x:cl(cx+x,-X+0.4,X-0.4),z:cl(cz+z,-Z+0.4,Z-0.4)});
  const L=[['bed',-1.4,-0.9],['bookshelf',0.1,-1.6],['sofa',1.5,-0.6],['rug',0,1.0],['teatable',0,1.0],
           ['cushion',-1.1,1.0],['stove',1.9,-1.5],['plant',-1.8,1.3],['lamp',1.7,0.7]];
  for(const [d,x,z] of L){const p=P(x,z);try{S.addItem(d,0,p.x,p.z,0,true,0,3);}catch(e){}}
  S.clearGroundDrops&&S.clearGroundDrops();
  if(S.setPan)S.setPan(cx,cz);
  const its=S.items||[],rg=its.find(i=>i.defId==='rug'),tt=its.find(i=>i.defId==='teatable');
  if(rg&&S.qaPlaceCat)S.qaPlaceCat(rg.x-0.55,rg.z+0.55,'sprawl');
  const g=S.avatarSys&&S.avatarSys.getGroup&&S.avatarSys.getGroup();
  if(g&&tt){g.position.x=tt.x-0.55;g.position.z=tt.z+0.35;g.rotation.y=-0.5;}
  return {x:cx,z:cz};}`;

const CLIPS = [
  { id: 'c1_search', kind: 'ui', frames: 110, shelter: 'rooftop', weather: 'clear', hour: 16, sub: 'Search' },
  { id: 'c2_build', kind: 'ui', frames: 100, shelter: 'rooftop', weather: 'clear', hour: 16, sub: 'Build' },
  { id: 'c3_decorate', kind: 'ui', frames: 110, shelter: 'rooftop', weather: 'clear', hour: 17, sub: 'Decorate' },
  { id: 'c4_shelter1', kind: 'fx', frames: 55, shelter: 'rooftop', weather: 'snow', hour: 22, sub: 'Make Your Own', yaw: 0.62, zoom: 1.5 },
  { id: 'c4_shelter2', kind: 'fx', frames: 55, shelter: 'cabin', weather: 'clear', hour: 16, yaw: 0.70, zoom: 1.4 },
  { id: 'c4_shelter3', kind: 'fx', frames: 55, shelter: 'lodge', weather: 'snow', hour: 21, sub: 'Cozy', yaw: 0.55, zoom: 1.45 },
  { id: 'c4_shelter4', kind: 'fx', frames: 55, shelter: 'greenhouse', weather: 'snow', hour: 11, sub: 'Shelter', yaw: 0.66, zoom: 1.4 },
  // 클로즈업 카메라는 실시간 글라이드로 수렴하는 연출 — 동결 상태로는 목표에 도달하지 못한다.
  //   가상시간 경로는 이 클립에서 예산 만료 이벤트가 오지 않아 행(실측) → **늦은 동결**로 해결:
  //   실시간으로 카메라를 수렴시킨 뒤 그 상태에서 freezeForGolden → 이후는 FX 정속 스테핑.
  { id: 'c5_cat', kind: 'cat', frames: 110, shelter: 'rooftop', weather: 'snow', hour: 20, sub: 'With Your Cat', lateFreeze: true },
  { id: 'c6_survive', kind: 'aerial', frames: 200, shelter: 'rooftop', weather: 'clear', hour: 17, sub: 'Survive' },
  { id: 'c7_title', kind: 'fx', frames: 130, shelter: 'rooftop', weather: 'snow', hour: 23, yaw: 0.62, zoom: 1.7, zoomOut: 0.85 },
];

function makeWin() {
  const w = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  w.webContents.setAudioMuted(true); w.webContents.setFrameRate(FPS);
  return w;
}

async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  // 창을 파괴·재생성하는 순간 창 수가 0이 되면 Electron이 앱을 자동 종료한다(배치가 1컷 만에 exit 0으로 죽던 정체).
  app.on('window-all-closed', () => { /* 배치 유지 — 종료는 명시적 app.quit()으로만 */ });
  app.setPath('userData', path.join(os.tmpdir(), 'nw-tr5-' + process.pid));
  setTimeout(() => { console.log('WATCHDOG'); process.exit(7); }, 3600000);
  await app.whenReady();
  let win = makeWin();
  const ev = e => win.webContents.executeJavaScript(e, true);

  for (const sc of CLIPS) {
    if (FILTER && !FILTER.includes(sc.id)) continue;
    const outDir = path.join(OUTROOT, sc.id);
    fs.mkdirSync(outDir, { recursive: true });
    const UI = sc.kind === 'ui' || sc.kind === 'aerial' || sc.vt; // vt = 실시간 rAF가 필요한 연출도 가상시간 경로
    let vtOn = false;
    const vtAdvance = ms => new Promise((res, rej) => {
      const dbg = win.webContents.debugger;
      const onMsg = (e, method) => { if (method === 'Emulation.virtualTimeBudgetExpired') { dbg.removeListener('message', onMsg); res(); } };
      dbg.on('message', onMsg);
      dbg.sendCommand('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }).catch(rej);
    });
    const step = n => UI ? (vtOn ? vtAdvance(n * 1000 / FPS) : sleep(Math.round(n * 1000 / FPS)))
      : ev(`(()=>{window.__shelter.stepGolden(${n},1/${FPS});return 1;})()`);

    // dist file:// 로드는 PWA SW 재등록 타이밍에 간헐 ERR_FAILED(-2) — 창 재생성 직후 특히 잦다.
    //   실패는 상태가 아니라 타이밍이므로 짧은 백오프로 재시도한다(trailer-cap2는 dev 서버로 우회했던 지점).
    let loaded = false;
    for (let a = 0; a < 6 && !loaded; a++) {
      try { await win.loadFile(path.join(DIST, 'index.html')); loaded = true; }
      catch (e) { console.log('  load retry ' + (a + 1) + ' (' + String(e.message || e).slice(0, 40) + ')'); await sleep(1200); }
    }
    if (!loaded) { console.log('SKIP ' + sc.id + ' 로드 실패'); continue; }
    win.setContentSize(W, HGT); // 렌더러를 목표 해상도에 재바인딩(캡슐 밴드 사고 계승)
    await sleep(500);
    let ready = false;
    for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => 0)) { ready = true; break; } await sleep(400); }
    if (!ready) { console.log('SKIP ' + sc.id + ' 부팅 실패'); continue; }

    // ── 공통 셋업 ──
    const setup = await ev(`(async()=>{try{const S=window.__shelter;
      S.setLang&&S.setLang('en'); S.applyStaticI18n&&S.applyStaticI18n();
      ${(UI || sc.lateFreeze) ? '' : 'S.freezeForGolden&&S.freezeForGolden(12345,true);'}
      S.simReset&&S.simReset(); S.hideTitle&&S.hideTitle();
      S.applyStaticI18n&&S.applyStaticI18n();
      S.state.cat=true; S.state.current=${JSON.stringify(sc.shelter)}; S.loadShelter(${JSON.stringify(sc.shelter)});
      await new Promise(r=>setTimeout(r,600));
      S.setWeather(${JSON.stringify(sc.weather)}); S.setHour(${sc.hour});
      S.state.day=24; S.state.res.food=14; S.state.res.water=11; S.state.res.fuel=8; S.state.res.material=17; S.state.res.parts=6;
      const pan=(${COZY})(S);
      // 자막 오버레이(게임 폰트) — FX 컷에서도 살아남게 shotcss 예외
      let sub=document.getElementById('tsub');
      if(!sub){sub=document.createElement('div');sub.id='tsub';document.body.appendChild(sub);}
      sub.textContent=${JSON.stringify(sc.sub || '')};
      sub.style.cssText='position:fixed;left:0;right:0;bottom:8.5%;text-align:center;z-index:9999;'+
        'font-family:var(--f,inherit);font-size:56px;letter-spacing:6px;color:#f2ece0;opacity:0;'+
        'text-shadow:0 3px 0 #14110d,0 0 22px rgba(0,0,0,.85);pointer-events:none;';
      ${(UI && !sc.hideUI) ? `const oc=document.getElementById('shotcss'); if(oc)oc.remove();
              const c2=document.createElement('style'); c2.id='notoast'; c2.textContent='#toast,#quest-card,#tip-note{display:none!important}';
              document.head.appendChild(c2);
              for(const p of document.querySelectorAll('.panel')){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;
                while(n=w.nextNode()){n.textContent=n.textContent.replace('시계','Clock').replace('거점','Base');}}
              S.setPaused&&S.setPaused(false);`
            : `let css=document.getElementById('shotcss')||document.createElement('style');css.id='shotcss';
               document.head.appendChild(css);css.textContent='body > *:not(#c):not(#fx):not(#tsub){display:none!important}';`}
      ${sc.yaw != null ? `S.setYaw&&S.setYaw(${sc.yaw});` : ''}
      ${sc.zoom != null ? `S.setZoom&&S.setZoom(${sc.zoom});` : ''}
      S.setPitch&&S.setPitch(0.52);
      return {ok:1,pan};}catch(e){return {error:String(e&&e.stack||e).slice(0,220)};}})()`);
    console.log(sc.id, 'setup', JSON.stringify(setup));
    if (setup && setup.error) { console.log('SETUP_FAIL ' + sc.id); continue; }

    // ── 종류별 사전 액션 ──
    if (sc.kind === 'ui' && sc.id === 'c1_search') {
      await ev(`(()=>{document.getElementById('btn-exp').click();return 1;})()`); await sleep(900);
    } else if (sc.kind === 'ui' && sc.id === 'c2_build') {
      await ev(`(()=>{document.getElementById('btn-craft').click();return 1;})()`); await sleep(900);
    } else if (sc.kind === 'ui' && sc.id === 'c3_decorate') {
      await ev(`(async()=>{const S=window.__shelter;S.state.lightGels=true;S.state.paints={charcoal:2,ashgray:1,whitewash:2};
        const tb=document.getElementById('btn-build');if(tb)tb.click();await new Promise(r=>setTimeout(r,400));
        const lamp=(S.items||[]).find(i=>i.defId==='lamp');if(lamp&&S.select)S.select(lamp);return 1;})()`); await sleep(800);
    } else if (sc.kind === 'cat') {
      // 러그와 찻상이 같은 좌표계 원점을 공유해 고양이·아바타가 포개진다 → 클로즈업이 아바타 다리를 잡았다.
      //   아바타를 치우고 고양이를 러그 중앙에 단독으로 세운 뒤 클로즈업 진입.
      await ev(`(()=>{const S=window.__shelter;
        S.avatarDespawn&&S.avatarDespawn();
        // 러그 중앙 = 찻상 바로 아래(두 가구가 같은 좌표) → 고양이가 상판에 가린다. 러그 앞 빈 바닥으로.
        const rg=(S.items||[]).find(i=>i.defId==='rug');
        if(rg&&S.qaPlaceCat)S.qaPlaceCat(rg.x-0.95,rg.z+0.75,'sprawl');
        S.enterCatCloseup&&S.enterCatCloseup();
        return S.qaCatInfo?S.qaCatInfo():1;})()`);
      await sleep(1800); // 클로즈업 글라이드 수렴 대기(실시간) — 프레임 0부터 이미 붙어 있어야 한다
      await ev(`(()=>{const S=window.__shelter;S.freezeForGolden&&S.freezeForGolden(12345,true);return 1;})()`); // 수렴 후 동결
    } else if (sc.kind === 'aerial') {
      await ev(`(()=>{document.getElementById('btn-exp').click();return 1;})()`); await sleep(1200);
      // 파노라마: 사이드 패널 숨김 — 디오라마만 남긴다
      await ev(`(()=>{const c=document.createElement('style');c.id='obsclean';
        c.textContent='#obs-panel,.obs-panel,#obs-exit-wrap{opacity:0!important}';document.head.appendChild(c);return 1;})()`);
    }

    if (UI) { // 가상 시간 개시 (사전 액션의 실시간 애니가 끝난 뒤)
      try { win.webContents.debugger.attach('1.3'); } catch (e) { /* 이미 붙음 */ }
      await win.webContents.debugger.sendCommand('Emulation.setVirtualTimePolicy', { policy: 'pause' });
      vtOn = true;
    }

    // ── 프레임 루프 ──
    for (let f = 0; f < sc.frames; f++) {
      const t = f / sc.frames;
      // 자막 페이드: 8f 인 / 12f 아웃
      const subA = sc.sub ? Math.min(1, f / 8, Math.max(0, (sc.frames - f) / 12)) : 0;
      await ev(`(()=>{const s=document.getElementById('tsub');if(s)s.style.opacity='${subA.toFixed(3)}';return 1;})()`);
      // 카메라 드리프트 (FX/cat)
      if (sc.kind === 'fx') {
        const yaw = (sc.yaw || 0.62) + t * 0.13;               // 느린 궤도
        const zoom = sc.zoomOut ? sc.zoom + (sc.zoomOut - sc.zoom) * t : sc.zoom;
        await ev(`(()=>{const S=window.__shelter;S.setYaw&&S.setYaw(${yaw.toFixed(4)});S.setZoom&&S.setZoom(${zoom.toFixed(4)});return 1;})()`);
      } else if (sc.kind === 'cat') {
        if (f === 26) await ev(`(()=>{window.__shelter.petCat&&window.__shelter.petCat();return 1;})()`); // 눈감김(웃는 표정) 진입
        if (f === 70) await ev(`(()=>{window.__shelter.petCat&&window.__shelter.petCat();return 1;})()`); // 유지 연장
      } else if (sc.kind === 'ui' && sc.id === 'c1_search' && f === 34) {
        // 지역 포커스 — CRT 돌리 줌(관측 단말의 셀링 포인트)
        await ev(`(()=>{const rows=[...document.querySelectorAll('.obs-region')];
          const r=rows.find(x=>x.dataset.rid==='commercial')||rows[0];if(r)r.click();return 1;})()`);
      } else if (sc.kind === 'aerial') {
        // 파노라마: overview → 지역 4곳 순차 포커스
        const RID = ['residential', 'commercial', 'industrial', 'slum'];
        const marks = [10, 55, 100, 145];
        const k = marks.indexOf(f);
        if (k >= 0) await ev(`(()=>{const a=window.__shelter.aerialProto&&window.__shelter.aerialProto();
          if(a&&a.focus)a.focus(${JSON.stringify(RID[k])});return 1;})()`);
      }
      await step(1);
      const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
      const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
      fs.writeFileSync(path.join(outDir, 'f' + String(f).padStart(4, '0') + '.png'), PNG.sync.write(png));
    }
    console.log('CLIP_DONE ' + sc.id + ' frames=' + sc.frames);
    // 가상 시계는 재로드해도 렌더러에 남아 다음 클립의 setTimeout을 영구 정지시킨다(FX 컷 0프레임 행의 정체).
    //   디버거 분리·budget 재개로도 확실히 풀리지 않으므로 렌더러 자체를 교체한다.
    //   순서가 핵심: 새 창을 먼저 만든 뒤 옛 창을 버린다 — 창 수가 0이 되는 순간이 없어야 앱이 안 죽는다.
    if (vtOn) { const old = win; win = makeWin(); try { old.destroy(); } catch (e) { /* */ } vtOn = false; await sleep(600); }
  }
  console.log('ALL_DONE');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('예외:', e && e.stack || e); app.quit(); process.exit(1); });
