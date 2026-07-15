# Nine Winters — GPT 이미지 "AI 슬롭" 회피 가이드

> **계기**: 상인(`ev_trader`) 인카운터 일러가 "중간에 상인 이미지 너무 AI 슬롭처럼 보여서 다시 뽑는 게 나을 듯"이라는 피드백을 받음 (112.145, 2026-07-14). "다른 건 적당히 분위기 맞아서 나쁘지 않은데" = 슬롭 문제는 상인 컷에 국한.
> **방법**: 웹 리서치(OpenAI 공식 프롬프트 가이드 · 게임개발 안티슬롭 · 슬롭 텔 분석 · 픽셀아트 후처리) + 실제 에셋 `ev_trader.png` vs `ev_cat.png` 실증 대조 + 매니페스트 프롬프트 감사.
> **대상 파이프라인**: `tools/art-gen.mjs`(gpt-image-2→1 폴백) · `tools/art-brief.mjs`(ChatGPT 수동) · `assets-src/art/manifest.json`(styleAnchor + 178 에셋).
> 인용 출처는 문서 맨 아래 §8.

---

## 0. 한 줄 결론

상인이 **유독** 슬롭으로 보이는 건 우연이 아니라 두 원인이 겹친 결과다.

1. **세트 질감 이탈** — 다른 컷(`ev_cat` 등)은 픽셀·디더링 질감이 살아 "의도된 픽셀아트"로 읽히는데, 상인 컷은 그 질감이 날아가 **매끈한 제네릭 코지 페인터리**(수천 장의 AI 이미지가 공유하는 그 룩)가 됐다.
2. **캐릭터 클로즈업** — 상인은 얼굴·손·복제된 냄비 더미가 화면 중앙에 있는 인물 컷이라, AI가 **가장 취약한 텔**(얼굴/손/해부/반복 클로닝)이 정면에 노출됐다. 환경 컷은 이 텔을 숨긴다.

그리고 이 둘의 **시스템적 뿌리**는 매니페스트 프롬프트 자체의 모순이다: `"Cozy pixel art illustration ... painterly pixel scene"` — **pixel과 painterly를 동시에 요구**하니 모델은 더 쉬운 painterly로 수렴한다.

**고치는 3레버**: (A) 진짜 픽셀화 **후처리**로 세트 질감을 강제 통일(§4·가장 싸고 확실), (B) 대면 인물 컷은 **실루엣·후면·원경**으로 텔을 숨김(§3.2·§6), (C) 잘 나온 컷(`ev_cat`)을 **레퍼런스로 먹여** 일관성 강제(§3.4).

---

## 1. 진단 — 왜 상인만 슬롭인가 (실증 대조)

두 에셋을 실제로 비교했다. 같은 파이프라인·같은 styleAnchor인데 결과가 갈렸다.

| 항목 | `ev_cat.png` (통과) | `ev_trader.png` (슬롭) |
|---|---|---|
| 픽셀·디더 질감 | **뚜렷** — 낙엽·바닥에 픽셀 그리드와 디더링이 보임 | **소실** — 매끈한 에어브러시 페인팅, 픽셀감 거의 없음 |
| 주피사체 | 환경(아치문·낙엽 마당), 고양이는 **뒷모습**(얼굴 없음) | **인물 클로즈업** — 후드 얼굴·손·랜턴 |
| AI 텔 노출 | 거의 없음(얼굴·손 없음, 오브젝트 개별 분리) | **다수** — 냄비/팬이 복제된 뭉개진 덩어리(반복 클로닝), 후드 속 얼굴·손 뭉갬 |
| 조명 | 창 하나의 앰버 + 나머지 냉색 대비 | 전역 앰버 블룸/HDR 글로우 = 제네릭 AI "코지" |
| 읽히는 인상 | "의도된 픽셀아트 일러" | "AI가 뽑은 코지 포스트아포 컨셉아트" |

**결론**: `ev_cat`이 통과하는 이유는 (a) 픽셀 질감이 살아 스타일이 의도적으로 읽히고, (b) 얼굴·손이 없는 환경 컷이라 텔이 숨는다. `ev_trader`는 그 반대 — 질감이 날아가고 텔이 노출됐다. **즉, 상인 개별 컷을 "다시 뽑는" 것만으로는 재발 위험이 크다. 세트 질감 통일(§4) + 인물 컷 문법(§3.2)을 같이 손대야 근본 해결.**

### 1.1 매니페스트 프롬프트 감사 (시스템 원인)

