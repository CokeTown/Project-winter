# 시네마틱 스토리 트레일러 — Seedance 프롬프트 패키지 (2026-07-23)

> 플롯: 세상의 멸망 → 나는 어떻게 살아남았나 → 신호와 응답 (스토어 카피와 동일 서사).
> 구성: **10초 × 6샷 = 60초** (Seedance 클립 한계에 맞춘 체인. 40초 컷이 필요하면 샷 2·4를 드랍).
> 스타일: 회화적 애니메이션(뮤트 겨울 팔레트) — 실사는 픽셀 게임과 단절이라 기각. 게임 시그니처
> 모티프(주황 창문·난로·고양이·무전탑)를 전 샷 관통시켜 "게임의 세계"임을 유지한다.
> 오디오: 생성 안 함 — OST(엔딩 트랙 보유분)를 편집에서 얹는다. 대사 없음, 자막만.

## 공통 스타일 블록 (모든 샷 프롬프트 끝에 붙이기)

```
Painterly cinematic animation, muted cold palette of slate blue and ash gray with a single warm amber accent, soft film grain, gentle snowfall throughout, slow deliberate camera movement, melancholic but cozy tone, no dialogue, no text overlays, no photorealism, no gore, no people other than the lone survivor.
```

**주인공 고정 문구** (등장 샷마다 동일하게 — 인물 연속성 앵커):
```
the lone survivor: a slender figure in a worn olive parka with a dark knit beanie, face mostly unseen or turned away
```

## 샷 체인

**S1 · 멸망 (10s) — "세상은 조용히 끝났다"**
```
Aerial wide shot slowly drifting over a dead city buried in deep snow at dusk. Ruined high-rise buildings stand dark and silent, streets erased by snowdrifts, abandoned cars like burial mounds. No lights anywhere, no movement except falling snow. The camera glides forward through the gray silence.
```

**S2 · 유일한 불빛 (10s) — "내 창문만 남았다"**
```
Continuing aerial shot descending toward one small rooftop shack on top of an old apartment building. A single window glows warm amber — the only light in the entire dark city. Smoke rises thinly from a stovepipe chimney. The camera slowly pushes in toward that lit window through the snowfall.
```

**S3 · 온기 (10s) — "살아남는 법을 배웠다"**
```
Interior scene, warm and dim. The lone survivor (a slender figure in a worn olive parka with a dark knit beanie, face mostly unseen or turned away) sits beside a small cast-iron wood stove, stirring a pot of soup. Shelves of canned food, stacked books, a taped-up window. Firelight flickers across the small room. Quiet domestic survival, cozy against the frozen world outside.
```

**S4 · 문밖의 고양이 (10s) — "혼자가 아니게 됐다"**
```
The survivor opens the door to a snowy rooftop night; a small orange tabby cat sits in the snow looking up. The survivor kneels and holds out a hand, the cat steps inside, shaking snow off. Door closes on the cold. Inside, the cat curls up on a cushion near the stove, firelight on its fur.
```

**S5 · 신호 (10s) — "어둠 너머로 물었다"**
```
Night blizzard. The survivor climbs to the rooftop and cranks a hand-built radio mast with a small antenna; a faint green indicator lamp blinks on the transmitter box. Wide shot of the tiny figure against the vast dark ruined skyline, wind-driven snow streaking past, the antenna's signal lamp pulsing steadily into the darkness.
```

**S6 · 응답 (10s) — "그리고 빛이 돌아왔다"**
```
Same wide city view as the opening, but now: far across the ruined skyline, one distant window lights up amber. Then another. Then a third. Tiny warm lights scattered through the dead city like first stars. The camera slowly pulls back and up into the snowfall as the lights keep appearing. Hold on the widening view, fade to black.
```

## 자막(편집에서 얹기 — 영상 생성에 넣지 말 것)

| 샷 | 자막(EN) | 자막(KR) |
|---|---|---|
| S1 | The world ended quietly. | 세상은 조용히 끝났다. |
| S3 | I learned to stay warm. | 나는 온기를 지키는 법을 배웠다. |
| S4 | I was not alone. | 혼자가 아니었다. |
| S5 | So I asked the darkness. | 그래서 어둠에게 물었다. |
| S6 | And the lights came back. | 그리고 불빛이 돌아왔다. |
| 끝 | **NINE WINTERS** — Wishlist on Steam | (로고 V2 + 위시리스트 CTA) |

## 운용 팁 (Seedance 실전)

1. **샷당 3~4회 생성해 베스트 픽** — 특히 S4(고양이 동작)와 S6(점등 타이밍)은 리롤 소모 큼.
2. **연속성**: S1→S2는 같은 도시 앵글 계열이라 S1 결과물의 마지막 프레임을 S2의 첫 프레임 입력(i2v)으로 쓰면 이음이 자연스럽다. S3~S5의 인물은 고정 문구 유지가 핵심.
3. **금지어 유지**: photorealism·text·dialogue — 생성 자막은 반드시 오탈자 나므로 자막은 100% 편집에서.
4. **종횡비 16:9, 1080p** 고정(스팀 트레일러 규격). 프레임레이트는 기본값.
5. 편집 순서: 클립 6개 → 컷 편집(각 8~9초 사용, 크로스디졸브 최소) → OST → 자막 → 엔드카드(로고+위시리스트).
6. **스팀 게재 시**: AI 생성 콘텐츠 고지 문구에 트레일러 포함 여부 갱신(STORE-SUBMIT의 AI 공개란 — 이미 AI 제작기 스탠스가 정본이라 추가 리스크 없음).

## 이 트레일러의 자리

- 이건 **스토리/무드 트레일러**(별도 트랙) — 게임플레이 트레일러(V5 시놉: Search/Build/Decorate→셸터→고양이→Survive)와 **병행 가능**, 대체가 아님.
- 스팀은 트레일러 여러 개 게재 가능: 게임플레이를 1번(기본 재생), 시네마틱을 2번에 놓는 게 정석(Derek Lieu 원칙 — 첫 트레일러는 게임플레이).
