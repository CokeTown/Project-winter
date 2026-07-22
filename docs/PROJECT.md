# Nine Winters — 프로젝트 문서

> **기술 개요 정본** — 스택·코드 지도·에셋 파이프·빌드 명령. 세션 진입점은 `MASTER.md`, 로드맵은 `MILESTONES.md`, 버전 이력은 `PATCHNOTES.md`다.
> 최종 갱신: 2026-07-21 (v1.9.12). 실측: `src/game.js` 11,701줄 · `src/` 모듈 55개 · 로케일 2,196키(ko/en/ja) · 가구 DEFS 47종 · BGM 37곡.

## 1. 게임 정체성

- **장르**: 방치형 코지 생존 + 셸터 꾸미기 (포스트 아포칼립스)
- **핵심 문장**: "꾸민 셸터는 예쁜 배경이 아니라, 플레이어를 살리는 생명 유지 장치다."
- **플레이 감각**: 모니터 한켠에 켜두고, 가끔 들여다보며 집을 가꾸는 게임. 사망 없음(탈진만), 실패 = 생활비 증가.
- **제목 유래**: Nine Winters = 고양이의 아홉 목숨 × 겨울을 세며 살아가는 세월. (구명: Project Shelter)
- **엔딩**: 생존 10,000일 초과 시 과학 박사의 구조 인카운터. 엔딩 후에도 계속 플레이 가능.

## 2. 기술 스택과 이유

| 층 | 선택 | 이유 |
|---|---|---|
| 렌더링 | Three.js r160 + 자체 픽셀화 포스트프로세싱(양자화/디더링) | 복셀+픽셀아트 룩을 웹에서 가볍게 |
| 빌드 | Vite 5 | 단순, base 3종(웹/Pages/Electron) 분기 용이 |
| PC | Electron (NSIS+포터블) | Steam 배포 실적 있는 경로, 위젯 모드(투명도/항상 위) 구현 가능 |
| 모바일 | Capacitor (Android) | 웹 코드 그대로, 서명 APK |
| 오프라인 | vite-plugin-pwa (BGM은 런타임 캐시) | 113MB BGM 프리캐시 방지 |
| i18n | 자체 (src/i18n.js + `locales/*.json` 2,196키 ko/en/ja) | 의존성 없이 단순하게. 런타임 오버라이드 지원 |
| 사운드 | WebAudio (sfx.js) + HTMLAudio(BGM) | SFX는 지연/동시성, BGM은 스트리밍 |

**엔진 포팅 질문에 대한 결론**: Unity/언리얼 포팅은 코드 재작성이지만, 현 스택으로 PC/모바일/웹 전부 커버되므로 계획상 불필요. 콘솔 진출 시에만 재고 (그땐 포팅 스튜디오 관행).

## 3. 코드 지도

```
index.html          DOM 셸. data-i18n 속성, 인라인 암전 베일(fade-veil)
src/main.js         엔트리 (style.css + game.js import)
src/game.js         게임 메인 (~11,700줄). 아래 "시스템 색인" 참조. 순수 로직은 core/·데이터는 data/·렌더는 render/·UI는 ui/로 분리 진행 중(#73)
src/i18n.js         로케일 로더(ko/en/ja), t(id,vars), LN/LD/LF/LC 헬퍼, applyStaticI18n, 세미오틱 글리프 치환(pick)
src/core/ data/ render/ ui/ systems/   모듈 분리분 (게이지·계절·경제·셸터 빌더·모달·고양이·아바타 등)
src/sfx.js          WebAudio 매니저: playSfx/setAmbience/setFire/setSfxVol (크로스페이드 루프 채널)
src/style.css       전체 스타일. --uiz 반응형 zoom 변수
src/data/furniture.js  가구 DEFS 20종 (fp/surface/stackable/light/appliance/색상 4종/ko+en)
src/lib/helpers.js  lamb/B/Cyl/shade/seededRand/paintGeo/vcLambert
electron/main.cjs   창 관리 + 위젯 IPC(opacity/alwaysOnTop/mini/clickThrough)
electron/preload.cjs contextBridge → window.nineWidget
public/BGM/*.mp3    OST 36곡 (규칙은 §5)
public/sfx/*.ogg    효과음 27종 (PSE CORE 샘플러 + 자체 변환)
public/models/riggedcat.glb  보류된 리깅 고양이 (USE_RIGGED_CAT=false)
tools/gen-icons.mjs    assets-src/icon.png → 전 플랫폼 아이콘
tools/gen-sfx.ps1      샘플 WAV/mp3 → ogg 변환 (ffmpeg, %LOCALAPPDATA%\ffmpeg)
tools/art-gen.mjs      OpenAI gpt-image-1 자동 생성 (OPENAI_API_KEY)
tools/art-brief.mjs    수동(ChatGPT 복붙)용 프롬프트 카드 생성
tools/art-ingest.mjs   생성 이미지 → 규격 크롭/배치
tools/publish-beta.ps1 GitHub Release 생성 + 산출물 업로드
.github/workflows/convert-blend.yml  Blender 불가 환경 우회 (CI에서 blend→GLB)
```

