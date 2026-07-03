// 공용 3D 빌더 유틸 — 가구/환경/도구 파이프라인에서 공유
import * as THREE from 'three';

function lamb(c, opts = {}) { return new THREE.MeshLambertMaterial({ color: c, ...opts }); }
function B(parent, w, h, d, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lamb(c));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function Cyl(parent, rT, rB, h, c, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), lamb(c));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function paintGeo(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
const vcLambert = new THREE.MeshLambertMaterial({ vertexColors: true });
vcLambert.userData.shared = true;

export { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert };
