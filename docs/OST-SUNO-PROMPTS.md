# OST Suno 프롬프트 팩 (디렉터 제작용, 2026-07-23)

> 용도: 디렉터가 Suno에 붙여넣어 신규 OST를 뽑는 프롬프트 정본. 기존 36곡 체계(PROJECT.md §5 —
> 날씨 풀 편입식)에 바로 꽂히도록 풀 지정·파일명까지 제안한다.

## 공통 규약 (전 트랙)

- **Instrumental 토글 필수** — 보컬 금지(게임 정체성: 라디오 목소리 외 사람 소리 없음).
- **루프 친화**: 방치형이라 곡이 "사건"이 되면 안 된다. 인트로 짧게, 드라마틱한 빌드업·클라이맥스 억제,
  다이내믹 평탄. 프롬프트 말미의 `consistent dynamics, no dramatic build-ups` 구절이 그 역할 — 지우지 말 것.
- **불꽃 소리 금지**: 난로 crackle은 인게임 SFX(setFire)가 따로 깐다 — 곡에 들어가면 이중으로 겹친다.
  `no fireplace crackle` 구절 유지.
- **아티스트/작품명 직접 언급 금지**(Suno 필터에 걸림) — 감성은 악기·무드 서술로 우회했다.
- 뽑은 곡은 3s 페이드아웃 여유가 있는지 확인(트랜지션 규약) 후 `public/BGM/`에 파일명 규칙대로.

---

## 1. 「첫눈의 셸터」 — Snowing/Winter 풀 확충

- **편입**: Snowing 풀(현 5곡) 또는 Winter 계절 풀(현 2곡 — 가장 얇은 풀이라 1순위 보강).
- **파일명 제안**: `Snowing7.mp3` / `Winter3.mp3`
- **의도**: 눈 오는 날 창가, 담요, 방 안의 온기. "둘러싸였으나 혼자"의 혼자가 편안해지는 순간.

```
cozy winter ambient, soft felt piano with gentle music box accents, warm analog tape
texture, slow and sparse melody, snow falling outside a warm room at night, intimate
and nostalgic, subtle vinyl hush, quiet acoustic guitar harmonics, 58 bpm, instrumental,
melancholic but comforting, consistent dynamics, no dramatic build-ups, no drums,
no fireplace crackle, seamless background loop feel
```

## 2. 「죽은 도시의 오후」 — Gloomy 풀 확충

- **편입**: Gloomy 풀(현 5곡). ash(재) 날씨·흐린 낮의 기본 정서.
- **파일명 제안**: `Gloomy6.mp3`
- **의도**: 창밖 죽은 도시를 바라보는 시선. 황량하지만 무섭지 않게 — 공포가 아니라 적막.
  단파 라디오·카세트 퓨처리즘 정체성을 static 질감으로 살짝만.

```
desolate post-apocalyptic ambient, cold evolving synth pads, sparse detuned piano notes
with long reverb tails, faint shortwave radio static texture, distant wind over an empty
snowed-in city, vast and lonely but strangely peaceful, cinematic minimalism, very slow,
48 bpm, instrumental, quiet melancholy without horror, consistent dynamics, no dramatic
build-ups, no percussion, seamless background loop feel
```

## 3. 「불타는 해협」 — 동부/노을 비축 (2.0 「응답」)

- **편입**: 신규 채널(동부 지역 전용 풀 — 2.0 유입 시 배선) 또는 당장은 Random_evening 후보.
- **파일명 제안**: `East_sunset1.mp3`
- **의도**: 동부 아트 디렉션 정본(붉은 노을 팔레트·황폐 속의 온기) 그대로 —
  금문교 비네트 「불타는 해협」의 음악판. 손끝 기타가 이끄는 쓸쓸한 희망.

```
emotional fingerstyle acoustic guitar, post-apocalyptic americana, warm analog string
swells underneath, golden red sunset over a ruined bridge and ocean, hopeful sorrow,
sparse and breathing arrangement, soft round bass notes, gentle humming resonance,
68 bpm, instrumental, bittersweet and tender, consistent dynamics, restrained climax,
no drums, seamless background loop feel
```

---

## 변주 팁

- 같은 프롬프트로 2~3회 생성해 베스트 픽 — Suno는 시드마다 편차가 크다.
- 풀 확충은 "같은 프롬프트 + 악기 하나 교체"가 효율적: 1번의 felt piano → `soft rhodes`,
  2번의 detuned piano → `glass harmonics`, 3번의 guitar → `weathered upright piano`.
- 추가 수요 후보(오더 시 프롬프트 즉시 제작): Main_theme 리메이크 · Cat 트랙 변주(고양이 당첨일 전용) ·
  Raining 풀 확충 · 엔딩 크레딧 변주.
