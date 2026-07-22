/* #225 검증 — Tab 정보 확장(홀드·해제·내용) + PDA 사용 중 HUD 축소(디밍·복원) */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  const r1 = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900));
    const out={};
    // ① Tab keydown → 확장 표시 (실제 리스너 경로: window 디스패치)
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'Tab',key:'Tab'}));
    await new Promise(r=>setTimeout(r,250));
    const ext=document.getElementById('hud-ext');
    out.extOn = document.body.classList.contains('hud-ext') && ext.offsetHeight > 0;
    out.extText = ext.textContent.slice(0,120);
    out.hasClean = ext.textContent.includes('청결');
    out.hasComfort = ext.textContent.includes('쾌적');
    out.hasCond = ext.textContent.includes('컨디션') || ext.textContent.includes('부상');
    return out; })()`);
  const shot1 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'hudext_hold.jpg'), shot1.toJPEG(92));
  const r2 = await H.evalJs(`(async()=>{
    const out={};
    // ② keyup → 해제
    window.dispatchEvent(new KeyboardEvent('keyup',{code:'Tab',key:'Tab'}));
    await new Promise(r=>setTimeout(r,120));
    out.extOff = !document.body.classList.contains('hud-ext') && document.getElementById('hud-ext').offsetHeight === 0;
    // ③ PDA 열림 → HUD 디밍
    document.getElementById('dock-pda').click();
    await new Promise(r=>setTimeout(r,500));
    out.pdaOn = document.body.classList.contains('pda-on');
    out.abOpacity = getComputedStyle(document.getElementById('action-bar')).opacity;
    out.hudOpacity = getComputedStyle(document.getElementById('hud')).opacity;
    return out; })()`);
  const shot2 = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'hudext_pdadim.jpg'), shot2.toJPEG(92));
  const r3 = await H.evalJs(`(async()=>{
    const out={};
    // ④ PDA 닫기(하드웨어 뒤로 버튼) → 복원
    document.getElementById('pda-hit-back').click();
    await new Promise(r=>setTimeout(r,400));
    out.pdaOff = !document.body.classList.contains('pda-on');
    out.abOpacityBack = getComputedStyle(document.getElementById('action-bar')).opacity;
    return out; })()`);
  console.log('HUD2EXT ' + JSON.stringify({ ...r1, ...r2, ...r3 }, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
