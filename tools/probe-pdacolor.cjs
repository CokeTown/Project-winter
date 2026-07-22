/* PDA 제작대 비교 캡처 — 톤 회귀 진단용 (현재 dist 기준 1컷) */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  await H.evalJs(`(async()=>{ const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    document.getElementById('btn-craft').click();
    await new Promise(r=>setTimeout(r,600)); return 1; })()`);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', process.env.OUT || 'pdacolor.jpg'), img.toJPEG(92));
  console.log('WROTE', process.env.OUT);
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
