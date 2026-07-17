# B 스토리 트레일러 — 소스 세트 v2 (디렉터 직접 편집용)

인엔진 시네마틱 소스입니다. 편집 skill이 없어서, 컷 소스를 낮은 픽셀화(**pixel:2**)로 깨끗이 뽑아 정리했습니다. 순서·타이밍대로 결합하시면 됩니다.

- **픽셀화**: 3D 컷은 전부 `opts.pixel=3 → 2`로 한 단계 낮춰 재렌더(더 선명). DOM 소스(문서·자막·지도)는 픽셀 셰이더 영향이 없어 그대로입니다.
- **음악**: `music/Gloomy2.mp3` (트레일러 전곡).
- **엠대시 0, 날짜 0.**

## 컷 순서 (권장 타이밍)

| # | 컷 | 소스 | 길이 | 자막(오버레이) |
|---|---|---|---|---|
| 1 | 콜드오픈 — 어둠 속 라디오, 붉은 튜닝 LED, 정전기 플리커 | `clips/01_coldopen_radio.mp4` | ~2.8s | (없음, 페이드인) |
| 2 | 고원 설산 와이드 (붉은 노을) | `stills/02_wide_plateau.png` (느린 줌) | ~4s | `cards/sub_a.png` — 역병과 불이 세상을 집어삼켰다 |
| 3 | 기밀문서 3장 | `stills/04a_doc_pandemic.png` → `04b_doc_cordon_incineration.png` → `04c_doc_observation.png` | 각 ~3s | (없음) |
| 4 | 옥탑 라디오 교신 푸시인 (먼 창 하나 응답) | `clips/03_signal_radio.mp4` | ~6s | `cards/sub_b.png` — 남은 건 나와 고양이 한 마리 |
| 5 | 지도 위 응답 불빛 점등 러시 | `clips/06_answer_lights.mp4` | ~5s | `cards/sub_c.png` — 가끔 저 멀리 불빛이 깜빡인다 / 나만 남은 게 아니었다 |
| 6 | 동부 다리 실루엣 티저 (붉은 노을·항공 비콘) | `stills/05_teaser_eastbridge.png` (느린 줌) | ~5s | `cards/sub_tag.png` — 세상의 끝에서, 나만의 피난처를 찾아야지 |
| 7 | CTA — 태그라인 + 로고 + Wishlist | `cards/cta.png` | ~4s | (I'll find my own shelter + NINE WINTERS + Wishlist on Steam) |

- 스틸(고원·동부·문서)은 정지 이미지라 편집기에서 **느린 줌(Ken Burns)**을 주면 살아납니다.
- 자막 카드는 **투명 배경 PNG**라 영상 위에 그대로 오버레이하면 됩니다. `_en` = 영어판.
- 음악 페이드: 인 ~1.2s, 아웃 마지막 ~1.5s. 최종 -14 LUFS 정규화 권장.

## 캡슐 (별도)

`capsule/` — 꾸민 코지 옥탑 골든아워 + 로고. `main_616x353` 등 스팀 규격 완성본 + `capsule_base_cozy_pixel2.png`(로고 없는 base, pixel:2).
※ #171 "고양이 크게"는 게임 고양이 AI가 위치를 덮어써서 아직 미반영 — 고양이 핀 훅(소스 수정) 필요.

## 카피 전문

1. 역병과 불이 세상을 집어삼켰다.
2. 남은 건 나와 고양이 한 마리.
3. 가끔, 저 멀리 불빛이 깜빡인다. 나만 남은 게 아니었다.
4. 세상의 끝에서, 나만의 피난처를 찾아야지. / I'll find my own shelter
