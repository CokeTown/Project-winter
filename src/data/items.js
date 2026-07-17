/* ============================================================
   items.js — Nine Winters 아이템/제작/장식/고양이 포즈 데이터 (콘텐츠 분리 Phase 1)
   ------------------------------------------------------------
   목적: 자원·부상·탐험 준비물·제작 레시피·테마 세트·고양이 포즈 등
         "순수 콘텐츠 테이블"을 game.js에서 분리한다.
   원칙: 순수 데이터 파일. 밸런스 수치는 balance.js의 BAL를 참조하되(CRAFTS 염장 비용),
         balance.js는 의존성 0이므로 순환이 생기지 않는다(data→data 단방향 허용).
   미이동: WALLPAPERS/FLOORINGS 는 tex()가 game.js의 makeCanvasTex(캔버스/THREE 렌더)를
           호출하는 텍스처 빌더라 Phase 2로 유보(3D 빌더 분리 배치). 여기엔 없음.
   출처: game.js RESOURCES/INJURIES/PREPS/THEME_SETS/CAT_POSES/CAT_PERCH_Y/CRAFTS.
   ============================================================ */
import { BAL } from './balance.js';

export const RESOURCES = {
  food:       { name: '신선식품', nameEn: 'Fresh Food',  emoji: '🍎' },
  canned:     { name: '통조림',   nameEn: 'Canned Food', emoji: '🥫' },
  water:      { name: '깨끗한 물', nameEn: 'Clean Water', emoji: '💧' },
  cloth:      { name: '천',       nameEn: 'Cloth',       emoji: '🧵' },
  bandage:    { name: '붕대',     nameEn: 'Bandage',     emoji: '🩹' },
  antiseptic: { name: '소독약',   nameEn: 'Antiseptic',  emoji: '🧴' },
  painkiller: { name: '진통제',   nameEn: 'Painkiller',  emoji: '💊' },
  candle:     { name: '양초',     nameEn: 'Candle',      emoji: '🕯️' },
  battery:    { name: '배터리',   nameEn: 'Battery',     emoji: '🔋' },
  fuel:       { name: '연료',     nameEn: 'Fuel',        emoji: '⛽' },
  parts:      { name: '부품',     nameEn: 'Parts',       emoji: '⚙️' },
  material:   { name: '건축재',   nameEn: 'Material',    emoji: '🧱' },
  salt:       { name: '소금',     nameEn: 'Salt',        emoji: '🧂' }, // 1.1 항구: 수산시장/야적장 전리품 · 염장 재료
  book:       { name: '책',       nameEn: 'Book',        emoji: '📕' }, // #76 지식: 잉여 식량을 암시장에 판 부산물 + 탐험 희귀 드랍 · 사치 가구 재료
};
// ---- 부상 (기획서 v0.2: 부상 치료 시스템) ----
export const INJURIES = {
  minor:     { name: '가벼운 부상', nameEn: 'Minor Injury',    icon: '🩹', pen: 0.05, restH: 12, cure: { bandage: 1 }, infect: 0.10 },
  deep:      { name: '깊은 상처',   nameEn: 'Deep Wound',      icon: '🩸', pen: 0.15, restH: 24, cure: { bandage: 1, antiseptic: 1 }, infect: 0.25 },
  sprain:    { name: '염좌',        nameEn: 'Sprain',          icon: '🦵', pen: 0.10, restH: 18, timeMult: 1.3, cure: { painkiller: 1 } },
  infection: { name: '감염 위험',   nameEn: 'Infection Risk',  icon: '🤒', pen: 0.20, restH: 36, cure: { antiseptic: 1, water: 1 } },
  // 2.0 중상 (GD-2.0 §9.3) — 부상 트리의 정점. 하드코어 도심 중심지 조우(총 미보유) + 하드코어 악화 사슬의 끝.
  //   사망 아님("사망 없음, 탈진만" 정체성) — 의약품 소요 급증·장기 회복. memoir 흉터(§9.4-④)로 남는다.
  critical:  { name: '중상',        nameEn: 'Critical Wound',  icon: '🚑', pen: 0.35, restH: 72, timeMult: 1.5, cure: { bandage: 2, antiseptic: 2, painkiller: 1 } },
};
// ---- 탐험 준비물 (기획서 v0.2: 준비물 슬롯) ----
export const PREPS = {
  bottle:    { name: '물병',     nameEn: 'Water Bottle', emoji: '🥤', cost: { water: 1 },  eff: '탐험 갈증 소모 절반 · 부상 회복 -20%', effEn: 'Halves thirst use on expeditions · injury recovery -20%' },
  canned:    { name: '통조림',   nameEn: 'Canned Food', emoji: '🥫', cost: { canned: 1 }, eff: '공업/슬럼 성공률 +5%p', effEn: 'Industrial/slum success +5%p', bonus: { industrial: 0.05, slum: 0.05 } },
  flashlight:{ name: '손전등',   nameEn: 'Flashlight', emoji: '🔦', cost: { battery: 1 },eff: '상업/슬럼 성공률 +10%p', effEn: 'Commercial/slum success +10%p', bonus: { commercial: 0.10, slum: 0.10 } },
  gloves:    { name: '장갑',     nameEn: 'Gloves', emoji: '🧤', cost: { cloth: 1 },  eff: '부상 확률 -30%', effEn: 'Injury chance -30%' },
  raincoat:  { name: '우의',     nameEn: 'Raincoat', emoji: '🧥', cost: { cloth: 1 },  eff: '날씨 페널티 -70%', effEn: 'Weather penalty -70%' },
  firstaid:  { name: '응급키트', nameEn: 'First-Aid Kit', emoji: '⛑️', cost: { bandage: 1, antiseptic: 1 }, eff: '깊은 상처 → 가벼운 부상으로 완화', effEn: 'Softens deep wounds into minor injuries' },
};

