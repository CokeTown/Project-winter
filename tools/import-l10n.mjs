// 번역 역수입 도구 (#191 · Gemini 워크플로): 외부 번역 JSON을 로케일에 병합 + 품질 게이트
// 사용: node tools/import-l10n.mjs <lang: en|ja> <파일.json> [파일2.json ...]
//   입력 형태 A: { "키": "번역문" }
//   입력 형태 B: { "키": { "ja": "번역문", ... } } (docs/l10n/chunks 왕복 형태 — lang 필드만 취함)
// 검증: 미지 키 거부 · 플레이스홀더 시그니처({josa} 제외) · 한글 잔존 · {josa} 잔존(비ko) → 위반 시 전체 미적용
// 통과 시 src/locales/<lang>.json + public/locales/<lang>.json 동시 갱신. 이후 npm run gates 권장.
import fs from 'node:fs';
const [lang, ...files] = process.argv.slice(2);
if (!['en', 'ja'].includes(lang) || files.length === 0) {
  console.error('사용법: node tools/import-l10n.mjs <en|ja> <번역.json> [...]'); process.exit(1);
}
const R = new URL('..', import.meta.url);
const ko = JSON.parse(fs.readFileSync(new URL('src/locales/ko.json', R), 'utf8'));
const cur = JSON.parse(fs.readFileSync(new URL(`src/locales/${lang}.json`, R), 'utf8'));
const HANGUL = /[가-힣ㄱ-ㆎ]/;
const OK_HANGUL = new Set(['opt.lang']);
const sig = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(p => p !== 'josa').sort().join(',');
const bad = []; let applied = 0;
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const [k, raw] of Object.entries(data)) {
    const v = (raw && typeof raw === 'object') ? raw[lang] : raw;   // 형태 B → lang 필드
    if (v == null) continue;                                        // 해당 언어 값 없으면 스킵
    if (!(k in ko)) { bad.push(`${f}: 미지 키 ${k} (ko에 없음 — 오타?)`); continue; }
    if (sig(ko[k]) !== sig(v)) { bad.push(`${k}: 플레이스홀더 불일치 ko[${sig(ko[k])}] ${lang}[${sig(v)}]`); continue; }
    if (/\{josa\}/.test(String(v))) { bad.push(`${k}: {josa} 잔존 (ko 전용)`); continue; }
    if (!OK_HANGUL.has(k) && HANGUL.test(String(v))) { bad.push(`${k}: 한글 잔존 "${String(v).slice(0, 30)}"`); continue; }
    if (cur[k] !== v) { cur[k] = v; applied++; }
  }
}
if (bad.length) {
  console.error(`위반 ${bad.length}건 — 아무것도 적용하지 않음:\n` + bad.slice(0, 40).join('\n'));
  process.exit(1);
}
// ko 키 순서로 정렬해 기록 (diff 안정성)
const out = {};
for (const k of Object.keys(ko)) if (k in cur) out[k] = cur[k];
const json = JSON.stringify(out, null, 2) + '\n';
fs.writeFileSync(new URL(`src/locales/${lang}.json`, R), json);
fs.writeFileSync(new URL(`public/locales/${lang}.json`, R), json);
console.log(`${lang}.json 갱신: ${applied}키 반영 (src+public). 다음: node tools/check-i18n.mjs && npm run test:build`);
