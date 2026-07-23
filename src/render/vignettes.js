/* ============================================================
   render/vignettes.js — 시네마틱 비네트 (game.js 모놀리스 분해 Tier 5·6a)
   ------------------------------------------------------------
   playVignette 러너(독립 원근 씬 풀스크린 오버레이) + 4대 컷:
   가이거(낙진 소문) · 국경 개통(eastgate) · 「콘크리트 정글의 해」(발코니) · 「불타는 해협」(금문교)
   + 발견 컷(#150 디오라마 — DEFS 빌더 직결이라 데이터만 물고 이관, Tier6a).
   무너진 입구 러너는 game.js 잔류(이벤트 시스템 결합: EVENTS·choices.run·collapseLootFx·카드 폴백) —
   vignetteActive 플래그만 공유(claim/release). 발견 큐(queue/drain)도 게이트 로직이라 game.js 소유.
   게임 측 헬퍼(addMoodBuff·jackpotToast·scheduleSave·gameHour·disposeDeep)는 initVignettes로 주입
   (setExpeditionWeather 선례 — 단방향, 모듈은 game.js를 모른다).
   ============================================================ */
import * as THREE from 'three';
import { seededRand } from '../lib/helpers.js';
import { state } from '../core/state.js';
import { BAL } from '../data/balance.js';
import { DEFS } from '../data/furniture.js';
import { playSfx } from '../sfx.js';
import { t } from '../i18n.js';

let addMoodBuff, jackpotToast, scheduleSave, gameHour, disposeDeep;
export function initVignettes(h) { ({ addMoodBuff, jackpotToast, scheduleSave, gameHour, disposeDeep } = h); }
/* ── 비네트 러너 (승인 스펙 2026-07-09): 독립 원근 씬 풀스크린 오버레이 — t 0→1 애니메이션, 탭 스킵 ──
   게임 씬과 완전 분리(자체 renderer/scene/camera) — 직교 카메라 제약 무관, sim 무접점(연출 전용). */
let vignetteActive = false;
export function playVignette(build, durMs, onDone) {
  if (vignetteActive) return; vignetteActive = true;
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:400;background:#000;opacity:0;transition:opacity .6s';
  const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:100%;filter:contrast(1.15) saturate(1.16)'; ov.appendChild(cv);
  const vf = document.createElement('div'); // 시네마틱 비네트 프레임 (모서리 감광)
  vf.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 46%, transparent 52%, rgba(10,4,2,0.6) 100%)';
  ov.appendChild(vf); document.body.appendChild(ov);
  const vr = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  const v = build();
  const fit = () => { vr.setSize(innerWidth, innerHeight, false); v.camera.aspect = innerWidth / innerHeight; v.camera.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);
  requestAnimationFrame(() => { ov.style.opacity = '1'; });
  const t0 = performance.now(); let done = false;
  const finish = () => {
    if (done) return; done = true;
    removeEventListener('resize', fit);
    ov.style.opacity = '0';
    setTimeout(() => { ov.remove(); vr.dispose(); disposeDeep(v.scene); vignetteActive = false; if (onDone) onDone(); }, 650);
  };
  ov.addEventListener('pointerdown', finish); // 탭 = 스킵/종료
  (function loop() {
    if (done) return;
    const t = Math.min(1, (performance.now() - t0) / durMs);
    v.update(t); vr.render(v.scene, v.camera);
    if (t >= 1) { setTimeout(finish, 1100); return; } // 마지막 프레임을 잠시 머금고 닫는다
    requestAnimationFrame(loop);
  })();
}

/* ── 2.0-(b) 가이거 계수기 비네트 (디렉터 2026-07-17): 동쪽 소문의 물증 ──
   낙진이 걷혀 국경이 열릴 수 있게 됐다는 걸 "계수기 바늘이 빨강에서 초록으로 내려앉는" 8초로 보여준다.
   초반: 바늘 떨림·수치 점멸·경고 LED. 후반: 바늘 안착·초록 LED·배경에 동쪽 길과 게이트 실루엣이 떠오른다.
   playVignette 러너 재사용(탭=스킵). 트리거: eastRoadRumor 아침 → geigerPending → drainDiscoveryQueue. */
export function playGeigerVignette() {
  playVignette(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0b0e);
    scene.fog = new THREE.Fog(0x0a0b0e, 7, 16);
    const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 60);
    scene.add(new THREE.AmbientLight(0x9aa2b0, 0.7));
    const key = new THREE.DirectionalLight(0xcfd8e8, 0.9); key.position.set(-2, 4, 3); scene.add(key);
    const warm = new THREE.PointLight(0xffc98a, 1.0, 6, 1.8); warm.position.set(0.8, 1.6, 1.6); scene.add(warm);
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const dev = new THREE.Group(); dev.position.y = 1.05; scene.add(dev);
    const bx2 = (w, h, d, c, x, y, z, g = dev) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
    // 몸체 — 낡은 올리브 계측기 + 전면 패널 + 스피커 슬릿 + 노브
    bx2(1.0, 1.42, 0.24, 0x4c4a3a, 0, 0, 0);
    bx2(1.04, 0.06, 0.26, 0x3a382e, 0, 0.72, 0); bx2(1.04, 0.06, 0.26, 0x3a382e, 0, -0.72, 0);
    bx2(0.9, 1.28, 0.03, 0x35332b, 0, 0, 0.125);
    for (let i = 0; i < 4; i++) bx2(0.3, 0.025, 0.035, 0x22201b, -0.24, -0.36 - i * 0.07, 0.13);   // 스피커 슬릿
    const kn1 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), M(0x2c2a24)); kn1.rotation.x = Math.PI / 2; kn1.position.set(0.26, -0.42, 0.15); dev.add(kn1);
    const kn2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), M(0x2c2a24)); kn2.rotation.x = Math.PI / 2; kn2.position.set(0.26, -0.58, 0.15); dev.add(kn2);
    // 다이얼 — 크림판 + 존 눈금(초록→호박→빨강) + 바늘(피벗)
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.36, 28), new THREE.MeshLambertMaterial({ color: 0xe8e2d0 }));
    dial.position.set(0, 0.3, 0.145); dev.add(dial);
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.85 - (i / 12) * Math.PI * 0.7;                       // 좌(초록) → 우(빨강)
      const zone = i < 5 ? 0x5a8a5a : i < 9 ? 0xb08a3a : 0xa8433f;
      const tk = bx2(0.02, i % 3 === 0 ? 0.08 : 0.05, 0.012, zone, Math.cos(a) * 0.3, 0.3 + Math.sin(a) * 0.3, 0.15);
      tk.rotation.z = a - Math.PI / 2;
    }
    const pivot = new THREE.Group(); pivot.position.set(0, 0.3, 0.155); dev.add(pivot);
    const needle = bx2(0.022, 0.3, 0.012, 0x8a2c28, 0, 0.15, 0, pivot);
    bx2(0.06, 0.06, 0.02, 0x2c2a24, 0, 0.3, 0.158);                              // 바늘 축 캡
    // LED 2점 + 수치창(캔버스 스프라이트)
    const ledR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), new THREE.MeshLambertMaterial({ color: 0xa8433f, emissive: 0xff3020, emissiveIntensity: 0 }));
    ledR.position.set(-0.32, 0.66, 0.14); dev.add(ledR);
    const ledG = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), new THREE.MeshLambertMaterial({ color: 0x3a5a3a, emissive: 0x40ff60, emissiveIntensity: 0 }));
    ledG.position.set(0.32, 0.66, 0.14); dev.add(ledG);
    const rc = document.createElement('canvas'); rc.width = 256; rc.height = 80;
    const rg = rc.getContext('2d');
    const rTex = new THREE.CanvasTexture(rc);
    const readout = new THREE.Sprite(new THREE.SpriteMaterial({ map: rTex, transparent: true, depthWrite: false }));
    readout.scale.set(0.66, 0.2, 1); readout.position.set(0, -0.12, 0.2); dev.add(readout);
    // 배경 — 동쪽 길 + 게이트 실루엣 (후반 페이드 인: "이제 갈 수 있다")
    // 기둥 ±2.3: 계측기(화면 중앙 ~36%폭)에 가리지 않고 양옆으로 아치가 서도록. 길은 바닥에 눕혀 소실점 원근.
    const sil = new THREE.Group(); sil.position.set(0, 0, -5.5); scene.add(sil);
    const silMat = new THREE.MeshBasicMaterial({ color: 0x3e4a63, transparent: true, opacity: 0 }); // 글로우 없이도 흑배경 위에서 읽히는 슬레이트
    const road = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 9), silMat);
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 4.0); sil.add(road);
    for (let i = 0; i < 4; i++) { const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.6), silMat); dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, 0.6 + i * 1.6); sil.add(dash); }
    for (const gx of [-2.3, 2.3]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.1, 0.34), silMat); post.position.set(gx, 1.55, 0); sil.add(post); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.28, 0.34), silMat); beam.position.set(0, 3.15, 0); sil.add(beam);
    const gc = document.createElement('canvas'); gc.width = gc.height = 128;              // 소프트 웜 글로우(하드엣지 사각 금지)
    const gg2 = gc.getContext('2d');
    const grd = gg2.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(255,176,112,0.85)'); grd.addColorStop(0.55, 'rgba(255,176,112,0.28)'); grd.addColorStop(1, 'rgba(255,176,112,0)');
    gg2.fillStyle = grd; gg2.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(10, 5.2, 1); glow.position.set(0, 1.5, -6.2); scene.add(glow);
    const drawReadout = (v) => {
      rg.fillStyle = '#0e120e'; rg.fillRect(0, 0, 256, 80);
      rg.strokeStyle = '#2a2e2a'; rg.strokeRect(3, 3, 250, 74);
      rg.font = 'bold 44px monospace'; rg.textAlign = 'center'; rg.textBaseline = 'middle';
      rg.fillStyle = v > 1.2 ? '#ff5a40' : v > 0.5 ? '#e0a840' : '#6ae080';
      rg.fillText(v.toFixed(2) + ' µSv/h', 128, 42);
      rTex.needsUpdate = true;
    };
    const update = (t) => {
      const now = performance.now();
      // 수치: 3.42 → 0.34 (초반 점멸·요동, 후반 안착)
      const ease = 1 - Math.pow(1 - t, 2.2);
      const jitterAmp = Math.max(0, 1 - t * 1.35);
      const v = Math.max(0.34, 3.42 - 3.08 * ease + Math.sin(now * 0.021) * 0.32 * jitterAmp + Math.sin(now * 0.007) * 0.18 * jitterAmp);
      drawReadout(v);
      // 바늘: 우(빨강 -0.95) → 좌(초록 +0.95), 같은 요동 계수 공유
      pivot.rotation.z = -0.95 + 1.9 * ease + Math.sin(now * 0.019) * 0.16 * jitterAmp;
      // LED: 경고 점멸 → 초록 상시
      ledR.material.emissiveIntensity = v > 0.9 ? (Math.sin(now * 0.012) > 0 ? 1.6 : 0.1) : 0;
      ledG.material.emissiveIntensity = v < 0.5 ? 1.4 : 0;
      // 배경 실루엣 — 바늘이 안착할 무렵 떠오른다
      const so = Math.max(0, (t - 0.62) / 0.3);
      silMat.opacity = Math.min(0.9, so);
      glow.material.opacity = Math.min(0.55, so * 0.55);
      // 카메라 — 미세 푸시인 + 손떨림
      camera.position.set(0.22 + Math.sin(now * 0.0008) * 0.04, 1.28, 2.35 - t * 0.35);
      camera.lookAt(0, 1.12, 0);
      dev.rotation.y = Math.sin(now * 0.0006) * 0.05;
    };
    return { scene, camera, update };
  }, 8200);
}

/* ── 2.0-(b) 국경 개통 비네트 (디렉터 확정: 인엔진): 「국경 길」 완공의 순간 ──
   동부 아트 디렉션(붉은 노을 팔레트) 첫 착지: 검문소 부스 창에 불이 들어오고, 줄무늬 차단기가 올라가고,
   내가 건 가로등이 순서대로 켜지고, 노을 지평선 끝 항구 크레인 실루엣을 향해 카메라가 나아간다.
   신규 문자열 0 — 문안은 proj.eastgate.doneToast/memoir가 담당. 트리거: east.gateOpen → eastGatePending → drain. */
