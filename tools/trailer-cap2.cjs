// 트레일러 v2/v3 캡처 — 비트 싱크 스펙(trailer2/3-spec.json) 기반.
//   v1(trailer-cap.cjs)과 동일 엔진, 차이: 스펙 파일이 클립·프레임수·비트 프레임을 지정.
//   decorate: beatFrames[k] 프레임에서 가구 k 배치 (물방울 틱마다 가구가 놓인다 — Unpacking 문법).
//            crudeTiers=true면 티어 가구를 T1(크루드)로 배치 — 이후 upgrade 슬라이스가 모핑.
//   signal:   lightFrames 누적 개수만큼 지도 불빛 점등 (비트마다 창문 하나가 응답).
//   ignite:   전 조명 소등 상태에서 flameFrame에 난로 점등(setItemPower) + 타이트→줌아웃 리빌 (라이터 SFX는 조립에서 믹스).
//   loot:     UI 노출. 탐험 출발(departExpedition auto)→즉시 귀환→resolveFrame에 정산 개봉 연출(DDD-1 행 리빌).
//   expstory: UI 노출 원테이크 — 지도→지역 정보(showMapInfo)→준비 모달(startExpedition)→출발(depart)→진행 패널→정산 개봉.
//             "보내는 게 보여야 한다"(디렉터) — 실제 탐험 UI 플로우를 프레임 지정 액션으로 라이브 재현.
//   daynight: 고정 3/4 앵글 + 느린 궤도 드리프트에서 setHour 스윕(hourFrom→hourTo) — 낮→밤 라이팅 타임랩스 (Terra Nil 변신 문법).
//   upgrade:  stageFrames[0]에 티어 가구 전부 T2, [1]에 T3 모핑 (removeItem→addItem 재배치).
//   실행: electron tools/trailer-cap2.cjs <specJson> <outRoot> [clipIdFilter,csv]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');
const SPEC = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUTROOT = process.argv[3];
const FILTER = process.argv[4] ? process.argv[4].split(',') : null;
const DIST = path.resolve(__dirname, '..', 'dist');
// CAP_URL 지정 시 dist file:// 대신 그 URL(예: 개발 서버 http://localhost:8420)에서 로드.
//   dist file:// 는 PWA SW 재등록/재빌드 시 부팅이 불안정(간헐 실패) — dev 서버 로드가 안정적.
const CAP_URL = process.env.CAP_URL || null;
const loadApp = w => CAP_URL ? w.loadURL(CAP_URL) : w.loadFile(path.join(DIST, 'index.html'));
const W = 1920, HGT = 1080, FPS = SPEC.fps || 30;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// 렌더 룩 오버라이드 (트레일러 재촬영용): CAP_PIXEL/CAP_DITHERAMT/CAP_AA env → 각 클립 setup서 적용.
//   예) CAP_PIXEL=2 CAP_DITHERAMT=0.3 CAP_AA=1 = 스토리 트레일러와 동일한 다듬어진 도트 룩.
const OPTS_JS = (process.env.CAP_PIXEL || process.env.CAP_DITHERAMT || process.env.CAP_AA)
  ? `S.opts.pixel=${+process.env.CAP_PIXEL || 3};S.opts.ditherAmt=${process.env.CAP_DITHERAMT != null ? +process.env.CAP_DITHERAMT : 1};S.opts.aa=${process.env.CAP_AA === '0' ? 'false' : 'true'};S.applyOpts&&S.applyOpts();`
  : '';

const cozyLiving = (w, d) => {
  const X = w / 2, Z = d / 2; const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3);
  const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => { const p = P(x, z); return { d: dd, x: p.x, z: p.z, r: r || 0, tier: 3 }; };
  // 디렉터 신고 반영 3건: ① 난로(우측 뒷벽) 전면은 빈 바닥 ② 소파 뒤 트임(끼임 지대 제거)
  //   ③ 침대·책장 겹침 해소 — 책장은 좌측 벽에 회전 배치(π/2), 침대와 축 자체를 분리.
  return [
    it('rug', 0.4, 0.6), it('bed', -1.4, -0.9), it('bookshelf', -1.9, 0.35, Math.PI / 2), it('sofa', 0.4, -0.7),
    it('teatable', 0.4, 0.45), it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.8, 0.9), it('cushion', -1.2, 0.9),
  ];
};

