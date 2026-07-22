/* #226 터미널 2차 검증 — exp/sel/toolbar 스캔인 + `//` 헤더 + 일지 탭 리프레시 스캔 */
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
    const out={}; const an=el=>getComputedStyle(el).animationName;
    // ① exp-panel: 스캔인 + // 헤더
    const ep=document.getElementById('exp-panel'); ep.classList.add('show');
    out.expAnim = an(ep);
    out.expPrefix = getComputedStyle(ep.querySelector('h2'),'::before').content.includes('//');
    ep.classList.remove('show');
    // ② sel-panel
    const sp=document.getElementById('sel-panel'); sp.classList.add('show');
    out.selAnim = an(sp);
    out.selPrefix = getComputedStyle(sp.querySelector('h2'),'::before').content.includes('//');
    sp.classList.remove('show');
    // ③ toolbar (배치 진입)
    document.body.classList.add('edit-mode');
    out.tbAnim = an(document.getElementById('toolbar'));
    document.body.classList.remove('edit-mode');
    // ④ 일지 모달: KeyJ 실전 경로 → 탭 클릭 → m-refresh
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyJ',key:'j'}));
    await new Promise(r=>setTimeout(r,400));
    out.journalOpen = document.getElementById('modal-back').classList.contains('show');
    const tabBtns=[...document.querySelectorAll('#modal-body button[data-jtab]')];
    out.tabCount = tabBtns.length;
    const other=tabBtns.find(b=>!b.classList.contains('primary'));
    if(other){ other.click(); await new Promise(r=>setTimeout(r,150)); }
    out.refreshClass = document.getElementById('modal-body').classList.contains('m-refresh');
    return out; })()`);
  console.log('TERM2 ' + JSON.stringify(r1, null, 1));
  // 캡처: 배치 모드(툴바 랙) — 실전 토글 경로로
  await H.evalJs(`(async()=>{ document.getElementById('modal-back').classList.remove('show');
    const S=window.__shelter; if(S.toggleEditMode)S.toggleEditMode(); else document.body.classList.add('edit-mode');
    await new Promise(r=>setTimeout(r,400)); return 1; })()`);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'term2_edit.jpg'), img.toJPEG(92));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