현재 `ev_trader` 프롬프트:
```
A hooded peddler stacked high with pots and pans standing in a ruined street at dusk in light rain,
lantern glow, bare wet ground. Cozy pixel art illustration, cinematic isometric-leaning angle,
warm candlelight against a muted neutral dusk, no snow, soft dithering, muted post-apocalyptic palette,
painterly pixel scene, no text, no UI, no frame.
```
문제 세 가지:
1. **`pixel art` ↔ `painterly pixel scene` 모순** → gpt-image는 더 쉬운 painterly로 감. (현행 매니페스트의 공통 styleAnchor 자체에는 painterly가 없다 — "cozy pixel art, isometric, … soft dithering, no text". painterly는 ev_trader 등 개별 에셋 프롬프트에 박혀 있으므로, 리스크는 해당 프롬프트군에 국한되고 교정 대상도 개별 프롬프트다.)
2. **`stacked high with pots and pans`** → 반복 오브젝트를 대량으로 요구 = AI 클로닝 텔의 초대장. 뭉개진 냄비 덩어리가 여기서 나온다.
3. **후드 인물 클로즈업 + 얼굴/손 암시** → 텔 최다 노출 영역인데 카메라가 정면에 둠.

---

## 2. 리서치 — "AI 슬롭"의 정체와 회피 원리

### 2.1 슬롭의 시각적 텔 (= 피해야 할 목록)

여러 소스가 공통으로 지목하는 "AI가 뽑았다"를 들키는 신호들 (euronews, weam, 위키피디아 AI slop):

- **과도한 매끄러움** — 모공·결·미세 질감이 날아간 왁스 같은 표면. *(우리 상인: 얼굴·천·바닥이 다 매끈)*
- **반복·클로닝** — 배경 패턴/군중/오브젝트가 거의 동일하게 복제됨. *(우리 상인: 냄비 더미)*
- **광원 불일치·균일 발광** — 그림자·반사가 광원과 안 맞고 전체가 균일하게 빛남(HDR 블룸). *(우리 상인: 전역 앰버)*
- **손·손가락 이상**, **좌우 대칭 과잉**, **뭉개진 텍스트**, **맥락 부정합**(있어야 할 게 없거나 반대).
- **디지털 노이즈 실종** — 저조도인데 그레인이 없거나 노이즈가 부자연스럽게 균일.

### 2.2 왜 캐릭터 컷이 특히 위험한가

환경·정물 컷은 텔을 숨기고, **인물 클로즈업은 텔(얼굴·손·해부)을 정면에 드러낸다.** 게임개발 안티슬롭 가이드(StraySpark)의 원칙: **"저우선 배경 에셋은 가벼운 손질로 되지만, 히어로 콘텐츠는 60–80% 인간 개입 또는 인간 제작이 필요하다."** Nine Winters 인카운터 중 **대면 인물군**(상인·염료상인·밀수꾼·도둑·낯선이·떠돌이)이 정확히 이 고위험군이다. → 이 그룹만 별도 문법으로 다뤄야 한다(§3.2).

### 2.3 "다들 같은 툴을 같은 방식으로 써서 다 똑같아 보인다"

OpenArt의 안티슬롭 정리 요지: *대부분의 AI 이미지가 똑같아 보이는 건 같은 프롬프트·같은 워크플로·같은 기본값을 쓰기 때문.* 슬롭 탈출의 본질은 **기본값에서 벗어나 의도적으로 만드는 것** — 구체 지정, 레퍼런스, 후처리, 큐레이션.

---

## 3. gpt-image 안티슬롭 프롬프트 기법

### 3.1 SPECS 구조로 프롬프트를 짠다 (weam)

막연한 형용사 나열 대신 5요소를 명시: **S**ubject(구체 묘사) · **P**ose(자세/보디랭귀지) · **E**xpression(표정/감정) · **C**omposition(1/3 법칙·네거티브 스페이스·프레이밍) · **S**tyle(구체적 매체·기법). "소원 목록을 던지지 말고 설계도를 줘라."

### 3.2 대면 인물 컷 전용 문법 (텔 숨기기 — 이 게임의 핵심)

인물 인카운터는 **얼굴·손을 화면에서 빼거나 축소**한다:
- **실루엣 / 역광(backlit) / 후면·¾ 후면 / 원경 / 후드 그림자로 얼굴 가림.** 세계관 정합에도 유리 — WORLDVIEW의 "둘러싸였으나 혼자, 타인은 스치고 흐른다"는 톤과 **인물을 가까이 두지 않는 연출**이 오히려 맞다.
- **반복 오브젝트는 "few, distinct, individually readable"** — "stacked high" 같은 대량 반복 지정 금지.
- 카메라를 **환경 중심(environment-forward)**으로, 인물은 프레임에서 작게. (`ev_cat`이 통과한 바로 그 프레이밍.)

