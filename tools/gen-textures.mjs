// 텍스처 에셋 파이프라인: 게임의 절차 텍스처를 실제 PNG 파일로 출력
// 사용: npm run assets:tex  →  assets-src/textures/*.png
// (Blender/Meshy 왕복이나 외부 아트 작업의 기준 텍스처로 사용)
import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'assets-src/textures';
mkdirSync(OUT, { recursive: true });

/* 미니 2D 컨텍스트 (fillRect 계열만 — 게임 텍스처가 쓰는 부분집합) */
function makeCtx(w, h) {
  const png = new PNG({ width: w, height: h });
  let fill = [0, 0, 0, 255];
  const parse = s => {
    if (s.startsWith('#')) {
      const n = parseInt(s.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
    }
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? [+m[1], +m[2], +m[3], m[4] != null ? Math.round(+m[4] * 255) : 255] : [0, 0, 0, 255];
  };
  const blendPx = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    const a = fill[3] / 255;
    png.data[i] = Math.round(fill[0] * a + png.data[i] * (1 - a));
    png.data[i + 1] = Math.round(fill[1] * a + png.data[i + 1] * (1 - a));
    png.data[i + 2] = Math.round(fill[2] * a + png.data[i + 2] * (1 - a));
    png.data[i + 3] = 255;
  };
  const ctx = {
    set fillStyle(s) { fill = parse(s); },
    set strokeStyle(s) { fill = parse(s); },
    lineWidth: 1,
    fillRect(x, y, rw, rh) {
      for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) blendPx(xx, yy);
    },
    strokeRect(x, y, rw, rh) {
      const lw = Math.max(1, Math.round(ctx.lineWidth));
      ctx.fillRect(x, y, rw, lw); ctx.fillRect(x, y + rh - lw, rw, lw);
      ctx.fillRect(x, y, lw, rh); ctx.fillRect(x + rw - lw, y, lw, rh);
    },
    _path: [],
    beginPath() { ctx._path = []; },
    moveTo(x, y) { ctx._path.push([x, y]); },
    lineTo(x, y) { ctx._path.push([x, y]); },
    stroke() {
      for (let i = 1; i < ctx._path.length; i++) {
        const [x0, y0] = ctx._path[i - 1], [x1, y1] = ctx._path[i];
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
        for (let s = 0; s <= steps; s++) blendPx(x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps);
      }
    },
  };
  return { ctx, png };
}
function save(name, draw, w = 128, h = 128) {
  const { ctx, png } = makeCtx(w, h);
  draw(ctx, w, h);
  writeFileSync(`${OUT}/${name}.png`, PNG.sync.write(png));
  console.log(`  ${name}.png (${w}x${h})`);
}

