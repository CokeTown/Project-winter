# SAVE-SCHEMA.md — Nine Winters 세이브 스키마 전수 + 마이그레이션 경로

> 저장 형식: `localStorage['project-shelter-slot{n}'] = JSON.stringify({ state, opts })`
> 슬롯 1~200. 롤링 백업: `project-shelter-slot{n}-bak`. 레거시 단일 세이브 키
> `project-shelter-web-v2`(`SAVE_KEY`)는 로드 시 슬롯 1로 이전 후 삭제.
> 현재 스키마 버전: **`state.ver = 3`** (game.js `state` 초기값 기준).
> 로직 출처: `src/game.js` `loadSave()`(구버전 보정)·`doSaveNow()`·`readSlot()`·`slotKey()`.

## 1. 저장 객체 최상위

| 필드 | 타입 | 설명 |
|------|------|------|
| `state` | object | 게임 진행 상태(아래 §2). 함수 없음(`JSON.parse(JSON.stringify(state))`로 스냅샷 가능 전제). |
| `opts` | object | 사용자 설정(볼륨·언어·키바인드 등). `sfxVol`/`bgmVol` 하향 마이그레이션 존재(§3). |

## 2. `state` 필드 전수 (ver 3 기준)

### 코어 진행
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `ver` | int | 3 | 스키마 버전. 마이그레이션 분기 기준. |
| `current` | string | 'container' | 현재 거주 셸터 id. 유효하지 않으면 로드 시 'container'로 폴백. |
| `successes` | int | 0 | 누적 탐험 성공. |
| `inventory` | {id:count} | {bed,rug,candle} | 미배치 보유 가구 수량. |
| `res` | {id:number} | 초기 자원표 | 자원 보유량. 신규 자원(salt 등)은 로드 시 0으로 보정. |
| `layouts` | {shelterId:[…]} | 셸터별 배열 | 셸터별 배치된 가구 레이아웃. 없는 셸터 키는 로드 시 `[]`. |
| `exp` | object\|null | null | 진행 중 탐험 { region, end, rate, prep }. |
| `injury` | object\|null | null | 현재 부상 { type, untilMin }. |
| `gameMin` | int | 480 | 게임 내 분(하루=1440). Day1 08:00 시작. |
| `day` | int | 1 | 현재 일차. |
| `savedAt` | epoch ms | Date.now() | 마지막 저장 시각. 오프라인 경과 계산(최대 2일=2880분). |

### 게이지·날씨·정비
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `weatherType` | string | 'clear' | 현재 날씨. |
| `weatherUntil` | int | 0 | 날씨 전환 예정 gameMin. |
| `hunger` `thirst` | number | 80 | 생존 게이지(0=탈진). |
| `energy` | number | 100 | 에너지(취침 회복). |
| `cleanBy` | {shelterId:number} | 70 | 셸터별 청결 만료 기준. 누락 셸터는 70 보정. |
| `renovated` | {shelterId:bool} | {container:true} | 최초 정비 완료 여부. 살아본 셸터는 로드 시 true 인정. |
| `expToday` | int | 0 | 오늘 탐험 횟수(하루 5회 제한). |
| `expFailStreak` | int | 0 | 연속 탐험 실패(성공률 pity, 캡3). |
| `upkeepOk` | bool | true | 전일 유지비 충족 여부. |
| `dayLog` | {gain,spend,notes} | 빈 로그 | 당일 자원 수지·기록. |
| `stayDays` | int | 0 | 현 거처 연속 거주일(정든 집 보너스). |

### 인카운터·버프·서사 수집
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `buff` | object\|null | null | 인카운터 버프 { exp?, loot?, labelId }. |
| `pendingEvent` | string\|null | null | 표시 대기 인카운터 id. |
| `lastEventDay` | int | 0 | 마지막 인카운터 발생일. |
| `evHistory` | [{id,day}] | [] | 최근 발화 이력(반복 억제, 최대 12). |
| `moodBuff` | object\|null | null | 안정감 여운 { amt, until }. |
| `memos` | {id:수집일} | {} | 수집한 메모/유서. |
| `broadcasts` | {id:수집일} | {} | 수집한 라디오 방송. |
| `sketches` | {id:수집일} | {} | 수집한 밤하늘 스케치(1.3). |
| `distantLight` | object\|null | null | 먼 불빛 목격 { count, lastDay, places }. |
| `pendingMemoPopup` `pendingBroadcast` `pendingSketchPopup` | 대기 | null | 결산 후 열 팝업. |
| `lastBroadcastDay` | int | 0 | 방송 청취 마지막 날(하루 1회). |

