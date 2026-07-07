// render/shelters.js — Tier4 렌더 추출 Phase1-①: 셸터 build 함수(buildRoom/buildEnv).
//   설계: primitive(THREE·mergeGeometries·B/Cyl/lamb/seededRand/paintGeo/vcLambert·텍스처)는
//   이미 모듈이라 직접 import. game.js 클로저 헬퍼(wallPhong/stdWall/makeWalls/tag*/attach*/groundPlane/
//   wlBlock/ogGround/deadTreeGeo/buildCarWreck/buildPowerPole/buildRuinCity)와 가변 렌더 상태
//   (roomGroup/envRoot=안정 const 직접, ROOM=getROOM 게터, blockers/envDyn=setter)만 ctx 주입.
//   게이트: 이관 후 `npm run golden` diff 0 = 무손실. game.js가 SHELTERS에서 SHELTER_META와 병합.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lamb, B, Cyl, seededRand, paintGeo, vcLambert } from '../lib/helpers.js';
import { plywoodTex, metalTex } from './textures.js';

export function makeShelterBuilders(ctx) {
  const {
    roomGroup, envRoot, getROOM, setBlockers, setEnvDyn,
    wallPhong, stdWall, makeWalls, tagDecoFloor, tagCeiling, tagSway, attachToWall,
    groundPlane, wlBlock, ogGround, deadTreeGeo, buildCarWreck, buildPowerPole, buildRuinCity,
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
  };
}
