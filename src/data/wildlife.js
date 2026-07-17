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
  // v1.5.1 디자인 업(디렉터 레퍼런스: HIVE 사슴) — 등 반점(spot)/흰 양말(sock)/귀 안쪽(earIn) 레이어 추가.
  deer: {
    kind: 'quad', sizeH: 0.42, gait: 0.5, shy: 3.0,
    palette: { fur: 0x8a6a48, belly: 0xd8c4a4, ear: 0x6a4e34, nose: 0x2a2420, eye: 0x140f0a, antler: 0xcbb998,
      spot: 0xd9aa6e, sock: 0xe6d7bd, earIn: 0xd89a96 },
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
  // #182 B1 개 — 폐허의 떠돌이 개. dog 플래그로 buildQuad가 늘어진 귀·긴 주둥이·치켜든 꼬리로 실루엣 분화.
  //   shy 낮음(사람에게 다가온다) — 카논 "따뜻하게". 드랍(뼈다귀 등)은 B2에서 spawnGroundDrop 연결.
  dog: {
    kind: 'quad', sizeH: 0.34, gait: 0.72, shy: 1.1, dog: true,
    palette: { fur: 0x8a6a44, belly: 0xc4a67e, ear: 0x6a4e34, nose: 0x1a1410, eye: 0x140f0a, tailTip: 0x9a7a54 },
    nameKo: '개', nameEn: 'dog',
  },
  // #182 B1 참새 — 소형 참새(온실새·귀환새(봄)·언참새(겨울) 공용 모델. 계절 게이트는 B2).
  sparrow: {
    kind: 'bird', sizeH: 0.12, gait: 0.5, shy: 2.4,
    palette: { body: 0x8a6f4e, wing: 0x66502f, beak: 0x2a2018, eye: 0x0d0b09, belly: 0xcabfa4 },
    nameKo: '참새', nameEn: 'sparrow',
  },
  // #182 B1 기러기 — 긴 목(goose 플래그)·큰 몸. 남행 행렬(geesesouth, 가을). 계절/편대는 B2.
  goose: {
    kind: 'bird', sizeH: 0.30, gait: 0.52, shy: 2.8, goose: true,
    palette: { body: 0xb8b0a4, wing: 0x8a8278, beak: 0x30281e, eye: 0x0d0b09, neck: 0x2a2824 },
    nameKo: '기러기', nameEn: 'goose',
  },
  // #182 B1 곤충 — kind:'insect'(부유·군집). glow 있으면 발광(반딧불). 계절/밤 게이트는 B2.
  firefly: {
    kind: 'insect', sizeH: 0.05, gait: 0.3, shy: 0.6, glow: 0xd4ff8c,
    palette: { body: 0x2a2818, head: 0x1a180f, wing: 0x3a4a20 },
    nameKo: '반딧불', nameEn: 'firefly',
  },
  bee: {
    kind: 'insect', sizeH: 0.05, gait: 0.42, shy: 1.0,
    palette: { body: 0xd9a72e, head: 0x2a2214, wing: 0xe6ecec },
    nameKo: '벌', nameEn: 'bee',
  },
  cicada: {
    kind: 'insect', sizeH: 0.085, gait: 0.22, shy: 1.4,
    palette: { body: 0x4a5238, head: 0x2a3020, wing: 0xaab2a4 },
    nameKo: '매미', nameEn: 'cicada',
  },
  mosquito: {
    kind: 'insect', sizeH: 0.035, gait: 0.5, shy: 0.8,
    palette: { body: 0x3a352c, head: 0x2a2620, wing: 0xc8ccd0 },
    nameKo: '모기', nameEn: 'mosquito',
  },
  // #182 B1 거미줄 — 로밍 아님(kind:'web'). 정적 프롭: 방 구석 창틀에 방사형 실 + 이슬 + 작은 거미.
  //   단일 텍스처 평면(픽셀 저해상에서 또렷). 인카운터 'spiderweb'(아침 거미줄)의 인엔진 실체. 게이트는 B2.
  spiderweb: {
    kind: 'web', sizeH: 0.42, shy: 0,
    palette: { silk: 0xd6dce4, spider: 0x1e1a16, dew: 0xe6f4ff },
    nameKo: '거미줄', nameEn: 'spiderweb',
  },
  // 산양(goat)은 디렉터 판단으로 제외(지리 정합 — 2026-07). 고원/초지는 사슴이 대신한다.
};

// 구역(district)별 등장 종. districtOf(shelterId) 결과 키. 셸터별 override 는 SHELTER_WILDLIFE.
export const DISTRICT_WILDLIFE = {
  outskirts: ['rabbit', 'crow', 'dog'],
  city:      ['strayCat', 'crow', 'dog'],
  meadow:    ['rabbit', 'deer'],
  forest:    ['deer', 'fox'],
  coast:     ['seagull', 'crow'],
  harbor:    ['seagull', 'rat'],
  highland:  ['deer', 'crow'],
  research:  ['crow'],
};

// 셸터별 로밍 존 + override. groundY = 근접 야외 지면 근사(각 buildEnv GY 참고).
//   band = [rMin, rMax] 방 밖 로밍 반경. indoor 셸터(지하철)는 실내 승강장 가장자리.
//   species 미지정 시 DISTRICT_WILDLIFE[districtOf(id)] 사용.
//   avoidR = 방 회피 반경 오버라이드(#95): 기본은 방 사각 풋프린트 회피지만, 돔처럼 원형 매스는 원이 정확하다.
export const SHELTER_WILDLIFE = {
  container:    { groundY: -0.72, band: [3.4, 6.5] },
  bunker:       { groundY: -0.82, band: [3.8, 6.5], avoidR: 4.9 }, // 돔 외피 R4.35+T0.42+여유 — 밑동 클리핑 방지
  rooftop:      { groundY: 0.0,  band: [3.2, 5.0], birdOnly: true }, // 옥상: 난간 위 새만
  cabin:        { groundY: -1.3, band: [3.6, 7.0], avoidRect: { w: 11.0, d: 9.0 } }, // #209: 숲 바닥 -1.3(GY 실측). 기단(11×9)을 avoidRect로 회피(사슴·여우 기단 위 매몰 방지)
  bus:          { groundY: -0.77, band: [3.2, 6.0] },
  subway:       { groundY: 0.0,  band: [2.6, 3.6], indoor: true, species: ['rat'], edgeOnly: true }, // 승강장 가장자리 쥐
  greenhouse:   { groundY: -0.78, band: [3.4, 6.5] },
  // #209 B안(디렉터) 보류: 물위/탑 셸터는 새가 실표면(갑판·발코니·갤러리)에 앉아야 하나, 그 표면이 사각 방을
  //   두른 링/둘레라 radial band로는 대각각에서 방 안(바닥 밑)에 떨어진다(실측: 폴백 지배 → 오배치). 둘레(perimeter)
  //   배치 모드가 필요 — 별도 처리. 현행 -0.9 자리값 유지(새가 상공에 뜨는 기존 상태, 오배치보다 안전).
  ship:         { groundY: -0.9, band: [3.4, 5.5], birdOnly: true }, // 갑판/난간 새 위주
  lighthouse:   { groundY: -0.9, band: [3.4, 5.5], birdOnly: true },
  tugboat:      { groundY: -0.9, band: [3.2, 5.0], birdOnly: true },
  controltower: { groundY: -0.9, band: [3.4, 5.5], birdOnly: true },
  lodge:        { groundY: -0.88, band: [3.8, 7.0] },
};
