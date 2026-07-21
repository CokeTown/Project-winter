# 계절 인카운터 확충 + 아트 재분배 (#163 · #163b)

> 디렉터 오더 2026-07-10:
> ① "계절별 인카운터를 정식 버전 기준 계절별 5~8종 더 추가하자. 기존 인카운터 그림들은 겨울 위주가 많다 — 분류해서 분배 계획 짜봐. 계절 무관 공용도 만들고."
> ② "인카운터들, 겨울이 지날 때마다 좀 더 우울해지거나 desperate 해져야 해. 자원은 가면 갈수록 줄어들 거잖아? 대신 이런 네거티브 방향 이벤트들은 하드·하드코어에서만."
> 관련: #161 계절별 특색 패스 (인카운터는 계절 특색의 서사 축).

## 1. 기존 아트 전수 감정 (23장, 시각 확인 2026-07-10)

| 판정 | 수 | 파일 |
|---|---|---|
| 겨울확정 (눈·얼음이 장면의 본질) | 4 | coldsnap_stranger · frozen_pipe · snow_prints · **thief** |
| 겨울느낌 (배경만 설경, 소재는 무계절) | 8 | cat · doctor_radio · dog · lighthouse_ship · storm · trader · wanderer · smuggler |
| 계절중립 (실내/무신호) | 10 | broken · caravan_pass · cat_gift · distant_light · greenhouse_birds · leaky_roof · old_calendar · radio_ghost · radio_sig · seeds |
| 온계절 신호 | 1 | spoil_merchant (파리 떼 — 여름 정합 ✓) |

디렉터 직감 그대로: 23장 중 12장이 겨울 편중, 온계절 그림은 1장뿐.

## 2. 분배 원칙

1. **재게이트 우선** (그림 그대로, 계절 조건만 부여 — 비용 0): 그림이 이미 특정 계절이면 인카운터를 그 계절로 보낸다.
2. **재생성 차선** (공용으로 남아야 하는 코어): 조기 핵심 인카운터는 공용 유지, 그림만 무설(無雪)로 재생성.
3. **정합 유지**: 계절 조건과 그림이 이미 맞는 것은 손대지 않는다.

## 3. 기존 처분표 (적용 완료분 표기)

| 인카운터 | 처분 | 상태 |
|---|---|---|
| coldsnap_stranger / frozen_pipe / snow_prints / doctor_radio / spoil_merchant / caravan_pass | 유지 (조건·그림 정합) | ✓ |
| **storm** | **재게이트 → 가을·봄** (그림에 눈이 한 점도 없음 = 환절기 돌풍, 비용 0) | 코드 반영 ✓ |
| **seeds** | **재게이트 → 봄** (씨앗=파종, 중립 정물) | 코드 반영 ✓ |
| thief · wanderer · trader · dog | 공용 유지 + **그림 재생성 (무설 밤)** | 아트 대기 |
| cat (입양 특수) | **그림 재생성 → 가을 낙엽** (데모 Day9=가을 입양 확정과 정합) | 아트 대기 |
| smuggler · lighthouse_ship | 공용 유지 + 그림 재생성 (후순위 — 안개 항구/폭풍 밤바다) | 후순위 |
| 중립 9종 | 유지 | ✓ |

## 4. 신규 로스터 — 34종 (계절 6·6·6·5 + 공용 5 + 절박 6)

어투: 행동=혼잣말 반말 / 접촉 스펙트럼: 직접 대면 최소(흔적·거리·간접) / 보상 소폭(자원 ±1~2, 기분 1~3).

### 봄 6 — 해빙·재생·젖은 흙
thaw_stream(해빙 개울→물) · first_sprout(콘크리트 새싹) · returning_birds(철새 북행) · melt_reveal(눈 녹은 자리의 발견) · bee_swarm(창틀의 벌) · mud_tracks(진창 바퀴 자국)

