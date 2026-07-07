# 데모 재설계 — 콘텐츠 게이트 버티컬 슬라이스

> 확정: 2026-07-08 (디렉터). 기존 "1겨울 후 하드 Day 컷"(#74) → **콘텐츠 게이트 애착형 데모**.
> 목적: 코지의 재미 코어 = **애착**. 타이머가 끊는 게 아니라 "더 하고 싶어서" 나가게 → 구매·광팬.
> 근거: 매핑 워크플로우(6개 서브시스템 병렬 분석, wf_bd3b2373) + 트렌드 리서치(cozy·idle·survive 상승 교차점).

---

## 0. 확정 스펙 (디렉터 결정)

| 항목 | 값 |
|---|---|
| **아크** | 초봄 시작 → 봄·여름·가을 → **첫 겨울 '첫눈'(강제 발생)** → **Nine Winters 크레딧**(Ending_Credits.mp3 + 영어 문구) → **'계속하기' = 4계절 무한 샌드박스** |
| **탐험 지역** | 거주(residential)·공업(industrial)·슬럼(slum) 3종만. 상업(commercial) + 확장(항구/고원/금지) 잠금 |
| **이주 셸터** | 컨테이너(시작)·벙커·옥탑방 3곳만 |
| **샌드박스 압박** | 릴랙스(zen형) — 9겨울 종료 없음·무력사망 없음·무한 puttering |
| **자동모드** | 크레딧 이후 샌드박스에서만 해금 (본편 3지역 플레이 중엔 잠금) |
| **언어** | 한/영 둘 다 (락·2빌드 없음 — 데모는 수익상품 아니므로 GRAC 무관) |
| **첫눈 트리거** | 겨울 진입 시 **강제 눈**(결정적 클라이맥스). RNG 자연발생 대기 안 함 |
| **마일스톤** | 샌드박스에서 정식판 업적(winter/nine_winters) 억제 |

---

## 1. ⚠️ 현행 데모 게이트 버그 (발견)

`game.js:6703`: `seasonOf(state.day) === 'winter'` — `seasonOf()`는 **객체**(`{id,name,...}`)를 반환하는데 문자열 `'winter'`와 비교 → **항상 false**. 즉 **현재 데모 게이트는 한 번도 발화하지 않는다**(데모가 안 끝나고 정식판처럼 돌아감). `release-demo/…1.6.1.exe`도 이 버그 포함. → 재설계로 대체되므로 별도 수정 불요, 단 "Day 37 컷"이 실제 작동한 적 없음을 기록.

---

## 2. 구현 계획 (touch-point 확정)

### 2-A. 상태 플래그 (spine)
- `core/state.js` DEFAULT_STATE(63행 인근): `demoPhase: 'pre-credits'`, `firstSnowSeen: false` 신설.
- `core/save.js` migrateLoadedState: `if (state.demoPhase == null) state.demoPhase = state.demoEnded ? 'sandbox' : 'pre-credits'` 브리지(구 demo 세이브 구제).

### 2-B. 첫눈 → 크레딧 트리거
- **시간컷 폐기**: `game.js:6700-6709` 겨울-도착 블록 삭제.
- **첫눈 강제**: processDay 계절 전환의 winter 진입 분기(`game.js:6219-6228`)에서 `setWeather('snow')` + weatherUntil 리셋 → 겨울 첫날 확정 눈.
- **트리거 훅**: `setWeather()`(`game.js:553-570`) 말미에 `DEMO_ED && demoPhase==='pre-credits' && type==='snow' && seasonOf().id==='winter' && (state.winters||0)===0 && !state.firstSnowSeen` → `firstSnowSeen=true` + `runDemoCredits()`.
- **재발화 방지**: `ensureWeather()`(609) 로드 복원이 훅을 재발화 않도록 `firstSnowSeen` 게이트.

### 2-C. 크레딧 시퀀스
- `runEndingSequence`(`game.js:5983-6018`) 골격 재사용 → `runDemoCredits()`: 풀스크린 오버레이 + 시간정지 + SFX 음소거 + 크로스페이드.
- BGM: `BGM_LIB`에 `credits:['Ending_Credits']`(7782), `bgmContext()` creditsActive 분기(7802, **endingActive보다 먼저·titleVisible보다 먼저**), `BGM_SPECIAL`에 'credits'(7842).
- 세로 스크롤 크레딧 롤(신규 `@keyframes` + `#credits-screen` 또는 `#ending-screen` 재활용). 롤 종료는 **animationend**에 묶음(곡 길이 무관).
- 종료 콜백: `demoPhase='sandbox'` 각인 + `flushSave()`(재입장 크레딧 재생 방지) → 타이틀 강제 이동 없이 게임 복귀.

### 2-D. 동결 해제 (샌드박스는 흐름)
- 기존 `demoEnded` "영구 동결" 5개 지점을 `demoPhase` 기준으로 재배선:
  `tickTime:6679`(시간정지), `sleepUntilMorning:1674`, `departExpedition:2747`, `신규 수첩:7090`, `hideTitle 재입장:5879`.
  → `demoPhase==='pre-credits'`일 때만 잠금 성격 적용, `'sandbox'`는 정상 동작.
- 전수 `grep demoEnded` 후 일괄 전환 (누락 시 부분 동결 회귀).

### 2-E. 브레드스 잠금 (3지역 + 이주 3셸터)
- `core/regions.js:23-28` regionUnlocked: 순수 모듈이라 DEMO 못 봄 → `setRegionsWeather`(18) 패턴의 **주입자 `setRegionsDemo(flag)`** 신설. 데모면 commercial + harbor/resort/checkpoint/lab → false, residential/industrial/slum만 true.
- `startExpedition:2746`에 `regionUnlocked` 가드 추가(직접호출 방어).
- **이주 화이트리스트**: `shelterUnlocked`(`game.js:6998-6999`) 단일 초크포인트에 데모 분기 — `['container','bunker','rooftop']`만 통과. **layouts OR절(6999) 무시**(치트/구세이브 누수 차단). 소비처(openShelterModal 7007·canMoveSomewhere 2302·updateMoveBadge 2314) 자동 반영.

### 2-F. 샌드박스 = zen형 릴랙스
- 크레딧 후 zen 시맨틱 적용(별도 mode 값 대신 `demoPhase==='sandbox'`를 zen과 OR):
  무력 비적용(`game.js:1540 checkHelpless`), HUD 9겨울 캡 무한 표기(`6060`), endRun 미발동.
- 자동모드: `runAutoPlay:6658`·`refreshAutoplayLock:7566`·토글:8002 게이트를 데모에선 `demoPhase!=='sandbox'`이면 잠금으로.

### 2-G. 마일스톤 억제
- `game.js:4729-4730` `winter`(Day48)·`nine_winters`(9겨울) 업적 발화를 데모 샌드박스에서 억제.

### 2-H. 문구
- `demo.end.*`(locales 554-558, "데모는 여기까지" 하드스톱) → 크레딧/샌드박스 톤으로 교체.
- 신규 `credits.roll.*` 영어 문구(§3) + 한글 병기.

---

## 3. 크레딧 문구 (영미권 · 확정안)

```
NINE WINTERS

The first winter has passed.

You warmed the soup. You mended the wall.
You kept something alive
in a world that had already ended.

Eight winters wait beyond the snow —
a home still half-empty, still yours to fill.

The rest of the story is waiting.
See you on Steam — by a warmer fire.

Search "Nine Winters" · Wishlist to be there when the snow returns.
```

한글 병기(로케일 대칭):
```
아홉 번의 겨울

첫 번째 겨울이 지났다.

수프를 데웠고, 벽을 고쳤다.
이미 끝나 버린 세상에서
당신은 무언가를 계속 살려 두었다.

눈 너머로 여덟 번의 겨울이 남아 있다 —
아직 반쯤 빈, 그러나 당신의 집.

이야기는 아직 기다리고 있다.
스팀에서 다시 만나요 — 조금 더 따뜻한 난롯가에서.

"Nine Winters" 검색 · 위시리스트로, 다시 눈이 올 때 그 자리에.
```

---

## 4. 리스크 (워크플로우 감사)

- **첫눈 신뢰성**: seasonAdjustPool은 눈을 '유력'하게만 함(비결정) → **겨울 진입 시 강제 눈**으로 확정(§2-B).
- **세이브 호환**: 구 demo 세이브 `demoEnded=true` → migrate 브리지 필수(§2-A).
- **동결 가드 누수**: `demoEnded` 5개 지점 전수 전환(§2-D). 하나라도 누락 시 샌드박스 부분 동결.
- **게이트 누수**: regionUnlocked/shelterUnlocked 데모 분기가 `DEMO_ED=false`에서 기존과 100% 동일해야(core.test SHELTER_HASH·MIG_HASH 가드).
- **BGM 컨텍스트 순서**: credits 분기를 endingActive·titleVisible보다 먼저.
- **크레딧 재생 반복**: 종료 콜백에서 `demoPhase='sandbox'` + flushSave 보장.
- **PWA 캐시**: Ending_Credits.mp3는 런타임 CacheFirst(precache 제외) → 첫 재생 네트워크 필요. 설치본은 extraResources 경로 확인.

---

## 5. 착수 순서

1. 상태 플래그 + 세이브 마이그레이션(2-A) → **core.test 통과 확인**.
2. 지역/이주 잠금(2-E) → core.test(SHELTER_HASH) + 정식빌드 무회귀 확인.
3. 첫눈 트리거 + 동결 해제(2-B, 2-D) → HMR 플레이 확인.
4. 크레딧 시퀀스 + BGM + 문구(2-C, 3, 2-H) → HMR·디렉터 접지.
5. 샌드박스 zen + 자동모드 + 마일스톤(2-F, 2-G) → 전 모드 오디트.
6. 데모 빌드 + 골든/모달/코어 게이트 + 커밋.

> 라이팅 무드 패스(#120)는 데모 릴리스 선행조건(디렉터) — 위 5까지 후 6 직전에 동행.
