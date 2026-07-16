# 모드 매트릭스 정적 감사 (#90 1단계) — 2026-07-16

모드 5종: normal(코지) · hard(생존) · hardcore(혹한) · zen(무한) · wallpaper(꾸미기)

## ① balance.js 모드 노브 (8개)

| 키 | 줄 | 보유 | 누락 |
|---|---|---|---|
| gardenChance | 104 | normal hard hardcore zen wallpaper | — |
| incomeMul | 154 | normal hard hardcore zen | **wallpaper** |
| surplusCap | 207 | normal hard hardcore zen | **wallpaper** |
| riskInjury | 222 | normal hard hardcore zen wallpaper | — |
| freqMul | 251 | normal hard hardcore zen wallpaper | — |
| barterMul | 252 | normal hard hardcore zen wallpaper | — |
| costMul | 253 | normal hard hardcore zen wallpaper | — |
| gateCostMul | 259 | normal hard hardcore zen wallpaper | — |

## ② 소스 모드 분기 사이트 (133건)

| 파일:줄 | 코드 |
|---|---|
| src/core/economy.js:22 | `if (isWallpaper()) return true; // 🖼️ 배경화면: 자원 무한 — 차감하지 않는다(표시는 ∞)` |
| src/core/economy.js:30 | `if (isWallpaper()) return true; // 🖼️ 배경화면: 항상 충족 (배치/이주 자유)` |
| src/core/expedition.js:36 | `return Math.min(BAL.pity.ceiling, rate + (isHard() ? 0 : BAL.pity.normalBonus) + BAL.pity.perStreak * Math.min(BAL.pity.streakCap, streak \|\| 0));` |
| src/core/gauges.js:16 | `if (isWallpaper()) return; // 🖼️ 배경화면: 게이지 압박 off — 배고픔/갈증/에너지 정지(볼거리만 흐른다)` |
| src/core/gauges.js:18 | `const hardMul = isHard() ? BAL.hard.drainMul : 1; // 하드: 배고픔/갈증 소모 +50%` |
| src/core/mode.js:11 | `export const isHard = () => state.mode === 'hard' \|\| state.mode === 'hardcore';` |
| src/core/mode.js:12 | `export const isHardcore = () => state.mode === 'hardcore'; // 폐허는 두 번 묻지 않는다 — 구제 없음` |
| src/core/mode.js:13 | `export const isZen = () => state.mode === 'zen'; // ♾️ 무한: 자동 진행 첫날 해금 + 겨울 카운터 분모 없음` |
| src/core/mode.js:14 | `export const isWallpaper = () => state.mode === 'wallpaper'; // 🖼️ 배경화면: 압박 전부 off, 자원 무한, 셸터 전 해금` |
| src/core/mode.js:16 | `export const rescueEligible = () => state.mode === 'normal' \|\| state.mode === 'hard';` |
| src/data/balance.js:146 | `// ♾️ 무한(zen) 모드 시작 물자 증량 — 새 게임 생성 시 mode==='zen'이면 DEFAULT_STATE.res에 가산.` |
| src/data/events.js:612 | `const inj = (BAL.events.riskInjury && BAL.events.riskInjury[state.mode]) ?? 0.28;` |
| src/game.js:641 | `setRegionsAutoAvoid((id) => avalancheBlocks(id) \|\| avalancheForecastToday(id) \|\| (id === 'citycore' && isHard()));` |
| src/game.js:1648 | `const m = BAL.gateCostMul[state.mode] ?? 1;` |
| src/game.js:1704 | `const mul = BAL.economy.incomeMul[state.mode] ?? 1;` |
| src/game.js:1750 | `if (isWallpaper() \|\| isZen()) return false;   // 무력 미적용 모드` |
| src/game.js:1971 | `if (state.mode === 'normal' && (s.normalBestDay \|\| 0) < day) { s.normalBestDay = day; dirty = true; }` |
| src/game.js:2413 | `m.emissive.setHex(mode === 'invalid' ? 0x7a2020 : 0x1e3a1e);` |
| src/game.js:3322 | `if (isWallpaper()) { toast(t('wallpaper.noAction')); return; } // 🖼️ 배경화면: 탐험 off` |
| src/game.js:3460 | `const expMul = isHard() ? 1.5 : 1; // 하드: 탐험 게이지 소모 +50%` |
| src/game.js:3716 | `if (!isHard()) {` |
| src/game.js:4084 | `if (isWallpaper()) return null; // 🖼️ 배경화면: 인카운터/이벤트 off` |
| src/game.js:4252 | `const g = v.g, tgt = v.mode === 'leave' ? v.edge : v.tgt;` |
| src/game.js:4273 | `if (v.mode === 'enter') {` |
| src/game.js:4277 | `} else if (v.mode === 'idle') {` |
| src/game.js:4290 | `} else if (v.mode === 'leave') {` |
| src/game.js:4304 | `if (!visitor \|\| visitor.mode === 'leave') return;` |
| src/game.js:5807 | `if (isWallpaper()) { toast(t('wallpaper.noAction')); return false; }` |
| src/game.js:5841 | `function encFreqMul()   { return BAL.encounters.freqMul[state.mode]   ?? 1; }` |
| src/game.js:5842 | `function encBarterMul() { return BAL.encounters.barterMul[state.mode] ?? 1; }` |
| src/game.js:5843 | `function encCostMul()   { return BAL.encounters.costMul[state.mode]   ?? 1; }` |
| src/game.js:5987 | `if (isWallpaper()) return; // #194: 배경화면(자원 무한·압박 0)은 생존 업적의 무대가 아니다 — 방치 달성·Steam 중계 차단` |
| src/game.js:7507 | `if (!isHard()) return false;` |
| src/game.js:7568 | `const asleep = c && (c.mode === 'sleep' \|\| (c.mode === 'sprawl' && (c.sprawlFor \|\| 0) > 12));` |
| src/game.js:8466 | `+ (meta.mode === 'hard' ? ' 🔥' : meta.mode === 'zen' ? ' ♾️' : '');` |
| src/game.js:8513 | `if (mode === 'hard') return `<span class="sl-mode-hard" title="${t('slot.hardBadge.title')}">🔥</span>`;` |
| src/game.js:8514 | `if (mode === 'hardcore') return `<span class="sl-mode-hard" title="${t('slot.hardcoreBadge.title')}">💀</span>`;` |
| src/game.js:8515 | `if (mode === 'zen') return `<span class="sl-mode-zen" title="${t('slot.zenBadge.title')}">♾️</span>`;` |
| src/game.js:8516 | `if (mode === 'wallpaper') return `<span class="sl-mode-zen" title="${t('slot.wallpaperBadge.title')}">🖼️</span>`;` |
| src/game.js:8531 | `? `${m.shelter.emoji} ${LName(m.shelter)} — Day ${m.day} ${m.season.icon}${m.winters >= 1 ? ` <span class="sl-winters">❄️${m.winters}${m.mode === 'zen` |
| src/game.js:8536 | `openModal(mode === 'new' ? t('slot.new') : t('slot.load'), `<div class="slot-scroll">${cards.join('')}</div>`);` |
| src/game.js:8549 | `if (mode === 'load') {` |
| src/game.js:8695 | `document.body.classList.toggle('wallpaper-mode', isWallpaper());` |
| src/game.js:8752 | `const wp = isWallpaper();` |
| src/game.js:8880 | `if (!isWallpaper()) base.push(`${t('pda.succ')}: ${state.successes}`);` |
| src/game.js:8881 | `if ((state.winters \|\| 0) >= 1) base.push(`${t('pda.winters')}: ${state.winters}${(isZen() \|\| isWallpaper()) ? '' : '/9'}`);` |
| src/game.js:8884 | `const wp = isWallpaper(); // 자원 패널이 PDA로 이관됨 — 배경화면 모드 ∞ 표기도 승계` |
| src/game.js:9146 | `if (prev.id === 'winter' && se.id === 'spring' && !isWallpaper()) passWinter(notes); // #194: 배경화면엔 9겨울 서사 없음` |
| src/game.js:9155 | `if (inWinter && !isWallpaper() && state.coldSnapForecast > 0 && state.day >= state.coldSnapForecast && !state.coldSnap) { // #194: 배경화면 한파 발동 차단(프론트 게` |
| src/game.js:9172 | `if (inWinter && state.frontWinterKey !== wk && !isWallpaper() && !_simRunning) {` |
| src/game.js:9181 | `const sev = isHard() ? GC.severityHard : GC.severityNormal;` |
| src/game.js:9190 | `state.front = { discipline: isHard() ? null : 'none' }; // 하드/하드코어만 규율 선택 대기(null → 아침 보고 뒤 모달)` |
| src/game.js:9216 | `const snapCap = S.coldSnapMaxPerWinter + (isHard() ? BAL.hard.coldSnapExtraPerWinter : 0);` |
| src/game.js:9219 | `const snapChance = S.coldSnapChancePerDay * (isHard() ? BAL.hard.coldSnapChanceMul : 1) * altMul;` |
| src/game.js:9221 | `const fcDays = isHard() ? BAL.hard.coldSnapForecastDaysOverride : S.coldSnapForecastDays;` |
| src/game.js:9222 | `if (inWinter && !isWallpaper() && !state.coldSnap && state.coldSnapForecast === 0 && // #194: 배경화면 예보 롤 차단` |
| src/game.js:9243 | `if (inWinter && !isWallpaper() && resortOpen && state.avalancheForecast === 0 && state.avalancheBlockUntil === 0 && // #194: 배경화면 눈사태 롤 차단` |
| src/game.js:9383 | `const gardenRoll = () => Math.random() < (BAL.modes.gardenChance[state.mode] ?? 1);` |
| src/game.js:9421 | `if (!isWallpaper()) {` |
| src/game.js:9423 | `const cap = LX.surplusCap[state.mode] ?? LX.surplusCapDefault; // 난이도별 안착선 (하드/하드코어일수록 낮다 = 더 빡세다)` |
| src/game.js:9537 | `if (!isWallpaper()) tryDoctorRadio(); // #194: 박사 교신·재건·엔딩 체인은 생존 서사 — 배경화면 차단` |
| src/game.js:9544 | `if (!state.eastRoadRumor && !isWallpaper() && falloutCleared()` |
| src/game.js:9554 | `if (!isWallpaper()) {` |
| src/game.js:9719 | `if (paused \|\| titleVisible \|\| !opts.autoPlay \|\| isWallpaper() \|\| (!isZen() && state.day < 10)) return;` |
| src/game.js:9754 | `if (curHour % 24 === 19 && state.day <= 2 && !isWallpaper()) tipOnce('tip.dark');` |
| src/game.js:9763 | `if ((isZen() \|\| state.day >= 10) && !state.autoNoticeShown) { state.autoNoticeShown = true; state.pendingAutoNotice = true; }` |
| src/game.js:9979 | `if (!state.pendingEvent && !isWallpaper() && Math.random() < (BAL.events.riskExpChance \|\| 0) * deepMul * encFreqMul()) {` |
| src/game.js:10411 | `function dyeCost() { return isHardcore() ? 4 : state.mode === 'hard' ? 3 : 2; }` |
| src/game.js:10652 | `function tutorialEligible() { return state.mode === 'normal'; }` |
| src/game.js:10920 | `const locked = !isZen() && state.day < 10;` |
| src/game.js:11060 | `$('dispres-row').style.display = dopts.mode === 'windowed' ? '' : 'none';` |
| src/game.js:11369 | `if (!isZen() && state.day < 10) { toast(t('auto.locked')); return; }` |
| src/game.js:11904 | `const incomeMul = BAL.economy.incomeMul[state.mode] ?? 1;` |
| src/game.js:11970 | `const expMul = isHard() ? BAL.hard.expMul : 1; // 하드: 탐험 게이지 소모 +50%` |
| src/systems/avatar.js:235 | `if (av.mode === 'sit' \|\| av.mode === 'wake') {` |
| src/systems/avatar.js:298 | `if (!av \|\| !av.g.visible \|\| av.mode === 'wake') return false;` |
| src/systems/avatar.js:322 | `if (av.mode === 'wake') {` |
| src/systems/avatar.js:345 | `const approaching = (av.mode === 'walk' \|\| av.mode === 'window' \|\| av.mode === 'gosit' \|\| av.mode === 'gowarm') && av.tgt;` |
| src/systems/avatar.js:352 | `else if (av.mode === 'walk') pickIdle();` |
| src/systems/avatar.js:353 | `else if (av.mode === 'window') av.tgt = null;` |
| src/systems/avatar.js:354 | `else if (av.mode === 'gosit') startSit();` |
| src/systems/avatar.js:355 | `else if (av.mode === 'gowarm') startWarm();` |
| src/systems/avatar.js:365 | `if (av.mode === 'walk') { av.tgt = farSpot(); av.way = routeTo(av.tgt); }` |
| src/systems/avatar.js:386 | `if (av.blockedT > 0.45) { av.blockedT = 0; av.way = routeTo(av.tgt); if (!av.way) { if (av.mode === 'walk') av.tgt = farSpot(); else pickIdle(); } }` |
| src/systems/avatar.js:399 | `} else if (av.mode === 'sit' \|\| av.mode === 'warm') {` |
| src/systems/avatar.js:402 | `} else if (av.mode === 'window' && !av.tgt) {` |
| src/systems/avatar.js:416 | `if (av.mode === 'sit') {` |
| src/systems/avatar.js:421 | `} else if (av.mode === 'warm') {` |
| src/systems/cat.js:483 | `if (c.mode === 'hop' && c.hop) {` |
| src/systems/cat.js:499 | `if (c.mode === 'walk' && c.tgt) {` |
| src/systems/cat.js:567 | `const k = Math.min(1, dt * ((c.mode === 'sit' \|\| c.mode === 'sprawl') ? 12 : 6));` |
| src/systems/cat.js:580 | `const walkBob = c.mode === 'walk' ? Math.abs(Math.sin(c.gait)) * 0.018 : 0;` |
| src/systems/cat.js:581 | `const hop = c.mode === 'play' ? Math.abs(Math.sin(t * 7.5)) * 0.055 : 0; // 사냥놀이 콩콩` |
| src/systems/cat.js:583 | `if (c.mode === 'sleep') bodyBr = 1 + Math.sin(t * 1.7) * 0.035;          // 식빵 자세 숨쉬기` |
| src/systems/cat.js:584 | `else if (c.mode === 'groom') {` |
| src/systems/cat.js:588 | `} else if (c.mode === 'sit') headRY = Math.sin(t * 0.4) * 0.55;          // 느긋한 두리번` |
| src/systems/cat.js:589 | `else if (c.mode === 'play') headRY = Math.sin(t * 5) * 0.3;              // 사냥감 쫓는 시선` |
| src/systems/cat.js:606 | `c.sprawlFor = c.mode === 'sprawl' ? (c.sprawlFor \|\| 0) + dt : 0; // 엎드린 누적 시간` |
| src/systems/cat.js:618 | `const tailSpd = (c.mode === 'play' ? 8 : c.mode === 'walk' ? 4.5 : c.mode === 'sleep' ? 0.7 : 1.4) * petBoost;` |
| src/systems/cat.js:619 | `const tailAmp = (c.mode === 'play' ? 0.5 : c.mode === 'sleep' ? 0.1 : 0.26) * (c.petPurr > 0 ? 1 + c.petPurr * 0.3 : 1);` |
| src/systems/cat.js:622 | `const tailX0 = Math.sin(t * tailSpd * 0.6) * 0.08 - (c.mode === 'walk' ? 0.4 : 0);` |
| src/systems/cat.js:647 | `const splTgt = c.mode === 'sprawl' ? 0.8 : 0;` |
| src/systems/cat.js:659 | `const bpivTgt = (c.mode === 'sit' \|\| c.mode === 'sprawl') ? 1.6 * 0.02 : 6 * 0.02; // 앉기·엎드리기: 엉덩이 피벗 바닥 근처로 → 수평 뒷다리가 지면에 눕는다(앉기=앞, 엎드리기=뒤)` |
| src/systems/cat.js:665 | `const hs = c.mode === 'groom' ? 0.6 : 1;` |
| src/systems/cat.js:675 | `const foreTgt = c.mode === 'stretch' ? 1.35 : 0; // 기지개만 앞팔 접힘(ㄴ자). 엎드리기(superman)는 앞다리 곧게 편 채 legF로 앞으로 쭉.` |
| src/systems/cat.js:678 | `const pivTgt = c.mode === 'stretch' ? 3.6 * 0.02 : (c.mode === 'sprawl' ? 1.6 * 0.02 : 6 * 0.02); // 엎드리기: 어깨 피벗 바닥 근처로 → 수평 앞다리가 앞으로 바닥에 눕는다` |
| src/systems/cat.js:713 | `const fgTgt = c.mode === 'stretch' ? 0.9 : -0.9;` |
| src/systems/cat.js:718 | `const shoulderComp = (c.mode === 'sit' \|\| c.mode === 'groom') ? a.pv.brx * 2.0 : 0;` |
| src/systems/cat.js:732 | `const curlTgt = (c.mode === 'sit' \|\| c.mode === 'groom' \|\| c.mode === 'sleep') ? 0.85 : 0;` |
| src/systems/wildlife.js:507 | `if (a.mode === 'hover') {` |
| src/systems/wildlife.js:527 | `if (a.mode === 'web') {` |
| src/systems/wildlife.js:539 | `if (a.mode === 'landing') {` |
| src/systems/wildlife.js:550 | `if (a.mode === 'enter') { a.mode = 'walk'; }` |
| src/systems/wildlife.js:553 | `if (a.mode === 'alert') { // 사슴: 고개 들어 경계` |
| src/systems/wildlife.js:561 | `if (a.mode === 'leap') { // 사슴: 도약 퇴장 (포물선 + 빠른 이동)` |
| src/systems/wildlife.js:570 | `if (a.mode === 'stare') { // 여우: 멈춰 이쪽 응시 2초` |
| src/systems/wildlife.js:582 | `if (a.mode === 'takeoff') {` |
| src/systems/wildlife.js:600 | `if (a.mode === 'flee') {` |
| src/systems/wildlife.js:616 | `if (a.mode === 'walk' && a.tgt) {` |
| src/systems/wildlife.js:628 | `if (a.mode === 'walk') g.position.y = a.groundY + Math.abs(Math.sin(a.gait * 1.6)) * hopA;` |
| src/systems/wildlife.js:633 | `if (a.mode === 'walk' && getSnowCover() > 0.15 && a.kind !== 'bird') {` |
| src/systems/wildlife.js:661 | `if (!(a.kind === 'bird' && a.mode === 'takeoff')) {` |
| src/systems/wildlife.js:705 | `const moving = a.mode === 'walk' \|\| a.mode === 'flee' \|\| a.mode === 'leap';` |
| src/systems/wildlife.js:714 | `if (a.mode === 'idle' && a.idleAct === 'graze') hrx = 0.7 + Math.sin(t * 3) * 0.08;` |
| src/systems/wildlife.js:715 | `else if (a.mode === 'idle' && a.idleAct === 'lookaround') hry = Math.sin(t * 0.7 + a.phase) * 0.55;` |
| src/systems/wildlife.js:733 | `if (flying) flap = a.sp.nameEn === 'seagull' && a.mode === 'takeoff' && (a.orbit \|\| 0) > 1` |
| src/systems/wildlife.js:736 | `else flap = a.mode === 'walk' ? Math.sin(t * 8) * 0.1 : Math.sin(t * 2) * 0.04;` |
| src/systems/wildlife.js:742 | `if (a.mode === 'idle' && a.idleAct === 'peck') hrx = Math.max(0, Math.sin(t * 6)) * 0.7;` |
| src/systems/wildlife.js:743 | `else if (a.mode === 'idle' && a.idleAct === 'lookaround') hry = (Math.sin(t * 1.2 + a.phase) > 0 ? 0.5 : -0.5);` |
| src/systems/wildlife.js:748 | `if (a.mode === 'walk' && a.parts.body) a.parts.body.rotation.z = Math.sin(a.gait) * 0.08;` |
| src/ui/modals.js:56 | `if (fresh.mode === 'zen') {` |
| src/ui/modals.js:61 | `if (fresh.mode === 'wallpaper') {` |
| src/ui/modals.js:72 | `if (fresh.mode === 'wallpaper') sessionStorage.setItem('ps-load', '1');` |

## ③ 판정 (1단계 — 정적 + 정착 소크)

### 노브 완비성
- **incomeMul·surplusCap의 wallpaper 누락**: 소비처가 전부 `?? 1` / `?? surplusCapDefault` 폴백 — 기능상 안전.
  배경화면 모드는 진행도 비게이트(#194)라 관대한 폴백이 설계에 부합. **수정 불요** (의도 문서화만).
- 무폴백 `[state.mode]` 인덱싱: **0건**. 모드 술어(isHard=hard∪hardcore) 정의 건전.

### hard 단독 비교 5건 전수
- dyeCost(혹한4/생존3/그외2)·rescueEligible(코지·생존만 구제)·isHard 정의 = 의도된 사다리 ✓
- **결함 1건(P3)**: 타이틀 이어하기 줄(game.js 8466)이 🔥·♾️만 표기 — 혹한 💀·꾸미기 🖼️ 공백.
  slotModeBadge(4종 완비)와 불일치 → 4모드 확장으로 봉합. 실화면 프로브: 4종 전부 렌더 확인.

### 정착 소크 (simDays — normal/hard/hardcore 48일 · zen/wallpaper 30일)
| 모드 | 일수 | 에러 | 음수자원 | NaN | food | water | 겨울 |
|---|---|---|---|---|---|---|---|
| normal(코지) | 48 | 0 | 0 | 0 | 218 | 310 | 1 |
| hard(생존) | 48 | 0 | 0 | 0 | 162 | 181 | 1 |
| hardcore(혹한) | 48 | 0 | 0 | 0 | 158 | 74 | 1 |
| zen(무한) | 30 | 0 | 0 | 0 | 254 | 223 | — |
| wallpaper(꾸미기) | 30 | 0 | 0 | 0 | 67 | 32 | — |
- 난이도 사다리가 물자에 실측으로 반영(코지>생존>혹한). 업적 오발동 0(소크 중 achs 0 — sim 가드 정상).

## ④ 2단계 — 실 탐험 경로 소크 · 고갈 가드 · 세이브 왕복 (전부 그린)

### 실 탐험 경로 소크 (departExpedition→강제 만료→resolveExpedition, 모드별 40회 — 요약 시뮬이 아닌 실 코드 경로)
| 모드 | 트립 | 성공 | 성공률 | 트립 에러 | 미해소(stuck) |
|---|---|---|---|---|---|
| hard(생존) | 40 | 34 | 85% | 0 | 0 |
| hardcore(혹한) | 40 | 31 | 78% | 0 | 0 |
| zen(무한) | 40 | 34 | 85% | 0 | 0 |

### 부상·숙련 재계측 (1차 프로브의 필드 오독 2건 교정 — `injuries[]`→`injury` 단수, `regionMastery`→`regionVisits` 파생)
- hardcore 80회: 성공 72 · **부상 6**(비성공 8회 대비 — injuryPartialChance 0.4 궤도) · 전리품 76/80(실패 4회 빈손=무가방 정상) · **visits 80**(숙련 카운팅 ✓).
- 성공률이 40회 소크(78%)보다 높게 수렴(90%) — **지역 숙련 티어 상승이 eff를 실제로 끌어올림**(2.0 숙련 시스템 연동 실증).

### 자원 고갈 무력 가드 (food·canned·water·게이지 전부 0 → checkHelpless)
| 모드 | helpless 판정 | 런 종료 | 구제 |
|---|---|---|---|
| wallpaper(꾸미기) | false | 아니오 | — |
| zen(무한) | false | 아니오 | — |
| hardcore(혹한) | true | **예** | 미사용(혹한=구제 없음 설계 ✓) |

### 모드 세이브 왕복
- 5모드 전부 슬롯 기록→loadSave→state.mode 보존 ✓ (slotMeta 화이트리스트 포함).

### 종합 판정
- **5모드 정합: 그린.** 결함은 1단계 P3(타이틀 배지) 1건뿐 — 봉합 완료. 실주행·실경로·고갈·왕복 전 채널 무에러.
- 프로브 함정 기록: 필드명 오독 2건(부상 단수형·숙련 파생형)이 1차에서 가짜 음성 생성 — 소스 대조 후 재계측으로 해소.
