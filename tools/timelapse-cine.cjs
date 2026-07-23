// 컷씬 24시간 타임랩스 (디렉터 2026-07-23 정정: "아이소 부감이 아니라 비네트 컷씬 구도에서 지나는 24시간")
//   비네트 러너와 동일한 오버레이 캔버스+전용 WebGLRenderer를 페이지 안에 세우고,
//   씬의 update(t)를 '시각→t 매핑'으로 구동한다 (t 확장 구간까지 사용 — 밤은 러너 종점 너머의 어스름).
//   카메라는 매 프레임 하네스가 재고정(비네트의 12초 돌리 대신 24초 슬로 돌리).
//   사용: SHOT=gate|jungle FRAMES=720 ./node_modules/.bin/electron.cmd tools/timelapse-cine.cjs
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const SHOT = process.env.SHOT || 'gate';           // gate=「불타는 해협」(다리 관리소) · jungle=「콘크리트 정글의 해」(펜트하우스)
const FRAMES = +(process.env.FRAMES || 720);       // 720f @30fps = 24s (1초=1시간)
const W = 1920, HGT = 1080;
const OUT = path.join(process.cwd(), 'scratchpad', 'timelapse', 'cine_' + SHOT);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 560000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(600);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  };
  await H.evalJs(`(async()=>{const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); return 1;})()`);
  // 러너와 동일한 오버레이 문법(전용 캔버스 + 시네 프레임 + 콘트라스트 필터) — 메인 루프와 무경합
  const setup = await H.evalJs(`(()=>{const S=window.__shelter;
    const ov=document.createElement('div'); ov.id='cineOv';
    ov.style.cssText='position:fixed;inset:0;z-index:400;background:#000';
    const cv=document.createElement('canvas'); cv.style.cssText='width:100%;height:100%;filter:contrast(1.15) saturate(1.16)'; ov.appendChild(cv);
    const vf=document.createElement('div');
    vf.style.cssText='position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(10,4,2,0.6) 100%)';
    ov.appendChild(vf); document.body.appendChild(ov);
    const vr=new S.THREE.WebGLRenderer({canvas:cv,antialias:true});
    vr.setSize(innerWidth,innerHeight,false);
    const v=${SHOT === 'gate' ? 'S.buildGoldenGateScene()' : 'S.buildJungleSunScene(false)'};
    v.camera.aspect=innerWidth/innerHeight; v.camera.updateProjectionMatrix();
    window.__cine={vr,v}; return 'OK';})()`);
  console.log('SETUP ' + JSON.stringify(setup));

  // 시각(h) → 씬 t 매핑 — update의 kn 공식에서 역산:
  //   gate: kn=1-0.62t → t 1.55=심야(kn 0.04) · 0.85=여명 · 0.15=주간 앰버 · 0=노을 만개
  //   jungle: kn=1-t   → t 1.0=밤(별 만개) · 0=골든아워. 확장 없음(kn<0 색 외삽 방지 클램프)
  const MAP = SHOT === 'gate'
    ? `(h=> h<4.5 ? 1.55 : h<7 ? 1.55+(h-4.5)/2.5*(0.85-1.55) : h<16 ? 0.85+(h-7)/9*(0.15-0.85)
        : h<17.5 ? 0.15+(h-16)/1.5*(0-0.15) : h<21 ? 0+(h-17.5)/3.5*1.2 : 1.2+(h-21)/3*(1.55-1.2))`
    : `(h=> Math.max(0, Math.min(1, h<4.5 ? 1.0 : h<7 ? 1.0+(h-4.5)/2.5*(0.45-1.0) : h<16 ? 0.45+(h-7)/9*(0.1-0.45)
        : h<17.5 ? 0.1+(h-16)/1.5*(0-0.1) : h<21 ? (h-17.5)/3.5*1.0 : 1.0)))`;
  const CAM = SHOT === 'gate'
    ? `((c,p)=>{c.position.set(-8+3*p,12,40-8*p);c.up.set(0,1,0);c.lookAt(10+4*p,16-1.5*p,-150);})`
    : `((c,p)=>{c.position.z=42-3.5*p;c.lookAt(0,22,-80);})`;

  for (let f = 0; f < FRAMES; f++) {
    const h = (f / FRAMES) * 24, p = f / FRAMES;
    await H.evalJs(`(()=>{const C=window.__cine; const t=(${MAP})(${h.toFixed(4)}) + 0.006*Math.sin(${f}*0.7);
      C.v.update(${SHOT === 'jungle' ? 'Math.max(0,Math.min(1,t))' : 't'});
      (${CAM})(C.v.camera, ${p.toFixed(4)});
      C.vr.render(C.v.scene, C.v.camera); return 1;})()`);
    await shot('f' + String(f).padStart(4, '0') + '.png');
    if (f % 90 === 0) console.log(`frame ${f}/${FRAMES} (h=${h.toFixed(1)})`);
  }
  console.log('FRAMES WROTE ' + OUT);
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
