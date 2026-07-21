// ui/mapview.js — S2-1 지도 뷰 추출 (AERIAL-MAP §4 관문 원칙 · #73 추출 트랙 계승).
//   openMapModal(도시 전도·핀·셸터 점·생존자 불빛)을 game.js에서 무손실 이식. 항공뷰(S2)의
//   줌 상태 머신·노드 오버레이가 이 모듈에 얹힌다 — 신규 기능을 God Object에 얹지 않기 위한 선행.
//   t/state/BAL/REGIONS/코어 게이트는 직접 import, game.js 클로저(모달·탐험 플로우·셸터)만 ctx 주입.
//   게이트: 코어 배터리 + 실화면 핀 검증(추출 전후 지도 DOM 동일).
import { t, LN as LName } from '../i18n.js';
import { state } from '../core/state.js';
import { BAL } from '../data/balance.js';
import { REGIONS } from '../data/world.js';
import { cityOf, rateParts } from '../core/expedition.js';
import { regionUnlocked, regionCityOf, blizzardBlocks } from '../core/regions.js';
import { isExhausted } from '../core/gauges.js';
import { seededRand } from '../lib/helpers.js';

// 종이 지도 마커 좌표(% left/top) — 그림 상의 지구 클러스터 위치. residential 좌상 · commercial 우상 · industrial 좌하 · slum 우하.
// #85 수용 규칙(#87 임시 클램프의 정식화): 마커 중심 안전영역 — 배지·아이콘이 종이 밖으로 잘리지 않는
//   실측 한계. 신규 지역 좌표는 자유로 적되 openMapModal 렌더가 이 박스로 자동 클램프한다.
export const MAP_SAFE = { x0: 8, x1: 88, y0: 12, y1: 80 };
export const MAP_MARKERS = {
  residential: { x: 20, y: 20 },  // 좌상 손그림 집 클러스터
  commercial:  { x: 74, y: 18 },  // 우상 무너진 빌딩(도심)
  industrial:  { x: 18, y: 54 },  // 좌중 공장
  slum:        { x: 78, y: 50 },  // 우중 판자촌
  slumdeep:    { x: 86, y: 60 },  // #167 판자촌 안쪽 — 슬럼 핀의 대각 안깊이 (숙련 ★1 해금 전엔 비노출)
  // #85 도시 전도: 확장 5종을 지리 서사대로 — 항구 벨트(남서 해안, 세로로 적층), 리조트(북동 산정),
  //   금지 구역(동남 봉쇄선 너머). ── 디렉터 신고(2026-07-19): 수산시장 라벨이 야적장·연구동과 겹침 →
  //   하단 밀집을 행(row)별로 분리. 라벨은 ~33% 폭이라 중앙에서 좌·우 핀 이름이 마주쳐 겹친다:
  //   좌측 항구 2종은 남서 해안에 세로 적층(둘 다 이름 오른쪽), 우측 봉쇄 3종은 동편에 세로 적층(이름 왼쪽).
  harborYard:  { x: 22, y: 68 },  // 남서 해안 상단 야적장(컨테이너 부두)
  fishMarket:  { x: 26, y: 81 },  // 남서 해안 하단 수산시장(선착장) — 야적장 바로 아래
  resort:      { x: 85, y: 13 },  // 우상단 산정 리조트
  checkpoint:  { x: 88, y: 65 },  // 우편 봉쇄선 검문소
  lab:         { x: 90, y: 80 },  // 검문소 아래 폭심지 연구동 (봉쇄선 너머 구석)
  citycore:    { x: 90, y: 45 },  // 2.0 봉쇄선 너머 수도의 심장 (동쪽 가장자리 상단 — 낙진 걷힌 뒤에만 노출)
  // ── 2.0-(d) 동부 8지역 — 좌표는 동부 전도(eastMapBiomeDataUrl) 공간. 지도는 도시 스코프라 겹침 없음 ──
  customsyard:   { x: 12, y: 55 }, // 관문 남측 압류창고
  containerport: { x: 31, y: 68 }, // 남서 스택 격자 위
  interchange:   { x: 30, y: 26 }, // 램프 고리 북측
  uptown:        { x: 22, y: 37 }, // 강변 주거단지
  grandplatform: { x: 51, y: 59 }, // 역사 홀 위
  outpost:       { x: 61, y: 66 }, // 역 남측 진지
  megamall:      { x: 62, y: 28 }, // 마천루 코어
  deptstore:     { x: 73, y: 40 }, // 코어 동측 백화점 지구
};
// 셸터 지도 좌표(% left/top) — 해금된 내 거점 점 마커용(디렉터 오더). 구역당 2셸터는 오프셋해 겹침 방지.
//   지역 마커(MAP_MARKERS)와 안 겹치게 배치. openMapModal이 MAP_SAFE로 자동 클램프.
export const SHELTER_MAP = {
  container: { x: 10, y: 28 }, bus: { x: 15, y: 34 },         // 잿빛 외곽
  rooftop: { x: 60, y: 27 }, subway: { x: 66, y: 33 },        // 무너진 도심
  bunker: { x: 32, y: 38 }, greenhouse: { x: 38, y: 44 },     // 초원 구릉지
  cabin: { x: 34, y: 60 },                                    // 숲과 산기슭 (야적장 라벨과 겹치지 않게 상향 — 2026-07-19)
  ship: { x: 14, y: 78 }, lighthouse: { x: 21, y: 73 },       // 잿빛 해안
  tugboat: { x: 46, y: 75 }, controltower: { x: 52, y: 72 },  // 얼어붙은 항구
  lodge: { x: 81, y: 27 },                                    // 고요한 고원
  // 2.0-(d) 동부 4앵커 — 좌표는 동부 전도 공간(홈 지도 동쪽 끝 임시 클러스터 폐기). 진행 축 서→동.
  customs: { x: 10, y: 47 },                                  // 국경 검문소(관문 그 자체가 거처)
  bridgehouse: { x: 19, y: 42 },                              // 무너진 현수교 옆 관리소
  terminal: { x: 46, y: 51 },                                 // 역 대합실(아치 홀 북측)
  penthouse: { x: 67, y: 34 },                                // 마천루 코어 종점
};
//   최대 불빛 수는 종이 지도가 감당할 밀도(MAP_LIGHT_MAX). 총량 0이면 0.
export const MAP_LIGHT_MAX = 12; // 종이 지도 오버레이 최대 불빛 점(응답하는 먼 창문들)

