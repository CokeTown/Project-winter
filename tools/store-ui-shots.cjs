// 스토어 스크린샷 v5 — UI 컷 3장 (Search/Build/Decorate). 신 UI(관측 단말 CRT·제작 아이콘화·배치 도색 미리보기)가 피사체.
//   씬은 옥탑 코지 데코(capsule-shots cozy 재사용) 위에 실제 유저 경로(버튼 클릭)로 UI를 연다.
//   실행: npx electron tools/store-ui-shots.cjs   → docs/steam/shots/v5/ui_*.png (1920×1080)
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const OUT = path.resolve(__dirname, '..', 'docs', 'steam', 'shots', 'v5');
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: 1920, height: 1080 }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
    console.log('WROTE ' + name);
  };
  // 공통 씬: 옥탑 노을 코지 (진행감 있는 상태값 — 스토어 컷은 Day 24 중반부 느낌)
  const setup = await H.evalJs(`(async()=>{
    const S=window.__shelter;
    S.setLang&&S.setLang('en'); S.applyStaticI18n&&S.applyStaticI18n(); // 스토어 컷은 영어(디렉터 오더) — 리셋 전에 걸어야 동적 텍스트(할일·팁)까지 en 생성
    S.simReset(); if(S.hideTitle)S.hideTitle(); S.setPaused&&S.setPaused(true);
    S.applyStaticI18n&&S.applyStaticI18n();
    S.state.cat=true; // loadShelter 전 세팅이라야 스폰(캡슐5 규약)
    S.state.current='rooftop'; S.loadShelter('rooftop');
    await new Promise(r=>setTimeout(r,700));
    S.setWeather('clear'); S.setHour(16);
    S.state.day=24; S.state.res.food=14; S.state.res.water=11; S.state.res.fuel=8; S.state.res.material=17; S.state.res.parts=6;
    const cozy=(w,d)=>{const X=w/2,Z=d/2;const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
      const cx=Math.min(-X+2.5,-0.3),cz=Math.min(-Z+2.0,-0.3);const P=(x,z)=>({x:cl(cx+x,-X+0.4,X-0.4),z:cl(cz+z,-Z+0.4,Z-0.4)});
      const it=(dd,x,z,r)=>({d:dd,...P(x,z),r:r||0});
      return {pan:{x:cx,z:cz},items:[it('bed',-1.4,-0.9),it('bookshelf',0.1,-1.6),it('sofa',1.5,-0.6),
        it('rug',0,1.0),it('teatable',0,1.0),it('cushion',-1.1,1.0),it('stove',1.9,-1.5),it('plant',-1.8,1.3),it('lamp',1.7,0.7)]};};
    const R=(S.SHELTERS&&S.SHELTERS.rooftop&&S.SHELTERS.rooftop.room)||{w:5.6,d:4.4};
    const L=cozy(R.w,R.d);
    for(const it of L.items){try{S.addItem(it.d,0,it.x,it.z,it.r||0,true,0,3);}catch(e){}}
    try{S.state.cat=true;S.spawnCat&&S.spawnCat();}catch(e){}
    S.clearGroundDrops&&S.clearGroundDrops();
    if(L.pan&&S.setPan)S.setPan(L.pan.x,L.pan.z);
    S.setYaw&&S.setYaw(0.62);S.setPitch&&S.setPitch(0.50);S.setZoom&&S.setZoom(1.35);
    for(let k=0;k<16;k++){S.clearGroundDrops&&S.clearGroundDrops();S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,25));}
    const its=S.items||[];const tt=its.find(i=>i.defId==='teatable');
    const rg=its.find(i=>i.defId==='rug');
    if(rg&&S.qaPlaceCat)S.qaPlaceCat(rg.x-0.55,rg.z+0.55,'sprawl'); // 러그 앞 빈 바닥(방석/가구 위는 y 파묻힘·소파 뒤는 사각)
    const g=S.avatarSys&&S.avatarSys.getGroup&&S.avatarSys.getGroup();
    if(g&&tt){g.position.x=tt.x-0.55;g.position.z=tt.z+0.35;g.rotation.y=-0.5;}
    for(let k=0;k<3;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,25));}
    return 'OK';})()`);
  console.log('SETUP ' + JSON.stringify(setup));
  // 토스트는 스토어 컷 오염원 — 전 컷 억제. PDA 앱은 paused 중 차단이므로 언포즈로 진행(시계는 컷마다 재고정).
  // 부팅 시 ko로 1회 생성돼 setLang이 못 미치는 것들: 할일 카드·종이 팁은 숨김(Day 24 컷에 Day 1 튜토리얼은 모순), 시계 헤더는 텍스트 교체.
  await H.evalJs(`(()=>{const c=document.createElement('style');c.id='noToast';c.textContent='#toast,#quest-card,#tip-note{display:none!important}';document.head.appendChild(c);
    for(const p of document.querySelectorAll('.panel')){const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let n;
      while(n=w.nextNode()){n.textContent=n.textContent.replace('시계','Clock').replace('거점','Base');}}
    const S=window.__shelter;S.setPaused&&S.setPaused(false);S.setHour(16);return 1;})()`);
  await sleep(400); // pause 배지 소멸 대기

  // ① Search — 관측 단말 focus 뷰(지역 근접 + 준비물 시트 = 실제 "탐험 보내기" 순간)
  await H.evalJs(`(()=>{document.getElementById('btn-exp').click();return 1;})()`);
  await sleep(2200); // 스캔인 + CRT 정착
  const foc = await H.evalJs(`(()=>{const rows=[...document.querySelectorAll('.obs-region')];const row=rows.find(r=>r.dataset.rid==='commercial')||rows[0];if(row){row.click();return row.dataset.rid;}return null;})()`);
  console.log('FOCUS ' + JSON.stringify(foc));
  await H.evalJs(`(()=>{const S=window.__shelter;S.setAerialHour&&S.setAerialHour(12);return 1;})()`); // 돌리 줌 전에 시간 고정
  await sleep(2400); // 돌리 줌 + 정보 패널
  await H.evalJs(`(async()=>{const S=window.__shelter;for(let k=0;k<8;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}return 1;})()`);
  await shot('ui_01_search-terminal.png');

  // 관측 닫기(#obs-exit) → ② Build — 제작 (btn-craft → PDA 제작 앱)
  await H.evalJs(`(()=>{const b=document.getElementById('obs-exit');if(b)b.click();return !!b;})()`);
  await sleep(800);
  const craft = await H.evalJs(`(()=>{const S=window.__shelter;S.setHour(16);document.getElementById('btn-craft').click();return document.body.classList.contains('pda-app');})()`);
  await sleep(2000); // PDA 부팅 + 스캔인
  console.log('CRAFT pda-app=' + JSON.stringify(craft));
  await shot('ui_02_build-craft.png');

  // PDA 닫기(DOM 직접 — Escape 이벤트는 리스너 조건에 안 닿음) → ③ Decorate — 배치 모드 + 램프 선택(도색 미리보기 패널)
  await H.evalJs(`(()=>{const mb=document.getElementById('modal-back');mb.classList.remove('show');document.body.appendChild(mb);
    const pb=document.getElementById('pda-back');if(pb)pb.style.display='none';
    document.body.classList.remove('pda-on','pda-app');return 1;})()`);
  await sleep(700);
  const dec = await H.evalJs(`(async()=>{const S=window.__shelter; await new Promise(r=>setTimeout(r,300));
    S.state.lightGels=true; S.state.paints={charcoal:2,ashgray:1,whitewash:2};
    const tb=document.getElementById('btn-build')||document.getElementById('btn-place');
    if(tb)tb.click(); await new Promise(r=>setTimeout(r,500));
    const lamp=(S.items||[]).find(i=>i.defId==='lamp');
    if(lamp&&S.select){S.select(lamp);} await new Promise(r=>setTimeout(r,600));
    for(let k=0;k<4;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}
    return {panel:!!document.querySelector('#sel-panel.show,#sel-panel[style*="block"]')||getComputedStyle(document.getElementById('sel-panel')).display!=='none'};})()`);
  console.log('DECOR ' + JSON.stringify(dec));
  await shot('ui_03_decorate-paint.png');

  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
