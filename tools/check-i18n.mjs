// i18n 무결성 게이트 (NFR-I18N-01): ko/en 페어 누락·플레이스홀더 시그니처 불일치 검사
// 언어 문자열은 src/locales/ko.json·en.json으로 외부화됨(빌드타임 import). 이 게이트가 두 로케일의 정합을 지킨다.
// (title.ver는 버전문이라 JS 잔류 — 번역 대상 아님, 여기서 제외.)
// 사용: node tools/check-i18n.mjs  → 위반 시 exit 1
import fs from 'node:fs';
const read = f => JSON.parse(fs.readFileSync(new URL(`../src/locales/${f}`, import.meta.url), 'utf8'));
const ko = read('ko.json'), en = read('en.json');
// {josa}는 한국어 조사 자동선택 전용 플레이스홀더(v1.4.1 josa 유틸) — 영어엔 조사가 없어 ko에만 존재가 정상.
const KO_ONLY = new Set(['josa']);
// 미번역 가드(디렉터 2026-07): en.json 값에 한글이 남아 있으면 = 번역 누락 → 게이트 실패.
//   패리티(키 존재)만으론 "한글을 en에 그대로 복붙"이 통과된다 → 실제 번역 여부를 강제.
//   예외: 의도된 이중표기(언어 선택기는 양쪽 병기해야 어느 언어 유저든 찾음)만 화이트리스트.
const EN_HANGUL_OK = new Set(['opt.lang']); // "Language / 언어"
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const sig = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(p => !KO_ONLY.has(p)).sort().join(',');
const bad = [];
const koKeys = Object.keys(ko), enKeys = new Set(Object.keys(en));
for (const k of koKeys) {
  if (!enKeys.has(k)) { bad.push(`${k}: en 누락`); continue; }
  if (!String(ko[k]).trim() && String(en[k]).trim()) bad.push(`${k}: ko 비어있음`);
  if (sig(ko[k]) !== sig(en[k])) bad.push(`${k}: 플레이스홀더 불일치 ko[${sig(ko[k])}] en[${sig(en[k])}]`);
  if (!EN_HANGUL_OK.has(k) && HANGUL.test(String(en[k] ?? ''))) bad.push(`${k}: en 미번역(한글 잔존) "${String(en[k]).slice(0, 30)}"`);
}
for (const k of enKeys) if (!(k in ko)) bad.push(`${k}: ko 누락`);
// ── src ↔ public 동기화 게이트 (2026-07-08 검거) ──
//   번들·이 게이트는 src/locales를, 런타임 fetch/preload 오버라이드는 dist/locales(=public 복사본)를 읽는다.
//   둘이 어긋나면: public에만 넣은 신규 키는 게이트 무검증, src에만 넣은 윤문은 런타임에서 구본에 덮여 무효
//   (재윤문 155키가 실제 화면에 안 보이던 라이브 결함의 근인). 커밋 시점엔 두 벌이 반드시 동일해야 한다.
for (const f of ['ko.json', 'en.json']) {
  const pub = JSON.parse(fs.readFileSync(new URL(`../public/locales/${f}`, import.meta.url), 'utf8'));
  const srcObj = f === 'ko.json' ? ko : en;
  for (const k of Object.keys(srcObj)) {
    if (!(k in pub)) bad.push(`${f}: public에 ${k} 누락 (src↔public 드리프트)`);
    else if (String(srcObj[k]) !== String(pub[k])) bad.push(`${f}: ${k} 값 드리프트 (src≠public)`);
  }
  for (const k of Object.keys(pub)) if (!(k in srcObj)) bad.push(`${f}: src에 ${k} 누락 (public에만 존재 — 게이트 무검증 키)`);
}
console.log(`i18n 항목 ${koKeys.length}개 검사 (ko.json/en.json + src↔public 동기화)`);
if (bad.length) { console.error('위반:\n' + bad.join('\n')); process.exit(1); }
console.log('무결 ✓');