### 3.3 구체성·재질·조명·카메라 언어 (OpenAI 공식 가이드)

- **재질/질감을 명명**: "낡은 사람" 대신 "풍화된 피부, 주름·모공·햇볕 결". 재질을 구체화하면 매끈함이 깨진다.
- **매체를 명시해 룩을 고정**: photorealistic / watercolor / 3D render / **16-bit pixel art** 등 — 우리 경우 픽셀아트를 **강하게** 못 박아야 한다(§4).
- **조명을 방향·질·시간대로 지정**: "rim lighting", "one warm light source", "diffused dusk" — 그래야 모델이 무드를 표면 매끈함과 바꿔치기하지 않는다.
- **보존 불변량을 명시**하고 반복 수정 때마다 재기입: "preserve identity/geometry/layout, do not add elements".

### 3.4 레퍼런스 이미지 + `input_fidelity`로 일관성 강제 (fal.ai / edit endpoint)

gpt-image의 **edit(이미지 입력) 엔드포인트**는 텍스트만으로 안 되는 일관성을 준다. **잘 나온 컷(`ev_cat`)을 레퍼런스로 넣고** "같은 픽셀아트 스타일·디더링·팔레트로, 단 장면은 …"이라고 지시하면 세트 질감이 전이된다. `input_fidelity: high`면 스타일/구도를 강하게 보존, `low`면 자유 변주. → **캐릭터·스타일 일관성이 필요할 때 high.**

### 3.5 불완전함 키워드 + 네거티브 (promptaa)

- **추가**: "slight asymmetry", "weathered", "natural texture", "chipped paint", "hand-made imperfection".
- **네거티브(명시적 배제)**: `no plastic sheen, no glossy skin, no HDR bloom, no lens glow, no airbrushed gradients, no cloned/repeated objects, no smooth digital painting`.

### 3.6 반복 단일수정 (OpenAI)

한 프롬프트에 다 욱여넣지 말고, **깨끗한 베이스 → 한 번에 하나씩** 수정("same style as before, but the pots are fewer and read individually"). 과부하 프롬프트가 뭉개짐을 키운다.

---

## 4. 픽셀아트 강제 — 이 게임의 최우선 레버

**핵심 사실**: gpt-image는 "pixel art"라고 써도 **진짜 픽셀을 안 준다.** 매끈한 페인팅에 픽셀 흉내만 낸다(= 상인 컷). 진짜 픽셀 질감은 **후처리로 강제**하는 게 업계 정석이다.

**파이프라인(생성 후):** 원본 → **다운스케일**(예: 가로 320~480px, box/area 필터) → **팔레트 양자화**(예: 24~32색, 게임 공통 팔레트로 고정) → (옵션) **nearest 업스케일**로 목표 크기 복원. 이렇게 하면 매끈한 AI 페인팅도 **모든 컷이 동일한 진짜 픽셀 그리드·팔레트**를 공유하게 되어, "상인만 튀는" 문제 자체가 구조적으로 사라진다.

- 도구: **Lospec Pixel Art Scaler**(웹, 즉시), **proper-pixel-art**(GitHub, AI 픽셀아트 교정), **Pixelera 다운스케일 가이드**(기법 설명). §8 링크.
- **전략적 이점**: 게임 본편 렌더가 **복셀 + 픽셀화 포스트프로세싱**(양자화/디더링, PROJECT.md §2)인데, 인카운터 일러도 진짜 픽셀로 통일하면 **"게임에 끼워넣은 AI 그림"** 인상이 사라지고 게임 DNA와 붙는다. 지금 상인이 튀는 근본 이유가 바로 이 질감 불일치다.

### 4.1 `art-ingest.mjs`에 픽셀화 패스 추가 (제안 스텁)

현재 ingest는 크롭·리사이즈만 한다. 여기에 양자화 다운스케일 스텝을 옵션으로 추가하면 전 인카운터에 자동 적용된다. `sharp` 기준 개념 스케치:

