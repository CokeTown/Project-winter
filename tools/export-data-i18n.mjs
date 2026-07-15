// #114 Phase 2 제너레이터 — 데이터 표 병기 문자열 → src/locales/{ko,en}.json 의 data.* 키로 외부화.
//   근원: src/data/l10n-registry.js walkDataL10n() (표 등록 + *En 자동 발견 — 단일 출처)
//   동작: 기존 data.* 키 전량 삭제 후 재생성(멱등·스테일 키 청소), 비-data 키는 순서·값 불변.
//   public/locales 동기화는 별도(cp) — check-i18n의 src↔public 게이트가 드리프트를 잡는다.
// 사용: node tools/export-data-i18n.mjs
import fs from 'node:fs';
import { walkDataL10n } from '../src/data/l10n-registry.js';

const entries = walkDataL10n();
const dup = new Set(), dupBad = [];
for (const e of entries) { if (dup.has(e.key)) dupBad.push(e.key); dup.add(e.key); }
if (dupBad.length) { console.error('중복 키(레지스트리 keyFn 점검):\n' + dupBad.join('\n')); process.exit(1); }

const HANGUL = /[가-힣ㄱ-ㆎ]/;
const untranslated = entries.filter((e) => HANGUL.test(e.en));
if (untranslated.length) {
  console.error(`en 병기 필드에 한글 잔존 ${untranslated.length}건 (원본 데이터 파일에서 번역 후 재실행):`);
  for (const e of untranslated) console.error(`  ${e.key}: "${e.en.slice(0, 40)}"`);
  process.exit(1);
}

const sorted = [...entries].sort((a, b) => a.key.localeCompare(b.key));
for (const [file, field] of [['ko.json', 'ko'], ['en.json', 'en']]) {
  const url = new URL(`../src/locales/${file}`, import.meta.url);
  const obj = JSON.parse(fs.readFileSync(url, 'utf8'));
  const keep = {};
  for (const k of Object.keys(obj)) if (!k.startsWith('data.')) keep[k] = obj[k];
  for (const e of sorted) keep[e.key] = e[field];
  fs.writeFileSync(url, JSON.stringify(keep, null, 2) + '\n');
}
console.log(`데이터 병기 문자열 외부화: ${sorted.length}키 (ko/en) → src/locales`);
console.log('다음: public/locales 동기화(cp) + node tools/check-i18n.mjs');
