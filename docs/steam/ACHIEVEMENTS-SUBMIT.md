# Steam 도전 과제 등록표 (18종) — Steamworks 콘솔 정합본

> **개정 (2026-07-17, 디렉터 콘솔 실등록 확인)**: 콘솔에는 스팀 기본 API명
> **`NEW_ACHIEVEMENT_1_0` ~ `1_15`** 로 **16종이 이미 등록**돼 있다(현지화는 `4950160_loc_upload.vdf`로 전달·업로드).
> API명은 게시 후 변경이 어려우므로 **코드가 콘솔을 따른다** — `STEAM_ACH_MAP`(src/lib/platform.js)을
> 실등록명으로 교체 완료. 구 계획명(`ACH_*`)은 **아이콘 파일명으로만** 남는다.
> **핵심 불변**: API Name이 코드 표와 1글자라도 다르면 그 업적은 영원히 안 열린다.

## 현황 요약

- ✅ **등록 완료 16종**: `NEW_ACHIEVEMENT_1_0` ~ `1_15` (아래 표)
- ⬜ **미등록 2종**: 개조 기술자·첫 겨울 — 콘솔 신규 생성 시 **API명을 `NEW_ACHIEVEMENT_1_16` / `1_17`로 정확히 입력**
  (코드는 이미 이 이름으로 중계 대기 중)
- 현지화(KO/EN/JA 이름·설명): `docs/steam/4950160_loc_upload.vdf` 업로드로 처리 — 신규 2종은 VDF에 추가분 필요(아래 스니펫)

---

## 등록표 (콘솔 실명 기준)

| # | API Name (콘솔 실명) | 게임 내부 id | 표시명 KO | 표시명 EN | 설명 KO | 조건 | 상태 |
|---|---|---|---|---|---|---|:--:|
| 1 | `NEW_ACHIEVEMENT_1_0` | first | 첫 발걸음 | First Steps | 첫 탐험 성공 | 탐험 성공 1회 | ✅ |
| 2 | `NEW_ACHIEVEMENT_1_1` | exp10 | 베테랑 스캐빈저 | Veteran Scavenger | 탐험 성공 10회 | 〃 10회 | ✅ |
| 3 | `NEW_ACHIEVEMENT_1_2` | exp30 | 폐허의 주인 | Lord of the Ruins | 탐험 성공 30회 | 〃 30회 | ✅ |
| 4 | `NEW_ACHIEVEMENT_1_3` | craft5 | 손재주 | Handy | 제작 5회 | 제작 5회 | ✅ |
| 5 | `NEW_ACHIEVEMENT_1_4` | craft20 | 폐허의 장인 | Ruins Artisan | 제작 20회 | 제작 20회 | ✅ |
| 6 | `NEW_ACHIEVEMENT_1_5` | comfort90 | 완벽한 안식처 | Perfect Refuge | 쾌적함 90 달성 | 쾌적 90 | ✅ |
| 7 | `NEW_ACHIEVEMENT_1_6` | settled8 | 정든 집 | Settled Home | 한 거처에 8일 연속 거주 | 연속 8일 | ✅ |
| 8 | `NEW_ACHIEVEMENT_1_7` | renov3 | 개척자 | Pioneer | 거처 3곳 정비 | 정비 3곳 | ✅ |
| 9 | `NEW_ACHIEVEMENT_1_8` | renovAll | 모든 곳이 집 | Everywhere Is Home | 거처 9곳 전부 정비 | 정비 전부 | ✅ |
| 10 | `NEW_ACHIEVEMENT_1_9` | nine_winters | 아홉 번째 겨울 | Nine Winters | 아홉 번의 겨울을 넘기다 | winters ≥ 9 | ✅ |
| 11 | `NEW_ACHIEVEMENT_1_10` | col21 | 수집가 | Collector | 도감 25% (가구 색상 21종) | 도감 25% | ✅ |
| 12 | `NEW_ACHIEVEMENT_1_11` | col42 | 큐레이터 | Curator | 도감 50% | 도감 50% | ✅ |
| 13 | `NEW_ACHIEVEMENT_1_12` | colAll | 폐허의 박물관장 | Museum Keeper of the Ruins | 도감 100% (84색상) | 도감 100% | ✅ |
| 14 | `NEW_ACHIEVEMENT_1_13` | cat | 고양이 집사 | Cat Servant | 길고양이를 가족으로 맞이하다 | 입양 | ✅ |
| 15 | `NEW_ACHIEVEMENT_1_14` | ending | 폐허 너머로 | Beyond the Ruins | 박사와 함께, 폐허 너머로 | 탈출 엔딩 | ✅ |
| 16 | `NEW_ACHIEVEMENT_1_15` | silence | 침묵 | Silence | … | 히든 루트 | ✅ 히든 |
| 17 | `NEW_ACHIEVEMENT_1_16` | mods3 | 개조 기술자 | Modder | 거처 개조 3개 설치 | 개조 3개 | ⬜ **생성 필요** |
| 18 | `NEW_ACHIEVEMENT_1_17` | winter | 첫 겨울을 넘다 | Past the First Winter | Day 48 도달 (사계절 생존) | Day 48 | ⬜ **생성 필요** |

