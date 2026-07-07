// ui/modals.js — Tier4 UI 추출 Phase1-⑤: 모달 빌더(파일럿 = openModeModal).
//   모달은 #modal-body에 HTML을 짓고 addEventListener 클로저로 배선하는 UI 오케스트레이터.
//   t/BAL/DEFAULT_STATE/opts는 직접 import, $는 자체 정의. game.js 클로저(openModal/toast/
//   wallpaperUnlocked/openSlotModal/slotKey/LASTSLOT_KEY/DEMO_ED/SHELTERS)만 ctx 주입.
//   게이트: 모달 DOM 스냅샷(tests/grounding/modal-golden — mode)이 innerHTML 무손실을 검증.
import { t } from '../i18n.js';
import { BAL } from '../data/balance.js';
import { DEFAULT_STATE, opts } from '../core/state.js';

export function makeModals(ctx) {
  const { openModal, toast, wallpaperUnlocked, openSlotModal, slotKey, LASTSLOT_KEY, DEMO_ED, SHELTERS } = ctx;
  const $ = id => document.getElementById(id);

  function openModeModal(n) {
    const card = (mode, titleId, tagId, descId, opt = {}) => {
      const lock = opt.locked;
      // ★ 템플릿 리터럴 선행 공백 = 출력 HTML에 그대로 들어감. 코드 들여쓰기와 무관하게 원본(4/6/8칸) 유지 (모달 게이트 무손실).
      return `
    <div class="slot-card mode-card ${lock ? 'locked' : ''}" data-mode="${mode}" data-locked="${lock ? 1 : 0}">
      <div class="sl-body">
        <div class="mc-title">${lock ? '🔒 ' : ''}${t(titleId)}</div>
        <div class="mc-tag">${t(tagId)}</div>
        <div class="sl-meta">${lock ? t('mode.wallpaper.lock', { n: BAL.rescue.unlockDay }) : t(descId)}</div>
      </div>
    </div>`;
    };
    const wpLocked = !wallpaperUnlocked();
    // #74 데모: 노말만 — 모드 다양성은 정식판의 것 (Next Fest 「첫 번째 겨울」 게이트와 한 몸)
    const body = `<div class="mode-scroll">`
      + card('normal', 'mode.normal', 'mode.normal.tag', 'mode.normal.desc')
      + (DEMO_ED ? '' : card('hard', 'mode.hard', 'mode.hard.tag', 'mode.hard.desc')
        + card('hardcore', 'mode.hardcore', 'mode.hardcore.tag', 'mode.hardcore.desc')
        + card('zen', 'mode.zen', 'mode.zen.tag', 'mode.zen.desc')
        + card('wallpaper', 'mode.wallpaper', 'mode.wallpaper.tag', 'mode.wallpaper.desc', { locked: wpLocked }))
      + `</div><button class="pixel-btn mode-back">${t('mode.back')}</button>`;
    openModal(t('mode.pick.title'), body);
    $('modal-body').querySelector('.mode-back').addEventListener('click', () => openSlotModal('new'));
    $('modal-body').querySelectorAll('.mode-card').forEach(c => c.addEventListener('click', () => {
      if (c.dataset.locked === '1') { toast(t('mode.wallpaper.lockToast', { n: BAL.rescue.unlockDay })); return; }
      const m = c.dataset.mode;
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      fresh.savedAt = Date.now();
      fresh.helpSeen = true;
      fresh.mode = ['hard', 'zen', 'hardcore', 'wallpaper'].includes(m) ? m : 'normal';
      // ♾️ 무한 모드: 넉넉한 시작 물자 가산 (노말 밸런스 위에)
      if (fresh.mode === 'zen') {
        for (const [rid, n2] of Object.entries(BAL.economy.zenStart || {})) fresh.res[rid] = (fresh.res[rid] || 0) + n2;
      }
      // 🖼️ 배경화면 모드: 셸터 전 해금 + 무한 물자(표시는 ∞) + 배치/꾸미기 전용.
      //   successes를 최고 해금선까지 올려 전 셸터를 열고, 게이지는 만땅으로 시작(무력 미적용).
      if (fresh.mode === 'wallpaper') {
        fresh.successes = Math.max(...Object.values(SHELTERS).map(s => s.unlockAt || 0));
        // 게이지는 decayGauges가 배경화면에서 정지시키고 HUD도 숨긴다 — DEFAULT_STATE 값 그대로 둔다.
      }
      // 새 게임은 자동 진행이 '해금만' 된 상태로 시작 — 기본 OFF. (실기기 신고: zen이 시작하자마자 자동 돌입)
      // opts는 전역 지속값이라 이전 게임에서 켰던 autoPlay가 새 슬롯에 그대로 새지 않게 여기서 끈다.
      // 유저는 첫 아침 해금 팝업('지금 켠다')으로 직접 선택한다.
      opts.autoPlay = false;
      localStorage.setItem(slotKey(n), JSON.stringify({ state: fresh, opts }));
      localStorage.setItem(LASTSLOT_KEY, String(n));
      // 배경화면 모드는 인트로(생존 서사) 건너뛰고 바로 진입 — 살아남기 없이 살아보기.
      if (fresh.mode === 'wallpaper') sessionStorage.setItem('ps-load', '1');
      else sessionStorage.setItem('ps-intro', '1');
      location.reload();
    }));
  }

  return { openModeModal };
}
