// render/shelters.js — Tier4 렌더 추출 Phase1-①: 셸터 build 함수(buildRoom/buildEnv).
//   설계: primitive(THREE·mergeGeometries·B/Cyl/lamb/seededRand/paintGeo/vcLambert·텍스처)는
//   이미 모듈이라 직접 import. game.js 클로저 헬퍼(wallPhong/stdWall/makeWalls/tag*/attach*/groundPlane/
//   wlBlock/ogGround/deadTreeGeo/buildCarWreck/buildPowerPole/buildRuinCity)와 가변 렌더 상태
//   (roomGroup/envRoot=안정 const 직접, ROOM=getROOM 게터, blockers/envDyn=setter)만 ctx 주입.
//   게이트: 이관 후 `npm run golden` diff 0 = 무손실. game.js가 SHELTERS에서 SHELTER_META와 병합.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert } from '../lib/helpers.js';
import { makeCanvasTex, floorWoodTex, wallWoodTex, metalTex, plywoodTex, brickTex, subwayTileTex, concreteTex, stoneBlockTex, frostTex, beamTex, floorGlowTex } from './textures.js';
import { SHELTER_META } from '../data/shelters.js'; // rooftop이 정적 _slab 필드 참조 (SHELTERS 순환 회피)
import { projectSiteStage } from '../core/projects.js'; // bunker 뒷문 undercroft 단계별 성장 (순수 술어)
// 순수 지오/프롭 빌더 → render/props.js에서 직접 import(주입 아님 — ctx 슬림화)
import { deadTreeGeo, pineGeo, addRoofGrass, groundPlane, buildObservatorySite, buildCablecarSite, buildBreakwaterSite, tagDecoFloor, tagDecoWall } from './props.js';

