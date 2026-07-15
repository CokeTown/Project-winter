# Nine Winters — 역할 분담 & 다음 작업 (2026-07-12)

> 게임 적대적 리뷰(재미·시장성) 이후 정리. **네가 할 일(디렉터)**과 **내가 할 일(Fable)**을 분리하고, 관련 정보의 디렉토리 위치를 명시.
> 상위 문서: 리뷰 [design/GAME-REVIEW.md](design/GAME-REVIEW.md) · 퀄업 보드 [design/QUALITY-UP.md](design/QUALITY-UP.md) · 로드맵 [MILESTONES.md](MILESTONES.md).
> 브랜치: 데모 정본=`demo-vertical-slice`(프리즈+가드), 2.0 트렁크·스토어 문서=`gd-2.0`.

---

## 0. 지금까지 착지분 (이번 사이클)

- ✅ **#175 데모 프리즈+가드** — 트렁크 죽은 데모-엔드 게이트 제거 + build 가드 + Day-15 E2E (양 브랜치).
- ✅ **가격 $9.99 확정** — `docs/steam/SKU-PLAN.md`·`STORE-SUBMIT.md` 반영.
- ✅ **포지셔닝 확정** — "따뜻한 고독, 응답하는 불빛" 척추.
- ✅ **데모 재미 레버(1·4·6)** — 개막 압축(당신→나) + Day7 먼 불빛·Day11 행렬·**Day14 라디오→응답 불빛(시그니처)**. `demo-vertical-slice`.
- ✅ **#3 스크린샷 컴포저 + 옥탑 히어로** — `tools/store-shot.cjs`, `docs/steam/shots/v2/01_rooftop_cozy_cat.png`.

---

## 1. 내가 할 일 (Fable) — 코드·에셋·검증

