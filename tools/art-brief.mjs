// ChatGPT(수동) 아트 브리프 생성기 — manifest.json을 읽어 assets-src/art/BRIEF.md 생성
// 사용: node tools/art-brief.mjs
// 결과물 BRIEF.md의 각 카드 프롬프트를 ChatGPT(GPT Pro, 이미지 생성)에 그대로 붙여넣고,
// 생성된 이미지를 {id}.png 로 저장해 assets-src/art/incoming/ 에 넣은 뒤
// node tools/art-ingest.mjs 를 실행하면 자동으로 목표 크기로 잘리고 리사이즈되어 배치된다.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART_DIR = path.join(ROOT, 'assets-src', 'art');
const MANIFEST_PATH = path.join(ART_DIR, 'manifest.json');
const BRIEF_PATH = path.join(ART_DIR, 'BRIEF.md');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`manifest가 없습니다: ${path.relative(ROOT, MANIFEST_PATH)}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const styleAnchor = manifest.styleAnchor ||
  'cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text';
const assets = manifest.assets || [];

const lines = [];
lines.push('# Nine Winters — 아트 브리프 (ChatGPT 수동 생성용)');
lines.push('');
lines.push('> 이 문서는 `tools/art-brief.mjs`가 `assets-src/art/manifest.json`에서 자동 생성했습니다.');
lines.push('> 각 카드의 프롬프트를 ChatGPT(GPT Pro, 이미지 생성)에 그대로 붙여넣어 이미지를 만드세요.');
lines.push('> 생성된 이미지는 `{id}.png` 파일명으로 저장해 `assets-src/art/incoming/`에 넣고,');
lines.push('> 그 다음 `node tools/art-ingest.mjs`를 실행하면 목표 크기로 자동 크롭·리사이즈되어 배치됩니다.');
lines.push('');
lines.push('## 공통 스타일 앵커');
lines.push('');
lines.push('아래 문단은 모든 에셋 프롬프트에 공통으로 깔리는 무드/스타일 기준입니다. 개별 프롬프트에 이미 녹여져 있지만, ChatGPT가 스타일을 벗어난 결과를 낼 경우 이 문장을 강조해서 다시 요청하세요.');
lines.push('');
lines.push('```');
lines.push('Nine Winters key art style anchor: a dark, ruined post-apocalyptic isometric container-room shelter,');
lines.push('warm candlelight glowing orange inside against a cold blue-grey twilight outside, pixel art with soft');
lines.push('dithering, gentle falling snow. ' + styleAnchor);
lines.push('```');
lines.push('');
lines.push('---');
lines.push('');

for (const a of assets) {
  lines.push(`## ${a.id}`);
  lines.push('');
  lines.push(`- **용도**: ${a.purpose}`);
  lines.push(`- **목표 크기**: ${a.w}x${a.h} (생성 비율: ${a.genSize}, fit: ${a.fit})`);
  lines.push(`- **배치 경로**: \`${a.dest}\``);
  lines.push('');
  lines.push('**ChatGPT에 붙여넣을 프롬프트:**');
  lines.push('');
  lines.push('```');
  lines.push(a.prompt);
  lines.push('```');
  lines.push('');
  lines.push(`생성 후 \`${a.id}.png\` 로 저장해 \`assets-src/art/incoming/\` 에 넣으세요.`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

fs.mkdirSync(ART_DIR, { recursive: true });
fs.writeFileSync(BRIEF_PATH, lines.join('\n'));
console.log(`BRIEF 생성 완료: ${path.relative(ROOT, BRIEF_PATH)} (에셋 ${assets.length}개)`);