```js
// 생성 이미지 → 진짜 픽셀 질감 통일 (개념 스텁, sharp)
// npm i sharp  (이미 electron-builder 계열과 별개, dev 의존)
import sharp from 'sharp';

async function pixelize(srcPath, outPath, { downW = 384, colors = 32, targetW = 1536 } = {}) {
  // 1) 다운스케일(area 평균) → 미세 디테일·매끈함 붕괴
  const small = await sharp(srcPath).resize({ width: downW, kernel: 'cubic' }).toBuffer();
  // 2) 팔레트 양자화(공통 팔레트 근사) — PNG 팔레트 모드로 색 수 고정
  const quant = await sharp(small).png({ palette: true, colours: colors, dither: 0.6 }).toBuffer();
  // 3) nearest 업스케일로 목표 크기 복원(픽셀 각 유지)
  await sharp(quant).resize({ width: targetW, kernel: 'nearest' }).png().toFile(outPath);
}
```
> 파라미터(downW/colors/dither)는 `ev_cat`의 픽셀 밀도에 맞춰 1~2회 튜닝. 공통 팔레트 파일을 만들어 전 컷을 거기에 양자화하면 세트 통일도가 최고가 된다.

---

## 5. Nine Winters 인카운터 아트 체크리스트

**생성 전**
- [ ] styleAnchor에서 **`painterly` 계열 문구 제거**, 픽셀 스펙 명시(§6 v2 문안).
- [ ] 대면 인물 컷인가? → 실루엣/후면/원경/후드그림자로 **얼굴·손 최소화**.
- [ ] 반복 오브젝트를 **few·distinct·readable**로 지정(대량 "stacked high" 금지).
- [ ] 광원 **1개** 지정 + 나머지 냉색 그림자(전역 블룸 억제).
- [ ] 네거티브 배제구 포함(no plastic sheen / bloom / lens glow / cloned objects / smooth painting).

**생성 후**
- [ ] **픽셀화 후처리** 통과(다운스케일 + 팔레트 양자화) — 세트 질감 통일(§4).
- [ ] **4장 뽑아 큐레이션**, 제일 안 튀는 1장 선택(기본값 1장 채택 금지).
- [ ] **fresh-eyes 테스트** — 프로젝트 모르는 사람에게 "이거 AI 같아?" 물어보기(StraySpark).
- [ ] 인게임 배치 후 인접 컷과 나란히 재검(고립 검수 통과가 배치 통과는 아님).

---

## 6. 상인 재생성 — before → after 프롬프트 + 워크플로

### 6.1 styleAnchor v2 (매니페스트 공통 앵커 교체 문안)

```
Nine Winters encounter illustration — 16-bit pixel art with visible chunky pixels and ordered
dithering, a limited ~32-colour muted post-apocalyptic palette, isometric-leaning cinematic scene,
ONE warm light source (candle or lantern) glowing against a cold blue-grey dusk, environment-forward
composition with readable silhouettes. NOT smooth, NOT painterly, NOT a digital painting, no airbrushed
gradients, no HDR bloom, no lens glow, no cloned repeated objects, no text, no UI, no frame.
```
> 변화 핵심: `painterly` 삭제 → **pixel art를 단호하게**, 그리고 "NOT smooth/painterly/digital painting"을 네거티브로 못 박음.

### 6.2 `ev_trader` 개정 프롬프트 (텔 숨기기 버전)

```
A hooded peddler seen mostly from behind and to one side, face lost in hood shadow, trudging away down
a ruined street at dusk in light rain. On a tall back-frame ride a FEW distinct, individually readable
pots and a single kettle (not a dense pile). One lantern casts a single pool of warm light on the wet
cobbles; the rest of the street falls into cold blue-grey shadow, small ruined skyline behind.
16-bit pixel art, chunky visible pixels and ordered dithering, limited ~32-colour muted post-apocalyptic
palette, isometric-leaning cinematic angle, environment-forward with the figure small in frame.
NOT smooth, NOT painterly, no airbrushed gradients, no HDR bloom, no lens glow, no cloned repeated pots,
no visible face detail, no text, no UI, no frame.
```
> 3대 수정: ①인물을 **후면·후드그림자·프레임에서 작게** → 얼굴/손 텔 제거. ②냄비 **few·distinct**로 → 클로닝 텔 제거. ③**pixel 스펙 강화 + painterly 네거티브**.

### 6.3 (권장) 레퍼런스 일관성 루트 — `ev_cat`을 스타일 레퍼런스로

