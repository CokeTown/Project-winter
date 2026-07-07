// render/shelters.js — Tier4 렌더 추출 Phase1-①: 셸터 build 함수(buildRoom/buildEnv).
//   설계: primitive(THREE·mergeGeometries·B/Cyl/lamb/seededRand/paintGeo/vcLambert·텍스처)는
//   이미 모듈이라 직접 import. game.js 클로저 헬퍼(wallPhong/stdWall/makeWalls/tag*/attach*/groundPlane/
//   wlBlock/ogGround/deadTreeGeo/buildCarWreck/buildPowerPole/buildRuinCity)와 가변 렌더 상태
//   (roomGroup/envRoot=안정 const 직접, ROOM=getROOM 게터, blockers/envDyn=setter)만 ctx 주입.
//   게이트: 이관 후 `npm run golden` diff 0 = 무손실. game.js가 SHELTERS에서 SHELTER_META와 병합.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert } from '../lib/helpers.js';
import { makeCanvasTex, floorWoodTex, wallWoodTex, metalTex, plywoodTex, brickTex, subwayTileTex, concreteTex, frostTex, beamTex, floorGlowTex } from './textures.js';
import { SHELTER_META } from '../data/shelters.js'; // rooftop이 정적 _slab 필드 참조 (SHELTERS 순환 회피)

export function makeShelterBuilders(ctx) {
  const {
    roomGroup, envRoot, getROOM, setBlockers, setEnvDyn, getEnvDyn,
    wallPhong, stdWall, makeWalls, tagDecoFloor, tagDecoWall, tagCeiling, tagSway, attachToWall,
    groundPlane, wlBlock, ogGround, ogAttach, ogRock, ogZone, addRoofGrass, deadTreeGeo, pineGeo, BP,
    buildCarWreck, buildPowerPole, buildRuinCity, buildRooftopSlate,
    buildObservatorySite, buildCablecarSite, buildBreakwaterSite, buildRailSegments,
  } = ctx;
  return {
    container: {
      buildRoom() {
        const { w, d, h } = getROOM();
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
        setBlockers([]);
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
        setEnvDyn({});
      },
    },
    rooftop: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
        const { w, d, h } = ROOM;
        const S = SHELTER_META.rooftop._slab;
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    cabin: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    bus: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    subway: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        const ROOM = getROOM();
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    greenhouse: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        const ROOM = getROOM();
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    lighthouse: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
        const envDyn = getEnvDyn(); // 라이브 game.js envDyn — buildRoom이 _beam 스태시(프로퍼티 변형, wholesale 아님)
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
        setBlockers(blockers);
      },
      buildEnv() {
        const envDyn = getEnvDyn(); // 라이브 game.js envDyn — buildRoom이 스태시한 _beam을 소비(프로퍼티 변형)
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
    tugboat: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        const ROOM = getROOM();
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    controltower: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    lodge: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
  };
}
