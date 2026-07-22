/* 판단물 갤러리 촬영기 — 디렉터 검수 아티팩트의 원본 이미지를 한 번에 생성한다.
 *
 *   왜 저장소에 있나: 갤러리(아티팩트)는 휘발하지만 "그 컷을 어떻게 뽑았는지"는 남아야 인계가 된다.
 *
 *   해상도 정책(디렉터 2026-07-22 "FHD로는 촬영 못하나"):
 *     - 전체컷 = FHD 1920×1080 JPEG(q92). PNG는 CRT 노이즈 때문에 컷당 2.8MB라 갤러리 한 장에 못 싣는다.
 *       JPEG은 ~1/6이면서 화면 전체 인상 판정에는 충분하다.
 *     - 디테일컷 = 1:1 무손실 PNG 크롭. 글자 가독·형광체 격자처럼 픽셀을 세야 하는 판정은 여기서 한다.
 *     둘을 같이 실어야 "전체 인상 + 실제 픽셀" 판정이 한 페이지에서 끝난다.
 *
 *   사용: npm run build:electron → ./node_modules/.bin/electron.cmd tools/gallery-shots.cjs
 *   산출: scratchpad/aerial/g_*.jpg | g_*.png (커밋하지 않음)
 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));

const W = +(process.env.CAP_W || 1920), HGT = +(process.env.CAP_H || 1080);
const OUT = process.env.CAP_OUT || path.join(process.cwd(), 'scratchpad', 'aerial');
const JPEG_Q = 92;
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 600000);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }

let win;
// 한 번의 capturePage로 JPEG(전체용)과 raw 픽셀(크롭용)을 동시에 얻는다 — 두 번 찍으면 CRT 위상이 달라져 컷이 어긋난다.
async function grab() {
  const img = await win.webContents.capturePage();
  const png = new PNG({ width: W, height: HGT });
  bgra2rgba(img.toBitmap()).copy(png.data);
  return { jpeg: img.toJPEG(JPEG_Q), png };
}
function writeFull(g, name) { fs.writeFileSync(path.join(OUT, `g_${name}.jpg`), g.jpeg); console.log('WROTE', name, Math.round(g.jpeg.length / 1024) + 'KB'); }
function writeCrop(g, name, x, y, w, h) {
  x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
  w = Math.min(W - x, Math.round(w)); h = Math.min(HGT - y, Math.round(h));
  const o = new PNG({ width: w, height: h });
  for (let r = 0; r < h; r++) g.png.data.copy(o.data, r * w * 4, ((y + r) * W + x) * 4, ((y + r) * W + x + w) * 4);
  fs.writeFileSync(path.join(OUT, `g_${name}.png`), PNG.sync.write(o));
  console.log('WROTE', name, `${w}x${h}`);
}
const js = expr => H.evalJs(expr);
const openFocus = (lg, idx = 1) => js(`(async()=>{ const S=window.__shelter; S.setLang('${lg}');
  const rows=document.querySelectorAll('#obs-panel .obs-region');
  if(rows.length>${idx}){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; rows[${idx}].dispatchEvent(ev); }
  await new Promise(r=>setTimeout(r,1400));
  const p=document.getElementById('obs-panel').getBoundingClientRect();
  return { x:p.left, y:p.top, w:p.width, h:p.height }; })()`);
const back = () => js(`(async()=>{ const b=document.querySelector('#obs-panel #obs-back-btn');
  if(b){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; b.dispatchEvent(ev); }
  await new Promise(r=>setTimeout(r,1100)); return 1; })()`);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await H.boot();
  win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT);
  await sleep(600);
  // 에러 리스너 선부착 — 오프스크린에서 정지 프레임은 정상 렌더로 위장한다(07-22 함정)
  await js(`(()=>{ window.__perr=null; window.addEventListener('error',e=>{window.__perr=(e.error&&e.error.stack)||e.message});
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container'); return 1 })()`);
  await sleep(1200);
  await js(`(async()=>{ const S=window.__shelter;
    const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    for(const rid of ['water','canned','battery','cloth','bandage','antiseptic']) S.state.res[rid]=(S.state.res[rid]||0)+5;
    S.setWeather('clear'); S.openObsMap(); S.setAerialHour(15);
    await new Promise(r=>setTimeout(r,2600)); return 1 })()`);

  // ① 관측 overview + CRT 위상 2컷(스윕 위치가 다른 순간) + 형광체 1:1 크롭
  const ov1 = await grab(); writeFull(ov1, 'obs_overview');
  writeCrop(ov1, 'zoom_phosphor', 420, 300, 480, 300);
  await sleep(1700);
  const ov2 = await grab(); writeFull(ov2, 'obs_phase2');
  writeCrop(ov2, 'zoom_jitter', 900, 620, 480, 300);

  // ② 시간대 4컷 — 광원 흐름(디렉터: 건조한 위성사진 금지)
  for (const [h, tag] of [[7, 'hour_morning'], [13, 'hour_noon'], [18.3, 'hour_dusk'], [22, 'hour_night']]) {
    await js(`(async()=>{ window.__shelter.setAerialHour(${h}); await new Promise(r=>setTimeout(r,1600)); return 1 })()`);
    writeFull(await grab(), tag);
  }
  await js(`(async()=>{ window.__shelter.setAerialHour(15); await new Promise(r=>setTimeout(r,1400)); return 1 })()`);

  // ③ focus × 3언어 — 전체 + 패널 1:1(준비물 행 가독 판정은 이 크롭에서)
  for (const lg of ['ko', 'en', 'ja']) {
    const r = await openFocus(lg);
    const g = await grab();
    writeFull(g, `focus_${lg}`);
    writeCrop(g, `panel_${lg}`, r.x - 14, r.y - 14, r.w + 28, r.h + 28);
    await back();
  }
  await js(`window.__shelter.setLang('ko'); 1`);

  // ④ 본편 복귀 — CRT 룩 해제 확인
  await js(`(async()=>{ window.__shelter.obsView.close(); await new Promise(r=>setTimeout(r,1800)); return 1 })()`);
  writeFull(await grab(), 'main_return');

  const err = await js('window.__perr');
  console.log('RESULT', err ? 'FAIL ' + err : 'OK');
  H.app.quit(); process.exit(err ? 2 : 0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
