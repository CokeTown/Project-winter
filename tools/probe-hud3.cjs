/* #220 디렉터 배치 검증 — 관측 헤더 안쪽·나가기 하단 고정·cam-ctrl 우측·액션바 확대·배치 끝내기 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 300000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 1920, HGT = 1080;
function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
async function shot(win, name) {
  const img = bgra2rgba((await win.webContents.capturePage()).toBitmap());
  const png = new PNG({ width: W, height: HGT }); img.copy(png.data);
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', name), PNG.sync.write(png));
}
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(500);
  // ① 본편: cam-ctrl 우측 끝 + 액션바 확대 + 배치 끝내기
  const r1 = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    const cc=document.getElementById('cam-ctrl').getBoundingClientRect();
    const ab=document.getElementById('action-bar').getBoundingClientRect();
    const btn=document.querySelector('#action-bar .pixel-btn');
    return { camRight: +(innerWidth - cc.right).toFixed(1), camTop: +cc.top.toFixed(1),
      abH: +ab.height.toFixed(1), btnW: +btn.getBoundingClientRect().width.toFixed(1) };
  })()`);
  await shot(win, 'hud3_main.png');
  // ② 편집 모드: 배치 끝내기 버튼 존재 + 클릭 = 종료
  const r2 = await H.evalJs(`(async()=>{
    const S=window.__shelter;
    document.getElementById('btn-edit').click();
    await new Promise(r=>setTimeout(r,700));
    const items=[...document.querySelectorAll('#toolbar .tool-item')].map(e=>e.textContent.trim().slice(0,10));
    const inEdit1=document.body.classList.contains('edit-mode');
    return { inEdit1, first2: items.slice(0,2) };
  })()`);
  await shot(win, 'hud3_edit.png');
  const r2b = await H.evalJs(`(async()=>{
    document.querySelectorAll('#toolbar .tool-item')[0].click();
    await new Promise(r=>setTimeout(r,600));
    return { exitWorked: !document.body.classList.contains('edit-mode') };
  })()`);
  // ③ 관측: 헤더 안쪽(곡률 후) + 나가기 하단 고정(overview/focus) + 클릭=종료
  const r3 = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.setWeather('clear'); S.openObsMap(); S.setAerialHour(15);
    await new Promise(r=>setTimeout(r,2400));
    const top=document.getElementById('obs-top').getBoundingClientRect();
    const ex=document.getElementById('obs-exit');
    const exR=ex.getBoundingClientRect(); const pn=document.getElementById('obs-panel').getBoundingClientRect();
    const closeGone=!document.getElementById('obs-close');
    return { topXY:[+top.left.toFixed(1),+top.top.toFixed(1)], closeGone,
      exitText: ex.textContent, exitAtBottom: +(pn.bottom - exR.bottom).toFixed(1) };
  })()`);
  await shot(win, 'hud3_obs_overview.png');
  const r4 = await H.evalJs(`(async()=>{
    const rows=document.querySelectorAll('#obs-panel .obs-region');
    if(rows.length>1){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; rows[1].dispatchEvent(ev); }
    await new Promise(r=>setTimeout(r,1300));
    const ex=document.getElementById('obs-exit'); const pn=document.getElementById('obs-panel').getBoundingClientRect();
    const focusExit = ex ? +(pn.bottom - ex.getBoundingClientRect().bottom).toFixed(1) : null;
    return { focusExit };
  })()`);
  await shot(win, 'hud3_obs_focus.png');
  const r5 = await H.evalJs(`(async()=>{
    const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true;
    document.getElementById('obs-exit').dispatchEvent(ev);
    await new Promise(r=>setTimeout(r,1200));
    return { obsClosed: !document.getElementById('obs-screen').classList.contains('show') };
  })()`);
  console.log('HUD3 ' + JSON.stringify({ ...r1, ...r2, ...r2b, ...r3, ...r4, ...r5 }, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
