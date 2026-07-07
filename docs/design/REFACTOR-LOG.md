# game.js 모듈화 리팩토링 로그 (#73)

> **한 줄 요약**: 11,481줄 단일 파일(`game.js`)을, 회귀 테스트 그물을 안전망 삼아 한 번에 하나씩
> 동작 보존으로 `src/core/` 모듈로 쪼개는 중. 매 증분 그물(현 **43/43**, 경제 4모드 밴드+해시 가드) 통과 후 작은 커밋. 현재 11,083줄 + core 11모듈.
>
> 역할: **디렉터**(제품/방향) · **CTO=Fable/Claude**(기술 방향·실행). 착수 2026-07-06, 10월 Next Fest 전까지 지속.

---

## 1. 왜 (배경)

적대적 코드 리뷰(2026-07-06)에서 확정된 진단:

- **`game.js` = 11,481줄** (전체 소스의 64%), 전역 `state.` 참조 **919개**, **자동화 테스트 0개**.
- 결과: 모든 변경이 원거리 작용(action-at-a-distance)이고 회귀를 잡을 그물이 없어 — **디렉터가 사실상 QA를 겸함**(T자 트림·부유물·빛샘 등 실기기 신고가 반복). 이게 근본 병목.
- 게임 자체는 잘 돎(웹/Electron/Android 출시, 세이브, PWA). 부실한 건 "**집을 안전하게 뜯어고칠 발판**"(테스트·타입·모듈 경계)이지 "지어진 집"이 아님.

**결론(디렉터)**: 기술 부채 리팩토링. CTO가 방향을 잡고 거침없이 진행.

---

## 2. 원칙 (불변 — 매 증분 준수)

1. **테스트 그물 먼저.** 테스트 0개 모놀리스를 그냥 쪼개면 조용히 부러진다 — 부러진 걸 잡을 게 없으니까. 그래서 코드 이동 **전에** 현재 동작을 핀으로 박는 회귀 그물부터 세웠다(`tests/`, `npm test`).
2. **증분·동작 보존.** 순수 모듈 하나 추출 → `vite build --mode electron` → `npm test`(16/16 green) → **작은 커밋**. 각 단계 롤백 가능.
3. **단방향 의존(순환 금지).** `core/` 모듈은 절대 `game.js`를 import하지 않는다. `game.js`가 `core/`를 import한다. `core/` 내부도 리프→상위 단방향(state ← mode ← economy 식).
4. **리프부터.** 의존이 적은 것(state·data만 참조)부터 추출. 렌더(THREE)·DOM·i18n 결합이 큰 것은 최후.
5. **표시(UI)와 로직 분리.** 같은 관심사라도 `resIcon`/`LName` 같은 렌더·i18n 헬퍼를 쓰는 함수(costLabel/reqChip)는 `game.js`에 남기고, 순수 계산만 `core/`로.

---

## 3. 아키텍처 (현재 상태)

```
src/
├─ core/          ← [신설] 공유 상태 + 순수 로직 (렌더 무관, 테스트 가능)
│  ├─ state.js    · state, DEFAULT_STATE, opts, OPTS_DEFAULT, items   (import 0 = 키스톤)
│  ├─ mode.js     · isHard/isHardcore/isZen/isWallpaper/rescueEligible  (← state)
│  ├─ season.js   · SEASONS, SEASON_DAYS, seasonOf/seasonDay/seasonIndex (← state, balance)
│  ├─ economy.js  · resAdd/resConsume/resHasAll/resConsumeAll/hasAnyFood/consumeAnyFood/accWinterFuel (← state, mode, season)
│  ├─ shelter.js  · hasMod                                              (← state)
│  ├─ coldsnap.js · coldDefenseLevel/coldSnapActive/coldSnapNetSeverity (← state, season, shelter, data)
│  ├─ comfort.js  · comfortDetail/comfortLevel/comfortExpBonus/recoveryMult/themeSetActive/activeThemeSets/bunkerComfortBonus (← state, season, shelter, coldsnap, data; weather.type 주입)
│  ├─ gauges.js   · decayGauges/isExhausted                             (← state, mode, season, coldsnap, economy, data)
│  └─ save.js     · migrateLoadedState (버전 마이그레이션 + 신규필드 기본값 ~84가드)  (← state, season, data)
├─ data/          ← 정적 콘텐츠 테이블 (기존): balance, items, furniture, world, lore, events, projects, wildlife, decotex
│  └─ shelters.js · [신설] SHELTER_META (12셸터 데이터 필드) — game.js가 build 함수와 병합
├─ systems/       ← 서브시스템 팩토리 (기존): cat, wildlife, avatar  — game.js가 컨텍스트 주입(state를 직접 import 안 함)
├─ lib/           ← 공용 유틸 (기존): helpers, platform
├─ game.js        ← 나머지: THREE 렌더/셸터 지오메트리/컬링/모달/오케스트레이션 (11,334줄, 계속 축소)
├─ i18n.js, sfx.js, style.css
tests/            ← [신설] 회귀 그물: harness.cjs(오프스크린 Electron) + core.test.cjs(16 어서션) — npm test
```