### game.js 시스템 색인 (검색 키워드)
- 시간/조명: `applyTimeLighting`, `dayness`, `updateWindowSkies`(창밖 낮/밤)
- 계절/날씨: `SEASONS`, `seasonAdjustPool`(눈=겨울만, 초봄 꽃샘추위), `WEATHERS`(clear/snow/rain/**storm**/ash), `rollWeather`(rain→storm 25% 승격)
- 날씨 연출: `weatherFx`(벽 위 적설 캡), `applyWetness`(Phong specular 램프 = 젖은 반사), `updateScreenFx`(폭우 전용 화면 물방울 + 눈 서리/눈꽃 — 서리는 유지 확정)
- 쾌적함: `comfortDetail`(가구/조명/청결/거처/정든 집/고양이+6/제약)
- 탐험: `REGIONS`, `rateParts`(성공률 분해), `departExpedition`(에너지<20 차단 — 지도 경로 우회 버그 수정됨)
- 가구: 배치/드래그/회전, **표면 스태킹**(`findSupport`, DEFS.surface/stackable, 지지대 이동 시 동행)
- 고양이: `buildCatMesh`(마인크래프트 비율 복셀), `CAT_POSES` 7종(hop 포함), `updateCat`(모드 머신), `catFreeSpot`(가구 위 선호), 폴짝 점프 등반, `pickCat` 쓰다듬기(야옹, 3회/일). Day100+ 1%/일 인카운터로만 입양
- 인카운터: `EVENTS` (일반 8 + special: cat/ending)
- 엔딩: `runEndingSequence` (Day10000 초과 5%/일)
- 수첩 연출: `openJournalPages`, `makePaperTexture`, `tipOnce`(첫 경험 팁 7종), `paperSfx`(WebAudio 합성)
- BGM: §5. `bgmContext`/`syncBgm`/트랜지션(곡 끝 페이드, 특수만 즉시 크로스페이드)
- 저장: 슬롯 3 + `flushSave`/롤링 백업(`slot{n}-bak`)/손상 자동 복구/내보내기·가져오기
- 반응형: `updateUiScale`(--uiz zoom, 좌표 보정), `reclampAllPanels`, keep-all 줄바꿈
- 성능: hidden 시 `logicTick`만(렌더 정지), FPS 캡, 저사양 모드
- 부팅: 암전 시작(인라인 베일) → 준비 후 페이드인. 타이틀=내 집만(body.title-mode), 결산은 입장 후
- PC 입력: ESC = 설정 토글(배치취소/모달닫기 우선), P = 일시정지(탐험 타이머도 정지)
- 디버그: `window.__shelter` (state/카메라/THREE/CAT_POSES/setSnow/bgmInfo 등)

## 4. 데이터 테이블

셸터 9종(SHELTERS), 지구 5종(DISTRICTS), 지역 4종(REGIONS), 자원 11종(RESOURCES), 부상 4종(INJURIES), 준비물 6종(PREPS), 제작 8+(CRAFTS), 개조 7종(SHELTER_MODS), 인카운터 10종(EVENTS), 업적 16종(ACHS), 가구 20종(DEFS). 전부 ko/en 병기 필드 보유.

## 5. BGM 규칙 (public/BGM, 36곡)

| 트랙 | 재생 조건 |
|---|---|
| Main_theme | 타이틀 화면 (55% 음량) |
| Sunny1~7 / Raining1~8 / Snowing1,2,3,5,6 / Gloomy1~5 | 현재 날씨 풀 (storm은 Raining 풀) |
| Random1~4,6 | 모든 날씨 풀에 섞임 |
| Random_evening | 저녁(17~21시)에만 풀 합류 |
| Winter1~2 | 겨울 계절에만 풀 합류 |
| Cat | 고양이 인카운터 당첨일 하루 종일 이것만 |
| Ending | Day10000 엔딩 시퀀스 전용 |

트랜지션: 일반 변화는 곡 끝까지(말미 3s 페이드아웃→다음 곡 1.6s 페이드인), 특수(타이틀/Cat/Ending)만 0.9s 페이드아웃 후 전환.
효과음: 기본 7/100. 지역별 빗소리(지붕/도시/숲/도로 + 폭우 Heavy_Rain 공통, 지하철 무음). 라디오는 클릭 시 1회 지지직(상시 루프 제거됨).

## 6. 에셋 파이프라인

- **아이콘**: `assets-src/icon.png` 교체 → `npm run assets:icons` → 파비콘/PWA/iOS/ico/Android 밉맵 전부 재생성
- **아트**: `node tools/art-gen.mjs` (API) 또는 BRIEF.md 복붙 → incoming/ → `node tools/art-ingest.mjs`. manifest 14종(스토어 10 + 인게임 4: 종이/수첩/조각/카드 프레임 — 아직 게임 미적용)
- **SFX**: 원본을 tools/gen-sfx.ps1에 잡 추가 → 실행 (ffmpeg는 %LOCALAPPDATA%\ffmpeg)
- **주의**: dist/는 빌드마다 삭제 — 원본은 반드시 assets-src/ 또는 public/에

