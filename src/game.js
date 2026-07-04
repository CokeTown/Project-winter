import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert } from './lib/helpers.js';
import { DEFS } from './data/furniture.js';
import { lang, setLang, t, LN, LD, LF, applyStaticI18n } from './i18n.js';
import { playSfx, setAmbience, setFire, setSfxVol, initSfx } from './sfx.js';

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
   기본 설정
============================================================ */
const GRID = 0.25;
const SAVE_KEY = 'project-shelter-web-v2';
const OLD_SAVE_KEY = 'project-shelter-web-v1';
const GAME_MIN_PER_SEC = 1.5;   // 실제 1초 = 게임 1.5분 (하루 = 16분)

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
const camState = { yaw: Math.PI / 4, elev: THREE.MathUtils.degToRad(33), dist: 24, zoom: 0.6, targetYaw: Math.PI / 4 };
const camCenter = new THREE.Vector3(0, 0.9, 0);

function updateCamera() {
  camState.yaw += (camState.targetYaw - camState.yaw) * 0.15;
  const { yaw, elev, dist } = camState;
  camera.position.set(
    camCenter.x + dist * Math.cos(elev) * Math.cos(yaw),
    camCenter.y + dist * Math.sin(elev),
    camCenter.z + dist * Math.cos(elev) * Math.sin(yaw)
  );
  camera.lookAt(camCenter);
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
      for (const m of mats) if (!m.userData.shared && !m.map) m.dispose();
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
  new THREE.MeshBasicMaterial({ color: 0xe8eef7, fog: false }));
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
  day:  { fog: 0x788292, skyH: 0x8c9dae, skyZ: 0x54687e, sunC: 0xfff0d0, sunInt: 1.15, hemiC: 0xc8d2de, hemiG: 0x6a625a, hemiInt: 1.05, stars: 0 },
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
  moonMesh.visible = dayness < 0.35;
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
const SEASONS = [
  { id: 'spring', name: '봄',   nameEn: 'Spring', icon: '🌸', tint: [1.03, 1.05, 1.0],  desc: '만물이 깨어난다', descEn: 'all things awaken' },
  { id: 'summer', name: '여름', nameEn: 'Summer', icon: '☀️', tint: [0.97, 1.04, 0.94], desc: '풀이 무성하다', descEn: 'the grass grows thick' },
  { id: 'autumn', name: '가을', nameEn: 'Autumn', icon: '🍂', tint: [1.1, 1.0, 0.86],   desc: '세상이 물든다', descEn: 'the world takes on color' },
  { id: 'winter', name: '겨울', nameEn: 'Winter', icon: '❄️', tint: [1.0, 1.02, 1.1],   desc: '혹독한 계절', descEn: 'a harsh season' },
];
const SEASON_DAYS = 12;
function seasonOf(day = state.day) { return SEASONS[Math.floor((day - 1) / SEASON_DAYS) % 4]; }
function seasonDay(day = state.day) { return ((day - 1) % SEASON_DAYS) + 1; }
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
function rollWeather() {
  const pool = seasonAdjustPool(SHELTERS[state.current].weatherPool || ['clear']);
  let next = pool[Math.floor(Math.random() * pool.length)];
  // 비가 뽑히면 25% 확률로 폭우(storm)로 승격 (seasonAdjustPool의 풀에는 넣지 않음)
  if (next === 'rain' && Math.random() < 0.25) next = 'storm';
  if (next !== weather.type) state.dayLog.notes.push(t('weather.changed', { name: LName(WEATHERS[next]) }));
  setWeather(next);
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
  const W = WEATHERS[weather.type];
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
  // ── 서리: 눈 오는 날 화면 가장자리에 성에와 눈 결정이 낀다
  const frostTarget = (weather.type === 'snow' && !indoorSh && !titleVisible) ? 1 : 0;
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
  const catMod = state.cat ? 6 : 0; // 고양이가 있는 집은 따뜻하다
  // 현실 제약: 단열 취약(악천후 시) / 어둠(조명 필수)
  let limitMod = 0;
  if (sh.cold && (weather.type === 'rain' || weather.type === 'snow' || weather.type === 'storm') && !hasMod('insulation')) limitMod -= sh.cold;
  if (sh.needsLight && light <= 0) limitMod -= sh.needsLight;
  const score = THREE.MathUtils.clamp(18 + furn + light + cleanMod + shelterMod + injuryMod + limitMod + settled + catMod, 0, 100);
  return { furn, light, cleanMod, shelterMod, injuryMod, limitMod, settled, catMod, clean, score };
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
  const hungryPen = (state.hunger < 25 || state.thirst < 25) ? 0.10 : 0; // 허기/갈증
  const buff = state.buff?.exp || 0; // 인카운터 버프/디버프
  const eff = THREE.MathUtils.clamp(r.rate + comfort + shelter + district + gear + buff - weatherPen - injuryPen - hungryPen, 0.05, 0.95);
  return { base: r.rate, comfort, shelter, district, gear, buff, weatherPen, injuryPen, hungryPen, eff };
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
function buildCarWreck(parent, x, z, rotY, rand) {
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
  g.position.set(x, 0, z);
  parent.add(g);
}
function buildPowerPole(parent, x, z, tilt, groundY) {
  const g = new THREE.Group();
  Cyl(g, 0.07, 0.1, 5.4, 0x3d362e, 0, 2.7, 0, 6);
  B(g, 1.5, 0.08, 0.08, 0x3d362e, 0, 4.9, 0);
  B(g, 0.06, 0.14, 0.06, 0x55504a, -0.6, 5.0, 0); B(g, 0.06, 0.14, 0.06, 0x55504a, 0.6, 5.0, 0);
  g.rotation.z = tilt;
  g.position.set(x, groundY, z);
  parent.add(g);
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
  }
  return list;
}

/* ============================================================
   셸터 정의 (컨테이너 → 옥상 캠프 → 숲속 오두막)
============================================================ */
let ROOM = { w: 6.4, d: 2.9, h: 2.4 };
let wallList = [];      // { group, normal }
let blockers = [];      // 고정 소품 충돌 영역 { x, z, w, d }
let envDyn = {};        // 환경별 동적 요소

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
function stdWall(len, h, mat, opts = {}) {
  const g = new THREE.Group();
  const t = 0.22;
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
    sky.position.set(winX, winY, -0.02);
    g.add(sky);
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
function addWallWeatherFx(wallGroup) {
  const bb = new THREE.Box3().setFromObject(wallGroup);
  const len = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  if (len < 0.5 || h < 0.5) return;
  // 눈: 벽 상단에 쌓이는 캡 (snowCover에 따라 두께가 자란다)
  const capGeo = new THREE.BoxGeometry(len * 0.99, 0.17, 0.4);
  capGeo.translate(0, 0.085, 0);
  const cap = new THREE.Mesh(capGeo, snowCapMat);
  cap.position.y = h - 0.02;
  cap.castShadow = false; cap.visible = false;
  wallGroup.add(cap);
  weatherFx.caps.push(cap);
}
function makeWalls(defs) {
  wallList = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    addWallWeatherFx(d.group); // 회전 전(로컬 좌표)에 치수 측정
    d.group.position.set(...d.pos);
    d.group.rotation.y = d.rotY;
    roomGroup.add(d.group);
    wallList.push({ group: d.group, normal: d.normal });
  }
}
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
      roomGroup.add(floor);
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
      // 고사목
      for (let i = 0; i < 26; i++) {
        const a = rand() * Math.PI * 2, r = 8 + Math.pow(rand(), 0.8) * 26;
        const x = r * Math.cos(a), z = r * Math.sin(a);
        const geo = deadTreeGeo(rand, 0.8 + rand() * 1.3);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        const m = new THREE.Mesh(geo, vcLambert);
        m.castShadow = r < 14;
        envRoot.add(m);
      }
      // 폐차 & 전신주 & 잔해
      buildCarWreck(envRoot, 6.2, 3.4, -0.7, rand);
      buildCarWreck(envRoot, -8.5, -5.5, 2.1, rand);
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
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.3, d + 0.8), conc);
      floor.position.y = -0.15; floor.receiveShadow = true;
      roomGroup.add(floor);
      // 입구 앞 콘크리트 포치 (컨셉아트의 앞마당)
      const porch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.22, 1.8), conc);
      porch.position.set(0, -0.19, d / 2 + 1.2);
      porch.receiveShadow = true;
      roomGroup.add(porch);
      B(roomGroup, w + 1.4, 0.7, d + 1.4, 0x2b2e36, 0, -0.65, 0);

      // 뒷벽: 벽돌 + 문 + 액자
      const brickMat = wallPhong({ map: brickTex });
      brickMat.userData.shared = true;
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
      const mkHalf = (thetaFrom, seed) => {
        const g = new THREE.Group();
        const rand = seededRand(seed);
        for (let i = 0; i < SEG; i++) {
          const th = thetaFrom + (i + 0.5) * (Math.PI / 2) / SEG;
          // 갈라진 외피: 일부 조각은 짧거나 없음
          if (rand() < 0.1 && th > 0.5 && th < Math.PI - 0.5) continue;
          let dep = d + 1.0;
          if (rand() < 0.34) dep *= 0.5 + rand() * 0.32;
          const arcLen = R * (Math.PI / 2) / SEG + 0.1;
          const col = rand() < 0.16 ? 0x5d594f : shellCols[Math.floor(rand() * shellCols.length)];
          const m = new THREE.Mesh(new THREE.BoxGeometry(arcLen, T, dep), lamb(col));
          m.position.set(R * Math.cos(th), R * Math.sin(th), zBack + dep / 2);
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
      const right = mkHalf(0, 21);           // x>0 쪽
      const left = mkHalf(Math.PI / 2, 43);  // x<0 쪽
      roomGroup.add(right); roomGroup.add(left);
      wallDefs.push({ group: right, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(1, 0, 0) });
      wallDefs.push({ group: left, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(-1, 0, 0) });
      makeWalls(wallDefs);

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
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2, r = 6 + rand() * 9;
        const x = r * Math.cos(a), z = r * Math.sin(a);
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
    name: '도시 옥탑방', nameEn: 'City Rooftop', emoji: '🏙️', unlockAt: 4, viewH: 18, ceilY: 2.6,
    desc: '무너진 도시의 빌딩 옥상. 하늘이 열려 있고 폐허가 된 도시가 내려다보인다.',
    descEn: 'A rooftop atop a fallen city building. The sky is wide open, and the ruined city spreads out below.',
    room: { w: 9, d: 7, h: 0.85 },
    baseComfort: 4,
    weatherDirt: 3, moveCost: { material: 2, parts: 1 }, limits: '🌧️ 지붕 없는 노천 — 비/눈 오는 날마다 청결 -3', limitsEn: '🌧️ Roofless & exposed — cleanliness -3 on each rainy/snowy day',
    mood: { fog: 0x1c202c, fogNear: 22, fogFar: 62, skyH: 0x252c3d, skyZ: 0x0b0e18, hemiSky: 0x7d8bb0, hemiGround: 0x3a3733, hemiInt: 0.66, moonC: 0x9db4d8, moonInt: 0.8, stars: 0.75 },
    weatherPool: ['clear', 'rain', 'clear', 'snow'],
    perk: { salvagePlus: true, label: '📡 탁 트인 시야 — 부분 성공 시에도 가구 1개 회수', labelEn: '📡 Clear vantage — salvage 1 furniture even on partial success' },
    buildRoom() {
      const { w, d, h } = ROOM;
      const conc = wallPhong({ map: concreteTex });
      conc.userData.shared = true;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.35, d + 0.8), conc);
      floor.position.y = -0.175; floor.receiveShadow = true;
      roomGroup.add(floor);
      // 낮은 난간 — 배경이 잘 보임
      const mkP = (len, x, z, rotY) => {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.28), wallPhong({ color: 0x5b5b58 }));
        m.position.y = h / 2; m.castShadow = m.receiveShadow = true; g.add(m);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.36), wallPhong({ color: 0x6a6a66 }));
        cap.position.y = h + 0.03; g.add(cap);
        g.position.set(x, 0, z); g.rotation.y = rotY;
        roomGroup.add(g);
      };
      mkP(w + 0.56, 0, -d / 2 - 0.25, 0);
      mkP(w + 0.56, 0, d / 2 + 0.25, 0);
      mkP(d + 0.56, -w / 2 - 0.25, 0, Math.PI / 2);
      mkP(d + 0.56, w / 2 + 0.25, 0, Math.PI / 2);
      wallList = [];
      // 아래 빌딩 몸체 + 창문
      const body = B(roomGroup, w + 1.2, 17, d + 1.2, 0x252932, 0, -8.9, 0);
      body.receiveShadow = false;
      const rand = seededRand(88);
      const winGeos = [];
      for (let i = 0; i < 22; i++) {
        const side = Math.floor(rand() * 4);
        const wx = side < 2 ? (rand() - 0.5) * (w - 1) : (side === 2 ? -w / 2 - 0.62 : w / 2 + 0.62);
        const wz = side >= 2 ? (rand() - 0.5) * (d - 1) : (side === 0 ? -d / 2 - 0.62 : d / 2 + 0.62);
        const wg = new THREE.BoxGeometry(side < 2 ? 0.7 : 0.1, 0.9, side < 2 ? 0.1 : 0.7);
        wg.translate(wx, -1.6 - rand() * 13, wz);
        winGeos.push(paintGeo(wg, rand() < 0.15 ? 0xd9b06a : 0x131720));
      }
      roomGroup.add(new THREE.Mesh(mergeGeometries(winGeos), vcLambert));
      // 고정 소품: 텐트 + 모래주머니 + 안테나
      const tent = new THREE.Group();
      const tc = 0x76684a;
      B(tent, 2.2, 0.06, 1.9, shade(tc, 1.05), 0, 0.02, 0);
      const p1 = B(tent, 2.0, 0.08, 1.35, tc, -0.34, 0.62, 0); p1.rotation.z = 0.86;
      const p2 = B(tent, 2.0, 0.08, 1.35, shade(tc, 0.9), 0.34, 0.62, 0); p2.rotation.z = -0.86;
      B(tent, 0.07, 1.25, 0.07, 0x4a4238, 0, 0.62, -0.62);
      B(tent, 0.07, 1.25, 0.07, 0x4a4238, 0, 0.62, 0.62);
      const back2 = new THREE.Mesh(new THREE.ConeGeometry(0.94, 1.28, 4), lamb(shade(tc, 0.8)));
      back2.rotation.y = Math.PI / 4; back2.scale.set(1.1, 1, 0.06);
      back2.position.set(0, 0.64, -0.65); back2.castShadow = true; tent.add(back2);
      tent.position.set(-w / 2 + 1.5, 0, -d / 2 + 1.35);
      tent.rotation.y = 0.35;
      roomGroup.add(tent);
      const sb = seededRand(9);
      for (let i = 0; i < 5; i++)
        B(roomGroup, 0.55, 0.22, 0.32, [0x6e6350, 0x655b48][i % 2], w / 2 - 0.9 - i * 0.28 * (i % 2), 0.11 + (i > 2 ? 0.22 : 0), d / 2 - 0.75 + sb() * 0.2);
      Cyl(roomGroup, 0.03, 0.05, 2.6, 0x55504a, w / 2 - 0.5, 1.3, -d / 2 + 0.5, 5);
      B(roomGroup, 0.7, 0.05, 0.05, 0x55504a, w / 2 - 0.5, 2.3, -d / 2 + 0.5);
      blockers = [
        { x: -w / 2 + 1.5, z: -d / 2 + 1.35, w: 2.5, d: 2.3 },
        { x: w / 2 - 1.1, z: d / 2 - 0.75, w: 1.7, d: 0.7 },
        { x: w / 2 - 0.5, z: -d / 2 + 0.5, w: 0.5, d: 0.5 },
      ];
    },
    buildEnv() {
      const rand = seededRand(777);
      const near = buildRuinCity(envRoot, rand, { count: 9, rMin: 13, rMax: 22, hMin: 6, hMax: 14, baseY: -18, litChance: 0.6 });
      buildRuinCity(envRoot, rand, { count: 16, rMin: 24, rMax: 46, hMin: 8, hMax: 20, baseY: -18, litChance: 0.45 });
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
      roomGroup.add(floor);
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
      buildCarWreck(envRoot, -9.5, 4.5, 1.2, rand);
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
      }
      // 불탄 숲 군락 (검게 그을린 고사목)
      for (let i = 0; i < 7; i++) {
        const x = -13 + rand() * 7, z = -12 + rand() * 6;
        const geo = deadTreeGeo(rand, 0.9 + rand() * 1.1, 0x211d18);
        geo.rotateY(rand() * Math.PI * 2);
        geo.translate(x, gh(x, z) - 0.05, z);
        envRoot.add(new THREE.Mesh(geo, vcLambert));
      }
      // 드럼통
      for (let i = 0; i < 3; i++) {
        const x = 5.5 + rand() * 3, z = 6.5 + rand() * 2.5;
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
      roomGroup.add(floor);
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
        BP(g, len, 1.0, 0.16, busY, 0, 0.5, 0);
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
      // 갈라진 고속도로 (버스가 서 있는 도로)
      const road = B(envRoot, 90, 0.12, 7, 0x33342f, 0, GY + 0.05, 0);
      road.receiveShadow = true;
      for (let i = 0; i < 22; i++) B(envRoot, 1.4, 0.13, 0.16, 0x8a8a72, -44 + i * 4.2, GY + 0.07, 0);
      // 도로 위 폐차 행렬 + 표지판
      buildCarWreck(envRoot, -9, 1.8, 0.15, rand);
      buildCarWreck(envRoot, -15.5, -1.6, -2.9, rand);
      buildCarWreck(envRoot, 12, -1.9, 3.05, rand);
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
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), conc);
      floor.position.y = -0.15; floor.receiveShadow = true;
      roomGroup.add(floor);
      const tileMat = wallPhong({ map: subwayTileTex });
      tileMat.userData.shared = true;
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
      // 승강장 기둥 2개 (고정 소품)
      for (const px of [-w / 4, w / 4]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), tileMat);
        col.position.set(px, h / 2, 0.4);
        col.castShadow = col.receiveShadow = true;
        roomGroup.add(col);
        B(roomGroup, 0.7, 0.12, 0.7, 0x4e4e4c, px, 0.06, 0.4);
      }
      // 천장 슬래브 + 매달린 표지판 (위는 막혀있지만 카메라는 이소메트릭이라 룸 위 y3.2에 얇게)
      const ceil = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.2, d + 0.6), lamb(0x1c1e22));
      ceil.position.y = h + 0.85;
      roomGroup.add(ceil);
      const hang = new THREE.Group();
      Cyl(hang, 0.02, 0.02, 0.5, 0x3a3733, -0.5, h + 0.55, 0, 5);
      Cyl(hang, 0.02, 0.02, 0.5, 0x3a3733, 0.5, h + 0.55, 0, 5);
      B(hang, 1.6, 0.4, 0.06, 0x1d3a2a, 0, h + 0.15, 0);
      B(hang, 0.5, 0.2, 0.07, 0xd8d3c8, -0.4, h + 0.15, 0);
      hang.position.set(1.5, 0, 1.2);
      roomGroup.add(hang);
      // 승강장 가장자리 경고선 + 선로
      B(roomGroup, w + 0.6, 0.06, 0.3, 0xa89a4a, 0, 0.03, d / 2 + 0.15);
      blockers = [
        { x: -w / 4, z: 0.4, w: 0.7, d: 0.7 },
        { x: w / 4, z: 0.4, w: 0.7, d: 0.7 },
      ];
    },
    buildEnv() {
      // 지하: 어둠 + 선로 + 터널 아치
      const rand = seededRand(606);
      const { w, d, h } = ROOM;
      // 선로 바닥 (승강장보다 낮음)
      B(envRoot, w + 14, 0.2, 3.4, 0x17181a, 0, -1.0, d / 2 + 2.1);
      for (const rz of [d / 2 + 1.4, d / 2 + 2.8]) {
        B(envRoot, w + 14, 0.1, 0.14, 0x4a4640, 0, -0.72, rz);
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
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ color: 0x6b5a44 }));
      floor.position.y = -0.125; floor.receiveShadow = true;
      roomGroup.add(floor);
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
      // 버려진 밭이랑 (줄지어 솟은 두둑)
      for (let row = 0; row < 5; row++) {
        const rz = 6 + row * 1.6;
        const ridge = B(envRoot, 14, 0.3, 0.7, 0x4a3f30, -3, gh(-3, rz) + 0.1, rz);
        ridge.receiveShadow = true;
        for (let i = 0; i < 8; i++) {
          if (rand() < 0.4) continue;
          const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1 + rand() * 0.1, 0), lamb(rand() < 0.5 ? 0x5a6a42 : 0x6a5f3a));
          sp.position.set(-9.5 + i * 1.8, gh(-3, rz) + 0.35, rz + (rand() - 0.5) * 0.3);
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
    buildRoom() {
      const { w, d, h } = ROOM;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.3, d + 0.6), wallPhong({ color: 0x7a6248 }));
      floor.position.y = -0.15; floor.receiveShadow = true;
      roomGroup.add(floor);
      for (let i = 0; i < 8; i++) B(roomGroup, w + 0.6, 0.02, 0.06, 0x5d452c, 0, 0.02, -d / 2 + 0.4 + i * 0.85);
      // 선체 (아래로 이어지는 흘수선)
      B(roomGroup, w + 1.6, 5.5, d + 1.6, 0x5c3a30, 0, -3.0, 0);
      B(roomGroup, w + 1.8, 0.7, d + 1.8, 0x2a2622, 0, -5.6, 0);
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
      // 선실 벽 (뒤쪽, 흰 강판 + 둥근 창)
      const cabinW = new THREE.Group();
      const cw = new THREE.Mesh(new THREE.BoxGeometry(w, 2.5, 0.3), wallPhong({ color: 0xd0ccc0 }));
      cw.position.y = 1.25; cw.castShadow = cw.receiveShadow = true;
      cabinW.add(cw);
      for (let i = 0; i < 4; i++) {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), lamb(0x8a8f96));
        port.rotation.x = Math.PI / 2;
        port.position.set(-3.2 + i * 2.1, 1.5, 0.18);
        cabinW.add(port);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), lamb(0x2c3a4a));
        glass.rotation.x = Math.PI / 2;
        glass.position.set(-3.2 + i * 2.1, 1.5, 0.19);
        cabinW.add(glass);
      }
      const door2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.1), lamb(0x6a4f33));
      door2.position.set(3.6, 0.95, 0.18);
      cabinW.add(door2);
      // 녹 줄무늬
      const rr = seededRand(21);
      for (let i = 0; i < 5; i++) {
        const rust = new THREE.Mesh(new THREE.BoxGeometry(0.2 + rr() * 0.3, 0.6 + rr() * 0.8, 0.05), lamb(0x8a5138));
        rust.position.set(-w / 2 + 1 + rr() * (w - 2), 0.6 + rr() * 1.2, 0.17);
        cabinW.add(rust);
      }
      cabinW.position.set(0, 0, -d / 2 - 0.28);
      makeWalls([{ group: cabinW, pos: [0, 0, -d / 2 - 0.28], rotY: 0, normal: new THREE.Vector3(0, 0, -1) }]);
      // 굴뚝 (선실 뒤로)
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 3.4, 10), lamb(0xa84a3f));
      stack.position.set(1.6, 3.6, -d / 2 - 1.4);
      stack.rotation.z = 0.06;
      stack.castShadow = true;
      roomGroup.add(stack);
      B(roomGroup, 1.7, 0.4, 1.7, 0x2a2622, 1.6, 5.3, -d / 2 - 1.5);
      // 낚싯대 + 구명튜브 (고정 소품)
      const rod = new THREE.Group();
      Cyl(rod, 0.02, 0.03, 2.2, 0x6a4f33, 0, 1.0, 0, 5).rotation.z = -0.7;
      B(rod, 0.15, 0.4, 0.15, 0x55504a, -0.35, 0.2, 0);
      rod.position.set(w / 2 - 0.7, 0, d / 2 - 0.6);
      roomGroup.add(rod);
      const buoyRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.09, 6, 12), lamb(0xc45540));
      buoyRing.position.set(-w / 2 + 0.2, 1.4, -d / 2 - 0.1);
      roomGroup.add(buoyRing);
      blockers = [{ x: w / 2 - 0.7, z: d / 2 - 0.6, w: 0.8, d: 0.8 }];
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
      // 해안선 절벽 (한쪽)
      for (let i = 0; i < 6; i++) {
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5 + rand() * 3, 0), lamb(0x232830));
        rock.position.set(-30 + rand() * 10, -5.5 + rand() * 1.5, 14 + rand() * 12);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        envRoot.add(rock);
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
      const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.3, d + 0.7), conc);
      floor.position.y = -0.15; floor.receiveShadow = true;
      roomGroup.add(floor);
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
        const wallM = new THREE.Mesh(new THREE.BoxGeometry(len, h, 0.26), wallPhong({ color: 0xd8d0c4 }));
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
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.25, 14), lamb(0x4a4f55));
      deck.position.y = h + 0.4;
      roomGroup.add(deck);
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
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(3.5 + rand() * 3.5, 0), lamb([0x2a2f38, 0x232830, 0x31363e][i % 3]));
        rock.position.set((rand() - 0.5) * 9, -14 - rand() * 4, (rand() - 0.5) * 9);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        rock.scale.y = 1.6 + rand();
        cliff.add(rock);
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
      buildRuinCity(envRoot, rand, { count: 8, rMin: 26, rMax: 44, hMin: 3, hMax: 8, baseY: -18.5, litChance: 0.15 });
      envDyn.beam = envDyn._beam;
      delete envDyn._beam;
    },
  },
};

