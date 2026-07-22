/* ============================================================
   data/achs.js — 업적 정의 데이터 (#73 Tier4: game.js ACHS 분리)
   ------------------------------------------------------------
   원칙: 순수 데이터(이름·아이콘·설명·quiet/hidden 플래그)만 — 달성 판정(chk)은
   state·comfortDetail 등 게임 스코프가 필요해 game.js ACH_CHECKS에 잔류,
   부팅 시 id로 병합한다(SHELTER_META + buildRoom 병합 선례).
   Steam 매핑·세이브(state.achs)는 id 기준 — 이동으로 불변.
   출처: game.js ACHS (원본 그대로, chk만 분리).
   ============================================================ */
export const ACH_DEFS = [
  { id: 'first',     icon: '', name: '첫 발걸음',        nameEn: 'First Steps',        desc: '첫 탐험 성공',                descEn: 'First successful expedition' },
  { id: 'exp10',     icon: '', name: '베테랑 스캐빈저',  nameEn: 'Veteran Scavenger',  desc: '탐험 성공 10회',              descEn: '10 successful expeditions' },
  { id: 'exp30',     icon: '', name: '폐허의 주인',      nameEn: 'Lord of the Ruins',  desc: '탐험 성공 30회',              descEn: '30 successful expeditions' },
  { id: 'craft5',    icon: '', name: '손재주',           nameEn: 'Handy',              desc: '제작 5회',                    descEn: 'Craft 5 times' },
  { id: 'craft20',   icon: '', name: '폐허의 장인',      nameEn: 'Ruins Artisan',      desc: '제작 20회',                   descEn: 'Craft 20 times' },
  { id: 'comfort90', icon: '', name: '완벽한 안식처',    nameEn: 'Perfect Refuge',     desc: '쾌적함 90 달성',              descEn: 'Reach comfort 90' },
  { id: 'settled8',  icon: '', name: '정든 집',          nameEn: 'Settled Home',       desc: '한 거처에 8일 연속 거주',     descEn: 'Live 8 days straight in one shelter' },
  { id: 'renov3',    icon: '', name: '개척자',           nameEn: 'Pioneer',            desc: '거처 3곳 정비',               descEn: 'Refit 3 shelters' },
  { id: 'renovAll',  icon: '', name: '모든 곳이 집',     nameEn: 'Everywhere Is Home', desc: '거처 9곳 전부 정비',          descEn: 'Refit all 9 shelters' },
  { id: 'mods3',     icon: '', name: '개조 기술자',      nameEn: 'Modder',             desc: '거처 개조 3개 설치',          descEn: 'Install 3 shelter mods' },
  { id: 'winter',    icon: '', name: '첫 겨울을 넘다',   nameEn: 'Past the First Winter', desc: 'Day 48 도달 (사계절 생존)', descEn: 'Reach Day 48 (survive all seasons)' },
  { id: 'nine_winters', icon: '', name: '아홉 번째 겨울', nameEn: 'Nine Winters', desc: '아홉 번의 겨울을 넘기다', descEn: 'Weather nine winters' },
  { id: 'col21',     icon: '', name: '수집가',           nameEn: 'Collector',          desc: '도감 25% (가구 색상 21종)',   descEn: 'Collection 25% (21 furniture colors)' },
  { id: 'col42',     icon: '', name: '큐레이터',         nameEn: 'Curator',            desc: '도감 50%',                    descEn: 'Collection 50%' },
  { id: 'colAll',    icon: '', name: '폐허의 박물관장',  nameEn: 'Museum Keeper of the Ruins', desc: '도감 100% (84색상)',   descEn: 'Collection 100% (84 colors)' },
  { id: 'cat',       icon: '', name: '고양이 집사',      nameEn: 'Cat Servant',        desc: '길고양이를 가족으로 맞이하다', descEn: 'Welcome a stray cat as family' },
  // #170 REV3: Day 10000 폐지 — 스포일러 없는 문안으로 완화. chk는 탈출 성립(구세이브 endingSeen 호환).
  { id: 'ending',    icon: '', name: '폐허 너머로',      nameEn: 'Beyond the Ruins',   desc: '박사와 함께, 폐허 너머로',     descEn: 'With the doctor, beyond the ruins' },
  // 암호 업적 (디렉터 승인 2026-07-10, 메트로 2033 오마주 문법): 내용은 안 보이고 존재만 보인다 —
  //   글로벌 달성률이 커뮤니티 고고학을 유도. quiet=무음 해금(침묵 시퀀스의 무기록 톤 보존), hidden=미해금 시 ???.
  { id: 'silence',   icon: '▪', name: '침묵',             nameEn: 'Silence',            desc: '…',                            descEn: '…',  quiet: true, hidden: true },
];
