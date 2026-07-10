# Nine Winters — Steamworks 제출 정본 (필드별 붙여넣기)

> **사용법**: Steamworks(앱 4950160) 각 입력란에 이 문서의 해당 블록을 그대로 붙여넣는다.
> 카피 원문은 [PAGE-COPY.md](PAGE-COPY.md), 가격·SKU는 [SKU-PLAN.md](SKU-PLAN.md), 트레일러는 [trailer/CUT-SHEET.md](trailer/CUT-SHEET.md)가 정본 — 이 문서는 "제출 순서와 답안"만 담는다.
> ⚠️ 마지막에 반드시 **Publish** 버튼까지 눌러야 검토 큐에 들어간다(저장≠제출). 검토 영업일 2~3일.

---

## 0. 제출 순서 체크리스트

1. Basic Info(장르·태그·언어) → 2. Description(짧은/긴 설명) → 3. Graphical Assets(캡슐 8종) → 4. Screenshots(8장) → 5. Trailer(draft 업로드, 정본 교체 예정) → 6. 성인 콘텐츠 설문 → 7. AI 공개 설문 → 8. Publish → (별도 트랙) 가격은 출시 단계 `Propose Pricing`에서.

---

## 1. Basic Info

| 필드 | 값 |
|---|---|
| App Name | **Nine Winters** |
| 장르 (Genres) | Simulation (주) · Casual, Indie (부) |
| 태그 15 (순서 유지 — 앞 5개 노출 가중) | Idle, Cozy, Survival, Base Building, Post-apocalyptic, Pixel Graphics, Relaxing, Crafting, Exploration, Singleplayer, Atmospheric, Cats, Building, Resource Management, 2.5D |
| 개발사/배급사 | CokeTown |
| 출시 시기 표기 (Coming Soon) | KO: `2026년 겨울` / EN: `Winter 2026` — 구체 날짜는 빌드 승인 후 확정 |
| 지원 플랫폼 | Windows (데모/본편). *모바일은 스팀 외 채널.* |

**지원 언어 매트릭스** (Supported Languages):

| 언어 | 인터페이스 | 자막 | 음성 |
|---|---|---|---|
| Korean | ✅ | ✅ | — (음성 없음) |
| English | ✅ | ✅ | — |

---

## 2. Short Description (300자)

**KO** — PAGE-COPY §1 그대로:

> 세상은 이미 끝났고, 되돌릴 수 없다. 그래도 난롯불은 지필 수 있고, 고양이는 곁에 눕는다. **Nine Winters**는 폐허 속 셸터 하나를 손질하며 아홉 번의 겨울을 나는 코지 생존 게임이다. 창밖으로 잿빛 도시가 얼어붙는 동안, 안에서는 수프를 데우고 벽지를 고쳐 붙이고 라디오를 켠다. 회복은 사건이 아니라 습관이다. 살아남는 게 아니라, 살아보는 이야기.

**EN**:

> The world already ended — yet the stove still lights, and the cat curls up beside you. **Nine Winters** is a cozy survival game about tending one shelter through nine winters. As the grey city freezes outside, you warm the soup, mend a wall, turn on the radio. Recovery is a habit, not an event. Not surviving — dwelling.

---

## 3. About This Game — GIF 배치 설계 (AAA 스타일)

