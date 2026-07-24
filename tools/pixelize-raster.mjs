// pixelize-raster.mjs — 큰 래스터(PDA·일지·종이)를 "진짜 도트"로 영구 픽셀화 (AI 티 제거).
//   icon-pixelize.mjs 코어(로고 파이프라인) 재사용 + 직사각 그리드(종횡비 보존).
//   처방: 박스 다운스케일(알파 가중) → median-cut 팔레트(K색) → 게이티드 오더드 디더 → nearest ×UP.
// 사용: node pixelize-raster.mjs --src <in.png> --out <out.png> [--gw 120] [--k 28] [--up 3] [--dither on] [--prev <preview.png>]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('G:/Project_winter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const opt = { gw: 120, k: 28, up: 3, dither: 'on', src: '', out: '', prev: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--gw') opt.gw = parseInt(argv[++i], 10);
  else if (a === '--k') opt.k = parseInt(argv[++i], 10);
  else if (a === '--up') opt.up = parseInt(argv[++i], 10);
  else if (a === '--dither') opt.dither = argv[++i];
  else if (a === '--src') opt.src = argv[++i];
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--prev') opt.prev = argv[++i];
}
if (!opt.src || !opt.out) { console.error('need --src and --out'); process.exit(1); }
const png = PNG.sync.read(fs.readFileSync(opt.src));
const W = png.width, H = png.height;
const GW = opt.gw, GH = Math.max(1, Math.round(GW * H / W)); // 종횡비 보존
const K = opt.k, UP = opt.up, DITHER = opt.dither === 'on';

// ① 박스 다운스케일 (알파 가중, floor 경계 가변 셀) + 알파 하드 threshold
const low = new Float64Array(GW * GH * 4);
for (let ly = 0; ly < GH; ly++) for (let lx = 0; lx < GW; lx++) {
  const x0 = Math.floor(lx * W / GW), x1 = Math.max(x0 + 1, Math.floor((lx + 1) * W / GW));
  const y0 = Math.floor(ly * H / GH), y1 = Math.max(y0 + 1, Math.floor((ly + 1) * H / GH));
  let r = 0, g = 0, b = 0, a = 0, aw = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4, al = png.data[i + 3] / 255;
    r += png.data[i] * al; g += png.data[i + 1] * al; b += png.data[i + 2] * al; a += png.data[i + 3]; aw += al; n++;
  }
  const o = (ly * GW + lx) * 4;
  low[o] = aw > 0 ? r / aw : 0; low[o + 1] = aw > 0 ? g / aw : 0; low[o + 2] = aw > 0 ? b / aw : 0;
  low[o + 3] = (a / n) >= 128 ? 255 : 0;
}

// ② median-cut 팔레트 (이미지 자체 불투명 픽셀 1회)
function medianCut(px, depth) {
  if (depth === 0 || px.length === 0) {
    const m = [0, 0, 0]; for (const q of px) { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }
    const n = px.length || 1; return [[m[0] / n, m[1] / n, m[2] / n]];
  }
  let mn = [255, 255, 255], mx = [0, 0, 0];
  for (const q of px) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], q[c]); mx[c] = Math.max(mx[c], q[c]); }
  let ch = 0, best = -1; for (let c = 0; c < 3; c++) { const r = mx[c] - mn[c]; if (r > best) { best = r; ch = c; } }
  px.sort((a, b) => a[ch] - b[ch]); const mid = px.length >> 1;
  return [...medianCut(px.slice(0, mid), depth - 1), ...medianCut(px.slice(mid), depth - 1)];
}
const pool = [];
for (let i = 0; i < GW * GH; i++) if (low[i * 4 + 3] === 255) pool.push([low[i * 4], low[i * 4 + 1], low[i * 4 + 2]]);
const palette = medianCut(pool, Math.round(Math.log2(K)));
const d2 = (a, b) => { const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return dr * dr + dg * dg + db * db; };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + 0.5) / 16));

// ③ 매핑 + 인접 2색 게이티드 오더드 디더
for (let ly = 0; ly < GH; ly++) for (let lx = 0; lx < GW; lx++) {
  const o = (ly * GW + lx) * 4; if (low[o + 3] === 0) continue;
  const c = [low[o], low[o + 1], low[o + 2]];
  let i1 = 0, i2 = 0, b1 = Infinity, b2 = Infinity;
  for (let i = 0; i < palette.length; i++) { const d = d2(c, palette[i]); if (d < b1) { b2 = b1; i2 = i1; b1 = d; i1 = i; } else if (d < b2) { b2 = d; i2 = i; } }
  let pick = i1;
  if (DITHER && i2 !== i1) { const da = Math.sqrt(b1), db = Math.sqrt(b2); const t = da / (da + db || 1); if (t > 0.28 && t > BAYER[ly & 3][lx & 3]) pick = i2; }
  low[o] = palette[pick][0]; low[o + 1] = palette[pick][1]; low[o + 2] = palette[pick][2];
}

// nearest ×UP 출력
function upscale(mul) {
  const out = new PNG({ width: GW * mul, height: GH * mul });
  for (let ly = 0; ly < GH; ly++) for (let lx = 0; lx < GW; lx++) {
    const o = (ly * GW + lx) * 4, R = Math.round(low[o]), Gg = Math.round(low[o + 1]), B = Math.round(low[o + 2]), A = low[o + 3];
    for (let dy = 0; dy < mul; dy++) for (let dx = 0; dx < mul; dx++) {
      const oi = ((ly * mul + dy) * out.width + (lx * mul + dx)) * 4;
      out.data[oi] = R; out.data[oi + 1] = Gg; out.data[oi + 2] = B; out.data[oi + 3] = A;
    }
  }
  return out;
}
fs.writeFileSync(opt.out, PNG.sync.write(upscale(UP)));
if (opt.prev) fs.writeFileSync(opt.prev, PNG.sync.write(upscale(Math.max(UP, 4))));
console.log(`OK ${opt.src} → ${GW}x${GH} K=${palette.length} up=${UP} → ${opt.out}`);
