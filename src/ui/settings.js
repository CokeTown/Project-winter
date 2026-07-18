/* ============================================================
   ui/settings.js — 설정 모달 (#210 UI 컴포넌트화 · #73 모놀리스 분해)
   ------------------------------------------------------------
   1단계(셸): 열기/닫기/토글/탭 전환. 순수 DOM 오버레이 상태 — 로직 무변 이관.
   game.js 측 헬퍼는 makeSettingsUI ctx 주입(renderControlsGuide=키 리바인딩 가이드 렌더).
   단방향 — 모듈은 game.js를 모른다(ui/notebook.js·render/vignettes.js 선례).
   후속 단계: 그래픽/사운드/게임플레이 컨트롤 배선 · 탭별 기본값 복원 · 리바인딩 · 디스플레이 IIFE.
   ============================================================ */
const $ = id => document.getElementById(id);

export function makeSettingsUI(ctx) {
  const { renderControlsGuide } = ctx;

  function settingsOpen() { return $('settings-screen').classList.contains('show'); }
  function switchSettingsTab(name) {
    document.querySelectorAll('#settings-tabs .settings-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('#settings-tabbody .settings-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
  }
  function openSettings(tab) {
    const scr = $('settings-screen');
    scr.classList.add('show');
    scr.style.display = 'flex';
    if (tab) switchSettingsTab(tab);
    renderControlsGuide();
  }
  function closeSettings() {
    const scr = $('settings-screen');
    scr.classList.remove('show');
    scr.style.display = 'none';
  }
  function toggleSettingsPanel() { settingsOpen() ? closeSettings() : openSettings(); }
  // 하위 호환: 기존 gear 진입점 명칭 유지 (토글)
  function openSettingsFromGear() { toggleSettingsPanel(); }

  return { settingsOpen, openSettings, closeSettings, toggleSettingsPanel, openSettingsFromGear, switchSettingsTab };
}