export const THEME_SETS = [
  { id: 'bedroom', name: '따뜻한 침실', nameEn: 'Warm Bedroom', emoji: '🛏️', items: ['bed', 'rug', 'lamp', 'heater'] },
  { id: 'workshop', name: '작업 공간', nameEn: 'Work Space', emoji: '🛠️', items: ['table', 'crate', 'bookshelf'] },
  { id: 'greencorner', name: '녹색 구석', nameEn: 'Green Corner', emoji: '🪴', items: ['plant', 'plant', 'teatable'] },
  // #76 사치 세트 — 살아남은 뒤에야 갖추는 응접실. 셋을 다 모으면 분위기 가산.
  { id: 'parlor', name: '응접실', nameEn: 'Parlor', emoji: '🎶', items: ['globe', 'phonograph', 'candelabra'] },
];

export const CAT_POSES = {
  //          bodyY   bodyRX     headRX      legF        legB        tail1RX
  // walk: 서있는 기본 높이(다리 피벗 0.12와 거의 일치하는 0.13), 수평 자세 — stride 오버레이가 다리를 흔든다
  walk:    { by: 0.13,  brx: 0,     hrx: 0,    legF: 0,     legB: 0,     t1: -0.5 },
  // sit: 마인크래프트 식 — 엉덩이(피벗)를 바닥에 붙이고 가슴을 크게 들어올림.
  //   기하 검증(box 로컬 코너 y=±0.04, z=0/0.24 를 brx만큼 회전 후 +by):
  //     brx=-1.0, by=0.025 → 엉덩이쪽(z=0) 바닥 코너 y≈0.008(거의 접지), 가슴쪽(z=0.24) 최고점 y≈0.264
  //   앞다리는 거의 수직 유지(legF≈0, 몸이 들려도 어깨 피벗은 고정이라 다리는 그대로 뻗은 자세로 보임),
  //   뒷다리는 -1.5rad 로 완전히 접어 배(들린 엉덩이) 밑으로 숨김(다리 끝 y≈0.11, z가 몸쪽으로 당겨짐).
  //   (라이브 튜닝 확정 2026-07-04: 57°는 가슴이 앞다리에서 벗어나 공중부양으로 보임 → 35°)
  //   (v0.9.5 재수술: brx -0.62(35°)는 긴 몸통 박스를 사선 판자처럼 만들고 고정 다리와 어깨가 분리돼 "박살"으로 보임 →
  //    brx -0.30(17°)로 완화해 몸통을 거의 수평 로프 실루엣으로, 앞다리 소폭 접힘(-0.3)으로 앞발 앞짚음, by 소폭 상향)
  //   (v1.2.0 ⑦ MC 재수술: 디렉터 신고 — 앞다리 상단이 가슴 볼륨 관통. legF≈0(수직 앞다리)로 바꾸고,
  //    updateCatBones에서 어깨 피벗을 척추 리프트만큼 counter-rotate(shoulderComp)해 관통 제거. 가슴 세움 유지.)
  //   (v1.5 측면 수술, 디렉터 점검: 측면에서 '앉음'이 안 읽히고 낮은 웅크림으로 보임 → 가슴 세움 -0.30→-0.40.
  //    -0.62 판자 사고의 재발 방지선은 shoulderComp(v1.2.0 이후 존재)가 맡는다. 머리 기울임·꼬리 경직 완화 동반.)
  //    뒷다리 접힘 -1.5→-1.25: 완전 접힘은 허벅지 박스 끝이 등선 위로 삐져나옴(측면 실측) → 몸 아래로 수납되는 깊이.
  sit:     { by: 0.03,  brx: -0.40, hrx: 0.14, legF: -0.30, legB: -1.5,  t1: -0.65 }, // 디렉터(2026-07 3차): 뒷다리를 지면 밀착·앞(몸통 방향)으로 쭉 뻗기 — sprawl의 거울(sprawl legB +1.5=수평 뒤 → sit −1.5=수평 앞). 정강이 곧게(cat.js shinTgt→0: 발끝 말림/몸통관통 제거)·엉덩이 피벗 지면(bpiv→sprawl과 동일 0.032)
  // sleep: 식빵 — 몸통 수평(brx=0)으로 낮춰 배가 바닥에 닿게(by=0.03 → 바닥면 y≈-0.01, 살짝 파묻혀 접지감),
  //   네 다리 전부 -1.5rad 로 접어 몸 밑에 숨김(legF=legB), 머리는 살짝 숙임(hrx 양수)
  sleep:   { by: 0.03,  brx: 0,     hrx: 0.5,  legF: 0,     legB: 0,     t1: -1.3 }, // 디렉터 신고(2026-07 라이브): -1.5 접힘이 발끝을 어깨높이로 올려 '다리 위로 솟음' → 0(수직 아래). 몸통 바닥밀착 유지
  // sprawl: 엎드려 눕기(마인크래프트 고양이 침대 눕기 레퍼런스, v1.2.0 ⑦ 재수술 · 배E-1 배 노출 완전 제거).
  //   배 노출 드러눕기(몸통 롤)를 폐기 → 배는 바닥, 몸통을 낮게 붙이고(by 낮춤·brx 0=수평) 다리 4개를
  //   앞뒤로 곧게 뻗는다(앞다리 전방 legF 음수 / 뒷다리 후방 legB 양수). 고개는 들어 정면(쉬는 자세, hrx≤0).
  //   꼬리는 바닥에 자연스럽게(t1 완화). 몸통 z축 롤은 렌더 경로에서 항상 0으로 강제(cat.js).
  //   (v1.5 수술, 디렉터 실기기 신고 — 앞다리가 몸통 밖 기둥으로 분리 + 세그 슬릿: 앞다리 스윙을 몸통 아래로
  //    수납(-0.9→-0.5), 뒷다리 뻗기 완화(0.55→0.32), 배 밀착(by 0.035→0.03)으로 실루엣을 한 덩어리로.)
  //   (v1.5.1: 뒷다리 뒤로 뻗기(양수)는 발바닥이 위로 노출돼 '뒤집힘'으로 읽힘(디렉터 실기기) → 몸 아래 접힘으로.)
  sprawl:  { by: 0.02,  brx: 0,     hrx: -0.3,  legF: -1.5,  legB: 1.5,   t1: -0.1 }, // 디렉터(2026-07): 진짜 superman — 앞다리 앞으로/뒷다리 뒤로 '수평 곧게' 쭉(뭉치지 않게). 어깨·엉덩이 피벗 바닥근처(cat.js)로 눕힘
  // groom: sit과 같은 앉음 실루엣 위에 오버레이(updateCat의 headRX 사인파/앞발 들기)가 얹힌다 (sit 재수술에 맞춰 완화)
  groom:   { by: 0.03,  brx: -0.40, hrx: 0.30, legF: -0.3,  legB: -1.5,  t1: -0.65 }, // sit 실루엣 공유 — v1.5 측면 수술 동반 갱신. #208: by 0.06→0.03(sit과 동일) — 엉덩이 피벗을 sit처럼 내리고 나면(cat.js) 몸통이 3cm 높은 채라 뒷다리가 떴다
  // stretch: 다운독 — brx=+0.6, by=0.17 → 가슴쪽(z=0.24) 바닥 코너 y=0(접지), 엉덩이쪽 y≈0.14(번쩍 들림)
  //   앞다리는 앞으로 쭉 뻗고(legF 음수, 접힘 부호를 반대로 써 전방으로 펴짐), 뒷다리는 곧게 편 채 지지(legB≈0)
  stretch: { by: 0.17,  brx: 0.6,   hrx: -0.6, legF: -0.15, legB: 0.1,   t1: 0.35 }, // 디렉터(2026-07): ㄴ자 앞팔 접지(cat.js _fore/_fpiv) + 얼굴 조금 들기(hrx −0.4→−0.6, 턱 파묻힘 방지·앞발 틈. −1.0은 과해서 하향)

  // play: 사냥 자세 — 몸을 살짝 낮추고(by 표준보다 조금 아래) 앞으로 약간 웅크림, hop 오버레이가 콩콩 튀게 함
  play:    { by: 0.11,  brx: 0.15,  hrx: 0.15, legF: 0.1,   legB: -0.4,  t1: -0.8 },
  // hop: 가구 오르내리는 점프 중 — 네 다리 웅크림 + 꼬리 들어 균형
  hop:     { by: 0.13,  brx: -0.12, hrx: -0.1, legF: -0.85, legB: -0.85, t1: 0.35 },
};
export const CAT_PERCH_Y = { bed: 0.63, sofa: 0.56, rug: 0.05, cushion: 0.2 };
// #193: 침대는 티어가 곧 높이(#157 — sofa/chair와 달리 좌면 높이가 티어 정체성)라 퍼치·착석 y도 티어를 따라야 한다.
//   실측(furniture.js bed build): T1 매트리스 상면 0.16·담요 상면 0.22 걸침 → 중앙 0.19(#209 F26: 베개 0.245 단독 기준 폐기) / T2 싱글 매트리스 상면 0.38+0.075≈0.46 / T3 이불 상면 0.64≈0.63
export const BED_TOP_Y = { 1: 0.19, 2: 0.46, 3: 0.63 };
// #196(디렉터 신고 확대 감사): 침대와 같은 부류 — 티어로 좌면이 변하는 가구의 착석·퍼치 앵커 표.
//   값 = 지오 실측(furniture.js 각 build 티어 분기) 기반, 현행 T3 침하 연출 오프셋 유지(소파 -0.07·방석 -0.015·의자 -0.045).
//   소파 T1 0.51~0.55 / T2 0.57~0.59 / T3 0.63 · 방석 T1 0.18 / T2 0.11(납작 디자인) / T3 0.215 · 의자 T1 0.46 / T2·T3 0.495
export const TIER_TOP_Y = {
  bed: BED_TOP_Y,
  sofa: { 1: 0.46, 2: 0.51, 3: 0.56 },
  cushion: { 1: 0.165, 2: 0.095, 3: 0.2 },
  chair: { 1: 0.415, 2: 0.45, 3: 0.45 },
};

