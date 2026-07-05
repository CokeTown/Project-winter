# PORTING.md — Nine Winters 데이터 이식 지도 (엔지니어링 패스 Phase 1)

> 목적: 웹(Vite/JS) 콘텐츠 데이터를 유니티(C#/Steamworks.NET)로 이식할 때
> **테이블 → ScriptableObject**, **BAL → config**, **i18n → JSON**, **Platform → Steamworks.NET**
> 1:1 매핑을 고정한다. Phase 1(2026-07)에서 순수 콘텐츠 테이블을 `src/data/`로 분리했고,
> 이 문서는 그 결과물의 이식 청사진이다.

## 1. 데이터 파일 목록 (분리 후 현재 `src/data/`)

| 파일 | 내보내기(export) | 성격 | 줄수 | 의존성 |
|------|------------------|------|------|--------|
| `balance.js` | `BAL` | 튜닝 수치(게이지·경제·계절…) | 412 | 없음(순수) |
| `projects.js` | `PROJECTS` | 대형 프로젝트 스테이지 정의 | 208 | 없음(문자열 키로 BAL 간접참조) |
| `furniture.js` | `DEFS` | 가구 12종 정의 + 3D `build(c)` | 548 | THREE, `lib/helpers` |
| `events.js` | `makeEvents(ctx)` | 인카운터 25종(팩토리) | 295 | 없음(game→data 단방향, ctx 주입) |
| `items.js` | `RESOURCES, INJURIES, PREPS, THEME_SETS, CAT_POSES, CAT_PERCH_Y, CRAFTS` | 자원/부상/준비물/제작/테마/고양이 포즈 | 117 | `BAL`(CRAFTS 염장 비용) |
| `world.js` | `DISTRICTS, REGIONS` | 지도 구역·탐험 지역 수치·메타 | 161 | `DEFS`(REGIONS.slum.pool) |
| `lore.js` | `MEMOS, WILLS, MEMO_REGIONS, MEMOS_BY_REGION, MEMOS_SUBWAY, MEMOS_RESORT, MEMOS_RESEARCH, BROADCASTS, SKETCHES` | 서사 텍스트(메모/유서/방송/스케치) | 136 | 없음(순수) |

의존 방향 규칙: **game → data (단방향)**. data끼리는 `balance.js`(의존성 0)와
`furniture.js`(THREE만)에 한해 참조 허용(순환 없음). data는 절대 game.js를 import하지 않는다.

## 2. 테이블 → ScriptableObject 매핑

| JS 테이블 | 유니티 SO 자산 | 키 | 비고 |
|-----------|----------------|----|------|
| `RESOURCES` | `ResourceDef` (SO 배열/딕셔너리) | id(food/canned/…) | name/nameEn/emoji. emoji는 UI 아이콘 필드로 승격 |
| `INJURIES` | `InjuryDef` | id(minor/deep/…) | pen/restH/cure(Dictionary\<string,int\>)/infect |
| `PREPS` | `PrepDef` | id(bottle/…) | cost/eff/bonus(지역별 성공률 가산) |
| `CRAFTS` | `CraftRecipe` (SO 리스트) | 인덱스 | out{res\|furn,n}/cost. **염장 레시피 비용은 `BAL.harbor.salt*` config 참조** |
| `THEME_SETS` | `ThemeSetDef` | id(bedroom/…) | items[](defId 배열). 충족 판정 로직은 엔진 |
| `CAT_POSES` | `CatPoseDef` | id(walk/sit/…) | 본 회전값(by/brx/hrx/legF/legB/t1/brz). 유니티는 AnimationClip 또는 Blend 파라미터로 |
| `CAT_PERCH_Y` | `CatPoseConfig` 필드 | — | 가구별 퍼치 높이 |
| `DISTRICTS` | `DistrictDef` | id(outskirts/…) | shelters[]/regionBonus/bonusLabel |
| `REGIONS` | `RegionDef` | id(residential/…) | rate/time/pool/lootRes/injuries. **slum.pool = 모든 가구 id(DEFS 키 전체)** |
| `MEMOS` | `MemoDef` (Localized) | id(res1/…) | region/name/desc. 56종 |
| `WILLS` | `MemoDef`(will=true) | id(will1/…) | 지역 무관 극저확률 풀. 6종 |
| `BROADCASTS` | `BroadcastDef` | id(fc_spring/…) | kind/doctor. 12종 |
| `SKETCHES` | `SketchDef` | id(meteor/…) | 관측소 완공 후 수집. 6종 |
| `EVENTS` (via `makeEvents`) | `EncounterDef` + 액션 델리게이트 | id(wanderer/…) | when 스키마는 데이터, run()/cost()는 **엔진 콜백**으로 이식(아래 §5) |
| `PROJECTS` | `ProjectDef` | id | stage 배열. 이미 순수 데이터 |
| `DEFS`(furniture) | `FurnitureDef` + Prefab | id | build(c) → 유니티 Prefab/메시로 대체 |

## 3. BAL → config

`BAL`(balance.js)은 의존성 0의 순수 수치 트리 → 유니티 `GameConfig` ScriptableObject(또는 JSON asset) 하나로.
런타임 튜닝을 위해 SO 단일 자산 권장(빌드 없이 값 교체). 서브트리(gauges/rest/economy/seasons/harbor/deco/exp…)를
그대로 중첩 SO 또는 `[Serializable]` 구조체로 옮긴다. **CRAFTS·PROJECTS가 BAL 키를 문자열/직접 참조하므로
config 키 이름을 그대로 보존**할 것.

## 4. i18n → JSON

`src/i18n.js`는 `{ 'key': { ko, en } }` 955개 항목 + `{placeholder}` 치환 + 한국어 조사 자동선택(`{josa}`).
유니티 이식:
- 키별 `ko`/`en` → 언어별 JSON(`ko.json`/`en.json`) 또는 유니티 Localization 패키지의 String Table.
- `{name}` 등 플레이스홀더 → `string.Format`/SmartFormat.
- `{josa}` (ko 전용 조사) → C# 조사 헬퍼로 포팅(check-i18n이 josa를 파리티 예외 처리하는 규칙 유지).
- 테이블의 name/nameEn·desc/descEn 이중 필드 → SO의 LocalizedString 하나로 통합 가능(위 §2).

## 5. EVENTS 팩토리(makeEvents) 이식 노트 — **가장 주의**

Phase 1에서 EVENTS는 `makeEvents(ctx)` 팩토리로 분리됐다. `choices[].run()/cost()`·`textFn`이
게임 내부 심볼(`state, resAdd, t, addMoodBuff, applyInjury, seasonOf, coldSnapActive, dropMemo,
dropBroadcast, recordDistantLight, spawnCat, playSfx, runEndingSequence, doctorFragmentsComplete`
및 데이터 `RESOURCES/DEFS/MEMOS/MEMOS_RESEARCH/BROADCASTS/BAL/LN/items`)을 참조하기 때문.

- **데이터 부분(when 스키마·icon·titleId/textId·choices의 labelId/cost 정적값)** → `EncounterDef` SO.
- **동작 부분(run/cost 함수)** → 엔진의 액션 시스템으로. 유니티에선 event id별
  `IEncounterAction` 구현 또는 델리게이트 레지스트리(id → C# 메서드)로 옮긴다. JS 클로저가
  `state`를 직접 변형하듯, C#에선 엔진 서비스(ResourceService.Add 등)를 주입해 동일 동작.
- `when` 조건(seasons/shelters/districts/weather/night/dayOnly/minDay/needsRadio/needsCat/hasMod)은
  선언적이므로 SO 필드로 그대로. `cond`(레거시 자유함수)만 코드 콜백.

## 6. Platform → Steamworks.NET

`src/lib/platform.js`의 `Platform`(cloud.save/load 등 추상화) → Steamworks.NET의
Remote Storage(클라우드 세이브)·업적(ISteamUserStats)로 매핑. 세이브 슬롯 키(`project-shelter-slot{n}`)는
Steam Cloud 파일명으로. 업적(ACHS)은 Steam 업적 id로 1:1. (세이브 스키마는 SAVE-SCHEMA.md 참조.)

## 7. 아직 game.js에 남은 콘텐츠 (Phase 2 대상)

| 남은 것 | 사유 |
|---------|------|
| `SHELTERS` (약 1811줄) | 각 셸터 항목이 `buildRoom()`/`buildEnv()` 3D 빌더 메서드를 데이터와 뒤섞어 품고 있어, 수치만 떼면 **구조 분해(재작성)** 가 되어 "이동만" 원칙 위반. 3D 빌더 분리 배치(Phase 2)에서 함께. 유니티에선 셸터별 Scene/Prefab + `ShelterDef` SO로. |
| `WALLPAPERS` / `FLOORINGS` | `tex: () => makeCanvasTex(...)` 텍스처 빌더 클로저(캔버스/THREE 렌더). 3D 빌더 분리 배치로 유보. 유니티에선 Material/Texture asset. |
| `MAP` / `MAP_MARKERS` | 종이 지도 렌더 좌표·마커. 렌더 결합. Phase 2. |
| `state` / `DEFAULT_STATE` | 콘텐츠 테이블이 아니라 런타임 세이브 상태(→ SAVE-SCHEMA.md). |