> **#16 침묵**: Hidden 플래그 유지(이름·설명 비공개, 달성률만 노출 — 메트로 2033식 커뮤니티 고고학 유도).
> 인게임은 무기록(연출 0)이지만 Steam 해금 호출은 정상 중계. (근거: COMMS-KIT §3)

---

## 미등록 2종 생성 절차 (디렉터)

1. Steamworks → App Admin → Stats & Achievements → **New Achievement** ×2
2. **API Name을 정확히** `NEW_ACHIEVEMENT_1_16`, `NEW_ACHIEVEMENT_1_17`로 입력 (자동 제안값이 이와 다르면 수동으로 맞출 것)
3. 표시명/설명은 위 표의 KO/EN 입력 (JA는 아래 VDF 추가분으로)
4. 아이콘: `ACH_MODDER.png` / `ACH_PAST_FIRST_WINTER.png` (아래 아이콘 표)
5. 저장 후 **Publish** — Stats & Achievements는 별도 게시 필요

### 현지화 VDF 추가 스니펫 (4950160_loc_upload.vdf에 병합)

```
// english 블록에:
"NEW_ACHIEVEMENT_1_16_NAME"	"Modder"
"NEW_ACHIEVEMENT_1_16_DESC"	"Install 3 shelter mods"
"NEW_ACHIEVEMENT_1_17_NAME"	"Past the First Winter"
"NEW_ACHIEVEMENT_1_17_DESC"	"Reach Day 48 (survive all seasons)"
// koreana 블록에:
"NEW_ACHIEVEMENT_1_16_NAME"	"개조 기술자"
"NEW_ACHIEVEMENT_1_16_DESC"	"거처 개조 3개 설치"
"NEW_ACHIEVEMENT_1_17_NAME"	"첫 겨울을 넘다"
"NEW_ACHIEVEMENT_1_17_DESC"	"Day 48 도달 (사계절 생존)"
// japanese 블록에:
"NEW_ACHIEVEMENT_1_16_NAME"	"改造技師"
"NEW_ACHIEVEMENT_1_16_DESC"	"拠点の改造を3つ設置"
"NEW_ACHIEVEMENT_1_17_NAME"	"最初の冬を越えて"
"NEW_ACHIEVEMENT_1_17_DESC"	"Day 48到達（全季節を生存）"
```

---

## 아이콘 매핑 (파일명은 구 계획명 그대로 — 슬롯에 맞춰 업로드)

경로: `assets-src/art/out/steam_ach/{파일명}` (달성) · `assets-src/art/out/steam_ach/locked/{파일명}` (미달성) — 256×256

| API Name | 아이콘 파일명 |
|---|---|
| NEW_ACHIEVEMENT_1_0 | ACH_FIRST_STEPS.png |
| NEW_ACHIEVEMENT_1_1 | ACH_VETERAN_SCAVENGER.png |
| NEW_ACHIEVEMENT_1_2 | ACH_LORD_OF_THE_RUINS.png |
| NEW_ACHIEVEMENT_1_3 | ACH_HANDY.png |
| NEW_ACHIEVEMENT_1_4 | ACH_RUINS_ARTISAN.png |
| NEW_ACHIEVEMENT_1_5 | ACH_PERFECT_REFUGE.png |
| NEW_ACHIEVEMENT_1_6 | ACH_SETTLED_HOME.png |
| NEW_ACHIEVEMENT_1_7 | ACH_PIONEER.png |
| NEW_ACHIEVEMENT_1_8 | ACH_EVERYWHERE_IS_HOME.png |
| NEW_ACHIEVEMENT_1_9 | ACH_NINE_WINTERS.png |
| NEW_ACHIEVEMENT_1_10 | ACH_COLLECTOR.png |
| NEW_ACHIEVEMENT_1_11 | ACH_CURATOR.png |
| NEW_ACHIEVEMENT_1_12 | ACH_MUSEUM_KEEPER.png |
| NEW_ACHIEVEMENT_1_13 | ACH_CAT_SERVANT.png |
| NEW_ACHIEVEMENT_1_14 | ACH_BEYOND_THE_RUINS.png |
| NEW_ACHIEVEMENT_1_15 | ACH_SILENCE.png |
| NEW_ACHIEVEMENT_1_16 ⬜ | ACH_MODDER.png |
| NEW_ACHIEVEMENT_1_17 ⬜ | ACH_PAST_FIRST_WINTER.png |

---

## 잔여 체크리스트

- [ ] 미등록 2종 생성 (API명 `NEW_ACHIEVEMENT_1_16`/`1_17` 정확히) + 아이콘 2×2장
- [ ] VDF에 신규 2종 3언어 추가 후 재업로드 (위 스니펫)
- [ ] **NEW_ACHIEVEMENT_1_15 = Hidden 체크** 확인
- [ ] Stats & Achievements **Publish**

> 코드 측 완료: `ACHS`(18) + `STEAM_ACH_MAP`(id→콘솔 실명, 2026-07-17 교체) + 해금 판정 + 브릿지 중계.
> 실기 스모크(Steam 클라이언트에서 해금 확인)는 스팀 빌드 업로드 후.