본문 카피는 PAGE-COPY §2(ko/en) 그대로 쓰되, **단락 사이에 GIF를 끼워** 스크롤마다 게임이 움직이게 한다. Steam 본문 이미지 권장 616px 폭 — `docs/steam/gifs/`(#154 제작 중, 각 3MB 이하):

| 위치 | GIF | 보여주는 것 | 카피 앵커 |
|---|---|---|---|
| 도입부 직후 | `gif_candle.gif` — 어둠에서 촛불 하나가 방을 밝힘 | 첫인상: 톤 | "당신의 셸터에는 아직 불이 켜져 있다" 아래 |
| "손질과 꾸미기" 항목 위 | `gif_decorate.gif` — 가구 스톱모션 배치+색 변경 | 코어 루프 ① 꾸미기 | 불릿 리스트 시작 전 |
| "아홉 번의 겨울" 항목 아래 | `gif_seasons.gif` — 해 뜨고 지고, 맑음→비→눈 | 계절/날씨 시스템 | 계절 불릿 바로 아래 |
| "난로 앞의 고양이" 항목 아래 | `gif_cat.gif` — 고양이 클로즈업 전환 | 감정 훅 | 고양이 불릿 바로 아래 |
| "이 폐허에서 할 수 있는 것" 끝 | `gif_loot.gif` — 정산 개봉+희귀 골드/핑크 배지 | 도파민 루프 | 불릿 리스트 끝 |
| 마무리 문단 위 | `gif_widget.gif` — 바탕화면 위젯 모드 | 차별화 피처 | "사망 연출은 없다" 문단 위 |

레이아웃 규칙: GIF는 연속 2개 금지(카피→GIF→카피 리듬), 각 GIF 아래 한 줄 캡션 없이(본문이 캡션 역할). EN 페이지도 동일 배치.

---

## 4. 성인 콘텐츠 설문 (Mature Content Survey) 답안

| 문항 | 답 | 근거 |
|---|---|---|
| 폭력 (Violence) | **일부: 비유혈·비묘사적** | 총기가 아이템으로 존재(혹한·후반)하나 발사·살상 묘사 없음. 동물·인간 피해 묘사 없음 |
| 유혈 (Gore) | 없음 | — |
| 성적 콘텐츠 | 없음 | — |
| 약물/음주 | 없음 | — |
| 도박 | 없음 | — |
| 성인 전용 여부 | 아니오 | — |
| 비고 서술란 | KO: "포스트 아포칼립스 배경의 코지 생존 게임입니다. 죽음·유혈 연출이 없으며, 실패는 '조금 덜 온전한 하루'로 표현됩니다." / EN: "A cozy survival game in a post-apocalyptic setting. No death scenes or gore; failure is expressed as 'a slightly less whole day.'" |

---

## 5. AI 콘텐츠 공개 (필수 설문) — #116 확정 방침

- **Pre-Generated AI content: YES / Live-Generated: NO**
- 공개 문구 (설문 서술란):

**EN**: "Some 2D assets (UI icons, marketing capsule art) were created with generative AI tools and then curated and edited by the developer. Portions of the game code were written with AI-assisted development tools under direct developer supervision. The game contains no live/runtime AI generation."

**KO**: "일부 2D 에셋(UI 아이콘, 마케팅 캡슐 아트)은 생성형 AI 도구로 제작 후 개발자가 선별·수정했습니다. 게임 코드 일부는 개발자의 직접 감독 아래 AI 보조 개발 도구로 작성되었습니다. 게임 내 실시간 AI 생성은 없습니다."

---

## 6. Graphical Assets 파일 매핑 (전부 규격 실측 일치)

| Steamworks 슬롯 | 파일 | 규격 |
|---|---|---|
| Header capsule | `capsules/header_capsule.png` | 460×215 ✅ |
| Small capsule | `capsules/steam_small_capsule.png` | 231×87 ✅ |
| Main capsule | `capsules/steam_main_capsule.png` | 616×353 ✅ |
| Vertical capsule | `capsules/vertical_capsule.png` | 374×448 ✅ |
| Library capsule | `capsules/library_capsule.png` | 600×900 ✅ |
| Library hero | `capsules/library_hero.png` | 3840×1240 ✅ |
| Library logo | `capsules/steam_logo.png` (신규 정식 로고 v2 교체 예정 — #151) | 1280×720 ✅ |
| Screenshots (순서대로) | `shots/final/01~08` (미감 v2 교체 예정 — #156) | 1920×1080 ✅ |
| Trailer | `trailer/draft.mp4`(54s 무음 가편) 업로드 → 정본(트레일러 에디션 v3.1 촬영본) 편집 완료 시 교체 | 1080p+ |

---

## 7. 시스템 요구사항 (스팀 백엔드 폼 필드별 — 폼 언어 = 영어, v1.9.0 실측 2026-07-10)

> 스팀 "시스템 요구 사항" 폼의 각 칸에 그대로 붙여넣는다. 폼 언어가 영어이므로 **값은 영어**로 입력.
> 빈 칸(사운드 카드·VR·추가 알림)은 비워 둔다 — 억지로 채우면 오히려 노이즈.

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
- **저장공간** — v1.9.0 설치 후 실측 575MB. 스팀은 depot를 자체 다운로드·해제하므로 우리 NSIS 설치본과 무관. 세이브·업데이트·depot 여유 포함해 최소 1GB / 권장 2GB.
- **DirectX = N/A** — Electron/WebGL2 게임이라 사용자가 특정 DirectX 런타임을 설치할 필요 없음(내부적으론 Chromium ANGLE이 D3D11 경유). 값을 강제로 넣지 않는다. 리뷰어가 값을 요구하면 "11"로.
- **네트워크 = 미체크** — 완전 오프라인 싱글플레이(스팀 실적/클라우드 세이브는 네트워크 요건 아님).
- **RAM/CPU** — 저폴리 복셀 + 배터리 최적화(#25)로 내장 그래픽에서도 코지 프레임 유지. 4GB/듀얼코어가 진짜 바닥값.

EN one-line (문서 참조용) — Minimum: Windows 10 64-bit, Dual-core 2 GHz, 4 GB RAM, WebGL 2.0-capable GPU (integrated OK), 1 GB storage. Recommended: Windows 11 64-bit, Quad-core 2.5 GHz+, 8 GB RAM, dedicated WebGL 2.0-capable GPU, 2 GB storage.

---

## 7-b. 지원 기능 (Supported Features 체크리스트) — 각 항목이 곧 구현 약속

> 스팀은 체크한 기능의 실동작을 심사한다. **초록불(체크)은 출시 전 반드시 구현·테스트해야 하는 게이트**.
> 코지 싱글플레이·오프라인 게임이라 켜는 건 딱 2개, 나머지는 전부 끈다.

| 항목 | 체크? | 근거 / 남은 일 |
|---|---|---|
| **Steam 도전 과제** | ✅ 켬 | 인게임 업적 18종(일반 17+히든 「침묵」) 완비 · 매핑표 `platform.js` STEAM_ACH_MAP. **출시 게이트**: ①Steamworks 콘솔에 API Name(ACH_*)으로 18종 등록(침묵=히든 플래그) ②electron preload 네이티브 브릿지(window.nineSteam.unlock) 구현·테스트. 현재는 로컬만 동작. |
| **Steam Cloud** | ✅ 켬 | 세이브 슬롯 무한(#66) → 클라우드 세이브 가치 큼. **출시 게이트**: Steamworks Auto-Cloud 경로 등록(Electron userData 세이브 위치) + 왕복 테스트. 어댑터(`platform.js` cloud)는 준비됨. |
| 통계 | ☐ 끔 | Steam Stats API 미사용. 텔레메트리는 보류(#168). |
| Steam 순위표 | ☐ 끔 | 경쟁 점수 없음(코지). |
| 앱 내 구매 | ☐ 끔 | 서포터팩은 **상점 노출 DLC**라 DLC 설정으로 처리 — 이 박스(상점 미표시 소액결제)는 해당 없음. |
| 캡션 이용 가능 | ☐ 끔 | 텍스트 중심이나 '소리·음악·효과음 설명 자막'은 미구현. (접근성 향후 과제 후보) |
| Steam 타임라인 | ☐ 끔 | Timeline 마커 API 미사용(겨울 넘김·엔딩 마커는 향후 nice-to-have). |
| Steam 창작마당 | ☐ 끔 | UGC 없음. |
| 창작마당(China) | ☐ 끔 | 해당 없음. |
| 레벨 에디터 포함 | ☐ 끔 | 없음. |
| Remote Play (폰/태블릿/TV) | — | 회색 비활성 — Valve가 테스트로 자동 판정. 손대지 않음. |
| Remote Play Together | ☐ 끔 | 로컬 협동/스트리밍 초대 없음(싱글). |
| HDR 사용 가능 | ☐ 끔 | SDR 렌더. (경고문: 내부 HDR→SDR 톤매핑 게임은 켜지 말 것 — 우리가 그 경우). |
| Steam 턴 알림 | ☐ 끔 | 턴제 멀티 아님. |
| 코멘터리 제공 | ☐ 끔 | 개발자 코멘터리 모드 없음. (AI 공방 서사(COMMS-KIT)와 맞물리는 향후 후보) |
| Source SDK 포함 | ☐ 끔 | Valve Source 엔진 전용. |

**요약**: 「Steam 도전 과제」·「Steam Cloud」 2개만 켠다. 단, 둘 다 **Steamworks 네이티브 브릿지가 아직 없어** 지금 체크 상태는 "출시 때 구현하겠다"는 약속이다 — 스토어 페이지 심사 통과와 별개로, **정식 출시 빌드 전까지 브릿지 구현(#117 연장선)이 완료돼야** 초록불이 거짓이 안 된다. 데모/Next Fest 빌드만 올릴 거면 이 2개를 잠시 끄고 출시 시 켜는 선택지도 있다(디렉터 판단).

---

## 7-c. 태그 마법사 (9단계) — 단계별 선택 정본

> 전략: COMMS-KIT §1 "살림을 판다, 서바이벌 아님". 상위 장르를 **캐주얼+시뮬레이션**으로 잡아
> 첫인상을 코지로 세팅. Survival은 존재하되 앞에 두지 않는다. 태그 순서 = 검색 가중치(앞이 큼).
>
> **작동 원리(중요)**: 1단계 「상위 장르」만 스팀 **공식 장르**(액션/캐주얼/시뮬레이션 등 고정 목록)에서 고른다.
> Survival·Idler·Cozy 등은 전부 **사용자 태그**라 중간 단계 목록엔 없을 수 있다 — 이건 **8단계 「기타」에서
> 검색해 추가**한다(검색엔 스팸 실존 태그만 뜨므로, 안 나오는 건 그냥 없는 태그). 중간 단계(2·3·5)는
> **그 화면이 보여주는 후보 중 맞는 것만** 고르고, 원하는데 없으면 「기타」로 넘긴다.

| 단계 | 선택 | 메모 |
|---|---|---|
| **1. 상위 장르** (1~2개) | **시뮬레이션 · 캐주얼** | 공식 장르에서 선택. 아늑한 살림 시뮬 + 저압. 액션/RPG/전략 아님. 어드벤처도 상위엔 안 둠(스토리 우선 오인). |
| **2. 장르** | 보이는 후보 중: 시뮬레이션 계열 · 캐주얼 · (Life Sim 있으면 선택) | Survival/Idler가 여기 없으면 정상 → 8단계로. 억지로 안 맞는 걸 넣지 않는다. |
| **3. 하위 장르** | 보이는 후보 중: 기지 건설 · 제작 · 자원 관리 · 아늑함(있으면) | 없는 건 8단계에서. |
| **4. 시각적 요소 및 시점** | **복셀(Voxel) · 아이소메트릭 · 3D · 양식화(Stylized)** | ⚠️ Pixel Graphics·2.5D 아님(3D 복셀). 후보에 있는 것만 체크. |
| **5. 테마 및 분위기** | 보이는 후보 중: 아늑함 · 포스트 아포칼립스 · 편안한 · 감성적 · 분위기 있는 · 고양이 | 정서 코어. 없는 건 8단계로. |
| **6. 특징** | 싱글 플레이어 · Steam 도전 과제 · Steam Cloud · 컨트롤러 지원(#14, 부분→검증 후 전체) | §7-b와 정합(브릿지 게이트 동일). |
| **7. 플레이어** | 싱글 플레이어 | 멀티 없음. |
| **8. 기타** (검색 추가 — 사용자 태그 본진, 순서=가중치) | Cozy → Base Building → Life Sim → Idler → Cats → Post-apocalyptic → Relaxing → Survival → Crafting → Resource Management → Exploration → Atmospheric → Story Rich → Wholesome → Singleplayer → Voxel → Indie | 최대 20개. **여기서 Survival·Idler·Cozy 등 전부 검색 추가.** 검색에 안 뜨는 태그는 실존하지 않는 것 → 건너뜀. PAGE-COPY §3 정본. |
| **9. 평가** | 검토 후 제출 | — |

**핵심 결정**: ①상위 장르 = 캐주얼+시뮬레이션(공식 장르, 서바이벌 상위 노출 금지) ②시각 태그 = 복셀/아이소메트릭(픽셀·2.5D 오류 정정) ③Survival·Idler 등 사용자 태그는 전부 **8단계 「기타」** 담당(중간 단계에 없어도 정상), Survival은 8번째 순번.

---

## 8. 가격 (출시 단계 Propose Pricing에서)

- 본편 **$11.49** (KRW 자동 환산 후 ₩12,500선으로 수동 보정 권장) / Supporter Pack **$3.99** / OST 별도 — [SKU-PLAN.md](SKU-PLAN.md) §0.
- 런치 할인 10% (Zukowski 관례선). 유료 확장 DLC 없음 — 1.1~1.4 무료.

## 9. 데모 페이지 짧은 설명 (데모 앱 등록 시)

PAGE-COPY §4 그대로 (KO/EN). Next Fest 소개 단문은 §5.

## 10. 남은 것 (이 문서 밖)

- [ ] GIF 6종 제작(#154) → §3 배치
- [ ] 신규 로고 스팀 규격 변환(#151) → §6 교체
- [ ] 스크린샷 미감 v2(#156) → §6 교체
- [ ] 트레일러 정본 촬영(디렉터)+편집 → §6 교체
- [ ] Publish 제출 → 검토 2~3일 → **Coming Soon 공개 = 위시리스트 시작**
