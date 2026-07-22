// render/timelight.js — 시간대 대기 커브 SSOT (기술부채 D1 상환 · REFACTOR-GUIDE §1.5).
//
//   본편 커브(DAY_PHASES/DAY_KEYS)와 항공 디오라마 커브(AERIAL_KEYS)를 한 파일에 병치한다.
//   ★ 계약: 본편 무드를 튜닝하면 항공 커브도 함께 검토할 것 — 두 커브는 같은 하늘의 두 고도다.
//     (분리돼 있던 시절 "본편 튜닝 → 디오라마 조용히 어긋남"이 D1 부채였다. 병치+계약이 침묵을 죽인다.)
//   항공 커브를 본편에서 산술 파생하지 않는 이유: S1 캡처 매트릭스로 디렉터가 판정한 룩(밤=달 재해석·
//   잿빛 근사)이 손튜닝 값이라, 파생식 전환은 아트 재판정 사안이다. 전환 시 캡처 매트릭스 동반.
import * as THREE from 'three';

// ── 본편: 24h 하늘 팔레트 (디렉터 2026-07-19 「NUCLEAR WINTER 24-HOUR SKY」) ──
//   시간대별 하늘이 다채롭게 — 밤(어둠)→새벽 청색→해뜰녘 금빛→창백한 정오 크림→따뜻한 오후 베이지→
//   붉은 황혼→보랏빛 땅거미→밤. 핵겨울 채도라 은은하게(과포화 금지). skyZ(천정)는 대체로 차게 유지해
//   하늘 그라디언트 대비 확보. 밤은 셸터 고유 무드(currentMood — game.js phaseValues)가 대체한다.
export const DAY_PHASES = {
  // 새벽(청): 밤이 걷히기 직전 차가운 청회색 — 별이 아직 남았다(stars↑).
  predawn:   { fog: 0x39414f, skyH: 0x566274, skyZ: 0x2a3242, sunC: 0xaebccf, sunInt: 0.34, hemiC: 0x828d9d, hemiG: 0x3e434c, hemiInt: 0.62, stars: 0.45 },
  // 해뜰녘(금): 골든아워 온기 — 회색 fog·hemi를 앰버로, 지평선 채도↑, 태양광↑(실질 광원감).
  dawn:      { fog: 0x5e4836, skyH: 0xc06a40, skyZ: 0x2a3045, sunC: 0xffbe84, sunInt: 0.68, hemiC: 0xcaa87c, hemiG: 0x564539, hemiInt: 0.86, stars: 0.25 },
  // 정오(창백한 크림): 팔레트의 가장 밝은 대. 을씨년 회색을 살짝 덥혀 창백한 크림 톤(과거 냉회청 → 온회색).
  day:       { fog: 0x8f9088, skyH: 0xaeaaa0, skyZ: 0x74746c, sunC: 0xfff2d6, sunInt: 1.5, hemiC: 0xdadcd0, hemiG: 0x77706a, hemiInt: 1.28, stars: 0 },
  // 오후(따뜻한 베이지): 정오와 황혼 사이 — 마른 잎빛 베이지로 하루가 기울기 시작.
  afternoon: { fog: 0x8a8070, skyH: 0xb4a58c, skyZ: 0x807868, sunC: 0xffe8c6, sunInt: 1.12, hemiC: 0xccc0a8, hemiG: 0x786e5e, hemiInt: 1.06, stars: 0 },
  // 황혼(붉은 노을): sunset이 sunrise보다 더 붉게 — 붉은 노을 톤으로 덥힌다.
  dusk:      { fog: 0x6b4838, skyH: 0xcf5e2e, skyZ: 0x2f2c4c, sunC: 0xff9048, sunInt: 0.72, hemiC: 0xd0925e, hemiG: 0x564138, hemiInt: 0.86, stars: 0.2 },
  // 땅거미(보라): 노을이 식어 자줏빛 — 밤으로 넘어가는 마지막 색.
  twilight:  { fog: 0x3e3448, skyH: 0x6e4c6a, skyZ: 0x2c2740, sunC: 0xa87f9c, sunInt: 0.42, hemiC: 0x8a7a92, hemiG: 0x483e50, hemiInt: 0.68, stars: 0.35 },
};
// 6~7단 하루 리듬: 밤 → 새벽(청) → 해뜰녘(금) → 낮(크림) → 오후(베이지) → 황혼(붉음) → 땅거미(보라) → 밤.
export const DAY_KEYS = [[0, 'night'], [4, 'night'], [5.3, 'predawn'], [6.6, 'dawn'], [9, 'day'], [14.5, 'day'], [16, 'afternoon'], [18, 'dusk'], [19.8, 'twilight'], [21.3, 'night'], [24, 'night']];

// ── 항공 디오라마: 시간대 조명 키프레임 (겨울 잿빛 도시 — 본편 무드 근사, S1 캡처 판정 룩) ──
//   [hour, sky, fog, hemiSky, hemiGround, sunColor, sunInt, sunElev(deg), night(0~1)]
//   밤의 sun은 '달'로 재해석(int 0.28) — 완전 소등은 실루엣이 죽는다(S1 1차 캡처 검거: 밤 과암전).
const AERIAL_KEYS = [
  [0,  0x0d1220, 0x0d1220, 0x3e4f78, 0x0c1018, 0x8aa0d0, 0.28, 42, 1.0],
  [5,  0x101527, 0x101526, 0x44507a, 0x0d1119, 0xa090a0, 0.22, 30, 0.9],
  [7,  0x3a4052, 0x343a4a, 0x66738e, 0x1c2028, 0xe0a060, 0.70, 12, 0.25],
  [9,  0x4a5262, 0x424a58, 0x707c94, 0x222630, 0xd8d2c4, 1.00, 30, 0.0],
  [15, 0x485064, 0x40485a, 0x6c7890, 0x20242e, 0xcfc9bd, 0.95, 26, 0.0],
  [18, 0x5a3346, 0x4a2c3c, 0x6a4a60, 0x1a1420, 0xff8040, 0.50, 8,  0.35],
  [20, 0x1a1e30, 0x181c2c, 0x46557e, 0x101320, 0xb08060, 0.24, 18, 0.8],
  [24, 0x0d1220, 0x0d1220, 0x3e4f78, 0x0c1018, 0x8aa0d0, 0.28, 42, 1.0],
];
export function aerialLightAt(hour) {
  let a = AERIAL_KEYS[0], b = AERIAL_KEYS[AERIAL_KEYS.length - 1];
  for (let i = 0; i < AERIAL_KEYS.length - 1; i++)
    if (hour >= AERIAL_KEYS[i][0] && hour <= AERIAL_KEYS[i + 1][0]) { a = AERIAL_KEYS[i]; b = AERIAL_KEYS[i + 1]; break; }
  const t = b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0]);
  const cl = (i) => new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t);
  const nm = (i) => a[i] + (b[i] - a[i]) * t;
  return { sky: cl(1), fog: cl(2), hemiSky: cl(3), hemiGround: cl(4), sunColor: cl(5), sunInt: nm(6), sunElev: nm(7), night: nm(8) };
}
