# 설계 문서 색인

> **2026-07-21 재편**: 평면 33개 → 5개 주제 폴더(`canon` 서사·세계관 / `systems` 게임 시스템 / `ui` UI·아트 / `review` 리뷰·이력 / `eng` 기술·규약). 이동 시 전 저장소 마크다운 링크를 스크립트로 재계산해 **깨진 링크 0**으로 옮겼다. 넥페 전략은 스토어 트랙이라 `../steam/`으로 분가.
> 상위 진입점은 [`../MASTER.md`](../MASTER.md), 로드맵은 [`../MILESTONES.md`](../MILESTONES.md).

## 서사 · 세계관 (정본)
| 문서 | 역할 |
|---|---|
| [GD-THESIS.md](./canon/GD-THESIS.md) | 서사 테제 — 모든 카피·설계의 리트머스 |
| [WORLDVIEW.md](./canon/WORLDVIEW.md) | 세계관 정본 (「둘러싸였으나 혼자」·접촉 스펙트럼·낙진의 시계) |
| [GD-1.0.md](./canon/GD-1.0.md) · [GD-EXPANSIONS-1.1-1.4.md](./canon/GD-EXPANSIONS-1.1-1.4.md) | 1.0 본편 · 확장 4부작 기획 |
| [GD-2.0.md](./canon/GD-2.0.md) | **2.0 「응답」 정본** (4도시·동부·엔딩 4종·침묵 루트) |
| [ENDINGS-REV3.md](./canon/ENDINGS-REV3.md) | 엔딩 체계 정본 (2판은 통합 시 삭제, 폐기 근거 본문 보존) |
| [SCENARIO-FLOWS.md](./canon/SCENARIO-FLOWS.md) | 시나리오 흐름도 — 콘텐츠 배치 시 동커밋 갱신 대상 |
| [VISITOR-VOICES.md](./canon/VISITOR-VOICES.md) | 방문자 대사 설계 |

## 게임 설계 · 시스템
| 문서 | 역할 |
|---|---|
| [DEPTH-DESIGN.md](./systems/DEPTH-DESIGN.md) | 깊이 정본 — 지역 숙련·대한파 프론트·부상 서사화 |
| [REWARD-LOOP.md](./systems/REWARD-LOOP.md) | 보상 루프 — "왜 더 어려운 곳에 가나" pull 진단·처방 |
| [DEMO-REDESIGN.md](./systems/DEMO-REDESIGN.md) | 데모 버티컬 슬라이스 (15일 컷) |
| [ENCOUNTER-SEASONS.md](./systems/ENCOUNTER-SEASONS.md) · [FURNITURE-TIERS.md](./systems/FURNITURE-TIERS.md) · [EAST-ECONOMY.md](./systems/EAST-ECONOMY.md) | 인카운터·가구 티어·동부 경제 |
| [LIGHTING-UPDATE.md](./systems/LIGHTING-UPDATE.md) | 라이팅 업데이트 (#189) |

## UI · 아트
| 문서 | 역할 |
|---|---|
| [UI-PIXEL-UNITY.md](./ui/UI-PIXEL-UNITY.md) | ★ **UI 정본** — 픽셀 통일 규율 6대 + §5 세미오틱 글리프 (현행 아이콘 언어) |
| [HUD-SPEC-RECON.md](./ui/HUD-SPEC-RECON.md) | ★ HUD 기획서 v0.1 상충안 — 채택/각색/기각 매트릭스 |
| [UI-REWORK-REVIEW.md](./ui/UI-REWORK-REVIEW.md) | UI 시안 검토 (조판 채택 · 장르 이탈 데이터 모델 기각) |
| [UI-TOKENS.md](./ui/UI-TOKENS.md) | UI 토큰 정본 |
| [ICON-WORKLIST.md](./ui/ICON-WORKLIST.md) | 아이콘 작업 목록 (잔류 도트 영역) |
| [AI-ART-ANTISLOP.md](./ui/AI-ART-ANTISLOP.md) + `antislop-board.html` | AI 아트 슬롭 방지 규율 |

## 리뷰 · 이력
| 문서 | 역할 |
|---|---|
| [DESIGN-REVIEW.md](./review/DESIGN-REVIEW.md) | 레벨 디자인 평가 + 적대적 리뷰 |
| [GAME-REVIEW.md](./review/GAME-REVIEW.md) | 재미·시장성 적대적 리뷰 |
| [QUALITY-UP.md](./review/QUALITY-UP.md) | 퀄업 보드 + 디렉터 결정 대기 항목 |
| [DESIGN-HISTORY.md](./review/DESIGN-HISTORY.md) | 설계 문서 계보 |

## 기술 · 규약
| 문서 | 역할 |
|---|---|
| [SAVE-SCHEMA.md](./eng/SAVE-SCHEMA.md) | 세이브 스키마 |
| [PORTING.md](./eng/PORTING.md) | 포팅·모듈화 계획 |
| [REFACTOR-GUIDE.md](./eng/REFACTOR-GUIDE.md) | ★ **리팩터 가이드** — 실측 기준선 + 개선 포인트 P1~P5(패턴·처방·검증). 착수 전 필독 |
| [REFACTOR-LOG.md](./eng/REFACTOR-LOG.md) | 리팩터 이력 (무엇을 했나) |
| [REQUIREMENTS-1.0.md](./eng/REQUIREMENTS-1.0.md) | 1.0 요구사항 |
| [L10N-JA.md](./eng/L10N-JA.md) | 일본어 조판 규약 (용어집·시트 규격은 `../l10n/L10N-GUIDE.md`) |
| [STRATEGY-NEXTFEST.md](../steam/STRATEGY-NEXTFEST.md) | Next Fest 전략 |

> 시점 감사 리포트(SEAM·MODE·LIGHTING·GROUNDING·AI-ART-SURFACE·EMOJI)는 [`../reports/`](../reports/)에 모아 둔다 — 설계 정본이 아니라 특정 날짜의 스냅샷이다.
