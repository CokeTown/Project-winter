/* #221 터미널 전면화 1차 검증 — 모달 스캔인+// 헤더 · PDA 탭 리프레시 · 토스트 수신 라인 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
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
  const r = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    const out={};
    // ① 공용 모달 (제작) — 스캔인 애니 + 제목 // 프리픽스
    document.getElementById('btn-craft').click();
    await new Promise(r=>setTimeout(r,80));
    const modal=document.getElementById('modal');
    out.modalAnim=getComputedStyle(modal).animationName;
    const h2=document.getElementById('modal-title');
    out.titlePrefix=getComputedStyle(h2,'::before').content;
    out.titleText=h2.textContent.slice(0,10);
    await new Promise(r=>setTimeout(r,400));
    return out; })()`);
  await shot(win, 'term1_modal.png');
  const r2 = await H.evalJs(`(async()=>{
    const S=window.__shelter; if(S.closeModal)S.closeModal(); else document.getElementById('modal-close').click();
    await new Promise(r=>setTimeout(r,300));
    const out={};
    // ② PDA — 탭 전환 리프레시 재트리거 / quiet 경로 무동작
    document.getElementById('dock-pda').click();
    await new Promise(r=>setTimeout(r,500));
    const scr=document.getElementById('pda-screen');
    const tabs=document.querySelectorAll('#pda-tabs .pda-tab');
    scr.classList.remove('pda-refresh');
    tabs[1].click(); out.tabRefresh=scr.classList.contains('pda-refresh');
    out.refreshAnim=getComputedStyle(scr).animationName;
    scr.classList.remove('pda-refresh');
    S.renderPDA ? S.renderPDA(true) : null; // quiet — 있으면 직접, 없으면 스킵
    out.quietNoRefresh=!scr.classList.contains('pda-refresh');
    await new Promise(r=>setTimeout(r,200));
    return out; })()`);
  await shot(win, 'term1_pda.png');
  const r3 = await H.evalJs(`(async()=>{
    document.getElementById('dock-pda').click();
    await new Promise(r=>setTimeout(r,300));
    const S=window.__shelter; const out={};
    // ③ 토스트 — '> ' 프리픽스 + 스캔인
    if(S.toast) S.toast('회선 점검 중'); else { const el=document.getElementById('toast'); el.textContent='회선 점검 중'; el.classList.add('show'); }
    await new Promise(r=>setTimeout(r,60));
    const toastEl=document.getElementById('toast');
    out.toastPrefix=getComputedStyle(toastEl,'::before').content;
    out.toastAnim=getComputedStyle(toastEl).animationName;
    out.toastShown=toastEl.classList.contains('show');
    await new Promise(r=>setTimeout(r,120));
    return out; })()`);
  await shot(win, 'term1_toast.png');
  console.log('TERM1 ' + JSON.stringify({ ...r, ...r2, ...r3 }, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
