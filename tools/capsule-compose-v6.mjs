// 캡슐 v6 — 이전(정본) 워드마크 축소 + 규격별 전용 촬영본(밴드 0). 2배 촬영 → 정수 2 다운샘플.
import { createRequire } from 'module';
const require = createRequire('G:/Project_winter/package.json');
const { PNG } = require('pngjs');
import fs from 'fs';
const rd = f => PNG.sync.read(fs.readFileSync(f));
const wr = (f, p) => fs.writeFileSync(f, PNG.sync.write(p));
const crop = (s, sx, sy, sw, sh) => { const d = new PNG({ width: sw, height: sh }); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const si = ((y + sy) * s.width + (x + sx)) << 2, di = (y * sw + x) << 2; for (let k = 0; k < 4; k++) d.data[di + k] = s.data[si + k]; } return d; };
const down = (s, W, H) => { const d = new PNG({ width: W, height: H }), sx = s.width / W, sy = s.height / H; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X0 = Math.floor(x * sx), X1 = Math.max(X0 + 1, Math.floor((x + 1) * sx)), Y0 = Math.floor(y * sy), Y1 = Math.max(Y0 + 1, Math.floor((y + 1) * sy)); let r = 0, g = 0, b = 0, a = 0, n = 0; for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) { const si = (yy * s.width + xx) << 2; r += s.data[si]; g += s.data[si + 1]; b += s.data[si + 2]; a += s.data[si + 3]; n++; } const di = (y * W + x) << 2; d.data[di] = r / n | 0; d.data[di + 1] = g / n | 0; d.data[di + 2] = b / n | 0; d.data[di + 3] = a / n | 0; } return d; };
const over = (base, ov, dx, dy) => { for (let y = 0; y < ov.height; y++) for (let x = 0; x < ov.width; x++) { const bx = x + dx, by = y + dy; if (bx < 0 || by < 0 || bx >= base.width || by >= base.height) continue; const oi = (y * ov.width + x) << 2, bi = (by * base.width + bx) << 2; const a = ov.data[oi + 3] / 255; if (a <= 0) continue; for (let k = 0; k < 3; k++) base.data[bi + k] = Math.round(ov.data[oi + k] * a + base.data[bi + k] * (1 - a)); base.data[bi + 3] = 255; } return base; };
const trim = s => { let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1; for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (s.data[((y * s.width + x) << 2) + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return crop(s, x0, y0, x1 - x0 + 1, y1 - y0 + 1); };
// 상단 스크림: 로고 가독을 위한 소프트 그라디언트(씬 전체 디밍 대신 — 씬 밝기를 지킨다)
const scrim = (p, hRatio, maxDim) => { const H = Math.round(p.height * hRatio); for (let y = 0; y < H; y++) { const t = 1 - y / H, f = 1 - maxDim * t * t; for (let x = 0; x < p.width; x++) { const i = (y * p.width + x) << 2; p.data[i] = p.data[i] * f | 0; p.data[i + 1] = p.data[i + 1] * f | 0; p.data[i + 2] = p.data[i + 2] * f | 0; } } return p; };
const WM = trim(rd('assets-src/art/out/steam2/final_logo_wordmark.png'));
console.log('wordmark bbox', WM.width + 'x' + WM.height);
const OUT = 'scratchpad/cap6/out'; fs.mkdirSync(OUT, { recursive: true });
const build = (srcFile, tw, th, wmRatio, wxr, wyr, scrimH, scrimD, outName) => {
  const art = down(rd(srcFile), tw, th);
  scrim(art, scrimH, scrimD);
  const wmW = Math.round(tw * wmRatio), wmH = Math.round(WM.height * (wmW / WM.width));
  over(art, down(WM, wmW, wmH), Math.round((tw - wmW) * wxr), Math.round((th - wmH) * wyr));
  wr(OUT + '/' + outName, art);
  console.log(outName, tw + 'x' + th, 'logo ' + wmW + 'x' + wmH + ' (' + Math.round(wmRatio * 100) + '%)');
};
build('scratchpad/cap6/fix_header.png', 920, 430, 0.30, 0.05, 0.07, 0.40, 0.45, 'header_capsule.png');
build('scratchpad/cap6/fix_main.png', 1232, 706, 0.28, 0.05, 0.06, 0.36, 0.45, 'steam_main_capsule.png');
build('scratchpad/cap6/fix_vert.png', 748, 896, 0.52, 0.5, 0.05, 0.30, 0.50, 'vertical_capsule.png');
// 스몰(462×174 @2x=231×87 표시) — 헤더 소스 재활용, 로고 비중만 상향
build('scratchpad/cap6/fix_header.png', 462, 174, 0.44, 0.06, 0.5, 0.60, 0.40, 'steam_small_capsule.png');
