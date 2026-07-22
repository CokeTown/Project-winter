// icon-duotone.mjs — 잔류 도트 인광 듀오톤 프리베이크 (#216, 디렉터 승인 2026-07-22)
// 가구 47·지구 12·셸터 16 = 75종을 PDA 램프(pda-mono.mjs와 동일 3스톱)로 톤 통일.
// region 9종은 제외 — 리얼컬러 일러라 듀오톤이 식별성을 죽임 → 글리프 재제작(icon-semiotic.mjs).
// ⚠️ 멱등 아님(휘도→색 매핑이라 재적용 시 색이 재변형) — 원본은 git 히스토리(972eb95 이전)가 정본.
//    재실행하지 말 것. 원본에서 다시 굽려면 git에서 복원 후 1회 실행.
// 실행: node tools/icon-duotone.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(pathToFileURL(join(ROOT, 'package.json')));
const { PNG } = require('pngjs');
const DIR = join(ROOT, 'public', 'img', 'icons');

// 슬레이트-그린 램프 (pda-mono.mjs 동일 — 터미널 패널 팔레트 친족)
const STOPS = [
  [7, 11, 8],
  [44, 63, 49],
  [147, 179, 154],
];
function ramp(t) {
  const seg = t < 0.5 ? 0 : 1, u = (t - seg * 0.5) * 2;
  const a = STOPS[seg], b = STOPS[seg + 1];
  return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * u));
}

let n = 0;
for (const f of readdirSync(DIR)) {
  if (!/^icon_(furn|shelter|district)_.*\.png$/.test(f)) continue; // region 제외(글리프 재제작)
  const png = PNG.sync.read(readFileSync(join(DIR, f)));
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const [r, g, b] = ramp(Math.max(0, Math.min(1, lum)));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  writeFileSync(join(DIR, f), PNG.sync.write(png));
  n++;
}
console.log(`duotone: ${n}종 프리베이크 (furn/shelter/district)`);
