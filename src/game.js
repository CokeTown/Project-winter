import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert, josa } from './lib/helpers.js';
import { DEFS } from './data/furniture.js';
import { BAL } from './data/balance.js';
import { PROJECTS } from './data/projects.js';
// 콘텐츠 데이터 분리 Phase 1 (순수 테이블 추출) — 로직은 game.js에 그대로.
import { RESOURCES, INJURIES, PREPS, THEME_SETS, CAT_POSES, CAT_PERCH_Y, CRAFTS, OUTFITS } from './data/items.js';
import { DISTRICTS, REGIONS } from './data/world.js';
import { MEMOS, WILLS, MEMO_REGIONS, MEMOS_BY_REGION, MEMOS_SUBWAY, MEMOS_RESORT, MEMOS_RESEARCH, MEMOS_HARBOR, BROADCASTS, SKETCHES } from './data/lore.js';
import { makeEvents } from './data/events.js';
import { makeDecoTex } from './data/decotex.js';
import { makeCatSystem } from './systems/cat.js';
import { makeWildlifeSystem } from './systems/wildlife.js';
import { makeAvatarSystem } from './systems/avatar.js';
import { WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE } from './data/wildlife.js';
import { lang, setLang, t, LN, LD, LF, applyStaticI18n } from './i18n.js';
import { playSfx, setAmbience, setFire, setSfxVol, initSfx, setSeasonAmbience, seasonAmbienceName } from './sfx.js';
import { Platform, bindPlatform } from './lib/platform.js';
import { state, DEFAULT_STATE, opts, OPTS_DEFAULT } from './core/state.js'; // 모놀리스 분해 Phase 1: 공유 가변 상태
import { isHard, isHardcore, isZen, isWallpaper, rescueEligible } from './core/mode.js'; // 난이도 예측자
import { SEASONS, SEASON_DAYS, seasonOf, seasonDay, seasonIndex } from './core/season.js'; // 계절 달력

// 데이터 테이블 표시 헬퍼 (lang==='en' && *En 있으면 영문, 아니면 원본)
const LName = LN;                        // obj.name / obj.nameEn
const LDesc = LD;                        // obj.desc / obj.descEn
const LRisk = (o) => LF(o, 'risk');      // REGIONS.risk
const LEff  = (o) => LF(o, 'eff');       // PREPS.eff
const LLabel = (o) => LF(o, 'label');    // perk.label / upkeep.label / appliance.label
const LBonus = (o) => LF(o, 'bonusLabel'); // DISTRICTS.bonusLabel
const LHint = (o) => LF(o, 'hint');      // CRAFTS.hint
const LLimits = (o) => LF(o, 'limits');  // SHELTERS.limits
const LColor = (o, i) => (lang === 'en' && o.colorNamesEn ? o.colorNamesEn[i] : o.colorNames[i]);
// buff 라벨: 이벤트 버프는 labelId(신규) 또는 label(구세이브 잔재)
const buffLabel = (b) => b ? (b.labelId ? t(b.labelId) : (b.label || '')) : '';

/* ============================================================
   생성 아트 아이콘 (public/img/icons) — 이모지 UI 교체 (#19)
   테이블(RESOURCES/DEFS 등) 원본 필드는 불변, 렌더 시점에만 아이콘 우선.
   이미지 로드 실패 시 onerror로 이모지 텍스트 폴백(오프라인 PWA 캐시 미스 대비).
============================================================ */
// HTML 속성값 안전화 (이모지/따옴표를 onerror 인라인 폴백에 넣기 위함)
const _iconEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// icon(name, emojiFallback, cls) → <img class="px-icon …"> 문자열. emoji 폴백 필수(로드 실패 시 텍스트로 대체).
function icon(name, emoji = '', cls = '') {
  const fb = _iconEsc(emoji);
  return `<img class="px-icon${cls ? ' ' + cls : ''}" src="img/icons/${name}.png" alt="" draggable="false"`
    + ` onerror="this.replaceWith(document.createTextNode('${fb}'))">`;
}
// ID→아이콘명 매핑 (테이블 원본 대신 별도 객체). 대부분 ID가 파일명과 직결되나 예외(region slum→slums)만 명시.
const REGION_ICON = { residential: 'icon_region_residential', commercial: 'icon_region_commercial', industrial: 'icon_region_industrial', slum: 'icon_region_slums' };
const GAUGE_ICON = { hunger: 'icon_g_hunger', thirst: 'icon_g_thirst', energy: 'icon_g_energy' };
const WEATHER_ICON = { clear: 'icon_weather_clear', snow: 'icon_weather_snow', rain: 'icon_weather_rain', ash: 'icon_weather_ash', storm: 'icon_weather_storm' };
// 렌더 편의 래퍼 (테이블 객체를 받아 아이콘 우선, emoji 폴백)
const resIcon   = (id, cls = '') => icon(`icon_res_${id}`, RESOURCES[id]?.emoji || '', cls);
const furnIcon  = (id, cls = '') => icon(`icon_furn_${id}`, DEFS[id]?.emoji || '', cls);
const shIcon    = (id, cls = '') => icon(`icon_shelter_${id}`, SHELTERS[id]?.emoji || '', cls);
const regionIcon= (id, cls = '') => icon(REGION_ICON[id] || `icon_region_${id}`, REGIONS[id]?.emoji || '', cls);
const wxIcon    = (type, cls = '') => icon(WEATHER_ICON[type] || `icon_weather_${type}`, WEATHERS[type]?.icon || '', cls);

/* ============================================================
   기본 설정
============================================================ */
const GRID = 0.25;
// #89 QA 에디션: 빌드 플래그(vite define, tools/build-qa.ps1가 켠다). 무한 자원·전 해금·업적 no-op·워터마크.
//   세이브는 키 네임스페이스(qa-)로 완전 분리 — 정식 빌드 세이브와 상호 불가침.
const QA_ED = typeof __QA_EDITION__ !== 'undefined' && !!__QA_EDITION__;
// #74 Next Fest 데모 「첫 번째 겨울」: 빌드 플래그(tools/build-demo.ps1). 노말 전용, 첫 겨울을 넘기면
//   데모 종료(그 세이브는 열람 잠금 — 정식판 이관 안내). 세이브 네임스페이스 demo- 분리.
const DEMO_ED = typeof __DEMO__ !== 'undefined' && !!__DEMO__;
const KEY_NS = QA_ED ? 'qa-' : DEMO_ED ? 'demo-' : '';
const SAVE_KEY = KEY_NS + 'project-shelter-web-v2';
const LASTSLOT_KEY = KEY_NS + 'project-shelter' + '-lastslot'; // 이어하기 포인터도 에디션별 분리 (QA가 정식 포인터를 밀면 빈 슬롯 이어하기 오노출)
const OLD_SAVE_KEY = 'project-shelter-web-v1';
const GAME_MIN_PER_SEC = 1.0;   // 실제 1초 = 게임 1분 (하루 = 실시간 24분) — v1.5.1 디렉터 확정(순삭감 완화, 1.5→1.0)
//   게이지 소모·부패·스폰 주기는 전부 '게임 분' 기준이라 게임일 밸런스 불변. 오프라인 정산·탐험 차감식(#94)도 이 상수를 공유해 일관.
const WAKE_HOUR = 7;            // 취침 후 기상 시각 (07:00) — sleepUntilMorning/결산 게이트 공용 (v1.2.0)

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false; // 정적 씬: 변경 시에만 갱신
function shadowDirty() { renderer.shadowMap.needsUpdate = true; }

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a2233, 24, 58);

/* ============================================================
   카메라 (이소메트릭 직교 + 궤도 회전/줌)
============================================================ */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const camState = {
  yaw: Math.PI / 4, elev: THREE.MathUtils.degToRad(33), dist: 24, zoom: 0.6, targetYaw: Math.PI / 4,
  // #70 클램프 팬: 카메라 타겟의 월드 XZ 오프셋 — 렌더 전용(세이브 미저장, 시뮬 무영향, 로드 시 0).
  //   targetPan → pan 을 yaw 보간과 같은 문법으로 매 프레임 lerp (reduceMotion이면 즉시 스냅).
  panX: 0, panZ: 0, targetPanX: 0, targetPanZ: 0,
};
const camCenter = new THREE.Vector3(0, 0.9, 0);
// #70: 이번 프레임 카메라에 '실제 적용된' 팬(클로즈업 중엔 0) — 컬링 판정이 팬을 되돌려
//   벽/천장/근경소품 마스크가 팬과 무관하게 유지되도록 하는 보정값(아래 updateWallCulling/tickEnv).
const camPanApplied = { x: 0, z: 0 };
const _panLook = new THREE.Vector3();
// 팬 클램프 반경: 방 크기 비례(마당·원경 부착물이 살짝 보이는 정도) — 벡터 길이 원형 클램프.
function panMax() { return Math.max(ROOM.w, ROOM.d) * 0.55; }
function setPanTarget(x, z) {
  const m = panMax(), len = Math.hypot(x, z);
  if (len > m) { x = x * m / len; z = z * m / len; }
  camState.targetPanX = x; camState.targetPanZ = z;
}
// #70 화면 픽셀 드래그 → 월드 XZ 팬 (grab-the-world: 잡은 지점이 포인터를 따라온다).
//   직교 투영에서 세로 h=9/zoom 이 innerHeight px에 대응 → 픽셀당 월드 길이(wpp).
//   세로 드래그는 앙각(elev)의 바닥 평면 투영 보정(fs) — 낮은 앵글일수록 같은 픽셀이 더 먼 바닥 거리.
function panByScreenDelta(dx, dy) {
  const wpp = (9 / camState.zoom) / innerHeight;
  const fs = 1 / Math.max(0.35, Math.sin(camState.elev));
  const yaw = camState.yaw;
  const rx = Math.sin(yaw), rz = -Math.cos(yaw);   // 화면 오른쪽의 월드 XZ 방향
  const fx = -Math.cos(yaw), fz = -Math.sin(yaw);  // 화면 위쪽의 월드 XZ 방향(카메라 → 방 중심)
  setPanTarget(
    camState.targetPanX - dx * wpp * rx + dy * wpp * fs * fx,
    camState.targetPanZ - dx * wpp * rz + dy * wpp * fs * fz
  );
}

// ④ 고양이 클로즈업 카메라 — 비배치 모드에서 고양이 탭 시 얼굴로 글라이드. 드래그/ESC/빈곳 탭으로 복원.
//   활성 중엔 카메라 타겟을 고양이(눈높이 살짝 위)로 옮기고 거리/줌/앙각을 클로즈업 프로필로 보간(지연 추적).
const catCam = {
  active: false,
  center: new THREE.Vector3(0, 0.9, 0), // 실제 추적 중심(고양이로 지연 수렴)
  saved: null,                          // 복원용 { yaw, elev, zoom }
  targetYaw: 0,                         // ⑶ 진입 시 1회 확정하는 목표 yaw(짧은 호 ≤45° 클램프). 매 프레임 재계산 안 함.
};
// ⑶ 클로즈업 진입 회전 최소화: 고양이 facing으로 스냅하지 않고, "현재 카메라 yaw 기준 최소 회전"을 쓴다.
//   후보 = facing+yawOffset 및 facing-yawOffset(좌우 3/4 중 가까운 쪽). 현재 yaw와의 각차를 짧은 호로 접고,
//   ±45°(π/4)로 클램프 → 줌·센터링 위주로 얼굴을 잡되 화면이 홱 돌지 않게 한다.
function shortAngle(a) { let d = a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function computeCatCloseupYaw(facing, curYaw) {
  const off = BAL.catCam.yawOffset;
  const cands = [facing + off, facing - off];
  let best = cands[0], bestAbs = Infinity;
  for (const c of cands) { const d = Math.abs(shortAngle(c - curYaw)); if (d < bestAbs) { bestAbs = d; best = c; } }
  const CLAMP = Math.PI / 4; // ≤45°
  const delta = THREE.MathUtils.clamp(shortAngle(best - curYaw), -CLAMP, CLAMP);
  return curYaw + delta;
}
// 고양이 시스템은 src/systems/cat.js로 분리됐다(엔지니어링 Phase 2). catObj는 그 클로저의 모듈
// 상태라, game.js는 아래 getCat()로만 현재 고양이 인스턴스를 읽는다(catSys는 하단에서 생성).
function getCat() { return catSys.getCat(); }
function enterCatCloseup() {
  const _cat = getCat();
  if (catCam.active || !_cat) return;
  catCam.saved = { yaw: camState.targetYaw, elev: camState.elev, zoom: camState.zoom };
  // #70: 팬 상태에서 진입해도 '지금 보던 중심'에서 출발(진입 프레임 점프 방지) — 클로즈업 중 팬은 미적용.
  catCam.center.set(camCenter.x + camPanApplied.x, camCenter.y, camCenter.z + camPanApplied.z);
  // ⑶ 진입 시점의 현재 카메라 yaw 기준으로 목표 yaw를 1회 확정(짧은 호 ≤45°). 이후엔 이 값으로만 글라이드.
  catCam.targetYaw = computeCatCloseupYaw(_cat.g.rotation.y, camState.yaw);
  catCam.active = true;
}
function exitCatCloseup() {
  if (!catCam.active) return;
  catCam.active = false;
  if (catCam.saved) {
    camState.targetYaw = catCam.saved.yaw;
    camState.zoom = catCam.saved.zoom;
    camState.elev = catCam.saved.elev;
    catCam.saved = null;
  }
}
function updateCamera() {
  const C = BAL.catCam;
  let center = camCenter, dist = camState.dist, elev = camState.elev;
  const _cat = getCat();
  if (catCam.active && _cat) {
    // 고양이 눈높이 살짝 위를 지연 추적(급회전 금지) — center를 catObj로 lerp
    const p = _cat.g.position;
    catCam.center.x += (p.x - catCam.center.x) * C.glideLerp;
    catCam.center.y += ((p.y + C.heightAbove) - catCam.center.y) * C.glideLerp;
    catCam.center.z += (p.z - catCam.center.z) * C.glideLerp;
    center = catCam.center;
    // ⑶ 진입 시 확정한 목표 yaw(짧은 호 ≤45° 클램프)로만 회전한다 — 매 프레임 고양이 facing으로
    //   스냅하지 않아 진입 회전이 과하지 않다. 줌·센터링(center lerp)이 얼굴 클로즈업을 완성한다.
    camState.targetYaw = catCam.targetYaw;
    // 거리/줌/앙각을 클로즈업 프로필로 보간(글라이드 ~1초)
    dist = camState.dist + (C.dist - camState.dist) * C.glideLerp; camState.dist = dist;
    elev = camState.elev + (THREE.MathUtils.degToRad(C.elevDeg) - camState.elev) * C.glideLerp; camState.elev = elev;
    camState.zoom += (C.zoom - camState.zoom) * C.glideLerp;
  } else if (camState.dist !== 24) {
    // 복원: 클로즈업에서 빠져나오면 기본 거리/앙각으로 서서히 되돌린다
    camState.dist += (24 - camState.dist) * 0.16; dist = camState.dist;
    if (Math.abs(dist - 24) < 0.05) camState.dist = 24;
  }
  camState.yaw += (camState.targetYaw - camState.yaw) * (catCam.active ? BAL.catCam.glideLerp : 0.15);
  // #70 팬 보간: targetPan → pan (yaw 보간 문법). reduceMotion이면 즉시. 클로즈업 중엔 팬 미적용(스펙: 비활성).
  if (opts.reduceMotion) { camState.panX = camState.targetPanX; camState.panZ = camState.targetPanZ; }
  else {
    camState.panX += (camState.targetPanX - camState.panX) * 0.15;
    camState.panZ += (camState.targetPanZ - camState.panZ) * 0.15;
  }
  camPanApplied.x = catCam.active ? 0 : camState.panX;
  camPanApplied.z = catCam.active ? 0 : camState.panZ;
  const yaw = camState.yaw;
  // 카메라 타겟 = camCenter + (panX, 0, panZ) — camCenter 자체는 불변(컬링 기준점 유지, 의도된 동작).
  camera.position.set(
    center.x + camPanApplied.x + dist * Math.cos(elev) * Math.cos(yaw),
    center.y + dist * Math.sin(elev),
    center.z + camPanApplied.z + dist * Math.cos(elev) * Math.sin(yaw)
  );
  _panLook.set(center.x + camPanApplied.x, center.y, center.z + camPanApplied.z);
  camera.lookAt(_panLook);
  const aspect = innerWidth / innerHeight;
  const h = 9 / camState.zoom;
  camera.left = -h * aspect / 2; camera.right = h * aspect / 2;
  camera.top = h / 2; camera.bottom = -h / 2;
  camera.updateProjectionMatrix();
}
function fitZoomForShelter() {
  const aspect = innerWidth / innerHeight;
  const base = SHELTERS[state.current].viewH;
  const needH = Math.max(base, (base + 3) / Math.max(aspect, 0.4));
  camState.zoom = THREE.MathUtils.clamp(9 / needH, 0.2, 1);
}

/* ============================================================
   조명 (환경별로 색/세기 조정)
============================================================ */
const hemi = new THREE.HemisphereLight(0x8a98bd, 0x46403a, 0.7);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0x9db4d8, 0.75);
moon.position.set(-6, 12, -4);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -16; moon.shadow.camera.right = 16;
moon.shadow.camera.top = 16; moon.shadow.camera.bottom = -16;
moon.shadow.camera.far = 60;
scene.add(moon);

const ceilLight = new THREE.PointLight(0xffd9a0, 25, 16, 1.6);
ceilLight.castShadow = true;
ceilLight.shadow.mapSize.set(512, 512);
scene.add(ceilLight);

/* ============================================================
   절차적 텍스처
============================================================ */
function makeCanvasTex(draw, w = 128, h = 128, repX = 1, repY = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const floorWoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
  const plank = h / 4;
  for (let r = 0; r < 4; r++) {
    g.fillStyle = ['#8f6f4c', '#846544', '#967551', '#7e6040'][r % 4];
    g.fillRect(0, r * plank, w, plank);
    g.fillStyle = '#5d452c'; g.fillRect(0, r * plank, w, 2);
    const off = (r * 53) % w;
    g.fillRect(off, r * plank, 2, plank);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 14; i++) g.fillRect((off + i * 31) % w, r * plank + (i * 13) % plank, 5, 1);
  }
}, 128, 128, 5, 4);
const wallWoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#a08258'; g.fillRect(0, 0, w, h);
  const plank = w / 5;
  for (let c = 0; c < 5; c++) {
    g.fillStyle = ['#a5875c', '#9a7c52', '#ab8d63', '#94774e', '#a1835a'][c];
    g.fillRect(c * plank, 0, plank, h);
    g.fillStyle = '#6e5636'; g.fillRect(c * plank, 0, 2, h);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 10; i++) g.fillRect(c * plank + 4 + (i * 7) % (plank - 6), (c * 37 + i * 29) % h, 2, 6);
  }
}, 128, 128, 3, 1);
const metalTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#5c6670'; g.fillRect(0, 0, w, h);
  const rib = w / 8;
  for (let c = 0; c < 8; c++) {
    g.fillStyle = c % 2 ? '#525b64' : '#616b76';
    g.fillRect(c * rib, 0, rib, h);
    g.fillStyle = '#3d444c'; g.fillRect(c * rib, 0, 2, h);
  }
  // 녹 얼룩
  g.fillStyle = 'rgba(140,84,52,0.55)';
  for (let i = 0; i < 9; i++) {
    const x = (i * 41 + 13) % w, y = (i * 67 + 30) % h;
    g.fillRect(x, y, 5 + (i * 7) % 12, 3 + (i * 5) % 9);
  }
  g.fillStyle = 'rgba(110,62,38,0.5)';
  for (let i = 0; i < 6; i++) g.fillRect((i * 53 + 5) % w, h - 14 - (i * 11) % 10, 4 + (i * 9) % 14, 6);
}, 128, 128, 3, 1);
const plywoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#9c8563'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7a6749'; g.lineWidth = 2;
  g.strokeRect(1, 1, w / 2 - 2, h - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h - 2);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 22; i++) g.fillRect((i * 29 + 7) % w, (i * 17 + 3) % h, 8, 1);
  g.fillStyle = 'rgba(90,60,40,0.35)';
  for (let i = 0; i < 4; i++) g.fillRect((i * 47 + 20) % w, (i * 61 + 12) % h, 10, 7);
}, 128, 128, 3, 2);
const brickTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#8a5138'; g.fillRect(0, 0, w, h);
  const bh = h / 8, bw = w / 4;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 5; c++) {
      const off = r % 2 ? bw / 2 : 0;
      g.fillStyle = ['#94583c', '#84492f', '#9c6244', '#7d452c'][(r * 3 + c + 4) % 4];
      g.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
    }
  }
  g.fillStyle = 'rgba(40,28,20,0.5)';
  for (let i = 0; i < 12; i++) g.fillRect((i * 43 + 11) % w, (i * 29 + 5) % h, 6 + (i * 5) % 10, 3);
}, 128, 128, 3, 2);
const subwayTileTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#7a8a7e'; g.fillRect(0, 0, w, h);
  const tw = w / 6, th = h / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 7; c++) {
      const off = r % 2 ? tw / 2 : 0;
      g.fillStyle = ['#84948a', '#7c8c80', '#8d9c90', '#75857a'][(r * 5 + c + 8) % 4];
      g.fillRect(c * tw + off + 1, r * th + 1, tw - 2, th - 2);
    }
  }
  g.fillStyle = 'rgba(30,35,30,0.4)';
  for (let i = 0; i < 10; i++) g.fillRect((i * 47 + 9) % w, (i * 31 + 4) % h, 5 + (i * 3) % 8, 3);
}, 128, 128, 3, 1);
const concreteTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#6a6a68'; g.fillRect(0, 0, w, h);
  const tile = w / 2;
  g.strokeStyle = '#4e4e4c'; g.lineWidth = 2;
  g.strokeRect(1, 1, tile - 2, tile - 2); g.strokeRect(tile + 1, 1, tile - 2, tile - 2);
  g.strokeRect(1, tile + 1, tile - 2, tile - 2); g.strokeRect(tile + 1, tile + 1, tile - 2, tile - 2);
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < 26; i++) g.fillRect((i * 37 + 5) % w, (i * 23 + 9) % h, 3 + (i % 4), 1);
  // 균열
  g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(10, 20); g.lineTo(34, 44); g.lineTo(30, 70); g.stroke();
  g.beginPath(); g.moveTo(90, 100); g.lineTo(74, 82); g.lineTo(84, 60); g.stroke();
}, 128, 128, 4, 3);

/* ============================================================
   꾸미기 확장 (#13 REQ-DECO-01) — 벽지 6종 / 바닥재 6종
   makeCanvasTex 절차 텍스처. 셸터 지오메트리는 불변 — loadShelter가
   벽/바닥 재질의 .map만 교체(applyDeco). id 'default'는 셸터 원본 유지.
   ARC-01: 콘텐츠 테이블. 신규 벽지/바닥은 여기 항목 추가만으로 늘어난다.
============================================================ */
// 벽지 6종(WALLPAPERS) / 바닥재 6종(FLOORINGS)은 src/data/decotex.js로 분리(콘텐츠 분리 Phase 2).
// tex 클로저가 game.js의 makeCanvasTex(THREE·document 결합)를 참조하므로 팩토리 makeDecoTex(ctx)에
// 주입해 생성한다(원본과 동작 동일). seededRand는 decotex 내부에서 helpers를 직접 import한다.
const { WALLPAPERS, FLOORINGS } = makeDecoTex({ makeCanvasTex });
// 테마 세트(#13): 지정 가구가 모두 배치되면 분위기 축 쾌적 +N. 판정은 선언적 테이블(ARC-01).
const DECO_THEME_COMFORT = BAL.deco.themeSetComfort;
// THEME_SETS(테마 세트)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
// 세트 충족: 필요한 defId 개수(중복 포함)를 배치된 가구가 모두 만족하면 true.
function themeSetActive(ts) {
  const need = {};
  for (const id of ts.items) need[id] = (need[id] || 0) + 1;
  const have = {};
  for (const it of items) have[it.defId] = (have[it.defId] || 0) + 1;
  return Object.entries(need).every(([id, n]) => (have[id] || 0) >= n);
}
function activeThemeSets() { return THEME_SETS.filter(themeSetActive); }
// 텍스처 캐시 (재빌드마다 새 CanvasTexture를 만들지 않도록 lazy 캐시)
const _decoTexCache = {};
function decoTex(kind, id) {
  const table = kind === 'wall' ? WALLPAPERS : FLOORINGS;
  const def = table[id];
  if (!def || !def.tex) return null;
  const key = kind + ':' + id;
  if (!_decoTexCache[key]) _decoTexCache[key] = def.tex();
  return _decoTexCache[key];
}

/* ============================================================
   낡은 종이 텍스처 (생존 수첩 / 찢어진 쪽지용)
   — 추후 AI 생성 텍스처로 교체될 수 있어 함수 하나로 격리해둔다.
============================================================ */
function makePaperTexture(w = 512, h = 640) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const rand = seededRand(Math.floor(Math.random() * 1e9));
  // 바탕: 베이지-누런 색 계열, 약간의 얼룩덜룩한 변주
  g.fillStyle = '#d8cbaa'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = rand() * w, y = rand() * h, r = 30 + rand() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() > 0.5 ? '210,196,160' : '196,178,138';
    grad.addColorStop(0, `rgba(${tone},${(0.05 + rand() * 0.08).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }
  // 얼룩 / 그을음 자국 — 가장자리로 갈수록 짙어지는 비네트
  for (let i = 0; i < 16; i++) {
    const x = rand() * w, y = rand() * h, r = 14 + rand() * 46;
    const edge = Math.min(x, w - x, y, h - y) / Math.min(w, h);
    const dark = rand() > 0.6;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const alpha = (0.10 + rand() * 0.16) * (1 - edge * 0.4);
    grad.addColorStop(0, dark ? `rgba(70,52,30,${alpha.toFixed(3)})` : `rgba(120,95,55,${(alpha * 0.7).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }
  // 비네트: 가장자리를 어둡게
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,30,18,0.38)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // 접힌 자국: 밝고 어두운 대각 줄무늬 몇 개
  g.save();
  g.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 4; i++) {
    const x0 = rand() * w, y0 = 0, x1 = x0 + (rand() - 0.5) * 140, y1 = h;
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    const light = i % 2 === 0;
    grad.addColorStop(0.48, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, light ? 'rgba(255,250,230,0.35)' : 'rgba(40,30,18,0.3)');
    grad.addColorStop(0.52, 'rgba(0,0,0,0)');
    g.strokeStyle = grad;
    g.lineWidth = 3 + rand() * 4;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
  // 미세한 노이즈 그레인
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = w; grainCanvas.height = h;
  const gg = grainCanvas.getContext('2d');
  const imgData = gg.createImageData(w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = 128 + (rand() - 0.5) * 40;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = n;
    imgData.data[i + 3] = 14;
  }
  gg.putImageData(imgData, 0, 0);
  g.drawImage(grainCanvas, 0, 0);
  return cv.toDataURL();
}

function disposeDeep(root) {
  root.traverse(o => {
    if (o.isMesh || o.isPoints) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      // ① 컬링 페이드용 그룹별 재질 클론(perGroupClone)은 map이 있어도 이 그룹 전용이라 해제한다.
      for (const m of mats) if (!m.userData.shared && (!m.map || m.userData.perGroupClone)) m.dispose();
    }
  });
}

/* ============================================================
   환경 공통 요소 (하늘 돔 / 별 / 달) — 셸터별로 색만 바꿈
============================================================ */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    cHorizon: { value: new THREE.Color(0x1a2233) },
    cZenith: { value: new THREE.Color(0x0a0f1a) },
  },
  vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying float vY; uniform vec3 cHorizon, cZenith;
    void main(){ gl_FragColor = vec4(mix(cHorizon, cZenith, smoothstep(-5.0, 60.0, vY)), 1.0); }`,
});
skyMat.userData.shared = true;
scene.add(new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), skyMat));

const stars = (() => {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const srand = seededRand(2026);
  for (let i = 0; i < 350; i++) {
    const a = srand() * Math.PI * 2, e = Math.asin(srand() * 0.92 + 0.06);
    pos.push(120 * Math.cos(e) * Math.cos(a), 120 * Math.sin(e), 120 * Math.cos(e) * Math.sin(a));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcfe0f5, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85,
  }));
  scene.add(p); return p;
})();
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xcdd8ea, fog: false })); // 창백한 차가운 달 (붉은 원 신고 대응)
moonMesh.position.copy(moon.position.clone().normalize().multiplyScalar(115));
scene.add(moonMesh);

let currentMood = { stars: 0.85 };
function applyMood(m) {
  currentMood = m;
  scene.fog.color.setHex(m.fog); scene.fog.near = m.fogNear; scene.fog.far = m.fogFar;
  skyMat.uniforms.cHorizon.value.setHex(m.skyH);
  skyMat.uniforms.cZenith.value.setHex(m.skyZ);
  hemi.color.setHex(m.hemiSky); hemi.groundColor.setHex(m.hemiGround); hemi.intensity = m.hemiInt;
  moon.color.setHex(m.moonC); moon.intensity = m.moonInt;
  stars.material.opacity = m.stars;
  moonMesh.visible = m.moonVisible !== false;
}

/* ============================================================
   시간대 시스템 (아침~밤~새벽, 하늘/조명이 실시간으로 변함)
============================================================ */
// 밤은 셸터 고유 무드를 그대로 사용, 나머지는 전역 팔레트
const DAY_PHASES = {
  dawn: { fog: 0x4a4238, skyH: 0x8a5f4a, skyZ: 0x2a3045, sunC: 0xffb27a, sunInt: 0.55, hemiC: 0x9a8f88, hemiG: 0x4a423a, hemiInt: 0.8, stars: 0.25 },
  // #54: "낮인데 낮인지 모르겠다" — 정오 광량·하늘 밝기 상향 (새벽/황혼은 유지해 하루 리듬 대비 확보.
  // 재(ash)의 뿌연 정체성은 wSun 감쇠가 담당 — 맑은 낮이 확실히 밝아야 재 날씨의 존재감도 산다)
  day:  { fog: 0x8b95a3, skyH: 0xa9bccb, skyZ: 0x6d8398, sunC: 0xfff2d6, sunInt: 1.5, hemiC: 0xd6dfe8, hemiG: 0x77706a, hemiInt: 1.28, stars: 0 },
  dusk: { fog: 0x50403c, skyH: 0xa05a38, skyZ: 0x2f2c4c, sunC: 0xff9a5a, sunInt: 0.6, hemiC: 0xa08a80, hemiG: 0x4a3f38, hemiInt: 0.8, stars: 0.2 },
};
const DAY_KEYS = [[0, 'night'], [4.5, 'night'], [6.5, 'dawn'], [9, 'day'], [16.5, 'day'], [19, 'dusk'], [21, 'night'], [24, 'night']];
function phaseValues(name) {
  if (name !== 'night') return DAY_PHASES[name];
  const m = currentMood;
  return { fog: m.fog, skyH: m.skyH, skyZ: m.skyZ, sunC: m.moonC, sunInt: m.moonInt, hemiC: m.hemiSky, hemiG: m.hemiGround, hemiInt: m.hemiInt, stars: m.stars };
}
const _tc = { a: new THREE.Color(), b: new THREE.Color() };
const _wetSpec = new THREE.Color(); // applyWetness()의 젖은 벽 specular 램프용 임시 컬러
function lerpHex(h1, h2, f, target) {
  _tc.a.setHex(h1); _tc.b.setHex(h2);
  return target.copy(_tc.a).lerp(_tc.b, f);
}
let dayness = 0;
// 창문 하늘판 재질 — 낮/밤/날씨 따라 밝기 갱신 (loadShelter마다 재수집)
const winSkyMats = [];
// 쨍한 낮 전용 창가 빛기둥/먼지 (loadShelter마다 재수집, updateSunShafts가 투명도 구동)
const sunShafts = [];
const sunMotes = [];
// ③ 한파 실내 침투(GD-THESIS L2): 무방비 한파 시 창유리 안쪽에 성에 오버레이. loadShelter마다 재수집.
//   updateEnvironment가 coldSnapNetSeverity로 목표 투명도를 구하고 서서히 페이드(종료 시 서서히 사라짐).
const winFrostMats = [];
let _frostTex = null;
function frostTex() {
  if (_frostTex) return _frostTex;
  // 절차적 성에: 가장자리 짙고 중앙 옅은 결정 서리 (창 모서리부터 얼어붙는 결)
  const W = 128, H = 128;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  // 가장자리 비네트: 네 변에서 안쪽으로 흰 서리
  const grd = g.createRadialGradient(W / 2, H / 2, W * 0.18, W / 2, H / 2, W * 0.72);
  grd.addColorStop(0, 'rgba(233,244,252,0.05)');
  grd.addColorStop(0.55, 'rgba(224,238,250,0.34)');
  grd.addColorStop(1, 'rgba(238,247,255,0.82)');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // 서리 결정 가지 (모서리 근처에서 안쪽으로 뻗는 흰 선)
  g.strokeStyle = 'rgba(245,251,255,0.5)'; g.lineWidth = 1;
  const rnd = seededRand(1373);
  for (let i = 0; i < 90; i++) {
    const edge = Math.floor(rnd() * 4);
    let x, y;
    if (edge === 0) { x = rnd() * W; y = rnd() * H * 0.22; }
    else if (edge === 1) { x = rnd() * W; y = H - rnd() * H * 0.22; }
    else if (edge === 2) { x = rnd() * W * 0.22; y = rnd() * H; }
    else { x = W - rnd() * W * 0.22; y = rnd() * H; }
    const a = rnd() * Math.PI * 2, len = 4 + rnd() * 12;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
  _frostTex = new THREE.CanvasTexture(cv);
  _frostTex.colorSpace = THREE.SRGBColorSpace;
  return _frostTex;
}
let _beamTex = null;
function beamTex() {
  if (_beamTex) return _beamTex;
  // 2D 소프트 빔: 세로 감쇠 × 가로 falloff(중심 밝음→가장자리 0).
  // 가로 페이드가 없으면 옆모서리가 칼로 자른 유리판처럼 보인다 (유저 신고: "너무 직선").
  const W = 64, H = 64;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d');
  const img = g2.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const fadeV = Math.pow(1 - v, 1.4) * (0.35 + 0.65 * (1 - v)); // 창가 밝고 바닥으로 소멸
    for (let x = 0; x < W; x++) {
      const u = Math.abs(x / (W - 1) - 0.5) * 2; // 0=중심, 1=가장자리
      const fadeH = Math.pow(Math.max(0, 1 - u), 1.7); // 부드러운 측면 산란
      const a = Math.round(255 * fadeV * fadeH);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a;
    }
  }
  g2.putImageData(img, 0, 0);
  _beamTex = new THREE.CanvasTexture(cv);
  return _beamTex;
}
let _floorGlowTex = null;
function floorGlowTex() {
  if (_floorGlowTex) return _floorGlowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,0.8)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  _floorGlowTex = new THREE.CanvasTexture(cv);
  return _floorGlowTex;
}
function updateSunShafts() {
  if (!sunShafts.length && !sunMotes.length) return;
  const s = (weather.type === 'clear' && !opts.lowSpec) ? dayness : 0;
  for (const b of sunShafts) { b.material.opacity = 0.26 * s * (b.userData.opMul ?? 1); b.visible = s > 0.02; }
  for (const p of sunMotes) { p.material.opacity = 0.55 * s; p.visible = s > 0.02; }
}
function updateWindowSkies() {
  if (!winSkyMats.length) return;
  const dark = weather.type === 'rain' || weather.type === 'storm' ? 0.35
    : weather.type === 'snow' ? 0.7 : weather.type === 'ash' ? 0.55 : 1;
  _tc.a.setHex(0xcfe0ee); // 맑은 낮 하늘
  for (const m of winSkyMats) {
    _tc.b.setHex(m.userData.baseHex);
    m.color.copy(_tc.b).lerp(_tc.a, dayness * dark);
  }
}
function gameHour() { return (state.gameMin % 1440) / 60; }
function applyTimeLighting() {
  // 지하 셸터: 시간대와 무관하게 고유 무드 고정
  if (SHELTERS[state.current]?.indoor) {
    const A = phaseValues('night');
    scene.fog.color.setHex(A.fog);
    skyMat.uniforms.cHorizon.value.setHex(A.skyH);
    skyMat.uniforms.cZenith.value.setHex(A.skyZ);
    moon.color.setHex(A.sunC); moon.intensity = A.sunInt;
    hemi.color.setHex(A.hemiC); hemi.groundColor.setHex(A.hemiG); hemi.intensity = A.hemiInt;
    stars.material.opacity = 0;
    dayness = 0;
    moonMesh.visible = false;
    updateSunShafts(); // 지하: dayness=0 → 빛기둥 소등
    return;
  }
  const h = gameHour();
  let i = 0;
  while (i < DAY_KEYS.length - 1 && DAY_KEYS[i + 1][0] <= h) i++;
  const [h0, k0] = DAY_KEYS[i], [h1, k1] = DAY_KEYS[Math.min(i + 1, DAY_KEYS.length - 1)];
  const f = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const A = phaseValues(k0), B = phaseValues(k1);
  lerpHex(A.fog, B.fog, f, scene.fog.color);
  lerpHex(A.skyH, B.skyH, f, skyMat.uniforms.cHorizon.value);
  lerpHex(A.skyZ, B.skyZ, f, skyMat.uniforms.cZenith.value);
  lerpHex(A.sunC, B.sunC, f, moon.color);
  moon.intensity = A.sunInt + (B.sunInt - A.sunInt) * f;
  lerpHex(A.hemiC, B.hemiC, f, hemi.color);
  lerpHex(A.hemiG, B.hemiG, f, hemi.groundColor);
  hemi.intensity = A.hemiInt + (B.hemiInt - A.hemiInt) * f;
  const starsBase = A.stars + (B.stars - A.stars) * f;
  stars.material.opacity = starsBase * (weather.type === 'clear' ? 1 : 0.25);
  dayness = THREE.MathUtils.clamp((hemi.intensity - 0.7) / 0.35, 0, 1);
  // #54: 지역(지구)별 무드 틴트 — 어디에 있는지가 색으로 읽히게. 낮에만 은은하게(18%×dayness).
  // 외곽=갈색 헤이즈 / 도심=차가운 회청 / 초원=옅은 초록기 / 숲=짙은 초록 / 해안=푸른 습기
  const _dt = { outskirts: 0x9a8368, city: 0x7e8ea6, meadow: 0x93a67e, forest: 0x7a9678, coast: 0x7e9aac }[districtOf(state.current)];
  if (_dt && dayness > 0.01) {
    scene.fog.color.lerp(_tc.b.setHex(_dt), 0.18 * dayness);
    hemi.color.lerp(_tc.b, 0.10 * dayness);
  }
  // 날씨 광량 대비: 맑은 날은 쨍하게(+6%), 궂은 날은 태양광을 깎는다 — 낮에만 체감(dayness 가중)
  const wSunTab = { clear: 1.06, snow: 0.8, rain: 0.55, ash: 0.62, storm: 0.42 };
  let wSun = wSunTab[weather.type] ?? 1;
  // 날씨 전이(#83): 광량이 파티클보다 앞서 서서히 흐려지고/개인다 — 급변 금지
  if (weather.transPrev != null) { const a = wSunTab[weather.transPrev] ?? 1; wSun = a + (wSun - a) * Math.min(1, weather.transK * 1.4); }
  moon.intensity *= 1 + (wSun - 1) * dayness;
  hemi.intensity *= 1 + (wSun - 1) * 0.45 * dayness;
  // 달: 밤/여명에만 노출. 낮(7~18h)엔 dayness 계산과 무관하게 절대 숨긴다 (실기기 신고: 낮 하늘의 붉은 원).
  // 색은 창백한 차가운 톤(0x9db4d8 계열)으로 고정 — 붉은 여명 하늘과 대비되도록.
  // ⑥-d: 실내 셸터(지하철 등 — 사방·천장이 막혀 하늘이 안 보이는 지오메트리)에선 시간대 무관하게 천체(달/별) 전부 숨김.
  //   벙커는 돔 외피에 개구부가 있어 하늘이 보이는 구조라 indoor=false → 유지. 판정 근거: SHELTERS[*].indoor.
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  moonMesh.visible = !indoorSh && dayness < 0.35 && (h < 7 || h >= 18);
  if (indoorSh) stars.material.opacity = 0; // 실내: 별도 숨김(위 starsBase 계산 무시)
  updateWindowSkies();
  updateSunShafts();
}
function timeLabel() {
  const h = gameHour();
  if (h < 4.5) return ['🌙', t('time.night')];
  if (h < 7) return ['🌄', t('time.dawn')];
  if (h < 11) return ['🌅', t('time.morning')];
  if (h < 16.5) return ['☀️', t('time.day')];
  if (h < 19) return ['🌆', t('time.evening')];
  if (h < 21) return ['🌇', t('time.dusk')];
  return ['🌙', t('time.night')];
}
function clockText() {
  const h = Math.floor(gameHour()), m = Math.floor(state.gameMin % 60);
  const [icon, label] = timeLabel();
  return `Day ${state.day} · ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${icon} ${label}`;
}

/* ============================================================
   계절 (기획서: 4계절 순환 — 12게임일 = 1계절)
============================================================ */
// 계절 달력(SEASONS/SEASON_DAYS/seasonOf/seasonDay/seasonIndex)은 core/season.js로 이전 (분해 Phase 1). 아래 import 참조.
/* ── Nine Winters(#11): 겨울 스냅샷 — 겨울에 들어서는 날 이번 겨울의 시작값을 기록해 둔다.
   memoir는 봄으로 넘어가는 날 이 스냅샷과의 차분으로 "그 해 겨울"을 요약한다.
   winterSnap.acc = 겨울 동안 누적되는 서사 통계 (한파/방어/연료). exp 성공은 lifetime stats.success 차분으로. */
function beginWinterSnapshot() {
  state.winterSnap = {
    day: state.day,                        // 겨울 첫날
    successStart: state.stats?.success || 0, // lifetime 탐험 성공 (차분용)
    acc: { coldSnaps: 0, defended: 0, fuel: 0 }, // 겨울 중 누적
  };
}
// 겨울 중 연료 소모 집계 (winterSnap.acc.fuel) — resConsume('fuel') 경로에서 호출
function accWinterFuel(n) {
  if (seasonOf().id === 'winter' && state.winterSnap?.acc) state.winterSnap.acc.fuel += n;
}
/* ── 한파 (cold snap) — 겨울 보스 이벤트 (Phase B) ── */
// 한파 방어 수단이 몇 단계 갖춰졌는가: 단열 개조 + 난방 가동(장작 난로/온풍기 ON)
function coldDefenseLevel() {
  let lv = 0;
  if (hasMod('insulation') || hasMod('insulationPlus')) lv++;
  if (hasMod('insulationPlus')) lv++; // 강화 단열재는 한 단계 더
  // 난방 가동: 장작 난로(stove, 불빛 연료 fuel) 또는 온풍기(heater) ON
  const heating = items.some(i => {
    if (i.on === false) return false;
    if (i.defId === 'stove') return true;
    return DEFS[i.defId]?.appliance?.effect === 'heat';
  });
  if (heating) lv++;
  // 1.3 스키 로지 붙박이 벽난로 — 유지비만 내면(upkeepOk) 항상 한 단계 방어(고도 페널티 상쇄의 핵심).
  if (SHELTERS[state.current].hearth && state.upkeepOk) lv++;
  return lv;
}
// 한파 활성 여부 (오늘이 coldSnap.until 이하이고 겨울)
function coldSnapActive() {
  return !!(state.coldSnap && seasonOf().id === 'winter' && state.day <= state.coldSnap.until);
}
// 한파 순 페널티 강도 (0=완전 방어). severity - 방어단계, 0~severity로 클램프
function coldSnapNetSeverity() {
  if (!coldSnapActive()) return 0;
  const sev = state.coldSnap.severity || 1;
  return Math.max(0, sev - coldDefenseLevel());
}
// 계절이 날씨 풀을 편향시킨다
function seasonAdjustPool(pool) {
  const s = seasonOf().id;
  // 초봄 꽃샘추위: 봄 1~4일차엔 눈이 완전히 비로 바뀌지 않고 절반 확률로만 남는다
  const earlySpring = s === 'spring' && seasonDay() <= 4;
  return pool.map(w => {
    if (s === 'winter' && w === 'rain') return 'snow';
    if (earlySpring && w === 'snow') return Math.random() < 0.5 ? 'rain' : 'snow';
    if (s !== 'winter' && !earlySpring && w === 'snow') return 'rain'; // 눈은 겨울에만 (초봄 제외)
    return w;
  }).concat(s === 'winter' ? ['snow'] : s === 'summer' ? ['clear'] : []);
}

/* ============================================================
   동적 날씨 (기획서: 날씨가 게임플레이에 직접 영향)
============================================================ */
const WEATHERS = {
  clear: { name: '맑음', nameEn: 'Clear', icon: '🌤️', penalty: 0 },
  snow:  { name: '눈',   nameEn: 'Snow', icon: '🌨️', penalty: 0.15, count: 850, color: 0xdde8f0, size: 3, fall: 1.6, sway: 0.7 },
  rain:  { name: '비',   nameEn: 'Rain', icon: '🌧️', penalty: 0.10, count: 1100, color: 0x8fa8c8, size: 2, fall: 10, sway: 0.12 },
  ash:   { name: '재',   nameEn: 'Ash', icon: '🌫️', penalty: 0.05, count: 380, color: 0x9a938a, size: 2.5, fall: 0.45, sway: 1.3 },
  storm: { name: '폭우', nameEn: 'Downpour', icon: '⛈️', penalty: 0.2, count: 2200, color: 0x7e97b8, size: 2, fall: 14, sway: 0.2 },
};
const weather = { type: 'clear', nextChange: 0, pts: null, seedY: [], seedS: [] };
{
  const MAXN = 2200, SPAN = 23, TOP = 17;
  const arr = new Float32Array(MAXN * 3);
  const wrand = seededRand(4242);
  for (let i = 0; i < MAXN; i++) {
    arr.set([(wrand() * 2 - 1) * SPAN, wrand() * TOP, (wrand() * 2 - 1) * SPAN], i * 3);
    weather.seedY.push(0.7 + wrand() * 0.6);
    weather.seedS.push(wrand() * Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  weather.pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.75,
  }));
  weather.pts.visible = false;
  weather.SPAN = SPAN; weather.TOP = TOP;
  scene.add(weather.pts);
}
// 아늑한 실내 먼지 모트 (조명 빛줄기 속을 떠다니는 입자 — cozy)
const dust = (() => {
  const n = 36;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffe2b8, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.3, fog: false, depthWrite: false,
  }));
  scene.add(p);
  return { pts: p, phase: [...Array(n)].map((_, i) => i * 0.61) };
})();
function scatterDust() {
  const p = dust.pts.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i,
      (Math.random() * 2 - 1) * (ROOM.w / 2 - 0.4),
      0.4 + Math.random() * Math.max(0.8, ROOM.h * 0.75),
      (Math.random() * 2 - 1) * (ROOM.d / 2 - 0.4));
  }
  p.needsUpdate = true;
}

function setWeather(type) {
  weather.type = type;
  state.weatherType = type;
  const W = WEATHERS[type];
  if (!W.count) {
    weather.pts.visible = false;
  } else {
    weather.pts.visible = true;
    weather.pts.material.color.setHex(W.color);
    weather.pts.material.size = W.size;
    weather.pts.geometry.setDrawRange(0, weatherDrawCount(type));
  }
  updateHud();
  if (!state.exp) renderExpPanel();
  // 찢어진 쪽지: 첫 비/눈 (부팅·타이틀 중 발화 방지 — 실제 플레이 중에만)
  if (gameStarted && (type === 'rain' || type === 'storm')) tipOnce('tip.rain');
  if (gameStarted && type === 'snow') tipOnce('tip.snow');
}
/* ── 날씨 전이 (#83 디렉터 오더, Fable 직접): 급변 금지 ──
   원칙: 게임 판정(state.weatherType/HUD/페널티)은 기존대로 즉시 전환 — 밸런스 모호 구간을 만들지 않는다.
   시각(파티클 밀도·색·광량)과 청각(앰비언스 페이드)만 램프를 탄다.
   2상 램프: 전반(k<0.5) 이전 날씨가 잦아듦 → 후반 새 날씨가 차오름. 완료 시 비 갠 낮이면 새소리 원샷. */
const WEATHER_TRANS_MIN = 45;   // 전이 길이(게임분) ≈ 실시간 30초 — 감각 튜닝 값
const WEATHER_AMB_FADE = 8;     // 앰비언스 페이드(실초) — 루프 뚝 시작("이상한 소리") 원천 제거
function transitionWeather(next) {
  const prev = weather.type;
  setWeather(next);                       // 판정/HUD 즉시 (기존 경로 그대로)
  if (next === prev || !gameStarted) return; // 동일 날씨/부팅 중엔 램프 불필요
  weather.transPrev = prev;
  weather.transStart = state.gameMin;
  weather.transK = 0;
  // 전이 시작 시점의 시각 상태는 "이전 날씨 풀 밀도"에서 출발
  const from = WEATHERS[prev];
  if (from.count) {
    weather.pts.visible = true;
    weather.pts.material.color.setHex(from.color); weather.pts.material.size = from.size;
    weather.pts.geometry.setDrawRange(0, weatherDrawCount(prev));
  } else {
    weather.pts.visible = false;
  }
  weather.transBirds = (prev === 'rain' || prev === 'storm') && next === 'clear';
}
function rollWeather() {
  const pool = seasonAdjustPool(SHELTERS[state.current].weatherPool || ['clear']);
  let next = pool[Math.floor(Math.random() * pool.length)];
  // 비가 뽑히면 25% 확률로 폭우(storm)로 승격 (seasonAdjustPool의 풀에는 넣지 않음)
  if (next === 'rain' && Math.random() < 0.25) next = 'storm';
  if (next !== weather.type) { const wn = LName(WEATHERS[next]); state.dayLog.notes.push(t('weather.changed', { name: wn, josa: josa(wn, '으로/로') })); }
  transitionWeather(next);
  // 날씨는 하루~이틀 유지 (기획: 리얼타임 감각)
  state.weatherUntil = state.gameMin + 1440 + Math.random() * 1440;
}
function ensureWeather() {
  const pool = SHELTERS[state.current].weatherPool || ['clear'];
  // storm은 rain의 승격 상태이므로 rain을 다루는 셸터라면 유효한 날씨로 취급
  const valid = pool.includes(state.weatherType) || (state.weatherType === 'storm' && pool.includes('rain'));
  if (state.weatherUntil > state.gameMin && valid) setWeather(state.weatherType);
  else rollWeather();
}
function updateWeather(dt, t) {
  if (state.gameMin > state.weatherUntil) rollWeather();
  // ── 전이 램프(#83): 전반 = 이전 날씨 밀도 감소, 후반 = 새 날씨 밀도 증가 ──
  if (weather.transPrev != null) {
    const k = Math.min(1, Math.max(0, (state.gameMin - weather.transStart) / WEATHER_TRANS_MIN));
    weather.transK = k;
    const fromT = weather.transPrev, toT = weather.type;
    const from = WEATHERS[fromT], to = WEATHERS[toT];
    if (k < 0.5) {
      const c = Math.round(weatherDrawCount(fromT) * (1 - k * 2));
      weather.pts.visible = c > 0;
      if (from.count) { weather.pts.material.color.setHex(from.color); weather.pts.material.size = from.size; weather.pts.geometry.setDrawRange(0, c); }
    } else {
      const c = Math.round(weatherDrawCount(toT) * ((k - 0.5) * 2));
      weather.pts.visible = !!to.count && c > 0;
      if (to.count) { weather.pts.material.color.setHex(to.color); weather.pts.material.size = to.size; weather.pts.geometry.setDrawRange(0, Math.max(1, c)); }
    }
    if (k >= 1) {
      // 전이 완료: 비가 갠 낮이면 새소리 원샷(밤엔 조용히 끝 — 디렉터 오더)
      if (weather.transBirds && gameHour() >= 7 && gameHour() < 19) playSfx('birds_after_rain');
      weather.transPrev = null; weather.transBirds = false;
      setWeather(weather.type); // 최종 밀도/색 확정 복원
    }
  }
  // 파티클 낙하 시뮬은 "지금 화면에 보이는" 날씨 기준 (전이 전반엔 이전 날씨의 낙하 특성)
  const W = WEATHERS[(weather.transPrev != null && weather.transK < 0.5) ? weather.transPrev : weather.type];
  if (!W.count) return;
  const p = weather.pts.geometry.attributes.position;
  const { SPAN, TOP } = weather;
  const rx = ROOM.w / 2 + 0.6, rz = ROOM.d / 2 + 0.6, roofY = ROOM.h + 1.6;
  for (let i = 0; i < W.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y -= W.fall * weather.seedY[i] * dt;
    x += Math.sin(t * 1.4 + weather.seedS[i]) * W.sway * dt;
    // 지붕 아래(실내)로는 떨어지지 않음
    const inRoom = Math.abs(x) < rx && Math.abs(z) < rz && y < roofY;
    if (y < -0.5 || inRoom) { y = TOP; x = (Math.random() * 2 - 1) * SPAN; z = (Math.random() * 2 - 1) * SPAN; }
    if (x > SPAN) x -= SPAN * 2; else if (x < -SPAN) x += SPAN * 2;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
}

/* ============================================================
   화면 날씨 오버레이 — 유리에 흘러내리는 빗방울 & 서리/눈꽃 (v1.9)
============================================================ */
const fxCanvas = document.getElementById('fx');
const fxg = fxCanvas.getContext('2d');
let fxW = 0, fxH = 0, fxFrost = 0, fxRainAcc = 0;
const fxDrops = [];
const fxFlakes = (() => {
  // 서리 눈꽃 결정: 화면 가장자리에 고정 배치 (시야 중앙은 비워둔다)
  const rand = seededRand(77);
  const fl = [];
  for (let i = 0; i < 18; i++) {
    const edge = Math.floor(rand() * 4);
    const a = rand(), b = Math.pow(rand(), 2.2) * 0.2;
    let x, y;
    if (edge === 0) { x = a; y = b; } else if (edge === 1) { x = a; y = 1 - b; }
    else if (edge === 2) { x = b; y = a; } else { x = 1 - b; y = a; }
    fl.push({ x, y, r: 13 + rand() * 26, rot: rand() * Math.PI, ph: rand() * Math.PI * 2 });
  }
  return fl;
})();
function resizeFx() { fxW = fxCanvas.width = innerWidth; fxH = fxCanvas.height = innerHeight; }
function drawFlake(x, y, r, rot, alpha) {
  fxg.save();
  fxg.translate(x, y); fxg.rotate(rot);
  fxg.strokeStyle = `rgba(215,232,248,${alpha.toFixed(3)})`;
  fxg.lineWidth = 1.2;
  for (let a = 0; a < 6; a++) {
    fxg.rotate(Math.PI / 3);
    fxg.beginPath();
    fxg.moveTo(0, 0); fxg.lineTo(r, 0);
    for (const f of [0.4, 0.66]) {
      fxg.moveTo(r * f, 0); fxg.lineTo(r * f + r * 0.2, r * 0.16);
      fxg.moveTo(r * f, 0); fxg.lineTo(r * f + r * 0.2, -r * 0.16);
    }
    fxg.stroke();
  }
  fxg.restore();
}
function updateScreenFx(dt, t) {
  if (!fxW) resizeFx();
  fxg.clearRect(0, 0, fxW, fxH);
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  // ── 빗방울: 화면(유리창)을 타고 흘러내린다 (폭우 전용 — 일반 비는 오버레이 없음)
  const raining = weather.type === 'storm' && !indoorSh && !titleVisible;
  if (raining && fxDrops.length < 44) {
    fxRainAcc += dt * 12;
    while (fxRainAcc > 1) {
      fxRainAcc -= 1;
      fxDrops.push({
        x: Math.random() * fxW, y: -10 - Math.random() * fxH * 0.3,
        r: 1.6 + Math.random() * 2.4, vy: 24 + Math.random() * 80,
        ph: Math.random() * 9, trail: [],
      });
    }
  }
  for (let i = fxDrops.length - 1; i >= 0; i--) {
    const d = fxDrops[i];
    d.vy += dt * 24;
    // 미끄러지다 멈칫하고 다시 흐르는 느낌
    d.y += d.vy * (0.55 + 0.45 * Math.sin(t * 1.7 + d.ph)) * dt;
    d.x += Math.sin(t * 2.2 + d.ph) * 13 * dt;
    d.trail.push([d.x, d.y]);
    if (d.trail.length > 13) d.trail.shift();
    if (d.y > fxH + 12) { fxDrops.splice(i, 1); continue; }
    fxg.strokeStyle = 'rgba(190,214,235,0.10)'; // 흘러간 자국
    fxg.lineWidth = d.r * 1.1;
    fxg.lineCap = 'round';
    fxg.beginPath();
    for (let k = 0; k < d.trail.length; k++) {
      const p = d.trail[k];
      k ? fxg.lineTo(p[0], p[1]) : fxg.moveTo(p[0], p[1]);
    }
    fxg.stroke();
    fxg.fillStyle = 'rgba(205,228,246,0.32)'; // 물방울 본체
    fxg.beginPath(); fxg.ellipse(d.x, d.y, d.r, d.r * 1.35, 0, 0, Math.PI * 2); fxg.fill();
    fxg.fillStyle = 'rgba(240,250,255,0.5)';  // 하이라이트
    fxg.beginPath(); fxg.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.3, 0, Math.PI * 2); fxg.fill();
  }
  // ── 서리: 눈 오는 날 화면 가장자리에 성에와 눈 결정이 낀다. 한파+눈이면 강도 최대
  const cold = coldSnapActive();
  const frostBase = (weather.type === 'snow' && !indoorSh && !titleVisible) ? 1 : 0;
  const frostTarget = frostBase && cold ? 1.6 : frostBase; // 한파 중엔 서리 오버레이 강화 (디렉터 승인)
  fxFrost += (frostTarget - fxFrost) * Math.min(1, dt * (frostTarget ? 0.05 : 0.1));
  if (fxFrost > 0.02) {
    const m = Math.min(fxW, fxH);
    for (const [cx, cy] of [[0, 0], [fxW, 0], [0, fxH], [fxW, fxH]]) {
      const gr = fxg.createRadialGradient(cx, cy, 0, cx, cy, m * 0.42);
      gr.addColorStop(0, `rgba(214,232,248,${(0.26 * fxFrost).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(214,232,248,0)');
      fxg.fillStyle = gr;
      fxg.fillRect(0, 0, fxW, fxH);
    }
    for (const f of fxFlakes) {
      const tw = 0.75 + 0.25 * Math.sin(t * 0.7 + f.ph);
      drawFlake(f.x * fxW, f.y * fxH, f.r * (0.6 + 0.4 * fxFrost), f.rot, 0.5 * fxFrost * tw);
    }
  }
}

/* ============================================================
   쾌적함 (기획서: Shelter 꾸미기 품질 → 실질 효과)
============================================================ */
function comfortDetail() {
  const types = new Set(items.map(i => i.defId));
  const furn = Math.min(45, items.length * 3 + types.size * 3);
  let light = 0;
  for (const it of items) {
    const L = DEFS[it.defId].light;
    if (L && it.on !== false) light += L.comfort ?? 5;
  }
  const lm = SHELTERS[state.current].perk?.lightMult || 1;
  light = Math.min(24 * lm, light * lm);
  const clean = state.cleanBy[state.current] ?? 70;
  const cleanMod = clean >= 80 ? 5 : clean >= 50 ? 0 : clean >= 20 ? -5 : -10;
  const sh = SHELTERS[state.current];
  const shelterMod = state.upkeepOk ? (sh.baseComfort || 0) : 0;
  const injuryMod = (state.injury ? -5 : 0) + ((state.hunger < 25 || state.thirst < 25) ? -5 : 0);
  // 정든 집: 한 거처에 연속으로 머물수록 아늑해진다 (하루 +1, 최대 +8) — 굳이 이주하지 않을 이유
  const settled = Math.min(8, state.stayDays || 0);
  const catMod = (state.cat && !state.catHungry) ? 6 : 0; // 고양이가 있는 집은 따뜻하다 (배고파하면 정지)
  // 현실 제약: 단열 취약(악천후 시) / 어둠(조명 필수)
  let limitMod = 0;
  if (sh.cold && (weather.type === 'rain' || weather.type === 'snow' || weather.type === 'storm') && !hasMod('insulation') && !hasMod('insulationPlus')) limitMod -= sh.cold;
  if (sh.needsLight && light <= 0) limitMod -= sh.needsLight;
  // 한파: 방어 안 된 만큼 쾌적함 페널티 (완전 방어 시 0)
  if (coldSnapNetSeverity() > 0) limitMod -= BAL.seasons.coldSnapComfortPen;
  // 온풍기(heater) 가동 시 겨울 쾌적 보너스
  let heatMod = 0;
  if (seasonOf().id === 'winter' && items.some(i => i.on !== false && DEFS[i.defId]?.appliance?.effect === 'heat')) heatMod += BAL.economy.heaterWinterComfort;
  // 1.3 스키 로지 붙박이 벽난로 — 겨울 온기 보너스 (온풍기와 별개, 유지비가 항상 켜져 있는 정점). upkeepOk일 때만.
  if (sh.hearth && seasonOf().id === 'winter' && state.upkeepOk) heatMod += BAL.highland.hearthWinterComfort;
  // 1.3 온천 개조 — cozy의 정점(온기 축 대형 가산). 계절 무관 (온천은 늘 따뜻하다).
  if (hasMod('onsen')) heatMod += BAL.highland.onsenComfort;
  // 인카운터 안정감 여운(moodBuff) — 며칠간 지속되는 일시 쾌적. 만난 뒤의 정적이 남긴 온기/불안.
  const moodMod = (state.moodBuff && state.day <= state.moodBuff.until) ? (state.moodBuff.amt || 0) : 0;
  // 돔 벙커 리워크(#36): 천장 완전 수리 + 뒷문 저장고가 갖춰지면 벙커 쾌적 가산.
  const bunkerMod = bunkerComfortBonus();
  // 테마 세트(#13): 충족한 세트 수 × +3 (분위기 축). 선언적 판정 — activeThemeSets.
  const themeMod = activeThemeSets().length * DECO_THEME_COMFORT;
  const score = THREE.MathUtils.clamp(18 + furn + light + cleanMod + shelterMod + injuryMod + limitMod + settled + catMod + heatMod + moodMod + bunkerMod + themeMod, 0, 100);
  return { furn, light, cleanMod, shelterMod, injuryMod, limitMod, settled, catMod, heatMod, moodMod, bunkerMod, themeMod, clean, score };
}
/* ── 쾌적함 4요소 분해 (#29 Living Shelter) ──
   comfortDetail()의 원본 컴포넌트를 온기/청결/안정감/분위기 4축으로 "재분류"만 한다.
   각 축 값의 합 = comfortDetail().score (기저 18 포함) — 총점 불변, 원인 로그만 추가.
   반환: { warmth, clean, security, mood, score, logs:{warmth:[],clean:[],security:[],mood:[]} } */
function comfortBreakdown() {
  const cd = comfortDetail();
  // 조명(light) 총점을 온기(열원) vs 분위기(전기)로 배분 — 합은 cd.light 그대로
  const CM = BAL.comfort;
  let lightWarmth = 0, lightMood = 0;
  const warmSrc = [], moodSrc = [];
  const lm = SHELTERS[state.current].perk?.lightMult || 1;
  // 캡(24*lm) 적용 전 원자 기여도를 축별로 나눈 뒤, cd.light와 비율 맞춰 스케일 (캡 반영)
  let rawWarm = 0, rawMood = 0;
  for (const it of items) {
    const L = DEFS[it.defId]?.light;
    if (!L || it.on === false) continue;
    const c = (L.comfort ?? 5);
    const axis = CM.lightAxis[it.defId] || CM.lightAxisDefault;
    if (axis === 'warmth') { rawWarm += c; warmSrc.push({ id: it.defId, v: c }); }
    else { rawMood += c; moodSrc.push({ id: it.defId, v: c }); }
  }
  const rawSum = rawWarm + rawMood;
  if (rawSum > 0) {
    lightWarmth = cd.light * (rawWarm / rawSum);
    lightMood = cd.light - lightWarmth; // 나머지 전부 — 반올림 오차로 합 어긋나지 않게
  }
  // limitMod(한파/단열/추위 페널티)는 온기 결핍으로 귀속, needsLight 어둠 페널티는 분위기로 분리
  const sh = SHELTERS[state.current];
  let darkPen = 0;
  if (sh.needsLight && cd.light <= 0) darkPen = -sh.needsLight;
  const warmthLimit = cd.limitMod - darkPen; // 나머지(추위/단열/한파) → 온기
  // ── 4축 합산 (합 = cd.score의 기저 18 포함) ──
  const warmth = lightWarmth + cd.heatMod + cd.catMod + warmthLimit;
  const clean = cd.cleanMod;
  // moodBuff(만남의 여운)와 벙커 수리 가산은 안정감 축으로 귀속 — 합계는 score 불변.
  const security = 18 + cd.shelterMod + cd.settled + cd.injuryMod + (cd.moodMod || 0) + (cd.bunkerMod || 0);
  const mood = cd.furn + lightMood + darkPen + (cd.themeMod || 0);
  // ── 원인 로그 (각 축 2~3줄) ──
  const logs = { warmth: [], clean: [], security: [], mood: [] };
  // 온기
  for (const s of warmSrc) logs.warmth.push({ icon: DEFS[s.id].emoji, name: LName(DEFS[s.id]), v: `+${Math.round(s.v * (rawSum ? (cd.light / rawSum) : 1))}` });
  if (cd.heatMod) logs.warmth.push({ icon: '♨️', name: t('comfort.log.heater'), v: `+${cd.heatMod}` });
  if (cd.catMod) logs.warmth.push({ icon: '🐈', name: t('comfort.log.cat'), v: `+${cd.catMod}` });
  if (warmthLimit < 0) logs.warmth.push({ icon: coldSnapNetSeverity() > 0 ? '🥶' : '❄️', name: coldSnapNetSeverity() > 0 ? t('comfort.log.coldsnap') : t('comfort.log.cold'), v: `${warmthLimit}` });
  // 청결
  if (cd.cleanMod) logs.clean.push({ icon: '🧹', name: t('comfort.log.cleanState', { n: Math.round(cd.clean) }), v: `${cd.cleanMod > 0 ? '+' : ''}${cd.cleanMod}` });
  // 안정감
  logs.security.push({ icon: '🏠', name: t('comfort.log.base'), v: '+18' });
  if (cd.shelterMod) logs.security.push({ icon: sh.emoji, name: t('comfort.log.shelter'), v: `+${cd.shelterMod}` });
  if (cd.settled) logs.security.push({ icon: '🪺', name: t('comfort.log.settled', { n: cd.settled }), v: `+${cd.settled}` });
  if (cd.injuryMod) logs.security.push({ icon: '🩹', name: t('comfort.log.injury'), v: `${cd.injuryMod}` });
  if (cd.bunkerMod) logs.security.push({ icon: '🛖', name: t('comfort.log.bunkerRoof'), v: `+${cd.bunkerMod}` });
  if (cd.moodMod) logs.security.push({ icon: cd.moodMod > 0 ? '🫧' : '💭', name: t('comfort.log.mood'), v: `${cd.moodMod > 0 ? '+' : ''}${cd.moodMod}` });
  // 분위기
  if (cd.furn) logs.mood.push({ icon: '🪑', name: t('comfort.log.furn'), v: `+${cd.furn}` });
  for (const s of moodSrc) logs.mood.push({ icon: DEFS[s.id].emoji, name: LName(DEFS[s.id]), v: `+${Math.round(s.v * (rawSum ? (cd.light / rawSum) : 1))}` });
  if (cd.themeMod) for (const ts of activeThemeSets()) logs.mood.push({ icon: ts.emoji, name: LName(ts), v: `+${DECO_THEME_COMFORT}` });
  if (darkPen) logs.mood.push({ icon: '🌑', name: t('comfort.log.dark'), v: `${darkPen}` });
  return { warmth, clean, security, mood, score: cd.score, logs };
}
// 일지 통계용: 4요소 막대 + 각 요소 원인 로그 (report-sec 문법 재사용)
function comfortBreakdownHtml() {
  const b = comfortBreakdown();
  const axes = [
    { key: 'warmth',   icon: '🔥', label: t('comfort.warmth'),   v: b.warmth,   col: '#c97a4a' },
    { key: 'clean',    icon: '🧹', label: t('comfort.clean'),    v: b.clean,    col: '#5f9ac0' },
    { key: 'security', icon: '🛡️', label: t('comfort.security'), v: b.security, col: '#8fbb7a' },
    { key: 'mood',     icon: '🕯️', label: t('comfort.mood'),     v: b.mood,     col: '#c79a5f' },
  ];
  // 막대 스케일: 각 축 최대 기여 폭을 40점 기준으로 정규화 (음수는 0폭, 색만 경고)
  const rows = axes.map(a => {
    const pct = Math.max(0, Math.min(100, (a.v / 40) * 100));
    const logs = (b.logs[a.key] || []).slice(0, 3).map(l =>
      `<div style="font-size:10px;color:var(--text-dim);line-height:1.6">${l.icon} ${l.name} <span style="color:${String(l.v).startsWith('-') ? 'var(--bad)' : 'var(--good)'}">${l.v}</span></div>`).join('');
    return `<div style="margin:7px 0">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span>${a.icon} ${a.label}</span><span style="color:${a.v < 0 ? 'var(--bad)' : 'var(--accent)'}">${a.v < 0 ? '' : '+'}${Math.round(a.v)}</span></div>
      <div style="height:8px;background:#22252d;border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${a.col};border-radius:4px"></div></div>
      ${logs}
    </div>`;
  }).join('');
  return `<div class="report-sec"><span class="r-title">${t('comfort.breakdownTitle', { score: b.score })}</span>${rows}</div>`;
}
// 돔 벙커 리워크(#36): 천장 완전 수리(+4) + 절단기 뒷문 저장고(+4). 벙커에서만 유효.
function bunkerComfortBonus() {
  if (state.current !== 'bunker') return 0;
  let b = 0;
  if (state.bunkerRoof === 'full') b += BAL.economy.bunkerRoofComfort;
  if (state.bunkerBackdoor) b += BAL.economy.bunkerStorageComfort;
  return b;
}
// 인카운터 안정감 여운 — amt(±) 를 days 일간 부여. 같은 부호면 이어붙이지 않고 더 강한 쪽/새 것으로 갱신.
function addMoodBuff(amt, days = 3) {
  state.moodBuff = { amt, until: state.day + days };
}
function comfortLevel() { return Math.min(5, Math.round(comfortDetail().score / 20)); }
// 기획서 쾌적함 티어: 50+ → +3%, 75+ → +6%, 90+ → +10%
function comfortExpBonus() {
  const s = comfortDetail().score;
  const base = s >= 90 ? 0.10 : s >= 75 ? 0.06 : s >= 50 ? 0.03 : 0;
  return base * (SHELTERS[state.current].perk?.cozyMult || 1);
}
// 쾌적함이 높으면 부상 회복도 빨라짐
function recoveryMult() {
  const s = comfortDetail().score;
  return s >= 90 ? 0.8 : s >= 75 ? 0.9 : 1;
}
function rateParts(regionId, prep = []) {
  const r = REGIONS[regionId];
  const sh = SHELTERS[state.current];
  const comfort = comfortExpBonus();
  const shelter = state.upkeepOk ? (sh.perk?.expBonus || 0) : 0; // 유지비 미납 시 특성 정지
  const district = DISTRICTS[districtOf(state.current)].regionBonus?.[regionId] || 0;
  let weatherPen = WEATHERS[weather.type].penalty || 0;
  if (prep.includes('raincoat')) weatherPen *= 0.3;
  let gear = 0;
  for (const p of prep) {
    const b = PREPS[p].bonus;
    if (b && b[regionId]) gear += b[regionId];
  }
  const injuryPen = state.injury ? INJURIES[state.injury.type].pen : 0;
  const hungryPen = (state.hunger < BAL.exp.hungryPenGate || state.thirst < BAL.exp.hungryPenGate) ? BAL.exp.hungryPen : 0; // 허기/갈증
  const buff = state.buff?.exp || 0; // 인카운터 버프/디버프
  const coldPen = coldSnapNetSeverity() > 0 ? BAL.seasons.coldSnapExpPen : 0; // 한파: 탐험 성공률 -10%p (방어 시 0)
  // 1.3 눈사태 위험 우회로: 이번 리조트 출발이 우회로면 성공률 -15%p (보상 1.5배는 정산에서). GD 준수.
  const avalanchePen = (state._avalancheDetour && regionId === 'resort') ? BAL.highland.avalancheDetourRatePen : 0;
  const eff = THREE.MathUtils.clamp(r.rate + comfort + shelter + district + gear + buff - weatherPen - injuryPen - hungryPen - coldPen - avalanchePen, 0.05, 0.95);
  return { base: r.rate, comfort, shelter, district, gear, buff, weatherPen, injuryPen, hungryPen, coldPen, avalanchePen, eff };
}

/* ============================================================
   환경 조각 빌더 (아포칼립스 소품)
============================================================ */
function pineGeo(rand, s, dark) {
  const trunkC = dark ? 0x2a2119 : 0x4a3826;
  const leafC = dark ? 0x1d2b26 : (rand() > 0.5 ? 0x2e4034 : 0x35493a);
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.7 * s, 6);
  trunk.translate(0, 0.35 * s, 0);
  parts.push(paintGeo(trunk, trunkC));
  for (const [ry, rr, hh] of [[1.15, 0.72, 1.3], [1.85, 0.55, 1.1], [2.45, 0.36, 0.9]]) {
    const c = new THREE.ConeGeometry(rr * s, hh * s, 7);
    c.translate(0, ry * s, 0);
    parts.push(paintGeo(c, leafC));
  }
  return mergeGeometries(parts);
}
function deadTreeGeo(rand, s, c = 0x3a332c) {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.06 * s, 0.14 * s, 2.2 * s, 5);
  trunk.translate(0, 1.1 * s, 0);
  parts.push(paintGeo(trunk, c));
  for (let i = 0; i < 3; i++) {
    const br = new THREE.CylinderGeometry(0.015 * s, 0.05 * s, (0.7 + rand() * 0.5) * s, 4);
    br.translate(0, (0.35 + rand() * 0.2) * s, 0);
    br.rotateZ(0.6 + rand() * 0.7);
    br.rotateY(rand() * Math.PI * 2);
    br.translate(0, (1.1 + rand() * 0.8) * s, 0);
    parts.push(paintGeo(br, shade(c, 0.85)));
  }
  return mergeGeometries(parts);
}
function buildCarWreck(parent, x, z, rotY, rand, groundY = 0) {
  const g = new THREE.Group();
  const body = 0x5f4a3a, rust = 0x6e3e28, dark = 0x2a2622;
  B(g, 2.6, 0.5, 1.2, body, 0, 0.55, 0);
  B(g, 1.4, 0.45, 1.1, shade(body, 0.85), -0.15, 1.0, 0);
  B(g, 0.5, 0.2, 1.15, rust, 1.0, 0.62, 0);      // 녹슨 본닛
  B(g, 0.4, 0.28, 1.0, dark, -0.15, 1.0, 0.06);  // 깨진 창
  const wheel = (wx, wz, missing) => {
    if (missing) { B(g, 0.3, 0.12, 0.3, dark, wx, 0.12, wz); return; }
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 8), lamb(0x24211e));
    m.rotation.x = Math.PI / 2; m.position.set(wx, 0.28, wz);
    m.castShadow = true; g.add(m);
  };
  wheel(0.85, 0.62); wheel(-0.85, 0.62); wheel(0.85, -0.62, true); wheel(-0.85, -0.62);
  g.rotation.y = rotY;
  g.rotation.z = 0.03;
  g.position.set(x, groundY, z); // P2-c: 지형 높이에 접지 (컨테이너 폐차 부양 수정)
  parent.add(g);
  wlBlock(x, z, 1.5); // #95: 동물 우회 대상 (차체 2.6×1.2 외접원 — 전 호출처가 buildEnv라 자기등록)
}
function buildPowerPole(parent, x, z, tilt, groundY) {
  const g = new THREE.Group();
  Cyl(g, 0.07, 0.1, 5.4, 0x3d362e, 0, 2.7, 0, 6);
  B(g, 1.5, 0.08, 0.08, 0x3d362e, 0, 4.9, 0);
  B(g, 0.06, 0.14, 0.06, 0x55504a, -0.6, 5.0, 0); B(g, 0.06, 0.14, 0.06, 0x55504a, 0.6, 5.0, 0);
  g.rotation.z = tilt;
  g.position.set(x, groundY, z);
  parent.add(g);
  wlBlock(x, z, 0.3); // #95: 동물 우회 대상 (기둥 밑동)
  if (ogReg) ogReg.poles.push({ x, z, groundY, tilt }); // #71: 전신주 덩굴 감김 대상 등록(전 호출처가 buildEnv)
}
function buildRuinCity(parent, rand, opt) {
  // 폐허 빌딩(개별 그룹) — 무너진 상층부 + 드문 불빛. 반환값으로 시야 컬링 가능.
  const list = [];
  for (let i = 0; i < opt.count; i++) {
    const a = rand() * Math.PI * 2;
    const r = opt.rMin + rand() * (opt.rMax - opt.rMin);
    const bw = 4 + rand() * 8, bd = 4 + rand() * 8, bh = opt.hMin + rand() * (opt.hMax - opt.hMin);
    const x = r * Math.cos(a), z = r * Math.sin(a);
    const col = [0x252a36, 0x2b303c, 0x20242e][Math.floor(rand() * 3)];
    const g = new THREE.Group();
    const geos = [paintGeo(new THREE.BoxGeometry(bw, bh, bd), col)];
    geos[0].translate(0, bh / 2, 0);
    if (rand() > 0.45) { // 무너진 상층부
      const g2 = paintGeo(new THREE.BoxGeometry(bw * (0.4 + rand() * 0.3), bh * 0.25, bd * 0.5), shade(col, 0.8));
      g2.translate((rand() - 0.5) * bw * 0.3, bh + bh * 0.12, 0);
      geos.push(g2);
    }
    g.add(new THREE.Mesh(mergeGeometries(geos), vcLambert));
    if (rand() < opt.litChance) { // 살아있는 불빛
      const winGeos = [];
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const wg = new THREE.BoxGeometry(0.55, 0.75, 0.55);
        wg.translate((rand() - 0.5) * (bw - 1), 1.5 + rand() * (bh - 2.5), (rand() - 0.5) * (bd - 1));
        winGeos.push(wg);
      }
      g.add(new THREE.Mesh(mergeGeometries(winGeos), new THREE.MeshBasicMaterial({ color: 0xd9b06a })));
    }
    g.position.set(x, opt.baseY, z);
    parent.add(g);
    list.push({ obj: g, dir: new THREE.Vector2(x, z).normalize(), r });
    // #71: 폐허 빌딩 벽면 = 담쟁이/이끼 패치 대상 등록. dynCull(옥탑 근경처럼 envDyn.buildings로
    //   시야 컬링되는 호출)은 그룹 참조를 함께 남겨 패치를 그룹 자식으로 부착(빌딩과 함께 사라지도록).
    //   ogSkip: 바다 셸터(등대)처럼 '건물 잠식 대신 암반 이끼 소량' 규칙인 호출처가 명시적으로 제외.
    if (ogReg && !opt.ogSkip) ogReg.bldg.push({ x, z, w: bw, d: bd, h: bh, baseY: opt.baseY, per: opt.ogPer ?? 1, group: g, dyn: !!opt.dynCull });
  }
  return list;
}

/* ============================================================
   셸터 정의 (컨테이너 → 옥상 캠프 → 숲속 오두막)
============================================================ */
let ROOM = { w: 6.4, d: 2.9, h: 2.4 };
let wallList = [];      // { group, normal }
let ceilCullList = [];  // { group, y } — 실내를 덮는 천장/지붕. 카메라가 천장보다 높은(부감) 각도면 숨겨 실내를 보이게 한다 (⑥-a, 전 셸터 공통).
let blockers = [];      // 고정 소품 충돌 영역 { x, z, w, d }
let envDyn = {};        // 환경별 동적 요소
let bunkerStairsObj = null; // #55: 벙커 하강 계단 상호작용 히트 대상 (없으면 null)

const roomGroup = new THREE.Group(); scene.add(roomGroup);
const envRoot = new THREE.Group(); scene.add(envRoot);

// 벽/바닥 재질: Phong으로 생성 — applyWetness()가 젖었을 때 specular/shininess를 올려
// 빛을 반사하는 재질감을 낸다 (Lambert는 specular가 없어 이 표현이 불가능).
function wallPhong(opts = {}) {
  return new THREE.MeshPhongMaterial({ shininess: 4, specular: 0x000000, ...opts });
}
// B()의 Phong 버전 — lamb() 헬퍼(Lambert)만 쓰는 벽 패널(예: 버스)을 위해
function BP(parent, w, h, d, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallPhong({ color: c }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
// ── 꾸미기(#13) 명시 태깅 시스템 (B-①) ──
//   휴리스틱(넓고 얇은 박스=바닥, stdWall 재질=벽)만으로는 커스텀 지오메트리 셸터에서 벽지/바닥재가 조용히
//   안 먹는 먹튀 버그가 났다(버스/벙커/온실/여객선/등대/지하철). 각 셸터 buildRoom이 벽 재질·바닥 메시를
//   직접 태깅하고, applyDeco는 "명시 태그 우선, 없으면 기존 휴리스틱 폴백"으로 찾는다.
// 벽지 대상 재질 태깅 — stdWall 안/밖 어디서든 호출 가능. baseMap(원본 map) 1회 스냅.
function tagDecoWall(mat) {
  if (mat && mat.userData) { mat.userData.isWallMat = true; if (!('baseMap' in mat.userData)) mat.userData.baseMap = mat.map || null; }
  return mat;
}
// 바닥재 대상 메시 태깅 — 지오메트리가 휴리스틱(넓고 얇은 수평 박스)에 안 걸리는 좁은/특수 바닥용.
function tagDecoFloor(mesh) {
  if (mesh) mesh.userData.isDecoFloor = true;
  return mesh;
}
function stdWall(len, h, mat, opts = {}) {
  const g = new THREE.Group();
  const t = 0.22;
  // 꾸미기(#13): 벽지 교체 대상 재질 태깅. 공유 재질이라 셸터당 1회만 표시하면 충분.
  tagDecoWall(mat);
  if (!opts.window) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), mat);
    m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
    g.add(m);
  } else {
    const { winW, winH, winY, winX } = opts.window;
    const L = winX - winW / 2 + len / 2, R = len / 2 - (winX + winW / 2);
    const mk = (w, hh, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, t), mat);
      m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; g.add(m);
    };
    mk(L, h, -len / 2 + L / 2, h / 2);
    mk(R, h, len / 2 - R / 2, h / 2);
    mk(winW, winY - winH / 2, winX, (winY - winH / 2) / 2);
    mk(winW, h - (winY + winH / 2), winX, (h + winY + winH / 2) / 2);
    const frameMat = lamb(opts.frameColor ?? 0x5d4a30);
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.14, 0.1, t + 0.06), frameMat);
    f1.position.set(winX, winY - winH / 2, 0); g.add(f1);
    const f2 = f1.clone(); f2.position.y = winY + winH / 2; g.add(f2);
    const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, winH + 0.1, t + 0.06), frameMat);
    f3.position.set(winX - winW / 2, winY, 0); g.add(f3);
    const f4 = f3.clone(); f4.position.x = winX + winW / 2; g.add(f4);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshBasicMaterial({ color: opts.skyColor ?? 0x36435c }));
    // 창밖 하늘은 시간대에 따라 밝아져야 한다 (낮인데 창이 깜깜하면 뒤집힌 느낌)
    sky.material.userData.baseHex = opts.skyColor ?? 0x36435c;
    sky.material.userData.cullFadeSkip = true; // ① 외부(winSkyMats)에서 추적하는 재질 — 클론 금지
    winSkyMats.push(sky.material);
    sky.position.set(winX, winY, -0.02);
    g.add(sky);
    // ③ 한파 성에 오버레이 — 창유리 안쪽(방 방향 +z) 살짝 앞에 창 크기 평면. 기본 투명(opacity 0),
    //   updateEnvironment가 무방비 한파일 때만 서서히 드러낸다. cullFadeSkip: winFrostMats로 별도 추적.
    const frost = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshBasicMaterial({ map: frostTex(), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    frost.material.userData.cullFadeSkip = true;
    frost.position.set(winX, winY, 0.03); // 유리(-0.02)보다 방 안쪽으로 — 실내에서 보이게
    frost.visible = false;
    g.add(frost);
    winFrostMats.push(frost);
    // 창가 빛기둥 (TLOU 무드): 창 상단에서 방(+z) 안쪽 바닥으로 떨어지는 산란광.
    // 단일 사각 시트는 유리판처럼 보인다(유저 신고) — 사다리꼴 확산 + 3겹 헤이즈 + 착지광으로.
    const x1 = winX - winW / 2, x2 = winX + winW / 2;
    const cx = winX, yT = winY + winH / 2;
    const zL = yT * 1.05; // 바닥 착지 깊이 ≈ 45° 남짓
    // 겹: [폭 배율, 착지 확산 배율, 투명도 배율, z 오프셋] — 본체 + 넓고 옅은 반그림자 + 중간 겹
    const LAYERS = [[1.0, 1.35, 1.0, 0], [1.25, 1.8, 0.45, 0.05], [0.7, 1.0, 0.7, -0.03]];
    for (const [wTop, wBot, opMul, zOff] of LAYERS) {
      const hw1 = (winW / 2) * wTop, hw2 = (winW / 2) * wBot; // 바닥에서 퍼진다
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        cx - hw1, yT, 0.13 + zOff, cx + hw1, yT, 0.13 + zOff,
        cx - hw2, 0.03, zL + zOff, cx + hw2, 0.03, zL + zOff,
      ]), 3));
      bg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
      bg.setIndex([0, 2, 1, 2, 3, 1]);
      const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({
        map: beamTex(), color: 0xffedc4, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      beam.visible = false;
      beam.userData.opMul = opMul;
      beam.material.userData.cullFadeSkip = true; // ① sunShafts에서 추적 — 클론 금지
      g.add(beam);
      sunShafts.push(beam);
    }
    // 착지광: 빛이 뚝 끊기는 대신 바닥에 부드러운 웅덩이로 풀어진다
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(winW * 1.9, winW * 1.15), new THREE.MeshBasicMaterial({
      map: floorGlowTex(), color: 0xffe6b8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, 0.025, zL * 0.82);
    pool.visible = false;
    pool.userData.opMul = 0.8;
    pool.material.userData.cullFadeSkip = true; // ① sunShafts에서 추적 — 클론 금지
    g.add(pool);
    sunShafts.push(pool);
    // 빛기둥 속 먼지 입자 20개 — 프리즘 내부에 고정 분포, 렌더 루프에서 느리게 부유
    const N = 20, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random(), v = Math.random();
      pos[i * 3] = x1 + (x2 - x1) * u;
      pos[i * 3 + 1] = 0.05 + (yT - 0.05) * (1 - v);
      pos[i * 3 + 2] = 0.13 + (zL - 0.13) * v + (Math.random() - 0.5) * 0.1;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0xfff3d6, size: 0.05, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    motes.visible = false;
    motes.userData.phase = Math.random() * Math.PI * 2;
    g.add(motes);
    sunMotes.push(motes);
  }
  return g;
}
function addRoofGrass(wallGroup, len, h, seed) {
  const rand = seededRand(seed);
  const palette = [0x6a7f4a, 0x8a8a4f, 0xa3703f, 0x7d5a3a, 0x5f7a45, 0x96633c];
  const geos = [];
  let x = -len / 2 + 0.1;
  while (x < len / 2 - 0.1) {
    const gh = 0.14 + rand() * 0.3;
    const g = new THREE.ConeGeometry(0.05 + rand() * 0.09, gh, 5);
    g.rotateZ((rand() - 0.5) * 0.35);
    g.translate(x, h + gh / 2 - 0.03, (rand() - 0.5) * 0.16);
    paintGeo(g, palette[Math.floor(rand() * palette.length)]);
    geos.push(g);
    x += 0.14 + rand() * 0.18;
  }
  wallGroup.add(new THREE.Mesh(mergeGeometries(geos), vcLambert));
}
// 날씨-구조물 상호작용 요소 (벽 위 적설 캡) — loadShelter마다 재생성
// (빗물 표현은 파티클 대신 applyWetness()의 반사 재질(Phong specular)로 대체됨)
const weatherFx = { caps: [] };
const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xe9f2fa, transparent: true, opacity: 0.96 });
snowCapMat.userData.noWet = true;
snowCapMat.userData.shared = true; // loadShelter의 disposeDeep에서 살아남아야 함
// v1.5.2(디렉터 T자 신고): cullFadeSkip 해제 — 벽이 페이드로 열릴 때 캡(순백 판)만 남아
//   'T자 크로스바'로 읽히던 잔상의 한 축. 표준 경로(그룹별 클론)로 벽과 함께 페이드된다.
//   캡 가시성(snowCover)은 mesh.visible이라 재질 클론과 무관 — 기존 눈 두께 제어 불변.
function addWallWeatherFx(wallGroup) {
  // v1.5.2(디렉터 신고 — 돔 '1자 바'): 상단이 수평 직선인 벽에만 캡이 성립한다. 곡면 밴드/반달 파사드는
  //   bb 상단에 일자 캡이 공중 부유(벙커에서 y4.3~7.0 흰 바 3개 실측) — noWeatherCap 표식 벽은 생략.
  if (wallGroup.userData.noWeatherCap) return;
  const bb = new THREE.Box3().setFromObject(wallGroup);
  const len = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  if (len < 0.5 || h < 0.5) return;
  // 눈: 벽 상단에 쌓이는 캡 (snowCover에 따라 두께가 자란다)
  // 폭 0.4→0.26 (v1.5.2): 벽 두께(0.22대)에 밀착 — 벽보다 두 배 넓은 순백 판이 'T자 선반'으로 읽히던 과장 제거.
  const capGeo = new THREE.BoxGeometry(len * 0.98, 0.17, 0.26);
  capGeo.translate(0, 0.085, 0);
  const cap = new THREE.Mesh(capGeo, snowCapMat);
  cap.position.y = h - 0.02;
  cap.castShadow = false; cap.visible = false;
  wallGroup.add(cap);
  weatherFx.caps.push(cap);
}
/* ── #96 젖은 도시 (디렉터 GTA 레퍼런스): 웅덩이 + 광원 반사 스트릭 ──
   비(wetness)가 오르면 마당 평지에 웅덩이가 배고, 창문 온광이 젖은 땅에 시선축으로 길게 번진다.
   레퍼런스의 핵심은 웅덩이보다 '광원의 세로 번짐 반사' — 스트릭은 매 프레임 카메라 요를 따라 눕는다.
   전부 envRoot 자식(셸터 언로드 시 자동 해체), 지연 구축(첫 젖음에 1회), lowSpec 웅덩이 절반. */
let wetFxBuilt = false;
const wetGlintAnchors = []; // {x,z,color,w,len} — loadShelter 리셋. 셸터별 특수 광원 등록 여지(2차: 부표/페리 창 등)
function wetGlint(x, z, color, w = 0.7, len = 2.8) { wetGlintAnchors.push({ x, z, color, w, len }); }
let _puddleTexes = null, _glintTex = null;
function puddleTexOf(i) {
  if (!_puddleTexes) {
    _puddleTexes = [0, 1, 2].map(seed => makeCanvasTex((g2, w) => {
      g2.clearRect(0, 0, w, w);
      const rand = seededRand(31 + seed);
      // 불규칙 웅덩이: 원 4~5개 합집합 알파 (픽셀 결)
      g2.fillStyle = 'rgba(255,255,255,0.92)';
      for (let k = 0; k < 5; k++) {
        const cx = w * (0.32 + rand() * 0.36), cy = w * (0.32 + rand() * 0.36), r = w * (0.14 + rand() * 0.16);
        g2.beginPath(); g2.arc(cx, cy, r, 0, 7); g2.fill();
      }
    }, 48, 48));
    for (const t of _puddleTexes) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }
  return _puddleTexes[i % 3];
}
function glintTexOnce() {
  if (_glintTex) return _glintTex;
  _glintTex = makeCanvasTex((g2, w) => {
    g2.clearRect(0, 0, w, w);
    const gr = g2.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, w, w);
  }, 32, 32);
  return _glintTex;
}
function buildWetFx() {
  wetFxBuilt = true;
  weatherFx.puddles = []; weatherFx.glints = [];
  if (SHELTERS[state.current]?.indoor) return;
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const groundAt = (x, z, nMin) => {
    ray.set(new THREE.Vector3(x, 9, z), down);
    return ray.intersectObjects(envRoot.children, true).find(h => h.face && h.face.normal.y > nMin && h.point.y > -2.2 && h.point.y < 1.6);
  };
  // 웅덩이: 평지(법선 상향) 레이 샘플 — 지형 함수 비노출이라 float-audit 레이 문법 재사용
  const srand = seededRand(97);
  const want = opts.lowSpec ? 4 : 8;
  for (let k = 0, placed = 0; k < 44 && placed < want; k++) {
    const a = srand() * Math.PI * 2, r = 2.6 + srand() * 5.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = groundAt(x, z, 0.94);
    if (!h) continue;
    const size = 0.5 + srand() * 0.75;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * (1.1 + srand() * 0.7), size),
      new THREE.MeshPhongMaterial({ map: puddleTexOf(placed), transparent: true, opacity: 0,
        color: 0x141d28, specular: 0x9aacc0, shininess: 110, depthWrite: false }));
    m.material.userData.noWet = true; m.material.userData.cullFadeSkip = true;
    m.rotation.x = -Math.PI / 2; m.rotation.z = srand() * Math.PI;
    m.position.set(h.point.x, h.point.y + 0.015, h.point.z);
    m.renderOrder = 2; m.visible = false;
    envRoot.add(m); weatherFx.puddles.push(m);
    placed++; // 상한 카운트 — 누락 시 성공 레이 전부(44) 설치돼 늪이 된다(프로브 실측 검거)
  }
  // 광원 스트릭: 등록 앵커. 등록이 없으면 기본 1점 = 창문벽(-z) 바깥 온광 스필.
  if (!wetGlintAnchors.length) wetGlint(0, -ROOM.d / 2 - 1.6, 0xffc070);
  for (const g of wetGlintAnchors) {
    const h = groundAt(g.x, g.z, 0.8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(g.w, g.len),
      new THREE.MeshBasicMaterial({ map: glintTexOnce(), transparent: true, opacity: 0, color: g.color,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.material.userData.noWet = true; m.material.userData.cullFadeSkip = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(g.x, (h ? h.point.y : 0) + 0.02, g.z);
    m.renderOrder = 3; m.visible = false;
    envRoot.add(m); weatherFx.glints.push(m);
  }
}

// #97 섀도 프록시 재질(공유): 색은 안 그리고(colorWrite off) 그림자 패스에만 참여 — "보이지 않는 차광판"
const shadowProxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
shadowProxyMat.userData.shared = true;
shadowProxyMat.userData.cullFadeSkip = true;
shadowProxyMat.userData.noWet = true;
function makeWalls(defs) {
  wallList = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    addWallWeatherFx(d.group); // 회전 전(로컬 좌표)에 치수 측정
    // #97 (디렉터: "벽 투명화되며 빛이 샌다"): 컬링으로 숨은 벽도 그림자는 계속 드리워야 한다.
    //   숨은 벽 자리에 화면 비가시 슬래브(프록시)를 켜서 광차단을 대행 — 실내광 유출/외광 유입 봉쇄.
    //   곡면 벽(noWeatherCap: 벙커 밴드·파사드)은 bb 슬래브가 형상과 틀려 제외(눈 캡과 같은 판정).
    let proxy = null;
    if (!d.group.userData.noWeatherCap) {
      const bb = new THREE.Box3().setFromObject(d.group);
      const len = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
      if (len > 0.5 && h > 0.5) {
        proxy = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.16), shadowProxyMat);
        proxy.position.set(d.pos[0], d.pos[1] + bb.min.y + h / 2, d.pos[2]);
        proxy.rotation.y = d.rotY;
        proxy.castShadow = true; proxy.receiveShadow = false;
        proxy.visible = false;          // 벽이 보일 땐 벽이 직접 그림자 — 프록시는 숨을 때만
        proxy.raycast = () => {};       // 클릭/피킹 무간섭
        roomGroup.add(proxy);
      }
    }
    d.group.position.set(...d.pos);
    d.group.rotation.y = d.rotY;
    roomGroup.add(d.group);
    wallList.push({ group: d.group, normal: d.normal, proxy });
  }
}
// ⑤ 벽 부착 소품 컬링 동기화: 벽 평면에 덧댄 패치/판자/방수포/브레이스/스텐실 등을,
//   해당 방향 벽 그룹의 자식으로 흡수해 벽과 함께 컬링·페이드된다(허공 부유 방지).
//   normalDir: 벽 바깥 법선(±1축). objs: roomGroup(또는 상위)에 이미 붙은 Mesh/Group 들.
//   attach()로 월드 변환을 보존하며 재부모화하므로 좌표 재계산 불필요.
//   외벽 실외 부착물(SHELTER_MOUNTS: 태양광/빗물받이/부표 등)은 이 함수로 넘기지 않는다(실외라 컬링 대상 아님).
function attachToWall(nx, ny, nz, ...objs) {
  const w = wallList.find(w => Math.abs(w.normal.x - nx) < 0.01 && Math.abs(w.normal.y - ny) < 0.01 && Math.abs(w.normal.z - nz) < 0.01);
  if (!w) return;
  for (const o of objs) if (o && o.parent !== w.group) w.group.attach(o); // 월드 변환 보존 재부모화
}
// #87: 지붕 거치 소품(태양광 등)을 천장 컬링/페이드 단위에 편입 — 부감에서 지붕이 사라질 때
//   패널+브래킷이 실내 위 허공에 남던 실기기 신고의 교정. 근접 높이의 지붕 그룹이 없으면(개방 갑판 조타실 등,
//   컬링 자체가 없는 지붕) 그대로 둔다 — 그 지붕은 사라지지 않으므로 소품도 남는 게 맞다.
function attachToRoofCull(y, ...objs) {
  let best = null;
  for (const rf of ceilCullList) if (!best || Math.abs(rf.y - y) < Math.abs(best.y - y)) best = rf;
  if (!best || Math.abs(best.y - y) > 1.2) return;
  for (const o of objs) if (o && o.parent !== best.group) best.group.attach(o);
}
// ⑥-a (전 셸터 공통): 실내를 덮는 천장/지붕을 컬링 목록에 등록한다. obj는 이미 씬에 붙은 Mesh/Group.
//   y = 천장 대략 높이(카메라가 이보다 확실히 위에 있으면=부감 → 숨김). 셸터별 buildRoom에서 천장 메시 생성 직후 호출.
//   (ARC: 셸터별 복붙 컬링 로직 없이, 태그만 붙이면 updateWallCulling의 공통 루프가 일괄 처리)
function tagCeiling(obj, y) {
  if (obj) ceilCullList.push({ group: obj, y });
  return obj;
}
// F-1a [B]: 흔들리는 천 — 기존 방수포/천 소품에 미세 sway(신규 소품 금지). buildRoom/buildEnv에서 태그,
//   tickEnv가 바람세기(windLevel)에 비례해 base 회전 주변으로 살랑인다. loadShelter가 목록 초기화.
let swayProps = [];
function tagSway(mesh, baseZ = 0, amp = 0.05) {
  if (mesh) swayProps.push({ mesh, baseZ, amp, phase: Math.random() * Math.PI * 2 });
  return mesh;
}
// #95 야생동물 장애물 등록부 (디렉터: "동물이 오브젝트를 통과하면 짜침"): buildEnv의 근접 대형 소품을
//   원기둥 {x,z,r}로 등록 → wildlife가 목표 재추첨 + 이동 스티어링으로 우회한다. 씬 트래버스 금지 원칙(ogReg 선례).
//   등록 범위 = 로밍 밴드+퇴장 경로가 닿는 r<12 근방만. loadShelter가 buildEnv 직전 초기화.
let wlObstacles = [];
function wlBlock(x, z, r) { wlObstacles.push({ x, z, r }); }
function groundPlane(colFn, hFn, size = 300, seg = 52) {
  const gGeo = new THREE.PlaneGeometry(size, size, seg, seg);
  gGeo.rotateX(-Math.PI / 2);
  const pos = gGeo.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, hFn(x, z));
    const c = colFn(x, z);
    colors.push(c.r, c.g, c.b);
  }
  gGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, vcLambert);
  ground.receiveShadow = true;
  return ground;
}

const SHELTERS = {
  container: {
    name: '버려진 컨테이너', nameEn: 'Abandoned Container', emoji: '📦', unlockAt: 0, viewH: 14, ceilY: 2.1,
    desc: '황무지 한가운데 버려진 화물 컨테이너. 좁지만 비바람은 막아준다.',
    descEn: 'A cargo container abandoned in the middle of the wasteland. Cramped, but it keeps out the wind and rain.',
    baseComfort: 2,
    cold: 8, limits: '🥶 얇은 철판 — 비/눈 오는 날 쾌적함 -8', limitsEn: '🥶 Thin steel — comfort -8 on rainy/snowy days',
    weatherPool: ['clear', 'ash', 'ash', 'snow'],
    perk: { expBonus: 0.05, label: '🧭 길목의 거점 — 탐험 성공률 +5%p', labelEn: '🧭 Crossroads outpost — expedition success +5%p' },
    room: { w: 6.4, d: 2.9, h: 2.4 },
    mood: { fog: 0x2e2820, fogNear: 20, fogFar: 52, skyH: 0x453a2d, skyZ: 0x15161e, hemiSky: 0x8a8272, hemiGround: 0x4c443a, hemiInt: 0.72, moonC: 0xc9c0a8, moonInt: 0.68, stars: 0.5 },
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ map: plywoodTex }));
      floor.material.color.setHex(0xffffff);
      floor.position.y = -0.125; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor);
      // 받침 블록
      for (const [bx, bz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]])
        B(roomGroup, 0.6, 0.5, 0.6, 0x4c4a46, bx, -0.5, bz);
      const wallMat = wallPhong({ map: metalTex });
      wallMat.userData.shared = true;
      const mk = (len, opts) => stdWall(len, h, wallMat, opts);
      makeWalls([
        { group: mk(w, { window: { winW: 1.2, winH: 0.8, winY: 1.3, winX: -0.8 }, frameColor: 0x4a4640, skyColor: 0x3d3527 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mk(d), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 외형 개성화 (#18): 지붕 방수포 + 고정 로프 + 문짝 스텐실 — 밋밋한 철제 박스 실루엣 깨기
      {
        const crand = seededRand(77);
        // 지붕 위 접힌 방수포 (한쪽으로 쏠려 늘어짐) — 실내를 덮으므로 천장 컬링 그룹에 묶는다(⑥-a).
        const roofG = new THREE.Group();
        const tarp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.05, d + 0.5), lamb(0x4a5560));
        tarp.position.set(-w * 0.12, h + 0.03, 0.1); tarp.rotation.z = 0.03; tarp.castShadow = true;
        roofG.add(tarp);
        const tarp2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.06, d + 0.6), lamb(0x3f4954));
        tarp2.position.set(-w * 0.32, h + 0.06, 0); tarp2.rotation.z = 0.16; tarp2.castShadow = true; // 접힌 자락
        tagSway(tarp2, 0.16); // F-1a [B]: 늘어진 방수포 자락 미세 sway (있는 소품만)
        roofG.add(tarp2);
        tagCeiling(roofG, h + 0.02); roomGroup.add(roofG);
        // ⑤ 아래 부착물은 전부 +z(뒷벽) 바깥면 소품 → +z 벽 컬링과 동기화 (허공 부유 방지).
        const wallProps = [];
        // 고정 로프 (지붕 → 처마)
        for (const sx of [-w * 0.28, w * 0.05, w * 0.24]) { const rope = Cyl(roomGroup, 0.015, 0.015, 0.5, 0x2a2620, sx, h - 0.1, d / 2 + 0.08, 4); rope.rotation.x = 0.4; wallProps.push(rope); }
        // 문짝 스텐실 (뒷벽 +z 바깥면에 페인트 번호판)
        wallProps.push(B(roomGroup, 0.5, 0.34, 0.02, 0xb8a24a, w * 0.22, 1.5, d / 2 + 0.12));
        wallProps.push(B(roomGroup, 0.42, 0.26, 0.03, 0x2a2b26, w * 0.22, 1.5, d / 2 + 0.13));
        // 녹 얼룩 몇 점
        for (let i = 0; i < 3; i++) wallProps.push(B(roomGroup, 0.16 + crand() * 0.2, 0.4 + crand() * 0.5, 0.02, 0x6e3e28, -w / 2 + crand() * w, 0.8 + crand() * 1.0, d / 2 + 0.115));
        attachToWall(0, 0, 1, ...wallProps); // +z 뒷벽에 흡수
      }
      blockers = [];
    },
    buildEnv() {
      const GY = -0.75;
      const rand = seededRand(310);
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 0.7 * Math.sin(x * 0.13 + 1) * Math.cos(z * 0.11) + 0.4 * Math.sin(x * 0.33) * Math.sin(z * 0.29 + 2);
        return GY + n * THREE.MathUtils.smoothstep(r, 6, 13) + THREE.MathUtils.smoothstep(r, 30, 60) * 2.2;
      };
      const cA = new THREE.Color(0x4a4234), cB = new THREE.Color(0x564a38), cC = new THREE.Color(0x3d382f);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.4 + z * 0.31) * Math.cos(z * 0.27 - x * 0.2);
        return cA.clone().lerp(cB, m * 0.7).lerp(cC, 0.35 * (0.5 + 0.5 * Math.sin(x * 0.09 - z * 0.14)));
      }, gh));
      ogGround(gh, 5.5, 20, 7); // #71: 황무지 마당 수풀 클러스터(연차 비례) — gh 접지
      // 고사목
      for (let i = 0; i < 26; i++) {
        const a = rand() * Math.PI * 2, r = 8 + Math.pow(rand(), 0.8) * 26;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (r < 12) wlBlock(x, z, 0.34); // #95: 로밍·퇴장 경로권 나무만 우회 등록
        const geo = deadTreeGeo(rand, 0.8 + rand() * 1.3);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        const m = new THREE.Mesh(geo, vcLambert);
        m.castShadow = r < 14;
        envRoot.add(m);
      }
      // 폐차 & 전신주 & 잔해
      buildCarWreck(envRoot, 6.2, 3.4, -0.7, rand, gh(6.2, 3.4));
      buildCarWreck(envRoot, -8.5, -5.5, 2.1, rand, gh(-8.5, -5.5));
      buildPowerPole(envRoot, -5.5, 6.5, 0.14, GY);
      buildPowerPole(envRoot, 4.5, -8.5, -0.1, GY);
      buildPowerPole(envRoot, 13, 2, 0.22, gh(13, 2));
      const debris = [];
      for (let i = 0; i < 30; i++) {
        const a = rand() * Math.PI * 2, r = 5 + rand() * 18;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const bg = new THREE.BoxGeometry(0.2 + rand() * 0.5, 0.1 + rand() * 0.25, 0.2 + rand() * 0.5);
        bg.rotateY(rand() * 3);
        bg.translate(x, gh(x, z) + 0.08, z);
        debris.push(paintGeo(bg, [0x4c443a, 0x57503f, 0x3e3831][Math.floor(rand() * 3)]));
      }
      envRoot.add(new THREE.Mesh(mergeGeometries(debris), vcLambert));
      // 지평선의 폐허 도시
      buildRuinCity(envRoot, rand, { count: 12, rMin: 30, rMax: 48, hMin: 4, hMax: 13, baseY: GY, litChance: 0.18 });
      envDyn = {};
    },
  },

  bunker: {
    name: '돔 벙커', nameEn: 'Dome Bunker', emoji: '🛖', unlockAt: 2, viewH: 17, ceilY: 2.6,
    baseComfort: 5,
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (환기·조명 전력)', labelEn: 'Battery 1 / day (ventilation & lighting)' },
    moveCost: { material: 2, battery: 1 }, limits: '🔌 밀폐 구조 — 전력이 끊기면 거처 보너스·특성 정지', limitsEn: '🔌 Sealed structure — losing power halts shelter bonuses & traits',
    desc: '반쯤 무너진 돔형 벙커. 갈라진 외피 사이로 별이 보이지만, 두꺼운 벽 안쪽은 의외로 아늑하다.',
    descEn: 'A half-collapsed dome bunker. Stars peek through the cracked shell, but inside the thick walls it is surprisingly snug.',
    room: { w: 8.5, d: 6, h: 3 },
    mood: { fog: 0x161c2c, fogNear: 22, fogFar: 60, skyH: 0x223048, skyZ: 0x0a0e1a, hemiSky: 0x8593b8, hemiGround: 0x3f3a34, hemiInt: 0.68, moonC: 0x9db4d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'snow', 'clear', 'rain'],
    perk: { injuryHalf: true, label: '🛡️ 두꺼운 외피 — 부상 회복 2배 빠름', labelEn: '🛡️ Thick shell — injuries heal twice as fast' },
    buildRoom() {
      const { w, d, h } = ROOM;
      const conc = wallPhong({ map: concreteTex });
      conc.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.3, d + 0.8), conc.clone());
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 바닥은 conc.clone() — 포치/전실과 재질 분리해 바닥재만 교체
      // 입구 앞 콘크리트 포치 (컨셉아트의 앞마당)
      const porch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.22, 1.8), conc);
      porch.position.set(0, -0.19, d / 2 + 1.2);
      porch.receiveShadow = true;
      roomGroup.add(porch);
      B(roomGroup, w + 1.4, 0.7, d + 1.4, 0x2b2e36, 0, -0.65, 0);

      // 뒷벽: 벽돌 + 문 + 액자 — (B-①) 벙커의 유일한 곧은 내벽. 벽지 대상(돔 곡면은 제외).
      const brickMat = wallPhong({ map: brickTex });
      brickMat.userData.shared = true;
      tagDecoWall(brickMat);
      const back = new THREE.Group();
      const bw = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.24), brickMat);
      bw.position.y = h / 2; bw.castShadow = bw.receiveShadow = true;
      back.add(bw);
      const doorX = 1.1;
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.0, 0.1), lamb(0x1a1712));
      door.position.set(doorX, 1.0, 0.14); back.add(door);
      const dfm = lamb(0x4a3a28);
      const df1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.1, 0.16), dfm);
      df1.position.set(doorX - 0.58, 1.05, 0.14); back.add(df1);
      const df2 = df1.clone(); df2.position.x = doorX + 0.58; back.add(df2);
      const df3 = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.1, 0.16), dfm);
      df3.position.set(doorX, 2.1, 0.14); back.add(df3);
      // 벽에 걸린 액자들 (컨셉아트 디테일)
      const prand = seededRand(55);
      for (let i = 0; i < 4; i++) {
        const fw = 0.3 + prand() * 0.3, fh = 0.35 + prand() * 0.25;
        const fr = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.05), lamb([0x6a5a40, 0x3f3a33, 0x8a7a5c][i % 3]));
        fr.position.set(-w / 2 + 0.8 + i * 0.75 + prand() * 0.2, 1.5 + prand() * 0.6, 0.14);
        back.add(fr);
        const pic = new THREE.Mesh(new THREE.BoxGeometry(fw - 0.08, fh - 0.08, 0.06), lamb([0x9a8a6a, 0x5f7a70, 0xb0937a, 0x7a8a9a][i]));
        pic.position.copy(fr.position); pic.position.z = 0.15;
        back.add(pic);
      }
      back.position.set(0, 0, -d / 2 - 0.13);
      const wallDefs = [{ group: back, pos: [0, 0, -d / 2 - 0.13], rotY: 0, normal: new THREE.Vector3(0, 0, -1) }];
      back.position.set(...wallDefs[0].pos);

      // 돔 아치 쉘 (좌/우 반쪽 — 시야 방향 자동 컬링)
      const R = 4.35, T = 0.42, SEG = 11;
      const shellCols = [0xb5b1a6, 0xa8a49a, 0x99958b, 0x8f8b82];
      const grassPal = [0x6a7f4a, 0x8a8a4f, 0xa3703f, 0x5f7a45];
      const zBack = -d / 2 - 0.4;
      const roofFixed = state.bunkerRoof === 'full';   // 완전 수리 시 외피 갈라짐 메움
      const roofTemp = state.bunkerRoof === 'temp';    // 임시 덮개 시 일부만 보강
      // #81 ⑤: 돔 외피를 '연속 곡면'으로 재구성한다.
      //   [기존] 낱장 박스 스테이브 SEG개 + 랜덤 스킵/단축 → 슬랫 사이 틈 + 한쪽 뚫림(유저 신고).
      //   [신규] 반쪽마다 이음매 없는 반원통 셸(CylinderGeometry openEnded)로 연속 곡면을 만들고,
      //          그 위에 콘크리트 판 질감 스테이브를 '겹치게'(틈 없이) 덧대 폐허 디테일만 표현.
      //          손상은 base 셸을 뚫지 않고 표면 갈라짐(짧은 크랙 판/이끼)으로만 — 항상 하늘이 막혀 보인다.
      const depFull = d + 1.0;
      // #81 ⑤+⑥: 정점(θ=π/2) 부근에 '정해진 구멍'을 남긴다. 셸은 이 구멍만 빼고 연속.
      //   hole  = 구멍 열림(별이 보임) · temp = 방수포로 덮임 · full = 콘크리트로 메워 완전 연속.
      //   랜덤 슬랫 틈/한쪽 개방은 없앤다(⑤). 손상은 정점 구멍 + 표면 크랙 판으로만.
      const apexGap = roofFixed ? 0 : 0.34; // 라디안. full이면 구멍 없음(완전 연속).
      // #87 ①: 돔 셸을 상/하 밴드로 분리 — 하부(벽 높이대)는 좌우 벽 컬링에, 상부(머리 위 아치)는 천장 컬링에.
      //   연속 셸(#81)이 '먼 쪽 반'의 머리 위 구간까지 한 덩어리라, 회전해도 상부가 실내를 가리던 실기기 신고의 교정.
      //   quadBase는 스테이브 격자의 사분면 기준각(0=우측, π/2=좌측) — 밴드가 갈라져도 판 배열은 이어져 보인다.
      const mkArc = (tFrom, tTo, seed, quadBase) => {
        const g = new THREE.Group();
        const rand = seededRand(seed);
        const tStart = tFrom;
        const tLen = tTo - tFrom;
        if (tLen <= 0.01) return g;
        // ── 연속 반원통 base 셸 (axis=z). 이음매 없음. ──
        const baseCol = roofFixed ? 0xaeaaa0 : 0x9a968c;
        const shell = new THREE.Mesh(
          new THREE.CylinderGeometry(R, R, depFull, 24, 1, true, tStart, tLen),
          new THREE.MeshLambertMaterial({ color: baseCol, side: THREE.DoubleSide }));
        shell.rotation.x = Math.PI / 2;                 // 원통 축 y→z
        shell.position.set(0, 0, zBack + depFull / 2);
        shell.castShadow = shell.receiveShadow = true;
        g.add(shell);
        // 안쪽(실내 방향) 콘크리트 라이너 — 살짝 작은 반원통으로 두께감/천장 메움
        const inner = new THREE.Mesh(
          new THREE.CylinderGeometry(R - T, R - T, depFull, 20, 1, true, tStart, tLen),
          wallPhong({ map: concreteTex }));
        inner.material.side = THREE.BackSide;
        inner.rotation.x = Math.PI / 2; inner.position.set(0, 0, zBack + depFull / 2);
        g.add(inner);
        // ── 표면 스테이브(콘크리트 판 질감) — 틈 없이 겹치게 덧댐 (구멍/밴드 밖 각도는 건너뜀) ──
        for (let i = 0; i < SEG; i++) {
          const th = quadBase + (i + 0.5) * (Math.PI / 2) / SEG;
          if (th < tStart - 0.02 || th > tStart + tLen + 0.02) continue; // 구멍 자리엔 판 없음
          let dep = depFull;
          // 손상: 판이 짧게 갈라진 '크랙 자국' — base 셸은 뒤에 그대로라 하늘은 막힘.
          if (!roofFixed && rand() < 0.3) dep *= 0.55 + rand() * 0.3;
          const arcLen = R * (Math.PI / 2) / SEG * 1.35 + 0.14; // ×1.35 겹침 → 슬랫 틈 제거
          const col = rand() < 0.16 ? 0x5d594f : shellCols[Math.floor(rand() * shellCols.length)];
          const m = new THREE.Mesh(new THREE.BoxGeometry(arcLen, T * 0.7, dep), lamb(col));
          m.position.set((R + T * 0.2) * Math.cos(th), (R + T * 0.2) * Math.sin(th), zBack + dep / 2);
          m.rotation.z = th + Math.PI / 2;
          m.castShadow = m.receiveShadow = true;
          g.add(m);
          // 외피 위에 자란 풀
          if (th > 0.35 && th < Math.PI - 0.35 && rand() < 0.5) {
            const gh2 = 0.15 + rand() * 0.25;
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07 + rand() * 0.07, gh2, 5),
              lamb(grassPal[Math.floor(rand() * grassPal.length)]));
            const rr = R + T / 2 + gh2 / 2 - 0.03;
            tuft.position.set(rr * Math.cos(th), rr * Math.sin(th), zBack + 0.6 + rand() * (dep - 1));
            tuft.rotation.z = th - Math.PI / 2 + (rand() - 0.5) * 0.4;
            g.add(tuft);
          }
        }
        return g;
      };
      // 밴드 경계각: 하부 상단 y = R·sin(0.62) ≈ 2.53 — 벽 높이대에서 상/하가 갈라진다.
      const THS = 0.62;
      const rightLow = mkArc(0, THS, 21, 0);                                    // x>0 하부 (벽 컬링)
      const rightUp = mkArc(THS, Math.PI / 2 - apexGap / 2, 22, 0);             // x>0 상부 (천장 컬링)
      const leftUp = mkArc(Math.PI / 2 + apexGap / 2, Math.PI - THS, 43, Math.PI / 2); // x<0 상부
      const leftLow = mkArc(Math.PI - THS, Math.PI, 44, Math.PI / 2);           // x<0 하부
      roomGroup.add(rightLow); roomGroup.add(rightUp); roomGroup.add(leftUp); roomGroup.add(leftLow);
      tagCeiling(rightUp, R * Math.sin(THS) + 0.2);
      tagCeiling(leftUp, R * Math.sin(THS) + 0.2);
      // v1.5.2(디렉터 신고 '1자 바'): 곡면 밴드는 눈 캡 부적격 — bb 상단 일자 캡이 돔 위 공중에 떠서
      //   흰 바로 보였다(실측 y4.5/6.95). 눈 표현은 외피 자체 밝아짐(vcLambert 계절 톤)으로 충분.
      rightLow.userData.noWeatherCap = true;
      leftLow.userData.noWeatherCap = true;
      wallDefs.push({ group: rightLow, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(1, 0, 0) });
      wallDefs.push({ group: leftLow, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(-1, 0, 0) });
      // #87 ②: 정면 파사드 — 반달 콘크리트 벽 + 닫힌 철문. "벙커인데 앞이 뻥 뚫려있다" 실기기 신고.
      //   다른 셸터의 벽과 동일하게 컬링 참여: 기본(정면) 뷰에선 열려 실내가 보이고, 회전하면 벽 실체가 보인다.
      {
        const fR = R - 0.04;
        const shp = new THREE.Shape();
        shp.moveTo(fR, 0);
        shp.absarc(0, 0, fR, 0, Math.PI, false); // 반달 외곽 (CCW)
        shp.lineTo(-fR, 0);
        const doorHole = new THREE.Path(); // 출입구 (CW — 외곽 반대 감김)
        doorHole.moveTo(-0.72, 0.01); doorHole.lineTo(-0.72, 2.0); doorHole.lineTo(0.72, 2.0); doorHole.lineTo(0.72, 0.01); doorHole.closePath();
        shp.holes.push(doorHole);
        const facade = new THREE.Group();
        facade.userData.noWeatherCap = true; // v1.5.2: 반달 파사드 — 일자 캡이 돔 정점 높이(y4.29, 길이 8.5)에 부유하던 '1자 바' 원흉
        const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.24, bevelEnabled: false }), wallPhong({ color: 0xa39f94 }));
        fm.position.set(0, 0, d / 2 + 0.32); fm.castShadow = fm.receiveShadow = true; facade.add(fm);
        // 닫힌 철문 두 짝 + 가로 빗장 (후면 잠긴문과 같은 문법 — 여긴 '정문')
        const steel2 = wallPhong({ map: metalTex }); steel2.userData.shared = true;
        for (const sx of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.92, 0.1), steel2);
          leaf.position.set(sx * 0.35, 0.97, d / 2 + 0.3); leaf.castShadow = leaf.receiveShadow = true; facade.add(leaf);
        }
        B(facade, 1.3, 0.14, 0.1, 0x55504a, 0, 1.12, d / 2 + 0.43);
        B(facade, 1.8, 0.24, 0.34, 0x8f8b82, 0, 2.14, d / 2 + 0.44).castShadow = true; // 상인방
        roomGroup.add(facade);
        wallDefs.push({ group: facade, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(0, 0, 1) });
      }
      makeWalls(wallDefs);

      // #81 ⑥ 천장 수리 단계별 실메시 — 정점 구멍(apexGap)을 실제로 메운다.
      //   구멍은 θ=π/2(정점) 폭 apexGap. 그 위를 덮는 패치를 단계별로 얹어 "메워져 보이게" 한다.
      //   1단계(temp)=방수포 패치(주름/처짐), 2단계(full)=콘크리트 패치(apexGap=0이라 base가 이미 연속 → 이음 콘크리트 스트립으로 마감).
      const apexHalfW = R * Math.sin(apexGap / 2 || 0.17);   // 정점 구멍 반폭(x)
      const apexY = R * Math.cos(apexGap / 2 || 0.17);       // 구멍 바닥 y (정점보다 살짝 아래)
      if (roofTemp) {
        // 방수포 패치: 구멍보다 넉넉히 크게, 살짝 처지고 주름진 방수포 — 구멍을 확실히 덮는다.
        const patch = new THREE.Group();
        const pw = apexHalfW * 2 + 1.1;
        const tarp = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.07, d + 0.7), lamb(0x53616a));
        tarp.position.set(0, apexY + 0.12, zBack + (d + 0.7) / 2 + 0.15);
        tarp.rotation.z = 0.05; tarp.castShadow = tarp.receiveShadow = true; patch.add(tarp);
        // 주름 결(가로 각목) + 결속 로프 자락 — 임시 보강 느낌
        for (const rz of [-d * 0.3, 0, d * 0.3]) B(patch, pw * 0.96, 0.05, 0.08, 0x44525a, 0, apexY + 0.17, zBack + (d + 0.7) / 2 + 0.15 + rz);
        for (const sx of [-1, 1]) { const rope = Cyl(patch, 0.02, 0.02, 0.7, 0x2a2620, sx * apexHalfW, apexY - 0.2, zBack + 0.5, 4); rope.rotation.x = 0.5; }
        tagCeiling(patch, ROOM.h + 0.2); roomGroup.add(patch); // ⑥-a: 부감에서 천장 덮개 투시
      }
      if (roofFixed) {
        // 콘크리트 패치: apexGap=0이라 base 셸이 이미 정점까지 연속. 그 이음매에 새로 부은 콘크리트 스트립을 얹어
        //   '수리 흔적(밝은 콘크리트 띠)'을 남긴다 — 구멍이 메워졌음을 명시.
        const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, d + 0.8), wallPhong({ map: concreteTex }));
        strip.material.color.setHex(0xc2beb4);
        strip.position.set(0, R + 0.02, zBack + (d + 0.8) / 2 + 0.1);
        strip.castShadow = strip.receiveShadow = true;
        tagCeiling(strip, ROOM.h + 0.2); roomGroup.add(strip);
      }
      // #55 뒷문 개방(backdoor): 뒷벽 개구부 + 전실(콘크리트 방: 선반/램프) + 바닥에서 지하로 이어지는 하강 계단.
      // 전실/계단은 back(뒷벽) 그룹에 붙여 뒷벽 컬링 마스크와 함께 처리한다(카메라가 앞에서 볼 때만 노출).
      // back 그룹은 [0,0,-d/2-0.13]에 있으므로, 여기 좌표는 그 로컬 기준(더 깊은 곳 = 음의 z).
      if (state.bunkerBackdoor) {
        const conc2 = wallPhong({ map: concreteTex }); conc2.userData.shared = true;
        const store = new THREE.Group();
        const DX = -w / 4;          // 전실 가로 중심 (뒷벽 좌측)
        const ANTE_D = 2.4;         // 전실 깊이
        const ANTE_W = 2.8;         // 전실 폭
        const zNear = -0.1;         // 개구부(뒷벽 안쪽) 로컬 z
        const zFar = zNear - ANTE_D; // 전실 안쪽 벽 z
        // 개구부 틀 (뚫린 뒷벽 표현: 문틀 + 어두운 개구부)
        const fr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.12), lamb(0x3a3530));
        fr.position.set(DX, 1.05, 0.02); store.add(fr);
        const opening = new THREE.Mesh(new THREE.BoxGeometry(1.24, 1.9, 0.14), lamb(0x14110d));
        opening.position.set(DX, 1.0, -0.02); store.add(opening);
        // 전실 바닥
        const floor2 = new THREE.Mesh(new THREE.BoxGeometry(ANTE_W, 0.2, ANTE_D), conc2);
        floor2.position.set(DX, -0.1, (zNear + zFar) / 2); floor2.receiveShadow = true; store.add(floor2);
        // 전실 벽 (좌/우/안쪽) + 천장
        const wallH = 2.4;
        B(store, 0.16, wallH, ANTE_D, 0x8f8b82, DX - ANTE_W / 2, wallH / 2 - 0.1, (zNear + zFar) / 2).receiveShadow = true; // 좌벽
        B(store, 0.16, wallH, ANTE_D, 0x99958b, DX + ANTE_W / 2, wallH / 2 - 0.1, (zNear + zFar) / 2).receiveShadow = true; // 우벽
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(ANTE_W, wallH, 0.16), conc2);
        backWall.position.set(DX, wallH / 2 - 0.1, zFar); backWall.receiveShadow = true; store.add(backWall);
        B(store, ANTE_W, 0.16, ANTE_D, 0x6f6b63, DX, wallH - 0.1, (zNear + zFar) / 2); // 천장
        // ⑥-b 개방 후: 외부(후면)에서 "덧붙은 구조물"로 보이게 전실 지붕에 돌출 처마 슬래브 + 후면 보강 리브.
        //   (벽/천장은 실내를 향하므로 후면 실루엣이 밋밋했다 — 지붕 캡으로 부착 구조물의 덩어리감을 준다.)
        B(store, ANTE_W + 0.5, 0.16, ANTE_D + 0.4, 0x615d55, DX, wallH + 0.02, (zNear + zFar) / 2).castShadow = true;
        for (const sx of [-1, 1]) B(store, 0.16, wallH, 0.16, 0x565049, DX + sx * (ANTE_W / 2 + 0.08), wallH / 2 - 0.1, zFar - 0.02).castShadow = true; // 후면 모서리 기둥
        // 선반 (기존 저장고 보너스 이전) + 상자
        for (let s = 0; s < 2; s++) B(store, 1.9, 0.06, 0.42, 0x77543a, DX, 0.7 + s * 0.62, zFar + 0.35);
        for (let c = 0; c < 3; c++) { const cr = B(store, 0.4, 0.4, 0.4, [0x8a6a48, 0x6a5a40, 0x7a6a54][c], DX - 0.6 + c * 0.6, 0.32, zFar + 0.9); cr.castShadow = true; }
        // 램프 1 (전실 천장에 매달린 작은 전구)
        Cyl(store, 0.012, 0.012, 0.5, 0x2a2622, DX + 0.7, wallH - 0.35, zNear - 0.6, 5);
        const lb2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 0.9 }));
        lb2.position.set(DX + 0.7, wallH - 0.7, zNear - 0.6); store.add(lb2);

        // ── 하강 계단: 전실 바닥 우측에서 4~5단 내려가다 어둠으로 페이드 (진입 불가, 페이크 깊이) ──
        const stairs = new THREE.Group();
        const SX = DX + 0.55;       // 계단 가로 위치
        const stepW = 1.1, stepD = 0.34, stepH = 0.26, steps = 5;
        const zStart = zNear - 0.5; // 계단 시작 z (전실 앞쪽)
        for (let i = 0; i < steps; i++) {
          const y = -0.1 - (i + 1) * stepH;     // 바닥(-0.1) 아래로 내려감
          const z = zStart - i * stepD;
          const shade = 0x5a564e - i * 0x060606; // 내려갈수록 어두워짐
          const st = B(stairs, stepW, stepH, stepD, Math.max(0x1a1816, shade), SX, y, z);
          st.receiveShadow = true;
        }
        // 계단 벽(측벽) — 어둠으로 이어지는 통로 느낌
        B(stairs, 0.14, steps * stepH + 0.4, steps * stepD, 0x4a463f, SX - stepW / 2 - 0.05, -0.1 - (steps * stepH) / 2, zStart - (steps * stepD) / 2 + 0.1);
        B(stairs, 0.14, steps * stepH + 0.4, steps * stepD, 0x4a463f, SX + stepW / 2 + 0.05, -0.1 - (steps * stepH) / 2, zStart - (steps * stepD) / 2 + 0.1);
        // 검은 그라데이션 박스(페이크 깊이) — 마지막 단 아래를 완전한 어둠으로 덮는다
        const voidBox = new THREE.Mesh(
          new THREE.BoxGeometry(stepW + 0.3, 2.2, 1.4),
          new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.96, fog: false }));
        voidBox.position.set(SX, -0.1 - steps * stepH - 0.9, zStart - steps * stepD - 0.5);
        stairs.add(voidBox);
        // 히트 판정용 투명 프록시(클릭 영역) — 계단 전체를 감싼다
        const hit = new THREE.Mesh(
          new THREE.BoxGeometry(stepW + 0.4, steps * stepH + 0.6, steps * stepD + 0.6),
          new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(SX, -0.1 - (steps * stepH) / 2, zStart - (steps * stepD) / 2);
        stairs.add(hit);
        // ── 대형 프로젝트 현장 오브젝트 (1.1 ARC-02): "막힌 통로 정리" 돌무더기 ──
        // clearPassage 진행 단계에 따라 돌무더기가 줄어들다 통로가 열린다. (site='stairRubble')
        // siteStage 0/1=가득, 2=절반, 3(완공)=치워짐(통로로 빛이 샌다). 계단 마지막 단 발치에 배치.
        {
          const sStage = projectSiteStage('clearPassage');
          const baseY = -0.1 - steps * stepH;              // 마지막 단 바닥
          const baseZ = zStart - (steps - 0.5) * stepD;    // 마지막 단 앞
          const rubblePal = [0x6a655a, 0x5a564e, 0x77726a, 0x4e4a43];
          const rrand = seededRand(87);
          if (sStage < 3) {
            const nRocks = sStage <= 1 ? 11 : 5;           // 가득 vs 절반
            const rubble = new THREE.Group();
            for (let i = 0; i < nRocks; i++) {
              const rs = 0.16 + rrand() * 0.22;
              const rk = new THREE.Mesh(new THREE.BoxGeometry(rs, rs * (0.7 + rrand() * 0.5), rs * (0.8 + rrand() * 0.4)),
                lamb(rubblePal[Math.floor(rrand() * rubblePal.length)]));
              rk.position.set(SX + (rrand() - 0.5) * (stepW - 0.2), baseY + rs / 2 + rrand() * 0.25 * (sStage <= 1 ? 1 : 0.5), baseZ - rrand() * 0.6);
              rk.rotation.set(rrand() * 0.6, rrand() * Math.PI, rrand() * 0.6);
              rk.castShadow = rk.receiveShadow = true;
              rubble.add(rk);
            }
            stairs.add(rubble);
          } else {
            // 완공: 돌무더기 대신 통로 안쪽에서 새어나오는 희미한 빛 (진입은 여전히 불가 — 1.4 대기)
            const glow = new THREE.Mesh(new THREE.PlaneGeometry(stepW - 0.2, 1.6),
              new THREE.MeshBasicMaterial({ color: 0x3a4a55, transparent: true, opacity: 0.5, fog: false, side: THREE.DoubleSide }));
            glow.position.set(SX, baseY + 0.8, baseZ - 0.7);
            stairs.add(glow);
          }
        }
        bunkerStairsObj = stairs; // 상호작용 대상
        store.add(stairs);

        // store는 back 그룹 좌표계라 back의 위치/컬링을 그대로 따른다
        back.add(store);

      }
      // #81 ⑦→#87 ③ 격상: 후면 소형 돔(전실+하강 계단실 외피) + 짧은 연결 통로 — 뒷문 개방 여부와 무관하게 '상시' 존재.
      //   디렉터 원안: 뒷문을 딸 수 있으려면 그 뒤에 물리 공간이 먼저 있어야 한다. E-2가 개방 후에만 세우던 것을 교정.
      //   개방 전에는 잠긴 철문(위 lock) 뒤의 밀폐 공간으로 읽히고, 개방하면 전실(store)이 그 내부가 된다.
      {
        {
          const anteCXw = -w / 4;                          // 소형 돔 가로 중심 (전실 자리와 동일)
          const zFarW = -d / 2 - 0.13 - 2.5;               // 전실 안쪽 벽 월드 z (zNear -0.1 - 깊이 2.4)
          const smallCz = zFarW + 0.5;                     // 소형 돔 중심 z (전실 안쪽 위)
          // v1.5.1(디렉터: "이글루 말고 같은 돔형을 달아라") — 반구 폐기, 메인 돔과 동일 문법의 반원통 축소판.
          const sR = 1.7;                                  // 소형 돔 반경
          const sDep = 2.9;                                // 소형 돔 깊이(z)
          const domeCol = 0x9a968c;
          const smallDome = new THREE.Group();
          // 반원통 외피 (axis=z — 메인 돔 mkArc와 같은 결)
          const sk = new THREE.Mesh(
            new THREE.CylinderGeometry(sR, sR, sDep, 20, 1, true, 0, Math.PI),
            new THREE.MeshLambertMaterial({ color: domeCol, side: THREE.DoubleSide }));
          sk.rotation.x = Math.PI / 2;                     // 원통 축 y→z
          sk.rotation.z = Math.PI;                         // 아치가 위로 오게 (통로 pass와 동일 — 1차 검증에서 누워 있던 원인)
          sk.position.set(anteCXw, 0, smallCz - 0.6);
          sk.castShadow = sk.receiveShadow = true; smallDome.add(sk);
          // 후면 반달 캡 (원통 뒤가 뚫려 보이지 않게 — 정면 파사드와 같은 문법의 축소판)
          {
            const cshp = new THREE.Shape();
            cshp.moveTo(sR - 0.02, 0);
            cshp.absarc(0, 0, sR - 0.02, 0, Math.PI, false);
            cshp.lineTo(-(sR - 0.02), 0);
            const cap = new THREE.Mesh(new THREE.ExtrudeGeometry(cshp, { depth: 0.18, bevelEnabled: false }),
              new THREE.MeshLambertMaterial({ color: shade(domeCol, 0.88) }));
            cap.position.set(anteCXw, 0, smallCz - 0.6 - sDep / 2 - 0.09);
            cap.castShadow = cap.receiveShadow = true; smallDome.add(cap);
          }
          // 외피 위 이끼/풀 몇 점 — 원통 곡면 좌표로 (메인 돔과 톤 맞춤)
          const sr = seededRand(311);
          for (let i = 0; i < 7; i++) {
            const th = 0.35 + sr() * (Math.PI - 0.7);      // 원통 각(지면 근처 제외)
            const rr = sR + 0.05;
            const gx = anteCXw + rr * Math.cos(th), gy = rr * Math.sin(th);
            const gz = smallCz - 0.6 + (sr() - 0.5) * (sDep - 0.6);
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06 + sr() * 0.06, 0.16 + sr() * 0.2, 5),
              lamb([0x6a7f4a, 0x8a8a4f, 0x5f7a45][Math.floor(sr() * 3)]));
            tuft.position.set(gx, gy, gz); tuft.rotation.z = th - Math.PI / 2 + (sr() - 0.5) * 0.4; smallDome.add(tuft);
          }
          // 정수리 통풍구(작은 콘크리트 링) — 실루엣 포인트 유지
          const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 10), lamb(0x77736a));
          vent.position.set(anteCXw, sR - 0.04, smallCz - 0.6); vent.castShadow = true; smallDome.add(vent);
          // ── 짧은 연결 통로: 메인 돔 뒷벽 ↔ 소형 돔 사이 낮은 반원통 볼트 ──
          const passZ0 = -d / 2 - 0.13;                    // 메인 돔 뒷벽 월드 z
          const passLen = Math.abs(smallCz - passZ0) - sR * 0.4;
          if (passLen > 0.3) {
            const pass = new THREE.Mesh(
              new THREE.CylinderGeometry(1.05, 1.05, passLen, 14, 1, true, 0, Math.PI),
              new THREE.MeshLambertMaterial({ color: shade(domeCol, 0.92), side: THREE.DoubleSide }));
            pass.rotation.x = Math.PI / 2;                 // 축 y→z
            pass.rotation.z = Math.PI;                     // 아치가 위로 오게
            pass.position.set(anteCXw, 0, passZ0 - passLen / 2);
            pass.castShadow = pass.receiveShadow = true; smallDome.add(pass);
          }
          roomGroup.add(smallDome); // 컬링 무관: 후면 외부에서 항상 2돔 실루엣 성립
        }
      }
      if (!state.bunkerBackdoor) {
        // ⑥-b 개방 전: 돔 후면에 "잠긴 철문 + 콘크리트 프레임" 매스를 뚜렷이 세운다.
        //   유저 신고("뒤가 허전하다 / 뭔가 있어야 게이트를 인지한다") 해소 — 순수 비주얼(게이트 로직/비용 불변).
        //   ★ back(뒷벽) 그룹은 카메라가 후면에 오면 벽 컬링으로 통째로 숨는다(실내가 보이게). 그러면 문이 안 보이므로
        //     이 잠긴문 매스는 back이 아니라 roomGroup에 직접 붙여, 후면 외부에서도 항상 보이게 한다(컬링 무관).
        //     back 위치 z = -d/2-0.13, 외부(-z)로 조금 더 나가 zW = -d/2-0.13-0.26.
        const lock = new THREE.Group();
        const LX = -w / 4;            // 좌측(뒷문 개방 시 전실이 생길 자리와 동일 위치)
        const zW = -d / 2 - 0.13 - 0.26; // 뒷벽 바깥면 월드 z
        // 콘크리트 문틀 프레임 (문보다 크게 — 매스감)
        const frameW = 2.0, frameH = 2.6, frameT = 0.5;
        B(lock, 0.32, frameH, frameT, 0x8f8b82, LX - frameW / 2, frameH / 2 - 0.1, zW).castShadow = true;
        B(lock, 0.32, frameH, frameT, 0x99958b, LX + frameW / 2, frameH / 2 - 0.1, zW).castShadow = true;
        // 상인방(위 보) + 하단 문지방
        B(lock, frameW + 0.32, 0.34, frameT, 0x847f76, LX, frameH - 0.27, zW).castShadow = true;
        B(lock, frameW + 0.1, 0.16, frameT + 0.1, 0x6f6b63, LX, 0.0, zW);
        // 녹슨 철판 문짝 (두 짝) — 프레임보다 살짝 안쪽
        const steelMat = wallPhong({ map: metalTex }); steelMat.userData.shared = true;
        for (const sx of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.2, 0.12), steelMat);
          leaf.position.set(LX + sx * 0.42, 1.05, zW + 0.28); leaf.castShadow = leaf.receiveShadow = true; lock.add(leaf);
          B(lock, 0.08, 2.0, 0.06, 0x3d444c, LX + sx * 0.42, 1.05, zW + 0.21); // 세로 보강 리브
        }
        // 가로 빗장 (문을 가로지르는 굵은 철봉) + 자물쇠 뭉치 — "잠김"을 명확히
        B(lock, 1.7, 0.16, 0.14, 0x55504a, LX, 1.15, zW + 0.2).castShadow = true;
        B(lock, 0.24, 0.3, 0.2, 0x2f2b26, LX, 1.15, zW + 0.12).castShadow = true; // 자물쇠 박스
        // 볼트 자국(모서리 리벳)
        for (let i = 0; i < 8; i++) {
          const bx = LX - 0.7 + (i % 4) * 0.47, by = 0.5 + Math.floor(i / 4) * 1.2;
          Cyl(lock, 0.04, 0.04, 0.05, 0x2a2622, bx, by, zW + 0.34, 5);
        }
        // 경고 표식(빛바랜 스텐실 판) — 시선을 끄는 작은 색면
        B(lock, 0.5, 0.34, 0.03, 0x9a7a2a, LX + 0.02, 1.75, zW + 0.22);
        roomGroup.add(lock); // 컬링 무관: 후면에서 항상 노출
      }

      // 천장 펜던트 램프 (컨셉아트) — 아치 정점에서 늘어짐
      Cyl(roomGroup, 0.015, 0.015, 1.3, 0x2a2622, 0, 3.5, -0.6, 5);
      const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.24, 8), lamb(0x3f4a44));
      lampShade.position.set(0, 2.82, -0.6); lampShade.castShadow = true;
      roomGroup.add(lampShade);
      const lb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 1 }));
      lb.position.set(0, 2.7, -0.6);
      roomGroup.add(lb);
      blockers = [];
    },
    buildEnv() {
      const GY = -0.85;
      const rand = seededRand(940);
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 0.8 * Math.sin(x * 0.14 + 0.6) * Math.cos(z * 0.12) + 0.5 * Math.sin(x * 0.3) * Math.sin(z * 0.26 + 1.4);
        return GY + n * THREE.MathUtils.smoothstep(r, 7, 14) + THREE.MathUtils.smoothstep(r, 28, 58) * 2.6;
      };
      const cA = new THREE.Color(0x3e4a36), cB = new THREE.Color(0x4a4a3a), cC = new THREE.Color(0x35443c);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.41 + z * 0.3) * Math.cos(z * 0.33 - x * 0.21);
        return cA.clone().lerp(cB, m * 0.65).lerp(cC, 0.35 * (0.5 + 0.5 * Math.sin(x * 0.1 - z * 0.15)));
      }, gh));
      ogGround(gh, 6, 20, 6); // #71: 벙커 앞마당 수풀 클러스터(연차 비례)
      // 무성한 들풀 (병합 1메시)
      const tufts = [];
      for (let i = 0; i < 260; i++) {
        const a = rand() * Math.PI * 2, r = 5.5 + Math.pow(rand(), 0.7) * 22;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const th = 0.2 + rand() * 0.4;
        const tg = new THREE.ConeGeometry(0.06 + rand() * 0.08, th, 4);
        tg.rotateZ((rand() - 0.5) * 0.5);
        tg.translate(x, gh(x, z) + th / 2 - 0.02, z);
        tufts.push(paintGeo(tg, [0x55663f, 0x6a7047, 0x7d6a42, 0x4a5c3c][Math.floor(rand() * 4)]));
      }
      envRoot.add(new THREE.Mesh(mergeGeometries(tufts), vcLambert));
      // 고사목 + 버려진 가전 더미 + 드럼통 (컨셉아트 앞마당의 잡동사니)
      for (let i = 0; i < 14; i++) {
        const a = rand() * Math.PI * 2, r = 9 + Math.pow(rand(), 0.8) * 20;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (r < 12) wlBlock(x, z, 0.34); // #95
        const geo = deadTreeGeo(rand, 0.8 + rand() * 1.2);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        envRoot.add(new THREE.Mesh(geo, vcLambert));
      }
      const junkAt = (x, z) => {
        const jg = new THREE.Group();
        B(jg, 0.7, 1.1, 0.6, 0xb0aca2, 0, 0.55, 0);                    // 냉장고
        B(jg, 0.6, 0.04, 0.5, 0x8a867c, 0.02, 1.13, 0);
        B(jg, 0.02, 0.8, 0.4, 0x6e6a62, 0.36, 0.55, 0);
        const wm = B(jg, 0.6, 0.6, 0.55, 0x9a958c, 0.9, 0.3, 0.3);     // 세탁기
        wm.rotation.z = 0.12;
        Cyl(jg, 0.18, 0.18, 0.04, 0x3a3733, 0.9, 0.62, 0.58, 10).rotation.x = Math.PI / 2;
        jg.position.set(x, gh(x, z), z);
        jg.rotation.y = rand() * Math.PI * 2;
        envRoot.add(jg);
      };
      junkAt(6.5, 5.5); junkAt(-7.5, -4);
      wlBlock(6.5, 5.5, 0.75); wlBlock(-7.5, -4, 0.75); // #95: 가전 더미 우회
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2, r = 6 + rand() * 9;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (r < 12) wlBlock(x, z, 0.42); // #95: 드럼통
        const barrel = Cyl(envRoot, 0.32, 0.32, 0.85, [0x7a4530, 0x5c5f52, 0x6e3e28][i % 3], x, gh(x, z) + 0.42, z, 9);
        if (rand() < 0.4) { barrel.rotation.z = Math.PI / 2 - 0.1; barrel.position.y = gh(x, z) + 0.34; }
      }
      buildPowerPole(envRoot, -10, 8, 0.2, gh(-10, 8));
      // 지평선의 폐허 도시
      buildRuinCity(envRoot, rand, { count: 13, rMin: 30, rMax: 48, hMin: 5, hMax: 14, baseY: GY, litChance: 0.12 });
      // 반딧불이 (힐링 무드)
      const n = 16, arr = new Float32Array(n * 3);
      const base = [], phase = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = 7 + rand() * 8;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const y = gh(x, z) + 0.5 + rand() * 1.1;
        arr.set([x, y, z], i * 3);
        base.push({ x, y, z }); phase.push(rand() * Math.PI * 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xd9e77a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false,
      }));
      envRoot.add(pts);
      envDyn = { fireflies: { pts, base, phase } };
    },
  },

  rooftop: {
    name: '도시 옥탑방', nameEn: 'City Rooftop', emoji: '🏙️', unlockAt: 4, viewH: 19, ceilY: 2.5,
    desc: '무너진 도시의 빌딩 옥상. 콘크리트 슬래브 위, 주워 모은 판자로 잇댄 가벽 방과 텃밭으로 개조할 수 있는 마당이 있다.',
    descEn: 'Atop a fallen city building. A crude room walled with scavenged panels sits on the concrete slab, beside a yard you can turn into a garden.',
    // ROOM = 가벽 방 내부(가구 배치 영역)만. 마당은 방 밖 슬래브라 배치 불가. (구 9×7 → 5.6×4.4로 축소, 로드 시 클램프 마이그레이션)
    room: { w: 5.6, d: 4.4, h: 2.4 },
    baseComfort: 4,
    moveCost: { material: 2, parts: 1 }, limits: '🪨 슬레이트 지붕에 두 장이 빠져 있다 — 보수 전까지 비/눈 오는 날 청결 소폭 감소', limitsEn: '🪨 Two slates are missing from the roof — until repaired, cleanliness dips a little on rainy/snowy days',
    mood: { fog: 0x1c202c, fogNear: 22, fogFar: 62, skyH: 0x252c3d, skyZ: 0x0b0e18, hemiSky: 0x7d8bb0, hemiGround: 0x3a3733, hemiInt: 0.66, moonC: 0x9db4d8, moonInt: 0.8, stars: 0.75 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    // 옥탑 퍽: 텃밭 수확 배수(gardenMult). 텃밭은 현재 rooftop 전용이라 이 배수가 곧 옥탑의 정체성 —
    // 다른 셸터에 텃밭이 생기는 건 향후. 부분성공 회수(salvagePlus)는 유지.
    perk: { salvagePlus: true, gardenMult: BAL.economy.rooftopGardenMult, label: '📡 탁 트인 시야 — 부분 성공 시 가구 1개 회수 · 🌱 옥상 텃밭 수확 2배', labelEn: '📡 Clear vantage — salvage 1 furniture on partial success · 🌱 rooftop garden yields ×2' },
    // 슬래브는 방(ROOM)보다 훨씬 넓고, 방은 -x/-z 구석, 마당은 +x/+z. 방은 원점 중심(가구 배치 기준).
    // 슬래브 반폭/반깊이 (방 원점 기준 비대칭). YARD 오프셋으로 마당 중심을 잡는다.
    _slab: { backX: 3.4, frontX: 6.9, backZ: 2.9, frontZ: 6.1 }, // 방 원점에서 각 방향 슬래브 가장자리까지
    buildRoom() {
      const { w, d, h } = ROOM;
      const S = SHELTERS.rooftop._slab;
      const conc = wallPhong({ map: concreteTex });
      conc.userData.shared = true;
      // ── 콘크리트 슬래브 (넓게 — 마당 공간 확보) ──
      const slabW = S.backX + S.frontX, slabD = S.backZ + S.frontZ;
      const slabCX = (S.frontX - S.backX) / 2, slabCZ = (S.frontZ - S.backZ) / 2;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.35, slabD), conc.clone());
      slab.position.set(slabCX, -0.175, slabCZ); slab.receiveShadow = true;
      tagDecoFloor(slab); roomGroup.add(slab); // (B-①) 옥탑 바닥재 대상 (벽지는 없음 — 개방형 파라펫)
      // 슬래브 이음 라인 (방수 이음새 느낌)
      for (let gx = -1; gx <= 1; gx++) B(roomGroup, 0.05, 0.02, slabD, 0x4a4a48, slabCX + gx * slabW / 4, 0.01, slabCZ);
      // ── 콘크리트 파라펫(난간) — 슬래브 가장자리, 일부 파손 ──
      const pH = 0.9;
      const parapet = (len, cx, cz, rotY, breaks) => {
        // breaks: [ [중심비율 0~1, 폭비율] ] 파손 구간. 구간을 빼고 남는 조각들만 세운다.
        const segs = [[0, 1]]; // [시작비율, 끝비율]
        let parts = [[0, 1]];
        for (const [c, bw] of breaks) {
          const bs = c - bw / 2, be = c + bw / 2;
          parts = parts.flatMap(([s, e]) => {
            if (be <= s || bs >= e) return [[s, e]];
            const out = [];
            if (bs > s) out.push([s, bs]);
            if (be < e) out.push([be, e]);
            return out;
          });
        }
        const g = new THREE.Group();
        for (const [s, e] of parts) {
          const pl = (e - s) * len; if (pl < 0.15) continue;
          const px = (s + e) / 2 * len - len / 2;
          const m = new THREE.Mesh(new THREE.BoxGeometry(pl, pH, 0.26), wallPhong({ color: 0x5b5b58 }));
          m.position.set(px, pH / 2, 0); m.castShadow = m.receiveShadow = true; g.add(m);
          const cap = new THREE.Mesh(new THREE.BoxGeometry(pl, 0.07, 0.34), wallPhong({ color: 0x6a6a66 }));
          cap.position.set(px, pH + 0.03, 0); g.add(cap);
        }
        g.position.set(cx, 0, cz); g.rotation.y = rotY; roomGroup.add(g);
      };
      // 앞(+z, 카메라 홈 방향)·뒤(-z)·좌(-x)·우(+x). 파손 1~2곳.
      parapet(slabW, slabCX, S.frontZ - 0.13, 0, [[0.62, 0.16]]);
      parapet(slabW, slabCX, -S.backZ + 0.13, 0, []);
      parapet(slabD, -S.backX + 0.13, slabCZ, Math.PI / 2, [[0.4, 0.13]]);
      parapet(slabD, S.frontX - 0.13, slabCZ, Math.PI / 2, []);
      // ── 아래 빌딩 몸체 + 창문 (슬래브 밑) ──
      const body = B(roomGroup, slabW + 0.4, 17, slabD + 0.4, 0x252932, slabCX, -8.9, slabCZ);
      body.receiveShadow = false;
      const rand = seededRand(88);
      const winGeos = [];
      for (let i = 0; i < 26; i++) {
        const side = Math.floor(rand() * 4);
        const hw = slabW / 2, hd = slabD / 2;
        const wx = side < 2 ? slabCX + (rand() - 0.5) * (slabW - 1) : slabCX + (side === 2 ? -hw - 0.22 : hw + 0.22);
        const wz = side >= 2 ? slabCZ + (rand() - 0.5) * (slabD - 1) : slabCZ + (side === 0 ? -hd - 0.22 : hd + 0.22);
        const wg = new THREE.BoxGeometry(side < 2 ? 0.7 : 0.1, 0.9, side < 2 ? 0.1 : 0.7);
        wg.translate(wx, -1.6 - rand() * 13, wz);
        winGeos.push(paintGeo(wg, rand() < 0.15 ? 0xd9b06a : 0x131720));
      }
      roomGroup.add(new THREE.Mesh(mergeGeometries(winGeos), vcLambert));

      // ── 가벽 방 (콘크리트 옥탑 구조물 뼈대 + 주워 모은 패널/합판 가벽) ──
      // 방은 원점 중심. 컬링용 벽 4장 + 문 개구부(+z). 슬레이트 지붕은 별도(rooftopSlate).
      const plyMat = wallPhong({ map: plywoodTex }); plyMat.userData.shared = true;
      tagDecoWall(plyMat); // (B-①) 옥탑 가벽의 합판 낱장 — 벽지 대상 (색판 낱장은 폐허 자재감 유지)
      // 뒤섞인 판자 팔레트 (색·재질 뒤섞인 도시 폐허 자재)
      const panelCols = [0x8a7350, 0x6e6350, 0x7d6a4a, 0x5f6a6e, 0x86745a, 0x655b48, 0x6a6660];
      // 콘크리트 옥탑 뼈대 기둥 4개 (모서리)
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        B(roomGroup, 0.18, h + 0.1, 0.18, 0x5a5a57, sx * (w / 2 + 0.09), (h + 0.1) / 2, sz * (d / 2 + 0.09));
      // 패널 가벽 빌더: 방 한 변을 낱장 판자를 세로로 잇대어 채운다 (문 개구부 지원)
      const pr = seededRand(53);
      const mkPatchWall = (len, doorC) => {
        // doorC: 문 중심 비율(0~1) 있으면 그 구간(폭 doorW)을 비운다. 컬링 그룹 반환.
        const g = new THREE.Group();
        const doorW = doorC != null ? 1.3 : 0;
        const doorS = doorC != null ? doorC * len - len / 2 - doorW / 2 : 0;
        const doorE = doorS + doorW;
        let x = -len / 2;
        const board = 0.44;
        while (x < len / 2 - 0.02) {
          const bw = Math.min(board + (pr() - 0.5) * 0.18, len / 2 - x);
          const cx = x + bw / 2;
          // 문 개구부와 겹치면 상인방(위)만 남기고 비운다
          const inDoor = doorC != null && cx > doorS - bw / 2 && cx < doorE + bw / 2;
          const col = panelCols[Math.floor(pr() * panelCols.length)];
          const useMap = pr() < 0.5;
          const mat = useMap ? plyMat : wallPhong({ color: col });
          if (inDoor) {
            // 문 위 상인방 (짧은 판)
            const lh = h - 1.8;
            const p = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, lh, 0.09), mat);
            p.position.set(cx, h - lh / 2, 0); p.castShadow = p.receiveShadow = true; g.add(p);
          } else {
            const ph2 = h - (pr() < 0.3 ? 0.12 : 0) - 0.02; // 몇 장은 살짝 짧아 위가 삐죽
            const p = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, ph2, 0.09), mat);
            p.position.set(cx, ph2 / 2, (pr() - 0.5) * 0.03); p.castShadow = p.receiveShadow = true; g.add(p);
            // 가로 못댄 각목 (판자 이음 강조)
            if (pr() < 0.4) B(g, bw - 0.05, 0.06, 0.03, 0x4a3f30, cx, 0.4 + pr() * (h - 1), 0.06);
          }
          x += bw;
        }
        return g;
      };
      // 문은 앞(+z) 벽에. 컬링을 위해 makeWalls 계약(그룹+법선)으로 등록.
      makeWalls([
        { group: mkPatchWall(w, 0.5), pos: [0, 0, d / 2 + 0.09], rotY: 0, normal: new THREE.Vector3(0, 0, 1) },
        { group: mkPatchWall(w), pos: [0, 0, -d / 2 - 0.09], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mkPatchWall(d), pos: [-w / 2 - 0.09, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mkPatchWall(d), pos: [w / 2 + 0.09, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 문틀 (개구부 테두리) — ⑤ 앞(+z)벽 부착물 → +z 벽 컬링과 동기화(허공 부유 방지)
      const doorX = 0; // 앞벽 중앙
      attachToWall(0, 0, 1,
        B(roomGroup, 0.08, 1.8, 0.14, 0x3a3228, doorX - 0.65, 0.9, d / 2 + 0.09),
        B(roomGroup, 0.08, 1.8, 0.14, 0x3a3228, doorX + 0.65, 0.9, d / 2 + 0.09),
        B(roomGroup, 1.42, 0.1, 0.14, 0x3a3228, doorX, 1.8, d / 2 + 0.09));
      // ── 슬레이트 지붕 (조악 — 초기 2장 빠짐, 제작으로 보수) ──
      buildRooftopSlate(w, d, h);

      // ── 마당 소품: 급수탑 + 실외기 (슬래브 +x/+z 구석) ──
      // 급수탑: 다리 4개 + 원통 탱크
      const tower = new THREE.Group();
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const leg = Cyl(tower, 0.045, 0.055, 2.1, 0x4e4a44, sx * 0.42, 1.05, sz * 0.42, 5); leg.castShadow = true;
      }
      const tank = Cyl(tower, 0.62, 0.7, 1.15, 0x6a5f52, 0, 2.75, 0, 12); tank.castShadow = true;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.5, 12), lamb(0x5a5048));
      cone.position.y = 3.55; cone.castShadow = true; tower.add(cone);
      tower.position.set(S.frontX - 1.2, 0, -S.backZ + 1.1);
      roomGroup.add(tower);
      // 실외기 (에어컨 실외기 — 마당 다른 구석)
      const ac = new THREE.Group();
      B(ac, 0.85, 0.6, 0.55, 0xa8a49c, 0, 0.3, 0).castShadow = true;
      B(ac, 0.8, 0.02, 0.5, 0x3a3a38, 0, 0.61, 0);
      Cyl(ac, 0.22, 0.22, 0.03, 0x2a2a28, 0, 0.62, 0, 10);
      for (let i = 0; i < 5; i++) B(ac, 0.78, 0.02, 0.02, 0x555250, 0, 0.14 + i * 0.09, 0.28);
      ac.position.set(S.frontX - 1.1, 0, S.frontZ - 1.1); ac.rotation.y = -0.4;
      roomGroup.add(ac);
      // 실외기 옆 잡짐 (드럼통 + 판자 더미) — 마당의 폐허 자재감
      Cyl(roomGroup, 0.3, 0.3, 0.8, 0x5c5f52, S.frontX - 2.4, 0.4, S.frontZ - 1.0, 9).castShadow = true;
      const sb = seededRand(9);
      for (let i = 0; i < 4; i++)
        B(roomGroup, 1.1, 0.12, 0.3, panelCols[i % panelCols.length], S.frontX - 2.3, 0.08 + i * 0.13, S.frontZ - 2.2).rotation.y = (sb() - 0.5) * 0.3;
      // 안테나 (방 뒤 구석)
      Cyl(roomGroup, 0.03, 0.05, 2.4, 0x55504a, -w / 2 - 0.4, 1.2, -d / 2 - 0.4, 5);
      B(roomGroup, 0.7, 0.05, 0.05, 0x55504a, -w / 2 - 0.4, 2.2, -d / 2 - 0.4);
      blockers = [
        { x: S.frontX - 1.2, z: -S.backZ + 1.1, w: 1.6, d: 1.6 }, // 급수탑
        { x: S.frontX - 1.1, z: S.frontZ - 1.1, w: 1.1, d: 1.0 }, // 실외기
      ];
    },
    buildEnv() {
      const rand = seededRand(777);
      // #71: 도심 — 잠식이 가장 짙은 셸터. 근경 빌딩(dynCull: envDyn.buildings 시야 컬링 대상)은
      //   담쟁이를 그룹 자식으로 부착, 원경은 월드 병합. ogPer = 동당 패치 밀도 가중.
      const near = buildRuinCity(envRoot, rand, { count: 9, rMin: 13, rMax: 22, hMin: 6, hMax: 14, baseY: -18, litChance: 0.6, dynCull: true, ogPer: 1.6 });
      buildRuinCity(envRoot, rand, { count: 16, rMin: 24, rMax: 46, hMin: 8, hMax: 20, baseY: -18, litChance: 0.45, ogPer: 1.2 });
      ogGround((x, z) => -18.1, 15, 26, 3); // 노면 균열 사이 수풀(도로 평면 y 고정)
      // 저 멀리 화재가 난 빌딩
      const fx = 20, fz = -14, fy = -2;
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xff8840, emissive: 0xff5f20, emissiveIntensity: 1.2 }));
      glow.position.set(fx, fy, fz);
      envRoot.add(glow);
      const fire = new THREE.PointLight(0xff7030, 30, 26, 1.8);
      fire.position.set(fx, fy + 1, fz);
      envRoot.add(fire);
      const street = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), lamb(0x14161c));
      street.rotation.x = -Math.PI / 2; street.position.y = -18.2;
      envRoot.add(street);
      envDyn = { fire, fireBase: 30, buildings: near };
    },
  },

  cabin: {
    name: '숲속 오두막', nameEn: 'Forest Cabin', emoji: '🏡', unlockAt: 7, viewH: 16, ceilY: 2.45,
    baseComfort: 10,
    upkeep: { res: 'material', n: 1, every: 3, label: '건축재 1 / 3일', labelEn: 'Building material 1 / 3 days' },
    stormRepair: ['rain', 'snow', 'storm'], moveCost: { material: 4 },
    limits: '🪵 목조 지붕 — 악천후엔 매일 건축재 1로 누수 수리 (없으면 청결 -8)', limitsEn: '🪵 Timber roof — bad weather needs 1 material/day for leak repair (else cleanliness -8)',
    desc: '숲 가장자리의 오두막. 폐허가 된 세상에서 찾아낸 가장 아늑한 은신처.',
    descEn: 'A cabin on the forest’s edge. The coziest refuge you have found in this ruined world.',
    weatherPool: ['clear', 'snow', 'rain', 'clear'],
    perk: { cozyMult: 1.5, label: '🕯️ 아늑한 구조 — 쾌적함 효과 1.5배', labelEn: '🕯️ Cozy layout — comfort effects ×1.5' },
    room: { w: 10, d: 8, h: 2.7 },
    mood: { fog: 0x1a2233, fogNear: 24, fogFar: 58, skyH: 0x1a2233, skyZ: 0x0a0f1a, hemiSky: 0x8a98bd, hemiGround: 0x46403a, hemiInt: 0.7, moonC: 0x9db4d8, moonInt: 0.75, stars: 0.85 },
    buildRoom() {
      const { w, d, h } = ROOM;
      const fm = wallPhong({ map: floorWoodTex }); fm.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), fm);
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor);
      B(roomGroup, w + 1.0, 0.5, d + 1.0, 0x2b2e36, 0, -0.55, 0);
      B(roomGroup, w + 1.6, 1.0, d + 1.6, 0x2f333c, 0, -1.15, 0);
      const wallMat = wallPhong({ map: wallWoodTex });
      wallMat.userData.shared = true;
      const mk = (len, opts) => stdWall(len, h, wallMat, opts);
      const defs = [
        { group: mk(w, { window: { winW: 2.2, winH: 1.3, winY: 1.35, winX: -0.6 }, skyColor: 0x2c3a52 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mk(d), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ];
      defs.forEach((df, i) => addRoofGrass(df.group, i < 2 ? w : d, h, 41 + i * 17));
      makeWalls(defs);
      blockers = [];
    },
    buildEnv() {
      const GY = -1.3;
      const rand = seededRand(1234);
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 1.1 * Math.sin(x * 0.15 + 1.0) * Math.cos(z * 0.11)
                + 0.6 * Math.sin(x * 0.31 + 0.5) * Math.sin(z * 0.27 + 2.0);
        return GY + n * THREE.MathUtils.smoothstep(r, 9, 16) + THREE.MathUtils.smoothstep(r, 26, 55) * 3.5;
      };
      const cG = new THREE.Color(0x445640), cD = new THREE.Color(0x4d483c), cM = new THREE.Color(0x3a5048);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.43 + z * 0.29) * Math.cos(z * 0.37 - x * 0.19);
        return cG.clone().lerp(cD, m * 0.6).lerp(cM, 0.4 * (0.5 + 0.5 * Math.sin(x * 0.11 - z * 0.17)));
      }, gh));
      ogGround(gh, 8.5, 22, 8); // #71: 숲 가장자리 덤불 클러스터(연차 비례)
      // 숲 (가까운 나무는 개별 메시 — 시야 컬링 + 바람에 흔들림) + 고사목 섞기
      const trees = [];
      const farGeos = [];
      for (let i = 0; i < 105; i++) {
        const a = rand() * Math.PI * 2;
        const r = 11.5 + Math.pow(rand(), 0.8) * 24;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const s = 0.8 + rand() * 1.5 + (r > 24 ? 0.5 : 0);
        const dead = rand() < 0.22;
        if (r < 20) {
          if (r < 12) wlBlock(x, z, 0.36); // #95: 숲 근접 수목 우회 등록 (침엽수 둥치가 굵다 — 0.36)
          const geo = dead ? deadTreeGeo(rand, s * 0.9) : pineGeo(rand, s, false);
          const m = new THREE.Mesh(geo, vcLambert);
          m.position.set(x, gh(x, z) - 0.05, z);
          m.rotation.y = rand() * Math.PI * 2;
          m.castShadow = true;
          envRoot.add(m);
          trees.push({ obj: m, dir: new THREE.Vector2(x, z).normalize(), phase: rand() * Math.PI * 2, sway: dead ? 0.005 : 0.016 });
        } else {
          const geo = dead ? deadTreeGeo(rand, s * 0.9) : pineGeo(rand, s, r > 26);
          geo.rotateY(rand() * Math.PI * 2);
          geo.translate(x, gh(x, z) - 0.05, z);
          farGeos.push(geo);
        }
      }
      envRoot.add(new THREE.Mesh(mergeGeometries(farGeos), vcLambert));
      // 아포칼립스 소품: 버려진 차 + 기울어진 전신주 줄
      buildCarWreck(envRoot, -9.5, 4.5, 1.2, rand, gh(-9.5, 4.5)); // 지형 접지 (공중부양 수정)
      buildPowerPole(envRoot, 8.5, 7.5, 0.18, gh(8.5, 7.5));
      buildPowerPole(envRoot, 13.5, 10.5, -0.12, gh(13.5, 10.5));
      // 무너진 이웃 오두막 (전소된 잔해)
      {
        const ruin = new THREE.Group();
        const rc = 0x4a4038, burnt = 0x2a251f;
        B(ruin, 3.2, 0.16, 2.6, rc, 0, 0.08, 0);                    // 남은 바닥
        B(ruin, 0.16, 1.2, 2.4, burnt, -1.5, 0.6, 0);               // 벽 잔해
        B(ruin, 1.6, 0.9, 0.16, rc, -0.6, 0.45, -1.2);
        B(ruin, 0.16, 0.5, 1.1, burnt, 1.4, 0.25, 0.5);
        B(ruin, 0.7, 2.0, 0.7, 0x55524c, 1.1, 1.0, -0.9);           // 벽난로 굴뚝만 남음
        B(ruin, 0.5, 0.4, 0.5, 0x3a3733, 1.1, 2.1, -0.9);
        const plank = (x2, z2, ry, rz) => {
          const p = B(ruin, 1.8, 0.07, 0.3, burnt, x2, 0.35, z2);
          p.rotation.y = ry; p.rotation.z = rz;
        };
        plank(-0.3, 0.3, 0.5, 0.28); plank(0.4, -0.4, -0.8, 0.2); plank(0.1, 0.9, 1.2, 0.35);
        ruin.position.set(9.5, gh(9.5, -7.5) - 0.02, -7.5);
        ruin.rotation.y = -0.5;
        envRoot.add(ruin);
        // #71: 전소 잔해 잠식 — 회전 그룹이라 로컬 좌표 box(굴뚝/벽 잔해)를 등록해 자식으로 담쟁이 부착
        ogAttach(ruin, [
          { x: 1.1, z: -0.9, w: 0.7, d: 0.7, h: 2.0, y0: 0 },  // 벽난로 굴뚝
          { x: -1.5, z: 0, w: 0.16, d: 2.4, h: 1.2, y0: 0 },   // 남은 벽 잔해
        ]);
      }
      // 불탄 숲 군락 (검게 그을린 고사목)
      for (let i = 0; i < 7; i++) {
        const x = -13 + rand() * 7, z = -12 + rand() * 6;
        wlBlock(x, z, 0.34); // #95: 퇴장 경로권(r≈9~13)
        const geo = deadTreeGeo(rand, 0.9 + rand() * 1.1, 0x211d18);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        envRoot.add(new THREE.Mesh(geo, vcLambert));
      }
      // 드럼통
      for (let i = 0; i < 3; i++) {
        const x = 5.5 + rand() * 3, z = 6.5 + rand() * 2.5;
        wlBlock(x, z, 0.42); // #95
        Cyl(envRoot, 0.32, 0.32, 0.85, [0x7a4530, 0x5c5f52, 0x6e3e28][i], x, gh(x, z) + 0.42, z, 9);
      }
      // 지평선 너머 연기 기둥 (어딘가는 아직 불타고 있다)
      const smoke = (() => {
        const n = 14, arr = new Float32Array(n * 3), sBase = [], sPhase = [];
        for (let i = 0; i < n; i++) {
          const y = 2 + (i / n) * 13;
          arr.set([24 + Math.sin(i * 1.7) * 0.8, y, -18 + Math.cos(i * 1.3) * 0.8], i * 3);
          sBase.push(y); sPhase.push(rand() * Math.PI * 2);
        }
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        const pts2 = new THREE.Points(geo2, new THREE.PointsMaterial({
          color: 0x6a6f78, size: 7, sizeAttenuation: false, transparent: true, opacity: 0.3,
        }));
        envRoot.add(pts2);
        return { pts: pts2, phase: sPhase };
      })();
      // 낙엽 (두 색)
      const mkLeaves = (color, seed) => {
        const lrand = seededRand(seed);
        const n = 22, arr = new Float32Array(n * 3), lBase = [];
        for (let i = 0; i < n; i++) {
          const x = (lrand() * 2 - 1) * 14, z = (lrand() * 2 - 1) * 12, y = lrand() * 6 + 0.5;
          arr.set([x, y, z], i * 3);
          lBase.push({ ph: lrand() * Math.PI * 2, sp: 0.25 + lrand() * 0.25 });
        }
        const geo2 = new THREE.BufferGeometry();
        geo2.setAttribute('position', new THREE.BufferAttribute(arr, 3));
        const pts2 = new THREE.Points(geo2, new THREE.PointsMaterial({
          color, size: 2.5, sizeAttenuation: false, transparent: true, opacity: 0.85,
        }));
        envRoot.add(pts2);
        return { pts: pts2, meta: lBase };
      };
      const leaves = [mkLeaves(0xa3703f, 61), mkLeaves(0x7d7f5a, 62)];
      // 먼 산
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rand() * 0.8;
        const r = 38 + rand() * 14;
        const mt = new THREE.Mesh(new THREE.ConeGeometry(16 + rand() * 14, 11 + rand() * 7, 6), lamb(0x242e3d));
        mt.position.set(r * Math.cos(a), GY + 2, r * Math.sin(a));
        envRoot.add(mt);
      }
      // 반딧불이
      const n = 26, arr = new Float32Array(n * 3);
      const base = [], phase = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = 8.5 + rand() * 8;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const y = gh(x, z) + 0.5 + rand() * 1.2;
        arr.set([x, y, z], i * 3);
        base.push({ x, y, z }); phase.push(rand() * Math.PI * 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xd9e77a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false,
      }));
      envRoot.add(pts);
      envDyn = { trees, fireflies: { pts, base, phase }, leaves, smoke };
    },
  },

  bus: {
    name: '버려진 스쿨버스', nameEn: 'Abandoned School Bus', emoji: '🚌', unlockAt: 9, viewH: 14, ceilY: 2.0,
    desc: '고속도로 위에 멈춰 선 스쿨버스. 좁지만 어디로든 갈 수 있을 것 같은 기분이 든다.',
    descEn: 'A school bus stalled on the highway. Cramped, but it feels like it could take you anywhere.',
    room: { w: 6.8, d: 2.4, h: 2.2 },
    baseComfort: 3,
    mood: { fog: 0x2a2622, fogNear: 20, fogFar: 54, skyH: 0x3d3830, skyZ: 0x14151d, hemiSky: 0x8a8272, hemiGround: 0x453d33, hemiInt: 0.66, moonC: 0xc9c0a8, moonInt: 0.6, stars: 0.55 },
    weatherPool: ['clear', 'ash', 'rain', 'clear'],
    perk: { timeMult: 0.75, label: '🚌 이동형 거점 — 탐험 소요 시간 -25%', labelEn: '🚌 Mobile base — expedition time -25%' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일', labelEn: 'Fuel 1 / 2 days' },
    maxItems: 8, moveCost: { fuel: 2, parts: 2 }, limits: '📦 좁은 실내 — 가구 최대 8개', limitsEn: '📦 Tight interior — max 8 furniture',
    buildRoom() {
      const { w, d, h } = ROOM;
      const busY = 0x9a7a2f, busD = 0x7a6226;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.22, d + 0.5), wallPhong({ color: 0x6a5a44 }));
      floor.position.y = -0.11; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 좁은 통로 바닥 — 명시 태그(휴리스틱 폭 탈락 방지)
      // (B-①) 실내 측면 패널(하부 노란 철판) 공유 벽지 재질 — 3벽이 공유. 벽지 교체 대상.
      const busWallMat = tagDecoWall(wallPhong({ color: busY })); busWallMat.userData.shared = true;
      // 차대 + 바퀴
      B(roomGroup, w + 0.7, 0.4, d + 0.3, 0x3a3733, 0, -0.42, 0);
      for (const [wx, wz] of [[-w / 2 + 1.1, -d / 2 - 0.2], [-w / 2 + 1.1, d / 2 + 0.2], [w / 2 - 1.1, -d / 2 - 0.2], [w / 2 - 1.1, d / 2 + 0.2]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), lamb(0x1f1d1a));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -0.35, wz);
        wheel.castShadow = true;
        roomGroup.add(wheel);
      }
      // 보닛(앞) + 범퍼
      B(roomGroup, 1.1, 1.0, d + 0.2, busD, w / 2 + 0.6, 0.5, 0);
      B(roomGroup, 0.2, 0.35, d + 0.4, 0x8a8f96, w / 2 + 1.2, 0.3, 0);
      // 벽: 하부 노란 철판 + 상부 창문 띠 (컬링 대상)
      const mkBusWall = (len, seed) => {
        const g = new THREE.Group();
        const rand = seededRand(seed);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(len, 1.0, 0.16), busWallMat); // 하부 측면 패널 = 벽지 대상
        panel.position.set(0, 0.5, 0); panel.castShadow = panel.receiveShadow = true; g.add(panel);
        BP(g, len, 0.14, 0.18, busD, 0, 1.06, 0);
        const nWin = Math.floor(len / 0.95);
        for (let i = 0; i < nWin; i++) {
          const wx = -len / 2 + 0.55 + i * 0.95;
          B(g, 0.8, 0.85, 0.1, rand() < 0.25 ? 0x1c1f26 : 0x2c3644, wx, 1.6, 0);
          B(g, 0.06, 0.95, 0.14, busD, wx + 0.46, 1.6, 0);
        }
        BP(g, len, 0.14, 0.18, busD, 0, 2.1, 0);
        // 녹 얼룩
        for (let i = 0; i < 4; i++) B(g, 0.3 + rand() * 0.4, 0.18, 0.17, 0x6e3e28, -len / 2 + rand() * len, 0.35 + rand() * 0.5, 0);
        return g;
      };
      makeWalls([
        { group: mkBusWall(w, 11), pos: [0, 0, -d / 2 - 0.09], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mkBusWall(w, 12), pos: [0, 0, d / 2 + 0.09], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mkBusWall(d, 13), pos: [-w / 2 - 0.09, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
      ]);
      // 외형 개성화 (#18): 지붕 짐칸(방수포 묶음+짐) + 앞유리 위 행선지 롤사인 — 밋밋한 노란 박스 깨기
      {
        // 지붕 레일 + 묶인 방수포 짐 — 실내를 덮는 지붕 → 천장 컬링 그룹(⑥-a). 롤사인(앞유리 위)은 옆면이라 제외.
        const roofG = new THREE.Group();
        BP(roofG, w * 0.9, 0.06, d * 0.9, lamb(0x3a3733), 0, h + 0.03, 0); // 루프 랙 판
        for (const sx of [-w * 0.35, w * 0.35]) B(roofG, 0.05, 0.12, d * 0.9, 0x55504a, sx, h + 0.09, 0); // 레일
        const bundle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.4, d * 0.7), lamb(0x4a5560));
        bundle.position.set(-w * 0.08, h + 0.24, 0); bundle.rotation.z = 0.02; bundle.castShadow = true; roofG.add(bundle);
        for (const bz of [-d * 0.25, d * 0.25]) B(roofG, w * 0.55, 0.03, 0.03, 0x2a2620, -w * 0.08, h + 0.24, bz); // 결속 끈
        const box = B(roofG, 0.6, 0.4, 0.5, 0x6a5a40, w * 0.28, h + 0.24, d * 0.15); box.castShadow = true; // 잡짐 상자
        tagCeiling(roofG, h + 0.01); roomGroup.add(roofG);
        // 앞유리 위 행선지 롤사인 (보닛 쪽 +x)
        B(roomGroup, 0.1, 0.34, d * 0.7, 0x1c1f26, w / 2 + 0.62, 1.15, 0);
        B(roomGroup, 0.11, 0.24, d * 0.55, 0xc7b25a, w / 2 + 0.63, 1.15, 0);
      }
      blockers = [];
    },
    buildEnv() {
      const GY = -0.8;
      const rand = seededRand(505);
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 0.6 * Math.sin(x * 0.14 + 1) * Math.cos(z * 0.12) + 0.35 * Math.sin(x * 0.3) * Math.sin(z * 0.27);
        return GY + n * THREE.MathUtils.smoothstep(r, 7, 14) + THREE.MathUtils.smoothstep(r, 28, 58) * 2.2;
      };
      const cA = new THREE.Color(0x4a4234), cB = new THREE.Color(0x554a38);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.4 + z * 0.31);
        return cA.clone().lerp(cB, m * 0.7);
      }, gh));
      ogGround(gh, 6, 20, 5, (x, z) => Math.abs(z) > 4.6); // #71: 갓길 수풀 — 도로면(|z|≤4.5)은 제외
      // 갈라진 고속도로 (버스가 서 있는 도로)
      const road = B(envRoot, 90, 0.12, 7, 0x33342f, 0, GY + 0.05, 0);
      road.receiveShadow = true;
      for (let i = 0; i < 22; i++) B(envRoot, 1.4, 0.13, 0.16, 0x8a8a72, -44 + i * 4.2, GY + 0.07, 0);
      // 도로 위 폐차 행렬 + 표지판
      // 폐차 행렬은 도로 위에 서 있다 — 도로 상면(GY+0.11)에 접지 (공중부양 수정)
      buildCarWreck(envRoot, -9, 1.8, 0.15, rand, GY + 0.11);
      buildCarWreck(envRoot, -15.5, -1.6, -2.9, rand, GY + 0.11);
      buildCarWreck(envRoot, 12, -1.9, 3.05, rand, GY + 0.11);
      const sign = new THREE.Group();
      Cyl(sign, 0.05, 0.06, 3.2, 0x55504a, 0, 1.6, 0, 6);
      B(sign, 2.2, 1.0, 0.08, 0x2a4a35, 0, 3.2, 0);
      B(sign, 2.0, 0.14, 0.09, 0x8a9a8c, 0, 3.35, 0);
      B(sign, 1.4, 0.12, 0.09, 0x8a9a8c, -0.2, 3.05, 0);
      sign.rotation.z = 0.12; sign.rotation.y = 0.4;
      sign.position.set(7, GY, 4.2);
      envRoot.add(sign);
      for (let i = 0; i < 16; i++) {
        const a = rand() * Math.PI * 2, r = 9 + Math.pow(rand(), 0.8) * 22;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (Math.abs(z) < 4.5) continue; // 도로 위는 비움
        if (r < 12) wlBlock(x, z, 0.34); // #95
        const geo = deadTreeGeo(rand, 0.8 + rand() * 1.2);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        envRoot.add(new THREE.Mesh(geo, vcLambert));
      }
      buildPowerPole(envRoot, -6, 7, 0.15, gh(-6, 7));
      buildPowerPole(envRoot, 5, -8, -0.1, gh(5, -8));
      buildRuinCity(envRoot, rand, { count: 11, rMin: 30, rMax: 48, hMin: 4, hMax: 12, baseY: GY, litChance: 0.15 });
      envDyn = {};
    },
  },

  subway: {
    name: '지하철 역사', nameEn: 'Subway Station', emoji: '🚇', unlockAt: 12, viewH: 16, ceilY: 2.8, indoor: true,
    desc: '무너진 도시 아래 잠든 승강장. 날씨도 계절도 닿지 않는 곳 — 어둠만 잘 다스리면 최고의 요새다.',
    descEn: 'A platform sleeping beneath the fallen city. Untouched by weather or season — master the dark and it becomes the finest fortress.',
    room: { w: 11, d: 6, h: 3 },
    baseComfort: 6,
    mood: { fog: 0x121417, fogNear: 16, fogFar: 44, skyH: 0x0b0c0e, skyZ: 0x060708, hemiSky: 0x6e7684, hemiGround: 0x3a352e, hemiInt: 0.68, moonC: 0x8a96a6, moonInt: 0.45, stars: 0 },
    weatherPool: ['clear'],
    perk: { lightMult: 1.5, label: '🕯️ 어둠 속 안식 — 조명 쾌적함 효과 1.5배', labelEn: '🕯️ Rest in the dark — lighting comfort effect ×1.5' },
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (환기 팬)', labelEn: 'Battery 1 / day (ventilation fan)' },
    needsLight: 12, moveCost: { battery: 2, material: 3 }, limits: '🌑 완전한 어둠 — 켜진 조명이 하나도 없으면 쾌적함 -12', limitsEn: '🌑 Total darkness — comfort -12 if no light is lit',
    buildRoom() {
      const { w, d, h } = ROOM;
      const conc = wallPhong({ map: concreteTex });
      conc.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), conc.clone());
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 승강장 바닥재 대상 (conc.clone으로 벽 타일과 분리)
      const tileMat = wallPhong({ map: subwayTileTex });
      tileMat.userData.shared = true;
      // #87 스윕: 조명 전무 시 벽 존재 자체가 안 읽히던 것 — 타일에 미세 자기조도(벽지 교체돼도 유지).
      tileMat.emissive = new THREE.Color(0x0a0c10);
      tagDecoWall(tileMat); // (B-①) 승강장 안쪽 타일 벽 = 벽지 대상 (기둥도 같은 타일 — 함께 교체됨)
      // 뒷벽(타일) + 역명판 + 노선도
      const back = new THREE.Group();
      const bw = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.24), tileMat);
      bw.position.y = h / 2; bw.castShadow = bw.receiveShadow = true;
      back.add(bw);
      const signBd = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 0.08), lamb(0x1d3a2a));
      signBd.position.set(-1.5, 2.1, 0.16); back.add(signBd);
      const signTx = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.09), lamb(0xd8d3c8));
      signTx.position.set(-1.5, 2.1, 0.17); back.add(signTx);
      const mapBd = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), lamb(0x2a3040));
      mapBd.position.set(2.4, 1.6, 0.16); back.add(mapBd);
      makeWalls([
        { group: back, pos: [0, 0, -d / 2 - 0.13], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
      ]);
      // ⑥-c 천장 슬래브: 벽 top(y=h)에 맞닿게 내려 접합(이격 0). 슬래브 두께 0.2 → 중심 y=h+0.1이면 바닥면이 y=h.
      //   (구: y=h+0.85로 떠 있어 "천장이 벽과 분리돼 공중부양"으로 보이던 버그.) 공통 천장 컬링에 등록(부감 투시).
      const ceilY = h + 0.1;
      // 승강장 기둥 2개 (고정 소품) — 바닥부터 천장 슬래브 바닥면(y=h)까지 꽉 채워 접합.
      for (const px of [-w / 4, w / 4]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), tileMat);
        col.position.set(px, h / 2, 0.4);
        col.castShadow = col.receiveShadow = true;
        roomGroup.add(col);
        B(roomGroup, 0.7, 0.12, 0.7, 0x4e4e4c, px, 0.06, 0.4);
      }
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.2, d + 0.6), lamb(0x1c1e22));
      ceil.position.y = ceilY;
      tagCeiling(ceil, h); roomGroup.add(ceil);
      // 매달린 표지판 — 천장 바닥면(y=h)에서 아래로 늘어뜨린다(구: 떠 있던 천장 기준이라 h+0.15~0.55였음).
      const hang = new THREE.Group();
      Cyl(hang, 0.02, 0.02, 0.34, 0x3a3733, -0.5, h - 0.17, 0, 5);
      Cyl(hang, 0.02, 0.02, 0.34, 0x3a3733, 0.5, h - 0.17, 0, 5);
      B(hang, 1.6, 0.4, 0.06, 0x1d3a2a, 0, h - 0.5, 0);
      B(hang, 0.5, 0.2, 0.07, 0xd8d3c8, -0.4, h - 0.5, 0);
      hang.position.set(1.5, 0, 1.2);
      roomGroup.add(hang);
      // 승강장 가장자리 경고선 + 선로
      B(roomGroup, w + 0.6, 0.06, 0.3, 0xa89a4a, 0, 0.03, d / 2 + 0.15);
      // #87 스윕(디렉터: "공간이 안 읽힘"): 지하 무드는 지키되 윤곽 최소 조도 —
      //   기둥 비상등 2개(주황 픽스처) + 중앙 저강도 점광 1개 + 뒷벽 출구 표지(연녹 자기발광).
      //   조명 예산: PointLight 1개 추가(그림자 없음), 나머지는 emissive 픽스처.
      for (const px of [-w / 4, w / 4]) {
        const fx = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.12),
          new THREE.MeshLambertMaterial({ color: 0xff9a4a, emissive: 0xb55a20, emissiveIntensity: 0.9 }));
        fx.position.set(px, h - 0.32, 0.4 + 0.36); roomGroup.add(fx);
      }
      const emg = new THREE.PointLight(0xff9a4a, 0.34, 9.5, 1.6);
      emg.position.set(0, h - 0.5, 0.4); roomGroup.add(emg);
      const exitSign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x5fae6a, emissive: 0x2c6a3a, emissiveIntensity: 1.1 }));
      exitSign.position.set(-w / 3, h - 0.42, -d / 2 + 0.18); roomGroup.add(exitSign);
      blockers = [
        { x: -w / 4, z: 0.4, w: 0.7, d: 0.7 },
        { x: w / 4, z: 0.4, w: 0.7, d: 0.7 },
      ];
    },
    buildEnv() {
      // 지하: 어둠 + 선로 + 터널 아치
      const rand = seededRand(606);
      const { w, d, h } = ROOM;
      // 선로 바닥 (승강장보다 낮음) — #87: 순흑 덩어리로 읽히던 것(디렉터 "검은 벽") → 한 단 밝혀
      //   '아래로 꺼진 공간'으로. 레일도 하이라이트 한 단 — 어둠 속에서 선로가 선로로 읽힌다.
      B(envRoot, w + 14, 0.2, 3.4, 0x1e2026, 0, -1.0, d / 2 + 2.1);
      for (const rz of [d / 2 + 1.4, d / 2 + 2.8]) {
        B(envRoot, w + 14, 0.1, 0.14, 0x5c564a, 0, -0.72, rz);
      }
      for (let i = 0; i < 18; i++) B(envRoot, 0.5, 0.08, 1.8, 0x33302a, -w / 2 - 6 + i * 1.3, -0.82, d / 2 + 2.1);
      // 터널 아치 입구 (양쪽)
      for (const side of [-1, 1]) {
        const tx = side * (w / 2 + 4.5);
        const arch = new THREE.Group();
        B(arch, 0.8, 4.2, 5.5, 0x202226, 0, 1.4, 0);
        const hole = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 3.2), lamb(0x050506));
        hole.position.set(0, 0.6, d / 2 + 2.1 - 0);
        arch.position.set(tx, 0, 0);
        arch.add(hole);
        envRoot.add(arch);
      }
      // 반대편 벽 (선로 건너)
      const farWall = new THREE.Mesh(new THREE.BoxGeometry(w + 14, 5, 0.4), lamb(0x191b1e));
      farWall.position.set(0, 1.5, d / 2 + 4.0);
      envRoot.add(farWall);
      // 벽의 광고판 잔해 (희미하게)
      for (let i = 0; i < 3; i++) {
        B(envRoot, 1.6, 1.0, 0.1, [0x2a3040, 0x3a2a2a, 0x2a3a30][i], -3 + i * 3.5, 1.6, d / 2 + 3.78);
      }
      // 버려진 지하철 차량 실루엣 (터널 안쪽)
      const train = new THREE.Group();
      B(train, 6, 2.2, 2.4, 0x23262b, 0, 1.1, 0);
      for (let i = 0; i < 4; i++) B(train, 0.8, 0.7, 0.1, 0x11141a, -2.2 + i * 1.4, 1.4, 1.26);
      train.position.set(w / 2 + 8.5, -0.9, d / 2 + 2.1);
      envRoot.add(train);
      // 어둠 속 비상등 (붉은 점광)
      const em = new THREE.PointLight(0xff4030, 6, 9, 1.8);
      em.position.set(-w / 2 - 3, 2.2, 0);
      envRoot.add(em);
      const emg = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0xff6650, emissive: 0xcc2211, emissiveIntensity: 1.2 }));
      emg.position.copy(em.position);
      envRoot.add(emg);
      envDyn = { fire: em, fireBase: 6 };
      // #71: 지하는 잠식 스킵(햇빛 없음 — 건물/지면/전신주 대상 없음). 오더 명시 예외로
      //   승강장 가장자리·선로 바닥의 물때 이끼만 소량 허용(습기 연출, 평면 존 패치).
      ogZone(0, d / 2 + 2.1, w + 8, 2.6, -0.9, 3); // 선로 바닥(승강장 밖)
      ogZone(0, d / 2 - 0.2, w * 0.9, 0.8, 0, 2);  // 승강장 가장자리 띠(경고선 안쪽 얇게)
      // 1.2 선로 복구 현장 오브젝트 (site='railSegment') — 허브 승격 후 노출. 구간 진행에 따라 자란다.
      buildRailSegments(w, d, h);
    },
  },

  greenhouse: {
    name: '온실', nameEn: 'Greenhouse', emoji: '🌿', unlockAt: 15, viewH: 16, ceilY: 2.6,
    desc: '기적처럼 남아 있는 유리 온실. 세상이 멸망해도 흙에서는 여전히 싹이 튼다.',
    descEn: 'A glass greenhouse that survived as if by miracle. Even at the end of the world, seeds still sprout from the soil.',
    room: { w: 9, d: 6, h: 2.4 },
    baseComfort: 8,
    mood: { fog: 0x1c2426, fogNear: 22, fogFar: 60, skyH: 0x22333a, skyZ: 0x0a1016, hemiSky: 0x8aa8a0, hemiGround: 0x3f4438, hemiInt: 0.72, moonC: 0xa8c4c0, moonInt: 0.7, stars: 0.8 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    perk: { produce: { food: 1 }, produceNote: '🌿 온실 텃밭에서 수확했습니다', produceNoteEn: '🌿 Harvested from the greenhouse garden', label: '🌿 텃밭 — 매일 음식 +1', labelEn: '🌿 Garden — food +1 daily' },
    upkeep: { res: 'water', n: 1, every: 1, label: '깨끗한 물 1 / 일 (급수)', labelEn: 'Clean water 1 / day (irrigation)' },
    stormRepair: ['snow'], moveCost: { material: 3, water: 2 },
    limits: '❄️ 유리 지붕 — 눈 오는 날엔 건축재 1로 보수 (없으면 청결 -8)', limitsEn: '❄️ Glass roof — snowy days need 1 material to patch (else cleanliness -8)',
    noWallpaper: true, // (B-①) 유리 벽 — 벽지 미대상. 바닥재만 가능.
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ color: 0x6b5a44 }));
      floor.position.y = -0.125; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 온실 흙바닥 → 바닥재 대상
      B(roomGroup, w + 0.9, 0.4, d + 0.9, 0x4a4640, 0, -0.42, 0);
      // 유리벽 (반투명 + 흰 프레임, 컬링 대상)
      const mkGlass = (len, seed) => {
        const g = new THREE.Group();
        const rand = seededRand(seed);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.06),
          wallPhong({ color: 0xbcd8d4, transparent: true, opacity: 0.22 }));
        glass.position.y = h / 2;
        g.add(glass);
        const fm = wallPhong({ color: 0xcfc8ba });
        for (let x = -len / 2; x <= len / 2 + 0.01; x += len / Math.round(len / 1.1)) {
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.1), fm);
          f.position.set(x, h / 2, 0); f.castShadow = true; g.add(f);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.1, 0.12), fm);
        top.position.y = h; g.add(top);
        const bot = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.14, 0.12), fm);
        bot.position.y = 0.07; g.add(bot);
        // 깨진 유리 자국
        if (rand() < 0.7) B(g, 0.5 + rand() * 0.4, 0.5, 0.07, 0x2a3438, -len / 2 + 1 + rand() * (len - 2), 1.2 + rand() * 0.8, 0);
        return g;
      };
      makeWalls([
        { group: mkGlass(w, 31), pos: [0, 0, -d / 2 - 0.08], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mkGlass(w, 32), pos: [0, 0, d / 2 + 0.08], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mkGlass(d, 33), pos: [-w / 2 - 0.08, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mkGlass(d, 34), pos: [w / 2 + 0.08, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 외형 개성화 (#18): 깨진 지붕 채광창에 덧댄 반투명 비닐 + 이음 각목 + 지붕 능선 골조 — 밋밋한 유리 박스 깨기
      // ⑥-a: 유리 지붕 능선+비닐 패치도 실내 상부를 덮으므로 천장 컬링 그룹에 묶어 부감에서 투시.
      {
        const roofG = new THREE.Group();
        // 지붕 능선 골조 (양 처마 → 용마루)
        B(roofG, w + 0.2, 0.08, 0.08, 0xcfc8ba, 0, h + 0.04, 0);
        for (const sz of [-d / 2, 0, d / 2]) B(roofG, w + 0.1, 0.06, 0.06, 0xbfb8aa, 0, h + 0.02, sz);
        // 찢어진 곳에 덧댄 비닐 패치 2장 (반투명, 살짝 처짐)
        for (const [px, pz, s] of [[-w * 0.22, d * 0.18, 1.0], [w * 0.26, -d * 0.14, 0.8]]) {
          const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.0 * s, 0.04, 1.5 * s),
            wallPhong({ color: 0xcdd8d0, transparent: true, opacity: 0.5 }));
          tarp.position.set(px, h + 0.06, pz); tarp.rotation.z = 0.06; tarp.rotation.x = -0.04; tarp.castShadow = true;
          roofG.add(tarp);
          // 고정 각목
          B(roofG, 2.1 * s, 0.05, 0.05, 0x8a6a48, px, h + 0.09, pz - 0.7 * s);
        }
        tagCeiling(roofG, h + 0.01); roomGroup.add(roofG);
      }
      // 고정 텃밭 화단 2개 (뒤쪽)
      const bed = (bx) => {
        const g = new THREE.Group();
        B(g, 2.4, 0.35, 0.9, 0x6a4f33, 0, 0.18, 0);
        B(g, 2.3, 0.1, 0.8, 0x3a2f22, 0, 0.4, 0);
        const rand = seededRand(bx * 7 + 3);
        for (let i = 0; i < 6; i++) {
          const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09 + rand() * 0.08, 0), lamb([0x5f8a52, 0x6f9a5a, 0x7aa862][i % 3]));
          sp.position.set(-1 + i * 0.4, 0.5, (rand() - 0.5) * 0.5);
          sp.castShadow = true;
          g.add(sp);
        }
        g.position.set(bx, 0, -ROOM.d / 2 + 0.75);
        roomGroup.add(g);
      };
      bed(-2.6); bed(2.6);
      blockers = [
        { x: -2.6, z: -d / 2 + 0.75, w: 2.6, d: 1.1 },
        { x: 2.6, z: -d / 2 + 0.75, w: 2.6, d: 1.1 },
      ];
    },
    buildEnv() {
      const GY = -0.75;
      const rand = seededRand(707);
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 0.7 * Math.sin(x * 0.13) * Math.cos(z * 0.12 + 1) + 0.4 * Math.sin(x * 0.29 + 0.5) * Math.sin(z * 0.25);
        return GY + n * THREE.MathUtils.smoothstep(r, 6.5, 13) + THREE.MathUtils.smoothstep(r, 26, 55) * 2.4;
      };
      const cA = new THREE.Color(0x44543c), cB = new THREE.Color(0x54503c), cC = new THREE.Color(0x3a5044);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.42 + z * 0.3) * Math.cos(z * 0.35 - x * 0.2);
        return cA.clone().lerp(cB, m * 0.6).lerp(cC, 0.3);
      }, gh));
      ogGround(gh, 5.5, 18, 6); // #71: 버려진 농지 주변 수풀 클러스터(연차 비례)
      // 버려진 밭이랑 (줄지어 솟은 두둑)
      for (let row = 0; row < 5; row++) {
        const rz = 6 + row * 1.6;
        const ridge = B(envRoot, 14, 0.3, 0.7, 0x4a3f30, -3, gh(-3, rz) + 0.1, rz);
        ridge.receiveShadow = true;
        for (let i = 0; i < 8; i++) {
          if (rand() < 0.4) continue;
          // #92 접지: 고정 +0.35가 크기 따라 이랑 위에 떠 보이던 것 — 반지름 비례로 두둑 상면(+0.25)에 심는다
          const r0 = 0.1 + rand() * 0.1;
          const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(r0, 0), lamb(rand() < 0.5 ? 0x5a6a42 : 0x6a5f3a));
          sp.position.set(-9.5 + i * 1.8, gh(-3, rz) + 0.25 + r0 * 0.55, rz + (rand() - 0.5) * 0.3);
          envRoot.add(sp);
        }
      }
      // 풍차 (천천히 도는 날개)
      const mill = new THREE.Group();
      Cyl(mill, 0.12, 0.3, 6.5, 0x55504a, 0, 3.25, 0, 6);
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const bl = B(blades, 0.24, 2.2, 0.05, 0x8a857a, 0, 1.2, 0);
        bl.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), i * Math.PI / 2);
        bl.rotation.z = i * Math.PI / 2;
      }
      blades.position.set(0, 6.3, 0.35);
      mill.add(blades);
      mill.position.set(-11, gh(-11, -7), -7);
      mill.rotation.y = 0.8;
      envRoot.add(mill);
      // 월드 소품 증량 (#18): 셸터 옆 타이어 더미 + 드럼통 + 기울어진 표지판 (전부 gh 접지)
      {
        const hw = ROOM.w / 2;
        const px = hw + 2.2, pz = 2.5;
        const gy = gh(px, pz);
        for (let i = 0; i < 3; i++) { const ty = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 6, 12), lamb(0x1f1d1a)); ty.rotation.x = Math.PI / 2; ty.position.set(px + (i % 2) * 0.1, gy + 0.14 + i * 0.22, pz); ty.castShadow = true; envRoot.add(ty); }
        wlBlock(px, pz, 0.55); wlBlock(px + 0.9, pz - 0.8, 0.42); // #95: 타이어 더미 + 드럼통 (밴드 내 r≈6)
        Cyl(envRoot, 0.32, 0.32, 0.85, 0x5c5f52, px + 0.9, gh(px + 0.9, pz - 0.8) + 0.42, pz - 0.8, 9).castShadow = true;
        const sign = new THREE.Group();
        Cyl(sign, 0.04, 0.05, 2.0, 0x55504a, 0, 1.0, 0, 5);
        B(sign, 1.0, 0.6, 0.06, 0x3a5a3a, 0, 1.9, 0);
        sign.position.set(-hw - 2.0, gh(-hw - 2.0, 1.5), 1.5); sign.rotation.z = 0.16; sign.rotation.y = -0.5;
        envRoot.add(sign);
        wlBlock(-hw - 2.0, 1.5, 0.3); // #95: 표지판 기둥
      }
      // 고사목 + 들풀
      const tufts = [];
      for (let i = 0; i < 200; i++) {
        const a = rand() * Math.PI * 2, r = 5.5 + Math.pow(rand(), 0.7) * 20;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const th = 0.2 + rand() * 0.35;
        const tg = new THREE.ConeGeometry(0.06 + rand() * 0.07, th, 4);
        tg.translate(x, gh(x, z) + th / 2, z);
        tufts.push(paintGeo(tg, [0x55663f, 0x6a7047, 0x4a5c3c][Math.floor(rand() * 3)]));
      }
      envRoot.add(new THREE.Mesh(mergeGeometries(tufts), vcLambert));
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI * 2, r = 11 + rand() * 16;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        if (r < 12) wlBlock(x, z, 0.34); // #95
        const geo = deadTreeGeo(rand, 0.9 + rand() * 1.1);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z), z);
        envRoot.add(new THREE.Mesh(geo, vcLambert));
      }
      buildRuinCity(envRoot, rand, { count: 10, rMin: 30, rMax: 46, hMin: 4, hMax: 11, baseY: GY, litChance: 0.1 });
      // 반딧불이
      const n = 20, arr = new Float32Array(n * 3);
      const base = [], phase = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = 6 + rand() * 9;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const y = gh(x, z) + 0.5 + rand() * 1.2;
        arr.set([x, y, z], i * 3);
        base.push({ x, y, z }); phase.push(rand() * Math.PI * 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xd9e77a, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false,
      }));
      envRoot.add(pts);
      envDyn = { fireflies: { pts, base, phase }, windmill: blades };
    },
  },

  ship: {
    name: '여객선 선실', nameEn: 'Liner Cabin', emoji: '🚢', unlockAt: 18, viewH: 17, ceilY: 2.5,
    desc: '해안에 좌초된 여객선의 갑판. 파도 소리와 함께 잠들고, 아침엔 낚싯대를 드리운다.',
    descEn: 'The deck of a passenger liner run aground on the coast. You sleep to the sound of waves and cast a line at dawn.',
    room: { w: 10, d: 7, h: 0.9 },
    baseComfort: 7,
    mood: { fog: 0x16222c, fogNear: 20, fogFar: 56, skyH: 0x1e3040, skyZ: 0x0a1018, hemiSky: 0x7d94b0, hemiGround: 0x3a3d40, hemiInt: 0.68, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.9 },
    weatherPool: ['clear', 'rain', 'rain', 'snow'],
    perk: { failSalvage: true, produce: { food: 1 }, produceNote: '🎣 밤낚시로 물고기를 잡았습니다', produceNoteEn: '🎣 Caught a fish with night fishing', label: '🎣 낚시 — 매일 음식 +1 · 탐험 실패에도 자원 일부 회수', labelEn: '🎣 Fishing — food +1 daily · salvage some resources even on failed expeditions' },
    upkeep: { res: 'parts', n: 1, every: 3, label: '부품 1 / 3일 (배수 펌프)', labelEn: 'Parts 1 / 3 days (bilge pump)' },
    dailyDirt: 2, moveCost: { parts: 3, material: 2 }, limits: '💧 바다의 습기 — 청결이 매일 2 더 빨리 떨어짐', limitsEn: '💧 Sea damp — cleanliness drops 2 faster each day',
    // (B-②) 연안 페리 외형 리워크: 흰 상부 구조 + 측면 연속 창문 줄 + 선체 적/청 밴드 + 2층 데크 실루엣 +
    //   난간 + 소형 굴뚝. ROOM 인테리어(치수/가구 좌표/이주 로직/퍽) 불변 — 외형 메시만 교체.
    // (v1.5 페리 리워크 — 디렉터 확정안) "옥탑방처럼 갑판 위에 슬레이트 간이집을 짓고 산다":
    //   갑판(-z 구석)에 옥탑(#53) 문법의 판자 가벽 3면 + 슬레이트 지붕 간이집. 나머지 갑판 = 배치 가능 야드.
    //   선실(백드롭 상부구조)은 잠긴 철문 소품으로 봉합("아래층 침수" — lore shp1). ROOM 10×7 불변(가구 마이그레이션 불필요).
    //   태양광/빗물받이 앵커(SHELTER_MOUNTS.ship)는 간이집 지붕/처마로 이동.
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), wallPhong({ color: 0x7a6248 }));
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 선실 바닥재 대상
      for (let i = 0; i < 8; i++) B(roomGroup, w + 0.6, 0.02, 0.06, 0x5d452c, 0, 0.02, -d / 2 + 0.4 + i * 0.85);
      // ── 선체: 흰 선측 + 적/청 도색 밴드 (연안 페리 특유의 색띠) + 어두운 흘수선 ──
      B(roomGroup, w + 1.6, 3.0, d + 1.6, 0xdad6cc, 0, -1.75, 0);          // 흰 선측 상부
      B(roomGroup, w + 1.62, 0.42, d + 1.62, 0xb43b30, 0, -0.55, 0);       // 적색 밴드
      B(roomGroup, w + 1.62, 0.42, d + 1.62, 0x2f5f8a, 0, -1.05, 0);       // 청색 밴드
      B(roomGroup, w + 1.7, 2.4, d + 1.7, 0x4a2f28, 0, -3.5, 0);           // 하부 선체(흘수 아래)
      B(roomGroup, w + 1.8, 0.7, d + 1.8, 0x1f1a17, 0, -5.6, 0);           // 용골 밑동
      // 흰 난간 (항상 표시)
      const mkRail = (len, x, z, rotY) => {
        const g = new THREE.Group();
        const fm = lamb(0xc8c4b8);
        for (let i = 0; i <= Math.round(len / 1.1); i++) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, h, 0.08), fm);
          p.position.set(-len / 2 + i * (len / Math.round(len / 1.1)), h / 2, 0);
          p.castShadow = true; g.add(p);
        }
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.08, 0.1), fm);
        rail.position.y = h; g.add(rail);
        const mid = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.05, 0.08), lamb(0xa8a49a));
        mid.position.y = h * 0.55; g.add(mid);
        g.position.set(x, 0, z); g.rotation.y = rotY;
        roomGroup.add(g);
      };
      mkRail(w + 0.5, 0, d / 2 + 0.25, 0);
      mkRail(d + 0.5, -w / 2 - 0.25, 0, Math.PI / 2);
      mkRail(d + 0.5, w / 2 + 0.25, 0, Math.PI / 2);
      wallList = [];
      // ── 선실 벽(선수미 방향 뒤쪽, -z) = 흰 상부 구조 + 연속 창문 줄. 벽지 대상 + 컬링. ──
      //   높이 2.5 유지(상단 y=2.5). (v1.5) 태양광/빗물받이 앵커는 간이집 지붕/처마로 이동 — 이 벽엔 마운트 없음.
      const cabinMat = tagDecoWall(wallPhong({ color: 0xdad6cc })); cabinMat.userData.shared = true;
      const cabinW = new THREE.Group();
      const CWH = 2.5;
      const cw = new THREE.Mesh(new THREE.BoxGeometry(w, CWH, 0.3), cabinMat);
      cw.position.y = CWH / 2; cw.castShadow = cw.receiveShadow = true;
      cabinW.add(cw);
      // 연속 창문 줄 (긴 띠 유리 + 창틀 멀리언) — 페리 여객 라운지 창
      const bandY = 1.55, bandH = 0.8;
      const band = new THREE.Mesh(new THREE.BoxGeometry(w - 1.2, bandH, 0.14), lamb(0x243746));
      band.position.set(-0.3, bandY, 0.16); cabinW.add(band);
      const bandTop = new THREE.Mesh(new THREE.BoxGeometry(w - 1.0, 0.1, 0.18), lamb(0x9a958a));
      bandTop.position.set(-0.3, bandY + bandH / 2 + 0.05, 0.16); cabinW.add(bandTop);
      const bandBot = bandTop.clone(); bandBot.position.y = bandY - bandH / 2 - 0.05; cabinW.add(bandBot);
      const nMul = Math.floor((w - 1.2) / 0.85);
      for (let i = 0; i <= nMul; i++) {
        const mx = -0.3 - (w - 1.2) / 2 + i * ((w - 1.2) / nMul);
        B(cabinW, 0.07, bandH, 0.16, 0x9a958a, mx, bandY, 0.17);
      }
      // 여객 승강문(우현 쪽) → 잠긴 철문 (v1.5: 벙커 후면 잠긴문 문법 축소판 — "선실은 잠겨 있다").
      //   갑판 쪽(+z) 면 소품이라 cabinW 자식으로 넣어 선실 벽 컬링과 함께 숨긴다(⑤ 허공 부유 방지).
      const steelMat = wallPhong({ map: metalTex }); steelMat.userData.shared = true;
      const steelDoor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.1), steelMat);
      steelDoor.position.set(3.9, 0.95, 0.18); steelDoor.castShadow = steelDoor.receiveShadow = true;
      cabinW.add(steelDoor);
      B(cabinW, 1.02, 2.0, 0.06, 0x8a857a, 3.9, 1.0, 0.14); // 문틀
      for (const sx of [-1, 1]) B(cabinW, 0.07, 1.7, 0.05, 0x3d444c, 3.9 + sx * 0.28, 0.95, 0.24); // 세로 보강 리브
      B(cabinW, 1.06, 0.13, 0.12, 0x55504a, 3.9, 1.12, 0.26).castShadow = true; // 가로 빗장 (잠김을 명확히)
      B(cabinW, 0.2, 0.26, 0.16, 0x2f2b26, 3.9, 1.12, 0.3); // 자물쇠 뭉치
      for (const [bx, by] of [[-0.36, 0.35], [0.36, 0.35], [-0.36, 1.55], [0.36, 1.55]])
        Cyl(cabinW, 0.03, 0.03, 0.05, 0x2a2622, 3.9 + bx, by, 0.24, 5); // 볼트 자국
      B(cabinW, 0.44, 0.3, 0.03, 0x9a7a2a, 3.9, 1.62, 0.24); // 빛바랜 경고 표식(글자 없는 색면)
      // 옅은 녹/때 줄무늬 (세월감)
      const rr = seededRand(21);
      for (let i = 0; i < 4; i++) {
        const rust = new THREE.Mesh(new THREE.BoxGeometry(0.15 + rr() * 0.22, 0.5 + rr() * 0.7, 0.05), lamb(0x9a7358));
        rust.position.set(-w / 2 + 1 + rr() * (w - 2), 0.55 + rr() * 0.9, 0.17);
        cabinW.add(rust);
      }
      cabinW.position.set(0, 0, -d / 2 - 0.28);
      // ★ 컬링 등록은 아래 간이집 벽 3면과 함께 makeWalls 1회로 일괄 — makeWalls가 wallList를 리셋하므로
      //   따로 호출하면 먼저 등록한 벽이 목록에서 사라진다(옥탑 문법: 벽 전부를 한 번에 등록).
      // ── 2층 데크 실루엣: 선실 지붕(=1층 천장) + 2층 상부 구조 + 상부 난간 + 창 ──
      //   지붕은 실내 상부를 덮으므로 천장 컬링 등록(⑥-a/배치A 부감 투시). 선실 벽 뒤(-z)에 얹는다.
      const superZ = -d / 2 - 0.28;             // 선실 벽면 z
      const deck2 = new THREE.Group();
      const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.18, 2.4), lamb(0xcfcabf));
      roofSlab.position.set(0, CWH + 0.09, superZ - 0.9); roofSlab.castShadow = roofSlab.receiveShadow = true;
      deck2.add(roofSlab);
      tagCeiling(roofSlab, CWH);                 // 부감에서 1층 천장(지붕) 투시
      // 2층 벽체(뒤로 물러난 상부 구조) — 흰 벽 + 작은 창 줄
      const upH = 1.7;
      const upWall = new THREE.Mesh(new THREE.BoxGeometry(w - 1.0, upH, 1.8), lamb(0xdad6cc));
      upWall.position.set(0, CWH + 0.18 + upH / 2, superZ - 1.1); upWall.castShadow = true; deck2.add(upWall);
      const upBand = new THREE.Mesh(new THREE.BoxGeometry(w - 2.0, 0.5, 0.12), lamb(0x243746));
      upBand.position.set(0, CWH + 0.18 + upH * 0.62, superZ - 1.1 + 0.9); deck2.add(upBand);
      for (let i = 0; i <= 6; i++) B(deck2, 0.06, 0.5, 0.14, 0x9a958a, -(w - 2.0) / 2 + i * ((w - 2.0) / 6), CWH + 0.18 + upH * 0.62, superZ - 1.1 + 0.9);
      // 상부 데크 난간(선실 지붕 앞쪽 가장자리)
      const upRail = new THREE.Group();
      const rfm = lamb(0xc8c4b8);
      for (let i = 0; i <= Math.round((w) / 1.0); i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), rfm); p.position.set(-w / 2 + i * (w / Math.round(w / 1.0)), 0.25, 0); upRail.add(p); }
      const upTop = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.06, 0.08), rfm); upTop.position.y = 0.5; upRail.add(upTop);
      upRail.position.set(0, CWH + 0.18, superZ + 0.15); deck2.add(upRail);
      roomGroup.add(deck2);
      // ── 소형 굴뚝(페리 색띠 도색) — 2층 상부 구조 뒤 ──
      const funnel = new THREE.Group();
      const fbody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.8, 12), lamb(0xdad6cc));
      fbody.position.y = 0.9; funnel.add(fbody);
      B(funnel, 1.18, 0.4, 1.05, 0xb43b30, 0, 1.35, 0); // 적색 띠 (박스로 감싸 색띠 강조)
      const fcap = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.18, 12), lamb(0x2a2622));
      fcap.position.y = 1.82; funnel.add(fcap);
      funnel.position.set(1.6, CWH + 0.18 + upH, superZ - 1.1);
      funnel.rotation.z = 0.03; funnel.children.forEach(c => c.castShadow = true);
      roomGroup.add(funnel);
      // 마스트 + 삼각기 (실루엣 포인트)
      Cyl(roomGroup, 0.04, 0.05, 2.2, 0x55504a, -2.6, CWH + 0.18 + upH + 1.1, superZ - 0.6, 5);
      B(roomGroup, 0.5, 0.3, 0.02, 0xc45540, -2.35, CWH + 0.18 + upH + 1.7, superZ - 0.6);
      // 낚싯대 + 구명튜브 (고정 소품)
      const rod = new THREE.Group();
      Cyl(rod, 0.02, 0.03, 2.2, 0x6a4f33, 0, 1.0, 0, 5).rotation.z = -0.7;
      B(rod, 0.15, 0.4, 0.15, 0x55504a, -0.35, 0.2, 0);
      rod.position.set(w / 2 - 0.7, 0, d / 2 - 0.6);
      roomGroup.add(rod);
      // 구명튜브 — 간이집(-x 구석)과 겹치던 좌현 자리에서 잠긴 철문 옆(우현)으로 이동. 선실 벽면 소품이라
      //   makeWalls 뒤 attachToWall로 -z 벽 컬링에 편입(벽이 숨을 때 허공에 남지 않게 — ⑤).
      const buoyRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 12), lamb(0xc45540));
      buoyRing.position.set(2.6, 1.4, -d / 2 - 0.1);
      roomGroup.add(buoyRing);

      // ── (v1.5) 갑판 위 간이집 — 옥탑(#53) 가벽 문법 복제: 판자+방수포 벽 3면 + 슬레이트 지붕 ──
      //   뒷면(-z)은 선실 벽이 겸한다. 좌표는 절대값 고정(-z/-x 구석) — 증축(extension, ROOM.w+2)은
      //   갑판 폭만 넓히고 간이집은 그대로다(선실 벽·잠긴 철문 x3.9도 불변).
      //   치수: 5.6×3.4×2.35. 벽 평면: 앞 z=-0.01, 좌 x=-4.59, 우 x=1.19 (내부 x∈[-4.5,1.1], z∈[-3.5,-0.1]).
      const SW = 5.6, SD = 3.4, SH = 2.35;              // 간이집 폭/깊이/벽높이
      const SCX = -1.7, SCZ = -1.8, SFZ = SCZ + SD / 2 + 0.09; // 중심 x/z, 앞벽 평면 z(-0.01)
      const plyMat = wallPhong({ map: plywoodTex }); plyMat.userData.shared = true;
      tagDecoWall(plyMat); // (B-①) 간이집 합판 낱장 — 벽지 대상 (옥탑과 동일)
      const panelCols = [0x8a7350, 0x6e6350, 0x7d6a4a, 0x5f6a6e, 0x86745a, 0x655b48, 0x6a6660];
      // 목재 모서리 기둥 4개 (컬링 무관 골조 — 옥탑 콘크리트 기둥의 목재판). 뒷기둥은 선실 벽면에 밀착.
      for (const [px, pz] of [[SCX - SW / 2 - 0.09, SFZ], [SCX + SW / 2 + 0.09, SFZ], [SCX - SW / 2 - 0.09, -3.56], [SCX + SW / 2 + 0.09, -3.56]])
        B(roomGroup, 0.14, SH + 0.06, 0.14, 0x4a3f30, px, (SH + 0.06) / 2, pz);
      const pr = seededRand(58);
      // 판자벽 빌더 (옥탑 mkPatchWall 문법 + 창 개구부): doorC/winC = 개구 중심 비율(0~1). 컬링 그룹 반환.
      const mkShWall = (len, o = {}) => {
        const g = new THREE.Group();
        const doorW = o.doorC != null ? 1.3 : 0, winW = o.winC != null ? 0.95 : 0;
        const doorS = o.doorC != null ? o.doorC * len - len / 2 - doorW / 2 : 0, doorE = doorS + doorW;
        const winS = o.winC != null ? o.winC * len - len / 2 - winW / 2 : 0, winE = winS + winW;
        let x = -len / 2;
        const board = 0.44;
        while (x < len / 2 - 0.02) {
          const bw = Math.min(board + (pr() - 0.5) * 0.18, len / 2 - x);
          const cx = x + bw / 2;
          const inDoor = o.doorC != null && cx > doorS - bw / 2 && cx < doorE + bw / 2;
          const inWin = o.winC != null && cx > winS - bw / 2 && cx < winE + bw / 2;
          const mat = pr() < 0.5 ? plyMat : wallPhong({ color: panelCols[Math.floor(pr() * panelCols.length)] });
          if (inDoor) {
            const lh = SH - 1.8; // 문 위 상인방 (짧은 판)
            const p = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, lh, 0.09), mat);
            p.position.set(cx, SH - lh / 2, 0); p.castShadow = p.receiveShadow = true; g.add(p);
          } else if (inWin) {
            // 창 개구부: [winS,winE] 구간만 아래턱(0~1.05)+위(1.75~벽높이)로 절개하고,
            // 개구부 밖으로 걸친 자투리는 전고 판자로 남긴다 — 창이 창틀보다 넓게 뚫리지 않게(문간과 달리 벽 중앙 구멍은 티가 난다).
            const cutS = Math.max(x, winS), cutE = Math.min(x + bw, winE);
            for (const [ss, ee] of [[x, cutS], [cutE, x + bw]]) if (ee - ss > 0.05) {
              const sp = new THREE.Mesh(new THREE.BoxGeometry(ee - ss - 0.02, SH - 0.02, 0.09), mat);
              sp.position.set((ss + ee) / 2, (SH - 0.02) / 2, 0); sp.castShadow = sp.receiveShadow = true; g.add(sp);
            }
            const cw2 = cutE - cutS - 0.02;
            if (cw2 > 0.04) {
              const p1 = new THREE.Mesh(new THREE.BoxGeometry(cw2, 1.05, 0.09), mat);
              p1.position.set((cutS + cutE) / 2, 0.525, 0); p1.castShadow = p1.receiveShadow = true; g.add(p1);
              const p2 = new THREE.Mesh(new THREE.BoxGeometry(cw2, SH - 1.75, 0.09), mat);
              p2.position.set((cutS + cutE) / 2, (SH + 1.75) / 2, 0); p2.castShadow = p2.receiveShadow = true; g.add(p2);
            }
          } else {
            const ph2 = SH - (pr() < 0.3 ? 0.12 : 0) - 0.02; // 몇 장은 살짝 짧아 위가 삐죽
            const p = new THREE.Mesh(new THREE.BoxGeometry(bw - 0.03, ph2, 0.09), mat);
            p.position.set(cx, ph2 / 2, (pr() - 0.5) * 0.03); p.castShadow = p.receiveShadow = true; g.add(p);
            if (pr() < 0.4) B(g, bw - 0.05, 0.06, 0.03, 0x4a3f30, cx, 0.4 + pr() * (SH - 1), 0.06); // 가로 각목
          }
          x += bw;
        }
        if (o.winC != null) {
          // 창틀 + 불빛 유리 — 작은 면(0.9×0.6) 자기조도라 야간 밴딩 함정(대형 무텍스처 평면) 비해당.
          const wx = o.winC * len - len / 2;
          B(g, winW + 0.14, 0.07, 0.12, 0x3a3228, wx, 1.785, 0);
          B(g, winW + 0.14, 0.07, 0.12, 0x3a3228, wx, 1.015, 0);
          B(g, 0.07, 0.77, 0.12, 0x3a3228, wx - winW / 2 - 0.035, 1.4, 0);
          B(g, 0.07, 0.77, 0.12, 0x3a3228, wx + winW / 2 + 0.035, 1.4, 0);
          const pane = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.06, 0.64, 0.05),
            new THREE.MeshLambertMaterial({ color: 0xffd9a0, emissive: 0xc08a3a, emissiveIntensity: 0.55 }));
          pane.position.set(wx, 1.4, 0); g.add(pane); // 밤에 "누가 산다"로 읽히는 온광 (부표등과 같은 상시 자발광 문법)
          B(g, 0.05, 0.64, 0.08, 0x3a3228, wx, 1.4, 0);        // 멀리언 세로대
          B(g, winW - 0.06, 0.05, 0.08, 0x3a3228, wx, 1.4, 0); // 멀리언 가로대
        }
        return g;
      };
      // 앞벽(+z): 문간(세계 x≈0.09) + 창(세계 x≈-3.2, 불빛). 좌/우벽은 민판.
      const shFront = mkShWall(SW, { doorC: 0.82, winC: 0.232 });
      const shLeft = mkShWall(SD);
      const shRight = mkShWall(SD);
      // 방수포: 우벽 상단을 덮은 자락(늘어짐 sway) + 앞벽 문 위 차양 — 벽 그룹 자식이라 벽과 함께 컬링.
      {
        const tarp = new THREE.Mesh(new THREE.BoxGeometry(SD * 0.72, 1.1, 0.06), lamb(0x4a5560));
        tarp.position.set(-SD * 0.1, SH - 0.52, 0.12); tarp.rotation.z = 0.05; tarp.castShadow = true; // z0.12: 판자 지터(±0.015) 밖 — z-fight 여유
        shRight.add(tarp);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), lamb(0x3f4954));
        flap.position.set(SD * 0.24, SH - 1.12, 0.19); flap.rotation.z = 0.14;
        tagSway(flap, 0.14); // F-1a [B]: 방수포 자락 미세 sway
        shRight.add(flap);
        const awn = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.5), lamb(0x4a5560));
        awn.position.set(1.8, SH - 0.28, 0.3); awn.rotation.x = 0.42; awn.castShadow = true; // 문 위 차양
        shFront.add(awn);
      }
      // ★ 벽 컬링 일괄 등록 — 법선은 (방 중심이 아니라) 간이집 기준 월드 바깥향. 선실 벽(-z)도 여기서 함께.
      makeWalls([
        { group: cabinW, pos: [0, 0, -d / 2 - 0.28], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: shFront, pos: [SCX, 0, SFZ], rotY: 0, normal: new THREE.Vector3(0, 0, 1) },
        { group: shLeft, pos: [SCX - SW / 2 - 0.09, 0, SCZ], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: shRight, pos: [SCX + SW / 2 + 0.09, 0, SCZ], rotY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 문틀 (개구부 테두리) — ⑤ 앞(+z)벽 부착물 → 앞벽 컬링과 동기화 (옥탑 문법 그대로)
      attachToWall(0, 0, 1,
        B(roomGroup, 0.08, 1.8, 0.14, 0x3a3228, 0.09 - 0.65, 0.9, SFZ),
        B(roomGroup, 0.08, 1.8, 0.14, 0x3a3228, 0.09 + 0.65, 0.9, SFZ),
        B(roomGroup, 1.42, 0.1, 0.14, 0x3a3228, 0.09, 1.8, SFZ));
      attachToWall(0, 0, -1, buoyRing); // 구명튜브 → 선실 벽 컬링 편입
      // 슬레이트 지붕 (옥탑 buildRooftopSlate 재사용 — 치수/오프셋 파라미터화, 페리는 빈틈 없는 full 고정).
      //   내부에서 tagCeiling(y≈2.43) 등록 → 부감에서 실내 투시. 태양광 cullJoin이 이 그룹에 편입된다.
      buildRooftopSlate(SW, SD, SH, { cx: SCX, cz: SCZ, full: true });
      blockers = [
        { x: w / 2 - 0.7, z: d / 2 - 0.6, w: 0.8, d: 0.8 },       // 낚싯대 (기존)
        { x: SCX - SW / 2 - 0.09, z: SCZ, w: 0.32, d: SD + 0.2 }, // 간이집 좌벽
        { x: SCX + SW / 2 + 0.09, z: SCZ, w: 0.32, d: SD + 0.2 }, // 간이집 우벽
        { x: -2.62, z: SFZ, w: 4.12, d: 0.32 },                   // 간이집 앞벽 (문간 왼쪽 — 문간 x∈[-0.56,0.74]은 비움)
        { x: 1.01, z: SFZ, w: 0.54, d: 0.32 },                    // 간이집 앞벽 (문간 오른쪽)
      ];
    },
    buildEnv() {
      const rand = seededRand(808);
      // 바다 (거대한 어두운 수면)
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 24, 24), lamb(0x14222e));
      sea.geometry.rotateX(-Math.PI / 2);
      const sp = sea.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sp.getX(i) * 0.3) * Math.cos(sp.getZ(i) * 0.27) * 0.18);
      sea.geometry.computeVertexNormals();
      sea.position.y = -6.2;
      envRoot.add(sea);
      // 달빛 반사 띠
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(3, 40),
        new THREE.MeshLambertMaterial({ color: 0x2a4258, emissive: 0x1a3048, emissiveIntensity: 0.6, transparent: true, opacity: 0.5 }));
      glint.rotation.x = -Math.PI / 2;
      glint.position.set(-12, -6.1, -8);
      glint.rotation.z = 0.4;
      envRoot.add(glint);
      // 뱃머리 (우리 배의 앞부분이 이어짐)
      const bow = new THREE.Group();
      B(bow, 7, 1.2, 8.4, 0x6a5a48, 0, -0.6, 0);
      B(bow, 8, 4.8, 9, 0x5c3a30, 0, -3.6, 0);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(4.2, 6, 4), lamb(0x5c3a30));
      tip.rotation.z = -Math.PI / 2; tip.rotation.y = Math.PI / 4;
      tip.scale.set(1, 1, 1.4);
      tip.position.set(3.5, -3.2, 0);
      bow.add(tip);
      bow.position.set(ROOM.w / 2 + 4.2, 0, 0);
      envRoot.add(bow);
      // 좌초한 다른 배 실루엣 (수평선)
      const wreck = new THREE.Group();
      B(wreck, 16, 4, 4, 0x1c2229, 0, 2, 0);
      B(wreck, 5, 3, 3, 0x181d24, -2, 5.5, 0);
      const wtip = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 4), lamb(0x1c2229));
      wtip.rotation.z = Math.PI / 2 + 0.5;
      wtip.position.set(9, 2.5, 0);
      wreck.add(wtip);
      wreck.rotation.z = -0.18;
      wreck.rotation.y = 0.7;
      wreck.position.set(-26, -6, -20);
      envRoot.add(wreck);
      // 부표 + 갈매기는 없다. 등대 불빛만 멀리서.
      const buoy = new THREE.Group();
      const bb = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 6), lamb(0x8a4535));
      bb.position.y = 0.4;
      buoy.add(bb);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0xffcc66, emissive: 0xcc8822, emissiveIntensity: 1 }));
      bl.position.y = 1.2;
      buoy.add(bl);
      buoy.position.set(-9, -6, 7);
      envRoot.add(buoy);
      ogRock(-9, -6, 7, 0.7); // #71: 바다 셸터 — 건물 잠식 대신 부표 흘수선 이끼 소량
      // 해안선 절벽 (한쪽)
      for (let i = 0; i < 6; i++) {
        // #71: 치수/위치를 변수로 캡처해 암반 이끼 대상으로 등록 — rand() 호출 순서는 원본과 동일(모습 불변)
        const rs = 2.5 + rand() * 3;
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(rs, 0), lamb(0x232830));
        const rx = -30 + rand() * 10, ry = -5.5 + rand() * 1.5, rz = 14 + rand() * 12;
        rock.position.set(rx, ry, rz);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        envRoot.add(rock);
        ogRock(rx, ry, rz, rs);
      }
      envDyn = { sea, seaBase: sea.position.y };
    },
  },

  lighthouse: {
    name: '등대 등탑 거실', nameEn: 'Lighthouse Lamp Room', emoji: '🗼', unlockAt: 22, viewH: 19, ceilY: 2.2,
    desc: '절벽 끝 등대의 꼭대기 층. 두꺼운 벽 안은 아늑하고, 옥상 랜턴 옆 빗물받이가 물을 모아준다.',
    descEn: 'The top floor of a lighthouse at the cliff’s edge. Snug within thick walls, with a rain catch beside the rooftop lantern.',
    room: { w: 7, d: 7, h: 2.6 },
    baseComfort: 9,
    mood: { fog: 0x1a2430, fogNear: 22, fogFar: 64, skyH: 0x223448, skyZ: 0x0a0f18, hemiSky: 0x8aa0c0, hemiGround: 0x3a3d40, hemiInt: 0.7, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'rain', 'snow', 'rain'],
    perk: { expBonus: 0.03, forecast: true, label: '🔦 탐조등 — 모든 지역 성공률 +3%p · 날씨 예보 제공', labelEn: '🔦 Searchlight — success +3%p in all regions · weather forecast' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일 (등불)', labelEn: 'Fuel 1 / 2 days (beacon)' },
    rainCatch: 2, moveCost: { fuel: 2, parts: 3 },
    limits: '🌧️ 옥상 빗물받이 — 비/눈 오는 날 깨끗한 물 +2 (자급 가능)', limitsEn: '🌧️ Rooftop rain catch — clean water +2 on rainy/snowy days (self-sufficient)',
    buildRoom() {
      const { w, d, h } = ROOM;
      const conc = wallPhong({ map: concreteTex });
      conc.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.3, d + 0.7), conc.clone());
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 등탑 거실 바닥재 대상
      // (B-①) 실내 회벽 공유 벽지 재질 — 4면이 공유. 붉은 굽도리 밴드는 원본 유지(스타일 앵커).
      const lhWallMat = tagDecoWall(wallPhong({ color: 0xd8d0c4 })); lhWallMat.userData.shared = true;
      // 등대 몸통 (아래로, 홍백 줄무늬)
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(3.6 + i * 0.22, 3.6 + (i + 1) * 0.22, 3.2, 14), lamb(i % 2 ? 0xb84a3f : 0xd8d0c4));
        seg.position.y = -1.8 - i * 3.2;
        roomGroup.add(seg);
      }
      // 실내 벽 4면 (흰 회벽 + 둥근 창 + 붉은 굽도리) — 시야 방향 컬링
      const mkWall = (len, seed) => {
        const g = new THREE.Group();
        const rand = seededRand(seed);
        const wallM = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.26), lhWallMat);
        wallM.position.y = h / 2; wallM.castShadow = wallM.receiveShadow = true;
        g.add(wallM);
        const base = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, 0.28), lamb(0xb84a3f));
        base.position.y = 0.18; g.add(base);
        // 둥근 창 2개 + 밤바다
        for (const wx of [-len / 4, len / 4]) {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), lamb(0x8a8f96));
          ring.rotation.x = Math.PI / 2;
          ring.position.set(wx, 1.5, 0);
          g.add(ring);
          const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.32, 14),
            new THREE.MeshBasicMaterial({ color: 0x22344a }));
          glass.rotation.x = Math.PI / 2;
          glass.position.set(wx, 1.5, 0);
          g.add(glass);
        }
        // 세월의 얼룩
        if (rand() < 0.7) B(g, 0.3 + rand() * 0.4, 0.5 + rand() * 0.5, 0.27, 0xb8b0a2, -len / 2 + 0.8 + rand() * (len - 1.6), 0.8 + rand() * 1.2, 0);
        return g;
      };
      makeWalls([
        { group: mkWall(w, 91), pos: [0, 0, -d / 2 - 0.14], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mkWall(w, 92), pos: [0, 0, d / 2 + 0.14], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mkWall(d, 93), pos: [-w / 2 - 0.14, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mkWall(d, 94), pos: [w / 2 + 0.14, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 중앙 나선계단 기둥 (랜턴층으로 올라가는 축)
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, h, 12), lamb(0x9a938a));
      column.position.y = h / 2;
      column.castShadow = column.receiveShadow = true;
      roomGroup.add(column);
      for (let i = 0; i < 6; i++) {
        const step = B(roomGroup, 0.55, 0.05, 0.22, 0x6a655c, 0, 0.35 + i * 0.38, 0);
        step.position.x = Math.cos(i * 1.05) * 0.62;
        step.position.z = Math.sin(i * 1.05) * 0.62;
        step.rotation.y = -i * 1.05;
      }
      // 옥상 랜턴층 (방 위) — 렌즈 + 지붕 + 회전 빔
      // ⑥-a: 랜턴 데크 원반이 방 상부를 덮어 부감에서 실내를 가린다 → 천장 컬링에 등록(렌즈/캡/빔은 얇은 랜턴이라 유지).
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.25, 14), lamb(0x4a4f55));
      deck.position.y = h + 0.4;
      tagCeiling(deck, h + 0.1); roomGroup.add(deck);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 10),
        new THREE.MeshLambertMaterial({ color: 0xffe9b0, emissive: 0xffc860, emissiveIntensity: 1.2 }));
      lens.position.y = h + 1.0;
      roomGroup.add(lens);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.8, 12), lamb(0xb84a3f));
      cap.position.y = h + 1.8;
      cap.castShadow = true;
      roomGroup.add(cap);
      const beamGroup = new THREE.Group();
      for (const dir of [1, -1]) {
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.9),
          new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
        beam.position.x = dir * 7.5;
        beamGroup.add(beam);
        const beam2 = beam.clone();
        beam2.rotation.x = Math.PI / 2;
        beamGroup.add(beam2);
      }
      beamGroup.position.y = h + 1.0;
      roomGroup.add(beamGroup);
      envDyn._beam = beamGroup;
      // 빗물받이: 옥상 홈통 → 외벽 파이프 → 빗물통
      const gutter = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.07, 6, 16), lamb(0x6a7076));
      gutter.rotation.x = Math.PI / 2;
      gutter.position.y = h + 0.32;
      roomGroup.add(gutter);
      Cyl(roomGroup, 0.06, 0.06, h + 0.4, 0x6a7076, w / 2 + 0.42, (h + 0.4) / 2 - 0.1, d / 2 + 0.42, 6);
      const barrel = Cyl(roomGroup, 0.34, 0.3, 0.7, 0x5a7a8c, w / 2 + 0.62, 0.35, d / 2 + 0.62, 10);
      barrel.castShadow = true;
      B(roomGroup, 0.5, 0.04, 0.5, 0x3a4a55, w / 2 + 0.62, 0.72, d / 2 + 0.62);
      blockers = [{ x: 0, z: 0, w: 1.4, d: 1.4 }];
    },
    buildEnv() {
      const rand = seededRand(909);
      // 절벽 (등대가 선 바위산)
      const cliff = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        // #71: 치수/위치 캡처 — 절벽 암반 이끼 대상 등록(rand() 호출 순서 원본 동일, 모습 불변)
        const rs = 3.5 + rand() * 3.5;
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(rs, 0), lamb([0x2a2f38, 0x232830, 0x31363e][i % 3]));
        const rx = (rand() - 0.5) * 9, ry = -14 - rand() * 4, rz = (rand() - 0.5) * 9;
        rock.position.set(rx, ry, rz);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        rock.scale.y = 1.6 + rand();
        cliff.add(rock);
        ogRock(rx, ry, rz, rs, rock.scale.y); // cliff 그룹은 원점 무변환 → 로컬=월드
      }
      envRoot.add(cliff);
      // 바다
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 20, 20), lamb(0x14222e));
      sea.geometry.rotateX(-Math.PI / 2);
      const sp = sea.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sp.getX(i) * 0.3) * Math.cos(sp.getZ(i) * 0.27) * 0.2);
      sea.geometry.computeVertexNormals();
      sea.position.y = -19;
      envRoot.add(sea);
      // 파도가 부서지는 바위들
      for (let i = 0; i < 8; i++) {
        const a = rand() * Math.PI * 2, r = 10 + rand() * 14;
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rand() * 2, 0), lamb(0x1e232b));
        rock.position.set(r * Math.cos(a), -18.5 + rand(), r * Math.sin(a));
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        envRoot.add(rock);
      }
      // 난파선
      const wreck = new THREE.Group();
      B(wreck, 8, 2.2, 2.4, 0x24211c, 0, 1, 0);
      const wtip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 4), lamb(0x24211c));
      wtip.rotation.z = Math.PI / 2 + 0.4;
      wtip.position.set(4.5, 1.2, 0);
      wreck.add(wtip);
      wreck.rotation.z = 0.35;
      wreck.rotation.y = 1.2;
      wreck.position.set(14, -19, 9);
      envRoot.add(wreck);
      // 해안 폐허 마을 (절벽 건너)
      // #71 ogSkip: 등대는 바다 셸터 — 건물 잠식 대신 위 절벽 암반 이끼 소량 규칙(오더 명시)
      buildRuinCity(envRoot, rand, { count: 8, rMin: 26, rMax: 44, hMin: 3, hMax: 8, baseY: -18.5, litChance: 0.15, ogSkip: true });
      envDyn.beam = envDyn._beam;
      delete envDyn._beam;
    },
  },

  /* ── 1.1 「얼어붙은 항구」 셸터 1: 예인선 ──
     물 위에 뜬 작은 예인선. 흔들림 앰비언트(envDyn.sea 파동) + 낚시 퍽(매일 음식 +1). */
  tugboat: {
    name: '예인선', nameEn: 'Tugboat', emoji: '🚤', unlockAt: 25, viewH: 16, ceilY: 2.3,
    desc: '부두에 매인 작은 예인선. 발밑이 늘 흔들리지만, 물 위에서는 낚싯줄이 마르지 않는다.',
    descEn: 'A small tugboat moored at the pier. The deck always sways, but on the water the line never runs dry.',
    room: { w: 6.4, d: 4.2, h: 2.2 },
    baseComfort: 6,
    mood: { fog: 0x15222c, fogNear: 18, fogFar: 52, skyH: 0x1c2e3e, skyZ: 0x0a1018, hemiSky: 0x7a92ae, hemiGround: 0x36393c, hemiInt: 0.66, moonC: 0xa6bed6, moonInt: 0.78, stars: 0.85 },
    weatherPool: ['clear', 'snow', 'rain', 'snow'],
    perk: { produce: { food: 1 }, produceNote: '🎣 뱃전에서 물고기를 낚았습니다', produceNoteEn: '🎣 Caught a fish off the gunwale', label: '🎣 물 위의 거처 — 매일 음식 +1 (얼음낚시 가능)', labelEn: '🎣 Home on the water — food +1 daily (ice fishing available)' },
    upkeep: { res: 'fuel', n: 1, every: 2, label: '연료 1 / 2일 (엔진 예열)', labelEn: 'Fuel 1 / 2 days (engine warmup)' },
    dailyDirt: 2, moveCost: { parts: 3, material: 2 }, limits: '💧 뱃전의 습기 — 청결이 매일 2 더 빨리 떨어짐', limitsEn: '💧 Deck damp — cleanliness drops 2 faster each day',
    buildRoom() {
      const { w, d, h } = ROOM;
      const hullC = 0x384a55, deckC = 0x6a5a44;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.28, d + 0.6), wallPhong({ color: deckC }));
      floor.position.y = -0.14; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 예인선 갑판 바닥재 대상
      // 갑판 널
      for (let i = 0; i < 6; i++) B(roomGroup, w + 0.6, 0.02, 0.05, 0x54452f, 0, 0.015, -d / 2 + 0.5 + i * 0.7);
      // 선체 (물속으로 이어지는 통통한 예인선 몸통)
      B(roomGroup, w + 1.2, 2.2, d + 1.2, hullC, 0, -1.2, 0);
      B(roomGroup, w + 1.4, 0.4, d + 1.4, 0x1f2a30, 0, -2.4, 0);
      // 뱃머리 방현재(타이어) + 빨간 흘수선 띠
      B(roomGroup, w + 1.25, 0.18, d + 1.25, 0x8a4535, 0, -0.35, 0);
      for (const fz of [-d / 2, 0, d / 2]) {
        const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.1, 6, 10), lamb(0x1c1a18));
        tyre.rotation.y = Math.PI / 2; tyre.position.set(w / 2 + 0.62, -0.2, fz); roomGroup.add(tyre);
      }
      // 조타실 (뒤쪽 벽 — 컬링 대상) + 둥근 창
      const wheelhouse = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, 0.28), tagDecoWall(wallPhong({ color: 0xc4c0b4 }))); // (B-①) 조타실 벽 = 벽지 대상
      wall.position.y = 1.1; wall.castShadow = wall.receiveShadow = true;
      wheelhouse.add(wall);
      for (let i = 0; i < 3; i++) {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 12), lamb(0x7f858c));
        port.rotation.x = Math.PI / 2; port.position.set(-2 + i * 2, 1.4, 0.16); wheelhouse.add(port);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), lamb(0x27343f));
        glass.rotation.x = Math.PI / 2; glass.position.set(-2 + i * 2, 1.4, 0.17); wheelhouse.add(glass);
      }
      makeWalls([{ group: wheelhouse, pos: [0, 0, -d / 2 - 0.26], rotY: 0, normal: new THREE.Vector3(0, 0, -1) }]);
      // 굴뚝 + 타륜 소품
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.8, 10), lamb(0x2a2622));
      stack.position.set(-1.2, 3.0, -d / 2 - 0.9); stack.castShadow = true; roomGroup.add(stack);
      B(stack, 0.5, 0.16, 0.5, 0xa84a3f, 0, 0.9, 0);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 6, 14), lamb(0x6a4f33));
      wheel.position.set(1.6, 1.0, -d / 2 - 0.1); wheel.rotation.x = 0.5; roomGroup.add(wheel);
      // 구명튜브
      const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12), lamb(0xc45540));
      buoy.position.set(-w / 2 + 0.3, 1.2, -d / 2 - 0.05); roomGroup.add(buoy);
      // ── 대형 프로젝트 현장: 방파제 오두막 (site='breakwaterHut') — 뱃전 밖(부두 방향)에 단계별 표현 ──
      buildBreakwaterSite(roomGroup, w / 2 + 2.4, 0, d / 2 - 0.5);
      blockers = [{ x: 1.6, z: -d / 2 - 0.1, w: 0.8, d: 0.8 }];
    },
    buildEnv() {
      const rand = seededRand(909);
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(320, 320, 24, 24), lamb(0x13202b));
      sea.geometry.rotateX(-Math.PI / 2);
      const sp = sea.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sp.getX(i) * 0.3) * Math.cos(sp.getZ(i) * 0.27) * 0.16);
      sea.geometry.computeVertexNormals();
      sea.position.y = -2.6; envRoot.add(sea);
      // 부두(콘크리트 안벽) — 예인선이 매인 곳
      const quay = new THREE.Group();
      B(quay, 12, 2.4, 6, 0x4a4640, 0, -1.2, 0);
      B(quay, 12, 0.3, 6, 0x565149, 0, 0.05, 0);
      for (let i = 0; i < 5; i++) { const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 8), lamb(0x2a2824)); bol.position.set(-4.5 + i * 2.2, 0.35, -2.6); quay.add(bol); }
      quay.position.set(-ROOM.w / 2 - 7, 0, 0); envRoot.add(quay);
      ogZone(-ROOM.w / 2 - 7, 0, 10.5, 5, 0.2, 3); // #71: 바다 셸터 — 안벽 상판 물때 이끼 소량(건물 잠식 대신)
      // 크레인 실루엣 + 컨테이너 스택 (야적장 방향)
      const crane = new THREE.Group();
      Cyl(crane, 0.2, 0.2, 8, 0x6a5a30, 0, 4, 0, 6);
      B(crane, 6, 0.4, 0.4, 0x7a6a3a, 2, 7.6, 0);
      crane.position.set(-16, -2.4, -8); envRoot.add(crane);
      const contPal = [0x8a4535, 0x3a5a6a, 0x6a6a3a, 0x555049];
      for (let i = 0; i < 10; i++) {
        const cc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), lamb(contPal[Math.floor(rand() * contPal.length)]));
        cc.position.set(-20 + rand() * 8, -1.8 + Math.floor(rand() * 2) * 1.25, -12 + rand() * 8); cc.rotation.y = rand() * 0.3; envRoot.add(cc);
      }
      // 좌초 화물선 실루엣 (수평선)
      const wreck = new THREE.Group();
      B(wreck, 20, 4.5, 4, 0x171d24, 0, 2.2, 0);
      B(wreck, 5, 3, 3, 0x141920, -4, 5.5, 0);
      wreck.rotation.z = -0.12; wreck.rotation.y = 0.5; wreck.position.set(24, -2.6, -22); envRoot.add(wreck);
      envDyn = { sea, seaBase: sea.position.y };
    },
  },

  /* ── 1.1 「얼어붙은 항구」 셸터 2: 항만 관제탑 ──
     항구를 내려다보는 고층 관제탑. 넓은 전망 창(viewH 큼) + 예보 리드타임 +1일 퍽. */
  controltower: {
    name: '항만 관제탑', nameEn: 'Harbor Control Tower', emoji: '🗼', unlockAt: 29, viewH: 21, ceilY: 2.6,
    desc: '항구를 내려다보는 관제탑 꼭대기. 사방이 유리라 바람 소리가 크지만, 다가오는 날씨가 가장 먼저 보인다.',
    descEn: 'The top of a control tower over the harbor. Glass on all sides makes the wind loud, but the coming weather shows here first.',
    room: { w: 6.6, d: 6.6, h: 2.6 },
    baseComfort: 7,
    mood: { fog: 0x18242f, fogNear: 24, fogFar: 66, skyH: 0x203348, skyZ: 0x0a0f18, hemiSky: 0x8aa0c0, hemiGround: 0x3a3d40, hemiInt: 0.7, moonC: 0xa8c0d8, moonInt: 0.8, stars: 0.95 },
    weatherPool: ['clear', 'snow', 'rain', 'clear'],
    perk: { forecast: true, forecastLead: 1, expBonus: 0.02, label: '🔭 고층 전망 — 날씨 예보 · 한파 예보 +1일 · 성공률 +2%p', labelEn: '🔭 High vantage — weather forecast · cold-snap lead +1 day · success +2%p' },
    upkeep: { res: 'battery', n: 1, every: 1, label: '배터리 1 / 일 (관제 콘솔)', labelEn: 'Battery 1 / day (control console)' },
    moveCost: { parts: 3, material: 3 }, limits: '🌬️ 사방 유리 — 비/눈 오는 날 쾌적함 -6', limitsEn: '🌬️ Glass on all sides — comfort -6 on rainy/snowy days', cold: 6,
    noWallpaper: true, // (B-①) 사방 유리 전망 벽 — 벽지 미대상. 바닥재만 가능.
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), wallPhong({ map: concreteTex }));
      // #87 스윕(디렉터 신고 "중간 글리터링"): 야간 점광 아래 Phong 스펙큘러 풀이 디더와 간섭해 동심 링 밴딩
      //   → 무광 콘크리트로. 공유 재질 오염 방지를 위해 전용 클론(낮/타 셸터 콘크리트는 불변).
      floor.material = floor.material.clone();
      floor.material.userData.shared = false;
      floor.material.specular.setHex(0x050505);
      floor.material.shininess = 3;
      // 무광만으론 부족(재검증): 링의 본체는 야간 저조도 그라데이션이 디더 양자화 경계에서 동심 밴딩으로
      //   갈라지는 것 — 미세 자기조도로 바닥을 양자화 심연 위로 올려 밴드를 익사시킨다(무드 영향 최소).
      floor.material.emissive = new THREE.Color(0x0b0c0e);
      floor.position.y = -0.15; floor.receiveShadow = true; tagDecoFloor(floor); roomGroup.add(floor); // (B-①) 관제탑 바닥재 대상
      // 지지 기둥(탑 몸통) — 방 아래로 길게
      B(roomGroup, w * 0.7, 16, d * 0.7, 0x4a4640, 0, -8, 0);
      B(roomGroup, w + 1.2, 0.4, d + 1.2, 0x2a2824, 0, -0.4, 0);
      // 유리 전망 벽 4면 (프레임 + 어두운 유리) — 컬링 대상
      const mkGlassWall = (len) => {
        const g = new THREE.Group();
        BP(g, len, h, 0.1, 0x2a343e, 0, h / 2, 0); // 유리판
        BP(g, len, 0.14, 0.16, 0x55504a, 0, h - 0.05, 0); // 상부 프레임
        BP(g, len, 0.16, 0.16, 0x55504a, 0, 0.08, 0);      // 하부 프레임
        const nMul = Math.max(2, Math.floor(len / 1.6));
        for (let i = 0; i <= nMul; i++) B(g, 0.1, h, 0.14, 0x55504a, -len / 2 + i * (len / nMul), h / 2, 0); // 멀리언
        return g;
      };
      makeWalls([
        { group: mkGlassWall(w), pos: [0, 0, -d / 2 - 0.08], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mkGlassWall(w), pos: [0, 0, d / 2 + 0.08], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mkGlassWall(d), pos: [-w / 2 - 0.08, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mkGlassWall(d), pos: [w / 2 + 0.08, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // 관제 콘솔 + 회전 지붕등
      const console_ = new THREE.Group();
      B(console_, 2.2, 0.9, 0.7, 0x33383f, 0, 0.45, 0);
      B(console_, 2.0, 0.14, 0.5, 0x1c2836, 0, 0.95, 0.02); // 스크린 패널
      console_.position.set(0, 0, -d / 2 + 0.6); roomGroup.add(console_);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.4, 10),
        new THREE.MeshLambertMaterial({ color: 0xd9b06a, emissive: 0x8a6a20, emissiveIntensity: 0.7 }));
      beacon.position.set(0, h + 0.4, 0); roomGroup.add(beacon);
      // ── 대형 프로젝트 현장: 방파제 오두막 — 탑에서 내려다보이도록 방 밖 아래쪽에 배치 ──
      buildBreakwaterSite(roomGroup, -w / 2 - 3.0, -2.0, d / 2 + 1.0);
      blockers = [{ x: 0, z: -d / 2 + 0.6, w: 2.4, d: 0.9 }];
    },
    buildEnv() {
      const rand = seededRand(1010);
      const GY = -16;
      // 아래로 펼쳐진 항만 (부감)
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(360, 360, 20, 20), lamb(0x121e28));
      sea.geometry.rotateX(-Math.PI / 2);
      const sp = sea.geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.sin(sp.getX(i) * 0.25) * Math.cos(sp.getZ(i) * 0.22) * 0.2);
      sea.geometry.computeVertexNormals(); sea.position.y = GY; envRoot.add(sea);
      // 부두 안벽 + 컨테이너 야적 (저 아래)
      B(envRoot, 40, 1.2, 14, 0x413d37, 0, GY + 0.8, 10).receiveShadow = true;
      ogZone(0, 10, 36, 12, GY + 1.4, 3); // #71: 부감으로 내려다보이는 안벽 상판 이끼(항구 — 소량)
      const contPal = [0x8a4535, 0x3a5a6a, 0x6a6a3a, 0x555049];
      for (let i = 0; i < 26; i++) {
        const cc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), lamb(contPal[Math.floor(rand() * contPal.length)]));
        cc.position.set(-18 + rand() * 36, GY + 2 + Math.floor(rand() * 3) * 1.25, 4 + rand() * 12); envRoot.add(cc);
      }
      // 크레인 두 대
      for (const cx of [-12, 10]) { const cr = new THREE.Group(); Cyl(cr, 0.3, 0.3, 12, 0x6a5a30, 0, 6, 0, 6); B(cr, 9, 0.5, 0.5, 0x7a6a3a, 3, 11.4, 0); cr.position.set(cx, GY, 8); envRoot.add(cr); }
      // 좌초선 실루엣
      const wreck = new THREE.Group();
      B(wreck, 22, 5, 4.5, 0x151b22, 0, 2.5, 0); wreck.rotation.z = -0.1; wreck.rotation.y = 0.4; wreck.position.set(-28, GY, -18); envRoot.add(wreck);
      buildRuinCity(envRoot, rand, { count: 10, rMin: 34, rMax: 52, hMin: 5, hMax: 14, baseY: GY, litChance: 0.14 });
      envDyn = { sea, seaBase: sea.position.y };
    },
  },

  /* ── 1.3 「고요한 고원」 셸터: 스키 로지 ──
     고원 리조트의 스키 로지. 전 셸터 최고 단열(cold 0 — 악천후에도 쾌적 안 떨어짐) + 붙박이 벽난로(온기) + 큰 전망 창.
     고도 페널티(altitude): 연료 소모 +30% · 한파 빈도 +1 — 로지의 단열/난로가 이를 상쇄하는 리스크·리워드 셸터.
     온천(onsen) 개조로 cozy의 정점을 연다. 관측소·케이블카 대형 프로젝트 현장이 여기에 붙는다. */
  lodge: {
    name: '스키 로지', nameEn: 'Ski Lodge', emoji: '🏔️', unlockAt: 33, viewH: 20, ceilY: 3.0,
    desc: '고원 리조트의 통나무 로지. 바깥은 세상에서 가장 혹독한 겨울이지만, 벽난로 앞은 어디보다 따뜻하다.',
    descEn: 'A timber lodge at the highland resort. Outside is the harshest winter in the world; before the hearth, it is warmer than anywhere.',
    room: { w: 8.4, d: 6.4, h: 3.0 },
    baseComfort: 9,
    // cold 미설정 = 악천후 단열 페널티 없음(최고 단열, 기본 방어). 벽난로 무드는 fire mood + hearth 소품으로.
    altitude: true, // 고도 페널티 표식 (연료 소모 ×altitudeFuelMult · 한파 빈도 +altitudeColdSnapBonus)
    hearth: true,   // 붙박이 벽난로 — 겨울 온기 보너스(hearthWinterComfort) + 한파 방어 1단계(coldDefenseLevel)
    upkeep: { res: 'fuel', n: 1, every: 1, label: '연료 1 / 일 (벽난로·고도 난방)', labelEn: 'Fuel 1 / day (hearth & altitude heating)' },
    moveCost: { material: 3, parts: 2 },
    limits: '🏔️ 고도 — 연료 소모 +30% · 한파가 더 잦다 (로지 단열·벽난로가 상쇄)', limitsEn: '🏔️ Altitude — fuel use +30% · cold snaps more frequent (offset by lodge insulation & hearth)',
    weatherPool: ['clear', 'snow', 'snow', 'snow'], // 고원은 눈이 잦다
    mood: { fog: 0x1a2436, fogNear: 20, fogFar: 62, skyH: 0x22314a, skyZ: 0x0a1120, hemiSky: 0x94a6c8, hemiGround: 0x484038, hemiInt: 0.72, moonC: 0xaec4e0, moonInt: 0.82, stars: 1.0, fire: 0.9 },
    perk: { cozyMult: 1.3, forecast: true, label: '🔥 벽난로 로지 — 쾌적 효과 1.3배 · 날씨 예보', labelEn: '🔥 Hearth lodge — comfort effects ×1.3 · weather forecast' },
    buildRoom() {
      const { w, d, h } = ROOM;
      const fm = wallPhong({ map: floorWoodTex }); fm.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), fm);
      floor.position.y = -0.15; floor.receiveShadow = true;
      tagDecoFloor(floor); roomGroup.add(floor);
      B(roomGroup, w + 1.0, 0.5, d + 1.0, 0x2b2e36, 0, -0.55, 0);
      // 통나무 벽 (오두막 목재 텍스처) + 큰 전망 창(고원 부감)
      const wallMat = wallPhong({ map: wallWoodTex });
      wallMat.userData.shared = true;
      const mk = (len, opts) => stdWall(len, h, wallMat, opts);
      makeWalls([
        { group: mk(w, { window: { winW: 3.0, winH: 1.6, winY: 1.5, winX: 0 }, skyColor: 0x2c3a55 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
        { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
        { group: mk(d), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
        { group: mk(d, { window: { winW: 1.6, winH: 1.2, winY: 1.5, winX: 0 }, skyColor: 0x2c3a55 }), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
      ]);
      // A자형 경사 지붕 (통나무 로지) — 천장 컬링 그룹
      {
        const roofG = new THREE.Group();
        const rmat = lamb(0x4a3a2c);
        const rlen = Math.hypot(d / 2 + 0.3, 1.4);
        for (const side of [-1, 1]) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.14, rlen * 2), rmat);
          slab.position.set(0, h + 0.7, side * (d / 4 + 0.15));
          slab.rotation.x = side * Math.atan2(1.4, d / 2 + 0.3);
          slab.castShadow = true; roofG.add(slab);
        }
        B(roofG, w + 0.9, 1.4, 0.16, 0x554435, 0, h + 0.7, 0); // 용마루 박공
        tagCeiling(roofG, h + 0.02); roomGroup.add(roofG);
      }
      // ── 붙박이 벽난로 (hearth) — 왼벽에 돌 화로 + 굴뚝 + 타오르는 불빛 ──
      {
        const hg = new THREE.Group();
        B(hg, 1.4, 1.6, 0.8, 0x5a544a, 0, 0.8, 0);          // 돌 화로 몸통
        B(hg, 0.9, 0.7, 0.3, 0x151210, 0, 0.55, 0.42);       // 아궁이(어둠)
        B(hg, 0.5, 2.4, 0.5, 0x4e483f, 0, 2.0, -0.1);        // 굴뚝
        const fire = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 6),
          new THREE.MeshLambertMaterial({ color: 0xffa030, emissive: 0xdd6a10, emissiveIntensity: 1.1 }));
        fire.position.set(0, 0.55, 0.42); hg.add(fire);
        hg.position.set(-w / 2 + 0.5, 0, -d / 4); hg.rotation.y = Math.PI / 2; roomGroup.add(hg);
        blockers = [{ x: -w / 2 + 0.5, z: -d / 4, w: 0.9, d: 1.5 }];
      }
      // ── 대형 프로젝트 현장: 관측소(방 밖 뒤편 언덕) + 케이블카(방 밖 앞쪽 절벽 방향) ──
      buildObservatorySite(roomGroup, 0, 0, -d / 2 - 3.2);
      buildCablecarSite(roomGroup, w / 2 + 3.4, 0, d / 2 + 1.0);
    },
    buildEnv() {
      const GY = -0.9;
      const rand = seededRand(1330);
      // 고원 설원 지형 — 봉우리로 솟는 산릉
      const gh = (x, z) => {
        const r = Math.hypot(x, z);
        const n = 1.4 * Math.sin(x * 0.12 + 0.6) * Math.cos(z * 0.1)
                + 0.7 * Math.sin(x * 0.29 + 1.5) * Math.sin(z * 0.24);
        return GY + n * THREE.MathUtils.smoothstep(r, 9, 16) + THREE.MathUtils.smoothstep(r, 22, 52) * 6.0;
      };
      const cS = new THREE.Color(0xdfe6ee), cB = new THREE.Color(0xc4d0dc), cR = new THREE.Color(0x8a94a2);
      envRoot.add(groundPlane((x, z) => {
        const m = 0.5 + 0.5 * Math.sin(x * 0.4 + z * 0.3) * Math.cos(z * 0.33 - x * 0.2);
        return cS.clone().lerp(cB, m * 0.7).lerp(cR, 0.3 * THREE.MathUtils.smoothstep(Math.hypot(x, z), 20, 46));
      }, gh));
      ogGround(gh, 10, 22, 3, null, true); // #71: 고원 설원 — 눈을 뚫고 나온 마른 관목 소량(dry: 초록 금지)
      // 눈 덮인 침엽수 (설산) + 멀리 뾰족 봉우리 실루엣
      const farGeos = [];
      for (let i = 0; i < 70; i++) {
        const a = rand() * Math.PI * 2, r = 12 + Math.pow(rand(), 0.8) * 26;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const geo = pineGeo(rand, 0.9 + rand() * 1.4, true);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        farGeos.push(geo);
      }
      if (farGeos.length) envRoot.add(new THREE.Mesh(mergeGeometries(farGeos), vcLambert));
      // 지평선 설봉 (원뿔 봉우리 몇 개)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4, r = 40 + rand() * 10;
        const pk = new THREE.Mesh(new THREE.ConeGeometry(8 + rand() * 4, 16 + rand() * 8, 5), lamb(0xd6dee8));
        pk.position.set(r * Math.cos(a), GY + 4, r * Math.sin(a)); envRoot.add(pk);
      }
      envDyn = {};
    },
  },
};

/* ── 1.3 관측소 현장 오브젝트 (site='observatory') ──
   projectSiteStage('observatory')에 따라 자란다: 0 터/자재 → 1 기초 → 2 돔 골조 → 3 완성(회전 돔+망원경).
   완공(effect lodge.nightSky) 후 맑은 밤 밤하늘 이벤트가 열린다. */
function buildObservatorySite(parent, ox, oy, oz) {
  const stage = projectSiteStage('observatory');
  const g = new THREE.Group();
  const rr = seededRand(1331);
  // 콘크리트 기단 (항상)
  B(g, 2.6, 0.4, 2.6, 0x6a6660, 0, oy + 0.2, 0);
  if (stage === 0) {
    for (let i = 0; i < 7; i++) { const rs = 0.18 + rr() * 0.24; B(g, rs, rs, rs, 0x8a8680, -1 + rr() * 2, oy + 0.4 + rs * 0.5, -1 + rr() * 2).rotation.y = rr() * 3; }
  } else {
    if (stage >= 1) B(g, 2.2, 1.4, 2.2, 0x8a857c, 0, oy + 1.1, 0); // 원통 기초 벽
    if (stage >= 2) { // 돔 골조 (반구 와이어 느낌 — 반투명 없이 저면 밴드)
      for (let k = 0; k < 6; k++) { const rgeo = new THREE.TorusGeometry(1.15, 0.05, 5, 12, Math.PI); const ring = new THREE.Mesh(rgeo, lamb(0x6a655c)); ring.position.set(0, oy + 1.8, 0); ring.rotation.y = (k / 6) * Math.PI; g.add(ring); }
    }
    if (stage >= 3) { // 완성: 회전 돔 + 슬릿 + 망원경
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lamb(0xb8c0c8));
      dome.position.set(0, oy + 1.8, 0); g.add(dome);
      B(g, 0.3, 1.2, 0.06, 0x2a3038, 0, oy + 2.4, 1.15); // 관측 슬릿(어둠)
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.5, 10), lamb(0x33383f));
      scope.position.set(0, oy + 2.1, 0.4); scope.rotation.x = 0.7; g.add(scope);
    }
  }
  g.position.set(ox, 0, oz); parent.add(g);
}

/* ── 1.3 케이블카 현장 오브젝트 (site='cablecar') ──
   projectSiteStage('cablecar')에 따라 자란다: 0 잔해 → 1 지주 → 2 케이블 → 3 완성(곤돌라).
   완공(effect resort.accessTime) 후 리조트 접근 시간이 단축된다. */
function buildCablecarSite(parent, ox, oy, oz) {
  const stage = projectSiteStage('cablecar');
  const g = new THREE.Group();
  const rr = seededRand(1332);
  // 승강장 데크 (항상)
  B(g, 2.2, 0.3, 1.4, 0x5a544a, 0, oy + 0.15, 0);
  if (stage === 0) {
    for (let i = 0; i < 6; i++) { const rs = 0.16 + rr() * 0.22; B(g, rs, rs, rs, 0x574f42, -0.9 + rr() * 1.8, oy + 0.3 + rs * 0.5, rr() * 0.6).rotation.y = rr() * 3; }
  } else {
    if (stage >= 1) { Cyl(g, 0.12, 0.16, 3.2, 0x6a6058, -0.7, oy + 1.6, 0, 6); Cyl(g, 0.12, 0.16, 3.2, 0x6a6058, 0.7, oy + 1.6, 0, 6); B(g, 1.8, 0.16, 0.2, 0x55504a, 0, oy + 3.1, 0); } // 지주 문
    if (stage >= 2) { const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 5), lamb(0x2a2824)); cable.position.set(0, oy + 3.2, -3.6); cable.rotation.x = 0.55; g.add(cable); } // 절벽 방향 케이블
    if (stage >= 3) { // 완성: 곤돌라
      const car = new THREE.Group();
      B(car, 0.9, 0.9, 0.7, 0xc45540, 0, 0, 0); B(car, 0.7, 0.6, 0.5, 0x2a343e, 0, 0.05, 0.36); // 캐빈 + 창
      B(car, 0.1, 0.3, 0.1, 0x55504a, 0, 0.6, 0); // 행어
      car.position.set(0, oy + 2.7, 0); g.add(car);
    }
  }
  g.position.set(ox, 0, oz); parent.add(g);
}

/* ── 1.1 방파제 오두막 현장 오브젝트 (site='breakwaterHut') ──
   projectSiteStage('breakwaterHut')에 따라 단계별로 자란다: 0 잔해 → 1 정리된 터 → 2 뼈대 → 3 벽 → 4 완성 오두막.
   항구 셸터 buildRoom에서 호출. 현재 셸터가 항구 셸터면 investProject가 loadShelter로 재빌드해 갱신한다. */
function buildBreakwaterSite(parent, ox, oy, oz) {
  const stage = projectSiteStage('breakwaterHut');
  const g = new THREE.Group();
  const rrand = seededRand(414);
  // 방파제 기단 돌축대 (항상 존재)
  for (let i = 0; i < 6; i++) {
    const bs = 0.5 + rrand() * 0.4;
    B(g, bs, bs * 0.7, bs, [0x5a564e, 0x4e4a43, 0x6a655a][Math.floor(rrand() * 3)], -1.5 + i * 0.6, bs * 0.35 + oy - 0.2, rrand() * 0.4);
  }
  if (stage === 0) {
    // 잔해 더미
    for (let i = 0; i < 9; i++) { const rs = 0.18 + rrand() * 0.24; B(g, rs, rs * 0.7, rs, 0x574f42, -1.2 + rrand() * 2.4, oy + rs * 0.5, rrand() * 0.5).rotation.y = rrand() * 3; }
  } else {
    if (stage >= 2) { // 뼈대(기둥)
      for (const px of [-1.0, 1.0]) for (const pz of [-0.4, 0.6]) Cyl(g, 0.08, 0.08, 1.8, 0x6a4f33, px, oy + 0.9, pz, 6);
    }
    if (stage >= 3) { // 벽
      B(g, 2.4, 1.2, 0.12, 0x8a7a5a, 0, oy + 0.9, -0.5);
      B(g, 0.12, 1.2, 1.2, 0x8a7a5a, -1.15, oy + 0.9, 0.1);
    }
    if (stage >= 4) { // 완성: 지붕 + 문
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 4), lamb(0x5a4535));
      roof.rotation.y = Math.PI / 4; roof.position.set(0, oy + 2.1, 0.05); g.add(roof);
      B(g, 2.4, 1.4, 0.12, 0x9a8a68, 0, oy + 1.0, 0.65); // 앞벽
      B(g, 0.5, 1.0, 0.06, 0x4a3826, 0, oy + 0.7, 0.72); // 문
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), new THREE.MeshLambertMaterial({ color: 0xffcc66, emissive: 0xcc8822, emissiveIntensity: 1 }));
      lamp.position.set(0.4, oy + 1.5, 0.75); g.add(lamp);
    }
  }
  g.position.set(ox, 0, oz);
  parent.add(g);
}

/* ============================================================
   #71 계절 식생 + 도심 잠식(overgrowth) — TLOU 레퍼런스
   "사람이 떠난 도심은 수풀이 삼킨다": backdrop(방 밖 원경 건물·구조물)만, 연차(state.day)에
   비례해 (a)벽면 이끼/담쟁이 패치 (b)지면 수풀 클러스터 (c)전신주 덩굴이 자란다.
   겨울(seasonOf 'winter')엔 마른 톤(0x6a5f45 계열) + 밀도 ×0.6 — 눈 아래로 후퇴.
   ── 원칙 ──
   · 대상 등록: buildEnv/공용 빌더 코드가 ogReg에 좌표·그룹 참조를 직접 남긴다(장면 traverse로 이름 추측 금지).
   · 방(roomGroup) 내부·부착물·셸터 본체 금지 — 예외: 지하철 승강장/선로 이끼 소량(오더 명시 허용).
   · 시뮬 byte-identical: state는 읽기만 한다(day/current/계절). 난수는 seededRand(고정 시드+셸터 id 해시)
     — 같은 날 같은 셸터는 항상 같은 모습.
   · 갱신 주기: loadShelter 시 재생성만. 하루가 넘어가도 즉시 갱신하지 않는다(다음 로드 반영이면 충분 — 의도).
   · 성능 예산: 전부 병합 메시 — 월드 병합 1 + 수풀 정적 1 + sway 클러스터 ≤2 + 그룹 부착(동적 컬링 빌딩 ≤4,
     잔해 ≤2) = 셸터당 추가 드로우콜 ≤12. 텍스처 신규 생성 없음(팔레트 색 vertexColors Lambert).
   · 색: 자체 재질(신규 Lambert) — 전역 vcLambert 계절 틴트와 이중 적용 방지. envRoot 소속이라
     applyWetness(roomGroup 한정 스윕) 비대상 — 기존 backdrop 소품 관례와 동일(noWet 불필요).
============================================================ */
let ogReg = null; // buildEnv 동안만 유효한 등록부 — loadShelter가 리셋, buildOvergrowth가 소비 후 닫음
let ogState = { years: 0, patches: 0, tufts: 0, drawCallsAdded: 0 }; // QA 훅(overgrowthState) 노출용
function ogResetRegistry() { ogReg = { bldg: [], poles: [], rocks: [], zones: [], ground: null, attach: [] }; }
// 지면 수풀 존: buildEnv의 gh(x,z) 클로저를 그대로 캡처해 원지형에 접지. n = 1년차 기준 클러스터 수.
//   filter(x,z)로 도로면 등 제외. dry=true면 계절 무관 마른 관목(설원 로지 — 눈 위 초록 방지).
function ogGround(gh, rMin, rMax, n, filter = null, dry = false) { if (ogReg) ogReg.ground = { gh, rMin, rMax, n, filter, dry }; }
// 평면 이끼 존(부두 안벽 상판/승강장 등): 중심(cx,cz), 범위 w×d, 표면 y. n = 1년차 기준 패치 수.
function ogZone(cx, cz, w, d, y, n) { if (ogReg) ogReg.zones.push({ cx, cz, w, d, y, n }); }
// 암반/부표 이끼 대상(바다 셸터의 '건물 잠식 대신 소량' 규칙): sy = y 스케일(절벽 바위 세로 늘림 반영).
function ogRock(x, y, z, r, sy = 1) { if (ogReg) ogReg.rocks.push({ x, y, z, r, sy }); }
// 회전된 소품 그룹(전소 잔해 등) 잠식: group 로컬 좌표의 box 면에 담쟁이 — 그룹 자식 1메시로 병합 부착.
function ogAttach(group, boxes) { if (ogReg) ogReg.attach.push({ group, boxes }); }
function ogHashId(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 9973; return h; }
function buildOvergrowth() {
  ogState = { years: 0, patches: 0, tufts: 0, drawCallsAdded: 0 };
  const reg = ogReg; ogReg = null; // 소비 후 닫는다 — 로드 경로 밖의 등록 누수 방지
  if (!reg) return;
  // 잠식 연차: 0년차 거의 없음 → 3년차 상한. 모든 수량이 years에 비례.
  const years = Math.min(3, (state.day || 1) / 360);
  ogState.years = +years.toFixed(3);
  const winter = seasonOf().id === 'winter';
  const dens = winter ? 0.6 : 1;
  const rand = seededRand(41000 + ogHashId(state.current) * 7);
  const PAL = winter ? [0x6a5f45, 0x5d5340, 0x746a4e, 0x66603f]  // 겨울 마른 톤(오더 지정 0x6a5f45 계열)
                     : [0x3e5230, 0x46603a, 0x2f4527, 0x4a5c3c]; // 이끼/담쟁이 짙은 초록(기존 수풀 팔레트 근친)
  const pick = () => PAL[Math.floor(rand() * PAL.length)];
  const ogMat = () => new THREE.MeshLambertMaterial({ vertexColors: true }); // map 없음 → disposeDeep가 정리
  const worldGeos = [];  // 월드 좌표 병합분(담쟁이/덩굴/암반 이끼/평면 존)
  const tuftGeos = [];   // 지면 수풀 정적 병합분
  const og = new THREE.Group(); // 산출물 그룹 — envRoot에 붙어 다음 로드 때 함께 dispose
  let meshes = 0;
  // (a) 건물 벽면 담쟁이/이끼 — 방(원점)을 향한 면에만, 하단 편중(바닥에서 기어오른 인상).
  //     local=true: 동적 컬링 빌딩(옥탑 근경) — 그룹 로컬 좌표로 만들어 자식 부착(빌딩과 함께 사라져야 함).
  const addIvyPatches = (b, out, local) => {
    const nP = Math.min(4, Math.round((b.per ?? 1) * years * dens + rand() * 0.35));
    if (nP <= 0) return 0;
    const dirX = -b.x, dirZ = -b.z, dl = Math.hypot(dirX, dirZ) || 1;
    const faces = [{ nx: 1, nz: 0 }, { nx: -1, nz: 0 }, { nx: 0, nz: 1 }, { nx: 0, nz: -1 }]
      .filter(f => (f.nx * dirX + f.nz * dirZ) / dl > 0.15);
    if (!faces.length) return 0;
    let made = 0;
    for (let i = 0; i < nP; i++) {
      const f = faces[Math.floor(rand() * faces.length)];
      const pw = 0.5 + rand() * 1.6;
      // 고층(옥탑 원경 등)은 파사드 전체에 분산 — 저층은 지면 출발 + 30% 중단 반점
      const yLift = b.h > 8 ? rand() * b.h * 0.6 : (rand() < 0.3 ? rand() * b.h * 0.4 : 0);
      const ph = Math.min(0.7 + rand() * Math.max(0.7, b.h * 0.45), Math.max(0.5, b.h - yLift));
      const yc = yLift + ph / 2;
      const jitter = rand() - 0.5;
      let g;
      if (f.nx) {
        g = new THREE.BoxGeometry(0.06, ph, Math.min(pw, b.d * 0.9));
        g.translate(f.nx * (b.w / 2 + 0.035), yc, jitter * Math.max(0, b.d - pw * 0.6));
      } else {
        g = new THREE.BoxGeometry(Math.min(pw, b.w * 0.9), ph, 0.06);
        g.translate(jitter * Math.max(0, b.w - pw * 0.6), yc, f.nz * (b.d / 2 + 0.035));
      }
      if (!local) g.translate(b.x, b.baseY, b.z);
      out.push(paintGeo(g, pick()));
      made++;
    }
    return made;
  };
  let dynUsed = 0;
  for (const b of reg.bldg) {
    if (b.dyn) {
      if (dynUsed >= 4) continue; // 동적 컬링 빌딩 부착 메시는 드로우콜 예산상 4동까지
      const geos = [];
      const made = addIvyPatches(b, geos, true);
      if (made > 0) {
        const m = new THREE.Mesh(mergeGeometries(geos), ogMat());
        b.group.add(m); meshes++; dynUsed++;
        ogState.patches += made;
      }
    } else ogState.patches += addIvyPatches(b, worldGeos, false);
  }
  // (c) 전신주 덩굴 감김 — 0.5년 1단 → 1.2년 2단 → 2.2년 3단. 기둥 기울기(rotation.z=tilt)를 월드로 환산해 밀착.
  for (const p of reg.poles) {
    const wraps = years >= 2.2 ? 3 : years >= 1.2 ? 2 : years >= 0.5 ? 1 : 0;
    const ct = Math.cos(p.tilt), st = Math.sin(p.tilt);
    for (let k = 0; k < wraps; k++) {
      const yk = 0.45 + k * 0.75 + rand() * 0.35;
      for (let s = 0; s < 4; s++) {
        const a = rand() * Math.PI * 2;
        const lx = Math.cos(a) * 0.105, lz = Math.sin(a) * 0.105, ly = yk + s * 0.09;
        const g = new THREE.BoxGeometry(0.09, 0.16, 0.09);
        g.rotateY(a);
        g.translate(p.x + lx * ct - ly * st, p.groundY + lx * st + ly * ct, p.z + lz);
        worldGeos.push(paintGeo(g, pick()));
        ogState.patches++;
      }
    }
    if (years >= 2 && rand() < 0.7) { // 가로대에서 늘어진 덩굴 자락
      const len = 0.9 + rand() * 0.8, lx = (rand() - 0.5) * 1.2, ly = 4.85 - len / 2;
      const g = new THREE.BoxGeometry(0.05, len, 0.05);
      g.translate(p.x + lx * ct - ly * st, p.groundY + lx * st + ly * ct, p.z + (rand() - 0.5) * 0.1);
      worldGeos.push(paintGeo(g, pick()));
      ogState.patches++;
    }
  }
  // 암반/부표 이끼(바다 셸터) — 연차에 비례해 이끼 낀 바위가 늘어난다(소량 원칙, 0년차 거의 없음)
  for (const r of reg.rocks) {
    if (rand() > 0.04 + years * 0.3) continue;
    const s = r.r * (0.55 + rand() * 0.3);
    const g = new THREE.BoxGeometry(s, Math.max(0.06, r.r * 0.16), s);
    g.rotateY(rand() * Math.PI);
    g.translate(r.x, r.y + r.r * r.sy * 0.42, r.z);
    worldGeos.push(paintGeo(g, pick()));
    ogState.patches++;
  }
  // 평면 이끼 존(부두 안벽/승강장/선로)
  for (const z of reg.zones) {
    const nZ = Math.round(z.n * years * dens);
    for (let i = 0; i < nZ; i++) {
      const g = new THREE.BoxGeometry(0.35 + rand() * 0.85, 0.024, 0.25 + rand() * 0.6);
      g.rotateY(rand() * Math.PI);
      g.translate(z.cx + (rand() - 0.5) * z.w, z.y + 0.012, z.cz + (rand() - 0.5) * z.d);
      worldGeos.push(paintGeo(g, shade(pick(), 0.85)));
      ogState.patches++;
    }
  }
  // (b) 지면 수풀 클러스터 — 일부 클러스터는 기존 tagSway 훅으로 바람 sway(신규 시스템 금지)
  if (reg.ground) {
    const G = reg.ground;
    const gPal = (G.dry && !winter) ? [0x6a5f45, 0x746a4e, 0x66603f, 0x5d5340] : PAL;
    const nC = Math.round(G.n * years * dens);
    const swayBundles = [];
    for (let c = 0; c < nC; c++) {
      let cx = 0, cz = 0, ok = false;
      for (let tr = 0; tr < 6 && !ok; tr++) {
        const a = rand() * Math.PI * 2, rr = G.rMin + rand() * (G.rMax - G.rMin);
        cx = Math.cos(a) * rr; cz = Math.sin(a) * rr;
        ok = !G.filter || G.filter(cx, cz);
      }
      if (!ok) continue;
      const nT = 4 + Math.floor(rand() * 5), cr = 0.5 + rand() * 0.8;
      const doSway = swayBundles.length < 2 && rand() < 0.4;
      const dst = doSway ? [] : tuftGeos;
      const baseY = G.gh(cx, cz);
      for (let i = 0; i < nT; i++) {
        const tx = cx + (rand() - 0.5) * cr * 2, tz = cz + (rand() - 0.5) * cr * 2;
        const th = 0.22 + rand() * 0.42;
        const g = new THREE.ConeGeometry(0.05 + rand() * 0.08, th, 4);
        g.rotateZ((rand() - 0.5) * 0.5);
        if (doSway) g.translate(tx - cx, G.gh(tx, tz) - baseY + th / 2 - 0.02, tz - cz); // sway 클러스터는 로컬 좌표
        else g.translate(tx, G.gh(tx, tz) + th / 2 - 0.02, tz);
        dst.push(paintGeo(g, gPal[Math.floor(rand() * gPal.length)]));
        ogState.tufts++;
      }
      if (doSway && dst.length) swayBundles.push({ geos: dst, cx, cz, y: baseY });
    }
    for (const sb of swayBundles) {
      const m = new THREE.Mesh(mergeGeometries(sb.geos), ogMat());
      m.position.set(sb.cx, sb.y, sb.cz);
      tagSway(m, 0, 0.035); // F-1a [B] 기존 sway 훅 재사용 — 원점이 클러스터 밑동이라 회전 sway가 자연스럽다
      og.add(m); meshes++;
    }
  }
  // 회전 그룹 잔해 잠식(오두막 전소 잔해 등) — 로컬 좌표 병합 후 그룹 자식으로
  for (const at of reg.attach) {
    const geos = [];
    for (const bx of at.boxes) {
      const nP = Math.round(1.4 * years * dens);
      for (let i = 0; i < nP; i++) {
        const face = Math.floor(rand() * 4);
        const ph = 0.4 + rand() * Math.max(0.5, bx.h * 0.8);
        const yc = (bx.y0 || 0) + ph / 2;
        let g;
        if (face < 2) {
          g = new THREE.BoxGeometry(0.05, ph, Math.min(0.5 + rand() * 0.5, bx.d));
          g.translate(bx.x + (face ? 1 : -1) * (bx.w / 2 + 0.03), yc, bx.z + (rand() - 0.5) * bx.d * 0.5);
        } else {
          g = new THREE.BoxGeometry(Math.min(0.5 + rand() * 0.5, bx.w), ph, 0.05);
          g.translate(bx.x + (rand() - 0.5) * bx.w * 0.5, yc, bx.z + (face === 2 ? 1 : -1) * (bx.d / 2 + 0.03));
        }
        geos.push(paintGeo(g, pick()));
        ogState.patches++;
      }
    }
    if (geos.length) { const m = new THREE.Mesh(mergeGeometries(geos), ogMat()); at.group.add(m); meshes++; }
  }
  if (worldGeos.length) { og.add(new THREE.Mesh(mergeGeometries(worldGeos), ogMat())); meshes++; }
  if (tuftGeos.length) { og.add(new THREE.Mesh(mergeGeometries(tuftGeos), ogMat())); meshes++; }
  if (og.children.length) envRoot.add(og);
  ogState.drawCallsAdded = meshes; // 병합 메시 수 = 추가 드로우콜 추정치(그림자 캐스팅 없음)
}

/* ============================================================
   구역 시스템 — 한 지역 안에 여러 셸터, 지역 간 이동은 비용이 든다
============================================================ */
// DISTRICTS(지도 구역)는 src/data/world.js로 분리(콘텐츠 데이터 Phase 1).
function districtOf(shelterId) {
  for (const [id, d] of Object.entries(DISTRICTS)) if (d.shelters.includes(shelterId)) return id;
  return 'outskirts';
}

/* ============================================================
   게임 상태 & 저장
============================================================ */
// ---- 자원 (기획서 v0.2: 자원 보유량 및 소비) ----
// RESOURCES(자원)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
// ---- 부상 (기획서 v0.2: 부상 치료 시스템) ----
// INJURIES(부상)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
// ---- 탐험 준비물 (기획서 v0.2: 준비물 슬롯) ----
// PREPS(탐험 준비물)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).

// state / DEFAULT_STATE 는 core/state.js 로 이전 (모놀리스 분해 Phase 1). 위 import 참조.

function resAdd(id, n) {
  if (n <= 0) return;
  state.res[id] = (state.res[id] || 0) + n;
  state.dayLog.gain[id] = (state.dayLog.gain[id] || 0) + n;
}
function resConsume(id, n) {
  if (isWallpaper()) return true; // 🖼️ 배경화면: 자원 무한 — 차감하지 않는다(표시는 ∞)
  if ((state.res[id] || 0) < n) return false;
  state.res[id] -= n;
  state.dayLog.spend[id] = (state.dayLog.spend[id] || 0) + n;
  if (id === 'fuel') accWinterFuel(n); // Nine Winters(#11): 겨울 중 연료 소모 집계
  return true;
}
function resHasAll(cost) {
  if (isWallpaper()) return true; // 🖼️ 배경화면: 항상 충족 (배치/이주 자유)
  return Object.entries(cost).every(([id, n]) => (state.res[id] || 0) >= n);
}
function resConsumeAll(cost) {
  if (!resHasAll(cost)) return false;
  for (const [id, n] of Object.entries(cost)) resConsume(id, n);
  return true;
}
function costLabel(cost) {
  return Object.entries(cost).map(([id, n]) => `${RESOURCES[id].emoji}${LName(RESOURCES[id])} ${n}`).join(' + ');
}
// (B-④) 보유/필요 대조 칩 공통 렌더러 — 이주 창·프로젝트 카드·셸터 카드 전부 이 한 곳을 쓴다.
//   [아이콘 이름 보유/필요] 형태로 자원 이름을 병기(아이콘+숫자만으론 무슨 아이템인지·무슨 수치인지 모른다는 신고).
//   keep-all 조판으로 이름이 줄바꿈으로 잘리지 않게. ok=충족(green)/lack=부족(red) 색 구분 유지.
function reqChip(rid, have, need) {
  const ok = have >= need;
  return `<span class="req-chip ${ok ? 'ok' : 'lack'}">${resIcon(rid)}<span class="rq-name">${LName(RESOURCES[rid])}</span> ${have}/${need}</span>`;
}
function reqChips(cost) {
  return Object.entries(cost).map(([rid, need]) => reqChip(rid, state.res[rid] || 0, need)).join('');
}
// 신선식품 우선 → 통조림 순으로 food n개를 대체 소비 (부족하면 아무것도 소비하지 않고 false)
function hasAnyFood(n = 1) { return ((state.res.food || 0) + (state.res.canned || 0)) >= n; }
function consumeAnyFood(n = 1) {
  if (!hasAnyFood(n)) return false;
  let remain = n;
  const fromFresh = Math.min(remain, state.res.food || 0);
  if (fromFresh > 0) { resConsume('food', fromFresh); remain -= fromFresh; }
  if (remain > 0) resConsume('canned', remain);
  return true;
}
// opts / OPTS_DEFAULT 는 core/state.js 로 이전 (모놀리스 분해 Phase 1). 위 import 참조.
// REQ-STEAM-01: 플랫폼 어댑터에 상태 접근자 주입 (순환 import 회피). 동작 불변 위임.
bindPlatform({
  getAchs: () => (state.achs || {}),
  setAch: (id) => { if (!state.achs) state.achs = {}; state.achs[id] = true; },
  getLang: () => opts.lang || 'ko',
});

/* ============================================================
   난이도 모드 (v0.9.2) — 하드: 전리품 -30% · 게이지 소모 +50%
============================================================ */
// 난이도 예측자(isHard/isHardcore/isZen/isWallpaper/rescueEligible)는 core/mode.js로 이전 (분해 Phase 1). 아래 import 참조.
// 하드 전리품 -30%. EV 보존 확률적 반올림: floor만 쓰면 1개 드랍이 항상 0이 되고,
// round만 쓰면 1개가 영원히 안 줄어든다 — 소수부를 확률로 처리해 기댓값(×0.7)을 지킨다.
// 난이도별 전리품 수급 배수(디렉터 "challenging"). 이름은 하드 유래지만 이제 전 모드에 적용된다
//   — 노말도 소폭(<1.0) 조인다. wallpaper는 자원 무한이라 loot 경로를 안 타므로 무관.
function hardLoot(n) {
  const mul = BAL.economy.incomeMul[state.mode] ?? 1;
  if (mul === 1) return n;
  const x = n * mul, f = Math.floor(x);
  return f + (Math.random() < x - f ? 1 : 0);
}

/* ============================================================
   생존 게이지 (기획서: 배고픔/갈증 — cozy 방향, 사망 대신 탈진)
============================================================ */
function decayGauges(gm) {
  if (isWallpaper()) return; // 🖼️ 배경화면: 게이지 압박 off — 배고픔/갈증/에너지 정지(볼거리만 흐른다)
  const winterMult = seasonOf().id === 'winter' ? BAL.gauges.winterMult : 1; // 겨울엔 열량 소모가 크다
  const hardMul = isHard() ? BAL.hard.drainMul : 1; // 하드: 배고픔/갈증 소모 +50%
  // 한파: 방어가 안 된 만큼(netSeverity) 배고픔 감소를 가속 (완전 방어 시 1.0)
  const coldMult = coldSnapNetSeverity() > 0 ? BAL.seasons.coldSnapHungerMult : 1;
  const summerThirst = seasonOf().id === 'summer' ? BAL.seasons.summerThirstMult : 1; // 여름 갈증 압박
  state.hunger = Math.max(0, state.hunger - gm * BAL.gauges.hungerPerMin * winterMult * hardMul * coldMult); // v0.9.1: 22% 완화 (×0.78) — 만복 → 0까지 약 5게임일
  state.thirst = Math.max(0, state.thirst - gm * BAL.gauges.thirstPerMin * hardMul * summerThirst);          // v0.9.1: 22% 완화 (×0.78)
  if (opts.autoEat) {
    let g = 0;
    while (state.hunger < BAL.gauges.autoEatThreshold && hasAnyFood(1) && g++ < BAL.gauges.autoEatGuard) { consumeAnyFood(1); state.hunger = Math.min(100, state.hunger + BAL.gauges.autoEatRestore); }
    g = 0;
    while (state.thirst < BAL.gauges.autoEatThreshold && (state.res.water || 0) > 0 && g++ < BAL.gauges.autoEatGuard) { resConsume('water', 1); state.thirst = Math.min(100, state.thirst + BAL.gauges.autoEatRestore); }
  }
}
function eatFood() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (!hasAnyFood(1)) { toast(t('eat.noFood')); return; }
  if (state.hunger > BAL.gauges.eatFullGate) { toast(t('eat.full')); return; }
  const usedFresh = (state.res.food || 0) > 0;
  consumeAnyFood(1);
  state.hunger = Math.min(100, state.hunger + BAL.gauges.eatRestore);
  toast(t(usedFresh ? 'eat.done' : 'eat.doneCanned'));
  questProgress('eat');
  renderResBar(); updateHud(); scheduleSave();
}
function drinkWater() {
  if (paused) { toast(t('pause.blocked')); return; }
  if ((state.res.water || 0) < 1) { toast(t('drink.noWater')); return; }
  if (state.thirst > BAL.gauges.drinkFullGate) { toast(t('drink.full')); return; }
  resConsume('water', 1);
  state.thirst = Math.min(100, state.thirst + BAL.gauges.drinkRestore);
  toast(t('drink.done'));
  questProgress('drink');
  renderResBar(); updateHud(); scheduleSave();
}
function isExhausted() { return state.hunger <= 0 || state.thirst <= 0; }

/* ============================================================
   무력 상태 · 구제 1회 · 런 종료 (v1.3.0 배치 D · GD-THESIS §4.5)
   무력 = 식량·식수 재고 0 AND 배고픔·갈증·에너지 바닥.
   노말/하드: 런당 1회 구제(문 앞 꾸러미 / 헬기 보급). 이후 2번째 무력 = 런 종료.
   하드코어: 구제 없음(첫 무력이 곧 종료). 무한/배경화면: 무력 미적용.
============================================================ */
const GAUGE_FLOOR = 0; // 게이지 바닥 판정선 (구조 상수 — 밸런스 수치 아님)
function gaugesBottomed() {
  return state.hunger <= GAUGE_FLOOR && state.thirst <= GAUGE_FLOOR && state.energy <= GAUGE_FLOOR;
}
function helplessNow() {
  if (isWallpaper() || isZen()) return false;   // 무력 미적용 모드
  const foodStock = (state.res.food || 0) + (state.res.canned || 0);
  const waterStock = (state.res.water || 0);
  return foodStock <= 0 && waterStock <= 0 && gaugesBottomed();
}
let helplessBusy = false; // 구제/종료 연출 중 재진입 가드 (틱마다 재호출되므로)
// 매 상태 변화 후 호출되는 안전망 판정. 무력이면 구제 또는 종료를 연출한다.
function checkHelpless() {
  if (helplessBusy || state.runEnded || blackoutActive) return;
  if (!helplessNow()) return;
  helplessBusy = true;
  if (rescueEligible() && !state.rescueUsed) doRescue();
  else endRun();
}
// 구제 1회: 암전 → 랜덤 2종(문 앞 꾸러미 / 헬기 보급). 재기 가능선 물자 지급.
function doRescue() {
  state.rescueUsed = true;
  const heli = Math.random() < 0.5;
  if (heli) playSfx('heli');
  blackout(() => {
    // 보급량 지급 (BAL.rescue) — 재기 가능선(하루치)
    for (const [rid, n] of Object.entries(BAL.rescue)) {
      if (rid === 'unlockDay') continue;
      state.res[rid] = (state.res[rid] || 0) + n;
    }
    // 게이지도 최소 재기선까지 끌어올린다 (물자만 주고 바닥이면 즉시 재무력)
    state.hunger = Math.max(state.hunger, 40);
    state.thirst = Math.max(state.thirst, 40);
    state.energy = Math.max(state.energy, 40);
    const noteKey = heli ? 'rescue.heli.note' : 'rescue.parcel.note';
    state.dayLog.notes.push(t(noteKey));
    renderResBar(); updateHud(); flushSave();
  }, 900);
  // 연출이 끝난 뒤 수첩 한 장으로 "타인의 온기"를 전한다
  setTimeout(() => {
    helplessBusy = false;
    openJournalPages([{
      titleId: heli ? 'rescue.heli.title' : 'rescue.parcel.title',
      bodyId: heli ? 'rescue.heli.body' : 'rescue.parcel.body',
    }]);
  }, 1800);
}
// 런 종료: 암전 → 수첩 마지막 페이지 → 요약 → "끝난 기록"으로 보존.
function endRun() {
  state.runEnded = true;
  blackout(() => { flushSave(); }, 1000);
  setTimeout(() => {
    helplessBusy = false;
    setPaused(true);
    openEndedRecordPages(runSummaryLines(), { fromRun: true });
  }, 1600);
}
// 요약: 넘긴 겨울 / 수집 / 고양이 (GD-THESIS §4.5)
function runSummaryLines() {
  const collected = memosCollected() + broadcastsCollected()
    + Object.keys(state.sketches || {}).length;
  return {
    day: state.day,
    winters: state.winters || 0,
    collected,
    cat: !!state.cat,
    mode: state.mode,
  };
}
// 끝난 기록 수첩 (런 종료 직후 · 회고 재열람 공통)
function openEndedRecordPages(sum, opt = {}) {
  const catLine = sum.cat ? t('ended.summary.cat') : '';
  openJournalPages([
    { titleId: 'ended.title', bodyId: 'ended.page1' }, // "여기까지 기록이 남아 있다"
    { titleId: 'ended.summaryTitle', body: t('ended.summary', {
        day: sum.day, winters: sum.winters, collected: sum.collected, cat: catLine,
      }) },
  ], {
    onClose: () => {
      if (opt.fromRun) {
        // 런 종료 직후엔 타이틀로 (끝난 기록은 슬롯에 보존됨)
        toast(t('ended.toTitle'));
        flushSave();
        setTimeout(() => reloadWithVeil(), 400);
      }
    },
  });
}
// 끝난 기록 회고 열람 (타이틀 불러오기에서 끝난 슬롯 클릭) — 해당 슬롯 요약만 읽는다.
function openEndedRecord(n) {
  const d = readSlot(n);
  const st = d?.state;
  if (!st) { toast(t('toast.emptySlot')); return; }
  const collected = Object.keys(st.memos || {}).length + Object.keys(st.broadcasts || {}).length
    + Object.keys(st.sketches || {}).length;
  openEndedRecordPages({
    day: st.day || 1,
    winters: st.winters || 0,
    collected,
    cat: !!st.cat,
    mode: st.mode || 'normal',
  });
}

/* ── 취침 (의무 휴식 — 자원 인플레이션 방지 + 침대의 가치) ── */
const EXP_PER_DAY = BAL.exp.perDay;
// 취침/쪽잠 공통 에너지 회복 공식 (침대 유무 + 쾌적함 보너스)
// v1.2.0 취침 자율화: "몇 시에 자느냐"를 회복량으로 보상/처벌한다.
// atHour 미지정 시 현재 게임 시각 기준. collapse=true 면 05시 자동 쓰러짐(바닥 취침 수준).
function restHourMod(atHour) {
  const R = BAL.rest;
  const h = Math.floor(atHour);
  if (h >= R.earlyStartHour && h <= R.earlyEndHour) return R.earlyBonus; // 21~23시: +보너스
  if (h >= R.lateStartHour && h < R.collapseHour) {                     // 01~04시: 시간당 누적 페널티
    return -Math.min(R.lateCap, R.latePerHour * (h - R.lateStartHour + 1));
  }
  return 0; // 00~00:59(자정 직후) 및 그 외: 보정 없음
}
// 정산 경로(오프라인/백그라운드) 취침을 "정상 취침"으로 회복시킬 때 쓰는 기준 시각.
//   restHourMod의 이른 취침 보너스 구간(earlyStart~earlyEnd) 안이라 밤샘 페널티 없이 +earlyBonus가 적용된다.
//   BAL 신설 없이 구조 상수로 둔다(시각 상수 — 밸런스 수치 아님).
const SETTLE_REST_HOUR = 22;
function restEnergyValue(atHour, collapse = false) {
  const hasBed = items.some(i => i.defId === 'bed');
  const cozy = comfortDetail().score;
  const hour = atHour != null ? atHour : gameHour();
  if (collapse) {
    // 05시 자동 취침: 몸이 버티지 못하고 쓰러진다 — 회복은 바닥 취침 수준(cozy 보너스 없음).
    return { hasBed, collapse: true, energy: Math.min(100, BAL.rest.floorEnergy) };
  }
  const onsenRest = hasMod('onsen') ? BAL.highland.onsenRestBonus : 0; // 1.3 온천: 취침 에너지 회복 보너스(대형)
  const base = (hasBed ? BAL.rest.bedEnergy : BAL.rest.floorEnergy) + (cozy >= BAL.rest.cozyThreshold ? BAL.rest.cozyBonus : 0) + onsenRest;
  // #88 탐험 피로: 한도까지 탐험한 날은 밤샘 페널티가 가중된다(이른 취침 보너스는 그대로 — 일찍 자면 무손해).
  let hourMod = restHourMod(hour);
  if (state.expFatigue != null && hourMod < 0) hourMod *= BAL.rest.expFatigueLateMult;
  const energy = Math.max(0, Math.min(100, base + hourMod));
  return { hasBed, collapse: false, energy };
}
function sleepUntilMorning(auto = false, opt = {}) {
  if (DEMO_ED && state.demoEnded) { if (!auto) toast(t('demo.end.locked')); return; } // #74: 시간 점프 봉인
  if (!auto && paused) { toast(t('pause.blocked')); return; }
  if (state.exp) { toast(t('sleep.cantDuringExp')); return; }
  if (blackoutActive) return;
  const collapse = !!opt.collapse;
  const { hasBed, energy } = restEnergyValue(gameHour(), collapse);
  blackout(() => {
    // 정점(검은 화면)에서 시간 점프·에너지 회복·노트 — 유저 눈엔 자연스러운 취침
    // 다음 07:00으로 — 저녁~자정 취침은 다음날 아침, 자정 이후(01~05시) 취침은 같은 날 아침(하루 스킵 방지).
    // 하루 정산(processDay)은 tickTime의 자정 롤오버가 이미 처리했다(같은 날 07:00으로 가면 재정산 없음).
    const dayStart = Math.floor(state.gameMin / 1440) * 1440;
    const wakeToday = dayStart + WAKE_HOUR * 60;
    state.gameMin = state.gameMin < wakeToday ? wakeToday : dayStart + 1440 + WAKE_HOUR * 60;
    state.energy = energy;
    state.expFatigue = null; // #88: 잠들면 탐험 피로 해소
    const e = Math.round(state.energy);
    // 05시 쓰러짐은 전용 문구 — 자발적 취침과 톤을 구분한다.
    const noteKey = collapse ? 'sleep.noteCollapse' : (hasBed ? 'sleep.noteBed' : 'sleep.noteFloor');
    state.dayLog.notes.push(t(noteKey, { e }));
    questProgress('sleep'); // 온보딩: 취침으로 하루 마무리 → 기상 후 아침 보고가 결산을 가르친다
    // 기상 토스트·'dawn' SFX는 페이드아웃(눈 뜨는 시점)에
    toast(collapse
      ? t('sleep.collapse', { e })
      : auto
        ? t(hasBed ? 'sleep.autoBed' : 'sleep.autoFloor', { e })
        : t(hasBed ? 'sleep.wakeBed' : 'sleep.wakeFloor', { e }));
    scheduleSave();
    updateHud();
    updateClock();
    playSfx('dawn');
    // #86: 기상 연출 — 침대가 있으면 그 위에서 눈을 뜨고(2.6초 누움→일어남), 없으면 바닥에서.
    if (typeof avatarSys !== 'undefined') {
      const bed = items.find(i => i.defId === 'bed');
      avatarSys.wakeOnBed(bed ? { x: bed.x, z: bed.z, y: 0.63, rot: bed.rot, defId: 'bed' } : null);
    }
    // F-1a [B] 고양이 티저: 새벽 울음 1회 (등장은 Day9 불변 — 기대감). meow 저피치로 먼 울음 느낌.
    if (state.catTeaserMeow) {
      state.catTeaserMeow = false;
      setTimeout(() => { try { playSfx(['meow1', 'meow2', 'meow3'][Math.floor(Math.random() * 3)], { rate: 0.7, jitter: 0.04, vol: 0.55 }); } catch (e) {} }, 900);
    }
  });
}

// 취침 확인창 — 현재 시각 기준 예상 회복량을 미리 보여준다 (v1.2.0 취침 자율화).
async function promptSleep() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (state.exp) { toast(t('sleep.cantDuringExp')); return; }
  if (blackoutActive) return;
  const { energy } = restEnergyValue();
  const cur = Math.round(state.energy);
  const to = Math.round(energy);
  const ok = await gameConfirm(
    t('sleep.confirm', { cur, to }),
    t('sleep.confirmYes'),
    t('confirm.cancel'),
  );
  if (ok) sleepUntilMorning();
}

/* ── 세이브 슬롯 (Steam 대비: 슬롯 3개 + 최근 슬롯 기억) ── */
// 표시할 세이브 슬롯 칸수 = max(5, 채워진 슬롯+1) — 항상 빈 칸 1개 이상, 사실상 무한.
// 저장 키는 slot1.. 연속. 구 3슬롯은 그대로 slot1~3에 남아 완전 호환.
const SLOT_MIN = 5;
// 채워진 슬롯의 최대 번호를 찾아, 그보다 1칸 더(빈 칸) 보여준다. 하한 SLOT_MIN.
function slotDisplayCount() {
  let maxFilled = 0;
  // 상한 없이 스캔하되 실무 안전 상한(200) — 사용자가 200칸을 채우는 일은 없다.
  for (let n = 1; n <= 200; n++) { if (localStorage.getItem(slotKey(n))) maxFilled = n; }
  return Math.max(SLOT_MIN, maxFilled + 1);
}
const slotKey = n => `${KEY_NS}project-shelter-slot${n}`; // #89: QA 에디션은 qa- 네임스페이스 — 정식 세이브와 불가침

/* ── 계정 통계 (세이브 아닌 로컬 영속, Platform 어댑터 경유) ──
   배경화면 모드 해금(노말 누적 최고 생존일 ≥ BAL.rescue.unlockDay) 판정용.
   QA 치트로 오염된 런은 집계하지 않는다(qaUsed). */
function readStats() {
  try { return JSON.parse(Platform.cloud.load('nw-stats') || '{}') || {}; } catch (e) { return {}; }
}
function writeStats(s) { Platform.cloud.save('nw-stats', JSON.stringify(s)); }
// 노말 모드에서 도달한 최고 생존일 갱신 (배경화면 해금 통계). day는 현재 게임일.
function recordNormalDay(day) {
  if (_simRunning || state.mode !== 'normal' || state.qaUsed) return; // 시뮬레이션은 계정 통계 오염 금지
  const s = readStats();
  if ((s.normalBestDay || 0) < day) { s.normalBestDay = day; writeStats(s); }
}
function wallpaperUnlocked() { return (readStats().normalBestDay || 0) >= (BAL.rescue?.unlockDay || 150); }
let currentSlot = parseInt(localStorage.getItem(LASTSLOT_KEY) || '1', 10) || 1;
function readSlot(n) {
  try { return JSON.parse(localStorage.getItem(slotKey(n)) || 'null'); } catch (e) { return null; }
}
function slotMeta(n) {
  const d = readSlot(n);
  if (!d?.state) return null;
  const st = d.state;
  const se = SEASONS[Math.floor(((st.day || 1) - 1) / SEASON_DAYS) % 4];
  return {
    day: st.day || 1, season: se, shelter: SHELTERS[st.current] ? SHELTERS[st.current] : SHELTERS.container,
    successes: st.successes || 0, mode: ['hard', 'zen', 'hardcore', 'wallpaper'].includes(st.mode) ? st.mode : 'normal',
    runEnded: !!st.runEnded, // 끝난 기록(이어하기 불가, 회고 열람만)
    // Nine Winters(#11): 슬롯/이어하기에 겨울 수 (없으면 day로 역산 — 마이그레이션과 동일 규칙)
    winters: st.winters != null ? st.winters : Math.floor(((st.day || 1) - 1) / SEASON_DAYS / 4),
    qaUsed: !!st.qaUsed,
    saved: st.savedAt ? new Date(st.savedAt).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
  };
}
let saveTimer = null;
function doSaveNow() {
  if (QA_ED) state.qaUsed = true; // #89: QA 에디션 세이브는 전부 오염 각인 — 정식 빌드로 옮겨 심어도 업적·통계 무효
  // P1-A: 게임을 시작한 적 없는 첫 실행에서 타이틀 조작(언어/설정)이
  // 유령 세이브('이어하기' 오노출)를 만들지 않게 — 슬롯이 없고 아직 타이틀이면 옵션만 전역 키에 저장
  const slotExists = !!localStorage.getItem(slotKey(currentSlot));
  if (titleVisible && !slotExists) {
    try { localStorage.setItem('nw-opts', JSON.stringify(opts)); } catch (e) { /* 저장 불가 무시 */ }
    return;
  }
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2) }));
  state.savedAt = Date.now();
  // REQ-STEAM-01: 세이브 경로를 클라우드 어댑터 경유 (현재 localStorage 위임 — 동작 불변, Steam Cloud 미러 지점).
  Platform.cloud.save(slotKey(currentSlot), JSON.stringify({ state, opts }));
  Platform.cloud.save(LASTSLOT_KEY, String(currentSlot));
  Platform.cloud.save('nw-opts', JSON.stringify(opts)); // 전역 옵션 동기화 (언어/음량 승계용)
  checkAchievements();               // 업적 체크 (모든 변화는 저장을 거친다)
  updateHud();                       // 쾌적함 반영
  if (!state.exp) renderExpPanel();  // 보정된 성공률 반영
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSaveNow, 400);
}
// 예약된 저장이 있으면 즉시 실행 (내보내기 등 저장 직후 원본이 필요한 경우)
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  doSaveNow();
}
function backupKey(n) { return `${slotKey(n)}-bak`; }
function loadSave() {
  try {
    // 구버전 단일 세이브 → 슬롯 1로 이전
    const legacy = localStorage.getItem(SAVE_KEY);
    if (legacy && !localStorage.getItem(slotKey(1))) {
      localStorage.setItem(slotKey(1), legacy);
      localStorage.removeItem(SAVE_KEY);
    }
    let data;
    try {
      data = readSlot(currentSlot);
      if (localStorage.getItem(slotKey(currentSlot)) && !data) throw new Error('corrupt');
    } catch (e) {
      // 메인 슬롯 손상 → 어제 백업 시도
      try {
        const bak = localStorage.getItem(backupKey(currentSlot));
        data = bak ? JSON.parse(bak) : null;
        if (data) {
          localStorage.setItem(slotKey(currentSlot), bak);
          toast(t('save.corrupt'));
        }
      } catch (e2) { data = null; }
    }
    if (!data) { currentSlot = 1; data = readSlot(1); }
    if (data) {
      const oldVer = data.state?.ver || 2;
      const defaults = JSON.parse(JSON.stringify(state)); // 신규 필드 기본값 보존
      Object.assign(state, data.state);
      Object.assign(opts, data.opts);
      // 효과음/배경음 기본값 하향 마이그레이션 (구 기본값은 사용자가 고른 값이 아님)
      if (opts.sfxVol === 0.7) opts.sfxVol = 0.07;
      if (opts.bgmVol === 0.35) opts.bgmVol = 0.15;
      // 구버전(v2) 필드 보정
      if (oldVer < 3) {
        // v0.3 시절 옥상 캠프 레이아웃은 벙커로 이전 (v3의 rooftop은 새 셸터)
        if (state.layouts.rooftop?.length) {
          state.layouts.bunker = [...(state.layouts.bunker || []), ...state.layouts.rooftop];
        }
        state.layouts.rooftop = [];
        for (const k of ['res', 'gameMin', 'day', 'savedAt', 'weatherType', 'weatherUntil', 'cleanBy', 'upkeepOk', 'dayLog', 'stats'])
          state[k] = defaults[k];
        state.injury = null;
        delete state.injuredUntil;
        state.ver = 3;
      }
      if (!state.renovated) state.renovated = { container: true };
      for (const id of Object.keys(SHELTERS)) {
        if (!state.layouts[id]) state.layouts[id] = [];
        if (state.cleanBy[id] == null) state.cleanBy[id] = 70;
        // 이미 살아봤던 셸터는 정비 완료로 인정 (구버전 세이브 보호)
        if (state.layouts[id].length > 0 || state.current === id) state.renovated[id] = true;
      }
      for (const id of Object.keys(RESOURCES)) if (state.res[id] == null) state.res[id] = 0;
      if (!state.mode) state.mode = 'normal'; // 구세이브는 전부 노말 취급
      if (state.hunger == null) state.hunger = 80;
      if (state.thirst == null) state.thirst = 80;
      if (state.energy == null) state.energy = 100;
      if (state.catCoat == null || !['tabby', 'black', 'siamese', 'ragdoll'].includes(state.catCoat)) state.catCoat = 'tabby'; // 배E-1: 구세이브 코트 폴백
      if (state.expToday == null) state.expToday = 0;
      state.expFailStreak = state.expFailStreak ?? 0; // 구세이브 마이그레이션
      if (state.tutDay == null) state.tutDay = 0;
      if (!state.tipsSeen) state.tipsSeen = {};
      if (state.pendingTutorial === undefined) state.pendingTutorial = null;
      // Nine Winters(#11) 마이그레이션: 세이브에 winters 필드가 아예 없던 구세이브면 day로 역산해 카운터만 맞춘다.
      // (DEFAULT_STATE.winters=0이라 Object.assign 뒤 state.winters는 항상 존재하므로, "필드 유무"는 원본 data.state로 판정해야 한다.)
      // 과거를 소급해도 겨울 시작 스냅샷이 없어 memoir는 빈다 — 그래서 memoir는 '다음 겨울'부터, 카운터만 절충.
      if (data.state.winters == null) state.winters = Math.floor((state.day - 1) / SEASON_DAYS / 4);
      if (data.state.winterSnap === undefined) state.winterSnap = null;   // 스냅샷 없음 → 다음 겨울 시작 때 생성
      if (!Array.isArray(state.pendingWinterMemoir)) state.pendingWinterMemoir = [];
      if (data.state.doctorRadioPending == null) state.doctorRadioPending = false;
      // Phase D 마이그레이션 (#12·#35·#36) — 구세이브에 없던 필드는 기본값으로 보정
      if (!Array.isArray(state.evHistory)) state.evHistory = [];
      if (state.moodBuff === undefined) state.moodBuff = null;
      if (state.memos == null || typeof state.memos !== 'object') state.memos = {};
      if (state.broadcasts == null || typeof state.broadcasts !== 'object') state.broadcasts = {};
      if (state.distantLight === undefined) state.distantLight = null;
      if (state.pendingMemoPopup === undefined) state.pendingMemoPopup = null;
      if (state.pendingBroadcast === undefined) state.pendingBroadcast = null;
      if (state.lastBroadcastDay == null) state.lastBroadcastDay = 0;
      if (state.pipeFrozenUntil == null) state.pipeFrozenUntil = 0;
      if (state.bunkerRoof == null) state.bunkerRoof = 'hole';
      if (state.bunkerBackdoor == null) state.bunkerBackdoor = false;
      if (state.hasCutter == null) state.hasCutter = false;
      if (state.rooftopSlate == null) state.rooftopSlate = 'gapped'; // #53
      if (state.rooftopGardenStage == null) state.rooftopGardenStage = 0; // #53
      if (state.projects == null || typeof state.projects !== 'object') state.projects = {}; // 1.1 대형 프로젝트 (ARC-02): 구세이브(부재) → {}
      if (state.breakwaterHut == null) state.breakwaterHut = false; // 1.1 항구: 방파제 오두막 완공 플래그
      if (state.icefishToday == null) state.icefishToday = 0;       // 1.1 항구: 얼음낚시 하루 스팟
      if (state.res.salt == null) state.res.salt = 0;               // 1.1 항구: 신규 자원 소금 (구세이브)
      if (state.subwayHub == null) state.subwayHub = false;         // 1.2 지하: 허브 승격 (구세이브 → 미승격)
      if (state.subwayOpen == null || typeof state.subwayOpen !== 'object') state.subwayOpen = {}; // 1.2 지하: 개통 구간 맵
      if (state.mushroomWaterTimer == null) state.mushroomWaterTimer = 0; // 1.2 지하: 버섯 물 카운터
      if (state.marketToday == null) state.marketToday = 0;         // 1.2 지하: 암시장 하루 슬롯
      // 1.3 고원 (구세이브 → 미개방/미예보)
      if (state.cablecarDone == null) state.cablecarDone = false;
      if (state.observatoryDone == null) state.observatoryDone = false;
      if (state.avalancheForecast == null) state.avalancheForecast = 0;
      if (state.avalancheBlockUntil == null) state.avalancheBlockUntil = 0;
      if (state.sketches == null || typeof state.sketches !== 'object') state.sketches = {};
      if (state.nightSkyToday == null) state.nightSkyToday = 0;
      if (state.pendingSketchPopup === undefined) state.pendingSketchPopup = null;
      if (state.deco == null || typeof state.deco !== 'object') state.deco = {}; // #13 꾸미기
      // 1.4 금지 구역 (구세이브 → 미제작/미완공/미송출)
      if (state.hazmat === undefined) state.hazmat = null;
      if (state.hazmatDone == null) state.hazmatDone = false;
      if (state.radioBaseDone == null) state.radioBaseDone = false;
      if (state.broadcasts_sent == null || typeof state.broadcasts_sent !== 'object') state.broadcasts_sent = {};
      if (state.survivorLights == null) state.survivorLights = 0;
      if (state.doctorRegularSeen == null) state.doctorRegularSeen = false;
      if (state.doctorRadioRegularPending == null) state.doctorRadioRegularPending = false;
      if (data.state.questIdx === undefined) state.questIdx = (state.day > 1 || state.successes > 0) ? -1 : 0;
      if (!SHELTERS[state.current]) state.current = 'container';
      // 오프라인 시간 진행 (최대 2일) + 그동안의 허기/갈증
      const elapsed = Math.max(0, (Date.now() - (state.savedAt || Date.now())) / 1000);
      const offlineMin = Math.min(2880, elapsed * GAME_MIN_PER_SEC);
      state.gameMin += offlineMin;
      decayGauges(offlineMin);
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

/* ============================================================
   아이템 관리 (배치 / 이동 / 충돌 / 인벤토리)
============================================================ */
const items = [];
const itemsRoot = new THREE.Group();
scene.add(itemsRoot);

function footprintOf(item) {
  const fp = DEFS[item.defId].fp;
  return item.rot % 2 ? { w: fp.d, d: fp.w } : { w: fp.w, d: fp.d };
}
// 발광 가구 공용 헤일로 텍스처 (방사형 그라데이션) — 광원 주위에 "빛나는 티"를 내는 스프라이트용
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.32)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(cv);
  return _glowTex;
}
/* ④ 제작 손맛 연출 (GD-THESIS L1): 제작 완료 시 결과물 아이콘 스프라이트가 작업대 위로 ~1초
   떠올랐다 사라지고, 반짝임 입자 3~4개가 함께 튄다. 기존 craft 사운드는 호출부에서 유지. */
const _emojiTexCache = new Map();
function emojiTex(emoji) {
  if (_emojiTexCache.has(emoji)) return _emojiTexCache.get(emoji);
  const S = 128;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g2 = cv.getContext('2d');
  g2.font = `${Math.floor(S * 0.72)}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
  g2.textAlign = 'center'; g2.textBaseline = 'middle';
  g2.fillText(emoji || '📦', S / 2, S / 2 + S * 0.04);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  _emojiTexCache.set(emoji, tex);
  return tex;
}
let _sparkTex = null;
function sparkTex() {
  if (_sparkTex) return _sparkTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 15);
  gr.addColorStop(0, 'rgba(255,247,214,1)');
  gr.addColorStop(0.4, 'rgba(255,230,150,0.7)');
  gr.addColorStop(1, 'rgba(255,220,120,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
  _sparkTex = new THREE.CanvasTexture(cv);
  return _sparkTex;
}
const craftFx = []; // 진행 중인 제작 연출 { grp, sprites[], t, dur }
const CRAFT_FX_DUR = 1.05; // 아이콘 떠오름 지속(~1초). 렌더 연출 상수.
// 작업대 위치: 배치된 table 가구가 있으면 그 위, 없으면 셸터 중앙 낮은 지점.
function craftAnchor() {
  let best = null;
  for (const it of items) {
    const surf = DEFS[it.defId]?.surface; // 상판 있는 가구(테이블/작업대 등)
    if (surf) {
      // 화면 중앙에 가장 가까운 상판을 우선(여러 개면)
      const d = Math.hypot(it.x - camCenter.x, it.z - camCenter.z);
      if (!best || d < best.d) best = { x: it.x, z: it.z, y: (it.y || 0) + (surf.y ?? 0.5) + 0.12, d };
    }
  }
  if (best) return best;
  return { x: camCenter.x, z: camCenter.z, y: 0.7 };
}
function spawnCraftFx(emoji) {
  if (opts.reduceMotion) return; // 접근성: 흔들림·깜빡임 감소 시 연출 생략
  const a = craftAnchor();
  const grp = new THREE.Group();
  grp.position.set(a.x, a.y, a.z);
  // 결과물 아이콘 스프라이트
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: emojiTex(emoji), transparent: true, opacity: 0, depthWrite: false, depthTest: false,
  }));
  icon.scale.set(0.5, 0.5, 1);
  grp.add(icon);
  // 반짝임 입자 3~4개
  const sprites = [];
  const nSpark = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < nSpark; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkTex(), transparent: true, opacity: 0, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
    }));
    const ang = Math.random() * Math.PI * 2, rad = 0.12 + Math.random() * 0.18;
    sp.userData.ox = Math.cos(ang) * rad;
    sp.userData.oz = Math.sin(ang) * rad;
    sp.userData.oy = 0.1 + Math.random() * 0.35;
    sp.userData.ph = Math.random();
    sp.scale.set(0.14, 0.14, 1);
    grp.add(sp);
    sprites.push(sp);
  }
  scene.add(grp);
  craftFx.push({ grp, icon, sprites, t: 0, dur: CRAFT_FX_DUR });
}
function updateCraftFx(dt) {
  for (let i = craftFx.length - 1; i >= 0; i--) {
    const fx = craftFx[i];
    fx.t += dt;
    const u = fx.t / fx.dur; // 0→1
    if (u >= 1) {
      scene.remove(fx.grp);
      fx.icon.material.map = null; fx.icon.material.dispose(); // 스프라이트 재질만 해제(공유 텍스처는 캐시 유지)
      for (const sp of fx.sprites) sp.material.dispose();
      craftFx.splice(i, 1);
      continue;
    }
    // 아이콘: 위로 떠오르며(0→0.55) 페이드 인(0~0.25) 후 유지, 후반(0.7~1) 페이드 아웃
    fx.icon.position.y = 0.55 * (1 - Math.pow(1 - u, 2)); // 이즈아웃 상승
    const inA = Math.min(1, u / 0.22);
    const outA = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;
    fx.icon.material.opacity = inA * outA;
    const pop = u < 0.3 ? 0.5 + Math.sin(u / 0.3 * Math.PI) * 0.12 : 0.5; // 등장 시 살짝 팝
    fx.icon.scale.set(pop, pop, 1);
    // 반짝임: 바깥·위로 튀며 반짝 명멸 후 소멸
    for (const sp of fx.sprites) {
      const su = Math.min(1, u * 1.3);
      sp.position.set(sp.userData.ox * su, sp.userData.oy * su + 0.15, sp.userData.oz * su);
      const flick = 0.6 + 0.4 * Math.sin((u * 12 + sp.userData.ph * 6));
      sp.material.opacity = Math.max(0, (1 - su)) * flick;
    }
  }
}
function buildItemGroup(item) {
  const def = DEFS[item.defId];
  const g = def.build(def.colors[item.colorIdx], item.colorIdx);
  item.glowMeshes = [];
  g.traverse(o => {
    if (o.isMesh) {
      o.userData.origEmissive = o.material.emissive ? o.material.emissive.getHex() : 0;
      o.userData.origEmissiveI = o.material.emissiveIntensity ?? 1;
      if (o.userData.glow) item.glowMeshes.push(o);
    }
  });
  if (def.light) {
    const L = new THREE.PointLight(def.light.color, def.light.intensity, def.light.dist, 1.8);
    L.position.set(0, def.light.y, 0);
    g.add(L);
    item.lightObj = L;
    item.lightBase = def.light.intensity;
    // 헤일로: 포인트 라이트만으론 광원 자체가 빛나 보이지 않는다 — 가산 스프라이트로 발광체 표식
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: def.light.color, blending: THREE.AdditiveBlending,
      transparent: true, opacity: 0.3, depthWrite: false,
    }));
    const sc = Math.max(0.85, def.light.dist * 0.16);
    sp.scale.set(sc, sc, 1);
    sp.position.set(0, def.light.y, 0);
    g.add(sp);
    item.glowSprite = sp;
    item.glowBase = 0.3;
  }
  g.userData.item = item;
  return g;
}
function syncTransform(item) {
  item.group.position.set(item.x, item.y || 0, item.z);
  item.group.rotation.y = item.rot * Math.PI / 2;
  shadowDirty();
}
function addItem(defId, colorIdx, x, z, rot, on = true, y = 0) {
  const item = { defId, colorIdx, x, z, rot, on, y, support: null };
  item.group = buildItemGroup(item);
  syncTransform(item);
  itemsRoot.add(item.group);
  items.push(item);
  if (DEFS[defId].light || DEFS[defId].appliance) setItemPower(item, on);
  return item;
}
// 조명 전원 (기획서 v0.2: 조명 ON/OFF + 일일 소비)
// silent=false(사용자가 직접 토글할 때만)이면 촛불류(candle/lantern) 켜고 끌 때 성냥음 재생.
// 연료 부족 자동 꺼짐(processDay)이나 배치/로드 시 초기화에서는 silent 기본값(true)이라 재생되지 않는다.
function setItemPower(item, on, { silent = true } = {}) {
  item.on = on;
  if (item.lightObj) item.lightObj.visible = on;
  if (item.glowSprite) item.glowSprite.visible = on;
  for (const m of (item.glowMeshes || [])) {
    m.material.emissiveIntensity = on ? m.userData.origEmissiveI : 0.03;
  }
  if (!silent && ['candle', 'lantern'].includes(item.defId)) {
    playSfx('candle_light', { vol: 0.6, jitter: 0.04 });
  }
  shadowDirty();
}
function removeItem(item) {
  itemsRoot.remove(item.group);
  disposeDeep(item.group);
  const i = items.indexOf(item);
  if (i >= 0) items.splice(i, 1);
  catSys.setCatSupportDirty(true); // ⑥a: 다음 틱에 퍼치 중인 고양이 지지면 유효성 1회 검사 (사라졌으면 hop 착지)
  shadowDirty();
}
function recolorItem(item, colorIdx) {
  item.colorIdx = colorIdx;
  itemsRoot.remove(item.group);
  disposeDeep(item.group);
  item.lightObj = null;
  item.group = buildItemGroup(item);
  syncTransform(item);
  itemsRoot.add(item.group);
  if (DEFS[item.defId].light || DEFS[item.defId].appliance) setItemPower(item, item.on !== false);
}
function clampToRoom(item, x, z) {
  const fp = footprintOf(item);
  const mx = ROOM.w / 2 - fp.w / 2 - 0.06, mz = ROOM.d / 2 - fp.d / 2 - 0.06;
  return [THREE.MathUtils.clamp(x, -mx, mx), THREE.MathUtils.clamp(z, -mz, mz)];
}
// 표면 스태킹: 소품(stackable)을 테이블 등(surface) 위에 올릴 수 있다
function surfaceRectOf(other) {
  const s = DEFS[other.defId].surface;
  if (!s) return null;
  return other.rot % 2 ? { w: s.d, d: s.w, y: s.y } : { w: s.w, d: s.d, y: s.y };
}
function findSupport(item, x, z) {
  if (!DEFS[item.defId].stackable) return null;
  const fp = footprintOf(item);
  for (const other of items) {
    if (other === item || other.y) continue;
    const sr = surfaceRectOf(other);
    if (!sr) continue;
    // 소품 중심이 상판 안쪽에 있으면 올려놓기 (살짝 걸치는 건 허용)
    if (Math.abs(x - other.x) <= Math.max(0.02, sr.w / 2 - fp.w * 0.3) &&
        Math.abs(z - other.z) <= Math.max(0.02, sr.d / 2 - fp.d * 0.3)) return { other, y: sr.y };
  }
  return null;
}
function itemsOn(support) { return items.filter(i => i.support === support); }
function collides(item, x, z) {
  if (DEFS[item.defId].noCollide) return false;
  const sup = findSupport(item, x, z);
  item._support = sup;
  const fp = footprintOf(item);
  for (const other of items) {
    if (other === item || DEFS[other.defId].noCollide) continue;
    if (sup) {
      // 표면 위: 지지대와는 겹쳐도 되고, 같은 표면 위 소품끼리만 충돌
      if (other === sup.other || other.support !== sup.other) continue;
    } else if (other.support) continue; // 상대가 표면 위에 있으면 바닥과는 무관
    const ofp = footprintOf(other);
    if (Math.abs(x - other.x) < (fp.w + ofp.w) / 2 - 0.02 &&
        Math.abs(z - other.z) < (fp.d + ofp.d) / 2 - 0.02) return true;
  }
  if (sup) return false;
  for (const b of blockers) {
    if (Math.abs(x - b.x) < (fp.w + b.w) / 2 - 0.02 &&
        Math.abs(z - b.z) < (fp.d + b.d) / 2 - 0.02) return true;
  }
  // #86③ (디렉터: "사람이 있으면 그 위에 설치 안되게"): '나'가 선 자리엔 바닥 설치 불가.
  //   이 함수는 배치 프리뷰 이동마다 호출된다 — 아바타 비켜서기 트리거도 같은 지점에서 겸한다.
  if (typeof avatarSys !== 'undefined' && avatarSys.blocksPlacement(x, z, fp)) return true;
  return false;
}
// 지지대가 사라지거나 이동했을 때 위에 있던 소품 정리
function dropChildrenOf(support) {
  for (const ch of itemsOn(support)) {
    ch.support = null; ch.y = 0;
    if (collides(ch, ch.x, ch.z)) {
      state.inventory[ch.defId] = (state.inventory[ch.defId] || 0) + 1;
      removeItem(ch);
      toast(t('drop.child', { emoji: DEFS[ch.defId].emoji, name: LName(DEFS[ch.defId]) }));
    } else syncTransform(ch);
  }
}
function setGhostVisual(item, mode) {
  item.group.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (mode) {
      m.transparent = true; m.opacity = 0.75;
      if (!o.userData.glow) {
        m.emissive.setHex(mode === 'invalid' ? 0x7a2020 : 0x1e3a1e);
        m.emissiveIntensity = 0.9;
      }
    } else {
      m.transparent = false; m.opacity = 1;
      m.emissive.setHex(o.userData.origEmissive);
      m.emissiveIntensity = o.userData.origEmissiveI;
    }
  });
}

/* ============================================================
   셸터 로드 / 이주
============================================================ */
const gridHelper = new THREE.GridHelper(1, 1);
gridHelper.visible = false;
scene.add(gridHelper);
let gridObj = gridHelper; // 재생성 대상

// F-1a [B]: 창밖 원거리 연기 기둥 1개 — 먼 생존 흔적. 도심/외곽 방향(-z 지평선) 고정.
//   기존 도심 연기(city buildEnv) 문법 재사용. envDyn.smoke 미설정 셸터에만 1개 추가(indoor 제외).
//   tickEnv 의 envDyn.smoke 애니메이터가 baseX 기준으로 상승/사행시킨다.
function addDistantSmoke() {
  if (envDyn.smoke) return;                 // 이미 있는 셸터(도심 등)는 건드리지 않음
  if (!!SHELTERS[state.current]?.indoor) return; // 실내(지하철)는 하늘/지평선 없음
  const baseX = -20, baseZ = -34;           // 먼 지평선(-z 방향, 도심 쪽), 병치 공식과 어긋나지 않게 원거리
  const n = 12, arr = new Float32Array(n * 3), sPhase = [];
  const srand = seededRand(701);
  for (let i = 0; i < n; i++) {
    const y = 2 + (i / n) * 13;
    arr.set([baseX + Math.sin(i * 1.7) * 0.8, y, baseZ + Math.cos(i * 1.3) * 0.8], i * 3);
    sPhase.push(srand() * Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x6a6f78, size: 6, sizeAttenuation: false, transparent: true, opacity: 0.24, fog: false,
  }));
  envRoot.add(pts);
  envDyn.smoke = { pts, phase: sPhase, baseX };
}

function loadShelter(id) {
  cancelPlacing();
  deselect();
  // 기존 배치/방/환경 해체
  while (items.length) {
    const it = items.pop();
    itemsRoot.remove(it.group);
    disposeDeep(it.group);
  }
  disposeDeep(roomGroup); roomGroup.clear();
  disposeDeep(envRoot); envRoot.clear();
  wallList = []; ceilCullList = []; blockers = []; envDyn = {}; swayProps = [];
  wlObstacles = []; // #95: 야생동물 장애물 등록부 리셋 — buildEnv(폐차/전신주/근접 나무)가 다시 채운다
  ogResetRegistry(); // #71: 잠식 대상 등록부 리셋 — buildEnv가 채우고 buildOvergrowth가 소비
  bunkerStairsObj = null; // #55: 계단 히트 대상 재수집
  weatherFx.caps = []; wetApplied = -1;
  wetFxBuilt = false; wetGlintAnchors.length = 0; weatherFx.puddles = []; weatherFx.glints = []; // #96 젖은 도시 리셋 (메시는 envRoot dispose가 해체)
  winSkyMats.length = 0; // 창문 하늘판 재수집
  sunShafts.length = 0; sunMotes.length = 0; // 빛기둥/먼지도 재수집 (envRoot dispose와 함께 소멸)
  winFrostMats.length = 0; // ③ 창유리 성에 오버레이 재수집
  // 초봄(Day 1~2) 시작: 겨울의 끝자락 잔설이 남아있다가 서서히 녹는다 (최초 입장 1회만 시딩)
  if (!snowSeeded && state.day <= 2 && seasonOf().id === 'spring') { snowCover = 0.25; snowSeeded = true; }

  state.current = id;
  const sh = SHELTERS[id];
  ROOM = { ...sh.room };
  if ((state.mods?.[id] || []).includes('extension')) ROOM.w += 2; // 증축
  sh.buildRoom();
  sh.buildEnv();
  // #71: 연차·계절 비례 도심 잠식 — 로드 시 1회 재생성. 플레이 중 하루가 넘어가도 즉시 갱신하지
  //   않는다(성장은 느린 현상 — 다음 로드/이주/재입장에 반영이면 충분, 의도된 주기).
  buildOvergrowth();
  addDistantSmoke(); // F-1a [B]: 창밖 원거리 연기 기둥(먼 생존 흔적) — 없는 셸터에만 1개
  buildModProps(); // 설치된 개조 소품
  applyDeco();     // 꾸미기(#13): 벽지/바닥재 재질 적용 (셸터 원본 map 위에 오버레이)
  scatterDust();   // 실내 먼지 모트 재배치
  applyMood(sh.mood);
  ensureWeather();
  ceilLight.position.set(0, sh.ceilY, 0);

  // 그리드 재생성
  scene.remove(gridObj);
  gridObj.geometry?.dispose?.();
  const gmax = Math.max(ROOM.w, ROOM.d);
  gridObj = new THREE.GridHelper(gmax, gmax / GRID, 0xe8a86c, 0x6b5a40);
  gridObj.material.transparent = true;
  gridObj.material.opacity = 0.22;
  gridObj.position.y = 0.02;
  gridObj.scale.set(ROOM.w / gmax, 1, ROOM.d / gmax);
  gridObj.visible = false;
  scene.add(gridObj);

  // 저장된 레이아웃 복원 (표면 위 소품은 지지대 링크 재구성)
  // 마이그레이션(#53): 방(ROOM) 치수가 줄어든 셸터(옥탑 리워크)에서 구 좌표 가구가 방 밖에 있으면
  // 로드 시 방 안으로 클램프한다 — 유실 없이 보존. clampToRoom은 footprint를 고려하므로 defId 임시 아이템으로 계산.
  for (const it of (state.layouts[id] || [])) {
    if (!DEFS[it.d]) continue;
    const [cx, cz] = clampToRoom({ defId: it.d, colorIdx: it.c ?? 0, rot: it.r ?? 0 }, it.x, it.z);
    addItem(it.d, it.c ?? 0, cx, cz, it.r ?? 0, it.o !== 0, it.y || 0);
  }
  for (const it of items) {
    if (!it.y) continue;
    const sup = findSupport(it, it.x, it.z);
    if (sup) { it.support = sup.other; it.y = sup.y; }
    else it.y = 0; // 지지대가 사라졌으면 바닥으로
    syncTransform(it);
  }
  despawnCat();
  if (state.cat) spawnCat(); // 고양이는 이사할 때도 함께 간다
  // F-1a: 야생동물 재구성 — 셸터(구역)별 종·로밍 존으로 상시 1~2마리 스폰(개막 새 착지 포함).
  if (typeof wildlifeSys !== 'undefined') wildlifeSys.respawn(id);
  if (typeof avatarSys !== 'undefined') avatarSys.respawn(); // #86: 셸터마다 '나'를 다시 세운다
  fitZoomForShelter();
  // #70: 팬은 세이브에 저장하지 않는다 — 셸터 로드/이주 시 항상 방 중심(0,0)에서 시작.
  camState.panX = camState.panZ = camState.targetPanX = camState.targetPanZ = 0;
  // 벽 컬링을 로드 시점에 동기로 확정한다 (실기기 신고: 부팅 직후 컨테이너 벽 하나가 사라져 T자로 보이다
  // 나중에 정상화되던 버그). 원인: 첫 프레임 전 camera.position가 아직 갱신 안 된 상태로 mask가 잘못 잡히고,
  // 다음 mask 변화(카메라 회전)까지 유지됨. → yaw를 targetYaw로 즉시 스냅 + updateCamera로 카메라 확정 후 컬링.
  camState.yaw = camState.targetYaw;
  lastWallMask = -1;
  updateCamera();
  updateWallCulling(0, true); // 로드 시점: 페이드 없이 즉시 확정
  shadowDirty();
  updateHud();
  if (typeof syncBgm === 'function') syncBgm();
}
// 이주 비용: 미정비 셸터는 정비 자원(1회) + 다른 구역이면 여정 물자(음식1·물1)와 시간 3시간
function moveCostFor(id) {
  const cost = {};
  if (!state.renovated[id]) {
    for (const [rid, n] of Object.entries(SHELTERS[id].moveCost || {})) cost[rid] = (cost[rid] || 0) + n;
  }
  const cross = districtOf(id) !== districtOf(state.current);
  if (cross) { cost.food = (cost.food || 0) + BAL.economy.moveCrossFood; cost.water = (cost.water || 0) + BAL.economy.moveCrossWater; }
  return { cost, cross, renov: !state.renovated[id] };
}
async function moveToShelter(id) {
  if (paused) { toast(t('pause.blocked')); return; }
  if (id === state.current) { closeModal(); return; }
  const { cost, cross, renov } = moveCostFor(id);
  if (!resHasAll(cost)) {
    toast(t('move.needSupplies', { cost: costLabel(cost) }));
    return;
  }
  // 이주 확인: 현 거처에 배치된 가구가 있으면 "남는다"고 안내 (인벤토리 공유라 손실 아님)
  const placedN = items.length;
  if (placedN >= 1 && !(await gameConfirm(t('move.confirmFurniture', { n: placedN }), t('confirm.move'), t('confirm.stay')))) return;
  resConsumeAll(cost);
  if (renov) {
    state.renovated[id] = true;
    state.dayLog.notes.push(t('move.renovNote', { name: LName(SHELTERS[id]), cost: costLabel(SHELTERS[id].moveCost || {}) || t('free') }));
  }
  if (cross) {
    state.gameMin += BAL.economy.moveCrossTimeMin; // 구역 간 여정 3시간
    const dn = LName(DISTRICTS[districtOf(id)]); state.dayLog.notes.push(t('move.journeyNote', { name: dn, josa: josa(dn, '으로/로') }));
  }
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2) }));
  state.stayDays = 0; // 새 집은 아직 낯설다
  loadShelter(id);
  scheduleSave();
  renderResBar();
  closeModal();
  { const sn = LName(SHELTERS[id]); toast(t('move.done', { emoji: SHELTERS[id].emoji, name: sn, josa: josa(sn, '으로/로'), journey: cross ? t('move.journeyTag') : '' })); }
}
// 이주 가능 판정: 해금 && 비현재 && 전체 비용 충족인 거처가 하나라도 있으면 true.
// 비용은 moveCostFor(1의 칩 렌더)와 동일 소스 — 로직/표시 불일치 방지.
function canMoveSomewhere() {
  for (const id of Object.keys(SHELTERS)) {
    if (id === state.current || !shelterUnlocked(id)) continue;
    if (resHasAll(moveCostFor(id).cost)) return true;
  }
  return false;
}
// #btn-move 배지 점등/소등 + 신규 해금 1회 토스트. renderResBar(자원 변동)에서 매번 호출.
let moveBadgeShown = false;
function updateMoveBadge() {
  const badge = document.getElementById('move-badge');
  // 신규 해금 토스트: 이주 가능한(해금·비현재) 거처 수가 늘어난 순간 1회
  let unlockedElsewhere = 0;
  for (const id of Object.keys(SHELTERS)) {
    if (id !== state.current && shelterUnlocked(id)) unlockedElsewhere++;
  }
  if (state.lastUnlockCount == null) state.lastUnlockCount = unlockedElsewhere;
  else if (unlockedElsewhere > state.lastUnlockCount) {
    state.lastUnlockCount = unlockedElsewhere;
    if (!titleVisible) toast(t('move.newShelter'));
  } else if (unlockedElsewhere < state.lastUnlockCount) {
    state.lastUnlockCount = unlockedElsewhere; // 이주로 현재지가 바뀌면 감소 — 재점등 방지용 동기화
  }
  if (!badge) return;
  const on = !titleVisible && canMoveSomewhere();
  badge.style.display = on ? '' : 'none';
  moveBadgeShown = on;
}

/* ============================================================
   탐험(파밍) 시스템 — 기획서의 지역별 성공률 기반
============================================================ */
// REGIONS(탐험 지역 수치·메타)는 src/data/world.js로 분리(콘텐츠 데이터 Phase 1). 아래 id 주입 루프는 유지.
for (const [k, v] of Object.entries(REGIONS)) v.id = k;

/* ============================================================
   도트 지도 (기획서: 도트 지도 기반 탐험 선택)
============================================================ */
const MAP = {
  W: 40, H: 28, TILE: 8,
  districts: { coast: { x: 6, y: 13 }, city: { x: 16, y: 8 }, outskirts: { x: 15, y: 21 }, forest: { x: 31, y: 6 }, meadow: { x: 31, y: 19 }, harbor: { x: 4, y: 24 }, highland: { x: 36, y: 3 } },
  regions: { residential: { x: 24, y: 16 }, commercial: { x: 12, y: 10 }, industrial: { x: 8, y: 23 }, slum: { x: 21, y: 12 }, harborYard: { x: 5, y: 26 }, fishMarket: { x: 9, y: 25 }, resort: { x: 37, y: 2 }, checkpoint: { x: 34, y: 25 }, lab: { x: 38, y: 26 } },
};
// 거리 → 탐험 소요 시간 계수 (가까우면 빨리, 멀면 오래)
function regionDistMult(regionId) {
  const a = MAP.districts[districtOf(state.current)] || MAP.districts.outskirts; // 신규 구역 안전 폴백
  const b = MAP.regions[regionId] || MAP.districts[districtOf(state.current)] || MAP.districts.outskirts;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return 0.8 + Math.min(1, dist / 26) * 0.55; // 0.8x ~ 1.35x
}
let mapCanvas = null;
function buildMapCanvas() {
  if (mapCanvas) return mapCanvas;
  const cv = document.createElement('canvas');
  cv.width = MAP.W * MAP.TILE; cv.height = MAP.H * MAP.TILE;
  cv.id = 'map-cv';
  const g = cv.getContext('2d');
  const rand = seededRand(20260703);
  const anchors = [
    ['city', 16, 8], ['waste', 15, 21], ['forest', 31, 6], ['meadow', 31, 19],
  ];
  const palette = {
    water: ['#1d3244', '#22394d'],
    city: ['#3a3f4a', '#434855', '#31353f'],
    waste: ['#4a4234', '#544936', '#3f3a2f'],
    forest: ['#2c4034', '#33493a', '#28382f'],
    meadow: ['#44543c', '#4c5c42', '#3d4d38'],
    road: ['#33342f', '#2f302b'],
  };
  const T = MAP.TILE;
  for (let y = 0; y < MAP.H; y++) {
    for (let x = 0; x < MAP.W; x++) {
      let type = 'waste';
      if (x < 4.5 + Math.sin(y * 0.55) * 1.8) type = 'water';
      else {
        let best = 1e9;
        for (const [t2, ax, ay] of anchors) {
          const d = Math.hypot(x - ax, y - ay) + rand() * 4;
          if (d < best) { best = d; type = t2; }
        }
        if (y === 24 && x > 3) type = 'road'; // 고속도로
      }
      const cs = palette[type];
      g.fillStyle = cs[(x * 7 + y * 13) % cs.length];
      g.fillRect(x * T, y * T, T, T);
      // 지형 디테일 (도트)
      if (type === 'city' && rand() < 0.5) {
        g.fillStyle = '#262a33';
        g.fillRect(x * T + 1, y * T + 2, 3, 5);
        if (rand() < 0.25) { g.fillStyle = '#d9b06a'; g.fillRect(x * T + 2, y * T + 3, 1, 1); }
      } else if (type === 'forest' && rand() < 0.6) {
        g.fillStyle = '#1e3128';
        g.fillRect(x * T + 2, y * T + 2, 3, 4);
        g.fillRect(x * T + 3, y * T + 1, 1, 1);
      } else if (type === 'meadow' && rand() < 0.3) {
        g.fillStyle = '#5c6c4c'; g.fillRect(x * T + (x % 5), y * T + (y % 5), 2, 2);
      } else if (type === 'waste' && rand() < 0.25) {
        g.fillStyle = '#3a332a'; g.fillRect(x * T + (x % 6), y * T + (y % 6), 2, 2);
      } else if (type === 'water' && rand() < 0.2) {
        g.fillStyle = '#2c4258'; g.fillRect(x * T, y * T + 3, 5, 1);
      } else if (type === 'road' && x % 2 === 0) {
        g.fillStyle = '#8a8a72'; g.fillRect(x * T + 1, y * T + 3, 4, 1);
      }
    }
  }
  return mapCanvas = cv;
}
function openMapModal() {
  if (state.exp) { $('exp-panel').classList.add('show'); renderExpPanel(); return; }
  if (isExhausted()) { toast(t('toast.exhausted')); return; }
  openModal(t('map.title'), `
    <div id="map-wrap" class="paper"></div>
    <div id="map-info" class="rate-line" style="margin-top:8px">${t('map.pick')}</div>`);
  const wrap = $('map-wrap');
  // #85 2차(디렉터 반려 → 7DTD/구판 비오메 레퍼런스): 손그림 종이는 지리가 없어 '내 위치'가 성립 안 한다.
  //   비오메 타일 지형(바다/해안·도심 회백·외곽 갈색·숲 초록·설산·봉쇄구역 해치)을 캔버스로 그려
  //   마커 좌표와 지형이 서로를 낳게 한다 — 지형이 먼저, 마커는 그 위에.
  wrap.style.backgroundImage = `url(${mapBiomeDataUrl()})`;
  wrap.style.backgroundSize = '100% 100%';
  // 손그림 종이 지도 위에 4개 파밍 지역 마커를 지구 클러스터 위치에 % 절대 배치 (#47).
  // 좌표는 map_paper.png 위 집/빌딩/공장/판자촌 그림에 맞춰 하네스 스크린샷으로 조정.
  for (const [rid, r] of Object.entries(REGIONS)) {
    const p = MAP_MARKERS[rid];
    if (!p) continue;
    if (!regionUnlocked(rid)) continue; // 1.1: 항구 구역은 항구 셸터 해금 후에만 노출
    const el = document.createElement('div');
    el.className = 'map-pin region';
    // #85 수용 규칙(#87 임시 가드의 정식화): 렌더에서 안전영역 자동 클램프 — 신규 지역 좌표 실수를 원천 차단
    el.style.left = Math.min(MAP_SAFE.x1, Math.max(MAP_SAFE.x0, p.x)) + '%';
    el.style.top = Math.min(MAP_SAFE.y1, Math.max(MAP_SAFE.y0, p.y)) + '%';
    el.title = LName(r);
    const blocked = blizzardBlocks(rid); // 1.2: 폭설 봉쇄된 지상 지역 (개통 구간은 예외)
    if (blocked) el.classList.add('blocked');
    // #85 그려지는 발견: 안 가본 곳은 연필 스케치(수치 없음 — 소문), 다녀오면 잉크(성공률+발자취 점).
    const visits = (state.regionVisits || {})[rid] || 0;
    const rate = Math.round(rateParts(rid).eff * 100);
    const cls = rate >= 50 ? 'ok' : 'lack';
    const dots = visits > 0 ? `<span class="pin-visits" title="${t('map.visits', { n: visits })}">${'•'.repeat(Math.min(visits, 4))}</span>` : '';
    if (!visits && !blocked) el.classList.add('sketch');
    el.innerHTML = blocked
      ? `${regionIcon(rid, 'px-lg')}<span class="pin-rate lack">❄️</span>`
      : !visits
        ? `${regionIcon(rid, 'px-lg')}<span class="pin-rate sketch-q">?</span>`
        : `${regionIcon(rid, 'px-lg')}<span class="pin-rate ${cls}">${rate}%</span>${dots}`;
    // 첫 귀환 후 처음 여는 지도: 잉크가 배어드는 연출 1회
    state.mapInked = state.mapInked || {};
    if (visits > 0 && !state.mapInked[rid]) { el.classList.add('inked-now'); state.mapInked[rid] = 1; scheduleSave(); }
    el.addEventListener('click', () => { closeModal(); startExpedition(rid); }); // 준비 모달 경로 그대로 (봉쇄/에너지/탈진/횟수 검사 포함)
    // 호버/선택 시 하단 정보 줄에 위험·소요·날씨 표기
    el.addEventListener('mouseenter', () => showMapInfo(rid));
    wrap.appendChild(el);
  }
  // #85 내 거처 마커 — 지금 사는 곳이 지도 어디인지 (비클릭 정보 표식, 지역 핀보다 아래 레이어)
  {
    const hp = MAP_HOME[districtOf(state.current)];
    if (hp) {
      const el = document.createElement('div');
      el.className = 'map-pin home';
      el.style.left = Math.min(MAP_SAFE.x1, Math.max(MAP_SAFE.x0, hp.x)) + '%';
      el.style.top = Math.min(MAP_SAFE.y1, Math.max(MAP_SAFE.y0, hp.y)) + '%';
      el.innerHTML = `<span class="home-glyph">🏠</span><span class="home-label">${t('map.home')}</span>`;
      el.title = LName(SHELTERS[state.current]);
      wrap.appendChild(el);
    }
  }
  // 1.4 송출 오버레이 — 종이 지도 위 생존자 불빛(수집률 비례 점등). ARC-03 레이어 규격: 마커 위에 얹는 절대배치.
  renderSurvivorLights(wrap);
}
// 1.4 생존자 불빛 오버레이 — 켜진 불빛 수만큼 지도 위 결정론적 위치(seed)에 작은 빛점을 찍는다.
//   불빛은 만남이 아니다 — 응답하는 먼 창문들(타인은 흐른다). 위치는 seed 고정 → 왕복 저장 재현.
//   마커/지역과 겹치지 않도록 지도 여백대 위주 분포. 지도가 없거나(모달 미개방) 불빛 0이면 아무것도 안 함.
function renderSurvivorLights(wrap) {
  if (!wrap) return;
  wrap.querySelectorAll('.map-light').forEach(el => el.remove()); // 재구성 시 중복 방지
  const n = state.survivorLights || 0;
  if (n <= 0) return;
  const rand = seededRand(19410806); // 고정 seed → 불빛 위치 재현(왕복 저장 무손실)
  // 후보 위치 풀(%): 지역 마커를 피한 창문/불빛다운 자리. n개까지 앞에서부터 켠다.
  const spots = [];
  for (let i = 0; i < MAP_LIGHT_MAX; i++) {
    spots.push({ x: 8 + rand() * 84, y: 12 + rand() * 74 });
  }
  for (let i = 0; i < Math.min(n, spots.length); i++) {
    const s = spots[i];
    const dot = document.createElement('div');
    dot.className = 'map-light';
    dot.style.left = s.x + '%'; dot.style.top = s.y + '%';
    dot.title = t('map.survivorLight');
    wrap.appendChild(dot);
  }
}
// 종이 지도 마커 좌표(% left/top) — 그림 상의 지구 클러스터 위치. residential 좌상 · commercial 우상 · industrial 좌하 · slum 우하.
// #85 수용 규칙(#87 임시 클램프의 정식화): 마커 중심 안전영역 — 배지·아이콘이 종이 밖으로 잘리지 않는
//   실측 한계. 신규 지역 좌표는 자유로 적되 openMapModal 렌더가 이 박스로 자동 클램프한다.
const MAP_SAFE = { x0: 8, x1: 88, y0: 12, y1: 80 };
const MAP_MARKERS = {
  residential: { x: 20, y: 20 },  // 좌상 손그림 집 클러스터
  commercial:  { x: 74, y: 18 },  // 우상 무너진 빌딩(도심)
  industrial:  { x: 18, y: 56 },  // 좌하 공장
  slum:        { x: 78, y: 57 },  // 우하 판자촌
  // #85 도시 전도: 확장 5종을 지리 서사대로 — 항구 벨트(남쪽 해안 하단), 리조트(북동 산정),
  //   금지 구역(동남 봉쇄선 너머 — 슬럼 아래로 격리감). 남동 밀집을 풀어 마커 간 간격 확보.
  harborYard:  { x: 38, y: 79 },  // 하단 좌중 야적장(컨테이너 부두)
  fishMarket:  { x: 56, y: 81 },  // 하단 중앙 수산시장(선착장)
  resort:      { x: 85, y: 13 },  // 우상단 산정 리조트
  checkpoint:  { x: 77, y: 71 },  // 우하단 봉쇄선 검문소
  lab:         { x: 87, y: 80 },  // 검문소 안쪽 폭심지 연구동 (봉쇄선 너머 구석)
};
// #85 내 거처 마커: 구역(district)별 지도 위치 — 지역 마커의 옆자리(비클릭, 현재 집 표시).
const MAP_HOME = {
  outskirts: { x: 12, y: 31 }, city: { x: 62, y: 29 }, meadow: { x: 34, y: 40 }, forest: { x: 30, y: 67 },
  coast: { x: 17, y: 77 }, harbor: { x: 49, y: 74 }, highland: { x: 80, y: 26 }, research: { x: 68, y: 77 }, // highland: 상업지구 핀(74,18)과 3% 겹치던 것 재배치(프로브 검거) / harbor: 부두 벨트(비오메) 안으로
};
/* ── #85 2차: 비오메 타일 지형 (디렉터 레퍼런스: 구판 비오메 지도 + 7DTD) ──
   손그림 종이는 지리가 없어 '내 위치'가 성립하지 않았다(반려). 지형 규칙을 마커 좌표와 정합시켜
   캔버스로 그린다 — 바다·부두 벨트(남), 설산(북동), 봉쇄구역 해치(남동), 도심 회백(북), 초원/숲(중동부),
   황무지 갈색(남서·서변). 디더 체커(구판 무드) + 도로망 + 강. 결정론(seed) — 항상 같은 도시. */
let _mapBiomeUrl = null;
function mapBiomeDataUrl() {
  if (_mapBiomeUrl) return _mapBiomeUrl;
  const W = 512, H = 384, CELL = 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g2 = cv.getContext('2d');
  const rand = seededRand(4207);
  // 비오메 판정 (% 좌표, 순서 = 우선순위) → [기본색, 디더색]
  const biomeAt = (x, y) => {
    if (y > 86) return ['#26364a', '#1e2c3e'];                       // 바다
    if (x > 64 && y > 60) return ['#33302f', '#2a2726'];             // 봉쇄구역(잿빛 폐허)
    if (y > 70 && x <= 64) return ['#4a4438', '#403a30'];            // 부두·해안 벨트
    if (x >= 78 && y <= 34) return ['#8d9298', '#7d838c'];           // 설산(북동)
    if (x >= 26 && x <= 50 && y >= 32 && y <= 52) return ['#4c5a3a', '#425034']; // 초원
    if (x >= 22 && x <= 46 && y > 52 && y <= 70) return ['#3a4a34', '#32402e'];  // 숲
    if (x >= 62 && x <= 84 && y >= 44 && y <= 60) return ['#453b33', '#3b332c']; // 슬럼(녹슨 갈회)
    if (x < 14 || (y > 44 && y <= 70)) return ['#4e4234', '#443a2e'];            // 황무지(서변·남서)
    return ['#41454c', '#383c44'];                                   // 도심 회백(기본)
  };
  for (let cy = 0; cy < H / CELL; cy++) {
    for (let cx = 0; cx < W / CELL; cx++) {
      const px = (cx * CELL + CELL / 2) / W * 100, py = (cy * CELL + CELL / 2) / H * 100;
      const [a, b] = biomeAt(px, py);
      g2.fillStyle = (cx + cy) % 2 ? b : a;
      if (rand() < 0.06) g2.fillStyle = '#22201d';                   // 잔해 점묘
      g2.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }
  const X = p => p / 100 * W, Y = p => p / 100 * H;
  // 강: 북에서 바다로 (도심과 슬럼 사이)
  g2.strokeStyle = '#31465c'; g2.lineWidth = 5; g2.beginPath();
  g2.moveTo(X(54), 0);
  for (let t = 0; t <= 1.001; t += 0.1) g2.lineTo(X(54 + Math.sin(t * 7) * 3.5), Y(t * 88));
  g2.stroke();
  // 도로망: 지역 허브를 잇는 아스팔트 — 지형이 마커를 '설명'하는 핵심
  g2.strokeStyle = '#2c2a26'; g2.lineWidth = 3;
  const road = pts => { g2.beginPath(); g2.moveTo(X(pts[0][0]), Y(pts[0][1])); for (const [px2, py2] of pts.slice(1)) g2.lineTo(X(px2), Y(py2)); g2.stroke(); };
  road([[20, 20], [44, 19], [74, 18]]);            // 북부 간선 (주거↔상업)
  road([[20, 20], [18, 40], [18, 56]]);            // 서부 지선 (주거↔공업)
  road([[74, 18], [73, 38], [72, 55]]);            // 동부 지선 (상업↔슬럼)
  road([[18, 56], [28, 70], [38, 79]]);            // 항만로 (공업↔야적장)
  road([[38, 79], [56, 81]]);                      // 부두 연결로
  road([[72, 55], [77, 71]]);                      // 봉쇄선 진입로 (슬럼↔검문소)
  // 설산 등산로 (점선) + 봉우리
  g2.setLineDash([5, 5]); g2.strokeStyle = '#6a707a'; g2.lineWidth = 2;
  road([[74, 18], [85, 13]]);
  g2.setLineDash([]);
  g2.fillStyle = '#e8ecf2';
  for (let i = 0; i < 7; i++) {
    const mx = X(80 + rand() * 16), my = Y(4 + rand() * 22);
    g2.beginPath(); g2.moveTo(mx - 5, my + 4); g2.lineTo(mx, my - 5); g2.lineTo(mx + 5, my + 4); g2.fill();
  }
  // 봉쇄선: 금지구역 경계 붉은 점선 + 해치
  g2.strokeStyle = '#7a3a30'; g2.lineWidth = 3; g2.setLineDash([8, 6]);
  g2.beginPath(); g2.moveTo(X(64), Y(60)); g2.lineTo(X(100), Y(60)); g2.moveTo(X(64), Y(60)); g2.lineTo(X(64), Y(87)); g2.stroke();
  g2.setLineDash([]); g2.strokeStyle = 'rgba(122, 58, 48, 0.28)'; g2.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const sx = X(64 + i * 2.6); g2.beginPath(); g2.moveTo(sx, Y(60)); g2.lineTo(sx - 14, Y(87)); g2.stroke(); }
  // 해안 포말 + 파도 대시
  g2.fillStyle = '#5a6a7c';
  for (let cx = 0; cx < W / CELL; cx++) { if (rand() < 0.5) g2.fillRect(cx * CELL, Y(86), CELL, 2); }
  g2.strokeStyle = '#3c5068'; g2.lineWidth = 1;
  for (let i = 0; i < 20; i++) { const wx = rand() * W, wy = Y(88 + rand() * 10); g2.beginPath(); g2.moveTo(wx, wy); g2.lineTo(wx + 10, wy); g2.stroke(); }
  // 숲/초원 질감 점 + 외곽 나뭇점
  for (let i = 0; i < 90; i++) {
    const px2 = 22 + rand() * 28, py2 = 32 + rand() * 38;
    const [bA] = biomeAt(px2, py2);
    if (bA === '#4c5a3a' || bA === '#3a4a34') { g2.fillStyle = '#2c3a28'; g2.fillRect(X(px2), Y(py2), 3, 3); }
  }
  _mapBiomeUrl = cv.toDataURL();
  return _mapBiomeUrl;
}
// 항구 지역 해금 게이트: 항구 셸터(예인선)를 해금한 뒤부터 지도에 항구 구역이 뜬다.
// 기존 4지역은 항상 해금(true). ARC-03 마커 문법 그대로, 노출 조건만 얹는다.
function regionUnlocked(rid) {
  if (rid === 'harborYard' || rid === 'fishMarket') return state.successes >= SHELTERS.tugboat.unlockAt;
  if (rid === 'resort') return state.successes >= SHELTERS.lodge.unlockAt; // 1.3: 리조트 폐허는 스키 로지 해금 후에만 노출
  // 1.4: 금지 구역(검문소·연구동)은 후반선 도달 시 지도에 노출. 진입 자체는 방호복 게이트(startExpedition)가 따로 막는다.
  if (rid === 'checkpoint' || rid === 'lab') return state.successes >= BAL.forbidden.unlockAt;
  return true;
}
// 항만 야적장 "오늘 바다가 준 것": 날짜로 결정론적으로 부스트 전리품 1종 선택(복권 파밍, 매일 리롤).
// 결정론(day 기반) → 왕복 저장/시뮬 재현성 유지. 후보는 BAL.harbor.yardBoostPool.
function harborYardBoostId(day) {
  const pool = BAL.harbor.yardBoostPool;
  return pool[(day * 2654435761 >>> 0) % pool.length];
}
function showMapInfo(rid) {
  const r = REGIONS[rid];
  const visits = (state.regionVisits || {})[rid] || 0;
  // #85 그려지는 발견: 안 가본 곳은 소문뿐 — 수치(성공률·위험)를 감춰 "가 봐야 아는" 지도로
  if (!visits) {
    $('map-info').innerHTML = `${regionIcon(rid)} <b>${LName(r)}</b> — ${t('map.sketchInfo')}`;
    return;
  }
  const p = rateParts(rid);
  const dur = fmtGameDur(expDuration(r) * GAME_MIN_PER_SEC);
  const fc = hasForecast() ? t('forecast.prefix', { text: forecastText() }) : '';
  $('map-info').innerHTML = `
    ${t('map.regionLine', { emoji: regionIcon(rid), pct: Math.round(p.eff * 100), name: LName(r), desc: LDesc(r) })}<br>
    ${t('map.riskLine', { risk: LRisk(r), dur, mult: regionDistMult(rid).toFixed(2), wicon: wxIcon(weather.type), wname: LName(WEATHERS[weather.type]), forecast: fc })}
    · ${t('map.visits', { n: visits })}`;
}

// 탐험 소요 시간(초): 거리 + 염좌 +30% + 이동형 거점(버스) -25%
function expDuration(r) {
  let t = r.time * regionDistMult(r.id);
  if (state.injury?.type === 'sprain') t *= 1.3;
  t *= SHELTERS[state.current].perk?.timeMult || 1;
  // 1.1 방파제 오두막 완공: 항구 지역 파밍 시간 -25% (전초기지)
  if (state.breakwaterHut && (r.id === 'harborYard' || r.id === 'fishMarket')) t *= 0.75;
  // 1.2 지하 노선 개통: 연결 지역은 탐험 시간 -50% (어둠 속 지름길). 셸터 무관 — 노선이 열려 있으면 적용.
  if (subwayReaches(r.id)) t *= BAL.subway.openTimeMult;
  // 1.3 케이블카: 리조트(고원) 접근 시간. 복구 전에는 등반으로 오래 걸리고(×1.4), 완공 후 곤돌라로 단축(×0.7).
  //   전/후 실측용으로 두 배수를 명시적으로 나눈다(게이트: 완공 전후 접근 시간 유의미 차이).
  if (r.id === 'resort') t *= state.cablecarDone ? BAL.highland.cablecarTimeDone : BAL.highland.cablecarTimeRaw;
  // 1.3 눈사태 우회로 선택: 이번 출발이 우회로면 시간 증가(위험 감수 대신 안전 경로 아님 — GD: 시간 vs 위험).
  if (state._avalancheDetour && r.id === 'resort') t *= BAL.highland.avalancheDetourTimeMult;
  // 1.4 벙커 지하 통로 경로: 벙커 거주 + 통로 정리 완공 시, 연구동(lab)까지 지하망 지름길(2번째 접근 경로).
  if (r.id === 'lab' && bunkerUndercroftRoute()) t *= BAL.forbidden.undercroftLabTimeMult;
  return Math.round(t);
}
// 1.4 벙커 지하 통로가 금지 구역 연구동으로 이어진 상태인가 (clearPassage 복선 회수).
//   벙커 거주 + 통로 정리 프로젝트 완공 = "저편의 희미한 빛"이 연구동 지하 진입로였음이 밝혀진다.
function bunkerUndercroftRoute() {
  return state.current === 'bunker' && projectDone('clearPassage');
}
// 게임 시간 포매터 — 게임 '분'을 받아 "N분 / N시간 / N시간 N분"으로 표기 (5분 단위 반올림).
// 실초→게임분은 ×GAME_MIN_PER_SEC(1.5). 메커니즘은 건드리지 않고 라벨만 게임 시간으로 통일.
function fmtGameDur(min) {
  let m = Math.round(min / 5) * 5;
  if (m < 60) return t('dur.min', { n: m });
  const h = Math.floor(m / 60), mm = m % 60;
  return mm === 0 ? t('dur.h', { h }) : t('dur.hm', { h, m: mm });
}
// 가을 비축 경고: 겨울 시작 N일 전이면 권장 연료·보존식과 현 보유를 대조한 조언 객체 반환 (아니면 null)
function winterPrepAdvice(day = state.day) {
  const S = BAL.seasons;
  const idx = seasonIndex(day);
  // 다음 겨울 시작일 = 다음 겨울 계절의 첫날. 계절 순서 spring(0)summer(1)autumn(2)winter(3)
  const cyclePos = idx % 4;                       // 0봄1여름2가을3겨울
  if (cyclePos !== 2) return null;                // 가을에만 (겨울 직전)
  const winterStart = (idx + 1) * SEASON_DAYS + 1; // 다음 계절(겨울) 첫날
  const daysLeft = winterStart - day;
  if (daysLeft > S.prepWarnDaysBefore || daysLeft <= 0) return null;
  const winterDays = SEASON_DAYS;
  const fuelNeed = Math.ceil(winterDays * S.prepFuelPerDay * S.prepBufferMult);
  const cannedNeed = Math.ceil(winterDays * S.prepCannedPerDay * S.prepBufferMult);
  const fuelHave = state.res.fuel || 0;
  const cannedHave = (state.res.canned || 0) + (state.res.food || 0);
  return {
    daysLeft, fuelNeed, cannedNeed, fuelHave, cannedHave,
    fuelOk: fuelHave >= fuelNeed, cannedOk: cannedHave >= cannedNeed,
  };
}
// 날씨 예보 (라디오 배치 또는 등대 특성)
function hasForecast() {
  return (state.upkeepOk && !!SHELTERS[state.current].perk?.forecast) || items.some(i => i.defId === 'radio');
}
function forecastText() {
  const nextDayStart = (Math.floor(state.gameMin / 1440) + 1) * 1440;
  return state.weatherUntil > nextDayStart
    ? t('forecast.tomorrowSame', { icon: wxIcon(state.weatherType), name: LName(WEATHERS[state.weatherType]) })
    : t('forecast.tomorrowChange');
}
// 탐험은 준비 단계를 거친다 (기획서 v0.2: 지역 → 날씨/위험 확인 → 준비물 → 출발)
function startExpedition(regionId) {
  if (DEMO_ED && state.demoEnded) { toast(t('demo.end.locked')); return; } // #74: 종료된 데모 세이브는 진행 금지
  if (paused) { toast(t('pause.blocked')); return; }
  if (isWallpaper()) { toast(t('wallpaper.noAction')); return; } // 🖼️ 배경화면: 탐험 off
  if (state.exp) return;
  if (isExhausted()) { toast(t('toast.exhausted')); return; }
  if (state.energy < BAL.exp.minEnergy) { toast(t('toast.tooTired')); return; }
  if (state.expToday >= EXP_PER_DAY) { toast(t('toast.expLimit', { n: EXP_PER_DAY })); return; }
  if (blizzardBlocks(regionId)) { toast(t('subway.blizzardBlocked')); return; } // 1.2 폭설 봉쇄 (개통 구간은 예외)
  // 1.4 금지 구역 진입 게이트 — 방호복 미제작/내구 소진 시 차단. "방호복 없이는 한 걸음도"의 실측 지점.
  if (isForbiddenRegion(regionId) && !hazmatUsable()) {
    toast(t(state.hazmat ? 'hazmat.wornOut' : 'hazmat.blocked'));
    return;
  }
  if (avalancheBlocks(regionId)) { toast(t('avalanche.blockedToast', { n: state.avalancheBlockUntil - state.day + 1 })); return; } // 1.3 눈사태 봉쇄
  // 1.3 눈사태 예보 당일 리조트 탐험: 우회(안전·이번 예보 해소) vs 위험 감수(성공률↓·보상 1.5배·부상 위험) 선택
  if (avalancheForecastToday(regionId)) { openAvalancheChoice(regionId); return; }
  openPrepModal(regionId);
}
// 1.3 눈사태 예보 당일 선택 모달 — 예보(우르릉) → 선택이 있다(원칙 준수). 사망 없음(cozy 캐논).
function openAvalancheChoice(regionId) {
  openModal(t('avalanche.title'), `
    <div style="line-height:1.9;margin-bottom:10px">${t('avalanche.body')}</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="pixel-btn primary" id="av-detour">${t('avalanche.detour')}</button>
      <button class="pixel-btn" id="av-turnback">${t('avalanche.turnback')}</button>
    </div>`);
  $('av-detour').addEventListener('click', () => {
    state._avalancheDetour = true;       // 이번 출발에 우회 플래그 (expDuration·resolveExpedition이 읽고 소진)
    state.avalancheForecast = 0;         // 예보 해소 (직접 대응했다)
    closeModal(); openPrepModal(regionId);
  });
  $('av-turnback').addEventListener('click', () => {
    // 돌아섬 → 리조트가 avalancheDur일 봉쇄된다 (능동적으로 위험을 피한 대가: 접근 상실)
    state.avalancheForecast = 0;
    state.avalancheBlockUntil = state.day + BAL.highland.avalancheDur - 1;
    toast(t('avalanche.turnedback'));
    closeModal();
  });
}
/* 1.2 폭설 봉쇄(최소 구현) — 겨울 '눈' 날씨엔 지상 지역 탐험 봉쇄. 개통된 지하 노선 구간은 예외(지하 우회).
   지하철 셸터 자체는 날씨가 닿지 않지만(weatherPool clear), 봉쇄는 '목적지 지상'이 눈에 파묻히는 것이라
   현재 어느 셸터에 있든 겨울+눈이면 판정한다. 항구 지역(harborYard/fishMarket)은 물가라 폭설 봉쇄 대상 아님. */
const BLIZZARD_EXEMPT_REGIONS = ['harborYard', 'fishMarket']; // 지상 폭설 봉쇄에서 제외되는 지역(항구)
function blizzardBlocks(regionId) {
  if (!BAL.subway.blizzardBlocksExpedition) return false;
  if (seasonOf().id !== 'winter' || weather.type !== 'snow') return false;
  if (BLIZZARD_EXEMPT_REGIONS.includes(regionId)) return false;
  if (subwayReaches(regionId)) return false; // 개통 구간: 지하로 돌아가므로 봉쇄 무시
  return true;
}
// 1.3 눈사태 봉쇄: 자연 봉쇄(예보 방치)로 리조트가 닫혀 있는가. 예보 당일은 봉쇄가 아니라 '선택'(우회/감수)이다.
function avalancheBlocks(regionId) {
  if (regionId !== 'resort') return false;
  return state.avalancheBlockUntil > 0 && state.day <= state.avalancheBlockUntil;
}
// 1.3 눈사태 예보 '당일'인가 — 리조트 탐험 시 우회/감수 선택지를 띄우는 게이트.
function avalancheForecastToday(regionId) {
  return regionId === 'resort' && state.avalancheForecast > 0 && state.day >= state.avalancheForecast;
}
function openPrepModal(regionId) {
  const r = REGIONS[regionId];
  const selected = new Set();
  const render = () => {
    const p = rateParts(regionId, [...selected]);
    const lines = [];
    lines.push(t('prep.base', { pct: Math.round(p.base * 100) }));
    if (p.shelter) lines.push(`<span style="color:var(--good)">${t('prep.shelter', { pct: Math.round(p.shelter * 100) })}</span>`);
    if (p.district) lines.push(`<span style="color:var(--good)">${t('prep.district', { pct: Math.round(p.district * 100) })}</span>`);
    if (p.comfort) lines.push(`<span style="color:var(--good)">${t('prep.comfort', { pct: Math.round(p.comfort * 100) })}</span>`);
    if (p.gear) lines.push(`<span style="color:var(--good)">${t('prep.gear', { pct: Math.round(p.gear * 100) })}</span>`);
    if (p.buff) lines.push(`<span style="color:${p.buff > 0 ? 'var(--good)' : 'var(--bad)'}">${t('prep.buff', { label: buffLabel(state.buff) || t('prep.event'), sign: p.buff > 0 ? '+' : '', pct: Math.round(p.buff * 100) })}</span>`);
    if (p.weatherPen) lines.push(`<span style="color:var(--bad)">${t('prep.weatherPen', { pct: Math.round(p.weatherPen * 100) })}</span>`);
    if (p.injuryPen) lines.push(`<span style="color:var(--bad)">${t('prep.injuryPen', { pct: Math.round(p.injuryPen * 100) })}</span>`);
    if (p.hungryPen) lines.push(`<span style="color:var(--bad)">${t('prep.hungryPen', { pct: Math.round(p.hungryPen * 100) })}</span>`);
    const cost = {};
    for (const id of selected) for (const [rid, n] of Object.entries(PREPS[id].cost)) cost[rid] = (cost[rid] || 0) + n;
    const dur = fmtGameDur(expDuration(r) * GAME_MIN_PER_SEC); // 실초→게임 시간 표기
    const fc = hasForecast() ? t('forecast.prefix', { text: forecastText() }) : '';
    $('modal-body').innerHTML = `
      <div class="rate-line">
        ${t('prep.rateLine', { emoji: r.emoji, pct: Math.round(p.eff * 100), lines: lines.join(' · ') })}<br>
        ${t('prep.riskLine', { risk: LRisk(r), dur, sprain: state.injury?.type === 'sprain' ? t('prep.sprainTag') : '', mobile: SHELTERS[state.current].perk?.timeMult ? t('prep.mobileTag') : '', wicon: WEATHERS[weather.type].icon, wname: LName(WEATHERS[weather.type]), forecast: fc })}
      </div>
      <div id="prep-list">${Object.entries(PREPS).map(([id, pr]) => {
        const has = resHasAll(pr.cost);
        return `<div class="prep-row ${selected.has(id) ? 'sel' : ''} ${has ? '' : 'no'}" data-prep="${id}">
          <span>${pr.emoji} ${LName(pr)}</span>
          <span class="p-eff">${LEff(pr)}</span>
          <span class="p-cost">${costLabel(pr.cost)}</span>
        </div>`;
      }).join('')}</div>
      <div style="font-size:11px;color:var(--text-dim);margin:8px 0">
        ${t('prep.expectCost', { cost: Object.keys(cost).length ? costLabel(cost) : t('none') })}
      </div>
      <button class="pixel-btn primary" id="btn-depart" style="width:100%">${t('prep.depart', { dur })}</button>`;
    $('modal-body').querySelectorAll('.prep-row').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.prep;
        if (selected.has(id)) selected.delete(id);
        else if (resHasAll(PREPS[id].cost)) selected.add(id);
        else { toast(t('prep.needFor', { name: LName(PREPS[id]) })); return; }
        render();
      });
    });
    $('btn-depart').addEventListener('click', () => departExpedition(regionId, [...selected]));
  };
  openModal(t('prep.title', { emoji: r.emoji, name: LName(r) }), '');
  render();
}
async function departExpedition(regionId, prep, opts2 = {}) {
  if (paused) { toast(t('pause.blocked')); return; }
  if (state.exp) return;
  // 준비 모달을 열어둔 사이 상태가 나빠졌을 수도 있다 — 출발 직전 재검사
  if (isExhausted()) { toast(t('toast.exhausted')); closeModal(); return; }
  if (state.energy < 20) { toast(t('toast.tooTired')); closeModal(); return; }
  if (state.expToday >= EXP_PER_DAY) { toast(t('toast.expLimit', { n: EXP_PER_DAY })); closeModal(); return; }
  const r = REGIONS[regionId];
  const p = rateParts(regionId, prep);
  // 저성공률 출발 확인 — 수동 클릭 경로에서만 (자동진행/blackout에선 확인창 금지: 게임이 멈춘다)
  if (!opts2.auto && p.eff < 0.5 && !(await gameConfirm(t('exp.confirmRisky', { p: Math.round(p.eff * 100) }), t('confirm.depart'), t('confirm.no')))) return;
  for (const id of prep) resConsumeAll(PREPS[id].cost);
  const dur = expDuration(r) * 1000;
  // 탐험도 몸을 쓴다 (소모 절반으로 완화) + 에너지 소모
  const expMul = isHard() ? 1.5 : 1; // 하드: 탐험 게이지 소모 +50%
  state.hunger = Math.max(0, state.hunger - 4 * expMul);
  state.thirst = Math.max(0, state.thirst - (prep.includes('bottle') ? 3 : 5) * expMul);
  state.energy = Math.max(0, state.energy - 20);
  if (state.energy < 20) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  // 성공률 버프/디버프는 이번 출발에 반영되어 소진 (물자 좌표 버프는 정산 시)
  if (state.buff?.exp) state.buff = null;
  // #94(디렉터): 출발 시각 기록 — 귀환 정산이 '대기 중 이미 흐른 게임 시간'을 차감해 이중 계산을 없앤다.
  state.exp = { region: regionId, end: Date.now() + dur, dur, rate: p.eff, prep, startGameMin: state.gameMin };
  closeModal();
  scheduleSave();
  renderExpPanel();
  renderResBar();
  $('exp-panel').classList.add('show'); // 진행 상황 표시
  toast(t('exp.start', { emoji: r.emoji, name: LName(r), pct: Math.round(p.eff * 100) }));
  questProgress('depart');
  playSfx('door');
  setTimeout(() => playSfx(seasonOf().id === 'winter' ? 'steps_snow' : 'steps_hard'), 400);
}
// 성공률 체감 보정: 표기(rate)는 그대로 두고 실제 판정 확률만 몰래 올린다.
// 표기 73%에서 3연속 실패=2%지만 체감은 "사기" — 플레이어 신뢰 보호용 숨은 보정.
// 노말 +4%p 상시 + pity(연속 실패당 +8%p, 캡3). 하드는 상시 보정 없이 pity만. 상한 0.95.
function expActualRate(rate, streak) {
  return Math.min(BAL.pity.ceiling, rate + (isHard() ? 0 : BAL.pity.normalBonus) + BAL.pity.perStreak * Math.min(BAL.pity.streakCap, streak || 0));
}
function resolveExpedition() {
  const exp = state.exp;
  if (!exp) return;
  playSfx('door');
  const r = REGIONS[exp.region];
  // #85 그려지는 발견: 다녀온 지역은 지도에 잉크로 남는다 (성패 무관 — 밟아 본 땅)
  // 시뮬 순수성 가드(recordNormalDay 선례): v1.6 사이클에서 이 카운터 유무가 시드 고정 시뮬의
  //   자원 궤적을 미세 변화시키는 히든 커플링 실측(생존 지표는 diff-0, 경로 미규명 — 백로그 조사).
  //   시뮬엔 지도 연출이 무의미하므로 제외 — 기준선 재현성 보존.
  if (!_simRunning) {
    state.regionVisits = state.regionVisits || {};
    state.regionVisits[exp.region] = (state.regionVisits[exp.region] || 0) + 1;
  }
  const prep = exp.prep || [];
  const startedInjured = !!state.injury;        // 다친 몸으로 출발했는가 (인과문용)
  const departWeather = weather.type;            // 출발 시점 날씨
  const departColdSnap = coldSnapNetSeverity() > 0; // 한파 중 출발
  let injuryRolled = false, injuryAvoided = false; // 부상 판정 발생/회피 (장갑 인과문용)
  state.exp = null;
  state.stats.exp++;
  // 탐험을 다녀오면 하루가 그만큼 흘러 있다 (거리 비례 2~5시간)
  // #94(디렉터 신고): 대기 중에도 시계가 흐르는데 귀환 때 전액을 또 점프해 '시간이 두 번 깎이던' 이중 계산 —
  //   의도 소요에서 대기 중 경과분을 차감한 나머지만 점프한다(총 경과 = 탐험 소요). 구세이브(기록 없음)는 기존 전액.
  const expIntendedMin = 120 + expDuration(r) * 2.5;
  const expPassedMin = (exp.startGameMin != null) ? Math.max(0, state.gameMin - exp.startGameMin) : 0;
  state.gameMin += Math.max(0, expIntendedMin - expPassedMin);
  state.expToday = (state.expToday || 0) + 1;
  const rate = exp.rate ?? r.rate;                         // 표기용(화면에 보인 확률) — 변경 없음
  const actual = expActualRate(rate, state.expFailStreak); // 실제 판정 확률(숨은 보정)
  const roll = Math.random();
  const gotRes = {};   // 자원 획득
  let got = [];        // 가구 획득
  const notes = [];
  let title, body;
  // 1.4 금지 구역 탐험 — 성패와 무관하게 방호복이 노출됐다: 내구 -1. 다 닳으면 다음 진입이 차단된다(수리 필요).
  if (isForbiddenRegion(exp.region)) { wearHazmat(); if (state.hazmat) notes.push(t('hazmat.wearNote', { dur: state.hazmat.dur })); }
  // hard=true인 기본 획득에만 하드 -30%를 적용한다. 은닉처 loot×2 버프는 hard=false로 호출해
  // 온전한 2배를 보장 — 유저가 얻은 "2배" 버프의 체감 가치를 하드가 깎지 않도록.
  // 1.1 항만 야적장: 그날 부스트되는 전리품 1종(결정론적, 왕복/시뮬 재현) · 수산시장: 겨울 결빙 절반.
  const yardBoostId = r.harborYard ? harborYardBoostId(state.day) : null;
  const harborMult = (r.fishMarket && seasonOf().id === 'winter') ? BAL.harbor.marketWinterMult : 1;
  const rollRes = (mult = 1, hard = true) => {
    for (const [id, min, max, chance] of r.lootRes) {
      if (chance != null && Math.random() > chance) continue;
      let n = Math.round((min + Math.random() * (max - min)) * mult * harborMult);
      if (id === yardBoostId) n = Math.round(n * BAL.harbor.yardBoostMult); // 오늘 바다가 준 것
      if (hard) n = hardLoot(n);
      if (n > 0) { gotRes[id] = (gotRes[id] || 0) + n; resAdd(id, n); }
    }
  };
  // 가구 파밍은 극히 드물다 — 그리고 큰 가구일수록 더 드물다 (대부분은 제작으로)
  const pickFurniture = pool => {
    const ws = pool.map(id => 1 / (DEFS[id].fp.w * DEFS[id].fp.d));
    let sum = ws.reduce((a, b) => a + b, 0), roll = Math.random() * sum;
    for (let i = 0; i < pool.length; i++) { roll -= ws[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };
  const success = roll < actual;
  const partial = !success && roll < actual + (1 - actual) * BAL.pity.partialFactor;
  const detour = !!state._avalancheDetour && exp.region === 'resort'; // 1.3 눈사태 위험 우회로
  // pity streak 갱신: 성공하면 리셋, 실패(부분 포함)면 증가
  if (success) state.expFailStreak = 0;
  else state.expFailStreak = (state.expFailStreak || 0) + 1;
  if (success) {
    rollRes(1);
    // 1.3 눈사태 위험 우회로: 보상 1.5배 (추가분을 하드 감산 없이 얹는다 — 위험 감수의 대가). GD 준수.
    if (detour) { rollRes(BAL.highland.avalancheDetourLootMult - 1, false); notes.push(t('avalanche.detourLoot')); }
    if (state.buff?.loot) { // 은닉처 좌표: 자원 2배 (하드 감산 없이 온전한 +1배)
      rollRes(1, false);
      notes.push(t('exp.note.loot2'));
      state.buff = null;
    }
    if (Math.random() < r.furnChance) {
      got.push(pickFurniture(r.pool));
      notes.push(t('exp.note.furniture'));
    }
    // 절단기 특수 드랍 (#36) — 공업지대 성공 탐험 10%, 미보유 시 1회. 벙커 뒷문 프로젝트 재료.
    if (exp.region === 'industrial' && !state.hasCutter && Math.random() < 0.10) {
      state.hasCutter = true;
      notes.push(t('cutter.foundNote'));
    }
    // 세계관 메모/유서 드랍 (#35) — 성공 탐험에서만. 수집 시 결산 노트 + 닫은 뒤 쪽지 팝업 예약.
    //   1.4: 금지 구역이면 이번 탐험 목적지(exp.region)를 넘겨 기밀 문서를 우선 드랍한다.
    const drop = tryDropMemoOnExpedition(exp.region);
    if (drop) {
      const tbl = drop.will ? WILLS : MEMOS;
      notes.push(t(drop.will ? 'memo.foundWillNote' : 'memo.foundNote', { title: LN(tbl[drop.id]) }));
      state.pendingMemoPopup = { id: drop.id, will: drop.will };
    }
    // #76 지식: 폐허에서 성한 책 한 권 (탐험 성공 희귀 드랍 — 사치 가구 재료). 암시장 판매 부산물과 별개의 '지식' 손맛.
    if (Math.random() < BAL.luxury.bookDropChance) { resAdd('book', 1); notes.push(t('exp.note.book')); }
    state.successes++;
    state.stats.success++;
    title = t('exp.successTitle', { name: LName(r) });
    body = t('exp.successBody');
  } else if (partial) {
    rollRes(0.5);
    if (SHELTERS[state.current].perk?.salvagePlus && Math.random() < 0.25) {
      got.push(pickFurniture(r.pool));
      notes.push(t('exp.note.rooftopSalvage'));
    }
    title = t('exp.partialTitle', { name: LName(r) });
    body = t('exp.partialBody');
  } else {
    title = t('exp.failTitle', { name: LName(r) });
    body = t('exp.failBody');
    if (SHELTERS[state.current].perk?.failSalvage) {
      rollRes(BAL.pity.failSalvageMult);
      if (Object.keys(gotRes).length) {
        body = t('exp.failSalvageBody');
        notes.push(t('exp.note.shipSalvage'));
      }
    }
    state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 5);
    notes.push(t('exp.note.dirty5'));
  }
  // 부상 판정: 실패 시 확정, 부분 성공 시 40%
  if (!success && (partial ? Math.random() < BAL.pity.injuryPartialChance : true)) {
    injuryRolled = true; // 부상 위험이 실제로 있었다 (장갑 인과문 조건)
    let injChance = 1;
    if (prep.includes('gloves')) injChance -= BAL.pity.glovesReduce;
    if (Math.random() < injChance) {
      let type = r.injuries[Math.floor(Math.random() * r.injuries.length)];
      if (type === 'deep' && prep.includes('firstaid')) {
        type = 'minor';
        notes.push(t('exp.note.firstaid'));
      }
      notes.push(applyInjury(type, prep.includes('bottle')));
    } else if (prep.includes('gloves')) {
      injuryAvoided = true; // 부상 위험이 있었는데 장갑으로 피했다
      notes.push(t('exp.note.gloves'));
    }
  }
  // 1.3 눈사태 위험 우회로: 성공했더라도 눈길에서 미끄러질 위험(사망 없음 — 부상만). 아직 안 다쳤을 때만 롤.
  if (detour && !state.injury && Math.random() < BAL.highland.avalancheInjuryChance) {
    let type = prep.includes('firstaid') ? 'sprain' : (Math.random() < 0.5 ? 'sprain' : 'minor');
    notes.push(applyInjury(type, prep.includes('bottle')));
    notes.push(t('avalanche.detourHurt'));
  }
  if (state._avalancheDetour) state._avalancheDetour = false; // 우회 플래그 소진 (이번 출발 한정)
  // 비/눈 속 탐험 → 젖어서 청결도 감소
  if (weather.type === 'rain' || weather.type === 'snow' || weather.type === 'storm') {
    if (!prep.includes('raincoat')) {
      state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 3);
      notes.push(t('exp.note.wet3', { icon: WEATHERS[weather.type].icon }));
    }
  }
  // ── 준비물/상태 인과문 (#29) — 조건 걸린 것 중 우선순위 상위 2개만, 남발 금지 ──
  {
    const causal = []; // [priority-ordered]
    // 역경(상태) — 준비 부족이 결과를 갈랐음을 체감
    if (startedInjured) causal.push(t('exp.cause.injured'));
    if (departColdSnap) causal.push(t('exp.cause.coldsnap'));
    // 준비물이 값을 했음 (해당 시에만)
    if (prep.includes('flashlight') && success) causal.push(t('exp.cause.flashlight'));
    if (prep.includes('raincoat') && (departWeather === 'rain' || departWeather === 'snow' || departWeather === 'storm'))
      causal.push(t('exp.cause.raincoat', { icon: WEATHERS[departWeather].icon }));
    if (prep.includes('bottle')) causal.push(t('exp.cause.bottle'));
    if (prep.includes('canned') && success) causal.push(t('exp.cause.canned'));
    for (const c of causal.slice(0, 2)) notes.push(c);
  }
  for (const id of got) state.inventory[id] = (state.inventory[id] || 0) + 1;
  // 해금 체크
  let unlockMsg = '';
  for (const [id, sh] of Object.entries(SHELTERS)) {
    if (sh.unlockAt > 0 && state.successes === sh.unlockAt) {
      unlockMsg = t('exp.unlock', { emoji: sh.emoji, name: LName(sh) });
    }
  }
  const resHtml = Object.keys(gotRes).length
    ? `<div class="loot-list">${Object.entries(gotRes).map(([id, n]) => `<div class="loot-item">${resIcon(id)} ${LName(RESOURCES[id])} +${n}</div>`).join('')}</div>`
    : '';
  const lootHtml = got.length
    ? `<div class="loot-list">${got.map(id => `<div class="loot-item">${furnIcon(id)} ${LName(DEFS[id])}</div>`).join('')}</div>`
    : '';
  const prepHtml = prep.length
    ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px">${t('exp.usedPrep', { list: prep.map(p => `${PREPS[p].emoji}${LName(PREPS[p])}`).join(', ') })}</div>`
    : '';
  const noteHtml = notes.length
    ? `<div style="font-size:11px;line-height:1.7;margin-top:8px">${notes.join('<br>')}</div>`
    : '';
  openModal(title, `${body}${resHtml}${lootHtml}${noteHtml}${prepHtml}${unlockMsg}`);
  scheduleSave();
  renderInventoryBar();
  renderResBar();
  renderExpPanel();
  updateHud();
  // 하루 5회를 채우면 몸이 버티지 못한다 — 강제 취침
  // #88(디렉터): 탐험 한도 소진 시 강제 취침·정산을 없앤다 — 정산은 유저가 의도한 취침 때(전 모드 공통).
  //   대신 '탐험 피로': 오늘 자지 않고 버티면 밤샘 취침 페널티가 가중된다(restEnergyValue) — 일찍 잘 이유를 만드는 쪽.
  if (state.expToday >= EXP_PER_DAY) { state.expFatigue = state.day; toast(t('exp.fatigue')); }
}

/* ============================================================
   랜덤 인카운터 (아포칼립스의 우연들 — 며칠에 한 번)
============================================================ */
/* ============================================================
   고양이 동반자 (v1.9) — Day 100+ 인카운터로 입양
============================================================ */
// 고양이 동반자 시스템(메시·텍스처·AI·애니·스폰/디스폰)은 src/systems/cat.js로 분리(엔지니어링 Phase 2).
// 함수들이 game.js 내부 심볼을 참조하므로 팩토리 makeCatSystem(ctx)에 주입해 생성한다(events.js 선례, 동작 동일).
// 잔류: 클로즈업 카메라(catCam/enterCatCloseup/exitCatCloseup)·쓰다듬기(pickCat/petCatResponse)는
//   camera·입력 결합이라 game.js에 남긴다. cat 시스템은 catObj를 catSys.getCat()로 노출하고,
//   ROOM(셸터 로드 시 재할당)은 getRoom 게터로 라이브 참조한다(캡처 stale 방지).
const PET_HAPPY_MS = 2000; // 눈 감김 지속(2초). 렌더 연출 상수. cat.js(updateCat)와 game.js(쓰다듬기) 공유.
const catSys = makeCatSystem({
  THREE, GLTFLoader,
  B, lamb, makeCanvasTex, disposeDeep,
  footprintOf, surfaceRectOf, itemsOn, shadowDirty,
  scene, items, DEFS, state,
  CAT_POSES, CAT_PERCH_Y, PET_HAPPY_MS,
  getRoom: () => ROOM, catCam, exitCatCloseup,
});
const { spawnCat, despawnCat, updateCat, catPointBlocked, catSupportValid, catFaceTex, catFaceHappyTex } = catSys;
// F-1a 야생동물 로밍 시스템 (「세계가 살아 있다」) — cat.js 선례와 동일한 팩토리+주입.
//   순수 연출/엔티티: 이벤트·밸런스 무참조. 상시 1~2마리(저사양 1) + 개막 새 착지 연출.
const wildlifeSys = makeWildlifeSystem({
  THREE, B, lamb, disposeDeep, makeCanvasTex, BAL,
  scene, state, opts,
  getRoom: () => ROOM, districtOf, playSfx, shadowDirty,
  gameHour, seasonId: () => seasonOf().id, camCenter,
  getGameMin: () => state.gameMin || 0, getSnowCover: () => snowCover,
  WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE,
  getObstacles: () => wlObstacles, // #95: buildEnv가 등록한 마당 장애물(폐차/전신주/근접 나무) — 통과 방지
});

// #86 주인공 아바타 — "정착자는 나뿐"의 그 '나' (사람 형상 금지 캐논의 유일한 예외)
const avatarSys = makeAvatarSystem({
  THREE, B, lamb, disposeDeep, shadowDirty,
  scene, state, items, DEFS,
  getRoom: () => ROOM, getBlockers: () => blockers, footprintOf, gameHour, opts,
  OUTFITS, getOutfit: () => state.outfit || 'default', // #86④ 복장
});

// #86④ 옷장 — 보유 의류(제작으로 획득) 목록에서 탭하여 갈아입기. 진입: 툴바 👕 버튼 + 아바타 탭.
function openWardrobeModal() {
  if (paused) { toast(t('pause.blocked')); return; }
  const ownedList = state.outfits || ['default'];
  const cur = state.outfit || 'default';
  const rows = Object.keys(OUTFITS).map(id => {
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
// 아바타 탭 → 옷장 (고양이 탭 선례 — 배치 모드에선 오작동 방지 차 미동작)
function pickAvatar(e) {
  if (!avatarSys.exists()) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(avatarSys.getGroup(), true).length > 0;
}

/* ============================================================
   세계관 메모 & 라디오 방송 수집 (#35 · #12의 축)
   ------------------------------------------------------------
   [연표] 캐논 타임라인 — 모든 문안은 이 축과 모순되지 않는다.
     ㆍ붕괴 3년 전(겨울) = 현재(intro: "세상이 무너진 지 3년").
     ㆍT-6년경  판데믹 발생 → 도시 부분 봉쇄 시작.
     ㆍT-5년경  전국 봉쇄. 사재기·상점 약탈·폭동 (상업지구).
     ㆍT-4년경  공장 폐쇄 명령. 마지막 교대. 물류 정지 (공업지대).
     ㆍT-3.5년  백신 루머·가짜 배급표. 대피령. 남겨진 사람들 (슬럼가).
     ㆍT-3.2년  국가 간 최후통첩 → 핵 사용 결정.
     ㆍT-3년    핵겨울. 하늘이 잿빛으로. — 여기서 현재까지 3년.
   메모는 지역 성격(주거=일상의 붕괴 / 상업=사재기·폭동 / 공업=폐쇄 명령 /
   슬럼=버려진 사람들)에 맞춰 배치. 유서 6종은 지역 무관 별도 풀(극저확률).
   테이블 스키마: { name/nameEn(제목), desc/descEn(본문), region } — LN/LD 재사용.
============================================================ */
// MEMOS/WILLS/MEMO_REGIONS 및 파생 지역 목록(MEMOS_BY_REGION/SUBWAY/RESORT/RESEARCH)은
// src/data/lore.js로 분리(콘텐츠 데이터 Phase 1). 수집/드랍 로직은 game.js에 유지.
//   subway/resort/research 지역 풀은 lore.js에서 MEMOS를 필터해 파생(원본 유지).

/* ── 라디오 방송 12종 (REQ-RADIO-01) ──
   예보 3(계절)/행상 예고 1/과거 정부 안내 2/정체불명 음악 1/생존자 사연 2/기계 자동 방송 1/박사 일지 조각 2.
   박사 조각(doctor:true) 2종 모두 수집 시 9겨울 doctor_radio 문안에 한 줄 추가된다. */
// BROADCASTS(라디오 방송 12종)는 src/data/lore.js로 분리(콘텐츠 데이터 Phase 1).

/* ── 1.3 밤하늘 스케치 6종 (관측소 완공 후, 맑은 밤 이벤트로 수집) ──
   감상 보상. 각 스케치는 그날 본 하늘의 1인칭 기록 — "나는 오래 서서 하늘을 봤다"의 결. 지시조 금지.
   맨 끝(satellite)은 1.4 복선: "저건 별이 아니다". 기록 탭에서 종이 스케치처럼 열람. */
// SKETCHES(밤하늘 스케치)는 src/data/lore.js로 분리(콘텐츠 데이터 Phase 1).

/* ── 1.3 밤하늘 스케치 수집 (state.sketches) — 관측소 완공 후 맑은 밤 이벤트로 1종씩 수집 ── */
function sketchesCollected() { return Object.keys(state.sketches || {}).length; }
function sketchesTotal() { return Object.keys(SKETCHES).length; }
// 미수집 스케치 1개 뽑기 (satellite=1.4 복선은 마지막에 남도록, 다른 5종을 먼저 소진). 없으면 null.
function pickUncollectedSketch() {
  const owned = state.sketches || {};
  const rest = Object.keys(SKETCHES).filter(id => id !== 'satellite' && !owned[id]);
  if (rest.length) return rest[Math.floor(Math.random() * rest.length)];
  return owned['satellite'] ? null : 'satellite'; // 나머지를 다 모아야 궤도의 불빛이 나온다
}
function collectSketch(id) {
  if (!state.sketches) state.sketches = {};
  if (!SKETCHES[id] || state.sketches[id]) return false;
  state.sketches[id] = state.day;
  return true;
}
// 관측소 완공 + 맑은 밤 → 밤하늘 이벤트. 하루 1회. 미수집 스케치가 있을 때만. processDay에서 호출.
//   결산 노트에 1인칭 발견 + 닫은 뒤 스케치 팝업 예약(메모 팝업 문법 재사용). 수집률 100% 시 더는 발동 안 함.
function tryNightSky(notes) {
  if (!state.observatoryDone) return;
  if (state.nightSkyToday) return;          // 하루 1회
  if (weather.type !== 'clear') return;     // 맑은 밤만
  if (Math.random() >= BAL.highland.nightSkyChance) return;
  const id = pickUncollectedSketch();
  if (!id) return;                          // 다 모았으면 조용히 끝
  collectSketch(id);
  state.nightSkyToday = 1;
  notes.push(t('nightsky.foundNote', { title: LN(SKETCHES[id]) }));
  state.pendingSketchPopup = id;            // 결산 닫은 뒤 스케치 페이지 팝업
}

/* ── 수집 상태/드랍 로직 (state.memos / state.broadcasts / state.distantSeen) ── */
function memosCollected() { return Object.keys(state.memos || {}).length; }
function memosTotal() { return Object.keys(MEMOS).length + Object.keys(WILLS).length; }
function broadcastsCollected() { return Object.keys(state.broadcasts || {}).length; }
function broadcastsTotal() { return Object.keys(BROADCASTS).length; }
// 미수집 메모 1개 뽑기 (지역 지정 시 그 지역 풀에서, 없으면 현재 셸터 지역, 그것도 다 모았으면 전체). 없으면 null.
function pickUncollectedMemo(region) {
  const owned = state.memos || {};
  const tryPool = pool => pool.filter(id => !owned[id]);
  let region0 = region || (['residential', 'commercial', 'industrial', 'slum'].includes(districtRegionOf(state.current)) ? districtRegionOf(state.current) : null);
  if (region0) { const p = tryPool(MEMOS_BY_REGION[region0] || []); if (p.length) return p[Math.floor(Math.random() * p.length)]; }
  const all = tryPool(Object.keys(MEMOS));
  if (all.length) return all[Math.floor(Math.random() * all.length)];
  return null;
}
// 셸터가 속한 '탐험 지역 성격' 추정 — 메모 지역과 맞추기 위한 매핑. 셸터→구역→선호 region.
function districtRegionOf(shelterId) {
  const d = districtOf(shelterId);
  // 구역별 대표 메모 성격 (도심=상업/슬럼, 외곽/초원=주거, 숲=공업, 해안=슬럼)
  const map = { city: 'commercial', outskirts: 'residential', meadow: 'residential', forest: 'industrial', coast: 'slum' };
  return map[d] || 'residential';
}
function collectMemo(id, silent) {
  if (!state.memos) state.memos = {};
  if (state.memos[id]) return false;
  state.memos[id] = state.day;
  return true;
}
// 이벤트(과거 달력 등)에서 메모 1개 확정 드랍 — 호출 자체가 게이트다. 미수집 메모 id or null.
function dropMemo() {
  const id = pickUncollectedMemo();
  if (id) { collectMemo(id); return id; }
  return null;
}
// 탐험 결산에서 호출 — 확률 게이트를 여기서 관리. 수집 시 id(+will 여부) 반환.
//   expRegion: 이번 탐험의 목적지 지역(금지 구역 기밀 문서는 '어디서 탐험했나'로 우선순위가 정해진다 — 셸터 아님).
function tryDropMemoOnExpedition(expRegion) {
  // 1.4 금지 구역(연구동/검문소) 탐험 — 기밀 문서(research 메모)를 최우선 드랍. 세계관의 답이 있는 곳.
  //   유서보다 우선. 문서 희소화(디렉터 지시: 기본 2%) 후에도 금지 구역은 2.5배 밀도(실효 5%) —
  //   최종장 12종은 이제 '긴 추적'이다. 종이 한 장이 귀한 세계.
  if (isForbiddenRegion(expRegion)) {
    const unRes = MEMOS_RESEARCH.filter(id => !(state.memos || {})[id]);
    if (unRes.length && Math.random() < BAL.events.memoDropChance * 2.5) { // 금지 구역은 문서 밀도가 높다(2.5배 게이트)
      const id = unRes[Math.floor(Math.random() * unRes.length)]; collectMemo(id); return { id, will: false };
    }
  }
  // 유서 우선 롤
  if (Math.random() < BAL.events.willDropChance) {
    const un = Object.keys(WILLS).filter(id => !(state.memos || {})[id]);
    if (un.length) { const id = un[Math.floor(Math.random() * un.length)]; collectMemo(id); return { id, will: true }; }
  }
  if (Math.random() < BAL.events.memoDropChance) {
    // 1.2 지하철 셸터 거주 중이면 지하(subway) 메모를 우선 드랍(판데믹 지하 대피 서사의 본진).
    //   미수집 지하 메모가 있으면 그중 하나, 다 모았으면 기존 지역 풀로 폴백.
    if (state.current === 'subway') {
      const unSub = MEMOS_SUBWAY.filter(id => !(state.memos || {})[id]);
      if (unSub.length) { const id = unSub[Math.floor(Math.random() * unSub.length)]; collectMemo(id); return { id, will: false }; }
    }
    // 1.3 스키 로지 거주 중이면 리조트(resort) 메모 우선 드랍(마지막 휴가객들). 다 모았으면 지역 풀 폴백.
    if (state.current === 'lodge') {
      const unRst = MEMOS_RESORT.filter(id => !(state.memos || {})[id]);
      if (unRst.length) { const id = unRst[Math.floor(Math.random() * unRst.length)]; collectMemo(id); return { id, will: false }; }
    }
    // v1.5 여객선(ship) 거주 중이면 좌초선(harbor) 메모 우선 드랍(갑판 판잣집의 내력 — 잠긴 선실의 사유). 지하/로지 문법 재사용.
    if (state.current === 'ship') {
      const unShp = MEMOS_HARBOR.filter(id => !(state.memos || {})[id]);
      if (unShp.length) { const id = unShp[Math.floor(Math.random() * unShp.length)]; collectMemo(id); return { id, will: false }; }
    }
    const id = pickUncollectedMemo(districtRegionOf(state.current));
    if (id) { collectMemo(id); return { id, will: false }; }
  }
  return null;
}
// 미수집 방송 1개 청취/수집. 수집 시 id 반환, 없으면 null. (doctor 조각 2종 수집되면 무전 분기)
function dropBroadcast() {
  if (!state.broadcasts) state.broadcasts = {};
  const un = Object.keys(BROADCASTS).filter(id => !state.broadcasts[id]);
  if (!un.length) return null;
  const id = un[Math.floor(Math.random() * un.length)];
  state.broadcasts[id] = state.day;
  return id;
}
// 박사 조각 2종 모두 수집됐는가 (9겨울 무전 문안 분기)
function doctorFragmentsComplete() {
  const b = state.broadcasts || {};
  return Object.keys(BROADCASTS).filter(id => BROADCASTS[id].doctor).every(id => b[id]);
}
// 먼 불빛 목격 기록 (장소별 문안 변형용 카운트 + 마지막 목격일)
function recordDistantLight() {
  if (!state.distantLight) state.distantLight = { count: 0, lastDay: 0, places: {} };
  state.distantLight.count++;
  state.distantLight.lastDay = state.day;
  state.distantLight.places[state.current] = (state.distantLight.places[state.current] || 0) + 1;
}

/* ============================================================
   인카운터 엔진 (ARC-01: 콘텐츠는 테이블, 로직은 엔진)
   - 조건은 선언적 when 필드로 표준화한다: when.{ seasons, shelters, districts,
     weather, night, day(낮 한정), minDay, needsRadio, needsCat }.
   - eventMatches(id, ctx): 후보 자격 판정. eventWeight: 반복 억제 가중치.
   - drawEvent(ctx): 자격+가중치로 하나 뽑아 예약. 두 호출부(아침 결산/탐험 중간)가 공유.
   - state.evHistory: 최근 발화 id 로그(최근 12건). 같은 이벤트 3연속 금지 +
     최근 7일 창 동일 이벤트 ≤2회로 가중치 감쇄 (REQ-EVT-02).
============================================================ */
const EV_HISTORY_MAX = 12;
// ctx: { season, district, weather, night, day } — 없으면 현재 상태에서 유도
function eventCtx() {
  const h = gameHour();
  return {
    season: seasonOf().id,
    district: districtOf(state.current),
    shelter: state.current,
    weather: weather.type,
    night: h >= 21 || h < 6, // 야간(밤~새벽). 아침 결산 draw는 '지난밤' 사건 허용 위해 caller가 override.
    day: state.day,
  };
}
// 선언적 조건 판정. when 이 없으면 무조건 후보. cond(레거시 자유함수)도 그대로 존중.
function eventMatches(id, ctx) {
  const ev = EVENTS[id];
  if (!ev || ev.special) return false;
  const w = ev.when;
  if (w) {
    if (w.seasons && !w.seasons.includes(ctx.season)) return false;
    if (w.shelters && !w.shelters.includes(ctx.shelter)) return false;
    if (w.districts && !w.districts.includes(ctx.district)) return false;
    if (w.weather && !w.weather.includes(ctx.weather)) return false;
    if (w.night === true && !ctx.night) return false;
    if (w.dayOnly === true && ctx.night) return false; // 낮 한정(caravan_pass 등)
    if (w.minDay != null && ctx.day < w.minDay) return false;
    if (w.needsRadio && !items.some(i => i.defId === 'radio')) return false;
    if (w.needsCat && !state.cat) return false;
    if (w.hasMod && !hasMod(w.hasMod)) return false;
  }
  if (ev.cond && !ev.cond()) return false; // 레거시/추가 자유조건
  return true;
}
// 반복 억제 가중치: 직전 발화면 강한 감쇄, 7일 창 2회 이상이면 사실상 제외.
function eventWeight(id) {
  const hist = state.evHistory || [];
  const last = hist[hist.length - 1];
  if (last && last.id === id) return 0.15;              // 연속 등장 강한 억제
  const recent7 = hist.filter(h => state.day - h.day <= 7 && h.id === id).length;
  if (recent7 >= 2) return 0.05;                        // 7일 창 2회 이상 → 거의 안 뜸
  if (recent7 === 1) return 0.4;
  const base = EVENTS[id].weight || 1;
  return base;
}
// 하드 가드 (REQ-EVT-02): ①최근 2건이 모두 같은 id면 3연속 금지, ②최근 7일 창에 이미 2회면 후보 제외.
function eventThreePeatBlocked(id) {
  const hist = state.evHistory || [];
  const n = hist.length;
  if (n >= 2 && hist[n - 1].id === id && hist[n - 2].id === id) return true;
  // 7일 창(오늘 포함 직전 6일) 내 동일 이벤트가 이미 2회면 3번째 발화 차단 (REQ-EVT-02).
  const recent7 = hist.filter(h => state.day - h.day <= 6 && h.id === id).length;
  if (recent7 >= 2) return true;
  return false;
}
function pushEvHistory(id) {
  if (!Array.isArray(state.evHistory)) state.evHistory = [];
  state.evHistory.push({ id, day: state.day });
  if (state.evHistory.length > EV_HISTORY_MAX) state.evHistory.shift();
}
// 후보 풀에서 가중 추첨해 pendingEvent 예약. 성공 시 뽑힌 id, 없으면 null.
function drawEvent(ctx = eventCtx()) {
  if (isWallpaper()) return null; // 🖼️ 배경화면: 인카운터/이벤트 off
  const cands = Object.keys(EVENTS).filter(id =>
    !EVENTS[id].special && eventMatches(id, ctx) && !eventThreePeatBlocked(id));
  if (!cands.length) return null;
  const weights = cands.map(eventWeight);
  let sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  let roll = Math.random() * sum;
  let pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { roll -= weights[i]; if (roll <= 0) { pick = cands[i]; break; } }
  state.pendingEvent = pick;
  state.lastEventDay = state.day;
  pushEvHistory(pick);
  return pick;
}

// 이벤트 스팅어 톤(#13 사운드): 등장 차임을 카테고리별로 피치 변주(WebAudio playbackRate).
//   서사(narrative, 기본) 1.0 · 위험(danger) 0.82(낮게 긴장) · 온기(warmth) 1.18(높게 포근).
//   신규 에셋 불필요 — 기존 'sting' 하나를 rate 변주로 3종화. 선언적 테이블(ARC-01).
const EVENT_STING = {
  storm: 'danger', thief: 'danger', spoil_merchant: 'danger', leaky_roof: 'danger', frozen_pipe: 'danger',
  dog: 'warmth', cat_gift: 'warmth', cat: 'warmth', coldsnap_stranger: 'warmth', caravan_pass: 'warmth', trader: 'warmth',
  // 그 외(wanderer, seeds, radio_sig, snow_prints, lighthouse_ship, greenhouse_birds,
  //       distant_light, radio_ghost, old_calendar, broken)는 기본 서사 톤.
};
const STING_RATE = { narrative: 1.0, danger: 0.82, warmth: 1.18 };
function playEventSting(id) {
  const tone = EVENT_STING[id] || 'narrative';
  dbgSfx = 'sting:' + tone; // 하네스 lastSfx 추적: 어떤 톤이 울렸는지 확인
  playSfx('sting', { rate: STING_RATE[tone], jitter: 0.03 });
}
// title/text/choice label 은 언어 전환 시점(showEvent) 에 t() 로 해석하므로 id 로 보관한다.
// 인카운터 테이블은 src/data/events.js로 분리(콘텐츠 데이터 Phase 1). 함수 필드가 game.js
// 내부 심볼을 참조하므로 팩토리 makeEvents(ctx)에 의존성 주입해 생성한다(원본과 동작 동일).
// state/items/weather는 const 참조라 재할당되지 않아 클로저 캡처가 안전하다.
const EVENTS = makeEvents({
  t, LN, RESOURCES, DEFS, MEMOS, MEMOS_RESEARCH, BROADCASTS, BAL,
  state, items,
  resAdd, resConsume, addMoodBuff, applyInjury, seasonOf, coldSnapActive,
  dropMemo, dropBroadcast, recordDistantLight, spawnCat, playSfx,
  runEndingSequence, doctorFragmentsComplete,
});
// 이벤트 선택지 비용 판정/소비: food가 섞인 cost는 신선+통조림 합산으로 취급 (신선 우선 소비 후 통조림 폴백)
function eventCostOk(cost) {
  return Object.entries(cost).every(([id, n]) => id === 'food' ? hasAnyFood(n) : (state.res[id] || 0) >= n);
}
function eventCostConsume(cost) {
  if (!eventCostOk(cost)) return false;
  for (const [id, n] of Object.entries(cost)) { if (id === 'food') consumeAnyFood(n); else resConsume(id, n); }
  return true;
}
function showEvent(id) {
  const ev = EVENTS[id];
  if (!ev) return;
  playEventSting(id);
  state.activeEvent = id; // 현재 떠 있는 이벤트 (내리기 대상)
  const evTitle = t(ev.titleId);
  // 이벤트 일러스트 전면 적용 (22종 배포 완료) — 미보유 id(ending 등)는 onerror가 조용히 제거
  const illust = `<img class="ev-illust" src="img/events/ev_${id}.png" alt="" draggable="false" onerror="this.remove()">`;
  const body = `${illust}
    <div class="modal-body" style="line-height:2">${ev.textFn ? ev.textFn() : t(ev.textId)}</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      ${ev.choices.map((c, i) => {
        const cost = typeof c.cost === 'function' ? c.cost() : c.cost; // 계절 가변 비용(밀수꾼) 지원
        const ok = !cost || eventCostOk(cost);
        return `<button class="pixel-btn" data-ch="${i}" ${ok ? '' : 'disabled'}>${t(c.labelId)}${cost && !ok ? t('ev.noResource') : ''}</button>`;
      }).join('')}
      <button class="pixel-btn" id="event-minimize" data-i18n="event.minimize">${t('event.minimize')}</button>
    </div>`;
  openModal(`${ev.icon} ${evTitle}`, body);
  $('modal-body').querySelectorAll('button[data-ch]').forEach(b =>
    b.addEventListener('click', () => {
      const c = ev.choices[+b.dataset.ch];
      const cCost = typeof c.cost === 'function' ? c.cost() : c.cost; // 계절 가변 비용 해석
      if (cCost && !eventCostConsume(cCost)) { toast(t('toast.needResource')); return; }
      const result = c.run();
      state.dayLog.notes.push(t('event.metNote', { icon: ev.icon, title: evTitle }));
      state.activeEvent = null;
      state.minimizedEvent = null; // 선택 완료 → 내려둔 상태도 해제
      hideEventChip();
      openModal(`${ev.icon} ${evTitle}`, `<div style="line-height:2">${result}</div>`);
      scheduleSave();
      renderResBar();
      updateHud();
    }));
  // 내리기: 모달만 숨기고 이벤트 상태는 보존 → 하단 칩으로 복원 가능 (부수효과 없음, 소진 아님)
  const minBtn = document.getElementById('event-minimize');
  if (minBtn) minBtn.addEventListener('click', () => {
    state.minimizedEvent = id;
    state.activeEvent = null;
    closeModal();
    showEventChip(id);
    scheduleSave();
  });
  tipOnce('tip.event'); // 찢어진 쪽지: 첫 인카운터 직후
}
// 내려둔 이벤트 칩 — 클릭 시 showEvent(id)로 선택지 그대로 복원
function showEventChip(id) {
  const ev = EVENTS[id];
  if (!ev) return;
  let chip = document.getElementById('event-chip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'event-chip';
    chip.className = 'pixel-btn';
    document.body.appendChild(chip);
  }
  chip.title = t('event.chip.title');
  chip.innerHTML = `${ev.icon} ${t(ev.titleId)} <span class="ev-bang">!</span>`;
  chip.style.display = '';
  chip.onclick = () => {
    hideEventChip();
    state.minimizedEvent = null;
    showEvent(id);
  };
}
function hideEventChip() {
  const chip = document.getElementById('event-chip');
  if (chip) chip.style.display = 'none';
}

/* ============================================================
   제작 (기획서: 업그레이드 트랙 — 재료 → 자원/가구)
============================================================ */
/* ── 거처 개조 (기지 커스터마이징: 빗물받이·텃밭·증축 등) ── */
const SHELTER_MODS = {
  raincatch:  { name: '빗물받이',    nameEn: 'Rain Catch',   emoji: '🪣', cost: { material: 2, parts: 1 }, desc: '비/눈 오는 날 깨끗한 물 +1', descEn: 'Clean water +1 on rainy/snowy days', not: ['lighthouse'] },
  garden:     { name: '텃밭 상자',   nameEn: 'Garden Box',   emoji: '🌱', cost: { material: 2, water: 2 }, desc: '이틀에 한 번 음식 +1 (겨울 제외)', descEn: 'Food +1 every other day (except winter)', not: ['subway', 'rooftop'] },
  // 옥상 텃밭 (#53) — rooftop 전용. 마당을 텃밭으로 개조. 매일 음식 생산(겨울 0), 옥탑 퍽 gardenMult로 2배.
  //   현재 텃밭은 rooftop 전용이라 퍽이 곧 정체성 — 다른 셸터로의 확장은 향후.
  rooftopGarden: { name: '옥상 텃밭', nameEn: 'Rooftop Garden', emoji: '🌱', cost: { material: 3, water: 2 }, desc: '마당을 텃밭으로 — 매일 음식 +2 (겨울 휴면)', descEn: 'Turn the yard into a garden — food +2 daily (dormant in winter)', only: ['rooftop'] },
  // 1.2 버섯 재배칸 (subway 전용) — 어둠에서 자라는 식량. 옥탑 텃밭(볕/여름)의 대칭축(어둠/연중).
  //   매일 음식 +1(겨울 포함 연중), 이틀에 한 번 물 1 소모. 옥탑보다 산출 절반이되 계절을 타지 않는다.
  mushroom: { name: '버섯 재배칸', nameEn: 'Mushroom Bed', emoji: '🍄', cost: { material: 3, water: 3 }, desc: '어둠 속 균상 — 매일 음식 +1 (연중, 물 소모)', descEn: 'A mushroom bed in the dark — food +1 daily year-round (uses water)', only: ['subway'] },
  insulation: { name: '단열재',      nameEn: 'Insulation',   emoji: '🧤', cost: { cloth: 3, material: 2 }, desc: '악천후에도 쾌적함이 떨어지지 않음', descEn: 'Comfort no longer drops in bad weather', only: ['container', 'bus'] },
  shelf:      { name: '증축 선반',   nameEn: 'Extra Shelving', emoji: '🪜', cost: { material: 3, parts: 1 }, desc: '가구 배치 한도 +4', descEn: 'Furniture limit +4', only: ['bus'] },
  solar:      { name: '태양광 패널', nameEn: 'Solar Panel',  emoji: '🔆', cost: { parts: 4, battery: 1 },  desc: '이틀에 한 번 배터리 +1', descEn: 'Battery +1 every other day', not: ['subway'] },
  roof:       { name: '지붕 보강',   nameEn: 'Roof Reinforcement', emoji: '🛠️', cost: { material: 4 },      desc: '악천후 수리 자재가 더 이상 들지 않음', descEn: 'Bad-weather repairs no longer cost materials', only: ['cabin', 'greenhouse'] },
  extension:  { name: '증축',        nameEn: 'Extension',    emoji: '🧱', cost: { material: 6, parts: 2 },  desc: '거처 폭 +2m — 벽을 허물고 더 넓게', descEn: 'Shelter width +2m — tear down a wall for more room', only: ['container', 'cabin', 'greenhouse', 'rooftop', 'subway', 'ship'] },
  // 1.3 온천 (lodge 전용) — 고원 발견물을 개조로 개방. cozy의 정점: 쾌적 온기 대형 + 취침 에너지 회복 보너스.
  //   고양이/개가 온천 옆에서 조는 전용 포즈(연출은 아트 폴백 — addModProp 소품 + 절차 김 파티클).
  onsen: { name: '온천', nameEn: 'Hot Spring', emoji: '♨️', cost: { material: 4, parts: 2 }, desc: '고원의 온천을 끌어들여 — 쾌적함 대폭 + 취침 회복 보너스', descEn: 'Tap the highland hot spring — big comfort boost + restful sleep bonus', only: ['lodge'] },
  // Phase B 개조 2단계 (비용 곡선 상향: 1단계의 2~2.5배)
  insulationPlus: { name: '강화 단열재', nameEn: 'Reinforced Insulation', emoji: '🧥', cost: { cloth: 7, material: 5, parts: 1 }, desc: '한파 방어 강화 (단열재 위에)', descEn: 'Stronger cold-snap defense (over insulation)', req: 'insulation' },
  bigraincatch:   { name: '대형 빗물받이', nameEn: 'Large Rain Catch', emoji: '🛢️', cost: { material: 5, parts: 2 }, desc: '비/눈 오는 날 물 +2 (빗물받이 위에)', descEn: 'Water +2 on rainy/snowy days (over rain catch)', req: 'raincatch', not: ['lighthouse'] },
};
// 개조가 셸터의 어느 앵커에 붙는지 선언 (ARC-01: 콘텐츠는 테이블).
// roof=지붕면 브래킷 · eave=처마 홈통+파이프+물통 · wall=외벽 덧댐 · ground=지면(마당) 배치.
const MOD_MOUNT = {
  solar: 'roof', raincatch: 'eave', bigraincatch: 'eave',
  insulation: 'wall', insulationPlus: 'wall', garden: 'ground', rooftopGarden: 'ground',
  mushroom: 'ground', // 1.2 버섯 재배칸 — 지면(승강장) 배치. subway는 SHELTER_MOUNTS.subway.eave 폴백을 쓴다.
  onsen: 'ground',    // 1.3 온천 — 지면(로지 옆마당) 배치. lodge에 ground 앵커 없으면 addModProp 폴백(벽 밀착).
};
// 셸터별 설치 앵커 실측 좌표 (buildRoom 지오메트리 기준).
//  roof:  { y(지붕 상면), cx, cz(지붕 중심), hw, hd(지붕 반폭/반깊이), pitch?(경사지붕이면 +z로 내려가는 기울기 rad) }
//  eave:  { y(처마 높이), x, z(모서리), dir(파이프가 뻗는 방향 [±1,±1]) }
//  wall:  { face:'-z'|'+z'|'-x'|'+x', y(벽 높이), len(벽 길이), off(벽 바깥면까지 거리) }
//  groundY: 벽 바깥 지형 높이(레이캐스트 실측, #87) — 물통/텃밭/온천 등 지면 소품의 발밑.
//    방 바닥(y0)과 지형이 다른 셸터(오두막 기단 -1.3, 예인선 수면 -2.7 등)에서 y0 배치가 공중 부양하던 실기기 신고의 교정값.
//  ground: 텃밭 전용 배치 앵커 { x, z, y?(기본 groundY), rot? } — 보트=갑판 위, 등대=등지기실 실내 화분.
// 앵커가 없는 셸터의 개조는 addModProp의 폴백(벽 밀착 지면 배치)을 쓴다.
const SHELTER_MOUNTS = {
  container: { // 6.4×2.9×2.4 평지붕, 벽 off 0.11. 바닥이 다리 위 — 지형 -0.73.
    roof: { y: 2.42, cx: 0, cz: 0, hw: 3.0, hd: 1.3, cullJoin: true },
    eave: { y: 2.4, x: 3.31, z: 1.45, dir: [1, 1] },
    wall: { face: '+z', y: 2.4, len: 6.4, off: 1.45 },
    groundY: -0.73, ground: { x: 4.4, z: 1.2, rot: Math.PI / 2 },
  },
  bunker: { // 돔 아치 R4.35 — 평지붕 없음. 앞 포치(+z) 위 경사 거치. 지형 -0.82.
    roof: { y: 2.7, cx: 0, cz: 3.4, hw: 2.4, hd: 0.7 },
    eave: { y: 3.0, x: 4.25, z: 3.0, dir: [1, 1] },
    groundY: -0.82, ground: { x: 5.6, z: 2.1, rot: Math.PI / 2 },
  },
  rooftop: { // 옥탑 리워크(#53): 5.6×4.4×2.4 가벽 방 + 슬레이트 지붕(상면 ~2.5). 옥상 바닥 = y0.
    roof: { y: 2.52, cx: 0, cz: 0, hw: 2.5, hd: 1.9, cullJoin: true },
    eave: { y: 2.4, x: 2.88, z: -2.48, dir: [1, -1] }, // 뒷모서리(+x/-z) 처마 — 앞은 텃밭 마당(v1.6 조합 감사: 물통이 텃밭 안에 서던 것 이전)
    wall: { face: '+x', y: 2.4, len: 4.4, off: 2.9 }, // 마당 쪽 외벽 (단열재 등 폴백)
    groundY: 0,
  },
  cabin: { // 10×8×2.7 풀지붕(평평). 벽 off 0.11. 기단 위 오두막 — 지형 -1.3.
    roof: { y: 2.85, cx: 0, cz: 0, hw: 4.6, hd: 3.6, cullJoin: true },
    eave: { y: 2.7, x: 5.11, z: 4.11, dir: [1, 1] },
    groundY: -1.3, ground: { x: 6.5, z: 1.6, rot: Math.PI / 2 },
  },
  bus: { // 6.8×2.4×2.2 평지붕, 상단 띠 2.17. 벽 off 0.09. 차체 바닥 — 지형 -0.69.
    roof: { y: 2.2, cx: 0, cz: 0, hw: 3.1, hd: 1.1, cullJoin: true },
    eave: { y: 2.15, x: 3.49, z: 1.29, dir: [1, 1] },
    wall: { face: '+z', y: 2.1, len: 6.8, off: 1.29 },
    groundY: -0.69, ground: { x: 5.4, z: 0.8, rot: Math.PI / 2 },
  },
  subway: { // 지하 — 지붕/처마 무의미. 뒷벽(-z)에 지면 배치. eave.y=0 → 물통만(천장 누수 받이).
    eave: { y: 0, x: 4.6, z: -2.7, dir: [1, -1] },
    groundY: 0,
  },
  greenhouse: { // 9×6×2.4 유리 프레임 상단 y2.4. 벽 off 0.08. 지형 -0.73.
    roof: { y: 2.44, cx: 0, cz: 0, hw: 4.1, hd: 2.6, cullJoin: true },
    eave: { y: 2.4, x: 4.58, z: 3.08, dir: [1, 1] },
    groundY: -0.73, ground: { x: 5.8, z: 2.0, rot: Math.PI / 2 },
  },
  ship: { // (v1.5 리워크) 갑판 위 간이집 5.6×3.4×2.35(-z/-x 구석, 슬레이트 상면 ~2.46). 텃밭은 갑판 위 화단(물 위 부양 금지).
    //   roof.y=2.46: 간이집 슬레이트 tagCeiling(2.43)에 cullJoin — 2층 데크 슬래브(y2.5)보다 가깝게 잡아
    //   attachToRoofCull이 간이집 지붕 그룹을 고르게 한다(컬링되는 지붕이라 cullJoin 적정 — 로지 역효과 사례와 반대).
    roof: { y: 2.46, cx: -1.7, cz: -1.8, hw: 2.6, hd: 1.5, cullJoin: true },
    eave: { y: 2.4, x: -4.68, z: 0.18, dir: [-1, 1] }, // 간이집 앞(-x/+z) 처마 모서리 — 홈통은 좌벽/앞벽 컬링에 편입
    groundY: 0, ground: { x: 3.4, z: 2.1, y: 0, rot: 0 },
  },
  lighthouse: { // 원통 — 방(등지기실)이 탑 정상: 바깥 지형은 암반 -8 허공. 텃밭=실내 화분. 자체 홈통 존재(raincatch not).
    roof: { y: 2.55, cx: 0, cz: -2.9, hw: 1.6, hd: 1.0 },
    groundY: 0, ground: { x: 2.1, z: -2.2, y: 0, rot: Math.PI / 2 },
  },
  // #79 ④: 아래 3셸터(예인선/관제탑/로지)는 앵커 미선언이라 태양광이 바닥 폴백으로 실내 부유했다 → 실측 지붕/처마 앵커 부여.
  tugboat: { // 6.4×4.2×2.2 개방 갑판 + 뒤쪽(-z) 조타실(상단 2.2, z≈-2.36). 수면 -2.7 — 텃밭/물통은 갑판 위.
    roof: { y: 2.3, cx: 0, cz: -1.6, hw: 2.2, hd: 0.9 },
    eave: { y: 2.1, x: 3.02, z: 2.0, dir: [1, 1] }, // #87: x3.4는 갑판(반폭 3.2) 밖 — 물통이 물에 뜨던 것 → 갑판 안쪽으로
    groundY: 0, ground: { x: 2.0, z: 1.3, y: 0, rot: 0 },
  },
  controltower: { // 6.6×6.6×2.6 유리 전망 평지붕(중앙 회전등 h+0.4). 방 밖은 좁은 발코니(-0.2), 그 너머 -16 허공.
    roof: { y: 2.62, cx: 0, cz: 1.7, hw: 2.6, hd: 1.2, cullJoin: true },
    eave: { y: 2.6, x: 3.38, z: 3.38, dir: [1, 1] },
    groundY: -0.2, ground: { x: 3.72, z: 0, rot: Math.PI / 2 },
  },
  lodge: { // 8.4×6.4×3 A자형 경사 지붕(용마루 h+0.7=3.7, +z면 기울기 atan2(1.4,3.5)≈0.38). 지형 -0.88 (온천도 이 값).
    roof: { y: 3.15, cx: 0, cz: 1.55, hw: 2.6, hd: 1.1, pitch: 0.38 },
    eave: { y: 3.0, x: 4.31, z: 3.31, dir: [1, 1] },
    groundY: -0.88, ground: { x: 5.5, z: 1.7, rot: Math.PI / 2 },
  },
};
function modAvailable(id, shelterId) {
  const m = SHELTER_MODS[id];
  if (m.only && !m.only.includes(shelterId)) return false;
  if (m.not && m.not.includes(shelterId)) return false;
  // 2단계 개조: 선행 개조(req)가 설치돼 있어야 목록에 노출
  if (m.req && !(state.mods?.[shelterId] || []).includes(m.req)) return false;
  return true;
}
function hasMod(id) { return (state.mods?.[state.current] || []).includes(id); }
// 설치된 개조의 시각 소품 (roomGroup에 부착 — 셸터 로드 시 재생성)
// ── 앵커 부착 소품 빌더 (#51) ──
// 태양광: 지붕면 위 경사 브래킷 프레임 + 패널. roof 앵커의 pitch가 있으면 지붕 각도에 밀착.
function buildSolarProp(roof) {
  const g = new THREE.Group();
  const tilt = -0.42; // 패널 경사 ~24°
  const legF = 0.12, legB = 0.5; // 앞다리 짧게/뒷다리 길게 → 경사 거치대
  const pw = Math.min(1.6, roof.hw * 0.9), pd = Math.min(1.1, roof.hd * 1.1);
  // 브래킷 다리 4개
  for (const sx of [-1, 1]) {
    Cyl(g, 0.035, 0.045, legF, 0x55504a, sx * pw * 0.42, legF / 2, pd * 0.5, 5);
    Cyl(g, 0.035, 0.045, legB, 0x55504a, sx * pw * 0.42, legB / 2, -pd * 0.5, 5);
  }
  // 경사 레일 2개
  for (const sx of [-1, 1]) {
    const rail = B(g, 0.05, 0.05, pd + 0.1, 0x6a655c, sx * pw * 0.42, (legF + legB) / 2 + 0.02, 0);
    rail.rotation.x = tilt;
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.08, 0.04, pd + 0.08), lamb(0x8a8f96));
  frame.position.set(0, (legF + legB) / 2 + 0.08, 0); frame.rotation.x = tilt; g.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.05, pd), lamb(0x1d2b45));
  panel.position.set(0, (legF + legB) / 2 + 0.11, 0); panel.rotation.x = tilt;
  panel.castShadow = true; g.add(panel);
  // 셀 격자 (읽히는 디테일)
  for (let i = 1; i < 3; i++) B(g, pw, 0.055, 0.015, 0x2f4468, 0, (legF + legB) / 2 + 0.115, -pd / 2 + i * pd / 3).rotation.x = tilt;
  g.position.set(roof.cx, roof.y, roof.cz);
  if (roof.pitch) g.rotation.x = roof.pitch;
  roomGroup.add(g);
  // #87: 지붕이 부감 컬링으로 사라지는 셸터(cullJoin)만 지붕과 함께 페이드 — 패널이 실내 위 허공에 남지 않게.
  //   외피가 항상 보이는 셸터(로지 A자/벙커 돔/보트 조타실)는 편입하면 패널만 사라지는 역효과(로지 실측) — 제외.
  if (roof.cullJoin) attachToRoofCull(roof.y, g);
  return g;
}
// 빗물받이: 처마 홈통(가는 박스) + 모서리 세로 파이프 + 지면 물통. big이면 홈통 2변 + 큰 물통.
//   #87: 홈통/파이프는 붙은 벽의 컬링 단위에 편입(벽이 숨으면 골조가 허공에 남지 않게), 물통은 지면(groundY) 잔류.
//   eave.y가 낮으면(지하철 승강장) 홈통/파이프 생략 — 천장 누수 받이 물통만.
function buildRainProp(eave, big, gy = 0) {
  const g = new THREE.Group();
  const [dx, dz] = eave.dir;
  const gutMat = 0x6a7076;
  if (eave.y >= 0.5) {
    const gWall = new THREE.Group(); // 벽 컬링 편입분: 홈통 A + 세로 파이프
    const gutLen = big ? 3.4 : 2.2;
    const gutA = B(gWall, 0.12, 0.1, gutLen, gutMat, eave.x, eave.y - 0.05, eave.z - dz * gutLen / 2);
    gutA.castShadow = true;
    // 세로 파이프: 처마 모서리 → 지형(groundY)
    Cyl(gWall, 0.055, 0.055, eave.y - gy, gutMat, eave.x, (eave.y + gy) / 2, eave.z, 6);
    roomGroup.add(gWall);
    attachToWall(Math.sign(eave.x) || 1, 0, 0, gWall);
    if (big) {
      const gWall2 = new THREE.Group(); // 홈통 B는 직교 벽을 따라 — 그 벽의 컬링 단위로
      const gutB = B(gWall2, gutLen, 0.1, 0.12, gutMat, eave.x - dx * gutLen / 2, eave.y - 0.05, eave.z);
      gutB.castShadow = true;
      roomGroup.add(gWall2);
      attachToWall(0, 0, Math.sign(eave.z) || 1, gWall2);
    }
  }
  // 물통 (모서리 바로 아래, 지형 위)
  const br = big ? 0.44 : 0.32, bh = big ? 0.95 : 0.66;
  const barrel = Cyl(g, br, br * 0.9, bh, big ? 0x4a6a5c : 0x5a7a8c, eave.x, gy + bh / 2, eave.z, 12);
  barrel.castShadow = true;
  B(g, br * 1.5, 0.04, br * 1.5, 0x3a4a55, eave.x, gy + bh + 0.02, eave.z);
  roomGroup.add(g);
  return g;
}
// 단열재: 외벽면에 덧댄 패널 3~4장 (벽보다 밝은 회백, 두께감 +0.06, 이음 라인). plus면 모서리 금속 몰딩.
function buildInsulationProp(wall, plus) {
  const g = new THREE.Group();
  const n = 4, gap = 0.03, pw = (wall.len - gap * (n + 1)) / n;
  // #79 ①: 벽 두께(반두께 ~0.11) 바깥으로 완전히 빼서 z-fight 번쩍임 제거.
  //   wall.off는 벽 바깥면까지 거리 — 여기에 벽 절반두께+패널 절반두께+여유를 더해 패널이 벽면에 겹치지 않게 한다.
  const off = wall.off + 0.17;
  const panels = [];
  for (let i = 0; i < n; i++) {
    const lx = -wall.len / 2 + gap + pw / 2 + i * (pw + gap);
    panels.push({ lx, w: pw });
  }
  const ph = wall.y - 0.1;
  const baseCol = plus ? 0xc4c5bb : 0xb2b0a4;
  panels.forEach(({ lx, w: pwi }, i) => {
    // 패널마다 미세하게 다른 명도 → 낱장 덧댐이 읽힌다
    const shadeMul = 1 - (i % 2) * 0.08;
    const p = new THREE.Mesh(new THREE.BoxGeometry(pwi, ph, 0.06), wallPhong({ color: shade(baseCol, shadeMul) }));
    p.position.set(lx, ph / 2 + 0.05, 0); p.castShadow = p.receiveShadow = true; g.add(p);
    // 이음 홈 (패널 좌측 어두운 세로선) — base/plus 공통
    B(g, 0.035, ph, 0.075, plus ? 0x8a8a80 : 0x76746a, lx - pwi / 2 - gap / 2, ph / 2 + 0.05, 0);
  });
  // 하단 마감 레일 (벽 바깥으로 덧댄 두께감)
  B(g, wall.len, 0.09, 0.08, shade(baseCol, 0.82), 0, 0.09, 0.01);
  if (plus) {
    // 모서리 금속 몰딩 (좌우 세로 + 상단 가로)
    B(g, 0.09, wall.y, 0.09, 0x9a9e9a, -wall.len / 2, wall.y / 2, 0.02);
    B(g, 0.09, wall.y, 0.09, 0x9a9e9a, wall.len / 2, wall.y / 2, 0.02);
    B(g, wall.len, 0.09, 0.09, 0x9a9e9a, 0, wall.y, 0.02);
  }
  // face별 위치/회전
  const rot = { '-z': 0, '+z': Math.PI, '-x': Math.PI / 2, '+x': -Math.PI / 2 };
  const pos = { '-z': [0, 0, -off], '+z': [0, 0, off], '-x': [-off, 0, 0], '+x': [off, 0, 0] };
  g.rotation.y = rot[wall.face] ?? 0;
  g.position.set(...(pos[wall.face] ?? [0, 0, off]));
  roomGroup.add(g);
  // #79 ①: 단열재는 외벽을 덮는 물건 — 해당 벽의 컬링/페이드 단위에 편입한다(벽이 숨으면 함께 숨어 실내 노출).
  //   attachToWall이 월드 변환을 보존하며 재부모화하므로 위 position/rotation 유지. face→벽 바깥 법선 매핑.
  const nrm = { '-z': [0, 0, -1], '+z': [0, 0, 1], '-x': [-1, 0, 0], '+x': [1, 0, 0] }[wall.face] || [0, 0, 1];
  attachToWall(nrm[0], nrm[1], nrm[2], g);
  return g;
}
// #98(디렉터: "증축하면 화단·빗물받이랑 겹친다 — 다른 셸터 포함"): SHELTER_MOUNTS 앵커는 '원본 외벽'
//   실측치인데 증축(w+2)이면 ±x 외벽이 1씩 밀려난다 — 원본 반폭 근처(-0.6)부터 바깥의 x 앵커를
//   같은 쪽으로 1 밀어 벽·부착물 관계를 보존한다. 데이터 무수정(소비 시점 보정), 전 셸터 공통.
//   z 앵커는 d 불변이라 그대로. 지붕 배치 박스(hw)는 지붕이 같이 넓어지므로 +1.
function extMounts(shelterId) {
  const m = SHELTER_MOUNTS[shelterId] || {};
  if (!(state.mods?.[shelterId] || []).includes('extension')) return m;
  const half = SHELTERS[shelterId].room.w / 2;
  const shiftX = x => (typeof x === 'number' && Math.abs(x) >= half - 0.6) ? x + Math.sign(x) : x;
  const out = { ...m };
  if (m.eave) out.eave = { ...m.eave, x: shiftX(m.eave.x) };
  if (m.ground) out.ground = { ...m.ground, x: shiftX(m.ground.x) };
  if (m.roof) out.roof = { ...m.roof, hw: m.roof.hw + 1 };
  if (m.wall && (m.wall.face === '+x' || m.wall.face === '-x')) out.wall = { ...m.wall, off: m.wall.off + 1 };
  return out;
}
function addModProp(id) {
  const { w, d } = ROOM;
  const mounts = extMounts(state.current);
  const type = MOD_MOUNT[id];
  if (id === 'solar') {
    if (mounts.roof) return buildSolarProp(mounts.roof);
    // 폴백: 벽에 최대한 밀착한 지면 경사 거치
    return buildSolarProp({ y: 0, cx: w / 2 - 0.5, cz: 0, hw: 1.6, hd: 1.0 });
  }
  if (id === 'raincatch' || id === 'bigraincatch') {
    const big = id === 'bigraincatch';
    const gy = mounts.groundY ?? 0; // #87: 물통/파이프 발밑 = 실측 지형
    if (mounts.eave) return buildRainProp(mounts.eave, big, gy);
    return buildRainProp({ y: ROOM.h * 0.9, x: w / 2 + 0.4, z: d / 2 + 0.4, dir: [1, 1] }, big, gy);
  }
  if (id === 'insulation' || id === 'insulationPlus') {
    const plus = id === 'insulationPlus';
    if (mounts.wall) return buildInsulationProp(mounts.wall, plus);
    return buildInsulationProp({ face: '+z', y: ROOM.h, len: w, off: d / 2 + 0.12 }, plus);
  }
  if (id === 'garden') {
    const g = new THREE.Group();
    B(g, 1.8, 0.3, 0.7, 0x6a4f33, 0, 0.15, 0);
    B(g, 1.7, 0.08, 0.6, 0x3a2f22, 0, 0.32, 0);
    const rand = seededRand(17);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + rand() * 0.06, 0), lamb(0x5f8a52));
      sp.position.set(-0.7 + i * 0.35, 0.42, (rand() - 0.5) * 0.3);
      sp.castShadow = true;
      g.add(sp);
    }
    // #87: 셸터별 ground 앵커 — 지형 높이(오두막 기단 등) + 벽 평행 회전. 보트=갑판 위, 등대=실내 화분.
    const ga = mounts.ground;
    if (ga && ga.rot) g.rotation.y = ga.rot;
    g.position.set(ga ? ga.x : w / 2 + 1.1, ga ? (ga.y ?? mounts.groundY ?? 0) : (mounts.groundY ?? 0), ga ? ga.z : -d / 2 + 1.2);
    roomGroup.add(g);
  } else if (id === 'rooftopGarden') {
    buildRooftopGarden();
  } else if (id === 'mushroom') {
    buildMushroomBed();
  } else if (id === 'onsen') {
    // 1.3 온천 — 로지 옆마당(방 밖 +x)에 돌 노천탕 + 절차 김 파티클. 고양이/개가 옆에서 조는 전용 포즈(폴백: 소품만).
    const g = new THREE.Group();
    const pr = seededRand(1333);
    // 돌 테두리(원형) + 물
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      B(g, 0.34, 0.28, 0.34, [0x6a655c, 0x5a544a, 0x746e64][Math.floor(pr() * 3)], Math.cos(a) * 1.1, 0.14, Math.sin(a) * 0.8).rotation.y = a;
    }
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.12, 20), new THREE.MeshLambertMaterial({ color: 0x2f5f6a, emissive: 0x123037, emissiveIntensity: 0.4 }));
    water.scale.z = 0.75; water.position.y = 0.18; g.add(water);
    // 김(steam) — 반투명 흰 구 몇 개(절차 폴백, 아트 파티클 대체)
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 + pr() * 0.1, 6, 5), new THREE.MeshLambertMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.28 }));
      s.position.set((pr() - 0.5) * 1.4, 0.5 + pr() * 0.7, (pr() - 0.5) * 1.0); g.add(s);
    }
    // #87 스윕(디렉터 "온천이면 따로 있어야지"): 벽에 붙던 것을 한 발 이격 + 징검돌 3장으로 '따로 있는 노천탕'.
    const oy = mounts.groundY ?? 0;
    g.position.set(w / 2 + 2.3, oy, -d / 2 + 1.9);
    roomGroup.add(g);
    for (let i = 0; i < 3; i++) {
      const st = B(roomGroup, 0.42, 0.09, 0.34, [0x6a655c, 0x746e64, 0x5a544a][i],
        w / 2 + 0.55 + i * 0.55, oy + 0.045, -d / 2 + 1.55 + i * 0.12);
      st.rotation.y = (i - 1) * 0.22; st.receiveShadow = true;
    }
  } else if (id === 'shelf') {
    B(roomGroup, 0.06, 1.4, ROOM.d * 0.7, 0x77543a, -w / 2 + 0.12, 0.7, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.1, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.7, 0);
  }
  // roof(지붕 보강)/extension: 시각 소품 없음 (구조 변경 개조)
}
// ── 옥탑 슬레이트 지붕 (#53) — 방 위에 슬레이트 몇 장. state.rooftopSlate==='full'이면 빈틈 없이,
//    'gapped'(기본)이면 2장 빠져 하늘이 보인다. buildRoom에서 호출, 제작 보수 시 loadShelter로 재빌드.
//    (v1.5) opts 파라미터화 — 페리 간이집이 재사용: { cx, cz }=지붕 중심 오프셋(기본 원점),
//    full=보수 상태 오버라이드(페리는 true 고정 — rooftopSlate 보수 루프는 옥탑 전용이므로 상태 비연동). ──
function buildRooftopSlate(w, d, h, opts = {}) {
  const full = opts.full ?? ((state.rooftopSlate || 'gapped') === 'full');
  const g = new THREE.Group();
  // 지붕판 베이스 (살짝 뒤로 경사진 얇은 슬래브)
  const eaveOver = 0.28;
  const rw = w + eaveOver * 2, rd = d + eaveOver * 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.06, rd), wallPhong({ color: 0x3a3a3c }));
  base.position.y = h + 0.06; base.receiveShadow = true; base.castShadow = true; g.add(base);
  // 슬레이트 타일 격자 (앞뒤로 겹쳐 이는 판) — 빠진 2장은 건너뛴다
  const cols = 6, rows = 4;
  const tw = rw / cols, td = rd / rows;
  const missing = full ? new Set() : new Set(['1,1', '4,2']); // (col,row) 두 장 빠짐
  const slateCols = [0x4a4e52, 0x53565a, 0x44484c, 0x4e5256];
  const pr = seededRand(153);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (missing.has(`${c},${r}`)) continue;
      const col = slateCols[Math.floor(pr() * slateCols.length)];
      const tile = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.98, 0.05, td * 0.62), wallPhong({ color: col }));
      const tx = -rw / 2 + tw * (c + 0.5);
      const tz = -rd / 2 + td * (r + 0.5);
      tile.position.set(tx, h + 0.11 + r * 0.012, tz - td * 0.16); // 앞줄이 뒷줄을 덮도록 살짝 겹침
      tile.rotation.x = 0.05; tile.castShadow = true; g.add(tile);
    }
  }
  if (!full) {
    // 빠진 자리 아래로 방 바닥이 보이도록 어두운 구멍 테두리 (빗물 새는 느낌)
    for (const key of missing) {
      const [c, r] = key.split(',').map(Number);
      const tx = -rw / 2 + tw * (c + 0.5), tz = -rd / 2 + td * (r + 0.5) - td * 0.16;
      B(g, tw * 0.9, 0.02, td * 0.5, 0x1a1c1e, tx, h + 0.02, tz);
    }
  } else {
    // 완전 보수: 용마루 마감 각목 한 줄
    B(g, rw, 0.05, 0.08, 0x5a5450, 0, h + 0.15, 0);
  }
  // ⑥-a: 슬레이트 지붕은 실내를 덮는다 — 공통 천장 컬링에 등록(부감에서 숨김). 보수 전/후 모두 g 하나에 담김.
  g.position.set(opts.cx || 0, 0, opts.cz || 0); // (v1.5) 지붕 중심 오프셋 (y는 0 — tagCeiling 높이 판정 불변)
  tagCeiling(g, h + 0.08);
  roomGroup.add(g);
}
// ── 옥상 텃밭 (#53) — 마당(방 밖 슬래브)에 플랜터 박스 2열. 작물 성장 3단계 지오메트리.
//    stage: 0=새싹 1=줄기 2=결실. 겨울이면 휴면(갈색). state.rooftopGardenStage로 결정. ──
function buildRooftopGarden() {
  const S = SHELTERS.rooftop._slab;
  const winter = seasonOf().id === 'winter';
  const stage = winter ? -1 : Math.max(0, Math.min(2, state.rooftopGardenStage ?? 0));
  const g = new THREE.Group();
  const pr = seededRand(207);
  // 플랜터 박스 2열 × 각 4포기
  const planter = (pz) => {
    B(g, 3.0, 0.32, 0.72, 0x6a4f33, 0, 0.16, pz);            // 나무 박스
    B(g, 2.9, 0.1, 0.64, winter ? 0x4a4038 : 0x3a2f22, 0, 0.36, pz); // 흙 (겨울엔 마른 톤)
    for (let i = 0; i < 4; i++) {
      const cx = -1.15 + i * 0.77;
      if (winter) {
        // 휴면: 갈색 마른 줄기
        const st = Cyl(g, 0.02, 0.03, 0.22, 0x6b5636, cx, 0.5, pz + (pr() - 0.5) * 0.2, 4); st.castShadow = true;
      } else if (stage === 0) {
        // 새싹
        const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + pr() * 0.04, 0), lamb(0x74a35a));
        sp.position.set(cx, 0.45, pz + (pr() - 0.5) * 0.2); sp.castShadow = true; g.add(sp);
      } else if (stage === 1) {
        // 줄기 (기른 대 + 잎)
        const st = Cyl(g, 0.025, 0.03, 0.42, 0x5f8a4a, cx, 0.6, pz + (pr() - 0.5) * 0.18, 5); st.castShadow = true;
        for (const sy of [0.55, 0.72]) {
          const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), lamb(0x6f9a5a));
          lf.scale.set(1.3, 0.5, 0.8); lf.position.set(cx + (pr() - 0.5) * 0.12, sy, pz); lf.castShadow = true; g.add(lf);
        }
      } else {
        // 결실 (줄기 + 열매)
        const st = Cyl(g, 0.03, 0.035, 0.5, 0x568044, cx, 0.64, pz + (pr() - 0.5) * 0.16, 5); st.castShadow = true;
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), lamb(0x5f8a52));
        bush.position.set(cx, 0.82, pz); bush.castShadow = true; g.add(bush);
        for (let k = 0; k < 3; k++) {
          const fr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lamb([0xc84a3a, 0xd8843a, 0xc84a3a][k % 3]));
          fr.position.set(cx + (pr() - 0.5) * 0.24, 0.78 + pr() * 0.1, pz + (pr() - 0.5) * 0.24); g.add(fr);
        }
      }
    }
  };
  planter(-0.5); planter(0.6);
  // 마당(+x/+z) 안쪽, 실외기/급수탑을 피해 배치
  g.position.set(S.frontX - 3.2, 0, S.frontZ - 3.0);
  roomGroup.add(g);
  blockers.push({ x: S.frontX - 3.2, z: S.frontZ - 3.0, w: 3.2, d: 2.0 });
}
// ── 1.2 버섯 재배칸 (subway 전용) — 승강장 뒷벽 쪽에 균상 선반 2단. 어둠 속에서 자라는 하얀 균사/갓.
//    옥탑 텃밭의 대칭 연출: 볕/흙 대신 어둠/습기. 계절 무관(연중) — 시각도 계절을 타지 않는다. ──
function buildMushroomBed() {
  const { w, d } = ROOM;
  const g = new THREE.Group();
  const pr = seededRand(361);
  // 습한 나무 균상 프레임 (2단 선반)
  const frame = wallPhong({ color: 0x4a3f34 });
  for (const sy of [0.28, 0.72]) {
    B(g, 2.2, 0.06, 0.7, 0x574a3c, 0, sy, 0);           // 선반판
    // 균상 배지(어두운 퇴비)
    B(g, 2.05, 0.08, 0.6, 0x2a231c, 0, sy + 0.07, 0);
    // 버섯 갓 (연한 회백색 반구 + 짧은 대) — 랜덤 군생
    const n = 7;
    for (let i = 0; i < n; i++) {
      const cx = -0.9 + (i / (n - 1)) * 1.8 + (pr() - 0.5) * 0.15;
      const cz = (pr() - 0.5) * 0.42;
      const h = 0.06 + pr() * 0.05;
      Cyl(g, 0.018, 0.022, h, 0xd8cfc0, cx, sy + 0.11 + h / 2, cz, 5); // 대
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045 + pr() * 0.03, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xc7bca8, emissive: 0x1a1410, emissiveIntensity: 0.4 }));
      cap.position.set(cx, sy + 0.11 + h, cz); cap.castShadow = true; g.add(cap);
    }
  }
  // 선반 기둥 4개
  for (const px of [-1.05, 1.05]) for (const pz of [-0.3, 0.3]) B(g, 0.06, 0.9, 0.06, 0x3d332a, px, 0.45, pz);
  // 뒷벽(-z) 왼쪽, 기둥(±w/4, z=0.4)을 피해 배치
  g.position.set(-w / 4 - 1.4, 0, -d / 2 + 0.6);
  roomGroup.add(g);
  blockers.push({ x: -w / 4 - 1.4, z: -d / 2 + 0.6, w: 2.3, d: 0.9 });
}
// ── 1.2 선로 복구 현장 (site='railSegment') — 지하철 buildEnv에서 호출. 승강장 앞 선로 위에 표현.
//    허브 미승격이면 없음. 승격 후: 구간별 진행(잔해→침목→개통)을 왼쪽부터 3구간으로 나눠 표시.
//    개통 완료 구간엔 반짝이는 새 레일 + 완공 1구간 이상이면 수동 궤도차(핸드카) 실루엣이 놓인다. ──
function buildRailSegments(w, d, h) {
  if (!state.subwayHub) return;
  const g = new THREE.Group();
  const railZ = d / 2 + 2.1;          // 선로 중앙 z (기존 트랙 위)
  const segIds = ['subRail1', 'subRail2', 'subRail3'];
  const segW = (w + 12) / 3;          // 세 구간이 트랙 전폭을 나눠 가짐
  const startX = -(w + 12) / 2;
  let anyDone = false;
  for (let s = 0; s < 3; s++) {
    const st = projectSiteStage(segIds[s]); // 0 미착수 · 1 잔해제거 · 2 침목 · 3 개통중 · 4 완공
    const cx = startX + segW * (s + 0.5);
    if (st <= 0) continue;
    if (st >= 1) {
      // 잔해 치운 노반 — 밝아진 자갈
      B(g, segW * 0.92, 0.06, 2.6, 0x2b2822, cx, -0.9, railZ);
    }
    if (st >= 2) {
      // 새 침목 (밝은 목재) — 여러 개
      const nTies = 5;
      for (let i = 0; i < nTies; i++) {
        const tx = cx - segW * 0.4 + (i / (nTies - 1)) * segW * 0.8;
        B(g, 0.4, 0.1, 2.0, 0x6a5638, tx, -0.8, railZ);
      }
    }
    if (st >= 3) {
      // 레일 체결(개통 진행/완료) — 반짝이는 금속 레일 2줄
      const railMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, emissive: 0x2a2e33, emissiveIntensity: 0.5 });
      for (const rz of [railZ - 0.7, railZ + 0.7]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(segW * 0.9, 0.08, 0.08), railMat);
        rail.position.set(cx, -0.7, rz); g.add(rail);
      }
    }
    if (st >= 4) anyDone = true;
  }
  if (anyDone) {
    // 수동 궤도차(핸드카) — 완공 구간이 하나라도 있으면 승강장 앞 레일 위에 놓인다.
    const car = new THREE.Group();
    B(car, 1.6, 0.25, 1.5, 0x3a3630, 0, 0.2, 0);                 // 대차 프레임
    for (const wx of [-0.6, 0.6]) for (const wz of [-0.6, 0.6]) Cyl(car, 0.18, 0.18, 0.1, 0x22242a, wx, 0.06, wz, 8, Math.PI / 2);
    B(car, 0.08, 0.5, 0.08, 0x55504a, 0, 0.5, 0);               // 펌프 손잡이 기둥
    B(car, 0.9, 0.06, 0.08, 0x6a6258, 0, 0.72, 0);              // 손잡이 바
    car.position.set(-w / 2 - 2, -0.62, d / 2 + 2.1);
    g.add(car);
  }
  envRoot.add(g);
}
// v1.6 조합 감사 검거: 상위 티어(req 증설형)는 하위를 보유한 채 설치된다 — 소품까지 둘 다 그리면
//   같은 앵커에 물통 2개/단열재 2겹이 중첩(전 셸터, 실플레이 도달). 시각은 상위가 자리를 대체한다.
const MOD_SUPERSEDE = { raincatch: 'bigraincatch', insulation: 'insulationPlus' };
function buildModProps() {
  for (const id of (state.mods?.[state.current] || [])) {
    if (MOD_SUPERSEDE[id] && (state.mods?.[state.current] || []).includes(MOD_SUPERSEDE[id])) continue; // 상위 티어가 대체
    // #87 스윕(디렉터 신고: 옥탑에 온천): 세이브에 뭐가 들어있든 이 셸터에서 불가능한 개조(only/not)는
    //   그리지 않는다 — QA 만렙 세이브·구세이브 오염 방어. 효과 계산이 아니라 시각 소품만 게이트(안전).
    if (SHELTER_MODS[id] && !modAvailable(id, state.current)) continue;
    // QA/컬링 추적용: 소품 루트 그룹에 modProp 태그를 붙인다(게임 로직/렌더 무영향 — userData 태그일 뿐).
    //   단열재처럼 벽 그룹으로 재부모화되는 소품은 반환값으로 식별, 나머지는 roomGroup 신규 자식을 스캔.
    const before = roomGroup.children.length;
    const ret = addModProp(id);
    if (ret && ret.isObject3D) { if (ret.userData.modProp == null) ret.userData.modProp = id; }
    for (let i = before; i < roomGroup.children.length; i++) {
      if (roomGroup.children[i].userData.modProp == null) roomGroup.children[i].userData.modProp = id;
    }
  }
}

/* ── 꾸미기(#13): 벽지/바닥재 적용 ──
   loadShelter가 buildRoom() 직후 호출. 셸터 지오메트리는 불변 — 재질의 .map만 교체한다.
   벽: stdWall에서 태깅한 isWallMat 재질(공유). 바닥: roomGroup 안의 넓고 얇은 수평 박스 메시.
   id가 'default'/미설정이면 셸터 원본 baseMap으로 복원(무변화). */
function currentDeco() { return state.deco?.[state.current] || {}; }
// 벽지/바닥재 선택: 유료 항목은 최초 적용 시 자원 소비(같은 셸터에 이미 산 것으로 되돌리면 무료).
function applyDecoChoice(kind, id) {
  if (!state.deco) state.deco = {};
  if (!state.deco[state.current]) state.deco[state.current] = {};
  const slot = kind === 'wall' ? 'wall' : 'floor';
  // (B-①) 벽지 미대상 셸터(유리 벽 등)는 벽지 적용을 게임식 문구로 차단 — 자원 먹튀 원천 차단.
  if (slot === 'wall' && SHELTERS[state.current]?.noWallpaper) { toast(t('deco.noWall')); return; }
  const table = kind === 'wall' ? WALLPAPERS : FLOORINGS;
  const def = table[id];
  if (!def) return;
  const cur = state.deco[state.current];
  if (cur[slot] === id) return; // 이미 적용됨
  // 이 셸터에서 이미 구매한 이력(_bought)이면 재적용 무료
  if (!cur._bought) cur._bought = {};
  const boughtKey = kind + ':' + id;
  if (id !== 'default' && def.cost && !cur._bought[boughtKey]) {
    if (!resConsumeAll(def.cost)) { toast(t('toast.needMaterial')); return; }
    cur._bought[boughtKey] = true;
    renderResBar();
  }
  cur[slot] = id;
  applyDeco();
  shadowDirty();
  playSfx('craft');
  scheduleSave();
  toast(t('deco.applied', { name: LName(def) }));
  openCraftModal(); // 모달 갱신
}
function applyDeco() {
  const d = currentDeco();
  // ── 벽지 ──
  const wallTex = decoTex('wall', d.wall);
  roomGroup.traverse(o => {
    const mat = o.material;
    if (mat && mat.userData && mat.userData.isWallMat) {
      if (!('baseWallColor' in mat.userData) && mat.color) mat.userData.baseWallColor = mat.color.getHex();
      const target = (d.wall && d.wall !== 'default') ? wallTex : (mat.userData.baseMap || null);
      if (mat.map !== target) {
        mat.map = target; mat.needsUpdate = true;
        // (B-①) 색상만 있던 벽(버스 등)에 벽지 map을 씌우면 색 곱연산으로 물든다 → 흰색으로. 되돌리면 원색 복원.
        if (target && mat.color) mat.color.setHex(0xffffff);
        else if (!target && mat.userData.baseWallColor != null && mat.color) mat.color.setHex(mat.userData.baseWallColor);
      }
    }
  });
  // ── 바닥재 ── (B-①) 명시 태그(userData.isDecoFloor) 우선. 태그된 바닥이 하나도 없으면 기존 휴리스틱
  //   (넓고 ≥ROOM폭*0.8, 얇은 ≤0.4, 지면 근처 수평 박스)으로 폴백 — 좁은 바닥(버스 등)이 조용히 탈락하지 않게.
  const floorTex = decoTex('floor', d.floor);
  let tagged = [];
  roomGroup.traverse(o => { if (o.isMesh && o.userData.isDecoFloor) tagged.push(o); });
  const targets = tagged.length ? tagged : (() => {
    const out = [];
    roomGroup.traverse(o => {
      if (!o.isMesh || !o.geometry?.parameters) return;
      const p = o.geometry.parameters;
      if (p.width == null || p.height == null || p.depth == null) return;
      if (p.height <= 0.4 && p.width >= ROOM.w * 0.8 && p.depth >= ROOM.d * 0.8 && o.position.y <= 0.2) out.push(o);
    });
    return out;
  })();
  for (const o of targets) {
    const mat = o.material;
    if (!mat || !mat.userData) continue;
    if (!('baseFloorMap' in mat.userData)) mat.userData.baseFloorMap = mat.map || null;
    if (!('baseFloorColor' in mat.userData) && mat.color) mat.userData.baseFloorColor = mat.color.getHex();
    const target = (d.floor && d.floor !== 'default') ? floorTex : mat.userData.baseFloorMap;
    if (mat.map !== target) {
      mat.map = target; mat.needsUpdate = true;
      // 원본 바닥에 색상만 있고 map이 없던 경우, map을 씌우면 색 곱연산으로 어두워질 수 있어 흰색으로.
      if (target && mat.color) mat.color.setHex(0xffffff);
      else if (!target && mat.userData.baseFloorColor != null) mat.color.setHex(mat.userData.baseFloorColor);
    }
  }
}

// 가구는 파밍이 아니라 제작이 기본 (파밍은 극히 드문 행운)
// CRAFTS(제작 레시피)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1). BAL 참조는 items.js가 balance.js를 import.
function openCraftModal() {
  if (paused) { toast(t('pause.blocked')); return; }
  const rows = CRAFTS.map((c, i) => {
    const outLabel = c.out.res
      ? `${resIcon(c.out.res)} ${LName(RESOURCES[c.out.res])} ×${c.out.n}`
      : c.out.outfit
        ? `${OUTFITS[c.out.outfit].emoji} ${LName(OUTFITS[c.out.outfit])}`
        : `${furnIcon(c.out.furn)} ${LName(DEFS[c.out.furn])}`;
    // #86④: 이미 옷장에 있는 의류는 재제작 불가 (영구 소유물 — 중복 소모 방지)
    const owned = c.out.outfit && (state.outfits || ['default']).includes(c.out.outfit);
    const ok = !owned && resHasAll(c.cost);
    return `
      <div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${outLabel}</span>
        <span class="p-eff" style="font-size:10px">${LHint(c)}</span>
        <span class="p-cost">${owned ? '' : costLabel(c.cost)}</span>
        ${owned
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('craft.owned')}</span>`
          : `<button class="pixel-btn" data-craft="${i}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('craft.make')}</button>`}
      </div>`;
  }).join('');
  // 현재 거처에 설치 가능한 개조
  const sh = SHELTERS[state.current];
  const modRows = Object.entries(SHELTER_MODS)
    .filter(([id]) => modAvailable(id, state.current))
    .map(([id, m]) => {
      const built = hasMod(id);
      const ok = resHasAll(m.cost);
      return `
      <div class="prep-row ${built ? 'sel' : ok ? '' : 'no'}" style="cursor:default">
        <span>${m.emoji} ${LName(m)}</span>
        <span class="p-eff" style="font-size:10px">${LDesc(m)}</span>
        <span class="p-cost">${built ? '' : costLabel(m.cost)}</span>
        ${built
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('craft.installed')}</span>`
          : `<button class="pixel-btn" data-mod="${id}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('craft.install')}</button>`}
      </div>`;
    }).join('');
  // 돔 벙커 프로젝트 (#36) — 천장 수리 2단계 + 절단기 뒷문. 벙커에서만 노출.
  let bunkerHtml = '';
  if (state.current === 'bunker') {
    const projRows = [];
    const roofState = state.bunkerRoof || 'hole';
    const stageLabel = { hole: t('bunker.roofHole'), temp: t('bunker.roofTemp'), full: t('bunker.roofFull') }[roofState];
    if (roofState !== 'full') {
      const next = roofState === 'hole' ? { btn: 'bunker.roofStage1Btn', cost: BAL.economy.bunkerRoofStage1, act: 'roof1' } : { btn: 'bunker.roofStage2Btn', cost: BAL.economy.bunkerRoofStage2, act: 'roof2' };
      const ok = resHasAll(next.cost);
      projRows.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>🛖 ${t('bunker.roofTitle')}</span>
        <span class="p-eff" style="font-size:10px">${stageLabel}</span>
        <span class="p-cost">${costLabel(next.cost)}</span>
        <button class="pixel-btn" data-bproj="${next.act}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t(next.btn)}</button>
      </div>`);
    } else {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>🛖 ${t('bunker.roofTitle')}</span><span class="p-eff" style="font-size:10px">${stageLabel}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    if (state.hasCutter && !state.bunkerBackdoor) {
      const bdOk = resHasAll(BAL.economy.bunkerBackdoorCost);
      projRows.push(`<div class="prep-row ${bdOk ? '' : 'no'}" style="cursor:default">
        <span>🔩 ${t('bunker.backdoorFound')}</span>
        <span class="p-cost">${costLabel(BAL.economy.bunkerBackdoorCost)}</span>
        <button class="pixel-btn" data-bproj="backdoor" ${bdOk ? '' : 'disabled'} style="margin-left:6px">${t('bunker.backdoorBtn')}</button>
      </div>`);
    } else if (state.bunkerBackdoor) {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>🔩 ${t('bunker.backdoorBtn')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    bunkerHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">🛖 ${LName(SHELTERS.bunker)}</div>${projRows.join('')}`;
  }
  // 대형 프로젝트 (1.1 ARC-02) — 현재 조건을 만족하는 프로젝트 카드. 진행 게이지(투입/필요) + 남은 자재 req-chip.
  let projHtml = '';
  const availProjects = Object.keys(PROJECTS).filter(pid => projectAvailable(pid));
  if (availProjects.length) {
    const cards = availProjects.map(pid => {
      const p = PROJECTS[pid];
      const rec = projectRec(pid);
      const done = projectDone(pid);
      const nStages = p.stages.length;
      const totalNeed = p.stages.reduce((a, s) => a + s.need, 0);
      const investedTotal = p.stages.slice(0, rec.stage).reduce((a, s) => a + s.need, 0) + (done ? 0 : rec.invested);
      const pct = Math.round((investedTotal / totalNeed) * 100);
      if (done) {
        return `<div class="prep-row sel" style="cursor:default">
          <span>${p.icon} ${t('proj.' + pid + '.name')}</span>
          <span class="p-eff" style="font-size:10px">${t('proj.done')}</span>
          <span style="color:var(--good);font-size:11px">${t('craft.installed')}</span>
        </div>`;
      }
      const st = p.stages[rec.stage];
      const cost = BAL.projects[st.costKey];
      // 남은 자재 대조 칩 (이주 UX req-chip 재사용): 이번 stage 남은 투입 횟수 × 회당 자재. (B-④) 공통 렌더러.
      const remaining = st.need - rec.invested;
      const chips = reqChips(cost);
      const ok = resHasAll(cost);
      return `<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default;flex-wrap:wrap">
        <span>${p.icon} ${t('proj.' + pid + '.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('proj.stageOf', { cur: rec.stage + 1, total: nStages })} · ${t('proj.progress', { pct, inv: investedTotal, need: totalNeed })}</span>
        <span class="req-chips" style="display:inline-flex;gap:4px">${chips}</span>
        <button class="pixel-btn" data-proj="${pid}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('proj.workBtn')}</button>
        <div style="flex-basis:100%;font-size:10px;color:var(--text-dim);margin-top:2px">${t('proj.' + pid + '.stage' + (rec.stage + 1))} <span style="opacity:.7">(${t('proj.stageRemain', { n: remaining })})</span></div>
      </div>`;
    }).join('');
    projHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">🏗️ ${t('proj.header')}</div><div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('proj.intro')}</div>${cards}`;
  }
  // 옥탑 슬레이트 보수 프로젝트 (#53) — 옥탑에서만. 빠진 슬레이트 2장 채우기(건축재 1). 벙커 천장과 동일 문법.
  let rooftopHtml = '';
  if (state.current === 'rooftop') {
    const slate = state.rooftopSlate || 'gapped';
    const projRows = [];
    if (slate !== 'full') {
      const ok = resHasAll(BAL.economy.rooftopSlateCost);
      projRows.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>🪨 ${t('rooftop.slateTitle')}</span>
        <span class="p-eff" style="font-size:10px">${t('rooftop.slateGapped')}</span>
        <span class="p-cost">${costLabel(BAL.economy.rooftopSlateCost)}</span>
        <button class="pixel-btn" data-rproj="slate" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('rooftop.slateBtn')}</button>
      </div>`);
    } else {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>🪨 ${t('rooftop.slateTitle')}</span><span class="p-eff" style="font-size:10px">${t('rooftop.slateFull')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    rooftopHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">🏙️ ${LName(SHELTERS.rooftop)}</div>${projRows.join('')}`;
  }
  // 1.2 지하철 허브 — 승격(핸드카·노선도 복원) → 선로 복구·암시장 개방. subway에서만 노출.
  let subwayHtml = '';
  if (state.current === 'subway') {
    let rows = '';
    if (!state.subwayHub) {
      // 허브 승격 카드
      const hubOk = resHasAll(BAL.subway.hubCost);
      rows += `<div class="prep-row ${hubOk ? '' : 'no'}" style="cursor:default">
        <span>🚇 ${t('subway.hubTitle')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('subway.hubDesc')}</span>
        <span class="p-cost">${costLabel(BAL.subway.hubCost)}</span>
        <button class="pixel-btn" data-subway="hub" ${hubOk ? '' : 'disabled'} style="margin-left:6px">${t('subway.hubBtn')}</button>
      </div>`;
    } else {
      rows += `<div class="prep-row sel" style="cursor:default"><span>🚇 ${t('subway.hubTitle')}</span><span class="p-eff" style="font-size:10px">${t('subway.hubDone')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`;
      // 암시장 교환대 (승격 후) — 얼굴 없는 교환대. 슬롯/레이트는 개통 구간 수로 개선.
      const left = marketSlotsLeft();
      const total = marketSlots();
      const segN = subwayOpenCount();
      rows += `<div style="font-size:11px;color:var(--accent);margin:10px 0 3px">🕳️ ${t('subway.marketTitle')} <span style="color:var(--text-dim)">${t('subway.marketSlots', { left, total })}</span></div>`;
      rows += `<div style="font-size:10px;color:var(--text-dim);margin-bottom:5px">${t('subway.marketIntro')}${segN > 0 ? ' ' + t('subway.marketRateNote', { n: segN }) : ''}</div>`;
      for (const offer of BAL.subway.marketOffers) {
        const cost = marketOfferCost(offer);
        const getN = marketOfferGetN(offer);
        const ok = left > 0 && resHasAll(cost);
        const winterTag = (seasonOf().id === 'winter' && offer.winterGive) ? ` <span style="color:var(--bad);font-size:9px">${t('subway.marketWinter')}</span>` : '';
        rows += `<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
          <span>${costLabel(cost)} → ${resIcon(offer.get)}×${getN}${winterTag}</span>
          <button class="pixel-btn" data-market="${offer.id}" ${ok ? '' : 'disabled'} style="margin-left:auto">${t('subway.marketTradeBtn')}</button>
        </div>`;
      }
    }
    subwayHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">🚇 ${LName(SHELTERS.subway)}</div>${rows}`;
  }
  // 1.1 얼음낚시 — 겨울 한정, 물가 셸터(예인선/여객선/등대). 겨울이 처음으로 '받는 계절'이 되는 장치.
  let icefishHtml = '';
  if (icefishAvailable()) {
    const H = BAL.harbor;
    const spots = 1 + (state.breakwaterHut ? 1 : 0); // 방파제 오두막: 스팟 +1
    const used = state.icefishToday || 0;
    const left = Math.max(0, spots - used);
    const canEnergy = state.energy >= H.icefishEnergy && !isExhausted();
    const ok = left > 0 && canEnergy;
    icefishHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">🎣 ${t('icefish.title')}</div>
      <div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>🎣 ${t('icefish.action')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('icefish.hint', { e: H.icefishEnergy, spots, left })}</span>
        <button class="pixel-btn" id="btn-icefish" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('icefish.go')}</button>
      </div>`;
  }
  // 1.4 금지 구역 — 방호복(제작/수리) + 무전 송출. 금지 구역 노출선 도달 후 또는 이미 방호복/기지가 있으면 노출.
  let forbiddenHtml = '';
  const forbiddenReached = state.successes >= BAL.forbidden.unlockAt || state.hazmatDone || state.radioBaseDone;
  if (forbiddenReached) {
    const F = BAL.forbidden;
    const rows2 = [];
    // 방호복 제작/수리 카드
    if (!state.hazmat) {
      const ok = resHasAll(F.hazmatCost);
      rows2.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>🥽 ${t('hazmat.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('hazmat.craftHint', { dur: F.hazmatDur })}</span>
        <span class="p-cost">${costLabel(F.hazmatCost)}</span>
        <button class="pixel-btn" data-hazmat="craft" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('hazmat.craftBtn')}</button>
      </div>`);
    } else {
      const full = state.hazmat.dur >= F.hazmatDur;
      const ok = resHasAll(F.hazmatRepairCost);
      rows2.push(`<div class="prep-row ${full ? 'sel' : ''}" style="cursor:default">
        <span>🥽 ${t('hazmat.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('hazmat.durLine', { dur: state.hazmat.dur, max: F.hazmatDur })}</span>
        ${full
          ? `<span style="color:var(--good);font-size:11px">${t('hazmat.ready')}</span>`
          : `<span class="p-cost">${costLabel(F.hazmatRepairCost)}</span><button class="pixel-btn" data-hazmat="repair" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('hazmat.repairBtn')}</button>`}
      </div>`);
    }
    // 무전 송출 카드 (기지 완공 후)
    if (state.radioBaseDone) {
      const total = broadcastableTotal();
      const sent = broadcastSentCount();
      const allSent = total > 0 && sent >= total;
      const canEnergy = state.energy >= F.broadcastEnergy && !isExhausted();
      const ok = !allSent && total > 0 && canEnergy;
      rows2.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>📡 ${t('radio.broadcastName')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('radio.broadcastHint', { e: F.broadcastEnergy, sent, total, lit: state.survivorLights || 0 })}</span>
        <button class="pixel-btn" id="btn-broadcast" ${ok ? '' : 'disabled'} style="margin-left:6px">${allSent ? t('radio.allSentBtn') : t('radio.broadcastBtn')}</button>
      </div>`);
    }
    forbiddenHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">☢️ ${LName(DISTRICTS.research)}</div><div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('forbidden.intro')}</div>${rows2.join('')}`;
  }
  // 꾸미기(#13): 벽지/바닥재 스와치. 현재 셸터의 벽/바닥 재질을 교체 (셸터 지오메트리 불변).
  const dcur = currentDeco();
  const decoSwatches = (kind, table, sel) => Object.entries(table).map(([id, def]) => {
    const active = (sel || 'default') === id;
    const owned = active || !def.cost || resHasAll(def.cost);
    const costTip = def.cost ? costLabel(def.cost) : t('deco.free');
    return `<button class="pixel-btn ${active ? 'primary' : ''}" data-deco="${kind}:${id}" ${owned || active ? '' : 'disabled'}
      title="${LName(def)} · ${costTip}" style="margin:2px;padding:4px 6px;font-size:11px">${def.emoji} ${LName(def)}${active ? ' ✓' : (def.cost ? ` <span style="opacity:.6">${costTip}</span>` : '')}</button>`;
  }).join('');
  const themeHtml = THEME_SETS.map(ts => {
    const done = themeSetActive(ts);
    return `<div class="prep-row ${done ? 'sel' : ''}" style="cursor:default">
      <span>${ts.emoji} ${LName(ts)}</span>
      <span class="p-eff" style="font-size:10px">${ts.items.map(id => DEFS[id].emoji).join('')} → ${t('deco.themeBonus', { n: DECO_THEME_COMFORT })}</span>
      <span style="color:${done ? 'var(--good)' : 'var(--text-dim)'};font-size:11px;margin-left:6px">${done ? t('deco.themeDone') : t('deco.themeTodo')}</span>
    </div>`;
  }).join('');
  const decoHtml = `
    <div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('deco.header')}</div>
    <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('deco.intro')}</div>
    <div style="font-size:11px;margin-bottom:3px">${t('deco.wall')}</div>${sh.noWallpaper
      ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;padding:6px 8px;border:1px dashed var(--border);border-radius:4px">${t('deco.noWall')}</div>`
      : `<div style="display:flex;flex-wrap:wrap;margin-bottom:8px">${decoSwatches('wall', WALLPAPERS, dcur.wall)}</div>`}
    <div style="font-size:11px;margin-bottom:3px">${t('deco.floor')}</div><div style="display:flex;flex-wrap:wrap;margin-bottom:8px">${decoSwatches('floor', FLOORINGS, dcur.floor)}</div>
    <div style="font-size:11px;color:var(--accent);margin:8px 0 4px">${t('deco.themeHeader')}</div>${themeHtml}`;
  openModal(t('craft.title'), `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${t('craft.intro')}</div>${rows}
    <div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('craft.modHeader', { emoji: sh.emoji, name: LName(sh) })}</div>
    <div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">${t('craft.modIntro')}</div>${modRows || `<div style="font-size:11px;color:var(--text-dim)">${t('craft.noMods')}</div>`}
    ${bunkerHtml}${rooftopHtml}${subwayHtml}${icefishHtml}${forbiddenHtml}${projHtml}${decoHtml}`);
  $('modal-body').querySelectorAll('button[data-deco]').forEach(b =>
    b.addEventListener('click', () => {
      const [kind, id] = b.dataset.deco.split(':');
      applyDecoChoice(kind, id);
    }));
  $('modal-body').querySelectorAll('button[data-rproj]').forEach(b =>
    b.addEventListener('click', () => {
      if (b.dataset.rproj === 'slate') {
        if (!resConsumeAll(BAL.economy.rooftopSlateCost)) { toast(t('toast.needMaterial')); return; }
        state.rooftopSlate = 'full';
        toast(t('rooftop.slateDone')); state.dayLog.notes.push(t('rooftop.slateDone'));
        // 지붕 지오메트리를 다시 짓는다 (가구 보존 — 벙커 재빌드와 동일 패턴)
        state.layouts.rooftop = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1 }));
        loadShelter('rooftop');
        closeModal();
        playSfx('craft'); scheduleSave(); renderResBar(); updateHud();
      }
    }));
  $('modal-body').querySelectorAll('button[data-bproj]').forEach(b =>
    b.addEventListener('click', () => {
      const act = b.dataset.bproj;
      if (act === 'roof1') {
        if (!resConsumeAll(BAL.economy.bunkerRoofStage1)) { toast(t('toast.needMaterial')); return; }
        state.bunkerRoof = 'temp';
        toast(t('bunker.roofDoneStage1')); state.dayLog.notes.push(t('bunker.roofDoneStage1'));
      } else if (act === 'roof2') {
        if (!resConsumeAll(BAL.economy.bunkerRoofStage2)) { toast(t('toast.needMaterial')); return; }
        state.bunkerRoof = 'full';
        toast(t('bunker.roofDoneStage2')); state.dayLog.notes.push(t('bunker.roofDoneStage2'));
        rebuildBunkerGeometry(); playSfx('craft');
        scheduleSave(); renderResBar(); updateHud();
        return; // 지오메트리 재빌드가 모달을 닫는다
      } else if (act === 'backdoor') {
        if (!resConsumeAll(BAL.economy.bunkerBackdoorCost)) { toast(t('toast.needMaterial')); return; }
        state.bunkerBackdoor = true;
        toast(t('bunker.backdoorDone')); state.dayLog.notes.push(t('bunker.backdoorDone'));
        rebuildBunkerGeometry(); playSfx('craft');
        scheduleSave(); renderResBar(); updateHud();
        return;
      }
      playSfx('craft');
      scheduleSave(); renderResBar(); updateHud();
      openCraftModal();
    }));
  $('modal-body').querySelectorAll('button[data-proj]').forEach(b =>
    b.addEventListener('click', () => {
      const pid = b.dataset.proj;
      const r = investProject(pid);
      if (!r) return; // 자재 부족 등 — investProject가 토스트 처리
      state.stats.craft = (state.stats.craft || 0) + 1; // 공사도 "손을 쓴 일"로 집계 (제작 통계 재사용)
      if (r === 'done') {
        toast(t('proj.' + pid + '.doneToast'));
        state.dayLog.notes.push(t('proj.' + pid + '.doneToast'));
      } else if (r === 'stage') {
        toast(t('proj.stageDone'));
        state.dayLog.notes.push(t('proj.' + pid + '.workNote'));
      } else {
        toast(t('proj.worked'));
        state.dayLog.notes.push(t('proj.' + pid + '.workNote'));
      }
      playSfx('craft');
      scheduleSave(); renderResBar(); updateHud();
      // investProject가 벙커 재빌드로 모달을 닫았을 수 있음 → 열려 있을 때만 갱신
      if ($('modal-back').classList.contains('show')) openCraftModal();
    }));
  { const ibf = $('btn-icefish'); if (ibf) ibf.addEventListener('click', () => { doIceFish(); openCraftModal(); }); }
  // 1.4 방호복 제작/수리
  $('modal-body').querySelectorAll('button[data-hazmat]').forEach(b =>
    b.addEventListener('click', () => {
      const act = b.dataset.hazmat;
      const done = act === 'craft' ? craftHazmat() : repairHazmat();
      if (done) openCraftModal();
    }));
  // 1.4 무전 송출 (기지 완공 후) — 수집 방송/기록 1개 송출 → 지도 불빛 점등
  { const bb = $('btn-broadcast'); if (bb) bb.addEventListener('click', () => { if (doBroadcast()) openCraftModal(); }); }
  // 1.2 지하철 허브 승격 버튼
  $('modal-body').querySelectorAll('button[data-subway]').forEach(b =>
    b.addEventListener('click', () => {
      if (b.dataset.subway === 'hub') {
        if (!resConsumeAll(BAL.subway.hubCost)) { toast(t('toast.needMaterial')); return; }
        state.subwayHub = true;
        toast(t('subway.hubDoneToast')); state.dayLog.notes.push(t('subway.hubDoneToast'));
        playSfx('craft'); scheduleSave(); renderResBar(); updateHud();
        openCraftModal();
      }
    }));
  // 1.2 암시장 교환 버튼
  $('modal-body').querySelectorAll('button[data-market]').forEach(b =>
    b.addEventListener('click', () => {
      if (doMarketTrade(b.dataset.market)) openCraftModal();
    }));
  $('modal-body').querySelectorAll('button[data-craft]').forEach(b =>
    b.addEventListener('click', () => {
      const c = CRAFTS[+b.dataset.craft];
      if (c.out.outfit && (state.outfits || ['default']).includes(c.out.outfit)) return; // #86④ 이중 방어(버튼은 이미 숨김)
      if (!resConsumeAll(c.cost)) { toast(t('toast.needMaterial')); return; }
      let craftEmoji;
      if (c.out.res) {
        resAdd(c.out.res, c.out.n);
        craftEmoji = RESOURCES[c.out.res].emoji;
        toast(t('craft.doneRes', { emoji: craftEmoji, name: LName(RESOURCES[c.out.res]), n: c.out.n }));
      } else if (c.out.outfit) {
        // #86④ 의류: 옷장에 영구 추가 + 바로 갈아입기 (만든 옷을 그 자리에서 입는 게 손맛)
        state.outfits = state.outfits || ['default'];
        state.outfits.push(c.out.outfit);
        state.outfit = c.out.outfit;
        avatarSys.refreshOutfit();
        craftEmoji = OUTFITS[c.out.outfit].emoji;
        toast(t('craft.doneOutfit', { name: LName(OUTFITS[c.out.outfit]) }));
      } else {
        state.inventory[c.out.furn] = (state.inventory[c.out.furn] || 0) + 1;
        craftEmoji = DEFS[c.out.furn].emoji;
        toast(t('craft.doneFurn', { emoji: craftEmoji, name: LName(DEFS[c.out.furn]) }));
        renderInventoryBar();
      }
      state.stats.craft = (state.stats.craft || 0) + 1;
      state.dayLog.notes.push(t('craft.noteRes', { name: c.out.res ? LName(RESOURCES[c.out.res]) : c.out.outfit ? LName(OUTFITS[c.out.outfit]) : LName(DEFS[c.out.furn]) }));
      questProgress('craft');
      scheduleSave();
      renderResBar();
      // #86④ 의류는 망치질 대신 천 스치는 소리 (디렉터 오더 — 갈아입기와 동일 결)
      if (c.out.outfit) playSfx('whoosh', { rate: 0.72, vol: 0.5, jitter: 0.06 });
      else playSfx('craft');
      spawnCraftFx(craftEmoji); // ④ 제작 손맛: 결과물 아이콘 떠오름 + 반짝임
      if (c.out.outfit) openCraftModal(); // #86④: 보유 배지 즉시 반영 (재제작 버튼 잔류 방지)
      openCraftModal(); // 갱신
    }));
  $('modal-body').querySelectorAll('button[data-mod]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.mod;
      const m = SHELTER_MODS[id];
      if (hasMod(id)) return;
      if (!resConsumeAll(m.cost)) { toast(t('toast.needMaterial')); return; }
      if (!state.mods) state.mods = {};
      if (!state.mods[state.current]) state.mods[state.current] = [];
      state.mods[state.current].push(id);
      toast(t('craft.modDone', { emoji: m.emoji, name: LName(m) }));
      state.dayLog.notes.push(t('craft.modNote', { name: LName(m) }));
      if (id === 'extension') {
        // 방 구조가 바뀌므로 거처를 다시 짓는다
        state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1 }));
        loadShelter(state.current);
        closeModal();
      } else {
        addModProp(id);
        openCraftModal();
      }
      shadowDirty();
      scheduleSave();
      renderResBar();
      updateHud();
    }));
}

// 벙커 지오메트리 재빌드 (#36) — 천장 수리/뒷문 상태를 반영해 방을 다시 짓는다 (extension 개조와 동일 패턴).
function rebuildBunkerGeometry() {
  if (state.current !== 'bunker') return;
  state.layouts.bunker = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1 }));
  loadShelter('bunker');
  closeModal();
  shadowDirty();
}
// 1.1: 현재 셸터 지오메트리 재빌드 (현장 오브젝트 단계 교체용, 벙커 외 항구 셸터). 배치 보존 후 loadShelter.
function rebuildShelterGeometry() {
  const id = state.current;
  state.layouts[id] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1 }));
  loadShelter(id);
  closeModal();
  shadowDirty();
}

/* ============================================================
   대형 프로젝트 엔진 (1.1 ARC-02) — 범용. 콘텐츠는 projects.js PROJECTS 테이블.
   state.projects[id] = { stage, invested }. 여러 날 자재를 붓는 장기 목표.
   1.2~1.4는 PROJECTS 항목 + BAL.projects 비용 + proj.* i18n + site 3D만 추가한다(이 코드 무수정).
============================================================ */
// 프로젝트가 지금 노출 조건을 만족하는가 (EVENTS.when 스키마 부분집합 + needsFlag).
function projectAvailable(id) {
  const p = PROJECTS[id];
  if (!p) return false;
  const w = p.when;
  if (w) {
    if (w.shelters && !w.shelters.includes(state.current)) return false;
    if (w.districts && !w.districts.includes(districtRegionOf(state.current))) return false;
    if (w.seasons && !w.seasons.includes(seasonOf().id)) return false;
    if (w.minDay != null && state.day < w.minDay) return false;
    if (w.needsMod && !hasMod(w.needsMod)) return false;
    if (w.needsFlag && !state[w.needsFlag]) return false; // state 불리언 게이트 (예: bunkerBackdoor)
  }
  return true;
}
// 진행 레코드 (없으면 미착수 기본값). 완공 판정은 stage >= stages.length.
function projectRec(id) {
  return state.projects?.[id] || { stage: 0, invested: 0 };
}
function projectDone(id) {
  const p = PROJECTS[id]; if (!p) return false;
  return projectRec(id).stage >= p.stages.length;
}
// 현재 현장 오브젝트 단계 (SHELTER 3D 표현이 읽는다). 완공=doneSiteStage, 진행중=현 stage의 siteStage, 미착수=0.
function projectSiteStage(id) {
  const p = PROJECTS[id]; if (!p) return 0;
  const rec = projectRec(id);
  if (rec.stage >= p.stages.length) return p.doneSiteStage;
  const st = p.stages[rec.stage];
  return st ? st.siteStage : 0;
}
// stage 완료 시 효과 적용. 효과는 데이터 키로 분기 — 실제 효과는 여기 switch에 등록.
// 파일럿(clearPassage.done)은 코스메틱 전용이라 상태 부수효과 없음(현장 오브젝트 교체 + 수첩 기록이 곧 보상).
function applyProjectEffect(effectKey) {
  if (!effectKey) return;
  switch (effectKey) {
    // 1.1 파일럿 통로 정리 완공 — 1.4에서 복선 회수: 금지 구역에 닿은 뒤라면 이 통로가 연구동 지하로 이어짐이 드러난다.
    case 'clearPassage.done':
      if (state.hazmatDone || state.successes >= BAL.forbidden.unlockAt) state.dayLog.notes.push(t('proj.clearPassage.revealNote'));
      break;
    case 'harbor.breakwater.done': state.breakwaterHut = true; break; // 항구 파밍 -25% + 얼음낚시 스팟 +1 (플래그로 판정)
    // 1.2 선로 개통 — 구간별 연결 지역을 개통 상태로. 탐험 시간 -50% + 겨울 폭설 봉쇄 무시(플래그 판정).
    case 'subway.openSeg1': openSubwaySegment(1); break;
    case 'subway.openSeg2': openSubwaySegment(2); break;
    case 'subway.openSeg3': openSubwaySegment(3); break;
    // 1.3 케이블카 완공 — 고원(리조트) 접근/탐험 시간 단축(플래그 판정, expDuration이 읽음).
    case 'resort.accessTime': state.cablecarDone = true; break;
    // 1.3 관측소 완공 — 맑은 밤 밤하늘 이벤트 개방(플래그 판정, processDay 밤하늘 롤이 읽음).
    case 'lodge.nightSky': state.observatoryDone = true; break;
    // 1.4 무전 기지 완공 — 송출 행동 개방(플래그 판정, 송출 UI/지도 불빛이 읽음). 주제 회수의 스위치.
    case 'radio.broadcastAction': state.radioBaseDone = true; break;
    default: break; // 1.2~1.4 확장이 여기에 case를 추가한다.
  }
}
// 1.2 선로 구간 개통: 해당 구간이 연결하는 지역을 state.subwayOpen 에 등록.
// 이후 expDuration(-50%)·폭설 봉쇄 예외·암시장 슬롯/레이트가 이 맵을 읽는다.
function openSubwaySegment(seg) {
  if (!state.subwayOpen || typeof state.subwayOpen !== 'object') state.subwayOpen = {};
  const region = BAL.subway.segRegions[seg];
  if (region) state.subwayOpen[region] = true;
}
// 개통 구간 수 (암시장 슬롯/레이트 스케일링에 쓰인다).
function subwayOpenCount() {
  return Object.keys(state.subwayOpen || {}).length;
}
// 특정 지역이 지하 노선으로 개통되어 있는가 (탐험 시간·봉쇄 예외 판정).
function subwayReaches(regionId) {
  return !!(state.subwayOpen && state.subwayOpen[regionId]);
}

/* ── 1.4 「금지 구역」 방호복 / 무전 송출 ──
   방호복(hazmat): 고급 제작 정점. 금지 구역(forbidden) 지역 진입 게이트 + 탐험 1회당 내구 소모.
   무전 송출: 완공된 무전 기지에서 수집 방송/기록을 송출 → 종이 지도에 생존자 불빛 점등(수집률 비례).
   주제 회수: "내가 지킨 온기가 신호가 되어 퍼진다" — 불빛은 만남이 아니라 응답하는 먼 창문(타인은 흐른다). */
// 특정 지역이 금지 구역(방호복 필수)인가.
function isForbiddenRegion(regionId) {
  return !!REGIONS[regionId]?.forbidden;
}
// 방호복을 입을 수 있는 상태인가 (제작됐고 내구가 남았는가).
function hazmatUsable() {
  return !!(state.hazmat && state.hazmat.dur > 0);
}
// 방호복 제작 — 고급 제작 정점. 재료 소비 후 최대 내구로 지급. 최초 제작 시 hazmatDone(무전 기지 공사 게이트) 세움.
function craftHazmat() {
  if (state.hazmat && state.hazmat.dur >= BAL.forbidden.hazmatDur) { toast(t('hazmat.alreadyFull')); return false; }
  if (!resConsumeAll(BAL.forbidden.hazmatCost)) { toast(t('toast.needMaterial')); return false; }
  const firstTime = !state.hazmatDone;
  state.hazmat = { dur: BAL.forbidden.hazmatDur };
  state.hazmatDone = true; // 방호복에 손댄 순간부터 무전 기지 공사가 열린다(금지 구역에 닿을 자격)
  state.dayLog.notes.push(t('hazmat.craftedNote'));
  toast(t('hazmat.crafted', { dur: BAL.forbidden.hazmatDur }) + (firstTime ? '\n' + t('hazmat.firstHint') : ''));
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 방호복 수리 — 닳은 내구를 전량 회복. 재료 소비.
function repairHazmat() {
  if (!state.hazmat) { toast(t('hazmat.needCraft')); return false; }
  if (state.hazmat.dur >= BAL.forbidden.hazmatDur) { toast(t('hazmat.alreadyFull')); return false; }
  if (!resConsumeAll(BAL.forbidden.hazmatRepairCost)) { toast(t('toast.needMaterial')); return false; }
  state.hazmat.dur = BAL.forbidden.hazmatDur;
  toast(t('hazmat.repaired', { dur: BAL.forbidden.hazmatDur }));
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 금지 구역 탐험 1회당 방호복 내구 -1 (resolveExpedition에서 호출). 다 닳으면 다음 진입이 차단된다.
function wearHazmat() {
  if (!state.hazmat) return;
  state.hazmat.dur = Math.max(0, state.hazmat.dur - 1);
}
// 송출 대상 = 수집한 방송(broadcasts) + 기록(memos) 통합 풀. "수집한 방송/기록을 송출"(GD).
//   전체 송출 가능 총량(수집한 것 전부)과 이미 송출한 수를 센다.
function broadcastableTotal() {
  return Object.keys(state.broadcasts || {}).length + Object.keys(state.memos || {}).length;
}
function broadcastSentCount() {
  return Object.keys(state.broadcasts_sent || {}).length;
}
// 아직 송출하지 않은 수집물 id 1개 (방송 우선, 없으면 기록). 없으면 null.
function pickUnsentSignal() {
  const sent = state.broadcasts_sent || {};
  const bun = Object.keys(state.broadcasts || {}).filter(id => !sent['b_' + id]);
  if (bun.length) return { key: 'b_' + bun[0], kind: 'broadcast', id: bun[0] };
  const mun = Object.keys(state.memos || {}).filter(id => !sent['m_' + id]);
  if (mun.length) return { key: 'm_' + mun[0], kind: 'memo', id: mun[0] };
  return null;
}
// 지도에 켜져야 할 목표 불빛 수 = (송출한 신호 / 송출 가능 총량) × 최대 불빛. 수집률 비례로 번진다.
//   최대 불빛 수는 종이 지도가 감당할 밀도(MAP_LIGHT_MAX). 총량 0이면 0.
const MAP_LIGHT_MAX = 12; // 종이 지도 오버레이 최대 불빛 점(응답하는 먼 창문들)
function targetSurvivorLights() {
  const total = broadcastableTotal();
  const sent = broadcastSentCount();
  if (total <= 0 || sent <= 0) return 0;
  const ratio = Math.min(1, sent / total);
  // 송출한 신호가 하나라도 있으면 최소 1개는 응답한다(먼 창문). 이후 수집률 비례로 번진다(ceil로 촘촘히).
  return Math.max(1, Math.ceil(ratio * MAP_LIGHT_MAX));
}
// 송출 행동 — 미송출 신호 1개를 송출. 에너지 소모. 지도 불빛 목표 갱신 후 점등. 모든 신호 송출 시 박사 정기 교신 개방.
function doBroadcast() {
  if (isWallpaper()) { toast(t('wallpaper.noAction')); return false; }
  if (!state.radioBaseDone) { toast(t('radio.needBase')); return false; }
  if (state.energy < BAL.forbidden.broadcastEnergy) { toast(t('toast.tooTired')); return false; }
  const sig = pickUnsentSignal();
  if (!sig) { toast(t('radio.allSent')); return false; }
  if (!state.broadcasts_sent) state.broadcasts_sent = {};
  state.broadcasts_sent[sig.key] = state.day;
  state.energy = Math.max(0, state.energy - BAL.forbidden.broadcastEnergy);
  // 불빛 목표 갱신 → 실제 점등(하나 이상 늘면 "먼 창문이 응답했다").
  const before = state.survivorLights || 0;
  const target = targetSurvivorLights();
  state.survivorLights = Math.max(before, target); // 켜진 불빛은 꺼지지 않는다(온기는 남는다)
  const lit = state.survivorLights - before;
  const note = lit > 0 ? t('radio.sentLit', { n: state.survivorLights }) : t('radio.sentNoLit');
  state.dayLog.notes.push(note);
  toast(note);
  playSfx('craft');
  // 모든 수집물을 송출했다면 박사 정기 교신 개방(다음 밤 무전 — Day10000 다리). 미본 상태에서만 예약.
  if (!pickUnsentSignal() && !state.doctorRegularSeen) state.doctorRadioRegularPending = true;
  scheduleSave(); renderResBar(); updateHud();
  // 지도가 열려 있으면 불빛 오버레이 즉시 갱신(맵 모달은 매 열 때 재구성되므로, 열려 있을 때만 다시 그린다).
  if ($('map-wrap')) renderSurvivorLights($('map-wrap'));
  return true;
}

/* ── 1.2 암시장 (허브 승격 후 개방) — 잉여 물물교환 = 후반 인플레의 최종 싱크 ──
   캐논: 화폐 없음(문명은 죽었다, 교환만 남았다). 상인도 흐르는 타인 — 얼굴 없는 교환대/쪽지 거래.
   하루 슬롯 제한(marketToday) + 개통 구간 수로 슬롯·레이트 개선. 겨울 연료 프리미엄(winterGive). */
function marketOpen() { return state.current === 'subway' && state.subwayHub; }
function marketSlots() {
  return BAL.subway.marketBaseSlots + subwayOpenCount() * BAL.subway.marketSlotsPerSeg;
}
function marketSlotsLeft() { return Math.max(0, marketSlots() - (state.marketToday || 0)); }
// 한 오퍼의 실제 지불 비용(겨울 프리미엄 반영)과 산출량(개통 구간 레이트 보너스 반영).
function marketOfferCost(offer) {
  return (seasonOf().id === 'winter' && offer.winterGive) ? offer.winterGive : offer.give;
}
function marketOfferGetN(offer) {
  return offer.getN + subwayOpenCount() * BAL.subway.marketRateBonusPerSeg;
}
// 교환 실행 — 슬롯/자원 검사 후 give 소비, get 지급. 반환: true(성공)|false(실패).
function doMarketTrade(offerId) {
  if (!marketOpen()) return false;
  if (marketSlotsLeft() <= 0) { toast(t('subway.marketNoSlot')); return false; }
  const offer = BAL.subway.marketOffers.find(o => o.id === offerId);
  if (!offer) return false;
  const cost = marketOfferCost(offer);
  if (!resHasAll(cost)) { toast(t('toast.needResource')); return false; }
  if (!resConsumeAll(cost)) { toast(t('toast.needResource')); return false; }
  const n = marketOfferGetN(offer);
  resAdd(offer.get, n);
  state.marketToday = (state.marketToday || 0) + 1;
  const note = t('subway.marketTraded', { give: costLabel(cost), emoji: RESOURCES[offer.get].emoji, name: LName(RESOURCES[offer.get]), n });
  state.dayLog.notes.push(note);
  toast(note);
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 프로젝트 완공 시 수첩 "그 해의 공사" 자동 기록 (memoir 문법 재사용 — pendingWinterMemoir 큐에 적재).
function recordProjectMemoir(id) {
  const p = PROJECTS[id]; if (!p || !p.memoirKey) return;
  if (!Array.isArray(state.pendingWinterMemoir)) state.pendingWinterMemoir = [];
  state.pendingWinterMemoir.push({
    titleId: 'proj.memoir.title',
    bodyId: p.memoirKey,
    bodyArgs: { day: state.day },
  });
}
// 자재 1회 투입 → invested++. stage 완료 시 효과+현장 갱신+(완공 시)수첩 기록. 반환: 'invested'|'stage'|'done'|false.
function investProject(id) {
  const p = PROJECTS[id];
  if (!p || !projectAvailable(id) || projectDone(id)) return false;
  const rec = state.projects[id] || { stage: 0, invested: 0 };
  const st = p.stages[rec.stage];
  const cost = BAL.projects[st.costKey];
  if (!resConsumeAll(cost)) { toast(t('toast.needMaterial')); return false; }
  rec.invested++;
  state.projects[id] = rec;
  let result = 'invested';
  if (rec.invested >= st.need) {
    // stage 완료
    applyProjectEffect(st.effectKey);
    rec.stage++;
    rec.invested = 0;
    result = 'stage';
    if (rec.stage >= p.stages.length) {
      // 프로젝트 완공
      recordProjectMemoir(id);
      result = 'done';
    }
  }
  // 현장 오브젝트가 현재 셸터 지오메트리에 있으면 재빌드로 단계 교체 (현재 셸터 한정).
  if (p.site === 'stairRubble' && state.current === 'bunker') rebuildBunkerGeometry();
  else if (p.site === 'breakwaterHut' && (state.current === 'tugboat' || state.current === 'controltower')) rebuildShelterGeometry();
  else if (p.site === 'railSegment' && state.current === 'subway') rebuildShelterGeometry(); // 1.2 선로 구간 현장 단계 교체
  return result;
}

/* ── 1.1 얼음낚시 (겨울 전용, 물가 셸터) ──
   겨울이 처음으로 '받는 계절'이 되는 장치. 예인선/여객선/등대에서만, 하루 스팟 수만큼(+방파제 1).
   에너지·시간 소모 후 신선식품 1~3 + 확률로 소금 + 극저확률 "이상한 병"(메모 드랍). 전부 BAL.harbor. */
const ICEFISH_SHELTERS = ['tugboat', 'ship', 'lighthouse'];
function icefishAvailable() {
  return seasonOf().id === 'winter' && ICEFISH_SHELTERS.includes(state.current);
}
function doIceFish() {
  if (!icefishAvailable()) return false;
  const H = BAL.harbor;
  const spots = 1 + (state.breakwaterHut ? 1 : 0);
  if ((state.icefishToday || 0) >= spots) { toast(t('icefish.noSpot')); return false; }
  if (state.energy < H.icefishEnergy || isExhausted()) { toast(t('toast.tooTired')); return false; }
  state.energy = Math.max(0, state.energy - H.icefishEnergy);
  state.gameMin += H.icefishTimeMin;
  state.icefishToday = (state.icefishToday || 0) + 1;
  const food = H.icefishFoodMin + Math.floor(Math.random() * (H.icefishFoodMax - H.icefishFoodMin + 1));
  resAdd('food', food);
  const notes = [t('icefish.caught', { n: food })];
  if (Math.random() < H.icefishSaltChance) { resAdd('salt', H.icefishSalt); notes.push(t('icefish.salt', { n: H.icefishSalt })); }
  if (Math.random() < H.icefishBottleChance) {
    const mid = dropMemo();
    if (mid) { state.pendingMemoPopup = { id: mid, will: false }; notes.push(t('icefish.bottle')); }
  }
  for (const nt of notes) state.dayLog.notes.push(nt);
  toast(notes[0]);
  playSfx('craft');
  state.stats.craft = (state.stats.craft || 0) + 1;
  scheduleSave(); renderResBar(); updateHud();
  return true;
}

/* ============================================================
   일지: 도감 · 업적 · 통계 (장기 동기부여 + Steam 업적 대비)
============================================================ */
function markCollection(defId, colorIdx) {
  if (!state.collection) state.collection = {};
  if (!state.collection[defId]) state.collection[defId] = [false, false, false, false];
  state.collection[defId][colorIdx] = true;
}
function collectionCount() {
  return Object.values(state.collection || {}).reduce((a, arr) => a + arr.filter(Boolean).length, 0);
}
const ACHS = [
  { id: 'first',     icon: '👣', name: '첫 발걸음',        nameEn: 'First Steps',        desc: '첫 탐험 성공',                descEn: 'First successful expedition',        chk: () => state.stats.success >= 1 },
  { id: 'exp10',     icon: '🎒', name: '베테랑 스캐빈저',  nameEn: 'Veteran Scavenger',  desc: '탐험 성공 10회',              descEn: '10 successful expeditions',          chk: () => state.stats.success >= 10 },
  { id: 'exp30',     icon: '🗺️', name: '폐허의 주인',      nameEn: 'Lord of the Ruins',  desc: '탐험 성공 30회',              descEn: '30 successful expeditions',          chk: () => state.stats.success >= 30 },
  { id: 'craft5',    icon: '🔨', name: '손재주',           nameEn: 'Handy',              desc: '제작 5회',                    descEn: 'Craft 5 times',                      chk: () => (state.stats.craft || 0) >= 5 },
  { id: 'craft20',   icon: '⚙️', name: '폐허의 장인',      nameEn: 'Ruins Artisan',      desc: '제작 20회',                   descEn: 'Craft 20 times',                     chk: () => (state.stats.craft || 0) >= 20 },
  { id: 'comfort90', icon: '🏡', name: '완벽한 안식처',    nameEn: 'Perfect Refuge',     desc: '쾌적함 90 달성',              descEn: 'Reach comfort 90',                   chk: () => comfortDetail().score >= 90 },
  { id: 'settled8',  icon: '🕯️', name: '정든 집',          nameEn: 'Settled Home',       desc: '한 거처에 8일 연속 거주',     descEn: 'Live 8 days straight in one shelter', chk: () => (state.stayDays || 0) >= 8 },
  { id: 'renov3',    icon: '🏠', name: '개척자',           nameEn: 'Pioneer',            desc: '거처 3곳 정비',               descEn: 'Refit 3 shelters',                   chk: () => Object.values(state.renovated || {}).filter(Boolean).length >= 3 },
  { id: 'renovAll',  icon: '🌍', name: '모든 곳이 집',     nameEn: 'Everywhere Is Home', desc: '거처 9곳 전부 정비',          descEn: 'Refit all 9 shelters',               chk: () => Object.values(state.renovated || {}).filter(Boolean).length >= 9 },
  { id: 'mods3',     icon: '🔧', name: '개조 기술자',      nameEn: 'Modder',             desc: '거처 개조 3개 설치',          descEn: 'Install 3 shelter mods',             chk: () => Object.values(state.mods || {}).flat().length >= 3 },
  { id: 'winter',    icon: '❄️', name: '첫 겨울을 넘다',   nameEn: 'Past the First Winter', desc: 'Day 48 도달 (사계절 생존)', descEn: 'Reach Day 48 (survive all seasons)', chk: () => state.day >= 48 },
  { id: 'nine_winters', icon: '❄️', name: '아홉 번째 겨울', nameEn: 'Nine Winters', desc: '아홉 번의 겨울을 넘기다', descEn: 'Weather nine winters', chk: () => (state.winters || 0) >= 9 },
  { id: 'col21',     icon: '📖', name: '수집가',           nameEn: 'Collector',          desc: '도감 25% (가구 색상 21종)',   descEn: 'Collection 25% (21 furniture colors)', chk: () => collectionCount() >= 21 },
  { id: 'col42',     icon: '🖼️', name: '큐레이터',         nameEn: 'Curator',            desc: '도감 50%',                    descEn: 'Collection 50%',                     chk: () => collectionCount() >= 42 },
  { id: 'colAll',    icon: '🏛️', name: '폐허의 박물관장',  nameEn: 'Museum Keeper of the Ruins', desc: '도감 100% (84색상)',   descEn: 'Collection 100% (84 colors)',        chk: () => collectionCount() >= 84 },
  { id: 'cat',       icon: '🐈', name: '고양이 집사',      nameEn: 'Cat Servant',        desc: '길고양이를 가족으로 맞이하다', descEn: 'Welcome a stray cat as family',      chk: () => !!state.cat },
  { id: 'ending',    icon: '🚁', name: '폐허 너머로',      nameEn: 'Beyond the Ruins',   desc: 'Day 10000 — 박사와 함께 탈출', descEn: 'Day 10000 — escape with the doctor', chk: () => !!state.endingSeen },
];
function checkAchievements() {
  if (QA_ED) return; // #89 QA 에디션: 업적 전면 no-op (Steam 중계 지점 원천 차단)
  if (!state.achs) state.achs = {};
  if (state.qaUsed) return; // QA 치트로 오염된 세이브는 신규 업적 해금 무시 (기존 해금은 유지)
  for (const a of ACHS) {
    if (!state.achs[a.id] && a.chk()) {
      Platform.achievements.unlock(a.id); // 어댑터 경유(로컬 state.achs 위임 + Steam 중계 지점) — 동작 불변
      toast(t('ach.unlocked', { icon: a.icon, name: LName(a) }));
      state.dayLog.notes.push(t('ach.note', { name: LName(a) }));
      playSfx('ring');
    }
  }
}
// 기록 탭 HTML (REQ-LORE-02) — 메모(지역 그룹)+라디오 로그+수집률. 미수집은 "…" 실루엣.
function recordTabHtml() {
  const owned = state.memos || {};
  const bown = state.broadcasts || {};
  const regionKeys = { residential: 'record.regionRes', commercial: 'record.regionCom', industrial: 'record.regionInd', slum: 'record.regionSlum' };
  const memoRow = (id, tbl) => owned[id]
    ? `<div class="prep-row" style="cursor:pointer" data-memo="${id}" data-will="${tbl === WILLS ? 1 : 0}"><span>📄</span><span>${LN(tbl[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
    : `<div class="prep-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`;
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
        sections += `<div class="prep-row" style="cursor:pointer;border-top:1px solid var(--panel-border);margin-top:4px" data-truth="1"><span>📖</span><span style="color:var(--accent)">${t('record.truthTitle')}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`;
      }
    }
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
    ? `<div class="prep-row" style="cursor:pointer" data-broadcast="${id}"><span>📻</span><span>${LN(BROADCASTS[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
    : `<div class="prep-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`).join('');
  const distant = state.distantLight?.count
    ? `<div class="report-sec"><span class="r-title">${t('record.distantTitle', { n: state.distantLight.count })}</span></div>` : '';
  // 1.3 밤하늘 스케치 — 관측소 완공 후 수집이 시작되면 섹션 노출(스포일러 방지, 벙커/지하 문법). satellite는 1.4 복선.
  const sown = state.sketches || {};
  let sketchSec = '';
  if (state.observatoryDone || sketchesCollected() > 0) {
    const rows = Object.keys(SKETCHES).map(id => sown[id]
      ? `<div class="prep-row" style="cursor:pointer" data-sketch="${id}"><span>🌌</span><span>${LN(SKETCHES[id])}</span><span class="p-cost" style="color:var(--accent)">${t('record.readHint')}</span></div>`
      : `<div class="prep-row" style="cursor:default;opacity:0.4"><span>▫️</span><span>${t('record.locked')}</span></div>`).join('');
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
  return `<div style="display:flex;gap:6px;margin-bottom:10px">${tab('journal', t('journal.title'))}${tab('record', t('record.tabTitle'))}</div>`;
}
function openJournalModal(tab = 'journal') {
  const se = seasonOf();
  const achsHtml = ACHS.map(a => {
    const got = state.achs?.[a.id];
    return `<div class="prep-row" style="cursor:default;${got ? '' : 'opacity:0.4'}">
      <span style="font-size:16px">${a.icon}</span>
      <span>${LName(a)}</span>
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
  const journalBody = `
    <div class="report-sec"><span class="r-title">${t('journal.statsTitle')}</span><br>
      ${t('journal.statsLine', { day: state.day, sicon: se.icon, exp: state.stats.exp, succ: state.stats.success, craft: state.stats.craft || 0, stay: state.stayDays || 0 })}
    </div>
    ${comfortBreakdownHtml()}
    <div class="report-sec"><span class="r-title">${t('journal.colTitle', { n: collectionCount(), total: colTotal })}</span><br>${colHtml}</div>
    <div class="report-sec"><span class="r-title">${t('deco.themeBadgeTitle', { n: activeThemeSets().length, total: THEME_SETS.length })}</span><br>${themeBadges}</div>
    <div class="report-sec"><span class="r-title">${t('journal.achTitle', { n: Object.values(state.achs || {}).filter(Boolean).length, total: ACHS.length })}</span></div>
    ${achsHtml}`;
  openModal(t('journal.title'), journalTabBar(tab) + (tab === 'record' ? recordTabHtml() : journalBody));
  const body = $('modal-body');
  body.querySelectorAll('button[data-jtab]').forEach(b => b.addEventListener('click', () => openJournalModal(b.dataset.jtab)));
  body.querySelectorAll('[data-memo]').forEach(el => el.addEventListener('click', () => showMemoPage(el.dataset.memo, el.dataset.will === '1')));
  body.querySelectorAll('[data-broadcast]').forEach(el => el.addEventListener('click', () => showBroadcastModal(el.dataset.broadcast)));
  body.querySelectorAll('[data-sketch]').forEach(el => el.addEventListener('click', () => showSketchPage(el.dataset.sketch)));
  body.querySelectorAll('[data-truth]').forEach(el => el.addEventListener('click', () => showTruthPage()));
}

/* ============================================================
   부상 & 치료 (기획서 v0.2: 치료 자원 소비 루프)
============================================================ */
function applyInjury(type, hasBottle) {
  const inj = INJURIES[type];
  let restH = inj.restH * recoveryMult();
  if (SHELTERS[state.current].perk?.injuryHalf) restH *= 0.5;
  if (hasBottle) restH *= 0.8;
  state.injury = { type, untilMin: state.gameMin + restH * 60 };
  tipOnce('tip.injury'); // 찢어진 쪽지: 첫 부상
  return t('injury.applied', { icon: inj.icon, name: LName(inj), pen: Math.round(inj.pen * 100), h: Math.round(restH) });
}
function treatInjury() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (!state.injury) return;
  const inj = INJURIES[state.injury.type];
  if (!resConsumeAll(inj.cure)) { toast(t('injury.needCure', { cost: costLabel(inj.cure) })); return; }
  toast(t('injury.treated', { icon: inj.icon, name: LName(inj), cost: costLabel(inj.cure) }));
  state.dayLog.notes.push(t('injury.treatedNote', { name: LName(inj) }));
  state.injury = null;
  scheduleSave();
  renderResBar();
  renderExpPanel();
  updateHud();
}
function tickInjury() {
  if (state.injury && state.gameMin >= state.injury.untilMin) {
    toast(t('injury.recovered', { icon: INJURIES[state.injury.type].icon, name: LName(INJURIES[state.injury.type]) }));
    state.injury = null;
    scheduleSave();
    renderExpPanel();
    updateHud();
  }
}

/* ============================================================
   입력 처리
============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let placing = null, selected = null, dragging = null, dragStart = null;
let orbiting = false, lastOrbX = 0;
// v0.9.2 배치 모드: OFF(기본)면 화면 조작 중 기존 가구가 덥석 선택/이동되지 않는다.
// 저장하지 않는 세션 변수 — 기능형 상호작용(라디오/촛불 토글)은 모드와 무관하게 항상 동작.
let editMode = false;
function funcClickItem(item) {
  // editMode OFF에서의 "기능형 클릭": 선택/이동/패널 없이 기능만 실행.
  const def = DEFS[item.defId];
  if (item.defId === 'radio') { dbgSfx = 'radio_noise'; playSfx('radio_noise', { vol: 0.5, jitter: 0 }); return true; }
  if (['candle', 'lantern'].includes(item.defId) || def.light || def.appliance) {
    // 전원 토글 (성냥음은 setItemPower가 candle/lantern에서 재생)
    if (def.light?.fuel || def.appliance?.fuel || def.light || def.appliance) {
      setItemPower(item, item.on === false, { silent: false });
      dbgSfx = ['candle', 'lantern'].includes(item.defId) ? 'candle_light' : 'toggle';
      toast(item.on ? t('power.turnedOn', { name: LName(def) }) : t('power.turnedOff', { name: LName(def) }));
      scheduleSave();
      return true;
    }
  }
  return false;
}
let dbgSfx = null; // 테스트용: 마지막 기능형 클릭이 낸 SFX
// 비배치 모드에서 가구를 탭했을 때 배치 모드 전환을 제안. '닫기' 후 60초는 팝업 대신 토스트로 강등.
let _editAskMuteUntil = 0;
async function offerEditMode(item) {
  playSfx('place', { vol: 0.25, rate: 1.5, jitter: 0.1 }); // 상호작용음 (select와 동일한 가벼운 '톡')
  const name = LName(DEFS[item.defId]);
  if (Date.now() < _editAskMuteUntil) { toast(t('edit.enterHint')); return; }
  const ok = await gameConfirm(t('edit.enterAsk', { name }), t('edit.enterYes'), t('edit.enterNo'));
  if (ok) { toggleEditMode(true); select(item); }
  else _editAskMuteUntil = Date.now() + 60000; // '닫기' → 60초 강등
}

const selRing = new THREE.Mesh(
  new THREE.RingGeometry(0.5, 0.62, 24),
  new THREE.MeshBasicMaterial({ color: 0xe8a86c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
);
selRing.rotation.x = -Math.PI / 2;
selRing.position.y = 0.03;
selRing.visible = false;
scene.add(selRing);

function updateSelRing() {
  if (selected) {
    const fp = footprintOf(selected);
    const r = Math.max(fp.w, fp.d) / 2 + 0.18;
    selRing.scale.set(r / 0.56, r / 0.56, 1);
    selRing.position.set(selected.x, 0.03 + (selected.y || 0), selected.z);
    selRing.visible = true;
  } else selRing.visible = false;
}
function pointerToFloor(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(floorPlane, p) ? p : null;
}
// #55 벙커 하강 계단 클릭: 1.4 복선 토스트 + 극저확률 특수 메모 발견. 진입은 불가(어둠 페이드).
function pickStairs(e) {
  if (!bunkerStairsObj) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // 뒷벽 컬링으로 계단이 숨은 각도에선 클릭도 무시 (조상 그룹 visible 확인)
  let vis = true; for (let o = bunkerStairsObj; o; o = o.parent) if (o.visible === false) { vis = false; break; }
  if (!vis) return false;
  const hits = raycaster.intersectObject(bunkerStairsObj, true);
  if (!hits.length) return false;
  // 극저확률(memo willDropChance 밴드)로 계단 메모 발견 — 미수집일 때만
  if (!(state.memos || {}).stair1 && Math.random() < 0.06) {
    collectMemo('stair1');
    scheduleSave();
    showMemoPage('stair1', false);
    return true;
  }
  toast(t('bunker.stairToast'));
  return true;
}
// 고양이 쓰다듬기: catObj.g 대상 별도 히트테스트 (하루 3회 제한)
let petDay = 0, petCount = 0;
function pickCat(e) {
  const _cat = getCat();
  if (!_cat) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(_cat.g, true);
  if (!hits.length) return false;
  if (petDay !== state.day) { petDay = state.day; petCount = 0; }
  if (petCount >= 3) return true; // 히트는 소비하되 보상 없음(오늘 한도 초과)
  petCount++;
  petCatResponse(); // ② 쓰다듬기 연계 연출(눈 감김·갸르릉·꼬리 가속) — 클로즈업에서 완성, 평상시에도 동작
  toast(t('cat.pet'));
  return true;
}
// ② 쓰다듬기 반응: 눈 감은 얼굴 2초 + 갸르릉(전용 사운드 없어 야옹 저피치로 대체) + 꼬리 살랑 가속.
//   클로즈업(catCam.active) 여부와 무관하게 동작하되, 연출은 클로즈업에서 완성되도록 설계.
//   PET_HAPPY_MS는 cat.js(updateCat 감쇠)와 공유하므로 팩토리 호출 전에 선언한다(상단 이동).
function petCatResponse() {
  const _cat = getCat();
  if (!_cat) return;
  _cat.petHappy = PET_HAPPY_MS / 1000; // 남은 눈감김 시간(초)
  _cat.petPurr = 1;                     // 꼬리 가속 계수(1→0 감쇠)
  // 갸르릉: assets-src/Cat_sound에 전용 파일 없음 → 기존 야옹을 저피치(rate<1)로 재생해 그르릉 톤 근사.
  playSfx(['meow1', 'meow2', 'meow3'][Math.floor(Math.random() * 3)], { rate: 0.55, jitter: 0.03, vol: 0.85 });
}
function pickItem(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(itemsRoot.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.item) o = o.parent;
    if (o) return o.userData.item;
  }
  return null;
}
const snap = v => Math.round(v / GRID) * GRID;

function moveGhost(item, e) {
  const p = pointerToFloor(e);
  if (!p) return;
  const [x, z] = clampToRoom(item, snap(p.x), snap(p.z));
  const dx = x - item.x, dz = z - item.z;
  item.x = x; item.z = z;
  const bad = collides(item, x, z); // _support 계산 포함
  item.y = item._support ? item._support.y : 0;
  item.support = item._support ? item._support.other : null;
  syncTransform(item);
  // 상판 위에 올려둔 소품도 함께 이동
  if (DEFS[item.defId].surface && (dx || dz)) {
    for (const ch of itemsOn(item)) { ch.x += dx; ch.z += dz; syncTransform(ch); }
  }
  setGhostVisual(item, bad ? 'invalid' : 'valid');
  item._valid = !bad;
}
function startPlacing(defId) {
  if (paused) { toast(t('pause.blocked')); return; }
  if ((state.inventory[defId] || 0) <= 0) {
    toast(t('place.noStock', { name: LName(DEFS[defId]) }));
    return;
  }
  let maxN = SHELTERS[state.current].maxItems;
  if (maxN && hasMod('shelf')) maxN += 4;
  if (maxN && items.length >= maxN) {
    toast(t('place.maxItems', { shelter: LName(SHELTERS[state.current]), n: maxN }));
    return;
  }
  cancelPlacing();
  deselect();
  const item = addItem(defId, 0, 0, 0, 0);
  placing = item;
  item._valid = !collides(item, 0, 0);
  setGhostVisual(item, item._valid ? 'valid' : 'invalid');
  gridObj.visible = true;
  $('btn-cancel-place').classList.add('show');
}
function cancelPlacing() {
  $('btn-cancel-place').classList.remove('show');
  if (!placing) return;
  removeItem(placing);
  placing = null;
  gridObj.visible = false;
}
function finishPlacing() {
  if (!placing || !placing._valid) { toast(t('place.cantHere')); return; }
  $('btn-cancel-place').classList.remove('show');
  setGhostVisual(placing, null);
  const item = placing;
  placing = null;
  gridObj.visible = false;
  state.inventory[item.defId]--;
  markCollection(item.defId, item.colorIdx);
  if (DEFS[item.defId].surface) tipOnce('tip.stack'); // 찢어진 쪽지: 첫 스태킹 가능 가구(테이블 등) 배치
  renderInventoryBar();
  select(item, true); // 배치 확정음(아래 playSfx('place'))과 중복되지 않게 select의 클릭음은 생략
  questProgress('place');
  scheduleSave();
  playSfx('place');
}
function select(item, silent = false) {
  deselect();
  selected = item;
  showSelPanel(item);
  updateSelRing();
  // 아이템 클릭 상호작용음 (가벼운 '톡') — 라디오는 radio_noise가 별도로 재생되므로 중복 방지 위해 생략
  if (!silent && item.defId !== 'radio') playSfx('place', { vol: 0.25, rate: 1.5, jitter: 0.1 });
}
function deselect() {
  selected = null;
  hideSelPanel();
  updateSelRing();
}
function reclaimSelected() {
  if (!selected) return;
  // 지속효과 가전(냉장고/정수기/발전기)이 가동 중이면 회수 시 효과 중단을 안내 (비파괴 — 토스트만)
  const app = DEFS[selected.defId].appliance;
  const wasOn = app && selected.on !== false;
  const utilName = LName(DEFS[selected.defId]);
  if (DEFS[selected.defId].surface) dropChildrenOf(selected);
  state.inventory[selected.defId] = (state.inventory[selected.defId] || 0) + 1;
  removeItem(selected);
  deselect();
  renderInventoryBar();
  scheduleSave();
  playSfx('whoosh');
  if (wasOn) toast(t('reclaim.utilityOff', { name: utilName, effect: t(`reclaim.eff.${app.effect}`) }));
}
// 배치 D ④: 전체 수거 — 현재 셸터의 모든 가구를 인벤토리로 거둔다.
//   가전 효과 중단은 요약 1줄로 안내(개별 토스트 폭탄 방지).
async function reclaimAll() {
  const n = items.length;
  if (n <= 0) { toast(t('inv.collectAll.none')); return; }
  if (!(await gameConfirm(t('reclaimAll.confirm', { n }), t('reclaimAll.ok'), t('reclaimAll.cancel')))) return;
  let applianceOff = 0;
  // 스냅샷 복사 후 순회 (removeItem이 items를 변형하므로)
  for (const it of [...items]) {
    const app = DEFS[it.defId].appliance;
    if (app && it.on !== false) applianceOff++;
    state.inventory[it.defId] = (state.inventory[it.defId] || 0) + 1;
    removeItem(it);
  }
  deselect();
  renderInventoryBar();
  scheduleSave();
  playSfx('whoosh');
  toast(t('reclaimAll.done', { n }) + (applianceOff > 0 ? ' ' + t('reclaimAll.applianceOff', { n: applianceOff }) : ''));
}

// 멀티터치 추적: 한 손가락 = 선택/이동/빈 곳 드래그 회전, 두 손가락 = 핀치 줌 + 회전
const touches = new Map();
let pinch = null;      // { dist, zoom, cx }
let orbitDrag = null;  // 빈 공간 좌클릭/터치 드래그 → 카메라 회전

function dropDragging(revert) {
  if (!dragging) return;
  if (revert && dragStart) {
    dragging.x = dragStart.ox; dragging.z = dragStart.oz; dragging.rot = dragStart.or;
    dragging.y = dragStart.oy || 0; dragging.support = dragStart.osup || null;
    for (const k of (dragStart.kids || [])) { k.ch.x = k.x; k.ch.z = k.z; k.ch.rot = k.r; syncTransform(k.ch); }
    syncTransform(dragging);
  }
  setGhostVisual(dragging, null);
  gridObj.visible = false;
  updateSelRing();
  dragging = null; dragStart = null;
}
canvas.addEventListener('pointerdown', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {
    // 핀치 시작 — 진행 중이던 가구 드래그는 원위치
    dropDragging(true);
    orbitDrag = null; orbiting = false;
    const [a, b] = [...touches.values()];
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: camState.zoom, cx: (a.x + b.x) / 2 };
    return;
  }
  if (e.button === 2) { orbiting = true; lastOrbX = e.clientX; return; }
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (placing) { moveGhost(placing, e); finishPlacing(); return; }
  if (!editMode && pickStairs(e)) return; // #55 배치 모드가 아닐 때만 계단 상호작용 (배치 중 오작동 방지)
  if (pickCat(e)) { if (!editMode) enterCatCloseup(); return; } // 쓰다듬기 + (비배치) 클로즈업 진입 — 히트 소비
  if (!editMode && pickAvatar(e)) { openWardrobeModal(); return; } // #86④ 아바타 탭 = 옷장 (배치 중 제외)
  const hit = pickItem(e);
  if (hit) {
    // 배치 모드 OFF: 가구 선택/이동은 막고, 기능형(라디오/촛불 토글)만 실행.
    // 화면 회전 조작 중 가구가 덥석 잡히는 오작동 방지 (베타 피드백).
    if (!editMode) {
      if (funcClickItem(hit)) return;         // 기능 실행 후 소비 (선택/드래그 없음)
      // 비배치 모드에서 일반 가구 탭 → 배치 모드 진입 유도 팝업 (기능형은 위에서 소비됨)
      offerEditMode(hit);
      orbitDrag = { x: e.clientX, y: e.clientY, moved: false, pan: false }; // 가구가 잡힌 드래그 = 기존 화면 회전 유지(#70: 팬은 빈 공간 전용)
      return;
    }
    // 배치 모드 ON: 선택 + 드래그 이동 허용
    select(hit);
    if (hit.defId === 'radio') playSfx('radio_noise', { vol: 0.5, jitter: 0 }); // 라디오 클릭 시 지지직 1회
    dragging = hit;
    dragStart = {
      sx: e.clientX, sy: e.clientY, ox: hit.x, oz: hit.z, or: hit.rot, moved: false,
      oy: hit.y || 0, osup: hit.support || null,
      kids: DEFS[hit.defId].surface ? itemsOn(hit).map(ch => ({ ch, x: ch.x, z: ch.z, r: ch.rot })) : [],
    };
  } else {
    // #70 빈 공간 드래그: 비배치·비클로즈업이면 클램프 팬, 배치 모드/클로즈업 중엔 기존 yaw 회전(팬 비활성 스펙).
    //   팬은 최저 우선순위 — 계단/고양이/가구 픽이 전부 미스인 이 else에서만 시작(select 레이캐스트 경로 불변).
    //   데드존: 팬은 8px(탭 상호작용 보호 스펙), 회전은 기존 7px 유지.
    const pan = !editMode && !catCam.active;
    orbitDrag = { x: e.clientX, y: e.clientY, moved: false, pan, dead: pan ? 8 : 7 };
  }
});
addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size >= 2) {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (catCam.active) exitCatCloseup(); // 핀치 줌/회전도 카메라 조작 → 클로즈업 해제
    camState.zoom = THREE.MathUtils.clamp(pinch.zoom * (d / pinch.dist), 0.25, 3.2);
    const cx = (a.x + b.x) / 2;
    camState.targetYaw += (cx - pinch.cx) * 0.006;
    pinch.cx = cx;
    return;
  }
  if (orbiting) {
    camState.targetYaw += (e.clientX - lastOrbX) * 0.008;
    lastOrbX = e.clientX;
    return;
  }
  if (orbitDrag) {
    const dx = e.clientX - orbitDrag.x, dy = e.clientY - orbitDrag.y;
    if (!orbitDrag.moved && Math.hypot(dx, dy) > (orbitDrag.dead || 7)) orbitDrag.moved = true;
    if (orbitDrag.moved) {
      if (catCam.active) exitCatCloseup(); // 드래그로 카메라를 잡으면 클로즈업 해제(원 카메라 복원)
      if (orbitDrag.pan) panByScreenDelta(dx, dy); // #70 빈 공간 드래그 = 클램프 팬 (마우스/터치 공용)
      else camState.targetYaw += dx * 0.008;
      orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
    }
    return;
  }
  if (placing) { moveGhost(placing, e); return; }
  if (dragging) {
    if (!dragStart.moved) {
      if (Math.hypot(e.clientX - dragStart.sx, e.clientY - dragStart.sy) < 5) return;
      dragStart.moved = true;
      gridObj.visible = true;
    }
    moveGhost(dragging, e);
    updateSelRing();
  }
});
function onPointerEnd(e) {
  touches.delete(e.pointerId);
  if (pinch && touches.size < 2) pinch = null;
  if (e.button === 2) { orbiting = false; return; }
  if (orbitDrag) {
    if (!orbitDrag.moved) { if (catCam.active) exitCatCloseup(); else deselect(); } // 빈곳 탭 = 클로즈업 해제 or 선택 해제
    orbitDrag = null;
    return;
  }
  if (dragging) {
    if (dragStart.moved) {
      if (!dragging._valid) {
        dragging.x = dragStart.ox; dragging.z = dragStart.oz; dragging.rot = dragStart.or;
        dragging.y = dragStart.oy || 0; dragging.support = dragStart.osup || null;
        for (const k of (dragStart.kids || [])) { k.ch.x = k.x; k.ch.z = k.z; k.ch.rot = k.r; syncTransform(k.ch); }
        syncTransform(dragging);
        toast(t('place.cantHere'));
      } else scheduleSave();
      setGhostVisual(dragging, null);
      gridObj.visible = false;
      updateSelRing();
    }
    dragging = null; dragStart = null;
  }
}
addEventListener('pointerup', onPointerEnd);
addEventListener('pointercancel', onPointerEnd);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (catCam.active) exitCatCloseup(); // 휠 줌도 카메라 조작 → 클로즈업 해제
  camState.zoom = THREE.MathUtils.clamp(camState.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.25, 3.2);
}, { passive: false });

// v2.4: PC 판정 — 포인터가 정밀(마우스)하고 터치 지원이 없는 기기만 "PC"로 취급.
const isPcInput = matchMedia('(pointer: fine)').matches && !('ontouchstart' in window);
// v0.9.1: 모바일(터치 기기/Capacitor 포함) 판정 — 백그라운드 오디오 정책 분기에 사용.
const isMobileEnv = ('ontouchstart' in window) || /Android|iPhone|iPad/i.test(navigator.userAgent);
// #52: 탭형 환경설정 창 — 타이틀 ⚙️ / 인게임 ESC / 모바일 톱니 3경로가 모두 이 전용 오버레이를 개폐한다.
// 중앙 고정 창이라 clampPanel/updateUiScale 위치 로직은 호출하지 않는다(함수 자체는 존치).
function settingsOpen() { return $('settings-screen').classList.contains('show'); }
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
function switchSettingsTab(name) {
  document.querySelectorAll('#settings-tabs .settings-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('#settings-tabbody .settings-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
}
// 컨트롤 탭 — PC = 실제 리바인딩 UI(#14), 모바일 = 제스처 안내표.
const KEYBIND_LABEL = {
  map: 'ctrl.act.map', migrate: 'ctrl.act.migrate', craft: 'ctrl.act.craft', clean: 'ctrl.act.clean',
  sleep: 'ctrl.act.sleep', journal: 'ctrl.act.journal', pause: 'ctrl.act.pause', editMode: 'ctrl.act.editMode',
  rotViewL: 'ctrl.act.rotViewL', rotViewR: 'ctrl.act.rotViewR', rotateItem: 'ctrl.act.rotateItem', reclaim: 'ctrl.act.reclaim',
};
function renderControlsGuide() {
  const el = $('controls-guide'); if (!el) return;
  if (isPcInput) {
    // ESC 시스템 예약 행(리바인딩 불가) + 액션 12행(클릭→키 대기)
    const escRow = `<div class="cg-row"><span class="cg-key cg-fixed">ESC</span><span class="cg-desc">${t('ctrl.esc')} <span class="cg-reserved">${t('ctrl.reserved')}</span></span></div>`;
    const rows = KEYBIND_ORDER.map(a => {
      const waiting = awaitingRebind === a;
      const label = waiting ? t('ctrl.pressKey') : keyLabel(KEYBINDS[a]);
      return `<div class="cg-row"><button class="cg-key cg-bind${waiting ? ' waiting' : ''}" data-rebind="${a}">${label}</button><span class="cg-desc">${t(KEYBIND_LABEL[a])}</span></div>`;
    }).join('');
    el.innerHTML = escRow + rows + `<div class="btn-row" style="margin-top:10px"><button class="pixel-btn" id="btn-keys-default">${t('ctrl.rebindDefault')}</button></div>`;
    el.querySelectorAll('.cg-bind').forEach(b => b.addEventListener('click', () => startRebind(b.dataset.rebind)));
    const bd = el.querySelector('#btn-keys-default');
    if (bd) bd.addEventListener('click', () => { awaitingRebind = null; resetKeybinds(); renderControlsGuide(); toast(t('ctrl.rebindDone')); });
  } else {
    const row = (k, d) => `<div class="cg-row"><span class="cg-key cg-fixed">${k}</span><span class="cg-desc">${d}</span></div>`;
    el.innerHTML = row(t('ctrl.tap.k'), t('ctrl.tap')) + row(t('ctrl.drag.k'), t('ctrl.drag')) + row(t('ctrl.pinch.k'), t('ctrl.pinch'))
      + `<div class="cg-note">${t('ctrl.mobileNote')}</div>`;
  }
}
function startRebind(action) {
  awaitingRebind = action;
  renderControlsGuide();
}
// 리바인딩 캡처: ESC 취소, 중복 시 스왑 확인. 성공 시 저장·재렌더.
async function captureRebind(e) {
  e.preventDefault();
  const action = awaitingRebind;
  if (e.key === 'Escape') { awaitingRebind = null; renderControlsGuide(); return; }
  // ESC/시스템키 외 아무 키나 code로 캡처. reclaim에 Backspace도 유효.
  const code = e.code;
  if (!code || code === 'Escape') return;
  // 이미 이 액션이면 그대로 유지하고 종료
  if (KEYBINDS[action] === code) { awaitingRebind = null; renderControlsGuide(); return; }
  // 중복 검사: 다른 액션이 이 code를 이미 쓰는가?
  const conflict = KEYBIND_ORDER.find(a => a !== action && KEYBINDS[a] === code);
  awaitingRebind = null; // 캡처는 여기서 종료 (확인창 동안 추가 캡처 금지)
  if (conflict) {
    renderControlsGuide(); // '키 입력 대기' 라벨 원복 후 확인창
    const ok = await gameConfirm(
      t('ctrl.swapConfirm', { key: keyLabel(code), from: t(KEYBIND_LABEL[conflict]), to: t(KEYBIND_LABEL[action]) }),
      t('ctrl.swap'), t('confirm.cancel'));
    if (!ok) { renderControlsGuide(); return; }
    KEYBINDS[conflict] = KEYBINDS[action]; // 기존 액션의 키를 충돌 액션에 넘겨 스왑
  }
  KEYBINDS[action] = code;
  saveKeybinds();
  renderControlsGuide();
  toast(t('ctrl.rebindDone'));
}
// 설정 진입 문법: PC = ESC / 모바일 = 우측 상단 톱니. 창은 중앙 고정.
// ($ 헬퍼는 이 시점에 TDZ라 getElementById 직접 사용)
{
  const gear = document.getElementById('btn-gear');
  if (gear) {
    if (!isPcInput) gear.style.display = '';   // 터치 기기에서만 노출
    gear.addEventListener('click', () => toggleSettingsPanel());
  }
  // 탭 전환 / 닫기 / 기본값 버튼 배선
  document.querySelectorAll('#settings-tabs .settings-tab').forEach(b =>
    b.addEventListener('click', () => switchSettingsTab(b.dataset.tab)));
  document.getElementById('settings-x').addEventListener('click', () => closeSettings());
  document.getElementById('btn-settings-close').addEventListener('click', () => closeSettings());
  // 오버레이 배경 클릭 시 닫기 (창 내부 클릭은 유지)
  document.getElementById('settings-screen').addEventListener('pointerdown', e => { if (e.target.id === 'settings-screen') closeSettings(); });
  document.getElementById('btn-settings-default').addEventListener('click', () => resetSettingsTabToDefault());
}
// 현재 활성 탭의 opts만 선언부 기본값으로 복원 (전역 리셋 아님)
function resetSettingsTabToDefault() {
  const active = document.querySelector('#settings-tabs .settings-tab.active')?.dataset.tab;
  const D = OPTS_DEFAULT;
  if (active === 'graphics') {
    opts.pixel = D.pixel; opts.quant = D.quant; opts.dither = D.dither;
    opts.ceil = D.ceil; opts.lowSpec = D.lowSpec; opts.fpsCap = D.fpsCap;
    // 접근성도 그래픽 탭에 배치되므로 함께 기본값 복원
    opts.fontScale = D.fontScale; opts.colorblind = D.colorblind; opts.reduceMotion = D.reduceMotion;
    applyOpts(); applyLowSpec();
  } else if (active === 'sound') {
    opts.bgm = D.bgm; opts.bgmVol = D.bgmVol; opts.sfxVol = D.sfxVol; opts.bgIdle = D.bgIdle;
    // 사운드 UI + 실효 반영
    const eb = $('opt-bgm'); if (eb) eb.checked = !!opts.bgm;
    const ev = $('opt-bgmvol'); if (ev) ev.value = Math.round(opts.bgmVol * 100);
    const es = $('opt-sfxvol'); if (es) es.value = Math.round(opts.sfxVol * 100);
    const ei = $('opt-bgidle'); if (ei) ei.checked = opts.bgIdle !== false;
    setSfxVol(opts.sfxVol); syncBgm();
  } else if (active === 'gameplay') {
    opts.autoEat = D.autoEat; opts.lang = D.lang;
    // 자동 진행은 Day10 해금 상태를 존중 — 기본(off)만 복원
    opts.autoPlay = D.autoPlay; syncAutoBtn();
    applyOpts();
  }
  scheduleSave();
  toast(t('settings.defaultDone'));
}
/* ============================================================
   #14 키 리바인딩 (REQ-INP-01) — 액션 12종. 엔진 1곳(runAction) 경유.
   ------------------------------------------------------------
   · KEYBINDS: 액션 → 기본 KeyboardEvent.code. code 기반(레이아웃 독립)이지만
     Delete/Backspace만 예외적으로 둘 다 허용(관례).
   · 사용자 오버라이드는 localStorage('nw-keys')에 { action: code } 로 저장.
   · ESC는 시스템 예약(설정/취소/닫기 스택) — 리바인딩 대상 아님.
   ============================================================ */
const KEYBIND_DEFAULT = {
  map: 'KeyM',        // 탐험 지도
  migrate: 'KeyG',    // 이주 (Go)
  craft: 'KeyC',      // 제작
  clean: 'KeyX',      // 청소
  sleep: 'KeyZ',      // 취침
  journal: 'KeyJ',    // 일지
  pause: 'KeyP',      // 일시정지
  editMode: 'KeyB',   // 배치 모드 (Build)
  rotViewL: 'KeyQ',   // 시점 회전 좌
  rotViewR: 'KeyE',   // 시점 회전 우
  rotateItem: 'KeyR', // 가구 회전
  reclaim: 'Delete',  // 회수
};
// 리바인딩 UI/안내표 순서 (선언 순서 고정)
const KEYBIND_ORDER = ['map', 'migrate', 'craft', 'clean', 'sleep', 'journal', 'pause', 'editMode', 'rotViewL', 'rotViewR', 'rotateItem', 'reclaim'];
// const로 두고 항상 제자리 변경(reassign 금지) — 외부(QA/export) 참조가 항상 라이브 상태를 본다.
const KEYBINDS = { ...KEYBIND_DEFAULT };
try {
  const saved = JSON.parse(localStorage.getItem('nw-keys') || 'null');
  if (saved && typeof saved === 'object') for (const a of KEYBIND_ORDER) if (typeof saved[a] === 'string') KEYBINDS[a] = saved[a];
} catch (e) { /* 손상 시 기본값 */ }
function saveKeybinds() { try { localStorage.setItem('nw-keys', JSON.stringify(KEYBINDS)); } catch (e) { /* */ } }
function resetKeybinds() { Object.assign(KEYBINDS, KEYBIND_DEFAULT); saveKeybinds(); }
function keyForAction(a) { return KEYBINDS[a]; }
// 표시용 라벨: 'KeyM'→'M', 'Delete'→'Del', 'Backspace'→'⌫', 'Digit1'→'1' 등
function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = { Delete: 'Del', Backspace: '⌫', Space: 'Space', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Minus: '-', Equal: '=', Backquote: '`' };
  return map[code] || code;
}
// 이벤트 → 액션. reclaim은 Delete/Backspace 양쪽 허용(관례).
function actionForEvent(e) {
  for (const a of KEYBIND_ORDER) {
    if (e.code === KEYBINDS[a]) return a;
    if (a === 'reclaim' && (e.code === 'Delete' || e.code === 'Backspace') && (KEYBINDS[a] === 'Delete' || KEYBINDS[a] === 'Backspace')) return a;
  }
  return null;
}
// 엔진 1곳: 모든 액션 실행은 여기로 (키/게임패드 공용). 버튼 클릭 동작과 정합.
function runAction(a) {
  switch (a) {
    case 'map':
      if (state.exp || state.injury) { $('exp-panel').classList.toggle('show'); renderExpPanel(); }
      else openMapModal();
      break;
    case 'migrate': openShelterModal(); break;
    case 'craft': openCraftModal(); break;
    case 'clean': cleanShelter(); break;
    case 'sleep': sleepUntilMorning(); break;
    case 'journal': openJournalModal('journal'); break;
    case 'pause': setPaused(!paused); break;
    case 'editMode': toggleEditMode(); break;
    // v1.5.1(디렉터 "시작하자마자 T자"): 45° 스텝은 한 탭에 정면(0°) 도달 — 정면에선 측벽이 실낱+레일만 떠서
    //   T자 골조로 읽힘. 90° 스텝(대각 4방향 전용)으로 어느 방향이든 2벽이 보이는 3/4 뷰만 허용. 미세 시야는 팬(#70).
    case 'rotViewL': camState.targetYaw -= Math.PI / 2; break;
    case 'rotViewR': camState.targetYaw += Math.PI / 2; break;
    case 'rotateItem': rotateActive(); break;
    case 'reclaim': if (selected && !placing) reclaimSelected(); break;
  }
}
let awaitingRebind = null; // 리바인딩 대기 중인 액션 (설정 창)
addEventListener('keydown', e => {
  // 리바인딩 캡처 모드: ESC 취소, 그 외 키는 해당 액션에 배정
  if (awaitingRebind) { captureRebind(e); return; }
  if (titleVisible) return;
  if (e.key === 'Escape') {
    // 우선순위: 설정 창 닫기 > 고양이 클로즈업 해제 > 배치 중 취소 > 선택 해제 > 모달 닫기 > (PC) 설정 창 열기
    if (settingsOpen()) { closeSettings(); }
    else if (catCam.active) { exitCatCloseup(); }
    else if (placing) { cancelPlacing(); }
    else if (selected) { deselect(); }
    else if ($('modal-back').classList.contains('show')) { closeModal(); }
    else if (isPcInput) { openSettings(); }
    return;
  }
  // 설정 창이 열려 있으면(입력 필드 등) 게임 액션 단축키 무시 — 오작동 방지
  if (settingsOpen()) return;
  const act = actionForEvent(e);
  if (act) { e.preventDefault(); runAction(act); }
});
// 지지대 회전 시 위 소품도 함께 90° 공전 (dir=+1: rot+1과 동일 방향)
function rotateChildren(item, dir) {
  if (!DEFS[item.defId].surface) return;
  for (const ch of itemsOn(item)) {
    const dx = ch.x - item.x, dz = ch.z - item.z;
    if (dir > 0) { ch.x = item.x + dz; ch.z = item.z - dx; }
    else { ch.x = item.x - dz; ch.z = item.z + dx; }
    ch.rot = (ch.rot + (dir > 0 ? 1 : 3)) % 4;
    syncTransform(ch);
  }
}
function rotateActive() {
  const item = placing || (dragging && dragStart?.moved ? dragging : selected);
  if (!item) return;
  item.rot = (item.rot + 1) % 4;
  rotateChildren(item, 1);
  const [x, z] = clampToRoom(item, item.x, item.z);
  item.x = x; item.z = z;
  syncTransform(item);
  if (item === placing || (dragging === item && dragStart?.moved)) {
    const bad = collides(item, item.x, item.z);
    item.y = item._support ? item._support.y : 0;
    item.support = item._support ? item._support.other : null;
    syncTransform(item);
    item._valid = !bad;
    setGhostVisual(item, bad ? 'invalid' : 'valid');
  } else {
    if (collides(item, item.x, item.z)) {
      item.rot = (item.rot + 3) % 4;
      rotateChildren(item, -1);
      syncTransform(item);
      toast(t('rotate.noSpace'));
    } else scheduleSave();
  }
  updateSelRing();
}

/* ============================================================
   벽면 컬링 & 환경 애니메이션
============================================================ */
// ① 컬링 페이드 (디렉터 승인, GD-THESIS L1/L5 손맛): 벽/천장이 뚝 사라지는 대신 투명도로 부드럽게 소멸.
//   렌더 상수(BAL 아님) — 순수 시각 튜닝값.
const CULL_FADE_MS = 175;                 // 페이드 지속(150~200ms 범위)
const CULL_FADE_RATE = 1000 / CULL_FADE_MS; // opacity/초 변화율
// 페이드 상태를 각 컬링 그룹(벽/천장)에 lazy 부착: group.userData.cull = { fade, target, mats }
//   fade: 현재 표시도(1=완전 보임, 0=숨김) / target: 목표(1 보임, 0 숨김)
//   mats: 이 그룹이 소유한 페이드 대상 재질 배열 (공유 재질을 그룹 단위로 클론해 독립 페이드).
//   페이드 아웃 완료 시 visible=false + transparent 복귀(상시 draw call·렌더순서 아티팩트 방지, 방치형 성능 캐논).
function cullFadeState(group) {
  let cs = group.userData.cull;
  if (cs) return cs;
  // 그룹 소유 재질 수집 — 공유(다중 벽 공용) 재질을 그룹별로 클론해 독립적으로 페이드.
  //   클론은 userData(isWallMat/baseMap/deco 태그·wetDry 등)를 그대로 물려받아 applyDeco/applyWetness가
  //   클론에도 벽지·젖음을 바른다(traverse 대상이 클론이므로 자동). perGroupClone 태그로 disposeDeep이 해제.
  const mats = [];
  group.traverse(o => {
    if (!o.isMesh) return;
    const arr = Array.isArray(o.material) ? o.material : [o.material];
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m || m.userData.cullFadeSkip) continue;
      if (!m.userData.perGroupClone) {
        const cl = m.clone();
        cl.userData = Object.assign({}, m.userData); // 태그 승계 (isWallMat/baseMap/shared 등)
        cl.userData.shared = false;                  // 이 그룹 전용 (셸터 리로드 시 해제 대상)
        cl.userData.perGroupClone = true;            // disposeDeep이 map 있어도 해제하도록 표식
        cl.userData.opaqueOpacity = m.opacity;       // 원래 불투명 opacity 보존(반투명 유리 등)
        if (Array.isArray(o.material)) o.material[i] = cl; else o.material = cl;
        mats.push(cl);
      } else if (!mats.includes(m)) {
        if (m.userData.opaqueOpacity == null) m.userData.opaqueOpacity = m.opacity;
        mats.push(m);
      }
    }
  });
  cs = { fade: group.visible ? 1 : 0, target: group.visible ? 1 : 0, mats };
  group.userData.cull = cs;
  return cs;
}
// 컬링 그룹 표시/숨김을 페이드 목표로 전달. reduce-motion 이면 즉시 전환(기존 하드컷 유지).
function setCullTarget(group, show, instant) {
  if (opts.reduceMotion || instant) {
    if (group.visible !== show) { group.visible = show; shadowDirty(); }
    const cs = group.userData.cull;
    if (cs) { cs.fade = show ? 1 : 0; cs.target = cs.fade; applyCullFade(cs, group); }
    return;
  }
  const cs = cullFadeState(group);
  const tgt = show ? 1 : 0;
  if (cs.target === tgt) return;
  cs.target = tgt;
  if (show && !group.visible) { group.visible = true; shadowDirty(); } // 페이드 인은 즉시 보이게 하고 opacity로 등장
}
// 페이드 재질 상태 반영: 페이드 중이면 transparent+opacity, 완료면 원상 복귀.
function applyCullFade(cs, group) {
  const mid = cs.fade > 0.001 && cs.fade < 0.999;
  for (const m of cs.mats) {
    if (mid) {
      m.transparent = true;
      m.opacity = (m.userData.opaqueOpacity ?? 1) * cs.fade;
      m.depthWrite = false; // 페이드 중 반투명 정렬 아티팩트 완화
      m.needsUpdate = true;
    } else {
      // 완료 상태: 불투명 복귀 (원래 반투명 유리는 opaqueOpacity로 되돌림)
      const base = m.userData.opaqueOpacity ?? 1;
      const wasTransparent = base < 1;
      if (m.transparent !== wasTransparent || m.opacity !== base) {
        m.transparent = wasTransparent;
        m.opacity = base;
        m.depthWrite = true;
        m.needsUpdate = true;
      }
    }
  }
}
// 매 프레임 페이드 진행 (dt 초). 완료(fade==target) 시 visible 확정.
function tickCullFade(cs, group, dt) {
  if (cs.fade === cs.target) return;
  const step = dt * CULL_FADE_RATE;
  if (cs.fade < cs.target) cs.fade = Math.min(cs.target, cs.fade + step);
  else cs.fade = Math.max(cs.target, cs.fade - step);
  applyCullFade(cs, group);
  if (cs.fade === 0 && !cs.target) { group.visible = false; shadowDirty(); } // 아웃 완료 → 실제 숨김
}
let lastWallMask = -1;
// instant=true(셸터 로드 직후): 페이드 없이 즉시 확정 — 입장 시 벽이 서서히 나타나는 어색함 방지.
function updateWallCulling(dt = 0, instant = false) {
  if (!wallList.length) return;
  // 타이틀 배경은 '닫힌 집' 외경으로 보여준다 — 인게임용 투시 컬링이 타이틀에서도 벽을 열면
  // 컨테이너가 바닥+뒷벽만 남은 T자 골조로 보임(실기기 신고 재발분). 게임 진입(hideTitle) 시
  // 기존 페이드로 근벽이 스르륵 열리며 실내 진입. 지하(subway)는 보여줄 외경이 없어 제외.
  const closedHome = titleVisible && !SHELTERS[state.current]?.indoor;
  // #70: 팬은 렌더 전용 오프셋 — camera.position에 더해진 팬을 되돌려 '방 중심 기준' 방향으로 판정한다.
  //   (팬해도 컬링 마스크 불변: 마당을 보려고 팬했는데 벽이 열리거나 닫히면 안 됨 — 의도된 동작)
  const dir = new THREE.Vector3(camera.position.x - camPanApplied.x - camCenter.x,
    camera.position.y - camCenter.y, camera.position.z - camPanApplied.z - camCenter.z).normalize();
  let mask = 0;
  wallList.forEach((w, i) => {
    const show = closedHome || w.normal.dot(dir) < 0.25;
    setCullTarget(w.group, show, instant);
    if (w.proxy) w.proxy.visible = !show; // #97: 숨은 벽의 광차단 대행 (마스크 변경이 shadowDirty를 이미 트리거)
    // 마스크는 "표시 목표" 기준(그림자 갱신 트리거) — 페이드 완료 대기 없이 그림자가 따라오게.
    if (show) mask |= 1 << i;
  });
  if (mask !== lastWallMask) { lastWallMask = mask; shadowDirty(); }
  updateCeilCulling(instant, closedHome);
  // 진행 중인 페이드 전진
  if (dt > 0 && !opts.reduceMotion) {
    for (const w of wallList) { const cs = w.group.userData.cull; if (cs) tickCullFade(cs, w.group, dt); }
    for (const rf of ceilCullList) { const cs = rf.group.userData.cull; if (cs) tickCullFade(cs, rf.group, dt); }
  }
}
// ⑥-a (전 셸터 공통): 천장/지붕 투시 컬링.
//   벽 컬링과 동일 사상 — 카메라를 '마주보지 않는' 면은 감춘다. 천장은 위를 향하므로 카메라가 천장보다
//   위(부감/사선)에 있을 때 숨겨 실내를 보이게 한다. 수평 앵글(카메라가 천장 높이 아래)에서는 천장이 보여
//   아늑함이 유지된다. 임계각은 렌더 상수(아래 CEIL_CULL_MARGIN)로 실측 튜닝 — BAL이 아니라 순수 렌더 값.
const CEIL_CULL_MARGIN = 0.3; // 카메라 y가 (천장y + 이 여유)보다 높으면 부감으로 보고 천장을 숨긴다.
function updateCeilCulling(instant = false, closedHome = false) {
  for (const rf of ceilCullList) {
    const above = !closedHome && camera.position.y > rf.y + CEIL_CULL_MARGIN;
    setCullTarget(rf.group, !above, instant); // above(부감)=숨김 목표 → show=false
  }
}
// 날씨-환경 상호작용: 눈이 쌓이고(지면·수풀·지붕 풀 서리 톤), 악천후엔 바람이 거세짐
let snowCover = 0, windLevel = 1;
let snowSeeded = false; // 초봄 잔설 초기값은 최초 1회만 세팅 (셸터 재입장/개조 시 덮어쓰지 않도록)
// 비가 오면 셸터 겉면이 젖어 어두워진다
let wetness = 0, wetApplied = -1;
let frostLevel = 0; // ③ 창유리 성에 현재 투명도(0~0.72). updateEnvironment가 한파 상태로 구동.
function applyWetness() {
  wetApplied = wetness;
  const seen = new Set();
  const k = 1 - 0.26 * wetness;
  roomGroup.traverse(o => {
    if (!o.isMesh || !o.material?.color) return;
    const m = o.material;
    if (m.userData.noWet || seen.has(m.uuid)) return;
    seen.add(m.uuid);
    if (m.userData.wetDry == null) m.userData.wetDry = m.color.getHex();
    _tc.a.setHex(m.userData.wetDry);
    // 살짝 푸른 기가 도는 젖은 톤
    m.color.setRGB(_tc.a.r * k, _tc.a.g * (k + 0.02 * wetness), Math.min(1, _tc.a.b * (k + 0.07 * wetness)));
    // 젖은 벽면 반사 재질감: Phong 벽/바닥 재질만 specular·shininess를 올린다
    if (m.isMeshPhongMaterial) {
      if (m.userData.specDry == null) m.userData.specDry = m.specular.getHex();
      if (m.userData.shininessDry == null) m.userData.shininessDry = m.shininess;
      _tc.b.setHex(m.userData.specDry).lerp(_wetSpec.set(0x36404c), wetness);
      m.specular.copy(_tc.b);
      // #96: 폭풍은 벽면 광택을 한 단계 더 (GTA 레퍼런스 — 퍼붓는 날의 번들거림)
      m.shininess = m.userData.shininessDry + ((weather.type === 'storm' ? 38 : 28) - m.userData.shininessDry) * wetness;
    }
  });
}
function updateEnvironment(t, dt) {
  const wBadNow = weather.type === 'snow' || weather.type === 'rain' || weather.type === 'storm';
  // 눈: 내리는 동안 서서히 쌓이고, 그치면 녹는다. 겨울엔 잔설이 남는다.
  const season = seasonOf();
  const targetSnow = weather.type === 'snow' ? 1 : (season.id === 'winter' ? 0.3 : 0);
  snowCover += (targetSnow - snowCover) * Math.min(1, dt * 0.025);
  // 계절 색조 × 적설 × 젖음(#96): 눈은 세상을 밝히고, 비는 어둡고 푸르게 가라앉힌다 (같은 메커니즘의 역방향)
  const wetK = 1 - wetness * 0.34;
  vcLambert.color.setRGB(
    season.tint[0] * (1 + snowCover * 0.5) * wetK,
    season.tint[1] * (1 + snowCover * 0.58) * (wetK + wetness * 0.03),
    season.tint[2] * (1 + snowCover * 0.72) * (wetK + wetness * 0.1)
  );
  // 바람: 비/눈엔 강풍
  windLevel += ((wBadNow ? 2.3 : 1) - windLevel) * Math.min(1, dt * 0.6);
  // 셸터 겉면 상호작용: 젖음(반사 재질) / 벽 위 적설
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  const isWet = weather.type === 'rain' || weather.type === 'storm';
  const targetWet = (isWet && !indoorSh) ? 1 : 0;
  const wetSpeed = weather.type === 'storm' ? 0.2 : 0.1;
  wetness += (targetWet - wetness) * Math.min(1, dt * (targetWet ? wetSpeed : 0.02));
  if (Math.abs(wetness - wetApplied) > 0.03) applyWetness();
  for (const cap of weatherFx.caps) {
    cap.visible = !indoorSh && snowCover > 0.05;
    if (cap.visible) cap.scale.y = Math.min(1, snowCover * 1.1);
  }
  // #96 젖은 도시 구동: 첫 젖음에 지연 구축 → 웅덩이는 젖음에 비례해 배어들고, 스트릭은 밤에 진해지며
  //   매 프레임 카메라 요 방향으로 눕는다(레퍼런스의 '시선 쪽으로 번지는 반사').
  if (!wetFxBuilt && wetness > 0.04 && !indoorSh) buildWetFx();
  if (weatherFx.puddles) for (const p of weatherFx.puddles) {
    p.visible = wetness > 0.04;
    if (p.visible) p.material.opacity = Math.min(0.72, wetness * 0.85);
  }
  if (weatherFx.glints) {
    const hr = gameHour();
    const nightK = (hr < 6.5 || hr >= 17) ? 1 : 0.4;
    for (const gl of weatherFx.glints) {
      gl.visible = wetness > 0.08;
      if (gl.visible) { gl.material.opacity = Math.min(0.55, wetness * 0.55 * nightK); gl.rotation.z = camState.yaw; }
    }
  }
  // ③ 한파 실내 침투: 무방비(coldSnapNetSeverity>0) 한파 시 창유리 안쪽 성에가 서서히 짙어지고,
  //   방어 성공/한파 종료 시 서서히 사라진다. 강도는 순 페널티에 비례(방어 단계만큼 옅어짐).
  if (winFrostMats.length) {
    const netSev = coldSnapNetSeverity();
    const frostTarget = netSev > 0 ? Math.min(0.72, 0.34 + netSev * 0.19) : 0; // 방어 부족분 비례
    frostLevel += (frostTarget - frostLevel) * Math.min(1, dt * (frostTarget > frostLevel ? 0.2 : 0.35));
    if (frostLevel < 0.004) frostLevel = 0;
    for (const fm of winFrostMats) {
      fm.material.opacity = frostLevel;
      fm.visible = frostLevel > 0.004;
    }
  }
  if (envDyn.trees || envDyn.buildings) {
    // #70: 근경 나무/빌딩 가림 판정도 팬을 되돌린 앵글 기준 — 팬 중 소품이 깜빡이며 토글되지 않게(벽 컬링과 동일 사상).
    const cd = new THREE.Vector2(camera.position.x - camPanApplied.x - camCenter.x, camera.position.z - camPanApplied.z - camCenter.z).normalize();
    if (envDyn.trees) {
      for (const tr of envDyn.trees) {
        tr.obj.visible = tr.dir.dot(cd) < 0.5;
        // 바람에 흔들리는 잎사귀 (강풍이면 크게)
        tr.obj.rotation.z = Math.sin(t * (0.9 + windLevel * 0.3) + tr.phase) * tr.sway * windLevel * (1 + 0.4 * Math.sin(t * 2.3 + tr.phase * 2));
      }
    }
    if (envDyn.buildings) for (const b of envDyn.buildings) b.obj.visible = b.dir.dot(cd) < 0.4;
  }
  if (envDyn.leaves && !opts.lowSpec) {
    for (const L of envDyn.leaves) {
      const p = L.pts.geometry.attributes.position;
      for (let i = 0; i < L.meta.length; i++) {
        const m = L.meta[i];
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        y -= m.sp * (0.6 + windLevel * 0.4) * dt;
        x += Math.sin(t * 1.1 + m.ph) * 0.45 * windLevel * dt;
        z += Math.cos(t * 0.8 + m.ph) * 0.3 * windLevel * dt;
        if (y < 0.05) { y = 4.5 + Math.random() * 3; x = (Math.random() * 2 - 1) * 14; z = (Math.random() * 2 - 1) * 12; }
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
  }
  if (envDyn.smoke) {
    const p = envDyn.smoke.pts.geometry.attributes.position;
    const bx = envDyn.smoke.baseX ?? 24; // 기둥 기준 x (기존 도심 연기 = 24, F-1a 공용 기둥은 자체 값)
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + 0.9 * dt;
      if (y > 15.5) y = 2;
      p.setY(i, y);
      p.setX(i, bx + Math.sin(y * 0.5 + envDyn.smoke.phase[i]) * (0.5 + y * 0.09));
    }
    p.needsUpdate = true;
  }
  if (envDyn.fireflies && !opts.lowSpec) {
    const f = envDyn.fireflies;
    const p = f.pts.geometry.attributes.position;
    for (let i = 0; i < f.base.length; i++) {
      const b = f.base[i], ph = f.phase[i];
      p.setXYZ(i,
        b.x + Math.sin(t * 0.4 + ph * 2) * 0.6,
        b.y + Math.sin(t * 1.1 + ph) * 0.35,
        b.z + Math.cos(t * 0.5 + ph) * 0.6);
    }
    p.needsUpdate = true;
    f.pts.material.opacity = 0.5 + 0.3 * Math.sin(t * 2.3);
    f.pts.visible = dayness < 0.5; // 낮에는 반딧불이 없음
  }
  if (envDyn.fire) {
    envDyn.fire.intensity = envDyn.fireBase * (0.75 + 0.3 * Math.sin(t * 9) * Math.sin(t * 4.7) + 0.12 * Math.sin(t * 21));
  }
  // 실내 먼지 모트 느린 부유 (저사양 모드에선 갱신 스킵)
  if (!opts.lowSpec) {
    const p = dust.pts.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, p.getY(i) + Math.sin(t * 0.35 + dust.phase[i]) * 0.0009);
      p.setX(i, p.getX(i) + Math.sin(t * 0.22 + dust.phase[i] * 2) * 0.0006);
    }
    p.needsUpdate = true;
    dust.pts.material.opacity = 0.14 + 0.16 * (1 - dayness); // 밤 조명 아래서 더 또렷
  }
  if (envDyn.windmill) envDyn.windmill.rotation.z += dt * 0.5;      // 풍차
  if (envDyn.beam) envDyn.beam.rotation.y = t * 0.55;               // 등대 탐조등
  if (envDyn.sea) envDyn.sea.position.y = envDyn.seaBase + Math.sin(t * 0.5) * 0.08; // 파도
  // F-1a [B]: 흔들리는 천 — 바람세기 비례 미세 sway (있는 소품만). 저사양에서도 저비용(회전 1축).
  if (swayProps.length) {
    for (const s of swayProps)
      s.mesh.rotation.z = s.baseZ + Math.sin(t * (1.1 + windLevel * 0.4) + s.phase) * s.amp * (0.5 + windLevel * 0.5);
  }
}

/* ============================================================
   UI
============================================================ */
const $ = id => document.getElementById(id);

/* ============================================================
   이동/접기 가능한 패널 시스템 (위치는 localStorage에 저장)
============================================================ */
const UI_KEY = 'shelter-ui-v1';
let uiState = {};
try { uiState = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch (e) { uiState = {}; }
function saveUiState() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(uiState)); } catch (e) { /* */ }
}
// .panel 계열은 CSS `zoom: var(--uiz)`로 확대/축소된다. zoom이 걸린 요소의
// getBoundingClientRect()/pointer 좌표는 "화면에 보이는(visual)" 좌표계이지만,
// style.left/top(=position:absolute의 offset)은 줌이 적용되기 전(pre-zoom) 좌표계로
// 해석된다. 그래서 visual 좌표를 그대로 style.left/top에 되돌려 쓰면 다음 프레임에
// 줌 배율만큼 다시 튀어(누적 드리프트) 화면 밖으로 밀려난다 — 반드시 uiz로 나눠 보정한다.
function getUiz() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiz'));
  return v > 0 ? v : 1;
}
function clampPanel(el) {
  const z = getUiz();
  const r = el.getBoundingClientRect();
  // 숨김 패널(rect 0×0)은 절대 클램프하지 않는다 — 0,0으로 위치가 파괴되어
  // 다음에 열 때 좌상단(모바일 상태바 밑)에 깔리는 근본 원인이었다
  if (r.width === 0 && r.height === 0) return;
  // pre-zoom 좌표계로 환산
  const preL = r.left / z, preT = r.top / z, preW = r.width / z;
  // P1-D: 터치 기기에선 상단 상태바/펀치홀 회피용 최소 top 24px (몰입 모드 실패 대비 이중 안전장치)
  const minTop = isPcInput ? 0 : 24;
  const l = THREE.MathUtils.clamp(preL, 0, Math.max(0, innerWidth - Math.min(preW, 120)));
  const t = THREE.MathUtils.clamp(preT, minTop, Math.max(minTop, innerHeight - 30));
  el.style.left = l + 'px';
  el.style.top = t + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}
// 창 관리자: 패널 겹침 시 마지막으로 만진 패널이 항상 맨 앞에 오도록 z-index를 올려준다.
// 계층: .panel 10~40 < #modal-back 50 < .tip-note 55 < 수첩(journal) 60 < #fade-veil 99
let panelZTop = 10;
function bringPanelToFront(el) {
  panelZTop++;
  if (panelZTop > 40) {
    // 상한 도달 — 모달/수첩/베일 계층을 침범하지 않도록 전 패널 z를 재정규화
    const panels = [...document.querySelectorAll('.panel')].sort((a, b) => (+a.style.zIndex || 10) - (+b.style.zIndex || 10));
    panelZTop = 10;
    for (const p of panels) p.style.zIndex = ++panelZTop;
  }
  el.style.zIndex = panelZTop;
}
function makeDraggablePanel(el, key, title) {
  el.addEventListener('pointerdown', () => bringPanelToFront(el), true); // 캡처 단계: 패널 어디를 눌러도 최상단으로
  const head = document.createElement('div');
  head.className = 'p-head';
  head.innerHTML = `<span class="p-title">⠿ ${title}</span><button class="p-min" title="${t('panel.collapse')}">–</button>`;
  el.prepend(head);
  const saved = uiState[key];
  if (saved) {
    el.style.left = saved.l + 'px';
    el.style.top = saved.t + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
    if (saved.c) el.classList.add('collapsed');
  } else if ((innerWidth < 760 || innerWidth < 900 || innerHeight < 500) && (key === 'render' || key === 'res')) {
    el.classList.add('collapsed'); // 작은 창 기본: 설정·자원 접힘 (겹침 방지)
  }
  const minBtn = head.querySelector('.p-min');
  const syncMin = () => { minBtn.textContent = el.classList.contains('collapsed') ? '□' : '–'; };
  syncMin();
  minBtn.addEventListener('click', ev => {
    ev.stopPropagation();
    el.classList.toggle('collapsed');
    uiState[key] = { ...(uiState[key] || panelPos(el)), c: el.classList.contains('collapsed') };
    saveUiState();
    syncMin();
  });
  // panelPos: 저장용 — pre-zoom(=style.left/top과 같은) 좌표계로 환산해서 반환
  const panelPos = elm => { const z = getUiz(); const r = elm.getBoundingClientRect(); return { l: r.left / z, t: r.top / z }; };
  let drag = null;
  head.addEventListener('pointerdown', ev => {
    if (ev.target === minBtn) return;
    const z = getUiz();
    const r = el.getBoundingClientRect();
    // dx/dy는 visual 좌표계 안에서의 오프셋이므로 그대로 두되, 매 이동마다 pre-zoom으로 환산해 되돌린다
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top, id: ev.pointerId };
    el.classList.add('dragging');
    head.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  });
  head.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const z = getUiz();
    el.style.left = ((ev.clientX - drag.dx) / z) + 'px';
    el.style.top = ((ev.clientY - drag.dy) / z) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
  });
  const endDrag = ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    drag = null;
    el.classList.remove('dragging');
    clampPanel(el);
    uiState[key] = { ...panelPos(el), c: el.classList.contains('collapsed') };
    saveUiState();
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
}
// 화면 밖으로는 절대 나가지 않게 — 사용자가 옮겼든 기본 위치든 매 리사이즈마다 전 패널에 적용
function reclampAllPanels() {
  // #52: render-panel 제거 — 설정은 중앙 고정 오버레이(#settings-screen)라 클램프 대상 아님
  for (const id of ['hud', 'exp-panel', 'clock-panel', 'res-bar'])
    clampPanel($(id));
}
// 사용자가 드래그로 옮기지 않은(uiState 미저장) 패널은 화면 크기/스케일이 바뀔 때마다
// 실제 콘텐츠 높이 기준으로 겹치지 않게 재배치 (하드코딩된 top 값은 콘텐츠 높이 변화·
// UI 스케일 변화에 취약하므로, 기본 위치일 때만 다른 패널을 피해 이어붙인다).
// 완전한 무충돌을 보장하진 않지만(겹침은 허용), 대표적인 기본 배치 충돌(설정↔카메라 버튼,
// 자원↔설정, 탐험↔거처)은 해소한다.
function autoStackPanels() {
  const z = getUiz();
  // rect를 pre-zoom(=style.left/top과 같은 좌표계)으로 환산해서 반환
  const preRect = elm => {
    const r = elm.getBoundingClientRect();
    return { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z, width: r.width / z };
  };
  // #52: 설정이 중앙 고정 오버레이가 되면서 우상단 render-panel 자동 스택 로직은 불필요해졌다.
  // res-bar는 자체 기본 위치(CSS)를 사용한다.
  // 탐험 패널: hud 바로 아래로
  if (!uiState.exp && !uiState.hud && innerWidth >= 760) {
    const hud = $('hud');
    const exp = $('exp-panel');
    if (hud && exp) {
      const r = preRect(hud);
      exp.style.top = Math.round(r.bottom + 10) + 'px';
      exp.style.left = Math.round(r.left) + 'px';
      exp.style.right = 'auto'; exp.style.bottom = 'auto'; exp.style.transform = 'none';
    }
  }
}

/* ============================================================
   타이틀 화면 · 인트로 · 세이브 슬롯 UI
============================================================ */
let titleVisible = false;
let gameStarted = false; // 타이틀/인트로를 벗어나 실제 플레이 중인지 (부팅 중 쪽지 팁 발화 방지)
function showTitle() {
  titleVisible = true;
  // 타이틀에선 내 집만 조용히 보여준다 — 패널/설정창은 전부 숨김 (CSS)
  document.body.classList.add('title-mode');
  $('title-screen').style.display = 'flex';
  const meta = slotMeta(currentSlot);
  if (meta) {
    $('t-continue').style.display = '';
    $('t-continue-info').textContent = t('title.continueInfo', { slot: currentSlot, day: meta.day, sicon: meta.season.icon, semoji: meta.shelter.emoji, sname: LName(meta.shelter) })
      + (meta.winters >= 1 ? t('title.continueWinters', { n: meta.winters }) : '') // Nine Winters(#11)
      + (meta.mode === 'hard' ? ' 🔥' : meta.mode === 'zen' ? ' ♾️' : '');
  } else {
    $('t-continue').style.display = 'none';
  }
  // 현재 언어 버튼 표시
  const cur = opts.lang || 'ko';
  $('lang-ko')?.classList.toggle('primary', cur === 'ko');
  $('lang-en')?.classList.toggle('primary', cur === 'en');
  if (typeof syncBgm === 'function') syncBgm(); // Main_theme
}
function hideTitle() {
  titleVisible = false;
  gameStarted = true;
  document.body.classList.remove('title-mode');
  closeSettings(); // #52: 타이틀에서 열어둔 설정 창이 있으면 닫고 진입
  $('title-screen').style.display = 'none';
  // 타이틀 화면에선 .panel이 display:none이라 이전 onResize() 때 패널 크기가 0으로 측정됐다.
  // 실제 패널이 보이기 시작한 지금 다시 계산해 자동 배치를 맞춘다.
  onResize();
  // 자리 비운 사이의 정산(탐험 결과 등)은 게임에 들어온 뒤에 보여준다
  if (state.exp && Date.now() >= state.exp.end) resolveExpedition();
  syncBgm();
  // #74 데모: 이미 끝난 세이브로 입장하면 종료 화면부터 — 닫으면 봄의 거처 관람(시간 동결)만 가능
  if (DEMO_ED && state.demoEnded) setTimeout(showDemoEnd, 350);
}

// ── #74 Next Fest 데모 「첫 번째 겨울」 종료 화면 ──────────────────────────
// 첫 겨울을 넘긴 롤오버에서 아침 보고 대신 뜬다(tickTime 게이트). 시간 동결·취침/탐험 봉인과 한 세트 —
// ✕로 닫아도 진행은 없고, 봄이 온 거처를 둘러보는 것만 남는다.
function showDemoEnd() {
  // 페이퍼 레이어(수첩/튜토리얼)는 모달보다 위 — 떠 있으면 엔드 스크린을 덮는다(프로브 실측). 강제 정리.
  const jscr = $('journal-screen');
  if (jscr) { jscr.classList.remove('show'); jscr.style.display = 'none'; }
  journalOpen = false;
  const body = `
    <div class="demo-end">
      <div class="de-mark">🌱 ❄️ ❄️ ❄️ ❄️ ❄️ ❄️ ❄️ ❄️</div>
      <p class="de-body">${t('demo.end.body', { d: state.day })}</p>
      <p class="de-sub">${t('demo.end.sub')}</p>
      <button class="pixel-btn primary" id="demo-end-title">${t('demo.end.back')}</button>
    </div>`;
  openModal(t('demo.end.title'), body);
  $('demo-end-title').addEventListener('click', () => { closeModal(); showTitle(); });
}
// 슬롯 모드 배지 (하드/무한/하드코어/배경화면) — icon() 폴백 문법 대신 이모지 배지 유지
function slotModeBadge(mode) {
  if (mode === 'hard') return `<span class="sl-mode-hard" title="${t('slot.hardBadge.title')}">🔥</span>`;
  if (mode === 'hardcore') return `<span class="sl-mode-hard" title="${t('slot.hardcoreBadge.title')}">💀</span>`;
  if (mode === 'zen') return `<span class="sl-mode-zen" title="${t('slot.zenBadge.title')}">♾️</span>`;
  if (mode === 'wallpaper') return `<span class="sl-mode-zen" title="${t('slot.wallpaperBadge.title')}">🖼️</span>`;
  return '';
}
function openSlotModal(mode) {
  const cards = [];
  const count = slotDisplayCount(); // max(5, 채워진 최대 슬롯+1) — 항상 빈 칸 하나
  for (let n = 1; n <= count; n++) {
    const m = slotMeta(n);
    const ended = m && m.runEnded; // 끝난 기록(회고만)
    cards.push(`
      <div class="slot-card ${m ? '' : 'empty'} ${ended ? 'ended' : ''}" data-slot="${n}" data-has="${m ? 1 : 0}" data-ended="${ended ? 1 : 0}">
        ${m ? slotModeBadge(m.mode) : ''}
        ${m && m.qaUsed ? `<span class="sl-qa" title="QA 치트 사용됨" style="position:absolute;top:4px;left:4px;font-size:9px;background:#6b5a40;color:#1a1408;padding:1px 4px;border-radius:3px;font-weight:bold">QA</span>` : ''}
        <span class="sl-no">${n}</span>
        <div class="sl-body">${m
          ? `${m.shelter.emoji} ${LName(m.shelter)} — Day ${m.day} ${m.season.icon}${m.winters >= 1 ? ` <span class="sl-winters">❄️${m.winters}${m.mode === 'zen' ? '' : '/9'}</span>` : ''}${ended ? ` <span class="sl-ended">${t('slot.endedTag')}</span>` : ''}<br><span class="sl-meta">${t('slot.meta', { succ: m.successes, saved: m.saved })}</span>`
          : t('slot.empty')}</div>
        ${m ? `<button class="sl-del" data-del="${n}" title="${t('slot.del.title')}">🗑</button>` : ''}
      </div>`);
  }
  openModal(mode === 'new' ? t('slot.new') : t('slot.load'), `<div class="slot-scroll">${cards.join('')}</div>`);
  $('modal-body').querySelectorAll('.sl-del').forEach(b => b.addEventListener('click', async ev => {
    ev.stopPropagation();
    if (!(await gameConfirm(t('slot.delConfirm', { n: b.dataset.del }), t('confirm.delete'), t('confirm.cancel')))) return;
    localStorage.removeItem(slotKey(+b.dataset.del));
    localStorage.removeItem(slotKey(+b.dataset.del) + '-bak'); // P1-B: 롤링 백업도 함께 삭제
    // 삭제한 슬롯을 가리키던 lastslot 포인터도 정리 (빈 슬롯을 이어하기 대상으로 잡지 않도록)
    if (localStorage.getItem(LASTSLOT_KEY) === b.dataset.del) localStorage.removeItem(LASTSLOT_KEY);
    if (titleVisible) showTitle();                              // P1-B: '이어하기' 표시 즉시 갱신
    openSlotModal(mode);
  }));
  $('modal-body').querySelectorAll('.slot-card').forEach(c => c.addEventListener('click', async () => {
    const n = +c.dataset.slot, has = c.dataset.has === '1', ended = c.dataset.ended === '1';
    if (mode === 'load') {
      if (!has) { toast(t('toast.emptySlot')); return; }
      // 끝난 기록: 이어하기 불가 — 회고(마지막 요약)만 열람한다.
      if (ended) { openEndedRecord(n); return; }
      localStorage.setItem(LASTSLOT_KEY, String(n));
      sessionStorage.setItem('ps-load', '1'); // 리로드 후 타이틀 건너뛰고 바로 게임 (밀린 결산 표시)
      location.reload();
    } else {
      // 덮어쓰기 확인은 슬롯 클릭 시점에만 (모드 화면 뒤 재선택 시 재확인은 허용)
      if (has && !(await gameConfirm(t('slot.newConfirm', { n }), t('confirm.overwrite'), t('confirm.cancel')))) return;
      openModeModal(n);
    }
  }));
}
// 새 게임: 슬롯 선택 후 모드 5종(노말/하드/하드코어/무한/배경화면)을 고르는 화면 (같은 모달의 body 교체)
function openModeModal(n) {
  const card = (mode, titleId, tagId, descId, opt = {}) => {
    const lock = opt.locked;
    return `
    <div class="slot-card mode-card ${lock ? 'locked' : ''}" data-mode="${mode}" data-locked="${lock ? 1 : 0}">
      <div class="sl-body">
        <div class="mc-title">${lock ? '🔒 ' : ''}${t(titleId)}</div>
        <div class="mc-tag">${t(tagId)}</div>
        <div class="sl-meta">${lock ? t('mode.wallpaper.lock', { n: BAL.rescue.unlockDay }) : t(descId)}</div>
      </div>
    </div>`;
  };
  const wpLocked = !wallpaperUnlocked();
  // #74 데모: 노말만 — 모드 다양성은 정식판의 것 (Next Fest 「첫 번째 겨울」 게이트와 한 몸)
  const body = `<div class="mode-scroll">`
    + card('normal', 'mode.normal', 'mode.normal.tag', 'mode.normal.desc')
    + (DEMO_ED ? '' : card('hard', 'mode.hard', 'mode.hard.tag', 'mode.hard.desc')
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
const INTRO_IDS = ['intro.0', 'intro.1', 'intro.2'];
function showIntro() {
  let i = 0;
  const scr = $('intro-screen'), txt = $('intro-text');
  scr.style.display = 'flex';
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = t(INTRO_IDS[i]).replace(/\n/g, '<br>');
    $('intro-next').textContent = i === INTRO_IDS.length - 1 ? t('intro.start') : t('intro.next');
  };
  $('intro-next').addEventListener('click', () => {
    i++;
    if (i >= INTRO_IDS.length) {
      scr.style.display = 'none';
      gameStarted = true;
      toast(t('intro.firstShelter'));
      // 신규 게임: 인트로 종료 직후 수첩 1페이지 (Day 1 튜토리얼 — '물부터')
      if (state.tutDay < 1) showTutorialPage(1);
    } else render();
  });
  render();
}

/* ============================================================
   엔딩 (v1.9) — Day 10000, 박사의 구조 (이때만 Ending OST)
============================================================ */
let endingActive = false;
function runEndingSequence() {
  endingActive = true;
  closeModal();
  setPaused(false);
  syncBgm(true); // Ending.mp3
  playSfx('heli');
  const dayStr = state.day.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR');
  const lines = [
    t('ending.line0'),
    t('ending.line1', { day: dayStr }),
    t('ending.line2') + (state.cat ? t('ending.line2cat') : ''),
    t('ending.line3'),
    t('ending.line4', { day: dayStr, succ: state.successes, cat: state.cat ? t('ending.catTag') : '' }),
  ];
  let i = 0;
  const scr = $('ending-screen'), txt = $('ending-text'), btn = $('ending-next');
  scr.style.display = 'flex';
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = lines[i];
    btn.textContent = i === lines.length - 1 ? t('ending.back') : t('intro.next');
  };
  btn.onclick = () => { // onclick 대입: 재실행 시 리스너 중복 방지
    i++;
    if (i >= lines.length) {
      scr.style.display = 'none';
      state.endingSeen = true;
      endingActive = false;
      state.dayLog.notes.push(t('ending.note'));
      scheduleSave();
      syncBgm();
      toast(t('ending.epilogue'));
    } else render();
  };
  render();
}

function updateClock() {
  const h = Math.floor(gameHour()), m = Math.floor(state.gameMin % 60);
  const se = seasonOf();
  $('lcd-day').textContent = t('clock.dayLine', { day: String(state.day).padStart(2, '0'), sicon: se.icon, sname: LName(se), sd: seasonDay(), total: SEASON_DAYS });
  $('lcd-time').innerHTML = `${String(h).padStart(2, '0')}<span id="lcd-colon">:</span>${String(m).padStart(2, '0')}`;
  const [timeIcon, label] = timeLabel();
  $('lcd-sub').innerHTML = `${timeIcon} ${label} · ${wxIcon(weather.type)}${state.injury ? ' · ' + INJURIES[state.injury.type].icon : ''}`;
}

function updateHud() {
  // 🖼️ 배경화면 모드: 게이지/탐험 패널을 숨긴다(CSS). 압박 UI가 없는 순수 가꾸기.
  document.body.classList.toggle('wallpaper-mode', isWallpaper());
  const sh = SHELTERS[state.current];
  const W = WEATHERS[weather.type];
  const cd = comfortDetail();
  const lv = Math.min(5, Math.round(cd.score / 20));
  const bonus = Math.round(comfortExpBonus() * 100);
  const injIcon = state.injury ? ` ${INJURIES[state.injury.type].icon}` : '';
  const dist = DISTRICTS[districtOf(state.current)];
  $('hud-shelter').textContent = t('hud.shelterLine', { demoji: dist.emoji, dname: LName(dist), semoji: sh.emoji, sname: LName(sh) });
  const comfortTip = t('hud.comfortTip', {
    score: cd.score, furn: cd.furn, light: cd.light, clean: cd.cleanMod, shelter: cd.shelterMod,
    settled: cd.settled ? t('hud.comfortSettled', { n: cd.settled }) : '',
    cat: cd.catMod ? t('hud.comfortCat', { n: cd.catMod }) : '',
    injury: cd.injuryMod ? t('hud.comfortInjury', { n: cd.injuryMod }) : '',
    limit: cd.limitMod ? t('hud.comfortLimit', { n: cd.limitMod }) : '',
    bonus: bonus ? t('hud.comfortBonus', { n: bonus }) : '',
  });
  // 아이콘 중심 상태 표시 (자세한 설명은 툴팁으로)
  $('hud-stat').innerHTML =
    `${W.icon}${W.penalty ? `<span style="color:var(--bad)">-${Math.round(W.penalty * 100)}%</span>` : ''}` +
    `${injIcon ? `<span title="${state.injury ? LName(INJURIES[state.injury.type]) : ''}">${injIcon}</span>` : ''}` +
    `${cd.limitMod ? ` <span style="color:var(--bad)" title="${LLimits(sh) || ''}">⚠️</span>` : ''}` +
    `${state.buff ? ` <span style="color:var(--good)" title="${buffLabel(state.buff)}">✨</span>` : ''}` +
    ` · <span style="color:var(--accent)" title="${comfortTip}">😊${cd.score} ${'★'.repeat(lv)}</span>` +
    ` · <span title="${t('hud.cleanTip')}">🧹${Math.round(cd.clean)}</span>` +
    ` · <span title="${t('hud.expTip', { n: state.expToday, max: EXP_PER_DAY })}">🎒${state.expToday}/${EXP_PER_DAY}</span>` +
    ` · <span title="${t('hud.succTip')}">🏆${state.successes}</span>` +
    // Nine Winters(#11): 넘긴 겨울 배지 — 1겨울부터 노출. 9 초과는 약속을 넘어선 시간 → accent
    ((state.winters || 0) >= 1
      ? ` · <span class="hud-winters${state.winters > 9 ? ' beyond' : ''}" title="${t('winter.badge.tip', { n: state.winters })}">❄️${state.winters}${isZen() ? '' : '/9'}</span>`
      : '');
  renderGauge('g-hunger', state.hunger, 'hunger', '🥫');
  renderGauge('g-thirst', state.thirst, 'thirst', '💧');
  renderGauge('g-energy', state.energy, 'energy', '⚡');
}
function renderGauge(id, val, gkey, emoji) {
  const g = $(id);
  if (!g) return;
  const fill = g.querySelector('.g-fill');
  fill.style.width = Math.max(0, Math.round(val)) + '%';
  fill.className = 'g-fill' + (val < 25 ? ' crit' : val < 45 ? ' warn' : '');
  g.querySelector('.g-label').innerHTML = `${icon(GAUGE_ICON[gkey], emoji)} ${Math.round(val)}${val <= 0 ? t('gauge.exhausted') : ''}`;
}
let lastResSnapshot = {};
function renderResBar() {
  const bar = $('res-chips');
  const wp = isWallpaper();
  bar.innerHTML = Object.entries(RESOURCES).map(([id, r]) => {
    const n = state.res[id] || 0;
    const changed = !wp && lastResSnapshot[id] != null && lastResSnapshot[id] !== n;
    return `<div class="res-chip ${!wp && n === 0 ? 'zero' : ''} ${changed ? 'flash' : ''}" title="${LName(r)}">
      <span class="re">${resIcon(id)}</span><span class="rname">${LName(r)}</span><span class="rn">${wp ? '∞' : n}</span>
    </div>`;
  }).join('');
  lastResSnapshot = { ...state.res };
  updateMoveBadge();
}
function cleanShelter() {
  if (paused) { toast(t('pause.blocked')); return; }
  const c = state.cleanBy[state.current] ?? 70;
  if (c >= 100) { toast(t('clean.already')); return; }
  if (state.energy < 10) { toast(t('clean.tooTired')); return; }
  if (!resConsume('water', 1)) { toast(t('clean.needWater')); return; }
  state.energy = Math.max(0, state.energy - 5);
  if (state.energy < 20) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  state.cleanBy[state.current] = Math.min(100, c + 20);
  toast(t('clean.done', { n: Math.round(state.cleanBy[state.current]) }));
  state.dayLog.notes.push(t('clean.note'));
  questProgress('clean');
  scheduleSave();
  renderResBar();
  updateHud();
}

/* ============================================================
   Nine Winters(#11) — 겨울을 넘기다: 카운터 + "그 해 겨울" 수첩 + 9겨울 마일스톤
============================================================ */
// 겨울 memoir 서사 마무리 1줄 (겨울 번호별 9종). 10 이상은 9를 넘어선 톤(.beyond).
function winterMemoirLine(n) {
  if (n >= 9) return t(n === 9 ? 'winter.memoir.9' : 'winter.memoir.beyond');
  return t('winter.memoir.' + n);
}
// memoir 페이지 1장을 구성해 큐에 넣는다. 스냅샷과의 차분으로 이번 겨울을 요약.
function buildWinterMemoir(n) {
  const snap = state.winterSnap;
  // 스냅샷이 없으면(마이그레이션 절충 — 겨울 진입을 못 본 구세이브) memoir를 건너뛴다.
  if (!snap) return;
  const acc = snap.acc || { coldSnaps: 0, defended: 0, fuel: 0 };
  const days = Math.max(1, state.day - snap.day); // 이 겨울 동안 버틴 날수 (봄 첫날 - 겨울 첫날)
  const expWon = Math.max(0, (state.stats?.success || 0) - (snap.successStart || 0));
  const catLine = state.cat ? t('winter.memoir.catYes') : t('winter.memoir.catNo');
  // n=1은 "첫 겨울"(규칙 이탈 "1번째 겨울" 교정), 2~9는 기존 "{n}번째 겨울" 자연 표기 유지.
  const titleId = n === 1 ? 'winter.page.title.first' : 'winter.page.title';
  // 탐험 0회면 "0번 건졌다" 기계문 대신 "나서지 못한 겨울" 분기.
  const bodyId = expWon === 0 ? 'winter.page.body.noexp' : 'winter.page.body';
  const page = {
    titleId, titleArgs: { n },
    bodyId,
    bodyArgs: {
      days, cold: acc.coldSnaps, defended: acc.defended, exp: expWon, fuel: acc.fuel,
      cat: catLine, closing: winterMemoirLine(n),
    },
  };
  state.pendingWinterMemoir.push(page);
}
// 9번째 겨울 마일스톤: 특별 페이지 + 업적 + 박사 무전 예약
function buildNinthWinterMilestone() {
  const st = state.stats || {};
  const page = {
    titleId: 'winter.ninth.title',
    bodyId: 'winter.ninth.body',
    bodyArgs: {
      day: state.day, exp: st.success || 0, craft: st.craft || 0,
      cat: state.cat ? t('winter.memoir.catYes') : t('winter.memoir.catNo'),
    },
  };
  state.pendingWinterMemoir.push(page);
  // 업적: chk:()=>state.winters>=9 로 자동 해금 (state.winters는 passWinter에서 이미 9로 세팅됨).
  // 즉시 노출을 위해 여기서도 트리거 (checkAchievements는 self-init·멱등).
  checkAchievements();
  // 박사 첫 무전: 라디오가 배치돼 있으면 그날 밤 1회, 없으면 다음 라디오 배치일까지 대기
  state.doctorRadioPending = true;
}
// 겨울을 넘겼다 — 카운터 +1, memoir 큐 적재, 9겨울이면 마일스톤. 새 스냅샷은 다음 겨울 진입 때.
function passWinter(notes) {
  state.winters = (state.winters || 0) + 1;
  buildWinterMemoir(state.winters);
  if (state.winters === 9) buildNinthWinterMilestone();
  notes.push(t('winter.passed', { n: state.winters }));
  state.winterSnap = null; // 이번 겨울 스냅샷 소진 — 다음 겨울 진입 때 새로 뜬다
}
// 박사 무전 발화 시도 (밤, 라디오 보유 시). processDay 말미에서 호출.
function tryDoctorRadio() {
  if (state.pendingEvent) return;                    // 다른 인카운터 대기 중이면 다음 날
  // 9겨울 첫 무전 (라디오 보유 시)
  if (state.doctorRadioPending) {
    if (!items.some(i => i.defId === 'radio')) return; // 라디오 미보유 → 다음 배치일까지 보류
    state.doctorRadioPending = false;
    state.pendingEvent = 'doctor_radio';
    state.lastEventDay = state.day;
    return;
  }
  // 1.4 정기 교신 — 모든 수집물을 송출한 뒤 개방. 무전 기지를 세운 사람이라 라디오 보유 조건은 두지 않는다(기지가 곧 무전).
  if (state.doctorRadioRegularPending && !state.doctorRegularSeen) {
    state.doctorRadioRegularPending = false;
    state.pendingEvent = 'doctor_radio_regular';
    state.lastEventDay = state.day;
  }
}
// 라디오 방송 청취 시도 (#12) — 라디오 배치+ON, 하루 1회, BAL 확률로 미수집 방송 1개 예약.
function tryRadioBroadcast(notes) {
  if (state.lastBroadcastDay === state.day) return;      // 하루 1회
  if (!items.some(i => i.defId === 'radio' && i.on !== false)) return; // 라디오 ON 필요
  if (Math.random() >= BAL.events.radioListenChance) return;
  const un = Object.keys(BROADCASTS).filter(id => !(state.broadcasts || {})[id]);
  if (!un.length) return;                                // 다 모음
  const id = un[Math.floor(Math.random() * un.length)];
  state.lastBroadcastDay = state.day;
  state.pendingBroadcast = id;                           // tickTime 이 결산 뒤 모달로 연다
  notes.push(t('radio.heardNote', { title: LN(BROADCASTS[id]) }));
}

/* ============================================================
   하루 처리 & 일일 리포트 (기획서 v0.2: SYSTEM 03/04/07)
============================================================ */
function processDay() {
  // 롤링 백업: 하루가 바뀌는 시점에 어제까지의 세이브를 -bak 키로 보관
  try {
    const cur = localStorage.getItem(slotKey(currentSlot));
    if (cur) localStorage.setItem(backupKey(currentSlot), cur);
  } catch (e) { /* 저장 실패는 무시 */ }
  const notes = state.dayLog.notes;
  const perk = SHELTERS[state.current].perk || {};
  state.expToday = 0; // 새 하루, 새 걸음
  state.icefishToday = 0; // 1.1: 얼음낚시 하루 스팟 리셋
  state.marketToday = 0;  // 1.2: 암시장 하루 교환 슬롯 리셋
  state.nightSkyToday = 0; // 1.3: 밤하늘 이벤트 하루 1회 리셋
  // 첫 3일 튜토리얼: Day 2/3 아침에 다음 페이지를 표시 대기열에 넣는다 (day-report 뒤로 미룸)
  // tutDay>=1: Day 1 페이지(신규 게임)를 이미 본 경우에만 이어서 진행 — 구세이브는 tutDay 0 그대로라 대상 아님
  // 퀘스트 트래커가 아직 진행 중이면(questActive) 온보딩 중복을 피하려고 자동 페이지를 띄우지 않는다
  if ((state.day === 2 || state.day === 3) && state.tutDay >= 1 && state.tutDay < state.day && !questActive()) {
    state.pendingTutorial = state.day; // 이틀치가 한 번에 지나가면(오프라인 정산) 최신 페이지로 갱신
  }
  // 정든 집
  state.stayDays = (state.stayDays || 0) + 1;
  if (state.stayDays === 3) notes.push(t('settled.3'));
  if (state.stayDays === 8) notes.push(t('settled.8'));
  // 계절 전환
  if (seasonOf(state.day).id !== seasonOf(state.day - 1).id) {
    const se = seasonOf(state.day);
    const prev = seasonOf(state.day - 1);
    notes.push(t('season.arrived', { icon: se.icon, name: LName(se), desc: LDesc(se) }));
    toast(t('season.changed', { icon: se.icon, name: LName(se) }));
    rollWeather(); // 새 계절의 날씨로
    if (se.id === 'winter') { tipOnce('tip.winter'); beginWinterSnapshot(); } // 겨울 진입: memoir용 스냅샷
    // ── Nine Winters(#11): 겨울을 "넘긴" 순간 = 겨울 마지막 날을 거처에서 맞고 봄으로 넘어온 오늘
    if (prev.id === 'winter' && se.id === 'spring') passWinter(notes);
  }
  // ── 한파 (겨울 보스): 예보 → 발동 → 지속 → 종료 (Phase B) ──
  {
    const wk = seasonIndex(state.day);
    if (state.coldSnapWinterKey !== wk) { state.coldSnapWinterKey = wk; state.coldSnapsThisWinter = 0; } // 겨울 바뀌면 카운터 리셋
    const inWinter = seasonOf(state.day).id === 'winter';
    const S = BAL.seasons;
    // 1) 예보된 한파가 도래하면 발동
    if (inWinter && state.coldSnapForecast > 0 && state.day >= state.coldSnapForecast && !state.coldSnap) {
      const dur = S.coldSnapMinDur + Math.floor(Math.random() * (S.coldSnapMaxDur - S.coldSnapMinDur + 1));
      state.coldSnap = { until: state.day + dur - 1, severity: 1 };
      state.coldSnapForecast = 0;
      state.coldSnapsThisWinter++;
      if (state.winterSnap?.acc) state.winterSnap.acc.coldSnaps++; // memoir: 이번 겨울 한파 횟수
      notes.push(t('coldsnap.hit'));
      toast(t('coldsnap.toast'));
    }
    // 2) 진행 중인 한파: 오늘 방어 여부에 따른 서사 (하루 1회)
    if (state.coldSnap && inWinter && state.day <= state.coldSnap.until) {
      const defended = coldSnapNetSeverity() <= 0;
      if (defended && state.winterSnap?.acc) state.winterSnap.acc.defended++; // memoir: 방어 성공한 한파-일
      notes.push(defended ? t('coldsnap.defended') : t('coldsnap.exposed'));
    }
    // 3) 한파 종료
    if (state.coldSnap && (!inWinter || state.day > state.coldSnap.until)) {
      state.coldSnap = null;
      notes.push(t('coldsnap.ended'));
    }
    // 4) 예보 발령: 겨울 중, 미발동·미예보, 겨울당 상한 미만, 확률 판정 → 리드타임 뒤로 예약
    //    하드는 한파가 더 잦고(확률 ×1.6) 더 많이 온다(상한 +1) — "첫 겨울이 진짜 시험" (v1.0.0)
    const snapCap = S.coldSnapMaxPerWinter + (isHard() ? BAL.hard.coldSnapExtraPerWinter : 0);
    // 1.3 고도 페널티: 고원 셸터(altitude) 거주 시 한파가 더 잦다 (확률 배수). 로지 단열/벽난로가 페널티를 상쇄.
    const altMul = SHELTERS[state.current].altitude ? BAL.highland.altitudeColdSnapChanceMul : 1;
    const snapChance = S.coldSnapChancePerDay * (isHard() ? BAL.hard.coldSnapChanceMul : 1) * altMul;
    // v1.4.1(오디트 E P1-1): 하드 한정 예보 리드 단축 → 발령 창 확대. 노말은 기존 값(2) 유지.
    const fcDays = isHard() ? BAL.hard.coldSnapForecastDaysOverride : S.coldSnapForecastDays;
    if (inWinter && !state.coldSnap && state.coldSnapForecast === 0 &&
        state.coldSnapsThisWinter < snapCap &&
        seasonDay(state.day) <= SEASON_DAYS - fcDays - 1 && // 겨울 끝에 걸치지 않게
        Math.random() < snapChance) {
      // 관제탑 퍽(forecastLead): 고층 전망으로 한파 예보 리드타임 +N일. 없으면 0.
      const lead = SHELTERS[state.current].perk?.forecastLead || 0;
      state.coldSnapForecast = state.day + fcDays + lead;
    }
  }
  // ── 1.3 눈사태 (겨울 고원 재난 2호): 예보(우르릉) → 당일 리조트 탐험에 우회 선택 or 봉쇄 ──
  //   한파 예보 문법 재사용. 리조트가 해금돼 있고 겨울일 때만 의미. cozy 캐논: 사망 없음(부상/시간 손실 계열).
  {
    const H = BAL.highland;
    const inWinter = seasonOf(state.day).id === 'winter';
    const resortOpen = regionUnlocked('resort'); // 로지 해금 후에만
    // 1) 봉쇄 만료
    if (state.avalancheBlockUntil > 0 && state.day > state.avalancheBlockUntil) {
      state.avalancheBlockUntil = 0;
      notes.push(t('avalanche.cleared'));
    }
    // 2) 예보 발령 (겨울·리조트 개방·미예보·미봉쇄·확률). 리드타임 뒤 "당일"이 오면 그날 리조트 탐험 시 선택지.
    if (inWinter && resortOpen && state.avalancheForecast === 0 && state.avalancheBlockUntil === 0 &&
        Math.random() < H.avalancheChancePerDay) {
      state.avalancheForecast = state.day + H.avalancheForecastDays;
      notes.push(t('avalanche.forecast'));
    }
    // 3) 예보 당일이 지났는데 손대지 않았으면(리조트 탐험 안 함) → 자연 봉쇄로 전환 (avalancheDur일)
    else if (state.avalancheForecast > 0 && state.day > state.avalancheForecast) {
      state.avalancheForecast = 0;
      state.avalancheBlockUntil = state.day + H.avalancheDur - 1;
      notes.push(t('avalanche.blocked'));
    }
  }
  // 1) 발전기: 연료를 태우면 그날 배터리 소비가 무료
  let freePower = false;
  for (const it of items) {
    if (DEFS[it.defId].appliance?.effect !== 'power' || it.on === false) continue;
    if (resConsume('fuel', 1)) {
      freePower = true;
      notes.push(t('day.genRun'));
    } else {
      setItemPower(it, false);
      notes.push(t('day.genStop'));
    }
  }
  const consumeFuel = (fuelId, n = 1) => (fuelId === 'battery' && freePower) ? true : resConsume(fuelId, n);
  // 2) 켜진 조명·가전의 일일 연료 소비 (부족 시 자동 꺼짐)
  // v0.9.1: 캔들 스툴(candle 가구)만 이틀에 1개 소비로 완화 — 그 외(랜턴 등)는 매일 그대로
  for (const it of items) {
    const def = DEFS[it.defId];
    const fuelId = def.light?.fuel || (def.appliance?.effect !== 'power' ? def.appliance?.fuel : null);
    if (!fuelId || it.on === false) continue;
    if (it.defId === 'candle' && state.day % 2 === 0) continue; // 캔들 스툴은 격일 소비
    if (!consumeFuel(fuelId, 1)) {
      setItemPower(it, false);
      notes.push(t('day.fuelOut', { fuel: LName(RESOURCES[fuelId]), name: LName(def) }));
    }
  }
  // 3) 생산: 정수기 / 자동 급수기 / 거처 특성 (온실 텃밭, 여객선 낚시)
  // 수도관 동파(frozen_pipe) 방치 시 정수기 계열이 며칠 멎는다.
  const pipeFrozen = state.day <= (state.pipeFrozenUntil || 0);
  if (pipeFrozen) notes.push(t('ev.frozenpipe.note1'));
  for (const it of items) {
    const eff = DEFS[it.defId].appliance?.effect;
    if (eff === 'water' && it.on !== false && !pipeFrozen) {
      resAdd('water', BAL.economy.purifierWaterPerDay);
      notes.push(t('day.purifier'));
    } else if (eff === 'water2' && it.on !== false && !pipeFrozen) {
      resAdd('water', BAL.economy.autoWaterPerDay);
      notes.push(t('day.autopurifier', { n: BAL.economy.autoWaterPerDay }));
    }
  }
  if (perk.produce) {
    // 겨울엔 텃밭이 얼어붙는다 (온실 재배 중단, 낚시는 가능)
    if (seasonOf().id === 'winter' && state.current === 'greenhouse') {
      notes.push(t('day.gardenFrozen'));
    } else {
      for (const [rid, n] of Object.entries(perk.produce)) {
        resAdd(rid, n);
        notes.push(t('day.produce', { note: LF(perk, 'produceNote'), emoji: RESOURCES[rid].emoji, n }));
      }
    }
  }
  // 4) 음식 부패: 가동 중인 냉장고가 없으면 매일 신선식품만 -1 (통조림은 부패하지 않음)
  const fridgeOn = items.some(it => DEFS[it.defId].appliance?.effect === 'fridge' && it.on !== false);
  // 찢어진 쪽지: 냉장고 없이 신선식품을 보유한 첫 순간 — 오늘 먹으라는 조언 (1회성)
  if (!fridgeOn && (state.res.food || 0) > 0) tipOnce('tip.freshfood');
  if (!fridgeOn && (state.res.food || 0) > 0) {
    // 여름엔 부패 가속 (×summerSpoilMult, 소수부는 확률 반올림으로 기댓값 보존)
    let spoil = BAL.economy.foodSpoilPerDay;
    if (seasonOf().id === 'summer') { const x = spoil * BAL.seasons.summerSpoilMult; spoil = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0); }
    resConsume('food', spoil);
    notes.push(t(seasonOf().id === 'summer' ? 'day.foodSpoiledSummer' : 'day.foodSpoiled'));
  } else if (fridgeOn) {
    notes.push(t('day.foodFresh'));
  }
  // 청결도 일일 감소 + 거처별 현실 제약
  const sh = SHELTERS[state.current];
  const wBad = state.weatherType === 'rain' || state.weatherType === 'snow' || state.weatherType === 'storm';
  let dirt = BAL.economy.dailyDirt; // v0.9.1: 일일 청결 감소 2 → 1 완화
  if (sh.dailyDirt) { dirt += sh.dailyDirt; notes.push(t('day.seaDamp')); }
  if (sh.weatherDirt && wBad) { dirt += sh.weatherDirt; notes.push(t('day.openWet', { icon: WEATHERS[state.weatherType].icon })); }
  if (sh.stormRepair && sh.stormRepair.includes(state.weatherType) && !hasMod('roof')) {
    if (resConsume('material', 1)) notes.push(t('day.roofRepair'));
    else { dirt += 8; notes.push(t('day.roofLeak')); }
  }
  if (sh.rainCatch && wBad) {
    resAdd('water', sh.rainCatch);
    notes.push(t('day.rooftopRain', { n: sh.rainCatch }));
  }
  // 돔 벙커 천장 구멍(#36): 임시덮개/완전수리 전에는 비 오는 날 청결이 더 떨어진다.
  if (state.current === 'bunker' && state.bunkerRoof === 'hole' && wBad) {
    dirt += BAL.economy.bunkerRoofDirtPerDay;
    notes.push(t('bunker.roofNote'));
  }
  // 옥탑 슬레이트 지붕(#53): 두 장 빠진 상태(gapped)에서는 비/눈 오는 날 청결이 소폭 더 떨어진다. (벙커 천장 문법)
  if (state.current === 'rooftop' && (state.rooftopSlate || 'gapped') !== 'full' && wBad) {
    dirt += BAL.economy.rooftopSlateDirtPerDay;
    notes.push(t('rooftop.slateNote'));
  }
  // 거처 개조 효과
  if (hasMod('raincatch') && wBad) {
    const n = hasMod('bigraincatch') ? BAL.economy.bigRaincatchWater : 1;
    resAdd('water', n); notes.push(t(hasMod('bigraincatch') ? 'day.bigraincatch' : 'day.raincatch', { n }));
  }
  if (hasMod('garden') && state.day % 2 === 0) {
    if (seasonOf().id === 'winter') notes.push(t('day.gardenBoxFrozen'));
    else { resAdd('food', 1); notes.push(t('day.gardenBox')); }
  }
  // 옥상 텃밭(#53): 매일 생산. 겨울엔 휴면(0). 생산량 = 기본 × 옥탑 퍽 gardenMult(2). 성장 단계 진행(시각).
  if (hasMod('rooftopGarden')) {
    if (seasonOf().id === 'winter') {
      notes.push(t('rooftop.gardenDormant'));
    } else {
      const n = BAL.economy.rooftopGardenFoodPerDay * (perk.gardenMult || 1);
      resAdd('food', n);
      notes.push(t('rooftop.gardenHarvest', { n }));
      // 성장 단계 진행 (0→1→2에서 멈춤) — 시각 연출용
      if ((state.rooftopGardenStage ?? 0) < 2) state.rooftopGardenStage = (state.rooftopGardenStage ?? 0) + 1;
    }
  }
  // 1.2 버섯 재배칸(subway 전용): 어둠 속 연중 생산(겨울 포함). 옥탑 텃밭의 대칭 — 볕/여름 vs 어둠/연중.
  //   매일 음식 +1, mushroomWaterEvery(2)일마다 물 1 소모. 물이 없으면 그날 수확 없음(습기 없이는 못 자란다).
  if (hasMod('mushroom')) {
    const M = BAL.subway;
    state.mushroomWaterTimer = (state.mushroomWaterTimer || 0) + 1;
    let watered = true;
    if (state.mushroomWaterTimer >= M.mushroomWaterEvery) {
      state.mushroomWaterTimer = 0;
      if (resConsume('water', M.mushroomWater)) { notes.push(t('subway.mushroomWater', { n: M.mushroomWater })); }
      else { watered = false; notes.push(t('subway.mushroomDry')); }
    }
    if (watered) { resAdd('food', M.mushroomFoodPerDay); notes.push(t('subway.mushroomHarvest', { n: M.mushroomFoodPerDay })); }
  }
  if (hasMod('solar') && state.day % 2 === 1) { resAdd('battery', 1); notes.push(t('day.solar')); }
  // #76 지식과 사치: 잉여 식량을 암시장에 내다 팔아 책(지식)으로 — 후반 무한 인플레의 캡.
  //   food+canned 합이 surplusCap 위로 넘칠 때만, 초과분을 하루 sellPerDay까지 판다. 임계치가 곧 안착선이라
  //   Day30/60 밴드(110~160 / 122~147)는 구조적으로 불가침 — 후반 폭주분만 깎는다(목표 300~400).
  //   신선식품부터 판다(부패 전에 내다 판다는 개연성). 판 누적이 perBook마다 책 1권. 노트는 책 얻은 날만(리포트 청결).
  if (!isWallpaper()) {
    const LX = BAL.luxury;
    const cap = LX.surplusCap[state.mode] ?? LX.surplusCapDefault; // 난이도별 안착선 (하드/하드코어일수록 낮다 = 더 빡세다)
    const surplus = (state.res.food || 0) + (state.res.canned || 0);
    if (surplus > cap) {
      const sell = Math.min(surplus - cap, LX.sellPerDay);
      const sellFood = Math.min(sell, state.res.food || 0);
      if (sellFood > 0) resConsume('food', sellFood);
      if (sell - sellFood > 0) resConsume('canned', sell - sellFood);
      state.bookProgress = (state.bookProgress || 0) + sell;
      let earnedBooks = 0;
      while (state.bookProgress >= LX.perBook) { state.bookProgress -= LX.perBook; earnedBooks++; }
      if (earnedBooks > 0) { resAdd('book', earnedBooks); notes.push(t('day.surplusSold', { n: sell, b: earnedBooks })); }
    }
  }
  state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - dirt);
  if (state.cleanBy[state.current] < 20) notes.push(t('day.veryDirty'));
  // 셸터 유지비
  const up = sh.upkeep;
  if (up) {
    if (state.day % up.every === 0) {
      if (resConsume(up.res, up.n)) {
        state.upkeepOk = true;
        notes.push(t('day.upkeepPaid', { emoji: RESOURCES[up.res].emoji, name: LName(RESOURCES[up.res]), n: up.n }));
      } else {
        state.upkeepOk = false;
        notes.push(t('day.upkeepUnpaid', { label: LLabel(up) }));
      }
    }
  } else state.upkeepOk = true;
  // 1.3 고도 페널티 — 고원 셸터(altitude) 거주 시 연료 소모 +30%. 그날 태운 연료(벽난로 유지비 + 연료 조명/가전)의
  //   30%를 추가 지불한다(기댓값 = ×1.3). 소수부는 확률 반올림으로 기댓값 보존. 연료 없으면 벽난로 온기 정지(upkeepOk).
  if (SHELTERS[state.current].altitude) {
    let baseFuel = 0;
    if (up && up.res === 'fuel' && state.day % up.every === 0 && state.upkeepOk) baseFuel += up.n; // 유지비 연료
    for (const it of items) { // 연료를 태우는 조명/가전
      if (it.on === false) continue;
      const def = DEFS[it.defId];
      const fuelId = def.light?.fuel || (def.appliance?.effect !== 'power' ? def.appliance?.fuel : null);
      if (fuelId === 'fuel') baseFuel += 1;
    }
    if (baseFuel > 0) {
      const x = baseFuel * (BAL.highland.altitudeFuelMult - 1);
      const surcharge = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
      if (surcharge > 0) {
        if (resConsume('fuel', surcharge)) notes.push(t('highland.altitudeFuel', { n: surcharge }));
        else { state.upkeepOk = false; notes.push(t('highland.altitudeCold')); } // 고도 난방 연료 부족 → 벽난로 온기 정지
      }
    }
  }
  // 부상 방치 → 감염 악화
  if (state.injury && INJURIES[state.injury.type].infect && Math.random() < INJURIES[state.injury.type].infect) {
    state.injury = { type: 'infection', untilMin: state.gameMin + INJURIES.infection.restH * 60 * recoveryMult() };
    notes.push(t('day.infectWorse'));
  }
  // 고양이의 하루 (입양 후 소소한 기록)
  if (state.cat && Math.random() < 0.22) {
    notes.push(t(['day.cat0', 'day.cat1', 'day.cat2', 'day.cat3'][Math.floor(Math.random() * 4)]));
  }
  // 고양이 유지비: 입양 후 3일마다 음식 1 소모 (신선 우선 → 통조림 폴백). 둘 다 없으면 쾌적 보너스 정지
  if (state.cat && state.day % BAL.economy.catFeedEvery === 0) {
    if (consumeAnyFood(BAL.economy.catFeedFood)) {
      state.catHungry = false;
    } else {
      state.catHungry = true;
      notes.push(t('day.catHungry'));
    }
  }
  // F-1a [B] 고양이 티저(Day2~3): 눈/흙 위 발자국 + 새벽 울음 1회 — 등장은 Day9 불변(기대감 장치).
  //   비영속 원칙: state 플래그 1개만(catTeaserDone) — 세이브돼도 무해한 부울, 스키마 확장 최소.
  //   발자국은 wildlifeSys가 아침에 남기고, 울음은 tickTime의 새벽 시점에 1회 재생(아래 큐).
  if (!state.cat && (state.day === 2 || state.day === 3) && !state.catTeaserDone) {
    state.catTeaserDone = true;
    state.catTeaserMeow = true; // tickTime 새벽(WAKE 직후)에 소비 → meow 1회
    if (typeof wildlifeSys !== 'undefined') { try { wildlifeSys._forceNightPrints(); } catch (e) {} }
    notes.push(t('day.catPrints'));
  }
  // 특수 인카운터 ①: 야윈 고양이 — v0.9.1: Day 9+, 하루 15% (아직 입양 전 + 최초 1회 등장 후 재등장 없음)
  if (!state.pendingEvent && !state.cat && !state.catEventSeen && state.day >= 9 && Math.random() < 0.15) {
    state.pendingEvent = 'cat';
    state.lastEventDay = state.day;
    state.catMusicDay = state.day; // 당첨된 날은 하루 종일 Cat OST
    state.catEventSeen = true; // 거절해도 다시는 뜨지 않음
    notes.push(t('day.catHint'));
  }
  // 특수 인카운터 ②: 구조 — Day 10000 초과, 하루 5%
  if (!state.pendingEvent && state.day > 10000 && !state.endingSeen && Math.random() < 0.05) {
    state.pendingEvent = 'ending';
    state.lastEventDay = state.day;
  }
  // Nine Winters(#11): 9겨울 마일스톤 박사 무전 — 라디오 보유 시 밤에 1회 (미보유 시 다음 배치까지 보류)
  tryDoctorRadio();
  // 라디오 방송 수집 (#12) — 라디오 ON 상태에서 하루 1회 BAL 확률로 미수집 방송 청취.
  tryRadioBroadcast(notes);
  // 1.3 밤하늘 수집 — 관측소 완공 후 맑은 밤 하루 1회 확률로 미수집 스케치 1종.
  tryNightSky(notes);
  // 랜덤 인카운터: 마지막 만남 1일 경과 + BAL 확률. 조건/반복억제는 drawEvent 엔진에서 판정.
  // 아침 결산 draw 는 '지난밤/밤사이' 사건도 허용하도록 night 컨텍스트를 true 로 연다.
  if (!state.pendingEvent && (state.day - (state.lastEventDay || 0)) >= 1 && Math.random() < BAL.events.dailyChance) {
    drawEvent({ ...eventCtx(), night: true });
  }
  // 배치 D ①: 노말 모드 누적 최고 생존일 통계 갱신 (배경화면 모드 해금 조건 — 세이브 아닌 계정 통계).
  recordNormalDay(state.day);
}
// 아침 브리핑 카드 (#29) — 결산 상단 "오늘" 섹션: 날씨 예보 + 경고 통합 + 권장 행동 1줄
function briefingHtml(forecast, prep, warns) {
  const se = seasonOf();
  const lines = [];
  // 날씨 예보 (라디오/등대 특성 있으면 실제 예보, 없으면 감각적 문구)
  lines.push(`<div style="font-size:11px;margin-bottom:2px">${forecast}</div>`);
  // 경고 (Phase B 카드 통합 — 중복 방지: 여기 한 곳에서만)
  let warn = '';
  const coldExposed = coldSnapActive() && coldSnapNetSeverity() > 0;
  const coldIncoming = state.coldSnapForecast > 0 && se.id === 'winter';
  if (coldExposed) warn = t('brief.coldNow');
  else if (coldSnapActive()) warn = t('brief.coldDefended');
  else if (coldIncoming) warn = t('brief.coldSoon', { n: Math.max(0, state.coldSnapForecast - state.day) });
  else if (se.id === 'winter') warn = t('brief.winter');
  else if (prep) warn = t('brief.winterSoon', { n: prep.daysLeft });
  if (warn) lines.push(`<div style="font-size:11px;color:var(--accent);margin-bottom:2px">${warn}</div>`);
  // 권장 행동 1줄 — 우선순위: 한파 대비 > 겨울 준비 > 자원 부족 > 평온
  let advice;
  if (coldExposed || (coldIncoming && coldDefenseLevel() < 1)) advice = t('brief.advice.cold');
  else if (prep && (!prep.fuelOk || !prep.cannedOk)) advice = t('brief.advice.winterPrep');
  else if (warns.length) advice = t('brief.advice.shortage', { list: warns.map(id => RESOURCES[id].emoji + LName(RESOURCES[id])).join(', ') });
  else advice = t('brief.advice.calm');
  lines.push(`<div style="font-size:11px;color:var(--good)">▸ ${advice}</div>`);
  return `<div class="report-sec" style="border-color:#6b5a40"><span class="r-title">${t('brief.title')}</span>${lines.join('')}</div>`;
}
function showDayReport() {
  const log = state.dayLog;
  const fmt = obj => Object.entries(obj).map(([id, n]) => `${RESOURCES[id].emoji}${LName(RESOURCES[id])} ${n}`).join(', ');
  const warns = Object.keys(RESOURCES).filter(id => ['water', 'food', 'bandage', 'candle', 'battery'].includes(id) && (state.res[id] || 0) === 0);
  const tips = [];
  if (warns.includes('bandage')) tips.push(t('report.tip.bandage'));
  if (warns.includes('water')) tips.push(t('report.tip.water'));
  if (warns.includes('battery') && SHELTERS[state.current].upkeep?.res === 'battery') tips.push(t('report.tip.battery'));
  if (state.injury) tips.push(t('injury.tip', { name: LName(INJURIES[state.injury.type]), cost: costLabel(INJURIES[state.injury.type].cure) }));
  if ((state.cleanBy[state.current] ?? 70) < 50) tips.push(t('report.tip.clean'));
  const forecast = hasForecast()
    ? t('report.forecast', { text: forecastText() })
    : t('report.noForecast');
  // 가을 비축 경고 카드 (겨울 3일 전부터) — 이주 칩과 같은 ok/lack 문법
  const prep = winterPrepAdvice();
  const prepChip = (have, need, ok) => `<span style="color:${ok ? 'var(--good)' : 'var(--bad)'}">${have}/${need}${ok ? ' ✓' : ''}</span>`;
  const prepHtml = prep
    ? `<div class="report-sec report-warn" style="border-color:var(--accent)">${t('report.winterPrep', {
        n: prep.daysLeft,
        fuel: prepChip(prep.fuelHave, prep.fuelNeed, prep.fuelOk),
        canned: prepChip(prep.cannedHave, prep.cannedNeed, prep.cannedOk),
      })}</div>`
    : '';
  openModal(t('report.title', { day: state.day - 1 }), `
    ${briefingHtml(forecast, prep, warns)}
    <div class="report-sec"><span class="r-title">${t('report.gain')}</span><br>${Object.keys(log.gain).length ? fmt(log.gain) : t('none')}</div>
    <div class="report-sec"><span class="r-title">${t('report.spend')}</span><br>${Object.keys(log.spend).length ? fmt(log.spend) : t('none')}</div>
    ${log.notes.length ? `<div class="report-sec"><span class="r-title">${t('report.notes')}</span><br>${log.notes.join('<br>')}</div>` : ''}
    ${prepHtml}
    ${warns.length ? `<div class="report-sec report-warn">${t('report.warn', { list: warns.map(id => RESOURCES[id].emoji + LName(RESOURCES[id])).join(', ') })}</div>` : ''}
    ${tips.length ? `<div class="report-sec report-tip">💡 ${tips.slice(0, 2).join('<br>💡 ')}</div>` : ''}
  `, 'report');
  state.dayLog = { gain: {}, spend: {}, notes: [] };
  playSfx('pen');
  // 자원(물/음식) 고갈 경고음 — 하루 1회 제한
  if ((warns.includes('water') || warns.includes('food')) && state.lastAlarmDay !== state.day) {
    state.lastAlarmDay = state.day;
    playSfx('alarm');
  }
}
/* ── 일시정지 (v1.9) ── */
let paused = false;
function setPaused(p) {
  paused = p;
  document.body.classList.toggle('paused', p);
  const b = $('btn-pause');
  // (B-③) 재생/일시정지 아이콘 — icon() 폴백 구조(아트 있으면 표시, 없으면 이모지). 시스템 버튼 통일.
  if (b) b.innerHTML = p ? icon('icon_sys_play', '▶', 'sys-icon') : icon('icon_sys_pause', '⏸', 'sys-icon');
}
let reportQueued = false;
let lastAutoHour = -1;
// 부팅 직후 첫 틱: 오프라인 정산(loadSave가 밀어둔 gameMin)이 이 틱에서 소화된다.
// 그 catch-up은 이미 부팅 암전(#fade-veil)이 화면을 덮고 있으므로 blackout을 겹치지 않는다.
let settlingOffline = true;
// 암전 연출 (기상/탐험 복귀/자정 깜빡잠 등): #fade-veil을 검게 올렸다가 내리는 동안
// 시간 점프·상태 변경(midFn)을 수행한다. 연출 중엔 입력 차단 + 보고/이벤트 노출 보류.
let blackoutActive = false;
function blackout(midFn, holdMs = 500) {
  const veil = $('fade-veil');
  if (!veil) { try { midFn && midFn(); } catch (e) { /* ignore */ } return; }
  if (blackoutActive) return; // 재진입 가드 (연출 중 재호출 무시)
  blackoutActive = true;
  const prevTrans = veil.style.transition;
  veil.style.transition = 'opacity .4s ease';
  veil.style.pointerEvents = 'auto'; // 입력 차단
  // 리플로우 강제 후 페이드인 (transition이 확실히 걸리도록)
  void veil.offsetWidth;
  veil.style.opacity = '1';
  const IN = 400, OUT = 400;
  setTimeout(() => {                 // 정점: 시간 점프·상태 변경
    try { midFn && midFn(); } catch (e) { console.error('[shelter:blackout]', e); }
    setTimeout(() => {               // 유지 후 페이드아웃
      veil.style.opacity = '0';
      setTimeout(() => {             // 페이드아웃 완료: 확정값 재설정 + 가드 해제
        veil.style.opacity = '0';
        veil.style.pointerEvents = 'none';
        veil.style.transition = prevTrans;
        blackoutActive = false;
      }, OUT + 30);
    }, holdMs);
  }, IN);
}
// v1.2.0 자동 진행 지역 선택 — 결핍 기반 가중.
// 유저 신고("자동진행이 주거만 간다") 해소: 순수 그리디(항상 최고 eff = 주거) 대신
//   가중 = eff × (1 + Σ 부족자원 산지 보너스) × (직전 방문 지역이면 감쇠).
// 후보 = 해금된 전 지역(항구/지하 개통 포함), 폭설 봉쇄 지역 제외. 부족 판정은 BAL.auto.scarceWatch 자원만
//   (신선식품/물은 autoEat이 따로 관리하므로 제외). 결정론 아님(Math.random 타이브레이크 없음 — 가중 최대 선택).
function pickAutoRegion() {
  const A = BAL.auto;
  // 오늘 부족한(임계 미만) 자원 집합
  const scarce = new Set(A.scarceWatch.filter(r => (state.res[r] || 0) < A.scarceThreshold));
  let bestId = null, bestW = -1;
  for (const id of Object.keys(REGIONS)) {
    if (!regionUnlocked(id)) continue;      // 항구 등 미해금 제외
    if (blizzardBlocks(id)) continue;       // 폭설 봉쇄 지상 지역 제외
    if (isForbiddenRegion(id)) continue;    // 1.4 금지 구역은 자동 대상 아님(방호복·수동 전략 레버 — 염장/얼음낚시와 동일 원칙)
    const eff = rateParts(id, []).eff;
    if (eff <= 0) continue;
    // 이 지역이 loot로 주는 부족 자원 종 수 → 가중 보너스
    let scarceHits = 0;
    for (const [rid] of REGIONS[id].lootRes) if (scarce.has(rid)) scarceHits++;
    let w = eff * (1 + scarceHits * A.scarceWeightPerRes);
    if (id === state.lastAutoRegion) w *= A.revisitDecay; // 직전 방문 지역 감쇠(연속 편중 완화)
    if (w > bestW) { bestW = w; bestId = id; }
  }
  return bestId;
}

// 자동 진행 모드 (Day 10+ 해금): 매 게임 내 정시마다 간단한 생존 루틴을 대신 처리.
// 자동 대상: 치료·청소·탐험(급식/취침/autoEat은 각각 processDay/자정루프/decayGauges가 자동 처리).
// 자동 대상 아님(설계 의도 — 후반 수동 전략 레버): 염장(salt cure)·얼음낚시·대형 프로젝트·암시장.
function runAutoPlay() {
  if (paused || titleVisible || !opts.autoPlay || isWallpaper() || (!isZen() && state.day < 10)) return;
  if (state.injury && resHasAll(INJURIES[state.injury.type].cure)) {
    const name = LName(INJURIES[state.injury.type]);
    treatInjury();
    state.dayLog.notes.push(t('auto.treat', { name }));
  }
  if ((state.cleanBy[state.current] ?? 70) < 50 && (state.res.water || 0) > 1) {
    cleanShelter();
    state.dayLog.notes.push(t('auto.clean'));
  }
  if (!state.exp && (state.expToday || 0) < BAL.auto.maxExpPerDay && state.energy >= BAL.auto.minEnergy && !isExhausted()) {
    const bestId = pickAutoRegion();
    if (bestId) {
      departExpedition(bestId, [], { auto: true });
      state.lastAutoRegion = bestId; // 다음 선택에서 연속 방문 감쇠에 사용
      { const rn = LName(REGIONS[bestId]); state.dayLog.notes.push(t('auto.depart', { emoji: REGIONS[bestId].emoji, name: rn, josa: josa(rn, '으로/로') })); }
    }
  }
}
function tickTime(dt) {
  // #74 데모 종료 후엔 시간 동결 — 봄의 거처를 둘러볼 순 있지만 진행은 없다(잠금의 실체는 여기).
  if (DEMO_ED && state.demoEnded) return;
  state.gameMin += dt * GAME_MIN_PER_SEC;
  decayGauges(dt * GAME_MIN_PER_SEC);
  checkHelpless(); // 배치 D: 무력 상태(게이지 바닥 + 재고 0) 안전망 판정
  const curHour = Math.floor(state.gameMin / 60);
  if (curHour !== lastAutoHour) {
    lastAutoHour = curHour;
    runAutoPlay();
  }
  const newDay = Math.floor(state.gameMin / 1440) + 1;
  let rolledOver = false;
  while (state.day < newDay) {
    state.day++;
    refreshAutoplayLock();
    // Day 10 도달(또는 이미 지난 구세이브 첫 부팅 이후 롤오버): 자동 진행 해금 1회 안내
    // 노말/하드: Day 10 도달 시 해금 안내. 무한(zen): 이미 첫날부터 열려 있으므로 첫 아침 롤오버에 안내.
    if ((isZen() || state.day >= 10) && !state.autoNoticeShown) { state.autoNoticeShown = true; state.pendingAutoNotice = true; }
    processDay();
    reportQueued = true;
    rolledOver = true;
  }
  // #74 데모 게이트: 첫 겨울을 넘기면(봄 도달 → passWinter로 winters≥1) 그 자리에서 데모 종료.
  // 아침 보고 대신 종료 화면 — demoEnded가 세이브에 박혀 이후 입장에도 종료 화면·시간 동결이 유지된다.
  if (DEMO_ED && rolledOver && !state.demoEnded && (state.winters || 0) >= 1) {
    state.demoEnded = true;
    reportQueued = false;
    doSaveNow();
    showDemoEnd();
    return;
  }
  // 자정을 자연 경과(취침이 아님)로 넘긴 경우의 처리.
  // v1.2.0: 자정 강제 취침 폐지. 셸터 안에서 깨어 있으면 시간이 계속 흐르고(01시부터 회복 페널티 누적),
  // 05시에 쓰러지듯 자동 취침한다(아래 별도 트리거). 탐험/오프라인 경로만 여기서 아침으로 점프.
  if (rolledOver) {
    const morning8 = (state.day - 1) * 1440 + 8 * 60;
    if (state.exp) {
      // 탐험(부재) 중 자정 경과: 밖에 있으니 암전 없음 + 쪽잠 에너지 회복 없음. 시간만 점프(아직 이르면).
      if (state.gameMin < morning8) { state.gameMin = morning8; state.dayLog.notes.push(t('day.expNight')); }
    } else if (settlingOffline || document.hidden) {
      // 정산 경로(부팅 오프라인 catch-up · 백그라운드 절전 틱): "방치는 벌 받지 않는다".
      // v1.2.0 취침 자율화가 자정 강제 취침을 없앤 뒤로 이 경로가 05시 collapse에서 제외되어
      // 에너지 미회복 결함이 있었다(방치형 코어 결함, 디렉터 실신고). 자정을 넘긴 날의 취침을
      // "정상 취침"으로 간주해 회복한다 — 밤샘 페널티 없이(22시 기준), 침대·쾌적·온천 보너스 포함.
      // blackout 연출에 의존하지 않는 순수 로직. 회복은 정산 롤오버가 발생하면 착지 시각과 무관하게 항상 적용한다
      //   (오프라인 catch-up은 임의 시각에 착지할 수 있어 '아침 이전'만 회복하면 미회복 구멍이 남는다 — 실측 확인).
      const { energy } = restEnergyValue(SETTLE_REST_HOUR, false); // 이른 취침 기준(밤샘 페널티 없이 침대·쾌적·온천 보너스 포함)
      state.energy = Math.max(state.energy, energy);
      const e = Math.round(state.energy);
      // 아직 아침 이전이면 다음 아침으로 점프(자연스러운 기상). 이미 아침 이후면 시간은 그대로 두고 회복만.
      if (state.gameMin < morning8) state.gameMin = morning8;
      state.dayLog.notes.push(t('day.napMorning', { e }));
    }
    // else(셸터 안에서 깨어 자정 경과): 아무 것도 하지 않는다 — 시간을 계속 흐르게 두고,
    //   결산은 아침(WAKE_HOUR 이후)까지 미룬다(아래 reportQueued 게이트의 시각 조건).
  }
  // 05시 자동 취침: 셸터 안에서 깨어 있고 새벽 collapseHour에 도달하면 쓰러지듯 잠든다.
  // (탐험 중·오프라인 정산·백그라운드·암전 중·타이틀·일시정지 제외 — 실제(가시) 플레이 세션에서만)
  const atCollapseHour = Math.floor(gameHour()) >= BAL.rest.collapseHour
    && (state.gameMin % 1440) < BAL.rest.collapseHour * 60 + 60;
  if (!state.exp && !settlingOffline && !document.hidden && !blackoutActive && !titleVisible && !paused
      && atCollapseHour) {
    sleepUntilMorning(true, { collapse: true });
    return; // 이번 틱은 취침 처리로 종결 (아침 결산은 기상 후 다음 틱)
  }
  // 백그라운드 절전 틱이 자정을 넘기지 않고 05시(collapseHour)에 도달한 경우(같은 밤 방치):
  //   "방치는 벌 받지 않는다" — collapse 페널티 대신 정상 취침으로 회복하고 아침으로 점프한다.
  //   (자정을 넘긴 경우는 위 rolledOver 블록이 이미 처리했다.)
  if (!state.exp && !settlingOffline && document.hidden && !blackoutActive && !titleVisible && !paused
      && atCollapseHour) {
    const morning8 = Math.floor(state.gameMin / 1440) * 1440 + 8 * 60;
    if (state.gameMin < morning8) {
      state.gameMin = morning8;
      const { energy } = restEnergyValue(SETTLE_REST_HOUR, false); // 이른 취침 기준(밤샘 페널티 없음)
      state.energy = Math.max(state.energy, energy);
      const e = Math.round(state.energy);
      state.dayLog.notes.push(t('day.napMorning', { e }));
    }
    return;
  }
  // 보고/이벤트 노출 게이트: 탐험(부재) 중이거나 암전 연출 중엔 하루 보고·셸터 이벤트를 띄우지 않는다.
  // v1.2.0: 자정 직후(01~04시) 깨어 있는 동안엔 결산을 미룬다 — 아침(WAKE_HOUR 이후)에만 뜬다.
  // (탐험 복귀 결산 모달을 닫으면 modal-back 조건이 풀려 자연히 표시된다.)
  const isMorningForReport = Math.floor(gameHour()) >= WAKE_HOUR || Math.floor(gameHour()) < BAL.rest.lateStartHour;
  if (reportQueued && isMorningForReport && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show')) {
    reportQueued = false;
    showDayReport();
    scheduleSave();
    renderResBar();
    renderExpPanel();
  } else if (state.pendingEvent && !state.minimizedEvent && !reportQueued && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트를 닫은 다음에 인카운터 등장 (탐험 부재/암전 중, 내려둔 이벤트가 있으면 보류)
    const ev = state.pendingEvent;
    state.pendingEvent = null;
    showEvent(ev);
  } else if (state.pendingTutorial && !reportQueued && !state.pendingEvent && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트/인카운터를 모두 닫은 다음에 튜토리얼 수첩 페이지 등장
    const day = state.pendingTutorial;
    state.pendingTutorial = null;
    showTutorialPage(day);
  } else if (state.pendingAutoNotice && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // Day 10 자동 진행 해금 안내 — 아무도 존재/조건을 모른다는 피드백으로 1회 전용 팝업
    state.pendingAutoNotice = false;
    scheduleSave();
    openModal(t('auto.unlocked.title'), `
      <div style="line-height:1.8">${t('auto.unlocked.body')}</div>
      <div class="close-row" style="margin-top:10px">
        <button class="pixel-btn primary" id="btn-auto-now">${t('auto.unlocked.on')}</button>
      </div>`);
    const bn = $('btn-auto-now');
    if (bn) bn.addEventListener('click', () => {
      opts.autoPlay = true;
      const cb = $('opt-autoplay'); if (cb) cb.checked = true;
      syncAutoBtn();
      flushSave();
      closeModal();
      toast(t('auto.unlocked.toast'));
    });
  } else if (state.pendingWinterMemoir?.length && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // Nine Winters(#11): 봄 첫 아침 보고를 모두 닫은 뒤 "그 해 겨울" 수첩 페이지를 순서대로 편다.
    // (오프라인 정산으로 겨울 여러 번을 지났으면 큐에 쌓인 순서대로 한 번에 한 장씩.)
    const page = state.pendingWinterMemoir.shift();
    scheduleSave();
    openJournalPages([page]);
  } else if (state.pendingMemoPopup && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 세계관 메모/유서 수집 팝업 (#35) — 탐험 결산을 닫은 뒤 쪽지 문법으로 1회 열람.
    const { id, will } = state.pendingMemoPopup;
    state.pendingMemoPopup = null;
    scheduleSave();
    showMemoPage(id, will);
  } else if (state.pendingBroadcast && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 라디오 방송 청취 모달 (#12) — 결산 뒤 지지직 SFX와 함께 1회. 수집은 여기서 확정.
    const id = state.pendingBroadcast;
    state.pendingBroadcast = null;
    if (!state.broadcasts) state.broadcasts = {};
    if (!state.broadcasts[id]) state.broadcasts[id] = state.day;
    scheduleSave();
    showBroadcastModal(id);
  } else if (state.pendingSketchPopup && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 1.3 밤하늘 스케치 팝업 — 결산 닫은 뒤 종이 스케치 문법으로 1회 열람 (메모 팝업 문법 재사용).
    const id = state.pendingSketchPopup;
    state.pendingSketchPopup = null;
    scheduleSave();
    showSketchPage(id);
  }
  tickInjury();
  settlingOffline = false; // 첫 틱(오프라인 정산) 소화 완료 — 이후엔 정상 암전 경로
}
function renderInventoryBar() {
  const bar = $('toolbar');
  bar.innerHTML = '';
  // 배치 D ④: 전체 수거 버튼 — 현재 셸터에 놓인 가구 전부를 인벤토리로 거둔다.
  //   icon() 폴백 구조(아트 없으면 이모지). 놓인 가구가 있을 때만 활성.
  {
    const placedN = items.length;
    const btn = document.createElement('div');
    btn.className = 'tool-item tool-collect' + (placedN <= 0 ? ' empty' : '');
    btn.innerHTML = `<span class="emoji">${icon('icon_sys_collect', '📦')}</span><span>${t('inv.collectAll')}</span><span class="cnt">${placedN}</span>`;
    btn.title = placedN > 0 ? t('inv.collectAll.title', { n: placedN }) : t('inv.collectAll.none');
    btn.addEventListener('click', () => reclaimAll());
    bar.appendChild(btn);
  }
  for (const [id, def] of Object.entries(DEFS)) {
    const cnt = state.inventory[id] || 0;
    const el = document.createElement('div');
    el.className = 'tool-item' + (cnt <= 0 ? ' empty' : '');
    el.innerHTML = `<span class="emoji">${furnIcon(id)}</span><span>${LName(def)}</span><span class="cnt">${cnt}</span>`;
    el.title = cnt > 0 ? t('inv.place', { name: LName(def) }) : t('inv.getByExp');
    el.addEventListener('click', () => startPlacing(id));
    bar.appendChild(el);
  }
}
function renderExpPanel() {
  const box = $('exp-content');
  if (state.exp) {
    const r = REGIONS[state.exp.region];
    box.innerHTML = `
      <div id="exp-progress">
        <div style="font-size:12px">${t('exp.inProgress', { emoji: r.emoji, name: LName(r) })}</div>
        <div class="bar-wrap"><div class="bar" id="exp-bar"></div></div>
        <div class="eta" id="exp-eta"></div>
      </div>`;
    return;
  }
  // 부상 카드 (치료 or 자연 회복 대기)
  let injuryHtml = '';
  if (state.injury) {
    const inj = INJURIES[state.injury.type];
    const remainMin = Math.max(0, state.injury.untilMin - state.gameMin);
    const canCure = resHasAll(inj.cure);
    injuryHtml = `
      <div class="injury-card">
        ${t('injury.card', { icon: inj.icon, name: LName(inj), pen: Math.round(inj.pen * 100), time: inj.timeMult ? t('injury.card.time') : '', h: fmtGameDur(remainMin) })}
        <div class="btn-row">
          <button class="pixel-btn" id="btn-treat" ${canCure ? '' : 'disabled'}>${t('injury.treat', { cost: costLabel(inj.cure) })}</button>
        </div>
      </div>`;
  }
  box.innerHTML = injuryHtml + `
    <button class="pixel-btn primary" id="btn-open-map" style="width:100%">${t('exp.openMap')}</button>
    ${hasForecast() ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;text-align:center">📻 ${forecastText()}</div>` : ''}`;
  const mb = $('btn-open-map');
  if (mb) mb.addEventListener('click', openMapModal);
  const tb = $('btn-treat');
  if (tb) tb.addEventListener('click', treatInjury);
}
function tickExpeditionUI() {
  // 부팅 플로우 원칙: 타이틀 화면에선 어떤 게임 팝업/결과도 뜨면 안 된다.
  // 저장된 탐험이 이미 끝난 상태로 부팅되면 이 틱이 타이틀 위로 탐험 결과 모달을 띄우던 버그 —
  // 아침 결산과 동일하게 hideTitle() 이후로 지연한다(hideTitle이 진입 시 resolveExpedition을 호출).
  if (titleVisible) return;
  if (state.exp) {
    const remain = state.exp.end - Date.now();
    const total = state.exp.dur || (REGIONS[state.exp.region].time * 1000);
    // 탐험 중간 이벤트: 진행률 50% 통과 시점에 1회, BAL 확률로 일반 인카운터 예약 (현재 시각 컨텍스트).
    if (!state.exp.midRolled && (1 - remain / total) >= 0.5) {
      state.exp.midRolled = true;
      if (!state.pendingEvent && Math.random() < BAL.events.midExpChance) {
        drawEvent();
      }
    }
    if (remain <= 0) { resolveExpedition(); return; }
    const bar = $('exp-bar'), eta = $('exp-eta');
    if (bar) {
      bar.style.width = `${100 * (1 - remain / total)}%`;
      eta.textContent = t('exp.timeLeft', { d: fmtGameDur((remain / 1000) * GAME_MIN_PER_SEC) });
    } else renderExpPanel();
  } else if (state.injury) {
    const el = $('injury-eta');
    if (el) el.textContent = fmtGameDur(Math.max(0, state.injury.untilMin - state.gameMin));
    else renderExpPanel();
  }
}

const selPanel = $('sel-panel');
function showSelPanel(item) {
  const def = DEFS[item.defId];
  $('sel-name').innerHTML = `${def.emoji} ${LName(def)}`;
  const sw = $('sel-swatches');
  sw.innerHTML = '';
  def.colors.forEach((c, i) => {
    const s = document.createElement('div');
    s.className = 'swatch' + (i === item.colorIdx ? ' active' : '');
    s.style.background = '#' + c.toString(16).padStart(6, '0');
    s.title = LColor(def, i);
    s.addEventListener('click', () => { recolorItem(item, i); markCollection(item.defId, i); showSelPanel(item); scheduleSave(); });
    sw.appendChild(s);
  });
  // 조명/가전: 전원 토글 + 연료 잔량 (기획서 v0.2 UI: "양초 3개 보유 / 1일 1개 소비")
  const old = $('sel-power'); if (old) old.remove();
  const fuel = def.light?.fuel || def.appliance?.fuel;
  if (fuel) {
    const have = state.res[fuel] || 0;
    const div = document.createElement('div');
    div.id = 'sel-power';
    div.style.cssText = 'font-size:10px;color:var(--text-dim);margin-bottom:8px;line-height:1.6';
    div.innerHTML = `
      <button class="pixel-btn" id="btn-power" style="width:100%;margin-bottom:4px">${item.on !== false ? t('power.on') : t('power.off')}</button>
      ${def.appliance ? `<span style="color:var(--good)">${LLabel(def.appliance)}</span><br>` : ''}
      ${t('power.fuelLine', { emoji: RESOURCES[fuel].emoji, name: LName(RESOURCES[fuel]), have, status: have === 0 ? t('power.empty') : t('power.lasts', { n: have }) })}`;
    $('sel-swatches').after(div);
    $('btn-power').addEventListener('click', () => {
      setItemPower(item, item.on === false, { silent: false });
      showSelPanel(item);
      scheduleSave();
      toast(item.on ? t('power.turnedOn', { name: LName(def) }) : t('power.turnedOff', { name: LName(def) }));
    });
  }
  selPanel.classList.add('show');
}
function hideSelPanel() { selPanel.classList.remove('show'); }

let modalKind = null; // 마지막으로 연 모달 종류 (닫힘 시 퀘스트 훅 판별용, 예: 'report')
function openModal(title, html, kind = null) {
  modalKind = kind;
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML = html;
  $('modal-back').classList.add('show');
}
function closeModal() {
  $('modal-back').classList.remove('show');
  modalKind = null;
}
$('modal-close').addEventListener('click', closeModal);
$('modal-back').addEventListener('click', e => { if (e.target === $('modal-back')) closeModal(); });

// ── 인게임 확인창: window.confirm(브라우저 네이티브 알림창)은 게임 미학을 깨므로 전면 대체 ──
// 버튼은 "확인/취소"가 아니라 행동 동사("출발한다/그만둔다")로 — 실수 방지 + 게임 문법.
// 하네스용: window.__autoConfirm이 정의돼 있으면 그 값으로 즉시 응답.
let confirmResolve = null;
function gameConfirm(msg, yesLabel, noLabel) {
  if (window.__autoConfirm !== undefined) return Promise.resolve(!!window.__autoConfirm);
  return new Promise(resolve => {
    if (confirmResolve) confirmResolve(false); // 겹침 방지: 이전 창은 취소로 정리
    confirmResolve = resolve;
    $('confirm-msg').textContent = msg;
    $('confirm-yes').textContent = yesLabel || t('confirm.yes');
    $('confirm-no').textContent = noLabel || t('confirm.no');
    const back = $('confirm-back');
    back.style.display = '';
    back.classList.add('show');
  });
}
function settleConfirm(v) {
  const back = $('confirm-back');
  back.classList.remove('show');
  back.style.display = 'none';
  const r = confirmResolve; confirmResolve = null;
  if (r) r(v);
}
$('confirm-yes').addEventListener('click', () => settleConfirm(true));
$('confirm-no').addEventListener('click', () => settleConfirm(false));
$('confirm-back').addEventListener('click', e => { if (e.target === $('confirm-back')) settleConfirm(false); });
addEventListener('keydown', e => {
  if (!confirmResolve) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); settleConfirm(false); }
  if (e.key === 'Enter') { e.stopImmediatePropagation(); settleConfirm(true); }
}, true); // 캡처 단계: 게임 전역 ESC(설정 토글 등)보다 먼저 소비

function shelterUnlocked(id) {
  return state.successes >= SHELTERS[id].unlockAt || (state.layouts[id]?.length > 0);
}
function openShelterModal() {
  const curDistrict = districtOf(state.current);
  const groups = Object.entries(DISTRICTS).map(([did, dist]) => {
    const here = did === curDistrict;
    const cards = dist.shelters.map(id => {
      const sh = SHELTERS[id];
      const unlocked = shelterUnlocked(id);
      const cur = id === state.current;
      let costLine = '';
      let btn = '';
      if (unlocked && !cur) {
        const { cost, cross, renov } = moveCostFor(id);
        // 보유/필요 대조 칩 — 이주 로직이 소비하는 동일한 cost 객체에서 렌더 (하드코딩 금지). (B-④) 공통 렌더러.
        const chips = reqChips(cost);
        costLine = chips
          ? `<div class="s-desc" style="color:var(--text-dim)">${t('shelter.reqLabel')}</div><div class="req-chips">${chips}</div>`
          : '';
        const ok = resHasAll(cost);
        btn = `<button class="pixel-btn" data-shelter="${id}" ${ok ? '' : 'disabled'} title="${ok ? '' : t('shelter.noCostNeed', { cost: costLabel(cost) })}">${renov ? t('shelter.moveRefit') : t('shelter.move')}</button>`;
      }
      return `
      <div class="shelter-card ${cur ? 'current' : ''} ${unlocked ? '' : 'locked'}">
        <div class="s-emoji">${unlocked ? shIcon(id, 'px-lg') : '🔒'}</div>
        <div class="s-body">
          <div class="s-name">${LName(sh)} ${cur ? `<span style="color:var(--accent)">${t('current')}</span>` : ''}${unlocked && !state.renovated[id] ? t('shelter.unrefit') : ''}</div>
          <div class="s-desc">${unlocked ? LDesc(sh) : t('shelter.locked', { need: sh.unlockAt, cur: state.successes })}</div>
          ${unlocked && sh.perk ? `<div class="s-desc" style="color:var(--good)">${LLabel(sh.perk)}</div>` : ''}
          ${unlocked && sh.limits ? `<div class="s-desc" style="color:var(--bad)">${LLimits(sh)}</div>` : ''}
          ${unlocked ? `<div class="s-desc">${t('shelter.baseComfort', { n: sh.baseComfort || 0, upkeep: sh.upkeep ? LLabel(sh.upkeep) : t('upkeep.none') })}</div>` : ''}
          ${costLine}
        </div>
        ${btn}
      </div>`;
    }).join('');
    return `
      <div style="margin:12px 0 6px;font-size:12px;color:${here ? 'var(--accent)' : 'var(--text-dim)'}">
        ${t('shelter.districtHeader', { emoji: dist.emoji, name: LName(dist), here: here ? t('shelter.hereTag') : '', bonus: LBonus(dist), desc: LDesc(dist) })}
      </div>${cards}`;
  }).join('');
  // 배치 D ④: 현재 셸터에 놓인 가구가 있으면 "남는 가구 N개" 안내 + 전체 수거 바로가기
  const placedN = items.length;
  const leftoverHtml = placedN > 0
    ? `<div class="shelter-leftover" style="font-size:11px;color:var(--text-dim);margin:2px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
         <span>${t('shelter.leftover', { n: placedN })}</span>
         <button class="pixel-btn" id="btn-shelter-collect" style="padding:3px 8px;font-size:10px">${t('inv.collectAll')}</button>
       </div>`
    : '';
  openModal(t('shelter.modalTitle'), `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">
      ${t('shelter.intro')}
    </div>${leftoverHtml}${groups}`);
  const collectBtn = $('btn-shelter-collect');
  if (collectBtn) collectBtn.addEventListener('click', async () => { closeModal(); await reclaimAll(); });
  $('modal-body').querySelectorAll('button[data-shelter]').forEach(b =>
    b.addEventListener('click', () => moveToShelter(b.dataset.shelter)));
}
/* ============================================================
   생존 수첩 프레젠테이션 — 전 거주자가 남긴 수첩/쪽지 (RE 메모 스타일, cozy 톤)
============================================================ */
let journalPaperURL = null;
function paperTextureURL() {
  if (!journalPaperURL) journalPaperURL = makePaperTexture();
  return journalPaperURL;
}

// 종이 질감 배경을 붙인 오버레이(수첩 패널 / 쪽지)에 텍스처를 씌운다.
// P2: 프로시저럴 텍스처 → AI 생성 에셋(public/img/*.png)으로 교체. makePaperTexture는 폴백/미래용 유지.
// kind: 'journal'(수첩) | 'tip'(쪽지). 이미지 로드 실패 시 프로시저럴 데이터URL로 폴백.
function applyPaperBg(el, kind = 'journal') {
  // 쪽지는 박스 비율(가로형)에 맞춘 전용 스트립 — 정사각 조각을 cover로 깔면
  // 투명 여백과 오버레이가 사각형으로 삐져나온다 (유저 신고)
  const asset = kind === 'tip' ? 'img/tip_strip.png' : 'img/paper_note.png';
  // 진한 종이 이미지 위 잉크(#3a3026) 대비 확보용 밝은 오버레이 한 겹 — 투명 PNG인 쪽지엔 금지
  const overlay = kind === 'tip' ? '' : 'linear-gradient(rgba(255,250,240,.14), rgba(255,250,240,.14)), ';
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `${overlay}url(${asset})`;
    if (kind === 'tip') el.style.backgroundSize = '100% 100%'; // 찢긴 테두리가 박스에 정확히 맞도록
  };
  img.onerror = () => { el.style.backgroundImage = `url(${paperTextureURL()})`; }; // 폴백: 절차적 종이
  img.src = asset;
  // 먼저 프로시저럴을 깔아두면 로드 지연 중에도 빈 배경이 보이지 않는다 (쪽지는 투명 유지)
  if (kind !== 'tip') el.style.backgroundImage = `url(${paperTextureURL()})`;
}

let journalKeyHandler = null;
let journalOpen = false; // 수첩이 떠 있는 동안 리포트/인카운터/다음 튜토리얼이 겹치지 않도록
function openJournalPages(pages, opts = {}) {
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
    journalOpen = false;
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

  journalOpen = true;
  scr.style.display = 'flex';
  void paper.offsetWidth; // 리플로우 강제 — 진입 애니메이션이 매번 재생되도록
  scr.classList.add('show');
  render();
}

function openHelpModal(opts) {
  openJournalPages([
    { titleId: 'jnl.help.p1.title', bodyId: 'jnl.help.p1.body' },
    { titleId: 'jnl.help.p2.title', bodyId: 'jnl.help.p2.body' },
    { titleId: 'jnl.help.p3.title', bodyId: 'jnl.help.p3.body' },
    { titleId: 'jnl.help.p4.title', bodyId: 'jnl.help.p4.body' },
    { titleId: 'jnl.help.p5.title', bodyId: 'jnl.help.p5.body' },
  ], opts);
}

// 세계관 메모/유서 열람 (쪽지 톤) — 수집 시 팝업 + 수첩 기록 탭에서 재열람 시 공용.
function showMemoPage(id, will) {
  const tbl = will ? WILLS : MEMOS;
  const m = tbl[id];
  if (!m) return;
  const tag = will ? t('memo.tagWill') : t('memo.tagRegion.' + m.region);
  const body = `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${tag}</div>` +
    `<div style="white-space:pre-line;line-height:1.9">${LD(m)}</div>`;
  openJournalPages([{ title: LN(m), body }]);
}
// 1.3 밤하늘 스케치 페이지 — 메모 페이지 문법 재사용. 관측소가 열어준 감상 보상.
function showSketchPage(id) {
  const s = SKETCHES[id];
  if (!s) return;
  const body = `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${t('sketch.tag')}</div>` +
    `<div style="white-space:pre-line;line-height:1.9">${LD(s)}</div>`;
  openJournalPages([{ title: LN(s), body }]);
}
// 1.4 최종장 "그날의 진실" — 기밀 문서 12종 전부 수집 시 열리는 회고 페이지(다중 페이지, 메모 페이지 문법).
//   조용한 발견의 톤: 극적 폭로가 아니라 흩어진 기록을 이어 붙인 한 사람의 정리. 지시조 금지.
function showTruthPage() {
  const pages = [1, 2, 3].map(n => ({
    title: t('truth.title'),
    body: `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${t('truth.tag')}</div>` +
      `<div style="white-space:pre-line;line-height:1.9">${t('truth.p' + n)}</div>`,
  }));
  openJournalPages(pages);
}
/* ── 라디오 방송 연출 (좀보이드식 자막 버블, #12 코디 지시) ──
   모달 대신 배치된 라디오 위에 초록 자막 박스를 띄운다. 라디오 월드 좌표를 매 프레임
   화면에 투영해 고정. radio_broadcast.ogg 를 2~3회 반복 재생(원샷 스케줄, 루프 채널 미사용). */
let radioBubble = null;         // { el, item, text, shown, ttl, fading, sfxTimers } — 활성 방송 상태
const RADIO_SFX_CLIP = 1.85;    // radio_broadcast.ogg 길이(초) — 반복 간격
function ensureRadioBubbleEl() {
  let el = document.getElementById('radio-bubble');
  if (!el) {
    el = document.createElement('div');
    el.id = 'radio-bubble';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}
// 가장 최근 배치된 라디오 아이템 (없으면 null)
function latestRadioItem() {
  const radios = items.filter(i => i.defId === 'radio' && i.group);
  return radios.length ? radios[radios.length - 1] : null;
}
// 방송 자막 버블 시작 — id 방송을 라디오 위에 타자기식으로 출력하고 지지직을 2~3회 재생.
function showBroadcastModal(id) { // 이름 유지(기존 호출부 호환), 실제로는 버블 연출
  const b = BROADCASTS[id];
  if (!b) return;
  const radio = latestRadioItem();
  if (!radio) return; // 라디오 없으면 발화하지 않음 (기존 조건 유지)
  // 이전 버블 정리
  clearRadioBubble();
  const el = ensureRadioBubbleEl();
  const full = `📻 ${LN(b)}`;
  // v1.4.2(디렉터 오더): 자막에는 전파를 타는 단파 단문(air)만 — 수신자 시점 서술(desc)은 수첩 기록 전용.
  const bodyText = LD(b.air ? { desc: b.air, descEn: b.airEn || b.air } : b).replace(/\s+/g, ' ');
  el.className = '';
  el.innerHTML = `<div class="rb-title"></div><div class="rb-body"></div>`;
  el.style.display = 'block';
  radioBubble = { el, item: radio, ttl: 0, fading: false, sfxTimers: [], typeTimer: null };
  positionRadioBubble(); // 첫 배치
  // 지지직 2~3회 반복 (원샷 스케줄) — 볼륨은 기존 radio_noise 수준(0.5)
  const reps = 2 + (Math.random() < 0.5 ? 1 : 0);
  dbgSfx = 'radio_broadcast';
  for (let k = 0; k < reps; k++) {
    const tm = setTimeout(() => playSfx('radio_broadcast', { vol: 0.5, jitter: 0 }), k * RADIO_SFX_CLIP * 1000);
    radioBubble.sfxTimers.push(tm);
  }
  // 타자기 출력 (제목 먼저 즉시, 본문 1글자씩)
  el.querySelector('.rb-title').textContent = full;
  const bodyEl = el.querySelector('.rb-body');
  let ci = 0;
  const type = () => {
    if (!radioBubble) return;
    bodyEl.textContent = bodyText.slice(0, ci);
    ci++;
    if (ci <= bodyText.length) radioBubble.typeTimer = setTimeout(type, 32);
    else radioBubble.ttl = performance.now() + 4000; // 완료 후 4초 유지
  };
  type();
  // 수집 처리는 호출부(pendingBroadcast 드레인)에서 이미 확정 — 여기선 토스트만
  toast(t('radio.logged'));
}
// 라디오 월드 좌표 → 화면 px 투영 후 버블 위치 갱신 (renderFrame 루프에서 매 프레임 호출)
function positionRadioBubble() {
  if (!radioBubble || !radioBubble.item?.group) return;
  const el = radioBubble.el;
  const p = new THREE.Vector3();
  radioBubble.item.group.getWorldPosition(p);
  p.y += 0.9; // 라디오 머리 위
  p.project(camera);
  // NDC → 시각 px (picking 과 동일 매핑: (ndc*0.5+0.5)*innerWidth)
  let x = (p.x * 0.5 + 0.5) * innerWidth;
  let y = (-p.y * 0.5 + 0.5) * innerHeight;
  // 뷰포트 밖이면 가장자리에 클램프
  const margin = 20;
  x = Math.max(margin, Math.min(innerWidth - margin, x));
  y = Math.max(margin, Math.min(innerHeight - margin, y));
  // #radio-bubble 은 zoom:var(--uiz) 적용 → left/top 은 uiz 로 나눠 보정 (visual px 정합)
  const uiz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiz')) || 1;
  el.style.left = (x / uiz) + 'px';
  el.style.top = (y / uiz) + 'px';
}
// 방송 버블 페이드/정리 (renderFrame 훅에서 ttl 경과 시 페이드아웃)
function tickRadioBubble() {
  if (!radioBubble) return;
  positionRadioBubble();
  if (!radioBubble.fading && radioBubble.ttl && performance.now() > radioBubble.ttl) {
    radioBubble.fading = true;
    radioBubble.el.classList.add('fade');
    setTimeout(clearRadioBubble, 600);
  }
}
function clearRadioBubble() {
  if (!radioBubble) return;
  radioBubble.sfxTimers.forEach(clearTimeout);
  if (radioBubble.typeTimer) clearTimeout(radioBubble.typeTimer);
  const el = radioBubble.el;
  el.style.display = 'none';
  el.classList.remove('fade');
  radioBubble = null;
}

/* ── 첫 3일 튜토리얼 (신규 게임 한정) ── */
const TUTORIAL_PAGES = {
  1: [{ titleId: 'jnl.tut1.title', bodyId: 'jnl.tut1.body' }],
  2: [{ titleId: 'jnl.tut2.title', bodyId: 'jnl.tut2.body' }],
  3: [{ titleId: 'jnl.tut3.title', bodyId: 'jnl.tut3.body' }],
};
function showTutorialPage(day) {
  const pages = TUTORIAL_PAGES[day];
  if (!pages) return;
  state.tutDay = day; // 표시 즉시 기록 — 닫기 전에 리로드해도 같은 페이지가 중복되지 않게
  scheduleSave();
  openJournalPages(pages);
}

/* ============================================================
   퀘스트 트래커 (v2.5) — 신규 게임 온보딩 체크리스트
   생존 수첩 텍스트를 읽지 않는 유저를 위해, 첫 1~2일을 눈에 보이는
   할 일 카드로 유도한다. state.questIdx로 진행 단계를 추적하며,
   기존 세이브는 loadSave()에서 -1로 마이그레이션해 표시하지 않는다.
============================================================ */
const QUESTS = [
  { id: 'drink',  icon: '💧', textId: 'quest.drink.text',  loreId: 'quest.drink.lore',  doneId: 'quest.drink.done',  reward: { water: 1 } },
  { id: 'eat',    icon: '🥫', textId: 'quest.eat.text',    loreId: 'quest.eat.lore',    doneId: 'quest.eat.done',    reward: { canned: 1 } },
  { id: 'place',  icon: '🛏️', textId: 'quest.place.text',  loreId: 'quest.place.lore',  doneId: 'quest.place.done',  reward: { cloth: 1 } },
  { id: 'depart', icon: '🎒', textId: 'quest.depart.text', loreId: 'quest.depart.lore', doneId: 'quest.depart.done', reward: {} },
  // '결산 리포트 확인' 단계였음 — 거점 UI에 그런 화면이 없어 유저가 길을 잃었다.
  // 취침 유도로 교체: 자고 일어나면 아침 보고가 뜨는 흐름 자체가 결산을 가르친다.
  { id: 'sleep', icon: '🛌', textId: 'quest.sleep.text', loreId: 'quest.sleep.lore', doneId: 'quest.sleep.done', reward: { bandage: 1 } },
  { id: 'craft',  icon: '🔨', textId: 'quest.craft.text',  loreId: 'quest.craft.lore',  doneId: 'quest.craft.done',  reward: { parts: 1 } },
  { id: 'clean',  icon: '🧹', textId: 'quest.clean.text',  loreId: 'quest.clean.lore',  doneId: 'quest.clean.done',  reward: { water: 1 } },
];
function questActive() { return state.questIdx >= 0 && state.questIdx < QUESTS.length; }
function renderQuestCard() {
  const card = $('quest-card');
  if (!card) return;
  if (!questActive()) { card.classList.remove('show'); return; }
  const q = QUESTS[state.questIdx];
  $('quest-icon').textContent = q.icon;
  const lore = $('quest-lore');
  if (lore) lore.textContent = q.loreId ? t(q.loreId) : '';
  $('quest-text').textContent = t(q.textId);
  // 배치 단계 동안 🔧 버튼 시선 유도 (툴바가 배치 모드 전용이 되면서 진입점을 가르쳐야 한다)
  const eb = $('btn-edit');
  if (eb) eb.classList.toggle('pulse', q.id === 'place');
  $('quest-prog').textContent = t('quest.progress', { cur: state.questIdx, total: QUESTS.length });
  card.classList.remove('done-flash');
  card.classList.add('show');
}
// 퀘스트 진행 훅 — 해당 id가 현재 진행 중인 퀘스트일 때만 완료 처리
function questProgress(id) {
  if (!questActive()) return;
  const q = QUESTS[state.questIdx];
  if (q.id !== id) return;
  for (const [rid, n] of Object.entries(q.reward)) resAdd(rid, n);
  const card = $('quest-card');
  if (card) card.classList.add('done-flash');
  playSfx('place', { vol: 0.2 });
  const rewardMsg = Object.keys(q.reward).length
    ? ' +' + Object.entries(q.reward).map(([rid, n]) => `${RESOURCES[rid].emoji}${n}`).join(' ')
    : '';
  // 완료 payoff — 수첩 주인의 목소리 (없으면 목표 문구 폴백)
  toast((q.doneId ? t(q.doneId) : t(q.textId)) + rewardMsg);
  state.questIdx++;
  renderResBar(); updateHud(); scheduleSave();
  setTimeout(() => {
    if (state.questIdx >= QUESTS.length) {
      state.questIdx = -1; // 체인 완료 — 트래커 퇴장 (마지막 payoff는 위 doneId가 이미 출력)
      renderQuestCard();
      scheduleSave();
    } else {
      renderQuestCard();
      paperSfx();
    }
  }, 600);
}

/* ── 찢어진 쪽지 (1회성 팁) ── */
const tipQueue = [];
let tipShowing = false;
let tipTimer = null;
function showTipNote(id) {
  const note = $('tip-note');
  applyPaperBg(note, 'tip');
  note.textContent = t(id);
  note.style.display = 'block';
  void note.offsetWidth;
  note.classList.add('show');
  paperSfx();
  const dismiss = () => {
    clearTimeout(tipTimer);
    note.classList.remove('show');
    note.removeEventListener('click', dismiss);
    setTimeout(() => {
      note.style.display = 'none';
      tipShowing = false;
      drainTipQueue();
    }, 420); // 슬라이드 아웃 트랜지션 시간만큼 대기
  };
  note.addEventListener('click', dismiss);
  tipTimer = setTimeout(dismiss, 15000);
}
function drainTipQueue() {
  if (tipShowing || !tipQueue.length) return;
  tipShowing = true;
  showTipNote(tipQueue.shift());
}
function tipOnce(id) {
  if (state.tipsSeen[id]) return;
  state.tipsSeen[id] = true;
  tipQueue.push(id);
  drainTipQueue();
  scheduleSave();
}

/* ── 종이 부스럭 소리 (WebAudio 합성 — 오디오 파일 없음) ── */
let sfxCtx = null;
function ensureSfxCtx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});
  return sfxCtx;
}
function paperSfx(sfxOpts = {}) {
  try {
    const ctx = ensureSfxCtx();
    const vol = sfxOpts.sfxVol ?? opts.sfxVol ?? 0.07;
    const bursts = 2 + Math.floor(Math.random() * 2); // 2~3회의 짧은 크랙클
    let t0 = ctx.currentTime;
    for (let b = 0; b < bursts; b++) {
      const dur = 0.06 + Math.random() * 0.06;
      const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const f0 = 1800 + Math.random() * 800;
      const f1 = 3200 + Math.random() * 800;
      bp.frequency.setValueAtTime(f0, t0);
      bp.frequency.linearRampToValueAtTime(f1, t0 + dur);
      bp.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol * (0.5 + Math.random() * 0.5), t0 + dur * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
      t0 += dur * (0.55 + Math.random() * 0.4);
    }
  } catch (e) { /* 오디오 컨텍스트 사용 불가 환경 — 무시 */ }
}
$('btn-exp').addEventListener('click', () => {
  // 탐험 중이거나 부상 중이면 상태 패널, 아니면 바로 지도
  if (state.exp || state.injury) { $('exp-panel').classList.toggle('show'); renderExpPanel(); }
  else openMapModal();
});
$('btn-move').addEventListener('click', openShelterModal);
$('btn-help').addEventListener('click', openHelpModal);
$('btn-rotate').addEventListener('click', rotateActive);
$('btn-delete').addEventListener('click', reclaimSelected);
$('btn-reset').addEventListener('click', () => {
  flushSave();                                     // 마지막 상태를 즉시 기록 후
  setTimeout(() => location.reload(), 500);        // 타이틀로
});
// 인게임 💾 저장 — 즉시 슬롯에 기록해 로비에서 불러올 세이브를 확정 (타이틀 모드에선 버튼 숨김 처리됨)
$('btn-save-now').addEventListener('click', () => {
  if (titleVisible) return; // 안전 가드 — 유령 세이브 방지 (버튼은 CSS로도 숨겨짐)
  flushSave();
  toast(t('save.done', { n: currentSlot }));
});

// 세이브 내보내기: 현재 슬롯의 원본 JSON을 파일로 다운로드 (설정 패널 + 타이틀 화면 공용)
function exportSave() {
  flushSave(); // 예약된 저장을 즉시 반영해 최신 상태를 내보낸다
  const raw = localStorage.getItem(slotKey(currentSlot));
  if (!raw) { toast(t('save.exportNone')); return; }
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shelter-slot${currentSlot}-day${state.day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(t('save.exported'));
}
// 세이브 가져오기: 파일에서 읽어 검증 후 현재 슬롯에 덮어쓰기 (설정 패널 + 타이틀 화면 공용)
function importSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast(t('save.invalidFile')); return; }
      if (!data?.state || data.state.ver == null || data.state.day == null) { toast(t('save.invalidFile')); return; }
      if (!(await gameConfirm(t('save.overwrite', { n: currentSlot }), t('confirm.overwrite'), t('confirm.cancel')))) return;
      try {
        localStorage.setItem(slotKey(currentSlot), JSON.stringify(data));
        localStorage.setItem(LASTSLOT_KEY, String(currentSlot));
      } catch (e) { toast(t('save.failed')); return; }
      location.reload();
    };
    reader.readAsText(file);
  });
  input.click();
}
// P2-a: 인게임 내보내기/가져오기 버튼 제거 — 세이브 파일 관리는 타이틀(t-export/t-import)에서만
$('t-export').addEventListener('click', exportSave);
$('t-import').addEventListener('click', importSave);

const toastEl = $('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

/* ============================================================
   렌더링 옵션 & 픽셀 파이프라인
============================================================ */
let rt = null;
function makeRT() {
  if (rt) rt.dispose();
  const w = Math.max(2, Math.floor(innerWidth / opts.pixel));
  const h = Math.max(2, Math.floor(innerHeight / opts.pixel));
  rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
  postMat.uniforms.tex.value = rt.texture;
  postMat.uniforms.uRes.value.set(w, h);
}
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uLevels: { value: 8.0 }, uQuant: { value: 1.0 }, uDither: { value: 1.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D tex; uniform vec2 uRes;
    uniform float uLevels, uQuant, uDither;
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    void main(){
      vec3 col = texture2D(tex, vUv).rgb;
      col = pow(col, vec3(1.0 / 2.2));
      if (uQuant > 0.5) {
        vec2 pc = floor(vUv * uRes);
        float d = uDither > 0.5 ? (bayer4(pc) - 0.5) * 0.55 / uLevels : 0.0;
        col = clamp(col + d, 0.0, 1.0);
        col = floor(col * uLevels + 0.5) / uLevels;
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));

// 언어 전환 등 재로딩 전 암전 — 재로딩된 페이지는 인라인 스타일로 이미 암전 상태에서 시작 (index.html)
function reloadWithVeil() {
  const veil = $('fade-veil');
  if (veil) {
    veil.style.transition = 'opacity .3s ease';
    veil.style.pointerEvents = 'auto';
    veil.style.opacity = '1';
  }
  setTimeout(() => location.reload(), 320);
}
// v2.4: 저사양 모드 — 그림자맵 끄기 + 날씨 파티클 drawRange 50%
function weatherDrawCount(type) {
  const W = WEATHERS[type];
  if (!W || !W.count) return 0;
  return opts.lowSpec ? Math.round(W.count * 0.5) : W.count;
}
function applyLowSpec() {
  renderer.shadowMap.enabled = !opts.lowSpec;
  shadowDirty();
  if (weather.pts.visible) weather.pts.geometry.setDrawRange(0, weatherDrawCount(weather.type));
}
// 자동 진행 체크박스는 index.html 정적 마크업(#opt-autoplay, #autoplay-row)으로 이전됨 (P2-b)
function refreshAutoplayLock() {
  const cb = $('opt-autoplay');
  const locked = !isZen() && state.day < 10;
  if (cb) cb.disabled = locked;
  const row = $('autoplay-row');
  if (row) row.title = locked ? t('opt.autoplay.locked') : t('opt.autoplay.title');
  if (locked && opts.autoPlay) { opts.autoPlay = false; if (cb) cb.checked = false; }
  syncAutoBtn();
}
// P2-b: cam-ctrl의 자동진행 토글 버튼 상태 동기화 (켜짐 → .primary 하이라이트)
function syncAutoBtn() {
  const b = $('btn-auto');
  if (b) b.classList.toggle('primary', !!opts.autoPlay);
}
// v0.9.2 배치 모드 토글
function toggleEditMode(force) {
  editMode = force === undefined ? !editMode : !!force;
  const b = $('btn-edit');
  if (b) b.classList.toggle('primary', editMode);
  // 하단 인벤토리 바는 배치 모드 전용 (CSS: body:not(.edit-mode) #toolbar 숨김)
  document.body.classList.toggle('edit-mode', editMode);
  if (editMode) {
    toast(t('edit.on'));
  } else {
    toast(t('edit.off'));
    deselect(); // 모드 해제 시 선택 해제
  }
}
function applyOpts() {
  $('opt-pixel').value = opts.pixel; $('opt-quant').checked = opts.quant;
  $('opt-dither').checked = opts.dither; $('opt-ceil').checked = opts.ceil;
  $('opt-autoeat').checked = opts.autoEat !== false;
  $('opt-autoplay').checked = !!opts.autoPlay;
  refreshAutoplayLock();
  $('opt-lang').value = opts.lang || 'ko';
  $('opt-fps').value = String(opts.fpsCap || 60);
  $('opt-lowspec').checked = !!opts.lowSpec;
  $('opt-bgidle').checked = opts.bgIdle !== false;
  // 접근성 (REQ-ACC-01) UI 동기화
  const ef = $('opt-fontscale'); if (ef) ef.value = String(opts.fontScale || 1);
  const ecb = $('opt-colorblind'); if (ecb) ecb.checked = !!opts.colorblind;
  const erm = $('opt-reducemotion'); if (erm) erm.checked = !!opts.reduceMotion;
  // 모바일에선 항상 백그라운드 오디오를 끄므로(위 visibilitychange 참고) 옵션 자체를 숨긴다 (데스크톱 위젯 전용 옵션)
  const bgidleRow = $('bgidle-row'); if (bgidleRow) bgidleRow.style.display = isMobileEnv ? 'none' : '';
  postMat.uniforms.uQuant.value = opts.quant ? 1 : 0;
  postMat.uniforms.uDither.value = opts.dither ? 1 : 0;
  ceilLight.visible = opts.ceil;
  shadowDirty();
  makeRT();
  applyLowSpec();
  applyAccessibility();
}
// 접근성 body 클래스 + 폰트 배율 반영 (REQ-ACC-01). 게임 3D는 불변 — CSS 오버라이드/폰트만.
function applyAccessibility() {
  document.body.classList.toggle('cb-mode', !!opts.colorblind);
  document.body.classList.toggle('reduce-motion', !!opts.reduceMotion);
  // fontScale → --uiz 재계산. 단, 부팅 중(첫 applyOpts) UI 스케일 상수 TDZ 이전엔 건너뛴다.
  // 부팅 경로는 이후 onResize→updateUiScale이 fontScale까지 반영하므로 손실 없음.
  try { updateUiScale(); } catch (e) { /* 부팅 TDZ — onResize가 곧 재적용 */ }
}
$('opt-pixel').addEventListener('input', e => { opts.pixel = +e.target.value; applyOpts(); scheduleSave(); });
$('opt-quant').addEventListener('change', e => { opts.quant = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-dither').addEventListener('change', e => { opts.dither = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-ceil').addEventListener('change', e => { opts.ceil = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-autoeat').addEventListener('change', e => { opts.autoEat = e.target.checked; scheduleSave(); });
$('opt-autoplay').addEventListener('change', e => { opts.autoPlay = e.target.checked; syncAutoBtn(); scheduleSave(); });
$('opt-fps').addEventListener('change', e => { opts.fpsCap = +e.target.value || 60; scheduleSave(); });
$('opt-lowspec').addEventListener('change', e => { opts.lowSpec = e.target.checked; applyLowSpec(); scheduleSave(); });
// 접근성 (REQ-ACC-01)
{
  const ef = $('opt-fontscale'); if (ef) ef.addEventListener('change', e => { opts.fontScale = +e.target.value || 1; applyAccessibility(); scheduleSave(); });
  const ecb = $('opt-colorblind'); if (ecb) ecb.addEventListener('change', e => { opts.colorblind = e.target.checked; applyAccessibility(); scheduleSave(); });
  const erm = $('opt-reducemotion'); if (erm) erm.addEventListener('change', e => { opts.reduceMotion = e.target.checked; applyAccessibility(); scheduleSave(); });
}
$('opt-bgidle').addEventListener('change', e => {
  opts.bgIdle = e.target.checked;
  if (!opts.bgIdle && document.hidden) { bgm.pause(); setAmbience(null); setFire(false); }
  else if (opts.bgIdle && document.hidden) syncSfxAmbience();
  scheduleSave();
});
// 언어 전환: 저장 후 재로딩 (라이브 리렌더 대신 단순하게) — veil로 암전 후 전환
$('opt-lang').addEventListener('change', async e => {
  const next = e.target.value === 'en' ? 'en' : 'ko';
  if (next === (opts.lang || 'ko')) return;
  if (!(await gameConfirm(t('lang.confirm'), t('confirm.change'), t('confirm.cancel')))) { e.target.value = opts.lang || 'ko'; return; }
  opts.lang = next;
  flushSave();               // 즉시 저장 후
  reloadWithVeil();          // 재로딩하며 부팅 시 setLang(opts.lang) 적용
});

/* ============================================================
   위젯 모드 (Electron 전용) — window.nineWidget (preload contextBridge)
   설정은 슬롯 세이브와 분리해 localStorage('nw-widget')에 저장 (기기 종속).
============================================================ */
(function initWidgetMode() {
  const api = window.nineWidget;
  const section = $('widget-section');
  if (!api || !api.available) {
    if (section) section.style.display = 'none';
    return; // 웹/모바일: 섹션 숨김, 아래 로직 전부 skip
  }
  if (section) section.style.display = 'block';

  // ── 디스플레이 모드/해상도 (Electron 전용, #42) ──
  // 주의: Chromium엔 배타적 전체화면이 없어 fullscreen과 borderless는 동일 동작(라벨만 관례상 구분).
  {
    const dsec = $('display-section');
    if (dsec) dsec.style.display = 'block';
    const RES_PRESETS = [
      [1152, 768], [1366, 768], [1440, 900], [1600, 900], [1440, 960], [1680, 1050],
      [1920, 1080], [2048, 1080], [1920, 1200], [2560, 1080], [2560, 1440], [3840, 2160],
    ];
    const DKEY = 'nw-display';
    let dopts = { mode: 'windowed', w: 1280, h: 800 };
    try { Object.assign(dopts, JSON.parse(localStorage.getItem(DKEY) || '{}')); } catch (e) { /* */ }
    const elMode = $('opt-dispmode');
    const elRes = $('opt-dispres');
    if (elMode && elRes) {
      elRes.innerHTML = RES_PRESETS.map(([w, h]) => `<option value="${w}x${h}">${w} × ${h}</option>`).join('');
      // 저장값이 프리셋에 없으면(기본 1280x800 등) 가장 가까운 프리셋으로 표시만 맞춘다
      const cur = `${dopts.w}x${dopts.h}`;
      elRes.value = RES_PRESETS.some(([w, h]) => `${w}x${h}` === cur) ? cur : '1366x768';
      elMode.value = dopts.mode;
      const applyDisplay = () => {
        const [w, h] = elRes.value.split('x').map(Number);
        dopts = { mode: elMode.value, w, h };
        try { localStorage.setItem(DKEY, JSON.stringify(dopts)); } catch (e) { /* */ }
        api.setDisplay({ mode: dopts.mode, width: w, height: h });
        toast(t('disp.applied'));
      };
      // 게임 설정 문법: 셀렉트는 고르기만, 반영은 ✓ 적용 버튼으로 (즉시 반영은 실수 유발)
      elMode.addEventListener('change', () => { $('dispres-row').style.display = elMode.value === 'windowed' ? '' : 'none'; });
      const applyBtn = $('btn-disp-apply');
      if (applyBtn) applyBtn.addEventListener('click', applyDisplay);
      // 부팅 시 저장된 디스플레이 상태 복원 (기본값 그대로면 창 크기를 건드리지 않는다)
      $('dispres-row').style.display = dopts.mode === 'windowed' ? '' : 'none';
      if (api.setDisplay && (dopts.mode !== 'windowed' || `${dopts.w}x${dopts.h}` !== '1280x800')) {
        api.setDisplay({ mode: dopts.mode, width: dopts.w, height: dopts.h });
      }
    }
  }

  const WKEY = 'nw-widget';
  let wopts = { opacity: 1, alwaysOnTop: false, mini: false, clickThrough: false };
  try { Object.assign(wopts, JSON.parse(localStorage.getItem(WKEY) || '{}')); } catch (e) { /* */ }
  const saveWopts = () => { try { localStorage.setItem(WKEY, JSON.stringify(wopts)); } catch (e) { /* */ } };

  const elOpacity = $('opt-widget-opacity');
  const elAot = $('opt-widget-aot');
  const elMini = $('opt-widget-mini');
  const elClick = $('opt-widget-clickthrough');

  // 부팅 시 저장된 설정 복원 (클릭 통과는 안전을 위해 항상 꺼진 채로 시작)
  elOpacity.value = String(Math.round((wopts.opacity ?? 1) * 100));
  elAot.checked = !!wopts.alwaysOnTop;
  elMini.checked = !!wopts.mini;
  elClick.checked = false;
  wopts.clickThrough = false;

  api.setOpacity(wopts.opacity ?? 1);
  api.setAlwaysOnTop(!!wopts.alwaysOnTop);
  api.setMini(!!wopts.mini);
  api.setClickThrough(false);

  elOpacity.addEventListener('input', e => {
    const v = Math.min(1, Math.max(0.3, (+e.target.value || 100) / 100));
    wopts.opacity = v;
    api.setOpacity(v);
    saveWopts();
  });
  elAot.addEventListener('change', e => {
    wopts.alwaysOnTop = e.target.checked;
    api.setAlwaysOnTop(wopts.alwaysOnTop);
    saveWopts();
  });
  elMini.addEventListener('change', e => {
    wopts.mini = e.target.checked;
    api.setMini(wopts.mini);
    saveWopts();
  });

  let clickThroughTimer = null;
  elClick.addEventListener('change', async e => {
    if (e.target.checked) {
      if (!(await gameConfirm(t('widget.clickthrough.confirm'), t('confirm.enable'), t('confirm.cancel')))) { e.target.checked = false; return; }
      wopts.clickThrough = true;
      api.setClickThrough(true);
      toast(t('widget.clickthrough.toast'));
      clearTimeout(clickThroughTimer);
      clickThroughTimer = setTimeout(() => {
        wopts.clickThrough = false;
        api.setClickThrough(false);
        elClick.checked = false;
        toast(t('widget.clickthrough.restored'));
      }, 10000);
    } else {
      clearTimeout(clickThroughTimer);
      wopts.clickThrough = false;
      api.setClickThrough(false);
    }
    saveWopts(); // clickThrough 자체는 항상 false로 저장돼 다음 부팅 시 안전 시작
    wopts.clickThrough = false;
  });
})();

/* ============================================================
   BGM (v1.9) — 날씨/시간대/계절/상황 기반 OST (public/BGM/*.mp3)
   · Main_theme: 타이틀/불러오기 화면 (잔잔하게)
   · Sunny/Raining/Snowing/Gloomy: 현재 날씨 풀
   · Random1~6: 어떤 날씨든 풀에 섞임 / Random_evening: 저녁(17~21시)만
   · Winter1~2: 겨울 계절 한정 랜덤
   · Cat: 고양이 인카운터가 뜬 날 하루 종일 이것만
   · Ending: Day 10000 구조 엔딩에서만
============================================================ */
const BGM_LIB = {
  main: ['Main_theme'],
  ending: ['Ending'],
  cat: ['Cat'],
  weather: {
    clear: ['Sunny1', 'Sunny2', 'Sunny3', 'Sunny4', 'Sunny5', 'Sunny6', 'Sunny7'],
    rain: ['Raining1', 'Raining2', 'Raining3', 'Raining4', 'Raining5', 'Raining6', 'Raining7', 'Raining8'],
    snow: ['Snowing1', 'Snowing2', 'Snowing3', 'Snowing5', 'Snowing6'],
    ash: ['Gloomy1', 'Gloomy2', 'Gloomy3', 'Gloomy4', 'Gloomy5'],
  },
  random: ['Random1', 'Random2', 'Random3', 'Random4', 'Random6'],
  evening: ['Random_evening'],
  winter: ['Winter1', 'Winter2'],
};
const bgm = new Audio();
bgm.preload = 'auto';
let bgmCtxKey = '', bgmTrack = '', bgmErrorShown = false;
bgm.addEventListener('error', () => {
  if (opts.bgm && !bgmErrorShown) { bgmErrorShown = true; toast(t('bgm.notFound')); }
});
function isEveningHour() { const h = gameHour(); return h >= 17 && h < 21; }
function bgmContext() {
  if (endingActive) return { key: 'ending', pool: BGM_LIB.ending, loop: true, vol: 1 };
  if (titleVisible) return { key: 'title', pool: BGM_LIB.main, loop: true, vol: 0.55 }; // 잔잔하게
  if (state.catMusicDay && state.catMusicDay === state.day)
    return { key: 'cat', pool: BGM_LIB.cat, loop: true, vol: 1 }; // 그날 하루 종일
  // storm은 rain 풀을 그대로 사용
  const wpool = BGM_LIB.weather[weather.type === 'storm' ? 'rain' : weather.type] || BGM_LIB.weather.clear;
  let pool = [...wpool, ...BGM_LIB.random];
  if (isEveningHour()) pool = pool.concat(BGM_LIB.evening);
  if (seasonOf().id === 'winter') pool = pool.concat(BGM_LIB.winter);
  return { key: `w:${weather.type}|e:${isEveningHour() ? 1 : 0}|s:${seasonOf().id}`, pool, loop: false, vol: 1 };
}
/* ── BGM 트랜지션 규칙 (v2.8)
 *  · 일반 컨텍스트 변화(날씨/저녁/계절): 지금 곡은 끝까지 재생 → 곡 말미 3초 페이드아웃
 *    → 다음 곡(새 풀에서)이 페이드인. 곡 중간에 뚝 끊지 않는다.
 *  · 특수 컨텍스트(타이틀/고양이 날/엔딩) 진입·이탈: 0.9초 페이드아웃 후 즉시 전환(페이드인).
 */
let bgmFadeTimer = null, bgmTail = false;
function bgmTargetVol(ctx) { return (opts.bgmVol ?? 0.15) * ctx.vol; }
function bgmFade(to, ms, done) {
  clearInterval(bgmFadeTimer);
  const from = bgm.volume, t0 = performance.now();
  bgmFadeTimer = setInterval(() => {
    const u = Math.min(1, (performance.now() - t0) / ms);
    bgm.volume = from + (to - from) * u;
    if (u >= 1) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; if (done) done(); }
  }, 50);
}
function playBgmTrack(name, ctx, fadeIn = true) {
  bgmTrack = name;
  bgmTail = false;
  bgm.loop = ctx.loop;
  bgm.src = `BGM/${name}.mp3`;
  bgm.volume = fadeIn ? 0 : bgmTargetVol(ctx);
  if (opts.bgm) bgm.play().catch(() => { /* 사용자 제스처 대기 (자동재생 정책) */ });
  if (fadeIn) bgmFade(bgmTargetVol(ctx), 1600);
}
function pickBgmTrack(ctx) {
  const cands = ctx.pool.filter(n => n !== bgmTrack);
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : ctx.pool[0];
}
const BGM_SPECIAL = key => key === 'title' || key === 'cat' || key === 'ending';
function syncBgm(forcePlay = false) {
  const ctx = bgmContext();
  if (ctx.key !== bgmCtxKey) {
    const crossNow = BGM_SPECIAL(ctx.key) || BGM_SPECIAL(bgmCtxKey) || bgm.paused || !bgm.src;
    bgmCtxKey = ctx.key;
    if (crossNow) bgmFade(0, 900, () => playBgmTrack(pickBgmTrack(ctx), ctx));
    // 일반 변화는 여기서 곡을 끊지 않는다 — ended 시점에 새 풀로 넘어간다
  } else if (!bgmFadeTimer && !bgmTail) {
    bgm.volume = bgmTargetVol(ctx); // 음량 슬라이더 즉시 반영
    if (forcePlay && opts.bgm && bgm.paused && bgm.src) bgm.play().catch(() => {});
  }
}
// 곡 자연 종료 → 현재 컨텍스트 풀에서 다음 곡 페이드인
bgm.addEventListener('ended', () => {
  const ctx = bgmContext();
  bgmCtxKey = ctx.key;
  playBgmTrack(pickBgmTrack(ctx), ctx);
});
// 곡 말미 3초 페이드아웃 (루프 곡 제외)
bgm.addEventListener('timeupdate', () => {
  if (bgm.loop || !bgm.duration || bgmFadeTimer) return;
  const remain = bgm.duration - bgm.currentTime;
  if (remain < 3) {
    bgmTail = true;
    bgm.volume = bgmTargetVol(bgmContext()) * Math.max(0, remain / 3);
  } else bgmTail = false;
});
// 셸터별 빗소리 앰비언스 (지역 재질감 반영) — storm은 셸터 무관 rain_heavy로 통일
const RAIN_AMB = {
  container: 'rain_roof', bunker: 'rain_roof', ship: 'rain_roof', lighthouse: 'rain_roof',
  rooftop: 'rain_city',
  cabin: 'rain_forest', greenhouse: 'rain_forest',
  bus: 'rain_road',
};
/* ── SFX 앰비언스/난로 상태 동기화 (날씨·실내·가구 상태 → 루프 채널) ── */
function syncSfxAmbience() {
  if (titleVisible || endingActive) { setAmbience(null); setFire(false); setSeasonAmbience(null); return; }
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  let calmOutdoor = false; // 맑은 날 실외 = 계절 앰비언스가 깔릴 수 있는 조건
  // 날씨발 앰비언스 전환은 긴 페이드(#83) — 루프가 뚝 시작/종료하는 "이상한 소리" 원천 제거
  const wf = WEATHER_AMB_FADE;
  if (indoorSh) {
    setAmbience(null, undefined, wf);
  } else if (weather.type === 'storm') {
    setAmbience('rain_heavy', undefined, wf);
  } else if (weather.type === 'rain') {
    setAmbience(RAIN_AMB[state.current] || 'rain_roof', undefined, wf);
  } else if (weather.type === 'snow') {
    setAmbience('amb_wind', undefined, wf);
  } else if (weather.type === 'ash') {
    setAmbience('amb_wind', undefined, wf); // 재(灰) 날씨는 별도 루프가 없어 바람 앰비언스로 간이 처리
  } else {
    setAmbience(null, undefined, wf);
    calmOutdoor = true;
  }
  // 계절 앰비언스(#13): 맑은 날 실외에서만 계절 배경음(봄새/여름벌레/가을바람/겨울삭풍).
  // 실내이거나 날씨 루프가 이미 깔린 경우엔 계절음을 끈다(중첩 방지).
  setSeasonAmbience(calmOutdoor ? seasonOf().id : null);
  // v0.9.1: 캔들/랜턴은 타닥거리는 fire 루프에서 제외 — 장작 난로(stove)만 fire 루프 재생.
  // 캔들 전용 타닥 소리는 사용자 파일 제공 시 별도 채널로 추가 예정.
  const fireOn = items.some(it => it.defId === 'stove' && it.on !== false);
  setFire(fireOn);
}
// 모바일 대응: 재생은 반드시 사용자 제스처 안에서 시작 (자동재생 정책)
$('bgm-row').style.display = 'flex';
$('opt-bgm').checked = !!opts.bgm;
$('opt-bgmvol').value = Math.round((opts.bgmVol ?? 0.15) * 100);
$('opt-sfxvol').value = Math.round((opts.sfxVol ?? 0.07) * 100);
// 자동재생이 거부돼 멈춰 있으면 다음 입력에서 재개 (상시)
addEventListener('pointerdown', () => { if (opts.bgm && bgm.paused) syncBgm(true); });
// SFX AudioContext도 사용자 제스처 없이는 시작 불가 — 같은 첫 pointerdown에서 초기화
initSfx();
setSfxVol(opts.sfxVol ?? 0.07);
$('opt-bgm').addEventListener('change', e => {
  opts.bgm = e.target.checked;
  if (opts.bgm) syncBgm(true); // change 이벤트 = 사용자 제스처 → 모바일에서도 재생 허용
  else bgm.pause();
  scheduleSave();
});
$('opt-bgmvol').addEventListener('input', e => {
  opts.bgmVol = (+e.target.value) / 100;
  syncBgm();
  scheduleSave();
});
$('opt-sfxvol').addEventListener('input', e => {
  opts.sfxVol = (+e.target.value) / 100;
  setSfxVol(opts.sfxVol);
  scheduleSave();
});

/* ============================================================
   시작 & 메인 루프
============================================================ */
if (!loadSave()) {
  // P1-A: 세이브가 없는 첫 실행 — 타이틀에서 골랐던 전역 옵션(언어/음량)을 승계
  try {
    const raw = localStorage.getItem('nw-opts');
    if (raw) {
      Object.assign(opts, JSON.parse(raw));
      if (opts.sfxVol === 0.7) opts.sfxVol = 0.07;   // 구 기본값 하향 마이그레이션
      if (opts.bgmVol === 0.35) opts.bgmVol = 0.15;
    }
  } catch (e) { /* 손상된 nw-opts 무시 */ }
}
setLang(opts.lang || 'ko');   // 세이브된 언어 적용 (기본 ko)
applyStaticI18n();             // index.html 정적 텍스트 치환
// 카메라 열 버튼: 브라우저 네이티브 툴팁(title) 대신 게임 스타일 좌측 라벨(::before, data-label).
// PC=호버 시 표시, 모바일=호버가 없으니 퀘스트 유도(pulse) 중에만 상시 표시 + 토글 토스트가 보조.
for (const b of document.querySelectorAll('#cam-ctrl .cam-btn, #btn-gear')) {
  if (b.title) { b.dataset.label = b.title; b.removeAttribute('title'); }
}
loadShelter(state.current);
renderInventoryBar();
renderResBar();
renderExpPanel();
applyOpts();
updateHud();
updateClock();
renderQuestCard();
if (state.minimizedEvent && EVENTS[state.minimizedEvent]) showEventChip(state.minimizedEvent); // 로드 후 내려둔 이벤트 칩 복원
$('btn-clean').addEventListener('click', cleanShelter);
$('btn-wardrobe').addEventListener('click', openWardrobeModal); // #86④
$('btn-edit').addEventListener('click', () => toggleEditMode());
$('btn-pause').addEventListener('click', () => setPaused(!paused));
// P2-b: 자동 진행 토글 버튼 (cam-ctrl) — Day 10 미만이면 잠금 토스트, 아니면 opts.autoPlay 토글 + 체크박스 양방향 동기화
$('btn-auto').addEventListener('click', () => {
  if (!isZen() && state.day < 10) { toast(t('auto.locked')); return; }
  opts.autoPlay = !opts.autoPlay;
  const cb = $('opt-autoplay'); if (cb) cb.checked = opts.autoPlay;
  syncAutoBtn();
  scheduleSave();
  toast(t(opts.autoPlay ? 'auto.on' : 'auto.off'));
});
syncAutoBtn();
$('btn-craft').addEventListener('click', openCraftModal);
$('btn-journal').addEventListener('click', () => openJournalModal('journal'));
$('g-hunger').addEventListener('click', eatFood);
$('g-thirst').addEventListener('click', drinkWater);
$('g-energy').addEventListener('click', () => promptSleep());
$('btn-sleep').addEventListener('click', () => promptSleep());
$('btn-cancel-place').addEventListener('click', () => cancelPlacing());
// 온스크린 카메라 컨트롤 (모바일/데스크톱 공용)
$('cam-rotl').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw -= Math.PI / 2; }); // v1.5.1: 90° 스텝 — 정면 T자 원천 차단
$('cam-rotr').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw += Math.PI / 2; });
$('cam-zin').addEventListener('click', () => { exitCatCloseup(); camState.zoom = THREE.MathUtils.clamp(camState.zoom * 1.25, 0.25, 3.2); });
$('cam-zout').addEventListener('click', () => { exitCatCloseup(); camState.zoom = THREE.MathUtils.clamp(camState.zoom * 0.8, 0.25, 3.2); });
$('cam-home').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw = Math.PI / 4; setPanTarget(0, 0); fitZoomForShelter(); }); // #70: 홈 복귀에 팬 0,0 리셋 포함
// 패널 드래그/접기 활성화
makeDraggablePanel($('hud'), 'hud', t('panel.hud'));
makeDraggablePanel($('exp-panel'), 'exp', t('panel.exp'));
makeDraggablePanel($('clock-panel'), 'clock', t('panel.clock'));
makeDraggablePanel($('res-bar'), 'res', t('panel.res'));
// #52: 설정은 전용 중앙 오버레이(#settings-screen) — 시작 시 항상 닫힘. 전 경로(타이틀·ESC·톱니)가 개폐.

// UI 스케일 상수 — 아래 부팅 분기(ps-load 경로의 hideTitle→onResize→updateUiScale)보다
// 먼저 평가되어야 한다. 선언이 뒤에 있으면 불러오기 부팅이 TDZ로 죽는다.
const UI_BASE_FONT = 11;   // .panel 계열 기본 폰트 크기(px) — 이 값 자체가 이미 최소 가독 크기
const UI_MIN_FONT = 11;    // 스케일 후에도 유지해야 할 최소 렌더 폰트(px)
// P0: 전 UI 확대(가독성)를 JS에서 곱한다 — CSS zoom은 var(--uiz)만 쓰므로
// 렌더 배율과 드래그/클램프 좌표 보정 배율이 항상 동일한 단일 소스(--uiz)로 일치한다.
// v0.9.5: 1.15→1.25 — "안 보인다" 다수 피드백. cozy는 작은 글씨가 아니라 따뜻한 색에서 나온다.
const TEXT_BOOST = 1.25;

// 타이틀 / 인트로 (자리 비운 사이 끝난 탐험 정산은 hideTitle에서 — 타이틀에선 집만 보여준다)
$('t-continue').addEventListener('click', hideTitle);
// 타이틀 언어 선택 (설정 진입 없이 첫 화면에서)
function pickTitleLang(next) {
  if (next === (opts.lang || 'ko')) return;
  opts.lang = next;
  flushSave();
  reloadWithVeil();
}
$('lang-ko').addEventListener('click', () => pickTitleLang('ko'));
$('lang-en').addEventListener('click', () => pickTitleLang('en'));
$('t-new').addEventListener('click', () => openSlotModal('new'));
$('t-load').addEventListener('click', () => openSlotModal('load'));
$('t-help').addEventListener('click', openHelpModal);
// #52: 타이틀 ⚙️ — 전용 설정 오버레이 토글 (인게임과 동일 창)
$('t-settings').addEventListener('click', () => toggleSettingsPanel());
/* ============================================================
   QA 치트 모드 (#43) — 배포본 숨은 진입점
   진입: 타이틀 버전 표기(#title-ver) 5연타(2초 내). 인게임 미노출(타이틀에서만).
   라벨은 QA 전용이므로 한국어만 (i18n 예외).
============================================================ */
let _qaTaps = [];
$('title-ver').addEventListener('click', () => {
  if (!titleVisible) return; // 인게임/인트로에선 반응 없음
  if (DEMO_ED) return; // #74: 소비자 대면 데모 빌드엔 치트 진입점 자체를 봉인
  const now = Date.now();
  _qaTaps.push(now);
  _qaTaps = _qaTaps.filter(t => now - t <= 2000); // 2초 창
  if (_qaTaps.length >= 5) { _qaTaps = []; openQaPanel(); }
});
function markQa() { state.qaUsed = true; } // 오염 방지 플래그 — 업적 해금 무시용
function openQaPanel() {
  const btn = (id, label) => `<button class="pixel-btn" data-qa="${id}" style="margin:3px;font-size:11px">${label}</button>`;
  const body = `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">⚙️ QA 전용 · 사용 시 이 세이브의 신규 업적은 잠깁니다 (qaUsed)</div>
    <div style="display:flex;flex-wrap:wrap">
      ${btn('res100', '자원 전종 +100')}
      ${btn('gauges', '게이지 풀')}
      ${btn('unlockAll', '전 셸터 해금')}
      ${btn('day1', 'Day +1')}
      ${btn('day10', 'Day +10')}
      ${btn('day35', '겨울 직전(Day 35)')}
      ${btn('w_clear', '날씨 맑음')}
      ${btn('w_snow', '날씨 눈')}
      ${btn('w_rain', '날씨 비')}
      ${btn('w_storm', '날씨 폭풍')}
      ${btn('w_ash', '날씨 재')}
      ${btn('coldsnap', '한파 즉시 발동')}
      ${btn('cat', '고양이 소환')}
      ${btn('questSkip', '온보딩 스킵')}
    </div>
    <div id="qa-status" style="font-size:11px;color:var(--good);margin-top:8px;min-height:16px"></div>`;
  openModal('🛠️ QA 치트 패널', body);
  const status = m => { const el = $('qa-status'); if (el) el.textContent = m; };
  $('modal-body').querySelectorAll('[data-qa]').forEach(b => b.addEventListener('click', () => {
    markQa();
    const k = b.dataset.qa;
    switch (k) {
      case 'res100': for (const id of Object.keys(RESOURCES)) state.res[id] = (state.res[id] || 0) + 100; status('자원 전종 +100'); break;
      case 'gauges': state.hunger = state.thirst = state.energy = 100; if (state.injury) state.injury = null; status('게이지 풀 + 부상 치료'); break;
      case 'unlockAll': { const maxUnlock = Math.max(...Object.values(SHELTERS).map(s => s.unlockAt || 0)); state.successes = Math.max(state.successes, maxUnlock); status('전 셸터 해금 (successes=' + state.successes + ')'); break; }
      case 'day1': state.day += 1; state.gameMin += 1440; status('Day → ' + state.day); break;
      case 'day10': state.day += 10; state.gameMin += 1440 * 10; status('Day → ' + state.day); break;
      case 'day35': { const d = 35; state.gameMin += (d - state.day) * 1440; state.day = d; status('Day → 35 (겨울 직전)'); break; }
      case 'w_clear': setWeather('clear'); status('날씨 = 맑음'); break;
      case 'w_snow': setWeather('snow'); status('날씨 = 눈'); break;
      case 'w_rain': setWeather('rain'); status('날씨 = 비'); break;
      case 'w_storm': setWeather('storm'); status('날씨 = 폭풍'); break;
      case 'w_ash': setWeather('ash'); status('날씨 = 재'); break;
      case 'coldsnap': state.coldSnap = { until: state.day + 2, severity: 1 }; state.coldSnapForecast = 0; status('한파 발동 (until Day ' + (state.day + 2) + ')'); break;
      case 'cat': state.cat = true; spawnCat(); status('고양이 소환'); break;
      case 'questSkip': state.questIdx = -1; renderQuestCard(); status('온보딩 퀘스트 스킵'); break;
    }
    updateHud(); renderResBar(); if (!state.exp) renderExpPanel(); scheduleSave();
  }));
}
/* ============================================================
   #89 QA 에디션 상주 로직 (빌드 플래그 __QA_EDITION__ — 정식 빌드에선 데드코드로 트리셰이킹)
   디렉터 스펙: "자원이든 뭐든 무한. 직접 파밍하고 언락하려니 너무 오래걸려" + 별도 바이너리 +
   세이브 분리(KEY_NS) + 업적 no-op(checkAchievements) + 워터마크. 라벨은 QA 전용이라 한국어만(i18n 예외).
============================================================ */
if (QA_ED) {
  // 워터마크: 상시 좌하단 — 스크린샷이 섞여도 에디션이 즉시 식별되게
  const wm = document.createElement('div');
  wm.id = 'qa-watermark';
  wm.textContent = 'QA EDITION · v' + (typeof __APP_VER__ !== 'undefined' ? __APP_VER__ : '?') + ' · 테스트 전용';
  wm.style.cssText = 'position:fixed;left:8px;bottom:6px;z-index:9000;pointer-events:none;'
    + 'font:bold 11px/1.4 monospace;color:#ffd88a;opacity:.6;text-shadow:0 1px 2px #000;letter-spacing:.5px';
  document.body.appendChild(wm);
  // 상시 만땅(2초 주기): 자원 전종 999 보충 + 게이지 풀 + 전 셸터 해금 + 오염 각인.
  //   스폰/날씨/개조 로직은 건드리지 않는다 — 콘텐츠 검수용이지 별개 밸런스가 아니다.
  const maxUnlock = Math.max(...Object.values(SHELTERS).map(s => s.unlockAt || 0));
  setInterval(() => {
    if (!state || !state.res) return;
    state.qaUsed = true;
    let dirty = false;
    for (const id of Object.keys(RESOURCES)) if ((state.res[id] || 0) < 500) { state.res[id] = 999; dirty = true; }
    if (state.hunger < 100 || state.thirst < 100 || state.energy < 100) { state.hunger = state.thirst = state.energy = 100; dirty = true; }
    if ((state.successes || 0) < maxUnlock) { state.successes = maxUnlock; dirty = true; }
    if (dirty && !titleVisible) { updateHud(); renderResBar(); }
  }, 2000);
}
if (sessionStorage.getItem('ps-intro')) {
  sessionStorage.removeItem('ps-intro');
  showIntro();
} else if (sessionStorage.getItem('ps-load')) {
  sessionStorage.removeItem('ps-load');
  hideTitle(); // 불러오기 직후: 타이틀 없이 바로 집으로 (그때 이전 내역 결산 표시)
} else {
  showTitle();
}

/* ============================================================
   UI 동적 스케일 (--uiz): 저해상도(WSVGA)~4K·모바일 전 구간 대응
   기준 1400x860에서 1.0, 화면이 커질수록 확대, 작아질수록 축소.
   본문 기준 폰트(11px)가 스케일 후 11px 밑으로 내려가지 않도록 하한 보정.
============================================================ */
// (UI_BASE_FONT/UI_MIN_FONT/TEXT_BOOST 상수는 부팅 분기 위에서 선언 — TDZ 방지)
function updateUiScale() {
  let s = Math.min(innerWidth / 1400, innerHeight / 860);
  // 초소형 창(위젯 미니 480x300 등): 최소 가독 폰트 하한을 고집하면 UI가 화면을 넘어버린다.
  // 기준(960x600) 미만에선 하한을 창 크기 비례로 풀어 "작아도 다 보이는" 쪽을 택한다.
  // 단, 모바일은 CSS폭이 원래 좁다(세로 ~412px) — 미니창 취급하면 UI가 쪼그라든다(v0.9.5 리그레션).
  // 모바일은 항상 기존 하한(1.0) 경로: 폰 비율은 폰 문법대로.
  const tiny = !isMobileEnv && (innerWidth < 960 || innerHeight < 600);
  s = THREE.MathUtils.clamp(s, tiny ? 0.35 : 0.85, 2.1);
  if (!tiny) {
    // 스케일 후 기준 폰트(11px)가 최소 가독 크기(11px) 밑으로 내려가지 않게 보정
    const minScale = UI_MIN_FONT / UI_BASE_FONT; // = 1.0
    if (s < minScale) s = minScale;
  }
  s *= TEXT_BOOST * (opts.fontScale || 1); // 가독성 부스트 + 접근성 폰트 3단(REQ-ACC-01)
  // #87 스윕(디렉터 실기기): 세로 모바일에서 데스크톱용 부스트가 그대로 먹어 "내 집이 안 보일" 만큼 UI가 큼
  //   → 세로(폭<높이) + 좁은 폭에서만 16% 축소. 기준 폰트 11px×1.05≈11.5px — 가독 하한은 지킨다.
  if (isMobileEnv && innerHeight > innerWidth && innerWidth < 560) s *= 0.84;
  document.documentElement.style.setProperty('--uiz', s.toFixed(3));
  return s;
}
function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  makeRT();
  resizeFx();
  updateUiScale();
  // 타이틀 화면에선 .panel 전체가 display:none이라 getBoundingClientRect()가 0을 반환 —
  // 그 상태로 배치/클램프하면 위치가 (0,0)으로 망가진다. 실제 게임 화면일 때만 계산한다.
  // (hideTitle()이 게임 진입 시점에 onResize()를 다시 호출해 그때 제대로 잡아준다.)
  if (!titleVisible) {
    autoStackPanels();
    reclampAllPanels();
  }
}
addEventListener('resize', onResize);
onResize();

const clock = new THREE.Clock();
let uiTick = 0;

/* ============================================================
   #14 게임패드 (REQ-INP-02) — Gamepad API 폴링 (renderFrame 훅)
   ------------------------------------------------------------
   좌스틱=가상 커서 · 우스틱=카메라 회전 · A=클릭(elementFromPoint 합성)
   B=닫기/ESC · LB/RB=줌 · Start=일시정지 · Y=배치모드.
   커서는 패드 입력 시에만 표시, 마우스 이동 시 숨김.
   ============================================================ */
const padState = {
  active: false,        // 패드 커서 표시 중 (마우스 이동 시 false)
  x: window.innerWidth / 2, y: window.innerHeight / 2,
  prev: {},             // 버튼 엣지 검출 (직전 프레임 pressed 상태)
  lastPollTime: 0,
};
// 표준 매핑 버튼 인덱스 (Standard Gamepad)
const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, START: 9 };
function padDead(v) { return Math.abs(v) < BAL.input.padDeadzone ? 0 : v; }
function showPadCursor(show) {
  padState.active = show;
  const c = $('pad-cursor'); if (!c) return;
  c.classList.toggle('show', show);
  if (show) { c.style.left = padState.x + 'px'; c.style.top = padState.y + 'px'; }
}
// 커서 위치에 클릭 합성 (A 버튼) — elementFromPoint로 대상 요소에 pointer/click 이벤트 발생.
// 모달/확인창도 이 합성 경로로 자동 조작 가능(위치만 맞으면).
function padSynthClick() {
  const el = document.elementFromPoint(padState.x, padState.y);
  if (!el) return;
  const opt = { bubbles: true, cancelable: true, clientX: padState.x, clientY: padState.y, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opt, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', opt));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opt, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opt));
  el.dispatchEvent(new MouseEvent('click', opt));
  if (typeof el.focus === 'function') { try { el.focus(); } catch (e) { /* */ } }
}
// B = 닫기/ESC: 기존 ESC 우선순위 스택 재사용
function padBack() {
  if (settingsOpen()) { closeSettings(); }
  else if (placing) { cancelPlacing(); }
  else if (selected) { deselect(); }
  else if ($('modal-back').classList.contains('show')) { closeModal(); }
  else if ($('confirm-back').classList.contains('show')) { settleConfirm(false); }
}
function pollGamepad(dt) {
  const pads = (typeof navigator.getGamepads === 'function') ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) { if (p && p.connected !== false) { pad = p; break; } }
  if (!pad) return;
  const ax = pad.axes || [], btn = pad.buttons || [];
  const pressed = i => !!(btn[i] && (btn[i].pressed || btn[i].value > 0.5));
  const edge = i => { const now = pressed(i); const was = !!padState.prev[i]; padState.prev[i] = now; return now && !was; };
  // 좌스틱 → 가상 커서
  const lx = padDead(ax[0] || 0), ly = padDead(ax[1] || 0);
  const anyStick = lx || ly || padDead(ax[2] || 0) || padDead(ax[3] || 0);
  const anyBtn = btn.some(b => b && (b.pressed || b.value > 0.5));
  if (anyStick || anyBtn) { if (!padState.active) showPadCursor(true); }
  if (lx || ly) {
    const sp = BAL.input.padCursorSpeed * dt;
    padState.x = Math.max(0, Math.min(window.innerWidth, padState.x + lx * sp));
    padState.y = Math.max(0, Math.min(window.innerHeight, padState.y + ly * sp));
    const c = $('pad-cursor'); if (c) { c.style.left = padState.x + 'px'; c.style.top = padState.y + 'px'; }
  }
  // 우스틱 → 카메라 회전
  // #70: 게임패드 팬은 이번 배치 제외 — 우스틱 X가 이미 회전을 점유 중이고, R3 클릭 토글/우스틱 Y 혼용은
  //   회전↔팬 혼입 오조작 우려가 있어 보류. 필요해지면 BAL.input에 pad 팬 속도를 열고 여기서 setPanTarget 분기.
  const rx = padDead(ax[2] || 0);
  if (rx) { if (catCam.active) exitCatCloseup(); camState.targetYaw += rx * BAL.input.padCameraSpeed * dt; }
  // LB/RB → 줌 (홀드 연속)
  if (pressed(PAD_BTN.RB)) camState.zoom = THREE.MathUtils.clamp(camState.zoom * BAL.input.padZoomStep, 0.25, 3.2);
  if (pressed(PAD_BTN.LB)) camState.zoom = THREE.MathUtils.clamp(camState.zoom / BAL.input.padZoomStep, 0.25, 3.2);
  // 버튼 엣지 액션
  if (edge(PAD_BTN.A)) padSynthClick();
  if (edge(PAD_BTN.B)) padBack();
  if (edge(PAD_BTN.START)) setPaused(!paused);
  if (edge(PAD_BTN.Y)) { if (!titleVisible && !settingsOpen()) toggleEditMode(); }
}
// 마우스가 움직이면 패드 커서 숨김 (실제 마우스로 복귀)
addEventListener('pointermove', () => { if (padState.active) showPadCursor(false); });

function renderFrame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  pollGamepad(dt);
  if (!titleVisible && !paused && !endingActive) tickTime(dt); // 타이틀·일시정지·엔딩 중엔 시간 정지
  else if (state.exp) state.exp.end += dt * 1000; // 탐험 실시간 타이머도 함께 멈춘다
  applyTimeLighting();
  updateCamera();
  updateWallCulling(dt);
  updateEnvironment(t, dt);
  updateWeather(dt, t);
  updateCat(t, dt);
  wildlifeSys.update(t, dt); // F-1a: 야생동물 로밍/개막 연출
  avatarSys.update(t, dt);   // #86: 주인공 아바타 실내 생활
  updateCraftFx(dt); // ④ 제작 손맛 아이콘/반짝임 연출
  tickRadioBubble(); // 라디오 방송 자막 버블 재투영/페이드 (#12)
  for (const it of items) {
    if (it.lightObj && it.on !== false && DEFS[it.defId].light?.flicker) {
      const k = 0.8 + 0.25 * Math.sin(t * 11) * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 23);
      it.lightObj.intensity = it.lightBase * k;
      if (it.glowSprite) it.glowSprite.material.opacity = it.glowBase * (0.6 + 0.4 * k); // 헤일로도 함께 일렁임
    }
  }
  // 빛기둥 먼지 부유 (그룹 오프셋만 — 정점 갱신 없이 공짜)
  for (const p of sunMotes) {
    if (!p.visible) continue;
    p.position.y = 0.03 * Math.sin(t * 0.4 + p.userData.phase);
    p.position.x = 0.02 * Math.sin(t * 0.23 + p.userData.phase * 1.7);
  }
  if (t - uiTick > 0.5) { uiTick = t; tickExpeditionUI(); updateHud(); updateClock(); renderResBar(); syncBgm(); syncSfxAmbience(); }
  renderer.setRenderTarget(rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  updateScreenFx(dt, t);
}
// v2.4: 숨김(document.hidden) 상태에서는 3D 렌더/카메라/환경/FX를 전부 건너뛰고
// 로직(시간 진행 + BGM 상태 동기화)만 1초 간격으로 처리한다 (배터리/CPU 절약).
function logicTick() {
  const dt = Math.min(clock.getDelta(), 1.5); // 숨김 중엔 긴 델타 허용 (1초 간격 폴링)
  if (!titleVisible && !paused && !endingActive) tickTime(dt);
  else if (state.exp) state.exp.end += dt * 1000;
  syncBgm();
}
let hiddenTimer = null;
function stopHiddenTimer() { if (hiddenTimer) { clearInterval(hiddenTimer); hiddenTimer = null; } }
// [버그 수정] 탭이 처음부터 숨겨진 채 로드되면 visibilitychange가 안 울려
// 로직 틱이 영영 설치되지 않아 게임이 동결됨 — 상태 기반으로 보장한다.
function ensureHiddenTicker() {
  if (document.hidden && !hiddenTimer) hiddenTimer = setInterval(logicTick, 1000);
  if (!document.hidden) stopHiddenTimer();
}
// v0.9.1: 모바일에서는 백그라운드 전환 시 opt-bgidle 설정과 무관하게 항상 오디오를 끈다
// (데스크톱 위젯 모드처럼 계속 재생시키면 배터리/사용자 경험에 불리하다). isMobileEnv는 위쪽에서 선언.
document.addEventListener('visibilitychange', () => {
  ensureHiddenTicker();
  if (document.hidden) {
    if (isMobileEnv || !opts.bgIdle) { bgm.pause(); setAmbience(null); setFire(false); }
  } else {
    clock.getDelta(); // 숨김 동안 쌓인 델타를 한 번 버려 rAF 복귀 시 이중 진행 방지
    if (isMobileEnv) { if (opts.bgm) syncBgm(true); syncSfxAmbience(); }
    else if (!opts.bgIdle) syncSfxAmbience(); // 백그라운드 소리 껐던 경우 복귀 시 재개
  }
});
ensureHiddenTicker(); // 부팅 시점이 이미 숨김 상태일 수 있다 (백그라운드 탭에서 열기/최소화 중 리로드)
let lastFrameTime = 0;
function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden) return; // 숨김 중엔 hiddenTimer(logicTick)가 대신 처리
  const capFps = opts.fpsCap || 60;
  if (capFps < 60) {
    const minDelta = 1000 / capFps;
    if (now - lastFrameTime < minDelta) return;
    lastFrameTime = now;
  }
  renderFrame();
}
requestAnimationFrame(animate);
document.getElementById('loading').style.display = 'none';
// 부팅 완료 — 암전 해제 (모든 로드는 검은 화면에서 시작하고, 준비된 게임만 보여준다)
{
  const veil = $('fade-veil');
  if (veil) {
    veil.style.transition = 'opacity .45s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veil.style.opacity = '0';
      veil.style.pointerEvents = 'none';
    }));
  }
}

/* ============================================================
   전역 크래시 방어 (v0.9.1 안정화)
   - error / unhandledrejection 을 잡아 토스트 + 콘솔 기록
   - 5초 스로틀로 스팸 방지, 게임 루프는 계속 돈다
============================================================ */
let __lastGlobalErrAt = 0;
function handleGlobalError(kind, detail) {
  console.error(`[shelter:${kind}]`, detail);
  const now = Date.now();
  if (now - __lastGlobalErrAt < 5000) return; // 5초 스로틀
  __lastGlobalErrAt = now;
  try { toast(t('err.global')); } catch (e) { /* 토스트조차 실패해도 무시 */ }
}
window.addEventListener('error', e => {
  handleGlobalError('error', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', e => {
  handleGlobalError('promise', e.reason || e);
});

/* ============================================================
   밸런스 시뮬레이션 하네스 (디버그 전용)
   - 실시간 대기/사운드/UI 없이 하루 단위로 n일 기대값 정산
   - rateParts 최고 지역 + 준비물 없음으로 매일 EXP_PER_DAY회 탐험
   - resolveExpedition 의 lootRes 수량 로직을 기대값으로 재현
============================================================ */
// lootRes 한 지역의 1회 탐험 기대 획득량 (mult=성공1.0 / 부분0.5)
function expectedLoot(regionId, mult = 1) {
  const r = REGIONS[regionId];
  const out = {};
  // 난이도별 전리품 수급 배수(BAL.economy.incomeMul) — 실게임 rollRes는 hardLoot()로 적용하지만
  //   expectedLoot(시뮬·QA 전용)엔 누락돼 하드 sim이 뻥튀기되던 결함(#76). 기댓값이라 배수를 곱하면 정확.
  const incomeMul = BAL.economy.incomeMul[state.mode] ?? 1;
  for (const [id, min, max, chance] of r.lootRes) {
    const c = chance != null ? chance : 1;
    // resolveExpedition: n = round((min + rand*(max-min)) * mult), n>0만 반영
    const evN = ((min + max) / 2) * mult * incomeMul;
    const contrib = c * evN;
    if (contrib > 0) out[id] = (out[id] || 0) + contrib;
  }
  return out;
}
// 시뮬 전 state 를 신규 게임 스냅샷으로 초기화 (실 UI/아이템은 건드리지 않음)
function simReset() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
  Object.assign(state, fresh);
}
let _simRunning = false; // 시뮬 중엔 계정 통계(recordNormalDay)를 오염시키지 않는다
function simDays(n = 30, opt = {}) {
  if (opt.reset !== false) simReset();
  // 난이도 모드 적용 — simReset이 normal로 되돌린 직후 지정 모드로. 이게 없으면 opt.mode가 사문화돼
  //   하드/하드코어 sim이 전부 노말로 돌던 잠복 결함(2026-07-06 검거, #76 난이도 검증 중).
  //   zen/wallpaper의 시작 물자 보너스는 여기서 재현하지 않는다(로직 경로는 mode 플래그만으로 충분).
  if (opt.mode) state.mode = opt.mode;
  _simRunning = true;
  try {
    const seed = opt.seed;
    if (seed != null) { // 재현 가능한 시드 (간이 LCG로 Math.random 대체)
      let s = seed >>> 0;
      const orig = Math.random;
      Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      try { return _simDaysInner(n, opt); } finally { Math.random = orig; }
    }
    return _simDaysInner(n, opt);
  } finally { _simRunning = false; }
}
function _simDaysInner(n, opt) {
  const snaps = [];
  const expPerDay = opt.expPerDay ?? EXP_PER_DAY;
  // opt.regions: 지역 로테이션 리스트 (예: 4지역 순환). 미지정이면 매일 최고 eff 지역.
  const rotation = Array.isArray(opt.regions) && opt.regions.length ? opt.regions : null;
  for (let d = 0; d < n; d++) {
    // 1) 오늘의 탐험 지역 선택 (준비물 없음)
    let bestId;
    if (rotation) {
      bestId = rotation[d % rotation.length]; // 로테이션: 날짜별 순환
    } else {
      bestId = null; let bestEff = -1; // 최고 eff 지역
      for (const id of Object.keys(REGIONS)) {
        if (isForbiddenRegion(id)) continue; // 1.4 금지 구역은 시뮬 대상 아님(방호복 게이트 — 자동/시뮬 모두 제외)
        const eff = rateParts(id, []).eff;
        if (eff > bestEff) { bestEff = eff; bestId = id; }
      }
    }
    for (let k = 0; k < expPerDay; k++) {
      if (isExhausted()) break; // 탈진하면 더 못 나감
      // 탐험 비용(에너지/게이지) — departExpedition 로직 요약
      const expMul = isHard() ? BAL.hard.expMul : 1; // 하드: 탐험 게이지 소모 +50%
      state.hunger = Math.max(0, state.hunger - BAL.exp.hungerCost * expMul);
      state.thirst = Math.max(0, state.thirst - BAL.exp.thirstCost * expMul);
      state.energy = Math.max(0, state.energy - BAL.exp.energyCost);
      const eff = rateParts(bestId, []).eff;
      const roll = Math.random();
      const success = roll < eff;
      const partial = !success && roll < eff + (1 - eff) * 0.5;
      const mult = success ? 1 : partial ? 0.5 : 0;
      if (mult > 0) {
        const loot = expectedLoot(bestId, mult);
        for (const [id, ev] of Object.entries(loot)) resAdd(id, ev);
      }
      state.expToday = (state.expToday || 0) + 1;
      // 취침으로 에너지가 회복되는 구조라, 탐험 사이 간이 휴식
      if (state.energy < BAL.exp.midRest) state.energy = Math.min(100, state.energy + BAL.exp.midRest);
    }
    // 2) 하루치 게이지 소모 (decayGauges: 1일=1440분) + autoEat
    decayGauges(1440);
    // 3) 하루 정산
    state.day++;
    state.expToday = 0;
    processDay();
    // 4) 취침으로 에너지 리셋 (실게임의 sleepUntilMorning 대응)
    const { energy } = restEnergyValue();
    state.energy = energy;
    // 5) 스냅샷
    const cd = comfortDetail();
    snaps.push({
      day: state.day,
      res: { ...state.res },
      hunger: Math.round(state.hunger),
      thirst: Math.round(state.thirst),
      energy: Math.round(state.energy),
      comfort: cd.score,
      starving: state.hunger <= 0 || state.thirst <= 0,
      coldSnaps: state.coldSnapsThisWinter || 0, // v1.4.1 진단: 그 겨울 누적 한파 실현 횟수(겨울 경계에서 리셋)
    });
  }
  return snaps;
}

// 디버그/테스트용 핸들
window.__shelter = {
  simDays, simReset, expectedLoot,
  isHard, isZen, isHardcore, isWallpaper, hardLoot, loadSave, gameConfirm,
  // 배치 D QA 훅: 무력/구제/종료/통계/전체수거
  helplessNow, checkHelpless, doRescue, endRun, reclaimAll,
  readStats, writeStats, recordNormalDay, wallpaperUnlocked, slotDisplayCount,
  openModeModal, refreshAutoplayLock, runAutoPlay,
  items, DEFS, SHELTERS, REGIONS, RESOURCES, INJURIES, PREPS, DISTRICTS, districtOf, moveCostFor, state, opts, camState, weather, BAL,
  addItem, removeItem, loadShelter, moveToShelter, setItemPower,
  startExpedition, departExpedition, resolveExpedition, setWeather, transitionWeather, weatherTransState: () => ({ prev: weather.transPrev, k: weather.transK, birds: !!weather.transBirds }), rateParts,
  comfortDetail, comfortBreakdown, comfortExpBonus, applyInjury, treatInjury, processDay, showDayReport, cleanShelter,
  slotMeta, updateHud, checkAchievements, renderResBar, renderInventoryBar, // Nine Winters(#11) QA
  seasonOf, SEASONS, openMapModal, eatFood, drinkWater, EVENTS, showEvent, SHELTER_MODS, hasMod, openCraftModal,
  // Phase D (#12 · #35 · #36) QA 훅
  MEMOS, WILLS, BROADCASTS, MEMOS_BY_REGION, eventCtx, eventMatches, drawEvent, eventWeight,
  dropMemo, dropBroadcast, tryDropMemoOnExpedition, tryRadioBroadcast, doctorFragmentsComplete,
  collectMemo, memosCollected, broadcastsCollected, recordDistantLight, addMoodBuff,
  showMemoPage, showBroadcastModal, openJournalModal, bunkerComfortBonus, rebuildBunkerGeometry,
  // 1.1 대형 프로젝트 (ARC-02) QA 훅
  PROJECTS, projectAvailable, projectRec, projectDone, projectSiteStage, investProject,
  // 1.1 항구 QA 훅
  regionUnlocked, harborYardBoostId, icefishAvailable, doIceFish,
  // 1.2 지하 노선도 QA 훅
  openSubwaySegment, subwayOpenCount, subwayReaches, blizzardBlocks,
  marketOpen, marketSlots, marketSlotsLeft, marketOfferCost, marketOfferGetN, doMarketTrade,
  MEMOS_SUBWAY,
  // 1.3 고요한 고원 QA 훅
  SKETCHES, MEMOS_RESORT, avalancheBlocks, avalancheForecastToday, openAvalancheChoice,
  sketchesCollected, sketchesTotal, collectSketch, tryNightSky, showSketchPage, expDuration,
  // 1.4 금지 구역 QA 훅
  MEMOS_RESEARCH, isForbiddenRegion, hazmatUsable, craftHazmat, repairHazmat, wearHazmat,
  broadcastableTotal, broadcastSentCount, pickUnsentSignal, targetSurvivorLights, doBroadcast,
  bunkerUndercroftRoute, showTruthPage, tryDoctorRadio,
  tickRadioBubble, clearRadioBubble, latestRadioItem, positionRadioBubble,
  radioBubbleState: () => radioBubble ? { shown: radioBubble.el.style.display !== 'none', left: radioBubble.el.style.left, top: radioBubble.el.style.top, text: radioBubble.el.textContent } : null,
  coldSnapActive, coldSnapNetSeverity, coldDefenseLevel, winterPrepAdvice, seasonIndex,
  // v1.4.1 QA 훅: i18n/josa/세이브 왕복 검증용 (하네스 전용, 프로덕션 무해)
  t, LName, josa, WEATHERS, buildWinterMemoir, flushSave, loadSave, readSlot, slotKey, setLang,
  // ③ 창유리 성에 QA 훅: 현재 성에 강도 + 창별 오버레이 투명도
  frostState: () => ({ frostLevel, netSev: coldSnapNetSeverity(), panes: winFrostMats.map(m => +m.material.opacity.toFixed(3)) }),
  renderFrame: () => renderFrame(),
  finishExpNow: () => { if (state.exp) { state.exp.end = Date.now(); tickExpeditionUI(); } },
  setHour: h => { state.gameMin = Math.floor(state.gameMin / 1440) * 1440 + h * 60; },
  // v1.9
  setPaused, spawnCat, despawnCat, runEndingSequence, syncBgm, bgmContext, showTitle, hideTitle,
  // 생존 수첩 연출
  openJournalPages, openHelpModal, showTutorialPage, tipOnce, paperSfx, makePaperTexture,
  findSupport, itemsOn, weatherFx,
  bgmInfo: () => ({ key: bgmCtxKey, track: bgmTrack, paused: bgm.paused, vol: bgm.volume }),
  setSnow: v => { snowCover = v; },
  envFx: () => ({ snowCover, wetness }),
  cat: () => getCat(),
  camera, THREE, CAT_POSES,
  // 카메라 QA 훅 (⑥-b): 하네스가 후면 등 임의 앵글을 확보하도록 yaw/pitch/zoom setter를 영구 노출.
  //  setYaw는 targetYaw와 yaw를 함께 세팅해 다음 프레임 즉시 반영(보간 대기 없이 스크린샷 가능).
  setYaw: (rad) => { camState.yaw = camState.targetYaw = rad; },
  setPitch: (rad) => { camState.elev = THREE.MathUtils.clamp(rad, 0.05, Math.PI / 2 - 0.05); },
  setZoom: (z) => { camState.zoom = THREE.MathUtils.clamp(z, 0.2, 3.2); },
  // #70 클램프 팬 QA 훅: setYaw 문법대로 target+현재값 동시 세팅(보간 대기 없이 즉시 반영). 원형 클램프 통과.
  setPan: (x, z) => { setPanTarget(x, z); camState.panX = camState.targetPanX; camState.panZ = camState.targetPanZ; },
  panState: () => ({ x: camState.panX, z: camState.panZ, tx: camState.targetPanX, tz: camState.targetPanZ, max: panMax() }),
  // ④ 고양이 클로즈업 QA 훅
  enterCatCloseup, exitCatCloseup, catCamState: () => ({ active: catCam.active, saved: catCam.saved, center: catCam.center.toArray(), zoom: camState.zoom, dist: camState.dist }),
  setCatMode: (m) => { const c = getCat(); if (c) { c.mode = m; c.timer = 999; } },
  // F-1a 야생동물 QA 훅 (코디네이터 검증용): 상태 조회 + 강제 등장/발자국/퇴장 트리거
  wildlifeState: () => wildlifeSys._debug(),
  wildlifeSpawn: (opening) => wildlifeSys._forceSpawn(opening),
  wildlifeNightPrints: () => wildlifeSys._forceNightPrints(),
  wildlifeLeaveAll: () => wildlifeSys._forceLeaveAll(),
  wildlifeNudge: (i, x, z) => wildlifeSys._nudge(i, x, z), // QA: 클로즈업 검수용 (팬 카메라 부재 보완)
  wildlifeRespawn: (id) => wildlifeSys.respawn(id || state.current),
  avatarState: () => avatarSys._debug(), // #86 QA 훅
  avatarRespawn: () => avatarSys.respawn(),
  avatarForceNext: () => avatarSys._forceNext(),          // #86② QA: 행동 추첨 강제 (상호작용 검증)
  avatarBlocks: (x, z) => avatarSys.blocksPlacement(x, z, { w: 1, d: 1 }), // #86③ QA: 설치 가드 판정
  openWardrobeModal, OUTFITS, // #86④ QA: 옷장
  wallProxyState: () => wallList.map(w => ({ show: w.group.visible, proxy: w.proxy ? w.proxy.visible : null })), // #97 QA
  avatarWalkTo: (x, z) => avatarSys._walkTo(x, z), // #86 QA: 경유점 라우팅 실증
  // #98 QA: 개조 소품 월드 bb 덤프 (증축 겹침 판정용)
  modPropBBoxes: () => { const out = {}; roomGroup.traverse(o => { if (o.userData && o.userData.modProp) { const b = new THREE.Box3().setFromObject(o); out[o.userData.modProp] = { minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2) }; } }); return out; },
  wlObstacleList: () => wlObstacles.slice(), // #95 QA: 등록 장애물 덤프 (프로브 침범 판정용)
  wildlifeWalkTo: (i, x, z) => wildlifeSys._walkTo(i, x, z), // #95 QA: 강제 횡단 (회피 실증)
  swayCount: () => swayProps.length,
  // #71 도심 잠식 QA 훅: 연차/패치·수풀 수/추가 드로우콜 추정(병합 메시 수)
  overgrowthState: () => ({ ...ogState }),
  // ⑥ 고양이 버그픽스 QA 훅: 스폰 가드 상태(⑥b 브릭 감지) + 퍼치 지지면 유효성(⑥a)
  catSpawning: () => catSys.isSpawning(),
  catSupportState: () => { const c = getCat(); return c ? { baseY: +c.baseY.toFixed(3), mode: c.mode, supportValid: c.baseY > 0.12 ? catSupportValid(c) : null, dirty: catSys.getCatSupportDirty() } : null; },
  // ② 쓰다듬기 연출 QA 훅: 눈 감김·갸르릉·꼬리 가속 트리거 + 상태 조회
  petCat: () => petCatResponse(),
  catPetState: () => { const c = getCat(); return c ? { petHappy: c.petHappy || 0, petPurr: c.petPurr || 0, eyesClosed: !!(c.p && c.p.faceMat && c.p.faceMat.map === catFaceHappyTex()) } : null; },
  // 퀘스트 트래커
  QUESTS, questProgress, renderQuestCard, questActive,
  // v0.9.2 개연성 패스 (1부)
  fmtGameDur, expDuration, sleepUntilMorning, tickTime, GAME_MIN_PER_SEC,
  isBlackoutActive: () => blackoutActive,
  renderExpPanel, startPlacing, finishPlacing, select, deselect,
  // v1.2.0 QA 훅: 취침 자율화(②) / 자동진행 지역선택(③) / 천장 컬링(⑥)
  restEnergyValue, restHourMod, promptSleep, pickAutoRegion, updateWallCulling,
  ceilCullState: () => ceilCullList.map(c => ({ visible: c.group.visible, y: c.y })),
  // ① 컬링 페이드 QA 훅: 각 벽의 표시/페이드/재질 transparent 상태 (완료 후 상시 draw call 증가 0 검증용)
  wallCullState: () => wallList.map(w => { const cs = w.group.userData.cull; let transp = 0; if (cs) for (const m of cs.mats) if (m.transparent) transp++;
    return { visible: w.group.visible, fade: cs ? +cs.fade.toFixed(2) : null, target: cs ? cs.target : null, mats: cs ? cs.mats.length : 0, transparentMats: transp }; }),
  dbg: () => ({ reportQueued, blackoutActive, journalOpen, settlingOffline, pendingEvent: state.pendingEvent }),
  // v0.9.2 배치 모드 + 성공률 보정 (2부)
  expActualRate,
  toggleEditMode,
  isEditMode: () => editMode,
  lastSfx: () => dbgSfx,
  resetSfx: () => { dbgSfx = null; },
  // #13 꾸미기 확장 + 사운드 QA 훅
  WALLPAPERS, FLOORINGS, THEME_SETS, DECO_THEME_COMFORT, applyDecoChoice, applyDeco,
  // ④ 제작 손맛 연출 QA 훅: 임의 이모지로 연출 트리거 + 진행 중 연출 수 조회
  spawnCraftFx: (emoji = '🥫') => spawnCraftFx(emoji), craftFxCount: () => craftFx.length,
  themeSetActive, activeThemeSets, currentDeco, EVENT_STING, playEventSting,
  setSeasonAmbience, seasonAmbienceName,
  pickItemAt: (cx, cy) => pickItem({ clientX: cx, clientY: cy }),
  funcClickItem, addItem, catPointBlocked, footprintOf, scene,
  // 편의성 배치 v0.9.2
  canMoveSomewhere, updateMoveBadge, showEventChip, hideEventChip, reclaimSelected,
  currentSlot: () => currentSlot, doSaveNow, flushSave,
  setLang, applyStaticI18n, t,
  // #52 설정 창 (하네스/QA용)
  openSettings, closeSettings, toggleSettingsPanel, switchSettingsTab,
  settingsOpen, resetSettingsTabToDefault, opts,
  // Phase E (#14 입력 · #34 Steam · 접근성) QA 훅
  Platform, KEYBINDS, keyForAction, actionForEvent, saveKeybinds, resetKeybinds,
  applyAccessibility, gamepad: () => padState,
};
