/* 항공뷰 지도 S1 프로토타입 (AERIAL-MAP 개정 1차) — QA/디렉터 판단물 전용, 플레이어 진입점 없음.
 *   단일 라이브 도시 디오라마 + 카메라 2상태(overview↔focus 연속 돌리 줌).
 *   렌더는 본편 파이프(rt→post 양자화/디더/팔레트)를 그대로 탄다 — 픽셀 룩 판정이 S1의 목적.
 *   실시간: update(ctx)가 매 프레임 본편 상태(gameHour·weather)를 구독한다. 자체 시계 없음.
 *   S2에서 ui/mapview.js로 정식화 예정 — 여기서는 씬·조명·카메라만. (노드 오버레이 DOM은 S2)
 */
import * as THREE from 'three';
import { seededRand } from '../lib/helpers.js';

// ── 시간대 조명 키프레임 (겨울 잿빛 도시 — 본편 무드 근사, S2에서 본편 applyTimeLighting과 통일 예정) ──
//   [hour, sky, fog, hemiSky, hemiGround, sunColor, sunInt, sunElev(deg), night(0~1)]
//   밤의 sun은 '달'로 재해석(int 0.28) — 완전 소등은 실루엣이 죽는다(1차 캡처 검거: 밤 과암전).
const LIGHT_KEYS = [
  [0,  0x0d1220, 0x0d1220, 0x3e4f78, 0x0c1018, 0x8aa0d0, 0.28, 42, 1.0],
  [5,  0x101527, 0x101526, 0x44507a, 0x0d1119, 0xa090a0, 0.22, 30, 0.9],
  [7,  0x3a4052, 0x343a4a, 0x66738e, 0x1c2028, 0xe0a060, 0.70, 12, 0.25],
  [9,  0x4a5262, 0x424a58, 0x707c94, 0x222630, 0xd8d2c4, 1.00, 30, 0.0],
  [15, 0x485064, 0x40485a, 0x6c7890, 0x20242e, 0xcfc9bd, 0.95, 26, 0.0],
  [18, 0x5a3346, 0x4a2c3c, 0x6a4a60, 0x1a1420, 0xff8040, 0.50, 8,  0.35],
  [20, 0x1a1e30, 0x181c2c, 0x46557e, 0x101320, 0xb08060, 0.24, 18, 0.8],
  [24, 0x0d1220, 0x0d1220, 0x3e4f78, 0x0c1018, 0x8aa0d0, 0.28, 42, 1.0],
];
function lightAt(hour) {
  let a = LIGHT_KEYS[0], b = LIGHT_KEYS[LIGHT_KEYS.length - 1];
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++)
    if (hour >= LIGHT_KEYS[i][0] && hour <= LIGHT_KEYS[i + 1][0]) { a = LIGHT_KEYS[i]; b = LIGHT_KEYS[i + 1]; break; }
  const t = b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0]);
  const cl = (i) => new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t);
  const nm = (i) => a[i] + (b[i] - a[i]) * t;
  return { sky: cl(1), fog: cl(2), hemiSky: cl(3), hemiGround: cl(4), sunColor: cl(5), sunInt: nm(6), sunElev: nm(7), night: nm(8) };
}

// 노드 정의 (S1: 서부 2권역만 — 정본화는 S2 mapnodes.js로)
const NODES = {
  residential: { x: -46, z: 34 },
  slum: { x: 38, z: 50 },
};

