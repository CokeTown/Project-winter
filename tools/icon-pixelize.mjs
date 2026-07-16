// icon-pixelize.mjs — UI 아이콘 전량 "진짜 도트" 규격화 (AI 티 제거 처방 1번)
// pixelfix2.mjs(로고 파이프라인, 커밋 23b9bdf) 코어 재사용 + 확장:
//   ① 공용 팔레트: 아이콘 "세트 전체"의 불투명 픽셀로 median-cut 1회 → 전 아이콘이 같은 K색 사용
//      (낱장 팔레트 = 세트 불균질 = AI 티의 1원인. 공용 팔레트가 사람 아이코노그래퍼의 규율을 재현)
//   ② 가변 박스 셀: 256/24처럼 비정수 배율도 floor 경계 박스 평균 (출력 균일성은 nearest ×UP가 보장)
//   ③ 알파 하드 threshold: AI 글로우/헤일로의 반투명 가장자리 절삭
// 사용: node icon-pixelize.mjs --grid 24 --k 32 --up 8 --out <dir> --src <dir> [--src <dir2> ...]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('G:/Project_winter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const opt = { grid: 24, k: 32, up: 8, dither: 'on', out: '', src: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--grid') opt.grid = parseInt(argv[++i], 10);
  else if (a === '--k') opt.k = parseInt(argv[++i], 10);
  else if (a === '--up') opt.up = parseInt(argv[++i], 10);
  else if (a === '--dither') opt.dither = argv[++i];
  else if (a === '--out') opt.out = argv[++i];
  else if (a === '--src') opt.src.push(argv[++i]);
}
if (!opt.out || !opt.src.length) { console.error('need --out and --src'); process.exit(1); }
fs.mkdirSync(opt.out, { recursive: true });
const G = opt.grid, K = opt.k, UP = opt.up, DITHER = opt.dither === 'on';

// ── 소스 수집 (뒤 --src가 같은 파일명을 덮음 → 신규분 우선 규칙)
const files = new Map();
for (const dir of opt.src) {
  for (const f of fs.readdirSync(dir)) {
    if (f.toLowerCase().endsWith('.png')) files.set(f, path.join(dir, f));
  }
}

// ── ① 다운스케일 (알파 가중 박스, floor 경계 가변 셀) + 알파 threshold
function downGrid(png) {
  const W = png.width, H = png.height, low = new Float64Array(G * G * 4);
  for (let ly = 0; ly < G; ly++) for (let lx = 0; lx < G; lx++) {
    const x0 = Math.floor(lx * W / G), x1 = Math.max(x0 + 1, Math.floor((lx + 1) * W / G));
    const y0 = Math.floor(ly * H / G), y1 = Math.max(y0 + 1, Math.floor((ly + 1) * H / G));
    let r = 0, g = 0, b = 0, a = 0, aw = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, al = png.data[i + 3] / 255;
      r += png.data[i] * al; g += png.data[i + 1] * al; b += png.data[i + 2] * al; a += png.data[i + 3]; aw += al; n++;
    }
    const o = (ly * G + lx) * 4;
    low[o] = aw > 0 ? r / aw : 0; low[o + 1] = aw > 0 ? g / aw : 0; low[o + 2] = aw > 0 ? b / aw : 0;
    low[o + 3] = (a / n) >= 128 ? 255 : 0;
  }
  return low;
}

// ── ② 공용 팔레트 (median-cut, 세트 전체 1회)
function medianCut(pixels, depth) {
  if (depth === 0 || pixels.length === 0) {
    const m = [0, 0, 0]; for (const q of pixels) { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }
    const n = pixels.length || 1; return [[m[0] / n, m[1] / n, m[2] / n]];
  }
  let mn = [255, 255, 255], mx = [0, 0, 0];
  for (const q of pixels) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], q[c]); mx[c] = Math.max(mx[c], q[c]); }
  let ch = 0, best = -1; for (let c = 0; c < 3; c++) { const r = mx[c] - mn[c]; if (r > best) { best = r; ch = c; } }
  pixels.sort((a, b) => a[ch] - b[ch]);
  const mid = pixels.length >> 1;
  return [...medianCut(pixels.slice(0, mid), depth - 1), ...medianCut(pixels.slice(mid), depth - 1)];
}

