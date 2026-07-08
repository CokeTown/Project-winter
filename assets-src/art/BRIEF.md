# Nine Winters — 아트 브리프 (ChatGPT 수동 생성용)

> 이 문서는 `tools/art-brief.mjs`가 `assets-src/art/manifest.json`에서 자동 생성했습니다.
> 각 카드의 프롬프트를 ChatGPT(GPT Pro, 이미지 생성)에 그대로 붙여넣어 이미지를 만드세요.
> 생성된 이미지는 `{id}.png` 파일명으로 저장해 `assets-src/art/incoming/`에 넣고,
> 그 다음 `node tools/art-ingest.mjs`를 실행하면 목표 크기로 자동 크롭·리사이즈되어 배치됩니다.

## 공통 스타일 앵커

아래 문단은 모든 에셋 프롬프트에 공통으로 깔리는 무드/스타일 기준입니다. 개별 프롬프트에 이미 녹여져 있지만, ChatGPT가 스타일을 벗어난 결과를 낼 경우 이 문장을 강조해서 다시 요청하세요.

```
Nine Winters key art style anchor: a dark, ruined post-apocalyptic isometric container-room shelter,
warm candlelight glowing orange inside against a cold blue-grey twilight outside, pixel art with soft
dithering, gentle falling snow. cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text
```

---

## steam_main_capsule

- **용도**: Steam 상점 메인 캡슐 이미지 (상점 페이지 최상단 배너)
- **목표 크기**: 616x353 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_main_capsule.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Isometric cutaway view of a single cozy shipping-container shelter room at dusk, aspect ratio close to 16:9 (compose for a 1536x1024 canvas that will be cropped to 616x353). A warm candle and a lantern glow orange on a nightstand beside a neatly made bed with a patchwork quilt, casting soft light across a wooden crate, a small bookshelf, and a rag rug. Outside the open container wall, a snowstorm falls over a ruined post-apocalyptic city skyline silhouetted in cold blue-grey twilight. Strong warm-vs-cool color contrast: glowing orange candlelight interior against desaturated blue dusk exterior. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text. Title text 'NINE WINTERS' in chunky pixel font, placed in open sky space in the upper-left third so it won't be cropped.
```

생성 후 `steam_main_capsule.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_small_capsule

- **용도**: Steam 작은 캡슐 이미지 (검색 결과·위시리스트 목록용 축소 썸네일)
- **목표 크기**: 231x87 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_small_capsule.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Very compact wide isometric diorama of a tiny shelter room corner: a single candle on a crate glowing warm orange, silhouette of a container wall and a hint of snow falling just outside a gap, cold blue dusk visible through the opening. Keep the composition extremely simple and legible at very small size (this will be shown as a tiny 231x87 thumbnail) — one strong warm light source, high contrast, minimal clutter, no fine detail that would disappear when shrunk. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text. Title text 'NINE WINTERS' in chunky pixel font in a clear sky area.
```

생성 후 `steam_small_capsule.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_header

- **용도**: Steam 상점 헤더 캡슐 (커뮤니티 허브/상점 상단 와이드 배너)
- **목표 크기**: 460x215 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_header.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Wide isometric shelter scene at dusk: the same cozy container room as the game's icon art, viewed slightly wider to show two furnished corners (a bed with candle nightstand on one side, a small stove and stacked crates on the other), warm orange candle and firelight glow filling the interior. Outside the container's open side, distant ruined skyline and leafless trees stand against a cold blue-grey twilight sky, gentle snow falling. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text. Title text 'NINE WINTERS' in chunky pixel font in the open sky, upper portion of frame.
```

생성 후 `steam_header.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_library

