// icon-kitchenset.mjs — #231 주방 세트 가구 아이콘 4종 (절차 도트 작화 — icon-catset.mjs 문법)
//   16×16 도트 ×12 = 192px, icon-duotone.mjs STOPS 팔레트 직접 사용(프리베이크 재실행 불요).
// 실행: node tools/icon-kitchenset.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(pathToFileURL(join(ROOT, 'package.json')));
const { PNG } = require('pngjs');
const DIR = join(ROOT, 'public', 'img', 'icons');

const PAL = { '#': [147, 179, 154], o: [44, 63, 49], x: [20, 29, 23] };

const ICONS = {
  // 조리대: 밝은 상판 + 캐비닛 몸통 + 문 2 + 도마
  icon_furn_counter: [
    '................',
    '................',
    '..##............',
    '..##............',
    '.##############.',
    '.##############.',
    '..oooooooooooo..',
    '..oooooooooooo..',
    '..oo.x....x.oo..',
    '..oo.x....x.oo..',
    '..oooooooooooo..',
    '..oooooooooooo..',
    '..oooooooooooo..',
    '..xx........xx..',
    '................',
    '................',
  ],
  // 주전자: 몸통 + 주둥이 + 손잡이
  icon_furn_kettle: [
    '................',
    '................',
    '.....xxxx.......',
    '....x....x......',
    '....x....x......',
    '......##........',
    '....######......',
    '...########..o..',
    '..o########oo...',
    '..o#########....',
    '...#########....',
    '...oooooooo.....',
    '....xxxxxx......',
    '................',
    '................',
    '................',
  ],
  // 식탁 세트: 상판 위 접시 2 + 냄비, 다리
  icon_furn_dinnerset: [
    '................',
    '................',
    '................',
    '.......oo.......',
    '..##..o##o..##..',
    '..##..o##o..##..',
    '.##############.',
    '.oooooooooooooo.',
    '..xx........xx..',
    '..xx........xx..',
    '..xx........xx..',
    '..xx........xx..',
    '..xx........xx..',
    '................',
    '................',
    '................',
  ],
  // 찬장: 키 큰 몸통 + 상부 유리문(안에 병) + 하부 문
  icon_furn_cupboard: [
    '................',
    '..############..',
    '..#oooooooooo#..',
    '..#o##.o.##.o#..',
    '..#o##.o.##.o#..',
    '..#o.o.o.o..o#..',
    '..#oooooooooo#..',
    '..############..',
    '..#oooooooooo#..',
    '..#oo.x..x.oo#..',
    '..#oo.x..x.oo#..',
    '..#oooooooooo#..',
    '..#oooooooooo#..',
    '..############..',
    '..xx........xx..',
    '................',
  ],
};

const S = 12;
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
