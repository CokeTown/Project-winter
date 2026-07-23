// v6 잔여 3포맷 — 라이브러리 캡슐(1200×1800) · 히어로(3840×1240, 로고 없음) · 라이브러리 로고(1280×720, 투명)
import { createRequire } from 'module';
const require = createRequire('G:/Project_winter/package.json');
const { PNG } = require('pngjs');
import fs from 'fs';
const rd = f => PNG.sync.read(fs.readFileSync(f));
const wr = (f, p) => fs.writeFileSync(f, PNG.sync.write(p));
const crop = (s, sx, sy, sw, sh) => { const d = new PNG({ width: sw, height: sh }); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const si = ((y + sy) * s.width + (x + sx)) << 2, di = (y * sw + x) << 2; for (let k = 0; k < 4; k++) d.data[di + k] = s.data[si + k]; } return d; };
const down = (s, W, H) => { const d = new PNG({ width: W, height: H }), sx = s.width / W, sy = s.height / H; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X0 = Math.floor(x * sx), X1 = Math.max(X0 + 1, Math.floor((x + 1) * sx)), Y0 = Math.floor(y * sy), Y1 = Math.max(Y0 + 1, Math.floor((y + 1) * sy)); let r = 0, g = 0, b = 0, a = 0, n = 0; for (let yy = Y0; yy < Y1; yy++) for (let xx = X0; xx < X1; xx++) { const si = (yy * s.width + xx) << 2; r += s.data[si]; g += s.data[si + 1]; b += s.data[si + 2]; a += s.data[si + 3]; n++; } const di = (y * W + x) << 2; d.data[di] = r / n | 0; d.data[di + 1] = g / n | 0; d.data[di + 2] = b / n | 0; d.data[di + 3] = a / n | 0; } return d; };
const over = (base, ov, dx, dy) => { for (let y = 0; y < ov.height; y++) for (let x = 0; x < ov.width; x++) { const bx = x + dx, by = y + dy; if (bx < 0 || by < 0 || bx >= base.width || by >= base.height) continue; const oi = (y * ov.width + x) << 2, bi = (by * base.width + bx) << 2; const a = ov.data[oi + 3] / 255; if (a <= 0) continue; for (let k = 0; k < 3; k++) base.data[bi + k] = Math.round(ov.data[oi + k] * a + base.data[bi + k] * (1 - a)); base.data[bi + 3] = Math.max(base.data[bi + 3], ov.data[oi + 3]); } return base; };
const trim = s => { let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1; for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (s.data[((y * s.width + x) << 2) + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return crop(s, x0, y0, x1 - x0 + 1, y1 - y0 + 1); };
const scrim = (p, hRatio, maxDim) => { const H = Math.round(p.height * hRatio); for (let y = 0; y < H; y++) { const t = 1 - y / H, f = 1 - maxDim * t * t; for (let x = 0; x < p.width; x++) { const i = (y * p.width + x) << 2; p.data[i] = p.data[i] * f | 0; p.data[i + 1] = p.data[i + 1] * f | 0; p.data[i + 2] = p.data[i + 2] * f | 0; } } return p; };
const WM = trim(rd('assets-src/art/out/steam2/final_logo_wordmark.png'));
const OUT = 'scratchpad/cap6/out';
// ① 라이브러리 캡슐 1200×1800 — 세로 캡슐과 동일 문법(상단 로고 52%)
{
  const art = down(rd('scratchpad/cap6/fix_lib.png'), 1200, 1800);
  scrim(art, 0.30, 0.50);
  const wmW = Math.round(1200 * 0.52), wmH = Math.round(WM.height * (wmW / WM.width));
  over(art, down(WM, wmW, wmH), Math.round((1200 - wmW) / 2), Math.round((1800 - wmH) * 0.05));
  wr(OUT + '/library_capsule.png', art);
  console.log('library_capsule 1200x1800 logo ' + wmW + 'x' + wmH);
}
// ② 라이브러리 히어로 3840×1240 — 로고 없음(스팀이 library_logo를 위에 얹는다). 좌하단 로고 자리 비움.
{
  const art = down(rd('scratchpad/cap6/fix_hero.png'), 3840, 1240);
  wr(OUT + '/library_hero.png', art);
  console.log('library_hero 3840x1240 (로고 없음 — 스팀 오버레이)');
}
// ③ 라이브러리 로고 1280×720 — 투명 배경 워드마크(히어로 위 오버레이용)
{
  const canvas = new PNG({ width: 1280, height: 720 });
  canvas.data.fill(0);
  const wmW = 1120, wmH = Math.round(WM.height * (wmW / WM.width));
  over(canvas, down(WM, wmW, wmH), Math.round((1280 - wmW) / 2), Math.round((720 - wmH) / 2));
  wr(OUT + '/library_logo.png', canvas);
  wr(OUT + '/steam_logo.png', canvas);
  console.log('library_logo/steam_logo 1280x720 투명 · 워드마크 ' + wmW + 'x' + wmH);
}