텍스트만으로 픽셀 질감이 또 날아갈 수 있으니, **edit 엔드포인트**로 `ev_cat.png`를 레퍼런스로 넣고:
```
Using the pixel-art style, dithering, palette and pixel density of the reference image, create a NEW
scene: a hooded peddler seen from behind with a few readable pots on a back-frame, walking away down a
rain-wet ruined street at dusk, one lantern pool of warm light. Keep the exact same 16-bit pixel texture
as the reference. Environment-forward, figure small. No smooth painting, no bloom, no text.
```
`input_fidelity: high`. → 세트의 실측 질감이 전이돼 "튀는 컷"이 원천 차단.

### 6.4 후처리 + 큐레이션
1. 위 프롬프트로 **4장** 생성(art-gen.mjs `--force ev_trader` 반복 또는 ChatGPT 4회).
2. 각 장 **픽셀화 패스**(§4.1) 통과 — `ev_cat` 픽셀 밀도에 맞춰 downW/colors 튜닝.
3. 4장을 나란히 놓고 **fresh-eyes 1장 선택**. 얼굴/손/냄비 뭉갬이 안 보이는 컷 우선.
4. 인게임 인카운터 모달에 배치 후 인접 컷과 재검.

---

## 7. 파이프라인 반영 제안 (선택, 점진 적용)

| 대상 | 변경 | 효과 |
|---|---|---|
| `manifest.json` `styleAnchor` | §6.1 v2 문안으로 교체 (painterly 제거·pixel 강화) | 세트 전체의 시스템적 슬롭 리스크 제거 |
| `manifest.json` 대면 인물군 프롬프트 | trader·dye_merchant·smuggler·thief·wanderer·coldsnap_stranger를 "후면/실루엣/원경 + few objects"로 리라이트 | 고위험군 텔 숨김 |
| `art-ingest.mjs` | §4.1 픽셀화 패스 추가(옵션 플래그) + 공통 팔레트 파일 | 전 컷 진짜 픽셀·팔레트 통일 → 개별 컷 튐 방지 |
| `art-gen.mjs` | 인물 인카운터 id군에 네거티브 배제구 자동 주입 | 재생성 시 텔 억제 기본값화 |
| 운영 | 큐레이션(4→1) + fresh-eyes 게이트를 art 워크플로에 명문화 | 기본값 1장 채택으로 인한 슬롭 유입 차단 |

> COMMS-KIT §2 정합: "스크린샷·GIF·트레일러 주인공은 항상 인게임 복셀 씬, 생성 일러는 마케팅 전면에 세우지 않는다"와도 맞물린다 — 인카운터 일러는 인게임 보조재이므로, **진짜 픽셀화로 게임 룩에 흡수**시키는 것이 노출 리스크까지 줄인다.

---

## 8. 인용 소스

- OpenAI 공식 — GPT Image 모델 프롬프트 가이드(구체성·재질·조명·카메라 언어·불변량 보존·반복 단일수정): https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- fal.ai — GPT Image 1.5 프롬프트 가이드(edit 엔드포인트·`input_fidelity`·레퍼런스 일관성): https://fal.ai/learn/devs/gpt-image-1-5-prompt-guide
- weam — Why Your AI Images Look Like "AI Slop" (SPECS 프레임워크): https://opensource.weam.ai/blog/guide/ai-image-generation/ai-images/
- promptaa — 이미지를 덜 가짜처럼 보이게 하는 프롬프트 키워드(불완전함 키워드·네거티브): https://promptaa.com/blog/prompt-key-words-to-make-images-less-fake-looking
- OpenArt — The Anti-Slop Playbook(같은 프롬프트·워크플로·기본값 = 같은 룩): https://openart.ai/blog/how-to-avoid-ai-slop/
- Euronews — AI 슬롭 시각적 텔 식별 가이드: https://www.euronews.com/next/2025/02/16/ai-slop-is-flooding-the-internet-this-is-how-can-you-tell-if-an-image-is-artificially-gene
- StraySpark — AI Slop in Game Development(팔레트/조명 정합·히어로 60–80% 인간 개입·큐레이션·fresh-eyes): https://www.strayspark.studio/blog/ai-slop-game-development-using-ai-responsibly
- Lospec Pixel Art Scaler(웹 다운스케일·리컬러): https://lospec.com/pixel-art-scaler/
- proper-pixel-art(AI 픽셀아트 교정, GitHub): https://github.com/KennethJAllen/proper-pixel-art
- Pixelera — How to Scale Down Pixel Art(기법 딥다이브): https://pixelera.art/blog/how-to-scale-down-pixel-art

> 진단 근거 에셋(로컬): `public/img/events/ev_trader.png`(슬롭), `public/img/events/ev_cat.png`(통과 대조), `assets-src/art/manifest.json` styleAnchor 및 ev_trader 프롬프트.
