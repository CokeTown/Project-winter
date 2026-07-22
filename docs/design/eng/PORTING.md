# PORTING.md — Nine Winters 데이터 이식 지도 (엔지니어링 패스 Phase 1)

> 목적: 웹(Vite/JS) 콘텐츠 데이터를 유니티(C#/Steamworks.NET)로 이식할 때
> **테이블 → ScriptableObject**, **BAL → config**, **i18n → JSON**, **Platform → Steamworks.NET**
> 1:1 매핑을 고정한다. Phase 1(2026-07)에서 순수 콘텐츠 테이블을 `src/data/`로 분리했고,
> 이후 #73 엔지니어링 패스 Tier4까지 진행되어 현재 모듈 구성은 core 14(coldsnap/comfort/economy/encounter/expedition/gauges/knowledge/mode/projects/regions/save/season/shelter/state) · systems 4(avatar/cat/visitor/wildlife) · data 16이다.
> 이 문서는 그 결과물의 이식 청사진이다. 다음 티어 후보는 SHELTERS 빌더(buildRoom/buildEnv) 분리.

## 1. 데이터 파일 목록 (분리 후 현재 `src/data/`)

| 파일 | 내보내기(export) | 성격 | 줄수 | 의존성 |
|------|------------------|------|------|--------|
| `balance.js` | `BAL` | 튜닝 수치(게이지·경제·계절…) | 639 | 없음(순수) |
| `projects.js` | `PROJECTS` | 대형 프로젝트 스테이지 정의 | 228 | 없음(문자열 키로 BAL 간접참조) |
| `furniture.js` | `DEFS, WOODS` | 가구 17종(티어 T1~T3 포함) 정의 + 3D `build(c)` | 1530 | THREE, `lib/helpers` |
| `events.js` | `makeEvents(ctx)` | 인카운터(팩토리) | 762 | 없음(game→data 단방향, ctx 주입) |
| `items.js` | `RESOURCES, INJURIES, PREPS, THEME_SETS, CAT_POSES, CAT_PERCH_Y, CRAFTS` | 자원/부상/준비물/제작/테마/고양이 포즈 | 175 | `BAL`(CRAFTS 염장 비용) |
| `world.js` | `WEATHERS, DISTRICTS, REGIONS` | 날씨(#73 Tier4 합류)·지도 구역·탐험 지역 수치·메타 | 201 | `DEFS`(REGIONS.slum.pool) |
| `lore.js` | `MEMOS, WILLS, MEMO_REGIONS, MEMOS_BY_REGION, MEMOS_SUBWAY, MEMOS_RESORT, MEMOS_RESEARCH, BROADCASTS, SKETCHES` | 서사 텍스트(메모/유서/방송/스케치) | 179 | 없음(순수) |
| `achs.js` | `ACH_DEFS` | 업적 18종 정의(#73 Tier4 분리) | 32 | 없음(순수) |
| `decotex.js` | `makeDecoTex(ctx)` | 벽지·바닥재 텍스처 팩토리(WALLPAPERS·FLOORINGS 분리) | 130 | 없음(makeCanvasTex 주입식) |
| `knowledge.js` | `KNOWLEDGE_BRANCHES, KNOWLEDGE` | 지식 테크트리 정의 | 59 | 없음(순수) |
| `l10n-registry.js` | `walkDataL10n, stampDataL10n` | 데이터 표 병기 문자열 레지스트리(#114 P2) | 101 | data 테이블 참조 |
| `paints.js` | `PAINT_FAMILIES, RARE_PAINTS, SIGNATURE_PAINT, PAINT_ALL` | 도료 12계열+희귀(네온 안료) | 64 | 없음(순수) |
| `shelters.js` | `SHELTER_META, SHELTER_ACCESS` | 셸터 순수 필드(빌더는 game.js 잔류) | 270 | 없음(순수) |
| `spots.js` | `FIELD_SPOTS` | 필드 스팟 정의 | 31 | 없음(순수) |
| `visitors.js` | `VISITOR_TABLE, VISITOR_UI` | 방문자 테이블·UI 메타 | 92 | 없음(순수) |
| `wildlife.js` | `WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE` | 야생동물 종·출현 테이블 | 133 | 없음(순수) |

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
| `WEATHERS` | `WeatherDef` | id | #73 Tier4에서 `data/world.js` 이관 완료. 파티클 생성·weather 런타임 상태는 렌더 결합이라 game.js 잔류(페널티 수치만 core/expedition에 주입) |
| `ACHS`(`ACH_DEFS`) | `AchievementDef` (Steam 업적 id 1:1) | id | `data/achs.js` 분리 완료(#73 Tier4) |

## 3. BAL → config

`BAL`(balance.js)은 의존성 0의 순수 수치 트리 → 유니티 `GameConfig` ScriptableObject(또는 JSON asset) 하나로.
런타임 튜닝을 위해 SO 단일 자산 권장(빌드 없이 값 교체). 서브트리(gauges/rest/economy/seasons/harbor/deco/exp…)를
그대로 중첩 SO 또는 `[Serializable]` 구조체로 옮긴다. **CRAFTS·PROJECTS가 BAL 키를 문자열/직접 참조하므로
config 키 이름을 그대로 보존**할 것.

## 4. i18n → JSON

i18n은 이미 언어별 외부 JSON(`public/locales/ko.json`·`en.json`·`ja.json`, 약 2,070키)으로 외부화 완료(#113 UI 993키 + #114 P2 data.* 542키 + #191 ja 로케일, 폴백 체인 ja→en→ko). `{placeholder}` 치환 + 한국어 조사 자동선택(`{josa}`)은 엔진 유지. 유니티 이식 시 이 JSON을 그대로 String Table 소스로 쓰면 된다(아래 '유니티 이식' 항목 중 'ko/en → 언어별 JSON' 단계는 이미 완료 상태).
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
| `SHELTERS` (3D 빌더 잔류분) | **데이터부 분리 완료**: 순수 필드(이름·쾌적·퍽·유지비 등)는 `src/data/shelters.js`(SHELTER_META·SHELTER_ACCESS, 270줄)로 이관, game.js가 `SHELTERS[id] = { ...SHELTER_META[id], buildRoom, buildEnv }`로 병합. 잔류분은 `buildRoom()`/`buildEnv()` 3D 빌더뿐(#73 다음 티어 후보). 유니티에선 셸터별 Scene/Prefab + `ShelterDef` SO로. |
| `WALLPAPERS` / `FLOORINGS` | **분리 완료**: `src/data/decotex.js`의 `makeDecoTex({ makeCanvasTex })` 팩토리로 이관(렌더 함수는 주입식). 유니티에선 Material/Texture asset. |
| `MAP` / `MAP_MARKERS` | 종이 지도 렌더 좌표·마커. 렌더 결합. Phase 2. |
| `state` / `DEFAULT_STATE` | 콘텐츠 테이블이 아니라 런타임 세이브 상태(→ SAVE-SCHEMA.md). |