export function makeMapview(ctx) {
  const { openModal, closeModal, toast, renderExpPanel, startExpedition, showMapInfo,
    shelterUnlocked, avalancheBlocks, SHELTERS, mapBiomeDataUrl, scheduleSave, bpName } = ctx;
  const $ = id => document.getElementById(id);

  function openMapModal(viewCity) {
    if (state.exp) { $('exp-panel').classList.add('show'); renderExpPanel(); return; }
    if (isExhausted()) { toast(t('toast.exhausted')); return; }
    // 2.0-(f) 지도 도시뷰 (§9.8.11): 뷰 도시 = 인자 또는 현 도시. 도달한 도시는 탭으로 넘겨본다 —
    //   "왜 떠나나"의 답(§4.5 pull 가시화)이 지도 안에 있어야 이주가 도박이 아니게 된다.
    const homeCity = cityOf(state.current);
    const city = viewCity || homeCity;
    const reached = Object.keys(state.citiesReached || {});
    if (!reached.includes(homeCity)) reached.push(homeCity);
    const cityTabs = reached.length > 1
      ? `<div id="map-cities">${reached.map(c =>
          `<button class="pixel-btn city-chip${c === city ? ' on' : ''}" data-city="${c}">${t('city.' + c)}${c === homeCity ? ` <span class="here">${t('map.cityHere')}</span>` : ''}</button>`).join('')}</div>`
      : '';
    openModal(t('map.title'), `
      ${cityTabs}
      <div id="map-wrap" class="paper"></div>
      <div id="map-info" class="rate-line" style="margin-top:8px">${t('map.pick')}</div>
      <div id="map-pull" class="rate-line"></div>`);
    document.querySelectorAll('#map-cities .city-chip').forEach(b =>
      b.addEventListener('click', () => { if (b.dataset.city !== city) { closeModal(); openMapModal(b.dataset.city); } }));
    // §9.8.10 "이 도시에서만 얻는 것" — 뷰 도시의 미보유 시그니처(가구·복장) 목록. 전부 챙겼으면 완료 문구.
    {
      const cityRids = Object.keys(REGIONS).filter(rid => regionCityOf(rid) === city);
      const sigAll = cityRids.flatMap(rid => BAL.blueprint.regionItems[rid] || []);
      const unowned = sigAll.filter(id => !(state.blueprints || {})[id]);
      const pull = $('map-pull');
      if (pull && sigAll.length) pull.innerHTML = unowned.length
        ? t('map.cityPull', { items: unowned.map(bpName).join(', ') })
        : `<span style="color:var(--good)">${t('map.cityPullDone')}</span>`;
    }
    const wrap = $('map-wrap');
    // #85 2차(디렉터 반려 → 7DTD/구판 비오메 레퍼런스): 손그림 종이는 지리가 없어 '내 위치'가 성립 안 한다.
    //   비오메 타일 지형(바다/해안·도심 회백·외곽 갈색·숲 초록·설산·봉쇄구역 해치)을 캔버스로 그려
    //   마커 좌표와 지형이 서로를 낳게 한다 — 지형이 먼저, 마커는 그 위에.
    wrap.style.backgroundImage = `url(${mapBiomeDataUrl(city)})`; // 2.0-(d)·(f): 뷰 도시 전도
    wrap.style.backgroundSize = '100% 100%';
    // 손그림 종이 지도 위에 4개 파밍 지역 마커를 지구 클러스터 위치에 % 절대 배치 (#47).
    // 좌표는 map_paper.png 위 집/빌딩/공장/판자촌 그림에 맞춰 하네스 스크린샷으로 조정.
    for (const [rid, r] of Object.entries(REGIONS)) {
      const p = MAP_MARKERS[rid];
      if (!p) continue;
      if (!regionUnlocked(rid)) continue; // 1.1: 항구 구역은 항구 셸터 해금 후에만 노출
      if (regionCityOf(rid) !== city) continue; // 2.0-(f): 마커는 '뷰 도시' 스코프 — 탐험 가능 여부는 아래 클릭 게이트가 판정
      const el = document.createElement('div');
      el.className = 'map-pin region';
      el.dataset.rid = rid; // 식별자 노출(테스트·자동화·트레일러 캡처가 지역별로 마커를 짚게)
      // #85 수용 규칙(#87 임시 가드의 정식화): 렌더에서 안전영역 자동 클램프 — 신규 지역 좌표 실수를 원천 차단
      el.style.left = Math.min(MAP_SAFE.x1, Math.max(MAP_SAFE.x0, p.x)) + '%';
      el.style.top = Math.min(MAP_SAFE.y1, Math.max(MAP_SAFE.y0, p.y)) + '%';
      el.title = LName(r);
      const avBlocked = avalancheBlocks(rid); // #195: 눈사태 봉쇄도 지도에 — 클릭해야 거부당하며 알게 되던 이음매
      const blocked = blizzardBlocks(rid) || avBlocked; // 1.2: 폭설 봉쇄된 지상 지역 (개통 구간은 예외)
      if (blocked) el.classList.add('blocked');
      // #85 그려지는 발견: 안 가본 곳은 연필 스케치(수치 없음 — 소문), 다녀오면 잉크(성공률).
      const visits = (state.regionVisits || {})[rid] || 0;
      const rate = Math.round(rateParts(rid).eff * 100);
      const cls = rate >= 50 ? 'ok' : 'lack';
      // #204(디렉터): 숙련은 이름 색으로 — 첫 방문 붉은색에서 최종 티어(100%)의 초록까지 천천히.
      //   ★/• 발자취 표식은 색 인코딩이 대체(타르코프식 점+이름 미니멀). 진행률은 툴팁으로.
      const mProg = Math.min(1, visits / BAL.mastery.tiers[BAL.mastery.tiers.length - 1]);
      const nameCol = visits > 0
        ? `rgb(${Math.round(198 - 71 * mProg)},${Math.round(83 + 109 * mProg)},${Math.round(64 + 42 * mProg)})`
        : '';
      // #208(디렉터 2026-07-17): 핀은 점+이름만 — 퍼센트 칩·컨디션 태그(풍/마름)·스팟 이모지·봉쇄 이모지 전부 제거.
      //   "이름 색을 통한 숙련도만 표시하자" + "이모지들이 오히려 더 AI틱하게 만든다". 정보는 잃지 않는다:
      //   성공률·컨디션·스팟·봉쇄는 title(툴팁)과 호버 정보판(showMapInfo)이 그대로 싣고, 상태는 점 색/링 CSS가 진다.
      const spotHere = state.fieldSpot && state.fieldSpot.region === rid;
      const cLv = (state.regionCond && state.regionCond.lv && state.regionCond.lv[rid]) || 0;
      if (spotHere) { el.classList.add('spot'); el.title += ' — ' + t('spot.' + state.fieldSpot.id) + ' · ' + t('spot.mapHint'); }
      if (cLv > 0) { el.classList.add('rich'); el.title += ' · ' + t('map.cond.richTip'); }
      else if (cLv < 0) { el.classList.add('lean'); el.title += ' · ' + t('map.cond.leanTip'); }
      if (!visits && !blocked) el.classList.add('sketch');
      if (visits > 0) el.title += ` · ${t('map.rateTip', { p: rate })} · ${t('map.masteryPct', { p: Math.round(mProg * 100) })}`;
      if (blocked) el.title += ' · ' + t(avBlocked ? 'map.blockedAvalanche' : 'map.blockedBlizzard');
      // #204 타르코프식 핀: 점 + 옆 이름. 이름 색 = 숙련 그라데이션(붉은→초록).
      //   #208: 점이 좌표의 진실 — 이름은 지도 우측 절반에서 왼쪽으로 뻗는다(flip). CSS가 점 기준 정렬을 맡는다.
      const nameTag = `<span class="pin-name"${nameCol ? ` style="color:${nameCol}"` : ''}>${LName(r)}</span>`;
      const dotTag = `<span class="pin-dot"></span>`;
      if (p.x > 50) el.classList.add('flip'); // 우측 절반: 이름을 점 왼쪽으로 — 지도 밖 이탈 방지(모바일 신고)
      el.innerHTML = `${dotTag}${nameTag}`;
      // 첫 귀환 후 처음 여는 지도: 잉크가 배어드는 연출 1회
      state.mapInked = state.mapInked || {};
      if (visits > 0 && !state.mapInked[rid]) { el.classList.add('inked-now'); state.mapInked[rid] = 1; scheduleSave(); }
      el.addEventListener('click', (ev) => { // 준비 모달 경로 그대로 (봉쇄/에너지/탈진/횟수 검사 포함)
        // 디렉터 신고(2026-07-17 모바일): 주거를 탭해도 공업이 눌린다 — 인접 핀의 라벨·배지 박스가 겹치면
        //   DOM 스택 순서가 탭을 가로챈다. 탭 좌표에서 최근접 핀(아이콘부 중심)을 골라 시각적 의도를 우선.
        let best = rid, bestD = Infinity;
        if (ev.clientX || ev.clientY) {
          for (const pe of wrap.querySelectorAll('.map-pin.region')) {
            const rb = pe.getBoundingClientRect();
            const d = Math.hypot(ev.clientX - (rb.left + rb.width / 2), ev.clientY - (rb.top + rb.height / 2)); // #204 가로형 핀: 중심=height/2
            if (d < bestD) { bestD = d; best = pe.dataset.rid; }
          }
        }
        // 2.0-(f): 타 도시 뷰에서는 구경만 — 탐험은 그 도시에 살 때만(이주 유도 안내)
        if (city !== homeCity) { toast(t('map.otherCityPin')); return; }
        closeModal(); startExpedition(best);
      });
      // 호버/선택 시 하단 정보 줄에 위험·소요·날씨 표기
      el.addEventListener('mouseenter', () => showMapInfo(rid));
      wrap.appendChild(el);
    }
    // 셸터 점 마커 (디렉터 오더) — 해금된 내 거점을 전부 지도에 찍는다. "이 죽은 도시에 내가 세운 발판들".
    //   가구 미배치=원 1겹(해금만) · 배치=원 2겹(정착) · 현 거처=강조색+펄스. 아이콘 없이 순수 원형(지역 핀보다 아래).
    for (const [sid, sp] of Object.entries(SHELTER_MAP)) {
      if (!shelterUnlocked(sid)) continue;
      if (cityOf(sid) !== city) continue; // 2.0-(d)·(f): 셸터 점은 '뷰 도시' 스코프 — 좌표계가 전도별이라 교차 표시는 오배치

      const furnished = (state.layouts[sid]?.length || 0) > 0;
      const isCurrent = sid === state.current;
      const el = document.createElement('div');
      el.className = 'map-shelter' + (furnished ? ' furnished' : '') + (isCurrent ? ' current' : '');
      el.dataset.sid = sid; // 식별자 노출(테스트·자동화·트레일러 캡처가 셸터별로 마커를 짚게)
      el.style.left = Math.min(MAP_SAFE.x1, Math.max(MAP_SAFE.x0, sp.x)) + '%';
      el.style.top = Math.min(MAP_SAFE.y1, Math.max(MAP_SAFE.y0, sp.y)) + '%';
      el.title = LName(SHELTERS[sid]) + (isCurrent ? ` · ${t('map.home')}` : '');
      el.innerHTML = `<span class="dot"></span>${isCurrent ? `<span class="you-label">${t('map.home')}</span>` : ''}`;
      wrap.appendChild(el);
    }
    // 1.4 송출 오버레이 — 종이 지도 위 생존자 불빛(수집률 비례 점등). ARC-03 레이어 규격: 마커 위에 얹는 절대배치.
    renderSurvivorLights(wrap);
  }
  // 1.4 생존자 불빛 오버레이 — 켜진 불빛 수만큼 지도 위 결정론적 위치(seed)에 작은 빛점을 찍는다.
  //   불빛은 만남이 아니다 — 응답하는 먼 창문들(타인은 흐른다). 위치는 seed 고정 → 왕복 저장 재현.
  //   마커/지역과 겹치지 않도록 지도 여백대 위주 분포. 지도가 없거나(모달 미개방) 불빛 0이면 아무것도 안 함.
  function renderSurvivorLights(wrap) {
    if (!wrap) return;
    wrap.querySelectorAll('.map-light').forEach(el => el.remove()); // 재구성 시 중복 방지
    const n = state.survivorLights || 0;
    if (n <= 0) return;
    const rand = seededRand(19410806); // 고정 seed → 불빛 위치 재현(왕복 저장 무손실)
    // 후보 위치 풀(%): 지역 마커를 피한 창문/불빛다운 자리. n개까지 앞에서부터 켠다.
    const spots = [];
    for (let i = 0; i < MAP_LIGHT_MAX; i++) {
      spots.push({ x: 8 + rand() * 84, y: 12 + rand() * 74 });
    }
    for (let i = 0; i < Math.min(n, spots.length); i++) {
      const s = spots[i];
      const dot = document.createElement('div');
      dot.className = 'map-light';
      dot.style.left = s.x + '%'; dot.style.top = s.y + '%';
      dot.title = t('map.survivorLight');
      wrap.appendChild(dot);
    }
  }

  return { openMapModal, renderSurvivorLights };
}
