/* #219 ja 픽셀 폰트(PixelMplus12) 적용 검증 — 실제 화면 픽셀 대조.
   함정 2건을 거쳐 여기까지 왔다:
     ① 캔버스 ctx.font은 unicode-range를 CSS와 다르게 처리 → 위양성
     ② 폭·높이 측정은 CJK가 전부 전각이고 라인박스는 스택 첫 폰트가 잡아 → 판별력 없음
   그래서 화면에 [본문 스택 / PixelMplus 지정 / 시스템 고딕 지정] 세 줄을 같은 자리에 그려 캡처하고,
   각 줄의 글자 픽셀을 비교한다. "스택 == PixelMplus" 이고 "스택 != 고딕"이면 적용된 것. */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 1280, HGT = 720;
function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(400);
  const rects = await H.evalJs(`(async()=>{
    await document.fonts.ready;
    await document.fonts.load("22px PixelMplus12", "水筒渇商かク々の探索");
    await new Promise(r=>setTimeout(r,600));
    const host=document.createElement('div');
    host.id='fontprobe';
    host.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#000;color:#fff;padding:0;';
    const JA='水筒渇商かク々の探索';
    // 22px = 픽셀 폰트 원본 그리드(11px)의 2배 — 글자 형태 차이가 픽셀로 또렷하게 드러난다
    const rows=[["stack","'DungGeunMo','PixelMplus12','Meiryo','Yu Gothic UI',sans-serif"],
                ["pm","'PixelMplus12'"],["gothic","'Meiryo','Yu Gothic UI',sans-serif"]];
    host.innerHTML = rows.map(([id,ff])=>
      '<div id="fp-'+id+'" style="font-family:'+ff+';font-size:22px;line-height:34px;white-space:pre;height:34px">'+JA+'</div>').join('');
    document.body.appendChild(host);
    await new Promise(r=>setTimeout(r,400));
    const out={};
    for(const [id] of rows){ const b=document.getElementById('fp-'+id).getBoundingClientRect();
      out[id]={x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)}; }
    return out;
  })()`);
  await sleep(400);
  const img = bgra2rgba((await win.webContents.capturePage()).toBitmap());
  const png = new PNG({ width: W, height: HGT }); img.copy(png.data);
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'fontprobe.png'), PNG.sync.write(png));
  // 각 줄의 잉크(밝은 픽셀) 마스크를 뽑아 비교
  const mask = (r) => {
    const m = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const i = (y * W + x) * 4;
      m.push(png.data[i] > 110 ? 1 : 0); // 흰 글자 / 검은 배경
    }
    return m;
  };
  // 세로 정렬 보정 필수: 스택은 라인박스를 첫 폰트(둥근모) 메트릭으로 잡아 같은 글자라도 몇 px 위아래로 어긋난다.
  //   보정 없이 인덱스로 비교하면 '같은 폰트인데 76% 불일치'라는 위음성이 난다(실제로 한 번 밟았다).
  const W2 = rects.stack.w, H2 = rects.stack.h;
  const shift = (m, dy) => { const o = new Array(W2 * H2).fill(0);
    for (let y = 0; y < H2; y++) { const sy = y + dy; if (sy < 0 || sy >= H2) continue;
      for (let x = 0; x < W2; x++) o[y * W2 + x] = m[sy * W2 + x]; } return o; };
  const raw = (a, b) => { let same = 0; for (let i = 0; i < a.length; i++) if (a[i] === b[i]) same++; return same / a.length * 100; };
  const cmp = (a, b) => { let best = 0; for (let dy = -8; dy <= 8; dy++) best = Math.max(best, raw(a, shift(b, dy))); return +best.toFixed(2); };
  const ms = mask(rects.stack), mp = mask(rects.pm), mg = mask(rects.gothic);
  const ink = m => m.reduce((s, v) => s + v, 0);
  console.log('JAFONT ' + JSON.stringify({
    rects, 잉크픽셀: { stack: ink(ms), pm: ink(mp), gothic: ink(mg) },
    일치율_스택vsPixelMplus: cmp(ms, mp), 일치율_스택vs고딕: cmp(ms, mg),
    판정: cmp(ms, mp) > 99 && cmp(ms, mg) < 99 ? 'PixelMplus 적용됨' : 'PixelMplus 미적용 의심'
  }, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
