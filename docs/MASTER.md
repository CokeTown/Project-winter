# MASTER — Nine Winters 인계 정본

> **모든 세션은 이 문서를 가장 먼저 읽는다.** 여기에 현재 좌표·직전 세션이 한 일·다음 한 수가 있다.
> **모든 세션은 끝날 때 §2 인계 로그 맨 위에 한 블록을 추가한다.** (일지 `docs/worklog/`는 별도 — 날짜별 상세, 통합하지 않는다.)
> 최종 갱신: 2026-07-21

---

## 0. 세션 시동·마감 절차

**시동 (순서 고정)**
1. **이 문서 §1 좌표 + §2 최신 인계 블록 1개** — 여기서 "지금 어디이고 다음이 무엇인지"가 끝난다.
2. `docs/WORKLINE.md` — 작업 번호 원장(진행/대기). **다음 작업은 여기서 고른다.**
3. 해당 작업의 스펙 문서(§3 문서 지도에서 위치 확인).
4. 규칙이 헷갈리면 `docs/OPERATIONS.md` (검증 명령·릴리스 파이프·결정 경계·트러블슈팅).

**마감 (순서 고정)**
1. 일지 작성 — `docs/worklog/YYYY-MM-DD-요일.md` (별도 커밋)
2. `docs/WORKLINE.md` 갱신 (진행/대기/완료 반영)
3. **이 문서 §1 좌표 갱신 + §2 인계 블록 추가** ← 다음 세션이 읽을 유일한 요약
4. 프로세스 스윕(OPERATIONS §6) → push

---

## 1. 현재 좌표