/* ============================================================
   구역 시스템 — 한 지역 안에 여러 셸터, 지역 간 이동은 비용이 든다
============================================================ */
const DISTRICTS = {
  outskirts: {
    name: '잿빛 외곽', nameEn: 'Ashen Outskirts', emoji: '🏜️', shelters: ['container', 'bus'],
    desc: '도시 밖 황무지. 고속도로가 지나가 이동이 편하다.',
    descEn: 'Wasteland beyond the city. A highway runs through, making travel easy.',
    regionBonus: { residential: 0.03 },
    bonusLabel: '주거지역 접근성 +3%p', bonusLabelEn: 'Residential access +3%p',
  },
  city: {
    name: '무너진 도심', nameEn: 'Fallen Downtown', emoji: '🏙️', shelters: ['rooftop', 'subway'],
    desc: '폐허가 된 시가지. 위험하지만 물자가 몰려 있다.',
    descEn: 'A ruined city center. Dangerous, but supplies are dense here.',
    regionBonus: { commercial: 0.05, slum: 0.05 },
    bonusLabel: '상업지구·슬럼가 접근성 +5%p', bonusLabelEn: 'Commercial & slum access +5%p',
  },
  meadow: {
    name: '초원 구릉지', nameEn: 'Meadow Hills', emoji: '🌾', shelters: ['bunker', 'greenhouse'],
    desc: '들풀이 무성한 벌판. 조용하고 흙이 살아있다.',
    descEn: 'A field thick with wild grass. Quiet, and the soil is alive.',
    regionBonus: { residential: 0.05 },
    bonusLabel: '주거지역 접근성 +5%p', bonusLabelEn: 'Residential access +5%p',
  },
  forest: {
    name: '숲과 산기슭', nameEn: 'Forest & Foothills', emoji: '🌲', shelters: ['cabin'],
    desc: '침엽수림 가장자리. 폐허에서 가장 먼 안식처.',
    descEn: 'The edge of a conifer forest. The refuge farthest from the ruins.',
    regionBonus: { industrial: 0.05 },
    bonusLabel: '공업지대 접근성 +5%p', bonusLabelEn: 'Industrial access +5%p',
  },
  coast: {
    name: '잿빛 해안', nameEn: 'Ashen Coast', emoji: '🌊', shelters: ['ship', 'lighthouse'],
    desc: '안개 낀 바닷가. 바다가 주는 것과 빼앗는 것이 있다.',
    descEn: 'A fog-wrapped shore. The sea gives, and the sea takes.',
    regionBonus: { slum: 0.05 },
    bonusLabel: '슬럼가 접근성 +5%p', bonusLabelEn: 'Slum access +5%p',
  },
};
function districtOf(shelterId) {
  for (const [id, d] of Object.entries(DISTRICTS)) if (d.shelters.includes(shelterId)) return id;
  return 'outskirts';
}

/* ============================================================
   게임 상태 & 저장
============================================================ */
// ---- 자원 (기획서 v0.2: 자원 보유량 및 소비) ----
const RESOURCES = {
  food:       { name: '음식',     nameEn: 'Food',        emoji: '🥫' },
  water:      { name: '깨끗한 물', nameEn: 'Clean Water', emoji: '💧' },
  cloth:      { name: '천',       nameEn: 'Cloth',       emoji: '🧵' },
  bandage:    { name: '붕대',     nameEn: 'Bandage',     emoji: '🩹' },
  antiseptic: { name: '소독약',   nameEn: 'Antiseptic',  emoji: '🧴' },
  painkiller: { name: '진통제',   nameEn: 'Painkiller',  emoji: '💊' },
  candle:     { name: '양초',     nameEn: 'Candle',      emoji: '🕯️' },
  battery:    { name: '배터리',   nameEn: 'Battery',     emoji: '🔋' },
  fuel:       { name: '연료',     nameEn: 'Fuel',        emoji: '⛽' },
  parts:      { name: '부품',     nameEn: 'Parts',       emoji: '⚙️' },
  material:   { name: '건축재',   nameEn: 'Material',    emoji: '🧱' },
};
// ---- 부상 (기획서 v0.2: 부상 치료 시스템) ----
const INJURIES = {
  minor:     { name: '가벼운 부상', nameEn: 'Minor Injury',    icon: '🩹', pen: 0.05, restH: 12, cure: { bandage: 1 }, infect: 0.10 },
  deep:      { name: '깊은 상처',   nameEn: 'Deep Wound',      icon: '🩸', pen: 0.15, restH: 24, cure: { bandage: 1, antiseptic: 1 }, infect: 0.25 },
  sprain:    { name: '염좌',        nameEn: 'Sprain',          icon: '🦵', pen: 0.10, restH: 18, timeMult: 1.3, cure: { painkiller: 1 } },
  infection: { name: '감염 위험',   nameEn: 'Infection Risk',  icon: '🤒', pen: 0.20, restH: 36, cure: { antiseptic: 1, water: 1 } },
};
// ---- 탐험 준비물 (기획서 v0.2: 준비물 슬롯) ----
const PREPS = {
  bottle:    { name: '물병',     nameEn: 'Water Bottle', emoji: '🥤', cost: { water: 1 },  eff: '탐험 갈증 소모 절반 · 부상 회복 -20%', effEn: 'Halves thirst use on expeditions · injury recovery -20%' },
  canned:    { name: '통조림',   nameEn: 'Canned Food', emoji: '🥫', cost: { food: 1 },   eff: '공업/슬럼 성공률 +5%p', effEn: 'Industrial/slum success +5%p', bonus: { industrial: 0.05, slum: 0.05 } },
  flashlight:{ name: '손전등',   nameEn: 'Flashlight', emoji: '🔦', cost: { battery: 1 },eff: '상업/슬럼 성공률 +10%p', effEn: 'Commercial/slum success +10%p', bonus: { commercial: 0.10, slum: 0.10 } },
  gloves:    { name: '장갑',     nameEn: 'Gloves', emoji: '🧤', cost: { cloth: 1 },  eff: '부상 확률 -30%', effEn: 'Injury chance -30%' },
  raincoat:  { name: '우의',     nameEn: 'Raincoat', emoji: '🧥', cost: { cloth: 1 },  eff: '날씨 페널티 -70%', effEn: 'Weather penalty -70%' },
  firstaid:  { name: '응급키트', nameEn: 'First-Aid Kit', emoji: '⛑️', cost: { bandage: 1, antiseptic: 1 }, eff: '깊은 상처 → 가벼운 부상으로 완화', effEn: 'Softens deep wounds into minor injuries' },
};

const state = {
  ver: 3,
  current: 'container',
  successes: 0,
  inventory: { bed: 1, rug: 1, candle: 1 },
  // 초기 자원 (기획서 밸런싱 권장값)
  res: { food: 3, water: 3, cloth: 2, bandage: 1, antiseptic: 0, painkiller: 0, candle: 2, battery: 1, fuel: 0, parts: 0, material: 0 },
  layouts: { container: [{ d: 'crate', c: 1, x: 2.5, z: -0.75, r: 0 }], bunker: [], rooftop: [], cabin: [] },
  exp: null,             // { region, end(실시간ms), rate, prep:[] }
  injury: null,          // { type, untilMin, }
  gameMin: 8 * 60,       // Day 1, 08:00 시작
  day: 1,
  savedAt: Date.now(),
  weatherType: 'clear',
  weatherUntil: 0,       // gameMin 기준
  cleanBy: { container: 70, bunker: 70, rooftop: 70, cabin: 70 },
  renovated: { container: true },   // 정비를 마친 셸터 (최초 입주 시 자원 소요)
  hunger: 80,   // 배고픔 (0=탈진)
  thirst: 80,   // 갈증 (0=탈진)
  energy: 100,  // 에너지 — 탐험/노동으로 소모, 취침으로 회복
  expToday: 0,  // 오늘 탐험 횟수 (하루 5회 제한)
  upkeepOk: true,
  dayLog: { gain: {}, spend: {}, notes: [] },
  helpSeen: false,
  stats: { exp: 0, success: 0 },
  buff: null,          // 인카운터 버프 { exp?:+0.1, loot?:2, label }
  pendingEvent: null,  // 표시 대기 중인 인카운터 id
  lastEventDay: 0,
  mods: {},            // 거처 개조 { shelterId: [modId] }
  stayDays: 0,         // 현재 거처 연속 거주일 (정든 집 보너스)
  cat: 0,              // 고양이 입양 여부 (Day 100+ 인카운터)
  catMusicDay: 0,      // 고양이 인카운터가 뜬 날 — 그날은 Cat OST만 재생
  endingSeen: false,   // Day 10000 엔딩 감상 여부
  tutDay: 0,           // 신규 게임 첫 3일 튜토리얼 진행 단계 (0~3)
  tipsSeen: {},        // 찢어진 쪽지(1회성 팁) 열람 여부 { 'tip.rain': true, ... }
  pendingTutorial: null, // 표시 대기 중인 튜토리얼 수첩 페이지 단계 (day-report 뒤로 미룸)
};
// 새 게임용 초기 상태 스냅샷 (state에 함수 없음 전제)
const DEFAULT_STATE = JSON.parse(JSON.stringify(state));

