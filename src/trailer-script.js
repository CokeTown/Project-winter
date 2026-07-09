/* ── 트레일러 에디션 시나리오 v3 (#75 — 디렉터 스크립트 2026-07-09): 스크립트로만 동작하는 관람용 데모 ──
   구성(디렉터 정본): 촛불 점화 → 꾸미기 스톱모션 → 탐험 전리품(희귀 골드/핑크 하이라이트+잭팟 유지)
   → 전 셸터 투어(1.4 기준 12셸터, 컷당 ~1초, 낮→밤, 서서히 줌아웃) → 해 뜨고 지고+날씨 3종 스윕
   → 고양이(미디엄 → 클릭 시의 그 확대 클로즈업 전환) → 눈 내리는 밤 홀드(자막 자리).
   자막·라이터 소리·OST는 전부 디렉터가 편집에서 얹는다 — 에디션은 그림과 SFX만.
   리듬: 비트 간 암전 0.25s(구 0.7s — "끊긴다" 지적 해소), 투어는 무암전 하드컷.
   부팅 URL ?trailer=1 또는 TRAILER_BUILD=1 빌드면 자동 재생(무한 루프, 입력 불요).
   전부 공개 핸들(window.__shelter / window.__trailer) 위 — 재생 시작 시 Storage 쓰기 전면 차단(세이브 무접점). */
const $S = () => window.__shelter;
const $T = () => window.__trailer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _fadeEl = null;
function fadeEl() {
  if (!_fadeEl) {
    _fadeEl = document.createElement('div');
    _fadeEl.style.cssText = 'position:fixed;inset:0;z-index:390;background:#000;opacity:1;transition:opacity .22s;pointer-events:none';
    document.body.appendChild(_fadeEl);
  }
  return _fadeEl;
}
async function fade(toBlack) { fadeEl().style.opacity = toBlack ? '1' : '0'; await sleep(250); }

function dress(list) {
  const S = $S(); const ids = Object.keys(S.DEFS);
  for (const [re, x, z, rot] of list) {
    const m = ids.filter((k) => re.test(k)); if (!m.length) continue;
    const it = { defId: m[0], colorIdx: 0, rot: rot || 0 };
    const p = S.clampToRoom(it, x, z);
    S.addItem(m[0], 0, p[0], p[1], rot || 0, true);
  }
}
const HOME_FULL = [[/stove|hearth/i, -2.2, -1.6, 0], [/^bed$/i, 2.2, 0.6, 1], [/rug/i, 0, -0.4, 0], [/bookshelf/i, -2.6, 0.8, 1], [/lamp$/i, 2.4, -2, 0], [/plant/i, 2.8, -0.6, 0], [/teatable/i, 0.9, -1.3, 0], [/cushion/i, -1, -0.2, 0], [/candle$/i, 0.95, -1.25, 0]];
function loadHome() { const S = $S(); S.state.current = 'rooftop'; S.loadShelter('rooftop'); }
function cam(z, y, p) { const S = $S(); if (S.setZoom) S.setZoom(z); if (S.setYaw) S.setYaw(y); if (S.setPitch) S.setPitch(p); }

