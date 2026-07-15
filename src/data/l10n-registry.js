/* ============================================================
   data/l10n-registry.js — #114 Phase 2: 데이터 테이블 병기 문자열 외부화 레지스트리
   ------------------------------------------------------------
   원리: 데이터 모듈의 *En 병기 필드(name/nameEn, desc/descEn, colorNames/colorNamesEn…)를
   자동 발견해 로케일 키(data.<표>.<id>.<필드>)로 내보내고(제너레이터), 런타임엔 각 엔트리에
   비열거 _lk 키를 스탬프해 i18n LF/LC가 로케일 JSON을 우선 읽게 한다.
   - 원본 병기 필드는 그대로 잔류 = 폴백 (JSON 없어도 동작 불변 — 무손실 원칙)
   - _lk는 enumerable:false — SHELTER_HASH 등 필드 해시 핀·JSON.stringify에 안 보임
   - 표 등록만 하면 필드는 자동 수집: 신규 *En 필드는 제너레이터 재실행으로 합류
   - 스코프 밖(문서 명기): game.js 잔류 표(WEATHERS·ACHS — #73 분리 후 합류),
     decotex.js(런타임 클로저 생성), events/lore 대사 계열의 문맥 시트는 #141 트랙.
   사용: 제너레이터 node tools/export-data-i18n.mjs · 런타임 game.js 부팅 시 stampDataL10n()
============================================================ */
import { DEFS } from './furniture.js';
import { RESOURCES, INJURIES, PREPS, THEME_SETS, OUTFITS, CRAFTS } from './items.js';
import { SHELTER_META } from './shelters.js';
import { DISTRICTS, REGIONS, WEATHERS } from './world.js';
import { ACH_DEFS } from './achs.js';
import { KNOWLEDGE, KNOWLEDGE_BRANCHES } from './knowledge.js';
import { PAINT_FAMILIES, RARE_PAINTS } from './paints.js';
import { WILDLIFE_SPECIES } from './wildlife.js';
import { MEMOS, WILLS, BROADCASTS, SKETCHES } from './lore.js';

// [prefix, table, keyFn?] — 배열 표는 keyFn으로 안정 키 도출 (인덱스 키는 재정렬에 깨져 금지)
const TABLES = [
  ['def', DEFS],
  ['res', RESOURCES],
  ['injury', INJURIES],
  ['prep', PREPS],
  ['theme', THEME_SETS, (e) => e.id],
  ['outfit', OUTFITS],
  ['craft', CRAFTS, (e) => e.out?.furn || e.out?.outfit || (e.out?.res ? 'res_' + e.out.res : null)],
  ['shelter', SHELTER_META],
  ['district', DISTRICTS],
  ['region', REGIONS],
  ['weather', WEATHERS], // #73 Tier4 이관분
  ['ach', ACH_DEFS, (e) => e.id],
  ['know', KNOWLEDGE],
  ['knowbr', KNOWLEDGE_BRANCHES, (e) => e.id],
  ['paintfam', PAINT_FAMILIES],
  ['paintrare', RARE_PAINTS],
  ['wild', WILDLIFE_SPECIES],
  ['memo', MEMOS],
  ['will', WILLS],
  ['bcast', BROADCASTS],
  ['sketch', SKETCHES],
];

const PLAIN = (o) => o != null && typeof o === 'object' && !Array.isArray(o);
const defineLk = (o, lk) => Object.defineProperty(o, '_lk', { value: lk, enumerable: false, configurable: true, writable: true });

// 엔트리에서 병기 필드 수집(+선택적 _lk 스탬프). 중첩 객체(perk/appliance/upkeep 등)는 재귀 —
// 병기 필드가 실제로 있는 가지만 키·스탬프가 생긴다(cost/cure 같은 수치 객체는 무시).
function collect(obj, lkBase, out, stamp) {
  let has = false;
  for (const f of Object.keys(obj)) {
    if (!f.endsWith('En')) continue;
    const base = f.slice(0, -2);
    const koV = obj[base], enV = obj[f];
    if (typeof koV === 'string' && typeof enV === 'string') {
      out.push({ key: `${lkBase}.${base}`, ko: koV, en: enV }); has = true;
    } else if (Array.isArray(koV) && Array.isArray(enV) && koV.every((s) => typeof s === 'string')) {
      // 배열 병기(colorNames 등)는 파이프 결합 단일 키 — LC가 split('|')로 복원
      out.push({ key: `${lkBase}.${base}`, ko: koV.join('|'), en: enV.join('|') }); has = true;
    }
  }
  for (const f of Object.keys(obj)) {
    const v = obj[f];
    if (!PLAIN(v) || f.endsWith('En')) continue;
    const sub = [];
    if (collect(v, `${lkBase}.${f}`, sub, stamp)) {
      out.push(...sub);
      if (stamp) defineLk(v, `${lkBase}.${f}`);
      has = true;
    }
  }
  if (has && stamp) defineLk(obj, lkBase);
  return has;
}

// 전 표 순회 → [{key, ko, en}] (stamp=true면 런타임 _lk 부여까지)
export function walkDataL10n(stamp = false) {
  const out = [];
  const seen = new Set();
  for (const [prefix, table, keyFn] of TABLES) {
    const entries = Array.isArray(table)
      ? table.map((e, i) => [keyFn ? keyFn(e, i) : e?.id, e])
      : Object.entries(table);
    for (const [id, e] of entries) {
      if (!id || !PLAIN(e)) continue;
      let lk = `data.${prefix}.${id}`;
      let n = 2;
      while (seen.has(lk)) lk = `data.${prefix}.${id}_${n++}`; // 배열 표 중복 키(동일 out 레시피) 안정 접미
      seen.add(lk);
      collect(e, lk, out, stamp);
    }
  }
  return out;
}

export function stampDataL10n() { walkDataL10n(true); }
