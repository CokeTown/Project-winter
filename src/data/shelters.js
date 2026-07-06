/* ============================================================
   data/shelters.js — 셸터 데이터 필드 (game.js SHELTERS 분리 Phase 1)
   ------------------------------------------------------------
   셸터의 순수 데이터(이름·쾌적·날씨풀·퍽·방 크기·무드 등). 로직(한파/쾌적/경제)이 읽는다.
   렌더 함수(buildRoom/buildEnv = THREE)는 game.js 스코프(roomGroup/wallPhong 등)가 필요해 game.js 잔류 —
   game.js가 SHELTERS[id] = { ...SHELTER_META[id], buildRoom, buildEnv } 로 병합한다.
   ※ 데이터 무결성은 tests/core.test.cjs의 SHELTER_SIG 가드가 보증(분리가 필드를 온전히 보존해야 green).
   ============================================================ */
export const SHELTER_META = {
  container: {
    name: '버려진 컨테이너', nameEn: 'Abandoned Container', emoji: '📦', unlockAt: 0, viewH: 14, ceilY: 2.1,
    desc: '황무지 한가운데 버려진 화물 컨테이너. 좁지만 비바람은 막아준다.',
    descEn: 'A cargo container abandoned in the middle of the wasteland. Cramped, but it keeps out the wind and rain.',
    baseComfort: 2,
    cold: 8, limits: '🥶 얇은 철판 — 비/눈 오는 날 쾌적함 -8', limitsEn: '🥶 Thin steel — comfort -8 on rainy/snowy days',
    weatherPool: ['clear', 'ash', 'ash', 'snow'],
    perk: { expBonus: 0.05, label: '🧭 길목의 거점 — 탐험 성공률 +5%p', labelEn: '🧭 Crossroads outpost — expedition success +5%p' },
    room: { w: 6.4, d: 2.9, h: 2.4 },
    mood: { fog: 0x2e2820, fogNear: 20, fogFar: 52, skyH: 0x453a2d, skyZ: 0x15161e, hemiSky: 0x8a8272, hemiGround: 0x4c443a, hemiInt: 0.72, moonC: 0xc9c0a8, moonInt: 0.68, stars: 0.5 },
  },
};