/* 각 비트: run()은 검은 화면에서 무대를 깔고 fade(false)로 열며, 화면을 켜둔 채 끝난다(비트 간 짧은 암전은 play()가). */
const beats = [
  // ── B1 촛불 점화: 전 광원 소등 상태에서 촛불 하나만 켜지며 방이 드러난다 (라이터 소리는 디렉터 편집) ──
  { id: 'candle', label: 'B1 candle light', async run() {
    const S = $S(); loadHome();
    dress([[/candle$/i, 0.3, -0.6, 0]]); // 촛불 하나만 — 다른 광원 배치 자체를 안 한다
    for (const it of S.items) if (/candle/i.test(it.defId)) S.setItemPower(it, false);
    S.setWeather('clear'); S.setHour(23.8); cam(1.25, 0.6, 0.52);
    if (S.setPan) S.setPan(0.3, -0.6); // 촛불 중심 프레이밍
    await fade(false); await sleep(1600); // 어둠 홀드 (라이터 소리 자리)
    for (const it of S.items) if (/candle/i.test(it.defId)) S.setItemPower(it, true); // 점화 — 촛불빛만 방을 밝힌다
    await $T().cam([{ at: 0, zoom: 1.25 }, { at: 1, zoom: 1.12 }], 3400, 'out'); // 불이 붙자 살짝 물러나며 방이 보인다
    if (S.setPan) S.setPan(0, 0);
  } },
  // ── B2 꾸미기 스톱모션: 빈 방에 가구가 하나씩 놓인다 (자막: Decorate ur Own Shelter — 편집) ──
  { id: 'decorate', label: 'B2 decorate stop-motion', async run() {
    const S = $S(); loadHome(); S.setWeather('clear'); S.setHour(14); cam(0.95, 0.6, 0.5);
    await fade(false); await sleep(500);
    for (const piece of HOME_FULL) {
      dress([piece]);
      await sleep(620); // 스톱모션 템포
    }
    await sleep(900); // 완성된 방 홀드
  } },
  // ── B3 전리품: 정산 스태거 개봉 + 잭팟 팝업 유지 + 획득창 희귀 하이라이트(도료=금빛/도면=핑크 글로우) ──
  //    (자막: With What you loot — 편집)
  { id: 'loot', label: 'B3 loot + rare highlight', async run() {
    const S = $S(); S.setWeather('clear'); S.setHour(11.5); cam(1.0, 0.6, 0.5);
    await fade(false); await sleep(500);
    // 관람용 결정론: RNG 저정합 고정 — 성공 + 도료(10%) + 도면(6%)이 매 루프 함께 터진다
    const or = Math.random; Math.random = () => 0.05;
    S.state.paints = {}; S.state.blueprints = {};
    S.state.exp = { region: 'slum', end: Date.now() - 1000, dur: 1, rate: 5, prep: [], startGameMin: S.state.gameMin, durMin: 120 };
    window.__trailerScript._keepUI = true; // 정산 모달·잭팟 토스트가 주인공 — 재차폐 정지
    S.resolveExpedition();
    Math.random = or;
    const mb = document.getElementById('modal-back'); if (mb) mb.style.display = '';
    // 더블 잭팟 토스트 수직 스택 — 같은 자리에 겹쳐 뭉개지는 것 방지 (본 게임 토스트 큐잉은 별도 백로그)
    const toasts = document.querySelectorAll('.jackpot-toast');
    toasts.forEach((tEl, i) => { if (i > 0) tEl.style.transform = 'translateY(' + (i * 52) + 'px)'; });
    // 획득 아이템 창에 희귀 배지 행 주입 — 도료=빛나는 금색, 도면=핑크 (디렉터: "그거 빼지 말고")
    await sleep(400);
    const body = document.getElementById('modal-body');
    if (body) {
      const fam = Object.keys(S.state.paints)[0]; const bp = Object.keys(S.state.blueprints)[0];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;margin:8px 0;flex-wrap:wrap';
      const badge = (txt, glow, col) => `<span style="padding:5px 12px;border:1px solid ${col};border-radius:4px;color:${col};font-weight:bold;box-shadow:0 0 12px ${glow}, inset 0 0 8px ${glow};animation:pulse 1.2s infinite alternate">${txt}</span>`;
      let html = '';
      if (fam && S.PAINT_FAMILIES[fam]) html += badge('🪣 ' + (S.LName ? S.LName(S.PAINT_FAMILIES[fam]) : fam), 'rgba(255,205,90,.65)', '#ffd45e');
      if (bp && S.DEFS[bp]) html += badge('📐 ' + (S.LName ? S.LName(S.DEFS[bp]) : bp), 'rgba(255,120,190,.6)', '#ff8ac2');
      row.innerHTML = html;
      if (!document.getElementById('trailer-pulse-kf')) {
        const st = document.createElement('style'); st.id = 'trailer-pulse-kf';
        st.textContent = '@keyframes pulse { from { filter: brightness(1); } to { filter: brightness(1.45); } }';
        document.head.appendChild(st);
      }
      const anchor = body.querySelector('.prep-row, p, div');
      body.insertBefore(row, anchor ? anchor.nextSibling : body.firstChild);
    }
    await sleep(6800); // 스태거 개봉 + 잭팟 + 희귀 배지 감상
    if (mb) mb.style.display = 'none';
    window.__trailerScript._keepUI = false;
  } },
  // ── B4 전 셸터 투어: 1.4 기준 12셸터 전부, 꾸며진 채 컷당 ~1.1초, 낮→밤 진행 + 컷마다 살짝 줌아웃 ──
  //    무암전 하드컷 — 리듬을 위해 페이드 없음. (자막: where ever you want — 편집)
  { id: 'tour', label: 'B4 shelter tour day-to-night', async run() {
    const S = $S();
    const TOUR = ['container', 'bus', 'cabin', 'rooftop', 'greenhouse', 'subway', 'ship', 'tugboat', 'lighthouse', 'controltower', 'lodge', 'bunker'];
    let first = true;
    for (let i = 0; i < TOUR.length; i++) {
      S.state.current = TOUR[i]; S.loadShelter(TOUR[i]);
      dress(HOME_FULL);
      S.setWeather('clear');
      S.setHour(10 + (12.5 * i) / (TOUR.length - 1)); // 10시 → 22시 30분 — 낮에서 밤으로
      cam(1.3, 0.65, 0.5);
      if (first) { await fade(false); first = false; }
      $T().cam([{ at: 0, zoom: 1.3 }, { at: 1, zoom: 1.12 }], 1080, 'out'); // 서서히 줌아웃 (await 없이 컷 시간과 병행)
      await sleep(1120);
    }
  } },
  // ── B5 해가 뜨고 진다 + 날씨 3종: 맑음(아침) → 비(정오) → 눈(저물녘) 연속 스윕 ──
  //    (자막: To survive, To live, To Rest — 편집)
  { id: 'sky', label: 'B5 sun sweep + weather trio', async run() {
    const S = $S(); loadHome(); dress(HOME_FULL); cam(0.55, 0.95, 0.44); // 와이드 — 하늘과 집이 함께
    S.setWeather('clear'); S.setHour(5.5);
    await fade(false);
    const T0 = performance.now(); const DUR = 9000; let w = 0;
    await new Promise((resolve) => {
      (function step() {
        const t = Math.min(1, (performance.now() - T0) / DUR);
        S.setHour(5.5 + t * 15.5); // 05:30 → 21:00 — 해가 뜨고 진다
        if (t > 0.36 && w === 0) { w = 1; S.setWeather('rain'); }
        if (t > 0.7 && w === 1) { w = 2; S.setWeather('snow'); }
        if (t >= 1) return resolve();
        requestAnimationFrame(step);
      })();
    });
    await sleep(600);
  } },
  // ── B6 고양이: 미디엄 샷 → "클릭하면 나오는" 그 확대 클로즈업으로 전환 (자막: With your Lovely Friend — 편집) ──
  { id: 'cat', label: 'B6 cat -> closeup', async run() {
    const S = $S(); loadHome();
    dress([[/rug/i, 0, -0.4, 0], [/cushion/i, -0.6, -0.2, 0], [/candle$/i, 0.9, -1.3, 0]]); // 미니멀 — 클로즈업 클리핑 방지
    S.setWeather('clear'); S.setHour(16); cam(1.1, 0.6, 0.5);
    S.state.cat = 1; if (S.spawnCat) S.spawnCat();
    await fade(false); await sleep(1400); // 고양이가 자리 잡는다
    const c = S.cat && S.cat();
    if (c && c.g && S.setPan) { S.setPan(c.g.position.x, c.g.position.z); cam(1.6, 0.6, 0.52); } // 미디엄
    await sleep(2200);
    if (S.enterCatCloseup) S.enterCatCloseup(); // 인게임 "클릭했을 때"의 그 확대 전환
    await sleep(3400);
    if (S.exitCatCloseup) S.exitCatCloseup();
    if (S.setPan) S.setPan(0, 0);
  } },
  // ── B7 엔딩 홀드: 눈 내리는 밤, 완성된 집 — 자막 "Until 9 winters pass." 자리 (편집) ──
  { id: 'ending', label: 'B7 ending hold', async run() {
    const S = $S(); S.state.day = 300; loadHome(); dress(HOME_FULL); S.setWeather('snow'); S.setHour(21); cam(0.62, 0.9, 0.46);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.62, yaw: 0.9 }, { at: 1, zoom: 0.78, yaw: 0.7 }], 5200, 'inout'); // 아주 느린 접근
    await sleep(1600); // 자막 자리 홀드
  } },
];

