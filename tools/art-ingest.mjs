// ChatGPT로 생성한 아트 수집기 — assets-src/art/incoming/*.png 를 manifest와 매칭해
// 목표 크기로 cover 크롭+리사이즈한 뒤 dest에 저장한다.
// 사용: node tools/art-ingest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART_DIR = path.join(ROOT, 'assets-src', 'art');
const MANIFEST_PATH = path.join(ART_DIR, 'manifest.json');
const INCOMING_DIR = path.join(ART_DIR, 'incoming');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`manifest가 없습니다: ${path.relative(ROOT, MANIFEST_PATH)}`);
  process.exit(1);
}
fs.mkdirSync(INCOMING_DIR, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const assets = manifest.assets || [];
const byId = new Map(assets.map(a => [a.id, a]));

// 박스 평균 다운샘플 (gen-icons.mjs와 동일한 알파 가중 평균 방식 — 다운스케일 전용)
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
      } else {
        out.data[o + 3] = 0;
      }
    }
  }
  return out;
}

// 원본에서 (cx,cy) 크기의 영역을 (ox,oy)에서 잘라낸 새 PNG를 반환
function crop(img, ox, oy, cw, ch) {
  const out = new PNG({ width: cw, height: ch });
  PNG.bitblt(img, out, ox, oy, cw, ch, 0, 0);
  return out;
}

// object-fit: cover — 목표 비율에 맞게 중앙 기준으로 잘라낸 뒤 목표 크기로 리사이즈
function fitCover(img, W, H) {
  const srcRatio = img.width / img.height;
  const dstRatio = W / H;
  let cw = img.width, ch = img.height;
  if (srcRatio > dstRatio) {
    // 원본이 더 넓다 → 좌우를 잘라낸다
    cw = Math.round(img.height * dstRatio);
  } else if (srcRatio < dstRatio) {
    // 원본이 더 좁다(세로로 길다) → 위아래를 잘라낸다
    ch = Math.round(img.width / dstRatio);
  }
  const ox = Math.floor((img.width - cw) / 2);
  const oy = Math.floor((img.height - ch) / 2);
  const cropped = (cw === img.width && ch === img.height) ? img : crop(img, ox, oy, cw, ch);
  return resize(cropped, W, H);
}

const files = fs.readdirSync(INCOMING_DIR).filter(f => /\.png$/i.test(f));

if (files.length === 0) {
  console.log(`처리할 파일이 없습니다: ${path.relative(ROOT, INCOMING_DIR)} 폴더가 비어 있습니다.`);
  console.log('ChatGPT로 이미지를 생성한 뒤 {id}.png 파일명으로 이 폴더에 넣고 다시 실행하세요.');
  console.log('(먼저 node tools/art-brief.mjs 로 BRIEF.md에서 각 에셋의 프롬프트/id를 확인하세요.)');
  process.exit(0);
}

let processed = 0, skipped = 0;
const matchedIds = new Set();

for (const file of files) {
  const id = path.basename(file, path.extname(file));
  const asset = byId.get(id);
  if (!asset) {
    console.warn(`경고: manifest에 없는 id — 건너뜀: ${file}`);
    skipped++;
    continue;
  }
  const srcPath = path.join(INCOMING_DIR, file);
  let img;
  try {
    img = PNG.sync.read(fs.readFileSync(srcPath));
  } catch (err) {
    console.warn(`경고: PNG 디코딩 실패 — 건너뜀: ${file} (${err.message})`);
    skipped++;
    continue;
  }

  const out = asset.fit === 'cover' || !asset.fit
    ? fitCover(img, asset.w, asset.h)
    : resize(img, asset.w, asset.h);

  const destPath = path.join(ROOT, asset.dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, PNG.sync.write(out));
  console.log(`처리 완료: ${file} (${img.width}x${img.height}) -> ${path.relative(ROOT, destPath)} (${asset.w}x${asset.h})`);
  processed++;
  matchedIds.add(id);
}

const missing = assets.filter(a => !matchedIds.has(a.id) && !fs.existsSync(path.join(ROOT, a.dest)));
console.log('');
console.log(`요약: 처리 ${processed}개, 건너뜀 ${skipped}개`);
if (missing.length > 0) {
  console.log(`아직 준비되지 않은 에셋 (${missing.length}개): ${missing.map(a => a.id).join(', ')}`);
}
