# QA-REPORT — Nine Winters v0.9.1 안정화 스프린트

기준 커밋: dfb86de (+ 작업 트리). vite build 통과.

## ⚠️ 프리뷰 환경 제약 (중요)
세션 중 프리뷰 브라우저(serverId 초기 db1e818b)가 최초 `location.reload()` 이후 about:blank로 이탈,
이후 신규 서버를 3회 재기동했으나 앱(three.js/WebGL) 로드 직후 렌더러가 지속적으로 무응답
(`preview_eval`이 사소한 표현식에도 30s 타임아웃). claude-in-chrome 확장도 미연결.
→ **실시간 상호작용 측정(pointer 시뮬, rect 비교, 네트워크 200 확인)이 불가능.**
아래 항목은 **코드 정적 검증**(소스 경로 추적 + 수치 계산 + vite build 통과)으로 판정했으며,
실측이 필요한 항목은 [코드검증] / [프리뷰차단]으로 명시한다. 측정값을 지어내지 않았다.

---

## B. QA 매트릭스

| # | 항목 | 결과 | 근거/비고 |
|---|---|---|---|
| 1 | 셸터 9종 순회 (로드/외형/BGM·빗소리) | [프리뷰차단] | 셸터 9종 정의 확인: container, bunker, rooftop, cabin, bus, subway, greenhouse, ship, lighthouse (game.js 907~). moveToShelter/loadShelter 경로 정상. **P2-c 발견**: container 폐차 2대 부양(수정 완료, 아래). indoor 무음/돔벙커 개방부는 프리뷰 미실측. |
| 2 | 구세이브 호환 (필드 누락) | ✅ [코드검증] | loadSave() 마이그레이션(2361~2404): oldVer<3 처리, 셸터별 layouts/cleanBy/renovated 기본값, RESOURCES 누락→0(canned 포함), hunger/thirst/energy/expToday/tutDay/tipsSeen/pendingTutorial 기본값, questIdx undefined→(day>1||successes>0?-1:0). v1.x(canned/questIdx/cat 없음) 세이브 안전 복원. |
| 3 | 내보내기→가져오기 왕복 / 손상 복구 | ✅ [코드검증] | exportSave/importSave 공용 유지. 손상 세이브: loadSave가 -bak 롤링백업으로 복구(2350~2358) + save.corrupt 토스트. importSave 유효성 검사(ver/day null 거부, 5464). |
| 4 | en 전환 후 한국어 잔존 스캔 | [프리뷰차단] | 신규 STR 키(quest.*.lore/done, tip.freshfood, auto.*, btn.auto.title) 전부 ko/en 쌍 포함. 정적 data-i18n은 applyStaticI18n() 처리. UI 실화면 잔존 스캔은 미실측. |
| 5 | 날씨 4종×storm 게이트 | [프리뷰차단] | WEATHERS 5종(clear/snow/rain/ash/storm) 정의·penalty·파티클 파라미터 확인. setWeather 존재. 파티클/젖음/적설/FX 실측 불가. |
| 6 | 퀘스트 체인 7단계 완주 | ✅ [코드검증] | QUESTS 7종, questProgress→questIdx++ 진행, 마지막에 -1로 트래커 퇴장. 자동진행(runAutoPlay)이 depart/clean 등 유발. **P2 서사 통합 완료**(아래). |
| 7 | 일시정지 중 차단 액션 | ✅ [코드검증] | eatFood/drinkWater/moveToShelter/departExpedition/sleepUntilMorning/cleanShelter 모두 `if(paused){toast(pause.blocked);return;}` 가드. tickTime은 titleVisible/paused/endingActive에서 정지(5965). |
| 8 | 고양이 (catEventSeen/사료/등반+쓰다듬) | ✅ [코드검증] | catEventSeen 1회성(4907), 3일마다 음식 소비 consumeAnyFood(4936), 미납 시 catHungry→쾌적 보너스 정지(comfortDetail catMod). 등반/쓰다듬 연출은 [프리뷰차단]. |
| 9 | 엔딩 시퀀스 / BGM 규칙 | [프리뷰차단] | runEndingSequence·bgmInfo 훅 존재. BGM 컨텍스트 키 실측 불가. |
| 10 | 리사이즈 오프스크린/겹침 | ✅ [코드검증] | onResize→autoStackPanels+reclampAllPanels(titleVisible 제외). clampPanel 화면밖 이탈 방지. **P0 zoom 단일소스 수정으로 드리프트 근본 해소**(아래). 3해상도 실측은 [프리뷰차단]. |
| 11 | 첫 실행 유령 '이어하기' 노출 | ✅ 수정완료 [코드검증] | 원인 확정 + P1-A 패치 적용(아래). |

