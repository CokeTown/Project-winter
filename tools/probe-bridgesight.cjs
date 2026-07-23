// #146 「불타는 해협」 지역 결선 실측 — 다리 관리소 × 노을 창 × 다리 히트 4분면 + 글린트 + 실캡처.
//   실행: ./node_modules/.bin/electron.cmd tools/probe-bridgesight.cjs
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const OUT = path.join(process.cwd(), 'scratchpad', 'bridgesight');
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const results = [];
const check = (n, c, d) => { results.push(!!c); console.log(`${c ? 'PASS' : 'FAIL'}  ${n}  — ${d}`); };

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1600, 900); await sleep(500);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: 1600, height: 900 }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  };
  await H.evalJs(`(async()=>{const S=window.__shelter;
    S.simReset(); if(S.hideTitle)S.hideTitle();
    S.state.current='bridgehouse'; S.loadShelter('bridgehouse');
    await new Promise(r=>setTimeout(r,800));
    S.setWeather('clear');
    S.setYaw&&S.setYaw(0.0); S.setPitch&&S.setPitch(0.42); S.setZoom&&S.setZoom(0.6); // 다리(-z)가 화면에 들어오는 부감
    return 1;})()`);

  // 화면 좌표 헬퍼: 월드 점 → clientX/Y (렌더러에서 projeciton)
  const SCREEN = `((wx,wy,wz)=>{const S=window.__shelter;const v=new S.THREE.Vector3(wx,wy,wz).project(S.camera);
    return {x:(v.x*0.5+0.5)*innerWidth, y:(-v.y*0.5+0.5)*innerHeight, inFront:v.z<1};})`;

  // ① 노을 창 안(18시) — 다리 중앙 클릭 = 비네트 발동
  await H.evalJs(`(()=>{const S=window.__shelter;S.setHour(18);return 1;})()`);
  await sleep(300);
  // 카메라 yaw 탐색: 다리(-z 원경)가 화면 안에 들어오는 각을 실측으로 찾는다 (고정 yaw 가정은 화면 밖 2060px 실패)
  const p1 = await H.evalJs(`(async()=>{const S=window.__shelter;const P=${SCREEN};
    for (const yw of [0, 0.4, -0.4, 0.8, -0.8, 1.2, -1.2, 1.6, -1.6, 2.2, -2.2, 3.14]) {
      S.setYaw&&S.setYaw(yw); S.renderFrame&&S.renderFrame(); await new Promise(r=>setTimeout(r,30));
      const p = P(2, 6, -21);
      if (p.inFront && p.x > 120 && p.x < innerWidth-120 && p.y > 60 && p.y < innerHeight-60) return {...p, yaw:yw};
    } return null;})()`);
  console.log('SCREEN@bridge ' + JSON.stringify(p1));
  if (!p1) { console.error('FATAL 다리가 어느 yaw에서도 화면 안에 안 들어옴'); H.app.quit(); process.exit(2); }
  const r1 = await H.evalJs(`(()=>{const S=window.__shelter;return {hit:S.bridgeSightHit({clientX:${p1.x},clientY:${p1.y}}),busyBefore:S.vignetteState()};})()`);
  const fired = await H.evalJs(`(()=>{const S=window.__shelter;const ok=S.pickBridgeSight({clientX:${p1.x},clientY:${p1.y}});return {ok,busy:S.vignetteState()};})()`);
  check('노을 18시 다리 클릭 → 발동', r1.hit && fired.ok && fired.busy, JSON.stringify({ ...r1, ...fired }));
  await sleep(1200); await shot('01_vignette_playing.png');
  // 비네트 종료 대기 (12s) — 노트 적재 확인
  for (let i = 0; i < 40; i++) { if (!(await H.evalJs(`window.__shelter.vignetteState()`))) break; await sleep(500); }
  const after = await H.evalJs(`(()=>{const S=window.__shelter;return {sights:S.state.sights&&S.state.sights.goldenGate,notes:(S.state.dayLog&&S.state.dayLog.notes||[]).filter(n=>/해협|다리|strait/i.test(n)).length};})()`);
  check('첫 관람 기록(노트+횟수)', after.sights >= 1 && after.notes >= 1, JSON.stringify(after));

  // ② 노을 창 안 — 다리 밖(하늘 위) 클릭 = 무발동
  const p2 = await H.evalJs(`(${SCREEN})(2, 30, -21)`); // 주탑 위 하늘 (y=30 > y1=19)
  const r2 = await H.evalJs(`(()=>{const S=window.__shelter;return {hit:S.bridgeSightHit({clientX:${p2.x},clientY:${p2.y}}),pick:S.pickBridgeSight({clientX:${p2.x},clientY:${p2.y}})};})()`);
  check('다리 밖(하늘) 클릭 무발동', !r2.hit && !r2.pick, JSON.stringify(r2));

  // ③ 노을 창 밖(12시) — 다리 클릭 무발동 + 글린트 침묵
  await H.evalJs(`(()=>{const S=window.__shelter;S.setHour(12);return 1;})()`);
  await sleep(300);
  const r3 = await H.evalJs(`(()=>{const S=window.__shelter;return {hit:S.bridgeSightHit({clientX:${p1.x},clientY:${p1.y}}),pick:S.pickBridgeSight({clientX:${p1.x},clientY:${p1.y}})};})()`);
  check('정오 다리 클릭 무발동(노을 창 게이트)', !r3.hit && !r3.pick, JSON.stringify(r3));

  // ④ 노을 창 복귀 — 글린트 가시화 실캡처(육안 판단물)
  await H.evalJs(`(async()=>{const S=window.__shelter;S.setHour(17.5);for(let k=0;k<10;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}return 1;})()`);
  await shot('02_sunset_glint.png');
  // 타 셸터 무영향 — 옥탑에서 같은 좌표 무발동
  await H.evalJs(`(async()=>{const S=window.__shelter;S.state.current='rooftop';S.loadShelter('rooftop');await new Promise(r=>setTimeout(r,600));S.setHour(18);return 1;})()`);
  const r5 = await H.evalJs(`(()=>{const S=window.__shelter;return {hit:S.bridgeSightHit({clientX:${p1.x},clientY:${p1.y}})};})()`);
  check('타 셸터(옥탑) 무발동', !r5.hit, JSON.stringify(r5));

  const ok = results.every(Boolean);
  console.log(`\nRESULT ${results.filter(Boolean).length}/${results.length} ${ok ? 'ALL GREEN' : 'FAIL'}`);
  H.app.quit(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
