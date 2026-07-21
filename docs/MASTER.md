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
| 작업 브랜치 | `ui-hud` (← `ui-semiotic` ← `gd-2.0`) |
| 트렁크 | `gd-2.0` (2.0 개발 정본) · `demo-vertical-slice` (데모, 워크트리 `G:\pw-demo`) · `main` (정식 베이스) |
| 다음 관문 | **Steam Next Fest 10월** — 크리티컬 패스는 상점 페이지 제출〔D〕 |
| 원격 | https://github.com/CokeTown/Project-winter.git |

**지금의 큰 줄기 3개**
- **출시 트랙(최우선)** — 상점 제출·캡슐·트레일러·데모 재수렴. 상세 `MILESTONES.md` M0.
- **UI 리워크(진행 중)** — 세미오틱 글리프 + HUD 기획서 반영. 상세 `design/UI-PIXEL-UNITY.md` §5, `design/HUD-SPEC-RECON.md`.
- **2.0 「응답」(비축)** — 출시 블로커 없을 때만 소비. 상세 `design/GD-2.0.md`.

---

## 2. 세션 인계 로그

> 최신이 위. 한 세션 = 한 블록. **다음 세션은 맨 위 블록만 읽으면 인계가 끝나야 한다.**

### 2026-07-21 (화) · HUD 기획서 반영 + 문서 통합
- **한 일**: ①GPT HUD 기획서 v0.1 ↔ 현 게임 **상충안** 작성(`design/HUD-SPEC-RECON.md`) — 스펙 승 4/게임 승 3 판정 ②`ui-hud` 브랜치 1차 구현: 명령 바를 좌상단 2×4 그리드 → **상단 밴드**로 이동, 게이지 **색=심각도**(정상 초록/주의 앰버/위험 적) + 수치 + 상태 문자, 행 스택 재조판 ③v1.9.12 범프·릴리스 3종 발행 ④**문서 통합**(이 문서 신설, 로드맵 4→1 등).
- **산출**: 커밋 `8748665`(HUD 1차) `b0d0bc5`(상단 이동) `358b9af`(범프) · 릴리스 v1.9.12-dc(exe 2종+APK).
- **검증**: 배터리 102/102 · 모달 DOM 7/7 · i18n 2196 무결 · 1280/1920 rect 겹침 0.
- **다음 한 수**: HUD 스펙 2차 — Tab 정보 확장 · **알림 큐 + 시스템 로그**(우선 추천: 데이터 이미 존재, 토스트 증발 문제 동시 해결) · PDA 사용 중 HUD 축소.
- **열린 결정〔D〕**: ①게이지 색=심각도 전환이 v1.9.10 "색=정체" 구오더를 **대체**하는지 승인 ②수치 병기 복원("수치는 PDA 전용" 폐기) 승인. 미승인 시 각 1커밋 롤백.
- **⚠️ 알려진 이슈**: 골든 `lodge` 1건 크로스프로세스 플레이키(check1 0.04% ↔ check2 4.6%) — HUD 무관·기존(#212 계열), 런타임 영향 0. 원인 규명은 골든 결정론 후속으로 이관.

### 2026-07-20 (월) · 세미오틱 글리프 (도트 이후)
- **한 일**: 커뮤니티 피드백("어설픈 도트는 마이너스 자산") 트리아지 → UI 크롬 아이콘을 도트 PNG에서 **솔리드 세미오틱 글리프 72종**으로 전환(`tools/icon-semiotic.mjs`). 게임 문법 상징 복원(탐험=배낭·제작=망치·취침=침대). PDA 인광 듀오톤, 이모지 스트립 3/N.
- **산출**: 커밋 `73a7d15`·`10f83d7`·`f52b2a8`·`9db0682` · 릴리스 v1.9.11-dc.
- **핵심 함정 2건**: ①`mask-image`를 CSS 변수 상대 url로 담으면 dist에서 404→전면 투명(**인라인 직지정 필수**) ②`<g>` `stroke-width` 중복 속성 = XML 파싱 에러로 글리프 소실. 둘 다 재도입 금지.
- **결정**: 폰트 Silver 기각·**둥근모꼴 유지**.

### 2026-07-19 (일) · 노스트로모 터미널 UI
- **한 일**: 웜 차콜 패널 → 녹색 인광 터미널(프레임·코너 브래킷·디지털 세그먼트 게이지·`//` 헤더·점멸 LED). 릴리스 v1.9.9-dc 3종.

### 그 이전
`docs/worklog/` 날짜별 일지 + `docs/WORKLINE.md` 원장 참조. 버전 이력은 `docs/PATCHNOTES.md`, 설계 결정 이력은 `docs/HISTORY.md`.

---

## 3. 문서 지도 (통합 후)

```
docs/
├── MASTER.md            ★ 이 문서 — 진입점·현재 좌표·세션 인계 로그
├── WORKLINE.md          ★ 작업 번호 원장 (진행/대기/완료) — 다음 작업 선택
├── OPERATIONS.md        ★ 운영 플레이북 (검증 명령·릴리스 파이프·결정 경계·트러블슈팅)
├── MILESTONES.md        ★ 로드맵 정본 (M0 출시 → M1 부채 → M2~M4 2.0) + 발매 이력 + 상점용 로드맵 카피
├── PROJECT.md           기술 개요 (스택·코드 지도·BGM 규칙·빌드 명령)
├── PATCHNOTES.md        버전별 변경 이력 (플레이어용 문체)
├── HISTORY.md           설계 결정·폐기 이력 (재도입 금지 목록 포함)
├── MARKETING.md         포지셔닝·타깃·커뮤니케이션 킷(문구 정본)
├── BALANCE-NOTES.md     경제/밸런스 시뮬 데이터
├── QA-REPORT.md         QA 현황
├── COPY-REVIEW.md       카피 전수 검토
├── worklog/             날짜별 일지 (통합하지 않음 — 상세 기록)
├── design/              설계 정본
│   ├── GD-2.0.md              2.0 「응답」 정본 기획
│   ├── GD-THESIS.md / WORLDVIEW.md   서사 테제 · 세계관 정본
│   ├── DEPTH-DESIGN.md        깊이 설계 (숙련·대한파·부상 서사)
│   ├── REWARD-LOOP.md         리워드 루프
│   ├── STRATEGY-NEXTFEST.md   넥페 전략
│   ├── UI-PIXEL-UNITY.md      ★ UI 픽셀/글리프 정본 (§5 세미오틱 글리프)
│   ├── HUD-SPEC-RECON.md      ★ HUD 기획서 v0.1 상충안 (채택/기각 매트릭스)
│   ├── UI-REWORK-REVIEW.md    UI 시안 검토 (조판 채택·데이터 모델 기각)
│   ├── UI-TOKENS.md           UI 토큰
│   ├── DESIGN-REVIEW.md       레벨 디자인 평가 + 적대적 리뷰
│   ├── GAME-REVIEW.md         재미·시장성 리뷰
│   ├── QUALITY-UP.md          퀄업 보드 + 디렉터 결정
│   ├── DEMO-REDESIGN.md       데모 설계
│   ├── ENDINGS-REV3.md        엔딩 정본
│   ├── SCENARIO-FLOWS.md · SAVE-SCHEMA.md · PORTING.md · REQUIREMENTS-1.0.md
│   ├── L10N-JA.md             현지화 규약 (ja 포함)
│   └── (기타 도메인 스펙: LIGHTING-UPDATE · EAST-ECONOMY · FURNITURE-TIERS · ENCOUNTER-SEASONS · ICON-WORKLIST · AI-ART-ANTISLOP …)
├── steam/               스토어 (STORE-SUBMIT · PAGE-COPY · SKU-PLAN · DEPOT · ACHIEVEMENTS-SUBMIT · trailer/)
├── reports/             시점 감사 리포트 (SEAM/MODE/LIGHTING/GROUNDING …) — 과거 스냅샷, 참조용
├── qa/ · l10n/ · feedback/ · marketing/
└── (구판은 삭제하고 정본에 흡수 — 로드맵 3종·HANDOFF 등)
```

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
| 게이지 색=심각도 / 수치 병기 — 구오더 대체 승인 | `design/HUD-SPEC-RECON.md` §3 |
| UI 리워크 착수 범위·시점 (P0~P3) | `design/UI-REWORK-REVIEW.md` §5 |
| 잔류 도트 아이콘 154장 처분(가구·지도 마커) | `design/UI-PIXEL-UNITY.md` §5.4 |
| 상점 페이지 제출 · 캡슐 확정 · 트레일러 촬영 | `steam/STORE-SUBMIT.md` · `MILESTONES.md` M0 |
| Steamworks: 데모 AppID · 업적 2종 등록 · DLC AppID·가격 | `steam/DEPOT.md` · `steam/SKU-PLAN.md` |
| ja 픽셀 폰트 · #168 텔레메트리 방식 | `design/L10N-JA.md` · `MILESTONES.md` |
