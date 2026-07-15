# 메커니즘 이음매 감사 보고서 (2026-07-16)

> 오더: "캔들 안 놔짐을 비롯해 업데이트되며 생긴 부분들 싹 점검" · 방법: 8축 감사 에이전트 → 발견 전건 적대 검증(기각 1건)
> 확정 39건. 각 건의 근거는 파일:줄 — 코드에서 재검증 가능. 수정은 우선순위별 배치로 진행.

## P1-체감혼동 (23건)

### [craft-loop] 툴바 인벤토리가 도면 게이트 가구 14종을 발견 전부터 이름·아이콘째 노출 + 빈 슬롯 안내가 '탐험에서 구한다'로 제작 가구까지 오도

- **근거**: src/game.js:8880-8888 renderInventoryBar가 Object.entries(DEFS) 전량을 무필터 렌더(시그니처 8종+커먼 5종+ledbar 포함) — style.css:297 .tool-item.empty는 opacity 0.38일 뿐 숨김 아님. 보유 0 툴팁은 일괄 inv.getByExp(game.js:8885, ko.json:498 '탐험에서 구한다'), 클릭 시 place.noStock(game.js:6783-6785, ko.json:494 '탐험에서 구해 오자') — 제작이 기본인 가구(game.js:4961 주석, world.js furnChance 0.01~0.05)와 도면 전용 가구엔 틀린 경로 안내. 반대편은 전부 가림: 제작대 game.js:4967(도면 전 비노출), 도감 game.js:5845-5856(??? 베일), 지도 game.js:2994 주석('시그니처 누출 없음' 원칙 명문)과 정면 충돌
- **수정안**: renderInventoryBar에서 cnt 0 && CRAFTS bp 미보유 항목은 스킵(또는 ??? 실루엣 처리)하고, 빈 슬롯 툴팁을 획득 경로별로 분기(제작 레시피 존재→'제작대에서 만든다', 도면 게이트→'도면 필요', 순수 드랍→현행 유지)

### [craft-loop] 슬럼·뒷골목 심부 가구 드랍 풀이 Object.keys(DEFS) 전체라 도면 게이트를 우회 — 지역 독점 가구(네온·정장 등)와 LED바가 도면 없이 엉뚱한 지역에서 직접 드랍

