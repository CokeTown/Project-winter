/* 항공뷰 지도 S1 프로토타입 (AERIAL-MAP 개정 1차) — QA/디렉터 판단물 전용, 플레이어 진입점 없음.
 *   단일 라이브 도시 디오라마 + 카메라 2상태(overview↔focus 연속 돌리 줌).
 *   렌더는 본편 파이프(rt→post 양자화/디더/팔레트)를 그대로 탄다 — 픽셀 룩 판정이 S1의 목적.
 *   실시간: update(ctx)가 매 프레임 본편 상태(gameHour·weather)를 구독한다. 자체 시계 없음.
 *   S2에서 ui/mapview.js로 정식화 예정 — 여기서는 씬·조명·카메라만. (노드 오버레이 DOM은 S2)
 */
import * as THREE from 'three';
import { seededRand } from '../lib/helpers.js';
// 시간대 조명 커브는 timelight.js로 이관(D1 상환) — 본편 DAY_PHASES와 병치·계약. 값·보간은 그대로.
import { aerialLightAt } from './timelight.js';

// 노드 기본값 (S1 하위호환 — S2부터는 게임이 MAP_MARKERS 파생 월드좌표를 주입한다)
const DEFAULT_NODES = {
  residential: { x: -46, z: 34 },
  slum: { x: 38, z: 50 },
};

