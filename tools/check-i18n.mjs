// i18n 무결성 게이트 (NFR-I18N-01): ko/en 페어 누락·플레이스홀더 시그니처 불일치 검사
// 사용: node tools/check-i18n.mjs  → 위반 시 exit 1
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
const entryRe = /'([\w.\-]+)':\s*\{\s*ko:\s*(['"`])([\s\S]*?)\2\s*,\s*en:\s*(['"`])([\s\S]*?)\4\s*,?\s*\}/g;
// {josa}는 한국어 조사 자동선택 전용 플레이스홀더(v1.4.1 josa 유틸) — 영어엔 조사가 없어
// ko에만 존재하는 것이 정상이므로 파리티 비교에서 제외한다.
const KO_ONLY = new Set(['josa']);
const sig = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(p => !KO_ONLY.has(p)).sort().join(',');
let n = 0, bad = [];
for (const m of src.matchAll(entryRe)) {
  n++;
  const [, key, , ko, , en] = m;
  if (!ko.trim() && en.trim()) bad.push(`${key}: ko 비어있음`);
  if (sig(ko) !== sig(en)) bad.push(`${key}: 플레이스홀더 불일치 ko[${sig(ko)}] en[${sig(en)}]`);
}
console.log(`i18n 항목 ${n}개 검사`);
if (bad.length) { console.error('위반:\n' + bad.join('\n')); process.exit(1); }
console.log('무결 ✓');
