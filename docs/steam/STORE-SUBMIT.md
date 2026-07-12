# Nine Winters: Steamworks 제출 정본 (필드별 붙여넣기)

> **사용법**: Steamworks(앱 4950160) 각 입력란에 이 문서의 해당 블록을 그대로 붙여넣는다.
> 카피 원문은 [PAGE-COPY.md](PAGE-COPY.md), 가격·SKU는 [SKU-PLAN.md](SKU-PLAN.md), 트레일러는 [trailer/CUT-SHEET.md](trailer/CUT-SHEET.md)가 정본, 이 문서는 "제출 순서와 답안"만 담는다.
> ⚠️ 마지막에 반드시 **Publish** 버튼까지 눌러야 검토 큐에 들어간다(저장≠제출). 검토 영업일 2~3일.

---

## 0. 제출 순서 체크리스트

1. Basic Info(장르·태그·언어) → 2. Description(짧은/긴 설명) → 3. Graphical Assets(캡슐 8종) → 4. Screenshots(8장) → 5. Trailer(draft 업로드, 정본 교체 예정) → 6. 성인 콘텐츠 설문 → 7. AI 공개 설문 → 8. Publish → (별도 트랙) 가격은 출시 단계 `Propose Pricing`에서.

---

## 1. Basic Info

| 필드 | 값 |
|---|---|
| App Name | **Nine Winters** |
| 장르 (Genres) | Casual · Simulation |
| 태그 (순서 유지: 앞쪽 노출 가중, §7-c 정본) | 아늑함, 기지 건설, 생활 시뮬레이션, 아이들러, 고양이, 장식, 포스트아포칼립스, 릴랙싱, 생존, 크래프팅, 자원관리, 탐험, 분위기 있는, 눈, 건전함, 풍부한 스토리, 복수 결말, 감성적, 복셀, 싱글플레이어 |
| 개발사/배급사 | CokeTown |
| 출시 시기 표기 (Coming Soon) | KO: `2026년 겨울` / EN: `Winter 2026`: 구체 날짜는 빌드 승인 후 확정 |
| 지원 플랫폼 | Windows (데모/본편). *모바일은 스팀 외 채널.* |

**지원 언어 매트릭스** (Supported Languages):

| 언어 | 인터페이스 | 자막 | 음성 |
|---|---|---|---|
| Korean | ✅ | ✅ | 없음 |
| English | ✅ | ✅ | 없음 |

---

## 2. Short Description (300자)

**KO**, PAGE-COPY §1 그대로:

> 세상은 이미 끝났고, 되돌릴 수 없다. 그래도 난롯불은 지필 수 있고, 고양이는 곁에 눕는다. **Nine Winters**는 폐허 속 셸터 하나를 손질하며 아홉 번의 겨울을 나는 코지 생존 게임이다. 창밖으로 잿빛 도시가 얼어붙는 동안, 안에서는 수프를 데우고 벽지를 고쳐 붙이고 라디오를 켠다. 회복은 사건이 아니라 습관이다. 살아남는 게 아니라, 살아보는 이야기.

**EN** (정본 2026-07-12 — 응답 불빛 포지셔닝·탈-AI 리라이트, 281자. **스토어 메인 언어 = 영어**):

> You're the last lit window in a dead winter city. Climb to the radio, signal into the dark, and far across the ruins other windows flicker on in answer. A cozy survival game about keeping one shelter warm, letting the cat in, and outlasting nine winters, each colder than the last.

태그라인: **"The last warm window in a dead winter city — you signal into the dark, and distant lights answer."**
*(위 KO 짧은 설명은 구 「Embers in dust」 포지셔닝 — 영어 정본에 맞춰 재번역 필요. 스토어는 영어 우선.)*

---

## 3. About This Game: GIF 배치 설계 (AAA 스타일)

본문 카피 = **PAGE-COPY §2 EN 정본(2026-07-12 리라이트, 응답 불빛 포지셔닝)**. **단락 사이에 GIF를 끼워** 스크롤마다 게임이 움직이게. Steam 본문 이미지 권장 616px 폭, `docs/steam/gifs/`(각 3MB 이하):

