// icon-catset.mjs — #230 고양이 세트 가구 아이콘 3종 (절차 도트 작화 — AI 생성 금지 룰 준수)
//   16×16 도트 ×12 = 192px, 팔레트는 icon-duotone.mjs STOPS(슬레이트-그린 3스톱) 직접 사용 —
//   듀오톤 프리베이크(비멱등)를 재실행하지 않고도 기존 75종과 톤이 일치한다.
// 실행: node tools/icon-catset.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(pathToFileURL(join(ROOT, 'package.json')));
const { PNG } = require('pngjs');
const DIR = join(ROOT, 'public', 'img', 'icons');

// 듀오톤 램프 3스톱 + 중간 다크 (# = 밝음(상면·천), o = 중간(목재·플랫폼), x = 어두움(기둥·그림자))
const PAL = { '#': [147, 179, 154], o: [44, 63, 49], x: [20, 29, 23] };

const ICONS = {
  // 캣타워: 좌측 긴 기둥+꼭대기 패드, 우측 중단 플랫폼, 바닥 받침판
  icon_furn_cattower: [
    '................',
    '.######.........',
    '.#oooo#.........',
    '...xx...........',
    '...xx...........',
    '...xx.....#####.',
    '...xx.....#ooo#.',
    '...xx.......xx..',
    '...xx.......xx..',
    '...xx.......xx..',
    '...xx.......xx..',
    '...xx.......xx..',
    '...xx.......xx..',
    '..oooooooooooo..',
    '.xxxxxxxxxxxxxx.',
    '................',
  ],
  // 고양이 해먹: A-프레임 다리 + 행어봉 + 늘어진 슬링(밝은 천)
  icon_furn_cathammock: [
    '................',
    '................',
    '..x..........x..',
    '.xxxxxxxxxxxxxx.',
    '..x#........#x..',
    '..x.#......#.x..',
    '..x..##..##..x..',
    '..x...####...x..',
    '..x...#oo#...x..',
    '..x..........x..',
    '.x.x........x.x.',
    '.x.x........x.x.',
    'x...x......x...x',
    'x...x......x...x',
    'x...x......x...x',
    '................',
  ],
  // 스크래처: 로프 기둥(줄무늬) + 상단 캡 + 받침
  icon_furn_catscratcher: [
    '................',
    '.....####.......',
    '.....#oo#.......',
    '......oo........',
    '......oo........',
    '......xx........',
    '......oo........',
    '......oo........',
    '......xx........',
    '......oo........',
    '......oo........',
    '......xx........',
    '......oo........',
    '....########....',
    '...xxxxxxxxxx...',
    '................',
  ],
};

const S = 12; // 16 → 192
for (const [name, rows] of Object.entries(ICONS)) {
  const png = new PNG({ width: 192, height: 192 });
  for (let gy = 0; gy < 16; gy++) for (let gx = 0; gx < 16; gx++) {
    const ch = rows[gy][gx];
    if (ch === '.') continue;
    const [r, g, b] = PAL[ch];
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const i = ((gy * S + py) * 192 + gx * S + px) * 4;
      png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = 255;
    }
  }
  writeFileSync(join(DIR, name + '.png'), PNG.sync.write(png));
  console.log(name + '.png OK');
}