### 여름 6 — 더위·부패·소나기·생명 소리
cicada_evening(첫 매미·고양이 변형) · mosquito_net(모기장) · wild_berries(산딸기) · sudden_shower(소나기+무지개) · heat_haze(아지랑이) · firefly_field(반딧불이·밤)

### 가을 6 — 낙엽·갈무리·겨울의 예감
acorn_cache(도토리 저장고) · leaf_drift(낙엽·고양이 다이빙 변형) · first_frost(첫서리·문풍지) · geese_south(기러기 남행) · pickling_day(갈무리: 식량2+물1→통조림2) · spider_web(아침 거미줄)

### 겨울 신규 5 (기존 3 합류 → 총 8)
icicle_row(고드름→물) · frozen_sparrow(언 참새 구조) · snowman_scarf(누군가의 눈사람·흔적 접촉) · clear_winter_night(별하늘·밤·맑음) · blizzard_warning(폭설 전야 무전·라디오)

### 공용 5 — 무계절
red_balloon(빨간 풍선) · doorstep_bundle(문 앞의 꾸러미·흔적 접촉) · music_box(오르골 수리) · cat_dream(고양이의 꿈·고양이) · old_photo(벽 틈의 사진)

### 절박 티어 6 (#163b) — 생존·혹한 전용 + 경과 겨울 게이트
> 설계 의도: **겨울이 지날수록 세상이 야윈다.** 자원 감소를 서사로 보여주는 네거티브/절박 이벤트.
> 코지에는 절대 발화하지 않는다 (`when.modes: ['hard','hardcore']`). `minWinters` = 발화 최소 경과 겨울 수.

| id | 시점 | 장면 | 결 |
|---|---|---|---|
| silent_frequency | 겨울 1+ · 라디오 | 늘 잡히던 주파수가 침묵 | 상실 (기분-) |
| barren_traps | 겨울 1+ | 덫이 빈 지 사흘째 — 짐승 먼저 야윈다 | 절박 도박 (식량1 → 50% 식량2) |
| looted_cache | 겨울 1+ | 은닉처가 털렸다 | 실손 (자원 -1 / 추적 도박) |
| desperate_knock | 겨울 2+ · 밤 | "먹을 수 있는 거면 아무거나요" | 잔혹한 선택 (통조림1 나눔 / 침묵=기분-2) |
| stripped_district | 겨울 2+ | 앞서 다녀간 약탈의 손 — 부스러기뿐 | 고갈 실감 (심층 수색 도박) |
| harsh_barter | 겨울 2+ · 겨울·낮 | 연료 1 = 통조림 3, 작년의 세 배 | 인플레 서사 (지독한 교환) |

## 5. 엔진 확장 (core/encounter.js)

`when` 스키마 신설 2종 — `modes: string[]`(state.mode 포함 판정), `minWinters: n`(ctx.winters ≥ n).
`ctx.winters`는 game.js eventCtx()에서 `wintersPassedOf(state.day)`로 공급.

## 6. 결과 분포 (정식판 일반 풀)

- 봄 주력 7 (신규 6 + seeds) + 공유 2 (caravan·storm) / 여름 7 / 가을 주력 7 + 공유 / 겨울 8
- 공용 19 (기존 14 + 신규 5) / 절박 6 (생존·혹한 한정 오버레이)

## 7. 아트 작업 목록 (art-gen 파이프라인, 결손=일러스트 생략 폴백)

- 신규 34장: `public/img/events/ev_<id>.png`
- 재생성 5장(필수): thief·wanderer·trader·dog(무설 밤) + cat(가을 낙엽)
- 재생성 2장(후순위): smuggler·lighthouse_ship
- 절박 6장은 어둡고 야윈 팔레트 (코지 대비 명확한 톤 차이)

## 8. 데모 반영

데모(1.7.x)는 15일 컷·winters=0이라 절박 티어는 구조적으로 발화 불가(정합 ✓).
계절 신규분의 데모 체리픽 여부는 #161(계절 특색 패스)과 함께 디렉터 판단 대기.