### A. 넥페 크리티컬 패스
| 작업 | 위치 | 상태 |
|---|---|---|
| **#3 스토어 샷 8장 마감** — 컴포저에 셸터별 배치 추가(요트·로지·지하철·등대·온실·벙커 + 응답불빛 컷) + 고양이 포즈·골든아워·디더 튜닝 | `tools/store-shot.cjs` → `docs/steam/shots/v2/` | 컴포저·히어로 완료, 나머지 7 |
| steamcmd depot 파이프라인 (#75) | `tools/steam/push-steam.ps1` · `docs/steam/DEPOT.md` | 완료 (f14baa4, DryRun 그린) — 잔여: AppID·steamcmd 설치〔D〕 |
| #34 Steam 언어 연동 · #117 서포터팩 DLC 게이트 | `src/game.js`, `docs/steam/SKU-PLAN.md §7` | #34 완료(db4e263, 88/88) · #117 미착수 |
| 데모 정본 재빌드 → v1.9.0-demo | `tools/build-demo.ps1` (가드 포함) | 완료 — 재수렴(625571c) 빌드, GitHub Release 발행(포터블·NSIS·APK) |

### B. 게임 리뷰 레버 (내가 구현 가능분)
| 레버 | 작업 | 위치 |
|---|---|---|
| 5 (rank5) | ✅ 위시리스트/보급원 트래커 완료(2026-07-15) — 정보판 라인 + 오토픽커 넛지 + 수첩 도감 탭(#177, 5c91c6e) | `src/game.js` showMapInfo·openJournalModal |
| 7 | 오프라인 복귀 다이제스트("밤새 쌓인 더미") | `src/game.js` rollOfflineGift |
| — | 오토픽커 goals-bias (활성 위시리스트 지역 가중) | `src/core/regions.js` pickAutoRegion |
| 경제 | #76 surplusCap → parts/material/cloth 확장 | `src/data/balance.js` |
| 4 잔여 | 데모 개막 조작 안내 툴팁화 | `src/game.js` showIntro/showTutorialPage |
| 톤 | #176 POV 스윕(당신→나 + check-i18n 가드) · #178 대한파 토스트 반말화 | `src/locales/*.json`, `tools/check-i18n.mjs` |
| 2(D) | 고양이 데모 조기화(Day2-4) — 디렉터 승인 후 내가 구현 | `src/game.js` cat 게이트 |

### C. 재수렴 · 기술 부채
- 데모 레버(1·4·6)·가격 문서를 넥페 후 `demo-vertical-slice`↔`gd-2.0` 재수렴 (프리즈+가드 후속).
- ✅ #73 모듈화 Tier4 완료(2026-07-15): WEATHERS→world.js·ACHS→achs.js(판정 병합) + 장주행 soak 그린
  (tools/soak-memory.cjs — 60로드+1500일: GPU 자원 0성장). 다음 티어 후보: SHELTERS 빌더 분리(PORTING §7).

---

## 2. 네가 할 일 (디렉터) — 결정·촬영·제출

### A. 스팀 파이프 (리드타임 최우선)
| 작업 | 붙여넣기/자료 위치 |
|---|---|
| **상점 페이지 제출** (검토 2–3일 + Coming Soon ≥2주 = 최상류 의존성) | 정본: **`docs/steam/STORE-SUBMIT.md`** (전 입력란 순서·답안) · 본문 카피: `docs/steam/PAGE-COPY.md` |
| **가격 제안** (Propose Pricing 단계) | **정가 $9.99 + 런치 −15%(≈$8.49)** — 근거·번들: `docs/steam/SKU-PLAN.md §0-1` |
| **캡슐 확정 #171** (옥탑) | 4K 마스터·재크롭: `docs/steam/` (master_4k/vertical), 아트 소스: `assets-src/art/out/` |
| **스크린샷 v2 검수** → final 교체 | 내가 뽑는 것: `docs/steam/shots/v2/` → 승인분 `docs/steam/shots/final/` |
| **트레일러 #172** (직접 화면녹화, 내가 풋티지 품질 보증) | 참고본: `release-trailer*/`, 컷시트: `docs/steam/trailer/CUT-SHEET.md` |

### B. 창작 결정 (미결 — 내 구현/카피를 여는 열쇠)
| 결정 | 문서 위치 | 비고 |
|---|---|---|
| 데모 CTA: 결핍 vs 희망 | `design/QUALITY-UP.md` §2 D2 | #168 텔레메트리 후 A/B 권고 |
| 고양이 조기화 승인 | `design/QUALITY-UP.md` D-cat | 승인 시 내가 구현 |
| 심화 2.0 결정 **7건** (테제 지배권·하드지역 독점·생존 스테이크·전파망·엔딩 양가성·테크트리 비용·마스터리 도달성) | `design/QUALITY-UP.md` §2 하단 | 넥페 후 숙고 가능 |
| 데모 비트 카피 최종 검수 | `src/locales/ko.json` (ev.demo*·intro.0) | 확인 완료, 추가 손보실 데 있으면 |

### C. 마케팅
- 페스티벌 신청(Tiny Teams·Cozy & Family) · IGN 아웃리치 — 전략: `docs/design/STRATEGY-NEXTFEST.md`, `docs/MARKETING.md`.
- #168 데모 텔레메트리 데이터 수집(퍼널) — CTA A/B의 전제.

---

## 3. 문서 지도 (어디에 뭐가 있나)

```
docs/
├── HANDOFF.md              ← 이 문서 (역할 분담)
├── MILESTONES.md           버전 로드맵 · 잔여 작업 버킷(M0~M4)
├── MARKETING.md            마케팅 전략
├── design/
│   ├── GAME-REVIEW.md      ★ 재미·시장성 적대적 리뷰 (판정·레버·경쟁작)
│   ├── QUALITY-UP.md       ★ 오너별 퀄업 보드 + 디렉터 결정 (D1~, 2.0 7건)
│   ├── GD-2.0.md           2.0 정본 기획 (4도시·동부·응답)
│   ├── GD-THESIS.md / WORLDVIEW.md   서사 테제·세계관
│   ├── REWARD-LOOP.md      리워드 루프 설계 (트래커=#1 우선순위)
│   └── STRATEGY-NEXTFEST.md 넥페 전략
└── steam/
    ├── STORE-SUBMIT.md     ★ 스팀 제출 전 입력란 붙여넣기 정본
    ├── PAGE-COPY.md        스토어 본문 카피 정본
    ├── SKU-PLAN.md         ★ 가격·SKU·번들 ($9.99 확정)
    ├── shots/final/        현행 판매 스크린샷 (리뷰: "빈 방" — 교체 대상)
    ├── shots/v2/           내가 뽑는 신규 꾸민 실내+고양이 샷
    └── trailer/CUT-SHEET.md 트레일러 컷시트

tools/
├── store-shot.cjs          스크린샷 컴포저 (셸터+T3가구+골든아워+고양이 → PNG)
├── build-demo.ps1          데모 빌드 (프리즈+가드 내장)
└── check-i18n.mjs          i18n 게이트 (ko/en/ja 3로케일 + src↔public 동기화)

src/
├── game.js                 메인 (인트로·인카운터 스케줄러·트래커 등)
├── data/events.js          인카운터 (데모 비트 demo_*)
├── data/balance.js         경제 밸런스 (surplusCap 등)
├── core/regions.js         지역 게이트·오토픽커
└── locales/ko.json·en.json 전 문자열 (public/locales와 동기 필수)
```

---

## 4. 다음 한 수 (권고 순서)

1. **[디렉터]** 상점 페이지 제출 (`STORE-SUBMIT.md`) — 리드타임 최상류, 지금이 가장 급함.
2. **[Fable]** #3 나머지 7장 마감 → v2 → 디렉터 검수 → final 교체.
3. **[Fable]** 위시리스트 트래커(레버5) — pull 가시화, 저비용 고레버리지.
4. **[디렉터]** 심화 2.0 결정 7건은 넥페 후.
