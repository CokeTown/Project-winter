// #229 벽 페이드-빛기둥/창하늘 동조 검증 — 수치 + 실캡처.
//   시나리오: container 정오 쾌청, 창벽이 보이는 각(yaw 0.62)에서 반대각(2.2)으로 스윙 →
//   창벽이 페이드 아웃(175ms)하는 동안 ①창하늘 재질 opacity==벽 fade ②빔 opacity==0.26*dayness*opMul*fade
//   를 프레임마다 실측하고, 미드 페이드 화면을 캡처한다(전광 잔존이면 밝은 사각이 보인다).
//   실행: ./node_modules/.bin/electron.cmd tools/probe-cullfade.cjs
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const OUT = path.join(process.cwd(), 'scratchpad', 'shaftaudit');
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };
const W = 1280, HGT = 720;

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(400);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  };
  await H.evalJs(`(async()=>{const S=window.__shelter;
    S.simReset(); if(S.hideTitle)S.hideTitle();
    S.state.current='container'; S.loadShelter('container');
    await new Promise(r=>setTimeout(r,700));
    S.setWeather('clear'); S.setHour(12);
    S.setYaw&&S.setYaw(0.62); S.setPitch&&S.setPitch(0.5); S.setZoom&&S.setZoom(0.9);
    for(let k=0;k<10;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}
    return 1;})()`);
  await shot('fade_f0_settled.png');
  // 스윙 개시 → 프레임별 fade/opacity 표본
  // 창벽 법선은 -z: 카메라가 -z 쪽으로 넘어가는 yaw(0.62+π)여야 그 벽이 페이드 아웃한다.
  const rows = await H.evalJs(`(async()=>{const S=window.__shelter; S.setYaw(0.62+Math.PI);
    const out=[];
    for(let k=0;k<14;k++){
      S.renderFrame&&S.renderFrame();
      // 페이드 중인 벽(0<fade<1)을 순회하며 그 벽 소속 하늘판/빔의 opacity 대조 (벽 그룹 동일성으로 매칭)
      let smp=null, gRef=null;
      for(const m of (S.__winSkyMats||[])){
        const g=m.userData.wallG; if(!g||!g.userData.cull) continue;
        const f=g.userData.cull.fade;
        if(f>0.001&&f<0.999){ gRef=g; smp={k,fade:+f.toFixed(3),skyOp:+m.opacity.toFixed(3),skyTr:m.transparent}; break; }
      }
      if(smp){
        for(const b of (S.__sunShafts||[])){
          if(b.userData.wallG===gRef){ smp.beamOp=+b.material.opacity.toFixed(3); smp.opMul=b.userData.opMul; break; }
        }
        out.push(smp);
      }
      await new Promise(r=>setTimeout(r,18)); // 175ms 페이드를 촘촘히 표본(≈9프레임 창)
    }
    return out;})()`);
  console.log('페이드 표본(스윙 중):');
  // 구동 순서상 표시가 fade보다 1프레임 늦는다(≈18ms — 시각 무해). 판정: 직전 표본의 fade까지 허용.
  let pass = true, seen = 0, prevFade = 1;
  for (const r of rows) {
    const lagOK = v => v <= prevFade + 0.02 && v >= r.fade - 0.02;
    const skyOK = lagOK(r.skyOp) && (r.skyTr === true || r.skyOp >= 0.999);
    const beamOK = r.beamOp != null && lagOK(r.beamOp / (0.26 * (r.opMul ?? 1)));
    seen++;
    if (!skyOK || !beamOK) pass = false;
    console.log(` k=${r.k} fade=${r.fade} skyOp=${r.skyOp}(tr=${r.skyTr}) beamOp=${r.beamOp ?? '-'} → ${skyOK && beamOK ? 'OK' : 'FAIL'}`);
    prevFade = r.fade;
  }
  await shot('fade_f1_midcapture.png');
  // 페이드 완료 후: 벽 hidden → 하늘판 재질은 원복(불투명), 빔 visible=false 확인
  await H.evalJs(`(async()=>{const S=window.__shelter;for(let k=0;k<8;k++){S.renderFrame&&S.renderFrame();await new Promise(r=>setTimeout(r,40));}return 1;})()`);
  const post = await H.evalJs(`(()=>{const S=window.__shelter;
    let hiddenBeams=0, visBeamsNoWall=0;
    for(const b of (S.__sunShafts||[])){
      const g=b.userData.wallG; if(!g) continue;
      if(!g.visible){ hiddenBeams++; if(b.visible&&b.material.opacity>0.01) visBeamsNoWall++; }
    }
    return {hiddenBeams,visBeamsNoWall};})()`);
  await shot('fade_f2_after.png');
  console.log(`페이드 완료 후: 숨은 벽 소속 빔 ${post.hiddenBeams} · 그중 전광 잔존 ${post.visBeamsNoWall}`);
  if (post.visBeamsNoWall > 0) pass = false;
  if (seen === 0) { console.log('표본 0 — 스윙에 페이드 벽이 안 걸림(각 재조정 필요)'); pass = false; }
  console.log('RESULT ' + (pass ? 'PASS' : 'FAIL'));
  H.app.quit(); process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