export function playEastGateVignette() {
  playVignette(() => {
    const scene = new THREE.Scene();
    // 하늘 — 세로 그라디언트(심홍 → 주황 지평선), 동부 팔레트 정본
    const skc = document.createElement('canvas'); skc.width = 8; skc.height = 256;
    const skg = skc.getContext('2d'); const skr = skg.createLinearGradient(0, 0, 0, 256);
    skr.addColorStop(0, '#150609'); skr.addColorStop(0.42, '#521c11'); skr.addColorStop(0.74, '#9c3f1a'); skr.addColorStop(1, '#d97b32');
    skg.fillStyle = skr; skg.fillRect(0, 0, 8, 256);
    const skTex = new THREE.CanvasTexture(skc); skTex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(96, 28), new THREE.MeshBasicMaterial({ map: skTex, fog: false, depthWrite: false }));
    sky.position.set(0, 9, -33); scene.add(sky);
    scene.fog = new THREE.Fog(0x341410, 9, 32);
    scene.add(new THREE.AmbientLight(0xb06a48, 0.5));
    const sun = new THREE.DirectionalLight(0xff9a58, 0.85); sun.position.set(2, 3.5, -8); scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8a5a40, 0.38); fill.position.set(0, 3, 8); scene.add(fill); // 정면 필 — 차단기 줄무늬·전경 잔해가 실루엣에 먹히지 않게
    const M = c => new THREE.MeshLambertMaterial({ color: c });
    const bx3 = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
    // 넝쿨 헬퍼 — 매달린 덩굴 복셀 사슬 (디렉터 레퍼런스 2026-07-17: 3년 자란 국경 — 차단기·갠트리·부스가 초록에 먹힌다)
    const vine = (g, x, y, z, len, seed = 0) => {
      const vg = new THREE.Group(); vg.position.set(x, y, z); g.add(vg);
      for (let i = 0; i < len; i++) {
        const s = 0.055 + ((seed + i * 7) % 3) * 0.012;
        bx3(vg, s, 0.09, s, i % 3 === 2 ? 0x2a3418 : 0x1c2610, Math.sin(seed + i * 1.7) * 0.05, -i * 0.085, Math.cos(seed * 2 + i) * 0.04);
      }
      return vg;
    };
    // 지면 + 동쪽으로 달아나는 길(중앙 대시) + 균열 잡초 + 길가 잔해 방벽 + 노면 태양 반사
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), M(0x2b1a16)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 44), M(0x211a19)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, -14); scene.add(road);
    for (let i = 0; i < 9; i++) { const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.7), M(0x6a5240)); dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.02, -2 - i * 2.6); scene.add(dash); }
    for (let i = 0; i < 26; i++) {                                                          // 균열을 뚫은 잡초 무더기
      const wx = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 1.7), wz = -1 - Math.random() * 20;
      bx3(scene, 0.1 + Math.random() * 0.15, 0.1 + Math.random() * 0.24, 0.12, Math.random() < 0.4 ? 0x24300f : 0x1a230c, wx, 0.08, wz);
    }
    for (const [bxp, bzp, bw2] of [[-3.0, -3, 2.2], [-3.3, -7.5, 3.0], [-2.9, -13, 2.4], [3.2, -9, 2.6], [3.4, -14.5, 3.2], [-3.1, -19, 2.8]]) {
      bx3(scene, bw2, 0.6 + Math.random() * 0.5, 0.5, 0x2e211c, bxp, 0.32, bzp).rotation.y = (Math.random() - 0.5) * 0.3; // 콘크리트 방벽 잔해
      if (Math.random() < 0.7) bx3(scene, 0.5, 0.3, 0.3, 0x1c2610, bxp + 0.5, 0.75, bzp);   // 방벽 위 수풀
    }
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 30), new THREE.MeshBasicMaterial({ color: 0xff8a40, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false }));
    streak.rotation.x = -Math.PI / 2; streak.position.set(0.5, 0.03, -14); scene.add(streak); // 젖은 균열 노면에 해가 눕는다
    // 검문소 부스(우측) — 깨진 유리 갈아 끼운 창(stage2 서사)에 불이 들어온다
    const booth = new THREE.Group(); booth.position.set(2.7, 0, -5.6); scene.add(booth);
    bx3(booth, 1.5, 2.1, 1.4, 0x4a3a34, 0, 1.05, 0);
    bx3(booth, 1.7, 0.14, 1.6, 0x352a26, 0, 2.17, 0);                                     // 지붕 슬래브
    for (let i = 0; i < 5; i++) bx3(booth, 0.3 + Math.random() * 0.34, 0.14 + Math.random() * 0.14, 0.3 + Math.random() * 0.34,
      i % 2 ? 0x243012 : 0x1a250e, -0.6 + Math.random() * 1.2, 2.32, -0.5 + Math.random()); // 지붕 수풀(3년 잠식)
    vine(booth, -0.84, 2.2, 0.3, 6, 1); vine(booth, -0.1, 2.22, -0.72, 8, 4);              // 처마 넝쿨
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0 });
    const winPane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), winMat);
    winPane.position.set(-0.76, 1.35, 0); winPane.rotation.y = -Math.PI / 2; booth.add(winPane);
    const winGlow = new THREE.PointLight(0xffc98a, 0, 6, 1.8); winGlow.position.set(-1.1, 1.4, 0); booth.add(winGlow);
    const winSpill = new THREE.PointLight(0xffb070, 0, 5, 1.8); winSpill.position.set(-1.5, 1.1, 1.2); booth.add(winSpill); // 창빛이 부스 벽·노면에 번진다 — 창만 떠 보이는 것 방지
    // 차단기 — 지주(부스 옆) + 줄무늬 팔(길 가로지름), 피벗 상승
    const post = new THREE.Group(); post.position.set(2.0, 0, -4.6); scene.add(post);
    bx3(post, 0.3, 1.15, 0.3, 0x5a5048, 0, 0.575, 0);
    const armPivot = new THREE.Group(); armPivot.position.set(0, 1.02, 0); post.add(armPivot);
    for (let i = 0; i < 7; i++) bx3(armPivot, 0.6, 0.12, 0.1, i % 2 ? 0xd8d0c2 : 0xb0402e, -0.3 - i * 0.6, 0, 0); // 빨강/흰 줄무늬
    bx3(armPivot, 0.1, 0.1, 0.12, 0xd8d0c2, -4.25, 0, 0);                                  // 팔 끝 캡
    const armVines = [[-1.1, 5], [-2.3, 7], [-3.4, 5], [-4.1, 8]].map(([vx, vl]) => vine(armPivot, vx, -0.06, 0, vl, vx * 3)); // 팔에 매달린 덩굴 — 상승 시 수직 유지(update에서 역회전)
    // 가로등 2기(stage3 "등을 걸고") — 순차 점등
    const lamps = [];
    for (const lz of [-9, -15]) {
      const lg = new THREE.Group(); lg.position.set(-2.0, 0, lz); scene.add(lg);
      bx3(lg, 0.14, 3.0, 0.14, 0x3a332e, 0, 1.5, 0);
      bx3(lg, 0.7, 0.1, 0.14, 0x3a332e, 0.3, 2.98, 0);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: 0x2c2824, emissive: 0xffcf9a, emissiveIntensity: 0 }));
      head.position.set(0.62, 2.92, 0); lg.add(head);
      const pl = new THREE.PointLight(0xffcf9a, 0, 7, 1.7); pl.position.set(0.62, 2.7, 0); lg.add(pl);
      lamps.push({ head, pl });
    }
    // 폐허 스카이라인 3겹 (디렉터 레퍼런스 2026-07-17: 빽빽한 피폭 도심) — 대기 원근:
    //   원경=노을 헤이즈 톤 밀집 스트립 · 중경=철골 뼈대 타워(코너 기둥+슬래브+철근) · 근경=근흑 플랭크.
    //   태양 코어 자리만 비워 "마천루 협곡 사이로 지는 해" 구도를 만든다.
    // 폐건물 실루엣 텍스처 — "네모 복셀" 탈피(디렉터 2026-07-17): 창 구멍으로 하늘이 새고,
    //   지붕선은 붕괴로 들쭉날쭉, 안테나·급수탱크·측면 붕괴 바이트. 역광 폐허의 실체는 '구멍'이다.
    const towerTexCache = {};
    const towerTex = (col, seed) => {
      const key = col + '_' + seed;
      if (towerTexCache[key]) return towerTexCache[key];
      const c = document.createElement('canvas'); c.width = 96; c.height = 256;
      const g2 = c.getContext('2d');
      const rnd = (() => { let s = seed * 2654435761 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
      g2.fillStyle = '#' + col.toString(16).padStart(6, '0');
      // 몸체 — 상단 붕괴 계단(컬럼별 높이 차) + 측면 바이트
      const topBase = 12 + rnd() * 30;
      const cols = 6, cw2 = 96 / cols;
      for (let ci = 0; ci < cols; ci++) {
        const ty = topBase + (rnd() < 0.4 ? rnd() * 46 : rnd() * 12);
        g2.fillRect(ci * cw2, ty, cw2 + 1, 256 - ty);
      }
      if (rnd() < 0.6) g2.clearRect(rnd() < 0.5 ? 0 : 72, 40 + rnd() * 60, 24, 30 + rnd() * 40); // 측면 붕괴 바이트
      // 창 구멍 그리드 — 하늘이 뚫고 보인다. 층·열마다 일부는 막혀 있고(생존 창), 일부는 크게 무너짐.
      for (let wy = topBase + 18; wy < 240; wy += 14) {
        for (let wx = 7; wx < 88; wx += 13) {
          const r = rnd();
          if (r < 0.42) g2.clearRect(wx, wy, 7, 8);                 // 뚫린 창
          else if (r < 0.5) g2.clearRect(wx - 1, wy - 1, 11, 11);   // 크게 무너진 개구부
        }
      }
      // 옥상 디테일 — 안테나 / 급수탱크 / 물탱크 다리
      const rx0 = 14 + rnd() * 56;
      if (rnd() < 0.7) g2.fillRect(rx0, topBase - 22, 2.5, 24);                              // 안테나
      if (rnd() < 0.5) { g2.fillRect(rx0 + 14, topBase - 9, 14, 10); g2.fillRect(rx0 + 16, topBase, 2, 4); g2.fillRect(rx0 + 24, topBase, 2, 4); } // 급수탱크
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      return (towerTexCache[key] = tex);
    };
    const towerPlane = (x, z, w, h, col, seed) => {
      const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: towerTex(col, seed), transparent: true, fog: false, side: THREE.DoubleSide }));
      mm.position.set(x, h / 2, z); scene.add(mm); return mm;
    };
    const ruinFrame = (x, z, w, h, c) => {                                                  // 철골 뼈대 타워 (+대각 브레이싱·기운 슬래브)
      const rg = new THREE.Group(); rg.position.set(x, 0, z); scene.add(rg);
      const fm = new THREE.MeshBasicMaterial({ color: c, fog: false });
      const bb = (bw, bh, bd, px, py, pz, rz) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), fm); mm.position.set(px, py, pz); if (rz) mm.rotation.z = rz; rg.add(mm); return mm; };
      for (const [cx2, cz2] of [[-w / 2, -w / 2], [w / 2, -w / 2], [-w / 2, w / 2], [w / 2, w / 2]]) bb(w * 0.14, h, w * 0.14, cx2, h / 2, cz2);
      const floors = 3 + Math.floor(Math.random() * 3);
      for (let f = 1; f <= floors; f++) if (Math.random() < 0.8)
        bb(w * 1.06, h * 0.045, w * 1.06, 0, h * f / (floors + 0.5), 0, Math.random() < 0.3 ? (Math.random() - 0.5) * 0.16 : 0); // 일부 슬래브는 내려앉아 기움
      bb(w * 0.09, h * 0.5, w * 0.09, 0, h * 0.55, w / 2, Math.random() < 0.5 ? 0.62 : -0.62); // 전면 대각 브레이싱
      if (Math.random() < 0.6) bb(w * 0.09, h * 0.34, w * 0.09, -w / 2, h * 0.3, w / 2, 0.55);
      if (Math.random() < 0.7) bb(w * 0.1, h * 0.32, w * 0.1, (Math.random() - 0.5) * w, h + h * 0.12, 0); // 삐친 철근
    };
    // 원경 — 실루엣 텍스처 스카이라인 2열(밀집·파랄락스). 헤이즈 톤.
    for (let i = 0; i < 14; i++) {
      const fx = -24 + i * 3.6 + Math.random() * 1.6;
      if (Math.abs(fx - 1.5) < 2.6) continue;                                               // 협곡 사이 해 자리
      towerPlane(fx, -31 + Math.random() * 1.5, 2.2 + Math.random() * 1.8, 3.5 + Math.random() * 5.5, 0x572618, 10 + i);
    }
    for (let i = 0; i < 10; i++) {                                                          // 뒷열(더 흐리고 낮게)
      const fx = -26 + i * 5.4 + Math.random() * 2;
      if (Math.abs(fx - 1.5) < 3) continue;
      towerPlane(fx, -34, 3 + Math.random() * 2, 2.6 + Math.random() * 3.4, 0x6e3620, 30 + i);
    }
    const farMat = new THREE.MeshBasicMaterial({ color: 0x572618, fog: false });            // 크레인용 헤이즈 톤
    for (const kx of [-8.5, 9.5]) {                                                         // 항만 크레인(부산형 시그니처) — 원경 소속
      const kr = new THREE.Group(); kr.position.set(kx, 0, -30); scene.add(kr);
      const kb = (w2, h2, x2, y2) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, 0.5), farMat); mm.position.set(x2, y2, 0); kr.add(mm); };
      kb(0.32, 5.2, 0, 2.6); kb(3.4, 0.26, 1.2, 5.1); kb(0.14, 1.5, 2.6, 4.3); kb(0.9, 0.5, 2.6, 3.4);
    }
    // 중경 — 뼈대 협곡: 실루엣 타워(창 구멍)와 3D 철골 프레임을 섞는다(단조 탈피 + 파랄락스 입체감)
    [[-8, -24, 2.6, 7.5, 1], [-4.8, -22, 2.0, 5.5, 0], [-11.5, -21, 3.0, 6.2, 1], [5.5, -23, 2.4, 8.2, 1],
     [9.5, -21.5, 2.8, 6.0, 0], [13, -24, 2.2, 7.0, 1], [-6.5, -18, 1.8, 4.2, 0], [7.2, -17.5, 2.0, 4.8, 1]]
      .forEach(([mx, mz, mw, mh, plane], mi) => {
        if (plane) towerPlane(mx, mz, mw * 1.25, mh, 0x2a1210, 50 + mi);
        else ruinFrame(mx, mz, mw, mh, 0x2a1210);
      });
    // 근경 — 뼈대 폐허(틈으로 하늘이 샌다: 검은 덩어리 금지) + 낮은 잔해 기단
    for (const [nx, nz, nw, nh] of [[-6.5, -12, 3.2, 4.6], [-9.4, -14, 3.0, 6.4], [6.9, -13, 3.0, 5.2], [10, -15, 3.4, 7.0]]) {
      ruinFrame(nx, nz, nw, nh, 0x150a0a);
      bx3(scene, nw * 1.1, 0.8, 2.0, 0x1a0e0c, nx, 0.4, nz + 0.6);                          // 붕괴 기단
      if (Math.random() < 0.8) bx3(scene, nw * 0.4, 0.4, 0.5, 0x18220f, nx + 0.4, 1.0, nz + 1.2); // 기단 수풀
    }
    // 게이트 갠트리 열 — 검문 아치가 도로를 따라 후퇴(레퍼런스: 열 지은 문). 한 열은 보가 끊겨 매달렸다.
    [[-9, true], [-13, false], [-17, true], [-21, true]].forEach(([gz, intact], gi) => {
      for (const gx of [-2.5, 2.5]) bx3(scene, 0.3, 3.7, 0.3, 0x2c1c16, gx, 1.85, gz);
      if (intact) bx3(scene, 5.3, 0.24, 0.3, 0x2c1c16, 0, 3.8, gz);
      else {
        bx3(scene, 1.6, 0.24, 0.3, 0x2c1c16, -1.8, 3.8, gz);                                // 좌측 스텁
        bx3(scene, 0.24, 2.0, 0.3, 0x2c1c16, 2.35, 2.8, gz).rotation.z = 0.18;              // 우측 — 부러져 늘어진 토막
      }
      vine(scene, -2.5 + gi * 0.3, 3.65, gz, 5 + (gi % 3) * 2, gi * 2);
      vine(scene, 2.2 - gi * 0.2, 3.6, gz, 4 + ((gi + 1) % 3) * 2, gi * 3 + 1);
    });
    // 태양 글로우(라디얼 스프라이트) — 지평선 위, 후반 부풀어 오른다
    const gc2 = document.createElement('canvas'); gc2.width = gc2.height = 128;
    const gg3 = gc2.getContext('2d'); const grd2 = gg3.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd2.addColorStop(0, 'rgba(255,170,90,0.95)'); grd2.addColorStop(0.5, 'rgba(255,130,60,0.35)'); grd2.addColorStop(1, 'rgba(255,130,60,0)');
    gg3.fillStyle = grd2; gg3.fillRect(0, 0, 128, 128);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc2), transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sunGlow.scale.set(18, 10, 1); sunGlow.position.set(1.5, 2.4, -28); scene.add(sunGlow);
    const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlow.material.map, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sunCore.scale.set(3.8, 3.4, 1); sunCore.position.set(1.5, 1.2, -29.5); scene.add(sunCore); // 지평선에 낮게 걸린 해 — 협곡 사이
    // 부유 먼지(노을 역광 모트)
    const mtN = 40, mtPos = new Float32Array(mtN * 3);
    for (let i = 0; i < mtN; i++) { mtPos[i * 3] = (Math.random() - 0.5) * 10; mtPos[i * 3 + 1] = 0.3 + Math.random() * 3; mtPos[i * 3 + 2] = -7 - Math.random() * 11; } // 카메라 종점(z −2.2)보다 항상 뒤 — 근접 대형 사각 방지
    const mtGeo = new THREE.BufferGeometry(); mtGeo.setAttribute('position', new THREE.BufferAttribute(mtPos, 3));
    const motes = new THREE.Points(mtGeo, new THREE.PointsMaterial({ color: 0xffb070, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false }));
    scene.add(motes);
    const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 80);
    const smooth = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); };
    const update = (t) => {
      const now = performance.now();
      // ① 부스 창 점등(살짝 깜빡이며 t0.1~0.2 안착)
      const wOn = smooth((t - 0.08) / 0.1);
      const flick = t < 0.22 ? (Math.sin(now * 0.05) > -0.4 ? 1 : 0.3) : 1;
      winMat.opacity = 0.85 * wOn * flick; winGlow.intensity = 2.0 * wOn * flick; winSpill.intensity = 1.1 * wOn * flick;
      // ② 차단기 상승 t0.28~0.62 — 끝에서 살짝 반동
      const aT = smooth((t - 0.28) / 0.34);
      armPivot.rotation.z = -1.22 * aT + (aT >= 1 ? Math.sin(now * 0.02) * 0.015 : 0);
      armVines.forEach((v, i) => { v.rotation.z = -armPivot.rotation.z + Math.sin(now * 0.0016 + i) * 0.04; }); // 덩굴은 항상 아래로 늘어진 채 흔들린다
      // ③ 가로등 순차 점등(팝)
      lamps.forEach((L, i) => { const on = smooth((t - (0.5 + i * 0.13)) / 0.06); L.head.material.emissiveIntensity = 1.6 * on; L.pl.intensity = 2.2 * on; });
      // ④ 노을 부풂 + 카메라 — 길을 따라 동쪽으로
      sunGlow.material.opacity = 0.4 + 0.25 * smooth((t - 0.45) / 0.4);
      const mp = motes.geometry.attributes.position.array;
      for (let i = 0; i < mtN; i++) mp[i * 3 + 1] += Math.sin(now * 0.001 + i) * 0.0012;
      motes.geometry.attributes.position.needsUpdate = true;
      camera.position.set(-0.5 + Math.sin(now * 0.0007) * 0.05, 1.55, 2.4 - smooth(t / 0.96) * 4.6);
      camera.lookAt(0.3, 1.5 + t * 0.3, -20);
    };
    return { scene, camera, update };
  }, 9000);
}

