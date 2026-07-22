/* #227 로비 개편 검증 — 좌측 열 메뉴·언어 버튼 부재·종료 노출(Electron)·씬 시프트 + FHD 캡처 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(1200);
  const r = await H.evalJs(`(async()=>{
    const out={};
    out.titleShown = document.getElementById('title-screen').style.display !== 'none';
    out.langGone = !document.getElementById('title-lang') && !document.getElementById('lang-ko');
    const q=document.getElementById('t-quit');
    out.quitVisible = q && getComputedStyle(q).display !== 'none';
    const st=document.getElementById('t-settings');
    out.settingsInMenu = st && st.parentElement.id === 'title-menu' && st.textContent.trim().length > 0;
    out.canvasShift = getComputedStyle(document.getElementById('c')).transform !== 'none';
    const menu=document.getElementById('title-menu');
    out.menuLeft = menu.getBoundingClientRect().left < innerWidth * 0.3;
    out.menuItems = [...menu.querySelectorAll('.pixel-btn')].filter(b=>getComputedStyle(b).display!=='none').map(b=>b.textContent.trim().slice(0,8));
    return out; })()`);
  await sleep(900); // 시프트 트랜지션 0.7s 완료 후 촬영
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'lobby_new.jpg'), img.toJPEG(92));
  console.log('LOBBY ' + JSON.stringify(r, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
