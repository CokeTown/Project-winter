/* ============================================================
   projects.js — Nine Winters 대형 프로젝트 테이블 (1.1 신규, ARC-02)
   ------------------------------------------------------------
   목적: "여러 날에 걸쳐 자재를 붓는 장기 목표"를 데이터로만 정의한다.
         엔진(game.js)은 이 테이블만 읽고 stage/invested를 굴린다.
         1.2~1.4 확장은 여기에 항목을 추가하는 것만으로 재사용한다(엔진 무수정).
   원칙: 이 파일은 의존성 0의 순수 데이터다 (import 금지 — 순환 방지).
         수치(자재량·투입 횟수)는 balance.js의 BAL.projects를 참조한다.
         단, 여기서는 BAL을 import하지 않고 "키 이름"만 문자열로 들고 있다가
         game.js가 런타임에 BAL.projects[costKey]로 해석한다(순수 데이터 유지).

   ── 스키마 (한 프로젝트 = 여러 stage의 배열) ──────────────────
   PROJECTS[id] = {
     id,                     // 고유 id. i18n 키 규약: proj.<id>.*  (name/desc/stage.N.* 등)
     when: { ... },          // 노출 조건. EVENTS.when 과 동일 스키마를 game.js projectAvailable()가 해석.
                             //   지원: shelters[], districts[], seasons[], minDay, needsMod, needsFlag(state 불리언 키)
     site: 'stairRubble',    // 현장 오브젝트 키. game.js SHELTER가 stage에 따라 3D 표현을 교체.
     icon: '🪨',             // UI 카드/수첩 아이콘 (이모지 — im-not-strange-ai 이모지 예외)
     memoirKey: 'proj.<id>.memoir', // 완공 시 수첩 "그 해의 공사" 자동 기록 i18n 키
     stages: [               // 순서대로 진행. 마지막 stage 완료 = 프로젝트 완공.
       {
         costKey: 'stairRubble1',  // BAL.projects[costKey] = { res: n } 투입 1회당 지불 자재
         need: 3,                  // 이 stage를 완료하는 데 필요한 투입 횟수 (invested가 need에 도달하면 다음 stage)
         siteStage: 1,             // 이 stage "진행 중"일 때 현장 오브젝트 단계 (site 키의 어느 표현을 쓸지)
         effectKey: null,          // 이 stage 완료 시 적용할 효과 키 (game.js applyProjectEffect가 해석). null=무효과
       },
       ...
     ],
     doneSiteStage: 3,       // 전 stage 완료 후 현장 오브젝트 최종 단계
   }

   ── 진행 규칙 (game.js 엔진) ──────────────────────────────────
   state.projects[id] = { stage: 0, invested: 0 }
     - "작업" 행동 1회: 현재 stage의 costKey 자재를 지불 → invested++
     - invested >= stages[stage].need 이면: stage 완료
         · effectKey 적용 (applyProjectEffect)
         · 현장 오브젝트 갱신 (다음 stage의 siteStage 또는 doneSiteStage)
         · stage++, invested=0
     - stage >= stages.length 이면 완공 → memoirKey 수첩 기록 + effect 최종화
   ============================================================ */