export function buildJungleSunScene(rise) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 600);
  camera.position.set(0, 10, 42); camera.lookAt(0, 22, -80);
  const skyCv = document.createElement('canvas'); skyCv.width = 2; skyCv.height = 1024;
  const skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0x2a1626, 70, 380);
  const _tcB = new THREE.Color();
  const lerpC = (h1, h2, k, tgt) => tgt.setHex(h1).lerp(_tcB.setHex(h2), k);
  const _tc1 = new THREE.Color(); const _tc2 = new THREE.Color(); const _tc3 = new THREE.Color(); const _tc4 = new THREE.Color();
  // 태양: 서부의 이글거리는 해 — 백열 코어 + 3겹 코로나 + 수평 번 스트릭 + 틈새 광선
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(11.5, 48), sunMat);
  sun.position.set(6, 4, -240); scene.add(sun);
  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 256;
  const gg = gcv.getContext('2d'); const rg = gg.createRadialGradient(128, 128, 6, 128, 128, 127);
  rg.addColorStop(0, 'rgba(255,168,70,0.95)'); rg.addColorStop(0.4, 'rgba(250,80,28,0.45)'); rg.addColorStop(1, 'rgba(235,50,18,0)');
  gg.fillStyle = rg; gg.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(gcv);
  const mkGlow = (sc) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(sc, sc, 1); scene.add(sp); return sp; };
  const glowCore = mkGlow(85), glowMid = mkGlow(190), glowWide = mkGlow(340);
  const scv = document.createElement('canvas'); scv.width = 256; scv.height = 32; // 지평선이 달궈지는 수평 스트릭
  const sg2 = scv.getContext('2d'); const sgr = sg2.createLinearGradient(0, 0, 256, 0);
  sgr.addColorStop(0, 'rgba(250,90,30,0)'); sgr.addColorStop(0.5, 'rgba(255,170,90,0.75)'); sgr.addColorStop(1, 'rgba(250,90,30,0)');
  sg2.fillStyle = sgr; sg2.fillRect(0, 0, 256, 32);
  const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(scv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  streak.scale.set(300, 12, 1); scene.add(streak);
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xff9a44, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const rayGroup = new THREE.Group(); // 사광 — 타워 틈새로만 뻗는다(협곡 뒤 배치라 실루엣이 자연 차폐)
  for (let i = 0; i < 7; i++) { const pv = new THREE.Group(); const rp = new THREE.Mesh(new THREE.PlaneGeometry(2.6 + (i % 3), 150), rayMat); rp.position.y = 75; pv.add(rp); pv.rotation.z = -0.9 + i * 0.3; rayGroup.add(pv); }
  rayGroup.position.set(6, 4, -239.5); scene.add(rayGroup);
  // 콘크리트 정글 실루엣 4겹: 원경(지평선 잔광에 물듦)→전경 옥상선(발코니에서 내려다보는 낮은 지붕들)
  const srand = seededRand(2409);
  const JG = [ // [zBase, n, hMin, hVar, wMin, wVar, yBase]
    [-210, 16, 16, 26, 9, 14, -6], [-160, 13, 13, 22, 8, 13, -6],
    [-105, 10, 9, 18, 8, 12, -6], [-58, 9, 2.5, 7, 14, 12, -6],
  ];
  const layers = []; const vegMats = [];
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffc478, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const wcv = document.createElement('canvas'); wcv.width = 64; wcv.height = 128; // 창문 격자 — 박스가 '건물'이 된다 (레이어 색이 곱해짐)
  const wg2 = wcv.getContext('2d'); wg2.fillStyle = '#ded6cc'; wg2.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 18; r++) {
    if (r % 5 === 2 && srand() < 0.3) { wg2.fillStyle = '#4a423e'; wg2.fillRect(0, 4 + r * 6.8, 64, 4.6); continue; } // 붕괴로 뚫린 층
    for (let c = 0; c < 8; c++) {
      const wr = srand();
      wg2.fillStyle = wr < 0.16 ? '#55493f' : (wr < 0.55 ? '#a89c90' : '#c4bab0'); // 깨진 구멍/유리/프레임
      wg2.fillRect(3 + c * 7.6, 4 + r * 6.8, 4.8, 4.2);
    }
  }
  const winTex = new THREE.CanvasTexture(wcv); winTex.colorSpace = THREE.SRGBColorSpace;
  const jaggedCrown = (mat, x, top, w, z) => { // 무너진 상층부 — 어긋난 계단 실루엣 + 철근
    let cw = w * 0.9, cy = top;
    const nj = 2 + Math.floor(srand() * 2);
    for (let j = 0; j < nj; j++) {
      const ch = 1.2 + srand() * 2.2; cw *= 0.55 + srand() * 0.25;
      const cb = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, 6), mat);
      cb.position.set(x + (srand() - 0.5) * w * 0.4, cy + ch / 2, z); cb.rotation.z = (srand() - 0.5) * 0.12; scene.add(cb);
      cy += ch * 0.7;
    }
    for (let j = 0; j < 2; j++) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6 + srand() * 1.8, 0.16), mat); rb.position.set(x + (srand() - 0.5) * w * 0.6, cy + 0.8, z); rb.rotation.z = (srand() - 0.5) * 0.7; scene.add(rb); }
  };
  for (let L = 0; L < 4; L++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1420, map: L < 3 ? winTex : null });
    const vegMat = new THREE.MeshBasicMaterial({ color: 0x141a0e });
    const [zb, n, hm, hv, wm, wv, yb] = JG[L];
    for (let i = 0; i < n; i++) {
      const tw4 = wm + srand() * wv, th4 = hm + srand() * hv;
      const x4 = -150 + (i / (n - 1)) * 300 + (srand() - 0.5) * 14;
      if (L < 3 && Math.abs(x4 - 6) < 13 + L * 3) continue; // 협곡: 해가 지는 골목을 비워둔다 (맨해튼헨지)
      const bd4 = new THREE.Mesh(new THREE.BoxGeometry(tw4, th4, 8), mat);
      const z4 = zb + srand() * 16;
      bd4.position.set(x4, yb + th4 / 2, z4);
      if (srand() < 0.3) bd4.rotation.z = (srand() - 0.5) * 0.06; // 침하로 기운 몸체
      scene.add(bd4);
      const topY = yb + th4;
      if (L < 3 && srand() < 0.38) jaggedCrown(mat, x4, topY - 0.6, tw4, z4); // 붕괴 크라운
      else if (L < 3 && srand() < 0.4) { const an3 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4 + srand() * 4, 0.5), mat); an3.position.set(x4, topY + 2, z4); an3.rotation.z = (srand() - 0.5) * 0.3; scene.add(an3); }
      if (L === 3 && srand() < 0.5) { const wt2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), mat); wt2.position.set(x4 + (srand() - 0.5) * tw4 * 0.6, topY + 0.9, z4); scene.add(wt2); } // 옥상 물탱크
      if (srand() < 0.5) { // 도시를 되찾는 초목: 옥상 수관 + 외벽 넝쿨 폭포
        const nb2 = 1 + Math.floor(srand() * 3);
        for (let b = 0; b < nb2; b++) { const cw2 = 1.5 + srand() * 3; const cn2 = new THREE.Mesh(new THREE.BoxGeometry(cw2, 1 + srand() * 1.6, 5), vegMat); cn2.position.set(x4 + (srand() - 0.5) * tw4 * 0.8, topY + 0.5, z4); scene.add(cn2); }
        const nSheet = 1 + (srand() < 0.4 ? 1 : 0); // 벽면을 덮는 넝쿨 시트 — 폭을 키워 '잠식'으로
        for (let sI = 0; sI < nSheet; sI++) {
          const ivH = th4 * (0.35 + srand() * 0.45);
          const iv = new THREE.Mesh(new THREE.BoxGeometry(2 + srand() * tw4 * 0.4, ivH, 0.4), vegMat);
          iv.position.set(x4 - tw4 / 2 + srand() * tw4, topY - ivH / 2 + 0.4, z4 + 4.1); scene.add(iv);
        }
      }
      if (L >= 1 && L < 3 && Math.abs(x4 - 6) < 62 && srand() < 0.55) { // 지는 해가 깨진 유리에 박힌다
        for (let gI2 = 0; gI2 < 2; gI2++) { const gq = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), glintMat); gq.position.set(x4 + (srand() - 0.5) * tw4 * 0.7, yb + th4 * (0.3 + srand() * 0.6), z4 + 4.15); scene.add(gq); }
      }
    }
    layers.push(mat); vegMats.push(vegMat);
  }
  // 세트피스: 이웃에 기대 쓰러진 타워 + 전단된 그루터기 (TLOU의 그 장면)
  const lean2 = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 8), layers[1]); lean2.position.set(-96, 4, -156); lean2.rotation.z = 0.42; scene.add(lean2);
  const stump2 = new THREE.Mesh(new THREE.BoxGeometry(11, 12, 8), layers[1]); stump2.position.set(-110, 0, -158); scene.add(stump2);
  jaggedCrown(layers[1], -110, 5.6, 11, -158);
  // 가로수/자생목 — 건물 사이 골목을 채우는 수관 (도시를 되찾는 숲)
  for (let i = 0; i < 11; i++) {
    const tx3 = -120 + srand() * 240, tz3 = -70 - srand() * 60;
    if (Math.abs(tx3 - 6) < 14) continue;
    const th5 = 6 + srand() * 7;
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.7, th5, 0.7), vegMats[2]); trunk.position.set(tx3, -6 + th5 / 2, tz3); scene.add(trunk);
    let cy3 = -6 + th5 - 1;
    for (let b = 0; b < 2 + Math.floor(srand() * 2); b++) { const cw3 = 3 + srand() * 3.5; const cn3 = new THREE.Mesh(new THREE.BoxGeometry(cw3, 1.6 + srand() * 1.4, cw3 * 0.8), vegMats[2]); cn3.position.set(tx3 + (srand() - 0.5) * 1.6, cy3, tz3); scene.add(cn3); cy3 += 1.2; }
  }
  // 폐 트러스 연결교 — 타워 사이에 걸린 잔해, 넝쿨이 늘어진다
  const tb2 = new THREE.Group();
  const chT = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 1.2), layers[2]); chT.position.y = 3.2; tb2.add(chT);
  const chB = new THREE.Mesh(new THREE.BoxGeometry(26, 0.7, 1.4), layers[2]); tb2.add(chB);
  for (let i = 0; i < 7; i++) { const dg2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.4, 0.5), layers[2]); dg2.position.set(-11 + i * 3.7, 1.6, 0); dg2.rotation.z = (i % 2 ? 0.62 : -0.62); tb2.add(dg2); }
  tb2.position.set(-52, 15, -100); tb2.rotation.z = -0.04; scene.add(tb2);
  for (let i = 0; i < 4; i++) { const vnH = 2 + srand() * 2.5; const vn2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, vnH, 0.4), vegMats[2]); vn2.position.set(-62 + srand() * 22, 15 - vnH / 2 + 0.3, -99.4); scene.add(vn2); }
  // 새 떼 + 노을 구름 띠(타워 위, 아래에서 달궈진) + 황혼 별
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x0c0a10 });
  for (let i = 0; i < 6; i++) {
    const bx5 = -34 + srand() * 68, by5 = 30 + srand() * 16;
    for (const s5 of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.3), birdMat); wing.position.set(bx5 + s5 * 0.55, by5, -120); wing.rotation.z = s5 * 0.4; scene.add(wing); }
  }
  const ccv = document.createElement('canvas'); ccv.width = 256; ccv.height = 64; // 소프트 구름 스트릭 (박스 금지 — 막대기로 보임)
  const cg = ccv.getContext('2d');
  for (const [sx, sy, sw, sh, a] of [[10, 22, 236, 18, 0.5], [40, 12, 150, 12, 0.35], [80, 36, 140, 14, 0.4]]) {
    const lg = cg.createRadialGradient(sx + sw / 2, sy + sh / 2, 2, sx + sw / 2, sy + sh / 2, sw / 2);
    lg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    cg.save(); cg.translate(sx + sw / 2, sy + sh / 2); cg.scale(1, sh / sw); cg.translate(-(sx + sw / 2), -(sy + sh / 2));
    cg.fillStyle = lg; cg.beginPath(); cg.arc(sx + sw / 2, sy + sh / 2, sw / 2, 0, Math.PI * 2); cg.fill(); cg.restore();
  }
  const cloudTex = new THREE.CanvasTexture(ccv); cloudTex.colorSpace = THREE.SRGBColorSpace;
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, color: 0xd86a3c, transparent: true, opacity: 0.75, depthWrite: false, fog: false });
  for (const [cx5, cy5, csc] of [[-58, 50, 130], [52, 62, 160], [-4, 42, 95]]) {
    const cl2 = new THREE.Sprite(cloudMat); cl2.position.set(cx5, cy5, -236); cl2.scale.set(csc, csc * 0.22, 1); scene.add(cl2);
  }
  // 층간 안개 밴드 — 공기원근을 실제 매질로 (소프트 그라데이션 플레인 3장)
  const hcv = document.createElement('canvas'); hcv.width = 32; hcv.height = 64;
  const hg = hcv.getContext('2d'); const hgr = hg.createLinearGradient(0, 0, 0, 64);
  hgr.addColorStop(0, 'rgba(255,255,255,0)'); hgr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); hgr.addColorStop(1, 'rgba(255,255,255,0)');
  hg.fillStyle = hgr; hg.fillRect(0, 0, 32, 64);
  const hazeTex = new THREE.CanvasTexture(hcv);
  const hazeMats = [];
  for (const [hy, hz, hh, ho] of [[7, -186, 30, 0.55], [5, -130, 22, 0.45], [3, -76, 15, 0.35]]) {
    const hm2 = new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, opacity: ho, depthWrite: false, fog: false, color: 0xc06a3a });
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(400, hh), hm2); hp.position.set(0, hy, hz); scene.add(hp); hazeMats.push(hm2);
  }
  // 재와 불씨 — 죽은 도시 위를 떠도는 것들
  const emN = 54; const emArr = new Float32Array(emN * 3); const emSeed = [];
  for (let i = 0; i < emN; i++) { emArr[i * 3] = -90 + srand() * 180; emArr[i * 3 + 1] = 4 + srand() * 44; emArr[i * 3 + 2] = -70 + srand() * 30; emSeed.push(srand() * Math.PI * 2); }
  const emGeo = new THREE.BufferGeometry(); emGeo.setAttribute('position', new THREE.BufferAttribute(emArr, 3));
  const emMat = new THREE.PointsMaterial({ color: 0xffb060, size: 2.2, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, sizeAttenuation: false });
  scene.add(new THREE.Points(emGeo, emMat));
  // 최전경: 발코니 난간 실루엣 (여기 서서 보고 있다는 시점 근거) + 난간을 타는 넝쿨
  const railMat = new THREE.MeshBasicMaterial({ color: 0x0a080e });
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(200, 5.2, 2), railMat); parapet.position.set(0, 3.2, 20); scene.add(parapet);
  const handrail = new THREE.Mesh(new THREE.BoxGeometry(200, 0.5, 2.4), new THREE.MeshBasicMaterial({ color: 0x2a2018 })); handrail.position.set(0, 6.1, 20); scene.add(handrail);
  for (let i = 0; i < 9; i++) { const tf2 = new THREE.Mesh(new THREE.BoxGeometry(0.8 + srand() * 1.8, 0.6 + srand() * 1.4, 1.6), railMat); tf2.position.set(-46 + srand() * 92, 6.4 + tf2.geometry.parameters.height / 2 - 0.2, 20); scene.add(tf2); } // 파라펫 위 풀 포기
  const stGeo = new THREE.BufferGeometry(); const stPos = [];
  for (let i = 0; i < 240; i++) stPos.push(-260 + srand() * 520, 34 + srand() * 150, -250);
  stGeo.setAttribute('position', new THREE.Float32BufferAttribute(stPos, 3));
  const stMat = new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.3, transparent: true, opacity: 0, fog: false, sizeAttenuation: false });
  scene.add(new THREE.Points(stGeo, stMat));
  const update = (t) => {
    const kn = rise ? t : 1 - t;                   // kn 0=어스름 1=골든아워 (해돋이는 증가, 해넘이는 감소)
    camera.position.z = 42 - 3.5 * t; camera.lookAt(0, 22, -80); // 슬로 돌리인
    const g2 = skyCv.getContext('2d');
    const gr2 = g2.createLinearGradient(0, 0, 0, 1024);
    lerpC(0x200a1a, 0xb82a1e, kn, _tc1); lerpC(0x6a1c2a, 0xe85228, kn, _tc2); lerpC(0xa03424, 0xff8434, kn, _tc4); lerpC(0xb03a20, 0xffc44e, Math.min(1, kn * 1.2), _tc3); // 하늘 전체가 탄다 (RDR 포스터)
    gr2.addColorStop(0, '#' + _tc1.getHexString()); gr2.addColorStop(0.5, '#' + _tc2.getHexString()); gr2.addColorStop(0.78, '#' + _tc4.getHexString()); gr2.addColorStop(1, '#' + _tc3.getHexString());
    g2.fillStyle = gr2; g2.fillRect(0, 0, 2, 1024); skyTex.needsUpdate = true;
    const sunY = -10 + 30 * kn;                    // 협곡 사이 낮은 호 — 옥상선에 걸린 해가 골목으로 진다
    const gy = Math.max(sunY, -2);
    sun.position.y = sunY;
    lerpC(0xff4a14, 0xffd23e, kn, sunMat.color);   // 지평선에선 녹은 쇳물, 떠 있을 땐 진한 골드
    glowCore.position.set(6, gy, -239); glowMid.position.set(6, gy, -239); glowWide.position.set(6, gy, -239);
    glowCore.material.opacity = 0.85 + 0.1 * Math.sin(t * 46);          // 이글거림 — 코어가 떨린다
    glowMid.material.opacity = 0.5 + 0.4 * (1 - kn) + 0.05 * Math.sin(t * 33);
    glowWide.material.opacity = 0.26 + 0.2 * (1 - kn);
    streak.position.set(6, Math.max(sunY, -1), -239.2);
    streak.material.opacity = 0.25 + 0.5 * (1 - kn); streak.scale.x = 300 + 6 * Math.sin(t * 21);
    rayGroup.position.y = gy; rayGroup.rotation.z = t * 0.05;
    rayMat.opacity = 0.015 + 0.1 * Math.pow(kn, 1.6); // 해가 잠기면 광선도 급히 죽는다
    lerpC(0x2a0e18, 0xb85838, kn, scene.fog.color); // 붉은 먼지가 낀 대기
    lerpC(0x38141e, 0x8a3a44, kn, layers[0].color);  // 원경 — 잔광에 익은 적갈 (창문 텍스처가 곱해짐)
    lerpC(0x26101e, 0x5c2434, kn, layers[1].color);
    lerpC(0x180a14, 0x3a1824, kn, layers[2].color);
    lerpC(0x0a060a, 0x180d14, kn, layers[3].color);  // 전경 옥상선 — 거의 검게
    lerpC(0x2a2014, 0x4a3824, kn, vegMats[0].color); // 초목 — 역광의 마른 올리브
    lerpC(0x1e1810, 0x342818, kn, vegMats[1].color);
    lerpC(0x141008, 0x241c10, kn, vegMats[2].color);
    lerpC(0x0a0806, 0x141008, kn, vegMats[3].color);
    lerpC(0x6a1c20, 0xf07034, kn, hazeMats[0].color); // 안개 밴드 — 해에 가까울수록 달궈진다
    lerpC(0x521824, 0xd85428, kn, hazeMats[1].color);
    lerpC(0x3a1220, 0xa84224, kn, hazeMats[2].color);
    glintMat.opacity = 0.15 + 0.7 * kn;              // 유리 파편광은 해와 함께 죽는다
    for (let i = 0; i < emN; i++) {                  // 불씨 부유
      emArr[i * 3 + 1] += 0.045; emArr[i * 3] += Math.sin(t * 6 + emSeed[i]) * 0.05;
      if (emArr[i * 3 + 1] > 52) emArr[i * 3 + 1] = 4;
    }
    emGeo.attributes.position.needsUpdate = true;
    emMat.opacity = 0.28 + 0.14 * Math.sin(t * 27) * Math.sin(t * 7 + 1);
    lerpC(0x8a2818, 0xff9a4e, kn, cloudMat.color);
    stMat.opacity = Math.max(0, (0.22 - kn) / 0.22) * 0.9; // 어스름에만 별이 스민다
  };
  update(0);
  return { scene, camera, update };
}
export function playJungleSunVignette() {
  const rise = gameHour() < 12;
  playVignette(() => buildJungleSunScene(rise), 12000, () => {
    state.sights = state.sights || {};
    const first = !state.sights.jungleSun;
    state.sights.jungleSun = (state.sights.jungleSun || 0) + 1;
    addMoodBuff(2, 1);                                            // 익일 무드: "그 하늘을 생각했다"
    state.dayLog.notes.push(t('sight.jungleSun.note'));
    if (first) jackpotToast(`${t('sight.jungleSun.first')}`, 0xffb04a);
    scheduleSave();
  });
}