/* ── src/game.js 의 절차 텍스처와 동일한 알고리즘 ── */
save('floor_wood', (g, w, h) => {
  g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
  const plank = h / 4;
  for (let r = 0; r < 4; r++) {
    g.fillStyle = ['#8f6f4c', '#846544', '#967551', '#7e6040'][r % 4];
    g.fillRect(0, r * plank, w, plank);
    g.fillStyle = '#5d452c'; g.fillRect(0, r * plank, w, 2);
    const off = (r * 53) % w;
    g.fillRect(off, r * plank, 2, plank);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 14; i++) g.fillRect((off + i * 31) % w, r * plank + (i * 13) % plank, 5, 1);
  }
});
save('wall_wood', (g, w, h) => {
  g.fillStyle = '#a08258'; g.fillRect(0, 0, w, h);
  const plank = w / 5;
  for (let c = 0; c < 5; c++) {
    g.fillStyle = ['#a5875c', '#9a7c52', '#ab8d63', '#94774e', '#a1835a'][c];
    g.fillRect(c * plank, 0, plank, h);
    g.fillStyle = '#6e5636'; g.fillRect(c * plank, 0, 2, h);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 10; i++) g.fillRect(c * plank + 4 + (i * 7) % (plank - 6), (c * 37 + i * 29) % h, 2, 6);
  }
});
save('metal_rust', (g, w, h) => {
  g.fillStyle = '#5c6670'; g.fillRect(0, 0, w, h);
  const rib = w / 8;
  for (let c = 0; c < 8; c++) {
    g.fillStyle = c % 2 ? '#525b64' : '#616b76';
    g.fillRect(c * rib, 0, rib, h);
    g.fillStyle = '#3d444c'; g.fillRect(c * rib, 0, 2, h);
  }
  g.fillStyle = 'rgba(140,84,52,0.55)';
  for (let i = 0; i < 9; i++) {
    const x = (i * 41 + 13) % w, y = (i * 67 + 30) % h;
    g.fillRect(x, y, 5 + (i * 7) % 12, 3 + (i * 5) % 9);
  }
  g.fillStyle = 'rgba(110,62,38,0.5)';
  for (let i = 0; i < 6; i++) g.fillRect((i * 53 + 5) % w, h - 14 - (i * 11) % 10, 4 + (i * 9) % 14, 6);
});
save('plywood', (g, w, h) => {
  g.fillStyle = '#9c8563'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7a6749'; g.lineWidth = 2;
  g.strokeRect(1, 1, w / 2 - 2, h - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h - 2);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 22; i++) g.fillRect((i * 29 + 7) % w, (i * 17 + 3) % h, 8, 1);
  g.fillStyle = 'rgba(90,60,40,0.35)';
  for (let i = 0; i < 4; i++) g.fillRect((i * 47 + 20) % w, (i * 61 + 12) % h, 10, 7);
});
save('brick', (g, w, h) => {
  g.fillStyle = '#8a5138'; g.fillRect(0, 0, w, h);
  const bh = h / 8, bw = w / 4;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 5; c++) {
      const off = r % 2 ? bw / 2 : 0;
      g.fillStyle = ['#94583c', '#84492f', '#9c6244', '#7d452c'][(r * 3 + c + 4) % 4];
      g.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
    }
  }
  g.fillStyle = 'rgba(40,28,20,0.5)';
  for (let i = 0; i < 12; i++) g.fillRect((i * 43 + 11) % w, (i * 29 + 5) % h, 6 + (i * 5) % 10, 3);
});
save('subway_tile', (g, w, h) => {
  g.fillStyle = '#7a8a7e'; g.fillRect(0, 0, w, h);
  const tw = w / 6, th = h / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 7; c++) {
      const off = r % 2 ? tw / 2 : 0;
      g.fillStyle = ['#84948a', '#7c8c80', '#8d9c90', '#75857a'][(r * 5 + c + 8) % 4];
      g.fillRect(c * tw + off + 1, r * th + 1, tw - 2, th - 2);
    }
  }
  g.fillStyle = 'rgba(30,35,30,0.4)';
  for (let i = 0; i < 10; i++) g.fillRect((i * 47 + 9) % w, (i * 31 + 4) % h, 5 + (i * 3) % 8, 3);
});
save('concrete', (g, w, h) => {
  g.fillStyle = '#6a6a68'; g.fillRect(0, 0, w, h);
  const tile = w / 2;
  g.strokeStyle = '#4e4e4c'; g.lineWidth = 2;
  g.strokeRect(1, 1, tile - 2, tile - 2); g.strokeRect(tile + 1, 1, tile - 2, tile - 2);
  g.strokeRect(1, tile + 1, tile - 2, tile - 2); g.strokeRect(tile + 1, tile + 1, tile - 2, tile - 2);
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < 26; i++) g.fillRect((i * 37 + 5) % w, (i * 23 + 9) % h, 3 + (i % 4), 1);
  g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(10, 20); g.lineTo(34, 44); g.lineTo(30, 70); g.stroke();
  g.beginPath(); g.moveTo(90, 100); g.lineTo(74, 82); g.lineTo(84, 60); g.stroke();
});

console.log('텍스처 생성 완료 →', OUT);