### 거처 개조·꾸미기
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `mods` | {shelterId:[modId]} | {} | 설치한 개조. |
| `deco` | {shelterId:{wall,floor}} | {} | 벽지·바닥재(#13). |
| `pipeFrozenUntil` | int | 0 | 수도관 동파 정지 기한. |
| `bunkerRoof` | 'hole'\|'temp'\|'full' | 'hole' | 돔 벙커 천장(#36). |
| `bunkerBackdoor` | bool | false | 뒷문 저장고 개방. |
| `hasCutter` | bool | false | 절단기 보유. |
| `rooftopSlate` | 'gapped'\|'full' | 'gapped' | 옥탑 슬레이트 지붕(#53). |
| `rooftopGardenStage` | 0..2 | 0 | 옥상 텃밭 성장 단계. |

### 고양이·튜토리얼·모드
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `cat` | 0/1 | 0 | 고양이 입양 여부. |
| `catMusicDay` `catEventSeen` `catHungry` | 혼합 | — | 고양이 OST일/등장이력/유지비 미납 상태. |
| `tutDay` | 0..3 | 0 | 첫 3일 튜토리얼 단계. |
| `tipsSeen` | {tipKey:bool} | {} | 1회성 팁 열람. |
| `pendingTutorial` | 단계\|null | null | 결산 뒤로 미룬 튜토리얼 페이지. |
| `questIdx` | int | 0 | 퀘스트 체인 인덱스(-1=비활성/완료). |
| `mode` | 'normal'\|'hard'\|… | 'normal' | 난이도. 구세이브는 'normal' 취급. |
| `helpSeen` | bool | false | 도움말 열람. |

### 겨울·한파(Nine Winters 엔드게임)
| 필드 | 타입 | 기본 | 설명 |
|------|------|------|------|
| `coldSnap` | object\|null | null | 한파 진행 { until, severity }. |
| `coldSnapForecast` | int | 0 | 한파 예보일. |
| `coldSnapsThisWinter` | int | 0 | 이번 겨울 발동 횟수(상한 제한). |
| `coldSnapWinterKey` | int | -1 | 카운터 소속 겨울 식별자. |
| `winters` | int | 0 | 넘긴 겨울 수(제목=장기 목표). |
| `winterSnap` | object\|null | null | 겨울 시작 스냅샷(memoir 차분용). |
| `pendingWinterMemoir` | [] | [] | 대기 중 "그 해 겨울" 페이지 큐. |
| `doctorRadioPending` | bool | false | 9겨울 후 박사 무전 대기. |

### 확장(1.1 항구 / 1.2 지하 / 1.3 고원 / 1.4 금지 구역)
| 필드 | 타입 | 기본 | 배치 |
|------|------|------|------|
| `projects` | {id:{stage,invested}} | {} | 1.1 대형 프로젝트(ARC-02). |
| `breakwaterHut` `icefishToday` | bool/int | false/0 | 1.1 항구. |
| `subwayHub` `subwayOpen` `mushroomWaterTimer` `marketToday` | 혼합 | — | 1.2 지하. |
| `cablecarDone` `observatoryDone` `avalancheForecast` `avalancheBlockUntil` `nightSkyToday` | 혼합 | — | 1.3 고원. |
| `hazmat` `hazmatDone` `radioBaseDone` `broadcasts_sent` `survivorLights` `doctorRegularSeen` `doctorRadioRegularPending` | 혼합 | — | 1.4 금지 구역. |
| `rescueUsed` `runEnded` | bool | false | 배치 D 무력/구제(런 종료 시 "끝난 기록" 보존). |
| `endingSeen` | bool | false | Day10000 엔딩 감상. |

## 3. 버전 마이그레이션 경로 (`loadSave()`)

로드 순서:
1. **레거시 이전**: `SAVE_KEY`(단일) 존재 & 슬롯1 비어있음 → 슬롯1로 복사 후 원본 삭제.
2. **슬롯 로드 + 손상 복구**: 현재 슬롯 파싱 실패 → `-bak` 백업 시도 → 그래도 없으면 슬롯1 폴백.
3. **기본값 보존 병합**: `defaults = deepCopy(현 state)` → `Object.assign(state, data.state)`
   (신규 필드는 defaults가 채운 뒤 저장값이 덮어씀). `Object.assign(opts, data.opts)`.
4. **opts 하향 마이그레이션**: `sfxVol===0.7 → 0.07`, `bgmVol===0.35 → 0.15`
   (구 기본값은 사용자 선택값이 아니라고 간주).

### `oldVer < 3` (v2 → v3)
- `data.state.ver` 없으면 2로 간주.
- 구 옥상 캠프 레이아웃(`layouts.rooftop`)을 `layouts.bunker`로 이전 후 rooftop 비움
  (v3의 rooftop은 새 셸터라 충돌 방지).
- `res, gameMin, day, savedAt, weatherType, weatherUntil, cleanBy, upkeepOk, dayLog, stats`를 기본값으로 리셋.
- `injury=null`, `injuredUntil` 삭제. `state.ver=3`.

### 필드 부재 보정 (버전 무관, 구세이브 방어)
- 셸터별 `layouts[id]=[]`, `cleanBy[id]=70`, 살아본 셸터 `renovated[id]=true`.
- 자원 누락 → `res[id]=0` (RESOURCES 키 순회).
- 게이지/카운터 null-보정: `hunger/thirst=80, energy=100, expToday=0, expFailStreak=0, tutDay=0, mode='normal'` 등.
- **winters 역산**: 원본 `data.state.winters==null`이면 `winters = floor((day-1)/SEASON_DAYS/4)`
  (스냅샷 부재로 memoir는 '다음 겨울'부터).
- Phase D·1.1~1.4 신규 필드: 각각 `null/false/{}/0`으로 보정(위 §2 배치 열 참조).
- `questIdx` 부재 & (day>1 or successes>0) → -1(진행 중 세이브는 퀘스트 비활성), 아니면 0.
- `SHELTERS[current]` 없으면 `current='container'`.

### 오프라인 경과
- `elapsed = (now - savedAt)초`, `offlineMin = min(2880, elapsed×GAME_MIN_PER_SEC)`
  → 최대 2게임일치 시간·허기/갈증 진행.

## 4. 이식 주의(유니티/Steam Cloud)
- 슬롯 키 `project-shelter-slot{n}` → Steam Remote Storage 파일명 1:1.
- 스키마 버전 필드(`ver`)와 위 부재-보정 로직을 **그대로 C# 마이그레이터로** 포팅(구세이브 크래시 0 유지 — 회귀 게이트).
- `state`는 순수 데이터(함수 없음)이므로 `[Serializable]` DTO + `JsonUtility`/System.Text.Json 직렬화 가능.
