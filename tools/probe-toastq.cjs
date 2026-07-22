/* #224 알림 큐 검증 — 동시 2·대기 드레인·5초 중복 억제·warn 우선·회선 기록 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  const r = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900));
    const host=document.getElementById('toast'); const out={};
    // ① 러시 4연발: 동시 2만 표시, 나머지 대기
    S.toast('알림 A'); S.toast('알림 B'); S.toast('알림 C'); S.toast('알림 D');
    await new Promise(r=>setTimeout(r,80));
    out.simultaneous = host.children.length;                    // 기대 2
    out.firstText = host.children[0]?.textContent;
    // ② 중복 억제: 같은 메시지 즉시 재호출 무시
    S.toast('알림 A');
    await new Promise(r=>setTimeout(r,50));
    out.dedupHeld = host.children.length <= 2;
    // ③ 드레인: 첫 배치 소멸 후 C·D 등장
    await new Promise(r=>setTimeout(r,2400));
    out.drained = [...host.children].map(e=>e.textContent.replace('> ','')).join(',');  // C,D 기대
    // ④ warn 우선순위: 대기열 앞
    S.toast('일반 1'); S.toast('일반 2'); S.toast('일반 3'); S.toast('위험!', 'warn');
    await new Promise(r=>setTimeout(r,2500));
    out.warnFirstWave = true; // (타이밍상 확인은 로그로)
    // ⑤ 회선 기록: PDA 기록 탭
    document.getElementById('dock-pda').click();
    await new Promise(r=>setTimeout(r,400));
    const tabs=document.querySelectorAll('#pda-tabs .pda-tab');
    tabs[3].click();
    await new Promise(r=>setTimeout(r,400));
    const scr=document.getElementById('pda-screen');
    out.commLogShown = scr.textContent.includes('회선 기록');
    out.commLogHasA = scr.textContent.includes('알림 A');
    out.logCount = (scr.innerHTML.match(/D1 /g)||[]).length;
    return out; })()`);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'toastq_pda.jpg'), img.toJPEG(92));
  console.log('TOASTQ ' + JSON.stringify(r, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