export function makeShelterBuilders(ctx) {
  const {
    roomGroup, envRoot, state, getROOM, setBlockers, setEnvDyn, getEnvDyn, getWallList, setWallList, setBunkerStairs, setSubwayHidden,
    wallPhong, stdWall, makeWalls, tagCeiling, tagSway, attachToWall,
    wlBlock, ogGround, ogAttach, ogRock, ogZone, BP,
    buildCarWreck, buildPowerPole, buildRuinCity, buildRooftopSlate, buildRailSegments,
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
          rand(); // (시퀀스 보존) — 종전 불켜진 창 판정 자리. 디렉터 신고: 폐허에 불켜진 창=비현실 → 전부 어둠
          winGeos.push(paintGeo(wg, 0x131720));
        }
        roomGroup.add(new THREE.Mesh(mergeGeometries(winGeos), vcLambert));

        // ── 내려가는 사다리 (디렉터: 불켜진 창 대신 현실적 — 옥탑에서 아래로 접근하는 철제 사다리) ──
        //   건물 앞면(+z, 카메라 방향) 좌측에 세로대 2 + 가로대. 파라펫 아래에서 시작해 아래로 뻗는다.
        {
          const ladderMat = wallPhong({ color: 0x37373b }); ladderMat.userData.shared = true; // 어두운 철제
          const ladder = new THREE.Group();
          const ladH = 9.2, railGap = 0.46, rr = 0.045;
          for (const rx of [-railGap / 2, railGap / 2]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(rr * 2, ladH, rr * 2), ladderMat);
            rail.position.set(rx, -ladH / 2, 0); rail.castShadow = true; ladder.add(rail);
          }
          for (let i = 0; i * 0.4 <= ladH; i++) {
            const rung = new THREE.Mesh(new THREE.BoxGeometry(railGap + rr * 2, rr * 1.5, rr * 3), ladderMat);
            rung.position.set(0, -0.15 - i * 0.4, 0); ladder.add(rung);
          }
          // 앞면 좌측, 건물 전면보다 살짝 앞(+z)으로 돌출시켜 벽에 붙인 느낌
          ladder.position.set(slabCX - slabW * 0.30, -0.25, slabCZ + (slabD + 0.4) / 2 + 0.06);
          roomGroup.add(ladder);
        }

        // ── 가벽 방 (콘크리트 옥탑 구조물 뼈대 + 주워 모은 패널/합판 가벽) ──
        // 방은 원점 중심. 컬링용 벽 4장 + 문 개구부(+z). 슬레이트 지붕은 별도(rooftopSlate).
        const plyMat = wallPhong({ map: plywoodTex }); plyMat.userData.shared = true;
        tagDecoWall(plyMat); // (B-①) 옥탑 가벽의 합판 낱장 — 벽지 대상 (색판 낱장은 폐허 자재감 유지)
        // 뒤섞인 판자 팔레트 (색·재질 뒤섞인 도시 폐허 자재)
        const panelCols = [0x8a7350, 0x6e6350, 0x7d6a4a, 0x5f6a6e, 0x86745a, 0x655b48, 0x6a6660];
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
          // 문 개구부 메타(디렉터: "문이 투명화됐을 땐 빛이 나오지 않아") — makeWalls가 섀도 프록시에
          //   같은 구멍을 남겨, 벽이 컬링돼도 문으로 새던 빛이 그대로 산다. 로컬 x 기준.
          if (doorC != null) g.userData.doorGap = { x: doorC * len - len / 2, w: doorW, h: 1.8 };
          return g;
        };
        // 문은 앞(+z) 벽에. 컬링을 위해 makeWalls 계약(그룹+법선)으로 등록.
        makeWalls([
          { group: mkPatchWall(w, 0.5), pos: [0, 0, d / 2 + 0.09], rotY: 0, normal: new THREE.Vector3(0, 0, 1) },
          { group: mkPatchWall(w), pos: [0, 0, -d / 2 - 0.09], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
          { group: mkPatchWall(d), pos: [-w / 2 - 0.09, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
          { group: mkPatchWall(d), pos: [w / 2 + 0.09, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
        ]);
        // 콘크리트 옥탑 뼈대 기둥 4개 (모서리) — 칩 task_ad77c624 본수정: 종전엔 makeWalls 이전에
        //   roomGroup 직속 생성이라 컬링 미편입 → 전면 벽이 페이드돼도 검은 막대 2개가 시야 정중앙에
        //   남던 것(트레일러 B0 신고의 원인). 앞(+z)/뒤(-z) 벽 컬링에 편입해 벽과 함께 페이드한다.
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
          attachToWall(0, 0, sz,
            B(roomGroup, 0.18, h + 0.1, 0.18, 0x5a5a57, sx * (w / 2 + 0.09), (h + 0.1) / 2, sz * (d / 2 + 0.09)));
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
        // 디렉터 신고(폐허 현실감): 불켜진 창 제거 — 원경 도시 litChance 0.6/0.45 → 0 (아무도 없는 도시=어둠)
        const near = buildRuinCity(envRoot, rand, { count: 9, rMin: 13, rMax: 22, hMin: 6, hMax: 14, baseY: -18, litChance: 0, dynCull: true, ogPer: 1.6 });
        buildRuinCity(envRoot, rand, { count: 16, rMin: 24, rMax: 46, hMin: 8, hMax: 20, baseY: -18, litChance: 0, ogPer: 1.2 });
        ogGround((x, z) => -18.1, 15, 26, 3); // 노면 균열 사이 수풀(도로 평면 y 고정)
        // 저 멀리 화재가 난 빌딩
        const fx = 20, fz = -14, fy = -2;
        // 저 멀리 화재 — 발광 구체(디렉터 신고: "태양도 아닌 빨간 공")는 건물 없이 떠 보여 제거.
        //   원경 화광 PointLight만 남겨 어두운 폐허에 은은한 주황 물듦만 유지(밤 하늘은 moonMesh 담당).
        const fire = new THREE.PointLight(0xff7030, 18, 24, 1.8);
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
        if (state.subwayHidden) {
          // §9.6 「침묵」 발견 후: 버려진 역 — 주황 픽스처·출구 표지를 끄고 붉은 비상등만 남긴다.
          //   (디렉터 확정 2026-07-08: 통로 발견 순간부터. 일반 거주 조명은 아래 else 그대로 — 골든 불변)
          for (const px of [-w / 4, w / 4]) {
            const fx = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.1, 0.12),
              new THREE.MeshLambertMaterial({ color: 0x6a1a12, emissive: 0xcc2211, emissiveIntensity: 1.0 }));
            fx.position.set(px, h - 0.32, 0.4 + 0.36); roomGroup.add(fx);
          }
          const emg = new THREE.PointLight(0xff4030, 0.4, 9.5, 1.6);
          emg.position.set(0, h - 0.5, 0.4); roomGroup.add(emg);
          // 출구 표지는 꺼졌다 — 애초에 올라가는 곳이 없던 역이다 (자기발광 제거, 어두운 판만)
          const exitSign = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.08),
            new THREE.MeshLambertMaterial({ color: 0x1c2420 }));
          exitSign.position.set(-w / 3, h - 0.42, -d / 2 + 0.18); roomGroup.add(exitSign);
        } else {
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
        }
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
        // §9.6 「침묵」 히든 히트 영역: 왼쪽 터널 개구부(붉은 비상등이 지키는 어둠 — 열차가 막은 오른쪽과 대구).
        //   불가시 재질 = 렌더 픽셀 0(골든 무충돌), 레이캐스트 전용. 게이트·더블탭 판정은 game.js pickHidden.
        {
          const hz = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.0, 3.6),
            new THREE.MeshBasicMaterial({ visible: false }));
          hz.position.set(-w / 2 - 4.5, 1.0, d / 2 + 2.1);
          envRoot.add(hz);
          setSubwayHidden(hz);
        }
        // §9.6 개척 현장 (site='hiddenGate') — 발견 후에만, 단계별 성장: 허문 벽 → 버팀목 → 등불·사다리.
        //   발견 전엔 어떤 단서도 없다(§5.1). 개구부 앞쪽(승강장 시야)에 세워 검은 홀을 배경으로 읽힌다.
        {
          const hs = projectSiteStage('hiddenGate');
          if (state.subwayHidden && hs > 0) {
            const g = new THREE.Group();
            B(g, 1.1, 0.25, 3.4, 0x2a2c30, 0, 0.05, 0);           // 허문 잔해단 (1단계~)
            B(g, 0.18, 2.4, 0.18, 0x3a342c, 0, 1.2, -1.5);        // 문설주(앞)
            B(g, 0.18, 2.4, 0.18, 0x3a342c, 0, 1.2, 1.5);         // 문설주(뒤)
            if (hs >= 2) {                                        // 2단계: 갱도 버팀목
              B(g, 0.14, 2.2, 0.14, 0x6a5636, 0, 1.1, -0.9);
              B(g, 0.14, 2.2, 0.14, 0x6a5636, 0, 1.1, 0.9);
              B(g, 0.14, 0.14, 2.0, 0x6a5636, 0, 2.2, 0);         // 상인방
            }
            if (hs >= 3) {                                        // 3단계~완공: 아래로 내려가는 사다리 + 작업 등불
              const lad = new THREE.Group();
              for (let i = 0; i < 5; i++) B(lad, 0.5, 0.05, 0.06, 0x7a6a4a, 0, 0.3 + i * 0.45, 0);
              B(lad, 0.06, 2.4, 0.06, 0x8a7a55, 0, 1.2, -0.25);
              B(lad, 0.06, 2.4, 0.06, 0x8a7a55, 0, 1.2, 0.25);
              lad.position.set(0.2, -0.9, 0);
              g.add(lad);
              const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5),
                new THREE.MeshLambertMaterial({ color: 0xffd890, emissive: 0xaa7722, emissiveIntensity: 1.1 }));
              lamp.position.set(0.3, 2.0, 0); g.add(lamp);
            }
            g.position.set(-w / 2 - 3.9, 0, d / 2 + 2.1);
            envRoot.add(g);
          }
        }
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
        // 조타실 — 벽 한 장이 아니라 부피 있는 선실(디렉터 신고 2026-07-11: "판지 같다").
        //   앞벽(현창·문) + 측벽 + 후벽 + 지붕을 한 그룹에 담아 기존과 동일하게 컬링(뒤에서 보면 통째 페이드).
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
        {
          const cabC = 0xb4b0a4;
          for (const sx of [-1, 1]) B(wheelhouse, 0.24, 2.2, 1.34, cabC, sx * (w / 2 - 0.12), 1.1, -0.75).castShadow = true; // 측벽
          B(wheelhouse, w, 2.2, 0.24, 0xa8a498, 0, 1.1, -1.4).castShadow = true;                                             // 후벽
          const cRoof = B(wheelhouse, w + 0.5, 0.18, 1.95, 0x8a8578, 0, 2.29, -0.68); cRoof.castShadow = true;               // 지붕(처마)
          B(wheelhouse, 0.8, 1.6, 0.08, 0x4a4238, 0.95, 0.85, 0.19);                                                         // 승무원 문
          B(wheelhouse, 0.1, 0.1, 0.1, 0xd8c890, 0.63, 0.9, 0.24);                                                            // 문손잡이
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
        buildBreakwaterSite(roomGroup, w / 2 + 2.4, -2.2, d / 2 - 0.5); // oy=-2.2: 돌축대가 수면(sea y≈-2.4)에서 솟도록 접지. oy=0이면 물 위 2.2 부유(코드 감사 2026-07-11).
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
        buildBreakwaterSite(roomGroup, -w / 2 - 3.0, -15.5, d / 2 + 1.0); // oy=-15.5: 항구 수면 y≈-15.7 접지. oy=-2.0이면 항구 위 13.5 부유(코드 감사 2026-07-11).
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
        //   oy=-0.88: 방 밖 설원 지면(GY -0.9) 접지. roomGroup 기준 y0으로 붙이면 0.9 부유(디렉터 신고 2026-07-11).
        buildObservatorySite(roomGroup, 0, -0.88, -d / 2 - 3.2);
        buildCablecarSite(roomGroup, w / 2 + 3.4, -0.88, d / 2 + 1.0);
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
    bunker: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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

        // 돔 반경/두께/스테이브 수 — 뒷벽을 돔 곡면에 맞춰 자르려면(관통 방지) 뒷벽 빌드 앞에서 정의.
        const R = 4.35, T = 0.42, SEG = 11;
        // 뒷벽: 벽돌 + 문 + 액자 — (B-①) 벙커의 곧은 내벽. 벽지 대상.
        //   디렉터 라이브("네모 벽돌이 타원형을 뚫고 나온다"): 꽉 찬 사각형(w×h=8.5×3)은 옆(x≈±4.25)에서 돔 반원 높이
        //   √(R²−x²)≈0.92보다 훨씬 높아(y=3) 상단 모서리가 돔 곡면 밖으로 삐져나왔다 → 정면 파사드와 동일한 반달
        //   Shape(반경 R−0.06)로 재구성해 돔 단면 안에 딱 맞춘다(관통 소멸, 앞뒤 반달벽 대칭).
        const brickMat = wallPhong({ map: brickTex });
        brickMat.userData.shared = true;
        tagDecoWall(brickMat);
        const back = new THREE.Group();
        const bwShp = new THREE.Shape();
        bwShp.moveTo(R - 0.06, 0); bwShp.absarc(0, 0, R - 0.06, 0, Math.PI, false); bwShp.lineTo(-(R - 0.06), 0);
        const bw = new THREE.Mesh(new THREE.ExtrudeGeometry(bwShp, { depth: 0.24, bevelEnabled: false }), brickMat);
        bw.position.z = -0.12; bw.castShadow = bw.receiveShadow = true;
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
        // 뒷벽도 반달(곡면 상단)이라 파사드와 동일하게 눈 캡 제외 — 없으면 bb 상단(돔 정점 y≈4.27)에
        //   폭 8.4짜리 '가로 흰 바'가 부유한다(디렉터 재신고 2026-07-11, #94 때 파사드만 태깅되고 뒷벽 누락).
        back.userData.noWeatherCap = true;
        const wallDefs = [{ group: back, pos: [0, 0, -d / 2 - 0.13], rotY: 0, normal: new THREE.Vector3(0, 0, -1) }];
        back.position.set(...wallDefs[0].pos);

        // 돔 아치 쉘 (좌/우 반쪽 스테이브 — 시야 방향 자동 컬링). R/T/SEG는 위(뒷벽 앞)에서 정의됨.
        const shellCols = [0xb5b1a6, 0xa8a49a, 0x99958b, 0x8f8b82];
        const grassPal = [0x6a7f4a, 0x8a8a4f, 0xa3703f, 0x5f7a45];
        const zBack = -d / 2 - 0.4;
        const roofFixed = state.bunkerRoof === 'full';   // 완전 수리 시 외피 갈라짐 메움
        const roofTemp = state.bunkerRoof === 'temp';    // 임시 덮개 시 일부만 보강
        // v1.5.3 0.9 원본 스테이브 복원(디렉터 라이브 신고: "중간에 회색 붕 뜬다" + "0.9 스테이브로 복원").
        //   [되돌린 것] #81 연속 반원통 셸 + 상시 콘크리트 라이너(inner) + #87 상/하 밴드 분리.
        //     → 상부 밴드가 천장 컬링으로 페이드될 때 안쪽 라이너가 회색 반투명 아치로 공중에 뜨는 아티팩트가 남았다.
        //   [0.9 방식] 반쪽마다 낱장 박스 스테이브 SEG개. 미보수 시 일부 조각을 건너뛰거나(구멍) 짧게(단축) 만들어
        //     '갈라진 외피 사이로 하늘/별이 보이는' 폐허 돔. 상시 라이너 없음 → 붕뜸 원천 소멸.
        //     temp=정점 방수포, full=조각 온전 + 안쪽 콘크리트 라이너로 봉합. 좌/우 반쪽은 시야 방향 벽 컬링(정점 천장 컬링 없음).
        //   일반화(v1.5.4): zbk=반쪽 뒤 가장자리 z, depBase=z깊이, solid=true면 온전(구멍/단축 없음, 확장 돔용).
        const mkHalf = (thetaFrom, seed, zbk, depBase, solid) => {
          const g = new THREE.Group();
          const rand = seededRand(seed);
          for (let i = 0; i < SEG; i++) {
            const th = thetaFrom + (i + 0.5) * (Math.PI / 2) / SEG;
            // 정점 대역(|th-π/2|<0.38)은 항상 온전: 정점 낱장이 빠지거나 짧아지면 이웃 없는 조각이
            //   하늘 배경에 '떠 있는 판자'로 읽힌다(디렉터 신고 2026-07-11). 균열은 측면 대역으로 한정.
            //   rand() 소비 횟수는 기존과 동일하게 유지(같은 시드 → 측면 조각 배치 불변).
            const crown = Math.abs(th - Math.PI / 2) < 0.38;
            // 갈라진 외피: 일부 조각은 짧거나 없음 (천장 수리하면/solid면 메워진다)
            if (!solid && !roofFixed && rand() < 0.1 && !crown && th > 0.5 && th < Math.PI - 0.5) continue;
            let dep = depBase;
            if (!solid && !roofFixed && rand() < 0.34) { const shortF = 0.5 + rand() * 0.32; if (!crown) dep *= shortF; } // 수리/solid하면 짧은(뚫린) 조각 없음
            const arcLen = R * (Math.PI / 2) / SEG + 0.1;
            const col = rand() < 0.16 ? 0x5d594f : shellCols[Math.floor(rand() * shellCols.length)];
            const m = new THREE.Mesh(new THREE.BoxGeometry(arcLen, T, dep), lamb(col));
            m.position.set(R * Math.cos(th), R * Math.sin(th), zbk + dep / 2);
            m.rotation.z = th + Math.PI / 2;
            m.castShadow = m.receiveShadow = true;
            g.add(m);
            // 외피 위에 자란 풀
            if (th > 0.35 && th < Math.PI - 0.35 && rand() < 0.5) {
              const gh2 = 0.15 + rand() * 0.25;
              const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.07 + rand() * 0.07, gh2, 5),
                lamb(grassPal[Math.floor(rand() * grassPal.length)]));
              const rr = R + T / 2 + gh2 / 2 - 0.03;
              tuft.position.set(rr * Math.cos(th), rr * Math.sin(th), zbk + 0.6 + rand() * (dep - 1));
              tuft.rotation.z = th - Math.PI / 2 + (rand() - 0.5) * 0.4;
              g.add(tuft);
            }
          }
          return g;
        };
        const right = mkHalf(0, 21, zBack, d + 1.0, false);           // x>0 쪽
        const left = mkHalf(Math.PI / 2, 43, zBack, d + 1.0, false);  // x<0 쪽
        roomGroup.add(right); roomGroup.add(left);
        // #94('1자 바'): 반쪽 bb 상단(돔 정점 y≈R)에 눈 캡이 가로바로 뜨던 문제 → 캡 제외.
        right.userData.noWeatherCap = true;
        left.userData.noWeatherCap = true;
        // 좌/우 반쪽은 시야 방향 벽 컬링 — 근접 반쪽이 통째로 사라져 실내 노출(0.9 방식, 정점 천장 컬링 없음).
        wallDefs.push({ group: right, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(1, 0, 0) });
        wallDefs.push({ group: left, pos: [0, 0, 0], rotY: 0, normal: new THREE.Vector3(-1, 0, 0) });
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

        // 천장 임시 덮개(temp): 정점 부근에 방수포 한 장. 완전 수리(full)는 mkHalf에서 외피가 이미 메워짐.
        if (roofTemp) {
          const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, d + 0.6), lamb(0x53616a));
          tarp.position.set(0, R - 0.15, zBack + (d + 0.6) / 2 + 0.2);
          tarp.rotation.z = 0.04;
          tarp.castShadow = tarp.receiveShadow = true;
          tagCeiling(tarp, ROOM.h + 0.2); roomGroup.add(tarp); // ⑥-a: 부감에서 천장 덮개 투시
        }
        // 완전 수리(full): 아치 안쪽에 매끈한 콘크리트 라이너를 덧대 '온전한 천장' 느낌.
        if (roofFixed) {
          const liner = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.3, R - 0.3, d + 0.9, 16, 1, true, 0, Math.PI), wallPhong({ map: concreteTex }));
          liner.rotation.z = Math.PI / 2; liner.rotation.y = Math.PI / 2;
          liner.position.set(0, 0, zBack + (d + 0.9) / 2);
          liner.material.side = THREE.BackSide;
          tagCeiling(liner, ROOM.h + 0.2); roomGroup.add(liner); // ⑥-a: 완전 수리 라이너는 실내를 덮는 천장 — 부감에서 투시
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
          setBunkerStairs(stairs); // 상호작용 대상 (game.js 계단 레이캐스트 대상 — setter 주입)
          store.add(stairs);

          // store는 back 그룹 좌표계라 back의 위치/컬링을 그대로 따른다
          back.add(store);

        }
        // #81 ⑦→#87 ③ 격상: 후면 소형 돔(전실+하강 계단실 외피) + 짧은 연결 통로 — 뒷문 개방 여부와 무관하게 '상시' 존재.
        //   디렉터 원안: 뒷문을 딸 수 있으려면 그 뒤에 물리 공간이 먼저 있어야 한다. E-2가 개방 후에만 세우던 것을 교정.
        //   개방 전에는 잠긴 철문(위 lock) 뒤의 밀폐 공간으로 읽히고, 개방하면 전실(store)이 그 내부가 된다.
        {
          {
            // v1.5.2(디렉터 신고 — 라이브): "소형 돔이 아니고 동일 사이즈의 돔이 뒤에" → 메인 돔과 동일 반경(R)의
            //   2번째 돔을 중앙(x=0)에 세우고, 메인 돔 뒷면(zBack)에 앞 가장자리를 접하게 배치(두 돔이 앞뒤로 나란히).
            // 후면(확장) 돔 — 앞 돔과 동일 반경(R)/결의 '스테이브 돔' + 내부(바닥·먼 반달벽).
            //   디렉터 라이브: "확장된 왼쪽은 OK, 오른쪽(확장 돔)이 매끈 블롭 → 기존 돔처럼" + "확장 돔 내부도 구현".
            //   [셸] 온전 스테이브(solid=구멍 없음) 좌/우 반쪽. 정면/외부에선 불투명 돔 실루엣(투시 없음), 후면 회전 시
            //     근접 반쪽이 컬링돼 내부 노출(메인 돔과 동일 사상). ★ makeWalls는 wallList를 리셋하므로 재호출 불가 →
            //     빌드된 반쪽/먼벽을 wallList에 직접 push해 동일 컬 루프(updateWallCulling)에 편입(proxy=null 가드됨).
            const sR = 4.35, sDep = 5.0;
            const rearCz = -d / 2 - 0.4 - sDep / 2;          // 확장 돔 중심 z (앞 가장자리가 메인 돔 뒷면 zBack=-d/2-0.4에 접함)
            const rearZBack = rearCz - sDep / 2;             // 스테이브 뒤(먼) 가장자리 z
            const rearRight = mkHalf(0, 61, rearZBack, sDep, true);           // x>0 반쪽 (온전)
            const rearLeft = mkHalf(Math.PI / 2, 62, rearZBack, sDep, true);  // x<0 반쪽 (온전)
            rearRight.userData.noWeatherCap = true; rearLeft.userData.noWeatherCap = true;
            // 정수리 통풍구 + 외피 이끼 — 각 반쪽 그룹에 넣어 함께 컬링(허공 부유 방지, #87 사상)
            const rsr = seededRand(311);
            const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.34, 10), lamb(0x77736a));
            vent.position.set(0, sR - 0.04, rearCz); vent.castShadow = true; rearRight.add(vent);
            for (let i = 0; i < 7; i++) {
              const th = 0.35 + rsr() * (Math.PI - 0.7);
              const rr = sR + 0.05;
              const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.06 + rsr() * 0.06, 0.16 + rsr() * 0.2, 5),
                lamb([0x6a7f4a, 0x8a8a4f, 0x5f7a45][Math.floor(rsr() * 3)]));
              tuft.position.set(rr * Math.cos(th), rr * Math.sin(th), rearCz + (rsr() - 0.5) * (sDep - 0.6));
              tuft.rotation.z = th - Math.PI / 2 + (rsr() - 0.5) * 0.4;
              (th < Math.PI / 2 ? rearRight : rearLeft).add(tuft);
            }
            roomGroup.add(rearRight); roomGroup.add(rearLeft);
            // ★ 뒷문 해금(bunkerBackdoor) 시에만 컬링 등록 → 근접 반쪽이 열려 내부 투시. 잠김 상태는 wallList 미등록
            //   = 항상 불투명한 온전 돔(디렉터: "불투명해야지. 문 열기 조건 달성시에만 뒤를 투명하게"). solid 스테이브라 셸 자체도 불투명.
            if (state.bunkerBackdoor) {
              getWallList().push({ group: rearRight, normal: new THREE.Vector3(1, 0, 0), proxy: null });
              getWallList().push({ group: rearLeft, normal: new THREE.Vector3(-1, 0, 0), proxy: null });
            }
            // 내부 바닥(콘크리트) + 어두운 받침 — 확장 돔 안이 텅 빈 껍데기가 아니라 '방'이 되게(디렉터: 내부 구현)
            const rFloor = new THREE.Mesh(new THREE.BoxGeometry(2 * sR - 0.5, 0.16, sDep - 0.15), lamb(0x6b6760));
            rFloor.position.set(0, -0.08, rearCz); rFloor.receiveShadow = true; roomGroup.add(rFloor);
            B(roomGroup, 2 * sR + 0.4, 0.6, sDep + 0.3, 0x2b2e36, 0, -0.46, rearCz);
            // 먼(뒤) 반달 벽 — 확장 돔 -z 끝을 막음. 후면 회전 시 컬링돼 내부 노출(normal -z, 메인 뒷벽과 대칭).
            const rearWall = new THREE.Group();
            {
              const rwShp = new THREE.Shape();
              rwShp.moveTo(sR - 0.06, 0); rwShp.absarc(0, 0, sR - 0.06, 0, Math.PI, false); rwShp.lineTo(-(sR - 0.06), 0);
              const rw = new THREE.Mesh(new THREE.ExtrudeGeometry(rwShp, { depth: 0.22, bevelEnabled: false }), wallPhong({ map: concreteTex }));
              rw.position.z = -0.11; rw.castShadow = rw.receiveShadow = true; rearWall.add(rw);
            }
            rearWall.position.set(0, 0, rearZBack);
            rearWall.userData.noWeatherCap = true;
            roomGroup.add(rearWall);
            if (state.bunkerBackdoor) getWallList().push({ group: rearWall, normal: new THREE.Vector3(0, 0, -1), proxy: null }); // 해금 시에만 컬링(잠김=불투명 뒷벽)
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
        setBlockers(blockers);
      },
      buildEnv() {
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },
    ship: {
      buildRoom() {
        const ROOM = getROOM();
        let blockers = [];
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
        setWallList([]);
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
        setBlockers(blockers);
      },
      buildEnv() {
        const ROOM = getROOM();
        let envDyn;
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
        setEnvDyn(envDyn);
      },
    },

    /* ── 2.0 동부 「대도시」 셸터 1: 세관 (GD-2.0 §6.0.5 기초 모델링 — Fable) ──
       심사 홀이 거처. TLOU 3년차: 실내외 식생 수동 + ogGround 연차 수풀. 노을 팔레트는 META.mood.
       기초 단계 원칙: 구조·소품·식생 자리를 다 잡고, 마이크로 디테일(오염·데칼·파편)은 Opus 패스 몫.
       blockers는 소품을 벽면에 붙여 배치 충돌을 피했으므로 기초 단계에선 비움. */
    customs: {
      buildRoom() {
        const { w, d, h } = getROOM();
        const rand = seededRand(2401);
        // 바닥: 콘크리트 + 마모 띠
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ map: concreteTex }));
        floor.material.color.setHex(0xcfc9bd);
        floor.position.y = -0.125; floor.receiveShadow = true;
        tagDecoFloor(floor); roomGroup.add(floor);
        for (let i = 0; i < 3; i++) B(roomGroup, 1.2 + rand() * 1.6, 0.012, 0.5 + rand() * 0.5, 0xb4aea0, -w / 3 + rand() * w * 0.66, 0.006, -d / 3 + rand() * d * 0.66);
        // 벽 4면: 회색 콘크리트. 앞벽(-z) 큰 창 2(도로 조망), +x 벽 민원 창구 창
        const wallMat = wallPhong({ map: concreteTex });
        wallMat.userData.shared = true;
        const mk = (len, opts) => stdWall(len, h, wallMat, opts);
        makeWalls([
          { group: mk(w, { window: { winW: 1.5, winH: 0.9, winY: 1.35, winX: -1.5 }, frameColor: 0x555149, skyColor: 0x6a3a34 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
          { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
          { group: mk(d, { window: { winW: 1.1, winH: 0.7, winY: 1.4, winX: 0.8 }, frameColor: 0x555149, skyColor: 0x6a3a34 }), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
          { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
        ]);
        // 심사 카운터 (+x 벽면): 긴 데스크 + 파티션 3칸 — customsSeal 개조 시 유리 대신 판자 봉쇄
        const mods = state.mods?.customs || [];
        const deskX = w / 2 - 0.55;
        B(roomGroup, 0.9, 0.95, 4.2, 0x8a8276, deskX, 0.48, -0.2);
        B(roomGroup, 1.0, 0.06, 4.4, 0x9a938a, deskX, 0.98, -0.2);
        for (let i = 0; i < 3; i++) {
          const pz = -1.9 + i * 1.6;
          B(roomGroup, 0.06, 0.9, 0.06, 0x4a463f, deskX, 1.5, pz - 0.6); B(roomGroup, 0.06, 0.9, 0.06, 0x4a463f, deskX, 1.5, pz + 0.6);
          B(roomGroup, 0.05, 0.06, 1.26, 0x4a463f, deskX, 1.95, pz);
          if (mods.includes('customsSeal')) {
            // 판자 봉쇄: 가로 판 3장 + 비스듬한 덧판 — 외풍이 멎는다 (comfort.js customsSeal 상쇄와 세트)
            for (let k = 0; k < 3; k++) B(roomGroup, 0.06, 0.22, 1.2, 0x6a5238, deskX, 1.22 + k * 0.3, pz);
            const brace = B(roomGroup, 0.07, 0.16, 1.3, 0x5a4530, deskX + 0.01, 1.5, pz); brace.rotation.x = 0.5;
          } else if (i !== 1) {
            B(roomGroup, 0.02, 0.8, 1.1, 0xaebfc2, deskX, 1.5, pz); // 유리(가운데 칸은 깨져 없음)
          }
        }
        // 수하물 컨베이어 (+z 뒷벽): 벨트 + 스캐너 아치 + 방치된 여행가방 2
        const beltZ = d / 2 - 0.62;
        B(roomGroup, 4.6, 0.55, 1.0, 0x3c3a36, -0.9, 0.28, beltZ);
        B(roomGroup, 4.6, 0.05, 0.84, 0x24221f, -0.9, 0.58, beltZ);
        B(roomGroup, 0.5, 1.5, 1.3, 0x77706a, 0.6, 0.75, beltZ);           // 스캐너 게이트 몸통
        B(roomGroup, 0.5, 0.5, 0.9, 0x1e1c1a, 0.6, 0.85, beltZ);           // 스캐너 터널 구멍
        B(roomGroup, 0.8, 0.5, 0.4, 0x6a4436, -2.2, 0.83, beltZ, );        // 가방 1 (가죽)
        B(roomGroup, 0.62, 0.42, 0.34, 0x2e4456, -0.2, 0.79, beltZ);       // 가방 2 (하드케이스)
        // 압수품 선반 (-x 벽): 2단 + 잡동 상자들 — customsClear 개조로 철거 가능(벽이 비면 배치 자유)
        if (!mods.includes('customsClear')) {
          for (const sy of [0.9, 1.6]) B(roomGroup, 0.5, 0.05, 3.4, 0x6a635a, -w / 2 + 0.36, sy, 0.6);
          for (let i = 0; i < 6; i++) B(roomGroup, 0.32 + rand() * 0.2, 0.26 + rand() * 0.16, 0.34, [0x8a6a4a, 0x5a6a5a, 0x74584a][i % 3], -w / 2 + 0.36, (i < 3 ? 0.9 : 1.6) + 0.18, -0.7 + (i % 3) * 1.3);
        } else {
          // 철거 흔적: 브래킷 자국 4점 + 벽 변색 띠 (뜯어낸 자리)
          for (let i = 0; i < 4; i++) B(roomGroup, 0.06, 0.08, 0.06, 0x55504a, -w / 2 + 0.16, i < 2 ? 0.9 : 1.6, -0.4 + (i % 2) * 2.0);
          B(roomGroup, 0.015, 0.9, 3.2, 0xc5bfb2, -w / 2 + 0.13, 1.25, 0.6);
        }
        // 안내판 (+z 벽 부착: 파란 판 + 흰 획 — 컬링 동기화)
        const signs = [];
        signs.push(B(roomGroup, 1.7, 0.5, 0.04, 0x2e4a6a, -2.2, 2.15, d / 2 + 0.1));
        for (let i = 0; i < 3; i++) signs.push(B(roomGroup, 1.1 - i * 0.25, 0.07, 0.02, 0xd8d4c8, -2.4, 2.28 - i * 0.14, d / 2 + 0.125));
        attachToWall(0, 0, 1, ...signs);
        // 쓰러진 차단봉 + 흩어진 서류
        const pole = B(roomGroup, 1.5, 0.08, 0.08, 0xa8433f, -2.4, 0.06, -1.6); pole.rotation.y = 0.5;
        for (let i = 0; i < 6; i++) { const p2 = B(roomGroup, 0.26, 0.012, 0.34, 0xd6d2c6, -3 + rand() * 4.5, 0.02, -2 + rand() * 3); p2.rotation.y = rand() * 3; }
        // 실내 식생 (TLOU): 창가·모서리 덩굴 + 바닥 틈 풀
        const vin = (x, y, z, s2) => B(roomGroup, s2, 0.5 + rand() * 0.5, s2, rand() < 0.5 ? 0x2a3d24 : 0x35492a, x, y, z);
        for (let i = 0; i < 5; i++) vin(-w / 2 + 0.3 + rand() * 0.4, 0.25 + i * 0.45, -d / 2 + 0.5 + rand() * 0.5, 0.5 - i * 0.06); // 모서리 담쟁이 기둥
        for (let i = 0; i < 6; i++) vin(-w / 3 + rand() * w * 0.6, 0.14, -d / 2 + 0.45 + rand() * 0.7, 0.24 + rand() * 0.18);       // 앞창 아래 풀
        setBlockers([]);
      },
      buildEnv() {
        const GY = -0.55;
        const rand = seededRand(2402);
        // 아스팔트 마당 + 차선 + 균열
        const lot = B(envRoot, 64, 0.3, 44, 0x54524d, 0, GY - 0.15, 0); lot.receiveShadow = true;
        for (let i = 0; i < 8; i++) B(envRoot, 0.24, 0.012, 2.2, 0xb8b09a, -3.5, GY + 0.01, -20 + i * 5.4);   // 차로 중앙선(남북)
        for (let i = 0; i < 8; i++) B(envRoot, 0.24, 0.012, 2.2, 0xb8b09a, 3.5, GY + 0.01, -20 + i * 5.4);
        for (let i = 0; i < 10; i++) { const cr = B(envRoot, 0.6 + rand() * 2, 0.014, 0.14, 0x3c3a36, -20 + rand() * 40, GY + 0.008, -16 + rand() * 32); cr.rotation.y = rand() * 3; }
        // 검문 캐노피 (남쪽 차로 위): 기둥 4 + 상판 + 세관 사인(적테 백판 + 청 엠블럼)
        const canZ = 9.5;
        for (const [px, pz] of [[-5.4, canZ - 1.6], [5.4, canZ - 1.6], [-5.4, canZ + 1.6], [5.4, canZ + 1.6]])
          B(envRoot, 0.45, 3.4, 0.45, 0x8a857a, px, GY + 1.7, pz);
        const canopy = B(envRoot, 12.6, 0.4, 4.6, 0x6e6a60, 0, GY + 3.6, canZ); canopy.castShadow = true;
        B(envRoot, 12.9, 0.18, 4.9, 0xa8433f, 0, GY + 3.86, canZ);
        B(envRoot, 3.4, 1.0, 0.14, 0xd8d4c8, 0, GY + 2.95, canZ - 2.36);   // 사인 백판
        B(envRoot, 3.6, 0.12, 0.16, 0xa8433f, 0, GY + 3.5, canZ - 2.37);   // 적테
        Cyl(envRoot, 0.32, 0.32, 0.08, 0x2e4a6a, -1.1, GY + 2.95, canZ - 2.44, 12).rotation.x = Math.PI / 2; // 청 엠블럼
        for (let i = 0; i < 2; i++) B(envRoot, 1.5 - i * 0.4, 0.09, 0.05, 0x2e4a6a, 0.5, GY + 3.12 - i * 0.2, canZ - 2.44); // 사인 획
        // 차단기 2 (내려온 것 + 부러진 것)
        { const g1 = new THREE.Group();
          B(g1, 0.3, 1.1, 0.3, 0x77706a, 0, 0.55, 0);
          const arm = new THREE.Group();
          for (let i = 0; i < 5; i++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.12), lamb(i % 2 ? 0xd8d4c8 : 0xa8433f)); seg.position.set(0.45 + i * 0.9, 0, 0); arm.add(seg); }
          arm.position.y = 1.0; g1.add(arm);
          g1.position.set(-7.4, GY, canZ); envRoot.add(g1); }
        { const stub = B(envRoot, 0.3, 1.1, 0.3, 0x77706a, 7.4, GY + 0.55, canZ);
          const broke = B(envRoot, 2.2, 0.12, 0.12, 0xd8d4c8, 6.2, GY + 0.18, canZ + 0.5); broke.rotation.y = 0.7; broke.rotation.z = 0.06; }
        // 검문 부스 2 (창 뚫린 키오스크)
        for (const bx of [-7.4, 7.4]) {
          B(envRoot, 1.7, 2.3, 1.7, 0x9a938a, bx, GY + 1.15, canZ - 3.4);
          B(envRoot, 1.2, 0.7, 0.06, 0x25313a, bx, GY + 1.55, canZ - 3.4 - 0.86);
          B(envRoot, 1.9, 0.24, 1.9, 0x6e6a60, bx, GY + 2.42, canZ - 3.4);
        }
        // 컨테이너 야적 (서쪽 스택 + 동쪽 소량) — 뮤트 팔레트, 끝면 문 리브
        const CCOL = [0x8a4a42, 0x4a6a6e, 0x9a8248, 0x5a6478, 0x6a7047];
        const cont = (x, y, z, rot, ci) => {
          const c2 = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.3, 2.2), lamb(CCOL[ci % CCOL.length])); body.castShadow = true; c2.add(body);
          for (const dz of [-0.55, 0.55]) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.9), lamb(0x2a2622)); rib.position.set(2.72, 0, dz); c2.add(rib); }
          c2.position.set(x, y + 1.15, z); c2.rotation.y = rot; envRoot.add(c2);
        };
        cont(-16, GY, -6, 0.06, 0); cont(-16.4, GY, -3.4, -0.04, 1); cont(-15.7, GY + 2.3, -4.8, 0.02, 2);
        cont(-16.2, GY, 2.5, 0.1, 3); cont(-15.8, GY + 2.3, 2.2, -0.06, 4); cont(-16, GY + 4.6, -1, 0.03, 1);
        cont(15.5, GY, -8, -1.5, 2); cont(16.2, GY, -2, 0.08, 0);
        // 버려진 트럭 2 (하나 기울어짐) — 대기 행렬의 잔재
        const truck = (x, z, rot, tilt) => {
          const t2 = new THREE.Group();
          const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 2.0), lamb(0x5a6478)); cab.position.set(-2.3, 1.05, 0); cab.castShadow = true; t2.add(cab);
          const box = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 2.1), lamb(0x8a8276)); box.position.set(0.6, 1.3, 0); box.castShadow = true; t2.add(box);
          for (const [wx, wz] of [[-2.5, -0.9], [-2.5, 0.9], [0.2, -0.95], [0.2, 0.95], [1.9, -0.95], [1.9, 0.95]]) {
            const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), lamb(0x1e1c1a));
            wh.rotation.x = Math.PI / 2; wh.position.set(wx, 0.42, wz); t2.add(wh);
          }
          t2.position.set(x, GY, z); t2.rotation.y = rot; if (tilt) t2.rotation.z = tilt;
          envRoot.add(t2);
        };
        truck(-4.2, 15.5, 0.12, 0); truck(4.6, 20.5, -0.24, 0.05);
        // 펜스 라인 (동서 경계) + 깃대(찢긴 깃발 sway)
        for (const fx of [-24, 24]) for (let i = 0; i < 9; i++) {
          B(envRoot, 0.12, 1.7, 0.12, 0x55524c, fx, GY + 0.85, -18 + i * 4.4);
          B(envRoot, 0.05, 0.05, 4.4, 0x66625a, fx, GY + 1.5, -15.8 + i * 4.4);
        }
        Cyl(envRoot, 0.07, 0.07, 5.4, 0x8a857a, -10.5, GY + 2.7, -7.5, 8);
        const flag = B(envRoot, 1.1, 0.62, 0.03, 0x6a3a34, -9.9, GY + 4.9, -7.5); tagSway(flag, 0.3);
        // 원경: 동부 도심 스카이라인(북쪽 실루엣) + 크레인
        for (let i = 0; i < 8; i++) {
          const bw = 4 + rand() * 5, bh = 8 + rand() * 14;
          const bd2 = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 4), lamb(i % 2 ? 0x35262c : 0x2c2026));
          bd2.position.set(-30 + i * 9 + rand() * 3, GY + bh / 2, -34 - rand() * 8); envRoot.add(bd2);
        }
        { const cr2 = new THREE.Group();
          const mast = new THREE.Mesh(new THREE.BoxGeometry(0.6, 16, 0.6), lamb(0x3c2c2a)); mast.position.set(0, 8, 0); cr2.add(mast);
          const jib = new THREE.Mesh(new THREE.BoxGeometry(11, 0.5, 0.5), lamb(0x3c2c2a)); jib.position.set(3.6, 15.6, 0); cr2.add(jib);
          const wire = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.5, 0.08), lamb(0x2a2020)); wire.position.set(7.6, 13.2, 0); cr2.add(wire);
          cr2.position.set(22, GY, -30); envRoot.add(cr2); }
        // 3년차 식생: 마당 수풀(차로 중앙 제외) + 캐노피 기둥·부스 덩굴
        ogGround((x, z) => GY, 20, 30, 6, (x, z) => Math.abs(x) > 2.6 || z < -14);
        for (const [vx, vz] of [[-5.4, canZ - 1.6], [5.4, canZ + 1.6], [-7.4, canZ - 3.4]])
          for (let i = 0; i < 4; i++) B(envRoot, 0.5 - i * 0.07, 0.6, 0.5 - i * 0.07, i % 2 ? 0x2a3d24 : 0x35492a, vx + (rand() - 0.5) * 0.3, GY + 0.4 + i * 0.62, vz + (rand() - 0.5) * 0.3);
      },
    },

    /* ── 2.0 동부 「대도시」 셸터 2: 다리 관리소 (GD-2.0 §6.0.5 기초 모델링 — Fable) ──
       석조 관리소(stoneBlockTex — "텍스처 고급" 1호). 창밖 주역 = 무너진 현수교(노을 비네트 문법 이식).
       밤 = META.mood의 stars 1.0 + milkyway + moonScale 2.3 (밤하늘 확장 첫 사용자). */
    bridgehouse: {
      buildRoom() {
        const { w, d, h } = getROOM();
        const rand = seededRand(2403);
        // 바닥: 석판 + 낡은 러너 카펫
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ map: stoneBlockTex }));
        floor.material.color.setHex(0xd8d2c6);
        floor.position.y = -0.125; floor.receiveShadow = true;
        tagDecoFloor(floor); roomGroup.add(floor);
        B(roomGroup, 1.2, 0.02, 3.4, 0x5a3c34, -1.2, 0.012, 0);
        B(roomGroup, 1.0, 0.022, 3.1, 0x6e4a3e, -1.2, 0.013, 0);
        // 벽: 석재 블록 — 앞벽(-z) 다리 조망 대창 2, -x 벽 소창
        const wallMat = wallPhong({ map: stoneBlockTex });
        wallMat.userData.shared = true;
        const mk = (len, opts) => stdWall(len, h, wallMat, opts);
        makeWalls([
          { group: mk(w, { window: { winW: 2.0, winH: 1.1, winY: 1.35, winX: -1.3 }, frameColor: 0x4a443c, skyColor: 0x2a2438 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
          { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
          { group: mk(d, { window: { winW: 1.0, winH: 0.8, winY: 1.4, winX: 0.5 }, frameColor: 0x4a443c, skyColor: 0x2a2438 }), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
          { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
        ]);
        // 관리 콘솔 (+x 벽): 레버 3 + 계기판 + 케이블 트렁크
        const conX = w / 2 - 0.5;
        B(roomGroup, 0.8, 1.0, 2.6, 0x4a4a50, conX, 0.5, -0.6);
        B(roomGroup, 0.86, 0.06, 2.7, 0x5a5a60, conX, 1.03, -0.6);
        for (let i = 0; i < 3; i++) {
          B(roomGroup, 0.06, 0.34, 0.06, 0x8a2a24, conX - 0.1, 1.24, -1.4 + i * 0.8);
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), lamb(0xb8362e)); knob.position.set(conX - 0.1, 1.44, -1.4 + i * 0.8); roomGroup.add(knob);
        }
        B(roomGroup, 0.05, 0.5, 1.2, 0x1e2226, conX + 0.28, 1.5, -0.6);         // 계기판 패널
        for (let i = 0; i < 4; i++) B(roomGroup, 0.02, 0.09, 0.09, [0x6a8a4c, 0x8a6a2c, 0x6a8a4c, 0x8a3a30][i], conX + 0.26, 1.56, -1.0 + i * 0.28);
        B(roomGroup, 0.5, 0.3, 0.5, 0x3a3630, conX - 0.05, 0.15, 1.5);          // 케이블 트렁크
        // 도면 테이블 (-x 벽): 설계도 + 말린 도면 통
        B(roomGroup, 0.7, 0.08, 2.0, 0x6a5238, -w / 2 + 0.62, 0.9, -0.9);
        for (const lx of [-w / 2 + 0.34, -w / 2 + 0.9]) for (const lz of [-1.75, -0.05]) B(roomGroup, 0.08, 0.9, 0.08, 0x55432e, lx, 0.45, lz);
        B(roomGroup, 0.55, 0.012, 0.8, 0xd8cfb8, -w / 2 + 0.62, 0.95, -1.1);    // 펼쳐진 설계도
        B(roomGroup, 0.4, 0.012, 0.6, 0xcfc5aa, -w / 2 + 0.6, 0.955, -0.55);
        for (let i = 0; i < 3; i++) { const roll = Cyl(roomGroup, 0.05, 0.05, 0.7, 0xb8a888, -w / 2 + 0.5 + i * 0.12, 1.02, 0.05, 6); roll.rotation.x = Math.PI / 2; }
        // 공구 걸이 (+z 뒷벽 부착 — 컬링 동기화)
        const tools = [];
        tools.push(B(roomGroup, 1.6, 0.06, 0.04, 0x55432e, 1.2, 1.7, d / 2 + 0.1));
        for (let i = 0; i < 4; i++) tools.push(B(roomGroup, 0.07, 0.4 + (i % 2) * 0.14, 0.05, [0x6a625a, 0x4a4a50, 0x6a625a, 0x8a5238][i], 0.7 + i * 0.34, 1.44, d / 2 + 0.11));
        attachToWall(0, 0, 1, ...tools);
        // 케이블 드럼 스툴 + 실내 식생 소량
        const drum = Cyl(roomGroup, 0.4, 0.4, 0.35, 0x6e5a40, 1.8, 0.18, -1.3, 10);
        Cyl(roomGroup, 0.46, 0.46, 0.05, 0x5a4832, 1.8, 0.38, -1.3, 10);
        for (let i = 0; i < 4; i++) B(roomGroup, 0.28 + rand() * 0.16, 0.3 + rand() * 0.3, 0.28, rand() < 0.5 ? 0x2a3d24 : 0x35492a, -w / 2 + 0.4 + rand() * 0.5, 0.15, d / 2 - 0.5 - rand() * 0.4);
        setBlockers([]);
      },
      buildEnv() {
        const GY = -0.6;
        const rand = seededRand(2404);
        // 절벽 위 마당 (석판) + 협곡 아래 어두운 강
        const yard = B(envRoot, 26, 0.35, 20, 0x5c564e, 2, GY - 0.18, 3); yard.receiveShadow = true;
        B(envRoot, 300, 0.1, 200, 0x141020, 0, -7.5, -60);                        // 협곡 강면 (어두운 남보라)
        for (let i = 0; i < 12; i++) B(envRoot, 2.5 + rand() * 6, 0.04, 0.5, 0x241a34, -60 + rand() * 120, -7.42, -30 - rand() * 50); // 잔물결
        // 절벽 단면 (마당 남쪽 아래로)
        for (let i = 0; i < 7; i++) {
          const cw2 = 4 + rand() * 5, ch2 = 3 + rand() * 4;
          B(envRoot, cw2, ch2, 3.5, i % 2 ? 0x3a352e : 0x2e2a24, -10 + i * 4.4, GY - 1.6 - i * 0.9, -7.5 - rand() * 1.2, (rand() - 0.5) * 0.1);
        }
        // ── 무너진 현수교 (창밖 주역 — 노을 비네트 문법 이식, 협곡 가로지름) ──
        const bMat = lamb(0x241318), rust = lamb(0x5e2418);
        const BZ2 = -22, DECK = -1.0, TLX = -18, TRX = 14;
        const tower2 = (tx) => {
          for (const lx of [-1.2, 1.2]) B(envRoot, 1.1, 20, 1.1, 0x241318, tx + lx, DECK + 8.8, BZ2);
          for (const cy of [DECK + 3.5, DECK + 9, DECK + 14, DECK + 18]) B(envRoot, 3.8, 1.1, 1.1, 0x241318, tx, cy, BZ2);
          const bcn = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xff3020, emissive: 0xcc1a10, emissiveIntensity: 0.9 }));
          bcn.position.set(tx, DECK + 19.4, BZ2); envRoot.add(bcn);              // 항공등 (밤에 빨갛게)
        };
        tower2(TLX); tower2(TRX);
        B(envRoot, 34, 1.3, 2.4, 0x241318, TLX - 8, DECK, BZ2);                  // 좌측 상판 (화면 밖 ~ -3)
        B(envRoot, 28, 1.3, 2.4, 0x241318, TRX + 9, DECK, BZ2);                  // 우측 상판 (7 ~ 화면 밖)
        B(envRoot, 5, 1.2, 2.4, 0x241318, -5.2, DECK - 1.5, BZ2, 0).rotation.z = -0.5; // 꺾인 좌단
        B(envRoot, 4.4, 1.2, 2.4, 0x241318, 8.6, DECK - 1.2, BZ2, 0).rotation.z = 0.42; // 꺾인 우단
        B(envRoot, 6.5, 1.2, 2.2, 0x241318, 1.6, -6.4, BZ2 + 0.8, 0).rotation.z = 0.9;  // 강에 박힌 잔해
        const cab2 = (x0, x1, yT0, yLow, yT1) => {
          for (let i = 0; i <= 26; i++) {
            const s = i / 26, x = x0 + s * (x1 - x0);
            const y = (1 - s) * (1 - s) * yT0 + 2 * (1 - s) * s * yLow + s * s * yT1;
            B(envRoot, 1.3, 0.4, 0.4, 0x241318, x, y, BZ2);
            if (i % 3 === 1 && y > DECK + 1.2 && !(x > -4 && x < 8)) B(envRoot, 0.12, y - DECK - 0.6, 0.12, 0x241318, x, (y + DECK + 0.6) / 2, BZ2);
          }
        };
        cab2(TLX, TRX, DECK + 18.6, DECK + 1.4, DECK + 18.6);
        cab2(TLX - 26, TLX, DECK + 9, DECK + 13, DECK + 18.6); cab2(TRX, TRX + 24, DECK + 18.6, DECK + 13, DECK + 9);
        for (const [bx2, len] of [[-3.6, 4.5], [7.4, 3.6]]) { const c3 = B(envRoot, 0.14, len, 0.14, 0x5e2418, bx2, DECK - len / 2, BZ2 + 0.4); c3.rotation.z = 0.15; } // 끊긴 케이블
        // 상판 버려진 차 + 넝쿨 (TLOU)
        for (const [cx3, cw3] of [[-14, 2.6], [-9, 2.2], [12, 2.4], [19, 2.8]]) {
          B(envRoot, cw3, 0.85, 1.5, 0x181014, cx3, DECK + 1.1, BZ2 - 0.3);
          B(envRoot, cw3 * 0.55, 0.55, 1.4, 0x181014, cx3 - 0.2, DECK + 1.75, BZ2 - 0.3);
        }
        for (let i = 0; i < 12; i++) { const gx = TLX - 12 + rand() * 50; if (gx > -4 && gx < 8) continue;
          B(envRoot, 0.4 + rand() * 0.7, 0.4 + rand() * 0.5, 0.7, rand() < 0.5 ? 0x1c2a18 : 0x24361e, gx, DECK + 0.9, BZ2 + 0.9); }
        for (const vx of [TLX, TRX]) for (let i = 0; i < 5; i++)
          B(envRoot, 0.6 - i * 0.08, 0.5, 0.6 - i * 0.08, i % 2 ? 0x1c2a18 : 0x24361e, vx + (rand() - 0.5) * 1.6, DECK + 2 + i * 1.4, BZ2 + 0.6);
        // 진입로 + 가드레일 + 원경 도심
        B(envRoot, 3.4, 0.24, 16, 0x4a453e, -6.5, GY - 0.1, 4);
        for (let i = 0; i < 6; i++) { B(envRoot, 0.1, 0.5, 0.1, 0x55524c, -8.3, GY + 0.25, -2 + i * 2.6); B(envRoot, 0.1, 0.5, 0.1, 0x55524c, -4.7, GY + 0.25, -2 + i * 2.6); }
        B(envRoot, 0.06, 0.1, 15, 0x66625a, -8.3, GY + 0.5, 4); B(envRoot, 0.06, 0.1, 15, 0x66625a, -4.7, GY + 0.5, 4);
        for (let i = 0; i < 6; i++) {
          const bw = 3.5 + rand() * 4, bh2 = 6 + rand() * 10;
          B(envRoot, bw, bh2, 3.5, i % 2 ? 0x241a26 : 0x1c141e, -34 + i * 12 + rand() * 3, GY + bh2 / 2 - 1, -70 - rand() * 8);
        }
        ogGround((x, z) => GY, 12, 22, 5, (x, z) => z > -6);                     // 마당 3년차 수풀 (절벽 밖 제외)
      },
    },

    /* ── 2.0 동부 「대도시」 셸터 3: 역 대합실 (GD-2.0 §6.0.5 기초 모델링 — Fable) ──
       펜 역 레퍼런스: 석재 홀 + 필라스터 + 부채창 장식 + 매표 부스 + 무너진 천장 신광 + 빛 웅덩이의 나무(TLOU).
       terminalPatch 개조 시 천장 틈이 판자로 덮이고 신광이 꺼진다(comfort.js 상쇄와 세트). 나무는 남는다. */
    terminal: {
      buildRoom() {
        const { w, d, h } = getROOM();
        const rand = seededRand(2405);
        const patched = (state.mods?.terminal || []).includes('terminalPatch');
        // 바닥: 석판 + 중앙 대리석 띠
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ map: stoneBlockTex }));
        floor.material.color.setHex(0xd2cabc);
        floor.position.y = -0.125; floor.receiveShadow = true;
        tagDecoFloor(floor); roomGroup.add(floor);
        B(roomGroup, w * 0.7, 0.012, 1.4, 0xc2b8a4, 0, 0.006, 0);
        B(roomGroup, w * 0.7, 0.014, 0.08, 0x9a8f7c, 0, 0.007, -0.7); B(roomGroup, w * 0.7, 0.014, 0.08, 0x9a8f7c, 0, 0.007, 0.7);
        // 벽: 석재 — 앞벽 홀 조망 창
        const wallMat = wallPhong({ map: stoneBlockTex });
        wallMat.userData.shared = true;
        const mk = (len, opts) => stdWall(len, h, wallMat, opts);
        makeWalls([
          { group: mk(w, { window: { winW: 1.8, winH: 1.0, winY: 1.5, winX: 2.6 }, frameColor: 0x4a443c, skyColor: 0x2a2014 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
          { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
          { group: mk(d), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
          { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
        ]);
        // 부채창 장식 (+z 뒷벽 상부 — 반원 판 + 방사 살, 컬링 동기화)
        const fan = [];
        const fanC = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24, 0, Math.PI), lamb(0x2a2014));
        fanC.position.set(-2.2, h - 1.35, d / 2 + 0.1); fan.push(fanC); roomGroup.add(fanC);
        for (let k = 0; k <= 4; k++) { const rib2 = B(roomGroup, 0.08, 1.28, 0.05, 0x4a443c, -2.2, h - 1.35, d / 2 + 0.12); rib2.rotation.z = Math.PI * (k / 4) - Math.PI / 2; fan.push(rib2); }
        fan.push(B(roomGroup, 2.7, 0.1, 0.06, 0x4a443c, -2.2, h - 1.35, d / 2 + 0.12));
        attachToWall(0, 0, 1, ...fan);
        // 필라스터 (좌우 벽 반기둥 2쌍 + 주두 — 벽 컬링 동기화)
        for (const [px2, nx2] of [[-w / 2 + 0.18, -1], [w / 2 - 0.18, 1]]) {
          const side = [];
          for (const pz2 of [-1.8, 1.8]) {
            side.push(B(roomGroup, 0.36, h - 0.4, 0.5, 0x9a9184, px2, (h - 0.4) / 2, pz2));
            side.push(B(roomGroup, 0.5, 0.22, 0.64, 0xaaa294, px2, h - 0.4, pz2));
          }
          attachToWall(nx2, 0, 0, ...side);
        }
        // 매표 부스 (+x 벽): 목재 카운터 + 창살 2칸 + 안내 색판
        const bX = w / 2 - 0.62;
        B(roomGroup, 1.0, 1.05, 3.2, 0x55432e, bX, 0.53, -0.4);
        B(roomGroup, 1.1, 0.07, 3.35, 0x6a5238, bX, 1.1, -0.4);
        for (let i = 0; i < 2; i++) {
          const pz2 = -1.3 + i * 1.8;
          B(roomGroup, 0.07, 1.1, 0.09, 0x55432e, bX, 1.7, pz2 - 0.7); B(roomGroup, 0.07, 1.1, 0.09, 0x55432e, bX, 1.7, pz2 + 0.7);
          B(roomGroup, 0.06, 0.08, 1.45, 0x55432e, bX, 2.26, pz2);
          for (let k2 = 0; k2 < 5; k2++) B(roomGroup, 0.035, 1.05, 0.035, 0x3a3026, bX, 1.68, pz2 - 0.52 + k2 * 0.26);
        }
        B(roomGroup, 0.06, 0.34, 1.0, 0x2e4a6a, bX + 0.42, 2.55, -0.4);
        // 벤치 2 (하나 전복) + 여행가방
        B(roomGroup, 2.2, 0.12, 0.5, 0x55432e, -2.6, 0.5, -1.6); B(roomGroup, 2.2, 0.5, 0.12, 0x55432e, -2.6, 0.8, -1.86);
        for (const lx of [-3.5, -1.7]) B(roomGroup, 0.14, 0.5, 0.4, 0x3a3026, lx, 0.25, -1.6);
        const tip = B(roomGroup, 2.0, 0.12, 0.5, 0x4a3a28, 0.6, 0.3, -2.2); tip.rotation.z = 1.25;
        B(roomGroup, 0.7, 0.45, 0.35, 0x6a4436, -4.2, 0.23, 0.8); B(roomGroup, 0.55, 0.38, 0.3, 0x2e4456, -3.9, 0.19, 1.5);
        // 행선판 — 한쪽 체인 끊겨 기울어짐 (뒷벽 상부)
        const brd = [];
        brd.push(B(roomGroup, 0.05, 0.9, 0.05, 0x3a3630, 2.0, h - 0.5, d / 2 + 0.08));
        const panel = B(roomGroup, 2.6, 0.9, 0.1, 0x11150f, 2.7, h - 1.25, d / 2 + 0.09); panel.rotation.z = -0.14; brd.push(panel);
        for (let i = 0; i < 6; i++) { const row = B(roomGroup, 0.7, 0.09, 0.04, 0x6a7a4c, 1.9 + (i % 3) * 0.85, h - 1.05 - Math.floor(i / 3) * 0.3, d / 2 + 0.15); row.rotation.z = -0.14; brd.push(row); }
        attachToWall(0, 0, 1, ...brd);
        // 무너진 천장: 슬래브 2장 + 구멍(중앙 우측) — patched면 판자 덮개
        {
          const roofG = new THREE.Group();
          const slab = (sw, sx) => { const s2 = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.22, d + 0.4), wallPhong({ map: concreteTex })); s2.material.color.setHex(0x8a8478); s2.position.set(sx, h + 0.1, 0); roofG.add(s2); };
          slab(w * 0.52, -w * 0.24); slab(w * 0.2, w * 0.4);
          for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.5 + rand() * 0.7, 0.2, 0.6 + rand() * 0.8), lamb(0x77706a)); j.position.set(w * 0.08 + rand() * 1.6, h + 0.08, -d / 2 + 0.6 + rand() * (d - 1.2)); j.rotation.y = rand(); roofG.add(j); }
          if (patched) {
            const cover = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, 0.1, d + 0.2), lamb(0x6a5238)); cover.position.set(w * 0.14, h + 0.06, 0); roofG.add(cover);
            for (let i = 0; i < 4; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.23, 0.04, 0.5), lamb(0x5a4530)); pl.position.set(w * 0.14, h + 0.13, -d / 2 + 0.8 + i * 1.6); roofG.add(pl); }
          }
          tagCeiling(roofG, h + 0.02); roomGroup.add(roofG);
        }
        // 신광 + 빛 웅덩이 + 나무 (patched면 신광·웅덩이 꺼짐 — 나무는 이미 자란 생명이라 남는다)
        const TX = 2.6, TZ = 1.2;
        if (!patched) {
          for (const [sx2, sw2, lean] of [[TX - 0.4, 1.6, -0.16], [TX + 0.6, 0.9, -0.22]]) {
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(sw2, h + 0.6, 2.6), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false }));
            shaft.position.set(sx2, h / 2, TZ - 0.3); shaft.rotation.z = lean; roomGroup.add(shaft);
          }
          for (let i = 0; i < 3; i++) {
            const pool = new THREE.Mesh(new THREE.BoxGeometry(2.4 - i * 0.7, 0.012, 1.8 - i * 0.5), new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.1 + i * 0.05, blending: THREE.AdditiveBlending }));
            pool.position.set(TX + 0.2 - i * 0.2, 0.02 + i * 0.008, TZ); roomGroup.add(pool);
          }
        }
        Cyl(roomGroup, 0.14, 0.18, 1.6, 0x2a1c10, TX, 0.8, TZ, 7);
        const br2 = B(roomGroup, 0.09, 0.9, 0.09, 0x2a1c10, TX + 0.35, 1.75, TZ + 0.1); br2.rotation.z = 0.5;
        for (let i = 0; i < 8; i++) {
          const ly = 1.7 + rand() * 1.2;
          B(roomGroup, 0.5 + rand() * 0.6, 0.32 + rand() * 0.3, 0.5 + rand() * 0.5, ly > 2.4 && !patched ? 0x6a8a3c : (rand() < 0.5 ? 0x2e4420 : 0x3c5626), TX + (rand() - 0.5) * 1.6, ly, TZ + (rand() - 0.5) * 1.2);
        }
        for (let i = 0; i < 6; i++) B(roomGroup, 0.22 + rand() * 0.2, 0.18 + rand() * 0.2, 0.22, rand() < 0.4 ? 0x6a8a3c : 0x35492a, TX + (rand() - 0.5) * 2.4, 0.1, TZ + (rand() - 0.5) * 2.0);
        for (let i = 0; i < 5; i++) { const j2 = B(roomGroup, 0.5 + rand() * 0.7, 0.25 + rand() * 0.35, 0.5 + rand() * 0.6, rand() < 0.5 ? 0x8a8478 : 0x6e6a60, TX + 0.6 + (rand() - 0.5) * 1.8, 0.15 + rand() * 0.25, TZ - 0.8 + (rand() - 0.5) * 1.2); j2.rotation.y = rand(); }
        setBlockers([]);
      },
      buildEnv() {
        const GY = -0.5;
        const rand = seededRand(2406);
        // 역전 광장 (석판) + 균열
        const plaza = B(envRoot, 50, 0.3, 36, 0x59544c, 0, GY - 0.15, 2); plaza.receiveShadow = true;
        for (let i = 0; i < 8; i++) { const cr2 = B(envRoot, 0.8 + rand() * 2.2, 0.014, 0.14, 0x3a3630, -18 + rand() * 36, GY + 0.008, -10 + rand() * 24); cr2.rotation.y = rand() * 3; }
        // 무너진 파사드 아치 잔해 2 (역사의 껍데기)
        for (const [ax, az, aw2] of [[-12, -10, 7], [11, -11, 5.5]]) {
          for (const lx of [-aw2 / 2, aw2 / 2]) B(envRoot, 1.4, 7 + rand() * 2, 1.4, 0x77706a, ax + lx, GY + 3.6, az);
          for (let k = 0; k <= 6; k++) { const seg2 = B(envRoot, 1.2, 0.9, 1.1, 0x8a8478, ax + Math.cos(Math.PI * (k / 6)) * aw2 / 2, GY + 7 + Math.sin(Math.PI * (k / 6)) * 2.2, az); seg2.rotation.z = Math.PI * (k / 6) - Math.PI / 2; }
        }
        // 가로등 3 (하나 꺾임) + 짐수레
        for (const [gx2, bent] of [[-7, 0], [4, 0], [9, 0.9]]) {
          const pole2 = Cyl(envRoot, 0.09, 0.11, 4.2, 0x3a3630, gx2, GY + 2.1, 8, 7); if (bent) { pole2.rotation.z = bent; pole2.position.y = GY + 1.5; }
          B(envRoot, 0.5, 0.3, 0.3, 0x2a2622, gx2 + (bent ? 1.8 : 0), GY + (bent ? 2.6 : 4.3), 8);
        }
        B(envRoot, 1.6, 0.5, 0.9, 0x55432e, -3, GY + 0.55, 6.5);
        for (const wx2 of [-3.6, -2.4]) { const wl = Cyl(envRoot, 0.3, 0.3, 0.16, 0x2a2622, wx2, GY + 0.3, 7.0, 8); wl.rotation.x = Math.PI / 2; }
        // 선로 3가닥 + 멈춘 열차 실루엣 (대승강장 예고)
        for (let tr = 0; tr < 3; tr++) {
          const tz2 = -16 - tr * 3;
          B(envRoot, 44, 0.12, 0.16, 0x4a453e, 0, GY + 0.06, tz2 - 0.5); B(envRoot, 44, 0.12, 0.16, 0x4a453e, 0, GY + 0.06, tz2 + 0.5);
          for (let s3 = 0; s3 < 14; s3++) B(envRoot, 0.9, 0.06, 2.2, 0x3a3026, -21 + s3 * 3.2, GY + 0.02, tz2);
        }
        { const train = new THREE.Group();
          for (let c4 = 0; c4 < 3; c4++) {
            const car = new THREE.Mesh(new THREE.BoxGeometry(8, 2.6, 2.4), lamb(c4 ? 0x2c2430 : 0x342a36)); car.position.set(-6 + c4 * 8.6, 1.5, 0); car.castShadow = true; train.add(car);
            for (let wi = 0; wi < 4; wi++) { const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.08), lamb(0x161018)); win2.position.set(-9 + c4 * 8.6 + wi * 1.8, 1.9, 1.22); train.add(win2); }
          }
          train.position.set(2, GY, -22); envRoot.add(train);
          for (let i = 0; i < 6; i++) B(envRoot, 0.5 + rand() * 0.7, 0.4 + rand() * 0.4, 0.6, rand() < 0.5 ? 0x1c2a18 : 0x24361e, -4 + rand() * 18, GY + 0.25, -21 + rand() * 2); }
        // 원경 도심 + 3년차 수풀
        for (let i = 0; i < 7; i++) {
          const bw2 = 4 + rand() * 5, bh3 = 7 + rand() * 12;
          B(envRoot, bw2, bh3, 4, i % 2 ? 0x2a2026 : 0x221a20, -28 + i * 10 + rand() * 3, GY + bh3 / 2, -38 - rand() * 6);
        }
        ogGround((x, z) => GY, 16, 26, 6, (x, z) => z > -14);
      },
    },

    /* ── 2.0 동부 「대도시」 셸터 4: 펜트하우스 (GD-2.0 §6.0.5 기초 모델링 — Fable) ──
       심부 진행 종점. 조망이 정체성 — env의 마천루들이 첨탑처럼 위로 솟고, 발밑은 안개에 잠긴 도시.
       실내는 럭셔리의 잔해(그랜드 피아노·홈바·떨어진 샹들리에) + 3년 덩굴. */
    penthouse: {
      buildRoom() {
        // 콘페키 리워크 (디렉터 2026-07-09: "요리노부의 펜트하우스 느낌" — 크롤링 확인: 금장 오크+대리석,
        //   일본식 미니멀×아메리칸 럭셔리, 멀티레벨, 이구아나 테라리엄, 중앙 병풍, 침대 뒤 금고 기둥, 창가 수반).
        const { w, d, h } = getROOM();
        const rand = seededRand(2407);
        // 바닥: 어두운 대리석 + 금장 줄눈 띠 — 조망 창 쪽으로 얕은 수반(워터 피처)
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5), wallPhong({ map: stoneBlockTex }));
        floor.material.color.setHex(0x57504a);
        floor.position.y = -0.125; floor.receiveShadow = true;
        tagDecoFloor(floor); roomGroup.add(floor);
        for (const gz of [-1.1, 1.1]) B(roomGroup, w * 0.8, 0.012, 0.05, 0xb08a3a, -0.4, 0.006, gz); // 금장 인레이
        // 수반: 창가 폭 전체 얕은 검은 트레이 + 수면 + 연잎·이끼 (3년의 물)
        B(roomGroup, w - 2.4, 0.16, 0.9, 0x16141a, -0.6, 0.08, -d / 2 + 0.62);
        const water = new THREE.Mesh(new THREE.BoxGeometry(w - 2.6, 0.03, 0.74), new THREE.MeshLambertMaterial({ color: 0x2a4a4e, transparent: true, opacity: 0.85 }));
        water.position.set(-0.6, 0.16, -d / 2 + 0.62); roomGroup.add(water);
        for (let i = 0; i < 6; i++) { const lily = Cyl(roomGroup, 0.09 + rand() * 0.07, 0.09 + rand() * 0.07, 0.02, 0x3c5626, -3.4 + rand() * 6, 0.185, -d / 2 + 0.5 + rand() * 0.3, 7); }
        // 벽: 다크 오크 슬랫 톤 + 금장 몰딩 띠. -z 파노라마 통창(도시 조망)
        const wallMat = wallPhong({ map: wallWoodTex });
        wallMat.userData.shared = true;
        const mk = (len, opts) => stdWall(len, h, wallMat, opts);
        makeWalls([
          { group: mk(w, { window: { winW: 3.4, winH: 1.6, winY: 1.35, winX: -1.6 }, frameColor: 0x2a241e, skyColor: 0x1c1830 }), pos: [0, 0, -d / 2 - 0.11], rotY: 0, normal: new THREE.Vector3(0, 0, -1) },
          { group: mk(w), pos: [0, 0, d / 2 + 0.11], rotY: Math.PI, normal: new THREE.Vector3(0, 0, 1) },
          { group: mk(d, { window: { winW: 1.8, winH: 1.4, winY: 1.4, winX: -0.6 }, frameColor: 0x2a241e, skyColor: 0x1c1830 }), pos: [-w / 2 - 0.11, 0, 0], rotY: Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0) },
          { group: mk(d), pos: [w / 2 + 0.11, 0, 0], rotY: -Math.PI / 2, normal: new THREE.Vector3(1, 0, 0) },
        ]);
        // 금장 몰딩(허리 띠) — 뒷벽 부착(컬링 동기화)
        const gild = [];
        gild.push(B(roomGroup, w - 0.4, 0.07, 0.03, 0xb08a3a, 0, 1.05, d / 2 + 0.1));
        attachToWall(0, 0, 1, ...gild);
        // 천장: 다크 슬랫 리브 + 금장 테 (컬링 그룹)
        {
          const roofG = new THREE.Group();
          for (let i = 0; i < 7; i++) { const rib3 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, d - 0.6), lamb(0x2e2620)); rib3.position.set(-w / 2 + 1 + i * (w - 2) / 6, h - 0.06, 0); roofG.add(rib3); }
          for (const mz3 of [-d / 2 + 0.2, d / 2 - 0.2]) { const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.16), lamb(0xb08a3a)); trim.position.set(0, h - 0.05, mz3); roofG.add(trim); }
          tagCeiling(roofG, h - 0.05); roomGroup.add(roofG);
        }
        // 멀티레벨: 오크 플랫폼 단(+x 침실 존, 0.14 높이) + 좌측 짧은 계단 4단(AV패드 방향 장식)
        B(roomGroup, 3.6, 0.14, d - 1.6, 0x4a3826, w / 2 - 1.9, 0.07, 0.3);
        B(roomGroup, 3.6, 0.03, 0.06, 0xb08a3a, w / 2 - 1.9, 0.155, 0.3 - (d - 1.6) / 2 + 0.03); // 단 코 금장
        for (let s4 = 0; s4 < 4; s4++) B(roomGroup, 1.1, 0.12 + s4 * 0.12, 0.34, 0x3a2c20, -w / 2 + 0.66, (0.12 + s4 * 0.12) / 2, d / 2 - 0.5 - s4 * 0.36);
        B(roomGroup, 1.3, 0.06, 0.06, 0x8a8578, -w / 2 + 0.66, 1.0, d / 2 - 1.9); // 상부 유리문 프레임 암시
        // 낮은 플랫폼 침대 (단 위) + 나이트스탠드 2 — 금고 스위치의 그 침대
        B(roomGroup, 2.2, 0.24, 1.7, 0x2e2620, w / 2 - 1.9, 0.26, 0.9);
        B(roomGroup, 2.0, 0.16, 1.5, 0xd8d2c6, w / 2 - 1.9, 0.44, 0.9);
        B(roomGroup, 0.9, 0.1, 0.5, 0xe6e0d4, w / 2 - 1.9, 0.53, 0.35);
        for (const nz of [0.0, 1.8]) B(roomGroup, 0.45, 0.4, 0.45, 0x3a2c20, w / 2 - 0.55, 0.34, nz);
        // 금고 기둥 (+x 벽, 침대 뒤): 다크 우드 기둥 + 반쯤 열린 금장 패널 + 빈 금고(이미 털린 지 3년)
        const vault = [];
        vault.push(B(roomGroup, 0.5, h - 0.2, 0.9, 0x241c16, w / 2 - 0.14, (h - 0.2) / 2, 0.9));
        vault.push(B(roomGroup, 0.1, 0.7, 0.55, 0x16141a, w / 2 - 0.42, 1.35, 0.9));                 // 열린 공동(빈 금고)
        const door2 = B(roomGroup, 0.06, 0.74, 0.5, 0xb08a3a, w / 2 - 0.52, 1.35, 1.32); door2.rotation.y = 0.9; vault.push(door2); // 반쯤 열린 금장 도어
        attachToWall(1, 0, 0, ...vault);
        // 이구아나 테라리엄 (뒷벽 좌측 — 유리 상자 + 살아남은 초록 이구아나 + 히트램프 잔해)
        B(roomGroup, 1.3, 0.5, 0.7, 0x2e2620, -2.9, 0.25, d / 2 - 0.55);
        const terra = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.62), new THREE.MeshLambertMaterial({ color: 0xaebfc2, transparent: true, opacity: 0.22 }));
        terra.position.set(-2.9, 0.85, d / 2 - 0.55); roomGroup.add(terra);
        B(roomGroup, 0.5, 0.14, 0.16, 0x4a7a3c, -3.0, 0.6, d / 2 - 0.55);                             // 이구아나 몸통
        B(roomGroup, 0.3, 0.08, 0.08, 0x4a7a3c, -2.65, 0.58, d / 2 - 0.5, 0.3);                       // 꼬리
        B(roomGroup, 0.12, 0.1, 0.12, 0x5a8a48, -3.28, 0.64, d / 2 - 0.55);                           // 머리
        for (let i = 0; i < 3; i++) B(roomGroup, 0.2 + rand() * 0.2, 0.2 + rand() * 0.2, 0.2, 0x3c5626, -2.9 + (rand() - 0.5) * 0.8, 0.6, d / 2 - 0.55); // 테라리엄 안 수풀(3년)
        // 중앙 대형 병풍 (3첩 — 숨던 그 스크린)
        for (let p4 = 0; p4 < 3; p4++) {
          const sx4 = -0.9 + p4 * 0.85, ry = (p4 - 1) * 0.35;
          const fr = B(roomGroup, 0.85, 1.8, 0.06, 0x2e2620, sx4, 0.95, 0.5); fr.rotation.y = ry;
          const pane2 = B(roomGroup, 0.7, 1.6, 0.03, 0xd8cfb8, sx4, 0.95, 0.52); pane2.rotation.y = ry;
        }
        // 바 (좌벽): 검은 대리석 상판 + 금장 다리 + 병·잔 (더 하이스트의 잔 2개는 티테이블에)
        B(roomGroup, 0.7, 0.95, 2.2, 0x1c1a20, -w / 2 + 0.58, 0.48, -1.5);
        B(roomGroup, 0.8, 0.06, 2.35, 0x0e0c12, -w / 2 + 0.58, 1.0, -1.5);
        for (const bz4 of [-2.4, -0.6]) B(roomGroup, 0.06, 0.9, 0.06, 0xb08a3a, -w / 2 + 0.85, 0.45, bz4);
        for (let i = 0; i < 5; i++) { const bt2 = B(roomGroup, 0.08, 0.24 + rand() * 0.1, 0.08, [0x3a5a3c, 0x2c3a5a, 0x5a3a2c][i % 3], -w / 2 + 0.5, 1.15, -2.3 + i * 0.4); if (rand() < 0.3) bt2.rotation.z = 1.5; }
        // 선큰 라운지 느낌: 낮은 ㄱ자 소파 + 낮은 티테이블 + 잔 2 (조용한 오마주)
        B(roomGroup, 2.4, 0.42, 0.8, 0x3a3440, -1.6, 0.29, -1.7);
        B(roomGroup, 0.8, 0.42, 1.6, 0x3a3440, -2.9, 0.29, -0.9);
        B(roomGroup, 1.2, 0.3, 0.7, 0x241c16, -1.2, 0.23, -0.7);
        B(roomGroup, 1.3, 0.04, 0.8, 0x0e0c12, -1.2, 0.4, -0.7);
        for (const gx4 of [-1.45, -0.95]) Cyl(roomGroup, 0.05, 0.04, 0.12, 0xcfd8dc, gx4, 0.48, -0.7, 6);
        // 기울어진 대형 아트 캔버스 + 유리 파편 소량 + 3년 덩굴(수반 곁)
        const art = B(roomGroup, 1.8, 1.2, 0.06, 0x6e2436, 2.2, 0.75, d / 2 - 0.2); art.rotation.z = -0.1;
        B(roomGroup, 1.2, 0.5, 0.03, 0xb08a3a, 2.2, 0.8, d / 2 - 0.16, -0.1);
        for (let i = 0; i < 4; i++) { const sh4 = B(roomGroup, 0.14 + rand() * 0.12, 0.02, 0.1 + rand() * 0.1, 0xaebfc2, -0.5 + rand() * 2, 0.015, -1.9 + rand() * 0.6); sh4.rotation.y = rand() * 3; }
        for (let i = 0; i < 4; i++) B(roomGroup, 0.26 + rand() * 0.24, 0.25 + rand() * 0.3, 0.26, rand() < 0.5 ? 0x2e4420 : 0x3c5626, -3.6 + rand() * 1.2, 0.24 + (i % 2) * 0.3, -d / 2 + 0.5 + rand() * 0.4);
        setBlockers([]);
      },
      buildEnv() {
        // 리워크 (디렉터 2026-07-09): 헬리패드·급수탑 테라스 철거 — 야외는 조망면(-z) 발코니만.
        //   발코니 = META.balcony 배치 칸(방석·촛대류)의 실체. 유리 난간 + 금장 핸드레일(콘페키).
        const GY = -0.3;
        const rand = seededRand(2408);
        // 빌딩 몸체: 방 발밑 매스가 도시 협곡으로 내려간다 (우리 타워)
        const core = B(envRoot, 12.4, 52, 9.2, 0x2a2632, 0, -26.3, 0.4); core.castShadow = true;
        // 발코니 데크 (조망면 -z): 오크 플랭크 + 유리 난간(2장 결손) + 금장 핸드레일
        B(envRoot, 8.4, 0.16, 2.1, 0x3a2c20, 0, -0.08, -4.95);
        for (let i = 0; i < 11; i++) B(envRoot, 0.68, 0.022, 1.9, i % 2 ? 0x55432e : 0x4a3826, -3.7 + i * 0.74, 0.012, -4.95);
        for (let i = 0; i < 8; i++) {                                              // 외곽 난간 (x 방향)
          const gx3 = -3.85 + i * 1.1;
          B(envRoot, 0.09, 1.05, 0.09, 0x3a3630, gx3, 0.52, -5.92);
          if (i !== 2 && i !== 5 && i < 7) { const gl = B(envRoot, 1.0, 0.8, 0.04, 0x3a4450, gx3 + 0.55, 0.55, -5.94); gl.material.transparent = true; gl.material.opacity = 0.5; }
        }
        B(envRoot, 8.0, 0.07, 0.09, 0xb08a3a, 0, 1.06, -5.92);                     // 금장 핸드레일
        for (const sx5 of [-4.12, 4.12]) {                                          // 양측 난간
          B(envRoot, 0.09, 1.05, 0.09, 0x3a3630, sx5, 0.52, -4.2); B(envRoot, 0.09, 1.05, 0.09, 0x3a3630, sx5, 0.52, -5.6);
          const gl2 = B(envRoot, 0.04, 0.8, 1.5, 0x3a4450, sx5, 0.55, -4.9); gl2.material.transparent = true; gl2.material.opacity = 0.5;
          B(envRoot, 0.09, 0.07, 1.8, 0xb08a3a, sx5, 1.06, -4.9);
        }
        // 발코니 코너 화분 2 (3년 수풀)
        for (const px5 of [-3.6, 3.6]) {
          Cyl(envRoot, 0.28, 0.22, 0.4, 0x2e2620, px5, 0.2, -5.4, 8);
          for (let i = 0; i < 3; i++) B(envRoot, 0.26 + rand() * 0.2, 0.24 + rand() * 0.25, 0.26, rand() < 0.5 ? 0x2e4420 : 0x3c5626, px5 + (rand() - 0.5) * 0.3, 0.5 + i * 0.16, -5.4 + (rand() - 0.5) * 0.3);
        }
        // ── 둘러싼 마천루 (첨탑 포위 — 위로 솟고 아래로 꺼진다) ──
        const towers = [
          [-26, -18, 9, 34], [-15, -30, 11, 46], [4, -34, 10, 40], [22, -26, 12, 52], [34, -10, 9, 30],
          [30, 12, 10, 38], [-28, 10, 10, 28], [-20, 26, 9, 24], [14, 30, 11, 34],
        ];
        for (let ti = 0; ti < towers.length; ti++) {
          const [tx3, tz3, tw3, th3] = towers[ti];
          const tower3 = new THREE.Group();
          const bodyH = th3 + 55; // 발밑 안개 속으로 55 내려간다 (도시 협곡)
          const bd3 = new THREE.Mesh(new THREE.BoxGeometry(tw3, bodyH, tw3), lamb(ti % 2 ? 0x2c2836 : 0x24202e));
          bd3.position.y = th3 - bodyH / 2; bd3.castShadow = true; tower3.add(bd3);
          // 창문 그리드 (불 꺼진 유리 — 몇 칸만 달빛 반사 톤)
          for (let fy = 2; fy < th3 - 2; fy += 3.2) for (let fx = -tw3 / 2 + 1.2; fx < tw3 / 2 - 0.9; fx += 2.2) {
            const lit = rand() < 0.04;
            const win3 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.1), lamb(lit ? 0x8a94b0 : 0x181622));
            win3.position.set(fx, fy - bodyH / 2 + bodyH - th3 + 0 * 1, tw3 / 2 + 0.06); win3.position.y = fy; tower3.add(win3);
          }
          // 옥상 실루엣: 급수탑 또는 안테나 (첨탑 감)
          if (ti % 3 === 0) { const sp2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4 + rand() * 3, 6), lamb(0x1c1824)); sp2.position.y = th3 + 2.4; tower3.add(sp2); }
          else { const an2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5 + rand() * 3, 0.18), lamb(0x1c1824)); an2.position.y = th3 + 2.6; tower3.add(an2); }
          // 3년 잠식: 상층 발코니 덩굴 몇 점
          for (let vv = 0; vv < 4; vv++) { const vg = new THREE.Mesh(new THREE.BoxGeometry(1 + rand() * 1.4, 0.5 + rand() * 0.4, 0.5), lamb(rand() < 0.5 ? 0x1c2a18 : 0x24361e)); vg.position.set((rand() - 0.5) * tw3 * 0.8, th3 - 2 - rand() * 8, tw3 / 2 + 0.3); tower3.add(vg); }
          tower3.position.set(tx3, GY, tz3); envRoot.add(tower3);
        }
        // 발밑 안개 띠 (도시 협곡 — 깊이감) + 낮게 지나는 구름 2
        for (const [fy2, op2] of [[-14, 0.22], [-22, 0.3], [-32, 0.36]])
          B(envRoot, 160, 6, 160, 0x2a2432, 0, fy2, 0, 0).material = new THREE.MeshBasicMaterial({ color: 0x2a2432, transparent: true, opacity: op2, depthWrite: false });
        for (const [cx4, cy4, cw4] of [[-18, 6, 22], [24, 9, 18]]) {
          const cl = new THREE.Mesh(new THREE.BoxGeometry(cw4, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0x9a92a8, transparent: true, opacity: 0.16, depthWrite: false }));
          cl.position.set(cx4, cy4, -6); envRoot.add(cl);
        }
        // 새 떼 (첨탑 사이)
        for (let i = 0; i < 4; i++) {
          const bx3 = -10 + rand() * 24, by3 = 10 + rand() * 8, bz3 = -14 - rand() * 8;
          B(envRoot, 0.7, 0.1, 0.2, 0x0e0c12, bx3 - 0.3, by3, bz3, 0.35); B(envRoot, 0.7, 0.1, 0.2, 0x0e0c12, bx3 + 0.3, by3, bz3, -0.35);
        }
      },
    },
  };
}