### 소비 순서 검증 (신선→통조림, 3경로) — ✅ [코드검증]
- (a) eatFood(2252) → consumeAnyFood → fresh(food) 먼저, 부족분 canned (2226~2228)
- (b) autoEat(decayGauges 2242) → consumeAnyFood → 동일
- (c) 이벤트 cost 폴백(3617 hasAnyFood / 3621 consumeAnyFood) → food는 fresh 먼저
→ food=1,canned=3 상태 eatFood 시 food0/canned3 (코드상 확정). 실측은 [프리뷰차단].

---

## 수정 완료 항목 (코드 적용 — 커밋은 하지 않음)

### P0 — UI 확대 배율 단일 소스화 (터치 조작 어긋남 근본 원인)
- **원인**: CSS zoom이 `calc(--uiz * --textboost 1.15)`인데 드래그/클램프/자동배치 JS는 --uiz만으로 좌표 보정 → 렌더 배율과 15% 불일치, 이동마다 오차 누적.
- **수정**: style.css의 zoom 12곳 전부 `var(--uiz)`로 환원 + `:root{--textboost}` 제거. game.js updateUiScale에 `const TEXT_BOOST=1.15` 두고 `s *= TEXT_BOOST`. 이제 CSS·JS가 동일한 --uiz 단일 소스 공유. getUiz/panelPos/drag/clampPanel/autoStackPanels 모두 같은 값 사용(grep 확인).
- **검증**: [프리뷰차단] — 코드상 배율 일치 보장. build 통과.

### P1-A — 첫 실행 유령 세이브('이어하기' 오노출)
- **원인 확정**: 타이틀에서 언어/설정 조작 → scheduleSave→doSaveNow가 시작도 안 한 기본 state를 슬롯에 저장 → slotMeta가 잡혀 '이어하기' 노출.
- **수정**: doSaveNow 상단 가드 — `titleVisible && !slotExists`면 옵션만 `nw-opts` 전역 키에 저장 후 return. 정상 저장부에 `nw-opts` 동기화 추가. loadSave 실패(세이브 없음) 시 `nw-opts`에서 옵션만 복원(언어/음량 승계) + sfxVol/bgmVol 하향 마이그레이션 동일 적용.

### P1-B — 슬롯 삭제 후 타이틀 '이어하기' 미갱신
- **수정**: .sl-del 핸들러에서 슬롯 삭제 시 `-bak` 롤링 백업도 제거 + titleVisible이면 showTitle() 재호출로 즉시 갱신.

### P1-C — 설정 연타 시 패널 우측 누적 이동
- **수정**: 토글 경로(toggleSettingsPanel)는 clamp만(자동 스택/상대 재배치 없음) 명시. 근본 드리프트는 P0(zoom 단일소스)로 해소.
- **검증**: [프리뷰차단] — "10회 연타 시 타 패널 rect 불변" 실측 불가.

### P1-D — 모바일 톱니 설정 좌상단(0,0) 접힘 탭 문제
- **수정**: gear 경로 전용 openSettingsFromGear() — 항상 펼침(collapsed 해제) + 저장 위치가 상단 24px 이내면 우상단 안전위치(top 28, right 여백 8px)로 교정. clampPanel: 터치 기기 최소 top 24px(상태바/펀치홀 회피).

