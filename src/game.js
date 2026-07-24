import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { lamb, B, Cyl, shade, seededRand, paintGeo, vcLambert, josa } from './lib/helpers.js';
import { makeCanvasTex, floorWoodTex, wallWoodTex, metalTex, plywoodTex, brickTex, subwayTileTex, concreteTex, frostTex, beamTex, floorGlowTex } from './render/textures.js'; // 절차 텍스처 (Tier4)
import { DEFS } from './data/furniture.js';
import { BAL } from './data/balance.js';
import { PROJECTS } from './data/projects.js';
import { PALETTE_FLAT } from './data/palette.js'; // 픽셀 마스터 팔레트 (포스트 셰이더 LUT 스냅)
// 콘텐츠 데이터 분리 Phase 1 (순수 테이블 추출) — 로직은 game.js에 그대로.
import { RESOURCES, INJURIES, PREPS, THEME_SETS, CAT_POSES, CAT_PERCH_Y, BED_TOP_Y, TIER_TOP_Y, CRAFTS, OUTFITS } from './data/items.js'; // #193·#196: 티어별 좌면 실높이 표(퍼치·착석·기상 공용)
import { DISTRICTS, REGIONS, WEATHERS } from './data/world.js';
import { ACH_DEFS } from './data/achs.js'; // #73 Tier4: 업적 정의(판정 chk는 아래 ACH_CHECKS 병합)
import { SHELTER_META, SHELTER_ACCESS } from './data/shelters.js'; // 셸터 데이터 필드(분리 Phase 1) — build 함수는 아래 SHELTERS에서 병합. SHELTER_ACCESS: #182 드랍 지면 판정
import { makeShelterBuilders } from './render/shelters.js'; // Tier4 렌더 추출 Phase1-①: 셸터 build 함수(ctx 주입)
import { DAY_PHASES, DAY_KEYS } from './render/timelight.js'; // D1 상환: 시간대 대기 커브 SSOT(항공 커브와 병치) — 값 원본 그대로 이관
import { tagDecoWall } from './render/props.js'; // 순수 프롭 빌더(deco 태그) — game.js 직접 사용분
import { makeCulling } from './render/culling.js'; // Tier4 렌더 추출 Phase1-②: 벽/천장 컬링
import { makeCamera } from './render/camera.js'; // Tier4 렌더 추출 Phase1-③: 카메라
import { makeScreenFx } from './render/weatherfx.js'; // Tier4 렌더 추출 Phase1-④: 화면 2D 날씨 오버레이
import { makeModals } from './ui/modals.js'; // Tier4 UI 추출 Phase1-⑤: 모달 빌더
import { makeSettingsUI } from './ui/settings.js'; // #210 설정 모달 셸+컨트롤 배선(1~2단계 추출)
import { makeKeybindUI } from './ui/keybind.js'; // #210 컨트롤 탭 키 리바인딩(3단계 추출)
import { makeCreatorUI } from './ui/creator.js'; // 씬 저작 크리에이터 모드 (디렉터 직접 저작 도구)
import { makeMapview, makeObsView, MAP_SAFE, MAP_MARKERS, SHELTER_MAP, MAP_LIGHT_MAX } from './ui/mapview.js'; // S2 지도 뷰 추출+관측 단말(AERIAL-MAP §4) — 좌표 표는 PDA 미니맵과 공유
import { MEMOS, WILLS, MEMO_REGIONS, MEMOS_BY_REGION, MEMOS_SUBWAY, MEMOS_RESORT, MEMOS_RESEARCH, MEMOS_HARBOR, MEMOS_CITYCORE, BROADCASTS, SKETCHES } from './data/lore.js';
import { PAINT_FAMILIES, RARE_PAINTS, PAINT_ALL, paintFamilyOf, paintFamilyRequired } from './data/paints.js'; // 도료 12계열 + 희귀 안료 (REWARD-LOOP ②)
import { makeEvents } from './data/events.js';
import { FIELD_SPOTS } from './data/spots.js'; // #164 「떠오른 자리」 한시 특수 스팟
import { makeDecoTex } from './data/decotex.js';
import { makeCatSystem } from './systems/cat.js';
import { makeWildlifeSystem } from './systems/wildlife.js';
import { makeAvatarSystem } from './systems/avatar.js';
import { buildVisitor, VISITOR_IDS, ENCOUNTER_VISITOR } from './systems/visitor.js';
import { VISITOR_TABLE, VISITOR_UI } from './data/visitors.js'; // #181 방문자 교환·대사 밸런스 테이블
import { WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE } from './data/wildlife.js';
import { EVENT_CARD_CAMS } from './data/eventcams.js'; // #201 라이브 카드 스냅샷 카메라 프리셋
import { GLYPH_NAMES } from './data/glyphs.gen.js'; // 세미오틱 글리프 명단 (UI-PIXEL-UNITY §5, icon-semiotic.mjs 산출)
import { makeAerialProto } from './render/aerialproto.js'; // 항공뷰 지도 S1 프로토 (AERIAL-MAP) — QA 전용, 플레이어 진입점 없음
import { lang, setLang, steamLangToGame, t, LN, LD, LF, LC, STR, applyStaticI18n, applyLocaleOverrides, loadLocaleOverridesWeb } from './i18n.js';
import { stampDataL10n } from './data/l10n-registry.js'; // #114 Phase 2: 데이터 표 _lk 스탬프(비열거) — LF/LC가 로케일 JSON 우선 조회
stampDataL10n();
import { playSfx, setAmbience, setFire, setSfxVol, initSfx, setSeasonAmbience, seasonAmbienceName } from './sfx.js';
import { Platform, bindPlatform } from './lib/platform.js';
import { state, DEFAULT_STATE, opts, OPTS_DEFAULT, items } from './core/state.js'; // 모놀리스 분해 Phase 1: 공유 가변 상태
import { isHard, isHardcore, isZen, isWallpaper, rescueEligible } from './core/mode.js'; // 난이도 예측자
import { SEASONS, SEASON_DAYS, seasonOf, seasonDay, seasonIndex, seasonAdjustPool } from './core/season.js'; // 계절 달력
import { accWinterFuel, resAdd, resConsume, resHasAll, resConsumeAll, hasAnyFood, consumeAnyFood } from './core/economy.js'; // 자원 연산
import { hasMod } from './core/shelter.js'; // 셸터 개조 술어
import { coldDefenseLevel, coldSnapActive, coldSnapNetSeverity, frontActive, frontDiscipline } from './core/coldsnap.js'; // 한파 술어 + 대한파 프론트(2.0)
import { comfortDetail, comfortLevel, comfortExpBonus, recoveryMult, bunkerComfortBonus, themeSetActive, activeThemeSets, setComfortWeather, setComfortFacilityLight, tierComfortMult } from './core/comfort.js'; // 쾌적 계산
import { decayGauges, isExhausted } from './core/gauges.js'; // 생존 게이지 감소
import { migrateLoadedState } from './core/save.js'; // 세이브 마이그레이션
import { KNOWLEDGE, KNOWLEDGE_BRANCHES } from './data/knowledge.js'; // 「지식」 테크트리 데이터 (§9)
import { hasKnowledge, knowledgeUnlockable, knowledgePrereqMet, unlockKnowledge,
  knowColdDefense, knowInsulates, knowHearthAnywhere, knowWinterComfort, knowHeatFuelMul,
  knowWaterPerDay, knowGardenAnywhere, knowGardenBonus, knowSpoilMul, knowSaltCureBonus,
  knowDirtReduce, knowCraftMul, knowComfortBonus, knowExpBonus, knowForecastLead, knowsForecast, knowBroadcastBonus } from './core/knowledge.js'; // 지식 해금·효과
import { districtOf, cityOf, rateParts, expActualRate, setExpeditionWeather, masteryTier } from './core/expedition.js'; // 탐험 판정 (Tier3) + 지역 숙련(2.0) + 도시 파생(2.0-α)
import { districtRegionOf, projectAvailable, projectRec, projectDone, projectSiteStage } from './core/projects.js'; // 프로젝트 술어 (Tier3)
import { eventMatches, eventWeight, eventThreePeatBlocked, pushEvHistory, setEncounterEvents } from './core/encounter.js'; // 인카운터 술어 (Tier3)
import { regionUnlocked, isForbiddenRegion, subwayReaches, blizzardBlocks, pickAutoRegion, setRegionsWeather, setRegionsAutoAvoid, falloutCleared, regionReachable, regionCityOf } from './core/regions.js'; // 지역 게이트+자동선택 (Tier3) + 낙진 시계(2.0) + 도시 필터(2.0-b) + 도시뷰(2.0-f)
import { initVignettes, playVignette, playGeigerVignette, playEastGateVignette, playJungleSunVignette, playGoldenGateVignette, buildGoldenGateScene, buildJungleSunScene, showDiscoveryVignette, vignetteBusy, claimVignette, releaseVignette } from './render/vignettes.js'; // 시네마틱 비네트 (Tier5·6a — 발견 컷 포함)
initVignettes({ addMoodBuff, jackpotToast, scheduleSave, gameHour, disposeDeep }); // 함수 선언 호이스팅 전제 — 게임 측 헬퍼 단방향 주입
import { initNotebook, openJournalPages, openHelpModal, showMemoPage, showSketchPage, showTruthPage } from './ui/notebook.js'; // 수첩 페이지 (Tier7)
// setJournalOpen: journalOpen(let, 아래 선언)은 렌더 루프 게이트 14곳이 읽는 잔류 전역 — 클로저는 호출 시점 참조라 TDZ 무관.
initNotebook({ applyPaperBg, paperSfx, setJournalOpen: v => { journalOpen = v; } });

// 데이터 테이블 표시 헬퍼 (lang==='en' && *En 있으면 영문, 아니면 원본)
const LName = LN;                        // obj.name / obj.nameEn
const LDesc = LD;                        // obj.desc / obj.descEn
const LRisk = (o) => LF(o, 'risk');      // REGIONS.risk
const LEff  = (o) => LF(o, 'eff');       // PREPS.eff
const LLabel = (o) => LF(o, 'label');    // perk.label / upkeep.label / appliance.label
const LBonus = (o) => LF(o, 'bonusLabel'); // DISTRICTS.bonusLabel
const LHint = (o) => LF(o, 'hint');      // CRAFTS.hint
// #193: 도면 게이트 판정 — 해당 가구의 제작 레시피가 bp를 요구하는데 아직 도면을 못 주웠으면 true.
//   툴바 노출·전체풀 드랍이 제작대·도감·지도의 「지역 독점」 원칙과 같은 게이트를 쓴다(누출 봉합).
const FURN_CRAFT = new Map(CRAFTS.filter(c => c.out.furn).map(c => [c.out.furn, c]));
function bpGatedLocked(defId) {
  const rec = FURN_CRAFT.get(defId);
  return !!(rec && rec.bp && !(state.blueprints || {})[rec.bp]);
}
const LLimits = (o) => LF(o, 'limits');  // SHELTERS.limits
const LColor = (o, i) => LC(o, 'colorNames', i); // #114: 외부화 키(data.*.colorNames, 파이프 결합) 우선 — 폴백 동일
// buff 라벨: 이벤트 버프는 labelId(신규) 또는 label(구세이브 잔재)
const buffLabel = (b) => b ? (b.labelId ? t(b.labelId) : (b.label || '')) : '';

/* ============================================================
   생성 아트 아이콘 (public/img/icons) — 이모지 UI 교체 (#19)
   테이블(RESOURCES/DEFS 등) 원본 필드는 불변, 렌더 시점에만 아이콘 우선.
   이미지 로드 실패 시 onerror로 이모지 텍스트 폴백(오프라인 PWA 캐시 미스 대비).
============================================================ */
// HTML 속성값 안전화 (이모지/따옴표를 onerror 인라인 폴백에 넣기 위함)
const _iconEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// icon(name, emojiFallback, cls) → <img class="px-icon …"> 문자열. emoji 폴백 필수(로드 실패 시 텍스트로 대체).
// 아이콘 PNG가 없는 이름(예: icon_res_book)은 첫 로드에서 404→onerror 폴백이 innerHTML 재구성마다
// 재발화해 "깜빡임"으로 보인다(디렉터 신고: 책). 실패한 이름을 캐시해 이후엔 <img> 없이 이모지로 바로 폴백.
const _iconMissing = new Set();
if (typeof window !== 'undefined') window.__iconFail = (n) => _iconMissing.add(n);
// UI-PIXEL-UNITY §5: UI 크롬 아이콘은 도트 PNG 대신 세미오틱 글리프(SVG mask + currentColor).
// 색은 부모 텍스트색이 결정 — 인광 그린/경고 앰버/위급 적색이 CSS 상속으로 공짜.
const _glyphSet = new Set(GLYPH_NAMES);
function icon(name, emoji = '', cls = '') {
  if (_glyphSet.has(name)) return `<span class="px-icon glyph${cls ? ' ' + cls : ''}" style="-webkit-mask-image:url('img/glyphs/${name}.svg');mask-image:url('img/glyphs/${name}.svg')"></span>`;
  const fb = ''; // 디렉터: 이모지 폴백 전면 제거 — 아이콘 PNG 부재 시 공란(라벨이 의미 전달). emoji 인자는 하위호환용, _iconEsc 무용.
  // 폴백이 공란이면 '빈 껍데기'를 남기지 않는다(#219): .px-icon은 크기가 박힌 inline-block이라
  // 내용이 없어도 라인박스를 31px로 부풀려 옆 텍스트의 베이스라인을 아래로 민다 — 준비물 행 어긋남의 진범.
  // 첫 렌더(=img onerror로 빈 텍스트 치환)와 이후 렌더가 같은 모양이 되도록 통일하는 효과도 있다.
  if (_iconMissing.has(name)) return '';
  return `<img class="px-icon${cls ? ' ' + cls : ''}" src="img/icons/${name}.png" alt="" draggable="false"`
    + ` onerror="window.__iconFail&&window.__iconFail('${name}');this.replaceWith(document.createTextNode('${fb}'))">`;
}
// ID→아이콘명 매핑 (테이블 원본 대신 별도 객체). 대부분 ID가 파일명과 직결되나 예외(region slum→slums)만 명시.
const REGION_ICON = { residential: 'icon_region_residential', commercial: 'icon_region_commercial', industrial: 'icon_region_industrial', slum: 'icon_region_slums' };
const GAUGE_ICON = { hunger: 'icon_g_hunger', thirst: 'icon_g_thirst', energy: 'icon_g_energy', clean: 'icon_g_clean' };
const WEATHER_ICON = { clear: 'icon_weather_clear', snow: 'icon_weather_snow', rain: 'icon_weather_rain', ash: 'icon_weather_ash', storm: 'icon_weather_storm' };
// 렌더 편의 래퍼 (테이블 객체를 받아 아이콘 우선, emoji 폴백)
const resIcon   = (id, cls = '') => icon(`icon_res_${id}`, RESOURCES[id]?.emoji || '', cls);
const furnIcon  = (id, cls = '') => icon(`icon_furn_${id}`, DEFS[id]?.emoji || '', cls);
const shIcon    = (id, cls = '') => icon(`icon_shelter_${id}`, SHELTERS[id]?.emoji || '', cls);
const distIcon  = (id, cls = '') => icon(`icon_district_${id}`, DISTRICTS[id]?.emoji || '', cls);
const injIconEl = (type, cls = '') => icon(`icon_inj_${type}`, INJURIES[type]?.icon || '', cls);
const regionIcon= (id, cls = '') => icon(REGION_ICON[id] || `icon_region_${id}`, REGIONS[id]?.emoji || '', cls);
const wxIcon    = (type, cls = '') => type === 'clear' ? '' : icon(WEATHER_ICON[type] || `icon_weather_${type}`, WEATHERS[type]?.icon || '', cls); // 맑음=무아이콘(디렉터: "해 모양은 별로야, 굳이 넣지마")

/* ============================================================
   기본 설정
============================================================ */
const GRID = 0.25;
// #89 QA 에디션: 빌드 플래그(vite define, tools/build-qa.ps1가 켠다). 무한 자원·전 해금·업적 no-op·워터마크.
//   세이브는 키 네임스페이스(qa-)로 완전 분리 — 정식 빌드 세이브와 상호 불가침.
const QA_ED = typeof __QA_EDITION__ !== 'undefined' && !!__QA_EDITION__;
// #74 Next Fest 데모 「첫 번째 겨울」: 빌드 플래그(tools/build-demo.ps1). 노말 전용, 첫 겨울을 넘기면
//   데모 종료(그 세이브는 열람 잠금 — 정식판 이관 안내). 세이브 네임스페이스 demo- 분리.
const DEMO_ED = typeof __DEMO__ !== 'undefined' && !!__DEMO__;
// 디렉터(2026-07-18): 발매 전 데모엔 QA 치트 진입점을 연다. 공개 발매(스토어 제출) 직전 false로 재봉인할 것.
const DEMO_QA_OPEN = true;
const KEY_NS = QA_ED ? 'qa-' : DEMO_ED ? 'demo-' : '';
const SAVE_KEY = KEY_NS + 'project-shelter-web-v2';
const LASTSLOT_KEY = KEY_NS + 'project-shelter' + '-lastslot'; // 이어하기 포인터도 에디션별 분리 (QA가 정식 포인터를 밀면 빈 슬롯 이어하기 오노출)
const OLD_SAVE_KEY = 'project-shelter-web-v1';
const GAME_MIN_PER_SEC = 1.0;   // 실제 1초 = 게임 1분 (하루 = 실시간 24분) — v1.5.1 디렉터 확정(순삭감 완화, 1.5→1.0)
//   게이지 소모·부패·스폰 주기는 전부 '게임 분' 기준이라 게임일 밸런스 불변. 오프라인 정산·탐험 차감식(#94)도 이 상수를 공유해 일관.
const WAKE_HOUR = 7;            // 취침 후 기상 시각 (07:00) — sleepUntilMorning/결산 게이트 공용 (v1.2.0)

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 소프트 엣지(디렉터: 더 예쁜 그림자). 하드 PCF → 부드러운 페넘브라
renderer.shadowMap.autoUpdate = false; // 정적 씬: 변경 시에만 갱신 (이동체는 shadowDirty로 직접 신고)
function shadowDirty() { renderer.shadowMap.needsUpdate = true; }

/* ── #203 터치 픽셀 버스트 (플레이어 피드백 — 디렉터: 비주얼만, SFX 없음) ──
   씬 캔버스를 누른 지점에서 사각 픽셀이 방사형으로 흩어진다. 도트 미학에 맞춰 2px 그리드 스냅.
   패널·모달 위 터치는 제외(캔버스 리스너라 자연 스코프). 파티클이 살아 있는 동안만 rAF —
   방치형 배터리 캐논 준수(평시 루프 0). reduceMotion이면 생략. */
const tapFx = (() => {
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:59'; // PDA(58) 위, 저널(60) 아래
  document.body.appendChild(cv);
  const cx = cv.getContext('2d');
  let parts = [], raf = 0, W = 0, H = 0;
  const fit = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  fit(); addEventListener('resize', fit);
  const PAL = ['#f2e9d8', '#e8c690', '#b8c4cc']; // 크림·앰버·한랭 회청 — 게임 톤
  function loop() {
    cx.clearRect(0, 0, W, H);
    const now = performance.now();
    parts = parts.filter(p => now - p.t0 < p.life);
    for (const p of parts) {
      const t = (now - p.t0) / p.life;
      const d = p.dist * (1 - Math.pow(1 - t, 2.2)); // 감속 방사
      const x = Math.round((p.x + Math.cos(p.a) * d) / 2) * 2; // 2px 그리드 스냅(도트 결)
      const y = Math.round((p.y + Math.sin(p.a) * d + t * t * 6) / 2) * 2; // 말미 미세 낙하
      cx.globalAlpha = 1 - t;
      cx.fillStyle = p.c;
      const sz = Math.max(2, Math.round(p.sz * (1 - t * 0.5)));
      cx.fillRect(x, y, sz, sz);
    }
    cx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(loop) : 0; // 전멸 시 루프 정지
  }
  function burst(x, y) {
    if (opts.reduceMotion) return;
    const n = 10 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5; // 균등 방사 + 지터
      parts.push({ x, y, a, t0: performance.now(), life: 280 + Math.random() * 160,
        dist: 14 + Math.random() * 22, sz: 3 + (Math.random() * 3 | 0),
        c: PAL[Math.random() * PAL.length | 0] });
    }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  // #204(디렉터 정정): 버스트는 PDA 터치 한정 — 플라스틱 단말을 만지는 촉감. 씬/일반 UI엔 안 뜬다.
  //   리스너는 지연 부착(#pda-back은 정적 DOM). 도킹 버튼(dock-pda)도 같은 기기라 포함.
  document.getElementById('pda-back')?.addEventListener('pointerdown', e => burst(e.clientX, e.clientY));
  document.getElementById('dock-pda')?.addEventListener('pointerdown', e => burst(e.clientX, e.clientY));
  return { burst };
})();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a2233, 24, 58);

/* ============================================================
   카메라 (이소메트릭 직교 + 궤도 회전/줌)
============================================================ */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
const camState = {
  yaw: Math.PI / 4, elev: THREE.MathUtils.degToRad(33), dist: 24, zoom: 0.6, targetYaw: Math.PI / 4,
  // #70 클램프 팬: 카메라 타겟의 월드 XZ 오프셋 — 렌더 전용(세이브 미저장, 시뮬 무영향, 로드 시 0).
  //   targetPan → pan 을 yaw 보간과 같은 문법으로 매 프레임 lerp (reduceMotion이면 즉시 스냅).
  panX: 0, panZ: 0, targetPanX: 0, targetPanZ: 0,
};
const camCenter = new THREE.Vector3(0, 0.9, 0);
// #70: 이번 프레임 카메라에 '실제 적용된' 팬(클로즈업 중엔 0) — 컬링 판정이 팬을 되돌려
//   벽/천장/근경소품 마스크가 팬과 무관하게 유지되도록 하는 보정값(아래 updateWallCulling/tickEnv).
const camPanApplied = { x: 0, z: 0 };

// ── 시네마틱 원근 카메라 (스토리 트레일러 전용 — 게임은 텍스트/UI 기반이라 연출 컷을 직접 렌더한다).
//   실제 씬(옥탑·라디오·눈·스카이라인)을 오쏘가 아닌 원근으로 날며 진짜 시네마 무빙(푸시인·달리·룩앳)을 낸다.
//   프로덕션 무해: cam='ortho'면 렌더 경로는 기존 오쏘와 100% 동일(꺼진 채 부팅). __shelter.cine* 로만 켠다.
const cineCam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 400);

/* ── P1 렌더 컨텍스트 (REFACTOR-GUIDE §3-P1: Parameter Object) ──
   흩어져 있던 렌더 모드 플래그(_golden 계열 8개 let + _cine)를 단일 객체로 수렴 — 어떤 함수가
   어떤 모드에 의존하는지 renderCtx 참조로 가시화한다. 단일 인스턴스 재사용(핫패스 할당 회피).
   · frozen / cam 은 직교 2축: 트레일러 캡처가 freeze(keepEntities)+cineOn을 동시에 쓰므로
     'live|golden|cine' 단일 enum은 실체와 어긋난다(가이드의 mode 제안을 실측으로 각색).
   · 외부 API(freezeForGolden/stepGolden/cineOn·cineOff — 골든 러너·트레일러 하네스가 호출)는
     시그니처·거동 불변, 내부 구현만 이 객체를 조작한다. */
const renderCtx = {
  frozen: false,        // 골든 동결(구 _golden): 시드 고정 + dt=0 정지 + 동적 요소 숨김
  cam: 'ortho',         // 'ortho' | 'cine' (구 _cine): renderFrame의 카메라 선택
  dt: 0, t: 0,          // 이번 프레임 확정값 — renderFrame 서두에서 기록(프레임 시간의 SSOT)
  goldenT: 5.0,         // 골든 기준 시각(고정 — 구 _goldenT)
  goldenDt: 0,          // 동역학 스테핑 중에만 >0 (구 _goldenDt)
  goldenAcc: 0,         // 결정론 누적 시간 (구 _goldenAcc)
  keepEntities: false,  // 트레일러: 엔티티 살린 채 고정 dt 스테핑 (구 _goldenKeep)
  seed: 12345,          // LCG 시드 (구 _goldenSeed)
  lcgS: 12345,          // LCG 진행 상태 (구 _goldenS — #212: 언제든 시드로 되감기 가능해야 결정론)
  hidApplied: false,    // once 성 숨김(고양이 despawn)의 1회 적용 플래그 (구 _goldenHid)
};
const isGoldenFrozen = () => renderCtx.frozen; // 산발 게이트용 술어 — 리터럴 플래그 접근 금지, 의미로 읽는다

// ④ 고양이 클로즈업 카메라 — 비배치 모드에서 고양이 탭 시 얼굴로 글라이드. 드래그/ESC/빈곳 탭으로 복원.
//   활성 중엔 카메라 타겟을 고양이(눈높이 살짝 위)로 옮기고 거리/줌/앙각을 클로즈업 프로필로 보간(지연 추적).
const catCam = {
  active: false,
  center: new THREE.Vector3(0, 0.9, 0), // 실제 추적 중심(고양이로 지연 수렴)
  saved: null,                          // 복원용 { yaw, elev, zoom }
  targetYaw: 0,                         // ⑶ 진입 시 1회 확정하는 목표 yaw(짧은 호 ≤45° 클램프). 매 프레임 재계산 안 함.
};
// #181 방문자 클로즈업 상태 — 등장인물로 center 글라이드 + 줌. cur=보간 중심, center=목표(방문자 pos).
const visitorCam = { active: false, returning: false, center: new THREE.Vector3(), cur: new THREE.Vector3(), saved: null, zoomTarget: 0.6, elevTarget: null, distTarget: null };
// ⑶ 클로즈업 진입 회전 최소화: 고양이 facing으로 스냅하지 않고, "현재 카메라 yaw 기준 최소 회전"을 쓴다.
//   후보 = facing+yawOffset 및 facing-yawOffset(좌우 3/4 중 가까운 쪽). 현재 yaw와의 각차를 짧은 호로 접고,
//   ±45°(π/4)로 클램프 → 줌·센터링 위주로 얼굴을 잡되 화면이 홱 돌지 않게 한다.
function shortAngle(a) { let d = a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function computeCatCloseupYaw(facing, curYaw) {
  const off = BAL.catCam.yawOffset;
  const cands = [facing + off, facing - off];
  let best = cands[0], bestAbs = Infinity;
  for (const c of cands) { const d = Math.abs(shortAngle(c - curYaw)); if (d < bestAbs) { bestAbs = d; best = c; } }
  const CLAMP = Math.PI / 4; // ≤45°
  const delta = THREE.MathUtils.clamp(shortAngle(best - curYaw), -CLAMP, CLAMP);
  return curYaw + delta;
}
// 고양이 시스템은 src/systems/cat.js로 분리됐다(엔지니어링 Phase 2). catObj는 그 클로저의 모듈
// 상태라, game.js는 아래 getCat()로만 현재 고양이 인스턴스를 읽는다(catSys는 하단에서 생성).
function getCat() { return catSys.getCat(); }
function enterCatCloseup() {
  const _cat = getCat();
  if (catCam.active || !_cat) return;
  catCam.saved = { yaw: camState.targetYaw, elev: camState.elev, zoom: camState.zoom };
  // #70: 팬 상태에서 진입해도 '지금 보던 중심'에서 출발(진입 프레임 점프 방지) — 클로즈업 중 팬은 미적용.
  catCam.center.set(camCenter.x + camPanApplied.x, camCenter.y, camCenter.z + camPanApplied.z);
  // ⑶ 진입 시점의 현재 카메라 yaw 기준으로 목표 yaw를 1회 확정(짧은 호 ≤45°). 이후엔 이 값으로만 글라이드.
  catCam.targetYaw = computeCatCloseupYaw(_cat.g.rotation.y, camState.yaw);
  catCam.active = true;
}
function exitCatCloseup() {
  if (!catCam.active) return;
  catCam.active = false;
  if (catCam.saved) {
    camState.targetYaw = catCam.saved.yaw;
    camState.zoom = catCam.saved.zoom;
    camState.elev = catCam.saved.elev;
    catCam.saved = null;
  }
}
// #181 방문자 클로즈업 진입/복귀 — catCam과 상호배타(한 번에 하나만). center를 방문자로 글라이드+줌인.
// #208 cam 인자: 프레이밍 노브를 갈아끼워 동물 인카운터(BAL.wildCam)도 같은 카메라를 쓴다 — 사람보다 낮고 타이트.
function enterVisitorCloseup(x, z, y, cam = BAL.visitorCam) {
  if (catCam.active) exitCatCloseup();
  const cy = cam.centerY ?? BAL.visitorCam.centerY;
  if (!visitorCam.active) {
    visitorCam.saved = { zoom: camState.zoom, tpx: camState.targetPanX, tpz: camState.targetPanZ, elev: camState.elev, dist: camState.dist };
    visitorCam.cur.set(camCenter.x + camPanApplied.x, (y || 0) + cy, camCenter.z + camPanApplied.z); // 현재 보던 중심에서 출발(점프 방지)
  }
  visitorCam.center.set(x, (y || 0) + cy, z);
  visitorCam.zoomTarget = cam.zoom ?? BAL.visitorCam.zoom;
  // #208 앙각 프로필(선택): 사람은 선 실루엣이라 기본 아이소 앙각(33°)으로 읽히지만, 네발짐승은 같은 각에서
  //   '등'만 보여 어떤 줌에서도 갈색 덩어리가 된다(실측). catCam이 elevDeg 22로 푼 그 문제 — 값 출처도 거기다.
  visitorCam.elevTarget = cam.elevDeg != null ? THREE.MathUtils.degToRad(cam.elevDeg) : null;
  visitorCam.distTarget = cam.dist != null ? cam.dist : null;
  visitorCam.active = true; visitorCam.returning = false;
}
function exitVisitorCloseup() {
  if (!visitorCam.active) return;
  visitorCam.returning = true;                                   // center를 집으로, 줌을 원래대로 글라이드
  visitorCam.zoomTarget = visitorCam.saved ? visitorCam.saved.zoom : 0.6;
  if (visitorCam.saved) {
    if (visitorCam.elevTarget != null) visitorCam.elevTarget = visitorCam.saved.elev; // 앙각도 원래대로 글라이드
    if (visitorCam.distTarget != null) visitorCam.distTarget = visitorCam.saved.dist;
    setPanTarget(visitorCam.saved.tpx, visitorCam.saved.tpz);
  }
}
// 카메라 업데이트/팬/줌 → render/camera.js (Tier4 Phase1-③). 카메라 객체는 game.js 잔류, 함수만 이동.
const { updateCamera, fitZoomForShelter, panMax, setPanTarget, panByScreenDelta } = makeCamera({
  camera, camState, camCenter, camPanApplied, BAL, opts, getCat, catCam, visitorCam, state,
  getROOM: () => ROOM, getSHELTERS: () => SHELTERS,
});

/* ============================================================
   조명 (환경별로 색/세기 조정)
============================================================ */
const hemi = new THREE.HemisphereLight(0x8a98bd, 0x46403a, 0.7);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0x9db4d8, 0.75);
moon.position.set(-6, 12, -4);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048); // 1024→2048: 그림자 선명도(디렉터: 예쁜 그림자). 데스크톱 데모 기준, 약한 HW는 그래픽 설정에서 하향 여지
moon.shadow.bias = -0.0004; // 소프트섀도 + 고해상 시 표면 아크네 억제
moon.shadow.camera.left = -16; moon.shadow.camera.right = 16;
moon.shadow.camera.top = 16; moon.shadow.camera.bottom = -16;
moon.shadow.camera.far = 60;
scene.add(moon);

// ── 외부 건물 라이트 레이어 (디렉터 2026-07-24 「빛이 뒤로 새는 찐빠」) ────────────
//   지지 건물(펜데스탈)·폐허 골조 등 '차가운 바깥'은 실내 따뜻한 광원(ceilLight·가구 PointLight·
//   설비등)의 영향에서 뺀다. 외부는 태양·달·반구광만 받아야 을씨년스러운 도시로 읽힌다.
//   메커니즘: 외부 메시를 EXTERIOR_LAYER 하나에만 두면(userData.exterior→loadShelter가 적용),
//   이 레이어를 함께 켠 카메라·전역광만 그 메시를 렌더/조명하고, 기본 레이어의 실내광은 못 닿는다.
const EXTERIOR_LAYER = 2;
camera.layers.enable(EXTERIOR_LAYER);
cineCam.layers.enable(EXTERIOR_LAYER);
hemi.layers.enable(EXTERIOR_LAYER);
moon.layers.enable(EXTERIOR_LAYER);
// 폐허 건물이 밤에 새까맣게 죽지 않고 '차가운 회색 콘크리트'로 읽히게 하는 처리는 씬 광원 추가가 아니라
//   재질 emissive(회색 바닥값)로 한다 — 씬에 반구/방향광을 더하면 전 MeshPhong 셰이더의 광원 수 define이
//   바뀌어(레이어 격리로 기여는 0이어도) SwiftShader FP 순서가 흔들리고, 픽셀화 양자화가 이를 증폭해
//   전 골든이 흔들린다(실측: 광원 2개 추가 → 17씬 20~50% diff). emissive는 재질별이라 전역 무영향.
// 씬 그룹에서 userData.exterior로 표시된 메시를 외부 레이어로 옮긴다(셸터 빌드 후 호출).
function applyExteriorLayers(root) {
  root.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine) && o.userData && o.userData.exterior) o.layers.set(EXTERIOR_LAYER); });
}

// Lighting Update P1 (#189 §1, 디렉터 2026-07-15 스펙 착지): 기본 상태 = 어둠.
//   ceilLight는 이제 「무광원 폴백」— 광원(가구 광원·화기·조명 설비)이 하나도 없을 때만 켜지는
//   죽은 형광등(밝기 10·냉백·점멸). 빛은 거저 주어지지 않고 양초/화기/설비로 쟁취한다.
//   (전신: 2026-07-15 하향 29→11 + 점멸, 커밋 73dd597 — 그 값을 조건부 폴백으로 재정의)
const ceilLight = new THREE.PointLight(0xcfe0e8, 10, 16, 1.6);
ceilLight.castShadow = true;
ceilLight.shadow.mapSize.set(512, 512);
scene.add(ceilLight);
let ceilBaseInt = 10; // 렌더 루프 점멸이 곱하는 기준값(매 프레임 updateLightingRig가 갱신)
// #189 §2 조명 설비(개조) 전등 — 따뜻하고 안정적인 전기 조명. 점멸 없음(화기와의 대비축).
const facilityLight = new THREE.PointLight(0xffd9a0, 0, 20, 1.7);
scene.add(facilityLight);
let lightingFixture = null; // 천장 펜던트 소품(설치 시 loadShelter가 재생성)
// 실내에 살아 있는 광원이 하나라도 있는가 — 가구 광원(난로·랜턴·양초·스탠드…) 또는 급전 중인 조명 설비.
function interiorLightActive() {
  // #195: selfLit(네온 — build() 내장 PointLight)도 실광원 — 네온만 켜진 방 위에서 죽은 형광등이 점멸하던 이음매
  if (items.some(it => (DEFS[it.defId].light || DEFS[it.defId].selfLit) && it.on !== false)) return true;
  return lightingFacilityOn();
}
function lightingFacilityOn() { return hasMod('lighting') && !state.lightingOut && !(state.lightOff && state.lightOff[state.current]); } // 수동 off(조명 클릭 토글, 디렉터 2026-07-24) 반영
// 폴백/설비 광원 동기화 — 렌더 루프·로드 시 호출(전원 토글·연료 소진·설치를 전부 자동 반영).
// 디렉터 정정(2026-07-17): 폴백 천장광은 광원이 켜져도 끄지 않는다 — "기본 안 밝은 조명 + 광원 밝기 가산".
//   (구 #189 P1은 광원 존재 시 폴백 0의 이분법 — 촛불을 켜면 방이 되레 어두워지던 역설을 낳았다.)
function updateLightingRig() {
  ceilBaseInt = (state.current === 'subway' && state.subwayHidden) ? 2 : 10;
  const on = lightingFacilityOn();
  facilityLight.intensity = on ? 16 : 0;
  if (lightingFixture) { // 펜던트 전구·바닥 광원 풀도 on/off 반영 (디렉터: 조명 클릭 켜고 끄기)
    const b = lightingFixture.userData.bulb, p = lightingFixture.userData.pool;
    if (b && b.material) b.material.emissiveIntensity = on ? 1.1 : 0.0;
    if (p && p.material) p.material.opacity = on ? 0.12 : 0.0;
  }
}

// 절차적 표면 텍스처(makeCanvasTex + 바닥/벽/금속/합판/벽돌/타일/콘크리트 7종) → render/textures.js 이관 (Tier4)

/* ============================================================
   꾸미기 확장 (#13 REQ-DECO-01) — 벽지 6종 / 바닥재 6종
   makeCanvasTex 절차 텍스처. 셸터 지오메트리는 불변 — loadShelter가
   벽/바닥 재질의 .map만 교체(applyDeco). id 'default'는 셸터 원본 유지.
   ARC-01: 콘텐츠 테이블. 신규 벽지/바닥은 여기 항목 추가만으로 늘어난다.
============================================================ */
// 벽지 6종(WALLPAPERS) / 바닥재 6종(FLOORINGS)은 src/data/decotex.js로 분리(콘텐츠 분리 Phase 2).
// tex 클로저가 game.js의 makeCanvasTex(THREE·document 결합)를 참조하므로 팩토리 makeDecoTex(ctx)에
// 주입해 생성한다(원본과 동작 동일). seededRand는 decotex 내부에서 helpers를 직접 import한다.
const { WALLPAPERS, FLOORINGS } = makeDecoTex({ makeCanvasTex });
// 테마 세트(#13): 지정 가구가 모두 배치되면 분위기 축 쾌적 +N. 판정은 선언적 테이블(ARC-01).
const DECO_THEME_COMFORT = BAL.deco.themeSetComfort;
// themeSetActive/activeThemeSets → core/comfort.js (import). 순수 판정(items + THEME_SETS).
// 텍스처 캐시 (재빌드마다 새 CanvasTexture를 만들지 않도록 lazy 캐시)
const _decoTexCache = {};
function decoTex(kind, id) {
  const table = kind === 'wall' ? WALLPAPERS : FLOORINGS;
  const def = table[id];
  if (!def || !def.tex) return null;
  const key = kind + ':' + id;
  if (!_decoTexCache[key]) _decoTexCache[key] = def.tex();
  return _decoTexCache[key];
}

/* ============================================================
   낡은 종이 텍스처 (생존 수첩 / 찢어진 쪽지용)
   — 추후 AI 생성 텍스처로 교체될 수 있어 함수 하나로 격리해둔다.
============================================================ */
function makePaperTexture(w = 512, h = 640) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  const rand = seededRand(Math.floor(Math.random() * 1e9));
  // 바탕: 베이지-누런 색 계열, 약간의 얼룩덜룩한 변주
  g.fillStyle = '#d8cbaa'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = rand() * w, y = rand() * h, r = 30 + rand() * 90;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() > 0.5 ? '210,196,160' : '196,178,138';
    grad.addColorStop(0, `rgba(${tone},${(0.05 + rand() * 0.08).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }
  // 얼룩 / 그을음 자국 — 가장자리로 갈수록 짙어지는 비네트
  for (let i = 0; i < 16; i++) {
    const x = rand() * w, y = rand() * h, r = 14 + rand() * 46;
    const edge = Math.min(x, w - x, y, h - y) / Math.min(w, h);
    const dark = rand() > 0.6;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const alpha = (0.10 + rand() * 0.16) * (1 - edge * 0.4);
    grad.addColorStop(0, dark ? `rgba(70,52,30,${alpha.toFixed(3)})` : `rgba(120,95,55,${(alpha * 0.7).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  }
  // 비네트: 가장자리를 어둡게
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(40,30,18,0.38)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  // 접힌 자국: 밝고 어두운 대각 줄무늬 몇 개
  g.save();
  g.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 4; i++) {
    const x0 = rand() * w, y0 = 0, x1 = x0 + (rand() - 0.5) * 140, y1 = h;
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    const light = i % 2 === 0;
    grad.addColorStop(0.48, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, light ? 'rgba(255,250,230,0.35)' : 'rgba(40,30,18,0.3)');
    grad.addColorStop(0.52, 'rgba(0,0,0,0)');
    g.strokeStyle = grad;
    g.lineWidth = 3 + rand() * 4;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
  // 미세한 노이즈 그레인
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = w; grainCanvas.height = h;
  const gg = grainCanvas.getContext('2d');
  const imgData = gg.createImageData(w, h);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = 128 + (rand() - 0.5) * 40;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = n;
    imgData.data[i + 3] = 14;
  }
  gg.putImageData(imgData, 0, 0);
  g.drawImage(grainCanvas, 0, 0);
  return cv.toDataURL();
}

function disposeDeep(root) {
  root.traverse(o => {
    if (o.isMesh || o.isPoints) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      // ① 컬링 페이드용 그룹별 재질 클론(perGroupClone)은 map이 있어도 이 그룹 전용이라 해제한다.
      for (const m of mats) if (!m.userData.shared && (!m.map || m.userData.perGroupClone)) m.dispose();
    }
  });
}

/* ============================================================
   환경 공통 요소 (하늘 돔 / 별 / 달) — 셸터별로 색만 바꿈
============================================================ */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    cHorizon: { value: new THREE.Color(0x1a2233) },
    cZenith: { value: new THREE.Color(0x0a0f1a) },
  },
  vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying float vY; uniform vec3 cHorizon, cZenith;
    void main(){ gl_FragColor = vec4(mix(cHorizon, cZenith, smoothstep(-5.0, 60.0, vY)), 1.0); }`,
});
skyMat.userData.shared = true;
scene.add(new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), skyMat));

const stars = (() => {
  const geo = new THREE.BufferGeometry();
  const pos = [];
  const srand = seededRand(2026);
  for (let i = 0; i < 350; i++) {
    const a = srand() * Math.PI * 2, e = Math.asin(srand() * 0.92 + 0.06);
    pos.push(120 * Math.cos(e) * Math.cos(a), 120 * Math.sin(e), 120 * Math.cos(e) * Math.sin(a));
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xcfe0f5, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85,
  }));
  scene.add(p); return p;
})();
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xcdd8ea, fog: false })); // 창백한 차가운 달 (붉은 원 신고 대응)
moonMesh.position.copy(moon.position.clone().normalize().multiplyScalar(115));
const moonBasePos = moonMesh.position.clone(); // mood.moonPos 미지정 시 복원용 기본 방위
scene.add(moonMesh);

// 2.0 동부 밤하늘 확장 (디렉터: "다리에서 별이 수놓이고 은하수까지, 달도 크게") — mood 플래그로만 발동.
//   milkyway: 기울어진 대원 밴드를 따라 촘촘한 미광 성점 900 + 성운 미광 스프라이트 3점.
//   moonScale: 달 메시 스케일 배수. 플래그 없는 셸터는 기존과 픽셀 동일(골든 무접점).
const milkyway = (() => {
  const g2 = new THREE.Group();
  const srand = seededRand(4207);
  const pos = [];
  for (let i = 0; i < 900; i++) {
    const a = srand() * Math.PI * 2;
    const spread = (srand() + srand() + srand() - 1.5) * 0.16; // 근사 가우시안 산포(밴드 두께)
    const e = spread + 0.35 * Math.sin(a * 0.5);               // 완만히 휘는 밴드
    const v = new THREE.Vector3(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)).multiplyScalar(118);
    v.applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.96);        // 55도 기울임
    if (v.y < 6) continue;                                     // 지평선 아래 제외
    pos.push(v.x, v.y, v.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g2.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.9, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.72 })));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c2 = cv.getContext('2d');
  const rg = c2.createRadialGradient(32, 32, 2, 32, 32, 31);
  rg.addColorStop(0, 'rgba(190,205,255,0.5)'); rg.addColorStop(1, 'rgba(190,205,255,0)');
  c2.fillStyle = rg; c2.fillRect(0, 0, 64, 64);
  const nebTex = new THREE.CanvasTexture(cv);
  for (const [nx, ny, nz, s] of [[-40, 70, -70, 46], [20, 90, -50, 60], [60, 60, 40, 40]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 }));
    sp.scale.set(s, s * 0.55, 1); sp.position.set(nx, ny, nz); g2.add(sp);
  }
  g2.visible = false;
  scene.add(g2); return g2;
})();
function updateMilkyway() {
  milkyway.visible = !!currentMood.milkyway && stars.material.opacity > 0.05;
  if (!milkyway.visible) return;
  const k = Math.min(1, stars.material.opacity);
  milkyway.children[0].material.opacity = 0.72 * k;
  for (let i = 1; i < milkyway.children.length; i++) milkyway.children[i].material.opacity = 0.5 * k;
}

let currentMood = { stars: 0.85 };
function applyMood(m) {
  currentMood = m;
  scene.fog.color.setHex(m.fog); scene.fog.near = m.fogNear; scene.fog.far = m.fogFar;
  skyMat.uniforms.cHorizon.value.setHex(m.skyH);
  skyMat.uniforms.cZenith.value.setHex(m.skyZ);
  hemi.color.setHex(m.hemiSky); hemi.groundColor.setHex(m.hemiGround); hemi.intensity = m.hemiInt;
  moon.color.setHex(m.moonC); moon.intensity = m.moonInt;
  stars.material.opacity = m.stars;
  moonMesh.visible = m.moonVisible !== false;
  moonMesh.scale.setScalar(m.moonScale || 1); // 동부 밤하늘: 큰 달 (기본 1 — 기존 셸터 불변)
  if (m.moonPos) moonMesh.position.set(m.moonPos[0], m.moonPos[1], m.moonPos[2]).normalize().multiplyScalar(115); else moonMesh.position.copy(moonBasePos); // 달 방위 지정(다리: 협곡 위 하늘)
  updateMilkyway();
}

/* ============================================================
   시간대 시스템 (아침~밤~새벽, 하늘/조명이 실시간으로 변함)
============================================================ */
// 24h 하늘 팔레트(DAY_PHASES)·하루 리듬(DAY_KEYS)은 render/timelight.js로 이관(D1 상환) —
//   항공 디오라마 커브와 병치·계약. 값은 원본 그대로다. 밤은 셸터 고유 무드(currentMood)가 대체(phaseValues).
function phaseValues(name) {
  if (name !== 'night') return DAY_PHASES[name];
  const m = currentMood;
  return { fog: m.fog, skyH: m.skyH, skyZ: m.skyZ, sunC: m.moonC, sunInt: m.moonInt, hemiC: m.hemiSky, hemiG: m.hemiGround, hemiInt: m.hemiInt, stars: m.stars };
}
const _tc = { a: new THREE.Color(), b: new THREE.Color() };
const _wetSpec = new THREE.Color(); // applyWetness()의 젖은 벽 specular 램프용 임시 컬러
function lerpHex(h1, h2, f, target) {
  _tc.a.setHex(h1); _tc.b.setHex(h2);
  return target.copy(_tc.a).lerp(_tc.b, f);
}
let dayness = 0;
// 창문 하늘판 재질 — 낮/밤/날씨 따라 밝기 갱신 (loadShelter마다 재수집)
const winSkyMats = [];
// 쨍한 낮 전용 창가 빛기둥/먼지 (loadShelter마다 재수집, updateSunShafts가 투명도 구동)
const sunShafts = [];
const sunMotes = [];
// ③ 한파 실내 침투(GD-THESIS L2): 무방비 한파 시 창유리 안쪽에 성에 오버레이. loadShelter마다 재수집.
//   updateEnvironment가 coldSnapNetSeverity로 목표 투명도를 구하고 서서히 페이드(종료 시 서서히 사라짐).
const winFrostMats = [];
// #229 벽 컬링 페이드 동조 (디렉터 신고: "창문이 아닌데 한낮의 햇살 광원/텍스처가 들어온다"):
//   cullFadeSkip 재질(빛기둥·착지광·먼지·창하늘 사각·성에)은 컬링의 페이드 재질 수집에서 제외되므로
//   (외부 추적·클론 금지), 벽이 녹는 175ms 동안 전광으로 허공에 남고 페이드 인에선 벽보다 먼저 팝인한다.
//   특히 창하늘은 불투명한 밝은 사각이라 정오엔 정확히 "창 없는 햇살 텍스처"로 보인다.
//   해법: 각 구동부(updateSunShafts/updateWindowSkies/성에)가 소속 벽 그룹의 fade를 직접 곱한다.
function wallCullFade(ud) {
  const g = ud.wallG;
  if (!g) return 1;
  if (!g.visible) return 0;
  const cs = g.userData.cull;
  return cs ? cs.fade : 1;
}
function updateSunShafts() {
  if (!sunShafts.length && !sunMotes.length) return;
  const s = (weather.type === 'clear' && !opts.lowSpec) ? dayness : 0;
  for (const b of sunShafts) { const wf = wallCullFade(b.userData); b.material.opacity = 0.26 * s * (b.userData.opMul ?? 1) * wf; b.visible = s > 0.02 && wf > 0.01; }
  for (const p of sunMotes) { const wf = wallCullFade(p.userData); p.material.opacity = 0.55 * s * wf; p.visible = s > 0.02 && wf > 0.01; }
}
function updateWindowSkies() {
  if (!winSkyMats.length) return;
  const dark = weather.type === 'rain' || weather.type === 'storm' ? 0.35
    : weather.type === 'snow' ? 0.7 : weather.type === 'ash' ? 0.55 : 1;
  // #161 계절 팔레트: 창밖 하늘도 계절을 따른다 — 봄 청록기/여름 맑은 하늘색/가을 노란기/겨울 창백.
  //   눈/폭풍이면 캘린더 무관 겨울 하늘 — 눈은 계절과 상관없이 겨울 정서(데모 첫눈 climax 정합, 2026-07-11).
  const _skySeason = (weather.type === 'snow' || weather.type === 'storm') ? 'winter' : seasonOf().id;
  const seasonSky = { spring: 0xd2e6e2, summer: 0xd8ecf4, autumn: 0xe6d9c2, winter: 0xdde4ec }[_skySeason] || 0xcfe0ee;
  _tc.a.setHex(seasonSky); // 맑은 낮 하늘 (계절 변주)
  for (const m of winSkyMats) {
    _tc.b.setHex(m.userData.baseHex);
    m.color.copy(_tc.b).lerp(_tc.a, dayness * dark);
    // #229: 하늘판(불투명)이 벽 페이드 중 허공에 떠 보이던 본체 — 벽 fade에 맞춰 투명화, 완료 시 원복
    const wf = wallCullFade(m.userData);
    if (wf < 0.999) { m.transparent = true; m.opacity = wf; m.depthWrite = false; }
    else if (m.transparent) { m.transparent = false; m.opacity = 1; m.depthWrite = true; }
  }
}
function gameHour() { return (state.gameMin % 1440) / 60; }
const SUN_FIXED = new THREE.Vector3(-6, 12, -4); // 실내(지하) 고정 태양 방위 — 오르빗 미적용
// 디렉터(2026-07-19 "실제 세상처럼"): 해가 동에서 떠 서로 진다 → 지향광(=그림자)이 하루 종일 회전.
//   단일 지향광(moon)을 24h 대원 궤도로 굴린다: 6h=동 지평, 12h=정점, 18h=서 지평, 자정=지하(→ 저고도 클램프=달빛).
//   연속 궤도(A=2π(h-6)/24)라 낮↔밤 경계에서 방위가 튀지 않는다. 천체 디스크도 같은 방위.
function updateSunArc() {
  const h = gameHour();
  const A = 2 * Math.PI * (h - 6) / 24;            // 6h→0(동), 12h→π/2(정점), 18h→π(서), 0h→3π/2(지하)
  const R = 11, PEAK = 12, MINY = 3.6;             // 수평 반경 / 정점 고도 / 지평 최소 고도(그림자 과신장·달빛 하한)
  const x = Math.cos(A) * R;                       // +동 → -서
  const y = Math.max(MINY, Math.sin(A) * PEAK + MINY * 0.35); // 밤엔 지평 아래를 저고도로 클램프
  moon.position.set(x, y, -3.5);
  moon.target.updateMatrixWorld();
  if (moonMesh) moonMesh.position.copy(moon.position).normalize().multiplyScalar(115); // 해/달 디스크 방위 정합
}
function applyTimeLighting() {
  // 지하 셸터: 시간대와 무관하게 고유 무드 고정 (태양 오르빗도 미적용 — 고정 방위 유지)
  if (SHELTERS[state.current]?.indoor) {
    moon.position.copy(SUN_FIXED);
    const A = phaseValues('night');
    scene.fog.color.setHex(A.fog);
    skyMat.uniforms.cHorizon.value.setHex(A.skyH);
    skyMat.uniforms.cZenith.value.setHex(A.skyZ);
    moon.color.setHex(A.sunC); moon.intensity = A.sunInt;
    hemi.color.setHex(A.hemiC); hemi.groundColor.setHex(A.hemiG); hemi.intensity = A.hemiInt;
    // §9.6 「침묵」: 통로 발견 후의 지하철은 버려진 역 — 무드 광량을 확 줄인다(디렉터 확정).
    //   남는 지배광 = 붉은 비상등 점광 2개(승강장·터널). 일반 지하철(!subwayHidden)은 불변 — 골든 보존.
    if (state.current === 'subway' && state.subwayHidden) {
      hemi.intensity = A.hemiInt * 0.3;
      moon.intensity = A.sunInt * 0.4;
    }
    stars.material.opacity = 0;
    dayness = 0;
    moonMesh.visible = false;
    updateSunShafts(); // 지하: dayness=0 → 빛기둥 소등
    return;
  }
  updateSunArc(); // 실외: 해가 동→서로 이동 (그림자 방향 회전)
  const h = gameHour();
  let i = 0;
  while (i < DAY_KEYS.length - 1 && DAY_KEYS[i + 1][0] <= h) i++;
  const [h0, k0] = DAY_KEYS[i], [h1, k1] = DAY_KEYS[Math.min(i + 1, DAY_KEYS.length - 1)];
  const f = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
  const A = phaseValues(k0), B = phaseValues(k1);
  lerpHex(A.fog, B.fog, f, scene.fog.color);
  lerpHex(A.skyH, B.skyH, f, skyMat.uniforms.cHorizon.value);
  lerpHex(A.skyZ, B.skyZ, f, skyMat.uniforms.cZenith.value);
  lerpHex(A.sunC, B.sunC, f, moon.color);
  moon.intensity = A.sunInt + (B.sunInt - A.sunInt) * f;
  lerpHex(A.hemiC, B.hemiC, f, hemi.color);
  lerpHex(A.hemiG, B.hemiG, f, hemi.groundColor);
  hemi.intensity = A.hemiInt + (B.hemiInt - A.hemiInt) * f;
  const starsBase = A.stars + (B.stars - A.stars) * f;
  stars.material.opacity = starsBase * (weather.type === 'clear' ? 1 : 0.25);
  updateMilkyway(); // 은하수는 별 불투명도를 따라 뜨고 진다 (milkyway 무드 셸터 한정)
  dayness = THREE.MathUtils.clamp((hemi.intensity - 0.7) / 0.35, 0, 1);
  // #54: 지역(지구)별 무드 틴트 — 어디에 있는지가 색으로 읽히게. 낮에만 은은하게(18%×dayness).
  // 외곽=갈색 헤이즈 / 도심=차가운 회청 / 초원=옅은 초록기 / 숲=짙은 초록 / 해안=푸른 습기
  // 2.0-(d): 동부 4구역 = 붉은 노을 팔레트(아트 디렉션 정본) — 관문이 가장 붉고 심부로 갈수록 자줏빛으로 식는다
  const _dt = { outskirts: 0x9a8368, city: 0x7e8ea6, meadow: 0x93a67e, forest: 0x7a9678, coast: 0x7e9aac,
    eastgate: 0xa8604a, eastbridge: 0x9e5a52, eaststation: 0x94585a, eastcore: 0x8a545e }[districtOf(state.current)];
  if (_dt && dayness > 0.01) {
    scene.fog.color.lerp(_tc.b.setHex(_dt), 0.18 * dayness);
    hemi.color.lerp(_tc.b, 0.10 * dayness);
  }
  // #161 계절 팔레트: 계절이 대기의 색으로 읽히게 — 지역 틴트(#54)와 같은 문법, 그보다 옅게.
  //   봄=풋내 나는 초록기 / 여름=쨍한 백금색 / 가을=금빛 마른 잎 / 겨울=차가운 청회색.
  //   지평선(cHorizon)에도 같은 톤을 얹어 하늘부터 계절이 다르다 — 낮에만(dayness 가중), 급변 없음(lerp).
  //   눈/폭풍이면 캘린더 무관 겨울 틴트 — 눈은 계절과 상관없이 겨울 정서(데모 첫눈 climax 정합, 2026-07-11).
  const _stKey = (weather.type === 'snow' || weather.type === 'storm') ? 'winter' : seasonOf().id;
  const _st = { spring: 0x9db48a, summer: 0xd9d2b8, autumn: 0xc9a06a, winter: 0x8fa3b8 }[_stKey];
  if (_st && dayness > 0.01) {
    scene.fog.color.lerp(_tc.b.setHex(_st), 0.12 * dayness);
    hemi.color.lerp(_tc.b, 0.08 * dayness);
    skyMat.uniforms.cHorizon.value.lerp(_tc.b, 0.10 * dayness);
  }
  // 날씨 광량 대비: 맑은 날은 쨍하게(+6%), 궂은 날은 태양광을 깎는다 — 낮에만 체감(dayness 가중)
  const wSunTab = { clear: 1.06, snow: 0.8, rain: 0.55, ash: 0.62, storm: 0.42 };
  let wSun = wSunTab[weather.type] ?? 1;
  // 날씨 전이(#83): 광량이 파티클보다 앞서 서서히 흐려지고/개인다 — 급변 금지
  if (weather.transPrev != null) { const a = wSunTab[weather.transPrev] ?? 1; wSun = a + (wSun - a) * Math.min(1, weather.transK * 1.4); }
  moon.intensity *= 1 + (wSun - 1) * dayness;
  hemi.intensity *= 1 + (wSun - 1) * 0.45 * dayness;
  // 달: 밤/여명에만 노출. 낮(7~18h)엔 dayness 계산과 무관하게 절대 숨긴다 (실기기 신고: 낮 하늘의 붉은 원).
  // 색은 창백한 차가운 톤(0x9db4d8 계열)으로 고정 — 붉은 여명 하늘과 대비되도록.
  // ⑥-d: 실내 셸터(지하철 등 — 사방·천장이 막혀 하늘이 안 보이는 지오메트리)에선 시간대 무관하게 천체(달/별) 전부 숨김.
  //   벙커는 돔 외피에 개구부가 있어 하늘이 보이는 구조라 indoor=false → 유지. 판정 근거: SHELTERS[*].indoor.
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  moonMesh.visible = !indoorSh && dayness < 0.35 && (h < 7 || h >= 18);
  if (indoorSh) stars.material.opacity = 0; // 실내: 별도 숨김(위 starsBase 계산 무시)
  updateWindowSkies();
  updateSunShafts();
  updateGrade();
}
// 퀄업 A2: 시각 → 그레이딩 노브 공급 (uGrade=0이면 무비용 스킵). 밤·노을·여명만 — 주간은 항등.
//   밤 = 한랭 청색 리프트+게인(공기가 식는다) · 노을 18.2h±1.6 = 앰버 게인 · 여명 6.5h±1.2 = 절반 세기.
//   지하(subway)는 dayness 상시 0이라 밤 그레이드가 상시 깔린다 — 지하 정서와 정합(의도 승인 대상).
function updateGrade() {
  if (postMat.uniforms.uGrade.value <= 0) return;
  const h = gameHour();
  const sunsetK = Math.max(0, 1 - Math.abs(h - 18.2) / 1.6) + Math.max(0, 1 - Math.abs(h - 6.5) / 1.2) * 0.5;
  const nightK = 1 - dayness;
  postMat.uniforms.uGradeLift.value.set(0.004 * nightK, 0.008 * nightK, 0.024 * nightK);
  postMat.uniforms.uGradeGain.value.set(
    1 + 0.10 * sunsetK - 0.05 * nightK,
    1 + 0.02 * sunsetK - 0.02 * nightK,
    1 - 0.06 * sunsetK + 0.06 * nightK);
}
// A2 시안 노브 — QA 전용(기본 0=항등). 디렉터 톤 판정 후 opts·설정창 편입.
function setGrade(k) { postMat.uniforms.uGrade.value = Math.max(0, +k || 0); updateGrade(); }
function timeLabel() { // [2]=아트 아이콘 키(#199 이모지 스윕) — 기존 [0][1] 사용처 무영향
  const h = gameHour(); // #213: [0] 이모지 슬롯은 폐기(빈 문자열) — 사용처 0 확인, 아트 아이콘 키([2])가 정본
  if (h < 4.5) return ['', t('time.night'), 'icon_time_night'];
  if (h < 7) return ['', t('time.dawn'), 'icon_time_dawn'];
  if (h < 11) return ['', t('time.morning'), 'icon_time_dawn'];
  if (h < 16.5) return ['', t('time.day'), 'icon_time_day'];
  if (h < 19) return ['', t('time.evening'), 'icon_time_dusk'];
  if (h < 21) return ['', t('time.dusk'), 'icon_time_dusk'];
  return ['', t('time.night'), 'icon_time_night'];
}

/* ============================================================
   계절 (기획서: 4계절 순환 — 12게임일 = 1계절)
============================================================ */
// 계절 달력(SEASONS/SEASON_DAYS/seasonOf/seasonDay/seasonIndex)은 core/season.js로 이전 (분해 Phase 1). 아래 import 참조.
/* ── Nine Winters(#11): 겨울 스냅샷 — 겨울에 들어서는 날 이번 겨울의 시작값을 기록해 둔다.
   memoir는 봄으로 넘어가는 날 이 스냅샷과의 차분으로 "그 해 겨울"을 요약한다.
   winterSnap.acc = 겨울 동안 누적되는 서사 통계 (한파/방어/연료). exp 성공은 lifetime stats.success 차분으로. */
function beginWinterSnapshot() {
  state.winterSnap = {
    day: state.day,                        // 겨울 첫날
    successStart: state.stats?.success || 0, // lifetime 탐험 성공 (차분용)
    acc: { coldSnaps: 0, defended: 0, fuel: 0, injuries: 0, lastInjury: null }, // 겨울 중 누적 (§9.4-④: 부상 통계 포함)
  };
}
// 겨울 중 연료 소모 집계 (winterSnap.acc.fuel) — resConsume('fuel') 경로에서 호출
// accWinterFuel + 자원 연산(resAdd/resConsume/resHasAll/resConsumeAll/hasAnyFood/consumeAnyFood)은 core/economy.js로 이전. import 참조.
/* ── 한파 (cold snap) — 겨울 보스 이벤트 (Phase B) ── */
// coldDefenseLevel/coldSnapActive/coldSnapNetSeverity → core/coldsnap.js (import). 순수 술어(hearth는 SHELTER_META에서).
// 계절이 날씨 풀을 편향시킨다
// seasonAdjustPool → core/season.js 이관 (Tier3, 순수 — seasonOf/seasonDay만 의존)

/* ============================================================
   동적 날씨 (기획서: 날씨가 게임플레이에 직접 영향)
============================================================ */
// WEATHERS → data/world.js 이관 (#73 Tier4 — 순수 데이터, #114 l10n 합류). 파티클 생성·weather 상태는 렌더 결합이라 잔류.
const weather = { type: 'clear', nextChange: 0, pts: null, seedY: [], seedS: [] };
setComfortWeather(() => weather.type); // core/comfort에 현재 날씨 타입 주입 (weather는 렌더 결합이라 game.js 잔류)
setComfortFacilityLight(() => lightingFacilityOn()); // #193: 조명 설비 급전 상태 주입 — 지하철 needsLight가 전등을 본다
setExpeditionWeather(() => WEATHERS[weather.type].penalty || 0); // core/expedition에 날씨 페널티 주입 (rateParts용)
setRegionsWeather(() => weather.type); // core/regions에 날씨 타입 주입 (blizzardBlocks 눈 판정용)
// #193: 자동 진행 회피 술어 주입 — ①눈사태 봉쇄/예보 당일(수동 선택 모달 전용) ②하드+ 도심 적대(자동엔 금지 구역 취급)
setRegionsAutoAvoid((id) => avalancheBlocks(id) || avalancheForecastToday(id) || (id === 'citycore' && isHard()));
{
  const MAXN = 2200, SPAN = 23, TOP = 17;
  const arr = new Float32Array(MAXN * 3);
  const wrand = seededRand(4242);
  for (let i = 0; i < MAXN; i++) {
    arr.set([(wrand() * 2 - 1) * SPAN, wrand() * TOP, (wrand() * 2 - 1) * SPAN], i * 3);
    weather.seedY.push(0.7 + wrand() * 0.6);
    weather.seedS.push(wrand() * Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  weather.pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.75,
  }));
  weather.pts.visible = false;
  weather.SPAN = SPAN; weather.TOP = TOP;
  scene.add(weather.pts);
}
// 아늑한 실내 먼지 모트 (조명 빛줄기 속을 떠다니는 입자 — cozy)
const dust = (() => {
  const n = 36;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffe2b8, size: 1.6, sizeAttenuation: false,
    transparent: true, opacity: 0.3, fog: false, depthWrite: false,
  }));
  scene.add(p);
  return { pts: p, phase: [...Array(n)].map((_, i) => i * 0.61) };
})();
function scatterDust() {
  const p = dust.pts.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i,
      (Math.random() * 2 - 1) * (ROOM.w / 2 - 0.4),
      0.4 + Math.random() * Math.max(0.8, ROOM.h * 0.75),
      (Math.random() * 2 - 1) * (ROOM.d / 2 - 0.4));
  }
  p.needsUpdate = true;
}

function setWeather(type) {
  weather.type = type;
  state.weatherType = type;
  const W = WEATHERS[type];
  if (!W.count) {
    weather.pts.visible = false;
  } else {
    weather.pts.visible = true;
    weather.pts.material.color.setHex(W.color);
    weather.pts.material.size = W.size;
    weather.pts.geometry.setDrawRange(0, weatherDrawCount(type));
  }
  updateHud();
  if (!state.exp) renderExpPanel();
  // 찢어진 쪽지: 첫 비/눈 (부팅·타이틀 중 발화 방지 — 실제 플레이 중에만)
  if (gameStarted && (type === 'rain' || type === 'storm')) tipOnce('tip.rain');
  if (gameStarted && type === 'snow') tipOnce('tip.snow');
}
/* ── 날씨 전이 (#83 디렉터 오더, Fable 직접): 급변 금지 ──
   원칙: 게임 판정(state.weatherType/HUD/페널티)은 기존대로 즉시 전환 — 밸런스 모호 구간을 만들지 않는다.
   시각(파티클 밀도·색·광량)과 청각(앰비언스 페이드)만 램프를 탄다.
   2상 램프: 전반(k<0.5) 이전 날씨가 잦아듦 → 후반 새 날씨가 차오름. 완료 시 비 갠 낮이면 새소리 원샷. */
const WEATHER_TRANS_MIN = 45;   // 전이 길이(게임분) ≈ 실시간 30초 — 감각 튜닝 값
const WEATHER_AMB_FADE = 8;     // 앰비언스 페이드(실초) — 루프 뚝 시작("이상한 소리") 원천 제거
function transitionWeather(next) {
  const prev = weather.type;
  setWeather(next);                       // 판정/HUD 즉시 (기존 경로 그대로)
  if (next === prev || !gameStarted) return; // 동일 날씨/부팅 중엔 램프 불필요
  weather.transPrev = prev;
  weather.transStart = state.gameMin;
  weather.transK = 0;
  // 전이 시작 시점의 시각 상태는 "이전 날씨 풀 밀도"에서 출발
  const from = WEATHERS[prev];
  if (from.count) {
    weather.pts.visible = true;
    weather.pts.material.color.setHex(from.color); weather.pts.material.size = from.size;
    weather.pts.geometry.setDrawRange(0, weatherDrawCount(prev));
  } else {
    weather.pts.visible = false;
  }
  weather.transBirds = (prev === 'rain' || prev === 'storm') && next === 'clear';
}
function rollWeather() {
  const pool = seasonAdjustPool(SHELTERS[state.current].weatherPool || ['clear']);
  let next = pool[Math.floor(Math.random() * pool.length)];
  // 비가 뽑히면 25% 확률로 폭우(storm)로 승격 (seasonAdjustPool의 풀에는 넣지 않음)
  if (next === 'rain' && Math.random() < 0.25) next = 'storm';
  if (next !== weather.type) { const wn = LName(WEATHERS[next]); state.dayLog.notes.push(t('weather.changed', { name: wn, josa: josa(wn, '으로/로') })); }
  transitionWeather(next);
  // 날씨는 하루~이틀 유지 (기획: 리얼타임 감각)
  state.weatherUntil = state.gameMin + 1440 + Math.random() * 1440;
}
function ensureWeather() {
  const pool = SHELTERS[state.current].weatherPool || ['clear'];
  // storm은 rain의 승격 상태이므로 rain을 다루는 셸터라면 유효한 날씨로 취급
  const valid = pool.includes(state.weatherType) || (state.weatherType === 'storm' && pool.includes('rain'));
  if (state.weatherUntil > state.gameMin && valid) setWeather(state.weatherType);
  else rollWeather();
}
function updateWeather(dt, t) {
  if (state.gameMin > state.weatherUntil) rollWeather();
  // ── 전이 램프(#83): 전반 = 이전 날씨 밀도 감소, 후반 = 새 날씨 밀도 증가 ──
  if (weather.transPrev != null) {
    const k = Math.min(1, Math.max(0, (state.gameMin - weather.transStart) / WEATHER_TRANS_MIN));
    weather.transK = k;
    const fromT = weather.transPrev, toT = weather.type;
    const from = WEATHERS[fromT], to = WEATHERS[toT];
    if (k < 0.5) {
      const c = Math.round(weatherDrawCount(fromT) * (1 - k * 2));
      weather.pts.visible = c > 0;
      if (from.count) { weather.pts.material.color.setHex(from.color); weather.pts.material.size = from.size; weather.pts.geometry.setDrawRange(0, c); }
    } else {
      const c = Math.round(weatherDrawCount(toT) * ((k - 0.5) * 2));
      weather.pts.visible = !!to.count && c > 0;
      if (to.count) { weather.pts.material.color.setHex(to.color); weather.pts.material.size = to.size; weather.pts.geometry.setDrawRange(0, Math.max(1, c)); }
    }
    if (k >= 1) {
      // 전이 완료: 비가 갠 낮이면 새소리 원샷(밤엔 조용히 끝 — 디렉터 오더)
      if (weather.transBirds && gameHour() >= 7 && gameHour() < 19) playSfx('birds_after_rain');
      weather.transPrev = null; weather.transBirds = false;
      setWeather(weather.type); // 최종 밀도/색 확정 복원
    }
  }
  // 파티클 낙하 시뮬은 "지금 화면에 보이는" 날씨 기준 (전이 전반엔 이전 날씨의 낙하 특성)
  const W = WEATHERS[(weather.transPrev != null && weather.transK < 0.5) ? weather.transPrev : weather.type];
  if (!W.count) return;
  const p = weather.pts.geometry.attributes.position;
  const { SPAN, TOP } = weather;
  const rx = ROOM.w / 2 + 0.6, rz = ROOM.d / 2 + 0.6, roofY = ROOM.h + 1.6;
  for (let i = 0; i < W.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    y -= W.fall * weather.seedY[i] * dt;
    x += Math.sin(t * 1.4 + weather.seedS[i]) * W.sway * dt;
    // 지붕 아래(실내)로는 떨어지지 않음
    const inRoom = Math.abs(x) < rx && Math.abs(z) < rz && y < roofY;
    if (y < -0.5 || inRoom) { y = TOP; x = (Math.random() * 2 - 1) * SPAN; z = (Math.random() * 2 - 1) * SPAN; }
    if (x > SPAN) x -= SPAN * 2; else if (x < -SPAN) x += SPAN * 2;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
}

// 화면 2D 날씨 오버레이(빗방울/서리) → render/weatherfx.js (Tier4 Phase1-④). 자체 상태 소유 자족 서브시스템.
const { updateScreenFx, resizeFx } = makeScreenFx({
  state, weather, getSHELTERS: () => SHELTERS, getTitleVisible: () => titleVisible,
});

/* ============================================================
   쾌적함 (기획서: Shelter 꾸미기 품질 → 실질 효과)
============================================================ */
// comfortDetail → core/comfort.js (import). 쾌적 점수 산식(furn+light+청결+온기+테마…, 18기저, 0~100 클램프).
//   weather.type은 setComfortWeather 주입으로 읽음(weather 객체는 렌더 결합이라 game.js 잔류).
/* ── 쾌적함 4요소 분해 (#29 Living Shelter) ──
   comfortDetail()의 원본 컴포넌트를 온기/청결/안정감/분위기 4축으로 "재분류"만 한다.
   각 축 값의 합 = comfortDetail().score (기저 18 포함) — 총점 불변, 원인 로그만 추가.
   반환: { warmth, clean, security, mood, score, logs:{warmth:[],clean:[],security:[],mood:[]} } */
function comfortBreakdown() {
  const cd = comfortDetail();
  // 조명(light) 총점을 온기(열원) vs 분위기(전기)로 배분 — 합은 cd.light 그대로
  const CM = BAL.comfort;
  let lightWarmth = 0, lightMood = 0;
  const warmSrc = [], moodSrc = [];
  const lm = SHELTERS[state.current].perk?.lightMult || 1;
  // 캡(24*lm) 적용 전 원자 기여도를 축별로 나눈 뒤, cd.light와 비율 맞춰 스케일 (캡 반영)
  let rawWarm = 0, rawMood = 0;
  for (const it of items) {
    const L = DEFS[it.defId]?.light;
    if (!L || it.on === false) continue;
    const c = (L.comfort ?? 5) * tierComfortMult(it); // #157 티어 스케일 — comfortDetail과 동일 배수
    const axis = CM.lightAxis[it.defId] || CM.lightAxisDefault;
    if (axis === 'warmth') { rawWarm += c; warmSrc.push({ id: it.defId, v: c }); }
    else { rawMood += c; moodSrc.push({ id: it.defId, v: c }); }
  }
  const rawSum = rawWarm + rawMood;
  if (rawSum > 0) {
    lightWarmth = cd.light * (rawWarm / rawSum);
    lightMood = cd.light - lightWarmth; // 나머지 전부 — 반올림 오차로 합 어긋나지 않게
  }
  // limitMod(한파/단열/추위 페널티)는 온기 결핍으로 귀속, needsLight 어둠 페널티는 분위기로 분리
  const sh = SHELTERS[state.current];
  let darkPen = 0;
  if (sh.needsLight && cd.light <= 0) darkPen = -sh.needsLight;
  const warmthLimit = cd.limitMod - darkPen; // 나머지(추위/단열/한파) → 온기
  // ── 4축 합산 (합 = cd.score의 기저 18 포함) ──
  const warmth = lightWarmth + cd.heatMod + cd.catMod + warmthLimit;
  const clean = cd.cleanMod;
  // moodBuff(만남의 여운)와 벙커 수리 가산은 안정감 축으로 귀속 — 합계는 score 불변.
  const security = 18 + cd.shelterMod + cd.settled + cd.injuryMod + (cd.moodMod || 0) + (cd.bunkerMod || 0) + (cd.knowMod || 0);
  const mood = cd.furn + lightMood + darkPen + (cd.themeMod || 0);
  // ── 원인 로그 (각 축 2~3줄) ──
  const logs = { warmth: [], clean: [], security: [], mood: [] };
  // 온기
  for (const s of warmSrc) logs.warmth.push({ name: LName(DEFS[s.id]), v: `+${Math.round(s.v * (rawSum ? (cd.light / rawSum) : 1))}` });
  if (cd.heatMod) logs.warmth.push({ name: t('comfort.log.heater'), v: `+${cd.heatMod}` });
  if (cd.catMod) logs.warmth.push({ name: t('comfort.log.cat'), v: `+${cd.catMod}` });
  if (warmthLimit < 0) logs.warmth.push({ name: coldSnapNetSeverity() > 0 ? t('comfort.log.coldsnap') : t('comfort.log.cold'), v: `${warmthLimit}` });
  // 청결
  if (cd.cleanMod) logs.clean.push({ name: t('comfort.log.cleanState', { n: Math.round(cd.clean) }), v: `${cd.cleanMod > 0 ? '+' : ''}${cd.cleanMod}` });
  // 안정감
  logs.security.push({ name: t('comfort.log.base'), v: '+' + BAL.comfort.baseSecurity }); // P2: comfort.js 점수식과 동일 상수 — 표시가 실값을 따라간다
  if (cd.shelterMod) logs.security.push({ name: t('comfort.log.shelter'), v: `+${cd.shelterMod}` });
  if (cd.settled) logs.security.push({ name: t('comfort.log.settled', { n: cd.settled }), v: `+${cd.settled}` });
  if (cd.injuryMod) logs.security.push({ name: t('comfort.log.injury'), v: `${cd.injuryMod}` });
  if (cd.bunkerMod) logs.security.push({ name: t('comfort.log.bunkerRoof'), v: `+${cd.bunkerMod}` });
  if (cd.knowMod) logs.security.push({ name: t('comfort.log.knowledge'), v: `+${cd.knowMod}` });
  if (cd.moodMod) logs.security.push({ name: t('comfort.log.mood'), v: `${cd.moodMod > 0 ? '+' : ''}${cd.moodMod}` });
  // 분위기
  if (cd.furn) logs.mood.push({ name: t('comfort.log.furn'), v: `+${cd.furn}` });
  for (const s of moodSrc) logs.mood.push({ name: LName(DEFS[s.id]), v: `+${Math.round(s.v * (rawSum ? (cd.light / rawSum) : 1))}` });
  if (cd.themeMod) for (const ts of activeThemeSets()) logs.mood.push({ name: LName(ts), v: `+${DECO_THEME_COMFORT}` });
  if (darkPen) logs.mood.push({ name: t('comfort.log.dark'), v: `${darkPen}` });
  return { warmth, clean, security, mood, score: cd.score, logs };
}
// bunkerComfortBonus → core/comfort.js (import). 벙커 천장/저장고 쾌적 가산.
// 인카운터 안정감 여운 — amt(±) 를 days 일간 부여. 같은 부호면 이어붙이지 않고 더 강한 쪽/새 것으로 갱신.
function addMoodBuff(amt, days = 3) {
  state.moodBuff = { amt, until: state.day + days };
}
// comfortLevel/comfortExpBonus/recoveryMult → core/comfort.js (import). 쾌적 점수 파생(레벨/탐험보너스/회복배수).
// rateParts/expActualRate/districtOf → core/expedition.js (import). 순수 성공률 판정. weather 페널티만 주입.

/* ============================================================
   환경 조각 빌더 (아포칼립스 소품)
============================================================ */
function buildCarWreck(parent, x, z, rotY, rand, groundY = 0) {
  const g = new THREE.Group();
  const body = 0x5f4a3a, rust = 0x6e3e28, dark = 0x2a2622;
  B(g, 2.6, 0.5, 1.2, body, 0, 0.55, 0);
  B(g, 1.4, 0.45, 1.1, shade(body, 0.85), -0.15, 1.0, 0);
  B(g, 0.5, 0.2, 1.15, rust, 1.0, 0.62, 0);      // 녹슨 본닛
  B(g, 0.4, 0.28, 1.0, dark, -0.15, 1.0, 0.06);  // 깨진 창
  const wheel = (wx, wz, missing) => {
    if (missing) { B(g, 0.3, 0.12, 0.3, dark, wx, 0.12, wz); return; }
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 8), lamb(0x24211e));
    m.rotation.x = Math.PI / 2; m.position.set(wx, 0.28, wz);
    m.castShadow = true; g.add(m);
  };
  wheel(0.85, 0.62); wheel(-0.85, 0.62); wheel(0.85, -0.62, true); wheel(-0.85, -0.62);
  g.rotation.y = rotY;
  g.rotation.z = 0.03;
  g.position.set(x, groundY, z); // P2-c: 지형 높이에 접지 (컨테이너 폐차 부양 수정)
  parent.add(g);
  wlBlock(x, z, 1.5); // #95: 동물 우회 대상 (차체 2.6×1.2 외접원 — 전 호출처가 buildEnv라 자기등록)
}
function buildPowerPole(parent, x, z, tilt, groundY) {
  const g = new THREE.Group();
  Cyl(g, 0.07, 0.1, 5.4, 0x3d362e, 0, 2.7, 0, 6);
  B(g, 1.5, 0.08, 0.08, 0x3d362e, 0, 4.9, 0);
  B(g, 0.06, 0.14, 0.06, 0x55504a, -0.6, 5.0, 0); B(g, 0.06, 0.14, 0.06, 0x55504a, 0.6, 5.0, 0);
  g.rotation.z = tilt;
  g.position.set(x, groundY, z);
  parent.add(g);
  wlBlock(x, z, 0.3); // #95: 동물 우회 대상 (기둥 밑동)
  if (ogReg) ogReg.poles.push({ x, z, groundY, tilt }); // #71: 전신주 덩굴 감김 대상 등록(전 호출처가 buildEnv)
}
function buildRuinCity(parent, rand, opt) {
  // 폐허 빌딩(개별 그룹) — 무너진 상층부 + 드문 불빛. 반환값으로 시야 컬링 가능.
  const list = [];
  for (let i = 0; i < opt.count; i++) {
    const a = rand() * Math.PI * 2;
    const r = opt.rMin + rand() * (opt.rMax - opt.rMin);
    const bw = 4 + rand() * 8, bd = 4 + rand() * 8, bh = opt.hMin + rand() * (opt.hMax - opt.hMin);
    const x = r * Math.cos(a), z = r * Math.sin(a);
    const col = [0x252a36, 0x2b303c, 0x20242e][Math.floor(rand() * 3)];
    const g = new THREE.Group();
    const geos = [paintGeo(new THREE.BoxGeometry(bw, bh, bd), col)];
    geos[0].translate(0, bh / 2, 0);
    if (rand() > 0.45) { // 무너진 상층부
      const g2 = paintGeo(new THREE.BoxGeometry(bw * (0.4 + rand() * 0.3), bh * 0.25, bd * 0.5), shade(col, 0.8));
      g2.translate((rand() - 0.5) * bw * 0.3, bh + bh * 0.12, 0);
      geos.push(g2);
    }
    g.add(new THREE.Mesh(mergeGeometries(geos), vcLambert));
    if (rand() < opt.litChance) { // 살아있는 불빛
      const winGeos = [];
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const wg = new THREE.BoxGeometry(0.55, 0.75, 0.55);
        wg.translate((rand() - 0.5) * (bw - 1), 1.5 + rand() * (bh - 2.5), (rand() - 0.5) * (bd - 1));
        winGeos.push(wg);
      }
      g.add(new THREE.Mesh(mergeGeometries(winGeos), new THREE.MeshBasicMaterial({ color: 0xd9b06a })));
    }
    g.position.set(x, opt.baseY, z);
    parent.add(g);
    list.push({ obj: g, dir: new THREE.Vector2(x, z).normalize(), r });
    // #71: 폐허 빌딩 벽면 = 담쟁이/이끼 패치 대상 등록. dynCull(옥탑 근경처럼 envDyn.buildings로
    //   시야 컬링되는 호출)은 그룹 참조를 함께 남겨 패치를 그룹 자식으로 부착(빌딩과 함께 사라지도록).
    //   ogSkip: 바다 셸터(등대)처럼 '건물 잠식 대신 암반 이끼 소량' 규칙인 호출처가 명시적으로 제외.
    if (ogReg && !opt.ogSkip) ogReg.bldg.push({ x, z, w: bw, d: bd, h: bh, baseY: opt.baseY, per: opt.ogPer ?? 1, group: g, dyn: !!opt.dynCull });
  }
  return list;
}

/* ============================================================
   셸터 정의 (컨테이너 → 옥상 캠프 → 숲속 오두막)
============================================================ */
let ROOM = { w: 6.4, d: 2.9, h: 2.4 };
let wallList = [];      // { group, normal }
let ceilCullList = [];  // { group, y } — 실내를 덮는 천장/지붕. 카메라가 천장보다 높은(부감) 각도면 숨겨 실내를 보이게 한다 (⑥-a, 전 셸터 공통).
let blockers = [];      // 고정 소품 충돌 영역 { x, z, w, d }
let envDyn = {};        // 환경별 동적 요소
let bunkerStairsObj = null; // #55: 벙커 하강 계단 상호작용 히트 대상 (없으면 null)
let subwayHiddenObj = null; // §9.6 「침묵」: 승강장 히든 지점 히트 대상 (불가시 메시 — 시각 변화 0, 없으면 null)

const roomGroup = new THREE.Group(); scene.add(roomGroup);
const envRoot = new THREE.Group(); scene.add(envRoot);

// 벽/바닥 재질: Phong으로 생성 — applyWetness()가 젖었을 때 specular/shininess를 올려
// 빛을 반사하는 재질감을 낸다 (Lambert는 specular가 없어 이 표현이 불가능).
// 퀄업 B2 마이크로 노이즈: bumpMap 채널에 저강도 그레인 — 민무늬 면의 평탄감 해소.
//   .map이 아니라 bump인 이유: 벽지(applyDeco)가 .map만 스왑하므로 map에 노이즈를 넣으면
//   벽지 원복 시 색 곱연산 로직(baseMap truthy → 백색 고정)과 충돌한다. bump는 데코·젖음과 직교.
let _microBumpTex = null;
function microBumpTex() {
  if (_microBumpTex) return _microBumpTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const im = g2.createImageData(64, 64);
  let sd = 229 * 16807 % 2147483647; // 고정 시드 LCG — 부팅마다 그레인이 같아야 골든이 결정론(0.15% 런 간 잔차 실측 후 교체)
  const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * 46 | 0; // ±23 그레인 — bumpScale이 최종 강도를 죈다
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g2.putImageData(im, 0, 0);
  _microBumpTex = new THREE.CanvasTexture(cv);
  _microBumpTex.wrapS = _microBumpTex.wrapT = THREE.RepeatWrapping;
  _microBumpTex.repeat.set(2, 2);
  return _microBumpTex;
}
function wallPhong(opts = {}) {
  return new THREE.MeshPhongMaterial({ shininess: 4, specular: 0x000000, bumpMap: microBumpTex(), bumpScale: 0.05, ...opts });
}
// B()의 Phong 버전 — lamb() 헬퍼(Lambert)만 쓰는 벽 패널(예: 버스)을 위해
function BP(parent, w, h, d, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallPhong({ color: c }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function stdWall(len, h, mat, opts = {}) {
  const g = new THREE.Group();
  const t = 0.22;
  // 꾸미기(#13): 벽지 교체 대상 재질 태깅. 공유 재질이라 셸터당 1회만 표시하면 충분.
  tagDecoWall(mat);
  if (!opts.window) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), mat);
    m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
    g.add(m);
  } else {
    const { winW, winH, winY, winX } = opts.window;
    const L = winX - winW / 2 + len / 2, R = len / 2 - (winX + winW / 2);
    const mk = (w, hh, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, t), mat);
      m.position.set(x, y, 0); m.castShadow = m.receiveShadow = true; g.add(m);
    };
    mk(L, h, -len / 2 + L / 2, h / 2);
    mk(R, h, len / 2 - R / 2, h / 2);
    mk(winW, winY - winH / 2, winX, (winY - winH / 2) / 2);
    mk(winW, h - (winY + winH / 2), winX, (h + winY + winH / 2) / 2);
    const frameMat = lamb(opts.frameColor ?? 0x5d4a30);
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.14, 0.1, t + 0.06), frameMat);
    f1.position.set(winX, winY - winH / 2, 0); g.add(f1);
    const f2 = f1.clone(); f2.position.y = winY + winH / 2; g.add(f2);
    const f3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, winH + 0.1, t + 0.06), frameMat);
    f3.position.set(winX - winW / 2, winY, 0); g.add(f3);
    const f4 = f3.clone(); f4.position.x = winX + winW / 2; g.add(f4);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshBasicMaterial({ color: opts.skyColor ?? 0x36435c }));
    // 창밖 하늘은 시간대에 따라 밝아져야 한다 (낮인데 창이 깜깜하면 뒤집힌 느낌)
    sky.material.userData.baseHex = opts.skyColor ?? 0x36435c;
    sky.material.userData.cullFadeSkip = true; // ① 외부(winSkyMats)에서 추적하는 재질 — 클론 금지
    sky.material.userData.wallG = g; // #229 벽 컬링 페이드 동조
    winSkyMats.push(sky.material);
    sky.position.set(winX, winY, -0.02);
    g.add(sky);
    // ③ 한파 성에 오버레이 — 창유리 안쪽(방 방향 +z) 살짝 앞에 창 크기 평면. 기본 투명(opacity 0),
    //   updateEnvironment가 무방비 한파일 때만 서서히 드러낸다. cullFadeSkip: winFrostMats로 별도 추적.
    const frost = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH),
      new THREE.MeshBasicMaterial({ map: frostTex(), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    frost.material.userData.cullFadeSkip = true;
    frost.userData.wallG = g; // #229 벽 컬링 페이드 동조
    frost.position.set(winX, winY, 0.03); // 유리(-0.02)보다 방 안쪽으로 — 실내에서 보이게
    frost.visible = false;
    g.add(frost);
    winFrostMats.push(frost);
    // 창가 빛기둥 (TLOU 무드): 창 상단에서 방(+z) 안쪽 바닥으로 떨어지는 산란광.
    // 단일 사각 시트는 유리판처럼 보인다(유저 신고) — 사다리꼴 확산 + 3겹 헤이즈 + 착지광으로.
    const x1 = winX - winW / 2, x2 = winX + winW / 2;
    const cx = winX, yT = winY + winH / 2;
    const zL = yT * 1.05; // 바닥 착지 깊이 ≈ 45° 남짓
    // 겹: [폭 배율, 착지 확산 배율, 투명도 배율, z 오프셋] — 본체 + 넓고 옅은 반그림자 + 중간 겹
    const LAYERS = [[1.0, 1.35, 1.0, 0], [1.25, 1.8, 0.45, 0.05], [0.7, 1.0, 0.7, -0.03]];
    for (const [wTop, wBot, opMul, zOff] of LAYERS) {
      const hw1 = (winW / 2) * wTop, hw2 = (winW / 2) * wBot; // 바닥에서 퍼진다
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        cx - hw1, yT, 0.13 + zOff, cx + hw1, yT, 0.13 + zOff,
        cx - hw2, 0.03, zL + zOff, cx + hw2, 0.03, zL + zOff,
      ]), 3));
      bg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2));
      bg.setIndex([0, 2, 1, 2, 3, 1]);
      const beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({
        map: beamTex(), color: 0xffedc4, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
      }));
      beam.visible = false;
      beam.userData.opMul = opMul;
      beam.userData.wallG = g; // #229 벽 컬링 페이드 동조
      beam.material.userData.cullFadeSkip = true; // ① sunShafts에서 추적 — 클론 금지
      g.add(beam);
      sunShafts.push(beam);
    }
    // 착지광: 빛이 뚝 끊기는 대신 바닥에 부드러운 웅덩이로 풀어진다
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(winW * 1.9, winW * 1.15), new THREE.MeshBasicMaterial({
      map: floorGlowTex(), color: 0xffe6b8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx, 0.025, zL * 0.82);
    pool.visible = false;
    pool.userData.opMul = 0.8;
    pool.userData.wallG = g; // #229 벽 컬링 페이드 동조
    pool.material.userData.cullFadeSkip = true; // ① sunShafts에서 추적 — 클론 금지
    g.add(pool);
    sunShafts.push(pool);
    // 빛기둥 속 먼지 입자 20개 — 프리즘 내부에 고정 분포, 렌더 루프에서 느리게 부유
    const N = 20, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random(), v = Math.random();
      pos[i * 3] = x1 + (x2 - x1) * u;
      pos[i * 3 + 1] = 0.05 + (yT - 0.05) * (1 - v);
      pos[i * 3 + 2] = 0.13 + (zL - 0.13) * v + (Math.random() - 0.5) * 0.1;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(pg, new THREE.PointsMaterial({
      color: 0xfff3d6, size: 0.05, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    motes.visible = false;
    motes.userData.phase = Math.random() * Math.PI * 2;
    motes.userData.wallG = g; // #229 벽 컬링 페이드 동조
    g.add(motes);
    sunMotes.push(motes);
  }
  return g;
}
// 날씨-구조물 상호작용 요소 (벽 위 적설 캡) — loadShelter마다 재생성
// (빗물 표현은 파티클 대신 applyWetness()의 반사 재질(Phong specular)로 대체됨)
const weatherFx = { caps: [] };
const snowCapMat = new THREE.MeshLambertMaterial({ color: 0xe9f2fa, transparent: true, opacity: 0.96 });
snowCapMat.userData.noWet = true;
snowCapMat.userData.shared = true; // loadShelter의 disposeDeep에서 살아남아야 함
// v1.5.2(디렉터 T자 신고): cullFadeSkip 해제 — 벽이 페이드로 열릴 때 캡(순백 판)만 남아
//   'T자 크로스바'로 읽히던 잔상의 한 축. 표준 경로(그룹별 클론)로 벽과 함께 페이드된다.
//   캡 가시성(snowCover)은 mesh.visible이라 재질 클론과 무관 — 기존 눈 두께 제어 불변.
function addWallWeatherFx(wallGroup) {
  // v1.5.2(디렉터 신고 — 돔 '1자 바'): 상단이 수평 직선인 벽에만 캡이 성립한다. 곡면 밴드/반달 파사드는
  //   bb 상단에 일자 캡이 공중 부유(벙커에서 y4.3~7.0 흰 바 3개 실측) — noWeatherCap 표식 벽은 생략.
  if (wallGroup.userData.noWeatherCap) return;
  const bb = new THREE.Box3().setFromObject(wallGroup);
  const len = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  if (len < 0.5 || h < 0.5) return;
  // 눈: 벽 상단에 쌓이는 캡 (snowCover에 따라 두께가 자란다)
  // 폭 0.4→0.26 (v1.5.2): 벽 두께(0.22대)에 밀착 — 벽보다 두 배 넓은 순백 판이 'T자 선반'으로 읽히던 과장 제거.
  const capGeo = new THREE.BoxGeometry(len * 0.98, 0.17, 0.26);
  capGeo.translate(0, 0.085, 0);
  const cap = new THREE.Mesh(capGeo, snowCapMat);
  cap.position.y = h - 0.02;
  cap.castShadow = false; cap.visible = false;
  wallGroup.add(cap);
  weatherFx.caps.push(cap);
}
/* ── #96 젖은 도시 (디렉터 GTA 레퍼런스): 웅덩이 + 광원 반사 스트릭 ──
   비(wetness)가 오르면 마당 평지에 웅덩이가 배고, 창문 온광이 젖은 땅에 시선축으로 길게 번진다.
   레퍼런스의 핵심은 웅덩이보다 '광원의 세로 번짐 반사' — 스트릭은 매 프레임 카메라 요를 따라 눕는다.
   전부 envRoot 자식(셸터 언로드 시 자동 해체), 지연 구축(첫 젖음에 1회), lowSpec 웅덩이 절반. */
let wetFxBuilt = false;
const wetGlintAnchors = []; // {x,z,color,w,len} — loadShelter 리셋. 셸터별 특수 광원 등록 여지(2차: 부표/페리 창 등)
function wetGlint(x, z, color, w = 0.7, len = 2.8) { wetGlintAnchors.push({ x, z, color, w, len }); }
let _puddleTexes = null, _glintTex = null;
function puddleTexOf(i) {
  if (!_puddleTexes) {
    _puddleTexes = [0, 1, 2].map(seed => makeCanvasTex((g2, w) => {
      g2.clearRect(0, 0, w, w);
      const rand = seededRand(31 + seed);
      // 불규칙 웅덩이: 원 4~5개 합집합 알파 (픽셀 결)
      g2.fillStyle = 'rgba(255,255,255,0.92)';
      for (let k = 0; k < 5; k++) {
        const cx = w * (0.32 + rand() * 0.36), cy = w * (0.32 + rand() * 0.36), r = w * (0.14 + rand() * 0.16);
        g2.beginPath(); g2.arc(cx, cy, r, 0, 7); g2.fill();
      }
    }, 48, 48));
    for (const t of _puddleTexes) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  }
  return _puddleTexes[i % 3];
}
function glintTexOnce() {
  if (_glintTex) return _glintTex;
  _glintTex = makeCanvasTex((g2, w) => {
    g2.clearRect(0, 0, w, w);
    const gr = g2.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,0.85)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, w, w);
  }, 32, 32);
  return _glintTex;
}
function buildWetFx() {
  wetFxBuilt = true;
  weatherFx.puddles = []; weatherFx.glints = [];
  if (SHELTERS[state.current]?.indoor) return;
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const groundAt = (x, z, nMin) => {
    ray.set(new THREE.Vector3(x, 9, z), down);
    return ray.intersectObjects(envRoot.children, true).find(h => h.face && h.face.normal.y > nMin && h.point.y > -2.2 && h.point.y < 1.6);
  };
  // 웅덩이: 평지(법선 상향) 레이 샘플 — 지형 함수 비노출이라 float-audit 레이 문법 재사용
  const srand = seededRand(97);
  const want = opts.lowSpec ? 4 : 8;
  for (let k = 0, placed = 0; k < 44 && placed < want; k++) {
    const a = srand() * Math.PI * 2, r = 2.6 + srand() * 5.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const h = groundAt(x, z, 0.94);
    if (!h) continue;
    const size = 0.5 + srand() * 0.75;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * (1.1 + srand() * 0.7), size),
      new THREE.MeshPhongMaterial({ map: puddleTexOf(placed), transparent: true, opacity: 0,
        color: 0x141d28, specular: 0x9aacc0, shininess: 110, depthWrite: false }));
    m.material.userData.noWet = true; m.material.userData.cullFadeSkip = true;
    m.rotation.x = -Math.PI / 2; m.rotation.z = srand() * Math.PI;
    m.position.set(h.point.x, h.point.y + 0.015, h.point.z);
    m.renderOrder = 2; m.visible = false;
    envRoot.add(m); weatherFx.puddles.push(m);
    placed++; // 상한 카운트 — 누락 시 성공 레이 전부(44) 설치돼 늪이 된다(프로브 실측 검거)
  }
  // 광원 스트릭: 등록 앵커. 등록이 없으면 기본 1점 = 창문벽(-z) 바깥 온광 스필.
  if (!wetGlintAnchors.length) wetGlint(0, -ROOM.d / 2 - 1.6, 0xffc070);
  for (const g of wetGlintAnchors) {
    const h = groundAt(g.x, g.z, 0.8);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(g.w, g.len),
      new THREE.MeshBasicMaterial({ map: glintTexOnce(), transparent: true, opacity: 0, color: g.color,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.material.userData.noWet = true; m.material.userData.cullFadeSkip = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(g.x, (h ? h.point.y : 0) + 0.02, g.z);
    m.renderOrder = 3; m.visible = false;
    envRoot.add(m); weatherFx.glints.push(m);
  }
}

// #97 섀도 프록시 재질(공유): 색은 안 그리고(colorWrite off) 그림자 패스에만 참여 — "보이지 않는 차광판"
const shadowProxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
shadowProxyMat.userData.shared = true;
shadowProxyMat.userData.cullFadeSkip = true;
shadowProxyMat.userData.noWet = true;
function makeWalls(defs) {
  wallList = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    addWallWeatherFx(d.group); // 회전 전(로컬 좌표)에 치수 측정
    // #97 (디렉터: "벽 투명화되며 빛이 샌다"): 컬링으로 숨은 벽도 그림자는 계속 드리워야 한다.
    //   숨은 벽 자리에 화면 비가시 슬래브(프록시)를 켜서 광차단을 대행 — 실내광 유출/외광 유입 봉쇄.
    //   곡면 벽(noWeatherCap: 벙커 밴드·파사드)은 bb 슬래브가 형상과 틀려 제외(눈 캡과 같은 판정).
    let proxy = null;
    if (!d.group.userData.noWeatherCap) {
      const bb = new THREE.Box3().setFromObject(d.group);
      const len = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
      if (len > 0.5 && h > 0.5) {
        // 디렉터 신고(문 빛 소실): 통짜 슬래브가 문 개구부까지 막아, 벽이 컬링되면 문으로 새던 빛이 죽었다.
        //   벽 그룹에 doorGap(로컬 x 중심/폭/높이) 태그가 있으면 좌/우/상인방 3분할로 문 구멍을 남긴다.
        proxy = new THREE.Group();
        const slab = (sx, cx, sy, cy) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.16), shadowProxyMat);
          m.position.set(cx, cy, 0);
          m.castShadow = true; m.receiveShadow = false;
          m.raycast = () => {}; // 클릭/피킹 무간섭
          proxy.add(m);
        };
        const gap = d.group.userData.doorGap;
        if (gap) {
          const gL = gap.x - gap.w / 2, gR = gap.x + gap.w / 2;
          if (gL - bb.min.x > 0.05) slab(gL - bb.min.x, (bb.min.x + gL) / 2, h, bb.min.y + h / 2);         // 문 왼쪽
          if (bb.max.x - gR > 0.05) slab(bb.max.x - gR, (gR + bb.max.x) / 2, h, bb.min.y + h / 2);         // 문 오른쪽
          if (h - gap.h > 0.05) slab(gap.w, gap.x, h - gap.h, bb.min.y + gap.h + (h - gap.h) / 2);          // 상인방
        } else {
          slab(len, (bb.min.x + bb.max.x) / 2, h, bb.min.y + h / 2); // 개구부 없는 벽: 기존 통짜
        }
        proxy.position.set(d.pos[0], d.pos[1], d.pos[2]);
        proxy.rotation.y = d.rotY;
        proxy.visible = false;          // 벽이 보일 땐 벽이 직접 그림자 — 프록시는 숨을 때만
        roomGroup.add(proxy);
      }
    }
    d.group.position.set(...d.pos);
    d.group.rotation.y = d.rotY;
    roomGroup.add(d.group);
    wallList.push({ group: d.group, normal: d.normal, proxy });
  }
}
// ⑤ 벽 부착 소품 컬링 동기화: 벽 평면에 덧댄 패치/판자/방수포/브레이스/스텐실 등을,
//   해당 방향 벽 그룹의 자식으로 흡수해 벽과 함께 컬링·페이드된다(허공 부유 방지).
//   normalDir: 벽 바깥 법선(±1축). objs: roomGroup(또는 상위)에 이미 붙은 Mesh/Group 들.
//   attach()로 월드 변환을 보존하며 재부모화하므로 좌표 재계산 불필요.
//   외벽 실외 부착물(SHELTER_MOUNTS: 태양광/빗물받이/부표 등)은 이 함수로 넘기지 않는다(실외라 컬링 대상 아님).
function attachToWall(nx, ny, nz, ...objs) {
  const w = wallList.find(w => Math.abs(w.normal.x - nx) < 0.01 && Math.abs(w.normal.y - ny) < 0.01 && Math.abs(w.normal.z - nz) < 0.01);
  if (!w) return;
  for (const o of objs) if (o && o.parent !== w.group) w.group.attach(o); // 월드 변환 보존 재부모화
}
// #87: 지붕 거치 소품(태양광 등)을 천장 컬링/페이드 단위에 편입 — 부감에서 지붕이 사라질 때
//   패널+브래킷이 실내 위 허공에 남던 실기기 신고의 교정. 근접 높이의 지붕 그룹이 없으면(개방 갑판 조타실 등,
//   컬링 자체가 없는 지붕) 그대로 둔다 — 그 지붕은 사라지지 않으므로 소품도 남는 게 맞다.
function attachToRoofCull(y, ...objs) {
  let best = null;
  for (const rf of ceilCullList) if (!best || Math.abs(rf.y - y) < Math.abs(best.y - y)) best = rf;
  if (!best || Math.abs(best.y - y) > 1.2) return;
  for (const o of objs) if (o && o.parent !== best.group) best.group.attach(o);
}
// ⑥-a (전 셸터 공통): 실내를 덮는 천장/지붕을 컬링 목록에 등록한다. obj는 이미 씬에 붙은 Mesh/Group.
//   y = 천장 대략 높이(카메라가 이보다 확실히 위에 있으면=부감 → 숨김). 셸터별 buildRoom에서 천장 메시 생성 직후 호출.
//   (ARC: 셸터별 복붙 컬링 로직 없이, 태그만 붙이면 updateWallCulling의 공통 루프가 일괄 처리)
function tagCeiling(obj, y) {
  if (obj) ceilCullList.push({ group: obj, y });
  return obj;
}
// F-1a [B]: 흔들리는 천 — 기존 방수포/천 소품에 미세 sway(신규 소품 금지). buildRoom/buildEnv에서 태그,
//   tickEnv가 바람세기(windLevel)에 비례해 base 회전 주변으로 살랑인다. loadShelter가 목록 초기화.
let swayProps = [];
function tagSway(mesh, baseZ = 0, amp = 0.05) {
  if (mesh) swayProps.push({ mesh, baseZ, amp, phase: Math.random() * Math.PI * 2 });
  return mesh;
}
// #95 야생동물 장애물 등록부 (디렉터: "동물이 오브젝트를 통과하면 짜침"): buildEnv의 근접 대형 소품을
//   원기둥 {x,z,r}로 등록 → wildlife가 목표 재추첨 + 이동 스티어링으로 우회한다. 씬 트래버스 금지 원칙(ogReg 선례).
//   등록 범위 = 로밍 밴드+퇴장 경로가 닿는 r<12 근방만. loadShelter가 buildEnv 직전 초기화.
let wlObstacles = [];
function wlBlock(x, z, r) { wlObstacles.push({ x, z, r }); }

// Tier4 렌더 추출 Phase1-①: 셸터 build 함수를 render/shelters.js로 이관. ctx = game.js 클로저 헬퍼 + 가변 렌더 상태.
//   roomGroup/envRoot=안정 const 직접 주입, ROOM=게터(로드마다 재할당), blockers/envDyn=setter(build 내부 재할당).
//   여기서 조립하므로 참조 헬퍼(function 선언=호이스팅, ogGround 등 포함)가 전부 정의돼 있다.
const _shelterBuilders = makeShelterBuilders({
  roomGroup, envRoot, state,
  getROOM: () => ROOM, setBlockers: (v) => { blockers = v; }, setEnvDyn: (v) => { envDyn = v; }, getEnvDyn: () => envDyn,
  getWallList: () => wallList, setWallList: (v) => { wallList = v; }, // bunker 돔 반쪽 직접 push / ship 리셋 (라이브 wallList)
  setBunkerStairs: (v) => { bunkerStairsObj = v; }, // bunker 뒷문 계단 상호작용 대상 (game.js 레이캐스트)
  setSubwayHidden: (v) => { subwayHiddenObj = v; }, // §9.6 히든 지점 히트 대상 (subway buildEnv가 세팅)
  wallPhong, stdWall, makeWalls, tagCeiling, tagSway, attachToWall,
  wlBlock, ogGround, ogAttach, ogRock, ogZone, BP,
  // #229 커스텀 유리(관제탑 파노라마 등)를 시간 연동 하늘판으로 등록 — 정적 유리는 정오에도 밤색(실캡처 검거).
  //   baseHex=밤 유리색, 낮에 계절 하늘색으로 밝아짐(updateWindowSkies). wallG로 벽 페이드 동조까지.
  regWinSky: (mat, baseHex, wallG) => {
    mat.userData.baseHex = baseHex;
    mat.userData.cullFadeSkip = true; // 외부(winSkyMats) 추적 — 컬링 페이드 클론 금지
    if (wallG) mat.userData.wallG = wallG;
    winSkyMats.push(mat);
  },
  buildCarWreck, buildPowerPole, buildRuinCity, buildRooftopSlate, buildRailSegments,
});
const SHELTERS = {
  container: {
    ...SHELTER_META.container, // 데이터 필드는 data/shelters.js. build 함수는 render/shelters.js(이관 완료).
    ..._shelterBuilders.container,
  },

  bunker: {
    ...SHELTER_META.bunker, // build 함수 → render/shelters.js
    ..._shelterBuilders.bunker,
  },

  rooftop: {
    ...SHELTER_META.rooftop, // build 함수 → render/shelters.js
    ..._shelterBuilders.rooftop,
  },

  cabin: {
    ...SHELTER_META.cabin, // build 함수 → render/shelters.js
    ..._shelterBuilders.cabin,
  },

  bus: {
    ...SHELTER_META.bus, // build 함수 → render/shelters.js
    ..._shelterBuilders.bus,
  },

  subway: {
    ...SHELTER_META.subway, // build 함수 → render/shelters.js
    ..._shelterBuilders.subway,
  },

  greenhouse: {
    ...SHELTER_META.greenhouse, // build 함수 → render/shelters.js
    ..._shelterBuilders.greenhouse,
  },

  ship: {
    ...SHELTER_META.ship, // build 함수 → render/shelters.js
    ..._shelterBuilders.ship,
  },

  lighthouse: {
    ...SHELTER_META.lighthouse, // build 함수 → render/shelters.js
    ..._shelterBuilders.lighthouse,
  },

  /* ── 1.1 「얼어붙은 항구」 셸터 1: 예인선 ──
     물 위에 뜬 작은 예인선. 흔들림 앰비언트(envDyn.sea 파동) + 낚시 퍽(매일 음식 +1). */
  tugboat: {
    ...SHELTER_META.tugboat, // build 함수 → render/shelters.js
    ..._shelterBuilders.tugboat,
  },

  /* ── 1.1 「얼어붙은 항구」 셸터 2: 항만 관제탑 ──
     항구를 내려다보는 고층 관제탑. 넓은 전망 창(viewH 큼) + 예보 리드타임 +1일 퍽. */
  controltower: {
    ...SHELTER_META.controltower, // build 함수 → render/shelters.js
    ..._shelterBuilders.controltower,
  },

  /* ── 1.3 「고요한 고원」 셸터: 스키 로지 ──
     고원 리조트의 스키 로지. 전 셸터 최고 단열(cold 0 — 악천후에도 쾌적 안 떨어짐) + 붙박이 벽난로(온기) + 큰 전망 창.
     고도 페널티(altitude): 연료 소모 +30% · 한파 빈도 +1 — 로지의 단열/난로가 이를 상쇄하는 리스크·리워드 셸터.
     온천(onsen) 개조로 cozy의 정점을 연다. 관측소·케이블카 대형 프로젝트 현장이 여기에 붙는다. */
  lodge: {
    ...SHELTER_META.lodge, // build 함수 → render/shelters.js
    ..._shelterBuilders.lodge,
  },

  /* ── 2.0 동부 「대도시」 셸터 1: 세관 (§6.0.5 — 심부 진행 관문, 세관==다리 → 역 → 펜트하우스) ──
     국경 검문소의 심사 홀이 거처. 밖은 차단기·검문 캐노피·컨테이너 야적·트럭 행렬 — TLOU 3년차 식생.
     unlockAt 9999 = 동부 관문 시스템 착지 전 이주 목록 비노출(기초 모델링 선제작 — Opus 디테일 패스 대기). */
  customs: {
    ...SHELTER_META.customs, // build 함수 → render/shelters.js
    ..._shelterBuilders.customs,
  },

  /* ── 2.0 동부 「대도시」 셸터 2: 다리 관리소 (§6.0.5 — 밤하늘 확장(은하수·큰 달) 첫 사용자) ── */
  bridgehouse: {
    ...SHELTER_META.bridgehouse, // build 함수 → render/shelters.js
    ..._shelterBuilders.bridgehouse,
    // #146 「불타는 해협」 지역 결선(디렉터 2026-07-23: "다리 보이는 맵에서 노을 질 때 다리쪽 클릭").
    //   무너진 현수교 실루엣의 히트 평면 — shelters.js bridgehouse env의 BZ2=-22·주탑 x[-18,14]·데크 y=-1과 정합.
    //   z는 다리 앞면(BZ2+1), x/y는 주탑 바깥 케이블 늘어짐까지 여유.
    bridgeSight: { z: -21, x0: -26, x1: 20, y0: -7, y1: 19 },
  },

  /* ── 2.0 동부 「대도시」 셸터 3: 역 대합실 (§6.0.5 — 신광+빛 웅덩이의 나무, TLOU 아트리움) ── */
  terminal: {
    ...SHELTER_META.terminal, // build 함수 → render/shelters.js
    ..._shelterBuilders.terminal,
  },

  /* ── 2.0 동부 「대도시」 셸터 4: 펜트하우스 (§6.0.5 — 심부 진행 종점, 첨탑들의 왕좌) ── */
  penthouse: {
    ...SHELTER_META.penthouse, // build 함수 → render/shelters.js
    ..._shelterBuilders.penthouse,
  },
};

/* ── 1.3 관측소 현장 오브젝트 (site='observatory') ──
   projectSiteStage('observatory')에 따라 자란다: 0 터/자재 → 1 기초 → 2 돔 골조 → 3 완성(회전 돔+망원경).
   완공(effect lodge.nightSky) 후 맑은 밤 밤하늘 이벤트가 열린다. */

/* ── 1.3 케이블카 현장 오브젝트 (site='cablecar') ──
   projectSiteStage('cablecar')에 따라 자란다: 0 잔해 → 1 지주 → 2 케이블 → 3 완성(곤돌라).
   완공(effect resort.accessTime) 후 리조트 접근 시간이 단축된다. */

/* ── 1.1 방파제 오두막 현장 오브젝트 (site='breakwaterHut') ──
   projectSiteStage('breakwaterHut')에 따라 단계별로 자란다: 0 잔해 → 1 정리된 터 → 2 뼈대 → 3 벽 → 4 완성 오두막.
   항구 셸터 buildRoom에서 호출. 현재 셸터가 항구 셸터면 investProject가 loadShelter로 재빌드해 갱신한다. */

/* ============================================================
   #71 계절 식생 + 도심 잠식(overgrowth) — TLOU 레퍼런스
   "사람이 떠난 도심은 수풀이 삼킨다": backdrop(방 밖 원경 건물·구조물)만, 연차(state.day)에
   비례해 (a)벽면 이끼/담쟁이 패치 (b)지면 수풀 클러스터 (c)전신주 덩굴이 자란다.
   겨울(seasonOf 'winter')엔 마른 톤(0x6a5f45 계열) + 밀도 ×0.6 — 눈 아래로 후퇴.
   ── 원칙 ──
   · 대상 등록: buildEnv/공용 빌더 코드가 ogReg에 좌표·그룹 참조를 직접 남긴다(장면 traverse로 이름 추측 금지).
   · 방(roomGroup) 내부·부착물·셸터 본체 금지 — 예외: 지하철 승강장/선로 이끼 소량(오더 명시 허용).
   · 시뮬 byte-identical: state는 읽기만 한다(day/current/계절). 난수는 seededRand(고정 시드+셸터 id 해시)
     — 같은 날 같은 셸터는 항상 같은 모습.
   · 갱신 주기: loadShelter 시 재생성만. 하루가 넘어가도 즉시 갱신하지 않는다(다음 로드 반영이면 충분 — 의도).
   · 성능 예산: 전부 병합 메시 — 월드 병합 1 + 수풀 정적 1 + sway 클러스터 ≤2 + 그룹 부착(동적 컬링 빌딩 ≤4,
     잔해 ≤2) = 셸터당 추가 드로우콜 ≤12. 텍스처 신규 생성 없음(팔레트 색 vertexColors Lambert).
   · 색: 자체 재질(신규 Lambert) — 전역 vcLambert 계절 틴트와 이중 적용 방지. envRoot 소속이라
     applyWetness(roomGroup 한정 스윕) 비대상 — 기존 backdrop 소품 관례와 동일(noWet 불필요).
============================================================ */
let ogReg = null; // buildEnv 동안만 유효한 등록부 — loadShelter가 리셋, buildOvergrowth가 소비 후 닫음
let ogState = { years: 0, patches: 0, tufts: 0, drawCallsAdded: 0 }; // QA 훅(overgrowthState) 노출용
function ogResetRegistry() { ogReg = { bldg: [], poles: [], rocks: [], zones: [], ground: null, attach: [] }; }
// 지면 수풀 존: buildEnv의 gh(x,z) 클로저를 그대로 캡처해 원지형에 접지. n = 1년차 기준 클러스터 수.
//   filter(x,z)로 도로면 등 제외. dry=true면 계절 무관 마른 관목(설원 로지 — 눈 위 초록 방지).
function ogGround(gh, rMin, rMax, n, filter = null, dry = false) { if (ogReg) ogReg.ground = { gh, rMin, rMax, n, filter, dry }; }
// 평면 이끼 존(부두 안벽 상판/승강장 등): 중심(cx,cz), 범위 w×d, 표면 y. n = 1년차 기준 패치 수.
function ogZone(cx, cz, w, d, y, n) { if (ogReg) ogReg.zones.push({ cx, cz, w, d, y, n }); }
// 암반/부표 이끼 대상(바다 셸터의 '건물 잠식 대신 소량' 규칙): sy = y 스케일(절벽 바위 세로 늘림 반영).
function ogRock(x, y, z, r, sy = 1) { if (ogReg) ogReg.rocks.push({ x, y, z, r, sy }); }
// 회전된 소품 그룹(전소 잔해 등) 잠식: group 로컬 좌표의 box 면에 담쟁이 — 그룹 자식 1메시로 병합 부착.
function ogAttach(group, boxes) { if (ogReg) ogReg.attach.push({ group, boxes }); }
function ogHashId(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 9973; return h; }
function buildOvergrowth() {
  ogState = { years: 0, patches: 0, tufts: 0, drawCallsAdded: 0 };
  const reg = ogReg; ogReg = null; // 소비 후 닫는다 — 로드 경로 밖의 등록 누수 방지
  if (!reg) return;
  // 잠식 연차: 0년차 거의 없음 → 3년차 상한. 모든 수량이 years에 비례.
  const years = Math.min(3, (state.day || 1) / 360);
  ogState.years = +years.toFixed(3);
  const winter = seasonOf().id === 'winter';
  const dens = winter ? 0.6 : 1;
  const rand = seededRand(41000 + ogHashId(state.current) * 7);
  const PAL = winter ? [0x6a5f45, 0x5d5340, 0x746a4e, 0x66603f]  // 겨울 마른 톤(오더 지정 0x6a5f45 계열)
                     : [0x3e5230, 0x46603a, 0x2f4527, 0x4a5c3c]; // 이끼/담쟁이 짙은 초록(기존 수풀 팔레트 근친)
  const pick = () => PAL[Math.floor(rand() * PAL.length)];
  const ogMat = () => new THREE.MeshLambertMaterial({ vertexColors: true }); // map 없음 → disposeDeep가 정리
  const worldGeos = [];  // 월드 좌표 병합분(담쟁이/덩굴/암반 이끼/평면 존)
  const tuftGeos = [];   // 지면 수풀 정적 병합분
  const og = new THREE.Group(); // 산출물 그룹 — envRoot에 붙어 다음 로드 때 함께 dispose
  let meshes = 0;
  // (a) 건물 벽면 담쟁이/이끼 — 방(원점)을 향한 면에만, 하단 편중(바닥에서 기어오른 인상).
  //     local=true: 동적 컬링 빌딩(옥탑 근경) — 그룹 로컬 좌표로 만들어 자식 부착(빌딩과 함께 사라져야 함).
  const addIvyPatches = (b, out, local) => {
    const nP = Math.min(4, Math.round((b.per ?? 1) * years * dens + rand() * 0.35));
    if (nP <= 0) return 0;
    const dirX = -b.x, dirZ = -b.z, dl = Math.hypot(dirX, dirZ) || 1;
    const faces = [{ nx: 1, nz: 0 }, { nx: -1, nz: 0 }, { nx: 0, nz: 1 }, { nx: 0, nz: -1 }]
      .filter(f => (f.nx * dirX + f.nz * dirZ) / dl > 0.15);
    if (!faces.length) return 0;
    let made = 0;
    for (let i = 0; i < nP; i++) {
      const f = faces[Math.floor(rand() * faces.length)];
      const pw = 0.5 + rand() * 1.6;
      // 고층(옥탑 원경 등)은 파사드 전체에 분산 — 저층은 지면 출발 + 30% 중단 반점
      const yLift = b.h > 8 ? rand() * b.h * 0.6 : (rand() < 0.3 ? rand() * b.h * 0.4 : 0);
      const ph = Math.min(0.7 + rand() * Math.max(0.7, b.h * 0.45), Math.max(0.5, b.h - yLift));
      const yc = yLift + ph / 2;
      const jitter = rand() - 0.5;
      let g;
      if (f.nx) {
        g = new THREE.BoxGeometry(0.06, ph, Math.min(pw, b.d * 0.9));
        g.translate(f.nx * (b.w / 2 + 0.035), yc, jitter * Math.max(0, b.d - pw * 0.6));
      } else {
        g = new THREE.BoxGeometry(Math.min(pw, b.w * 0.9), ph, 0.06);
        g.translate(jitter * Math.max(0, b.w - pw * 0.6), yc, f.nz * (b.d / 2 + 0.035));
      }
      if (!local) g.translate(b.x, b.baseY, b.z);
      out.push(paintGeo(g, pick()));
      made++;
    }
    return made;
  };
  let dynUsed = 0;
  for (const b of reg.bldg) {
    if (b.dyn) {
      if (dynUsed >= 4) continue; // 동적 컬링 빌딩 부착 메시는 드로우콜 예산상 4동까지
      const geos = [];
      const made = addIvyPatches(b, geos, true);
      if (made > 0) {
        const m = new THREE.Mesh(mergeGeometries(geos), ogMat());
        b.group.add(m); meshes++; dynUsed++;
        ogState.patches += made;
      }
    } else ogState.patches += addIvyPatches(b, worldGeos, false);
  }
  // (c) 전신주 덩굴 감김 — 0.5년 1단 → 1.2년 2단 → 2.2년 3단. 기둥 기울기(rotation.z=tilt)를 월드로 환산해 밀착.
  for (const p of reg.poles) {
    const wraps = years >= 2.2 ? 3 : years >= 1.2 ? 2 : years >= 0.5 ? 1 : 0;
    const ct = Math.cos(p.tilt), st = Math.sin(p.tilt);
    for (let k = 0; k < wraps; k++) {
      const yk = 0.45 + k * 0.75 + rand() * 0.35;
      for (let s = 0; s < 4; s++) {
        const a = rand() * Math.PI * 2;
        const lx = Math.cos(a) * 0.105, lz = Math.sin(a) * 0.105, ly = yk + s * 0.09;
        const g = new THREE.BoxGeometry(0.09, 0.16, 0.09);
        g.rotateY(a);
        g.translate(p.x + lx * ct - ly * st, p.groundY + lx * st + ly * ct, p.z + lz);
        worldGeos.push(paintGeo(g, pick()));
        ogState.patches++;
      }
    }
    if (years >= 2 && rand() < 0.7) { // 가로대에서 늘어진 덩굴 자락
      const len = 0.9 + rand() * 0.8, lx = (rand() - 0.5) * 1.2, ly = 4.85 - len / 2;
      const g = new THREE.BoxGeometry(0.05, len, 0.05);
      g.translate(p.x + lx * ct - ly * st, p.groundY + lx * st + ly * ct, p.z + (rand() - 0.5) * 0.1);
      worldGeos.push(paintGeo(g, pick()));
      ogState.patches++;
    }
  }
  // 암반/부표 이끼(바다 셸터) — 연차에 비례해 이끼 낀 바위가 늘어난다(소량 원칙, 0년차 거의 없음)
  for (const r of reg.rocks) {
    if (rand() > 0.04 + years * 0.3) continue;
    const s = r.r * (0.55 + rand() * 0.3);
    const g = new THREE.BoxGeometry(s, Math.max(0.06, r.r * 0.16), s);
    g.rotateY(rand() * Math.PI);
    g.translate(r.x, r.y + r.r * r.sy * 0.42, r.z);
    worldGeos.push(paintGeo(g, pick()));
    ogState.patches++;
  }
  // 평면 이끼 존(부두 안벽/승강장/선로)
  for (const z of reg.zones) {
    const nZ = Math.round(z.n * years * dens);
    for (let i = 0; i < nZ; i++) {
      const g = new THREE.BoxGeometry(0.35 + rand() * 0.85, 0.024, 0.25 + rand() * 0.6);
      g.rotateY(rand() * Math.PI);
      g.translate(z.cx + (rand() - 0.5) * z.w, z.y + 0.012, z.cz + (rand() - 0.5) * z.d);
      worldGeos.push(paintGeo(g, shade(pick(), 0.85)));
      ogState.patches++;
    }
  }
  // (b) 지면 수풀 클러스터 — 일부 클러스터는 기존 tagSway 훅으로 바람 sway(신규 시스템 금지)
  if (reg.ground) {
    const G = reg.ground;
    const gPal = (G.dry && !winter) ? [0x6a5f45, 0x746a4e, 0x66603f, 0x5d5340] : PAL;
    const nC = Math.round(G.n * years * dens);
    const swayBundles = [];
    for (let c = 0; c < nC; c++) {
      let cx = 0, cz = 0, ok = false;
      for (let tr = 0; tr < 6 && !ok; tr++) {
        const a = rand() * Math.PI * 2, rr = G.rMin + rand() * (G.rMax - G.rMin);
        cx = Math.cos(a) * rr; cz = Math.sin(a) * rr;
        ok = !G.filter || G.filter(cx, cz);
      }
      if (!ok) continue;
      const nT = 4 + Math.floor(rand() * 5), cr = 0.5 + rand() * 0.8;
      const doSway = swayBundles.length < 2 && rand() < 0.4;
      const dst = doSway ? [] : tuftGeos;
      const baseY = G.gh(cx, cz);
      for (let i = 0; i < nT; i++) {
        const tx = cx + (rand() - 0.5) * cr * 2, tz = cz + (rand() - 0.5) * cr * 2;
        const th = 0.22 + rand() * 0.42;
        const g = new THREE.ConeGeometry(0.05 + rand() * 0.08, th, 4);
        g.rotateZ((rand() - 0.5) * 0.5);
        if (doSway) g.translate(tx - cx, G.gh(tx, tz) - baseY + th / 2 - 0.02, tz - cz); // sway 클러스터는 로컬 좌표
        else g.translate(tx, G.gh(tx, tz) + th / 2 - 0.02, tz);
        dst.push(paintGeo(g, gPal[Math.floor(rand() * gPal.length)]));
        ogState.tufts++;
      }
      if (doSway && dst.length) swayBundles.push({ geos: dst, cx, cz, y: baseY });
    }
    for (const sb of swayBundles) {
      const m = new THREE.Mesh(mergeGeometries(sb.geos), ogMat());
      m.position.set(sb.cx, sb.y, sb.cz);
      tagSway(m, 0, 0.035); // F-1a [B] 기존 sway 훅 재사용 — 원점이 클러스터 밑동이라 회전 sway가 자연스럽다
      og.add(m); meshes++;
    }
  }
  // 회전 그룹 잔해 잠식(오두막 전소 잔해 등) — 로컬 좌표 병합 후 그룹 자식으로
  for (const at of reg.attach) {
    const geos = [];
    for (const bx of at.boxes) {
      const nP = Math.round(1.4 * years * dens);
      for (let i = 0; i < nP; i++) {
        const face = Math.floor(rand() * 4);
        const ph = 0.4 + rand() * Math.max(0.5, bx.h * 0.8);
        const yc = (bx.y0 || 0) + ph / 2;
        let g;
        if (face < 2) {
          g = new THREE.BoxGeometry(0.05, ph, Math.min(0.5 + rand() * 0.5, bx.d));
          g.translate(bx.x + (face ? 1 : -1) * (bx.w / 2 + 0.03), yc, bx.z + (rand() - 0.5) * bx.d * 0.5);
        } else {
          g = new THREE.BoxGeometry(Math.min(0.5 + rand() * 0.5, bx.w), ph, 0.05);
          g.translate(bx.x + (rand() - 0.5) * bx.w * 0.5, yc, bx.z + (face === 2 ? 1 : -1) * (bx.d / 2 + 0.03));
        }
        geos.push(paintGeo(g, pick()));
        ogState.patches++;
      }
    }
    if (geos.length) { const m = new THREE.Mesh(mergeGeometries(geos), ogMat()); at.group.add(m); meshes++; }
  }
  if (worldGeos.length) { og.add(new THREE.Mesh(mergeGeometries(worldGeos), ogMat())); meshes++; }
  if (tuftGeos.length) { og.add(new THREE.Mesh(mergeGeometries(tuftGeos), ogMat())); meshes++; }
  if (og.children.length) envRoot.add(og);
  ogState.drawCallsAdded = meshes; // 병합 메시 수 = 추가 드로우콜 추정치(그림자 캐스팅 없음)
}

/* ============================================================
   구역 시스템 — 한 지역 안에 여러 셸터, 지역 간 이동은 비용이 든다
============================================================ */
// DISTRICTS(지도 구역)는 src/data/world.js로 분리(콘텐츠 데이터 Phase 1).
// districtOf → core/expedition.js (import).

/* ============================================================
   게임 상태 & 저장
============================================================ */
// ---- 자원 (기획서 v0.2: 자원 보유량 및 소비) ----
// RESOURCES(자원)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
// ---- 부상 (기획서 v0.2: 부상 치료 시스템) ----
// INJURIES(부상)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
// ---- 탐험 준비물 (기획서 v0.2: 준비물 슬롯) ----
// PREPS(탐험 준비물)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).

// state / DEFAULT_STATE 는 core/state.js 로 이전 (모놀리스 분해 Phase 1). 위 import 참조.

function costLabel(cost) {
  // P2 스윕: 이모지 → 모노 아트 (toast가 innerHTML로 승격돼 전 표면 HTML 안전)
  return Object.entries(cost).map(([id, n]) => `${resIcon(id)}${LName(RESOURCES[id])} ${n}`).join(' + ');
}
// #219 준비물 행 전용 압축 코스트 — 아이콘(+×n). 좁은 관측 패널(260px)에서 행 1줄화를 위해
// 자원 이름을 뗀다. 전체 명칭 병기는 아래 '예상 소비' 라인과 부족 토스트가 담당(B-④ 원칙의 잉여 표면).
function costIcons(cost) {
  return Object.entries(cost).map(([id, n]) => `${resIcon(id)}${n > 1 ? '×' + n : ''}`).join(' ');
}
// (B-④) 보유/필요 대조 칩 공통 렌더러 — 이주 창·프로젝트 카드·셸터 카드 전부 이 한 곳을 쓴다.
//   [아이콘 이름 보유/필요] 형태로 자원 이름을 병기(아이콘+숫자만으론 무슨 아이템인지·무슨 수치인지 모른다는 신고).
//   keep-all 조판으로 이름이 줄바꿈으로 잘리지 않게. ok=충족(green)/lack=부족(red) 색 구분 유지.
function reqChip(rid, have, need) {
  const ok = have >= need;
  return `<span class="req-chip ${ok ? 'ok' : 'lack'}">${resIcon(rid)}<span class="rq-name">${LName(RESOURCES[rid])}</span> ${have}/${need}</span>`;
}
function reqChips(cost) {
  return Object.entries(cost).map(([rid, need]) => reqChip(rid, state.res[rid] || 0, need)).join('');
}
// 손재주 지식(§9): 제작 재료 ×knowCraftMul(0.8) — 각 자원 내림·최소 1. 표시·판정·소비 공통(일관성). RNG 없음(결정론).
function craftCost(c) {
  const m = knowCraftMul();
  if (m === 1) return c.cost;
  const out = {};
  for (const [rid, n] of Object.entries(c.cost)) out[rid] = Math.max(1, Math.floor(n * m));
  return out;
}
// 게이트 코스트 난이도 스케일(§F): 코어 콘텐츠 게이트(방호복/허브) 비용을 모드로 조인다. 각 자원 round·최소 1. 표시·판정·소비 공통. RNG 없음.
function gateCost(cost) {
  const m = BAL.gateCostMul[state.mode] ?? 1;
  if (m === 1) return cost;
  const out = {};
  for (const [rid, n] of Object.entries(cost)) out[rid] = Math.max(1, Math.round(n * m));
  return out;
}
// opts / OPTS_DEFAULT 는 core/state.js 로 이전 (모놀리스 분해 Phase 1). 위 import 참조.
// REQ-STEAM-01: 플랫폼 어댑터에 상태 접근자 주입 (순환 import 회피). 동작 불변 위임.
bindPlatform({
  getAchs: () => (state.achs || {}),
  setAch: (id) => { if (!state.achs) state.achs = {}; state.achs[id] = true; },
  getLang: () => opts.lang || 'ko',
});

// ── Steam Cloud 파일 미러 (REQ-STEAM-01 A안, electron 전용) ───────────────────
//   진행 세이브(슬롯·lastslot·opts·stats·keys)를 파일로도 미러링해 Steam Auto-Cloud가 동기화.
//   localStorage가 truth로 남고, 부팅 시 파일이 '더 새로울 때만' 하이드레이트 → 데이터 유실 0.
//   window.nineCloud는 electron preload에서만 붙는다(웹/오프스크린 하네스=미러 없음, 무변화).
//   반드시 loadSave()/currentSlot 계산(아래)보다 먼저 실행돼야 한다.
(function initCloudMirror() {
  const NC = (typeof window !== 'undefined') && window.nineCloud;
  if (!NC || !NC.available) return;
  // 동기화 대상 = 진행 키만 (기기 종속 nw-display/nw-widget/shelter-ui는 제외).
  const isCloudKey = k => /project-shelter/.test(k) || k === 'nw-opts' || k === 'nw-stats' || k === 'nw-keys';
  const savedAtOf = s => { try { return JSON.parse(s)?.state?.savedAt || 0; } catch (e) { return 0; } };
  // 1) 하이드레이트: 파일(Auto-Cloud 다운로드분)이 로컬보다 새로우면 반영. 절대 로컬 최신본을 덮지 않음.
  try {
    const snap = NC.snapshot || {};
    for (const k of Object.keys(snap)) {
      if (!isCloudKey(k)) continue;
      const fileVal = snap[k], localVal = localStorage.getItem(k);
      if (localVal == null) { localStorage.setItem(k, fileVal); continue; }     // 로컬에 없으면 파일 채택(새 기기 복원)
      if (/project-shelter-slot/.test(k) && savedAtOf(fileVal) > savedAtOf(localVal)) {
        localStorage.setItem(k, fileVal);                                        // 슬롯: 더 새로운 세이브만 채택
      }
      // opts/stats/lastslot/keys: 로컬 존재 시 로컬 유지(기기 연속성 우선)
    }
  } catch (e) { /* 하이드레이트 실패해도 로컬 세이브는 안전 */ }
  // 2) 미러: 이후 모든 진행 세이브 write/remove를 파일로 동시 반영(Platform.cloud + 직접 setItem 전부 포착).
  try {
    const _set = localStorage.setItem.bind(localStorage);
    const _rm = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = function (k, v) { _set(k, v); if (isCloudKey(k)) NC.write(k, v); };
    localStorage.removeItem = function (k) { _rm(k); if (isCloudKey(k)) NC.remove(k); };
  } catch (e) { /* 래핑 실패 시 로컬만 동작(무변화) */ }
})();

/* ============================================================
   난이도 모드 (v0.9.2) — 하드: 전리품 -30% · 게이지 소모 +50%
============================================================ */
// 난이도 예측자(isHard/isHardcore/isZen/isWallpaper/rescueEligible)는 core/mode.js로 이전 (분해 Phase 1). 아래 import 참조.
// 하드 전리품 -30%. EV 보존 확률적 반올림: floor만 쓰면 1개 드랍이 항상 0이 되고,
// round만 쓰면 1개가 영원히 안 줄어든다 — 소수부를 확률로 처리해 기댓값(×0.7)을 지킨다.
// 난이도별 전리품 수급 배수(디렉터 "challenging"). 이름은 하드 유래지만 이제 전 모드에 적용된다
//   — 노말도 소폭(<1.0) 조인다. wallpaper는 자원 무한이라 loot 경로를 안 타므로 무관.
function hardLoot(n) {
  const mul = BAL.economy.incomeMul[state.mode] ?? 1;
  if (mul === 1) return n;
  const x = n * mul, f = Math.floor(x);
  return f + (Math.random() < x - f ? 1 : 0);
}

/* ============================================================
   생존 게이지 (기획서: 배고픔/갈증 — cozy 방향, 사망 대신 탈진)
============================================================ */
// decayGauges → core/gauges.js (import). 배고픔/갈증 시간당 감소(계절·하드·한파·여름 배수 + autoEat).
async function eatFood() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (!hasAnyFood(1)) { toast(t('eat.noFood')); return; }
  if (state.hunger > BAL.gauges.eatFullGate) { toast(t('eat.full')); return; }
  if (!(await confirmAct('confirm.eat'))) return;
  const usedFresh = (state.res.food || 0) > 0;
  consumeAnyFood(1);
  state.hunger = Math.min(100, state.hunger + BAL.gauges.eatRestore);
  toast(t(usedFresh ? 'eat.done' : 'eat.doneCanned'));
  questProgress('eat');
  renderResBar(); updateHud(); scheduleSave();
}
async function drinkWater() {
  if (paused) { toast(t('pause.blocked')); return; }
  if ((state.res.water || 0) < 1) { toast(t('drink.noWater')); return; }
  if (state.thirst > BAL.gauges.drinkFullGate) { toast(t('drink.full')); return; }
  if (!(await confirmAct('confirm.drink'))) return;
  resConsume('water', 1);
  state.thirst = Math.min(100, state.thirst + BAL.gauges.drinkRestore);
  toast(t('drink.done'));
  questProgress('drink');
  renderResBar(); updateHud(); scheduleSave();
}
// isExhausted → core/gauges.js (import). 배고픔/갈증 바닥 판정.

/* ============================================================
   무력 상태 · 구제 1회 · 런 종료 (v1.3.0 배치 D · GD-THESIS §4.5)
   무력 = 식량·식수 재고 0 AND 배고픔·갈증·에너지 바닥.
   노말/하드: 런당 1회 구제(문 앞 꾸러미 / 헬기 보급). 이후 2번째 무력 = 런 종료.
   하드코어: 구제 없음(첫 무력이 곧 종료). 무한/배경화면: 무력 미적용.
============================================================ */
const GAUGE_FLOOR = 0; // 게이지 바닥 판정선 (구조 상수 — 밸런스 수치 아님)
function gaugesBottomed() {
  return state.hunger <= GAUGE_FLOOR && state.thirst <= GAUGE_FLOOR && state.energy <= GAUGE_FLOOR;
}
function helplessNow() {
  if (isWallpaper() || isZen()) return false;   // 무력 미적용 모드
  const foodStock = (state.res.food || 0) + (state.res.canned || 0);
  const waterStock = (state.res.water || 0);
  return foodStock <= 0 && waterStock <= 0 && gaugesBottomed();
}
let helplessBusy = false; // 구제/종료 연출 중 재진입 가드 (틱마다 재호출되므로)
// 매 상태 변화 후 호출되는 안전망 판정. 무력이면 구제 또는 종료를 연출한다.
function checkHelpless() {
  if (helplessBusy || state.runEnded || blackoutActive) return;
  if (!helplessNow()) return;
  helplessBusy = true;
  if (rescueEligible() && !state.rescueUsed) doRescue();
  else endRun();
}
// 구제 1회: 암전 → 랜덤 2종(문 앞 꾸러미 / 헬기 보급). 재기 가능선 물자 지급.
function doRescue() {
  state.rescueUsed = true;
  const heli = Math.random() < 0.5;
  if (heli) playSfx('heli');
  blackout(() => {
    // 보급량 지급 (BAL.rescue) — 재기 가능선(하루치)
    for (const [rid, n] of Object.entries(BAL.rescue)) {
      if (rid === 'unlockDay') continue;
      state.res[rid] = (state.res[rid] || 0) + n;
    }
    // 게이지도 최소 재기선까지 끌어올린다 (물자만 주고 바닥이면 즉시 재무력)
    state.hunger = Math.max(state.hunger, 40);
    state.thirst = Math.max(state.thirst, 40);
    state.energy = Math.max(state.energy, 40);
    const noteKey = heli ? 'rescue.heli.note' : 'rescue.parcel.note';
    state.dayLog.notes.push(t(noteKey));
    renderResBar(); updateHud(); flushSave();
  }, 900);
  // 연출이 끝난 뒤 수첩 한 장으로 "타인의 온기"를 전한다
  setTimeout(() => {
    helplessBusy = false;
    openJournalPages([{
      titleId: heli ? 'rescue.heli.title' : 'rescue.parcel.title',
      bodyId: heli ? 'rescue.heli.body' : 'rescue.parcel.body',
    }]);
  }, 1800);
}
// 런 종료: 암전 → 수첩 마지막 페이지 → 요약 → "끝난 기록"으로 보존.
function endRun() {
  state.runEnded = true;
  blackout(() => { flushSave(); }, 1000);
  setTimeout(() => {
    helplessBusy = false;
    setPaused(true);
    openEndedRecordPages(runSummaryLines(), { fromRun: true });
  }, 1600);
}
// 요약: 넘긴 겨울 / 수집 / 고양이 (GD-THESIS §4.5)
function runSummaryLines() {
  const collected = memosCollected() + broadcastsCollected()
    + Object.keys(state.sketches || {}).length;
  return {
    day: state.day,
    winters: state.winters || 0,
    collected,
    cat: !!state.cat,
    mode: state.mode,
  };
}
// 끝난 기록 수첩 (런 종료 직후 · 회고 재열람 공통)
function openEndedRecordPages(sum, opt = {}) {
  const catLine = sum.cat ? t('ended.summary.cat') : '';
  openJournalPages([
    { titleId: 'ended.title', bodyId: 'ended.page1' }, // "여기까지 기록이 남아 있다"
    { titleId: 'ended.summaryTitle', body: t('ended.summary', {
        day: sum.day, winters: sum.winters, collected: sum.collected, cat: catLine,
      }) },
  ], {
    onClose: () => {
      if (opt.fromRun) {
        // 런 종료 직후엔 타이틀로 (끝난 기록은 슬롯에 보존됨)
        toast(t('ended.toTitle'));
        flushSave();
        setTimeout(() => reloadWithVeil(), 400);
      }
    },
  });
}
// 끝난 기록 회고 열람 (타이틀 불러오기에서 끝난 슬롯 클릭) — 해당 슬롯 요약만 읽는다.
function openEndedRecord(n) {
  const d = readSlot(n);
  const st = d?.state;
  if (!st) { toast(t('toast.emptySlot')); return; }
  const collected = Object.keys(st.memos || {}).length + Object.keys(st.broadcasts || {}).length
    + Object.keys(st.sketches || {}).length;
  openEndedRecordPages({
    day: st.day || 1,
    winters: st.winters || 0,
    collected,
    cat: !!st.cat,
    mode: st.mode || 'normal',
  });
}

/* ── 취침 (의무 휴식 — 자원 인플레이션 방지 + 침대의 가치) ── */
const EXP_PER_DAY = BAL.exp.perDay;
// 취침/쪽잠 공통 에너지 회복 공식 (침대 유무 + 쾌적함 보너스)
// v1.2.0 취침 자율화: "몇 시에 자느냐"를 회복량으로 보상/처벌한다.
// atHour 미지정 시 현재 게임 시각 기준. collapse=true 면 05시 자동 쓰러짐(바닥 취침 수준).
function restHourMod(atHour) {
  const R = BAL.rest;
  const h = Math.floor(atHour);
  if (h >= R.earlyStartHour && h <= R.earlyEndHour) return R.earlyBonus; // 21~23시: +보너스
  if (h >= R.lateStartHour && h < R.collapseHour) {                     // 01~04시: 시간당 누적 페널티
    return -Math.min(R.lateCap, R.latePerHour * (h - R.lateStartHour + 1));
  }
  return 0; // 00~00:59(자정 직후) 및 그 외: 보정 없음
}
// 정산 경로(오프라인/백그라운드) 취침을 "정상 취침"으로 회복시킬 때 쓰는 기준 시각.
//   restHourMod의 이른 취침 보너스 구간(earlyStart~earlyEnd) 안이라 밤샘 페널티 없이 +earlyBonus가 적용된다.
//   BAL 신설 없이 구조 상수로 둔다(시각 상수 — 밸런스 수치 아님).
const SETTLE_REST_HOUR = 22;
function restEnergyValue(atHour, collapse = false) {
  const hasBed = items.some(i => i.defId === 'bed');
  const cozy = comfortDetail().score;
  const hour = atHour != null ? atHour : gameHour();
  if (collapse) {
    // 05시 자동 취침: 몸이 버티지 못하고 쓰러진다 — 회복은 바닥 취침 수준(cozy 보너스 없음).
    return { hasBed, collapse: true, energy: Math.min(100, BAL.rest.floorEnergy) };
  }
  const onsenRest = hasMod('onsen') ? BAL.highland.onsenRestBonus : 0; // 1.3 온천: 취침 에너지 회복 보너스(대형)
  // 2.0 대한파 쪽잠 규율(§9.4-③): 불침번을 서느라 제대로 못 잔다 — 프론트 기간 취침 회복 감량
  const sleepless = frontDiscipline() === 'sleepless' ? BAL.greatColdSnap.discipline.sleeplessRestPen : 0;
  const base = (hasBed ? BAL.rest.bedEnergy : BAL.rest.floorEnergy) + (cozy >= BAL.rest.cozyThreshold ? BAL.rest.cozyBonus : 0) + onsenRest - sleepless;
  // #88 탐험 피로: 한도까지 탐험한 날은 밤샘 페널티가 가중된다(이른 취침 보너스는 그대로 — 일찍 자면 무손해).
  let hourMod = restHourMod(hour);
  if (state.expFatigue != null && hourMod < 0) hourMod *= BAL.rest.expFatigueLateMult;
  const energy = Math.max(0, Math.min(100, base + hourMod));
  return { hasBed, collapse: false, energy };
}
function sleepUntilMorning(auto = false, opt = {}) {
  if (DEMO_ED && state.demoEnded) { if (!auto) toast(t('demo.end.locked')); return; } // #74: 시간 점프 봉인
  if (!auto && paused) { toast(t('pause.blocked')); return; }
  if (state.exp) { toast(t('sleep.cantDuringExp')); return; }
  if (blackoutActive) return;
  const collapse = !!opt.collapse;
  const { hasBed, energy } = restEnergyValue(gameHour(), collapse);
  blackout(() => {
    // 정점(검은 화면)에서 시간 점프·에너지 회복·노트 — 유저 눈엔 자연스러운 취침
    // 다음 07:00으로 — 저녁~자정 취침은 다음날 아침, 자정 이후(01~05시) 취침은 같은 날 아침(하루 스킵 방지).
    // 하루 정산(processDay)은 tickTime의 자정 롤오버가 이미 처리했다(같은 날 07:00으로 가면 재정산 없음).
    const dayStart = Math.floor(state.gameMin / 1440) * 1440;
    const wakeToday = dayStart + WAKE_HOUR * 60;
    state.gameMin = state.gameMin < wakeToday ? wakeToday : dayStart + 1440 + WAKE_HOUR * 60;
    state.energy = energy;
    reportQueued = true; // 디렉터: 하루 요약은 취침 시에만 — 잠들면 기상(다음 틱)에 요약을 띄운다(자정 롤오버 자체는 큐잉 안 함)
    state.expFatigue = null; // #88: 잠들면 탐험 피로 해소
    const e = Math.round(state.energy);
    // 05시 쓰러짐은 전용 문구 — 자발적 취침과 톤을 구분한다.
    const noteKey = collapse ? 'sleep.noteCollapse' : (hasBed ? 'sleep.noteBed' : 'sleep.noteFloor');
    state.dayLog.notes.push(t(noteKey, { e }));
    questProgress('sleep'); // 온보딩: 취침으로 하루 마무리 → 기상 후 아침 보고가 결산을 가르친다
    // 기상 토스트·'dawn' SFX는 페이드아웃(눈 뜨는 시점)에
    toast(collapse
      ? t('sleep.collapse', { e })
      : auto
        ? t(hasBed ? 'sleep.autoBed' : 'sleep.autoFloor', { e })
        : t(hasBed ? 'sleep.wakeBed' : 'sleep.wakeFloor', { e }));
    scheduleSave();
    updateHud();
    updateClock();
    playSfx('dawn');
    // #86: 기상 연출 — 침대가 있으면 그 위에서 눈을 뜨고(2.6초 누움→일어남), 없으면 바닥에서.
    if (typeof avatarSys !== 'undefined') {
      const bed = items.find(i => i.defId === 'bed');
      avatarSys.wakeOnBed(bed ? { x: bed.x, z: bed.z, y: BED_TOP_Y[bed.tier || 3] ?? 0.63, rot: bed.rot, defId: 'bed' } : null); // #193: 기상 눕기 y도 침대 티어 실높이 (T1/T2 공중부양 방지)
    }
    // F-1a [B] 고양이 티저: 새벽 울음 1회 (등장은 Day9 불변 — 기대감). meow 저피치로 먼 울음 느낌.
    if (state.catTeaserMeow) {
      state.catTeaserMeow = false;
      setTimeout(() => { try { playSfx(['meow1', 'meow2', 'meow3'][Math.floor(Math.random() * 3)], { rate: 0.7, jitter: 0.04, vol: 0.55 }); } catch (e) {} }, 900);
    }
  });
}

// 취침 확인창 — 현재 시각 기준 예상 회복량을 미리 보여준다 (v1.2.0 취침 자율화).
async function promptSleep() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (state.exp) { toast(t('sleep.cantDuringExp')); return; }
  if (blackoutActive) return;
  const { energy } = restEnergyValue();
  const cur = Math.round(state.energy);
  const to = Math.round(energy);
  const ok = await gameConfirm(
    t('sleep.confirm', { cur, to }),
    t('sleep.confirmYes'),
    t('confirm.cancel'),
  );
  if (ok) sleepUntilMorning();
}

/* ── 세이브 슬롯 (Steam 대비: 슬롯 3개 + 최근 슬롯 기억) ── */
// 표시할 세이브 슬롯 칸수 = max(5, 채워진 슬롯+1) — 항상 빈 칸 1개 이상, 사실상 무한.
// 저장 키는 slot1.. 연속. 구 3슬롯은 그대로 slot1~3에 남아 완전 호환.
const SLOT_MIN = 5;
// 채워진 슬롯의 최대 번호를 찾아, 그보다 1칸 더(빈 칸) 보여준다. 하한 SLOT_MIN.
function slotDisplayCount() {
  let maxFilled = 0;
  // 상한 없이 스캔하되 실무 안전 상한(200) — 사용자가 200칸을 채우는 일은 없다.
  for (let n = 1; n <= 200; n++) { if (localStorage.getItem(slotKey(n))) maxFilled = n; }
  return Math.max(SLOT_MIN, maxFilled + 1);
}
const slotKey = n => `${KEY_NS}project-shelter-slot${n}`; // #89: QA 에디션은 qa- 네임스페이스 — 정식 세이브와 불가침

/* ── 계정 통계 (세이브 아닌 로컬 영속, Platform 어댑터 경유) ──
   배경화면 모드 해금(노말 누적 최고 생존일 ≥ BAL.rescue.unlockDay) 판정용.
   QA 치트로 오염된 런은 집계하지 않는다(qaUsed). */
function readStats() {
  try { return JSON.parse(Platform.cloud.load('nw-stats') || '{}') || {}; } catch (e) { return {}; }
}
function writeStats(s) { Platform.cloud.save('nw-stats', JSON.stringify(s)); }
// 계정 통계 갱신 (#158 모드 언락): bestDay=모드 무관 최고 생존일, normalBestDay=코지(노말) 최고 생존일.
function recordNormalDay(day) {
  if (_simRunning || state.qaUsed) return; // 시뮬레이션/QA는 계정 통계 오염 금지
  const s = readStats();
  let dirty = false;
  if ((s.bestDay || 0) < day) { s.bestDay = day; dirty = true; }
  if (state.mode === 'normal' && (s.normalBestDay || 0) < day) { s.normalBestDay = day; dirty = true; }
  if (dirty) writeStats(s);
}
// 겨울 N번 넘김 판정: 1년 = SEASON_DAYS×4 — N년째 봄(=N×48+1일) 도달이 곧 겨울 N번 통과.
const wintersPassedOf = (day) => Math.floor(((day || 0) - 1) / (SEASON_DAYS * 4));
// 꾸미기/배경화면 해금(피드백 완화): "봄 지나면" — 코지(노말) 최고 생존일이 첫 봄을 넘겨 여름 진입(day≥13).
function wallpaperUnlocked() { return (readStats().normalBestDay || 0) >= BAL.modes.wallpaperUnlockDay; }
// 무한 해금 (#158): 어느 모드로든 겨울 1번 — 구버전 스탯(bestDay 부재)은 normalBestDay 폴백.
function zenUnlocked() { const s = readStats(); return wintersPassedOf(Math.max(s.bestDay || 0, s.normalBestDay || 0)) >= BAL.modes.zenWinters; }
let currentSlot = parseInt(localStorage.getItem(LASTSLOT_KEY) || '1', 10) || 1;
function readSlot(n) {
  try { return JSON.parse(localStorage.getItem(slotKey(n)) || 'null'); } catch (e) { return null; }
}
function slotMeta(n) {
  const d = readSlot(n);
  if (!d?.state) return null;
  const st = d.state;
  const se = SEASONS[Math.floor(((st.day || 1) - 1) / SEASON_DAYS) % 4];
  return {
    day: st.day || 1, season: se, shelter: SHELTERS[st.current] ? SHELTERS[st.current] : SHELTERS.container,
    successes: st.successes || 0, mode: ['hard', 'zen', 'hardcore', 'wallpaper'].includes(st.mode) ? st.mode : 'normal',
    runEnded: !!st.runEnded, // 끝난 기록(이어하기 불가, 회고 열람만)
    // Nine Winters(#11): 슬롯/이어하기에 겨울 수 (없으면 day로 역산 — 마이그레이션과 동일 규칙)
    winters: st.winters != null ? st.winters : Math.floor(((st.day || 1) - 1) / SEASON_DAYS / 4),
    qaUsed: !!st.qaUsed,
    saved: st.savedAt ? new Date(st.savedAt).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
  };
}
let saveTimer = null;
let saveFailWarned = false; // 저장 실패 토스트 세션 1회 가드 (doSaveNow)
function doSaveNow() {
  if (QA_ED) state.qaUsed = true; // #89: QA 에디션 세이브는 전부 오염 각인 — 정식 빌드로 옮겨 심어도 업적·통계 무효
  // P1-A: 게임을 시작한 적 없는 첫 실행에서 타이틀 조작(언어/설정)이
  // 유령 세이브('이어하기' 오노출)를 만들지 않게 — 슬롯이 없고 아직 타이틀이면 옵션만 전역 키에 저장
  const slotExists = !!localStorage.getItem(slotKey(currentSlot));
  if (titleVisible && !slotExists) {
    try { localStorage.setItem('nw-opts', JSON.stringify(opts)); } catch (e) { /* 저장 불가 무시 */ }
    return;
  }
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 }));
  state.savedAt = Date.now();
  // REQ-STEAM-01: 세이브 경로를 클라우드 어댑터 경유 (현재 localStorage 위임 — 동작 불변, Steam Cloud 미러 지점).
  // 슬롯 저장 실패(quota 초과 등)는 조용히 삼키지 않는다 — 세션당 1회 고지 (스팸 방지, 진행은 계속).
  const okSave = Platform.cloud.save(slotKey(currentSlot), JSON.stringify({ state, opts }));
  if (!okSave && !saveFailWarned) { saveFailWarned = true; toast(t('save.failed')); }
  Platform.cloud.save(LASTSLOT_KEY, String(currentSlot));
  Platform.cloud.save('nw-opts', JSON.stringify(opts)); // 전역 옵션 동기화 (언어/음량 승계용)
  checkAchievements();               // 업적 체크 (모든 변화는 저장을 거친다)
  updateHud();                       // 쾌적함 반영
  if (!state.exp) renderExpPanel();  // 보정된 성공률 반영
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(doSaveNow, 400);
}
// 예약된 저장이 있으면 즉시 실행 (내보내기 등 저장 직후 원본이 필요한 경우)
function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  doSaveNow();
}
function backupKey(n) { return `${slotKey(n)}-bak`; }
function loadSave() {
  try {
    // 구버전 단일 세이브 → 슬롯 1로 이전
    const legacy = localStorage.getItem(SAVE_KEY);
    if (legacy && !localStorage.getItem(slotKey(1))) {
      localStorage.setItem(slotKey(1), legacy);
      localStorage.removeItem(SAVE_KEY);
    }
    let data;
    try {
      data = readSlot(currentSlot);
      if (localStorage.getItem(slotKey(currentSlot)) && !data) throw new Error('corrupt');
    } catch (e) {
      // 메인 슬롯 손상 → 어제 백업 시도
      try {
        const bak = localStorage.getItem(backupKey(currentSlot));
        data = bak ? JSON.parse(bak) : null;
        if (data) {
          localStorage.setItem(slotKey(currentSlot), bak);
          toast(t('save.corrupt'));
        }
      } catch (e2) { data = null; }
    }
    if (!data) { currentSlot = 1; data = readSlot(1); }
    if (data) {
      const oldVer = data.state?.ver || 2;
      const defaults = JSON.parse(JSON.stringify(state)); // 신규 필드 기본값 보존
      Object.assign(state, data.state);
      Object.assign(opts, data.opts);
      // 효과음/배경음 기본값 하향 마이그레이션 (구 기본값은 사용자가 고른 값이 아님)
      if (opts.sfxVol === 0.7) opts.sfxVol = 0.07;
      if (opts.bgmVol === 0.35) opts.bgmVol = 0.15;
      // 버전 마이그레이션(v2→v3) + 신규 필드 기본값 보정(누적 가드) → core/save.js.
      //   Object.assign(state,data.state) 후 호출. rawState=data.state(필드 유무 판정), defaults=pristine 복사.
      migrateLoadedState(data.state, defaults, oldVer);
      // #119 서포터팩 러시안블루 보장 지급(귀향): 이미 고양이가 있는 DLC 소유 세이브도 러시안블루로 승격
      //   (입양 전 구매·다른 코트 보유 케이스). 코트 선택 UI가 없어 idempotent — DLC 없으면 무변.
      if (state.cat && state.catCoat !== 'russianblue' && Platform.dlc.owns('supporter')) state.catCoat = 'russianblue';
      // 오프라인 시간 진행 (최대 2일) + 그동안의 허기/갈증
      const elapsed = Math.max(0, (Date.now() - (state.savedAt || Date.now())) / 1000);
      const offlineMin = Math.min(2880, elapsed * GAME_MIN_PER_SEC * BAL.exp.idleTimeScale); // 평시 배속과 일관(자리 비운 동안도 같은 속도) — 상한 2게임일 유지
      state.gameMin += offlineMin;
      decayGauges(offlineMin);
      rollOfflineGift(offlineMin); // DDD-5 복귀 서프라이즈 — 반나절 이상 비웠다면 가끔 작은 따뜻함이 문가에
      return true;
    }
  } catch (e) { /* ignore */ }
  return false;
}

// DDD-5 복귀 서프라이즈 (방치형 재접속 훅): 오프라인 4게임시간+ 시 35%로 소액 선물 1건 — 수첩 노트로만
//   조용히 알린다(다음 결산에 노출, 토스트 없음 — 조용한 발견). 손실 서프라이즈 금지(코지 안전선),
//   도료·도면 등 희귀는 능동 플레이 전용 유지. 로드 경로라 sim/시드 무접점.
function rollOfflineGift(offlineMin) {
  if (offlineMin < 240 || Math.random() >= 0.35) return false;
  if (state.cat && Math.random() < 0.6) { resAdd('cloth', 1); state.dayLog.notes.push(t('offline.catGift')); }
  else { resAdd('food', 1); state.dayLog.notes.push(t('offline.birdGift')); }
  return true;
}
/* ============================================================
   아이템 관리 (배치 / 이동 / 충돌 / 인벤토리)
============================================================ */
// items(배치 가구 배열)는 core/state.js로 이전 (공유 가변 상태). 아래 itemsRoot 등 렌더 컨테이너만 잔류.
const itemsRoot = new THREE.Group();
scene.add(itemsRoot);

function footprintOf(item) {
  const fp = DEFS[item.defId].fp;
  return item.rot % 2 ? { w: fp.d, d: fp.w } : { w: fp.w, d: fp.d };
}
// 발광 가구 공용 헤일로 텍스처 (방사형 그라데이션) — 광원 주위에 "빛나는 티"를 내는 스프라이트용
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.32)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(cv);
  return _glowTex;
}
// 퀄업 B1 접지 콘택트 셰도 텍스처 (공용 1장): 부드러운 방사 감쇠의 어두운 얼룩 —
//   방향광 실그림자(#120)가 못 주는 "발밑 눌림"(AO 근사). 픽셀화 파이프가 도트 결로 뭉쳐준다.
let _ctShadowTex = null;
function contactShadowTex() {
  if (_ctShadowTex) return _ctShadowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(32, 32, 3, 32, 32, 31);
  gr.addColorStop(0, 'rgba(10,8,6,0.30)');
  gr.addColorStop(0.55, 'rgba(10,8,6,0.20)');
  gr.addColorStop(1, 'rgba(10,8,6,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  _ctShadowTex = new THREE.CanvasTexture(cv);
  return _ctShadowTex;
}
/* ④ 제작 손맛 연출 (GD-THESIS L1): 제작 완료 시 결과물 아이콘 스프라이트가 작업대 위로 ~1초
   떠올랐다 사라지고, 반짝임 입자 3~4개가 함께 튄다. 기존 craft 사운드는 호출부에서 유지. */
// #213 이모지 전멸: 이모지 캔버스 텍스처 → 실아이콘 PNG 텍스처 (터미널 베이스에 컬러 이모지 금지)
//   [주의] 함정 2건(실캡처 검거): ①사후 map 할당+needsUpdate는 스프라이트가 안 그려짐 — 생성자 map만.
//   ②THREE.TextureLoader는 crossOrigin 기본값 때문에 file://(dist)에서 조용히 실패할 수 있다 —
//   crossOrigin 없는 맨 Image 태그를 THREE.Texture에 직결(본편 CanvasTexture와 동일한 소스 직결 사상).
const _craftTexCache = new Map(); // iconId → THREE.Texture (이미지 도착 시 needsUpdate로 자동 표시)
function craftIconTex(iconId) {
  let tex = _craftTexCache.get(iconId);
  if (tex) return tex;
  const img = new Image();
  tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; // 도트 아이콘 — 확대 보간 금지
  // ③(진범) 아이콘 PNG는 192px = NPOT — Texture 기본 minFilter(mipmap)가 NPOT에서 텍스처 incomplete
  //   → 상태는 전부 정상인데 투명하게 그려진다. CanvasTexture가 무사했던 이유 = 기본이 mipmap 없는 Linear.
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  img.onload = () => { tex.needsUpdate = true; };
  img.onerror = () => console.warn('[craftfx] 아이콘 텍스처 로드 실패:', iconId);
  img.src = 'img/icons/' + iconId + '.png';
  _craftTexCache.set(iconId, tex);
  return tex;
}
let _sparkTex = null;
function sparkTex() {
  if (_sparkTex) return _sparkTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 32;
  const g2 = cv.getContext('2d');
  const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 15);
  gr.addColorStop(0, 'rgba(255,247,214,1)');
  gr.addColorStop(0.4, 'rgba(255,230,150,0.7)');
  gr.addColorStop(1, 'rgba(255,220,120,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32);
  _sparkTex = new THREE.CanvasTexture(cv);
  return _sparkTex;
}
const craftFx = []; // 진행 중인 제작 연출 { grp, sprites[], t, dur }
const CRAFT_FX_DUR = 1.05; // 아이콘 떠오름 지속(~1초). 렌더 연출 상수.
// 작업대 위치: 배치된 table 가구가 있으면 그 위, 없으면 셸터 중앙 낮은 지점.
function craftAnchor() {
  let best = null;
  for (const it of items) {
    const surf = DEFS[it.defId]?.surface; // 상판 있는 가구(테이블/작업대 등)
    if (surf) {
      // 화면 중앙에 가장 가까운 상판을 우선(여러 개면)
      const d = Math.hypot(it.x - camCenter.x, it.z - camCenter.z);
      if (!best || d < best.d) best = { x: it.x, z: it.z, y: (it.y || 0) + (surf.y ?? 0.5) + 0.12, d };
    }
  }
  if (best) return best;
  return { x: camCenter.x, z: camCenter.z, y: 0.7 };
}
function spawnCraftFx(iconId) {
  if (opts.reduceMotion) return; // 접근성: 흔들림·깜빡임 감소 시 연출 생략
  const a = craftAnchor();
  const grp = new THREE.Group();
  grp.position.set(a.x, a.y, a.z);
  // 결과물 아이콘 스프라이트 — 생성자 map(스파클과 동일 경로). 의류 등 아이콘 부재는 스파클만.
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: iconId ? craftIconTex(iconId) : null,
    transparent: true, opacity: 0, depthWrite: false, depthTest: false,
  }));
  if (!iconId) icon.visible = false; // map 없는 스프라이트 = 흰 사각형 방지
  icon.scale.set(0.5, 0.5, 1);
  grp.add(icon);
  // 반짝임 입자 3~4개
  const sprites = [];
  const nSpark = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < nSpark; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sparkTex(), transparent: true, opacity: 0, depthWrite: false, depthTest: false,
      blending: THREE.AdditiveBlending,
    }));
    const ang = Math.random() * Math.PI * 2, rad = 0.12 + Math.random() * 0.18;
    sp.userData.ox = Math.cos(ang) * rad;
    sp.userData.oz = Math.sin(ang) * rad;
    sp.userData.oy = 0.1 + Math.random() * 0.35;
    sp.userData.ph = Math.random();
    sp.scale.set(0.14, 0.14, 1);
    grp.add(sp);
    sprites.push(sp);
  }
  scene.add(grp);
  craftFx.push({ grp, icon, sprites, t: 0, dur: CRAFT_FX_DUR });
}
function updateCraftFx(dt) {
  for (let i = craftFx.length - 1; i >= 0; i--) {
    const fx = craftFx[i];
    fx.t += dt;
    const u = fx.t / fx.dur; // 0→1
    if (u >= 1) {
      scene.remove(fx.grp);
      fx.icon.material.map = null; fx.icon.material.dispose(); // 스프라이트 재질만 해제(공유 텍스처는 캐시 유지)
      for (const sp of fx.sprites) sp.material.dispose();
      craftFx.splice(i, 1);
      continue;
    }
    // 아이콘: 위로 떠오르며(0→0.55) 페이드 인(0~0.25) 후 유지, 후반(0.7~1) 페이드 아웃
    fx.icon.position.y = 0.55 * (1 - Math.pow(1 - u, 2)); // 이즈아웃 상승
    const inA = Math.min(1, u / 0.22);
    const outA = u > 0.7 ? Math.max(0, 1 - (u - 0.7) / 0.3) : 1;
    fx.icon.material.opacity = inA * outA;
    const pop = u < 0.3 ? 0.5 + Math.sin(u / 0.3 * Math.PI) * 0.12 : 0.5; // 등장 시 살짝 팝
    fx.icon.scale.set(pop, pop, 1);
    // 반짝임: 바깥·위로 튀며 반짝 명멸 후 소멸
    for (const sp of fx.sprites) {
      const su = Math.min(1, u * 1.3);
      sp.position.set(sp.userData.ox * su, sp.userData.oy * su + 0.15, sp.userData.oz * su);
      const flick = 0.6 + 0.4 * Math.sin((u * 12 + sp.userData.ph * 6));
      sp.material.opacity = Math.max(0, (1 - su)) * flick;
    }
  }
}
function buildItemGroup(item) {
  const def = DEFS[item.defId];
  const g = def.build(def.colors[item.colorIdx], item.colorIdx, item.sketch || null, item.tier || 3); // 3인자: 액자 스케치(DDD-2, frame) · 4인자: 가구 티어(#157, tiered 가구만 분기)
  item.glowMeshes = [];
  g.traverse(o => {
    if (o.isMesh) {
      o.userData.origEmissive = o.material.emissive ? o.material.emissive.getHex() : 0;
      o.userData.origEmissiveI = o.material.emissiveIntensity ?? 1;
      if (o.userData.glow) item.glowMeshes.push(o);
    }
  });
  // 퀄업 B1: 접지 콘택트 셰도 — 가구 footprint 타원 데칼(그룹 자식이라 회전·스택 y 자동 동행.
  //   스택 배치면 상판 위 그림자가 된다 — 그것도 맞는 그림, 라이트 풀과 동일 사상).
  //   러그(floorLift)는 평면 깔개라 얼룩으로 읽혀 제외. raycast noop(#228② — 데칼이 픽킹을 삼키면 안 됨).
  if (!def.floorLift) {
    const fp = def.fp;
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: contactShadowTex(), transparent: true, depthWrite: false,
    }));
    cs.rotation.x = -Math.PI / 2;
    cs.scale.set(fp.w * 1.35, fp.d * 1.35, 1);
    cs.position.set(0, 0.018, 0); // 라이트 풀(0.025)보다 아래 — 빛 웅덩이가 그림자 위에 얹힌다
    cs.renderOrder = 1;           // 러그 등 얇은 바닥재 위에 얹히게 (라이트 풀과 동일)
    cs.raycast = () => {};
    g.add(cs);
  }
  if (def.light) {
    // #196: 티어로 발광부 위치가 변하는 가구(스토브 T1 깡통·램프 T1 측면 전구)는 anchorByTier 오버라이드 —
    //   PointLight·헤일로가 같은 앵커를 쓰므로 여기 한 곳이면 정합. 표에 없으면 기존 def.light.y 고정.
    const _la = (def.light.anchorByTier || {})[item.tier || 3] || {};
    const _lx = _la.x ?? 0, _ly = _la.y ?? def.light.y;
    const L = new THREE.PointLight(def.light.color, def.light.intensity, def.light.dist, 1.8);
    L.position.set(_lx, _ly, 0);
    g.add(L);
    item.lightObj = L;
    item.lightBase = def.light.intensity;
    // 헤일로: 포인트 라이트만으론 광원 자체가 빛나 보이지 않는다 — 가산 스프라이트로 발광체 표식
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex(), color: def.light.color, blending: THREE.AdditiveBlending,
      transparent: true, opacity: 0.3, depthWrite: false,
    }));
    const sc = Math.max(0.85, def.light.dist * 0.16);
    sp.scale.set(sc, sc, 1);
    sp.position.set(_lx, _ly, 0); // #196: 헤일로도 티어 앵커 공유
    sp.raycast = () => {}; // #228②: 헤일로가 픽킹 히트를 넓힘(가구 밖 클릭=선택 오발) — 장식 잎과 동일 처방
    g.add(sp);
    item.glowSprite = sp;
    item.glowBase = 0.3;
    // #189 P4 「감동」 연출 ①: 바닥 라이트 풀 — 광원 아래 부드러운 빛 웅덩이(반사의 픽셀 정합 해석).
    //   가산 원형 그라데이션 1장(정적) — 블룸 남발 금지 원칙: 광원당 딱 한 겹, 저채도 저오퍼시티.
    //   스택 배치(테이블 위 등)면 상판 위 웅덩이가 된다 — 그것도 맞는 그림.
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
      map: glowTex(), color: def.light.color, transparent: true, opacity: 0.13,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.025, 0);
    pool.scale.setScalar(Math.max(0.9, def.light.dist * 0.42));
    pool.renderOrder = 1; // 러그 등 얇은 바닥재 위에 확실히 얹히게
    pool.raycast = () => {}; // #228②: 빛 웅덩이 원판(지름 수 유닛)이 히트 영역을 삼킴 — 시각 메시만 픽킹
    g.add(pool);
    item.lightPool = pool;
    if (item.gel) applyGel(item); // #189 P3: 재빌드(recolorItem·도색 등) 시 젤 색 유지 — 리그 완성 후 적용
  }
  g.userData.item = item;
  return g;
}
// #189 P3 조명 젤: 광원·헤일로·발광 메시를 도료 계열 색으로 틴트. item.gel=null이면 원색 복원.
//   화기(불꽃)는 def.light.gelable이 없어 UI에서 걸러진다 — 이 함수는 값 적용만 담당.
// #228⑥: 도료 스와치는 화면용 톤이라 원색(웜 화이트 계열)보다 시감 휘도가 낮아 PointLight에 그대로
//   곱하면 방이 침침해진다(디렉터 실기 신고). 색(hue·무드)은 스와치 그대로 두고 — 젤의 목적은 색감이다 —
//   광원 강도(lightBase)를 시감 휘도비로 보상한다. flicker 루프가 lightBase 기준이라 매 프레임 덮여도 정합.
//   (1차 시도였던 HSL 명도 승격은 무채 스와치(목탄)에서 시감 휘도를 못 따라가 실캡처 기각 — luma 보상으로 교체.)
const _gelC = new THREE.Color();
function gelBoost(swatchHex, baseHex) {
  const luma = h => { _gelC.setHex(h); return 0.2126 * _gelC.r + 0.7152 * _gelC.g + 0.0722 * _gelC.b; };
  const ls = luma(swatchHex), lb = luma(baseHex);
  return ls > 0.02 ? Math.min(2.4, Math.max(1, lb / ls)) : 2.4; // 상한 2.4 — 극저휘도 스와치 폭주 방지
}
function applyGel(item, previewFam) {
  const def = DEFS[item.defId];
  if (!def?.light) return;
  const fam = previewFam !== undefined ? previewFam : (item.gel || null); // #228⑦: 미리보기 오버라이드
  const hex = (fam && PAINT_ALL[fam]?.swatch != null) ? PAINT_ALL[fam].swatch : def.light.color;
  item.lightBase = def.light.intensity * (fam ? gelBoost(hex, def.light.color) : 1); // 시감 휘도 보상(원색=1)
  if (item.lightObj) { item.lightObj.color.setHex(hex); item.lightObj.intensity = item.lightBase; }
  if (item.glowSprite) item.glowSprite.material.color.setHex(hex);
  if (item.lightPool) item.lightPool.material.color.setHex(hex); // #189 P4: 바닥 풀도 함께 물든다
  for (const m of item.glowMeshes || []) {
    if (!m.material?.emissive) continue;
    m.material.emissive.setHex(fam ? hex : m.userData.origEmissive);
  }
}
function syncTransform(item) {
  item.group.position.set(item.x, item.y || 0, item.z);
  item.group.rotation.y = item.rot * Math.PI / 2;
  shadowDirty();
}
function addItem(defId, colorIdx, x, z, rot, on = true, y = 0, tier = 0) {
  // #157 가구 티어: tiered 가구만 유효(1~3). 미지정=3 — 구세이브의 기존 배치는 현행 모델(T3) 그대로.
  const item = { defId, colorIdx, x, z, rot, on, y, support: null, tier: DEFS[defId].tiered ? (tier || 3) : 0 };
  item.group = buildItemGroup(item);
  syncTransform(item);
  itemsRoot.add(item.group);
  items.push(item);
  if (DEFS[defId].light || DEFS[defId].appliance) setItemPower(item, on);
  return item;
}
// 조명 전원 (기획서 v0.2: 조명 ON/OFF + 일일 소비)
// silent=false(사용자가 직접 토글할 때만)이면 촛불류(candle/lantern) 켜고 끌 때 성냥음 재생.
// 연료 부족 자동 꺼짐(processDay)이나 배치/로드 시 초기화에서는 silent 기본값(true)이라 재생되지 않는다.
// #228⑤: 전력원 술어 — 배터리 구동 설비(전기등·LED·가전)는 태양광 개조 또는 가동 중 발전기(연료 보유)가
//   있어야 켤 수 있다(디렉터: "led등 같이 전기를 사용하는 건 태양열을 달아야지만"). 설치 자체는 허용(꾸미기
//   자유·수거 없이 준비 가능) — 게이트는 '통전'이다. 배경화면 모드는 관전용이라 면제.
function powerAvailable() {
  return isWallpaper() || hasMod('solar')
    || items.some(i2 => DEFS[i2.defId].appliance?.effect === 'power' && i2.on !== false && (state.res.fuel || 0) > 0);
}
function setItemPower(item, on, { silent = true } = {}) {
  const fuel = DEFS[item.defId].light?.fuel || DEFS[item.defId].appliance?.fuel;
  if (on && fuel === 'battery' && !powerAvailable()) {
    item.on = false; // 전력원 없음 — 통전 거부(로드·재빌드 경로도 동일하게 소등돼 구세이브가 새 규칙에 수렴)
    if (!silent) toast(t('power.needSource'), 'warn');
    on = false;
  }
  item.on = on;
  if (item.lightObj) item.lightObj.visible = on;
  if (item.glowSprite) item.glowSprite.visible = on;
  if (item.lightPool) item.lightPool.visible = on; // #189 P4 바닥 라이트 풀
  for (const m of (item.glowMeshes || [])) {
    m.material.emissiveIntensity = on ? m.userData.origEmissiveI : 0.03;
  }
  if (!silent && ['candle', 'lantern'].includes(item.defId)) {
    playSfx('candle_light', { vol: 0.6, jitter: 0.04 });
  }
  shadowDirty();
}
function removeItem(item) {
  itemsRoot.remove(item.group);
  disposeDeep(item.group);
  const i = items.indexOf(item);
  if (i >= 0) items.splice(i, 1);
  catSys.setCatSupportDirty(true); // ⑥a: 다음 틱에 퍼치 중인 고양이 지지면 유효성 1회 검사 (사라졌으면 hop 착지)
  shadowDirty();
}
function recolorItem(item, colorIdx) {
  item.colorIdx = colorIdx;
  itemsRoot.remove(item.group);
  disposeDeep(item.group);
  item.lightObj = null;
  item.group = buildItemGroup(item);
  syncTransform(item);
  itemsRoot.add(item.group);
  if (DEFS[item.defId].light || DEFS[item.defId].appliance) setItemPower(item, item.on !== false);
}
function clampToRoom(item, x, z) {
  const fp = footprintOf(item);
  const mx = ROOM.w / 2 - fp.w / 2 - 0.06, mz = ROOM.d / 2 - fp.d / 2 - 0.06;
  // 2.0 발코니 배치 칸 (디렉터 2026-07-09): META.balcony가 있는 셸터는 허용 소품(방석·촛대류)에 한해
  //   방 밖 발코니 사각형에도 놓을 수 있다. 포인터가 방 앞 경계(-z 조망면)를 넘으면 발코니로 클램프 —
  //   드래그가 자연스럽게 두 존을 오간다. 저장/로드도 이 함수를 지나므로 발코니 좌표가 그대로 보존된다.
  const bal = SHELTERS[state.current]?.balcony;
  if (bal && bal.allow.includes(item.defId) && z < -mz) {
    const bx0 = bal.x0 + fp.w / 2, bx1 = bal.x1 - fp.w / 2, bz0 = bal.z0 + fp.d / 2, bz1 = bal.z1 - fp.d / 2;
    if (bx1 >= bx0 && bz1 >= bz0) return [THREE.MathUtils.clamp(x, bx0, bx1), THREE.MathUtils.clamp(z, bz0, bz1)];
  }
  return [THREE.MathUtils.clamp(x, -mx, mx), THREE.MathUtils.clamp(z, -mz, mz)];
}
// 표면 스태킹: 소품(stackable)을 테이블 등(surface) 위에 올릴 수 있다
function surfaceRectOf(other) {
  const s = DEFS[other.defId].surface;
  if (!s) return null;
  // #196: 티어로 상판 높이가 변하는 가구(드레서 T1 종이상자)는 surfaceYByTier 실측 우선 — TIER_TOP_Y와 같은 문법
  const sy = (DEFS[other.defId].surfaceYByTier || {})[other.tier || 3] ?? s.y;
  return other.rot % 2 ? { w: s.d, d: s.w, y: sy } : { w: s.w, d: s.d, y: sy };
}
function findSupport(item, x, z) {
  if (!DEFS[item.defId].stackable) return null;
  const fp = footprintOf(item);
  for (const other of items) {
    // 1단만 허용: 상판 위 소품은 지지대가 될 수 없다. #209 정정 — 판정을 `other.y`(높이)에서
    //   `other.support`(상판 위에 있는가)로 바꾼다. 러그 바닥 올림이 생기며 테이블 y가 0이 아닐 수
    //   있게 됐는데, 옛 판정은 그런 테이블을 지지대에서 제외해 **러그 위 테이블엔 아무것도 못 올렸다**(실측).
    if (other === item || other.support) continue;
    const sr = surfaceRectOf(other);
    if (!sr) continue;
    // 소품 중심이 상판 안쪽에 있으면 올려놓기 (살짝 걸치는 건 허용)
    if (Math.abs(x - other.x) <= Math.max(0.02, sr.w / 2 - fp.w * 0.3) &&
        Math.abs(z - other.z) <= Math.max(0.02, sr.d / 2 - fp.d * 0.3)) {
      return { other, y: sr.y + (other.y || 0) }; // #209: 상판 높이는 지지대 자신의 y(러그 위면 +) 기준
    }
  }
  return null;
}
function itemsOn(support) { return items.filter(i => i.support === support); }
/* ── #209 바닥 올림 (러그) ──
   디렉터 신고 "러그인지 침대인지, 아직도 접합 아니야"의 구조적 원인은 두 겹이었다:
   ① 러그는 noCollide라 겹침 가드가 전무 → 두 러그의 상면이 비트 단위로 동일 평면 = z-fighting
   ② 러그가 스택면을 안 줘서 위에 놓은 침대가 러그 두께만큼 파묻힘
   둘 다 "러그 위에 있는 것의 y가 0으로 고정"이 원인이라 한 축으로 푼다. surface/stackable(테이블
   상판 문법)을 재사용하지 않는 이유: findSupport는 '올리는 쪽'이 stackable이길 요구하므로 침대를
   stackable로 만들어야 하고, 그러면 침대를 테이블 위에 올릴 수 있게 된다(규칙 붕괴).
   floorLift는 얹히는 쪽 조건이 없다 — 바닥이 그만큼 높아진 것으로 취급한다. */
function floorTopOf(o) {
  const d = DEFS[o.defId];
  if (!d || !d.floorLift) return 0;
  return (d.floorTopByTier || {})[o.tier || 3] || 0;
}
// (x,z)에 놓일 item의 바닥 높이. 러그 여러 장이 겹쳐도 (러그 자신의 y + 상면)의 최대값 = 맨 위 층.
// 러그끼리는 서열이 필요하다(실측으로 검거): 서열 없이 서로를 들어올리면 재접지 루프가 A→C→B→…로
//    물려 0.065→0.114→0.164로 폭주하고 맨 처음 러그마저 뜬다. 서열 = **배치 순서**(나중에 깐 것이 위) —
//    items 배열 인덱스가 곧 순서이고 세이브에도 그 순서로 직렬화되므로 로드 후에도 같은 결과가 나온다.
function floorLiftAt(item, x, z) {
  const meRug = !!floorTopOf(item);
  const selfIdx = items.indexOf(item); // 배치 중(아직 미등록)이면 -1 = 맨 위 취급
  let y = 0;
  for (let i = 0; i < items.length; i++) {
    const other = items[i];
    if (other === item || other.support) continue;      // 상판 위 소품은 바닥이 아니다
    if (meRug && selfIdx >= 0 && i > selfIdx) continue; // 나보다 나중에 깔린 러그는 나를 못 올린다
    const top = floorTopOf(other);
    if (!top) continue;
    const ofp = footprintOf(other);
    // 중심이 러그 풋프린트 안일 때만 얹는다 — 가장자리에 살짝 걸친 가구가 통째로 뜨는 것 방지
    if (Math.abs(x - other.x) <= ofp.w / 2 && Math.abs(z - other.z) <= ofp.d / 2) {
      y = Math.max(y, (other.y || 0) + top);
    }
  }
  return y;
}
// 배치/회전/로드 공통: 상판 지지대가 있으면 그 위, 없으면 바닥 올림(러그) 높이.
function restingY(item, x, z) {
  if (item._support) return item._support.y;
  return Math.max(floorLiftAt(item, x, z), balconyLiftAt(item, x, z)); // #209 발코니 데크 상면 접지
}
// #209 발코니: 데크 플랭크 상면(bal.y=0.023)이 실내 바닥(0)보다 높다 — 사각형 안 허용 소품은 그 높이로 접지.
function balconyLiftAt(item, x, z) {
  const bal = SHELTERS[state.current]?.balcony;
  if (!bal || !bal.y || !bal.allow.includes(item.defId)) return 0;
  return (x >= bal.x0 && x <= bal.x1 && z >= bal.z0 && z <= bal.z1) ? bal.y : 0;
}
function collides(item, x, z) {
  if (DEFS[item.defId].noCollide) return false;
  const sup = findSupport(item, x, z);
  item._support = sup;
  const fp = footprintOf(item);
  for (const other of items) {
    if (other === item || DEFS[other.defId].noCollide) continue;
    if (sup) {
      // 표면 위: 지지대와는 겹쳐도 되고, 같은 표면 위 소품끼리만 충돌
      if (other === sup.other || other.support !== sup.other) continue;
    } else if (other.support) continue; // 상대가 표면 위에 있으면 바닥과는 무관
    const ofp = footprintOf(other);
    if (Math.abs(x - other.x) < (fp.w + ofp.w) / 2 - 0.02 &&
        Math.abs(z - other.z) < (fp.d + ofp.d) / 2 - 0.02) return true;
  }
  if (sup) return false;
  for (const b of blockers) {
    if (Math.abs(x - b.x) < (fp.w + b.w) / 2 - 0.02 &&
        Math.abs(z - b.z) < (fp.d + b.d) / 2 - 0.02) return true;
  }
  // #86③ (디렉터: "사람이 있으면 그 위에 설치 안되게"): '나'가 선 자리엔 바닥 설치 불가.
  //   이 함수는 배치 프리뷰 이동마다 호출된다 — 아바타 비켜서기 트리거도 같은 지점에서 겸한다.
  if (typeof avatarSys !== 'undefined' && avatarSys.blocksPlacement(x, z, fp)) return true;
  return false;
}
// 지지대가 사라지거나 이동했을 때 위에 있던 소품 정리
function dropChildrenOf(support) {
  for (const ch of itemsOn(support)) {
    ch.support = null; ch.y = 0;
    if (collides(ch, ch.x, ch.z)) {
      state.inventory[ch.defId] = (state.inventory[ch.defId] || 0) + 1;
      removeItem(ch);
      toast(t('drop.child', { emoji: DEFS[ch.defId].emoji, name: LName(DEFS[ch.defId]) }));
    } else syncTransform(ch);
  }
}
function setGhostVisual(item, mode) {
  item.group.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    // #197(1.9.1 캔들 배치 크래시): 바닥 라이트 풀(#189 P4, MeshBasic — emissive 없음)이 광원 가구 그룹에
    //   합류하면서 무가드 emissive.setHex가 배치 고스트 첫 프레임에 터졌다. emissive 없는 재질은 틴트 대상이
    //   아니며, 풀의 상시 투명도(0.13)를 원복 분기가 불투명으로 파괴하는 것도 함께 방지.
    if (!m.emissive) return;
    if (mode) {
      m.transparent = true; m.opacity = 0.75;
      if (!o.userData.glow) {
        m.emissive.setHex(mode === 'invalid' ? 0x7a2020 : 0x1e3a1e);
        m.emissiveIntensity = 0.9;
      }
    } else {
      m.transparent = false; m.opacity = 1;
      m.emissive.setHex(o.userData.origEmissive ?? 0);
      m.emissiveIntensity = o.userData.origEmissiveI ?? 1;
    }
  });
}

/* ============================================================
   셸터 로드 / 이주
============================================================ */
const gridHelper = new THREE.GridHelper(1, 1);
gridHelper.visible = false;
scene.add(gridHelper);
let gridObj = gridHelper; // 재생성 대상

// F-1a [B]: 창밖 원거리 연기 기둥 1개 — 먼 생존 흔적. 도심/외곽 방향(-z 지평선) 고정.
//   기존 도심 연기(city buildEnv) 문법 재사용. envDyn.smoke 미설정 셸터에만 1개 추가(indoor 제외).
//   tickEnv 의 envDyn.smoke 애니메이터가 baseX 기준으로 상승/사행시킨다.
function addDistantSmoke() {
  if (envDyn.smoke) return;                 // 이미 있는 셸터(도심 등)는 건드리지 않음
  if (!!SHELTERS[state.current]?.indoor) return; // 실내(지하철)는 하늘/지평선 없음
  const baseX = -20, baseZ = -34;           // 먼 지평선(-z 방향, 도심 쪽), 병치 공식과 어긋나지 않게 원거리
  const n = 12, arr = new Float32Array(n * 3), sPhase = [];
  const srand = seededRand(701);
  for (let i = 0; i < n; i++) {
    const y = 2 + (i / n) * 13;
    arr.set([baseX + Math.sin(i * 1.7) * 0.8, y, baseZ + Math.cos(i * 1.3) * 0.8], i * 3);
    sPhase.push(srand() * Math.PI * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x6a6f78, size: 6, sizeAttenuation: false, transparent: true, opacity: 0.24, fog: false,
  }));
  envRoot.add(pts);
  envDyn.smoke = { pts, phase: sPhase, baseX };
}

// #2 물 반사(디렉터): 수변 셸터 수면에 하늘·스카이라인을 큐브맵으로 1회 베이크해 반사.
//   실기(하드웨어 GPU)에서만 — 골든 동결/lowSpec 제외. cam.update가 던져도 try/finally로 sea.visible 복원 +
//   씬에서 CubeCamera 제거 보장(고아 카메라가 후속 렌더 오염 방지). 라이브 렌더 1회뿐이라 방치/배터리 무해.
let _seaCubeRT = null;
function bakeWaterReflection() {
  const sea = envDyn && envDyn.sea;
  if (!sea || isGoldenFrozen() || opts.lowSpec) return;
  if (_seaCubeRT) { _seaCubeRT.dispose(); _seaCubeRT = null; }
  const rt = new THREE.WebGLCubeRenderTarget(128, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cam = new THREE.CubeCamera(0.5, 1400, rt);
  cam.position.set(0, (sea.position.y || 0) + 3, 0);      // 수면 바로 위에서 주변(하늘·타워·선실) 캡처
  const wasVis = sea.visible;
  try {
    scene.add(cam);
    sea.visible = false;                                  // 자기 반사 방지
    cam.update(renderer, scene);
  } catch (e) { rt.dispose(); return; /* 베이크 실패 시 램버트 유지 */ }
  finally { sea.visible = wasVis; scene.remove(cam); }    // 던져도 상시 복원·제거(고아 카메라 차단)
  _seaCubeRT = rt;
  const col = sea.material?.color ? sea.material.color.getHex() : 0x14222e, old = sea.material;
  sea.material = new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.14, envMap: rt.texture, envMapIntensity: 1.5, fog: true });
  old?.dispose?.();
}

function loadShelter(id) {
  cancelPlacing();
  deselect();
  // 2.0-α (§9.8): 도시 도달 기록 — 모든 셸터 진입이 이 관문을 지난다. 「도시를 밟았다」 마일스톤·도감 축.
  state.citiesReached = state.citiesReached || {};
  state.citiesReached[cityOf(id)] = 1;
  // 기존 배치/방/환경 해체
  while (items.length) {
    const it = items.pop();
    itemsRoot.remove(it.group);
    disposeDeep(it.group);
  }
  disposeDeep(roomGroup); roomGroup.clear();
  disposeDeep(envRoot); envRoot.clear();
  wallList = []; ceilCullList = []; blockers = []; envDyn = {}; swayProps = [];
  wlObstacles = []; // #95: 야생동물 장애물 등록부 리셋 — buildEnv(폐차/전신주/근접 나무)가 다시 채운다
  ogResetRegistry(); // #71: 잠식 대상 등록부 리셋 — buildEnv가 채우고 buildOvergrowth가 소비
  bunkerStairsObj = null; // #55: 계단 히트 대상 재수집
  subwayHiddenObj = null; // §9.6: 히든 지점 히트 대상 재수집
  if (typeof disposeDropSpots === 'function') disposeDropSpots(); // #182 B0: 지면 드랍 반짝임 정리(셸터 전환)
  weatherFx.caps = []; wetApplied = -1;
  wetFxBuilt = false; wetGlintAnchors.length = 0; weatherFx.puddles = []; weatherFx.glints = []; // #96 젖은 도시 리셋 (메시는 envRoot dispose가 해체)
  winSkyMats.length = 0; // 창문 하늘판 재수집
  sunShafts.length = 0; sunMotes.length = 0; // 빛기둥/먼지도 재수집 (envRoot dispose와 함께 소멸)
  winFrostMats.length = 0; // ③ 창유리 성에 오버레이 재수집
  // 초봄(Day 1~2) 시작: 겨울의 끝자락 잔설이 남아있다가 서서히 녹는다 (최초 입장 1회만 시딩)
  if (!snowSeeded && state.day <= 2 && seasonOf().id === 'spring') { snowCover = 0.25; snowSeeded = true; }

  state.current = id;
  const sh = SHELTERS[id];
  ROOM = { ...sh.room };
  if ((state.mods?.[id] || []).includes('extension')) ROOM.w += 2; // 증축
  sh.buildRoom();
  sh.buildEnv();
  // #71: 연차·계절 비례 도심 잠식 — 로드 시 1회 재생성. 플레이 중 하루가 넘어가도 즉시 갱신하지
  //   않는다(성장은 느린 현상 — 다음 로드/이주/재입장에 반영이면 충분, 의도된 주기).
  buildOvergrowth();
  addDistantSmoke(); // F-1a [B]: 창밖 원거리 연기 기둥(먼 생존 흔적) — 없는 셸터에만 1개
  buildModProps(); // 설치된 개조 소품
  applyExteriorLayers(roomGroup); // 외부 건물(userData.exterior)을 실내광 영향에서 제외 (디렉터 광원 누출)
  bakeWaterReflection(); // #2 물 반사(디렉터): 수변 셸터 수면에 하늘·스카이라인 큐브맵 1회 베이크
  applyDeco();     // 꾸미기(#13): 벽지/바닥재 재질 적용 (셸터 원본 map 위에 오버레이)
  scatterDust();   // 실내 먼지 모트 재배치
  applyMood(sh.mood);
  ensureWeather();
  ceilLight.position.set(0, sh.ceilY, 0);
  // #189 P1: 폴백/설비 광원 동기화 — 광원 있으면 폴백 소등, 조명 설비는 급전 시 점등.
  //   (§9.6 「침묵」 지하철 잔불(2)은 updateLightingRig 안에서 유지)
  facilityLight.position.set(0, sh.ceilY - 0.12, 0);
  facilityLight.distance = Math.max(ROOM.w, ROOM.d) + 6;
  updateLightingRig();
  ceilLight.intensity = ceilBaseInt;
  // 조명 설비 펜던트 소품 — 설치 셸터에서만. 재로드마다 재생성(이주·증축·철거 대응).
  if (lightingFixture) { scene.remove(lightingFixture); disposeDeep(lightingFixture); lightingFixture = null; }
  if (hasMod('lighting')) {
    const g = new THREE.Group();
    const cordH = 0.34;
    Cyl(g, 0.014, 0.014, cordH, 0x2b2d31, 0, -cordH / 2, 0, 5);            // 전선
    Cyl(g, 0.16, 0.09, 0.12, 0x3a3d42, 0, -cordH - 0.05, 0, 10);           // 금속 갓
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe6c0, emissive: 0xffc070, emissiveIntensity: 1.1 }));
    bulb.position.set(0, -cordH - 0.13, 0); bulb.userData.glow = true;
    g.add(bulb);
    g.userData.bulb = bulb;
    // #189 P4: 설비 전등 아래 바닥 라이트 풀 (가구 광원과 동일 문법 — 방 중앙 빛 웅덩이)
    const fpool = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
      map: glowTex(), color: 0xffd9a0, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    fpool.rotation.x = -Math.PI / 2;
    fpool.position.set(0, -sh.ceilY + 0.03, 0);
    fpool.scale.setScalar(3.4);
    fpool.renderOrder = 1;
    g.add(fpool);
    g.userData.pool = fpool;
    g.userData.lightToggle = true; // 조명 클릭 = 켜고 끄기 (디렉터 2026-07-24)
    g.position.set(0, sh.ceilY, 0);
    scene.add(g);
    lightingFixture = g;
  }

  // 그리드 재생성
  scene.remove(gridObj);
  gridObj.geometry?.dispose?.();
  const gmax = Math.max(ROOM.w, ROOM.d);
  gridObj = new THREE.GridHelper(gmax, gmax / GRID, 0xe8a86c, 0x6b5a40);
  gridObj.material.transparent = true;
  gridObj.material.opacity = 0.22;
  gridObj.position.y = 0.02;
  gridObj.scale.set(ROOM.w / gmax, 1, ROOM.d / gmax);
  gridObj.visible = false;
  scene.add(gridObj);

  // 저장된 레이아웃 복원 (표면 위 소품은 지지대 링크 재구성)
  // 마이그레이션(#53): 방(ROOM) 치수가 줄어든 셸터(옥탑 리워크)에서 구 좌표 가구가 방 밖에 있으면
  // 로드 시 방 안으로 클램프한다 — 유실 없이 보존. clampToRoom은 footprint를 고려하므로 defId 임시 아이템으로 계산.
  for (const it of (state.layouts[id] || [])) {
    if (!DEFS[it.d]) continue;
    const [cx, cz] = clampToRoom({ defId: it.d, colorIdx: it.c ?? 0, rot: it.r ?? 0 }, it.x, it.z);
    const restored = addItem(it.d, it.c ?? 0, cx, cz, it.r ?? 0, it.o !== 0, it.y || 0, it.t ?? 3);
    if (it.s && restored) { restored.sketch = it.s; recolorItem(restored, restored.colorIdx); } // DDD-2: 걸어둔 스케치 복원(재빌드)
    if (it.ge && restored) { restored.gel = it.ge; applyGel(restored); } // #189 P3: 조명 젤 색 복원
    if (it.w && restored) restored.wear = it.w; // #230 스크래처 마모 복원
  }
  for (const it of items) {
    // #209 러그 바닥 올림: y=0 항목도 러그가 밑에 있으면 재계산 대상이다(구 세이브엔 러그 위 가구가 0으로
    //   저장돼 있고, 직렬화가 y를 toFixed(2)로 반올림하므로 로드 시 재계산이 정본이다).
    //   러그가 없으면 lift=0 → 기존 가드·기존 결과와 완전히 동일(회귀 없음).
    const lift = Math.max(floorLiftAt(it, it.x, it.z), balconyLiftAt(it, it.x, it.z)); // #209 러그 or 발코니 데크
    if (!it.y && !lift) continue;
    const sup = findSupport(it, it.x, it.z);
    if (sup) { it.support = sup.other; it.y = sup.y; }
    else it.y = lift; // 지지대가 사라졌으면 러그 상면(없으면 바닥)
    syncTransform(it);
  }
  despawnCat();
  if (state.cat) spawnCat(); // 고양이는 이사할 때도 함께 간다
  // F-1a: 야생동물 재구성 — 셸터(구역)별 종·로밍 존으로 상시 1~2마리 스폰(개막 새 착지 포함).
  if (typeof wildlifeSys !== 'undefined') wildlifeSys.respawn(id);
  if (typeof avatarSys !== 'undefined') avatarSys.respawn(); // #86: 셸터마다 '나'를 다시 세운다
  fitZoomForShelter();
  // #70: 팬은 세이브에 저장하지 않는다 — 셸터 로드/이주 시 항상 방 중심(0,0)에서 시작.
  camState.panX = camState.panZ = camState.targetPanX = camState.targetPanZ = 0;
  // 벽 컬링을 로드 시점에 동기로 확정한다 (실기기 신고: 부팅 직후 컨테이너 벽 하나가 사라져 T자로 보이다
  // 나중에 정상화되던 버그). 원인: 첫 프레임 전 camera.position가 아직 갱신 안 된 상태로 mask가 잘못 잡히고,
  // 다음 mask 변화(카메라 회전)까지 유지됨. → yaw를 targetYaw로 즉시 스냅 + updateCamera로 카메라 확정 후 컬링.
  camState.yaw = camState.targetYaw;
  resetWallMask(); // 마스크 캐시 무효화 (render/culling.js 소유) → 로드 시 shadowDirty 확실화
  updateCamera();
  updateWallCulling(0, true); // 로드 시점: 페이드 없이 즉시 확정
  shadowDirty();
  updateHud();
  if (typeof syncBgm === 'function') syncBgm();
}
// 이주 비용: 미정비 셸터는 정비 자원(1회) + 다른 구역이면 여정 물자(음식1·물1)와 시간 3시간
function moveCostFor(id) {
  const cost = {};
  if (!state.renovated[id]) {
    // #108 정비코스트 배수: 재정비 자원에 gateCostMul(하드 1.25·혹한 1.5·무한 0.85) — 여정 물자(음식·물)는 생존 상수라 제외.
    for (const [rid, n] of Object.entries(gateCost(SHELTERS[id].moveCost || {}))) cost[rid] = (cost[rid] || 0) + n;
  }
  const cityCross = cityOf(id) !== cityOf(state.current); // 국경(도시 간) 이주 — 구역 겹 대신 상위 겹으로
  const cross = !cityCross && districtOf(id) !== districtOf(state.current);
  if (cityCross) { cost.food = (cost.food || 0) + BAL.cities.moveCityFood; cost.water = (cost.water || 0) + BAL.cities.moveCityWater; }
  else if (cross) { cost.food = (cost.food || 0) + BAL.economy.moveCrossFood; cost.water = (cost.water || 0) + BAL.economy.moveCrossWater; }
  return { cost, cross: cross || cityCross, cityCross, renov: !state.renovated[id] };
}
async function moveToShelter(id) {
  if (paused) { toast(t('pause.blocked')); return; }
  if (id === state.current) { closeModal(); return; }
  const { cost, cross, cityCross, renov } = moveCostFor(id);
  if (!resHasAll(cost)) {
    toast(t('move.needSupplies', { cost: costLabel(cost) }));
    return;
  }
  // 이주 확인: 현 거처에 배치된 가구가 있으면 "남는다"고 안내 (인벤토리 공유라 손실 아님)
  const placedN = items.length;
  if (placedN >= 1 && !(await gameConfirm(t('move.confirmFurniture', { n: placedN }), t('confirm.move'), t('confirm.stay')))) return;
  resConsumeAll(cost);
  if (renov) {
    state.renovated[id] = true;
    state.dayLog.notes.push(t('move.renovNote', { name: LName(SHELTERS[id]), cost: costLabel(gateCost(SHELTERS[id].moveCost || {})) || t('free') })); // #108 표기=판정 동일 게이트 비용
  }
  if (cross) {
    // 국경(도시 간)은 구역 간의 두 배 — 물자도 시간도(EAST-ECONOMY.md §3-④). 노트도 별도: 관문을 넘는 건 다른 사건이다.
    state.gameMin += cityCross ? BAL.cities.moveCityTimeMin : BAL.economy.moveCrossTimeMin;
    const dn = LName(DISTRICTS[districtOf(id)]);
    state.dayLog.notes.push(t(cityCross ? 'move.journeyCityNote' : 'move.journeyNote', { name: dn, josa: josa(dn, '으로/로') }));
  }
  state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 }));
  state.stayDays = 0; // 새 집은 아직 낯설다
  state.lightingOut = false; // #195: 전 셸터의 단전 이력을 끌고 오지 않는다 — 도착 셸터 기준으로 다음 결산이 재판정
  loadShelter(id);
  scheduleSave();
  renderResBar();
  closeModal();
  // #208 감사 검거(P2): moveCostFor가 cross를 '구역 또는 도시'로 넓힌 뒤 시간·노트는 cityCross로 분기했는데
  //   이 토스트만 옛 cross를 읽어 국경 이주에도 "여정 3시간"이라 말했다 — 시계는 6시간, 일지도 6시간인데 토스트만 3.
  { const sn = LName(SHELTERS[id]); toast(t('move.done', { emoji: SHELTERS[id].emoji, name: sn, josa: josa(sn, '으로/로'), journey: cross ? t(cityCross ? 'move.journeyCityTag' : 'move.journeyTag') : '' })); }
}
// 이주 가능 판정: 해금 && 비현재 && 전체 비용 충족인 거처가 하나라도 있으면 true.
// 비용은 moveCostFor(1의 칩 렌더)와 동일 소스 — 로직/표시 불일치 방지.
function canMoveSomewhere() {
  for (const id of Object.keys(SHELTERS)) {
    if (id === state.current || !shelterUnlocked(id)) continue;
    if (resHasAll(moveCostFor(id).cost)) return true;
  }
  return false;
}
// #btn-move 배지 점등/소등 + 신규 해금 1회 토스트. renderResBar(자원 변동)에서 매번 호출.
let moveBadgeShown = false;
function updateMoveBadge() {
  const badge = document.getElementById('move-badge');
  // 신규 해금 토스트: 이주 가능한(해금·비현재) 거처 수가 늘어난 순간 1회
  let unlockedElsewhere = 0;
  for (const id of Object.keys(SHELTERS)) {
    if (id !== state.current && shelterUnlocked(id)) unlockedElsewhere++;
  }
  if (state.lastUnlockCount == null) state.lastUnlockCount = unlockedElsewhere;
  else if (unlockedElsewhere > state.lastUnlockCount) {
    state.lastUnlockCount = unlockedElsewhere;
    if (!titleVisible) toast(t('move.newShelter'));
  } else if (unlockedElsewhere < state.lastUnlockCount) {
    state.lastUnlockCount = unlockedElsewhere; // 이주로 현재지가 바뀌면 감소 — 재점등 방지용 동기화
  }
  if (!badge) return;
  const on = !titleVisible && canMoveSomewhere();
  badge.style.display = on ? '' : 'none';
  moveBadgeShown = on;
}

/* ============================================================
   탐험(파밍) 시스템 — 기획서의 지역별 성공률 기반
============================================================ */
// REGIONS(탐험 지역 수치·메타)는 src/data/world.js로 분리(콘텐츠 데이터 Phase 1). 아래 id 주입 루프는 유지.
for (const [k, v] of Object.entries(REGIONS)) v.id = k;

/* ============================================================
   도트 지도 (기획서: 도트 지도 기반 탐험 선택)
============================================================ */
const MAP = {
  W: 40, H: 28, TILE: 8,
  districts: { coast: { x: 6, y: 13 }, city: { x: 16, y: 8 }, outskirts: { x: 15, y: 21 }, forest: { x: 31, y: 6 }, meadow: { x: 31, y: 19 }, harbor: { x: 4, y: 24 }, highland: { x: 36, y: 3 } },
  regions: { residential: { x: 24, y: 16 }, commercial: { x: 12, y: 10 }, industrial: { x: 8, y: 23 }, slum: { x: 21, y: 12 }, harborYard: { x: 5, y: 26 }, fishMarket: { x: 9, y: 25 }, resort: { x: 37, y: 2 }, checkpoint: { x: 34, y: 25 }, lab: { x: 38, y: 26 }, citycore: { x: 39, y: 27 } },
};
// 거리 → 탐험 소요 시간 계수 (가까우면 빨리, 멀면 오래)
function regionDistMult(regionId) {
  const a = MAP.districts[districtOf(state.current)] || MAP.districts.outskirts; // 신규 구역 안전 폴백
  const b = MAP.regions[regionId] || MAP.districts[districtOf(state.current)] || MAP.districts.outskirts;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  return 0.8 + Math.min(1, dist / 26) * 0.55; // 0.8x ~ 1.35x
}
let mapCanvas = null;
function buildMapCanvas() {
  if (mapCanvas) return mapCanvas;
  const cv = document.createElement('canvas');
  cv.width = MAP.W * MAP.TILE; cv.height = MAP.H * MAP.TILE;
  cv.id = 'map-cv';
  const g = cv.getContext('2d');
  const rand = seededRand(20260703);
  const anchors = [
    ['city', 16, 8], ['waste', 15, 21], ['forest', 31, 6], ['meadow', 31, 19],
  ];
  const palette = {
    water: ['#1d3244', '#22394d'],
    city: ['#3a3f4a', '#434855', '#31353f'],
    waste: ['#4a4234', '#544936', '#3f3a2f'],
    forest: ['#2c4034', '#33493a', '#28382f'],
    meadow: ['#44543c', '#4c5c42', '#3d4d38'],
    road: ['#33342f', '#2f302b'],
  };
  const T = MAP.TILE;
  for (let y = 0; y < MAP.H; y++) {
    for (let x = 0; x < MAP.W; x++) {
      let type = 'waste';
      if (x < 4.5 + Math.sin(y * 0.55) * 1.8) type = 'water';
      else {
        let best = 1e9;
        for (const [t2, ax, ay] of anchors) {
          const d = Math.hypot(x - ax, y - ay) + rand() * 4;
          if (d < best) { best = d; type = t2; }
        }
        if (y === 24 && x > 3) type = 'road'; // 고속도로
      }
      const cs = palette[type];
      g.fillStyle = cs[(x * 7 + y * 13) % cs.length];
      g.fillRect(x * T, y * T, T, T);
      // 지형 디테일 (도트)
      if (type === 'city' && rand() < 0.5) {
        g.fillStyle = '#262a33';
        g.fillRect(x * T + 1, y * T + 2, 3, 5);
        if (rand() < 0.25) { g.fillStyle = '#d9b06a'; g.fillRect(x * T + 2, y * T + 3, 1, 1); }
      } else if (type === 'forest' && rand() < 0.6) {
        g.fillStyle = '#1e3128';
        g.fillRect(x * T + 2, y * T + 2, 3, 4);
        g.fillRect(x * T + 3, y * T + 1, 1, 1);
      } else if (type === 'meadow' && rand() < 0.3) {
        g.fillStyle = '#5c6c4c'; g.fillRect(x * T + (x % 5), y * T + (y % 5), 2, 2);
      } else if (type === 'waste' && rand() < 0.25) {
        g.fillStyle = '#3a332a'; g.fillRect(x * T + (x % 6), y * T + (y % 6), 2, 2);
      } else if (type === 'water' && rand() < 0.2) {
        g.fillStyle = '#2c4258'; g.fillRect(x * T, y * T + 3, 5, 1);
      } else if (type === 'road' && x % 2 === 0) {
        g.fillStyle = '#8a8a72'; g.fillRect(x * T + 1, y * T + 3, 4, 1);
      }
    }
  }
  return mapCanvas = cv;
}
// 지도 모달 → ui/mapview.js (S2-1 추출 — AERIAL-MAP §4 관문 원칙). 데이터·코어 게이트는 모듈이 import,
//   game.js 클로저(모달 셸·탐험 플로우·셸터 표·전도 생성)만 주입. MAP_SAFE/MAP_MARKERS/SHELTER_MAP/
//   MAP_LIGHT_MAX는 mapview가 수출 — PDA 미니맵(renderPDA)·생존자 불빛 집계가 공유한다.
const { openMapModal, renderSurvivorLights } = makeMapview({
  openModal, closeModal, toast, renderExpPanel, startExpedition, showMapInfo,
  shelterUnlocked, avalancheBlocks, SHELTERS, mapBiomeDataUrl, scheduleSave, bpName,
  demoEd: DEMO_ED, icon, // 데모 「궁금한 문」 티저(#175 단일화 — 본편 빌드=false로 불활성)
});
/* ── 지도 리워크 2차(디렉터: 타르코프 Woods식 진짜 지형도) ──
   지역별 색면 폐기. 회백 종이 전면 + 초록은 '식생'만 + 갈색 등고선(높이장 marching-squares)이
   주 텍스처 + 파랑 물 + 구불구불 곡선 도로. 지형색·설산 같은 작위적 요소 제거.
   지리(강·바다 남·봉쇄 남동)는 마커 좌표와 정합. 결정론(seed 4207 + 해시 노이즈) — 항상 같은 도시. */
let _mapBiomeUrls = {}; // 도시별 캐시 (2.0-(d): home/east 두 전도)
function mapBiomeDataUrl(city = 'home') {
  if (_mapBiomeUrls[city]) return _mapBiomeUrls[city];
  if (city === 'east') return (_mapBiomeUrls.east = eastMapBiomeDataUrl());
  const W = 1120, H = 800, CELL = 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rand = seededRand(4207);
  const X = p => p / 100 * W, Y = p => p / 100 * H;
  // 결정론 value-noise (정수 해시 → rand 스트림과 독립, 그리기 순서 무관하게 안정)
  const hash = (i, j) => { let n = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  // 높이장(% 좌표) — 등고선/음영의 근원. 노이즈 + 완만한 북동 고지 + 남쪽 바다로 하강.
  const hAt = (x, y) => {
    let e = (vnoise(x * 0.055 + 2, y * 0.055 + 7) - 0.5) * 2.2
          + (vnoise(x * 0.13 + 20, y * 0.13 + 11) - 0.5) * 0.9
          + (vnoise(x * 0.28 + 40, y * 0.28 + 33) - 0.5) * 0.35;
    e += (x / 100) * 0.35 + (1 - y / 100) * 0.30 - Math.max(0, (y - 80) / 20) * 2.5;
    return e;
  };
  // 식생 마스크 — 초록은 여기만(타르코프식). 동쪽(도심)·남동(봉쇄) 억제.
  const vegAt = (x, y) => vnoise(x * 0.08 + 50, y * 0.08 + 50) + (vnoise(x * 0.19 + 5, y * 0.19 + 9) - 0.5) * 0.4
    - (x / 100) * 0.26 - Math.max(0, (x - 58) / 42) * Math.max(0, (y - 54) / 46) * 0.7;
  // 1) 색면 — 회백 종이 전면, 물(남/강 저지), 식생만 초록. 디더 체커 + 시드 지터로 유기적 경계.
  const paper = ['#e7e2d5', '#e0dbcd'], green = ['#b7c398', '#abb98a'], sea = ['#a8c1c5', '#9cb7bc'];
  for (let cy = 0; cy < H / CELL; cy++) {
    for (let cx = 0; cx < W / CELL; cx++) {
      const px = (cx * CELL + CELL / 2) / W * 100, py = (cy * CELL + CELL / 2) / H * 100;
      const jx = px + (rand() - 0.5) * 4.5, jy = py + (rand() - 0.5) * 4.5;   // 경계 흐트림
      const pal = (jy > 85 || hAt(jx, jy) < -1.35) ? sea : (vegAt(jx, jy) > 0.52 ? green : paper);
      g.fillStyle = (cx + cy) % 2 ? pal[1] : pal[0];
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }
  // 2) 등고선 — 높이장 marching squares. 지형도의 주 텍스처. 5번째마다 인덱스선(굵게).
  const gw = 140, gh = 100, cw = W / gw, ch = H / gh, hg = [];
  for (let j = 0; j <= gh; j++) { hg[j] = []; for (let i = 0; i <= gw; i++) hg[j][i] = hAt(i / gw * 100, j / gh * 100); }
  let k = 0;
  for (let lv = -1.5; lv <= 2.5; lv += 0.4, k++) {
    g.lineWidth = k % 2 ? 0.8 : 1.5; g.strokeStyle = k % 2 ? 'rgba(150,120,76,0.34)' : 'rgba(138,108,66,0.55)';
    g.beginPath();
    for (let j = 0; j < gh; j++) {
      if ((j + 0.5) / gh * 100 > 85) continue;   // 바다 위는 등고선 생략
      for (let i = 0; i < gw; i++) {
        const a = hg[j][i], b = hg[j][i + 1], c = hg[j + 1][i + 1], d = hg[j + 1][i];
        const x0 = i * cw, y0 = j * ch, x1 = x0 + cw, y1 = y0 + ch, pts = [];
        if ((a > lv) !== (b > lv)) pts.push([x0 + cw * (lv - a) / (b - a), y0]);
        if ((b > lv) !== (c > lv)) pts.push([x1, y0 + ch * (lv - b) / (c - b)]);
        if ((c > lv) !== (d > lv)) pts.push([x1 - cw * (lv - c) / (d - c), y1]);
        if ((d > lv) !== (a > lv)) pts.push([x0, y1 - ch * (lv - d) / (a - d)]);
        if (pts.length >= 2) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); }
        if (pts.length === 4) { g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); }
      }
    }
    g.stroke();
  }
  // 3) 강 — 북에서 바다로(도심과 슬럼 사이). 파랑 위 밝은 심.
  const river = t => [54 + Math.sin(t * 6 + 0.5) * 4, t * 88];
  g.lineCap = 'round';
  for (const [w, col] of [[8, 'rgba(140,172,178,0.9)'], [3, 'rgba(190,212,214,0.7)']]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(river(0)[0]), 0);
    for (let t = 0; t <= 1.001; t += 0.04) { const [rx, ry] = river(t); g.lineTo(X(rx), Y(ry)); }
    g.stroke();
  }
  g.lineCap = 'butt';
  // 4) 봉쇄구역(남동) — 지형색 아닌 '제한구역 주기': 붉은 점선 경계 + 성긴 해치(절제).
  g.strokeStyle = 'rgba(150,70,58,0.6)'; g.lineWidth = 2.4; g.setLineDash([12, 8]);
  g.beginPath(); g.moveTo(X(64), Y(60)); g.lineTo(X(100), Y(60)); g.moveTo(X(64), Y(60)); g.lineTo(X(64), Y(88)); g.stroke();
  g.setLineDash([]); g.strokeStyle = 'rgba(150,70,58,0.15)'; g.lineWidth = 1.2;
  for (let i = 0; i < 15; i++) { const sx = X(66 + i * 2.3); g.beginPath(); g.moveTo(sx, Y(60)); g.lineTo(sx - 17, Y(87)); g.stroke(); }
  // 5) 건물 발자국 — 도심/상업/슬럼/부두/주거 밀집 블록. 현실 스케일: 작은 발자국을 격자로 촘촘히,
  //    거리/공터 간극은 노이즈로 유기적. 타원 클러스터가 겹쳐 중동부 도시 스프롤을 만든다.
  const urban = [[65, 19, 16, 11], [73, 52, 12, 9], [47, 78, 11, 5], [21, 20, 11, 8], [57, 31, 10, 8]];
  for (const [cxp, cyp, hwp, hhp] of urban) {
    const cx = X(cxp), cy = Y(cyp), hw = hwp / 100 * W, hh = hhp / 100 * H, step = 20;
    for (let by = cy - hh; by <= cy + hh; by += step) {
      for (let bx = cx - hw; bx <= cx + hw; bx += step) {
        const dxn = (bx - cx) / hw, dyn = (by - cy) / hh;
        if (dxn * dxn + dyn * dyn > 1.05) continue;                    // 타원 클러스터 경계
        if (vnoise(bx * 0.05 + 200, by * 0.05 + 200) < 0.38) continue; // 거리/공터 간극(유기적)
        const big = rand() < 0.14;                                     // 가끔 대형(창고)
        const bw = big ? 18 + rand() * 14 : 7 + rand() * 12, bh = big ? 12 + rand() * 12 : 6 + rand() * 10;
        const jx = bx + (rand() - 0.5) * 7, jy = by + (rand() - 0.5) * 7;
        g.fillStyle = 'rgba(120,112,96,0.32)'; g.fillRect(jx, jy, bw, bh);
        g.strokeStyle = 'rgba(70,62,50,0.55)'; g.lineWidth = 1; g.strokeRect(jx, jy, bw, bh);
      }
    }
  }
  // 6) 도로 — 구불구불 곡선 네트워크(quadratic). 밝은 케이싱 위 갈색 노면. 오솔길은 점선.
  const curveRoad = (pts, w, col, dash) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; if (dash) g.setLineDash(dash);
    const P = pts.map(([px, py]) => [X(px), Y(py)]);
    g.beginPath(); g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    g.lineTo(P[P.length - 1][0], P[P.length - 1][1]); g.stroke(); if (dash) g.setLineDash([]);
  };
  const roads = [
    [[19, 19], [30, 16], [42, 19], [55, 15], [68, 17], [75, 18]],   // 북부 간선(구불)
    [[20, 20], [15, 31], [18, 43], [17, 56]],                       // 서부
    [[74, 18], [76, 31], [72, 43], [72, 55]],                       // 동부
    [[18, 56], [25, 63], [31, 71], [38, 79]],                       // 항만로
    [[38, 79], [47, 82], [56, 81]],                                 // 부두
    [[72, 55], [74, 63], [77, 71]],                                 // 봉쇄 진입
    [[42, 19], [41, 33], [37, 44], [34, 54]],                       // 중앙 지선
  ];
  for (const r of roads) curveRoad(r, 6, 'rgba(226,218,194,0.6)');
  for (const r of roads) curveRoad(r, 2.6, 'rgba(120,92,58,0.85)');
  curveRoad([[75, 18], [80, 15], [85, 13]], 2, 'rgba(120,92,58,0.6)', [6, 6]);   // 산길
  curveRoad([[31, 71], [24, 74], [17, 77]], 1.8, 'rgba(120,92,58,0.5)', [5, 5]); // 해안 오솔길
  // 6b) 2.0-(b) 동측 국경 힌트 — 동부 간선이 지도 밖(두 번째 도시)으로 이어진다.
  //     인쇄 시절부터 종이에 있던 길: 행정경계 일점쇄선 + 검문소 발자국 + 차단 표시. 문자열 0(도법 기호만).
  const eastRoad = [[76, 31], [84, 33], [92, 35], [100, 36]];
  curveRoad(eastRoad, 6, 'rgba(226,218,194,0.6)');
  curveRoad(eastRoad, 2.6, 'rgba(120,92,58,0.85)');
  g.strokeStyle = 'rgba(110,88,60,0.55)'; g.lineWidth = 1.6; g.setLineDash([14, 5, 3, 5]); // 행정경계(일점쇄선, 남북)
  g.beginPath(); g.moveTo(X(95.6), Y(14)); g.lineTo(X(94.6), Y(30)); g.lineTo(X(95.9), Y(50)); g.lineTo(X(95.2), Y(60)); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(120,112,96,0.5)'; g.fillRect(X(92.6), Y(31.4), 10, 8);               // 검문소 부스 발자국(도로변)
  g.strokeStyle = 'rgba(70,62,50,0.7)'; g.lineWidth = 1; g.strokeRect(X(92.6), Y(31.4), 10, 8);
  g.strokeStyle = 'rgba(150,70,58,0.8)'; g.lineWidth = 2.2;                                 // 차단 표시(도로 직교 붉은 획)
  g.beginPath(); g.moveTo(X(94.8), Y(32.6)); g.lineTo(X(94.8), Y(38.4)); g.stroke();
  g.lineCap = 'butt';
  // 7) 해안선 — 물가 파도 대시(얕게).
  g.strokeStyle = 'rgba(120,150,155,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 34; i++) { const wx = rand() * W, wy = Y(86 + rand() * 12); g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + 15, wy); g.stroke(); }
  // 8) 접힘 자국 — 접은 지도의 판넬 경계(음영+하이라이트).
  const crease = (x0, y0, x1, y1) => {
    g.strokeStyle = 'rgba(78,64,42,0.09)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(255,250,236,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1.5, y0); g.lineTo(x1 + 1.5, y1); g.stroke();
  };
  crease(W / 3, 0, W / 3, H); crease(W * 2 / 3, 0, W * 2 / 3, H); crease(0, H / 2, W, H / 2);
  // 9) 연필 표고점 — 손으로 적은 고도(지형도 무드).
  g.fillStyle = 'rgba(92,70,44,0.45)'; g.font = 'italic 14px Georgia, "Times New Roman", serif';
  for (let i = 0; i < 18; i++) { const nx = 6 + rand() * 86, ny = 12 + rand() * 72; if (ny > 84) continue; g.fillText((2 + rand() * 44).toFixed(1), X(nx), Y(ny)); }
  // 10) 종이 그레인 + 비네트.
  for (let i = 0; i < 2600; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(70,54,34,0.04)' : 'rgba(255,250,236,0.05)'; g.fillRect(rand() * W, rand() * H, 2, 2); }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(44,32,18,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  _mapBiomeUrls.home = cv.toDataURL();
  return _mapBiomeUrls.home;
}
/* ── 2.0-(d) 동부 전도 「항구도시」 — 백지 지도의 설렘(§6.2) ──
   홈 전도와 같은 지형도 문법(회백 종이·등고선·식생·곡선 도로·접힘)이되 지리는 부산형:
   남측 만(灣) 전폭 + 남서 컨테이너항(스택 격자) + 중동부 마천루 코어(대형 발자국 밀집) +
   서측 강과 무너진 현수교(끊긴 경간) + 역으로 모이는 철도 축 + 서쪽 가장자리 국경 일점쇄선(홈 지도의 미러).
   3년 무인 진입지라 식생 잠식(overgrowth)을 도심 안까지 허용 — TLOU 감성의 지도 버전. 결정론 seed 8104. */
function eastMapBiomeDataUrl() {
  const W = 1120, H = 800, CELL = 4;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rand = seededRand(8104);
  const X = p => p / 100 * W, Y = p => p / 100 * H;
  const hash = (i, j) => { let n = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };
  // 높이장: 북고남저(만으로 하강) + 북동 구릉. 해안선은 대각(남서 낮음 → 북동 높음) — 부산형 만곡.
  const seaLine = x => 74 + Math.sin(x * 0.045 + 1.2) * 4 + (x - 50) * 0.10; // x%에서의 해안 y%
  const hAt = (x, y) => {
    let e = (vnoise(x * 0.05 + 9, y * 0.05 + 3) - 0.5) * 2.0
          + (vnoise(x * 0.12 + 31, y * 0.12 + 17) - 0.5) * 0.8
          + (vnoise(x * 0.27 + 55, y * 0.27 + 41) - 0.5) * 0.3;
    e += (1 - y / 100) * 0.55 + (x / 100) * 0.18 - Math.max(0, (y - seaLine(x)) / 14) * 2.6;
    return e;
  };
  // 강 경로(색면·시가 클립이 함께 읽는다 — 정의를 위로)
  const river = t => [16 + Math.sin(t * 5 + 2) * 3.5 + t * 4, t * 78];
  // 시가 격자 좌표계(디렉터: 맨해튼 밀도) — 강 방향으로 -8° 기운 애비뉴×스트리트.
  const GA = -0.14, GOX = 28, GOY = 20;
  const gridUV = (x, y) => { const dx = x - GOX, dy = y - GOY, ca = Math.cos(GA), sa = Math.sin(GA); return [dx * ca + dy * sa, -dx * sa + dy * ca]; };
  const uvXY = (u, v) => { const ca = Math.cos(GA), sa = Math.sin(GA); return [GOX + u * ca - v * sa, GOY + u * sa + v * ca]; };
  const inCity = (x, y) => {
    const [u, v] = gridUV(x, y);
    return u > -2 && u < 66 && v > -2 && v < 46
      && y < seaLine(x) - 2 && x > river(Math.min(1, Math.max(0, y / 78)))[0] + 3
      && !(x < 45 && y > 60); // 컨테이너항 존은 항만 시그니처가 담당
  };
  const inPark = (x, y) => { const [u, v] = gridUV(x, y); return u > 30 && u < 44 && v > 6 && v < 14; }; // 도심의 허파(직사각 공원)
  // 식생: 대도시 억제 — 시가지에선 녹지 소멸(공원 제외), 외곽 구릉·강변만 잔존.
  const vegAt = (x, y) => (inPark(x, y) ? 2.2 : 0)
    + vnoise(x * 0.075 + 70, y * 0.075 + 20) + (vnoise(x * 0.18 + 12, y * 0.18 + 66) - 0.5) * 0.4
    - (inCity(x, y) ? 1.5 : 0)
    - Math.max(0, (x - 52) / 48) * Math.max(0, (38 - Math.abs(y - 34)) / 38) * 0.34;
  // 1) 색면 — 종이/식생/바다 (홈과 동일 팔레트·디더 문법)
  const paper = ['#e7e2d5', '#e0dbcd'], green = ['#b7c398', '#abb98a'], sea = ['#a8c1c5', '#9cb7bc'];
  for (let cy = 0; cy < H / CELL; cy++) {
    for (let cx = 0; cx < W / CELL; cx++) {
      const px = (cx * CELL + CELL / 2) / W * 100, py = (cy * CELL + CELL / 2) / H * 100;
      const jx = px + (rand() - 0.5) * 4.5, jy = py + (rand() - 0.5) * 4.5;
      const pal = (jy > seaLine(jx) || hAt(jx, jy) < -1.35) ? sea : (vegAt(jx, jy) > 0.52 ? green : paper);
      g.fillStyle = (cx + cy) % 2 ? pal[1] : pal[0];
      g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
    }
  }
  // 2) 등고선 — 대도시라 절제(디렉터: 산지 최소화): 레벨 스텝 0.4→0.9 + 시가지 내부는 평탄(생략).
  const gw = 140, gh = 100, cw = W / gw, ch = H / gh, hg = [];
  for (let j = 0; j <= gh; j++) { hg[j] = []; for (let i = 0; i <= gw; i++) hg[j][i] = hAt(i / gw * 100, j / gh * 100); }
  let k = 0;
  for (let lv = -1.5; lv <= 2.5; lv += 0.9, k++) {
    g.lineWidth = k % 2 ? 0.8 : 1.5; g.strokeStyle = k % 2 ? 'rgba(150,120,76,0.34)' : 'rgba(138,108,66,0.55)';
    g.beginPath();
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        const px = (i + 0.5) / gw * 100, py = (j + 0.5) / gh * 100;
        if (py > seaLine(px)) continue;
        if (inCity(px, py)) continue; // 시가지는 평탄 — 등고선 없음
        const a = hg[j][i], b = hg[j][i + 1], c = hg[j + 1][i + 1], d = hg[j + 1][i];
        const x0 = i * cw, y0 = j * ch, x1 = x0 + cw, y1 = y0 + ch, pts = [];
        if ((a > lv) !== (b > lv)) pts.push([x0 + cw * (lv - a) / (b - a), y0]);
        if ((b > lv) !== (c > lv)) pts.push([x1, y0 + ch * (lv - b) / (c - b)]);
        if ((c > lv) !== (d > lv)) pts.push([x1 - cw * (lv - c) / (d - c), y1]);
        if ((d > lv) !== (a > lv)) pts.push([x0, y1 - ch * (lv - d) / (a - d)]);
        if (pts.length >= 2) { g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); }
        if (pts.length === 4) { g.moveTo(pts[2][0], pts[2][1]); g.lineTo(pts[3][0], pts[3][1]); }
      }
    }
    g.stroke();
  }
  // 3) 강 — 북서에서 만으로(경로 정의는 상단 — 시가 클립 공용). 하구에 무너진 현수교: 끊긴 경간 + 낙하 잔해.
  g.lineCap = 'round';
  for (const [w, col] of [[9, 'rgba(140,172,178,0.9)'], [3.5, 'rgba(190,212,214,0.7)']]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(X(river(0)[0]), 0);
    for (let t = 0; t <= 1.001; t += 0.04) { const [rx, ry] = river(t); g.lineTo(X(rx), Y(ry)); }
    g.stroke();
  }
  g.lineCap = 'butt';
  // 무너진 현수교(y 45): 서안 경간 + 동안 경간, 가운데가 없다 — 주탑 2점 + 강물 위 잔해 점
  const bry = 45, brx = river(bry / 78)[0];
  g.strokeStyle = 'rgba(120,92,58,0.9)'; g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(X(brx - 7), Y(bry)); g.lineTo(X(brx - 1.8), Y(bry)); g.stroke();   // 서측 경간
  g.beginPath(); g.moveTo(X(brx + 2.2), Y(bry + 0.4)); g.lineTo(X(brx + 7), Y(bry + 0.6)); g.stroke(); // 동측 경간(어긋남)
  g.fillStyle = 'rgba(120,92,58,0.85)';
  g.fillRect(X(brx - 2.4) - 2, Y(bry) - 5, 4, 10); g.fillRect(X(brx + 2.6) - 2, Y(bry) - 5, 4, 10); // 주탑
  g.fillStyle = 'rgba(100,80,55,0.5)';
  for (let i = 0; i < 5; i++) g.fillRect(X(brx - 1.5 + rand() * 3), Y(bry + 0.5 + rand() * 1.6), 3, 2); // 강에 떨어진 경간 잔해
  // 4) 컨테이너항(남서 물가) — 스택 격자: 작은 직사각 열(건물 발자국과 구별되는 항만 시그니처)
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 11; col++) {
      if (rand() < 0.22) continue; // 빠진 스택(하역된 자리)
      const sx = X(20 + col * 2.1), sy = Y(64 + row * 2.2);
      g.fillStyle = ['rgba(150,110,90,0.5)', 'rgba(110,120,140,0.5)', 'rgba(120,130,105,0.5)'][(row + col) % 3];
      g.fillRect(sx, sy, 16, 9);
      g.strokeStyle = 'rgba(70,62,50,0.45)'; g.lineWidth = 0.8; g.strokeRect(sx, sy, 16, 9);
    }
  }
  for (const qx of [24, 33, 42]) { g.fillStyle = 'rgba(90,84,72,0.6)'; g.fillRect(X(qx), Y(75.5), 3, 26); } // 안벽 크레인 레일 말뚝
  // 5) 시가 격자 블록 (디렉터: 맨해튼 밀도) — 애비뉴(9%)×스트리트(4%) 블록을 발자국으로 빽빽하게.
  //    타원 스프롤 폐기: 대도시는 격자가 뼈대다. 코어(마천루)는 통블록·진하게, 그 외는 1~2분할.
  //    공터는 드물게(폭격 공백 8%) — 밀도가 "수도"를 말한다. 공원(inPark)은 도심의 허파로 비운다.
  for (let v = 0; v < 44; v += 4) {
    for (let u = 0; u < 64; u += 9) {
      const [ccx, ccy] = uvXY(u + 4.5, v + 2);
      if (!inCity(ccx, ccy) || inPark(ccx, ccy)) continue;
      if (hash(u * 3 + 11, v * 3 + 29) < 0.08) continue; // 폭격 공백(드물게)
      const core = Math.hypot(ccx - 64, ccy - 32) < 13;  // 마천루 코어
      const nSplit = core ? 1 : (hash(u, v) < 0.55 ? 1 : 2);
      for (let s = 0; s < nSplit; s++) {
        const uu = u + 0.7 + s * (7.8 / nSplit), vv = v + 0.55;
        const [bxp, byp] = uvXY(uu, vv);
        const bw = (7.8 / nSplit - 0.6) / 100 * W, bh = 2.95 / 100 * H;
        g.save(); g.translate(X(bxp), Y(byp)); g.rotate(GA);
        g.fillStyle = core ? 'rgba(102,95,84,0.46)' : 'rgba(120,112,96,0.34)';
        g.fillRect(0, 0, bw, bh);
        g.strokeStyle = 'rgba(70,62,50,0.55)'; g.lineWidth = 1; g.strokeRect(0, 0, bw, bh);
        if (!core && hash(u + 9, v + 7) < 0.16) { g.fillStyle = 'rgba(171,185,138,0.5)'; g.fillRect(2, 2, 6, 4); } // 옥상 잠식(3년)
        g.restore();
      }
    }
  }
  // 5b) 격자 도로 — 애비뉴 굵게·스트리트 가늘게. 세그먼트 워크로 시가지 안에서만 긋는다(바다·강 위 유출 방지).
  const gridLine = (u0, v0, u1, v1, w, col) => {
    g.strokeStyle = col; g.lineWidth = w;
    const steps = 26;
    let open = false;
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const uu = u0 + (u1 - u0) * i / steps, vv = v0 + (v1 - v0) * i / steps;
      const [px, py] = uvXY(uu, vv);
      if (inCity(px, py) && !inPark(px, py)) {
        if (!open) { g.moveTo(X(px), Y(py)); open = true; } else g.lineTo(X(px), Y(py));
      } else open = false;
    }
    g.stroke();
  };
  for (let u = 0; u <= 64; u += 9) gridLine(u, -1, u, 45, 1.8, 'rgba(120,92,58,0.42)');   // 애비뉴
  for (let v = 0; v <= 44; v += 4) gridLine(-1, v, 65, v, 0.9, 'rgba(120,92,58,0.3)');    // 스트리트
  // 5c) 공원(도심의 허파) — 테두리 + 산책로 교차 (색면은 vegAt이 이미 초록으로 채움)
  {
    const corners = [[30, 6], [44, 6], [44, 14], [30, 14]].map(([u, v]) => uvXY(u, v));
    g.strokeStyle = 'rgba(108,128,82,0.7)'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(X(corners[0][0]), Y(corners[0][1]));
    for (let i = 1; i <= 4; i++) { const c = corners[i % 4]; g.lineTo(X(c[0]), Y(c[1])); }
    g.stroke();
    const [pa, pb] = [uvXY(30, 10), uvXY(44, 10)];
    g.strokeStyle = 'rgba(150,132,96,0.5)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(pa[0]), Y(pa[1])); g.lineTo(X(pb[0]), Y(pb[1])); g.stroke();
  }
  // 6) 도로 — 서쪽 국경에서 들어오는 간선(홈 지도 동측 간선의 연속) + 해안로 + 코어 순환.
  const curveRoad = (pts, w, col, dash) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; if (dash) g.setLineDash(dash);
    const P = pts.map(([px, py]) => [X(px), Y(py)]);
    g.beginPath(); g.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) g.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    g.lineTo(P[P.length - 1][0], P[P.length - 1][1]); g.stroke(); if (dash) g.setLineDash([]);
  };
  const roads = [
    [[0, 47], [8, 47], [15, 46], [24, 44], [32, 40], [40, 36], [50, 33], [60, 31]],   // 국경 간선 → 코어
    [[30, 30], [34, 26], [40, 22], [48, 20]],                                          // 인터체인지 북지선
    [[30, 30], [28, 38], [30, 48], [34, 56], [40, 62]],                                // 인터체인지 남지선(항만)
    [[40, 62], [50, 60], [58, 62], [66, 60]],                                          // 해안로
    [[60, 31], [68, 34], [74, 40], [76, 48]],                                          // 코어 순환
    [[48, 54], [56, 56], [64, 55]],                                                    // 역전로
  ];
  for (const r of roads) curveRoad(r, 6, 'rgba(226,218,194,0.6)');
  for (const r of roads) curveRoad(r, 2.6, 'rgba(120,92,58,0.85)');
  // 인터체인지 램프 고리(고가 교차 시그니처)
  g.strokeStyle = 'rgba(120,92,58,0.7)'; g.lineWidth = 2;
  g.beginPath(); g.arc(X(30), Y(30), 14, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(X(30), Y(30), 24, 0.6, Math.PI * 1.7); g.stroke();
  // 7) 철도 — 북동에서 역으로: 복선 + 침목 대시, 역사(대승강장) 홀 지붕
  const rail = [[86, 14], [74, 24], [62, 36], [52, 48], [47, 55]];
  curveRoad(rail, 4, 'rgba(110,100,86,0.55)');
  g.strokeStyle = 'rgba(80,70,58,0.6)'; g.lineWidth = 1.2;
  for (let t = 0; t < 1; t += 0.055) { // 침목
    const i = Math.min(rail.length - 2, Math.floor(t * (rail.length - 1)));
    const f = t * (rail.length - 1) - i;
    const rx = rail[i][0] + (rail[i + 1][0] - rail[i][0]) * f, ry = rail[i][1] + (rail[i + 1][1] - rail[i][1]) * f;
    g.beginPath(); g.moveTo(X(rx) - 4, Y(ry) - 3); g.lineTo(X(rx) + 4, Y(ry) + 3); g.stroke();
  }
  g.fillStyle = 'rgba(110,102,88,0.55)'; g.fillRect(X(44.5), Y(53), 52, 20);            // 역사 아치 홀 발자국
  g.strokeStyle = 'rgba(70,62,50,0.7)'; g.lineWidth = 1.4; g.strokeRect(X(44.5), Y(53), 52, 20);
  for (let i = 1; i < 4; i++) { g.strokeStyle = 'rgba(70,62,50,0.35)'; g.beginPath(); g.moveTo(X(44.5), Y(53) + i * 5), g.lineTo(X(44.5) + 52, Y(53) + i * 5); g.stroke(); } // 승강장 홈
  // 8) 서쪽 국경 — 일점쇄선(홈 지도 동측의 미러) + 검문 차단 획
  g.strokeStyle = 'rgba(110,88,60,0.55)'; g.lineWidth = 1.6; g.setLineDash([14, 5, 3, 5]);
  g.beginPath(); g.moveTo(X(5.5), Y(16)); g.lineTo(X(6.5), Y(34)); g.lineTo(X(5.2), Y(52)); g.lineTo(X(6.0), Y(66)); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(150,70,58,0.8)'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(X(5.8), Y(44.4)); g.lineTo(X(5.8), Y(49.6)); g.stroke();
  // 9) 접힘 자국 + 표고점 + 그레인 + 비네트 (홈과 동일 마감)
  const crease = (x0, y0, x1, y1) => {
    g.strokeStyle = 'rgba(78,64,42,0.09)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = 'rgba(255,250,236,0.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 1.5, y0); g.lineTo(x1 + 1.5, y1); g.stroke();
  };
  crease(W / 3, 0, W / 3, H); crease(W * 2 / 3, 0, W * 2 / 3, H); crease(0, H / 2, W, H / 2);
  g.fillStyle = 'rgba(92,70,44,0.45)'; g.font = 'italic 14px Georgia, "Times New Roman", serif';
  for (let i = 0; i < 16; i++) { const nx = 6 + rand() * 86, ny = 10 + rand() * 60; if (ny > seaLine(nx) - 4) continue; g.fillText((1 + rand() * 38).toFixed(1), X(nx), Y(ny)); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(70,54,34,0.04)' : 'rgba(255,250,236,0.05)'; g.fillRect(rand() * W, rand() * H, 2, 2); }
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(44,32,18,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return cv.toDataURL();
}
// 항구 지역 해금 게이트: 항구 셸터(예인선)를 해금한 뒤부터 지도에 항구 구역이 뜬다.
// 기존 4지역은 항상 해금(true). ARC-03 마커 문법 그대로, 노출 조건만 얹는다.
// regionUnlocked/isForbiddenRegion/subwayReaches/blizzardBlocks/pickAutoRegion → core/regions.js 이관 (Tier3)
// 항만 야적장 "오늘 바다가 준 것": 날짜로 결정론적으로 부스트 전리품 1종 선택(복권 파밍, 매일 리롤).
// 결정론(day 기반) → 왕복 저장/시뮬 재현성 유지. 후보는 BAL.harbor.yardBoostPool.
function harborYardBoostId(day) {
  const pool = BAL.harbor.yardBoostPool;
  return pool[(day * 2654435761 >>> 0) % pool.length];
}
function showMapInfo(rid) {
  const r = REGIONS[rid];
  const visits = (state.regionVisits || {})[rid] || 0;
  // #85 그려지는 발견: 안 가본 곳은 소문뿐 — 수치(성공률·위험)를 감춰 "가 봐야 아는" 지도로
  if (!visits) {
    $('map-info').innerHTML = `${regionIcon(rid)} <b>${LName(r)}</b> — ${t('map.sketchInfo')}`;
    return;
  }
  const p = rateParts(rid);
  const dur = fmtGameDur(expDuration(r) * GAME_MIN_PER_SEC * BAL.exp.timeScale); // 인게임 소요(배속 반영) — 공업 3시간

  const fc = hasForecast() ? t('forecast.prefix', { text: forecastText() }) : '';
  const mTier = masteryTier(rid); // 2.0 지역 숙련 — 정보줄에 지리 지식 표기
  // #177 보급원 트래커 (게임 리뷰 레버5 "pull 가시화"): 이 지역이 뭘 빚졌나(미수집 시그니처) + 숙련 다음 티어까지.
  //   방문한 지역만 표시(위 !visits 게이트) → 미도달·게이트 지역 시그니처 누출 없음(#90 "조회 불가" 원칙 준수).
  let track = '';
  const sigs = BAL.blueprint.regionItems[rid];
  if (sigs) {
    const unowned = sigs.filter(id => !(state.blueprints || {})[id]);
    track = unowned.length
      ? `<br>${t('map.drops', { items: unowned.map(bpName).join(', ') })}`
      : `<br><span style="color:var(--good)">${t('map.sigDone')}</span>`;
  }
  // #195: 젤 필터북 pull 가시화 — 미보유 시 상업·도심 정보줄에 1줄. 지역 pull로 설계된 기능(#189 P3)인데
  //   지도·도감 어디에도 없어 우연히 맞기 전까지 존재를 알 수 없던 사각.
  if (!state.lightGels && BAL.lighting.gelBookRegions.includes(rid)) track += `<br>${t('map.dropsGel')}`;
  const mNext = mTier < BAL.mastery.tiers.length ? ` · ${t('map.masteryNext', { n: mTier + 1, m: BAL.mastery.tiers[mTier] - visits })}` : '';
  $('map-info').innerHTML = `
    ${t('map.regionLine', { emoji: regionIcon(rid), pct: Math.round(p.eff * 100), name: LName(r), desc: LDesc(r) })}<br>
    ${t('map.riskLine', { risk: LRisk(r), dur, mult: regionDistMult(rid).toFixed(2), wicon: wxIcon(weather.type), wname: LName(WEATHERS[weather.type]), forecast: fc })}
    · ${t('map.visits', { n: visits })}${mTier > 0 ? ` · <span style="color:var(--accent)">${t('map.mastery', { n: mTier })}</span>` : ''}${mNext}${track}`;
}

// 탐험 소요 시간(초): 거리 + 염좌 +30% + 이동형 거점(버스) -25%
function expDuration(r) {
  let t = r.time * regionDistMult(r.id);
  if (state.injury?.type === 'sprain') t *= 1.3;
  t *= SHELTERS[state.current].perk?.timeMult || 1;
  // 1.1 방파제 오두막 완공: 항구 지역 파밍 시간 -25% (전초기지)
  if (state.breakwaterHut && (r.id === 'harborYard' || r.id === 'fishMarket')) t *= 0.75;
  // 1.2 지하 노선 개통: 연결 지역은 탐험 시간 -50% (어둠 속 지름길). 셸터 무관 — 노선이 열려 있으면 적용.
  if (subwayReaches(r.id)) t *= BAL.subway.openTimeMult;
  // 1.3 케이블카: 리조트(고원) 접근 시간. 복구 전에는 등반으로 오래 걸리고(×1.4), 완공 후 곤돌라로 단축(×0.7).
  //   전/후 실측용으로 두 배수를 명시적으로 나눈다(게이트: 완공 전후 접근 시간 유의미 차이).
  if (r.id === 'resort') t *= state.cablecarDone ? BAL.highland.cablecarTimeDone : BAL.highland.cablecarTimeRaw;
  // 1.3 눈사태 우회로 선택: 이번 출발이 우회로면 시간 증가(위험 감수 대신 안전 경로 아님 — GD: 시간 vs 위험).
  if (state._avalancheDetour && r.id === 'resort') t *= BAL.highland.avalancheDetourTimeMult;
  // 1.4 벙커 지하 통로 경로: 벙커 거주 + 통로 정리 완공 시, 연구동(lab)까지 지하망 지름길(2번째 접근 경로).
  if (r.id === 'lab' && bunkerUndercroftRoute()) t *= BAL.forbidden.undercroftLabTimeMult;
  return Math.round(t);
}
// 1.4 벙커 지하 통로가 금지 구역 연구동으로 이어진 상태인가 (clearPassage 복선 회수).
//   벙커 거주 + 통로 정리 프로젝트 완공 = "저편의 희미한 빛"이 연구동 지하 진입로였음이 밝혀진다.
function bunkerUndercroftRoute() {
  return state.current === 'bunker' && projectDone('clearPassage');
}
// 게임 시간 포매터 — 게임 '분'을 받아 "N분 / N시간 / N시간 N분"으로 표기 (5분 단위 반올림).
// 실초→게임분은 ×GAME_MIN_PER_SEC(1.5). 메커니즘은 건드리지 않고 라벨만 게임 시간으로 통일.
function fmtGameDur(min) {
  let m = Math.round(min / 5) * 5;
  if (m < 60) return t('dur.min', { n: m });
  const h = Math.floor(m / 60), mm = m % 60;
  return mm === 0 ? t('dur.h', { h }) : t('dur.hm', { h, m: mm });
}
// 가을 비축 경고: 겨울 시작 N일 전이면 권장 연료·보존식과 현 보유를 대조한 조언 객체 반환 (아니면 null)
function winterPrepAdvice(day = state.day) {
  const S = BAL.seasons;
  const idx = seasonIndex(day);
  // 다음 겨울 시작일 = 다음 겨울 계절의 첫날. 계절 순서 spring(0)summer(1)autumn(2)winter(3)
  const cyclePos = idx % 4;                       // 0봄1여름2가을3겨울
  if (cyclePos !== 2) return null;                // 가을에만 (겨울 직전)
  const winterStart = (idx + 1) * SEASON_DAYS + 1; // 다음 계절(겨울) 첫날
  const daysLeft = winterStart - day;
  if (daysLeft > S.prepWarnDaysBefore || daysLeft <= 0) return null;
  const winterDays = SEASON_DAYS;
  const fuelNeed = Math.ceil(winterDays * S.prepFuelPerDay * S.prepBufferMult);
  const cannedNeed = Math.ceil(winterDays * S.prepCannedPerDay * S.prepBufferMult);
  const fuelHave = state.res.fuel || 0;
  const cannedHave = (state.res.canned || 0) + (state.res.food || 0);
  return {
    daysLeft, fuelNeed, cannedNeed, fuelHave, cannedHave,
    fuelOk: fuelHave >= fuelNeed, cannedOk: cannedHave >= cannedNeed,
  };
}
// 날씨 예보 (라디오 배치 또는 등대 특성)
function hasForecast() {
  return (state.upkeepOk && !!SHELTERS[state.current].perk?.forecast) || items.some(i => i.defId === 'radio');
}
function forecastText() {
  const nextDayStart = (Math.floor(state.gameMin / 1440) + 1) * 1440;
  return state.weatherUntil > nextDayStart
    ? t('forecast.tomorrowSame', { icon: wxIcon(state.weatherType), name: LName(WEATHERS[state.weatherType]) })
    : t('forecast.tomorrowChange');
}
// 탐험은 준비 단계를 거친다 (기획서 v0.2: 지역 → 날씨/위험 확인 → 준비물 → 출발)
// 탐험 봉쇄 사유 (순수 판정 — 토스트 없음). startExpedition(모달 경로)과 관측 단말 focus 패널(S2)이 공유.
//   반환: null=출발 가능 · {key, params}=사유 i18n 키 · {key:''}=무토스트 차단(도달 불가 방어선).
function expBlockReason(regionId) {
  if (isWallpaper()) return { key: 'wallpaper.noAction' }; // 배경화면: 탐험 off
  if (isExhausted()) return { key: 'toast.exhausted' };
  if (state.energy < BAL.exp.minEnergy) return { key: 'toast.tooTired' };
  // #199 5차-c(디렉터): 일일 상한 차단 폐지 — 에너지가 실질 제한. 과로 회복 페널티(expFatigue)는 존치.
  if (blizzardBlocks(regionId)) return { key: 'subway.blizzardBlocked' }; // 1.2 폭설 봉쇄 (개통 구간은 예외)
  if (!regionReachable(regionId)) return { key: '' }; // 2.0-(b): 타 도시 지역 출발 차단 — 지도에서 이미 숨겨 도달 불가 방어선(무토스트)
  // 1.4 금지 구역 진입 게이트 — 방호복 미제작/내구 소진 시 차단. "방호복 없이는 한 걸음도"의 실측 지점.
  //   2.0 낙진 시계: 겨울 셋을 넘겨 낙진이 걷히면 맨몸 개방(우회) — 대신 resolve에서 잔류 방사능 부상 롤.
  if (isForbiddenRegion(regionId) && !hazmatUsable() && !falloutCleared())
    return { key: state.hazmat ? 'hazmat.wornOut' : 'hazmat.blocked' };
  if (avalancheBlocks(regionId)) return { key: 'avalanche.blockedToast', params: { n: state.avalancheBlockUntil - state.day + 1 } }; // 1.3 눈사태 봉쇄
  return null;
}
function startExpedition(regionId) {
  if (DEMO_ED && state.demoEnded) { toast(t('demo.end.locked')); return; } // #74: 종료된 데모 세이브는 진행 금지
  if (paused) { toast(t('pause.blocked')); return; }
  if (state.exp) return;
  const blocked = expBlockReason(regionId);
  if (blocked) { if (blocked.key) toast(t(blocked.key, blocked.params)); return; }
  // 1.3 눈사태 예보 당일 리조트 탐험: 우회(안전·이번 예보 해소) vs 위험 감수(성공률↓·보상 1.5배·부상 위험) 선택
  if (avalancheForecastToday(regionId)) { openAvalancheChoice(regionId); return; }
  openPrepModal(regionId);
}
// 1.3 눈사태 예보 당일 선택 모달 — 예보(우르릉) → 선택이 있다(원칙 준수). 사망 없음(cozy 캐논).
function openAvalancheChoice(regionId) {
  openModal(t('avalanche.title'), `
    <div style="line-height:1.9;margin-bottom:10px">${t('avalanche.body')}</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="pixel-btn primary" id="av-detour">${t('avalanche.detour')}</button>
      <button class="pixel-btn" id="av-turnback">${t('avalanche.turnback')}</button>
    </div>`);
  $('av-detour').addEventListener('click', () => {
    state._avalancheDetour = true;       // 이번 출발에 우회 플래그 (expDuration·resolveExpedition이 읽고 소진)
    state.avalancheForecast = 0;         // 예보 해소 (직접 대응했다)
    closeModal(); openPrepModal(regionId);
  });
  $('av-turnback').addEventListener('click', () => {
    // 돌아섬 → 리조트가 avalancheDur일 봉쇄된다 (능동적으로 위험을 피한 대가: 접근 상실)
    state.avalancheForecast = 0;
    state.avalancheBlockUntil = state.day + BAL.highland.avalancheDur - 1;
    toast(t('avalanche.turnedback'));
    closeModal();
  });
}
/* 1.2 폭설 봉쇄(최소 구현) — 겨울 '눈' 날씨엔 지상 지역 탐험 봉쇄. 개통된 지하 노선 구간은 예외(지하 우회).
   지하철 셸터 자체는 날씨가 닿지 않지만(weatherPool clear), 봉쇄는 '목적지 지상'이 눈에 파묻히는 것이라
   현재 어느 셸터에 있든 겨울+눈이면 판정한다. 항구 지역(harborYard/fishMarket)은 물가라 폭설 봉쇄 대상 아님. */
// BLIZZARD_EXEMPT_REGIONS + blizzardBlocks → core/regions.js 이관 (Tier3)
// 1.3 눈사태 봉쇄: 자연 봉쇄(예보 방치)로 리조트가 닫혀 있는가. 예보 당일은 봉쇄가 아니라 '선택'(우회/감수)이다.
function avalancheBlocks(regionId) {
  if (regionId !== 'resort') return false;
  return state.avalancheBlockUntil > 0 && state.day <= state.avalancheBlockUntil;
}
// 1.3 눈사태 예보 '당일'인가 — 리조트 탐험 시 우회/감수 선택지를 띄우는 게이트.
function avalancheForecastToday(regionId) {
  return regionId === 'resort' && state.avalancheForecast > 0 && state.day >= state.avalancheForecast;
}
function openPrepModal(regionId) {
  const r = REGIONS[regionId];
  openModal(t('prep.title', { emoji: r.emoji, name: LName(r) }), '');
  prepUI(regionId, $('modal-body'));
}
// 준비물·성공률 분해·출발 버튼 UI를 임의 컨테이너에 그린다 — 준비 모달과 관측 단말 focus 패널(S2)이 공유.
function prepUI(regionId, body) {
  const r = REGIONS[regionId];
  const selected = new Set();
  let bag = false; // 가방(§E) 챙김 여부
  const render = () => {
    const p = rateParts(regionId, [...selected]);
    const lines = [];
    lines.push(t('prep.base', { pct: Math.round(p.base * 100) }));
    if (p.shelter) lines.push(`<span style="color:var(--good)">${t('prep.shelter', { pct: Math.round(p.shelter * 100) })}</span>`);
    if (p.district) lines.push(`<span style="color:var(--good)">${t('prep.district', { pct: Math.round(p.district * 100) })}</span>`);
    if (p.comfort) lines.push(`<span style="color:var(--good)">${t('prep.comfort', { pct: Math.round(p.comfort * 100) })}</span>`);
    if (p.gear) lines.push(`<span style="color:var(--good)">${t('prep.gear', { pct: Math.round(p.gear * 100) })}</span>`);
    if (p.buff) lines.push(`<span style="color:${p.buff > 0 ? 'var(--good)' : 'var(--bad)'}">${t('prep.buff', { label: buffLabel(state.buff) || t('prep.event'), sign: p.buff > 0 ? '+' : '', pct: Math.round(p.buff * 100) })}</span>`);
    if (p.weatherPen) lines.push(`<span style="color:var(--bad)">${t('prep.weatherPen', { pct: Math.round(p.weatherPen * 100) })}</span>`);
    if (p.injuryPen) lines.push(`<span style="color:var(--bad)">${t('prep.injuryPen', { pct: Math.round(p.injuryPen * 100) })}</span>`);
    if (p.hungryPen) lines.push(`<span style="color:var(--bad)">${t('prep.hungryPen', { pct: Math.round(p.hungryPen * 100) })}</span>`);
    const cost = {};
    for (const id of selected) for (const [rid, n] of Object.entries(PREPS[id].cost)) cost[rid] = (cost[rid] || 0) + n;
    const dur = fmtGameDur(expDuration(r) * GAME_MIN_PER_SEC * BAL.exp.timeScale); // 인게임 소요(배속 반영) 표기
    const fc = hasForecast() ? t('forecast.prefix', { text: forecastText() }) : '';
    // 획득물 요약(디렉터 2026-07-22: 디테일="뭘 얻을 수 있고, 소요시간 정도") — 소요는 아래 riskLine의 dur가 담당
    const lootBits = (r.lootRes || []).map(([id, a, b, ch]) => {
      const nm = LName(RESOURCES[id] || { name: id, nameEn: id });
      return (ch != null && ch < 1) ? `${nm} ${Math.round(ch * 100)}%` : `${nm} ×${a}${b > a ? '~' + b : ''}`;
    });
    if (r.furnChance) lootBits.push(t('obs.lootFurn', { pct: Math.round(r.furnChance * 100) }));
    body.innerHTML = `
      <div class="rate-line">
        ${t('prep.rateLine', { emoji: r.emoji, pct: Math.round(p.eff * 100), lines: lines.join(' · ') })}<br>
        ${t('prep.riskLine', { risk: LRisk(r), dur, sprain: state.injury?.type === 'sprain' ? t('prep.sprainTag') : '', mobile: SHELTERS[state.current].perk?.timeMult ? t('prep.mobileTag') : '', wicon: wxIcon(weather.type), wname: LName(WEATHERS[weather.type]), forecast: fc })}
      </div>
      ${lootBits.length ? `<div class="loot-line">${t('obs.loot', { items: lootBits.join(' · ') })}</div>` : ''}
      <div id="prep-list">${Object.entries(PREPS).map(([id, pr]) => {
        const has = resHasAll(pr.cost);
        return `<div class="prep-row ${selected.has(id) ? 'sel' : ''} ${has ? '' : 'no'}" data-prep="${id}">
          <span>${icon('icon_prep_' + id, pr.emoji)} ${LName(pr)}</span>
          <span class="p-eff">${LEff(pr)}</span>
          <span class="p-cost">${costIcons(pr.cost)}</span>
        </div>`;
      }).join('')}</div>
      ${state.bagDur > 0
        ? `<div class="prep-row sel" style="margin-top:6px;cursor:default">
            <span>${t('prep.bagOwn', { n: state.bagDur })}</span>
            <span class="p-eff">${t('prep.bagEff')}</span>
          </div>`
        : `<div class="prep-row ${resHasAll(BAL.exp.bagCost) ? '' : 'no'}" data-bag="1" style="margin-top:6px">
            <span>${t('prep.bagCraft')}</span>
            <span class="p-eff">${t('prep.bagEff')}</span>
            <span class="p-cost">${costIcons(BAL.exp.bagCost)}</span>
          </div>`}
      <div style="font-size:11px;color:var(--text-dim);margin:8px 0">
        ${t('prep.expectCost', { cost: Object.keys(cost).length ? costLabel(cost) : t('none') })}
      </div>
      <button class="pixel-btn primary" id="btn-depart" style="width:100%">${t('prep.depart', { dur })}</button>`;
    body.querySelectorAll('.prep-row[data-prep]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.prep;
        if (selected.has(id)) selected.delete(id);
        else if (resHasAll(PREPS[id].cost)) selected.add(id);
        else { toast(t('prep.needFor', { name: LName(PREPS[id]) })); return; }
        render();
      });
    });
    // DDD-3 내구성 승격: 미보유 시 행 클릭 = 즉시 제작(내구 만충). 보유 시엔 자동 적용이라 토글 없음.
    const bagEl = body.querySelector('[data-bag]');
    if (bagEl) bagEl.addEventListener('click', () => {
      if (!resConsumeAll(BAL.exp.bagCost)) { toast(t('prep.needFor', { name: t('prep.bagCraft') })); return; }
      state.bagDur = BAL.exp.bagDur;
      toast(t('prep.bagCrafted', { n: BAL.exp.bagDur }));
      playSfx('craft');
      scheduleSave(); renderResBar(); render();
    });
    body.querySelector('#btn-depart').addEventListener('click', () => departExpedition(regionId, [...selected], { bag }));
  };
  render();
}
async function departExpedition(regionId, prep, opts2 = {}) {
  if (paused) { toast(t('pause.blocked')); return; }
  if (state.exp) return;
  // 준비 모달을 열어둔 사이 상태가 나빠졌을 수도 있다 — 출발 직전 재검사
  if (isExhausted()) { toast(t('toast.exhausted'), 'warn'); closeModal(); return; }
  if (state.energy < BAL.exp.minEnergy) { toast(t('toast.tooTired'), 'warn'); closeModal(); return; }
  // #199 5차-c(디렉터): 일일 상한 차단 폐지(출발 재검사도) — 과로 페널티(expFatigue)는 존치
  const r = REGIONS[regionId];
  const p = rateParts(regionId, prep);
  // 저성공률 출발 확인 — 수동 클릭 경로에서만 (자동진행/blackout에선 확인창 금지: 게임이 멈춘다)
  if (!opts2.auto && p.eff < 0.5 && !(await gameConfirm(t('exp.confirmRisky', { p: Math.round(p.eff * 100) }), t('confirm.depart'), t('confirm.no')))) return;
  for (const id of prep) resConsumeAll(PREPS[id].cost);
  // 가방(§E → DDD-3 내구성 승격): 소지(bagDur>0)면 자동 적용 — 출발 소모 없음, 마모는 발동한 탐험에서만.
  const bagOk = state.bagDur > 0;
  const dur = expDuration(r) * 1000;
  // 탐험도 몸을 쓴다 (소모 절반으로 완화) + 에너지 소모
  const expMul = isHard() ? 1.5 : 1; // 하드: 탐험 게이지 소모 +50%
  // P2: 소모량은 BAL.exp 단일 출처 — sim(_simDaysInner)과 실경로가 같은 상수를 읽는다(리터럴 이원화 봉합)
  state.hunger = Math.max(0, state.hunger - BAL.exp.hungerCost * expMul);
  state.thirst = Math.max(0, state.thirst - (prep.includes('bottle') ? BAL.exp.thirstCostBottle : BAL.exp.thirstCost) * expMul);
  state.energy = Math.max(0, state.energy - BAL.exp.energyCost);
  if (state.energy < BAL.exp.minEnergy) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  // 성공률 버프/디버프는 이번 출발에 반영되어 소진 (물자 좌표 버프는 정산 시)
  if (state.buff?.exp) state.buff = null;
  // #94(디렉터): 출발 시각 기록 — 귀환 정산이 '대기 중 이미 흐른 게임 시간'을 차감해 이중 계산을 없앤다.
  // durMin = 이번 트립의 인게임 소요(분) — 출발 시점 확정(도중에 염좌 회복/노선 개통돼도 이번 트립은 그대로)
  state.exp = { region: regionId, end: Date.now() + dur, dur, rate: p.eff, prep, startGameMin: state.gameMin,
    durMin: Math.round(expDuration(r) * GAME_MIN_PER_SEC * BAL.exp.timeScale), bag: bagOk };
  closeModal();
  scheduleSave();
  $('exp-panel').classList.add('show'); // 진행 상황 표시 — 스택 재배치가 show 상태를 봐야 하므로 렌더보다 먼저
  renderExpPanel();
  renderResBar();
  toast(t('exp.start', { emoji: r.emoji, name: LName(r), pct: Math.round(p.eff * 100) }));
  questProgress('depart');
  playSfx('door');
  setTimeout(() => playSfx(seasonOf().id === 'winter' ? 'steps_snow' : 'steps_hard'), 400);
}
// 성공률 체감 보정: 표기(rate)는 그대로 두고 실제 판정 확률만 몰래 올린다.
// 표기 73%에서 3연속 실패=2%지만 체감은 "사기" — 플레이어 신뢰 보호용 숨은 보정.
// 노말 +4%p 상시 + pity(연속 실패당 +8%p, 캡3). 하드는 상시 보정 없이 pity만. 상한 0.95.
// expActualRate → core/expedition.js (import).
function resolveExpedition() {
  const exp = state.exp;
  if (!exp) return;
  playSfx('door');
  const r = REGIONS[exp.region];
  // #85 그려지는 발견: 다녀온 지역은 지도에 잉크로 남는다 (성패 무관 — 밟아 본 땅)
  // 시뮬 순수성 가드(recordNormalDay 선례): v1.6 사이클에서 이 카운터 유무가 시드 고정 시뮬의
  //   자원 궤적을 미세 변화시키는 히든 커플링 실측(생존 지표는 diff-0, 경로 미규명 — 백로그 조사).
  //   시뮬엔 지도 연출이 무의미하므로 제외 — 기준선 재현성 보존.
  let masteryUp = 0; // 2.0 지역 숙련: 이번 귀환으로 지리 지식 티어가 올랐는가 (아래 notes에 인과문)
  let masteryFull = false; // #204: 이번 귀환으로 숙련 100% 첫 도달 (정산 노트 병기)
  if (!_simRunning) {
    state.regionVisits = state.regionVisits || {};
    const _mPrev = masteryTier(exp.region);
    state.regionVisits[exp.region] = (state.regionVisits[exp.region] || 0) + 1;
    const _mNow = masteryTier(exp.region);
    if (_mNow > _mPrev) masteryUp = _mNow;
    // #204: 숙련 100%(최종 티어) 첫 도달 — 업적식 알림 1회(세이브 플래그로 재발화 차단).
    //   토스트는 단일 엘리먼트 덮어쓰기라 정산 전리품 토스트 러시에 묻힌다(하네스 실측) —
    //   러시가 끝난 4초 뒤 지연 발화 + 정산 카드 노트에도 병기(놓쳐도 기록이 남게).
    state.masteryDone = state.masteryDone || {};
    if (_mNow >= BAL.mastery.tiers.length && !state.masteryDone[exp.region]) {
      state.masteryDone[exp.region] = 1;
      masteryFull = true;
      const _mName = LName(REGIONS[exp.region]);
      setTimeout(() => toast(t('ach.unlocked', { name: t('mastery.fullName', { name: _mName }) })), 4000);
    }
  }
  const prep = exp.prep || [];
  const startedInjured = !!state.injury;        // 다친 몸으로 출발했는가 (인과문용)
  const departWeather = weather.type;            // 출발 시점 날씨
  const departColdSnap = coldSnapNetSeverity() > 0; // 한파 중 출발
  let injuryRolled = false, injuryAvoided = false; // 부상 판정 발생/회피 (장갑 인과문용)
  state.exp = null;
  state.stats.exp++;
  // 탐험을 다녀오면 하루가 그만큼 흘러 있다 (거리 비례 2~5시간)
  // 탐험 시간 개편(디렉터 2026-07-08, #94 후속): 소요시간은 대기 중 배속(tickTime ×timeScale)으로
  //   이미 다 흘렀다 — 정상 귀환의 점프는 0. 아래 차감식은 안전망으로만 남는다(앱 종료 후 오프라인
  //   정산이 1배속으로 흘렀거나, 구세이브 in-flight 탐험처럼 durMin이 없는 경우의 잔여분 보전).
  const expIntendedMin = exp.durMin != null ? exp.durMin : 120 + expDuration(r) * 2.5; // 폴백=구식
  const expPassedMin = (exp.startGameMin != null) ? Math.max(0, state.gameMin - exp.startGameMin) : 0;
  state.gameMin += Math.max(0, expIntendedMin - expPassedMin);
  state.expToday = (state.expToday || 0) + 1;
  const rate = exp.rate ?? r.rate;                         // 표기용(화면에 보인 확률) — 변경 없음
  const actual = expActualRate(rate, state.expFailStreak); // 실제 판정 확률(숨은 보정)
  const roll = Math.random();
  const gotRes = {};   // 자원 획득
  let got = [];        // 가구 획득
  const notes = [];
  const special = [];  // 희귀 전리품 박스(도료/도면/책 등) — 정산창에 희귀도별 빛나는 테두리로 (디렉터 2026-07-09)
  let title, body;
  // 1.4 금지 구역 탐험 — 성패와 무관하게 방호복이 노출됐다: 내구 -1. 다 닳으면 다음 진입이 차단된다(수리 필요).
  //   2.0 낙진: 방호복 없이(걷힌 뒤 맨몸) 들어간 트립은 barehand 표식 — 아래 잔류 방사능 롤이 읽는다.
  const barehandTrip = isForbiddenRegion(exp.region) && !hazmatUsable();
  if (isForbiddenRegion(exp.region)) { wearHazmat(); if (state.hazmat) notes.push(t('hazmat.wearNote', { dur: state.hazmat.dur })); }
  // 2.0 지역 숙련: 티어 상승의 순간 — 성패와 무관하게 알린다 (실패한 트립도 진행이었다는 감각).
  if (masteryUp) notes.push(t('mastery.up', { name: LName(r), stars: ''.repeat(masteryUp) }));
  if (masteryFull) notes.push(t('mastery.fullNote', { name: LName(r) })); // #204: 숙련 100% — 정산 카드에도 기록
  // #167 2겹화: 슬럼 1 도달의 그 귀환에서 심부가 열린다 — 지도에 새 핀 + 아침 보고 한 줄.
  if (masteryUp === 1 && exp.region === 'slum') {
    notes.push(t('map.deepOpen'));
    toast(t('map.deepOpenToast'));
  }
  // hard=true인 기본 획득에만 하드 -30%를 적용한다. 은닉처 loot×2 버프는 hard=false로 호출해
  // 온전한 2배를 보장 — 유저가 얻은 "2배" 버프의 체감 가치를 하드가 깎지 않도록.
  // 1.1 항만 야적장: 그날 부스트되는 전리품 1종(결정론적, 왕복/시뮬 재현) · 수산시장: 겨울 결빙 절반.
  const yardBoostId = r.harborYard ? harborYardBoostId(state.day) : null;
  const harborMult = (r.fishMarket && seasonOf().id === 'winter') ? BAL.harbor.marketWinterMult : 1;
  // #164 지역 컨디션: 풍(+25%)/마름(-20%)이 기본 획득에 곱해진다 — 지도 배지와 같은 값(체감 일치).
  const condLv = (state.regionCond && state.regionCond.lv && state.regionCond.lv[exp.region]) || 0;
  const condMul = condLv > 0 ? BAL.regionCond.richMul : condLv < 0 ? BAL.regionCond.leanMul : 1;
  const rollRes = (mult = 1, hard = true) => {
    for (const [id, min, max, chance] of r.lootRes) {
      if (chance != null && Math.random() > chance) continue;
      let n = Math.round((min + Math.random() * (max - min)) * mult * harborMult * condMul);
      if (id === yardBoostId) n = Math.round(n * BAL.harbor.yardBoostMult); // 오늘 바다가 준 것
      if (hard) n = hardLoot(n);
      // 동부 수확 겹(EAST-ECONOMY.md): incomeMul 위에 도심 추가 조임 — 하드·하드코어만(미표기 모드=1).
      //   확률 반올림(hardLoot 문법)으로 소량 수확의 기대값 보존. 설비 산출은 이 파이프 밖(무페널티).
      const em = r.city === 'east' ? (BAL.cities.eastLootMul?.[state.mode] ?? 1) : 1;
      if (em !== 1 && n > 0) { const x = n * em, f = Math.floor(x); n = f + (Math.random() < x - f ? 1 : 0); }
      if (n > 0) { gotRes[id] = (gotRes[id] || 0) + n; resAdd(id, n); }
    }
  };
  // 가구 파밍은 극히 드물다 — 그리고 큰 가구일수록 더 드물다 (대부분은 제작으로)
  // #193: 도면 게이트 가구는 전체풀(슬럼·심부)에서도 도면 보유 전 제외 — DDD-4 「지역 독점」 원칙이
  //   슬럼 우회 드랍으로 뚫리던 감사 확정 결함. 도면을 주운 뒤엔 드랍 허용(제작 대신 줍는 행운).
  const pickFurniture = rawPool => {
    const pool = rawPool.filter(id => !bpGatedLocked(id));
    if (!pool.length) return null;
    const ws = pool.map(id => 1 / (DEFS[id].fp.w * DEFS[id].fp.d));
    let sum = ws.reduce((a, b) => a + b, 0), roll = Math.random() * sum;
    for (let i = 0; i < pool.length; i++) { roll -= ws[i]; if (roll <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };
  const success = roll < actual;
  const partial = !success && roll < actual + (1 - actual) * BAL.pity.partialFactor;
  const detour = !!state._avalancheDetour && exp.region === 'resort'; // 1.3 눈사태 위험 우회로
  // pity streak 갱신: 성공하면 리셋, 실패(부분 포함)면 증가
  if (success) state.expFailStreak = 0;
  else state.expFailStreak = (state.expFailStreak || 0) + 1;
  if (success) {
    rollRes(1);
    // 1.3 눈사태 위험 우회로: 보상 1.5배 (추가분을 하드 감산 없이 얹는다 — 위험 감수의 대가). GD 준수.
    if (detour) { rollRes(BAL.highland.avalancheDetourLootMult - 1, false); notes.push(t('avalanche.detourLoot')); }
    if (state.buff?.loot) { // 은닉처 좌표: 자원 2배 (하드 감산 없이 온전한 +1배)
      rollRes(1, false);
      notes.push(t('exp.note.loot2'));
      state.buff = null;
    }
    // 2.0 지역 숙련: 티어당 가구 발견율 +1%p — "단골은 좋은 물건 자리를 안다" (시뮬은 티어 0 = 기존과 동일)
    if (Math.random() < r.furnChance + masteryTier(exp.region) * BAL.mastery.furnPerTier) {
      const fid = pickFurniture(r.pool);
      if (fid) { got.push(fid); notes.push(t('exp.note.furniture')); }
    }
    // 절단기 특수 드랍 (#36) — 공업지대 성공 탐험 10%, 미보유 시 1회. 벙커 뒷문 프로젝트 재료.
    if (exp.region === 'industrial' && !state.hasCutter && Math.random() < 0.10) {
      state.hasCutter = true;
      notes.push(t('cutter.foundNote'));
    }
    // 2.0 총 드랍 (§9.3, 절단기 문법) — 하드코어 전용·도심 중심지 성공 탐험·미보유 시.
    //   citycore는 sim 로테이션 밖이라 이 롤은 시드 시뮬 스트림과 무접점.
    if (exp.region === 'citycore' && isHardcore() && !state.gun && Math.random() < BAL.hostile.gunDropChance) {
      state.gun = { dur: BAL.hostile.gunDur };
      notes.push(t('gun.foundNote', { dur: BAL.hostile.gunDur }));
    }
    // 세계관 메모/유서 드랍 (#35) — 성공 탐험에서만. 수집 시 결산 노트 + 닫은 뒤 쪽지 팝업 예약.
    //   1.4: 금지 구역이면 이번 탐험 목적지(exp.region)를 넘겨 기밀 문서를 우선 드랍한다.
    const drop = tryDropMemoOnExpedition(exp.region);
    if (drop) {
      const tbl = drop.will ? WILLS : MEMOS;
      notes.push(t(drop.will ? 'memo.foundWillNote' : 'memo.foundNote', { title: LN(tbl[drop.id]) }));
      state.pendingMemoPopup = { id: drop.id, will: drop.will };
    }
    // #76 지식: 폐허에서 성한 책 한 권 (탐험 성공 희귀 드랍 — 사치 가구 재료). 암시장 판매 부산물과 별개의 '지식' 손맛.
    if (Math.random() < BAL.luxury.bookDropChance) { resAdd('book', 1); notes.push(t('exp.note.book')); }
    // 도료 드랍 (REWARD-LOOP ② — 잭팟 층): 성공 탐험 저확률, 지역 시그니처 계열 가중.
    //   resolveExpedition은 sim 미사용(§9.7) — 책 드랍과 같은 스트림, 시드 시뮬 무접점.
    if (Math.random() < BAL.paint.dropChance) {
      const fam = rollPaintFamily(exp.region);
      state.paints[fam] = (state.paints[fam] || 0) + 1;
      notes.push(t('paint.foundNote', { name: LName(PAINT_FAMILIES[fam]) }));
      special.push({ icon: icon('icon_loot_paint', ''), label: LName(PAINT_FAMILIES[fam]), n: 1, tier: 'rare', swatch: PAINT_FAMILIES[fam].swatch });
      jackpotToast(t('paint.jackpot', { name: LName(PAINT_FAMILIES[fam]) }), PAINT_FAMILIES[fam].swatch);
    }
    // 네온 안료 (디렉터 2026-07-09): 도심 전용 최희귀 도료 — 일반 도료 풀과 무관한 별도 저확률 롤.
    //   네온 시그니처 가구(VIP·ON AIR) 색은 이걸로만 칠한다 → "그 색은 도심에서만".
    if (exp.region === 'citycore' && Math.random() < BAL.paint.neonDropChance) {
      state.paints.neonPigment = (state.paints.neonPigment || 0) + 1;
      notes.push(t('paint.neonNote'));
      special.push({ icon: icon('icon_loot_paint', ''), label: LName(RARE_PAINTS.neonPigment), n: 1, tier: 'legendary', swatch: RARE_PAINTS.neonPigment.swatch });
      jackpotToast(t('paint.neonJackpot'), RARE_PAINTS.neonPigment.swatch);
    }
    // DDD-4 시그니처 도면 (REWARD-LOOP ② 2차): 지역 독점 가구의 도면 — 도료보다 희귀한 잭팟 층.
    //   그 지역에서만, 미보유 도면 중 가중 픽(그래피티는 weights로 더 희귀 — 디렉터 2026-07-09).
    //   2.0-(e): 동부 시그니처는 가구가 아니라 복장(outfit_*) — 이름은 bpName이 분기, 발견 컷은 가구만.
    {
      const bpPool = (BAL.blueprint.regionItems[exp.region] || []).filter(id => !(state.blueprints || {})[id]);
      if (bpPool.length && Math.random() < BAL.blueprint.dropChance) {
        const w = BAL.blueprint.weights || {};
        const total = bpPool.reduce((a, id) => a + (w[id] ?? 1), 0);
        let r = Math.random() * total, bpId = bpPool[bpPool.length - 1];
        for (const id of bpPool) { r -= (w[id] ?? 1); if (r < 0) { bpId = id; break; } }
        state.blueprints = state.blueprints || {};
        state.blueprints[bpId] = 1;
        notes.push(t('bp.foundNote', { name: bpName(bpId) }));
        special.push({ icon: icon('icon_loot_blueprint', ''), label: t('bp.lootLabel', { name: bpName(bpId) }), tier: 'legendary' });
        jackpotToast(t('bp.jackpot', { name: bpName(bpId) }), 0xd4b46a);
        if (DEFS[bpId]) queueDiscovery(bpId, 0, 3, bpName(bpId)); // #150 발견 컷 — 가구 도면만(복장은 디오라마 모델 없음)
      }
    }
    // #190 커먼 도면 (「생존의 흔적」 밀도 프롭 5종): 전 지역 저확률 파밍 — 디렉터 오더(기본 배치 대신).
    //   시그니처(전설·발견컷·지역 독점)와 별개 채널: rare 층, 컷 없음, 시그니처 풀 비희석.
    {
      const cPool = (BAL.blueprint.commonItems || []).filter(id => !(state.blueprints || {})[id]);
      if (cPool.length && Math.random() < (BAL.blueprint.commonDropChance || 0)) {
        const bpId = cPool[Math.floor(Math.random() * cPool.length)];
        state.blueprints = state.blueprints || {};
        state.blueprints[bpId] = 1;
        notes.push(t('bp.foundNote', { name: LName(DEFS[bpId]) }));
        special.push({ icon: icon('icon_loot_blueprint', ''), label: t('bp.lootLabel', { name: LName(DEFS[bpId]) }), tier: 'rare' });
      }
    }
    // #189 P4 LED 라이트 바 도면 — 초희귀 전 지역 별도 롤(시그니처 풀 비희석). 발견 컷 있음(신문물의 순간).
    {
      if (!(state.blueprints || {}).ledbar && Math.random() < (BAL.lighting.ledChance || 0)) {
        state.blueprints = state.blueprints || {};
        state.blueprints.ledbar = 1;
        notes.push(t('bp.foundNote', { name: LName(DEFS.ledbar) }));
        special.push({ icon: icon('icon_loot_blueprint', ''), label: t('bp.lootLabel', { name: LName(DEFS.ledbar) }), tier: 'legendary' });
        jackpotToast(t('bp.jackpot', { name: LName(DEFS.ledbar) }), 0xdfeaff);
        queueDiscovery('ledbar', 0, 3, LName(DEFS.ledbar));
      }
    }
    // #189 P3 조명 젤 필터북 — 전설급 1회 한정 파밍(상업지구·도심: 극장/스튜디오 유품).
    //   보유 시 조명(전기·유리 계열)에 도료 계열 색을 입힐 수 있다 — "집 꾸미기의 본질은 조명"의 열쇠.
    if (!state.lightGels && (BAL.lighting.gelBookRegions || []).includes(exp.region) &&
        Math.random() < (BAL.lighting.gelBookChance || 0)) {
      state.lightGels = 1;
      notes.push(t('gel.foundNote'));
      special.push({ icon: icon('icon_loot_paint'), label: t('gel.lootLabel'), tier: 'legendary' }); // 젤=도료 계열 아이콘 (#213 이모지 소거)
      jackpotToast(t('gel.jackpot'), 0xc98ad4);
    }
    // #164 떠오른 자리 회수 (성공 = 온전한 보상)
    resolveFieldSpot(exp, 1, notes, special);
    // 염료 상인 (디렉터 2026-07-08): 슬럼 한정 5% — 만나는 건 운, 사는 건 선택(통조림 교환, 모드별 값).
    if (exp.region === 'slum' && !state.pendingEvent && Math.random() < BAL.paint.merchant.chance) {
      const all = Object.keys(PAINT_FAMILIES);
      const offer = [];
      while (offer.length < 3) { const f = all[Math.floor(Math.random() * all.length)]; if (!offer.includes(f)) offer.push(f); }
      state.dyeOffer = offer;
      state.pendingEvent = 'dye_merchant';
      state.lastEventDay = state.day;
    }
    state.successes++;
    state.stats.success++;
    title = t('exp.successTitle', { name: LName(r) });
    body = t('exp.successBody');
  } else if (partial) {
    rollRes(0.5);
    if (SHELTERS[state.current].perk?.salvagePlus && Math.random() < 0.25) {
      const fid = pickFurniture(r.pool);
      if (fid) { got.push(fid); notes.push(t('exp.note.rooftopSalvage')); }
    }
    // #164 떠오른 자리 회수 (부분성공 = 절반 — 그래도 닿긴 했다. 실패는 스팟을 남긴다)
    resolveFieldSpot(exp, BAL.fieldSpots.partialMult, notes, special);
    title = t('exp.partialTitle', { name: LName(r) });
    body = t('exp.partialBody');
  } else {
    title = t('exp.failTitle', { name: LName(r) });
    body = t('exp.failBody');
    if (SHELTERS[state.current].perk?.failSalvage) {
      rollRes(BAL.pity.failSalvageMult);
      if (Object.keys(gotRes).length) {
        body = t('exp.failSalvageBody');
        notes.push(t('exp.note.shipSalvage'));
      }
    }
    state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 5);
    notes.push(t('exp.note.dirty5'));
  }
  // ── 2.0 적대 존재 조우 (§9.2) — 도심 중심지 전용, 오프스크린 판정만. 성패 무관(돌아오는 길에 마주친다).
  //   노말/무한 = 소리·흔적만(손실 0 — "봤지만 싸우지 않았다") / 하드 = 전리품 일부를 잃는다 /
  //   하드코어 = 총이 있으면 1발로 격퇴(손실 0), 없으면 중상 + 전리품 손실.
  //   가방 안전망 블록보다 앞 — "가방을 챙기면 빈손 없음" 계약은 조우 뒤에도 지켜진다.
  //   citycore 전용 + !_simRunning 이중 가드(§9.7): 시드 시뮬 RNG 스트림 무접점.
  if (exp.region === 'citycore' && !_simRunning && Math.random() < BAL.hostile.encounterChance) {
    const H = BAL.hostile;
    if (!isHard()) {
      // 노말/무한: 존재는 소리와 흔적으로만 — 기계적 스테이크 0 (§9.2 계약)
      notes.push(t(Math.random() < 0.5 ? 'hostile.soundNote' : 'hostile.traceNote'));
    } else if (isHardcore() && state.gun && state.gun.dur > 0) {
      // 하드코어 + 총: 한 발이 밤을 산다 — 손실 없이 물러선다
      state.gun.dur--;
      notes.push(t('hostile.gunNote', { dur: state.gun.dur }));
      if (state.gun.dur === 0) notes.push(t('gun.emptyNote'));
    } else {
      // 하드: 전리품 일부를 내주고 몸을 뺀다 / 하드코어 무총: 중상까지
      let lost = 0;
      for (const id of Object.keys(gotRes)) {
        const n = Math.floor(gotRes[id] * H.lootLossFactor);
        if (n > 0) { resConsume(id, n); gotRes[id] -= n; lost += n; if (gotRes[id] <= 0) delete gotRes[id]; }
      }
      notes.push(t(lost > 0 ? 'hostile.robbedNote' : 'hostile.metNote'));
      if (isHardcore()) notes.push(applyInjury('critical', prep.includes('bottle')), t('hostile.hurtNote'));
    }
  }
  // 가방(§E, 안전망): 실패/부분이어도 최소 회수 보장. 이미 얻은 게 floor 미만이면 지역 loot 풀에서 랜덤 자원으로 채운다
  //   (failSalvage 등과 max — 스택 아님). exp.bag는 출발 시 '가방 챙기기'로만 set → 시뮬은 미설정이라 이 블록 스킵(RNG 무영향).
  if (exp.bag && !success) {
    const already = Object.values(gotRes).reduce((a, b) => a + b, 0);
    let need = (BAL.exp.bagFloorMin + Math.floor(Math.random() * (BAL.exp.bagFloorMax - BAL.exp.bagFloorMin + 1))) - already;
    if (need > 0) {
      const pool = r.lootRes.map(l => l[0]);
      while (need > 0 && pool.length) { const id = pool[Math.floor(Math.random() * pool.length)]; resAdd(id, 1); gotRes[id] = (gotRes[id] || 0) + 1; need--; }
      notes.push(t('exp.note.bag'));
      if (!partial) body = t('exp.failBagBody');
      // DDD-3: 안전망이 실제로 값을 한 탐험에서만 1 마모 — 재제작이 작은 유지 루프가 된다
      state.bagDur = Math.max(0, state.bagDur - 1);
      notes.push(state.bagDur > 0 ? t('prep.bagWear', { n: state.bagDur }) : t('prep.bagBroke'));
    }
  }
  // 부상 판정: 실패 시 확정, 부분 성공 시 40%
  if (!success && (partial ? Math.random() < BAL.pity.injuryPartialChance : true)) {
    injuryRolled = true; // 부상 위험이 실제로 있었다 (장갑 인과문 조건)
    let injChance = 1;
    if (prep.includes('gloves')) injChance -= BAL.pity.glovesReduce;
    if (Math.random() < injChance) {
      let type = r.injuries[Math.floor(Math.random() * r.injuries.length)];
      if (type === 'deep' && prep.includes('firstaid')) {
        type = 'minor';
        notes.push(t('exp.note.firstaid'));
      }
      // 2.0 §9.2: 조우 중상(critical)을 입은 트립이면 경상으로 덮어쓰지 않는다(부상 다운그레이드 방지)
      if (state.injury?.type !== 'critical') notes.push(applyInjury(type, prep.includes('bottle')));
    } else if (prep.includes('gloves')) {
      injuryAvoided = true; // 부상 위험이 있었는데 장갑으로 피했다
      notes.push(t('exp.note.gloves'));
    }
  }
  // 1.3 눈사태 위험 우회로: 성공했더라도 눈길에서 미끄러질 위험(사망 없음 — 부상만). 아직 안 다쳤을 때만 롤.
  if (detour && !state.injury && Math.random() < BAL.highland.avalancheInjuryChance) {
    let type = prep.includes('firstaid') ? 'sprain' : (Math.random() < 0.5 ? 'sprain' : 'minor');
    notes.push(applyInjury(type, prep.includes('bottle')));
    notes.push(t('avalanche.detourHurt'));
  }
  if (state._avalancheDetour) state._avalancheDetour = false; // 우회 플래그 소진 (이번 출발 한정)
  // 2.0 낙진 시계: 맨몸으로 봉쇄선 안을 걸었다 — 잔류 방사능 부상 롤 (성패 무관·아직 안 다쳤을 때만.
  //   방호복의 걷힌-뒤 가치 = 이 롤의 면제. barehandTrip 가드라 시뮬/일반 지역 RNG 스트림 무영향. 사망 없음 — 부상만.)
  if (barehandTrip && falloutCleared() && !state.injury && Math.random() < BAL.forbidden.barehandInjuryChance) {
    const rType = Math.random() < 0.5 ? 'deep' : 'minor';
    notes.push(applyInjury(rType, prep.includes('bottle')));
    notes.push(t('fallout.barehandHurt'));
  }
  // 비/눈 속 탐험 → 젖어서 청결도 감소
  if (weather.type === 'rain' || weather.type === 'snow' || weather.type === 'storm') {
    if (!prep.includes('raincoat')) {
      state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - 3);
      notes.push(t('exp.note.wet3', { icon: WEATHERS[weather.type].icon }));
    }
  }
  // ── 준비물/상태 인과문 (#29) — 조건 걸린 것 중 우선순위 상위 2개만, 남발 금지 ──
  {
    const causal = []; // [priority-ordered]
    // 역경(상태) — 준비 부족이 결과를 갈랐음을 체감
    if (startedInjured) causal.push(t('exp.cause.injured'));
    if (departColdSnap) causal.push(t('exp.cause.coldsnap'));
    // 준비물이 값을 했음 (해당 시에만)
    if (prep.includes('flashlight') && success) causal.push(t('exp.cause.flashlight'));
    if (prep.includes('raincoat') && (departWeather === 'rain' || departWeather === 'snow' || departWeather === 'storm'))
      causal.push(t('exp.cause.raincoat', { icon: WEATHERS[departWeather].icon }));
    if (prep.includes('bottle')) causal.push(t('exp.cause.bottle'));
    if (prep.includes('canned') && success) causal.push(t('exp.cause.canned'));
    for (const c of causal.slice(0, 2)) notes.push(c);
  }
  for (const id of got) state.inventory[id] = (state.inventory[id] || 0) + 1;
  // 해금 체크
  let unlockMsg = '';
  for (const [id, sh] of Object.entries(SHELTERS)) {
    if (sh.unlockAt > 0 && state.successes === sh.unlockAt) {
      unlockMsg = t('exp.unlock', { emoji: sh.emoji, name: LName(sh) });
    }
  }
  // DDD-1 개봉 연출: 정산 행이 하나씩 나타난다(지오드 까기의 리듬 — 연출만, 데이터·sim 무접점).
  //   자원 → 가구 → 노트 순으로 스태거 인덱스(--li)가 이어지고, 노트 블록은 마지막에 통으로 뜬다.
  let li = 0;
  const resHtml = Object.keys(gotRes).length
    ? `<div class="loot-list reveal">${Object.entries(gotRes).map(([id, n]) => `<div class="loot-item${id === 'book' ? ' rare' : ''}" style="--li:${li++}">${resIcon(id)} ${LName(RESOURCES[id])} +${n}</div>`).join('')}</div>`
    : '';
  const lootHtml = got.length
    ? `<div class="loot-list reveal">${got.map(id => `<div class="loot-item" style="--li:${li++}">${furnIcon(id)} ${LName(DEFS[id])}</div>`).join('')}</div>`
    : '';
  // 희귀 전리품(도료=희귀 보라 / 도면·네온 안료=전설 금색): 획득 난이도별 빛나는 테두리 박스 (디렉터 2026-07-09).
  //   도료엔 실제 색을 페인트통 아이콘으로(디렉터: "흐르는 액체 색으로 어떤 색인지") — 통은 회색, 흐르는 물감·표면이 도료색.
  const paintBucket = hex => `<svg class="paint-can" viewBox="0 0 22 18" width="1.55em" height="1.28em" aria-hidden="true"><path d="M13.5 4.4 q5.4 -1.2 6.4 3.1 q-0.9 4.3 -4.4 3 q1.4 -3.1 -2 -6.1 z" fill="#${hex}"/><path d="M15.2 10.2 q1.1 2.6 -0.4 4 q-1.4 -0.5 -1 -2.4 z" fill="#${hex}" opacity="0.9"/><path d="M3 5 h8.4 a1 1 0 0 1 1 1 v6.2 a2.6 2 0 0 1 -10.4 0 v-6.2 a1 1 0 0 1 1 -1 z" fill="#e5e9ee" stroke="#7c8590" stroke-width="0.7"/><ellipse cx="7.2" cy="6" rx="4.7" ry="1.35" fill="#${hex}"/><path d="M2.6 6.1 q4.6 -4 9.2 0" fill="none" stroke="#b9bfc7" stroke-width="0.8"/></svg>`;
  const lootRow = s => `<div class="loot-item ${s.tier}" style="--li:${li++}">${s.swatch != null ? paintBucket((s.swatch & 0xffffff).toString(16).padStart(6, '0')) : ''}${s.icon} ${s.label}${s.n ? ` +${s.n}` : ''}</div>`;
  const specialHtml = special.length ? `<div class="loot-list reveal">${special.map(lootRow).join('')}</div>` : '';
  // #208(디렉터): "탐사 최종 정산에서 「이벤트 발생으로 추가 획득:」 이런식으로 추가하고" —
  //   탐험 도중 리스크 인카운터로 번 것은 탐험 성과와 출처가 다르다. 같은 희귀도 문법으로 그리되 소제목으로 분리.
  const riskGain = state.riskEventGain || [];
  const riskHtml = riskGain.length
    ? `<div class="note-reveal" style="--li:${li};font-size:10px;color:var(--text-dim);margin-top:8px">${t('exp.riskGain')}</div>`
      + `<div class="loot-list reveal">${riskGain.map(lootRow).join('')}</div>`
    : '';
  state.riskEventGain = null; // 이번 정산에서 소진 — 다음 탐험으로 새지 않게
  const prepHtml = prep.length
    ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px">${t('exp.usedPrep', { list: prep.map(p => LName(PREPS[p])).join(', ') })}</div>`
    : '';
  const noteHtml = notes.length
    ? `<div class="note-reveal" style="--li:${li};font-size:11px;line-height:1.7;margin-top:8px">${notes.join('<br>')}</div>`
    : '';
  openModal(title, `${body}${resHtml}${lootHtml}${specialHtml}${riskHtml}${noteHtml}${prepHtml}${unlockMsg}`);
  // 개봉 스킵: 본문 아무 데나 탭하면 남은 행 즉시 전부 공개 (기다림 강요 금지 — 코지 안전선)
  { const mb = $('modal-body'); if (mb) { mb.classList.remove('reveal-skip'); mb.addEventListener('click', () => mb.classList.add('reveal-skip'), { once: true }); } }
  scheduleSave();
  renderInventoryBar();
  renderResBar();
  renderExpPanel();
  updateHud();
  // 하루 5회를 채우면 몸이 버티지 못한다 — 강제 취침
  // #88(디렉터): 탐험 한도 소진 시 강제 취침·정산을 없앤다 — 정산은 유저가 의도한 취침 때(전 모드 공통).
  //   대신 '탐험 피로': 오늘 자지 않고 버티면 밤샘 취침 페널티가 가중된다(restEnergyValue) — 일찍 잘 이유를 만드는 쪽.
  if (state.expToday >= EXP_PER_DAY) { state.expFatigue = state.day; toast(t('exp.fatigue')); }
}

/* ============================================================
   랜덤 인카운터 (아포칼립스의 우연들 — 며칠에 한 번)
============================================================ */
/* ============================================================
   고양이 동반자 (v1.9) — Day 100+ 인카운터로 입양
============================================================ */
// 고양이 동반자 시스템(메시·텍스처·AI·애니·스폰/디스폰)은 src/systems/cat.js로 분리(엔지니어링 Phase 2).
// 함수들이 game.js 내부 심볼을 참조하므로 팩토리 makeCatSystem(ctx)에 주입해 생성한다(events.js 선례, 동작 동일).
// 잔류: 클로즈업 카메라(catCam/enterCatCloseup/exitCatCloseup)·쓰다듬기(pickCat/petCatResponse)는
//   camera·입력 결합이라 game.js에 남긴다. cat 시스템은 catObj를 catSys.getCat()로 노출하고,
//   ROOM(셸터 로드 시 재할당)은 getRoom 게터로 라이브 참조한다(캡처 stale 방지).
const PET_HAPPY_MS = 2000; // 눈 감김 지속(2초). 렌더 연출 상수. cat.js(updateCat)와 game.js(쓰다듬기) 공유.
const catSys = makeCatSystem({
  THREE, GLTFLoader,
  B, lamb, makeCanvasTex, disposeDeep,
  footprintOf, surfaceRectOf, itemsOn, shadowDirty,
  scene, items, DEFS, state,
  CAT_POSES, CAT_PERCH_Y, BED_TOP_Y, TIER_TOP_Y, PET_HAPPY_MS, // #193·#196: 퍼치 y 티어 실높이 표 (침대·소파·방석)
  getRoom: () => ROOM, catCam, exitCatCloseup,
});
const { spawnCat, despawnCat, updateCat, catPointBlocked, catSupportValid, catFaceTex, catFaceHappyTex } = catSys;
// F-1a 야생동물 로밍 시스템 (「세계가 살아 있다」) — cat.js 선례와 동일한 팩토리+주입.
//   순수 연출/엔티티: 이벤트·밸런스 무참조. 상시 1~2마리(저사양 1) + 개막 새 착지 연출.
const wildlifeSys = makeWildlifeSystem({
  THREE, B, lamb, disposeDeep, makeCanvasTex, BAL,
  scene, state, opts,
  getRoom: () => ROOM, districtOf, playSfx, shadowDirty,
  gameHour, seasonId: () => seasonOf().id, camCenter,
  getGameMin: () => state.gameMin || 0, getSnowCover: () => snowCover,
  WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE,
  getObstacles: () => wlObstacles, // #95: buildEnv가 등록한 마당 장애물(폐차/전신주/근접 나무) — 통과 방지
});

// #86 주인공 아바타 — "정착자는 나뿐"의 그 '나' (사람 형상 금지 캐논의 유일한 예외)
const avatarSys = makeAvatarSystem({
  THREE, B, lamb, disposeDeep, shadowDirty,
  scene, state, items, DEFS,
  getRoom: () => ROOM, getBlockers: () => blockers, footprintOf, gameHour, opts,
  OUTFITS, getOutfit: () => state.outfit || 'default', // #86④ 복장
  BED_TOP_Y, TIER_TOP_Y, // #193·#196: 착석 y 티어 실높이 표 (침대·소파·방석·의자)
});

// #86④ 옷장 — 보유 의류(제작으로 획득) 목록에서 탭하여 갈아입기. 진입: 툴바 버튼 + 아바타 탭.
// 아바타 탭 → 옷장 (고양이 탭 선례 — 배치 모드에선 오작동 방지 차 미동작)
function pickAvatar(e) {
  if (!avatarSys.exists()) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(avatarSys.getGroup(), true).length > 0;
}

/* ============================================================
   세계관 메모 & 라디오 방송 수집 (#35 · #12의 축)
   ------------------------------------------------------------
   [연표] 캐논 타임라인 — 모든 문안은 이 축과 모순되지 않는다.
     ㆍ붕괴 3년 전(겨울) = 현재(intro: "세상이 무너진 지 3년").
     ㆍT-6년경  판데믹 발생 → 도시 부분 봉쇄 시작.
     ㆍT-5년경  전국 봉쇄. 사재기·상점 약탈·폭동 (상업지구).
     ㆍT-4년경  공장 폐쇄 명령. 마지막 교대. 물류 정지 (공업지대).
     ㆍT-3.5년  백신 루머·가짜 배급표. 대피령. 남겨진 사람들 (슬럼가).
     ㆍT-3.2년  국가 간 최후통첩 → 핵 사용 결정.
     ㆍT-3년    핵겨울. 하늘이 잿빛으로. — 여기서 현재까지 3년.
   메모는 지역 성격(주거=일상의 붕괴 / 상업=사재기·폭동 / 공업=폐쇄 명령 /
   슬럼=버려진 사람들)에 맞춰 배치. 유서 6종은 지역 무관 별도 풀(극저확률).
   테이블 스키마: { name/nameEn(제목), desc/descEn(본문), region } — LN/LD 재사용.
============================================================ */
// MEMOS/WILLS/MEMO_REGIONS 및 파생 지역 목록(MEMOS_BY_REGION/SUBWAY/RESORT/RESEARCH)은
// src/data/lore.js로 분리(콘텐츠 데이터 Phase 1). 수집/드랍 로직은 game.js에 유지.
//   subway/resort/research 지역 풀은 lore.js에서 MEMOS를 필터해 파생(원본 유지).

/* ── 라디오 방송 12종 (REQ-RADIO-01) ──
   예보 3(계절)/행상 예고 1/과거 정부 안내 2/정체불명 음악 1/생존자 사연 2/기계 자동 방송 1/박사 일지 조각 2.
   박사 조각(doctor:true) 2종 모두 수집 시 9겨울 doctor_radio 문안에 한 줄 추가된다. */
// BROADCASTS(라디오 방송 12종)는 src/data/lore.js로 분리(콘텐츠 데이터 Phase 1).

/* ── 1.3 밤하늘 스케치 6종 (관측소 완공 후, 맑은 밤 이벤트로 수집) ──
   감상 보상. 각 스케치는 그날 본 하늘의 1인칭 기록 — "나는 오래 서서 하늘을 봤다"의 결. 지시조 금지.
   맨 끝(satellite)은 1.4 복선: "저건 별이 아니다". 기록 탭에서 종이 스케치처럼 열람. */
// SKETCHES(밤하늘 스케치)는 src/data/lore.js로 분리(콘텐츠 데이터 Phase 1).

/* ── 1.3 밤하늘 스케치 수집 (state.sketches) — 관측소 완공 후 맑은 밤 이벤트로 1종씩 수집 ── */
function sketchesCollected() { return Object.keys(state.sketches || {}).length; }
function sketchesTotal() { return Object.keys(SKETCHES).length; }
// 미수집 스케치 1개 뽑기 (satellite=1.4 복선은 마지막에 남도록, 다른 5종을 먼저 소진). 없으면 null.
function pickUncollectedSketch() {
  const owned = state.sketches || {};
  const rest = Object.keys(SKETCHES).filter(id => id !== 'satellite' && !owned[id]);
  if (rest.length) return rest[Math.floor(Math.random() * rest.length)];
  return owned['satellite'] ? null : 'satellite'; // 나머지를 다 모아야 궤도의 불빛이 나온다
}
function collectSketch(id) {
  if (!state.sketches) state.sketches = {};
  if (!SKETCHES[id] || state.sketches[id]) return false;
  state.sketches[id] = state.day;
  return true;
}
// 관측소 완공 + 맑은 밤 → 밤하늘 이벤트. 하루 1회. 미수집 스케치가 있을 때만. processDay에서 호출.
//   결산 노트에 1인칭 발견 + 닫은 뒤 스케치 팝업 예약(메모 팝업 문법 재사용). 수집률 100% 시 더는 발동 안 함.
function tryNightSky(notes) {
  if (!state.observatoryDone) return;
  if (state.nightSkyToday) return;          // 하루 1회
  if (weather.type !== 'clear') return;     // 맑은 밤만
  if (Math.random() >= BAL.highland.nightSkyChance) return;
  const id = pickUncollectedSketch();
  if (!id) return;                          // 다 모았으면 조용히 끝
  collectSketch(id);
  state.nightSkyToday = 1;
  notes.push(t('nightsky.foundNote', { title: LN(SKETCHES[id]) }));
  state.pendingSketchPopup = id;            // 결산 닫은 뒤 스케치 페이지 팝업
}

/* ── 수집 상태/드랍 로직 (state.memos / state.broadcasts / state.distantSeen) ── */
function memosCollected() { return Object.keys(state.memos || {}).length; }
function memosTotal() { return Object.keys(MEMOS).length + Object.keys(WILLS).length; }
function broadcastsCollected() { return Object.keys(state.broadcasts || {}).length; }
function broadcastsTotal() { return Object.keys(BROADCASTS).length; }
// 미수집 메모 1개 뽑기 (지역 지정 시 그 지역 풀에서, 없으면 현재 셸터 지역, 그것도 다 모았으면 전체). 없으면 null.
function pickUncollectedMemo(region) {
  const owned = state.memos || {};
  const tryPool = pool => pool.filter(id => !owned[id]);
  let region0 = region || (['residential', 'commercial', 'industrial', 'slum'].includes(districtRegionOf(state.current)) ? districtRegionOf(state.current) : null);
  if (region0) { const p = tryPool(MEMOS_BY_REGION[region0] || []); if (p.length) return p[Math.floor(Math.random() * p.length)]; }
  const all = tryPool(Object.keys(MEMOS));
  if (all.length) return all[Math.floor(Math.random() * all.length)];
  return null;
}
// 셸터가 속한 '탐험 지역 성격' 추정 — 메모 지역과 맞추기 위한 매핑. 셸터→구역→선호 region.
// districtRegionOf → core/projects.js (import).
function collectMemo(id, silent) {
  if (!state.memos) state.memos = {};
  if (state.memos[id]) return false;
  state.memos[id] = state.day;
  return true;
}
// 이벤트(과거 달력 등)에서 메모 1개 확정 드랍 — 호출 자체가 게이트다. 미수집 메모 id or null.
function dropMemo() {
  const id = pickUncollectedMemo();
  if (id) { collectMemo(id); return id; }
  return null;
}
// 탐험 결산에서 호출 — 확률 게이트를 여기서 관리. 수집 시 id(+will 여부) 반환.
//   expRegion: 이번 탐험의 목적지 지역(금지 구역 기밀 문서는 '어디서 탐험했나'로 우선순위가 정해진다 — 셸터 아님).
function tryDropMemoOnExpedition(expRegion) {
  // 2.0 「응답」(§9.5): 도심 중심지 탐험 — 이관의 진실 4단(nw1~4)을 '순서대로' 드랍.
  //   관찰→선별→규합→초대의 폭로 순서가 곧 서사 리듬이라 무작위 픽을 쓰지 않는다(미수집 최소 순번).
  //   research 2.5배 밀도 문법 재사용. citycore 전용 가드라 시뮬·타 지역 스트림 무접점.
  if (expRegion === 'citycore') {
    const unNw = MEMOS_CITYCORE.filter(id => !(state.memos || {})[id]);
    if (unNw.length && Math.random() < BAL.events.memoDropChance * 2.5) {
      const id = unNw[0]; collectMemo(id); return { id, will: false };
    }
  }
  // 1.4 금지 구역(연구동/검문소) 탐험 — 기밀 문서(research 메모)를 최우선 드랍. 세계관의 답이 있는 곳.
  //   유서보다 우선. 문서 희소화(디렉터 지시: 기본 2%) 후에도 금지 구역은 2.5배 밀도(실효 5%) —
  //   최종장 12종은 이제 '긴 추적'이다. 종이 한 장이 귀한 세계.
  //   2.0 §9.5: 무작위 픽 → 미수집 최소 순번(정의 순서 rsc1→rsc12)으로 — 판데믹→봉쇄→결정→박사의
  //   서사 순서가 수집 순서와 일치한다(순차화. 실게임 전용 경로라 시뮬 스트림 무접점).
  if (isForbiddenRegion(expRegion)) {
    const unRes = MEMOS_RESEARCH.filter(id => !(state.memos || {})[id]);
    if (unRes.length && Math.random() < BAL.events.memoDropChance * 2.5) { // 금지 구역은 문서 밀도가 높다(2.5배 게이트)
      const id = unRes[0]; collectMemo(id); return { id, will: false };
    }
  }
  // 유서 우선 롤
  if (Math.random() < BAL.events.willDropChance) {
    const un = Object.keys(WILLS).filter(id => !(state.memos || {})[id]);
    if (un.length) { const id = un[Math.floor(Math.random() * un.length)]; collectMemo(id); return { id, will: true }; }
  }
  if (Math.random() < BAL.events.memoDropChance) {
    // 1.2 지하철 셸터 거주 중이면 지하(subway) 메모를 우선 드랍(판데믹 지하 대피 서사의 본진).
    //   미수집 지하 메모가 있으면 그중 하나, 다 모았으면 기존 지역 풀로 폴백.
    if (state.current === 'subway') {
      const unSub = MEMOS_SUBWAY.filter(id => !(state.memos || {})[id]);
      if (unSub.length) { const id = unSub[Math.floor(Math.random() * unSub.length)]; collectMemo(id); return { id, will: false }; }
    }
    // 1.3 스키 로지 거주 중이면 리조트(resort) 메모 우선 드랍(마지막 휴가객들). 다 모았으면 지역 풀 폴백.
    if (state.current === 'lodge') {
      const unRst = MEMOS_RESORT.filter(id => !(state.memos || {})[id]);
      if (unRst.length) { const id = unRst[Math.floor(Math.random() * unRst.length)]; collectMemo(id); return { id, will: false }; }
    }
    // v1.5 여객선(ship) 거주 중이면 좌초선(harbor) 메모 우선 드랍(갑판 판잣집의 내력 — 잠긴 선실의 사유). 지하/로지 문법 재사용.
    if (state.current === 'ship') {
      const unShp = MEMOS_HARBOR.filter(id => !(state.memos || {})[id]);
      if (unShp.length) { const id = unShp[Math.floor(Math.random() * unShp.length)]; collectMemo(id); return { id, will: false }; }
    }
    const id = pickUncollectedMemo(districtRegionOf(state.current));
    if (id) { collectMemo(id); return { id, will: false }; }
  }
  return null;
}
// 미수집 방송 1개 청취/수집. 수집 시 id 반환, 없으면 null. (doctor 조각 2종 수집되면 무전 분기)
function dropBroadcast() {
  if (!state.broadcasts) state.broadcasts = {};
  const un = Object.keys(BROADCASTS).filter(id => !state.broadcasts[id]);
  if (!un.length) return null;
  const id = un[Math.floor(Math.random() * un.length)];
  state.broadcasts[id] = state.day;
  return id;
}
// 박사 조각 2종 모두 수집됐는가 (9겨울 무전 문안 분기)
function doctorFragmentsComplete() {
  const b = state.broadcasts || {};
  return Object.keys(BROADCASTS).filter(id => BROADCASTS[id].doctor).every(id => b[id]);
}
// 먼 불빛 목격 기록 (장소별 문안 변형용 카운트 + 마지막 목격일)
function recordDistantLight() {
  if (!state.distantLight) state.distantLight = { count: 0, lastDay: 0, places: {} };
  state.distantLight.count++;
  state.distantLight.lastDay = state.day;
  state.distantLight.places[state.current] = (state.distantLight.places[state.current] || 0) + 1;
}

/* ============================================================
   인카운터 엔진 (ARC-01: 콘텐츠는 테이블, 로직은 엔진)
   - 조건은 선언적 when 필드로 표준화한다: when.{ seasons, shelters, districts,
     weather, night, day(낮 한정), minDay, needsRadio, needsCat }.
   - eventMatches(id, ctx): 후보 자격 판정. eventWeight: 반복 억제 가중치.
   - drawEvent(ctx): 자격+가중치로 하나 뽑아 예약. 두 호출부(아침 결산/탐험 중간)가 공유.
   - state.evHistory: 최근 발화 id 로그(최근 12건). 같은 이벤트 3연속 금지 +
     최근 7일 창 동일 이벤트 ≤2회로 가중치 감쇄 (REQ-EVT-02).
   - 술어(eventMatches/eventWeight/eventThreePeatBlocked/pushEvHistory)는 core/encounter.js로 이관(Tier3).
     eventCtx(weather/gameHour 결합)·drawEvent(RNG)는 여기 잔류.
============================================================ */
// ctx: { season, district, weather, night, day, winters } — 없으면 현재 상태에서 유도
function eventCtx() {
  const h = gameHour();
  return {
    season: seasonOf().id,
    district: districtOf(state.current),
    shelter: state.current,
    weather: weather.type,
    night: h >= 21 || h < 6, // 야간(밤~새벽). 아침 결산 draw는 '지난밤' 사건 허용 위해 caller가 override.
    day: state.day,
    winters: wintersPassedOf(state.day), // #163b 절박 티어: 경과 겨울 수 (해가 갈수록 세상이 야윈다)
  };
}
// eventMatches/eventWeight/eventThreePeatBlocked/pushEvHistory → core/encounter.js 이관 (Tier3, 순수 술어)
// 후보 풀에서 가중 추첨해 pendingEvent 예약. 성공 시 뽑힌 id, 없으면 null.
function drawEvent(ctx = eventCtx()) {
  if (isWallpaper()) return null; // 배경화면: 인카운터/이벤트 off
  const cands = Object.keys(EVENTS).filter(id =>
    !EVENTS[id].special && eventMatches(id, ctx) && !eventThreePeatBlocked(id));
  if (!cands.length) return null;
  const weights = cands.map(eventWeight);
  let sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  let roll = Math.random() * sum;
  let pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { roll -= weights[i]; if (roll <= 0) { pick = cands[i]; break; } }
  state.pendingEvent = pick;
  state.lastEventDay = state.day;
  pushEvHistory(pick);
  return pick;
}

// 이벤트 스팅어 톤(#13 사운드): 등장 차임을 카테고리별로 피치 변주(WebAudio playbackRate).
//   서사(narrative, 기본) 1.0 · 위험(danger) 0.82(낮게 긴장) · 온기(warmth) 1.18(높게 포근).
//   신규 에셋 불필요 — 기존 'sting' 하나를 rate 변주로 3종화. 선언적 테이블(ARC-01).
const EVENT_STING = {
  storm: 'danger', thief: 'danger', spoil_merchant: 'danger', leaky_roof: 'danger', frozen_pipe: 'danger',
  dog: 'warmth', cat_gift: 'warmth', cat: 'warmth', coldsnap_stranger: 'warmth', caravan_pass: 'warmth', trader: 'warmth',
  // 그 외(wanderer, seeds, radio_sig, snow_prints, lighthouse_ship, greenhouse_birds,
  //       distant_light, radio_ghost, old_calendar, broken)는 기본 서사 톤.
};
const STING_RATE = { narrative: 1.0, danger: 0.82, warmth: 1.18 };
function playEventSting(id) {
  const tone = EVENT_STING[id] || 'narrative';
  dbgSfx = 'sting:' + tone; // 하네스 lastSfx 추적: 어떤 톤이 울렸는지 확인
  playSfx('sting', { rate: STING_RATE[tone], jitter: 0.03 });
}
// title/text/choice label 은 언어 전환 시점(showEvent) 에 t() 로 해석하므로 id 로 보관한다.
// #165 무너진 입구 보상 롤 (디렉터 2026-07-10): Yes의 값 — 치장템(도료·도면) 가중, 최희귀 고양이 루트,
//   나머지는 잡동사니 위로. 부상 리스크는 이벤트 쪽(choices.run)에서 별도 롤 — 보상과 독립이라 "얻고도 다칠" 수 있다.
/* #199 상자 개봉 연출용 전리품 메타 — collapseEntranceLoot가 굴릴 때 기록.
   #213(디렉터 "emoji 출력인데 실 모델링으로 만들자 / 아이템 등급 별로 색이 달라야해"):
     구 형태 { color, emoji } → { kind, tier, body }.
       kind = 복셀 모델 종류(buildLootModel의 분기). 구 emoji 자리 — 문·상자는 복셀인데 정작
              주인공인 전리품만 96px serif 이모지 스프라이트라 극의 정점에서 톤이 깨졌다.
       tier = 등급('common'|'rare'|'legend') → 광선·파편·내부 발광이 BAL.lootRarity에서 색을 받는다.
       body = 물건 자신의 색(도료 깡통 몸통 = 그 계열 색). 등급색과 별도 채널 — 섞지 않는다.
   톤 규약(디렉터 "단, 아쉽게 하찮아야해"): 모델은 작고 칙칙하고 낡게. 광선은 웅장한데 그 끝에 뜨는 건
     실패 한 개 — 그 낙차가 이 게임의 정서다. 반짝이는 보물 금지. */
let collapseLootFx = null;
// 2.0-(e) 도면 이름 해석 — 시그니처 도면이 가구(DEFS)와 복장(outfit_*→OUTFITS) 두 종족이 됐다.
//   드랍 노트·잭팟·전리품 라벨·지도 보급원 트래커가 공용(함수 선언 호이스팅으로 전 사용처 안전).
function bpName(bpId) {
  return bpId.startsWith('outfit_') ? LName(OUTFITS[bpId.slice(7)] || { name: bpId, nameEn: bpId }) : LName(DEFS[bpId]);
}
/* #208(디렉터 "탐사 결과 나오고 나서 하는게 아니라 탐사 도중에 나오는게 좋을 것 같아"):
   탐험 '도중'에 떠야 하는 인카운터 목록. 무너진 입구는 내가 그 자리에 서서 들어갈지 고르는 사건이라
   귀환 후 회상으로 뜨면 개연성이 없다 — 발동 자체가 이미 진행률 35% 지점 롤이었는데(9124행),
   소비 게이트의 `!state.exp` 때문에 귀환까지 대기하던 것. 나머지 인카운터는 집에서 겪는 것이라 기존 게이트 유지. */
const DURING_EXP_EVENTS = new Set(['collapsed_entrance']);
function duringExpEvent(id) { return DURING_EXP_EVENTS.has(id); }
// #208: 리스크 인카운터로 번 것을 정산이 "이벤트 발생으로 추가 획득:"으로 따로 세울 수 있게 적어둔다.
//   탐험 정산의 special[] 문법(희귀도 테두리)을 그대로 쓴다 — 신규 표시 계층 0.
function riskGainPush(entry) { (state.riskEventGain = state.riskEventGain || []).push(entry); }
function collapseEntranceLoot() {
  // #193: 발동 시점에 박제한 지역 우선 — (#208 이전엔 귀환 후 표시라 state.exp가 비어 항상 slum 폴백이던 결함)
  const region = state.riskEventRegion || (state.exp ? state.exp.region : 'slum');
  const r = Math.random();
  // 최희귀: 어둠 속의 야옹 — 고양이 미보유·미조우일 때만. 입양 인카운터로 연결(집 문앞 재회 플로우 그대로).
  if (!state.cat && !state.catEventSeen && r < 0.08) {
    state.pendingEvent = 'cat';
    collapseLootFx = { kind: 'cat', tier: 'legend' }; // 어둠 속의 야옹 — 물건이 아니라 기척. 모델은 발자국 한 쌍.
    return t('ev.collapse.rCat');
  }
  if (r < 0.30) { // 도료 (디렉터 2026-07-19: 0.5→0.3 — 「무너진 입구 보상이 다 보라 도료」 단조 완화. 지역 계열 가중)
    const fam = rollPaintFamily(region);
    state.paints[fam] = (state.paints[fam] || 0) + 1;
    collapseLootFx = { kind: 'paint', tier: 'rare', body: PAINT_FAMILIES[fam].swatch }; // 깡통 몸통=그 계열 색, 광선=등급 보라
    jackpotToast(t('paint.jackpot', { name: LName(PAINT_FAMILIES[fam]) }), PAINT_FAMILIES[fam].swatch);
    riskGainPush({ icon: icon('icon_loot_paint', ''), label: LName(PAINT_FAMILIES[fam]), n: 1, tier: 'rare', swatch: PAINT_FAMILIES[fam].swatch });
    return t('ev.collapse.rPaint', { name: LName(PAINT_FAMILIES[fam]) });
  }
  const bpPool = (BAL.blueprint.regionItems[region] || []).filter(id => !(state.blueprints || {})[id]);
  if (r < 0.50 && bpPool.length) { // 시그니처 도면 (미보유 한정, 0.30~0.50=20%)
    const bpId = bpPool[Math.floor(Math.random() * bpPool.length)];
    state.blueprints = state.blueprints || {};
    state.blueprints[bpId] = 1;
    collapseLootFx = { kind: 'blueprint', tier: 'legend' };
    jackpotToast(t('bp.jackpot', { name: bpName(bpId) }), 0xd4b46a);
    riskGainPush({ icon: icon('icon_loot_blueprint', ''), label: t('bp.lootLabel', { name: bpName(bpId) }), tier: 'legendary' });
    return t('ev.collapse.rBp', { name: bpName(bpId) });
  }
  // 자원 잡동사니 — 무너진 건물다운 4종으로 다양화(색·종류 단조 타파, 디렉터 2026-07-19). 등급 common(보라 아님).
  const junkPool = ['cloth', 'parts', 'material', 'canned'];
  const rid = junkPool[Math.floor(Math.random() * junkPool.length)];
  const jn = 1 + (Math.random() < 0.4 ? 1 : 0); // 가끔 2개
  resAdd(rid, jn);
  collapseLootFx = { kind: rid === 'cloth' ? 'cloth' : 'parts', tier: 'common' }; // 모델=천/부품 프록시(그 외 자원도 상자 실루엣)
  riskGainPush({ icon: icon('icon_res_' + rid, ''), label: LN(RESOURCES[rid]), n: jn, tier: '' });
  return t('ev.collapse.rJunk', { name: LN(RESOURCES[rid]) });
}
// #164 「떠오른 자리」 회수 — 스팟 지역 탐험이 성공/부분성공으로 닿았을 때 resolveExpedition에서 호출.
//   실패는 스팟을 남긴다(만료 전 재도전). 보상: 자원(mult 배) + 도료(지역 계열 가중) + 도면(미보유 한정) + 기분.
function resolveFieldSpot(exp, mult, notes, special) {
  if (!state.fieldSpot || state.fieldSpot.region !== exp.region) return;
  const sp = FIELD_SPOTS[state.fieldSpot.id];
  const name = t('spot.' + state.fieldSpot.id);
  if (sp && sp.loot) {
    for (const [rid, n] of Object.entries(sp.loot.res || {})) {
      const amt = Math.max(1, Math.round(n * mult));
      resAdd(rid, amt);
      special.push({ icon: icon('icon_res_' + rid, ''), label: LN(RESOURCES[rid]), n: amt, tier: 'rare' });
    }
    for (let i = 0; i < Math.round((sp.loot.paint || 0) * mult); i++) {
      const fam = rollPaintFamily(exp.region);
      state.paints[fam] = (state.paints[fam] || 0) + 1;
      special.push({ icon: icon('icon_loot_paint', ''), label: LName(PAINT_FAMILIES[fam]), n: 1, tier: 'rare', swatch: PAINT_FAMILIES[fam].swatch });
    }
    if (sp.loot.bp && Math.random() < sp.loot.bp * mult) {
      const bpPool = (BAL.blueprint.regionItems[exp.region] || []).filter(id => !(state.blueprints || {})[id]);
      if (bpPool.length) {
        const bpId = bpPool[Math.floor(Math.random() * bpPool.length)];
        state.blueprints = state.blueprints || {};
        state.blueprints[bpId] = 1;
        special.push({ icon: icon('icon_loot_blueprint', ''), label: t('bp.lootLabel', { name: bpName(bpId) }), tier: 'legendary' });
      }
    }
    if (sp.loot.mood) addMoodBuff(sp.loot.mood[0], sp.loot.mood[1]);
  }
  notes.push(t('spot.explored', { name }));
  jackpotToast(t('spot.jackpot', { name }), 0xd4b46a);
  state.fieldSpot = null;
}
// 인카운터 테이블은 src/data/events.js로 분리(콘텐츠 데이터 Phase 1). 함수 필드가 game.js
// 내부 심볼을 참조하므로 팩토리 makeEvents(ctx)에 의존성 주입해 생성한다(원본과 동작 동일).
// state/items/weather는 const 참조라 재할당되지 않아 클로저 캡처가 안전하다.
const EVENTS = makeEvents({
  t, LN, RESOURCES, DEFS, MEMOS, MEMOS_RESEARCH, BROADCASTS, BAL,
  state, items,
  resAdd, resConsume, addMoodBuff, applyInjury, seasonOf, coldSnapActive,
  dropMemo, dropBroadcast, recordDistantLight, spawnCat, playSfx,
  runEndingSequence, runRebuildSequence, doctorFragmentsComplete,
  endingLeaning, // 2.0 §9.5: 엔딩 성향
  encCostMul, encBarterMul, // 밀수꾼 모드 배수 (교환 야박도)
  PAINT_FAMILIES, buyDye, dyeCost, // dye merchant ctx (REWARD-LOOP)
  collapseEntranceLoot, // #165 탐험 리스크 인카운터 — 보상 롤 위임 (game.js 심볼 전부 여기 있음)
  dlcOwns: (id) => Platform.dlc.owns(id), // #119 서포터팩 DLC 게이트 (러시안블루 보장)
});
setEncounterEvents(EVENTS); // core/encounter 술어에 EVENTS 주입 (makeEvents 산물 — 생성 직후 1회)
// 이벤트 선택지 비용 판정/소비: food가 섞인 cost는 신선+통조림 합산으로 취급 (신선 우선 소비 후 통조림 폴백)
function eventCostOk(cost) {
  return Object.entries(cost).every(([id, n]) => id === 'food' ? hasAnyFood(n) : (state.res[id] || 0) >= n);
}
function eventCostConsume(cost) {
  if (!eventCostOk(cost)) return false;
  for (const [id, n] of Object.entries(cost)) { if (id === 'food') consumeAnyFood(n); else resConsume(id, n); }
  return true;
}
// ============================================================
//  #181 방문자 인엔진 연출 — 등장인물이 화면 끝에서 걸어와, 카메라가 팬,
//  클릭하면 라디오 자막으로 대사, 선택지 카드(삽화 0), 끝나면 걸어 나가고 카메라 복귀.
//  thief(흔적)·caravan(먼 조망)은 ENCOUNTER_VISITOR에 없어 그냥 카드로 폴백.
// ============================================================
let visitor = null;     // { g, parts, legs, arms, mode:'enter'|'idle'|'leave', tgt, edge, gait, evId, glow, glowBase, groundY, spoke, autoT }
let visitorObj = null;  // 픽 대상(= visitor.g); leave 진입 시 null (더 이상 클릭 불가)

function visitorGroundY() { const s = SHELTER_WILDLIFE[state.current]; return (s && typeof s.groundY === 'number') ? s.groundY : 0; }
function visitorSpots() {
  // 카메라 쪽(앞) 근처 지면 — 옥탑 슬래브·지상 모두 발 디딜 곳(가장자리 허공 방지). 집은 뒤에 둔다.
  const yaw = camState.yaw;
  const rr = Math.max(ROOM.w, ROOM.d) * 0.5;
  return {
    edge: { x: Math.cos(yaw) * (rr + 3.8), z: Math.sin(yaw) * (rr + 3.8) },
    stop: { x: Math.cos(yaw) * (rr + 1.9), z: Math.sin(yaw) * (rr + 1.9) },
  };
}
const vLang = o => (o ? (lang === 'en' ? o.en : o.ko) : ''); // 방문자 표 인라인 ko/en 선택
function scaleWant(want) { const m = encCostMul(); const out = {}; for (const [r, n] of Object.entries(want)) out[r] = Math.max(1, Math.round(n * m)); return out; } // 난이도 비용 배수(지불↑)
function scaleGive(give) { const m = encBarterMul(); const out = {}; for (const [r, n] of Object.entries(give)) out[r] = Math.max(1, Math.round(n * m)); return out; } // 난이도 교환 배수(수령↓) — 암시장과 동일
function presentVisitor(id) {
  const preset = ENCOUNTER_VISITOR[id];
  if (!preset) { openEventCard(id); return; }
  disposeVisitor();
  const built = buildVisitor(preset);
  const gy = visitorGroundY();
  const { edge, stop } = visitorSpots();
  built.g.position.set(edge.x, gy, edge.z);
  built.g.rotation.y = Math.atan2(stop.x - edge.x, stop.z - edge.z); // 집(스톱) 쪽을 향해
  scene.add(built.g);
  // #181 디렉터 피드백: "사람에게 빛나는 걸 저렇게 하면" — 몸을 감싸던 앰버 발광 스프라이트 제거.
  //   주목 유도는 카메라 자동 팬(방문자를 화면 중앙으로)이 담당한다. (필요 시 발치 바닥 표식으로 대체)
  // autoT=0으로 시작: 자동 발화 예약은 **도착 시점**에 tickVisitor가 건다(#208). 구 스폰+45초 값은 도착 시
  //   덮어써져 영영 안 쓰이는 죽은 수치라 제거 — 남겨두면 "45초 뒤 발화"라 오독된다.
  visitor = { ...built, mode: 'enter', tgt: stop, edge, gait: 0, evId: id, glow: null, glowBase: 0, groundY: gy, spoke: false, autoT: 0 };
  // #181 밸런스 테이블에서 대사·교환 랜덤 픽 (고정 → 다양)
  const vt = VISITOR_TABLE[id];
  if (vt) {
    visitor.voiceObj = (vt.voices && vt.voices.length) ? vt.voices[Math.floor(Math.random() * vt.voices.length)] : null;
    visitor.offer = (!vt.beg && vt.offers && vt.offers.length) ? vt.offers[Math.floor(Math.random() * vt.offers.length)] : null;
  }
  visitorObj = built.g;
  renderer.shadowMap.needsUpdate = true;
  enterVisitorCloseup(stop.x, stop.z, gy);
  if (playSfx) playSfx('steps_snow', { vol: 0.32, jitter: 0.1 });
}
function visitorStep(v, dt) {
  const g = v.g, tgt = v.mode === 'leave' ? v.edge : v.tgt;
  const dx = tgt.x - g.position.x, dz = tgt.z - g.position.z;
  const dist = Math.hypot(dx, dz), moving = dist > 0.08;
  if (moving) {
    const step = Math.min(0.85 * dt, dist);
    g.position.x += dx / dist * step; g.position.z += dz / dist * step;
    const want = Math.atan2(dx, dz);
    let dr = want - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
    g.rotation.y += dr * Math.min(1, dt * 6);
    v.gait += dt * 7;
  }
  const sw = moving ? Math.sin(v.gait) * 0.5 : 0, k = Math.min(1, dt * 10);
  if (v.legs.l) v.legs.l.rotation.x += (sw - v.legs.l.rotation.x) * k;
  if (v.legs.r) v.legs.r.rotation.x += (-sw - v.legs.r.rotation.x) * k;
  if (v.arms.l) v.arms.l.rotation.x += (-sw * 0.6 - v.arms.l.rotation.x) * k;
  if (v.arms.r) v.arms.r.rotation.x += (sw * 0.6 - v.arms.r.rotation.x) * k;
  return !moving;
}
function tickVisitor(t, dt) {
  if (!visitor) return;
  const v = visitor;
  if (v.mode === 'enter') {
    v._stepT = (v._stepT || 0) + dt;
    if (v._stepT > 0.42) { v._stepT = 0; if (playSfx) playSfx('steps_snow', { vol: 0.2, jitter: 0.15 }); } // #181 걸어오는 발소리 (도착하면 멎어 정적)
    if (visitorStep(v, dt)) {
      v.mode = 'idle'; renderer.shadowMap.needsUpdate = true;
      // #208(디렉터): "쟤가 오면 그냥 뜨게 해 — 굳이 터치 안 해도 화면이 인카운터로 땡겨지고 자동 메시지 출력되게".
      //   자동 발화 시점을 '스폰 + 45초'에서 **도착 순간 기준**으로 옮긴다. 걸어오는 동안은 방해하지 않고,
      //   멈춰서 나를 바라본 뒤 짧은 숨(autoSpeakMs)만 두고 말을 건다. 그 사이 탭하면 즉시 발화(기존 경로 그대로).
      v.autoT = performance.now() + BAL.visitorCam.autoSpeakMs;
    }
  } else if (v.mode === 'idle') {
    visitorStep(v, dt);
    // #181 디렉터: 대사는 '화면(카메라)'이 아니라 인게임 아바타(플레이어)를 바라보며 건넨다 — 4벽 응시 금지.
    //   아바타가 있으면 그 위치를, 없으면 집(스톱 진입 방향) 쪽을 향한다.
    const ap = (avatarSys.exists && avatarSys.exists() && avatarSys.pos) ? avatarSys.pos() : null;
    const faceYaw = ap
      ? Math.atan2(ap.x - v.g.position.x, ap.z - v.g.position.z)
      : Math.atan2(v.tgt.x - v.edge.x, v.tgt.z - v.edge.z);
    let dr = faceYaw - v.g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
    v.g.rotation.y += dr * Math.min(1, dt * 4);
    if (v.parts && v.parts.body && !opts.reduceMotion) v.parts.body.scale.y = 1 + Math.sin(t * 1.6) * 0.012; // 미세 숨쉬기(조각상 방지)
    if (v.glow) v.glow.material.opacity = opts.reduceMotion ? v.glowBase * 0.7 : v.glowBase * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3)));
    if (v.autoT && performance.now() > v.autoT) { v.autoT = 0; onVisitorClicked(); } // 도착 후 autoSpeakMs → 자동 발화+카드
  } else if (v.mode === 'leave') {
    if (v.glow) v.glow.material.opacity = Math.max(0, v.glow.material.opacity - dt * 2);
    if (visitorStep(v, dt)) { disposeVisitor(); return; }
  }
  if (visitorCam.active) visitorCam.center.set(v.g.position.x, v.groundY + BAL.visitorCam.centerY, v.g.position.z);
  v._shT = (v._shT || 0) + dt; if (v._shT > 0.12) { v._shT = 0; renderer.shadowMap.needsUpdate = true; }
}
function pickVisitor(e) {
  if (!visitorObj) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(visitorObj, true).length > 0;
}
function onVisitorClicked() {
  if (!visitor || visitor.mode === 'leave') return;
  visitor.autoT = 0;
  const id = visitor.evId;
  if (!visitor.spoke) { visitor.spoke = true; showVisitorBubble(id); } // 라디오 자막으로 대사
  openEventCard(id, { noImg: true, compact: true }); // 콤팩트 카드(선택지만) — 대사는 버블
}
function dismissVisitor(silent) {
  // #208: 동물 인카운터 클로즈업도 같은 출구로 복귀한다 — openEventCard의 선택/내리기 핸들러가
  //   이미 이 함수를 부르므로, 여기 한 곳에 걸면 사람·동물이 같은 경로로 카메라를 돌려준다.
  releaseWildCam();
  if (!visitor) return;
  if (silent) { disposeVisitor(); return; }
  visitor.mode = 'leave'; visitorObj = null;                 // 걸어 나가고 카메라 복귀
  exitVisitorCloseup();
}
function disposeVisitor() {
  if (visitor) { scene.remove(visitor.g); disposeDeep(visitor.g); }
  visitor = null; visitorObj = null;
  if (visitorCam.active && !wildCamEnt) exitVisitorCloseup(); // #208: 동물이 카메라 주인이면 뺏지 않는다(퇴장 겹침)
  renderer.shadowMap.needsUpdate = true;
}
// 방문자의 실제 대사 추출: 따옴표(" " 「」 " ")로 감싼 발화가 있으면 그것만(라디오로 나오는 "목소리"),
// 없으면(몸짓형 방문자) 서술 전문을 캡션으로. HTML/개행 정리.
function visitorVoice(ev) {
  const raw = (ev.textFn ? ev.textFn() : t(ev.textId)) || '';
  const flat = raw.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const quotes = flat.match(/"[^"]{2,}"|[“][^”]{2,}[”]|[「][^」]{2,}[」]/g);
  return quotes && quotes.length ? quotes.join(' ') : null; // 따옴표 없으면 null → 버블 스킵(무언)
}
// 방문자 대사 = 라디오 버블 재활용(앰버 틴트, 방문자 머리 위 앵커). 좀보이드식 타이핑 자막.
function showVisitorBubble(id) {
  const ev = EVENTS[id];
  if (!ev || !visitor) return;
  const text = visitor.voiceObj ? vLang(visitor.voiceObj) : visitorVoice(ev); // 밸런스 테이블 대사 우선, 없으면 따옴표
  if (!text) return; // 무언(쓰러진 낯선이 등) — 버블 없음
  clearRadioBubble();
  const el = ensureRadioBubbleEl();
  el.className = 'rb-visitor';
  el.innerHTML = `<div class="rb-title"></div><div class="rb-body"></div>`;
  el.style.display = 'block';
  radioBubble = { el, item: { group: visitor.g }, yOff: 1.9, ttl: 0, fading: false, sfxTimers: [], typeTimer: null };
  positionRadioBubble();
  // #181 디렉터(2026-07-15): 대사 시 라디오 지지직음 제거 — 거슬린다는 피드백. 무음으로 건넨다.
  el.querySelector('.rb-title').textContent = t(ev.titleId);
  const bodyEl = el.querySelector('.rb-body');
  let ci = 0;
  const type = () => {
    if (!radioBubble) return;
    bodyEl.textContent = text.slice(0, ci); ci++;
    if (ci <= text.length) radioBubble.typeTimer = setTimeout(type, 32);
    else radioBubble.ttl = performance.now() + 5000;
  };
  type();
}
// 방문자 연출 가능 조건: 실내 셸터 뷰(탐험 중·타이틀 아님).
function canPresentVisitor() { return !state.exp && !!ROOM && !document.body.classList.contains('title-mode'); }

// ============================================================
// #182 B0 「동물 드랍」 지면 반짝임 — 동물이 무언가 떨구면 집 밖 땅에 작게 반짝이는 표식이 뜨고,
//   터치/클릭하면 기존 이벤트 카드로 상호작용. 지면 직접 셸터만(옥탑·지하철·요트·등대 제외 — 주변 '땅' 없음).
//   B0=재사용 코어(스폰·픽·수거·라이프사이클). 어떤 동물이 무엇을 떨구는지는 B2에서 배선.
// ============================================================
let dropSpots = [];       // 활성 지면 드랍 { g, spr, hit, evId, yBase, follow, ent, settled, autoT }
let wildCamEnt = null;    // #208 동물 클로즈업 점유 중인 엔티티(visitorCam을 사람과 공유 — 소유자 표시)
let _sparkleTex = null;
// #208 동물 클로즈업 해제 — 카드가 끝났거나(dismissVisitor), 동물이 떠났거나, 셸터가 바뀌면.
//   사람이 붙어 있으면 카메라 주인은 그쪽이므로 건드리지 않는다.
function releaseWildCam() {
  if (!wildCamEnt) return;
  wildCamEnt = null;
  if (!visitor && visitorCam.active) exitVisitorCloseup();
}
function sparkleTexOnce() {
  if (_sparkleTex) return _sparkleTex;
  // 디렉터 레퍼런스: 부드러운 4가닥 별빛 플레어(길게 뻗다 사라지는 소프트 레이) + 밝은 코어.
  //   하드 라인 십자 대신, 컨텍스트 비등방 스케일로 소프트 방사 빔을 그린다(렌즈 스타 느낌).
  _sparkleTex = makeCanvasTex((g2, w) => {
    g2.clearRect(0, 0, w, w); const c = w / 2;
    const beam = (rot, len, thick, alpha) => {
      g2.save(); g2.translate(c, c); g2.rotate(rot); g2.scale(thick, len);
      const gr = g2.createRadialGradient(0, 0, 0, 0, 0, c);
      gr.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gr.addColorStop(0.4, `rgba(255,251,238,${alpha * 0.22})`);
      gr.addColorStop(1, 'rgba(255,251,238,0)');
      g2.fillStyle = gr; g2.beginPath(); g2.arc(0, 0, c, 0, Math.PI * 2); g2.fill();
      g2.restore();
    };
    beam(0, 1.0, 0.085, 0.95);            // 세로 긴 레이
    beam(Math.PI / 2, 1.0, 0.085, 0.95);  // 가로 긴 레이
    beam(Math.PI / 4, 0.6, 0.05, 0.5);    // 대각 짧은 레이 ×2 (8각 별빛)
    beam(-Math.PI / 4, 0.6, 0.05, 0.5);
    const core = g2.createRadialGradient(c, c, 0, c, c, c * 0.3); // 밝은 소프트 코어
    core.addColorStop(0, 'rgba(255,255,255,1)'); core.addColorStop(0.5, 'rgba(255,253,244,0.7)');
    core.addColorStop(1, 'rgba(255,253,244,0)');
    g2.fillStyle = core; g2.fillRect(0, 0, w, w);
  }, 128, 128);
  return _sparkleTex;
}
// 지면 직접 셸터 판정 — SHELTER_ACCESS에 'foot'(도보 접근=주변 땅 존재) 있는 곳만.
function shelterHasGround(id) { const acc = SHELTER_ACCESS[id] || SHELTER_ACCESS._default; return acc.includes('foot'); }
function dropSpotPos() {
  // 카메라 쪽(앞) 방 밖 지면 — camState.yaw ± 스프레드로 화면 안, groundY 접지.
  const rr = Math.max(ROOM.w, ROOM.d) * 0.5;
  const ang = camState.yaw + (Math.random() - 0.5) * 1.4;
  const d = rr + 1.4 + Math.random() * 1.4;
  return { x: Math.cos(ang) * d, z: Math.sin(ang) * d, y: visitorGroundY() };
}
function spawnGroundDrop(evId, opts = {}) {
  if (!ROOM || !EVENTS[evId] || !shelterHasGround(state.current)) return false; // 지면 셸터·유효 이벤트만
  const f = opts.follow || null; // 동물 그룹 — 반짝임이 몸에 붙어 동행(디렉터)
  const p = f ? { x: f.position.x, z: f.position.z, y: visitorGroundY() } : (opts.pos || dropSpotPos());
  const g = new THREE.Group(); g.position.set(p.x, p.y, p.z);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTexOnce(), color: 0xfff6e0, blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false }));
  spr.scale.set(0.95, 0.95, 1); spr.position.set(0, 0.45, 0); g.add(spr);
  const hit = new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0, transparent: true, depthWrite: false })); // 넉넉한 터치 히트박스
  hit.scale.set(1.3, 1.3, 1); hit.position.set(0, 0.45, 0); g.add(hit);
  scene.add(g);
  // ent(살아 있는 동물)가 있으면 #208 자동 인카운터 대상. autoT는 안전망 상한으로 먼저 걸고,
  //   자리를 잡는 순간 tickDropSpots가 autoSpeakMs로 앞당긴다. 정적 발견물(FIND)은 ent 없음 = 기존 터치 유지.
  // 동행 시 몸 위에 뜨도록 상향 — 상수 0.85는 #208 클로즈업(zoom 4.5)에서 개(sizeH 0.34) 머리 위 0.5u에
  //   떠 '허공의 별'로 읽혔다. 종 덩치 기준으로: 등 바로 위. (엔티티 정보 없으면 기존 상수 유지)
  const sh = opts.ent && opts.ent.sp ? opts.ent.sp.sizeH : 0;
  dropSpots.push({ g, spr, hit, evId, yBase: f ? (sh ? sh + 0.18 : 0.85) : 0.4, follow: f, ent: opts.ent || null, settled: false,
    autoT: opts.ent ? performance.now() + BAL.wildCam.maxWaitMs : 0 });
  if (playSfx) playSfx('place', { vol: 0.28, jitter: 0.2 });
  return true;
}
// 동물이 아직 걸어/내려오는 중인지 — 이 모드들이 '등장 이동'이다(wildlife.js spawnOne/update 기준).
const WILD_ARRIVING = new Set(['enter', 'walk', 'landing']);
function tickDropSpots(t) {
  let fire = null;
  for (const d of dropSpots) {
    // 동물 동행(디렉터): 살아 있는 동안 몸을 따라다니고, 떠나면(parent 해제) 마지막 자리에 잔류
    if (d.follow) {
      // y도 따라간다: yBase가 이제 '엔티티 루트 기준'이라, 부유하는 곤충(groundY+0.9)도 몸 위에 붙는다.
      if (d.follow.parent) { d.g.position.set(d.follow.position.x, d.follow.position.y, d.follow.position.z); }
      else { d.follow = null; d.yBase = 0.4; d.g.position.y = visitorGroundY(); } // 떨구고 갔다 — 지면 높이로 안착
    }
    // #208 자동 인카운터: 카메라는 동물을 따라가고, 자리를 잡으면 한 박자 뒤 카드가 열린다.
    if (d.ent) {
      if (!d.ent.g.parent) { if (wildCamEnt === d.ent) releaseWildCam(); d.ent = null; d.autoT = 0; } // 이미 떠났다 → 추적/자동 종료
      else {
        if (wildCamEnt === d.ent && visitorCam.active && !visitor) // 사람이 동시에 있으면 tickVisitor에 양보
          visitorCam.center.set(d.ent.g.position.x, (d.ent.groundY || 0) + BAL.wildCam.centerY, d.ent.g.position.z);
        if (!d.settled && !WILD_ARRIVING.has(d.ent.mode)) { // 멈춰 자리 잡음 → 안전망 상한을 짧은 숨으로 당긴다
          d.settled = true;
          d.autoT = Math.min(d.autoT, performance.now() + BAL.wildCam.autoSpeakMs);
        }
        if (d.autoT && performance.now() > d.autoT && !fire) fire = d;
      }
    }
    const k = 0.5 + 0.5 * Math.sin(t * 3.4);
    d.spr.material.opacity = 0.55 + 0.45 * k;
    d.spr.scale.setScalar(0.85 + 0.22 * k);
    d.spr.material.rotation = t * 0.4;
    d.spr.position.y = d.yBase + Math.sin(t * 1.7) * 0.05; // 살짝 부유
  }
  if (fire) collectDrop(fire); // 루프 밖에서 — collectDrop이 dropSpots를 재할당한다
}
function pickDrop(e) {
  if (!dropSpots.length) return null;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  for (const d of dropSpots) if (raycaster.intersectObject(d.hit, true).length) return d;
  return null;
}
function collectDrop(d) {
  scene.remove(d.g); disposeDeep(d.g);
  dropSpots = dropSpots.filter(x => x !== d);
  if (playSfx) playSfx('place', { vol: 0.4 });
  openEventCard(d.evId); // 기존 카드 흐름으로 상호작용
}
function disposeDropSpots() { releaseWildCam(); for (const d of dropSpots) { scene.remove(d.g); disposeDeep(d.g); } dropSpots = []; }

// #182 B2 동물 인카운터 → 인엔진 매니페스트. 사람(A) ENCOUNTER_VISITOR와 평행:
//   해당 인카운터가 뜰 조건이 되면 그 종을 실제로 스폰해 로밍시키고, 집 밖 땅에 드랍 반짝임을 띄운다.
//   반짝임 터치 → collectDrop → openEventCard(기존 카드). 지면 없는 셸터(옥탑·요트 등)는 카드 폴백.
//   cat/catgift/catdream은 고양이 시스템(별도)이라 매핑 제외 — 기존 경로 유지.
const ENCOUNTER_WILDLIFE = {   // 키 = events.js의 실제 EVENTS 키(i18n 슬러그와 다름 — 언더스코어)
  dog:              { species: 'dog' },        // 폐허의 떠돌이 개
  greenhouse_birds: { species: 'sparrow' },    // 씨앗 도둑(온실)
  frozen_sparrow:   { species: 'sparrow' },    // 문가의 언 참새(겨울)
  bee_swarm:        { species: 'bee' },         // 창틀의 벌(여름)
  cicada_evening:   { species: 'cicada' },      // 매미(여름 저녁)
  firefly_field:    { species: 'firefly' },     // 반딧불(여름밤)
  mosquito_net:     { species: 'mosquito' },    // 창틈 모기(여름밤)
  spider_web:       { species: 'spiderweb' },   // 아침 거미줄(가을) — 정적 프롭
  geese_south:      { species: 'goose', sky: true },     // 남행 기러기(가을) — 조망(드랍 없음)
  returning_birds:  { species: 'sparrow', sky: true },   // 돌아오는 새들(봄) — 조망(드랍 없음)
};
// #182 E 발견 사물 — 로밍 동물이 아닌 정적 발견물(고장난 기계·낡은 달력·오르골·옛 사진·털린 캐시·발린 구역).
//   엔티티 스폰은 없고, 집 밖 땅에 발견 반짝임만 띄운다(터치→카드). B0 드랍 인프라 재사용.
const ENCOUNTER_FIND = new Set(['broken', 'old_calendar', 'music_box', 'old_photo', 'looted_cache', 'stripped_district']);
function canPresentGround(id) {
  return !state.exp && !!ROOM && !document.body.classList.contains('title-mode') && shelterHasGround(state.current);
}
function canPresentWildlife(id) {
  return ENCOUNTER_WILDLIFE[id] && canPresentGround(id);
}
function presentWildlife(id) {
  const m = ENCOUNTER_WILDLIFE[id];
  if (!m) { openEventCard(id); return; }
  // 종 엔티티 스폰(실제 로밍) — 실패해도 카드/드랍은 뜬다.
  let ent = null;
  // #208: 앰비언트 진입점(_spawnSpecies, 밴드 밖 10.5u)이 아니라 인카운터 진입점 — 집 앞 카메라 쪽으로 짧게.
  try { ent = (wildlifeSys && wildlifeSys._spawnEncounter && wildlifeSys._spawnEncounter(m.species, camState.yaw)) || null; } catch (e) {}
  // 조망(하늘 나는 새 등): 떨군 게 없으니 지면 드랍 없이 카드 직결.
  if (m.sky) { openEventCard(id); return; }
  // 디렉터(2026-07-16): 반짝임은 동물 몸에 붙어 따라다닌다 — 땅에 따로 뜨면 개연성이 없다.
  //   동물이 떠나면 그 자리에 잔류(떨구고 갔다) — 보상 유실 없음. 정적 발견물(FIND)은 기존 지면 방식.
  if (!spawnGroundDrop(id, { follow: ent?.g || null, ent })) { openEventCard(id); return; }
  // #208(디렉터): 사람과 대칭 — 개/동물이 "오면" 카메라가 그쪽으로 땡겨지고, 자리 잡으면 카드가 알아서 뜬다.
  //   기존엔 팬도 자동 발화도 없어서 반짝임을 못 찾으면 인카운터가 통째로 유실됐다(사람 45초 문제의 동물판).
  //   터치는 남긴다 — 이제 '필수'가 아니라 '앞당기기'다.
  if (ent && ent.g) { wildCamEnt = ent; enterVisitorCloseup(ent.g.position.x, ent.g.position.z, ent.groundY, BAL.wildCam); }
}

function showEvent(id) {
  const ev = EVENTS[id];
  if (!ev) return;
  // #199 무너진 입구(디렉터 2026-07-17): 사진 카드 → 인엔진 문+상자 연출 (러너 점유 시 내부에서 카드 폴백)
  if (id === 'collapsed_entrance') { playCollapseVignette(); return; }
  playEventSting(id);
  // 걸어오는 등장인물(arrive foot/door/boat)은 인엔진 연출로 분기. 그 외는 즉시 카드.
  if (ev.arrive && ENCOUNTER_VISITOR[id] && canPresentVisitor()) { presentVisitor(id); return; }
  // #182 B2 동물 인카운터 — 종 스폰 + 지면 드랍 반짝임(터치 유도). 지면 없으면 아래 카드로 폴백.
  if (canPresentWildlife(id)) { presentWildlife(id); return; }
  // #182 E 발견 사물 — 엔티티 없이 지면 발견 반짝임(터치→카드). 실패(지면 없음)면 카드 폴백.
  if (ENCOUNTER_FIND.has(id) && canPresentGround(id) && spawnGroundDrop(id)) return;
  openEventCard(id);
}
// #181 교환 방문자 콤팩트 카드 — 밸런스 테이블 오퍼(want를 내면 give를 받음) + 거절. 대사는 라디오 버블.
function openVisitorTradeCard(id, ev, evTitle) {
  state.activeEvent = id;
  const o = visitor.offer;
  const baseWant = (o.winterWant && seasonOf().id === 'winter') ? o.winterWant : o.want; // 겨울 연료 프리미엄
  const want = o.scale ? scaleWant(baseWant) : baseWant;
  const give = o.scale ? scaleGive(o.give) : o.give; // 하드/하드코어는 수령도 야박 (barterMul)
  const ok = eventCostOk(want);
  const body = `<div style="display:flex;flex-direction:column;gap:6px">
    <button class="pixel-btn" data-vtrade="1" ${ok ? '' : 'disabled'}>${costLabel(want)} → ${costLabel(give)}${ok ? '' : ' ' + t('ev.noResource')}</button>
    <button class="pixel-btn" data-vtrade="0">${vLang(VISITOR_UI.decline)}</button>
    <button class="pixel-btn" id="event-minimize" data-i18n="event.minimize">${t('event.minimize')}</button>
  </div>`;
  openModal(`${icon('icon_ev_' + id, ev.icon)} ${evTitle}`, body, 'visitor');
  $('modal-body').querySelectorAll('button[data-vtrade]').forEach(b => b.addEventListener('click', () => {
    let result;
    if (b.dataset.vtrade === '1') {
      if (!eventCostConsume(want)) { toast(t('toast.needResource')); return; }
      for (const [r, n] of Object.entries(give)) resAdd(r, n);
      const bad = o.risk === 'infection' && Math.random() < 0.5;
      if (bad) applyInjury('infection', false);
      result = vLang(bad ? VISITOR_UI.tradeBad : VISITOR_UI.tradeOk);
    } else {
      result = vLang(VISITOR_UI.decline);
    }
    state.dayLog.notes.push(t('event.metNote', { icon: ev.icon, title: evTitle }));
    state.activeEvent = null; state.minimizedEvent = null;
    hideEventChip();
    dismissVisitor(); // 퇴장 + 카메라 복귀
    openModal(`${icon('icon_ev_' + id, ev.icon)} ${evTitle}`, `<div style="line-height:2">${result}</div>`);
    scheduleSave(); renderResBar(); updateHud();
  }));
  const minBtn = document.getElementById('event-minimize');
  if (minBtn) minBtn.addEventListener('click', () => {
    state.minimizedEvent = id; state.activeEvent = null;
    dismissVisitor(); closeModal(); showEventChip(id); scheduleSave();
  });
  tipOnce('tip.event');
}
// #201 라이브 카드 스냅샷 — 카드가 열리는 '지금'의 씬(내 가구·날씨·계절·고양이)을
//   프리셋 앵글·풀셸(지붕/천장 포함)로 1프레임 렌더해 dataURL 일러로 쓴다.
//   도트 포스트패스(rt→postScene)까지 통과시켜 인게임 픽셀룩 그대로. 실패는 조용히 null(→ PNG/텍스트 폴백).
//   게임 상태 무접점: 카메라 위치·컬링은 함수 안에서 원복(다음 renderFrame이 정상 마스크로 갱신).
function liveCardIllust(id) {
  const c = EVENT_CARD_CAMS[id];
  if (!c || titleVisible || !rt) return null;
  const savedPos = camera.position.clone();
  let lift = null;
  try {
    // 밤 노출 보정(디렉터 2026-07-17): 낮(dayness 1)은 무보정 그대로, 밤일수록 달빛 리프트를
    //   스냅샷 프레임에만 얹는다(씬에 잠깐 넣고 finally에서 제거 — 게임 라이팅 무접점).
    const nightK = 1 - dayness;
    if (nightK > 0.02) {
      lift = new THREE.HemisphereLight(0x8fa8cc, 0x4a4136, 0.5 * nightK);
      scene.add(lift);
    }
    cineCam.position.set(c[0], c[1], c[2]);
    cineCam.up.set(0, 1, 0);
    cineCam.lookAt(c[3], c[4], c[5]);
    cineCam.fov = c[6]; cineCam.aspect = innerWidth / innerHeight; cineCam.updateProjectionMatrix();
    camera.position.set(c[0], c[1], c[2]); // 컬링 기준점 동기(풀셸이라 마스크 불변이지만 일관성 유지)
    setForceClosed(true);
    updateWallCulling(0, true); // 풀셸 즉시 확정(무페이드) — 닫힌 집 외경/천장
    renderer.setRenderTarget(rt);
    renderer.render(scene, cineCam);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
    return renderer.domElement.toDataURL('image/jpeg', 0.88);
  } catch (e) { return null; }
  finally {
    if (lift) scene.remove(lift);
    setForceClosed(false);
    camera.position.copy(savedPos);
    updateWallCulling(0, true); // 원래 컬링 마스크 즉시 복귀
  }
}
function openEventCard(id, opts = {}) {
  const ev = EVENTS[id];
  if (!ev) return;
  state.activeEvent = id; // 현재 떠 있는 이벤트 (내리기 대상)
  const evTitle = t(ev.titleId);
  // #181 교환 방문자 — 밸런스 테이블 오퍼(want↔give)를 콤팩트 카드로. 거지/무언은 아래 기존 경로.
  if (opts.compact && visitor && visitor.offer && visitor.evId === id) { openVisitorTradeCard(id, ev, evTitle); return; }
  const choicesHtml = ev.choices.map((c, i) => {
    const cost = typeof c.cost === 'function' ? c.cost() : c.cost; // 계절 가변 비용(밀수꾼) 지원
    const ok = !cost || eventCostOk(cost);
    return `<button class="pixel-btn" data-ch="${i}" ${ok ? '' : 'disabled'}>${t(c.labelId)}${cost && !ok ? t('ev.noResource') : ''}</button>`;
  }).join('') + `<button class="pixel-btn" id="event-minimize" data-i18n="event.minimize">${t('event.minimize')}</button>`;
  let body, kind = null;
  if (opts.compact) {
    // #181 방문자 콤팩트 카드: 서술 없이 선택지만(대사는 라디오 버블이 담당). 하단 소형 패널.
    body = `<div style="display:flex;flex-direction:column;gap:6px">${choicesHtml}</div>`;
    kind = 'visitor';
  } else {
    // 그 외: 라이브 스냅샷(#201 — 지금 이 순간의 내 집) → 설치 PNG → 텍스트 카드 폴백 체인.
    const live = opts.noImg ? null : liveCardIllust(id);
    const illust = opts.noImg ? '' : (live
      ? `<img class="ev-illust" src="${live}" alt="" draggable="false">`
      : `<img class="ev-illust" src="img/events/ev_${id}.png" alt="" draggable="false" onerror="this.remove()">`);
    body = `${illust}
    <div class="modal-body" style="line-height:2">${ev.textFn ? ev.textFn() : t(ev.textId)}</div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">${choicesHtml}</div>`;
  }
  openModal(`${icon('icon_ev_' + id, ev.icon)} ${evTitle}`, body, kind);
  $('modal-body').querySelectorAll('button[data-ch]').forEach(b =>
    b.addEventListener('click', () => {
      const c = ev.choices[+b.dataset.ch];
      const cCost = typeof c.cost === 'function' ? c.cost() : c.cost; // 계절 가변 비용 해석
      if (cCost && !eventCostConsume(cCost)) { toast(t('toast.needResource')); return; }
      const result = c.run();
      state.dayLog.notes.push(t('event.metNote', { icon: ev.icon, title: evTitle }));
      state.activeEvent = null;
      state.minimizedEvent = null; // 선택 완료 → 내려둔 상태도 해제
      hideEventChip();
      dismissVisitor(); // #181 선택 완료 → 방문자 퇴장 + 카메라 복귀
      openModal(`${icon('icon_ev_' + id, ev.icon)} ${evTitle}`, `<div style="line-height:2">${result}</div>`);
      scheduleSave();
      renderResBar();
      updateHud();
    }));
  // 내리기: 모달만 숨기고 이벤트 상태는 보존 → 하단 칩으로 복원 가능 (부수효과 없음, 소진 아님)
  const minBtn = document.getElementById('event-minimize');
  if (minBtn) minBtn.addEventListener('click', () => {
    state.minimizedEvent = id;
    state.activeEvent = null;
    dismissVisitor(); // #181 내리면 방문자도 떠난다 (칩으로 카드만 복원)
    closeModal();
    showEventChip(id);
    scheduleSave();
  });
  tipOnce('tip.event'); // 찢어진 쪽지: 첫 인카운터 직후
}
// 내려둔 이벤트 칩 — 클릭 시 showEvent(id)로 선택지 그대로 복원
function showEventChip(id) {
  const ev = EVENTS[id];
  if (!ev) return;
  let chip = document.getElementById('event-chip');
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'event-chip';
    chip.className = 'pixel-btn';
    document.body.appendChild(chip);
  }
  chip.title = t('event.chip.title');
  chip.innerHTML = `${icon('icon_ev_' + id, ev.icon)} ${t(ev.titleId)} <span class="ev-bang">!</span>`;
  chip.style.display = '';
  chip.onclick = () => {
    hideEventChip();
    state.minimizedEvent = null;
    openEventCard(id, { noImg: !!ENCOUNTER_VISITOR[id] }); // #181 칩 복원은 카드만(방문자 재스폰 안 함)
  };
}
function hideEventChip() {
  const chip = document.getElementById('event-chip');
  if (chip) chip.style.display = 'none';
}

/* ============================================================
   제작 (기획서: 업그레이드 트랙 — 재료 → 자원/가구)
============================================================ */
/* ── 거처 개조 (기지 커스터마이징: 빗물받이·텃밭·증축 등) ── */
const SHELTER_MODS = {
  raincatch:  { name: '빗물받이',    nameEn: 'Rain Catch',   emoji: '', cost: BAL.modCosts.raincatch, desc: '비/눈 오는 날 깨끗한 물 +1', descEn: 'Clean water +1 on rainy/snowy days', not: ['lighthouse'] },
  garden:     { name: '텃밭 상자',   nameEn: 'Garden Box',   emoji: '', cost: BAL.modCosts.garden, desc: '이틀에 한 번 음식 +1 (겨울 제외)', descEn: 'Food +1 every other day (except winter)', not: ['subway', 'rooftop'] },
  // 옥상 텃밭 (#53) — rooftop 전용. 마당을 텃밭으로 개조. 매일 음식 생산(겨울 0), 옥탑 퍽 gardenMult로 2배.
  //   현재 텃밭은 rooftop 전용이라 퍽이 곧 정체성 — 다른 셸터로의 확장은 향후.
  rooftopGarden: { name: '옥상 텃밭', nameEn: 'Rooftop Garden', emoji: '', cost: BAL.modCosts.rooftopGarden, desc: '마당을 텃밭으로 — 매일 음식 +2 (겨울 휴면)', descEn: 'Turn the yard into a garden — food +2 daily (dormant in winter)', only: ['rooftop'] },
  // 1.2 버섯 재배칸 (subway 전용) — 어둠에서 자라는 식량. 옥탑 텃밭(볕/여름)의 대칭축(어둠/연중).
  //   매일 음식 +1(겨울 포함 연중), 이틀에 한 번 물 1 소모. 옥탑보다 산출 절반이되 계절을 타지 않는다.
  mushroom: { name: '버섯 재배칸', nameEn: 'Mushroom Bed', emoji: '', cost: BAL.modCosts.mushroom, desc: '어둠 속 균상 — 매일 음식 +1 (연중, 물 소모)', descEn: 'A mushroom bed in the dark — food +1 daily year-round (uses water)', only: ['subway'] },
  insulation: { name: '단열재',      nameEn: 'Insulation',   emoji: '', cost: BAL.modCosts.insulation, desc: '악천후에도 쾌적함이 떨어지지 않음', descEn: 'Comfort no longer drops in bad weather', only: ['container', 'bus'] },
  shelf:      { name: '증축 선반',   nameEn: 'Extra Shelving', emoji: '', cost: BAL.modCosts.shelf, desc: '가구 배치 한도 +4', descEn: 'Furniture limit +4', only: ['bus'] },
  // #189 P2 지속 급전 승격: 설치 시 조명·가전 전력 무료 + 기존 발전(이틀 배터리 +1) 유지.
  solar:      { name: '태양광 패널', nameEn: 'Solar Panel',  emoji: '', cost: BAL.modCosts.solar,  desc: '조명·가전 전력 무료 (지속 급전) · 이틀에 한 번 배터리 +1', descEn: 'Free power for lights & appliances (steady supply) · battery +1 every other day', not: ['subway'] },
  // #189 P1 조명 설비 — 어둠(무비용·우울) ↔ 화기(연료·온기·흔들림) ↔ 전기조명(전력·안정) 밸런스 축의 세 번째 기둥.
  //   rebuild: 설치 즉시 loadShelter 재실행 → 천장 펜던트 소품+전등 점등. 전력은 processDay가 매일 배터리 1 소비.
  lighting:   { name: '조명 설비',   nameEn: 'Electric Lighting', emoji: '', cost: BAL.modCosts.lighting, desc: '천장에 전등을 매단다 — 방이 밝아진다 (배터리 1/일, 발전기 가동 중엔 무료)', descEn: 'Hang an electric light from the ceiling — the room brightens (battery 1/day, free while the generator runs)', rebuild: true },
  roof:       { name: '지붕 보강',   nameEn: 'Roof Reinforcement', emoji: '', cost: BAL.modCosts.roof,      desc: '악천후 수리 자재가 더 이상 들지 않음', descEn: 'Bad-weather repairs no longer cost materials', only: ['cabin', 'greenhouse'] },
  extension:  { name: '증축',        nameEn: 'Extension',    emoji: '', cost: BAL.modCosts.extension,  desc: '거처 폭 +2m — 벽을 허물고 더 넓게', descEn: 'Shelter width +2m — tear down a wall for more room', only: ['container', 'cabin', 'greenhouse', 'rooftop', 'subway', 'ship'] },
  // 1.3 온천 (lodge 전용) — 고원 발견물을 개조로 개방. cozy의 정점: 쾌적 온기 대형 + 취침 에너지 회복 보너스.
  //   고양이/개가 온천 옆에서 조는 전용 포즈(연출은 아트 폴백 — addModProp 소품 + 절차 김 파티클).
  onsen: { name: '온천', nameEn: 'Hot Spring', emoji: '', cost: BAL.modCosts.onsen, desc: '고원의 온천을 끌어들여 — 쾌적함 대폭 + 취침 회복 보너스', descEn: 'Tap the highland hot spring — big comfort boost + restful sleep bonus', only: ['lodge'] },
  // Phase B 개조 2단계 (비용 곡선 상향: 1단계의 2~2.5배)
  insulationPlus: { name: '강화 단열재', nameEn: 'Reinforced Insulation', emoji: '', cost: BAL.modCosts.insulationPlus, desc: '한파 방어 강화 (단열재 위에)', descEn: 'Stronger cold-snap defense (over insulation)', req: 'insulation' },
  // 2.0 동부 세관 (디렉터 2026-07-09: "shelter라고 하면 응당 안전해야 하니까") — buildRoom 지오 분기라 rebuild 플래그.
  customsClear: { name: '선반 철거', nameEn: 'Clear the Shelves', emoji: '', cost: BAL.modCosts.customsClear, desc: '압수품 선반을 뜯어낸다 — 벽이 비고, 내 것을 놓을 자리가 생긴다', descEn: 'Tear out the seizure shelves — the wall clears for things of your own', only: ['customs'], rebuild: true },
  customsSeal: { name: '창구 봉쇄', nameEn: 'Seal the Booths', emoji: '', cost: BAL.modCosts.customsSeal, desc: '심사 창구를 판자로 막는다 — 외풍이 멎는다 (악천후 쾌적 하락 해소)', descEn: 'Board up the inspection booths — the draft stops (no comfort loss in bad weather)', only: ['customs'], rebuild: true },
  terminalPatch: { name: '지붕 틈 막기', nameEn: 'Patch the Roof Gap', emoji: '', cost: BAL.modCosts.terminalPatch, desc: '무너진 천장 틈을 덮는다 — 신광은 사라지지만, 비는 더 이상 들이치지 않는다', descEn: 'Cover the broken ceiling — the light shafts fade, but the rain stays out', only: ['terminal'], rebuild: true },
  bigraincatch:   { name: '대형 빗물받이', nameEn: 'Large Rain Catch', emoji: '', cost: BAL.modCosts.bigraincatch, desc: '비/눈 오는 날 물 +2 (빗물받이 위에)', descEn: 'Water +2 on rainy/snowy days (over rain catch)', req: 'raincatch', not: ['lighthouse'] },
  // 무전 기지 개조 (디렉터: "무선기지국 설치 가능한 집엔 개조 기능") — 개척 프로젝트 「무전 기지 복구」 완공(radioBaseDone) 후
  //   지상 셸터에 실체(지붕 송신 안테나)를 세운다. gate=radioBaseDone → 프로젝트 완공과 연동. 지하(subway)는 하늘 미접근이라 제외.
  radiostation: { name: '무전 기지', nameEn: 'Radio Base', emoji: '', cost: BAL.modCosts.radiostation, desc: '지붕에 송신 안테나를 세운다 — 무전 기지의 실체 (붉은 항공등이 밤을 깜빡인다)', descEn: 'Raise the transmitter antenna on the roof — the radio base made real (a red beacon blinks through the night)', not: ['subway'], gate: 'radioBaseDone' },
};
// 개조 앵커 참조표 (문서 전용 — 런타임 미소비. 디스패치는 addModProp의 id 하드코딩 분기가 직접 수행).
// roof=지붕면 브래킷 · eave=처마 홈통+파이프+물통 · wall=외벽 덧댐 · ground=지면(마당) 배치.
//   solar                  → roof  : mounts.roof (폴백=벽밀착 지면 경사)
//   raincatch·bigraincatch → eave  : mounts.eave (폴백=우측 처마)
//   insulation·insulationPlus → wall : mounts.wall (폴백=+z 벽)
//   garden                 → ground: mounts.ground (앵커를 읽는 유일한 지면 소품)
//   rooftopGarden → buildRooftopGarden() : mounts 미참조, SHELTERS.rooftop._slab 기준 하드코딩(y=0 접지)
//   mushroom      → buildMushroomBed()   : mounts 미참조, 승강장 좌표 하드코딩(y=0). subway eave 폴백 없음
//   onsen         → 로지 옆마당 하드코딩   : mounts.groundY만 사용(ground 앵커 미참조)
// 셸터별 설치 앵커 실측 좌표 (buildRoom 지오메트리 기준).
//  roof:  { y(지붕 상면), cx, cz(지붕 중심), hw, hd(지붕 반폭/반깊이), pitch?(경사지붕이면 +z로 내려가는 기울기 rad) }
//  eave:  { y(처마 높이), x, z(모서리), dir(파이프가 뻗는 방향 [±1,±1]) }
//  wall:  { face:'-z'|'+z'|'-x'|'+x', y(벽 높이), len(벽 길이), off(벽 바깥면까지 거리) }
//  groundY: 벽 바깥 지형 높이(레이캐스트 실측, #87) — 물통/텃밭/온천 등 지면 소품의 발밑.
//    방 바닥(y0)과 지형이 다른 셸터(오두막 기단 -1.3, 예인선 수면 -2.7 등)에서 y0 배치가 공중 부양하던 실기기 신고의 교정값.
//  ground: 텃밭 전용 배치 앵커 { x, z, y?(기본 groundY), rot? } — 보트=갑판 위, 등대=등지기실 실내 화분.
// 앵커가 없는 셸터의 개조는 addModProp의 폴백(벽 밀착 지면 배치)을 쓴다.
const SHELTER_MOUNTS = {
  container: { // 6.4×2.9×2.4 평지붕, 벽 off 0.11. 바닥이 다리 위 — 지형 -0.73.
    roof: { y: 2.42, cx: 0, cz: 0, hw: 3.0, hd: 1.3, cullJoin: true },
    eave: { y: 2.4, x: 3.31, z: 1.45, dir: [1, 1], barrel: { x: 5.5, z: 1.2 } }, // 물통은 화단 오른쪽(디렉터 2026-07-08 — 토대 블록 겹침 해소)
    wall: { face: '+z', y: 2.4, len: 6.4, off: 1.45 },
    groundY: -0.73, ground: { x: 4.4, z: 1.2, rot: Math.PI / 2 },
  },
  bunker: { // 돔 아치 R4.35 — 평지붕 없음. 앞 포치(+z) 위 경사 거치. 지형 -0.82.
    roof: { y: 2.7, cx: 0, cz: 3.4, hw: 2.4, hd: 0.7 },
    eave: { y: 3.0, x: 4.25, z: 3.0, dir: [1, 1] },
    groundY: -0.82, ground: { x: 5.6, z: 2.1, rot: Math.PI / 2 },
  },
  rooftop: { // 옥탑 리워크(#53): 5.6×4.4×2.4 가벽 방 + 슬레이트 지붕(상면 ~2.5). 옥상 바닥 = y0.
    roof: { y: 2.52, cx: 0, cz: 0, hw: 2.5, hd: 1.9, cullJoin: true },
    eave: { y: 2.4, x: 2.88, z: -2.48, dir: [1, -1] }, // 뒷모서리(+x/-z) 처마 — 앞은 텃밭 마당(v1.6 조합 감사: 물통이 텃밭 안에 서던 것 이전)
    wall: { face: '+x', y: 2.4, len: 4.4, off: 2.9 }, // 마당 쪽 외벽 (단열재 등 폴백)
    groundY: 0,
  },
  cabin: { // 10×8×2.7 풀지붕(평평). 벽 off 0.11. 기단 위 오두막 — 지형 -1.3.
    roof: { y: 2.85, cx: 0, cz: 0, hw: 4.6, hd: 3.6, cullJoin: true },
    eave: { y: 2.7, x: 5.11, z: 4.11, dir: [1, 1] },
    groundY: -1.3, ground: { x: 6.5, z: 1.6, rot: Math.PI / 2 },
  },
  bus: { // 6.8×2.4×2.2 평지붕, 상단 띠 2.17. 벽 off 0.09. 차체 바닥 — 지형 -0.69.
    roof: { y: 2.2, cx: 0, cz: 0, hw: 3.1, hd: 1.1, cullJoin: true },
    eave: { y: 2.15, x: 3.49, z: 1.29, dir: [1, 1] },
    wall: { face: '+z', y: 2.1, len: 6.8, off: 1.29 },
    groundY: -0.69, ground: { x: 5.4, z: 0.8, rot: Math.PI / 2 },
  },
  subway: { // 지하 — 지붕/처마 무의미. 뒷벽(-z)에 지면 배치. eave.y=0 → 물통만(천장 누수 받이).
    eave: { y: 0, x: 4.6, z: -2.7, dir: [1, -1] },
    groundY: 0,
  },
  greenhouse: { // 9×6×2.4 유리 프레임 상단 y2.4. 벽 off 0.08. 지형 -0.73.
    roof: { y: 2.44, cx: 0, cz: 0, hw: 4.1, hd: 2.6, cullJoin: true },
    eave: { y: 2.4, x: 4.58, z: 3.08, dir: [1, 1] },
    groundY: -0.73, ground: { x: 5.8, z: 2.0, rot: Math.PI / 2 },
  },
  ship: { // (v1.5 리워크) 갑판 위 간이집 5.6×3.4×2.35(-z/-x 구석, 슬레이트 상면 ~2.46). 텃밭은 갑판 위 화단(물 위 부양 금지).
    //   roof.y=2.46: 간이집 슬레이트 tagCeiling(2.43)에 cullJoin — 2층 데크 슬래브(y2.5)보다 가깝게 잡아
    //   attachToRoofCull이 간이집 지붕 그룹을 고르게 한다(컬링되는 지붕이라 cullJoin 적정 — 로지 역효과 사례와 반대).
    roof: { y: 2.46, cx: -1.7, cz: -1.8, hw: 2.6, hd: 1.5, cullJoin: true },
    eave: { y: 2.4, x: -4.68, z: 0.18, dir: [-1, 1] }, // 간이집 앞(-x/+z) 처마 모서리 — 홈통은 좌벽/앞벽 컬링에 편입
    groundY: 0, ground: { x: 3.4, z: 2.1, y: 0, rot: 0 },
  },
  lighthouse: { // 원통 — 방(등지기실)이 탑 정상: 바깥 지형은 암반 -8 허공. 텃밭=실내 화분. 자체 홈통 존재(raincatch not).
    roof: { y: 2.55, cx: 0, cz: -2.9, hw: 1.6, hd: 1.0 },
    groundY: 0, ground: { x: 2.1, z: -2.2, y: 0, rot: Math.PI / 2 },
  },
  // #79 ④: 아래 3셸터(예인선/관제탑/로지)는 앵커 미선언이라 태양광이 바닥 폴백으로 실내 부유했다 → 실측 지붕/처마 앵커 부여.
  tugboat: { // 6.4×4.2×2.2 개방 갑판 + 뒤쪽(-z) 조타실(상단 2.2, z≈-2.36). 수면 -2.7 — 텃밭/물통은 갑판 위.
    roof: { y: 2.3, cx: 0, cz: -1.6, hw: 2.2, hd: 0.9 },
    eave: { y: 2.1, x: 3.02, z: 2.0, dir: [1, 1] }, // #87: x3.4는 갑판(반폭 3.2) 밖 — 물통이 물에 뜨던 것 → 갑판 안쪽으로
    groundY: 0, ground: { x: 2.0, z: 1.3, y: 0, rot: 0 },
  },
  controltower: { // 6.6×6.6×2.6 유리 전망 평지붕(중앙 회전등 h+0.4). 방 밖은 좁은 발코니(-0.2), 그 너머 -16 허공.
    roof: { y: 2.62, cx: 0, cz: 1.7, hw: 2.6, hd: 1.2, cullJoin: true },
    eave: { y: 2.6, x: 3.38, z: 3.38, dir: [1, 1] },
    groundY: -0.2, ground: { x: 3.72, z: 0, rot: Math.PI / 2 },
  },
  lodge: { // 8.4×6.4×3 A자형 경사 지붕(용마루 h+0.7=3.7, +z면 기울기 atan2(1.4,3.5)≈0.38). 지형 -0.88 (온천도 이 값).
    roof: { y: 3.15, cx: 0, cz: 1.55, hw: 2.6, hd: 1.1, pitch: 0.38 },
    eave: { y: 3.0, x: 4.31, z: 3.31, dir: [1, 1] },
    groundY: -0.88, ground: { x: 5.5, z: 1.7, rot: Math.PI / 2 },
  },
  customs: { // 2.0 동부: 7.6×6.2×2.7 평지붕 콘크리트 청사. 마당 아스팔트 -0.55 (§6.0.5 기초 모델링)
    roof: { y: 2.72, cx: 0, cz: 0, hw: 3.6, hd: 2.9, cullJoin: true }, // #209: 지붕 슬래브 신설(buildRoom) 동반 — 부감 시 패널 함께 페이드
    eave: { y: 2.6, x: 3.91, z: 2.6, dir: [1, 1] },
    groundY: -0.55, ground: { x: 2.8, z: 2.4, rot: 0 },
  },
  bridgehouse: { // 2.0 동부: 6.8×5.6×2.6 석조 평지붕. 협곡 절벽 위 마당 -0.6 (§6.0.5 기초 모델링)
    roof: { y: 2.62, cx: 0, cz: 0, hw: 3.2, hd: 2.6, cullJoin: true }, // #209: 석조 지붕 슬래브 신설(buildRoom) 동반
    eave: { y: 2.5, x: 3.51, z: 2.3, dir: [1, 1] },
    groundY: -0.6, ground: { x: 2.4, z: 2.0, rot: 0 },
  },
  terminal: { // 2.0 동부: 11×7×3.4 대합실 홀 — 배럴 볼트 천장(크라운 4.7). 역전 광장 -0.5 (§6.0.5 기초 모델링)
    // #209: 평지붕 공식 y=h+0.02=3.42는 볼트가 솟는 홀 내부라 태양광이 홀 한가운데 갇혀 떴다.
    //   앵커를 크라운(4.7) 위 4.72로 올린다(볼트가 이미 지붕 — 슬래브 신설 불요). cullJoin=볼트 tagCeiling(4.5)과 동반 페이드.
    roof: { y: 4.72, cx: 0, cz: 0, hw: 2.6, hd: 3.3, cullJoin: true },
    eave: { y: 3.3, x: 5.61, z: 3.0, dir: [1, 1] },
    groundY: -0.5, ground: { x: 3.4, z: 2.6, rot: 0 },
  },
  penthouse: { // 2.0 동부: 11×7.5×2.9 최상층 + 발코니(-z 데크). 확대 리워크 (§6.0.5)
    roof: { y: 2.92, cx: 0, cz: 0, hw: 5.2, hd: 3.6, cullJoin: true }, // #209 F30: 리브 위 옥상 슬래브(buildRoom) 신설 동반 — cullJoin=부감 시 패널이 지붕과 함께 페이드
    eave: { y: 2.8, x: 5.61, z: 3.86, dir: [1, 1] },
    groundY: -0.3, ground: { x: 3.4, z: 2.8, rot: 0 },
  },
};
function modAvailable(id, shelterId) {
  const m = SHELTER_MODS[id];
  if (m.only && !m.only.includes(shelterId)) return false;
  if (m.not && m.not.includes(shelterId)) return false;
  // 2단계 개조: 선행 개조(req)가 설치돼 있어야 목록에 노출
  if (m.req && !(state.mods?.[shelterId] || []).includes(m.req)) return false;
  // 플래그 게이트(디렉터): 예) 무전 기지 = 개척 프로젝트 완공(radioBaseDone) 후에만 개조 노출·설치.
  if (m.gate && !state[m.gate]) return false;
  return true;
}
// hasMod는 core/shelter.js로 이전 (분해 Phase 1). import 참조.
// 설치된 개조의 시각 소품 (roomGroup에 부착 — 셸터 로드 시 재생성)
// ── 앵커 부착 소품 빌더 (#51) ──
// 태양광: 지붕면 위 경사 브래킷 프레임 + 패널. roof 앵커의 pitch가 있으면 지붕 각도에 밀착.
function buildSolarProp(roof) {
  const g = new THREE.Group();
  const tilt = -0.42; // 패널 경사 ~24°
  const legF = 0.12, legB = 0.5; // 앞다리 짧게/뒷다리 길게 → 경사 거치대
  const pw = Math.min(1.6, roof.hw * 0.9), pd = Math.min(1.1, roof.hd * 1.1);
  // 브래킷 다리 4개
  for (const sx of [-1, 1]) {
    Cyl(g, 0.035, 0.045, legF, 0x55504a, sx * pw * 0.42, legF / 2, pd * 0.5, 5);
    Cyl(g, 0.035, 0.045, legB, 0x55504a, sx * pw * 0.42, legB / 2, -pd * 0.5, 5);
  }
  // 경사 레일 2개
  for (const sx of [-1, 1]) {
    const rail = B(g, 0.05, 0.05, pd + 0.1, 0x6a655c, sx * pw * 0.42, (legF + legB) / 2 + 0.02, 0);
    rail.rotation.x = tilt;
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.08, 0.04, pd + 0.08), lamb(0x8a8f96));
  frame.position.set(0, (legF + legB) / 2 + 0.08, 0); frame.rotation.x = tilt; g.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.05, pd), lamb(0x1d2b45));
  panel.position.set(0, (legF + legB) / 2 + 0.11, 0); panel.rotation.x = tilt;
  panel.castShadow = true; g.add(panel);
  // 셀 격자 (읽히는 디테일)
  for (let i = 1; i < 3; i++) B(g, pw, 0.055, 0.015, 0x2f4468, 0, (legF + legB) / 2 + 0.115, -pd / 2 + i * pd / 3).rotation.x = tilt;
  g.position.set(roof.cx, roof.y, roof.cz);
  if (roof.pitch) g.rotation.x = roof.pitch;
  roomGroup.add(g);
  // #87: 지붕이 부감 컬링으로 사라지는 셸터(cullJoin)만 지붕과 함께 페이드 — 패널이 실내 위 허공에 남지 않게.
  //   외피가 항상 보이는 셸터(로지 A자/벙커 돔/보트 조타실)는 편입하면 패널만 사라지는 역효과(로지 실측) — 제외.
  if (roof.cullJoin) attachToRoofCull(roof.y, g);
  return g;
}
// 빗물받이: 처마 홈통(가는 박스) + 모서리 세로 파이프 + 지면 물통. big이면 홈통 2변 + 큰 물통.
//   #87: 홈통/파이프는 붙은 벽의 컬링 단위에 편입(벽이 숨으면 골조가 허공에 남지 않게), 물통은 지면(groundY) 잔류.
//   eave.y가 낮으면(지하철 승강장) 홈통/파이프 생략 — 천장 누수 받이 물통만.
function buildRainProp(eave, big, gy = 0) {
  const g = new THREE.Group();
  const [dx, dz] = eave.dir;
  const gutMat = 0x6a7076;
  if (eave.y >= 0.5) {
    const gWall = new THREE.Group(); // 벽 컬링 편입분: 홈통 A + 세로 파이프
    const gutLen = big ? 3.4 : 2.2;
    const gutA = B(gWall, 0.12, 0.1, gutLen, gutMat, eave.x, eave.y - 0.05, eave.z - dz * gutLen / 2);
    gutA.castShadow = true;
    // 세로 파이프: 처마 모서리 → 지형(groundY)
    Cyl(gWall, 0.055, 0.055, eave.y - gy, gutMat, eave.x, (eave.y + gy) / 2, eave.z, 6);
    roomGroup.add(gWall);
    attachToWall(Math.sign(eave.x) || 1, 0, 0, gWall);
    if (big) {
      const gWall2 = new THREE.Group(); // 홈통 B는 직교 벽을 따라 — 그 벽의 컬링 단위로
      const gutB = B(gWall2, gutLen, 0.1, 0.12, gutMat, eave.x - dx * gutLen / 2, eave.y - 0.05, eave.z);
      gutB.castShadow = true;
      roomGroup.add(gWall2);
      attachToWall(0, 0, Math.sign(eave.z) || 1, gWall2);
    }
  }
  // 물통 (기본: 모서리 바로 아래. eave.barrel 오버라이드가 있으면 그 자리 — 디렉터 2026-07-08:
  //   컨테이너는 토대 블록과 겹쳐 화단 오른쪽으로 이설. 파이프 하단에서 물통까지 지면 배관으로 잇는다)
  const bx = eave.barrel ? eave.barrel.x : eave.x, bz = eave.barrel ? eave.barrel.z : eave.z;
  const br = big ? 0.44 : 0.32, bh = big ? 0.95 : 0.66;
  const barrel = Cyl(g, br, br * 0.9, bh, big ? 0x4a6a5c : 0x5a7a8c, bx, gy + bh / 2, bz, 12);
  barrel.castShadow = true;
  B(g, br * 1.5, 0.04, br * 1.5, 0x3a4a55, bx, gy + bh + 0.02, bz);
  if (eave.barrel) {
    // 지면 배관: 코너 파이프 발치 → 물통. 수평 원통 1개(복셀 문법 — 눕힌 실린더)
    const plen = Math.hypot(bx - eave.x, bz - eave.z);
    const pipe = Cyl(g, 0.045, 0.045, plen, gutMat, (eave.x + bx) / 2, gy + 0.06, (eave.z + bz) / 2, 6);
    pipe.rotation.z = Math.PI / 2;
    pipe.rotation.y = -Math.atan2(bz - eave.z, bx - eave.x);
  }
  roomGroup.add(g);
  return g;
}
// 단열재: 외벽면에 덧댄 패널 3~4장 (벽보다 밝은 회백, 두께감 +0.06, 이음 라인). plus면 모서리 금속 몰딩.
function buildInsulationProp(wall, plus) {
  const g = new THREE.Group();
  const n = 4, gap = 0.03, pw = (wall.len - gap * (n + 1)) / n;
  // #79 ①: 벽 두께(반두께 ~0.11) 바깥으로 완전히 빼서 z-fight 번쩍임 제거.
  //   wall.off는 벽 바깥면까지 거리 — 여기에 벽 절반두께+패널 절반두께+여유를 더해 패널이 벽면에 겹치지 않게 한다.
  const off = wall.off + 0.17;
  const panels = [];
  for (let i = 0; i < n; i++) {
    const lx = -wall.len / 2 + gap + pw / 2 + i * (pw + gap);
    panels.push({ lx, w: pw });
  }
  const ph = wall.y - 0.1;
  const baseCol = plus ? 0xc4c5bb : 0xb2b0a4;
  panels.forEach(({ lx, w: pwi }, i) => {
    // 패널마다 미세하게 다른 명도 → 낱장 덧댐이 읽힌다
    const shadeMul = 1 - (i % 2) * 0.08;
    const p = new THREE.Mesh(new THREE.BoxGeometry(pwi, ph, 0.06), wallPhong({ color: shade(baseCol, shadeMul) }));
    p.position.set(lx, ph / 2 + 0.05, 0); p.castShadow = p.receiveShadow = true; g.add(p);
    // 이음 홈 (패널 좌측 어두운 세로선) — base/plus 공통
    B(g, 0.035, ph, 0.075, plus ? 0x8a8a80 : 0x76746a, lx - pwi / 2 - gap / 2, ph / 2 + 0.05, 0);
  });
  // 하단 마감 레일 (벽 바깥으로 덧댄 두께감)
  B(g, wall.len, 0.09, 0.08, shade(baseCol, 0.82), 0, 0.09, 0.01);
  if (plus) {
    // 모서리 금속 몰딩 (좌우 세로 + 상단 가로)
    B(g, 0.09, wall.y, 0.09, 0x9a9e9a, -wall.len / 2, wall.y / 2, 0.02);
    B(g, 0.09, wall.y, 0.09, 0x9a9e9a, wall.len / 2, wall.y / 2, 0.02);
    B(g, wall.len, 0.09, 0.09, 0x9a9e9a, 0, wall.y, 0.02);
  }
  // face별 위치/회전
  const rot = { '-z': 0, '+z': Math.PI, '-x': Math.PI / 2, '+x': -Math.PI / 2 };
  const pos = { '-z': [0, 0, -off], '+z': [0, 0, off], '-x': [-off, 0, 0], '+x': [off, 0, 0] };
  g.rotation.y = rot[wall.face] ?? 0;
  g.position.set(...(pos[wall.face] ?? [0, 0, off]));
  roomGroup.add(g);
  // #79 ①: 단열재는 외벽을 덮는 물건 — 해당 벽의 컬링/페이드 단위에 편입한다(벽이 숨으면 함께 숨어 실내 노출).
  //   attachToWall이 월드 변환을 보존하며 재부모화하므로 위 position/rotation 유지. face→벽 바깥 법선 매핑.
  const nrm = { '-z': [0, 0, -1], '+z': [0, 0, 1], '-x': [-1, 0, 0], '+x': [1, 0, 0] }[wall.face] || [0, 0, 1];
  attachToWall(nrm[0], nrm[1], nrm[2], g);
  return g;
}
// #98(디렉터: "증축하면 화단·빗물받이랑 겹친다 — 다른 셸터 포함"): SHELTER_MOUNTS 앵커는 '원본 외벽'
//   실측치인데 증축(w+2)이면 ±x 외벽이 1씩 밀려난다 — 원본 반폭 근처(-0.6)부터 바깥의 x 앵커를
//   같은 쪽으로 1 밀어 벽·부착물 관계를 보존한다. 데이터 무수정(소비 시점 보정), 전 셸터 공통.
//   z 앵커는 d 불변이라 그대로. 지붕 배치 박스(hw)는 지붕이 같이 넓어지므로 +1.
function extMounts(shelterId) {
  const m = SHELTER_MOUNTS[shelterId] || {};
  if (!(state.mods?.[shelterId] || []).includes('extension')) return m;
  const half = SHELTERS[shelterId].room.w / 2;
  const shiftX = x => (typeof x === 'number' && Math.abs(x) >= half - 0.6) ? x + Math.sign(x) : x;
  const out = { ...m };
  if (m.eave) out.eave = { ...m.eave, x: shiftX(m.eave.x), ...(m.eave.barrel ? { barrel: { ...m.eave.barrel, x: shiftX(m.eave.barrel.x) } } : {}) };
  if (m.ground) out.ground = { ...m.ground, x: shiftX(m.ground.x) };
  if (m.roof) out.roof = { ...m.roof, hw: m.roof.hw + 1 };
  if (m.wall && (m.wall.face === '+x' || m.wall.face === '-x')) out.wall = { ...m.wall, off: m.wall.off + 1 };
  return out;
}
// 무전 기지 개조 소품 (디렉터): 지붕 위 송신 안테나 마스트 + 접시 + 십자 안테나 + 붉은 항공등(selfLit 깜빡).
//   roof 앵커(solar와 동일 규약)를 받아 지붕면에 세운다. 폴백은 상단 모서리.
function buildRadioStationProp(roof) {
  const g = new THREE.Group();
  const cx = roof.cx ?? 0, cz = roof.cz ?? 0, ry = roof.y ?? ROOM.h;
  // 삼각대 베이스
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const leg = B(g, 0.05, 0.55, 0.05, 0x5c6169, Math.cos(a) * 0.28, 0.26, Math.sin(a) * 0.28); leg.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); leg.castShadow = true; }
  // 마스트
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.7, 6), lamb(0x8a8f96)); mast.position.y = 1.35; mast.castShadow = true; g.add(mast);
  // 접시 안테나(경사)
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 16), lamb(0xd8dce0)); dish.rotation.set(0, 0.5, 0.62); dish.position.set(0.28, 1.15, 0.05); dish.castShadow = true; g.add(dish);
  const feed = B(g, 0.03, 0.25, 0.03, 0x6a6f76, 0.42, 1.24, 0.05); feed.rotation.z = 0.62;
  // 상단 십자 안테나(다이폴)
  B(g, 0.035, 0.55, 0.035, 0x6a6f76, 0, 2.35, 0);
  B(g, 0.5, 0.03, 0.03, 0x7a7f86, 0, 2.5, 0);
  B(g, 0.36, 0.03, 0.03, 0x7a7f86, 0, 2.28, 0);
  // 붉은 항공 경고등 (selfLit — 밤에 깜빡, 무전 기지 완공의 상징)
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 6), new THREE.MeshBasicMaterial({ color: 0xff3524 }));
  led.position.set(0, 2.68, 0); led.userData.selfLit = true; led.userData.beacon = true; g.add(led);
  g.position.set(cx, ry, cz);
  roomGroup.add(g);
  return g;
}
function addModProp(id) {
  const { w, d } = ROOM;
  const mounts = extMounts(state.current);
  if (id === 'solar') {
    if (mounts.roof) return buildSolarProp(mounts.roof);
    // 폴백: 벽에 최대한 밀착한 지면 경사 거치
    return buildSolarProp({ y: 0, cx: w / 2 - 0.5, cz: 0, hw: 1.6, hd: 1.0 });
  }
  if (id === 'radiostation') {
    if (mounts.roof) return buildRadioStationProp(mounts.roof);
    return buildRadioStationProp({ y: ROOM.h, cx: w / 2 - 0.7, cz: -0.3, hw: 1.2, hd: 1.0 }); // 폴백: 지붕 없으면 상단 모서리
  }
  if (id === 'raincatch' || id === 'bigraincatch') {
    const big = id === 'bigraincatch';
    const gy = mounts.groundY ?? 0; // #87: 물통/파이프 발밑 = 실측 지형
    if (mounts.eave) return buildRainProp(mounts.eave, big, gy);
    return buildRainProp({ y: ROOM.h * 0.9, x: w / 2 + 0.4, z: d / 2 + 0.4, dir: [1, 1] }, big, gy);
  }
  if (id === 'insulation' || id === 'insulationPlus') {
    const plus = id === 'insulationPlus';
    if (mounts.wall) return buildInsulationProp(mounts.wall, plus);
    return buildInsulationProp({ face: '+z', y: ROOM.h, len: w, off: d / 2 + 0.12 }, plus);
  }
  if (id === 'garden') {
    const g = new THREE.Group();
    B(g, 1.8, 0.3, 0.7, 0x6a4f33, 0, 0.15, 0);
    B(g, 1.7, 0.08, 0.6, 0x3a2f22, 0, 0.32, 0);
    const rand = seededRand(17);
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08 + rand() * 0.06, 0), lamb(0x5f8a52));
      sp.position.set(-0.7 + i * 0.35, 0.42, (rand() - 0.5) * 0.3);
      sp.castShadow = true;
      g.add(sp);
    }
    // #87: 셸터별 ground 앵커 — 지형 높이(오두막 기단 등) + 벽 평행 회전. 보트=갑판 위, 등대=실내 화분.
    const ga = mounts.ground;
    if (ga && ga.rot) g.rotation.y = ga.rot;
    g.position.set(ga ? ga.x : w / 2 + 1.1, ga ? (ga.y ?? mounts.groundY ?? 0) : (mounts.groundY ?? 0), ga ? ga.z : -d / 2 + 1.2);
    roomGroup.add(g);
  } else if (id === 'rooftopGarden') {
    buildRooftopGarden();
  } else if (id === 'mushroom') {
    buildMushroomBed();
  } else if (id === 'onsen') {
    // 1.3 온천 — 로지 옆마당(방 밖 +x)에 돌 노천탕 + 절차 김 파티클. 고양이/개가 옆에서 조는 전용 포즈(폴백: 소품만).
    const g = new THREE.Group();
    const pr = seededRand(1333);
    // 돌 테두리(원형) + 물
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      B(g, 0.34, 0.28, 0.34, [0x6a655c, 0x5a544a, 0x746e64][Math.floor(pr() * 3)], Math.cos(a) * 1.1, 0.14, Math.sin(a) * 0.8).rotation.y = a;
    }
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.12, 20), new THREE.MeshLambertMaterial({ color: 0x2f5f6a, emissive: 0x123037, emissiveIntensity: 0.4 }));
    water.scale.z = 0.75; water.position.y = 0.18; g.add(water);
    // 김(steam) — 반투명 흰 구 몇 개(절차 폴백, 아트 파티클 대체)
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.16 + pr() * 0.1, 6, 5), new THREE.MeshLambertMaterial({ color: 0xeef4f6, transparent: true, opacity: 0.28 }));
      s.position.set((pr() - 0.5) * 1.4, 0.5 + pr() * 0.7, (pr() - 0.5) * 1.0); g.add(s);
    }
    // #87 스윕(디렉터 "온천이면 따로 있어야지"): 벽에 붙던 것을 한 발 이격 + 징검돌 3장으로 '따로 있는 노천탕'.
    const oy = mounts.groundY ?? 0;
    g.position.set(w / 2 + 2.3, oy, -d / 2 + 1.9);
    roomGroup.add(g);
    for (let i = 0; i < 3; i++) {
      const st = B(roomGroup, 0.42, 0.09, 0.34, [0x6a655c, 0x746e64, 0x5a544a][i],
        w / 2 + 0.55 + i * 0.55, oy + 0.045, -d / 2 + 1.55 + i * 0.12);
      st.rotation.y = (i - 1) * 0.22; st.receiveShadow = true;
    }
  } else if (id === 'shelf') {
    B(roomGroup, 0.06, 1.4, ROOM.d * 0.7, 0x77543a, -w / 2 + 0.12, 0.7, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.1, 0);
    B(roomGroup, 0.4, 0.05, ROOM.d * 0.7, 0x8a6a48, -w / 2 + 0.28, 1.7, 0);
  }
  // roof(지붕 보강)/extension: 시각 소품 없음 (구조 변경 개조)
}
// ── 옥탑 슬레이트 지붕 (#53) — 방 위에 슬레이트 몇 장. state.rooftopSlate==='full'이면 빈틈 없이,
//    'gapped'(기본)이면 2장 빠져 하늘이 보인다. buildRoom에서 호출, 제작 보수 시 loadShelter로 재빌드.
//    (v1.5) opts 파라미터화 — 페리 간이집이 재사용: { cx, cz }=지붕 중심 오프셋(기본 원점),
//    full=보수 상태 오버라이드(페리는 true 고정 — rooftopSlate 보수 루프는 옥탑 전용이므로 상태 비연동). ──
function buildRooftopSlate(w, d, h, opts = {}) {
  const full = opts.full ?? ((state.rooftopSlate || 'gapped') === 'full');
  const g = new THREE.Group();
  // 지붕판 베이스 (살짝 뒤로 경사진 얇은 슬래브)
  const eaveOver = 0.28;
  const rw = w + eaveOver * 2, rd = d + eaveOver * 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.06, rd), wallPhong({ color: 0x3a3a3c }));
  base.position.y = h + 0.06; base.receiveShadow = true; base.castShadow = true; g.add(base);
  // 슬레이트 타일 격자 (앞뒤로 겹쳐 이는 판) — 빠진 2장은 건너뛴다
  const cols = 6, rows = 4;
  const tw = rw / cols, td = rd / rows;
  const missing = full ? new Set() : new Set(['1,1', '4,2']); // (col,row) 두 장 빠짐
  const slateCols = [0x4a4e52, 0x53565a, 0x44484c, 0x4e5256];
  const pr = seededRand(153);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (missing.has(`${c},${r}`)) continue;
      const col = slateCols[Math.floor(pr() * slateCols.length)];
      const tile = new THREE.Mesh(new THREE.BoxGeometry(tw * 0.98, 0.05, td * 0.62), wallPhong({ color: col }));
      const tx = -rw / 2 + tw * (c + 0.5);
      const tz = -rd / 2 + td * (r + 0.5);
      tile.position.set(tx, h + 0.11 + r * 0.012, tz - td * 0.16); // 앞줄이 뒷줄을 덮도록 살짝 겹침
      tile.rotation.x = 0.05; tile.castShadow = true; g.add(tile);
    }
  }
  if (!full) {
    // 빠진 자리 아래로 방 바닥이 보이도록 어두운 구멍 테두리 (빗물 새는 느낌)
    for (const key of missing) {
      const [c, r] = key.split(',').map(Number);
      const tx = -rw / 2 + tw * (c + 0.5), tz = -rd / 2 + td * (r + 0.5) - td * 0.16;
      B(g, tw * 0.9, 0.02, td * 0.5, 0x1a1c1e, tx, h + 0.02, tz);
    }
  } else {
    // 완전 보수: 용마루 마감 각목 한 줄
    B(g, rw, 0.05, 0.08, 0x5a5450, 0, h + 0.15, 0);
  }
  // ⑥-a: 슬레이트 지붕은 실내를 덮는다 — 공통 천장 컬링에 등록(부감에서 숨김). 보수 전/후 모두 g 하나에 담김.
  g.position.set(opts.cx || 0, 0, opts.cz || 0); // (v1.5) 지붕 중심 오프셋 (y는 0 — tagCeiling 높이 판정 불변)
  tagCeiling(g, h + 0.08);
  roomGroup.add(g);
}
// ── 옥상 텃밭 (#53) — 마당(방 밖 슬래브)에 플랜터 박스 2열. 작물 성장 3단계 지오메트리.
//    stage: 0=새싹 1=줄기 2=결실. 겨울이면 휴면(갈색). state.rooftopGardenStage로 결정. ──
function buildRooftopGarden() {
  const S = SHELTERS.rooftop._slab;
  const winter = seasonOf().id === 'winter';
  const stage = winter ? -1 : Math.max(0, Math.min(2, state.rooftopGardenStage ?? 0));
  const g = new THREE.Group();
  const pr = seededRand(207);
  // 플랜터 박스 2열 × 각 4포기
  const planter = (pz) => {
    B(g, 3.0, 0.32, 0.72, 0x6a4f33, 0, 0.16, pz);            // 나무 박스
    B(g, 2.9, 0.1, 0.64, winter ? 0x4a4038 : 0x3a2f22, 0, 0.36, pz); // 흙 (겨울엔 마른 톤)
    for (let i = 0; i < 4; i++) {
      const cx = -1.15 + i * 0.77;
      if (winter) {
        // 휴면: 갈색 마른 줄기
        const st = Cyl(g, 0.02, 0.03, 0.22, 0x6b5636, cx, 0.5, pz + (pr() - 0.5) * 0.2, 4); st.castShadow = true;
      } else if (stage === 0) {
        // 새싹
        const sp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + pr() * 0.04, 0), lamb(0x74a35a));
        sp.position.set(cx, 0.45, pz + (pr() - 0.5) * 0.2); sp.castShadow = true; g.add(sp);
      } else if (stage === 1) {
        // 줄기 (기른 대 + 잎)
        const st = Cyl(g, 0.025, 0.03, 0.42, 0x5f8a4a, cx, 0.6, pz + (pr() - 0.5) * 0.18, 5); st.castShadow = true;
        for (const sy of [0.55, 0.72]) {
          const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), lamb(0x6f9a5a));
          lf.scale.set(1.3, 0.5, 0.8); lf.position.set(cx + (pr() - 0.5) * 0.12, sy, pz); lf.castShadow = true; g.add(lf);
        }
      } else {
        // 결실 (줄기 + 열매)
        const st = Cyl(g, 0.03, 0.035, 0.5, 0x568044, cx, 0.64, pz + (pr() - 0.5) * 0.16, 5); st.castShadow = true;
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), lamb(0x5f8a52));
        bush.position.set(cx, 0.82, pz); bush.castShadow = true; g.add(bush);
        for (let k = 0; k < 3; k++) {
          const fr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), lamb([0xc84a3a, 0xd8843a, 0xc84a3a][k % 3]));
          fr.position.set(cx + (pr() - 0.5) * 0.24, 0.78 + pr() * 0.1, pz + (pr() - 0.5) * 0.24); g.add(fr);
        }
      }
    }
  };
  planter(-0.5); planter(0.6);
  // 마당(+x/+z) 안쪽, 실외기/급수탑을 피해 배치
  g.position.set(S.frontX - 3.2, 0, S.frontZ - 3.0);
  roomGroup.add(g);
  blockers.push({ x: S.frontX - 3.2, z: S.frontZ - 3.0, w: 3.2, d: 2.0 });
}
// ── 1.2 버섯 재배칸 (subway 전용) — 승강장 뒷벽 쪽에 균상 선반 2단. 어둠 속에서 자라는 하얀 균사/갓.
//    옥탑 텃밭의 대칭 연출: 볕/흙 대신 어둠/습기. 계절 무관(연중) — 시각도 계절을 타지 않는다. ──
function buildMushroomBed() {
  const { w, d } = ROOM;
  const g = new THREE.Group();
  const pr = seededRand(361);
  // 습한 나무 균상 프레임 (2단 선반)
  const frame = wallPhong({ color: 0x4a3f34 });
  for (const sy of [0.28, 0.72]) {
    B(g, 2.2, 0.06, 0.7, 0x574a3c, 0, sy, 0);           // 선반판
    // 균상 배지(어두운 퇴비)
    B(g, 2.05, 0.08, 0.6, 0x2a231c, 0, sy + 0.07, 0);
    // 버섯 갓 (연한 회백색 반구 + 짧은 대) — 랜덤 군생
    const n = 7;
    for (let i = 0; i < n; i++) {
      const cx = -0.9 + (i / (n - 1)) * 1.8 + (pr() - 0.5) * 0.15;
      const cz = (pr() - 0.5) * 0.42;
      const h = 0.06 + pr() * 0.05;
      Cyl(g, 0.018, 0.022, h, 0xd8cfc0, cx, sy + 0.11 + h / 2, cz, 5); // 대
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045 + pr() * 0.03, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xc7bca8, emissive: 0x1a1410, emissiveIntensity: 0.4 }));
      cap.position.set(cx, sy + 0.11 + h, cz); cap.castShadow = true; g.add(cap);
    }
  }
  // 선반 기둥 4개
  for (const px of [-1.05, 1.05]) for (const pz of [-0.3, 0.3]) B(g, 0.06, 0.9, 0.06, 0x3d332a, px, 0.45, pz);
  // 뒷벽(-z) 왼쪽, 기둥(±w/4, z=0.4)을 피해 배치
  g.position.set(-w / 4 - 1.4, 0, -d / 2 + 0.6);
  roomGroup.add(g);
  blockers.push({ x: -w / 4 - 1.4, z: -d / 2 + 0.6, w: 2.3, d: 0.9 });
}
// ── 1.2 선로 복구 현장 (site='railSegment') — 지하철 buildEnv에서 호출. 승강장 앞 선로 위에 표현.
//    허브 미승격이면 없음. 승격 후: 구간별 진행(잔해→침목→개통)을 왼쪽부터 3구간으로 나눠 표시.
//    개통 완료 구간엔 반짝이는 새 레일 + 완공 1구간 이상이면 수동 궤도차(핸드카) 실루엣이 놓인다. ──
function buildRailSegments(w, d, h) {
  if (!state.subwayHub) return;
  const g = new THREE.Group();
  const railZ = d / 2 + 2.1;          // 선로 중앙 z (기존 트랙 위)
  const segIds = ['subRail1', 'subRail2', 'subRail3'];
  const segW = (w + 12) / 3;          // 세 구간이 트랙 전폭을 나눠 가짐
  const startX = -(w + 12) / 2;
  let anyDone = false;
  for (let s = 0; s < 3; s++) {
    const st = projectSiteStage(segIds[s]); // 0 미착수 · 1 잔해제거 · 2 침목 · 3 개통중 · 4 완공
    const cx = startX + segW * (s + 0.5);
    if (st <= 0) continue;
    if (st >= 1) {
      // 잔해 치운 노반 — 밝아진 자갈
      B(g, segW * 0.92, 0.06, 2.6, 0x2b2822, cx, -0.9, railZ);
    }
    if (st >= 2) {
      // 새 침목 (밝은 목재) — 여러 개
      const nTies = 5;
      for (let i = 0; i < nTies; i++) {
        const tx = cx - segW * 0.4 + (i / (nTies - 1)) * segW * 0.8;
        B(g, 0.4, 0.1, 2.0, 0x6a5638, tx, -0.8, railZ);
      }
    }
    if (st >= 3) {
      // 레일 체결(개통 진행/완료) — 반짝이는 금속 레일 2줄
      const railMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a6, emissive: 0x2a2e33, emissiveIntensity: 0.5 });
      for (const rz of [railZ - 0.7, railZ + 0.7]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(segW * 0.9, 0.08, 0.08), railMat);
        rail.position.set(cx, -0.7, rz); g.add(rail);
      }
    }
    if (st >= 4) anyDone = true;
  }
  if (anyDone) {
    // 수동 궤도차(핸드카) — 완공 구간이 하나라도 있으면 승강장 앞 레일 위에 놓인다.
    const car = new THREE.Group();
    B(car, 1.6, 0.25, 1.5, 0x3a3630, 0, 0.2, 0);                 // 대차 프레임
    for (const wx of [-0.6, 0.6]) for (const wz of [-0.6, 0.6]) Cyl(car, 0.18, 0.18, 0.1, 0x22242a, wx, 0.06, wz, 8, Math.PI / 2);
    B(car, 0.08, 0.5, 0.08, 0x55504a, 0, 0.5, 0);               // 펌프 손잡이 기둥
    B(car, 0.9, 0.06, 0.08, 0x6a6258, 0, 0.72, 0);              // 손잡이 바
    car.position.set(-w / 2 - 2, -0.62, d / 2 + 2.1);
    g.add(car);
  }
  envRoot.add(g);
}
// v1.6 조합 감사 검거: 상위 티어(req 증설형)는 하위를 보유한 채 설치된다 — 소품까지 둘 다 그리면
//   같은 앵커에 물통 2개/단열재 2겹이 중첩(전 셸터, 실플레이 도달). 시각은 상위가 자리를 대체한다.
const MOD_SUPERSEDE = { raincatch: 'bigraincatch', insulation: 'insulationPlus' };
function buildModProps() {
  for (const id of (state.mods?.[state.current] || [])) {
    if (MOD_SUPERSEDE[id] && (state.mods?.[state.current] || []).includes(MOD_SUPERSEDE[id])) continue; // 상위 티어가 대체
    // #87 스윕(디렉터 신고: 옥탑에 온천): 세이브에 뭐가 들어있든 이 셸터에서 불가능한 개조(only/not)는
    //   그리지 않는다 — QA 만렙 세이브·구세이브 오염 방어. 효과 계산이 아니라 시각 소품만 게이트(안전).
    if (SHELTER_MODS[id] && !modAvailable(id, state.current)) continue;
    // QA/컬링 추적용: 소품 루트 그룹에 modProp 태그를 붙인다(게임 로직/렌더 무영향 — userData 태그일 뿐).
    //   단열재처럼 벽 그룹으로 재부모화되는 소품은 반환값으로 식별, 나머지는 roomGroup 신규 자식을 스캔.
    const before = roomGroup.children.length;
    const ret = addModProp(id);
    if (ret && ret.isObject3D) { if (ret.userData.modProp == null) ret.userData.modProp = id; }
    for (let i = before; i < roomGroup.children.length; i++) {
      if (roomGroup.children[i].userData.modProp == null) roomGroup.children[i].userData.modProp = id;
    }
  }
}

/* ── 꾸미기(#13): 벽지/바닥재 적용 ──
   loadShelter가 buildRoom() 직후 호출. 셸터 지오메트리는 불변 — 재질의 .map만 교체한다.
   벽: stdWall에서 태깅한 isWallMat 재질(공유). 바닥: roomGroup 안의 넓고 얇은 수평 박스 메시.
   id가 'default'/미설정이면 셸터 원본 baseMap으로 복원(무변화). */
function currentDeco() { return state.deco?.[state.current] || {}; }
// 벽지/바닥재 선택: 유료 항목은 최초 적용 시 자원 소비(같은 셸터에 이미 산 것으로 되돌리면 무료).
function applyDecoChoice(kind, id) {
  if (!state.deco) state.deco = {};
  if (!state.deco[state.current]) state.deco[state.current] = {};
  const slot = kind === 'wall' ? 'wall' : 'floor';
  // (B-①) 벽지 미대상 셸터(유리 벽 등)는 벽지 적용을 게임식 문구로 차단 — 자원 먹튀 원천 차단.
  if (slot === 'wall' && SHELTERS[state.current]?.noWallpaper) { toast(t('deco.noWall')); return; }
  const table = kind === 'wall' ? WALLPAPERS : FLOORINGS;
  const def = table[id];
  if (!def) return;
  const cur = state.deco[state.current];
  if (cur[slot] === id) return; // 이미 적용됨
  // 이 셸터에서 이미 구매한 이력(_bought)이면 재적용 무료
  if (!cur._bought) cur._bought = {};
  const boughtKey = kind + ':' + id;
  if (id !== 'default' && def.cost && !cur._bought[boughtKey]) {
    if (!resConsumeAll(def.cost)) { toast(t('toast.needMaterial')); return; }
    cur._bought[boughtKey] = true;
    renderResBar();
  }
  cur[slot] = id;
  applyDeco();
  shadowDirty();
  playSfx('craft');
  scheduleSave();
  toast(t('deco.applied', { name: LName(def) }));
  openCraftModal(); // 모달 갱신
}
function applyDeco() {
  const d = currentDeco();
  // ── 벽지 ──
  const wallTex = decoTex('wall', d.wall);
  roomGroup.traverse(o => {
    const mat = o.material;
    if (mat && mat.userData && mat.userData.isWallMat) {
      if (!('baseWallColor' in mat.userData) && mat.color) mat.userData.baseWallColor = mat.color.getHex();
      const target = (d.wall && d.wall !== 'default') ? wallTex : (mat.userData.baseMap || null);
      if (mat.map !== target) {
        mat.map = target; mat.needsUpdate = true;
        // (B-①) 색상만 있던 벽(버스 등)에 벽지 map을 씌우면 색 곱연산으로 물든다 → 흰색으로. 되돌리면 원색 복원.
        if (target && mat.color) mat.color.setHex(0xffffff);
        else if (!target && mat.userData.baseWallColor != null && mat.color) mat.color.setHex(mat.userData.baseWallColor);
      }
    }
  });
  // ── 바닥재 ── (B-①) 명시 태그(userData.isDecoFloor) 우선. 태그된 바닥이 하나도 없으면 기존 휴리스틱
  //   (넓고 ≥ROOM폭*0.8, 얇은 ≤0.4, 지면 근처 수평 박스)으로 폴백 — 좁은 바닥(버스 등)이 조용히 탈락하지 않게.
  const floorTex = decoTex('floor', d.floor);
  let tagged = [];
  roomGroup.traverse(o => { if (o.isMesh && o.userData.isDecoFloor) tagged.push(o); });
  const targets = tagged.length ? tagged : (() => {
    const out = [];
    roomGroup.traverse(o => {
      if (!o.isMesh || !o.geometry?.parameters) return;
      const p = o.geometry.parameters;
      if (p.width == null || p.height == null || p.depth == null) return;
      if (p.height <= 0.4 && p.width >= ROOM.w * 0.8 && p.depth >= ROOM.d * 0.8 && o.position.y <= 0.2) out.push(o);
    });
    return out;
  })();
  for (const o of targets) {
    const mat = o.material;
    if (!mat || !mat.userData) continue;
    if (!('baseFloorMap' in mat.userData)) mat.userData.baseFloorMap = mat.map || null;
    if (!('baseFloorColor' in mat.userData) && mat.color) mat.userData.baseFloorColor = mat.color.getHex();
    const target = (d.floor && d.floor !== 'default') ? floorTex : mat.userData.baseFloorMap;
    if (mat.map !== target) {
      mat.map = target; mat.needsUpdate = true;
      // 원본 바닥에 색상만 있고 map이 없던 경우, map을 씌우면 색 곱연산으로 어두워질 수 있어 흰색으로.
      if (target && mat.color) mat.color.setHex(0xffffff);
      else if (!target && mat.userData.baseFloorColor != null) mat.color.setHex(mat.userData.baseFloorColor);
    }
  }
}

// 가구는 파밍이 아니라 제작이 기본 (파밍은 극히 드문 행운)
// CRAFTS(제작 레시피)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1). BAL 참조는 items.js가 balance.js를 import.
// 「지식」 테크트리 모달(§9) — 4갈래×3티어, 책으로 해금. 노드 상태: 해금됨/해금가능/선행잠금/책부족.
let craftCat = 'goods'; // 디렉터: 제작 상위 카테고리 탭(가구·물품/복장/공사/꾸미기) 선택 상태
function openCraftModal() {
  if (paused) { toast(t('pause.blocked')); return; }
  const rowArr = CRAFTS.map((c, i) => {
    if (c.bp && !(state.blueprints || {})[c.bp]) return ''; // DDD-4 시그니처: 도면을 줍기 전엔 목록에 없다 (지역 독점의 실체)
    if (c.dlc && !Platform.dlc.owns(c.dlc)) return ''; // #119 서포터팩: DLC 소유 시에만 레시피 노출
    // 디렉터: 제작(goods) 목록에서 아이콘 제거 — 아이콘이 오히려 행 레이아웃을 망친다. 이름(+수량)만.
    const outLabel = c.out.res
      ? `${LName(RESOURCES[c.out.res])}${c.out.n > 1 ? ' ×' + c.out.n : ''}` // ×1은 생략(정보 0 — 한 줄 폭 확보)
      : c.out.outfit
        ? `${LName(OUTFITS[c.out.outfit])}`
        : `${LName(DEFS[c.out.furn])}`;
    // 재료도 아이콘 없이 이름+수량(아이콘 정렬 붕괴 방지). 예: 「천 2 + 테이프 1」
    // #223(디렉터 승인): 재료 = 아이콘×n — 단어는 언어별 길이가 통제 불가라 좁은 LCD에서 잘린다.
    //   전체 명칭 안전망 = 좌측 자원바 상시 병기 + 부족 토스트. 결과물 이름은 글 유지(결과물이 주인공).
    const costCompact = costIcons(craftCost(c));
    // #86④: 이미 옷장에 있는 의류는 재제작 불가 (영구 소유물 — 중복 소모 방지)
    const owned = c.out.outfit && (state.outfits || ['default']).includes(c.out.outfit);
    const ok = !owned && resHasAll(craftCost(c));
    // 한 줄 압축(디렉터): 「붕대 ×1 ← 천 2 [제작]」 — 화살표=아이콘
    return `
      <div class="prep-row craft-row ${ok ? '' : 'no'}" style="cursor:default">
        <span class="cr-out">${outLabel}</span>
        <span class="p-cost">${owned ? '' : costCompact}</span>
        ${owned
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('craft.owned')}</span>`
          : `<button class="pixel-btn" data-craft="${i}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('craft.make')}</button>`}
      </div>`;
  });
  // 복장 분리 (디렉터 2026-07-10): 옷 제작이 가구와 한 목록에 섞여 있던 것을 섹션으로 구분.
  //   data-craft 인덱스는 원본 CRAFTS 기준이라 클릭 배선 무변 — 표시만 재배열.
  const goodsRows = CRAFTS.map((c, i) => c.out.outfit ? '' : rowArr[i]).join('');
  const outfitRows = CRAFTS.map((c, i) => c.out.outfit ? rowArr[i] : '').join('');
  const secHead = (ic, key) => `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${ic} ${t(key)}</div>`; // P3: 카테고리 이모지 → 모노 아트
  // 현재 거처에 설치 가능한 개조
  const sh = SHELTERS[state.current];
  const modRows = Object.entries(SHELTER_MODS)
    .filter(([id]) => modAvailable(id, state.current))
    .map(([id, m]) => {
      const built = hasMod(id);
      const ok = resHasAll(m.cost);
      return `
      <div class="prep-row ${built ? 'sel' : ok ? '' : 'no'}" style="cursor:default">
        <span>${icon('icon_mod_' + id, m.emoji)} ${LName(m)}</span>
        <span class="p-eff" style="font-size:10px">${LDesc(m)}</span>
        <span class="p-cost">${built ? '' : costLabel(m.cost)}</span>
        ${built
          ? `<span style="color:var(--good);font-size:11px;margin-left:6px">${t('craft.installed')}</span>`
          : `<button class="pixel-btn" data-mod="${id}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('craft.install')}</button>`}
      </div>`;
    }).join('');
  // 돔 벙커 프로젝트 (#36) — 천장 수리 2단계 + 절단기 뒷문. 벙커에서만 노출.
  let bunkerHtml = '';
  if (state.current === 'bunker') {
    const projRows = [];
    const roofState = state.bunkerRoof || 'hole';
    const stageLabel = { hole: t('bunker.roofHole'), temp: t('bunker.roofTemp'), full: t('bunker.roofFull') }[roofState];
    if (roofState !== 'full') {
      const next = roofState === 'hole' ? { btn: 'bunker.roofStage1Btn', cost: BAL.economy.bunkerRoofStage1, act: 'roof1' } : { btn: 'bunker.roofStage2Btn', cost: BAL.economy.bunkerRoofStage2, act: 'roof2' };
      const ok = resHasAll(next.cost);
      projRows.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${t('bunker.roofTitle')}</span>
        <span class="p-eff" style="font-size:10px">${stageLabel}</span>
        <span class="p-cost">${costLabel(next.cost)}</span>
        <button class="pixel-btn" data-bproj="${next.act}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t(next.btn)}</button>
      </div>`);
    } else {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>${t('bunker.roofTitle')}</span><span class="p-eff" style="font-size:10px">${stageLabel}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    if (state.hasCutter && !state.bunkerBackdoor) {
      const bdOk = resHasAll(BAL.economy.bunkerBackdoorCost);
      projRows.push(`<div class="prep-row ${bdOk ? '' : 'no'}" style="cursor:default">
        <span>${t('bunker.backdoorFound')}</span>
        <span class="p-cost">${costLabel(BAL.economy.bunkerBackdoorCost)}</span>
        <button class="pixel-btn" data-bproj="backdoor" ${bdOk ? '' : 'disabled'} style="margin-left:6px">${t('bunker.backdoorBtn')}</button>
      </div>`);
    } else if (state.bunkerBackdoor) {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>${t('bunker.backdoorBtn')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    bunkerHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${LName(SHELTERS.bunker)}</div>${projRows.join('')}`;
  }
  // 대형 프로젝트 (1.1 ARC-02) — 현재 조건을 만족하는 프로젝트 카드. 진행 게이지(투입/필요) + 남은 자재 req-chip.
  let projHtml = '';
  const availProjects = Object.keys(PROJECTS).filter(pid => projectAvailable(pid));
  if (availProjects.length) {
    const cards = availProjects.map(pid => {
      const p = PROJECTS[pid];
      const rec = projectRec(pid);
      const done = projectDone(pid);
      const nStages = p.stages.length;
      const totalNeed = p.stages.reduce((a, s) => a + s.need, 0);
      const investedTotal = p.stages.slice(0, rec.stage).reduce((a, s) => a + s.need, 0) + (done ? 0 : rec.invested);
      const pct = Math.round((investedTotal / totalNeed) * 100);
      if (done) {
        return `<div class="prep-row sel" style="cursor:default">
          <span>${icon('icon_proj_' + pid, p.icon)} ${t('proj.' + pid + '.name')}</span>
          <span class="p-eff" style="font-size:10px">${t('proj.done')}</span>
          <span style="color:var(--good);font-size:11px">${t('craft.installed')}</span>
        </div>`;
      }
      const st = p.stages[rec.stage];
      const cost = BAL.projects[st.costKey];
      // 남은 자재 대조 칩 (이주 UX req-chip 재사용): 이번 stage 남은 투입 횟수 × 회당 자재. (B-④) 공통 렌더러.
      const remaining = st.need - rec.invested;
      const chips = reqChips(cost);
      const ok = resHasAll(cost);
      return `<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default;flex-wrap:wrap">
        <span>${icon('icon_proj_' + pid, p.icon)} ${t('proj.' + pid + '.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('proj.stageOf', { cur: rec.stage + 1, total: nStages })} · ${t('proj.progress', { pct, inv: investedTotal, need: totalNeed })}</span>
        <span class="req-chips" style="display:inline-flex;gap:4px">${chips}</span>
        <button class="pixel-btn" data-proj="${pid}" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('proj.workBtn')}</button>
        <div style="flex-basis:100%;font-size:10px;color:var(--text-dim);margin-top:2px">${t('proj.' + pid + '.stage' + (rec.stage + 1))} <span style="opacity:.7">(${t('proj.stageRemain', { n: remaining })})</span></div>
      </div>`;
    }).join('');
    projHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('proj.header')}</div><div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('proj.intro')}</div>${cards}`;
  }
  // 옥탑 슬레이트 보수 프로젝트 (#53) — 옥탑에서만. 빠진 슬레이트 2장 채우기(건축재 1). 벙커 천장과 동일 문법.
  let rooftopHtml = '';
  if (state.current === 'rooftop') {
    const slate = state.rooftopSlate || 'gapped';
    const projRows = [];
    if (slate !== 'full') {
      const ok = resHasAll(BAL.economy.rooftopSlateCost);
      projRows.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${t('rooftop.slateTitle')}</span>
        <span class="p-eff" style="font-size:10px">${t('rooftop.slateGapped')}</span>
        <span class="p-cost">${costLabel(BAL.economy.rooftopSlateCost)}</span>
        <button class="pixel-btn" data-rproj="slate" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('rooftop.slateBtn')}</button>
      </div>`);
    } else {
      projRows.push(`<div class="prep-row sel" style="cursor:default"><span>${t('rooftop.slateTitle')}</span><span class="p-eff" style="font-size:10px">${t('rooftop.slateFull')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`);
    }
    rooftopHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${LName(SHELTERS.rooftop)}</div>${projRows.join('')}`;
  }
  // 1.2 지하철 허브 — 승격(핸드카·노선도 복원) → 선로 복구·암시장 개방. subway에서만 노출.
  let subwayHtml = '';
  if (state.current === 'subway') {
    let rows = '';
    if (!state.subwayHub) {
      // 허브 승격 카드
      const hubOk = resHasAll(gateCost(BAL.subway.hubCost));
      rows += `<div class="prep-row ${hubOk ? '' : 'no'}" style="cursor:default">
        <span>${t('subway.hubTitle')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('subway.hubDesc')}</span>
        <span class="p-cost">${costLabel(gateCost(BAL.subway.hubCost))}</span>
        <button class="pixel-btn" data-subway="hub" ${hubOk ? '' : 'disabled'} style="margin-left:6px">${t('subway.hubBtn')}</button>
      </div>`;
    } else {
      rows += `<div class="prep-row sel" style="cursor:default"><span>${t('subway.hubTitle')}</span><span class="p-eff" style="font-size:10px">${t('subway.hubDone')}</span><span style="color:var(--good);font-size:11px">${t('craft.installed')}</span></div>`;
      // 암시장 교환대 (승격 후) — 얼굴 없는 교환대. 슬롯/레이트는 개통 구간 수로 개선.
      const left = marketSlotsLeft();
      const total = marketSlots();
      const segN = subwayOpenCount();
      rows += `<div style="font-size:11px;color:var(--accent);margin:10px 0 3px">${t('subway.marketTitle')} <span style="color:var(--text-dim)">${t('subway.marketSlots', { left, total })}</span></div>`;
      rows += `<div style="font-size:10px;color:var(--text-dim);margin-bottom:5px">${t('subway.marketIntro')}${segN > 0 ? ' ' + t('subway.marketRateNote', { n: segN }) : ''}</div>`;
      for (const offer of BAL.subway.marketOffers) {
        const cost = marketOfferCost(offer);
        const getN = marketOfferGetN(offer);
        const ok = left > 0 && resHasAll(cost);
        const winterTag = (seasonOf().id === 'winter' && offer.winterGive) ? ` <span style="color:var(--bad);font-size:9px">${t('subway.marketWinter')}</span>` : '';
        rows += `<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
          <span>${costLabel(cost)} → ${resIcon(offer.get)}×${getN}${winterTag}</span>
          <button class="pixel-btn" data-market="${offer.id}" ${ok ? '' : 'disabled'} style="margin-left:auto">${t('subway.marketTradeBtn')}</button>
        </div>`;
      }
    }
    subwayHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${LName(SHELTERS.subway)}</div>${rows}`;
  }
  // 1.1 얼음낚시 — 겨울 한정, 물가 셸터(예인선/여객선/등대). 겨울이 처음으로 '받는 계절'이 되는 장치.
  let icefishHtml = '';
  if (icefishAvailable()) {
    const H = BAL.harbor;
    const spots = 1 + (state.breakwaterHut ? 1 : 0); // 방파제 오두막: 스팟 +1
    const used = state.icefishToday || 0;
    const left = Math.max(0, spots - used);
    const canEnergy = state.energy >= H.icefishEnergy && !isExhausted();
    const ok = left > 0 && canEnergy;
    icefishHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('icefish.title')}</div>
      <div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${t('icefish.action')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('icefish.hint', { e: H.icefishEnergy, spots, left })}</span>
        <button class="pixel-btn" id="btn-icefish" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('icefish.go')}</button>
      </div>`;
  }
  // 1.4 금지 구역 — 방호복(제작/수리) + 무전 송출. 금지 구역 노출선 도달 후 또는 이미 방호복/기지가 있으면 노출.
  let forbiddenHtml = '';
  const forbiddenReached = state.successes >= BAL.forbidden.unlockAt || state.hazmatDone || state.radioBaseDone;
  if (forbiddenReached) {
    const F = BAL.forbidden;
    const rows2 = [];
    // 방호복 제작/수리 카드
    if (!state.hazmat) {
      const ok = resHasAll(gateCost(F.hazmatCost));
      rows2.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${t('hazmat.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('hazmat.craftHint', { dur: F.hazmatDur })}</span>
        <span class="p-cost">${costLabel(gateCost(F.hazmatCost))}</span>
        <button class="pixel-btn" data-hazmat="craft" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('hazmat.craftBtn')}</button>
      </div>`);
    } else {
      const full = state.hazmat.dur >= F.hazmatDur;
      const ok = resHasAll(gateCost(F.hazmatRepairCost));
      rows2.push(`<div class="prep-row ${full ? 'sel' : ''}" style="cursor:default">
        <span>${t('hazmat.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('hazmat.durLine', { dur: state.hazmat.dur, max: F.hazmatDur })}</span>
        ${full
          ? `<span style="color:var(--good);font-size:11px">${t('hazmat.ready')}</span>`
          : `<span class="p-cost">${costLabel(gateCost(F.hazmatRepairCost))}</span><button class="pixel-btn" data-hazmat="repair" ${ok ? '' : 'disabled'} style="margin-left:6px">${t('hazmat.repairBtn')}</button>`}
      </div>`);
    }
    // 2.0 총 정비 (§9.3, 방호복 문법) — 하드코어 + 총 보유 시에만. 제작 불가(도심 중심지 파밍 전용) — 정비만.
    if (isHardcore() && state.gun) {
      const H = BAL.hostile;
      const gFull = state.gun.dur >= H.gunDur;
      const gOk = resHasAll(gateCost(H.gunRepairCost));
      rows2.push(`<div class="prep-row ${gFull ? 'sel' : ''}" style="cursor:default">
        <span>${t('gun.name')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('gun.durLine', { dur: state.gun.dur, max: H.gunDur })}</span>
        ${gFull
          ? `<span style="color:var(--good);font-size:11px">${t('gun.ready')}</span>`
          : `<span class="p-cost">${costLabel(gateCost(H.gunRepairCost))}</span><button class="pixel-btn" data-gun="repair" ${gOk ? '' : 'disabled'} style="margin-left:6px">${t('gun.repairBtn')}</button>`}
      </div>`);
    }
    // 무전 송출 카드 (기지 완공 후)
    if (state.radioBaseDone) {
      const total = broadcastableTotal();
      const sent = broadcastSentCount();
      const allSent = total > 0 && sent >= total;
      const canEnergy = state.energy >= F.broadcastEnergy && !isExhausted();
      const ok = !allSent && total > 0 && canEnergy;
      rows2.push(`<div class="prep-row ${ok ? '' : 'no'}" style="cursor:default">
        <span>${t('radio.broadcastName')}</span>
        <span class="p-eff" style="font-size:10px;flex:1">${t('radio.broadcastHint', { e: F.broadcastEnergy, sent, total, lit: state.survivorLights || 0 })}</span>
        <button class="pixel-btn" id="btn-broadcast" ${ok ? '' : 'disabled'} style="margin-left:6px">${allSent ? t('radio.allSentBtn') : t('radio.broadcastBtn')}</button>
      </div>`);
    }
    forbiddenHtml = `<div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${LName(DISTRICTS.research)}</div><div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('forbidden.intro')}</div>${rows2.join('')}`;
  }
  // 꾸미기(#13): 벽지/바닥재 스와치. 현재 셸터의 벽/바닥 재질을 교체 (셸터 지오메트리 불변).
  const dcur = currentDeco();
  const decoSwatches = (kind, table, sel) => Object.entries(table).map(([id, def]) => {
    const active = (sel || 'default') === id;
    const owned = active || !def.cost || resHasAll(def.cost);
    const costTip = def.cost ? costLabel(def.cost) : t('deco.free');
    return `<button class="pixel-btn ${active ? 'primary' : ''}" data-deco="${kind}:${id}" ${owned || active ? '' : 'disabled'}
      title="${LName(def)}" style="margin:2px;padding:4px 6px;font-size:11px">${icon('icon_' + kind + '_' + id, def.emoji)} ${LName(def)}${active ? ' ✓' : (def.cost ? ` <span style="opacity:.6">${costTip}</span>` : '')}</button>`;
  }).join('');
  const themeHtml = THEME_SETS.map(ts => {
    const done = themeSetActive(ts);
    return `<div class="prep-row ${done ? 'sel' : ''}" style="cursor:default">
      <span>${icon('icon_theme_' + ts.id)} ${LName(ts)}</span>
      <span class="p-eff" style="font-size:10px">${t('deco.themeBonus', { n: DECO_THEME_COMFORT })}</span>
      <span style="color:${done ? 'var(--good)' : 'var(--text-dim)'};font-size:11px;margin-left:6px">${done ? t('deco.themeDone') : t('deco.themeTodo')}</span>
    </div>`;
  }).join('');
  const decoHtml = `
    <div style="font-size:12px;color:var(--accent);margin:12px 0 6px">${t('deco.header')}</div>
    <div style="font-size:10px;color:var(--text-dim);margin-bottom:6px">${t('deco.intro')}</div>
    <div style="font-size:11px;margin-bottom:3px">${t('deco.wall')}</div>${sh.noWallpaper
      ? `<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px;padding:6px 8px;border:1px dashed var(--border);border-radius:4px">${t('deco.noWall')}</div>`
      : `<div style="display:flex;flex-wrap:wrap;margin-bottom:8px">${decoSwatches('wall', WALLPAPERS, dcur.wall)}</div>`}
    <div style="font-size:11px;margin-bottom:3px">${t('deco.floor')}</div><div style="display:flex;flex-wrap:wrap;margin-bottom:8px">${decoSwatches('floor', FLOORINGS, dcur.floor)}</div>
    <div style="font-size:11px;color:var(--accent);margin:8px 0 4px">${t('deco.themeHeader')}</div>${themeHtml}`;
  // ── 상위 카테고리 탭 (디렉터: 「3번째 사진처럼 상위 버튼 → 선택해서 보기」) ──
  //   가구·물품 / 복장 / 공사(개조+프로젝트) / 꾸미기. 긴 스크롤 대신 탭으로 분류.
  const modHtml = `<div style="font-size:12px;color:var(--accent);margin:2px 0 6px">${t('craft.modHeader', { emoji: sh.emoji, name: LName(sh) })}</div>`
    + `<div style="font-size:10px;color:var(--text-dim);margin-bottom:8px">${t('craft.modIntro')}</div>${modRows || `<div style="font-size:11px;color:var(--text-dim)">${t('craft.noMods')}</div>`}`;
  const buildHtml = `${modHtml}${bunkerHtml}${rooftopHtml}${subwayHtml}${icefishHtml}${forbiddenHtml}${projHtml}`;
  const catDefs = [
    { id: 'goods', label: t('craft.catGoods'), html: secHead(icon('icon_furn_chair', ''), 'craft.catGoods') + goodsRows },
    ...(outfitRows.trim() ? [{ id: 'outfit', label: t('craft.catOutfit'), html: secHead(icon('icon_act_wardrobe', ''), 'craft.catOutfit') + outfitRows }] : []),
    { id: 'build', label: t('craft.catBuild'), html: buildHtml },
    ...(decoHtml.trim() ? [{ id: 'deco', label: t('craft.catDeco'), html: decoHtml }] : []),
  ];
  if (!catDefs.find(c => c.id === craftCat)) craftCat = catDefs[0].id;
  const tabBar = `<div class="craft-tabs">${catDefs.map(c => `<button class="craft-tab${c.id === craftCat ? ' active' : ''}" data-ctab="${c.id}">${c.label}</button>`).join('')}</div>`;
  // 전 카테고리를 DOM에 렌더하고 비활성은 CSS로만 숨긴다 — 탭 전환은 재렌더 없이 즉시(스냅), 도면 게이트 검사(전 레시피 DOM 존재)와도 양립.
  const panels = catDefs.map(c => `<div class="craft-panel" data-cpanel="${c.id}"${c.id === craftCat ? '' : ' style="display:none"'}>${c.html}</div>`).join('');
  openModal(t('craft.title'), tabBar + panels);
  $('modal-body').querySelectorAll('button[data-ctab]').forEach(b =>
    b.addEventListener('click', () => {
      craftCat = b.dataset.ctab;
      $('modal-body').querySelectorAll('.craft-tab').forEach(el => el.classList.toggle('active', el.dataset.ctab === craftCat));
      $('modal-body').querySelectorAll('.craft-panel').forEach(el => { el.style.display = el.dataset.cpanel === craftCat ? '' : 'none'; });
    }));
  $('modal-body').querySelectorAll('button[data-deco]').forEach(b =>
    b.addEventListener('click', () => {
      const [kind, id] = b.dataset.deco.split(':');
      applyDecoChoice(kind, id);
    }));
  $('modal-body').querySelectorAll('button[data-rproj]').forEach(b =>
    b.addEventListener('click', () => {
      if (b.dataset.rproj === 'slate') {
        if (!resConsumeAll(BAL.economy.rooftopSlateCost)) { toast(t('toast.needMaterial')); return; }
        state.rooftopSlate = 'full';
        toast(t('rooftop.slateDone')); state.dayLog.notes.push(t('rooftop.slateDone'));
        // 지붕 지오메트리를 다시 짓는다 (가구 보존 — 벙커 재빌드와 동일 패턴)
        state.layouts.rooftop = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 })); // #193: 스태킹 y 누락 보수(doSaveNow 스키마 동일) — 빠지면 재빌드 시 표면 위 소품이 바닥으로 침몰
        loadShelter('rooftop');
        closeModal();
        playSfx('craft'); scheduleSave(); renderResBar(); updateHud();
      }
    }));
  $('modal-body').querySelectorAll('button[data-bproj]').forEach(b =>
    b.addEventListener('click', () => {
      const act = b.dataset.bproj;
      if (act === 'roof1') {
        if (!resConsumeAll(BAL.economy.bunkerRoofStage1)) { toast(t('toast.needMaterial')); return; }
        state.bunkerRoof = 'temp';
        toast(t('bunker.roofDoneStage1')); state.dayLog.notes.push(t('bunker.roofDoneStage1'));
      } else if (act === 'roof2') {
        if (!resConsumeAll(BAL.economy.bunkerRoofStage2)) { toast(t('toast.needMaterial')); return; }
        state.bunkerRoof = 'full';
        toast(t('bunker.roofDoneStage2')); state.dayLog.notes.push(t('bunker.roofDoneStage2'));
        rebuildBunkerGeometry(); playSfx('craft');
        scheduleSave(); renderResBar(); updateHud();
        return; // 지오메트리 재빌드가 모달을 닫는다
      } else if (act === 'backdoor') {
        if (!resConsumeAll(BAL.economy.bunkerBackdoorCost)) { toast(t('toast.needMaterial')); return; }
        state.bunkerBackdoor = true;
        toast(t('bunker.backdoorDone')); state.dayLog.notes.push(t('bunker.backdoorDone'));
        rebuildBunkerGeometry(); playSfx('craft');
        scheduleSave(); renderResBar(); updateHud();
        return;
      }
      playSfx('craft');
      scheduleSave(); renderResBar(); updateHud();
      openCraftModal();
    }));
  $('modal-body').querySelectorAll('button[data-proj]').forEach(b =>
    b.addEventListener('click', () => {
      const pid = b.dataset.proj;
      const r = investProject(pid);
      if (!r) return; // 자재 부족 등 — investProject가 토스트 처리
      state.stats.craft = (state.stats.craft || 0) + 1; // 공사도 "손을 쓴 일"로 집계 (제작 통계 재사용)
      if (r === 'done') {
        toast(t('proj.' + pid + '.doneToast'));
        state.dayLog.notes.push(t('proj.' + pid + '.doneToast'));
      } else if (r === 'stage') {
        toast(t('proj.stageDone'));
        state.dayLog.notes.push(t('proj.' + pid + '.workNote'));
      } else {
        toast(t('proj.worked'));
        state.dayLog.notes.push(t('proj.' + pid + '.workNote'));
      }
      playSfx('craft');
      scheduleSave(); renderResBar(); updateHud();
      // investProject가 벙커 재빌드로 모달을 닫았을 수 있음 → 열려 있을 때만 갱신
      if ($('modal-back').classList.contains('show')) openCraftModal();
    }));
  { const ibf = $('btn-icefish'); if (ibf) ibf.addEventListener('click', () => { doIceFish(); openCraftModal(); }); }
  // 1.4 방호복 제작/수리
  $('modal-body').querySelectorAll('button[data-hazmat]').forEach(b =>
    b.addEventListener('click', () => {
      const act = b.dataset.hazmat;
      const done = act === 'craft' ? craftHazmat() : repairHazmat();
      if (done) openCraftModal();
    }));
  // 2.0 총 정비 (§9.3)
  $('modal-body').querySelectorAll('button[data-gun]').forEach(b =>
    b.addEventListener('click', () => { if (repairGun()) openCraftModal(); }));
  // 1.4 무전 송출 (기지 완공 후) — 수집 방송/기록 1개 송출 → 지도 불빛 점등
  { const bb = $('btn-broadcast'); if (bb) bb.addEventListener('click', () => { if (doBroadcast()) openCraftModal(); }); }
  // 1.2 지하철 허브 승격 버튼
  $('modal-body').querySelectorAll('button[data-subway]').forEach(b =>
    b.addEventListener('click', () => {
      if (b.dataset.subway === 'hub') {
        if (!resConsumeAll(gateCost(BAL.subway.hubCost))) { toast(t('toast.needMaterial')); return; }
        state.subwayHub = true;
        toast(t('subway.hubDoneToast')); state.dayLog.notes.push(t('subway.hubDoneToast'));
        playSfx('craft'); scheduleSave(); renderResBar(); updateHud();
        openCraftModal();
      }
    }));
  // 1.2 암시장 교환 버튼
  $('modal-body').querySelectorAll('button[data-market]').forEach(b =>
    b.addEventListener('click', () => {
      if (doMarketTrade(b.dataset.market)) openCraftModal();
    }));
  $('modal-body').querySelectorAll('button[data-craft]').forEach(b =>
    b.addEventListener('click', () => {
      const c = CRAFTS[+b.dataset.craft];
      if (c.out.outfit && (state.outfits || ['default']).includes(c.out.outfit)) return; // #86④ 이중 방어(버튼은 이미 숨김)
      if (!resConsumeAll(craftCost(c))) { toast(t('toast.needMaterial')); return; }
      let craftIcon = null; // #213: FX는 이모지 아닌 실아이콘 PNG (의류는 아이콘 부재 → 스파클만)
      if (c.out.res) {
        resAdd(c.out.res, c.out.n);
        craftIcon = 'icon_res_' + c.out.res;
        // 양초는 배치 가구가 아니라 연료 — "만들었는데 못 놓는다" 혼동 방지 (디렉터 신고 2026-07-16, 모바일 1.9.0)
        toast(t('craft.doneRes', { name: LName(RESOURCES[c.out.res]), n: c.out.n })
          + (c.out.res === 'candle' ? '\n' + t('craft.candleHint') : ''));
      } else if (c.out.outfit) {
        // #86④ 의류: 옷장에 영구 추가 + 바로 갈아입기 (만든 옷을 그 자리에서 입는 게 손맛)
        state.outfits = state.outfits || ['default'];
        state.outfits.push(c.out.outfit);
        state.outfit = c.out.outfit;
        avatarSys.refreshOutfit();
        toast(t('craft.doneOutfit', { name: LName(OUTFITS[c.out.outfit]) }));
      } else {
        state.inventory[c.out.furn] = (state.inventory[c.out.furn] || 0) + 1;
        craftIcon = 'icon_furn_' + c.out.furn;
        toast(t('craft.doneFurn', { name: LName(DEFS[c.out.furn]) }));
        renderInventoryBar();
      }
      state.stats.craft = (state.stats.craft || 0) + 1;
      state.dayLog.notes.push(t('craft.noteRes', { name: c.out.res ? LName(RESOURCES[c.out.res]) : c.out.outfit ? LName(OUTFITS[c.out.outfit]) : LName(DEFS[c.out.furn]) }));
      questProgress('craft');
      scheduleSave();
      renderResBar();
      // #86④ 의류는 망치질 대신 천 스치는 소리 (디렉터 오더 — 갈아입기와 동일 결)
      if (c.out.outfit) playSfx('whoosh', { rate: 0.72, vol: 0.5, jitter: 0.06 });
      else playSfx('craft');
      spawnCraftFx(craftIcon); // ④ 제작 손맛: 결과물 아이콘 떠오름 + 반짝임
      if (c.out.outfit) openCraftModal(); // #86④: 보유 배지 즉시 반영 (재제작 버튼 잔류 방지)
      openCraftModal(); // 갱신
    }));
  $('modal-body').querySelectorAll('button[data-mod]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.mod;
      const m = SHELTER_MODS[id];
      if (hasMod(id)) return;
      if (!resConsumeAll(m.cost)) { toast(t('toast.needMaterial')); return; }
      if (!state.mods) state.mods = {};
      if (!state.mods[state.current]) state.mods[state.current] = [];
      state.mods[state.current].push(id);
      if (id === 'lighting') state.lightingOut = false; // #195: lightingOut은 전역 플래그 — 타 셸터 단전 이력이 새 설비의 첫 점등을 막지 않게 리셋
      toast(t('craft.modDone', { emoji: m.emoji, name: LName(m) }));
      state.dayLog.notes.push(t('craft.modNote', { name: LName(m) }));
      if (id === 'extension' || m.rebuild) {
        // 방 구조가 바뀌므로 거처를 다시 짓는다 (rebuild: buildRoom 지오 분기 개조 — 세관 선반 철거/창구 봉쇄)
        state.layouts[state.current] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 })); // #193: 스태킹 y 누락 보수(doSaveNow 스키마 동일)
        loadShelter(state.current);
        closeModal();
      } else {
        addModProp(id);
        openCraftModal();
      }
      shadowDirty();
      scheduleSave();
      renderResBar();
      updateHud();
    }));
}

// 벙커 지오메트리 재빌드 (#36) — 천장 수리/뒷문 상태를 반영해 방을 다시 짓는다 (extension 개조와 동일 패턴).
function rebuildBunkerGeometry() {
  if (state.current !== 'bunker') return;
  state.layouts.bunker = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 })); // #193: 스태킹 y 누락 보수(doSaveNow 스키마 동일)
  loadShelter('bunker');
  closeModal();
  shadowDirty();
}
// 1.1: 현재 셸터 지오메트리 재빌드 (현장 오브젝트 단계 교체용, 벙커 외 항구 셸터). 배치 보존 후 loadShelter.
function rebuildShelterGeometry() {
  const id = state.current;
  state.layouts[id] = items.map(i => ({ d: i.defId, c: i.colorIdx, x: +i.x.toFixed(3), z: +i.z.toFixed(3), r: i.rot, o: i.on === false ? 0 : 1, y: +(i.y || 0).toFixed(2), s: i.sketch || 0, t: i.tier || 0, ge: i.gel || 0, w: i.wear || 0 })); // #193: 스태킹 y 누락 보수(doSaveNow 스키마 동일)
  loadShelter(id);
  closeModal();
  shadowDirty();
}

/* ============================================================
   대형 프로젝트 엔진 (1.1 ARC-02) — 범용. 콘텐츠는 projects.js PROJECTS 테이블.
   state.projects[id] = { stage, invested }. 여러 날 자재를 붓는 장기 목표.
   1.2~1.4는 PROJECTS 항목 + BAL.projects 비용 + proj.* i18n + site 3D만 추가한다(이 코드 무수정).
============================================================ */
// 프로젝트가 지금 노출 조건을 만족하는가 (EVENTS.when 스키마 부분집합 + needsFlag).
// projectAvailable/projectRec/projectDone/projectSiteStage → core/projects.js (import). 순수 술어. investProject(투입·UI)는 잔류.
// stage 완료 시 효과 적용. 효과는 데이터 키로 분기 — 실제 효과는 여기 switch에 등록.
// 파일럿(clearPassage.done)은 코스메틱 전용이라 상태 부수효과 없음(현장 오브젝트 교체 + 수첩 기록이 곧 보상).
function applyProjectEffect(effectKey) {
  if (!effectKey) return;
  switch (effectKey) {
    // 1.1 파일럿 통로 정리 완공 — 1.4에서 복선 회수: 금지 구역에 닿은 뒤라면 이 통로가 연구동 지하로 이어짐이 드러난다.
    case 'clearPassage.done':
      if (state.hazmatDone || state.successes >= BAL.forbidden.unlockAt) state.dayLog.notes.push(t('proj.clearPassage.revealNote'));
      break;
    case 'harbor.breakwater.done': state.breakwaterHut = true; break; // 항구 파밍 -25% + 얼음낚시 스팟 +1 (플래그로 판정)
    // 1.2 선로 개통 — 구간별 연결 지역을 개통 상태로. 탐험 시간 -50% + 겨울 폭설 봉쇄 무시(플래그 판정).
    case 'subway.openSeg1': openSubwaySegment(1); break;
    case 'subway.openSeg2': openSubwaySegment(2); break;
    case 'subway.openSeg3': openSubwaySegment(3); break;
    // 1.3 케이블카 완공 — 고원(리조트) 접근/탐험 시간 단축(플래그 판정, expDuration이 읽음).
    case 'resort.accessTime': state.cablecarDone = true; break;
    // 1.3 관측소 완공 — 맑은 밤 밤하늘 이벤트 개방(플래그 판정, processDay 밤하늘 롤이 읽음).
    case 'lodge.nightSky': state.observatoryDone = true; break;
    // 1.4 무전 기지 완공 — 송출 행동 개방(플래그 판정, 송출 UI/지도 불빛이 읽음). 주제 회수의 스위치.
    case 'radio.broadcastAction': state.radioBaseDone = true; break;
    // 2.0 §9.6 히든 통로 개척 완공 — 사다리 등장(플래그 판정, subway buildEnv) + 그날 밤 박사 대면 예약.
    case 'subway.hiddenGate': state.hiddenGateDone = true; state.hiddenReachPending = true; break;
    // 2.0-(b) 동부 관문 완공 — 국경이 열린다: 동부 셸터 4종 이주 개방(shelterUnlocked) + 개통 비네트 예약.
    case 'east.gateOpen': state.eastGateOpen = true; state.eastGatePending = true; break;
    default: break; // 1.2~1.4 확장이 여기에 case를 추가한다.
  }
}
// 1.2 선로 구간 개통: 해당 구간이 연결하는 지역을 state.subwayOpen 에 등록.
// 이후 expDuration(-50%)·폭설 봉쇄 예외·암시장 슬롯/레이트가 이 맵을 읽는다.
function openSubwaySegment(seg) {
  if (!state.subwayOpen || typeof state.subwayOpen !== 'object') state.subwayOpen = {};
  const region = BAL.subway.segRegions[seg];
  if (region) state.subwayOpen[region] = true;
}
// 개통 구간 수 (암시장 슬롯/레이트 스케일링에 쓰인다).
function subwayOpenCount() {
  return Object.keys(state.subwayOpen || {}).length;
}
// 특정 지역이 지하 노선으로 개통되어 있는가 (탐험 시간·봉쇄 예외 판정).
// subwayReaches → core/regions.js 이관 (Tier3)

/* ── 1.4 「금지 구역」 방호복 / 무전 송출 ──
   방호복(hazmat): 고급 제작 정점. 금지 구역(forbidden) 지역 진입 게이트 + 탐험 1회당 내구 소모.
   무전 송출: 완공된 무전 기지에서 수집 방송/기록을 송출 → 종이 지도에 생존자 불빛 점등(수집률 비례).
   주제 회수: "내가 지킨 온기가 신호가 되어 퍼진다" — 불빛은 만남이 아니라 응답하는 먼 창문(타인은 흐른다). */
// 특정 지역이 금지 구역(방호복 필수)인가.
// isForbiddenRegion → core/regions.js 이관 (Tier3)
// 방호복을 입을 수 있는 상태인가 (제작됐고 내구가 남았는가).
function hazmatUsable() {
  return !!(state.hazmat && state.hazmat.dur > 0);
}
// 방호복 제작 — 고급 제작 정점. 재료 소비 후 최대 내구로 지급. 최초 제작 시 hazmatDone(무전 기지 공사 게이트) 세움.
function craftHazmat() {
  if (state.hazmat && state.hazmat.dur >= BAL.forbidden.hazmatDur) { toast(t('hazmat.alreadyFull')); return false; }
  if (!resConsumeAll(gateCost(BAL.forbidden.hazmatCost))) { toast(t('toast.needMaterial')); return false; }
  const firstTime = !state.hazmatDone;
  state.hazmat = { dur: BAL.forbidden.hazmatDur };
  state.hazmatDone = true; // 방호복에 손댄 순간부터 무전 기지 공사가 열린다(금지 구역에 닿을 자격)
  state.dayLog.notes.push(t('hazmat.craftedNote'));
  toast(t('hazmat.crafted', { dur: BAL.forbidden.hazmatDur }) + (firstTime ? '\n' + t('hazmat.firstHint') : ''));
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 방호복 수리 — 닳은 내구를 전량 회복. 재료 소비.
function repairHazmat() {
  if (!state.hazmat) { toast(t('hazmat.needCraft')); return false; }
  if (state.hazmat.dur >= BAL.forbidden.hazmatDur) { toast(t('hazmat.alreadyFull')); return false; }
  if (!resConsumeAll(gateCost(BAL.forbidden.hazmatRepairCost))) { toast(t('toast.needMaterial')); return false; }
  state.hazmat.dur = BAL.forbidden.hazmatDur;
  toast(t('hazmat.repaired', { dur: BAL.forbidden.hazmatDur }));
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 금지 구역 탐험 1회당 방호복 내구 -1 (resolveExpedition에서 호출). 다 닳으면 다음 진입이 차단된다.
function wearHazmat() {
  if (!state.hazmat) return;
  state.hazmat.dur = Math.max(0, state.hazmat.dur - 1);
}
// 2.0 총 정비 (§9.3, repairHazmat 미러) — 남은 발수를 전량 회복. 파밍 전용이라 제작 함수는 없다.
function repairGun() {
  if (!state.gun) { toast(t('gun.needFind')); return false; }
  if (state.gun.dur >= BAL.hostile.gunDur) { toast(t('gun.alreadyFull')); return false; }
  if (!resConsumeAll(gateCost(BAL.hostile.gunRepairCost))) { toast(t('toast.needMaterial')); return false; }
  state.gun.dur = BAL.hostile.gunDur;
  toast(t('gun.repaired', { dur: BAL.hostile.gunDur }));
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 송출 대상 = 수집한 방송(broadcasts) + 기록(memos) 통합 풀. "수집한 방송/기록을 송출"(GD).
//   전체 송출 가능 총량(수집한 것 전부)과 이미 송출한 수를 센다.
function broadcastableTotal() {
  return Object.keys(state.broadcasts || {}).length + Object.keys(state.memos || {}).length;
}
function broadcastSentCount() {
  return Object.keys(state.broadcasts_sent || {}).length;
}
// 아직 송출하지 않은 수집물 id 1개 (방송 우선, 없으면 기록). 없으면 null.
function pickUnsentSignal() {
  const sent = state.broadcasts_sent || {};
  const bun = Object.keys(state.broadcasts || {}).filter(id => !sent['b_' + id]);
  if (bun.length) return { key: 'b_' + bun[0], kind: 'broadcast', id: bun[0] };
  const mun = Object.keys(state.memos || {}).filter(id => !sent['m_' + id]);
  if (mun.length) return { key: 'm_' + mun[0], kind: 'memo', id: mun[0] };
  return null;
}
// 지도에 켜져야 할 목표 불빛 수 = (송출한 신호 / 송출 가능 총량) × 최대 불빛. 수집률 비례로 번진다.
//   최대 불빛 수는 종이 지도가 감당할 밀도(MAP_LIGHT_MAX). 총량 0이면 0.
// MAP_LIGHT_MAX(=12)는 ui/mapview.js 수출 — 지도 오버레이 밀도의 정본은 지도 모듈이 갖는다 (S2-1 추출).
function targetSurvivorLights() {
  const total = broadcastableTotal();
  const sent = broadcastSentCount();
  if (total <= 0 || sent <= 0) return 0;
  const ratio = Math.min(1, sent / total);
  // 송출한 신호가 하나라도 있으면 최소 1개는 응답한다(먼 창문). 이후 수집률 비례로 번진다(ceil로 촘촘히).
  return Math.max(1, Math.ceil(ratio * MAP_LIGHT_MAX));
}
// 송출 행동 — 미송출 신호 1개를 송출. 에너지 소모. 지도 불빛 목표 갱신 후 점등. 모든 신호 송출 시 박사 정기 교신 개방.
function doBroadcast() {
  if (isWallpaper()) { toast(t('wallpaper.noAction')); return false; }
  if (!state.radioBaseDone) { toast(t('radio.needBase')); return false; }
  if (state.energy < BAL.forbidden.broadcastEnergy) { toast(t('toast.tooTired'), 'warn'); return false; }
  const sig = pickUnsentSignal();
  if (!sig) { toast(t('radio.allSent')); return false; }
  if (!state.broadcasts_sent) state.broadcasts_sent = {};
  state.broadcasts_sent[sig.key] = state.day;
  state.energy = Math.max(0, state.energy - BAL.forbidden.broadcastEnergy);
  // 불빛 목표 갱신 → 실제 점등(하나 이상 늘면 "먼 창문이 응답했다").
  const before = state.survivorLights || 0;
  const target = targetSurvivorLights() + knowBroadcastBonus(); // 무전 지식(§9): 송출 도달 +N (구조 앞당김)
  state.survivorLights = Math.max(before, target); // 켜진 불빛은 꺼지지 않는다(온기는 남는다)
  const lit = state.survivorLights - before;
  const note = lit > 0 ? t('radio.sentLit', { n: state.survivorLights }) : t('radio.sentNoLit');
  state.dayLog.notes.push(note);
  toast(note);
  playSfx('craft');
  // 모든 수집물을 송출했다면 박사 정기 교신 개방(다음 밤 무전 — Day10000 다리). 미본 상태에서만 예약.
  if (!pickUnsentSignal() && !state.doctorRegularSeen) state.doctorRadioRegularPending = true;
  scheduleSave(); renderResBar(); updateHud();
  // 지도가 열려 있으면 불빛 오버레이 즉시 갱신(맵 모달은 매 열 때 재구성되므로, 열려 있을 때만 다시 그린다).
  if ($('map-wrap')) renderSurvivorLights($('map-wrap'));
  return true;
}

/* ── 1.2 암시장 (허브 승격 후 개방) — 잉여 물물교환 = 후반 인플레의 최종 싱크 ──
   캐논: 화폐 없음(문명은 죽었다, 교환만 남았다). 상인도 흐르는 타인 — 얼굴 없는 교환대/쪽지 거래.
   하루 슬롯 제한(marketToday) + 개통 구간 수로 슬롯·레이트 개선. 겨울 연료 프리미엄(winterGive). */
function marketOpen() { return state.current === 'subway' && state.subwayHub; }
function marketSlots() {
  return BAL.subway.marketBaseSlots + subwayOpenCount() * BAL.subway.marketSlotsPerSeg;
}
function marketSlotsLeft() { return Math.max(0, marketSlots() - (state.marketToday || 0)); }
// 인카운터/교환 모드 배수 (BAL.encounters — 미지정 모드는 1.0 폴백). scale 대상 교환·빈도에만 적용.
function encFreqMul()   { return BAL.encounters.freqMul[state.mode]   ?? 1; }
function encBarterMul() { return BAL.encounters.barterMul[state.mode] ?? 1; }
function encCostMul()   { return BAL.encounters.costMul[state.mode]   ?? 1; }
// 한 오퍼의 실제 지불 비용(겨울 프리미엄 반영)과 산출량(개통 구간 레이트 보너스 반영).
//   scale:true 오퍼는 모드 배수(costMul/barterMul) 적용 — 어려울수록 야박(각 자원 최소 1 가드).
function marketOfferCost(offer) {
  const base = (seasonOf().id === 'winter' && offer.winterGive) ? offer.winterGive : offer.give;
  if (!offer.scale) return base;
  const m = encCostMul();
  const out = {};
  for (const [id, n] of Object.entries(base)) out[id] = Math.max(1, Math.round(n * m));
  return out;
}
function marketOfferGetN(offer) {
  const base = offer.getN + subwayOpenCount() * BAL.subway.marketRateBonusPerSeg;
  return offer.scale ? Math.max(1, Math.round(base * encBarterMul())) : base;
}
// 교환 실행 — 슬롯/자원 검사 후 give 소비, get 지급. 반환: true(성공)|false(실패).
function doMarketTrade(offerId) {
  if (!marketOpen()) return false;
  if (marketSlotsLeft() <= 0) { toast(t('subway.marketNoSlot')); return false; }
  const offer = BAL.subway.marketOffers.find(o => o.id === offerId);
  if (!offer) return false;
  const cost = marketOfferCost(offer);
  if (!resHasAll(cost)) { toast(t('toast.needResource')); return false; }
  if (!resConsumeAll(cost)) { toast(t('toast.needResource')); return false; }
  const n = marketOfferGetN(offer);
  resAdd(offer.get, n);
  state.marketToday = (state.marketToday || 0) + 1;
  const note = t('subway.marketTraded', { give: costLabel(cost), emoji: RESOURCES[offer.get].emoji, name: LName(RESOURCES[offer.get]), n });
  state.dayLog.notes.push(note);
  toast(note);
  playSfx('craft');
  scheduleSave(); renderResBar(); updateHud();
  return true;
}
// 프로젝트 완공 시 수첩 "그 해의 공사" 자동 기록 (memoir 문법 재사용 — pendingWinterMemoir 큐에 적재).
function recordProjectMemoir(id) {
  const p = PROJECTS[id]; if (!p || !p.memoirKey) return;
  if (!Array.isArray(state.pendingWinterMemoir)) state.pendingWinterMemoir = [];
  state.pendingWinterMemoir.push({
    titleId: 'proj.memoir.title',
    bodyId: p.memoirKey,
    bodyArgs: { day: state.day },
  });
}
// 자재 1회 투입 → invested++. stage 완료 시 효과+현장 갱신+(완공 시)수첩 기록. 반환: 'invested'|'stage'|'done'|false.
function investProject(id) {
  const p = PROJECTS[id];
  if (!p || !projectAvailable(id) || projectDone(id)) return false;
  const rec = state.projects[id] || { stage: 0, invested: 0 };
  const st = p.stages[rec.stage];
  const cost = BAL.projects[st.costKey];
  if (!resConsumeAll(cost)) { toast(t('toast.needMaterial')); return false; }
  rec.invested++;
  state.projects[id] = rec;
  let result = 'invested';
  if (rec.invested >= st.need) {
    // stage 완료
    applyProjectEffect(st.effectKey);
    rec.stage++;
    rec.invested = 0;
    result = 'stage';
    if (rec.stage >= p.stages.length) {
      // 프로젝트 완공
      recordProjectMemoir(id);
      result = 'done';
    }
  }
  // 현장 오브젝트가 현재 셸터 지오메트리에 있으면 재빌드로 단계 교체 (현재 셸터 한정).
  if (p.site === 'stairRubble' && state.current === 'bunker') rebuildBunkerGeometry();
  else if (p.site === 'breakwaterHut' && (state.current === 'tugboat' || state.current === 'controltower')) rebuildShelterGeometry();
  else if (p.site === 'railSegment' && state.current === 'subway') rebuildShelterGeometry(); // 1.2 선로 구간 현장 단계 교체
  else if (p.site === 'hiddenGate' && state.current === 'subway') rebuildShelterGeometry(); // §9.6 히든 통로 현장 단계 교체
  return result;
}

/* ── 1.1 얼음낚시 (겨울 전용, 물가 셸터) ──
   겨울이 처음으로 '받는 계절'이 되는 장치. 예인선/여객선/등대에서만, 하루 스팟 수만큼(+방파제 1).
   에너지·시간 소모 후 신선식품 1~3 + 확률로 소금 + 극저확률 "이상한 병"(메모 드랍). 전부 BAL.harbor. */
const ICEFISH_SHELTERS = ['tugboat', 'ship', 'lighthouse'];
function icefishAvailable() {
  return seasonOf().id === 'winter' && ICEFISH_SHELTERS.includes(state.current);
}
function doIceFish() {
  if (!icefishAvailable()) return false;
  const H = BAL.harbor;
  const spots = 1 + (state.breakwaterHut ? 1 : 0);
  if ((state.icefishToday || 0) >= spots) { toast(t('icefish.noSpot')); return false; }
  if (state.energy < H.icefishEnergy || isExhausted()) { toast(t('toast.tooTired'), 'warn'); return false; }
  state.energy = Math.max(0, state.energy - H.icefishEnergy);
  state.gameMin += H.icefishTimeMin;
  state.icefishToday = (state.icefishToday || 0) + 1;
  const food = H.icefishFoodMin + Math.floor(Math.random() * (H.icefishFoodMax - H.icefishFoodMin + 1));
  resAdd('food', food);
  const notes = [t('icefish.caught', { n: food })];
  if (Math.random() < H.icefishSaltChance) { resAdd('salt', H.icefishSalt); notes.push(t('icefish.salt', { n: H.icefishSalt })); }
  if (Math.random() < H.icefishBottleChance) {
    const mid = dropMemo();
    if (mid) { state.pendingMemoPopup = { id: mid, will: false }; notes.push(t('icefish.bottle')); }
  }
  for (const nt of notes) state.dayLog.notes.push(nt);
  toast(notes[0]);
  playSfx('craft');
  state.stats.craft = (state.stats.craft || 0) + 1;
  scheduleSave(); renderResBar(); updateHud();
  return true;
}

/* ============================================================
   일지: 도감 · 업적 · 통계 (장기 동기부여 + Steam 업적 대비)
============================================================ */
function markCollection(defId, colorIdx) {
  if (!state.collection) state.collection = {};
  if (!state.collection[defId]) state.collection[defId] = [false, false, false, false];
  state.collection[defId][colorIdx] = true;
}
function collectionCount() {
  return Object.values(state.collection || {}).reduce((a, arr) => a + arr.filter(Boolean).length, 0);
}
// #73 Tier4: 업적 정의 데이터 → data/achs.js 분리. 판정(chk)은 state·comfortDetail 등
//   게임 스코프 결합이라 여기 잔류 — id로 병합(SHELTER_META+buildRoom 병합 선례, 동작 불변).
const ACH_CHECKS = {
  first: () => state.stats.success >= 1,
  exp10: () => state.stats.success >= 10,
  exp30: () => state.stats.success >= 30,
  craft5: () => (state.stats.craft || 0) >= 5,
  craft20: () => (state.stats.craft || 0) >= 20,
  comfort90: () => comfortDetail().score >= 90,
  settled8: () => (state.stayDays || 0) >= 8,
  renov3: () => Object.values(state.renovated || {}).filter(Boolean).length >= 3,
  renovAll: () => Object.values(state.renovated || {}).filter(Boolean).length >= 9,
  mods3: () => Object.values(state.mods || {}).flat().length >= 3,
  winter: () => state.day >= 48,
  nine_winters: () => (state.winters || 0) >= 9,
  col21: () => collectionCount() >= 21,
  col42: () => collectionCount() >= 42,
  colAll: () => collectionCount() >= 84,
  cat: () => !!state.cat,
  ending: () => !!state.endingSeen || state.endingType === 'escape', // #170 REV3: 구세이브 endingSeen 호환
  silence: () => !!state.siloFired,
};
for (const a of ACH_DEFS) a.chk = ACH_CHECKS[a.id] || (() => false); // 정의 객체에 직접 병합 — _lk 스탬프(#114) 보존
const ACHS = ACH_DEFS;
function checkAchievements() {
  if (QA_ED) return; // #89 QA 에디션: 업적 전면 no-op (Steam 중계 지점 원천 차단)
  if (isWallpaper()) return; // #194: 배경화면(자원 무한·압박 0)은 생존 업적의 무대가 아니다 — 방치 달성·Steam 중계 차단
  if (!state.achs) state.achs = {};
  if (state.qaUsed) return; // QA 치트로 오염된 세이브는 신규 업적 해금 무시 (기존 해금은 유지)
  for (const a of ACHS) {
    if (!state.achs[a.id] && a.chk()) {
      Platform.achievements.unlock(a.id); // 어댑터 경유(로컬 state.achs 위임 + Steam 중계 지점) — 동작 불변
      if (a.quiet) continue; // 침묵 등 무음 업적: 연출 없이 기록만 — 게임은 판단하지 않는다
      toast(t('ach.unlocked', { icon: a.icon, name: LName(a) }));
      state.dayLog.notes.push(t('ach.note', { name: LName(a) }));
      playSfx('ring');
    }
  }
}
// 기록 탭 HTML (REQ-LORE-02) — 메모(지역 그룹)+라디오 로그+수집률. 미수집은 "…" 실루엣.
// (Tier6b) 일지/도감/업적/기록 모달(recordTabHtml·journalTabBar·openJournalModal)은 ui/modals.js로 이관 — makeModals ctx 주입.

/* ============================================================
   부상 & 치료 (기획서 v0.2: 치료 자원 소비 루프)
============================================================ */
function applyInjury(type, hasBottle) {
  const inj = INJURIES[type];
  let restH = inj.restH * recoveryMult();
  if (SHELTERS[state.current].perk?.injuryHalf) restH *= 0.5;
  if (hasBottle) restH *= 0.8;
  state.injury = { type, untilMin: state.gameMin + restH * 60 };
  // 2.0 부상 서사화(§9.4-④): 겨울 memoir 부상 통계 + 흉터 기록. 서사 전용 — 경제/판정 무관.
  //   winterSnap은 겨울에만 존재하므로 겨울 부상만 집계된다(의도 — "그 해 겨울"의 기록).
  if (state.winterSnap?.acc) {
    state.winterSnap.acc.injuries = (state.winterSnap.acc.injuries || 0) + 1;
    state.winterSnap.acc.lastInjury = type;
  }
  if (!_simRunning) { // 흉터는 실제 플레이의 몸에만 남는다 (sim 순수성 + 세이브 오염 방지)
    if (!Array.isArray(state.scars)) state.scars = [];
    state.scars.push({ t: type, d: state.day });
    if (state.scars.length > 50) state.scars.shift();
  }
  tipOnce('tip.injury'); // 찢어진 쪽지: 첫 부상
  return t('injury.applied', { icon: inj.icon, name: LName(inj), pen: Math.round(inj.pen * 100), h: Math.round(restH) });
}
function treatInjury() {
  if (paused) { toast(t('pause.blocked')); return; }
  if (!state.injury) return;
  const inj = INJURIES[state.injury.type];
  if (!resConsumeAll(inj.cure)) { toast(t('injury.needCure', { cost: costLabel(inj.cure) })); return; }
  toast(t('injury.treated', { icon: inj.icon, name: LName(inj), cost: costLabel(inj.cure) }));
  state.dayLog.notes.push(t('injury.treatedNote', { name: LName(inj) }));
  state.injury = null;
  scheduleSave();
  renderResBar();
  renderExpPanel();
  updateHud();
}
function tickInjury() {
  if (state.injury && state.gameMin >= state.injury.untilMin) {
    toast(t('injury.recovered', { icon: INJURIES[state.injury.type].icon, name: LName(INJURIES[state.injury.type]) }));
    state.injury = null;
    scheduleSave();
    renderExpPanel();
    updateHud();
  }
}

/* ============================================================
   입력 처리
============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let placing = null, selected = null, dragging = null, dragStart = null;
let orbiting = false, lastOrbX = 0, lastOrbY = 0;
// v0.9.2 배치 모드: OFF(기본)면 화면 조작 중 기존 가구가 덥석 선택/이동되지 않는다.
// 저장하지 않는 세션 변수 — 기능형 상호작용(라디오/촛불 토글)은 모드와 무관하게 항상 동작.
let editMode = false;
function funcClickItem(item) {
  // editMode OFF에서의 "기능형 클릭": 선택/이동/패널 없이 기능만 실행.
  const def = DEFS[item.defId];
  if (item.defId === 'radio') { dbgSfx = 'radio_noise'; playSfx('radio_noise', { vol: 0.5, jitter: 0 }); return true; }
  if (['candle', 'lantern'].includes(item.defId) || def.light || def.appliance) {
    // 전원 토글 (성냥음은 setItemPower가 candle/lantern에서 재생)
    if (def.light?.fuel || def.appliance?.fuel || def.light || def.appliance) {
      setItemPower(item, item.on === false, { silent: false });
      dbgSfx = ['candle', 'lantern'].includes(item.defId) ? 'candle_light' : 'toggle';
      toast(item.on ? t('power.turnedOn', { name: LName(def) }) : t('power.turnedOff', { name: LName(def) }));
      scheduleSave();
      return true;
    }
  }
  return false;
}
let dbgSfx = null; // 테스트용: 마지막 기능형 클릭이 낸 SFX
// 비배치 모드에서 가구를 탭했을 때 배치 모드 전환을 제안. '닫기' 후 60초는 팝업 대신 토스트로 강등.
let _editAskMuteUntil = 0;
async function offerEditMode(item) {
  playSfx('place', { vol: 0.25, rate: 1.5, jitter: 0.1 }); // 상호작용음 (select와 동일한 가벼운 '톡')
  const name = LName(DEFS[item.defId]);
  if (Date.now() < _editAskMuteUntil) { toast(t('edit.enterHint')); return; }
  const ok = await gameConfirm(t('edit.enterAsk', { name }), t('edit.enterYes'), t('edit.enterNo'));
  if (ok) { toggleEditMode(true); select(item); }
  else _editAskMuteUntil = Date.now() + 60000; // '닫기' → 60초 강등
}

const selRing = new THREE.Mesh(
  new THREE.RingGeometry(0.5, 0.62, 24),
  new THREE.MeshBasicMaterial({ color: 0xe8a86c, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
);
selRing.rotation.x = -Math.PI / 2;
selRing.position.y = 0.03;
selRing.visible = false;
scene.add(selRing);

function updateSelRing() {
  if (selected) {
    const fp = footprintOf(selected);
    const r = Math.max(fp.w, fp.d) / 2 + 0.18;
    selRing.scale.set(r / 0.56, r / 0.56, 1);
    selRing.position.set(selected.x, 0.03 + (selected.y || 0), selected.z);
    selRing.visible = true;
  } else selRing.visible = false;
}
function pointerToFloor(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  return raycaster.ray.intersectPlane(floorPlane, p) ? p : null;
}
// #55 벙커 하강 계단 클릭: 1.4 복선 토스트 + 극저확률 특수 메모 발견. 진입은 불가(어둠 페이드).
function pickStairs(e) {
  if (!bunkerStairsObj) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  // 뒷벽 컬링으로 계단이 숨은 각도에선 클릭도 무시 (조상 그룹 visible 확인)
  let vis = true; for (let o = bunkerStairsObj; o; o = o.parent) if (o.visible === false) { vis = false; break; }
  if (!vis) return false;
  const hits = raycaster.intersectObject(bunkerStairsObj, true);
  if (!hits.length) return false;
  // 극저확률(memo willDropChance 밴드)로 계단 메모 발견 — 미수집일 때만
  if (!(state.memos || {}).stair1 && Math.random() < 0.06) {
    collectMemo('stair1');
    scheduleSave();
    showMemoPage('stair1', false);
    return true;
  }
  toast(t('bunker.stairToast'));
  return true;
}
// §9.6 「침묵」 히든 지점 (승강장 왼쪽 터널 개구부): UI 힌트 0의 순수 히트 영역 — 커뮤니티 발견 콘텐츠.
//   발견 전: 선로 3구간 전부 개통일 때만, 같은 지점 더블탭(450ms)으로 통로가 열린다(실수 방지 — 디렉터 확정).
//     게이트 미충족/첫 탭은 "눌리지만 아무 표시가 없다"(§5.1) — 히트만 소비.
//   발견 후: 개척(hiddenGate) 완공 + 대면 유보(hiddenReached)를 마쳤다면 같은 지점 탭 = 박사의 문서.
//   sim 결정론: 확정 게이트만, Math.random 없음(§9.7).

/* ── #199 무너진 입구 인엔진 연출 (디렉터 2026-07-17, 레퍼런스 Box.mp4 — 상자 개봉만 참조) ──
   사진 카드 폐지: ①복셀 문 씬(문틈 안은 완전한 어둠) ②하단 선택 UI(들어간다/그냥 간다)
   ③입장 시 상자 개봉 버스트 — 예열 흔들림 → 뚜껑 팝 + 수직 광선 부챗살(전리품 색) + 전리품 부유 + 파편 산개.
   보상·부상·확률·문안은 기존 collapsed_entrance choices.run() 그대로 재사용 — 표시 계층만 교체(신규 문자열 0). */
function playCollapseVignette() {
  const ev = EVENTS.collapsed_entrance;
  if (!ev || !claimVignette()) { openEventCard('collapsed_entrance'); return; } // 러너 점유 시 카드 폴백 (Tier5: 플래그는 vignettes.js 소유 — 원자적 점유)
  playEventSting('collapsed_entrance');
  const evTitle = t(ev.titleId);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:400;background:#000;opacity:0;transition:opacity .5s';
  const cv = document.createElement('canvas'); cv.style.cssText = 'width:100%;height:100%;filter:contrast(1.14) saturate(1.1)'; ov.appendChild(cv);
  const vf = document.createElement('div');
  vf.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 44%, transparent 50%, rgba(6,4,3,0.74) 100%)';
  ov.appendChild(vf);
  const fade = document.createElement('div'); // 문→상자 장면 전환용 암전막
  fade.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:#000;opacity:0;transition:opacity .35s';
  ov.appendChild(fade);
  const ui = document.createElement('div');
  ui.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);bottom:max(26px, env(safe-area-inset-bottom, 26px));width:min(430px, 86vw);display:flex;flex-direction:column;gap:8px;z-index:2';
  ov.appendChild(ui);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = '1'; });
  const vr = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0a0c);
  scene.fog = new THREE.Fog(0x0b0a0c, 9, 20); // 문(카메라 ~5-6m)이 안개에 묻히지 않게 — 문틈 칠흑은 대비로 산다
  const camera = new THREE.PerspectiveCamera(44, innerWidth / innerHeight, 0.1, 60);
  const fit = () => { vr.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);
  scene.add(new THREE.AmbientLight(0x8a92a4, 0.62));
  const key = new THREE.DirectionalLight(0xbfd0e8, 0.95); key.position.set(-3, 6, 4); scene.add(key);
  const torch = new THREE.PointLight(0xffc98a, 2.8, 10, 1.7); torch.position.set(0.3, 1.4, 2.6); scene.add(torch); // 손전등 웜 스팟 — 문짝·프레임을 핥는다
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshLambertMaterial({ color: 0x2c2a2e }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const M = c => new THREE.MeshLambertMaterial({ color: c });
  const bx = (g, w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); return m; };
  // ── 장면 1: 무너진 입구 — 콘크리트 프레임 + 반열림 철문 + 문틈 칠흑 ──
  const doorG = new THREE.Group(); scene.add(doorG);
  bx(doorG, 0.52, 2.7, 0.5, 0x5a5650, -1.06, 1.35, 0);                                   // 좌 기둥
  bx(doorG, 0.52, 2.45, 0.5, 0x545049, 1.09, 1.22, 0).rotation.z = -0.07;                // 우 기둥(기움)
  bx(doorG, 3.0, 0.52, 0.56, 0x4f4b46, 0.06, 2.72, 0).rotation.z = 0.05;                 // 상인방(내려앉음)
  bx(doorG, 0.5, 0.34, 0.5, 0x47433e, 1.28, 2.32, 0.06).rotation.z = 0.3;                // 상인방 파편
  for (const [rx, ry, rs, rr] of [[-1.5, 0.14, 0.42, 0.2], [-0.6, 0.1, 0.3, -0.4], [1.5, 0.18, 0.5, 0.5], [0.8, 0.09, 0.26, 1.1], [-2.1, 0.1, 0.3, 0.8]])
    bx(doorG, rs, rs * 0.7, rs, 0x3e3b3f, rx, ry, 1.0 + rr * 0.4).rotation.y = rr;       // 발치 잔해
  for (const [bx2, by2, brz] of [[-0.7, 2.9, 0.5], [0.5, 3.0, -0.7], [1.3, 2.75, 1.2]]) {
    const rb = bx(doorG, 0.035, 0.6, 0.035, 0x6a4a30, bx2, by2, 0.1); rb.rotation.z = brz; // 철근 삐침
  }
  const darkIn = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 2.4), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  darkIn.position.set(0, 1.2, -0.08); doorG.add(darkIn);                                  // 안 = 완전한 어둠(디렉터 스펙)
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.78, 0, 0.12); doorG.add(doorPivot);
  const doorPanel = bx(doorPivot, 0.82, 2.14, 0.07, 0x49505a, 0.41, 1.07, 0);             // 철문(경첩=좌변)
  bx(doorPivot, 0.82, 0.06, 0.075, 0x3a4048, 0.41, 1.85, 0);                              // 보강 리브
  bx(doorPivot, 0.82, 0.06, 0.075, 0x3a4048, 0.41, 0.35, 0);
  bx(doorPivot, 0.07, 0.16, 0.08, 0x2c3138, 0.74, 1.05, 0.02);                            // 손잡이
  doorPivot.rotation.y = 0.85;                                                            // 반쯤 열림 — 어둠이 보인다
  // 부유 먼지
  const dustN = 50, dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 5; dustPos[i * 3 + 1] = Math.random() * 2.8; dustPos[i * 3 + 2] = Math.random() * 3; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xcabfa8, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);
  // ── 장면 2: 상자 (입장 시 생성) ──
  let chestG = null, lidPivot = null, rays = null, lootSprite = null, debris = null, glowIn = null;
  const buildChest = () => {
    chestG = new THREE.Group(); scene.add(chestG);
    const body = 0x6a5a42, rim = 0x8a8f96;
    bx(chestG, 1.12, 0.58, 0.72, body, 0, 0.29, 0);                                       // 몸통(군용 궤짝)
    bx(chestG, 1.16, 0.05, 0.76, shade(body, 0.75), 0, 0.035, 0);                         // 하단 굽
    for (const ex of [-0.54, 0.54]) bx(chestG, 0.05, 0.6, 0.74, shade(body, 0.82), ex, 0.3, 0); // 모서리 판
    for (const ez of [-0.34, 0.34]) bx(chestG, 1.14, 0.05, 0.05, rim, 0, 0.56, ez);       // 상단 금속 림
    bx(chestG, 0.16, 0.12, 0.05, rim, 0, 0.5, 0.375);                                     // 걸쇠
    lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.58, -0.36); chestG.add(lidPivot);
    bx(lidPivot, 1.16, 0.16, 0.78, shade(body, 1.12), 0, 0.08, 0.36);                     // 뚜껑(경첩=뒷변)
    bx(lidPivot, 1.18, 0.05, 0.06, rim, 0, 0.14, 0.7);                                    // 뚜껑 앞 림
    const gi = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshBasicMaterial({
      color: BAL.lootRarity[collapseLootFx?.tier] ?? BAL.lootRarity.common, // #213: 내부 발광판도 등급 색 — 뚜껑 틈으로 새는 빛부터 등급을 말한다
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    gi.rotation.x = -Math.PI / 2; gi.position.set(0, 0.6, 0); chestG.add(gi); glowIn = gi; // 내부 발광판
  };
  /* #213(디렉터 "실 모델링으로 만들자 / 단, 아쉽게 하찮아야해") — 상자에서 떠오르는 전리품 복셀 5종.
     톤 규약: 폐허를 뜯어서 나온 것들이다. 작고, 칙칙하고, 낡았다. 광선 부챗살은 웅장하게 쏘는데
       그 끝에 뜨는 건 실패 한 개 — 그 낙차가 정서다. 새 것·반짝이는 것·큰 것 금지.
     스케일 규약: 대략 0.2~0.3u 안(상자 폭 1.12u의 1/4 이하). spawnBurst가 0.01→목표로 팝인시킨다.
     bx(g,w,h,d,c,x,y,z)는 이 비네트의 로컬 헬퍼(6468행) — 셸터 빌더의 B()와 같은 문법(y=중심). */
  function buildLootModel(kind, body) {
    const outer = new THREE.Group();
    const g = new THREE.Group(); outer.add(g);
    /* 스케일 래퍼: 아래 치수는 0.2u 안쪽으로 쓰기 좋게 잡았지만, 그대로면 화면의 3.4%로 갈색 점이 된다(실측).
       구 이모지는 Sprite라 scale 0.68 = 0.68u = 화면 17%였다 — 5배 차. "하찮게"는 물건의 격이지 안 보임이 아니다.
       ×2.6 → 0.52u × 0.68 = 화면 8.8% = 이모지의 절반 존재감. 상자 폭(28%)의 1/3이라 여전히 초라하다.
       래퍼를 쓰는 이유: 애니메이션이 최상위 scale.setScalar()로 팝인을 굴린다 — 안쪽에 재우면 안 밟힌다. */
    g.scale.setScalar(2.6);
    if (kind === 'paint') {
      const can = body ?? 0x8a7f72;
      bx(g, 0.17, 0.2, 0.17, can, 0, 0, 0);                                  // 깡통 몸통 = 그 도료 계열 색(정체 채널)
      bx(g, 0.19, 0.02, 0.19, shade(can, 0.7), 0, -0.1, 0);                  // 바닥 테
      bx(g, 0.19, 0.025, 0.19, shade(can, 1.25), 0, 0.085, 0);               // 상단 테
      const lid = bx(g, 0.16, 0.02, 0.16, shade(can, 1.15), 0.12, 0.02, 0.06); // 뚜껑 — 열려서 옆에 떨어져 있다
      lid.rotation.z = 1.1; lid.rotation.x = 0.3;
      bx(g, 0.05, 0.11, 0.02, shade(can, 0.85), 0.075, -0.03, 0.088);        // 흘러내린 자국
      bx(g, 0.09, 0.012, 0.02, shade(can, 0.9), 0, -0.104, 0.05);            // 바닥에 고인 자국
    } else if (kind === 'blueprint') {
      const paper = 0xb9ae93;
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8), M(paper)); // 말린 종이 — 구겨진 두루마리
      roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.25; g.add(roll);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.27, 6), M(shade(paper, 0.55)));
      inner.rotation.z = Math.PI / 2; inner.rotation.y = 0.25; g.add(inner);  // 심지 구멍(어둠)
      const tie = bx(g, 0.02, 0.115, 0.115, 0x6a5a42, 0.02, 0, 0);            // 끈 하나 — 새 것 아님
      tie.rotation.x = 0.2;
      bx(g, 0.055, 0.006, 0.05, shade(paper, 0.8), -0.1, 0.03, 0.02);         // 삐져나온 귀퉁이(접힌 자국)
    } else if (kind === 'cloth') {
      const th = 0x8f8676;
      const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.1, 8), M(shade(th, 1.05))); // 감다 만 실뭉치
      g.add(spool);
      for (const fy of [-0.062, 0.062]) {                                     // 실패 양끝 판
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.014, 8), M(0x6a5a42));
        f.position.y = fy; g.add(f);
      }
      const tail = bx(g, 0.008, 0.075, 0.008, shade(th, 1.1), 0.052, -0.05, 0.03); // 삐져나온 실 끝 — 하찮음의 핵심
      tail.rotation.z = 0.5; tail.rotation.x = -0.35;
    } else if (kind === 'parts') {
      const steel = 0x7c7f86;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.19, 6), M(shade(steel, 0.85))); // 녹슨 나사 하나
      bolt.rotation.z = 0.35; g.add(bolt);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.032, 6), M(steel));
      head.position.set(-0.033, 0.093, 0); head.rotation.z = 0.35; g.add(head);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.028, 6), M(shade(steel, 0.7))); // 너트는 반쯤 풀려 있다
      nut.position.set(0.02, -0.055, 0); nut.rotation.z = 0.35 + 0.4; g.add(nut);
      bx(g, 0.03, 0.02, 0.03, 0x8a5a3a, 0.005, -0.015, 0.026);                // 녹 얼룩
    } else { // cat — 물건이 아니라 기척. 발자국 한 쌍만 떠오른다.
      const pad = 0xffd487;
      for (const [px, pz] of [[-0.05, 0.03], [0.05, -0.03]]) {
        bx(g, 0.055, 0.012, 0.045, pad, px, 0, pz);                           // 발바닥
        for (const tx of [-0.019, 0, 0.019]) bx(g, 0.013, 0.01, 0.013, pad, px + tx, 0.001, pz - 0.036); // 발가락 3
      }
    }
    return outer;
  }
  const spawnBurst = () => {
    // #213: 광선·파편·내부 발광은 **등급** 색(BAL.lootRarity). 물건 자신의 색(도료 몸통)과 별개 채널이다 —
    //   구 동작은 도료가 제 스와치로 튀어서 파란 도료와 회색 잡템을 색으로 구분할 수 없었다.
    const col = BAL.lootRarity[collapseLootFx?.tier] ?? BAL.lootRarity.common;
    rays = new THREE.Group(); chestG.add(rays);                                           // 광선 부챗살(레퍼런스 f008)
    for (const [rz, w] of [[-0.42, 0.26], [-0.2, 0.3], [0, 0.36], [0.2, 0.3], [0.42, 0.26]]) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(w, 5.2), new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ray.position.set(rz * 0.5, 0.6, 0); ray.rotation.z = rz; ray.userData.baseOp = 0.62 - Math.abs(rz) * 0.4;
      rays.add(ray);
    }
    lootSprite = buildLootModel(collapseLootFx?.kind, collapseLootFx?.body);              // #213: 이모지 스프라이트 → 복셀 모델
    lootSprite.position.set(0, 0.7, 0.1); lootSprite.scale.setScalar(0.01); chestG.add(lootSprite);
    debris = [];                                                                          // 파편 산개(레퍼런스 f010 보석 파편)
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.05), new THREE.MeshBasicMaterial({ color: shade(col, 0.75 + Math.random() * 0.6), transparent: true }));
      d.position.set(0, 0.62, 0);
      const a = Math.random() * Math.PI * 2, sp = 0.9 + Math.random() * 1.4;
      d.userData.v = { x: Math.cos(a) * sp * 0.7, y: 1.6 + Math.random() * 1.6, z: Math.sin(a) * sp * 0.5 };
      d.userData.rs = (Math.random() - 0.5) * 8;
      chestG.add(d); debris.push(d);
    }
    playSfx('craft', { rate: 0.82, vol: 0.6 });
  };
  // ── 상태 머신: door → (선택) → chest → 결과 ──
  let phase = 'door', done = false, ct0 = 0, opened = false, openT = 0;
  const cleanup = () => {
    if (done) return; done = true;
    removeEventListener('resize', fit);
    ov.style.opacity = '0';
    setTimeout(() => { ov.remove(); vr.dispose(); disposeDeep(scene); releaseVignette(); }, 550);
  };
  const showChoice = () => {
    ui.innerHTML = `
      <div style="color:#e8e0d0;font-size:13px;font-weight:bold;text-shadow:0 2px 8px #000">${icon('icon_ev_collapsed_entrance', ev.icon)} ${evTitle}</div>
      <div style="color:#cfc6b4;font-size:11px;line-height:1.85;text-shadow:0 2px 8px #000">${ev.textFn ? ev.textFn() : ''}</div>
      <button class="pixel-btn primary" data-cc="0">${t('ev.collapse.c0')}</button>
      <button class="pixel-btn" data-cc="1">${t('ev.collapse.c1')}</button>`;
    ui.querySelectorAll('button[data-cc]').forEach(b => b.addEventListener('click', () => {
      const c = ev.choices[+b.dataset.cc];
      const result = c.run();                                    // 보상·부상·문안 — 카드와 동일 경로
      state.dayLog.notes.push(t('event.metNote', { icon: ev.icon, title: evTitle }));
      scheduleSave(); renderResBar();
      if (b.dataset.cc === '1') { toast(result); cleanup(); return; }  // 그냥 간다 — 조용히 물러난다
      ui.innerHTML = '';
      fade.style.opacity = '1';                                   // 문지방을 넘는다 — 암전
      setTimeout(() => {
        scene.remove(doorG); disposeDeep(doorG);
        torch.position.set(0.4, 1.6, 2.2); torch.intensity = 1.2;
        buildChest();
        phase = 'chest'; ct0 = performance.now();
        fade.style.opacity = '0';
        setTimeout(() => {                                        // 결과 시트 (개봉 여운 뒤)
          ui.innerHTML = `
            <div style="color:#e8e0d0;font-size:12px;line-height:1.85;text-shadow:0 2px 8px #000;background:rgba(10,8,6,0.55);padding:10px 12px;border-radius:6px">${result}</div>
            <button class="pixel-btn primary" data-cx="1">${t('modal.close')}</button>`;
          ui.querySelector('button[data-cx]').addEventListener('click', cleanup);
        }, 2300);
      }, 380);
    }));
  };
  showChoice();
  const camDoor = tt => { const z = 6.4 - tt * 1.5, y = 1.75 - tt * 0.3; camera.position.set(0.4 * Math.sin(tt * 0.9), y, z); camera.lookAt(0, 1.15, 0); };
  const t0 = performance.now();
  (function loop() {
    if (done) return;
    const now = performance.now();
    if (phase === 'door') {
      camDoor(Math.min(1, (now - t0) / 9000));                    // 9초 느린 푸시인 후 정지
      doorPivot.rotation.y = 0.85 + Math.sin(now * 0.0011) * 0.012; // 바람에 삐걱이는 문
      const dp = dust.geometry.attributes.position;
      for (let i = 0; i < dustN; i++) { dp.array[i * 3 + 1] += 0.0016; if (dp.array[i * 3 + 1] > 2.8) dp.array[i * 3 + 1] = 0; }
      dp.needsUpdate = true;
    } else {
      const ct = (now - ct0) / 1000;
      camera.position.set(Math.sin(ct * 0.25) * 0.3, 1.6, 3.4); camera.lookAt(0, 0.95, 0);
      if (ct < 0.55) {                                            // 예열 — 들썩이는 상자
        chestG.rotation.z = Math.sin(ct * 52) * 0.022 * (0.55 - ct) * 2;
        chestG.position.y = Math.abs(Math.sin(ct * 26)) * 0.035 * (0.55 - ct);
      } else {
        if (!opened) { opened = true; openT = ct; spawnBurst(); }
        chestG.rotation.z = 0; chestG.position.y = 0;
        const ot = ct - openT;
        lidPivot.rotation.x = -Math.min(1, ot / 0.14) * 2.05;     // 뚜껑 팝
        if (glowIn) glowIn.material.opacity = Math.min(0.85, ot * 4) * Math.max(0.35, 1 - ot * 0.25);
        if (rays) for (const ray of rays.children) {
          ray.scale.y = Math.min(1, ot / 0.28);
          ray.material.opacity = ot < 1.7 ? ray.userData.baseOp * Math.min(1, ot / 0.2) : Math.max(0, ray.userData.baseOp * (1 - (ot - 1.7) / 0.8));
        }
        if (lootSprite) {                                          // 전리품 상승 + 팝 스케일 + 부유 (디렉터: 아이콘 축소 0.68)
          const rt = Math.min(1, ot / 0.7), ease = 1 - Math.pow(1 - rt, 3);
          lootSprite.position.y = 0.7 + ease * 1.05 + (ot > 0.7 ? Math.sin((ot - 0.7) * 2.4) * 0.06 : 0);
          lootSprite.scale.setScalar(rt < 0.85 ? 0.68 * ease : 0.68 - 0.1 * Math.min(1, (rt - 0.85) / 0.15));
          // #213: 복셀은 스프라이트와 달리 카메라를 향해 주지 않는다 — 느리게 돌려 입체를 보여준다.
          //   빠르면 '전시대 위 보물'이 되고, 이건 하찮아야 한다. 반 바퀴 남짓만 천천히.
          lootSprite.rotation.y = 0.5 + ot * 0.7;
          lootSprite.rotation.x = 0.18; // 살짝 기울여 윗면이 보이게(정면 실루엣만이면 납작해 보인다)
        }
        if (debris) for (const d of debris) {
          d.userData.v.y -= 4.6 * 0.016;
          d.position.x += d.userData.v.x * 0.016; d.position.y += d.userData.v.y * 0.016; d.position.z += d.userData.v.z * 0.016;
          d.rotation.x += d.userData.rs * 0.016; d.rotation.z += d.userData.rs * 0.012;
          if (d.position.y < 0.03) { d.position.y = 0.03; d.userData.v.y = 0; d.userData.v.x *= 0.9; d.userData.v.z *= 0.9; }
          if (ot > 1.9) d.material.opacity = Math.max(0, 1 - (ot - 1.9) / 0.7);
        }
        if (ot > 0.05 && ot < 0.22) camera.position.y += Math.sin(ot * 90) * 0.018;       // 개봉 순간 카메라 잔떨림
      }
    }
    vr.render(scene, camera);
    requestAnimationFrame(loop);
  })();
}
/* ── #150 희귀템 발견 컷: 인엔진 디오라마 비네트 ──
   시그니처 도면(지역 독점 가구)을 손에 넣는 순간, 그 가구를 '실제 복셀 메시'로 페데스탈 위에 올려
   따뜻한 스팟 + 반짝임 + 느린 카메라 푸시로 보여준다 — 도파민 루프(REWARD-LOOP ②)의 정점 연출.
   트리거는 큐: resolveExpedition 흐름 중엔 쌓기만 하고(queueDiscovery), 모달 닫힌 안전한 순간에 재생(drain). */
let discoveryQueue = [];
function queueDiscovery(defId, colorIdx, tier, name) {
  if (!DEFS[defId] || typeof DEFS[defId].build !== 'function') return;
  discoveryQueue.push({ defId, colorIdx: colorIdx || 0, tier: tier || 3, name: name || LName(DEFS[defId]) });
}
function drainDiscoveryQueue() {
  // 2.0-(b) 가이거 비네트(디렉터 2026-07-17): 동쪽 소문이 닿은 아침 — 보고 모달이 닫힌 뒤 계수기 컷 1회.
  //   "낙진이 걷혀서 열리는 길"의 물증: 바늘이 빨강에서 초록으로 내려앉는다.
  if (state.geigerPending && !vignetteBusy() && !paused && !titleVisible && !state.exp) {
    const mb0 = document.getElementById('modal-back');
    if (!(mb0 && mb0.classList.contains('show'))) {
      state.geigerPending = false;
      playGeigerVignette();
      scheduleSave();
      return;
    }
  }
  // 2.0-(b) 국경 개통 비네트: 「국경 길」 3단 완공 직후 — 완공 토스트·모달이 걷힌 뒤 개통 컷 1회.
  if (state.eastGatePending && !vignetteBusy() && !paused && !titleVisible && !state.exp) {
    const mb1 = document.getElementById('modal-back');
    if (!(mb1 && mb1.classList.contains('show'))) {
      state.eastGatePending = false;
      playEastGateVignette();
      scheduleSave();
      return;
    }
  }
  if (!discoveryQueue.length || vignetteBusy() || paused || titleVisible || state.exp) return;
  const mb = document.getElementById('modal-back'); if (mb && mb.classList.contains('show')) return; // 결산/보고 모달 닫힌 뒤 재생
  const d = discoveryQueue.shift();
  showDiscoveryVignette(d.defId, d.colorIdx, d.tier, d.name);
}
// (Tier6a) 발견 컷 씬 빌더+연출은 render/vignettes.js로 이관 — 큐 게이트(위)만 잔류.
// 「콘크리트 정글의 해」 — 펜트하우스 발코니 조망 비네트. 아침(<12시)=해돋이, 이후=해넘이.
//   전 구간을 골든아워→어스름으로 압축(밋밋한 '낮' 없음). 실루엣은 역광으로 어둡게, 지평선만 타오른다.
// 발코니 조망 트리거 (디렉터 2026-07-09): 펜트하우스 발코니 데크 더블탭 → 「콘크리트 정글의 해」.
//   시각 표시 0 — 데크 자체가 트리거(y=0 평면 히트를 balcony 사각형으로 판정, 히든 더블탭 문법).
let balconyTapAt = 0;
function pickBalconyView(e) {
  const bal = SHELTERS[state.current]?.balcony;
  if (!bal || vignetteBusy() || paused) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const tr = -raycaster.ray.origin.y / raycaster.ray.direction.y;
  if (!(tr > 0)) return false;
  const px = raycaster.ray.origin.x + raycaster.ray.direction.x * tr;
  const pz = raycaster.ray.origin.z + raycaster.ray.direction.z * tr;
  if (px < bal.x0 || px > bal.x1 || pz < bal.z0 || pz > bal.z1) return false;
  const nb = performance.now();
  if (nb - balconyTapAt > 450) { balconyTapAt = nb; return true; }
  balconyTapAt = 0;
  playJungleSunVignette();
  return true;
}

// 발코니 조망 은근한 신호 (디렉터 2026-07-18): 더블탭 발동은 그대로(발견의 결) — 여기 조망 포인트가 있다는
//   최소 어포던스만 얹는다. ① 데크에 희미한 앰버 글린트 펄스 ② 호버 시 커서 포인터(데스크톱). 글린트는 골든
//   동결 중 숨겨(비결정 배제) 펜트하우스 골든 레퍼런스 불변 — 실플레이에서만 보인다.
let _balHint = null, _balHover = false;
function tickBalconyHint(t) {
  const bal = SHELTERS[state.current] && SHELTERS[state.current].balcony;
  if (!_balHint) {
    _balHint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexOnce(), color: 0xffce94, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    _balHint.scale.set(0.5, 0.5, 0.5); _balHint.renderOrder = 4; scene.add(_balHint);
  }
  const show = !!bal && !isGoldenFrozen() && !vignetteBusy() && !editMode && !paused && !titleVisible;
  _balHint.visible = show;
  if (show) {
    _balHint.position.set((bal.x0 + bal.x1) / 2, 1.02, bal.z0 + 0.35);
    _balHint.material.opacity = 0.10 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.5));
  }
}
addEventListener('pointermove', e => {
  const bal = SHELTERS[state.current] && SHELTERS[state.current].balcony;
  let over = false;
  if (bal && !vignetteBusy() && !editMode && !paused && !titleVisible) {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const tr = -raycaster.ray.origin.y / raycaster.ray.direction.y;
    if (tr > 0) {
      const px = raycaster.ray.origin.x + raycaster.ray.direction.x * tr;
      const pz = raycaster.ray.origin.z + raycaster.ray.direction.z * tr;
      over = px >= bal.x0 && px <= bal.x1 && pz >= bal.z0 && pz <= bal.z1;
    }
  }
  // #146 다리 조망 호버 — 노을 창에서만 (bridgeSightHit이 시간·셸터 게이트를 겸한다)
  if (!over && !vignetteBusy() && !editMode && !paused && !titleVisible && bridgeSightHit(e)) over = true;
  if (over !== _balHover) { canvas.style.cursor = over ? 'pointer' : ''; _balHover = over; }
});

// 「불타는 해협」 — 아포칼립스 금문교 노을 (#146, 디렉터 레퍼런스 대조 리워크).
//   평면 측면 실루엣 폐기 → 3/4 후퇴 원근(다리 축을 따라 내려다봄) + 초목의 잠식 + 따뜻한 앰버 팔레트
//   + 전경 서사(부서진 차·접근 고가·침몰선·도심 실루엣). 박스/스프라이트/캔버스 관용구만(셰이더/에셋 없음).

// #146 지역 결선 (디렉터 2026-07-23): 다리 관리소에서 노을 질 때 무너진 현수교를 클릭 → 「불타는 해협」.
//   판정 = 다리 실루엣 평면(z=bridgeSight.z)과의 레이 교차 — 발코니의 y=0 평면 문법을 수직판으로 돌린 것.
//   노을 창 = 저녁~어스름 초입(16.5~20시, timeLabel 경계와 동일 축). 창 밖에선 트리거·커서·글린트 전부 침묵.
//   발동은 단일 클릭(디렉터 원문 "다리쪽 클릭이 트리거야") — 발코니 더블탭과 달리 커서+글린트가 어포던스를 이미 준다.
//   부작용 승인 전제: 노을 동안 다리 영역에서 드래그-팬 시작이 비네트로 이어진다(팬은 화면 다른 곳에서 가능).
function bridgeSightRect() {
  const bs = SHELTERS[state.current] && SHELTERS[state.current].bridgeSight;
  if (!bs) return null;
  const h = gameHour();
  return (h >= 16.5 && h < 20) ? bs : null;
}
function bridgeSightHit(e) {
  const bs = bridgeSightRect();
  if (!bs) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const dz = raycaster.ray.direction.z;
  if (Math.abs(dz) < 1e-6) return false;
  const tr = (bs.z - raycaster.ray.origin.z) / dz;
  if (!(tr > 0)) return false;
  const px = raycaster.ray.origin.x + raycaster.ray.direction.x * tr;
  const py = raycaster.ray.origin.y + raycaster.ray.direction.y * tr;
  return px >= bs.x0 && px <= bs.x1 && py >= bs.y0 && py <= bs.y1;
}
function pickBridgeSight(e) {
  if (vignetteBusy() || paused) return false;
  if (!bridgeSightHit(e)) return false;
  playGoldenGateVignette();
  return true;
}
// 은근한 신호 — 발코니와 동일 문법(글린트 펄스 + 호버 커서), 골든 동결 중 숨김(비결정 배제).
//   위치 = 끊긴 상판 사이 허공(협곡 중앙) — 노을빛이 새는 자리라는 픽션.
let _bridgeHint = null;
function tickBridgeHint(t) {
  if (!_bridgeHint) {
    _bridgeHint = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTexOnce(), color: 0xffb066, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    _bridgeHint.raycast = () => {}; // Sprite raycast noop 필수 (카메라 미설정 레이 크래시 함정 — 프로젝트 룰)
    _bridgeHint.scale.set(1.6, 1.6, 1.6); _bridgeHint.renderOrder = 4; scene.add(_bridgeHint);
  }
  const bs = bridgeSightRect();
  const show = !!bs && !isGoldenFrozen() && !vignetteBusy() && !editMode && !paused && !titleVisible;
  _bridgeHint.visible = show;
  if (show) {
    _bridgeHint.position.set((bs.x0 + bs.x1) * 0.5 + 4, 0.4, bs.z - 0.5); // 끊긴 구간(-4..8) 중앙께
    _bridgeHint.material.opacity = 0.16 + 0.11 * (0.5 + 0.5 * Math.sin(t * 1.3));
  }
}

let hiddenTapAt = 0;
function pickHidden(e) {
  // 침묵 루트는 생존·혹한 전용 (디렉터 확정 2026-07-10): 코지에서 이 벽은 영원히 그냥 벽이다.
  //   히든 사슬 전체(발견→개척→유보→문서→사일로)가 subwayHidden에서 시작하므로 이 게이트 하나로 봉인.
  //   메트로 2033 오마주 — 그 무게는 겨울이 이빨을 드러내는 모드의 것.
  if (!isHard()) return false;
  if (!subwayHiddenObj || state.current !== 'subway') return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  let vis = true; for (let o = subwayHiddenObj; o; o = o.parent) if (o.visible === false) { vis = false; break; }
  if (!vis) return false;
  const hits = raycaster.intersectObject(subwayHiddenObj, true);
  if (!hits.length) return false;
  if (state.subwayHidden) {
    // 발견 후: 유보를 마친 사람에게만 이 개구부가 문서(=침묵 루트의 문)로 이어진다. 그 전엔 어둠뿐.
    if (state.hiddenGateDone && state.hiddenReached) { showDoctorDocPage(); return true; }
    return true;
  }
  const open = state.subwayOpen || {};
  if (!(open.residential && open.commercial && open.industrial)) { hiddenTapAt = 0; return true; } // 노선이 다 이어지기 전엔 그냥 벽
  const now = performance.now();
  if (now - hiddenTapAt < 450) {
    hiddenTapAt = 0;
    state.subwayHidden = true;
    state.dayLog.notes.push(t('hidden.foundNote'));
    toast(t('hidden.foundToast'));
    playSfx('craft');
    scheduleSave();
    rebuildShelterGeometry(); // 그 순간부터 이 역은 다른 곳이 된다 — 붉은 비상등만 남는 조명 전환(디렉터 확정) + 개구부 현장
    return true;
  }
  hiddenTapAt = now;
  return true;
}
// 고양이 쓰다듬기: catObj.g 대상 별도 히트테스트 (하루 3회 제한)
let petDay = 0, petCount = 0;
function pickCat(e) {
  const _cat = getCat();
  if (!_cat) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(_cat.g, true);
  if (!hits.length) return false;
  if (petDay !== state.day) { petDay = state.day; petCount = 0; }
  if (petCount >= 3) return true; // 히트는 소비하되 보상 없음(오늘 한도 초과)
  petCount++;
  petCatResponse(); // ② 쓰다듬기 연계 연출(눈 감김·갸르릉·꼬리 가속) — 클로즈업에서 완성, 평상시에도 동작
  toast(t('cat.pet'));
  return true;
}
// ② 쓰다듬기 반응: 눈 감은 얼굴 2초 + 갸르릉(전용 사운드 없어 야옹 저피치로 대체) + 꼬리 살랑 가속.
//   클로즈업(catCam.active) 여부와 무관하게 동작하되, 연출은 클로즈업에서 완성되도록 설계.
//   PET_HAPPY_MS는 cat.js(updateCat 감쇠)와 공유하므로 팩토리 호출 전에 선언한다(상단 이동).
function petCatResponse() {
  const _cat = getCat();
  if (!_cat) return;
  _cat.petHappy = PET_HAPPY_MS / 1000; // 남은 눈감김 시간(초)
  _cat.petPurr = 1;                     // 꼬리 가속 계수(1→0 감쇠)
  // #93 진짜 갸르릉 (디렉터 소스 Cat_purr): 저피치 야옹 근사를 전용 사운드로 교체. 눈감김 2초에 맞춰 잦아든다.
  playSfx('purr', { vol: 0.9, jitter: 0.02, dur: 2.6, fade: 0.6 });
}
// #93 방석 골골 기믹: 잠든 고양이(엎드림 12초+ 또는 sleep)가 방석 위면 은은한 골골이 이따금 —
//   코지 사운드스케이프. 방석 반경 0.5, 11~17초 간격, 낮은 볼륨(0.28)으로 "방에 고양이가 산다"는 배음.
let _purrNext = 3;
function tickCatPurr(dt) {
  const c = getCat();
  const asleep = c && (c.mode === 'sleep' || (c.mode === 'sprawl' && (c.sprawlFor || 0) > 12));
  if (!asleep) { _purrNext = 3; return; }
  _purrNext -= dt;
  if (_purrNext > 0) return;
  _purrNext = 11 + Math.random() * 6;
  const onCushion = items.some(it => /cushion|cathammock/i.test(it.defId) // #230: 해먹 낮잠도 골골(방석 기믹 확장)
    && Math.hypot((it.x ?? 0) - c.g.position.x, (it.z ?? 0) - c.g.position.z) < 0.5);
  if (onCushion) playSfx('purr', { vol: 0.28, rate: 0.95, jitter: 0.03, dur: 6, fade: 1.4 });
}
function pickItem(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(itemsRoot.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.item) o = o.parent;
    if (o) return o.userData.item;
  }
  return null;
}
// 조명 설비(펜던트) 클릭 판정 — scene 소속이라 pickItem(itemsRoot) 밖. 별도 레이.
function pickLightFixture(e) {
  if (!lightingFixture) return false;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObject(lightingFixture, true).length > 0;
}
// 조명 켜고 끄기 (디렉터 2026-07-24): 태양광/발전기 급전 중일 때만 켜진다. 단전 중엔 못 켬.
function toggleFacilityLight() {
  if (!hasMod('lighting')) return;
  state.lightOff = state.lightOff || {};
  const nowOff = !!state.lightOff[state.current];
  if (nowOff && state.lightingOut) { toast(t('light.noPower')); return; } // 꺼진 걸 켜려는데 전원이 없음
  state.lightOff[state.current] = !nowOff;
  updateLightingRig();
  toast(t(state.lightOff[state.current] ? 'light.off' : 'light.on'));
  try { flushSave(); } catch (err) { /* */ }
  renderFrame();
}
const snap = v => Math.round(v / GRID) * GRID;

function moveGhost(item, e) {
  const p = pointerToFloor(e);
  if (!p) return;
  const [x, z] = clampToRoom(item, snap(p.x), snap(p.z));
  const dx = x - item.x, dz = z - item.z;
  item.x = x; item.z = z;
  const bad = collides(item, x, z); // _support 계산 포함
  item.y = restingY(item, x, z); // #209: 상판 위 or 러그 바닥 올림
  item.support = item._support ? item._support.other : null;
  syncTransform(item);
  // 상판 위에 올려둔 소품도 함께 이동
  if (DEFS[item.defId].surface && (dx || dz)) {
    for (const ch of itemsOn(item)) { ch.x += dx; ch.z += dz; syncTransform(ch); }
  }
  setGhostVisual(item, bad ? 'invalid' : 'valid');
  item._valid = !bad;
}
function startPlacing(defId) {
  if (paused) { toast(t('pause.blocked')); return; }
  if ((state.inventory[defId] || 0) <= 0) {
    // #193: 획득 경로별 안내 분기 — 제작 가구에 "탐험에서 구해 오자"는 틀린 길잡이(양초류 혼동의 동류)
    toast(t(FURN_CRAFT.has(defId) ? 'place.noStockCraft' : 'place.noStock', { name: LName(DEFS[defId]) }));
    return;
  }
  let maxN = SHELTERS[state.current].maxItems;
  if (maxN && hasMod('shelf')) maxN += 4;
  if (maxN && items.length >= maxN) {
    toast(t('place.maxItems', { shelter: LName(SHELTERS[state.current]), n: maxN }));
    return;
  }
  cancelPlacing();
  deselect();
  const item = addItem(defId, 0, 0, 0, 0, true, 0, DEFS[defId].tiered ? 1 : 0); // #157: 새 배치는 T1부터 — 손질해서 키운다
  placing = item;
  item._valid = !collides(item, 0, 0);
  setGhostVisual(item, item._valid ? 'valid' : 'invalid');
  gridObj.visible = true;
  $('btn-cancel-place').classList.add('show');
}
function cancelPlacing() {
  $('btn-cancel-place').classList.remove('show');
  if (!placing) return;
  removeItem(placing);
  placing = null;
  gridObj.visible = false;
}
function finishPlacing() {
  if (!placing || !placing._valid) { toast(t('place.cantHere')); return; }
  $('btn-cancel-place').classList.remove('show');
  setGhostVisual(placing, null);
  const item = placing;
  placing = null;
  gridObj.visible = false;
  state.inventory[item.defId]--;
  markCollection(item.defId, item.colorIdx);
  if (DEFS[item.defId].surface) tipOnce('tip.stack'); // 찢어진 쪽지: 첫 스태킹 가능 가구(테이블 등) 배치
  renderInventoryBar();
  select(item, true); // 배치 확정음(아래 playSfx('place'))과 중복되지 않게 select의 클릭음은 생략
  questProgress('place');
  scheduleSave();
  playSfx('place');
}
function select(item, silent = false) {
  deselect();
  selected = item;
  showSelPanel(item);
  updateSelRing();
  // 아이템 클릭 상호작용음 (가벼운 '톡') — 라디오는 radio_noise가 별도로 재생되므로 중복 방지 위해 생략
  if (!silent && item.defId !== 'radio') playSfx('place', { vol: 0.25, rate: 1.5, jitter: 0.1 });
}
function deselect() {
  selected = null;
  hideSelPanel();
  updateSelRing();
}
// #193: 수거는 개수만 저장(6861·6880)하고 재배치는 T1·기본색·무젤(6811)이라, 손질 티어(T2/T3)·도색(비기본색)·조명 젤 투자분은 인스턴스와 함께 소실된다 — 소실 대상 판정
const reclaimLosesInvest = it => (DEFS[it.defId].tiered && (it.tier || 3) > 1) || (it.colorIdx || 0) !== 0 || !!it.gel;
async function reclaimSelected() {
  if (!selected) return;
  // #193: 손질·도색·젤 투자 가구는 무경고 소실 금지 — 확인 후 진행 (투자 없으면 기존 무확인 흐름 그대로)
  if (reclaimLosesInvest(selected)
    && !(await gameConfirm(t('reclaim.investConfirm', { name: LName(DEFS[selected.defId]) }), t('reclaim.investOk'), t('reclaim.investCancel')))) return;
  if (!selected) return; // 확인창 대기 중 선택 해제 방어
  // 지속효과 가전(냉장고/정수기/발전기)이 가동 중이면 회수 시 효과 중단을 안내 (비파괴 — 토스트만)
  const app = DEFS[selected.defId].appliance;
  const wasOn = app && selected.on !== false;
  const utilName = LName(DEFS[selected.defId]);
  if (DEFS[selected.defId].surface) dropChildrenOf(selected);
  state.inventory[selected.defId] = (state.inventory[selected.defId] || 0) + 1;
  removeItem(selected);
  deselect();
  renderInventoryBar();
  scheduleSave();
  playSfx('whoosh');
  if (wasOn) toast(t('reclaim.utilityOff', { name: utilName, effect: t(`reclaim.eff.${app.effect}`) }));
}
// 배치 D ④: 전체 수거 — 현재 셸터의 모든 가구를 인벤토리로 거둔다.
//   가전 효과 중단은 요약 1줄로 안내(개별 토스트 폭탄 방지).
async function reclaimAll() {
  const n = items.length;
  if (n <= 0) { toast(t('inv.collectAll.none')); return; }
  // #193: 손질·도색·젤 투자 가구가 섞여 있으면 기존 확인창에 소실 경고 1줄 병기 (창 2개 연속 방지)
  const investN = items.filter(reclaimLosesInvest).length;
  const confirmMsg = t('reclaimAll.confirm', { n }) + (investN > 0 ? ' ' + t('reclaimAll.investWarn', { n: investN }) : '');
  if (!(await gameConfirm(confirmMsg, t('reclaimAll.ok'), t('reclaimAll.cancel')))) return;
  let applianceOff = 0;
  // 스냅샷 복사 후 순회 (removeItem이 items를 변형하므로)
  for (const it of [...items]) {
    const app = DEFS[it.defId].appliance;
    if (app && it.on !== false) applianceOff++;
    state.inventory[it.defId] = (state.inventory[it.defId] || 0) + 1;
    removeItem(it);
  }
  deselect();
  renderInventoryBar();
  scheduleSave();
  playSfx('whoosh');
  toast(t('reclaimAll.done', { n }) + (applianceOff > 0 ? ' ' + t('reclaimAll.applianceOff', { n: applianceOff }) : ''));
}

// 멀티터치 추적: 한 손가락 = 선택/이동/빈 곳 드래그 회전, 두 손가락 = 핀치 줌 + 회전
const touches = new Map();
let pinch = null;      // { dist, zoom, cx }
let orbitDrag = null;  // 빈 공간 좌클릭/터치 드래그 → 카메라 회전

function dropDragging(revert) {
  if (!dragging) return;
  if (revert && dragStart) {
    dragging.x = dragStart.ox; dragging.z = dragStart.oz; dragging.rot = dragStart.or;
    dragging.y = dragStart.oy || 0; dragging.support = dragStart.osup || null;
    for (const k of (dragStart.kids || [])) { k.ch.x = k.x; k.ch.z = k.z; k.ch.rot = k.r; syncTransform(k.ch); }
    syncTransform(dragging);
  }
  setGhostVisual(dragging, null);
  gridObj.visible = false;
  updateSelRing();
  dragging = null; dragStart = null;
}
canvas.addEventListener('pointerdown', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {
    // 핀치 시작 — 진행 중이던 가구 드래그는 원위치
    dropDragging(true);
    orbitDrag = null; orbiting = false;
    const [a, b] = [...touches.values()];
    pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: camState.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    return;
  }
  if (titleVisible) { // #7 피드백: 타이틀(집 배경)에서 드래그 = 시점 회전만. 가구/고양이 픽·편집 유도 없음.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    orbitDrag = { x: e.clientX, y: e.clientY, moved: false, pan: false, dead: 7 };
    return;
  }
  if (e.button === 2) { orbiting = true; lastOrbX = e.clientX; lastOrbY = e.clientY; return; } // 디렉터(2026-07): 우클릭 드래그 = 팬(화면 이동)
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  if (placing) { moveGhost(placing, e); finishPlacing(); return; }
  if (!editMode && pickStairs(e)) return; // #55 배치 모드가 아닐 때만 계단 상호작용 (배치 중 오작동 방지)
  if (pickCat(e)) { if (!editMode) enterCatCloseup(); return; } // 쓰다듬기 + (비배치) 클로즈업 진입 — 히트 소비
  if (!editMode && pickVisitor(e)) { onVisitorClicked(); return; } // #181 방문자 탭 = 대사+선택지 카드 (배치 중 제외)
  if (!editMode) { const _drop = pickDrop(e); if (_drop) { collectDrop(_drop); return; } } // #182 B0 동물 드랍 반짝임 탭 = 수거+카드

  if (!editMode && pickAvatar(e)) { openWardrobeModal(); return; } // #86④ 아바타 탭 = 옷장 (배치 중 제외)
  if (pickLightFixture(e)) { toggleFacilityLight(); return; } // 조명 설비 클릭 = 켜고 끄기 (배치/비배치 공통)
  const hit = pickItem(e);
  if (hit) {
    // 배치 모드 OFF: 가구 선택/이동은 막고, 기능형(라디오/촛불 토글)만 실행.
    // 화면 회전 조작 중 가구가 덥석 잡히는 오작동 방지 (베타 피드백).
    if (!editMode) {
      if (funcClickItem(hit)) return;         // 기능 실행 후 소비 (선택/드래그 없음)
      // 비배치 모드에서 일반 가구 탭 → 배치 모드 진입 유도 팝업 (기능형은 위에서 소비됨)
      offerEditMode(hit);
      orbitDrag = { x: e.clientX, y: e.clientY, moved: false, pan: false }; // 가구가 잡힌 드래그 = 기존 화면 회전 유지(#70: 팬은 빈 공간 전용)
      return;
    }
    // 배치 모드 ON: 선택 + 드래그 이동 허용
    select(hit);
    if (hit.defId === 'radio') playSfx('radio_noise', { vol: 0.5, jitter: 0 }); // 라디오 클릭 시 지지직 1회
    dragging = hit;
    dragStart = {
      sx: e.clientX, sy: e.clientY, ox: hit.x, oz: hit.z, or: hit.rot, moved: false,
      oy: hit.y || 0, osup: hit.support || null,
      kids: DEFS[hit.defId].surface ? itemsOn(hit).map(ch => ({ ch, x: ch.x, z: ch.z, r: ch.rot })) : [],
    };
  } else {
    // §9.6 「침묵」 히든 지점 — 모든 픽 미스 후의 최하위 히트 (시각 표시 0, 소비 시 팬/회전도 시작 안 함)
    if (!editMode && (pickHidden(e) || pickBalconyView(e) || pickBridgeSight(e))) return; // #146 다리 조망은 최하위 히트 축에 합류
    // #70 빈 공간 드래그: 비배치·비클로즈업이면 클램프 팬, 배치 모드/클로즈업 중엔 기존 yaw 회전(팬 비활성 스펙).
    //   팬은 최저 우선순위 — 계단/고양이/가구 픽이 전부 미스인 이 else에서만 시작(select 레이캐스트 경로 불변).
    //   데드존: 팬은 8px(탭 상호작용 보호 스펙), 회전은 기존 7px 유지.
    // 디렉터(2026-07): 기본 드래그(한 손가락/좌클릭) = 회전. 팬(화면 이동)은 두 손가락/우클릭 전용으로 스왑.
    orbitDrag = { x: e.clientX, y: e.clientY, moved: false, pan: false, dead: 7 };
  }
});
addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && touches.size >= 2) {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (catCam.active) exitCatCloseup(); // 핀치 줌/팬도 카메라 조작 → 클로즈업 해제
    camState.zoom = THREE.MathUtils.clamp(pinch.zoom * (d / pinch.dist), 0.25, 3.2); // 핀치 거리 = 줌(유지)
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    panByScreenDelta(cx - pinch.cx, cy - pinch.cy); // 디렉터(2026-07): 두 손가락 이동 = 팬(종전 회전에서 스왑)
    pinch.cx = cx; pinch.cy = cy;
    return;
  }
  if (orbiting) { // 디렉터(2026-07): 우클릭 드래그 = 팬(화면 이동)
    if (catCam.active) exitCatCloseup();
    panByScreenDelta(e.clientX - lastOrbX, e.clientY - lastOrbY);
    lastOrbX = e.clientX; lastOrbY = e.clientY;
    return;
  }
  if (orbitDrag) {
    const dx = e.clientX - orbitDrag.x, dy = e.clientY - orbitDrag.y;
    if (!orbitDrag.moved && Math.hypot(dx, dy) > (orbitDrag.dead || 7)) orbitDrag.moved = true;
    if (orbitDrag.moved) {
      // 피드백 #3(2026-07-15 플레이테스트): 클로즈업 중 회전 드래그 = 고양이 주위를 돈다(클로즈업 유지).
      //   catCam.targetYaw가 매 프레임 camState를 덮으므로 그쪽을 돌려야 한다. 팬 드래그는 기존대로 해제(탈출구).
      if (catCam.active && !orbitDrag.pan) {
        catCam.targetYaw += dx * 0.008;
      } else {
        if (catCam.active) exitCatCloseup(); // 팬으로 카메라를 잡으면 클로즈업 해제(원 카메라 복원)
        if (orbitDrag.pan) panByScreenDelta(dx, dy); // #70 빈 공간 드래그 = 클램프 팬 (마우스/터치 공용)
        else camState.targetYaw += dx * 0.008;
      }
      orbitDrag.x = e.clientX; orbitDrag.y = e.clientY;
    }
    return;
  }
  if (placing) { moveGhost(placing, e); return; }
  if (dragging) {
    if (!dragStart.moved) {
      if (Math.hypot(e.clientX - dragStart.sx, e.clientY - dragStart.sy) < 5) return;
      dragStart.moved = true;
      gridObj.visible = true;
    }
    moveGhost(dragging, e);
    updateSelRing();
  }
});
function onPointerEnd(e) {
  touches.delete(e.pointerId);
  if (pinch && touches.size < 2) pinch = null;
  if (e.button === 2) { orbiting = false; return; }
  if (orbitDrag) {
    if (!orbitDrag.moved) { if (catCam.active) exitCatCloseup(); else deselect(); } // 빈곳 탭 = 클로즈업 해제 or 선택 해제
    orbitDrag = null;
    return;
  }
  if (dragging) {
    if (dragStart.moved) {
      if (!dragging._valid) {
        dragging.x = dragStart.ox; dragging.z = dragStart.oz; dragging.rot = dragStart.or;
        dragging.y = dragStart.oy || 0; dragging.support = dragStart.osup || null;
        for (const k of (dragStart.kids || [])) { k.ch.x = k.x; k.ch.z = k.z; k.ch.rot = k.r; syncTransform(k.ch); }
        syncTransform(dragging);
        toast(t('place.cantHere'));
      } else scheduleSave();
      setGhostVisual(dragging, null);
      gridObj.visible = false;
      updateSelRing();
    }
    dragging = null; dragStart = null;
  }
}
addEventListener('pointerup', onPointerEnd);
addEventListener('pointercancel', onPointerEnd);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (catCam.active) exitCatCloseup(); // 휠 줌도 카메라 조작 → 클로즈업 해제
  camState.zoom = THREE.MathUtils.clamp(camState.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.25, 3.2);
}, { passive: false });

// v2.4: PC 판정 — 포인터가 정밀(마우스)하고 터치 지원이 없는 기기만 "PC"로 취급.
const isPcInput = matchMedia('(pointer: fine)').matches && !('ontouchstart' in window);
// v0.9.1: 모바일(터치 기기/Capacitor 포함) 판정 — 백그라운드 오디오 정책 분기에 사용.
const isMobileEnv = ('ontouchstart' in window) || /Android|iPhone|iPad/i.test(navigator.userAgent);
// #52: 탭형 환경설정 창 — 타이틀 / 인게임 ESC / 모바일 톱니 3경로가 모두 이 전용 오버레이를 개폐한다.
// 중앙 고정 창이라 clampPanel/updateUiScale 위치 로직은 호출하지 않는다(함수 자체는 존치).
// #210: 설정 셸(열기/닫기/토글/탭 전환)은 ui/settings.js로 이관 — renderControlsGuide(키 리바인딩 가이드)만 주입.
//   구조 무변(로직 원문 이관). 콜사이트는 아래 구조분해로 동일 명칭 유지 → 나머지 game.js 무변.
const _settingsUI = makeSettingsUI({ renderControlsGuide: (...a) => renderControlsGuide(...a) });
const { settingsOpen, openSettings, closeSettings, toggleSettingsPanel, openSettingsFromGear, switchSettingsTab, resetTabToDefault: resetSettingsTabToDefault } = _settingsUI;
// 컨트롤 배선(bindControls)은 applyOpts·bgm 등 정의 이후 아래에서 호출(TDZ 회피).
// 컨트롤 탭 — PC = 실제 리바인딩 UI(#14), 모바일 = 제스처 안내표.
// KEYBIND_LABEL·renderControlsGuide·startRebind·captureRebind → ui/keybind.js로 이관(#210 Stage 3).
// 리바인딩 대기상태(awaitingRebind)는 모듈 내부 소유. _keybindUI 생성은 KEYBINDS/KEYBIND_ORDER/keyLabel 정의 이후 아래에서.
// 설정 진입 문법: PC = ESC / 모바일 = 우측 상단 톱니. 창은 중앙 고정.
// ($ 헬퍼는 이 시점에 TDZ라 getElementById 직접 사용)
{
  const gear = document.getElementById('btn-gear');
  if (gear) {
    if (!isPcInput) gear.style.display = '';   // 터치 기기에서만 노출
    gear.addEventListener('click', () => toggleSettingsPanel());
  }
  // 탭 전환 / 닫기 / 기본값 버튼 배선
  document.querySelectorAll('#settings-tabs .settings-tab').forEach(b =>
    b.addEventListener('click', () => switchSettingsTab(b.dataset.tab)));
  document.getElementById('settings-x').addEventListener('click', () => closeSettings());
  document.getElementById('btn-settings-close').addEventListener('click', () => closeSettings());
  // 오버레이 배경 클릭 시 닫기 (창 내부 클릭은 유지)
  document.getElementById('settings-screen').addEventListener('pointerdown', e => { if (e.target.id === 'settings-screen') closeSettings(); });
  document.getElementById('btn-settings-default').addEventListener('click', () => resetSettingsTabToDefault());
}
// resetSettingsTabToDefault → ui/settings.js resetTabToDefault (bindControls 주입 dep로 실행). 위 destructure에서 별칭 바인딩.
/* ============================================================
   #14 키 리바인딩 (REQ-INP-01) — 액션 12종. 엔진 1곳(runAction) 경유.
   ------------------------------------------------------------
   · KEYBINDS: 액션 → 기본 KeyboardEvent.code. code 기반(레이아웃 독립)이지만
     Delete/Backspace만 예외적으로 둘 다 허용(관례).
   · 사용자 오버라이드는 localStorage('nw-keys')에 { action: code } 로 저장.
   · ESC는 시스템 예약(설정/취소/닫기 스택) — 리바인딩 대상 아님.
   ============================================================ */
const KEYBIND_DEFAULT = {
  map: 'KeyM',        // 탐험 지도
  migrate: 'KeyG',    // 이주 (Go)
  craft: 'KeyC',      // 제작
  clean: 'KeyX',      // 청소
  sleep: 'KeyZ',      // 취침
  journal: 'KeyJ',    // 일지
  pause: 'KeyP',      // 일시정지
  editMode: 'KeyB',   // 배치 모드 (Build)
  rotViewL: 'KeyQ',   // 시점 회전 좌
  rotViewR: 'KeyE',   // 시점 회전 우
  rotateItem: 'KeyR', // 가구 회전
  reclaim: 'Delete',  // 회수
  hudExt: 'Tab',      // HUD 정보 확장 (홀드 — HUD-SPEC-RECON §1.4)
};
// 리바인딩 UI/안내표 순서 (선언 순서 고정)
const KEYBIND_ORDER = ['map', 'migrate', 'craft', 'clean', 'sleep', 'journal', 'pause', 'editMode', 'rotViewL', 'rotViewR', 'rotateItem', 'reclaim', 'hudExt'];
// const로 두고 항상 제자리 변경(reassign 금지) — 외부(QA/export) 참조가 항상 라이브 상태를 본다.
const KEYBINDS = { ...KEYBIND_DEFAULT };
try {
  const saved = JSON.parse(localStorage.getItem('nw-keys') || 'null');
  if (saved && typeof saved === 'object') for (const a of KEYBIND_ORDER) if (typeof saved[a] === 'string') KEYBINDS[a] = saved[a];
} catch (e) { /* 손상 시 기본값 */ }
function saveKeybinds() { try { localStorage.setItem('nw-keys', JSON.stringify(KEYBINDS)); } catch (e) { /* */ } }
function resetKeybinds() { Object.assign(KEYBINDS, KEYBIND_DEFAULT); saveKeybinds(); }
function keyForAction(a) { return KEYBINDS[a]; }
// 표시용 라벨: 'KeyM'→'M', 'Delete'→'Del', 'Backspace'→'⌫', 'Digit1'→'1' 등
function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = { Delete: 'Del', Backspace: '⌫', Space: 'Space', Enter: 'Enter', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Minus: '-', Equal: '=', Backquote: '`' };
  return map[code] || code;
}
// #210 Stage 3: 컨트롤 탭 키 리바인딩 UI를 ui/keybind.js로 이관. 입력 코어(KEYBINDS 등) 정의 후 생성 →
//   deps 직접 주입(무TDZ). 위 makeSettingsUI ctx의 renderControlsGuide는 아래 destructure를 지연 참조(콜타임 해소).
const _keybindUI = makeKeybindUI({ KEYBINDS, KEYBIND_ORDER, keyLabel, resetKeybinds, saveKeybinds, isPcInput, gameConfirm, toast });
const { renderControlsGuide, captureRebind, isAwaitingRebind } = _keybindUI;
// 이벤트 → 액션. reclaim은 Delete/Backspace 양쪽 허용(관례).
function actionForEvent(e) {
  for (const a of KEYBIND_ORDER) {
    if (e.code === KEYBINDS[a]) return a;
    if (a === 'reclaim' && (e.code === 'Delete' || e.code === 'Backspace') && (KEYBINDS[a] === 'Delete' || KEYBINDS[a] === 'Backspace')) return a;
  }
  return null;
}
// 엔진 1곳: 모든 액션 실행은 여기로 (키/게임패드 공용). 버튼 클릭 동작과 정합.
function runAction(a) {
  switch (a) {
    case 'map':
      if (state.exp || state.injury) { $('exp-panel').classList.toggle('show'); renderExpPanel(); }
      else openObsMap(); // S2: 단축키도 관측 단말 경로 (버튼과 정합)
      break;
    case 'migrate': pdaOpenApp(openShelterModal); break; // #199: 이주도 PDA 앱으로 (버튼 btn-move와 정합)
    case 'craft': pdaOpenApp(openCraftModal); break; // #199: 제작은 PDA 앱으로 (버튼 btn-craft와 정합 — 키/패드 단축키도 동일 경로라야 탭바 스타일·폰트 일관)
    case 'clean': cleanShelter(); break;
    case 'sleep': sleepUntilMorning(); break;
    case 'journal': openJournalModal('journal'); break;
    case 'pause': setPaused(!paused); break;
    case 'editMode': toggleEditMode(); break;
    // v1.5.1(디렉터 "시작하자마자 T자"): 45° 스텝은 한 탭에 정면(0°) 도달 — 정면에선 측벽이 실낱+레일만 떠서
    //   T자 골조로 읽힘. 90° 스텝(대각 4방향 전용)으로 어느 방향이든 2벽이 보이는 3/4 뷰만 허용. 미세 시야는 팬(#70).
    case 'rotViewL': camState.targetYaw -= Math.PI / 2; break;
    case 'rotViewR': camState.targetYaw += Math.PI / 2; break;
    case 'rotateItem': rotateActive(); break;
    case 'reclaim': if (selected && !placing) reclaimSelected(); break;
  }
}
addEventListener('keydown', e => {
  // 리바인딩 캡처 모드: ESC 취소, 그 외 키는 해당 액션에 배정 (대기상태·캡처는 ui/keybind.js 소유)
  if (isAwaitingRebind()) { captureRebind(e); return; }
  if (titleVisible) return;
  // 스크린샷 모드: F2 토글 · (모드 중) Space/Enter 촬영 · Esc 나가기 · Q/E 시점 회전만 통과(그 외 게임 액션 차단).
  if (e.code === 'F2') { e.preventDefault(); togglePhotoMode(); return; }
  if (photoMode) {
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); capturePhoto(); return; }
    if (e.key === 'Escape') { e.preventDefault(); setPhotoMode(false); return; }
    const pa = actionForEvent(e);
    if (pa === 'rotViewL' || pa === 'rotViewR') { e.preventDefault(); runAction(pa); }
    return;
  }
  // 관측 단말(S2): ESC = focus→overview→닫기. 모달이 위에 떠 있으면(준비/눈사태 선택) 기존 체인이 먼저 닫는다.
  //   단말이 열려 있는 동안 다른 게임 단축키는 무시(풀스크린 모드 — 오작동 방지).
  if (obsView.isOpen() && !$('modal-back').classList.contains('show')) {
    if (e.key === 'Escape') obsView.back();
    return;
  }
  if (e.key === 'Escape') {
    // 우선순위: PDA 닫기 > 설정 창 닫기 > 고양이 클로즈업 해제 > 배치 중 취소 > 선택 해제 > 모달 닫기 > (PC) 설정 창 열기
    //   #211: 필드노트 기기 폐지로 노트 분기 삭제 — 우측 기기는 PDA 하나뿐이다.
    if (pdaVisible()) { pdaAppOn ? closeModal() : pdaClose(); } // 앱 모드면 모달 정리+원위치까지(잔류 DOM 방지)
    else if (settingsOpen()) { closeSettings(); }
    else if (catCam.active) { exitCatCloseup(); }
    else if (placing) { cancelPlacing(); }
    else if (selected) { deselect(); }
    else if ($('modal-back').classList.contains('show')) { closeModal(); }
    else if (isPcInput) { openSettings(); }
    return;
  }
  // 설정 창이 열려 있으면(입력 필드 등) 게임 액션 단축키 무시 — 오작동 방지
  if (settingsOpen()) return;
  const act = actionForEvent(e);
  // hudExt만 홀드 문법(누르는 동안) — 단발 runAction과 분리. repeat는 브라우저 키 반복이라 무시.
  if (act === 'hudExt') { e.preventDefault(); if (!e.repeat) hudExtSet(true); return; }
  if (act) { e.preventDefault(); runAction(act); }
});
// 홀드 해제 쌍: keyup + 창 이탈(blur — keyup을 영영 못 받는 경로) 안전장치
addEventListener('keyup', e => { if (e.code === KEYBINDS.hudExt) hudExtSet(false); });
addEventListener('blur', () => hudExtSet(false));
// 지지대 회전 시 위 소품도 함께 90° 공전 (dir=+1: rot+1과 동일 방향)
function rotateChildren(item, dir) {
  if (!DEFS[item.defId].surface) return;
  for (const ch of itemsOn(item)) {
    const dx = ch.x - item.x, dz = ch.z - item.z;
    if (dir > 0) { ch.x = item.x + dz; ch.z = item.z - dx; }
    else { ch.x = item.x - dz; ch.z = item.z + dx; }
    ch.rot = (ch.rot + (dir > 0 ? 1 : 3)) % 4;
    syncTransform(ch);
  }
}
function rotateActive() {
  const item = placing || (dragging && dragStart?.moved ? dragging : selected);
  if (!item) return;
  item.rot = (item.rot + 1) % 4;
  rotateChildren(item, 1);
  const px = item.x, pz = item.z;
  const [x, z] = clampToRoom(item, item.x, item.z);
  item.x = x; item.z = z;
  // #F42: 클램프 델타를 상판 위 소품에 전파 (moveGhost와 동일 — 소품 공중/벽 관통 방지)
  if (DEFS[item.defId].surface) { const dx = item.x - px, dz = item.z - pz; if (dx || dz) for (const ch of itemsOn(item)) { ch.x += dx; ch.z += dz; syncTransform(ch); } }
  syncTransform(item);
  if (item === placing || (dragging === item && dragStart?.moved)) {
    const bad = collides(item, item.x, item.z);
    item.y = restingY(item, item.x, item.z); // #209: 상판 위 or 러그 바닥 올림
    item.support = item._support ? item._support.other : null;
    syncTransform(item);
    item._valid = !bad;
    setGhostVisual(item, bad ? 'invalid' : 'valid');
  } else {
    if (collides(item, item.x, item.z)) {
      item.rot = (item.rot + 3) % 4;
      // #F42: 전파했던 클램프 델타를 먼저 되돌리고, 원래 중심(px,pz) 기준으로 자식 회전 복원 (정확한 왕복)
      if (DEFS[item.defId].surface) { const dx = item.x - px, dz = item.z - pz; if (dx || dz) for (const ch of itemsOn(item)) { ch.x -= dx; ch.z -= dz; } }
      item.x = px; item.z = pz;
      rotateChildren(item, -1);
      syncTransform(item);
      toast(t('rotate.noSpace'));
    } else scheduleSave();
  }
  updateSelRing();
}

/* ============================================================
   벽면 컬링 & 환경 애니메이션
============================================================ */
// ① 컬링 페이드 (디렉터 승인, GD-THESIS L1/L5 손맛): 벽/천장이 뚝 사라지는 대신 투명도로 부드럽게 소멸.
//   렌더 상수(BAL 아님) — 순수 시각 튜닝값.
// 벽/천장 투시 컬링 → render/culling.js (Tier4 Phase1-②). ctx=game.js 클로저 + 가변배열/타이틀 게터.
const { updateWallCulling, resetWallMask, setForceClosed } = makeCulling({
  opts, shadowDirty, camera, camCenter, camPanApplied,
  getWallList: () => wallList, getCeilCullList: () => ceilCullList, getTitleVisible: () => titleVisible,
  SHELTERS, state,
});
// 날씨-환경 상호작용: 눈이 쌓이고(지면·수풀·지붕 풀 서리 톤), 악천후엔 바람이 거세짐
let snowCover = 0, windLevel = 1;
let snowSeeded = false; // 초봄 잔설 초기값은 최초 1회만 세팅 (셸터 재입장/개조 시 덮어쓰지 않도록)
// 비가 오면 셸터 겉면이 젖어 어두워진다
let wetness = 0, wetApplied = -1;
let frostLevel = 0; // ③ 창유리 성에 현재 투명도(0~0.72). updateEnvironment가 한파 상태로 구동.
function applyWetness() {
  wetApplied = wetness;
  const seen = new Set();
  const k = 1 - 0.26 * wetness;
  roomGroup.traverse(o => {
    if (!o.isMesh || !o.material?.color) return;
    const m = o.material;
    if (m.userData.noWet || seen.has(m.uuid)) return;
    seen.add(m.uuid);
    if (m.userData.wetDry == null) m.userData.wetDry = m.color.getHex();
    _tc.a.setHex(m.userData.wetDry);
    // 살짝 푸른 기가 도는 젖은 톤
    m.color.setRGB(_tc.a.r * k, _tc.a.g * (k + 0.02 * wetness), Math.min(1, _tc.a.b * (k + 0.07 * wetness)));
    // 젖은 벽면 반사 재질감: Phong 벽/바닥 재질만 specular·shininess를 올린다
    if (m.isMeshPhongMaterial) {
      if (m.userData.specDry == null) m.userData.specDry = m.specular.getHex();
      if (m.userData.shininessDry == null) m.userData.shininessDry = m.shininess;
      _tc.b.setHex(m.userData.specDry).lerp(_wetSpec.set(0x36404c), wetness);
      m.specular.copy(_tc.b);
      // #96: 폭풍은 벽면 광택을 한 단계 더 (GTA 레퍼런스 — 퍼붓는 날의 번들거림)
      m.shininess = m.userData.shininessDry + ((weather.type === 'storm' ? 38 : 28) - m.userData.shininessDry) * wetness;
    }
  });
}
function updateEnvironment(t, dt) {
  const wBadNow = weather.type === 'snow' || weather.type === 'rain' || weather.type === 'storm';
  // 눈: 내리는 동안 서서히 쌓이고, 그치면 녹는다. 겨울엔 잔설이 남는다.
  const season = seasonOf();
  // 눈: 내리면 쌓이고(기존), 그치면 태양(주간)이 녹인다 — "해 뜨면 녹고" (디렉터 오더).
  //   dayness(0밤~1낮)로 녹임 구동: 겨울은 추워 잔설이 남고(0.30, 낮에도 0.18↑ 유지),
  //   봄 등 그 외 계절은 밤엔 옅게 남다가(0.10) 낮이면 완전히 녹는다(0).
  const winter = season.id === 'winter';
  const snowing = weather.type === 'snow';
  const targetSnow = snowing ? 1 : Math.max(0, (winter ? 0.30 : 0.10) - dayness * (winter ? 0.12 : 0.30));
  // 접근 속도: 쌓임은 기존(0.025), 녹음은 주간 태양이 가속(해가 높을수록 빨리 녹음).
  const snowRate = snowing ? 0.025 : (0.010 + dayness * 0.045);
  snowCover += (targetSnow - snowCover) * Math.min(1, dt * snowRate);
  // 계절 색조 × 적설 × 젖음(#96): 눈은 세상을 밝히고, 비는 어둡고 푸르게 가라앉힌다 (같은 메커니즘의 역방향)
  const wetK = 1 - wetness * 0.34;
  vcLambert.color.setRGB(
    season.tint[0] * (1 + snowCover * 0.5) * wetK,
    season.tint[1] * (1 + snowCover * 0.58) * (wetK + wetness * 0.03),
    season.tint[2] * (1 + snowCover * 0.72) * (wetK + wetness * 0.1)
  );
  // 바람: 비/눈엔 강풍
  windLevel += ((wBadNow ? 2.3 : 1) - windLevel) * Math.min(1, dt * 0.6);
  // 셸터 겉면 상호작용: 젖음(반사 재질) / 벽 위 적설
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  const isWet = weather.type === 'rain' || weather.type === 'storm';
  const targetWet = (isWet && !indoorSh) ? 1 : 0;
  const wetSpeed = weather.type === 'storm' ? 0.2 : 0.1;
  wetness += (targetWet - wetness) * Math.min(1, dt * (targetWet ? wetSpeed : 0.02));
  if (Math.abs(wetness - wetApplied) > 0.03) applyWetness();
  for (const cap of weatherFx.caps) {
    cap.visible = !indoorSh && snowCover > 0.05;
    if (cap.visible) cap.scale.y = Math.min(1, snowCover * 1.1);
  }
  // #96 젖은 도시 구동: 첫 젖음에 지연 구축 → 웅덩이는 젖음에 비례해 배어들고, 스트릭은 밤에 진해지며
  //   매 프레임 카메라 요 방향으로 눕는다(레퍼런스의 '시선 쪽으로 번지는 반사').
  if (!wetFxBuilt && wetness > 0.04 && !indoorSh) buildWetFx();
  if (weatherFx.puddles) for (const p of weatherFx.puddles) {
    p.visible = wetness > 0.04;
    if (p.visible) p.material.opacity = Math.min(0.72, wetness * 0.85);
  }
  if (weatherFx.glints) {
    const hr = gameHour();
    const nightK = (hr < 6.5 || hr >= 17) ? 1 : 0.4;
    for (const gl of weatherFx.glints) {
      gl.visible = wetness > 0.08;
      if (gl.visible) { gl.material.opacity = Math.min(0.55, wetness * 0.55 * nightK); gl.rotation.z = camState.yaw; }
    }
  }
  // ③ 한파 실내 침투: 무방비(coldSnapNetSeverity>0) 한파 시 창유리 안쪽 성에가 서서히 짙어지고,
  //   방어 성공/한파 종료 시 서서히 사라진다. 강도는 순 페널티에 비례(방어 단계만큼 옅어짐).
  if (winFrostMats.length) {
    const netSev = coldSnapNetSeverity();
    const frostTarget = netSev > 0 ? Math.min(0.72, 0.34 + netSev * 0.19) : 0; // 방어 부족분 비례
    frostLevel += (frostTarget - frostLevel) * Math.min(1, dt * (frostTarget > frostLevel ? 0.2 : 0.35));
    if (frostLevel < 0.004) frostLevel = 0;
    for (const fm of winFrostMats) {
      const wf = wallCullFade(fm.userData); // #229 벽 컬링 페이드 동조
      fm.material.opacity = frostLevel * wf;
      fm.visible = frostLevel > 0.004 && wf > 0.01;
    }
  }
  if (envDyn.trees || envDyn.buildings) {
    // #70: 근경 나무/빌딩 가림 판정도 팬을 되돌린 앵글 기준 — 팬 중 소품이 깜빡이며 토글되지 않게(벽 컬링과 동일 사상).
    const cd = new THREE.Vector2(camera.position.x - camPanApplied.x - camCenter.x, camera.position.z - camPanApplied.z - camCenter.z).normalize();
    if (envDyn.trees) {
      for (const tr of envDyn.trees) {
        tr.obj.visible = tr.dir.dot(cd) < 0.5;
        // 바람에 흔들리는 잎사귀 (강풍이면 크게)
        tr.obj.rotation.z = Math.sin(t * (0.9 + windLevel * 0.3) + tr.phase) * tr.sway * windLevel * (1 + 0.4 * Math.sin(t * 2.3 + tr.phase * 2));
      }
    }
    if (envDyn.buildings) for (const b of envDyn.buildings) b.obj.visible = b.dir.dot(cd) < 0.4;
  }
  if (envDyn.leaves && !opts.lowSpec) {
    for (const L of envDyn.leaves) {
      const p = L.pts.geometry.attributes.position;
      for (let i = 0; i < L.meta.length; i++) {
        const m = L.meta[i];
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        y -= m.sp * (0.6 + windLevel * 0.4) * dt;
        x += Math.sin(t * 1.1 + m.ph) * 0.45 * windLevel * dt;
        z += Math.cos(t * 0.8 + m.ph) * 0.3 * windLevel * dt;
        if (y < 0.05) { y = 4.5 + Math.random() * 3; x = (Math.random() * 2 - 1) * 14; z = (Math.random() * 2 - 1) * 12; }
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
  }
  if (envDyn.smoke) {
    const p = envDyn.smoke.pts.geometry.attributes.position;
    const bx = envDyn.smoke.baseX ?? 24; // 기둥 기준 x (기존 도심 연기 = 24, F-1a 공용 기둥은 자체 값)
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + 0.9 * dt;
      if (y > 15.5) y = 2;
      p.setY(i, y);
      p.setX(i, bx + Math.sin(y * 0.5 + envDyn.smoke.phase[i]) * (0.5 + y * 0.09));
    }
    p.needsUpdate = true;
  }
  if (envDyn.fireflies && !opts.lowSpec) {
    const f = envDyn.fireflies;
    const p = f.pts.geometry.attributes.position;
    for (let i = 0; i < f.base.length; i++) {
      const b = f.base[i], ph = f.phase[i];
      p.setXYZ(i,
        b.x + Math.sin(t * 0.4 + ph * 2) * 0.6,
        b.y + Math.sin(t * 1.1 + ph) * 0.35,
        b.z + Math.cos(t * 0.5 + ph) * 0.6);
    }
    p.needsUpdate = true;
    f.pts.material.opacity = 0.5 + 0.3 * Math.sin(t * 2.3);
    f.pts.visible = dayness < 0.5; // 낮에는 반딧불이 없음
  }
  if (envDyn.fire) {
    envDyn.fire.intensity = envDyn.fireBase * (0.75 + 0.3 * Math.sin(t * 9) * Math.sin(t * 4.7) + 0.12 * Math.sin(t * 21));
  }
  // 실내 먼지 모트 느린 부유 (저사양 모드에선 갱신 스킵)
  if (!opts.lowSpec) {
    const p = dust.pts.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, p.getY(i) + Math.sin(t * 0.35 + dust.phase[i]) * 0.0009);
      p.setX(i, p.getX(i) + Math.sin(t * 0.22 + dust.phase[i] * 2) * 0.0006);
    }
    p.needsUpdate = true;
    dust.pts.material.opacity = 0.14 + 0.16 * (1 - dayness); // 밤 조명 아래서 더 또렷
  }
  if (envDyn.windmill) envDyn.windmill.rotation.z += dt * 0.5;      // 풍차
  if (envDyn.beam) envDyn.beam.rotation.y = t * 0.55;               // 등대 탐조등
  if (envDyn.sea) envDyn.sea.position.y = envDyn.seaBase + Math.sin(t * 0.5) * 0.08; // 파도
  // F-1a [B]: 흔들리는 천 — 바람세기 비례 미세 sway (있는 소품만). 저사양에서도 저비용(회전 1축).
  if (swayProps.length) {
    for (const s of swayProps)
      s.mesh.rotation.z = s.baseZ + Math.sin(t * (1.1 + windLevel * 0.4) + s.phase) * s.amp * (0.5 + windLevel * 0.5);
  }
}

/* ============================================================
   UI
============================================================ */
const $ = id => document.getElementById(id);

/* ============================================================
   이동/접기 가능한 패널 시스템 (위치는 localStorage에 저장)
============================================================ */
const UI_KEY = 'shelter-ui-v1';
let uiState = {};
try { uiState = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch (e) { uiState = {}; }
function saveUiState() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(uiState)); } catch (e) { /* */ }
}
// .panel 계열은 CSS `zoom: var(--uiz)`로 확대/축소된다. zoom이 걸린 요소의
// getBoundingClientRect()/pointer 좌표는 "화면에 보이는(visual)" 좌표계이지만,
// style.left/top(=position:absolute의 offset)은 줌이 적용되기 전(pre-zoom) 좌표계로
// 해석된다. 그래서 visual 좌표를 그대로 style.left/top에 되돌려 쓰면 다음 프레임에
// 줌 배율만큼 다시 튀어(누적 드리프트) 화면 밖으로 밀려난다 — 반드시 uiz로 나눠 보정한다.
function getUiz() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiz'));
  return v > 0 ? v : 1;
}
function clampPanel(el) {
  const z = getUiz();
  const r = el.getBoundingClientRect();
  // 숨김 패널(rect 0×0)은 절대 클램프하지 않는다 — 0,0으로 위치가 파괴되어
  // 다음에 열 때 좌상단(모바일 상태바 밑)에 깔리는 근본 원인이었다
  if (r.width === 0 && r.height === 0) return;
  // pre-zoom 좌표계로 환산
  const preL = r.left / z, preT = r.top / z, preW = r.width / z;
  // P1-D: 터치 기기에선 상단 상태바/펀치홀 회피용 최소 top 24px (몰입 모드 실패 대비 이중 안전장치)
  const minTop = isPcInput ? 0 : 24;
  // 경계(innerWidth/Height)는 visual px인데 preL/preT는 pre-zoom 좌표계 → z로 나눠 스케일을 맞춘다.
  //   (기존엔 visual 경계를 그대로 써서 zoom<1 모바일에서 우측 앵커 패널을 화면 중앙(left≈255)으로
  //    밀어냈다 — 시계·자원바 모바일 '난리'의 근인.)
  // 디렉터 신고(모바일 자원바 우측 잘림): 120px만 보이면 걸침을 허용하던 정책이 좁은 화면에선
  //   "처음부터 잘린 패널"로 읽힌다 — 터치 기기는 패널 전체를 화면 안에 유지(PC는 기존 파킹 허용).
  const keepVisX = isPcInput ? Math.min(preW * z, 120) : preW * z;
  const l = THREE.MathUtils.clamp(preL, 0, Math.max(0, (innerWidth - keepVisX) / z));
  const t = THREE.MathUtils.clamp(preT, minTop / z, Math.max(minTop / z, (innerHeight - 30) / z));
  el.style.left = l + 'px';
  el.style.top = t + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transform = 'none';
}
// 창 관리자: 패널 겹침 시 마지막으로 만진 패널이 항상 맨 앞에 오도록 z-index를 올려준다.
// 계층: .panel 10~40 < #modal-back 50 < .tip-note 55 < 수첩(journal) 60 < #fade-veil 99
let panelZTop = 10;
function bringPanelToFront(el) {
  panelZTop++;
  if (panelZTop > 40) {
    // 상한 도달 — 모달/수첩/베일 계층을 침범하지 않도록 전 패널 z를 재정규화
    const panels = [...document.querySelectorAll('.panel')].sort((a, b) => (+a.style.zIndex || 10) - (+b.style.zIndex || 10));
    panelZTop = 10;
    for (const p of panels) p.style.zIndex = ++panelZTop;
  }
  el.style.zIndex = panelZTop;
}
function makeDraggablePanel(el, key, title) {
  el.addEventListener('pointerdown', () => bringPanelToFront(el), true); // 캡처 단계: 패널 어디를 눌러도 최상단으로
  const head = document.createElement('div');
  head.className = 'p-head';
  head.innerHTML = `<span class="p-title">⠿ ${title}</span><button class="p-min" title="${t('panel.collapse')}">–</button>`;
  el.prepend(head);
  const saved = uiState[key];
  if (saved) {
    el.style.left = saved.l + 'px';
    el.style.top = saved.t + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
    if (saved.c) el.classList.add('collapsed');
  } else if ((innerWidth < 760 || innerWidth < 900 || innerHeight < 500) && (key === 'render' || key === 'res')) {
    el.classList.add('collapsed'); // 작은 창 기본: 설정·자원 접힘 (겹침 방지)
  }
  const minBtn = head.querySelector('.p-min');
  const syncMin = () => { minBtn.textContent = el.classList.contains('collapsed') ? '+' : '-'; }; // 웹폰트 누수 봉합: □·en-dash(픽셀폰트 미보유→Malgun 폴백) → DungGeunMo 보유 ASCII +/-
  syncMin();
  minBtn.addEventListener('click', ev => {
    ev.stopPropagation();
    el.classList.toggle('collapsed');
    uiState[key] = { ...(uiState[key] || panelPos(el)), c: el.classList.contains('collapsed') };
    saveUiState();
    syncMin();
  });
  // panelPos: 저장용 — pre-zoom(=style.left/top과 같은) 좌표계로 환산해서 반환
  const panelPos = elm => { const z = getUiz(); const r = elm.getBoundingClientRect(); return { l: r.left / z, t: r.top / z }; };
  let drag = null;
  head.addEventListener('pointerdown', ev => {
    if (ev.target === minBtn) return;
    if (uiState.pinned) return; // UI 고정(디렉터 2026-07-10): 드래그 시작 자체를 막는다 — 접기(–)는 유지

    const z = getUiz();
    const r = el.getBoundingClientRect();
    // dx/dy는 visual 좌표계 안에서의 오프셋이므로 그대로 두되, 매 이동마다 pre-zoom으로 환산해 되돌린다
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top, id: ev.pointerId };
    el.classList.add('dragging');
    head.setPointerCapture(ev.pointerId);
    ev.preventDefault();
    ev.stopPropagation();
  });
  head.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const z = getUiz();
    el.style.left = ((ev.clientX - drag.dx) / z) + 'px';
    el.style.top = ((ev.clientY - drag.dy) / z) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none';
  });
  const endDrag = ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    drag = null;
    el.classList.remove('dragging');
    clampPanel(el);
    uiState[key] = { ...panelPos(el), c: el.classList.contains('collapsed') };
    saveUiState();
  };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);
}
// 화면 밖으로는 절대 나가지 않게 — 사용자가 옮겼든 기본 위치든 매 리사이즈마다 전 패널에 적용
function reclampAllPanels() {
  // #52: render-panel 제거 — 설정은 중앙 고정 오버레이(#settings-screen)라 클램프 대상 아님
  for (const id of ['hud', 'exp-panel', 'clock-panel', 'res-bar'])
    clampPanel($(id));
}
// 사용자가 드래그로 옮기지 않은(uiState 미저장) 패널은 화면 크기/스케일이 바뀔 때마다
// 실제 콘텐츠 높이 기준으로 겹치지 않게 재배치 (하드코딩된 top 값은 콘텐츠 높이 변화·
// UI 스케일 변화에 취약하므로, 기본 위치일 때만 다른 패널을 피해 이어붙인다).
// 완전한 무충돌을 보장하진 않지만(겹침은 허용), 대표적인 기본 배치 충돌(설정↔카메라 버튼,
// 자원↔설정, 탐험↔거처)은 해소한다.
function autoStackPanels() {
  const z = getUiz();
  // rect를 pre-zoom(=style.left/top과 같은 좌표계)으로 환산해서 반환
  const preRect = elm => {
    const r = elm.getBoundingClientRect();
    return { left: r.left / z, top: r.top / z, right: r.right / z, bottom: r.bottom / z, width: r.width / z };
  };
  // #52: 설정이 중앙 고정 오버레이가 되면서 우상단 render-panel 자동 스택 로직은 불필요해졌다.
  // res-bar는 자체 기본 위치(CSS)를 사용한다.
  // 탐험 패널: hud 바로 아래로
  if (!uiState.exp && !uiState.hud && innerWidth >= 760) {
    const hud = $('hud');
    const exp = $('exp-panel');
    if (hud && exp) {
      const r = preRect(hud);
      exp.style.top = Math.round(r.bottom + 10) + 'px';
      exp.style.left = Math.round(r.left) + 'px';
      exp.style.right = 'auto'; exp.style.bottom = 'auto'; exp.style.transform = 'none';
    }
  }
  // 퀘스트 카드(To Do): 탐험 패널이 떠 있으면 그 아래로 — 겹쳐서 진행바가 가려지는 충돌 해소 (디렉터 신고).
  //   탐험 패널이 없으면 인라인 배치를 걷어 CSS 기본 위치로 복원.
  const qc = $('quest-card');
  if (qc && qc.classList.contains('show') && innerWidth >= 760) {
    const exp = $('exp-panel');
    if (exp && exp.classList.contains('show')) {
      const er = preRect(exp);
      qc.style.top = Math.round(er.bottom + 10) + 'px';
      qc.style.left = Math.round(er.left) + 'px';
    } else { qc.style.top = ''; qc.style.left = ''; }
  }
}

/* ============================================================
   타이틀 화면 · 인트로 · 세이브 슬롯 UI
============================================================ */
let titleVisible = false;
let gameStarted = false; // 타이틀/인트로를 벗어나 실제 플레이 중인지 (부팅 중 쪽지 팁 발화 방지)
function showTitle() {
  titleVisible = true;
  // 타이틀에선 내 집만 조용히 보여준다 — 패널/설정창은 전부 숨김 (CSS)
  document.body.classList.add('title-mode');
  $('title-screen').style.display = 'flex';
  const meta = slotMeta(currentSlot);
  if (meta) {
    $('t-continue').style.display = '';
    // 이모지 스트립 3/N: sicon=계절 글리프(innerHTML 전환), semoji=소거(셸터 이름이 식별자)
    $('t-continue-info').innerHTML = (t('title.continueInfo', { slot: currentSlot, day: meta.day, sicon: icon(`icon_season_${meta.season.id}`, ''), semoji: '', sname: LName(meta.shelter) })
      + (meta.winters >= 1 ? t('title.continueWinters', { n: meta.winters }) : '') // Nine Winters(#11)
      ).replace(/ {2,}/g, ' '); // semoji 소거로 남는 이중 공백 정리 (난이도/모드 표기 = 슬롯카드 테두리색 이관)
  } else {
    $('t-continue').style.display = 'none';
  }
  if (typeof syncBgm === 'function') syncBgm(); // Main_theme (#227: 타이틀 언어 버튼 표시 동기화는 버튼 제거로 소거)
}
function hideTitle() {
  titleVisible = false;
  gameStarted = true;
  document.body.classList.remove('title-mode');
  closeSettings(); // #52: 타이틀에서 열어둔 설정 창이 있으면 닫고 진입
  $('title-screen').style.display = 'none';
  // 타이틀 화면에선 .panel이 display:none이라 이전 onResize() 때 패널 크기가 0으로 측정됐다.
  // 실제 패널이 보이기 시작한 지금 다시 계산해 자동 배치를 맞춘다.
  onResize();
  // 자리 비운 사이의 정산(탐험 결과 등)은 게임에 들어온 뒤에 보여준다
  if (state.exp && Date.now() >= state.exp.end) resolveExpedition();
  syncBgm();
  // #74 데모: 이미 끝난 세이브로 입장하면 종료 화면부터 — 닫으면 봄의 거처 관람(시간 동결)만 가능
  if (DEMO_ED && state.demoEnded) setTimeout(showDemoEnd, 350);
}

// ── #74 Next Fest 데모 「첫 번째 겨울」 종료 화면 ──────────────────────────
// 첫 겨울을 넘긴 롤오버에서 아침 보고 대신 뜬다(tickTime 게이트). 시간 동결·취침/탐험 봉인과 한 세트 —
// 로 닫아도 진행은 없고, 봄이 온 거처를 둘러보는 것만 남는다.
function showDemoEnd() {
  // 페이퍼 레이어(수첩/튜토리얼)는 모달보다 위 — 떠 있으면 엔드 스크린을 덮는다(프로브 실측). 강제 정리.
  const jscr = $('journal-screen');
  if (jscr) { jscr.classList.remove('show'); jscr.style.display = 'none'; }
  journalOpen = false;
  const body = `
    <div class="demo-end">
      <div class="de-mark">${icon('icon_season_spring', '')} ${Array(8).fill(icon('icon_season_winter', '')).join(' ')}</div>
      <p class="de-body">${t('demo.end.body', { d: state.day })}</p>
      <p class="de-sub">${t('demo.end.sub')}</p>
      <button class="pixel-btn primary" id="demo-end-title">${t('demo.end.back')}</button>
    </div>`;
  openModal(t('demo.end.title'), body);
  $('demo-end-title').addEventListener('click', () => { closeModal(); showTitle(); });
}
// 슬롯 모드 배지 (하드/무한/하드코어/배경화면) — icon() 폴백 문법 대신 이모지 배지 유지
function slotModeBadge(mode) {
  return ''; // 난이도/모드 = 슬롯카드 테두리색(data-mode)으로 이관 (디렉터: 이모지 배지 폐지)
}
function openSlotModal(mode) {
  const cards = [];
  const count = slotDisplayCount(); // max(5, 채워진 최대 슬롯+1) — 항상 빈 칸 하나
  for (let n = 1; n <= count; n++) {
    const m = slotMeta(n);
    const ended = m && m.runEnded; // 끝난 기록(회고만)
    cards.push(`
      <div class="slot-card ${m ? '' : 'empty'} ${ended ? 'ended' : ''}" data-slot="${n}" data-has="${m ? 1 : 0}" data-ended="${ended ? 1 : 0}" data-mode="${m && m.mode ? m.mode : 'cozy'}">
        ${m ? slotModeBadge(m.mode) : ''}
        ${m && m.qaUsed ? `<span class="sl-qa" title="QA 치트 사용됨" style="position:absolute;top:4px;left:4px;font-size:9px;background:#6b5a40;color:#1a1408;padding:1px 4px;border-radius:3px;font-weight:bold">QA</span>` : ''}
        <span class="sl-no">${n}</span>
        <div class="sl-body">${m
          ? `${LName(m.shelter)} — Day ${m.day}${m.winters >= 1 ? ` <span class="sl-winters">${m.winters}${m.mode === 'zen' ? '' : '/9'}</span>` : ''}${ended ? ` <span class="sl-ended">${t('slot.endedTag')}</span>` : ''}<br><span class="sl-meta">${m.mode === 'wallpaper' ? t('slot.metaWp', { saved: m.saved }) : t('slot.meta', { succ: m.successes, saved: m.saved })}</span>`
          : t('slot.empty')}</div>
        ${m ? `<button class="sl-del" data-del="${n}" title="${t('slot.del.title')}"></button>` : ''}
      </div>`);
  }
  openModal(mode === 'new' ? t('slot.new') : t('slot.load'), `<div class="slot-scroll">${cards.join('')}</div>`);
  $('modal-body').querySelectorAll('.sl-del').forEach(b => b.addEventListener('click', async ev => {
    ev.stopPropagation();
    if (!(await gameConfirm(t('slot.delConfirm', { n: b.dataset.del }), t('confirm.delete'), t('confirm.cancel')))) return;
    localStorage.removeItem(slotKey(+b.dataset.del));
    localStorage.removeItem(slotKey(+b.dataset.del) + '-bak'); // P1-B: 롤링 백업도 함께 삭제
    // 삭제한 슬롯을 가리키던 lastslot 포인터도 정리 (빈 슬롯을 이어하기 대상으로 잡지 않도록)
    if (localStorage.getItem(LASTSLOT_KEY) === b.dataset.del) localStorage.removeItem(LASTSLOT_KEY);
    if (titleVisible) showTitle();                              // P1-B: '이어하기' 표시 즉시 갱신
    openSlotModal(mode);
  }));
  $('modal-body').querySelectorAll('.slot-card').forEach(c => c.addEventListener('click', async () => {
    const n = +c.dataset.slot, has = c.dataset.has === '1', ended = c.dataset.ended === '1';
    if (mode === 'load') {
      if (!has) { toast(t('toast.emptySlot')); return; }
      // 끝난 기록: 이어하기 불가 — 회고(마지막 요약)만 열람한다.
      if (ended) { openEndedRecord(n); return; }
      localStorage.setItem(LASTSLOT_KEY, String(n));
      sessionStorage.setItem('ps-load', '1'); // 리로드 후 타이틀 건너뛰고 바로 게임 (밀린 결산 표시)
      location.reload();
    } else {
      // 덮어쓰기 확인은 슬롯 클릭 시점에만 (모드 화면 뒤 재선택 시 재확인은 허용)
      if (has && !(await gameConfirm(t('slot.newConfirm', { n }), t('confirm.overwrite'), t('confirm.cancel')))) return;
      openModeModal(n);
    }
  }));
}
// 새 게임: 슬롯 선택 후 모드 5종(노말/하드/하드코어/무한/배경화면)을 고르는 화면 (같은 모달의 body 교체)
// 모달 빌더 → ui/modals.js (Tier4 Phase1-⑤). t/BAL/DEFAULT_STATE/opts는 모듈이 import, game.js 클로저만 주입.
const { openModeModal, openWardrobeModal, openKnowledgeModal, openJournalModal } = makeModals({ openModal, toast, wallpaperUnlocked, zenUnlocked, openSlotModal, slotKey, LASTSLOT_KEY, DEMO_ED, SHELTERS,
  getPaused: () => paused, playSfx, scheduleSave, avatarSys, renderResBar, updateHud,
  // Tier6b 일지/도감 모달 의존 — 아이콘·집계 헬퍼·수첩 페이지(game.js 클로저)
  icon, regionIcon, collectionCount,
  memosTotal, memosCollected, broadcastsTotal, broadcastsCollected, sketchesTotal, sketchesCollected,
  showMemoPage, showBroadcastModal, showSketchPage, showTruthPage });
const INTRO_IDS = ['intro.0', 'intro.1', 'intro.2'];
function showIntro() {
  let i = 0;
  const scr = $('intro-screen'), txt = $('intro-text');
  scr.style.display = 'flex';
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = t(INTRO_IDS[i]).replace(/\n/g, '<br>');
    $('intro-next').textContent = i === INTRO_IDS.length - 1 ? t('intro.start') : t('intro.next');
  };
  $('intro-next').addEventListener('click', () => {
    i++;
    if (i >= INTRO_IDS.length) {
      scr.style.display = 'none';
      gameStarted = true;
      toast(t('intro.firstShelter'));
      // 신규 게임: 인트로 종료 직후 수첩 1페이지 (Day 1 튜토리얼 — '물부터')
      if (state.tutDay < 1) showTutorialPage(1);
    } else render();
  });
  render();
}

/* ============================================================
   엔딩 (v1.9) — Day 10000, 박사의 구조 (이때만 Ending OST)
============================================================ */
let endingActive = false;
// 2.0 §9.5: type = 'escape'|'newworld'|'rest'(3분기) 또는 미지정(기존 Day10000 — 먼 에필로그로 격하).
//   세 갈래 모두 시퀀스 후 런은 계속된다 — 엔딩은 서사 마침표지 세이브의 끝이 아니다(방치형 정체성).
function runEndingSequence(type) {
  endingActive = true;
  closeModal();
  setPaused(false);
  syncBgm(true); // Ending.mp3
  playSfx('heli');
  const dayStr = state.day.toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR');
  const vars = { day: dayStr, succ: state.successes, winters: state.winters, cat: state.cat ? t('ending.catTag') : '' };
  const lines = type
    ? [0, 1, 2, 3, 4].map(n => t(`end3.${type}.line${n}`, vars) + (n === 2 && state.cat ? t(`end3.${type}.cat`) : ''))
    : [
      t('ending.line0'),
      t('ending.line1', { day: dayStr }),
      t('ending.line2') + (state.cat ? t('ending.line2cat') : ''),
      t('ending.line3'),
      t('ending.line4', { day: dayStr, succ: state.successes, cat: state.cat ? t('ending.catTag') : '' }),
    ];
  let i = 0;
  const scr = $('ending-screen'), txt = $('ending-text'), btn = $('ending-next');
  scr.style.display = 'flex';
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = lines[i];
    btn.textContent = i === lines.length - 1 ? t('ending.back') : t('intro.next');
  };
  btn.onclick = () => { // onclick 대입: 재실행 시 리스너 중복 방지
    i++;
    if (i >= lines.length) {
      scr.style.display = 'none';
      if (!type) state.endingSeen = true; // Day10000 에필로그 감상 기록 (3분기는 endingType이 이미 기록)
      endingActive = false;
      state.dayLog.notes.push(t(type ? 'end3.note.' + type : 'ending.note'));
      scheduleSave();
      syncBgm();
      toast(t(type ? 'end3.after.' + type : 'ending.epilogue'));
    } else render();
  };
  render();
}
// #170 REV3: 재건 목격 (겨울 9) — 카드 5장 + 세계 변화(지도 불빛 전점등), 종결부로 노크를 세운다.
//   연출은 전부 기존 자산 조합: ending-screen 페이저 + survivorLights + 아침 보고 노트.
//   시퀀스 후에도 런은 계속된다(zen 정신) — 재건은 업적이 아니라 보상 그 자체.
function runRebuildSequence() {
  endingActive = true;
  closeModal();
  setPaused(false);
  syncBgm(true); // Ending.mp3 — 밝은 회귀 톤 재사용
  const lines = [0, 1, 2, 3, 4].map(n => t('end3.rebuild.line' + n));
  let i = 0;
  const scr = $('ending-screen'), txt = $('ending-text'), btn = $('ending-next');
  scr.style.display = 'flex';
  // ── 항공뷰 무대(디렉터 승인 2026-07-22): line2 「지도를 폈다」부터 배경이 밤 관측 뷰로 살아나고
  //    불이 하나씩 켜진다. 문안 불변 — 무대만 승격(OBSERVATORY-CANON §2 "결정적 보너스").
  let stageTimer = null, stageOn = false;
  const stageStart = () => {
    if (stageOn) return; stageOn = true;
    const a = aerialProto('home');
    a.open({}); a.overview();
    aerialHourOverride = 22; // 그 밤의 지도 — 불빛이 읽히는 시각으로 고정
    a.setLit(0);
    let k = 0; const total = a.litTotal();
    // 처음 다섯은 셀 수 있게 하나씩, 그 뒤는 셀 수 없게 몰아친다 — "세다가 그만뒀다"의 리듬
    stageTimer = setInterval(() => {
      k += k < 5 ? 1 : Math.ceil(total / 40);
      a.setLit(k);
      if (k >= total && stageTimer) { clearInterval(stageTimer); stageTimer = null; }
    }, 320);
    scr.classList.add('aerial-stage');
    document.body.classList.add('obs-mode'); // 스크림을 걷으면 본편 크롬이 비친다(실캡처 검거) — 관측 은닉 목록 재사용
  };
  const stageEnd = () => {
    if (!stageOn) return; stageOn = false;
    if (stageTimer) { clearInterval(stageTimer); stageTimer = null; }
    const a = _aerials.home;
    if (a) { a.setLit(a.litTotal()); a.close(); } // 원복 — 이후 관측 단말 사용에 흔적 0
    aerialHourOverride = null;
    scr.classList.remove('aerial-stage');
    document.body.classList.remove('obs-mode');
  };
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = lines[i];
    btn.textContent = i === lines.length - 1 ? t('ending.back') : t('intro.next');
    if (i >= 2) stageStart(); // line2부터 종막까지 도시가 뒤에서 계속 깨어 있다
  };
  btn.onclick = () => { // onclick 대입: 재실행 시 리스너 중복 방지 (runEndingSequence 동일 패턴)
    i++;
    if (i >= lines.length) {
      stageEnd();
      scr.style.display = 'none';
      endingActive = false;
      state.rebuildSeen = true;
      // 지도의 불빛 전점등 — 켜진 불빛은 꺼지지 않는다(기존 규칙). MAP_LIGHT_MAX=12가 "셀 수 없이"의 상한.
      state.survivorLights = Math.max(state.survivorLights || 0, MAP_LIGHT_MAX);
      state.dayLog.notes.push(t('end3.rebuild.note'));
      // 종결부: 그 봄, 문 두드리는 소리 — 다음 밤 tryDoctorRadio가 세운다
      state.endingChoicePending = true;
      scheduleSave();
      syncBgm();
    } else render();
  };
  render();
}
// 2.0 §9.5: 엔딩 성향 — "누적된 하루가 빚는다"(갑툭튀 금지, STRATEGY §1.2). 랜덤 없음(결정론).
//   도시 체류 가중(§9.8 4도시)은 미구현 — 그 전까지는 현존 3신호로 성향을 읽는다:
//   탈출=박사 스파인(송출 불빛·정기 교신·일지 조각) / 신세계=진실 조각(기밀 12+이관 4) / 안식=정든 집(거주·고양이·쾌적).
function endingLeaning() {
  // 2.0-(g) §9.8.8 체류 가중: 동부(항만 대도시) 겨울 이력 W + 동부에서 9겨울 마무리 Wf → 탈출 성향.
  //   홈 쪽은 무가중 — 전 세이브가 홈에서 시작·마무리하므로 홈 신호는 신호가 아니고(배터리 실측: home Wf가
  //   진실 14조각의 newworld를 뒤집었다), rest의 이월은 homeStay가 담당한다. 동부에 발 들인 세이브만 판정이
  //   움직인다(구세이브 엔딩 불변). 동률 순서는 기존 그대로(escape 우선). RNG 0·부수효과 0(판정 전용).
  const cw = state.cityWinters || {}, fin = state.finalWinterCity;
  const W = BAL.cities.endingW || 0, Wf = BAL.cities.endingWf || 0;
  const escape = (state.survivorLights || 0) + (state.doctorRegularSeen ? 3 : 0) + (doctorFragmentsComplete() ? 2 : 0)
    + (cw.east || 0) * W + (fin === 'east' ? Wf : 0);
  const truthN = MEMOS_RESEARCH.concat(MEMOS_CITYCORE).filter(id => (state.memos || {})[id]).length;
  const newworld = truthN >= 14 ? 6 : truthN >= 9 ? 4 : truthN >= 5 ? 2 : 0;
  // 정든 정도: stayDays는 이주 시 리셋 — homeStay 고수위로 복원("오래 살던 집"이 낯선 집이 되지 않게, §9.8.6-③)
  const settled = Math.max(state.stayDays || 0, (state.homeStay || {})[state.current] || 0);
  const rest = Math.min(4, Math.floor(settled / 8)) + (state.cat ? 2 : 0) + (comfortDetail().score >= 75 ? 2 : 0);
  return escape >= newworld && escape >= rest ? 'escape' : newworld >= rest ? 'newworld' : 'rest';
}

function updateClock() {
  const h = Math.floor(gameHour()), m = Math.floor(state.gameMin % 60);
  const se = seasonOf();
  // 계절 아트 아이콘 (이모지 sicon → icon(), textContent→innerHTML — P2 스윕)
  $('lcd-day').innerHTML = t('clock.dayLine', { day: String(state.day).padStart(2, '0'), sicon: icon(`icon_season_${se.id}`, se.icon), sname: LName(se), sd: seasonDay(), total: SEASON_DAYS });
  $('lcd-time').innerHTML = `${String(h).padStart(2, '0')}<span id="lcd-colon">:</span>${String(m).padStart(2, '0')}`;
  const [timeIcon, label, timeArt] = timeLabel();
  // #199 5차-b(디렉터): 날씨(+페널티)는 시계가 계기 — HUD 스트립에서 이관. 이모지 금지 → 아트 아이콘
  const wPen = WEATHERS[weather.type]?.penalty;
  // 시간대 아이콘은 밤(달)만 — 새벽/낮/황혼의 해 계열은 제거(디렉터: 해 모양 금지), 라벨 텍스트가 식별자
  $('lcd-sub').innerHTML = `${label} · ${wxIcon(weather.type)}${wPen ? `<span style="color:var(--bad)">-${Math.round(wPen * 100)}%</span>` : ''}${state.injury ? ' · ' + injIconEl(state.injury.type) : ''}`;
}

function updateHud() {
  if (typeof updateSpeedBtn === 'function') updateSpeedBtn(); // 배속 버튼 해금 상태 동기화
  // 배경화면 모드: 게이지/탐험 패널을 숨긴다(CSS). 압박 UI가 없는 순수 가꾸기.
  document.body.classList.toggle('wallpaper-mode', isWallpaper());
  const sh = SHELTERS[state.current];
  const W = WEATHERS[weather.type];
  const cd = comfortDetail();
  const lv = Math.min(5, Math.round(cd.score / 20));
  const bonus = Math.round(comfortExpBonus() * 100);
  const distId = districtOf(state.current), dist = DISTRICTS[distId];
  // #199-b 이모지 스윕 2차: 거점 라인 아트 아이콘 (textContent→innerHTML, demoji/semoji 자리에 icon())
  $('hud-shelter').innerHTML = t('hud.shelterLine', { demoji: distIcon(distId), dname: LName(dist), semoji: shIcon(state.current), sname: LName(sh) });
  const comfortTip = t('hud.comfortTip', {
    score: cd.score, furn: cd.furn, light: cd.light, clean: cd.cleanMod, shelter: cd.shelterMod,
    settled: cd.settled ? t('hud.comfortSettled', { n: cd.settled }) : '',
    cat: cd.catMod ? t('hud.comfortCat', { n: cd.catMod }) : '',
    injury: cd.injuryMod ? t('hud.comfortInjury', { n: cd.injuryMod }) : '',
    limit: cd.limitMod ? t('hud.comfortLimit', { n: cd.limitMod }) : '',
    bonus: bonus ? t('hud.comfortBonus', { n: bonus }) : '',
  });
  // #199 5차-b 컨디션 스트립(디렉터 정정): 경고 | 쾌적 — 날씨=시계 이관, 청결=경고 편입, 탐험 횟수 표기 제거
  const cleanLow = cd.clean < BAL.comfort.cleanWarnAt; // 청결은 게이지가 아니라 낮을 때만 경고로 (디렉터: "청소는 경고 형식")
  const warnN = (state.injury ? 1 : 0) + (cd.limitMod ? 1 : 0) + (cleanLow ? 1 : 0);
  const warnTip = [
    state.injury ? LName(INJURIES[state.injury.type]) : '',
    cd.limitMod ? (LLimits(sh) || '') : '',
    cleanLow ? `${t('hud.cleanTip')} (${Math.round(cd.clean)})` : '',
  ].filter(Boolean).join(' · ');
  // 기본 이모지 금지(디렉터) — 제작 아이콘 + 이모지 폴백
  const segs = [
    `<span class="cond-seg" data-tip="${warnTip}">${icon('icon_cond_warn', '')}<b class="${warnN ? 'bad' : ''}">${warnN}</b>${state.buff ? icon('icon_cond_buff', '') : ''}</span>`,
    `<span class="cond-seg" data-tip="${comfortTip}">${icon('icon_cond_comfort', '')}<b>${cd.score}</b></span>`, // 쾌적=단색 스마일 아이콘(디렉터: raw 이모지 금지, 아이콘팩 차용)
  ];
  $('hud-stat').innerHTML = segs.join('<span class="cond-div">|</span>');
  renderGauge('g-hunger', state.hunger, 'hunger');
  renderGauge('g-thirst', state.thirst, 'thirst');
  renderGauge('g-energy', state.energy, 'energy'); // 디렉터: 게이지 = 영어 라벨 + 게이지별 컬러 바만(아이콘·세부 수치 제거). 수치는 PDA 전용
}
// HUD-SPEC-RECON §1.1 (기획서 8.5·HUD-A02·ACC-04): 색=심각도 + 수치 병기 + 상태 문자.
//   임계 = 스펙 준수(0~25 위험 / 26~50 주의 / 51~ 정상). 구 "수치=PDA 전용" 오더는 본 스펙이 대체.
function gaugeSev(v) { return v <= BAL.gauges.sev.crit ? 'crit' : v <= BAL.gauges.sev.warn ? 'warn' : ''; } // P2: 임계 단일 출처(BAL) — comfort.js 페널티 게이트와 공유
// 충전(회복) 연출 — 1.9.10 게이지 문법 복원(디렉터 2026-07-22): 값이 오르는 동안 .up(밝은 스윕+글로우 서지).
//   updateHud가 0.5s마다 재호출되며 증가가 이어지면 계속 갱신 — "충전 중" 지속 연출. 멈추면 1.1s 후 소등.
const _gaugePrev = {}, _gaugeUpT = {};
function renderGauge(id, val, gkey) {
  const g = $(id);
  if (!g) return;
  const v = Math.max(0, Math.round(val));
  const sev = gaugeSev(v);
  const fill = g.querySelector('.g-fill');
  fill.style.width = v + '%';
  fill.className = 'g-fill' + (sev ? ' ' + sev : '');
  const pv = _gaugePrev[id]; _gaugePrev[id] = v;
  if (pv != null && v > pv) {
    fill.classList.add('up');
    clearTimeout(_gaugeUpT[id]);
    _gaugeUpT[id] = setTimeout(() => { fill.classList.remove('up'); delete _gaugeUpT[id]; }, 1100);
  } else if (_gaugeUpT[id]) fill.classList.add('up'); // 타이머 생존 중엔 재부착(위 className 대입이 지웠으므로) — 발화 시 delete로 소멸
  const top = g.querySelector('.g-top');
  let st = g.querySelector('.g-state');
  if (!st) { st = document.createElement('span'); st.className = 'g-state'; top.appendChild(st); }
  st.textContent = sev ? t(sev === 'crit' ? 'g.state.crit' : 'g.state.warn') : '';
  st.className = 'g-state' + (sev ? ' ' + sev : '');
  let num = g.querySelector('.g-num');
  if (!num) { num = document.createElement('b'); num.className = 'g-num'; g.appendChild(num); } // 행 레이아웃: 라벨|바|수치 순 — 수치는 게이지 루트 끝
  num.textContent = v;
  const exIc = g.querySelector('.g-ic'); if (exIc) exIc.remove(); // 구형 아이콘 마크업 방어적 정리
  // #199: 도킹 PDA 마이크로 게이지 동기화 — 접힘 상태에서도 보이는 상시 계측(LED 스트립)
  const dk = $('dkg-' + gkey[0]);
  if (dk) { dk.style.setProperty('--v', v + '%'); dk.className = sev; }
}
let lastResSnapshot = {};
function renderResBar() {
  const bar = $('res-chips');
  const wp = isWallpaper();
  bar.innerHTML = Object.entries(RESOURCES).map(([id, r]) => {
    const n = state.res[id] || 0;
    const changed = !wp && lastResSnapshot[id] != null && lastResSnapshot[id] !== n;
    return `<div class="res-chip ${!wp && n === 0 ? 'zero' : ''} ${changed ? 'flash' : ''}">
      <span class="re">${resIcon(id)}</span><span class="rname">${LName(r)}</span><span class="rn">${wp ? '∞' : n}</span>
    </div>`;
  }).join('');
  lastResSnapshot = { ...state.res };
  updateMoveBadge();
}
// ── #225 Tab 정보 확장 (HUD-SPEC-RECON §1.4) — 누르는 동안만 몸·집 요약 ──
//   자원은 res-bar가, 게이지 수치는 HUD가 이미 말한다 — 여기는 HUD에 '없는' 것만:
//   청결 · 컨디션(부상/피로/버프/날씨) · 쾌적 4축 · 정착 계측. 상세·조작은 PDA(중복 금지).
let hudExtOn = false;
function hudExtSet(on) {
  if (hudExtOn === on) return;
  hudExtOn = on;
  document.body.classList.toggle('hud-ext', on);
  if (on) renderHudExt();
}
function renderHudExt() {
  const el = $('hud-ext'); if (!el) return;
  const cleanV = state.cleanBy?.[state.current] ?? 70;
  const cSev = gaugeSev(cleanV);
  let h = `<div class="hx-gauge"><span class="hx-k">${t('pda.clean')}</span><span class="hx-bar"><i class="${cSev}" style="width:${Math.max(0, Math.round(cleanV))}%"></i></span><b class="hx-v">${Math.round(cleanV)}</b></div>`;
  // 컨디션 한 줄 요약 — PDA 상태 탭 lines와 동일 소스, 버튼(치료) 없이 텍스트만
  const cond = [];
  if (state.injury) {
    const inj = INJURIES[state.injury.type];
    cond.push(`${LName(inj)} — ${t('pda.injuryLeft', { h: Math.max(0, Math.ceil((state.injury.untilMin - state.gameMin) / 60)) })}`);
  }
  if (state.expFatigue === state.day) cond.push(t('exp.fatigue'));
  const w = WEATHERS[state.weatherType];
  if (w?.penalty) cond.push(`${t('pda.weatherPen')} -${Math.round(w.penalty * 100)}%`);
  if (state.buff) cond.push(buffLabel(state.buff));
  h += `<div class="hx-h">// ${t('pda.cond')}</div><div class="hx-line">${cond.length ? cond.join(' · ') : t('pda.noInjury')}</div>`;
  const cb = comfortBreakdown();
  const ax = (label, v) => `${label} ${v < 0 ? '' : '+'}${Math.round(v)}`;
  h += `<div class="hx-h">// ${t('pda.comfort')} ${cb.score}</div>`
    + `<div class="hx-line">${[ax(t('comfort.warmth'), cb.warmth), ax(t('comfort.clean'), cb.clean), ax(t('comfort.security'), cb.security), ax(t('comfort.mood'), cb.mood)].join(' · ')}</div>`
    + `<div class="hx-line dim">${t('nt.settledDays', { n: state.stayDays || 0 })} · ${t('pda.exp')} ${state.expToday}</div>`;
  el.innerHTML = h;
}
// ── #199 UI B: 우측 도킹 PDA — 전자 계측 오버레이 (상태/자원/지도/기록) ──
//   하이브리드 원칙: 계측=전자(이 단말), 기록=종이(일지 도킹=기존 저널 진입점).
//   기존 HUD는 불변 — 상단 정리 여부는 디렉터 결정 대기. 조회 전용(게임 진행 비정지).
let pdaTab = 'status';
const pdaVisible = () => $('pda-back').style.display !== 'none';
function pdaOpen(tab) {
  if (tab) pdaTab = tab;
  $('pda-back').style.display = '';
  document.body.classList.add('pda-on'); // #225 스펙 2.2: PDA가 상세를 맡는 동안 HUD는 물러난다(디밍 — 중복 금지)
  renderPDA();
  const lcd = $('pda-lcd'); // 켜질 때 LCD 부트 플리커 — 기기 핍진성
  lcd.classList.remove('pda-boot'); void lcd.offsetWidth; lcd.classList.add('pda-boot');
}
function pdaClose() { $('pda-back').style.display = 'none'; document.body.classList.remove('pda-on'); }
// #199 5차-c(디렉터 B안): HUD 메뉴 → PDA 앱 모드 — 공용 모달을 LCD 안으로 라우팅해 기존 로직 무수정 재사용.
//   #modal-back은 absolute inset:0이라 #pda-lcd(relative)로 옮기면 그대로 화면에 맞는다. 닫으면 원위치+기기 끔.
let pdaAppOn = false;
function pdaOpenApp(openFn) {
  if (paused) { toast(t('pause.blocked')); return; }
  pdaOpen(); // 부트 플리커 포함 — 기기가 켜지며 앱이 뜬다
  pdaAppOn = true;
  document.body.classList.add('pda-app');
  $('pda-lcd').appendChild($('modal-back'));
  openFn();
}
function pdaAppExit(toHome) {
  if (!pdaAppOn) return;
  pdaAppOn = false;
  document.body.classList.remove('pda-app');
  document.body.appendChild($('modal-back')); // 원위치(body 직속) 복귀 — 일반 모달 경로 보전
  // #디렉터: 앱에서 뒤로 누르면 PDA를 닫지 말고 홈(상태 탭)으로 — 인벤/자원 조회 경로 확보.
  //   그 외 경로(다른 모달 닫힘 등)는 기존대로 PDA를 끈다.
  if (toHome) { pdaTab = 'status'; renderPDA(); }
  else pdaClose();
}
function renderPDA(quiet) {
  document.querySelectorAll('#pda-tabs .pda-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === pdaTab));
  const scr = $('pda-screen');
  // #221: 탭 전환·재조회 = 화면 리프레시 스캔. quiet(0.5s 실시간 갱신)는 생략 — 매초 번쩍이면 재앙.
  if (!quiet) { scr.classList.remove('pda-refresh'); void scr.offsetWidth; scr.classList.add('pda-refresh'); }
  const mm = state.gameMin % 1440, hh = String(Math.floor(mm / 60)).padStart(2, '0'), mi = String(Math.floor(mm % 60)).padStart(2, '0');
  const w = WEATHERS[state.weatherType];
  const head = `<div class="ph">${t('pda.day', { n: state.day })} · ${hh}:${mi} · ${w ? `${wxIcon(state.weatherType)} ${LName(w)}` : ''} — ${LName(SHELTERS[state.current])}</div>`;
  let body = '';
  if (pdaTab === 'status') {
    // HUD-SPEC-RECON §1.1: PDA 게이지도 HUD와 동일 토큰(NFR-004) — 색=심각도, 임계 25/50.
    const bar = (label, v, key) => {
      const cls = gaugeSev(v);
      return `<div class="pline"><span class="pk">${label}</span><span class="pbar ${key}"><i class="${cls}" style="width:${Math.max(0, Math.round(v))}%"></i></span><span class="pv">${Math.round(v)}</span></div>`;
    };
    body = bar(t('pda.g.hunger'), state.hunger, 'hunger') + bar(t('pda.g.thirst'), state.thirst, 'thirst')
      + bar(t('pda.g.energy'), state.energy, 'energy') + bar(t('pda.clean'), state.cleanBy?.[state.current] ?? 70, 'clean');
    // #디렉터: 탐험 중 PDA에 현황 표시(구 지역탐험 패널 이관) — 지역·진행률. 빈 화면 해소.
    if (state.exp) {
      const er = REGIONS[state.exp.region];
      const remain = Math.max(0, state.exp.end - Date.now());
      const total = state.exp.dur || ((er.time || 60) * 1000);
      const pct = Math.min(100, Math.max(0, Math.round((1 - remain / total) * 100)));
      body += `<div class="ph">${t('exp.panel.title')}</div>`
        + `<div class="pline"><span class="pk">${LName(er)}</span><span class="pbar"><i style="width:${pct}%"></i></span><span class="pv">${pct}%</span></div>`;
    }
    const lines = [];
    if (state.injury) {
      const inj = INJURIES[state.injury.type];
      const h = Math.max(0, Math.ceil((state.injury.untilMin - state.gameMin) / 60));
      const canCure = resHasAll(inj.cure); // 치료 버튼 이관(구 지역탐험 패널) — 부상 카드 삭제 후 유일 치료 경로
      lines.push(`${LName(inj)} — ${t('pda.injuryLeft', { h })} <button class="pixel-btn" id="pda-treat" ${canCure ? '' : 'disabled'} style="font-size:8px;padding:2px 7px;margin-left:4px">${t('injury.treat', { cost: costLabel(inj.cure) })}</button>`);
    } else lines.push(t('pda.noInjury'));
    if (state.expFatigue === state.day) lines.push(t('exp.fatigue'));
    if (state.moodBuff && state.moodBuff.until > state.day) lines.push(t('pda.mood', { amt: state.moodBuff.amt, d: state.moodBuff.until - state.day }));
    if (w?.penalty) lines.push(`${t('pda.weatherPen')}: -${Math.round(w.penalty * 100)}%`); // 지금 몸에 걸린 것 = 여기. 진행 계측은 기록 탭으로 이관(#211)
    if (state.buff) lines.push(`${icon('icon_cond_buff', '')} ${buffLabel(state.buff)}`);
    body += `<div class="ph">${t('pda.cond')}</div>` + lines.map(l => `<div>${l}</div>`).join('');
    // #211 필드노트 흡수: 쾌적 4축 분해. PDA엔 총점()만, '왜 이 점수인가'는 노트에만 있었다 — 한 화면으로.
    //   구 `쾌적: 26 ` 라인은 삭제: 총점을 이 분해 헤더가 이미 말한다(한 화면에 점수 두 번 = 중복).
    const cb = comfortBreakdown();
    const ax = (label, v, logs) => `<div class="pax">
      <div class="pax-h"><span>${label}</span><b>${v < 0 ? '' : '+'}${Math.round(v)}</b></div>
      <div class="pax-bar"><i style="width:${Math.max(0, Math.min(100, (v / 40) * 100))}%"></i></div>
      ${(logs || []).slice(0, 2).map(l => `<div class="pax-log">${l.name} ${l.v}</div>`).join('')}
    </div>`;
    // 헤더는 짧게(`쾌적 26`): comfort.breakdownTitle("쾌적함 26 — 무엇이 이 집을 살 만하게 하는가")은
    //   좁은 LCD에서 두 줄로 접혀 화면을 먹는다(실측 45px 잘림의 최대 지분). 그 문장이 하려던 말은
    //   아래 4축이 이미 한다. (그 카피는 넓은 화면 문법 — 일지에 있던 것을 그대로 들고 오면 안 된다.)
    body += `<div class="ph">${t('pda.comfort')} ${cb.score}</div>`
      + `<div class="pax-grid">`
      + ax(t('comfort.warmth'), cb.warmth, cb.logs.warmth) + ax(t('comfort.clean'), cb.clean, cb.logs.clean)
      + ax(t('comfort.security'), cb.security, cb.logs.security) + ax(t('comfort.mood'), cb.mood, cb.logs.mood)
      + `</div>`;
  } else if (pdaTab === 'res') {
    const wp = isWallpaper(); // 자원 패널이 PDA로 이관됨 — 배경화면 모드 ∞ 표기도 승계
    body = `<div class="pgrid">` + Object.entries(RESOURCES).map(([id, r]) => {
      const n = state.res[id] || 0;
      return `<div class="pcell${!wp && n === 0 ? ' zero' : ''}">${resIcon(id)}<span>${LName(r)}</span><span class="pn">${wp ? '∞' : n}</span></div>`;
    }).join('') + `</div>`;
    // #211: 오늘의 물자 흐름은 여기가 집이다 — 구 기록 탭의 '얻은 것' + 노트 supply 탭의 '쓴 것'을 합쳐
    //   자원 탭 하나가 "지금 얼마 있고 / 오늘 얼마 들어오고 나갔나"를 다 말한다.
    const cell = ([id, n], sign) => `<div class="pcell">${resIcon(id)}<span>${LName(RESOURCES[id])}</span><span class="pn">${sign}${n}</span></div>`;
    const gains = Object.entries(state.dayLog.gain || {}).filter(([id, n]) => RESOURCES[id] && n > 0);
    const spent = Object.entries(state.dayLog.spend || {}).filter(([id, n]) => RESOURCES[id] && n > 0);
    if (gains.length) body += `<div class="ph">${t('pda.gained')}</div><div class="pgrid">` + gains.map(g => cell(g, '+')).join('') + `</div>`;
    if (spent.length) body += `<div class="ph">${t('nt.spent')}</div><div class="pgrid">` + spent.map(s => cell(s, '-')).join('') + `</div>`;
  } else if (pdaTab === 'map') {
    const sp = SHELTER_MAP[state.current];
    const cityId = cityOf(state.current);
    // 디렉터(2026-07-19): PDA 미니맵 = GPS. 내 거점(pyou) + 해금 지역만 '점'으로 마킹, 명칭 텍스트는 없다(공간 절약).
    //   위치 이름은 title 툴팁으로만. 방문 전 지역은 흐린 점, 다녀온 곳은 밝은 점. 전도와 같은 좌표계·게이트.
    const regionDots = Object.keys(MAP_MARKERS).filter(rid =>
      REGIONS[rid] && regionCityOf(rid) === cityId && regionUnlocked(rid) && !isForbiddenRegion(rid)
    ).map(rid => {
      const p = MAP_MARKERS[rid];
      const px = Math.min(MAP_SAFE.x1, Math.max(MAP_SAFE.x0, p.x));
      const py = Math.min(MAP_SAFE.y1, Math.max(MAP_SAFE.y0, p.y));
      const seen = ((state.regionVisits || {})[rid] || 0) > 0;
      return `<span class="pregion${seen ? ' seen' : ''}" style="left:${px}%;top:${py}%" title="${LName(REGIONS[rid])}"></span>`;
    }).join('');
    body = `<div class="pmap"><img src="${mapBiomeDataUrl(cityId)}" alt="" draggable="false">${regionDots}`
      + (sp ? `<span class="pyou" style="left:${sp.x}%;top:${sp.y}%" title="${LName(SHELTERS[state.current])}"></span>` : '') + `</div>`
      // 디렉터: 셸터 명칭 텍스트 노트 제거 — 내 거점은 GPS 점(pyou)으로만. 예보(어디·언제)만 유지.
      + (hasForecast() ? `<div class="pnote">${t('forecast.prefix', { text: forecastText() })}</div>` : '')
      + `<div class="pbtn-row"><button class="pixel-btn" id="pda-openmap">${t('pda.openMap')}</button></div>`;
  } else {
    // #211 기록 = '지나온 것'. 거점·진행 계측(구 상태 탭)이 여기로 온다 — 상태 탭은 '지금 몸·집'만 남기고,
    //   진행/정착 누계는 기록의 문법이다. 덕분에 네 탭 길이가 고르고 각 탭이 한 가지만 말한다.
    const base = [];
    base.push(`${distIcon(districtOf(state.current))} ${LName(DISTRICTS[districtOf(state.current)])} · ${t('nt.settledDays', { n: state.stayDays || 0 })}`);
    base.push(`${t('pda.exp')}: ${state.expToday}${state.expToday >= EXP_PER_DAY ? ` · ${t('exp.fatigue')}` : ''}`); // 상한 표기 폐지 — 과로 경고만
    if (!isWallpaper()) base.push(`${t('pda.succ')}: ${state.successes}`);
    if ((state.winters || 0) >= 1) base.push(`${t('pda.winters')}: ${state.winters}${(isZen() || isWallpaper()) ? '' : '/9'}`);
    body = `<div class="ph">${t('pda.camp')}</div>` + base.map(l => `<div>${l}</div>`).join('');
    const notes = state.dayLog.notes || [];
    body += `<div class="ph">${t('pda.tab.log')}</div>`;
    body += notes.length
      ? `<ul class="plog">${notes.slice(-12).reverse().map(n => `<li>${n}</li>`).join('')}</ul>`
      : `<div class="pnote">${t('pda.noLog')}</div>`;
    // #224 회선 기록 — 토스트 이력(증발 종식). 최근 10건 역순, 게임시각 스탬프.
    if (toastLog.length) {
      const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
      body += `<div class="ph">${t('pda.commLog')}</div>`;
      body += `<ul class="plog">${toastLog.slice(-10).reverse().map(e =>
        `<li><span style="opacity:0.6">D${e.day} ${fmtMin(e.min)}</span> ${e.msg}</li>`).join('')}</ul>`;
    }
    // #211(디렉터 "일지 그냥 PDA에 통합"): 일지·도감·업적 진입. 별도 기기가 아니라 이 단말의 앱으로 뜬다.
    body += `<div class="pbtn-row"><button class="pixel-btn" id="pda-journal">${t('btn.journal.lbl')}</button></div>`;
  }
  scr.innerHTML = head + body;
  if (!quiet) { scr.classList.remove('pda-flick'); void scr.offsetWidth; scr.classList.add('pda-flick'); } // 전자 화면 전환 플리커(실시간 갱신 시 생략)
  scr.querySelector('#pda-openmap')?.addEventListener('click', () => { pdaClose(); openObsMap(); }); // 디렉터(2026-07-24): PDA 지도도 하단 탐험 버튼과 동일한 현 관측 단말 경로로 — 구 전도(openMapModal)는 동부 폴백에서만 내부적으로 쓰인다
  scr.querySelector('#pda-treat')?.addEventListener('click', () => { treatInjury(); renderPDA(); }); // 부상 치료(구 지역탐험 패널 이관)
  scr.querySelector('#pda-journal')?.addEventListener('click', () => pdaOpenApp(() => openJournalModal('journal')));
}
async function cleanShelter(auto = false) {
  if (paused) { toast(t('pause.blocked')); return; }
  const c = state.cleanBy[state.current] ?? 70;
  if (c >= 100) { if (!auto) toast(t('clean.already')); return; }
  if (state.energy < BAL.clean.minEnergy) { if (!auto) toast(t('clean.tooTired')); return; }
  if (!auto && !(await confirmAct('confirm.clean'))) return;
  if (!resConsume('water', 1)) { if (!auto) toast(t('clean.needWater')); return; }
  state.energy = Math.max(0, state.energy - BAL.clean.energyCost);
  if (state.energy < BAL.exp.minEnergy) tipOnce('tip.energy'); // 찢어진 쪽지: 에너지 첫 20 미만
  state.cleanBy[state.current] = Math.min(100, c + 20);
  toast(t('clean.done', { n: Math.round(state.cleanBy[state.current]) }));
  state.dayLog.notes.push(t('clean.note'));
  questProgress('clean');
  scheduleSave();
  renderResBar();
  updateHud();
}

/* ============================================================
   Nine Winters(#11) — 겨울을 넘기다: 카운터 + "그 해 겨울" 수첩 + 9겨울 마일스톤
============================================================ */
// 겨울 memoir 서사 마무리 1줄 (겨울 번호별 9종). 10 이상은 9를 넘어선 톤(.beyond).
function winterMemoirLine(n) {
  if (n >= 9) return t(n === 9 ? 'winter.memoir.9' : 'winter.memoir.beyond');
  return t('winter.memoir.' + n);
}
// memoir 페이지 1장을 구성해 큐에 넣는다. 스냅샷과의 차분으로 이번 겨울을 요약.
function buildWinterMemoir(n) {
  const snap = state.winterSnap;
  // 스냅샷이 없으면(마이그레이션 절충 — 겨울 진입을 못 본 구세이브) memoir를 건너뛴다.
  if (!snap) return;
  const acc = snap.acc || { coldSnaps: 0, defended: 0, fuel: 0 };
  const days = Math.max(1, state.day - snap.day); // 이 겨울 동안 버틴 날수 (봄 첫날 - 겨울 첫날)
  const expWon = Math.max(0, (state.stats?.success || 0) - (snap.successStart || 0));
  const catLine = state.cat ? t('winter.memoir.catYes') : t('winter.memoir.catNo');
  // n=1은 "첫 겨울"(규칙 이탈 "1번째 겨울" 교정), 2~9는 기존 "{n}번째 겨울" 자연 표기 유지.
  const titleId = n === 1 ? 'winter.page.title.first' : 'winter.page.title';
  // 탐험 0회면 "0번 건졌다" 기계문 대신 "나서지 못한 겨울" 분기.
  const bodyId = expWon === 0 ? 'winter.page.body.noexp' : 'winter.page.body';
  // 2.0 부상 서사화(§9.4-④): 그 겨울에 다친 몸의 기록 — 1회는 부상명으로, 여러 번은 횟수로.
  //   무부상은 흉터가 있는 사람에게만 안도의 한 줄(첫 겨울부터 "몸 성히"는 호들갑).
  const hurtLine = (acc.injuries || 0) >= 2 ? t('winter.memoir.hurt.many', { n: acc.injuries })
    : (acc.injuries === 1 && INJURIES[acc.lastInjury]) ? t('winter.memoir.hurt.once', { name: LName(INJURIES[acc.lastInjury]) })
    : (state.scars || []).length ? t('winter.memoir.unhurt') : '';
  const page = {
    titleId, titleArgs: { n }, lang, // i18n 누수 봉합: 언어 스탬프 — cat/closing이 해석문자열이라 전환 시 부팅에서 옛 언어 pending 페이지 드롭
    bodyId,
    bodyArgs: {
      days, cold: acc.coldSnaps, defended: acc.defended, exp: expWon, fuel: acc.fuel,
      cat: catLine,
      // 2.0 깊이(§9.4): 부상 한 줄 → 대한파 한 줄 → 그 해의 맺음말 순으로 쌓인다
      closing: (hurtLine ? hurtLine + '<br>' : '')
        + (acc.front ? t(acc.frontDiscipline ? 'winter.memoir.front.' + acc.frontDiscipline : 'winter.memoir.front') + '<br>' : '')
        + winterMemoirLine(n),
    },
  };
  state.pendingWinterMemoir.push(page);
}
// 9번째 겨울 마일스톤: 특별 페이지 + 업적 + 박사 무전 예약
function buildNinthWinterMilestone() {
  const st = state.stats || {};
  const page = {
    titleId: 'winter.ninth.title', lang, // i18n: 언어 스탬프(bodyArgs.cat 해석문자열)
    bodyId: 'winter.ninth.body',
    bodyArgs: {
      day: state.day, exp: st.success || 0, craft: st.craft || 0,
      cat: state.cat ? t('winter.memoir.catYes') : t('winter.memoir.catNo'),
    },
  };
  state.pendingWinterMemoir.push(page);
  // 업적: chk:()=>state.winters>=9 로 자동 해금 (state.winters는 passWinter에서 이미 9로 세팅됨).
  // 즉시 노출을 위해 여기서도 트리거 (checkAchievements는 self-init·멱등).
  checkAchievements();
  // 박사 첫 무전: 라디오가 배치돼 있으면 그날 밤 1회, 없으면 다음 라디오 배치일까지 대기
  state.doctorRadioPending = true;
}
// 겨울을 넘겼다 — 카운터 +1, memoir 큐 적재, 9겨울이면 마일스톤. 새 스냅샷은 다음 겨울 진입 때.
function passWinter(notes) {
  state.winters = (state.winters || 0) + 1;
  // 2.0-α (§9.8.7): 도시별 겨울 기록 — 엔딩 체류 가중의 원료. RNG 0·sim 무접점(파생+가산뿐).
  //   finalWinterCity는 매 겨울 덮어쓴다 — 자연히 마지막(9번째+) 겨울의 도시가 남는다("어디서 끝났나").
  const wc = cityOf(state.current);
  state.cityWinters = state.cityWinters || {};
  state.cityWinters[wc] = (state.cityWinters[wc] || 0) + 1;
  state.finalWinterCity = wc;
  buildWinterMemoir(state.winters);
  if (state.winters === 9) buildNinthWinterMilestone();
  notes.push(t('winter.passed', { n: state.winters }));
  // 2.0 낙진 시계 (GD-2.0 §2): 정확히 그 겨울을 넘긴 아침에 한 번 — 낙진이 걷혔다.
  //   winters는 단조 증가라 자연히 1회 발화(별도 플래그·세이브 필드 불요).
  if (state.winters === BAL.forbidden.falloutWinters) notes.push(t('fallout.cleared'));
  // #170 REV3: 아홉 번째 겨울을 넘긴 봄 — 재건 목격. 남은 자(조기 이탈 escape/newworld 제외)에게만,
  //   침묵(siloFired)이면 아무것도 오지 않는다(침묵의 그림자 — 재건의 주체가 사라졌다).
  //   노크(ending_choice)는 이제 재건 비네트의 종결부로만 발화한다(runRebuildSequence 말미).
  if (state.winters >= 9 && !state.rebuildSeen && !state.siloFired
      && state.endingType !== 'escape' && state.endingType !== 'newworld') state.rebuildPending = true;
  state.winterSnap = null; // 이번 겨울 스냅샷 소진 — 다음 겨울 진입 때 새로 뜬다
}
// 박사 무전 발화 시도 (밤, 라디오 보유 시). processDay 말미에서 호출.
function tryDoctorRadio() {
  if (state.pendingEvent) return;                    // 다른 인카운터 대기 중이면 다음 날
  // 9겨울 첫 무전 (라디오 보유 시) — 구조(ending_choice)보다 먼저: 복선이 초대보다 앞선다.
  //   §9.5 검수(2026-07-08): 같은 밤 경합 시 구조가 무전을 밀어내던 순서 역전 교정 —
  //   9겨울 밤=박사의 무전, 이튿날 밤=문 두드리는 소리. 라디오 미보유면 무전만 보류(구조는 막지 않는다).
  if (state.doctorRadioPending && items.some(i => i.defId === 'radio')) {
    state.doctorRadioPending = false;
    state.pendingEvent = 'doctor_radio';
    state.lastEventDay = state.day;
    return;
  }
  // #170 REV3 마이그레이션: 구판 endingChoicePending(9겨울 노크 예약)은 재건 비네트로 승격한다 —
  //   노크는 재건의 종결부다. 침묵(siloFired)·조기 이탈 세이브는 예약만 소거(아무것도 오지 않는다).
  if (state.endingChoicePending && !state.rebuildSeen) {
    state.endingChoicePending = false;
    if (!state.siloFired && state.endingType !== 'escape' && state.endingType !== 'newworld') state.rebuildPending = true;
  }
  // #170 REV3: 재건의 봄 — 도입 모달(rebuilding) → 카드(runRebuildSequence) → 노크(ending_choice) 순.
  if (state.rebuildPending && !state.rebuildSeen) {
    state.rebuildPending = false;
    state.pendingEvent = 'rebuilding';
    state.lastEventDay = state.day;
    return;
  }
  // #170 REV3: 재건을 본 다음 밤, 문 두드리는 소리 — endingChoicePending은 runRebuildSequence 말미가 세운다.
  if (state.endingChoicePending && !state.endingType) {
    state.endingChoicePending = false;
    state.pendingEvent = 'ending_choice';
    state.lastEventDay = state.day;
    return;
  }
  // #170 REV3: 밤의 교신 — 사일로를 보고 돌아선 자에게 +2일 밤, 박사의 마지막 물음(1회).
  //   무기록 원칙: doctorCallSeen은 발화 시점에 세워 내려두기·닫기로도 재발화하지 않는다.
  if (state.siloSeen > 0 && !state.siloFired && !state.doctorCallSeen && !state.endingType
      && state.day >= state.siloSeen + 2) {
    state.doctorCallSeen = true;
    state.pendingEvent = 'doctor_call';
    state.lastEventDay = state.day;
    return;
  }
  // 2.0 조기 탈출 (§9.5): 정기 교신 +7일 확정 제안(랜덤 없음). 보류하면 소진.
  //   #170 REV3: 안식을 선언한 사람(endingStayed)에겐 더 묻지 않는다 — 이미 답했다.
  if (state.earlyRescueDay > 0 && state.day >= state.earlyRescueDay && !state.endingType && !state.endingStayed && state.winters < 9) {
    state.earlyRescueDay = 0;
    state.pendingEvent = 'early_rescue';
    state.lastEventDay = state.day;
    return;
  }
  // 2.0 §9.6 히든 루트: 개척 완공 후 첫 밤 — 통로 끝의 연구소, 박사와의 대면(유보)
  if (state.hiddenReachPending && !state.hiddenReached) {
    state.hiddenReachPending = false;
    state.pendingEvent = 'hidden_reach';
    state.lastEventDay = state.day;
    return;
  }
  // 1.4 정기 교신 — 모든 수집물을 송출한 뒤 개방. 무전 기지를 세운 사람이라 라디오 보유 조건은 두지 않는다(기지가 곧 무전).
  if (state.doctorRadioRegularPending && !state.doctorRegularSeen) {
    state.doctorRadioRegularPending = false;
    state.pendingEvent = 'doctor_radio_regular';
    state.lastEventDay = state.day;
    // 2.0 §9.5: 박사와 닿은 사람에겐 조기 탈출의 문이 열린다 — 이레 뒤 확정 제안(9겨울 전이라면)
    if (!state.endingType && state.earlyRescueDay === 0) state.earlyRescueDay = state.day + 7;
  }
}
// 라디오 방송 청취 시도 (#12) — 라디오 배치+ON, 하루 1회, BAL 확률로 미수집 방송 1개 예약.
function tryRadioBroadcast(notes) {
  if (state.lastBroadcastDay === state.day) return;      // 하루 1회
  if (!items.some(i => i.defId === 'radio' && i.on !== false)) return; // 라디오 ON 필요
  if (Math.random() >= BAL.events.radioListenChance) return;
  const un = Object.keys(BROADCASTS).filter(id => !(state.broadcasts || {})[id]
    && (!BROADCASTS[id].gate || BROADCASTS[id].gate(state))); // 게이트(예: 후속작 떡밥 crew_intercept = 겨울 2회+) 미충족은 풀에서 제외
  if (!un.length) return;                                // 다 모음
  const id = un[Math.floor(Math.random() * un.length)];
  state.lastBroadcastDay = state.day;
  state.pendingBroadcast = id;                           // tickTime 이 결산 뒤 모달로 연다
  notes.push(t('radio.heardNote', { title: LN(BROADCASTS[id]) }));
}
// ── 2.0 대한파 자기 규율 선택 (§9.4-③, 하드/하드코어 전용 — 디렉터 확정 2026-07-08) ──
// 프론트 발동 아침 보고를 닫은 뒤 1회. 하나를 고르면 프론트가 끝날 때까지 지속(변경 불가).
// state.front.discipline === null 이 "선택 대기" — tickTime 드레인 체인이 이 모달을 연다.
function openFrontChoiceModal() {
  const D = BAL.greatColdSnap.discipline;
  const row = (id, name, desc) => `
    <button class="pixel-btn" data-front="${id}" style="display:block;width:100%;text-align:left;margin:6px 0;padding:8px 10px;white-space:normal">
      <b>${name}</b><br><span style="font-size:10px;opacity:.75">${desc}</span>
    </button>`;
  openModal(t('front.choice.title'), `
    <div style="line-height:1.8;margin-bottom:8px">${t('front.choice.body')}</div>
    ${row('ration', t('front.disc.ration'), t('front.disc.ration.desc'))}
    ${row('sleepless', t('front.disc.sleepless'), t('front.disc.sleepless.desc'))}
    ${row('emergency', t('front.disc.emergency'), t('front.disc.emergency.desc', { n: D.emergencyCanned }))}
    ${row('none', t('front.disc.none'), t('front.disc.none.desc'))}`, 'frontChoice');
  $('modal-body').querySelectorAll('[data-front]').forEach(b => b.addEventListener('click', () => {
    if (!state.front || state.front.discipline !== null) { closeModal(); return; } // 중복 클릭/유령 상태 가드
    const id = b.getAttribute('data-front');
    state.front.discipline = id;
    if (id === 'emergency') { resAdd('canned', D.emergencyCanned); renderResBar(); }
    state.dayLog.notes.push(t('front.disc.chose.' + id));
    toast(t('front.disc.chose.' + id));
    closeModal(); updateHud(); scheduleSave();
  }));
}

/* ============================================================
   하루 처리 & 일일 리포트 (기획서 v0.2: SYSTEM 03/04/07)
============================================================ */
function processDay() {
  // 롤링 백업: 하루가 바뀌는 시점에 어제까지의 세이브를 -bak 키로 보관
  try {
    const cur = localStorage.getItem(slotKey(currentSlot));
    if (cur) localStorage.setItem(backupKey(currentSlot), cur);
  } catch (e) { /* 저장 실패는 무시 */ }
  const notes = state.dayLog.notes;
  const perk = SHELTERS[state.current].perk || {};
  state.expToday = 0; // 새 하루, 새 걸음
  state.icefishToday = 0; // 1.1: 얼음낚시 하루 스팟 리셋
  state.marketToday = 0;  // 1.2: 암시장 하루 교환 슬롯 리셋
  state.nightSkyToday = 0; // 1.3: 밤하늘 이벤트 하루 1회 리셋
  // 첫 3일 튜토리얼: Day 2/3 아침에 다음 페이지를 표시 대기열에 넣는다 (day-report 뒤로 미룸)
  // tutDay>=1: Day 1 페이지(신규 게임)를 이미 본 경우에만 이어서 진행 — 구세이브는 tutDay 0 그대로라 대상 아님
  // 퀘스트 트래커가 아직 진행 중이면(questActive) 온보딩 중복을 피하려고 자동 페이지를 띄우지 않는다
  if ((state.day === 2 || state.day === 3) && state.tutDay >= 1 && state.tutDay < state.day && !questActive()) {
    state.pendingTutorial = state.day; // 이틀치가 한 번에 지나가면(오프라인 정산) 최신 페이지로 갱신
  }
  // 정든 집
  state.stayDays = (state.stayDays || 0) + 1;
  // 2.0-α (§9.8.7): 셸터별 최장 연속 체류 기록 — stayDays는 이주 시 0 리셋이라 "정든 집" 이력이 증발했다.
  state.homeStay = state.homeStay || {};
  if (state.stayDays > (state.homeStay[state.current] || 0)) state.homeStay[state.current] = state.stayDays;
  if (state.stayDays === 3) notes.push(t('settled.3'));
  if (state.stayDays === 8) notes.push(t('settled.8'));
  // 계절 전환
  if (seasonOf(state.day).id !== seasonOf(state.day - 1).id) {
    const se = seasonOf(state.day);
    const prev = seasonOf(state.day - 1);
    notes.push(t('season.arrived', { icon: se.icon, name: LName(se), desc: LDesc(se) }));
    toast(t('season.changed', { icon: se.icon, name: LName(se) }));
    rollWeather(); // 새 계절의 날씨로
    if (se.id === 'winter') { tipOnce('tip.winter'); beginWinterSnapshot(); } // 겨울 진입: memoir용 스냅샷
    // ── Nine Winters(#11): 겨울을 "넘긴" 순간 = 겨울 마지막 날을 거처에서 맞고 봄으로 넘어온 오늘
    if (prev.id === 'winter' && se.id === 'spring' && !isWallpaper()) passWinter(notes); // #194: 배경화면엔 9겨울 서사 없음
  }
  // ── 한파 (겨울 보스): 예보 → 발동 → 지속 → 종료 (Phase B) ──
  {
    const wk = seasonIndex(state.day);
    if (state.coldSnapWinterKey !== wk) { state.coldSnapWinterKey = wk; state.coldSnapsThisWinter = 0; } // 겨울 바뀌면 카운터 리셋
    const inWinter = seasonOf(state.day).id === 'winter';
    const S = BAL.seasons;
    // 1) 예보된 한파가 도래하면 발동
    if (inWinter && !isWallpaper() && state.coldSnapForecast > 0 && state.day >= state.coldSnapForecast && !state.coldSnap) { // #194: 배경화면 한파 발동 차단(프론트 게이트와 대칭)
      const dur = S.coldSnapMinDur + Math.floor(Math.random() * (S.coldSnapMaxDur - S.coldSnapMinDur + 1));
      state.coldSnap = { until: state.day + dur - 1, severity: 1 };
      state.coldSnapForecast = 0;
      state.coldSnapsThisWinter++;
      if (state.winterSnap?.acc) state.winterSnap.acc.coldSnaps++; // memoir: 이번 겨울 한파 횟수
      notes.push(t('coldsnap.hit'));
      toast(t('coldsnap.toast'));
    }
    // ── 2.0 대한파 프론트 (§9.4-③): 연례 1회 확정, 겨울 고정일 발령 — 랜덤 없음.
    //    기존 랜덤 한파 상한(coldSnapsThisWinter) 밖 별도. 진행 중 랜덤 한파가 있으면 더 강한 쪽으로 흡수.
    //    ※ sim 제외(!_simRunning — regionVisits와 같은 순수성 가드): 프론트가 활성인 3일간 4)의 예보 롤이
    //      멎어 sim 실현 한파가 2.2→1.6회/겨울로 줄고 하드코어 치명성이 붕괴한다(사망 25%→5%, 20시드 실측).
    //      sim은 경제 회귀 측정기라 베이스라인 불가침 — 실게임은 프론트(강도 2~3, 3일)가 얹혀 더 험하다.
    {
      const GC = BAL.greatColdSnap;
      const sd = seasonDay(state.day);
      if (inWinter && state.frontWinterKey !== wk && !isWallpaper() && !_simRunning) {
        // 예보 (발동 전날들 — 오프라인 스킵으로 예보일을 건너뛰어도 발동은 아래 >= 가 잡는다)
        if (sd >= GC.forecastSeasonDay && sd < GC.hitSeasonDay) {
          notes.push(t('front.forecast', { n: GC.hitSeasonDay - sd }));
        }
        // 발동
        if (sd >= GC.hitSeasonDay && sd <= GC.hitSeasonDay + GC.durDays - 1) {
          state.frontWinterKey = wk;
          const hadSnap = !!state.coldSnap; // 진행 중 랜덤 한파를 흡수하는 경우 — memoir 이중 카운트 방지
          const sev = isHard() ? GC.severityHard : GC.severityNormal;
          const until = state.day + (GC.hitSeasonDay + GC.durDays - 1 - sd); // 남은 프론트 일수만큼
          state.coldSnap = {
            until: Math.max(until, state.coldSnap?.until || 0),
            severity: Math.max(sev, state.coldSnap?.severity || 0),
            front: true,
          };
          // ※ coldSnapForecast는 건드리지 않는다 — 예보된 랜덤 한파는 프론트가 끝난 뒤 그대로 도래(상한 밖 "별도" 원칙).
          //   지우면 겨울 총 압박일수가 줄어 하드코어 치명성이 붕괴한다(실측 사망 25%→5%, 2026-07-08 프로브).
          state.front = { discipline: isHard() ? null : 'none' }; // 하드/하드코어만 규율 선택 대기(null → 아침 보고 뒤 모달)
          if (state.winterSnap?.acc) { if (!hadSnap) state.winterSnap.acc.coldSnaps++; state.winterSnap.acc.front = true; }
          notes.push(t('front.hit'));
          toast(t('front.toast'));
        }
      }
    }
    // 2) 진행 중인 한파: 오늘 방어 여부에 따른 서사 (하루 1회)
    if (state.coldSnap && inWinter && state.day <= state.coldSnap.until) {
      const defended = coldSnapNetSeverity() <= 0;
      if (defended && state.winterSnap?.acc) state.winterSnap.acc.defended++; // memoir: 방어 성공한 한파-일
      notes.push(defended ? (state.coldSnap.front ? t('front.defended') : t('coldsnap.defended'))
        : (state.coldSnap.front ? t('front.exposed') : t('coldsnap.exposed')));
    }
    // 3) 한파 종료 — 프론트였다면 규율도 함께 접는다 (그 밤을 넘겼다)
    if (state.coldSnap && (!inWinter || state.day > state.coldSnap.until)) {
      const wasFront = !!state.coldSnap.front;
      state.coldSnap = null;
      if (wasFront) {
        if (state.front?.discipline && state.front.discipline !== 'none' && state.winterSnap?.acc) state.winterSnap.acc.frontDiscipline = state.front.discipline;
        state.front = null;
        notes.push(t('front.ended'));
      } else notes.push(t('coldsnap.ended'));
    }
    // 4) 예보 발령: 겨울 중, 미발동·미예보, 겨울당 상한 미만, 확률 판정 → 리드타임 뒤로 예약
    //    하드는 한파가 더 잦고(확률 ×1.6) 더 많이 온다(상한 +1) — "첫 겨울이 진짜 시험" (v1.0.0)
    const snapCap = S.coldSnapMaxPerWinter + (isHard() ? BAL.hard.coldSnapExtraPerWinter : 0);
    // 1.3 고도 페널티: 고원 셸터(altitude) 거주 시 한파가 더 잦다 (확률 배수). 로지 단열/벽난로가 페널티를 상쇄.
    const altMul = SHELTERS[state.current].altitude ? BAL.highland.altitudeColdSnapChanceMul : 1;
    const snapChance = S.coldSnapChancePerDay * (isHard() ? BAL.hard.coldSnapChanceMul : 1) * altMul;
    // v1.4.1(오디트 E P1-1): 하드 한정 예보 리드 단축 → 발령 창 확대. 노말은 기존 값(2) 유지.
    const fcDays = isHard() ? BAL.hard.coldSnapForecastDaysOverride : S.coldSnapForecastDays;
    if (inWinter && !isWallpaper() && !state.coldSnap && state.coldSnapForecast === 0 && // #194: 배경화면 예보 롤 차단
        state.coldSnapsThisWinter < snapCap &&
        seasonDay(state.day) <= SEASON_DAYS - fcDays - 1 && // 겨울 끝에 걸치지 않게
        Math.random() < snapChance) {
      // 관제탑 퍽(forecastLead) + 예보 지식(§9): 한파 예보 리드타임 +N일. 없으면 0.
      const lead = (SHELTERS[state.current].perk?.forecastLead || 0) + knowForecastLead();
      state.coldSnapForecast = state.day + fcDays + lead;
    }
  }
  // ── 1.3 눈사태 (겨울 고원 재난 2호): 예보(우르릉) → 당일 리조트 탐험에 우회 선택 or 봉쇄 ──
  //   한파 예보 문법 재사용. 리조트가 해금돼 있고 겨울일 때만 의미. cozy 캐논: 사망 없음(부상/시간 손실 계열).
  {
    const H = BAL.highland;
    const inWinter = seasonOf(state.day).id === 'winter';
    const resortOpen = regionUnlocked('resort'); // 로지 해금 후에만
    // 1) 봉쇄 만료
    if (state.avalancheBlockUntil > 0 && state.day > state.avalancheBlockUntil) {
      state.avalancheBlockUntil = 0;
      notes.push(t('avalanche.cleared'));
    }
    // 2) 예보 발령 (겨울·리조트 개방·미예보·미봉쇄·확률). 리드타임 뒤 "당일"이 오면 그날 리조트 탐험 시 선택지.
    if (inWinter && !isWallpaper() && resortOpen && state.avalancheForecast === 0 && state.avalancheBlockUntil === 0 && // #194: 배경화면 눈사태 롤 차단
        Math.random() < H.avalancheChancePerDay) {
      state.avalancheForecast = state.day + H.avalancheForecastDays;
      notes.push(t('avalanche.forecast'));
    }
    // 3) 예보 당일이 지났는데 손대지 않았으면(리조트 탐험 안 함) → 자연 봉쇄로 전환 (avalancheDur일)
    else if (state.avalancheForecast > 0 && state.day > state.avalancheForecast) {
      state.avalancheForecast = 0;
      state.avalancheBlockUntil = state.day + H.avalancheDur - 1;
      notes.push(t('avalanche.blocked'));
    }
  }
  // #189 P2: 태양광 = 지속 급전 승격 — 설치돼 있으면 조명·가전 배터리 소비 무료(주간 충전 픽션, 상시).
  //   발전량(이틀 배터리 +1)은 기존 캘리브레이션 유지 — "전력 걱정 해소"는 급전이, 잉여는 기존 산출이 맡는다.
  //   밸런스 축 완성: 어둠(무비용) ↔ 화기(연료) ↔ 전기조명(전력 관리) ↔ 태양광(초기투자→무한).
  //   #193: 태양광 판정을 발전기보다 먼저 — 뒤에 두면 켜둔 발전기가 연료를 중복 연소(감사 확정 결함).
  let freePower = false;
  if (hasMod('solar')) {
    freePower = true;
    // 노트는 실제 전기 부하(조명 설비·배터리 가전·전기 조명)가 있는 날만 — 아침 보고 스팸 방지
    const anyBatteryLoad = hasMod('lighting') || items.some(it => it.on !== false &&
      (DEFS[it.defId].light?.fuel === 'battery' || (DEFS[it.defId].appliance?.fuel === 'battery' && DEFS[it.defId].appliance?.effect !== 'power')));
    if (anyBatteryLoad) notes.push(t('day.solarPower'));
  }
  // 1) 발전기: 연료를 태우면 그날 배터리 소비가 무료. 태양광 급전 중이면 연료를 태우지 않는다(무소모 대기).
  for (const it of items) {
    if (DEFS[it.defId].appliance?.effect !== 'power' || it.on === false) continue;
    if (freePower) continue;
    if (resConsume('fuel', 1)) {
      freePower = true;
      notes.push(t('day.genRun'));
    } else {
      setItemPower(it, false);
      notes.push(t('day.genStop'));
    }
  }
  const consumeFuel = (fuelId, n = 1) => (fuelId === 'battery' && freePower) ? true : resConsume(fuelId, n);
  // 2) 켜진 조명·가전의 일일 연료 소비 (부족 시 자동 꺼짐)
  // v0.9.1: 캔들 스툴(candle 가구)만 이틀에 1개 소비로 완화 — 그 외(랜턴 등)는 매일 그대로
  const batteryOut = []; // #195: 배터리 소진 아침, 같은 사실이 가구 수만큼 반복되던 노트를 1줄로 집약
  for (const it of items) {
    const def = DEFS[it.defId];
    const fuelId = def.light?.fuel || (def.appliance?.effect !== 'power' ? def.appliance?.fuel : null);
    if (!fuelId || it.on === false) continue;
    if (it.defId === 'candle' && state.day % 2 === 0) continue; // 캔들 스툴은 격일 소비
    // 2.0 대한파 쪽잠 규율(§9.4-③): 불침번이 불씨를 지킨다 — 난방류(난로·온풍기) 연료 격일 소비
    if (frontDiscipline() === 'sleepless' && state.day % 2 === 0 && (it.defId === 'stove' || def.appliance?.effect === 'heat')) continue;
    if (!consumeFuel(fuelId, 1)) {
      setItemPower(it, false);
      if (fuelId === 'battery') { batteryOut.push(LName(def)); continue; }
      notes.push(t('day.fuelOut', { fuel: LName(RESOURCES[fuelId]), name: LName(def) }));
    }
  }
  if (batteryOut.length === 1) notes.push(t('day.fuelOut', { fuel: LName(RESOURCES.battery), name: batteryOut[0] }));
  else if (batteryOut.length > 1) notes.push(t('day.powerOutGroup', { names: batteryOut.join(' · ') }));
  // #230 스크래처 마모: 고양이가 사는 집에서만 닳는다 — 수명 도달 시 부서져 소멸(회수 불가, 재제작 루프).
  //   임박(잔여 2일)에 예고 노트 1줄 — 소리 없이 사라지면 "가구가 증발했다" 신고가 된다.
  if (state.cat) {
    for (const it of [...items]) {
      if (it.defId !== 'catscratcher') continue;
      it.wear = (it.wear || 0) + 1;
      const life = BAL.catset.scratcherLifeDays;
      if (it.wear >= life) { removeItem(it); notes.push(t('day.scratcherGone')); }
      else if (it.wear === life - 2) notes.push(t('day.scratcherWorn'));
    }
  }
  // #189 P1: 조명 설비 전력 — 전등은 배터리를 먹는다(발전기 가동 시 무료). 끊기면 소등 → 폴백 어둠.
  //   재급전은 다음 날 자동 재시도(수동 조작 불요) — 복구/단전 전이 시에만 노트 1줄.
  if (hasMod('lighting')) {
    if (consumeFuel('battery', 1)) {
      if (state.lightingOut) notes.push(t('day.lightingBack'));
      state.lightingOut = false;
    } else if (!state.lightingOut) {
      state.lightingOut = true;
      notes.push(t('day.lightingOut'));
    }
  }
  // 3) 생산: 정수기 / 자동 급수기 / 거처 특성 (온실 텃밭, 여객선 낚시)
  // 수도관 동파(frozen_pipe) 방치 시 정수기 계열이 며칠 멎는다.
  const pipeFrozen = state.day <= (state.pipeFrozenUntil || 0);
  if (pipeFrozen) notes.push(t('ev.frozenpipe.note1'));
  for (const it of items) {
    const eff = DEFS[it.defId].appliance?.effect;
    if (eff === 'water' && it.on !== false && !pipeFrozen) {
      resAdd('water', BAL.economy.purifierWaterPerDay);
      notes.push(t('day.purifier'));
    } else if (eff === 'water2' && it.on !== false && !pipeFrozen) {
      resAdd('water', BAL.economy.autoWaterPerDay);
      notes.push(t('day.autopurifier', { n: BAL.economy.autoWaterPerDay }));
    }
  }
  // 정수 지식(§9): 이슬·빗물을 모아 거르는 법 — 전 셸터 매일 물 +N (배관 동파와 무관, 가전 아님).
  const kWater = knowWaterPerDay();
  if (kWater > 0) { resAdd('water', kWater); notes.push(t('day.knowWater', { n: kWater })); }
  if (perk.produce) {
    // 겨울엔 텃밭이 얼어붙는다 (온실 재배 중단, 낚시는 가능)
    if (seasonOf().id === 'winter' && state.current === 'greenhouse') {
      notes.push(t('day.gardenFrozen'));
    } else {
      for (const [rid, n] of Object.entries(perk.produce)) {
        resAdd(rid, n);
        notes.push(t('day.produce', { note: LF(perk, 'produceNote'), emoji: RESOURCES[rid].emoji, n }));
      }
    }
  }
  // 텃밭 지식(§9): 어디서든 기르는 소형 텃밭 — 매일 식량 +N (겨울 휴면). knowGardenAnywhere=게이트, knowGardenBonus=수확량.
  if (knowGardenAnywhere() && seasonOf().id !== 'winter') { const g = knowGardenBonus(); if (g > 0) { resAdd('food', g); notes.push(t('day.knowGarden', { n: g })); } }
  // 4) 음식 부패: 가동 중인 냉장고가 없으면 매일 신선식품만 -1 (통조림은 부패하지 않음)
  const fridgeOn = items.some(it => DEFS[it.defId].appliance?.effect === 'fridge' && it.on !== false);
  // 찢어진 쪽지: 냉장고 없이 신선식품을 보유한 첫 순간 — 오늘 먹으라는 조언 (1회성)
  if (!fridgeOn && (state.res.food || 0) > 0) tipOnce('tip.freshfood');
  if (!fridgeOn && (state.res.food || 0) > 0) {
    // 여름엔 부패 가속(×summerSpoilMult). 보존 지식(§9)이면 부패 ×0.5. 소수부는 확률 반올림으로 기댓값 보존.
    let spoil = BAL.economy.foodSpoilPerDay * knowSpoilMul();
    if (seasonOf().id === 'summer') spoil *= BAL.seasons.summerSpoilMult;
    const frac = spoil - Math.floor(spoil);
    spoil = Math.floor(spoil) + (frac > 0 && Math.random() < frac ? 1 : 0); // frac=0이면 Math.random 미호출 — 시드 시뮬 RNG 시퀀스 보존(비-여름 베이스 불변)
    if (spoil > 0) { resConsume('food', spoil); notes.push(t(seasonOf().id === 'summer' ? 'day.foodSpoiledSummer' : 'day.foodSpoiled')); }
  } else if (fridgeOn) {
    notes.push(t('day.foodFresh'));
  }
  // 청결도 일일 감소 + 거처별 현실 제약
  const sh = SHELTERS[state.current];
  const wBad = state.weatherType === 'rain' || state.weatherType === 'snow' || state.weatherType === 'storm';
  let dirt = Math.max(0, BAL.economy.dailyDirt - knowDirtReduce()); // v0.9.1: 2→1 완화 · 정리 지식(§9): 기본 감소 추가 경감
  if (sh.dailyDirt) { dirt += sh.dailyDirt; notes.push(t('day.seaDamp')); }
  if (sh.weatherDirt && wBad) { dirt += sh.weatherDirt; notes.push(t('day.openWet', { icon: WEATHERS[state.weatherType].icon })); }
  if (sh.stormRepair && sh.stormRepair.includes(state.weatherType) && !hasMod('roof')) {
    if (resConsume('material', 1)) notes.push(t('day.roofRepair'));
    else { dirt += 8; notes.push(t('day.roofLeak')); }
  }
  if (sh.rainCatch && wBad) {
    resAdd('water', sh.rainCatch);
    notes.push(t('day.rooftopRain', { n: sh.rainCatch }));
  }
  // 돔 벙커 천장 구멍(#36): 임시덮개/완전수리 전에는 비 오는 날 청결이 더 떨어진다.
  if (state.current === 'bunker' && state.bunkerRoof === 'hole' && wBad) {
    dirt += BAL.economy.bunkerRoofDirtPerDay;
    notes.push(t('bunker.roofNote'));
  }
  // 옥탑 슬레이트 지붕(#53): 두 장 빠진 상태(gapped)에서는 비/눈 오는 날 청결이 소폭 더 떨어진다. (벙커 천장 문법)
  if (state.current === 'rooftop' && (state.rooftopSlate || 'gapped') !== 'full' && wBad) {
    dirt += BAL.economy.rooftopSlateDirtPerDay;
    notes.push(t('rooftop.slateNote'));
  }
  // 거처 개조 효과
  if (hasMod('raincatch') && wBad) {
    const n = hasMod('bigraincatch') ? BAL.economy.bigRaincatchWater : 1;
    resAdd('water', n); notes.push(t(hasMod('bigraincatch') ? 'day.bigraincatch' : 'day.raincatch', { n }));
  }
  // #108 텃밭 확률화: 하드일수록 흉작 리스크 (노말/무한/배경화면 1.0 — 기존 결정론 유지)
  const gardenRoll = () => Math.random() < (BAL.modes.gardenChance[state.mode] ?? 1);
  if (hasMod('garden') && state.day % 2 === 0) {
    if (seasonOf().id === 'winter') notes.push(t('day.gardenBoxFrozen'));
    else if (!gardenRoll()) notes.push(t('day.gardenMiss'));
    else { resAdd('food', 1); notes.push(t('day.gardenBox')); }
  }
  // 옥상 텃밭(#53): 매일 생산. 겨울엔 휴면(0). 생산량 = 기본 × 옥탑 퍽 gardenMult(2). 성장 단계 진행(시각).
  if (hasMod('rooftopGarden')) {
    if (seasonOf().id === 'winter') {
      notes.push(t('rooftop.gardenDormant'));
    } else if (!gardenRoll()) {
      notes.push(t('day.gardenMiss')); // #108 흉작일 — 수확 0 (성장 단계도 그날은 정지)
    } else {
      const n = BAL.economy.rooftopGardenFoodPerDay * (perk.gardenMult || 1);
      resAdd('food', n);
      notes.push(t('rooftop.gardenHarvest', { n }));
      // 성장 단계 진행 (0→1→2에서 멈춤) — 시각 연출용
      if ((state.rooftopGardenStage ?? 0) < 2) state.rooftopGardenStage = (state.rooftopGardenStage ?? 0) + 1;
    }
  }
  // 1.2 버섯 재배칸(subway 전용): 어둠 속 연중 생산(겨울 포함). 옥탑 텃밭의 대칭 — 볕/여름 vs 어둠/연중.
  //   매일 음식 +1, mushroomWaterEvery(2)일마다 물 1 소모. 물이 없으면 그날 수확 없음(습기 없이는 못 자란다).
  if (hasMod('mushroom')) {
    const M = BAL.subway;
    state.mushroomWaterTimer = (state.mushroomWaterTimer || 0) + 1;
    let watered = true;
    if (state.mushroomWaterTimer >= M.mushroomWaterEvery) {
      state.mushroomWaterTimer = 0;
      if (resConsume('water', M.mushroomWater)) { notes.push(t('subway.mushroomWater', { n: M.mushroomWater })); }
      else { watered = false; notes.push(t('subway.mushroomDry')); }
    }
    if (watered) { resAdd('food', M.mushroomFoodPerDay); notes.push(t('subway.mushroomHarvest', { n: M.mushroomFoodPerDay })); }
  }
  if (hasMod('solar') && state.day % 2 === 1) { resAdd('battery', 1); notes.push(t('day.solar')); }
  // #76 지식과 사치: 잉여 식량을 암시장에 내다 팔아 책(지식)으로 — 후반 무한 인플레의 캡.
  //   food+canned 합이 surplusCap 위로 넘칠 때만, 초과분을 하루 sellPerDay까지 판다. 임계치가 곧 안착선이라
  //   Day30/60 밴드(110~160 / 122~147)는 구조적으로 불가침 — 후반 폭주분만 깎는다(목표 300~400).
  //   신선식품부터 판다(부패 전에 내다 판다는 개연성). 판 누적이 perBook마다 책 1권. 노트는 책 얻은 날만(리포트 청결).
  if (!isWallpaper()) {
    const LX = BAL.luxury;
    const cap = LX.surplusCap[state.mode] ?? LX.surplusCapDefault; // 난이도별 안착선 (하드/하드코어일수록 낮다 = 더 빡세다)
    const surplus = (state.res.food || 0) + (state.res.canned || 0);
    if (surplus > cap) {
      const sell = Math.min(surplus - cap, LX.sellPerDay);
      const sellFood = Math.min(sell, state.res.food || 0);
      if (sellFood > 0) resConsume('food', sellFood);
      if (sell - sellFood > 0) resConsume('canned', sell - sellFood);
      state.bookProgress = (state.bookProgress || 0) + sell;
      let earnedBooks = 0;
      while (state.bookProgress >= LX.perBook) { state.bookProgress -= LX.perBook; earnedBooks++; }
      if (earnedBooks > 0) { resAdd('book', earnedBooks); notes.push(t('day.surplusSold', { n: sell, b: earnedBooks })); }
    }
  }
  state.cleanBy[state.current] = Math.max(0, (state.cleanBy[state.current] ?? 70) - dirt);
  if (state.cleanBy[state.current] < 20) notes.push(t('day.veryDirty'));
  // 셸터 유지비
  const up = sh.upkeep;
  if (up) {
    if (state.day % up.every === 0) {
      // 효율 난방 지식(§9): 연료 유지비 ×knowHeatFuelMul(0.75). 소수부는 확률 반올림 — frac>0일 때만 Math.random(시드 시뮬 시퀀스 보존).
      let upN = up.n;
      if (up.res === 'fuel' && knowHeatFuelMul() !== 1) { const x = up.n * knowHeatFuelMul(); const f = x - Math.floor(x); upN = Math.floor(x) + (f > 0 && Math.random() < f ? 1 : 0); }
      if (upN <= 0) { state.upkeepOk = true; } // 효율 난방으로 그날은 연료 소모 없음
      // #193: 배터리 유지비(벙커 환기·지하철 팬·관제탑 콘솔)도 태양광/발전기 급전 커버 — consumeFuel 경유
      else if (consumeFuel(up.res, upN)) {
        state.upkeepOk = true;
        notes.push(t('day.upkeepPaid', { emoji: RESOURCES[up.res].emoji, name: LName(RESOURCES[up.res]), n: upN }));
      } else {
        state.upkeepOk = false;
        notes.push(t('day.upkeepUnpaid', { label: LLabel(up) }));
      }
    }
  } else state.upkeepOk = true;
  // 1.3 고도 페널티 — 고원 셸터(altitude) 거주 시 연료 소모 +30%. 그날 태운 연료(벽난로 유지비 + 연료 조명/가전)의
  //   30%를 추가 지불한다(기댓값 = ×1.3). 소수부는 확률 반올림으로 기댓값 보존. 연료 없으면 벽난로 온기 정지(upkeepOk).
  if (SHELTERS[state.current].altitude) {
    let baseFuel = 0;
    if (up && up.res === 'fuel' && state.day % up.every === 0 && state.upkeepOk) baseFuel += up.n; // 유지비 연료
    for (const it of items) { // 연료를 태우는 조명/가전
      if (it.on === false) continue;
      const def = DEFS[it.defId];
      const fuelId = def.light?.fuel || (def.appliance?.effect !== 'power' ? def.appliance?.fuel : null);
      if (fuelId === 'fuel') baseFuel += 1;
    }
    if (baseFuel > 0) {
      const x = baseFuel * (BAL.highland.altitudeFuelMult - 1);
      const surcharge = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
      if (surcharge > 0) {
        if (resConsume('fuel', surcharge)) notes.push(t('highland.altitudeFuel', { n: surcharge }));
        else { state.upkeepOk = false; notes.push(t('highland.altitudeCold')); } // 고도 난방 연료 부족 → 벽난로 온기 정지
      }
    }
  }
  // 부상 방치 → 악화. 2.0 §9.3: 하드코어는 다단계 사슬(minor→deep→critical) — 같은 롤의 목적지만
  //   바꾼다(신규 Math.random 없음 — sim 스트림 불변). 노말/하드는 기존 →infection 그대로.
  if (state.injury && INJURIES[state.injury.type].infect && Math.random() < INJURIES[state.injury.type].infect) {
    const cur = state.injury.type;
    const next = isHardcore() ? (cur === 'minor' ? 'deep' : 'critical') : 'infection';
    state.injury = { type: next, untilMin: state.gameMin + INJURIES[next].restH * 60 * recoveryMult() };
    notes.push(t(next === 'critical' ? 'day.criticalWorse' : next === 'deep' ? 'day.deepWorse' : 'day.infectWorse'));
  }
  // 고양이의 하루 (입양 후 소소한 기록)
  if (state.cat && Math.random() < 0.22) {
    notes.push(t(['day.cat0', 'day.cat1', 'day.cat2', 'day.cat3'][Math.floor(Math.random() * 4)]));
  }
  // 고양이 유지비: 입양 후 3일마다 음식 1 소모 (신선 우선 → 통조림 폴백). 둘 다 없으면 쾌적 보너스 정지
  if (state.cat && state.day % BAL.economy.catFeedEvery === 0) {
    if (consumeAnyFood(BAL.economy.catFeedFood)) {
      state.catHungry = false;
    } else {
      state.catHungry = true;
      notes.push(t('day.catHungry'));
    }
  }
  // F-1a [B] 고양이 티저(Day2~3): 눈/흙 위 발자국 + 새벽 울음 1회 — 등장은 Day9 불변(기대감 장치).
  //   비영속 원칙: state 플래그 1개만(catTeaserDone) — 세이브돼도 무해한 부울, 스키마 확장 최소.
  //   발자국은 wildlifeSys가 아침에 남기고, 울음은 tickTime의 새벽 시점에 1회 재생(아래 큐).
  if (!state.cat && (state.day === 2 || state.day === 3) && !state.catTeaserDone) {
    state.catTeaserDone = true;
    state.catTeaserMeow = true; // tickTime 새벽(WAKE 직후)에 소비 → meow 1회
    // F1(헤르메틱): 시뮬 중엔 렌더 부수효과 금지. _forceNightPrints는 wildlifeSys의 영속 모듈상태
    //   (prints/animals — simReset 대상 밖)에 의존해 Math.random을 가변 소비 → 시드 시퀀스 desync(비-헤르메틱).
    //   발자국은 시각 연출이라 밸런스 sim엔 불필요. 실게임(_simRunning=false)은 그대로 남긴다.
    if (!_simRunning && typeof wildlifeSys !== 'undefined') { try { wildlifeSys._forceNightPrints(); } catch (e) {} }
    notes.push(t('day.catPrints'));
  }
  // 특수 인카운터 ①: 야윈 고양이 — v0.9.1: Day 9+, 하루 15% (아직 입양 전 + 최초 1회 등장 후 재등장 없음)
  if (!state.pendingEvent && !state.cat && !state.catEventSeen && state.day >= 9 && Math.random() < 0.15) {
    state.pendingEvent = 'cat';
    state.lastEventDay = state.day;
    state.catMusicDay = state.day; // 당첨된 날은 하루 종일 Cat OST
    state.catEventSeen = true; // 거절해도 다시는 뜨지 않음
    notes.push(t('day.catHint'));
  }
  // (구) 특수 인카운터 ②: Day 10000 구조 — #170 REV3에서 폐지. 탈출의 문은 이제 셋뿐이다:
  //   무전 조기 구조(early_rescue) / 밤의 교신(doctor_call) / 재건 후 노크(ending_choice).
  // 특수 인카운터 ②': 초대장 (#170 REV3) — 진실 4단(nw1~4) 완성 다음 아침, 종이가 그들의 노크다(1회).
  //   그들은 문을 두드리지 않는다: 좌표와 날짜(사흘 뒤)가 이미 초대장에 있다. 랜덤 없음(폭로의 리듬은 결정론).
  if (!state.pendingEvent && !state.invitationSeen && !state.endingType
      && MEMOS_CITYCORE.every(id => (state.memos || {})[id])) {
    state.pendingEvent = 'invitation_choice';
    state.invitationSeen = true;
    state.invitationHeld = true;              // 서랍 보류 기본값 — 선택이 답하면 내려간다
    state.invitationDue = state.day + 3;      // 인쇄된 날짜 — 1회성의 디제시스
    state.lastEventDay = state.day;
  }
  // 초대장 마감일 아침 — 서랍의 종이가 마지막으로 묻는다(1회). 이후 문은 세계의 시간으로 닫힌다.
  if (!state.pendingEvent && state.invitationSeen && state.invitationHeld && !state.endingType && !state.endingStayed
      && state.invitationDue > 0 && state.day >= state.invitationDue) {
    state.pendingEvent = 'invitation_due';
    state.invitationHeld = false;
    state.lastEventDay = state.day;
  }
  // Nine Winters(#11): 9겨울 마일스톤 박사 무전 — 라디오 보유 시 밤에 1회 (미보유 시 다음 배치까지 보류)
  if (!isWallpaper()) tryDoctorRadio(); // #194: 박사 교신·재건·엔딩 체인은 생존 서사 — 배경화면 차단
  // 라디오 방송 수집 (#12) — 라디오 ON 상태에서 하루 1회 BAL 확률로 미수집 방송 청취.
  tryRadioBroadcast(notes);
  // 1.3 밤하늘 수집 — 관측소 완공 후 맑은 밤 하루 1회 확률로 미수집 스케치 1종.
  tryNightSky(notes);
  // 2.0-(b) 동쪽 길 소문 (디렉터 확정 2026-07-17 — 낙진 서사 연결): 낙진이 걷히고(3겨울) 수도의 진실
  //   메모를 하나라도 읽었다면, 어느 아침 기록 속에서 동쪽 국경 검문소를 알게 된다 — 관문 프로젝트 노출 스위치.
  if (!state.eastRoadRumor && !isWallpaper() && falloutCleared()
      && MEMOS_CITYCORE.some(id => (state.memos || {})[id])) {
    state.eastRoadRumor = 1;
    state.geigerPending = true; // 보고 모달이 닫히면 가이거 계수기 비네트 1회 (drainDiscoveryQueue가 소비)
    notes.push(t('east.rumorNote'));
  }
  // #164 「떠오른 자리」 + 지역 컨디션 (디렉터 2026-07-10 — 반복 타파). 배경화면 모드는 무대상.
  //   난수는 공유 Math.random을 쓰지 않는다 — 시드 시뮬(하드코어 치사성 등 밴드 테스트)의 스트림을
  //   밀어버리기 때문(실측: 데모 스위트 50/51 회귀). 런 시드+일자 해시의 자체 스트림 → 시뮬 무접점
  //   + 세이브 재로드 리롤 방지(같은 날은 같은 소문) 보너스.
  if (!isWallpaper()) {
    if (state.spotSeed == null) state.spotSeed = Date.now() % 2147483647; // 런당 1회 (RNG 스트림 무접점)
    const dayRand = (salt) => {
      let x = (Math.imul(state.day, 73856093) ^ Math.imul(salt, 19349663) ^ state.spotSeed) >>> 0;
      x = Math.imul(x ^ (x >>> 13), 1274126177);
      return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    };
    // 만료: 놓친 스팟은 조용히 사라진다 — 아침 보고 한 줄(갈증).
    if (state.fieldSpot && state.day > state.fieldSpot.until) {
      notes.push(t('spot.gone', { name: t('spot.' + state.fieldSpot.id) }));
      state.fieldSpot = null;
    }
    // 스폰: 스팟 없을 때만, 해금 지역 한정, 숙련 티어 가중(단골 동네일수록 눈에 띈다).
    if (!state.fieldSpot && dayRand(1) < BAL.fieldSpots.spawnChance) {
      // #195: 봉쇄(눈사태·폭설) 지역 제외 — 수명 2일 < 봉쇄 3일이라 봉쇄 중 스폰은 닿을 수 없는 미끼가 된다
      const cands = Object.entries(FIELD_SPOTS).filter(([, s]) => regionUnlocked(s.region) && !isForbiddenRegion(s.region)
        && !avalancheBlocks(s.region) && !blizzardBlocks(s.region));
      if (cands.length) {
        const ws = cands.map(([, s]) => 1 + masteryTier(s.region) * BAL.fieldSpots.masteryWeight);
        let roll = dayRand(2) * ws.reduce((a, b) => a + b, 0), pick = cands[cands.length - 1];
        for (let i = 0; i < cands.length; i++) { roll -= ws[i]; if (roll < 0) { pick = cands[i]; break; } }
        state.fieldSpot = { id: pick[0], region: pick[1].region, until: state.day + BAL.fieldSpots.lifeDays };
        notes.push(t('spot.appeared', { name: t('spot.' + pick[0]), region: LName(REGIONS[pick[1].region]) }));
      }
    }
    // 지역 컨디션 사이클: cycleDays마다 풍(+25%)/평/마름(-20%) 리롤 — 최적 루트 고정을 깨는 로테이션.
    if (!state.regionCond || state.day >= (state.regionCond.until || 0)) {
      const lv = {};
      let salt = 10;
      for (const rid of Object.keys(REGIONS)) {
        if (isForbiddenRegion(rid)) continue;
        const cr = dayRand(salt++);
        lv[rid] = cr < BAL.regionCond.richChance ? 1 : cr < BAL.regionCond.richChance + BAL.regionCond.leanChance ? -1 : 0;
      }
      state.regionCond = { until: state.day + BAL.regionCond.cycleDays, lv };
    }
  }
  // 랜덤 인카운터: 마지막 만남 1일 경과 + BAL 확률. 조건/반복억제는 drawEvent 엔진에서 판정.
  // 아침 결산 draw 는 '지난밤/밤사이' 사건도 허용하도록 night 컨텍스트를 true 로 연다.
  if (!state.pendingEvent && (state.day - (state.lastEventDay || 0)) >= 1 && Math.random() < BAL.events.dailyChance * encFreqMul()) {
    drawEvent({ ...eventCtx(), night: true });
  }
  // 배치 D ①: 노말 모드 누적 최고 생존일 통계 갱신 (배경화면 모드 해금 조건 — 세이브 아닌 계정 통계).
  recordNormalDay(state.day);
}
// 아침 브리핑 카드 (#29) — 결산 상단 "오늘" 섹션: 날씨 예보 + 경고 통합 + 권장 행동 1줄
function briefingHtml(forecast, prep, warns) {
  const se = seasonOf();
  const lines = [];
  // 날씨 예보 (라디오/등대 특성 있으면 실제 예보, 없으면 감각적 문구)
  lines.push(`<div style="font-size:11px;margin-bottom:2px">${forecast}</div>`);
  // 경고 (Phase B 카드 통합 — 중복 방지: 여기 한 곳에서만)
  let warn = '';
  const coldExposed = coldSnapActive() && coldSnapNetSeverity() > 0;
  const coldIncoming = state.coldSnapForecast > 0 && se.id === 'winter';
  if (coldExposed) warn = t('brief.coldNow');
  else if (coldSnapActive()) warn = t('brief.coldDefended');
  else if (coldIncoming) warn = t('brief.coldSoon', { n: Math.max(0, state.coldSnapForecast - state.day) });
  else if (se.id === 'winter') warn = t('brief.winter');
  else if (prep) warn = t('brief.winterSoon', { n: prep.daysLeft });
  if (warn) lines.push(`<div style="font-size:11px;color:var(--accent);margin-bottom:2px">${warn}</div>`);
  // 권장 행동 1줄 — 우선순위: 한파 대비 > 겨울 준비 > 자원 부족 > 평온
  let advice;
  if (coldExposed || (coldIncoming && coldDefenseLevel() < 1)) advice = t('brief.advice.cold');
  else if (prep && (!prep.fuelOk || !prep.cannedOk)) advice = t('brief.advice.winterPrep');
  else if (warns.length) advice = t('brief.advice.shortage', { list: warns.map(id => LName(RESOURCES[id])).join(', ') });
  else advice = t('brief.advice.calm');
  lines.push(`<div style="font-size:11px;color:var(--good)">▸ ${advice}</div>`);
  return `<div class="report-sec" style="border-color:#6b5a40"><span class="r-title">${t('brief.title')}</span>${lines.join('')}</div>`;
}
function showDayReport() {
  const log = state.dayLog;
  const fmt = obj => Object.entries(obj).map(([id, n]) => `${LName(RESOURCES[id])} ${n}`).join(', ');
  const warns = Object.keys(RESOURCES).filter(id => ['water', 'food', 'bandage', 'candle', 'battery'].includes(id) && (state.res[id] || 0) === 0);
  const tips = [];
  if (warns.includes('bandage')) tips.push(t('report.tip.bandage'));
  if (warns.includes('water')) tips.push(t('report.tip.water'));
  if (warns.includes('battery') && SHELTERS[state.current].upkeep?.res === 'battery') tips.push(t('report.tip.battery'));
  // #195: 양초 고갈은 경고 목록에 있는데 해법 팁만 누락(붕대·물·배터리는 있음) — 양초 연료 가구 보유 시 수급 경로 안내
  if (warns.includes('candle') && items.some(it => DEFS[it.defId].light?.fuel === 'candle')) tips.push(t('report.tip.candle'));
  if (state.injury) tips.push(t('injury.tip', { name: LName(INJURIES[state.injury.type]), cost: costLabel(INJURIES[state.injury.type].cure) }));
  if ((state.cleanBy[state.current] ?? 70) < 50) tips.push(t('report.tip.clean'));
  const forecast = hasForecast()
    ? t('report.forecast', { text: forecastText() })
    : t('report.noForecast');
  // 가을 비축 경고 카드 (겨울 3일 전부터) — 이주 칩과 같은 ok/lack 문법
  const prep = winterPrepAdvice();
  const prepChip = (have, need, ok) => `<span style="color:${ok ? 'var(--good)' : 'var(--bad)'}">${have}/${need}${ok ? ' ✓' : ''}</span>`;
  const prepHtml = prep
    ? `<div class="report-sec report-warn" style="border-color:var(--accent)">${t('report.winterPrep', {
        n: prep.daysLeft,
        fuel: prepChip(prep.fuelHave, prep.fuelNeed, prep.fuelOk),
        canned: prepChip(prep.cannedHave, prep.cannedNeed, prep.cannedOk),
      })}</div>`
    : '';
  openModal(t('report.title', { day: state.day - 1 }), `
    ${briefingHtml(forecast, prep, warns)}
    <div class="report-sec"><span class="r-title">${t('report.gain')}</span><br>${Object.keys(log.gain).length ? fmt(log.gain) : t('none')}</div>
    <div class="report-sec"><span class="r-title">${t('report.spend')}</span><br>${Object.keys(log.spend).length ? fmt(log.spend) : t('none')}</div>
    ${log.notes.length ? `<div class="report-sec"><span class="r-title">${t('report.notes')}</span><br>${log.notes.join('<br>')}</div>` : ''}
    ${prepHtml}
    ${warns.length ? `<div class="report-sec report-warn">${t('report.warn', { list: warns.map(id => `${resIcon(id)} ${LName(RESOURCES[id])}`).join(', ') })}</div>` : ''}
    ${tips.length ? `<div class="report-sec report-tip">${tips.slice(0, 2).join('<br>')}</div>` : ''}
  `, 'report');
  state.dayLog = { gain: {}, spend: {}, notes: [], lang }; // lang 스탬프: 언어 바뀌면 옛 로그 비우기 근거(부팅 대조)
  playSfx('pen');
  // 자원(물/음식) 고갈 경고음 — 하루 1회 제한
  if ((warns.includes('water') || warns.includes('food')) && state.lastAlarmDay !== state.day) {
    state.lastAlarmDay = state.day;
    playSfx('alarm');
  }
}
/* ── 일시정지 (v1.9) ── */
let paused = false;
function setPaused(p) {
  paused = p;
  document.body.classList.toggle('paused', p);
  const b = $('btn-pause');
  // (B-③) 재생/일시정지 아이콘 — icon() 폴백 구조(아트 있으면 표시, 없으면 이모지). 시스템 버튼 통일.
  if (b) b.innerHTML = p ? icon('icon_sys_play', '', 'sys-icon') : icon('icon_sys_pause', '', 'sys-icon');
}
let reportQueued = false;
let lastAutoHour = -1;
// 부팅 직후 첫 틱: 오프라인 정산(loadSave가 밀어둔 gameMin)이 이 틱에서 소화된다.
// 그 catch-up은 이미 부팅 암전(#fade-veil)이 화면을 덮고 있으므로 blackout을 겹치지 않는다.
let settlingOffline = true;
// 암전 연출 (기상/탐험 복귀/자정 깜빡잠 등): #fade-veil을 검게 올렸다가 내리는 동안
// 시간 점프·상태 변경(midFn)을 수행한다. 연출 중엔 입력 차단 + 보고/이벤트 노출 보류.
let blackoutActive = false;
function blackout(midFn, holdMs = 500) {
  const veil = $('fade-veil');
  if (!veil) { try { midFn && midFn(); } catch (e) { /* ignore */ } return; }
  if (blackoutActive) return; // 재진입 가드 (연출 중 재호출 무시)
  blackoutActive = true;
  const prevTrans = veil.style.transition;
  veil.style.transition = 'opacity .4s ease';
  veil.style.pointerEvents = 'auto'; // 입력 차단
  // 리플로우 강제 후 페이드인 (transition이 확실히 걸리도록)
  void veil.offsetWidth;
  veil.style.opacity = '1';
  const IN = 400, OUT = 400;
  setTimeout(() => {                 // 정점: 시간 점프·상태 변경
    try { midFn && midFn(); } catch (e) { console.error('[shelter:blackout]', e); }
    setTimeout(() => {               // 유지 후 페이드아웃
      veil.style.opacity = '0';
      setTimeout(() => {             // 페이드아웃 완료: 확정값 재설정 + 가드 해제
        veil.style.opacity = '0';
        veil.style.pointerEvents = 'none';
        veil.style.transition = prevTrans;
        blackoutActive = false;
      }, OUT + 30);
    }, holdMs);
  }, IN);
}
// v1.2.0 자동 진행 지역 선택 — 결핍 기반 가중.
// 유저 신고("자동진행이 주거만 간다") 해소: 순수 그리디(항상 최고 eff = 주거) 대신
//   가중 = eff × (1 + Σ 부족자원 산지 보너스) × (직전 방문 지역이면 감쇠).
// 후보 = 해금된 전 지역(항구/지하 개통 포함), 폭설 봉쇄 지역 제외. 부족 판정은 BAL.auto.scarceWatch 자원만
//   (신선식품/물은 autoEat이 따로 관리하므로 제외). 결정론 아님(Math.random 타이브레이크 없음 — 가중 최대 선택).
// pickAutoRegion → core/regions.js 이관 (Tier3, 순수 결정 로직)

// 자동 진행 모드 (Day 10+ 해금): 매 게임 내 정시마다 간단한 생존 루틴을 대신 처리.
// 자동 대상: 치료·청소·탐험(급식/취침/autoEat은 각각 processDay/자정루프/decayGauges가 자동 처리).
// 자동 대상 아님(설계 의도 — 후반 수동 전략 레버): 염장(salt cure)·얼음낚시·대형 프로젝트·암시장.
function runAutoPlay() {
  if (paused || titleVisible || !opts.autoPlay || isWallpaper() || (!isZen() && state.day < 10)) return;
  if (state.injury && resHasAll(INJURIES[state.injury.type].cure)) {
    const name = LName(INJURIES[state.injury.type]);
    treatInjury();
    state.dayLog.notes.push(t('auto.treat', { name }));
  }
  if ((state.cleanBy[state.current] ?? 70) < 50 && (state.res.water || 0) > 1) {
    cleanShelter(true); // 자동 진행: 확인창 스킵
    state.dayLog.notes.push(t('auto.clean'));
  }
  if (!state.exp && (state.expToday || 0) < BAL.auto.maxExpPerDay && state.energy >= BAL.auto.minEnergy && !isExhausted()) {
    const bestId = pickAutoRegion();
    if (bestId) {
      departExpedition(bestId, [], { auto: true });
      state.lastAutoRegion = bestId; // 다음 선택에서 연속 방문 감쇠에 사용
      { const rn = LName(REGIONS[bestId]); state.dayLog.notes.push(t('auto.depart', { emoji: REGIONS[bestId].emoji, name: rn, josa: josa(rn, '으로/로') })); }
    }
  }
}
// 배속 조정기(디렉터): 파밍·인게임 시간만 ×N(2/4). 엔딩 1회 후 해금, QA 치트 사용 시 즉시 해금.
const SPEED_STEPS = [1, 2, 4];
function speedUnlocked() { return !!state.endingSeen || state.endingType === 'escape' || !!state.qaUsed; }
function activeSpeedMult() { return speedUnlocked() ? (SPEED_STEPS.includes(state.speedX) ? state.speedX : 1) : 1; }
function tickTime(dt) {
  // #74 데모 종료 후엔 시간 동결 — 봄의 거처를 둘러볼 순 있지만 진행은 없다(잠금의 실체는 여기).
  if (DEMO_ED && state.demoEnded) return;
  // 탐험 시간 개편(디렉터 2026-07-08): 탐험 중엔 시계가 배속(×4)으로 흐른다 — "다녀오는 시간"이
  //   대기 중에 실제로 흘러 귀환 점프가 사라진다. 게이지 감소도 함께 가속(시간이 흐르는 만큼 몸도 소모).
  //   평시 배속(디렉터 2026-07-08): 비탐험도 탐험(×4)의 80%(×3.2)로 — 게이지·부패는 게임분 기준이라 게임일 밸런스 불변.
  //   + 유저 배속(activeSpeedMult): 파밍·게임시계만 ×N. 렌더/애니는 그대로(게임분 기준 로직만 가속).
  const gmRate = GAME_MIN_PER_SEC * (state.exp ? BAL.exp.timeScale : BAL.exp.idleTimeScale) * activeSpeedMult();
  state.gameMin += dt * gmRate;
  decayGauges(dt * gmRate);
  checkHelpless(); // 배치 D: 무력 상태(게이지 바닥 + 재고 0) 안전망 판정
  const curHour = Math.floor(state.gameMin / 60);
  if (curHour !== lastAutoHour) {
    lastAutoHour = curHour;
    runAutoPlay();
    // #194 어둠 온보딩: 첫 이틀의 일몰(19시)에 딱 한 번 — 시작 인벤토리의 캔들 스툴이 해법임을 알린다.
    //   (#189 어둠 기본값의 온보딩 사각지대 봉합 — 감사 확정. tipOnce가 1회 보장.)
    if (curHour % 24 === 19 && state.day <= 2 && !isWallpaper()) tipOnce('tip.dark');
  }
  const newDay = Math.floor(state.gameMin / 1440) + 1;
  let rolledOver = false;
  while (state.day < newDay) {
    state.day++;
    refreshAutoplayLock();
    // Day 10 도달(또는 이미 지난 구세이브 첫 부팅 이후 롤오버): 자동 진행 해금 1회 안내
    // 노말/하드: Day 10 도달 시 해금 안내. 무한(zen): 이미 첫날부터 열려 있으므로 첫 아침 롤오버에 안내.
    if ((isZen() || state.day >= 10) && !state.autoNoticeShown) { state.autoNoticeShown = true; state.pendingAutoNotice = true; }
    processDay();
    // 디렉터: 하루 요약은 '의도적 취침 시에만'. 자정 롤오버 자체는 요약을 큐잉하지 않는다(깨어 있으면 그냥 넘어감).
    //   요약 큐잉은 (a) sleepUntilMorning(취침) (b) 오프라인/백그라운드 복귀 정산(아래) 두 경로에서만.
    rolledOver = true;
  }
  // #175 데모 정본 단일화(프리즈+가드, 디렉터 2026-07-12): 데모-엔드 로직은 데모 정본 브랜치
  //   demo-vertical-slice(Day-15 「보름의 겨울」, demoPhase 스테이트머신)에 있다. 트렁크(gd-2.0)는 데모를 빌드하지 않는다.
  //   구 Day-37 게이트(seasonOf 반환 객체를 계절 문자열과 직접 비교)는 항상 false였던 죽은 코드 → 제거.
  //   데모 빌드는 tools/build-demo.ps1 가드가 정본 브랜치에서만 허용한다(리뷰 rank-1 봉인).
  // 자정을 자연 경과(취침이 아님)로 넘긴 경우의 처리.
  // v1.2.0: 자정 강제 취침 폐지 + 디렉터(2026-07-20): 05시 collapse 강제 취침도 폐지.
  // 셸터 안에서 깨어 있으면 시간이 계속 흐르고(01시부터 회복 페널티 누적) 재우지 않는다 — 취침은 오직 취침 버튼.
  // 탐험/오프라인 경로만 여기서 아침으로 점프(오프라인은 요약 큐잉).
  if (rolledOver) {
    const morning8 = (state.day - 1) * 1440 + 8 * 60;
    if (state.exp) {
      // 탐험(부재) 중 자정 경과: 밖에 있으니 암전 없음 + 쪽잠 에너지 회복 없음. 시간만 점프(아직 이르면).
      if (state.gameMin < morning8) { state.gameMin = morning8; state.dayLog.notes.push(t('day.expNight')); }
    } else if (settlingOffline || document.hidden) {
      // 정산 경로(부팅 오프라인 catch-up · 백그라운드 절전 틱): "방치는 벌 받지 않는다".
      // v1.2.0 취침 자율화가 자정 강제 취침을 없앤 뒤로 이 경로가 05시 collapse에서 제외되어
      // 에너지 미회복 결함이 있었다(방치형 코어 결함, 디렉터 실신고). 자정을 넘긴 날의 취침을
      // "정상 취침"으로 간주해 회복한다 — 밤샘 페널티 없이(22시 기준), 침대·쾌적·온천 보너스 포함.
      // blackout 연출에 의존하지 않는 순수 로직. 회복은 정산 롤오버가 발생하면 착지 시각과 무관하게 항상 적용한다
      //   (오프라인 catch-up은 임의 시각에 착지할 수 있어 '아침 이전'만 회복하면 미회복 구멍이 남는다 — 실측 확인).
      const { energy } = restEnergyValue(SETTLE_REST_HOUR, false); // 이른 취침 기준(밤샘 페널티 없이 침대·쾌적·온천 보너스 포함)
      state.energy = Math.max(state.energy, energy);
      const e = Math.round(state.energy);
      // 아직 아침 이전이면 다음 아침으로 점프(자연스러운 기상). 이미 아침 이후면 시간은 그대로 두고 회복만.
      if (state.gameMin < morning8) state.gameMin = morning8;
      state.dayLog.notes.push(t('day.napMorning', { e }));
      reportQueued = true; // 오프라인/백그라운드 복귀 정산은 요약을 띄운다(DDD-5 복귀 리포트 — 취침과 동급의 '넘어감')
    }
    // else(셸터 안에서 깨어 자정 경과): 아무 것도 하지 않는다 — 시간을 계속 흐르게 두고,
    //   결산은 아침(WAKE_HOUR 이후)까지 미룬다(아래 reportQueued 게이트의 시각 조건).
  }
  // 디렉터: 05시 강제 취침(collapse) 제거 — 의도적으로 자지 않는 한 게임은 플레이어를 재우지 않는다.
  //   깨어 있으면 시간은 계속 흐르고 에너지만 소모된다(유기적 압박). 취침은 오직 취침 버튼(sleepUntilMorning)으로.
  //   (atCollapseHour는 아래 '백그라운드 절전 회복' 분기에서만 쓰인다 — 눈에 보이지 않는 방치 회복이라 유지.)
  const atCollapseHour = Math.floor(gameHour()) >= BAL.rest.collapseHour
    && (state.gameMin % 1440) < BAL.rest.collapseHour * 60 + 60;
  // 백그라운드 절전 틱이 자정을 넘기지 않고 05시(collapseHour)에 도달한 경우(같은 밤 방치):
  //   "방치는 벌 받지 않는다" — collapse 페널티 대신 정상 취침으로 회복하고 아침으로 점프한다.
  //   (자정을 넘긴 경우는 위 rolledOver 블록이 이미 처리했다.)
  if (!state.exp && !settlingOffline && document.hidden && !blackoutActive && !titleVisible && !paused
      && atCollapseHour) {
    const morning8 = Math.floor(state.gameMin / 1440) * 1440 + 8 * 60;
    if (state.gameMin < morning8) {
      state.gameMin = morning8;
      const { energy } = restEnergyValue(SETTLE_REST_HOUR, false); // 이른 취침 기준(밤샘 페널티 없음)
      state.energy = Math.max(state.energy, energy);
      const e = Math.round(state.energy);
      state.dayLog.notes.push(t('day.napMorning', { e }));
    }
    return;
  }
  // 보고/이벤트 노출 게이트: 탐험(부재) 중이거나 암전 연출 중엔 하루 보고·셸터 이벤트를 띄우지 않는다.
  // v1.2.0: 자정 직후(01~04시) 깨어 있는 동안엔 결산을 미룬다 — 아침(WAKE_HOUR 이후)에만 뜬다.
  // (탐험 복귀 결산 모달을 닫으면 modal-back 조건이 풀려 자연히 표시된다.)
  const isMorningForReport = Math.floor(gameHour()) >= WAKE_HOUR || Math.floor(gameHour()) < BAL.rest.lateStartHour;
  if (reportQueued && isMorningForReport && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show')) {
    reportQueued = false;
    showDayReport();
    scheduleSave();
    renderResBar();
    renderExpPanel();
  } else if (state.pendingEvent && !state.minimizedEvent && !reportQueued && (!state.exp || duringExpEvent(state.pendingEvent)) && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트를 닫은 다음에 인카운터 등장 (탐험 부재/암전 중, 내려둔 이벤트가 있으면 보류)
    //   #208(디렉터): 무너진 입구만 예외 — 탐험 '도중'에 뜬다(duringExpEvent). 아래 주석 참조.
    const ev = state.pendingEvent;
    state.pendingEvent = null;
    showEvent(ev);
  } else if (state.pendingTutorial && !reportQueued && !state.pendingEvent && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 리포트/인카운터를 모두 닫은 다음에 튜토리얼 수첩 페이지 등장
    const day = state.pendingTutorial;
    state.pendingTutorial = null;
    showTutorialPage(day);
  } else if (state.front && state.front.discipline === null && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 2.0 대한파 자기 규율(§9.4-③): 발동 아침 보고를 닫은 뒤 하드/하드코어만 — 프론트를 어떻게 넘길지 정한다.
    openFrontChoiceModal();
  } else if (state.pendingAutoNotice && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // Day 10 자동 진행 해금 안내 — 아무도 존재/조건을 모른다는 피드백으로 1회 전용 팝업
    state.pendingAutoNotice = false;
    scheduleSave();
    openModal(t('auto.unlocked.title'), `
      <div style="line-height:1.8">${t('auto.unlocked.body')}</div>
      <div class="close-row" style="margin-top:10px">
        <button class="pixel-btn primary" id="btn-auto-now">${t('auto.unlocked.on')}</button>
      </div>`);
    const bn = $('btn-auto-now');
    if (bn) bn.addEventListener('click', () => {
      opts.autoPlay = true;
      const cb = $('opt-autoplay'); if (cb) cb.checked = true;
      syncAutoBtn();
      flushSave();
      closeModal();
      toast(t('auto.unlocked.toast'));
    });
  } else if (state.pendingWinterMemoir?.length && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // Nine Winters(#11): 봄 첫 아침 보고를 모두 닫은 뒤 "그 해 겨울" 수첩 페이지를 순서대로 편다.
    // (오프라인 정산으로 겨울 여러 번을 지났으면 큐에 쌓인 순서대로 한 번에 한 장씩.)
    const page = state.pendingWinterMemoir.shift();
    scheduleSave();
    openJournalPages([page]);
  } else if (state.pendingMemoPopup && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 세계관 메모/유서 수집 팝업 (#35) — 탐험 결산을 닫은 뒤 쪽지 문법으로 1회 열람.
    const { id, will } = state.pendingMemoPopup;
    state.pendingMemoPopup = null;
    scheduleSave();
    showMemoPage(id, will);
  } else if (state.pendingBroadcast && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 라디오 방송 청취 모달 (#12) — 결산 뒤 지지직 SFX와 함께 1회. 수집은 여기서 확정.
    const id = state.pendingBroadcast;
    state.pendingBroadcast = null;
    if (!state.broadcasts) state.broadcasts = {};
    if (!state.broadcasts[id]) state.broadcasts[id] = state.day;
    scheduleSave();
    showBroadcastModal(id);
  } else if (state.pendingSketchPopup && !reportQueued && !state.pendingEvent && !state.pendingTutorial && !state.exp && !blackoutActive && !journalOpen && !$('modal-back').classList.contains('show') && !titleVisible) {
    // 1.3 밤하늘 스케치 팝업 — 결산 닫은 뒤 종이 스케치 문법으로 1회 열람 (메모 팝업 문법 재사용).
    const id = state.pendingSketchPopup;
    state.pendingSketchPopup = null;
    scheduleSave();
    showSketchPage(id);
  }
  tickInjury();
  settlingOffline = false; // 첫 틱(오프라인 정산) 소화 완료 — 이후엔 정상 암전 경로
}
function renderInventoryBar() {
  const bar = $('toolbar');
  // 피드백 #1(2026-07-15 플레이테스트): 스트립에 호버한 채 마우스 휠 = 가로 스크롤.
  //   스크롤바를 잡아 끄는 방식이 번거롭다는 지적 — 컨테이너는 리빌드돼도 유지되므로 1회만 배선.
  if (!bar._wheelWired) {
    bar._wheelWired = true;
    bar.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // 트랙패드 가로 제스처는 기본 스크롤에 맡긴다
      bar.scrollLeft += e.deltaY;
      e.preventDefault(); // 캔버스 줌/페이지 스크롤로 새지 않게
    }, { passive: false });
  }
  bar.innerHTML = '';
  // #220 배치 끝내기 — 편집 모드 안에서 나가는 길이 없었다(디렉터 신고: 액션 바가 숨어 토글 재클릭 불가).
  //   모두 수거 왼쪽 상시 배치. 클릭 = 편집 모드 종료(토글 off 경로와 동일 — 토스트·선택 해제 포함).
  {
    const btn = document.createElement('div');
    btn.className = 'tool-item tool-collect';
    btn.innerHTML = `<span class="emoji">${icon('icon_sys_check', '')}</span><span>${t('inv.editDone')}</span>`;
    btn.addEventListener('click', () => toggleEditMode(false));
    bar.appendChild(btn);
  }
  // 배치 D ④: 전체 수거 버튼 — 현재 셸터에 놓인 가구 전부를 인벤토리로 거둔다.
  //   icon() 폴백 구조(아트 없으면 이모지). 놓인 가구가 있을 때만 활성.
  {
    const placedN = items.length;
    const btn = document.createElement('div');
    btn.className = 'tool-item tool-collect' + (placedN <= 0 ? ' empty' : '');
    btn.innerHTML = `<span class="emoji">${icon('icon_sys_collect', '')}</span><span>${t('inv.collectAll')}</span><span class="cnt">${placedN}</span>`;
    btn.title = placedN > 0 ? t('inv.collectAll.title', { n: placedN }) : t('inv.collectAll.none');
    btn.addEventListener('click', () => reclaimAll());
    bar.appendChild(btn);
  }
  for (const [id, def] of Object.entries(DEFS)) {
    const cnt = state.inventory[id] || 0;
    // #193: 도면 게이트 가구는 도면을 줍기 전엔 툴바에서도 안 보인다 — 제작대·도감·지도와 동일 원칙(시그니처 누출 봉합)
    if (cnt <= 0 && bpGatedLocked(id)) continue;
    if (def.dlc && !Platform.dlc.owns(def.dlc)) continue; // #119 서포터팩: 미소유 시 툴바에서도 숨김
    const el = document.createElement('div');
    el.className = 'tool-item' + (cnt <= 0 ? ' empty' : '');
    el.innerHTML = `<span class="emoji">${furnIcon(id)}</span><span>${LName(def)}</span><span class="cnt">${cnt}</span>`;
    // 빈 슬롯 안내를 획득 경로별로 분기 — 제작 레시피가 있으면 제작대로(양초류 혼동의 동류 봉합)
    el.title = cnt > 0 ? t('inv.place', { name: LName(def) }) : (FURN_CRAFT.has(id) ? t('inv.getByCraft') : t('inv.getByExp'));
    el.addEventListener('click', () => startPlacing(id));
    bar.appendChild(el);
  }
}
function renderExpPanel() {
  const box = $('exp-content');
  // 디렉터(2026-07-19 "탐험 진행중 UI 없더라"): 패널은 탐험 진행 중·부상 중에만 노출한다.
  //   유휴 "지역 탐험" 진입 클러터는 앞서 삭제(진입=상단 탐험 버튼) — 그때 인라인 display:none이 진행률 바까지
  //   가려버린 게 근원. 이제 CSS(.show) + 상태 토글로만 제어 → 탐험 시작하면 지역·진행률·ETA가 좌측에 뜬다.
  const panel = $('exp-panel');
  if (panel) panel.classList.toggle('show', !!(state.exp || state.injury));
  if (state.exp) {
    const r = REGIONS[state.exp.region];
    box.innerHTML = `
      <div id="exp-progress">
        <div style="font-size:12px">${t('exp.inProgress', { emoji: r.emoji, name: LName(r) })}</div>
        <div class="bar-wrap"><div class="bar" id="exp-bar"></div></div>
        <div class="eta" id="exp-eta"></div>
      </div>`;
    autoStackPanels(); // 진행 분기는 early return — 내용 반영 후 To Do 재스택이 여기서도 돌아야 한다
    return;
  }
  // 부상 카드 (치료 or 자연 회복 대기)
  let injuryHtml = '';
  if (state.injury) {
    const inj = INJURIES[state.injury.type];
    const remainMin = Math.max(0, state.injury.untilMin - state.gameMin);
    const canCure = resHasAll(inj.cure);
    injuryHtml = `
      <div class="injury-card">
        ${t('injury.card', { icon: injIconEl(state.injury.type), name: LName(inj), pen: Math.round(inj.pen * 100), time: inj.timeMult ? t('injury.card.time') : '', h: fmtGameDur(remainMin) })}
        <div class="btn-row">
          <button class="pixel-btn" id="btn-treat" ${canCure ? '' : 'disabled'}>${t('injury.treat', { cost: costLabel(inj.cure) })}</button>
        </div>
      </div>`;
  }
  box.innerHTML = injuryHtml + `
    <button class="pixel-btn primary" id="btn-open-map" style="width:100%">${t('exp.openMap')}</button>
    ${hasForecast() ? `<div style="font-size:10px;color:var(--text-dim);margin-top:6px;text-align:center">${icon('icon_rec_radio')} ${forecastText()}</div>` : ''}`;
  const mb = $('btn-open-map');
  if (mb) mb.addEventListener('click', () => openMapModal()); // 핸들러 직접 등록 금지 — MouseEvent가 viewCity 인자로 들어가 city가 이벤트 객체가 되면 핀이 전부 걸러져 빈 지도가 된다(2.0-(f) viewCity 신설 때 생긴 잠복 회귀, S2-1에서 검거)
  const tb = $('btn-treat');
  if (tb) tb.addEventListener('click', treatInjury);
  autoStackPanels(); // 내용 반영 후 실제 높이 기준으로 To Do 카드 재스택 (겹침 해소)
}
function tickExpeditionUI() {
  // 부팅 플로우 원칙: 타이틀 화면에선 어떤 게임 팝업/결과도 뜨면 안 된다.
  // 저장된 탐험이 이미 끝난 상태로 부팅되면 이 틱이 타이틀 위로 탐험 결과 모달을 띄우던 버그 —
  // 아침 결산과 동일하게 hideTitle() 이후로 지연한다(hideTitle이 진입 시 resolveExpedition을 호출).
  if (titleVisible) return;
  if (state.exp) {
    const remain = state.exp.end - Date.now();
    const total = state.exp.dur || (REGIONS[state.exp.region].time * 1000);
    // #165 탐험 리스크 인카운터 (디렉터 2026-07-10): 진행률 35% 지점 별도 롤 — "무너진 입구" Yes/No.
    //   일일 쿨다운 미공유(즉흥 발견의 결) · 탐험당 1회 · 발동 시 이번 탐험 일반 중간 인카운터는 양보(팝업 과밀 방지).
    if (!state.exp.riskRolled && (1 - remain / total) >= 0.35) {
      state.exp.riskRolled = true;
      // #167: 뒷골목 심부는 무너짐이 잦다 — 리스크 인카운터 배수 (riskDeepMul)
      const deepMul = state.exp.region === 'slumdeep' ? (BAL.events.riskDeepMul || 1.5) : 1;
      if (!state.pendingEvent && !isWallpaper() && Math.random() < (BAL.events.riskExpChance || 0) * deepMul * encFreqMul()) {
        state.pendingEvent = 'collapsed_entrance';
        // #193: 표시가 귀환 후(state.exp=null 이후)라 발동 지역을 박제 — 문안·보상이 항상 슬럼으로 굳던 결함
        state.riskEventRegion = state.exp.region;
        state.exp.midRolled = true;
      }
    }
    // 탐험 중간 이벤트: 진행률 50% 통과 시점에 1회, BAL 확률로 일반 인카운터 예약 (현재 시각 컨텍스트).
    //   디렉터 2026-07: 일일 이벤트와 같은 1일 쿨다운을 공유해 "탐험+하루 스택"을 막는다(하루 최대 1회 하드캡).
    if (!state.exp.midRolled && (1 - remain / total) >= 0.5) {
      state.exp.midRolled = true;
      if (!state.pendingEvent && (state.day - (state.lastEventDay || 0)) >= 1 && Math.random() < BAL.events.midExpChance * encFreqMul()) {
        drawEvent();
      }
    }
    // #208: 리스크 인카운터가 '탐험 도중'으로 옮겨지며 생긴 새 겹침 — 비네트(무너진 입구 문/상자)가 떠 있는데
    //   그 사이 탐험이 끝나면 정산 모달이 비네트 **뒤에서** 열려 플레이어가 통째로 놓친다(실캡처로 검거).
    //   비네트가 끝날 때까지 정산을 미룬다. 탐험 종료 판정은 end 시각 기준이라 늦춰도 결과는 불변.
    if (remain <= 0) { if (!vignetteBusy()) resolveExpedition(); return; }
    const bar = $('exp-bar'), eta = $('exp-eta');
    if (bar) {
      // 디렉터 2026-07-08: 게이지는 30게임분 단위 계단으로 차고, 남은 시간도 같은 단위로 올림 표기
      const totalMin = state.exp.durMin || (total / 1000) * GAME_MIN_PER_SEC * BAL.exp.timeScale;
      const doneMin = totalMin * (1 - remain / total);
      // 디렉터(2026-07-08): 30분 계단(floor)이 실제 진행보다 늘 뒤처져 "바가 느리다" — 바는 연속, ETA만 30분 단위 유지
      bar.style.width = `${100 * Math.min(1, doneMin / totalMin)}%`;
      eta.textContent = t('exp.timeLeft', { d: fmtGameDur(Math.max(30, Math.ceil((totalMin - doneMin) / 30) * 30)) });
    } else renderExpPanel();
  } else if (state.injury) {
    const el = $('injury-eta');
    if (el) el.textContent = fmtGameDur(Math.max(0, state.injury.untilMin - state.gameMin));
    else renderExpPanel();
  }
}

const selPanel = $('sel-panel');
// A안 (디렉터 2026-07-09): 편집 카드를 선택 가구 '옆'에 앵커 — 가구를 보면서 칠한다.
//   radioBubble과 동일한 투영·uiz 보정(패널은 zoom:--uiz 컨텍스트라 좌표를 uiz로 나눈다).
//   우측 우선 배치, 오른쪽이 모자라면 좌측 플립, 상하는 클램프. 데스크톱 전용 —
//   모바일 미디어 쿼리가 --sel-x/y를 무시하고 하단 시트로 강제한다(카메라 추적 불필요).
// #228③: 가구 추적(매 프레임 재투영) 폐기 — 팬/줌마다 출렁이고 스와치를 누르는 손 밑에서 카드가
//   움직여 UX를 저해(디렉터). 카드=화면 우하단 고정 도킹(터미널 문법), 가구와의 연결은 선택 링이 담당.
//   (검토한 대안 B: 선택 순간 위치 고정 — 출렁임은 없지만 카메라 팬 시 가구와 어긋난 채 씬을 가림 → 기각.)
function positionSelPanel() { /* 고정 도킹 — 좌표 주입 불요. QA 프로브 호환용 잔류. */ }
// #228⑦: 스와치 = 미리보기(무소모 둘러보기) → 「적용」 버튼으로 확정·소모 (디렉터: "그전까지는 눌러보면서 둘러보기").
//   _selPreview가 미확정 상태를 소유 — 패널 닫힘·선택 해제·가구 전환 시 revertSelPreview()가 커밋 상태로 원복한다.
let _selPreview = null; // { item, colorIdx(커밋), gel(커밋) } — 미리보기 중인 가구의 원상
function revertSelPreview() {
  const p = _selPreview;
  if (!p) return;
  _selPreview = null; // 재진입 가드 (recolorItem→showSelPanel 경로 방지: 원복은 시각만)
  if (p.item.colorIdx !== p.colorIdx) recolorItem(p.item, p.colorIdx);
  applyGel(p.item); // gel은 item.gel(커밋값) 기준 재적용 — 미리보기 오버라이드 해제
}
function showSelPanel(item) {
  if (_selPreview && _selPreview.item !== item) revertSelPreview(); // 다른 가구로 전환 — 이전 미리보기 원복
  if (!_selPreview) _selPreview = { item, colorIdx: item.colorIdx, gel: item.gel || null };
  const def = DEFS[item.defId];
  $('sel-name').innerHTML = `${furnIcon(item.defId)} ${LName(def)}`;
  const sw = $('sel-swatches');
  sw.innerHTML = '';
  let previewIdx = item.colorIdx; // 이번 렌더의 미리보기 대상(= 현재 그룹 색)
  const committedIdx = _selPreview.colorIdx;
  def.colors.forEach((c, i) => {
    const s = document.createElement('div');
    // 도료 게이트 (REWARD-LOOP ②): 기본색(0)·커밋색은 무료, 다른 색은 그 계열 도료 1통 소모(적용 시점에).
    //   시그니처 발광 가구(네온)는 hex 계열이 아니라 도심 전용 '네온 안료'를 요구한다(paintFamilyRequired).
    const fam = paintFamilyRequired(item.defId, c);
    const have = state.paints[fam] || 0;
    const needsPaint = i !== 0 && i !== committedIdx;
    const locked = needsPaint && have < 1;
    s.className = 'swatch' + (i === previewIdx ? ' active' : '') + (locked ? ' locked' : '');
    s.style.background = '#' + c.toString(16).padStart(6, '0');
    s.title = LColor(def, i) + (i === 0 ? '' : ` — ${LName(PAINT_ALL[fam])} ${t('paint.haveN', { n: have })}`);
    // #194: hover title은 터치에서 안 뜬다 — 도료 보유 수량을 스와치 우상단 상시 배지로 병기(title은 유지)
    if (i !== 0) { const bd = document.createElement('span'); bd.className = 'sw-cnt'; bd.textContent = have; s.appendChild(bd); }
    s.addEventListener('click', () => {
      if (i === item.colorIdx) return; // 이미 이 색을 보는 중
      recolorItem(item, i); // 미리보기 — 소모·콜렉션 마킹 없음(확정은 아래 「적용」)
      showSelPanel(item);   // 스와치 active·적용 버튼 상태 재렌더
    });
    sw.appendChild(s);
  });
  // 도색 확정 버튼 — 미리보기가 커밋색과 다를 때만 노출. 무료(기본색·복원)는 즉시 확정 문구.
  { const oldAp = $('sel-color-apply'); if (oldAp) oldAp.remove(); }
  if (previewIdx !== committedIdx) {
    const fam = paintFamilyRequired(item.defId, def.colors[previewIdx]);
    const needsPaint = previewIdx !== 0;
    const have = state.paints[fam] || 0;
    const div = document.createElement('div');
    div.id = 'sel-color-apply';
    div.style.cssText = 'margin-bottom:8px';
    div.innerHTML = `<button class="pixel-btn primary" style="width:100%" ${needsPaint && have < 1 ? 'disabled' : ''}>${needsPaint ? t('paint.applyBtn', { name: LName(PAINT_ALL[fam]) }) : t('paint.applyFree')}</button>
      <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${t('sel.previewHint')}</div>`;
    sw.after(div);
    div.querySelector('button').addEventListener('click', () => {
      if (needsPaint) {
        if ((state.paints[fam] || 0) < 1) { toast(t('paint.need', { name: LName(PAINT_ALL[fam]) })); return; }
        state.paints[fam] = (state.paints[fam] || 0) - 1;
        toast(t('paint.used', { name: LName(PAINT_ALL[fam]), left: state.paints[fam] }));
      }
      _selPreview.colorIdx = previewIdx; // 커밋
      markCollection(item.defId, previewIdx);
      showSelPanel(item); scheduleSave();
    });
  }
  // DDD-2 수집품 전시: 액자에 밤하늘 스케치를 건다 — 수집(SKETCHES)의 두 번째 보상 (수집한 것만 노출)
  { const oldSk = $('sel-sketch'); if (oldSk) oldSk.remove(); }
  if (item.defId === 'frame' && Object.keys(state.sketches || {}).length) {
    const div = document.createElement('div');
    div.id = 'sel-sketch';
    div.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-bottom:8px';
    const mk = (id, label) => `<button class="pixel-btn" data-sk="${id}" style="font-size:10px;padding:2px 6px${(item.sketch || '') === id ? ';border-color:var(--accent)' : ''}">${label}</button>`;
    div.innerHTML = mk('', t('frame.default')) + Object.keys(state.sketches).map(id => SKETCHES[id] ? mk(id, LN(SKETCHES[id])) : '').join('');
    $('sel-swatches').after(div);
    div.querySelectorAll('[data-sk]').forEach(b => b.addEventListener('click', () => {
      item.sketch = b.dataset.sk || null;
      recolorItem(item, item.colorIdx); // 그룹 재빌드 재사용 (색 불변)
      if (item.sketch) toast(t('frame.hung', { name: LN(SKETCHES[item.sketch]) }));
      showSelPanel(item); scheduleSave();
    }));
  }
  // #157 가구 티어: 그 자리 손질 업그레이드 — T1→T2→T3. 수거·재제작이 아니라 "손질"이 테마.
  { const oldUp = $('sel-tierup'); if (oldUp) oldUp.remove(); }
  if (def.tiered && (item.tier || 3) < 3) {
    const next = (item.tier || 3) + 1;
    const cost = BAL.tierUp[next] || {};
    const can = resHasAll(cost);
    const div = document.createElement('div');
    div.id = 'sel-tierup';
    div.style.cssText = 'margin-bottom:8px';
    div.innerHTML = `<button class="pixel-btn" id="btn-tierup" ${can ? '' : 'disabled'} style="width:100%">${t('sel.upgrade', { n: next })}</button>
      <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${costLabel(cost)}</div>`;
    $('sel-swatches').after(div);
    $('btn-tierup').addEventListener('click', () => {
      if (!resHasAll(cost)) { toast(t('sel.upgradeLack')); return; }
      resConsumeAll(cost);
      item.tier = next;
      recolorItem(item, item.colorIdx); // 그룹 재빌드 — 티어 복셀 교체
      catSys.setCatSupportDirty(true); // #209 F24: 티어 손질로 상면이 올라가면 퍼치 고양이 재접지(hop 착지) 트리거 — 새 매트리스/쿠션 파묻힘 방지
      { const sr = surfaceRectOf(item); if (sr) for (const ch of itemsOn(item)) { ch.y = sr.y + (item.y || 0); syncTransform(ch); } } // #209 F43: 티어 손질로 상판 높이(surfaceYByTier)가 바뀌면 위 소품 y 재동기화
      markCollection(item.defId, item.colorIdx);
      playSfx('craft');
      toast(t('sel.upgraded'));
      showSelPanel(item); renderResBar(); scheduleSave();
    });
  }
  // #189 P3 조명 젤 → #228⑦ 미리보기+확정: 스와치 클릭=빛만 바꿔 봄(무소모), 「적용」=도료 소모·커밋.
  { const oldGel = $('sel-gel'); if (oldGel) oldGel.remove(); }
  if (def.light?.gelable && state.lightGels) {
    if (_selPreview.previewGel === undefined) _selPreview.previewGel = item.gel || null;
    applyGel(item, _selPreview.previewGel); // recolorItem 재빌드가 커밋 젤로 되돌린 뒤에도 미리보기 유지
    const cur = _selPreview.previewGel || '';
    const committedGel = _selPreview.gel || '';
    const div = document.createElement('div');
    div.id = 'sel-gel';
    div.style.cssText = 'margin-bottom:8px';
    // #194: 배지(sw-cnt)로 보유 수량 상시 병기 + gap 3→6px (밀집 13스와치 오탭 완화)
    const gsw = (fam, hex, title, free) =>
      `<div class="swatch${cur === fam ? ' active' : ''}${!free && !(state.paints[fam] > 0) ? ' locked' : ''}" data-gel="${fam}" title="${title}" style="background:#${hex.toString(16).padStart(6, '0')}">${free ? '' : `<span class="sw-cnt">${state.paints[fam] || 0}</span>`}</div>`;
    div.innerHTML = `<div style="font-size:10px;color:var(--text-dim);margin-bottom:3px">${t('gel.rowTitle')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${gsw('', def.light.color, t('gel.original'), true)}${Object.entries(PAINT_FAMILIES).map(([f, d]) => gsw(f, d.swatch, `${LName(d)} ${t('paint.haveN', { n: state.paints[f] || 0 })}`)).join('')}</div>`;
    $('sel-swatches').after(div);
    div.querySelectorAll('[data-gel]').forEach(b => b.addEventListener('click', () => {
      const fam = b.dataset.gel || null;
      if ((_selPreview.previewGel || null) === fam) return;
      _selPreview.previewGel = fam;
      applyGel(item, fam); // 미리보기 — item.gel 무변·소모 없음
      showSelPanel(item);
    }));
    // 젤 확정 버튼 — 미리보기가 커밋과 다를 때만
    if (cur !== committedGel) {
      const fam = _selPreview.previewGel;
      const have = fam ? (state.paints[fam] || 0) : 1;
      const ap = document.createElement('div');
      ap.id = 'sel-gel-apply';
      ap.style.cssText = 'margin-top:6px';
      ap.innerHTML = `<button class="pixel-btn primary" style="width:100%" ${fam && have < 1 ? 'disabled' : ''}>${fam ? t('gel.applyBtn', { name: LName(PAINT_ALL[fam]) }) : t('gel.applyFree')}</button>
        <div style="font-size:9px;color:var(--text-dim);margin-top:2px">${t('sel.previewHint')}</div>`;
      div.appendChild(ap);
      ap.querySelector('button').addEventListener('click', () => {
        if (fam) {
          if ((state.paints[fam] || 0) < 1) { toast(t('paint.need', { name: LName(PAINT_ALL[fam]) })); return; }
          state.paints[fam] = (state.paints[fam] || 0) - 1;
          toast(t('gel.applied', { name: LName(PAINT_ALL[fam]) }));
        } else toast(t('gel.reset'));
        item.gel = fam;
        _selPreview.gel = fam; // 커밋
        applyGel(item);
        showSelPanel(item); scheduleSave();
      });
    }
  }
  // 조명/가전: 전원 토글 + 연료 잔량 (기획서 v0.2 UI: "양초 3개 보유 / 1일 1개 소비")
  const old = $('sel-power'); if (old) old.remove();
  const fuel = def.light?.fuel || def.appliance?.fuel;
  if (fuel) {
    const have = state.res[fuel] || 0;
    // #195: 태양광/발전기 급전 중엔 배터리 잔량 0이어도 소등되지 않는다(processDay 면제) — 카드가
    //   '잔량 없음!' 경고를 띄우면서 불은 계속 켜지는 모순 방지. 발전기는 켜져 있고 연료가 있어야 급전.
    const freePowered = fuel === 'battery' && (hasMod('solar')
      || (items.some(i2 => DEFS[i2.defId].appliance?.effect === 'power' && i2.on !== false) && (state.res.fuel || 0) > 0));
    // 캔들 스툴은 격일 소비(processDay와 동일 규칙) — '1일 1개' 고정 카피가 실제와 달랐다
    const every2 = item.defId === 'candle';
    const status = freePowered ? t('power.freeTag') : have === 0 ? t('power.empty') : t('power.lasts', { n: every2 ? have * 2 : have });
    const div = document.createElement('div');
    div.id = 'sel-power';
    div.style.cssText = 'font-size:9px;color:var(--text-dim);margin-bottom:6px;line-height:1.5';
    div.innerHTML = `
      <button class="pixel-btn" id="btn-power" style="width:100%;margin-bottom:4px">${item.on !== false ? t('power.on') : t('power.off')}</button>
      ${def.appliance ? `<span style="color:var(--good)">${LLabel(def.appliance)}</span><br>` : ''}
      ${t(every2 ? 'power.fuelLineEvery2' : 'power.fuelLine', { emoji: RESOURCES[fuel].emoji, name: LName(RESOURCES[fuel]), have, status })}`;
    $('sel-swatches').after(div);
    $('btn-power').addEventListener('click', () => {
      setItemPower(item, item.on === false, { silent: false });
      showSelPanel(item);
      scheduleSave();
      toast(item.on ? t('power.turnedOn', { name: LName(def) }) : t('power.turnedOff', { name: LName(def) }));
    });
  }
  selPanel.classList.add('show'); // #228③: 우하단 고정 도킹 — 좌표 계산 불요
}
function hideSelPanel() { revertSelPreview(); selPanel.classList.remove('show'); } // #228⑦: 미확정 미리보기는 닫힐 때 원복

let modalKind = null; // 마지막으로 연 모달 종류 (닫힘 시 퀘스트 훅 판별용, 예: 'report')
function openModal(title, html, kind = null) {
  modalKind = kind;
  $('modal-title').innerHTML = title;
  $('modal-body').innerHTML = html;
  $('modal-back').classList.toggle('ev-visitor', kind === 'visitor'); // #181 방문자 콤팩트 카드(하단·약한 딤)
  $('modal-back').classList.add('show');
}
function closeModal() {
  // 2.0 대한파 규율(§9.4-③): 선택 없이 창을 닫으면 "그냥 버틴다"로 확정 — 매 틱 재오픈 루프 방지
  if (modalKind === 'frontChoice' && state.front && state.front.discipline === null) {
    state.front.discipline = 'none';
    state.dayLog.notes.push(t('front.disc.chose.none'));
    toast(t('front.disc.chose.none'));
    scheduleSave();
  }
  $('modal-back').classList.remove('show');
  modalKind = null;
  pdaAppExit(); // #199: PDA 앱 모드였다면 모달 원위치 + 기기 끄기 (no-op 가드)
}
$('modal-close').addEventListener('click', closeModal);
$('modal-back').addEventListener('click', e => { if (e.target === $('modal-back')) closeModal(); });

// ── 인게임 확인창: window.confirm(브라우저 네이티브 알림창)은 게임 미학을 깨므로 전면 대체 ──
// 버튼은 "확인/취소"가 아니라 행동 동사("출발한다/그만둔다")로 — 실수 방지 + 게임 문법.
// 하네스용: window.__autoConfirm이 정의돼 있으면 그 값으로 즉시 응답.
let confirmResolve = null;
let confirmDontAskKey = null; // 피드백 #2: 활성 확인창의 "다음부터 묻지 않기" 대상 opts 키(없으면 체크박스 숨김)
function gameConfirm(msg, yesLabel, noLabel, dontAskKey) {
  if (window.__autoConfirm !== undefined) return Promise.resolve(!!window.__autoConfirm);
  return new Promise(resolve => {
    if (confirmResolve) confirmResolve(false); // 겹침 방지: 이전 창은 취소로 정리
    confirmResolve = resolve;
    $('confirm-msg').textContent = msg;
    $('confirm-yes').textContent = yesLabel || t('confirm.yes');
    $('confirm-no').textContent = noLabel || t('confirm.no');
    confirmDontAskKey = dontAskKey || null;
    const da = $('confirm-dontask'), cb = $('confirm-dontask-cb');
    if (da && cb) { cb.checked = false; da.style.display = dontAskKey ? 'flex' : 'none'; }
    const back = $('confirm-back');
    back.style.display = '';
    back.classList.add('show');
  });
}
function settleConfirm(v) {
  const back = $('confirm-back');
  back.classList.remove('show');
  back.style.display = 'none';
  // #2: "다음부터 묻지 않기" 체크 + 예 → 해당 설정 off + UI·저장 반영
  if (v && confirmDontAskKey) {
    const cb = $('confirm-dontask-cb');
    if (cb && cb.checked) { opts[confirmDontAskKey] = false; const el = $('opt-' + confirmDontAskKey.toLowerCase()); if (el) el.checked = false; scheduleSave(); }
  }
  confirmDontAskKey = null;
  const r = confirmResolve; confirmResolve = null;
  if (r) r(v);
}
// #2 즉시 행동 확인 게이트 — opts.confirmActions on일 때만 확인창(다음부터 묻지 않기 포함).
async function confirmAct(msgKey) { return !opts.confirmActions || await gameConfirm(t(msgKey), t('confirm.yes'), t('confirm.no'), 'confirmActions'); }
$('confirm-yes').addEventListener('click', () => settleConfirm(true));
$('confirm-no').addEventListener('click', () => settleConfirm(false));
$('confirm-back').addEventListener('click', e => { if (e.target === $('confirm-back')) settleConfirm(false); });
addEventListener('keydown', e => {
  if (!confirmResolve) return;
  if (e.key === 'Escape') { e.stopImmediatePropagation(); settleConfirm(false); }
  if (e.key === 'Enter') { e.stopImmediatePropagation(); settleConfirm(true); }
}, true); // 캡처 단계: 게임 전역 ESC(설정 토글 등)보다 먼저 소비

function shelterUnlocked(id) {
  // 2.0-(b): 동부 관문 구역은 successes가 아니라 국경 개통(eastgate 프로젝트 완공)이 열쇠 — unlockAt 9999는 폴백 봉인.
  if (cityOf(id) === 'east') return !!state.eastGateOpen || (state.layouts[id]?.length > 0); // 2.0-(c): eastcity 4분할 후 도시 기반 판정
  return state.successes >= SHELTERS[id].unlockAt || (state.layouts[id]?.length > 0);
}
function openShelterModal() {
  const curDistrict = districtOf(state.current);
  const groups = Object.entries(DISTRICTS).map(([did, dist]) => {
    const here = did === curDistrict;
    const cards = dist.shelters.map(id => {
      const sh = SHELTERS[id];
      const unlocked = shelterUnlocked(id);
      const cur = id === state.current;
      let costLine = '';
      let btn = '';
      if (unlocked && !cur) {
        const { cost, cross, renov } = moveCostFor(id);
        // 보유/필요 대조 칩 — 이주 로직이 소비하는 동일한 cost 객체에서 렌더 (하드코딩 금지). (B-④) 공통 렌더러.
        const chips = reqChips(cost);
        costLine = chips
          ? `<div class="s-desc" style="color:var(--text-dim)">${t('shelter.reqLabel')}</div><div class="req-chips">${chips}</div>`
          : '';
        const ok = resHasAll(cost);
        // title 제거: costLabel이 HTML(img)이 된 뒤 속성이 깨져 마크업이 텍스트로 유출되던 결함 — 부족분 대조는 req-chips가 이미 표시
        btn = `<button class="pixel-btn" data-shelter="${id}" ${ok ? '' : 'disabled'}>${renov ? t('shelter.moveRefit') : t('shelter.move')}</button>`;
      }
      return `
      <div class="shelter-card ${cur ? 'current' : ''} ${unlocked ? '' : 'locked'}">
        <div class="s-head"><span class="s-emoji">${unlocked ? shIcon(id, 'px-lg') : icon('icon_sys_locked', '', 'px-lg')}</span><span class="s-name">${LName(sh)} ${cur ? `<span style="color:var(--accent)">${t('current')}</span>` : ''}${unlocked && !state.renovated[id] ? t('shelter.unrefit') : ''}</span></div>
        <div class="s-body">
          <div class="s-desc">${unlocked ? LDesc(sh) : t('shelter.locked', { need: sh.unlockAt, cur: state.successes })}</div>
          ${unlocked && sh.perk ? `<div class="s-desc" style="color:var(--good)">${LLabel(sh.perk)}</div>` : ''}
          ${unlocked && sh.limits ? `<div class="s-desc" style="color:var(--bad)">${LLimits(sh)}</div>` : ''}
          ${unlocked ? `<div class="s-desc">${t('shelter.baseComfort', { n: sh.baseComfort || 0, upkeep: sh.upkeep ? LLabel(sh.upkeep) : t('upkeep.none') })}</div>` : ''}
          ${costLine}
          ${btn}
        </div>
      </div>`;
    }).join('');
    return `
      <div style="margin:12px 0 6px;font-size:12px;color:${here ? 'var(--accent)' : 'var(--text-dim)'}">
        ${t('shelter.districtHeader', { emoji: distIcon(did), name: LName(dist), here: here ? t('shelter.hereTag') : '', bonus: LBonus(dist), desc: LDesc(dist) })}
      </div>${cards}`;
  }).join('');
  // 배치 D ④: 현재 셸터에 놓인 가구가 있으면 "남는 가구 N개" 안내 + 전체 수거 바로가기
  const placedN = items.length;
  const leftoverHtml = placedN > 0
    ? `<div class="shelter-leftover" style="font-size:11px;color:var(--text-dim);margin:2px 0 8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
         <span>${t('shelter.leftover', { n: placedN })}</span>
         <button class="pixel-btn" id="btn-shelter-collect" style="padding:3px 8px;font-size:10px">${t('inv.collectAll')}</button>
       </div>`
    : '';
  openModal(t('shelter.modalTitle'), `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">
      ${t('shelter.intro')}
    </div>${leftoverHtml}${groups}`);
  const collectBtn = $('btn-shelter-collect');
  if (collectBtn) collectBtn.addEventListener('click', async () => { closeModal(); await reclaimAll(); });
  $('modal-body').querySelectorAll('button[data-shelter]').forEach(b =>
    b.addEventListener('click', () => moveToShelter(b.dataset.shelter)));
}
/* ============================================================
   생존 수첩 프레젠테이션 — 전 거주자가 남긴 수첩/쪽지 (RE 메모 스타일, cozy 톤)
============================================================ */
let journalPaperURL = null;
function paperTextureURL() {
  if (!journalPaperURL) journalPaperURL = makePaperTexture();
  return journalPaperURL;
}

// 종이 질감 배경을 붙인 오버레이(수첩 패널 / 쪽지)에 텍스처를 씌운다.
// P2: 프로시저럴 텍스처 → AI 생성 에셋(public/img/*.png)으로 교체. makePaperTexture는 폴백/미래용 유지.
// kind: 'journal'(수첩) | 'tip'(쪽지). 이미지 로드 실패 시 프로시저럴 데이터URL로 폴백.
function applyPaperBg(el, kind = 'journal') {
  // 쪽지는 박스 비율(가로형)에 맞춘 전용 스트립 — 정사각 조각을 cover로 깔면
  // 투명 여백과 오버레이가 사각형으로 삐져나온다 (유저 신고)
  const asset = kind === 'tip' ? 'img/tip_strip.png' : 'img/paper_note.png';
  // 진한 종이 이미지 위 잉크(#3a3026) 대비 확보용 밝은 오버레이 한 겹 — 투명 PNG인 쪽지엔 금지
  const overlay = kind === 'tip' ? '' : 'linear-gradient(rgba(255,250,240,.14), rgba(255,250,240,.14)), ';
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `${overlay}url(${asset})`;
    if (kind === 'tip') el.style.backgroundSize = '100% 100%'; // 찢긴 테두리가 박스에 정확히 맞도록
  };
  img.onerror = () => { el.style.backgroundImage = `url(${paperTextureURL()})`; }; // 폴백: 절차적 종이
  img.src = asset;
  // 먼저 프로시저럴을 깔아두면 로드 지연 중에도 빈 배경이 보이지 않는다 (쪽지는 투명 유지)
  if (kind !== 'tip') el.style.backgroundImage = `url(${paperTextureURL()})`;
}

let journalOpen = false; // 수첩이 떠 있는 동안 리포트/인카운터/다음 튜토리얼이 겹치지 않도록 (Tier7: 갱신은 initNotebook의 setJournalOpen 훅)
// (Tier7) 수첩 페이지 렌더러+열람(openJournalPages·help·memo·sketch·truth)은 ui/notebook.js로 이관 — initNotebook 훅 주입.
/* ── 도료 (REWARD-LOOP ② 1차 착지 — 디렉터 확정 2026-07-08) ──
   스와치 공짜 클릭 → 도료 게이트: 칠하려면 그 색 계열의 도료 1통이 필요하다(기본색 0번은 무료).
   드랍은 성공 탐험 저확률 + 지역 시그니처 계열 가중 — "그 색은 거기서 잘 나온다"가 pull이 된다. */
// 지역 시그니처 가중 계열 뽑기 (드랍 롤 전용 — resolveExpedition 안에서만 호출, sim 무접점)
function rollPaintFamily(region) {
  const sig = BAL.paint.regionFamilies[region];
  const all = Object.keys(PAINT_FAMILIES);
  if (sig && sig.length && Math.random() < BAL.paint.signatureWeight) return sig[Math.floor(Math.random() * sig.length)];
  return all[Math.floor(Math.random() * all.length)];
}
// 염료 상인 (디렉터 2026-07-08): 모드별 통조림 값 — 노말·무한 2 / 하드 3 / 하드코어 4
function dyeCost() { return isHardcore() ? 4 : state.mode === 'hard' ? 3 : 2; }
function buyDye(i) {
  const fam = (state.dyeOffer || [])[i];
  if (!fam) return '';
  const n = dyeCost();
  if ((state.res.canned || 0) < n) return t('dye.r.noGoods');
  state.res.canned -= n;
  state.paints[fam] = (state.paints[fam] || 0) + 1;
  renderResBar();
  return t('dye.r.bought', { name: LName(PAINT_FAMILIES[fam]), n });
}
// 잭팟 프레임 (공용): 희귀 획득 전용 연출 — 반짝이는 배너 + SFX. 도료가 첫 사용자, 이후 희귀 티어 공용.
function jackpotToast(msg, hex = 0xffd88a) {
  const el = document.createElement('div');
  el.className = 'jackpot-toast';
  el.style.setProperty('--jp', '#' + hex.toString(16).padStart(6, '0'));
  // 동시 잭팟(도료+도면)은 겹치면 안 읽힌다 — 살아있는 토스트 수만큼 아래로 스택
  const live = document.querySelectorAll('.jackpot-toast:not(.out)').length;
  if (live) el.style.top = `calc(74px + ${live} * 44px * var(--uiz, 1))`;
  el.textContent = msg;
  document.body.appendChild(el);
  playSfx('craft', { vol: 0.5 });
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 600); }, 3200);
}
/* ── 2.0 §9.6 히든 루트 「침묵」: 박사의 문서 + 사일로 시퀀스 ──
   문서 = 유보한 자만 여는 종이(truth 문법 2쪽) — 그들이 간 곳, 그리고 미사일이 갈 수 있는 곳.
   덮으면 좌표로 갈지 한 번 묻는다. 덮어두면 문서는 남고, 다음에 다시 열 수 있다(개구부 탭).
   사일로 = 어둠 라인 페이저(ending-screen 재사용, 엔딩 OST 없음 — BGM 정지가 곧 연출) → 버튼 →
   화이트아웃 → 리로드(타이틀). 완전 무기록(디렉터 확정 2026-07-08): 수첩·기록 탭·토스트·업적 0.
   내부 siloFired만 저장(재발화 방지). 게임은 판단하지 않고 끝난다 — 재진입하면 평소의 아침. */
let siloActive = false;
function showDoctorDocPage() {
  const pages = [1, 2].map(n => ({
    title: t('hidden.doc.title'),
    body: `<div style="opacity:.7;font-size:11px;margin-bottom:10px">${t('hidden.doc.tag')}</div>` +
      `<div style="white-space:pre-line;line-height:1.9">${t('hidden.doc.p' + n)}</div>`,
  }));
  openJournalPages(pages, {
    onClose: () => {
      if (state.siloFired) return; // 이미 눌렀다 — 문서는 남지만 좌표는 더 묻지 않는다
      gameConfirm(t('hidden.silo.confirm'), t('hidden.silo.go'), t('hidden.silo.stay'))
        .then(yes => { if (yes) runSiloSequence(); });
    },
  });
}
function runSiloSequence() {
  siloActive = true;
  closeModal();
  setPaused(false);
  bgm.pause(); setAmbience(null); setFire(false); // 문자 그대로의 침묵 — 재개 가드는 pointerdown 언락 핸들러 쪽
  const lines = [0, 1, 2, 3].map(n => t('hidden.silo.line' + n));
  let i = 0;
  const scr = $('ending-screen'), txt = $('ending-text'), btn = $('ending-next');
  // #170 REV3 「돌아선다」: 버튼 앞까지 가서 누르지 않는 자의 문 — 마지막 줄에서만 노출.
  //   목격(siloSeen)만 기록하고 평소의 밤으로 돌아간다. 며칠 뒤, 밤의 교신(doctor_call)이 온다.
  let leaveBtn = document.getElementById('silo-leave');
  if (!leaveBtn) {
    leaveBtn = document.createElement('button');
    leaveBtn.id = 'silo-leave';
    leaveBtn.className = 'pixel-btn';
    btn.parentNode.insertBefore(leaveBtn, btn.nextSibling);
  }
  leaveBtn.textContent = t('hidden.silo.leave');
  leaveBtn.style.display = 'none';
  leaveBtn.onclick = () => {
    leaveBtn.style.display = 'none';
    scr.style.display = 'none';
    btn.onclick = null;
    siloActive = false;
    if (!state.siloSeen) state.siloSeen = state.day; // 목격 기록 — 눌렀는지 아닌지는 어디에도 없다
    flushSave();
    syncBgm(true); // 침묵을 걷는다 — 앰비언스·난롯불은 syncSfxAmbience 틱이 복원
  };
  scr.style.display = 'flex';
  const render = () => {
    txt.style.animation = 'none'; void txt.offsetWidth; txt.style.animation = '';
    txt.innerHTML = lines[i];
    btn.textContent = i === lines.length - 1 ? t('hidden.silo.press') : t('intro.next');
    leaveBtn.style.display = i === lines.length - 1 ? '' : 'none';
  };
  btn.onclick = () => { // onclick 대입: 리스너 중복 방지 (runEndingSequence 동일 패턴)
    i++;
    if (i >= lines.length) {
      btn.onclick = null;
      leaveBtn.style.display = 'none';
      state.siloFired = true; // 내부 전용 — 어디에도 표시하지 않는다
      flushSave();
      // 화이트아웃: 흰 덮개가 천천히 차오르고, 잠시 머문 뒤 타이틀로(리로드). 소리 없음. 그러고 끝.
      const wh = document.createElement('div');
      wh.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;transition:opacity 1.8s ease;z-index:9999;pointer-events:auto';
      document.body.appendChild(wh);
      requestAnimationFrame(() => { wh.style.opacity = '1'; });
      setTimeout(() => location.reload(), 3800);
    } else render();
  };
  render();
}
/* ── 라디오 방송 연출 (좀보이드식 자막 버블, #12 코디 지시) ──
   모달 대신 배치된 라디오 위에 초록 자막 박스를 띄운다. 라디오 월드 좌표를 매 프레임
   화면에 투영해 고정. radio_broadcast.ogg 를 2~3회 반복 재생(원샷 스케줄, 루프 채널 미사용). */
let radioBubble = null;         // { el, item, text, shown, ttl, fading, sfxTimers } — 활성 방송 상태
const RADIO_SFX_CLIP = 1.85;    // radio_broadcast.ogg 길이(초) — 반복 간격
function ensureRadioBubbleEl() {
  let el = document.getElementById('radio-bubble');
  if (!el) {
    el = document.createElement('div');
    el.id = 'radio-bubble';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}
// 가장 최근 배치된 라디오 아이템 (없으면 null)
function latestRadioItem() {
  const radios = items.filter(i => i.defId === 'radio' && i.group);
  return radios.length ? radios[radios.length - 1] : null;
}
// 방송 자막 버블 시작 — id 방송을 라디오 위에 타자기식으로 출력하고 지지직을 2~3회 재생.
function showBroadcastModal(id) { // 이름 유지(기존 호출부 호환), 실제로는 버블 연출
  const b = BROADCASTS[id];
  if (!b) return;
  const radio = latestRadioItem();
  if (!radio) return; // 라디오 없으면 발화하지 않음 (기존 조건 유지)
  // 이전 버블 정리
  clearRadioBubble();
  const el = ensureRadioBubbleEl();
  const full = LN(b);
  // v1.4.2(디렉터 오더): 자막에는 전파를 타는 단파 단문(air)만 — 수신자 시점 서술(desc)은 수첩 기록 전용.
  const bodyText = LD(b.air ? { desc: b.air, descEn: b.airEn || b.air } : b).replace(/\s+/g, ' ');
  el.className = '';
  el.innerHTML = `<div class="rb-title"></div><div class="rb-body"></div>`;
  el.style.display = 'block';
  radioBubble = { el, item: radio, ttl: 0, fading: false, sfxTimers: [], typeTimer: null };
  positionRadioBubble(); // 첫 배치
  // 지지직 2~3회 반복 (원샷 스케줄) — 볼륨은 기존 radio_noise 수준(0.5)
  const reps = 2 + (Math.random() < 0.5 ? 1 : 0);
  dbgSfx = 'radio_broadcast';
  for (let k = 0; k < reps; k++) {
    const tm = setTimeout(() => playSfx('radio_broadcast', { vol: 0.5, jitter: 0 }), k * RADIO_SFX_CLIP * 1000);
    radioBubble.sfxTimers.push(tm);
  }
  // 타자기 출력 (제목 먼저 즉시, 본문 1글자씩)
  el.querySelector('.rb-title').textContent = full;
  const bodyEl = el.querySelector('.rb-body');
  let ci = 0;
  const type = () => {
    if (!radioBubble) return;
    bodyEl.textContent = bodyText.slice(0, ci);
    ci++;
    if (ci <= bodyText.length) radioBubble.typeTimer = setTimeout(type, 32);
    else radioBubble.ttl = performance.now() + 4000; // 완료 후 4초 유지
  };
  type();
  // 수집 처리는 호출부(pendingBroadcast 드레인)에서 이미 확정 — 여기선 토스트만
  toast(t('radio.logged'));
}
// 라디오 월드 좌표 → 화면 px 투영 후 버블 위치 갱신 (renderFrame 루프에서 매 프레임 호출)
function positionRadioBubble() {
  if (!radioBubble || !radioBubble.item?.group) return;
  const el = radioBubble.el;
  const p = new THREE.Vector3();
  radioBubble.item.group.getWorldPosition(p);
  p.y += radioBubble.yOff ?? 0.9; // 라디오/방문자 머리 위 (#181 방문자는 더 높게)
  p.project(camera);
  // NDC → 시각 px (picking 과 동일 매핑: (ndc*0.5+0.5)*innerWidth)
  let x = (p.x * 0.5 + 0.5) * innerWidth;
  let y = (-p.y * 0.5 + 0.5) * innerHeight;
  // 뷰포트 밖이면 가장자리에 클램프
  const margin = 20;
  x = Math.max(margin, Math.min(innerWidth - margin, x));
  y = Math.max(margin, Math.min(innerHeight - margin, y));
  // #radio-bubble 은 zoom:var(--uiz) 적용 → left/top 은 uiz 로 나눠 보정 (visual px 정합)
  const uiz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uiz')) || 1;
  el.style.left = (x / uiz) + 'px';
  el.style.top = (y / uiz) + 'px';
}
// 방송 버블 페이드/정리 (renderFrame 훅에서 ttl 경과 시 페이드아웃)
function tickRadioBubble() {
  if (!radioBubble) return;
  positionRadioBubble();
  if (!radioBubble.fading && radioBubble.ttl && performance.now() > radioBubble.ttl) {
    radioBubble.fading = true;
    radioBubble.el.classList.add('fade');
    setTimeout(clearRadioBubble, 600);
  }
}
function clearRadioBubble() {
  if (!radioBubble) return;
  radioBubble.sfxTimers.forEach(clearTimeout);
  if (radioBubble.typeTimer) clearTimeout(radioBubble.typeTimer);
  const el = radioBubble.el;
  el.style.display = 'none';
  el.classList.remove('fade');
  radioBubble = null;
}

/* ── 첫날 튜토리얼 (신규 게임 한정) — #202 디렉터: 3일 루틴(매일 메모→탐험)을 하루로 압축.
   세 메모를 Day 1 한 권으로 합본 — 탐험 1번이면 온보딩 루틴이 끝난다. */
const TUTORIAL_PAGES = {
  1: [
    { titleId: 'jnl.tut1.title', bodyId: 'jnl.tut1.body' },
    { titleId: 'jnl.tut2.title', bodyId: 'jnl.tut2.body' },
    { titleId: 'jnl.tut3.title', bodyId: 'jnl.tut3.body' },
  ],
};
function showTutorialPage(day) {
  if (!tutorialEligible()) return; // 노말 전용 (디렉터 오더)
  const pages = TUTORIAL_PAGES[day];
  if (!pages) return;
  state.tutDay = day; // 표시 즉시 기록 — 닫기 전에 리로드해도 같은 페이지가 중복되지 않게
  scheduleSave();
  openJournalPages(pages);
}

/* ============================================================
   퀘스트 트래커 (v2.5) — 신규 게임 온보딩 체크리스트
   생존 수첩 텍스트를 읽지 않는 유저를 위해, 첫 1~2일을 눈에 보이는
   할 일 카드로 유도한다. state.questIdx로 진행 단계를 추적하며,
   기존 세이브는 loadSave()에서 -1로 마이그레이션해 표시하지 않는다.
============================================================ */
const QUESTS = [
  // img = 현행 아트 아이콘(#202 디렉터: 전 단계 아이콘 현행화). #213: 이모지 폴백 폐지 — 로드 실패 시 공란.
  { id: 'drink',  img: 'icon_g_thirst',     textId: 'quest.drink.text',  loreId: 'quest.drink.lore',  doneId: 'quest.drink.done',  reward: { water: 1 } },
  { id: 'eat',    img: 'icon_res_canned',   textId: 'quest.eat.text',    loreId: 'quest.eat.lore',    doneId: 'quest.eat.done',    reward: { canned: 1 } },
  { id: 'place',  img: 'icon_sys_edit',    textId: 'quest.place.text',  loreId: 'quest.place.lore',  doneId: 'quest.place.done',  reward: { cloth: 1 } },
  { id: 'depart', img: 'icon_act_explore', textId: 'quest.depart.text', loreId: 'quest.depart.lore', doneId: 'quest.depart.done', reward: {} },
  // '결산 리포트 확인' 단계였음 — 거점 UI에 그런 화면이 없어 유저가 길을 잃었다.
  // 취침 유도로 교체: 자고 일어나면 아침 보고가 뜨는 흐름 자체가 결산을 가르친다.
  { id: 'sleep', img: 'icon_act_sleep', textId: 'quest.sleep.text', loreId: 'quest.sleep.lore', doneId: 'quest.sleep.done', reward: { bandage: 1 } },
  { id: 'craft',  img: 'icon_act_craft', textId: 'quest.craft.text',  loreId: 'quest.craft.lore',  doneId: 'quest.craft.done',  reward: { parts: 1 } },
  { id: 'clean',  img: 'icon_act_clean', textId: 'quest.clean.text',  loreId: 'quest.clean.lore',  doneId: 'quest.clean.done',  reward: { water: 1 } },
];
// 튜토리얼류(온보딩 퀘스트·수첩 페이지·쪽지 팁)는 노말에서만 (디렉터: "하드·하드코어는 이미 할 줄 알잖아").
//   무한(zen)·배경화면도 언락/관전 모드라 동일 제외 — 신규 유저 진입점은 노말뿐.
function tutorialEligible() { return state.mode === 'normal'; }
function questActive() { return tutorialEligible() && state.questIdx >= 0 && state.questIdx < QUESTS.length; }
function renderQuestCard() {
  const card = $('quest-card');
  if (!card) return;
  if (!questActive()) { card.classList.remove('show'); return; }
  const q = QUESTS[state.questIdx];
  const qi = $('quest-icon');
  // 튜토리얼 아이콘 = HUD 액션 아트 아이콘(img). #213: 이모지 폴백 폐지 — 로드 실패 시 소멸(라벨이 의미 전달).
  qi.innerHTML = q.img ? `<img class="q-art" src="img/icons/${q.img}.png" alt="" draggable="false" onerror="this.remove()">` : '';
  const lore = $('quest-lore');
  // #208(디렉터 "영어서 json열 나온다"): quest.*.text/lore는 인라인 px-icon(<img>)을 담을 수 있어 innerHTML로 렌더.
  //   textContent였던 탓에 en/ja의 <img> 태그가 글자로 유출됐다(ko는 순수 텍스트라 무증상). 로케일=우리 통제 문자열이라 안전.
  if (lore) lore.innerHTML = q.loreId ? t(q.loreId) : '';
  $('quest-text').innerHTML = t(q.textId);
  // 배치 단계 동안 버튼 시선 유도 (툴바가 배치 모드 전용이 되면서 진입점을 가르쳐야 한다)
  const eb = $('btn-edit');
  if (eb) eb.classList.toggle('pulse', q.id === 'place');
  $('quest-prog').textContent = t('quest.progress', { cur: state.questIdx, total: QUESTS.length });
  card.classList.remove('done-flash');
  card.classList.add('show');
}
// #202 튜토리얼 건너뛰기 — 체인 종료 + 수첩 페이지 억제(보상 없음, 카드 즉시 퇴장)
$('quest-skip')?.addEventListener('click', () => {
  if (!questActive()) return;
  state.questIdx = -1;
  state.tutDay = 3; // 남은 수첩 튜토리얼 페이지도 표시 안 함
  const eb = $('btn-edit');
  if (eb) eb.classList.remove('pulse');
  renderQuestCard();
  toast(t('quest.skip.done'));
  scheduleSave();
});
// 퀘스트 진행 훅 — 해당 id가 현재 진행 중인 퀘스트일 때만 완료 처리
function questProgress(id) {
  if (!questActive()) return;
  const q = QUESTS[state.questIdx];
  if (q.id !== id) return;
  for (const [rid, n] of Object.entries(q.reward)) resAdd(rid, n);
  const card = $('quest-card');
  if (card) card.classList.add('done-flash');
  playSfx('place', { vol: 0.2 });
  const rewardMsg = Object.keys(q.reward).length
    ? ' +' + Object.entries(q.reward).map(([rid, n]) => `${RESOURCES[rid].emoji}${n}`).join(' ')
    : '';
  // 완료 payoff — 수첩 주인의 목소리 (없으면 목표 문구 폴백)
  toast((q.doneId ? t(q.doneId) : t(q.textId)) + rewardMsg);
  state.questIdx++;
  renderResBar(); updateHud(); scheduleSave();
  setTimeout(() => {
    if (state.questIdx >= QUESTS.length) {
      state.questIdx = -1; // 체인 완료 — 트래커 퇴장 (마지막 payoff는 위 doneId가 이미 출력)
      renderQuestCard();
      scheduleSave();
    } else {
      renderQuestCard();
      paperSfx();
    }
  }, 600);
}

/* ── 찢어진 쪽지 (1회성 팁) ── */
const tipQueue = [];
let tipShowing = false;
let tipTimer = null;
function showTipNote(id) {
  const note = $('tip-note');
  applyPaperBg(note, 'tip');
  note.textContent = t(id);
  note.style.display = 'block';
  void note.offsetWidth;
  note.classList.add('show');
  paperSfx();
  const dismiss = () => {
    clearTimeout(tipTimer);
    note.classList.remove('show');
    note.removeEventListener('click', dismiss);
    setTimeout(() => {
      note.style.display = 'none';
      tipShowing = false;
      drainTipQueue();
    }, 420); // 슬라이드 아웃 트랜지션 시간만큼 대기
  };
  note.addEventListener('click', dismiss);
  tipTimer = setTimeout(dismiss, 15000);
}
function drainTipQueue() {
  if (tipShowing || !tipQueue.length) return;
  tipShowing = true;
  showTipNote(tipQueue.shift());
}
function tipOnce(id) {
  if (!tutorialEligible()) return; // 튜토리얼 쪽지도 노말 전용 (디렉터 오더)
  if (_simRunning) return; // F1(헤르메틱): 시뮬 중엔 종이 팁 렌더 금지. showTipNote→applyPaperBg가 절차적 종이 텍스처를
  //   Math.random으로 생성(첫 호출 캐시=첫-run 래치)해 시드 시퀀스를 ~9600 소비·desync시켰다. 팁은 순수 시각.
  // #212 근원 치료: 골든 동결 중에도 금지 — 로드 시 날씨 롤(시드 고정=snow 확정)이 tip.snow를 발화시키고,
  //   소멸이 실시간 15s 타이머라 러너 진행 속도에 따라 캡처 순간과 교차(lodge 3.43% 이항 플레이키의 정체).
  //   팁은 게이트가 검증할 대상(지오·조명)이 아닌 순수 UI — sim 가드와 같은 사유로 차단한다.
  if (isGoldenFrozen()) return;
  if (state.tipsSeen[id]) return;
  state.tipsSeen[id] = true;
  tipQueue.push(id);
  drainTipQueue();
  scheduleSave();
}

/* ── 종이 부스럭 소리 (WebAudio 합성 — 오디오 파일 없음) ── */
let sfxCtx = null;
function ensureSfxCtx() {
  if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (sfxCtx.state === 'suspended') sfxCtx.resume().catch(() => {});
  return sfxCtx;
}
function paperSfx(sfxOpts = {}) {
  try {
    const ctx = ensureSfxCtx();
    const vol = sfxOpts.sfxVol ?? opts.sfxVol ?? 0.07;
    const bursts = 2 + Math.floor(Math.random() * 2); // 2~3회의 짧은 크랙클
    let t0 = ctx.currentTime;
    for (let b = 0; b < bursts; b++) {
      const dur = 0.06 + Math.random() * 0.06;
      const bufSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      const f0 = 1800 + Math.random() * 800;
      const f1 = 3200 + Math.random() * 800;
      bp.frequency.setValueAtTime(f0, t0);
      bp.frequency.linearRampToValueAtTime(f1, t0 + dur);
      bp.Q.value = 0.9;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol * (0.5 + Math.random() * 0.5), t0 + dur * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
      t0 += dur * (0.55 + Math.random() * 0.4);
    }
  } catch (e) { /* 오디오 컨텍스트 사용 불가 환경 — 무시 */ }
}
$('btn-exp').addEventListener('click', () => {
  // #디렉터: 지역탐험 패널 삭제 → 탐험 중이면 PDA 상태(진행률·부상 이관), 아니면 관측 단말(S2 — 동부는 전도 폴백).
  if (state.exp) pdaOpen('status');
  else openObsMap();
});
$('btn-move').addEventListener('click', () => pdaOpenApp(openShelterModal)); // #199 5차-d: 이주도 PDA 앱
$('btn-help').addEventListener('click', () => pdaOpenApp(openHelpModal)); // #199 5차-e: 도움말도 PDA 앱
$('btn-rotate').addEventListener('click', rotateActive);
$('btn-delete').addEventListener('click', reclaimSelected);
$('btn-reset').addEventListener('click', () => {
  flushSave();                                     // 마지막 상태를 즉시 기록 후
  setTimeout(() => location.reload(), 500);        // 타이틀로
});
// 인게임 저장 — 즉시 슬롯에 기록해 로비에서 불러올 세이브를 확정 (타이틀 모드에선 버튼 숨김 처리됨)
$('btn-save-now').addEventListener('click', () => {
  if (titleVisible) return; // 안전 가드 — 유령 세이브 방지 (버튼은 CSS로도 숨겨짐)
  flushSave();
  toast(t('save.done', { n: currentSlot }));
});

// 세이브 내보내기: 현재 슬롯의 원본 JSON을 파일로 다운로드 (설정 패널 + 타이틀 화면 공용)
function exportSave() {
  flushSave(); // 예약된 저장을 즉시 반영해 최신 상태를 내보낸다
  const raw = localStorage.getItem(slotKey(currentSlot));
  if (!raw) { toast(t('save.exportNone')); return; }
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shelter-slot${currentSlot}-day${state.day}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast(t('save.exported'));
}
// 세이브 가져오기: 파일에서 읽어 검증 후 현재 슬롯에 덮어쓰기 (설정 패널 + 타이틀 화면 공용)
function importSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { toast(t('save.invalidFile')); return; }
      if (!data?.state || data.state.ver == null || data.state.day == null) { toast(t('save.invalidFile')); return; }
      if (!(await gameConfirm(t('save.overwrite', { n: currentSlot }), t('confirm.overwrite'), t('confirm.cancel')))) return;
      try {
        localStorage.setItem(slotKey(currentSlot), JSON.stringify(data));
        localStorage.setItem(LASTSLOT_KEY, String(currentSlot));
      } catch (e) { toast(t('save.failed')); return; }
      location.reload();
    };
    reader.readAsText(file);
  });
  input.click();
}
// P2-a: 인게임 내보내기/가져오기 버튼 제거 — 세이브 파일 관리는 타이틀(t-export/t-import)에서만
$('t-export').addEventListener('click', exportSave);
$('t-import').addEventListener('click', importSave);

/* #224 HUD 2차 — 알림 큐 (HUD-SPEC-RECON §1.4 채택분):
   구형은 단일 슬롯 덮어쓰기라 러시(정산·숙련·경고 연발) 때 앞 알림이 증발했다(#204에서 실측된 문제).
   ① 동시 표시 2 + 초과분 대기 큐  ② 5초 동일 메시지 중복 억제  ③ warn 우선순위(대기열 앞)
   ④ 회선 기록(toastLog) — 지나간 알림이 PDA 기록 탭에 남는다(증발 종식). 호출부 시그니처 불변. */
const toastEl = $('toast');
const TOAST_SHOW_MS = 1800, TOAST_MAX = 2, TOAST_DEDUP_MS = 5000, TOAST_LOG_MAX = 60;
const toastSeen = new Map(); // msg → 마지막 표시 시각(실시간) — 중복 억제용
const toastLog = [];         // { day, min, msg } — 런타임 회선 기록(세이브 비영속: 알림은 '그 순간'의 것)
let toastWait = [];
function toast(msg, prio) {
  const now = Date.now();
  const last = toastSeen.get(msg);
  if (last && now - last < TOAST_DEDUP_MS) return;
  toastSeen.set(msg, now);
  toastLog.push({ day: state.day, min: state.gameMin % 1440, msg });
  if (toastLog.length > TOAST_LOG_MAX) toastLog.shift();
  if (prio === 'warn') toastWait.unshift({ msg, prio }); else toastWait.push({ msg, prio });
  drainToast();
}
function drainToast() {
  while (toastEl.children.length < TOAST_MAX && toastWait.length) {
    const { msg, prio } = toastWait.shift();
    const el = document.createElement('div');
    el.className = 't-item' + (prio ? ' ' + prio : '');
    el.innerHTML = msg; // P2: costLabel 등 아트 아이콘 수용 — msg는 전부 자체 로케일 문자열(외부 입력 없음)
    toastEl.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => { el.remove(); drainToast(); }, 300);
    }, TOAST_SHOW_MS);
  }
}

/* ============================================================
   렌더링 옵션 & 픽셀 파이프라인
============================================================ */
let rt = null;
function makeRT() {
  if (rt) rt.dispose();
  const w = Math.max(2, Math.floor(innerWidth / opts.pixel));
  const h = Math.max(2, Math.floor(innerHeight / opts.pixel));
  rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, samples: opts.aa ? 4 : 0 });
  postMat.uniforms.tex.value = rt.texture;
  postMat.uniforms.uRes.value.set(w, h);
}
const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const PAL_N = PALETTE_FLAT.length; // 마스터 팔레트 색 수 (컴파일 타임 상수로 셰이더에 주입 → 상수 루프 경계)
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tex: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
    uLevels: { value: 8.0 }, uQuant: { value: 1.0 }, uDither: { value: 1.0 }, uDitherAmt: { value: 1.0 },
    uPalOn: { value: 0.0 },
    uBloom: { value: 0.0 },     // 퀄업 A1 발광 블룸 — applyOpts가 0.4(디렉터 확정 2026-07-23) 또는 0(토글 off) 공급
    uBloomThr: { value: 0.72 }, // 블룸 임계(선형) — 0.5는 정오 관제탑 유리(넓은 밝은 면 ~0.7)까지 백화(24% diff 실측) → 0.72로 발광체(~1.0)만 통과
    uGrade: { value: 0.0 },     // 퀄업 A2 시간대 그레이딩 강도(시안 — 디렉터 톤 판정 대기): 0=정확히 항등(골든 불변)
    uGradeLift: { value: new THREE.Vector3(0, 0, 0) },  // 시각별 바닥 리프트(밤=한랭) — applyTimeLighting이 매 프레임 공급
    uGradeGain: { value: new THREE.Vector3(1, 1, 1) },  // 시각별 게인(노을·여명=앰버, 밤=청색기)
    uBarrel: { value: 0.0 }, // CRT 배럴 실험(디렉터 2026-07-22): 0=항등(기본·골든 불변). 씬만 휘고 DOM UI는 평면.
    uCrt: { value: 0.0 },    // 관측 단말 CRT 위성 룩(디렉터 2026-07-22): 0=off. 지터·리프레시 스윕·RGB 형광체·스캔라인·그레인.
    uCrtT: { value: 0.0 },   // CRT 시간(초) — 골든/캡처 결정론을 위해 renderFrame이 공급(freeze 시 고정)
    uPal: { value: PALETTE_FLAT.map(c => new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255)) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `
    precision highp float;
    #define PAL_N ${PAL_N}
    varying vec2 vUv;
    uniform sampler2D tex; uniform vec2 uRes;
    uniform float uLevels, uQuant, uDither, uDitherAmt, uPalOn, uBarrel, uCrt, uCrtT, uBloom, uBloomThr, uGrade;
    uniform vec3 uGradeLift, uGradeGain;
    uniform vec3 uPal[PAL_N];
    float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
    float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    // 큐레이션 팔레트 최근접 스냅 — 휘도(녹 가중) + 온도(r-b) + 녹도 인지 거리로
    //   따뜻한 하이라이트가 차가운 스와치로 새지 않게 한다(오프라인 파일럿에서 검거한 오매핑 방지).
    vec3 snapPal(vec3 c){
      float wp = c.r - c.b, gp = c.g - (c.r + c.b) * 0.5;
      float bd = 1e9; vec3 best = c;
      for (int i = 0; i < PAL_N; i++){
        vec3 P = uPal[i];
        float dr = c.r - P.r, dg = c.g - P.g, db = c.b - P.b;
        float dw = wp - (P.r - P.b), dgn = gp - (P.g - (P.r + P.b) * 0.5);
        float dist = dr*dr*0.5 + dg*dg*0.7 + db*db*0.4 + dw*dw*1.2 + dgn*dgn*1.0;
        if (dist < bd){ bd = dist; best = P; }
      }
      return best;
    }
    void main(){
      // CRT 배럴(실험): 중앙이 부풀고 모서리가 유리 밖(흑)으로 말린다. uBarrel=0이면 정확히 항등(골든 불변).
      //   디더 그리드(pc)도 워프된 uv를 쓴다 — 픽셀 격자 자체가 유리에 휘어 보이는 게 진짜 CRT 문법.
      vec2 uv = vUv;
      if (uBarrel > 0.0) {
        vec2 cc = uv - 0.5;
        uv = 0.5 + cc * (1.0 + uBarrel * dot(cc, cc));
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      }
      // ── 관측 단말 CRT 위성 룩(디렉터 2026-07-22: "낡은 위성 신호 하이재킹을 CRT로") ──
      //   샘플 전 왜곡: 간헐 수평 지터(신호 발작) — 시간·라인 해시로 희소하게.
      if (uCrt > 0.5) {
        float t = uCrtT;
        float fit = floor(t * 1.6);
        float burst = step(0.72, fract(sin(fit * 91.7) * 4375.8));            // 이따금 오는 발작 구간
        float line = floor(uv.y * 96.0);
        float pick = step(0.93, fract(sin(line * 13.37 + fit * 7.1) * 43758.5)); // 발작 중에도 몇 줄만
        uv.x += burst * pick * (fract(sin(line * 3.7 + floor(t * 30.0)) * 997.1) - 0.5) * 0.035;
      }
      vec3 col = texture2D(tex, uv).rgb;
      // 퀄업 A1: 발광 한정 포스트 블룸 — 저해상 버퍼(양자화 전·선형 공간)에서 2겹 링 커널 가산.
      //   여기(픽셀화 전)에 넣어야 번짐이 도트 결로 뭉친다(후단이면 뭉개짐 — 순서가 전부).
      //   임계 초과분만 가산이라 어두운 씬 대비 유지. uBloom=0이면 분기 자체가 항등(골든 불변).
      if (uBloom > 0.0) {
        vec2 bpx = 1.0 / uRes;
        vec3 acc = vec3(0.0);
        for (int i = 0; i < 6; i++) {
          float a = 1.0471976 * float(i); // 60도 간격 6방향 × 2반경
          vec2 dir = vec2(cos(a), sin(a));
          acc += max(texture2D(tex, uv + dir * 1.6 * bpx).rgb - uBloomThr, 0.0);
          acc += max(texture2D(tex, uv + dir * 3.2 * bpx).rgb - uBloomThr, 0.0) * 0.5;
        }
        col += acc * (uBloom / 9.0);
      }
      col = pow(col, vec3(1.0 / 2.2));
      // 퀄업 A2: 시간대 그레이딩 — 표시 공간에서 게인·리프트 1회 곱(양자화 전이라 팔레트 스냅도 그레이딩된 색 기준).
      //   uGrade=0이면 분기째 항등(골든 불변). 값 저작은 금문교 24h 키프레임(KEY 표) 노하우 이식.
      if (uGrade > 0.0) col = clamp(col * mix(vec3(1.0), uGradeGain, uGrade) + uGradeLift * uGrade, 0.0, 1.0);
      if (uPalOn > 0.5) {
        // 그라데이션이 두 스와치 사이에서 매끄럽게 넘어가도록 스냅 전에 약한 오더드 디더만.
        vec2 pc = floor(uv * uRes);
        float d = uDither > 0.5 ? (bayer4(pc) - 0.5) * 0.05 * uDitherAmt : 0.0;
        col = snapPal(clamp(col + d, 0.0, 1.0));
      } else if (uQuant > 0.5) {
        vec2 pc = floor(uv * uRes);
        float d = uDither > 0.5 ? (bayer4(pc) - 0.5) * 0.55 * uDitherAmt / uLevels : 0.0;
        col = clamp(col + d, 0.0, 1.0);
        col = floor(col * uLevels + 0.5) / uLevels;
      }
      // ── CRT 후단(샘플·양자화 뒤): 형광체 RGB 트라이어드 + 스캔라인 + 리프레시 스윕 + 그레인 + 비네트 ──
      //   트라이어드는 디바이스 픽셀(gl_FragCoord) 기준 — 게임 픽셀 하나가 여러 형광체로 갈라져 보이는
      //   레퍼런스(CRT 접사)의 그 결. 스캔라인도 디바이스 좌표라 배럴 워프와 무관하게 유리면에 붙는다.
      if (uCrt > 0.5) {
        float t = uCrtT;
        int m = int(mod(floor(gl_FragCoord.x), 3.0));
        vec3 tri = vec3(0.62);
        if (m == 0) tri.r = 1.38; else if (m == 1) tri.g = 1.38; else tri.b = 1.38;
        // 디렉터 2026-07-22 정정: 형광체·감광이 시간대 색온을 눌러 '건조한 위성사진'이 됐다 —
        //   트라이어드 혼합 완화(0.42→0.28) + 감광 전반 보상. 아침 볕·노을·밤 창문이 CRT 너머로도 읽혀야 한다.
        col *= mix(vec3(1.0), tri, 0.28);
        col *= (mod(floor(gl_FragCoord.y), 3.0) < 1.0) ? 0.86 : 1.07;      // 스캔라인 1/3 (감광 완화)
        float sweep = fract(t / 3.6);                                       // 리프레시 스윕: 3.6s 주기 위→아래
        col += vec3(0.10, 0.13, 0.10) * smoothstep(0.10, 0.0, abs(vUv.y - (1.0 - sweep)));
        float n = fract(sin(dot(floor(vUv * uRes) + floor(t * 24.0), vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * 0.04;                                            // 신호 그레인 (완화)
        vec2 vc = vUv - 0.5;
        col *= 1.0 - dot(vc, vc) * 0.32;                                    // 코너 감광(관 유리, 완화)
        col *= 1.06;                                                        // 전체 휘도 보상 — 관측이 본편보다 어두워지지 않게
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
  depthTest: false, depthWrite: false,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
// CRT 배럴 실험 노브(디렉터 2026-07-22) — QA 전용. 채택 시 설정창 그래픽 탭에 정식 편입 예정.
function setBarrel(k) { postMat.uniforms.uBarrel.value = Math.max(0, +k || 0); }
// 퀄업 A1 블룸 노브 — QA/시안 전용(기본 0=항등). 디렉터 톤 판정 후 opts·설정창 정식 편입.
function setBloom(v, thr) { postMat.uniforms.uBloom.value = Math.max(0, +v || 0); if (thr != null) postMat.uniforms.uBloomThr.value = +thr; }
// 패널 볼록(창=브라운관) 실험 노브 — 0=off, 1=약, 2=강
function setPanelBulge(n) { document.body.classList.toggle('crt-bulge1', n === 1); document.body.classList.toggle('crt-bulge2', n === 2); }
// ── CRT 곡률 히트 보정(디렉터: "각 강도별 픽셀 보정") ──
//   변위 필터는 픽셀만 옮기고 클릭 판정은 평면에 남는다. 사용자는 '보이는 위치'를 누르므로,
//   캡처 단계에서 클릭 좌표를 순변위(표시 좌표→평면 좌표)해 실제 요소로 재조준한다.
//   변위장은 필터와 동일 수식(dx = u·r²·scale·폭) — 강도 계수는 index.html 필터 scale과 1:1 동기.
const BULGE_SCALE = { 1: 0.02, 2: 0.045 }; // crtBulgeA/B의 feDisplacementMap scale과 동일 값
function bulgeRetarget(e) {
  if (e.__bulged || !e.isTrusted && !e.__bulgeTest) return; // 합성 이벤트는 통과(재귀 방지) — __bulgeTest는 QA 주입용
  // #218 관측 오버레이: 풀스크린 곡률(crtBulgeB — 옵션 무관, CRT 위성 룩의 일부)이 상시 걸린다.
  //   변위 기준이 '화면 bbox'이므로 패널 rect 대신 #obs-screen rect로 계산한다.
  const obsScr = e.target && e.target.closest ? e.target.closest('#obs-screen') : null;
  let k;
  if (obsScr) k = 0.045; // 관측은 옵션과 무관하게 crtBulgeB 강도 고정
  else k = document.body.classList.contains('crt-bulge2') ? BULGE_SCALE[2]
    : document.body.classList.contains('crt-bulge1') ? BULGE_SCALE[1] : 0;
  if (!k) return;
  const panel = obsScr || (e.target && e.target.closest ? e.target.closest('.panel') : null);
  if (!panel) return;
  const r = panel.getBoundingClientRect();
  if (!r.width || !r.height) return;
  // 좌표계 실측 확정(probe-coord): gBCR·이벤트 clientX·elementFromPoint 전부 같은 시각 좌표계(zoom 기반영).
  //   ×zoom 환산 금지 — 앞선 "불일치"는 설정창 스캔인 애니(clip-path 0.26s) 중 동기 프로브가 만든 유령이었다.
  const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5;
  if (u < -0.55 || u > 0.55 || v < -0.55 || v > 0.55) return; // 패널 밖 방어
  const r2 = (u * u + v * v) / 0.5; // 필터 맵과 동일 정규화(코너≈1)
  const dx = k * r.width * u * r2, dy = k * r.height * v * r2;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return; // 중앙부 — 보정 무의미
  const el2 = document.elementFromPoint(e.clientX + dx, e.clientY + dy);
  // el2가 타깃의 조상이면 버블링이 이미 커버 — 재조준 무의미. 반대로 el2가 타깃의 '자손'(컨테이너→버튼)은
  //   재조준해야 하는 정확한 케이스라 걸러선 안 된다(probe-bulge3에서 검거된 가드 과잉).
  if (!el2 || el2 === e.target || el2.contains(e.target) || !panel.contains(el2)) return;
  e.stopPropagation(); e.preventDefault();
  const e2 = new MouseEvent(e.type, { bubbles: true, cancelable: true, view: window,
    clientX: e.clientX + dx, clientY: e.clientY + dy, button: e.button });
  e2.__bulged = true;
  el2.dispatchEvent(e2);
}
document.addEventListener('click', bulgeRetarget, true);
document.addEventListener('pointerdown', bulgeRetarget, true);

// 언어 전환 등 재로딩 전 암전 — 재로딩된 페이지는 인라인 스타일로 이미 암전 상태에서 시작 (index.html)
function reloadWithVeil() {
  const veil = $('fade-veil');
  if (veil) {
    veil.style.transition = 'opacity .3s ease';
    veil.style.pointerEvents = 'auto';
    veil.style.opacity = '1';
  }
  setTimeout(() => location.reload(), 320);
}
// v2.4: 저사양 모드 — 그림자맵 끄기 + 날씨 파티클 drawRange 50%
function weatherDrawCount(type) {
  const W = WEATHERS[type];
  if (!W || !W.count) return 0;
  return opts.lowSpec ? Math.round(W.count * 0.5) : W.count;
}
function applyLowSpec() {
  renderer.shadowMap.enabled = !opts.lowSpec;
  shadowDirty();
  if (weather.pts.visible) weather.pts.geometry.setDrawRange(0, weatherDrawCount(weather.type));
}
// 자동 진행 체크박스는 index.html 정적 마크업(#opt-autoplay, #autoplay-row)으로 이전됨 (P2-b)
function refreshAutoplayLock() {
  const cb = $('opt-autoplay');
  const locked = !isZen() && state.day < 10;
  if (cb) cb.disabled = locked;
  const row = $('autoplay-row');
  if (row) row.title = locked ? t('opt.autoplay.locked') : t('opt.autoplay.title');
  if (locked && opts.autoPlay) { opts.autoPlay = false; if (cb) cb.checked = false; }
  syncAutoBtn();
}
// P2-b: cam-ctrl의 자동진행 토글 버튼 상태 동기화 (켜짐 → .primary 하이라이트)
function syncAutoBtn() {
  const b = $('btn-auto');
  if (b) b.classList.toggle('primary', !!opts.autoPlay);
}
// v0.9.2 배치 모드 토글
function toggleEditMode(force) {
  editMode = force === undefined ? !editMode : !!force;
  const b = $('btn-edit');
  if (b) b.classList.toggle('primary', editMode);
  // 하단 인벤토리 바는 배치 모드 전용 (CSS: body:not(.edit-mode) #toolbar 숨김)
  document.body.classList.toggle('edit-mode', editMode);
  if (editMode) {
    toast(t('edit.on'));
  } else {
    toast(t('edit.off'));
    deselect(); // 모드 해제 시 선택 해제
  }
}
function applyOpts() {
  $('opt-pixel').value = opts.pixel; $('opt-quant').checked = opts.quant;
  $('opt-dither').checked = opts.dither; $('opt-ceil').checked = opts.ceil;
  { const eda = $('opt-ditheramt'); if (eda) eda.value = String(opts.ditherAmt != null ? opts.ditherAmt : 1); }
  { const eaa = $('opt-aa'); if (eaa) eaa.checked = opts.aa !== false; }
  // CRT 패널 볼록(창=브라운관, 디렉터 2026-07-22): 강 기본·옵션 하향. lowSpec=필터 비용 미실측이라 강제 off.
  { const ecb2 = $('opt-crtbulge'); if (ecb2) ecb2.value = String(opts.crtBulge != null ? opts.crtBulge : 2); }
  { const bl = opts.lowSpec ? 0 : (opts.crtBulge != null ? opts.crtBulge : 2);
    document.body.classList.toggle('crt-bulge1', bl === 1);
    document.body.classList.toggle('crt-bulge2', bl === 2); }
  $('opt-autoeat').checked = opts.autoEat !== false;
  $('opt-autoplay').checked = !!opts.autoPlay;
  { const cc = $('opt-confirmactions'); if (cc) cc.checked = !!opts.confirmActions; } // #2
  refreshAutoplayLock();
  $('opt-lang').value = opts.lang || 'ko';
  $('opt-fps').value = String(opts.fpsCap || 60);
  $('opt-lowspec').checked = !!opts.lowSpec;
  $('opt-bgidle').checked = opts.bgIdle !== false;
  // 접근성 (REQ-ACC-01) UI 동기화
  const ef = $('opt-fontscale'); if (ef) ef.value = String(opts.fontScale || 1);
  const ecb = $('opt-colorblind'); if (ecb) ecb.checked = !!opts.colorblind;
  const erm = $('opt-reducemotion'); if (erm) erm.checked = !!opts.reduceMotion;
  // 모바일에선 항상 백그라운드 오디오를 끄므로(위 visibilitychange 참고) 옵션 자체를 숨긴다 (데스크톱 위젯 전용 옵션)
  const bgidleRow = $('bgidle-row'); if (bgidleRow) bgidleRow.style.display = isMobileEnv ? 'none' : '';
  postMat.uniforms.uQuant.value = opts.quant ? 1 : 0;
  postMat.uniforms.uDither.value = opts.dither ? 1 : 0;
  postMat.uniforms.uDitherAmt.value = (opts.ditherAmt != null ? opts.ditherAmt : 1);
  postMat.uniforms.uPalOn.value = (opts.palette !== false) ? 1 : 0; // 마스터 팔레트 스냅 토글
  // 퀄업 A1 정식 편입: 발광 블룸 강도 0.4 = 디렉터 확정(2026-07-23, 시안 0/0.35/0.7 판정)
  postMat.uniforms.uBloom.value = (opts.bloom !== false) ? 0.4 : 0;
  { const eb = $('opt-bloom'); if (eb) eb.checked = opts.bloom !== false; }
  ceilLight.visible = opts.ceil;
  shadowDirty();
  makeRT();
  applyPdaTex(); // PDA 하우징 텍스처를 새 픽셀 설정에 재연동 (디렉터 2026-07-19)
  applyLowSpec();
  applyAccessibility();
}
// ── PDA 텍스처 픽셀화 연동 (디렉터: "PDA도 게임 픽셀 설정 따라, 옵션값보다 조금 더 강하게") ──
//   게임은 innerWidth/opts.pixel로 렌더(텍셀=opts.pixel px). PDA 하우징도 같은 배수(+부스트)로
//   다운샘플·40색 양자화(액센트 보존)한 프리베이크 픽셀본을 물려 도트 크기를 세계와 일치시킨다.
//   #pda는 image-rendering:pixelated라 저해상 픽셀본을 CSS가 크리스프하게 확대한다. (도크는 표시크기 맞춤 필요 — 후속)
function pdaTexUrl(base) {
  const BOOST = 2;                 // PDA는 옵션보다 이만큼 더 강하게 (최대치에서도 안 뭉개짐 실측)
  const px = (opts.pixel | 0);
  if (opts.quant === false || px <= 1) return `img/ui/${base}.png`; // 픽셀화 off → 원본 트루컬러
  const f = Math.max(3, Math.min(8, px + BOOST));                   // 프리베이크 범위 px3~px8
  return `img/ui/${base}_px${f}.png`;
}
function applyPdaTex() {
  const px = (opts.pixel | 0);
  const pixed = !(opts.quant === false || px <= 1); // 픽셀화 활성 여부
  // #222(디렉터 07-23): 하우징 = 원본 리얼컬러(갈색 pda04*) 복원 — "에셋의 원래 색이 왜 초록색이 됐느냐".
  //   07-20 듀오톤 퇴역 결정(pda04m*)을 대체한다. 듀오톤 프리베이크는 유물로 잔류(재사용 금지 아님, 미사용일 뿐).
  const p = $('pda'); if (p) p.style.backgroundImage = `url('${pdaTexUrl('pda04')}')`;
  const d = $('dock-pda');
  if (d) {
    // 도크는 53px 초소형 → 세계 텍셀 크기(opts.pixel px)를 그대로 맞추면 소스가 ~18px로 뭉갠다.
    //   대신 표시크기에 맞는 고정 픽셀본(px8, 47w)을 pixelated로 살짝 업스케일해 "크리스프 도트"만 확보
    //   (스무스 트루컬러의 AI티 제거 = 색상수 40 + 하드 엣지). 원본은 스무스 다운스케일 유지.
    d.style.backgroundImage = `url('img/ui/${pixed ? 'dock_pda_px8' : 'dock_pda'}.png')`; // #222: 도크도 원본 리얼컬러
    d.style.imageRendering = pixed ? 'pixelated' : 'auto';
  }
}
// 접근성 body 클래스 + 폰트 배율 반영 (REQ-ACC-01). 게임 3D는 불변 — CSS 오버라이드/폰트만.
function applyAccessibility() {
  document.body.classList.toggle('cb-mode', !!opts.colorblind);
  document.body.classList.toggle('reduce-motion', !!opts.reduceMotion);
  // fontScale → --uiz 재계산. 단, 부팅 중(첫 applyOpts) UI 스케일 상수 TDZ 이전엔 건너뛴다.
  // 부팅 경로는 이후 onResize→updateUiScale이 fontScale까지 반영하므로 손실 없음.
  try { updateUiScale(); } catch (e) { /* 부팅 TDZ — onResize가 곧 재적용 */ }
}
// opt-* 컨트롤 배선은 ui/settings.js bindControls로 이관. bgm/syncBgm/syncSfxAmbience 정의 이후 아래에서 _settingsUI.bindControls(...) 1회 호출(TDZ 회피).

/* ============================================================
   위젯 모드 (Electron 전용) — window.nineWidget (preload contextBridge)
   설정은 슬롯 세이브와 분리해 localStorage('nw-widget')에 저장 (기기 종속).
============================================================ */
(function initWidgetMode() {
  const api = window.nineWidget;
  const section = $('widget-section');
  if (!api || !api.available) {
    if (section) section.style.display = 'none';
    return; // 웹/모바일: 섹션 숨김, 아래 로직 전부 skip
  }
  if (section) section.style.display = 'block';

  // ── 디스플레이 모드/해상도 (Electron 전용, #42) ──
  // 주의: Chromium엔 배타적 전체화면이 없어 fullscreen과 borderless는 동일 동작(라벨만 관례상 구분).
  {
    const dsec = $('display-section');
    if (dsec) dsec.style.display = 'block';
    const RES_PRESETS = [
      [1152, 768], [1366, 768], [1440, 900], [1600, 900], [1440, 960], [1680, 1050],
      [1920, 1080], [2048, 1080], [1920, 1200], [2560, 1080], [2560, 1440], [3840, 2160],
    ];
    const DKEY = 'nw-display';
    let dopts = { mode: 'windowed', w: 1280, h: 800 };
    try { Object.assign(dopts, JSON.parse(localStorage.getItem(DKEY) || '{}')); } catch (e) { /* */ }
    const elMode = $('opt-dispmode');
    const elRes = $('opt-dispres');
    if (elMode && elRes) {
      elRes.innerHTML = RES_PRESETS.map(([w, h]) => `<option value="${w}x${h}">${w} × ${h}</option>`).join('');
      // 저장값이 프리셋에 없으면(기본 1280x800 등) 가장 가까운 프리셋으로 표시만 맞춘다
      const cur = `${dopts.w}x${dopts.h}`;
      elRes.value = RES_PRESETS.some(([w, h]) => `${w}x${h}` === cur) ? cur : '1366x768';
      elMode.value = dopts.mode;
      const applyDisplay = () => {
        const [w, h] = elRes.value.split('x').map(Number);
        dopts = { mode: elMode.value, w, h };
        try { localStorage.setItem(DKEY, JSON.stringify(dopts)); } catch (e) { /* */ }
        api.setDisplay({ mode: dopts.mode, width: w, height: h });
        toast(t('disp.applied'));
      };
      // 게임 설정 문법: 셀렉트는 고르기만, 반영은 ✓ 적용 버튼으로 (즉시 반영은 실수 유발)
      elMode.addEventListener('change', () => { $('dispres-row').style.display = elMode.value === 'windowed' ? '' : 'none'; });
      const applyBtn = $('btn-disp-apply');
      if (applyBtn) applyBtn.addEventListener('click', applyDisplay);
      // 부팅 시 저장된 디스플레이 상태 복원 (기본값 그대로면 창 크기를 건드리지 않는다)
      $('dispres-row').style.display = dopts.mode === 'windowed' ? '' : 'none';
      if (api.setDisplay && (dopts.mode !== 'windowed' || `${dopts.w}x${dopts.h}` !== '1280x800')) {
        api.setDisplay({ mode: dopts.mode, width: dopts.w, height: dopts.h });
      }
    }
  }

  const WKEY = 'nw-widget';
  let wopts = { opacity: 1, alwaysOnTop: false, mini: false, clickThrough: false };
  try { Object.assign(wopts, JSON.parse(localStorage.getItem(WKEY) || '{}')); } catch (e) { /* */ }
  const saveWopts = () => { try { localStorage.setItem(WKEY, JSON.stringify(wopts)); } catch (e) { /* */ } };

  const elOpacity = $('opt-widget-opacity');
  const elAot = $('opt-widget-aot');
  const elMini = $('opt-widget-mini');
  const elClick = $('opt-widget-clickthrough');

  // 부팅 시 저장된 설정 복원 (클릭 통과는 안전을 위해 항상 꺼진 채로 시작)
  elOpacity.value = String(Math.round((wopts.opacity ?? 1) * 100));
  elAot.checked = !!wopts.alwaysOnTop;
  elMini.checked = !!wopts.mini;
  elClick.checked = false;
  wopts.clickThrough = false;

  api.setOpacity(wopts.opacity ?? 1);
  api.setAlwaysOnTop(!!wopts.alwaysOnTop);
  api.setMini(!!wopts.mini);
  api.setClickThrough(false);

  elOpacity.addEventListener('input', e => {
    const v = Math.min(1, Math.max(0.3, (+e.target.value || 100) / 100));
    wopts.opacity = v;
    api.setOpacity(v);
    saveWopts();
  });
  elAot.addEventListener('change', e => {
    wopts.alwaysOnTop = e.target.checked;
    api.setAlwaysOnTop(wopts.alwaysOnTop);
    saveWopts();
  });
  elMini.addEventListener('change', e => {
    wopts.mini = e.target.checked;
    api.setMini(wopts.mini);
    saveWopts();
  });

  let clickThroughTimer = null;
  elClick.addEventListener('change', async e => {
    if (e.target.checked) {
      if (!(await gameConfirm(t('widget.clickthrough.confirm'), t('confirm.enable'), t('confirm.cancel')))) { e.target.checked = false; return; }
      wopts.clickThrough = true;
      api.setClickThrough(true);
      toast(t('widget.clickthrough.toast'));
      clearTimeout(clickThroughTimer);
      clickThroughTimer = setTimeout(() => {
        wopts.clickThrough = false;
        api.setClickThrough(false);
        elClick.checked = false;
        toast(t('widget.clickthrough.restored'));
      }, 10000);
    } else {
      clearTimeout(clickThroughTimer);
      wopts.clickThrough = false;
      api.setClickThrough(false);
    }
    saveWopts(); // clickThrough 자체는 항상 false로 저장돼 다음 부팅 시 안전 시작
    wopts.clickThrough = false;
  });
})();

/* ============================================================
   BGM (v1.9) — 날씨/시간대/계절/상황 기반 OST (public/BGM/*.mp3)
   · Main_theme: 타이틀/불러오기 화면 (잔잔하게)
   · Sunny/Raining/Snowing/Gloomy: 현재 날씨 풀
   · Random1~6: 어떤 날씨든 풀에 섞임 / Random_evening: 저녁(17~21시)만
   · Winter1~2: 겨울 계절 한정 랜덤
   · Cat: 고양이 인카운터가 뜬 날 하루 종일 이것만
   · Ending: Day 10000 구조 엔딩에서만
============================================================ */
const BGM_LIB = {
  main: ['Main_theme'],
  ending: ['Ending'],
  cat: ['Cat'],
  weather: {
    clear: ['Sunny1', 'Sunny2', 'Sunny3', 'Sunny4', 'Sunny5', 'Sunny6', 'Sunny7'],
    rain: ['Raining1', 'Raining2', 'Raining3', 'Raining4', 'Raining5', 'Raining6', 'Raining7', 'Raining8'],
    snow: ['Snowing1', 'Snowing2', 'Snowing3', 'Snowing5', 'Snowing6'],
    ash: ['Gloomy1', 'Gloomy2', 'Gloomy3', 'Gloomy4', 'Gloomy5'],
  },
  random: ['Random1', 'Random2', 'Random3', 'Random4', 'Random6'],
  evening: ['Random_evening'],
  winter: ['Winter1', 'Winter2'],
};
const bgm = new Audio();
bgm.preload = 'auto';
let bgmCtxKey = '', bgmTrack = '', bgmErrorShown = false;
bgm.addEventListener('error', () => {
  if (opts.bgm && !bgmErrorShown) { bgmErrorShown = true; toast(t('bgm.notFound')); }
});
function isEveningHour() { const h = gameHour(); return h >= 17 && h < 21; }
function bgmContext() {
  if (endingActive) return { key: 'ending', pool: BGM_LIB.ending, loop: true, vol: 1 };
  if (titleVisible) return { key: 'title', pool: BGM_LIB.main, loop: true, vol: 0.55 }; // 잔잔하게
  if (state.catMusicDay && state.catMusicDay === state.day)
    return { key: 'cat', pool: BGM_LIB.cat, loop: true, vol: 1 }; // 그날 하루 종일
  // storm은 rain 풀을 그대로 사용
  const wpool = BGM_LIB.weather[weather.type === 'storm' ? 'rain' : weather.type] || BGM_LIB.weather.clear;
  let pool = [...wpool, ...BGM_LIB.random];
  if (isEveningHour()) pool = pool.concat(BGM_LIB.evening);
  if (seasonOf().id === 'winter') pool = pool.concat(BGM_LIB.winter);
  return { key: `w:${weather.type}|e:${isEveningHour() ? 1 : 0}|s:${seasonOf().id}`, pool, loop: false, vol: 1 };
}
/* ── BGM 트랜지션 규칙 (v2.8)
 *  · 일반 컨텍스트 변화(날씨/저녁/계절): 지금 곡은 끝까지 재생 → 곡 말미 3초 페이드아웃
 *    → 다음 곡(새 풀에서)이 페이드인. 곡 중간에 뚝 끊지 않는다.
 *  · 특수 컨텍스트(타이틀/고양이 날/엔딩) 진입·이탈: 0.9초 페이드아웃 후 즉시 전환(페이드인).
 */
let bgmFadeTimer = null, bgmTail = false;
function bgmTargetVol(ctx) { return (opts.bgmVol ?? 0.15) * ctx.vol; }
function bgmFade(to, ms, done) {
  clearInterval(bgmFadeTimer);
  const from = bgm.volume, t0 = performance.now();
  bgmFadeTimer = setInterval(() => {
    const u = Math.min(1, (performance.now() - t0) / ms);
    bgm.volume = from + (to - from) * u;
    if (u >= 1) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; if (done) done(); }
  }, 50);
}
function playBgmTrack(name, ctx, fadeIn = true) {
  bgmTrack = name;
  bgmTail = false;
  bgm.loop = ctx.loop;
  bgm.src = `BGM/${name}.mp3`;
  bgm.volume = fadeIn ? 0 : bgmTargetVol(ctx);
  if (opts.bgm) bgm.play().catch(() => { /* 사용자 제스처 대기 (자동재생 정책) */ });
  if (fadeIn) bgmFade(bgmTargetVol(ctx), 1600);
}
function pickBgmTrack(ctx) {
  const cands = ctx.pool.filter(n => n !== bgmTrack);
  return cands.length ? cands[Math.floor(Math.random() * cands.length)] : ctx.pool[0];
}
const BGM_SPECIAL = key => key === 'title' || key === 'cat' || key === 'ending';
function syncBgm(forcePlay = false) {
  const ctx = bgmContext();
  if (ctx.key !== bgmCtxKey) {
    const crossNow = BGM_SPECIAL(ctx.key) || BGM_SPECIAL(bgmCtxKey) || bgm.paused || !bgm.src;
    bgmCtxKey = ctx.key;
    if (crossNow) bgmFade(0, 900, () => playBgmTrack(pickBgmTrack(ctx), ctx));
    // 일반 변화는 여기서 곡을 끊지 않는다 — ended 시점에 새 풀로 넘어간다
  } else if (!bgmFadeTimer && !bgmTail) {
    bgm.volume = bgmTargetVol(ctx); // 음량 슬라이더 즉시 반영
    if (forcePlay && opts.bgm && bgm.paused && bgm.src) bgm.play().catch(() => {});
  }
}
// 곡 자연 종료 → 현재 컨텍스트 풀에서 다음 곡 페이드인
bgm.addEventListener('ended', () => {
  const ctx = bgmContext();
  bgmCtxKey = ctx.key;
  playBgmTrack(pickBgmTrack(ctx), ctx);
});
// 곡 말미 3초 페이드아웃 (루프 곡 제외)
bgm.addEventListener('timeupdate', () => {
  if (bgm.loop || !bgm.duration || bgmFadeTimer) return;
  const remain = bgm.duration - bgm.currentTime;
  if (remain < 3) {
    bgmTail = true;
    bgm.volume = bgmTargetVol(bgmContext()) * Math.max(0, remain / 3);
  } else bgmTail = false;
});
// 셸터별 빗소리 앰비언스 (지역 재질감 반영) — storm은 셸터 무관 rain_heavy로 통일
const RAIN_AMB = {
  container: 'rain_roof', bunker: 'rain_roof', ship: 'rain_roof', lighthouse: 'rain_roof',
  rooftop: 'rain_city',
  cabin: 'rain_forest', greenhouse: 'rain_forest',
  bus: 'rain_road',
};
/* ── SFX 앰비언스/난로 상태 동기화 (날씨·실내·가구 상태 → 루프 채널) ── */
function syncSfxAmbience() {
  if (titleVisible || endingActive) { setAmbience(null); setFire(false); setSeasonAmbience(null); return; }
  const indoorSh = !!SHELTERS[state.current]?.indoor;
  let calmOutdoor = false; // 맑은 날 실외 = 계절 앰비언스가 깔릴 수 있는 조건
  // 날씨발 앰비언스 전환은 긴 페이드(#83) — 루프가 뚝 시작/종료하는 "이상한 소리" 원천 제거
  const wf = WEATHER_AMB_FADE;
  if (indoorSh) {
    setAmbience(null, undefined, wf);
  } else if (weather.type === 'storm') {
    setAmbience('rain_heavy', undefined, wf);
  } else if (weather.type === 'rain') {
    setAmbience(RAIN_AMB[state.current] || 'rain_roof', undefined, wf);
  } else if (weather.type === 'snow') {
    setAmbience('amb_wind', undefined, wf);
  } else if (weather.type === 'ash') {
    setAmbience('amb_wind', undefined, wf); // 재(灰) 날씨는 별도 루프가 없어 바람 앰비언스로 간이 처리
  } else {
    setAmbience(null, undefined, wf);
    calmOutdoor = true;
  }
  // 계절 앰비언스(#13): 맑은 날 실외에서만 계절 배경음(봄새/여름벌레/가을바람/겨울삭풍).
  // 실내이거나 날씨 루프가 이미 깔린 경우엔 계절음을 끈다(중첩 방지).
  setSeasonAmbience(calmOutdoor ? seasonOf().id : null);
  // v0.9.1: 캔들/랜턴은 타닥거리는 fire 루프에서 제외 — 장작 난로(stove)만 fire 루프 재생.
  // 캔들 전용 타닥 소리는 사용자 파일 제공 시 별도 채널로 추가 예정.
  const fireOn = items.some(it => it.defId === 'stove' && it.on !== false);
  setFire(fireOn);
}
// #210 설정 컨트롤 배선: bgm/syncBgm/syncSfxAmbience 등 정의 완료 후 1회 주입(TDZ 회피).
_settingsUI.bindControls({ applyOpts, applyLowSpec, applyAccessibility, syncAutoBtn, syncBgm, syncSfxAmbience, scheduleSave, flushSave, gameConfirm, reloadWithVeil, toast, bgm });
// 모바일 대응: 재생은 반드시 사용자 제스처 안에서 시작 (자동재생 정책)
$('bgm-row').style.display = 'flex';
$('opt-bgm').checked = !!opts.bgm;
$('opt-bgmvol').value = Math.round((opts.bgmVol ?? 0.15) * 100);
$('opt-sfxvol').value = Math.round((opts.sfxVol ?? 0.07) * 100);
// 자동재생이 거부돼 멈춰 있으면 다음 입력에서 재개 (상시)
addEventListener('pointerdown', () => { if (!siloActive && opts.bgm && bgm.paused) syncBgm(true); }); // §9.6: 사일로 시퀀스 중엔 침묵 유지(자동재개 금지)
// SFX AudioContext도 사용자 제스처 없이는 시작 불가 — 같은 첫 pointerdown에서 초기화
initSfx();
setSfxVol(opts.sfxVol ?? 0.07);
$('opt-bgm').addEventListener('change', e => {
  opts.bgm = e.target.checked;
  if (opts.bgm) syncBgm(true); // change 이벤트 = 사용자 제스처 → 모바일에서도 재생 허용
  else bgm.pause();
  scheduleSave();
});
$('opt-bgmvol').addEventListener('input', e => {
  opts.bgmVol = (+e.target.value) / 100;
  syncBgm();
  scheduleSave();
});
$('opt-sfxvol').addEventListener('input', e => {
  opts.sfxVol = (+e.target.value) / 100;
  setSfxVol(opts.sfxVol);
  scheduleSave();
});

/* ============================================================
   시작 & 메인 루프
============================================================ */
let _firstLaunch = false; // 세이브·nw-opts 둘 다 없음 = 진짜 최초 실행 (언어 자동감지 대상)
if (!loadSave()) {
  // P1-A: 세이브가 없는 첫 실행 — 타이틀에서 골랐던 전역 옵션(언어/음량)을 승계
  try {
    const raw = localStorage.getItem('nw-opts');
    if (raw) {
      Object.assign(opts, JSON.parse(raw));
      if (opts.sfxVol === 0.7) opts.sfxVol = 0.07;   // 구 기본값 하향 마이그레이션
      if (opts.bgmVol === 0.35) opts.bgmVol = 0.15;
    } else {
      _firstLaunch = true; // nw-opts 자체가 없음 → 언어를 고른 적 없는 최초 실행
    }
  } catch (e) { /* 손상된 nw-opts 무시 */ }
}
// #34 Steam 언어 연동: 유저가 언어를 고른 적 없으면(첫 실행) Steam 클라이언트 언어 → OS/브라우저 언어 순으로 추정.
//   명시 선택(opts.lang)이 항상 우선이고, 자동값은 저장하지 않는다 — 이후 Steam 언어를 바꾸면 따라간다.
const autoLang = (() => {
  const m = steamLangToGame(window.nineSteam && window.nineSteam.lang);
  if (m) return m;
  const os = (navigator.language || '').toLowerCase();
  return os.startsWith('ko') ? 'ko' : (os.startsWith('ja') ? 'ja' : 'en');
})();
// #34 완결: opts.lang 기본값 'ko'가 항상 truthy라 autoLang이 fresh install에서 도달 못 하던 데드패스 상환.
//   최초 실행에만 자동 언어 적용(웹 데모=브라우저 언어·Steam=클라이언트 언어). 복귀 유저(세이브 opts.lang)·명시 선택은 불변.
//   __ITCH__(데모 브랜치 국제판)는 영어 강제 — 재수렴 시 안전 가드.
if (_firstLaunch) opts.lang = (typeof __ITCH__ !== 'undefined' && __ITCH__) ? 'en' : autoLang;
setLang(opts.lang || autoLang);   // 세이브된 언어 > Steam/OS 추정
// i18n 누수 봉합(디렉터 신고 2026-07-19): dayLog.notes는 t() 해석 결과 '문자열'이라 세이브에 굳는다
//   → 언어 바꿔 리로드하면 옛 언어 노트가 그대로 뜬다(예: EN 모드인데 로그만 한국어). 당일 로그는
//   휘발성(매 아침 리셋)이라, 로드된 로그의 작성 언어(dayLog.lang)가 현재와 다르면 비워 새 언어로 다시 쌓는다.
if (state.dayLog && state.dayLog.lang && state.dayLog.lang !== lang) state.dayLog.notes = [];
if (state.dayLog) state.dayLog.lang = lang;
// 같은 원인의 memoir 소누수: pending 페이지의 cat/closing도 해석문자열. pending은 봄 첫 아침 1회 표시라,
//   작성 언어(page.lang)가 다른 페이지는 드롭한다(다음 겨울 페이지부터 새 언어로 정상 생성).
if (Array.isArray(state.pendingWinterMemoir)) state.pendingWinterMemoir = state.pendingWinterMemoir.filter(p => !(p && p.lang && p.lang !== lang));
applyLocaleOverrides();       // 설치본 locales/*.json 유저 편집분 병합 (Electron 동기 — 렌더 전, 플래시 없음)
applyStaticI18n();            // index.html 정적 텍스트 치환
// 카메라 열 버튼: 브라우저 네이티브 툴팁(title) 대신 게임 스타일 좌측 라벨(::before, data-label).
// PC=호버 시 표시, 모바일=호버가 없으니 퀘스트 유도(pulse) 중에만 상시 표시 + 토글 토스트가 보조.
for (const b of document.querySelectorAll('#cam-ctrl .cam-btn, #btn-gear')) { // 편집은 명령 바 편성(자체 라벨) — 커스텀 라벨 대상 제외 (재배치 2차)
  if (b.title) { b.dataset.label = b.title; b.removeAttribute('title'); }
}
loadShelter(state.current);
renderInventoryBar();
renderResBar();
renderExpPanel();
applyOpts();
updateHud();
updateClock();
renderQuestCard();
// ── 커스텀 플로팅 툴팁(data-tip) — 네이티브 title("웹페이지처럼" 신고) 대체 ──
//   문서 위임 mouseover/out. body 포탈(#game-tip)이라 .panel{overflow:hidden}에 안 잘림.
//   body는 zoom 미적용 → getBoundingClientRect(visual px) 그대로 fixed 배치(줌 보정 불요).
(function initGameTip() {
  if (typeof document === 'undefined') return;
  let tip = null, cur = null;
  const ensure = () => { if (!tip) { tip = document.createElement('div'); tip.id = 'game-tip'; document.body.appendChild(tip); } return tip; };
  const hide = () => { if (tip) tip.style.display = 'none'; cur = null; };
  const show = (el) => {
    const txt = el.getAttribute('data-tip');
    if (!txt) { hide(); return; }
    const t = ensure(); t.textContent = txt; t.style.display = 'block';
    const r = el.getBoundingClientRect(), tr = t.getBoundingClientRect();
    let x = r.left + r.width / 2 - tr.width / 2;
    x = Math.max(6, Math.min(x, window.innerWidth - tr.width - 6));
    let y = r.top - tr.height - 8;
    if (y < 6) y = r.bottom + 8;               // 위 공간 부족 시 아래로
    t.style.left = Math.round(x) + 'px';
    t.style.top = Math.round(y) + 'px';
  };
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el && el !== cur) { cur = el; show(el); }
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) hide();
  });
  document.addEventListener('mousedown', hide, true); // 클릭(모달 열림 등) 시 즉시 숨김
})();
// ── 웹 잔재 차단(렌더러 측 — 2026-07-23 전수 감사, Electron·PWA 공통) ──
//   본체는 웹앱이라 브라우저 기본 동작이 그대로 새어 나온다. 이미 막힌 것(user-select·img user-drag·
//   캔버스 우클릭)외 잔여 3종을 여기서 끊는다. main.cjs의 메뉴 제거·will-navigate 가드와 한 쌍.
// ① 파일 드롭 = "문서 열기" 기본값 차단 — 복사 커서·게임 이탈 시도 자체를 없앤다(메인 가드와 이중벽).
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => e.preventDefault());
// ② Ctrl+휠 = 브라우저 페이지 줌 차단 — 픽셀 스냅이 깨지고 카메라 줌(무보조 휠)과 혼선. 캡처는 안 막으므로 게임 휠 줌은 그대로.
window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false, capture: true });
// ③ 가운데 클릭 오토스크롤 위젯 차단 — 스크롤 가능한 모달(PDA 등) 위에서 브라우저 팬 커서가 떴다.
document.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });
// 웹: 설치본 fetch로 loose locales 병합(비동기 베스트에포트) — 적용되면 화면 재치환. (Electron은 위 applyLocaleOverrides 동기 처리)
loadLocaleOverridesWeb().then(a => { if (a) { applyStaticI18n(); updateHud(); renderResBar(); renderQuestCard(); } });
if (state.minimizedEvent && EVENTS[state.minimizedEvent]) showEventChip(state.minimizedEvent); // 로드 후 내려둔 이벤트 칩 복원
$('btn-clean').addEventListener('click', cleanShelter);
$('btn-wardrobe').addEventListener('click', () => pdaOpenApp(openWardrobeModal)); // #86④ · #199 5차-d: 옷장도 PDA 앱
$('btn-edit').addEventListener('click', () => toggleEditMode());
$('btn-pause').addEventListener('click', () => setPaused(!paused));
// 배속 조정기(디렉터): 1×→2×→4× 순환. 엔딩 1회 후(또는 QA 치트) 해금 시에만 노출·작동. 파밍·게임시계만 가속.
function updateSpeedBtn() {
  const b = $('btn-speed'); if (!b) return;
  const unlocked = speedUnlocked();
  b.style.display = unlocked ? '' : 'none';
  if (unlocked) b.textContent = activeSpeedMult() + '×'; // ×
}
$('btn-speed').addEventListener('click', () => {
  if (!speedUnlocked()) return;
  const i = SPEED_STEPS.indexOf(SPEED_STEPS.includes(state.speedX) ? state.speedX : 1);
  state.speedX = SPEED_STEPS[(i + 1) % SPEED_STEPS.length];
  updateSpeedBtn();
  toast('×' + state.speedX);
  scheduleSave && scheduleSave();
});
// P2-b: 자동 진행 토글 버튼 (cam-ctrl) — Day 10 미만이면 잠금 토스트, 아니면 opts.autoPlay 토글 + 체크박스 양방향 동기화
$('btn-auto').addEventListener('click', () => {
  if (!isZen() && state.day < 10) { toast(t('auto.locked')); return; }
  opts.autoPlay = !opts.autoPlay;
  const cb = $('opt-autoplay'); if (cb) cb.checked = opts.autoPlay;
  syncAutoBtn();
  scheduleSave();
  toast(t(opts.autoPlay ? 'auto.on' : 'auto.off'));
});
syncAutoBtn();
$('btn-craft').addEventListener('click', () => pdaOpenApp(openCraftModal)); // #199 5차-c: 제작은 PDA 앱으로 열린다
{ const bk = $('btn-knowledge'); if (bk) bk.addEventListener('click', () => pdaOpenApp(openKnowledgeModal)); } // #199 5차-d: 지식도 PDA 앱
// #211: 그리드의 btn-journal 폐지 — #199에서 이미 display:none으로 죽여둔 문이었다(진입은 PDA 기록 탭).
$('g-hunger').addEventListener('click', eatFood);
$('g-thirst').addEventListener('click', drinkWater);
$('g-energy').addEventListener('click', () => promptSleep());
// #199 5차-b: 청결 게이지 카드 제거(디렉터 — 경고 형식으로) → 청소 진입은 액션 그리드 버튼만
$('btn-sleep').addEventListener('click', () => promptSleep());
$('btn-cancel-place').addEventListener('click', () => cancelPlacing());
// #199 우측 엣지 도킹: PDA 토글 + PDA 하드웨어 히트(에셋 버튼 자리)
// 에셋 하우징은 JS 인라인 — CSS url()은 번들 후 /assets/ 기준으로 풀려 file://에서 깨진다(스타일시트 709행 교훈)
// #211(디렉터 "일지 그냥 PDA에 통합. UI 망가지고 오히려 AI 티 나더라"): 필드노트 기기 폐지.
//   두 기기가 같은 데이터를 나눠 갖고 있었다(기록·자원·날씨·결핍 중복 + 노트의 '일지' 탭은 모달 링크였다).
//   기기가 늘어난 게 원인이라 기기를 줄인다 — 우측 도킹은 PDA 하나.
applyPdaTex(); // #pda·도크 하우징 = 픽셀 설정 연동 (pdaTexUrl — applyOpts에서도 재호출)
$('dock-pda').addEventListener('click', () => pdaVisible() ? pdaClose() : pdaOpen());
$('pda-back').addEventListener('pointerdown', e => { if (e.target.id === 'pda-back') pdaClose(); });
document.querySelectorAll('#pda-tabs .pda-tab').forEach(b =>
  b.addEventListener('click', () => { pdaTab = b.dataset.tab; renderPDA(); }));
// 기기 하드웨어 문법: 뒤로(⏎)=닫기, D-패드 ◀▶=탭 순환·▲▼=화면 스크롤, 확인(✓)=재조회
{
  const PDA_TABS = ['status', 'res', 'map', 'log'];
  const step = dir => { const i = PDA_TABS.indexOf(pdaTab); pdaTab = PDA_TABS[(i + dir + 4) % 4]; renderPDA(); };
  document.querySelectorAll('#pda .dp').forEach(b => b.addEventListener('click', () => {
    const d = b.dataset.d;
    if (d === 'left') step(-1);
    else if (d === 'right') step(1);
    else $('pda-screen').scrollBy({ top: d === 'up' ? -120 : 120, behavior: 'smooth' });
  }));
  $('pda-hit-back').addEventListener('click', () => {
    // 앱 모드(제작·이주 등 좌측 메뉴로 진입)면 앱만 닫고 PDA 홈으로 — 인벤 조회 가능. 홈에서면 PDA 닫기.
    if (pdaAppOn) { $('modal-back').classList.remove('show'); pdaAppExit(true); }
    else pdaClose();
  });
  $('pda-hit-ok').addEventListener('click', () => renderPDA());
}
// 온스크린 카메라 컨트롤 (모바일/데스크톱 공용)
$('cam-rotl').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw -= Math.PI / 2; }); // v1.5.1: 90° 스텝 — 정면 T자 원천 차단
$('cam-rotr').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw += Math.PI / 2; });
$('cam-zin').addEventListener('click', () => { exitCatCloseup(); camState.zoom = THREE.MathUtils.clamp(camState.zoom * 1.25, 0.25, 3.2); });
$('cam-zout').addEventListener('click', () => { exitCatCloseup(); camState.zoom = THREE.MathUtils.clamp(camState.zoom * 0.8, 0.25, 3.2); });
$('cam-home').addEventListener('click', () => { exitCatCloseup(); camState.targetYaw = Math.PI / 4; setPanTarget(0, 0); fitZoomForShelter(); }); // #70: 홈 복귀에 팬 0,0 리셋 포함
// 게임 UI 숨김 토글 (디렉터 UI 재배치): 게임플레이 패널만 숨기고 카메라 조작/편집은 유지. 배경화면 모드와 별개의 인게임 뷰 정리.
{ const uib = $('btn-ui-toggle'); if (uib) uib.addEventListener('click', () => { const hid = document.body.classList.toggle('ui-hidden'); uib.classList.toggle('primary', hid); toast(t(hid ? 'ui.hidden' : 'ui.shown')); }); }
// ── 스크린샷 모드 (디렉터 2026-07-24): 화면의 모든 UI를 걷고 자유롭게 구도를 잡아 고해상 PNG로 담는다.
//    F2 토글 · Space/Enter 촬영 · Esc 나가기 · Q/E 시점 회전. 드래그 팬·휠 줌은 캔버스가 계속 받는다.
//    Electron은 창을 통째 캡처(webContents.capturePage)해 사진 폴더에 저장, 웹은 WebGL 캔버스 PNG를 다운로드.
let photoMode = false;
function setPhotoMode(on) {
  on = !!on;
  if (on === photoMode) return;
  if (on) { // 열기 전 떠 있는 것 정리 — 깨끗한 캔버스만 남긴다
    if (typeof pdaVisible === 'function' && pdaVisible()) pdaClose();
    if (typeof settingsOpen === 'function' && settingsOpen()) closeSettings();
    if (catCam && catCam.active) exitCatCloseup();
    if (placing) cancelPlacing();
    if (selected) deselect();
  }
  photoMode = on;
  document.body.classList.toggle('photo-mode', on);
  const pb = $('btn-photo'); if (pb) pb.classList.toggle('primary', on);
  if (on) toast(t('photo.enter'));
}
function togglePhotoMode() { setPhotoMode(!photoMode); }
async function capturePhoto() {
  if (!photoMode) return;
  document.body.classList.add('photo-capturing'); // 바·커서를 프레임에서 제거
  let res = null;
  try {
    if (window.nineWidget && window.nineWidget.available && window.nineWidget.capture) {
      // Electron: 바가 확실히 사라진 프레임이 합성된 뒤 창을 캡처 (2 프레임 대기)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      res = await window.nineWidget.capture();
    } else {
      // 웹: WebGL 캔버스를 즉시 렌더한 뒤 같은 틱에 PNG 판독(preserveDrawingBuffer 없이도 유효)
      renderFrame();
      const canvas = renderer.domElement;
      const d = new Date(), p = n => String(n).padStart(2, '0');
      const fn = `nine-winters-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
      const a = document.createElement('a'); a.download = fn; a.href = canvas.toDataURL('image/png'); a.click();
      res = { ok: true, web: true };
    }
  } catch (e) { res = { ok: false }; }
  document.body.classList.remove('photo-capturing');
  // 캡처 이후에만 셔터 플래시(피드백) — 캡처 프레임엔 안 들어간다
  const fl = document.createElement('div'); fl.className = 'photo-flash'; document.body.appendChild(fl);
  setTimeout(() => fl.remove(), 520);
  if (res && res.ok) toast(res.path ? (t('photo.saved') + ' — ' + res.path) : t('photo.saved'));
  else toast(t('photo.fail'));
}
{ const pb = $('btn-photo'); if (pb) pb.addEventListener('click', () => togglePhotoMode()); }
{ const ps = $('photo-shot'); if (ps) ps.addEventListener('click', () => capturePhoto()); }
{ const pe = $('photo-exit'); if (pe) pe.addEventListener('click', () => setPhotoMode(false)); }
{ const po = $('photo-open'); if (po) {
  if (window.nineWidget && window.nineWidget.available && window.nineWidget.revealShots) po.addEventListener('click', () => window.nineWidget.revealShots());
  else po.style.display = 'none'; // 웹: 사진 폴더 개념 없음
} }
// UI 배치 고정 토글 (디렉터 2026-07-10): 패널 드래그를 잠가 실수 이동을 원천 차단.
//   uiState.pinned에 영속(패널 위치와 같은 저장소) — 재시작해도 고정 유지. 접기(–)·숨김()은 별개.
{
  const pb = $('btn-ui-pin');
  const syncPin = () => {
    if (pb) pb.classList.toggle('primary', !!uiState.pinned);
    document.body.classList.toggle('ui-pinned', !!uiState.pinned);
  };
  if (pb) pb.addEventListener('click', () => {
    uiState.pinned = !uiState.pinned;
    saveUiState();
    syncPin();
    toast(t(uiState.pinned ? 'ui.pinned' : 'ui.unpinned'));
  });
  syncPin(); // 부팅 복원
}
// 패널 드래그/접기 활성화
makeDraggablePanel($('hud'), 'hud', t('panel.hud'));
makeDraggablePanel($('exp-panel'), 'exp', t('panel.exp'));
makeDraggablePanel($('clock-panel'), 'clock', t('panel.clock'));
makeDraggablePanel($('res-bar'), 'res', t('panel.res'));
// #52: 설정은 전용 중앙 오버레이(#settings-screen) — 시작 시 항상 닫힘. 전 경로(타이틀·ESC·톱니)가 개폐.

// UI 스케일 상수 — 아래 부팅 분기(ps-load 경로의 hideTitle→onResize→updateUiScale)보다
// 먼저 평가되어야 한다. 선언이 뒤에 있으면 불러오기 부팅이 TDZ로 죽는다.
const UI_BASE_FONT = 11;   // .panel 계열 기본 폰트 크기(px) — 이 값 자체가 이미 최소 가독 크기
const UI_MIN_FONT = 11;    // 스케일 후에도 유지해야 할 최소 렌더 폰트(px)
// P0: 전 UI 확대(가독성)를 JS에서 곱한다 — CSS zoom은 var(--uiz)만 쓰므로
// 렌더 배율과 드래그/클램프 좌표 보정 배율이 항상 동일한 단일 소스(--uiz)로 일치한다.
// v0.9.5: 1.15→1.25 — "안 보인다" 다수 피드백. cozy는 작은 글씨가 아니라 따뜻한 색에서 나온다.
const TEXT_BOOST = 1.25;

// 타이틀 / 인트로 (자리 비운 사이 끝난 탐험 정산은 hideTitle에서 — 타이틀에선 집만 보여준다)
$('t-continue').addEventListener('click', hideTitle);
// #227: 타이틀 언어 3버튼 제거(디렉터 로비 개편 오더) — 언어 변경은 설정 창 opt-lang이 유일 경로.
$('t-new').addEventListener('click', () => openSlotModal('new'));
$('t-load').addEventListener('click', () => openSlotModal('load'));
$('t-help').addEventListener('click', openHelpModal);
// 게임 종료 버튼 — Electron 데스크톱(window.close 동작)에서만 노출. 웹은 브라우저가 close를 막으므로 숨김.
// (데모 1.6.3 포팅 — preload sandbox 사망으로 nineWidget이 증발해 영구 숨김이던 결함도 main.cjs에서 함께 수정)
if (window.nineWidget && window.nineWidget.available) {
  const _q = $('t-quit');
  if (_q) { _q.style.display = ''; _q.addEventListener('click', async () => {
    if (await gameConfirm(t('title.quit.confirm'), t('title.quit'), t('confirm.cancel'))) window.close();
  }); }
}
// #52: 타이틀 — 전용 설정 오버레이 토글 (인게임과 동일 창)
$('t-settings').addEventListener('click', () => toggleSettingsPanel());
// 씬 저작 크리에이터 모드 — QA 패널/URL(?creator=1)로 진입. 인게임 editMode + __shelter 훅 재사용.
const _creatorUI = makeCreatorUI({
  setPaused, forceEditMode: (v) => toggleEditMode(v), hideTitle, loadShelter, state, SHELTERS, DEFS,
  addItem, getItems: () => items, select, deselect, getSelected: () => selected, clampToRoom,
  setHour: (h) => { state.gameMin = Math.floor(state.gameMin / 1440) * 1440 + h * 60; }, setWeather,
  spawnCat, despawnCat, getCat,
  qaPlaceCat: (x, z, mode) => { const c = getCat(); if (!c) return false; c.g.position.set(x, c.baseY || 0.05, z); c.mode = mode || 'sleep'; c.timer = 99999; c.tgt = null; c.hop = null; return true; },
  camState,
  setYaw: (rad) => { camState.yaw = camState.targetYaw = rad; },
  setPitch: (rad) => { camState.elev = THREE.MathUtils.clamp(rad, 0.05, Math.PI / 2 - 0.05); },
  setZoom: (z) => { camState.zoom = THREE.MathUtils.clamp(z, 0.2, 3.2); },
  toast,
});
// dev 진입: ?creator=1 이면 부팅 안정 후 자동 진입(하네스/디렉터 dev 편의). 배포본 URL엔 없음.
try { if (new URLSearchParams(location.search).get('creator')) setTimeout(() => _creatorUI.enter(), 900); } catch (e) { /* */ }
/* ============================================================
   QA 치트 모드 (#43) — 배포본 숨은 진입점
   진입: 타이틀 버전 표기(#title-ver) 5연타(2초 내). 인게임 미노출(타이틀에서만).
   라벨은 QA 전용이므로 한국어만 (i18n 예외).
============================================================ */
let _qaTaps = [];
$('title-ver').addEventListener('click', () => {
  if (!titleVisible) return; // 인게임/인트로에선 반응 없음
  if (DEMO_ED && !DEMO_QA_OPEN) return; // #74: 소비자 대면 데모 빌드엔 봉인(발매 전 DEMO_QA_OPEN으로 허용)
  const now = Date.now();
  _qaTaps.push(now);
  _qaTaps = _qaTaps.filter(t => now - t <= 2000); // 2초 창
  if (_qaTaps.length >= 5) { _qaTaps = []; openQaPanel(); }
});
function markQa() { state.qaUsed = true; if (typeof updateSpeedBtn === 'function') updateSpeedBtn(); } // 오염 방지 플래그(업적 해금 무시) + 배속 즉시 해금
function openQaPanel() {
  const btn = (id, label) => `<button class="pixel-btn" data-qa="${id}" style="margin:3px;font-size:11px">${label}</button>`;
  const body = `
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">QA 전용 · 사용 시 이 세이브의 신규 업적은 잠깁니다 (qaUsed)</div>
    <div style="display:flex;flex-wrap:wrap">
      ${btn('res100', '자원 전종 +100')}
      ${btn('gauges', '게이지 풀')}
      ${btn('unlockAll', '전 셸터 해금')}
      ${btn('day1', 'Day +1')}
      ${btn('day10', 'Day +10')}
      ${btn('day35', '겨울 직전(Day 35)')}
      ${btn('winter1', '겨울 +1 (낙진 시계)')}
      ${btn('visits20', '전 지역 방문 +20 (숙련)')}
      ${btn('w_clear', '날씨 맑음')}
      ${btn('w_snow', '날씨 눈')}
      ${btn('w_rain', '날씨 비')}
      ${btn('w_storm', '날씨 폭풍')}
      ${btn('w_ash', '날씨 재')}
      ${btn('coldsnap', '한파 즉시 발동')}
      ${btn('cat', '고양이 소환')}
      ${btn('questSkip', '온보딩 스킵')}
      ${btn('hidden', '히든 루트 점프 (침묵)')}
      ${btn('paints', '도료 전 계열 +3')}
      ${btn('bps', '시그니처 도면 전부')}
      ${btn('creator', '크리에이터 모드')}
      ${btn('speed', '배속 해금')}
    </div>
    <div id="qa-status" style="font-size:11px;color:var(--good);margin-top:8px;min-height:16px"></div>`;
  openModal('QA 치트 패널', body);
  const status = m => { const el = $('qa-status'); if (el) el.textContent = m; };
  $('modal-body').querySelectorAll('[data-qa]').forEach(b => b.addEventListener('click', () => {
    markQa();
    const k = b.dataset.qa;
    switch (k) {
      // 디렉터: "모든 아이템 100개"에 드랍템인 특수 도구(절단기·총)도 포함. 이들은 RESOURCES가 아니라 플래그라 자원 루프가 못 준다.
      //   절단기=벙커 뒷문 게이트, 총=하드코어 방어. 방호복은 자원으로 제작 가능하므로 여기서 안 준다.
      case 'res100': for (const id of Object.keys(RESOURCES)) state.res[id] = (state.res[id] || 0) + 100; state.hasCutter = true; if (!state.gun) state.gun = { dur: BAL.hostile.gunDur }; status('자원 전종 +100 · 절단기 · 총 지급 (책 포함)'); break;
      case 'gauges': state.hunger = state.thirst = state.energy = 100; if (state.injury) state.injury = null; status('게이지 풀 + 부상 치료'); break;
      case 'unlockAll': { const maxUnlock = Math.max(...Object.values(SHELTERS).map(s => s.unlockAt || 0)); state.successes = Math.max(state.successes, maxUnlock); status('전 셸터 해금 (successes=' + state.successes + ')'); break; }
      case 'day1': state.day += 1; state.gameMin += 1440; status('Day → ' + state.day); break;
      case 'day10': state.day += 10; state.gameMin += 1440 * 10; status('Day → ' + state.day); break;
      case 'day35': { const d = 35; state.gameMin += (d - state.day) * 1440; state.day = d; status('Day → 35 (겨울 직전)'); break; }
      // 2.0 낙진 시계 검수용 — 카운터만 올린다(memoir/마일스톤은 정상 passWinter 경로 전용).
      case 'winter1': state.winters = (state.winters || 0) + 1; status('넘긴 겨울 = ' + state.winters + (state.winters >= BAL.forbidden.falloutWinters ? ' · 낙진 걷힘' : '')); break;
      // 2.0 지역 숙련 검수용 — 전 지역 방문 +20 (20/50/100 티어 도달 확인)
      case 'visits20': { state.regionVisits = state.regionVisits || {}; for (const id of Object.keys(REGIONS)) state.regionVisits[id] = (state.regionVisits[id] || 0) + 20; status('전 지역 방문 +20 (예: 슬럼 ' + state.regionVisits.slum + '회)'); break; }
      case 'w_clear': setWeather('clear'); status('날씨 = 맑음'); break;
      case 'w_snow': setWeather('snow'); status('날씨 = 눈'); break;
      case 'w_rain': setWeather('rain'); status('날씨 = 비'); break;
      case 'w_storm': setWeather('storm'); status('날씨 = 폭풍'); break;
      case 'w_ash': setWeather('ash'); status('날씨 = 재'); break;
      case 'coldsnap': state.coldSnap = { until: state.day + 2, severity: 1 }; state.coldSnapForecast = 0; status('한파 발동 (until Day ' + (state.day + 2) + ')'); break;
      case 'cat': state.cat = true; spawnCat(); status('고양이 소환'); break;
      case 'questSkip': state.questIdx = -1; renderQuestCard(); status('온보딩 퀘스트 스킵'); break;
      // 2.0 §9.6 히든 루트 검수용 — UI 힌트 0 콘텐츠라 QA 재현 절차가 없으면 검수 불가(스펙 명시 리스크).
      //   선로 3구간 완주 + 통로 발견 직후 상태로 점프. 개척 카드·조명 전환은 지하철 거주에서 확인.
      case 'hidden': {
        state.subwayHub = true;
        state.projects = state.projects || {};
        for (const pid of ['subRail1', 'subRail2', 'subRail3']) state.projects[pid] = { stage: 3, invested: 0 };
        state.subwayOpen = { residential: true, commercial: true, industrial: true };
        state.subwayHidden = true;
        if (state.current === 'subway') rebuildShelterGeometry();
        status('히든 루트: 통로 발견 직후 상태 (개척 카드는 지하철 거주에서)');
        break;
      }
      // 도료 검수용 — 전 계열 +3 (스와치 게이트·소모·도감 확인)
      case 'paints': for (const f of Object.keys(PAINT_ALL)) state.paints[f] = (state.paints[f] || 0) + 3; state.lightGels = 1; status('도료 12계열 + 네온 안료 +3통 + 조명 젤 필터북'); break;
      // 시그니처 도면 검수용 — 전 도면 해금 (제작 목록 노출 확인)
      case 'bps': { state.blueprints = state.blueprints || {}; for (const ids of Object.values(BAL.blueprint.regionItems)) for (const id of ids) state.blueprints[id] = 1; for (const id of (BAL.blueprint.commonItems || [])) state.blueprints[id] = 1; state.blueprints.ledbar = 1; status('도면 전부 해금 (시그니처 8 + 커먼 5 + LED)'); break; }
      case 'creator': closeModal(); _creatorUI.enter(); return; // 씬 저작 크리에이터 모드 진입 (모달 닫고 이탈)
      case 'speed': status('배속 해금 — 하단 컨트롤 바에 배속 버튼 노출(1×→2×→4× 순환)'); break; // markQa가 이미 해금(updateSpeedBtn)
    }
    updateHud(); renderResBar(); if (!state.exp) renderExpPanel(); scheduleSave();
  }));
}
/* ============================================================
   #89 QA 에디션 상주 로직 (빌드 플래그 __QA_EDITION__ — 정식 빌드에선 데드코드로 트리셰이킹)
   디렉터 스펙: "자원이든 뭐든 무한. 직접 파밍하고 언락하려니 너무 오래걸려" + 별도 바이너리 +
   세이브 분리(KEY_NS) + 업적 no-op(checkAchievements) + 워터마크. 라벨은 QA 전용이라 한국어만(i18n 예외).
============================================================ */
if (QA_ED) {
  // 워터마크: 상시 좌하단 — 스크린샷이 섞여도 에디션이 즉시 식별되게
  const wm = document.createElement('div');
  wm.id = 'qa-watermark';
  wm.textContent = 'QA EDITION · v' + (typeof __APP_VER__ !== 'undefined' ? __APP_VER__ : '?') + ' · 테스트 전용';
  wm.style.cssText = 'position:fixed;left:8px;bottom:6px;z-index:9000;pointer-events:none;'
    + 'font:bold 11px/1.4 monospace;color:#ffd88a;opacity:.6;text-shadow:0 1px 2px #000;letter-spacing:.5px';
  document.body.appendChild(wm);
  // 상시 만땅(2초 주기): 자원 전종 999 보충 + 게이지 풀 + 전 셸터 해금 + 오염 각인.
  //   스폰/날씨/개조 로직은 건드리지 않는다 — 콘텐츠 검수용이지 별개 밸런스가 아니다.
  const maxUnlock = Math.max(...Object.values(SHELTERS).map(s => s.unlockAt || 0));
  setInterval(() => {
    if (!state || !state.res) return;
    state.qaUsed = true;
    let dirty = false;
    for (const id of Object.keys(RESOURCES)) if ((state.res[id] || 0) < 500) { state.res[id] = 999; dirty = true; }
    if (state.hunger < 100 || state.thirst < 100 || state.energy < 100) { state.hunger = state.thirst = state.energy = 100; dirty = true; }
    if ((state.successes || 0) < maxUnlock) { state.successes = maxUnlock; dirty = true; }
    if (!state.hasCutter) { state.hasCutter = true; dirty = true; } // 드랍템 특수 도구도 상주 지급(자원 루프 사각 — 벙커 뒷문 게이트)
    if (dirty && !titleVisible) { updateHud(); renderResBar(); }
  }, 2000);
}
if (sessionStorage.getItem('ps-intro')) {
  sessionStorage.removeItem('ps-intro');
  showIntro();
} else if (sessionStorage.getItem('ps-load')) {
  sessionStorage.removeItem('ps-load');
  hideTitle(); // 불러오기 직후: 타이틀 없이 바로 집으로 (그때 이전 내역 결산 표시)
} else {
  showTitle();
}

/* ============================================================
   UI 동적 스케일 (--uiz): 저해상도(WSVGA)~4K·모바일 전 구간 대응
   기준 1400x860에서 1.0, 화면이 커질수록 확대, 작아질수록 축소.
   본문 기준 폰트(11px)가 스케일 후 11px 밑으로 내려가지 않도록 하한 보정.
============================================================ */
// (UI_BASE_FONT/UI_MIN_FONT/TEXT_BOOST 상수는 부팅 분기 위에서 선언 — TDZ 방지)
// UI 크기(zoom) 배율 계산. 디렉터 2026-07-24: 반응형 확대가 큰 화면에서 UI를 과대하게 키웠다
//   ("PDA를 통하는 모든 것을 900×600 기준 컴팩트 크기로"). → 데스크톱은 그 컴팩트 크기(≈0.80)를
//   해상도와 무관하게 표준으로 고정한다. 미니창(위젯)만 더 축소. 개별 조절은 설정 > UI 크기.
//   모바일은 폰 비율 문법을 그대로 유지(지시는 데스크톱 PDA 대상, v0.9.5 세로 리그레션 회피).
const UI_COMPACT = 0.80; // 900×600 기준 uiz(= min(900/1400,600/860)*1.25 ≈ 0.80)를 데스크톱 표준으로
function updateUiScale() {
  const tiny = !isMobileEnv && (innerWidth < 960 || innerHeight < 600);
  let s;
  if (isMobileEnv) {
    // 모바일: 기존 반응형 문법 유지
    s = THREE.MathUtils.clamp(Math.min(innerWidth / 1400, innerHeight / 860), 0.85, 2.1) * TEXT_BOOST;
    // #87 스윕: 세로 모바일에서 부스트가 과해 "내 집이 안 보일" 만큼 큼 → 세로+좁은 폭만 16% 축소
    if (innerHeight > innerWidth && innerWidth < 560) s *= 0.84;
  } else if (tiny) {
    // 초소형 창(위젯 미니 480x300 등): 컴팩트보다도 더 작게 — 창 크기 비례로 "작아도 다 보이게"
    s = Math.min(UI_COMPACT, Math.min(innerWidth / 1400, innerHeight / 860) * 1.25);
  } else {
    // 데스크톱 표준: 해상도 불문 컴팩트 고정
    s = UI_COMPACT;
  }
  s *= (opts.fontScale || 1); // 설정 > UI 크기 (더 작게 0.72 ~ 최대 1.6)
  document.documentElement.style.setProperty('--uiz', s.toFixed(3));
  return s;
}
function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  makeRT();
  resizeFx();
  updateUiScale();
  // 타이틀 화면에선 .panel 전체가 display:none이라 getBoundingClientRect()가 0을 반환 —
  // 그 상태로 배치/클램프하면 위치가 (0,0)으로 망가진다. 실제 게임 화면일 때만 계산한다.
  // (hideTitle()이 게임 진입 시점에 onResize()를 다시 호출해 그때 제대로 잡아준다.)
  if (!titleVisible) {
    autoStackPanels();
    reclampAllPanels();
  }
}
addEventListener('resize', onResize);
onResize();

const clock = new THREE.Clock();
let uiTick = 0;

/* ============================================================
   #14 게임패드 (REQ-INP-02) — Gamepad API 폴링 (renderFrame 훅)
   ------------------------------------------------------------
   좌스틱=가상 커서 · 우스틱=카메라 회전 · A=클릭(elementFromPoint 합성)
   B=닫기/ESC · LB/RB=줌 · Start=일시정지 · Y=배치모드.
   커서는 패드 입력 시에만 표시, 마우스 이동 시 숨김.
   ============================================================ */
const padState = {
  active: false,        // 패드 커서 표시 중 (마우스 이동 시 false)
  x: window.innerWidth / 2, y: window.innerHeight / 2,
  prev: {},             // 버튼 엣지 검출 (직전 프레임 pressed 상태)
  lastPollTime: 0,
};
// 표준 매핑 버튼 인덱스 (Standard Gamepad)
const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, START: 9 };
function padDead(v) { return Math.abs(v) < BAL.input.padDeadzone ? 0 : v; }
function showPadCursor(show) {
  padState.active = show;
  const c = $('pad-cursor'); if (!c) return;
  c.classList.toggle('show', show);
  if (show) { c.style.left = padState.x + 'px'; c.style.top = padState.y + 'px'; }
}
// 커서 위치에 클릭 합성 (A 버튼) — elementFromPoint로 대상 요소에 pointer/click 이벤트 발생.
// 모달/확인창도 이 합성 경로로 자동 조작 가능(위치만 맞으면).
function padSynthClick() {
  const el = document.elementFromPoint(padState.x, padState.y);
  if (!el) return;
  const opt = { bubbles: true, cancelable: true, clientX: padState.x, clientY: padState.y, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opt, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mousedown', opt));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opt, pointerId: 1, pointerType: 'mouse' }));
  el.dispatchEvent(new MouseEvent('mouseup', opt));
  el.dispatchEvent(new MouseEvent('click', opt));
  if (typeof el.focus === 'function') { try { el.focus(); } catch (e) { /* */ } }
}
// B = 닫기/ESC: 기존 ESC 우선순위 스택 재사용
function padBack() {
  if (settingsOpen()) { closeSettings(); }
  else if (placing) { cancelPlacing(); }
  else if (selected) { deselect(); }
  else if ($('modal-back').classList.contains('show')) { closeModal(); }
  else if ($('confirm-back').classList.contains('show')) { settleConfirm(false); }
}
function pollGamepad(dt) {
  const pads = (typeof navigator.getGamepads === 'function') ? navigator.getGamepads() : [];
  let pad = null;
  for (const p of pads) { if (p && p.connected !== false) { pad = p; break; } }
  if (!pad) return;
  const ax = pad.axes || [], btn = pad.buttons || [];
  const pressed = i => !!(btn[i] && (btn[i].pressed || btn[i].value > 0.5));
  const edge = i => { const now = pressed(i); const was = !!padState.prev[i]; padState.prev[i] = now; return now && !was; };
  // 좌스틱 → 가상 커서
  const lx = padDead(ax[0] || 0), ly = padDead(ax[1] || 0);
  const anyStick = lx || ly || padDead(ax[2] || 0) || padDead(ax[3] || 0);
  const anyBtn = btn.some(b => b && (b.pressed || b.value > 0.5));
  // #194: 마우스/터치가 커서를 숨긴 상태에서 첫 패드 입력은 '커서 깨우기'로만 소비 —
  //   같은 프레임 A 엣지가 보이지 않던 옛 좌표(stale)에 즉발 합성클릭되는 유령 탭 방지(수거·스와치 등 파괴적 타깃)
  let padWoke = false;
  if (anyStick || anyBtn) { if (!padState.active) { showPadCursor(true); padWoke = true; } }
  if (lx || ly) {
    const sp = BAL.input.padCursorSpeed * dt;
    padState.x = Math.max(0, Math.min(window.innerWidth, padState.x + lx * sp));
    padState.y = Math.max(0, Math.min(window.innerHeight, padState.y + ly * sp));
    const c = $('pad-cursor'); if (c) { c.style.left = padState.x + 'px'; c.style.top = padState.y + 'px'; }
  }
  // 우스틱 → 카메라 회전
  // #70: 게임패드 팬은 이번 배치 제외 — 우스틱 X가 이미 회전을 점유 중이고, R3 클릭 토글/우스틱 Y 혼용은
  //   회전↔팬 혼입 오조작 우려가 있어 보류. 필요해지면 BAL.input에 pad 팬 속도를 열고 여기서 setPanTarget 분기.
  const rx = padDead(ax[2] || 0);
  if (rx) { if (catCam.active) exitCatCloseup(); camState.targetYaw += rx * BAL.input.padCameraSpeed * dt; }
  // LB/RB → 줌 (홀드 연속)
  if (pressed(PAD_BTN.RB)) camState.zoom = THREE.MathUtils.clamp(camState.zoom * BAL.input.padZoomStep, 0.25, 3.2);
  if (pressed(PAD_BTN.LB)) camState.zoom = THREE.MathUtils.clamp(camState.zoom / BAL.input.padZoomStep, 0.25, 3.2);
  // 버튼 엣지 액션
  if (edge(PAD_BTN.A)) { if (!padWoke) padSynthClick(); } // #194: 깨우기 프레임의 A는 클릭 미발사(엣지는 소비)
  if (edge(PAD_BTN.B)) padBack();
  if (edge(PAD_BTN.START)) setPaused(!paused);
  if (edge(PAD_BTN.Y)) { if (!titleVisible && !settingsOpen()) toggleEditMode(); }
}
// 마우스가 움직이면 패드 커서 숨김 (실제 마우스로 복귀)
addEventListener('pointermove', () => { if (padState.active) showPadCursor(false); });

// ── 골든 스크린샷 결정론 (Phase0 시각 회귀 게이트) ── QA 전용.
//   측정 결과: 픽셀 노이즈가 아니라 *구조적* 차이(블록 평균이 diff를 키움 → 국소 이동체)가 리로드 diff의 정체였다.
//   범인 = 매 프레임 Math.random으로 배회하는 고양이/야생동물/아바타(별도 모듈, Phase1 렌더 리팩토링 대상 아님) — 실시간 프레임 수 지터로 로드마다 위치가 어긋난다.
//   해법: freezeForGolden = ①Math.random 시드 고정 ②렌더 시간 동결(dt=0) ③배회 엔티티 업데이트 스킵+숨김.
//   그러면 골든 캡처 = 순수 정적 지오메트리+조명+날씨FX(=리팩토링 대상 코드)만 남아 로드 간 결정론적.
// 상태는 renderCtx(파일 상단 P1 Parameter Object)가 소유 — 여기는 조작 함수만 남는다.
// #212: LCG 상태(lcgS)를 ctx 필드로 두어 언제든 시드로 되돌릴 수 있게 한다(goldenReseed).
//   구버전은 s가 Math.random 클로저 안에 갇혀, freeze 이후 settleCapture가 소비한 난수만큼 상태가
//   밀린 채 stepGolden에 진입 → 누적 시작점이 로드마다 달라 d_snow/d_rain 골든이 플레이키였다.
function goldenReseed() { renderCtx.lcgS = renderCtx.seed >>> 0; }
function freezeForGolden(seed = 12345, keepEntities = false) {
  renderCtx.seed = seed >>> 0; goldenReseed();
  Math.random = function () { let s = (renderCtx.lcgS + 0x6D2B79F5) | 0; renderCtx.lcgS = s; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  windLevel = 1; renderCtx.frozen = true; renderCtx.hidApplied = false; renderCtx.goldenDt = 0; renderCtx.goldenAcc = 0;
  // CSS 무한 애니(LED·crit 블링크·CRT 플리커)는 dt 동결과 무관하게 실시간으로 돈다 — 캡처 순간의
  //   위상이 곧 플레이크다(crtFlicker 딥 프레임 ~6% 확률 실측 우려). reduce-motion 클래스로 전부 정지.
  document.body.classList.add('reduce-motion');
  // #212: 날씨 누적 상태를 씬마다 초기화한다. simReset은 weather.type만 지우고 snowCover/wetness는
  //   남겨, d_rain_wet(비)이 직전 d_snow_accum(눈)의 적설을 물려받아 결정론이 깨졌다(로드 간 70% 흔들림).
  //   각 골든 씬은 깨끗한 날씨에서 시작해야 dt 스테핑이 순수 재현된다. (설정 씬은 이후 setSnow가 덮어씀.)
  snowCover = 0; wetness = 0; wetApplied = -1;
  // 트레일러 캡처(#172): 골든의 고정 dt 스테핑을 엔티티 살린 채 쓴다 — 오프스크린 캡처는 프레임당 실시간
  //   ~0.2s가 흘러 애니메이션이 수 배속으로 보이므로, keepEntities 스테핑이 정속(1/30s/frame)의 유일한 경로.
  renderCtx.keepEntities = !!keepEntities;
}
// 동역학 게이트: renderFrame을 동기 루프로 frames번 호출(rAF 개입 없음=결정론) → 눈 누적·젖음/성에 페이드가
//   고정 dt로 확정 진행. 캡처 전 호출해 dt구동 날씨 상태를 박제한다. 루프 후 dt=0 복귀(rAF 프레임은 정지 유지).
function stepGolden(frames = 200, dtSec = 0.1) {
  goldenReseed(); // 정착이 소비한 난수 오프셋 제거 → 누적 시작점을 시드로 고정(로드 간 결정론)
  renderCtx.goldenDt = dtSec;
  for (let i = 0; i < frames; i++) renderFrame();
  renderCtx.goldenDt = 0;
}
/* ── 골든 동결이 숨기는 동적 요소 — 선언 목록 (REFACTOR-GUIDE P1: hideDynamic) ──
   "무엇이 골든에서 숨겨지는가"가 코드 전역에 흩어져 누락을 눈으로 못 찾던 문제(#212 계열)의 관문.
   새 동적 요소(파티클·배회체·반투명 오버레이)를 추가하면 여기에 한 줄을 추가하는 것이 규약.
   · once: true = 1회 적용(despawn류). 나머지는 매 프레임 재적용 — 스폰/재생성 재발을 억제한다. */
const GOLDEN_HIDE = [
  { name: 'cat', once: true, why: '배회 Math.random — 로드마다 위치 상이', apply() { try { despawnCat(); } catch (e) { /* 씬에 없음 */ } } },
  { name: 'wildlife', why: '배회 엔티티(로밍·개막 연출)', apply() { const g = wildlifeSys.getGroup && wildlifeSys.getGroup(); if (g) g.visible = false; } },
  { name: 'avatar', why: '실내 생활 배회(#86)', apply() { const g = avatarSys.getGroup && avatarSys.getGroup(); if (g) g.visible = false; } },
  // #212: 낙하 날씨 파티클(눈·비). 입자 위치는 씬 간 이월돼(리셋 안 됨) 프레임/로드마다 달라 ~19% 렌더
  //   흔들림을 냈다 — 동역학 골든의 목적은 '적설/젖음 누적'(지면 셰이더=결정론)이지 낙하 입자가 아니다.
  { name: 'weatherParticles', why: '낙하 입자 위치 씬 간 이월(비결정)', apply() { if (weather.pts) weather.pts.visible = false; } },
  // 젖은 반사 오버레이(웅덩이·글린트): 반투명(depthWrite off)이라 SwiftShader 스레드 정렬이 프로세스마다
  //   뒤집혀(빔과 동일 계열) cross-load 흔들림. 젖음의 '누적'은 재질 톤 다크닝(applyWetness, 결정론)이 담당.
  { name: 'wetOverlays', why: '반투명 정렬 프로세스 비결정', apply() { if (weatherFx.puddles) for (const p of weatherFx.puddles) p.visible = false; if (weatherFx.glints) for (const gl of weatherFx.glints) gl.visible = false; } },
  { name: 'dust', why: '부유 먼지 — Math.random 배치·반투명', apply() { if (dust && dust.pts) dust.pts.visible = false; } },
];
function applyGoldenHiding(ctx) {
  for (const h of GOLDEN_HIDE) { if (h.once && ctx.hidApplied) continue; h.apply(); }
  ctx.hidApplied = true;
}
function renderFrame(ctx = renderCtx) {
  let dt = Math.min(clock.getDelta(), 0.1);
  let t = clock.elapsedTime;
  if (ctx.frozen) { dt = ctx.goldenDt; if (ctx.goldenDt > 0) ctx.goldenAcc += ctx.goldenDt; t = ctx.goldenT + ctx.goldenAcc; } // 골든: dt=0 정지 / 스테핑 시 고정 dt 결정론 진행
  ctx.dt = dt; ctx.t = t; // 프레임 확정값 기록 — 이후 하위/외부가 조회하는 SSOT (지역 t/dt와 동일 값)
  pollGamepad(dt);
  if (!titleVisible && !paused && !endingActive) tickTime(dt); // 타이틀·일시정지·엔딩 중엔 시간 정지
  else if (state.exp) state.exp.end += dt * 1000; // 탐험 실시간 타이머도 함께 멈춘다
  applyTimeLighting();
  if (ctx.cam !== 'cine') updateCamera(); // 시네마틱 중엔 오쏘 갱신 스킵 — camera.position은 cineSet이 동기화(컬링 기준 유지)
  updateWallCulling(dt);
  updateEnvironment(t, dt);
  updateWeather(dt, t);
  if (ctx.frozen && !ctx.keepEntities) {
    // 동결·숨김 대상은 GOLDEN_HIDE 선언 목록 1곳(renderFrame 위)이 정본 — 여기는 적용만 한다.
    applyGoldenHiding(ctx);
  } else {
    updateCat(t, dt);
    tickCatPurr(dt);           // #93: 방석 골골 기믹 (잠든 고양이 + 방석)
    wildlifeSys.update(t, dt); // F-1a: 야생동물 로밍/개막 연출
    avatarSys.update(t, dt);   // #86: 주인공 아바타 실내 생활
  }
  updateCraftFx(dt); // ④ 제작 손맛 아이콘/반짝임 연출
  tickVisitor(t, dt); // #181 방문자 걸어옴/글로우/퇴장 + 카메라 추적
  tickDropSpots(t); // #182 B0 동물 드랍 지면 반짝임 펄스
  tickBalconyHint(t); // 2.0 발코니 조망 은근한 신호 (펜트하우스 「콘크리트 정글의 해」 어포던스)
  tickBridgeHint(t); // #146 다리 조망 은근한 신호 (다리 관리소 「불타는 해협」 — 노을 창에서만)
  tickRadioBubble(); // 라디오 방송 자막 버블 재투영/페이드 (#12)
  // #228③: 편집 미니 카드 매 프레임 재투영 제거 — 우하단 고정 도킹(positionSelPanel 폐기 주석 참조)
  // #189 P1: 광원 레지스트리 동기화(전원 토글·연료 소진·설치 자동 반영) + 폴백 형광등 점멸.
  //   폴백(광원 0)일 때만 점멸이 보인다 — 조명 설비 전등은 안정(전기 vs 화기 대비축).
  updateLightingRig();
  if (opts.ceil) {
    if (opts.reduceMotion) ceilLight.intensity = ceilBaseInt;
    else ceilLight.intensity = ceilBaseInt * Math.max(0.5, 0.9 + 0.08 * Math.sin(t * 12.1) * Math.sin(t * 3.3) + (Math.sin(t * 0.47) > 0.99 ? -0.3 : 0));
  }
  if (lightingFixture?.userData.bulb) {
    const facOn = lightingFacilityOn();
    lightingFixture.userData.bulb.material.emissiveIntensity = facOn ? 1.1 : 0; // 소등 시 전구도 꺼짐
    if (lightingFixture.userData.pool) lightingFixture.userData.pool.visible = facOn;
  }
  for (const it of items) {
    if (it.lightObj && it.on !== false && DEFS[it.defId].light?.flicker) {
      // flickSlow(촛불): 저속 일렁임 + 깊은 딥 — "호롱호롱". 일반 flicker(랜턴 등): 기존 잰 흔들림.
      const k = DEFS[it.defId].light.flickSlow
        ? 0.72 + 0.26 * Math.sin(t * 3.1) * Math.sin(t * 1.7) + 0.1 * Math.sin(t * 7.3)
        : 0.8 + 0.25 * Math.sin(t * 11) * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 23);
      it.lightObj.intensity = it.lightBase * k;
      if (it.glowSprite) it.glowSprite.material.opacity = it.glowBase * (0.6 + 0.4 * k); // 헤일로도 함께 일렁임
    }
  }
  // 빛기둥 먼지 부유 (그룹 오프셋만 — 정점 갱신 없이 공짜)
  for (const p of sunMotes) {
    if (!p.visible) continue;
    p.position.y = 0.03 * Math.sin(t * 0.4 + p.userData.phase);
    p.position.x = 0.02 * Math.sin(t * 0.23 + p.userData.phase * 1.7);
  }
  if (t - uiTick > 0.5) { uiTick = t; tickExpeditionUI(); updateHud(); updateClock(); renderResBar(); if (pdaVisible() && pdaTab === 'status') renderPDA(true); if (hudExtOn) renderHudExt(); syncBgm(); syncSfxAmbience(); drainDiscoveryQueue(); } // 디렉터: PDA 상태탭도 0.5s 실시간 갱신(탐험 진행바·게이지) — quiet=플리커 생략, 지도/자원탭은 이벤트 갱신(맵 재생성 비용 회피)
  // 항공뷰 프로토 활성 시: 같은 rt→post 파이프로 디오라마 씬을 대신 렌더 (픽셀 룩 동일 보장).
  //   위의 시뮬 틱은 그대로 돌므로 시간·날씨가 실시간으로 디오라마에 반영된다 (AERIAL-MAP 개정 1차).
  // #217 CRT 시간 공급: 골든/캡처 결정론 — 동결 중엔 고정값(위상 동결, crtFlicker와 같은 사상)
  postMat.uniforms.uCrtT.value = ctx.frozen ? 12.345 : performance.now() / 1000;
  const _aa = activeAerial();
  if (_aa) {
    _aa.update(dt, { hour: aerialHourOverride ?? gameHour(), weather: weather.type });
    if (obsView.isOpen()) obsView.tick(); // S2: 핀 3D→화면 투영 갱신 + 출발 감지 자동 닫기
    renderer.setRenderTarget(rt);
    renderer.render(_aa.scene, _aa.camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);
    return;
  }
  renderer.setRenderTarget(rt);
  renderer.render(scene, ctx.cam === 'cine' ? cineCam : camera);
  renderer.setRenderTarget(null);
  renderer.render(postScene, postCam);
  updateScreenFx(dt, t);
}
// 항공뷰 S1 프로토 — 지연 생성(첫 open 전 비용 0), QA/하네스에서만 접근.
//   open()에 경과일·계절을 주입해 잠식(#71 규약: years=min(3,day/360), 겨울=마른 톤)이 실제 진행도를 탄다.
//   rebuild()는 연차 비교 캡처용 — 씬을 버리고 다른 day로 다시 짓는다(정식판은 loadShelter 시점 재생성).
const _aerials = {}; // 도시별 디오라마 (home·east 최대 2벌) — 재생성 없이 즉시 전환, 각자 결정론 유지
let aerialHourOverride = null; // 재건 비네트: 무대는 밤이어야 불빛이 읽힌다 — 연출 중에만 시각 고정
// S2: 디오라마 노드 = MAP_MARKERS(% 전도 좌표) → 월드좌표 파생 — 2D 전도와 같은 지리 관계를 3D가 계승.
//   (x-50)*3 = ±150 박스(도시 300×300)에 매핑. 서부와 동부 전도가 같은 % 공간이라 변환 공유.
//   ×2.0 = ±100 박스 — ×3(±150)은 모서리 노드(주거)가 overview 프레임 밖(실측 y=-96), ×2.2도 경계(-13).
function obsNodes(city) {
  const m = {};
  for (const [rid, p] of Object.entries(MAP_MARKERS)) {
    if (!REGIONS[rid] || regionCityOf(rid) !== city) continue;
    m[rid] = { x: (p.x - 50) * 2.0, z: (p.y - 50) * 2.0 };
  }
  return m;
}
function aerialProto(cityArg) { // cityArg: QA/캡처용 강제 지정 — 평시엔 거주 도시를 따른다
  const city = cityArg || (cityOf(state.current) === 'east' ? 'east' : 'home');
  if (!_aerials[city]) {
    const a = makeAerialProto({ nodes: obsNodes(city), city });
    const openRaw = a.open.bind(a);
    a.open = (o = {}) => openRaw({ day: o.day ?? state.day, winter: o.winter ?? (seasonOf().id === 'winter'), ...o });
    a.rebuild = (o = {}) => { delete _aerials[city]; return aerialProto(city).open(o); };
    _aerials[city] = a;
  }
  return _aerials[city];
}
const activeAerial = () => Object.values(_aerials).find(a => a.active) || null;
// 관측 단말(S2) — 탐험 진입점. 동부 거주 시 동부 디오라마(S3-2)로 자동 전환 — 구지도 폴백 해소.
const obsView = makeObsView({
  aerialProto, expBlockReason, prepUI, bpName, avalancheForecastToday, openAvalancheChoice,
  getWeather: () => weather.type,
  getClock: () => ({ day: state.day, hour: gameHour() }), // 단말 내부 시계 — 본편 #clock-panel은 obs-mode에서 숨김(디렉터 2026-07-22)
  demoEd: DEMO_ED, // 데모 「궁금한 문」 — 잠긴 기본 4지구=??? 잠금 핀(#175 단일화)
  // #217 CRT 위성 룩(디렉터 2026-07-22): 관측 단말 = 낡은 위성 신호를 CRT로 훔쳐보는 화면.
  //   씬 포스트에 형광체·스캔라인·지터·스윕(uCrt) + 배럴 굴곡을 관측 중에만 건다.
  setCrtLook: on => { postMat.uniforms.uCrt.value = on ? 1 : 0; setBarrel(on ? 0.14 : 0); },
});
function openObsMap() {
  if (state.exp) { pdaOpen('status'); return; }
  if (isExhausted()) { toast(t('toast.exhausted'), 'warn'); return; }
  obsView.open();
}
// v2.4: 숨김(document.hidden) 상태에서는 3D 렌더/카메라/환경/FX를 전부 건너뛰고
// 로직(시간 진행 + BGM 상태 동기화)만 1초 간격으로 처리한다 (배터리/CPU 절약).
function logicTick() {
  const dt = Math.min(clock.getDelta(), 1.5); // 숨김 중엔 긴 델타 허용 (1초 간격 폴링)
  if (!titleVisible && !paused && !endingActive) tickTime(dt);
  else if (state.exp) state.exp.end += dt * 1000;
  syncBgm();
}
let hiddenTimer = null;
function stopHiddenTimer() { if (hiddenTimer) { clearInterval(hiddenTimer); hiddenTimer = null; } }
// [버그 수정] 탭이 처음부터 숨겨진 채 로드되면 visibilitychange가 안 울려
// 로직 틱이 영영 설치되지 않아 게임이 동결됨 — 상태 기반으로 보장한다.
function ensureHiddenTicker() {
  if (document.hidden && !hiddenTimer) hiddenTimer = setInterval(logicTick, 1000);
  if (!document.hidden) stopHiddenTimer();
}
// v0.9.1: 모바일에서는 백그라운드 전환 시 opt-bgidle 설정과 무관하게 항상 오디오를 끈다
// (데스크톱 위젯 모드처럼 계속 재생시키면 배터리/사용자 경험에 불리하다). isMobileEnv는 위쪽에서 선언.
document.addEventListener('visibilitychange', () => {
  ensureHiddenTicker();
  if (document.hidden) {
    if (isMobileEnv || !opts.bgIdle) { bgm.pause(); setAmbience(null); setFire(false); }
  } else {
    clock.getDelta(); // 숨김 동안 쌓인 델타를 한 번 버려 rAF 복귀 시 이중 진행 방지
    if (isMobileEnv) { if (opts.bgm) syncBgm(true); syncSfxAmbience(); }
    else if (!opts.bgIdle) syncSfxAmbience(); // 백그라운드 소리 껐던 경우 복귀 시 재개
  }
});
ensureHiddenTicker(); // 부팅 시점이 이미 숨김 상태일 수 있다 (백그라운드 탭에서 열기/최소화 중 리로드)
let lastFrameTime = 0;
function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden) return; // 숨김 중엔 hiddenTimer(logicTick)가 대신 처리
  const capFps = opts.fpsCap || 60;
  if (capFps < 60) {
    const minDelta = 1000 / capFps;
    if (now - lastFrameTime < minDelta) return;
    lastFrameTime = now;
  }
  renderFrame();
}
requestAnimationFrame(animate);
document.getElementById('loading').style.display = 'none';
// 부팅 완료 — 암전 해제 (모든 로드는 검은 화면에서 시작하고, 준비된 게임만 보여준다)
{
  const veil = $('fade-veil');
  if (veil) {
    veil.style.transition = 'opacity .45s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veil.style.opacity = '0';
      veil.style.pointerEvents = 'none';
    }));
  }
}

/* ============================================================
   전역 크래시 방어 (v0.9.1 안정화)
   - error / unhandledrejection 을 잡아 토스트 + 콘솔 기록
   - 5초 스로틀로 스팸 방지, 게임 루프는 계속 돈다
============================================================ */
let __lastGlobalErrAt = 0;
function handleGlobalError(kind, detail) {
  console.error(`[shelter:${kind}]`, detail);
  const now = Date.now();
  if (now - __lastGlobalErrAt < 5000) return; // 5초 스로틀
  __lastGlobalErrAt = now;
  try { toast(t('err.global')); } catch (e) { /* 토스트조차 실패해도 무시 */ }
}
window.addEventListener('error', e => {
  handleGlobalError('error', e.error || e.message || e);
});
window.addEventListener('unhandledrejection', e => {
  handleGlobalError('promise', e.reason || e);
});

/* ============================================================
   밸런스 시뮬레이션 하네스 (디버그 전용)
   - 실시간 대기/사운드/UI 없이 하루 단위로 n일 기대값 정산
   - rateParts 최고 지역 + 준비물 없음으로 매일 EXP_PER_DAY회 탐험
   - resolveExpedition 의 lootRes 수량 로직을 기대값으로 재현
============================================================ */
// lootRes 한 지역의 1회 탐험 기대 획득량 (mult=성공1.0 / 부분0.5)
function expectedLoot(regionId, mult = 1) {
  const r = REGIONS[regionId];
  const out = {};
  // 난이도별 전리품 수급 배수(BAL.economy.incomeMul) — 실게임 rollRes는 hardLoot()로 적용하지만
  //   expectedLoot(시뮬·QA 전용)엔 누락돼 하드 sim이 뻥튀기되던 결함(#76). 기댓값이라 배수를 곱하면 정확.
  const incomeMul = BAL.economy.incomeMul[state.mode] ?? 1;
  // 동부 수확 겹도 동일 반영 — rollRes와 이 기대값 경로가 어긋나면 sim/QA 표가 조용히 뻥튀기된다(#76 계보).
  //   현 sim은 동부 게이트(eastGateOpen)를 못 넘어 동부를 안 돌지만, 불변식("expectedLoot는 rollRes의 거울")을 지킨다.
  const eastMul = r.city === 'east' ? (BAL.cities.eastLootMul?.[state.mode] ?? 1) : 1;
  for (const [id, min, max, chance] of r.lootRes) {
    const c = chance != null ? chance : 1;
    // resolveExpedition: n = round((min + rand*(max-min)) * mult), n>0만 반영
    const evN = ((min + max) / 2) * mult * incomeMul * eastMul;
    const contrib = c * evN;
    if (contrib > 0) out[id] = (out[id] || 0) + contrib;
  }
  return out;
}
// 시뮬 전 state 를 신규 게임 스냅샷으로 초기화 (실 UI/아이템은 건드리지 않음)
function simReset() {
  // F1(헤르메틱): 완전 리셋. 기존 Object.assign(state, DEFAULT_STATE)는 얕은 병합이라 이전 run이
  //   추가한 비-DEFAULT 키(catTeaserDone/catTeaserMeow 등)가 잔존해 다음 run에 샜다 — 같은 시드·config
  //   인데 Day30 총자원 544 vs 480(run 순번 의존). 키를 싹 비우고 DEFAULT_STATE 딥클론으로 재구성하면
  //   state가 정확히 신규게임 상태가 된다(잔존 0). state는 const 참조라 delete+재할당해도 동일성 유지.
  for (const k in state) delete state[k];
  Object.assign(state, JSON.parse(JSON.stringify(DEFAULT_STATE)));
  // 모듈 레벨 날씨도 결정값으로. simReset이 이걸 안 지워서 이전 run의 weather.type이 sim에 새던 2차 결함
  //   (Day30 clear 544 vs storm 435). sim은 rateParts(_weatherPenalty)·comfortDetail(주입)로 읽는데,
  //   processDay는 계절 경계에서만 rollWeather하므로 봄 Day30 창엔 낡은 날씨가 30일 내내 적용됐다.
  //   weather는 렌더 결합이라 game.js 잔류 — sim이 읽는 type + 전이 필드만 state.weatherType과 동기화.
  weather.type = state.weatherType; // DEFAULT_STATE 정본('clear')
  weather.nextChange = 0;
  weather.transPrev = null; weather.transStart = 0; weather.transK = 0; weather.transBirds = false;
}
let _simRunning = false; // 시뮬 중엔 계정 통계(recordNormalDay)를 오염시키지 않는다
function simDays(n = 30, opt = {}) {
  if (opt.reset !== false) simReset();
  // 난이도 모드 적용 — simReset이 normal로 되돌린 직후 지정 모드로. 이게 없으면 opt.mode가 사문화돼
  //   하드/하드코어 sim이 전부 노말로 돌던 잠복 결함(2026-07-06 검거, #76 난이도 검증 중).
  //   zen/wallpaper의 시작 물자 보너스는 여기서 재현하지 않는다(로직 경로는 mode 플래그만으로 충분).
  if (opt.mode) state.mode = opt.mode;
  _simRunning = true;
  try {
    const seed = opt.seed;
    if (seed != null) { // 재현 가능한 시드 (간이 LCG로 Math.random 대체)
      let s = seed >>> 0;
      const orig = Math.random;
      Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      try { return _simDaysInner(n, opt); } finally { Math.random = orig; }
    }
    return _simDaysInner(n, opt);
  } finally { _simRunning = false; }
}
function _simDaysInner(n, opt) {
  const snaps = [];
  const expPerDay = opt.expPerDay ?? EXP_PER_DAY;
  // opt.regions: 지역 로테이션 리스트 (예: 4지역 순환). 미지정이면 매일 최고 eff 지역.
  const rotation = Array.isArray(opt.regions) && opt.regions.length ? opt.regions : null;
  for (let d = 0; d < n; d++) {
    // 1) 오늘의 탐험 지역 선택 (준비물 없음)
    let bestId;
    if (rotation) {
      bestId = rotation[d % rotation.length]; // 로테이션: 날짜별 순환
    } else {
      bestId = null; let bestEff = -1; // 최고 eff 지역
      for (const id of Object.keys(REGIONS)) {
        if (isForbiddenRegion(id)) continue; // 1.4 금지 구역은 시뮬 대상 아님(방호복 게이트 — 자동/시뮬 모두 제외)
        const eff = rateParts(id, []).eff;
        if (eff > bestEff) { bestEff = eff; bestId = id; }
      }
    }
    for (let k = 0; k < expPerDay; k++) {
      if (isExhausted()) break; // 탈진하면 더 못 나감
      // 탐험 비용(에너지/게이지) — departExpedition 로직 요약
      const expMul = isHard() ? BAL.hard.expMul : 1; // 하드: 탐험 게이지 소모 +50%
      state.hunger = Math.max(0, state.hunger - BAL.exp.hungerCost * expMul);
      state.thirst = Math.max(0, state.thirst - BAL.exp.thirstCost * expMul);
      state.energy = Math.max(0, state.energy - BAL.exp.energyCost);
      const eff = rateParts(bestId, []).eff;
      const roll = Math.random();
      const success = roll < eff;
      const partial = !success && roll < eff + (1 - eff) * 0.5;
      const mult = success ? 1 : partial ? 0.5 : 0;
      if (mult > 0) {
        const loot = expectedLoot(bestId, mult);
        for (const [id, ev] of Object.entries(loot)) resAdd(id, ev);
      }
      state.expToday = (state.expToday || 0) + 1;
      // 취침으로 에너지가 회복되는 구조라, 탐험 사이 간이 휴식
      if (state.energy < BAL.exp.midRest) state.energy = Math.min(100, state.energy + BAL.exp.midRest);
    }
    // 2) 하루치 게이지 소모 (decayGauges: 1일=1440분) + autoEat
    decayGauges(1440);
    // 3) 하루 정산
    state.day++;
    state.expToday = 0;
    processDay();
    // 4) 취침으로 에너지 리셋 (실게임의 sleepUntilMorning 대응)
    const { energy } = restEnergyValue();
    state.energy = energy;
    // 5) 스냅샷
    const cd = comfortDetail();
    snaps.push({
      day: state.day,
      res: { ...state.res },
      hunger: Math.round(state.hunger),
      thirst: Math.round(state.thirst),
      energy: Math.round(state.energy),
      comfort: cd.score,
      starving: state.hunger <= 0 || state.thirst <= 0,
      coldSnaps: state.coldSnapsThisWinter || 0, // v1.4.1 진단: 그 겨울 누적 한파 실현 횟수(겨울 경계에서 리셋)
    });
  }
  return snaps;
}

/* ── 트레일러 연출 모드 (#75): window.__trailer — 콘솔/하네스 전용, UI·시뮬 무접점 ──
   스팀 예고편 촬영 삼종: hideUI(차폐) · cam(키프레임 이징 무빙) · record(렌더 캔버스 webm).
   플레이어 노출 없음(버튼·키 바인딩 없음) — 개발자 콘솔/오프스크린 하네스에서만 부른다. */
window.__trailer = {
  hideUI(on = true) { // 캔버스 계보만 남기고 전부 숨김/복원
    let node = renderer.domElement; const keep = new Set();
    while (node && node !== document.body) { keep.add(node); node = node.parentElement; }
    const walk = (el) => { for (const ch of el.children) {
      if (ch === renderer.domElement) continue;
      if (keep.has(ch)) walk(ch); else ch.style.display = on ? 'none' : '';
    } };
    walk(document.body);
  },
  // 카메라 키프레임 플레이어: frames=[{at:0..1, zoom?, yaw?, elev?, panX?, panZ?}] — 빠진 축은 현재값 유지
  cam(frames, durMs = 4000, easing = 'inout') {
    return new Promise((resolve) => {
      const E = { linear: (t) => t, out: (t) => 1 - Math.pow(1 - t, 3), inout: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 };
      const ez = E[easing] || E.inout;
      const t0 = performance.now();
      const lp = (a, b, k) => a + (b - a) * k;
      const sample = (k) => {
        let i = 0; while (i < frames.length - 1 && frames[i + 1].at <= k) i++;
        const a = frames[i], b = frames[Math.min(i + 1, frames.length - 1)];
        const span = Math.max(1e-6, b.at - a.at); const kk = Math.min(1, Math.max(0, (k - a.at) / span));
        const g = (p, cur) => (a[p] == null && b[p] == null) ? cur : lp(a[p] != null ? a[p] : cur, b[p] != null ? b[p] : cur, kk);
        camState.zoom = g('zoom', camState.zoom);
        camState.targetYaw = camState.yaw = g('yaw', camState.yaw);
        camState.elev = g('elev', camState.elev);
        camState.targetPanX = camState.panX = g('panX', camState.panX);
        camState.targetPanZ = camState.panZ = g('panZ', camState.panZ);
      };
      (function step() {
        const k = Math.min(1, (performance.now() - t0) / durMs);
        sample(ez(k));
        if (k >= 1) return resolve();
        requestAnimationFrame(step);
      })();
    });
  },
  // 렌더 캔버스 webm 녹화 → base64 반환(하네스가 파일로 저장). 브라우저 콘솔에서는 다운로드 링크 생성이 편하다.
  async record(durMs = 5000, fps = 60, kbps = 20000) {
    const stream = renderer.domElement.captureStream(fps);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: kbps * 1000 });
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    const stopped = new Promise((res) => { rec.onstop = res; });
    rec.start(250);
    await new Promise((r) => setTimeout(r, durMs));
    rec.stop(); await stopped;
    const buf = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer();
    const u8 = new Uint8Array(buf); let bin = '';
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  },
};

// 디버그/테스트용 핸들
window.__shelter = {
  simDays, simReset, expectedLoot,
  isHard, isZen, isHardcore, isWallpaper, hardLoot, loadSave, gameConfirm,
  // 배치 D QA 훅: 무력/구제/종료/통계/전체수거
  helplessNow, checkHelpless, doRescue, endRun, reclaimAll,
  readStats, writeStats, recordNormalDay, wallpaperUnlocked, slotDisplayCount,
  openModeModal, refreshAutoplayLock, runAutoPlay, openFrontChoiceModal, // 대한파 규율(§9.4-③) — modal-golden용
  repairGun, // 총 정비(§9.3) — 코어 테스트용
  endingLeaning, tryDoctorRadio, // 엔딩 3분기(§9.5) — 코어 테스트용

  items, DEFS, SHELTERS, REGIONS, RESOURCES, INJURIES, PREPS, DISTRICTS, districtOf, moveCostFor, state, opts, camState, weather, BAL, CRAFTS, // CRAFTS: #190 커먼 도면 코어 테스트용

  addItem, removeItem, loadShelter, moveToShelter, setItemPower,
  startExpedition, departExpedition, resolveExpedition, setWeather, transitionWeather, weatherTransState: () => ({ prev: weather.transPrev, k: weather.transK, birds: !!weather.transBirds }), rateParts,
  getSnowCover: () => snowCover, getWetness: () => wetness, // 날씨 환경 스칼라 읽기(QA/골든 회귀 검증용)
  comfortDetail, comfortBreakdown, comfortExpBonus, applyInjury, treatInjury, processDay, showDayReport, cleanShelter,
  slotMeta, updateHud, checkAchievements, renderResBar, renderInventoryBar, // Nine Winters(#11) QA
  pdaOpen, pdaClose, pdaOpenApp, pdaSetTab: (tb) => { pdaTab = tb; renderPDA(); }, // #199 PDA 도킹·앱 모드 QA 훅 (#211: 필드노트 폐지로 note* 제거)
  seasonOf, SEASONS, openMapModal, showMapInfo, eatFood, drinkWater, EVENTS, showEvent, SHELTER_MODS, hasMod, openCraftModal,
  // Phase D (#12 · #35 · #36) QA 훅
  MEMOS, WILLS, BROADCASTS, MEMOS_BY_REGION, eventCtx, eventMatches, drawEvent, eventWeight,
  dropMemo, dropBroadcast, tryDropMemoOnExpedition, tryRadioBroadcast, doctorFragmentsComplete,
  collectMemo, memosCollected, broadcastsCollected, recordDistantLight, addMoodBuff,
  showMemoPage, showBroadcastModal, openJournalModal, bunkerComfortBonus, rebuildBunkerGeometry,
  STR, // #114 QA: 로케일 테이블 직접 조회(외부화 키 검증용)
  // 1.1 대형 프로젝트 (ARC-02) QA 훅
  PROJECTS, projectAvailable, projectRec, projectDone, projectSiteStage, investProject,
  // 1.1 항구 QA 훅
  regionUnlocked, harborYardBoostId, icefishAvailable, doIceFish,
  // 1.2 지하 노선도 QA 훅
  openSubwaySegment, subwayOpenCount, subwayReaches, blizzardBlocks,
  marketOpen, marketSlots, marketSlotsLeft, marketOfferCost, marketOfferGetN, doMarketTrade,
  MEMOS_SUBWAY,
  // 1.3 고요한 고원 QA 훅
  SKETCHES, MEMOS_RESORT, avalancheBlocks, avalancheForecastToday, openAvalancheChoice,
  sketchesCollected, sketchesTotal, collectSketch, tryNightSky, showSketchPage, expDuration,
  // 1.4 금지 구역 QA 훅
  MEMOS_RESEARCH, isForbiddenRegion, hazmatUsable, craftHazmat, repairHazmat, wearHazmat, gateCost,
  broadcastableTotal, broadcastSentCount, pickUnsentSignal, targetSurvivorLights, doBroadcast,
  bunkerUndercroftRoute, showTruthPage, tryDoctorRadio,
  showDoctorDocPage, runSiloSequence, applyProjectEffect, // §9.6 「침묵」 (코어 테스트·접지 프로브용)
  PAINT_FAMILIES, RARE_PAINTS, PAINT_ALL, paintFamilyOf, paintFamilyRequired, rollPaintFamily, jackpotToast, showSelPanel, DEFS, BAL, // 도료+희귀 안료 (REWARD-LOOP ②) + 데이터 핸들
  rollOfflineGift, // DDD-5 복귀 서프라이즈 (코어 테스트용)
  tickRadioBubble, clearRadioBubble, latestRadioItem, positionRadioBubble,
  radioBubbleState: () => radioBubble ? { shown: radioBubble.el.style.display !== 'none', left: radioBubble.el.style.left, top: radioBubble.el.style.top, text: radioBubble.el.textContent } : null,
  coldSnapActive, coldSnapNetSeverity, coldDefenseLevel, winterPrepAdvice, seasonIndex,
  // 「지식」 테크트리(§9) QA 훅
  KNOWLEDGE, KNOWLEDGE_BRANCHES, hasKnowledge, knowledgeUnlockable, knowledgePrereqMet, unlockKnowledge, openKnowledgeModal,
  knowColdDefense, knowExpBonus, knowComfortBonus, knowWaterPerDay, knowsForecast,
  knowGardenAnywhere, knowGardenBonus, knowSpoilMul, knowSaltCureBonus, knowDirtReduce, knowHeatFuelMul, knowCraftMul, knowForecastLead, knowBroadcastBonus,
  // v1.4.1 QA 훅: i18n/josa/세이브 왕복 검증용 (하네스 전용, 프로덕션 무해)
  t, LName, josa, WEATHERS, buildWinterMemoir, flushSave, loadSave, readSlot, slotKey, setLang, steamLangToGame,
  toast, renderPDA, // #224 알림 큐 QA 훅 — 러시·중복 억제·회선 기록 하네스 검증용
  // ③ 창유리 성에 QA 훅: 현재 성에 강도 + 창별 오버레이 투명도
  frostState: () => ({ frostLevel, netSev: coldSnapNetSeverity(), panes: winFrostMats.map(m => +m.material.opacity.toFixed(3)) }),
  renderFrame: () => renderFrame(),
  setPhotoMode, togglePhotoMode, capturePhoto, photoModeOn: () => photoMode, // 스크린샷 모드 QA/하네스 훅
  qaScene: () => scene, // 그라운드 프로브용 씬 루트 (부유·긴 메시 전수 감사). 카메라는 씬 밖이라 traverse 불가 — 이 훅으로 접근.
  qaCamera: () => camera, qaRenderer: () => renderer, // 커스텀 각도 근접 캡처용(하네스 전용): renderer.render(scene, camera) 직접 구동
  qaCenter: () => camCenter, // 셸터 중심(카메라 lookAt 기준점)
  qaRenderInfo: () => renderer.info, // #73 장주행 메모리 감사: geometries/textures/programs 카운트 (GPU 자원 누수 프로브)
  qaLightState: () => { updateLightingRig(); return { fallback: ceilBaseInt, hasLight: interiorLightActive(), facility: lightingFacilityOn() }; }, // #189 P1 프로브
  qaItems: () => items, applyGel, // #189 P3 QA: 배치 아이템 직접 접근 + 젤 적용(색 검증)
  loadShelter, // #195 QA: 레이아웃 왕복 게이트 — loadSave는 상태만 싣고 씬 복원은 부팅 절차 몫이라 직접 구동
  cityOf, // 2.0-α QA: 도시 파생 게이트(셸터→도시 매핑·기록 필드 검증)
  playCollapseVignette, // #199 QA: 문+상자 연출 직접 구동(캡처 검수용)
  setCollapseLootFx: (fx) => { collapseLootFx = fx; }, // #213 QA: 전리품 종류·등급 강제(롤 확률 우회 — 4종 전수 캡처)
  playGeigerVignette, // 2.0-(b) QA: 가이거 계수기 비네트 직접 구동(캡처 검수용)
  playEastGateVignette, // 2.0-(b) QA: 국경 개통 비네트 직접 구동(캡처 검수용)
  mapBiomeDataUrl, // 2.0-(d) QA: 도시별 전도 분기 검증(홈/동부 캔버스 상이)
  aerialProto, // AERIAL-MAP S1: 항공뷰 프로토 핸들(지연 생성) — open/close/focus/overview, 하네스 캡처 매트릭스용
  openObsMap, obsView, activeAerial, // S2 관측 단말 — QA/하네스 진입점 (activeAerial: 골든 씬 전환 시 잔여 디오라마 강제 종료용)
  setBarrel, setPanelBulge, // CRT 실험 노브(씬 배럴·패널 볼록, 기본 off) — 판정 후 정식 편입 여부 결정
  setBloom, // 퀄업 A1 블룸 노브(기본 0=항등) — 시안 캡처·톤 판정용, 채택 시 opts·설정창 편입
  setGrade, // 퀄업 A2 시간대 그레이딩 노브(기본 0=항등) — 시안 캡처·톤 판정용
  setCrtLook: on => { postMat.uniforms.uCrt.value = on ? 1 : 0; setBarrel(on ? 0.14 : 0); }, // #217 관측 CRT 위성 룩 — QA/캡처 토글
  setAerialHour: h => { aerialHourOverride = (h == null ? null : +h); }, // #218 시간대 컷 캡처용 — 비네트와 동일 채널
  regionReachable, // 2.0-(b) QA: 도시 필터 술어(플래그 off=전역 회귀 검증)
  shelterUnlocked, // 2.0-(b) QA: 동부 관문 이주 게이트(eastGateOpen) 검증
  qaWeatherCaps: () => weatherFx.caps, // 눈 캡 메시 직접 조회(부유 바 원흉 판정)
  finishExpNow: () => { if (state.exp) { state.exp.end = Date.now(); tickExpeditionUI(); } },
  setHour: h => { state.gameMin = Math.floor(state.gameMin / 1440) * 1440 + h * 60; },
  // v1.9
  setPaused, spawnCat, despawnCat, runEndingSequence, syncBgm, bgmContext, showTitle, hideTitle,
  catCam, // 피드백 #3 QA: 클로즈업 회전 접지 검증용 (읽기 전용 취급)
  // 생존 수첩 연출
  openJournalPages, openHelpModal, showTutorialPage, tipOnce, paperSfx, makePaperTexture,
  findSupport, itemsOn, weatherFx,
  toggleEditMode, showEvent, // QA/트레일러: 배치모드 그리드·인카운터 카드 재현 (디렉터 v15 라이브 오더)
  bgmInfo: () => ({ key: bgmCtxKey, track: bgmTrack, paused: bgm.paused, vol: bgm.volume }),
  setSnow: v => { snowCover = v; },
  envFx: () => ({ snowCover, wetness }),
  cat: () => getCat(),
  camera, THREE, CAT_POSES,
  select, deselect, positionSelPanel, // 편집 미니 카드 A안 (접지 프로브용)
  clampToRoom, // 발코니 배치 칸 (접지 프로브용)
  playJungleSunVignette, pickBalconyView, vignetteState: () => vignetteBusy(), // 비네트 러너 (접지 프로브용 — Tier5: 플래그는 vignettes.js 소유)
  playGoldenGateVignette, // #146 「불타는 해협」 금문교 노을 비네트
  pickBridgeSight, bridgeSightHit, // #146 지역 결선 트리거 (QA 프로브 — 노을 창·히트 평면 실측)
  buildGoldenGateScene, // 트레일러 하네스 전용: {scene,camera,update(t)} 결정론 렌더 — Tier5: vignettes.js에서 import 재수출
  buildJungleSunScene, // 컷씬 타임랩스 하네스(디렉터 2026-07-23 "비네트 구도에서 지나는 24시간") — 동일 계약
  __sunShafts: sunShafts, __winSkyMats: winSkyMats, // #229 광원 찐빠 감사 프로브(결선 방향·페이드 동조 실측)
  showDiscoveryVignette, queueDiscovery, drainDiscoveryQueue, discoveryQueueLen: () => discoveryQueue.length, // #150 희귀템 발견 컷 (QA)
  // 카메라 QA 훅 (⑥-b): 하네스가 후면 등 임의 앵글을 확보하도록 yaw/pitch/zoom setter를 영구 노출.
  //  setYaw는 targetYaw와 yaw를 함께 세팅해 다음 프레임 즉시 반영(보간 대기 없이 스크린샷 가능).
  setYaw: (rad) => { camState.yaw = camState.targetYaw = rad; },
  setPitch: (rad) => { camState.elev = THREE.MathUtils.clamp(rad, 0.05, Math.PI / 2 - 0.05); },
  setZoom: (z) => { camState.zoom = THREE.MathUtils.clamp(z, 0.2, 3.2); },
  // ── 시네마틱 원근 카메라 훅 (스토리 트레일러 하네스 전용) ──
  //   cineOn: 시네마틱 모드 진입(이후 렌더는 원근 cineCam). cineOff: 오쏘 복귀.
  //   cineSet: 카메라를 (px,py,pz)에 두고 (lx,ly,lz)를 바라보게. fov 지정 가능. camera.position도 동기화해 벽 컬링이 원근 시점을 따른다.
  cineOn: (fov) => { renderCtx.cam = 'cine'; if (fov) cineCam.fov = fov; cineCam.aspect = innerWidth / innerHeight; cineCam.updateProjectionMatrix(); },
  cineOff: () => { renderCtx.cam = 'ortho'; },
  cineSet: (px, py, pz, lx, ly, lz, fov) => {
    cineCam.position.set(px, py, pz);
    cineCam.up.set(0, 1, 0);
    cineCam.lookAt(lx, ly, lz);
    if (fov) { cineCam.fov = fov; }
    cineCam.aspect = innerWidth / innerHeight; cineCam.updateProjectionMatrix();
    camera.position.set(px, py, pz); // 벽/천장 컬링 기준점 동기화(updateWallCulling은 camera.position을 읽는다)
  },
  cineCam,
  applyOpts, // 트레일러 하네스: opts.pixel/ditherAmt/aa 등 변경 후 즉시 반영(uniform+makeRT 재빌드)
  freezeForGolden, // Phase0 골든 게이트: Math.random 시드 고정 + 렌더 시간 동결(결정론). 이 훅 뒤 loadShelter.
  stepGolden, // 동역학 게이트: 고정 dt로 renderFrame N회 동기 스테핑 → 눈 누적·젖음 페이드 결정론 진행 후 캡처.
  // #70 클램프 팬 QA 훅: setYaw 문법대로 target+현재값 동시 세팅(보간 대기 없이 즉시 반영). 원형 클램프 통과.
  setPan: (x, z) => { setPanTarget(x, z); camState.panX = camState.targetPanX; camState.panZ = camState.targetPanZ; },
  panState: () => ({ x: camState.panX, z: camState.panZ, tx: camState.targetPanX, tz: camState.targetPanZ, max: panMax() }),
  // ④ 고양이 클로즈업 QA 훅
  enterCatCloseup, exitCatCloseup, catCamState: () => ({ active: catCam.active, saved: catCam.saved, center: catCam.center.toArray(), zoom: camState.zoom, dist: camState.dist }),
  setCatMode: (m) => { const c = getCat(); if (c) { c.mode = m; c.timer = 999; } },
  // F-1a 야생동물 QA 훅 (코디네이터 검증용): 상태 조회 + 강제 등장/발자국/퇴장 트리거
  wildlifeState: () => wildlifeSys._debug(),
  wildlifeSpawn: (opening) => wildlifeSys._forceSpawn(opening),
  qaDlcOwns: (id) => Platform.dlc.owns(id), // #117 QA: 서포터팩 DLC 소유 판정 (오버라이드/브릿지)
  qaDlcOverride: (id, on) => Platform.dlc.setOverride(id, on), // #117 QA: 실 DLC 없이 서포터 콘텐츠 검수 토글
  qaRoamSpot: () => wildlifeSys._roamSpot(), // #209 QA: 야생 로밍 스팟 (기단 회피·퍼치 밴드 검증)
  qaWildGroundY: () => wildlifeSys._groundY(), // #209 QA: 착지 지면 y
  wildlifeNightPrints: () => wildlifeSys._forceNightPrints(),
  wildlifeLeaveAll: () => wildlifeSys._forceLeaveAll(),
  wildlifeNudge: (i, x, z) => wildlifeSys._nudge(i, x, z), // QA: 클로즈업 검수용 (팬 카메라 부재 보완)
  wildlifeRespawn: (id) => wildlifeSys.respawn(id || state.current),
  avatarState: () => avatarSys._debug(), // #86 QA 훅
  avatarSys, // 스토어 캡처용: getGroup().position 직접 배치(정착 후 고정 프레임 캡처)
  // 캡처용 고양이 고정 배치. 'sleep'(식빵)은 디렉터 오더로 풀에서 제거된 폐기 포즈이고
  //   이후 다리·피벗이 sprawl 기준으로 정리돼 강제 호출 시 배를 까뒤집은 듯 깨져 보인다(스토어 에셋 오염 사고).
  //   폐기 모드는 여기서 sprawl로 접어 캡처 경로가 다시 밟지 못하게 한다.
  qaPlaceCat: (x, z, mode, rotY) => { const c = getCat(); if (!c) return false; const m = (!mode || mode === 'sleep') ? 'sprawl' : mode; c.g.position.set(x, c.baseY || 0.05, z); if (rotY != null) c.g.rotation.y = rotY; c.mode = m; c.timer = 99999; c.tgt = null; c.hop = null; c.sprawlFor = 14; return true; },
  qaCatInfo: () => { const c = getCat(); if (!c) return null; const p = c.g.position; let vis = true, inScene = false, n = c.g; while (n) { if (!n.visible) vis = false; if (!n.parent && n.isScene) inScene = true; n = n.parent; } return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), vis, inScene, kids: c.g.children.length, sc: +c.g.scale.x.toFixed(2), mode: c.mode }; }, // 캡처 진단: 고양이 실좌표·가시성
  avatarRespawn: () => avatarSys.respawn(),
  avatarDespawn: () => avatarSys.despawn(), // #181 접지 캡처: 방문자 시트에서 아바타 제거
  // #181 방문자 복셀 접지 훅: 프리셋을 씬에 직접 스폰(연출 시스템 이전 룩 검증용)
  debugVisitor: (presetId, x = 0, z = 0, rotY = 0) => {
    if (!window.__dbgVisitors) window.__dbgVisitors = [];
    const built = buildVisitor(presetId);
    built.g.position.set(x, 0, z); built.g.rotation.y = rotY;
    scene.add(built.g); window.__dbgVisitors.push(built.g);
    renderer.shadowMap.needsUpdate = true;
    return presetId;
  },
  debugVisitorRow: (ids, gapX = 0.85, z = 0, rotY = Math.PI) => {
    const list = ids || VISITOR_IDS;
    const n = list.length, x0 = -(n - 1) * gapX / 2;
    list.forEach((id, i) => window.__shelter.debugVisitor(id, x0 + i * gapX, z, rotY));
    return list;
  },
  debugVisitorClear: () => {
    (window.__dbgVisitors || []).forEach(g => { scene.remove(g); disposeDeep(g); });
    window.__dbgVisitors = []; renderer.shadowMap.needsUpdate = true;
  },
  VISITOR_IDS,
  // #181 방문자 연출 QA 훅: 인카운터 트리거 / 상태 조회 / 클릭 시뮬 / 강제 퇴장
  debugEvent: (id) => showEvent(id),
  cardSnapshot: (id) => liveCardIllust(id), // #201: 라이브 카드 스냅샷 직접 호출(검증)
  endingLeaning, // 2.0-(g): 엔딩 성향 판정(검증 — 부수효과 0)
  setForceClosed, // #201: 풀셸 컬링 강제(검증)
  visitorState: () => visitor ? { mode: visitor.mode, x: +visitor.g.position.x.toFixed(2), z: +visitor.g.position.z.toFixed(2), camActive: visitorCam.active, spoke: visitor.spoke } : null,
  // #208 QA: 동물 자동 인카운터 실측 — 팬 점유·엔티티 모드·자리 잡음·자동 발화 잔여(ms).
  wildEncounterState: () => {
    const d = dropSpots.find(x => x.ent) || null;
    return { drops: dropSpots.length, camOwned: !!wildCamEnt, camActive: visitorCam.active,
      ent: d && d.ent ? { id: d.ent.id, mode: d.ent.mode } : null,
      settled: !!(d && d.settled), autoInMs: d && d.autoT ? Math.round(d.autoT - performance.now()) : null };
  },
  visitorClick: () => onVisitorClicked(),
  visitorDismiss: () => dismissVisitor(),
  // #182 B0 동물 드랍 지면 반짝임 훅 (스폰/상태/수거 시뮬)
  spawnGroundDrop, shelterHasGround,
  debugDrop: (evId, ang) => spawnGroundDrop(evId || 'dog', ang != null ? { pos: (() => { const rr = Math.max(ROOM.w, ROOM.d) * 0.5, d = rr + 2.0; return { x: Math.cos(ang) * d, z: Math.sin(ang) * d, y: visitorGroundY() }; })() } : {}),
  dropState: () => dropSpots.map(d => ({ evId: d.evId, x: +d.g.position.x.toFixed(2), z: +d.g.position.z.toFixed(2) })),
  clearGroundDrops: () => disposeDropSpots(), // 스토어 캡처용: 바닥 드랍 반짝임 전부 제거(깨끗한 씬)
  dropCollect: () => { if (dropSpots.length) { collectDrop(dropSpots[0]); return true; } return false; },
  avatarForceNext: () => avatarSys._forceNext(),          // #86② QA: 행동 추첨 강제 (상호작용 검증)
  avatarBlocks: (x, z) => avatarSys.blocksPlacement(x, z, { w: 1, d: 1 }), // #86③ QA: 설치 가드 판정
  openWardrobeModal, OUTFITS, // #86④ QA: 옷장
  wallProxyState: () => wallList.map(w => ({ show: w.group.visible, proxy: w.proxy ? w.proxy.visible : null })), // #97 QA
  avatarWalkTo: (x, z) => avatarSys._walkTo(x, z), // #86 QA: 경유점 라우팅 실증
  avatarWakeBed: (rect) => avatarSys._wakePose(rect), // #209 QA: 취침 눕기 포즈 검증 (rot 0~3 머리·가슴 방향 실측)
  qaBlockers: () => blockers.map(b => ({ ...b })), // #209 QA: 붙박이 가구 봉쇄 사각 조회 (동부 셸터 blockers 검증)
  qaCollides: (defId, x, z, tier = 0) => collides({ defId, x: 0, z: 0, rot: 0, tier, support: null }, x, z), // #209 QA: 배치 충돌 판정
  FIELD_SPOTS, resolveFieldSpot, // #164 QA: 떠오른 자리 데이터/회수 (프로브 결정론 검증용)
  // 침묵 모드 게이트 QA (디렉터 2026-07-10 — 생존·혹한 전용): 실탭 경로(pickHidden)를 좌표로 재현
  hiddenTapProbe: (x, y) => pickHidden({ clientX: x, clientY: y }),
  hiddenSpotXY: () => { if (!subwayHiddenObj) return null; const v = new THREE.Vector3(); subwayHiddenObj.getWorldPosition(v); v.project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (-v.y + 1) / 2 * innerHeight }; },
  // #98 QA: 개조 소품 월드 bb 덤프 (증축 겹침 판정용)
  modPropBBoxes: () => { const out = {}; roomGroup.traverse(o => { if (o.userData && o.userData.modProp) { const b = new THREE.Box3().setFromObject(o); out[o.userData.modProp] = { minX: +b.min.x.toFixed(2), maxX: +b.max.x.toFixed(2), minZ: +b.min.z.toFixed(2), maxZ: +b.max.z.toFixed(2) }; } }); return out; },
  wlObstacleList: () => wlObstacles.slice(), // #95 QA: 등록 장애물 덤프 (프로브 침범 판정용)
  wildlifeWalkTo: (i, x, z) => wildlifeSys._walkTo(i, x, z), // #95 QA: 강제 횡단 (회피 실증)
  debugWildlife: (id) => wildlifeSys._spawnSpecies(id), // #182 B1: 특정 야생동물 종 강제 소환(검증)
  wildlifeDebug: () => wildlifeSys._debug(), // #182 B1 QA: 로밍 개체 위치/모드 덤프 (프레이밍·B2 게이트 검증용)
  swayCount: () => swayProps.length,
  // #71 도심 잠식 QA 훅: 연차/패치·수풀 수/추가 드로우콜 추정(병합 메시 수)
  overgrowthState: () => ({ ...ogState }),
  // ⑥ 고양이 버그픽스 QA 훅: 스폰 가드 상태(⑥b 브릭 감지) + 퍼치 지지면 유효성(⑥a)
  catSpawning: () => catSys.isSpawning(),
  catSupportState: () => { const c = getCat(); return c ? { baseY: +c.baseY.toFixed(3), mode: c.mode, supportValid: c.baseY > 0.12 ? catSupportValid(c) : null, dirty: catSys.getCatSupportDirty() } : null; },
  // ② 쓰다듬기 연출 QA 훅: 눈 감김·갸르릉·꼬리 가속 트리거 + 상태 조회
  petCat: () => petCatResponse(),
  catPetState: () => { const c = getCat(); return c ? { petHappy: c.petHappy || 0, petPurr: c.petPurr || 0, eyesClosed: !!(c.p && c.p.faceMat && c.p.faceMat.map === catFaceHappyTex()) } : null; },
  // 퀘스트 트래커
  QUESTS, questProgress, renderQuestCard, questActive,
  // v0.9.2 개연성 패스 (1부)
  fmtGameDur, expDuration, sleepUntilMorning, tickTime, GAME_MIN_PER_SEC,
  isBlackoutActive: () => blackoutActive,
  renderExpPanel, startPlacing, finishPlacing, select, deselect,
  // v1.2.0 QA 훅: 취침 자율화(②) / 자동진행 지역선택(③) / 천장 컬링(⑥)
  restEnergyValue, restHourMod, promptSleep, pickAutoRegion, updateWallCulling,
  ceilCullState: () => ceilCullList.map(c => ({ visible: c.group.visible, y: c.y })),
  // ① 컬링 페이드 QA 훅: 각 벽의 표시/페이드/재질 transparent 상태 (완료 후 상시 draw call 증가 0 검증용)
  wallCullState: () => wallList.map(w => { const cs = w.group.userData.cull; let transp = 0; if (cs) for (const m of cs.mats) if (m.transparent) transp++;
    return { visible: w.group.visible, fade: cs ? +cs.fade.toFixed(2) : null, target: cs ? cs.target : null, mats: cs ? cs.mats.length : 0, transparentMats: transp }; }),
  dbg: () => ({ reportQueued, blackoutActive, journalOpen, settlingOffline, pendingEvent: state.pendingEvent }),
  // v0.9.2 배치 모드 + 성공률 보정 (2부)
  expActualRate,
  toggleEditMode,
  isEditMode: () => editMode,
  enterCreator: () => _creatorUI.enter(), exitCreator: () => _creatorUI.exit(), // 씬 저작 크리에이터 모드 (QA/하네스 진입)
  importScene: (obj) => _creatorUI.importSceneObj(obj),
  lastSfx: () => dbgSfx,
  resetSfx: () => { dbgSfx = null; },
  // #13 꾸미기 확장 + 사운드 QA 훅
  WALLPAPERS, FLOORINGS, THEME_SETS, DECO_THEME_COMFORT, applyDecoChoice, applyDeco,
  // ④ 제작 손맛 연출 QA 훅: 임의 이모지로 연출 트리거 + 진행 중 연출 수 조회
  spawnCraftFx: (iconId = 'icon_res_canned') => spawnCraftFx(iconId), craftFxCount: () => craftFx.length,
  craftFxDump: () => craftFx.map(f => ({ v: f.icon.visible, o: +f.icon.material.opacity.toFixed(2), hasMap: !!f.icon.material.map,
    imgW: (f.icon.material.map && f.icon.material.map.image && (f.icon.material.map.image.naturalWidth || f.icon.material.map.image.width)) || 0,
    pos: [+f.grp.position.x.toFixed(1), +f.grp.position.y.toFixed(1), +f.grp.position.z.toFixed(1)], scl: +f.icon.scale.x.toFixed(2) })),
  themeSetActive, activeThemeSets, currentDeco, EVENT_STING, playEventSting,
  setSeasonAmbience, seasonAmbienceName,
  pickItemAt: (cx, cy) => pickItem({ clientX: cx, clientY: cy }),
  funcClickItem, addItem, catPointBlocked, footprintOf, scene,
  // 편의성 배치 v0.9.2
  canMoveSomewhere, updateMoveBadge, showEventChip, hideEventChip, reclaimSelected,
  currentSlot: () => currentSlot, doSaveNow, flushSave,
  setLang, applyStaticI18n, t,
  // #52 설정 창 (하네스/QA용)
  openSettings, closeSettings, toggleSettingsPanel, switchSettingsTab,
  settingsOpen, resetSettingsTabToDefault, opts,
  // Phase E (#14 입력 · #34 Steam · 접근성) QA 훅
  Platform, KEYBINDS, keyForAction, actionForEvent, saveKeybinds, resetKeybinds,
  applyAccessibility, gamepad: () => padState,
  // #170 REV3 엔딩 개정 QA 훅: 사일로 돌아서기·재건 비네트·밤 발화 채널·겨울 통과 직접 구동
  runSiloSequence, runRebuildSequence, tryDoctorRadio, runEndingSequence, passWinter,
  // #167 2겹화 QA 훅: 지역 게이트·숙련 티어·성공률 분해 직접 조회
  regionUnlocked, masteryTier, rateParts,
};