export const PROJECTS = {
  /* ── 파일럿 1종: 벙커 지하 계단 아래 "막힌 통로 정리" (1.4 복선) ──
     엔진 검증용으로 작고 안전하게. 효과는 코스메틱(돌무더기→정리된 통로) + 수첩 기록만.
     노출 조건: 벙커 거주 + 뒷문(전실+하강 계단) 이미 개방(bunkerBackdoor). 계단 아래가 이 공사의 현장이다.
     2단계: 큰 돌 걷어내기(돌무더기 절반) → 잔해 쓸어내기(통로 개방). */
  clearPassage: {
    id: 'clearPassage',
    when: { shelters: ['bunker'], needsFlag: 'bunkerBackdoor' },
    site: 'stairRubble',
    icon: '🪨',
    memoirKey: 'proj.clearPassage.memoir',
    stages: [
      { costKey: 'clearPassage1', need: 3, siteStage: 1, effectKey: null },
      { costKey: 'clearPassage2', need: 2, siteStage: 2, effectKey: 'clearPassage.done' },
    ],
    doneSiteStage: 3,
  },

  /* ── 1.1 「얼어붙은 항구」 대형 프로젝트: 방파제 오두막 ──
     항구 셸터(예인선/관제탑) 거주 시 노출. 잔해정리→뼈대→마감 3단계.
     완공 효과(harbor.breakwater.done): 항구 파밍 시간 -25% + 얼음낚시 스팟 +1.
     효과 판정은 상태 플래그(state.breakwaterHut)로 — game.js applyProjectEffect가 세운다.
     현장 오브젝트(site='breakwaterHut')는 항구 셸터 buildRoom에서 siteStage로 표현. */
  breakwaterHut: {
    id: 'breakwaterHut',
    when: { shelters: ['tugboat', 'controltower'] },
    site: 'breakwaterHut',
    icon: '🛖',
    memoirKey: 'proj.breakwaterHut.memoir',
    stages: [
      { costKey: 'breakwater1', need: 4, siteStage: 1, effectKey: null },              // 잔해 정리
      { costKey: 'breakwater2', need: 3, siteStage: 2, effectKey: null },              // 뼈대 세우기
      { costKey: 'breakwater3', need: 3, siteStage: 3, effectKey: 'harbor.breakwater.done' }, // 마감 → 효과 발동
    ],
    doneSiteStage: 4,
  },

  /* ── 1.2 「지하 노선도」 선로 복구 ×3구간 (구간별 PROJECTS 항목 1개) ──
     지하철 셸터가 허브로 승격(state.subwayHub)한 뒤에만 노출. 각 구간은 잔해제거→침목→개통 3단계.
     개통 효과(subway.openSegN): 연결 지역 탐험 시간 -50% + 겨울 폭설 봉쇄 무시(지하니까).
       · seg1(subRail1) → residential  (가까운 첫 구간, 가장 값쌈)
       · seg2(subRail2) → commercial
       · seg3(subRail3) → industrial   (가장 먼 구간, 가장 비쌈)
     효과 판정은 상태 플래그(state.subwayOpen[regionId]=true)로 — applyProjectEffect가 세운다.
     현장 오브젝트(site='railSegment')는 지하철 셸터 buildEnv 선로 위에 siteStage로 표현.
     엔진 규칙 무수정 계약: 이 테이블 추가 + applyProjectEffect switch에 case 추가(예고된 확장 지점)만. */
  subRail1: {
    id: 'subRail1',
    when: { shelters: ['subway'], needsFlag: 'subwayHub' },
    site: 'railSegment',
    icon: '🚈',
    memoirKey: 'proj.subRail1.memoir',
    stages: [
      { costKey: 'subRail1a', need: 3, siteStage: 1, effectKey: null },                 // 잔해 제거
      { costKey: 'subRail1b', need: 3, siteStage: 2, effectKey: null },                 // 침목 깔기
      { costKey: 'subRail1c', need: 2, siteStage: 3, effectKey: 'subway.openSeg1' },    // 개통 → 효과
    ],
    doneSiteStage: 4,
  },
  subRail2: {
    id: 'subRail2',
    when: { shelters: ['subway'], needsFlag: 'subwayHub' },
    site: 'railSegment',
    icon: '🚈',
    memoirKey: 'proj.subRail2.memoir',
    stages: [
      { costKey: 'subRail2a', need: 4, siteStage: 1, effectKey: null },
      { costKey: 'subRail2b', need: 3, siteStage: 2, effectKey: null },
      { costKey: 'subRail2c', need: 3, siteStage: 3, effectKey: 'subway.openSeg2' },
    ],
    doneSiteStage: 4,
  },
  subRail3: {
    id: 'subRail3',
    when: { shelters: ['subway'], needsFlag: 'subwayHub' },
    site: 'railSegment',
    icon: '🚈',
    memoirKey: 'proj.subRail3.memoir',
    stages: [
      { costKey: 'subRail3a', need: 4, siteStage: 1, effectKey: null },
      { costKey: 'subRail3b', need: 4, siteStage: 2, effectKey: null },
      { costKey: 'subRail3c', need: 3, siteStage: 3, effectKey: 'subway.openSeg3' },
    ],
    doneSiteStage: 4,
  },

  /* ── 1.3 「고요한 고원」 케이블카 복구 ──
     스키 로지 거주 시 노출. 잔해정리→지주→케이블→완성 (site='cablecar', 로지 buildRoom에서 siteStage 표현).
     완공 효과(resort.accessTime): 고원(리조트) 접근/탐험 시간 단축(state.cablecarDone 플래그 → expDuration).
     고원은 겨울 접근성이 나쁜 대신 보상이 좋다는 결 — 케이블카가 그 접근 비용을 "건설로 산다"(선로 복구와 캐논 공유). */
  cablecar: {
    id: 'cablecar',
    when: { shelters: ['lodge'] },
    site: 'cablecar',
    icon: '🚡',
    memoirKey: 'proj.cablecar.memoir',
    stages: [
      { costKey: 'cablecar1', need: 3, siteStage: 1, effectKey: null },              // 잔해 정리 → 지주
      { costKey: 'cablecar2', need: 3, siteStage: 2, effectKey: null },              // 케이블 가설
      { costKey: 'cablecar3', need: 3, siteStage: 3, effectKey: 'resort.accessTime' }, // 곤돌라 복구 → 효과
    ],
    doneSiteStage: 4,
  },

  /* ── 1.3 「고요한 고원」 관측소 ──
     스키 로지 거주 시 노출. 기초→돔 골조→완성 (site='observatory', 로지 buildRoom에서 siteStage 표현).
     완공 효과(lodge.nightSky): 맑은 밤 밤하늘 이벤트 개방(유성우/오로라) → 수첩 "스케치" 수집(도감/기록 문법).
     감상 보상이지 숫자 보상 아님(대형 프로젝트 원칙 준수). 1.4 복선: "저건 별이 아니다". */
  observatory: {
    id: 'observatory',
    when: { shelters: ['lodge'] },
    site: 'observatory',
    icon: '🔭',
    memoirKey: 'proj.observatory.memoir',
    stages: [
      { costKey: 'observatory1', need: 3, siteStage: 1, effectKey: null },              // 기초
      { costKey: 'observatory2', need: 3, siteStage: 2, effectKey: null },              // 돔 골조
      { costKey: 'observatory3', need: 3, siteStage: 3, effectKey: 'lodge.nightSky' },  // 완성 → 밤하늘 개방
    ],
    doneSiteStage: 4,
  },

  /* ── 1.4 「금지 구역」 무전 기지 복구 (최종 대형 프로젝트) ──
     노출 조건: 금지 구역(research) 구역 접근 후 — 방호복(hazmat)이 있어야 현장에 닿는다.
       when.needsFlag='hazmatDone' → 방호복을 만든 적 있으면 현장 노출(연구동 폐허의 무전탑이 공사 현장).
     안테나→송신기→전원 3단계. 완공 효과(radio.broadcastAction): 송출 행동 개방(state.radioBaseDone).
     site='radioBase' (3단계 오브젝트) — 연구동/검문소 관련 씬이 아니라, 기지 자체는 벙커/로지처럼
       현재 거주 셸터의 buildRoom 분기가 아니라 '기록/지도' UI 상의 상태로 표현한다(지역이 셸터가 아님).
       → 현장 3D는 최소: 무전 기지는 지도·행동 UI 중심 콘텐츠이므로 site 오브젝트는 폴백(생략) 허용.
     엔진 규칙 무수정 계약: 이 테이블 추가 + applyProjectEffect switch에 case 1개(예고된 확장 지점)만. */
  radioBase: {
    id: 'radioBase',
    when: { needsFlag: 'hazmatDone' }, // 방호복 제작 이력 = 금지 구역에 닿았다는 증거 → 무전 기지 공사 개방
    site: 'radioBase',
    icon: '📡',
    memoirKey: 'proj.radioBase.memoir',
    stages: [
      { costKey: 'radioAntenna1', need: 3, siteStage: 1, effectKey: null },                 // 안테나
      { costKey: 'radioTx1', need: 3, siteStage: 2, effectKey: null },                       // 송신기
      { costKey: 'radioPower1', need: 3, siteStage: 3, effectKey: 'radio.broadcastAction' }, // 전원 → 송출 개방
    ],
    doneSiteStage: 4,
  },
};