| 위치 | GIF | 보여주는 것 | 카피 앵커 (신 정본) |
|---|---|---|---|
| **도입 라디오 문단 직후** | **`gif_signal.gif` (신규 제작 필요)**: 밤 옥탑에서 라디오 송출 → 먼 창 하나가 깜빡 켜짐 | **시그니처 훅(응답 불빛)** | "…awake in the same dark" 아래 |
| "Make a home worth staying in" 위 | `gif_decorate.gif`: 가구 스톱모션 배치+색 변경 | 코어 ① 꾸미기 | 불릿 리스트 시작 전 |
| "Outlast nine winters" 아래 | `gif_seasons.gif`: 해 뜨고 지고, 맑음→비→눈 | 계절/날씨 | 겨울 불릿 아래 |
| "Let the cat in" 아래 | `gif_cat.gif`: 고양이 클로즈업 전환 | 감정 훅 | 고양이 불릿 아래 |
| "Scavenge without the grind" 아래 | `gif_loot.gif`: 정산 개봉+희귀 골드/핑크 배지 | 도파민 | 스캐빈지 불릿 아래 |
| "Keep it glowing on your desktop" 아래 | `gif_widget.gif`: 바탕화면 위젯 모드 | 차별화 피처 | 위젯 불릿 아래 |

레이아웃 규칙: GIF 연속 2개 금지(카피→GIF→카피 리듬), 캡션 없이(본문이 캡션 역할). 스토어 메인 언어=영어.
**GIF 상태:** 기존 5종(decorate·seasons·cat·loot·widget)은 재앵커만. **`gif_signal`(응답 불빛)은 신규 제작 필요** — 신 포지셔닝이 이 훅으로 시작하므로 최상단 GIF로 권장(구 gif_candle 대체). 컴포저 프레임 캡처 → GIF 조립.

---

## 4. 성인 콘텐츠 설문 (Mature Content Survey) 답안

| 문항 | 답 | 근거 |
|---|---|---|
| 폭력 (Violence) | **일부: 비유혈·비묘사적** | 총기가 아이템으로 존재(혹한·후반)하나 발사·살상 묘사 없음. 동물·인간 피해 묘사 없음 |
| 유혈 (Gore) | 없음 | 해당 콘텐츠 없음 |
| 성적 콘텐츠 | 없음 | 해당 콘텐츠 없음 |
| 약물/음주 | 없음 | 진통제·소독약은 의료품(기호품 아님) |
| 도박 | 없음 | 전리품 RNG는 도박 콘텐츠 아님 |
| 성인 전용 여부 | 아니오 | 전연령~틴 수준 |
| 비고 서술란 | KO: "포스트 아포칼립스 배경의 코지 생존 게임입니다. 죽음·유혈 연출이 없으며, 실패는 '조금 덜 온전한 하루'로 표현됩니다." / EN: "A cozy survival game in a post-apocalyptic setting. No death scenes or gore; failure is expressed as 'a slightly less whole day.'" |

---

## 5. AI 콘텐츠 공개 (필수 설문): #116 확정 방침

- **Pre-Generated AI content: YES / Live-Generated: NO**
- 공개 문구 (설문 서술란):

**EN**: "Some 2D assets (a number of UI icons and event illustrations) were drafted with generative AI tools and then curated and edited by the solo developer. AI-assisted development tools helped write portions of the game code under direct developer supervision, and machine translation was used as a first-draft aid for localization, with all text reviewed and edited by a human. All store capsule art and screenshots are actual in-game renders, not AI images. The game generates no content with AI at runtime — everything in the build is fixed and human-reviewed."

**KO**: "일부 2D 에셋(UI 아이콘, 이벤트 삽화 다수)은 생성형 AI 도구로 초안을 만든 뒤 1인 개발자가 선별·수정했습니다. 게임 코드 일부는 개발자의 직접 감독 아래 AI 보조 개발 도구로 작성했고, 현지화는 기계 번역을 초벌로 활용한 뒤 모든 문장을 사람이 검수·수정했습니다. 상점의 캡슐 아트와 스크린샷은 전부 실제 인게임 렌더이며 AI 이미지가 아닙니다. 게임 내 실시간 AI 생성은 없으며, 빌드의 모든 콘텐츠는 고정·사람 검수를 거쳤습니다."

> 갱신(2026-07-11): 캡슐이 인게임 렌더로 교체되며 "마케팅 캡슐 아트" 항목을 AI 목록에서 제거,
> 대신 "상점 비주얼 = 실제 인게임"을 명시 문장으로 추가. A5 방어가 더 단단해진다.
> 갱신(2026-07-12): 스팀 AI 설문이 "현지화"를 명시 콘텐츠로 물어 **번역(기계번역 초벌+사람 검수)** 항목 추가.
>   실시간 생성=아니요·외부 AI 서비스=아니요(런타임 AI 0). 사전 생성 유형=2D 아트(아이콘·삽화)·코드 보조·번역 초벌. OST·SFX·복셀 모델·내러티브·캡슐=AI 아님.

