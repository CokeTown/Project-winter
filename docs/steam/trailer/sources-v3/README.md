# 스토리 트레일러 — 소스 세트 v3 (신규 플로우 · 디렉터 직접 편집용)

디렉터 스토리보드(2026-07-14) 그대로 인엔진으로 뽑은 소스입니다. 순서대로 얹으면 됩니다.

## 이번 판 핵심
- **픽셀화 한 단계 낮춤 + 도트 20~40%**: 전 컷 `opts.pixel=2` + **디더 강도 0.3(30%)** + **안티에일리어싱(MSAA) ON**. 도트 질감은 살아 있되 지글거림(디더 크롤)이 확 줄고 계단현상이 매끄러워졌습니다.
- 이 설정은 **게임 본편에도 옵션으로 반영**했습니다(설정 › 그래픽 › `안티에일리어싱`, `디더 강도`). 커뮤 지적(지터링·픽셀 셰이더)에 대한 대응.
- **엠대시 0 · 날짜 0.**
- 음악: `music/The_Last_Bell_of_the_World.mp3` (디렉터 첨부곡).

## 컷 순서 (디렉터 플로우)

| # | 비트 | 영상 소스 | 텍스트 카드 | 길이 | 비고 |
|---|------|-----------|-------------|------|------|
| 0 | 검은 화면 + 곡 시작 | (블랙) | — | ~2s | 페이드 인 준비, 곡 인트로 |
| 1 | all of a sudden / **World collapsed** | `clips/01_dark_city_snow.mp4` | `cards/card_1_world_collapsed.png` | ~3s | 어두운 죽은 도시 위로 **눈만** 내린다 (창불빛 반짝임 연출 폐기 — 디렉터 2026-07-14) |
| 2 | Pandemic and Nuke / **Set the world on fire** | `clips/02b_goldengate_towhite.mp4` | `cards/card_2_set_fire.png` | ~4s | 금문교 노을 → **끝에서 화면이 하얗게**(백아웃). 백아웃 순간에 컷 전환 추천 |
| 3 | **then, Winter came.** | `clips/03_rooftop_snow.mp4` | `cards/card_3_winter_came.png` | ~3s | 눈 내리는 옥탑방(따뜻한 실내 + 어두운 도시). 흰 화면에서 이 컷으로 |
| 4 | only few survived in this nuclear winter | `clips/04_ruined_city.mp4` | `cards/card_4_few_survived.png` | ~3s | 옥탑 너머 폐허 스카이라인(옥탑 배경 아파트들) |
| 5 | **Will I last long...?** | (블랙) | `cards/card_5_last_long.png` | ~2.5s | 화면 암전. 카드만 |
| 6 | (금문교 다시 보임) | `clips/02_goldengate.mp4` | — | ~4s | 클린 금문교(백아웃 없음). 곡 최고조 |
| 7 | **I'll find my shelter.** | (금문교 위 or 블랙) | `cards/card_6_find_shelter.png` | ~3s | 엔딩. 금문교 후반부에 카드를 얹거나 블랙 마무리 |

- 컷 2·6은 같은 금문교 렌더의 두 버전입니다: **2 = 백아웃판**(불태우기), **6 = 클린판**(등장). 
- 카드는 전부 **투명 배경 1920×1080 PNG** — 영상 위에 그대로 오버레이하면 됩니다(그림자 내장, 가독성 확보).
- 클립은 3초(엔진) / 4초(금문교) 소스입니다. 편집기에서 **느린 줌·속도 조절·루프**로 원하는 길이만큼 늘리세요.
- 음악 페이드: 인 ~1.5s, 아웃 마지막 ~2s. 최종 -14 LUFS 정규화 권장.

## 파일

```
clips/
  01_city_lights_collapse.mp4   ← 비트1 (불빛 소등, 역재생 완성본)
  01b_city_lights_ignite.mp4    ← 비트1 정방향 원본(직접 역재생/재편집용)
  02_goldengate.mp4             ← 비트6 (클린 금문교)
  02b_goldengate_towhite.mp4    ← 비트2 (금문교 → 백아웃)
  03_rooftop_snow.mp4           ← 비트3 (눈오는 옥탑)
  04_ruined_city.mp4            ← 비트4 (폐허 도시)
cards/  card_1 ~ card_6 (투명 PNG)
music/  The_Last_Bell_of_the_World.mp3
```

## 카피 전문 (영문 온스크린)
1. all of a sudden / World collapsed
2. Pandemic and Nuke / Set the world on fire
3. then, Winter came.
4. only few survived in this nuclear winter
5. Will I last long...?
6. I'll find my shelter.
