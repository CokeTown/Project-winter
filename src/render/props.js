// render/props.js — Tier4 렌더 추출: 순수 지오메트리/프롭 빌더 (게임 상태 무참조).
//   THREE + lib/helpers primitive + core/projects의 projectSiteStage만 쓰는 순수 함수 → 팩토리 없이 직접 export.
//   game.js·render/shelters.js가 직접 import(주입 아님). 이관으로 셸터 ctx가 9심볼 슬림해짐.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B, Cyl, lamb, shade, paintGeo, seededRand, vcLambert } from '../lib/helpers.js';
import { projectSiteStage } from '../core/projects.js';

export function deadTreeGeo(rand, s, c = 0x3a332c) {
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

export function pineGeo(rand, s, dark) {
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

export function addRoofGrass(wallGroup, len, h, seed) {
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

export function groundPlane(colFn, hFn, size = 300, seg = 52) {
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

export function buildObservatorySite(parent, ox, oy, oz) {
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

export function buildCablecarSite(parent, ox, oy, oz) {
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

export function buildBreakwaterSite(parent, ox, oy, oz) {
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

// 바닥재 대상 메시 태깅 — 지오메트리가 휴리스틱(넓고 얇은 수평 박스)에 안 걸리는 좁은/특수 바닥용.
export function tagDecoFloor(mesh) {
  if (mesh) mesh.userData.isDecoFloor = true;
  return mesh;
}

// ── 꾸미기(#13) 명시 태깅 시스템 (B-①) ──
//   휴리스틱(넓고 얇은 박스=바닥, stdWall 재질=벽)만으로는 커스텀 지오메트리 셸터에서 벽지/바닥재가 조용히
//   안 먹는 먹튀 버그가 났다(버스/벙커/온실/여객선/등대/지하철). 각 셸터 buildRoom이 벽 재질·바닥 메시를
//   직접 태깅하고, applyDeco는 "명시 태그 우선, 없으면 기존 휴리스틱 폴백"으로 찾는다.
// 벽지 대상 재질 태깅 — stdWall 안/밖 어디서든 호출 가능. baseMap(원본 map) 1회 스냅.
export function tagDecoWall(mat) {
  if (mat && mat.userData) { mat.userData.isWallMat = true; if (!('baseMap' in mat.userData)) mat.userData.baseMap = mat.map || null; }
  return mat;
}