### P1-F — 접힌 패널 헤더가 다른 패널 위로 비쳐 보임
- **수정**: `.panel { overflow: hidden }` 추가(라운드 코너 내부 클리핑 — p-head 음수마진/zoom 반올림 1px 틈 제거). p-head 배경 #20242e 불투명 확인. 접힘 패널 bg/border 유지, bring-to-front 유지, 토글 후 clamp만(P1-C 원칙).
- **검증**: [프리뷰차단] — elementFromPoint 5점 확인 불가.

### P2 — 퀘스트 서사(이전 거주자 수첩 목소리)
- QUESTS 7종에 loreId/doneId 부여. 카드 2단 레이아웃(q-lore 딤·이탤릭·점선구분 + 기존 q-text 목표). 완료 시 payoff(doneId) 토스트. 마지막 clean.done = 챕터 종료 payoff(기존 doneToast 대체). Q2 서사는 최신 문안(신선 우선/냉장고 경고)으로 반영.

### P2 — tip.freshfood 신규 팁
- 트리거: processDay 부패 체크 직전, 냉장고 없음 && food≥1 → tipOnce('tip.freshfood') 1회성.

### P2-a — 인게임 내보내기/가져오기 제거
- render-panel의 btn-save-exp/imp 버튼 행 + 리스너 삭제. 타이틀 t-export/t-import 및 exportSave/importSave 함수 유지.

### P2-b — 자동 진행 접근성
- 체크박스를 index.html 정적 마크업(#opt-autoplay, #autoplay-row, FPS 행 근처)으로 이전, 동적 주입 코드 제거. cam-ctrl에 #btn-auto(🤖) 추가 — Day<10이면 auto.locked 토스트, 아니면 opts.autoPlay 토글 + 체크박스 양방향 동기화 + .primary 하이라이트(syncAutoBtn). refreshAutoplayLock가 버튼 상태도 동기화.
- **검증**: [프리뷰차단] — Day12 토글/Day1 잠금 실측 불가.

### P2-c — 컨테이너 폐차 부양
- **원인 확정(수치)**: buildCarWreck가 y=0 고정 배치, 지형 gh는 중심부에서 낮아짐. gh(6.2,3.4)=-0.707, gh(-8.5,-5.5)=-0.821 → 폐차가 각각 0.71/0.82 만큼 공중 부양.
- **수정**: buildCarWreck에 groundY 인자(기본 0) 추가, container 호출 2곳에 gh(x,z) 전달. 다른 셸터 호출부 무변경.

### P2 — 수첩/쪽지 종이 텍스처를 AI 에셋으로 교체
- applyPaperBg(el, kind): journal→img/paper_note.png, tip→img/tip_scrap.png (BGM과 동일 상대경로). makePaperTexture는 폴백(onerror)+지연 중 임시배경으로 유지. 잉크 대비용 밝은 오버레이 linear-gradient(rgba(255,250,240,.14)) 한 겹. PWA 프리캐시에 png 포함 확인(precache 38→41 entries).
- **검증**: [프리뷰차단] — 실제 로드(200)/가독 스크린샷 불가.

---

## ❌ / P0 요약
- **신규 결함(P0)**: 없음(밸런스 인플레는 BALANCE-NOTES 참조, 이번 스프린트 수치 미수정).
- **적용한 P0 수정**: 1건(UI zoom 단일소스 — 터치 드리프트).
- **적용한 P1**: A,B,C,D,F (5건). **P2**: 서사/팁/export제거/autoplay/폐차/종이텍스처.
- **모든 수정 후 vite build 통과.** 코드 수정만, 커밋 없음.
- **미해결/미실측**: 프리뷰 렌더러 무응답으로 셸터 순회·en 잔존·날씨FX·엔딩BGM·리사이즈 실측 및 P0~P2 live 검증이 차단됨 — 재현 가능한 프리뷰 환경에서 재검 필요.