function resAdd(id, n) {
  if (n <= 0) return;
  state.res[id] = (state.res[id] || 0) + n;
  state.dayLog.gain[id] = (state.dayLog.gain[id] || 0) + n;
}
function resConsume(id, n) {
  if ((state.res[id] || 0) < n) return false;
  state.res[id] -= n;
  state.dayLog.spend[id] = (state.dayLog.spend[id] || 0) + n;
  return true;
}
function resHasAll(cost) {
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
const opts = { pixel: 3, quant: true, dither: true, ceil: true, autoEat: true, bgm: true, bgmVol: 0.15, sfxVol: 0.07, lang: 'ko', fpsCap: 60, lowSpec: false, bgIdle: true };

/* ============================================================
   생존 게이지 (기획서: 배고픔/갈증 — cozy 방향, 사망 대신 탈진)
============================================================ */
function decayGauges(gm) {
  const winterMult = seasonOf().id === 'winter' ? 1.25 : 1; // 겨울엔 열량 소모가 크다
  state.hunger = Math.max(0, state.hunger - gm * 0.017 * winterMult); // 만복 → 0까지 약 4게임일
  state.thirst = Math.max(0, state.thirst - gm * 0.027);              // 약 2.5게임일
  if (opts.autoEat) {
    let g = 0;
    while (state.hunger < 40 && (state.res.food || 0) > 0 && g++ < 9) { resConsume('food', 1); state.hunger = Math.min(100, state.hunger + 45); }
    g = 0;
    while (state.thirst < 40 && (state.res.water || 0) > 0 && g++ < 9) { resConsume('water', 1); state.thirst = Math.min(100, state.thirst + 45); }
  }
}
function eatFood() {
  if ((state.res.food || 0) < 1) { toast(t('eat.noFood')); return; }
  if (state.hunger > 85) { toast(t('eat.full')); return; }
  resConsume('food', 1);
  state.hunger = Math.min(100, state.hunger + 45);
  toast(t('eat.done'));
  renderResBar(); updateHud(); scheduleSave();
}
function drinkWater() {
  if ((state.res.water || 0) < 1) { toast(t('drink.noWater')); return; }
  if (state.thirst > 85) { toast(t('drink.full')); return; }
  resConsume('water', 1);
  state.thirst = Math.min(100, state.thirst + 45);
  toast(t('drink.done'));
  renderResBar(); updateHud(); scheduleSave();
}
function isExhausted() { return state.hunger <= 0 || state.thirst <= 0; }

/* ── 취침 (의무 휴식 — 자원 인플레이션 방지 + 침대의 가치) ── */
const EXP_PER_DAY = 5;
function sleepUntilMorning(auto = false) {
  if (state.exp) { toast(t('sleep.cantDuringExp')); return; }
  const hasBed = items.some(i => i.defId === 'bed');
  const cozy = comfortDetail().score;
  // 내일 아침 07:00으로 — 하루 정산(processDay)은 tickTime이 처리
  state.gameMin = (Math.floor(state.gameMin / 1440) + 1) * 1440 + 7 * 60;
  state.energy = Math.min(100, (hasBed ? 90 : 65) + (cozy >= 75 ? 10 : 0));
  const e = Math.round(state.energy);
  state.dayLog.notes.push(t(hasBed ? 'sleep.noteBed' : 'sleep.noteFloor', { e }));
  toast(auto
    ? t(hasBed ? 'sleep.autoBed' : 'sleep.autoFloor', { e })
    : t(hasBed ? 'sleep.wakeBed' : 'sleep.wakeFloor', { e }));
  scheduleSave();
  updateHud();
  updateClock();
  playSfx('dawn');
}

/* ── 세이브 슬롯 (Steam 대비: 슬롯 3개 + 최근 슬롯 기억) ── */
const SLOT_COUNT = 3;
const slotKey = n => `project-shelter-slot${n}`;
let currentSlot = parseInt(localStorage.getItem('project-shelter-lastslot') || '1', 10) || 1;
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
    successes: st.successes || 0,
    saved: st.savedAt ? new Date(st.savedAt).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
  };
}
let saveTimer = null;
function doSaveNow() {
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2) }));
  state.savedAt = Date.now();
  try {
    localStorage.setItem(slotKey(currentSlot), JSON.stringify({ state, opts }));
    localStorage.setItem('project-shelter-lastslot', String(currentSlot));
  } catch (e) { /* file:// 등 저장 불가 환경 */ }
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
      if (state.hunger == null) state.hunger = 80;
      if (state.thirst == null) state.thirst = 80;
      if (state.energy == null) state.energy = 100;
      if (state.expToday == null) state.expToday = 0;
      if (state.tutDay == null) state.tutDay = 0;
      if (!state.tipsSeen) state.tipsSeen = {};
      if (state.pendingTutorial === undefined) state.pendingTutorial = null;
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
function setItemPower(item, on) {
  item.on = on;
  if (item.lightObj) item.lightObj.visible = on;
  for (const m of (item.glowMeshes || [])) {
    m.material.emissiveIntensity = on ? m.userData.origEmissiveI : 0.03;
  }
  shadowDirty();
}
function removeItem(item) {
  itemsRoot.remove(item.group);
  disposeDeep(item.group);
  const i = items.indexOf(item);
  if (i >= 0) items.splice(i, 1);
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
  wallList = []; blockers = []; envDyn = {};
  weatherFx.caps = []; wetApplied = -1;
  // 초봄(Day 1~2) 시작: 겨울의 끝자락 잔설이 남아있다가 서서히 녹는다 (최초 입장 1회만 시딩)
  if (!snowSeeded && state.day <= 2 && seasonOf().id === 'spring') { snowCover = 0.25; snowSeeded = true; }

  state.current = id;
  const sh = SHELTERS[id];
  ROOM = { ...sh.room };
  if ((state.mods?.[id] || []).includes('extension')) ROOM.w += 2; // 증축
  sh.buildRoom();
  sh.buildEnv();
  buildModProps(); // 설치된 개조 소품
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
  for (const it of (state.layouts[id] || [])) {
    if (!DEFS[it.d]) continue;
    addItem(it.d, it.c ?? 0, it.x, it.z, it.r ?? 0, it.o !== 0, it.y || 0);
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
  fitZoomForShelter();
  lastWallMask = -1;
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
  if (cross) { cost.food = (cost.food || 0) + 1; cost.water = (cost.water || 0) + 1; }
  return { cost, cross, renov: !state.renovated[id] };
}
function moveToShelter(id) {
  if (id === state.current) { closeModal(); return; }
  const { cost, cross, renov } = moveCostFor(id);
  if (!resHasAll(cost)) {
    toast(t('move.needSupplies', { cost: costLabel(cost) }));
    return;
  }
  resConsumeAll(cost);
  if (renov) {
    state.renovated[id] = true;
    state.dayLog.notes.push(t('move.renovNote', { name: LName(SHELTERS[id]), cost: costLabel(SHELTERS[id].moveCost || {}) || t('free') }));
  }
  if (cross) {
    state.gameMin += 180; // 구역 간 여정 3시간
    state.dayLog.notes.push(t('move.journeyNote', { name: LName(DISTRICTS[districtOf(id)]) }));
  }
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2) }));
  state.stayDays = 0; // 새 집은 아직 낯설다
  loadShelter(id);
  scheduleSave();
  renderResBar();
  closeModal();
  toast(t('move.done', { emoji: SHELTERS[id].emoji, name: LName(SHELTERS[id]), journey: cross ? t('move.journeyTag') : '' }));
}

/* ============================================================
   탐험(파밍) 시스템 — 기획서의 지역별 성공률 기반
============================================================ */
const REGIONS = {
  residential: {
    name: '주거지역', nameEn: 'Residential', emoji: '🏘️', rate: 0.8, time: 20,
    pool: ['bed', 'chair', 'rug', 'dresser', 'candle', 'cushion', 'bookstack'], furnChance: 0.02,
    desc: '음식·물·천·양초 · 생활 가구', descEn: 'Food, water, cloth, candles · household furniture', risk: '낮음', riskEn: 'Low',
    lootRes: [['food', 1, 2], ['cloth', 0, 1], ['candle', 0, 1], ['water', 1, 2], ['bandage', 1, 1, 0.25]],
    injuries: ['minor'],
  },
  commercial: {
    name: '상업지구', nameEn: 'Commercial', emoji: '🏬', rate: 0.6, time: 35,
    pool: ['sofa', 'table', 'bookshelf', 'radio', 'plant', 'fridge', 'teatable', 'clock', 'lantern'], furnChance: 0.02,
    desc: '배터리·의약품 · 상점 가구', descEn: 'Batteries, medicine · store furniture', risk: '보통', riskEn: 'Medium',
    lootRes: [['battery', 0, 2], ['parts', 0, 1], ['food', 0, 1], ['water', 0, 1], ['antiseptic', 1, 1, 0.25], ['painkiller', 1, 1, 0.2]],
    injuries: ['minor', 'minor', 'sprain'],
  },
  industrial: {
    name: '공업지대', nameEn: 'Industrial', emoji: '🏭', rate: 0.4, time: 50,
    pool: ['lamp', 'crate', 'radio', 'dresser', 'purifier', 'generator', 'stove'], furnChance: 0.01,
    desc: '부품·건축재·연료', descEn: 'Parts, building material, fuel', risk: '높음 — 장갑 권장', riskEn: 'High — gloves advised',
    lootRes: [['parts', 1, 3], ['material', 1, 3], ['fuel', 0, 2]],
    injuries: ['deep', 'deep', 'sprain'],
  },
  slum: {
    name: '슬럼가', nameEn: 'Slums', emoji: '🏚️', rate: 0.25, time: 70,
    pool: Object.keys(DEFS), furnChance: 0.03,
    desc: '뭐든 나올 수 있다 · 희귀 가구', descEn: 'Anything might turn up · rare furniture', risk: '매우 높음 — 응급키트 권장', riskEn: 'Very high — first-aid kit advised',
    lootRes: [['parts', 1, 2], ['cloth', 1, 2], ['painkiller', 1, 1, 0.15], ['antiseptic', 1, 1, 0.15]],
    injuries: ['deep', 'sprain', 'infection'],
  },
};
for (const [k, v] of Object.entries(REGIONS)) v.id = k;

