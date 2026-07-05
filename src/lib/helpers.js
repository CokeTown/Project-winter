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
// ① 컬링 페이드: 전역 계절/적설 틴트로 색이 매 프레임 갱신되는 공유 재질 — 그룹별 클론 금지.
//   (클론하면 페이드 그룹의 지붕 색이 계절 갱신에서 누락됨) → cullFadeSkip 으로 원본 유지.
vcLambert.userData.cullFadeSkip = true;

/* ── 한국어 조사(josa) 유틸 (오디트 A P2) ──
   word 마지막 글자의 받침 유무로 올바른 조사를 고른다. en 문안은 이 유틸을 쓰지 않으므로 무영향.
   지원: '으로/로' | '을/를' | '이/가' | '은/는'.
   규칙:
     - '으로/로' : 받침 없음 OR 받침이 ㄹ → '로', 그 외 → '으로'
     - 그 외      : 받침 있음 → 앞쪽('을/이/은'), 없음 → 뒤쪽('를/가/는')
   숫자 종결: 마지막 문자가 숫자면 그 숫자의 한국어 읽기 종성으로 판정
     (0영·1일·3삼·6육·7칠·8팔·10십 = 받침 있음 / 2이·4사·5오·9구 = 받침 없음).
     ※ '로' 판정에서 ㄹ 받침에 해당하는 숫자: 1(일)·7(칠)·8(팔)의 종성은 ㄹ이 아니므로
        숫자는 'ㄹ 받침' 예외 없음 — 받침 있으면 항상 '으로'. */
const _DIGIT_JONG = { // true = 받침 있음
  '0': true, '1': true, '2': false, '3': true, '4': false,
  '5': false, '6': true, '7': true, '8': true, '9': false,
};
function josa(word, pair) {
  const s = String(word ?? '');
  const ch = s.charCodeAt(s.length - 1);
  let hasBatchim, isRieul = false;
  const lastCharStr = s.charAt(s.length - 1);
  if (lastCharStr >= '0' && lastCharStr <= '9') {
    // 두 자리 이상은 마지막 자릿수 읽기로 판정하되, 10의 배수 끝('...0')은 '영'이 아니라 '십/백' 종성.
    // 단순화: 마지막 숫자 문자만으로 판정(게임 노출 값은 대개 1~2자리 소수 — 실용상 충분).
    hasBatchim = !!_DIGIT_JONG[lastCharStr];
  } else if (ch >= 0xac00 && ch <= 0xd7a3) {
    const jong = (ch - 0xac00) % 28; // 0=받침없음
    hasBatchim = jong !== 0;
    isRieul = jong === 8; // ㄹ
  } else {
    // 한글/숫자가 아닌 종결(영문·기호 등): 받침 없음으로 취급('로/를/가/는')
    hasBatchim = false;
  }
  if (pair === '으로/로') return (!hasBatchim || isRieul) ? '로' : '으로';
  const [withB, withoutB] =
    pair === '을/를' ? ['을', '를'] :
    pair === '이/가' ? ['이', '가'] :
    pair === '은/는' ? ['은', '는'] : ['', ''];
  return hasBatchim ? withB : withoutB;
}

export { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert, josa };