---

## 6. Graphical Assets 파일 매핑 (인게임 복셀 정본, 2026-07-11 교체)

> **업로드 정본(스팀 신규 2× 규격, 2026-07-12) = `docs/steam/capsules-upload/`** — 스토어 4종 + 페이지 배경.
>   스팀이 캡슐 규격을 2배로 갱신(460×215→920×430 등)해 구 파일은 "크기 미달"로 업로드 거부됨 → 픽셀아트라
>   art-res→2× 니어레스트 재생성(픽셀 퍼펙트, 승인된 룩 보존). 페이지 배경만 4K 마스터 스무스 다운스케일.
>   **타이틀 = 워드마크만(이름 전용). 서브타이틀 'Embers in dust'는 포지셔닝 피벗으로 폐기(디렉터 2026-07-12).**
> **소스/마스터 = `assets-src/art/out/capsules-ingame/`** (씬: 옥탑방·노을·눈·붉은 카펫·크림 침대(T3)·베이지 러그·
>   방석 위 고양이·벽 난로·스탠드·책장·시계·라디오·화분. `master_4k.png`(3840×2160)·`master_vertical.png`(1350×2025)에서
>   규격별 크롭 + `steam2/final_logo_wordmark.png` 합성. 재생성기: scratchpad `capsules-out/compose.cjs`).