const lows = new Map(), pool = [];
for (const [name, p] of files) {
  try {
    const low = downGrid(PNG.sync.read(fs.readFileSync(p)));
    lows.set(name, low);
    for (let i = 0; i < G * G; i++) if (low[i * 4 + 3] === 255) pool.push([low[i * 4], low[i * 4 + 1], low[i * 4 + 2]]);
  } catch (e) { console.error('SKIP', name, e.message); }
}
const palette = medianCut(pool, Math.round(Math.log2(K)));
const d2 = (a, b) => { const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return dr * dr + dg * dg + db * db; };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + 0.5) / 16));

// ── ③ 매핑 + 인접 2색 오더드 디더 + nearest ×UP
for (const [name, low] of lows) {
  for (let ly = 0; ly < G; ly++) for (let lx = 0; lx < G; lx++) {
    const o = (ly * G + lx) * 4; if (low[o + 3] === 0) continue;
    const c = [low[o], low[o + 1], low[o + 2]];
    let i1 = 0, i2 = 0, b1 = Infinity, b2 = Infinity;
    for (let i = 0; i < palette.length; i++) { const d = d2(c, palette[i]); if (d < b1) { b2 = b1; i2 = i1; b1 = d; i1 = i; } else if (d < b2) { b2 = d; i2 = i; } }
    let pick = i1;
    // 디더 밴드 게이트: 거의-단색 영역(t<0.28)은 디더 없이 최근접 고정 — 평면 반점(프린터 결) 방지.
    //   진짜 그라데이션(두 색의 중간, t 0.28~0.5)에서만 오더드 디더가 든다.
    if (DITHER && i2 !== i1) { const da = Math.sqrt(b1), db = Math.sqrt(b2); const t = da / (da + db || 1); if (t > 0.28 && t > BAYER[ly & 3][lx & 3]) pick = i2; }
    low[o] = palette[pick][0]; low[o + 1] = palette[pick][1]; low[o + 2] = palette[pick][2];
  }
  const out = new PNG({ width: G * UP, height: G * UP });
  for (let ly = 0; ly < G; ly++) for (let lx = 0; lx < G; lx++) {
    const o = (ly * G + lx) * 4, R = Math.round(low[o]), Gg = Math.round(low[o + 1]), B = Math.round(low[o + 2]), A = low[o + 3];
    for (let dy = 0; dy < UP; dy++) for (let dx = 0; dx < UP; dx++) {
      const oi = ((ly * UP + dy) * out.width + (lx * UP + dx)) * 4;
      out.data[oi] = R; out.data[oi + 1] = Gg; out.data[oi + 2] = B; out.data[oi + 3] = A;
    }
  }
  fs.writeFileSync(path.join(opt.out, name), PNG.sync.write(out));
}

// 팔레트 스와치 (검수용)
const sw = 16, swp = new PNG({ width: sw * palette.length, height: sw });
palette.forEach((c, i) => {
  for (let y = 0; y < sw; y++) for (let x = 0; x < sw; x++) {
    const o = (y * swp.width + i * sw + x) * 4;
    swp.data[o] = Math.round(c[0]); swp.data[o + 1] = Math.round(c[1]); swp.data[o + 2] = Math.round(c[2]); swp.data[o + 3] = 255;
  }
});
fs.writeFileSync(path.join(opt.out, '_palette.png'), PNG.sync.write(swp));
console.log(`OK icons=${lows.size} grid=${G} K=${palette.length} up=${UP} → ${opt.out}`);
