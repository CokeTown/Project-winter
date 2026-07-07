/* ============================================================
   경량 i18n (라이브러리 없음)
   - lang: 'ko' | 'en'
   - setLang(l): 언어 전환 (부팅 시 opts.lang 적용용)
   - t(id, vars): id 기반 문자열 조회 + {x} 치환
   - LN / LD / LT / LE: 데이터 테이블 병기 필드 표시 헬퍼
   - applyStaticI18n(): index.html 정적 텍스트(data-i18n) 치환
   three 임포트가 없으므로 node에서 바로 실행 가능하다.
============================================================ */

import koStr from './locales/ko.json' with { type: 'json' };
import enStr from './locales/en.json' with { type: 'json' };

export let lang = 'ko';

// 앱 버전 — vite.config의 define(__APP_VER__)이 package.json version을 주입한다.
// (v0.9.1 하드코딩이 11번의 버전업 동안 방치됐던 실기기 신고 — 단일 출처로 교정)
// typeof 가드는 node 직실행(게이트 스크립트) 폴백.
const APP_VER = (typeof __APP_VER__ !== 'undefined') ? __APP_VER__ : 'dev';
// 빌드 스탬프(KST): 같은 버전 라벨로 웹 핫픽스가 하루 여러 번 나갈 때 "지금 무슨 빌드인지" 분간용 (디렉터 피드백 루프)
const BUILD_STAMP = (typeof __BUILD_STAMP__ !== 'undefined') ? __BUILD_STAMP__ : '';
// #74 Next Fest 데모 빌드 표기 — 버전줄에 DEMO 병기 (스샷·제보에서 정식판과 즉시 분간)
const DEMO_TAG = (typeof __DEMO__ !== 'undefined' && __DEMO__) ? ' · DEMO' : '';

export function setLang(l) {
  lang = (l === 'en') ? 'en' : 'ko';
  return lang;
}
export function isEn() { return lang === 'en'; }

// {key} 플레이스홀더 치환
function fill(str, vars) {
  if (vars == null) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/* ---- 데이터 테이블 병기 필드 헬퍼 ----
   영어 모드에서 obj.<field>En 이 있으면 그것을, 없으면 원본(한국어) 필드를 쓴다.
   → ko 모드는 항상 원본 그대로 (무변화 원칙). */
export function LF(obj, field) {
  if (!obj) return '';
  if (lang === 'en') {
    const en = obj[field + 'En'];
    if (en != null) return en;
  }
  return obj[field] ?? '';
}
export const LN = (obj) => LF(obj, 'name');     // name / nameEn
export const LD = (obj) => LF(obj, 'desc');     // desc / descEn
export const LT = (obj) => LF(obj, 'text');     // text / textEn
export const LL = (obj) => LF(obj, 'label');    // label / labelEn

export function t(id, vars) {
  const table = STR[id];
  if (table == null) return id; // 누락 시 id를 그대로 노출 (개발 중 잔여물 탐지에 유용)
  const s = (lang === 'en' && table.en != null) ? table.en : table.ko;
  return fill(s, vars);
}

// index.html: data-i18n="id" → textContent, data-i18n-title="id" → title, data-i18n-html="id" → innerHTML
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }
}

/* ============================================================
   문자열 테이블 { id: { ko, en } }
============================================================ */
// 언어 문자열은 로케일 JSON으로 외부화(빌드타임 import). 번역은 src/locales/ko.json·en.json만 편집하면 된다.
// t()·{key} 치환 구조는 그대로 — 값이 안 바뀌면 골든/모달이 무회귀 통과(무손실 증명).
// title.ver만 예외: 버전문은 로드타임 계산(APP_VER·DEMO_TAG·BUILD_STAMP)이라 JS에 잔류.
export const STR = {};
for (const k in koStr) STR[k] = { ko: koStr[k], en: (enStr[k] != null ? enStr[k] : koStr[k]) };
STR['title.ver'] = { ko: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}`, en: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}` };
