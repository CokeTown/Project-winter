# Nine Winters — Steam 출시 SKU·번들 구성안

> 기준: 정식 출시(v1.0) 시점의 판매 구성 확정안.
> 근거 데이터: Chris Zukowski(HowToMarketAGame) 서포터팩/OST 전환율·매출 리서치, 인디 가격 리서치(docx), 위시리스트·크리에이터·타이밍 리서치(마케팅 PDF 5종).
> 상위 문서: [PAGE-COPY.md](PAGE-COPY.md)(스토어 본문 카피), [../MARKETING.md](../MARKETING.md).
> 원칙: **확장(1.1~1.4)은 무료** — 유료는 코스메틱 서포터팩과 OST 둘뿐. 유료 확장 DLC는 출시 시점 지양(Zukowski: 런치 확장 DLC = 위시리스트 분산·나쁨).

---

## 0. 한눈에 (SKU 사다리)

| SKU | 유형 | 가격(USD) | 내용물 | Steamworks |
|---|---|---|---|---|
| **Nine Winters** | Base App | **$9.99** | 본편 전체(아홉 겨울 · 5모드 · 무료 확장 1.1~1.4 + 2.0 수령) | AppID |
| **Supporter Pack** | DLC | **$3.99** | 서포터 복장 1종 + 서포터 고양이 외관 1종 (순수 코스메틱) | DLC AppID |
| **Original Soundtrack** | Music/DLC | **$4.99** | SUNO Pro 제작 사운드트랙(FLAC+MP3), AI 공개 대상 | Music AppID |

| 번들 | 구성 | 개별 합 | 번들가 | 할인 |
|---|---|---|---|---|
| **Supporter Edition** | Base + Supporter Pack | $13.98 | **$12.99** | ~7% |
| **Complete Warmth** | Base + Supporter + OST | $18.97 | **$16.99** | ~10% |

> 디렉터가 처음 그린 "서포터 포함 $13.99~14.99"는 **별도 에디션 SKU가 아니라 Supporter Edition 번들**로 정확히 재현된다(Steam은 "에디션"을 번들로 구현하는 것이 표준 — 소유 중복·환불·업그레이드 경로가 자동 처리됨). 서포터팩 단독 구매자는 나중에 OST만 추가해 Complete로 올라갈 수 있고, Steam이 이미 가진 항목 가격을 자동 차감한다("complete the set").

---

## 1. Base — Nine Winters ($9.99)

