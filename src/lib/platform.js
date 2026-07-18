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

   ── Steam 도전과제 매핑표 ──────────────────────
   ⚠️ 콘솔 정합(디렉터 실등록 확인 2026-07-17): Steamworks에 스팀 기본 API명
   NEW_ACHIEVEMENT_1_0 ~ 1_15로 16종이 이미 등록·현지화(4950160_loc_upload.vdf)됐다.
   API명은 게시 후 변경이 어렵다 — 코드가 콘솔을 따른다(구 ACH_* 계획명 폐기).
   슬롯 순서 = ACHS 순서에서 mods3·winter(미등록 2종)를 뺀 것. 미등록 2종은
   디렉터가 콘솔 신규 생성 시 API명을 아래 값(1_16·1_17) 그대로 입력해야 한다.
   정본 표: docs/steam/ACHIEVEMENTS-SUBMIT.md
   ============================================================ */

// 서포터팩 DLC id → Steam DLC AppID. 콘솔 실등록 후 디렉터가 실 AppID로 교체(현재 placeholder 0 = 미소유 판정).
//   정본: docs/design/ROADMAP-RELEASE-2.0.md #117. AppID 0이면 owns()는 항상 false(브릿지 게이트가 falsy).
export const STEAM_DLC_APPID = {
  supporter: 0, // TODO 디렉터: Steamworks 서포터팩 DLC AppID 등록 후 이 값 교체
};

// ACHS.id → Steam API Name(콘솔 실등록명). electron/Steamworks 구현이 이 표로 unlock을 중계한다.
export const STEAM_ACH_MAP = {
  first: 'NEW_ACHIEVEMENT_1_0',
  exp10: 'NEW_ACHIEVEMENT_1_1',
  exp30: 'NEW_ACHIEVEMENT_1_2',
  craft5: 'NEW_ACHIEVEMENT_1_3',
  craft20: 'NEW_ACHIEVEMENT_1_4',
  comfort90: 'NEW_ACHIEVEMENT_1_5',
  settled8: 'NEW_ACHIEVEMENT_1_6',
  renov3: 'NEW_ACHIEVEMENT_1_7',
  renovAll: 'NEW_ACHIEVEMENT_1_8',
  nine_winters: 'NEW_ACHIEVEMENT_1_9',
  col21: 'NEW_ACHIEVEMENT_1_10',
  col42: 'NEW_ACHIEVEMENT_1_11',
  colAll: 'NEW_ACHIEVEMENT_1_12',
  cat: 'NEW_ACHIEVEMENT_1_13',
  ending: 'NEW_ACHIEVEMENT_1_14',
  // 침묵 암호 업적 — COMMS-KIT §3: Steam엔 '히든 업적'(달성률만 노출)으로 등록해 커뮤니티 고고학을 유도.
  //   in-game은 무기록(quiet: 토스트·저널 연출 0)이지만 Steam 중계는 한다(quiet=연출만 스킵, unlock은 호출).
  silence: 'NEW_ACHIEVEMENT_1_15',
  // ── 콘솔 미등록 2종 (디렉터 생성 대기 — API명을 정확히 이 값으로) ──
  mods3: 'NEW_ACHIEVEMENT_1_16',
  winter: 'NEW_ACHIEVEMENT_1_17',
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

  // DLC 소유 판정 (#117 서포터팩 게이트). Steam 브릿지가 있으면 isDlcInstalled, 없으면 로컬 오버라이드(QA/개발) 또는 false.
  //   #119 서포터 콘텐츠(복장·러시안블루)는 owns('supporter') 뒤에서만 해금·노출된다.
  dlc: {
    owns(id) {
      // QA/개발 오버라이드: 실 DLC 없이 서포터 콘텐츠를 켜서 검수(QA 에디션·캡처·개발). 실 결제 우회가 아니라 로컬 표시 토글.
      try { if (localStorage.getItem('nine_dlc_' + id) === '1') return true; } catch (e) { /* no-op */ }
      const br = steamBridge();
      const appId = STEAM_DLC_APPID[id];
      if (br && appId) { try { return !!br.isDlcInstalled(appId); } catch (e) { return false; } }
      return false;
    },
    // QA/개발 강제 토글(localStorage). game.js QA 훅이 중계.
    setOverride(id, on) {
      try { if (on) localStorage.setItem('nine_dlc_' + id, '1'); else localStorage.removeItem('nine_dlc_' + id); } catch (e) { /* no-op */ }
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