/* ── 1.2~1.4 확장 수용성 증명 (설계 노트, 이번 배치 미구현) ────────
   아래는 "테이블 추가만으로" 각 확장 대형 프로젝트가 이 스키마에 앉는다는 매핑이다.
   실제 항목은 각 확장 배치에서 PROJECTS에 추가한다(엔진·UI·현장 오브젝트 규격 재사용).

   1.1 방파제 오두막:
     when:{ districts:['harbor'] }, site:'breakwaterHut', stages:[잔해정리→뼈대→마감],
     effectKey:'harbor.farmSpeed'(파밍 -25%)·'harbor.icefishSpot'(+1). doneSiteStage=완성 오두막.

   1.2 선로 복구 (×3구간): 구간마다 PROJECTS 항목 1개(sub1/sub2/sub3).
     when:{ shelters:['subway'], needsFlag:'subwayHub' }, site:'railSegment',
     stages:[잔해제거→침목→개통], effectKey:'subway.openSegN'(탐험시간 -50%·폭설 봉쇄 무시).

   1.3 관측소 / 케이블카: when:{ shelters:['lodge'] } / { districts:['resort'] },
     site:'observatory'/'cablecar', stages:[기초→구조→완성],
     effectKey:'lodge.nightSky'(밤하늘 이벤트 개방) / 'resort.accessTime'(접근 단축).

   1.4 무전 기지 (최종): when:{ districts:['research'], needsFlag:'hazmat' },
     site:'radioBase'(3단계 오브젝트), stages:[안테나→송신기→전원],
     effectKey:'radio.broadcastAction'(송출 행동 개방 → 지도 불빛 오버레이).

   → 신규로 필요한 것은 전부 "데이터"다: PROJECTS 항목, BAL.projects.<costKey>,
      proj.<id>.* i18n 페어, site 키에 대응하는 3D 표현(SHELTER buildRoom 분기 1곳).
      엔진의 invest/complete/migration 로직과 UI 카드(prep-row+req-chip)는 손대지 않는다. */