export function makeAerialProto(cfg = {}) {
  const NODES = cfg.nodes || DEFAULT_NODES; // S2: 지역 rid → 디오라마 월드좌표(전 노드 회피·비컨·focus 대상)
  const CITY = cfg.city || 'home'; // S3-2: 'home'(서부)·'east'(부산형 항구도시) — 지형·톤·드레싱 분기
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 2, 900);
  let built = false, active = false, _qaT = null; // _qaT: 골든 펄스 동결 시각(null=실시간)
  const rand = seededRand(4242);

  // 날씨 룩 스왑용 버퍼 (건물 지붕 적설 — 인스턴스 컬러 2벌 사전 계산)
  let bld = null, bldDry = null, bldSnow = null, winMat = null, firePt = null, fireCone = null;
  let snowPts = null, beacons = [], groundMat = null, roadMat = null, waterMat = null;
  // 동부 아트 디렉션(2.0-d): 붉은 노을 팔레트 — 대기·태양을 녹슨 웜톤으로 물들인다(본편 지구 틴트 0xa8604a 계열 정합)
  const EAST_AIR = new THREE.Color(0x8a4638), EAST_SUN = new THREE.Color(0xff7a48);
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
      if (CITY !== 'east' || i * 24 + 6 < 42) { // 동부: 해안선(z≈45) 남쪽 도로는 물에 잠긴다 — 클립
        const h = new THREE.Mesh(roadG, roadMat); h.rotation.x = -Math.PI / 2;
        h.scale.set(320, 4.2, 1); h.position.set(0, 0.0, i * 24 + 6); scene.add(h);
      }
      const v = new THREE.Mesh(roadG, roadMat); v.rotation.x = -Math.PI / 2;
      if (CITY === 'east') { v.scale.set(4.2, 206, 1); v.position.set(i * 24 - 6, 0.0, -57); }
      else { v.scale.set(4.2, 320, 1); v.position.set(i * 24 - 6, 0.0, 0); }
      scene.add(v);
    }
    // ── 동부(east) 지형: 남해안 수면·안벽·끊긴 대교 — 부산형 항구도시의 정체성 실루엣(S3-2) ──
    //   대교는 일부러 중간이 끊겨 있다: "다리 관리소(eastbridge)가 지키는 죽은 대교" — 고립의 세계관 정합.
    if (CITY === 'east') {
      // 수면 0x4a5c6e — 마젠타 페인트 프로브로 확정한 값(probe-water 2단, 3차 검거): 어두운 슬레이트
      //   (0x18222e·0x2c3846)는 조명×포스트 LUT를 지나며 흑색 버킷으로 스냅돼 바다가 '구멍'으로 읽혔다.
      //   0x4a5c6e = LUT 생존 + 잿빛 도시와 안 싸우는 하한. 밤은 램버트가 알아서 어둡힌다.
      waterMat = new THREE.MeshLambertMaterial({ color: 0x4a5c6e });
      const water = new THREE.Mesh(new THREE.PlaneGeometry(460, 175), waterMat);
      water.rotation.x = -Math.PI / 2; water.position.set(0, 0.02, 133); scene.add(water);
      const boxG0 = new THREE.BoxGeometry(1, 1, 1); boxG0.translate(0, 0.5, 0);
      const put0 = (x, y, z, w, h, d, color, rx = 0) => {
        const m = new THREE.Mesh(boxG0, new THREE.MeshLambertMaterial({ color }));
        m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.x = rx; scene.add(m); return m;
      };
      put0(0, 0, 45, 320, 1.1, 1.8, 0x4a505a);                       // 안벽(quay)
      for (const px of [-62, -18, 34]) put0(px, 0, 52, 3.2, 0.7, 13, 0x50565f); // 부두 핑거
      // 대교는 overview 프레임 안에서 '끊김'까지 읽혀야 한다 — 첫 캡처 검거: z70/122는 하단 밖으로 반출.
      put0(-2, 7, 58, 7, 1.0, 28, 0x5a6068);                          // 상판 1 (뭍측 44~72)
      put0(-2, 7, 96, 7, 1.0, 28, 0x5a6068);                          // 상판 2 (먼측 82~110)
      put0(-2, 4.6, 77, 7, 1.0, 9, 0x555a62, 0.62);                   // 끊긴 상판 — 틈(72~82)에서 물로 처박힘
      put0(-2, 1.6, 42, 7, 0.9, 17, 0x5a6068, -0.36);                 // 진입 램프
      for (const pz of [58, 96]) {
        for (const dx of [-4.6, 4.6]) put0(-2 + dx, -2, pz, 1.5, 27, 1.5, 0x646a74); // 주탑 2쌍
        put0(-2, 23.2, pz, 10.7, 1.2, 1.5, 0x646a74);                 // 크로스빔
      }
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
        if (CITY === 'east' && z > 40) continue; // 동부: 해안선 남쪽은 바다 — 부지 금지
        let bad = false, nearND = 1e9;
        // 회피 반경 11 — 20은 focus(dist 30) 시야를 통째로 빈 공터로 만들었다(실측 검거).
        //   폐허를 보여주는 뷰인데 폐허를 치워두면 안 된다: 노드는 '잔해에 둘러싸인 빈터'여야 한다.
        for (const nd of Object.values(NODES)) { const dd = Math.hypot(x - nd.x, z - nd.z); if (dd < nearND) nearND = dd; if (dd < 11) { bad = true; break; } }
        if (bad) continue;
        // 고층 존: 서부=도심(원점) / 동부=마천루 코어(megamall 24,-44) 중심 — 스카이라인의 무게중심이 도시마다 다르다
        const dc = CITY === 'east' ? Math.hypot(x - 24, z + 44) : Math.hypot(x, z);
        const tall = dc < (CITY === 'east' ? 60 : 70) || rand() < 0.35;
        // 동부 한정: 노드 근접(<20) 부지는 저층 캡 — customsyard 실측 검거(전경 장신 폐허가 d48 focus를 가림).
        //   빈터를 '둘러싼 잔해'는 유지하되 시야벽은 금지. rand 미소비(결정론·서부 스트림 불변).
        const hCap = (CITY === 'east' && nearND < 20) ? 3.6 : 1e9;
        const H = Math.min(tall ? (dc < 70 ? 12 + rand() * 16 : 6 + rand() * 8) : 2.2 + rand() * 4.5, hCap);
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
          const g = p.tone; // 서부=차가운 잿빛 / 동부=녹슨 웜 그레이(붉은 노을 팔레트의 건물측 응답)
          if (CITY === 'east') C.setRGB(g * 1.05, g * 0.96, g * 0.90); else C.setRGB(g * 0.92, g, g * 1.14);
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
      const dens = (winter ? 0.6 : 1) * (years / 3) * (CITY === 'east' ? 1.3 : 1); // 동부=Over Grown 가중(TLOU 감성 — 디렉터 키워드)
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
    // ── 노드 권역 드레싱 (해당 노드가 주입됐을 때만 — S3에서 전 노드 드레싱 확장) ──
    if (NODES.residential) { // 주거(residential): 낮은 집들 정렬 — 살던 동네의 질서
      const g = new THREE.Group(); const nd = NODES.residential;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const hg = 1.8 + rand() * 1.2;
        const hs = new THREE.Mesh(boxG, new THREE.MeshLambertMaterial({ color: 0x4a4438 }));
        hs.scale.set(3.4, hg, 3.0); hs.position.set(nd.x - 9 + c * 5.6, 0, nd.z - 6 + r * 5.4 + (c % 2) * 0.8);
        g.add(hs);
      }
      scene.add(g);
    }
    if (NODES.slum) { // 슬럼(slum): 판자촌 난립 + 드럼통 화톳불(밤의 오렌지 — 유일한 온기)
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
    // ── S3 노드 드레싱: 잔여 노드 정체성 실루엣 (원경 저폴리 — 픽셀화가 마감을 진다) ──
    //   전용 rand(4243): 기존 도시·창문·비컨의 rand(4242) 소비 순서를 건드리지 않는다(배치 결정론 보존).
    //   각 노드 = "이름을 가리고도 뭔지 읽히는" 최소 실루엣 1벌. focus(dist 30)에서 판독되는 밀도가 기준.
    {
      const r2 = seededRand(4243);
      const put = (g, x, y, z, w, h, d, color, ry = 0) => {
        const m = new THREE.Mesh(boxG, new THREE.MeshLambertMaterial({ color }));
        m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
      };
      const cyl = (g, x, y, z, r, h, color, seg = 7) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, h, seg), new THREE.MeshLambertMaterial({ color }));
        m.position.set(x, y + h / 2, z); g.add(m); return m;
      };
      const dress = {
        commercial(g, nd) { // 도심 상업 — 무너진 고층 코어 군집 + 중앙에 쓰러진 간판(공터 앵커)
          //   높이 7~12·반경 5.5~8.5 — 1차 캡처 검거: 10~19 타워가 focus 카메라(dist 30)와 노드 사이에
          //   서서 프레임을 검은 벽으로 삼켰다. 근경은 낮게, 스카이라인은 도시 원경(기존 tall 존)이 진다.
          //   배치는 카메라 반대편 반원(무대 뒤편) — focus 카메라(AZIM 0.62, +x+z측)와 노드 사이에
          //   세우면 역광 벽이 프레임을 삼킨다(2차 캡처 검거). back = AZIM+π 중심 ±1.15.
          const BACK = 0.62 + Math.PI;
          for (let k = 0; k < 4; k++) {
            const a = BACK + (k / 3 - 0.5) * 2.3 + (r2() - 0.5) * 0.3, rr = 5.5 + r2() * 3;
            put(g, nd.x + Math.cos(a) * rr, 0, nd.z + Math.sin(a) * rr,
              3.0 + r2() * 1.8, 7 + r2() * 5, 3.0 + r2() * 1.8, 0x565b66, r2() * 0.4);
          }
          put(g, nd.x - 0.5, 0, nd.z + 1.2, 5.5, 2.0, 0.6, 0x6a5844, 0.35); // 쓰러진 간판 — 공터 중앙 앵커
          put(g, nd.x + 1.8, 0, nd.z - 1.6, 1.8, 0.8, 1.4, 0x4e5560, 0.7);  // 뒤집힌 차 실루엣
        },
        industrial(g, nd) { // 공업 — 공장 홀·굴뚝은 뒤편(−x−z), 앞마당은 낮은 팔레트 더미(3차: 홀 역광 벽 검거)
          put(g, nd.x - 5.5, 0, nd.z - 4.5, 9, 4.2, 5.5, 0x51565f, 0.1);
          put(g, nd.x + 3.5, 0, nd.z - 6, 6, 3.2, 4.5, 0x4a4e56, -0.15);
          cyl(g, nd.x - 7.5, 0, nd.z - 7, 0.8, 11, 0x434750);
          cyl(g, nd.x - 5.1, 0, nd.z - 7, 0.7, 14, 0x434750);
          cyl(g, nd.x + 7, 0, nd.z - 4, 1.6, 3, 0x5c616b, 9);
          for (let k = 0; k < 3; k++) put(g, nd.x - 0.8 + k * 1.6, 0, nd.z + 1.5 + (k % 2), 1.2, 0.5 + r2() * 0.5, 1.0, 0x5a5142, r2() * 0.5); // 앞마당 팔레트
        },
        harborYard(g, nd) { // 항구 야적장 — 컨테이너 스택 격자 + 크레인
          const PAL = [0x7a614b, 0x50665c, 0x695459, 0x5a6875]; // 1차 캡처: 원톤이 잿빛에 묻힘 — 한 단 승톤
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
            if (r2() < 0.2) continue;
            const st = 1 + Math.floor(r2() * 2);
            for (let s = 0; s < st; s++) // z를 뒤편(−)으로 — 카메라측 스택 역광 회피(2차 캡처)
              put(g, nd.x - 5 + c * 3.1, s * 1.3, nd.z - 5.5 + r * 2.2, 2.8, 1.25, 2.2, PAL[Math.floor(r2() * 4)]);
          }
          put(g, nd.x - 6.5, 0, nd.z - 2, 0.8, 12, 0.8, 0x5a5142);   // 크레인 기둥 (뒤편)
          put(g, nd.x - 6.5, 11, nd.z + 1.5, 0.7, 0.7, 9, 0x5a5142); // 크레인 붐
        },
        fishMarket(g, nd) { // 수산시장 — 부두 데크 + 좌판 열 + 뒤집힌 보트 + 방파제(도시 경계 허전함 완화)
          put(g, nd.x, 0, nd.z, 12, 0.6, 7, 0x6a5c48); // 4차: 어두운 데크가 역광에 죽음 — 승톤
          for (let k = 0; k < 3; k++)
            put(g, nd.x - 3.5 + k * 3.4, 0.6, nd.z - 2, 2.4, 1.3, 1.6, 0x74674f, r2() * 0.3);
          put(g, nd.x + 2, 0.6, nd.z + 1.5, 4.5, 1.0, 1.8, 0x5c6773, 0.5);
          for (let k = 0; k < 5; k++) put(g, nd.x - 8 + k * 4.2, 0, nd.z + 5.5, 2.6, 1.0, 1.6, 0x565b63, r2() * 0.2); // 방파제 블록
        },
        resort(g, nd) { // 고원 리조트 — A프레임 로지(뒤편·승톤) + 리프트 기둥 열
          const lodge = new THREE.Mesh(new THREE.ConeGeometry(3, 4.2, 4),
            new THREE.MeshLambertMaterial({ color: 0x7a6448 })); // 4차: 역광 검붉음 — 승톤
          lodge.position.set(nd.x - 2, 2.1, nd.z - 2.5); lodge.rotation.y = 0.79; g.add(lodge); // 링과 분리(뒤편)
          for (let k = 0; k < 3; k++)
            put(g, nd.x - 6 + k * 5, 0, nd.z + 5 - k * 4, 0.5, 6 + k, 0.5, 0x545963);
          put(g, nd.x + 1.5, 0, nd.z + 1, 2.2, 0.6, 1.0, 0x6a5f4b, 0.4); // 공터 벤치 잔해
        },
        checkpoint(g, nd) { // 봉쇄선 검문소 — 게이트 바 + 바리케이드 + 감시탑(뒤편·승톤, 4차: 탑이 카메라측 프레임 밖)
          put(g, nd.x, 0, nd.z, 8.5, 1.1, 1.1, 0x666c76);
          put(g, nd.x - 3, 0, nd.z + 2, 2.2, 1.6, 1.2, 0x5a5f68, 0.3);
          put(g, nd.x - 4, 0, nd.z - 3.5, 1.4, 6.5, 1.4, 0x565b64);
          put(g, nd.x - 4, 6.5, nd.z - 3.5, 2.6, 1.4, 2.6, 0x666c76);
        },
        lab(g, nd) { // 폭심지 연구동 — 낮은 벙커 + 상부 구조물 + 안테나
          put(g, nd.x, 0, nd.z, 7, 2.6, 5.5, 0x4d525b);
          put(g, nd.x - 1, 2.6, nd.z, 3, 1.2, 3, 0x454a52);
          cyl(g, nd.x + 2.4, 2.6, nd.z + 1.2, 0.12, 6, 0x666c76, 5);
        },
        slumdeep(g, nd) { // 판자촌 심부 — 슬럼의 축소·밀집판
          for (let k = 0; k < 10; k++) {
            const a = r2() * 6.28, rr = 2.5 + r2() * 4.5;
            put(g, nd.x + Math.cos(a) * rr, 0, nd.z + Math.sin(a) * rr,
              1.3 + r2() * 1.2, 0.9 + r2() * 1.0, 1.2 + r2() * 1.2,
              [0x655d4b, 0x585040, 0x6f654e][k % 3], r2() * 0.8);
          }
        },
        citycore(g, nd) { // 도심 중심지 — 마천루 코어(봉쇄 너머의 우뚝) + 부속동. 코어는 뒤편으로
          //   4차 검거: 중앙 26h 타워가 focus 카메라 정면에서 화면 전체를 검은 기둥으로 삼켰다.
          put(g, nd.x - 5.5, 0, nd.z - 6, 6.5, 26, 6.5, 0x565b66);
          put(g, nd.x + 2.8, 0, nd.z - 7.2, 4, 14, 4, 0x50555f);
          put(g, nd.x - 8.2, 0, nd.z + 0.8, 3.4, 9, 3.4, 0x4b505a);
          put(g, nd.x + 1, 0, nd.z + 1, 3.2, 1.4, 2.2, 0x5e646e, 0.5); // 공터 — 무너진 로비 잔해
        },
        // ── S3-2 동부(east) 8종 — 부산형 항구도시. 서부와 같은 규약: 뒤편(BACK) 배치·승톤 0x5x~0x7x·공터 중앙 앵커 ──
        customsyard(g, nd) { // 세관 압류창고 — 창고 열(뒤편) + 게이트 바(앵커) + 압류 컨테이너
          for (let k = 0; k < 3; k++)
            put(g, nd.x - 6 + k * 6.2, 0, nd.z - 5.5 + (k % 2) * 1.2, 5.4, 4.2 + r2(), 4.2, 0x5c6169, 0.05);
          put(g, nd.x, 0, nd.z + 1.5, 7.5, 1.0, 0.9, 0x6d7078);       // 게이트 바
          put(g, nd.x + 4, 0, nd.z + 3, 2.8, 1.25, 2.2, 0x6a5a49, 0.3);
          put(g, nd.x - 4.5, 0, nd.z + 3.5, 2.8, 1.25, 2.2, 0x50665c, -0.2);
        },
        containerport(g, nd) { // 컨테이너 부두 — 대형 스택 + 겐트리 크레인 2문 + 좌초 화물선(수변)
          const PAL = [0x7a614b, 0x50665c, 0x695459, 0x5a6875];
          for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
            if (r2() < 0.18) continue;
            const st = 1 + Math.floor(r2() * 3);
            for (let s = 0; s < st; s++)
              put(g, nd.x - 7 + c * 3.2, s * 1.3, nd.z - 7.5 + r * 2.4, 2.9, 1.25, 2.2, PAL[Math.floor(r2() * 4)]);
          }
          for (const dx of [-8, 2]) { // 겐트리(문형) 크레인 — 뒤편, 승톤(첫 캡처: 어두운 배경에 묻힘)
            put(g, nd.x + dx, 0, nd.z - 10, 0.9, 13, 0.9, 0x6a6f60);
            put(g, nd.x + dx + 5, 0, nd.z - 10, 0.9, 13, 0.9, 0x6a6f60);
            put(g, nd.x + dx + 2.5, 12.4, nd.z - 10, 7.5, 0.8, 0.9, 0x6a6f60);
          }
          // 좌초 화물선 — 1차 검거: 노드 정면(+z)의 대형 암톤 선체가 focus 전경을 역광 벽으로 삼켰다.
          //   2차: 해안 평행 슬래브만으론 '판'으로 읽힘 → 선미루(브리지 캐슬)를 얹어 '배'의 최소 신호 확보.
          const hull = put(g, nd.x + 10, -1.2, nd.z + 8, 14, 3.0, 4.5, 0x6e665c, 0.12); hull.rotation.x = 0.10;
          put(g, nd.x + 15.3, 1.7, nd.z + 8.6, 2.2, 2.4, 3.0, 0x7a8088, 0.12); // 선미루
        },
        interchange(g, nd) { // 고가 램프 고리 — 도넛 데크 + 교각, 한 조각은 무너져 내렸다
          const R = 8.5, seg = 10;
          for (let k = 0; k < seg; k++) {
            const a = (k + 0.5) / seg * 6.283, ry = Math.PI / 2 - a;
            if (k === 3) { const m = put(g, nd.x + Math.cos(a) * R, 1.0, nd.z + Math.sin(a) * R, 5.6, 0.7, 3.4, 0x555a62, ry); m.rotation.z = 0.5; continue; }
            put(g, nd.x + Math.cos(a) * R, 4.4, nd.z + Math.sin(a) * R, 5.6, 0.7, 3.4, 0x5c616b, ry);
            if (k % 2 === 0) put(g, nd.x + Math.cos(a) * R, 0, nd.z + Math.sin(a) * R, 1.0, 4.4, 1.0, 0x4e535c);
          }
          put(g, nd.x, 0, nd.z, 2.6, 0.9, 2.0, 0x6a5f4b, 0.4); // 고리 중앙 공터 — 버려진 트레일러(앵커)
        },
        uptown(g, nd) { // 강변 주거단지 — 아파트 판상 3동(뒤편) + 놀이터 잔해(앵커)
          for (let k = 0; k < 3; k++)
            put(g, nd.x - 6 + k * 5.5, 0, nd.z - 6.5 - (k % 2) * 2.2, 8.5, 10 + k * 1.6, 2.6, 0x5e646e, 0.08);
          put(g, nd.x, 0, nd.z + 1.2, 2.0, 1.6, 2.0, 0x6d6252, 0.3);
          cyl(g, nd.x + 2.6, 0, nd.z + 2.4, 0.14, 3.2, 0x666c76, 5); // 부러진 가로등
        },
        grandplatform(g, nd) { // 중앙역 승강장 — 장축 역사 홀(뒤편) + 캐노피 2열 + 선로 3줄
          put(g, nd.x - 2, 0, nd.z - 7, 16, 5.2, 6, 0x5c6169, 0.02);
          put(g, nd.x - 2, 4.9, nd.z - 7, 17.5, 0.6, 7, 0x51565f, 0.02);
          for (let k = 0; k < 2; k++)
            put(g, nd.x - 3 + k * 2, 2.2, nd.z + 1.5 + k * 3.2, 14, 0.35, 1.6, 0x666c76, 0.02);
          for (let k = 0; k < 3; k++)
            put(g, nd.x, 0, nd.z + 0.4 + k * 1.7, 20, 0.12, 0.5, 0x3e434c, 0.02);
        },
        outpost(g, nd) { // 역 남측 진지 — 모래주머니 L벽 + 감시탑(뒤편) + 보급 드럼(화톳불은 build 말미 공용)
          put(g, nd.x - 2.5, 0, nd.z + 1.8, 4.5, 0.9, 1.0, 0x6a614f, 0.1);
          put(g, nd.x + 1.6, 0, nd.z - 0.6, 1.0, 0.9, 3.8, 0x6a614f, 0.05);
          put(g, nd.x - 4.5, 0, nd.z - 4, 1.3, 5.8, 1.3, 0x565b64);
          put(g, nd.x - 4.5, 5.8, nd.z - 4, 2.4, 1.2, 2.4, 0x666c76);
          for (let k = 0; k < 3; k++) put(g, nd.x + 3.2, 0, nd.z + 2.2 + k * 1.1, 0.9, 0.8, 0.9, 0x5a6875, r2());
        },
        megamall(g, nd) { // 마천루 코어 — 최고층 군집(뒤편) + 스카이브리지 + 로비 잔해(앵커)
          put(g, nd.x - 5, 0, nd.z - 6.5, 6, 30, 6, 0x565b66);
          put(g, nd.x + 3.5, 0, nd.z - 7.5, 5, 22, 5, 0x50555f);
          put(g, nd.x - 0.8, 16, nd.z - 7, 4.5, 0.9, 1.6, 0x5c616b);
          put(g, nd.x - 9, 0, nd.z + 0.5, 3.2, 12, 3.2, 0x4b505a);
          put(g, nd.x + 1, 0, nd.z + 1.2, 3.4, 1.2, 2.2, 0x5e646e, 0.5);
        },
        deptstore(g, nd) { // 백화점 지구 — 광폭 중층(뒤편) + 파사드 두 장(내부 소실) + 마른 분수(앵커)
          put(g, nd.x - 3, 0, nd.z - 6, 10, 7.5, 5, 0x5c6169, 0.04);
          put(g, nd.x + 5.5, 0, nd.z - 4.5, 0.8, 6.5, 7, 0x565b64, 0.1);
          put(g, nd.x + 1, 0, nd.z - 2.8, 8, 5.5, 0.8, 0x51565f, 0.04);
          cyl(g, nd.x - 0.5, 0, nd.z + 2.2, 1.7, 0.5, 0x666c76, 10);
        },
      };
      for (const [id, fn] of Object.entries(dress)) {
        if (!NODES[id]) continue;
        const g = new THREE.Group(); fn(g, NODES[id]); scene.add(g);
      }
      // 동부의 밤 화톳불: 진지(outpost)에 — "밤의 오렌지"는 도시마다 한 점(서부=슬럼과 같은 문법)
      if (!firePt && NODES.outpost) {
        const nd = NODES.outpost;
        fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 6),
          new THREE.MeshLambertMaterial({ color: 0xffa030, emissive: 0xdd6a10, emissiveIntensity: 1.2 }));
        fireCone.position.set(nd.x - 0.5, 0.9, nd.z + 0.5); scene.add(fireCone);
        firePt = new THREE.PointLight(0xff8a30, 0, 34, 1); firePt.position.set(nd.x - 0.5, 2.4, nd.z + 0.5); scene.add(firePt);
      }
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
    if (waterMat) waterMat.color.setHex(snowy ? 0x7e8894 : 0x4a5c6e); // 동부: 결빙 항만 — 수면도 설원 문법을 따른다
    if (snowPts) snowPts.visible = snowy;
  }

  function update(dt, ctx) {
    if (camera.aspect !== innerWidth / innerHeight) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
    const L = aerialLightAt(ctx.hour % 24);
    if (CITY === 'east') { // 붉은 노을 팔레트(동부 아트 디렉션) — aerialLightAt은 매 호출 새 Color라 제자리 lerp 안전
      L.sky.lerp(EAST_AIR, 0.14); L.fog.lerp(EAST_AIR, 0.14); L.hemiSky.lerp(EAST_AIR, 0.10);
      L.sunColor.lerp(EAST_SUN, 0.30);
    }
    const snowy = ctx.weather === 'snow' || ctx.weather === 'storm';
    scene.background = L.sky;
    // 안개는 뷰 거리에 반비례 — overview(165)에 focus용 밀도를 쓰면 도시 전체가 뿌옇게 씻긴다(실측).
    const fogK = rig.cur ? THREE.MathUtils.clamp(38 / rig.cur.dist, 0.28, 1) : 1;
    scene.fog.color.copy(L.fog); scene.fog.density = (snowy ? 0.0085 : 0.0052) * fogK;
    hemi.color.copy(L.hemiSky); hemi.groundColor.copy(L.hemiGround); hemi.intensity = (snowy ? 1.05 : 0.9) + L.night * 0.5; // 밤 가중 — 비조명면 전멸 방지
    sun.color.copy(L.sunColor); sun.intensity = L.sunInt * (snowy ? 0.45 : 1);
    const el = THREE.MathUtils.degToRad(Math.max(2, L.sunElev));
    sun.position.set(Math.cos(el) * 90, Math.sin(el) * 110 + 6, Math.cos(el) * 55);
    // 밤의 생존 신호: 창문·화톳불은 night 팩터로. _qaT = 골든 동결(펄스 위상 고정 — 캡처 결정론)
    const NOW = _qaT != null ? _qaT : performance.now();
    if (winMat) winMat.opacity = L.night * 0.95;
    if (firePt) firePt.intensity = (0.8 + L.night * 4.5) * (1 + 0.18 * Math.sin(NOW * 0.013));
    if (fireCone) fireCone.scale.setScalar(1 + 0.1 * Math.sin(NOW * 0.017));
    for (const b of beacons) { const s = 0.55 + 0.45 * Math.sin(NOW * 0.003 + b.userData.ph); if (b.material.transparent) b.material.opacity = 0.5 + s * 0.4; else b.material.color.setScalar ? null : null; }
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

  // S2 노드 오버레이: 월드 (x,z) → 화면 px 투영 (DOM 핀이 매 프레임 호출)
  const _pv = new THREE.Vector3();
  function project(x, z, y = 2) {
    _pv.set(x, y, z).project(camera);
    return { x: (_pv.x * 0.5 + 0.5) * innerWidth, y: (-_pv.y * 0.5 + 0.5) * innerHeight, behind: _pv.z > 1 };
  }

  return {
    scene, camera, update, project,
    get active() { return active; },
    open(o = {}) {
      if (!built) { build({ day: o.day, winter: o.winter }); built = true; }
      active = true;
      rig.cur = null; goto(shot(new THREE.Vector3(0, 0, 8), 165, 0.92), 0.01);
      if (o.focus && NODES[o.focus]) this.focus(o.focus);
    },
    close() { active = false; },
    overview() { goto(shot(new THREE.Vector3(0, 0, 8), 165, 0.92)); },
    // 기본 48/0.72 — d30은 드레싱이 보드게임 말처럼 읽혀 "축소 스케일" 감각의 원흉(3단 실측 d30/48/70).
    //   d48부터 노드가 '구역'으로, 주변 폐허가 맥락으로 읽힌다. 위성 픽션 정합. 인자는 판정·연출용 오버라이드.
    focus(id, dist = 48, elev = 0.72) { const nd = NODES[id]; if (nd) goto(shot(new THREE.Vector3(nd.x, 0, nd.z), dist, elev)); },
    nodes: Object.keys(NODES),
    nodeAt(id) { return NODES[id]; }, // S2 오버레이: 핀 월드좌표 조회
    ogState: () => ({ ...ogInfo }), // QA: 잠식 연차·인스턴스 수 (#71 overgrowthState 대응)
    qaFreeze(t = 12345) { _qaT = t; }, // 골든: 화톳불·비컨 펄스 위상 고정(카메라 이징은 실시간 유지 — 정착 후 캡처)
  };
}
