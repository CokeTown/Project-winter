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
  { id: 'raincatch', label: 'B2a rain catch', async run() { // 생활: 빗물받이 — 비 오는 처마 근접 (앵커 실좌표 2.88,-2.48 — docs/TRAILER-SCRIPT.md)
    const S = $S(); S.state.mods.rooftop = ['raincatch']; home(); S.setWeather('rain'); S.setHour(13);
    cam(1.7, 0.9, 0.55); if (S.setPan) S.setPan(2.9, -2.5); // 뒷모서리 처마의 물통
    await fade(false);
    await $T().cam([{ at: 0, zoom: 1.7 }, { at: 1, zoom: 1.82 }], 3400, 'inout');
    if (S.setPan) S.setPan(0, 0); S.state.mods.rooftop = [];
  } },
  { id: 'garden', label: 'B2b garden', async run() { // 생활: 결실 텃밭 근접 (마당 — slab frontX/Z 기준 실좌표)
    const S = $S(); S.state.mods.rooftop = ['rooftopGarden']; S.state.rooftopGardenStage = 2; home(); S.setWeather('clear'); S.setHour(15);
    const sl = (S.SHELTERS.rooftop && S.SHELTERS.rooftop._slab) || { frontX: 3, frontZ: 3 };
    cam(1.6, 0.55, 0.52); if (S.setPan) S.setPan(sl.frontX - 3.2, sl.frontZ - 3.0);
    await fade(false);
    await $T().cam([{ at: 0, yaw: 0.55 }, { at: 1, yaw: 0.68 }], 3400, 'inout');
    if (S.setPan) S.setPan(0, 0); S.state.mods.rooftop = [];
  } },
  { id: 'cat', label: 'B2c cat closeup', async run() { // 생활: 고양이 클로즈업 — 미니멀 드레싱(침대 배제 = 지오 클리핑 방지)
    const S = $S(); S.state.current = 'rooftop'; S.loadShelter('rooftop');
    dress([[/stove|hearth/i, -2.2, -1.6, 0], [/rug/i, 0, -0.4, 0], [/cushion/i, -0.6, -0.2, 0], [/lamp$/i, 2.4, -2, 0]]);
    S.setWeather('clear'); S.setHour(16); cam(1.1, 0.6, 0.5);
    S.state.cat = 1; if (S.spawnCat) S.spawnCat();
    await fade(false); await sleep(1400); // 고양이가 자리 잡을 시간
    // 전용 클로즈업 카메라 대신 실좌표 추적 미디엄 샷 — 가구 지오 클리핑 원천 차단(스크립트 정본 결정)
    const c = S.cat && S.cat();
    if (c && c.g && S.setPan) { S.setPan(c.g.position.x, c.g.position.z); cam(1.75, 0.6, 0.52); }
    await sleep(3200);
    if (S.setPan) S.setPan(0, 0);
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
  { id: 'map', label: 'B3a paper map', async run() { // 종이 지도 — 지도 UI 자체가 컷
    const S = $S(); S.setWeather('clear'); S.setHour(9);
    await fade(false); await sleep(400);
    window.__trailerScript._keepUI = true;
    if (S.openMapModal) S.openMapModal();
    const mb = document.getElementById('modal-back'); if (mb) mb.style.display = '';
    await sleep(3400);
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
  { id: 'homecoming', label: 'B6 homecoming + logo', async run() {
    const S = $S(); S.state.day = 300; home(); S.setWeather('snow'); S.setHour(20.5); cam(0.55, 0.95, 0.46);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.55, yaw: 0.95 }, { at: 1, zoom: 1.12, yaw: 0.58 }], 5800, 'inout');
    // 로고 + 카피 페이드인 (에디션 자체 오버레이 — 게임 UI 아님. CTA는 편집 몫)
    window.__trailerScript._keepUI = true;
    const lg = document.createElement('div');
    lg.style.cssText = 'position:fixed;inset:0;z-index:394;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 1.2s;text-shadow:0 2px 14px #000';
    const copy = (S.t && S.t('trailer.copy')) || '';
    lg.innerHTML = '<div style="font-size:64px;color:#ffe9c8;letter-spacing:6px">Nine Winters</div>'
      + '<div style="margin-top:14px;font-size:20px;color:#d8c8b0">' + copy + '</div>';
    document.body.appendChild(lg);
    requestAnimationFrame(() => { lg.style.opacity = '1'; });
    await sleep(2800);
    lg.remove();
    window.__trailerScript._keepUI = false;
  } },
];

let _hideTick = null;
async function prep() {
  const S = $S();
  Storage.prototype.setItem = function () {}; // 관람 전용: 어떤 경로로도 세이브를 쓰지 않는다
  if (S.opts) S.opts.bgm = false; if (S.syncBgm) S.syncBgm(); // 오디오 정책: BGM 뮤트(OST는 편집에서), SFX만
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
