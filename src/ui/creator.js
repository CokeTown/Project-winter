/* ============================================================
   ui/creator.js — 씬 저작 크리에이터 모드 (디렉터 직접 저작 도구)
   ------------------------------------------------------------
   목적: "디렉터 명령 → Claude 해석 → 코드 수정" 루프 대신, 디렉터가 셸터 씬(가구 배치·조명·
   카메라·컨텍스트)을 직접 저작하고 JSON으로 내보내는 도구. 저작을 시각 판단이 있는 곳으로 이동.
   설계: 인게임 editMode(선택·드래그·회전·삭제·재색·티어·젤)를 그대로 재사용하고, 그 위에
   ① 컨텍스트(셸터·시각·날씨·고양이) ② 무게이트 가구 팔레트(addItem 직접) ③ 카메라 ④ 씬 JSON I/O
   를 얹는다. 오버레이는 사이드 패널(캔버스 중앙 비움 → 기존 드래그 조작 유지). 단방향 — 모듈은 game.js를 모른다.
   진입: QA 패널(타이틀 5탭) 「크리에이터 모드」 또는 URL ?creator=1 (dev). 배포본 무영향(게이트 진입).
   ============================================================ */
import { LN, t } from '../i18n.js';
const $ = id => document.getElementById(id);

// DEFS엔 category 필드가 없으므로(파운데이션 매핑 확인) 기능 플래그로 그룹 유도.
function categoryOf(def) {
  if (def.appliance) return 'utility';
  if (def.light || def.selfLit) return 'light';
  if (def.dlc) return 'dlc';
  if (def.noCollide) return 'deco';
  return 'furniture';
}
const CAT_LABEL = { furniture: '가구', light: '조명', utility: '설비', deco: '벽·평면', dlc: 'DLC' };
const CAT_ORDER = ['furniture', 'light', 'utility', 'deco', 'dlc'];
const WEATHERS_UI = [['clear', '맑음'], ['snow', '눈'], ['rain', '비'], ['storm', '폭풍'], ['ash', '재']];

