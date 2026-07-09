/* ── 트레일러 에디션 시나리오 (#75): 승인 스토리보드 7비트 — 스크립트로만 동작하는 관람용 데모 ──
   부팅 URL에 ?trailer=1 이 있으면 자동 재생(무한 루프, 입력 불요). 클립 제작은 하네스가 playBeat(i)를 개별 호출.
   전부 공개 핸들(window.__shelter / window.__trailer) 위에서 동작 — 시뮬 진행·저장 무접점:
   재생 시작 시 Storage 쓰기를 통째로 차단해 실플레이 세이브를 절대 건드리지 않는다(관람 전용). */
const $S = () => window.__shelter;
const $T = () => window.__trailer;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let _fadeEl = null;
function fadeEl() {
  if (!_fadeEl) {
    _fadeEl = document.createElement('div');
    _fadeEl.style.cssText = 'position:fixed;inset:0;z-index:390;background:#000;opacity:1;transition:opacity .65s;pointer-events:none';
    document.body.appendChild(_fadeEl);
  }
  return _fadeEl;
}
async function fade(toBlack) { fadeEl().style.opacity = toBlack ? '1' : '0'; await sleep(700); }

function dress(list) {
  const S = $S(); const ids = Object.keys(S.DEFS);
  for (const [re, x, z, rot] of list) {
    const m = ids.filter((k) => re.test(k)); if (!m.length) continue;
    const it = { defId: m[0], colorIdx: 0, rot: rot || 0 };
    const p = S.clampToRoom(it, x, z);
    S.addItem(m[0], 0, p[0], p[1], rot || 0, true);
  }
}
const HOME_FULL = [[/stove|hearth/i, -2.2, -1.6, 0], [/lamp$/i, 2.4, -2, 0], [/^bed$/i, 2.2, 0.6, 1], [/rug/i, 0, -0.4, 0], [/cushion/i, -1, -0.2, 0], [/bookshelf/i, -2.6, 0.8, 1], [/plant/i, 2.8, -0.6, 0], [/candle$/i, 0.8, -1.4, 0]];
function home(extra) { const S = $S(); S.state.current = 'rooftop'; S.loadShelter('rooftop'); dress(extra || HOME_FULL); }
function cam(z, y, p) { const S = $S(); if (S.setZoom) S.setZoom(z); if (S.setYaw) S.setYaw(y); if (S.setPitch) S.setPitch(p); }
function stovePower(on) { const S = $S(); for (const it of S.items) if (/stove|hearth/i.test(it.defId)) S.setItemPower(it, on); }

