# 로고 V2 — GPT 이미지 생성 프롬프트 패키지 (2026-07-23)

> 워크플로: 디렉터가 아래 프롬프트로 생성 → Fable이 픽셀 스냅+팔레트 강제 후처리(23b9bdf 공정) → 인게임 씬 위 컴포즈.
> 방향 합의(사이즈 실측 시트 근거): **F 픽셀 골격 + D의 N=셸터 심볼 + 앰버 1점 규칙**. 마이크로카피는 대형 전용 레이어.
> 캡슐 = 인게임 씬 + 로고 오버레이(게임 본질 노출) — 로고 자체는 씬 없이 투명/흑배경으로 뽑아야 컴포즈가 자유롭다.

## 공통 원칙 (모든 프롬프트 뒤에 붙이기)

```
Style constraints: authentic low-resolution pixel art on a strict square grid, hard edges, no anti-aliasing, no soft glow, no metallic bevel, no photorealism, no drop shadow. Limited palette: phosphor green (#93c893 range) on near-black (#0a0c0a), with exactly ONE small warm amber accent (#e8a33d). Flat graphic logo, not a scene render.
```

## ① 코어 로고타입 (소형 캡슐·기본형 — 최우선)

```
A two-line video game logotype that reads "NINE WINTERS" in blocky square pixel-art capital letters, monospaced feel, generous letter spacing. The letter "N" in "NINE" is replaced by a small pixel glyph of a gabled survival shelter hut with a tiny radio antenna on its roof — the hut silhouette forms the shape of the letter N. Phosphor green monochrome lettering on pure black background. The hut has ONE tiny amber-lit window, the only warm pixel in the image. No frame, no tagline, no extra text, no scenery. Clean flat emblem suitable for a small Steam capsule.
```
- 기대 산출: 스몰 캡슐(231×87)에서도 살아남는 코어. N=셸터 심볼이 아이콘으로 분리 가능.

## ② 풀 드레스 (메인 캡슐·히어로용 — 대형 전용)

```
The same "NINE WINTERS" two-line pixel logotype (square pixel capitals, shelter-hut-as-N with tiny amber window), now framed by a thin phosphor-green CRT terminal bracket frame with corner ticks. Above the frame a small header line reads "// SIGNAL IN WINTER" in tiny pixel monospace; below the frame a footer line reads "KEEP WARM. KEEP SIGNAL." All interface text is decorative micro-type. Subtle horizontal scanline texture across the lettering only. Black background, flat graphic, no scene, no photorealism.
```
- 카피는 디렉터 재량으로 교체 가능(현행 후보: PLAN. ENDURE. SHELTER. REPEAT. / STAY WARM, STAY TOGETHER).

## ③ 심볼 단독 (앱 아이콘·파비콘·워터마크)

```
A single pixel-art emblem: a gabled survival shelter hut whose outline forms the capital letter "N", with a small radio antenna mast on the roof emitting two thin concentric signal arcs. Phosphor green on black, one tiny amber window as the only warm accent. Square composition, flat icon, strict pixel grid, no text.
```

## 후처리 계약 (Fable 몫)
1. 니어리스트 다운스케일로 실그리드 스냅(가짜 픽셀 → 진짜 픽셀).
2. 팔레트 강제(그린 3~4단 + 앰버 1 + 흑) — 잡색 소거.
3. 투명 알파 추출 → `assets-src/art/out/steam2/final_logo_wordmark.png` 교체 → 캡슐 전 포맷 재컴포즈(1분).

## 판정 기준 (생성본 채택 전 체크)
- [ ] 231px 폭으로 줄여도 두 단어가 읽히는가
- [ ] N=셸터가 116px에서도 "집"으로 식별되는가
- [ ] 앰버 점이 정확히 한 곳인가 (두 곳 이상이면 재생성)
- [ ] 글자 획 두께가 균일한가 (스텐실 끊김·녹은 획 금지)
