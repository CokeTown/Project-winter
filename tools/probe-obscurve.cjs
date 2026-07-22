/* #218 곡률 정합 검증 — 오버레이 휨 캡처 + 곡률 아래 리스트 행 클릭(신뢰 시뮬) 정상 동작 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
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
  const r1 = await H.evalJs(`(async()=>{
    const S=window.__shelter;S.simReset();if(S.hideTitle)S.hideTitle();S.loadShelter('container');
    await new Promise(r=>setTimeout(r,700)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    S.setWeather('clear'); S.openObsMap(); S.setAerialHour(15);
    await new Promise(r=>setTimeout(r,2200));
    const scr = document.getElementById('obs-screen');
    const filtered = getComputedStyle(scr).filter !== 'none';
    const panelOwn = getComputedStyle(document.getElementById('obs-panel')).filter === 'none';
    // 곡률 아래 히트: 리스트 두 번째 행의 '표시 위치'(역변위 근사)에 __bulgeTest 클릭 → focus 전환
    const row = document.querySelectorAll('#obs-panel .obs-region')[1];
    const br = row.getBoundingClientRect();
    const sx = br.left + br.width / 2, sy = br.top + br.height / 2;
    const u = sx / innerWidth - 0.5, v = sy / innerHeight - 0.5, r2 = (u*u + v*v) / 0.5;
    const dx = 0.045 * innerWidth * u * r2, dy = 0.045 * innerHeight * v * r2;
    const px = sx - dx, py = sy - dy;
    const raw = document.elementFromPoint(px, py);
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: px, clientY: py });
    ev.__bulgeTest = true;
    (raw || document.body).dispatchEvent(ev);
    await new Promise(r=>setTimeout(r,1200));
    const focused = document.getElementById('obs-screen').classList.contains('focus');
    return { filtered, panelOwn, disp: [Math.round(dx), Math.round(dy)], focused };
  })()`);
  await shot(win, 'obscurve_focus.png');
  await H.evalJs(`document.querySelector('#obs-panel #obs-back-btn').click(); 1`);
  await sleep(1200);
  await shot(win, 'obscurve_overview.png');
  console.log('OBSCURVE', JSON.stringify(r1));
  const ok = r1.filtered && r1.panelOwn && r1.focused;
  console.log('RESULT', ok ? 'PASS' : 'FAIL');
  H.app.quit(); process.exit(ok ? 0 : 2);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
