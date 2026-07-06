# game.js 모듈화 리팩토링 로그 (#73)

> **한 줄 요약**: 11,481줄 단일 파일(`game.js`)을, 회귀 테스트 그물을 안전망 삼아 한 번에 하나씩
> 동작 보존으로 `src/core/` 모듈로 쪼개는 중. 매 증분 `npm test` 16/16 통과 후 작은 커밋.
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
│  └─ shelter.js  · hasMod                                              (← state)
├─ data/          ← 정적 콘텐츠 테이블 (기존): balance, items, furniture, world, lore, events, projects, wildlife, decotex
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

`game.js`: **11,481 → 11,334줄** + `core/` 5개 모듈. *(줄 수보다 "경계가 생긴 것"이 본질 — 기반 공유 상태·프리미티브가 렌더에서 분리돼 독립적으로 테스트된다.)*

---

## 5. 발견 (그물이 잡은 것 — 상세 `tests/FINDINGS.md`)

- **F1 (⚠️ 재현성 결함)**: `simDays`(밸런스 오라클)가 **비-헤르메틱** — 같은 dist·시드인데 호출 하네스에 따라 노말 중반 수치가 흔들림(105 vs 126). `simReset`이 weather 등 모듈 상태를 안 리셋하는 게 원인 추정. Day432 캡·하드·하드코어 결론은 안정. **리팩토링 과제**: `simDays`를 헤르메틱하게 → 밸런스 측정 완전 신뢰 가능.
- **F2 (✅ 안전 확인)**: #76 신규 세이브 필드(book/bookProgress/demoEnded)가 구세이브에서 안전하게 마이그레이션됨 — 유실 없음(그물이 증명).

---

## 6. 다음 (로드맵 — CTO 방향)

1. **SHELTERS 데이터/빌드 분리** ⟵ *지금 진행*. `SHELTERS`(game.js const)는 데이터 필드(name/perk/baseComfort/hearth/cold…)와 `build()`(THREE 렌더 함수)가 섞여 있어, 한파·쾌적·게이지가 `SHELTERS[id].hearth`를 참조하는데 렌더 결합 때문에 코어로 못 가져옴. **데이터 필드를 `data/shelters.js`로, build 함수는 game.js에** 두는 분리가 그 세 추출을 한 번에 푼다.
2. **한파(`core/coldsnap.js`)** — coldDefenseLevel/coldSnapActive/coldSnapNetSeverity. SHELTERS 분리 후 가능.
3. **쾌적(`core/comfort.js`)** — comfortDetail/comfortBreakdown. 한파에 의존.
4. **게이지(`core/gauges.js`)** — decayGauges 등.
5. **세이브(`core/save.js`)** — doSaveNow/loadSave/마이그레이션. **84개 손수 가드를 `ver` + 마이그레이션 함수 테이블로** 교체(유지보수 최대 난제). loadShelter(렌더)는 주입 훅으로.

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
