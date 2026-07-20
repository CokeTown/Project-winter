// pda-mono.mjs — PDA 하우징 인광 듀오톤 프리베이크 (UI-PIXEL-UNITY §5.6 잔여 ①)
// 피드백 "PDA 혼자 리얼컬러라 붕 뜸" 처방: 휘도→슬레이트-그린 3스톱 램프 매핑(알파 보존).
// 원본은 보존하고 pda04m*/dock_pdam* 신규 산출 — pdaTexUrl 베이스 교체로 연동.
// 실행: node tools/pda-mono.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(pathToFileURL(join(ROOT, 'package.json')));
const { PNG } = require('pngjs');
const DIR = join(ROOT, 'public', 'img', 'ui');

// 슬레이트-그린 램프 (어둠→중간→밝음) — 터미널 패널 팔레트 계열(#3f6a46·#8cf5a6 친족)
const STOPS = [
  [7, 11, 8],      // #070b08
  [44, 63, 49],    // #2c3f31
  [147, 179, 154], // #93b39a
];
function ramp(t) {
  const seg = t < 0.5 ? 0 : 1, u = (t - seg * 0.5) * 2;
  const a = STOPS[seg], b = STOPS[seg + 1];
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * u));
}

const targets = readdirSync(DIR).filter(f => /^(pda04|dock_pda)(_px\d)?\.png$/.test(f));
for (const f of targets) {
  const png = PNG.sync.read(readFileSync(join(DIR, f)));
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const [r, g, b] = ramp(Math.max(0, Math.min(1, lum)));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  const out = f.replace(/^pda04/, 'pda04m').replace(/^dock_pda/, 'dock_pdam');
  writeFileSync(join(DIR, out), PNG.sync.write(png));
  console.log(`${f} -> ${out}`);
}
console.log(`done: ${targets.length} files`);
