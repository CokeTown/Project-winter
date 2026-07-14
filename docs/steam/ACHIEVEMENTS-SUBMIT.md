# Steam 도전 과제 등록표 (18종) — Steamworks 콘솔 붙여넣기용

> **목적**: Steamworks → App Admin → **Stats & Achievements → Achievements**에 18종을 그대로 등록.
> **핵심**: **API Name(영문 대문자)** 이 게임 코드(`STEAM_ACH_MAP`)와 **정확히 일치**해야
> Electron/Steamworks 브릿지가 해금을 중계한다. 오타 1글자면 그 업적은 영원히 안 열림.
> **아이콘**: 각 업적 = 달성본 + 미달성본 2장. 경로는 각 항목에 명시(256×256 PNG).
> **표시명/설명**: 스팀은 언어별 로컬라이즈 지원 — **한국어 + English** 둘 다 입력(아래 둘 다 제공).
> 근거: 정의=`src/game.js` `ACHS`, 매핑=`src/lib/platform.js` `STEAM_ACH_MAP`, 아이콘=`ach-tile.mjs` 생성.

## 아이콘 폴더
```
assets-src/art/out/steam_ach/
  {API_NAME}.png          — 달성 아이콘 (256×256)   → Steamworks "Achieved Icon"
  locked/{API_NAME}.png   — 미달성 아이콘 (256×256)  → Steamworks "Unachieved Icon"
  _contact.png            — 18종 한눈 컨택트 시트 (검수용, 업로드 X)
```
> 미달성본은 달성본을 디새추+한기 틴트한 "얼어붙은" 버전. 원치 않으면 Steam 기본 잠금 아이콘 사용 → `locked/` 무시.

---

## 등록표

| # | API Name (정확히) | 표시명 KO | 표시명 EN | 설명 KO | 설명 EN | 히든 |
|---|---|---|---|---|---|:--:|
| 1 | `ACH_FIRST_STEPS` | 첫 발걸음 | First Steps | 첫 탐험 성공 | First successful expedition | |
| 2 | `ACH_VETERAN_SCAVENGER` | 베테랑 스캐빈저 | Veteran Scavenger | 탐험 성공 10회 | 10 successful expeditions | |
| 3 | `ACH_LORD_OF_THE_RUINS` | 폐허의 주인 | Lord of the Ruins | 탐험 성공 30회 | 30 successful expeditions | |
| 4 | `ACH_HANDY` | 손재주 | Handy | 제작 5회 | Craft 5 times | |
| 5 | `ACH_RUINS_ARTISAN` | 폐허의 장인 | Ruins Artisan | 제작 20회 | Craft 20 times | |
| 6 | `ACH_PERFECT_REFUGE` | 완벽한 안식처 | Perfect Refuge | 쾌적함 90 달성 | Reach comfort 90 | |
| 7 | `ACH_SETTLED_HOME` | 정든 집 | Settled Home | 한 거처에 8일 연속 거주 | Live 8 days straight in one shelter | |
| 8 | `ACH_PIONEER` | 개척자 | Pioneer | 거처 3곳 정비 | Refit 3 shelters | |
| 9 | `ACH_EVERYWHERE_IS_HOME` | 모든 곳이 집 | Everywhere Is Home | 거처 9곳 전부 정비 | Refit all 9 shelters | |
| 10 | `ACH_MODDER` | 개조 기술자 | Modder | 거처 개조 3개 설치 | Install 3 shelter mods | |
| 11 | `ACH_PAST_FIRST_WINTER` | 첫 겨울을 넘다 | Past the First Winter | Day 48 도달 (사계절 생존) | Reach Day 48 (survive all seasons) | |
| 12 | `ACH_NINE_WINTERS` | 아홉 번째 겨울 | Nine Winters | 아홉 번의 겨울을 넘기다 | Weather nine winters | |
| 13 | `ACH_COLLECTOR` | 수집가 | Collector | 도감 25% (가구 색상 21종) | Collection 25% (21 furniture colors) | |
| 14 | `ACH_CURATOR` | 큐레이터 | Curator | 도감 50% | Collection 50% | |
| 15 | `ACH_MUSEUM_KEEPER` | 폐허의 박물관장 | Museum Keeper of the Ruins | 도감 100% (84색상) | Collection 100% (84 colors) | |
| 16 | `ACH_CAT_SERVANT` | 고양이 집사 | Cat Servant | 길고양이를 가족으로 맞이하다 | Welcome a stray cat as family | |
| 17 | `ACH_BEYOND_THE_RUINS` | 폐허 너머로 | Beyond the Ruins | 박사와 함께, 폐허 너머로 | With the doctor, beyond the ruins | |
| 18 | `ACH_SILENCE` | 침묵 | Silence | … | … | ✅ 히든 |

> **#18 침묵**: Steamworks에서 **Hidden 플래그 ON**으로 등록(이름·설명 비공개, 달성률만 노출 — 메트로 2033식 커뮤니티 고고학 유도). 표시명/설명은 위 "…" 그대로 두거나 스팀 히든 기본값 사용. 인게임은 무기록(연출 0)이지만 Steam 해금 호출은 정상 중계됨. (근거: COMMS-KIT §3)

---

