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
import jaStr from './locales/ja.json' with { type: 'json' };
import { GLYPH_NAMES } from './data/glyphs.gen.js'; // 세미오틱 글리프 명단 (UI-PIXEL-UNITY §5)

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
  lang = (l === 'en' || l === 'ja') ? l : 'ko';
  return lang;
}
export function isEn() { return lang === 'en'; }

// UI-PIXEL-UNITY §5: 로케일 문자열 안의 인라인 도트 아이콘(<img … img/icons/…>)을 세미오틱 글리프로 치환.
//   로케일 JSON 3언어 261건을 파일 수정 없이 이 관문 하나로 커버한다(런타임 오버라이드 병합분 포함).
//   글리프 미보유 이름(가구·지도 등)은 원본 <img> 유지 — 점진 전환 안전.
const _glyphSet = new Set(GLYPH_NAMES);
const _glyphImgRe = /<img class="px-icon" src="img\/icons\/(icon_[a-z0-9_]+)\.png"[^>]*>/g;
function glyphize(s) {
  if (typeof s !== 'string' || s.indexOf('img/icons/') === -1) return s;
  return s.replace(_glyphImgRe, (m, name) => _glyphSet.has(name)
    ? `<span class="px-icon glyph" style="-webkit-mask-image:url('img/glyphs/${name}.svg');mask-image:url('img/glyphs/${name}.svg')"></span>` : m);
}

// 현재 언어로 문자열 선택 — ja는 미번역 키를 en으로 폴백(부분 번역 드롭에도 안전), 최종 폴백은 ko(원문).
//   pick은 t/LF/LC 세 조회 경로가 전부 지나는 병목이라 glyphize를 여기 한 곳에만 건다.
function pick(table) {
  if (lang === 'ja' && table.ja != null) return glyphize(table.ja);
  if (lang !== 'ko' && table.en != null) return glyphize(table.en);
  return glyphize(table.ko);
}

// #34 Steam 언어 연동: Steam API 언어 코드 → 게임 로케일.
//   지원 로케일만 명시 매핑, 그 밖의 언어는 en 폴백(스토어 노출 언어 정책과 일치).
//   빈 값(비Steam 실행)은 null — 호출부(부팅 autoLang)가 OS 언어 추정으로 넘어간다.
//   ja 로케일 합류 시 여기에 japanese: 'ja' 한 줄이 전부다.
const STEAM_LANG_MAP = { koreana: 'ko', english: 'en', japanese: 'ja' };
export function steamLangToGame(sl) {
  if (!sl) return null;
  return STEAM_LANG_MAP[sl] || 'en';
}

// {key} 플레이스홀더 치환
function fill(str, vars) {
  if (vars == null) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/* ---- 데이터 테이블 병기 필드 헬퍼 ----
   #114 Phase 2: 외부화 키(data.<표>.<id>.<필드>)가 로케일에 있으면 그것이 우선
   (obj._lk = l10n-registry가 부팅 시 스탬프한 비열거 키). 번역 표면 = JSON 단일화.
   폴백: 영어 모드에서 obj.<field>En, 최종적으로 원본(한국어) 필드 — JSON 없어도 동작 불변.
   → ko 모드도 JSON이 우선(로케일 오버라이드로 데이터 표 문자열 핫픽스 가능). */
export function LF(obj, field) {
  if (!obj) return '';
  if (obj._lk) {
    const table = STR[obj._lk + '.' + field];
    if (table != null) return pick(table);
  }
  if (lang !== 'ko') {
    const en = obj[field + 'En'];   // ja도 JSON 미비 시 병기 필드(En)로 폴백
    if (en != null) return en;
  }
  return obj[field] ?? '';
}
// 배열 병기 필드(colorNames 등) — 외부화 키는 파이프 결합 문자열, 여기서 인덱스 복원.
export function LC(obj, field, i) {
  if (!obj) return '';
  if (obj._lk) {
    const table = STR[obj._lk + '.' + field];
    if (table != null) {
      const part = String(pick(table)).split('|')[i];
      if (part != null) return part;
    }
  }
  const enArr = obj[field + 'En'];
  if (lang !== 'ko' && Array.isArray(enArr) && enArr[i] != null) return enArr[i];
  return obj[field]?.[i] ?? '';
}
export const LN = (obj) => LF(obj, 'name');     // name / nameEn
export const LD = (obj) => LF(obj, 'desc');     // desc / descEn
export const LT = (obj) => LF(obj, 'text');     // text / textEn
export const LL = (obj) => LF(obj, 'label');    // label / labelEn

export function t(id, vars) {
  const table = STR[id];
  if (table == null) return id; // 누락 시 id를 그대로 노출 (개발 중 잔여물 탐지에 유용)
  return fill(pick(table), vars);
}

// index.html: data-i18n="id" → textContent, data-i18n-title="id" → title, data-i18n-html="id" → innerHTML
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  // 네이티브 title 툴팁("웹페이지처럼" — 디렉터 신고)을 커스텀 game-tip(data-tip)으로 대체.
  //   game.js의 플로팅 툴팁이 data-tip을 읽어 body에 게임 스타일로 띄운다. 네이티브 title은 제거.
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('data-tip', t(el.getAttribute('data-i18n-title')));
    el.removeAttribute('title');
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
for (const k in koStr) STR[k] = { ko: koStr[k], en: (enStr[k] != null ? enStr[k] : koStr[k]), ja: jaStr[k] };

// ── 런타임 로케일 오버라이드 (유저가 설치본 locales/*.json 편집 → 재빌드 없이 번역 변경) ──
//   Electron: preload(nineLocale)가 fs로 미리 읽어 동기 노출 → 부팅 시 STR 위에 병합(플래시 없음).
//   웹: fetch('locales/*.json') 비동기 베스트에포트. 파일 없거나 깨지면 내장 기본값 유지(안전).
// 반환: 실제로 값이 바뀐 게 있으면 true (없으면 재렌더 생략 — loose==base일 때 불필요한 재렌더/깜빡임·골든 교란 방지)
function mergeOverride(koObj, enObj, jaObj) {
  let changed = false;
  if (koObj) for (const k in koObj) {
    if (!STR[k]) { STR[k] = { ko: koObj[k], en: koObj[k] }; changed = true; }
    else if (STR[k].ko !== koObj[k]) { STR[k].ko = koObj[k]; changed = true; }
  }
  if (enObj) for (const k in enObj) {
    if (!STR[k]) { STR[k] = { ko: enObj[k], en: enObj[k] }; changed = true; }
    else if (STR[k].en !== enObj[k]) { STR[k].en = enObj[k]; changed = true; }
  }
  if (jaObj) for (const k in jaObj) {
    if (!STR[k]) { STR[k] = { ko: jaObj[k], en: jaObj[k], ja: jaObj[k] }; changed = true; }
    else if (STR[k].ja !== jaObj[k]) { STR[k].ja = jaObj[k]; changed = true; }
  }
  return changed;
}
export function applyLocaleOverrides() {
  const nl = (typeof window !== 'undefined') ? window.nineLocale : null;
  if (nl && (nl.ko || nl.en || nl.ja)) return mergeOverride(nl.ko, nl.en, nl.ja);
  return false;
}
export async function loadLocaleOverridesWeb() {
  if (typeof fetch === 'undefined') return false;
  try {
    const [ko, en, ja] = await Promise.all([
      fetch('locales/ko.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('locales/en.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('locales/ja.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (ko || en || ja) return mergeOverride(ko, en, ja);
  } catch (e) { /* */ }
  return false;
}
STR['title.ver'] = { ko: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}`, en: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}` };