### 가격 근거 (2026-07-12 확정: $11.49 → $9.99)
- **디렉터 확정 정가 $9.99 + 론치 -15% → ≈$8.49.** 근거: 게임 적대적 리뷰([../design/GAME-REVIEW.md](../design/GAME-REVIEW.md))가 $11.49를 "idle 밴드(Rusty's $6.99·Melvor $9.99) 초과 + 얇은 볼륨"의 데드존으로 판정. 디렉터 논리 — **"2.0(무료) 완료 시 사실상 본편 분량"** — 이 $9.99를 장기값으로 정당화(Steam 정가 인상은 껄끄러우니 처음부터 장기값으로 박음).
- **왜 $7.49가 아니라 $9.99인가**: $6.99~7.49는 "idle 위젯"(Rusty's) 칸 앵커라, 코지-내러티브 포지셔닝(GAME-REVIEW: Spiritfarer류)을 스스로 깎고 "복셀=싸구려/모바일 포트" 오독을 가격으로 자백. $9.99는 코지-내러티브 밴드이면서 Melvor 패리티(그 이상은 '깊이·시간당 가격' 싸움에서 짐).
- **왜 $11.49가 아닌가**: 볼륨 대비 투머치(디렉터 자인) + 내부 문서 자기모순. 정가 앵커를 낮추되, 무료 2.0은 "가격 정당화"가 아니라 리뷰·재방문 무기로 재배치.
- **실효가 전략**: 리스트 $9.99 유지, **론치 -15%($8.49)** 로 초반 구매 속도·리뷰 수 확보 — 디렉터 최초 직감 $7.49의 충동 구간을 '리스트 인하'가 아니라 '할인 실효가'로 재현(카테고리 앵커는 지키며).

### Steam 설정
- Primary genre: **Simulation**; 서브: Indie, Casual.
- 태그(등록순 정본 = [STORE-SUBMIT §7-c](STORE-SUBMIT.md) 20개): 아늑함 → 기지 건설 → 생활 시뮬레이션 → 아이들러 → 고양이 → 장식 → … → 복셀 → 싱글플레이어. (구 목록의 Pixel Graphics·2.5D는 오류 — 복셀·아이소메트릭이 정본, 2026-07-11 태그 목차 검증.)
- Content Survey: **AI 생성 콘텐츠 = 예**(§5 참조 — 음악/일부 이미지).
- 데모 앱: 별도 Demo AppID(#74 「첫 번째 겨울」). 데모는 무료·상시.

---

## 2. Supporter Pack DLC ($3.99)

### 성격 — "팁 자(tip jar)", 파워 아님
Zukowski 데이터: 서포터팩은 **평균 전환율 ~2.59%**, 코스메틱 한정일 때 리뷰·평판 리스크 없음(P2W 아님). 목적은 매출보다 **"응원하고 싶은 사람에게 응원 창구를 준다"**. 실제 예시(고양이 사진 리워드 등)처럼 감정적·비-기능적 보상이 정석.

### 내용물 (순수 코스메틱, 게임플레이 영향 0)
1. **서포터 복장 1종** — 옷장 6번째 슬롯. 현재 5종(방한/네이비/와인/숲/크림/차콜)에 **제작 불가·DLC 전용** 복장 추가. 팔레트는 기존 복셀 오버라이드 체계(`OUTFITS.pal`) 재사용 → 아트 신규 리깅 0.
2. **서포터 고양이 외관 1종** — 현재 4코트(tabby/black/siamese/ragdoll)에 **DLC 전용 5번째 코트** 추가. 입양 랜덤 풀이 아니라 **소유 시 선택 가능**한 특별 코트.

> 두 항목 모두 "서포터임을 드러내되 유리해지지 않는" 선. 복장은 눈에 띄는 색/포인트, 고양이 코트는 특별한 무늬 — 감사의 표식이지 능력치가 아니다.

### 게이트
- 소유 여부: `hasSupporterDLC()` (→ [§7 Steamworks](#7-steamworks-연동-체크리스트-117), #117 그라운드워크).
- 미소유 시: 옷장/고양이에서 해당 항목 **비노출**(잠금 아이콘 노출도 가능하나, 코지 톤상 "조용히 없음"이 더 어울림 — 디렉터 확인 필요).
- 웹/모바일(비-Steam) 빌드: DLC 개념 없음 → 기본 false(추후 IAP 붙일 여지만 남김).

---

## 3. Original Soundtrack DLC ($4.99)

### 가격 근거
Zukowski: OST DLC **평균 전환율 ~2.8%**, 본편 팬의 자연 구매. 코지·분위기 게임은 음악 애착이 커 전환이 장르 평균 이상 기대. $4.99가 표준(트랙 수·길이 충분 시). **$3.75** 대안은 세일 상시감·충동구매용으로 유효하나, 정가는 $4.99 두고 **번들·시즌세일에서 조정**을 권장.

### 구성·기술
- SUNO Pro 제작. FLAC(무손실) + MP3 320k 동봉. Steam은 OST를 `music` 타입 DLC로 지원(라이브러리 내 재생 + 로컬 파일 접근).
- 트랙 리스트·러닝타임 확정 필요(→ TODO). 날씨/시간/계절/특수 트랙(#1 BGM 시스템)에서 셀렉트.

### ⚠️ AI 저작권·라이선스 (검증 완료)
- **SUNO Pro/Premier = 상업적 사용 라이선스 보유**(계약상 사용권이며 *저작권 귀속·등록 대상 아님*). 즉 **판매는 가능하나, 곡 자체에 독점 저작권을 주장할 수 없다**.
- **Content-ID 부적격** → 스트리머가 틀어도 클레임 위험 없음(오히려 **스트리머 친화 = 마케팅 이점**).
- Steam **Content Survey에 AI 사용 공개 필수**(§5).

---

## 4. 번들

| 번들 | 구성 | 번들가 | 논리 |
|---|---|---|---|
| **Supporter Edition** | Base + Supporter Pack | **$13.99** | 디렉터의 "서포터 포함 에디션" 심상. 출시일부터 노출. |
| **Complete Warmth** | Base + Supporter + OST | **$17.99** | 올인 구매자·팬. OST 애착층 흡수. |

- Steam 번들은 **부분 소유 자동 차감**: 이미 Base 가진 유저가 Supporter Edition을 보면 서포터팩 차액만 결제.
- 번들 할인율은 개별가 합 대비 ~10~12%(Steam 번들 표준). 시즌세일에는 번들+개별 동시 할인 중첩 주의(Steam 규칙 확인).

---

## 5. AI 콘텐츠 공개문 (Steam Content Survey)

> Steam은 2024년부터 AI 생성 콘텐츠 공개를 의무화. 스토어 페이지에 자동 표기됨. 정직·구체 공개가 심사 통과·유저 신뢰에 유리.

**Content Survey 답변(권장 원문):**

> **Pre-Generated AI Content — Yes.**
> Nine Winters uses AI generative tools for part of its content:
> - **Music**: The original soundtrack is composed using SUNO (Pro plan, with a commercial-use license). All tracks were curated, edited, and arranged by the developer for use in the game.
> - **Some visual textures/icons**: A portion of 2D texture and icon assets were created with AI image tools and then hand-edited by the developer.
> All AI-generated assets were reviewed and adjusted by the developer to fit the game. No AI is used at runtime; there is no live-generated content during play.

- 런타임 AI 없음("no live-generated content")을 명시 → 유저의 "게임이 실시간으로 뽑아내나" 오해 차단.
- OST DLC 페이지에도 동일 취지 1줄 병기.

---

## 6. 위시리스트·크리에이터·타이밍 (마케팅 PDF 5종 종합)

- **위시리스트가 알고리즘의 연료**: 출시 시점 위시리스트 수가 Steam의 초기 노출(Popular Upcoming·Discovery Queue)을 좌우. → **데모(#74) + Next Fest**로 출시 전 위시리스트를 최대한 쌓는다. 데모는 위시리스트 전환의 최강 도구.
- **Next Fest 타이밍**: 데모는 **출시 직전 Next Fest 1회에 집중**(페스트는 앱당 1회만 카운트되므로 소진 주의). 페스트 주간에 트래픽 몰림.
- **크리에이터/스트리머**: 코지+고양이+분위기 = 스트리머 친화 소재. **OST가 Content-ID 프리**라 방송 BGM 클레임 없음(적극 홍보 포인트). 키 배포는 출시 1~2주 전 집중.
- **론치 할인**: 출시 -10%(위 §1) — 첫 주 할인은 전환·리뷰 가속. 과한 할인(-30%↑)은 정가 앵커·장기 세일 여력을 깎으므로 지양.
- **리뷰 10/50/500 임계**: 초기 리뷰 10개 돌파가 노출 1차 관문. 데모·팬층으로 출시 첫 주 리뷰 확보 설계.

---

## 7. Steamworks 연동 체크리스트 (→ #117)

DLC 판매를 위한 최소 연동. **steamworks.js 탑재 완료**(package.json ^0.4.0, main.cjs init + 업적 중계 + Auto-Cloud 미러) — 잔여는 DLC 게이트부터.

- [x] **Steam 라이브러리 도입**: `steamworks.js` 채택·Electron main에 로드(비Steam은 null 폴백 스텁).
- [ ] **`hasSupporterDLC()` 게이트**: DLC AppID 소유 확인(`steamAPI.apps.isDlcInstalled` 계열). 비-Steam 빌드·미연동 시 **기본 false**.
- [ ] **옷장 확장점**: 서포터 복장을 `OUTFITS`에 DLC 전용으로 추가(제작 CRAFTS에는 미등록). 옷장 렌더에서 `hasSupporterDLC()` 참일 때만 노출.
- [ ] **고양이 코트 확장점**: 5번째 코트를 랜덤 풀 밖 DLC 전용으로. 소유 시 선택 UI 노출.
- [ ] **세이브 호환**: 미소유→소유 전환 시 잠금 해제만, 세이브 스키마 무변경(구세이브 안전).
- [x] **Steam 언어 연동(#34)**: steamworks.js init → `nineSteam.lang` → 부팅 autoLang + `steamLangToGame()` 매핑(japanese 포함, ko/en/ja 3로케일 외부화 완료). 실기 스모크만 depot 업로드 후.
- [ ] **Content Depot**: Base/Supporter/OST 각 depot 구성, extraResources(locales) 유지.

---

## 8. 리스크·주의

- **DLC 코스메틱 경계선**: 서포터 복장/코트가 실수로라도 스탯·확률에 영향 주면 P2W 리뷰 리스크. 팔레트 오버라이드만(게임플레이 값 절대 불변) 유지.
- **AI 공개 누락 = 심사 반려·신뢰 훼손**: §5 문구를 서베이·OST 페이지 양쪽에 반영.
- **번들 소유 중복**: Steam 번들 자동 차감 신뢰. 별도 "에디션 SKU"를 만들지 말 것(중복·환불 지옥).
- **OST 저작권 오표기 금지**: "저작권 보유"가 아니라 "상업적 사용 라이선스"로. 곡 독점권 주장·Content-ID 등록 시도 금지.
- **웹/모바일 빌드**: DLC 없음 → 서포터 콘텐츠 기본 비노출. 추후 IAP는 별도 과제.

---

## 상태

- 구성: **확정**(Base 정가 $9.99 디렉터 확정 2026-07-12, §1 참조 — 구 $11.49 안 폐기). 잔여 디렉터 결정: 미소유 서포터 항목 "조용히 없음" vs "잠금 노출".
- 후속: #117 Steamworks 그라운드워크(코드), #34 Steam 언어 연동, OST 트랙리스트 확정.