- **근거**: src/data/world.js:128·138 pool: Object.keys(DEFS) (furnChance 0.03/0.05+숙련 가산 game.js:3328) → game.js:3306-3311 pickFurniture가 bp 보유 여부 무검사로 got에 push, 3551에서 인벤 직행. DDD-4 전제(game.js:4967 '도면을 줍기 전엔 목록에 없다 — 지역 독점의 실체')·도감 표기(game.js:5851 col.bpOnly '{region}에서만')·지도 미수집 표기(game.js:2998-3001 map.drops)와 모순: 슬럼에서 neonvip 가구를 주워 집에 놓았는데 도감·지도는 여전히 '도심 중심지에서만'인 미수집 도면으로 표시. 도면 시스템(balance.js:389-402, DDD-4/#190/#189)이 슬럼 전체풀(그 이전 설계, world.js:7 주석) 위에 나중에 얹히며 생긴 이음매
- **수정안**: 슬럼·심부 풀 생성을 Object.keys(DEFS).filter(id => !BP_GATED.has(id))로 교체(BP_GATED = CRAFTS에서 bp 필드 보유 id 집합) — 또는 pickFurniture에서 미보유 도면 항목 재롤

### [craft-loop] 일일 연료 소비 가구의 제작 힌트 유지비 표기 불일치 — 같은 목록에서 난로·랜턴·정수기는 소비를 밝히는데 램프·LED바(배터리 1/일)·가지 촛대(양초 1/일)·캔들 스툴(양초 격일)은 무표기

- **근거**: 미표기: src/data/items.js:142 lamp '부품 조립 조명'·144 ledbar·158 candelabra·132 candle stool — 실제로는 매일 소비(furniture.js:452·1147·1243·597 light.fuel + game.js:8273-8283 일일 소비 루프, 캔들 스툴 격일은 8277). 표기 있음: items.js:138 랜턴 '(양초 연료)'·147 난로 '(연료 1/일)'·148-153 정수기/발전기/냉장고/온풍기. 사전 안내는 제작 힌트가 유일한데(연료줄 game.js:9087-9096은 배치 후, day.fuelOut game.js:8282는 소진 후) 절반만 표기돼 '표기 없음=유지비 없음'으로 읽힘 — #189 이후 배터리가 조명 경제의 축이라 체감이 큼
- **수정안**: 제작 힌트에 유지비 문법 통일: lamp·ledbar '(배터리 1/일)', candelabra '(양초 1/일)', 캔들 스툴 '(양초 격일)' — items.js hint/hintEn + ko/en/ja data.craft.*.hint 동기 수정

### [lighting-power] 지하철 어둠 페널티(-12)가 #189 조명 설비를 못 본다 — 전등 켜진 방에 "완전한 어둠"

- **근거**: src/core/comfort.js:72 `if (sh.needsLight && light <= 0)` — light 합산(52~54행)은 가구 light def만 집계, lightingFacilityOn 미참조(임포트 자체 없음, comfort.js:8-16). game.js:807 쾌적 breakdown도 동일 판정. shelters.js:91 subway needsLight:12("켜진 조명이 하나도 없으면 -12"), 조명 설비 mod는 subway 설치 제한 없음(태양광만 not:['subway'], game.js:4358/4361)
- **수정안**: comfort light 합산에 조명 설비 급전 상태를 주입(setComfortWeather식 단방향 주입으로 lightingFacilityOn 전달, on이면 light += N) — 특히 subway needsLight 게이트 통과

### [lighting-power] 태양광 설치 후에도 켜둔 발전기가 매일 연료를 태운다 — 완전 중복(#189 P2 승격의 사각)

- **근거**: game.js:8248-8256 발전기 루프가 무조건 선실행(연료 1/일 소모+freePower), 태양광 판정은 8261 `if (!freePower && hasMod('solar'))`로 발전기가 이미 켜져 있으면 도달 불가. 두 시스템의 효과(consumeFuel 배터리 무료, 8268)는 동일 — 발전기 연료가 순수 낭비
- **수정안**: 태양광 freePower 판정을 발전기 루프 앞으로 이동하고, freePower면 발전기 연료 소모 스킵(+"태양광이 전력을 대신한다" 노트 1줄 또는 발전기 자동 꺼짐)

### [lighting-power] 벙커 유지비 라벨 "배터리 1/일 (환기·조명 전력)" vs #189 어둠 기본값 — 조명값을 내는데 방은 어둡고, 셸터 배터리 유지비는 freePower도 미적용

- **근거**: src/data/shelters.js:30 벙커 upkeep label에 '조명' 명시 — #189 후 벙커도 무광원 폴백 어둠(game.js:253), 밝히려면 별도 lighting mod(배터리 1/일 추가, game.js:4361)로 이중 과금 체감. 또 upkeep 배터리는 resConsume 직결(game.js:8428)이라 발전기 "배터리 소비 무료"(furniture.js:752)·태양광 "조명·가전 전력 무료"(game.js:4358) 카피가 커버 안 함(지하철 환기 팬·관제탑 콘솔 동일, shelters.js:90/153)
- **수정안**: 벙커 라벨에서 '조명' 삭제(환기 전용) + 배터리 upkeep을 consumeFuel 경유로 freePower 커버(또는 태양광/발전기 카피에 "셸터 유지비 제외" 명시)

### [expedition] #165 리스크 인카운터 보상이 항상 '슬럼' 기준으로 롤림 — 지역 변형 문안도 사문

- **근거**: game.js:8797 pendingEvent 표시 게이트에 !state.exp → '무너진 입구' 모달은 귀환 후에만 뜸. game.js:3259에서 resolveExpedition이 state.exp=null → game.js:3866 collapseEntranceLoot의 `state.exp ? state.exp.region : 'slum'`이 항상 'slum' 폴백. events.js:604-608 textFn의 지역별 문안 분기도 같은 이유로 항상 generic 텍스트. 재현: 리조트/도심 탐험 중 발동(game.js:8938-8945 예약) → Yes 선택 → rollPaintFamily('slum')·slum 시그니처 풀(barrelfire/graffiti)에서만 도면이 나옴 — citycore 도면 3종(neonvip/neonair/suit)은 이 채널로 절대 안 나옴. slumdeep은 riskDeepMul 1.5로 제일 자주 발동하는데(balance.js:218) 문안·보상 모두 겉슬럼 취급
- **수정안**: 예약 시점(game.js:8939)에 state.exp.region을 별도 스테이트(예: state.riskEventRegion)로 저장하고 collapseEntranceLoot·textFn이 그걸 읽게 한다

### [expedition] 자동 진행이 눈사태 시스템(봉쇄·예보 선택)을 전혀 모름 — 봉쇄된 리조트로 출발

- **근거**: 수동 게이트는 startExpedition에만 있음(game.js:3087 avalancheBlocks 거부, 3089 예보 당일 선택 모달). 자동 경로 runAutoPlay(game.js:8696-8699)는 pickAutoRegion(core/regions.js:53-73 — 필터가 해금·폭설·금지뿐) → departExpedition(game.js:3196-3232 — 눈사태 검사 없음) 직행. 리조트 lootRes 5종(canned/cloth/fuel/battery/parts, world.js:167)이 전부 scarceWatch(balance.js:278)라 자동 가중이 높음. 결과: ① 봉쇄 중(avalancheBlockUntil) 수동은 '봉쇄 N일' 토스트로 거부되는데 자동은 그대로 다녀와 정산 ② 예보 당일 자동 출발은 우회/감수 선택을 건너뛰고 예보 미해소로 남아, 다음날 game.js:8242-8245가 '방치→3일 봉쇄' 처리 — 어제 다녀온 플레이어에겐 앞뒤가 안 맞음
- **수정안**: avalancheBlocks/avalancheForecastToday를 core/regions.js에 주입(setRegionsWeather 문법)해 pickAutoRegion 필터에 추가

### [expedition] 자동 진행이 도심 중심지 적대 다이얼(하드/하드코어)을 모른 채 위시리스트 넛지로 오히려 그쪽을 밀어줌

- **근거**: pickAutoRegion(core/regions.js:57-71)에 위험 항 없음 + 66-69 위시리스트 ×1.35가 citycore 시그니처 3종(balance.js:394)에 적용. citycore lootRes는 parts/battery/canned=scarce 3종(world.js:198)이라 숙련으로 eff가 오르면(캡 0.7) 가중 최상위. 조우 확률 0.35(balance.js:502), 하드=전리품 50% 손실·하드코어 무총=critical 중상(game.js:3462-3481). runAutoPlay는 모드 제한 없음(game.js:8685-8686). 금지 구역은 '위험=수동 전략 레버'로 자동에서 명시 제외(regions.js:60, game.js:8684 주석)인데 최고 위험 지역인 citycore만 그 원칙 밖 — 방치 중 자동이 반복 진입해 중상/약탈을 당함
- **수정안**: isHard() 이상에서 citycore를 자동 후보에서 제외(금지 구역과 동일 취급)하거나 encounterChance 기대 손실만큼 가중 디스카운트

### [comfort-deco] 조명 설비(개조) 전등이 쾌적 계산에 완전 미연결 — 벙커에서 전등 켜도 '완전한 어둠 -12' 유지

- **근거**: src/core/comfort.js:52-57(light 축은 가구 DEFS[defId].light만 합산)+72(needsLight 페널티는 light<=0 판정) vs src/game.js:250-254(lightingFacilityOn→facilityLight intensity 16, 방 전체 점등)·4361(조명 설비 개조: 전 셸터 설치 가능, 설명 '방이 밝아진다', 배터리 1/일)·8287-8294(매일 배터리 소비). src/data/shelters.js:91 벙커 needsLight:12, 카피 '켜진 조명이 하나도 없으면 쾌적함 -12'. 재현: 벙커에서 가구 조명 없이 조명 설비만 설치 → 방은 환한데 쾌적 분석에 🌑 어둠 -12 + 조명 축 0. 벙커 퍽(lightMult 1.5 '조명 쾌적함 1.5배', shelters.js:89)도 설비엔 무효
- **수정안**: comfortDetail에 lightingFacilityOn을 주입(setComfortWeather와 동일 문법)해 가동 중이면 light 축 가산(예: +8×lightMult) 및 needsLight 어둠 판정 면제

### [comfort-deco] 가구 수거(회수/전체 수거)가 티어 손질·도색·젤 투자를 무경고로 전부 소실 — 재배치는 T1·기본색·젤 없음

- **근거**: src/game.js:6845(reclaimSelected: state.inventory[defId] 개수만 +1, tier/colorIdx/gel 미보존)·6795(startPlacing: 재배치는 무조건 T1·colorIdx 0)·6855-6859(reclaimAll). src/locales/ko.json:305 '가구 {n}개를 전부 거둔다.' — 소실 경고 없음(가전 효과 중단만 안내, game.js:6851). 소실 투자: T3까지 material 4+parts 1(src/data/balance.js:388) + 도색 도료 1통/색(game.js:9011) + 젤 도료 1통(game.js:9075). 재현: T3 도색+젤 램프를 수거 후 재배치 → T1 기본색 잡동사니로 리셋, 이주(전체 수거) 시 집 전체가 리셋
- **수정안**: 수거·전체 수거 확인창에 '손질 티어·도색·젤 필터는 유지되지 않는다' 경고 1줄 추가(근본 해법은 인벤토리 인스턴스별 티어 보존 — 디렉터 결정 사안)

### [comfort-deco] 침대 T1/T2는 높이가 낮아졌는데 고양이 퍼치·아바타 착석 높이는 T3 고정(0.63) — 매트리스 위 공중부양

- **근거**: src/data/items.js:98 CAT_PERCH_Y={bed:0.63,…} + src/systems/avatar.js:34 SEAT_Y={bed:0.63,…}, 티어 미조회(src/systems/cat.js:353·395, avatar.js:178). 실측: T1 바닥 매트리스 상면 ≈0.16~0.25(src/data/furniture.js:21-26), T2 싱글 매트리스 상면 ≈0.46(furniture.js:38) vs 퍼치 0.63 — T1에서 약 0.4m 부양. #157이 sofa/chair 등은 '착석면 높이 동일'로 지켰지만(furniture.js:61·107) bed는 높이가 티어 정체성이라 예외. 재현: 침대 제작(신규=T1) 후 고양이가 올라앉으면 허공에 뜬다
- **수정안**: bed(및 cushion) 퍼치·착석 높이를 item.tier 분기 실측값(1→0.25, 2→0.46, 3→0.63)으로 치환 — CAT_PERCH_Y/SEAT_Y 조회부에 tier 인자 전달

### [save-migration] 지오 재빌드 직렬화 4사이트가 스태킹 높이 y를 누락 — 재빌드하면 표면 위 가구가 바닥으로 떨어짐

- **근거**: 정본 직렬화(doSaveNow src/game.js:1992, 이주 src/game.js:2580)는 y를 포함하지만, 옥탑 슬레이트 보수(src/game.js:5239)·증축/rebuild 개조(src/game.js:5372)·벙커 천장/뒷문 재빌드(src/game.js:5389)·프로젝트 지오 재빌드(src/game.js:5397) 4곳은 { d,c,x,z,r,o,s,t,ge }만 쓰고 y가 없다. 복원(src/game.js:2520)은 it.y||0, 지지대 재결합(src/game.js:2524-2528)은 `if (!it.y) continue`라 y가 빠지면 support 링크도 복구 불가 → 테이블 위 양초·소품이 같은 x,z의 바닥(가구 몸통 속)으로 침몰. 재현: 표면 가구 위에 소품 스태킹 → 슬레이트 보수/증축 제작 → 즉시 관찰. #189에서 ge를 6사이트 전부에 추가하면서도 y 결손은 그대로 복제됐다(이음매 누적의 전형).
- **수정안**: 6사이트를 공용 serializeLayout(items) 헬퍼 하나로 통일하고 y 포함(1992·2580과 동일 스키마)

### [save-migration] 가구 수거(단일·전체)가 손질 티어와 조명 젤을 무경고로 소실 — 유료 재화(손질 재료·도료 통)가 증발

- **근거**: 수거는 개수만 저장(src/game.js:6845, 6864 `state.inventory[defId]+1`) — item.tier(손질 비용 resConsumeAll, src/game.js:9050-9051)와 item.gel(도료 1통 소모, src/game.js:9074-9077)이 인스턴스와 함께 사라짐. 재배치는 항상 T1(src/game.js:6795 "#157: 새 배치는 T1부터")·무젤. 확인창 카피는 "가구 {n}개를 전부 거둔다"뿐(src/locales/ko.json:305) — 소실 경고 없음. 반면 이주(가구 두고 가기, src/game.js:2580)는 t·ge 보존이라 같은 '이사'인데 경로에 따라 결과가 다르다. #69 전체 수거가 이주 권장 동선이라 이사 한 번에 손질·젤 전액 초기화.
- **수정안**: 수거 확인창에 "손질·조명 필터는 풀린다" 경고 1줄 추가(reclaim.utilityOff 문법), 이상적으로는 젤 도료 반환

### [save-migration] v1.6.0 이전 구세이브는 regionVisits 부재 → 지도 전 지역 '?' 스케치 베일 + 도감 ??? — 베테랑 진행이 리셋된 것처럼 보임

- **근거**: 지도 핀은 visits=0이면 sketch 클래스+성공률 대신 '?'(src/game.js:2725, 2741, 2747-2748), 도감 시그니처 도면도 regionVisits 게이트로 ??? 베일(src/game.js:5848), 숙련 티어도 동일 필드(src/core/expedition.js:39). regionVisits는 ff69ab7(#85, v1.6.0/2026-07-06 최초 수록)에서 도입됐고 src/core/save.js에 마이그레이션 백필이 전혀 없다(migrateLoadedState 전문 확인, 15-119줄). v0.9.x~1.5.x 세이브(현 베타 피드백 인구=v0.9.4)를 로드하면 몇 겨울을 난 지역이 전부 '안 가본 곳' 소문 표기 — "다시 마주칠 때 더 보임" 기둥과 정면 충돌. 지역당 1회 재방문으로 자가 치유되긴 함.
- **수정안**: migrateLoadedState에 rawState.regionVisits==null && stats.exp>0이면 해금 지역 visits=1 시드(베일만 해제, 숙련은 0 유지)

### [modes-gates] 배경화면 모드에 랜덤 한파가 그대로 발화 — 토스트·아침보고 서사 + 쾌적 점수 실효 페널티 (대한파만 게이트됨)

- **근거**: src/game.js:8215-8218 한파 예보 롤 조건에 isWallpaper 게이트 없음(inWinter·확률만) → 8148-8155 발동 시 notes.push(coldsnap.hit)+toast(coldsnap.toast), 8191-8196 매일 defended/exposed 노트. 바로 아래 대한파 프론트는 8165에서 `!isWallpaper()`로 명시 게이트 — 같은 블록 안 비대칭. 쾌적 실효: src/core/coldsnap.js:33-41 활성 판정에 모드 게이트 없음 → src/core/comfort.js:74에서 쾌적 -coldSnapComfortPen(wallpaper의 유일한 살아있는 점수가 실제로 깎임). 아침 보고는 wallpaper에서도 표시(src/game.js:8791 게이트에 모드 조건 없음). 동류: 눈사태 예보 8236-8239도 무게이트 — wallpaper는 시작 시 successes 최대(src/ui/modals.js:62)라 resortOpen 항상 true → 겨울마다 avalanche.forecast/blocked 노트. 모드 카피는 "게이지도 겨울의 압박도 없이"(ko.json:283)
- **수정안**: processDay 한파 블록(8142)과 눈사태 블록(8226)에 프론트와 동일한 `!isWallpaper()` 게이트 추가 (예보·발동·노트 전부)

### [modes-gates] 업적 판정에 모드 게이트 전무 — 배경화면 방치+무한 자원만으로 생존 업적(첫 겨울·아홉 번째 겨울·제작20 등) Steam 해금

- **근거**: src/game.js:5707-5710 checkAchievements는 QA_ED/qaUsed만 차단(매 저장마다 2000에서 호출). wallpaper에서 day는 tickTime 8724-8730으로 무게이트 진행, winters는 passWinter 7987-7988(processDay 8139 무게이트 호출)로 증가 → winter(5696, day>=48)·nine_winters(5697)·settled8(5692) 방치로 달성. 무한 자원(src/core/economy.js:22,30 resConsume/resHasAll 항상 true)으로 craft20(5325 무료 제작→5347 카운트)·mods3(5359-5367 무료 개조)·renov3/renovAll(2553-2573 이주 정비 무료+전 셸터 해금)·comfort90 전부 클릭만으로 달성. 속도: 평시 1게임일=실 7.5분(game.js:111 GAME_MIN_PER_SEC=1.0 × balance.js:61 idleTimeScale=3.2) → 실 6시간 켜두면 '첫 겨울' 업적, 5713 Platform.achievements.unlock으로 Steam 중계
- **수정안**: checkAchievements 상단에 `if (isWallpaper()) return;` 추가 (QA_ED 게이트와 같은 줄 문법) — 꾸미기 업적을 남기려면 업적별 모드 태그로 분리

### [modes-gates] 9겨울 서사 파이프라인이 배경화면 모드에서 그대로 발화 — 겨울 메모아·박사 무전·재건 이벤트·노크 + HUD ❄️n/9 배지

- **근거**: passWinter(src/game.js:7987)가 wallpaper에서도 매 봄 실행 → buildWinterMemoir(7989, 8828-8833에서 수첩 페이지 강제 열람 — 연료 통계는 economy.js:22가 26 accWinterFuel 도달 전 return이라 항상 0)·9겨울 마일스톤+doctorRadioPending(7990, 7984)·낙진 걷힘 노트(7994)·rebuildPending(7998). tryDoctorRadio는 processDay 8518에서 무게이트 호출 → pendingEvent 직접 할당(8010 doctor_radio, 8023 rebuilding, 8030 ending_choice)이 drawEvent의 wallpaper 게이트(3831)를 우회하고 표시 체인(8797-8801 showEvent)에도 모드 게이트 없음. HUD 겨울 배지는 isZen만 분모를 숨겨(7880) wallpaper에 ❄️n/9(생존 약속 카운터) 노출. "살아남기 없이, 살아보기" 모드에서 생존 서사 엔딩이 완주됨
- **수정안**: processDay의 passWinter 호출(8139)과 tryDoctorRadio 호출(8518)에 `!isWallpaper()` 게이트 + 7880 분모 조건을 `(isZen() || isWallpaper())`로 확장

### [onboarding] #189 어둠 기본값에 대한 온보딩 완전 사각지대 — 해법(캔들 스툴)이 시작 인벤토리에 있는데 3채널 어디도 안내 안 함

- **근거**: game.js:232-240(어둠 기본값+죽은 형광등 폴백), core/state.js:16(시작 인벤토리 candle:1 스툴)·:18(양초 2). 반면 온보딩 전 채널 무커버: QUESTS 7단계에 조명 단계 없음(game.js:9576-9587), quest.place.text는 '침대 추천'(ko.json:1182), Day1~3 수첩 튜토리얼 조명 언급 0(ko.json:1165-1170), tipOnce 전 호출부 10곳(game.js:681,682,3216,4262,4315,5906,6816,7916,8135,8327)에 어둠/조명 팁 부재, 도움말 수첩은 쾌적 요소로 '조명' 한 단어뿐(ko.json:1160). 유일한 안내는 사후·반응형뿐: 도둑맞은 뒤(events.js:91-96), 양초 제작한 뒤(game.js:5330-5332)
- **수정안**: quest.place를 '침대·캔들 스툴 추천'으로 고치거나 첫 일몰 시 tipOnce('tip.dark') 1종 신설('방이 어두우면 인벤토리의 캔들 스툴을 놓아라 — 양초가 연료다')

### [mobile-ui] 가로폰(≤420px 높이) 편집 모드: 툴바가 카메라 조작 바와 편집(🔧) 버튼을 통째로 덮음

- **근거**: src/style.css:944 `#toolbar { bottom:4px; max-width: calc(100vw - 200px) }`(가로폰 블록)는 cam-ctrl이 '우측 세로열'이던 시절의 200px 예약 — style.css:820 주석대로 cam-ctrl은 하단 가로 바(9~10버튼, right:4px bottom:4px, style.css:947·821-825)로 재배치됐다. z-index: #toolbar=.panel 10(style.css:65) > #cam-ctrl 6(style.css:822) > #btn-edit 6(style.css:827-829). 844×390 가로폰에서 --uiz=1.25(game.js:10517-10534, isMobileEnv 하한 1.0×TEXT_BOOST 1.25)이므로 툴바 시각폭 ≈(844-200)×1.25≈805px, 중앙 정렬로 x≈19~824·y(bottom)≈5~67을 점유 → cam-ctrl 버튼(y 5~45, x≈404~839)과 btn-edit(x 15~65, y 12~62)이 툴바 밴드 안에 완전히 들어가 시각·터치 모두 차단. 가구 45종+수거 버튼(src/data/furniture.js 45항목, game.js:8871-8888)으로 툴바는 항상 max-width까지 찬다. 가로폰에서 편집 모드 탈출 수단(btn-edit)이 유일한데 그것까지 묻힘 — 세로로 돌려야 탈출.
- **수정안**: 가로폰 블록에서 #toolbar를 cam-ctrl 위 밴드로 분리(`bottom:44px`)하고 max-width의 -200px(구 세로열 가정)를 /var(--uiz,1) 보정식으로 교체

### [mobile-ui] #modal max-height에 --uiz 역보정 부재: 신설 장문 모달(도감·업적·기록 탭)이 상하 잘림 — 탭바·닫기 버튼 뷰포트 밖

- **근거**: src/style.css:347 `#modal { max-height:80vh; overflow-y:auto }` + .panel `zoom:var(--uiz)`(style.css:56). 같은 결함을 설정창은 이미 발견·수정했고 메커니즘을 주석으로 명시(style.css:165-168 "zoom이 창 전체를 곱해 88vh 클램프를 초과(1080p에서도 상하 잘림) → max-height를 --uiz로 역보정"). #modal(347)·모바일 72vh(925)·가로폰 88vh(951)는 미보정. 재현 산식: 1080p 데스크톱 uiz=1.256×1.25=1.57 → 80vh×1.57=126vh, 가로폰(844×390) uiz=1.25 → 88vh×1.25=110vh. #modal-back은 flex 중앙정렬(style.css:342-346)이라 초과분이 상하 균등 클립 → 상단(제목+journalTabBar 탭줄, game.js:5798-5800)과 하단(닫기 버튼) 접근 불가. 종전 모달은 이 max-height에 안 닿았고, 최근 추가된 도감 탭(#177, game.js:5830-5867: 도면 20+행+색상도감 45종+테마 배지)·업적창(#187, 5868-5875: 18행+진행바)·기록 탭이 처음으로 한도를 침 — 전형적 이음매.
- **수정안**: #modal max-height 3곳(347·925·951)을 설정창 ⑧ 패턴대로 calc(Nvh / var(--uiz,1))로 교체

### [mobile-ui] 도색·젤 스와치 터치 타깃 18px(시각 ~19-22px) + 오탭 즉시 도료 소모(확인 없음)

- **근거**: src/style.css:312 `.swatch { width:18px; height:18px }`, 젤 행은 gap 3px 인라인(game.js:9069). 모바일 미디어 블록 2곳(style.css:896-928, 931-955)에 .swatch 크기 오버라이드 없음 — 세로폰 uiz≈1.05로 시각 ~19px. 프로젝트 자체 터치 기준은 지도 핀 44px/모바일 52px(style.css:460 "터치 타깃 보장 (#47)", 466-469)인데 스와치만 예외. 탭 즉시 소모: 도색 game.js:9011-9015, 젤 9074-9079 — 원래색 복원만 무료고 인접 스와치 오탭 1회가 도료(탐험 희귀 드랍) 1통을 즉시 소모, 확인창(opts.confirmActions는 먹기·마시기·청소 전용)·되돌리기 없음. 젤 행은 원색+12계열=13개가 3px 간격으로 밀집.
- **수정안**: 모바일 미디어에 .swatch 32px+ 확대와 젤 행 gap 6px+, 도료 소모 탭은 1탭 선택·2탭 확정(또는 confirmActions 편입)

### [mobile-ui] 도료 보유량·필요 계열 안내가 hover title 전용 — 모바일에선 보유량을 볼 수 있는 화면이 전무 ("양초"류 사각지대)

- **근거**: state.paints의 UI 노출 지점 전수: 스와치 title 속성(game.js:9008 `paint.haveN`, 9067 젤 title)과 소모/획득 토스트(일시적)뿐 — res-bar·도감·일지 어디에도 미표시(game.js state.paints grep 전수 확인: 3357·3875·9003-9077·9358·10468 외 렌더 지점 없음). title은 네이티브 툴팁이라 터치에서 안 뜨고, 커스텀 #game-tip도 mouseover 위임 + data-tip 속성 전용(game.js:10290-10297)이라 대체 안 됨. 모바일 플레이어가 화면에서 얻는 단서는 잠금 🔒(style.css:315-316)뿐 — 어느 도료가 몇 통 있는지, 이 스와치가 무슨 계열을 요구하는지 사전 확인 불가. 잠긴 스와치를 탭해야 사후 토스트(paint.need, game.js:9012)로 계열명만 통보.
- **수정안**: 스와치에 보유 수량 상시 병기(칩 우상단 n 배지 — .tool-item .cnt 문법 재사용) 또는 sel-panel에 해당 계열 보유량 줄 추가

## P2-마이너 (16건)

### [lighting-power] 전역 lightingOut 플래그 vs 셸터별 lighting mod — 타 셸터 단전 이력이 신규 설치·이주 직후 점등을 막는다

- **근거**: state.lightingOut은 전역 단일 플래그(game.js:250, 8288-8291), mods는 셸터별(core/shelter.js:10). 설치 경로(game.js:5359-5383)와 이주(moveToShelter 2560-2587) 모두 리셋 없음 → 셸터 A 단전(true) 후 B에 조명 설비를 새로 지으면 배터리가 있어도 다음 processDay까지 소등, 이튿날 "전등이 다시 들어왔다"(한 번도 켜진 적 없는 방에서)
- **수정안**: lighting mod 설치 시 state.lightingOut=false 리셋(근본 해결은 셸터별 플래그화 state.lightingOut[id])

### [lighting-power] 네온 사인은 실광원(PointLight 내장)인데 '무광원' 판정 — 죽은 형광등 폴백이 네온 위에 계속 점멸

- **근거**: furniture.js:1472(neonvip)·1500(neonair) build()에 PointLight 직접 내장, light def 없음 → interiorLightActive(game.js:246-249)가 미집계 → 네온만 있는 방은 ceilBaseInt=10 냉백 점멸 폴백(253) 동시 점등. #189 "빛은 쟁취한다" 축에서 네온만 회색지대(쾌적 light 합산에서도 0)
- **수정안**: 네온류에 selfLit 플래그(또는 fuel 없는 light def)를 주어 interiorLightActive 집계에 포함

### [lighting-power] 배터리 소진 아침, 같은 사실이 결산 리포트에 최대 5줄 중복

- **근거**: game.js:8280(day.fuelOut × 배터리 가구 수) + 8291(day.lightingOut) + 8433(배터리 upkeep 셸터 day.upkeepUnpaid) + 8590(브리핑 부족 advice, warns 리스트) + 8624(재고 0 경고 섹션, 같은 warns 리스트) — 지하철에서 조명 설비+LED 바 운용 중 배터리 0이면 한 리포트에 배터리 언급 5줄
- **수정안**: processDay에서 fuelId==='battery' 소등 노트를 그룹핑해 "전력이 끊겼다(전등·LED 바·…)" 1줄로 집약

### [expedition] 젤 필터북(조명 색 파밍)이 획득 전엔 UI 어디에도 존재하지 않음 — '양초' 동류(안내 부재)

- **근거**: game.js:9061 젤 스와치 행은 def.light?.gelable && state.lightGels일 때만 렌더(미보유 잠금 행 없음). 지도 '여기서만' 라인은 blueprint.regionItems만(game.js:2996-3001), #177 도감 탭 집계도 시그니처+커먼+ledbar뿐(game.js:5834-5838) — 젤북 미포함. 드랍은 상업·도심 성공 2%(balance.js:406-407, 주석 스스로 '지역 pull'로 규정). 즉 pull로 설계된 기능인데 pull 가시화 표면(#177 지도/도감) 어디에도 없어, 우연히 맞기 전까지 조명 틴트 시스템의 존재 자체를 알 수 없음
- **수정안**: 도감 전설 채널(ledbar 행 문법)에 젤북 잠금 행 추가 + 상업/도심 map.drops 라인에 미보유 시 1줄 병기

### [expedition] 오토픽커가 #164 지역 컨디션(풍/마름)·떠오른 자리를 모름 — #177 위시리스트만 배선된 비대칭

- **근거**: pickAutoRegion(core/regions.js:53-73)은 state.regionCond·state.fieldSpot 미참조. 지도는 풍/마름 배지·스팟 배지를 표기(game.js:2733-2739)하고 실효는 전리품 ±25/20%(game.js:3294-3295)인데 자동 가중엔 0 반영 — 자동이 '풍' 지역을 두고 '마름' 지역을 고를 수 있음. 스팟은 2일 만료(balance.js:228)라 자동 위주 플레이어에겐 사실상 전량 소실. 같은 #164 세트인데 #177 레버5(위시리스트)만 자동에 연결됨(regions.js:66-69)
- **수정안**: 가중식에 condMul(풍 1.25/마름 0.8)과 스팟 보너스(spotHere면 ×1.5류)를 곱해 지도 정보와 자동 선택을 일치시킨다

### [expedition] 떠오른 자리가 봉쇄된 지역에 스폰될 수 있음 — 수명 2일이 봉쇄 3일 안에서 통째로 증발

- **근거**: 스폰 필터는 regionUnlocked && !isForbiddenRegion뿐(game.js:8541) — avalancheBlocks·blizzardBlocks 미검사. 리조트 스팟 skirental 존재(spots.js:28), lifeDays 2(balance.js:228) < 눈사태 봉쇄 avalancheDur 3(balance.js:609) → 봉쇄 1~2일차에 스폰되면 수동으로도 회수 불가 확정. 겨울 연속 눈(blizzardBlocks, core/regions.js:45-51)에서도 지상 스팟 동일. 아침 보고 '떠올랐다' + 지도 배지가 뜨는데 클릭하면 봉쇄 거부 — 놓침(갈증) 설계가 아니라 처음부터 닿을 수 없는 미끼가 됨
- **수정안**: 스폰 후보 필터에 avalancheBlocks(s.region)·blizzardBlocks(s.region) 제외를 추가

### [expedition] 지도 봉쇄 배지(❄️)가 폭설만 표시 — 눈사태 봉쇄 중 리조트 핀은 평소처럼 성공률을 보여줌

- **근거**: 핀 렌더의 blocked 판정이 blizzardBlocks만(game.js:2722-2723, 2745-2746). avalancheBlocks(game.js:3118-3121)는 지도 미반영 — 봉쇄 3일 동안 리조트 핀은 정상 %표기이고, 클릭해야 startExpedition 토스트(game.js:3087)로 거부당하며 알게 됨. 같은 '봉쇄' 개념이 표면(폭설=배지, 눈사태=클릭 후 토스트)마다 다르게 취급되는 이음매
- **수정안**: 핀 blocked 판정을 blizzardBlocks(rid) || avalancheBlocks(rid)로 확장(배지 아이콘만 ❄️/🏔️ 분기)

### [comfort-deco] 태양광/발전기 급전 중에도 편집 카드 연료 줄이 '(잔량 없음!)' 경고 — 불은 계속 켜지는데 카드는 꺼진다고 말함

- **근거**: src/game.js:9087-9096(showSelPanel 연료 줄은 state.res[fuel]만 표시: 0이면 power.empty) vs 8263-8270(태양광 설치 시 freePower→battery 소비 면제, 소등 안 됨)·8252-8258(발전기 동일). ko.json:505-507 '켜두면 1일 1개 소비 (잔량 없음!)'. 추가로 candle 가구는 격일 소비인데(game.js:8277) 카드 카피는 '1일 1개 소비·{n}일 유지' 고정. 재현: 태양광 설치+배터리 0 상태에서 램프 선택 → 카드가 빨간 '잔량 없음!' 경고를 띄우지만 램프는 영구 점등
- **수정안**: showSelPanel 연료 줄에 급전 상태 분기 추가(태양광/발전기 가동 시 '전력 무료' 표기) + candle은 격일 소비 문구로 교체

### [comfort-deco] 네온 사인(neonvip/neonair)은 실제 PointLight를 내장하고도 게임의 모든 '조명' 판정에서 제외 — 폴백 죽은 형광등이 안 꺼지고 벙커 어둠 페널티 유지

- **근거**: src/data/furniture.js:1472·1500(build 내부에 상시 PointLight 생성 — 실광원) vs def.light 부재 → src/core/comfort.js:52-57 조명 쾌적 0 + :72 needsLight 어둠 페널티 유지, src/game.js:246-249(interiorLightActive가 가구 def.light만 검사 → 네온만 켜진 방은 '무광원'으로 판정돼 폴백 죽은 형광등 ceilLight 10이 계속 점멸, game.js:232-253). 재현: 다른 조명을 다 끄고 네온 사인만 두면 네온 빛+형광등 점멸이 동시에 켜지고, 벙커면 -12도 그대로. 시그니처=파워 아님(코지 안전선)은 정본이나, 실광원을 넣어둔 채 광원 판정만 빼놓은 게 이음매
- **수정안**: 네온을 interiorLightActive·needsLight 판정에만 포함(쾌적 가산은 0 유지로 코지 안전선 보존)하거나, 내장 PointLight를 제거해 '장식' 규칙과 일치시킴

### [save-migration] MIG 게이트는 migrateLoadedState 산출 필드만 해시 — 레이아웃 아이템 스키마(y·s·t·ge)와 동적 신필드 34종이 그물 밖

- **근거**: tests/core.test.cjs:363-399의 mig 객체는 save.js가 채우는 톱레벨 정적 기본값만 열거(해시 핀 tests/core.test.cjs:10). 레이아웃 직렬화 7사이트(직렬화 6+복원 1)의 아이템 필드 보존은 어떤 테스트도 왕복 검증하지 않음 — 그래서 위 y 결손 4사이트가 통과했다. 또 lightingOut·lightGels(src/game.js:250, 3412-3414)·regionVisits·mapInked·collection·achs 등 DEFAULT_STATE(src/core/state.js) 밖 동적 필드 34종은 게이트 비가시(전수 grep으로 읽기 가드 확인 — 현재 크래시는 없음, 사각지대만 존재).
- **수정안**: 레이아웃 왕복 테스트 1건 추가: 스태킹+젤+티어+스케치 아이템을 직렬화→loadShelter 복원 후 y/ge/t/s 보존 assert (6사이트 헬퍼 통일과 세트)

### [modes-gates] 무한(zen) 전리품 배수 1.0 vs 인게임 카피 "코지 밸런스" — 코지(0.85)보다 18% 후한 실밸런스

- **근거**: src/data/balance.js:151 `incomeMul: { normal: 0.85, hard: 0.58, hardcore: 0.28, zen: 1.0 }` — 146-147행 주석 "노말도 소폭 조인다(구 1.0 → 0.85)"의 #76 후속 하향이 zen에 미적용(구 노말값 잔존). 반면 ko.json:275/en.json:275 zen 설명은 "코지 밸런스에 넉넉한 시작 물자"(차이는 시작 물자뿐이라고 명시). src/game.js:1686 hardLoot가 이 표를 전 모드 공통 적용
- **수정안**: zen을 0.85로 동기화하거나 카피를 실밸런스에 맞게 수정 — 어느 쪽이 정본인지 디렉터 확인 후 한 줄 변경

### [modes-gates] 배경화면 슬롯·HUD에 가짜 '탐험 성공 N회' 노출 — 셸터 해금용 successes 치환의 UI 누수

- **근거**: src/ui/modals.js:62 wallpaper 새 게임 시 `fresh.successes = Math.max(...unlockAt)`(셸터 전 해금 수단). 이 값이 탐험이 봉인된 모드(src/game.js:3075)인데도 HUD 트로피 카운터(7877 `🏆${state.successes}`, hud.succTip="성공한 탐험")와 슬롯 메타(slot.meta "탐험 성공 {succ}회", 슬롯 카드 렌더가 st.successes 사용)에 그대로 표기 — 탐험 0회 세이브가 성공 수십 회로 보임
- **수정안**: 해금 판정을 `isWallpaper() || successes>=unlockAt`로 바꿔 successes 치환을 제거하거나, HUD/슬롯 메타 표기만 wallpaper에서 숨김

### [onboarding] 연료 소진 소등 후 재점등 규칙 비대칭 — 전등(설비)은 자동 복구, 촛불 가구는 재보급해도 영구 꺼짐인데 안내 없음

- **근거**: game.js:8278-8280(가구 광원 연료 소진 시 setItemPower(it,false)=수동 토글 전까지 꺼짐 유지, 재점등은 가구 클릭 전원 토글 game.js:5948-5952)과 game.js:8283-8292(조명 설비는 '재급전 다음 날 자동 재시도(수동 조작 불요)'+day.lightingBack) 대비. day.fuelOut 카피(ko.json:528 '{fuel}이 떨어져 {name}이(가) 꺼졌다')는 수동 재점등이 필요하다는 말이 없음
- **수정안**: day.fuelOut에 '다시 켜려면 가구를 클릭해 불을 붙여라' 한 구절 추가(또는 연료 재보급 시 자동 재점등으로 통일)

### [onboarding] 아침 보고: 양초 고갈은 경고 목록에 있는데 해법 팁만 누락 (붕대·물·배터리는 있음)

- **근거**: game.js:8596(warns 필터에 'candle' 포함 → '부족: 양초' 경고·advice.shortage 노출)인데 팁 생성부 game.js:8598-8602는 bandage/water/battery(조건부)/injury/clean만 처리 — candle 항목 없음. 양초 수급 경로(제작대 천1+연료1→2개 items.js:119, 주거지역 파밍 ko.json:1934)를 보고창이 안내하지 않음
- **수정안**: warns.includes('candle')이고 양초 연료 가구 보유 시 report.tip.candle 1줄 추가('양초는 제작대에서 천+연료로 만든다')

### [mobile-ui] 일지 모달 탭바(일지/도감/업적/기록) EN 라벨이 세로폰에서 우측 클리핑 — Records 탭 접근 불가

- **근거**: journalTabBar(game.js:5798-5800): flex 행(gap 6px)에 .pixel-btn 4개, .pixel-btn은 white-space:nowrap(style.css:71)이라 flex min-content 하한이 라벨 전체 폭. EN 라벨 "📖 Survival Journal"·"📦 Collections"·"🏆 Achievements"·"Records"(src/locales/en.json:444·449·450·928) 합산 min-content ≈330-375px > 세로폰 모달 내폭(#modal width calc(100vw-60px) style.css:347 + 패딩: 360px 기기 276px·390px 기기 306px). .panel overflow:hidden(style.css:59)에 #modal은 overflow-y만 auto → x축 클립으로 넘친 탭이 잘린 채 스크롤 불가 — 360-390px급 EN 기기에서 기록(Records) 탭 전부·업적 탭 일부가 화면 밖. ko(2자 라벨)는 여유라 한국어 테스트에서 안 걸림.
- **수정안**: 탭바에 flex-wrap:wrap 허용 또는 탭 버튼만 white-space 해제(min-width:0)로 축약 — EN·ja 라벨 공통 방어

### [mobile-ui] 터치로 pad 커서 숨긴 뒤 A 버튼 = 보이지 않는 옛 좌표에 같은 프레임 즉발 클릭

- **근거**: game.js:10631 pointermove(터치 드래그 포함)가 showPadCursor(false)로 커서만 숨기고 padState.x/y는 유지. 이후 pollGamepad에서 아무 버튼이나 누르면 같은 프레임에 표시 복귀(10609)와 A 엣지 합성클릭(10625→10578 padSynthClick, elementFromPoint 즉발)이 동시 실행 — 플레이어가 커서 위치를 보기 전에 stale 좌표로 클릭이 나간다. 터치+패드 혼용 기기(Steam Deck·안드로이드+패드, #14 지원 대상)에서 유령 탭이 회수 버튼(#btn-delete)·도료 스와치(소모, 9013) 같은 파괴적 타깃에 떨어질 수 있음.
- **수정안**: showPadCursor(false)→(true) 전환 프레임의 A 엣지는 '커서 깨우기'로 소비하고 클릭 미발사