export function buildGoldenGateScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 1200);
  camera.position.set(-8, 12, 40); camera.lookAt(10, 16, -150); // 3/4 다리축 조망(비대칭)
  const srand = seededRand(7761);
  const skyCv = document.createElement('canvas'); skyCv.width = 2; skyCv.height = 1024;
  const skyTex = new THREE.CanvasTexture(skyCv); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0x6b4a2e, 60, 440); // 따뜻한 먼지 안개 — 원경 타워/스카이라인을 녹인다
  const _tcB = new THREE.Color();
  const lerpC = (h1, h2, k, tgt) => tgt.setHex(h1).lerp(_tcB.setHex(h2), k);
  const _ux = new THREE.Vector3(1, 0, 0), _dir = new THREE.Vector3();
  // 3D 임의 방향 박스(상판·케이블·행어를 실좌표로 잇는다 → 원근이 크기 감소를 공짜로 처리)
  const link = (mat, a, b, w, h) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz) || 0.01;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), mat);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    m.quaternion.setFromUnitVectors(_ux, _dir.set(dx / len, dy / len, dz / len));
    scene.add(m); return m;
  };
  // ── 절차 텍스처 (역광 실루엣: 명암보다 결·얼룩·균열·이끼로 디테일. material color가 map을 곱함.
  //   trand=텍스처 전용 시드 — srand() 시퀀스를 소비하지 않아 지오메트리 난수는 불변) ──
  const trand = seededRand(9911);
  const pxT = (w2, h2, draw, rep) => { const c = document.createElement('canvas'); c.width = w2; c.height = h2; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return t; };
  const grain = (g, w2, h2, n, a) => { for (let i = 0; i < n; i++) { const v = 150 + ((i * 37) % 80); g.fillStyle = 'rgba(' + v + ',' + (v - 8) + ',' + (v - 18) + ',' + a + ')'; g.fillRect((i * 29) % w2, (i * 71) % h2, 1, 1); } };
  const cracks = (g, w2, h2, n, seg) => { for (let i = 0; i < n; i++) { g.strokeStyle = 'rgba(48,42,36,0.42)'; g.lineWidth = 1; g.beginPath(); let cx = (i * 407) % w2, cy = 0; g.moveTo(cx, cy); for (let s = 0; s < seg; s++) { cx += (trand() - 0.5) * 20; cy += h2 / seg; g.lineTo(cx, cy); } g.stroke(); } };
  // 콘크리트/타워: 밝은 베이스 + 세로 물얼룩 + 균열 + 하단 이끼
  const concreteTex = pxT(96, 160, g => {
    g.fillStyle = '#b8b0a4'; g.fillRect(0, 0, 96, 160); grain(g, 96, 160, 1500, 0.5);
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(66,58,48,0.15)'; g.fillRect((i * 911) % 96, (i * 53) % 30, 2 + ((i * 7) % 3), 132); }
    cracks(g, 96, 160, 5, 6);
    const mg = g.createLinearGradient(0, 116, 0, 160); mg.addColorStop(0, 'rgba(58,78,38,0)'); mg.addColorStop(1, 'rgba(48,72,34,0.5)'); g.fillStyle = mg; g.fillRect(0, 116, 96, 44);
  });
  // 강철/상판: 페인트 + 세로 녹줄 + 리벳
  const steelTex = pxT(128, 64, g => {
    g.fillStyle = '#a89a86'; g.fillRect(0, 0, 128, 64);
    for (let i = 0; i < 22; i++) { g.fillStyle = 'rgba(150,88,42,0.28)'; g.fillRect((i * 311) % 128, 0, 1 + ((i * 5) % 3), 64); }
    grain(g, 128, 64, 900, 0.4);
    for (let rx = 6; rx < 128; rx += 16) for (let ry = 8; ry < 64; ry += 22) { g.fillStyle = 'rgba(58,48,38,0.5)'; g.fillRect(rx, ry, 2, 2); }
  });
  // 콘크리트 소(균열)
  const concTex = pxT(96, 96, g => { g.fillStyle = '#aca498'; g.fillRect(0, 0, 96, 96); grain(g, 96, 96, 850, 0.5); cracks(g, 96, 96, 4, 5); });
  // 녹 (차/가드레일)
  const rustTex = pxT(64, 64, g => { g.fillStyle = '#b09070'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 640; i++) { const r = 110 + ((i * 29) % 80); g.fillStyle = 'rgba(' + r + ',' + (r * 0.6 | 0) + ',' + (r * 0.35 | 0) + ',0.5)'; g.fillRect((i * 17) % 64, (i * 53) % 64, 1 + ((i * 3) % 2), 1 + ((i * 5) % 2)); } });
  // 잎 클러스터 스프라이트 — 올리브(저채도) 잎덩이 + 물어뜯긴 불규칙 가장자리 + 내부 결.
  //   역광 씬: material color를 아주 낮춰 '거의 실루엣'으로 앉힌다(빛나는 오브 금지). 상단만 warm rim.
  const leafTex = pxT(64, 64, g => {
    for (let b = 0; b < 16; b++) { const cx = 13 + trand() * 38, cy = 13 + trand() * 38, rr = 6 + trand() * 10; const gv = 80 + (trand() * 55 | 0); g.fillStyle = 'rgba(' + (gv * 0.72 | 0) + ',' + (gv * 0.9 | 0) + ',' + (gv * 0.5 | 0) + ',0.97)'; g.beginPath(); g.arc(cx, cy, rr, 0, 6.283); g.fill(); } // 올리브톤(녹 채도 낮춤)
    for (let i = 0; i < 44; i++) { g.fillStyle = 'rgba(16,26,12,0.6)'; g.fillRect(6 + trand() * 52 | 0, 6 + trand() * 52 | 0, 1 + (trand() * 3 | 0), 1 + (trand() * 6 | 0)); } // 어두운 잎 갈라짐
    for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(150,168,104,0.4)'; g.fillRect(8 + trand() * 48 | 0, 8 + trand() * 20 | 0, 1, 1); } // 상단 광엣지
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 11; i++) { g.beginPath(); g.arc(4 + trand() * 56, 4 + trand() * 56, 3 + trand() * 5, 0, 6.283); g.fill(); } g.globalCompositeOperation = 'source-over'; // 가장자리 물어뜯기(원 탈피)
  });
  // ── 재질(해가 우측 → +x/윗면이 광면). color를 map 밝기만큼 올려 실루엣 톤 유지 ──
  const steelMat = new THREE.MeshBasicMaterial({ color: 0x33251a, map: concreteTex });   // 원경 타워
  const steelLit = new THREE.MeshBasicMaterial({ color: 0x52381f, map: concreteTex });   // 근경 타워 광면(kn 애니)
  const deckMat = new THREE.MeshBasicMaterial({ color: 0x33261a, map: steelTex });       // 상판/행어
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x1c130c });
  const vegSil = new THREE.MeshBasicMaterial({ color: 0x243218 });     // 넝쿨 가닥(박스)
  const vegRim = new THREE.MeshBasicMaterial({ color: 0x50501f });
  const leafSil = new THREE.SpriteMaterial({ map: leafTex, color: 0x1c2612, transparent: true, depthWrite: false });   // 역광 잎(거의 실루엣, kn 애니)
  const leafRim = new THREE.SpriteMaterial({ map: leafTex, color: 0x483a1c, transparent: true, depthWrite: false });   // 상단 top-lit warm rim
  const concShad = new THREE.MeshBasicMaterial({ color: 0x281d12, map: concTex });
  const concLit = new THREE.MeshBasicMaterial({ color: 0x3e2c1a, map: concTex });
  const propDark = new THREE.MeshBasicMaterial({ color: 0x281d14, map: rustTex });
  const propRust = new THREE.MeshBasicMaterial({ color: 0x52301a, map: rustTex });
  const cityMat = new THREE.MeshBasicMaterial({ color: 0x281620, transparent: true, opacity: 0.82 });
  const hillMat = new THREE.MeshBasicMaterial({ color: 0x241a14 });
  // ── 해: 낮게 잠기는 우측 골드 쇳덩이 + 3겹 코로나 ──
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2d8, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(11, 48), sunMat);
  sun.position.set(80, 4, -330); scene.add(sun);
  const gcv = document.createElement('canvas'); gcv.width = gcv.height = 256;
  const gg = gcv.getContext('2d'); const rgS = gg.createRadialGradient(128, 128, 6, 128, 128, 127);
  rgS.addColorStop(0, 'rgba(255,244,214,0.95)'); rgS.addColorStop(0.35, 'rgba(255,168,70,0.55)'); rgS.addColorStop(0.7, 'rgba(240,120,40,0.18)'); rgS.addColorStop(1, 'rgba(200,90,30,0)');
  gg.fillStyle = rgS; gg.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(gcv);
  const mkGlow = (sc) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(sc, sc, 1); scene.add(sp); return sp; };
  const glowCore = mkGlow(110), glowMid = mkGlow(250), glowWide = mkGlow(460);
  // 뜨거운 백열 코어(값 상한) — 해 원반 위에 근백색 가산 디스크
  const coreCv = document.createElement('canvas'); coreCv.width = coreCv.height = 128;
  const cg2 = coreCv.getContext('2d'); const crg = cg2.createRadialGradient(64, 64, 4, 64, 64, 64);
  crg.addColorStop(0, 'rgba(255,250,232,0.98)'); crg.addColorStop(0.5, 'rgba(255,232,180,0.5)'); crg.addColorStop(1, 'rgba(255,210,140,0)');
  cg2.fillStyle = crg; cg2.fillRect(0, 0, 128, 128);
  const hotCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(coreCv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); hotCore.scale.set(34, 34, 1); scene.add(hotCore);
  // 신의 광선(수평 팬) — 두꺼운 먼지 대기. (24h 모드가 밤에 끄도록 참조 보관)
  const rayPans = [];
  for (const [gy, gz, gsc] of [[6, -150, 200], [3, -210, 260]]) { const gr = new THREE.Mesh(new THREE.PlaneGeometry(gsc, gsc * 0.5), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); gr.position.set(70, gy, gz); scene.add(gr); rayPans.push(gr.material); }
  // ── 지형: 마린 헤드랜드(원경) + 도심 스카이라인 밴드(해 밑, 무명 블록 — 콘텐츠 게이트) ──
  const hillShape = new THREE.Shape(); hillShape.moveTo(-300, -30);
  for (let x = -300; x <= 300; x += 11) { const hy = 12 + Math.sin(x * 0.017) * 12 + Math.sin(x * 0.05 + 1) * 6 + Math.sin(x * 0.19 + 2) * 2.4 + srand() * 5; hillShape.lineTo(x, hy); } // 고주파 항 + 잔 노이즈 → 매끈한 언덕 탈피
  hillShape.lineTo(300, -30); hillShape.lineTo(-300, -30);
  const hills = new THREE.Mesh(new THREE.ShapeGeometry(hillShape), hillMat); hills.position.set(20, 0, -300); scene.add(hills);
  // 앞쪽 낮은 능선(깊이감) — 나무 실루엣 톱니
  const ridgeShape = new THREE.Shape(); ridgeShape.moveTo(-260, -20);
  for (let x = -260; x <= 260; x += 8) { const ry = 5 + Math.sin(x * 0.03) * 5 + Math.sin(x * 0.28 + 1) * 2 + srand() * 3.5; ridgeShape.lineTo(x, ry); }
  ridgeShape.lineTo(260, -20); ridgeShape.lineTo(-260, -20);
  const ridge = new THREE.Mesh(new THREE.ShapeGeometry(ridgeShape), new THREE.MeshBasicMaterial({ color: 0x1a140f })); ridge.position.set(30, 0, -276); scene.add(ridge);
  for (let i = 0; i < 22; i++) { const bx = -14 + srand() * 96; const bh = 6 + srand() * 11 + (srand() < 0.18 ? 7 : 0); const bd = new THREE.Mesh(new THREE.BoxGeometry(5 + srand() * 4, bh, 4), cityMat); bd.position.set(bx, -1 + bh / 2, -262); scene.add(bd); }
  // ── 금문교: 두 탑을 서로 다른 깊이에 → 원근이 far 탑을 작게 만든다(수동 축소 금지) ──
  const NT = [-20, 0, -55], FT = [46, 0, -210], TT = 34;
  const mkTower = (tx, tz, lit) => {
    const g = new THREE.Group(); const bodyMat = lit ? steelLit : steelMat;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(2.6, TT + 2, 2.6), (s > 0 && lit) ? steelLit : steelMat); leg.position.set(s * 4.2, TT / 2, 0); g.add(leg); }
    for (const by of [9, 16, 23, 29, TT - 1]) { const br = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 2.4), bodyMat); br.position.set(0, by, 0); g.add(br); }
    // 상단: 평평한 캡 폐기 → 어긋난 파쇄 조각 4 + 뜯긴 철근 8(랜덤 높이) → 실루엣 상단을 울퉁불퉁하게
    for (let j = 0; j < 4; j++) { const cw = 3.4 + srand() * 3.6, chh = 0.8 + srand() * 1.7; const ch = new THREE.Mesh(new THREE.BoxGeometry(cw, chh, 2.6 + srand()), bodyMat); ch.position.set(-4 + srand() * 8, TT + 0.5 + srand() * 2.3, (srand() - 0.5) * 0.8); ch.rotation.z = (srand() - 0.5) * 0.26; g.add(ch); }
    for (let j = 0; j < 8; j++) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.4 + srand() * 3.6, 0.14), cableMat); rb.position.set(-5 + srand() * 10, TT + 1.6 + srand() * 2.6, (srand() - 0.5) * 2.2); rb.rotation.z = (srand() - 0.5) * 0.75; rb.rotation.x = (srand() - 0.5) * 0.5; g.add(rb); }
    // 전면 창문 열(불규칙: ~22% 결손, 크기 편차, 30% 뻥 뚫린 구멍, 창밑 흘러내린 얼룩)
    for (const s of [-1, 1]) { let wy = 6; while (wy < TT - 2) { wy += 2.7 + srand() * 0.7; if (srand() < 0.22) continue; const wn = new THREE.Mesh(new THREE.BoxGeometry(1.1 + srand() * 0.6, 1.2 + srand() * 1.0, srand() < 0.3 ? 0.5 : 0.12), cableMat); wn.position.set(s * 4.2, wy, 1.32); g.add(wn); if (srand() < 0.4) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2 + srand(), 0.05), new THREE.MeshBasicMaterial({ color: 0x140d08, transparent: true, opacity: 0.5 })); st.position.set(s * 4.2 + (srand() - 0.5), wy - 1.3, 1.36); g.add(st); } } }
    g.position.set(tx, 0, tz); return g;
  };
  const _ntg = mkTower(NT[0], NT[2], true); _ntg.scale.set(1.16, 1.16, 1.16); scene.add(_ntg); // 근탑을 모뉴먼트로 — 하늘을 지배
  scene.add(mkTower(FT[0], FT[2], false));
  const NTtop = [NT[0], TT + 1, NT[2]], FTtop = [FT[0], TT + 1, FT[2]];
  const dW = 5.4, dH = 1.4;
  // 접근 경간(성함): 근앵커 → 근탑 (녹강 상판 텍스처)
  const appWP = [[-96, 9, 10], [-58, 9, -22], NT[0] && [-20, 9, -55]]; appWP[2] = [-20, 9, -55];
  for (let i = 0; i < appWP.length - 1; i++) link(deckMat, appWP[i], appWP[i + 1], dW, dH);
  // 접근 상판 난간(디테일) + 신축 이음새
  for (let s = 0.06; s < 1; s += 0.12) { const x = -96 + (NT[0] + 96) * s, z = 10 + (NT[2] - 10) * s; link(cableMat, [x, 9.7, z + 2.5], [x, 10.5, z + 2.5], 0.12, 0.12); }
  link(cableMat, [-96, 10.5, 12.5], [-20, 10.5, -52.5], 0.14, 0.14); // 상판 앞 난간 상단봉
  // 주경간(붕괴): 근탑 → 처짐 → 물로 꺾여 잠김 + 파단부 철근
  const sagA = [-20, 9, -55], sagB = [-6, 4.5, -74], sagC = [4, 1.6, -90];
  link(deckMat, sagA, sagB, dW, dH); link(deckMat, sagB, sagC, dW * 0.9, dH);
  for (let j = 0; j < 6; j++) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2 + srand() * 2.6, 0.14), cableMat); rb.position.set(3 + srand() * 5, 1.2 + srand() * 2.5, -88 - srand() * 6); rb.rotation.z = (srand() - 0.5) * 1.4; scene.add(rb); } // 부러진 상판 철근
  // 원경 경간(성함): 재개 → 원탑 → 원앵커
  const farWP = [[30, 9, -176], FT[0] && [46, 9, -210], [76, 9, -250], [108, 9, -298]]; farWP[1] = [46, 9, -210];
  for (let i = 0; i < farWP.length - 1; i++) link(deckMat, farWP[i], farWP[i + 1], dW, dH);
  // 주케이블 + 행어 (같은 폴리라인)
  const cApp = [[-96, 13, 10], [-58, 27, -22], NTtop];
  for (let i = 0; i < cApp.length - 1; i++) link(cableMat, cApp[i], cApp[i + 1], 0.5, 0.5);
  const cSag = [NTtop, [-6, 20, -74], [3, 9, -90]];
  for (let i = 0; i < cSag.length - 1; i++) link(cableMat, cSag[i], cSag[i + 1], 0.5, 0.5);
  link(cableMat, [3, 9, -90], [5, 3, -93], 0.4, 0.4); // 끊긴 자락
  const cFar = [[108, 13, -298], [76, 25, -250], FTtop, [30, 18, -176], [23, 10, -168]];
  for (let i = 0; i < cFar.length - 1; i++) link(cableMat, cFar[i], cFar[i + 1], 0.5, 0.5);
  // 행어(성한 경간만)
  const hangOn = (a, b, cyA, cyB, n) => { for (let i = 1; i < n; i++) { const s = i / n; const x = a[0] + (b[0] - a[0]) * s, z = a[2] + (b[2] - a[2]) * s, cy = cyA + (cyB - cyA) * s; if (cy - 9 > 1) link(cableMat, [x, 9, z], [x, cy, z], 0.2, 0.2); } };
  hangOn([-96, 9, 10], NT, 13, 35, 8); hangOn([46, 9, -210], [108, 9, -298], 35, 13, 7);
  // ── 초목 관용구 ──
  const swayG = [];
  const mkVine = (x, yTop, z, len, mat, amp) => { const g = new THREE.Group(); g.position.set(x, yTop, z); const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16 + srand() * 0.18, len, 0.16), mat); seg.position.y = -len / 2; g.add(seg); scene.add(g); swayG.push({ g, seed: srand() * 6.28, amp: amp * (0.6 + srand() * 0.8) }); return g; };
  // 캐노피/담쟁이 = 부드러운 잎 클러스터 스프라이트(큐브 아님). mat===vegRim → 광엣지 톤.
  // 캐노피: 2~3장 겹침·넓은 스케일 편차·미러·수직 지터 → 균일한 공(orb) 탈피. rim은 가끔만(상단 광엣지 희소).
  const mkCanopy = (x, y, z, r, mat) => { const allowRim = (mat === vegRim); const n = 2 + (srand() < 0.55 ? 1 : 0); for (let b = 0; b < n; b++) { const sp = new THREE.Sprite((allowRim && srand() < 0.5) ? leafRim : leafSil); const sc = r * (1.05 + srand() * 1.7); sp.scale.set(sc * (srand() < 0.5 ? -1 : 1), sc * (0.66 + srand() * 0.4), 1); sp.position.set(x + (srand() - 0.5) * r * 1.3, y + r * 0.32 + (srand() - 0.5) * r * 0.85, z + (srand() - 0.5) * r * 0.9); scene.add(sp); } };
  const mkIvy = (cx, cyTop, cyBot, halfW, z, dens, allowRim) => { const rows = Math.max(2, Math.floor((cyTop - cyBot) / 1.0)); for (let r = 0; r < rows; r++) { const yy = cyBot + (r / rows) * (cyTop - cyBot); const patches = Math.max(1, Math.floor(dens * (2 + srand() * 3))); for (let p = 0; p < patches; p++) { const rim = (allowRim && yy > cyTop - 5 && srand() < 0.35); const sp = new THREE.Sprite(rim ? leafRim : leafSil); const sc = 0.9 + srand() * 1.1; sp.scale.set(sc * (srand() < 0.5 ? -1 : 1), sc * (1.1 + srand() * 0.6), 1); sp.position.set(cx + (srand() - 0.5) * halfW * 1.8, yy + (srand() - 0.5), z + 0.35 * (z < NT[2] ? 1 : -1)); scene.add(sp); } } };
  // 히어로: 붕괴 경간 케이블에서 늘어진 넝쿨 커튼(처짐부에서 가장 길다)
  const sagPts = [];
  for (let i = 0; i < cSag.length - 1; i++) { for (let s = 0; s < 1; s += 0.1) { const a = cSag[i], b = cSag[i + 1]; sagPts.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s]); } }
  for (const [px, py, pz] of sagPts) { const drop = 2 + srand() * 7 + Math.max(0, py - 6) * 0.35; const len = Math.min(drop, py - 0.4); if (len > 0.6) mkVine(px + (srand() - 0.5) * 1.3, py - 0.2, pz + (srand() - 0.5) * 1.3, len, srand() < 0.3 ? vegRim : vegSil, 0.05 + len * 0.004); }
  for (let i = 0; i < 7; i++) mkVine(-14 + srand() * 18, 8.5, -58 - srand() * 6, 3 + srand() * 4, vegSil, 0.05); // 부서진 상판 립에서 늘어진 자락
  // 근/원탑 담쟁이 + 상판 밑단 프린지
  mkIvy(NT[0] - 4.2, 33, 2, 2.2, NT[2], 1.0, true); mkIvy(NT[0] + 4.2, 33, 2, 2.2, NT[2], 1.0, true);
  mkIvy(FT[0] - 4.2, 32, 3, 2.0, FT[2], 0.8, false); mkIvy(FT[0] + 4.2, 32, 3, 2.0, FT[2], 0.8, false);
  for (let s = 0; s < 1; s += 0.035) { const x = -96 + (NT[0] + 96) * s, z = 10 + (NT[2] - 10) * s; mkVine(x + (srand() - 0.5) * 2, 8.4, z + 2.7, 2 + srand() * 6, srand() < 0.25 ? vegRim : vegSil, 0.05); } // 접근 상판 앞면 넝쿨 커튼(하늘에 실루엣)
  // 캐노피 군락: 상판 정원 / 탑 어깨 / 수변 덤불
  for (let s = 0; s < 1; s += 0.13) { const x = -96 + (NT[0] + 96) * s, z = 10 + (NT[2] - 10) * s; if (srand() < 0.7) mkCanopy(x + (srand() - 0.5) * 3, 10.6, z, 1.6 + srand() * 1.4, srand() < 0.3 ? vegRim : vegSil); }
  for (const by of [16, 24, 35]) mkCanopy(NT[0] + (srand() - 0.5) * 6, by, NT[2], 2 + srand(), srand() < 0.5 ? vegRim : vegSil);
  for (let i = 0; i < 26; i++) { const tx = -42 + srand() * 96, tz = -8 - srand() * 176; mkCanopy(tx, 0.6 + srand() * 3, tz, 1.6 + srand() * 2.4, (srand() < 0.25 && tx < 0) ? vegRim : vegSil); }
  // 중경 잎: 성한 케이블 선을 따라 잠식(레퍼런스처럼 초록이 다리 전체 깊이로 스레딩)
  for (const cbl of [cApp, cFar]) for (let i = 0; i < cbl.length - 1; i++) for (let s = 0.15; s < 1; s += 0.3) { if (srand() < 0.45) continue; const a = cbl[i], b = cbl[i + 1]; mkCanopy(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s - 0.3, a[2] + (b[2] - a[2]) * s, 0.8 + srand() * 0.9, vegSil); }
  for (let i = 0; i < 6; i++) mkCanopy(NT[0] + (srand() - 0.5) * 11, 1 + srand() * 3, NT[2] + (srand() - 0.5) * 9, 2 + srand() * 2, vegSil);
  for (let i = 0; i < 5; i++) mkCanopy(FT[0] + (srand() - 0.5) * 11, 1 + srand() * 3, FT[2] + (srand() - 0.5) * 9, 1.6 + srand() * 1.6, vegSil);
  // 전경 덤불 벽 — 하단을 잠식으로 채운다(앰버 하늘에 실루엣). 몇 포기는 키가 커 상판·난간 선을 끊는다.
  for (let i = 0; i < 38; i++) { const bx = -74 + srand() * 158, bz = 4 + srand() * 28; mkCanopy(bx, 1.3 + srand() * 3.2, bz, 1.6 + srand() * 2.4, srand() < 0.3 ? vegRim : vegSil); }
  for (let i = 0; i < 5; i++) { const bx = -64 + srand() * 138; mkCanopy(bx, 4.5 + srand() * 4, 8 + srand() * 14, 2 + srand() * 1.8, srand() < 0.4 ? vegRim : vegSil); }
  // ── 전경: 젖은 습지 둑 + 웅덩이 반사 ──
  const bankMat = new THREE.MeshBasicMaterial({ color: 0x181109, fog: false }); // 24h 모드가 주간 톤으로 올리도록 참조 보관
  const bank = new THREE.Mesh(new THREE.PlaneGeometry(320, 90), bankMat); bank.rotation.x = -Math.PI / 2; bank.position.set(-10, 0.25, 24); scene.add(bank);
  // ── 해안 지형 (디렉터 2026-07-23: "바닥이 없어서 건물들이 물에 있는 것처럼 보여") ──
  //   물 평면(900×520)이 전 영역을 덮는데 뭍은 위 둑 한 장뿐 — 콜로네이드·차·표지판이 물 위에 서 있었다.
  //   근좌측 해안(다리가 물로 들어가는 선까지)과 원안 해안 밴드(도심 실루엣 발밑)를 깐다.
  //   노을 실루엣에선 어두워 티가 안 났지만 밝은 시각(24h 주간)에 치명적 — 비네트 자체의 접지 결함 수리.
  const shoreMat = new THREE.MeshBasicMaterial({ color: 0x1a1209, fog: false });
  const shoreShape = new THREE.Shape(); // XZ 폴리곤(회전 -90°) — 해안선: 둑 우단 → 근탑 앞 → 콜로네이드 밖으로 후퇴
  const COAST = [[150, 100], [150, 12], [24, -16], [-12, -46], [-38, -88], [-90, -130], [-180, -152], [-460, -160], [-460, 100]];
  shoreShape.moveTo(COAST[0][0], -COAST[0][1]); // Shape는 XY — z를 -y로 뒤집어 넣고 회전으로 복원
  for (let i = 1; i < COAST.length; i++) shoreShape.lineTo(COAST[i][0], -COAST[i][1]);
  const shore = new THREE.Mesh(new THREE.ShapeGeometry(shoreShape), shoreMat);
  shore.rotation.x = -Math.PI / 2; shore.position.y = 0.34; scene.add(shore); // 반사 스트릭(0.32) 위
  const farShore = new THREE.Mesh(new THREE.PlaneGeometry(640, 76), shoreMat); // 원안 밴드 — 도심·능선 발밑
  farShore.rotation.x = -Math.PI / 2; farShore.position.set(20, 0.34, -290); scene.add(farShore);
  // 해안선을 따라 물가 덤불 — 직선 경계 은폐
  for (let i = 1; i < COAST.length - 2; i++) {
    const [ax, az] = COAST[i], [bx2, bz2] = COAST[i + 1];
    for (let s = 0.1; s < 1; s += 0.22) { if (srand() < 0.35) continue; mkCanopy(ax + (bx2 - ax) * s + (srand() - 0.5) * 4, 0.7 + srand() * 1.2, az + (bz2 - az) * s + (srand() - 0.5) * 4, 1.0 + srand() * 1.3, vegSil); }
  }
  for (let i = 0; i < 8; i++) { const pd = new THREE.Mesh(new THREE.PlaneGeometry(6 + srand() * 6, 3 + srand() * 3), new THREE.MeshBasicMaterial({ color: 0xff8a3e, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); pd.rotation.x = -Math.PI / 2; pd.position.set(-60 + srand() * 100, 0.3, 14 + srand() * 24); scene.add(pd); }
  // ── 접근 고가 콜로네이드(좌측 프레임) — 3/4 후퇴의 최대 동인 ──
  for (let i = 0; i < 6; i++) {
    const u = i / 5, vx = -58 - u * 40, vz = -68 + u * 74, VH = 22 + u * 13;
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(3.2, VH, 3.2), s > 0 ? concLit : concShad); leg.position.set(vx + s * 3.5, VH / 2, vz); scene.add(leg); }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 6.5), concShad); cap.position.set(vx, VH + 1, vz); scene.add(cap);
    if (i < 5) { const u2 = (i + 1) / 5, vx2 = -58 - u2 * 40, vz2 = -68 + u2 * 74, VH2 = 22 + u2 * 13; link(concShad, [vx, VH + 2, vz], [vx2, VH2 + 2, vz2], 7, 2.2); }
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.4, VH * 0.55, 0.4), vegSil); sheet.position.set(vx, VH * 0.55 / 2 + 2, vz + 2.4); scene.add(sheet);
    for (let h = 0; h < 5; h++) mkVine(vx + (srand() - 0.5) * 8, VH + 1.5, vz, 3 + srand() * 5, vegSil, 0.05);
    mkCanopy(vx, 1.5, vz, 2 + srand() * 1.5, vegSil);
  }
  // ── 부서진 차(전경 좌하단 앵커) ──
  const car = new THREE.Group();
  const cB = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); car.add(m); return m; };
  cB(9.2, 1.7, 4.2, propDark, 0, 1.35, 0); cB(3.4, 0.9, 4.0, propRust, 3.1, 2.0, 0); cB(3.0, 0.9, 4.0, propRust, -3.2, 1.95, 0); cB(4.4, 1.9, 3.8, propDark, -0.2, 2.7, 0); cB(2.4, 1.0, 4.1, propDark, 4.6, 1.0, 0); cB(2.4, 1.0, 4.1, propDark, -4.6, 1.0, 0);
  const wsh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ color: 0xff9a4e, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); wsh.position.set(1.7, 2.9, 2.0); car.add(wsh);
  // 지붕·보닛 상단 엣지 림 — 해가 윗면을 긁는 '가는 선'(몸체 실루엣은 검게 유지, 과광 금지: propRust+극세)
  const rimTop = (w, d, x, y, z) => { const rm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), propRust); rm.position.set(x, y, z); car.add(rm); };
  rimTop(4.0, 0.16, -0.2, 3.66, 1.8); rimTop(2.8, 0.14, 3.15, 2.46, 1.9);
  // 위치 재접지: 종전 (-34,20)은 카메라 축 60°(반각 42°) 밖 — 여태 화면에 없던 죽은 앵커. 시축 안 3/4 각도로.
  car.position.set(-33, 1.0, -18); car.rotation.set(0, 0.8, 0.05); scene.add(car);
  for (let i = 0; i < 4; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2 + srand() * 1.4, 2.2), vegSil); v.position.set(-30 + (srand() - 0.5) * 8, 2.4 + srand() * 1.4, -14 + (srand() - 0.5) * 3); scene.add(v); }
  // ── 도로 표지(무명 — 콘텐츠 게이트) + 접지 W빔 가드레일 ──
  const sPost = new THREE.Mesh(new THREE.BoxGeometry(0.4, 12, 0.4), propDark); sPost.position.set(-50, 5.5, 30); sPost.rotation.z = 0.5; scene.add(sPost);
  const sPanel = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.35), propRust); sPanel.position.set(-52.5, 10.5, 30); sPanel.rotation.z = 0.5; scene.add(sPanel);
  for (let i = 0; i < 2; i++) mkVine(-52 + srand() * 3, 9.5, 30.3, 2 + srand() * 3, vegSil, 0.06);
  const rail = new THREE.Group();
  rail.add(new THREE.Mesh(new THREE.BoxGeometry(30, 1.1, 0.5), propDark)); const rcap = new THREE.Mesh(new THREE.BoxGeometry(30, 0.35, 0.55), propRust); rcap.position.y = 0.5; rail.add(rcap);
  for (let i = 0; i < 7; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), propDark); post.position.set(-13 + i * 4.2, -1.4, 0); rail.add(post); }
  rail.position.set(42, 2.4, 30); rail.rotation.y = -0.42; scene.add(rail);
  const brk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.4, 0.5), propDark); brk.position.set(30, 2.4, 30); brk.rotation.z = 0.5; scene.add(brk);
  for (let i = 0; i < 6; i++) mkCanopy(30 + srand() * 26, 1.2, 30, 1.4 + srand() * 1.2, vegSil);
  // ── 침몰선(우측, 원탑 옆·해 앞이라 검게) ──
  const ship = new THREE.Group();
  const sB = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); ship.add(m); return m; };
  sB(24, 6, 7, propDark, 0, 0.6, 0); const bow = sB(8, 5, 5.5, propDark, 13, 1.4, 0); bow.rotation.z = 0.12; // 들린 뱃머리
  sB(6, 4, 5, propDark, -4, 4, 0); sB(4, 3, 4, propDark, -4.4, 6.8, 0); sB(2.2, 3.6, 2.2, propRust, -1.5, 6.6, 0); // 상부구조 + 기운 굴뚝
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6, 0.32), propDark); m1.position.set(2, 4, 0); m1.rotation.z = 0.5; ship.add(m1); // 꺾인 마스트(하)
  const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.5, 0.26), propDark); m2.position.set(5.5, 5.6, 0); m2.rotation.z = 1.15; ship.add(m2); // 부러져 늘어진 상단
  const crane = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 0.3), propRust); crane.position.set(-6, 5, 1); crane.rotation.z = -0.7; ship.add(crane); // 기운 데릭
  ship.position.set(95, 0, -185); ship.rotation.set(0, -0.5, 0.42); scene.add(ship); // 더 기운 리스트
  for (let i = 0; i < 4; i++) mkCanopy(90 + srand() * 12, 2 + srand() * 3, -184 + (srand() - 0.5) * 8, 1.2 + srand(), vegSil); // 갑판 잠식(월드좌표)
  // ── 잔해 뗏목 + 붕괴 콘크리트 파편 ──
  for (let i = 0; i < 9; i++) { const rx = -30 + srand() * 120, rz = -30 - srand() * 115; const raft = new THREE.Mesh(new THREE.BoxGeometry(3 + srand() * 4, 0.5, 2 + srand() * 2), propDark); raft.position.set(rx, 0.3, rz); raft.rotation.y = srand() * 3; scene.add(raft); const veg = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.5), vegSil); veg.position.set(rx, 0.6, rz); scene.add(veg); }
  for (let i = 0; i < 5; i++) { const ch = new THREE.Mesh(new THREE.BoxGeometry(2 + srand() * 3, 1.5 + srand() * 2, 2 + srand() * 2), concShad); ch.position.set(-8 + srand() * 24, 0.6, -76 - srand() * 24); ch.rotation.set(srand(), srand() * 3, srand() * 0.4); scene.add(ch); }
  // 잔돌·파편 스캐터 — 탑 발치·전경의 딱딱한 직선 실루엣을 부순다(작은 불규칙 박스)
  for (const [bx, bz, br, n] of [[NT[0], NT[2], 9, 10], [-30, 20, 20, 12], [42, 30, 16, 8], [-58, -30, 14, 7]]) {
    for (let i = 0; i < n; i++) { const rk = new THREE.Mesh(new THREE.BoxGeometry(0.5 + srand() * 1.4, 0.4 + srand() * 1.0, 0.5 + srand() * 1.2), srand() < 0.5 ? concShad : propDark); rk.position.set(bx + (srand() - 0.5) * br, 0.3 + srand() * 0.6, bz + (srand() - 0.5) * br * 0.7); rk.rotation.set(srand() * 0.5, srand() * 3, srand() * 0.4); scene.add(rk); }
  }
  // ── 물: 단일 골드 반사 기둥(냉색 없음) ──
  const wcv = document.createElement('canvas'); wcv.width = 256; wcv.height = 256; const wg = wcv.getContext('2d');
  const waterTex = new THREE.CanvasTexture(wcv); waterTex.colorSpace = THREE.SRGBColorSpace;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 520), new THREE.MeshBasicMaterial({ map: waterTex, fog: false })); water.rotation.x = -Math.PI / 2; water.position.set(20, 0, -160); scene.add(water);
  // 해 아래 녹은 금빛 반사 기둥(하늘 광휘를 전경 값역과 잇는다)
  const refCv = document.createElement('canvas'); refCv.width = 16; refCv.height = 128; const rfg = refCv.getContext('2d');
  const rfgr = rfg.createLinearGradient(0, 0, 0, 128); rfgr.addColorStop(0, 'rgba(255,207,122,0.55)'); rfgr.addColorStop(0.6, 'rgba(210,110,44,0.2)'); rfgr.addColorStop(1, 'rgba(122,48,16,0)');
  rfg.fillStyle = rfgr; rfg.fillRect(0, 0, 16, 128);
  const refTex = new THREE.CanvasTexture(refCv);
  // 2겹 가산 기둥: 좁고 진한 코어 + 넓고 옅은 브로드 — 헤이즈 밴드 위에서도 '불타는' 반사가 살아남는다
  const mkStreak = (w2, len, op, z) => { const st = new THREE.Mesh(new THREE.PlaneGeometry(w2, len), new THREE.MeshBasicMaterial({ map: refTex, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); st.rotation.x = -Math.PI / 2; st.position.set(72, 0.32, z); scene.add(st); return st; };
  const streakCore = mkStreak(26, 330, 0.72, -190), streakBroad = mkStreak(64, 300, 0.3, -180); // update에서 일렁임
  // cool 0=앰버(비네트 원본) 1=한랭(24h 주간·심야) — 물빛을 슬레이트로 민다. 기본값이 원본이라 비네트 무변.
  const _wmix = (a, b, k) => Math.round(a + (b - a) * k);
  const drawWater = (kn, t, cool = 0) => {
    const C = (wr, wgn, wb, cr, cg2b, cb) => _wmix(wr, cr, cool) + ',' + _wmix(wgn, cg2b, cool) + ',' + _wmix(wb, cb, cool);
    wg.fillStyle = cool < 0.5 ? '#160f0a' : '#0e1216'; wg.fillRect(0, 0, 256, 256);
    const wgr = wg.createLinearGradient(0, 0, 0, 256);
    wgr.addColorStop(0, 'rgba(' + C(70, 46, 28, 56, 68, 76) + ',' + (0.5 + 0.3 * kn) + ')'); wgr.addColorStop(0.5, 'rgba(' + C(40, 28, 18, 32, 40, 46) + ',0.5)'); wgr.addColorStop(1, 'rgba(' + C(14, 10, 8, 10, 13, 16) + ',0.9)');
    wg.fillStyle = wgr; wg.fillRect(0, 0, 256, 256);
    // 수평선 워터라인 — 해수면이 하늘 광휘를 되받는 밝은 띠(제목의 '불타는'을 물에 싣는다)
    const wl = wg.createLinearGradient(0, 0, 0, 10);
    wl.addColorStop(0, 'rgba(' + C(255, 196, 96, 190, 205, 214) + ',' + (0.75 * kn) + ')'); wl.addColorStop(1, 'rgba(' + C(255, 150, 60, 150, 170, 184) + ',0)');
    wg.fillStyle = wl; wg.fillRect(96, 0, 150, 10);
    // 주 글린트 기둥(해 아래) — 폭·밀도·알파 증폭 + 잔물결 지그재그
    for (let i = 0; i < 58; i++) { const ry = 4 + i * 4.3, rw = 1.6 + Math.sin(i * 0.7 + t * 5) * 1.3; wg.globalAlpha = 0.72 * (1 - i / 62); wg.fillStyle = 'rgba(' + C(255, 190, 84, 185, 200, 210) + ',' + (0.8 * kn) + ')'; const jw = 42 + rw * 9; wg.fillRect(145 + Math.sin(i * 0.9 + t * 6) * 7 - jw / 2 + 21, ry, jw, 2.6); }
    // 흩어진 파편 글린트(기둥 밖) — 해협 전체가 낱낱이 탄다
    for (let i = 0; i < 26; i++) { const sy = 8 + ((i * 47) % 120), sx = 60 + ((i * 83) % 150); wg.globalAlpha = 0.3 * (1 - sy / 150); wg.fillStyle = 'rgba(' + C(255, 170, 70, 170, 186, 198) + ',' + (0.55 * kn) + ')'; wg.fillRect(sx + Math.sin(i * 2.1 + t * 4) * 4, sy, 7 + ((i * 13) % 12), 1.6); }
    wg.globalAlpha = 1; waterTex.needsUpdate = true;
  };
  // ── 재/불씨(따뜻한 금빛 재) ──
  const emN = 44, emArr = new Float32Array(emN * 3), emSeed = [];
  for (let i = 0; i < emN; i++) { emArr[i * 3] = -110 + srand() * 220; emArr[i * 3 + 1] = 1 + srand() * 26; emArr[i * 3 + 2] = -80 + srand() * 60; emSeed.push(srand() * 6.28); } // 하단 온기대에만 (하늘의 별처럼 읽히지 않게)
  const emGeo = new THREE.BufferGeometry(); emGeo.setAttribute('position', new THREE.BufferAttribute(emArr, 3));
  const emMat = new THREE.PointsMaterial({ color: 0xffc070, size: 2.4, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, sizeAttenuation: false });
  scene.add(new THREE.Points(emGeo, emMat));
  // ── 구름: 상단 갈색 폭풍 덩어리(비가산) + 해 근처 금빛 가산 ──
  const scv = document.createElement('canvas'); scv.width = 256; scv.height = 96; const scg = scv.getContext('2d');
  for (const [sx, sy, sw2, sh, a] of [[10, 30, 236, 26, 0.6], [50, 14, 150, 18, 0.45], [80, 52, 160, 20, 0.5]]) { const lg = scg.createRadialGradient(sx + sw2 / 2, sy + sh / 2, 2, sx + sw2 / 2, sy + sh / 2, sw2 / 2); lg.addColorStop(0, 'rgba(255,255,255,' + a + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)'); scg.save(); scg.translate(sx + sw2 / 2, sy + sh / 2); scg.scale(1, sh / sw2); scg.translate(-(sx + sw2 / 2), -(sy + sh / 2)); scg.fillStyle = lg; scg.beginPath(); scg.arc(sx + sw2 / 2, sy + sh / 2, sw2 / 2, 0, 6.283); scg.fill(); scg.restore(); }
  const stormTex = new THREE.CanvasTexture(scv); stormTex.colorSpace = THREE.SRGBColorSpace;
  const stormMat = new THREE.SpriteMaterial({ map: stormTex, color: 0x3a2c1e, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  for (const [cx5, cy5, csc] of [[-40, 74, 220], [60, 88, 240], [10, 66, 180]]) { const cl = new THREE.Sprite(stormMat); cl.position.set(cx5, cy5, -256); cl.scale.set(csc, csc * 0.22, 1); scene.add(cl); }
  const goldCloudMat = new THREE.SpriteMaterial({ map: stormTex, color: 0xff9a4c, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  for (const [cx5, cy5, csc] of [[62, 34, 150], [46, 48, 130], [78, 40, 120]]) { const cl = new THREE.Sprite(goldCloudMat); cl.position.set(cx5, cy5, -250); cl.scale.set(csc, csc * 0.2, 1); scene.add(cl); }
  // ── 층간 안개 밴드(깊이 이음새마다, 따뜻한색) ──
  const zcv = document.createElement('canvas'); zcv.width = 32; zcv.height = 64; const zg = zcv.getContext('2d'); const zgr = zg.createLinearGradient(0, 0, 0, 64);
  zgr.addColorStop(0, 'rgba(255,255,255,0)'); zgr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); zgr.addColorStop(1, 'rgba(255,255,255,0)'); zg.fillStyle = zgr; zg.fillRect(0, 0, 32, 64);
  const hazeTex = new THREE.CanvasTexture(zcv); const hazeMats = []; const hazeSpec = [[0x6a3a1e, 0xff9a4e], [0x52281a, 0xe07a34], [0x3a1c14, 0xc86028]];
  const hazeZ = [[8, -70, 20], [7, -140, 26], [6, -250, 34]];
  for (let i = 0; i < 3; i++) { const hm = new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, opacity: [0.5, 0.44, 0.34][i], depthWrite: false, fog: false, color: hazeSpec[i][1] }); const hp = new THREE.Mesh(new THREE.PlaneGeometry(700, hazeZ[i][2]), hm); hp.position.set(70, hazeZ[i][0], hazeZ[i][1]); scene.add(hp); hazeMats.push(hm); }
  // ── 하늘 램프(6스톱, 따뜻한 앰버 — 절대 보라로 가지 않는다) ──
  const SKY = [[0x140e09, 0x1e130c, 0.0], [0x261810, 0x50301c, 0.22], [0x4e2a14, 0xa8481e, 0.46], [0x702e14, 0xd85c20, 0.66], [0x883818, 0xef8830, 0.83], [0x9a5a28, 0xffe6a0, 1.0]]; // 상단=묵직한 역광 폭풍 천장 — 중단을 크림슨으로(레퍼런스 '붉은' 푸시, 보라 금지 유지)
  const skyC = SKY.map(() => new THREE.Color());
  // ── 24h 모드 전용 오브젝트(비네트 기본값 = 꺼짐) — 별밭 + 주탑 항공등 ──
  const ggStGeo = new THREE.BufferGeometry(); const ggStPos = [];
  for (let i = 0; i < 260; i++) ggStPos.push(-300 + srand() * 620, 30 + srand() * 170, -338);
  ggStGeo.setAttribute('position', new THREE.Float32BufferAttribute(ggStPos, 3));
  const ggStMat = new THREE.PointsMaterial({ color: 0xcdd8ff, size: 1.3, transparent: true, opacity: 0, fog: false, sizeAttenuation: false });
  const ggStars = new THREE.Points(ggStGeo, ggStMat); ggStars.raycast = () => {}; scene.add(ggStars);
  const bcnMat = new THREE.MeshBasicMaterial({ color: 0xff3826, transparent: true, opacity: 0, fog: false });
  for (const [bx3, by3, bz3] of [[-23, 41.5, -64], [46, 35.8, -210]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bcnMat); b.position.set(bx3, by3, bz3); scene.add(b); }

  const update = (t) => {
    const kn = 1 - t * 0.62; // 1=만개한 노을 → 0.38 짙은 어스름
    camera.position.set(-8 + 3 * t, 12, 40 - 8 * t); camera.up.set(Math.sin(t * 0.14) * 0.04, 1, 0); camera.lookAt(10 + 4 * t, 16 - 1.5 * t, -150);
    const g2 = skyCv.getContext('2d'); const gr2 = g2.createLinearGradient(0, 0, 0, 1024);
    for (let i = 0; i < SKY.length; i++) { lerpC(SKY[i][0], SKY[i][1], kn, skyC[i]); gr2.addColorStop(SKY[i][2], '#' + skyC[i].getHexString()); }
    g2.fillStyle = gr2; g2.fillRect(0, 0, 2, 1024); skyTex.needsUpdate = true;
    const sunY = 4 - 8 * t; sun.position.y = sunY; lerpC(0xff9a3c, 0xfff2d8, kn, sunMat.color);
    glowCore.position.set(80, sunY, -329); glowMid.position.set(80, sunY, -329); glowWide.position.set(80, sunY, -329);
    hotCore.position.set(80, sunY, -328); hotCore.material.opacity = 0.7 + 0.25 * kn;
    glowCore.material.opacity = 0.85 + 0.1 * Math.sin(t * 40); glowMid.material.opacity = 0.5 + 0.4 * (1 - kn); glowWide.material.opacity = 0.24 + 0.24 * (1 - kn);
    lerpC(0x2a1c12, 0x8a5a30, kn, scene.fog.color);
    lerpC(0x1a0f08, 0x6a4426, kn, steelLit.color);
    lerpC(0x0e110a, 0x1a2010, kn, vegSil.color);   // 넝쿨 가닥 — 카키 쪽으로(앰버 씬에서 녹색이 튀지 않게)
    lerpC(0x1e1808, 0x4a3a1a, kn, vegRim.color);
    lerpC(0x0d120a, 0x1c2612, kn, leafSil.color);  // 잎 몸통 = 어두운 올리브 실루엣(빛나지 않게)
    lerpC(0x201808, 0x483a1c, kn, leafRim.color);  // 잎 상단 = warm rim(해가 뒤라 윗엣지만 달궈짐)
    lerpC(0x140b08, 0x5a2c18, kn, propRust.color);
    lerpC(0x1a1009, 0x4a2e1e, kn, concLit.color);
    lerpC(0x1c0d14, 0x3a2028, kn, cityMat.color);
    lerpC(0x180f0a, 0x2a1e16, kn, hillMat.color);
    for (let i = 0; i < 3; i++) lerpC(hazeSpec[i][0], hazeSpec[i][1], kn, hazeMats[i].color);
    lerpC(0x241a12, 0xff9a4c, kn, goldCloudMat.color);
    for (let i = 0; i < emN; i++) { emArr[i * 3 + 1] += 0.05; emArr[i * 3] += Math.sin(t * 6 + emSeed[i]) * 0.06; if (emArr[i * 3 + 1] > 28) emArr[i * 3 + 1] = 1; }
    emGeo.attributes.position.needsUpdate = true; emMat.opacity = 0.28 + 0.14 * Math.sin(t * 26) * Math.sin(t * 7 + 1);
    for (const v of swayG) v.g.rotation.z = Math.sin(t * 1.3 + v.seed) * v.amp; // 살아 있는 초목의 흔들림
    // 반사 기둥 일렁임 — 폭·밝기를 서로 다른 위상으로 (물이 살아 있게)
    streakCore.scale.x = 1 + Math.sin(t * 34) * 0.07 + Math.sin(t * 9) * 0.04;
    streakCore.material.opacity = (0.6 + 0.14 * Math.sin(t * 27 + 1)) * (0.4 + 0.6 * kn);
    streakBroad.scale.x = 1 + Math.sin(t * 21 + 2) * 0.05;
    streakBroad.material.opacity = (0.26 + 0.08 * Math.sin(t * 16)) * (0.4 + 0.6 * kn);
    drawWater(kn, t);
  };
  // ── 24h 하네스 모드 (디렉터 2026-07-23: "이 각도에서 진짜 24시간 — 해 뜨고 지는 게 아니라") ──
  //   인게임 비네트(update)는 불변. 5키프레임(심야·여명·주간·골든·어스름) 팔레트를 시각으로 블렌드.
  //   주간 = 저채도 한랭 겨울광(씬의 앰버는 골든아워에만) · 심야 = 별밭+항공등 · 물빛은 cool 축으로 동행.
  const KEY = {
    night: { sky: [0x05070c, 0x070a12, 0x0a0e18, 0x0d1220, 0x101626, 0x141a2e], fog: 0x0a0e16, steelLit: 0x10141c, vegSil: 0x0a0e0a, vegRim: 0x141810, leafSil: 0x0a0e0a, leafRim: 0x12160e, propRust: 0x12100c, concLit: 0x14120e, city: 0x0c0a12, hill: 0x0a0c10, shore: 0x0b0a08, haze: [0x0c1018, 0x0a0d14, 0x080b10], gold: 0x0a0c12, sunY: -12, sunOp: 0, glow: [0, 0, 0], hot: 0, stars: 0.9, bcn: 1, waterKn: 0.03, cool: 0.9, storm: 0.22, ember: 0.1, rays: 0 },
    // 여명 = 장미-앰버(씬 규율 '보라 금지' 준수 — 자주 스톱 제거)
    dawn: { sky: [0x1c161e, 0x322026, 0x543438, 0x84483a, 0xb06a40, 0xe09a5c], fog: 0x3a2e30, steelLit: 0x2e2430, vegSil: 0x16200f, vegRim: 0x2c3018, leafSil: 0x121a0e, leafRim: 0x2a2c16, propRust: 0x2c2018, concLit: 0x2a2220, city: 0x1e1626, hill: 0x1c161a, shore: 0x201a14, haze: [0x503a44, 0x3e2e3c, 0x2c2230], gold: 0x8a5a4c, sunY: -1.5, sunOp: 0.9, glow: [0.5, 0.35, 0.2], hot: 0.35, stars: 0.12, bcn: 0.3, waterKn: 0.3, cool: 0.45, storm: 0.4, ember: 0.15, rays: 0.05 },
    day: { sky: [0x4e5c68, 0x6a7a84, 0x8c9aa0, 0xa2aeac, 0xb2bab2, 0xc2c8bc], fog: 0x8e9890, steelLit: 0x6a5f4e, vegSil: 0x2e3a20, vegRim: 0x5a6030, leafSil: 0x28321c, leafRim: 0x525a2c, propRust: 0x5c4430, concLit: 0x6a5c48, city: 0x3e3a44, hill: 0x3a3630, shore: 0x4a4234, haze: [0x9aa49c, 0x8a948e, 0x7a847e], gold: 0x9aa4a2, sunY: 30, sunOp: 0.35, glow: [0.18, 0.1, 0.05], hot: 0.12, stars: 0, bcn: 0, waterKn: 0.22, cool: 0.85, storm: 0.5, ember: 0.06, rays: 0.03 },
    golden: { sky: [0x1e130c, 0x50301c, 0xa8481e, 0xd85c20, 0xef8830, 0xffe6a0], fog: 0x8a5a30, steelLit: 0x6a4426, vegSil: 0x1a2010, vegRim: 0x4a3a1a, leafSil: 0x1c2612, leafRim: 0x483a1c, propRust: 0x5a2c18, concLit: 0x4a2e1e, city: 0x3a2028, hill: 0x2a1e16, shore: 0x241812, haze: [0xff9a4e, 0xe07a34, 0xc86028], gold: 0xff9a4c, sunY: 4, sunOp: 1, glow: [0.9, 0.9, 0.48], hot: 0.95, stars: 0, bcn: 0, waterKn: 1, cool: 0, storm: 0.85, ember: 0.4, rays: 0.16 },
    dusk: { sky: [0x140e09, 0x261810, 0x4e2a14, 0x702e14, 0x883818, 0x9a5a28], fog: 0x2a1c12, steelLit: 0x1a0f08, vegSil: 0x0e110a, vegRim: 0x1e1808, leafSil: 0x0d120a, leafRim: 0x201808, propRust: 0x140b08, concLit: 0x1a1009, city: 0x1c0d14, hill: 0x180f0a, shore: 0x120d08, haze: [0x6a3a1e, 0x52281a, 0x3a1c14], gold: 0x241a12, sunY: -6, sunOp: 0.5, glow: [0.55, 0.7, 0.4], hot: 0.3, stars: 0.25, bcn: 0.6, waterKn: 0.25, cool: 0.25, storm: 0.7, ember: 0.35, rays: 0.05 },
  };
  const SCHED = [[0, 'night', 'night'], [4.8, 'night', 'dawn'], [6.8, 'dawn', 'day'], [8.8, 'day', 'day'], [15.2, 'day', 'golden'], [17.0, 'golden', 'dusk'], [19.2, 'dusk', 'night'], [21.2, 'night', 'night'], [24, 'night', 'night']];
  const _hc1 = new THREE.Color(), _hc2 = new THREE.Color(), _hOut = new THREE.Color();
  const hlerp = (h1, h2, k, tgt) => { _hc1.setHex(h1); _hc2.setHex(h2); tgt.copy(_hc1).lerp(_hc2, k); return tgt; };
  const nlerp = (a, b, k) => a + (b - a) * k;
  const atHour = (h, t) => {
    let A = KEY.night, B = KEY.night, k = 0;
    for (let i = 0; i < SCHED.length - 1; i++) { if (h >= SCHED[i][0] && h < SCHED[i + 1][0]) { A = KEY[SCHED[i][1]]; B = KEY[SCHED[i][2]]; k = (h - SCHED[i][0]) / (SCHED[i + 1][0] - SCHED[i][0]); break; } }
    const g2 = skyCv.getContext('2d'); const gr2 = g2.createLinearGradient(0, 0, 0, 1024);
    for (let i = 0; i < 6; i++) { hlerp(A.sky[i], B.sky[i], k, _hOut); gr2.addColorStop(SKY[i][2], '#' + _hOut.getHexString()); }
    g2.fillStyle = gr2; g2.fillRect(0, 0, 2, 1024); skyTex.needsUpdate = true;
    const sunY = nlerp(A.sunY, B.sunY, k), sunOp = nlerp(A.sunOp, B.sunOp, k);
    sun.position.y = sunY; sunMat.transparent = true; sunMat.opacity = sunOp;
    sunMat.color.setHex(sunY > 12 ? 0xf2ece0 : 0xffd23e); // 높은 해 = 창백한 겨울 원반
    const gy2 = Math.max(sunY, -2);
    glowCore.position.set(80, gy2, -329); glowMid.position.set(80, gy2, -329); glowWide.position.set(80, gy2, -329); hotCore.position.set(80, sunY, -328);
    glowCore.material.opacity = nlerp(A.glow[0], B.glow[0], k) * (1 + 0.08 * Math.sin(t * 40));
    glowMid.material.opacity = nlerp(A.glow[1], B.glow[1], k);
    glowWide.material.opacity = nlerp(A.glow[2], B.glow[2], k);
    hotCore.material.opacity = nlerp(A.hot, B.hot, k);
    hlerp(A.fog, B.fog, k, scene.fog.color);
    hlerp(A.steelLit, B.steelLit, k, steelLit.color); hlerp(A.vegSil, B.vegSil, k, vegSil.color); hlerp(A.vegRim, B.vegRim, k, vegRim.color);
    hlerp(A.leafSil, B.leafSil, k, leafSil.color); hlerp(A.leafRim, B.leafRim, k, leafRim.color);
    hlerp(A.propRust, B.propRust, k, propRust.color); hlerp(A.concLit, B.concLit, k, concLit.color);
    hlerp(A.city, B.city, k, cityMat.color); hlerp(A.hill, B.hill, k, hillMat.color);
    hlerp(A.shore, B.shore, k, shoreMat.color); hlerp(A.shore, B.shore, k, bankMat.color);
    for (let i = 0; i < 3; i++) hlerp(A.haze[i], B.haze[i], k, hazeMats[i].color);
    hlerp(A.gold, B.gold, k, goldCloudMat.color);
    stormMat.opacity = nlerp(A.storm, B.storm, k);
    ggStMat.opacity = nlerp(A.stars, B.stars, k) * (0.8 + 0.2 * Math.sin(t * 9));
    bcnMat.opacity = nlerp(A.bcn, B.bcn, k) * (Math.sin(t * 14) > 0 ? 0.95 : 0.2); // 항공등 점멸
    for (const rp of rayPans) rp.opacity = nlerp(A.rays, B.rays, k);
    for (let i = 0; i < emN; i++) { emArr[i * 3 + 1] += 0.05; emArr[i * 3] += Math.sin(t * 6 + emSeed[i]) * 0.06; if (emArr[i * 3 + 1] > 28) emArr[i * 3 + 1] = 1; }
    emGeo.attributes.position.needsUpdate = true; emMat.opacity = nlerp(A.ember, B.ember, k) * (0.75 + 0.25 * Math.sin(t * 26));
    for (const v of swayG) v.g.rotation.z = Math.sin(t * 1.3 + v.seed) * v.amp;
    const wkn = nlerp(A.waterKn, B.waterKn, k), cool = nlerp(A.cool, B.cool, k);
    streakCore.scale.x = 1 + Math.sin(t * 34) * 0.07; streakCore.material.opacity = (0.5 + 0.1 * Math.sin(t * 27)) * wkn;
    streakBroad.scale.x = 1 + Math.sin(t * 21 + 2) * 0.05; streakBroad.material.opacity = 0.3 * wkn;
    drawWater(wkn, t, cool);
  };
  update(0);
  return { scene, camera, update, atHour };
}
export function playGoldenGateVignette() {
  playVignette(() => buildGoldenGateScene(), 12000, () => {
    state.sights = state.sights || {};
    const first = !state.sights.goldenGate;
    state.sights.goldenGate = (state.sights.goldenGate || 0) + 1;
    addMoodBuff(2, 1);                                              // 익일 무드: 그 다리를 생각했다
    state.dayLog.notes.push(t('sight.goldenGate.note'));
    if (first) jackpotToast(`${t('sight.goldenGate.first')}`, 0xff6a3a);
    scheduleSave();
  });
}
/* ── #150 희귀템 발견 컷: 인엔진 디오라마 (Tier6a 이관 — 원문 그대로, 로직 무변) ──
   시그니처 도면(지역 독점 가구)을 손에 넣는 순간, 그 가구를 '실제 복셀 메시'로 페데스탈 위에 올려
   따뜻한 스팟 + 반짝임 + 느린 카메라 푸시로 보여준다 — 도파민 루프(REWARD-LOOP ②)의 정점 연출.
   트리거 큐(queueDiscovery/drain)는 game.js 소유 — 여기는 씬 빌더+연출만. */
function buildDiscoveryScene(defId, colorIdx, tier) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  // 어두운 배경(따뜻한 하단) + 얕은 포그
  const bgcv = document.createElement('canvas'); bgcv.width = 8; bgcv.height = 256;
  const bgg = bgcv.getContext('2d'); const bgr = bgg.createLinearGradient(0, 0, 0, 256);
  bgr.addColorStop(0, '#080706'); bgr.addColorStop(0.62, '#130d08'); bgr.addColorStop(1, '#20140b');
  bgg.fillStyle = bgr; bgg.fillRect(0, 0, 8, 256);
  const bgTex = new THREE.CanvasTexture(bgcv); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;
  scene.fog = new THREE.Fog(0x0a0806, 7, 24);
  // 조명: 따뜻한 키(위-앞) + 차가운 림 + 약한 앰비언트
  scene.add(new THREE.HemisphereLight(0x3a3122, 0x0a0806, 0.55));
  const key = new THREE.PointLight(0xffd7a0, 26, 16, 1.8); key.position.set(1.6, 3.4, 2.8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ea6c8, 0.55); rim.position.set(-3.5, 2.2, -3); scene.add(rim);
  // 돌 페데스탈
  const pmat = new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.96, metalness: 0 });
  const ped = new THREE.Group();
  const ptop = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.28, 0.28, 28), pmat); ptop.position.y = 0; ped.add(ptop);
  ped.add(new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.06, 1.7, 28), pmat)).position.y = -0.99;
  scene.add(ped);
  // 아이템: 실제 복셀 가구 메시 (def.build 재사용). 바운딩박스로 스케일·발치 접지.
  const holder = new THREE.Group(); scene.add(holder);
  const def = DEFS[defId];
  try {
    // #192 클로즈업 등급: 컷 전용 하이디테일 빌더(def.closeup, 폴리 4~5k 허용)가 있으면 우선.
    //   배치본과 실루엣·팔레트 동일이 규약(디렉터 오더 2026-07-16) — 없으면 배치본 그대로.
    const item = (def.closeup || def.build)(def.colors ? def.colors[colorIdx] : 0, colorIdx || 0, null, tier || 3);
    // #192 후속(디렉터 2026-07-17): 광원 가구는 컷에서도 빛난다 — 배치본의 def.light를 컷 씬에 재현.
    //   (네온은 build 내장 광원이라 원래 빛남 — LED 바·랜턴·양초류처럼 buildItemGroup이 광원을 다는
    //   def.light 계열은 컷에서 광원이 통째로 빠져 있었다. 위치는 아이템 로컬 — 스케일에 같이 접힌다.)
    if (def.light) {
      const L = def.light;
      const pl = new THREE.PointLight(L.color || 0xffcf9a, L.intensity || 6, L.dist || 6, 1.6);
      pl.position.set(L.x || 0, L.y || 1.0, L.z || 0);
      item.add(pl);
    }
    holder.add(item);
    const bb = new THREE.Box3().setFromObject(item); const sz = new THREE.Vector3(); bb.getSize(sz); const ctr = new THREE.Vector3(); bb.getCenter(ctr);
    const sc = 1.75 / (Math.max(sz.x, sz.y, sz.z) || 1);
    item.scale.setScalar(sc);
    item.position.set(-ctr.x * sc, -bb.min.y * sc + 0.16, -ctr.z * sc);
  } catch (e) { /* 빌드 실패 시 페데스탈만 */ }
  // 바닥 따뜻한 광 웅덩이
  const poolCv = document.createElement('canvas'); poolCv.width = poolCv.height = 128;
  const pg = poolCv.getContext('2d'); const prg = pg.createRadialGradient(64, 64, 4, 64, 64, 64);
  prg.addColorStop(0, 'rgba(255,192,112,0.55)'); prg.addColorStop(1, 'rgba(255,192,112,0)');
  pg.fillStyle = prg; pg.fillRect(0, 0, 128, 128);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(poolCv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.16; scene.add(pool);
  // 반짝임(상승 먼지)
  const spN = 70, spPos = new Float32Array(spN * 3);
  for (let i = 0; i < spN; i++) { const a = Math.random() * 6.283, r = 0.3 + Math.random() * 1.7; spPos[i * 3] = Math.cos(a) * r; spPos[i * 3 + 1] = Math.random() * 2.6; spPos[i * 3 + 2] = Math.sin(a) * r; }
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffdca0, size: 0.055, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(sparks);
  const update = (t) => {
    const ang = 0.55 + t * 0.5 + Math.sin(t * Math.PI) * 0.1;   // 느린 오빗
    const dist = 6.4 - t * 1.5, cy = 2.3 - t * 0.55;             // 푸시인 + 하강
    camera.position.set(Math.sin(ang) * dist, cy, Math.cos(ang) * dist); camera.lookAt(0, 1.0, 0);
    holder.rotation.y = 0.3 + t * 1.1;                           // 아이템 회전
    const pa = sparks.geometry.attributes.position;
    for (let i = 0; i < spN; i++) { let y = pa.getY(i) + 0.005; if (y > 2.6) y = 0; pa.setY(i, y); }
    pa.needsUpdate = true;
    sparks.material.opacity = 0.5 + 0.4 * Math.sin(t * 9);
    key.intensity = 26 + Math.sin(t * 7) * 3;                    // 은은한 촛불 깜빡임
  };
  update(0);
  return { scene, camera, update };
}
export function showDiscoveryVignette(defId, colorIdx, tier, name) {
  const cap = document.createElement('div');
  cap.style.cssText = 'position:fixed;left:0;right:0;bottom:12%;z-index:402;text-align:center;pointer-events:none;opacity:0;transition:opacity .9s;font-family:DungGeunMo,monospace';
  cap.innerHTML = '<div style="font-size:calc(13px*var(--uiz,1));letter-spacing:3px;color:#c9b795">' + t('discovery.rareHeader') +
    '</div><div style="font-size:calc(26px*var(--uiz,1));color:#f2e6c8;text-shadow:0 0 22px rgba(255,190,110,.5);margin-top:6px">' + name + '</div>';
  document.body.appendChild(cap);
  setTimeout(() => { cap.style.opacity = '1'; }, 550);
  try { playSfx('sting', { vol: 0.5 }); } catch (e) {}
  playVignette(() => buildDiscoveryScene(defId, colorIdx, tier), 5200, () => { cap.style.opacity = '0'; setTimeout(() => cap.remove(), 800); });
}
// ── 플래그 공유 (game.js 잔류 러너: 무너진 입구·발코니 트리거가 점유 상태를 본다) ──
export const vignetteBusy = () => vignetteActive;
export function claimVignette() { if (vignetteActive) return false; vignetteActive = true; return true; }
export function releaseVignette() { vignetteActive = false; }