export function makeCreatorUI(ctx) {
  const {
    setPaused, forceEditMode, hideTitle, loadShelter, state, SHELTERS, DEFS,
    addItem, getItems, select, deselect, getSelected, clampToRoom,
    setHour, setWeather, spawnCat, despawnCat, getCat, qaPlaceCat,
    camState, setZoom, setYaw, setPitch, toast,
  } = ctx;

  let active = false;

  const shelterIds = () => Object.keys(SHELTERS);
  const curHour = () => Math.floor((state.gameMin % 1440) / 60);

  // 라이브 items[] → 정본 레이아웃 스키마(game.js:2053 동일). 씬 내보내기의 인코더.
  function serializeItems() {
    return getItems().map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0 }));
  }

  function sceneEnvelope() {
    const c = getCat && getCat();
    return {
      v: 1, kind: 'nine-winters-scene',
      shelter: state.current, hour: curHour(), weather: state.weatherType || 'clear',
      cat: !!state.cat, catPos: c ? [+c.g.position.x.toFixed(2), +c.g.position.z.toFixed(2)] : null,
      cam: { yaw: +camState.yaw.toFixed(3), pitch: +camState.elev.toFixed(3), zoom: +camState.zoom.toFixed(3), panX: +camState.panX.toFixed(2), panZ: +camState.panZ.toFixed(2) },
      items: serializeItems(),
    };
  }

  // ── 진입/이탈 ─────────────────────────────────────────
  function enter() {
    if (active) return;
    active = true;
    hideTitle && hideTitle();  // 타이틀 뒤 씬 노출(타이틀=집 배경이라 셸터는 이미 로드됨)
    forceEditMode(true);       // 그리드+선택/드래그 활성
    setPaused(true);           // 씬 동결(저작 중 시뮬 정지)
    buildUI();
    document.body.classList.add('creator-on');
    toast('크리에이터 모드 — 저작 시작');
  }
  function exit() {
    if (!active) return;
    active = false;
    const p = $('creator-ui'); if (p) p.remove();
    const s = $('creator-style'); // 스타일은 존치(재진입 대비)
    document.body.classList.remove('creator-on');
    forceEditMode(false);
    setPaused(false);
    toast('크리에이터 모드 종료');
  }

  // ── 배치 ─────────────────────────────────────────────
  // 무게이트 배치: 인벤토리/충돌 검사 없이 addItem 직접. 방 중앙 근처 빈 스팟에 놓고 즉시 선택
  // → 디렉터가 기존 editMode 드래그로 위치 조정.
  function placeItem(defId) {
    const def = DEFS[defId]; if (!def) return;
    // 겹침 회피용 소량 오프셋 나선
    const n = getItems().length;
    const ox = ((n % 5) - 2) * 0.5, oz = (Math.floor(n / 5) % 5 - 2) * 0.5;
    const [cx, cz] = clampToRoom({ defId, colorIdx: 0, rot: 0 }, ox, oz);
    const tier = def.tiered ? 3 : 0;
    const it = addItem(defId, 0, cx, cz, 0, true, 0, tier);
    if (it) { deselect(); select(it); }
  }

  // ── 씬 I/O ───────────────────────────────────────────
  function exportScene() {
    const data = sceneEnvelope();
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `scene-${data.shelter}-${data.hour}h.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('씬 JSON 내보냄');
  }
  function importSceneObj(data) {
    if (!data || data.kind !== 'nine-winters-scene' || !Array.isArray(data.items)) { toast('씬 파일 형식 오류'); return; }
    const sh = SHELTERS[data.shelter] ? data.shelter : state.current;
    state.layouts[sh] = data.items;         // 레이아웃 주입
    state.current = sh;
    if (typeof data.hour === 'number') { state.gameMin = Math.floor(state.gameMin / 1440) * 1440 + data.hour * 60; }
    if (data.cat) state.cat = true;
    loadShelter(sh);                         // 결정론적 씬 재구성(가구·조명·엔티티)
    if (data.weather) setWeather(data.weather);
    if (data.hour != null) setHour(data.hour);
    if (data.cat && data.catPos && qaPlaceCat) { spawnCat && spawnCat().then?.(() => qaPlaceCat(data.catPos[0], data.catPos[1], 'sleep')); }
    if (data.cam) { setYaw(data.cam.yaw); setPitch(data.cam.pitch); setZoom(data.cam.zoom); }
    rebuildContextUI();
    toast('씬 불러옴: ' + sh);
  }
  function importSceneFile() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { importSceneObj(JSON.parse(r.result)); } catch (e) { toast('파싱 실패'); } }; r.readAsText(f); };
    inp.click();
  }

  // ── UI 빌드 ──────────────────────────────────────────
  function ensureStyle() {
    if ($('creator-style')) return;
    const st = document.createElement('style'); st.id = 'creator-style';
    st.textContent = `
      /* 저작 뷰 정리: 게임 HUD 은폐, 캔버스(#c)·날씨FX(#fx)·크리에이터 UI·선택카드(#sel-panel)·모달만 유지 */
      body.creator-on > *:not(#c):not(#fx):not(#creator-ui):not(#sel-panel):not(#modal-back):not(#toast){display:none!important}
      #creator-ui{position:fixed;inset:0;pointer-events:none;z-index:2000;font-family:inherit}
      #creator-ui .cr-panel{pointer-events:auto;background:rgba(16,16,20,.92);border:1px solid #3a3a44;border-radius:8px;color:#e8e2d4;box-shadow:0 4px 24px rgba(0,0,0,.5)}
      #creator-top{position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:6px 10px;flex-wrap:wrap;max-width:94vw}
      #creator-top select,#creator-top button,#creator-pal button,#creator-io button{font-family:inherit;font-size:12px;background:#23232b;color:#e8e2d4;border:1px solid #44444e;border-radius:5px;padding:4px 8px;cursor:pointer}
      #creator-top button:hover,#creator-pal button:hover{background:#33333d}
      #creator-top .cr-x{background:#5a2b2b;border-color:#7a3b3b}
      #creator-top label{font-size:11px;color:#a8a29a;display:flex;gap:4px;align-items:center}
      #creator-pal{position:absolute;top:56px;left:8px;bottom:8px;width:210px;display:flex;flex-direction:column;padding:8px;overflow-y:auto}
      #creator-pal h4{margin:8px 0 4px;font-size:11px;color:#9a94c0;letter-spacing:.05em;text-transform:uppercase}
      #creator-pal h4:first-child{margin-top:0}
      #creator-pal .cr-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
      #creator-pal button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;font-size:10px;line-height:1.1;text-align:center}
      #creator-pal .cr-emoji{font-size:18px}
      #creator-cam{position:absolute;bottom:8px;right:8px;width:190px;padding:8px;display:flex;flex-direction:column;gap:6px}
      #creator-cam label{font-size:11px;color:#a8a29a;display:flex;justify-content:space-between;align-items:center;gap:6px}
      #creator-cam input[type=range]{flex:1}
      #creator-io{position:absolute;top:56px;right:8px;display:flex;flex-direction:column;gap:6px;padding:8px;width:150px}
      #creator-io button{padding:8px}
      #creator-io .cr-save{background:#2b4a2b;border-color:#3b6a3b}
      #creator-hint{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:11px;color:#a8a29a;background:rgba(16,16,20,.8);padding:4px 10px;border-radius:5px;pointer-events:none}
    `;
    document.head.appendChild(st);
  }

  function buildUI() {
    ensureStyle();
    let ui = $('creator-ui'); if (ui) ui.remove();
    ui = document.createElement('div'); ui.id = 'creator-ui';

    // 상단 컨텍스트 바
    const top = document.createElement('div'); top.id = 'creator-top'; top.className = 'cr-panel';
    top.innerHTML = `
      <label>셸터 <select id="cr-shelter"></select></label>
      <label>시각 <input id="cr-hour" type="range" min="0" max="23" step="1" style="width:90px"><span id="cr-hourv" style="width:26px;text-align:right"></span></label>
      <label>날씨 <span id="cr-weather"></span></label>
      <label><input id="cr-cat" type="checkbox"> 고양이</label>
      <button class="cr-x" id="cr-exit">종료</button>`;
    ui.appendChild(top);

    // 좌측 팔레트
    const pal = document.createElement('div'); pal.id = 'creator-pal'; pal.className = 'cr-panel';
    for (const cat of CAT_ORDER) {
      const ids = Object.keys(DEFS).filter(id => categoryOf(DEFS[id]) === cat);
      if (!ids.length) continue;
      const h = document.createElement('h4'); h.textContent = CAT_LABEL[cat] + ' · ' + ids.length; pal.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'cr-grid';
      for (const id of ids) {
        const def = DEFS[id];
        const b = document.createElement('button');
        b.innerHTML = `<span class="cr-emoji">${def.emoji || '▪'}</span><span>${LN(def) || id}</span>`;
        b.title = id;
        b.addEventListener('click', () => placeItem(id));
        grid.appendChild(b);
      }
      pal.appendChild(grid);
    }
    ui.appendChild(pal);

    // 우측 I/O
    const io = document.createElement('div'); io.id = 'creator-io'; io.className = 'cr-panel';
    io.innerHTML = `
      <button class="cr-save" id="cr-export">씬 저장(JSON)</button>
      <button id="cr-import">씬 불러오기</button>
      <button id="cr-clear">전체 비우기</button>
      <button id="cr-copy">클립보드 복사</button>`;
    ui.appendChild(io);

    // 우하단 카메라
    const cam = document.createElement('div'); cam.id = 'creator-cam'; cam.className = 'cr-panel';
    cam.innerHTML = `
      <label>회전 <input id="cr-yaw" type="range" min="0" max="6.28" step="0.02"></label>
      <label>기울기 <input id="cr-pitch" type="range" min="0.1" max="1.5" step="0.02"></label>
      <label>줌 <input id="cr-zoom" type="range" min="0.3" max="3.0" step="0.02"></label>`;
    ui.appendChild(cam);

    const hint = document.createElement('div'); hint.id = 'creator-hint';
    hint.textContent = '팔레트 클릭=배치 · 가구 클릭+드래그=이동 · R=회전 · Del=삭제 · 선택 카드=색/티어/젤';
    ui.appendChild(hint);

    document.body.appendChild(ui);
    wireContext();
    rebuildContextUI();
  }

  function wireContext() {
    // 셸터
    const sel = $('cr-shelter'); sel.innerHTML = shelterIds().map(id => `<option value="${id}">${id}</option>`).join('');
    sel.value = state.current;
    sel.addEventListener('change', () => { state.current = sel.value; loadShelter(sel.value); rebuildContextUI(); });
    // 시각
    const hr = $('cr-hour'); hr.addEventListener('input', () => { setHour(+hr.value); $('cr-hourv').textContent = hr.value + 'h'; });
    // 날씨
    $('cr-weather').innerHTML = WEATHERS_UI.map(([id, ko]) => `<button data-w="${id}">${ko}</button>`).join('');
    $('cr-weather').querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => { setWeather(b.dataset.w); rebuildContextUI(); }));
    // 고양이
    $('cr-cat').addEventListener('change', e => { state.cat = e.target.checked; if (e.target.checked) spawnCat && spawnCat(); else despawnCat && despawnCat(); });
    // I/O
    $('cr-export').addEventListener('click', exportScene);
    $('cr-import').addEventListener('click', importSceneFile);
    $('cr-clear').addEventListener('click', () => { state.layouts[state.current] = []; loadShelter(state.current); toast('씬 비움'); });
    $('cr-copy').addEventListener('click', () => { navigator.clipboard?.writeText(JSON.stringify(sceneEnvelope(), null, 1)); toast('씬 JSON 클립보드 복사'); });
    $('cr-exit').addEventListener('click', exit);
    // 카메라
    const yaw = $('cr-yaw'), pit = $('cr-pitch'), zm = $('cr-zoom');
    yaw.addEventListener('input', () => setYaw(+yaw.value));
    pit.addEventListener('input', () => setPitch(+pit.value));
    zm.addEventListener('input', () => setZoom(+zm.value));
  }

  // 컨텍스트 UI를 현재 상태로 동기화(불러오기/셸터 전환 후).
  function rebuildContextUI() {
    if (!active) return;
    const sel = $('cr-shelter'); if (sel) sel.value = state.current;
    const hr = $('cr-hour'), hv = $('cr-hourv'); if (hr) { hr.value = curHour(); if (hv) hv.textContent = curHour() + 'h'; }
    const cc = $('cr-cat'); if (cc) cc.checked = !!state.cat;
    const yaw = $('cr-yaw'), pit = $('cr-pitch'), zm = $('cr-zoom');
    if (yaw) yaw.value = camState.yaw; if (pit) pit.value = camState.elev; if (zm) zm.value = camState.zoom;
  }

  return { enter, exit, isActive: () => active, importSceneObj };
}
