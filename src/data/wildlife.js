/* ============================================================
   wildlife.js — Nine Winters 야생동물 로밍 데이터 (F-1a 「세계가 살아 있다」)
   ------------------------------------------------------------
   목적: 셸터(구역)별 등장 종·행동 파라미터·로밍 존을 "순수 데이터"로 분리.
         종 메시는 systems/wildlife.js가 이 테이블을 읽어 절차 생성한다(외부 에셋 0).
   원칙: 의존성 0의 순수 데이터(import 금지 — balance.js 선례). 로직/빌더는 시스템에.
         사람 형상 금지 캐논 준수 — 전부 동물. 밸런스/이벤트 로직 무참조.
   좌표계: 로밍 존은 방(ROOM) 밖 근접 야외 밴드. groundY = 그 근처 지면 대략 높이
           (셸터 buildEnv의 GY 근사). 새는 이 위로 날고, 지상종은 이 높이에 선다.
   출처: F-1a 오더 [A] 지역별 종 테이블 + [B] 개막/티저.
   ============================================================ */

// 종 정의 — 복셀 절차 생성 파라미터(팔레트 + 실루엣 종류). cat.js buildCatMesh 문법 재사용.
//   kind: 'quad'(네발) | 'bird'(조류). palette 는 부위색. sizeH = 선 자세 대략 높이(월드).
//   gait: 이동속도(월드/초). shy: 도망 반경(플레이어 접근 감지). 값이 클수록 겁 많음.
export const WILDLIFE_SPECIES = {
  rabbit: {
    kind: 'quad', sizeH: 0.16, gait: 0.55, shy: 1.6, hopGait: true,
    palette: { fur: 0x9a8f82, belly: 0xe8e2d6, ear: 0x8a7f72, nose: 0xb08078, eye: 0x1a1410 },
    nameKo: '토끼', nameEn: 'rabbit',
  },
  crow: {
    kind: 'bird', sizeH: 0.20, gait: 0.6, shy: 2.2,
    palette: { body: 0x1c1c22, wing: 0x14141a, beak: 0x2a2620, eye: 0x0d0b09 },
    nameKo: '까마귀', nameEn: 'crow',
  },
  deer: {
    kind: 'quad', sizeH: 0.42, gait: 0.5, shy: 3.0,
    palette: { fur: 0x8a6a48, belly: 0xd8c4a4, ear: 0x6a4e34, nose: 0x2a2420, eye: 0x140f0a, antler: 0xcbb998 },
    nameKo: '사슴', nameEn: 'deer',
  },
  fox: {
    kind: 'quad', sizeH: 0.22, gait: 0.62, shy: 2.6,
    palette: { fur: 0xc06a2c, belly: 0xece4d6, ear: 0x2a2018, nose: 0x1a1410, eye: 0x140f0a, tailTip: 0xf2ece2 },
    nameKo: '여우', nameEn: 'fox',
  },
  strayCat: {
    kind: 'quad', sizeH: 0.24, gait: 0.5, shy: 2.4, silhouette: true,
    palette: { fur: 0x2a2a30, belly: 0x26262c, ear: 0x24242a, nose: 0x1a1418, eye: 0xcaa23a },
    nameKo: '길고양이', nameEn: 'stray cat',
  },
  seagull: {
    kind: 'bird', sizeH: 0.22, gait: 0.55, shy: 2.0,
    palette: { body: 0xe8ecef, wing: 0xb8c0c8, beak: 0xe0b040, eye: 0x14100c },
    nameKo: '갈매기', nameEn: 'seagull',
  },
  rat: {
    kind: 'quad', sizeH: 0.10, gait: 0.6, shy: 1.4,
    palette: { fur: 0x4a4038, belly: 0x5a5048, ear: 0x6a4a48, nose: 0xc08078, eye: 0x140f0a, tailTip: 0x6a4a48 },
    nameKo: '쥐', nameEn: 'rat',
  },
  goat: {
    kind: 'quad', sizeH: 0.40, gait: 0.42, shy: 2.8,
    palette: { fur: 0xd8d2c4, belly: 0xe8e4da, ear: 0xa89e8c, nose: 0x2a2420, eye: 0x140f0a, antler: 0x3a3128 },
    nameKo: '산양', nameEn: 'mountain goat',
  },
};

// 구역(district)별 등장 종. districtOf(shelterId) 결과 키. 셸터별 override 는 SHELTER_WILDLIFE.
export const DISTRICT_WILDLIFE = {
  outskirts: ['rabbit', 'crow'],
  city:      ['strayCat', 'crow'],
  meadow:    ['rabbit', 'goat'],
  forest:    ['deer', 'fox'],
  coast:     ['seagull', 'crow'],
  harbor:    ['seagull', 'rat'],
  highland:  ['goat', 'crow'],
  research:  ['crow'],
};

// 셸터별 로밍 존 + override. groundY = 근접 야외 지면 근사(각 buildEnv GY 참고).
//   band = [rMin, rMax] 방 밖 로밍 반경. indoor 셸터(지하철)는 실내 승강장 가장자리.
//   species 미지정 시 DISTRICT_WILDLIFE[districtOf(id)] 사용.
export const SHELTER_WILDLIFE = {
  container:    { groundY: -0.72, band: [3.4, 6.5] },
  bunker:       { groundY: -0.82, band: [3.8, 6.5] },
  rooftop:      { groundY: 0.0,  band: [3.2, 5.0], birdOnly: true }, // 옥상: 난간 위 새만
  cabin:        { groundY: -0.8, band: [3.6, 7.0] },
  bus:          { groundY: -0.77, band: [3.2, 6.0] },
  subway:       { groundY: 0.0,  band: [2.6, 3.6], indoor: true, species: ['rat'], edgeOnly: true }, // 승강장 가장자리 쥐
  greenhouse:   { groundY: -0.78, band: [3.4, 6.5] },
  ship:         { groundY: -0.9, band: [3.4, 5.5], birdOnly: true }, // 갑판/난간 새 위주
  lighthouse:   { groundY: -0.9, band: [3.4, 5.5], birdOnly: true },
  tugboat:      { groundY: -0.9, band: [3.2, 5.0], birdOnly: true },
  controltower: { groundY: -0.9, band: [3.4, 5.5], birdOnly: true },
  lodge:        { groundY: -0.88, band: [3.8, 7.0] },
};
