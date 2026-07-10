/* ── 트레일러 에디션 시나리오 v4 (#75 — 디렉터 2026-07-10 "첫 5~10초에 버티컬 슬라이스와 훅 전부"): ──
   구성: **B0 10초 슬라이스(코지+고양이+생존 — 옥탑 눈밤 푸시인 → 정산 더블 잭팟 → 침대 T1→T3 모핑)**
   → 촛불 점화 → 꾸미기 스톱모션 → 탐험 전리품(희귀 골드/핑크 하이라이트+잭팟 유지)
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

function dressOne(piece) {
  const S = $S(); const ids = Object.keys(S.DEFS);
  const [re, x, z, rot] = piece;
  const m = ids.filter((k) => re.test(k)); if (!m.length) return null;
  const it = { defId: m[0], colorIdx: 0, rot: rot || 0 };
  const p = S.clampToRoom(it, x, z);
  return S.addItem(m[0], 0, p[0], p[1], rot || 0, true);
}
function dress(list) { for (const piece of list) dressOne(piece); }
// 배치 순간 스케일 바운스(0→1.12→1.0) — 스톱모션으로 "탁" 얹는 손맛. 비균등 스케일 보존.
function popIn(group) {
  if (!group) return;
  const bx = group.scale.x, by = group.scale.y, bz = group.scale.z;
  const t0 = performance.now(); const DUR = 300;
  (function step() {
    const t = Math.min(1, (performance.now() - t0) / DUR);
    const s = t < 0.6 ? (t / 0.6) * 1.12 : 1.12 - ((t - 0.6) / 0.4) * 0.12;
    group.scale.set(bx * s, by * s, bz * s);
    if (t < 1) requestAnimationFrame(step); else group.scale.set(bx, by, bz);
  })();
}
const HOME_FULL = [[/stove|hearth/i, -2.2, -1.6, 0], [/^bed$/i, 2.2, 0.6, 1], [/rug/i, 0, -0.4, 0], [/bookshelf/i, -2.6, 0.8, 1], [/lamp$/i, 2.4, -2, 0], [/plant/i, 2.8, -0.6, 0], [/teatable/i, 0.9, -1.3, 0], [/cushion/i, -1, -0.2, 0], [/candle$/i, 0.95, -1.25, 0]];
function loadHome() { const S = $S(); S.state.current = 'rooftop'; S.loadShelter('rooftop'); }
function cam(z, y, p) { const S = $S(); if (S.setZoom) S.setZoom(z); if (S.setYaw) S.setYaw(y); if (S.setPitch) S.setPitch(p); }

/* 각 비트: run()은 검은 화면에서 무대를 깔고 fade(false)로 열며, 화면을 켜둔 채 끝난다(비트 간 짧은 암전은 play()가). */
const beats = [
  // ── B0 10초 슬라이스 (디렉터 2026-07-10): 첫 5~10초에 버티컬 슬라이스+훅 전부 — 코지·고양이·생존 ──
  //    옥탑 한 씬에서 로딩 없이 3악장: ①코지 홀드(풀데코+고양이+눈밤 푸시인 4s) ②생존 컷(정산 개봉+더블 잭팟 2.6s)
  //    ③성장 스냅(침대 T1→T2→T3 모핑 3s) — 마지막 프레임이 다시 코지로 닫힌다. 자막·OST는 디렉터 편집.
  { id: 'slice', label: 'B0 10s vertical slice', async run() {
    const S = $S(); loadHome();
    dress(HOME_FULL);
    // 침대를 T1(바닥 매트리스)로 강등 — ③에서 T1→T3 성장을 보여주기 위해
    const bed = S.items.find((i) => /^bed$/i.test(i.defId));
    if (bed && S.recolorItem) { bed.tier = 1; S.recolorItem(bed, bed.colorIdx); }
    S.state.catCoat = 'tabby'; // 관람용 결정론: 치즈 태비 — 밤 러그 위에서도 또렷한 밝은 코트 (검은 고양이 실종 방지)
    S.state.cat = 1; if (S.spawnCat) await S.spawnCat();
    const c = S.cat && S.cat();
    if (c && c.g) { c.g.position.set(-0.55, c.g.position.y, -0.55); c.g.rotation.y = 0.9; } // 러그 위 난로 불빛권
    if (S.setCatMode) S.setCatMode('sit');
    if (c) { c.mode = 'sit'; c.timer = 999; c.tgt = null; } // 10초 동안 앉은 채 깜빡임만 (#155)
    // 옥탑 전면(+x,+z) 코너 기둥 숨김 — 컬링 미편입 골조가 오프닝 정중앙에 검은 막대로 선다(본수정은 칩 task_ad77c624)
    if (c && c.g) {
      let root = c.g; while (root.parent) root = root.parent;
      root.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.parameters
          && Math.abs(o.geometry.parameters.width - 0.18) < 0.001 && Math.abs(o.geometry.parameters.depth - 0.18) < 0.001
          && o.geometry.parameters.height > 2 && o.position.z > 1) o.visible = false; // 전면(z+) 라인 기둥 2개 다
      });
    }
    S.setWeather('snow'); S.setHour(20.7); cam(0.62, 1.0, 0.46);
    await fade(false);
    // ① 코지 홀드 — 눈 내리는 밤, 따뜻한 방과 고양이로 푸시인
    window.__b0 = 'cozy';
    await $T().cam([{ at: 0, zoom: 0.62 }, { at: 1, zoom: 0.92 }], 4000, 'out');
    window.__b0 = 'loot';
    // ② 생존 컷 — 정산 개봉 + 더블 잭팟 (B3와 같은 결정론 RNG — 모달 자체가 훅)
    const or = Math.random; Math.random = () => 0.05;
    S.state.paints = {}; S.state.blueprints = {};
    S.state.exp = { region: 'slum', end: Date.now() - 1000, dur: 1, rate: 5, prep: [], startGameMin: S.state.gameMin, durMin: 120 };
    window.__trailerScript._keepUI = true;
    S.resolveExpedition();
    Math.random = or;
    const mb = document.getElementById('modal-back'); if (mb) mb.style.display = '';
    // 잭팟 토스트 스택은 이제 본 게임이 자체 처리(top 오프셋) — 스크립트 보정 불요
    await sleep(2600);
    if (mb) mb.style.display = 'none';
    document.querySelectorAll('.jackpot-toast').forEach((tEl) => tEl.remove());
    window.__trailerScript._keepUI = false;
    // ③ 성장 스냅 — 침대로 살짝 다가가며 T1→T2→T3. "폐허를 주워, 집을 깎는다"
    $T().cam([{ at: 0, zoom: 0.92 }, { at: 1, zoom: 1.08 }], 2900, 'out');
    for (const tier of [2, 3]) {
      await sleep(950);
      window.__b0 = 'morph' + tier;
      if (bed && S.recolorItem) { bed.tier = tier; S.recolorItem(bed, bed.colorIdx); popIn(bed.group); }
    }
    await sleep(300); window.__b0 = 'hold';
    await sleep(800); // T3 침대 + 고양이 + 눈밤 홀드 — 코지로 귀결
    S.state.cat = 0; if (S.despawnCat) S.despawnCat(); // 다음 비트(B1 촛불 어둠)에 고양이 잔류 방지
  } },
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
      const it = dressOne(piece);
      if (it && it.group) popIn(it.group); // 놓이는 순간 스케일 바운스
      await sleep(620); // 스톱모션 템포
    }
    // B6 복선: 완성된 방에 고양이가 들어와 앉는다 — spawnCat은 async라 await로 확정 후 개방부에 고정(확실히 보이게)
    S.state.cat = 1; if (S.spawnCat) await S.spawnCat();
    const bc = S.cat && S.cat();
    if (bc && bc.g) { bc.g.position.set(-0.9, bc.g.position.y, -0.15); bc.g.rotation.y = 0.6; } // 방석 위에 앉는다 ("방석에 앉는 고양이" — B6 복선)
    if (S.setCatMode) S.setCatMode('sit');
    await sleep(1600); // 완성된 방 + 고양이 홀드
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
    S.state.cat = 0; if (S.despawnCat) S.despawnCat(); // 투어는 가구만 — B2 복선 캣이 12셸터에 재소환되지 않도록 정리
    const TOUR = ['container', 'bus', 'cabin', 'rooftop', 'greenhouse', 'subway', 'ship', 'tugboat', 'lighthouse', 'controltower', 'lodge', 'bunker'];
    let first = true;
    for (let i = 0; i < TOUR.length; i++) {
      S.state.current = TOUR[i]; S.loadShelter(TOUR[i]);
      dress(HOME_FULL);
      S.setWeather('clear');
      S.setHour(10 + (12.5 * i) / (TOUR.length - 1)); // 10시 → 22시 30분 — 낮에서 밤으로
      cam(1.3, 0.65, 0.5);
      if (first) { await fade(false); first = false; }
      const last = i === TOUR.length - 1; // 마지막 셸터(벙커)는 더 오래 머문다 — 리듬이 "쌓이다 멎는" 마무리
      $T().cam([{ at: 0, zoom: 1.3 }, { at: 1, zoom: last ? 1.05 : 1.12 }], last ? 1800 : 1080, 'out'); // 서서히 줌아웃 (await 없이 컷 시간과 병행)
      await sleep(last ? 1800 : 1120);
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
        // 날씨를 시간대 감정에 포갠다: 비=해질녘(≈16시, To live), 눈=밤 진입(≈19시, To Rest)
        if (t > 0.677 && w === 0) { w = 1; S.setWeather('rain'); }
        if (t > 0.871 && w === 1) { w = 2; S.setWeather('snow'); }
        if (t >= 1) return resolve();
        requestAnimationFrame(step);
      })();
    });
    await sleep(1800); // 눈 내리는 밤에 머문다 — 눈이 충분히 쌓이고 자막 "To Rest" 자리
  } },
  // ── B6 고양이: 미디엄 샷 → "클릭하면 나오는" 그 확대 클로즈업으로 전환 (자막: With your Lovely Friend — 편집) ──
  { id: 'cat', label: 'B6 cat -> closeup', async run() {
    const S = $S(); loadHome();
    dress([[/rug/i, 0, -0.4, 0], [/cushion/i, -0.6, -0.2, 0], [/candle$/i, 0.9, -1.3, 0]]); // 미니멀 — 클로즈업 클리핑 방지
    S.setWeather('clear'); S.setHour(16); cam(1.1, 0.6, 0.5);
    S.state.cat = 1; if (S.spawnCat) S.spawnCat();
    await fade(false); await sleep(1400); // 고양이가 자리 잡는다
    // 고양이를 방 개방부(벽·기둥에서 떨어진 곳)로 데려와 앉힌다 — 근접 궤도 클로즈업 카메라가 벽을 파고드는
    //   클리핑을 막는다(실측: 기본 스폰이 벽 근처면 catCam이 지오메트리로 파묻힘). rot 0 = 얼굴이 보이는 각도.
    const c = S.cat && S.cat();
    if (c && c.g) { c.g.position.set(0.3, c.g.position.y, 0.6); c.g.rotation.y = 0; }
    if (S.setCatMode) S.setCatMode('sit'); // 앉힘 고정(timer=999) — 미디엄~클로즈업 동안 돌아다니지 않게
    if (S.setPan) { S.setPan(0.3, 0.6); cam(1.6, 0.6, 0.52); } // 미디엄 — 고정 위치를 향해
    await sleep(1800);
    try { if (S.playSfx) S.playSfx('meow2', { jitter: 0.04, vol: 0.8 }); } catch (e) {} // "클릭하고 싶어지는" 순간을 소리로 — 관람용 결정론(고정 클립)
    await sleep(520); // 야옹이 먼저 들리고 나서
    if (c && c.g) { c.g.position.set(0.3, c.g.position.y, 0.6); c.g.rotation.y = 0; } // 진입 직전 위치·각도 재고정
    if (S.enterCatCloseup) S.enterCatCloseup(); // 인게임 "클릭했을 때"의 그 확대 전환 — 이제 클리핑 없이 고양이 얼굴이 꽉 찬다
    await sleep(3400);
    if (S.exitCatCloseup) S.exitCatCloseup();
    if (S.setPan) S.setPan(0, 0);
  } },
  // ── B7 엔딩 홀드: 눈 내리는 밤, 완성된 집 — 자막 "Until 9 winters pass." 자리 (편집) ──
  { id: 'ending', label: 'B7 ending hold + candle callback', async run() {
    const S = $S(); S.state.cat = 0; if (S.despawnCat) S.despawnCat(); // 엔딩은 촛불에 집중 — 고양이 정리 (loadHome 전에 꺼야 재소환 안 됨)
    S.state.day = 300; loadHome(); dress(HOME_FULL); S.setWeather('snow'); S.setHour(21); cam(0.62, 0.9, 0.46);
    await fade(false);
    await $T().cam([{ at: 0, zoom: 0.62, yaw: 0.9 }, { at: 1, zoom: 0.78, yaw: 0.7 }], 4200, 'inout'); // 아주 느린 접근
    await sleep(700); // 완성된 집 홀드
    // ── B1 수미상관: 방 안 다른 광원을 끄고, 켜진 촛불 하나만 남긴다 (오프닝 촛불로의 회귀) ──
    for (const it of S.items) if (/lamp$|stove|hearth/i.test(it.defId)) S.setItemPower(it, false);
    S.setHour(23.6); // 방이 더 깊은 밤으로 잠긴다
    const cd = S.items.find((it) => /candle$/i.test(it.defId));
    if (cd && S.setPan) S.setPan(cd.x, cd.z);
    await $T().cam([{ at: 0, zoom: 0.78, yaw: 0.7 }, { at: 1, zoom: 2.7, yaw: 0.52 }], 3200, 'inout'); // 촛불로 깊게 다가간다 — 화면 중앙에 촛불
    await sleep(1600); // 촛불만 남은 홀드 — 자막 "Until 9 winters pass." 옆에 그 촛불
  } },
];

let _hideTick = null;
async function prep() {
  const S = $S();
  Storage.prototype.setItem = function () {}; // 관람 전용: 어떤 경로로도 세이브를 쓰지 않는다
  if (S.opts) S.opts.bgm = false; if (S.syncBgm) S.syncBgm(); // 오디오: BGM 뮤트(OST·라이터 소리는 편집에서), SFX만
  if (S.hideTitle) S.hideTitle();
  if (S.setPaused) S.setPaused(true);
  // 종이 Tip 원천 차단: tipOnce는 tipsSeen[id]가 참이면 렌더를 건너뛴다 → "항상 참" 프록시로 교체(관람 중 팁 팝업 금지).
  //   날씨 전환(비 등)이 트리거하던 늦은 팁이 hideUI 재차폐 창(수백 ms)에 새어 나오던 문제 해소.
  try { if (S.state) S.state.tipsSeen = new Proxy({}, { get: () => true }); } catch (e) {}
  $T().hideUI(true);
  if (!_hideTick) _hideTick = setInterval(() => { if (!window.__trailerScript._keepUI) $T().hideUI(true); }, 700); // 늦은 토스트 등 잔여 UI 상시 검거 (전리품 비트 예외)
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
