// i18n 무결성 게이트 (NFR-I18N-01): ko/en 페어 누락·플레이스홀더 시그니처 불일치 검사
// 언어 문자열은 src/locales/ko.json·en.json으로 외부화됨(빌드타임 import). 이 게이트가 두 로케일의 정합을 지킨다.
// (title.ver는 버전문이라 JS 잔류 — 번역 대상 아님, 여기서 제외.)
// 사용: node tools/check-i18n.mjs  → 위반 시 exit 1
import fs from 'node:fs';
const read = f => JSON.parse(fs.readFileSync(new URL(`../src/locales/${f}`, import.meta.url), 'utf8'));
const ko = read('ko.json'), en = read('en.json');
// {josa}는 한국어 조사 자동선택 전용 플레이스홀더(v1.4.1 josa 유틸) — 영어엔 조사가 없어 ko에만 존재가 정상.
const KO_ONLY = new Set(['josa']);
const sig = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(p => !KO_ONLY.has(p)).sort().join(',');
const bad = [];
const koKeys = Object.keys(ko), enKeys = new Set(Object.keys(en));
for (const k of koKeys) {
  if (!enKeys.has(k)) { bad.push(`${k}: en 누락`); continue; }
  if (!String(ko[k]).trim() && String(en[k]).trim()) bad.push(`${k}: ko 비어있음`);
  if (sig(ko[k]) !== sig(en[k])) bad.push(`${k}: 플레이스홀더 불일치 ko[${sig(ko[k])}] en[${sig(en[k])}]`);
}
for (const k of enKeys) if (!(k in ko)) bad.push(`${k}: ko 누락`);
console.log(`i18n 항목 ${koKeys.length}개 검사 (ko.json/en.json)`);
if (bad.length) { console.error('위반:\n' + bad.join('\n')); process.exit(1); }
console.log('무결 ✓');
