/* ============================================================
   ui/keybind.js — 컨트롤 탭 키 리바인딩 UI (#210 UI 컴포넌트화 · #14 리바인딩)
   ------------------------------------------------------------
   설정 창 Controls 탭: PC = 실제 리바인딩 UI(액션별 키 재배정·중복 스왑 확인),
   모바일 = 제스처 안내표. 리바인딩 대기 상태(awaitingRebind)를 모듈 내부에 소유하고,
   입력 캡처(captureRebind)는 game.js keydown 핸들러가 isAwaitingRebind()로 게이트해 위임한다.
   로직 원문 이관(무변) — 등가성은 배터리/골든 + 하네스 기능 테스트로 보증. 단방향 — 모듈은 game.js를 모른다.
   입력 코어(KEYBINDS 데이터·keyLabel·save/resetKeybinds·keyForAction·actionForEvent)는 game.js 잔류(광범위 사용),
   이 모듈은 그 코어를 ctx로 주입받아 UI만 담당한다.
   ============================================================ */
import { t } from '../i18n.js';
const $ = id => document.getElementById(id);

// 액션 → i18n 라벨 키 (Controls 탭 행 설명)
const KEYBIND_LABEL = {
  map: 'ctrl.act.map', migrate: 'ctrl.act.migrate', craft: 'ctrl.act.craft', clean: 'ctrl.act.clean',
  sleep: 'ctrl.act.sleep', journal: 'ctrl.act.journal', pause: 'ctrl.act.pause', editMode: 'ctrl.act.editMode',
  rotViewL: 'ctrl.act.rotViewL', rotViewR: 'ctrl.act.rotViewR', rotateItem: 'ctrl.act.rotateItem', reclaim: 'ctrl.act.reclaim',
  hudExt: 'ctrl.act.hudExt',
};

export function makeKeybindUI(ctx) {
  const { KEYBINDS, KEYBIND_ORDER, keyLabel, resetKeybinds, saveKeybinds, isPcInput, gameConfirm, toast } = ctx;
  let awaitingRebind = null; // 리바인딩 대기 중인 액션 (설정 창)

  function renderControlsGuide() {
    const el = $('controls-guide'); if (!el) return;
    if (isPcInput) {
      // ESC 시스템 예약 행(리바인딩 불가) + 액션 12행(클릭→키 대기)
      const escRow = `<div class="cg-row"><span class="cg-key cg-fixed">ESC</span><span class="cg-desc">${t('ctrl.esc')} <span class="cg-reserved">${t('ctrl.reserved')}</span></span></div>`;
      const rows = KEYBIND_ORDER.map(a => {
        const waiting = awaitingRebind === a;
        const label = waiting ? t('ctrl.pressKey') : keyLabel(KEYBINDS[a]);
        return `<div class="cg-row"><button class="cg-key cg-bind${waiting ? ' waiting' : ''}" data-rebind="${a}">${label}</button><span class="cg-desc">${t(KEYBIND_LABEL[a])}</span></div>`;
      }).join('');
      el.innerHTML = escRow + rows + `<div class="btn-row" style="margin-top:10px"><button class="pixel-btn" id="btn-keys-default">${t('ctrl.rebindDefault')}</button></div>`;
      el.querySelectorAll('.cg-bind').forEach(b => b.addEventListener('click', () => startRebind(b.dataset.rebind)));
      const bd = el.querySelector('#btn-keys-default');
      if (bd) bd.addEventListener('click', () => { awaitingRebind = null; resetKeybinds(); renderControlsGuide(); toast(t('ctrl.rebindDone')); });
    } else {
      const row = (k, d) => `<div class="cg-row"><span class="cg-key cg-fixed">${k}</span><span class="cg-desc">${d}</span></div>`;
      el.innerHTML = row(t('ctrl.tap.k'), t('ctrl.tap')) + row(t('ctrl.drag.k'), t('ctrl.drag')) + row(t('ctrl.pinch.k'), t('ctrl.pinch'))
        + `<div class="cg-note">${t('ctrl.mobileNote')}</div>`;
    }
  }
  function startRebind(action) {
    awaitingRebind = action;
    renderControlsGuide();
  }
  // 리바인딩 캡처: ESC 취소, 중복 시 스왑 확인. 성공 시 저장·재렌더.
  async function captureRebind(e) {
    e.preventDefault();
    const action = awaitingRebind;
    if (e.key === 'Escape') { awaitingRebind = null; renderControlsGuide(); return; }
    // ESC/시스템키 외 아무 키나 code로 캡처. reclaim에 Backspace도 유효.
    const code = e.code;
    if (!code || code === 'Escape') return;
    // 이미 이 액션이면 그대로 유지하고 종료
    if (KEYBINDS[action] === code) { awaitingRebind = null; renderControlsGuide(); return; }
    // 중복 검사: 다른 액션이 이 code를 이미 쓰는가?
    const conflict = KEYBIND_ORDER.find(a => a !== action && KEYBINDS[a] === code);
    awaitingRebind = null; // 캡처는 여기서 종료 (확인창 동안 추가 캡처 금지)
    if (conflict) {
      renderControlsGuide(); // '키 입력 대기' 라벨 원복 후 확인창
      const ok = await gameConfirm(
        t('ctrl.swapConfirm', { key: keyLabel(code), from: t(KEYBIND_LABEL[conflict]), to: t(KEYBIND_LABEL[action]) }),
        t('ctrl.swap'), t('confirm.cancel'));
      if (!ok) { renderControlsGuide(); return; }
      KEYBINDS[conflict] = KEYBINDS[action]; // 기존 액션의 키를 충돌 액션에 넘겨 스왑
    }
    KEYBINDS[action] = code;
    saveKeybinds();
    renderControlsGuide();
    toast(t('ctrl.rebindDone'));
  }

  // 입력 핸들러 게이트용: game.js keydown이 isAwaitingRebind() 시 captureRebind로 위임.
  return { renderControlsGuide, captureRebind, isAwaitingRebind: () => awaitingRebind != null };
}