// ---- #86④ 복장 (디렉터 UX 결정: 생성 시 X — 천을 구해 '만들어 입는' 제작 문법) ----
//   pal = 아바타 복셀 팔레트 오버라이드(coat/coatHem/sleeve/beanie/scarf). default는 시작 복장.
//   획득은 CRAFTS(아래), 착용은 옷장(툴바 👕/아바타 탭). 세이브: state.outfits(보유)/state.outfit(착용).
export const OUTFITS = {
  default:  { name: '방한 코트',   nameEn: 'Winter Coat',   emoji: '🧥', pal: {} },
  navy:     { name: '네이비 코트', nameEn: 'Navy Coat',     emoji: '🧥',
    pal: { coat: 0x3e4a5c, coatHem: 0x333d4c, sleeve: 0x394454, scarf: 0xb84a3a, beanie: 0x2e3540 } },
  wine:     { name: '와인 코트',   nameEn: 'Wine Coat',     emoji: '🧥',
    pal: { coat: 0x6a3a3e, coatHem: 0x553034, sleeve: 0x613639, scarf: 0xd9c9a8, beanie: 0x4a2c30 } },
  forest:   { name: '숲 파카',     nameEn: 'Forest Parka',  emoji: '🧥',
    pal: { coat: 0x44523a, coatHem: 0x384430, sleeve: 0x3f4c36, scarf: 0xd0812f, beanie: 0x333f2c } },
  cream:    { name: '크림 파카',   nameEn: 'Cream Parka',   emoji: '🧥',
    pal: { coat: 0xcfc4ae, coatHem: 0xb4a98f, sleeve: 0xc4b9a2, scarf: 0x3e4a5c, beanie: 0x6a5a44 } },
  charcoal: { name: '차콜 코트',   nameEn: 'Charcoal Coat', emoji: '🧥',
    pal: { coat: 0x3a3a40, coatHem: 0x2f2f35, sleeve: 0x35353b, scarf: 0xb8862e, beanie: 0x2a2a30 } },
  // ── 2.0-(e) 동부 시그니처 복장 4종 (GD-2.0 §6 "도심 시그니처=복장") ──
  //   구역 서사를 입는다: 도면(bp)은 그 지역에서만 드랍(DDD-4 문법) → 제작 해금 → 옷장 착용.
  //   팔레트는 동부 아트 디렉션(TLOU 감성+붉은 노을) — 채도 죽인 웜톤 + 노을 액센트.
  customsvest: { name: '세관 우비',     nameEn: 'Customs Slicker',   emoji: '🧥',
    pal: { coat: 0xb0512f, coatHem: 0x8f421f, sleeve: 0xa54a2a, scarf: 0x2e3540, beanie: 0x30281f } },
  riggerjacket: { name: '정비공 재킷',  nameEn: 'Rigger Jacket',     emoji: '🧥',
    pal: { coat: 0x4a5a68, coatHem: 0x3c4a56, sleeve: 0x44535f, scarf: 0xd8a13c, beanie: 0x2f3844 } },
  stationcoat: { name: '역무원 코트',   nameEn: 'Stationmaster Coat', emoji: '🧥',
    pal: { coat: 0x2f3850, coatHem: 0x272e42, sleeve: 0x2b3449, scarf: 0xc9963a, beanie: 0x232a3c } },
  towncoat: { name: '마천루 롱코트',    nameEn: 'Skyline Longcoat',  emoji: '🧥',
    pal: { coat: 0x4c3a44, coatHem: 0x3d2f38, sleeve: 0x463641, scarf: 0x9d5c4e, beanie: 0x33282f } },
  // ── 스타일 복장 4종 (디렉터 2026-07-17: "단순 색 변경이 아니라 옷 스타일 자체 변경") ──
  //   style 필드가 아바타 복셀 실루엣을 바꾼다(avatar.js buildMesh 분기): 후드/패딩/판초/조끼.
  hoodie: { name: '잿빛 후드티',  nameEn: 'Ash Hoodie',   emoji: '🧥', style: 'hoodie',
    pal: { coat: 0x6a6d72, coatHem: 0x585b60, sleeve: 0x63666b, scarf: 0x585b60, beanie: 0x5d6065 } },
  puffer: { name: '벽돌색 패딩',  nameEn: 'Brick Puffer', emoji: '🧥', style: 'puffer',
    pal: { coat: 0x8a4030, coatHem: 0x7a3628, sleeve: 0x84392b, scarf: 0x6e3225, beanie: 0x3a3230 } },
  poncho: { name: '모래 판초',    nameEn: 'Sand Poncho',  emoji: '🧥', style: 'poncho',
    pal: { coat: 0x7a5a3c, coatHem: 0x684c32, sleeve: 0x715340, scarf: 0xb84a3a, beanie: 0x4a3b2c } },
  vest: { name: '올리브 조끼',    nameEn: 'Olive Vest',   emoji: '🧥', style: 'vest',
    pal: { coat: 0x3f4a3a, coatHem: 0x353f31, sleeve: 0xa89478, scarf: 0x8a5a3c, beanie: 0x39322a } },
};