let _hideTick = null;
async function prep() {
  const S = $S();
  Storage.prototype.setItem = function () {}; // 관람 전용: 어떤 경로로도 세이브를 쓰지 않는다
  if (S.opts) S.opts.bgm = false; if (S.syncBgm) S.syncBgm(); // 오디오: BGM 뮤트(OST·라이터 소리는 편집에서), SFX만
  if (S.hideTitle) S.hideTitle();
  if (S.setPaused) S.setPaused(true);
  $T().hideUI(true);
  if (!_hideTick) _hideTick = setInterval(() => { if (!window.__trailerScript._keepUI) $T().hideUI(true); }, 1200); // 늦은 팁·토스트 상시 검거 (전리품 비트 예외)
  fadeEl(); // 암전 상태로 시작
}
async function playBeat(i) { await prep(); await beats[i].run(); }
async function play(opts = {}) {
  await prep();
  do {
    for (let i = 0; i < beats.length; i++) { await fade(true); await beats[i].run(); }
    await fade(true);
  } while (opts.loop);
}
window.__trailerScript = { beats, play, playBeat };
// 트레일러 에디션 게이트: ?trailer=1 부팅 또는 영상 에디션 빌드(TRAILER_BUILD=1)면 자동 재생(루프) — 일반 부팅은 완전 무접점
const TRAILER_ED = typeof __TRAILER_EDITION__ !== 'undefined' && !!__TRAILER_EDITION__;
if (TRAILER_ED || /[?&]trailer=1/.test(location.search)) {
  window.addEventListener('load', () => { setTimeout(() => { window.__trailerScript.play({ loop: true }); }, 1800); });
}