**핵심 불변식**:
- `state`/`opts`/`items`는 `const`(항상 in-place 변경, `loadSave`도 `Object.assign`) → 모듈 경계를 넘어도 **동일 참조** 유지. 그래서 안전하게 export/import 가능.
- `systems/`는 팩토리(`makeCatSystem(ctx)`)라 `state`를 인자로 받음 → `core`에 의존하지 않음(순환 없음).

---

## 4. 진행 로그 (커밋순, 전부 그물 16/16 green)

| 커밋 | 모듈 | 무엇을 / 왜 |
|---|---|---|
| `23091cb` | `tests/` | **회귀 그물 착수** — 코드 이동 전 안전망. 경제 밴드(전 4모드)·#76 세이브 마이그레이션·i18n 특성화. |
| `d4f65bf` | `core/state.js` | **키스톤** — state/DEFAULT_STATE/opts/OPTS_DEFAULT(순수 리터럴, import 0). 모든 로직 추출의 전제. |
| `d4c43cf` | `core/mode.js` | 난이도 술어(전역 사용). state만 참조. |
| `f187b49` | `core/season.js` | 계절 달력. state+balance만. `accWinterFuel→seasonOf` 체인을 풀어 경제 추출을 가능케 함. |
| `0c12d35` | `core/economy.js` | 자원 연산 6종 + accWinterFuel(fuel 훅). state/mode/season만. |
| `37effc4` | `core/state.js` | items(배치 가구 배열) 합류 → 공유 상태 모듈 완성. |
| `22a5f44` | `core/shelter.js` | hasMod(개조 판정). 한파/쾌적 추출을 여는 조각. |
| `f21fea6`→`a59325d` | `data/shelters.js` | **SHELTERS 데이터/빌드 분리(12/12)**. SHELTER_META로 전 데이터 이관, build 함수만 game.js 잔류. SHELTER_HASH 가드(전 필드 해시)로 무손실 보증. |
| `5ebe3f0` | `core/coldsnap.js` | 한파 술어 3종. hearth를 SHELTER_META에서 읽음(SHELTERS 분리가 열어줌). |
| `f5dc13b` | `core/comfort.js` | 쾌적 점수 산식 + 파생 + 테마세트 판정. i18n 로그·HTML은 표시층이라 잔류. weather.type만 주입 훅으로. |
| `911e638` | `core/gauges.js` | decayGauges(배고픔/갈증 감소 + autoEat) + isExhausted. 결합 0. **← Tier 1 완결** |
| `589d593` | `tests/` (그물 강화) | **세이브 마이그레이션 그물 선(先)강화** — MIG_HASH(정적 기본값 포괄 스냅샷 ~40필드). save 추출 전 "그물 먼저"(세이브=손상 시 복구 불가). |
| `e4221eb` | `core/save.js` | **세이브 마이그레이션 추출(Tier 2)** — migrateLoadedState(버전 v2→v3 + 신규필드 84가드). I/O·오프라인 정산은 game.js 잔류. MIG_HASH 무손실. |
| `6380ed6` | `core/expedition.js` | **탐험 판정 추출(Tier 3)** — districtOf/rateParts/expActualRate. 순수 계산(RNG 없음), 날씨 페널티만 setExpeditionWeather 주입. 정산·출발은 잔류. 그물 43/43 diff-0. |
| `abb6776` | `core/projects.js` | **프로젝트 술어 추출(Tier 3)** — districtRegionOf/projectAvailable/projectRec/projectDone/projectSiteStage. 순수 상태 술어. 투입·3D 현장은 잔류. 그물 43/43 diff-0. |

`game.js`: **11,481 → 11,083줄** + `core/` **11개 모듈** + `data/shelters.js`. *(줄 수보다 "경계가 생긴 것"이 본질 — 한파/쾌적/게이지 로직 + 세이브 마이그레이션(유지보수 최대 난제) + 탐험/프로젝트 술어가 렌더/I/O/RNG에서 분리돼 독립 테스트·수정 가능. 깊이 설계의 "게이지 상호작용"과 "신규 세이브 필드"가 이 위에 안전하게 얹힌다.)*