| 항목 | 값 |
|---|---|
| 버전 | **v1.9.12** (릴리스 [v1.9.12-dc](https://github.com/CokeTown/Project-winter/releases/tag/v1.9.12-dc)) |
| 작업 브랜치 | `map-aerial` (← `ui-hud` ← `ui-semiotic` ← `gd-2.0`) |
| 트렁크 | `gd-2.0` (2.0 개발 정본) · `demo-vertical-slice` (데모, 워크트리 `G:\pw-demo`) · `main` (정식 베이스) |
| 다음 관문 | **Steam Next Fest 10월** — 크리티컬 패스는 상점 페이지 제출〔D〕 |
| 원격 | https://github.com/CokeTown/Project-winter.git |

**지금의 큰 줄기 3개**
- **출시 트랙(최우선)** — 상점 제출·캡슐·트레일러·데모 재수렴. 상세 `MILESTONES.md` M0.
- **리팩터(대기)** — 개선 포인트 P1~P5 진단 완료·구현 미착수. 상세 `design/eng/REFACTOR-GUIDE.md`. **별도 브랜치 필수**(기능과 섞으면 무손실 증명 불가).
- **UI 리워크(진행 중)** — 세미오틱 글리프 + HUD 기획서 반영. 상세 `design/ui/UI-PIXEL-UNITY.md` §5, `design/ui/HUD-SPEC-RECON.md`.
- **2.0 「응답」(비축)** — 출시 블로커 없을 때만 소비. 상세 `design/canon/GD-2.0.md`.

---

## 2. 세션 인계 로그

> 최신이 위. 한 세션 = 한 블록. **다음 세션은 맨 위 블록만 읽으면 인계가 끝나야 한다.**

### 블록 작성 규약 (세션 마감 시 이 형식 그대로)

```
### YYYY-MM-DD (요일) · 세션 제목
- **트랙 진척도**: 어떤 트랙이 어디까지 왔는지 — 전/후를 함께. 예: "UI 리워크: 글리프 100% → HUD 1차 완료(2차 0%)"
- **한 일**: 결과 중심. 왜 그렇게 했는지 판단 근거 한 줄씩
- **산출**: 커밋 해시 · 릴리스 태그 · 신설/삭제 문서
- **검증**: 실제로 돌린 것과 관측값 (배터리 N/N · 골든 N/N · 실캡처 등)
- **다음 한 수**: 바로 착수 가능한 형태로. 왜 그게 다음인지 포함
- **열린 결정〔D〕**: 디렉터 판단 대기 + 미승인 시 롤백 비용
- **⚠️ 알려진 이슈**: 미해결·플레이키·함정 (다음 세션이 같은 함정을 밟지 않게)
```

**진척도를 쓰는 이유**: "무엇을 했나"만 있으면 다음 세션이 *전체 중 어디쯤인지*를 몰라 같은 조사를 반복한다. 트랙 단위 백분율/단계로 적어 맥락을 잃지 않게 한다.

### 2026-07-22 (수) · 항공뷰 지도 — 설계 2판 + S1/S1-b 라이브 프로토
- **트랙 진척도**: **항공 지도(신규 트랙) 0% → S1+S1-b 완료**(설계 2판 확정 · 라이브 디오라마 · 폐허 손상 원형 · 시간 잠식 · 판단물 2벌 제출). **S2~S4는 0%**. · UI 리워크: HUD 2차 0% 유지 · 리팩터: P1 부분(조명 인자화)이 지도 S2의 전제로 승격.
- **한 일**: ①`AERIAL-MAP.md` 설계→**개정 1차**(디렉터 확정: 실시간·데모 필수·프로토로 판단 → 베이크안 폐기, **단일 라이브 씬+카메라 2상태**) ②**S1**: 인스턴싱 도시·조명 키프레임 8(밤=달 재해석)·눈 3면 스왑·overview↔focus 돌리 줌·**본편 픽셀화 파이프 공유**(renderFrame 분기 — 시뮬 틱 유지라 실시간이 공짜) ③**S1-b**(디렉터 "네모 퉁치지 말 것 + Over Grown"): 손상 원형 6종으로 부지 300→**박스 1,406**(온전은 16%뿐)+잔해 스커트, 잠식은 **기존 #71 규약 이식**(발명 아님 — years=min(3,day/360)·겨울 마른톤×0.6, 실측 5→124→575) ④**캡처 도구를 저장소로 승격**(`tools/aerial-capture.cjs`).
- **산출**: 커밋 `9b84ae0`·`33c1fee`(설계) `8266337`(S1) `e6fd2b8`(S1-b) · 브랜치 `map-aerial` · 판단물 아티팩트 2벌(시간대×날씨 8컷 / 잠식 연차 8컷).
- **검증**: 배터리 102/102 · **골든 17/17(0.114%) — 프로토 추가 본편 무회귀** · 하드코드 0 · 캡처 도구 저장소 경로에서 실행 재확인.
- **다음 한 수**: 디렉터 S1 판정〔D〕→ GO 시 S2(노드 DOM 오버레이·정보 카드·mapview 추출·출발 연결·조명 함수 본편 통일=REFACTOR P1 부분). 8월 중 판정이 데모 유입(S3)의 안전선. 판정 전 추가 연마 후보: 철골 노출·슬래브 각도 / 잠식 형상(박스→덩굴 띠) / 원경 밀도 / 화재 그을음.
- **재현**: `npm run build:electron` → `./node_modules/.bin/electron.cmd tools/aerial-capture.cjs --mode=ruin` → `scratchpad/aerial/` 8컷. 상세는 `design/systems/AERIAL-MAP.md` 구현 현황 절.
- **⚠️ 함정 3건**(AERIAL-MAP에 상세): ①팩토리 반환에 메서드 미노출 → renderFrame 사망 → **정지 프레임이 정상 렌더로 위장**(에러 리스너 선부착 필수) ②노드 회피 반경 20이 focus를 빈 공터로(→11) ③안개 밀도 고정이 overview를 씻어냄(→거리 반비례).

### 2026-07-21 (화) · HUD 기획서 반영 + 문서 통합 + 리팩터 가이드
- **트랙 진척도**
  - **UI 리워크**: 글리프 100%(72종 솔리드 완료) → **HUD 1차 완료**(명령 바 상단 이동·게이지 심각도·행 스택) · **HUD 2차 0%**(Tab 정보 확장·알림 큐+시스템 로그·PDA 중 HUD 축소 미착수)
  - **문서 체계**: 0% → **100%**(MASTER 인계 체계 신설 + 중복 병합 + `design/` 5폴더 재편 + CLAUDE.md `@`임포트 자동 로드)
  - **리팩터**: 진단 0% → **가이드 문서화 완료**(`design/eng/REFACTOR-GUIDE.md` P1~P5), **구현 0%**
  - **출시 트랙(M0)**: 변동 없음 — 상점 제출·캡슐·트레일러 전부 디렉터 몫에서 대기
- **한 일**: ①GPT HUD 기획서 v0.1 ↔ 현 게임 **상충안** 작성(`design/ui/HUD-SPEC-RECON.md`) — 스펙 승 4/게임 승 3 판정 ②`ui-hud` 브랜치 1차 구현: 명령 바를 좌상단 2×4 그리드 → **상단 밴드**로 이동(뷰포트 중앙 정렬은 1280서 시계와 71px 겹쳐 갭 밴드 앵커로 해소), 게이지 **색=심각도** + 수치 + 상태 문자 ③v1.9.12 범프·릴리스 3종 발행 ④**문서 통합**(MASTER 신설·로드맵 4→1·design 5폴더) ⑤**리팩터 가이드** 신설(실측 기준선 + P1~P5 패턴 처방).
- **산출**: 커밋 `8748665`(HUD 1차) `b0d0bc5`(상단 이동) `358b9af`(범프) `95eb252`(문서 통합) `87a2de3`(구조 재편) `b4f6348`(design 5폴더) `e723086`(@임포트) · 릴리스 v1.9.12-dc(exe 2종+APK) · 신설 `MASTER.md`·`RELEASE-CYCLE.md`·`design/README.md`·`design/eng/REFACTOR-GUIDE.md`·`steam/trailer/README.md`.
- **검증**: 배터리 102/102 · 모달 DOM 7/7 · i18n 2196 무결 · 1280/1920 rect 겹침 0 · 문서 이동 후 깨진 링크 0(전 추적 md 스캔).
- **다음 한 수**: 둘 중 택1 — ⓐ **HUD 스펙 2차**(알림 큐 + 시스템 로그 우선 추천: 데이터가 이미 있고 토스트 증발 문제까지 동시 해결) ⓑ **리팩터 P1**(렌더 컨텍스트 객체 — 아래 알려진 이슈의 근원 치료). 리팩터는 반드시 별도 브랜치(기능과 섞으면 무손실 증명 불가).
- **열린 결정〔D〕**: ①게이지 색=심각도 전환이 v1.9.10 "색=정체" 구오더를 **대체**하는지 승인 ②수치 병기 복원("수치는 PDA 전용" 폐기) 승인. 미승인 시 각 1커밋 롤백.
- **⚠️ 알려진 이슈**: 골든 `lodge` 1건 크로스프로세스 플레이키(check1 0.04% ↔ check2 4.6%) — HUD 무관·기존(#212 계열), 런타임 영향 0. 원인 규명은 골든 결정론 후속으로 이관.

### 2026-07-20 (월) · 세미오틱 글리프 (도트 이후)
- **트랙 진척도**: UI 리워크 — 도트 아이콘 154장 체제 → **글리프 72종 100% 전환**(UI 크롬 한정. 가구 47·지도 마커는 잔류 도트, 처분 미결)
- **한 일**: 커뮤니티 피드백("어설픈 도트는 마이너스 자산") 트리아지 → UI 크롬 아이콘을 도트 PNG에서 **솔리드 세미오틱 글리프 72종**으로 전환(`tools/icon-semiotic.mjs`). 게임 문법 상징 복원(탐험=배낭·제작=망치·취침=침대). PDA 인광 듀오톤, 이모지 스트립 3/N.
- **산출**: 커밋 `73a7d15`·`10f83d7`·`f52b2a8`·`9db0682` · 릴리스 v1.9.11-dc.
- **핵심 함정 2건**: ①`mask-image`를 CSS 변수 상대 url로 담으면 dist에서 404→전면 투명(**인라인 직지정 필수**) ②`<g>` `stroke-width` 중복 속성 = XML 파싱 에러로 글리프 소실. 둘 다 재도입 금지.
- **결정**: 폰트 Silver 기각·**둥근모꼴 유지**.

### 2026-07-19 (일) · 노스트로모 터미널 UI
- **트랙 진척도**: UI 리워크 착수 — 웜 차콜 패널 체제 → **터미널 스킨 100%**(아이콘은 아직 도트, 다음 세션이 이어받음)
- **한 일**: 녹색 인광 터미널(프레임·코너 브래킷·디지털 세그먼트 게이지·`//` 헤더·점멸 LED). 릴리스 v1.9.9-dc 3종.

### 그 이전
`docs/worklog/` 날짜별 일지 + `docs/WORKLINE.md` 원장 참조. 버전 이력은 `docs/PATCHNOTES.md`, 설계 결정 이력은 `docs/HISTORY.md`.

---

## 3. 문서 지도 (통합 후)

```
docs/
├── MASTER.md            ★ 이 문서 — 진입점·현재 좌표·세션 인계 로그
├── WORKLINE.md          ★ 작업 번호 원장 (진행/대기/완료) — 다음 작업 선택
├── OPERATIONS.md        ★ 운영 플레이북 — **어떻게 실행하나** (검증 명령·릴리스 파이프·결정 경계·트러블슈팅)
├── RELEASE-CYCLE.md     ★ 버전업 게이트 계약 — **무엇이 통과해야 하나** (12게이트, 구 qa/)
├── MILESTONES.md        ★ 로드맵 정본 (M0 출시 → M1 부채 → M2~M4 2.0) + 발매 이력 + 상점용 로드맵 카피
├── PROJECT.md           기술 개요 (스택·코드 지도·BGM 규칙·빌드 명령)
├── PATCHNOTES.md        버전별 변경 이력 (플레이어용 문체)
├── HISTORY.md           설계 결정·폐기 이력 (재도입 금지 목록 포함)
├── MARKETING.md         포지셔닝·타깃·커뮤니케이션 킷(문구 정본)
├── BALANCE-NOTES.md     경제/밸런스 시뮬 데이터
├── QA-REPORT.md         QA 현황
├── COPY-REVIEW.md       카피 전수 검토
├── worklog/             날짜별 일지 (통합하지 않음 — 상세 기록)
├── design/              설계 정본 — **색인 design/README.md**. 5개 주제 폴더:
│   ├── canon/           서사·세계관 (GD-THESIS · WORLDVIEW · GD-1.0/2.0 · ENDINGS-REV3 · SCENARIO-FLOWS · VISITOR-VOICES)
│   ├── systems/         게임 시스템 (DEPTH-DESIGN · REWARD-LOOP · DEMO-REDESIGN · 인카운터/가구/동부/라이팅)
│   ├── ui/              UI·아트 (★UI-PIXEL-UNITY · ★HUD-SPEC-RECON · UI-REWORK-REVIEW · UI-TOKENS · ICON-WORKLIST · AI-ART-ANTISLOP)
│   ├── review/          리뷰·이력 (DESIGN-REVIEW · GAME-REVIEW · QUALITY-UP · DESIGN-HISTORY)
│   └── eng/             기술·규약 (★REFACTOR-GUIDE · SAVE-SCHEMA · PORTING · REFACTOR-LOG · REQUIREMENTS-1.0 · L10N-JA)
├── steam/               스토어 (STORE-SUBMIT · PAGE-COPY · SKU-PLAN · DEPOT · ACHIEVEMENTS-SUBMIT · STRATEGY-NEXTFEST)
│   └── trailer/         트레일러 전량 (정본/계보는 trailer/README.md)
├── reports/             시점 감사 리포트 (SEAM/MODE/LIGHTING/GROUNDING/AUDIT-1.4 …) — 날짜 스냅샷, 설계 정본 아님
├── l10n/ · feedback/
└── (구판은 삭제하고 정본에 흡수 — 로드맵 3종·HANDOFF·COMMS-KIT 등)
```

**2026-07-21 구조 재편**: `design/` 평면 33개 → **5개 주제 폴더**(링크 스크립트 재계산, 깨진 링크 0) · `docs/qa/` 해소(감사→`reports/`, 게이트 계약→`RELEASE-CYCLE.md`, 세이브 픽스처→`tests/fixtures/qa-saves/`) · `docs/marketing/` 해소(문구→`MARKETING.md`, 트레일러 스크립트→`steam/trailer/`) · `docs/localization/` 빈 껍데기 제거 · 루트 트레일러 렌더 산출물 4GB를 `.gitignore`로 격리.

---

## 4. 불변 규칙 (요약 — 상세는 OPERATIONS.md)

- **검증 명령은 하나**: `npm run test:build` (RESULT ALL GREEN 육안 확인). `node tests/core.test.cjs` 직접 호출은 크래시.
- **커밋 전 3종**: 배터리 그린 + `check-i18n` 무결 + (시각 변경 시) 골든/하네스 실캡처.
- **신규 문자열 = ko+en+ja** × `src/locales`+`public/locales` **6파일**.
- **시각 변경은 실렌더 검증 필수** — 오프스크린 하네스로 캡처해 눈으로 본다. "코드상 맞을 것"은 검증이 아니다.
- **버전 완결 = exe + setup + APK 3종 GitHub 릴리스** (`tools/publish-beta.ps1`).
- **게임 구동 후 프로세스 스윕** (electron/node/java 잔류 제거).
- **디렉터 전용 영역**(제안만): 가격·SKU·스토어 제출·세계관 변경·폐기 설계 재도입·업적 기준·텔레메트리.

---

## 5. 역할 분담 (구 HANDOFF.md 흡수)

| | 디렉터 〔D〕 | Fable 〔F〕 |
|---|---|---|
| **결정** | 가격·SKU·스토어 제출·세계관/컨셉 변경·업적 기준·텔레메트리 방식·폐기 설계 재도입 | 구현 설계·리팩터 범위·검증 방식 |
| **실행** | 스팀 콘솔 작업(페이지·AppID·VDF·depot 업로드) · 트레일러 촬영 · 캡슐/스크린샷 검수 | 코드·에셋·게이트·빌드·릴리스 발행 |
| **왕복** | 시안 검수 → 오더 | 오더 해석 → 구현 → 실화면 증거 제출 |

표기 규약: 〔D〕=디렉터 몫 · 〔F〕=Fable 몫 · 〔D→F〕=디렉터 검수 후 Fable 반영. WORKLINE·MILESTONES에서 동일 표기를 쓴다.

---

## 6. 디렉터 대기 결정

| 건 | 문서 |
|---|---|
| 게이지 색=심각도 / 수치 병기 — 구오더 대체 승인 | `design/ui/HUD-SPEC-RECON.md` §3 |
| UI 리워크 착수 범위·시점 (P0~P3) | `design/ui/UI-REWORK-REVIEW.md` §5 |
| 잔류 도트 아이콘 154장 처분(가구·지도 마커) | `design/ui/UI-PIXEL-UNITY.md` §5.4 |
| 상점 페이지 제출 · 캡슐 확정 · 트레일러 촬영 | `steam/STORE-SUBMIT.md` · `MILESTONES.md` M0 |
| Steamworks: 데모 AppID · 업적 2종 등록 · DLC AppID·가격 | `steam/DEPOT.md` · `steam/SKU-PLAN.md` |
| ja 픽셀 폰트 · #168 텔레메트리 방식 | `design/eng/L10N-JA.md` · `MILESTONES.md` |
