# 설계 문서 색인

> `docs/design/`은 **평면 폴더로 유지**한다(2026-07-21 결정). 하위 폴더로 쪼개면 MASTER·일지·메모리·타 문서의 경로 참조가 대량으로 깨지는데, 얻는 건 탐색 편의뿐이라 손익이 맞지 않는다. 대신 이 색인이 분류를 담당한다.
> 상위 진입점은 [`../MASTER.md`](../MASTER.md), 로드맵은 [`../MILESTONES.md`](../MILESTONES.md).

## 서사 · 세계관 (정본)
| 문서 | 역할 |
|---|---|
| [GD-THESIS.md](GD-THESIS.md) | 서사 테제 — 모든 카피·설계의 리트머스 |
| [WORLDVIEW.md](WORLDVIEW.md) | 세계관 정본 (「둘러싸였으나 혼자」·접촉 스펙트럼·낙진의 시계) |
| [GD-1.0.md](GD-1.0.md) · [GD-EXPANSIONS-1.1-1.4.md](GD-EXPANSIONS-1.1-1.4.md) | 1.0 본편 · 확장 4부작 기획 |
| [GD-2.0.md](GD-2.0.md) | **2.0 「응답」 정본** (4도시·동부·엔딩 4종·침묵 루트) |
| [ENDINGS-REV3.md](ENDINGS-REV3.md) | 엔딩 체계 정본 (2판은 통합 시 삭제, 폐기 근거 본문 보존) |
| [SCENARIO-FLOWS.md](SCENARIO-FLOWS.md) | 시나리오 흐름도 — 콘텐츠 배치 시 동커밋 갱신 대상 |
| [VISITOR-VOICES.md](VISITOR-VOICES.md) | 방문자 대사 설계 |

## 게임 설계 · 시스템
| 문서 | 역할 |
|---|---|
| [DEPTH-DESIGN.md](DEPTH-DESIGN.md) | 깊이 정본 — 지역 숙련·대한파 프론트·부상 서사화 |
| [REWARD-LOOP.md](REWARD-LOOP.md) | 보상 루프 — "왜 더 어려운 곳에 가나" pull 진단·처방 |
| [DEMO-REDESIGN.md](DEMO-REDESIGN.md) | 데모 버티컬 슬라이스 (15일 컷) |
| [ENCOUNTER-SEASONS.md](ENCOUNTER-SEASONS.md) · [FURNITURE-TIERS.md](FURNITURE-TIERS.md) · [EAST-ECONOMY.md](EAST-ECONOMY.md) | 인카운터·가구 티어·동부 경제 |
| [LIGHTING-UPDATE.md](LIGHTING-UPDATE.md) | 라이팅 업데이트 (#189) |

## UI · 아트
| 문서 | 역할 |
|---|---|
| [UI-PIXEL-UNITY.md](UI-PIXEL-UNITY.md) | ★ **UI 정본** — 픽셀 통일 규율 6대 + §5 세미오틱 글리프 (현행 아이콘 언어) |
| [HUD-SPEC-RECON.md](HUD-SPEC-RECON.md) | ★ HUD 기획서 v0.1 상충안 — 채택/각색/기각 매트릭스 |
| [UI-REWORK-REVIEW.md](UI-REWORK-REVIEW.md) | UI 시안 검토 (조판 채택 · 장르 이탈 데이터 모델 기각) |
| [UI-TOKENS.md](UI-TOKENS.md) | UI 토큰 정본 |
| [ICON-WORKLIST.md](ICON-WORKLIST.md) | 아이콘 작업 목록 (잔류 도트 영역) |
| [AI-ART-ANTISLOP.md](AI-ART-ANTISLOP.md) + `antislop-board.html` | AI 아트 슬롭 방지 규율 |

## 리뷰 · 이력
| 문서 | 역할 |
|---|---|
| [DESIGN-REVIEW.md](DESIGN-REVIEW.md) | 레벨 디자인 평가 + 적대적 리뷰 |
| [GAME-REVIEW.md](GAME-REVIEW.md) | 재미·시장성 적대적 리뷰 |
| [QUALITY-UP.md](QUALITY-UP.md) | 퀄업 보드 + 디렉터 결정 대기 항목 |
| [DESIGN-HISTORY.md](DESIGN-HISTORY.md) | 설계 문서 계보 |

## 기술 · 규약
| 문서 | 역할 |
|---|---|
| [SAVE-SCHEMA.md](SAVE-SCHEMA.md) | 세이브 스키마 |
| [PORTING.md](PORTING.md) | 포팅·모듈화 계획 |
| [REFACTOR-LOG.md](REFACTOR-LOG.md) | 리팩터 이력 |
| [REQUIREMENTS-1.0.md](REQUIREMENTS-1.0.md) | 1.0 요구사항 |
| [L10N-JA.md](L10N-JA.md) | 일본어 조판 규약 (용어집·시트 규격은 `../l10n/L10N-GUIDE.md`) |
| [STRATEGY-NEXTFEST.md](STRATEGY-NEXTFEST.md) | Next Fest 전략 |

> 시점 감사 리포트(SEAM·MODE·LIGHTING·GROUNDING·AI-ART-SURFACE·EMOJI)는 [`../reports/`](../reports/)에 모아 둔다 — 설계 정본이 아니라 특정 날짜의 스냅샷이다.
