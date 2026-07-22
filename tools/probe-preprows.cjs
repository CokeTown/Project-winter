/* #219 준비물 행 1줄화 검증 — ko/en/ja 행 높이 실측 + ko/en 실캡처 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
async function shot(win, name) {
  const img = bgra2rgba((await win.webContents.capturePage()).toBitmap());
  const png = new PNG({ width: 1280, height: 720 }); img.copy(png.data);
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', name), PNG.sync.write(png));
}
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1280, 720); await sleep(300);
  await H.evalJs(`(async()=>{
    const S=window.__shelter;S.simReset();if(S.hideTitle)S.hideTitle();S.loadShelter('container');
    await new Promise(r=>setTimeout(r,700)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    // 재료 지급 — 미보유 행(no)이 아니라 실제 톤으로 실측
    for(const rid of ['water','canned','battery','cloth','bandage','antiseptic']) S.state.res[rid]=(S.state.res[rid]||0)+5;
    S.setWeather('clear'); S.openObsMap(); S.setAerialHour(15);
    await new Promise(r=>setTimeout(r,1800)); return 1; })()`);
  const out = {};
  for (const lg of ['ko', 'en', 'ja']) {
    const r = await H.evalJs(`(async()=>{
      const S=window.__shelter; S.setLang('${lg}');
      // focus 재진입으로 행 재렌더 (리스트 두 번째 행 = 상업지구)
      const rows0=document.querySelectorAll('#obs-panel .obs-region');
      if(rows0.length){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; rows0[1].dispatchEvent(ev); }
      await new Promise(r=>setTimeout(r,1100));
      const rows=[...document.querySelectorAll('#obs-panel .prep-row')];
      const back=document.querySelector('#obs-panel #obs-back-btn');
      const res=rows.map(el=>({h:el.offsetHeight, txt:el.textContent.trim().slice(0,26)}));
      if(back){ const ev2=new MouseEvent('click',{bubbles:true}); ev2.__bulgeTest=true; back.dispatchEvent(ev2); }
      await new Promise(r=>setTimeout(r,900));
      return res; })()`);
    out[lg] = r;
  }
  // 캡처: ko/en focus 상태로 각각 재진입
  for (const lg of ['ko', 'en']) {
    await H.evalJs(`(async()=>{ const S=window.__shelter; S.setLang('${lg}');
      const rows=document.querySelectorAll('#obs-panel .obs-region');
      if(rows.length){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; rows[1].dispatchEvent(ev); }
      await new Promise(r=>setTimeout(r,1100)); return 1; })()`);
    await shot(win, `preprows_${lg}.png`);
    await H.evalJs(`(async()=>{ const b=document.querySelector('#obs-panel #obs-back-btn');
      if(b){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; b.dispatchEvent(ev); }
      await new Promise(r=>setTimeout(r,800)); return 1; })()`);
  }
  await H.evalJs(`window.__shelter.setLang('ko'); 1`);
  console.log('PREPROWS', JSON.stringify(out));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
