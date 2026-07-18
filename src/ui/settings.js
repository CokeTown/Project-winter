/* ============================================================
   ui/settings.js — 설정 모달 (#210 UI 컴포넌트화 · #73 모놀리스 분해)
   ------------------------------------------------------------
   셸(열기/닫기/토글/탭) + 탭별 기본값 복원 + 그래픽/사운드/게임플레이/접근성 컨트롤 배선.
   로직 원문 이관(무변) — 등가성은 배터리/골든 + 하네스 기능 테스트로 보증.
   game.js 측 헬퍼 주입: renderControlsGuide는 makeSettingsUI ctx, 렌더/오디오 적용자는
   bindControls(dep)로 늦게 주입(bgm 등이 game.js 후반 정의 → TDZ 회피). 단방향 — 모듈은 game.js를 모른다.
   잔류(후속 단계): 키 리바인딩(renderControlsGuide/captureRebind) · Electron 디스플레이 IIFE.
   ============================================================ */
import { t } from '../i18n.js';
import { opts, OPTS_DEFAULT } from '../core/state.js';
import { setSfxVol, setAmbience, setFire } from '../sfx.js';
const $ = id => document.getElementById(id);

export function makeSettingsUI(ctx) {
  const { renderControlsGuide } = ctx;
  let d = null; // bindControls로 주입되는 렌더/오디오 적용자·게임 콜백 (후반 정의 의존)

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

  // 현재 활성 탭의 opts만 선언부 기본값으로 복원 (전역 리셋 아님)
  function resetTabToDefault() {
    const active = document.querySelector('#settings-tabs .settings-tab.active')?.dataset.tab;
    const D = OPTS_DEFAULT;
    if (active === 'graphics') {
      opts.pixel = D.pixel; opts.quant = D.quant; opts.dither = D.dither;
      opts.ceil = D.ceil; opts.lowSpec = D.lowSpec; opts.fpsCap = D.fpsCap;
      // 접근성도 그래픽 탭에 배치되므로 함께 기본값 복원
      opts.fontScale = D.fontScale; opts.colorblind = D.colorblind; opts.reduceMotion = D.reduceMotion;
      d.applyOpts(); d.applyLowSpec();
    } else if (active === 'sound') {
      opts.bgm = D.bgm; opts.bgmVol = D.bgmVol; opts.sfxVol = D.sfxVol; opts.bgIdle = D.bgIdle;
      // 사운드 UI + 실효 반영
      const eb = $('opt-bgm'); if (eb) eb.checked = !!opts.bgm;
      const ev = $('opt-bgmvol'); if (ev) ev.value = Math.round(opts.bgmVol * 100);
      const es = $('opt-sfxvol'); if (es) es.value = Math.round(opts.sfxVol * 100);
      const ei = $('opt-bgidle'); if (ei) ei.checked = opts.bgIdle !== false;
      setSfxVol(opts.sfxVol); d.syncBgm();
    } else if (active === 'gameplay') {
      opts.autoEat = D.autoEat; opts.lang = D.lang; opts.confirmActions = D.confirmActions;
      // 자동 진행은 Day10 해금 상태를 존중 — 기본(off)만 복원
      opts.autoPlay = D.autoPlay; d.syncAutoBtn();
      { const cc = $('opt-confirmactions'); if (cc) cc.checked = !!opts.confirmActions; } // #2
      d.applyOpts();
    }
    d.scheduleSave();
    d.toast(t('settings.defaultDone'));
  }

  // 그래픽/사운드/게임플레이/접근성 컨트롤 배선. bgm 등 game.js 후반 정의를 dep로 늦게 주입받아 배선(TDZ 회피).
  function bindControls(dep) {
    d = dep;
    $('opt-pixel').addEventListener('input', e => { opts.pixel = +e.target.value; d.applyOpts(); d.scheduleSave(); });
    $('opt-quant').addEventListener('change', e => { opts.quant = e.target.checked; d.applyOpts(); d.scheduleSave(); });
    $('opt-dither').addEventListener('change', e => { opts.dither = e.target.checked; d.applyOpts(); d.scheduleSave(); });
    { const eda = $('opt-ditheramt'); if (eda) eda.addEventListener('change', e => { opts.ditherAmt = +e.target.value || 1; d.applyOpts(); d.scheduleSave(); }); }
    { const eaa = $('opt-aa'); if (eaa) eaa.addEventListener('change', e => { opts.aa = e.target.checked; d.applyOpts(); d.scheduleSave(); }); }
    $('opt-ceil').addEventListener('change', e => { opts.ceil = e.target.checked; d.applyOpts(); d.scheduleSave(); });
    $('opt-autoeat').addEventListener('change', e => { opts.autoEat = e.target.checked; d.scheduleSave(); });
    $('opt-autoplay').addEventListener('change', e => { opts.autoPlay = e.target.checked; d.syncAutoBtn(); d.scheduleSave(); });
    { const cc = $('opt-confirmactions'); if (cc) cc.addEventListener('change', e => { opts.confirmActions = e.target.checked; d.scheduleSave(); }); } // #2
    $('opt-fps').addEventListener('change', e => { opts.fpsCap = +e.target.value || 60; d.scheduleSave(); });
    $('opt-lowspec').addEventListener('change', e => { opts.lowSpec = e.target.checked; d.applyLowSpec(); d.scheduleSave(); });
    // 접근성 (REQ-ACC-01)
    {
      const ef = $('opt-fontscale'); if (ef) ef.addEventListener('change', e => { opts.fontScale = +e.target.value || 1; d.applyAccessibility(); d.scheduleSave(); });
      const ecb = $('opt-colorblind'); if (ecb) ecb.addEventListener('change', e => { opts.colorblind = e.target.checked; d.applyAccessibility(); d.scheduleSave(); });
      const erm = $('opt-reducemotion'); if (erm) erm.addEventListener('change', e => { opts.reduceMotion = e.target.checked; d.applyAccessibility(); d.scheduleSave(); });
    }
    $('opt-bgidle').addEventListener('change', e => {
      opts.bgIdle = e.target.checked;
      if (!opts.bgIdle && document.hidden) { d.bgm.pause(); setAmbience(null); setFire(false); }
      else if (opts.bgIdle && document.hidden) d.syncSfxAmbience();
      d.scheduleSave();
    });
    // 언어 전환: 저장 후 재로딩 (라이브 리렌더 대신 단순하게) — veil로 암전 후 전환
    $('opt-lang').addEventListener('change', async e => {
      const next = (e.target.value === 'en' || e.target.value === 'ja') ? e.target.value : 'ko';
      if (next === (opts.lang || 'ko')) return;
      if (!(await d.gameConfirm(t('lang.confirm'), t('confirm.change'), t('confirm.cancel')))) { e.target.value = opts.lang || 'ko'; return; }
      opts.lang = next;
      d.flushSave();               // 즉시 저장 후
      d.reloadWithVeil();          // 재로딩하며 부팅 시 setLang(opts.lang) 적용
    });
  }

  return { settingsOpen, openSettings, closeSettings, toggleSettingsPanel, openSettingsFromGear, switchSettingsTab, resetTabToDefault, bindControls };
}
