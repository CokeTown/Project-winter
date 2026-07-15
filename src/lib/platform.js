/* ============================================================
   platform.js — 플랫폼 어댑터 계층 (REQ-STEAM-01)
   ------------------------------------------------------------
   목적: 업적/클라우드/언어를 "인터페이스"로 추상화해, Steamworks 등록 후
        electron 쪽에서 이 인터페이스만 구현 교체하면 되도록 한다.
   현재: 전부 로컬(web) 구현 — 동작은 기존 경로와 완전 동일(diff 0).
        · achievements: 게임 state.achs 위임 (checkAchievements가 실질 게이트)
        · cloud:        localStorage 위임
        · language:     opts.lang 반환
   원칙(ARC-01/05): 이 파일은 순수 어댑터다. 로직/밸런스는 여기 두지 않는다.

   ── Steam 도전과제 매핑표 (등록 시 참조) ──────────────────────
   ACHS[].id (game.js) → Steam API Name (대문자 스네이크). 16종.
     first        → ACH_FIRST_STEPS
     exp10        → ACH_VETERAN_SCAVENGER
     exp30        → ACH_LORD_OF_THE_RUINS
     craft5       → ACH_HANDY
     craft20      → ACH_RUINS_ARTISAN
     comfort90    → ACH_PERFECT_REFUGE
     settled8     → ACH_SETTLED_HOME
     renov3       → ACH_PIONEER
     renovAll     → ACH_EVERYWHERE_IS_HOME
     mods3        → ACH_MODDER
     winter       → ACH_PAST_FIRST_WINTER
     nine_winters → ACH_NINE_WINTERS
     col21        → ACH_COLLECTOR
     col42        → ACH_CURATOR
     colAll       → ACH_MUSEUM_KEEPER
     cat          → ACH_CAT_SERVANT
     ending       → ACH_BEYOND_THE_RUINS
     silence      → ACH_SILENCE (히든 — COMMS-KIT §3, 달성률만 노출)
   (총 18종: 일반 17 + 히든 1. Steamworks 콘솔에 위 API Name으로 등록 후 STEAM_ACH_MAP 참조.
    silence는 '히든 업적' 플래그로 등록.)
   ============================================================ */

// ACHS.id → Steam API Name. electron/Steamworks 구현이 이 표로 unlock을 중계한다.
export const STEAM_ACH_MAP = {
  first: 'ACH_FIRST_STEPS',
  exp10: 'ACH_VETERAN_SCAVENGER',
  exp30: 'ACH_LORD_OF_THE_RUINS',
  craft5: 'ACH_HANDY',
  craft20: 'ACH_RUINS_ARTISAN',
  comfort90: 'ACH_PERFECT_REFUGE',
  settled8: 'ACH_SETTLED_HOME',
  renov3: 'ACH_PIONEER',
  renovAll: 'ACH_EVERYWHERE_IS_HOME',
  mods3: 'ACH_MODDER',
  winter: 'ACH_PAST_FIRST_WINTER',
  nine_winters: 'ACH_NINE_WINTERS',
  col21: 'ACH_COLLECTOR',
  col42: 'ACH_CURATOR',
  colAll: 'ACH_MUSEUM_KEEPER',
  cat: 'ACH_CAT_SERVANT',
  ending: 'ACH_BEYOND_THE_RUINS',
  // 침묵 암호 업적 — COMMS-KIT §3: Steam엔 '히든 업적'(달성률만 노출)으로 등록해 커뮤니티 고고학을 유도.
  //   in-game은 무기록(quiet: 토스트·저널 연출 0)이지만 Steam 중계는 한다(quiet=연출만 스킵, unlock은 호출).
  //   Steamworks 콘솔에서 이 업적은 '히든' 플래그로 등록할 것 (이름·설명 비공개, 아이콘 실루엣).
  silence: 'ACH_SILENCE',
};

// Steamworks 네이티브 브릿지 후보(등록 후 preload가 노출). 지금은 없음 → 항상 null.
function steamBridge() {
  return (typeof window !== 'undefined' && window.nineSteam && window.nineSteam.available)
    ? window.nineSteam : null;
}

// hooks: 게임(game.js)이 자신의 상태 접근자를 주입한다. 순환 import 회피.
//   { getAchs, setAch, getLang }
let _hooks = {
  getAchs: () => ({}),
  setAch: () => {},
  getLang: () => 'ko',
};

export function bindPlatform(hooks) {
  _hooks = { ..._hooks, ...hooks };
}

export const Platform = {
  // 'web' | 'electron' — Steamworks 브릿지가 붙으면 electron 판정.
  get name() { return steamBridge() ? 'electron' : 'web'; },

  achievements: {
    // 업적 해금: 로컬 state.achs에 위임(멱등). Steam 브릿지가 있으면 함께 중계.
    unlock(id) {
      _hooks.setAch(id);
      const br = steamBridge();
      if (br && STEAM_ACH_MAP[id]) { try { br.unlock(STEAM_ACH_MAP[id]); } catch (e) { /* no-op */ } }
    },
    isUnlocked(id) { return !!_hooks.getAchs()[id]; },
  },

  cloud: {
    // 클라우드 세이브: 현재 localStorage 위임(웹/PC 공통). Steam Cloud는 파일 동기화라
    // 브릿지가 붙어도 localStorage가 truth로 유지되고 브릿지는 미러링만 한다(등록 시 구현).
    save(k, v) {
      // 실패(quota 초과·file:// 등)를 조용히 삼키지 않고 false 반환 — 호출부가 유저 고지 여부를 결정한다.
      try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
    },
    load(k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
  },

  // 언어: 기본은 opts.lang. Steam 브릿지가 있으면 스팀 언어 우선(자동 언어 REQ).
  language() {
    const br = steamBridge();
    if (br && typeof br.language === 'function') {
      try { const l = br.language(); if (l === 'ko' || l === 'en') return l; } catch (e) { /* no-op */ }
    }
    return _hooks.getLang() || 'ko';
  },
};