| Steamworks 슬롯 | 파일 (`capsules-upload/`) | 규격 (스팀 신규 2×) |
|---|---|---|
| Header capsule | `header_920x430.png` | 920×430 ✅ |
| Small capsule | `small_462x174.png` | 462×174 ✅ |
| Main capsule | `main_1232x706.png` | 1232×706 ✅ |
| Vertical capsule | `vertical_748x896.png` | 748×896 ✅ |
| Page background | `page_background_1438x810.png` (텍스트 없음) | 1438×810 ✅ |
| Library capsule | `capsules-ingame/steam_library.png` | 600×900 (라이브러리 규격 별도 검증 要) |
| Library hero | `capsules-ingame/steam_hero.png` (텍스트 없음) | 3840×1240 |
| Library logo | `capsules-ingame/steam_logo.png` (엠블럼 투명) | 1280×720 |
| Screenshots (순서대로) | `shots/final/01~08` (미감 v2 교체 예정: #156) | 1920×1080 |
| Trailer | `trailer/draft.mp4` → **트레일러 v2(#172)** 완성 시 교체 | 1080p+ |

---

## 7. 시스템 요구사항 (스팀 백엔드 폼 필드별: 폼 언어 = 영어, v1.9.0 실측 2026-07-10)

> 스팀 "시스템 요구 사항" 폼의 각 칸에 그대로 붙여넣는다. 폼 언어가 영어이므로 **값은 영어**로 입력.
> 빈 칸(사운드 카드·VR·추가 알림)은 비워 둔다, 억지로 채우면 오히려 노이즈.

| 스팀 폼 필드 | 최소 (Minimum) | 권장 (Recommended) |
|---|---|---|
| **OS version** | Windows 10 64-bit | Windows 11 64-bit |
| **Processor** | Dual-core 2 GHz | Quad-core 2.5 GHz+ |
| **Memory** | `4` GB | `8` GB |
| **Graphics** | WebGL 2.0-capable GPU (integrated graphics OK) | Dedicated WebGL 2.0-capable GPU |
| **Network (광대역)** | ☐ 체크 안 함 (싱글플레이·오프라인) | ☐ 체크 안 함 |
| **DirectX Version** | N/A (기본값 유지) | N/A |
| **Disk Space** | `1` GB (또는 `1024` MB) | `2` GB |
| **Sound Card** | (비움) | (비움) |
| **VR 기기 및 지원** | (비움) | (비움) |
| **추가 알림** | (비움) | (비움) |

**근거**:
- **저장공간**, v1.9.0 설치 후 실측 575MB. 스팀은 depot를 자체 다운로드·해제하므로 우리 NSIS 설치본과 무관. 세이브·업데이트·depot 여유 포함해 최소 1GB / 권장 2GB.
- **DirectX = N/A**, Electron/WebGL2 게임이라 사용자가 특정 DirectX 런타임을 설치할 필요 없음(내부적으론 Chromium ANGLE이 D3D11 경유). 값을 강제로 넣지 않는다. 리뷰어가 값을 요구하면 "11"로.
- **네트워크 = 미체크**, 완전 오프라인 싱글플레이(스팀 실적/클라우드 세이브는 네트워크 요건 아님).
- **RAM/CPU**, 저폴리 복셀 + 배터리 최적화(#25)로 내장 그래픽에서도 코지 프레임 유지. 4GB/듀얼코어가 진짜 바닥값.

EN one-line (문서 참조용), Minimum: Windows 10 64-bit, Dual-core 2 GHz, 4 GB RAM, WebGL 2.0-capable GPU (integrated OK), 1 GB storage. Recommended: Windows 11 64-bit, Quad-core 2.5 GHz+, 8 GB RAM, dedicated WebGL 2.0-capable GPU, 2 GB storage.

---

## 7-b. 지원 기능 (Supported Features 체크리스트): 각 항목이 곧 구현 약속

> 스팀은 체크한 기능의 실동작을 심사한다. **초록불(체크)은 출시 전 반드시 구현·테스트해야 하는 게이트**.
> 코지 싱글플레이·오프라인 게임이라 켜는 건 딱 2개, 나머지는 전부 끈다.

| 항목 | 체크? | 근거 / 남은 일 |
|---|---|---|
| **Steam 도전 과제** | ✅ 켬 | 인게임 업적 18종(일반 17+히든 「침묵」) 완비 · 매핑표 `platform.js` STEAM_ACH_MAP. **출시 게이트**: ①Steamworks 콘솔에 API Name(ACH_*)으로 18종 등록(침묵=히든 플래그) ②electron preload 네이티브 브릿지(window.nineSteam.unlock) 구현·테스트. 현재는 로컬만 동작. |
| **Steam Cloud** | ✅ 켬 | 세이브 슬롯 무한(#66) → 클라우드 세이브 가치 큼. **출시 게이트**: Steamworks Auto-Cloud 경로 등록(Electron userData 세이브 위치) + 왕복 테스트. 어댑터(`platform.js` cloud)는 준비됨. |
| 통계 | ☐ 끔 | Steam Stats API 미사용. 텔레메트리는 보류(#168). |
| Steam 순위표 | ☐ 끔 | 경쟁 점수 없음(코지). |
| 앱 내 구매 | ☐ 끔 | 서포터팩은 **상점 노출 DLC**라 DLC 설정으로 처리: 이 박스(상점 미표시 소액결제)는 해당 없음. |
| 캡션 이용 가능 | ☐ 끔 | 텍스트 중심이나 '소리·음악·효과음 설명 자막'은 미구현. (접근성 향후 과제 후보) |
| Steam 타임라인 | ☐ 끔 | Timeline 마커 API 미사용(겨울 넘김·엔딩 마커는 향후 nice-to-have). |
| Steam 창작마당 | ☐ 끔 | UGC 없음. |
| 창작마당(China) | ☐ 끔 | 해당 없음. |
| 레벨 에디터 포함 | ☐ 끔 | 없음. |
| Remote Play (폰/태블릿/TV) | 자동 | 회색 비활성. Valve가 테스트로 자동 판정, 손대지 않음. |
| Remote Play Together | ☐ 끔 | 로컬 협동/스트리밍 초대 없음(싱글). |
| HDR 사용 가능 | ☐ 끔 | SDR 렌더. (경고문: 내부 HDR→SDR 톤매핑 게임은 켜지 말 것: 우리가 그 경우). |
| Steam 턴 알림 | ☐ 끔 | 턴제 멀티 아님. |
| 코멘터리 제공 | ☐ 끔 | 개발자 코멘터리 모드 없음. (AI 공방 서사(COMMS-KIT)와 맞물리는 향후 후보) |
| Source SDK 포함 | ☐ 끔 | Valve Source 엔진 전용. |

**요약**: 「Steam 도전 과제」·「Steam Cloud」 2개만 켠다. 단, 둘 다 **Steamworks 네이티브 브릿지가 아직 없어** 지금 체크 상태는 "출시 때 구현하겠다"는 약속이다, 스토어 페이지 심사 통과와 별개로, **정식 출시 빌드 전까지 브릿지 구현(#117 연장선)이 완료돼야** 초록불이 거짓이 안 된다. 데모/Next Fest 빌드만 올릴 거면 이 2개를 잠시 끄고 출시 시 켜는 선택지도 있다(디렉터 판단).

### 컨트롤러 지원 마법사 (별도): **부분 지원(Partial)** 선택

Xbox 컨트롤러 "완벽 지원(Full)" 마법사에서는 **"아니요"** 를 고른다(=부분 지원). 코드 검증(`game.js` pollGamepad):
- ✅ 조작: 좌스틱=가상 커서 / A=클릭 / B=뒤로 / 우스틱=회전 / LB·RB=줌 / START=일시정지 / Y=편집. 표준 매핑(=Xbox 레이아웃) 그대로.
- ❌ **완벽 지원 기준 2 미충족**: 화면에 컨트롤러 버튼 글리프/프롬프트를 표시하는 시스템이 없음(코드에 부재). 이것 하나로 Full 탈락.
- N/A: 텍스트 입력 없음(세이브 슬롯=번호) → 가상 키보드 기준 자동 충족 / 싱글이라 다중 패드 N/A.
- Full로 올리려면: **컨트롤러 버튼 글리프 안내 시스템** 구현 필요(#14 연장). Steam Deck Verified·발견성에 유리하나 출시 필수는 아님.
- ⚠️ 실물 패드 손맛(커서 속도·데드존)은 아직 미검증, 출시 전 실기기 1회 확인 권장.

**PlayStation 컨트롤러 단계 = "아니요"(미주장)**. 이유: 완벽 지원 기준(PS 버튼 글리프 표시) 미충족, Xbox와 동일 사유. DualShock/DualSense도 Chromium 표준 매핑으로 실제 작동하고 Steam Input 호환 레이어가 받쳐주나, **네이티브 PS 글리프 완벽 지원을 주장하지 않는다**(우린 Steam Input API 미사용, 원시 Gamepad API 직접 읽음). 컨트롤러 정책 일관: Xbox=부분 / PS=미주장, 둘 다 기능은 되나 글리프 부재로 Full 아님.

**Steam Input API 통합 단계 = "아니요"(미사용)**. 원시 Gamepad API 직접 읽음. 향후 Full 승격 시 정공법.

### 접근성 기능 마법사 (별도)

- **음량 개별 조절 = "네"(지원)**. 근거: 설정 사운드 탭에 **음악(BGM)·음향 효과(SFX) 슬라이더 2개** 별도(`opt-bgmvol`/`opt-sfxvol`). 단일 슬라이더 아님 → 기준 충족. (앰비언트·난롯불은 SFX 마스터에 묶임, 음성 없음, 그래도 2종이라 통과.) 컨트롤러와 달리 **실제 갖춘 접근성이라 정직하게 "네"**.
- **시각 보조 기능 = 「텍스트 크기 조정」+「카메라 움직임 조정」 2개 체크**.
  - 텍스트 크기 조정 ✅: 설정 「글자 크기」 3단(`opt-fontscale`, REQ-ACC-01) 실존.
  - 카메라 움직임 조정 ✅: 화면 흔들림·카메라 셰이크·모션 블러를 **미사용**(코드 확인, 흔들림은 천·잎·물결 앰비언트뿐) → "효과 미사용" 경로로 충족.
  - 자막 옵션·색상 대체·대비 조절 = 비움(해당 옵션 없음, 음성 콘텐츠 없음).
  - 보너스: 「흔들림·깜빡임 감소」 옵션(`opts.reduceMotion`, 게이지 깜빡임·배지 펄스 정지) 존재 → 향후 광과민성/깜빡임 단계에서 활용.
- **입력 보조 기능 = 「마우스 전용」+「터치 전용」 체크, 「키보드 전용」 비움**.
  - 마우스 전용 ✅: 포인트앤클릭 게임, 전 동작 클릭 경로(카메라=화면버튼+드래그팬+줌), 키보드 필수 동작 없음.
  - 터치 전용 ✅: 포인터 이벤트 마우스/터치 공용(`game.js:6008`), 핀치·2손가락 팬·탭, 모바일 레이아웃(#112). ⚠️ Steam Deck 터치 물리검증 미완, 출시 전 확인 권장.
  - 키보드 전용 ☐: 3D 가구 배치·지도 핀 선택을 키보드 단독 불가(전체 포커스 네비 없음). 키바인드=선택적 단축키.
- **시간제한 입력 = "입력 타이밍에 의존하지 않습니다"(3번)**. QTE·리듬·정밀 타이밍 전무. 인카운터 선택 무타이머, 방치 시계는 일시정지 가능(#3). 강한 접근성 강점. (유일 예외: 히든 침묵 루트 450ms 더블탭, 생존·혹한 전용 이스터에그, 본편 무관, 더블클릭식 표준 조작이라 3번 유지 정직.)
- (이후 단계 나오는 대로 여기 추가.)

### EULA / 법적

- **커스텀 EULA = 안 넣음**(비워둠). 스팀 기본 구독자 계약(SSA)이 전 게임 자동 적용 → 충분.
- 근거: 온라인 서비스·계정 없음(완전 오프라인 싱글), 개인정보 수집 없음(텔레메트리 보류 #168), UGC·모드 없음, 특수 IP 제약 없음. 커스텀 EULA는 첫 실행 동의벽 마찰만 추가.
- **AI 콘텐츠 고지는 EULA와 별개**, 스팀 전용 "AI 생성 콘텐츠 고지" 필드에서 처리(COMMS-KIT A5). EULA 유무와 무관.
- 향후 서버·계정·데이터 수집 생기면 그때 재검토. 최종 결정은 퍼블리셔(디렉터) 몫.
- ⚠️ 빈 EULA 초안(`4950160_eula_0`)이 생성돼 있음, **앱/패키지에 연결(associate)하지 말 것**(연결 시 빈 동의창 노출). 미연결이면 무해.

### 콘텐츠 설문 조사 (Mature Content Survey): 답안

정직 원칙(WORLDVIEW: 온스크린 전투 없음). 성인 등급 플래그 없음(전연령~틴 수준):
| 문항 | 답 | 근거 |
|---|---|---|
| 폭력 | 약함(묘사 없음) | 전투 전부 오프스크린. 부상은 텍스트("경상"/"중상"), 그래픽 유혈 없음. 포스트아포칼립스 설정·전쟁 로어는 언급 수준 |
| 유혈/고어 | 없음 | 해당 콘텐츠 없음 |
| 성적 콘텐츠/노출 | 없음 | 해당 콘텐츠 없음 |
| 성인 전용 콘텐츠 | 없음 | 해당 콘텐츠 없음 |
| 약물/음주/흡연 | 없음 | 진통제·소독약은 의료품(기호품 아님) |
| 도박 | 없음 | 전리품 RNG(도료 잭팟 등)는 도박 콘텐츠 아님(실화폐·베팅 묘사 없음) |
| 욕설 | 없음/미미 | 반말이나 비속어 아님 |
| 성숙한 주제(자유서술) | 사색적 | "포스트아포칼립스 생존의 고독·상실 정서, 쓸쓸한 결말. 그래픽 묘사 없음." 무기록 침묵 루트는 텍스트·화이트아웃(비그래픽) |
- **AI 생성 콘텐츠 고지(설문 내 별도 섹션)**: COMMS-KIT §2 공식 스탠스 문안 사용, "1인 개발, 기획·디자인·검수는 사람, AI는 공구(코드 구현·일러스트 초안·번역 초벌), 모든 생성물 사람 검수." EULA와 무관, 이 필드에서 처리(A5).

### 고객지원 정보
- 지원 이메일(디렉터 naver 또는 전용 support 주소) 필수. 선택: 디스코드/커뮤니티 URL.

### 커뮤니티 아이콘 / 클라우드 (잔여)
- 앱 아이콘·바로가기 아이콘: `steam_logo`(1280×720)/설치본 `build/icon`에서 스팀 요구 크기로 파생 필요.
- Steam Cloud 파일 할당량·제한: Cloud "지원" 선택했으므로 Auto-Cloud 경로+바이트 할당량 설정(#117 연동).

---

## 7-c. 태그 마법사 (9단계): 단계별 선택 정본

> 전략: COMMS-KIT §1 "살림을 판다, 서바이벌 아님". 상위 장르를 **캐주얼+시뮬레이션**으로 잡아
> 첫인상을 코지로. 아래는 **스팀 태그 전체 목차(2026-07-11 검증)에 실제로 있는 정확한 태그명**만 나열.
> 「생존」·「아이들러」·「생활 시뮬레이션」 전부 목차에 실존 → 해당 단계에서 직접 선택 가능.
> 단 **Cozy는 목차에 없다** → 「기타」 자유검색으로만 추가(우리 1순위 발견 태그, 반드시 시도).

| 단계 | 선택 (실제 태그명) | 메모 |
|---|---|---|
| **1. 상위 장르** (1~2개) | **캐주얼 · 시뮬레이션** | 공식 장르. 액션/RPG/전략/어드벤처 아님. |
| **2. 장르** | **생활 시뮬레이션** (샌드박스=선택, 권장 스킵) | ⚠️ 이 단계 실물엔 기지건설·아이들러·생존·탐험·관리 **없음** → 「기타」 자유검색으로. 개척 시뮬(×솔로)·농장 시뮬(×곁가지)·도시 건설(×단일 셸터)·걷기 시뮬(×) 넣지 말 것. |
| **3. 하위 장르** | **아이들러 · 탐험** | 실물 확인: 여기 있음. 인크리멘탈=선택(권장 스킵, 클리커 뉘앙스). 자신이 선택하는 모험=스킵(CYOA 오인). 시간관리·가게운영·아웃브레이크 시뮬 아님. |
| **4. 비주얼 및 관점** | **복셀 · 아이소메트릭 · 3D · 양식화된** (귀여운=선택) | ⚠️ 픽셀 그래픽·2.5D 절대 아님(둘 다 목록에 있으니 주의). 다채로운(×잿빛)·탑다운(×아이소) 아님. 귀여운=발견성 vs 쓸쓸한 톤 트레이드오프(디렉터). |
| **5. 테마 및 분위기** (최대 수확) | **아늑함 · 포스트아포칼립스 · 고양이 · 눈 · 분위기 있는 · 릴랙싱 · 생존 · 감성적 · 깊은 세계관 · 건전함 · 장식** | ⭐아늑함(Cozy)·건전함(Wholesome)·생존이 전부 여기 있음(자유검색 불요). 장식=꾸미기 루프. 어두운·공포·좀비·냉전·공상과학 아님(톤 오인). 선택: 미스터리·자연·정리·청소. |
| **6. 기능** | **기지 건설 · 크래프팅 · 자원관리 · 선택의 중요성 · 복수 결말 · 풍부한 스토리 · 컨트롤러** | 컨트롤러가 이 단계에 있음(#14). 「건설」은 목록에 없어 「기지 건설」로 대체. 🚫**인공 지능 절대 금지**(AI 제작 오해 초대: COMMS-KIT A5, AI 스탠스는 태그 아닌 고지란). 🚫전투(오프스크린)·퍼마데스(하드코어 전용, 코지 오인)·자동화·오픈 월드 아님. |
| **7. 플레이어** | **싱글플레이어** | 멀티 없음. |
| **8. 기타 태그** | **인디** (+ 사운드트랙 선택) | 프랜차이즈/미디어 목록: 우리 건 인디뿐. |
| **평가** | **감정적인 · 서사 · 깊은 세계관 · 릴랙싱 · 웅장한 사운드트랙** | (심리적·리플레이 가치 선택). 단편 금지(장주행 방치형). |
| **등급 관련** | **없음** | 온스크린 유혈·폭력·성인 콘텐츠 0(WORLDVIEW: 전투 오프스크린) → 연령 게이트 회피 = 코지 접근성. |
| **하드웨어 및 입력** | **컨트롤러** (#14 게임패드) | 터치 친화적은 Steam Deck 검증 후 선택. |
| **자금 관련** | **없음** | 정식 출시(EA 아님, SKU-PLAN $9.99). EA 전환 시만 「앞서 해보기」: 디렉터 결정. |
| **자유검색(기타)** | **불필요** | 아늑함·건전함·생존·릴랙싱·장식 전부 테마 단계에, 아이들러·탐험은 하위장르에 실존 확인 → 자유검색 대상 없음. |
| **9. 평가(최종)** | 검토 후 제출 | 마지막 확인 후 게시 |

> ⚠️ **마법사 단계 ≠ 목차 카테고리**: 각 단계는 큐레이팅된 부분집합만 보여준다(예: 「장르」 단계에 생존·아이들러 없음 / 「아늑함·건전함」은 별도 카테고리 아니라 테마 단계에 있음).
> 원칙, **그 단계에 뜨는 것 중 맞는 것만 고르고, 최종 태그 세트(아래)가 다 들어가기만 하면 어느 단계에서 넣었는지는 무관.**

**최종 태그 20개 (등록 순 = 가중치, PAGE-COPY §3 정본과 동일)**:
아늑함 → 기지 건설 → 생활 시뮬레이션 → 아이들러 → 고양이 → 장식 → 포스트아포칼립스 → 릴랙싱 → 생존 → 크래프팅 → 자원관리 → 탐험 → 분위기 있는 → 눈 → 건전함 → 풍부한 스토리 → 복수 결말 → 감성적 → 복셀 → 싱글플레이어

러너업(20 초과 트림 대상 / 여유 시): 선택의 중요성 · 깊은 세계관 · 인디 · 아이소메트릭 · 웅장한 사운드트랙 · 컨트롤러 · 미스터리.

**「나의 태그」 순서 단계 (드래그, 최종)**, 이 순서가 노출·추천 이웃을 결정:
- 서술 태그(3D·아이소메트릭·양식화된·컨트롤러)를 20위 밖으로 밀고, 아늑함·고양이·기지 건설을 최상단으로.
- **아늑함=1위 필수**(없으면 테마 단계로 돌아가 추가). 생존은 10위권 밖(살림을 판다).
- 🚫**「우선순위 제안」 버튼 금지**, 인기도 기반이라 넓은 태그(시뮬레이션·생존)를 위로 올림. 수동 드래그.
- 검증 신호: "비슷한 태그가 적용된 게임"에 Chonkers·Furnish Master·Winter Panda·Lofi Haven(코지 고양이·꾸미기) 노출 = 올바른 이웃.

**핵심**: ①상위 장르 = 캐주얼+시뮬레이션 ②시각 = 복셀/아이소메트릭(픽셀·2.5D 오류 정정) ③생존은 9번째(리드 아님) ④아늑함·건전함이 테마 단계에 실존(자유검색 불요) ⑤등급 태그·자금 태그 = 없음.

---

## 8. 가격 (출시 단계 Propose Pricing에서)

- 본편 **$9.99** (KRW ₩11,000선 수동 보정 권장) / Supporter Pack **$3.99** / OST 별도, [SKU-PLAN.md](SKU-PLAN.md) §0. *(2026-07-12 $11.49→$9.99 인하, 게임 리뷰 근거)*
- 런치 할인 **-15%(≈$8.49)**. 유료 확장 DLC 없음, 1.1~1.4 + 2.0 무료.

## 9. 데모 페이지 짧은 설명 (데모 앱 등록 시)

PAGE-COPY §4 그대로 (KO/EN). Next Fest 소개 단문은 §5.

## 10. 남은 것 (이 문서 밖)

- [ ] GIF 6종 제작(#154) → §3 배치
- [ ] 신규 로고 스팀 규격 변환(#151) → §6 교체
- [ ] 스크린샷 미감 v2(#156) → §6 교체
- [ ] 트레일러 정본 촬영(디렉터)+편집 → §6 교체
- [ ] 개발 로드맵 이미지 캡처(artifact `store-roadmap-v1`) → §11, About This Game 하단 배치
- [ ] Publish 제출 → 검토 2~3일 → **Coming Soon 공개 = 위시리스트 시작**

## 11. 개발 로드맵 (About This Game 하단 — 텍스트 + 이미지)

> 이미지: artifact `store-roadmap-v1`(겨울 밤→붉은 여명 3단계 그래픽)을 캡처해 배치. 아래는 이미지 실패 대비/보조 텍스트.
> Valve EA 규정 준수: 과약속 금지 — 하단 면책 필수. DLC 유료 확장 없음(2.0 무료).

### KO

**◆ 지금 플레이 — 겨울은 이미 시작됐다**
12곳 넘는 은신처(옥탑방·벙커·요트·스키 로지·지하철 역사·등대…) · 사계절 생존(꽃샘추위~겨울 한파) · 뒤지고 만들고 꾸미기 · 살아 있는 죽은 도시(야생동물·덩굴·길고양이) · 무전 기지 「응답하는 불빛」 · 4난이도 + 배경화면 모드.

**◐ 정식 출시까지 — 다듬는 겨울**
일본어 지원 · Steam 클라우드 세이브 · Steam Deck 최적화 · 밸런스·편의 다듬기(전 모드 오디트) · 커뮤니티 피드백 반영.

**◇ 정식 이후 — 2.0 「응답」 (무료 업데이트)**
동부 영토(겨울 셋을 넘기면 열린다) · 신규 지역 8곳 + 은신처 4곳 · 도시의 시그니처=복장(가구 아님) · 「응답」 서사(내 신호에 답한 먼 창문들) · 단계별(관문→도시→응답).

*로드맵은 방향입니다. 순서와 규모는 플레이어 피드백에 따라 달라질 수 있습니다.*

### EN

**◆ Available Now — Winter Has Already Begun**
12+ shelters (rooftop flat, bunker, yacht, ski lodge, subway station, lighthouse…) · four-season survival (thaw frosts to deep-winter cold snaps) · scavenge, craft, and decorate · a living dead city (returning wildlife, creeping ivy, a stray cat) · the radio station and its "answering lights" · four difficulties + wallpaper mode.

**◐ Toward 1.0 — A Winter of Polish**
Japanese language · Steam Cloud saves · Steam Deck optimization · balance & QoL tuning (all-mode audit) · community feedback.

**◇ After Launch — 2.0 "The Answer" (Free Update)**
The eastern territory (opens after three winters) · 8 new regions + 4 new shelters · a city's signature is *clothing*, not furniture · the "Answer" storyline — the distant windows that replied to your signal · staged rollout (gate → city → answer).

*This roadmap is a direction. Order and scope may shift with player feedback.*
