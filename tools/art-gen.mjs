// OpenAI 이미지 API 완전 자동 생성기 — manifest.json의 프롬프트로 이미지를 생성해
// assets-src/art/incoming/{id}.png 로 저장한다. (Node 22 내장 fetch만 사용, 의존성 추가 없음)
// 사용:
//   node tools/art-gen.mjs                     — manifest 전체 생성 (incoming에 이미 있는 id는 스킵)
//   node tools/art-gen.mjs steam_hero paper_note_bg   — 지정한 id만 생성
//   node tools/art-gen.mjs --force              — 이미 있어도 재생성 (다른 인자와 함께 사용 가능)
// 환경변수: OPENAI_API_KEY 필요 (setx OPENAI_API_KEY <키> 로 설정 후 새 셸에서 재실행)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ART_DIR = path.join(ROOT, 'assets-src', 'art');
const MANIFEST_PATH = path.join(ART_DIR, 'manifest.json');
const INCOMING_DIR = path.join(ART_DIR, 'incoming');

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.log('키가 없습니다: setx OPENAI_API_KEY <키> 후 재실행');
  process.exit(0);
}

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`manifest가 없습니다: ${path.relative(ROOT, MANIFEST_PATH)}`);
  process.exit(1);
}
fs.mkdirSync(INCOMING_DIR, { recursive: true });

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const assets = manifest.assets || [];

// CLI 인자 파싱: --force 플래그 + 선택적 id 목록
const rawArgs = process.argv.slice(2);
const force = rawArgs.includes('--force');
const ids = rawArgs.filter(a => a !== '--force');

const targets = ids.length > 0
  ? assets.filter(a => ids.includes(a.id))
  : assets;

if (ids.length > 0) {
  const known = new Set(assets.map(a => a.id));
  for (const id of ids) {
    if (!known.has(id)) console.warn(`경고: manifest에 없는 id — 무시됨: ${id}`);
  }
}

if (targets.length === 0) {
  console.log('생성할 에셋이 없습니다.');
  process.exit(0);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 모델 우선순위 (디렉터 승인 2026-07-05: 퀄리티 우선 gpt-image-2, 미지원 시 gpt-image-1 자동 폴백).
// 폴백은 세션당 1회만 판정해 이후 요청은 확정된 모델로 나간다(불필요한 실패 요청 방지 = 비용 효율).
const MODEL_CHAIN = ['gpt-image-2', 'gpt-image-1'];
let modelIdx = 0;

async function generateOnce(asset) {
  for (; modelIdx < MODEL_CHAIN.length; modelIdx++) {
    const model = MODEL_CHAIN[modelIdx];
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: asset.prompt,
        size: asset.genSize,
        quality: 'high',
        n: 1,
        // 프롬프트의 "transparent background"만으로는 모델이 체커보드를 그려버릴 수 있다(gpt-image-2 실측 사고).
        // 아이콘류는 API 파라미터로 투명 배경을 강제한다. 일러(1536 가로형)는 꽉 찬 장면이라 불필요.
        ...(asset.genSize === '1024x1024' ? { background: 'transparent' } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // 모델 자체를 못 쓰는 오류(404/모델명 오류)면 다음 모델로 폴백. 그 외(레이트리밋 등)는 그대로 throw.
      const modelErr = res.status === 404 || /model|does not exist|unknown/i.test(body);
      if (modelErr && modelIdx < MODEL_CHAIN.length - 1) {
        console.warn(`  모델 ${model} 미지원 — ${MODEL_CHAIN[modelIdx + 1]}로 폴백`);
        continue;
      }
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 500)}`);
    }

    const json = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error('응답에 b64_json이 없습니다');
    if (modelIdx > 0 || model !== 'gpt-image-1') console.log(`  (모델: ${model})`);
    return Buffer.from(b64, 'base64');
  }
  throw new Error('사용 가능한 이미지 모델이 없습니다');
}

async function generateWithRetry(asset) {
  try {
    return await generateOnce(asset);
  } catch (err) {
    console.warn(`  1차 시도 실패 (${asset.id}): ${err.message} — 재시도 중...`);
    await sleep(2000);
    return await generateOnce(asset);
  }
}

const results = { success: [], failed: [], skipped: [] };

for (const asset of targets) {
  const destPath = path.join(INCOMING_DIR, `${asset.id}.png`);
  if (!force && fs.existsSync(destPath)) {
    console.log(`스킵 (이미 존재, --force로 재생성): ${asset.id}`);
    results.skipped.push(asset.id);
    continue;
  }

  console.log(`생성 중: ${asset.id} (${asset.genSize})...`);
  try {
    const buf = await generateWithRetry(asset);
    fs.writeFileSync(destPath, buf);
    console.log(`  완료: assets-src/art/incoming/${asset.id}.png`);
    results.success.push(asset.id);
  } catch (err) {
    console.error(`  실패: ${asset.id} — ${err.message}`);
    results.failed.push(asset.id);
  }

  // 다음 에셋 전 2초 대기 (API 부하 조절) — 마지막 항목 뒤에는 대기하지 않음
  const isLast = asset === targets[targets.length - 1];
  if (!isLast) await sleep(2000);
}

console.log('');
console.log('── 리포트 ──');
console.log(`성공 ${results.success.length}개: ${results.success.join(', ') || '(없음)'}`);
console.log(`실패 ${results.failed.length}개: ${results.failed.join(', ') || '(없음)'}`);
console.log(`스킵 ${results.skipped.length}개: ${results.skipped.join(', ') || '(없음)'}`);
console.log('');
console.log('다음: node tools/art-ingest.mjs');