## 7. 빌드·배포

```powershell
$env:Path = "$env:LOCALAPPDATA\node-portable;$env:Path"   # 포터블 Node 22 (시스템 설치 없음)
npm run dev          # 개발 (8420)
npm run build        # 웹 → dist (GitHub Pages는 push 시 자동 배포)
npm run build:exe    # Electron NSIS+포터블 → release/
npx cap sync android; cd android; .\gradlew assembleRelease   # 서명 APK
.\tools\publish-beta.ps1 -Tag v0.9.0-beta -Files <산출물들>    # GitHub Release 업로드
```
- Android 키스토어: `android/keystore/` (gitignored — **분실 시 앱 업데이트 불가, 백업 필수**)
- 산출물은 커밋하지 않고 GitHub Releases에 태그별 첨부

## 8. 버전 타임라인 (내부 v1.0~2.8 — 리브랜딩 이전)

> 아래는 **구 넘버링(Project Shelter 시절 내부 v1.0~v2.8)** 기록이다. Nine Winters 공개 넘버링(v0.9 베타 → v1.0 EA → v1.9.x 현재)의 이력은 `PATCHNOTES.md`, 이정표는 `MILESTONES.md` §1을 본다.

- v0.x~v1.3: MVP — 셸터/탐험/제작/계절/타이틀/인카운터/개조
- v1.4~1.8: Vite 전환, 에너지/취침, 도감/업적, Pages/exe/APK 경로
- v1.9: OST 36곡 규칙 재생, 날씨 시각효과, 스태킹, 고양이/엔딩 인카운터, 일시정지, 타이틀=집
- v2.0: 영어 로컬라이즈 전면(363키) + **Nine Winters 리브랜딩**
- v2.1~2.2: 생존 수첩 연출(튜토리얼+찢어진 메모 팁), SFX 21종 통합
- v2.3: 반응형 UI(--uiz), 타이틀 언어 선택, 음량 기본 하향
- v2.4: 비 리워크(젖은 반사/폭우/지역 빗소리/라디오 상호작용화), 초봄 시작
- v2.5: 방치형 최적화(백그라운드 렌더 정지), 암전 전환, PC ESC 설정
- v2.6: 마인크래프트 스타일 고양이 (GLB 리깅판은 보류·보존)
- v2.7: 위젯 모드(투명도/항상 위/미니/클릭 통과) + 부팅 암전 재설계 + 고양이 등반
- v2.8: BGM 트랜지션 규칙, 창문 낮/밤 연동. → **v0.9 Beta 빌드**

## 9. 운영 방식 (AI 협업)

- 오케스트레이터(Fable)가 설계·오더·검수·커밋, 구현은 Sonnet/Opus 서브에이전트에 위임
- 에이전트 오더 필수 문구: "동기 호출로 직접 완수하라. 백그라운드 진행 보고는 실패" (조기 종료 사고 2회 경험)
- 시각 검수: 프리뷰 스크린샷이 타임아웃되면 캔버스 crop → 로컬 수신 서버(tools 참고: shot-server 패턴) POST
- 미세 튜닝(포즈 각도/색/좌표)은 에이전트 왕복보다 오케스트레이터 직접 수정이 빠름 (사용자 승인됨)
- game.js는 단일 파일이므로 **동시에 한 에이전트만** 편집 (충돌 방지 순차 발주)

## 10. 주요 결정 기록

- 눈 서리 화면 오버레이: 유지 확정 / 비 물방울 오버레이: 폭우 전용
- 고양이: 리얼 로우폴리(GLB) 대신 마인크래프트 복셀 — 스타일 통일성 (GLB 코드는 플래그로 보존)
- 라디오 상시 잡음 제거 → 클릭 상호작용
- 산출물은 Releases로 (커밋 금지 — 히스토리 비대화)
- appId(com.projectwinter.shelter)는 스토어 등록 직전에 최종 결정
- 좀비 엔티티/직접 조종 파밍(TWoM식): 보류 (후자는 DLC 후보)

## 11. 남은 로드맵

**로드맵은 이 문서가 관리하지 않는다** — 정본은 `MILESTONES.md`(M0 출시 준비 → M1 기술 부채 → M2~M4 2.0 + 상시 트랙). 현재 작업 큐는 `WORKLINE.md`, 세션 좌표는 `MASTER.md`.

*(구 베타 후 우선순위 8항목은 전부 소화되어 삭제 — Living Shelter·월드 밀도·아홉 번째 겨울·인카운터 확장·꾸미기 확장·난이도·Steam Deck·아트 아이콘(→세미오틱 글리프). 이력은 PATCHNOTES·HISTORY 참조.)*
