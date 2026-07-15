# Steam 업적 아이콘 세트 (18종)

Nine Winters 정식 출시용 Steam 도전 과제 아이콘. 게임 인게임 아이콘과 동일한
**무디드 포스트아포칼립스 픽셀아트** 톤(가구/셸터 아이콘 레시피)에 맞춰 제작 —
따뜻한 앰버 코어 → 차가운 황혼 가장자리 비네트 타일 위에 단일 오브젝트/엠블럼.
18종이 하나의 세트로 읽히도록 타일·테두리·팔레트를 균일하게 고정(= AI 티 최소화).

## 파일 구성
```
steam_ach/
  {API_NAME}.png          — 달성 아이콘 (256×256)  ← Steamworks '달성 아이콘'에 업로드
  locked/{API_NAME}.png   — 미달성 아이콘 (256×256) ← Steamworks '미달성 과제 아이콘'에 업로드
  src/{id}.png            — 원본 투명 서브젝트 (1024×1024, 재타일용 소스)
  _contact.png            — 18종 한눈에 보는 컨택트 시트 (검수용)
  README.md               — 이 문서
```
> 미달성본은 달성본을 디새추+어둡게+한기 틴트한 "얼어붙은" 버전입니다. 원치 않으면
> Steam 기본 잠금 아이콘을 써도 되고, 그때는 locked/ 를 무시하면 됩니다.

## 업로드 매핑 (Steamworks 콘솔 · API 이름 정확히 일치해야 브릿지가 해금 중계)

| # | 파일 (API 이름) | 업적 | 비공개 |
|---|-----------------|------|--------|
| 1 | ACH_FIRST_STEPS | 첫 발걸음 / First Steps | |
| 2 | ACH_VETERAN_SCAVENGER | 베테랑 스캐빈저 / Veteran Scavenger | |
| 3 | ACH_LORD_OF_THE_RUINS | 폐허의 주인 / Lord of the Ruins | |
| 4 | ACH_HANDY | 손재주 / Handy | |
| 5 | ACH_RUINS_ARTISAN | 폐허의 장인 / Ruins Artisan | |
| 6 | ACH_PERFECT_REFUGE | 완벽한 안식처 / Perfect Refuge | |
| 7 | ACH_SETTLED_HOME | 정든 집 / Settled Home | |
| 8 | ACH_PIONEER | 개척자 / Pioneer | |
| 9 | ACH_EVERYWHERE_IS_HOME | 모든 곳이 집 / Everywhere Is Home | |
| 10 | ACH_MODDER | 개조 기술자 / Modder | |
| 11 | ACH_PAST_FIRST_WINTER | 첫 겨울을 넘다 / Past the First Winter | |
| 12 | ACH_NINE_WINTERS | 아홉 번째 겨울 / Nine Winters | |
| 13 | ACH_COLLECTOR | 수집가 / Collector | |
| 14 | ACH_CURATOR | 큐레이터 / Curator | |
| 15 | ACH_MUSEUM_KEEPER | 폐허의 박물관장 / Museum Keeper | |
| 16 | ACH_CAT_SERVANT | 고양이 집사 / Cat Servant | |
| 17 | ACH_BEYOND_THE_RUINS | 폐허 너머로 / Beyond the Ruins | |
| 18 | ACH_SILENCE | 침묵 / Silence | ✅ 비공개 |

## 재생성 (톤 조정·개별 교체 시)
```
# 원본 서브젝트 재생성 (OPENAI_API_KEY 필요) — 개별 id 지정 가능
node <scratchpad>/ach-gen.mjs cat nine_winters --force
# 타일 재합성 (전체) — src/ 를 읽어 256 타일 + 잠금본 + 컨택트시트 갱신
node <scratchpad>/ach-tile.mjs
```
스크립트: `ach-gen.mjs`(생성), `ach-tile.mjs`(타일 합성). 스타일 접미·팔레트·비네트는
ach-gen/ach-tile 상단 상수에서 조정.