## 항목별 아이콘 경로 (달성 / 미달성)

| # | API Name | 달성 아이콘 | 미달성 아이콘 |
|---|---|---|---|
| 1 | ACH_FIRST_STEPS | `assets-src/art/out/steam_ach/ACH_FIRST_STEPS.png` | `assets-src/art/out/steam_ach/locked/ACH_FIRST_STEPS.png` |
| 2 | ACH_VETERAN_SCAVENGER | `assets-src/art/out/steam_ach/ACH_VETERAN_SCAVENGER.png` | `assets-src/art/out/steam_ach/locked/ACH_VETERAN_SCAVENGER.png` |
| 3 | ACH_LORD_OF_THE_RUINS | `assets-src/art/out/steam_ach/ACH_LORD_OF_THE_RUINS.png` | `assets-src/art/out/steam_ach/locked/ACH_LORD_OF_THE_RUINS.png` |
| 4 | ACH_HANDY | `assets-src/art/out/steam_ach/ACH_HANDY.png` | `assets-src/art/out/steam_ach/locked/ACH_HANDY.png` |
| 5 | ACH_RUINS_ARTISAN | `assets-src/art/out/steam_ach/ACH_RUINS_ARTISAN.png` | `assets-src/art/out/steam_ach/locked/ACH_RUINS_ARTISAN.png` |
| 6 | ACH_PERFECT_REFUGE | `assets-src/art/out/steam_ach/ACH_PERFECT_REFUGE.png` | `assets-src/art/out/steam_ach/locked/ACH_PERFECT_REFUGE.png` |
| 7 | ACH_SETTLED_HOME | `assets-src/art/out/steam_ach/ACH_SETTLED_HOME.png` | `assets-src/art/out/steam_ach/locked/ACH_SETTLED_HOME.png` |
| 8 | ACH_PIONEER | `assets-src/art/out/steam_ach/ACH_PIONEER.png` | `assets-src/art/out/steam_ach/locked/ACH_PIONEER.png` |
| 9 | ACH_EVERYWHERE_IS_HOME | `assets-src/art/out/steam_ach/ACH_EVERYWHERE_IS_HOME.png` | `assets-src/art/out/steam_ach/locked/ACH_EVERYWHERE_IS_HOME.png` |
| 10 | ACH_MODDER | `assets-src/art/out/steam_ach/ACH_MODDER.png` | `assets-src/art/out/steam_ach/locked/ACH_MODDER.png` |
| 11 | ACH_PAST_FIRST_WINTER | `assets-src/art/out/steam_ach/ACH_PAST_FIRST_WINTER.png` | `assets-src/art/out/steam_ach/locked/ACH_PAST_FIRST_WINTER.png` |
| 12 | ACH_NINE_WINTERS | `assets-src/art/out/steam_ach/ACH_NINE_WINTERS.png` | `assets-src/art/out/steam_ach/locked/ACH_NINE_WINTERS.png` |
| 13 | ACH_COLLECTOR | `assets-src/art/out/steam_ach/ACH_COLLECTOR.png` | `assets-src/art/out/steam_ach/locked/ACH_COLLECTOR.png` |
| 14 | ACH_CURATOR | `assets-src/art/out/steam_ach/ACH_CURATOR.png` | `assets-src/art/out/steam_ach/locked/ACH_CURATOR.png` |
| 15 | ACH_MUSEUM_KEEPER | `assets-src/art/out/steam_ach/ACH_MUSEUM_KEEPER.png` | `assets-src/art/out/steam_ach/locked/ACH_MUSEUM_KEEPER.png` |
| 16 | ACH_CAT_SERVANT | `assets-src/art/out/steam_ach/ACH_CAT_SERVANT.png` | `assets-src/art/out/steam_ach/locked/ACH_CAT_SERVANT.png` |
| 17 | ACH_BEYOND_THE_RUINS | `assets-src/art/out/steam_ach/ACH_BEYOND_THE_RUINS.png` | `assets-src/art/out/steam_ach/locked/ACH_BEYOND_THE_RUINS.png` |
| 18 | ACH_SILENCE | `assets-src/art/out/steam_ach/ACH_SILENCE.png` | `assets-src/art/out/steam_ach/locked/ACH_SILENCE.png` |

---

## 업로드 체크리스트

- [ ] Steamworks → App Admin → Stats & Achievements → **New Achievement** ×18
- [ ] 각 업적 **API Name**을 위 표 그대로(대문자·언더스코어) 입력 — 코드와 1:1
- [ ] 표시명/설명 **KO + EN** 둘 다 입력 (스팀 언어별 탭)
- [ ] 달성/미달성 아이콘 2장 업로드 (256×256)
- [ ] **#18 ACH_SILENCE = Hidden 체크**
- [ ] 저장 후 **Publish** (Stats & Achievements는 별도 게시 필요 — 이거 안 하면 라이브 반영 X)
- [ ] (선택) 스토어 배지/전시 순서 조정

> 코드 측은 완료: `ACHS`(18) + `STEAM_ACH_MAP`(id→API) + 인게임 해금 판정(`checkAchievements`) + 브릿지 중계.
> Steamworks 콘솔 입력 + Publish만 디렉터 몫.
