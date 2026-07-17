/* ============================================================
   ui/notebook.js — 수첩 페이지(#73 Tier7: game.js 모놀리스 분해)
   ------------------------------------------------------------
   종이 페이지 오버레이(#journal-screen) 렌더러 + 열람 4종:
   도움말(5쪽) · 메모/유서 · 밤하늘 스케치 · 그날의 진실(3쪽).
   원문 그대로 이관(로직 무변) — 등가성은 4경로 innerHTML 해시 골든.
   잔류 판정: showDoctorDocPage(침묵 루트 — gameConfirm·runSiloSequence 결합),
   showBroadcastModal(라디오 버블 시스템), 튜토리얼 페이지(체인 상태 결합).
   게임 측 헬퍼는 initNotebook 주입 — applyPaperBg·paperSfx(팁 쪽지와 공용이라
   game.js 소유 유지), setJournalOpen(게이트 플래그 journalOpen이 game.js
   렌더 루프 14곳에서 읽히는 잔류 전역이라 setter만 받는다). 단방향 — 모듈은
   game.js를 모른다(vignettes.js 선례).
   ============================================================ */
import { t, LN, LD } from '../i18n.js';
import { state } from '../core/state.js';
import { MEMOS, WILLS, SKETCHES } from '../data/lore.js';

const DEMO_ED = typeof __DEMO__ !== 'undefined' && !!__DEMO__;
const $ = id => document.getElementById(id);

let applyPaperBg, paperSfx, setJournalOpen;
export function initNotebook(h) { ({ applyPaperBg, paperSfx, setJournalOpen } = h); }

let journalKeyHandler = null;
export function openJournalPages(pages, opts = {}) {
  if (!pages || !pages.length) return;
  if (DEMO_ED && state.demoEnded) return; // #74: 데모 종료 뒤엔 신규 페이퍼 금지 (엔드 스크린 덮개 방지)
  let i = 0;
  const scr = $('journal-screen'), paper = $('journal-paper');
  const titleEl = $('journal-title'), bodyEl = $('journal-body'), indEl = $('journal-page-ind');
  const prevBtn = $('journal-prev'), nextBtn = $('journal-next');
  applyPaperBg(paper);
  paperSfx(opts);

  const render = () => {
    const p = pages[i];
    // titleId/bodyId 는 i18n 키, title/body 는 이미 해석된 원문(메모 등 데이터 테이블 문안)
    titleEl.innerHTML = p.titleId ? t(p.titleId, p.titleArgs) : (p.title || '');
    bodyEl.innerHTML = p.bodyId ? t(p.bodyId, p.bodyArgs) : (p.body || '');
    indEl.textContent = t('journalpg.indicator', { cur: i + 1, total: pages.length });
    prevBtn.style.display = i > 0 ? '' : 'none';
    nextBtn.textContent = i === pages.length - 1 ? t('journalpg.close') : t('journalpg.next');
  };
  function close() {
    setJournalOpen(false);
    scr.classList.remove('show');
    scr.style.display = 'none';
    prevBtn.onclick = null;
    nextBtn.onclick = null;
    if (journalKeyHandler) { document.removeEventListener('keydown', journalKeyHandler); journalKeyHandler = null; }
    if (typeof opts.onClose === 'function') opts.onClose();
  }
  // onclick 대입: 재호출 시 이전 리스너가 겹쳐 쌓이지 않도록 (ending-next와 동일 패턴)
  prevBtn.onclick = () => { if (i > 0) { i--; render(); } };
  nextBtn.onclick = () => {
    if (i < pages.length - 1) { i++; render(); }
    else close();
  };
  if (journalKeyHandler) document.removeEventListener('keydown', journalKeyHandler);
  journalKeyHandler = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', journalKeyHandler);

  setJournalOpen(true);
  scr.style.display = 'flex';
  void paper.offsetWidth; // 리플로우 강제 — 진입 애니메이션이 매번 재생되도록
  scr.classList.add('show');
  render();
}

export function openHelpModal(opts) {
  openJournalPages([
    { titleId: 'jnl.help.p1.title', bodyId: 'jnl.help.p1.body' },
    { titleId: 'jnl.help.p2.title', bodyId: 'jnl.help.p2.body' },
    { titleId: 'jnl.help.p3.title', bodyId: 'jnl.help.p3.body' },
    { titleId: 'jnl.help.p4.title', bodyId: 'jnl.help.p4.body' },
    { titleId: 'jnl.help.p5.title', bodyId: 'jnl.help.p5.body' },
  ], opts);
}

// 세계관 메모/유서 열람 (쪽지 톤) — 수집 시 팝업 + 수첩 기록 탭에서 재열람 시 공용.
export function showMemoPage(id, will) {
  const tbl = will ? WILLS : MEMOS;
  const m = tbl[id];
  if (!m) return;
  const tag = will ? t('memo.tagWill') : t('memo.tagRegion.' + m.region);
  const body = `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${tag}</div>` +
    `<div style="white-space:pre-line;line-height:1.9">${LD(m)}</div>`;
  openJournalPages([{ title: LN(m), body }]);
}
// 1.3 밤하늘 스케치 페이지 — 메모 페이지 문법 재사용. 관측소가 열어준 감상 보상.
export function showSketchPage(id) {
  const s = SKETCHES[id];
  if (!s) return;
  const body = `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${t('sketch.tag')}</div>` +
    `<div style="white-space:pre-line;line-height:1.9">${LD(s)}</div>`;
  openJournalPages([{ title: LN(s), body }]);
}
// 1.4 최종장 "그날의 진실" — 기밀 문서 12종 전부 수집 시 열리는 회고 페이지(다중 페이지, 메모 페이지 문법).
//   조용한 발견의 톤: 극적 폭로가 아니라 흩어진 기록을 이어 붙인 한 사람의 정리. 지시조 금지.
export function showTruthPage() {
  const pages = [1, 2, 3].map(n => ({
    title: t('truth.title'),
    body: `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${t('truth.tag')}</div>` +
      `<div style="white-space:pre-line;line-height:1.9">${t('truth.p' + n)}</div>`,
  }));
  openJournalPages(pages);
}
