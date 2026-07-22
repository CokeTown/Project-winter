#!/usr/bin/env node
/* ============================================================
   check-emoji.mjs — 컬러 이모지 게이트 (#213, 디렉터 2026-07-22)
   ------------------------------------------------------------
   "터미널 베이스에서 이모지가 보이면 게임 수준이 짜쳐진다" — 화면 노출 무관용.
   - 로케일 JSON(6파일)·index.html: 컬러 이모지 0건 무관용 (사용자 노출 표면).
   - src JS: 베이스라인(emoji-baseline.json) 대비 신규 유입 차단.
     잔존분은 emoji: 데이터 필드·주석 — 출력 경로가 전멸됐음을 E2E(DOM 스캔)가 보증하고,
     이 게이트는 새 이모지가 코드로 스며드는 것을 막는다.
   - 갱신: node tools/check-emoji.mjs --rebase (의도된 감소 시에만)
   판정 기준: Windows Segoe UI Emoji가 컬러로 렌더하는 범위.
   →·■·▸·✓·★·▊ 같은 단색 기호는 터미널 문법이라 허용.
   ============================================================ */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const BASELINE_PATH = path.join(ROOT, 'tools', 'emoji-baseline.json');
const REBASE = process.argv.includes('--rebase');

const isColorEmoji = cp =>
  (cp >= 0x1F000 && cp <= 0x1FAFF) ||
  (cp >= 0x2600 && cp <= 0x26FF) ||
  (cp >= 0x2700 && cp <= 0x27BF && cp !== 0x2713 && cp !== 0x2717) ||
  (cp >= 0x2B00 && cp <= 0x2BFF && cp !== 0x2B24) ||
  cp === 0xFE0F ||
  (cp >= 0x1F1E6 && cp <= 0x1F1FF) ||
  (cp >= 0x23E9 && cp <= 0x23FA) || cp === 0x231A || cp === 0x231B ||
  cp === 0x2934 || cp === 0x2935 || cp === 0x3030 || cp === 0x303D;

function countIn(text) {
  let n = 0;
  for (const ch of text) if (isColorEmoji(ch.codePointAt(0))) n++;
  return n;
}

// ── 무관용 표면: 로케일 + index.html ──
const strict = ['index.html',
  'src/locales/ko.json', 'src/locales/en.json', 'src/locales/ja.json',
  'public/locales/ko.json', 'public/locales/en.json', 'public/locales/ja.json'];
let strictFail = 0;
for (const f of strict) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const n = countIn(fs.readFileSync(p, 'utf8'));
  if (n > 0) { console.error(`[EMOJI] 무관용 표면 오염: ${f} — ${n}자`); strictFail += n; }
}

// ── 베이스라인 표면: src JS (데이터 필드·주석 잔존분 고정, 신규 유입 차단) ──
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) jsFiles.push(p);
  }
})(path.join(ROOT, 'src'));

const counts = {};
let total = 0;
for (const p of jsFiles) {
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  const n = countIn(fs.readFileSync(p, 'utf8'));
  if (n > 0) counts[rel] = n;
  total += n;
}

if (REBASE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({ total, files: counts }, null, 1) + '\n');
  console.log(`[EMOJI] 베이스라인 재기록: 총 ${total}자 / ${Object.keys(counts).length}파일`);
  process.exit(strictFail ? 1 : 0);
}

let base = { total: Infinity, files: {} };
if (fs.existsSync(BASELINE_PATH)) base = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
let grow = 0;
for (const [f, n] of Object.entries(counts)) {
  const b = base.files[f] || 0;
  if (n > b) { console.error(`[EMOJI] 신규 유입: ${f} — ${b} → ${n}`); grow += n - b; }
}
console.log(`[EMOJI] src 잔존 ${total}자 (베이스라인 ${base.total === Infinity ? '없음' : base.total}) · 무관용 표면 ${strictFail ? strictFail + '자 오염' : '청정'}`);
if (strictFail || grow) { console.error('[EMOJI] FAIL'); process.exit(1); }
console.log('[EMOJI] OK');
