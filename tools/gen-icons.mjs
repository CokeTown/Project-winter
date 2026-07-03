// 앱 아이콘 파이프라인 — assets-src/icon.png(정사각 원본) 한 장에서 전부 생성
//   node tools/gen-icons.mjs
// 출력:
//   public/icon-512.png, icon-192.png, apple-touch-icon.png(180), favicon.png(64)
//   build/icon.ico                       (Electron — electron-builder가 자동 인식)
//   android/.../mipmap-*/ic_launcher(.round/_foreground).png  (Capacitor)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'assets-src', 'icon.png');
if (!fs.existsSync(SRC)) {
  console.error('원본이 없습니다: assets-src/icon.png (정사각 PNG를 넣어주세요)');
  process.exit(1);
}
const src = PNG.sync.read(fs.readFileSync(SRC));
console.log(`원본: ${src.width}x${src.height}`);

// 박스 평균 다운샘플 (다운스케일 전용 — 픽셀아트도 깔끔하게 뭉개지지 않음)
function resize(img, W, H) {
  const out = new PNG({ width: W, height: H });
  const sx = img.width / W, sy = img.height / H;
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.min(img.height, Math.ceil((y + 1) * sy)));
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.min(img.width, Math.ceil((x + 1) * sx)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * img.width + xx) * 4;
          const al = img.data[i + 3];
          r += img.data[i] * al; g += img.data[i + 1] * al; b += img.data[i + 2] * al; a += al; n++;
        }
      }
      const o = (y * W + x) * 4;
      if (a > 0) {
        out.data[o] = Math.round(r / a); out.data[o + 1] = Math.round(g / a);
        out.data[o + 2] = Math.round(b / a); out.data[o + 3] = Math.round(a / n);
      }
    }
  }
  return out;
}
const pngBuf = (img) => PNG.sync.write(img);
function save(rel, img) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, pngBuf(img));
  console.log(`  ${rel} (${img.width}x${img.height})`);
}

// ── 웹/PWA
save('public/icon-512.png', resize(src, 512, 512));
save('public/icon-192.png', resize(src, 192, 192));
save('public/apple-touch-icon.png', resize(src, 180, 180));
save('public/favicon.png', resize(src, 64, 64));

// ── Electron .ico (PNG 압축 엔트리 — Vista+ 지원, electron-builder OK)
const icoSizes = [256, 128, 64, 48, 32, 16];
const entries = icoSizes.map(s => pngBuf(resize(src, s, s)));
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
icoSizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s >= 256 ? 0 : s, e);       // 너비 (0 = 256)
  header.writeUInt8(s >= 256 ? 0 : s, e + 1);   // 높이
  header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(entries[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += entries[i].length;
});
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build', 'icon.ico'), Buffer.concat([header, ...entries]));
console.log(`  build/icon.ico (${icoSizes.join('/')})`);

// ── Android (Capacitor) 밉맵
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
if (fs.existsSync(RES)) {
  const dpis = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const fgDpis = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [dpi, size] of Object.entries(dpis)) {
    const img = resize(src, size, size);
    save(`android/app/src/main/res/mipmap-${dpi}/ic_launcher.png`, img);
    save(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_round.png`, img);
  }
  // 어댑티브 포어그라운드: 안전 영역(중앙 66%) 밖이 잘리므로 원본을 72%로 축소해 중앙 배치
  for (const [dpi, size] of Object.entries(fgDpis)) {
    const inner = Math.round(size * 0.72);
    const small = resize(src, inner, inner);
    const fg = new PNG({ width: size, height: size });
    const off = Math.floor((size - inner) / 2);
    PNG.bitblt(small, fg, 0, 0, inner, inner, off, off);
    save(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_foreground.png`, fg);
  }
} else {
  console.log('android/ 없음 — 밉맵 생성 건너뜀');
}
console.log('완료. Electron exe는 npm run build:exe로 재빌드 시 아이콘이 반영됩니다.');
