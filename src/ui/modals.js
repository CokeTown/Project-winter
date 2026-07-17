// ui/modals.js — Tier4 UI 추출 Phase1-⑤: 모달 빌더(파일럿 = openModeModal).
//   모달은 #modal-body에 HTML을 짓고 addEventListener 클로저로 배선하는 UI 오케스트레이터.
//   t/BAL/DEFAULT_STATE/opts는 직접 import, $는 자체 정의. game.js 클로저(openModal/toast/
//   wallpaperUnlocked/openSlotModal/slotKey/LASTSLOT_KEY/DEMO_ED/SHELTERS)만 ctx 주입.
//   게이트: 모달 DOM 스냅샷(tests/grounding/modal-golden — mode)이 innerHTML 무손실을 검증.
import { t, LN as LName, LD as LDesc, LC } from '../i18n.js'; // LName/LDesc는 game.js 별칭(LN/LD) — 모듈은 직접 alias
import { BAL } from '../data/balance.js';
import { state, DEFAULT_STATE, opts } from '../core/state.js';
import { OUTFITS, THEME_SETS } from '../data/items.js';
import { KNOWLEDGE, KNOWLEDGE_BRANCHES } from '../data/knowledge.js';
import { hasKnowledge, knowledgePrereqMet, unlockKnowledge } from '../core/knowledge.js';
// ── Tier6b(일지/도감 모달) 데이터·코어 의존 — 전부 단방향 하위 모듈 ──
import { MEMOS, WILLS, MEMOS_BY_REGION, MEMOS_SUBWAY, MEMOS_RESORT, MEMOS_RESEARCH, MEMOS_HARBOR, MEMOS_CITYCORE, BROADCASTS, SKETCHES } from '../data/lore.js';
import { ACH_DEFS as ACHS } from '../data/achs.js';
import { DEFS } from '../data/furniture.js';
import { REGIONS } from '../data/world.js';
import { seasonOf } from '../core/season.js';
import { themeSetActive, activeThemeSets } from '../core/comfort.js';
const LColor = (o, i) => LC(o, 'colorNames', i); // game.js 74행과 동일 파생 — 원문 보존
const LN = LName; // recordTabHtml 원문의 LN 표기 보존

