// 「마지막 불빛」 레퍼런스 재현 디오라마 — 디렉터 첨부 픽셀아트를 인게임 에셋으로 그대로 모델링.
// 씬 전체를 홀더로 숨기고 전용 디오라마 주입. 게임 포스트(픽셀화+디더)는 유지. 고양이=실제 복셀 에셋 재사용.
// 배경 타워는 전부 소등(디렉터: "뒤에 불 보이는거 빼고").
const { app, BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path'), os = require('os');
const { createRequire } = require('module');
const { PNG } = createRequire('G:/Project_winter/package.json')('pngjs');
const URL = process.env.CAP_URL || 'http://localhost:8420';
const OUT = 'C:/Users/mhdmj/AppData/Local/Temp/claude/G--Project-winter/2040f2ba-d833-4d87-93d4-93190ac461b9/scratchpad';
const TAG = process.env.TAG || 'd1';
const W = 1920, HGT = 1080;
const P = {
  px: +(process.env.PX || 2),
  cine: (process.env.CINE || '3.4,3.3,13.2,-0.55,2.35,-0.6,26').split(',').map(Number), // lookY 상향=하늘 열기(초승달 자리)
  warm: +(process.env.WARM || 9),
};
const bgra2rgba = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-dio-' + process.pid));
  setTimeout(() => { console.log('WATCHDOG'); app.quit(); process.exit(7); }, 150000);
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true } });
  win.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);
  await win.loadURL(URL);
  let ok = false;
  for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter&&window.__shelter.cineOn)`).catch(() => false)) { ok = true; break; } await sleep(400); }
  if (!ok) { console.log('부팅 실패'); app.quit(); process.exit(2); }

  const r = await ev(`(async()=>{try{const S=window.__shelter,T=S.THREE,P=${JSON.stringify(P)};
    S.setLang&&S.setLang('en');
    S.opts.reduceMotion=true;S.opts.lowSpec=false;S.opts.pixel=P.px;S.opts.ditherAmt=0;S.opts.aa=true;S.applyOpts&&S.applyOpts(); // 디더(점) OFF — 디렉터 오더
    S.state.current='rooftop';S.loadShelter('rooftop');S.setWeather('clear');S.setHour(23);
    const scene=S.qaScene();
    // ── 기존 씬 전부 숨김(홀더: 부모 visible=false가 자식 강제 visible보다 우선) ──
    const holder=new T.Group();holder.name='__dioHidden';holder.visible=false;
    for(const c of scene.children.slice())holder.add(c);
    scene.add(holder);
    if(scene.fog){scene.fog.near=800;scene.fog.far=2000;}
    // ── 디오라마 루트 ──
    const R=new T.Group();R.name='__diorama';scene.add(R);
    let seed=4242;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
    const lam=c=>new T.MeshLambertMaterial({color:c,fog:false});
    const bas=c=>new T.MeshBasicMaterial({color:c,fog:false});
    const B=(g,w,h,d,c,x,y,z,mat)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat||lam(c));m.position.set(x,y,z);g.add(m);return m;};
    // ── 텍스처 헬퍼(퀄업) — 별도 rng로 레이아웃 시드 불변 ──
    let seed2=13579;const rnd2=()=>{seed2=(seed2*1103515245+12345)&0x7fffffff;return seed2/0x7fffffff;};
    const cl255=v=>Math.max(0,Math.min(255,Math.round(v)));
    const NF=t=>{t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.wrapS=t.wrapT=T.RepeatWrapping;return t;};
    const rgbS=(hex,f)=>{const c=new T.Color(hex);return 'rgb('+cl255(c.r*255*f)+','+cl255(c.g*255*f)+','+cl255(c.b*255*f)+')';};
    function grainMat(hex,vr,cell){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');
      const col=new T.Color(hex);const cs=cell||2;
      for(let y=0;y<64;y+=cs)for(let x=0;x<64;x+=cs){const n=1+(rnd2()-0.5)*vr;
        g.fillStyle='rgb('+cl255(col.r*255*n)+','+cl255(col.g*255*n)+','+cl255(col.b*255*n)+')';g.fillRect(x,y,cs,cs);}
      return new T.MeshLambertMaterial({map:NF(new T.CanvasTexture(c)),fog:false});}
    function plankMat(hex,vertical){const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');
      const col=new T.Color(hex);
      for(let x=0;x<64;x++)for(let y=0;y<64;y++){const p=vertical?x:y;const edge=(p%16<1)?-0.3:((p%16>14)?-0.18:0);
        const n=1+(rnd2()-0.5)*0.18+edge;
        g.fillStyle='rgb('+cl255(col.r*255*n)+','+cl255(col.g*255*n)+','+cl255(col.b*255*n)+')';g.fillRect(x,y,1,1);}
      return new T.MeshLambertMaterial({map:NF(new T.CanvasTexture(c)),fog:false});}
    function towerTex(wallHex){const c=document.createElement('canvas');c.width=48;c.height=96;const g=c.getContext('2d');
      g.fillStyle=rgbS(wallHex,0.75);g.fillRect(0,0,48,96);
      for(let i=0;i<12;i++){g.fillStyle='rgba(0,0,0,'+(0.2+rnd2()*0.2).toFixed(2)+')';g.fillRect((rnd2()*48)|0,0,1+(rnd2()*2|0),96);} // 그라임 세로줄
      for(let gy=4;gy<90;gy+=7)for(let gx=3;gx<44;gx+=6){const r=rnd2(); // 죽은 창 그리드(전부 소등·벽보다 어둡게만)
        g.fillStyle=r<0.2?'#000102':rgbS(wallHex,0.32);g.fillRect(gx,gy,3,4);}
      return NF(new T.CanvasTexture(c));}
    const brickMats=[0,1,2,3].map(i=>grainMat(0x2c2f35+i*0x030304,0.12,2)); // 뉴트럴 스톤
    const snowA=grainMat(0x565a60,0.1,2),snowB=grainMat(0x46494f,0.1,2),snowC=grainMat(0x5a5e64,0.1,2); // 무채 스노우
    const snowD=grainMat(0x1c1e22,0.1,2),snowE=grainMat(0x15171a,0.1,2);
    const concM=grainMat(0x040404,0.16,3),tarpM=grainMat(0x221f14,0.22,1),tarpM2=grainMat(0x1a1810,0.22,1);
    // ── 라이팅 ──
    R.add(new T.HemisphereLight(0x9aa0ab,0x0a0a0a,0.36)); // 셸터 실루엣 가독선
    const moon=new T.DirectionalLight(0xb9babd,0.24);moon.position.set(-18,16,-52);R.add(moon); // 초승달 림 — 실루엣 보이는 최소
    const warm=new T.PointLight(0xffa04a,P.warm*1.25,3.1,2);warm.position.set(0.5,1.58,-1.62);R.add(warm); // dist 컷=벽 관통 블리드 방지 + decay2=감쇠 링 완화
    const backL=new T.PointLight(0xffa04a,5.5,2.1,1.7);backL.position.set(-0.7,1.38,-1.75);R.add(backL); // 생존자 뒤 백라이트
    const spill=new T.PointLight(0xff9a44,1.6,3,1.9);spill.position.set(0.25,1.2,0.7);R.add(spill);
    // ── 하늘 그라디언트(포스트 감마 보정 고려: 어둡게) ──
    const cv=document.createElement('canvas');cv.width=64;cv.height=256;const cx2=cv.getContext('2d');
    const gr=cx2.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#000001');gr.addColorStop(0.72,'#000001');gr.addColorStop(0.92,'#010102');gr.addColorStop(1,'#010103'); // 뉴트럴 근흑(양자화 초록쏠림 회피)
    cx2.fillStyle=gr;cx2.fillRect(0,0,64,256);
    const sky=new T.Mesh(new T.PlaneGeometry(340,150),new T.MeshBasicMaterial({map:new T.CanvasTexture(cv),fog:false,depthWrite:false}));
    sky.position.set(0,26,-96);R.add(sky);
    // ── 초승달(유일 천체 — 별 없음) ──
    const mc=document.createElement('canvas');mc.width=64;mc.height=64;const mg=mc.getContext('2d');
    mg.fillStyle='rgba(120,145,190,0.1)';mg.beginPath();mg.arc(32,32,13,0,6.3);mg.fill(); // 헤일로=한 단만(밴딩 방지)
    mg.fillStyle='#b8c8e4';mg.beginPath();mg.arc(32,32,10,0,6.3);mg.fill();
    mg.globalCompositeOperation='destination-out';mg.beginPath();mg.arc(37.5,29,9.2,0,6.3);mg.fill();
    mg.globalCompositeOperation='source-over';
    const cres=new T.Mesh(new T.PlaneGeometry(7,7),new T.MeshBasicMaterial({map:new T.CanvasTexture(mc),transparent:true,depthWrite:false,fog:false}));
    cres.position.set(-21,17.5,-90);R.add(cres);
    // ── 눈발 — 별처럼 안 읽히게: 어둡고 낮게(타워 실루엣 앞), 하늘 상공 배제 ──
    for(let i=0;i<300;i++){const s=0.04+rnd()*0.08;
      B(R,s,s,s,0,-46+rnd()*92,-1+rnd()*15,-44+rnd()*46,bas(rnd()>0.7?0x121419:0x0e1015));}
    // ── 배경 죽은 도시(전부 소등) 2겹 ──
    // ── 멸망 타워(고도화): 죽은 창 그리드 파사드 + 무너진 계단상단 + 철근 + 붕괴 물림 + 급수탱크 + 기울기 ──
    const tones=[0x000001,0x010101,0x010102,0x000102]; // 무채 흑 실루엣
    function tower(x,z,w,h,d,far){
      const wallHex=far?0x000001:tones[(rnd()*4)|0];const g=new T.Group();
      const body=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial({color:wallHex,fog:false})); // 유리(창) 없음 — 순수 실루엣
      body.position.set(0,h/2,0);g.add(body);
      const jn=1+(rnd()*3|0); // 무너진 상단: 계단식 어깨
      for(let i=0;i<jn;i++){const jw=w*(0.25+rnd()*0.4);
        B(g,jw,0.5+rnd()*1.3,d*(0.5+rnd()*0.45),0,(rnd()-0.5)*(w-jw),h+0.25+rnd()*0.35,(rnd()-0.5)*d*0.3,bas(wallHex));}
      for(let i=0;i<3;i++){const rb=B(g,0.035,0.4+rnd()*0.9,0.035,0,(rnd()-0.5)*w*0.8,h+0.35,(rnd()-0.5)*d*0.6,bas(0x010102));
        rb.rotation.z=(rnd()-0.5)*0.8;} // 삐져나온 철근
      if(!far&&rnd()>0.45){const bw2=w*(0.3+rnd()*0.2),bh2=h*(0.16+rnd()*0.14); // 붕괴 물림(측면 뚫림)+슬래브 단면
        const bx=(rnd()>0.5?1:-1)*(w/2-bw2/2+0.03),by=h*(0.35+rnd()*0.35);
        B(g,bw2+0.08,bh2,d*0.72,0,bx,by,0,bas(0x020203));
        for(let s2=0;s2<3;s2++)B(g,bw2+0.12,0.05,d*0.74,0,bx,by-bh2/2+bh2*(0.22+s2*0.28),0,bas(0x020202));}
      if(rnd()>0.55){const tx=(rnd()-0.5)*w*0.5,tz=(rnd()-0.5)*d*0.4; // 옥상 급수탱크 잔존
        B(g,w*0.2,0.5+rnd()*0.4,w*0.2,0,tx,h+0.6,tz,bas(0x010102));
        B(g,0.05,0.45,0.05,0,tx-0.14,h+0.25,tz,bas(0x010102));B(g,0.05,0.45,0.05,0,tx+0.14,h+0.25,tz,bas(0x010102));}
      if(rnd()>0.4){const ah=0.7+rnd()*1.7;B(g,0.05,ah,0.05,0,(rnd()-0.5)*w*0.5,h+ah/2,(rnd()-0.5)*d*0.5,bas(wallHex));}
      B(g,w*0.98,0.14,d*0.98,0,h+0.02,0,far?bas(0x010102):bas(0x020202)); // 눈 캡(무채 딤)
      g.rotation.z=(rnd()-0.5)*0.05; // 죽은 도시 특유의 기울어짐
      g.position.set(x,-13.5-rnd()*2.5,z);R.add(g);}
    for(let i=0;i<15;i++){const x=-42+i*5.8+(rnd()-0.5)*2.5;tower(x,-48-rnd()*10,3.2+rnd()*3.6,15+rnd()*13,3+rnd()*2,true);}
    for(let i=0;i<12;i++){const x=-37+i*6.6+(rnd()-0.5)*3;if(Math.abs(x)<5&&rnd()>0.35)continue;tower(x,-27-rnd()*9,2.6+rnd()*3.4,9+rnd()*12,2.6+rnd()*2,false);}
    // ── 받침 건물 상부(플린스) ──
    const PL=new T.Group();R.add(PL);
    B(PL,9.6,2.4,7.8,0x000001,0,-1.22,-0.4);
    B(PL,9.6,0.16,7.8,0,0,0.0,-0.4,concM);
    for(let i=0;i<26;i++){const w=0.5+rnd()*1.4,d=0.4+rnd()*1.2; // 눈 패치
      B(PL,w,0.07,d,0,-4.5+rnd()*9,0.135,-3.9+rnd()*7,rnd()>0.5?snowD:snowE);}
    B(PL,9.6,0.3,0.2,0x010102,0,0.15,3.32); // 앞 파라펫 립
    B(PL,0.2,0.3,7.8,0x010102,-4.7,0.15,-0.4);
    const RL=new T.Group();PL.add(RL); // 난간(앞 왼쪽)
    for(let i=0;i<8;i++)B(RL,0.05,0.6,0.05,0,-4.4+i*0.6,0.6,3.22,bas(0x010102));
    B(RL,4.4,0.06,0.06,0,-2.3,0.92,3.22,bas(0x010102));
    for(let i=0;i<6;i++){const w=1.0+rnd()*1.6; // 앞쪽 눈 드리프트(전경)
      B(PL,w,0.12+rnd()*0.1,0.6+rnd()*0.5,0,-4.2+rnd()*8.4,0.14,2.3+rnd()*0.9,rnd()>0.5?snowE:snowD);}
    const LD=new T.Group();PL.add(LD); // 사다리(앞면에서 아래로)
    for(let i=0;i<7;i++)B(LD,0.36,0.05,0.05,0,0,-0.2-i*0.3,0.06,bas(0x080b12));
    B(LD,0.06,2.4,0.06,0,-0.21,-1.15,0.06,bas(0x010102));B(LD,0.06,2.4,0.06,0,0.21,-1.15,0.06,bas(0x010102));
    LD.position.set(-3.5,0.02,3.4);
    // ── 오두막(벽돌 셸) ──
    const H=new T.Group();R.add(H);H.position.set(0.5,0.08,-0.7);
    const hw=4.9,hh=2.72,hd=3.5;
    // 실내(창으로 보이는 것): 바닥/뒷벽/측벽 — 따뜻한 톤
    B(H,hw-0.5,0.08,hd-0.5,0,0,0.12,0,plankMat(0x3c2c1c,false));     // 마루(판자)
    B(H,hw-0.5,hh-0.2,0.12,0,0,hh/2,-hd/2+0.32,plankMat(0x4a3722,true)); // 뒷벽(세로 판자)
    B(H,0.12,hh-0.2,hd-0.7,0x241a10,-hw/2+0.32,hh/2,0);              // 좌 내벽(어둡)
    B(H,0.12,hh-0.2,hd-0.7,0x2e2114,hw/2-0.32,hh/2,0);               // 우 내벽
    B(H,hw-0.5,0.12,hd-0.5,0x1c150d,0,hh-0.08,0);                    // 천장(어둡)
    // 뒷벽 선반 2단 + 병·통조림 실루엣
    for(const sy of [1.55,2.1]){B(H,2.9,0.07,0.24,0x2e2114,-0.2,sy,-hd/2+0.45);
      let x=-1.5;while(x<1.2){const bw=0.12+rnd()*0.1,bh=0.16+rnd()*0.2;
        if(rnd()>0.2)B(H,bw,bh,0.14,0,x,sy+bh/2+0.035,-hd/2+0.45,lam(rnd()>0.6?0x1c1208:0x2a1a0c));x+=bw+0.05;}}
    // 난로(우측) — 몸통 실루엣 + 발광 화구
    const ST=new T.Group();H.add(ST);ST.position.set(0.98,0.12,-0.75);
    B(ST,0.62,0.86,0.5,0,0,0.43,0,lam(0x140f0a));
    B(ST,0.1,1.6,0.1,0,0.12,1.6,0,lam(0x0f0b08)); // 연통
    B(ST,0.3,0.26,0.02,0,-0.02,0.38,0.26,bas(0xff9a33)); // 화구
    B(ST,0.18,0.15,0.021,0,-0.02,0.35,0.265,bas(0xffd489));
    const fire=new T.PointLight(0xff8a3a,6.5,1.8,1.75);fire.position.set(0.6,0.7,-0.5);H.add(fire);
    // 주전자·컵 실루엣(난로 위)
    B(ST,0.2,0.14,0.16,0,-0.05,0.93,0,lam(0x120d08));B(ST,0.07,0.05,0.05,0,0.14,0.9,0,lam(0x120d08));
    // 랜턴(좌벽 걸림 — backL 감쇠 링의 중심에 배치해 글로우로 읽히게)
    B(H,0.05,0.4,0.05,0,-1.78,1.98,-1.05,lam(0x0e0a06));
    B(H,0.14,0.2,0.14,0,-1.78,1.7,-1.05,lam(0x171006));
    B(H,0.08,0.1,0.08,0,-1.72,1.7,-1.05,bas(0xffc063));
    // 생존자(파카, 등돌림, 좌식) — 창 중앙좌
    const PS=new T.Group();H.add(PS);PS.position.set(-0.62,0.12,-0.25);
    B(PS,0.56,0.14,0.44,0,0,0.07,0,lam(0x17110b));            // 방석
    B(PS,0.5,0.34,0.34,0,0,0.31,0,lam(0x1d150e));             // 엉덩이/다리
    B(PS,0.46,0.5,0.3,0,0,0.72,0,lam(0x221810));              // 몸통(파카)
    B(PS,0.5,0.12,0.34,0,0,0.99,0,lam(0x261b12));             // 어깨/후드 접힘
    B(PS,0.26,0.26,0.24,0,0,1.2,0,lam(0x1a130c));             // 머리/후드
    B(PS,0.3,0.1,0.26,0,0,1.05,-0.03,lam(0x150f09));          // 후드 목
    B(PS,0.11,0.34,0.11,0,-0.28,0.62,0.02,lam(0x1d150e));     // 팔
    B(PS,0.11,0.34,0.11,0,0.28,0.62,0.02,lam(0x1d150e));
    PS.scale.set(1.3,1.35,1.3);PS.rotation.y=-0.28;
    // 고양이 받침 상자(실루엣 높이 확보) + 실제 복셀 고양이 재사용
    B(H,0.52,0.36,0.42,0,0.34,0.3,-0.12,lam(0x1a1209));
    let catInfo='no-cat';
    try{S.state.cat=true;S.spawnCat&&S.spawnCat();const c=S.cat&&S.cat();
      if(c){H.attach(c.g);c.g.position.set(0.34,0.5,-0.1);c.g.rotation.y=-1.35;c.g.scale.set(1.65,1.65,1.65);
        S.setCatMode&&S.setCatMode('sit');catInfo='cat-ok';}}catch(e){catInfo='ERRcat';}
    // ── 벽돌 외벽(창 개구부 포함) ──
    const bW=0.3,bH=0.22,bD=0.3,mort=0x010102;
    const win={x:-0.25,y:1.42,w:1.95,h:1.42}; // 앞벽 창(로컬)
    function brickFace(g,faceW,faceH,hole,zOff,rotY,xOff){
      const F=new T.Group();g.add(F);
      const bz=zOff>0?zOff-0.13:zOff+0.13; // 모르타르 배킹 — 창 구멍 둘레 4분할(구멍 막지 않게)
      // (mort는 뉴트럴 근흑 유지)
      if(!hole){B(F,faceW,faceH,0.08,0,0,faceH/2,bz,bas(mort));}
      else{const L=hole.x-hole.w/2+faceW/2,Rr=faceW/2-(hole.x+hole.w/2);
        B(F,L,faceH,0.08,0,-faceW/2+L/2,faceH/2,bz,bas(mort));
        B(F,Rr,faceH,0.08,0,faceW/2-Rr/2,faceH/2,bz,bas(mort));
        B(F,hole.w,hole.y-hole.h/2,0.08,0,hole.x,(hole.y-hole.h/2)/2,bz,bas(mort));
        B(F,hole.w,faceH-(hole.y+hole.h/2),0.08,0,hole.x,(faceH+hole.y+hole.h/2)/2,bz,bas(mort));}
      let y=bH/2;let row=0;
      while(y<faceH){let x=-faceW/2+((row%2)?bW*0.5:0)+bW/2;
        while(x<faceW/2){
          const inHole=hole&&Math.abs(x-hole.x)<hole.w/2+0.02&&Math.abs(y-hole.y)<hole.h/2+0.02;
          if(!inHole&&rnd()>0.04){
            B(F,bW-0.05,bH-0.045,bD,0,Math.min(x,faceW/2-bW/2),y,zOff,brickMats[(rnd()*brickMats.length)|0]);}
          x+=bW;}
        y+=bH;row++;}
      if(rotY)F.rotation.y=rotY;if(xOff!==undefined)F.position.x=xOff;
      return F;}
    brickFace(H,hw,hh,win,hd/2-bD/2+0.06,0,0);          // 앞벽(+z, 창)
    brickFace(H,hw,hh,null,-hd/2+bD/2-0.06,0,0);        // 뒷벽
    const sideR=new T.Group();H.add(sideR);sideR.rotation.y=Math.PI/2;sideR.position.x=hw/2-bD/2+0.06;
    brickFace(sideR,hd,hh,{x:0.35,y:1.4,w:0.85,h:0.75},0,0,0); // 우벽(작은 창)
    const sideL=new T.Group();H.add(sideL);sideL.rotation.y=Math.PI/2;sideL.position.x=-hw/2+bD/2-0.06;
    brickFace(sideL,hd,hh,null,0,0,0);
    // 큰 창: 프레임 + 멀리언(6분할) — 어두운 목재
    const WF=new T.Group();H.add(WF);WF.position.set(win.x,win.y,hd/2+0.1);
    const fr=0x020202;
    B(WF,win.w+0.22,0.11,0.22,0,0,win.h/2+0.05,0,lam(fr));B(WF,win.w+0.22,0.11,0.22,0,0,-win.h/2-0.05,0,lam(fr));
    B(WF,0.11,win.h+0.2,0.22,0,-win.w/2-0.05,0,0,lam(fr));B(WF,0.11,win.h+0.2,0.22,0,win.w/2+0.05,0,0,lam(fr));
    B(WF,0.07,win.h,0.16,0,-win.w/6,0,0,lam(fr));B(WF,0.07,win.h,0.16,0,win.w/6,0,0,lam(fr));
    B(WF,win.w,0.07,0.16,0,0,0.12,0,lam(fr));
    B(WF,win.w+0.5,0.14,0.5,0,0,-win.h/2-0.18,0.05,lam(0x030303)); // 창턱 + 눈
    B(WF,win.w+0.4,0.07,0.4,0,0,-win.h/2-0.1,0.08,snowC);
    // 창 워시(은은한 앰버 통일감)
    const wash=new T.Mesh(new T.PlaneGeometry(win.w,win.h),new T.MeshBasicMaterial({color:0xff9a3a,transparent:true,opacity:0.03,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
    wash.position.set(win.x,win.y,hd/2+0.02);H.add(wash);
    // 우측 작은 창 발광
    const sw=new T.Mesh(new T.PlaneGeometry(0.8,0.7),new T.MeshBasicMaterial({color:0xff9540,transparent:true,opacity:0.6,depthWrite:false,fog:false}));
    sw.rotation.y=Math.PI/2;sw.position.set(hw/2+0.13,1.4,-0.35);H.add(sw);
    B(H,0.05,0.75,0.07,0,hw/2+0.17,1.4,-0.35,lam(0x05060a));
    B(H,0.05,0.07,0.85,0,hw/2+0.17,1.4,-0.35,lam(0x05060a));
    // ── 지붕: 슬래브 + 눈 덮임(울퉁불퉁) + 처마 ──
    B(H,hw+0.3,0.14,hd+0.3,0x000001,0,hh+0.05,0);
    let sx=-hw/2-0.12;while(sx<hw/2+0.12){const sw2=0.5+rnd()*0.5,sh=0.16+rnd()*0.14;
      B(H,sw2,sh,hd+0.35,0,Math.min(sx+sw2/2,hw/2+0.12),hh+0.145+sh/2,0,rnd()>0.5?snowA:snowB);sx+=sw2;}
    for(let i=0;i<9;i++){B(H,0.3+rnd()*0.5,0.12,0.3,0,-hw/2+0.3+rnd()*(hw-0.4),hh+0.34,hd/2+0.12,snowC);} // 처마 눈혹
    // ── 타프(우측 뒤 지붕에서 드리움) + 눈 ──
    const TP=new T.Group();H.add(TP);
    const tpc=0x2a2619,tps=0x211e14;
    B(TP,2.0,0.1,1.5,0,1.15,hh+0.45,-0.35,tarpM);
    B(TP,1.8,0.1,0.8,0,1.2,hh+0.2,0.55,tarpM2);
    B(TP,1.7,0.45,0.1,0,1.25,hh-0.08,0.98,tarpM);
    B(TP,1.5,0.6,0.09,0,1.3,hh-0.6,1.03,tarpM2);
    B(TP,0.45,0.35,0.09,0,0.62,hh-0.35,1.0,tarpM2); // 찢긴 자락
    B(TP,1.5,0.12,1.1,0,1.2,hh+0.54,-0.3,snowD); // 타프 위 눈
    // ── 안테나 타워(지붕 중앙우 — 단순 격자) ──
    const AT=new T.Group();H.add(AT);AT.position.set(0.9,hh+0.24,-0.7);AT.scale.set(0.9,0.9,0.9);
    const atc=bas(0x010102);
    for(const [lx,lz] of [[-0.34,-0.34],[0.34,-0.34],[-0.34,0.34],[0.34,0.34]]){
      const leg=B(AT,0.06,1.9,0.06,0,lx,0.95,lz,atc);leg.rotation.z=lx>0?-0.07:0.07;leg.rotation.x=lz>0?0.07:-0.07;}
    B(AT,0.78,0.06,0.06,0,0,0.62,0.32,atc);B(AT,0.78,0.06,0.06,0,0,0.62,-0.32,atc);
    B(AT,0.06,0.06,0.78,0,0.32,0.62,0,atc);B(AT,0.06,0.06,0.78,0,-0.32,0.62,0,atc);
    B(AT,0.64,0.06,0.06,0,0,1.35,0.24,atc);B(AT,0.64,0.06,0.06,0,0,1.35,-0.24,atc);
    B(AT,0.6,0.09,0.6,0,0,1.92,0,atc); // 플랫폼
    B(AT,0.07,1.5,0.07,0,0,2.7,0,atc); // 상부 폴
    B(AT,0.55,0.05,0.05,0,0,3.05,0,atc);B(AT,0.35,0.05,0.05,0,0,3.3,0,atc);
    B(AT,0.66,0.1,0.66,0,0,2.0,0,snowB); // 플랫폼 눈
    const cb1=B(AT,0.025,0.025,2.2,0,0.75,1.1,0.9,atc);cb1.rotation.x=0.55;cb1.rotation.y=-0.35;
    // ── 사람 제거 + 카메라 ──
    S.avatarDespawn&&S.avatarDespawn();
    let css=document.getElementById('shotcss')||document.createElement('style');css.id='shotcss';document.head.appendChild(css);
    css.textContent='body > *:not(#c):not(#fx){display:none!important}';
    S.cineOn&&S.cineOn(P.cine[6]);S.cineSet&&S.cineSet(P.cine[0],P.cine[1],P.cine[2],P.cine[3],P.cine[4],P.cine[5],P.cine[6]);
    return 'ok '+catInfo;
  }catch(e){return 'ERR '+String(e&&e.stack||e).slice(0,400);}})()`);
  console.log('setup:', r);
  await sleep(1000);
  await ev(`(()=>{const S=window.__shelter;try{S.renderFrame&&S.renderFrame();}catch(e){}return 1;})()`);
  await sleep(400);
  const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
  const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
  fs.writeFileSync(path.join(OUT, 'dio-' + TAG + '.png'), PNG.sync.write(png));
  console.log('DONE -> dio-' + TAG + '.png');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('FATAL', e && e.stack || e); app.quit(); process.exit(9); });