/* 각 비트: run()은 검은 화면에서 무대를 깔고 fade(false)로 열며, 화면을 켜둔 채 끝난다(비트 간 암전은 play()가). */
const beats = [
  { id: 'ignite', label: 'B1 ignite', async run() { // 성냥 훅: 불이 켜지며 집이 어둠에서 드러난다
    const S = $S(); home(); S.setWeather('snow'); S.setHour(23.5); stovePower(false); cam(1.18, 0.6, 0.52);
    await fade(false); await sleep(1700);
    stovePower(true);
    await $T().cam([{ at: 0, zoom: 1.18 }, { at: 1, zoom: 1.3 }], 3600, 'out');
  } },
  { id: 'morning', label: 'B2a morning', async run() {
    const S = $S(); S.setWeather('clear'); S.setHour(8.5); cam(1.05, 0.5, 0.5);
    await fade(false);
    await $T().cam([{ at: 0, yaw: 0.5 }, { at: 1, yaw: 0.72 }], 3200, 'inout');
  } },
  { id: 'noon', label: 'B2b noon', async run() {
    const S = $S(); S.setWeather('clear'); S.setHour(13.5); cam(0.72, 0.85, 0.48);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.72 }, { at: 1, zoom: 0.82, yaw: 0.7 }], 3200, 'inout');
  } },
  { id: 'duskrain', label: 'B2c dusk rain', async run() {
    const S = $S(); S.setWeather('rain'); S.setHour(19.5); cam(0.9, 0.95, 0.48);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.9 }, { at: 1, zoom: 1.05 }], 3200, 'inout');
  } },
  { id: 'loot', label: 'B2d loot reveal', async run() { // 상자 개봉: 정산 스태거 개봉(DDD-1) + 도료·도면 잭팟이 함께 터지는 쇼케이스
    const S = $S(); S.setWeather('clear'); S.setHour(11.5); cam(1.0, 0.6, 0.5);
    await fade(false); await sleep(700);
    // 관람용 결정론: RNG를 낮게 고정해 성공 + 도료(10%) + 도면(6%)이 전부 터지는 정산을 재현
    const or = Math.random; Math.random = () => 0.05;
    S.state.paints = {}; S.state.blueprints = {};
    S.state.exp = { region: 'slum', end: Date.now() - 1000, dur: 1, rate: 5, prep: [], startGameMin: S.state.gameMin, durMin: 120 }; // 슬럼 = 도면 보유 지역 — 도료+도면 더블 잭팟
    window.__trailerScript._keepUI = true; // 이 비트 동안 재차폐 정지 — 정산 모달·잭팟 프레임이 주인공
    S.resolveExpedition();
    Math.random = or;
    const mb = document.getElementById('modal-back'); if (mb) mb.style.display = '';
    await sleep(7200); // 행 스태거 공개 + 잭팟 토스트 감상
    if (mb) mb.style.display = 'none';
    window.__trailerScript._keepUI = false;
  } },
  { id: 'outside', label: 'B3 outside', async run() {
    const S = $S(); S.setWeather('snow'); S.setHour(6.5); cam(0.48, 1.15, 0.42);
    await fade(false);
    await $T().cam([{ at: 0, yaw: 1.15 }, { at: 1, yaw: 0.72 }], 5600, 'inout'); // 느린 궤도 팬
  } },
  { id: 'seasons', label: 'B4 seasons', async run() { // 하드컷 타임랩스 + 가구가 늘어난다
    const S = $S();
    const steps = [
      [5, [[/stove|hearth/i, -2.2, -1.6, 0], [/^bed$/i, 2.2, 0.6, 1]]],
      [100, [[/stove|hearth/i, -2.2, -1.6, 0], [/^bed$/i, 2.2, 0.6, 1], [/rug/i, 0, -0.4, 0], [/bookshelf/i, -2.6, 0.8, 1]]],
      [200, [[/stove|hearth/i, -2.2, -1.6, 0], [/^bed$/i, 2.2, 0.6, 1], [/rug/i, 0, -0.4, 0], [/bookshelf/i, -2.6, 0.8, 1], [/lamp$/i, 2.4, -2, 0], [/plant/i, 2.8, -0.6, 0]]],
      [300, HOME_FULL],
    ];
    let first = true;
    for (const [day, set] of steps) {
      S.state.day = day; S.state.current = 'rooftop'; S.loadShelter('rooftop'); dress(set);
      S.setWeather('clear'); S.setHour(14.5); cam(0.8, 0.7, 0.5);
      if (first) { await fade(false); first = false; }
      await sleep(2150);
    }
  } },
  { id: 'vignette', label: 'B5 vignette', async run() { // 무보상 러너(기록·저장 없음)
    const S = $S(); S.state.current = 'penthouse'; S.loadShelter('penthouse'); S.setWeather('clear'); S.setHour(18); cam(0.62, 0.65, 0.5);
    await fade(false); await sleep(500);
    S.playVignetteRaw(false); // 해넘이
    await sleep(13600); // 12초 + 여운/페이드
  } },
  { id: 'homecoming', label: 'B6 homecoming', async run() {
    const S = $S(); S.state.day = 300; home(); S.setWeather('snow'); S.setHour(20.5); cam(0.55, 0.95, 0.46);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.55, yaw: 0.95 }, { at: 1, zoom: 1.12, yaw: 0.58 }], 5800, 'inout');
    await sleep(900); // 마지막 프레임을 머금는다 (로고/카피는 편집 단계에서 이 위에 얹는다)
  } },
];

let _hideTick = null;
async function prep() {
  const S = $S();
  Storage.prototype.setItem = function () {}; // 관람 전용: 어떤 경로로도 세이브를 쓰지 않는다
  if (S.hideTitle) S.hideTitle();
  if (S.setPaused) S.setPaused(true);
  $T().hideUI(true);
  if (!_hideTick) _hideTick = setInterval(() => { if (!window.__trailerScript._keepUI) $T().hideUI(true); }, 1200); // 늦게 스폰되는 팁·토스트 상시 검거 (개봉 비트는 예외)
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
