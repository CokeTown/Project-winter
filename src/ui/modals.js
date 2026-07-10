// ui/modals.js — Tier4 UI 추출 Phase1-⑤: 모달 빌더(파일럿 = openModeModal).
//   모달은 #modal-body에 HTML을 짓고 addEventListener 클로저로 배선하는 UI 오케스트레이터.
//   t/BAL/DEFAULT_STATE/opts는 직접 import, $는 자체 정의. game.js 클로저(openModal/toast/
//   wallpaperUnlocked/openSlotModal/slotKey/LASTSLOT_KEY/DEMO_ED/SHELTERS)만 ctx 주입.
//   게이트: 모달 DOM 스냅샷(tests/grounding/modal-golden — mode)이 innerHTML 무손실을 검증.
import { t, LN as LName, LD as LDesc } from '../i18n.js'; // LName/LDesc는 game.js 별칭(LN/LD) — 모듈은 직접 alias
import { BAL } from '../data/balance.js';
import { state, DEFAULT_STATE, opts } from '../core/state.js';
import { OUTFITS } from '../data/items.js';
import { KNOWLEDGE, KNOWLEDGE_BRANCHES } from '../data/knowledge.js';
import { hasKnowledge, knowledgePrereqMet, unlockKnowledge } from '../core/knowledge.js';

export function makeModals(ctx) {
  const { openModal, toast, wallpaperUnlocked, openSlotModal, slotKey, LASTSLOT_KEY, DEMO_ED, SHELTERS } = ctx;
  const { getPaused, playSfx, scheduleSave, avatarSys, renderResBar, updateHud } = ctx; // 추가 모달 의존
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
        <div class="sl-meta">${lock ? t('mode.wallpaper.lock', { n: BAL.rescue.unlockDay }) : t(descId)}</div>${opt.extra || ''}
      </div>
    </div>`;
    };
    const wpLocked = !wallpaperUnlocked();
    // #74 데모: 코지+도전 2모드 (#159, 디렉터 2026-07-10 — "그래야 이 게임을 더 잘 알지").
    //   도전(하드)은 상업지구가 추가로 열린다(core/regions.js DEMO_HARD_REGIONS). 하드코어·무한·배경화면은 정식판의 것.
    const demoHardNote = DEMO_ED ? `<div class="sl-meta" style="color:var(--accent);margin-top:2px">${t('demo.hardPerk')}</div>` : '';
    const body = `<div class="mode-scroll">`
      + card('normal', 'mode.normal', 'mode.normal.tag', 'mode.normal.desc')
      + (DEMO_ED
        ? card('hard', 'mode.hard', 'mode.hard.tag', 'mode.hard.desc', { extra: demoHardNote })
        : card('hard', 'mode.hard', 'mode.hard.tag', 'mode.hard.desc')
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

  // ★ 아래 verbatim 이동 함수들 — 코드 들여쓰기는 원본 유지(0-indent)하되 템플릿 리터럴 공백을 보존한다(모달 게이트 무손실 규율).
  function openWardrobeModal() {
  if (getPaused()) { toast(t('pause.blocked')); return; }
  const ownedList = state.outfits || ['default'];
  const cur = state.outfit || 'default';
  // #74 데모(디렉터: "옷도 총 2벌 · 조회 자체가 불가능하게"): 기본 코트 + 네이비만 목록에 노출.
  const outfitIds = DEMO_ED ? Object.keys(OUTFITS).filter(id => id === 'default' || id === 'navy') : Object.keys(OUTFITS);
  const rows = outfitIds.map(id => {
    const o = OUTFITS[id];
    const owned = ownedList.includes(id) || id === 'default';
    const sel = id === cur;
    const sw = (c) => `<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:#${(c ?? 0x5a5648).toString(16).padStart(6, '0')};margin-right:3px;vertical-align:-1px"></span>`;
    return `
      <div class="prep-row ${sel ? 'sel' : owned ? '' : 'no'}" style="cursor:default">
        <span>${o.emoji} ${LName(o)}</span>
        <span class="p-eff" style="font-size:10px">${sw(o.pal.coat)}${sw(o.pal.scarf ?? 0xb8862e)}${owned ? '' : t('wardrobe.locked')}</span>
        ${sel
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('wardrobe.wearing')}</span>`
          : owned
            ? `<button class="pixel-btn" data-wear="${id}" style="margin-left:6px">${t('wardrobe.wear')}</button>`
            : ''}
      </div>`;
  }).join('');
  openModal(`👕 ${t('wardrobe.title')}`, `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${t('wardrobe.hint')}</div>
    ${rows}`);
  $('modal-body').querySelectorAll('button[data-wear]').forEach(b => b.addEventListener('click', () => {
    state.outfit = b.dataset.wear;
    avatarSys.refreshOutfit();
    playSfx('whoosh', { rate: 0.72, vol: 0.5, jitter: 0.06 }); // 갈아입기 = 천 스치는 스윽 (디렉터: 망치질 금지 — 전용 소스 오면 cloth로 교체)
    toast(t('wardrobe.worn', { name: LName(OUTFITS[b.dataset.wear]) }));
    scheduleSave();
    openWardrobeModal(); // 착용 배지 갱신
  }));
  }

  function openKnowledgeModal() {
  if (getPaused()) { toast(t('pause.blocked')); return; }
  const books = state.res.book || 0;
  const sections = KNOWLEDGE_BRANCHES.map(br => {
    const nodes = Object.entries(KNOWLEDGE).filter(([, n]) => n.branch === br.id).sort((a, b) => a[1].tier - b[1].tier);
    const rows = nodes.map(([id, n]) => {
      const has = hasKnowledge(id), pre = knowledgePrereqMet(id), afford = books >= n.cost;
      let right;
      if (has) right = `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('know.learned')}</span>`;
      else if (!pre) right = `<span style="color:var(--text-dim);font-size:10px;margin-left:6px">${t('know.locked')}</span>`;
      else right = `<button class="pixel-btn" data-know="${id}" ${(pre && afford) ? '' : 'disabled'} style="margin-left:6px">${t('know.learn', { n: n.cost })}</button>`;
      return `
      <div class="prep-row ${has ? 'sel' : (pre && afford) ? '' : 'no'}" style="cursor:default">
        <span>${LName(n)} <span style="color:var(--text-dim);font-size:10px">·${t('know.cost', { n: n.cost })}</span></span>
        <span class="p-eff" style="font-size:10px">${LDesc(n)}</span>
        ${right}
      </div>`;
    }).join('');
    return `<div style="margin-top:8px"><div style="font-weight:bold;font-size:12px;margin-bottom:2px">${br.emoji} ${LName(br)}</div>${rows}</div>`;
  }).join('');
  openModal(`📚 ${t('know.title')}`, `<div style="font-size:12px;color:var(--accent);margin-bottom:6px">${t('know.books', { n: books })}</div>${sections}`);
  $('modal-body').querySelectorAll('button[data-know]').forEach(b =>
    b.addEventListener('click', () => {
      if (unlockKnowledge(b.dataset.know)) { playSfx('craft'); renderResBar(); updateHud(); openKnowledgeModal(); }
      else toast(t('toast.needResource'));
    }));
  }

  return { openModeModal, openWardrobeModal, openKnowledgeModal };
}