/* ============================================================
   도트 지도 (기획서: 도트 지도 기반 탐험 선택)
============================================================ */
const MAP = {
  W: 40, H: 28, TILE: 8,
  districts: { coast: { x: 6, y: 13 }, city: { x: 16, y: 8 }, outskirts: { x: 15, y: 21 }, forest: { x: 31, y: 6 }, meadow: { x: 31, y: 19 } },
  regions: { residential: { x: 24, y: 16 }, commercial: { x: 12, y: 10 }, industrial: { x: 8, y: 23 }, slum: { x: 21, y: 12 } },
};
// 거리 → 탐험 소요 시간 계수 (가까우면 빨리, 멀면 오래)
function regionDistMult(regionId) {
  const a = MAP.districts[districtOf(state.current)];
  const b = MAP.regions[regionId];
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
    <div id="map-wrap"></div>
    <div id="map-info" class="rate-line" style="margin-top:8px">${t('map.pick')}</div>`);
  const wrap = $('map-wrap');
  wrap.appendChild(buildMapCanvas());
  const pct = p => ({ left: (p.x / MAP.W * 100) + '%', top: (p.y / MAP.H * 100) + '%' });
  // 구역 라벨
  for (const [did, d] of Object.entries(DISTRICTS)) {
    const p = MAP.districts[did];
    const el = document.createElement('div');
    el.className = 'map-marker dist';
    el.innerHTML = `<span class="de">${d.emoji}</span>${LName(d)}`;
    Object.assign(el.style, pct({ x: p.x, y: p.y + 2.2 }));
    wrap.appendChild(el);
  }
  // 현재 위치
  const loc = document.createElement('div');
  loc.className = 'map-marker loc';
  loc.textContent = '📍';
  Object.assign(loc.style, pct(MAP.districts[districtOf(state.current)]));
  wrap.appendChild(loc);
  // 파밍 지역 마커
  let selEl = null;
  for (const [rid, r] of Object.entries(REGIONS)) {
    const el = document.createElement('div');
    el.className = 'map-marker region';
    el.textContent = r.emoji;
    el.title = LName(r);
    Object.assign(el.style, pct(MAP.regions[rid]));
    el.addEventListener('click', () => {
      if (selEl) selEl.classList.remove('sel');
      selEl = el; el.classList.add('sel');
      const p = rateParts(rid);
      const dur = expDuration(r);
      const fc = hasForecast() ? t('forecast.prefix', { text: forecastText() }) : '';
      $('map-info').innerHTML = `
        ${t('map.regionLine', { emoji: r.emoji, pct: Math.round(p.eff * 100), name: LName(r), desc: LDesc(r) })}<br>
        ${t('map.riskLine', { risk: LRisk(r), dur, mult: regionDistMult(rid).toFixed(2), wicon: WEATHERS[weather.type].icon, wname: LName(WEATHERS[weather.type]), forecast: fc })}
        <div style="margin-top:6px"><button class="pixel-btn primary" id="btn-map-go" style="width:100%">${t('map.go')}</button></div>`;
      $('btn-map-go').addEventListener('click', () => { closeModal(); startExpedition(rid); }); // 에너지/탈진/횟수 검사를 거친다
    });
    wrap.appendChild(el);
  }
}

// 탐험 소요 시간(초): 거리 + 염좌 +30% + 이동형 거점(버스) -25%
function expDuration(r) {
  let t = r.time * regionDistMult(r.id);
  if (state.injury?.type === 'sprain') t *= 1.3;
  t *= SHELTERS[state.current].perk?.timeMult || 1;
  return Math.round(t);
}
// 날씨 예보 (라디오 배치 또는 등대 특성)
function hasForecast() {
  return (state.upkeepOk && !!SHELTERS[state.current].perk?.forecast) || items.some(i => i.defId === 'radio');
}
function forecastText() {
  const nextDayStart = (Math.floor(state.gameMin / 1440) + 1) * 1440;
  return state.weatherUntil > nextDayStart
    ? t('forecast.tomorrowSame', { icon: WEATHERS[state.weatherType].icon, name: LName(WEATHERS[state.weatherType]) })
    : t('forecast.tomorrowChange');
}
// 탐험은 준비 단계를 거친다 (기획서 v0.2: 지역 → 날씨/위험 확인 → 준비물 → 출발)
function startExpedition(regionId) {
  if (state.exp) return;
  if (isExhausted()) { toast(t('toast.exhausted')); return; }
  if (state.energy < 20) { toast(t('toast.tooTired')); return; }
  if (state.expToday >= EXP_PER_DAY) { toast(t('toast.expLimit', { n: EXP_PER_DAY })); return; }
  openPrepModal(regionId);
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
    const dur = expDuration(r);
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
function departExpedition(regionId, prep) {
  if (state.exp) return;
  // 준비 모달을 열어둔 사이 상태가 나빠졌을 수도 있다 — 출발 직전 재검사
  if (isExhausted()) { toast(t('toast.exhausted')); closeModal(); return; }
  if (state.energy < 20) { toast(t('toast.tooTired')); closeModal(); return; }
  if (state.expToday >= EXP_PER_DAY) { toast(t('toast.expLimit', { n: EXP_PER_DAY })); closeModal(); return; }
  const r = REGIONS[regionId];
  for (const id of prep) resConsumeAll(PREPS[id].cost);
  const p = rateParts(regionId, prep);
  const dur = expDuration(r) * 1000;
  // 탐험도 몸을 쓴다 (소모 절반으로 완화) + 에너지 소모
  state.hunger = Math.max(0, state.hunger - 4);
  state.thirst = Math.max(0, state.thirst - (prep.includes('bottle') ? 3 : 5));
  state.energy = Math.max(0, state.energy - 20);
  if (state.energy < 20) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  // 성공률 버프/디버프는 이번 출발에 반영되어 소진 (물자 좌표 버프는 정산 시)
  if (state.buff?.exp) state.buff = null;
  state.exp = { region: regionId, end: Date.now() + dur, dur, rate: p.eff, prep };
  closeModal();
  scheduleSave();
  renderExpPanel();
  renderResBar();
  $('exp-panel').classList.add('show'); // 진행 상황 표시
  toast(t('exp.start', { emoji: r.emoji, name: LName(r), pct: Math.round(p.eff * 100) }));
  playSfx('door');
  setTimeout(() => playSfx(seasonOf().id === 'winter' ? 'steps_snow' : 'steps_hard'), 400);
}
function resolveExpedition() {
  const exp = state.exp;
  if (!exp) return;
  playSfx('door');
  const r = REGIONS[exp.region];
  const prep = exp.prep || [];
  state.exp = null;
  state.stats.exp++;
  // 탐험을 다녀오면 하루가 그만큼 흘러 있다 (거리 비례 2~5시간)
  state.gameMin += 120 + expDuration(r) * 2.5;
  state.expToday = (state.expToday || 0) + 1;
  const rate = exp.rate ?? r.rate;
  const roll = Math.random();
  const gotRes = {};   // 자원 획득
  let got = [];        // 가구 획득
  const notes = [];
  let title, body;
  const rollRes = (mult = 1) => {
    for (const [id, min, max, chance] of r.lootRes) {
      if (chance != null && Math.random() > chance) continue;
      const n = Math.round((min + Math.random() * (max - min)) * mult);
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
  const success = roll < rate;
  const partial = !success && roll < rate + (1 - rate) * 0.5;
  if (success) {
    rollRes(1);
    if (state.buff?.loot) { // 은닉처 좌표: 자원 2배
      rollRes(1);
      notes.push(t('exp.note.loot2'));
      state.buff = null;
    }
    if (Math.random() < r.furnChance) {
      got.push(pickFurniture(r.pool));
      notes.push(t('exp.note.furniture'));
    }
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
      rollRes(0.3);
      if (Object.keys(gotRes).length) {
        body = t('exp.failSalvageBody');
        notes.push(t('exp.note.shipSalvage'));
      }
    }
    state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 5);
    notes.push(t('exp.note.dirty5'));
  }
  // 부상 판정: 실패 시 확정, 부분 성공 시 40%
  if (!success && (partial ? Math.random() < 0.4 : true)) {
    let injChance = 1;
    if (prep.includes('gloves')) injChance -= 0.3;
    if (Math.random() < injChance) {
      let type = r.injuries[Math.floor(Math.random() * r.injuries.length)];
      if (type === 'deep' && prep.includes('firstaid')) {
        type = 'minor';
        notes.push(t('exp.note.firstaid'));
      }
      notes.push(applyInjury(type, prep.includes('bottle')));
    } else if (prep.includes('gloves')) {
      notes.push(t('exp.note.gloves'));
    }
  }
  // 비/눈 속 탐험 → 젖어서 청결도 감소
  if (weather.type === 'rain' || weather.type === 'snow' || weather.type === 'storm') {
    if (!prep.includes('raincoat')) {
      state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 3);
      notes.push(t('exp.note.wet3', { icon: WEATHERS[weather.type].icon }));
    }
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
    ? `<div class="loot-list">${Object.entries(gotRes).map(([id, n]) => `<div class="loot-item">${RESOURCES[id].emoji} ${LName(RESOURCES[id])} +${n}</div>`).join('')}</div>`
    : '';
  const lootHtml = got.length
    ? `<div class="loot-list">${got.map(id => `<div class="loot-item">${DEFS[id].emoji} ${LName(DEFS[id])}</div>`).join('')}</div>`
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
  if (state.expToday >= EXP_PER_DAY) sleepUntilMorning(true);
}

/* ============================================================
   랜덤 인카운터 (아포칼립스의 우연들 — 며칠에 한 번)
============================================================ */
/* ============================================================
   고양이 동반자 (v1.9) — Day 100+ 인카운터로 입양
============================================================ */
let catObj = null, _catSpawning = false;
// 관절형 치즈 태비 (v1.9.1) — 몸통(호흡)·머리·귀·꼬리 2마디·다리 4개가 따로 움직인다
/* ============================================================
   리깅된 GLB 고양이 (public/models/riggedcat.glb)
   - Rigify DEF 본만 추출된 스킨드 메시, 애니 클립 없음 → 본 프로시저럴 구동
   - 로드 실패 시 아래 buildCatMesh() 복셀 고양이로 폴백
============================================================ */
const CAT_GLB_URL = 'models/riggedcat.glb';
const CAT_TARGET_H = 0.32;            // 선 자세 월드 높이 목표 (복셀 고양이 크기와 동일)
let _catGlbBuf = null;                // 최초 1회 fetch 캐시 (ArrayBuffer)
let _catGlbTried = false, _catGlbFailed = false;
const _gltfLoader = new GLTFLoader();

// 매핑에 쓰는 실측 본 이름 — GLTFLoader 가 노드명에서 '.' 을 제거하므로 로드 후 이름 기준
// (GLB 원본: DEF-spine.001, DEF-thigh.L 등 → 로드 후: DEF-spine001, DEF-thighL)
const CAT_BONES = {
  spine:   ['DEF-spine', 'DEF-spine001', 'DEF-spine002', 'DEF-spine003', 'DEF-spine004', 'DEF-spine005'],
  head:    'DEF-spine006',                            // 두개골 (얼굴/귀 본은 로드 시 이 밑으로 attach)
  tail:    ['DEF-tail004', 'DEF-tail003', 'DEF-tail002', 'DEF-tail001'],   // 루트→끝 순
  legFL:   'DEF-upper_armL', legFR: 'DEF-upper_armR', // 앞다리(어깨)
  foreFL:  'DEF-forearmL',   foreFR: 'DEF-forearmR',
  legBL:   'DEF-thighL',     legBR: 'DEF-thighR',     // 뒷다리(골반)
  shinBL:  'DEF-shinL',      shinBR: 'DEF-shinR',
  earL:    'DEF-earL',       earR:  'DEF-earR',
};
// 회전 부호 실측 결과 (scratchpad/bone-axes.mjs: rest×offset 적용 후 말단 본 월드 이동 측정):
//   thigh +X = 발끝 위·뒤로 접힘 / shin -X = 발끝 앞으로 (접힘 상쇄)
//   spine -X = 가슴·머리 세움 (+X = 숙임) / tail +X = 내림, ±Z = 좌우 스윙 (Y는 축 트위스트라 안 보임)
//   모델 정면 = 월드 -z (머리 z<0, 꼬리 z>0) → 래퍼 안에서 180° 회전시켜 +z 진행 코드와 일치시킴
//   얼굴/귀/턱 본은 rig 직속(두개골 체인 밖) → 척추 회전 시 얼굴이 남겨지므로 스컬 본에 attach 필수

async function loadCatGlbScene() {
  if (_catGlbFailed) return null;
  if (!_catGlbBuf) {
    if (_catGlbTried) return null;
    _catGlbTried = true;
    try {
      const res = await fetch(CAT_GLB_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _catGlbBuf = await res.arrayBuffer();
    } catch (e) { _catGlbFailed = true; console.warn('[cat] GLB fetch 실패, 복셀 폴백:', e.message); return null; }
  }
  // 매 스폰마다 새 스켈레톤을 얻기 위해 캐시된 버퍼를 재파싱 (인스턴스 1개뿐이라 비용 무시 가능)
  let gltf;
  try {
    gltf = await _gltfLoader.parseAsync(_catGlbBuf.slice(0), '');
  } catch (e) { _catGlbFailed = true; console.warn('[cat] GLB decode 실패, 복셀 폴백:', e.message); return null; }
  return gltf.scene;
}

// 로드된 씬을 래퍼에 넣고 크기/발바닥 정규화, 본 참조·rest 쿼터니언 수집
function normalizeCatGlb(root) {
  const wrap = new THREE.Group();
  wrap.add(root);
  root.rotation.y = Math.PI;   // 모델 정면(-z) → 래퍼 +z (걷기 heading 코드와 일치)
  // 머티리얼 정리 + 컬링/그림자, 부위 색 (원본 텍스처 없음 → 턱시도 단색)
  root.traverse(o => {
    if (o.isSkinnedMesh || o.isMesh) {
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if ('metalness' in m) m.metalness = 0;
        if ('roughness' in m) m.roughness = 1;
        if (m.emissive) m.emissive.setRGB(0, 0, 0);
        const nm = (m.name || '').toLowerCase();
        if (nm === 'eye') { m.color && m.color.setHex(0x2a2a20); }   // 눈/짙은 부위
        else { m.color && m.color.setHex(0xe8e4da); }                // 몸통 흰색(턱시도)
        m.flatShading = false;
      }
    }
  });
  wrap.updateMatrixWorld(true);
  // 실측 → 목표 높이로 스케일 (rig 노드 자체 scale 4.7153 을 Box3 실측이 자동 흡수)
  let box = new THREE.Box3().setFromObject(root);
  let h = box.max.y - box.min.y;
  if (!isFinite(h) || h <= 1e-4) h = CAT_TARGET_H;   // 실측 불가 시 무보정
  const s = CAT_TARGET_H / h;
  wrap.scale.setScalar(s);
  wrap.updateMatrixWorld(true);
  // 발바닥 y=0 정렬 (스케일 적용 후 재실측)
  box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y / (wrap.scale.y || 1);
  wrap.updateMatrixWorld(true);
  // 본 수집 (혹시 로더가 '.' 을 보존하는 버전이어도 매핑이 살도록 정규화 키를 함께 인덱스)
  const bones = {};
  root.traverse(o => {
    if (!o.isBone) return;
    bones[o.name] = o;
    const alt = o.name.replace(/\./g, '');
    if (!(alt in bones)) bones[alt] = o;
  });
  // 얼굴/귀/턱 본은 rig 직속(스컬 체인 밖)이라 척추를 돌리면 얼굴이 제자리에 남는다
  // → 두개골 본(spine006) 밑으로 attach (월드 변환 보존) 해서 머리를 따라오게 한다
  const skull = bones[CAT_BONES.head];
  if (skull) {
    const faceRe = /^DEF-(forehead|temple|brow|lid|nose|cheek|jaw|chin|lip|tongue|ear)/;
    const faceBones = [];
    root.traverse(o => { if (o.isBone && faceRe.test(o.name)) faceBones.push(o); });
    for (const fb of faceBones) skull.attach(fb);
    wrap.updateMatrixWorld(true);
  }
  const rest = {};   // 이름 → rest quaternion(clone). 매 프레임 rest×offset 으로 재계산 (누적 금지)
  for (const name in bones) rest[name] = bones[name].quaternion.clone();
  return { wrap, bones, rest };
}

// 마인크래프트 고양이 스타일 — 각진 박스만으로 구성 (B 헬퍼 전용, 곡면 없음)
// 단위: PX = 0.02 월드유닛/px (MC 원본 텍스처 px 그대로 치수 대입)
//   머리 5×4×5px, 몸통 4×4×12px(낮고 긴 수평 박스), 다리 2×6×2px×4, 꼬리 1×1×6px×2마디
//   배색 = 치즈 태비: 몸통 주황 / 등 줄무늬 진주황(파묻힘) / 주둥이·가슴·배·발·꼬리끝 흰색 / 눈 초록+검은 동공
function buildCatMesh() {
  const g = new THREE.Group();
  const PX = 0.02;
  const fur = 0xdf9038, stripe = 0xb96f24, white = 0xf2eee4, pink = 0xcf9088, eyeGreen = 0x5daa4d, pupil = 0x1a1712;
  const P = {};
  // ── 몸통 (피벗 = 엉덩이/골반 관절, 4×4×12px 낮고 긴 수평 박스) — 앉기/기지개 때 이 지점을 축으로 기운다
  //   기립 시 어깨~골반 높이 0.13 부근에 박스 중심을 두고, 몸이 앞(+z)으로 길게 뻗도록 배치
  const body = new THREE.Group();
  body.position.set(0, 0.13, -0.15);
  g.add(body); P.body = body;
  B(body, 4 * PX, 4 * PX, 12 * PX, fur, 0, 0, 6 * PX);              // 몸통 본체 (피벗에서 +z로 12px 길이, 중심 +6px)
  B(body, 4.06 * PX, 1.6 * PX, 10 * PX, white, 0, -1.6 * PX, 6 * PX); // 배쪽 흰색 밴드 (아랫면에 얇게 덧대어 파묻힘 없이 보이게)
  for (const [sz, w] of [[3 * PX, 4.2 * PX], [7 * PX, 4.2 * PX], [10.5 * PX, 4.06 * PX]])
    B(body, w, 3.2 * PX, 2.2 * PX, stripe, 0, 0.3 * PX, sz);          // 등 줄무늬 3개 — 몸통보다 살짝만 얇게(파묻히게)
  // ── 머리 (5×4×5px, 몸통 앞쪽에 자식으로 부착)
  const head = new THREE.Group();
  head.position.set(0, 1.5 * PX, 12 * PX + 2.5 * PX);   // 몸통 앞면(6+6=12px)에서 머리 반경(2.5px)만큼 더 앞
  body.add(head); P.head = head;
  B(head, 5 * PX, 4 * PX, 5 * PX, fur, 0, 0, 0);                     // 두상
  B(head, 3 * PX, 2 * PX, 1 * PX, white, 0, -1.2 * PX, 2.5 * PX + 0.5 * PX); // 주둥이 (흰색, 얼굴 앞면 밖으로 살짝)
  B(head, 0.8 * PX, 0.6 * PX, 0.3 * PX, pink, 0, -0.2 * PX, 2.5 * PX + 1 * PX); // 코 (분홍)
  B(head, 1 * PX, 1 * PX, 0.3 * PX, eyeGreen, -1.6 * PX, 0.6 * PX, 2.5 * PX + 0.16 * PX); // 눈(초록) 좌
  B(head, 1 * PX, 1 * PX, 0.3 * PX, eyeGreen, 1.6 * PX, 0.6 * PX, 2.5 * PX + 0.16 * PX);  // 눈(초록) 우
  B(head, 0.45 * PX, 0.45 * PX, 0.32 * PX, pupil, -1.6 * PX, 0.5 * PX, 2.5 * PX + 0.17 * PX); // 동공 좌
  B(head, 0.45 * PX, 0.45 * PX, 0.32 * PX, pupil, 1.6 * PX, 0.5 * PX, 2.5 * PX + 0.17 * PX);  // 동공 우
  // ── 귀 (1×2×1px 두 개, 머리 위 모서리)
  const earL = new THREE.Group(); earL.position.set(-1.7 * PX, 2 * PX + 1 * PX, -1.7 * PX); head.add(earL); P.earL = earL;
  const earR = new THREE.Group(); earR.position.set(1.7 * PX, 2 * PX + 1 * PX, -1.7 * PX); head.add(earR); P.earR = earR;
  B(earL, 1 * PX, 2 * PX, 1 * PX, fur, 0, 0, 0);
  B(earR, 1 * PX, 2 * PX, 1 * PX, fur, 0, 0, 0);
  // ── 꼬리 2마디 (1×1×6px, 매우 길게, body 자식·-z 방향, 기본각은 살짝 아래로 처짐)
  const tail1 = new THREE.Group();
  tail1.position.set(0, 1 * PX, 0);   // 몸통 뒷면(로컬 z=0)에 바로 접합
  body.add(tail1); P.tail1 = tail1;
  B(tail1, 1 * PX, 1 * PX, 6 * PX, fur, 0, 0, -3 * PX);  // 첫 마디 (피벗에서 -z로 6px, 중심 -3px)
  const tail2 = new THREE.Group();
  tail2.position.set(0, 0, -6 * PX);        // 첫 마디 끝에서 이어짐
  tail1.add(tail2); P.tail2 = tail2;
  B(tail2, 1 * PX, 1 * PX, 6 * PX, fur, 0, 0, -3 * PX);
  B(tail2, 1.05 * PX, 1.05 * PX, 1.2 * PX, white, 0, 0, -6 * PX + 0.6 * PX); // 꼬리 끝 흰색 팁
  // ── 다리 4개 (2×6×2px, 가늘고 짧게 — 어깨/골반 피벗, 발끝 흰색)
  //   기립 시 다리 상단(피벗)을 어깨높이 6px(=0.12)에 두면 다리 박스(6px 길이, 중심 -3px)의 하단이 y=0(바닥)에 닿는다
  P.legs = {};
  for (const [key, x, z] of [['fl', -1.4 * PX, 5 * PX], ['fr', 1.4 * PX, 5 * PX], ['bl', -1.4 * PX, -5 * PX], ['br', 1.4 * PX, -5 * PX]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 6 * PX, z);
    g.add(leg); P.legs[key] = leg;
    B(leg, 2 * PX, 6 * PX, 2 * PX, fur, 0, -3 * PX, 0);           // 다리 (피벗에서 -y로 6px, 중심 -3px)
    B(leg, 2.05 * PX, 1.4 * PX, 2.05 * PX, white, 0, -6 * PX + 0.7 * PX, 0); // 흰 발끝 (다리 하단에 덧대어짐)
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, parts: P };
}
/* 고양이 무브셋: walk(다리 스윙 보행) · sit(마인크래프트 시그니처 앉기) · sleep(식빵 자세 숨쉬기)
   · groom(앞발/가슴 핥기) · stretch(기지개) · play(제자리 콩콩 사냥놀이)
   새 지오메트리(PX=0.02): 몸통 4×4×12px(피벗=엉덩이, 박스는 로컬 z 0~12px 즉 pivot에서 +z로 전개),
   다리 2×6×2px(루트 자식, 피벗=어깨/골반 높이 6px=0.12, 서있을 때 발끝이 y=0에 닿음),
   꼬리 1×1×6px×2마디(t1 음수=아래로 처짐, 기존 부호 유지) */
// 다리 rotation.x: 음수 = 앞(+z)으로 접힘(배 밑으로 튐), 양수 = 뒤로 뻗음
// body.rotation.x 부호: box가 로컬 +z(전방)에 있으므로 음수 회전 = 전방(가슴/머리)이 들림, 양수 = 전방이 숙여짐(엎드림)
const CAT_POSES = {
  //          bodyY   bodyRX     headRX      legF        legB        tail1RX
  // walk: 서있는 기본 높이(다리 피벗 0.12와 거의 일치하는 0.13), 수평 자세 — stride 오버레이가 다리를 흔든다
  walk:    { by: 0.13,  brx: 0,     hrx: 0,    legF: 0,     legB: 0,     t1: -0.5 },
  // sit: 마인크래프트 식 — 엉덩이(피벗)를 바닥에 붙이고 가슴을 크게 들어올림.
  //   기하 검증(box 로컬 코너 y=±0.04, z=0/0.24 를 brx만큼 회전 후 +by):
  //     brx=-1.0, by=0.025 → 엉덩이쪽(z=0) 바닥 코너 y≈0.008(거의 접지), 가슴쪽(z=0.24) 최고점 y≈0.264
  //   앞다리는 거의 수직 유지(legF≈0, 몸이 들려도 어깨 피벗은 고정이라 다리는 그대로 뻗은 자세로 보임),
  //   뒷다리는 -1.5rad 로 완전히 접어 배(들린 엉덩이) 밑으로 숨김(다리 끝 y≈0.11, z가 몸쪽으로 당겨짐).
  //   (라이브 튜닝 확정 2026-07-04: 57°는 가슴이 앞다리에서 벗어나 공중부양으로 보임 → 35°)
  sit:     { by: 0.045, brx: -0.62, hrx: 0.45, legF: 0,     legB: -1.5,  t1: -0.85 },
  // sleep: 식빵 — 몸통 수평(brx=0)으로 낮춰 배가 바닥에 닿게(by=0.03 → 바닥면 y≈-0.01, 살짝 파묻혀 접지감),
  //   네 다리 전부 -1.5rad 로 접어 몸 밑에 숨김(legF=legB), 머리는 살짝 숙임(hrx 양수)
  sleep:   { by: 0.03,  brx: 0,     hrx: 0.5,  legF: -1.5,  legB: -1.5,  t1: -1.3 },
  // groom: sit과 같은 앉음 실루엣 위에 오버레이(updateCat의 headRX 사인파/앞발 들기)가 얹힌다
  groom:   { by: 0.045, brx: -0.62, hrx: 0.55, legF: 0,     legB: -1.5,  t1: -0.85 },
  // stretch: 다운독 — brx=+0.6, by=0.17 → 가슴쪽(z=0.24) 바닥 코너 y=0(접지), 엉덩이쪽 y≈0.14(번쩍 들림)
  //   앞다리는 앞으로 쭉 뻗고(legF 음수, 접힘 부호를 반대로 써 전방으로 펴짐), 뒷다리는 곧게 편 채 지지(legB≈0)
  stretch: { by: 0.17,  brx: 0.6,   hrx: -0.4, legF: -0.9,  legB: 0.1,   t1: 0.35 },
  // play: 사냥 자세 — 몸을 살짝 낮추고(by 표준보다 조금 아래) 앞으로 약간 웅크림, hop 오버레이가 콩콩 튀게 함
  play:    { by: 0.11,  brx: 0.15,  hrx: 0.15, legF: 0.1,   legB: -0.4,  t1: -0.8 },
};
function pickNextCatMode(c) {
  const roll = Math.random();
  if (roll < 0.34) { c.tgt = catFreeSpot(); c.mode = 'walk'; return; }
  if (roll < 0.53) { c.mode = 'groom'; c.timer = 5 + Math.random() * 5; }
  else if (roll < 0.68) { c.mode = 'sleep'; c.timer = 25 + Math.random() * 35; }
  else if (roll < 0.8) { c.mode = 'stretch'; c.timer = 2.2; }
  else if (roll < 0.9) { c.mode = 'play'; c.timer = 3.5 + Math.random() * 2; }
  else { c.mode = 'sit'; c.timer = 8 + Math.random() * 14; }
}
function catFreeSpot() {
  // 러그·방석·침대를 좋아한다 — 없으면 빈 바닥
  const favs = items.filter(i => ['rug', 'cushion', 'bed'].includes(i.defId));
  if (favs.length && Math.random() < 0.55) {
    const f = favs[Math.floor(Math.random() * favs.length)];
    return { x: f.x + (Math.random() - 0.5) * 0.3, z: f.z + (Math.random() - 0.5) * 0.25, y: f.defId === 'bed' ? 0.63 : 0.06 };
  }
  for (let k = 0; k < 14; k++) {
    const x = (Math.random() * 2 - 1) * (ROOM.w / 2 - 0.5);
    const z = (Math.random() * 2 - 1) * (ROOM.d / 2 - 0.5);
    const blocked = items.some(i => !DEFS[i.defId].noCollide && !i.support &&
      Math.abs(x - i.x) < footprintOf(i).w / 2 + 0.18 && Math.abs(z - i.z) < footprintOf(i).d / 2 + 0.18);
    if (!blocked) return { x, z, y: 0 };
  }
  return { x: 0, z: 0, y: 0 };
}
// 사용자 결정: GLB 리깅 고양이는 앉기 실루엣 불만족으로 보류.
// 마인크래프트풍 각진 복셀 고양이가 이 복셀 게임 스타일에 더 자연스럽다고 판단해 기본 비활성.
// GLB 관련 코드(loadCatGlbScene/normalizeCatGlb/updateCatBones 등)는 향후 재검토를 위해 삭제하지 않고 보존한다.
const USE_RIGGED_CAT = false;
async function spawnCat() {
  if (!state.cat || catObj || _catSpawning) return;
  _catSpawning = true;
  const s = catFreeSpot();
  let g, parts = null, rig = null;
  const glbScene = USE_RIGGED_CAT ? await loadCatGlbScene() : null;
  // 로드 대기 중 상태가 바뀌었으면 취소
  if (!state.cat || catObj) { _catSpawning = false; if (glbScene) disposeDeep(glbScene); return; }
  if (glbScene) {
    const n = normalizeCatGlb(glbScene);
    g = n.wrap; rig = { bones: n.bones, rest: n.rest };
  } else {
    const built = buildCatMesh();
    g = built.g; parts = built.parts;
  }
  g.position.set(s.x, s.y, s.z);
  g.rotation.y = Math.random() * Math.PI * 2;
  scene.add(g);
  catObj = {
    g, p: parts, rig, rigged: !!rig,
    mode: 'sit', timer: 5 + Math.random() * 8, tgt: null,
    gait: 0, earKick: 0, earNext: 2 + Math.random() * 5, baseY: s.y,
  };
  _catSpawning = false;
  shadowDirty();
}
function despawnCat() {
  if (!catObj) return;
  scene.remove(catObj.g);
  disposeDeep(catObj.g);
  catObj = null;
}
function updateCat(t, dt) {
  if (!catObj) return;
  const c = catObj, p = c.p;
  // ── 모드 전환
  if (c.mode !== 'walk') {
    c.timer -= dt;
    if (c.timer <= 0) pickNextCatMode(c);
  }
  // ── 걷기: 이동 + 대각 보행 (FL+BR / FR+BL 스윙)
  let stride = 0;
  if (c.mode === 'walk' && c.tgt) {
    const dx = c.tgt.x - c.g.position.x, dz = c.tgt.z - c.g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) {
      c.baseY = c.tgt.y; c.tgt = null;
      c.mode = 'sit'; c.timer = 6 + Math.random() * 12;
      shadowDirty();
    } else {
      c.gait += dt * 10;
      stride = Math.sin(c.gait) * 0.65;
      c.g.position.x += dx / dist * 0.5 * dt;
      c.g.position.z += dz / dist * 0.5 * dt;
      // 부드러운 방향 전환
      const want = Math.atan2(dx, dz);
      let dr = want - c.g.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      c.g.rotation.y += dr * Math.min(1, dt * 8);
      // 침대 등 높은 목적지엔 다가가서 폴짝
      c.baseY = THREE.MathUtils.lerp(c.g.position.y, dist < 0.45 ? c.tgt.y : 0, Math.min(1, dt * 7));
    }
  }
  // ── 목표 포즈로 부드럽게 — 기본값(pv)을 따로 lerp하고, 오버레이는 매 프레임 합산만 한다
  const pose = CAT_POSES[c.mode] || CAT_POSES.sit;
  const k = Math.min(1, dt * 6);
  const pv = c.pv || (c.pv = { by: 0.13, brx: 0, hrx: 0, hry: 0, fl: 0, fr: 0, bl: 0, br: 0, t1: -0.5 });
  pv.by += (pose.by - pv.by) * k;
  pv.brx += (pose.brx - pv.brx) * k;
  pv.hrx += (pose.hrx - pv.hrx) * k;
  pv.fl += (pose.legF - pv.fl) * k;
  pv.fr += (pose.legF - pv.fr) * k;
  pv.bl += (pose.legB - pv.bl) * k;
  pv.br += (pose.legB - pv.br) * k;
  pv.t1 += (pose.t1 - pv.t1) * k;
  // ── 모드별 오버레이 (누적 없이 pv + 오버레이로 매번 재계산)
  let headRX = pv.hrx, headRY = 0, flX = pv.fl + stride, frX = pv.fr - stride;
  const walkBob = c.mode === 'walk' ? Math.abs(Math.sin(c.gait)) * 0.018 : 0;
  const hop = c.mode === 'play' ? Math.abs(Math.sin(t * 7.5)) * 0.055 : 0; // 사냥놀이 콩콩
  let bodyBr = 1;
  if (c.mode === 'sleep') bodyBr = 1 + Math.sin(t * 1.7) * 0.035;          // 식빵 자세 숨쉬기
  else if (c.mode === 'groom') {
    headRX += Math.sin(t * 7.5) * 0.16;                                    // 가슴/앞발 핥는 고갯짓
    headRY = Math.sin(t * 0.9) > 0 ? 0.4 : -0.4;
    flX += Math.max(0, Math.sin(t * 0.9)) * -0.5;                          // 한쪽 앞발 들기
  } else if (c.mode === 'sit') headRY = Math.sin(t * 0.4) * 0.55;          // 느긋한 두리번
  else if (c.mode === 'play') headRY = Math.sin(t * 5) * 0.3;              // 사냥감 쫓는 시선
  // rigged: CAT_POSES.by 의 기립값(0.14) 대비 편차 ×2.0 을 래퍼 y 하강으로
  //   → sit 0.075 = -0.13 (기립높이 0.32 의 41% ↓, 골반이 바닥에 닿음), sleep 0.05 = -0.18
  const rigDrop = c.rigged ? Math.max(0, 0.14 - pv.by) * 2.0 : 0;
  c.g.position.y = c.baseY + walkBob + hop - rigDrop;
  // ── 꼬리 살랑 파라미터 (양 경로 공용)
  const tailSpd = c.mode === 'play' ? 9 : c.mode === 'walk' ? 4.5 : c.mode === 'sleep' ? 0.7 : 1.6;
  const tailAmp = c.mode === 'play' ? 0.7 : c.mode === 'sleep' ? 0.12 : 0.4;
  const tailY0 = Math.sin(t * tailSpd) * tailAmp;
  const tailY1 = Math.sin(t * tailSpd - 0.9) * tailAmp * 1.3;
  const tailX0 = Math.sin(t * tailSpd * 0.6) * 0.2 - (c.mode === 'walk' ? 0.4 : 0);
  // ── 귀 털기 타이머 (양 경로 공용)
  c.earNext -= dt;
  if (c.earNext <= 0) { c.earKick = 1; c.earNext = 3 + Math.random() * 8; c.earSide = Math.random() < 0.5 ? 'earL' : 'earR'; }
  if (c.earKick > 0) c.earKick = Math.max(0, c.earKick - dt * 4);
  const earKickV = c.earKick > 0 ? Math.sin(c.earKick * 28) * 0.35 * c.earKick : 0;

  if (c.rigged) {
    updateCatBones(c, {
      pv, stride, headRX, headRY, flX, frX, bodyBr,
      tailY0, tailY1, tailX0, earKickV, earSide: c.earSide,
    }, dt);
    return;
  }
  // ── 복셀 폴백: 기존 메시 포즈 적용
  p.body.scale.set(bodyBr, bodyBr, 1);
  p.body.position.y = pv.by;
  p.body.rotation.x = pv.brx;
  p.head.rotation.x = headRX;
  p.head.rotation.y += (headRY - p.head.rotation.y) * Math.min(1, dt * 4);
  p.legs.fl.rotation.x = flX;
  p.legs.fr.rotation.x = frX;
  p.legs.bl.rotation.x = pv.bl - stride;
  p.legs.br.rotation.x = pv.br + stride;
  p.tail1.rotation.x = pv.t1;
  p.tail1.rotation.y = tailY0;
  p.tail2.rotation.y = tailY1;
  p.tail2.rotation.x = tailX0;
  p[c.earSide || 'earL'].rotation.z = earKickV;
}

// rest 쿼터니언에서 오프셋을 곱해 본을 구동 (누적 금지: 매 프레임 rest×offset 재계산)
const _qOff = new THREE.Quaternion(), _eul = new THREE.Euler();
function _setBone(rig, name, rx, ry, rz) {
  const b = rig.bones[name], r = rig.rest[name];
  if (!b || !r) return;
  _eul.set(rx || 0, ry || 0, rz || 0, 'XYZ');
  _qOff.setFromEuler(_eul);
  b.quaternion.copy(r).multiply(_qOff);
}
function updateCatBones(c, a, dt) {
  const rig = c.rig, B = CAT_BONES;
  // 척추: CAT_POSES.brx ×2.0 을 6마디에 균등 분산 (실측: -X = 가슴·머리 세움)
  //   sit brx -0.3 → 총 -0.6rad: 골반(래퍼 하강으로 바닥) 위로 가슴이 들려 '앉음' 삼각 실루엣
  const perSpine = a.pv.brx * 2.0 / B.spine.length;
  for (const sn of B.spine) _setBone(rig, sn, perSpine, 0, 0);
  // sleep 숨쉬기: 척추 루트 스케일 (얼굴 본이 스컬에 attach 돼 있어 머리도 함께 따라옴)
  const spineRoot = rig.bones[B.spine[0]];
  if (spineRoot) spineRoot.scale.setScalar(a.bodyBr);
  // 머리(두개골 spine006): 끄덕임(+X=숙임, 복셀과 동일 부호) + 두리번(Y)
  //   척추 세움만큼 고개를 되숙여 시선을 수평으로 보정
  c._hry = (c._hry || 0) + (a.headRY - (c._hry || 0)) * Math.min(1, dt * 4);
  _setBone(rig, B.head, a.headRX - a.pv.brx * 1.4, c._hry, 0);
  // 앞다리(어깨+앞무릎) — 복셀 부호(-=앞으로 접힘)를 실측 부호로 변환:
  //   기본 게인 -0.9 (접힘 → +X: 발이 몸 뒤·아래로 턱 = 웅크림), stretch 만 +0.9 (발 앞으로 뻗는 플레이보우)
  const fgTgt = c.mode === 'stretch' ? 0.9 : -0.9;
  c._fg = (c._fg === undefined ? -0.9 : c._fg) + (fgTgt - c._fg) * Math.min(1, dt * 6);
  _setBone(rig, B.legFL, c._fg * a.flX, 0, 0);
  _setBone(rig, B.legFR, c._fg * a.frX, 0, 0);
  _setBone(rig, B.foreFL, 0.55 * Math.min(0, a.flX), 0, 0);   // 접을 때만 앞무릎 역굽힘
  _setBone(rig, B.foreFR, 0.55 * Math.min(0, a.frX), 0, 0);
  // 뒷다리 — 실측: thigh +X = 접힘(발끝 위·뒤), shin -X = 발끝 앞 (상쇄 굽힘)
  //   sit legB -1.15 → thigh +1.32rad(76°) 접힘 + shin -0.80: 다리가 내려앉은 몸 밑에 숨음
  _setBone(rig, B.legBL, -(a.pv.bl - a.stride) * 1.15, 0, 0);
  _setBone(rig, B.legBR, -(a.pv.br + a.stride) * 1.15, 0, 0);
  _setBone(rig, B.shinBL, 1.0 * Math.min(0, a.pv.bl), 0, 0);
  _setBone(rig, B.shinBR, 1.0 * Math.min(0, a.pv.br), 0, 0);
  // 꼬리 4마디 (루트 tail004 → 끝 tail001) — 실측: +X=내림, ±Z=좌우 스윙
  //   CAT_POSES.t1(음수=내림) ×-0.45 를 루트 X 로, 살랑임은 Z 위상 지연 사행,
  //   sit/groom/sleep 은 옆으로 감기(컬) 를 마디별로 누진 가산 → 바닥에 일자로 안 끌림
  const curlTgt = (c.mode === 'sit' || c.mode === 'groom' || c.mode === 'sleep') ? 0.85 : 0;
  c._curl = (c._curl || 0) + (curlTgt - c._curl) * Math.min(1, dt * 3);
  const T = B.tail, cu = c._curl;
  _setBone(rig, T[0], -a.pv.t1 * 0.45, 0, a.tailY0 * 0.5 + cu * 0.5);
  _setBone(rig, T[1], a.tailX0 * 0.3, 0, a.tailY1 * 0.6 + cu * 0.8);
  _setBone(rig, T[2], 0, 0, a.tailY0 * 0.7 + cu * 1.0);
  _setBone(rig, T[3], 0, 0, a.tailY1 * 0.8 + cu * 1.1);
  // 귀 털기 (z축 파르르)
  _setBone(rig, B.earL, 0, 0, a.earSide === 'earL' ? a.earKickV : 0);
  _setBone(rig, B.earR, 0, 0, a.earSide === 'earR' ? -a.earKickV : 0);
}

// title/text/choice label 은 언어 전환 시점(showEvent) 에 t() 로 해석하므로 id 로 보관한다.
const EVENTS = {
  wanderer: {
    icon: '🚶', titleId: 'ev.wanderer.title', textId: 'ev.wanderer.text',
    choices: [
      { labelId: 'ev.wanderer.c0', cost: { food: 2 }, run() { state.buff = { exp: 0.10, labelId: 'buff.wanderer' }; return t('ev.wanderer.r0'); } },
      { labelId: 'ev.wanderer.c1', run() { return t('ev.wanderer.r1'); } },
    ],
  },
  trader: {
    icon: '🎒', titleId: 'ev.trader.title', textId: 'ev.trader.text',
    choices: [
      { labelId: 'ev.trader.c0', cost: { battery: 2 }, run() { resAdd('bandage', 1); resAdd('antiseptic', 1); return t('ev.trader.r0'); } },
      { labelId: 'ev.trader.c1', run() { return t('ev.trader.r1'); } },
    ],
  },
  dog: {
    icon: '🐕', titleId: 'ev.dog.title', textId: 'ev.dog.text',
    choices: [
      { labelId: 'ev.dog.c0', cost: { food: 1 }, run() { state.buff = { exp: 0.10, labelId: 'buff.dog' }; return t('ev.dog.r0'); } },
      { labelId: 'ev.dog.c1', run() { return t('ev.dog.r1'); } },
    ],
  },
  storm: {
    icon: '🌪️', titleId: 'ev.storm.title', textId: 'ev.storm.text',
    choices: [
      { labelId: 'ev.storm.c0', cost: { material: 1 }, run() { return t('ev.storm.r0'); } },
      { labelId: 'ev.storm.c1', run() { state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 10); return t('ev.storm.r1'); } },
    ],
  },
  broken: {
    icon: '🔩', titleId: 'ev.broken.title', textId: 'ev.broken.text',
    choices: [
      { labelId: 'ev.broken.c0', cost: { parts: 1 }, run() { return t('ev.broken.r0'); } },
      { labelId: 'ev.broken.c1', run() { state.buff = { exp: -0.05, labelId: 'buff.broken' }; return t('ev.broken.r1'); } },
    ],
  },
  thief: {
    icon: '👣', titleId: 'ev.thief.title', textId: 'ev.thief.text',
    choices: [
      { labelId: 'ev.thief.c0', run() {
        const lit = items.some(it => DEFS[it.defId].light && it.on !== false);
        if (lit) return t('ev.thief.r.safe');
        for (const rid of ['bandage', 'battery', 'food']) {
          if ((state.res[rid] || 0) > 0) { resConsume(rid, 1); return t('event.stolen', { name: LN(RESOURCES[rid]) }); }
        }
        return t('ev.thief.r.none');
      } },
    ],
  },
  seeds: {
    icon: '🌱', titleId: 'ev.seeds.title', textId: 'ev.seeds.text',
    choices: [
      { labelId: 'ev.seeds.c0', cost: { water: 2 }, run() {
        if (state.current === 'greenhouse') { resAdd('food', 3); return t('ev.seeds.r.green'); }
        resAdd('food', 1);
        return t('ev.seeds.r.plain');
      } },
      { labelId: 'ev.seeds.c1', run() { return t('ev.seeds.r1'); } },
    ],
  },
  radio_sig: {
    icon: '📡', titleId: 'ev.radio.title', textId: 'ev.radio.text',
    cond: () => items.some(i => i.defId === 'radio'),
    choices: [
      { labelId: 'ev.radio.c0', run() { state.buff = { loot: 2, labelId: 'buff.radio' }; return t('ev.radio.r0'); } },
      { labelId: 'ev.radio.c1', run() { return t('ev.radio.r1'); } },
    ],
  },
  /* ── 특수 인카운터 (일반 풀에서 제외) ── */
  cat: {
    special: true,
    icon: '🐈', titleId: 'ev.cat.title', textId: 'ev.cat.text',
    choices: [
      { labelId: 'ev.cat.c0', cost: { food: 1 }, run() {
        state.cat = 1;
        spawnCat();
        state.dayLog.notes.push(t('day.catJoined'));
        playSfx('meow1');
        return t('ev.cat.r0');
      } },
      { labelId: 'ev.cat.c1', run() { return t('ev.cat.r1'); } },
    ],
  },
  ending: {
    special: true,
    icon: '🚁', titleId: 'ev.ending.title', textId: 'ev.ending.text',
    choices: [
      { labelId: 'ev.ending.c0', run() { setTimeout(runEndingSequence, 400); return t('ev.ending.r0'); } },
      { labelId: 'ev.ending.c1', run() { return t('ev.ending.r1'); } },
    ],
  },
};
function showEvent(id) {
  const ev = EVENTS[id];
  if (!ev) return;
  playSfx('sting');
  const evTitle = t(ev.titleId);
  const body = `
    <div class="modal-body" style="line-height:2">${t(ev.textId)}</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
      ${ev.choices.map((c, i) => {
        const ok = !c.cost || resHasAll(c.cost);
        return `<button class="pixel-btn" data-ch="${i}" ${ok ? '' : 'disabled'}>${t(c.labelId)}${c.cost && !ok ? t('ev.noResource') : ''}</button>`;
      }).join('')}
    </div>`;
  openModal(`${ev.icon} ${evTitle}`, body);
  $('modal-body').querySelectorAll('button[data-ch]').forEach(b =>
    b.addEventListener('click', () => {
      const c = ev.choices[+b.dataset.ch];
      if (c.cost && !resConsumeAll(c.cost)) { toast(t('toast.needResource')); return; }
      const result = c.run();
      state.dayLog.notes.push(t('event.metNote', { icon: ev.icon, title: evTitle }));
      openModal(`${ev.icon} ${evTitle}`, `<div style="line-height:2">${result}</div>`);
      scheduleSave();
      renderResBar();
      updateHud();
    }));
  tipOnce('tip.event'); // 찢어진 쪽지: 첫 인카운터 직후
}

/* ============================================================
   제작 (기획서: 업그레이드 트랙 — 재료 → 자원/가구)
============================================================ */
/* ── 거처 개조 (기지 커스터마이징: 빗물받이·텃밭·증축 등) ── */
const SHELTER_MODS = {
  raincatch:  { name: '빗물받이',    nameEn: 'Rain Catch',   emoji: '🪣', cost: { material: 2, parts: 1 }, desc: '비/눈 오는 날 깨끗한 물 +1', descEn: 'Clean water +1 on rainy/snowy days', not: ['lighthouse'] },
  garden:     { name: '텃밭 상자',   nameEn: 'Garden Box',   emoji: '🌱', cost: { material: 2, water: 2 }, desc: '이틀에 한 번 음식 +1 (겨울 제외)', descEn: 'Food +1 every other day (except winter)', not: ['subway'] },
  insulation: { name: '단열재',      nameEn: 'Insulation',   emoji: '🧤', cost: { cloth: 3, material: 2 }, desc: '악천후에도 쾌적함이 떨어지지 않음', descEn: 'Comfort no longer drops in bad weather', only: ['container', 'bus'] },
  shelf:      { name: '증축 선반',   nameEn: 'Extra Shelving', emoji: '🪜', cost: { material: 3, parts: 1 }, desc: '가구 배치 한도 +4', descEn: 'Furniture limit +4', only: ['bus'] },
  solar:      { name: '태양광 패널', nameEn: 'Solar Panel',  emoji: '🔆', cost: { parts: 4, battery: 1 },  desc: '이틀에 한 번 배터리 +1', descEn: 'Battery +1 every other day', not: ['subway'] },
  roof:       { name: '지붕 보강',   nameEn: 'Roof Reinforcement', emoji: '🛠️', cost: { material: 4 },      desc: '악천후 수리 자재가 더 이상 들지 않음', descEn: 'Bad-weather repairs no longer cost materials', only: ['cabin', 'greenhouse'] },
  extension:  { name: '증축',        nameEn: 'Extension',    emoji: '🧱', cost: { material: 6, parts: 2 },  desc: '거처 폭 +2m — 벽을 허물고 더 넓게', descEn: 'Shelter width +2m — tear down a wall for more room', only: ['container', 'cabin', 'greenhouse', 'rooftop', 'subway', 'ship'] },
};
function modAvailable(id, shelterId) {
  const m = SHELTER_MODS[id];
  if (m.only && !m.only.includes(shelterId)) return false;
  if (m.not && m.not.includes(shelterId)) return false;
  return true;
}
function hasMod(id) { return (state.mods?.[state.current] || []).includes(id); }
// 설치된 개조의 시각 소품 (roomGroup에 부착 — 셸터 로드 시 재생성)
function addModProp(id) {
  const { w, d } = ROOM;
  if (id === 'raincatch') {
    const barrel = Cyl(roomGroup, 0.32, 0.28, 0.66, 0x5a7a8c, -w / 2 - 0.55, 0.33, d / 2 + 0.4, 10);
    barrel.castShadow = true;
    B(roomGroup, 0.46, 0.04, 0.46, 0x3a4a55, -w / 2 - 0.55, 0.68, d / 2 + 0.4);
    Cyl(roomGroup, 0.05, 0.05, ROOM.h * 0.8, 0x6a7076, -w / 2 - 0.42, ROOM.h * 0.4, d / 2 + 0.28, 6);
  } else if (id === 'garden') {
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
    g.position.set(w / 2 + 1.1, 0, -d / 2 + 1.2);
    roomGroup.add(g);
  } else if (id === 'solar') {
    const g = new THREE.Group();
    Cyl(g, 0.06, 0.08, 1.6, 0x55504a, 0, 0.8, 0, 6);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.9), lamb(0x1d2b45));
    panel.position.y = 1.7;
    panel.rotation.z = -0.5;
    panel.castShadow = true;
    g.add(panel);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.04, 0.98), lamb(0x8a8f96));
    frame.position.y = 1.67;
    frame.rotation.z = -0.5;
    g.add(frame);
    g.position.set(w / 2 + 0.9, 0, d / 2 + 0.7);
    roomGroup.add(g);
  } else if (id === 'shelf') {
    B(roomGroup, 0.06, 1.4, ROOM.d * 0.7, 0x77543a, -w / 2 + 0.12, 0.7, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.1, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.7, 0);
  }
  // insulation / roof: 시각 변화 없음 (내부 보강)
}
function buildModProps() {
  for (const id of (state.mods?.[state.current] || [])) addModProp(id);
}

// 가구는 파밍이 아니라 제작이 기본 (파밍은 극히 드문 행운)
const CRAFTS = [
  { out: { res: 'bandage', n: 1 }, cost: { cloth: 2 }, hint: '기본 치료품', hintEn: 'Basic first aid' },
  { out: { res: 'candle', n: 2 }, cost: { cloth: 1, fuel: 1 }, hint: '조명 연료', hintEn: 'Lighting fuel' },
  { out: { res: 'material', n: 1 }, cost: { parts: 2 }, hint: '수리·유지비용', hintEn: 'Repairs & upkeep' },
  { out: { furn: 'cushion' }, cost: { cloth: 2 }, hint: '푹신한 바닥 방석', hintEn: 'A soft floor cushion' },
  { out: { furn: 'bookstack' }, cost: { cloth: 1, material: 1 }, hint: '주워 모은 책 무더기', hintEn: 'A pile of gathered books' },
  { out: { furn: 'crate' }, cost: { material: 2 }, hint: '수납 상자', hintEn: 'Storage crate' },
  { out: { furn: 'chair' }, cost: { material: 2 }, hint: '나무 의자', hintEn: 'Wooden chair' },
  { out: { furn: 'candle' }, cost: { material: 1, candle: 1 }, hint: '캔들 스툴', hintEn: 'Candle stool' },
  { out: { furn: 'teatable' }, cost: { material: 2, cloth: 1 }, hint: '낮은 찻상 — 따뜻한 한 잔', hintEn: 'A low tea table — a warm cup' },
  { out: { furn: 'rug' }, cost: { cloth: 3 }, hint: '천을 엮은 러그', hintEn: 'A woven-cloth rug' },
  { out: { furn: 'plant' }, cost: { water: 2, material: 1 }, hint: '화분에 심은 초록', hintEn: 'Greenery in a pot' },
  { out: { furn: 'table' }, cost: { material: 3 }, hint: '식탁', hintEn: 'Dining table' },
  { out: { furn: 'dresser' }, cost: { material: 3, cloth: 1 }, hint: '서랍장', hintEn: 'Dresser' },
  { out: { furn: 'lantern' }, cost: { parts: 1, material: 1, candle: 2 }, hint: '걸이형 랜턴 (양초 연료)', hintEn: 'Hanging lantern (candle fuel)' },
  { out: { furn: 'bed' }, cost: { cloth: 3, material: 2 }, hint: '천 + 프레임 → 침대', hintEn: 'Cloth + frame → bed' },
  { out: { furn: 'bookshelf' }, cost: { material: 4 }, hint: '책장', hintEn: 'Bookshelf' },
  { out: { furn: 'sofa' }, cost: { cloth: 4, material: 2 }, hint: '패브릭 소파', hintEn: 'Fabric sofa' },
  { out: { furn: 'lamp' }, cost: { parts: 2, battery: 1 }, hint: '부품 조립 조명', hintEn: 'Part-built lamp' },
  { out: { furn: 'clock' }, cost: { parts: 2, material: 2 }, hint: '괘종시계 — 시간이 흐르는 소리', hintEn: 'Grandfather clock — the sound of passing time' },
  { out: { furn: 'radio' }, cost: { parts: 3, battery: 1 }, hint: '라디오 (날씨 예보)', hintEn: 'Radio (weather forecast)' },
  { out: { furn: 'stove' }, cost: { parts: 3, material: 3 }, hint: '장작 난로 — 최고의 온기 (연료 1/일)', hintEn: 'Wood stove — the best warmth (fuel 1/day)' },
  { out: { furn: 'purifier' }, cost: { parts: 4, material: 2 }, hint: '매일 물 +1 (전력 필요)', hintEn: 'Water +1 daily (needs power)' },
  { out: { furn: 'generator' }, cost: { parts: 5, material: 3 }, hint: '배터리 소비 무료화 (연료 필요)', hintEn: 'Free battery use (needs fuel)' },
  { out: { furn: 'fridge' }, cost: { parts: 4, material: 2, battery: 1 }, hint: '음식 부패 방지 (전력 필요)', hintEn: 'Prevents food spoilage (needs power)' },
];
function openCraftModal() {
  const rows = CRAFTS.map((c, i) => {
    const outLabel = c.out.res
      ? `${RESOURCES[c.out.res].emoji} ${LName(RESOURCES[c.out.res])} ×${c.out.n}`
      : `${DEFS[c.out.furn].emoji} ${LName(DEFS[c.out.furn])}`;
    const ok = resHasAll(c.cost);
    return `
      <div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${outLabel}</span>
        <span class="p-eff" style="font-size:10px">${LHint(c)}</span>
        <span class="p-cost">${costLabel(c.cost)}</span>
        <button class="pixel-btn" data-craft="${i}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('craft.make')}</button>
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
  openModal(t('craft.title'), `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">${t('craft.intro')}</div>${rows}
    <div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('craft.modHeader', { emoji: sh.emoji, name: LName(sh) })}</div>
    <div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">${t('craft.modIntro')}</div>${modRows || `<div style="font-size:11px;color:var(--text-dim)">${t('craft.noMods')}</div>`}`);
  $('modal-body').querySelectorAll('button[data-craft]').forEach(b =>
    b.addEventListener('click', () => {
      const c = CRAFTS[+b.dataset.craft];
      if (!resConsumeAll(c.cost)) { toast(t('toast.needMaterial')); return; }
      if (c.out.res) {
        resAdd(c.out.res, c.out.n);
        toast(t('craft.doneRes', { emoji: RESOURCES[c.out.res].emoji, name: LName(RESOURCES[c.out.res]), n: c.out.n }));
      } else {
        state.inventory[c.out.furn] = (state.inventory[c.out.furn] || 0) + 1;
        toast(t('craft.doneFurn', { emoji: DEFS[c.out.furn].emoji, name: LName(DEFS[c.out.furn]) }));
        renderInventoryBar();
      }
      state.stats.craft = (state.stats.craft || 0) + 1;
      state.dayLog.notes.push(t('craft.noteRes', { name: c.out.res ? LName(RESOURCES[c.out.res]) : LName(DEFS[c.out.furn]) }));
      scheduleSave();
      renderResBar();
      playSfx('craft');
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
  { id: 'col21',     icon: '📖', name: '수집가',           nameEn: 'Collector',          desc: '도감 25% (가구 색상 21종)',   descEn: 'Collection 25% (21 furniture colors)', chk: () => collectionCount() >= 21 },
  { id: 'col42',     icon: '🖼️', name: '큐레이터',         nameEn: 'Curator',            desc: '도감 50%',                    descEn: 'Collection 50%',                     chk: () => collectionCount() >= 42 },
  { id: 'colAll',    icon: '🏛️', name: '폐허의 박물관장',  nameEn: 'Museum Keeper of the Ruins', desc: '도감 100% (84색상)',   descEn: 'Collection 100% (84 colors)',        chk: () => collectionCount() >= 84 },
  { id: 'cat',       icon: '🐈', name: '고양이 집사',      nameEn: 'Cat Servant',        desc: '길고양이를 가족으로 맞이하다', descEn: 'Welcome a stray cat as family',      chk: () => !!state.cat },
  { id: 'ending',    icon: '🚁', name: '폐허 너머로',      nameEn: 'Beyond the Ruins',   desc: 'Day 10000 — 박사와 함께 탈출', descEn: 'Day 10000 — escape with the doctor', chk: () => !!state.endingSeen },
];
function checkAchievements() {
  if (!state.achs) state.achs = {};
  for (const a of ACHS) {
    if (!state.achs[a.id] && a.chk()) {
      state.achs[a.id] = true;
      toast(t('ach.unlocked', { icon: a.icon, name: LName(a) }));
      state.dayLog.notes.push(t('ach.note', { name: LName(a) }));
      playSfx('ring');
    }
  }
}
function openJournalModal() {
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
  openModal(t('journal.title'), `
    <div class="report-sec"><span class="r-title">${t('journal.statsTitle')}</span><br>
      ${t('journal.statsLine', { day: state.day, sicon: se.icon, exp: state.stats.exp, succ: state.stats.success, craft: state.stats.craft || 0, stay: state.stayDays || 0 })}
    </div>
    <div class="report-sec"><span class="r-title">${t('journal.colTitle', { n: collectionCount() })}</span><br>${colHtml}</div>
    <div class="report-sec"><span class="r-title">${t('journal.achTitle', { n: Object.values(state.achs || {}).filter(Boolean).length, total: ACHS.length })}</span></div>
    ${achsHtml}`);
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
// 고양이 쓰다듬기: catObj.g 대상 별도 히트테스트 (하루 3회 제한)
let petDay = 0, petCount = 0;
function pickCat(e) {
  if (!catObj) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(catObj.g, true);
  if (!hits.length) return false;
  if (petDay !== state.day) { petDay = state.day; petCount = 0; }
  if (petCount >= 3) return true; // 히트는 소비하되 보상 없음(오늘 한도 초과)
  petCount++;
  playSfx(['meow1', 'meow2', 'meow3'][Math.floor(Math.random() * 3)]);
  toast(t('cat.pet'));
  return true;
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
  select(item);
  scheduleSave();
  playSfx('place');
}
function select(item) {
  deselect();
  selected = item;
  showSelPanel(item);
  updateSelRing();
}
function deselect() {
  selected = null;
  hideSelPanel();
  updateSelRing();
}
function reclaimSelected() {
  if (!selected) return;
  if (DEFS[selected.defId].surface) dropChildrenOf(selected);
  state.inventory[selected.defId] = (state.inventory[selected.defId] || 0) + 1;
  removeItem(selected);
  deselect();
  renderInventoryBar();
  scheduleSave();
  playSfx('whoosh');
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
  if (pickCat(e)) return; // 고양이를 쓰다듬은 경우 기존 가구 선택/드래그로 이어지지 않게 소비
  const hit = pickItem(e);
  if (hit) {
    select(hit);
    if (hit.defId === 'radio') playSfx('radio_noise', { vol: 0.5, jitter: 0 }); // 라디오 클릭 시 지지직 1회
    dragging = hit;
    dragStart = {
      sx: e.clientX, sy: e.clientY, ox: hit.x, oz: hit.z, or: hit.rot, moved: false,
      oy: hit.y || 0, osup: hit.support || null,
      kids: DEFS[hit.defId].surface ? itemsOn(hit).map(ch => ({ ch, x: ch.x, z: ch.z, r: ch.rot })) : [],
    };
  } else {
    orbitDrag = { x: e.clientX, y: e.clientY, moved: false };
  }
});
addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size >= 2) {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
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
    const dx = e.clientX - orbitDrag.x;
    if (!orbitDrag.moved && Math.hypot(dx, e.clientY - orbitDrag.y) > 7) orbitDrag.moved = true;
    if (orbitDrag.moved) {
      camState.targetYaw += dx * 0.008;
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
    if (!orbitDrag.moved) deselect(); // 제자리 탭 = 선택 해제
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
  camState.zoom = THREE.MathUtils.clamp(camState.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.25, 3.2);
}, { passive: false });

// v2.4: PC 판정 — 포인터가 정밀(마우스)하고 터치 지원이 없는 기기만 "PC"로 취급.
const isPcInput = matchMedia('(pointer: fine)').matches && !('ontouchstart' in window);
function toggleSettingsPanel() {
  const rp = $('render-panel');
  const willShow = rp.style.display === 'none';
  rp.style.display = willShow ? '' : 'none';
  if (willShow) { clampPanel(rp); reclampAllPanels(); }
}
addEventListener('keydown', e => {
  if (titleVisible) return;
  if (e.key === 'q' || e.key === 'Q') camState.targetYaw -= Math.PI / 4;
  if (e.key === 'e' || e.key === 'E') camState.targetYaw += Math.PI / 4;
  if (e.key === 'Escape') {
    // 우선순위: 배치 중 취소 > 선택 해제 > 모달 닫기 > (PC) 설정 패널 토글
    if (placing) { cancelPlacing(); }
    else if (selected) { deselect(); }
    else if ($('modal-back').classList.contains('show')) { closeModal(); }
    else if (isPcInput) { toggleSettingsPanel(); }
  }
  if (e.key === 'r' || e.key === 'R') rotateActive();
  if (e.key === 'p' || e.key === 'P') setPaused(!paused);
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !placing) reclaimSelected();
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
let lastWallMask = -1;
function updateWallCulling() {
  if (!wallList.length) return;
  const dir = new THREE.Vector3().subVectors(camera.position, camCenter).normalize();
  let mask = 0;
  wallList.forEach((w, i) => {
    w.group.visible = w.normal.dot(dir) < 0.25;
    if (w.group.visible) mask |= 1 << i;
  });
  if (mask !== lastWallMask) { lastWallMask = mask; shadowDirty(); }
}
// 날씨-환경 상호작용: 눈이 쌓이고(지면·수풀·지붕 풀 서리 톤), 악천후엔 바람이 거세짐
let snowCover = 0, windLevel = 1;
let snowSeeded = false; // 초봄 잔설 초기값은 최초 1회만 세팅 (셸터 재입장/개조 시 덮어쓰지 않도록)
// 비가 오면 셸터 겉면이 젖어 어두워진다
let wetness = 0, wetApplied = -1;
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
      m.shininess = m.userData.shininessDry + (28 - m.userData.shininessDry) * wetness;
    }
  });
}
function updateEnvironment(t, dt) {
  const wBadNow = weather.type === 'snow' || weather.type === 'rain' || weather.type === 'storm';
  // 눈: 내리는 동안 서서히 쌓이고, 그치면 녹는다. 겨울엔 잔설이 남는다.
  const season = seasonOf();
  const targetSnow = weather.type === 'snow' ? 1 : (season.id === 'winter' ? 0.3 : 0);
  snowCover += (targetSnow - snowCover) * Math.min(1, dt * 0.025);
  // 계절 색조 × 적설
  vcLambert.color.setRGB(
    season.tint[0] * (1 + snowCover * 0.5),
    season.tint[1] * (1 + snowCover * 0.58),
    season.tint[2] * (1 + snowCover * 0.72)
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
  if (envDyn.trees || envDyn.buildings) {
    const cd = new THREE.Vector2(camera.position.x - camCenter.x, camera.position.z - camCenter.z).normalize();
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
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + 0.9 * dt;
      if (y > 15.5) y = 2;
      p.setY(i, y);
      p.setX(i, 24 + Math.sin(y * 0.5 + envDyn.smoke.phase[i]) * (0.5 + y * 0.09));
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
  // pre-zoom 좌표계로 환산
  const preL = r.left / z, preT = r.top / z, preW = r.width / z;
  const l = THREE.MathUtils.clamp(preL, 0, Math.max(0, innerWidth - Math.min(preW, 120)));
  const t = THREE.MathUtils.clamp(preT, 0, Math.max(0, innerHeight - 30));
  el.style.left = l + 'px';
  el.style.top = t + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}
function makeDraggablePanel(el, key, title) {
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
  for (const id of ['hud', 'exp-panel', 'render-panel', 'clock-panel', 'res-bar'])
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
  // 설정 패널(render-panel) 자체가 카메라 컨트롤(#cam-ctrl)과 가로로 겹치지 않게:
  // 뷰포트가 좁아 render-panel 오른쪽 경계가 cam-ctrl 왼쪽 경계를 침범하면 접어서 폭을 줄인다.
  // (res-bar를 그 아래로 이어붙이기 전에 먼저 최종 높이를 확정해야 여백이 낭비되지 않는다)
  if (!uiState.render) {
    const rp = $('render-panel');
    const cc = $('cam-ctrl');
    if (rp && cc && !rp.classList.contains('collapsed')) {
      const rr = rp.getBoundingClientRect();
      const cr = cc.getBoundingClientRect();
      const overlapsVert = rr.bottom > cr.top;
      if (overlapsVert && rr.right > cr.left) rp.classList.add('collapsed');
    }
  }
  // 자원 패널: 설정 패널(render-panel) 바로 아래로 이어붙인다 (둘 다 접혀 있으면 헤더만 겹쳐 쌓이므로
  // 작은 창에서도 그대로 적용 — cam-ctrl과의 우발적 겹침을 피하는 데도 도움이 된다)
  if (!uiState.res && !uiState.render && innerWidth >= 760) {
    const rp = $('render-panel');
    const rb = $('res-bar');
    if (rp && rb) {
      const r = preRect(rp);
      const rbW = preRect(rb).width;
      rb.style.top = Math.round(r.bottom + 10) + 'px';
      rb.style.left = Math.round(r.right - rbW) + 'px';
      rb.style.right = 'auto'; rb.style.bottom = 'auto'; rb.style.transform = 'none';
    }
  }
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
    $('t-continue-info').textContent = t('title.continueInfo', { slot: currentSlot, day: meta.day, sicon: meta.season.icon, semoji: meta.shelter.emoji, sname: LName(meta.shelter) });
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
  $('title-screen').style.display = 'none';
  // 타이틀 화면에선 .panel이 display:none이라 이전 onResize() 때 패널 크기가 0으로 측정됐다.
  // 실제 패널이 보이기 시작한 지금 다시 계산해 자동 배치를 맞춘다.
  onResize();
  // 자리 비운 사이의 정산(탐험 결과 등)은 게임에 들어온 뒤에 보여준다
  if (state.exp && Date.now() >= state.exp.end) resolveExpedition();
  syncBgm();
}
function openSlotModal(mode) {
  const cards = [];
  for (let n = 1; n <= SLOT_COUNT; n++) {
    const m = slotMeta(n);
    cards.push(`
      <div class="slot-card ${m ? '' : 'empty'}" data-slot="${n}" data-has="${m ? 1 : 0}">
        <span class="sl-no">${n}</span>
        <div class="sl-body">${m
          ? `${m.shelter.emoji} ${LName(m.shelter)} — Day ${m.day} ${m.season.icon}<br><span class="sl-meta">${t('slot.meta', { succ: m.successes, saved: m.saved })}</span>`
          : t('slot.empty')}</div>
        ${m ? `<button class="sl-del" data-del="${n}" title="${t('slot.del.title')}">🗑</button>` : ''}
      </div>`);
  }
  openModal(mode === 'new' ? t('slot.new') : t('slot.load'), cards.join(''));
  $('modal-body').querySelectorAll('.sl-del').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    if (!confirm(t('slot.delConfirm', { n: b.dataset.del }))) return;
    localStorage.removeItem(slotKey(+b.dataset.del));
    openSlotModal(mode);
  }));
  $('modal-body').querySelectorAll('.slot-card').forEach(c => c.addEventListener('click', () => {
    const n = +c.dataset.slot, has = c.dataset.has === '1';
    if (mode === 'load') {
      if (!has) { toast(t('toast.emptySlot')); return; }
      localStorage.setItem('project-shelter-lastslot', String(n));
      sessionStorage.setItem('ps-load', '1'); // 리로드 후 타이틀 건너뛰고 바로 게임 (밀린 결산 표시)
      location.reload();
    } else {
      if (has && !confirm(t('slot.newConfirm', { n }))) return;
      const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
      fresh.savedAt = Date.now();
      fresh.helpSeen = true;
      localStorage.setItem(slotKey(n), JSON.stringify({ state: fresh, opts }));
      localStorage.setItem('project-shelter-lastslot', String(n));
      sessionStorage.setItem('ps-intro', '1');
      location.reload();
    }
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
  const [icon, label] = timeLabel();
  $('lcd-sub').textContent = `${icon} ${label} · ${WEATHERS[weather.type].icon}${state.injury ? ' · ' + INJURIES[state.injury.type].icon : ''}`;
}

function updateHud() {
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
    ` · <span title="${t('hud.succTip')}">🏆${state.successes}</span>`;
  renderGauge('g-hunger', state.hunger, '🥫');
  renderGauge('g-thirst', state.thirst, '💧');
  renderGauge('g-energy', state.energy, '⚡');
}
function renderGauge(id, val, emoji) {
  const g = $(id);
  if (!g) return;
  const fill = g.querySelector('.g-fill');
  fill.style.width = Math.max(0, Math.round(val)) + '%';
  fill.className = 'g-fill' + (val < 25 ? ' crit' : val < 45 ? ' warn' : '');
  g.querySelector('.g-label').textContent = `${emoji} ${Math.round(val)}${val <= 0 ? t('gauge.exhausted') : ''}`;
}
let lastResSnapshot = {};
function renderResBar() {
  const bar = $('res-chips');
  bar.innerHTML = Object.entries(RESOURCES).map(([id, r]) => {
    const n = state.res[id] || 0;
    const changed = lastResSnapshot[id] != null && lastResSnapshot[id] !== n;
    return `<div class="res-chip ${n === 0 ? 'zero' : ''} ${changed ? 'flash' : ''}" title="${LName(r)}">
      <span class="re">${r.emoji}</span><span class="rname">${LName(r)}</span><span class="rn">${n}</span>
    </div>`;
  }).join('');
  lastResSnapshot = { ...state.res };
}
function cleanShelter() {
  const c = state.cleanBy[state.current] ?? 70;
  if (c >= 100) { toast(t('clean.already')); return; }
  if (state.energy < 10) { toast(t('clean.tooTired')); return; }
  if (!resConsume('water', 1)) { toast(t('clean.needWater')); return; }
  state.energy = Math.max(0, state.energy - 5);
  if (state.energy < 20) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  state.cleanBy[state.current] = Math.min(100, c + 20);
  toast(t('clean.done', { n: Math.round(state.cleanBy[state.current]) }));
  state.dayLog.notes.push(t('clean.note'));
  scheduleSave();
  renderResBar();
  updateHud();
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
  // 첫 3일 튜토리얼: Day 2/3 아침에 다음 페이지를 표시 대기열에 넣는다 (day-report 뒤로 미룸)
  // tutDay>=1: Day 1 페이지(신규 게임)를 이미 본 경우에만 이어서 진행 — 구세이브는 tutDay 0 그대로라 대상 아님
  if ((state.day === 2 || state.day === 3) && state.tutDay >= 1 && state.tutDay < state.day) {
    state.pendingTutorial = state.day; // 이틀치가 한 번에 지나가면(오프라인 정산) 최신 페이지로 갱신
  }
  // 정든 집
  state.stayDays = (state.stayDays || 0) + 1;
  if (state.stayDays === 3) notes.push(t('settled.3'));
  if (state.stayDays === 8) notes.push(t('settled.8'));
  // 계절 전환
  if (seasonOf(state.day).id !== seasonOf(state.day - 1).id) {
    const se = seasonOf(state.day);
    notes.push(t('season.arrived', { icon: se.icon, name: LName(se), desc: LDesc(se) }));
    toast(t('season.changed', { icon: se.icon, name: LName(se) }));
    rollWeather(); // 새 계절의 날씨로
    if (se.id === 'winter') tipOnce('tip.winter'); // 찢어진 쪽지: 첫 겨울
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
  for (const it of items) {
    const def = DEFS[it.defId];
    const fuelId = def.light?.fuel || (def.appliance?.effect !== 'power' ? def.appliance?.fuel : null);
    if (!fuelId || it.on === false) continue;
    if (!consumeFuel(fuelId, 1)) {
      setItemPower(it, false);
      notes.push(t('day.fuelOut', { fuel: LName(RESOURCES[fuelId]), name: LName(def) }));
    }
  }
  // 3) 생산: 정수기 / 거처 특성 (온실 텃밭, 여객선 낚시)
  for (const it of items) {
    if (DEFS[it.defId].appliance?.effect === 'water' && it.on !== false) {
      resAdd('water', 1);
      notes.push(t('day.purifier'));
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
  // 4) 음식 부패: 가동 중인 냉장고가 없으면 매일 음식 -1
  const fridgeOn = items.some(it => DEFS[it.defId].appliance?.effect === 'fridge' && it.on !== false);
  if (!fridgeOn && (state.res.food || 0) > 0) {
    resConsume('food', 1);
    notes.push(t('day.foodSpoiled'));
  } else if (fridgeOn) {
    notes.push(t('day.foodFresh'));
  }
  // 청결도 일일 감소 + 거처별 현실 제약
  const sh = SHELTERS[state.current];
  const wBad = state.weatherType === 'rain' || state.weatherType === 'snow' || state.weatherType === 'storm';
  let dirt = 2;
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
  // 거처 개조 효과
  if (hasMod('raincatch') && wBad) { resAdd('water', 1); notes.push(t('day.raincatch')); }
  if (hasMod('garden') && state.day % 2 === 0) {
    if (seasonOf().id === 'winter') notes.push(t('day.gardenBoxFrozen'));
    else { resAdd('food', 1); notes.push(t('day.gardenBox')); }
  }
  if (hasMod('solar') && state.day % 2 === 1) { resAdd('battery', 1); notes.push(t('day.solar')); }
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
  // 부상 방치 → 감염 악화
  if (state.injury && INJURIES[state.injury.type].infect && Math.random() < INJURIES[state.injury.type].infect) {
    state.injury = { type: 'infection', untilMin: state.gameMin + INJURIES.infection.restH * 60 * recoveryMult() };
    notes.push(t('day.infectWorse'));
  }
  // 고양이의 하루 (입양 후 소소한 기록)
  if (state.cat && Math.random() < 0.22) {
    notes.push(t(['day.cat0', 'day.cat1', 'day.cat2', 'day.cat3'][Math.floor(Math.random() * 4)]));
  }
  // 특수 인카운터 ①: 야윈 고양이 — Day 100+, 하루 1% (아직 입양 전일 때만)
  if (!state.pendingEvent && !state.cat && state.day >= 100 && Math.random() < 0.01) {
    state.pendingEvent = 'cat';
    state.lastEventDay = state.day;
    state.catMusicDay = state.day; // 당첨된 날은 하루 종일 Cat OST
    notes.push(t('day.catHint'));
  }
  // 특수 인카운터 ②: 구조 — Day 10000 초과, 하루 5%
  if (!state.pendingEvent && state.day > 10000 && !state.endingSeen && Math.random() < 0.05) {
    state.pendingEvent = 'ending';
    state.lastEventDay = state.day;
  }
  // 랜덤 인카운터 (마지막 만남 후 2일 이상 지나면 45% 확률)
  if (!state.pendingEvent && (state.day - (state.lastEventDay || 0)) >= 2 && Math.random() < 0.45) {
    const pool = Object.entries(EVENTS).filter(([, e]) => !e.special && (!e.cond || e.cond()));
    if (pool.length) {
      state.pendingEvent = pool[Math.floor(Math.random() * pool.length)][0];
      state.lastEventDay = state.day;
    }
  }
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
  openModal(t('report.title', { day: state.day - 1 }), `
    <div class="report-sec"><span class="r-title">${t('report.gain')}</span><br>${Object.keys(log.gain).length ? fmt(log.gain) : t('none')}</div>
    <div class="report-sec"><span class="r-title">${t('report.spend')}</span><br>${Object.keys(log.spend).length ? fmt(log.spend) : t('none')}</div>
    ${log.notes.length ? `<div class="report-sec"><span class="r-title">${t('report.notes')}</span><br>${log.notes.join('<br>')}</div>` : ''}
    ${warns.length ? `<div class="report-sec report-warn">${t('report.warn', { list: warns.map(id => RESOURCES[id].emoji + LName(RESOURCES[id])).join(', ') })}</div>` : ''}
    <div class="report-sec">${forecast}</div>
    ${tips.length ? `<div class="report-sec report-tip">💡 ${tips.slice(0, 2).join('<br>💡 ')}</div>` : ''}
  `);
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
  if (b) b.textContent = p ? '▶' : '⏸';
}
let reportQueued = false;
function tickTime(dt) {
  state.gameMin += dt * GAME_MIN_PER_SEC;
  decayGauges(dt * GAME_MIN_PER_SEC);
  const newDay = Math.floor(state.gameMin / 1440) + 1;
  while (state.day < newDay) {
    state.day++;
    processDay();
    reportQueued = true;
  }
  if (reportQueued && !journalOpen && !$('modal-back').classList.contains('show')) {
    reportQueued = false;
    showDayReport();
    scheduleSave();
    renderResBar();
    renderExpPanel();
  } else if (state.pendingEvent && !reportQueued && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트를 닫은 다음에 인카운터 등장
    const ev = state.pendingEvent;
    state.pendingEvent = null;
    showEvent(ev);
  } else if (state.pendingTutorial && !reportQueued && !state.pendingEvent && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트/인카운터를 모두 닫은 다음에 튜토리얼 수첩 페이지 등장
    const day = state.pendingTutorial;
    state.pendingTutorial = null;
    showTutorialPage(day);
  }
  tickInjury();
}
function renderInventoryBar() {
  const bar = $('toolbar');
  bar.innerHTML = '';
  for (const [id, def] of Object.entries(DEFS)) {
    const cnt = state.inventory[id] || 0;
    const el = document.createElement('div');
    el.className = 'tool-item' + (cnt <= 0 ? ' empty' : '');
    el.innerHTML = `<span class="emoji">${def.emoji}</span><span>${LName(def)}</span><span class="cnt">${cnt}</span>`;
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
    const remainH = Math.max(0, (state.injury.untilMin - state.gameMin) / 60);
    const canCure = resHasAll(inj.cure);
    injuryHtml = `
      <div class="injury-card">
        ${t('injury.card', { icon: inj.icon, name: LName(inj), pen: Math.round(inj.pen * 100), time: inj.timeMult ? t('injury.card.time') : '', h: remainH.toFixed(1) })}
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
  if (state.exp) {
    const remain = state.exp.end - Date.now();
    if (remain <= 0) { resolveExpedition(); return; }
    const bar = $('exp-bar'), eta = $('exp-eta');
    const total = state.exp.dur || (REGIONS[state.exp.region].time * 1000);
    if (bar) {
      bar.style.width = `${100 * (1 - remain / total)}%`;
      eta.textContent = t('exp.timeLeft', { n: Math.ceil(remain / 1000) });
    } else renderExpPanel();
  } else if (state.injury) {
    const el = $('injury-eta');
    if (el) el.textContent = Math.max(0, (state.injury.untilMin - state.gameMin) / 60).toFixed(1);
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
      setItemPower(item, item.on === false);
      showSelPanel(item);
      scheduleSave();
      toast(item.on ? t('power.turnedOn', { name: LName(def) }) : t('power.turnedOff', { name: LName(def) }));
    });
  }
  selPanel.classList.add('show');
}
function hideSelPanel() { selPanel.classList.remove('show'); }

function openModal(title, html) {
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML = html;
  $('modal-back').classList.add('show');
}
function closeModal() { $('modal-back').classList.remove('show'); }
$('modal-close').addEventListener('click', closeModal);
$('modal-back').addEventListener('click', e => { if (e.target === $('modal-back')) closeModal(); });

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
        const parts = [];
        if (renov) parts.push(t('shelter.refitPart', { cost: costLabel(sh.moveCost || {}) || t('free') }));
        if (cross) parts.push(t('shelter.journeyPart'));
        costLine = parts.length ? `<div class="s-desc" style="color:var(--accent)">${t('shelter.moveCost', { parts: parts.join(' · ') })}</div>` : '';
        const ok = resHasAll(cost);
        btn = `<button class="pixel-btn" data-shelter="${id}" ${ok ? '' : 'disabled'} title="${ok ? '' : t('shelter.noCostNeed', { cost: costLabel(cost) })}">${renov ? t('shelter.moveRefit') : t('shelter.move')}</button>`;
      }
      return `
      <div class="shelter-card ${cur ? 'current' : ''} ${unlocked ? '' : 'locked'}">
        <div class="s-emoji">${unlocked ? sh.emoji : '🔒'}</div>
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
  openModal(t('shelter.modalTitle'), `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">
      ${t('shelter.intro')}
    </div>${groups}`);
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

// 종이 질감 배경을 붙인 오버레이(수첩 패널 / 쪽지)에 텍스처를 씌운다
function applyPaperBg(el) {
  el.style.backgroundImage = `url(${paperTextureURL()})`;
}

let journalKeyHandler = null;
let journalOpen = false; // 수첩이 떠 있는 동안 리포트/인카운터/다음 튜토리얼이 겹치지 않도록
function openJournalPages(pages, opts = {}) {
  if (!pages || !pages.length) return;
  let i = 0;
  const scr = $('journal-screen'), paper = $('journal-paper');
  const titleEl = $('journal-title'), bodyEl = $('journal-body'), indEl = $('journal-page-ind');
  const prevBtn = $('journal-prev'), nextBtn = $('journal-next');
  applyPaperBg(paper);
  paperSfx(opts);

  const render = () => {
    const p = pages[i];
    titleEl.innerHTML = p.titleId ? t(p.titleId) : '';
    bodyEl.innerHTML = p.bodyId ? t(p.bodyId) : '';
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

/* ── 찢어진 쪽지 (1회성 팁) ── */
const tipQueue = [];
let tipShowing = false;
let tipTimer = null;
function showTipNote(id) {
  const note = $('tip-note');
  applyPaperBg(note);
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
  scheduleSave();                                  // 마지막 상태 저장 후
  setTimeout(() => location.reload(), 500);        // 타이틀로
});

// 세이브 내보내기: 현재 슬롯의 원본 JSON을 파일로 다운로드
$('btn-save-exp').addEventListener('click', () => {
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
});

// 세이브 가져오기: 파일에서 읽어 검증 후 현재 슬롯에 덮어쓰기
$('btn-save-imp').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast(t('save.invalidFile')); return; }
      if (!data?.state || data.state.ver == null || data.state.day == null) { toast(t('save.invalidFile')); return; }
      if (!confirm(t('save.overwrite', { n: currentSlot }))) return;
      try {
        localStorage.setItem(slotKey(currentSlot), JSON.stringify(data));
        localStorage.setItem('project-shelter-lastslot', String(currentSlot));
      } catch (e) { toast(t('save.failed')); return; }
      location.reload();
    };
    reader.readAsText(file);
  });
  input.click();
});

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

// v2.4: 언어 전환 시 흰 화면 번쩍임 방지 — veil을 올리고 트랜지션이 끝난 뒤 재로딩한다.
function reloadWithVeil() {
  const veil = $('fade-veil');
  if (veil) {
    veil.style.transition = '';
    veil.style.pointerEvents = 'auto';
    veil.style.opacity = '1';
  }
  setTimeout(() => { sessionStorage.setItem('nw-veil', '1'); location.reload(); }, 300);
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
function applyOpts() {
  $('opt-pixel').value = opts.pixel; $('opt-quant').checked = opts.quant;
  $('opt-dither').checked = opts.dither; $('opt-ceil').checked = opts.ceil;
  $('opt-autoeat').checked = opts.autoEat !== false;
  $('opt-lang').value = opts.lang || 'ko';
  $('opt-fps').value = String(opts.fpsCap || 60);
  $('opt-lowspec').checked = !!opts.lowSpec;
  $('opt-bgidle').checked = opts.bgIdle !== false;
  postMat.uniforms.uQuant.value = opts.quant ? 1 : 0;
  postMat.uniforms.uDither.value = opts.dither ? 1 : 0;
  ceilLight.visible = opts.ceil;
  shadowDirty();
  makeRT();
  applyLowSpec();
}
$('opt-pixel').addEventListener('input', e => { opts.pixel = +e.target.value; applyOpts(); scheduleSave(); });
$('opt-quant').addEventListener('change', e => { opts.quant = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-dither').addEventListener('change', e => { opts.dither = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-ceil').addEventListener('change', e => { opts.ceil = e.target.checked; applyOpts(); scheduleSave(); });
$('opt-autoeat').addEventListener('change', e => { opts.autoEat = e.target.checked; scheduleSave(); });
$('opt-fps').addEventListener('change', e => { opts.fpsCap = +e.target.value || 60; scheduleSave(); });
$('opt-lowspec').addEventListener('change', e => { opts.lowSpec = e.target.checked; applyLowSpec(); scheduleSave(); });
$('opt-bgidle').addEventListener('change', e => {
  opts.bgIdle = e.target.checked;
  if (!opts.bgIdle && document.hidden) { bgm.pause(); setAmbience(null); setFire(false); }
  else if (opts.bgIdle && document.hidden) syncSfxAmbience();
  scheduleSave();
});
// 언어 전환: 저장 후 재로딩 (라이브 리렌더 대신 단순하게) — veil로 암전 후 전환
$('opt-lang').addEventListener('change', e => {
  const next = e.target.value === 'en' ? 'en' : 'ko';
  if (next === (opts.lang || 'ko')) return;
  if (!confirm(t('lang.confirm'))) { e.target.value = opts.lang || 'ko'; return; }
  opts.lang = next;
  flushSave();               // 즉시 저장 후
  reloadWithVeil();          // 재로딩하며 부팅 시 setLang(opts.lang) 적용
});

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
function playBgmTrack(name, ctx) {
  bgmTrack = name;
  bgm.loop = ctx.loop;
  bgm.volume = (opts.bgmVol ?? 0.15) * ctx.vol;
  bgm.src = `BGM/${name}.mp3`;
  if (opts.bgm) bgm.play().catch(() => { /* 사용자 제스처 대기 (자동재생 정책) */ });
}
function pickBgmTrack(ctx) {
  const cands = ctx.pool.filter(n => n !== bgmTrack);
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : ctx.pool[0];
}
function syncBgm(forcePlay = false) {
  const ctx = bgmContext();
  if (ctx.key !== bgmCtxKey) {
    bgmCtxKey = ctx.key;
    playBgmTrack(pickBgmTrack(ctx), ctx);
  } else {
    bgm.volume = (opts.bgmVol ?? 0.15) * ctx.vol; // 음량 슬라이더 즉시 반영
    if (forcePlay && opts.bgm && bgm.paused && bgm.src) bgm.play().catch(() => {});
  }
}
bgm.addEventListener('ended', () => { const ctx = bgmContext(); playBgmTrack(pickBgmTrack(ctx), ctx); });
// 셸터별 빗소리 앰비언스 (지역 재질감 반영) — storm은 셸터 무관 rain_heavy로 통일
const RAIN_AMB = {
  container: 'rain_roof', bunker: 'rain_roof', ship: 'rain_roof', lighthouse: 'rain_roof',
  rooftop: 'rain_city',
  cabin: 'rain_forest', greenhouse: 'rain_forest',
  bus: 'rain_road',
};
/* ── SFX 앰비언스/난로 상태 동기화 (날씨·실내·가구 상태 → 루프 채널) ── */
function syncSfxAmbience() {
  if (titleVisible || endingActive) { setAmbience(null); setFire(false); return; }
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  if (indoorSh) {
    setAmbience(null);
  } else if (weather.type === 'storm') {
    setAmbience('rain_heavy');
  } else if (weather.type === 'rain') {
    setAmbience(RAIN_AMB[state.current] || 'rain_roof');
  } else if (weather.type === 'snow') {
    setAmbience('amb_wind');
  } else if (weather.type === 'ash') {
    setAmbience('amb_wind'); // 재(灰) 날씨는 별도 루프가 없어 바람 앰비언스로 간이 처리
  } else {
    setAmbience(null);
  }
  const fireOn = items.some(it => ['stove', 'candle', 'lantern'].includes(it.defId) && it.on !== false);
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
loadSave();
setLang(opts.lang || 'ko');   // 세이브된 언어 적용 (기본 ko)
applyStaticI18n();             // index.html 정적 텍스트 치환
loadShelter(state.current);
renderInventoryBar();
renderResBar();
renderExpPanel();
applyOpts();
updateHud();
updateClock();
$('btn-clean').addEventListener('click', cleanShelter);
$('btn-pause').addEventListener('click', () => setPaused(!paused));
$('btn-craft').addEventListener('click', openCraftModal);
$('btn-journal').addEventListener('click', openJournalModal);
$('g-hunger').addEventListener('click', eatFood);
$('g-thirst').addEventListener('click', drinkWater);
$('g-energy').addEventListener('click', () => sleepUntilMorning());
$('btn-sleep').addEventListener('click', () => sleepUntilMorning());
$('btn-cancel-place').addEventListener('click', () => cancelPlacing());
// 온스크린 카메라 컨트롤 (모바일/데스크톱 공용)
$('cam-rotl').addEventListener('click', () => { camState.targetYaw -= Math.PI / 4; });
$('cam-rotr').addEventListener('click', () => { camState.targetYaw += Math.PI / 4; });
$('cam-zin').addEventListener('click', () => { camState.zoom = THREE.MathUtils.clamp(camState.zoom * 1.25, 0.25, 3.2); });
$('cam-zout').addEventListener('click', () => { camState.zoom = THREE.MathUtils.clamp(camState.zoom * 0.8, 0.25, 3.2); });
$('cam-home').addEventListener('click', () => { camState.targetYaw = Math.PI / 4; fitZoomForShelter(); });
// 패널 드래그/접기 활성화
makeDraggablePanel($('hud'), 'hud', t('panel.hud'));
makeDraggablePanel($('exp-panel'), 'exp', t('panel.exp'));
makeDraggablePanel($('render-panel'), 'render', t('panel.render'));
makeDraggablePanel($('clock-panel'), 'clock', t('panel.clock'));
makeDraggablePanel($('res-bar'), 'res', t('panel.res'));
// v2.4: PC는 설정 패널을 기본 숨김 — ESC로 토글 (게임 문법). 터치 기기는 항상 표시(현행 유지).
// display만 제어하므로 $('opt-...') 접근/이벤트는 숨겨진 상태에서도 정상 동작한다.
if (isPcInput) $('render-panel').style.display = 'none';

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
const UI_BASE_FONT = 11;   // .panel 계열 기본 폰트 크기(px) — 이 값 자체가 이미 최소 가독 크기
const UI_MIN_FONT = 11;    // 스케일 후에도 유지해야 할 최소 렌더 폰트(px)
function updateUiScale() {
  let s = Math.min(innerWidth / 1400, innerHeight / 860);
  s = THREE.MathUtils.clamp(s, 0.85, 2.1);
  // 스케일 후 기준 폰트(11px)가 최소 가독 크기(11px) 밑으로 내려가지 않게 보정
  const minScale = UI_MIN_FONT / UI_BASE_FONT; // = 1.0
  if (s < minScale) s = minScale;
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
function renderFrame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  if (!titleVisible && !paused && !endingActive) tickTime(dt); // 타이틀·일시정지·엔딩 중엔 시간 정지
  else if (state.exp) state.exp.end += dt * 1000; // 탐험 실시간 타이머도 함께 멈춘다
  applyTimeLighting();
  updateCamera();
  updateWallCulling();
  updateEnvironment(t, dt);
  updateWeather(dt, t);
  updateCat(t, dt);
  for (const it of items) {
    if (it.lightObj && it.on !== false && DEFS[it.defId].light?.flicker) {
      it.lightObj.intensity = it.lightBase * (0.8 + 0.25 * Math.sin(t * 11) * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 23));
    }
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopHiddenTimer();
    hiddenTimer = setInterval(logicTick, 1000);
    if (!opts.bgIdle) { bgm.pause(); setAmbience(null); setFire(false); }
  } else {
    stopHiddenTimer();
    clock.getDelta(); // 숨김 동안 쌓인 델타를 한 번 버려 rAF 복귀 시 이중 진행 방지
    if (!opts.bgIdle) syncSfxAmbience(); // 백그라운드 소리 껐던 경우 복귀 시 재개
  }
});
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

// 디버그/테스트용 핸들
window.__shelter = {
  items, DEFS, SHELTERS, REGIONS, RESOURCES, INJURIES, PREPS, DISTRICTS, districtOf, moveCostFor, state, opts, camState, weather,
  addItem, removeItem, loadShelter, moveToShelter, setItemPower,
  startExpedition, departExpedition, resolveExpedition, setWeather, rateParts,
  comfortDetail, comfortExpBonus, applyInjury, treatInjury, processDay, showDayReport, cleanShelter,
  seasonOf, SEASONS, openMapModal, eatFood, drinkWater, EVENTS, showEvent, SHELTER_MODS, hasMod, openCraftModal,
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
  cat: () => catObj,
  camera, THREE, CAT_POSES,
};