export function makeAerialProto() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 2, 900);
  let built = false, active = false;
  const rand = seededRand(4242);

  // 날씨 룩 스왑용 버퍼 (건물 지붕 적설 — 인스턴스 컬러 2벌 사전 계산)
  let bld = null, bldDry = null, bldSnow = null, winMat = null, firePt = null, fireCone = null;
  let snowPts = null, beacons = [], groundMat = null, roadMat = null;
  let ogMesh = null, ogInfo = { years: 0, winter: false, count: 0, parts: 0, lots: 0 }; // 잠식 QA 훅
  const hemi = new THREE.HemisphereLight(0x3a4256, 0x14161e, 0.9);
  const sun = new THREE.DirectionalLight(0xd8d2c4, 0.8);

  // env = { day, winter } — 잠식 연차·계절 팔레트의 입력. 씬 생성 시점에 한 번 굳는다(#71과 동일 규약:
  //   하루가 넘어가도 즉시 갱신하지 않고 다음 로드에 반영. 결정론 유지).
  function build(env = {}) {
    const ctxYears = () => env.day || 1;
    const ctxWinter = () => !!env.winter;
    scene.fog = new THREE.FogExp2(0x40485a, 0.0052);
    scene.add(hemi); scene.add(sun); sun.position.set(60, 80, 40);
    // ── 지면 + 도로 격자 ──
    groundMat = new THREE.MeshLambertMaterial({ color: 0x191c22 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);
    roadMat = new THREE.MeshLambertMaterial({ color: 0x232730 });
    const roadG = new THREE.PlaneGeometry(1, 1);
    for (let i = -6; i <= 6; i++) {
      const h = new THREE.Mesh(roadG, roadMat); h.rotation.x = -Math.PI / 2;
      h.scale.set(320, 4.2, 1); h.position.set(0, 0.0, i * 24 + 6); scene.add(h);
      const v = new THREE.Mesh(roadG, roadMat); v.rotation.x = -Math.PI / 2;
      v.scale.set(4.2, 320, 1); v.position.set(i * 24 - 6, 0.0, 0); scene.add(v);
    }
    // ── 폐허 건물 (디렉터 오더: "네모로 퉁치지 말 것 — 폭격으로 부서진 디테일") ──
    //   한 '부지(lot)'가 손상 원형(archetype)에 따라 박스 1~6개를 뱉는다. 전부 같은 InstancedMesh라
    //   드로우콜은 그대로(2) — 인스턴스만 늘어난다. 실루엣이 부서지는 게 목적.
    const boxG = new THREE.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
    const placements = []; // 창문 부착용 — 성한 벽면만 등록(붕괴부엔 창이 없다)
    const lots = [];       // 잠식·잔해가 참조할 부지 정보
    const parts = [];      // {x,y,z,w,h,d,ry,rz,tone} — 최종 인스턴스 큐
    const pushPart = (p) => { parts.push(p); return p; };

    { let made = 0, guard = 0;
      while (made < 300 && guard++ < 300 * 30) {
        const x = (rand() - 0.5) * 300, z = (rand() - 0.5) * 300;
        const inRoadX = Math.abs(((x + 6 + 3600) % 24) - 12) > 9.2, inRoadZ = Math.abs(((z - 6 + 3600) % 24) - 12) > 9.2;
        if (inRoadX || inRoadZ) continue;
        let bad = false;
        // 회피 반경 11 — 20은 focus(dist 30) 시야를 통째로 빈 공터로 만들었다(실측 검거).
        //   폐허를 보여주는 뷰인데 폐허를 치워두면 안 된다: 노드는 '잔해에 둘러싸인 빈터'여야 한다.
        for (const nd of Object.values(NODES)) if (Math.hypot(x - nd.x, z - nd.z) < 11) { bad = true; break; }
        if (bad) continue;
        const dc = Math.hypot(x, z);
        const tall = dc < 70 || rand() < 0.35;
        const H = tall ? (dc < 70 ? 12 + rand() * 16 : 6 + rand() * 8) : 2.2 + rand() * 4.5;
        const w = 4.5 + rand() * 5.5, d = 4.5 + rand() * 5.5;
        const tone = 0.27 + rand() * 0.18; // 잿빛 기준 밝기
        const a = rand();
        // 손상 원형 5종 — 온전한 건물은 소수(폐허 도시의 규칙: 성한 게 예외)
        if (a < 0.16) {                                   // ① 온전 (드묾)
          pushPart({ x, y: 0, z, w, h: H, d, tone });
          placements.push({ x, z, w, h: H, d });
        } else if (a < 0.42) {                            // ② 상층 전단 — 위층이 무너져 반쪽만 남음
          const cut = H * (0.45 + rand() * 0.25);
          pushPart({ x, y: 0, z, w, h: cut, d, tone });
          const sw = w * (0.35 + rand() * 0.3), sd = d * (0.35 + rand() * 0.3);
          pushPart({ x: x + (rand() - 0.5) * (w - sw), y: cut, z: z + (rand() - 0.5) * (d - sd),
                     w: sw, h: (H - cut) * (0.4 + rand() * 0.5), d: sd, ry: (rand() - 0.5) * 0.3, tone: tone * 0.92 });
          placements.push({ x, z, w, h: cut, d });
        } else if (a < 0.60) {                            // ③ 외벽만 — 내부 소실, 파사드 두 장이 서 있다
          const t = 0.7 + rand() * 0.5;
          pushPart({ x, y: 0, z: z - d / 2 + t / 2, w, h: H * (0.6 + rand() * 0.35), d: t, tone });
          pushPart({ x: x - w / 2 + t / 2, y: 0, z, w: t, h: H * (0.5 + rand() * 0.4), d, tone: tone * 0.95 });
          placements.push({ x, z: z - d / 2 + t / 2, w, h: H * 0.6, d: t });
        } else if (a < 0.76) {                            // ④ 층 붕괴 — 바닥 슬래브가 공중에 남고 사이가 비었다
          const lv = 2 + Math.floor(rand() * 2);
          for (let k = 0; k < lv; k++) {
            const y = (H / lv) * k, hh = (H / lv) * (0.18 + rand() * 0.22);
            const sw = w * (0.7 + rand() * 0.3), sd = d * (0.7 + rand() * 0.3);
            pushPart({ x: x + (rand() - 0.5) * 0.8, y, z: z + (rand() - 0.5) * 0.8, w: sw, h: hh, d: sd, tone: tone * (1 - k * 0.05) });
          }
          pushPart({ x: x - w * 0.3, y: 0, z, w: 0.9, h: H * (0.7 + rand() * 0.3), d: 0.9, tone: tone * 0.85 }); // 남은 기둥
        } else if (a < 0.90) {                            // ⑤ 기울어 무너짐
          pushPart({ x, y: 0, z, w, h: H * (0.55 + rand() * 0.3), d,
                     rz: (rand() - 0.5) * 0.34, ry: (rand() - 0.5) * 0.5, tone: tone * 0.9 });
        } else {                                          // ⑥ 전소 그루터기 — 잔해 더미만
          pushPart({ x, y: 0, z, w: w * 0.9, h: 1.0 + rand() * 1.4, d: d * 0.9, tone: tone * 0.75 });
        }
        // 잔해 스커트: 부서진 건물 밑에는 반드시 파편이 깔린다
        if (a >= 0.16) {
          const rn = 2 + Math.floor(rand() * 4);
          for (let k = 0; k < rn; k++) {
            const ang = rand() * 6.28, rr = (w + d) * 0.25 + rand() * 3;
            pushPart({ x: x + Math.cos(ang) * rr, y: 0, z: z + Math.sin(ang) * rr,
                       w: 0.8 + rand() * 2.0, h: 0.25 + rand() * 0.7, d: 0.8 + rand() * 2.0,
                       ry: rand() * 1.5, tone: tone * 0.8 });
          }
        }
        lots.push({ x, z, w, d, H, ruined: a >= 0.16 });
        made++;
      }
    }
    // parts → InstancedMesh 2벌(도색 스왑 단위 유지: 짝수/홀수로 분할해 기존 dry/snow 배열 구조 계승)
    { const half = Math.ceil(parts.length / 2);
      const mk = (arr) => {
        const n = arr.length;
        const m = new THREE.InstancedMesh(boxG, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
        const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color();
        const dry = new Float32Array(n * 3), snow = new Float32Array(n * 3);
        arr.forEach((p, i) => {
          E.set(p.rz || 0, p.ry || 0, 0); Q.setFromEuler(E);
          S.set(p.w, p.h, p.d); P.set(p.x, p.y || 0, p.z);
          M.compose(P, Q, S); m.setMatrixAt(i, M);
          const g = p.tone; C.setRGB(g * 0.92, g, g * 1.14);
          m.setColorAt(i, C); dry.set([C.r, C.g, C.b], i * 3);
          const s = 0.42 + (g - 0.27) * 0.4; snow.set([s * 0.94, s * 0.97, s * 1.05], i * 3);
        });
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        scene.add(m); return { mesh: m, dry, snow };
      };
      const b1 = mk(parts.slice(0, half)), b2 = mk(parts.slice(half));
      bld = [b1.mesh, b2.mesh]; bldDry = [b1.dry, b2.dry]; bldSnow = [b1.snow, b2.snow];
    }

    // ── 잠식(Overgrowth) — #71 규약 이식: years = min(3, day/360), 겨울=마른 톤+밀도 0.6 ──
    //   항공 거리에서 개별 식물은 안 보인다 → 지붕 위 초록 덩어리·벽면 담쟁이 띠·지면 수풀 패치로 읽히게.
    {
      const years = Math.min(3, (ctxYears() || 1) / 360);
      const winter = ctxWinter();
      const PAL = winter ? [0x6a5f45, 0x5d5340, 0x746a4e, 0x66603f]   // #71과 동일 팔레트(겨울 마른 톤)
                         : [0x3e5230, 0x46603a, 0x2f4527, 0x4a5c3c];
      const dens = (winter ? 0.6 : 1) * (years / 3);
      const og = [];
      for (const lot of lots) {
        if (rand() > dens * 0.85) continue;
        // 지붕/최상단 잠식 — 무너진 건물일수록 잘 먹힌다(열린 지붕으로 씨가 든다)
        const rf = lot.ruined ? 1 : 0.5;
        if (rand() < 0.75 * rf) {
          og.push({ x: lot.x + (rand() - 0.5) * lot.w * 0.5, y: lot.H * (lot.ruined ? 0.45 : 1) ,
                    z: lot.z + (rand() - 0.5) * lot.d * 0.5,
                    w: lot.w * (0.4 + rand() * 0.5), h: 0.5 + rand() * 1.4 * years, d: lot.d * (0.4 + rand() * 0.5) });
        }
        // 벽면 담쟁이 띠 — 아래에서 위로 자란다(연차만큼 높이)
        if (rand() < 0.5) {
          const hh = Math.min(lot.H, (1.5 + rand() * 3) * years);
          og.push({ x: lot.x + lot.w / 2 * 0.95, y: 0, z: lot.z + (rand() - 0.5) * lot.d * 0.7,
                    w: 0.5, h: hh, d: lot.d * (0.2 + rand() * 0.4) });
        }
        // 지면 수풀 — 잔해 틈
        const gn = Math.floor(rand() * 3 * dens);
        for (let k = 0; k < gn; k++) {
          const ang = rand() * 6.28, rr = (lot.w + lot.d) * 0.3 + rand() * 4;
          og.push({ x: lot.x + Math.cos(ang) * rr, y: 0, z: lot.z + Math.sin(ang) * rr,
                    w: 1.2 + rand() * 2.4, h: 0.4 + rand() * 1.0 * years, d: 1.2 + rand() * 2.4 });
        }
      }
      if (og.length) {
        ogMesh = new THREE.InstancedMesh(boxG, new THREE.MeshLambertMaterial({ color: 0xffffff }), og.length);
        const M = new THREE.Matrix4(), C = new THREE.Color();
        og.forEach((p, i) => {
          M.makeScale(p.w, p.h, p.d).setPosition(p.x, p.y, p.z); ogMesh.setMatrixAt(i, M);
          C.setHex(PAL[Math.floor(rand() * PAL.length)]); ogMesh.setColorAt(i, C);
        });
        ogMesh.instanceMatrix.needsUpdate = true; if (ogMesh.instanceColor) ogMesh.instanceColor.needsUpdate = true;
        scene.add(ogMesh);
      }
      ogInfo = { years: +years.toFixed(2), winter, count: og.length, parts: parts.length, lots: lots.length };
    }
    // ── 밤 창문 불빛 + 옥상 적색 비컨 (생존자의 흔적 — 세계관: 응답하는 불빛) ──
    winMat = new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0 });
    const winG = new THREE.PlaneGeometry(1.1, 1.4);
    const WN = 140;
    const wins = new THREE.InstancedMesh(winG, winMat, WN);
    { // 실제 건물 표면에 부착 — 카메라(AZIM 0.62)를 향하는 +x/+z 면에만 (뒷면 창은 어차피 안 보임)
      const M = new THREE.Matrix4(); let i = 0, guard = 0;
      while (i < WN && guard++ < WN * 20) {
        const p = placements[Math.floor(rand() * placements.length)];
        if (!p || p.h < 3) continue;
        const y = 1.2 + rand() * (p.h - 2);
        if (rand() < 0.5) M.makeRotationY(0).setPosition(p.x + (rand() - 0.5) * p.w * 0.6, y, p.z + p.d / 2 + 0.06);
        else M.makeRotationY(Math.PI / 2).setPosition(p.x + p.w / 2 + 0.06, y, p.z + (rand() - 0.5) * p.d * 0.6);
        wins.setMatrixAt(i, M); i++;
      }
      wins.count = i; wins.instanceMatrix.needsUpdate = true; scene.add(wins); }
    for (let k = 0; k < 5; k++) { // 적색 항공 장애등 (레퍼런스 무드)
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
      b.position.set((rand() - 0.5) * 160, 20 + rand() * 10, (rand() - 0.5) * 160);
      b.userData.ph = rand() * 6.28; beacons.push(b); scene.add(b);
    }
    // ── 노드 권역 드레싱 ──
    { // 주거(residential): 낮은 집들 정렬 — 살던 동네의 질서
      const g = new THREE.Group(); const nd = NODES.residential;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const hg = 1.8 + rand() * 1.2;
        const hs = new THREE.Mesh(boxG, new THREE.MeshLambertMaterial({ color: 0x4a4438 }));
        hs.scale.set(3.4, hg, 3.0); hs.position.set(nd.x - 9 + c * 5.6, 0, nd.z - 6 + r * 5.4 + (c % 2) * 0.8);
        g.add(hs);
      }
      scene.add(g);
    }
    { // 슬럼(slum): 판자촌 난립 + 드럼통 화톳불(밤의 오렌지 — 유일한 온기)
      const g = new THREE.Group(); const nd = NODES.slum;
      for (let k = 0; k < 26; k++) {
        const sh = new THREE.Mesh(boxG, new THREE.MeshLambertMaterial({ color: [0x6a6250, 0x5c5445, 0x746952][k % 3] }));
        const a = rand() * 6.28, rr = 3.5 + rand() * 6.5; // 최소 반경 3.5 — 근접 카메라 전경 검은 덩어리 회피(2차 캡처)
        sh.scale.set(1.6 + rand() * 1.6, 1.0 + rand() * 1.3, 1.5 + rand() * 1.5);
        sh.position.set(nd.x + Math.cos(a) * rr, 0, nd.z + Math.sin(a) * rr);
        sh.rotation.y = rand() * 0.8; g.add(sh);
      }
      fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 6),
        new THREE.MeshLambertMaterial({ color: 0xffa030, emissive: 0xdd6a10, emissiveIntensity: 1.2 }));
      fireCone.position.set(nd.x, 0.9, nd.z); g.add(fireCone);
      firePt = new THREE.PointLight(0xff8a30, 0, 34, 1); firePt.position.set(nd.x, 2.4, nd.z); g.add(firePt); // decay 1 — 물리 감쇠는 이 스케일에서 빛이 죽는다(1차 캡처)
      scene.add(g);
    }
    // 노드 비컨 링 (S2에서 DOM 오버레이로 대체 — S1은 위치 감각용)
    for (const nd of Object.values(NODES)) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.16, 6, 28),
        new THREE.MeshBasicMaterial({ color: 0x6fe08c, transparent: true, opacity: 0.85 }));
      ring.rotation.x = Math.PI / 2; ring.position.set(nd.x, 0.25, nd.z);
      ring.userData.ph = rand() * 6.28; beacons.push(ring); scene.add(ring);
    }
    // ── 낙설 파티클 (weather=snow에서만 visible) ──
    { const N = 900, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) pos.set([(rand() - 0.5) * 240, rand() * 70, (rand() - 0.5) * 240], i * 3);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      snowPts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdde4ea, size: 0.32, transparent: true, opacity: 0.85 }));
      snowPts.visible = false; scene.add(snowPts); }
  }

  // ── 카메라 리그: overview ↔ focus 연속 돌리 줌 (시점 연속성 = 줌 착각의 핵심) ──
  //   elev도 상태에 포함 — overview는 높게(전도감), focus는 낮춰(레퍼런스 2의 근접 앙각) 대상이 화면을 채운다.
  const rig = { cur: null, from: null, to: null, t0: 0, dur: 0 };
  const AZIM = 0.62; // 본편 아이소 각 계열(yaw 0.6)과 정합
  function shot(tgt, dist, elev) { return { tgt: tgt.clone(), dist, elev }; }
  function goto(s, dur = 0.75) { rig.from = rig.cur ? { ...rig.cur, tgt: rig.cur.tgt.clone() } : s; rig.to = s; rig.t0 = performance.now() / 1000; rig.dur = dur; }
  function applyCam(nowS) {
    let s = rig.to;
    if (rig.from && rig.dur > 0) {
      const k = Math.min(1, (nowS - rig.t0) / rig.dur), e = k * k * (3 - 2 * k); // smoothstep
      s = { tgt: rig.from.tgt.clone().lerp(rig.to.tgt, e),
            dist: rig.from.dist + (rig.to.dist - rig.from.dist) * e,
            elev: rig.from.elev + (rig.to.elev - rig.from.elev) * e };
      if (k >= 1) rig.from = null;
    }
    rig.cur = s;
    const y = Math.sin(s.elev) * s.dist, r = Math.cos(s.elev) * s.dist;
    camera.position.set(s.tgt.x + Math.sin(AZIM) * r, y, s.tgt.z + Math.cos(AZIM) * r);
    camera.lookAt(s.tgt.x, 0, s.tgt.z);
  }

  let lastWeather = null;
  function applyWeatherLook(w) {
    if (w === lastWeather || !bld) return; lastWeather = w;
    const snowy = w === 'snow' || w === 'storm';
    for (let k = 0; k < bld.length; k++) {
      bld[k].instanceColor.array.set(snowy ? bldSnow[k] : bldDry[k]);
      bld[k].instanceColor.needsUpdate = true;
    }
    // 지면·도로도 설원 스왑 — 지붕만 하얘지면 밤 실루엣이 죽는다(2차 캡처 검거). 설원=달빛 반사판.
    if (groundMat) groundMat.color.setHex(snowy ? 0x8e98a4 : 0x191c22);
    if (roadMat) roadMat.color.setHex(snowy ? 0x5e6772 : 0x232730);
    if (snowPts) snowPts.visible = snowy;
  }

  function update(dt, ctx) {
    if (camera.aspect !== innerWidth / innerHeight) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
    const L = lightAt(ctx.hour % 24);
    const snowy = ctx.weather === 'snow' || ctx.weather === 'storm';
    scene.background = L.sky;
    // 안개는 뷰 거리에 반비례 — overview(165)에 focus용 밀도를 쓰면 도시 전체가 뿌옇게 씻긴다(실측).
    const fogK = rig.cur ? THREE.MathUtils.clamp(38 / rig.cur.dist, 0.28, 1) : 1;
    scene.fog.color.copy(L.fog); scene.fog.density = (snowy ? 0.0085 : 0.0052) * fogK;
    hemi.color.copy(L.hemiSky); hemi.groundColor.copy(L.hemiGround); hemi.intensity = (snowy ? 1.05 : 0.9) + L.night * 0.5; // 밤 가중 — 비조명면 전멸 방지
    sun.color.copy(L.sunColor); sun.intensity = L.sunInt * (snowy ? 0.45 : 1);
    const el = THREE.MathUtils.degToRad(Math.max(2, L.sunElev));
    sun.position.set(Math.cos(el) * 90, Math.sin(el) * 110 + 6, Math.cos(el) * 55);
    // 밤의 생존 신호: 창문·화톳불은 night 팩터로
    if (winMat) winMat.opacity = L.night * 0.95;
    if (firePt) firePt.intensity = (0.8 + L.night * 4.5) * (1 + 0.18 * Math.sin(performance.now() * 0.013));
    if (fireCone) fireCone.scale.setScalar(1 + 0.1 * Math.sin(performance.now() * 0.017));
    for (const b of beacons) { const s = 0.55 + 0.45 * Math.sin(performance.now() * 0.003 + b.userData.ph); if (b.material.transparent) b.material.opacity = 0.5 + s * 0.4; else b.material.color.setScalar ? null : null; }
    applyWeatherLook(ctx.weather);
    if (snowPts && snowPts.visible) { // 낙설
      const p = snowPts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * (7 + (i % 5));
        if (y < 0) y = 70;
        p.setY(i, y);
      }
      p.needsUpdate = true;
    }
    applyCam(performance.now() / 1000);
  }

  return {
    scene, camera, update,
    get active() { return active; },
    open(o = {}) {
      if (!built) { build({ day: o.day, winter: o.winter }); built = true; }
      active = true;
      rig.cur = null; goto(shot(new THREE.Vector3(0, 0, 8), 165, 0.92), 0.01);
      if (o.focus && NODES[o.focus]) this.focus(o.focus);
    },
    close() { active = false; },
    overview() { goto(shot(new THREE.Vector3(0, 0, 8), 165, 0.92)); },
    focus(id) { const nd = NODES[id]; if (nd) goto(shot(new THREE.Vector3(nd.x, 0, nd.z), 30, 0.62)); },
    nodes: Object.keys(NODES),
    ogState: () => ({ ...ogInfo }), // QA: 잠식 연차·인스턴스 수 (#71 overgrowthState 대응)
  };
}