---

## 5. 발견 (그물이 잡은 것 — 상세 `tests/FINDINGS.md`)

- **F1 (✅ 해결 2026-07-07, 디렉터 감독)**: `simDays`(밸런스 오라클) **비-헤르메틱** 결함 완전 해결. 조사 프로토콜(재현→RNG 계수 계측→인과사슬)으로 **근본 4원인** 색출: ①`simReset`이 모듈 `weather.type` 미리셋(시작 날씨가 sim에 샘, Day30 clear 544 vs storm 435) ②`Object.assign(state,DEFAULT)` 얕은 병합이 비-DEFAULT 키(catTeaserDone 등) 방치 → 완전 클리어(delete+재구성) ③**주범**: `tipOnce`→showTipNote→applyPaperBg가 절차적 종이 텍스처를 `Math.random` **~9600회** 소비·첫-run 모듈 캐시 → 시드 시퀀스 desync(첫 run만 544, 이후 480) ④wildlife `_forceNightPrints` 렌더 부수효과 RNG. ③④는 `_simRunning` 가드(렌더 부수효과는 헤드리스 sim서 금지). **검증**: 연속 3회·시작날씨 3종 Day30/432 완전 동일 + 그물 45/45(헤르메틱 가드 2개 신설). 이제 밸런스를 **정밀값**으로 측정 가능(밴드→near 조임은 튜닝 여지 남겨 보류).
- **F2 (✅ 안전 확인)**: #76 신규 세이브 필드(book/bookProgress/demoEnded)가 구세이브에서 안전하게 마이그레이션됨 — 유실 없음(그물이 증명).
- **F3 (✅ 시스템 그라운딩 QA, 2026-07-07)**: 오프스크린 하네스가 **실접지 QA를 가능케 함**(구 `QA-REPORT.md` v0.9.1의 "프리뷰차단" 한계 극복 — 이제 렌더/로밍/모달/예외를 실런타임에서 실측). **두 스윕 = 26/26 green + 게임 버그 0**.
  - **영속 하네스**: `tests/grounding/` 3종 + `npm run grounding`(또는 `grounding:build`로 빌드 동반). scratchpad 아니라 리포지에 박제 — 디렉터/CTO가 언제든 재실행. 스크린샷은 `%TEMP%/nw-grounding-shots`(휘발).
  - **세션-산출물 스윕(13/13, `tests/grounding/qa-systems.cjs`)**: ①지식 트리 모달 렌더(4갈래×티어1/2/3, 선행 게이팅, 익힘/배우기/선행필요 3상태, 해금 파이프라인 책 차감·중복차단) ②가방 확정 파밍(밴드 diff-0) ③게이트 코스트 모드 스케일(단조성) ④야생동물 로밍(강제스폰 3개체·1.9s Δ25.6 이동·야간발자국 0→7·groundY=-0.75 셸터지면 정확 접지) ⑤sim 60일×4모드 무예외 ⑥예외 0건. + 시각 접지 캡처(지식 모달 4갈래 완전 렌더).
  - **광역-시스템 스윕(13/13, `tests/grounding/qa-broad.cjs`)**: 세션 밖 8시스템 실런타임 — 세이브 왕복 무손실(변조→loadSave 복원 day/wood/book), 날씨 5종+전이(#83), 인카운터 엔진(40draw 전부 유효id·3연속0=REQ-EVT-02), 고양이(async GLB 스폰 폴링→쓰다듬 petHappy↑), 아바타(#86), 탐험 전주기(가방 정산), 엔딩 시퀀스, 예외 0건.
  - **QA-폭 스윕(8/8, `tests/grounding/qa-breadth.cjs`)**: BGM 컨텍스트 전환(ash→storm→clear 키), 퀘스트 체인 7단계 전진→트래커 퇴장(-1), 저널(#journal-screen)·도움말·지도 모달 렌더, 예외 0건.
  - *방법론 주의(재사용 가치)*: 광역·폭 스윕 초기 6 FAIL은 **전부 QA-스크립트 아티팩트**였음(readSlot 반환구조·weatherFx는 함수 아님·**spawnCat은 async GLB라 catSpawning() 폴링 필요**·퀘스트 -1은 600ms setTimeout·저널은 #modal-back이 아닌 자체 #journal-screen 오버레이) — 그라운딩 규율(관측→진단→수정→재실행)대로 스크립트 수정 후 green으로 실증(게임 버그로 오판 안 함). **spawnCat async 폴링·journal-screen 셀렉터는 향후 QA 표준.**

---

## 6. 다음 (로드맵 — CTO 방향)

1. ✅ **SHELTERS 데이터/빌드 분리 — 완료 (12/12)**. `data/shelters.js`(SHELTER_META)에 12셸터 전 데이터 필드, game.js는 `{ ...SHELTER_META[id], buildRoom(){…}, buildEnv(){…} }`로 병합(THREE 렌더만 잔류).
   - 안전망(`13fd2a1`→강화 `5fe3cd6`): SHELTER_HASH 가드 — 각 셸터 **모든 비-함수 필드** deep stable 직렬화 해시. 어느 필드 하나라도 바뀌면 검거.
   - 분리(`f21fea6` container → `a59325d` 나머지 11): 그물 18/18 green + 컨테이너 렌더 그라운딩 확인.
   - → 이제 한파/쾌적/게이지가 `import { SHELTER_META }`로 `.hearth`/`.cold`/`.needsLight` 등을 읽어 core로 추출 가능(다음).
2. ✅ **한파(`core/coldsnap.js`)** — `5ebe3f0`. coldDefenseLevel/coldSnapActive/coldSnapNetSeverity.
3. ✅ **쾌적(`core/comfort.js`)** — `f5dc13b`. comfortDetail + 파생 + 테마세트. i18n comfortBreakdown/Html은 잔류.
4. ✅ **게이지(`core/gauges.js`)** — `911e638`. decayGauges + isExhausted. **← Tier 1 여기까지 완결.**

**Tier 2:**
5. ◑ **세이브(`core/save.js`)** — `e4221eb`. **마이그레이션(84가드) 추출 완료** — 이제 순수 `migrateLoadedState`로 격리 + MIG_HASH 그물 보증. *깊이 설계의 신규 세이브 필드가 이 위에 안전하게 얹힌다(de-risk 완료).*
   - 남은 정제(선택): 평면 84가드를 `ver`별 마이그레이션 함수 테이블로 재구조화 · save I/O(doSaveNow/loadSave/손상복구)를 주입 훅으로 분리. **동작은 이미 격리·검증됨** — 구조 미화라 우선순위 낮음.

**여기까지 = 깊이 작업에 필요한 리팩토링 완료선.** 깊이가 건드릴 로직(한파/쾌적/게이지)이 모듈화·테스트 가능해졌고, 깊이가 추가할 세이브 필드의 마이그레이션이 격리·그물화됨.

**Tier 3 (진행 중):**
- ✅ **탐험 판정(`core/expedition.js`)** — districtOf/rateParts/expActualRate. 순수 계산(RNG 없음), 날씨 페널티만 setExpeditionWeather 주입. 그물 43/43 diff-0(하드코어 RNG 포함). 정산(resolveExpedition)·출발(departExpedition)은 game.js 잔류.
- ✅ **프로젝트 술어(`core/projects.js`)** — districtRegionOf/projectAvailable/projectRec/projectDone/projectSiteStage. 순수 상태 술어(when 게이트/진행/완공/현장단계). 투입(investProject·UI)·3D 현장 렌더는 잔류. 그물 43/43 diff-0.
- ⬜ 날씨 판정·인카운터 선택(drawEvent)·이주/이동·오토플레이/sim·processDay 오케스트레이터.
- ✅ **F1 헤르메틱 sim 해결(2026-07-07, 디렉터 감독)** — simReset 완전 리셋 + 렌더 부수효과(tipOnce·wildlife) `_simRunning` 가드. 근본 4원인(§5 F1). 그물 45/45(헤르메틱 가드 2 신설). **밸런스 측정이 이제 완전 신뢰 가능**(밴드→정밀 near 조임은 튜닝 여지 남겨 선택).
**Tier 4 (10월 이후 롱테일):** 렌더/UI 분해 (`render/`, `ui/` 서브트리).

---

## 7. 이어가는 법 (안전 추출 레시피)

```
1. 옮길 대상의 의존 확인: state/data/코어만 참조? (렌더 THREE·DOM·i18n 결합이면 분리 or 주입 필요)
2. src/core/<name>.js 생성 — import는 core·data만 (game.js import 금지 = 순환 금지)
3. game.js: 원 선언 제거 + 상단에 import 추가
4. npm run test:build   →  RESULT 16/16 ALL GREEN 확인
5. 작은 커밋 (1 모듈 = 1 커밋, 메시지에 "회귀 그물 16/16 green")
```

그물 확장: 새 순수 모듈을 추출할 때마다 그 모듈의 유닛 테스트를 `tests/`에 추가하면, 점차 "오프스크린 Electron 특성화"에서 "플레인 Node 유닛테스트(빠름)"로 옮겨갈 수 있다.
