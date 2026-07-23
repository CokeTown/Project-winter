// 번역 패키지 재추출 (디렉터 워크플로 고정본) — full + chunks + delta + sheet를 한 번에 갱신한다.
//   배경: #191 때 chunks/full은 일회성으로 만들고 생성기를 남기지 않아, 문자열이 늘 때마다 패키지가 낡았다
//         (07-17 스냅샷 2,068키 ↔ 현행 2,227키). 도구를 저장소에 두어 「한 명령 = 최신」으로 고정한다.
//   핵심: 갱신 전 스냅샷(docs/l10n/full/ko.json)과 비교해 **신규·원문변경 키만** delta/로 뽑는다.
//         디렉터가 전량을 다시 번역하지 않고 바뀐 것만 돌리면 된다.
//   사용: node tools/export-l10n-pack.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L10N = path.join(ROOT, 'docs', 'l10n');
const CHUNK = 85;                       // Gemini 1회 투입 단위 (README 규약)
const rd = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const wr = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); };

const cur = { ko: rd(path.join(ROOT, 'src/locales/ko.json')), en: rd(path.join(ROOT, 'src/locales/en.json')), ja: rd(path.join(ROOT, 'src/locales/ja.json')) };
const keys = Object.keys(cur.ko);

// ── 기준선과 대조 (없으면 전량이 신규)
//   기준선을 full/ko.json으로 삼으면 안 된다 — 첫 실행이 그 파일을 최신으로 덮으므로,
//   두 번째 실행이 '자기 자신'과 비교해 델타가 0으로 증발한다(실제로 한 번 겪었다).
//   그래서 기준선은 별도 파일로 두고, 번역을 실제로 반영한 시점에만 --set-baseline으로 옮긴다.
const BASE = path.join(L10N, '.baseline-ko.json');
const prev = fs.existsSync(BASE) ? rd(BASE) : {};
const added = keys.filter(k => !(k in prev));
const changed = keys.filter(k => k in prev && prev[k] !== cur.ko[k]);
const removed = Object.keys(prev).filter(k => !(k in cur.ko));

// ── 미번역 검출 = 「원문이 그대로 복사된 키」.
//   단순히 '한글이 있으면 미번역'으로 보면 오탐이 난다: opt.lang은 원문부터 "언어 / Language" 병기고,
//   map.pick처럼 ko 자체가 빈 키도 있다. 원문과 값이 같고 그 원문에 한글이 있을 때만 손을 안 탄 것이다.
const hangul = s => /[가-힣]/.test(String(s || ''));
const untranslated = lang => keys.filter(k => cur.ko[k] && cur[lang][k] === cur.ko[k] && hangul(cur.ko[k]));

const pack = ks => ks.map(k => [k, { ko: cur.ko[k], en: cur.en[k] ?? '', ja: cur.ja[k] ?? '' }]);
const writeChunks = (dir, entries, tag) => {
  fs.rmSync(path.join(L10N, dir), { recursive: true, force: true });
  let n = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const part = Object.fromEntries(entries.slice(i, i + CHUNK));
    wr(path.join(L10N, dir, `${tag}-${String(++n).padStart(2, '0')}.json`), part);
  }
  return n;
};

// ① 전체 스냅샷 (번역 기준)
for (const lang of ['ko', 'en', 'ja']) wr(path.join(L10N, 'full', lang + '.json'), cur[lang]);
// ② 전량 청크
const nChunk = writeChunks('chunks', pack(keys), 'chunk');
// ③ 델타 청크 — 이번에 새로 손봐야 하는 것만
const deltaKeys = [...added, ...changed];
const nDelta = deltaKeys.length ? writeChunks('delta', pack(deltaKeys), 'delta') : (fs.rmSync(path.join(L10N, 'delta'), { recursive: true, force: true }), 0);
// ④ 번역 시트(TSV) — 기존 도구 재사용
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'export-l10n-sheet.mjs')], { stdio: 'ignore' });

const stamp = new Date().toISOString().slice(0, 10);
const lines = [
  `# 번역 패키지 갱신 기록`, '',
  `> \`node tools/export-l10n-pack.mjs\` 실행 시 이 파일이 다시 쓰인다. 직전 스냅샷 대비 차이를 적는다.`, '',
  `## ${stamp} 추출`, '',
  `| 항목 | 값 |`, `|---|---|`,
  `| 전체 키 | ${keys.length} |`,
  `| 신규 키 | ${added.length} |`,
  `| 원문 변경 | ${changed.length} |`,
  `| 삭제된 키 | ${removed.length} |`,
  `| 전량 청크 | chunks/chunk-01~${String(nChunk).padStart(2, '0')}.json |`,
  `| 델타 청크 | ${nDelta ? `delta/delta-01~${String(nDelta).padStart(2, '0')}.json (${deltaKeys.length}키)` : '없음(변동 없음)'} |`,
  `| en 미번역 | ${untranslated('en').length} |`,
  `| ja 미번역 | ${untranslated('ja').length} |`, '',
  `**델타부터 돌리면 된다.** 전량 청크는 통번역을 다시 할 때만 쓴다.`, '',
];
if (added.length) lines.push(`### 신규 키 (${added.length})`, '```', ...added.slice(0, 200), added.length > 200 ? `… 외 ${added.length - 200}건` : '', '```', '');
if (changed.length) lines.push(`### 원문이 바뀐 키 (${changed.length})`, '```', ...changed.slice(0, 100), '```', '');
if (removed.length) lines.push(`### 삭제된 키 (${removed.length}) — 번역본에 남아 있어도 무해`, '```', ...removed.slice(0, 100), '```', '');
fs.writeFileSync(path.join(L10N, 'CHANGES.md'), lines.filter(l => l !== '').join('\n') + '\n');

// 번역을 실제로 역수입한 뒤 이 플래그로 기준선을 옮긴다 — 그때까지 델타는 몇 번을 재추출해도 그대로 남는다.
if (process.argv.includes('--set-baseline')) { wr(BASE, cur.ko); console.log('기준선을 현재 원문으로 갱신했다 — 다음 델타는 여기서부터.'); }

console.log(`전체 ${keys.length}키 · 신규 ${added.length} · 변경 ${changed.length} · 삭제 ${removed.length}`);
console.log(`chunks ${nChunk}개 · delta ${nDelta}개 · en미번역 ${untranslated('en').length} · ja미번역 ${untranslated('ja').length}`);
console.log('WROTE docs/l10n/{full,chunks,delta,CHANGES.md,translation-sheet.tsv}');