// 셸터별 전용 레이아웃 (디렉터: "하나의 구조 돌려쓰지 말고 다채롭게") — 절대 방 좌표, 방 크기로 클램프.
//   각 집의 아이덴티티: 컨테이너=허름한 시작 / 지하철=승강장 야영 / 온실=식물의 방 /
//   오두막=난롯가 서재 / 요트=살롱 / 로지=아프레스키. 옥탑(cozyLiving)은 "내 집" 서사 연속성으로 유지.
const LAYOUTS = {
  container_start: [ // 크루드 최소 — 게임 첫날의 집
    { d: 'bed', x: -1.6, z: -0.4, tier: 1 }, { d: 'crate', x: 0.7, z: -0.6 }, { d: 'candle', x: 1.1, z: 0.4 },
    { d: 'barrelfire', x: 1.9, z: -0.3 }, { d: 'bookstack', x: -0.5, z: 0.5 },
  ],
  subway_camp: [ // 승강장 야영 — 랜턴·라디오·구급상자
    { d: 'bed', x: -1.5, z: -1.0, tier: 2 }, { d: 'lantern', x: 0.2, z: -0.9 }, { d: 'crate', x: 0.9, z: -1.05 },
    { d: 'radio', x: 1.7, z: -0.95 }, { d: 'firstaidbox', x: 2.3, z: -0.8 }, { d: 'cushion', x: 0.4, z: 0.35 },
  ],
  greenhouse_garden: [ // 식물의 방 — 화분 셋 + 아침 식탁
    { d: 'plant', x: -2.4, z: -1.4 }, { d: 'plant', x: -1.5, z: 0.9, c: 1 }, { d: 'plant', x: 2.2, z: -1.2, c: 2 },
    { d: 'table', x: 0.2, z: -0.5 }, { d: 'chair', x: 0.95, z: -0.3, r: Math.PI }, { d: 'rug', x: 0.2, z: 0.3 },
    { d: 'candelabra', x: -0.6, z: -1.5 }, { d: 'bookstack', x: 1.6, z: 0.8 },
  ],
  cabin_hearth: [ // 난롯가 서재 — 책장 둘·지구본·촛대
    { d: 'stove', x: 2.4, z: -2.0 }, { d: 'sofa', x: 0.5, z: -1.1 }, { d: 'rug', x: 1.4, z: -0.2 },
    { d: 'bookshelf', x: -1.3, z: -2.4 }, { d: 'bookshelf', x: -2.5, z: -2.4 }, { d: 'globe', x: -0.2, z: -2.3 },
    { d: 'candelabra', x: 1.9, z: 0.4 }, { d: 'cushion', x: -1.6, z: 0.3 },
  ],
  yacht_salon: [ // 살롱 — 축음기·화장대·거울
    { d: 'sofa', x: 0.5, z: -0.8 }, { d: 'teatable', x: 0.5, z: 0.2 }, { d: 'lamp', x: 1.6, z: -0.6 },
    { d: 'dresser', x: -1.4, z: -1.0 }, { d: 'phonograph', x: 1.7, z: 0.6 }, { d: 'rug', x: 0.5, z: 0.25 },
  ],
  lodge_apres: [ // 아프레스키 — 스키 장비가 벽에 기대 있는 난롯가
    { d: 'stove', x: 1.9, z: -1.5 }, { d: 'sofa', x: 0.2, z: -0.7 }, { d: 'rug', x: 0.3, z: 0.4 },
    { d: 'cushion', x: -1.0, z: 0.5 }, { d: 'skis', x: -2.5, z: -1.6 }, { d: 'skipoles', x: -2.1, z: -1.7 },
    { d: 'snowboard', x: 2.5, z: -0.7 }, { d: 'bookstack', x: -1.6, z: 0.9 },
  ],
};

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-trailer2-' + process.pid));
  await app.whenReady();
  const makeWin = () => {
    // 기본 세션 유지 — 커스텀 파티션은 file:// 로드가 ERR_FAILED(실측 배치3). 재생성만으로 vt 정지 해소 충분(배치1 실증).
    const w = new BrowserWindow({ show: false, width: W, height: HGT,
      webPreferences: { offscreen: true, backgroundThrottling: false } });
    w.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
    w.webContents.setFrameRate(Math.min(60, FPS));
    return w;
  };
  let win = makeWin();
  const ev = e => win.webContents.executeJavaScript(e, true);

  // 프리부트: nw-opts.lang=en (부팅부터 완전 영어 — 패널 제목·퀘스트 포함)
  await loadApp(win);
  await sleep(1200);
  await ev(`(()=>{try{const o=JSON.parse(localStorage.getItem('nw-opts')||'{}');o.lang='en';localStorage.setItem('nw-opts',JSON.stringify(o));}catch(e){}return 1;})()`);

  for (const sc of SPEC.clips) {
    if (FILTER && !FILTER.includes(sc.id)) continue;
    const outDir = path.join(OUTROOT, sc.id);
    fs.mkdirSync(outDir, { recursive: true });
    // 정속 스테핑 (디렉터 신고 "몇 배수"): 오프스크린 캡처는 프레임당 실시간 ~0.2s가 흘러 수 배속으로 보인다.
    //   비-UI 클립은 freezeForGolden(keepEntities)+stepGolden(1/30)으로 프레임당 정확히 1/30s만 진행.
    //   UI 클립(모달 연출은 DOM 타이머 = 실시간)만 기존 실시간 루프 유지.
    const FX = !['map', 'signal', 'loot', 'expstory', 'unlockmap'].includes(sc.kind);
    // v16 60fps: FX는 stepGolden(1/FPS), UI는 CDP 가상 시간 — DOM 타이머/CSS 애니가 프레임당 정확히
    //   1000/FPS ms만 전진해 "벽시계 건너뜀 = 프레임 드랍" (디렉터 신고)이 근본 제거된다.
    let vtOn = false;
    const vtAdvance = (ms) => new Promise((res, rej) => {
      const dbg = win.webContents.debugger;
      const onMsg = (e, method) => { if (method === 'Emulation.virtualTimeBudgetExpired') { dbg.removeListener('message', onMsg); res(); } };
      dbg.on('message', onMsg);
      dbg.sendCommand('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms }).catch(rej);
    });
    const step = async (nf) => FX
      ? ev(`(()=>{window.__shelter.stepGolden(${nf},1/${FPS});return 1;})()`)
      : (vtOn ? vtAdvance(nf * 1000 / FPS) : sleep(Math.round(nf * 1000 / FPS)));
    await loadApp(win);
    let ready = false;
    for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) { ready = true; break; } await sleep(400); }
    if (!ready) { console.log('SKIP ' + sc.id + ' (부팅 실패)'); continue; }

    // showUI: FX 컷에서도 HUD 노출 (디렉터 v13: "실 가구 배치는 UI가 노출되는 플레이 영상으로")
    const hideUI = !['map', 'signal', 'loot', 'expstory', 'unlockmap'].includes(sc.kind) && !sc.showUI;
    const setup = await ev(`(()=>{try{const S=window.__shelter;
      ${FX ? 'S.freezeForGolden&&S.freezeForGolden(12345,true);' : ''}
      S.setLang&&S.setLang('en');S.applyStaticI18n&&S.applyStaticI18n();
      S.simReset&&S.simReset();S.hideTitle&&S.hideTitle();
      ${sc.winter ? 'const D=(S.BAL&&S.BAL.seasons&&S.BAL.seasons.daysPerSeason)||15;S.state.day=3*D+Math.ceil(D/2);' : ''}
      S.state.current=${JSON.stringify(sc.shelter)};S.loadShelter(${JSON.stringify(sc.shelter)});
      S.setWeather(${JSON.stringify(sc.weather)});S.setHour(${sc.hour});
      ${OPTS_JS}
      ${hideUI ? `let css=document.getElementById('shotcss')||document.createElement('style');css.id='shotcss';document.head.appendChild(css);css.textContent='body > *:not(#c):not(#fx):not(#fake-cursor){display:none!important}';` : `const oc=document.getElementById('shotcss');if(oc)oc.remove();`}
      return {ok:1,exists:!!S.SHELTERS[${JSON.stringify(sc.shelter)}]};}catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log(sc.id, 'setup:', JSON.stringify(setup));

    if (sc.kind !== 'decorate') {
      // upgrade는 크루드(T1) 배치 + 티어 대상 확장(teatable→table 스왑, chair 추가)
      const crude = sc.kind === 'upgrade';
      // 셸터별 전용 레이아웃 (sc.layout 지정 시) — 절대 좌표를 방 크기로 클램프해 배치
      const layoutJs = sc.layout && LAYOUTS[sc.layout]
        ? `const RAW=${JSON.stringify(LAYOUTS[sc.layout])};const X=R.w/2-0.4,Z=R.d/2-0.4;
           let L=RAW.map(o=>({d:o.d,x:Math.max(-X,Math.min(X,o.x)),z:Math.max(-Z,Math.min(Z,o.z)),r:o.r||0,tier:o.tier||3,c:o.c||0}));`
        : `let L=(${cozyLiving.toString()})(R.w,R.d).map(o=>({...o,c:0}));`;
      await ev(`(()=>{const S=window.__shelter;
        const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
        ${layoutJs}
        ${crude ? `L=L.filter(i=>i.d!=='teatable');const tt=(${cozyLiving.toString()})(R.w,R.d).find(i=>i.d==='teatable');L.push({d:'table',x:tt.x,z:tt.z,r:0,tier:1,c:0});L.push({d:'chair',x:tt.x+0.75,z:tt.z+0.15,r:Math.PI,tier:1,c:0});` : ''}
        for(const it of L){try{const tr=${crude ? `(S.DEFS[it.d]&&S.DEFS[it.d].tiered)?1:it.tier` : 'it.tier'};S.addItem(it.d,it.c||0,it.x,it.z,it.r,true,0,tr);}catch(e){}}
        ${sc.cat ? "try{S.state.cat=true;S.state.catCoat='tabby';S.spawnCat&&S.spawnCat();}catch(e){}" : ''}return 1;})()`); // 코트 핀: 랜덤 코트(다크마스크)가 얼굴 판독을 죽임 — 치즈 태비 고정
    }
    // lightsOff: 전 조명 소등 (콜드오픈 어둠 — 점화 전 상태를 임의 클립에서 재현)
    if (sc.lightsOff) {
      await ev(`(()=>{const S=window.__shelter;for(const it of S.items){try{S.setItemPower(it,false);}catch(e){}}return 1;})()`);
    }
    // distantLight: 폐허 저편 원거리 랜턴(소등 배치) — onFrame에 점등 (V2 컷12 응답 페이오프)
    if (sc.distantLight) {
      const dl = sc.distantLight;
      await ev(`(()=>{const S=window.__shelter;try{const it=S.addItem('lantern',0,${dl.x},${dl.z},0,false,${dl.y},3);it.userData_dl=1;S.setItemPower(it,false);}catch(e){}return 1;})()`);
    }
    // 아바타 숨김 (디렉터 신고: 배회 AI가 가구에 낌) — 가짜 탐험 상태로 avatar.js의 자체 away 숨김을 발동.
    //   sim 무접점: end가 먼 미래라 정산 안 됨, UI는 해당 클립에서 전부 숨김.
    if (sc.hideAvatar) {
      await ev(`(()=>{const S=window.__shelter;
        S.state.exp={region:'residential',end:Date.now()+9e8,dur:9e8,rate:0.8,prep:[],startGameMin:S.state.gameMin,durMin:90,bag:false};
        return 1;})()`);
    }
    await ev(`window.__shelter.setPaused&&window.__shelter.setPaused(false)`);
    // 아바타 스테이징 (디렉터 신고: 가구를 아바타 위에 놓아 소파 끼임) — 배치 후 빈 바닥으로 걸려보내고 안착.
    //   ignite는 난로 앞("방금 불 붙인 사람"), 그 외는 스펙 avatarTo 또는 기본 열린 바닥.
    if (sc.avatarTo) {
      await ev(`(()=>{const S=window.__shelter;S.avatarWalkTo&&S.avatarWalkTo(${sc.avatarTo[0]},${sc.avatarTo[1]});return 1;})()`);
      await step(50); // 도보 이동 + 정지 안착 (정속 시간)
    }
    // catAt: 고양이 지정 안착 (v11 티저 — 배회 대신 러그 위에 앉아서 프레임에 확실히).
    //   'rug'면 러그 앞왼쪽 빈 자리(티테이블 회피), [x,z]면 그 좌표. catYaw로 얼굴 방향.
    if (sc.catAt) {
      const pos = sc.catAt === 'rug'
        ? `(()=>{const r=S.items.find(i=>i.defId==='rug');return r?[r.x-0.55,r.z+0.45]:[0,0.6];})()`
        : `[${sc.catAt[0]},${sc.catAt[1]}]`;
      await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(c){const p=${pos};c.g.position.x=p[0];c.g.position.z=p[1];S.setCatMode&&S.setCatMode('sit');${sc.catYaw != null ? `c.g.rotation.y=${sc.catYaw};` : ''}}return 1;})()`);
    }
    // v12 가짜 커서 — 디렉터: "뭐하는 게임인지 모르겠다" → 동사(클릭·배치·파견) 가시화.
    //   UI 컷: path 웨이포인트(#map-wrap 기준 %) / decorate: 팝 목표 월드→스크린 투영 추적.
    //   펄스는 CSS 애니 금지(FX 정속과 어긋남) — 프레임 수 기반 수동 렌더(결정적).
    if (sc.cursor) {
      await ev(`(()=>{if(document.getElementById('fake-cursor'))return 1;
        const d=document.createElement('div');d.id='fake-cursor';
        d.style.cssText='position:fixed;left:-100px;top:-100px;width:38px;height:38px;z-index:999999;pointer-events:none;';
        d.innerHTML='<svg width="38" height="38" viewBox="0 0 24 24"><path d="M4 2 L4 19 L9 15 L12 22 L15 20.5 L12 14 L18 13.5 Z" fill="#fff" stroke="#1a1a1f" stroke-width="1.6"/></svg>'
          +'<span id="fc-pulse" style="position:absolute;left:-8px;top:-10px;width:40px;height:40px;border:3px solid #E8B87A;border-radius:50%;opacity:0;"></span>';
        document.body.appendChild(d);return 1;})()`);
    }
    // v15 라이브: 실제 배치모드 진입 (그리드+전용 툴바 — 디렉터: "인게임 배치모드 눌러서 그리드 보이게")
    if (sc.editModeOn) await ev(`window.__shelter.toggleEditMode&&window.__shelter.toggleEditMode(true)`);
    await step(21);

    if (sc.kind === 'catcloseup') {
      await step(18);
      console.log('  cat exists:', await ev(`(()=>{const S=window.__shelter;return !!(S.cat&&S.cat());})()`));
      // 앉은 포즈 고정 (디렉터 신고: 걷기 중 확대 = 모션 깨져 보임) — timer 999로 홀드
      await ev(`window.__shelter.setCatMode&&window.__shelter.setCatMode('sit')`);
      // 얼굴 보장 (인과: computeCatCloseupYaw는 현재 카메라 yaw ±45° 클램프라 facing으로 스냅하지 않는다 —
      //   game.js:148. 캡처 카메라는 고정이므로, 카메라 yaw를 명시하고 facing=yaw-yawOffset으로 두면
      //   후보1이 현재 yaw와 델타 0 → 클램프 무접촉 → 설계 그대로의 3/4 얼굴 뷰가 결정적으로 나온다.)
      const CAM_YAW = sc.closeCamYaw != null ? sc.closeCamYaw : 0.6;
      await ev(`window.__shelter.setYaw&&window.__shelter.setYaw(${CAM_YAW})`);
      await step(24); // camState.yaw 러프 수렴
      // useGameCloseup: 인게임 클릭 확대 카메라(#58 enterCatCloseup) 그대로 — 디렉터: "그게 매력인데"
      if (sc.useGameCloseup) {
        await ev(`window.__shelter.enterCatCloseup&&window.__shelter.enterCatCloseup()`);
        await step(60); // 전용 캠 글라이드 안착 (정속)
        // ── 등돌림 근본 수리 (디렉터 재신고 3회) ──────────────────────────────
        //   근본 원인: computeCatCloseupYaw(game.js)가 카메라를 현재 yaw ±45°로 클램프한다.
        //   → 추측 rotation.y(=0.6+π-off≈3.6)를 어떻게 넣어도 카메라는 yaw≈1.39에 앉아 고양이 뒤를 본다.
        //   해법: 카메라가 안착한 뒤 그 '실제 카메라 방위'를 읽어 고양이를 그쪽으로 돌린다(추측 폐기).
        //   heading=atan2(dx,dz) → forward=(sin,cos). faceCamOffset로 미세 3/4(정면 스테어링 완화).
        await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(!c)return 0;
          const cp=new S.THREE.Vector3();c.g.getWorldPosition(cp);
          const camp=new S.THREE.Vector3();S.camera.getWorldPosition(camp);
          c.g.rotation.y=Math.atan2(camp.x-cp.x,camp.z-cp.z)+${sc.faceCamOffset != null ? sc.faceCamOffset : 0.2};
          return c.g.rotation.y.toFixed(3);})()`);
        console.log('  faceCam rotY:', await ev(`(()=>{const c=window.__shelter.cat&&window.__shelter.cat();return c?c.g.rotation.y.toFixed(3):'none';})()`));
      } else {
        // 폴백(수동 팔로우)만 옛 추측 회전 사용
        await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(c)c.g.rotation.y=${CAM_YAW}+Math.PI-${sc.faceOffset != null ? sc.faceOffset : 0.14};return 1;})()`);
        await step(10);
      }
    } else if (sc.kind === 'map' || sc.kind === 'signal' || sc.kind === 'unlockmap') {
      await ev(`window.__shelter.openMapModal&&window.__shelter.openMapModal()`); await sleep(500);
      // unlockmap 명료화 기준선: 현재 마커 위치 집합 저장 — 이후 해금 스텝의 '신규' 판별용
      await ev(`(()=>{const w=document.getElementById('map-wrap');if(!w)return 0;
        window.__nwPrev=[...w.querySelectorAll('.map-pin.region,.map-shelter')].map(e=>e.style.left+'|'+e.style.top);return window.__nwPrev.length;})()`);
    } else if (sc.kind === 'ignite') {
      // 전 조명 소등 (달빛·눈만 남긴 어둠) — flameFrame에 난로만 점등
      await ev(`(()=>{const S=window.__shelter;for(const it of S.items){try{S.setItemPower(it,false);}catch(e){}}return 1;})()`);
      await step(12);
    } else if (sc.kind === 'loot') {
      // 자원·에너지 세팅 → 출발(auto) → 즉시 귀환 대기 상태로
      const r = await ev(`(async()=>{try{const S=window.__shelter;
        Object.assign(S.state.res,{fuel:30,food:24,canned:14,water:27,cloth:11,material:19,parts:11,battery:8});
        S.state.day=12;S.state.energy=100;S.updateHud&&S.updateHud();
        await S.departExpedition('residential',[],{auto:true});
        if(S.state.exp){S.finishExpNow&&S.finishExpNow();return 'departed';}
        return 'NO_EXP';}catch(e){return 'ERR '+String(e).slice(0,200);}})()`);
      console.log('  loot depart:', r);
      await sleep(400);
    } else if (sc.kind === 'expstory') {
      // 원테이크 탐험 UI: 자원 세팅 + 지도 열고 시작 — 이후 액션은 캡처 루프의 프레임 트리거
      await ev(`(()=>{const S=window.__shelter;
        Object.assign(S.state.res,{fuel:30,food:24,canned:14,water:27,cloth:11,material:19,parts:11,battery:8});
        S.state.day=12;S.state.energy=100;S.updateHud&&S.updateHud();
        S.openMapModal&&S.openMapModal();return 1;})()`);
      await sleep(500);
    }

    // popList: 클립 전용 팝 목록 (예: 파밍 전리품 축음기부터) — 절대 좌표, 방 크기 클램프
    const decoItems = sc.kind === 'decorate'
      ? (sc.popList
        ? await ev(`(()=>{const S=window.__shelter;const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
            const X=R.w/2-0.4,Z=R.d/2-0.4;
            return ${JSON.stringify(sc.popList)}.map(o=>({d:o.d,x:Math.max(-X,Math.min(X,o.x)),z:Math.max(-Z,Math.min(Z,o.z)),r:o.r||0,tier:o.tier||3}));})()`)
        : await ev(`(()=>{const S=window.__shelter;const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};return (${cozyLiving.toString()})(R.w,R.d);})()`))
      : null;
    // UI 클립: 셋업(실시간 모달 대기)이 끝난 지금부터 가상 시간으로 전환 — 캡처 루프만 결정적 전진
    if (!FX) {
      try { win.webContents.debugger.attach('1.3'); vtOn = true; } catch (e) { console.log('  vt attach 실패(실시간 폴백):', String(e).slice(0, 80)); }
    }
    let decoAdded = 0, curClickF = -99;
    for (let f = 0; f < sc.frames; f++) {
      const t = sc.frames > 1 ? f / (sc.frames - 1) : 0;
      // decorate: 비트 프레임 도달 시 다음 가구 배치 (틱 = 가구)
      if (sc.kind === 'decorate' && sc.beatFrames) {
        while (decoAdded < decoItems.length && decoAdded < sc.beatFrames.length && f >= sc.beatFrames[decoAdded]) {
          const it = decoItems[decoAdded++];
          // crudeTiers: 티어 가구는 T1(크루드)로 놓는다 — 게임 초반의 진짜 모습 (upgrade 슬라이스가 이어받음)
          const tierExpr = sc.crudeTiers
            ? `(window.__shelter.DEFS[${JSON.stringify(it.d)}]&&window.__shelter.DEFS[${JSON.stringify(it.d)}].tiered)?1:${it.tier}`
            : String(it.tier);
          await ev(`(()=>{window.__shelter.addItem(${JSON.stringify(it.d)},0,${it.x},${it.z},${it.r},true,0,${tierExpr});return 1;})()`);
        }
        // morphAllFrame: 팝이 끝난 뒤 한 박자에 크루드 전부 → T3 일괄 모핑 (살림이 '자란다')
        if (sc.morphAllFrame != null && f === sc.morphAllFrame) {
          await ev(`(()=>{const S=window.__shelter;
            const targets=S.items.filter(i=>S.DEFS[i.defId]&&S.DEFS[i.defId].tiered).map(i=>({d:i.defId,c:i.colorIdx,x:i.x,z:i.z,r:i.rot,y:i.y}));
            for(const i of S.items.slice()){if(S.DEFS[i.defId]&&S.DEFS[i.defId].tiered)try{S.removeItem(i);}catch(e){}}
            for(const o of targets){try{S.addItem(o.d,o.c,o.x,o.z,o.r,true,o.y,3);}catch(e){}}
            return targets.length;})()`);
        }
      }
      // seasonFrames: 비트마다 계절 전환 (커뮤니티 피드백 — "노래 박자에 맞게 계절 변화 주면서 훅").
      //   state.day 점프 + 날씨 — 팔레트/하늘은 프레임 계산이라 즉시, 식생 지오는 loadShelter 재호출로 갱신.
      if (sc.seasonFrames) {
        const sf = sc.seasonFrames.find(s => s.f === f);
        if (sf) {
          await ev(`(()=>{const S=window.__shelter;const D=(S.BAL&&S.BAL.seasons&&S.BAL.seasons.daysPerSeason)||15;
            S.state.day=${sf.season}*D+Math.ceil(D/2);
            ${sf.weather ? `S.setWeather(${JSON.stringify(sf.weather)});` : ''}
            ${sf.hour != null ? `S.setHour(${sf.hour});` : ''}return S.state.day;})()`);
        }
      }
      // v15 랜덤 인카운터 재현 (디렉터: "랜덤 인카운터도 한개 나오게") — 실제 이벤트 카드 UI
      if (sc.eventFrame != null && f === sc.eventFrame) {
        await ev(`window.__shelter.showEvent&&window.__shelter.showEvent(${JSON.stringify(sc.eventId || 'trader')})`);
      }
      // distantLight 점등 (V2 컷12): 어둠 저편 창 하나가 켜진다 — 응답의 첫 신호
      if (sc.distantLight && f === sc.distantLight.onFrame) {
        await ev(`(()=>{const S=window.__shelter;const it=S.items.find(i=>i.defId==='lantern'&&Math.abs(i.x)>4);if(it)S.setItemPower(it,true);return !!it;})()`);
      }
      // avatarWalkFrame: 캡처 중 지정 프레임에 아바타를 걷게 한다 (아침 출발 — 걷는 모습이 화면에 담기게)
      if (sc.avatarWalkFrame && f === sc.avatarWalkFrame[0]) {
        await ev(`(()=>{const S=window.__shelter;S.avatarWalkTo&&S.avatarWalkTo(${sc.avatarWalkFrame[1]},${sc.avatarWalkFrame[2]});return 1;})()`);
      }
      // 아바타 핀 (디렉터 신고: 배회 AI가 가구 사이에 낌) — 12프레임마다 같은 좌표 재도보 = 제자리 고정
      if (sc.avatarTo && FX && f % 12 === 0 && (!sc.avatarWalkFrame || f < sc.avatarWalkFrame[0])) {
        await ev(`(()=>{const S=window.__shelter;S.avatarWalkTo&&S.avatarWalkTo(${sc.avatarTo[0]},${sc.avatarTo[1]});return 1;})()`);
      }
      if (sc.kind === 'catcloseup') {
        if (!sc.useGameCloseup) { // 수동 팔로우 (폴백)
          const yaw = 0.5 + 0.32 * ease(t), zoom = lerp(2.0, 2.5, t);
          await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(c){const v=new S.THREE.Vector3();c.g.getWorldPosition(v);S.setPan(v.x,v.z);}S.setZoom(${zoom});S.setPitch(0.34);S.setYaw(${yaw});return 1;})()`);
        } else {
          // useGameCloseup: 전용 캠이 카메라 소유 — 매 프레임 고양이를 실제 카메라 방위로 재고정
          //   (sit 재롤·미세 드리프트 무력화). 카메라 안착 후라 값은 상수 → 흔들림 0.
          await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(!c)return 0;
            const cp=new S.THREE.Vector3();c.g.getWorldPosition(cp);
            const camp=new S.THREE.Vector3();S.camera.getWorldPosition(camp);
            c.g.rotation.y=Math.atan2(camp.x-cp.x,camp.z-cp.z)+${sc.faceCamOffset != null ? sc.faceCamOffset : 0.2};return 1;})()`);
        }
        if (f === Math.floor(sc.frames * 0.32)) await ev(`window.__shelter.petCat&&window.__shelter.petCat()`);
      } else if (sc.kind === 'ignite') {
        // 불꽃 프레임: 난로 점등. 카메라: 불꽃+12f까지 난로 타이트 홀드 → 방 전경으로 이즈아웃.
        if (f === sc.flameFrame) await ev(`(()=>{const S=window.__shelter;const it=S.items.find(i=>i.defId==='stove');if(it)S.setItemPower(it,true);return 1;})()`);
        const c = sc.camOut, hold = sc.flameFrame + 12;
        const k = f <= hold ? 0 : ease(Math.min(1, (f - hold) / Math.max(1, sc.frames - 1 - hold)));
        const zoom = lerp(c.z0, c.z1, k), px = lerp(sc.stovePan.x, c.px1, k), pz = lerp(sc.stovePan.z, c.pz1, k);
        await ev(`(()=>{const S=window.__shelter;S.setYaw(${c.yaw});S.setPitch(${lerp(c.pit, c.pit + 0.02, k)});S.setZoom(${zoom});S.setPan(${px},${pz});return 1;})()`);
      } else if (sc.kind === 'loot') {
        if (f === sc.resolveFrame) { const rr = await ev(`(()=>{try{window.__shelter.resolveExpedition();return 'ok';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`); console.log('  resolve@f' + f + ':', rr); }
      } else if (sc.kind === 'expstory') {
        // 지도(열림) → 지역 정보 → 준비 모달(성공률) → 출발(패널·토스트) → 귀환 → 정산 개봉
        if (f === sc.infoFrame) console.log('  info@f' + f + ':', await ev(`(()=>{try{window.__shelter.showMapInfo('residential');return 'ok';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`));
        if (f === sc.prepFrame) console.log('  prep@f' + f + ':', await ev(`(()=>{try{window.__shelter.startExpedition('residential');return 'ok';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`));
        if (f === sc.departFrame) console.log('  depart@f' + f + ':', await ev(`(async()=>{try{const S=window.__shelter;await S.departExpedition('residential',[],{auto:true});return S.state.exp?'departed':'NO_EXP';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`));
        if (f === sc.finishFrame) await ev(`(()=>{window.__shelter.finishExpNow&&window.__shelter.finishExpNow();return 1;})()`);
        if (f === sc.resolveFrame) console.log('  resolve@f' + f + ':', await ev(`(()=>{try{window.__shelter.resolveExpedition();return 'ok';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`));
      } else if (sc.kind === 'daynight') {
        // 낮→밤 라이팅 스윕 + 느린 궤도 (Terra Nil 변신 × Cloud Gardens 디오라마)
        const hr = sc.hourFrom + (sc.hourTo - sc.hourFrom) * t;
        const c = sc.cam, e2 = ease(t);
        await ev(`(()=>{const S=window.__shelter;S.setHour(${hr});S.setYaw(${lerp(c.yaw0, c.yaw1, e2)});S.setPitch(${lerp(c.pit0, c.pit1, e2)});S.setZoom(${lerp(c.z0, c.z1, e2)});S.setPan(${lerp(c.px0, c.px1, e2)},${c.pz});return 1;})()`);
      } else if (sc.kind === 'upgrade') {
        // 스테이지 프레임에 티어 가구 전부 모핑 (T2 → T3): 스냅샷 후 remove+add
        const st = sc.stageFrames.indexOf(f);
        if (st >= 0) {
          await ev(`(()=>{const S=window.__shelter;const tier=${st + 2};
            const targets=S.items.filter(i=>S.DEFS[i.defId]&&S.DEFS[i.defId].tiered).map(i=>({d:i.defId,c:i.colorIdx,x:i.x,z:i.z,r:i.rot,y:i.y}));
            for(const i of S.items.slice()){if(S.DEFS[i.defId]&&S.DEFS[i.defId].tiered)try{S.removeItem(i);}catch(e){}}
            for(const o of targets){try{S.addItem(o.d,o.c,o.x,o.z,o.r,true,o.y,tier);}catch(e){}}
            return targets.length;})()`);
        }
        if (sc.cam) { const c = sc.cam, e2 = ease(t);
          await ev(`(()=>{const S=window.__shelter;S.setYaw(${lerp(c.yaw0, c.yaw1, e2)});S.setPitch(${lerp(c.pit0, c.pit1, e2)});S.setZoom(${lerp(c.z0, c.z1, e2)});S.setPan(${lerp(c.px0, c.px1, e2)},${c.pz});return 1;})()`);
        }
      } else if (sc.cam) {
        const c = sc.cam, e2 = ease(t);
        await ev(`(()=>{const S=window.__shelter;S.setYaw(${lerp(c.yaw0, c.yaw1, e2)});S.setPitch(${lerp(c.pit0, c.pit1, e2)});S.setZoom(${lerp(c.z0, c.z1, e2)});S.setPan(${lerp(c.px0, c.px1, e2)},${c.pz});return 1;})()`);
      }
      // v21 unlockmap: base 코어 로케이션만 비트마다 하나씩 등장(이름표+골드 펄스). 지하철·1.1~1.4·생존자불빛은 영구 숨김.
      //   디렉터: "지하철·1.1~1.4 지우고 하나 하나 장소가 나타나는 느낌으로 — 슥슥 지나가면 뭐가 뭔가 싶다".
      //   reveal 순서는 스펙 주입([{type:'region'|'shelter', id|ids}]). 마커 식별은 game.js data-rid/data-sid.
      if (sc.kind === 'unlockmap' && sc.reveal && sc.unlockFrames) {
        if (f === 0) { // 최초: 전 base 마커가 DOM에 존재하도록 열고 → 전부 숨김 + 확장/생존자불빛 정리 + 지도맵랩 rect 로깅
          const r = await ev(`(()=>{const S=window.__shelter;S.state.successes=290;S.openMapModal&&S.openMapModal();
            const w=document.getElementById('map-wrap');if(!w)return null;
            w.querySelectorAll('.map-pin.region,.map-shelter').forEach(e=>{e.style.visibility='hidden';e.style.transition='none';});
            w.querySelectorAll('.map-light').forEach(e=>e.remove());
            const info=document.getElementById('map-info');if(info)info.textContent='';
            const b=w.getBoundingClientRect();return {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};})()`);
          if (r) { console.log('  map-wrap rect:', JSON.stringify(r)); fs.writeFileSync(path.join(OUTROOT, sc.id + '_maprect.json'), JSON.stringify(r)); }
        }
        const idx = sc.unlockFrames.indexOf(f);
        if (idx >= 0 && sc.reveal[idx]) {
          const st = sc.reveal[idx];
          const ids = JSON.stringify(st.ids || [st.id]);
          const attr = st.type === 'region' ? 'rid' : 'sid';
          const isRegion = st.type === 'region';
          await ev(`(()=>{const w=document.getElementById('map-wrap');if(!w)return 0;
            w.querySelectorAll('.map-pin,.map-shelter').forEach(e=>{e.style.outline='';}); // 직전 강조 정리(최신 것만 글로우)
            const ids=${ids};const els=ids.map(id=>w.querySelector('[data-${attr}="'+id+'"]')).filter(Boolean);
            els.forEach(e=>{e.style.visibility='visible';
              e.style.outline='3px solid #E8B87A';e.style.outlineOffset='3px';e.style.zIndex='99';e.style.borderRadius='10px';
              if(e.animate)e.animate([{transform:'scale(2.2)',opacity:0.15},{transform:'scale(1)',opacity:1}],{duration:420,easing:'ease-out'});});
            ${isRegion ? `const nm=els[0]&&els[0].querySelector('.pin-name');const info=document.getElementById('map-info');if(info&&nm)info.textContent=nm.textContent;` : ''}
            return els.length;})()`);
        }
      }
      // signal: 비트 프레임 누적 개수만큼 불빛 점등 (비트마다 창문 하나가 응답)
      if (sc.kind === 'signal' && sc.lightFrames) {
        const lit = sc.lightFrames.filter(ff => ff <= f).length;
        await ev(`(()=>{const w=document.getElementById('map-wrap');if(!w)return 0;
          w.querySelectorAll('.map-light').forEach(e=>e.remove());
          const spots=[[63,40],[71,26],[52,64],[40,23],[26,55],[46,50],[58,72],[80,48],[34,42],[22,70],[68,60],[15,34]];
          for(let i=0;i<Math.min(${lit},spots.length);i++){const d=document.createElement('div');d.className='map-light';d.style.left=spots[i][0]+'%';d.style.top=spots[i][1]+'%';w.appendChild(d);}
          return ${lit};})()`);
      }
      // ── 가짜 커서 프레임 구동 (모든 kind 공용 — 팝/클릭보다 뒤, 캡처보다 앞) ──
      if (sc.cursor) {
        if (sc.cursor.path) {
          const P = sc.cursor.path;
          let a = P[0], b = P[P.length - 1];
          for (let i = 0; i < P.length - 1; i++) if (f >= P[i].f && f <= P[i + 1].f) { a = P[i]; b = P[i + 1]; break; }
          if (f < P[0].f) { a = P[0]; b = P[0]; }
          const k = b.f > a.f ? ease(Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f)))) : 1;
          const wx = lerp(a.wx != null ? a.wx : b.wx, b.wx != null ? b.wx : a.wx, k);
          const wy = lerp(a.wy != null ? a.wy : b.wy, b.wy != null ? b.wy : a.wy, k);
          const cp = P.find(p => p.click && p.f === f);
          if (cp) curClickF = f;
          const pk = Math.min(1, Math.max(0, (f - curClickF) / 11)); // 펄스 11f 수동 전개
          await ev(`(()=>{const d=document.getElementById('fake-cursor');if(!d)return 0;
            const w=document.getElementById('map-wrap');const r=w?w.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight};
            d.style.left=(r.left+r.width*${wx}/100)+'px';d.style.top=(r.top+r.height*${wy}/100)+'px';
            const p=d.querySelector('#fc-pulse');p.style.transform='scale(${(0.4 + 1.3 * pk).toFixed(3)})';p.style.opacity='${(pk >= 1 ? 0 : 0.95 * (1 - pk)).toFixed(3)}';
            ${cp && cp.pin ? `const pins=[...document.querySelectorAll('#map-wrap .map-pin.region')];
              const el=pins.find(e=>Math.abs(parseFloat(e.style.left)-${cp.pin[0]})<4&&Math.abs(parseFloat(e.style.top)-${cp.pin[1]})<4);
              if(el){el.style.outline='3px solid #E8B87A';el.style.outlineOffset='2px';}` : ''}
            return 1;})()`);
        } else if (sc.cursor.followPops && sc.kind === 'decorate' && decoItems) {
          const tgt = decoItems[Math.min(decoAdded, decoItems.length - 1)];
          if (sc.beatFrames && sc.beatFrames.includes(f)) curClickF = f;
          if (sc.morphAllFrame != null && f === sc.morphAllFrame) curClickF = f;
          const pk = Math.min(1, Math.max(0, (f - curClickF) / 11));
          await ev(`(()=>{const S=window.__shelter;const d=document.getElementById('fake-cursor');if(!d)return 0;
            const v=new S.THREE.Vector3(${tgt.x},0.42,${tgt.z}).project(S.camera);
            const tx=(v.x*0.5+0.5)*innerWidth, ty=(-v.y*0.5+0.5)*innerHeight;
            const cx=parseFloat(d.style.left), cy=parseFloat(d.style.top);
            d.style.left=((isNaN(cx)?tx:cx)+(tx-(isNaN(cx)?tx:cx))*0.24)+'px';
            d.style.top=((isNaN(cy)?ty:cy)+(ty-(isNaN(cy)?ty:cy))*0.24)+'px';
            const p=d.querySelector('#fc-pulse');p.style.transform='scale(${(0.4 + 1.3 * pk).toFixed(3)})';p.style.opacity='${(pk >= 1 ? 0 : 0.95 * (1 - pk)).toFixed(3)}';
            return 1;})()`);
        }
      }
      await step(1); // 정속: 프레임당 정확히 1/FPS (FX=stepGolden, UI=가상 시간)
      const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
      const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
      fs.writeFileSync(path.join(outDir, 'f' + String(f).padStart(4, '0') + '.png'), PNG.sync.write(png));
    }
    console.log('CLIP_DONE ' + sc.id + ' frames=' + sc.frames);
    // 가상 시간 클립 뒤엔 윈도우 재생성 — 멈춘 가상 시계가 다음 클립 로드를 얼려 배치 전체가 행됨(실측 c6_event 0f)
    if (vtOn) { try { win.destroy(); } catch (e) { /* */ } win = makeWin(); }
  }
  console.log('ALL_DONE');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('예외:', e); app.quit(); process.exit(1); });