export const CRAFTS = [
  { out: { res: 'bandage', n: 1 }, cost: { cloth: 2 }, hint: '기본 치료품', hintEn: 'Basic first aid' },
  { out: { res: 'candle', n: 2 }, cost: { cloth: 1, fuel: 1 }, hint: '조명 연료', hintEn: 'Lighting fuel' },
  { out: { res: 'material', n: 1 }, cost: { parts: 2 }, hint: '수리·유지비용', hintEn: 'Repairs & upkeep' },
  { out: { furn: 'cushion' }, cost: { cloth: 2 }, hint: '푹신한 바닥 방석', hintEn: 'A soft floor cushion' },
  { out: { furn: 'bookstack' }, cost: { cloth: 1, material: 1 }, hint: '주워 모은 책 무더기', hintEn: 'A pile of gathered books' },
  { out: { furn: 'crate' }, cost: { material: 2 }, hint: '수납 상자', hintEn: 'Storage crate' },
  // 「생존의 흔적」 밀도 데코(2026-07-15) — 값싸게 여러 개 놓아 빈 벽·구석을 생존자 소굴처럼 채운다.
  //   #190 커먼 도면 게이트(디렉터): 탐험 저확률 파밍으로만 제작 해금 (BAL.blueprint.commonItems).
  { out: { furn: 'supplyshelf' }, bp: 'supplyshelf', cost: { material: 3 }, hint: '통조림·병을 채운 보급 선반', hintEn: 'A supply shelf stocked with cans and jars' },
  { out: { furn: 'cratestack' }, bp: 'cratestack', cost: { material: 3 }, hint: '쌓아 올린 보급 상자 더미', hintEn: 'A stack of scavenged supply crates' },
  { out: { furn: 'fuelpile' }, bp: 'fuelpile', cost: { material: 1, fuel: 2 }, hint: '난롯가에 쌓아 둔 장작 더미', hintEn: 'A firewood pile stacked by the stove' },
  { out: { furn: 'noticeboard' }, bp: 'noticeboard', cost: { material: 2, cloth: 1 }, hint: '지도·메모를 꽂은 상황판', hintEn: 'A board pinned with maps and notes' },
  { out: { furn: 'jugcluster' }, bp: 'jugcluster', cost: { material: 2 }, hint: '물·연료를 담은 통 무더기', hintEn: 'Clustered jugs of water and fuel' },
  { out: { furn: 'chair' }, cost: { material: 2 }, hint: '나무 의자', hintEn: 'Wooden chair' },
  { out: { furn: 'candle' }, cost: { material: 1, candle: 1 }, hint: '캔들 스툴 (양초 격일)', hintEn: 'Candle stool (candle every 2 days)' },
  { out: { furn: 'teatable' }, cost: { material: 2, cloth: 1 }, hint: '낮은 찻상 — 따뜻한 한 잔', hintEn: 'A low tea table — a warm cup' },
  { out: { furn: 'rug' }, cost: { cloth: 3 }, hint: '천을 엮은 러그', hintEn: 'A woven-cloth rug' },
  { out: { furn: 'plant' }, cost: { water: 2, material: 1 }, hint: '화분에 심은 초록', hintEn: 'Greenery in a pot' },
  { out: { furn: 'table' }, cost: { material: 3 }, hint: '식탁', hintEn: 'Dining table' },
  { out: { furn: 'dresser' }, cost: { material: 3, cloth: 1 }, hint: '서랍장', hintEn: 'Dresser' },
  { out: { furn: 'lantern' }, cost: { parts: 1, material: 1, candle: 2 }, hint: '걸이형 랜턴 (양초 연료)', hintEn: 'Hanging lantern (candle fuel)' },
  { out: { furn: 'bed' }, cost: { cloth: 3, material: 2 }, hint: '천 + 프레임 → 침대', hintEn: 'Cloth + frame → bed' },
  { out: { furn: 'bookshelf' }, cost: { material: 4 }, hint: '책장', hintEn: 'Bookshelf' },
  { out: { furn: 'sofa' }, cost: { cloth: 4, material: 2 }, hint: '패브릭 소파', hintEn: 'Fabric sofa' },
  { out: { furn: 'lamp' }, cost: { parts: 2, battery: 1 }, hint: '부품 조립 조명 (배터리 1/일)', hintEn: 'Part-built lamp (battery 1/day)' },
  // #189 P4: 초희귀 도면 게이트 — 선명·안정·컬러(젤 틴트)의 LED. 화기 대비 표현 스펙트럼의 끝.
  { out: { furn: 'ledbar' }, bp: 'ledbar', cost: { parts: 3, battery: 2 }, hint: 'LED 라이트 바 — 폐허의 마지막 신문물 (배터리 1/일)', hintEn: 'LED light bar — the ruins\' last piece of new tech (battery 1/day)' },
  { out: { furn: 'clock' }, cost: { parts: 2, material: 2 }, hint: '괘종시계 — 시간이 흐르는 소리', hintEn: 'Grandfather clock — the sound of passing time' },
  { out: { furn: 'radio' }, cost: { parts: 3, battery: 1 }, hint: '라디오 (날씨 예보)', hintEn: 'Radio (weather forecast)' },
  { out: { furn: 'stove' }, cost: { parts: 3, material: 3 }, hint: '장작 난로 — 최고의 온기 (연료 1/일)', hintEn: 'Wood stove — the best warmth (fuel 1/day)' },
  { out: { furn: 'purifier' }, cost: { parts: 4, material: 2 }, hint: '매일 물 +1 (전력 필요)', hintEn: 'Water +1 daily (needs power)' },
  { out: { furn: 'generator' }, cost: { parts: 5, material: 3 }, hint: '배터리 소비 무료화 (연료 필요)', hintEn: 'Free battery use (needs fuel)' },
  { out: { furn: 'fridge' }, cost: { parts: 4, material: 2, battery: 1 }, hint: '음식 부패 방지 (전력 필요)', hintEn: 'Prevents food spoilage (needs power)' },
  // Phase B 고급 제작 (후반 인플레 싱크) — 희귀부품(parts) 고비용 사용처
  { out: { furn: 'autopurifier' }, cost: { parts: 6, material: 3, battery: 1 }, hint: '매일 물 +2 (배터리 1/일)', hintEn: 'Water +2 daily (battery 1/day)' },
  { out: { furn: 'heater' }, cost: { parts: 5, material: 3, cloth: 2 }, hint: '한파 방어 + 겨울 쾌적 (연료 1/일)', hintEn: 'Cold-snap defense + winter comfort (fuel 1/day)' },
  // 1.1 염장 — 신선식품 2 + 소금 1 → 보존식 2. 냉장고 없는 초반의 부패 카운터(여름 대비).
  { out: { res: 'canned', n: BAL.harbor.saltCureOut }, cost: { food: BAL.harbor.saltCureFood, salt: BAL.harbor.saltCureSalt }, hint: '소금으로 절인 보존식 — 여름 부패를 이긴다', hintEn: 'Salt-cured preserves — beats summer spoilage' },
  // #76 사치 가구 — 책(지식)을 재료로. 후반 잉여가 흘러든 책의 사용처(사치 건축 싱크). 응접실 세트.
  { out: { furn: 'globe' }, cost: { book: 3, material: 2 }, hint: '책으로 채운 지구본 — 가 보지 못한 곳들', hintEn: 'A globe filled by books — places never seen' },
  { out: { furn: 'candelabra' }, cost: { book: 2, material: 1, candle: 2 }, hint: '가지 촛대 — 사치스러운 불빛 (양초 1/일)', hintEn: 'A branched candelabra — an extravagant light (candle 1/day)' },
  { out: { furn: 'phonograph' }, cost: { book: 4, parts: 2, material: 1 }, hint: '축음기 — 폐허에 음악을', hintEn: 'A phonograph — music for the ruins' },
  // #86④ 의류 — 만들면 옷장(state.outfits)에 영구 추가, 착용은 옷장에서. 염색 재료로 개성(소금/연료=숯).
  { out: { outfit: 'navy' }, cost: { cloth: 3 }, hint: '옷장에 추가 — 짙은 밤바다색', hintEn: 'Added to wardrobe — deep sea navy' },
  { out: { outfit: 'wine' }, cost: { cloth: 3, salt: 1 }, hint: '옷장에 추가 — 소금 매염 와인빛', hintEn: 'Added to wardrobe — salt-mordant wine' },
  { out: { outfit: 'forest' }, cost: { cloth: 2, material: 1 }, hint: '옷장에 추가 — 수풀 위장색', hintEn: 'Added to wardrobe — thicket camo' },
  { out: { outfit: 'cream' }, cost: { cloth: 4 }, hint: '옷장에 추가 — 밝은 생지 그대로', hintEn: 'Added to wardrobe — undyed cream' },
  { out: { outfit: 'charcoal' }, cost: { cloth: 3, fuel: 1 }, hint: '옷장에 추가 — 숯검정 물들임', hintEn: 'Added to wardrobe — charcoal-dyed' },
  // 2.0-(e) 동부 시그니처 복장 — 도면(bp)은 해당 동부 지역에서만 드랍(DDD-4 문법, balance.blueprint.regionItems)
  { out: { outfit: 'customsvest' }, bp: 'outfit_customsvest', cost: { cloth: 3, material: 1 }, hint: '옷장에 추가 — 세관 검문대의 방수 우비', hintEn: 'Added to wardrobe — a customs checkpoint slicker' },
  { out: { outfit: 'riggerjacket' }, bp: 'outfit_riggerjacket', cost: { cloth: 3, parts: 1 }, hint: '옷장에 추가 — 현수교 정비공의 작업 재킷', hintEn: 'Added to wardrobe — a bridge rigger\'s work jacket' },
  { out: { outfit: 'stationcoat' }, bp: 'outfit_stationcoat', cost: { cloth: 4 }, hint: '옷장에 추가 — 중앙역 역무원의 정복 코트', hintEn: 'Added to wardrobe — a stationmaster\'s uniform coat' },
  { out: { outfit: 'towncoat' }, bp: 'outfit_towncoat', cost: { cloth: 4, salt: 1 }, hint: '옷장에 추가 — 백화점 진열장의 마지막 롱코트', hintEn: 'Added to wardrobe — the last longcoat from a department store window' },
  // 스타일 복장 4종 — 실루엣이 바뀐다(후드/패딩/판초/조끼). 색 복장과 같은 무도면 제작 채널.
  { out: { outfit: 'hoodie' }, cost: { cloth: 4 }, hint: '옷장에 추가 — 후드를 눌러쓴 실루엣', hintEn: 'Added to wardrobe — a hood-up silhouette' },
  { out: { outfit: 'puffer' }, cost: { cloth: 5 }, hint: '옷장에 추가 — 누빔 충전재 빵빵한 점퍼', hintEn: 'Added to wardrobe — a quilted, puffed-up jacket' },
  { out: { outfit: 'poncho' }, cost: { cloth: 4, material: 1 }, hint: '옷장에 추가 — 담요를 두른 듯한 판초', hintEn: 'Added to wardrobe — a blanket-like poncho' },
  { out: { outfit: 'vest' }, cost: { cloth: 3, material: 1 }, hint: '옷장에 추가 — 팔이 가벼운 작업 조끼', hintEn: 'Added to wardrobe — a work vest, arms free' },
  // DDD-4 지역 시그니처 (REWARD-LOOP ② 2차): bp = 도면 게이트 — 그 지역 탐험에서 도면을 주워야 목록에 뜬다.
  { out: { furn: 'barrelfire' }, bp: 'barrelfire', cost: { material: 2, parts: 1, fuel: 1 }, hint: '슬럼의 밤 — 드럼통에 피운 불', hintEn: "The slum's night — a fire in a drum" },
  { out: { furn: 'graffiti' }, bp: 'graffiti', cost: { material: 1, cloth: 1 }, hint: '뜯어온 벽의 목소리', hintEn: 'A wall torn loose, still shouting' },
  { out: { furn: 'skis' }, bp: 'skis', cost: { material: 2, cloth: 1 }, hint: '눈 좋던 시절의 한 쌍', hintEn: 'A pair from the good snow years' },
  { out: { furn: 'skipoles' }, bp: 'skipoles', cost: { parts: 1, material: 1 }, hint: '스키 폴대 — 벽에 기대 두면 그림이 된다', hintEn: 'Ski poles — leaned on a wall, they become a picture' },
  { out: { furn: 'snowboard' }, bp: 'snowboard', cost: { material: 2, parts: 1 }, hint: '슬로프가 사라진 보드', hintEn: 'A board that outlived its slopes' },
  { out: { furn: 'neonvip' }, bp: 'neonvip', cost: { parts: 3, battery: 1 }, hint: '도심의 밤 한 조각 — VIP ZONE', hintEn: 'A shard of the city night — VIP ZONE' },
  { out: { furn: 'neonair' }, bp: 'neonair', cost: { parts: 3, battery: 1 }, hint: '죽은 방송국의 불빛 — ON AIR', hintEn: "A dead station's light — ON AIR" },
  { out: { furn: 'suit' }, bp: 'suit', cost: { cloth: 3, parts: 1 }, hint: '폐허 이전의 출근길', hintEn: 'A commute from before the ruin' },
];
