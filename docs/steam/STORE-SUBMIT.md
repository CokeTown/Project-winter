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

## 7. 시스템 요구사항 (Electron 실측 기반 — v1.9.0 빌드 재검산 2026-07-10)

**최소** — OS: Windows 10 64-bit / CPU: 듀얼코어 2GHz / RAM: 4GB / GPU: WebGL2 지원(내장 그래픽 가능) / 저장공간: 1GB
**권장** — OS: Windows 11 64-bit / CPU: 쿼드코어 / RAM: 8GB / GPU: WebGL2 지원 외장 / 저장공간: 2GB

EN — Minimum: Windows 10 64-bit, Dual-core 2GHz, 4GB RAM, WebGL2-capable GPU (integrated OK), 1GB storage. Recommended: Windows 11 64-bit, Quad-core, 8GB RAM, dedicated WebGL2 GPU, 2GB storage.

> 근거: v1.9.0 설치 후 실크기 575MB 실측 + 설치 중 설치본(275MB)·해제 공간 동시 소요 → 최소 1GB로 상향.
> 세이브·업데이트 여유 포함 권장 2GB. RAM은 오프스크린 하네스 장주행(#25 배터리 최적화) 기준 내장 그래픽에서도 코지 프레임 유지.

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