- **용도**: Steam 라이브러리 세로 카드 아트 (내 라이브러리 목록에 표시되는 세로형 포스터)
- **목표 크기**: 600x900 (생성 비율: 1024x1536, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_library.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Tall vertical portrait composition (1024x1536) of a cozy shelter interior seen through a frost-edged container window. Inside: a windowsill with a small potted plant, a stray orange tabby cat curled up asleep on a folded blanket, and a lit candle in a jar casting warm orange light across the sill and the cat's fur. Through the window glass, falling snow and a distant ruined city skyline glow faintly under a deep cold blue dusk sky, a few lit windows flickering in the far buildings. Reflections and light dithering on the window glass. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text.
```

생성 후 `steam_library.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_hero

- **용도**: Steam 페이지 최상단 히어로/배경 이미지 (초대형 와이드 파노라마)
- **목표 크기**: 3840x1240 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_hero.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Ultra-wide panoramic skyline (compose loosely and centrally so it can be cropped to a 3840x1240 letterbox band) of a ruined post-apocalyptic city at dusk, seen from a snowy rooftop or hillside. Scattered among the broken buildings and skeletal trees, a handful of makeshift container shelters glow with warm orange candlelight in their windows, small beacons of life in the cold blue-grey twilight. Heavy snowfall drifts across the whole scene, soft atmospheric haze in the distance, silhouetted power lines and rubble in the foreground. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text. Keep the vertical center third free of large silhouettes so a wide crop remains readable.
```

생성 후 `steam_hero.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_logo

- **용도**: Steam 로고 이미지 (투명 배경, 게임 타이틀 로고타입 전용)
- **목표 크기**: 1280x720 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_logo.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Standalone game logo artwork only, transparent background, no scene, no room, no characters. Chunky pixel-font wordmark reading 'NINE WINTERS', styled to evoke cozy pixel art warmth against cold — the letters lit as if by warm candlelight (soft orange gradient with subtle flame-like highlights) with a thin frosty blue-white outline or drop shadow suggesting cold dusk, tiny pixel snowflakes drifting around the letters, soft dithering on the gradients. Title text 'NINE WINTERS' in chunky pixel font, this IS the entire image — no background scenery, background must be transparent/empty.
```

생성 후 `steam_logo.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## play_feature

- **용도**: Google Play 스토어 피처 그래픽 (스토어 리스팅 상단 와이드 배너)
- **목표 크기**: 1024x500 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/play_feature.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Wide isometric shelter scene at dusk, similar mood to the game's icon: a cozy container room with a candlelit bed and nightstand, warm orange glow spilling out through the open side of the container into a cold blue-grey twilight exterior with gentle falling snow and a faint ruined skyline in the distance. Compose with the main warm light source roughly centered so it reads well as a wide store banner. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text. Title text 'NINE WINTERS' in chunky pixel font in open sky space.
```

생성 후 `play_feature.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## android_splash

- **용도**: Android 스플래시 화면 (중앙 1/3 안전영역에 핵심 구도 배치, 정사각 대형)
- **목표 크기**: 2732x2732 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/android_splash.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Square composition (1024x1024) with the entire important content — a single glowing candle in a lantern sitting on a wooden crate, warm orange light pooling around it — tightly centered within the middle third of the frame, since outer edges will be cropped aggressively on various phone screens. Surrounding the central candle, keep the outer regions simple and dark: a softly blurred cold blue-grey dusk gradient with a few falling snowflakes, almost no other detail near the edges. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text.
```

생성 후 `android_splash.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## title_bg

- **용도**: 게임 타이틀 화면 배경 후보 (메인 메뉴 뒤 풀스크린 배경)
- **목표 크기**: 1920x1080 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/title_bg.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Full-scene isometric view of the shelter room from the game's icon, pulled back slightly to show more of the surrounding ruined exterior: broken power lines, bare trees, distant crumbling skyline under a cold blue-grey dusk sky, heavy soft snowfall throughout. Inside the open container, warm orange candlelight and a lantern illuminate a bed, crate, and small shelf, glowing invitingly against the cold outside. Leave calm, less-detailed areas near the top and sides suitable for a title menu UI to overlay later. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text.
```

생성 후 `title_bg.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## press_key_art

- **용도**: 보도자료/프레스킷용 키 아트 (리뷰어·기자에게 배포하는 대표 이미지)
- **목표 크기**: 1920x1080 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/press_key_art.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Widescreen isometric key art establishing the whole game concept: a lone furnished shipping-container shelter sits amid rubble and bare trees on a snowy ruined street at dusk, its open side glowing warm orange with candlelight, a wisp of chimney smoke rising, while the cold blue-grey twilight sky above is thick with falling snow and a hint of a distant devastated skyline. Composition should read clearly as a single strong hero image suitable for press coverage, balanced framing, clear silhouette of the shelter against the sky. Cozy pixel art, isometric, warm candlelight against cold blue dusk, falling snow, soft dithering, no text.
```

생성 후 `press_key_art.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## paper_note_bg

- **용도**: 인게임 종이 메모 배경 텍스처 (그 위에 텍스트를 얹는 UI용 바탕)
- **목표 크기**: 1024x1024 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/paper_note_bg.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A single sheet of very old ruled writing paper filling the entire square frame, photographed flat — a page torn from a survivor's worn notebook. Pale desaturated ivory and light gray-beige tones (NOT orange, NOT sandy, low saturation), with clearly visible fine paper fiber texture running through the sheet. Faint, barely-visible horizontal ruled lines in washed-out blue-gray across the page (old notebook ruling, very subtle), and one faded vertical margin line near the left edge. The page has been folded twice long ago: soft cross-shaped fold creases with slight shadowing along them. Age spots (foxing), one faint coffee-ring stain near a corner, gently darkened and worn torn edges, subtle vignette toward the borders. Keep the central area flat and clean for UI text overlay. Realistic aged-paper material study, soft even light, no text, no handwriting, no ink marks — blank ruled paper only, no uniform grain or noise.
```

생성 후 `paper_note_bg.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## journal_cover

- **용도**: 생존 수첩(도감/일지) 커버 아트 — 인게임 저널/도감 화면 표지
- **목표 크기**: 1024x1536 (생성 비율: 1024x1536, fit: cover)
- **배치 경로**: `assets-src/art/out/journal_cover.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A worn old leather-bound survivor's journal cover filling a tall vertical frame, resting against a dark, softly shadowed background. Cracked, weathered brown leather with scuffed corners and a visible spiral/ring binding along one edge, a frayed strap or elastic band wrapped around it, small scorch marks and stains suggesting it's been carried through the ruins for a long time. A hint of warm candlelight falls across the cover from one side, catching the leather's texture and the metal spiral binding, while the surrounding background fades into cold dark shadow — reminiscent of a Resident Evil-style notebook item icon. Weathered, crumpled-paper-adjacent grime, post-apocalyptic survivor's note aesthetic, warm candlelight tone, subtle pixel-art grain and soft dithering, no text, no title lettering on the cover.
```

생성 후 `journal_cover.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## tip_scrap

- **용도**: 인게임 Tip 팝업용 찢어진 종이 조각 (텍스트 배경, 투명 배경 요청)
- **목표 크기**: 1024x1024 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/tip_scrap.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A single small torn scrap of very old ruled notebook paper centered on a fully transparent background, irregular ragged hand-torn edges on every side with rough fibrous tear texture — no straight cut sides anywhere. Pale desaturated ivory and light gray-beige paper (NOT orange, NOT sandy, low saturation) with visible fine paper fibers and two or three faint washed-out blue-gray ruled lines crossing the scrap (remnants of old notebook ruling, very subtle). One soft fold crease, small age spots near an edge, slightly darkened worn borders. Keep the central area clean and even so short tip text can be placed over it. Realistic aged-paper material, soft even light, no text, no handwriting. Background must be transparent/empty, not white.
```

생성 후 `tip_scrap.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## event_card_frame

- **용도**: 인카운터 이벤트 일러스트용 프레임 (중앙은 비우고 테두리만, 위에 씬 아트를 합성)
- **목표 크기**: 1536x1024 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/event_card_frame.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A decorative frame/border for an encounter event illustration, designed so the wide center area is left empty (plain, neutral, near-transparent-looking dark or blank space) for another scene image to be composited underneath later. Around that empty center, render a heavy dark vignette fading in from all edges, styled like an old weathered Polaroid photo border crossed with a torn survivor's note: soft rounded photo-corner shapes, faint scorch and water-stain marks along the border, subtle rough torn-paper texture at the outer edge, a warm candlelight tone glowing faintly at the frame's inner edge where it meets the empty center. Weathered, crumpled paper, post-apocalyptic survivor's note aesthetic, warm candlelight tone, subtle pixel-art grain, soft dithering, no text.
```

생성 후 `event_card_frame.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_food

- **용도**: UI 아이콘: res_food
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_food.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bright red apple with a green leaf. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_food.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_canned

- **용도**: UI 아이콘: res_canned
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_canned.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a tin can with a bright red-and-cream label and shiny silver lid. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_canned.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_water

- **용도**: UI 아이콘: res_water
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_water.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a vivid clear blue water droplet with a white highlight. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_water.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_cloth

- **용도**: UI 아이콘: res_cloth
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_cloth.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a folded stack of warm cream and sky-blue cloth. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_cloth.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_candle

- **용도**: UI 아이콘: res_candle
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_candle.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a white candle with a bright warm orange flame. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_candle.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_battery

- **용도**: UI 아이콘: res_battery
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_battery.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a battery with bright green body and copper gold top. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_battery.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_fuel

- **용도**: UI 아이콘: res_fuel
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_fuel.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bright red jerry fuel can with yellow cap. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_fuel.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_parts

- **용도**: UI 아이콘: res_parts
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_parts.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a shiny steel gear with a bright orange-handled wrench crossed behind. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_parts.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_material

- **용도**: UI 아이콘: res_material
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_material.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
warm honey-colored wooden planks stacked with a red brick. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_material.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_bandage

- **용도**: UI 아이콘: res_bandage
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_bandage.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a white bandage roll with a red cross tag. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_bandage.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_antiseptic

- **용도**: UI 아이콘: res_antiseptic
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_antiseptic.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an amber glass antiseptic bottle with a bright teal label and red cross. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_antiseptic.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_painkiller

- **용도**: UI 아이콘: res_painkiller
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_painkiller.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a white pill bottle with a red cap and two white pills. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_painkiller.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_g_hunger

- **용도**: UI 아이콘: g_hunger
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_g_hunger.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bowl of hearty orange-red stew with steam, on a warm wooden bowl. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_g_hunger.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_g_thirst

- **용도**: UI 아이콘: g_thirst
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_g_thirst.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bright blue metal canteen with a water droplet badge. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_g_thirst.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_g_energy

- **용도**: UI 아이콘: g_energy
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_g_energy.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a vivid golden-yellow lightning bolt with white core. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_g_energy.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_explore

- **용도**: UI 아이콘: act_explore
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_explore.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A bright red hiking backpack seen straight from the front, chunky and symmetrical, two shoulder straps visible at the sides, one big front pocket with a buckle, a tan rolled-up blanket strapped horizontally on top. Cozy pixel art game icon, single object centered and FILLING 90% of the frame, fully transparent background, bright saturated colors with strong contrast, bold 2px dark outline, simple readable silhouette at 24px, soft top-left light, no text, no frame.
```

생성 후 `icon_act_explore.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_move

- **용도**: UI 아이콘: act_move
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_move.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a cozy little house with warm yellow glowing window and red roof. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_move.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_craft

- **용도**: UI 아이콘: act_craft
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_craft.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a claw hammer with orange handle crossed over a saw with red handle. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_craft.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_clean

- **용도**: UI 아이콘: act_clean
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_clean.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a straw broom with golden-yellow bristles and a blue band. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_clean.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_sleep

- **용도**: UI 아이콘: act_sleep
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_sleep.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bed with a bright blue quilt and white pillow, warm wooden frame. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_sleep.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_journal

- **용도**: UI 아이콘: act_journal
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_journal.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a warm brown leather journal with a golden clasp and a red pencil. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_journal.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_act_help

- **용도**: UI 아이콘: act_help
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_act_help.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an unfolded paper map with bright green route line and a red compass needle. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_act_help.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## tip_strip

- **용도**: Tip 쪽지 전용 가로형 찢어진 종이 스트립 (박스 비율 3:1에 꽉 차게, 투명 배경)
- **목표 크기**: 1500x520 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/tip_strip.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A single WIDE horizontal strip of very old ruled notebook paper, hand-torn along all four edges with rough fibrous irregular tears (no straight cut sides), centered on a fully transparent background. The strip is much wider than tall, filling almost the full width of the frame, roughly 3:1 aspect, like a long ribbon torn across a page. Pale desaturated ivory and light gray-beige paper (NOT orange, low saturation), fine visible paper fibers, one or two faint washed-out blue-gray ruled lines running along its length, a soft fold crease, small age spots near one end. Keep the central band clean and even so a line or two of tip text can sit on it. Realistic aged-paper material, soft even light, no text, no handwriting. Background fully transparent, not white.
```

생성 후 `tip_strip.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_bed

- **용도**: 가구 아이콘: 침대
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_bed.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a simple wooden-frame bed with a patched quilt and two pillows. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_bed.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_sofa

- **용도**: 가구 아이콘: 소파
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_sofa.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a worn two-seat fabric sofa with side armrests. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_sofa.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_chair

- **용도**: 가구 아이콘: 의자
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_chair.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a plain wooden chair. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_chair.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_table

- **용도**: 가구 아이콘: 테이블
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_table.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a sturdy wooden table. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_table.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_dresser

- **용도**: 가구 아이콘: 서랍장
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_dresser.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a wooden dresser with three drawers. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_dresser.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_bookshelf

- **용도**: 가구 아이콘: 책장
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_bookshelf.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a tall wooden bookshelf filled with salvaged books. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_bookshelf.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_rug

- **용도**: 가구 아이콘: 러그
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_rug.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a rectangular layered area rug seen at an angle. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_rug.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_lamp

- **용도**: 가구 아이콘: 스탠드 조명
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_lamp.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a floor lamp with a warm glowing fabric shade. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_lamp.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_plant

- **용도**: 가구 아이콘: 화분
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_plant.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a leafy potted plant in a clay pot. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_plant.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_crate

- **용도**: 가구 아이콘: 나무상자
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_crate.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a rough wooden storage crate. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_crate.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_radio

- **용도**: 가구 아이콘: 라디오
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_radio.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an old portable radio with a dial and antenna. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_radio.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_candle

- **용도**: 가구 아이콘: 캔들 스툴
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_candle.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a candle stool: a small wooden stool with a lit candle in a jar on top. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_candle.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_fridge

- **용도**: 가구 아이콘: 냉장고
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_fridge.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a compact salvaged refrigerator with a dented door. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_fridge.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_purifier

- **용도**: 가구 아이콘: 정수기
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_purifier.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a water purifier: a metal tank with a spout and small filter pipes. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_purifier.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_generator

- **용도**: 가구 아이콘: 발전기
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_generator.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a portable fuel generator with a pull cord and small exhaust. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_generator.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_stove

- **용도**: 가구 아이콘: 장작 난로
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_stove.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a cast-iron wood stove with a warm fire glowing through its window and a short chimney pipe. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_stove.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_cushion

- **용도**: 가구 아이콘: 방석
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_cushion.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a floor cushion with stitched cover. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_cushion.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_teatable

- **용도**: 가구 아이콘: 찻상
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_teatable.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a low tea table with a small teapot and cup. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_teatable.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_bookstack

- **용도**: 가구 아이콘: 책 더미
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_bookstack.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a book stack as a cozy survival-shelter furnishing. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_bookstack.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_clock

- **용도**: 가구 아이콘: 괘종시계
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_clock.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a tall grandfather clock with a brass pendulum. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_clock.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_lantern

- **용도**: 가구 아이콘: 걸이 랜턴
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_lantern.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a hanging lantern as a cozy survival-shelter furnishing. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_lantern.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_heater

- **용도**: 가구 아이콘: 온풍기
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_heater.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a boxy fuel space heater with a warm orange glow grille. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_heater.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_autopurifier

- **용도**: 가구 아이콘: 자동 급수기
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_autopurifier.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an automatic water purifier: a tall tank with tubes, a small pump and an indicator light. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_autopurifier.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_container

- **용도**: 셸터 아이콘: 버려진 컨테이너
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_container.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a single rusty shipping container home with a small stovepipe, standing in wasteland. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_container.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_bunker

- **용도**: 셸터 아이콘: 돔 벙커
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_bunker.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small concrete dome bunker half-buried in earth with a heavy hatch door. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_bunker.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_rooftop

- **용도**: 셸터 아이콘: 도시 옥탑방
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_rooftop.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a tiny rooftop shack on top of a ruined city building with a water tank. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_rooftop.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_cabin

- **용도**: 셸터 아이콘: 숲속 오두막
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_cabin.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small log cabin with a chimney at the edge of a bare forest. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_cabin.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_bus

- **용도**: 셸터 아이콘: 버려진 스쿨버스
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_bus.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an abandoned yellow school bus converted into a shelter, curtains in windows. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_bus.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_subway

- **용도**: 셸터 아이콘: 지하철 역사
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_subway.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a subway station entrance stairway leading underground, sandbags around it. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_subway.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_greenhouse

- **용도**: 셸터 아이콘: 온실
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_greenhouse.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small glass greenhouse with plants growing inside, some panes cracked. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_greenhouse.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_ship

- **용도**: 셸터 아이콘: 좌초된 여객선
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_ship.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a beached small ferry ship listing slightly, rust streaks on the hull. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_ship.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_lighthouse

- **용도**: 셸터 아이콘: 등대
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_lighthouse.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a weathered lighthouse tower with a faint warm light at the top. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_lighthouse.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_residential

- **용도**: 지역 아이콘: 주거지역
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_residential.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a row of small ruined suburban houses, overgrown yards. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_residential.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_commercial

- **용도**: 지역 아이콘: 상업지구
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_commercial.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a ruined shopping street with broken storefront signs and a shopping cart. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_commercial.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_industrial

- **용도**: 지역 아이콘: 공업지대
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_industrial.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a derelict factory with smokestacks and rusted pipes. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_industrial.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_slums

- **용도**: 지역 아이콘: 슬럼가
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_slums.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
densely stacked makeshift shanty structures with tarps and scrap walls. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_slums.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_weather_clear

- **용도**: 날씨 아이콘: 맑음
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_weather_clear.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a bright sun with soft rays breaking through two small clouds. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_weather_clear.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_weather_snow

- **용도**: 날씨 아이콘: 눈
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_weather_snow.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a gray cloud dropping large pixel snowflakes. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_weather_snow.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_weather_rain

- **용도**: 날씨 아이콘: 비
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_weather_rain.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a dark cloud with slanted rain streaks. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_weather_rain.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_weather_storm

- **용도**: 날씨 아이콘: 폭우
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_weather_storm.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a heavy storm cloud with dense rain and one lightning bolt. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_weather_storm.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_weather_ash

- **용도**: 날씨 아이콘: 재
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_weather_ash.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a murky brown-gray cloud drifting flakes of ash downward. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_weather_ash.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_wanderer

- **용도**: 이벤트 일러스트: 떠돌이 생존자
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_wanderer.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A weary wanderer in a heavy patched coat and scarf standing at the door of a small shelter at dusk, holding a dim lantern, snow drifting, the shelter's warm light spilling onto their face. Cozy pixel art illustration, isometric-leaning cinematic angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_wanderer.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_thief

- **용도**: 이벤트 일러스트: 침입의 흔적
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_thief.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Fresh scattered footprints in snow around the corner of a shelter at dawn, an overturned crate and a torn cloth on the ground, cold pale morning light, no people visible. Cozy pixel art illustration, isometric-leaning cinematic angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_thief.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## map_paper

- **용도**: 탐험 지도 배경 - 생존자의 손때 묻은 종이 지도 (지역 마커를 위에 얹는 UI 바탕)
- **목표 크기**: 1400x1000 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/map_paper.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A weathered hand-drawn survivor's paper map of a ruined city region, spread flat, filling the frame. Aged ivory paper with fold creases, burnt corner, coffee stain, drawn in ink and faded colored pencil: a winding main road crossing the map, a river with a broken bridge, and four distinct districts sketched as clusters - small suburban houses (upper left area), dense downtown ruins with tall broken buildings (upper right), a factory zone with smokestacks (lower left), and cramped shanty slums (lower right). Small hand annotations like arrows, X marks, circled areas, tiny warning symbols, a simple compass rose in a corner, dashed travel routes between districts. Muted desaturated palette with warm sepia ink and sparse red-pencil accents, subtle pixel-art grain, readable at a glance. Keep each district cluster visually separated with open paper space between them for UI markers. No text, no letters, no words - symbols and drawings only.
```

생성 후 `map_paper.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_trader

- **용도**: 이벤트 일러스트: trader
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_trader.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A traveling trader with a huge overloaded backpack of pots and tools standing at a snowy path near a small shelter, lantern light between them, ready to move on. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_trader.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_dog

- **용도**: 이벤트 일러스트: dog
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_dog.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A thin stray dog with hopeful eyes sitting at the edge of a shelter's light in falling snow, tail making a small sweep in the snow. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_dog.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_storm

- **용도**: 이벤트 일러스트: storm
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_storm.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Violent wind bending bare trees around a small shelter at dusk, loose boards and a tarp flapping, warm window light holding against the dark. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_storm.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_broken

- **용도**: 이벤트 일러스트: broken
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_broken.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A workbench corner with a disassembled water purifier, scattered screws and a wrench in warm candlelight, tools laid out on a cloth. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_broken.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_seeds

- **용도**: 이벤트 일러스트: seeds
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_seeds.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A small rusted tin box opened on a table revealing paper seed packets, lit by warm lamp light, dust motes in the air. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_seeds.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_radio_sig

- **용도**: 이벤트 일러스트: radio_sig
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_radio_sig.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
An old radio on a crate glowing with dial light in a dark room, static-lit face of the room, a hand-drawn frequency note pinned beside it. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_radio_sig.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_cat

- **용도**: 이벤트 일러스트: cat
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_cat.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
An orange tabby cat stepping carefully through snow toward a warm doorway light at dusk, small paw prints trailing behind. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_cat.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_doctor_radio

- **용도**: 이벤트 일러스트: doctor_radio
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_doctor_radio.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A radio in a dark shelter at night emitting a faint green glow, snow outside the window, the room lit only by the dial — as if the voice itself has weight. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_doctor_radio.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_coldsnap_stranger

- **용도**: 이벤트 일러스트: coldsnap_stranger
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_coldsnap_stranger.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A bundled stranger collapsed against a shelter door in a blizzard at night, warm light spilling through the door crack onto them. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_coldsnap_stranger.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_spoil_merchant

- **용도**: 이벤트 일러스트: spoil_merchant
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_spoil_merchant.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A shifty merchant in summer opening a crate of suspiciously discolored canned goods, heat haze, flies, the cans catching too-bright sunlight. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_spoil_merchant.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_leaky_roof

- **용도**: 이벤트 일러스트: leaky_roof
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_leaky_roof.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Rainwater dripping from a corrugated ceiling into a metal bucket in a dim shelter, ripples in the bucket, wet stain spreading on the wall. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_leaky_roof.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_snow_prints

- **용도**: 이벤트 일러스트: snow_prints
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_snow_prints.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Fresh deep footprints circling a small shelter in morning snow, no one in sight, pale dawn light, the door still closed. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_snow_prints.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_lighthouse_ship

- **용도**: 이벤트 일러스트: lighthouse_ship
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_lighthouse_ship.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
View from a lighthouse gallery at night — a faint ship light far out on a dark sea, the lighthouse beam sweeping, snow drifting. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_lighthouse_ship.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_greenhouse_birds

- **용도**: 이벤트 일러스트: greenhouse_birds
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_greenhouse_birds.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Small birds perched inside a broken greenhouse pecking at seed trays, morning light through cracked glass panes. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_greenhouse_birds.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_distant_light

- **용도**: 이벤트 일러스트: distant_light
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_distant_light.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Night view from a rooftop railing across a ruined city skyline — one distant window lit warm among dark towers, stars faint above. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_distant_light.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_radio_ghost

- **용도**: 이벤트 일러스트: radio_ghost
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_radio_ghost.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
An old radio at night with its dial glowing between stations, the room dark, a notebook and pencil beside it mid-note. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_radio_ghost.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_old_calendar

- **용도**: 이벤트 일러스트: old_calendar
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_old_calendar.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A faded wall calendar from before the collapse hanging crooked on a peeling wall, one date circled in red, dust in a shaft of light. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_old_calendar.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_cat_gift

- **용도**: 이벤트 일러스트: cat_gift
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_cat_gift.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
An orange tabby cat sitting proudly beside a small "gift" left on the doorstep at dawn, tail curled, innocent expression. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_cat_gift.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_frozen_pipe

- **용도**: 이벤트 일러스트: frozen_pipe
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_frozen_pipe.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A burst frozen pipe under a sink with icicles formed at the crack, a wrench and cloth laid ready, cold blue morning light. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_frozen_pipe.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_caravan_pass

- **용도**: 이벤트 일러스트: caravan_pass
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/ev_caravan_pass.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Seen from afar: a small caravan of silhouetted figures with a cart crossing a distant ridge at golden hour, never coming closer, power lines in the foreground. Cozy pixel art illustration, cinematic isometric-leaning angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_caravan_pass.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_frame

- **용도**: 가구 아이콘: 액자
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_frame.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small framed picture in a worn wooden frame, faded landscape photo inside. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_frame.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_curtain

- **용도**: 가구 아이콘: 커튼
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_curtain.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a warm fabric window curtain hanging from a rod, gently draped. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_curtain.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_desklamp

- **용도**: 가구 아이콘: 책상 램프
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_desklamp.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small articulated desk lamp with a metal shade and warm bulb glow. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_desklamp.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_firstaidbox

- **용도**: 가구 아이콘: 구급상자
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_firstaidbox.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a wall-mounted first aid box with a cross emblem, slightly scuffed. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_firstaidbox.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_mirror

- **용도**: 가구 아이콘: 거울
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_furn_mirror.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a standing full-length mirror in a dark worn wooden frame, the glass showing a pale cool blue-grey reflection with one diagonal light streak. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline around the whole object, soft single-direction top-left light, subtle dithered shading, no text, no frame border, no background.
```

생성 후 `icon_furn_mirror.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_salt

- **용도**: 자원 아이콘: 소금
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_res_salt.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small burlap sack of coarse white sea salt, open at the top showing bright white crystals, a tiny wooden scoop resting in it. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_salt.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_harborYard

- **용도**: 지역 마커: 항만 야적장
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_harborYard.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
stacked rusty shipping containers and a toppled harbor crane by a frozen dock. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_harborYard.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_fishMarket

- **용도**: 지역 마커: 수산시장
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_fishMarket.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a small ruined fish market stall with hanging dried fish and wooden crates, torn awning. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_fishMarket.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_tugboat

- **용도**: 셸터 아이콘: 예인선
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_tugboat.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a sturdy little tugboat with a round wheelhouse moored in icy water, warm light in the cabin window. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_tugboat.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_controltower

- **용도**: 셸터 아이콘: 항만 관제탑
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_controltower.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a tall harbor control tower with a glass observation room on top, one warm lit window against grey sky. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_controltower.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## ev_smuggler

- **용도**: 인카운터 일러: 밀수꾼
- **목표 크기**: 640x360 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/events/ev_smuggler.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
A shadowy smuggler in a heavy oilskin coat standing on a frozen pier beside a small boat loaded with crates, offering goods by the light of a swinging lantern, snow drifting over dark harbor water, distant ruined cranes silhouetted. Cozy pixel art illustration, isometric-leaning cinematic angle, warm candlelight against cold blue dusk, soft dithering, muted post-apocalyptic palette, painterly pixel scene, no text, no UI, no frame.
```

생성 후 `ev_smuggler.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_edit

- **용도**: 시스템 버튼 아이콘: icon_sys_edit
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_edit.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a chunky adjustable wrench with orange grip, diagonal. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_edit.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_pause

- **용도**: 시스템 버튼 아이콘: icon_sys_pause
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_pause.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
two thick vertical rounded bars, bright amber yellow. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_pause.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_play

- **용도**: 시스템 버튼 아이콘: icon_sys_play
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_play.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a thick rounded triangle play symbol pointing right, bright green. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_play.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_auto

- **용도**: 시스템 버튼 아이콘: icon_sys_auto
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_auto.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a cute boxy robot head with round cyan eyes and a small antenna. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_auto.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_settings

- **용도**: 시스템 버튼 아이콘: icon_sys_settings
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_settings.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a chunky metal gear wheel with eight teeth, warm steel gray with orange center. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_settings.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_quest

- **용도**: 시스템 버튼 아이콘: icon_sys_quest
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_quest.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a red push pin stuck at an angle with a small round shadow. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_quest.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_check

- **용도**: 시스템 버튼 아이콘: icon_sys_check
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_check.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a thick rounded green checkmark. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_check.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_shelter_lodge

- **용도**: 셸터 아이콘: 스키 로지
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_shelter_lodge.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a cozy log ski lodge with a steep snow-covered roof and one warm firelit window, small stone chimney. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_shelter_lodge.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_resort

- **용도**: 지역 마커: 리조트 폐허
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_resort.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a ruined mountaintop resort building silhouette with a broken cable car pylon beside it, snow drifts. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_resort.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_sys_collect

- **용도**: 시스템 아이콘: 전체 수거
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_sys_collect.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an open cardboard moving box with a red arrow curving down into it. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_sys_collect.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_checkpoint

- **용도**: 지역 마커: 격리 검문소
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_checkpoint.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a ruined quarantine checkpoint gate with concrete barriers, rusted boom barrier and a torn hazard-striped sign. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_checkpoint.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_region_lab

- **용도**: 지역 마커: 지하 연구동
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/icons/icon_region_lab.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a half-buried concrete laboratory entrance with a heavy blast door ajar and a faded radiation trefoil. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent, crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_region_lab.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## steam_header_clean

- **용도**: Steam 헤더 캡슐 base (텍스트 없음, 로고 PNG 오버레이용)
- **목표 크기**: 460x215 (생성 비율: 1536x1024, fit: cover)
- **배치 경로**: `assets-src/art/out/steam_header_clean.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
Wide isometric shelter scene at dusk, aspect ratio close to 2.14:1 (compose for a 1536x1024 canvas cropped to a wide 460x215 band, keep key content in the middle band and leave the upper sky relatively open and uncluttered). A cozy cutaway shipping-container room viewed wide to show two furnished corners: on one side a neatly made bed with a warm candle on a nightstand, on the other a small wood stove glowing orange and stacked crates, warm orange candle and firelight filling the interior. Outside the container's open side, a distant ruined post-apocalyptic city skyline and leafless trees stand against a cold blue-grey twilight sky, gentle snow falling. Strong warm-vs-cool contrast: glowing orange interior against desaturated blue dusk exterior. Cozy pixel art, isometric, soft dithering. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDMARK anywhere in the image — leave the sky clean and empty for a logo to be added later.
```

생성 후 `steam_header_clean.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_globe

- **용도**: 가구 아이콘: 골동품 지구본
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `public/img/icons/icon_furn_globe.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an antique tabletop globe of the old world, its faded parchment-coloured map cradled in a brass meridian ring on a turned wooden stand. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent (the brass meridian ring), crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_globe.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_phonograph

- **용도**: 가구 아이콘: 축음기
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `public/img/icons/icon_furn_phonograph.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
an antique gramophone phonograph: a large flared brass horn rising from a small wooden turntable box with a side crank. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent (the brass horn), crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_phonograph.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_furn_candelabra

- **용도**: 가구 아이콘: 가지 촛대
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `public/img/icons/icon_furn_candelabra.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a branched brass candelabra holding several slender candles with small warm flames and a little dripping wax. Pixel art game inventory icon, single object centered on a fully transparent background, 3/4 top-down angle, chunky readable silhouette that stays clear at 32px, muted desaturated post-apocalyptic palette with one warm amber accent (the glowing candle flames), crisp 1px dark outline, soft single-direction top-left light, subtle dithered shading, no text, no frame, no background.
```

생성 후 `icon_furn_candelabra.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---

## icon_res_book

- **용도**: UI 아이콘: res_book
- **목표 크기**: 256x256 (생성 비율: 1024x1024, fit: cover)
- **배치 경로**: `public/img/icons/icon_res_book.png`

**ChatGPT에 붙여넣을 프롬프트:**

```
a single closed hardcover book with a deep red cloth cover, gold-edged pages, and a frayed ribbon bookmark. Cozy pixel art game icon, single object centered and FILLING 88-92% of the frame with almost no empty margin, fully transparent background. Bright saturated instantly-readable colors — the object keeps its vivid real-world hues with strong value contrast so it reads at 24px on a dark UI. Bold 2px dark outline, chunky simple silhouette, soft top-left light, tiny highlight sparkle, no text, no frame, no background.
```

생성 후 `icon_res_book.png` 로 저장해 `assets-src/art/incoming/` 에 넣으세요.

---
