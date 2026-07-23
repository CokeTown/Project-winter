# 컷씬(비네트) 위치 지도 — 어디를 만지면 되는가 (2026-07-23)

> 디렉터 요청: "컷씬 느낌(금문교 같은) 디렉토리 위치". 코드·도구·산출물·인게임 트리거를 한 장에.

## 1. 코드 — 전부 한 파일

**`src/render/vignettes.js`** (1,057줄) — 비네트 전량이 여기 있다. 각 씬은 `build*Scene`(장면 저작)과
`play*Vignette`(재생 트리거)의 짝. 러너(`playVignette`)가 전용 캔버스+WebGLRenderer 오버레이를
z400에 세우고 돌린다 — 메인 게임 루프와 무경합.

| 줄 | 함수 | 씬 |
|---|---|---|
| 577 | `buildGoldenGateScene()` | **「불타는 해협」 금문교 노을** — 디렉터가 말한 그 컷 |
| 960 | `playGoldenGateVignette()` | 위 씬 재생 |
| 358 | `buildJungleSunScene(rise)` | 「콘크리트 정글의 해」 — 펜트하우스 발코니 |
| 564 | `playJungleSunVignette()` | 위 씬 재생 |
| 153 | `playEastGateVignette()` | 동부 관문 진입 컷 |
| 59 | `playGeigerVignette()` | 가이거(낙진 경보) 컷 |
| 975 | `buildDiscoveryScene()` | 희귀템 발견 디오라마 (#150) |
| 25 | `playVignette()` | **공용 러너** — 오버레이·페이드·콘트라스트 필터·비네트 프레임 |

**금문교 씬 안에서 자주 만지는 것** (`buildGoldenGateScene` 내부):
- `KEY` 표 — 24h 5키프레임 팔레트(night/dawn/day/golden/dusk). 시간대 색은 전부 여기서 나온다.
- `SCHED` — 시각 구간별 키프레임 블렌드 스케줄.
- `atHour(h, t)` — 타임랩스 하네스 전용 진입점(인게임 `update(t)`는 별개·불변).
- `COAST`/`drawWater()` — 해안 지형·물빛.

## 2. 인게임에서 보는 법 (트리거)

| 씬 | 조건 |
|---|---|
| **금문교 「불타는 해협」** | **다리 관리소(bridgehouse)** 셸터에서 **16:30~20:00** 사이에 **창밖 다리를 클릭**. 시간대가 맞으면 다리에 은은한 글린트가 뜨고 커서가 바뀐다 |
| 콘크리트 정글의 해 | **펜트하우스** 발코니를 **더블탭/더블클릭** |
| 동부 관문 | 동부 도시 최초 진입 시 자동 |
| 발견 컷 | 희귀템 첫 발견 시 자동(재발견 5%) |

두 동부 셸터(다리 관리소·펜트하우스)는 2.0 콘텐츠라, 테스트는 **타이틀 화면에서 버전 번호를 5번 탭 → QA 패널**로
셸터를 직접 열어 보는 게 빠릅니다.

## 3. 캡처 도구 (영상·스틸 뽑을 때)

| 도구 | 용도 |
|---|---|
| `tools/timelapse-cine.cjs` | **24시간 타임랩스** — `SHOT=gate`(금문교) / `SHOT=jungle`(펜트하우스). 프레임 PNG를 뽑고 ffmpeg으로 합침 |
| `tools/timelapse-24h.cjs` | 아이소 부감판(기각됨 — 참고용 잔류) |
| `tools/aerial-capture.cjs` | 항공 지도 프로토 캡처 |

실행 예 (금문교 24h, 720프레임=24초):
```bash
npm run build:electron && SHOT=gate FRAMES=720 ./node_modules/.bin/electron.cmd tools/timelapse-cine.cjs
```

## 4. 산출물 (뽑아 둔 것들)

**`scratchpad/timelapse/`**

| 파일 | 내용 |
|---|---|
| `goldengate_cine_24h.mp4` | 금문교 컷씬 24h (v2 — 해안 지형·진짜 24시간 반영) |
| `goldengate_24h_v2.mp4` | 이전 회차 |
| `penthouse_cine_24h.mp4` | 펜트하우스 컷씬 24h |
| `bridgehouse_24h.mp4` · `penthouse_24h.mp4` | 아이소 부감판(기각) |
| `cine_gate/` · `cine_jungle/` | 프레임 PNG 원본(재스플라이스용) |
| `gate24_preview.png` · `gate_preview.png` | 스틸 프리뷰 |

> ⚠️ `scratchpad/`는 git 추적 밖입니다(용량). 보관하려면 다른 곳으로 복사하세요.

## 5. 설계 문서

- `docs/design/systems/AERIAL-MAP.md` — 항공 지도(비네트와 같은 렌더 파이프 공유)
- `docs/design/review/VISUAL-QUALITY-CANDIDATES.md` — 퀄업 후보(A2 그레이딩이 이 KEY 표 문법의 본편 이식)
- `docs/MASTER.md` §2 — #146 「불타는 해협」 결선 기록