export function makeModals(ctx) {
  const { openModal, toast, wallpaperUnlocked, zenUnlocked, openSlotModal, slotKey, LASTSLOT_KEY, DEMO_ED, SHELTERS } = ctx;
  const { getPaused, playSfx, scheduleSave, avatarSys, renderResBar, updateHud } = ctx; // 추가 모달 의존
  // Tier6b 일지/도감 의존: 아이콘·집계·수첩 페이지는 game.js 클로저 — 주입(단방향 유지)
  const { icon, regionIcon, collectionCount,
    memosTotal, memosCollected, broadcastsTotal, broadcastsCollected, sketchesTotal, sketchesCollected,
    showMemoPage, showBroadcastModal, showSketchPage, showTruthPage } = ctx;
  const $ = id => document.getElementById(id);

  function openModeModal(n) {
    const card = (mode, titleId, tagId, descId, opt = {}) => {
      const lock = opt.locked;
      // ★ 템플릿 리터럴 선행 공백 = 출력 HTML에 그대로 들어감. 코드 들여쓰기와 무관하게 원본(4/6/8칸) 유지 (모달 게이트 무손실).
      // #158 잠금 문구는 카드별 키(mode.<id>.lock/{n}) — zen=겨울 1(모드 무관), wallpaper=코지 겨울 2.
      return `
    <div class="slot-card mode-card ${lock ? 'locked' : ''}" data-mode="${mode}" data-locked="${lock ? 1 : 0}">
      <div class="sl-body">
        <div class="mc-title">${lock ? '🔒 ' : ''}${t(titleId)}</div>
        <div class="mc-tag">${t(tagId)}</div>
        <div class="sl-meta">${lock ? t('mode.' + mode + '.lock', { n: opt.lockN }) : t(descId)}</div>
      </div>
    </div>`;
    };
    const wpLocked = !wallpaperUnlocked();
    const zenLocked = zenUnlocked ? !zenUnlocked() : false;
    // #74 데모: 노말만 — 모드 다양성은 정식판의 것 (Next Fest 「첫 번째 겨울」 게이트와 한 몸)
    const body = `<div class="mode-scroll">`
      + card('normal', 'mode.normal', 'mode.normal.tag', 'mode.normal.desc')
      + (DEMO_ED ? '' : card('hard', 'mode.hard', 'mode.hard.tag', 'mode.hard.desc')
        + card('hardcore', 'mode.hardcore', 'mode.hardcore.tag', 'mode.hardcore.desc')
        + card('zen', 'mode.zen', 'mode.zen.tag', 'mode.zen.desc', { locked: zenLocked, lockN: BAL.modes.zenWinters })
        + card('wallpaper', 'mode.wallpaper', 'mode.wallpaper.tag', 'mode.wallpaper.desc', { locked: wpLocked }))
      + `</div><button class="pixel-btn mode-back">${t('mode.back')}</button>`;
    openModal(t('mode.pick.title'), body);
    $('modal-body').querySelector('.mode-back').addEventListener('click', () => openSlotModal('new'));
    $('modal-body').querySelectorAll('.mode-card').forEach(c => c.addEventListener('click', () => {
      if (c.dataset.locked === '1') {
        const m0 = c.dataset.mode;
        toast(t('mode.' + m0 + '.lockToast', m0 === 'zen' ? { n: BAL.modes.zenWinters } : {}));
        return;
      }
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
  const rows = Object.keys(OUTFITS).map(id => {
    const o = OUTFITS[id];
    const owned = ownedList.includes(id) || id === 'default';
    const sel = id === cur;
    const sw = (c) => `<span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:#${(c ?? 0x5a5648).toString(16).padStart(6, '0')};margin-right:3px;vertical-align:-1px"></span>`;
    return `
      <div class="prep-row wd-row ${sel ? 'sel' : owned ? '' : 'no'}" style="cursor:default">
        <span>${o.emoji} ${LName(o)}</span>
        <span class="p-eff" style="font-size:10px">${sw(o.pal.coat)}${sw(o.pal.scarf ?? 0xb8862e)}${owned ? '' : t('wardrobe.locked')}</span>
        ${sel
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('wardrobe.wearing')}</span>`
          : owned
            ? `<button class="pixel-btn" data-wear="${id}" style="margin-left:6px">${t('wardrobe.wear')}</button>`
            : ''}
      </div>`;
  }).join('');
  openModal(t('wardrobe.title'), rows); // 인트로 힌트·타이틀 이모지 삭제(디렉터 심볼릭 원칙) — 획득 경로는 각 행에 이미 표기
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
  openModal(t('know.title'), `<div style="font-size:12px;color:var(--accent);margin-bottom:6px">${t('know.books', { n: books })}</div>${sections}`);
  $('modal-body').querySelectorAll('button[data-know]').forEach(b =>
    b.addEventListener('click', () => {
      if (unlockKnowledge(b.dataset.know)) { playSfx('craft'); renderResBar(); updateHud(); openKnowledgeModal(); }
      else toast(t('toast.needResource'));
    }));
  }

  /* ── Tier6b: 일지/도감/업적/기록 모달 (game.js 6181~6348 원문 그대로 — 로직 무변) ── */
function recordTabHtml() {
  const owned = state.memos || {};
  const bown = state.broadcasts || {};
  const regionKeys = { residential: 'record.regionRes', commercial: 'record.regionCom', industrial: 'record.regionInd', slum: 'record.regionSlum' };
  const memoRow = (id, tbl) => owned[id]
    ? `<div class="prep-row li-row" style="cursor:pointer" data-memo="${id}" data-will="${tbl === WILLS ? 1 : 0}"><span>${icon('icon_rec_memo', '📄')}</span><span>${LN(tbl[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
    : `<div class="prep-row li-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`;
  let sections = '';
  for (const rg of ['residential', 'commercial', 'industrial', 'slum']) {
    const ids = MEMOS_BY_REGION[rg];
    const gotN = ids.filter(id => owned[id]).length;
    sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t(regionKeys[rg])} (${gotN}/${ids.length})</div>` + ids.map(id => memoRow(id, MEMOS)).join('');
  }
  // #55: 벙커 하강 계단 특수 메모 — 발견 후에만 섹션 노출(스포일러 방지)
  {
    const bids = Object.keys(MEMOS).filter(id => MEMOS[id].region === 'bunker');
    const bgot = bids.filter(id => owned[id]).length;
    if (bgot > 0) sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionBunker')} (${bgot}/${bids.length})</div>` + bids.map(id => memoRow(id, MEMOS)).join('');
  }
  // 1.2: 지하(subway) 판데믹 대피 메모 — 발견 후에만 섹션 노출 (벙커 문법 재사용)
  {
    const sgot = MEMOS_SUBWAY.filter(id => owned[id]).length;
    if (sgot > 0) sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionSubway')} (${sgot}/${MEMOS_SUBWAY.length})</div>` + MEMOS_SUBWAY.map(id => memoRow(id, MEMOS)).join('');
  }
  // 1.3: 리조트(resort) 마지막 휴가객 메모 — 발견 후에만 섹션 노출 (지하 문법 재사용)
  {
    const rgot = MEMOS_RESORT.filter(id => owned[id]).length;
    if (rgot > 0) sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionResort')} (${rgot}/${MEMOS_RESORT.length})</div>` + MEMOS_RESORT.map(id => memoRow(id, MEMOS)).join('');
  }
  // 1.4: 금지 구역(research) 기밀 문서 — 발견 후에만 섹션 노출. 12종 다 모으면 최종장 페이지가 열린다.
  {
    const cgot = MEMOS_RESEARCH.filter(id => owned[id]).length;
    if (cgot > 0) {
      sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionResearch')} (${cgot}/${MEMOS_RESEARCH.length})</div>` + MEMOS_RESEARCH.map(id => memoRow(id, MEMOS)).join('');
      // 최종장: 12종 전부 수집 시 "그날의 진실" 페이지 열람 링크 (기록 문법, data-truth 훅).
      if (cgot >= MEMOS_RESEARCH.length) {
        sections += `<div class="prep-row li-row" style="cursor:pointer;border-top:1px solid var(--panel-border);margin-top:4px" data-truth="1"><span>📖</span><span style="color:var(--accent)">${t('record.truthTitle')}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`;
      }
    }
  }
  // 2.0 「응답」(citycore) 이관의 진실 — 발견 후에만 섹션 노출 (§9.5 검수: 미노출이면 수집해도 목록에
  //   없는 유령 카운트가 된다 — research 문법 재사용)
  {
    const ngot = MEMOS_CITYCORE.filter(id => owned[id]).length;
    if (ngot > 0) sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionCitycore')} (${ngot}/${MEMOS_CITYCORE.length})</div>` + MEMOS_CITYCORE.map(id => memoRow(id, MEMOS)).join('');
  }
  // v1.5: 좌초 여객선(harbor) 메모 — 발견 후에만 섹션 노출 (지하/리조트 문법 재사용)
  {
    const hgot = MEMOS_HARBOR.filter(id => owned[id]).length;
    if (hgot > 0) sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionHarbor')} (${hgot}/${MEMOS_HARBOR.length})</div>` + MEMOS_HARBOR.map(id => memoRow(id, MEMOS)).join('');
  }
  const willIds = Object.keys(WILLS);
  const willGot = willIds.filter(id => owned[id]).length;
  sections += `<div style="font-size:11px;color:var(--accent);margin:8px 0 3px">${t('record.regionWill')} (${willGot}/${willIds.length})</div>` + willIds.map(id => memoRow(id, WILLS)).join('');
  // 라디오 로그
  const radioRows = Object.keys(BROADCASTS).map(id => bown[id]
    ? `<div class="prep-row li-row" style="cursor:pointer" data-broadcast="${id}"><span>${icon('icon_rec_radio', '📻')}</span><span>${LN(BROADCASTS[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
    : `<div class="prep-row li-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`).join('');
  const distant = state.distantLight?.count
    ? `<div class="report-sec"><span class="r-title">${t('record.distantTitle', { n: state.distantLight.count })}</span></div>` : '';
  // 1.3 밤하늘 스케치 — 관측소 완공 후 수집이 시작되면 섹션 노출(스포일러 방지, 벙커/지하 문법). satellite는 1.4 복선.
  const sown = state.sketches || {};
  let sketchSec = '';
  if (state.observatoryDone || sketchesCollected() > 0) {
    const rows = Object.keys(SKETCHES).map(id => sown[id]
      ? `<div class="prep-row li-row" style="cursor:pointer" data-sketch="${id}"><span>${icon('icon_rec_sketch', '🌌')}</span><span>${LN(SKETCHES[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
      : `<div class="prep-row li-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`).join('');
    sketchSec = `<div class="report-sec"><span class="r-title">${t('record.sketchTitle', { n: sketchesCollected(), total: sketchesTotal() })}</span>${rows}</div>`;
  }
  const total = memosTotal();
  return `
    <div class="report-sec"><span class="r-title">${t('record.memoTitle', { n: memosCollected(), total })}</span>${sections}</div>
    <div class="report-sec"><span class="r-title">${t('record.radioTitle', { n: broadcastsCollected(), total: broadcastsTotal() })}</span>${radioRows}</div>
    ${sketchSec}
    ${distant}`;
}
function journalTabBar(active) {
  const tab = (id, label) => `<button class="pixel-btn ${active === id ? 'primary' : ''}" data-jtab="${id}" style="flex:1">${label}</button>`;
  // #194: EN/ja 라벨 4개의 min-content 합이 세로폰 모달 내폭을 넘어 Records 탭이 우측 클리핑 — 래핑 허용
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${tab('journal', t('journal.title'))}${tab('col', t('journal.colTab'))}${tab('ach', t('journal.achTab'))}${tab('record', t('record.tabTitle'))}</div>`;
}
function openJournalModal(tab = 'journal') {
  const se = seasonOf();
  const achsHtml = ACHS.map(a => {
    const got = state.achs?.[a.id];
    const veiled = a.hidden && !got; // 암호 업적: 미해금 시 존재만 — 이름·아이콘 은닉
    // 아이콘 없음(디렉터): 업적 아이콘은 스팀 도전과제 쪽 채널 — 인게임 목록은 텍스트만
    return `<div class="prep-row li-row" style="cursor:default;${got ? '' : 'opacity:0.4'}">
      <span>${veiled ? '???' : LName(a)}</span>
      <span class="p-cost">${LDesc(a)}${got ? ' ✓' : ''}</span>
    </div>`;
  }).join('');
  const colHtml = Object.entries(DEFS).map(([id, def]) => {
    const arr = state.collection?.[id] || [];
    const sw = def.colors.map((c, i) =>
      `<span title="${LColor(def, i)}" style="display:inline-block;width:12px;height:12px;border-radius:2px;margin-left:3px;background:${arr[i] ? '#' + c.toString(16).padStart(6, '0') : '#22252d'};border:1px solid ${arr[i] ? 'var(--accent)' : '#333'}"></span>`).join('');
    return `<span style="display:inline-flex;align-items:center;margin:2px 8px 2px 0;font-size:11px">${def.emoji}${sw}</span>`;
  }).join('');
  const colTotal = Object.values(DEFS).reduce((a, d) => a + d.colors.length, 0);
  // 테마 세트 도감 뱃지 (#13): 충족 시 강조.
  const themeBadges = THEME_SETS.map(ts => {
    const done = themeSetActive(ts);
    return `<span title="${ts.items.map(id => LName(DEFS[id])).join(' + ')}" style="display:inline-flex;align-items:center;margin:2px 8px 2px 0;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid ${done ? 'var(--good)' : '#333'};color:${done ? 'var(--good)' : 'var(--text-dim)'}">${done ? '🏅' : '▫️'} ${ts.emoji} ${LName(ts)}</span>`;
  }).join('');
  // #211: 쾌적 4축 분해는 PDA 상태 탭이 유일한 집이다(2클릭). 여기 있던 comfortBreakdownHtml()은 제거 —
  //   같은 것을 두 화면에 두는 게 "기기·화면이 서로를 베끼는" 그 문제고, 일지는 '지나온 기록'이지
  //   '지금 내 집 상태'가 아니다. 일지 = 통계(누계) + 도감 + 업적 + 기록.
  const journalBody = `
    <div class="report-sec"><span class="r-title">${t('journal.statsTitle')}</span><br>
      ${t('journal.statsLine', { day: state.day, sicon: se.icon, exp: state.stats.exp, succ: state.stats.success, craft: state.stats.craft || 0, stay: state.stayDays || 0 })}
    </div>`;
  // #177 도감 탭 — 위시리스트/보급원 트래커의 수집 뷰. 도면(시그니처+커먼) + 색상 도감 + 테마 세트.
  //   시그니처: 지역별 묶음, 미수집=「{지역}에서만」(pull 표기 — 정보판 map.drops와 동일 축).
  //   미방문 지역은 ??? 베일(#90 "조회 불가" 원칙 — showMapInfo와 같은 regionVisits 게이트).
  const bpOwned = state.blueprints || {};
  const sigIdsAll = Object.values(BAL.blueprint.regionItems).flat();
  const commonIds = BAL.blueprint.commonItems || [];
  const soloIds = ['ledbar']; // #189 P4: 초희귀 별도 채널 도면 — 도감 집계·행 포함
  const bpTotal = sigIdsAll.length + commonIds.length + soloIds.length;
  const bpGot = [...sigIdsAll, ...commonIds, ...soloIds].filter(id => bpOwned[id]).length;
  const bpRow = (id, got, hint) => {
    const d = DEFS[id];
    return `<div class="prep-row li-row" style="cursor:default;${got ? '' : 'opacity:0.6'}">
      <span>${LName(d)}</span>
      <span class="p-cost">${got ? '✓' : hint}</span></div>`;
  };
  const bpVeilRow = (hint = '') => `<div class="prep-row li-row" style="cursor:default;opacity:0.35">
      <span>???</span><span class="p-cost">${hint}</span></div>`;
  const sigBlocks = Object.entries(BAL.blueprint.regionItems).map(([rid, ids]) => {
    const visited = ((state.regionVisits || {})[rid] || 0) > 0;
    const head = `<div style="margin:8px 0 2px;font-size:11px;color:var(--text-dim)">${regionIcon(rid)} ${visited ? LName(REGIONS[rid]) : '???'}</div>`;
    const rows = ids.map(id => (visited || bpOwned[id])
      ? bpRow(id, bpOwned[id], t('col.bpOnly', { region: LName(REGIONS[rid]) }))
      : bpVeilRow()).join('');
    return head + rows;
  }).join('');
  const commonRows = commonIds.map(id => bpOwned[id] ? bpRow(id, true, '') : bpVeilRow(t('col.bpCommonSrc'))).join('');
  const soloRows = soloIds.map(id => bpOwned[id] ? bpRow(id, true, '') : bpVeilRow(t('col.bpLegendSrc'))).join('');
  // #195: 젤 필터북 — 도면은 아니지만 같은 전설 채널의 1회 한정 유품(#189 P3). 미보유 잠금 행으로 pull 가시화.
  const gelRow = state.lightGels
    ? `<div class="prep-row li-row" style="cursor:default"><span>${t('col.gelBook')}</span><span class="p-cost">✓</span></div>`
    : bpVeilRow(t('col.bpGelSrc'));
  const colBody = `
    <div class="report-sec"><span class="r-title">${t('col.bpTitle', { n: bpGot, total: bpTotal })}</span>
      ${sigBlocks}
      <div style="margin:8px 0 2px;font-size:11px;color:var(--text-dim)">${t('col.bpCommonTitle')}</div>
      ${commonRows}
      <div style="margin:8px 0 2px;font-size:11px;color:var(--text-dim)">${t('col.bpLegendTitle')}</div>
      ${soloRows}${gelRow}
      <div style="margin-top:6px;font-size:10px;color:var(--text-dim)">${t('col.veilHint')}</div>
    </div>
    <div class="report-sec"><span class="r-title">${t('journal.colTitle', { n: collectionCount(), total: colTotal })}</span><br>${colHtml}</div>
    <div class="report-sec"><span class="r-title">${t('deco.themeBadgeTitle', { n: activeThemeSets().length, total: THEME_SETS.length })}</span><br>${themeBadges}</div>`;
  // #8(피드백) 업적 전용 탭 — 총 개수·달성률 + 진행 바 + 전체 목록(달성/미달성/암호). 일지 하단에 묻혀 안 보이던 것 승격.
  const achDone = Object.values(state.achs || {}).filter(Boolean).length, achTotal = ACHS.length;
  const achPct = achTotal ? Math.round(achDone / achTotal * 100) : 0;
  const achBody = `
    <div class="report-sec"><span class="r-title">${t('journal.achTitle', { n: achDone, total: achTotal })} · ${achPct}%</span>
      <div style="height:8px;background:#22252d;border-radius:4px;margin-top:7px;overflow:hidden;border:1px solid #333"><div style="height:100%;width:${achPct}%;background:var(--accent);transition:width .3s"></div></div>
    </div>
    ${achsHtml}`;
  const jContent = tab === 'record' ? recordTabHtml() : tab === 'ach' ? achBody : tab === 'col' ? colBody : journalBody;
  openModal(t('journal.title'), journalTabBar(tab) + jContent);
  const body = $('modal-body');
  body.querySelectorAll('button[data-jtab]').forEach(b => b.addEventListener('click', () => openJournalModal(b.dataset.jtab)));
  body.querySelectorAll('[data-memo]').forEach(el => el.addEventListener('click', () => showMemoPage(el.dataset.memo, el.dataset.will === '1')));
  body.querySelectorAll('[data-broadcast]').forEach(el => el.addEventListener('click', () => showBroadcastModal(el.dataset.broadcast)));
  body.querySelectorAll('[data-sketch]').forEach(el => el.addEventListener('click', () => showSketchPage(el.dataset.sketch)));
  body.querySelectorAll('[data-truth]').forEach(el => el.addEventListener('click', () => showTruthPage()));
}

  return { openModeModal, openWardrobeModal, openKnowledgeModal, openJournalModal };
}
